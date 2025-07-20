#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { GoogleGenAI } from "@google/genai";
import { promises as fs } from "fs";
import * as path from "path";

// --- Configuration ---
const API_KEY = process.env.GEMINI_API_KEY;
const MODEL_NAME = "gemini-2.5-flash";

if (!API_KEY) {
  console.error("GEMINI_API_KEY environment variable not set. Please set it to your API key.");
  process.exit(1);
}

const genAI = new GoogleGenAI({ apiKey: API_KEY });

class GeminiMCPServer {
  private server: Server;
  private conversationHistory: any[] = [];

  constructor() {
    this.server = new Server({
      name: "gemini-mcp-server",
      version: "1.0.0",
    }, {
      capabilities: {
        tools: {},
      },
    });

    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error) => console.error("[MCP Error]", error);
    process.on("SIGINT", async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "gemini_chat",
          description: "Chat with Google's Gemini AI model",
          inputSchema: {
            type: "object",
            properties: {
              message: {
                type: "string",
                description: "The message to send to Gemini",
              },
              reset_conversation: {
                type: "boolean",
                description: "Whether to reset the conversation history",
                default: false,
              },
            },
            required: ["message"],
          },
        },
        {
          name: "get_conversation_history",
          description: "Get the current conversation history",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
        {
          name: "analyze_media",
          description: "Analyze image or video file using Gemini vision capabilities",
          inputSchema: {
            type: "object",
            properties: {
              file_path: {
                type: "string",
                description: "Path to the image or video file",
              },
              prompt: {
                type: "string",
                description: "Optional analysis prompt",
                default: "Analyze this media file",
              },
            },
            required: ["file_path"],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        if (name === "gemini_chat") {
          return await this.handleGeminiChat(args);
        } else if (name === "get_conversation_history") {
          return await this.handleGetConversationHistory();
        } else if (name === "analyze_media") {
          return await this.handleAnalyzeMedia(args);
        } else {
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Unknown tool: ${name}`
          );
        }
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error}`
        );
      }
    });
  }

  private async handleGeminiChat(args: any): Promise<any> {
    const { message, reset_conversation = false } = args;

    if (!message || typeof message !== "string") {
      throw new McpError(
        ErrorCode.InvalidParams,
        "Missing or invalid 'message' parameter"
      );
    }

    if (reset_conversation) {
      this.conversationHistory = [];
    }

    try {
      // Add the new user message to the history
      this.conversationHistory.push({ role: "user", parts: [{ text: message }] });

      const result = await genAI.models.generateContent({
        model: MODEL_NAME,
        contents: this.conversationHistory,
        config: {
          tools: [{
            googleSearch: {}
          }],
          temperature: 0.9,
          topK: 1,
          topP: 1,
          maxOutputTokens: 2048,
        },
      });
      const responseText = result.text;

      // Add the model's response to the history
      this.conversationHistory.push({ role: "model", parts: [{ text: responseText }] });

      return {
        content: [
          {
            type: "text",
            text: responseText,
          },
        ],
      };
    } catch (error) {
      // If an error occurs, remove the last user message to avoid a broken history
      if (this.conversationHistory.length > 0) {
        this.conversationHistory.pop();
      }
      
      throw new McpError(
        ErrorCode.InternalError,
        `Gemini API error: ${error}`
      );
    }
  }

  private async handleGetConversationHistory(): Promise<any> {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(this.conversationHistory, null, 2),
        },
      ],
    };
  }

  private async handleAnalyzeMedia(args: any): Promise<any> {
    const { file_path, prompt = "Analyze this media file" } = args;

    if (!file_path || typeof file_path !== "string") {
      throw new McpError(
        ErrorCode.InvalidParams,
        "Missing or invalid 'file_path' parameter"
      );
    }

    try {
      // Check if file exists
      await fs.access(file_path);
      
      const fileExtension = path.extname(file_path).toLowerCase();
      const isImage = ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(fileExtension);
      const isVideo = ['.mp4', '.mov', '.avi', '.mkv', '.webm'].includes(fileExtension);
      
      if (!isImage && !isVideo) {
        throw new McpError(
          ErrorCode.InvalidParams,
          "File must be an image or video format"
        );
      }

      // Read file and convert to base64
      const fileData = await fs.readFile(file_path);
      const base64Data = fileData.toString('base64');
      
      let mimeType: string;
      if (isImage) {
        mimeType = fileExtension === '.jpg' || fileExtension === '.jpeg' ? 'image/jpeg' :
                   fileExtension === '.png' ? 'image/png' :
                   fileExtension === '.gif' ? 'image/gif' :
                   fileExtension === '.webp' ? 'image/webp' : 'image/jpeg';
      } else {
        mimeType = fileExtension === '.mp4' ? 'video/mp4' :
                   fileExtension === '.mov' ? 'video/quicktime' :
                   fileExtension === '.avi' ? 'video/x-msvideo' :
                   fileExtension === '.mkv' ? 'video/x-matroska' :
                   fileExtension === '.webm' ? 'video/webm' : 'video/mp4';
      }

      const result = await genAI.models.generateContent({
        model: MODEL_NAME,
        contents: [
          {
            parts: [
              {
                inlineData: {
                  data: base64Data,
                  mimeType: mimeType
                }
              },
              { text: prompt }
            ]
          }
        ]
      });

      const responseText = result.text;

      return {
        content: [
          {
            type: "text",
            text: responseText,
          },
        ],
      };
    } catch (error) {
      if (error instanceof McpError) {
        throw error;
      }
      throw new McpError(
        ErrorCode.InternalError,
        `Media analysis failed: ${error}`
      );
    }
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Gemini MCP server running on stdio");
  }
}

const server = new GeminiMCPServer();
server.run().catch(console.error);