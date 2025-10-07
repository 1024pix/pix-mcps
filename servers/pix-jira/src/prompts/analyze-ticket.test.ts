import { describe, it, expect, beforeEach, vi } from 'vitest';
import { executeAnalyzeTicketPrompt } from './analyze-ticket';
import type { JiraClient } from '../lib/jira-client';
import { JiraApiException } from '../lib/jira-client';
import type { JiraIssue } from '../types/jira';

describe('analyzeTicketPrompt', () => {
  let mockJiraClient: JiraClient;

  beforeEach(() => {
    // Create a mock JIRA client
    mockJiraClient = {
      getIssue: vi.fn(),
    } as unknown as JiraClient;
  });

  describe('executeAnalyzeTicketPrompt', () => {
    it('should generate analysis prompt with complete ticket data', async () => {
      // Arrange
      const mockIssue: JiraIssue = {
        key: 'PROJ-1234',
        fields: {
          summary: 'Implement user authentication',
          description: 'Add OAuth2 authentication to the application',
          status: { name: 'To Do' },
          assignee: { displayName: 'John Doe' },
          reporter: { displayName: 'Jane Smith' },
          priority: { name: 'High' },
          issuetype: { name: 'Story' },
          labels: ['backend', 'security'],
          project: { key: 'PIX', name: 'Pix Project' },
          created: '2025-01-01T10:00:00.000Z',
          updated: '2025-01-02T15:30:00.000Z',
        },
      };

      vi.mocked(mockJiraClient.getIssue).mockResolvedValue(mockIssue);

      // Act
      const result = await executeAnalyzeTicketPrompt(
        { issueKey: 'PROJ-1234' },
        mockJiraClient,
      );

      // Assert
      expect(result.error).toBeUndefined();
      expect(result.content).toBeDefined();
      expect(result.content).toContain('PROJ-1234');
      expect(result.content).toContain('Implement user authentication');
      expect(result.content).toContain('Complexity Assessment');
      expect(result.content).toContain('Potential Risks');
      expect(result.content).toContain('Dependencies');
      expect(result.content).toContain('Recommended Approach');
      expect(result.content).toContain('Story');
      expect(result.content).toContain('To Do');
      expect(result.content).toContain('High');

      // Verify client was called correctly
      expect(mockJiraClient.getIssue).toHaveBeenCalledWith(
        'PROJ-1234',
        expect.arrayContaining([
          'summary',
          'description',
          'status',
          'assignee',
          'priority',
          'labels',
          'issuetype',
          'parent',
          'issuelinks',
          'customfield_*',
        ]),
        [],
      );
    });

    it('should normalize issue key to uppercase', async () => {
      // Arrange
      const mockIssue: JiraIssue = {
        key: 'PROJ-5678',
        fields: {
          summary: 'Test issue',
          status: { name: 'To Do' },
          issuetype: { name: 'Task' },
          project: { key: 'PIX', name: 'Pix Project' },
          created: '2025-01-01T10:00:00.000Z',
          updated: '2025-01-02T15:30:00.000Z',
        },
      };

      vi.mocked(mockJiraClient.getIssue).mockResolvedValue(mockIssue);

      // Act
      await executeAnalyzeTicketPrompt({ issueKey: 'pix-5678' }, mockJiraClient);

      // Assert
      expect(mockJiraClient.getIssue).toHaveBeenCalledWith(
        'PROJ-5678',
        expect.any(Array),
        expect.any(Array),
      );
    });

    it('should include labels in the prompt when present', async () => {
      // Arrange
      const mockIssue: JiraIssue = {
        key: 'PROJ-999',
        fields: {
          summary: 'Issue with labels',
          status: { name: 'In Progress' },
          issuetype: { name: 'Bug' },
          labels: ['frontend', 'urgent', 'accessibility'],
          project: { key: 'PIX', name: 'Pix Project' },
          created: '2025-01-01T10:00:00.000Z',
          updated: '2025-01-02T15:30:00.000Z',
        },
      };

      vi.mocked(mockJiraClient.getIssue).mockResolvedValue(mockIssue);

      // Act
      const result = await executeAnalyzeTicketPrompt({ issueKey: 'PROJ-999' }, mockJiraClient);

      // Assert
      expect(result.content).toContain('Labels:');
      expect(result.content).toContain('frontend');
      expect(result.content).toContain('urgent');
      expect(result.content).toContain('accessibility');
    });

    it('should include parent issue when present', async () => {
      // Arrange
      const mockIssue: JiraIssue = {
        key: 'PROJ-111',
        fields: {
          summary: 'Subtask of epic',
          status: { name: 'To Do' },
          issuetype: { name: 'Subtask' },
          parent: { key: 'PROJ-100', fields: { summary: 'Parent Epic' } },
          project: { key: 'PIX', name: 'Pix Project' },
          created: '2025-01-01T10:00:00.000Z',
          updated: '2025-01-02T15:30:00.000Z',
        },
      };

      vi.mocked(mockJiraClient.getIssue).mockResolvedValue(mockIssue);

      // Act
      const result = await executeAnalyzeTicketPrompt({ issueKey: 'PROJ-111' }, mockJiraClient);

      // Assert
      expect(result.content).toContain('Parent Issue:');
      expect(result.content).toContain('PROJ-100');
    });

    it('should handle JiraApiException errors', async () => {
      // Arrange
      const apiError = new JiraApiException('Issue not found', 404);
      vi.mocked(mockJiraClient.getIssue).mockRejectedValue(apiError);

      // Act
      const result = await executeAnalyzeTicketPrompt(
        { issueKey: 'PROJ-9999' },
        mockJiraClient,
      );

      // Assert
      expect(result.error).toBe('Issue not found');
      expect(result.content).toBe('');
    });

    it('should handle generic errors', async () => {
      // Arrange
      const genericError = new Error('Network timeout');
      vi.mocked(mockJiraClient.getIssue).mockRejectedValue(genericError);

      // Act
      const result = await executeAnalyzeTicketPrompt(
        { issueKey: 'PROJ-8888' },
        mockJiraClient,
      );

      // Assert
      expect(result.error).toContain('Failed to analyze ticket');
      expect(result.error).toContain('Network timeout');
      expect(result.content).toBe('');
    });

    it('should handle unknown errors', async () => {
      // Arrange
      vi.mocked(mockJiraClient.getIssue).mockRejectedValue('Unknown error');

      // Act
      const result = await executeAnalyzeTicketPrompt(
        { issueKey: 'PROJ-7777' },
        mockJiraClient,
      );

      // Assert
      expect(result.error).toBe(
        'An unexpected error occurred while preparing ticket analysis.',
      );
      expect(result.content).toBe('');
    });

    it('should include linked issues when present', async () => {
      // Arrange
      const mockIssue: JiraIssue = {
        key: 'PROJ-222',
        fields: {
          summary: 'Issue with links',
          status: { name: 'To Do' },
          issuetype: { name: 'Story' },
          issuelinks: [
            {
              type: { name: 'Blocks', inward: 'is blocked by', outward: 'blocks' },
              inwardIssue: { key: 'PROJ-223', fields: { summary: 'Blocked issue' } },
            },
          ],
          project: { key: 'PIX', name: 'Pix Project' },
          created: '2025-01-01T10:00:00.000Z',
          updated: '2025-01-02T15:30:00.000Z',
        },
      };

      vi.mocked(mockJiraClient.getIssue).mockResolvedValue(mockIssue);

      // Act
      const result = await executeAnalyzeTicketPrompt({ issueKey: 'PROJ-222' }, mockJiraClient);

      // Assert
      expect(result.content).toContain('Related Issues:');
      expect(result.content).toContain('PROJ-223');
    });

    it('should include custom fields when present', async () => {
      // Arrange
      const mockIssue: JiraIssue = {
        key: 'PROJ-333',
        fields: {
          summary: 'Issue with custom fields',
          status: { name: 'To Do' },
          issuetype: { name: 'Story' },
          customfield_10001: { value: 'Team Alpha' },
          customfield_10002: { value: 'Backend Service' },
          project: { key: 'PIX', name: 'Pix Project' },
          created: '2025-01-01T10:00:00.000Z',
          updated: '2025-01-02T15:30:00.000Z',
        },
      };

      vi.mocked(mockJiraClient.getIssue).mockResolvedValue(mockIssue);

      // Act
      const result = await executeAnalyzeTicketPrompt({ issueKey: 'PROJ-333' }, mockJiraClient);

      // Assert
      expect(result.content).toContain('Custom Fields:');
    });
  });
});
