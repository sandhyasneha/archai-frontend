import { AccountContext } from './accountContext';

/**
 * Support Triage pipeline — mirrors the Keystone Gatekeeper pattern already
 * used elsewhere in the product.
 *
 * Pipeline:
 *   1. classifyTicket()   -> 'self_resolvable' | 'bug' | 'unclear'
 *   2. draftAnswer()      -> only for self_resolvable
 *   3. diagnoseBug()      -> only for bug; reads relevant repo source
 *   4. draftFix()         -> takes the diagnosis, produces patched files
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
- "self_resolvable": explainable directly from account/plan facts (e.g. hitting a plan limit, unverified email, expected behavior) — no code is broken.
- "bug": something in the product is actually malfunctioning and needs a code fix.
- "unclear": not enough information to tell; needs a human to look at it.

Constraint: Output ONLY one of these three words, nothing else: self_resolvable, bug, unclear`;

export async function classifyTicket(
  description: string,
  context: AccountContext
): Promise<'self_resolvable' | 'bug' | 'unclear'> {
  const result = await callModel(
    CLASSIFIER_PROMPT,
    `Ticket:\n${description}\n\nAccount context:\n${JSON.stringify(context, null, 2)}`
  );
  const clean = result.trim().toLowerCase();
  if (clean === 'self_resolvable' || clean === 'bug' || clean === 'unclear') return clean;
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

// ---------- 3. DIAGNOSTICIAN AGENT ----------

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

// ---------- 4. FIX AGENT ----------

const FIX_AGENT_PROMPT = `Context: You are a senior engineer writing a fix for ArchAI, a Next.js/TypeScript + Supabase SaaS.
Task: Given a diagnosis and the full original content of the affected file(s), produce the complete corrected file content for each file that needs to change. Do not truncate — output the ENTIRE file content, not a diff or snippet.
Constraint: Respond ONLY with a valid JSON object, no markdown fences, no commentary, in this exact shape:
{
  "summary": "one-sentence human-readable summary of the fix",
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
    `Diagnosis:\n${diagnosis}\n\nOriginal files:\n${filesBlock}`
  );
  const cleaned = raw.replace(/```json|```/g, '').trim();
  return JSON.parse(cleaned) as FixResult;
}
