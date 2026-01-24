# AI Code Platform

## Overview
A browser-based coding platform similar to Replit with AI-assisted coding capabilities.

## Tech Stack
- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend**: Next.js API routes
- **AI Model**: DeepSeek API (requires API key)
- **Code Editor**: Monaco Editor

## Project Structure
```
src/
├── app/
│   ├── api/
│   │   ├── chat/route.ts       # AI chat endpoint
│   │   └── github/import/route.ts  # GitHub repo import
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                # Main workspace
├── components/
│   ├── AIChat.tsx              # AI chat interface
│   ├── CodeEditor.tsx          # Monaco code editor
│   ├── Console.tsx             # Log console
│   ├── FileExplorer.tsx        # File tree view
│   ├── Header.tsx              # Top navigation
│   └── ImportModal.tsx         # GitHub import modal
└── types/
    └── index.ts                # TypeScript interfaces
```

## Features
1. **File Explorer** - Browse imported repository files
2. **Code Editor** - Monaco-based syntax highlighting editor
3. **AI Chat** - Get AI assistance for code modifications
4. **GitHub Import** - Import public repositories
5. **Console** - View application logs

## Environment Variables
- `DEEPSEEK_API_KEY` - DeepSeek API key for AI features
- `GITHUB_TOKEN` - Optional GitHub token for private repos

## Running the App
```bash
npm run dev
```
The app runs on port 5000.

## Recent Changes
- Initial project setup (Jan 24, 2026)
