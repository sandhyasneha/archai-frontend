'use client'

import { useState, useRef, useEffect } from 'react'
import { WizardData } from '@/app/project/new/page'

interface Props {
  data: WizardData
  updateData: (partial: Partial<WizardData>) => void
  onNext: () => void
}

type AgentStatus = 'idle' | 'running' | 'done' | 'error'

interface AgentState {
  gatekeeper: AgentStatus
  architect: AgentStatus
  engineer: AgentStatus
  auditor: AgentStatus
}

interface PipelineEvent {
  agent: string
  status: string
  message: string
  payload?: unknown
}

export default function StepInfra({ data, updateData, onNext }: Props) {
  const [loading, setLoading] = useState(false)
  const [agents, setAgents] = useState<AgentState>({
    gatekeeper: 'idle', architect: 'idle', engineer: 'idle', auditor: 'idle'
  })
  const [pipelineMsg, setPipelineMsg] = useState('')
  const [progress, setProgress] = useState(0)
  const [blueprintReady, setBlueprintReady] = useState(false)
  const [error, setError] = useState('')
  const promptRef = useRef<HTMLTextAreaElement>(null)

  const clouds = ['aws', 'azure', 'gcp'] as const

  async function runPipeline() {
    if (!data.prompt.trim()) {
      setError('Please describe your infrastructure requirement.')
      promptRef.current?.focus()
      return
    }

    setError('')
    setLoading(true)
    setBlueprintReady(false)
    setAgents({ gatekeeper: 'idle', architect: 'idle', engineer: 'idle', auditor: 'idle' })
    setProgress(0)

    try {
      const response = await fetch('/api/pipeline/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: data.prompt,
          cloud_provider: data.cloudProvider,
        }),
      })

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) throw new Error('No response stream')

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n').filter(l => l.startsWith('data: '))

        for (const line of lines) {
          try {
            const event: PipelineEvent = JSON.parse(line.replace('data: ', ''))
            handlePipelineEvent(event)
          } catch {
            // skip malformed lines
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Pipeline failed. Please try again.')
      setLoading(false)
    }
  }

  function handlePipelineEvent(event: PipelineEvent) {
    setPipelineMsg(event.message)

    const progressMap: Record<string, number> = {
      'gatekeeper-started': 10,
      'gatekeeper-completed': 25,
      'architect-started': 30,
      'architect-completed': 50,
      'engineer-started': 55,
      'engineer-completed': 75,
      'auditor-started': 80,
      'auditor-completed': 100,
    }

    const key = `${event.agent}-${event.status}`
    if (progressMap[key]) setProgress(progressMap[key])

    setAgents(prev => ({
      ...prev,
      [event.agent]: event.status === 'completed' ? 'done' :
                     event.status === 'started' ? 'running' :
                     event.status === 'rejected' || event.status === 'error' ? 'error' : prev[event.agent as keyof AgentState]
    }))

    if (event.agent === 'gatekeeper' && event.status === 'rejected') {
      setError(event.message)
      setLoading(false)
    }

    if (event.agent === 'auditor' && event.status === 'completed') {
      const payload = event.payload as { terraform_code?: string; arch_plan?: unknown; blueprint_id?: string }
      if (payload?.terraform_code) {
        updateData({
          terraformCode: payload.terraform_code,
          archPlan: payload.arch_plan as WizardData['archPlan'],
          blueprintId: payload.blueprint_id,
        })
      }
      setBlueprintReady(true)
      setLoading(false)
    }

    if (event.status === 'error') {
      setError(event.message)
      setLoading(false)
    }
  }

  const agentDots = [
    { key: 'gatekeeper', label: 'Gatekeeper' },
    { key: 'architect', label: 'Architect' },
    { key: 'engineer', label: 'Engineer' },
    { key: 'auditor', label: 'Auditor' },
  ]

  return (
    <div className="p-7 max-w-4xl">
      <h2 className="text-base font-semibold text-black mb-1">Infrastructure design</h2>
      <p className="text-sm text-gray-400 mb-6">
        Describe your system in plain language. The 4-agent pipeline will generate your blueprint and Terraform code.
      </p>

      {/* Prompt input */}
      <div className="mb-4">
        <label className="block text-xs font-medium text-gray-600 mb-2">
          System requirement
        </label>
        <textarea
          ref={promptRef}
          value={data.prompt}
          onChange={e => updateData({ prompt: e.target.value })}
          rows={4}
          placeholder="e.g. Build a highly available SaaS backend for 50,000 active users with containerised microservices, a managed PostgreSQL database, Redis caching, and a CDN. Must support SOC 2 and GDPR compliance."
          disabled={loading}
          className={[
            'w-full px-3 py-2.5 border rounded-lg text-sm outline-none transition-colors resize-none',
            'focus:border-black disabled:opacity-60 disabled:cursor-not-allowed',
            error && !data.prompt ? 'border-red-400' : 'border-gray-200'
          ].join(' ')}
        />
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      </div>

      {/* Cloud provider */}
      <div className="mb-5">
        <label className="block text-xs font-medium text-gray-600 mb-2">
          Target cloud provider
        </label>
        <div className="flex gap-2">
          {clouds.map(c => (
            <button
              key={c}
              onClick={() => updateData({ cloudProvider: c })}
              disabled={loading}
              className={[
                'px-4 py-2 border rounded-md text-sm font-medium transition-colors uppercase tracking-wide',
                data.cloudProvider === c
                  ? 'border-black bg-black text-white'
                  : 'border-gray-200 text-gray-500 hover:border-gray-400 hover:text-black',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              ].join(' ')}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Generate button */}
      {!blueprintReady && (
        <button
          onClick={runPipeline}
          disabled={loading}
          className="px-5 py-2.5 bg-black text-white rounded-md text-sm font-medium hover:opacity-85 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Running pipeline...' : 'Generate blueprint'}
        </button>
      )}

      {/* Pipeline progress */}
      {(loading || blueprintReady) && (
        <div className="mt-5 border border-gray-100 rounded-lg p-4 bg-gray-50">
          {/* Agent dots */}
          <div className="flex items-center gap-2 mb-3">
            {agentDots.map((a, i) => (
              <div key={a.key} className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <div className={[
                    'w-2 h-2 rounded-full transition-colors',
                    agents[a.key as keyof AgentState] === 'running' ? 'bg-black animate-pulse' :
                    agents[a.key as keyof AgentState] === 'done' ? 'bg-green-500' :
                    agents[a.key as keyof AgentState] === 'error' ? 'bg-red-500' :
                    'bg-gray-200'
                  ].join(' ')} />
                  <span className={[
                    'text-xs',
                    agents[a.key as keyof AgentState] === 'running' ? 'text-black font-medium' :
                    agents[a.key as keyof AgentState] === 'done' ? 'text-green-600' :
                    'text-gray-400'
                  ].join(' ')}>{a.label}</span>
                </div>
                {i < agentDots.length - 1 && <span className="text-gray-200 text-xs">→</span>}
              </div>
            ))}
          </div>

          {/* Progress bar */}
          <div className="h-1 bg-gray-200 rounded overflow-hidden mb-2">
            <div
              className="h-full bg-black rounded transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-gray-500">{pipelineMsg}</p>
        </div>
      )}

      {/* Blueprint output */}
      {blueprintReady && (
        <div className="mt-5 grid grid-cols-2 gap-4">
          {/* Topology */}
          <div className="border border-gray-100 rounded-lg overflow-hidden">
            <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                Network topology
              </span>
            </div>
            <div className="p-4">
              <svg viewBox="0 0 300 200" width="100%" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <marker id="arr" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
                    <path d="M0,0 L6,3 L0,6 Z" fill="#ccc"/>
                  </marker>
                </defs>
                <rect x="90" y="8" width="120" height="26" rx="4" fill="#f4f4f4" stroke="#ccc" strokeWidth="1"/>
                <text x="150" y="25" textAnchor="middle" fontSize="10" fill="#333">CloudFront CDN</text>
                <line x1="150" y1="34" x2="150" y2="52" stroke="#ccc" strokeWidth="1" markerEnd="url(#arr)"/>
                <rect x="80" y="54" width="140" height="26" rx="4" fill="#f4f4f4" stroke="#0a0a0a" strokeWidth="1.5"/>
                <text x="150" y="71" textAnchor="middle" fontSize="10" fill="#0a0a0a" fontWeight="600">Load Balancer</text>
                <line x1="115" y1="80" x2="75" y2="104" stroke="#ccc" strokeWidth="1" markerEnd="url(#arr)"/>
                <line x1="185" y1="80" x2="225" y2="104" stroke="#ccc" strokeWidth="1" markerEnd="url(#arr)"/>
                <rect x="15" y="106" width="110" height="26" rx="4" fill="#f4f4f4" stroke="#ccc" strokeWidth="1"/>
                <text x="70" y="123" textAnchor="middle" fontSize="10" fill="#333">ECS us-east-1a</text>
                <rect x="175" y="106" width="110" height="26" rx="4" fill="#f4f4f4" stroke="#ccc" strokeWidth="1"/>
                <text x="230" y="123" textAnchor="middle" fontSize="10" fill="#333">ECS us-east-1b</text>
                <line x1="70" y1="132" x2="120" y2="156" stroke="#ccc" strokeWidth="1" markerEnd="url(#arr)"/>
                <line x1="230" y1="132" x2="180" y2="156" stroke="#ccc" strokeWidth="1" markerEnd="url(#arr)"/>
                <rect x="90" y="158" width="120" height="26" rx="4" fill="#f4f4f4" stroke="#0a0a0a" strokeWidth="1.5"/>
                <text x="150" y="175" textAnchor="middle" fontSize="10" fill="#0a0a0a" fontWeight="600">RDS PostgreSQL</text>
              </svg>
            </div>
          </div>

          {/* Terraform code */}
          <div className="border border-gray-100 rounded-lg overflow-hidden">
            <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                Terraform output
              </span>
              <button
                onClick={() => navigator.clipboard.writeText(data.terraformCode || '')}
                className="text-[10px] text-gray-400 hover:text-black transition-colors"
              >
                copy
              </button>
            </div>
            <div className="p-4 bg-gray-50 overflow-auto max-h-48">
              <pre className="text-[11px] text-gray-600 font-mono leading-relaxed whitespace-pre-wrap">
                {data.terraformCode?.slice(0, 600)}
                {(data.terraformCode?.length || 0) > 600 ? '\n...(truncated)' : ''}
              </pre>
            </div>
          </div>

          {/* Next button */}
          <div className="col-span-2 flex justify-end mt-2">
            <button
              onClick={onNext}
              className="px-5 py-2.5 bg-black text-white rounded-md text-sm font-medium hover:opacity-85 transition-opacity"
            >
              Next: security audit →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}