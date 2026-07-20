import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import SupportForm from './SupportForm';
import TicketHistory from './TicketHistory';

export default async function SupportPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/signin');

  // RLS-scoped read: the "Users can view their own tickets" policy on
  // support_tickets means this only ever returns this user's own rows,
  // even though we're using the regular (non-service-role) client.
  const { data: tickets } = await supabase
    .from('support_tickets')
    .select(
      'id, subject, description, status, category, ai_reply, github_pr_url, created_at, resolved_at'
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  return (
    <div className="max-w-2xl mx-auto py-10 px-6">
      <h1 className="text-2xl font-black mb-1">Support</h1>
      <p className="text-sm text-gray-500 mb-8">
        Tell us what's wrong. If it's something we can answer from your account directly, you'll
        get a reply right away. If it looks like a bug or a feature request, our team will be
        notified and follow up.
      </p>
      <SupportForm userId={user.id} />

      <div className="mt-12">
        <h2 className="text-xs font-black uppercase tracking-wide text-gray-500 mb-4">
          Your tickets
        </h2>
        <TicketHistory tickets={tickets || []} />
      </div>
    </div>
  );
}
