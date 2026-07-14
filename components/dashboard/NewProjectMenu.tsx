'use client'

import { useState, useRef, useEffect } from 'react'

export default function NewProjectMenu() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="px-3.5 py-1.5 bg-black text-white rounded-md text-xs font-medium hover:opacity-85 transition-opacity"
      >
        + New project
      </button>

      {open && (
        <div className="absolute right-0 mt-1.5 w-48 bg-white border border-gray-200 rounded-md shadow-sm z-10 overflow-hidden">
          <a
            href="/project/new"
            className="block px-3.5 py-2.5 text-xs font-medium text-black hover:bg-gray-50 transition-colors"
          >
            Greenfield project
          </a>
          <a
            href="/brownfield"
            className="block px-3.5 py-2.5 text-xs font-medium text-black hover:bg-gray-50 transition-colors border-t border-gray-100"
          >
            Brownfield migration
          </a>
        </div>
      )}
    </div>
  )
}
