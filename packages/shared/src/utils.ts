import pino from 'pino';
import type { McpToolResponse, Logger } from './types';

/**
 * Creates a successful MCP tool response
 */
export function createSuccessResponse(text: string): McpToolResponse {
  return {
    content: [
      {
        type: 'text',
        text,
      },
    ],
  };
}

/**
 * Creates an error MCP tool response
 */
export function createErrorResponse(error: Error | string): McpToolResponse {
  const errorMessage = error instanceof Error ? error.message : error;

  return {
    content: [
      {
        type: 'text',
        text: `Error: ${errorMessage}`,
      },
    ],
    isError: true,
  };
}

/**
 * Creates a Pino logger instance with the specified name
 */
export function createLogger(name: string): Logger {
  const level = process.env.LOG_LEVEL || 'info';

  const logger = pino({
    name,
    level,
    transport:
      process.env.NODE_ENV !== 'production'
        ? {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'HH:MM:ss',
              ignore: 'pid,hostname',
            },
          }
        : undefined,
  });

  return {
    debug: (message: string, ...args: unknown[]) => {
      logger.debug({ data: args }, message);
    },
    info: (message: string, ...args: unknown[]) => {
      logger.info({ data: args }, message);
    },
    warn: (message: string, ...args: unknown[]) => {
      logger.warn({ data: args }, message);
    },
    error: (message: string, error?: Error | unknown) => {
      if (error instanceof Error) {
        logger.error({ err: error }, message);
      } else {
        logger.error({ error }, message);
      }
    },
  };
}

/**
 * Validates required environment variables
 */
export function validateEnvVars(requiredVars: string[]): void {
  const missing = requiredVars.filter((varName) => !process.env[varName]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

/**
 * Formats JSON response for better readability
 */
export function formatJson(data: unknown): string {
  return JSON.stringify(data, null, 2);
}
