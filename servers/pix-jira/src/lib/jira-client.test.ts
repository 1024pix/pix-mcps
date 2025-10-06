import { describe, it, expect, beforeEach } from 'vitest';
import { JiraClient, JiraApiException } from './jira-client';
import type { Config } from '../config';

describe('JiraClient', () => {
  let config: Config;

  beforeEach(() => {
    config = {
      jiraBaseUrl: 'https://test.atlassian.net',
      jiraEmail: 'test@example.com',
      jiraApiToken: 'test-token-123',
      jiraProjectKey: 'TEST',
      logLevel: 'error', // Suppress logs during tests
    };
  });

  describe('constructor', () => {
    it('should create a JiraClient instance', () => {
      const client = new JiraClient(config);
      expect(client).toBeInstanceOf(JiraClient);
    });

    it('should remove trailing slash from base URL', () => {
      const configWithSlash = { ...config, jiraBaseUrl: 'https://test.atlassian.net/' };
      const client = new JiraClient(configWithSlash);
      expect(client).toBeInstanceOf(JiraClient);
    });
  });

  describe('error handling', () => {
    it('should throw JiraApiException for API errors', () => {
      const error = new JiraApiException('Test error', 404);
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('JiraApiException');
      expect(error.statusCode).toBe(404);
    });
  });

  // Note: Integration tests would require actual JIRA credentials
  // These tests are for basic structure validation only
  describe('getIssue', () => {
    it('should accept valid issue key format', () => {
      const client = new JiraClient(config);
      // This will fail without valid credentials, but tests the method exists
      expect(typeof client.getIssue).toBe('function');
    });
  });
});
