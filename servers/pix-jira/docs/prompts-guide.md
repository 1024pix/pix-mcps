# MCP Prompts Guide for Beginners

## What are MCP Prompts?

MCP (Model Context Protocol) defines three core primitives:

1. **Tools** - Functions that perform actions (like fetching data, creating tickets, etc.)
2. **Resources** - Data sources that can be accessed (files, databases, APIs)
3. **Prompts** - Pre-structured templates that help Claude understand context and perform specific workflows

Think of prompts as "smart templates" that combine data retrieval with structured instructions for Claude to follow.

**Not sure when to use prompts vs tools?** See [Prompts vs Tools Guide](./prompts-vs-tools.md) for detailed guidance.

## Why Use Prompts?

Prompts are useful when you want to:

- Provide structured analysis of data
- Create consistent workflows
- Combine multiple pieces of information into a coherent request
- Guide Claude to perform specific types of analysis

### Example: analyze-ticket Prompt

Instead of manually:

1. Fetching a JIRA ticket
2. Reading all the details
3. Asking Claude to analyze it
4. Specifying what aspects to analyze

You can simply invoke the `analyze_ticket` tool, which:

1. Fetches the ticket data
2. Formats it clearly
3. Provides Claude with a structured analysis framework

## How Prompts Work in This Project

### Architecture

In the current implementation, prompts are implemented as tools that return structured content:

```
User → analyze_ticket tool → Fetch JIRA data → Format as analysis prompt → Claude analyzes
```

### File Structure

```
servers/pix-jira/
├── src/
│   ├── prompts/
│   │   ├── analyze-ticket.ts         # Prompt definition & logic
│   │   └── analyze-ticket.test.ts    # Tests
│   └── tools/
│       └── analyze-ticket.ts         # Tool wrapper for the prompt
```

## Building Your Own Prompt

### Step 1: Define the Prompt

Create a file in `src/prompts/` with your prompt definition:

```typescript
export const myPrompt = {
  name: 'my_prompt',
  description: 'What this prompt does for Claude',
  arguments: [
    {
      name: 'someInput',
      description: 'What input is needed',
      required: true,
    },
  ],
};
```

### Step 2: Implement the Prompt Handler

The handler fetches data and formats it into a structured message:

```typescript
export async function executeMyPrompt(
  args: { someInput: string },
  jiraClient: JiraClient,
): Promise<{ content: string; error?: string }> {
  try {
    const data = await fetchSomeData(args.someInput);
    const formattedData = formatData(data);
    const promptMessage = createPromptMessage(formattedData);

    return { content: promptMessage };
  } catch (error) {
    return { content: '', error: 'Error message' };
  }
}
```

### Step 3: Create a Tool Wrapper

Create a tool in `src/tools/` that wraps your prompt:

```typescript
export function createMyPromptTool(jiraClient: JiraClient) {
  return tool(
    'my_prompt',
    'Description for Claude about what this tool does',
    {
      someInput: z.string().describe('Input description'),
    },
    async (args) => {
      const result = await executeMyPrompt(args, jiraClient);
      if (result.error) {
        return createErrorResponse(result.error);
      }
      return createSuccessResponse(result.content);
    },
  );
}
```

### Step 4: Register the Tool

Update `src/index.ts`:

```typescript
import { createMyPromptTool } from './tools/my-prompt';

const tools = [
  createGetIssueTool(jiraClient),
  createAnalyzeTicketTool(jiraClient),
  createMyPromptTool(jiraClient), // Add your tool
];
```

### Step 5: Write Tests

Create `src/prompts/my-prompt.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { executeMyPrompt } from './my-prompt';

describe('myPrompt', () => {
  it('should generate prompt with data', async () => {
    const mockClient = { getData: vi.fn().mockResolvedValue(mockData) };
    const result = await executeMyPrompt({ someInput: 'test' }, mockClient);

    expect(result.error).toBeUndefined();
    expect(result.content).toContain('expected content');
  });
});
```

## Key Concepts

### Separation of Concerns

**Prompt Logic** (`src/prompts/`)

- Fetches data
- Formats data for Claude
- Creates the structured prompt message
- Contains business logic

**Tool Wrapper** (`src/tools/`)

- Provides the MCP tool interface
- Validates inputs using Zod
- Handles errors
- Returns standardized responses

### Why This Pattern?

1. **Testability** - Prompt logic can be tested independently
2. **Reusability** - Same prompt can be wrapped by different tools
3. **Clarity** - Clear separation between data preparation and tool interface
4. **Type Safety** - Full TypeScript support

## Example: analyze-ticket Prompt

### What It Does

1. Fetches JIRA ticket data including:
   - Basic info (key, type, status, priority)
   - Description and summary
   - Related issues and parent tickets
   - Custom fields

2. Formats it into a structured document

3. Provides Claude with specific analysis instructions:
   - Complexity assessment
   - Potential risks
   - Dependencies
   - Recommended approach

### Usage

```typescript
const result = await executeAnalyzeTicketPrompt({ issueKey: 'PROJ-1234' }, jiraClient);

console.log(result.content);
```

### The Prompt Message Structure

```
Please analyze the following JIRA ticket and provide:

1. **Complexity Assessment** (Low/Medium/High)
   - Evaluate the technical complexity
   - Consider scope and number of changes required

2. **Potential Risks**
   [...]

---

## Ticket Details

**Key:** PROJ-1234
**Type:** Story
**Status:** To Do
[...]
```

This structure guides Claude to provide consistent, thorough analysis.

## Testing Best Practices

1. **Mock the JIRA Client** - Don't make real API calls in tests
2. **Test Multiple Scenarios** - Success cases, errors, edge cases
3. **Verify Content** - Check that the prompt contains expected sections
4. **Test Error Handling** - Ensure errors are handled gracefully

```typescript
it('should handle API errors gracefully', async () => {
  mockClient.getIssue.mockRejectedValue(new Error('Network error'));

  const result = await executeMyPrompt({ someInput: 'test' }, mockClient);

  expect(result.error).toBeDefined();
  expect(result.content).toBe('');
});
```

## Common Pitfalls

### 1. Too Much Data

Don't include everything in the prompt. Focus on what's relevant for the analysis.

**Bad:**

```typescript
return `Here's all the data: ${JSON.stringify(allData)}`;
```

**Good:**

```typescript
return `**Key Information:**
- Summary: ${data.summary}
- Status: ${data.status}
[only relevant fields]`;
```

### 2. Unclear Instructions

Claude needs clear, specific instructions.

**Bad:**

```typescript
return `Analyze this ticket: ${ticketData}`;
```

**Good:**

```typescript
return `Please analyze this ticket and provide:
1. **Complexity Assessment** (Low/Medium/High)
2. **Potential Risks**
3. **Dependencies**
[...]`;
```

### 3. Not Handling Errors

Always handle potential errors from data fetching.

```typescript
try {
  const data = await fetchData();
  return { content: formatData(data) };
} catch (error) {
  return {
    content: '',
    error: error.message || 'Unknown error',
  };
}
```

## Advanced: Future Enhancements

Currently, prompts are implemented as tools. Future versions of the SDK may support native prompts through:

```typescript
createSdkMcpServer({
  name: 'pix-jira',
  version: '1.0.0',
  tools: [...],
  prompts: [...],  // Native prompt support
});
```

When this becomes available, prompts could be registered directly without tool wrappers.

## Resources

- [MCP Specification](https://modelcontextprotocol.io)
- [Anthropic Agent SDK Docs](https://docs.claude.com/en/api/agent-sdk/overview)
- [Project SDK Reference](../../../docs/anthropic-sdk-reference.md)

## Summary

- Prompts are structured templates that guide Claude's analysis
- Implement prompts in `src/prompts/` and wrap them with tools in `src/tools/`
- Focus on clear structure, relevant data, and specific instructions
- Always write tests to ensure reliability
- Keep code clean with descriptive function and variable names instead of comments
