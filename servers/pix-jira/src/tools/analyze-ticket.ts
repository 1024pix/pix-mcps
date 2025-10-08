import { z } from 'zod';
import type { JiraClient } from '../lib/jira-client.js';
import { executeAnalyzeTicketPrompt } from '../prompts/analyze-ticket.js';
import { createLogger } from '@pix-mcps/shared';

const logger = createLogger('analyze-ticket-tool');

const analyzeTicketArgsSchema = z.object({
  issueKey: z
    .string()
    .regex(/^[A-Z]+-\d+$/, 'Issue key must be in format: PROJECT-NUMBER (e.g., PROJ-1234)')
    .describe('The JIRA issue key to analyze (e.g., PROJ-1234, PROJ-5678)'),
});

/**
 * Creates the analyze_ticket tool for getting ticket analysis prompts
 *
 * This tool implements the "analyze_ticket" MCP prompt as a tool.
 * When invoked, it prepares a comprehensive analysis prompt for Claude.
 */
export function createAnalyzeTicketTool(jiraClient: JiraClient) {
  return {
    name: 'analyze_ticket',
    description: 'Prepares a detailed technical analysis of a JIRA ticket. Returns a structured prompt that asks for complexity assessment, potential risks, dependencies, and recommended development approach. Use this when you need to deeply understand the technical implications of a ticket.',
    schema: {
      type: 'object' as const,
      properties: {
        issueKey: {
          type: 'string' as const,
          pattern: '^[A-Z]+-\\d+$',
          description: 'The JIRA issue key to analyze (e.g., PROJ-1234, PROJ-5678)',
        },
      },
      required: ['issueKey'],
    },
    handler: async (args: unknown) => {
      const validatedArgs = analyzeTicketArgsSchema.parse(args);
      logger.info(`Preparing analysis for issue: ${validatedArgs.issueKey}`);

      try {
        const result = await executeAnalyzeTicketPrompt(validatedArgs, jiraClient);

        if (result.error) {
          return {
            content: [{ type: 'text' as const, text: `Error: ${result.error}` }],
            isError: true,
          };
        }

        // Return the prompt content for Claude to process
        return {
          content: [{ type: 'text' as const, text: result.content }],
        };
      } catch (error) {
        logger.error('Failed to prepare ticket analysis', error);

        const errorMessage = error instanceof Error
          ? `Failed to prepare analysis: ${error.message}`
          : 'An unexpected error occurred while preparing ticket analysis.';

        return {
          content: [{ type: 'text' as const, text: `Error: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  };
}
