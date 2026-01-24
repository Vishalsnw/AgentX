'use client'

import { useState } from 'react'
import FileExplorer from '@/components/FileExplorer'
import CodeEditor from '@/components/CodeEditor'
import AIChat from '@/components/AIChat'
import Console from '@/components/Console'
import Terminal from '@/components/Terminal'
import Header from '@/components/Header'
import ImportModal from '@/components/ImportModal'
import { FileNode, Message } from '@/types'

export default function Home() {
  const [files, setFiles] = useState<FileNode[]>([])
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [logs, setLogs] = useState<string[]>([])
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [repoName, setRepoName] = useState<string>('')

  const handleFileSelect = (file: FileNode) => {
    if (file.type === 'file') {
      setSelectedFile(file)
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
  }

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`])
  }

  return (
    <div className="h-screen flex flex-col bg-editor-bg text-white">
      <Header 
        isAuthenticated={isAuthenticated}
        setIsAuthenticated={setIsAuthenticated}
        onImport={() => setIsImportModalOpen(true)}
        repoName={repoName}
      />
      
      <div className="flex-1 flex overflow-hidden">
        <FileExplorer 
          files={files} 
          onFileSelect={handleFileSelect}
          selectedPath={selectedFile?.path}
        />
        
        <div className="flex-1 flex flex-col">
          <div className="flex-1 flex overflow-hidden">
            <CodeEditor 
              file={selectedFile}
              onChange={handleFileContentChange}
            />
            
            <AIChat 
              messages={messages}
              setMessages={setMessages}
              files={files}
              setFiles={setFiles}
              selectedFile={selectedFile}
              addLog={addLog}
            />
          </div>
          
          <Console logs={logs} />
          <Terminal />
        </div>
      </div>

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
