/**
 * Common types used across MCP servers
 */

export interface McpToolResponse {
  content: Array<{
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: string;
    mimeType?: string;
  }>;
  isError?: boolean;
}

export interface ApiError {
  message: string;
  statusCode?: number;
  code?: string;
  details?: unknown;
}

export interface McpServerConfig {
  name: string;
  version: string;
  description: string;
}

export interface Logger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, error?: Error | unknown): void;
}
