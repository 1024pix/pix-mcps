# @pix-mcps/shared

Shared utilities and types for Pix MCP servers.

## Installation

This package is part of the pix-mcps monorepo and is used internally by MCP servers.

```bash
npm install @pix-mcps/shared
```

## Usage

### Types

```typescript
import type { McpToolResponse, ApiError, Logger } from '@pix-mcps/shared';

// Use in your tool implementation
async function myTool(args: ToolArgs): Promise<McpToolResponse> {
  // ...
}
```

### Utilities

```typescript
import {
  createSuccessResponse,
  createErrorResponse,
  createLogger,
  validateEnvVars,
  formatJson,
} from '@pix-mcps/shared';

// Create logger
const logger = createLogger('my-server');
logger.info('Server started');

// Validate environment variables
validateEnvVars(['PIX_API_KEY', 'PIX_API_URL']);

// Create responses
const success = createSuccessResponse('Operation completed');
const error = createErrorResponse(new Error('Something went wrong'));

// Format JSON
const formatted = formatJson({ key: 'value' });
```

## API

### Types

#### `McpToolResponse`

Standard response format for MCP tools.

```typescript
interface McpToolResponse {
  content: Array<{
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: string;
    mimeType?: string;
  }>;
  isError?: boolean;
}
```

#### `Logger`

Logger interface for consistent logging across servers. Uses [Pino](https://github.com/pinojs/pino) under the hood.

```typescript
interface Logger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, error?: Error | unknown): void;
}
```

### Functions

#### `createSuccessResponse(text: string): McpToolResponse`

Creates a successful response with text content.

#### `createErrorResponse(error: Error | string): McpToolResponse`

Creates an error response with error message.

#### `createLogger(name: string): Logger`

Creates a Pino logger instance with the specified name.

**Features:**
- Uses [Pino](https://github.com/pinojs/pino) for fast, structured logging
- Automatically enables pretty printing in development mode
- Respects `LOG_LEVEL` environment variable (debug, info, warn, error)
- Respects `NODE_ENV` for production/development mode
- Structured logging with JSON in production for easy parsing

#### `validateEnvVars(requiredVars: string[]): void`

Validates that required environment variables are set. Throws an error if any are missing.

#### `formatJson(data: unknown): string`

Formats data as pretty-printed JSON string.
