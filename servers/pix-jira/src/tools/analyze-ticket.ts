import { tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import type { JiraClient } from '../lib/jira-client';
import { executeAnalyzeTicketPrompt } from '../prompts/analyze-ticket';
import { createSuccessResponse, createErrorResponse } from '@pix-mcps/shared';
import { createLogger } from '@pix-mcps/shared';

const logger = createLogger('analyze-ticket-tool');

/**
 * Creates the analyze_ticket tool for getting ticket analysis prompts
 *
 * This tool implements the "analyze_ticket" MCP prompt as a tool.
 * When invoked, it prepares a comprehensive analysis prompt for Claude.
 */
export function createAnalyzeTicketTool(jiraClient: JiraClient) {
  return tool(
    'analyze_ticket',
    'Prepares a detailed technical analysis of a JIRA ticket. Returns a structured prompt that asks for complexity assessment, potential risks, dependencies, and recommended development approach. Use this when you need to deeply understand the technical implications of a ticket.',
    {
      issueKey: z
        .string()
        .regex(/^[A-Z]+-\d+$/, 'Issue key must be in format: PROJECT-NUMBER (e.g., PROJ-1234)')
        .describe('The JIRA issue key to analyze (e.g., PROJ-1234, PROJ-5678)'),
    },
    async (args) => {
      logger.info(`Preparing analysis for issue: ${args.issueKey}`);

      try {
        const result = await executeAnalyzeTicketPrompt(args, jiraClient);

        if (result.error) {
          return createErrorResponse(result.error);
        }

        // Return the prompt content for Claude to process
        return createSuccessResponse(result.content);
      } catch (error) {
        logger.error('Failed to prepare ticket analysis', error);

        if (error instanceof Error) {
          return createErrorResponse(`Failed to prepare analysis: ${error.message}`);
        }

        return createErrorResponse('An unexpected error occurred while preparing ticket analysis.');
      }
    },
  );
}
