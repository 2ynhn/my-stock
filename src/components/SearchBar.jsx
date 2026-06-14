import React, { useState, useEffect, useRef } from 'react'
import { Plus, Search } from 'lucide-react'
import { validateUSTicker, validateKRStock } from '../utils/gemini.js'

export default function SearchBar({ onAdd, existingTickers, apiKeys }) {
  const [mode, setMode] = useState('KR')
  const [query, setQuery] = useState('')
  const [krStocks, setKrStocks] = useState([])
  const [suggestions, setSuggestions] = useState([])
  const [selected, setSelected] = useState(null)
  const [isAdding, setIsAdding] = useState(false)
  const [addError, setAddError] = useState(null)
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
        s =>
          s.name.toLowerCase().includes(q) ||
          s.ticker.toLowerCase().includes(q)
      ).slice(0, 8)
      setSuggestions(filtered)
      setSelected(null)
    } else {
      setSuggestions([])
    }
  }, [query, mode, krStocks])

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
    if (mode === 'KR') {
      const q = query.trim().toLowerCase()
      if (!q) {
        setAddError('종목명을 입력해주세요.')
        return
      }
      // 1) 번들 목록에서 우선 매칭
      let target = selected
        || krStocks.find(s => s.name.toLowerCase() === q || s.ticker.toLowerCase() === q)
        || suggestions[0]

      setIsAdding(true)
      try {
        // 2) 목록에 없으면 Gemini로 실시간 조회
        if (!target) {
          target = await validateKRStock(query.trim(), apiKeys.geminiApiKey, apiKeys.geminiModel)
        }
        if (existingTickers.includes(target.ticker)) {
          setAddError('이미 추가된 종목입니다.')
          return
        }
        await onAdd({ ticker: target.ticker, name: target.name, market: 'KR' })
        setQuery('')
        setSelected(null)
        setSuggestions([])
      } catch (e) {
        setAddError(e.message || '종목을 찾을 수 없습니다.')
      } finally {
        setIsAdding(false)
      }
    } else {
      const ticker = query.trim().toUpperCase()
      if (!ticker) {
        setAddError('티커를 입력해주세요.')
        return
      }
      if (existingTickers.includes(ticker)) {
        setAddError('이미 추가된 종목입니다.')
        return
      }
      setIsAdding(true)
      try {
        const info = await validateUSTicker(ticker, apiKeys.geminiApiKey, apiKeys.geminiModel)
        await onAdd({ ticker, name: info.name || ticker, market: 'US' })
        setQuery('')
      } catch (e) {
        setAddError(e.message || '유효하지 않은 티커입니다.')
      } finally {
        setIsAdding(false)
      }
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleAdd()
    if (e.key === 'Escape') setSuggestions([])
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
      <div className="flex gap-2 mb-3">
        <button
          onClick={() => { setMode('KR'); setQuery(''); setSelected(null) }}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${mode === 'KR' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500 hover:text-slate-800'}`}
        >
          🇰🇷 국내주식
        </button>
        <button
          onClick={() => { setMode('US'); setQuery(''); setSelected(null) }}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${mode === 'US' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500 hover:text-slate-800'}`}
        >
          🇺🇸 미국주식
        </button>
      </div>

      <div className="relative flex gap-2" ref={dropdownRef}>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setSelected(null) }}
            onKeyDown={handleKeyDown}
            placeholder={mode === 'KR' ? '종목명 검색 (예: 두산퓨얼셀, KODEX 200)' : '티커 입력 (예: AAPL, TSLA)'}
            className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-10 overflow-hidden">
              {suggestions.map(s => (
                <button
                  key={s.ticker}
                  onMouseDown={() => handleSelect(s)}
                  className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 transition-colors text-left"
                >
                  <span className="text-slate-800 text-sm font-medium">{s.name}</span>
                  <span className="text-slate-400 text-xs ml-2">{s.ticker}</span>
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
