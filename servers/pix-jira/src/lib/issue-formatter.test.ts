import { describe, it, expect } from 'vitest';
import { formatIssue, formatIssueSummary } from './issue-formatter.js';
import type { JiraIssue } from '../types/jira.js';

describe('issue-formatter', () => {
  const createMockIssue = (overrides?: Partial<JiraIssue>): JiraIssue =>
    ({
      key: 'PROJ-1234',
      self: 'https://YOURWORKSPACE.atlassian.net/rest/api/3/issue/12345',
      fields: {
        summary: 'Test issue summary',
        description: 'Test description',
        status: {
          name: 'In Progress',
          statusCategory: { name: 'Doing' },
        },
        assignee: {
          displayName: 'John Doe',
        },
        reporter: {
          displayName: 'Jane Doe',
        },
        priority: {
          name: 'High',
        },
        created: '2025-01-01T10:00:00.000Z',
        updated: '2025-01-02T15:30:00.000Z',
        labels: ['backend', 'bug'],
        fixVersions: [
          {
            name: 'v1.0.0',
            released: true,
            releaseDate: '2025-01-15',
          },
        ],
        issuetype: {
          name: 'Bug',
        },
        project: {
          key: 'PIX',
          name: 'Pix',
        },
        parent: {
          key: 'PROJ-1000',
          fields: {
            summary: 'Parent epic',
            issuetype: { name: 'Epic' },
          },
        },
        issuelinks: [
          {
            type: {
              inward: 'is blocked by',
              outward: 'blocks',
            },
            outwardIssue: {
              key: 'PROJ-2000',
              fields: {
                summary: 'Blocking issue',
              },
            },
          },
        ],
        comment: {
          total: 2,
          comments: [
            {
              author: { displayName: 'Alice' },
              body: 'First comment',
              created: '2025-01-01T12:00:00.000Z',
            },
            {
              author: { displayName: 'Bob' },
              body: 'Second comment',
              created: '2025-01-02T14:00:00.000Z',
            },
          ],
        },
      },
      ...overrides,
    }) as JiraIssue;

  describe('formatIssue', () => {
    it('should format issue with all sections', () => {
      const issue = createMockIssue();
      const result = formatIssue(issue);

      expect(result).toContain('# PROJ-1234: Test issue summary');
      expect(result).toContain('## Basic Information');
      expect(result).toContain('**Status**: In Progress (Doing)');
      expect(result).toContain('**Type**: Bug');
      expect(result).toContain('**Priority**: High');
      expect(result).toContain('**Project**: Pix (PIX)');
    });

    it('should include people section', () => {
      const issue = createMockIssue();
      const result = formatIssue(issue);

      expect(result).toContain('## People');
      expect(result).toContain('**Assignee**: John Doe');
      expect(result).toContain('**Reporter**: Jane Doe');
    });

    it('should show "Unassigned" when no assignee', () => {
      const issue = createMockIssue();
      issue.fields.assignee = null;
      const result = formatIssue(issue);

      expect(result).toContain('**Assignee**: Unassigned');
    });

    it('should include parent issue section', () => {
      const issue = createMockIssue();
      const result = formatIssue(issue);

      expect(result).toContain('## Parent Issue');
      expect(result).toContain('**PROJ-1000**: Parent epic');
      expect(result).toContain('**Type**: Epic');
    });

    it('should omit parent issue section when no parent', () => {
      const issue = createMockIssue();
      issue.fields.parent = undefined;
      const result = formatIssue(issue);

      expect(result).not.toContain('## Parent Issue');
    });

    it('should include description', () => {
      const issue = createMockIssue();
      const result = formatIssue(issue);

      expect(result).toContain('## Description');
      expect(result).toContain('Test description');
    });

    it('should omit description section when no description', () => {
      const issue = createMockIssue();
      issue.fields.description = null;
      const result = formatIssue(issue);

      expect(result).not.toContain('## Description');
    });

    it('should include labels section', () => {
      const issue = createMockIssue();
      const result = formatIssue(issue);

      expect(result).toContain('## Labels');
      expect(result).toContain('- backend');
      expect(result).toContain('- bug');
    });

    it('should omit labels section when no labels', () => {
      const issue = createMockIssue();
      issue.fields.labels = [];
      const result = formatIssue(issue);

      expect(result).not.toContain('## Labels');
    });

    it('should include fix versions section', () => {
      const issue = createMockIssue();
      const result = formatIssue(issue);

      expect(result).toContain('## Fix Versions');
      expect(result).toContain('v1.0.0');
      expect(result).toContain('✓ Released');
      expect(result).toContain('2025-01-15');
    });

    it('should show unreleased versions', () => {
      const issue = createMockIssue();
      issue.fields.fixVersions = [
        {
          id: '20001',
          name: 'v2.0.0',
          released: false,
        },
      ];
      const result = formatIssue(issue);

      expect(result).toContain('v2.0.0');
      expect(result).toContain('○ Unreleased');
    });

    it('should omit fix versions section when empty', () => {
      const issue = createMockIssue();
      issue.fields.fixVersions = [];
      const result = formatIssue(issue);

      expect(result).not.toContain('## Fix Versions');
    });

    it('should include related issues section', () => {
      const issue = createMockIssue();
      const result = formatIssue(issue);

      expect(result).toContain('## Related Issues');
      expect(result).toContain('**blocks**: PROJ-2000 - Blocking issue');
    });

    it('should handle inward issue links', () => {
      const issue = createMockIssue();
      issue.fields.issuelinks = [
        {
          type: {
            name: 'Blocks',
            inward: 'is blocked by',
            outward: 'blocks',
          },
          inwardIssue: {
            key: 'PROJ-3000',
            fields: {
              summary: 'Inward issue',
              status: { name: 'To Do', statusCategory: { name: 'To Do' } },
            },
          },
        },
      ];
      const result = formatIssue(issue);

      expect(result).toContain('**is blocked by**: PROJ-3000 - Inward issue');
    });

    it('should omit related issues section when empty', () => {
      const issue = createMockIssue();
      issue.fields.issuelinks = [];
      const result = formatIssue(issue);

      expect(result).not.toContain('## Related Issues');
    });

    it('should include comments section', () => {
      const issue = createMockIssue();
      const result = formatIssue(issue);

      expect(result).toContain('## Comments');
      expect(result).toContain('Total comments: 2');
      expect(result).toContain('### Recent Comments:');
      expect(result).toContain('**Alice**');
      expect(result).toContain('First comment');
      expect(result).toContain('**Bob**');
      expect(result).toContain('Second comment');
    });

    it('should omit comments section when no comments', () => {
      const issue = createMockIssue();
      issue.fields.comment = { total: 0, comments: [] };
      const result = formatIssue(issue);

      expect(result).not.toContain('## Comments');
    });

    it('should include timeline section', () => {
      const issue = createMockIssue();
      const result = formatIssue(issue);

      expect(result).toContain('## Timeline');
      expect(result).toContain('**Created**:');
      expect(result).toContain('**Updated**:');
    });

    it('should include JIRA link', () => {
      const issue = createMockIssue();
      const result = formatIssue(issue);

      expect(result).toContain('**View in JIRA**: https://YOURWORKSPACE.atlassian.net/browse/12345');
    });

    it('should separate sections with horizontal rules', () => {
      const issue = createMockIssue();
      const result = formatIssue(issue);

      expect(result).toContain('\n---\n\n');
    });

    it('should handle complex ADF description', () => {
      const issue = createMockIssue();
      (issue.fields as any).description = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'First paragraph' }],
          },
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Second paragraph' }],
          },
        ],
      };
      const result = formatIssue(issue);

      expect(result).toContain('First paragraph');
      expect(result).toContain('Second paragraph');
    });

    it('should handle custom fields (equipix)', () => {
      const issue = createMockIssue();
      (issue.fields as any).customfield_10253 = [{ name: 'Team A' }, { name: 'Team B' }];
      const result = formatIssue(issue);

      expect(result).toContain('## Pix Custom Fields');
      expect(result).toContain('**Equipe Pix**: Team A, Team B');
    });

    it('should handle custom fields (appli pix)', () => {
      const issue = createMockIssue();
      (issue.fields as any).customfield_10117 = { value: 'Pix App' };
      const result = formatIssue(issue);

      expect(result).toContain('**Appli Pix**: Pix App');
    });
  });

  describe('formatIssueSummary', () => {
    it('should format issue summary with key, title, status, and assignee', () => {
      const issue = createMockIssue();
      const result = formatIssueSummary(issue);

      expect(result).toBe('PROJ-1234: Test issue summary [In Progress] - John Doe');
    });

    it('should show "Unassigned" when no assignee', () => {
      const issue = createMockIssue();
      issue.fields.assignee = null;
      const result = formatIssueSummary(issue);

      expect(result).toBe('PROJ-1234: Test issue summary [In Progress] - Unassigned');
    });

    it('should include status name', () => {
      const issue = createMockIssue();
      issue.fields.status.name = 'Done';
      const result = formatIssueSummary(issue);

      expect(result).toContain('[Done]');
    });
  });
});
