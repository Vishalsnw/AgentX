'use client'

import { useState } from 'react'
import { ChevronRight, ChevronDown, File, Folder, FolderOpen } from 'lucide-react'
import { FileNode } from '@/types'

interface FileExplorerProps {
  files: FileNode[]
  onFileSelect: (file: FileNode) => void
  selectedPath?: string
}

interface TreeNodeProps {
  node: FileNode
  onFileSelect: (file: FileNode) => void
  selectedPath?: string
  depth: number
}

function TreeNode({ node, onFileSelect, selectedPath, depth }: TreeNodeProps) {
  const [isOpen, setIsOpen] = useState(depth < 2)
  const isSelected = node.path === selectedPath

  const handleClick = () => {
    if (node.type === 'folder') {
      setIsOpen(!isOpen)
    } else {
      onFileSelect(node)
    }
  }

  const getFileIcon = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase()
    const iconColors: Record<string, string> = {
      'ts': 'text-blue-400',
      'tsx': 'text-blue-400',
      'js': 'text-yellow-400',
      'jsx': 'text-yellow-400',
      'json': 'text-yellow-300',
      'css': 'text-purple-400',
      'html': 'text-orange-400',
      'md': 'text-gray-400',
      'py': 'text-green-400',
    }
    return iconColors[ext || ''] || 'text-gray-400'
  }

  return (
    <div>
      <div
        className={`flex items-center gap-1 px-2 py-1 cursor-pointer hover:bg-gray-700 ${
          isSelected ? 'bg-gray-700' : ''
        }`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={handleClick}
      >
        {node.type === 'folder' ? (
          <>
            {isOpen ? (
              <ChevronDown size={16} className="text-gray-400" />
            ) : (
              <ChevronRight size={16} className="text-gray-400" />
            )}
            {isOpen ? (
              <FolderOpen size={16} className="text-yellow-500" />
            ) : (
              <Folder size={16} className="text-yellow-500" />
            )}
          </>
        ) : (
          <>
            <span className="w-4" />
            <File size={16} className={getFileIcon(node.name)} />
          </>
        )}
        <span className="text-sm truncate">{node.name}</span>
      </div>
      
      {node.type === 'folder' && isOpen && node.children && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              onFileSelect={onFileSelect}
              selectedPath={selectedPath}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function FileExplorer({ files, onFileSelect, selectedPath }: FileExplorerProps) {
  return (
    <div className="w-full md:w-64 bg-sidebar-bg border-r border-gray-700 overflow-y-auto h-full flex flex-col">
      <div className="p-4 text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-800">
        Explorer
      </div>
      <div className="flex-1 overflow-y-auto py-2">
        {files.length === 0 ? (
          <div className="p-8 text-gray-500 text-sm text-center flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center">
              <Folder size={32} className="opacity-20" />
            </div>
            <p>No files loaded.<br />Import a repository to get started.</p>
          </div>
        ) : (
          files.map((file) => (
            <TreeNode
              key={file.path}
              node={file}
              onFileSelect={onFileSelect}
              selectedPath={selectedPath}
              depth={0}
            />
          ))
        )}
      </div>
    </div>
  )
}
