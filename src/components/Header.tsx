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
    <header className="h-14 bg-sidebar-bg border-b border-gray-700 flex items-center justify-between px-4 sticky top-0 z-50">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center shadow-lg shadow-accent/20">
            <span className="text-white font-bold text-sm">AI</span>
          </div>
          <span className="font-semibold text-base md:text-lg hidden xs:inline">Code Platform</span>
        </div>
        
        {repoName && (
          <div className="flex items-center gap-2 text-gray-400 text-xs md:text-sm bg-gray-800/50 px-2 py-1 rounded border border-gray-700">
            <GitBranch size={14} />
            <span className="truncate max-w-[80px] md:max-w-[200px]">{repoName}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onImport}
          className="p-2 md:px-3 md:py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-all active:scale-95"
          title="Import Repo"
        >
          <Upload size={18} className="md:mr-2 inline" />
          <span className="hidden md:inline">Import</span>
        </button>

        <button
          className="p-2 md:px-3 md:py-1.5 bg-green-600 hover:bg-green-500 rounded-lg text-sm transition-all active:scale-95 shadow-lg shadow-green-900/20"
          title="Deploy"
        >
          <Rocket size={18} className="md:mr-2 inline" />
          <span className="hidden md:inline">Deploy</span>
        </button>

        <button
          onClick={handleAuth}
          className="p-2 md:px-3 md:py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-all active:scale-95 border border-gray-700"
          title={isAuthenticated ? 'Logout' : 'Login with GitHub'}
        >
          {isAuthenticated ? (
            <>
              <LogOut size={18} className="md:mr-2 inline" />
              <span className="hidden md:inline">Logout</span>
            </>
          ) : (
            <>
              <Github size={18} className="md:mr-2 inline" />
              <span className="hidden md:inline">Login</span>
            </>
          )}
        </button>
      </div>
    </header>
  )
}
