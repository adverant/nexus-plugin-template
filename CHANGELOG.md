# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-12-07

### Added

- **SDK Core**
  - `PluginBuilder` - Fluent API for creating Nexus plugins
  - `MCPServerBuilder` - Build MCP-compliant servers for AI IDE integration
  - Zod schema integration with automatic JSON Schema conversion
  - Plugin Intelligence Document (PID) generation and validation
  - Multi-format export (JSON, MCP, Markdown, OpenAPI)
  - Testing utilities with mock services

- **TypeScript Templates**
  - `basic` - Simple calculator plugin demonstrating core concepts
  - `mcp-server` - Advanced plugin with Nexus GraphRAG integration
  - `external-api` - Weather API plugin with caching, rate limiting, and retry logic

- **Python Template**
  - FastMCP-based plugin structure
  - Pydantic validation integration
  - Async handler support
  - Full example with tests

- **Go Template**
  - mcp-go based plugin structure
  - JSON Schema validation
  - Complete example implementation
  - Makefile for common operations

- **GitHub Actions Workflows**
  - `ci.yml` - Build, test, and lint for all languages
  - `verify.yml` - Nexus verification pipeline
  - `release.yml` - Semantic versioning with changelog generation
  - `security.yml` - Comprehensive security scanning (CodeQL, Trivy, Semgrep)

- **Documentation**
  - Getting started guide for all languages
  - Full API reference
  - MCP integration guide for Claude Code, Cursor, VS Code
  - Security guidelines and best practices
  - VPS deployment guide
  - LLM-ingestible development context (CLAUDE_PROMPT.md)

### Security

- Input validation with Zod schemas
- Secrets management guidelines
- Docker security configuration
- Container scanning with Trivy
- Static analysis with Semgrep
- Secret scanning with truffleHog
- License compliance checking

## [Unreleased]

### Planned

- Rust template
- Plugin marketplace integration
- Visual Studio Code extension
- Plugin hot-reload support
- Enhanced PID validation

---

[1.0.0]: https://github.com/adverant/nexus-plugin-template/releases/tag/v1.0.0
[Unreleased]: https://github.com/adverant/nexus-plugin-template/compare/v1.0.0...HEAD
