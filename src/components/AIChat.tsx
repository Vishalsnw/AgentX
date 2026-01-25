'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Check, X, Loader2 } from 'lucide-react'
import { Message, FileNode, CodeChange } from '@/types'

interface AIChatProps {
  messages: Message[]
  setMessages: (messages: Message[]) => void
  files: FileNode[]
  setFiles: (files: FileNode[]) => void
  selectedFile: FileNode | null
  addLog: (message: string) => void
}

export default function AIChat({ messages, setMessages, files, setFiles, selectedFile, addLog }: AIChatProps) {
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    }

    setMessages([...messages, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input,
          files: files,
          currentFile: selectedFile?.path,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get AI response')
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
        codeChanges: data.codeChanges,
      }

      setMessages([...messages, userMessage, assistantMessage])
      addLog('AI response received')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      addLog(`Error: ${errorMessage}`)
      
      const errorResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Sorry, I encountered an error: ${errorMessage}. Please try again.`,
        timestamp: new Date(),
      }
      setMessages([...messages, userMessage, errorResponse])
    } finally {
      setIsLoading(false)
    }
  }

  const applyCodeChange = (messageId: string, change: CodeChange) => {
    let updatedFiles = [...files];
    
    if (change.action === 'modify' || change.action === 'create') {
      const fileExists = findFileInTree(files, change.filePath);
      
      if (fileExists) {
        updatedFiles = updateFileInTree(files, change.filePath, change.newContent || '');
        addLog(`Modified ${change.filePath}`);
      } else {
        const pathParts = change.filePath.split('/');
        const fileName = pathParts.pop() || change.filePath;
        
        const newFile: FileNode = {
          name: fileName,
          type: 'file',
          path: change.filePath,
          content: change.newContent || ''
        };
        
        updatedFiles = [...files, newFile];
        addLog(`Created ${change.filePath}`);
      }
      
      setFiles(updatedFiles);
      
      // Trigger auto-push if terminal exists
      window.dispatchEvent(new CustomEvent('ai:push', { 
        detail: { message: `AI: ${change.action === 'create' ? 'Created' : 'Modified'} ${change.filePath}` } 
      }));
    }

    setMessages(messages.map(msg => {
      if (msg.id === messageId && msg.codeChanges) {
        return {
          ...msg,
          codeChanges: msg.codeChanges.map(c => 
            c.filePath === change.filePath ? { ...c, applied: true } : c
          ),
        }
      }
      return msg
    }))
  }

  const findFileInTree = (nodes: FileNode[], path: string): FileNode | null => {
    for (const node of nodes) {
      if (node.path === path) return node;
      if (node.children) {
        const found = findFileInTree(node.children, path);
        if (found) return found;
      }
    }
    return null;
  }

  const updateFileInTree = (nodes: FileNode[], path: string, content: string): FileNode[] => {
    return nodes.map(node => {
      if (node.path === path) {
        return { ...node, content }
      }
      if (node.children) {
        return { ...node, children: updateFileInTree(node.children, path, content) }
      }
      return node
    })
  }

  return (
    <div className="w-full md:w-80 bg-sidebar-bg border-l border-gray-700 flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-gray-700 bg-sidebar-bg/95 backdrop-blur-md z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-accent/20 rounded-lg flex items-center justify-center">
            <Bot size={20} className="text-accent" />
          </div>
          <span className="font-bold text-sm">AI Assistant</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth">
        {messages.length === 0 ? (
          <div className="text-gray-500 text-sm text-center mt-8">
            <Bot size={32} className="mx-auto mb-3 opacity-50" />
            <p>Ask me to help with your code!</p>
            <p className="mt-2 text-xs">I can modify, create, or explain code.</p>
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}>
              {message.role === 'assistant' && (
                <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
                  <Bot size={14} />
                </div>
              )}
              
              <div className={`max-w-[85%] ${message.role === 'user' ? 'order-first' : ''}`}>
                <div className={`rounded-lg p-3 text-sm ${
                  message.role === 'user' 
                    ? 'bg-accent text-white' 
                    : 'bg-gray-700'
                }`}>
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
                
                {message.codeChanges && message.codeChanges.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {message.codeChanges.map((change, idx) => (
                      <div key={idx} className="bg-gray-800 rounded p-2 text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-gray-400 truncate max-w-[150px]" title={change.filePath}>
                            {change.filePath}
                          </span>
                          {!change.applied ? (
                            <div className="flex gap-1">
                              <button
                                onClick={() => applyCodeChange(message.id, change)}
                                className="p-1 hover:bg-green-600 rounded"
                                title="Apply changes"
                              >
                                <Check size={14} className="text-green-400" />
                              </button>
                              <button
                                className="p-1 hover:bg-red-600 rounded"
                                title="Reject changes"
                              >
                                <X size={14} className="text-red-400" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-green-400 text-xs">Applied</span>
                          )}
                        </div>
                        <span className="text-blue-400">{change.action}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {message.role === 'user' && (
                <div className="w-7 h-7 rounded-full bg-gray-600 flex items-center justify-center flex-shrink-0">
                  <User size={14} />
                </div>
              )}
            </div>
          ))
        )}
        
        {isLoading && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
              <Loader2 size={14} className="animate-spin" />
            </div>
            <div className="bg-gray-700 rounded-lg p-3 text-sm">
              <p className="text-gray-400">Thinking...</p>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 border-t border-gray-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Ask AI to help with code..."
            className="flex-1 bg-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            className="p-2 bg-accent hover:bg-blue-600 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}
