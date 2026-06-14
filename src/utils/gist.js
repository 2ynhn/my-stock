export const PROFILES = [
  { id: 'husband', label: '남편' },
  { id: 'wife', label: '아내' },
]

function filenameFor(profileId) {
  return `stock-briefing-${profileId}.json`
}

export async function findOrCreateGist(pat, profileId) {
  const filename = filenameFor(profileId)
  const headers = {
    Authorization: `token ${pat}`,
    Accept: 'application/vnd.github+json',
  }

  const res = await fetch('https://api.github.com/gists', { headers })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`GitHub API 인증 실패 (${res.status}): ${err.message || 'PAT 토큰을 확인해주세요. gist 스코프가 필요합니다.'}`)
  }
  const gists = await res.json()
  if (!Array.isArray(gists)) throw new Error('GitHub API 응답 오류: PAT 토큰을 확인해주세요.')

  const existing = gists.find(g => g.files[filename])
  if (existing) return existing.id

  const createRes = await fetch('https://api.github.com/gists', {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      description: `Stock Briefing Data (${profileId})`,
      public: false,
      files: {
        [filename]: {
          content: JSON.stringify({ stocks: [] }, null, 2)
        }
      }
    })
  })
  const created = await createRes.json()
  return created.id
}

export async function loadStocks(pat, gistId, profileId) {
  const filename = filenameFor(profileId)
  const headers = {
    Authorization: `token ${pat}`,
    Accept: 'application/vnd.github+json',
  }
  const res = await fetch(`https://api.github.com/gists/${gistId}`, { headers })
  const gist = await res.json()
  const file = gist.files?.[filename]
  if (!file) return []
  return JSON.parse(file.content).stocks || []
}

export async function saveStocks(pat, gistId, profileId, stocks) {
  const filename = filenameFor(profileId)
  const headers = {
    Authorization: `token ${pat}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
  }
  await fetch(`https://api.github.com/gists/${gistId}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({
      files: {
        [filename]: {
          content: JSON.stringify({ stocks }, null, 2)
        }
      }
    })
  })
}
