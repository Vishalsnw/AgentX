'use client'

import { useState, useEffect } from 'react'
import { X, Github, Loader2, AlertCircle, Search } from 'lucide-react'
import { FileNode } from '@/types'
import { useSession } from 'next-auth/react'

interface ImportModalProps {
  onClose: () => void
  onImport: (files: FileNode[], repoName: string) => void
  addLog: (message: string) => void
}

export default function ImportModal({ onClose, onImport, addLog }: ImportModalProps) {
  const { data: session } = useSession()
  const [repos, setRepos] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoadingRepos, setIsLoadingRepos] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (session) {
      fetchRepos()
    }
  }, [session])

  const fetchRepos = async () => {
    setIsLoadingRepos(true)
    setError('')
    try {
      const response = await fetch('/api/github/repos')
      if (!response.ok) throw new Error('Failed to fetch repositories')
      const data = await response.json()
      setRepos(data)
    } catch (err) {
      setError('Could not load repositories. Make sure you are logged in.')
    } finally {
      setIsLoadingRepos(false)
    }
  }

  const handleImportRepo = async (repo: any) => {
    setError('')
    setIsImporting(true)
    addLog(`Importing repository: ${repo.full_name}`)

    try {
      const response = await fetch('/api/github/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner: repo.full_name.split('/')[0],
          repo: repo.name,
          branch: repo.default_branch,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to import repository')
      }

      onImport(data.files, repo.full_name)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      addLog(`Import failed: ${errorMessage}`)
    } finally {
      setIsImporting(false)
    }
  }

  const filteredRepos = repos.filter(repo => 
    repo.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-sidebar-bg rounded-2xl w-full max-w-xl max-h-[80vh] flex flex-col shadow-2xl border border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-700 flex items-center justify-between bg-sidebar-bg/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent/20 rounded-xl flex items-center justify-center">
              <Github size={24} className="text-accent" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Import Repository</h2>
              <p className="text-xs text-gray-400 mt-0.5">Select a repository from your GitHub account</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-700 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col p-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search your repositories..."
              className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all"
            />
          </div>

          {error && (
            <div className="flex items-center gap-3 text-red-400 text-sm bg-red-900/20 p-4 rounded-xl border border-red-900/30">
              <AlertCircle size={18} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-2">
            {isLoadingRepos ? (
              <div className="flex flex-col items-center justify-center h-40 gap-3">
                <Loader2 size={32} className="animate-spin text-accent" />
                <p className="text-sm text-gray-400">Loading repositories...</p>
              </div>
            ) : !session ? (
              <div className="flex flex-col items-center justify-center h-40 text-center space-y-4">
                <Github size={40} className="text-gray-600" />
                <p className="text-sm text-gray-400">Please login with GitHub in the terminal to view your repositories.</p>
              </div>
            ) : filteredRepos.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-center">
                <p className="text-sm text-gray-400">No repositories found matching "{searchQuery}"</p>
              </div>
            ) : (
              filteredRepos.map((repo) => (
                <button
                  key={repo.id}
                  onClick={() => handleImportRepo(repo)}
                  disabled={isImporting}
                  className="w-full group flex items-center justify-between p-4 bg-gray-800/40 hover:bg-accent/10 border border-gray-700/50 hover:border-accent/30 rounded-xl transition-all text-left active:scale-[0.98]"
                >
                  <div className="flex-1 min-w-0 pr-4">
                    <h3 className="font-semibold text-sm group-hover:text-accent transition-colors truncate">
                      {repo.full_name}
                    </h3>
                    {repo.description && (
                      <p className="text-xs text-gray-500 mt-1 truncate">{repo.description}</p>
                    )}
                  </div>
                  <div className="flex-shrink-0">
                    {isImporting ? (
                      <Loader2 size={16} className="animate-spin text-accent" />
                    ) : (
                      <div className="bg-gray-700 group-hover:bg-accent group-hover:text-white px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors">
                        Import
                      </div>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
