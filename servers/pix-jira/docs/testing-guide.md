# Testing Guide for Pix MCP Servers

This guide explains how to manually test MCP servers to ensure they work correctly with Claude and JIRA.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Testing the JIRA MCP Server](#testing-the-jira-mcp-server)
  - [Method 1: Quick Test with Test Script](#method-1-quick-test-with-test-script)
  - [Method 2: Testing with Claude Code](#method-2-testing-with-claude-code)
  - [Method 3: Manual API Testing](#method-3-manual-api-testing)
  - [Method 4: Testing with Docker](#method-4-testing-with-docker)
- [Verifying Custom Fields](#verifying-custom-fields)
- [Common Issues and Troubleshooting](#common-issues-and-troubleshooting)
- [Testing Checklist](#testing-checklist)

## Prerequisites

Before testing, ensure you have:

1. **Node.js 20.x** installed (check with `node --version`)
2. **Dependencies installed**: Run `npm install` from the monorepo root
3. **Built packages**: Run `npm run build` from the monorepo root
4. **Environment variables configured**: See [Configuration](#configuration)
5. **Docker and Docker Compose** (optional, only for Method 4): For containerized testing

### Configuration

Create a `.env` file in `servers/pix-jira/`:

```bash
cd servers/pix-jira
cp .env.example .env
```

Edit `.env` with your credentials:

```env
JIRA_BASE_URL=https://YOURWORKSPACE.atlassian.net
JIRA_EMAIL=your.email@xxx.com
JIRA_API_TOKEN=your_api_token_here
JIRA_PROJECT_KEY=YOUR_PROJECT_ID
LOG_LEVEL=info
```

**Getting your API token:**

1. Go to https://id.atlassian.com/manage-profile/security/api-tokens
2. Click "Create API token"
3. Give it a name (e.g., "Pix MCP Testing")
4. Copy the token and paste it in your `.env` file

## Testing the JIRA MCP Server

### Method 1: Quick Test with Test Script

This is the fastest way to verify the MCP server works.

**Step 1: Create a test script**

Create `servers/pix-jira/manual-test.ts`:

```typescript
#!/usr/bin/env tsx

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '.env') });

import { loadConfig } from './src/config.js';
import { JiraClient } from './src/lib/jira-client.js';
import { formatIssue } from './src/lib/issue-formatter.js';

async function manualTest() {
  console.log('🧪 Testing JIRA MCP Server\n');

  const appConfig = loadConfig();
  console.log('✓ Configuration loaded');

  const client = new JiraClient(appConfig);
  console.log('✓ JIRA client created');

  await client.testConnection();
  console.log('✓ Connection successful\n');

  const issueKey = process.argv[2] || 'PROJ-19670';
  console.log(`Fetching issue: ${issueKey}\n`);

  const issue = await client.getIssue(issueKey);
  console.log('✓ Issue fetched successfully\n');

  console.log('=== FORMATTED OUTPUT ===\n');
  const formatted = formatIssue(issue);
  console.log(formatted);
}

manualTest().catch((error) => {
  console.error('\n❌ Test failed:', error.message);
  process.exit(1);
});
```

**Step 2: Run the test**

```bash
# Test with default issue (PROJ-19670)
node --import tsx servers/pix-jira/manual-test.ts

# Test with a specific issue
node --import tsx servers/pix-jira/manual-test.ts PROJ-12345
```

**Expected output:**

```
🧪 Testing JIRA MCP Server

✓ Configuration loaded
✓ JIRA client created
✓ Connection successful

Fetching issue: PROJ-19670

✓ Issue fetched successfully

=== FORMATTED OUTPUT ===

# PROJ-19670: [TECH] Creer la table certification-versions

## Basic Information
- **Status**: Deployed in Prod (Done)
- **Type**: Sous-tâche
- **Priority**: Medium
- **Project**: Tout Pix (PIX)

## People
- **Assignee**: Stephen MEHAUT
- **Reporter**: Stephen MEHAUT

## Parent Issue
- **PROJ-19533**: [FEATURE] Notion de millesime
- **Type**: Story

## Description
...

## Pix Custom Fields
- **Equipe Pix**: Certification
- **Appli Pix**: API
- **Development**: 2 repository/repositories linked
- **Resolution Semester**: 2025 S2

...
```

### Method 2: Testing with Claude Code

This tests the full integration with Claude.

**Step 1: Verify MCP configuration**

Check that `.mcp.json` at the monorepo root contains:

```json
{
  "$schema": "https://raw.githubusercontent.com/anthropics/mcp-schema/main/schema.json",
  "mcpServers": {
    "pix-jira": {
      "command": "npx",
      "args": ["-w", "servers/pix-jira", "tsx", "src/index.ts"],
      "env": {
        "JIRA_BASE_URL": "https://YOURWORKSPACE.atlassian.net",
        "JIRA_EMAIL": "${JIRA_EMAIL}",
        "JIRA_API_TOKEN": "${JIRA_API_TOKEN}",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

**Step 2: Set up environment variables**

Make sure your shell has the credentials:

```bash
export JIRA_EMAIL="your.email@xxx.com"
export JIRA_API_TOKEN="your_token_here"
```

Or add them to your `~/.bashrc` or `~/.zshrc`.

**Step 3: Start the MCP server manually**

```bash
npm run dev --workspace=servers/pix-jira
```

You should see:

```
Starting Pix JIRA MCP Server...
Configured for JIRA instance: https://YOURWORKSPACE.atlassian.net
Testing connection to JIRA...
Successfully connected to JIRA
Pix JIRA MCP Server initialized successfully
Available tools:
  - get_issue: Retrieve JIRA issue details
Server started and ready to receive requests
```

**Step 4: Test with Claude Code**

In Claude Code, you can now use the MCP:

```
Get me the details of issue PROJ-19670
```

```
Show me PROJ-12345
```

```
What's the status of PROJ-19533?
```

### Method 3: Manual API Testing

Test the JIRA API directly without the MCP layer.

**Create a test script** `servers/pix-jira/api-test.ts`:

```typescript
#!/usr/bin/env tsx

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '.env') });

async function testJiraApi() {
  const baseUrl = process.env.JIRA_BASE_URL;
  const email = process.env.JIRA_EMAIL;
  const token = process.env.JIRA_API_TOKEN;

  const credentials = `${email}:${token}`;
  const base64 = Buffer.from(credentials).toString('base64');

  console.log('Testing JIRA API connection...\n');

  // Test 1: Server info
  console.log('1. Fetching server info...');
  const serverInfo = await fetch(`${baseUrl}/rest/api/3/serverInfo`, {
    headers: {
      Authorization: `Basic ${base64}`,
      Accept: 'application/json',
    },
  });

  if (serverInfo.ok) {
    const info = await serverInfo.json();
    console.log(`   ✓ Connected to: ${info.serverTitle}`);
    console.log(`   ✓ Version: ${info.version}\n`);
  } else {
    console.log(`   ❌ Failed: ${serverInfo.status}\n`);
    return;
  }

  // Test 2: Fetch an issue
  const issueKey = process.argv[2] || 'PROJ-19670';
  console.log(`2. Fetching issue ${issueKey}...`);
  const issueResponse = await fetch(`${baseUrl}/rest/api/3/issue/${issueKey}`, {
    headers: {
      Authorization: `Basic ${base64}`,
      Accept: 'application/json',
    },
  });

  if (issueResponse.ok) {
    const issue = await issueResponse.json();
    console.log(`   ✓ Issue found: ${issue.fields.summary}`);
    console.log(`   ✓ Status: ${issue.fields.status.name}`);
    console.log(`   ✓ Assignee: ${issue.fields.assignee?.displayName || 'Unassigned'}\n`);
  } else {
    console.log(`   ❌ Failed: ${issueResponse.status}\n`);
  }

  console.log('All tests passed! ✓');
}

testJiraApi().catch(console.error);
```

**Run the test:**

```bash
node --import tsx servers/pix-jira/api-test.ts
```

### Method 4: Testing with Docker

Run the MCP server in a Docker container for isolated testing.

**Step 1: Build the Docker image**

```bash
# From the monorepo root
docker compose build pix-jira

# Or using Docker CLI directly
docker build -t pix-mcp/jira:latest .
```

**Step 2: Start the container**

```bash
# Using docker compose (recommended)
docker compose up -d pix-jira

# Or using Docker CLI
docker run -d \
  --name pix-jira-mcp \
  --env-file .env \
  -i -t \
  pix-mcp/jira:latest
```

**Step 3: Verify the container is running**

```bash
# Check container status
docker compose ps
# or
docker ps | grep pix-jira

# View container logs
docker compose logs -f pix-jira
# or
docker logs -f pix-jira-mcp
```

**Step 4: Test the containerized server**

You can test the container using `docker exec`:

```bash
# Get issue information via container
docker exec -i pix-jira-mcp node -e "
const { JiraClient } = require('./dist/lib/jira-client.js');
const { formatIssue } = require('./dist/lib/issue-formatter.js');

const config = {
  jiraBaseUrl: process.env.JIRA_BASE_URL,
  jiraEmail: process.env.JIRA_EMAIL,
  jiraApiToken: process.env.JIRA_API_TOKEN,
};

const client = new JiraClient(config);
client.getIssue('PROJ-19670').then(issue => {
  console.log(formatIssue(issue));
}).catch(console.error);
"
```

**Step 5: Connect Claude to the container**

**Important:** The container runs `sleep infinity` to stay alive. Claude Code starts the MCP server on-demand using `docker exec`.

Update your `.mcp.json` to use the Docker container:

```json
{
  "mcpServers": {
    "pix-jira": {
      "command": "docker",
      "args": ["exec", "-i", "pix-jira-mcp", "node", "dist/index.js"]
    }
  }
}
```

**Note:** Environment variables are already set in the container via the `.env` file. You don't need to pass them again in `.mcp.json`.

**How it works:**

1. Container stays alive with `sleep infinity`
2. When Claude Code needs MCP tools, it runs: `docker exec -i pix-jira-mcp node dist/index.js`
3. Server starts, connects to JIRA (using env vars from container's `.env`), and serves the request
4. When Claude disconnects, server shuts down gracefully
5. Container remains running for next connection

Then test with Claude Code:

1. Ask Claude to use the `get_issue` tool
2. Provide a test issue key (e.g., "PROJ-19670")
3. Verify the response includes all expected fields

**Step 6: Stop the container**

```bash
# Using docker compose
docker compose down

# Or using Docker CLI
docker stop pix-jira-mcp
docker rm pix-jira-mcp
```

**Advantages of Docker testing:**

- ✓ Isolated environment (no Node.js conflicts)
- ✓ Production-like setup
- ✓ Easy to restart/rebuild
- ✓ Can run multiple versions simultaneously
- ✓ Matches deployment environment

## Verifying Custom Fields

To verify that custom fields are being fetched correctly:

**Step 1: Create a field inspector script**

Create `servers/pix-jira/inspect-fields.ts`:

```typescript
#!/usr/bin/env tsx

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '.env') });

import { loadConfig } from './src/config.js';
import { JiraClient } from './src/lib/jira-client.js';

async function inspectFields() {
  const appConfig = loadConfig();
  const client = new JiraClient(appConfig);

  const issueKey = process.argv[2] || 'PROJ-19670';
  console.log(`Inspecting custom fields for ${issueKey}\n`);

  const issue = await client.getIssue(issueKey);

  const customFields = Object.entries(issue.fields)
    .filter(([key]) => key.startsWith('customfield_'))
    .filter(([, value]) => value !== null && value !== undefined);

  console.log('Custom fields with values:\n');
  customFields.forEach(([key, value]) => {
    console.log(`${key}:`);
    console.log(JSON.stringify(value, null, 2));
    console.log();
  });
}

inspectFields().catch(console.error);
```

**Step 2: Run the inspector**

```bash
node --import tsx servers/pix-jira/inspect-fields.ts PROJ-19670
```

**Step 3: Verify known Pix fields**

You should see these fields if the issue has them:

- `customfield_10253`: Equipe Pix (team)
- `customfield_10117`: Appli Pix (application)
- `customfield_10000`: Development (GitHub links)
- `customfield_10257`: Resolution Semester

## Common Issues and Troubleshooting

### Issue: "Configuration validation failed"

**Cause:** Missing or invalid environment variables.

**Solution:**

1. Check that `.env` file exists in `servers/pix-jira/`
2. Verify all required variables are set
3. Check for typos in variable names

```bash
cat servers/pix-jira/.env
```

### Issue: "Authentication failed"

**Cause:** Invalid email or API token.

**Solution:**

1. Verify your email is correct
2. Generate a new API token: https://id.atlassian.com/manage-profile/security/api-tokens
3. Make sure you copied the entire token (no spaces)
4. Update your `.env` file

### Issue: "The requested JIRA issue was not found"

**Cause:** Issue doesn't exist or you don't have permission.

**Solution:**

1. Verify the issue key is correct (e.g., `PROJ-12345`)
2. Check that you can view the issue in JIRA web interface
3. Verify you have access to the PIX project

### Issue: "Cannot find module"

**Cause:** Dependencies not installed or not built.

**Solution:**

```bash
# From monorepo root
npm install
npm run build --workspace=packages/shared
npm run build --workspace=servers/pix-jira
```

### Issue: "Rate limit exceeded"

**Cause:** Too many API requests.

**Solution:**

1. Wait a few minutes
2. Reduce the frequency of requests
3. Check if other processes are using the same API token

### Issue: Custom fields showing as "customfield_xxxxx"

**Cause:** Field not configured in the formatter.

**Solution:**

1. Use the field inspector to identify the field ID
2. Add the field mapping in `src/lib/issue-formatter.ts`
3. See the Developer Learnings doc for details

## Testing Checklist

Use this checklist to verify everything works:

### Basic Functionality

- [ ] Dependencies installed (`npm install`)
- [ ] Packages built (`npm run build`)
- [ ] `.env` file created and configured
- [ ] API token generated and set
- [ ] Connection test passes
- [ ] Can fetch a known issue (e.g., PROJ-19670)

### MCP Server

- [ ] Server starts without errors
- [ ] Server logs "Successfully connected to JIRA"
- [ ] Server logs "Server started and ready to receive requests"
- [ ] No TypeScript errors in build

### Data Verification

- [ ] Issue summary displays correctly
- [ ] Status and priority show up
- [ ] Assignee and reporter names appear
- [ ] Parent issue displays (if exists)
- [ ] Description renders (handles ADF format)
- [ ] Labels appear (if issue has labels)
- [ ] Fix versions show (if issue has versions)
- [ ] Related issues display (if issue has links)

### Pix Custom Fields

- [ ] Equipe Pix displays correctly
- [ ] Appli Pix displays correctly
- [ ] Development info shows repository count
- [ ] Resolution Semester appears
- [ ] All custom fields show friendly names (not customfield\_\*)

### Error Handling

- [ ] Invalid issue key shows friendly error
- [ ] Invalid credentials show authentication error
- [ ] Network issues show connection error
- [ ] All errors are user-friendly (no sensitive data exposed)

## Advanced Testing

### Testing with Different Issue Types

Test with various issue types to ensure formatting works:

```bash
# Test with a Story
node --import tsx servers/pix-jira/manual-test.ts PROJ-19533

# Test with a Bug
node --import tsx servers/pix-jira/manual-test.ts PIX-XXXXX

# Test with an Epic
node --import tsx servers/pix-jira/manual-test.ts PIX-XXXXX

# Test with a Sub-task
node --import tsx servers/pix-jira/manual-test.ts PROJ-19670
```

### Testing Edge Cases

```bash
# Issue with no assignee
node --import tsx servers/pix-jira/manual-test.ts PIX-XXXXX

# Issue with many comments
node --import tsx servers/pix-jira/manual-test.ts PIX-XXXXX

# Issue with many labels
node --import tsx servers/pix-jira/manual-test.ts PIX-XXXXX

# Issue with no parent
node --import tsx servers/pix-jira/manual-test.ts PIX-XXXXX
```

### Performance Testing

Test with multiple requests:

```bash
# Run 5 requests in sequence
for i in {1..5}; do
  node --import tsx servers/pix-jira/manual-test.ts PROJ-19670
  sleep 1
done
```

Monitor for:

- Response times staying consistent
- No memory leaks
- No rate limiting errors

## Getting Help

If you encounter issues not covered here:

1. Check the [main README](../README.md)
2. Review the [JIRA server README](../servers/pix-jira/README.md)
3. Check JIRA API docs: https://developer.atlassian.com/cloud/jira/platform/rest/v3/
4. Consult the [Developer Learnings](./developer-learnings.md) doc
5. Ask the Pix development team
