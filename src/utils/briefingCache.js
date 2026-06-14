function getSlot() {
  const hour = new Date().getHours()
  if (hour >= 7 && hour < 12) return { slot: 1, label: '7시 브리핑 기준' }
  if (hour >= 12 && hour < 16) return { slot: 2, label: '12시 브리핑 기준' }
  return { slot: 3, label: '16시 브리핑 기준' }
}

export function getCachedBriefings(tickers) {
  const { slot } = getSlot()
  const today = new Date().toISOString().slice(0, 10)
  const cached = {}

  for (const ticker of tickers) {
    const key = `briefing_${ticker}`
    const stored = localStorage.getItem(key)
    if (stored) {
      const data = JSON.parse(stored)
      if (data.date === today && data.slot === slot) {
        cached[ticker] = data
      }
    }
  }
  return cached
}

export function cacheBriefing(ticker, content) {
  const { slot } = getSlot()
  const today = new Date().toISOString().slice(0, 10)
  localStorage.setItem(`briefing_${ticker}`, JSON.stringify({
    date: today,
    slot,
    ticker,
    content,
  }))
}

export function getSlotLabel() {
  return getSlot().label
}

export function clearBriefingCache() {
  const keys = Object.keys(localStorage).filter(k => k.startsWith('briefing_'))
  keys.forEach(k => localStorage.removeItem(k))
}
