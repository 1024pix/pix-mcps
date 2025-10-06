import 'dotenv/config';
import { z } from 'zod';

/**
 * Configuration schema for JIRA MCP server
 */
const configSchema = z.object({
  jiraBaseUrl: z.string().url().describe('JIRA instance base URL'),
  jiraEmail: z.string().email().describe('JIRA user email for authentication'),
  jiraApiToken: z.string().min(1).describe('JIRA API token'),
  jiraProjectKey: z.string().optional().describe('Default JIRA project key'),
  logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info').describe('Logging level'),
});

export type Config = z.infer<typeof configSchema>;

/**
 * Loads and validates configuration from environment variables
 * @throws {Error} If required environment variables are missing or invalid
 */
export function loadConfig(): Config {
  try {
    const config = configSchema.parse({
      jiraBaseUrl: process.env.JIRA_BASE_URL,
      jiraEmail: process.env.JIRA_EMAIL,
      jiraApiToken: process.env.JIRA_API_TOKEN,
      jiraProjectKey: process.env.JIRA_PROJECT_KEY,
      logLevel: process.env.LOG_LEVEL || 'info',
    });

    return config;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingFields = error.issues.map((issue) => issue.path.join('.')).join(', ');
      throw new Error(
        `Configuration validation failed. Missing or invalid fields: ${missingFields}. ` +
          `Please check your .env file and ensure all required variables are set.`,
      );
    }
    throw error;
  }
}
