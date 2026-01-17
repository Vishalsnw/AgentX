# Project Overview

A Replit Agent replica web application that allows users to connect to GitHub, import repositories, and use AI to create or modify code.

## Status
- **Auth**: GitHub OAuth 2.0 implemented and working on Vercel.
- **AI**: DeepSeek integration working for chat and code generation.
- **Git**: Clone, Pull, and Push operations implemented using system Git.
- **Backend**: Flask server handling API requests and Git operations.
- **Frontend**: React/Vite/Tailwind UI with a modern replica design.

## Project Architecture
- `server/`: Flask backend
- `client/`: React/Vite frontend
- `attached_assets/`: Design assets and screenshots

## Recent Changes (January 17, 2026)
- Implemented GitHub OAuth flow for secure authentication.
- Fixed Git binary path issues by using shell-based execution.
- Added repository selection from authenticated user's list.
- Improved error handling for GitHub API and Git operations.
