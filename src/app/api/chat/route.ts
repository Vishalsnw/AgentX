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
  
  const fileBlockRegex = /```(?:[\w]+)?\s*\n\/\/ FILE: ([^\n]+)\n([\s\S]*?)```/g
  let match
  
  while ((match = fileBlockRegex.exec(response)) !== null) {
    changes.push({
      filePath: match[1].trim(),
      action: 'modify',
      newContent: match[2].trim(),
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

    const apiKey = process.env.DEEPSEEK_API_KEY

    if (!apiKey) {
      const mockResponse = `I understand you want me to help with: "${message}"

However, the DeepSeek API key is not configured. To enable AI assistance:

1. Add your DeepSeek API key to the environment variables
2. Set DEEPSEEK_API_KEY in your .env file

For now, I can provide general guidance based on your request.

If you're asking about code modifications, please describe what changes you'd like to make, and I'll help you understand the approach once the API is connected.`

      return NextResponse.json({
        success: true,
        response: mockResponse,
        codeChanges: [],
      })
    }

    const fileContext = buildFileContext(files, currentFile)

    const systemPrompt = `You are an expert software engineer assistant.
Your task is to help modify, create, or explain code based on user instructions.

IMPORTANT RULES:
1. Only modify files that are explicitly requested
2. Do not hallucinate file paths - only reference files that exist
3. Follow the existing project structure and coding conventions
4. When providing code changes, use this format:
   \`\`\`language
   // FILE: path/to/file.ext
   <complete file content>
   \`\`\`
5. Always explain what changes you're making and why
6. Be concise but thorough in explanations

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
