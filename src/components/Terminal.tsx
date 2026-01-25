'use client'

import { useEffect, useRef } from 'react'
import { Terminal as TerminalIcon, ShieldCheck, Send, LogIn, LogOut } from 'lucide-react'
import { useSession, signIn, signOut } from "next-auth/react"

export default function TerminalComponent() {
  const { data: session } = useSession()
  const terminalRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<any>(null)

  useEffect(() => {
    const handlePush = async (e: any) => {
      if (xtermRef.current) {
        xtermRef.current.write('\r\n\x1b[33m[AI Auto-Push]\x1b[0m Starting real GitHub synchronization...\r\n');
        
        try {
          const response = await fetch('/api/github/push', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: e.detail.message,
              files: e.detail.files // Pass the updated files
            })
          });

          const data = await response.json();
          
          if (data.success) {
            xtermRef.current.write('\x1b[32m✓ Changes successfully pushed to GitHub\x1b[0m\r\n');
            xtermRef.current.write(`\x1b[90mCommit: ${data.sha.substring(0, 7)}\x1b[0m\r\n`);
          } else {
            throw new Error(data.error || 'Push failed');
          }
        } catch (err: any) {
          xtermRef.current.write(`\x1b[31m✗ GitHub Push Failed: ${err.message}\x1b[0m\r\n`);
        }
        
        xtermRef.current.write('\x1b[34mrepx2@agent:~/workspace$\x1b[0m ');
      }
    };

    window.addEventListener('ai:push', handlePush);
    return () => window.removeEventListener('ai:push', handlePush);
  }, []);

  useEffect(() => {
    // Only run on client
    if (typeof window === 'undefined' || !terminalRef.current) return

    let isMounted = true

    const initTerminal = async () => {
      // Dynamic imports inside useEffect to avoid SSR issues and type errors
      const { Terminal } = await import('xterm')
      const { FitAddon } = await import('xterm-addon-fit')
      
      // Inject CSS via link tag to avoid build-time module resolution issues with .css files in node_modules
      if (!document.getElementById('xterm-css')) {
        const link = document.createElement('link')
        link.id = 'xterm-css'
        link.rel = 'stylesheet'
        link.href = 'https://cdn.jsdelivr.net/npm/xterm@5.3.0/css/xterm.css'
        document.head.appendChild(link)
      }

      if (!isMounted || !terminalRef.current) return

      const term = new Terminal({
        theme: {
          background: '#1e1e1e',
          foreground: '#cccccc',
        },
        fontFamily: 'Menlo, Monaco, "Courier New", monospace',
        fontSize: 12,
        cursorBlink: true,
      })

      const fitAddon = new FitAddon()
      term.loadAddon(fitAddon)
      term.open(terminalRef.current)
      fitAddon.fit()

      term.writeln('\x1b[1;32mWelcome to AI Code Platform Terminal\x1b[0m')
      if (session) {
        term.writeln(`Logged in as \x1b[1;34m${session.user?.name || session.user?.email}\x1b[0m`)
      }
      term.writeln('Type \x1b[1;34m"push"\x1b[0m to simulate code push or \x1b[1;34m"auth"\x1b[0m for git authentication.')
      term.write('\n\r$ ')

      let command = ''
      term.onData(e => {
        switch (e) {
          case '\r': // Enter
            term.writeln('')
            handleCommand(command, term)
            command = ''
            term.write('\r$ ')
            break
          case '\u007f': // Backspace
            if (command.length > 0) {
              command = command.slice(0, -1)
              term.write('\b \b')
            }
            break
          default:
            if (e >= String.fromCharCode(0x20) && e <= String.fromCharCode(0x7e)) {
              command += e
              term.write(e)
            }
        }
      })

      xtermRef.current = term

      const handleResize = () => {
        fitAddon.fit()
      }
      window.addEventListener('resize', handleResize)

      return () => {
        window.removeEventListener('resize', handleResize)
        term.dispose()
      }
    }

    initTerminal()

    return () => {
      isMounted = false
    }
  }, [])

  const handleCommand = (cmd: string, term: any) => {
    const trimmedCmd = cmd.trim().toLowerCase()
    if (trimmedCmd === 'push') {
      term.writeln('Pushing code to repository...')
      term.writeln('Enumerating objects: 5, done.')
      term.writeln('Counting objects: 100% (5/5), done.')
      term.writeln('Delta compression using up to 8 threads')
      term.writeln('Compressing objects: 100% (3/3), done.')
      term.writeln('Writing objects: 100% (3/3), 324 bytes | 324.00 KiB/s, done.')
      term.writeln('Total 3 (delta 2), reused 0 (delta 0), pack-reused 0')
      term.writeln('\x1b[1;32mTo https://github.com/user/repo.git\x1b[0m')
      term.writeln('   a1b2c3d..e5f6g7h  main -> main')
    } else if (trimmedCmd === 'auth') {
      term.writeln('Starting Git authentication process...')
      term.writeln('\x1b[1;33mPlease enter your credentials in the platform settings.\x1b[0m')
      term.writeln('Git Credential Manager: Ready.')
    } else if (trimmedCmd !== '') {
      term.writeln(`Command not found: ${cmd}`)
    }
  }

  const simulatePush = () => {
    if (xtermRef.current) {
      xtermRef.current.writeln('\r\n$ push')
      handleCommand('push', xtermRef.current)
      xtermRef.current.write('\r$ ')
    }
  }

  const simulateAuth = () => {
    if (xtermRef.current) {
      xtermRef.current.writeln('\r\n$ auth')
      handleCommand('auth', xtermRef.current)
      xtermRef.current.write('\r$ ')
    }
  }

  return (
    <div className="flex-1 md:h-48 bg-[#1e1e1e] border-t border-gray-700 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-sidebar-bg border-b border-gray-700 sticky top-0 z-10">
        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-1">
          <div className="flex items-center gap-2 text-gray-400 flex-shrink-0">
            <TerminalIcon size={16} />
            <span className="text-xs font-bold uppercase tracking-widest">Terminal</span>
          </div>
          <div className="h-4 w-[1px] bg-gray-700 flex-shrink-0" />
          <button 
            onClick={simulatePush}
            className="flex items-center gap-1 text-gray-400 hover:text-white transition-all active:scale-95 flex-shrink-0 text-xs px-2 py-1 hover:bg-gray-800 rounded"
          >
            <Send size={14} />
            <span>Push</span>
          </button>
          <button 
            onClick={simulateAuth}
            className="flex items-center gap-1 text-gray-400 hover:text-white transition-all active:scale-95 flex-shrink-0 text-xs px-2 py-1 hover:bg-gray-800 rounded"
          >
            <ShieldCheck size={14} />
            <span>Auth</span>
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-hidden p-2" ref={terminalRef} />
    </div>
  )
}
