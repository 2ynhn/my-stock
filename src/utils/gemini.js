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

export async function validateUSTicker(ticker, apiKey, model = 'gemini-2.5-flash') {
  const prompt = `You are a financial data assistant. Validate if "${ticker}" is a valid US stock ticker symbol listed on NYSE, NASDAQ, or similar US exchanges.
If valid, respond with ONLY this JSON (no markdown):
{"valid": true, "ticker": "${ticker}", "name": "Company Name"}
If invalid:
{"valid": false, "ticker": "${ticker}", "name": ""}
Respond with ONLY the JSON object, no explanation.`

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

  if (!parsed.valid) throw new Error(`"${ticker}"는 유효하지 않은 티커입니다.`)
  return parsed
}

export async function fetchBriefings(stocks, apiKey, model = 'gemini-2.5-flash') {
  const stockList = stocks.map(s => `${s.name} (${s.ticker}, ${s.market === 'KR' ? 'Korean' : 'US'} market)`).join('\n')

  const now = new Date().toISOString()
  const prompt = `You are a financial data assistant with access to real-time market data. Today is ${now}.

For each of the following stocks, provide current market data and a brief news summary:
${stockList}

Respond with ONLY a JSON array (no markdown), where each element has:
- ticker: string (exact ticker symbol)
- currentPrice: number (latest price)
- change: number (price change today)
- changeRate: number (percentage change today, e.g. 1.5 for +1.5%)
- currency: string ("KRW" for Korean stocks, "USD" for US stocks)
- briefing: array of 2-3 strings (recent news/analysis bullet points in Korean)
- lastUpdated: string (current time in Korean format, e.g. "2024-01-15 14:30 기준")

IMPORTANT: Use Google Search to get the most recent real-time prices. Respond with ONLY the JSON array.`

  const requestBody = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.1, maxOutputTokens: 2048 },
    tools: [{ googleSearch: {} }],
  }

  const res = await fetch(`${GEMINI_BASE}/${model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message || 'Gemini API error')

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]'

  try {
    const parsed = parseJSON(text)
    if (Array.isArray(parsed)) return parsed
    if (parsed && typeof parsed === 'object') return [parsed]
    return []
  } catch {
    const match = text.match(/\[[\s\S]*\]/)
    if (match) {
      try {
        return JSON.parse(match[0])
      } catch {
        return []
      }
    }
    return []
  }
}
