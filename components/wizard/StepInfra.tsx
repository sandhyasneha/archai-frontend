'use client'

import { useState, useRef } from 'react'
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
    gatekeeper: 'idle',
    architect: 'idle',
    engineer: 'idle',
    auditor: 'idle',
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
          project_name: data.projectName,
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
      [event.agent]:
        event.status === 'completed' ? 'done' :
        event.status === 'started' ? 'running' :
        event.status === 'rejected' || event.status === 'error' ? 'error' :
        prev[event.agent as keyof AgentState],
    }))

    if (event.agent === 'gatekeeper' && event.status === 'rejected') {
      setError(event.message)
      setLoading(false)
    }

    if (event.agent === 'auditor' && event.status === 'completed') {
      const payload = event.payload as {
        terraform_code?: string
        arch_plan?: unknown
        blueprint_id?: string
      }
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

      {/* Project name */}
      <div className="mb-4">
        <label className="block text-xs font-medium text-gray-600 mb-2">
          Project name
        </label>
        <input
          type="text"
          value={data.projectName}
          onChange={e => updateData({ projectName: e.target.value })}
          placeholder="e.g. Payments API, Analytics Platform, DevOps Stack"
          disabled={loading}
          className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-black transition-colors disabled:opacity-60"
        />
      </div>

      {/* System requirement */}
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
            error && !data.prompt ? 'border-red-400' : 'border-gray-200',
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
                'disabled:opacity-50 disabled:cursor-not-allowed',
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
          <div className="flex items-center gap-2 mb-3">
            {agentDots.map((a, i) => (
              <div key={a.key} className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <div className={[
                    'w-2 h-2 rounded-full transition-colors',
                    agents[a.key as keyof AgentState] === 'running' ? 'bg-black animate-pulse' :
                    agents[a.key as keyof AgentState] === 'done' ? 'bg-green-500' :
                    agents[a.key as keyof AgentState] === 'error' ? 'bg-red-500' :
                    'bg-gray-200',
                  ].join(' ')} />
                  <span className={[
                    'text-xs',
                    agents[a.key as keyof AgentState] === 'running' ? 'text-black font-medium' :
                    agents[a.key as keyof AgentState] === 'done' ? 'text-green-600' :
                    'text-gray-400',
                  ].join(' ')}>
                    {a.label}
                  </span>
                </div>
                {i < agentDots.length - 1 && (