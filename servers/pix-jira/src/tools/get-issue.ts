import { tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import type { JiraClient } from '../lib/jira-client';
import { JiraApiException } from '../lib/jira-client';
import { formatIssue } from '../lib/issue-formatter';
import { createSuccessResponse, createErrorResponse } from '@pix-mcps/shared';
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

/**
 * Creates the get_issue tool for retrieving JIRA issue details
 */
export function createGetIssueTool(jiraClient: JiraClient) {
  return tool(
    'get_issue',
    'Retrieves detailed information about a JIRA issue by its key (e.g., PROJ-1234). Returns comprehensive details including summary, description, status, assignee, priority, labels, fix versions, parent issue/epic, related issues, custom Pix fields (equipix, appli pix), development info (branches, PRs), and recent comments.',
    {
      issueKey: z
        .string()
        .regex(/^[A-Z]+-\d+$/, 'Issue key must be in format: PROJECT-NUMBER (e.g., PROJ-1234)')
        .describe('The JIRA issue key in format PROJECT-NUMBER (e.g., PROJ-1234, PROJ-5678)'),
      includeComments: z
        .boolean()
        .optional()
        .default(true)
        .describe('Whether to include comments in the response (default: true)'),
    },
    async (args) => {
      logger.info(`Fetching issue: ${args.issueKey}`);

      try {
        const normalizedIssueKey = normalizeIssueKey(args.issueKey);
        const { fields, expand } = buildFetchOptions(args.includeComments);
        const issue = await jiraClient.getIssue(normalizedIssueKey, fields, expand);
        const formattedIssue = formatIssue(issue);

        logger.info(`Successfully retrieved issue: ${normalizedIssueKey}`);

        return createSuccessResponse(formattedIssue);
      } catch (error) {
        return handleFetchError(error);
      }
    },
  );
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

function handleFetchError(error: unknown): ReturnType<typeof createErrorResponse> {
  logger.error('Failed to fetch issue', error);

  if (error instanceof JiraApiException) {
    return createErrorResponse(error.message);
  }

  if (error instanceof Error) {
    return createErrorResponse(`Failed to retrieve issue: ${error.message}`);
  }

  return createErrorResponse('An unexpected error occurred while retrieving the issue.');
}
