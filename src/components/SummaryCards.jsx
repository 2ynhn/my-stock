import React from 'react'
import { BarChart2, TrendingUp, TrendingDown } from 'lucide-react'

export default function SummaryCards({ total, up, down }) {
  const cards = [
    {
      label: '등록 종목 수',
      value: total,
      icon: <BarChart2 className="w-5 h-5" />,
      color: 'text-blue-600',
      bg: 'bg-blue-50 border-blue-100',
    },
    {
      label: '상승 종목 수',
      value: up,
      icon: <TrendingUp className="w-5 h-5" />,
      color: 'text-green-600',
      bg: 'bg-green-50 border-green-100',
    },
    {
      label: '하락 종목 수',
      value: down,
      icon: <TrendingDown className="w-5 h-5" />,
      color: 'text-red-500',
      bg: 'bg-red-50 border-red-100',
    },
  ]

  return (
    <div className="grid grid-cols-3 gap-4 mb-8">
      {cards.map(card => (
        <div
          key={card.label}
          className={`border rounded-xl p-4 flex items-center gap-3 ${card.bg}`}
        >
          <div className={card.color}>{card.icon}</div>
          <div>
            <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
            <div className="text-xs text-slate-500">{card.label}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
