# Anthropic TypeScript Agent SDK Reference

This document contains essential information about the Anthropic TypeScript Agent SDK and MCP (Model Context Protocol) for building custom MCP servers in this monorepo.

## Table of Contents

1. [TypeScript Agent SDK Overview](#typescript-agent-sdk-overview)
2. [Model Context Protocol (MCP)](#model-context-protocol-mcp)
3. [Building Custom Tools](#building-custom-tools)
4. [Best Practices](#best-practices)

## TypeScript Agent SDK Overview

### Installation

```bash
npm install @anthropic-ai/claude-agent-sdk
```

### Key Features

1. **Primary Interaction Function: `query()`**
   - Streams messages as they arrive
   - Supports string or async iterable inputs
   - Configurable with extensive options

2. **Tool Creation: `tool()`**
   - Create type-safe Model Context Protocol (MCP) tools
   - Define input schemas using Zod
   - Supports custom tool handlers

3. **Flexible Configuration**
   - Supports multiple permission modes
   - Configurable agent definitions
   - Extensive hook system for event handling

### Basic Usage Example

```typescript
import { query, tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';

// Create a tool
const myTool = tool(
  'ExampleTool',
  'Demonstrates tool creation',
  { input: z.string() },
  async (args) => {
    // Tool implementation
    return { content: [{ type: "text", text: "Result" }] };
  }
);

// Run a query
const result = query({
  prompt: "Help me with a task",
  options: {
    tools: [myTool],
    model: 'claude-3-sonnet'
  }
});
```

### Key Configuration Options

- `model`: Specify Claude model
- `systemPrompt`: Custom or preset system instructions
- `permissionMode`: Control tool usage permissions
- `hooks`: Add custom event handlers
- `agents`: Define programmatic subagents

## Model Context Protocol (MCP)

### What is MCP?

MCP is an open-source standard that allows Claude to connect and interact with external tools, databases, and APIs. It enables developers to extend Claude's capabilities by integrating various services and data sources.

### Key Concepts

- **Servers**: Standalone services that expose tools and resources to Claude
- **Tools**: Specific capabilities that Claude can invoke
- **Resources**: Data sources that Claude can access
- **Connection Types**: stdio, SSE (Server-Sent Events), and HTTP

### MCP Server Types

1. **stdio (Standard Input/Output)**: Local processes that communicate via stdin/stdout
2. **HTTP/SSE**: Remote servers accessible via HTTP with Server-Sent Events
3. **In-SDK**: Servers embedded directly in your application

### Configuration Example

MCP servers are configured in `.mcp.json` at the project root:

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-filesystem"],
      "env": {
        "ALLOWED_PATHS": "/path/to/project"
      }
    }
  }
}
```

### Using MCP in Code

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

for await (const message of query({
  prompt: "List files in my project",
  options: {
    mcpServers: {
      "filesystem": {
        command: "npx",
        args: ["@modelcontextprotocol/server-filesystem"],
        env: {
          ALLOWED_PATHS: "/Users/me/projects"
        }
      }
    },
    allowedTools: ["mcp__filesystem__list_files"]
  }
})) {
  // Process results
}
```

## Building Custom Tools

### Tool Definition Pattern

Tools are created using the `tool()` helper function with Zod schemas for type safety:

```typescript
import { tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';

const myTool = tool(
  "tool_name",
  "Clear description of what this tool does",
  {
    parameter1: z.string().describe("Description of parameter1"),
    parameter2: z.number().optional().describe("Optional parameter description")
  },
  async (args) => {
    try {
      // Tool implementation logic
      const result = await performOperation(args.parameter1, args.parameter2);

      return {
        content: [{
          type: "text",
          text: JSON.stringify(result)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Error: ${error.message}`
        }],
        isError: true
      };
    }
  }
);
```

### Tool Naming Convention

Tools follow the pattern: `mcp__{server_name}__{tool_name}`

Example: `mcp__pix-api__get_user_info`

### Creating an MCP Server with Multiple Tools

```typescript
import { createSdkMcpServer, tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';

const server = createSdkMcpServer({
  serverName: "my-custom-server",
  tools: [
    tool(
      "get_data",
      "Retrieves data from a source",
      { id: z.string() },
      async (args) => {
        // Implementation
        return { content: [{ type: "text", text: "Data" }] };
      }
    ),
    tool(
      "update_data",
      "Updates data in the system",
      {
        id: z.string(),
        value: z.string()
      },
      async (args) => {
        // Implementation
        return { content: [{ type: "text", text: "Updated" }] };
      }
    )
  ]
});
```

## Best Practices

### 1. Tool Design

- **Clear naming**: Use descriptive, action-oriented tool names
- **Good descriptions**: Provide clear descriptions for both tools and parameters
- **Type safety**: Always use Zod schemas for parameter validation
- **Error handling**: Handle errors gracefully and return meaningful messages

### 2. Parameter Validation

```typescript
const schema = {
  url: z.string().url().describe("Valid HTTP/HTTPS URL"),
  timeout: z.number().min(0).max(30000).optional().describe("Timeout in milliseconds"),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE']).describe("HTTP method")
};
```

### 3. Environment Variables

Use `.env` files for secrets and configuration:

```typescript
import 'dotenv/config';

const apiKey = process.env.PIX_API_KEY;
const apiUrl = process.env.PIX_API_URL;
```

### 4. Response Format

Always return structured responses:

```typescript
return {
  content: [{
    type: "text",
    text: JSON.stringify({
      success: true,
      data: result,
      metadata: { timestamp: Date.now() }
    }, null, 2)
  }]
};
```

### 5. Testing

- Test tools in isolation
- Mock external dependencies
- Validate error handling
- Test edge cases

### 6. Documentation

- Document each tool's purpose
- Provide usage examples
- List required environment variables
- Document error conditions

## Additional Resources

- [Anthropic TypeScript SDK Documentation](https://docs.claude.com/en/api/agent-sdk/typescript)
- [MCP in the SDK](https://docs.claude.com/en/api/agent-sdk/mcp)
- [MCP General Concepts](https://docs.claude.com/fr/docs/claude-code/mcp)
- [Custom Tools Guide](https://docs.claude.com/en/api/agent-sdk/custom-tools)
