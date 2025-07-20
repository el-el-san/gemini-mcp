# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
This is a TypeScript-based MCP (Model Context Protocol) chat client for Google's Gemini API. The project provides a simple command-line interface for interactive conversations with Gemini models.

## Development Commands

### Running the Application
```bash
npm start
# or directly with ts-node
npx ts-node mcp.ts
```

### Dependencies
```bash
npm install
```

## Environment Setup
- Set `GEMINI_API_KEY` environment variable with your Google Gemini API key before running
- The application will fail to start without this environment variable

## Code Architecture

### Main Components
- **mcp.ts**: Single main file containing the entire chat application
  - `getGenAIClient()`: Initializes the GoogleGenerativeAI client
  - `generate()`: Handles conversation flow and streaming responses
  - `main()`: CLI loop for user interaction
  - Uses conversation history to maintain context across chat turns
  - Implements safety settings and generation configuration
  - Streams responses in real-time for better user experience

### Key Dependencies
- `@google/genai`: Google's Generative AI SDK for Gemini API integration
- `readline-sync`: Synchronous user input handling for CLI
- `ts-node`: Direct TypeScript execution without compilation

### Configuration
- Model: `gemini-1.5-flash` (configurable via MODEL_NAME constant)
- Safety settings: Medium and above blocking for all harm categories
- Generation config: Temperature 0.9, topK 1, topP 1, max 2048 tokens

## Additional Files
- `gemini-api.txt`: Python example using newer `google-genai` package with tools and thinking config
- `llmfull.txt`: Large data file (435KB+) - purpose unclear from filename alone