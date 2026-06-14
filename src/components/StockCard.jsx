import React from 'react'
import { X } from 'lucide-react'
import { getSlotLabel } from '../utils/briefingCache.js'

export default function StockCard({ stock, briefingData, isLoading, onRemove }) {
  const content = briefingData?.content

  const formatPrice = (price, currency) => {
    if (price == null) return '-'
    if (currency === 'USD') return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    return `₩${price.toLocaleString('ko-KR')}`
  }

  const getChangeColor = (change) => {
    if (change == null || change === 0) return 'text-slate-400'
    if (stock.market === 'KR') {
      return change > 0 ? 'text-red-400' : 'text-blue-400'
    } else {
      return change > 0 ? 'text-green-400' : 'text-red-400'
    }
  }

  const formatChange = (change, changeRate, currency) => {
    if (change == null) return ''
    const sign = change >= 0 ? '+' : ''
    const priceStr = currency === 'USD'
      ? `$${Math.abs(change).toFixed(2)}`
      : `₩${Math.abs(change).toLocaleString('ko-KR')}`
    const arrow = change >= 0 ? '▲' : '▼'
    return `${arrow} ${priceStr} (${sign}${changeRate?.toFixed(2)}%)`
  }

  if (isLoading) {
    return (
      <div className="bg-slate-800 rounded-xl p-5 relative animate-pulse">
        <div className="flex justify-between items-start mb-3">
          <div>
            <div className="h-5 w-24 bg-slate-700 rounded mb-2" />
            <div className="h-3 w-16 bg-slate-700 rounded" />
          </div>
          <div className="h-5 w-10 bg-slate-700 rounded" />
        </div>
        <div className="h-6 w-32 bg-slate-700 rounded mb-1" />
        <div className="h-4 w-24 bg-slate-700 rounded mb-4" />
        <div className="space-y-2">
          <div className="h-3 w-full bg-slate-700 rounded" />
          <div className="h-3 w-5/6 bg-slate-700 rounded" />
          <div className="h-3 w-4/6 bg-slate-700 rounded" />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-slate-800 rounded-xl p-5 relative">
      <button
        onClick={onRemove}
        className="absolute top-3 right-3 text-slate-500 hover:text-red-400 transition-colors"
      >
        <X size={16} />
      </button>

      <div className="flex items-start justify-between mb-3 pr-6">
        <div>
          <h3 className="font-semibold text-white">{stock.name}</h3>
          <p className="text-xs text-slate-400 mt-0.5">{stock.ticker}</p>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded font-medium ${
          stock.market === 'KR' ? 'bg-blue-900 text-blue-300' : 'bg-green-900 text-green-300'
        }`}>
          {stock.market === 'KR' ? '국내' : '해외'}
        </span>
      </div>

      {content ? (
        <>
          <p className="text-xl font-bold text-white mb-0.5">
            {formatPrice(content.currentPrice, content.currency)}
          </p>
          <p className={`text-sm mb-4 ${getChangeColor(content.change)}`}>
            {formatChange(content.change, content.changeRate, content.currency)}
          </p>

          {content.briefing && content.briefing.length > 0 && (
            <ul className="space-y-1.5">
              {content.briefing.map((point, i) => (
                <li key={i} className="text-xs text-slate-300 flex gap-2">
                  <span className="text-blue-400 mt-0.5 flex-shrink-0">•</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          )}

          <p className="text-xs text-slate-500 mt-3">{getSlotLabel()}</p>
        </>
      ) : (
        <div className="text-sm text-slate-500 py-4 text-center">
          브리핑 정보 없음
        </div>
      )}
    </div>
  )
}
