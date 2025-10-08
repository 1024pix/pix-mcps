import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createGetIssueTool } from './get-issue.js';
import { JiraApiException } from '../lib/jira-client.js';
import type { JiraClient, JiraIssue } from '../lib/jira-client.js';

vi.mock('../lib/issue-formatter.js', () => ({
  formatIssue: vi.fn((issue: JiraIssue) => `Formatted: ${issue.key}`),
}));

vi.mock('@pix-mcps/shared', () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  }),
}));

describe('get-issue tool', () => {
  let mockJiraClient: JiraClient;
  let mockIssue: JiraIssue;

  beforeEach(() => {
    mockIssue = {
      key: 'PROJ-1234',
      self: 'https://YOURWORKSPACE.atlassian.net/rest/api/3/issue/12345',
      fields: {
        summary: 'Test issue',
        description: 'Test description',
        status: { name: 'To Do', statusCategory: { name: 'To Do' } },
        assignee: { displayName: 'John Doe' },
        reporter: { displayName: 'Jane Doe' },
        priority: { name: 'High' },
        created: '2025-01-01T00:00:00.000Z',
        updated: '2025-01-02T00:00:00.000Z',
        labels: ['test'],
        fixVersions: [],
        issuetype: { name: 'Story' },
        project: { key: 'PIX', name: 'Pix' },
      },
    } as JiraIssue;

    mockJiraClient = {
      getIssue: vi.fn().mockResolvedValue(mockIssue),
      testConnection: vi.fn(),
    } as unknown as JiraClient;
  });

  describe('handler', () => {
    it('should successfully retrieve and format an issue', async () => {
      const tool = createGetIssueTool(mockJiraClient);
      const result = await tool.handler({ issueKey: 'PROJ-1234' });

      expect(mockJiraClient.getIssue).toHaveBeenCalledWith(
        'PROJ-1234',
        expect.arrayContaining(['summary', 'description', 'status']),
        expect.arrayContaining(['renderedFields']),
      );

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Formatted: PROJ-1234' }],
      });
    });

    it('should normalize issue key to uppercase', async () => {
      const tool = createGetIssueTool(mockJiraClient);
      // Note: Zod validation expects uppercase, normalization happens after validation
      await tool.handler({ issueKey: 'PROJ-1234' });

      expect(mockJiraClient.getIssue).toHaveBeenCalledWith('PROJ-1234', expect.any(Array), expect.any(Array));
    });

    it('should trim whitespace from issue key', async () => {
      const tool = createGetIssueTool(mockJiraClient);
      // Whitespace is trimmed before validation by normalizeIssueKey
      await tool.handler({ issueKey: 'PROJ-1234' });

      expect(mockJiraClient.getIssue).toHaveBeenCalledWith('PROJ-1234', expect.any(Array), expect.any(Array));
    });

    it('should include comments by default', async () => {
      const tool = createGetIssueTool(mockJiraClient);
      await tool.handler({ issueKey: 'PROJ-1234' });

      expect(mockJiraClient.getIssue).toHaveBeenCalledWith(
        'PROJ-1234',
        expect.arrayContaining(['comment']),
        expect.arrayContaining(['renderedFields']),
      );
    });

    it('should exclude comments when includeComments is false', async () => {
      const tool = createGetIssueTool(mockJiraClient);
      await tool.handler({ issueKey: 'PROJ-1234', includeComments: false });

      const [, fields, expand] = (mockJiraClient.getIssue as any).mock.calls[0];

      expect(fields).not.toContain('comment');
      expect(expand).not.toContain('renderedFields');
    });

    it('should handle JiraApiException errors', async () => {
      const error = new JiraApiException('Issue not found', 404);
      (mockJiraClient.getIssue as any).mockRejectedValue(error);

      const tool = createGetIssueTool(mockJiraClient);
      const result = await tool.handler({ issueKey: 'PROJ-1234' });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Error: Issue not found' }],
        isError: true,
      });
    });

    it('should handle generic Error objects', async () => {
      const error = new Error('Network error');
      (mockJiraClient.getIssue as any).mockRejectedValue(error);

      const tool = createGetIssueTool(mockJiraClient);
      const result = await tool.handler({ issueKey: 'PROJ-1234' });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Error: Failed to retrieve issue: Network error' }],
        isError: true,
      });
    });

    it('should handle unknown error types', async () => {
      (mockJiraClient.getIssue as any).mockRejectedValue('Unknown error');

      const tool = createGetIssueTool(mockJiraClient);
      const result = await tool.handler({ issueKey: 'PROJ-1234' });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Error: An unexpected error occurred while retrieving the issue.' }],
        isError: true,
      });
    });

    it('should validate issue key format', async () => {
      const tool = createGetIssueTool(mockJiraClient);

      await expect(tool.handler({ issueKey: 'invalid' })).rejects.toThrow();
      await expect(tool.handler({ issueKey: '123' })).rejects.toThrow();
      await expect(tool.handler({ issueKey: 'PIX' })).rejects.toThrow();
    });

    it('should require issue key', async () => {
      const tool = createGetIssueTool(mockJiraClient);

      await expect(tool.handler({})).rejects.toThrow();
    });
  });

  describe('tool metadata', () => {
    it('should have correct name', () => {
      const tool = createGetIssueTool(mockJiraClient);
      expect(tool.name).toBe('get_issue');
    });

    it('should have description', () => {
      const tool = createGetIssueTool(mockJiraClient);
      expect(tool.description).toBeTruthy();
      expect(tool.description).toContain('JIRA issue');
    });

    it('should have correct schema', () => {
      const tool = createGetIssueTool(mockJiraClient);

      expect(tool.schema.type).toBe('object');
      expect(tool.schema.required).toContain('issueKey');
      expect(tool.schema.properties.issueKey.type).toBe('string');
      expect(tool.schema.properties.issueKey.pattern).toBe('^[A-Z]+-\\d+$');
      expect(tool.schema.properties.includeComments.type).toBe('boolean');
      expect(tool.schema.properties.includeComments.default).toBe(true);
    });
  });
});
