# Prompts vs Tools: When to Use Each

## Quick Answer

**Tools**: When Claude needs to **perform an action** or **fetch data**

**Prompts**: When Claude needs to **analyze, interpret, or synthesize** information with a structured framework

## Understanding the Difference

### Tools

Tools are **action-oriented functions** that Claude can invoke to:

- Retrieve data
- Create/update/delete resources
- Execute operations
- Interact with external systems

**Key characteristic**: Tools produce a result and that result is final.

### Prompts

Prompts are **analysis frameworks** that:

- Provide context to Claude
- Include structured instructions
- Guide Claude's reasoning process
- Help Claude produce comprehensive, consistent responses

**Key characteristic**: Prompts provide input for Claude to reason about and respond to.

## When to Use Tools

Use tools when you want Claude to:

### 1. Fetch Raw Data

```
❌ Prompt: "analyze_user_data"
✅ Tool: "get_user_data"

Why? Fetching is an action, not an analysis framework.
```

### 2. Perform Actions

```
❌ Prompt: "create_issue_template"
✅ Tool: "create_issue"

Why? Creating something is an action, not guidance for Claude.
```

### 3. Simple Operations

```
❌ Prompt: "check_ticket_status"
✅ Tool: "get_issue"

Why? Status checking is a straightforward data retrieval.
```

### Real Example: get_issue Tool

```typescript
tool('get_issue', 'Retrieves JIRA issue details', { issueKey: z.string() });
```

**Purpose**: Fetch and display issue data
**Output**: Formatted issue information
**Claude's role**: Presents the data to the user

## When to Use Prompts

Use prompts when you want Claude to:

### 1. Provide Structured Analysis

```
✅ Prompt: "analyze_ticket"
❌ Tool: "get_ticket_analysis"

Why? Analysis requires Claude's reasoning, not just data retrieval.
```

### 2. Synthesize Multiple Data Points

```
✅ Prompt: "sprint_retrospective"
❌ Tool: "get_sprint_data"

Why? A retrospective needs Claude to synthesize information and provide insights.
```

### 3. Apply Domain Expertise

```
✅ Prompt: "security_review"
❌ Tool: "check_security"

Why? Security review requires expert analysis, not just checks.
```

### Real Example: analyze_ticket Prompt

```typescript
prompt('analyze_ticket', 'Provides technical analysis framework for a JIRA ticket');
```

**Purpose**: Guide Claude to analyze ticket complexity, risks, and dependencies
**Output**: Claude's structured analysis based on the framework
**Claude's role**: Applies reasoning to provide insights

## Side-by-Side Comparison

### Scenario: JIRA Ticket Information

| Aspect            | Tool: `get_issue`    | Prompt: `analyze_ticket`    |
| ----------------- | -------------------- | --------------------------- |
| **Purpose**       | Retrieve ticket data | Analyze ticket implications |
| **Claude's role** | Display formatter    | Expert analyst              |
| **Output type**   | Structured data      | Reasoned insights           |
| **User gets**     | "Here's the ticket"  | "Here's what this means"    |
| **Use when**      | Need information     | Need understanding          |

### Example Outputs

**Tool: get_issue**

```
# PROJ-1234: Implement user authentication

## Basic Information
- Status: To Do
- Type: Story
- Priority: High

## Description
Add OAuth2 authentication to the application
[...]
```

**Prompt: analyze_ticket**

```
Based on the ticket PROJ-1234, here's my analysis:

## Complexity Assessment: Medium-High

This ticket involves OAuth2 implementation which requires:
- Integration with external identity providers
- Token management and refresh logic
- Session handling

## Potential Risks
1. Security vulnerabilities if not implemented correctly
2. Breaking changes to existing authentication
[...]
```

## Decision Framework

Ask yourself these questions:

### 1. Is the primary value in the data itself or in analyzing it?

- **Data itself** → Tool
- **Analysis** → Prompt

### 2. Does this require Claude's reasoning?

- **No, just fetch/format** → Tool
- **Yes, need interpretation** → Prompt

### 3. Would different users want different interpretations?

- **No, same result for everyone** → Tool
- **Yes, context matters** → Prompt

### 4. Is this atomic or composite?

- **Atomic operation** → Tool
- **Multi-step reasoning** → Prompt

## Common Patterns

### Pattern 1: Tool + Prompt Combination

Often, prompts use tools internally:

```
User: "Analyze PROJ-1234"
     ↓
analyze_ticket prompt
     ↓
Uses get_issue tool internally
     ↓
Formats data + adds analysis framework
     ↓
Claude analyzes and responds
```

### Pattern 2: Tool for Simple, Prompt for Complex

```
Simple: "What's the status of PROJ-1234?"
→ Use get_issue tool

Complex: "Should we prioritize PROJ-1234?"
→ Use analyze_ticket prompt
```

### Pattern 3: Prompt Wraps Tool

In our implementation:

- `analyze_ticket` tool wraps the `analyzeTicketPrompt` logic
- The tool fetches data, the prompt logic formats it with analysis instructions
- Claude then provides the analysis

## Real-World Examples

### Example 1: Code Review

**Wrong: Code Review Tool**

```typescript
tool('review_code', 'Reviews code for issues');
```

This won't work because code review requires Claude's judgment.

**Right: Code Review Prompt**

```typescript
prompt('code_review', 'Provides framework for reviewing code quality, security, and maintainability');
```

### Example 2: Database Query

**Right: Query Tool**

```typescript
tool('query_database', 'Executes SQL query and returns results');
```

Fetching data is an action, not analysis.

**Wrong: Database Query Prompt**

```typescript
prompt('query_database', ...)  // ❌ Don't do this
```

### Example 3: Data Visualization

**Tool: For generating charts**

```typescript
tool('generate_chart', 'Creates a chart from data');
```

**Prompt: For interpreting trends**

```typescript
prompt('analyze_trends', 'Framework for analyzing data trends and patterns');
```

## Advanced Considerations

### Composition

Prompts can call tools:

```
analyze_sprint prompt
  ├─ get_issues tool
  ├─ get_velocity tool
  └─ Claude synthesizes insights
```

### User Experience

**Tools**: "Get me X"
**Prompts**: "Help me understand Y"

### Performance

**Tools**: Fast, direct
**Prompts**: Slower, requires Claude's reasoning

### Consistency

**Tools**: Same input → same output
**Prompts**: Same input → similar but nuanced outputs

## Common Mistakes

### Mistake 1: Using Prompts for Actions

```typescript
❌ prompt('create_ticket', 'Creates a new JIRA ticket')
✅ tool('create_ticket', 'Creates a new JIRA ticket')
```

### Mistake 2: Using Tools for Analysis

```typescript
❌ tool('analyze_complexity', 'Analyzes code complexity')
✅ prompt('analyze_complexity', 'Framework for assessing code complexity')
```

### Mistake 3: Overusing Prompts

```typescript
❌ prompt('get_user_id', 'Returns user ID')
✅ tool('get_user_id', 'Returns user ID')
```

If it's just data retrieval, it's a tool.

## Summary

|                   | Tools                    | Prompts                         |
| ----------------- | ------------------------ | ------------------------------- |
| **Purpose**       | Execute actions          | Guide analysis                  |
| **Claude's role** | Executor                 | Analyst                         |
| **Output**        | Data/Results             | Insights                        |
| **When**          | "Do X"                   | "Analyze/Understand X"          |
| **Examples**      | get_issue, create_ticket | analyze_ticket, security_review |

## Rule of Thumb

**If you can automate it without AI, it's a tool.**
**If you need AI to understand/interpret/analyze, it's a prompt.**

---

Need help deciding? Ask:

1. Could a simple function do this without AI? → Tool
2. Do I need Claude's reasoning? → Prompt
3. Is the value in the data or the analysis? → Data=Tool, Analysis=Prompt
