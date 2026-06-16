import React, { useState, useEffect, useCallback } from 'react'
import { Settings2, ArrowUpDown, Eye } from 'lucide-react'
import Settings from './components/Settings.jsx'
import SearchBar from './components/SearchBar.jsx'
import SummaryCards from './components/SummaryCards.jsx'
import StockCard from './components/StockCard.jsx'
import MarketReport from './components/MarketReport.jsx'
import useStocks from './hooks/useStocks.js'
import { fetchBriefings } from './utils/gemini.js'
import { fetchStockPrices } from './utils/stockPrice.js'
import { getCachedBriefings, cacheBriefing, getSlotLabel } from './utils/briefingCache.js'
import { PROFILES } from './utils/gist.js'

export default function App() {
  const [showSettings, setShowSettings] = useState(false)
  const [sortMode, setSortMode] = useState(() => localStorage.getItem('sortMode') || 'recent')
  const [apiKeys, setApiKeys] = useState(() => {
    const VALID_MODELS = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash']
    const storedModel = localStorage.getItem('geminiModel') || ''
    const geminiModel = VALID_MODELS.some(m => storedModel.startsWith(m)) ? storedModel : 'gemini-2.5-flash'
    if (geminiModel !== storedModel) localStorage.setItem('geminiModel', geminiModel)
    return {
      githubPat: localStorage.getItem('githubPat') || '',
      geminiApiKey: localStorage.getItem('geminiApiKey') || '',
      geminiModel,
    }
  })
  const [myProfile, setMyProfile] = useState(() => localStorage.getItem('myProfile') || PROFILES[0].id)
  const [activeProfile, setActiveProfile] = useState(() => localStorage.getItem('myProfile') || PROFILES[0].id)

  // 가격과 브리핑을 분리된 상태로 관리
  const [prices, setPrices] = useState({})
  const [briefings, setBriefings] = useState({})
  const [priceLoading, setPriceLoading] = useState(false)
  const [loadingTickers, setLoadingTickers] = useState([])
  const [error, setError] = useState(null)
  const [favorites, setFavorites] = useState(() => {
    try { return JSON.parse(localStorage.getItem('favorites') || '[]') } catch { return [] }
  })

  const hasKeys = apiKeys.githubPat && apiKeys.geminiApiKey
  const canEdit = activeProfile === myProfile

  const { stocks, addStock, removeStock, gistError } = useStocks(apiKeys, activeProfile)

  // 가격 조회 — Yahoo Finance, AI 없음
  const loadPrices = useCallback(async (stockList) => {
    if (!stockList.length) return
    setPriceLoading(true)
    try {
      const data = await fetchStockPrices(stockList)
      setPrices(data)
    } catch (e) {
      console.warn('가격 조회 실패:', e)
    } finally {
      setPriceLoading(false)
    }
  }, [])

  // 브리핑 텍스트 조회 — Gemini (텍스트만, 가격 없음)
  const loadBriefings = useCallback(async (stockList) => {
    if (!stockList.length || !apiKeys.geminiApiKey) return

    const cached = getCachedBriefings(stockList.map(s => s.ticker))
    const missing = stockList.filter(s => !cached[s.ticker])

    const newBriefings = { ...cached }
    Object.keys(cached).forEach(ticker => {
      newBriefings[ticker] = cached[ticker].content
    })

    if (missing.length > 0) {
      setLoadingTickers(missing.map(s => s.ticker))
      try {
        const fetched = await fetchBriefings(missing, apiKeys.geminiApiKey, apiKeys.geminiModel)
        fetched.forEach(b => {
          cacheBriefing(b.ticker, b)
          newBriefings[b.ticker] = b
        })
      } catch (e) {
        setError('브리핑을 가져오는 중 오류가 발생했습니다: ' + e.message)
      } finally {
        setLoadingTickers([])
      }
    }

    setBriefings(newBriefings)
  }, [apiKeys.geminiApiKey, apiKeys.geminiModel])

  useEffect(() => {
    if (stocks.length > 0) {
      loadPrices(stocks)
    }
  }, [stocks])

  useEffect(() => {
    if (stocks.length > 0 && apiKeys.geminiApiKey) {
      loadBriefings(stocks)
    }
  }, [stocks, apiKeys.geminiApiKey])

  const handleSaveSettings = (keys, profile) => {
    setApiKeys(keys)
    if (profile && profile !== myProfile) {
      setMyProfile(profile)
      localStorage.setItem('myProfile', profile)
      setActiveProfile(profile)
    }
    setShowSettings(false)
  }

  const handleRemoveStock = async (ticker) => {
    await removeStock(ticker)
    setBriefings(prev => { const n = { ...prev }; delete n[ticker]; return n })
    setPrices(prev => { const n = { ...prev }; delete n[ticker]; return n })
  }

  const handleSortChange = (mode) => {
    setSortMode(mode)
    localStorage.setItem('sortMode', mode)
  }

  const toggleFavorite = (ticker) => {
    setFavorites(prev => {
      const next = prev.includes(ticker) ? prev.filter(t => t !== ticker) : [...prev, ticker]
      localStorage.setItem('favorites', JSON.stringify(next))
      return next
    })
  }

  const sortedStocks = [...stocks].sort((a, b) => {
    const af = favorites.includes(a.ticker) ? 0 : 1
    const bf = favorites.includes(b.ticker) ? 0 : 1
    if (af !== bf) return af - bf
    if (sortMode === 'alpha') return a.name.localeCompare(b.name, 'ko')
    return 0
  })

  // 가격 기준으로 상승/하락 카운트
  const upCount = stocks.filter(s => (prices[s.ticker]?.changeRate ?? 0) > 0).length
  const downCount = stocks.filter(s => (prices[s.ticker]?.changeRate ?? 0) < 0).length

  const activeLabel = PROFILES.find(p => p.id === activeProfile)?.label || ''

  // StockCard는 기존 briefingData 형태 유지 — 가격+브리핑 병합
  function getCardData(ticker) {
    const p = prices[ticker] || {}
    const b = briefings[ticker] || {}
    if (!Object.keys(p).length && !Object.keys(b).length) return null
    return { ...p, ...b }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 truncate">📈 나의 주식 브리핑</h1>
            <p className="text-slate-500 text-xs sm:text-sm mt-0.5">{getSlotLabel()}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {hasKeys && (
              <div className="flex bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
                {PROFILES.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setActiveProfile(p.id)}
                    className={`px-2.5 sm:px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${activeProfile === p.id ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    {p.label}{p.id === myProfile ? ' (나)' : ''}
                  </button>
                ))}
              </div>
            )}
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 transition-colors shadow-sm flex-shrink-0"
              title="설정"
            >
              <Settings2 className="w-5 h-5 text-slate-600" />
            </button>
          </div>
        </div>

        {!hasKeys ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="bg-white border border-slate-200 rounded-2xl p-10 max-w-md w-full text-center shadow-sm">
              <div className="text-5xl mb-4">🔑</div>
              <h2 className="text-xl font-semibold mb-2 text-slate-800">API 키를 설정해주세요</h2>
              <p className="text-slate-500 text-sm mb-6">
                GitHub PAT와 Gemini API 키를 입력하면<br />주식 브리핑을 시작할 수 있습니다.
              </p>
              <button
                onClick={() => setShowSettings(true)}
                className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
              >
                설정 열기
              </button>
            </div>
          </div>
        ) : (
          <>
            <SummaryCards total={stocks.length} up={upCount} down={downCount} />

            <MarketReport />

            {canEdit ? (
              <div className="mb-4">
                <SearchBar onAdd={stock => addStock(stock)} existingTickers={stocks.map(s => s.ticker)} />
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 text-amber-700 rounded-lg px-4 py-3 mb-4 text-sm flex items-center gap-2">
                <Eye className="w-4 h-4 flex-shrink-0" />
                <span>{activeLabel}님의 종목을 보는 중입니다 (보기 전용). 편집하려면 본인 프로필로 전환하세요.</span>
              </div>
            )}

            {(error || gistError) && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-6 text-sm">
                {gistError || error}
                <button onClick={() => setError(null)} className="ml-4 underline">닫기</button>
                {gistError && (
                  <button onClick={() => setShowSettings(true)} className="ml-4 underline">설정 열기</button>
                )}
              </div>
            )}

            {stocks.length > 0 && (
              <div className="flex items-center gap-2 mb-4">
                <ArrowUpDown className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-500">정렬:</span>
                <button
                  onClick={() => handleSortChange('recent')}
                  className={`px-3 py-1 rounded-lg text-sm transition-colors ${sortMode === 'recent' ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                  최근 추가순
                </button>
                <button
                  onClick={() => handleSortChange('alpha')}
                  className={`px-3 py-1 rounded-lg text-sm transition-colors ${sortMode === 'alpha' ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                  ㄱㄴㄷ순
                </button>
              </div>
            )}

            {stocks.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <div className="text-4xl mb-3">📊</div>
                <p>{canEdit ? '관심 종목을 추가해보세요' : `${activeLabel}님이 등록한 종목이 없습니다`}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {sortedStocks.map(stock => (
                  <StockCard
                    key={stock.ticker}
                    stock={stock}
                    briefingData={getCardData(stock.ticker)}
                    isLoading={loadingTickers.includes(stock.ticker) || (priceLoading && !prices[stock.ticker])}
                    onRemove={canEdit ? () => handleRemoveStock(stock.ticker) : null}
                    isFavorite={favorites.includes(stock.ticker)}
                    onToggleFavorite={() => toggleFavorite(stock.ticker)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {showSettings && (
        <Settings
          initialKeys={apiKeys}
          initialProfile={myProfile}
          onSave={handleSaveSettings}
          onCancel={() => setShowSettings(false)}
        />
      )}
    </div>
  )
}
