'use client'

import { useState } from 'react'
import { X, Github, Loader2, AlertCircle } from 'lucide-react'
import { FileNode } from '@/types'

interface ImportModalProps {
  onClose: () => void
  onImport: (files: FileNode[], repoName: string) => void
  addLog: (message: string) => void
}

export default function ImportModal({ onClose, onImport, addLog }: ImportModalProps) {
  const [repoUrl, setRepoUrl] = useState('')
  const [branch, setBranch] = useState('main')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const parseGitHubUrl = (url: string) => {
    const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/i)
    if (match) {
      return { owner: match[1], repo: match[2].replace('.git', '') }
    }
    return null
  }

  const handleImport = async () => {
    setError('')
    const parsed = parseGitHubUrl(repoUrl)
    
    if (!parsed) {
      setError('Invalid GitHub URL. Please use format: https://github.com/owner/repo')
      return
    }

    setIsLoading(true)
    addLog(`Importing repository: ${parsed.owner}/${parsed.repo}`)

    try {
      const response = await fetch('/api/github/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner: parsed.owner,
          repo: parsed.repo,
          branch: branch,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to import repository')
      }

      onImport(data.files, `${parsed.owner}/${parsed.repo}`)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      addLog(`Import failed: ${errorMessage}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-sidebar-bg rounded-lg w-full max-w-md p-6 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Github size={24} />
            <h2 className="text-lg font-semibold">Import GitHub Repository</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-700 rounded"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Repository URL
            </label>
            <input
              type="text"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="https://github.com/username/repository"
              className="w-full bg-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Branch
            </label>
            <input
              type="text"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              placeholder="main"
              className="w-full bg-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm bg-red-900/20 p-3 rounded">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <button
            onClick={handleImport}
            disabled={isLoading || !repoUrl}
            className="w-full py-2 bg-accent hover:bg-blue-600 rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Github size={18} />
                Import Repository
              </>
            )}
          </button>
        </div>

        <p className="text-xs text-gray-500 mt-4 text-center">
          Note: Only public repositories are supported without authentication.
        </p>
      </div>
    </div>
  )
}
