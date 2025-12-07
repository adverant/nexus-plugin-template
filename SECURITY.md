# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 3.x.x   | :white_check_mark: |
| 2.x.x   | :white_check_mark: |
| < 2.0   | :x:                |

## Reporting a Vulnerability

We take the security of Nexus Plugin SDK seriously. If you believe you have found a security vulnerability, please report it to us as described below.

### Please DO NOT:

- Open a public GitHub issue for security vulnerabilities
- Discuss the vulnerability publicly before it's fixed
- Test vulnerabilities against production systems

### Please DO:

1. **Email us directly at security@adverant.ai**
2. Include the following information:
   - Type of vulnerability (e.g., XSS, injection, privilege escalation)
   - Full paths of source file(s) related to the vulnerability
   - Location of the affected source code (tag/branch/commit or direct URL)
   - Step-by-step instructions to reproduce the issue
   - Proof-of-concept or exploit code (if possible)
   - Impact of the issue and how an attacker might exploit it

### What to Expect:

1. **Acknowledgment**: We will acknowledge receipt of your vulnerability report within 48 hours.

2. **Initial Assessment**: Within 7 days, we will:
   - Confirm the vulnerability and its impact
   - Assign a severity rating
   - Begin work on a fix

3. **Resolution Timeline**:
   - Critical vulnerabilities: Fix within 24-72 hours
   - High severity: Fix within 7 days
   - Medium severity: Fix within 30 days
   - Low severity: Fix in next regular release

4. **Disclosure**: Once the vulnerability is fixed:
   - We will release a security advisory
   - We will credit you (unless you prefer to remain anonymous)
   - CVE will be requested if appropriate

## Security Best Practices for Plugin Developers

### Input Validation

```typescript
// Always validate and sanitize user input
import { z } from 'zod';

const inputSchema = z.object({
  query: z.string().min(1).max(1000).trim(),
  limit: z.number().int().min(1).max(100),
});
```

### Credential Handling

```typescript
// Never log or expose credentials
const config = {
  apiKey: process.env.API_KEY, // Never hardcode
  // Use secrets management in production
};

// Never include credentials in error messages
catch (error) {
  throw new Error('Authentication failed'); // Good
  // throw new Error(`Auth failed with key: ${apiKey}`); // Bad!
}
```

### Sandboxing

```typescript
// Use the appropriate execution mode
{
  "nexus": {
    "executionMode": "hardened_docker", // For sensitive operations
    "permissions": ["nexus:graphrag:read"] // Minimal permissions
  }
}
```

### Code Execution

```typescript
// NEVER use eval() or Function() with user input
// Use safe parsers instead
import { evaluate } from 'safe-eval-library';

const result = evaluate(expression, allowedOperations);
```

## Security Features of Nexus Plugin SDK

### Trust Levels

| Level | Description | Capabilities |
|-------|-------------|-------------|
| `unverified` | Auto-scan only | Firecracker only |
| `community` | Automated review | Hardened Docker |
| `enterprise` | Manual review | MCP Container |
| `verified_publisher` | Trusted developer | Full access |
| `nexus_official` | Adverant team | Full access |

### Execution Modes

| Mode | Isolation | Network | Use Case |
|------|-----------|---------|----------|
| `external_https` | None | Open | External APIs |
| `mcp_container` | Docker | Restricted | Standard plugins |
| `hardened_docker` | Docker + seccomp | Air-gapped | Sensitive |
| `firecracker` | MicroVM | Isolated | Untrusted |

### Resource Limits

All plugins run with enforced resource limits:

```json
{
  "resources": {
    "cpuMillicores": 500,
    "memoryMB": 512,
    "diskGB": 1,
    "timeoutMs": 30000
  }
}
```

## Vulnerability Disclosure Policy

We follow a coordinated disclosure approach:

1. We work with the reporter to understand and reproduce the issue
2. We develop and test a fix
3. We prepare a security advisory
4. We release the fix and advisory simultaneously
5. We credit the reporter (with permission)

## Bug Bounty

We currently do not have a formal bug bounty program. However, we deeply appreciate security researchers who take the time to report vulnerabilities responsibly.

We offer:
- Public acknowledgment (with permission)
- Swag and recognition for significant findings
- Consideration for future bug bounty rewards

## Contact

- **Security Email**: security@adverant.ai
- **PGP Key**: Available upon request
- **Response Time**: 48 hours for initial acknowledgment
