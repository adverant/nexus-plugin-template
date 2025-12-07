# Contributing to Nexus Plugin Template

Thank you for your interest in contributing! This document provides guidelines and steps for contributing to the Nexus Plugin Template repository.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Pull Request Process](#pull-request-process)
- [Style Guidelines](#style-guidelines)
- [Testing](#testing)
- [Documentation](#documentation)

## Code of Conduct

This project adheres to the [Contributor Covenant Code of Conduct](./CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to conduct@adverant.ai.

## Getting Started

### Prerequisites

- Node.js 20+
- npm or pnpm
- Git
- (Optional) Python 3.10+ for Python templates
- (Optional) Go 1.21+ for Go templates

### Repository Structure

```
nexus-plugin-template/
├── packages/
│   └── nexus-plugin-sdk/     # Core SDK
├── templates/
│   ├── typescript/           # TypeScript templates
│   ├── python/               # Python templates
│   └── go/                   # Go templates
├── docs/                     # Documentation
├── scripts/                  # Build and utility scripts
└── .github/                  # GitHub workflows and templates
```

## Development Setup

1. **Fork and clone the repository**

   ```bash
   git clone https://github.com/YOUR_USERNAME/nexus-plugin-template.git
   cd nexus-plugin-template
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Build the SDK**

   ```bash
   npm run build
   ```

4. **Run tests**

   ```bash
   npm test
   ```

## Making Changes

### Branch Naming

Use descriptive branch names:

- `feature/add-python-template` - New features
- `fix/schema-validation-error` - Bug fixes
- `docs/update-api-reference` - Documentation updates
- `refactor/simplify-builder-api` - Code refactoring

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Code style (formatting, etc.)
- `refactor`: Code change without feature/fix
- `test`: Adding/updating tests
- `chore`: Build process, dependencies

**Examples**:

```bash
feat(sdk): add streaming support for tool handlers
fix(templates): resolve type error in Python template
docs(api): update MCPServerBuilder examples
```

## Pull Request Process

1. **Create a feature branch**

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**

   - Write clean, documented code
   - Add or update tests
   - Update documentation if needed

3. **Run quality checks**

   ```bash
   npm run lint
   npm run typecheck
   npm test
   ```

4. **Push and create PR**

   ```bash
   git push origin feature/your-feature-name
   ```

5. **PR Requirements**:

   - Clear description of changes
   - Link to related issue (if applicable)
   - All CI checks passing
   - At least one approval from maintainers
   - No merge conflicts

## Style Guidelines

### TypeScript

- Use TypeScript strict mode
- Prefer `const` over `let`
- Use explicit types for function parameters and return values
- Document public APIs with JSDoc

```typescript
/**
 * Creates a new plugin builder instance.
 * @param config - Plugin configuration options
 * @returns A new PluginBuilder instance
 */
export function createPlugin(config: PluginConfig): PluginBuilder {
  return new PluginBuilder(config);
}
```

### Python

- Follow PEP 8 style guide
- Use type hints (Python 3.10+)
- Document with docstrings (Google style)

```python
def create_plugin(config: PluginConfig) -> PluginBuilder:
    """Creates a new plugin builder instance.
    
    Args:
        config: Plugin configuration options.
        
    Returns:
        A new PluginBuilder instance.
    """
    return PluginBuilder(config)
```

### Go

- Follow Go style guidelines
- Use `gofmt` and `golint`
- Document exported functions

```go
// CreatePlugin creates a new plugin builder instance.
func CreatePlugin(config PluginConfig) *PluginBuilder {
    return NewPluginBuilder(config)
}
```

## Testing

### Running Tests

```bash
# All tests
npm test

# Specific package
npm test --workspace=@adverant-nexus/plugin-sdk

# With coverage
npm test -- --coverage
```

### Writing Tests

- Test happy paths and edge cases
- Use descriptive test names
- Mock external services

```typescript
describe('PluginBuilder', () => {
  describe('addTool', () => {
    it('should add a tool with valid schema', () => {
      const builder = PluginBuilder.create({ name: 'test' });
      builder.addTool({
        name: 'test_tool',
        inputSchema: z.object({ value: z.string() }),
        handler: async () => ({}),
      });
      expect(builder.tools).toHaveLength(1);
    });

    it('should throw on invalid schema', () => {
      const builder = PluginBuilder.create({ name: 'test' });
      expect(() => {
        builder.addTool({ name: '', inputSchema: null });
      }).toThrow();
    });
  });
});
```

## Documentation

### Updating Docs

- Keep README.md in sync with features
- Update API reference for code changes
- Add examples for new features
- Use clear, concise language

### Documentation Structure

```
docs/
├── getting-started.md      # Quick start guide
├── api-reference.md        # Full API documentation
├── mcp-integration.md      # MCP/Claude Code guide
├── security-guidelines.md  # Security best practices
├── deployment.md           # VPS deployment
└── CLAUDE_PROMPT.md        # LLM context document
```

## Questions?

- Open a [GitHub Discussion](https://github.com/adverant/nexus-plugin-template/discussions)
- Join our [Discord](https://discord.gg/adverant)
- Email: support@adverant.ai

Thank you for contributing!
