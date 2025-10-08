# Contributing to Pix MCP Servers

Thank you for your interest in contributing to the Pix MCP Servers monorepo! This document provides guidelines and instructions for contributing.

## Getting Started

### Prerequisites

- Node.js 20.x (specified in `.nvmrc`)
- npm 10.x or later
- Git

### Setup

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd pix-mcps
   ```

2. Use the correct Node.js version:

   ```bash
   nvm use
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

## Development Workflow

### Creating a New MCP Server

1. Create a new directory in `servers/`:

   ```bash
   mkdir servers/my-new-server
   cd servers/my-new-server
   ```

2. Initialize the package:

   ```bash
   npm init -y
   ```

3. Follow the structure outlined in the main README.md

4. Update the root `.mcp.json` to include your server

### Code Standards

- Follow the [Pix Coding Standards](./docs/pix-coding-standards.md)
- Use TypeScript for all code
- Write tests for all tools and utilities
- Document all public APIs and tools

### Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat:` A new feature
- `fix:` A bug fix
- `docs:` Documentation only changes
- `style:` Code style changes (formatting, missing semi colons, etc)
- `refactor:` Code changes that neither fix a bug nor add a feature
- `perf:` Performance improvements
- `test:` Adding or updating tests
- `chore:` Changes to build process or auxiliary tools

Examples:

```
feat(pix-api): add user lookup tool
fix(shared): handle undefined environment variables
docs: update README with new server instructions
test(pix-api): add integration tests for authentication
```

### Branch Naming

- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation updates
- `refactor/description` - Code refactoring

Examples:

- `feature/pix-api-user-tools`
- `fix/auth-timeout-handling`
- `docs/setup-instructions`

## Pull Request Process

1. **Create a feature branch** from `main`:

   ```bash
   git checkout -b feature/my-feature
   ```

2. **Make your changes** following the code standards

3. **Write or update tests** for your changes

4. **Run quality checks**:

   ```bash
   npm run lint
   npm run typecheck
   npm test
   ```

5. **Commit your changes** with conventional commit messages

6. **Push to your branch**:

   ```bash
   git push origin feature/my-feature
   ```

7. **Create a Pull Request** with:
   - Clear title describing the change
   - Description of what changed and why
   - Link to any related issues
   - Screenshots if UI-related

8. **Address review feedback** and update your PR as needed

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests for specific server
npm test --workspace=servers/my-server

# Run with coverage
npm run test:coverage
```

### Writing Tests

Use Vitest for all tests:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';

describe('MyTool', () => {
  beforeEach(() => {
    // Setup
  });

  it('should do something', async () => {
    // Test implementation
  });

  it('should handle errors', async () => {
    // Error handling test
  });
});
```

## Code Review Guidelines

### For Authors

- Keep PRs focused and reasonably sized
- Provide context in the PR description
- Respond to feedback constructively
- Update documentation as needed

### For Reviewers

- Be respectful and constructive
- Focus on code quality, not style preferences
- Test the changes locally if possible
- Approve when satisfied with the changes

## Documentation

### Code Documentation

- Use JSDoc for all public functions and classes
- Include parameter descriptions and return types
- Document error conditions
- Provide usage examples

````typescript
/**
 * Retrieves user information from Pix API
 *
 * @param userId - The unique identifier of the user
 * @returns Promise resolving to user profile data
 * @throws {PixApiError} When the API request fails or user not found
 *
 * @example
 * ```typescript
 * const user = await getUserInfo('123');
 * console.log(user.name);
 * ```
 */
async function getUserInfo(userId: string): Promise<UserProfile> {
  // Implementation
}
````

### README Files

Each MCP server must have a README.md with:

- Description and purpose
- Installation instructions
- Configuration details
- Available tools
- Usage examples
- Development instructions

## Environment Variables

### Adding New Variables

1. Document in `.env.example`
2. Add validation in code
3. Update README.md
4. Never commit actual `.env` files

### Naming Convention

- Use UPPER_SNAKE_CASE
- Prefix with the service name (e.g., `PIX_API_KEY`)
- Be descriptive and unambiguous

## Troubleshooting

### Common Issues

**Tests failing locally but not in CI**

- Ensure you're using the correct Node.js version (`nvm use`)
- Clear node_modules and reinstall

**Type errors**

- Run `npm run typecheck` to see all errors
- Ensure all dependencies are installed
- Check tsconfig.json configuration

**Linting errors**

- Run `npm run lint:fix` to auto-fix
- Check eslint.config.mjs for rules

## Questions?

- Check the [documentation](./docs/)
- Review existing MCP servers for examples
- Ask in the development team chat
- Open an issue for bugs or feature requests

## License

By contributing, you agree that your contributions will be licensed under the same license as the project (AGPL-3.0).
