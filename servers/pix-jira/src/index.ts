#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { createLogger } from '@pix-mcps/shared';
import { loadConfig } from './config.js';
import { JiraClient } from './lib/jira-client.js';
import { createGetIssueTool } from './tools/get-issue.js';
import { createAnalyzeTicketTool } from './tools/analyze-ticket.js';

const logger = createLogger('pix-jira-mcp');

/**
 * Main function to initialize and start the JIRA MCP server
 */
async function main() {
  try {
    await startServer();
  } catch (error) {
    handleStartupError(error);
    process.exit(1);
  }
}

async function startServer(): Promise<void> {
  logger.info('Starting Pix JIRA MCP Server...');

  const config = loadConfig();
  logger.info(`Configured for JIRA instance: ${config.jiraBaseUrl}`);

  const jiraClient = await initializeJiraClient(config);
  const tools = [createGetIssueTool(jiraClient), createAnalyzeTicketTool(jiraClient)];

  logAvailableTools();

  const server = new Server(
    {
      name: 'pix-jira',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Register list_tools handler
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.schema,
      })),
    };
  });

  // Register call_tool handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const tool = tools.find(t => t.name === request.params.name);
    if (!tool) {
      throw new Error(`Unknown tool: ${request.params.name}`);
    }
    return await tool.handler(request.params.arguments);
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);

  logger.info('Server started and ready to receive requests');
}

async function initializeJiraClient(config: ReturnType<typeof loadConfig>): Promise<JiraClient> {
  const jiraClient = new JiraClient(config);

  logger.info('Testing connection to JIRA...');
  await jiraClient.testConnection();
  logger.info('Successfully connected to JIRA');

  return jiraClient;
}

function logAvailableTools(): void {
  logger.info('Pix JIRA MCP Server initialized successfully');
  logger.info('Available tools:');
  logger.info('  - get_issue: Retrieve JIRA issue details');
  logger.info('  - analyze_ticket: Get technical analysis prompt for a JIRA ticket');
}


function handleStartupError(error: unknown): void {
  logger.error('Failed to start Pix JIRA MCP Server', error);

  if (error instanceof Error) {
    console.error(`\n❌ Error: ${error.message}\n`);
    displayErrorHint(error.message);
  }
}

function displayErrorHint(errorMessage: string): void {
  if (errorMessage.includes('Configuration validation failed')) {
    console.error('💡 Tip: Make sure you have created a .env file with the required variables.');
    console.error('   Copy .env.example to .env and fill in your JIRA credentials.\n');
    return;
  }

  if (errorMessage.includes('Authentication failed')) {
    console.error('💡 Tip: Check that your JIRA_EMAIL and JIRA_API_TOKEN are correct.');
    console.error(
      '   You can generate a new API token at: https://id.atlassian.com/manage-profile/security/api-tokens\n',
    );
    return;
  }

  if (errorMessage.includes('Failed to connect')) {
    console.error('💡 Tip: Verify that JIRA_BASE_URL is correct and accessible.');
    console.error('   Expected format: https://YOURWORKSPACE.atlassian.net\n');
  }
}

function registerShutdownHandlers(): void {
  process.on('SIGINT', () => {
    logger.info('Received SIGINT, shutting down gracefully...');
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    logger.info('Received SIGTERM, shutting down gracefully...');
    process.exit(0);
  });
}

registerShutdownHandlers();
main();
