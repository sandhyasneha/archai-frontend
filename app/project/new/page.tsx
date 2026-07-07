'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import StepInfra from '@/components/wizard/StepInfra'
import StepSecurity from '@/components/wizard/StepSecurity'
import StepCost from '@/components/wizard/StepCost'
import StepDR from '@/components/wizard/StepDR'
import StepExport from '@/components/wizard/StepExport'
import { Blueprint, ArchPlan } from '@/types'


export type WizardData = {
  projectName: string
  prompt: string
  cloudProvider: 'aws' | 'azure' | 'gcp'
  blueprintId?: string
  archPlan?: ArchPlan
  terraformCode?: string
  complianceFrameworks: string[]
  drStrategy: 'backup_restore' | 'pilot_light' | 'warm_standby' | 'active_active'
  rtoMinutes: number
  rpoMinutes: number
}

const STEPS = [
  { id: 1, label: 'Infra design' },
  { id: 2, label: 'Security' },
  { id: 3, label: 'Cost' },
  { id: 4, label: 'Disaster recovery' },
  { id: 5, label: 'Review & export' },
]


export default function NewProjectPage() {
const [currentStep, setCurrentStep] = useState(1)
  const router = useRouter()
  const [wizardData, setWizardData] = useState<WizardData>({
    projectName: '',
    prompt: '',
    cloudProvider: 'aws',
    complianceFrameworks: ['SOC 2', 'GDPR'],
    drStrategy: 'warm_standby',
    rtoMinutes: 60,
    rpoMinutes: 15,
  })

  function updateData(partial: Partial<WizardData>) {
    setWizardData(prev => ({ ...prev, ...partial }))
  }

  function nextStep() {
    setCurrentStep(prev => Math.min(prev + 1, 5))
  }

  function prevStep() {
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }

  return (
    <div className="flex h-screen w-full bg-white overflow-hidden">

      {/* Sidebar */}
      <nav className="w-[234px] flex-shrink-0 border-r border-gray-100 flex flex-col h-screen">
        <div className="px-4 py-5 border-b border-gray-100 flex items-center gap-2.5">
          <div className="w-6 h-6 bg-black rounded flex items-center justify-center text-white text-xs font-bold flex-shrink-0">A</div>
          <span className="text-sm font-bold tracking-widest uppercase">ArchAI</span>
        </div>

        <div className="flex-1 px-2.5 py-3 flex flex-col gap-0.5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 px-2 pt-2 pb-1">
            Workspace
          </p>
          <a href="/dashboard" className="flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm text-gray-500 hover:bg-gray-50 hover:text-black transition-colors">
            <span className="text-base w-4">▦</span>
            <span>Dashboard</span>
          </a>
          <a href="/project/new" className="flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm bg-black text-white transition-colors">
            <span className="text-base w-4">⌂</span>
            <span>Greenfield</span>
          </a>

          {/* Step sub-nav */}
          <div className="ml-6 mt-1 flex flex-col gap-0.5">
            {STEPS.map((step) => (
              <button
                key={step.id}
                onClick={() => step.id < currentStep && setCurrentStep(step.id)}
                className={[
                  'flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-left transition-colors w-full',
                  currentStep === step.id ? 'text-black font-medium' : '',
                  step.id < currentStep ? 'text-green-600 cursor-pointer hover:bg-gray-50' : 'text-gray-400 cursor-default',
                ].join(' ')}
              >
                <span className={[
                  'w-1.5 h-1.5 rounded-full flex-shrink-0',
                  currentStep === step.id ? 'bg-black' :
                  step.id < currentStep ? 'bg-green-500' : 'bg-gray-200'
                ].join(' ')} />
                {step.label}
              </button>
            ))}
          </div>

          <div className="mt-3">
            <a href="/brownfield" className="flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm text-gray-500 hover:bg-gray-50 hover:text-black transition-colors">
              <span className="text-base w-4">⬡</span>
              <span>Brownfield</span>
            </a>
          </div>
        </div>

        <div className="px-3 py-3.5 border-t border-gray-100">
          <a href="/dashboard" className="text-xs text-gray-400 hover:text-black transition-colors">
            ← Back to dashboard
          </a>
        </div>
      </nav>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Topbar with step progress */}
        <div className="border-b border-gray-100 px-7 py-4 flex items-center justify-between flex-shrink-0">
          <div className="text-xs text-gray-400">
            Dashboard / <span className="text-black font-medium">New Greenfield project</span>
          </div>
          {/* Progress indicator */}
          <div className="flex items-center gap-1">
            {STEPS.map((step, i) => (
              <div key={step.id} className="flex items-center gap-1">
                <div className={[
                  'flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-medium transition-colors',
                  currentStep === step.id ? 'bg-black text-white' :
                  step.id < currentStep ? 'bg-green-500 text-white' :
                  'bg-gray-100 text-gray-400'
                ].join(' ')}>
                  {step.id < currentStep ? '✓' : step.id}
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`w-8 h-px ${step.id < currentStep ? 'bg-green-400' : 'bg-gray-100'}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step content */}
        <div className="flex-1 overflow-y-auto">
          {currentStep === 1 && (
            <StepInfra data={wizardData} updateData={updateData} onNext={nextStep} />
          )}
          {currentStep === 2 && (
            <StepSecurity data={wizardData} updateData={updateData} onNext={nextStep} onBack={prevStep} />
          )}
          {currentStep === 3 && (
            <StepCost data={wizardData} updateData={updateData} onNext={nextStep} onBack={prevStep} />
          )}
          {currentStep === 4 && (
            <StepDR data={wizardData} updateData={updateData} onNext={nextStep} onBack={prevStep} />
          )}
          {currentStep === 5 && (
            <StepExport data={wizardData} onBack={prevStep} />
          )}
        </div>
      </div>
    </div>
  )
}