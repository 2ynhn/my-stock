import React, { useState, useEffect, useCallback } from 'react'
import { Settings as SettingsIcon } from 'lucide-react'
import Settings from './components/Settings.jsx'
import SearchBar from './components/SearchBar.jsx'
import SummaryCards from './components/SummaryCards.jsx'
import StockCard from './components/StockCard.jsx'
import useStocks from './hooks/useStocks.js'
import { getCachedBriefings, cacheBriefing, getSlotLabel } from './utils/briefingCache.js'
import { fetchBriefings } from './utils/gemini.js'

export default function App() {
  const [showSettings, setShowSettings] = useState(false)
  const [apiKeys, setApiKeys] = useState(() => ({
    githubPat: localStorage.getItem('githubPat') || '',
    geminiApiKey: localStorage.getItem('geminiApiKey') || '',
    geminiModel: localStorage.getItem('geminiModel') || 'gemini-2.0-flash',
  }))
  const [briefings, setBriefings] = useState({})
  const [loadingTickers, setLoadingTickers] = useState(new Set())

  const hasKeys = apiKeys.githubPat && apiKeys.geminiApiKey

  const { stocks, addStock, removeStock, loading: stocksLoading } = useStocks(apiKeys)

  const fetchMissingBriefings = useCallback(async (stockList, keys) => {
    if (!stockList.length || !keys.geminiApiKey) return
    const tickers = stockList.map(s => s.ticker)
    const cached = getCachedBriefings(tickers)
    const missing = stockList.filter(s => !cached[s.ticker])

    setBriefings(prev => ({ ...prev, ...cached }))

    if (!missing.length) return

    setLoadingTickers(prev => {
      const next = new Set(prev)
      missing.forEach(s => next.add(s.ticker))
      return next
    })

    try {
      const results = await fetchBriefings(missing, keys.geminiApiKey, keys.geminiModel)
      const newBriefings = {}
      results.forEach(r => {
        cacheBriefing(r.ticker, r)
        newBriefings[r.ticker] = { ticker: r.ticker, content: r, date: new Date().toISOString().slice(0, 10) }
      })
      setBriefings(prev => ({ ...prev, ...newBriefings }))
    } catch (err) {
      console.error('Failed to fetch briefings:', err)
    } finally {
      setLoadingTickers(prev => {
        const next = new Set(prev)
        missing.forEach(s => next.delete(s.ticker))
        return next
      })
    }
  }, [])

  useEffect(() => {
    if (stocks.length && apiKeys.geminiApiKey) {
      fetchMissingBriefings(stocks, apiKeys)
    }
  }, [stocks, apiKeys, fetchMissingBriefings])

  const handleSaveSettings = () => {
    setApiKeys({
      githubPat: localStorage.getItem('githubPat') || '',
      geminiApiKey: localStorage.getItem('geminiApiKey') || '',
      geminiModel: localStorage.getItem('geminiModel') || 'gemini-2.0-flash',
    })
    setShowSettings(false)
  }

  if (!hasKeys) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Settings isOpen={true} onSave={handleSaveSettings} onClose={() => {}} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">📈 나의 주식 브리핑</h1>
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors"
          >
            <SettingsIcon size={20} />
          </button>
        </div>

        <SummaryCards stocks={stocks} briefings={briefings} />

        <div className="my-6">
          <SearchBar onAdd={addStock} apiKeys={apiKeys} />
        </div>

        {stocksLoading ? (
          <div className="text-slate-400 text-center py-12">종목 불러오는 중...</div>
        ) : stocks.length === 0 ? (
          <div className="text-slate-400 text-center py-12">
            <p className="text-lg">등록된 종목이 없습니다.</p>
            <p className="text-sm mt-2">위에서 종목을 추가해보세요.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {stocks.map(stock => (
              <StockCard
                key={stock.ticker}
                stock={stock}
                briefingData={briefings[stock.ticker]}
                isLoading={loadingTickers.has(stock.ticker)}
                onRemove={() => removeStock(stock.ticker)}
              />
            ))}
          </div>
        )}
      </div>

      {showSettings && (
        <Settings
          isOpen={showSettings}
          onSave={handleSaveSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  )
}
