import { AccountContext } from './accountContext';

/**
 * Support Triage pipeline — mirrors the Keystone Gatekeeper pattern already
 * used elsewhere in the product.
 *
 * Pipeline:
 *   1. classifyTicket()      -> 'self_resolvable' | 'bug' | 'feature_request' | 'unclear'
 *   2. draftAnswer()         -> only for self_resolvable
 *   3. diagnoseBug()         -> only for bug; reads relevant repo source, finds root cause
 *   4. draftFeatureSpec()    -> only for feature_request; proposes what to build
 *   5. draftFix()            -> shared by bug + feature_request; takes the
 *                               diagnosis/spec, produces patched/new files
 *
 * bug and feature_request share the same downstream states (diagnosing ->
 * fix_ready -> approved -> implemented) since the workflow shape is
 * identical either way: AI proposes something concrete, admin reviews and
 * approves, a PR gets opened. Only the *prompt* differs — one looks for a
 * root cause to correct, the other looks for a sensible implementation of
 * something new.
 *
 * ASSUMPTION: using the Anthropic API directly (fetch to
 * api.anthropic.com/v1/messages) with ANTHROPIC_API_KEY in env, consistent
 * with the rest of the pipeline's "OpenAI or Anthropic" note. Swap the
 * callModel() internals if you're standardized on a different provider.
 */

async function callModel(system: string, user: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  });
  if (!res.ok) {
    throw new Error(`Model call failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  return data.content
    .filter((b: any) => b.type === 'text')
    .map((b: any) => b.text)
    .join('\n');
}

// ---------- 1. GATEKEEPER / CLASSIFIER ----------

const CLASSIFIER_PROMPT = `Context: You are the triage classifier for an Enterprise Cloud Architecture SaaS platform's support desk.
Task: Read the user's support ticket plus their account context (plan, blueprint history, recent auditor rejections, verification status). Decide whether this is:
- "self_resolvable": explainable directly from account/plan facts (e.g. hitting a plan limit, unverified email, expected behavior) — no code is broken, nothing new needs building.
- "bug": something in the product is actually malfunctioning and needs a code fix.
- "- "feature_request": the user is asking for something the product doesn't do yet, a genuinely new capability, not a malfunction and not something explainable from their account facts.- "unclear": not enough information to tell; needs a human to look at it.

Constraint: Output ONLY one of these four words, nothing else: self_resolvable, bug, feature_request, unclear`;

export async function classifyTicket(
  description: string,
  context: AccountContext
): Promise<'self_resolvable' | 'bug' | 'feature_request' | 'unclear'> {
  const result = await callModel(
    CLASSIFIER_PROMPT,
    `Ticket:\n${description}\n\nAccount context:\n${JSON.stringify(context, null, 2)}`
  );
  const clean = result.trim().toLowerCase();
  if (
    clean === 'self_resolvable' ||
    clean === 'bug' ||
    clean === 'feature_request' ||
    clean === 'unclear'
  ) {
    return clean;
  }
  return 'unclear';
}

// ---------- 2. ANSWER AGENT ----------

const ANSWER_PROMPT = `Context: You are the support answer agent for ArchAI, an AI cloud architecture SaaS platform.
Task: Write a short, friendly, accurate reply to the user's ticket, grounded strictly in the account context provided (their real plan, usage, verification status). Do not invent facts not present in the context.
Constraint: Plain text only, no markdown. 2-4 sentences. If a plan upgrade would solve it, mention the specific plan and price plainly, without being pushy.`;

export async function draftAnswer(description: string, context: AccountContext): Promise<string> {
  return callModel(
    ANSWER_PROMPT,
    `Ticket:\n${description}\n\nAccount context:\n${JSON.stringify(context, null, 2)}`
  );
}

// ---------- 3. DIAGNOSTICIAN AGENT (bugs) ----------

const DIAGNOSTICIAN_PROMPT = `Context: You are a senior engineer diagnosing a bug report for ArchAI, a Next.js/TypeScript + Supabase SaaS.
Task: Given the user's ticket, their account context, and the relevant source file(s) provided, identify the specific root cause.
Constraint: Output a concise technical diagnosis (plain text, 3-8 sentences) naming the exact file, function, or logic responsible. Do not propose the fix yet — diagnosis only.`;

export async function diagnoseBug(
  description: string,
  context: AccountContext,
  relevantFiles: Array<{ path: string; content: string }>
): Promise<string> {
  const filesBlock = relevantFiles
    .map((f) => `--- ${f.path} ---\n${f.content}`)
    .join('\n\n');
  return callModel(
    DIAGNOSTICIAN_PROMPT,
    `Ticket:\n${description}\n\nAccount context:\n${JSON.stringify(context, null, 2)}\n\nRelevant source files:\n${filesBlock}`
  );
}

// ---------- 3b. FEATURE SPEC AGENT (feature requests) ----------

const FEATURE_SPEC_PROMPT = `Context: You are a senior product engineer at ArchAI, a Next.js/TypeScript + Supabase cloud architecture SaaS, reviewing an inbound feature request.
Task: Given the user's ticket, their account context, and any related source file(s) provided, write a short proposal for how this feature would work: what it does from the user's perspective, roughly where it fits in the existing product (which step/page/route), and any notable tradeoff or open question — e.g. if it should be plan-gated.
Constraint: Output plain text, 3-8 sentences. This is a proposal for a human to review, not a commitment — be honest if the request is vague or if you're not confident where it fits. Do not write code yet.`;

export async function draftFeatureSpec(
  description: string,
  context: AccountContext,
  relevantFiles: Array<{ path: string; content: string }>
): Promise<string> {
  const filesBlock = relevantFiles
    .map((f) => `--- ${f.path} ---\n${f.content}`)
    .join('\n\n');
  return callModel(
    FEATURE_SPEC_PROMPT,
    `Ticket:\n${description}\n\nAccount context:\n${JSON.stringify(context, null, 2)}\n\nRelated source files (may be empty if this is a wholly new feature):\n${filesBlock}`
  );
}

// ---------- 4. FIX / BUILD AGENT (shared: bug fixes + feature implementations) ----------

const FIX_AGENT_PROMPT = `Context: You are a senior engineer implementing a change for ArchAI, a Next.js/TypeScript + Supabase SaaS. The change may be a bug fix (correcting existing behavior) or a new feature (adding new behavior) — the diagnosis/spec text tells you which.
Task: Given the diagnosis or feature spec, and the full original content of any related file(s), produce the complete file content for each file that needs to change or be added. Do not truncate — output the ENTIRE file content for every file touched, not a diff or snippet.
Constraint: Respond ONLY with a valid JSON object, no markdown fences, no commentary, in this exact shape:
{
  "summary": "one-sentence human-readable summary of the change",
  "files": [
    { "path": "relative/path/to/file.ts", "patched_content": "...full new file content..." }
  ]
}`;

export interface FixResult {
  summary: string;
  files: Array<{ path: string; patched_content: string }>;
}

export async function draftFix(
  diagnosis: string,
  relevantFiles: Array<{ path: string; content: string }>
): Promise<FixResult> {
  const filesBlock = relevantFiles
    .map((f) => `--- ${f.path} ---\n${f.content}`)
    .join('\n\n');
  const raw = await callModel(
    FIX_AGENT_PROMPT,
    `Diagnosis / feature spec:\n${diagnosis}\n\nOriginal files (may be empty if creating something new):\n${filesBlock}`
  );
  const cleaned = raw.replace(/```json|```/g, '').trim();
  return JSON.parse(cleaned) as FixResult;
}
