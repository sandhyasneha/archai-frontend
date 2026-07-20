import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { buildAccountContext } from '@/lib/support/accountContext';
import { classifyTicket, draftAnswer, diagnoseBug, draftFix } from '@/lib/support/agents';
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

    // 2. Classify
    const category = await classifyTicket(description, context);
    await supabaseAdmin
      .from('support_tickets')
      .update({ category, status: category === 'bug' ? 'diagnosing' : 'replied' })
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
      // no fabricated diagnosis.
      await supabaseAdmin
        .from('support_tickets')
        .update({ status: 'received' })
        .eq('id', ticket.id);
      return NextResponse.json({ ticketId: ticket.id, status: 'received' });
    }

    // category === 'bug' -> diagnose, then draft a fix
    const relevantPaths = guessRelevantPaths(description);
    const relevantFiles = relevantPaths.length ? await fetchRepoFiles(relevantPaths) : [];

    const diagnosis = await diagnoseBug(description, context, relevantFiles);
    await supabaseAdmin
      .from('support_tickets')
      .update({ ai_diagnosis: diagnosis })
      .eq('id', ticket.id);

    if (relevantFiles.length === 0) {
      // We couldn't confidently locate the affected file(s) — don't
      // fabricate a fix. Leave it at 'diagnosing' for a human to pick up
      // manually with the diagnosis as a head start.
      return NextResponse.json({ ticketId: ticket.id, status: 'diagnosing', diagnosis });
    }

    const fix = await draftFix(diagnosis, relevantFiles);
    await supabaseAdmin
      .from('support_tickets')
      .update({
        ai_fix_summary: fix.summary,
        ai_fix_files: fix.files,
        status: 'fix_ready',
      })
      .eq('id', ticket.id);

    return NextResponse.json({ ticketId: ticket.id, status: 'fix_ready', diagnosis, fix: fix.summary });
  } catch (err: any) {
    console.error('Support submit error:', err);
    return NextResponse.json({ error: err.message || 'Something went wrong.' }, { status: 500 });
  }
}
