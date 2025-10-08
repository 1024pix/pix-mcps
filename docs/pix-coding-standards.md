# Pix Coding Standards Reference

This document outlines coding standards and conventions inspired by the Pix project to ensure consistency across MCP servers in this monorepo.

## Project Structure

### Monorepo Architecture

- Each MCP server should be in its own directory under `servers/`
- Shared utilities and types should be in `packages/shared/`
- Common configuration files at the root level

### Directory Structure

```
pix-mcps/
├── servers/
│   ├── server-name-1/
│   │   ├── src/
│   │   ├── tests/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── README.md
│   └── server-name-2/
│       └── ...
├── packages/
│   └── shared/
│       ├── src/
│       └── package.json
├── docs/
├── package.json
├── .nvmrc
├── .editorconfig
├── eslint.config.mjs
└── .prettierrc
```

## Node.js Version Management

### .nvmrc

Use `.nvmrc` file at the root to specify the Node.js version:

```
20.x.x
```

All developers should use `nvm use` to ensure consistent Node.js versions.

## Code Quality Tools

### ESLint

Configuration in `eslint.config.mjs` using the new flat config format:

```javascript
export default [
  {
    ignores: ['**/dist/', '**/node_modules/', '**/coverage/']
  },
  {
    files: ['**/*.js', '**/*.ts'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module'
    },
    rules: {
      // Your rules here
    }
  }
];
```

### Prettier

Configuration in `.prettierrc`:

```json
{
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 120,
  "tabWidth": 2,
  "semi": true,
  "arrowParens": "always"
}
```

### EditorConfig

`.editorconfig` for consistent coding styles:

```ini
root = true

[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
indent_style = space
indent_size = 2
trim_trailing_whitespace = true

[*.md]
trim_trailing_whitespace = false
```

## Testing

### Testing Framework

Use Vitest for unit tests (faster and more modern than Mocha):

```bash
npm install -D vitest
```

### Test Structure

```
src/
└── tools/
    ├── my-tool.ts
    └── my-tool.test.ts
```

### Test Naming Convention

```typescript
import { describe, it, expect } from 'vitest';

describe('MyTool', () => {
  describe('#execute', () => {
    it('should return expected result when given valid input', async () => {
      // Arrange
      const input = { id: '123' };

      // Act
      const result = await myTool.execute(input);

      // Assert
      expect(result).toBeDefined();
    });

    it('should throw error when given invalid input', async () => {
      // Arrange
      const input = { id: '' };

      // Act & Assert
      await expect(myTool.execute(input)).rejects.toThrow();
    });
  });
});
```

## TypeScript Configuration

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

## Environment Variables

### .env Files

Use dotenv for environment variable management:

```bash
npm install dotenv
```

### .env.example

Always provide a `.env.example` file:

```env
# Pix API Configuration
PIX_API_URL=https://api.pix.fr
PIX_API_KEY=your_api_key_here

# MCP Server Configuration
MCP_SERVER_PORT=3000
LOG_LEVEL=info
```

### Loading Environment Variables

```typescript
import 'dotenv/config';

const config = {
  apiUrl: process.env.PIX_API_URL || 'https://api.pix.fr',
  apiKey: process.env.PIX_API_KEY,
  logLevel: process.env.LOG_LEVEL || 'info',
};

// Validate required variables
if (!config.apiKey) {
  throw new Error('PIX_API_KEY environment variable is required');
}
```

## Code Style Conventions

### Naming Conventions

- **Files**: kebab-case (`my-tool.ts`, `user-service.ts`)
- **Classes**: PascalCase (`UserService`, `PixApiClient`)
- **Functions/Variables**: camelCase (`getUserInfo`, `apiClient`)
- **Constants**: UPPER_SNAKE_CASE (`API_TIMEOUT`, `MAX_RETRIES`)
- **Interfaces/Types**: PascalCase with descriptive names (`UserProfile`, `ApiResponse`)

### Function Structure

```typescript
/**
 * Retrieves user information from Pix API
 * @param userId - The unique identifier of the user
 * @returns User profile data
 * @throws {ApiError} When the API request fails
 */
async function getUserInfo(userId: string): Promise<UserProfile> {
  // Validation
  if (!userId) {
    throw new Error('userId is required');
  }

  // Implementation
  const response = await apiClient.get(`/users/${userId}`);

  // Return
  return response.data;
}
```

### Async/Await

Prefer async/await over promises for better readability:

```typescript
// Good
async function fetchData() {
  try {
    const result = await apiClient.get('/data');
    return result;
  } catch (error) {
    logger.error('Failed to fetch data', error);
    throw error;
  }
}

// Avoid
function fetchData() {
  return apiClient.get('/data')
    .then(result => result)
    .catch(error => {
      logger.error('Failed to fetch data', error);
      throw error;
    });
}
```

### Error Handling

Use custom error classes:

```typescript
export class PixApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public response?: unknown,
  ) {
    super(message);
    this.name = 'PixApiError';
  }
}

// Usage
if (response.status !== 200) {
  throw new PixApiError(
    'Failed to fetch user',
    response.status,
    response.data,
  );
}
```

## Git Workflow

### Commit Messages

Follow conventional commits:

```
feat: add new tool for user management
fix: handle timeout errors in API client
docs: update README with setup instructions
test: add tests for authentication flow
refactor: simplify error handling logic
chore: update dependencies
```

### Branch Naming

```
feature/mcp-server-pix-api
fix/authentication-timeout
docs/api-reference
```

## Logging

### Pino Logger

All MCP servers use [Pino](https://github.com/pinojs/pino) for logging:

```typescript
import { createLogger } from '@pix-mcps/shared';

const logger = createLogger('my-server');

logger.info('Server started');
logger.debug('Debug information', { data: 'value' });
logger.warn('Warning message');
logger.error('Error occurred', error);
```

**Configuration:**
- `LOG_LEVEL`: Set to `debug`, `info`, `warn`, or `error` (default: `info`)
- `NODE_ENV`: Set to `production` for JSON logging, otherwise pretty print

**Benefits:**
- Fast, low-overhead logging
- Structured JSON logs in production
- Pretty colored output in development
- Automatic context enrichment

## Dependencies Management

### Package.json Scripts

Standard scripts for each MCP server:

```json
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "test": "vitest",
    "test:coverage": "vitest --coverage",
    "lint": "eslint src",
    "lint:fix": "eslint src --fix",
    "format": "prettier --write \"src/**/*.ts\"",
    "typecheck": "tsc --noEmit"
  }
}
```

### Dependency Categories

```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.x.x",
    "@pix-mcps/shared": "*",
    "dotenv": "^x.x.x",
    "zod": "^x.x.x"
  },
  "devDependencies": {
    "@types/node": "^20.x.x",
    "eslint": "^9.x.x",
    "prettier": "^3.x.x",
    "tsx": "^4.x.x",
    "typescript": "^5.x.x",
    "vitest": "^2.x.x"
  }
}
```

## Documentation

### README.md Structure

Each MCP server should have:

1. **Title and Description**
2. **Prerequisites**
3. **Installation**
4. **Configuration**
5. **Usage**
6. **Available Tools**
7. **Development**
8. **Testing**
9. **Contributing**

### Code Documentation

Use JSDoc for functions and classes:

```typescript
/**
 * Client for interacting with Pix API
 */
export class PixApiClient {
  /**
   * Creates a new PixApiClient instance
   * @param config - Client configuration
   */
  constructor(private config: PixApiConfig) {}

  /**
   * Fetches user data from the API
   * @param userId - User identifier
   * @returns Promise resolving to user data
   * @throws {PixApiError} When the request fails
   */
  async getUser(userId: string): Promise<User> {
    // Implementation
  }
}
```

## License

Follow Pix's approach with AGPL-3.0 or choose an appropriate open-source license for this monorepo.
