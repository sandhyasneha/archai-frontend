import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { buildAccountContext } from '@/lib/support/accountContext';
import {
  classifyTicket,
  draftAnswer,
  diagnoseBug,
  draftFeatureSpec,
  draftFix,
} from '@/lib/support/agents';
import { fetchRepoFiles, guessRelevantPaths } from '@/lib/github/fetchRepoFiles';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/support/submit
 * Body: { userId: string | null, subject?: string, description: string }
 *
 * This route is called by a logged-in user's browser session (or the
 * anonymous contact form) — it does NOT need to be in the middleware's
 * isPublic allowlist since it's invoked from within the app, same as
 * other authenticated routes. If you later add a fully external caller
 * (e.g. an email-to-ticket integration), add it to isPublic then.
 */
export async function POST(req: NextRequest) {
  try {
    const { userId, subject, description } = await req.json();

    if (!description || typeof description !== 'string' || description.trim().length < 3) {
      return NextResponse.json({ error: 'Description is required.' }, { status: 400 });
    }

    const context = await buildAccountContext(userId ?? null);

    // 1. Insert the ticket immediately so the user gets a record even if
    //    downstream AI steps fail.
    const { data: ticket, error: insertError } = await supabaseAdmin
      .from('support_tickets')
      .insert({
        user_id: userId ?? null,
        subject: subject ?? null,
        description,
        status: 'received',
        account_context: context,
      })
      .select()
      .single();

    if (insertError || !ticket) {
      throw new Error(insertError?.message || 'Failed to create ticket');
    }

    // 2. Classify: self_resolvable | bug | feature_request | unclear
    const category = await classifyTicket(description, context);
    const needsBuildPipeline = category === 'bug' || category === 'feature_request';
    await supabaseAdmin
      .from('support_tickets')
      .update({
        category,
        status: needsBuildPipeline ? 'diagnosing' : category === 'self_resolvable' ? 'replied' : 'received',
      })
      .eq('id', ticket.id);

    if (category === 'self_resolvable') {
      const reply = await draftAnswer(description, context);
      await supabaseAdmin
        .from('support_tickets')
        .update({ ai_reply: reply, status: 'replied', resolved_at: new Date().toISOString() })
        .eq('id', ticket.id);
      return NextResponse.json({ ticketId: ticket.id, status: 'replied', reply });
    }

    if (category === 'unclear') {
      // Leave status as 'received' for a human to look at — no AI reply,
      // no fabricated diagnosis or spec.
      return NextResponse.json({ ticketId: ticket.id, status: 'received' });
    }

    // category === 'bug' or 'feature_request' -> produce a diagnosis/spec,
    // then attempt a build (fix or new-feature implementation) if we can
    // confidently locate relevant files.
    const relevantPaths = guessRelevantPaths(description);
    const relevantFiles = relevantPaths.length ? await fetchRepoFiles(relevantPaths) : [];

    const diagnosis =
      category === 'bug'
        ? await diagnoseBug(description, context, relevantFiles)
        : await draftFeatureSpec(description, context, relevantFiles);

    await supabaseAdmin
      .from('support_tickets')
      .update({ ai_diagnosis: diagnosis })
      .eq('id', ticket.id);

    if (relevantFiles.length === 0 && category === 'bug') {
      // Couldn't confidently locate the affected file(s) for a bug — don't
      // fabricate a fix against code we haven't actually seen. Leave it at
      // 'diagnosing' with the diagnosis as a head start for a human.
      return NextResponse.json({ ticketId: ticket.id, status: 'diagnosing', diagnosis });
    }

    // For feature_request, proceed even with zero relevant files — a
    // genuinely new capability often has nothing existing to anchor to,
    // and the build agent is instructed to create appropriate new files
    // from scratch following this codebase's conventions in that case.
    const fix = await draftFix(diagnosis, relevantFiles);
    await supabaseAdmin
      .from('support_tickets')
      .update({
        ai_fix_summary: fix.summary,
        ai_fix_files: fix.files,
        ai_setup_instructions: fix.setup_instructions,
        status: 'fix_ready',
      })
      .eq('id', ticket.id);

    return NextResponse.json({ ticketId: ticket.id, status: 'fix_ready', diagnosis, fix: fix.summary });
  } catch (err: any) {
    console.error('Support submit error:', err);
    return NextResponse.json({ error: err.message || 'Something went wrong.' }, { status: 500 });
  }
}
