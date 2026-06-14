import { useState, useEffect, useRef } from 'react'
import { findOrCreateGist, loadStocks, saveStocks } from '../utils/gist.js'

export default function useStocks(apiKeys) {
  const [stocks, setStocks] = useState([])
  const [gistId, setGistId] = useState(() => localStorage.getItem('gistId') || null)
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
        console.error('Gist init error:', e)
      }
    }

    init()
  }, [apiKeys.githubPat])

  const persist = (updatedStocks, id) => {
    if (!apiKeys.githubPat || !id) return
    clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      saveStocks(apiKeys.githubPat, id, updatedStocks).catch(console.error)
    }, 500)
  }

  const addStock = async (stock) => {
    setStocks(prev => {
      if (prev.find(s => s.ticker === stock.ticker)) return prev
      const next = [...prev, stock]
      persist(next, gistId)
      return next
    })
  }

  const removeStock = async (ticker) => {
    setStocks(prev => {
      const next = prev.filter(s => s.ticker !== ticker)
      persist(next, gistId)
      return next
    })
  }

  return { stocks, addStock, removeStock, gistId }
}
