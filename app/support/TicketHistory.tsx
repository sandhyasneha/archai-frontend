const STATUS_LABEL: Record<string, string> = {
  received: 'Received',
  replied: 'Replied',
  diagnosing: 'Investigating',
  fix_ready: 'Fix drafted',
  approved: 'Fix in review',
  on_hold: 'On hold',
  implemented: 'Resolved',
  rejected: 'Rejected',
};

// Full date + time so users can tell exactly when they submitted something
// and when they got a reply, not just the day.
function formatTimestamp(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface Ticket {
  id: string;
  subject: string | null;
  description: string;
  status: string;
  category: string | null;
  ai_reply: string | null;
  github_pr_url: string | null;
  created_at: string;
  resolved_at: string | null;
}

export default function TicketHistory({ tickets }: { tickets: Ticket[] }) {
  if (tickets.length === 0) {
    return <p className="text-sm text-gray-400">You haven't submitted any tickets yet.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {tickets.map((t) => (
        <div key={t.id} className="border-2 border-black rounded p-4">
          <div className="flex justify-between items-start mb-2">
            <p className="text-sm font-bold">{t.subject || t.description.slice(0, 60)}</p>
            <span className="text-[10px] font-bold uppercase border border-black rounded px-1.5 py-0.5 whitespace-nowrap ml-3">
              {STATUS_LABEL[t.status] || t.status}
            </span>
          </div>

          <p className="text-xs text-gray-500 mb-2">Submitted {formatTimestamp(t.created_at)}</p>

          <p className="text-sm text-gray-700 whitespace-pre-wrap mb-3">{t.description}</p>

          {t.ai_reply && (
            <div className="bg-gray-50 border border-black/20 rounded p-3 mt-2">
              <div className="flex justify-between items-center mb-1">
                <p className="text-[10px] font-bold uppercase text-gray-500">Reply</p>
                {t.resolved_at && (
                  <p className="text-[10px] text-gray-400">{formatTimestamp(t.resolved_at)}</p>
                )}
              </div>
              <p className="text-sm whitespace-pre-wrap">{t.ai_reply}</p>
            </div>
          )}

          {!t.ai_reply && (t.status === 'diagnosing' || t.status === 'fix_ready' || t.status === 'approved') && (
            <p className="text-xs text-gray-500 italic">
              {t.category === 'feature_request'
                ? "This looks like a feature request — we're reviewing it."
                : "Looks like a bug on our end — we're on it."}
            </p>
          )}

          {t.status === 'implemented' && (
            <p className="text-xs text-gray-500">
              Resolved{t.resolved_at ? ` on ${formatTimestamp(t.resolved_at)}` : ''}.
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
