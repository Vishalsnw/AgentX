import { NextRequest, NextResponse } from 'next/server'
import { FileNode } from '@/types'

interface ImportRequest {
  owner: string
  repo: string
  branch: string
}

interface GitHubTreeItem {
  path: string
  mode: string
  type: 'blob' | 'tree'
  sha: string
  size?: number
  url: string
}

const IGNORED_PATHS = [
  'node_modules',
  '.git',
  '.next',
  'dist',
  'build',
  '.cache',
  'coverage',
  '.nyc_output',
]

const MAX_FILE_SIZE = 100000

function shouldIgnore(path: string): boolean {
  return IGNORED_PATHS.some(ignored => 
    path.startsWith(ignored + '/') || path === ignored
  )
}

function buildFileTree(items: GitHubTreeItem[]): FileNode[] {
  const root: FileNode[] = []
  const pathMap = new Map<string, FileNode>()

  const sortedItems = [...items].sort((a, b) => a.path.localeCompare(b.path))

  for (const item of sortedItems) {
    if (shouldIgnore(item.path)) continue

    const parts = item.path.split('/')
    const name = parts[parts.length - 1]
    
    const node: FileNode = {
      name,
      path: item.path,
      type: item.type === 'tree' ? 'folder' : 'file',
      children: item.type === 'tree' ? [] : undefined,
    }

    pathMap.set(item.path, node)

    if (parts.length === 1) {
      root.push(node)
    } else {
      const parentPath = parts.slice(0, -1).join('/')
      const parent = pathMap.get(parentPath)
      if (parent && parent.children) {
        parent.children.push(node)
      }
    }
  }

  return root
}

async function fetchFileContent(owner: string, repo: string, path: string, branch: string): Promise<string> {
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`
  const response = await fetch(url)
  
  if (!response.ok) {
    throw new Error(`Failed to fetch file: ${path}`)
  }
  
  return response.text()
}

async function enrichFilesWithContent(
  files: FileNode[],
  owner: string,
  repo: string,
  branch: string
): Promise<FileNode[]> {
  const enrichFile = async (node: FileNode): Promise<FileNode> => {
    if (node.type === 'file') {
      try {
        const content = await fetchFileContent(owner, repo, node.path, branch)
        return { ...node, content }
      } catch (error) {
        return { ...node, content: `// Error loading file: ${error}` }
      }
    }
    
    if (node.children) {
      const enrichedChildren = await Promise.all(
        node.children.map(child => enrichFile(child))
      )
      return { ...node, children: enrichedChildren }
    }
    
    return node
  }

  return Promise.all(files.map(file => enrichFile(file)))
}

export async function POST(request: NextRequest) {
  try {
    const body: ImportRequest = await request.json()
    const { owner, repo, branch = 'main' } = body

    if (!owner || !repo) {
      return NextResponse.json(
        { error: 'Owner and repo are required' },
        { status: 400 }
      )
    }

    const treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`
    
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'AI-Code-Platform',
    }

    const token = process.env.GITHUB_TOKEN
    if (token) {
      headers['Authorization'] = `token ${token}`
    }

    const response = await fetch(treeUrl, { headers })

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: 'Repository not found. Make sure it exists and is public.' },
          { status: 404 }
        )
      }
      throw new Error(`GitHub API error: ${response.status}`)
    }

    const data = await response.json()
    
    if (!data.tree) {
      throw new Error('Invalid response from GitHub API')
    }

    const filteredItems = data.tree.filter((item: GitHubTreeItem) => {
      if (shouldIgnore(item.path)) return false
      if (item.type === 'blob' && item.size && item.size > MAX_FILE_SIZE) return false
      return true
    })

    const fileTree = buildFileTree(filteredItems)
    const enrichedFiles = await enrichFilesWithContent(fileTree, owner, repo, branch)

    return NextResponse.json({
      success: true,
      files: enrichedFiles,
      repoInfo: {
        owner,
        repo,
        branch,
      },
    })

  } catch (error) {
    console.error('GitHub import error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to import repository' },
      { status: 500 }
    )
  }
}
