'use client'

import { useState } from 'react'
import FileExplorer from '@/components/FileExplorer'
import CodeEditor from '@/components/CodeEditor'
import AIChat from '@/components/AIChat'
import Terminal from '@/components/Terminal'
import Header from '@/components/Header'
import ImportModal from '@/components/ImportModal'
import { FileNode, Message } from '@/types'
import { Folder, Code, MessageSquare, Terminal as TerminalIcon } from 'lucide-react'

export default function Home() {
  const [files, setFiles] = useState<FileNode[]>([])
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [logs, setLogs] = useState<string[]>([])
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [repoName, setRepoName] = useState<string>('')
  const [activeTab, setActiveTab] = useState<'explorer' | 'editor' | 'chat' | 'terminal'>('editor')

  const handleFileSelect = (file: FileNode) => {
    if (file.type === 'file') {
      setSelectedFile(file)
      setActiveTab('editor')
    }
  }

  const handleFileContentChange = (content: string) => {
    if (selectedFile) {
      setSelectedFile({ ...selectedFile, content })
      setFiles(updateFileContent(files, selectedFile.path, content))
    }
  }

  const updateFileContent = (nodes: FileNode[], path: string, content: string): FileNode[] => {
    return nodes.map(node => {
      if (node.path === path) {
        return { ...node, content }
      }
      if (node.children) {
        return { ...node, children: updateFileContent(node.children, path, content) }
      }
      return node
    })
  }

  const handleImport = (importedFiles: FileNode[], name: string) => {
    setFiles(importedFiles)
    setRepoName(name)
    setLogs(prev => [...prev, `Successfully imported repository: ${name}`])
    setIsImportModalOpen(false)
    setActiveTab('explorer')
  }

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`])
  }

  return (
    <div className="h-screen flex flex-col bg-editor-bg text-white overflow-hidden">
      <Header 
        isAuthenticated={isAuthenticated}
        setIsAuthenticated={setIsAuthenticated}
        onImport={() => setIsImportModalOpen(true)}
        repoName={repoName}
      />
      
      <main className="flex-1 relative overflow-hidden flex flex-col md:flex-row">
        {/* Mobile Views / Desktop Sidebar */}
        <div className={`
          ${activeTab === 'explorer' ? 'flex' : 'hidden'} 
          md:flex md:w-64 border-r border-gray-700 h-full flex-col
        `}>
          <FileExplorer 
            files={files} 
            onFileSelect={handleFileSelect}
            selectedPath={selectedFile?.path}
          />
        </div>

        <div className={`
          ${activeTab === 'editor' ? 'flex' : 'hidden'} 
          flex-1 flex flex-col h-full
        `}>
          <CodeEditor 
            file={selectedFile}
            onChange={handleFileContentChange}
          />
        </div>

        <div className={`
          ${activeTab === 'chat' ? 'flex' : 'hidden md:flex'} 
          md:w-80 border-l border-gray-700 h-full flex-col
        `}>
          <AIChat 
            messages={messages}
            setMessages={setMessages}
            files={files}
            setFiles={setFiles}
            selectedFile={selectedFile}
            addLog={addLog}
          />
        </div>

        <div className={`
          ${activeTab === 'terminal' ? 'flex' : 'hidden'} 
          md:hidden h-full flex-col
        `}>
          <Terminal />
        </div>
      </main>

      {/* Terminal for Desktop */}
      <div className="hidden md:block">
        <Terminal />
      </div>

      {/* Bottom Navigation for Mobile */}
      <nav className="md:hidden h-16 bg-sidebar-bg border-t border-gray-700 flex items-center justify-around px-2 pb-safe">
        <button 
          onClick={() => setActiveTab('explorer')}
          className={`flex flex-col items-center gap-1 ${activeTab === 'explorer' ? 'text-accent' : 'text-gray-400'}`}
        >
          <Folder size={20} />
          <span className="text-[10px]">Explorer</span>
        </button>
        <button 
          onClick={() => setActiveTab('editor')}
          className={`flex flex-col items-center gap-1 ${activeTab === 'editor' ? 'text-accent' : 'text-gray-400'}`}
        >
          <Code size={20} />
          <span className="text-[10px]">Editor</span>
        </button>
        <button 
          onClick={() => setActiveTab('chat')}
          className={`flex flex-col items-center gap-1 ${activeTab === 'chat' ? 'text-accent' : 'text-gray-400'}`}
        >
          <MessageSquare size={20} />
          <span className="text-[10px]">AI Chat</span>
        </button>
        <button 
          onClick={() => setActiveTab('terminal')}
          className={`flex flex-col items-center gap-1 ${activeTab === 'terminal' ? 'text-accent' : 'text-gray-400'}`}
        >
          <TerminalIcon size={20} />
          <span className="text-[10px]">Terminal</span>
        </button>
      </nav>

      {isImportModalOpen && (
        <ImportModal 
          onClose={() => setIsImportModalOpen(false)}
          onImport={handleImport}
          addLog={addLog}
        />
      )}
    </div>
  )
}
