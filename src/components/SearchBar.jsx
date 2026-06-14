import React, { useState, useEffect, useRef } from 'react'
import { Plus, Search, Loader2 } from 'lucide-react'
import { validateUSTicker } from '../utils/gemini.js'

export default function SearchBar({ onAdd, apiKeys }) {
  const [mode, setMode] = useState('KR')
  const [query, setQuery] = useState('')
  const [krStocks, setKrStocks] = useState([])
  const [suggestions, setSuggestions] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const inputRef = useRef(null)
  const dropdownRef = useRef(null)

  useEffect(() => {
    fetch('/my-stock/krx-stocks.json')
      .then(r => r.json())
      .then(data => setKrStocks(data))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (mode === 'KR' && query.trim().length > 0) {
      const q = query.trim().toLowerCase()
      const filtered = krStocks.filter(
        s => s.name.toLowerCase().includes(q) || s.ticker.toLowerCase().includes(q)
      ).slice(0, 10)
      setSuggestions(filtered)
      setShowDropdown(filtered.length > 0)
    } else {
      setSuggestions([])
      setShowDropdown(false)
    }
  }, [query, mode, krStocks])

  const handleModeSwitch = (m) => {
    setMode(m)
    setQuery('')
    setSelected(null)
    setSuggestions([])
    setShowDropdown(false)
  }

  const handleSelectSuggestion = (stock) => {
    setSelected(stock)
    setQuery(stock.name)
    setShowDropdown(false)
  }

  const handleAdd = async () => {
    if (mode === 'KR') {
      if (!selected) return
      onAdd(selected)
      setQuery('')
      setSelected(null)
    } else {
      const ticker = query.trim().toUpperCase()
      if (!ticker) return
      setLoading(true)
      try {
        const result = await validateUSTicker(ticker, apiKeys.geminiApiKey, apiKeys.geminiModel)
        if (result.valid) {
          onAdd({ ticker: result.ticker, name: result.name, market: 'US' })
          setQuery('')
        } else {
          alert(`"${ticker}"는 유효한 미국 주식 티커가 아닙니다.`)
        }
      } catch {
        alert('티커 검증 중 오류가 발생했습니다.')
      } finally {
        setLoading(false)
      }
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleAdd()
  }

  return (
    <div className="bg-slate-800 rounded-xl p-4">
      <div className="flex gap-2 mb-3">
        <button
          onClick={() => handleModeSwitch('KR')}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            mode === 'KR' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
          }`}
        >
          국내
        </button>
        <button
          onClick={() => handleModeSwitch('US')}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            mode === 'US' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
          }`}
        >
          해외
        </button>
      </div>

      <div className="relative flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setSelected(null) }}
            onKeyDown={handleKeyDown}
            onFocus={() => { if (suggestions.length) setShowDropdown(true) }}
            placeholder={mode === 'KR' ? '종목명 또는 코드 검색' : '미국 주식 티커 입력 (예: AAPL)'}
            className="w-full bg-slate-700 text-white rounded-lg pl-9 pr-3 py-2 text-sm border border-slate-600 focus:outline-none focus:border-blue-500"
          />
          {showDropdown && (
            <div
              ref={dropdownRef}
              className="absolute top-full left-0 right-0 mt-1 bg-slate-700 rounded-lg border border-slate-600 shadow-xl z-10 max-h-60 overflow-y-auto"
            >
              {suggestions.map(stock => (
                <button
                  key={stock.ticker}
                  onClick={() => handleSelectSuggestion(stock)}
                  className="w-full text-left px-3 py-2 hover:bg-slate-600 transition-colors flex justify-between items-center"
                >
                  <span className="text-white text-sm">{stock.name}</span>
                  <span className="text-slate-400 text-xs">{stock.ticker}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={handleAdd}
          disabled={loading || (mode === 'KR' && !selected)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 disabled:cursor-not-allowed rounded-lg text-white text-sm font-medium transition-colors flex items-center gap-1"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          추가
        </button>
      </div>
    </div>
  )
}
