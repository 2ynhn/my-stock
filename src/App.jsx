import React, { useState, useEffect, useCallback } from 'react'
import { Settings2, ArrowUpDown, Eye } from 'lucide-react'
import Settings from './components/Settings.jsx'
import SearchBar from './components/SearchBar.jsx'
import SummaryCards from './components/SummaryCards.jsx'
import StockCard from './components/StockCard.jsx'
import MarketReport from './components/MarketReport.jsx'
import useStocks from './hooks/useStocks.js'
import { fetchBriefings } from './utils/gemini.js'
import { getCachedBriefings, cacheBriefing, getSlotLabel } from './utils/briefingCache.js'
import { PROFILES } from './utils/gist.js'

export default function App() {
  const [showSettings, setShowSettings] = useState(false)
  const [sortMode, setSortMode] = useState(() => localStorage.getItem('sortMode') || 'recent')
  const [apiKeys, setApiKeys] = useState(() => {
    return {
      githubPat: localStorage.getItem('githubPat') || '',
      geminiApiKey: localStorage.getItem('geminiApiKey') || '',
      geminiModel: localStorage.getItem('geminiModel') || 'gemini-2.5-flash',
    }
  })
  // 이 기기의 소유자(편집 가능 프로필)
  const [myProfile, setMyProfile] = useState(() => localStorage.getItem('myProfile') || PROFILES[0].id)
  // 현재 보고 있는 프로필
  const [activeProfile, setActiveProfile] = useState(() => localStorage.getItem('myProfile') || PROFILES[0].id)
  const [briefings, setBriefings] = useState({})
  const [loadingTickers, setLoadingTickers] = useState([])
  const [error, setError] = useState(null)

  const hasKeys = apiKeys.githubPat && apiKeys.geminiApiKey
  const canEdit = activeProfile === myProfile

  const { stocks, addStock, removeStock, gistError } = useStocks(apiKeys, activeProfile)

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

  const handleAddStock = async (stock) => {
    await addStock(stock)
  }

  const handleRemoveStock = async (ticker) => {
    await removeStock(ticker)
    setBriefings(prev => {
      const next = { ...prev }
      delete next[ticker]
      return next
    })
  }

  const handleSortChange = (mode) => {
    setSortMode(mode)
    localStorage.setItem('sortMode', mode)
  }

  const sortedStocks = [...stocks].sort((a, b) => {
    if (sortMode === 'alpha') {
      return a.name.localeCompare(b.name, 'ko')
    }
    return 0
  })

  const upCount = stocks.filter(s => {
    const b = briefings[s.ticker]
    return b && b.changeRate > 0
  }).length

  const downCount = stocks.filter(s => {
    const b = briefings[s.ticker]
    return b && b.changeRate < 0
  }).length

  const activeLabel = PROFILES.find(p => p.id === activeProfile)?.label || ''

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">📈 나의 주식 브리핑</h1>
            <p className="text-slate-500 text-sm mt-1">{getSlotLabel()}</p>
          </div>
          <div className="flex items-center gap-2">
            {hasKeys && (
              <div className="flex bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
                {PROFILES.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setActiveProfile(p.id)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${activeProfile === p.id ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    {p.label}{p.id === myProfile ? ' (나)' : ''}
                  </button>
                ))}
              </div>
            )}
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 transition-colors shadow-sm"
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

            <MarketReport apiKeys={apiKeys} />

            {canEdit ? (
              <div className="mb-4">
                <SearchBar onAdd={handleAddStock} existingTickers={stocks.map(s => s.ticker)} />
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
                    briefingData={briefings[stock.ticker]}
                    isLoading={loadingTickers.includes(stock.ticker)}
                    onRemove={canEdit ? () => handleRemoveStock(stock.ticker) : null}
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
