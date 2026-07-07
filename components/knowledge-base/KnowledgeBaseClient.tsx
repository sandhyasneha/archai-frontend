'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'



interface KBFile {
  name: string
  id?: string | null
  updated_at?: string | null
  created_at?: string | null
  last_accessed_at?: string | null
  metadata?: {
    size?: number
    mimetype?: string
    [key: string]: unknown
  } | null
}

interface UserData {
  id: string
  email: string
  full_name: string
  initials: string
}

interface Props {
  user: UserData
  initialFiles: KBFile[]
}

function fileIcon(mimetype?: string): string {
  if (!mimetype) return '📄'
  if (mimetype.includes('pdf')) return '📕'
  if (mimetype.includes('word')) return '📘'
  if (mimetype.includes('json')) return '📋'
  if (mimetype.includes('terraform') || mimetype.includes('plain')) return '📝'
  return '📄'
}

function fileSize(bytes?: number): string {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function fileType(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase()
  const types: Record<string, string> = {
    pdf: 'PDF document',
    docx: 'Word document',
    txt: 'Text file',
    tf: 'Terraform file',
    json: 'JSON file',
  }
  return types[ext ?? ''] ?? 'Document'
}

export default function KnowledgeBaseClient({ user, initialFiles }: Props) {
  const supabase = createClient()
  const [files, setFiles] = useState<KBFile[]>(initialFiles)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [toast, setToast] = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  async function uploadFile(file: File) {
    const allowed = ['application/pdf', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/json', 'text/x-terraform']
    if (!allowed.includes(file.type) && !file.name.endsWith('.tf')) {
      showToast('File type not allowed. Use PDF, TXT, DOCX, JSON or .tf files.')
      return
    }
    if (file.size > 20 * 1024 * 1024) {
      showToast('File too large. Maximum size is 20 MB.')
      return
    }

    setUploading(true)
    const path = `${user.id}/${Date.now()}-${file.name}`

    const { error } = await supabase.storage
      .from('knowledge-base')
      .upload(path, file, { upsert: false })

    if (error) {
      showToast('Upload failed: ' + error.message)
      setUploading(false)
      return
    }

    // Refresh file list
    const { data: refreshed } = await supabase.storage
      .from('knowledge-base')
      .list(`${user.id}/`, { sortBy: { column: 'created_at', order: 'desc' } })

    setFiles(refreshed ?? [])
    showToast(`${file.name} uploaded successfully`)
    setUploading(false)
  }

  async function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) await uploadFile(file)
    e.target.value = ''
  }

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) await uploadFile(file)
  }

  async function deleteFile(fileName: string) {
    setDeleting(fileName)
    const { error } = await supabase.storage
      .from('knowledge-base')
      .remove([`${user.id}/${fileName}`])

    if (error) {
      showToast('Delete failed: ' + error.message)
    } else {
      setFiles(prev => prev.filter(f => f.name !== fileName))
      showToast('File deleted')
    }
    setDeleting(null)
  }

  return (
    <div className="flex h-screen w-full bg-white overflow-hidden">

      {/* Sidebar */}
      <nav className="w-[234px] flex-shrink-0 border-r border-gray-100 flex flex-col h-screen">
        <div className="px-4 py-5 border-b border-gray-100 flex items-center gap-2.5">
          <div className="w-6 h-6 bg-black rounded flex items-center justify-center text-white text-xs font-bold">A</div>
          <span className="text-sm font-bold tracking-widest uppercase">ArchAI</span>
        </div>
        <div className="flex-1 px-2.5 py-3 flex flex-col gap-0.5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 px-2 pt-2 pb-1">Workspace</p>
          <a href="/dashboard" className="flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm text-gray-500 hover:bg-gray-50 hover:text-black transition-colors">
            <span className="w-4">▦</span> Dashboard
          </a>
          <a href="/project/new" className="flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm text-gray-500 hover:bg-gray-50 hover:text-black transition-colors">
            <span className="w-4">⌂</span> Greenfield
          </a>
          <a href="/brownfield" className="flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm text-gray-500 hover:bg-gray-50 hover:text-black transition-colors">
            <span className="w-4">⬡</span> Brownfield
          </a>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 px-2 pt-4 pb-1">Configuration</p>
          <a href="/knowledge-base" className="flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm bg-black text-white transition-colors">
            <span className="w-4">⊟</span> Knowledge base
          </a>
          <a href="/settings" className="flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm text-gray-500 hover:bg-gray-50 hover:text-black transition-colors">
            <span className="w-4">⚙</span> Settings
          </a>
          <a href="/doc" className="flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm text-gray-500 hover:bg-gray-50 hover:text-black transition-colors">
            <span className="w-4">📖</span> Docs
          </a>
        </div>
        <div className="px-3 py-3.5 border-t border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs font-semibold">
              {user.initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-black truncate">{user.full_name}</div>
              <div className="text-[11px] text-gray-400 truncate">{user.email}</div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="border-b border-gray-100 px-7 py-3 flex items-center justify-between flex-shrink-0">
          <div className="text-xs text-gray-400">
            Dashboard / <span className="text-black font-medium">Knowledge base</span>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="px-3.5 py-1.5 bg-black text-white rounded-md text-xs font-medium hover:opacity-85 transition-opacity disabled:opacity-50"
          >
            {uploading ? 'Uploading...' : '+ Upload document'}
          </button>
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileInput}
            accept=".pdf,.txt,.docx,.json,.tf" />
        </div>

        <div className="flex-1 overflow-y-auto p-7">
          <div className="max-w-3xl">
            <h1 className="text-xl font-medium text-black mb-1">Knowledge base</h1>
            <p className="text-sm text-gray-400 mb-7">
              Upload your organisation's compliance documents, naming conventions, architecture standards, and Terraform templates.
              The AI agents reference these on every blueprint generation — ensuring output matches your exact standards.
            </p>

            {/* What goes here */}
            <div className="grid grid-cols-4 gap-3 mb-7">
              {[
                { icon: '📕', title: 'Compliance docs', desc: 'SOC 2, GDPR, HIPAA requirements' },
                { icon: '📝', title: 'Terraform templates', desc: 'Your approved .tf patterns' },
                { icon: '📘', title: 'Architecture standards', desc: 'Naming conventions, tagging policies' },
                { icon: '📋', title: 'Budget policies', desc: 'Cost caps and approved instance types' },
              ].map(item => (
                <div key={item.title} className="border border-gray-100 rounded-xl p-4 text-center">
                  <div className="text-2xl mb-2">{item.icon}</div>
                  <div className="text-xs font-medium text-black mb-1">{item.title}</div>
                  <div className="text-[11px] text-gray-400">{item.desc}</div>
                </div>
              ))}
            </div>

            {/* Upload zone */}
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={[
                'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors mb-7',
                dragOver ? 'border-black bg-gray-50' : 'border-gray-200 hover:border-gray-400',
              ].join(' ')}
            >
              <div className="text-3xl text-gray-300 mb-3">↑</div>
              <div className="text-sm font-medium text-black mb-1">
                {uploading ? 'Uploading...' : 'Drop a file here or click to upload'}
              </div>
              <div className="text-xs text-gray-400">
                PDF, DOCX, TXT, JSON, .tf · Max 20 MB per file
              </div>
            </div>

            {/* File list */}
            {files.length === 0 ? (
              <div className="text-center py-12 border border-gray-100 rounded-xl">
                <div className="text-3xl text-gray-200 mb-3">⊟</div>
                <div className="text-sm font-medium text-black mb-1">No documents yet</div>
                <p className="text-xs text-gray-400 max-w-xs mx-auto">
                  Upload your first document — the AI agents will reference it when generating blueprints for your organisation.
                </p>
              </div>
            ) : (
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
                  {files.length} document{files.length !== 1 ? 's' : ''} — referenced by AI agents on every run
                </div>
                <div className="border border-gray-100 rounded-xl overflow-hidden">
                  {files.map((file, i) => (
                    <div key={file.name} className={[
                      'flex items-center gap-4 px-5 py-4',
                      i < files.length - 1 ? 'border-b border-gray-50' : ''
                    ].join(' ')}>
                      <span className="text-2xl flex-shrink-0">
                        {fileIcon(file.metadata?.mimetype)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-black truncate">
                          {file.name.replace(/^\d+-/, '')}
                        </div>
                        <div className="text-[11px] text-gray-400 mt-0.5">
                          {fileType(file.name)} · {fileSize(file.metadata?.size)}
                          {file.created_at && ` · ${new Date(file.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 bg-green-50 text-green-700 rounded-full text-[10px] font-medium">
                          Active
                        </span>
                        <button
                          onClick={() => deleteFile(file.name)}
                          disabled={deleting === file.name}
                          className="p-1.5 text-gray-300 hover:text-red-500 transition-colors rounded hover:bg-red-50"
                          title="Delete"
                        >
                          {deleting === file.name ? '...' : '✕'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* How it works */}
            <div className="mt-7 border border-gray-100 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-50 bg-gray-50">
                <div className="text-sm font-semibold text-black">How the knowledge base works</div>
              </div>
              <div className="p-5 flex flex-col gap-4">
                {[
                  { step: '1', title: 'You upload documents', desc: 'Compliance requirements, Terraform templates, naming conventions, budget policies' },
                  { step: '2', title: 'Agents read your documents', desc: 'Before generating each blueprint, the Architect and Engineer agents scan your KB for relevant patterns' },
                  { step: '3', title: 'Output matches your standards', desc: 'Generated Terraform uses your naming conventions, complies with your policies, and follows your approved patterns' },
                ].map(item => (
                  <div key={item.step} className="flex gap-4">
                    <div className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center text-[11px] font-bold flex-shrink-0 mt-0.5">
                      {item.step}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-black mb-0.5">{item.title}</div>
                      <div className="text-xs text-gray-400">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-black text-white px-4 py-2.5 rounded-lg text-sm font-medium shadow-lg z-50">
          {toast}
        </div>
      )}
    </div>
  )
}