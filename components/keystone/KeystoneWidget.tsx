'use client'

import { useState, useRef, useEffect } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
  link?: { url: string; label: string } | null
}

const KeystoneIcon = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* A simple arch — the keystone at its centre */}
    <path
      d="M4 21V11.5C4 6.8 7.58 3 12 3C16.42 3 20 6.8 20 11.5V21"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
    <path d="M10.3 9.5L12 3L13.7 9.5H10.3Z" fill="currentColor" />
  </svg>
)

export default function KeystoneWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hi, I'm Keystone — ask me anything about using ArchAI: Greenfield, Brownfield, plans, your account, whatever you need.",
      link: null,
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, open])

  async function send() {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    const nextMessages: Message[] = [...messages, { role: 'user', content: text }]
    setMessages(nextMessages)
    setLoading(true)

    try {
      const history = nextMessages.slice(-11, -1).map(m => ({ role: m.role, content: m.content }))
      const res = await fetch('/api/keystone/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history }),
      })
      const data = await res.json()
      setMessages(m => [...m, { role: 'assistant', content: data.reply, link: data.link }])
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: "Sorry, something went wrong on my end — please try again.", link: null }])
    } finally {
      setLoading(false)
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      {open && (
        <div className="w-[360px] h-[480px] bg-white border border-gray-200 rounded-2xl shadow-xl flex flex-col overflow-hidden animate-[keystone-in_0.18s_ease-out]">
          <style>{`@keyframes keystone-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>

          {/* Header */}
          <div className="px-4 py-3.5 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-black text-white flex items-center justify-center">
                <KeystoneIcon size={16} />
              </div>
              <div>
                <div className="text-sm font-semibold text-black leading-tight">Keystone</div>
                <div className="text-[11px] text-gray-400 leading-tight">ArchAI support</div>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-black transition-colors rounded"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    m.role === 'user' ? 'bg-black text-white' : 'bg-gray-50 text-gray-800 border border-gray-100'
                  }`}
                >
                  {m.content}
                  {m.link && (
                    <a
                      href={m.link.url}
                      className="mt-2 inline-block text-xs font-medium bg-white text-black border border-gray-200 rounded-md px-2.5 py-1.5 hover:bg-gray-50 transition-colors"
                    >
                      {m.link.label} →
                    </a>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-50 border border-gray-100 rounded-xl px-3.5 py-2.5 text-xs text-gray-400">
                  Keystone is thinking…
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="px-3 py-3 border-t border-gray-100 flex items-center gap-2 flex-shrink-0">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Ask about ArchAI…"
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-black transition-colors"
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              className="w-9 h-9 flex-shrink-0 flex items-center justify-center bg-black text-white rounded-lg disabled:opacity-30 hover:opacity-85 transition-opacity"
              aria-label="Send"
            >
              ↑
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen(o => !o)}
        className="w-[52px] h-[52px] rounded-full bg-black text-white flex items-center justify-center shadow-lg hover:opacity-85 transition-opacity"
        aria-label={open ? 'Close Keystone' : 'Open Keystone'}
      >
        {open ? <span className="text-lg">✕</span> : <KeystoneIcon size={24} />}
      </button>
    </div>
  )
}
