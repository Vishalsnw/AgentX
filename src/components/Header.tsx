'use client'

import { GitBranch, Github, Upload, Rocket, LogOut, LogIn } from 'lucide-react'

interface HeaderProps {
  isAuthenticated: boolean
  setIsAuthenticated: (value: boolean) => void
  onImport: () => void
  repoName: string
}

export default function Header({ isAuthenticated, setIsAuthenticated, onImport, repoName }: HeaderProps) {
  const handleAuth = async () => {
    if (isAuthenticated) {
      setIsAuthenticated(false)
    } else {
      setIsAuthenticated(true)
    }
  }

  return (
    <header className="h-12 bg-sidebar-bg border-b border-gray-700 flex items-center justify-between px-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-accent rounded flex items-center justify-center">
            <span className="text-white font-bold text-sm">AI</span>
          </div>
          <span className="font-semibold text-lg">Code Platform</span>
        </div>
        
        {repoName && (
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <GitBranch size={16} />
            <span>{repoName}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onImport}
          className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors"
        >
          <Upload size={16} />
          Import Repo
        </button>

        <button
          className="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-500 rounded text-sm transition-colors"
          title="Deploy to Vercel"
        >
          <Rocket size={16} />
          Deploy
        </button>

        <button
          onClick={handleAuth}
          className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors"
        >
          {isAuthenticated ? (
            <>
              <LogOut size={16} />
              Logout
            </>
          ) : (
            <>
              <Github size={16} />
              Login with GitHub
            </>
          )}
        </button>
      </div>
    </header>
  )
}
