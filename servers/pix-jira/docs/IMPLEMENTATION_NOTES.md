# Pix JIRA MCP Server - Implementation Notes

**Quick reference for developers working on this MCP server.**

## Architecture

### MCP SDK

- Uses `@modelcontextprotocol/sdk` for server implementation
- Communicates over stdin/stdout using JSON-RPC
- Logger writes to stderr to avoid interfering with stdout protocol

### Key Components

**Server Entry** (`src/index.ts`):

```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

// Create server
const server = new Server({ name, version }, { capabilities: { tools: {} } });

// Register handlers
server.setRequestHandler(ListToolsRequestSchema, listToolsHandler);
server.setRequestHandler(CallToolRequestSchema, callToolHandler);

// Connect stdio transport
await server.connect(new StdioServerTransport());
```

**Tools Structure**:

```typescript
export function createMyTool(client: JiraClient) {
  return {
    name: 'tool_name',
    description: 'What the tool does (Claude uses this)',
    schema: {
      /* JSON Schema for params */
    },
    handler: async (args: unknown) => {
      // Validate with Zod
      const validated = mySchema.parse(args);
      // Return MCP format
      return { content: [{ type: 'text', text: result }] };
    },
  };
}
```

## Available Tools

1. **get_issue**: Fetch JIRA issue details with formatting
2. **analyze_ticket**: Generate structured technical analysis prompt

## MCP Prompts Pattern

Prompts are implemented as tools that return analysis frameworks (not native prompt support yet).

**Structure**:

- `src/prompts/my-prompt.ts` - Core prompt logic
- `src/tools/my-prompt.ts` - Tool wrapper

**Example**:

```typescript
// In prompts/analyze-ticket.ts
export async function executeAnalyzeTicketPrompt(args, client) {
  const issue = await client.getIssue(args.issueKey);
  const prompt = createAnalysisFramework(issue);
  return { content: prompt };
}

// In tools/analyze-ticket.ts
export function createAnalyzeTicketTool(client) {
  return {
    name: 'analyze_ticket',
    description: 'Get technical analysis framework',
    schema: { issueKey: { type: 'string', pattern: '^[A-Z]+-\\d+$' } },
    handler: async (args) => {
      const result = await executeAnalyzeTicketPrompt(args, client);
      return { content: [{ type: 'text', text: result.content }] };
    },
  };
}
```

## Docker Deployment

**Pattern**: Container stays alive, server starts on-demand

```dockerfile
# Dockerfile CMD
CMD ["sleep", "infinity"]
```

**Claude Code connects via**:

```json
{
  "command": "docker",
  "args": ["exec", "-i", "pix-jira-mcp", "node", "dist/index.js"]
}
```

**Why this works**:

1. Container runs `sleep infinity`
2. Claude Code runs `docker exec` when needed
3. Server starts, handles request, exits
4. Container keeps running for next request

## ESM Modules

**Critical**: Always use `.js` extensions in imports:

```typescript
import { config } from './config.js'; // ✅
import { config } from './config'; // ❌
```

## Logger Setup

**Must write to stderr**:

```typescript
const logger = pino(
  {
    /* config */
  },
  process.stderr,
);
```

## Testing

- Vitest for unit tests
- Mock JiraClient in tests
- All test files: `*.test.ts`

## Custom Fields

Pix JIRA custom fields (in `lib/issue-formatter.ts`):

- `customfield_10253`: Equipix
- `customfield_10117`: Appli Pix
- `customfield_10000`: Development info
- `customfield_10257`: Resolution Semester

## Common Issues

**Linter errors on TypeScript**: ESLint needs `@typescript-eslint/parser` and `@typescript-eslint/eslint-plugin`

**Module not found**: Check `.js` extensions in imports

**Container timeout**: Ensure logger writes to stderr, not stdout

**Test files excluded**: `tsconfig.json` excludes `**/*.test.ts` from build

## Documentation

- [README.md](../README.md) - User-facing docs
- [Testing Guide](./testing-guide.md) - How to test the server
- [Prompts Guide](./prompts-guide.md) - Building MCP prompts
- [Prompts vs Tools](./prompts-vs-tools.md) - Decision framework
