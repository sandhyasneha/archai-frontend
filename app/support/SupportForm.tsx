'use client';

import { useState } from 'react';

interface SubmitResult {
  ticketId: string;
  status: 'replied' | 'received' | 'diagnosing' | 'fix_ready';
  reply?: string;
  diagnosis?: string;
}

export default function SupportForm({ userId }: { userId: string }) {
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) return;

    setSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/support/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, subject, description }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong.');
      setResult(data);
      setSubject('');
      setDescription('');
    } catch (err: any) {
      setError(err.message || 'Failed to submit your ticket. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <div className="border-2 border-black rounded p-6">
        <p className="text-xs font-black uppercase tracking-wide text-gray-500 mb-2">
          Ticket submitted
        </p>

        {result.status === 'replied' && result.reply && (
          <>
            <p className="text-sm whitespace-pre-wrap mb-4">{result.reply}</p>
            <p className="text-xs text-gray-500">
              If this doesn't fully resolve it, submit another ticket and it'll be flagged for
              our team to look at directly.
            </p>
          </>
        )}

        {result.status !== 'replied' && (
          <p className="text-sm">
            Thanks — this looks like it might be a bug on our end. Our team has been notified and
            will follow up once it's investigated.
          </p>
        )}

        <button
          onClick={() => setResult(null)}
          className="mt-5 text-xs font-bold uppercase underline"
        >
          Submit another ticket
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className="block text-xs font-bold uppercase tracking-wide mb-1.5">
          Subject (optional)
        </label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Short summary of the issue"
          className="w-full border-2 border-black rounded p-3 text-sm"
        />
      </div>

      <div>
        <label className="block text-xs font-bold uppercase tracking-wide mb-1.5">
          What's going on?
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          rows={6}
          placeholder="Describe the issue — the more detail, the faster we can help."
          className="w-full border-2 border-black rounded p-3 text-sm"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={submitting || !description.trim()}
        className="self-start bg-black text-white px-6 py-3 rounded font-bold text-xs uppercase hover:bg-white hover:text-black border-2 border-black disabled:opacity-50 transition-colors"
      >
        {submitting ? 'Submitting…' : 'Submit ticket'}
      </button>
    </form>
  );
}
