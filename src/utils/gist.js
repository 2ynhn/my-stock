const GIST_FILENAME = 'stock-briefing-data.json'

export async function findOrCreateGist(pat) {
  const headers = {
    Authorization: `token ${pat}`,
    Accept: 'application/vnd.github+json',
  }

  const res = await fetch('https://api.github.com/gists', { headers })
  const gists = await res.json()

  const existing = gists.find(g => g.files[GIST_FILENAME])
  if (existing) return existing.id

  const createRes = await fetch('https://api.github.com/gists', {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      description: 'Stock Briefing Data',
      public: false,
      files: {
        [GIST_FILENAME]: {
          content: JSON.stringify({ stocks: [] }, null, 2)
        }
      }
    })
  })
  const created = await createRes.json()
  return created.id
}

export async function loadStocks(pat, gistId) {
  const headers = {
    Authorization: `token ${pat}`,
    Accept: 'application/vnd.github+json',
  }
  const res = await fetch(`https://api.github.com/gists/${gistId}`, { headers })
  const gist = await res.json()
  const content = gist.files[GIST_FILENAME].content
  return JSON.parse(content).stocks || []
}

export async function saveStocks(pat, gistId, stocks) {
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
        [GIST_FILENAME]: {
          content: JSON.stringify({ stocks }, null, 2)
        }
      }
    })
  })
}
