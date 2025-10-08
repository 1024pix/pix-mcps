import type { JiraIssue, JiraIssueFields } from '../types/jira.js';

const RECENT_COMMENTS_LIMIT = 3;

const PIX_CUSTOM_FIELDS = {
  EQUIPIX: 'customfield_10253',
  APPLI_PIX: 'customfield_10117',
  DEVELOPMENT: 'customfield_10000',
  RESOLUTION_SEMESTER: 'customfield_10257',
} as const;

/**
 * Formats a JIRA issue into a human-readable text representation
 */
export function formatIssue(issue: JiraIssue): string {
  const sections: string[] = [
    formatIssueHeader(issue),
    formatBasicInformation(issue.fields),
    formatPeopleSection(issue.fields),
    formatParentIssueSection(issue.fields),
    formatDescriptionSection(issue.fields),
    formatLabelsSection(issue.fields),
    formatFixVersionsSection(issue.fields),
    formatRelatedIssuesSection(issue.fields),
    formatCustomFieldsSection(issue.fields),
    formatCommentsSection(issue.fields),
    formatTimelineSection(issue.fields),
    formatIssueLink(issue),
  ];

  return sections.filter(Boolean).join('\n---\n\n');
}

function formatIssueHeader(issue: JiraIssue): string {
  return `# ${issue.key}: ${issue.fields.summary}\n`;
}

function formatBasicInformation(fields: JiraIssueFields): string {
  const lines = [
    '## Basic Information',
    '',
    `- **Status**: ${fields.status.name} (${fields.status.statusCategory.name})`,
    `- **Type**: ${fields.issuetype.name}`,
    `- **Priority**: ${fields.priority.name}`,
    `- **Project**: ${fields.project.name} (${fields.project.key})`,
    '',
  ];
  return lines.join('\n');
}

function formatPeopleSection(fields: JiraIssueFields): string {
  const assigneeName = fields.assignee ? fields.assignee.displayName : 'Unassigned';
  const lines = [
    '## People',
    '',
    `- **Assignee**: ${assigneeName}`,
    `- **Reporter**: ${fields.reporter.displayName}`,
    '',
  ];
  return lines.join('\n');
}

function formatParentIssueSection(fields: JiraIssueFields): string {
  if (!fields.parent) {
    return '';
  }

  const lines = [
    '## Parent Issue',
    '',
    `- **${fields.parent.key}**: ${fields.parent.fields.summary}`,
    `- **Type**: ${fields.parent.fields.issuetype.name}`,
    '',
  ];
  return lines.join('\n');
}

function formatDescriptionSection(fields: JiraIssueFields): string {
  if (!fields.description) {
    return '';
  }

  const lines = ['## Description', '', formatDescription(fields.description), ''];
  return lines.join('\n');
}

function formatLabelsSection(fields: JiraIssueFields): string {
  if (!fields.labels || fields.labels.length === 0) {
    return '';
  }

  const labelsList = fields.labels.map((label) => `- ${label}`).join('\n');
  return `## Labels\n\n${labelsList}\n`;
}

function formatFixVersionsSection(fields: JiraIssueFields): string {
  if (!fields.fixVersions || fields.fixVersions.length === 0) {
    return '';
  }

  const lines = ['## Fix Versions', ''];
  fields.fixVersions.forEach((version) => {
    const releaseStatus = version.released ? '✓ Released' : '○ Unreleased';
    const releaseDate = version.releaseDate ? ` (${version.releaseDate})` : '';
    lines.push(`- ${version.name} ${releaseStatus}${releaseDate}`);
  });
  lines.push('');

  return lines.join('\n');
}

function formatRelatedIssuesSection(fields: JiraIssueFields): string {
  if (!fields.issuelinks || fields.issuelinks.length === 0) {
    return '';
  }

  const lines = ['## Related Issues', ''];
  fields.issuelinks.forEach((link) => {
    if (link.outwardIssue) {
      lines.push(`- **${link.type.outward}**: ${link.outwardIssue.key} - ${link.outwardIssue.fields.summary}`);
    }
    if (link.inwardIssue) {
      lines.push(`- **${link.type.inward}**: ${link.inwardIssue.key} - ${link.inwardIssue.fields.summary}`);
    }
  });
  lines.push('');

  return lines.join('\n');
}

function formatCustomFieldsSection(fields: JiraIssueFields): string {
  const customFields = extractCustomFields(fields);

  if (Object.keys(customFields).length === 0) {
    return '';
  }

  const lines = ['## Pix Custom Fields', ''];
  Object.entries(customFields).forEach(([key, value]) => {
    if (value) {
      lines.push(`- **${key}**: ${value}`);
    }
  });
  lines.push('');

  return lines.join('\n');
}

function formatCommentsSection(fields: JiraIssueFields): string {
  if (!fields.comment || fields.comment.total === 0) {
    return '';
  }

  const lines = ['## Comments', '', `Total comments: ${fields.comment.total}`];

  if (fields.comment.comments && fields.comment.comments.length > 0) {
    lines.push('', '### Recent Comments:', '');
    const recentComments = fields.comment.comments.slice(-RECENT_COMMENTS_LIMIT);

    recentComments.forEach((comment) => {
      const commentDate = new Date(comment.created).toLocaleDateString();
      lines.push(`**${comment.author.displayName}** (${commentDate}):`);
      lines.push(formatDescription(comment.body));
      lines.push('');
    });
  }

  lines.push('');
  return lines.join('\n');
}

function formatTimelineSection(fields: JiraIssueFields): string {
  const lines = [
    '## Timeline',
    '',
    `- **Created**: ${new Date(fields.created).toLocaleString()}`,
    `- **Updated**: ${new Date(fields.updated).toLocaleString()}`,
    '',
  ];
  return lines.join('\n');
}

function formatIssueLink(issue: JiraIssue): string {
  const browseUrl = issue.self.replace('/rest/api/3/issue/', '/browse/');
  return `**View in JIRA**: ${browseUrl}`;
}

/**
 * Formats JIRA description/comment text
 * Handles basic Atlassian Document Format (ADF) or plain text
 */
function formatDescription(description: string | unknown): string {
  if (typeof description === 'string') {
    return description;
  }

  if (typeof description === 'object' && description !== null) {
    const extractedText = extractTextFromADF(description);
    return extractedText || '[Complex formatted content - view in JIRA]';
  }

  return '[No description]';
}

/**
 * Extracts plain text from Atlassian Document Format (ADF)
 * This is a simplified version - full ADF parsing would be more complex
 */
function extractTextFromADF(adf: any): string {
  if (!adf || typeof adf !== 'object') {
    return '';
  }

  if (Array.isArray(adf.content)) {
    return adf.content.map(extractTextFromADF).filter(Boolean).join('\n\n');
  }

  if (adf.type === 'text' && adf.text) {
    return adf.text;
  }

  if (adf.type === 'paragraph' && Array.isArray(adf.content)) {
    return adf.content.map(extractTextFromADF).filter(Boolean).join('');
  }

  return '';
}

/**
 * Extracts Pix-specific custom fields from JIRA issue
 */
function extractCustomFields(fields: any): Record<string, string> {
  const customFields: Record<string, string> = {};

  if (fields[PIX_CUSTOM_FIELDS.EQUIPIX]) {
    const equipix = extractArrayFieldValue(fields[PIX_CUSTOM_FIELDS.EQUIPIX]);
    if (equipix) {
      customFields['Equipe Pix'] = equipix;
    }
  }

  if (fields[PIX_CUSTOM_FIELDS.APPLI_PIX]) {
    const appliPix = extractCustomFieldValue(fields[PIX_CUSTOM_FIELDS.APPLI_PIX]);
    if (appliPix) {
      customFields['Appli Pix'] = appliPix;
    }
  }

  if (fields[PIX_CUSTOM_FIELDS.DEVELOPMENT]) {
    const development = extractDevelopmentInfo(fields[PIX_CUSTOM_FIELDS.DEVELOPMENT]);
    if (development) {
      customFields['Development'] = development;
    }
  }

  if (fields[PIX_CUSTOM_FIELDS.RESOLUTION_SEMESTER]) {
    const semester = extractCustomFieldValue(fields[PIX_CUSTOM_FIELDS.RESOLUTION_SEMESTER]);
    if (semester) {
      customFields['Resolution Semester'] = semester;
    }
  }

  return customFields;
}

function extractDevelopmentInfo(devData: unknown): string | null {
  if (typeof devData !== 'string') {
    return null;
  }

  try {
    const match = devData.match(/repository=\{count=(\d+)/);
    if (match) {
      const repoCount = match[1];
      return `${repoCount} repository/repositories linked`;
    }

    const jsonMatch = devData.match(/json=(\{.*\})/);
    if (jsonMatch) {
      const json = JSON.parse(jsonMatch[1]);
      const repoData = json.cachedValue?.summary?.repository?.overall;
      if (repoData) {
        return `${repoData.count} repository/repositories, last updated ${new Date(repoData.lastUpdated).toLocaleDateString()}`;
      }
    }
  } catch {
    return 'Development info available (view in JIRA)';
  }

  return null;
}

function extractCustomFieldValue(value: unknown): string | null {
  if (typeof value === 'object' && value !== null) {
    if ('value' in value) {
      return (value as { value: string }).value;
    }
    if ('name' in value) {
      return (value as { name: string }).name;
    }
  }

  if (typeof value === 'string' || typeof value === 'number') {
    return String(value);
  }

  if (Array.isArray(value)) {
    return extractArrayFieldValue(value);
  }

  return null;
}

function extractArrayFieldValue(values: unknown[]): string | null {
  const names = values
    .map((item) => {
      if (typeof item === 'object' && item !== null) {
        if ('value' in item) {
          return (item as { value: string }).value;
        }
        if ('name' in item) {
          return (item as { name: string }).name;
        }
      }
      if (typeof item === 'string') {
        return item;
      }
      return null;
    })
    .filter(Boolean);

  return names.length > 0 ? names.join(', ') : null;
}

/**
 * Creates a short summary of an issue (for lists)
 */
export function formatIssueSummary(issue: JiraIssue): string {
  const assigneeName = issue.fields.assignee ? issue.fields.assignee.displayName : 'Unassigned';
  return `${issue.key}: ${issue.fields.summary} [${issue.fields.status.name}] - ${assigneeName}`;
}
