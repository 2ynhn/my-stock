const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

export async function listModels(apiKey) {
  const res = await fetch(`${GEMINI_BASE}?key=${apiKey}&pageSize=200`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message || 'Gemini API error')
  return (data.models || [])
    .filter(m => (m.supportedGenerationMethods || []).includes('generateContent'))
    .map(m => ({
      id: m.name.replace(/^models\//, ''),
      label: m.displayName || m.name.replace(/^models\//, ''),
    }))
}

function parseJSON(text) {
  const cleaned = text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim()
  return JSON.parse(cleaned)
}

export async function validateUSTicker(ticker, apiKey, model) {
  model = model || 'gemini-2.5-flash'
  const prompt = 'You are a financial data assistant. Validate if "' + ticker + '" is a valid US stock ticker symbol listed on NYSE, NASDAQ, or similar US exchanges.\n'
    + 'If valid, respond with ONLY this JSON (no markdown):\n'
    + '{"valid": true, "ticker": "' + ticker + '", "name": "Company Name"}\n'
    + 'If invalid:\n'
    + '{"valid": false, "ticker": "' + ticker + '", "name": ""}\n'
    + 'Respond with ONLY the JSON object, no explanation.'

  const res = await fetch(`${GEMINI_BASE}/${model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0, maxOutputTokens: 200 },
    }),
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message || 'Gemini API error')

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
  const parsed = parseJSON(text)

  if (!parsed.valid) throw new Error('"' + ticker + '"는 유효하지 않은 티커입니다.')
  return parsed
}

export async function fetchMarketBriefing(apiKey, model) {
  model = model || 'gemini-2.5-flash'
  const now = new Date().toISOString()
  const prompt = 'You are a financial market analyst. Today is ' + now + '.\n\n'
    + 'Use Google Search to get the latest real-time data and write a brief Korean-language market summary for today.\n\n'
    + 'Return ONLY valid JSON with this exact shape (no markdown, no code fences):\n'
    + '{"title":"오늘의 시장 리포트","date":"YYYY-MM-DD","summary":"2-3문장 요약",'
    + '"sections":['
    + '{"label":"코스피","text":"현황 1-2문장"},'
    + '{"label":"코스닥","text":"현황 1-2문장"},'
    + '{"label":"미국 시장","text":"다우/나스닥/S&P500 현황 1-2문장"},'
    + '{"label":"환율/원자재","text":"원달러 환율, 유가 등 1-2문장"},'
    + '{"label":"주요 이슈","text":"오늘 핵심 뉴스 1-2문장"}'
    + ']}'

  const res = await fetch(`${GEMINI_BASE}/${model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 1024 },
      tools: [{ googleSearch: {} }],
    }),
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message || 'Gemini API error')

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}'
  try {
    return parseJSON(text)
  } catch (_) {
    const match = text.match(/\{[\s\S]*\}/)
    if (match) return JSON.parse(match[0])
    throw new Error('시장 리포트 파싱 실패')
  }
}

export async function fetchBriefings(stocks, apiKey, model) {
  model = model || 'gemini-2.5-flash'
  const stockList = stocks.map(s => s.name + ' (' + s.ticker + ', ' + (s.market === 'KR' ? 'Korean' : 'US') + ' market)').join('\n')

  const now = new Date().toISOString()
  const prompt = 'You are a financial data assistant with access to real-time market data. Today is ' + now + '.\n\n'
    + 'For each of the following stocks, provide current market data and a brief news summary:\n'
    + stockList + '\n\n'
    + 'Respond with ONLY a JSON array (no markdown), where each element has:\n'
    + '- ticker: string (exact ticker symbol)\n'
    + '- currentPrice: number (latest price)\n'
    + '- change: number (price change today)\n'
    + '- changeRate: number (percentage change today, e.g. 1.5 for +1.5%)\n'
    + '- currency: string ("KRW" for Korean stocks, "USD" for US stocks)\n'
    + '- briefing: array of 2-3 strings (recent news/analysis bullet points in Korean)\n'
    + '- lastUpdated: string (current time in Korean format, e.g. "2024-01-15 14:30 기준")\n\n'
    + 'IMPORTANT: Use Google Search to get the most recent real-time prices. Respond with ONLY the JSON array.'

  const res = await fetch(`${GEMINI_BASE}/${model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 2048 },
      tools: [{ googleSearch: {} }],
    }),
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message || 'Gemini API error')

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]'

  try {
    const parsed = parseJSON(text)
    if (Array.isArray(parsed)) return parsed
    if (parsed && typeof parsed === 'object') return [parsed]
    return []
  } catch (_) {
    const match = text.match(/\[[\s\S]*\]/)
    if (match) {
      try { return JSON.parse(match[0]) } catch (_) { return [] }
    }
    return []
  }
}
