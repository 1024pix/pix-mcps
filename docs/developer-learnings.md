# Developer Learnings: Building Pix MCP Servers

This document captures key learnings, patterns, and gotchas discovered while building the Pix JIRA MCP server. Use this as a reference when extending existing MCPs or creating new ones.

## Table of Contents

- [Architecture Decisions](#architecture-decisions)
- [Key Learnings](#key-learnings)
- [Anthropic SDK Specifics](#anthropic-sdk-specifics)
- [JIRA API Gotchas](#jira-api-gotchas)
- [Custom Field Discovery](#custom-field-discovery)
- [Code Patterns](#code-patterns)
- [Testing Strategies](#testing-strategies)
- [Common Pitfalls](#common-pitfalls)
- [Performance Considerations](#performance-considerations)
- [Future Improvements](#future-improvements)

## Architecture Decisions

### Why Monorepo Structure?

**Decision:** Use npm workspaces for a monorepo with multiple MCP servers.

**Rationale:**
- **Shared utilities**: Common code (logger, response helpers, types) reused across MCPs
- **Consistent tooling**: Single ESLint, Prettier, TypeScript config
- **Easy dependency management**: Update shared packages once, affects all servers
- **Developer experience**: Test and build all servers with single commands

**Alternative considered:** Separate repos per MCP
- **Rejected because:** Too much duplication, hard to maintain consistency

### Why Pino for Logging?

**Decision:** Use Pino instead of console.log or Winston.

**Rationale:**
- **Performance**: Pino is one of the fastest Node.js loggers (benchmarked)
- **Structured logs**: JSON output in production makes parsing/monitoring easy
- **Pretty dev mode**: `pino-pretty` provides great colored output in development
- **Low overhead**: Minimal performance impact on MCP server

**Implementation:**
```typescript
const logger = createLogger('my-server');
logger.info('Server started');  // Pretty in dev, JSON in prod
```

### Why Self-Documenting Code?

**Decision:** Extract functions with meaningful names instead of inline comments.

**Rationale:**
- **Pix standard**: Matches existing Pix codebase conventions
- **Easier to test**: Small functions can be unit tested independently
- **Better maintainability**: Intent is clear from function names
- **Reduces noise**: No need to update comments when code changes

**Before:**
```typescript
// Parse error response and format message
const error = await response.json();
if (error.errorMessages) {
  // Join error messages
  return error.errorMessages.join(', ');
}
```

**After:**
```typescript
const errorMessage = await extractErrorMessage(response);
return formatUserFriendlyError(errorMessage);
```

### Why Zod for Validation?

**Decision:** Use Zod instead of Joi for this project.

**Rationale:**
- **SDK requirement**: Anthropic SDK's `tool()` function requires Zod schemas
- **Type inference**: Automatic TypeScript type generation from schemas
- **Runtime validation**: Validates environment variables and tool inputs
- **Modern API**: Chainable, intuitive syntax

**Note:** Initially considered Joi (per user preference), but Zod is required by the SDK. If needed elsewhere, use Joi for business logic validation.

## Key Learnings

### 1. MCP Server Lifecycle

**Discovery:** MCP servers using the Anthropic SDK don't have explicit start/stop methods.

**How it works:**
```typescript
createSdkMcpServer({
  name: 'pix-jira',
  version: '1.0.0',
  tools: [tool1, tool2],
});
// Server auto-starts, no need to await or call .start()
```

**Implication:**
- Server initialization must complete before `createSdkMcpServer()` is called
- Connection tests should run before server creation
- Errors during init should exit the process (no graceful recovery)

### 2. Tool Naming Convention

**Discovery:** Tool names in the SDK follow a specific pattern when used with Claude.

**Pattern:** `mcp__{server-name}__{tool-name}`

**Example:**
```typescript
// Server name: 'pix-jira'
// Tool name: 'get_issue'
// Claude sees: 'mcp__pix-jira__get_issue'
```

**Best practice:**
- Keep tool names short and descriptive
- Use snake_case for tool names
- Server name should match package name

### 3. Zod Schema Design for Tools

**Discovery:** Zod schemas define both validation AND the input interface for tools.

**Pattern:**
```typescript
tool(
  'get_issue',
  'Description visible to Claude',
  {
    // Each parameter needs:
    // 1. Type definition (z.string(), z.number(), etc.)
    // 2. Validation rules (.regex(), .min(), etc.)
    // 3. Description (.describe()) - helps Claude choose correct inputs
    issueKey: z
      .string()
      .regex(/^[A-Z]+-\d+$/, 'Error message for validation failure')
      .describe('Help text for Claude'),

    // Optional parameters need .optional() or .default()
    includeComments: z.boolean().optional().default(true)
  },
  async (args) => {
    // args is fully typed from schema
    const key: string = args.issueKey;
  }
)
```

**Gotcha:** Validation error messages from regex are shown to users, so make them friendly!

### 4. MCP Response Format

**Discovery:** MCP responses have a specific structure that Claude expects.

**Required format:**
```typescript
return {
  content: [{
    type: 'text',  // or 'image', 'resource'
    text: 'Your response here'
  }],
  isError: false  // Optional, set to true for errors
};
```

**Best practice:**
- Create helper functions (done in `@pix-mcps/shared`)
- Always return structured responses, never throw in tool functions
- Use `isError: true` for non-fatal errors Claude should handle

### 5. Environment Variable Patterns

**Discovery:** Different approaches for loading env vars in different contexts.

**Pattern used:**
```typescript
// In src files
import 'dotenv/config';  // Auto-loads .env

// In test scripts (ESM)
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '.env') });
```

**Gotcha:** `__dirname` is not available in ESM modules, must reconstruct it!

## Anthropic SDK Specifics

### SDK Installation

**Gotcha:** Package version was tricky to find in early 2025.

**Solution:**
```bash
npm install @anthropic-ai/claude-agent-sdk@latest
```

**Discovery:** Use `latest` tag when specific version isn't available yet.

### Tool Function Signature

**Pattern discovered:**
```typescript
import { tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';

const myTool = tool(
  toolName: string,
  description: string,
  schema: { [key: string]: ZodType },
  handler: async (args: InferredType) => McpResponse
);
```

**Key points:**
- Description is important! Claude uses it to decide when to use the tool
- Schema keys become argument names
- Handler args are fully typed from schema
- Must return `{ content: [...] }` structure

### Server Configuration

**Minimal config:**
```typescript
createSdkMcpServer({
  name: 'server-name',  // Required
  version: '1.0.0',     // Required
  tools: [tool1, tool2] // Required
});
```

**Notes:**
- No need to specify capabilities explicitly
- Tools are auto-registered from array
- Server name should match `.mcp.json` config

## JIRA API Gotchas

### 1. Custom Fields Have No Standard Names

**Problem:** Custom field IDs like `customfield_10253` don't tell you what they are.

**Solution:** Must query `/rest/api/3/field` to get field metadata:

```typescript
const fields = await fetch(`${baseUrl}/rest/api/3/field`);
// Find fields with id.startsWith('customfield_')
// Check the 'name' property for human-readable name
```

**Pattern:**
```typescript
const PIX_CUSTOM_FIELDS = {
  EQUIPIX: 'customfield_10253',  // Map meaningful names to IDs
  APPLI_PIX: 'customfield_10117',
} as const;
```

### 2. Custom Field Value Structures Vary

**Discovery:** Different custom field types have different value structures.

**Patterns found:**

```typescript
// Select field (single value)
{
  "self": "...",
  "value": "API",  // <- The actual value
  "id": "10196"
}

// Multi-select field (array)
[
  { "value": "Certification", "id": "10625" },
  { "value": "Admin", "id": "10626" }
]

// Some fields use 'name' instead of 'value'
{ "name": "Option Name", "id": "123" }

// Development field (complex string)
"{repository={count=2, dataType=repository}, json={...}}"
```

**Solution:** Check for both `value` and `name` properties:

```typescript
function extractCustomFieldValue(value: unknown): string | null {
  if (typeof value === 'object' && value !== null) {
    if ('value' in value) return value.value;
    if ('name' in value) return value.name;
  }
  // ... handle other types
}
```

### 3. Description Field: ADF vs Plain Text

**Discovery:** JIRA description can be Atlassian Document Format (JSON) or plain text.

**ADF structure:**
```json
{
  "type": "doc",
  "version": 1,
  "content": [
    {
      "type": "paragraph",
      "content": [
        { "type": "text", "text": "Actual text here" }
      ]
    }
  ]
}
```

**Solution:** Recursive extraction:

```typescript
function extractTextFromADF(adf: any): string {
  if (Array.isArray(adf.content)) {
    return adf.content.map(extractTextFromADF).join('\n\n');
  }
  if (adf.type === 'text') return adf.text;
  if (adf.type === 'paragraph') {
    return adf.content.map(extractTextFromADF).join('');
  }
  return '';
}
```

### 4. Authentication: API Tokens vs Passwords

**Discovery:** JIRA Cloud no longer accepts passwords, only API tokens.

**Pattern:**
```typescript
const credentials = `${email}:${apiToken}`;  // Not password!
const base64 = Buffer.from(credentials).toString('base64');
const authHeader = `Basic ${base64}`;
```

**Important:**
- Tokens are tied to a user account
- Tokens can have expiration dates (check JIRA docs for current policy)
- Tokens should be rotated periodically

### 5. Field Wildcards

**Discovery:** Can request all custom fields with wildcard.

**Pattern:**
```typescript
const fields = ['summary', 'description', 'customfield_*'];
//                                          ^^^^^^^^^^^^^^ Gets all custom fields
```

**Pro:** Don't need to list every custom field
**Con:** Fetches more data than needed (slower, more bandwidth)

**Best practice:** Use for initial development, then specify exact fields for production.

## Custom Field Discovery

### Process Used

1. **Fetch a real issue** with all custom fields:
   ```typescript
   const issue = await client.getIssue('PROJ-19670');
   const customFields = Object.keys(issue.fields)
     .filter(key => key.startsWith('customfield_'));
   ```

2. **Query field metadata**:
   ```typescript
   const fieldDefs = await fetch('/rest/api/3/field');
   const custom = fieldDefs.filter(f => customFields.includes(f.id));
   ```

3. **Map IDs to names**:
   ```typescript
   custom.forEach(field => {
     console.log(`${field.id}: ${field.name}`);
   });
   ```

4. **Add to formatter** as constants:
   ```typescript
   const PIX_CUSTOM_FIELDS = {
     EQUIPIX: 'customfield_10253',
   } as const;
   ```

### Adding New Custom Fields

When Pix adds a new custom field:

1. **Find the field ID** using field inspector:
   ```bash
   node --import tsx servers/pix-jira/inspect-fields.ts PIX-XXXXX
   ```

2. **Add to constants** in `issue-formatter.ts`:
   ```typescript
   const PIX_CUSTOM_FIELDS = {
     NEW_FIELD: 'customfield_XXXXX',
   } as const;
   ```

3. **Add extraction logic** in `extractCustomFields()`:
   ```typescript
   if (fields[PIX_CUSTOM_FIELDS.NEW_FIELD]) {
     const value = extractCustomFieldValue(fields[PIX_CUSTOM_FIELDS.NEW_FIELD]);
     if (value) {
       customFields['Friendly Name'] = value;
     }
   }
   ```

4. **Test** with a real issue that has the field:
   ```bash
   node --import tsx servers/pix-jira/manual-test.ts PIX-XXXXX
   ```

## Code Patterns

### Error Handling Pattern

**Pattern:** Extract error handling into dedicated functions.

```typescript
class JiraClient {
  async request<T>(...): Promise<T> {
    try {
      const response = await this.fetchWithAuth(...);
      if (!response.ok) {
        await this.handleErrorResponse(response);
      }
      return await response.json();
    } catch (error) {
      return this.handleRequestError(error);
    }
  }

  private async handleErrorResponse(response: Response): Promise<never> {
    const errorMessage = await this.extractErrorMessage(response);
    throw this.createUserFriendlyException(statusCode, errorMessage);
  }

  private handleRequestError(error: unknown): never {
    if (error instanceof JiraApiException) throw error;
    throw new JiraApiException('User-friendly message');
  }
}
```

**Benefits:**
- Each function has a single responsibility
- Easy to test error scenarios
- Error messages are centralized

### Response Formatting Pattern

**Pattern:** Break formatting into small, testable sections.

```typescript
export function formatIssue(issue: JiraIssue): string {
  const sections: string[] = [
    formatIssueHeader(issue),
    formatBasicInformation(issue.fields),
    formatPeopleSection(issue.fields),
    // ... more sections
  ];

  return sections.filter(Boolean).join('\n');
}
```

**Benefits:**
- Each section can be tested independently
- Easy to add/remove/reorder sections
- Sections that return empty string are filtered out

### Configuration Pattern

**Pattern:** Load and validate config once at startup.

```typescript
export function loadConfig(): Config {
  const config = configSchema.parse({
    jiraBaseUrl: process.env.JIRA_BASE_URL,
    // ...
  });
  return config;
}

// In main
const config = loadConfig();  // Fails fast if invalid
const client = new JiraClient(config);
```

**Benefits:**
- Fails immediately if config is wrong
- Type-safe config throughout app
- No need to access process.env everywhere

## Testing Strategies

### Unit Testing Approach

**Pattern:** Test business logic separately from API calls.

```typescript
// Good: Testable without API
describe('extractCustomFields', () => {
  it('should extract Equipe Pix', () => {
    const fields = {
      customfield_10253: [{ value: 'Certification' }]
    };
    const result = extractCustomFields(fields);
    expect(result['Equipe Pix']).toBe('Certification');
  });
});

// API tests: Use real or mocked client
describe('JiraClient', () => {
  it('should fetch issue', async () => {
    const client = new JiraClient(testConfig);
    // Either mock fetch or use test credentials
  });
});
```

### Integration Testing Approach

**Pattern:** Create test scripts that use real credentials.

```typescript
// servers/pix-jira/manual-test.ts
async function manualTest() {
  const config = loadConfig();
  const client = new JiraClient(config);
  const issue = await client.getIssue('PROJ-19670');
  console.log(formatIssue(issue));
}
```

**Benefits:**
- Validates against real JIRA
- Catches API changes early
- Tests full integration path

**Downside:** Requires credentials, can't run in CI easily.

### Test-Driven Development for Custom Fields

**Process:**
1. Fetch real data, save to file
2. Write test with expected output
3. Implement extraction logic
4. Verify against real API

```typescript
// 1. Save sample data
const issue = await client.getIssue('PROJ-19670');
fs.writeFileSync('fixtures/pix-19670.json', JSON.stringify(issue));

// 2. Write test
const issue = require('./fixtures/pix-19670.json');
const result = extractCustomFields(issue.fields);
expect(result['Equipe Pix']).toBe('Certification');

// 3. Implement
// 4. Verify with real API
```

## Common Pitfalls

### 1. Forgetting to Rebuild

**Problem:** Changes to code don't reflect in tests.

**Solution:**
```bash
npm run build --workspace=servers/pix-jira
# Then run tests
```

**Better:** Use `tsx` to run TypeScript directly:
```bash
node --import tsx servers/pix-jira/manual-test.ts
```

### 2. ESM vs CommonJS Confusion

**Problem:** `require()` doesn't work, `__dirname` not defined.

**Solution:** This is an ESM project:
```typescript
// ✓ Correct
import { thing } from './module.js';  // Note .js extension
const __dirname = dirname(fileURLToPath(import.meta.url));

// ✗ Wrong
const thing = require('./module');
```

### 3. Sensitive Data in Logs

**Problem:** Accidentally logging API tokens or user data.

**Solution:**
- Never log `process.env` directly
- Sanitize error messages before logging
- Use Pino's serializers to redact sensitive fields

```typescript
const logger = pino({
  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url,
      // Don't include headers (may have auth)
    })
  }
});
```

### 4. Not Handling Null/Undefined

**Problem:** JIRA fields can be null, causing errors.

**Solution:** Check before accessing:
```typescript
// ✓ Safe
const assignee = fields.assignee?.displayName || 'Unassigned';

// ✗ Unsafe
const assignee = fields.assignee.displayName;  // Crashes if null
```

### 5. Hardcoding URLs or IDs

**Problem:** Code breaks when moved to different JIRA instance.

**Solution:** Use environment variables:
```typescript
// ✓ Configurable
const baseUrl = config.jiraBaseUrl;

// ✗ Hardcoded
const baseUrl = 'https://YOURWORKSPACE.atlassian.net';
```

## Performance Considerations

### 1. Minimize API Calls

**Strategy:** Request only needed fields.

```typescript
// Good: Specific fields
const fields = ['summary', 'status', 'assignee'];
const issue = await client.getIssue(key, fields);

// Wasteful: All fields
const issue = await client.getIssue(key);  // Gets everything
```

### 2. Pino Logger Performance

**Discovery:** Pino is very fast, but still has overhead.

**Best practice:**
```typescript
// Conditional debug logging
if (process.env.LOG_LEVEL === 'debug') {
  logger.debug('Expensive operation', computeExpensiveData());
}

// Better: Pino handles this internally
logger.debug('Expensive operation', computeExpensiveData());
// Won't compute data if debug level disabled
```

### 3. Caching Considerations

**Not implemented yet, but future improvement:**

```typescript
// Could cache field metadata (rarely changes)
class JiraClient {
  private fieldCache?: FieldMetadata[];

  async getFieldMetadata() {
    if (!this.fieldCache) {
      this.fieldCache = await this.fetchFieldMetadata();
    }
    return this.fieldCache;
  }
}
```

### 6. MCP Prompts Implementation

**Discovery:** The Anthropic SDK doesn't yet have native prompt support, but prompts can be implemented as tools that return structured analysis frameworks.

**Pattern:**
```typescript
// Prompt logic (src/prompts/analyze-ticket.ts)
export async function executeAnalyzeTicketPrompt(
  args: { issueKey: string },
  jiraClient: JiraClient,
): Promise<{ content: string; error?: string }> {
  const issue = await jiraClient.getIssue(issueKey, fields, []);
  const issueDetails = formatIssueForAnalysis(issue);
  const promptMessage = createAnalysisPromptMessage(issueDetails);
  return { content: promptMessage };
}

// Tool wrapper (src/tools/analyze-ticket.ts)
export function createAnalyzeTicketTool(jiraClient: JiraClient) {
  return tool(
    'analyze_ticket',
    'Prepares detailed technical analysis of a JIRA ticket',
    { issueKey: z.string().regex(/^[A-Z]+-\d+$/) },
    async (args) => {
      const result = await executeAnalyzeTicketPrompt(args, jiraClient);
      return result.error ? createErrorResponse(result.error) : createSuccessResponse(result.content);
    }
  );
}
```

**Key learnings:**

1. **Separation of concerns**
   - Prompt logic in `src/prompts/` handles data fetching and formatting
   - Tool wrapper in `src/tools/` handles MCP interface and validation
   - This makes prompt logic testable independent of MCP

2. **Prompts vs Tools decision framework**
   - **Tools**: Action-oriented (fetch, create, update, delete)
   - **Prompts**: Analysis-oriented (assess, evaluate, recommend, synthesize)
   - If it needs Claude's reasoning, it's a prompt
   - If it's just data retrieval, it's a tool

3. **Prompt message structure**
   - Start with clear instructions for Claude
   - Include specific analysis dimensions (e.g., "Complexity Assessment", "Potential Risks")
   - Format data cleanly with markdown headings
   - Provide context (related issues, custom fields, etc.)

4. **Function extraction pattern**
   - Avoid inline comments by extracting functions
   - `addBasicInformationSection()` is clearer than `// Add basic info`
   - Each function should do one thing with a descriptive name
   - Reduces noise, improves testability

5. **Testing prompts**
   - Mock the JIRA client, not the real API
   - Test that prompt content contains expected sections
   - Test error handling (API failures, missing data)
   - Verify issue key normalization (lowercase → uppercase)

**Benefits of this pattern:**
- Prompt logic is fully testable without MCP infrastructure
- Can reuse same prompt with different tool interfaces
- Clear separation makes future SDK prompt support easy to adopt
- Type-safe with full TypeScript support

**Future SDK support:**
When native prompts are supported:
```typescript
createSdkMcpServer({
  name: 'pix-jira',
  tools: [...],
  prompts: [...],  // Will be able to register prompts directly
});
```

## Future Improvements

### 1. Add More JIRA Tools

**Potential tools to add:**

- `search_issues`: JQL-based search
  ```typescript
  tool('search_issues', 'Search JIRA using JQL', {
    jql: z.string().describe('JQL query'),
    maxResults: z.number().optional().default(50)
  }, ...)
  ```

- `create_issue`: Create new issues
- `add_comment`: Add comments to issues
- `transition_issue`: Move through workflow
- `get_sprint_issues`: Get current sprint

### 2. Better Development Info

**Current:** Just shows repository count
**Future:** Parse and display:
- Branch names
- PR titles and statuses
- Commit counts

### 3. Attachment Support

**Future:** Download and display attachment info:
```typescript
const attachments = fields.attachment.map(a => ({
  filename: a.filename,
  size: a.size,
  url: a.content
}));
```

### 4. Smart Field Detection

**Future:** Auto-detect custom fields instead of hardcoding:

```typescript
async function discoverCustomFields(client: JiraClient) {
  const metadata = await client.getFieldMetadata();
  const pixFields = metadata
    .filter(f => f.name.includes('Pix') || f.name.includes('Equipe'))
    .map(f => ({ id: f.id, name: f.name }));
  // Store in config or cache
}
```

### 5. Rate Limiting

**Future:** Implement client-side rate limiting:

```typescript
class RateLimiter {
  private requests: number[] = [];

  async waitIfNeeded() {
    // Implement token bucket or sliding window
  }
}
```

## Conclusion

Building this MCP server taught valuable lessons about:

1. **Anthropic SDK patterns** - Zod schemas, tool structure, response format
2. **JIRA API quirks** - Custom fields, ADF format, authentication
3. **Code organization** - Self-documenting code, small functions, clear responsibilities
4. **Testing approaches** - Mix of unit tests and integration tests with real data
5. **User experience** - Friendly errors, clear formatting, useful logging

Use these learnings as a foundation when building new MCP servers or extending this one.

## Quick Reference

### Adding a New MCP Server

1. Create directory: `servers/my-server/`
2. Copy structure from `pix-jira`
3. Update `package.json` with server name
4. Create tools in `src/tools/`
5. Add to root `.mcp.json`
6. Build and test

### Adding a New Tool to Existing MCP

1. Create `src/tools/my-tool.ts`
2. Define with `tool()` function
3. Add to tools array in `src/index.ts`
4. Test with manual script
5. Document in README

### Debugging Checklist

- [ ] Check `.env` file exists and has correct values
- [ ] Run `npm run build` after code changes
- [ ] Check server logs for connection errors
- [ ] Use `LOG_LEVEL=debug` for verbose logging
- [ ] Test with curl/fetch to isolate API vs SDK issues
- [ ] Verify TypeScript types are correct
- [ ] Check that custom field IDs haven't changed

