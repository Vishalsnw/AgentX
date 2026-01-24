'use client'

import { Terminal, Trash2 } from 'lucide-react'

interface ConsoleProps {
  logs: string[]
}

export default function Console({ logs }: ConsoleProps) {
  return (
    <div className="h-32 bg-panel-bg border-t border-gray-700 flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 bg-sidebar-bg border-b border-gray-700">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Terminal size={16} />
          <span>Console</span>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-3 font-mono text-xs">
        {logs.length === 0 ? (
          <span className="text-gray-600">No logs yet...</span>
        ) : (
          logs.map((log, index) => (
            <div key={index} className="text-gray-300 py-0.5">
              {log}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
