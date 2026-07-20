'use client';

import { useEffect, useState } from 'react';

type TicketStatus =
  | 'received'
  | 'replied'
  | 'diagnosing'
  | 'fix_ready'
  | 'approved'
  | 'on_hold'
  | 'implemented'
  | 'rejected';

interface Ticket {
  id: string;
  subject: string | null;
  description: string;
  status: TicketStatus;
  category: string | null;
  ai_reply: string | null;
  ai_diagnosis: string | null;
  ai_fix_summary: string | null;
  ai_fix_diff: string | null;
  github_pr_url: string | null;
  account_context: any;
  created_at: string;
}

const STATUS_LABEL: Record<TicketStatus, string> = {
  received: 'Received',
  replied: 'Replied',
  diagnosing: 'Diagnosing',
  fix_ready: 'Fix Ready',
  approved: 'Approved',
  on_hold: 'On Hold',
  implemented: 'Implemented',
  rejected: 'Rejected',
};

const FILTERS: Array<'all' | TicketStatus> = [
  'all',
  'received',
  'replied',
  'diagnosing',
  'fix_ready',
  'approved',
  'on_hold',
  'implemented',
];

export default function SupportTriagePage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filter, setFilter] = useState<'all' | TicketStatus>('all');
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  async function loadTickets() {
    setLoading(true);
    // ASSUMPTION: you have (or will add) a GET /api/support/list route,
    // gated by your existing admin check, that returns all tickets. Swap
    // this fetch for a direct Supabase server-component read if you'd
    // rather keep this a server component instead.
    const res = await fetch('/api/support/list');
    const data = await res.json();
    setTickets(data.tickets || []);
    setLoading(false);
  }

  useEffect(() => {
    loadTickets();
  }, []);

  const counts = tickets.reduce(
    (acc, t) => {
      acc.total += 1;
      acc[t.status] = (acc[t.status] || 0) + 1;
      return acc;
    },
    { total: 0 } as Record<string, number>
  );

  const filtered = filter === 'all' ? tickets : tickets.filter((t) => t.status === filter);

  async function handleApprove(id: string) {
    setActionLoading(true);
    const res = await fetch(`/api/support/${id}/approve`, { method: 'POST' });
    const data = await res.json();
    setActionLoading(false);
    if (!res.ok) {
      alert(data.error || 'Failed to approve.');
      return;
    }
    await loadTickets();
    setSelected((prev) => (prev ? { ...prev, status: 'approved', github_pr_url: data.prUrl } : prev));
  }

  async function handleHold(id: string) {
    setActionLoading(true);
    await fetch(`/api/support/${id}/hold`, { method: 'POST' });
    setActionLoading(false);
    await loadTickets();
    setSelected((prev) => (prev ? { ...prev, status: 'on_hold' } : prev));
  }

  async function handleImplemented(id: string) {
    setActionLoading(true);
    await fetch(`/api/support/${id}/implemented`, { method: 'POST' });
    setActionLoading(false);
    await loadTickets();
    setSelected((prev) => (prev ? { ...prev, status: 'implemented' } : prev));
  }

  return (
    <div className="flex h-full min-h-screen bg-white text-black">
      {/* Ticket list */}
      <div className="w-[380px] border-r-2 border-black flex flex-col">
        <div className="p-5 border-b-2 border-black">
          <h2 className="text-lg font-black uppercase tracking-wide mb-3">Support Triage</h2>

          {/* Summary report */}
          <div className="grid grid-cols-2 gap-2 text-xs mb-4">
            <SummaryStat label="Received" value={counts.received || 0} />
            <SummaryStat label="Replied" value={counts.replied || 0} />
            <SummaryStat label="Fix Ready" value={counts.fix_ready || 0} />
            <SummaryStat label="Approved" value={counts.approved || 0} />
            <SummaryStat label="On Hold" value={counts.on_hold || 0} />
            <SummaryStat label="Implemented" value={counts.implemented || 0} />
          </div>

          <select
            className="w-full border-2 border-black rounded p-2 text-sm font-semibold"
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
          >
            {FILTERS.map((f) => (
              <option key={f} value={f}>
                {f === 'all' ? `All (${counts.total || 0})` : `${STATUS_LABEL[f]} (${counts[f] || 0})`}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && <p className="p-4 text-sm text-gray-500">Loading tickets…</p>}
          {!loading && filtered.length === 0 && (
            <p className="p-4 text-sm text-gray-500">No tickets in this view.</p>
          )}
          {filtered.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelected(t)}
              className={`w-full text-left p-4 border-b border-black/20 hover:bg-black hover:text-white transition-colors ${
                selected?.id === t.id ? 'bg-black text-white' : ''
              }`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-bold uppercase border border-current rounded px-1.5 py-0.5">
                  {STATUS_LABEL[t.status]}
                </span>
                <span className="text-[10px] opacity-60">
                  {new Date(t.created_at).toLocaleDateString()}
                </span>
              </div>
              <p className="text-sm font-semibold truncate">{t.subject || t.description.slice(0, 60)}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Ticket detail */}
      <div className="flex-1 p-8 overflow-y-auto">
        {!selected && <p className="text-gray-500">Select a ticket to view details.</p>}

        {selected && (
          <div className="max-w-3xl">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-black mb-1">{selected.subject || 'Untitled ticket'}</h3>
                <span className="text-xs font-bold uppercase border-2 border-black rounded px-2 py-0.5">
                  {STATUS_LABEL[selected.status]}
                </span>
                {selected.category && (
                  <span className="text-xs ml-2 text-gray-500">category: {selected.category}</span>
                )}
              </div>
            </div>

            <Section title="User description">
              <p className="text-sm whitespace-pre-wrap">{selected.description}</p>
            </Section>

            {selected.account_context && (
              <Section title="Account context">
                <pre className="text-xs bg-gray-50 border border-black/20 rounded p-3 overflow-x-auto">
                  {JSON.stringify(selected.account_context, null, 2)}
                </pre>
              </Section>
            )}

            {selected.ai_reply && (
              <Section title="AI reply (sent to user)">
                <p className="text-sm whitespace-pre-wrap">{selected.ai_reply}</p>
              </Section>
            )}

            {selected.ai_diagnosis && (
              <Section title="AI diagnosis">
                <p className="text-sm whitespace-pre-wrap">{selected.ai_diagnosis}</p>
              </Section>
            )}

            {selected.ai_fix_summary && (
              <Section title="Proposed fix summary">
                <p className="text-sm whitespace-pre-wrap">{selected.ai_fix_summary}</p>
              </Section>
            )}

            {selected.github_pr_url && (
              <Section title="Pull request">
                <a
                  href={selected.github_pr_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm underline font-semibold"
                >
                  {selected.github_pr_url}
                </a>
                <p className="text-xs text-gray-500 mt-1">
                  Not merged or deployed yet — review and merge manually, then mark Implemented below.
                </p>
              </Section>
            )}

            <div className="flex gap-3 mt-6">
              {selected.status === 'fix_ready' && (
                <>
                  <button
                    disabled={actionLoading}
                    onClick={() => handleApprove(selected.id)}
                    className="bg-black text-white px-5 py-2.5 rounded font-bold text-xs uppercase hover:bg-white hover:text-black border-2 border-black disabled:opacity-50"
                  >
                    Approve → Open PR
                  </button>
                  <button
                    disabled={actionLoading}
                    onClick={() => handleHold(selected.id)}
                    className="bg-white text-black px-5 py-2.5 rounded font-bold text-xs uppercase hover:bg-black hover:text-white border-2 border-black disabled:opacity-50"
                  >
                    Hold
                  </button>
                </>
              )}
              {selected.status === 'approved' && (
                <button
                  disabled={actionLoading}
                  onClick={() => handleImplemented(selected.id)}
                  className="bg-black text-white px-5 py-2.5 rounded font-bold text-xs uppercase hover:bg-white hover:text-black border-2 border-black disabled:opacity-50"
                >
                  Mark Implemented (PR merged + deployed)
                </button>
              )}
              {selected.status === 'on_hold' && (
                <button
                  disabled={actionLoading}
                  onClick={() => handleApprove(selected.id)}
                  className="bg-black text-white px-5 py-2.5 rounded font-bold text-xs uppercase hover:bg-white hover:text-black border-2 border-black disabled:opacity-50"
                >
                  Approve → Open PR
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-black/30 rounded px-2 py-1.5 flex justify-between items-center">
      <span className="uppercase font-semibold opacity-70">{label}</span>
      <span className="font-black">{value}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h4 className="text-xs font-black uppercase tracking-wide mb-1.5 text-gray-500">{title}</h4>
      {children}
    </div>
  );
}
