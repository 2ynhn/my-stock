import React, { useState, useEffect } from 'react'
import { RefreshCw, ChevronDown, ChevronUp, BarChart2 } from 'lucide-react'

// 오전 8시 기준 날짜 키 (8시 이전이면 전날 키 사용)
function cacheKey() {
  const now = new Date()
  if (now.getHours() < 8) {
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    return `marketReport_${yesterday.toISOString().slice(0, 10)}`
  }
  return `marketReport_${now.toISOString().slice(0, 10)}`
}

function readCache() {
  try {
    const raw = localStorage.getItem(cacheKey())
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeCache(data) {
  try { localStorage.setItem(cacheKey(), JSON.stringify(data)) } catch {}
}

async function fetchMarketJson() {
  const res = await fetch('/market-today.json?_=' + Date.now())
  if (!res.ok) throw new Error(`시장 데이터 로드 실패 (${res.status})`)
  return res.json()
}

export default function MarketReport() {
  const [report, setReport] = useState(() => readCache())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [open, setOpen] = useState(true)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchMarketJson()
      setReport(data)
      writeCache(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  // 캐시 없으면 자동 로드
  useEffect(() => {
    if (!report) load()
  }, [])

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm mb-6 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-blue-500" />
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

      {error && (
        <div className="px-5 py-3 text-red-500 text-xs">{error}</div>
      )}

      {loading && !report && (
        <div className="px-5 py-6 text-center text-slate-400 text-sm">
          <span className="animate-spin w-5 h-5 border-2 border-slate-200 border-t-blue-500 rounded-full inline-block mr-2" />
          시장 데이터를 불러오는 중...
        </div>
      )}

      {report && open && (
        <div className="px-5 py-4 space-y-3">
          {report.sections?.map((s, i) => (
            <div key={i} className="flex gap-3">
              <span className="text-sm font-medium text-slate-700 flex-shrink-0 w-24">{s.label}</span>
              <span className="text-sm text-slate-600 leading-relaxed">{s.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
