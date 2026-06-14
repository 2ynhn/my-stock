import { useState, useEffect, useRef } from 'react'
import { findOrCreateGist, loadStocks, saveStocks } from '../utils/gist.js'

export default function useStocks(apiKeys) {
  const [stocks, setStocks] = useState([])
  const [gistId, setGistId] = useState(() => localStorage.getItem('gistId') || null)
  const [initialized, setInitialized] = useState(false)
  const [gistError, setGistError] = useState(null)
  const saveTimerRef = useRef(null)

  useEffect(() => {
    if (!apiKeys.githubPat) return

    async function init() {
      try {
        let id = gistId
        if (!id) {
          id = await findOrCreateGist(apiKeys.githubPat)
          localStorage.setItem('gistId', id)
          setGistId(id)
        }
        const loaded = await loadStocks(apiKeys.githubPat, id)
        setStocks(loaded)
      } catch (e) {
        console.error('Failed to init gist:', e)
        setGistError(e.message || 'GitHub Gist 연결 실패')
      } finally {
        setInitialized(true)
      }
    }

    init()
  }, [apiKeys.githubPat])

  const persistStocks = (newStocks, id) => {
    if (!apiKeys.githubPat || !id) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      saveStocks(apiKeys.githubPat, id, newStocks).catch(console.error)
    }, 800)
  }

  const addStock = async (stock) => {
    setStocks(prev => {
      if (prev.find(s => s.ticker === stock.ticker)) return prev
      const next = [...prev, stock]
      persistStocks(next, gistId)
      return next
    })
  }

  const removeStock = async (ticker) => {
    setStocks(prev => {
      const next = prev.filter(s => s.ticker !== ticker)
      persistStocks(next, gistId)
      return next
    })
  }

  return { stocks, addStock, removeStock, gistId, initialized, gistError }
}
