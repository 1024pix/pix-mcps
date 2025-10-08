import { z } from 'zod';
import type { JiraClient } from '../lib/jira-client.js';
import { JiraApiException } from '../lib/jira-client.js';
import { formatIssue } from '../lib/issue-formatter.js';
import { createLogger } from '@pix-mcps/shared';

const logger = createLogger('get-issue-tool');

const STANDARD_ISSUE_FIELDS = [
  'summary',
  'description',
  'status',
  'assignee',
  'reporter',
  'priority',
  'created',
  'updated',
  'labels',
  'fixVersions',
  'issuetype',
  'project',
  'parent',
  'issuelinks',
  'customfield_*',
];

const issueKeySchema = z
  .string()
  .regex(/^[A-Z]+-\d+$/, 'Issue key must be in format: PROJECT-NUMBER (e.g., PROJ-1234)')
  .describe('The JIRA issue key in format PROJECT-NUMBER (e.g., PROJ-1234, PROJ-5678)');

const includeCommentsSchema = z
  .boolean()
  .optional()
  .default(true)
  .describe('Whether to include comments in the response (default: true)');

const getIssueArgsSchema = z.object({
  issueKey: issueKeySchema,
  includeComments: includeCommentsSchema,
});

/**
 * Creates the get_issue tool for retrieving JIRA issue details
 */
export function createGetIssueTool(jiraClient: JiraClient) {
  return {
    name: 'get_issue',
    description: 'Retrieves detailed information about a JIRA issue by its key (e.g., PROJ-1234). Returns comprehensive details including summary, description, status, assignee, priority, labels, fix versions, parent issue/epic, related issues, custom Pix fields (equipix, appli pix), development info (branches, PRs), and recent comments.',
    schema: {
      type: 'object' as const,
      properties: {
        issueKey: {
          type: 'string' as const,
          pattern: '^[A-Z]+-\\d+$',
          description: 'The JIRA issue key in format PROJECT-NUMBER (e.g., PROJ-1234, PROJ-5678)',
        },
        includeComments: {
          type: 'boolean' as const,
          description: 'Whether to include comments in the response (default: true)',
          default: true,
        },
      },
      required: ['issueKey'],
    },
    handler: async (args: unknown) => {
      const validatedArgs = getIssueArgsSchema.parse(args);
      logger.info(`Fetching issue: ${validatedArgs.issueKey}`);

      try {
        const normalizedIssueKey = normalizeIssueKey(validatedArgs.issueKey);
        const { fields, expand } = buildFetchOptions(validatedArgs.includeComments);
        const issue = await jiraClient.getIssue(normalizedIssueKey, fields, expand);
        const formattedIssue = formatIssue(issue);

        logger.info(`Successfully retrieved issue: ${normalizedIssueKey}`);

        return {
          content: [{ type: 'text' as const, text: formattedIssue }],
        };
      } catch (error) {
        return handleFetchError(error);
      }
    },
  };
}

function normalizeIssueKey(issueKey: string): string {
  return issueKey.trim().toUpperCase();
}

function buildFetchOptions(includeComments: boolean): { fields: string[]; expand: string[] } {
  const fields = [...STANDARD_ISSUE_FIELDS];
  const expand: string[] = [];

  if (includeComments) {
    expand.push('renderedFields');
    fields.push('comment');
  }

  return { fields, expand };
}

function handleFetchError(error: unknown) {
  logger.error('Failed to fetch issue', error);

  let errorMessage: string;

  if (error instanceof JiraApiException) {
    errorMessage = error.message;
  } else if (error instanceof Error) {
    errorMessage = `Failed to retrieve issue: ${error.message}`;
  } else {
    errorMessage = 'An unexpected error occurred while retrieving the issue.';
  }

  return {
    content: [{ type: 'text' as const, text: `Error: ${errorMessage}` }],
    isError: true,
  };
}
