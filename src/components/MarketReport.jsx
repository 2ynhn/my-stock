import React, { useState, useEffect, useCallback } from 'react'
import { RefreshCw, ChevronDown, ChevronUp, Newspaper } from 'lucide-react'
import { fetchMarketBriefing } from '../utils/gemini.js'

function todayKey() {
  const d = new Date()
  return `marketReport_${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function readCache() {
  try {
    const raw = localStorage.getItem(todayKey())
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export default function MarketReport({ apiKeys }) {
  const [report, setReport] = useState(() => readCache())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [open, setOpen] = useState(true)

  const load = useCallback(async () => {
    if (!apiKeys.geminiApiKey) return
    setLoading(true)
    setError(null)
    try {
      const data = await fetchMarketBriefing(apiKeys.geminiApiKey, apiKeys.geminiModel)
      setReport(data)
      try { localStorage.setItem(todayKey(), JSON.stringify(data)) } catch { /* ignore */ }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [apiKeys.geminiApiKey, apiKeys.geminiModel])

  // 첫 로딩 시: 오늘 캐시가 없으면 자동으로 받아온다
  useEffect(() => {
    if (!report && apiKeys.geminiApiKey) {
      load()
    }
  }, [apiKeys.geminiApiKey])

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm mb-6 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Newspaper className="w-4 h-4 text-blue-500" />
          <span className="font-semibold text-slate-800 text-sm">오늘의 시장 리포트</span>
          {report?.date && (
            <span className="text-xs text-slate-400">{report.date}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 disabled:text-slate-400 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            새로고침
          </button>
          {report && (
            <button onClick={() => setOpen(o => !o)} className="text-slate-400 hover:text-slate-600">
              {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      {error && (
        <div className="px-5 py-3 text-red-500 text-xs">{error}</div>
      )}

      {loading && !report && (
        <div className="px-5 py-6 text-center text-slate-400 text-sm">
          <span className="animate-spin w-5 h-5 border-2 border-slate-200 border-t-blue-500 rounded-full inline-block mr-2" />
          시장 리포트를 가져오는 중...
        </div>
      )}

      {report && open && (
        <div className="px-5 py-4 space-y-4">
          {report.summary && (
            <p className="text-slate-700 text-sm leading-relaxed border-l-4 border-blue-200 pl-3">
              {report.summary}
            </p>
          )}
          {report.sections?.map((s, i) => (
            <div key={i} className="flex gap-3">
              <span className="text-sm font-medium text-slate-700 flex-shrink-0 w-32">{s.label}</span>
              <span className="text-sm text-slate-600 leading-relaxed">{s.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
