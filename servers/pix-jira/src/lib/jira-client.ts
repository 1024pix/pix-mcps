import type { Config } from '../config.js';
import type { JiraIssue, JiraApiError } from '../types/jira.js';
import { createLogger } from '@pix-mcps/shared';

const logger = createLogger('jira-client');

/**
 * Custom error class for JIRA API errors
 */
export class JiraApiException extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'JiraApiException';
  }
}

/**
 * JIRA API client for interacting with JIRA REST API
 */
export class JiraClient {
  private baseUrl: string;
  private authHeader: string;

  constructor(private config: Config) {
    this.baseUrl = this.normalizeBaseUrl(config.jiraBaseUrl);
    this.authHeader = this.createAuthHeader(config.jiraEmail, config.jiraApiToken);
  }

  /**
   * Creates Basic Authentication header
   * @param email User email
   * @param apiToken API token
   * @returns Base64 encoded auth header value
   */
  private createAuthHeader(email: string, apiToken: string): string {
    const credentials = `${email}:${apiToken}`;
    const base64Credentials = Buffer.from(credentials).toString('base64');
    return `Basic ${base64Credentials}`;
  }

  private normalizeBaseUrl(url: string): string {
    return url.replace(/\/$/, '');
  }

  /**
   * Makes an HTTP request to JIRA API
   * @param endpoint API endpoint (e.g., '/rest/api/3/issue/PROJ-1234')
   * @param options Fetch options
   * @returns Parsed JSON response
   */
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    logger.debug(`Making request to: ${url}`);

    try {
      const response = await this.fetchWithAuth(url, options);

      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      return await response.json() as T;
    } catch (error) {
      return this.handleRequestError(error);
    }
  }

  private async fetchWithAuth(url: string, options: RequestInit): Promise<Response> {
    return fetch(url, {
      ...options,
      headers: {
        Authorization: this.authHeader,
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
  }

  private handleRequestError(error: unknown): never {
    if (error instanceof JiraApiException) {
      throw error;
    }

    logger.error('Request failed', error);
    throw new JiraApiException(
      'Failed to connect to JIRA. Please check your network connection and JIRA URL.',
      undefined,
      error,
    );
  }

  /**
   * Handles error responses from JIRA API
   * @param response HTTP response
   */
  private async handleErrorResponse(response: Response): Promise<never> {
    const statusCode = response.status;
    const errorMessage = await this.extractErrorMessage(response);

    throw this.createUserFriendlyException(statusCode, errorMessage);
  }

  private async extractErrorMessage(response: Response): Promise<string> {
    const defaultMessage = `JIRA API request failed with status ${response.status}`;

    try {
      const errorData = (await response.json()) as JiraApiError;
      return this.parseJiraErrorData(errorData) || defaultMessage;
    } catch {
      return response.statusText || defaultMessage;
    }
  }

  private parseJiraErrorData(errorData: JiraApiError): string | null {
    if (errorData.errorMessages && errorData.errorMessages.length > 0) {
      return errorData.errorMessages.join(', ');
    }

    if (errorData.errors) {
      const formattedErrors = Object.entries(errorData.errors)
        .map(([field, msg]) => `${field}: ${msg}`)
        .join(', ');
      return formattedErrors;
    }

    return null;
  }

  private createUserFriendlyException(statusCode: number, defaultMessage: string): JiraApiException {
    const errorMessages: Record<number, string> = {
      401: 'Authentication failed. Please check your JIRA email and API token.',
      403: 'Access denied. You do not have permission to access this resource.',
      404: 'The requested JIRA issue was not found.',
      429: 'Rate limit exceeded. Please try again later.',
      500: 'JIRA service is currently unavailable. Please try again later.',
      502: 'JIRA service is currently unavailable. Please try again later.',
      503: 'JIRA service is currently unavailable. Please try again later.',
    };

    const message = errorMessages[statusCode] || defaultMessage;
    return new JiraApiException(message, statusCode);
  }

  /**
   * Retrieves a JIRA issue by its key or ID
   * @param issueKey Issue key (e.g., 'PROJ-1234') or ID
   * @param fields Optional array of fields to retrieve (default: all)
   * @param expand Optional array of entities to expand
   * @returns JIRA issue data
   */
  async getIssue(issueKey: string, fields?: string[], expand?: string[]): Promise<JiraIssue> {
    const endpoint = this.buildIssueEndpoint(issueKey, fields, expand);

    logger.info(`Fetching issue: ${issueKey}`);

    return this.request<JiraIssue>(endpoint);
  }

  private buildIssueEndpoint(issueKey: string, fields?: string[], expand?: string[]): string {
    const params = new URLSearchParams();

    if (fields && fields.length > 0) {
      params.append('fields', fields.join(','));
    }

    if (expand && expand.length > 0) {
      params.append('expand', expand.join(','));
    }

    const queryString = params.toString();
    return `/rest/api/3/issue/${issueKey}${queryString ? `?${queryString}` : ''}`;
  }

  /**
   * Tests the connection to JIRA and validates credentials
   * @returns true if connection is successful
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.fetchServerInfo();
      logger.info('JIRA connection test successful');
      return true;
    } catch (error) {
      logger.error('JIRA connection test failed', error);
      throw error;
    }
  }

  private async fetchServerInfo(): Promise<unknown> {
    return this.request('/rest/api/3/serverInfo');
  }
}
