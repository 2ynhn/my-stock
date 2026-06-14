// Yahoo Finance 심볼 검색
// 브라우저에서 query1.finance.yahoo.com 을 직접 호출하면 CORS 로 차단될 수 있어
// 직접 호출 → 실패 시 공개 CORS 프록시로 폴백한다.
const YAHOO_SEARCH = 'https://query1.finance.yahoo.com/v1/finance/search'

function marketFromSymbol(symbol) {
  if (/\.(KS|KQ)$/i.test(symbol)) return 'KR'
  return 'US'
}

function mapQuotes(quotes) {
  return (quotes || [])
    .filter(q => q.symbol && (q.quoteType === 'EQUITY' || q.quoteType === 'ETF'))
    .map(q => ({
      ticker: q.symbol,
      name: q.shortname || q.longname || q.symbol,
      market: marketFromSymbol(q.symbol),
      exchange: q.exchDisp || q.exchange || '',
      type: q.quoteType,
    }))
}

async function fetchJSON(url, signal) {
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`Yahoo 응답 오류 (${res.status})`)
  return res.json()
}

export async function searchSymbols(query, signal) {
  const q = query.trim()
  if (!q) return []

  const params = `?q=${encodeURIComponent(q)}&lang=ko-KR&region=KR&quotesCount=10&newsCount=0`
  const directUrl = `${YAHOO_SEARCH}${params}`

  // 1) 직접 호출
  try {
    const data = await fetchJSON(directUrl, signal)
    return mapQuotes(data.quotes)
  } catch (e) {
    if (e.name === 'AbortError') throw e
    // 2) CORS/네트워크 실패 시 프록시 폴백
    const proxyUrl = `https://corsproxy.io/?url=${encodeURIComponent(directUrl)}`
    const data = await fetchJSON(proxyUrl, signal)
    return mapQuotes(data.quotes)
  }
}
