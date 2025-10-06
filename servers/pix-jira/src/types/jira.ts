/**
 * Type definitions for JIRA API responses
 */

export interface JiraUser {
  accountId: string;
  emailAddress?: string;
  displayName: string;
  active: boolean;
  avatarUrls?: {
    '48x48': string;
    '24x24': string;
    '16x16': string;
    '32x32': string;
  };
}

export interface JiraStatus {
  id: string;
  name: string;
  statusCategory: {
    id: number;
    key: string;
    name: string;
    colorName: string;
  };
}

export interface JiraPriority {
  id: string;
  name: string;
  iconUrl?: string;
}

export interface JiraVersion {
  id: string;
  name: string;
  released: boolean;
  releaseDate?: string;
}

export interface JiraIssueType {
  id: string;
  name: string;
  subtask: boolean;
  iconUrl?: string;
}

export interface JiraProject {
  id: string;
  key: string;
  name: string;
}

export interface JiraComment {
  id: string;
  author: JiraUser;
  body: string;
  created: string;
  updated: string;
}

export interface JiraIssueLink {
  id: string;
  type: {
    name: string;
    inward: string;
    outward: string;
  };
  inwardIssue?: {
    key: string;
    fields: {
      summary: string;
      status: JiraStatus;
    };
  };
  outwardIssue?: {
    key: string;
    fields: {
      summary: string;
      status: JiraStatus;
    };
  };
}

/**
 * Development information (branch, PR)
 * Note: This might be in a custom field or available via development-information API
 */
export interface JiraDevelopmentInfo {
  branches?: Array<{
    name: string;
    url?: string;
    repository?: {
      name: string;
      url?: string;
    };
  }>;
  pullRequests?: Array<{
    id: string;
    title: string;
    url: string;
    status: string;
    author?: {
      name: string;
    };
  }>;
}

export interface JiraIssueFields {
  summary: string;
  description?: string | null;
  status: JiraStatus;
  assignee: JiraUser | null;
  reporter: JiraUser;
  priority: JiraPriority;
  created: string;
  updated: string;
  labels: string[];
  fixVersions: JiraVersion[];
  issuetype: JiraIssueType;
  project: JiraProject;
  parent?: {
    key: string;
    fields: {
      summary: string;
      issuetype: JiraIssueType;
    };
  };
  issuelinks?: JiraIssueLink[];
  comment?: {
    comments: JiraComment[];
    total: number;
  };
  // Custom fields - these will vary by JIRA instance
  // We'll need to identify the actual field IDs for:
  // - equipix (team)
  // - appli pix (application)
  [key: string]: unknown;
}

export interface JiraIssue {
  id: string;
  key: string;
  self: string;
  fields: JiraIssueFields;
}

export interface JiraApiError {
  errorMessages?: string[];
  errors?: Record<string, string>;
  statusCode?: number;
}

/**
 * Custom field mappings for Pix JIRA instance
 * These will need to be configured based on actual field IDs
 */
export interface PixCustomFields {
  equipix?: string; // Team field
  appliPix?: string; // Application field
  // Add other custom fields as needed
}
