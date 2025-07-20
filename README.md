# Gemini MCP Server

Model Context Protocol (MCP) server for Google Gemini API integration.

## Installation

Install directly from GitHub using npx:

```bash
npx @el-el-san/gemini-mcp
```

Or install globally:

```bash
npm install -g @el-el-san/gemini-mcp
```

## Configuration

### 1. Set Environment Variable

Set your Gemini API key:

```bash
export GEMINI_API_KEY="your-gemini-api-key-here"
```

### 2. MCP Client Configuration

Add to your MCP client configuration (e.g., Claude Desktop):

#### Default Configuration
```json
{
  "mcpServers": {
    "gemini-mcp": {
      "command": "npx",
      "args": ["@el-el-san/gemini-mcp"],
      "env": {
        "GEMINI_API_KEY": "${GEMINI_API_KEY}"
      }
    }
  }
}
```

#### For Windows
```json
{
  "mcpServers": {
    "gemini-mcp": {
      "command": "cmd",
      "args": ["/c", "npx", "@el-el-san/gemini-mcp"],
      "env": {
        "GEMINI_API_KEY": "${GEMINI_API_KEY}"
      }
    }
  }
}
```

## Available Tools

- `gemini_chat`: Chat with Gemini models
- `get_conversation_history`: Retrieve conversation history
- `analyze_media`: Analyze images and videos with Gemini vision

## Usage

Once configured, the Gemini tools will be available in your MCP client.

### Example Chat
```
User: Tell me about the weather
Gemini: I can help you with weather information, but I'll need you to specify a location...
```

### Example Media Analysis
```
User: Analyze this image: /path/to/image.jpg
Gemini: This image shows...
```

## Requirements

- Node.js 18+
- Gemini API key from Google AI Studio

## License

MIT