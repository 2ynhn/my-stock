// 캐시 슬롯: 당일 08:00 이후면 오늘 날짜, 08:00 이전이면 어제 날짜를 키로 사용.
// → 오전 8시 이후 첫 조회 후 다음날 8시 전까지 같은 캐시를 재사용.
function getCacheDate() {
  const now = new Date()
  if (now.getHours() < 8) {
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    return yesterday.toISOString().slice(0, 10)
  }
  return now.toISOString().slice(0, 10)
}

export function getCachedBriefings(tickers) {
  const date = getCacheDate()
  const cached = {}
  for (const ticker of tickers) {
    try {
      const stored = localStorage.getItem(`briefing_${ticker}`)
      if (stored) {
        const data = JSON.parse(stored)
        if (data.date === date) cached[ticker] = data
      }
    } catch { /* ignore */ }
  }
  return cached
}

export function cacheBriefing(ticker, content) {
  const date = getCacheDate()
  try {
    localStorage.setItem(`briefing_${ticker}`, JSON.stringify({ date, ticker, content }))
  } catch { /* ignore */ }
}

export function getSlotLabel() {
  const now = new Date()
  const date = getCacheDate()
  const label = now.getHours() < 8 ? '전일' : '오늘'
  return `${label} 08시 브리핑 기준 (${date})`
}

export function clearBriefingCache() {
  const keys = Object.keys(localStorage).filter(k => k.startsWith('briefing_'))
  keys.forEach(k => localStorage.removeItem(k))
}
