'use client'

import { useCallback } from 'react'
import Editor from '@monaco-editor/react'
import { FileNode } from '@/types'
import { FileCode } from 'lucide-react'

interface CodeEditorProps {
  file: FileNode | null
  onChange: (content: string) => void
}

export default function CodeEditor({ file, onChange }: CodeEditorProps) {
  const getLanguage = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase()
    const languageMap: Record<string, string> = {
      'ts': 'typescript',
      'tsx': 'typescript',
      'js': 'javascript',
      'jsx': 'javascript',
      'json': 'json',
      'css': 'css',
      'html': 'html',
      'md': 'markdown',
      'py': 'python',
      'yaml': 'yaml',
      'yml': 'yaml',
      'sh': 'shell',
      'bash': 'shell',
    }
    return languageMap[ext || ''] || 'plaintext'
  }

  const handleChange = useCallback((value: string | undefined) => {
    if (value !== undefined) {
      onChange(value)
    }
  }, [onChange])

  if (!file) {
    return (
      <div className="flex-1 bg-editor-bg flex items-center justify-center">
        <div className="text-center text-gray-500">
          <FileCode size={48} className="mx-auto mb-4 opacity-50" />
          <p>Select a file to start editing</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="h-9 bg-sidebar-bg border-b border-gray-700 flex items-center px-4">
        <span className="text-sm text-gray-300">{file.path}</span>
      </div>
      <div className="flex-1">
        <Editor
          height="100%"
          language={getLanguage(file.name)}
          value={file.content || ''}
          onChange={handleChange}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            wordWrap: 'on',
          }}
        />
      </div>
    </div>
  )
}
