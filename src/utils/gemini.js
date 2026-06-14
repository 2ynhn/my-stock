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

// 응답의 모든 파트 텍스트를 합친다 (grounding 사용 시 여러 파트로 나뉠 수 있음)
function collectText(data) {
  const parts = data.candidates?.[0]?.content?.parts || []
  return parts.map(p => p.text || '').join('')
}

// 텍스트에서 첫 번째 균형 잡힌 JSON 객체/배열을 추출.
// 응답이 잘려서(truncated) 닫는 괄호가 없으면, 가능한 데까지 복구한다.
function extractJSON(text, open, close) {
  const start = text.indexOf(open)
  if (start === -1) return null
  let depth = 0
  let inStr = false
  let esc = false
  // 마지막으로 완전하게 닫힌 위치 추적용
  let lastCompleteEnd = -1
  for (let i = start; i < text.length; i++) {
    const ch = text[i]
    if (inStr) {
      if (esc) esc = false
      else if (ch === '\\') esc = true
      else if (ch === '"') inStr = false
    } else {
      if (ch === '"') inStr = true
      else if (ch === open) depth++
      else if (ch === close) {
        depth--
        if (depth === 0) return text.slice(start, i + 1)
      }
    }
  }
  // 여기까지 왔다면 잘린 것 — 복구 시도
  return repairTruncatedJSON(text.slice(start), open, close)
}

// 잘린 JSON 복구: 마지막 완전한 항목까지만 살리고 괄호를 닫는다
function repairTruncatedJSON(frag, open, close) {
  let depth = 0
  let inStr = false
  let esc = false
  let lastSafe = -1 // 최상위 항목 경계(쉼표/닫는괄호) 위치
  const closers = []
  for (let i = 0; i < frag.length; i++) {
    const ch = frag[i]
    if (inStr) {
      if (esc) esc = false
      else if (ch === '\\') esc = true
      else if (ch === '"') inStr = false
      continue
    }
    if (ch === '"') { inStr = true; continue }
    if (ch === '{' || ch === '[') { depth++; closers.push(ch === '{' ? '}' : ']') }
    else if (ch === '}' || ch === ']') { depth--; closers.pop() }
    // 최상위 컨테이너(depth===1) 안에서 항목 하나가 끝나는 지점
    if (depth === 1 && (ch === ',' || ch === '}' || ch === ']')) lastSafe = i
  }
  if (lastSafe === -1) return null
  // lastSafe 까지 자르고(쉼표면 제외), 열린 괄호들을 역순으로 닫는다
  let body = frag.slice(0, frag[lastSafe] === ',' ? lastSafe : lastSafe + 1)
  // body 기준으로 다시 열린 깊이 계산
  let d = 0, s = false, e = false
  for (let i = 0; i < body.length; i++) {
    const ch = body[i]
    if (s) { if (e) e = false; else if (ch === '\\') e = true; else if (ch === '"') s = false; continue }
    if (ch === '"') s = true
    else if (ch === '{' || ch === '[') d++
    else if (ch === '}' || ch === ']') d--
  }
  // 남은 깊이만큼 적절한 닫는 괄호 추가 (open 종류에 맞춰)
  const closeChar = open === '[' ? ']' : '}'
  while (d-- > 0) body += closeChar
  return body
}

// 네트워크/일시적 오류에 대비한 재시도 래퍼
async function callGeminiWithRetry(url, payload, retries = 2) {
  let lastErr
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || 'Gemini API error')
      return data
    } catch (e) {
      lastErr = e
      if (attempt < retries) await new Promise(r => setTimeout(r, 800 * (attempt + 1)))
    }
  }
  throw lastErr
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

  const data = await callGeminiWithRetry(`${GEMINI_BASE}/${model}:generateContent?key=${apiKey}`, {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.2, maxOutputTokens: 4096 },
    tools: [{ googleSearch: {} }],
  })

  const text = collectText(data)
  if (!text.trim()) throw new Error('시장 리포트 응답이 비어 있습니다.')
  try {
    return parseJSON(text)
  } catch (_) {
    const json = extractJSON(text, '{', '}')
    if (json) {
      try { return JSON.parse(json) } catch (_) { /* fall through */ }
    }
    throw new Error('시장 리포트 파싱 실패: ' + text.slice(0, 200))
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

  const data = await callGeminiWithRetry(`${GEMINI_BASE}/${model}:generateContent?key=${apiKey}`, {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.1, maxOutputTokens: 4096 },
    tools: [{ googleSearch: {} }],
  })

  const text = collectText(data) || '[]'

  try {
    const parsed = parseJSON(text)
    if (Array.isArray(parsed)) return parsed
    if (parsed && typeof parsed === 'object') return [parsed]
    return []
  } catch (_) {
    const json = extractJSON(text, '[', ']')
    if (json) {
      try { return JSON.parse(json) } catch (_) { return [] }
    }
    return []
  }
}
