# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial public release preparation
- TypeScript templates (basic, mcp-server, external-api)
- Python template (basic)
- Go template (basic)
- Plugin Intelligence Document (PID) schema
- GitHub Actions workflows (CI, CodeQL, Release)
- Comprehensive documentation

## [3.0.0] - 2025-01-XX

### Added
- Plugin Intelligence Document (PID) support for LLM-optimized metadata
- `PluginBuilder` fluent API for plugin creation
- `MCPServerBuilder` for MCP-compliant server creation
- Zod schema integration with automatic JSON Schema conversion
- Multi-format export (JSON, MCP, Markdown, OpenAPI)
- Testing utilities with mocks and helpers
- Execution profiles with performance, cost, and reliability metrics
- Trust levels and security certifications
- Context requirements for permissions and services

### Changed
- Complete SDK rewrite for v3.0
- New manifest schema (v2) with enhanced capabilities
- Improved type safety throughout

### Removed
- Legacy v2.x APIs (see migration guide)

## [2.0.0] - 2024-XX-XX

### Added
- Initial MCP support
- Basic plugin scaffolding
- Simple validation

## [1.0.0] - 2024-XX-XX

### Added
- Initial release
- Basic plugin architecture
- Command-line tools

[Unreleased]: https://github.com/adverant/nexus-plugin-template/compare/v3.0.0...HEAD
[3.0.0]: https://github.com/adverant/nexus-plugin-template/compare/v2.0.0...v3.0.0
[2.0.0]: https://github.com/adverant/nexus-plugin-template/compare/v1.0.0...v2.0.0
[1.0.0]: https://github.com/adverant/nexus-plugin-template/releases/tag/v1.0.0
