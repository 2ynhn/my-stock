import React from 'react'
import { X, TrendingUp, TrendingDown, Minus, Star } from 'lucide-react'

function SkeletonLine({ width = 'w-full', height = 'h-4' }) {
  return <div className={`${width} ${height} bg-slate-200 rounded animate-pulse`} />
}

export default function StockCard({ stock, briefingData, isLoading, onRemove, isFavorite, onToggleFavorite }) {
  const isKR = stock.market === 'KR'

  const getRiseColor = (rate) => {
    if (rate === undefined || rate === null) return 'text-slate-400'
    if (rate > 0) return isKR ? 'text-red-500' : 'text-green-600'
    if (rate < 0) return isKR ? 'text-blue-500' : 'text-red-500'
    return 'text-slate-500'
  }

  const getRiseBg = (rate) => {
    if (rate === undefined || rate === null) return ''
    if (rate > 0) return isKR ? 'bg-red-50' : 'bg-green-50'
    if (rate < 0) return isKR ? 'bg-blue-50' : 'bg-red-50'
    return ''
  }

  const formatPrice = (price, currency) => {
    if (price === undefined || price === null) return '-'
    if (currency === 'KRW' || currency === '원') {
      return price.toLocaleString('ko-KR') + '원'
    }
    return '$' + price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  const formatChange = (change, currency) => {
    if (change === undefined || change === null) return ''
    const sign = change >= 0 ? '+' : ''
    if (currency === 'KRW' || currency === '원') {
      return sign + change.toLocaleString('ko-KR') + '원'
    }
    return sign + '$' + Math.abs(change).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  const formatRate = (rate) => {
    if (rate === undefined || rate === null) return ''
    const sign = rate >= 0 ? '+' : ''
    return `(${sign}${rate.toFixed(2)}%)`
  }

  const TrendIcon = briefingData?.changeRate > 0
    ? TrendingUp
    : briefingData?.changeRate < 0
    ? TrendingDown
    : Minus

  return (
    <div className={`bg-white border rounded-xl p-5 flex flex-col gap-4 hover:shadow-sm transition-all ${isFavorite ? 'border-amber-300 ring-1 ring-amber-200' : 'border-slate-200 hover:border-slate-300'}`}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-slate-900">{stock.name}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${isKR ? 'bg-orange-100 text-orange-600' : 'bg-sky-100 text-sky-600'}`}>
              {isKR ? '국내' : '해외'}
            </span>
          </div>
          <span className="text-xs text-slate-400">{stock.ticker}</span>
        </div>
        <div className="flex items-center gap-1 ml-2 mt-0.5 flex-shrink-0">
          {onToggleFavorite && (
            <button
              onClick={onToggleFavorite}
              className={`transition-colors ${isFavorite ? 'text-amber-400 hover:text-amber-500' : 'text-slate-300 hover:text-amber-400'}`}
              title={isFavorite ? '즐겨찾기 해제' : '즐겨찾기'}
            >
              <Star className="w-4 h-4" fill={isFavorite ? 'currentColor' : 'none'} />
            </button>
          )}
          {onRemove && (
            <button
              onClick={onRemove}
              className="text-slate-300 hover:text-red-400 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Price */}
      {isLoading ? (
        <div className="space-y-2">
          <SkeletonLine width="w-3/4" height="h-7" />
          <SkeletonLine width="w-1/2" height="h-4" />
        </div>
      ) : briefingData ? (
        <div className={`rounded-lg p-3 ${getRiseBg(briefingData.changeRate)}`}>
          <div className={`text-2xl font-bold ${getRiseColor(briefingData.changeRate)}`}>
            {formatPrice(briefingData.currentPrice, briefingData.currency)}
          </div>
          <div className={`flex items-center gap-1.5 text-sm mt-1 ${getRiseColor(briefingData.changeRate)}`}>
            <TrendIcon className="w-4 h-4" />
            <span>{formatChange(briefingData.change, briefingData.currency)}</span>
            <span>{formatRate(briefingData.changeRate)}</span>
          </div>
        </div>
      ) : (
        <div className="text-slate-400 text-sm">가격 정보 없음</div>
      )}

      {/* Briefing */}
      {isLoading ? (
        <div className="space-y-2">
          <SkeletonLine />
          <SkeletonLine width="w-5/6" />
          <SkeletonLine width="w-4/5" />
        </div>
      ) : briefingData?.briefing && briefingData.briefing.length > 0 ? (
        <ul className="space-y-2">
          {briefingData.briefing.map((line, i) => (
            <li key={i} className="flex gap-2 text-base text-slate-700" style={{ fontSize: '1rem' }}>
              <span className="text-blue-500 mt-0.5 flex-shrink-0">•</span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      ) : !isLoading && (
        <p className="text-sm text-slate-400">브리핑 정보 없음</p>
      )}

      {/* Slot label */}
      {briefingData?.lastUpdated && (
        <div className="text-xs text-slate-400 border-t border-slate-100 pt-3">
          {briefingData.lastUpdated}
        </div>
      )}
    </div>
  )
}
