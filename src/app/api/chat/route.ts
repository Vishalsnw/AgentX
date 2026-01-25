import { NextRequest, NextResponse } from 'next/server'
import { FileNode, CodeChange } from '@/types'

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions'

interface ChatRequest {
  message: string
  files: FileNode[]
  currentFile?: string
}

function buildFileContext(files: FileNode[], currentFile?: string): string {
  const flatFiles: { path: string; content: string }[] = []
  
  function flatten(nodes: FileNode[]) {
    for (const node of nodes) {
      if (node.type === 'file' && node.content) {
        flatFiles.push({ path: node.path, content: node.content })
      }
      if (node.children) {
        flatten(node.children)
      }
    }
  }
  
  flatten(files)
  
  const relevantFiles = currentFile 
    ? flatFiles.filter(f => f.path === currentFile || f.path.includes(currentFile.split('/')[0]))
    : flatFiles.slice(0, 10)
  
  return relevantFiles.map(f => `=== ${f.path} ===\n${f.content}`).join('\n\n')
}

function parseCodeChanges(response: string): CodeChange[] {
  const changes: CodeChange[] = []
  
  // Support both modify and create actions
  const fileBlockRegex = /```(?:[\w]+)?\s*\n\/\/ (FILE|CREATE): ([^\n]+)\n([\s\S]*?)```/g
  let match
  
  while ((match = fileBlockRegex.exec(response)) !== null) {
    changes.push({
      filePath: match[2].trim(),
      action: match[1] === 'CREATE' ? 'create' : 'modify',
      newContent: match[3].trim(),
    })
  }
  
  return changes
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json()
    const { message, files, currentFile } = body

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    const apiKey = 'sk-68be7759cb7746dbb0b90edba8e78fe0'

    const fileContext = buildFileContext(files, currentFile)

    const systemPrompt = `You are an expert software engineer assistant.
Your task is to help modify, create, or explain code based on user instructions.

IMPORTANT RULES:
1. When creating a NEW file, use this format:
   \`\`\`language
   // CREATE: path/to/new/file.ext
   <complete file content>
   \`\`\`
2. When modifying an EXISTING file, use this format:
   \`\`\`language
   // FILE: path/to/existing/file.ext
   <complete file content>
   \`\`\`
3. Always explain what you're doing.
4. If asked to create a whole app, provide all necessary files (code, config, yml for CI/CD, etc.) in the formats above.

Current project context:
${fileContext}`

    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message },
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error?.message || `DeepSeek API error: ${response.status}`)
    }

    const data = await response.json()
    const aiResponse = data.choices?.[0]?.message?.content || 'No response generated'
    const codeChanges = parseCodeChanges(aiResponse)

    return NextResponse.json({
      success: true,
      response: aiResponse,
      codeChanges,
    })

  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
