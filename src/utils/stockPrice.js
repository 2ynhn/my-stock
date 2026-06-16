// Yahoo Finance v7 quote API — 브라우저 직접 호출, CORS 실패 시 allorigins 프록시 폴백
const YAHOO_QUOTE = 'https://query1.finance.yahoo.com/v7/finance/quote'
const PROXY = 'https://api.allorigins.win/raw?url='

const PRICE_TTL = 30 * 60 * 1000 // 30분 캐시

function readPriceCache(ticker) {
  try {
    const raw = localStorage.getItem(`price_${ticker}`)
    if (!raw) return null
    const data = JSON.parse(raw)
    if (Date.now() - data.ts < PRICE_TTL) return data
  } catch {}
  return null
}

function writePriceCache(ticker, data) {
  try {
    localStorage.setItem(`price_${ticker}`, JSON.stringify({ ...data, ts: Date.now() }))
  } catch {}
}

async function fetchWithTimeout(url, ms = 6000) {
  const ctrl = new AbortController()
  const id = setTimeout(() => ctrl.abort(), ms)
  try {
    const res = await fetch(url, { signal: ctrl.signal })
    return res
  } finally {
    clearTimeout(id)
  }
}

async function fetchQuoteBatch(symbols) {
  const url = `${YAHOO_QUOTE}?symbols=${symbols.join(',')}`

  // 직접 호출 시도
  try {
    const res = await fetchWithTimeout(url)
    if (res.ok) {
      const data = await res.json()
      const result = data?.quoteResponse?.result
      if (Array.isArray(result) && result.length > 0) return result
    }
  } catch {}

  // CORS 프록시 폴백
  const proxyRes = await fetchWithTimeout(PROXY + encodeURIComponent(url), 12000)
  if (!proxyRes.ok) throw new Error(`가격 조회 실패 (${proxyRes.status})`)
  const data = await proxyRes.json()
  return data?.quoteResponse?.result || []
}

export async function fetchStockPrices(stocks) {
  const tickers = stocks.map(s => s.ticker)
  const result = {}
  const missing = []

  // 캐시 확인
  for (const t of tickers) {
    const cached = readPriceCache(t)
    if (cached) result[t] = cached
    else missing.push(t)
  }

  if (missing.length === 0) return result

  // 10개씩 배치 처리
  const BATCH = 10
  for (let i = 0; i < missing.length; i += BATCH) {
    const batch = missing.slice(i, i + BATCH)
    try {
      const quotes = await fetchQuoteBatch(batch)
      for (const q of quotes) {
        const priceData = {
          currentPrice: q.regularMarketPrice ?? null,
          change: q.regularMarketChange ?? null,
          changeRate: q.regularMarketChangePercent ?? null,
          currency: q.currency === 'KRW' ? 'KRW' : 'USD',
        }
        result[q.symbol] = priceData
        writePriceCache(q.symbol, priceData)
      }
    } catch (e) {
      console.warn('Price batch failed:', batch, e)
    }
  }

  return result
}
