import type { JiraClient } from '../lib/jira-client.js';
import { JiraApiException } from '../lib/jira-client.js';
import type { JiraIssue } from '../types/jira.js';
import { createLogger } from '@pix-mcps/shared';

const logger = createLogger('analyze-ticket-prompt');

const ISSUE_FIELDS_TO_FETCH = [
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
];

export const analyzeTicketPrompt = {
  name: 'analyze_ticket',
  description:
    'Analyzes a JIRA ticket to provide technical insights including complexity assessment, potential risks, dependencies, and recommended development approach',
  arguments: [
    {
      name: 'issueKey',
      description: 'The JIRA issue key to analyze (e.g., PROJ-1234)',
      required: true,
    },
  ],
};

function formatIssueForAnalysis(issue: JiraIssue): string {
  const { fields } = issue;
  const sections: string[] = [];

  addBasicInformationSection(sections, issue.key, fields);
  addSummarySection(sections, fields);
  addDescriptionSection(sections, fields);
  addParentIssueSection(sections, fields);
  addLabelsSection(sections, fields);
  addRelatedIssuesSection(sections, fields);
  addCustomFieldsSection(sections, fields);
  addJiraLinkSection(sections, issue);

  return sections.join('\n');
}

function addBasicInformationSection(sections: string[], issueKey: string, fields: any): void {
  sections.push(`**Key:** ${issueKey}`);
  sections.push(`**Type:** ${fields.issuetype?.name || 'Unknown'}`);
  sections.push(`**Status:** ${fields.status?.name || 'Unknown'}`);

  if (fields.priority?.name) {
    sections.push(`**Priority:** ${fields.priority.name}`);
  }
}

function addSummarySection(sections: string[], fields: any): void {
  sections.push('');
  sections.push(`**Summary:**`);
  sections.push(fields.summary || 'No summary');
}

function addDescriptionSection(sections: string[], fields: any): void {
  if (!fields.description) return;

  sections.push('');
  sections.push(`**Description:**`);
  const description =
    typeof fields.description === 'string' ? fields.description : '[Complex formatted content]';
  sections.push(description);
}

function addParentIssueSection(sections: string[], fields: any): void {
  if (!fields.parent) return;

  sections.push('');
  sections.push(
    `**Parent Issue:** ${fields.parent.key} - ${fields.parent.fields?.summary || ''}`,
  );
}

function addLabelsSection(sections: string[], fields: any): void {
  if (!fields.labels || fields.labels.length === 0) return;

  sections.push('');
  sections.push(`**Labels:** ${fields.labels.join(', ')}`);
}

function addRelatedIssuesSection(sections: string[], fields: any): void {
  if (!fields.issuelinks || fields.issuelinks.length === 0) return;

  sections.push('');
  sections.push('**Related Issues:**');

  fields.issuelinks.forEach((link: any) => {
    if (link.outwardIssue) {
      const relationshipType = link.type?.outward || 'relates to';
      const relatedIssue = `${link.outwardIssue.key} - ${link.outwardIssue.fields?.summary || ''}`;
      sections.push(`- ${relationshipType}: ${relatedIssue}`);
    }
    if (link.inwardIssue) {
      const relationshipType = link.type?.inward || 'relates to';
      const relatedIssue = `${link.inwardIssue.key} - ${link.inwardIssue.fields?.summary || ''}`;
      sections.push(`- ${relationshipType}: ${relatedIssue}`);
    }
  });
}

function addCustomFieldsSection(sections: string[], fields: any): void {
  const customFieldsText = extractCustomFieldsText(fields);
  if (customFieldsText) {
    sections.push('');
    sections.push(customFieldsText);
  }
}

function addJiraLinkSection(sections: string[], issue: JiraIssue): void {
  const browseUrl =
    issue.self?.replace('/rest/api/3/issue/', '/browse/') ||
    `https://jira.example.com/browse/${issue.key}`;
  sections.push('');
  sections.push(`**View in JIRA:** ${browseUrl}`);
}

function extractCustomFieldsText(fields: any): string {
  const customFieldLines: string[] = [];

  Object.keys(fields).forEach((fieldKey) => {
    if (fieldKey.startsWith('customfield_')) {
      const fieldValue = fields[fieldKey];
      if (fieldValue) {
        const formattedValue = extractFieldValue(fieldValue);
        if (formattedValue) {
          customFieldLines.push(`- ${fieldKey}: ${formattedValue}`);
        }
      }
    }
  });

  if (customFieldLines.length > 0) {
    return `**Custom Fields:**\n${customFieldLines.join('\n')}`;
  }

  return '';
}

function extractFieldValue(value: any): string | null {
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value);
  }

  if (value && typeof value === 'object') {
    if ('value' in value) return value.value;
    if ('name' in value) return value.name;
    if (Array.isArray(value)) {
      return value
        .map((item) => item?.value || item?.name || item)
        .filter(Boolean)
        .join(', ');
    }
  }

  return null;
}

function createAnalysisPromptMessage(issueDetails: string): string {
  return `Please analyze the following JIRA ticket and provide:

1. **Complexity Assessment** (Low/Medium/High)
   - Evaluate the technical complexity
   - Consider scope and number of changes required

2. **Potential Risks**
   - Identify technical risks
   - Consider dependencies and integration points
   - Note any security or performance concerns

3. **Dependencies**
   - List technical dependencies (APIs, libraries, services)
   - Identify related tickets or blockers
   - Note any required infrastructure

4. **Recommended Approach**
   - Suggest implementation strategy
   - Recommend breaking down into subtasks if needed
   - Propose testing strategy

---

## Ticket Details

${issueDetails}
`;
}

export async function executeAnalyzeTicketPrompt(
  args: { issueKey: string },
  jiraClient: JiraClient,
): Promise<{ content: string; error?: string }> {
  try {
    logger.info(`Analyzing ticket: ${args.issueKey}`);

    const normalizedIssueKey = args.issueKey.trim().toUpperCase();
    const issue = await jiraClient.getIssue(normalizedIssueKey, ISSUE_FIELDS_TO_FETCH, []);

    const issueDetails = formatIssueForAnalysis(issue);
    const promptMessage = createAnalysisPromptMessage(issueDetails);

    logger.info(`Successfully prepared analysis prompt for: ${normalizedIssueKey}`);

    return { content: promptMessage };
  } catch (error) {
    logger.error('Failed to prepare ticket analysis', error);

    if (error instanceof JiraApiException) {
      return { content: '', error: error.message };
    }

    if (error instanceof Error) {
      return { content: '', error: `Failed to analyze ticket: ${error.message}` };
    }

    return { content: '', error: 'An unexpected error occurred while preparing ticket analysis.' };
  }
}
