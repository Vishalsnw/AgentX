export interface FileNode {
  name: string
  path: string
  type: 'file' | 'folder'
  content?: string
  children?: FileNode[]
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  codeChanges?: CodeChange[]
}

export interface CodeChange {
  filePath: string
  action: 'create' | 'modify' | 'delete'
  originalContent?: string
  newContent?: string
  applied?: boolean
}

export interface GitHubRepo {
  owner: string
  repo: string
  branch: string
}

export interface APIResponse<T> {
  success: boolean
  data?: T
  error?: string
}
