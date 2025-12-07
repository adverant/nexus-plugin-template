# Contributing to Nexus Plugin Template

Thank you for your interest in contributing to the Nexus Plugin Template! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Documentation](#documentation)
- [Community](#community)

## Code of Conduct

This project adheres to the [Contributor Covenant Code of Conduct](./CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to conduct@adverant.ai.

## Getting Started

### Prerequisites

- **Node.js** 18+ (for TypeScript development)
- **Python** 3.10+ (for Python template development)
- **Go** 1.21+ (for Go template development)
- **Git** for version control
- **Docker** (optional, for testing containerized builds)

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/nexus-plugin-template.git
   cd nexus-plugin-template
   ```
3. Add the upstream remote:
   ```bash
   git remote add upstream https://github.com/adverant/nexus-plugin-template.git
   ```

## Development Setup

### TypeScript/SDK Development

```bash
# Install dependencies
npm install

# Build the SDK
npm run build

# Run tests
npm test

# Run linting
npm run lint

# Type checking
npm run typecheck
```

### Python Template Development

```bash
cd templates/python

# Create virtual environment
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows

# Install dependencies
pip install -e ".[dev]"

# Run tests
pytest

# Run linting
ruff check .
mypy src/
```

### Go Template Development

```bash
cd templates/go

# Download dependencies
go mod tidy

# Run tests
go test ./...

# Run linting
golangci-lint run

# Build
go build .
```

## Making Changes

### Branch Naming

Use descriptive branch names:

- `feature/add-new-template` - New features
- `fix/schema-validation-bug` - Bug fixes
- `docs/update-api-reference` - Documentation updates
- `refactor/simplify-plugin-builder` - Code refactoring
- `test/add-integration-tests` - Test additions

### Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(sdk): add support for streaming responses
fix(python): handle empty input validation
docs(readme): add installation instructions for Go
test(mcp-server): add integration tests for GraphRAG
```

### Development Workflow

1. **Sync with upstream:**
   ```bash
   git fetch upstream
   git checkout main
   git merge upstream/main
   ```

2. **Create a feature branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes** with appropriate tests

4. **Run all checks:**
   ```bash
   npm run lint
   npm run typecheck
   npm test
   ```

5. **Commit your changes:**
   ```bash
   git add .
   git commit -m "feat(scope): your change description"
   ```

6. **Push to your fork:**
   ```bash
   git push origin feature/your-feature-name
   ```

7. **Open a Pull Request** on GitHub

## Pull Request Process

### Before Submitting

- [ ] All tests pass locally
- [ ] Linting passes with no errors
- [ ] TypeScript compiles without errors
- [ ] New code has appropriate test coverage
- [ ] Documentation is updated if needed
- [ ] CHANGELOG.md is updated for significant changes

### PR Description Template

When opening a PR, please include:

```markdown
## Description
[Describe your changes]

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
[Describe how you tested your changes]

## Checklist
- [ ] Tests pass
- [ ] Linting passes
- [ ] Documentation updated
- [ ] CHANGELOG updated (if applicable)
```

### Review Process

1. A maintainer will review your PR
2. Address any requested changes
3. Once approved, your PR will be merged
4. Your contribution will be included in the next release

## Coding Standards

### TypeScript

- Use strict TypeScript configuration
- Prefer `const` over `let`
- Use meaningful variable names
- Document public APIs with JSDoc comments
- Use Zod for runtime validation
- Follow existing code patterns

```typescript
// ✅ Good
const validateInput = (input: unknown): ValidatedInput => {
  return InputSchema.parse(input);
};

// ❌ Bad
function validate(i: any) {
  return i;
}
```

### Python

- Follow PEP 8 style guidelines
- Use type hints for all public functions
- Use Pydantic for data validation
- Write docstrings for public APIs

```python
# ✅ Good
def process_input(data: InputModel) -> OutputModel:
    """Process the input data and return results.
    
    Args:
        data: The validated input model.
        
    Returns:
        The processed output model.
    """
    return OutputModel(result=data.value.upper())

# ❌ Bad
def process(d):
    return d.upper()
```

### Go

- Follow Go idioms and conventions
- Use meaningful error messages
- Document exported functions
- Handle errors explicitly

```go
// ✅ Good
// ProcessInput handles the input and returns the result.
func ProcessInput(input *InputModel) (*OutputModel, error) {
    if input == nil {
        return nil, fmt.Errorf("input cannot be nil")
    }
    return &OutputModel{Result: strings.ToUpper(input.Value)}, nil
}

// ❌ Bad
func process(i interface{}) interface{} {
    return i
}
```

## Testing

### Test Requirements

- All new features must have tests
- Bug fixes should include regression tests
- Maintain or improve code coverage
- Tests should be deterministic (no flaky tests)

### Running Tests

```bash
# TypeScript
npm test
npm run test:coverage

# Python
cd templates/python
pytest --cov=src

# Go
cd templates/go
go test -cover ./...
```

### Test Patterns

```typescript
import { describe, it, expect } from 'vitest';
import { PluginBuilder } from '../src';

describe('PluginBuilder', () => {
  it('should create a valid plugin', () => {
    const plugin = PluginBuilder.create({
      id: 'test-plugin',
      name: 'test',
      displayName: 'Test Plugin',
      version: '1.0.0',
      description: 'A test plugin',
    });

    const pid = plugin.generatePID();
    expect(pid.id).toBe('test-plugin');
  });

  it('should validate required fields', () => {
    expect(() => {
      PluginBuilder.create({} as any);
    }).toThrow();
  });
});
```

## Documentation

### When to Update Documentation

- Adding new features or APIs
- Changing existing behavior
- Fixing unclear or incorrect documentation
- Adding examples or tutorials

### Documentation Files

- `README.md` - Project overview and quick start
- `docs/getting-started.md` - Detailed setup guide
- `docs/api-reference.md` - API documentation
- `docs/CLAUDE_PROMPT.md` - LLM development context
- `CHANGELOG.md` - Version history

### Writing Good Documentation

- Use clear, concise language
- Include code examples
- Show expected outputs
- Document edge cases
- Keep it up to date

## Community

### Getting Help

- **GitHub Issues**: For bug reports and feature requests
- **GitHub Discussions**: For questions and community discussion
- **Documentation**: [docs.nexus.adverant.ai/plugins](https://docs.nexus.adverant.ai/plugins)

### Recognition

All contributors are recognized in:
- GitHub's contributor list
- Release notes for significant contributions
- Annual contributor recognition (for sustained contributions)

## Thank You!

Your contributions make this project better for everyone. We appreciate your time and effort!

---

*If you have questions about contributing, feel free to open a discussion on GitHub.*
