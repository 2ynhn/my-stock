import React, { useState, useEffect, useCallback } from 'react'
import { Settings2 } from 'lucide-react'
import Settings from './components/Settings.jsx'
import SearchBar from './components/SearchBar.jsx'
import SummaryCards from './components/SummaryCards.jsx'
import StockCard from './components/StockCard.jsx'
import useStocks from './hooks/useStocks.js'
import { fetchBriefings } from './utils/gemini.js'
import { getCachedBriefings, cacheBriefing, getSlotLabel } from './utils/briefingCache.js'

export default function App() {
  const [showSettings, setShowSettings] = useState(false)
  const [apiKeys, setApiKeys] = useState(() => {
    return {
      githubPat: localStorage.getItem('githubPat') || '',
      geminiApiKey: localStorage.getItem('geminiApiKey') || '',
      geminiModel: localStorage.getItem('geminiModel') || 'gemini-2.0-flash-001',
    }
  })
  const [briefings, setBriefings] = useState({})
  const [loadingTickers, setLoadingTickers] = useState([])
  const [error, setError] = useState(null)

  const hasKeys = apiKeys.githubPat && apiKeys.geminiApiKey

  const { stocks, addStock, removeStock, gistError } = useStocks(apiKeys)

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

  const handleSaveSettings = (keys) => {
    setApiKeys(keys)
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

  const upCount = stocks.filter(s => {
    const b = briefings[s.ticker]
    return b && b.changeRate > 0
  }).length

  const downCount = stocks.filter(s => {
    const b = briefings[s.ticker]
    return b && b.changeRate < 0
  }).length

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">📈 나의 주식 브리핑</h1>
            <p className="text-slate-400 text-sm mt-1">{getSlotLabel()}</p>
          </div>
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors"
            title="설정"
          >
            <Settings2 className="w-5 h-5 text-slate-300" />
          </button>
        </div>

        {!hasKeys ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-10 max-w-md w-full text-center">
              <div className="text-5xl mb-4">🔑</div>
              <h2 className="text-xl font-semibold mb-2">API 키를 설정해주세요</h2>
              <p className="text-slate-400 text-sm mb-6">
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

            <div className="mb-8">
              <SearchBar onAdd={handleAddStock} existingTickers={stocks.map(s => s.ticker)} apiKeys={apiKeys} />
            </div>

            {(error || gistError) && (
              <div className="bg-red-900/40 border border-red-700 text-red-300 rounded-lg px-4 py-3 mb-6 text-sm">
                {gistError || error}
                <button onClick={() => setError(null)} className="ml-4 underline">닫기</button>
                {gistError && (
                  <button onClick={() => setShowSettings(true)} className="ml-4 underline">설정 열기</button>
                )}
              </div>
            )}

            {stocks.length === 0 ? (
              <div className="text-center py-16 text-slate-500">
                <div className="text-4xl mb-3">📊</div>
                <p>관심 종목을 추가해보세요</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {stocks.map(stock => (
                  <StockCard
                    key={stock.ticker}
                    stock={stock}
                    briefingData={briefings[stock.ticker]}
                    isLoading={loadingTickers.includes(stock.ticker)}
                    onRemove={() => handleRemoveStock(stock.ticker)}
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
          onSave={handleSaveSettings}
          onCancel={() => setShowSettings(false)}
        />
      )}
    </div>
  )
}
