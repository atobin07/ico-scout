'use client'

import { useState, useEffect } from 'react'
import data from '../../public/data.json'

type Application = {
  company: string
  title: string
  date: string
  fit: 'STRONG' | 'WEAK'
  applyUrl: string
  postedAge: string
  resumePath: string
  coverLetterPath: string
  hasPdf: boolean
}

const apps: Application[] = (data as any).applications

function getAppliedKey(app: Application) {
  return `applied::${app.company}::${app.title}::${app.date}`
}

export default function Home() {
  const [selectedDate, setSelectedDate] = useState<string>('all')
  const [fitFilter, setFitFilter] = useState<'ALL' | 'STRONG' | 'WEAK'>('ALL')
  const [applied, setApplied] = useState<Record<string, boolean>>({})
  const [showAppliedOnly, setShowAppliedOnly] = useState(false)
  const [showUnAppliedOnly, setShowUnAppliedOnly] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem('ico-scout-applied')
      if (stored) setApplied(JSON.parse(stored))
    } catch {}
  }, [])

  function toggleApplied(app: Application) {
    const key = getAppliedKey(app)
    const next = { ...applied, [key]: !applied[key] }
    setApplied(next)
    try { localStorage.setItem('ico-scout-applied', JSON.stringify(next)) } catch {}
  }

  const dates = Array.from(new Set(apps.map(a => a.date))).sort((a, b) => b.localeCompare(a))

  const filtered = apps.filter(a => {
    if (selectedDate !== 'all' && a.date !== selectedDate) return false
    if (fitFilter !== 'ALL' && a.fit !== fitFilter) return false
    const isApplied = !!applied[getAppliedKey(a)]
    if (showAppliedOnly && !isApplied) return false
    if (showUnAppliedOnly && isApplied) return false
    return true
  })

  const strongCount = filtered.filter(a => a.fit === 'STRONG').length
  const weakCount = filtered.filter(a => a.fit === 'WEAK').length
  const appliedCount = filtered.filter(a => !!applied[getAppliedKey(a)]).length

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-gray-800">
          <div className="text-xs font-bold uppercase tracking-widest text-teal-400 mb-1">ICO Scout</div>
          <div className="text-xs text-gray-500">Alexander Tobin</div>
        </div>

        <div className="p-3 border-b border-gray-800 space-y-1">
          <button
            onClick={() => { setSelectedDate('all'); setFitFilter('ALL'); setShowAppliedOnly(false); setShowUnAppliedOnly(false) }}
            className={`w-full text-left px-3 py-2 rounded text-sm font-medium transition-colors ${selectedDate === 'all' && fitFilter === 'ALL' && !showAppliedOnly && !showUnAppliedOnly ? 'bg-teal-600 text-white' : 'text-gray-300 hover:bg-gray-800'}`}
          >
            All Applications
            <span className="float-right text-xs opacity-70">{apps.length}</span>
          </button>
          <button
            onClick={() => { setFitFilter('STRONG'); setShowAppliedOnly(false); setShowUnAppliedOnly(false) }}
            className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${fitFilter === 'STRONG' && !showAppliedOnly ? 'bg-green-700 text-white' : 'text-gray-300 hover:bg-gray-800'}`}
          >
            Strong Fits
            <span className="float-right text-xs opacity-70">{apps.filter(a => a.fit === 'STRONG').length}</span>
          </button>
          <button
            onClick={() => { setFitFilter('WEAK'); setShowAppliedOnly(false); setShowUnAppliedOnly(false) }}
            className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${fitFilter === 'WEAK' && !showAppliedOnly ? 'bg-yellow-700 text-white' : 'text-gray-300 hover:bg-gray-800'}`}
          >
            Weak Fits
            <span className="float-right text-xs opacity-70">{apps.filter(a => a.fit === 'WEAK').length}</span>
          </button>
          <button
            onClick={() => { setShowAppliedOnly(!showAppliedOnly); setShowUnAppliedOnly(false) }}
            className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${showAppliedOnly ? 'bg-blue-700 text-white' : 'text-gray-300 hover:bg-gray-800'}`}
          >
            Applied
            <span className="float-right text-xs opacity-70">{apps.filter(a => !!applied[getAppliedKey(a)]).length}</span>
          </button>
          <button
            onClick={() => { setShowUnAppliedOnly(!showUnAppliedOnly); setShowAppliedOnly(false) }}
            className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${showUnAppliedOnly ? 'bg-purple-700 text-white' : 'text-gray-300 hover:bg-gray-800'}`}
          >
            Not Applied
            <span className="float-right text-xs opacity-70">{apps.filter(a => !applied[getAppliedKey(a)]).length}</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          <div className="text-xs uppercase tracking-widest text-gray-500 mb-2 px-1">By Date</div>
          {dates.map(d => {
            const count = apps.filter(a => a.date === d).length
            return (
              <button
                key={d}
                onClick={() => setSelectedDate(d)}
                className={`w-full text-left px-3 py-2 rounded text-sm mb-1 transition-colors ${selectedDate === d ? 'bg-teal-700 text-white' : 'text-gray-400 hover:bg-gray-800'}`}
              >
                {d}
                <span className="float-right text-xs opacity-70">{count}</span>
              </button>
            )
          })}
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl font-bold text-white">
                {selectedDate === 'all' ? 'All Applications' : selectedDate}
              </h1>
              <p className="text-sm text-gray-400 mt-1">
                {filtered.length} jobs &nbsp;·&nbsp;
                <span className="text-green-400">{strongCount} strong</span> &nbsp;·&nbsp;
                <span className="text-yellow-400">{weakCount} weak</span> &nbsp;·&nbsp;
                <span className="text-blue-400">{appliedCount} applied</span>
              </p>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-lg border border-gray-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-900 border-b border-gray-800 text-left">
                  <th className="px-3 py-3 text-gray-400 font-medium w-10">✓</th>
                  <th className="px-4 py-3 text-gray-400 font-medium">Company</th>
                  <th className="px-4 py-3 text-gray-400 font-medium">Role</th>
                  <th className="px-4 py-3 text-gray-400 font-medium w-20">Fit</th>
                  <th className="px-4 py-3 text-gray-400 font-medium w-28">Date</th>
                  <th className="px-4 py-3 text-gray-400 font-medium w-28">Posted</th>
                  <th className="px-4 py-3 text-gray-400 font-medium w-24">Apply</th>
                  <th className="px-4 py-3 text-gray-400 font-medium w-24">Resume</th>
                  <th className="px-4 py-3 text-gray-400 font-medium w-28">Cover Letter</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-gray-500">No applications found</td>
                  </tr>
                )}
                {filtered.map((app, i) => {
                  const key = getAppliedKey(app)
                  const isApplied = !!applied[key]
                  return (
                    <tr
                      key={key}
                      className={`border-b border-gray-800/50 transition-colors ${isApplied ? 'bg-blue-950/20' : i % 2 === 0 ? 'bg-gray-950' : 'bg-gray-900/30'} hover:bg-gray-800/40`}
                    >
                      <td className="px-3 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={isApplied}
                          onChange={() => toggleApplied(app)}
                          className="w-4 h-4 accent-teal-500 cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-3 font-medium text-white">{app.company}</td>
                      <td className="px-4 py-3 text-gray-300 max-w-xs">{app.title}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${app.fit === 'STRONG' ? 'bg-green-900/60 text-green-300' : 'bg-yellow-900/60 text-yellow-300'}`}>
                          {app.fit}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{app.date}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{app.postedAge || '—'}</td>
                      <td className="px-4 py-3">
                        {app.applyUrl ? (
                          <a
                            href={app.applyUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-1 bg-teal-700 hover:bg-teal-600 text-white text-xs rounded transition-colors"
                          >
                            Apply →
                          </a>
                        ) : (
                          <span className="text-gray-600 text-xs">No link</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {app.hasPdf ? (
                          <a
                            href={`/${app.resumePath}`}
                            download={`Tobin_${app.company}_Resume.pdf`}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-navy-700 hover:bg-blue-700 bg-blue-900 hover:bg-blue-800 text-white text-xs rounded transition-colors"
                          >
                            PDF ↓
                          </a>
                        ) : (
                          <span className="text-gray-600 text-xs">No PDF</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {app.coverLetterPath ? (
                          <a
                            href={`/${app.coverLetterPath}`}
                            download
                            className="inline-flex items-center gap-1 px-2 py-1 bg-purple-900 hover:bg-purple-800 text-white text-xs rounded transition-colors"
                          >
                            Letter ↓
                          </a>
                        ) : (
                          <span className="text-gray-600 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}
