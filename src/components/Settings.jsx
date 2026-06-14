import React, { useState } from 'react'
import { X, RefreshCw } from 'lucide-react'
import { listModels } from '../utils/gemini.js'

const FALLBACK_MODELS = [
  { id: 'gemini-2.5-flash', label: 'gemini-2.5-flash (기본, 빠름)' },
  { id: 'gemini-2.5-pro', label: 'gemini-2.5-pro (고품질)' },
]

export default function Settings({ initialKeys, onSave, onCancel }) {
  const [githubPat, setGithubPat] = useState(initialKeys.githubPat || '')
  const [geminiApiKey, setGeminiApiKey] = useState(initialKeys.geminiApiKey || '')
  const [geminiModel, setGeminiModel] = useState(initialKeys.geminiModel || 'gemini-2.5-flash')
  const [models, setModels] = useState(FALLBACK_MODELS)
  const [loadingModels, setLoadingModels] = useState(false)
  const [modelError, setModelError] = useState(null)

  const handleLoadModels = async () => {
    if (!geminiApiKey) {
      setModelError('먼저 Gemini API 키를 입력해주세요.')
      return
    }
    setModelError(null)
    setLoadingModels(true)
    try {
      const list = await listModels(geminiApiKey)
      if (list.length > 0) {
        setModels(list)
        if (!list.find(m => m.id === geminiModel)) {
          setGeminiModel(list[0].id)
        }
      } else {
        setModelError('사용 가능한 모델이 없습니다.')
      }
    } catch (e) {
      setModelError(e.message || '모델 목록을 불러오지 못했습니다.')
    } finally {
      setLoadingModels(false)
    }
  }

  const handleSave = () => {
    localStorage.setItem('githubPat', githubPat)
    localStorage.setItem('geminiApiKey', geminiApiKey)
    localStorage.setItem('geminiModel', geminiModel)
    onSave({ githubPat, geminiApiKey, geminiModel })
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white">⚙️ 설정</h2>
          <button onClick={onCancel} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              GitHub Personal Access Token
            </label>
            <input
              type="password"
              value={githubPat}
              onChange={e => setGithubPat(e.target.value)}
              placeholder="ghp_..."
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-slate-500 mt-1">Gist 읽기/쓰기 권한이 필요합니다.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Gemini API Key
            </label>
            <input
              type="password"
              value={geminiApiKey}
              onChange={e => setGeminiApiKey(e.target.value)}
              placeholder="AIza..."
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-slate-300">
                Gemini 모델
              </label>
              <button
                onClick={handleLoadModels}
                disabled={loadingModels}
                className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 disabled:text-slate-500 transition-colors"
              >
                <RefreshCw className={`w-3 h-3 ${loadingModels ? 'animate-spin' : ''}`} />
                사용 가능한 모델 불러오기
              </button>
            </div>
            <select
              value={geminiModel}
              onChange={e => setGeminiModel(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {models.map(m => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
            {modelError && <p className="text-red-400 text-xs mt-1">{modelError}</p>}
          </div>
        </div>

        <div className="flex gap-3 mt-7">
          <button
            onClick={onCancel}
            className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  )
}
