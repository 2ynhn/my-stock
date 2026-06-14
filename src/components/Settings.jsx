import React, { useState, useEffect } from 'react'
import { X } from 'lucide-react'

export default function Settings({ isOpen, onSave, onClose }) {
  const [githubPat, setGithubPat] = useState('')
  const [geminiApiKey, setGeminiApiKey] = useState('')
  const [geminiModel, setGeminiModel] = useState('gemini-2.0-flash')

  useEffect(() => {
    if (isOpen) {
      setGithubPat(localStorage.getItem('githubPat') || '')
      setGeminiApiKey(localStorage.getItem('geminiApiKey') || '')
      setGeminiModel(localStorage.getItem('geminiModel') || 'gemini-2.0-flash')
    }
  }, [isOpen])

  const handleSave = () => {
    localStorage.setItem('githubPat', githubPat)
    localStorage.setItem('geminiApiKey', geminiApiKey)
    localStorage.setItem('geminiModel', geminiModel)
    onSave()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">API 키 설정</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              GitHub Personal Access Token
            </label>
            <input
              type="password"
              value={githubPat}
              onChange={e => setGithubPat(e.target.value)}
              placeholder="ghp_xxxxxxxxxxxx"
              className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 text-sm border border-slate-600 focus:outline-none focus:border-blue-500"
            />
            <p className="text-xs text-slate-400 mt-1">Gist 읽기/쓰기 권한 필요</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Gemini API Key
            </label>
            <input
              type="password"
              value={geminiApiKey}
              onChange={e => setGeminiApiKey(e.target.value)}
              placeholder="AIzaxxxxxxxxxxxxxxxx"
              className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 text-sm border border-slate-600 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Gemini 모델
            </label>
            <select
              value={geminiModel}
              onChange={e => setGeminiModel(e.target.value)}
              className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 text-sm border border-slate-600 focus:outline-none focus:border-blue-500"
            >
              <option value="gemini-2.0-flash">gemini-2.0-flash (기본)</option>
              <option value="gemini-1.5-pro">gemini-1.5-pro</option>
            </select>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors text-sm"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors text-sm font-medium"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  )
}
