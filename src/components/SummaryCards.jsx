import React from 'react'

export default function SummaryCards({ stocks, briefings }) {
  const total = stocks.length

  let rising = 0
  let falling = 0
  stocks.forEach(stock => {
    const b = briefings[stock.ticker]
    if (b && b.content) {
      const change = b.content.change ?? b.content.changeRate
      if (change > 0) rising++
      else if (change < 0) falling++
    }
  })

  return (
    <div className="grid grid-cols-3 gap-4 mb-6">
      <div className="bg-slate-800 rounded-xl p-4 text-center">
        <p className="text-slate-400 text-sm mb-1">등록 종목 수</p>
        <p className="text-3xl font-bold text-white">{total}</p>
      </div>
      <div className="bg-slate-800 rounded-xl p-4 text-center">
        <p className="text-slate-400 text-sm mb-1">상승 종목 수</p>
        <p className="text-3xl font-bold text-green-400">{rising}</p>
      </div>
      <div className="bg-slate-800 rounded-xl p-4 text-center">
        <p className="text-slate-400 text-sm mb-1">하락 종목 수</p>
        <p className="text-3xl font-bold text-red-400">{falling}</p>
      </div>
    </div>
  )
}
