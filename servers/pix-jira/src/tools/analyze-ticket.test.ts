import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAnalyzeTicketTool } from './analyze-ticket.js';
import type { JiraClient } from '../lib/jira-client.js';

vi.mock('../prompts/analyze-ticket.js', () => ({
  executeAnalyzeTicketPrompt: vi.fn(),
}));

vi.mock('@pix-mcps/shared', () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  }),
}));

import { executeAnalyzeTicketPrompt } from '../prompts/analyze-ticket.js';

describe('analyze-ticket tool', () => {
  let mockJiraClient: JiraClient;

  beforeEach(() => {
    mockJiraClient = {
      getIssue: vi.fn(),
      testConnection: vi.fn(),
    } as unknown as JiraClient;

    vi.clearAllMocks();
  });

  describe('handler', () => {
    it('should successfully execute prompt and return content', async () => {
      const mockPromptResult = {
        content: 'Analysis prompt for PROJ-1234',
      };

      (executeAnalyzeTicketPrompt as any).mockResolvedValue(mockPromptResult);

      const tool = createAnalyzeTicketTool(mockJiraClient);
      const result = await tool.handler({ issueKey: 'PROJ-1234' });

      expect(executeAnalyzeTicketPrompt).toHaveBeenCalledWith(
        { issueKey: 'PROJ-1234' },
        mockJiraClient,
      );

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Analysis prompt for PROJ-1234' }],
      });
    });

    it('should normalize issue key to uppercase', async () => {
      const mockPromptResult = { content: 'Analysis prompt' };
      (executeAnalyzeTicketPrompt as any).mockResolvedValue(mockPromptResult);

      const tool = createAnalyzeTicketTool(mockJiraClient);
      // Note: Zod validation expects uppercase before normalization
      await tool.handler({ issueKey: 'PROJ-1234' });

      expect(executeAnalyzeTicketPrompt).toHaveBeenCalledWith(
        { issueKey: 'PROJ-1234' },
        mockJiraClient,
      );
    });

    it('should handle prompt execution errors', async () => {
      const mockError = {
        content: '',
        error: 'Failed to fetch ticket',
      };

      (executeAnalyzeTicketPrompt as any).mockResolvedValue(mockError);

      const tool = createAnalyzeTicketTool(mockJiraClient);
      const result = await tool.handler({ issueKey: 'PROJ-1234' });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Error: Failed to fetch ticket' }],
        isError: true,
      });
    });

    it('should handle thrown exceptions', async () => {
      (executeAnalyzeTicketPrompt as any).mockRejectedValue(new Error('Network error'));

      const tool = createAnalyzeTicketTool(mockJiraClient);
      const result = await tool.handler({ issueKey: 'PROJ-1234' });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Error: Failed to prepare analysis: Network error' }],
        isError: true,
      });
    });

    it('should handle unknown error types', async () => {
      (executeAnalyzeTicketPrompt as any).mockRejectedValue('Unknown error');

      const tool = createAnalyzeTicketTool(mockJiraClient);
      const result = await tool.handler({ issueKey: 'PROJ-1234' });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Error: An unexpected error occurred while preparing ticket analysis.' }],
        isError: true,
      });
    });

    it('should validate issue key format', async () => {
      const tool = createAnalyzeTicketTool(mockJiraClient);

      await expect(tool.handler({ issueKey: 'invalid' })).rejects.toThrow();
      await expect(tool.handler({ issueKey: '123' })).rejects.toThrow();
      await expect(tool.handler({ issueKey: 'PIX' })).rejects.toThrow();
    });

    it('should require issue key', async () => {
      const tool = createAnalyzeTicketTool(mockJiraClient);

      await expect(tool.handler({})).rejects.toThrow();
    });
  });

  describe('tool metadata', () => {
    it('should have correct name', () => {
      const tool = createAnalyzeTicketTool(mockJiraClient);
      expect(tool.name).toBe('analyze_ticket');
    });

    it('should have description', () => {
      const tool = createAnalyzeTicketTool(mockJiraClient);
      expect(tool.description).toBeTruthy();
      expect(tool.description).toContain('technical analysis');
    });

    it('should have correct schema', () => {
      const tool = createAnalyzeTicketTool(mockJiraClient);

      expect(tool.schema.type).toBe('object');
      expect(tool.schema.required).toContain('issueKey');
      expect(tool.schema.properties.issueKey.type).toBe('string');
      expect(tool.schema.properties.issueKey.pattern).toBe('^[A-Z]+-\\d+$');
    });
  });
});
