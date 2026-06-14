import React, { useState, useEffect, useRef } from 'react'
import { Plus, Search } from 'lucide-react'
import { searchSymbols } from '../utils/yahoo.js'

export default function SearchBar({ onAdd, existingTickers }) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [selected, setSelected] = useState(null)
  const [isSearching, setIsSearching] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [addError, setAddError] = useState(null)
  const inputRef = useRef(null)
  const dropdownRef = useRef(null)
  const abortRef = useRef(null)

  // 디바운스 검색
  useEffect(() => {
    const q = query.trim()
    if (q.length === 0) {
      setSuggestions([])
      setIsSearching(false)
      return
    }
    setIsSearching(true)
    const timer = setTimeout(async () => {
      if (abortRef.current) abortRef.current.abort()
      const controller = new AbortController()
      abortRef.current = controller
      try {
        const results = await searchSymbols(q, controller.signal)
        setSuggestions(results)
      } catch (e) {
        if (e.name !== 'AbortError') setSuggestions([])
      } finally {
        setIsSearching(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setSuggestions([])
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleSelect = (stock) => {
    setSelected(stock)
    setQuery(stock.name)
    setSuggestions([])
  }

  const handleAdd = async () => {
    setAddError(null)
    const target = selected || suggestions[0]
    if (!target) {
      setAddError('목록에서 종목을 선택해주세요.')
      return
    }
    if (existingTickers.includes(target.ticker)) {
      setAddError('이미 추가된 종목입니다.')
      return
    }
    setIsAdding(true)
    try {
      await onAdd({ ticker: target.ticker, name: target.name, market: target.market })
      setQuery('')
      setSelected(null)
      setSuggestions([])
    } finally {
      setIsAdding(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleAdd()
    if (e.key === 'Escape') setSuggestions([])
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
      <div className="relative flex gap-2" ref={dropdownRef}>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setSelected(null) }}
            onKeyDown={handleKeyDown}
            placeholder="종목명/티커 검색 (예: 삼성전자, AAPL, KODEX 200)"
            className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-9 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {isSearching && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin w-4 h-4 border-2 border-slate-300 border-t-blue-500 rounded-full inline-block" />
          )}
          {suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-10 overflow-hidden max-h-80 overflow-y-auto">
              {suggestions.map(s => (
                <button
                  key={s.ticker}
                  onMouseDown={() => handleSelect(s)}
                  className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 transition-colors text-left"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${s.market === 'KR' ? 'bg-orange-100 text-orange-600' : 'bg-sky-100 text-sky-600'}`}>
                      {s.market === 'KR' ? '국내' : '해외'}
                    </span>
                    <span className="text-slate-800 text-sm font-medium truncate">{s.name}</span>
                  </span>
                  <span className="text-slate-400 text-xs ml-2 flex-shrink-0">{s.ticker}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={handleAdd}
          disabled={isAdding}
          className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-300 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5"
        >
          {isAdding ? (
            <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full inline-block" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          추가
        </button>
      </div>
      {addError && <p className="text-red-500 text-xs mt-2">{addError}</p>}
    </div>
  )
}
