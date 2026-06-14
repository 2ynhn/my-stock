const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

export async function validateUSTicker(ticker, apiKey, model = 'gemini-2.0-flash') {
  const url = `${GEMINI_API_BASE}/${model}:generateContent?key=${apiKey}`
  const prompt = `Is "${ticker.toUpperCase()}" a valid US stock ticker symbol? If yes, respond with JSON: {"valid": true, "name": "Company Name", "ticker": "TICKER"}. If no, respond with JSON: {"valid": false}. Respond with ONLY the JSON, no other text.`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }]
    })
  })
  const data = await res.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}'
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  return JSON.parse(cleaned)
}

export async function fetchBriefings(stocks, apiKey, model = 'gemini-2.0-flash') {
  if (!stocks.length) return []

  const url = `${GEMINI_API_BASE}/${model}:generateContent?key=${apiKey}`

  const stockList = stocks.map(s => `${s.name} (${s.ticker}, ${s.market === 'KR' ? '한국 주식' : '미국 주식'})`).join('\n')

  const prompt = `다음 주식들의 현재 가격, 등락, 최신 뉴스를 검색하여 JSON 배열로 응답해주세요.

주식 목록:
${stockList}

각 주식에 대해 다음 형식으로 응답하세요:
[
  {
    "ticker": "종목코드",
    "currentPrice": 숫자,
    "change": 등락금액(숫자),
    "changeRate": 등락률(숫자, % 기호 없이),
    "currency": "KRW" 또는 "USD",
    "briefing": ["뉴스/분석 포인트 1", "뉴스/분석 포인트 2", "뉴스/분석 포인트 3"],
    "lastUpdated": "업데이트 시간"
  }
]

JSON만 응답하고 다른 텍스트는 포함하지 마세요. 마크다운 코드 블록도 사용하지 마세요.`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      tools: [{ googleSearch: {} }]
    })
  })

  const data = await res.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]'
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

  try {
    return JSON.parse(cleaned)
  } catch {
    const match = cleaned.match(/\[[\s\S]*\]/)
    if (match) return JSON.parse(match[0])
    return []
  }
}
