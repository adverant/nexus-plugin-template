# Security Guidelines for Nexus Plugin Development

This document outlines security best practices and requirements for Nexus plugins.

## Security Principles

1. **Principle of Least Privilege**: Request only necessary permissions
2. **Defense in Depth**: Multiple layers of security
3. **Secure by Default**: Secure configurations out of the box
4. **Fail Securely**: Handle errors without exposing sensitive data

## Input Validation

### Always Validate All Inputs

```typescript
// ❌ Dangerous - no validation
handler: async (input) => {
  const data = await db.query(`SELECT * FROM users WHERE id = ${input.id}`);
  return data;
}

// ✅ Safe - validated with Zod schema
const inputSchema = z.object({
  id: z.string().uuid(), // Strict UUID format
});

handler: async (input, context) => {
  // Input already validated by schema
  const data = await db.query('SELECT * FROM users WHERE id = $1', [input.id]);
  return data;
}
```

### Sanitize String Inputs

```typescript
import { z } from 'zod';

const inputSchema = z.object({
  // Limit length
  query: z.string().min(1).max(1000),
  
  // Restrict to patterns
  username: z.string().regex(/^[a-zA-Z0-9_-]+$/),
  
  // Enum for fixed values
  action: z.enum(['create', 'read', 'update', 'delete']),
  
  // URL validation
  website: z.string().url(),
  
  // Email validation
  email: z.string().email(),
});
```

### Validate Nested Objects

```typescript
const inputSchema = z.object({
  user: z.object({
    name: z.string().max(100),
    settings: z.object({
      theme: z.enum(['light', 'dark']),
      notifications: z.boolean(),
    }),
  }),
  // Limit array sizes
  tags: z.array(z.string().max(50)).max(10),
});
```

## Secrets Management

### Never Hardcode Secrets

```typescript
// ❌ Never do this
const API_KEY = 'sk-1234567890abcdef';

// ✅ Use environment variables
const API_KEY = process.env.EXTERNAL_API_KEY;
if (!API_KEY) {
  throw new Error('EXTERNAL_API_KEY environment variable required');
}
```

### Use the Manifest for Env Vars

```json
{
  "nexus": {
    "environmentVariables": [
      {
        "name": "EXTERNAL_API_KEY",
        "required": true,
        "description": "API key for external service"
      }
    ]
  }
}
```

### Never Log Secrets

```typescript
// ❌ Dangerous
logger.info('Calling API', { apiKey: config.apiKey });

// ✅ Safe
logger.info('Calling API', { apiKeyPrefix: config.apiKey.slice(0, 8) + '...' });
```

## Permissions

### Request Minimal Permissions

```typescript
// ❌ Too broad
.setContextRequirements({
  permissions: ['nexus:*', 'network:*'],
})

// ✅ Specific permissions
.setContextRequirements({
  permissions: [
    'nexus:graphrag:read',  // Only read access
  ],
})
```

### Document Permission Usage

```typescript
.setContextRequirements({
  permissions: [
    'nexus:graphrag:read',   // For searching documents
    'nexus:graphrag:write',  // For storing new memories
  ],
})
```

## Error Handling

### Don't Expose Internal Details

```typescript
// ❌ Exposes internal info
catch (error) {
  throw new Error(`Database error: ${error.stack}`);
}

// ✅ Generic user-facing message
catch (error) {
  context.logger.error('Database operation failed', {
    error: error.message,
    stack: error.stack,
    query: 'REDACTED',  // Don't log sensitive query details
  });
  
  throw new PluginError({
    code: 'DATABASE_ERROR',
    message: 'Unable to complete the operation',
    retryable: true,
  });
}
```

### Log Appropriately

```typescript
// ❌ Logs sensitive data
logger.info('User login', { password: user.password });

// ✅ Logs safely
logger.info('User login', { userId: user.id, success: true });
```

## Network Security

### Validate URLs

```typescript
import { URL } from 'url';

function isAllowedUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    
    // Only allow HTTPS
    if (url.protocol !== 'https:') {
      return false;
    }
    
    // Block internal networks
    const blockedHosts = [
      'localhost',
      '127.0.0.1',
      '0.0.0.0',
      '169.254.',  // Link-local
      '10.',       // Private
      '172.16.',   // Private
      '192.168.',  // Private
    ];
    
    for (const blocked of blockedHosts) {
      if (url.hostname.startsWith(blocked) || url.hostname === blocked) {
        return false;
      }
    }
    
    return true;
  } catch {
    return false;
  }
}
```

### Use Timeouts

```typescript
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 10000);

try {
  const response = await fetch(url, {
    signal: controller.signal,
    headers: {
      'User-Agent': 'NexusPlugin/1.0',
    },
  });
  // ...
} finally {
  clearTimeout(timeout);
}
```

## Code Execution

### Never Use eval()

```typescript
// ❌ Extremely dangerous
const result = eval(userInput);

// ❌ Also dangerous
const fn = new Function(userInput);

// ✅ Use safe alternatives
import { evaluate } from 'mathjs';  // For math expressions
const result = evaluate('2 + 2');   // Safe expression evaluation
```

### Sanitize Command Arguments

```typescript
import { spawn } from 'child_process';

// ❌ Dangerous - shell injection
exec(`ls ${userInput}`);

// ✅ Safe - no shell, separate arguments
const child = spawn('ls', [userInput], {
  shell: false,
  cwd: '/safe/directory',
});
```

## Docker Security

### Dockerfile Best Practices

```dockerfile
# Use specific version, not latest
FROM node:20-alpine

# Create non-root user
RUN addgroup -S plugin && adduser -S plugin -G plugin

# Set working directory
WORKDIR /app

# Copy package files first (layer caching)
COPY package*.json ./
RUN npm ci --only=production

# Copy application code
COPY --chown=plugin:plugin . .

# Drop to non-root user
USER plugin

# Set read-only filesystem where possible
RUN chmod -R 555 /app

# Health check
HEALTHCHECK --interval=30s --timeout=3s \
  CMD node -e "process.exit(0)" || exit 1

CMD ["node", "dist/index.js"]
```

### Container Security

```yaml
# Kubernetes security context
securityContext:
  runAsNonRoot: true
  runAsUser: 65534
  readOnlyRootFilesystem: true
  allowPrivilegeEscalation: false
  capabilities:
    drop:
      - ALL
```

## Data Protection

### Encrypt Sensitive Data

```typescript
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';

function encrypt(data: string, key: Buffer): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return [
    iv.toString('hex'),
    authTag.toString('hex'),
    encrypted,
  ].join(':');
}
```

### Minimize Data Retention

```typescript
// Clear sensitive data after use
function processSecureData(data: Buffer): void {
  try {
    // Process data...
  } finally {
    // Zero out the buffer
    data.fill(0);
  }
}
```

## Rate Limiting

### Implement Rate Limits

```typescript
class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private readonly limit: number;
  private readonly window: number;
  
  constructor(limit: number, windowMs: number) {
    this.limit = limit;
    this.window = windowMs;
  }
  
  check(key: string): boolean {
    const now = Date.now();
    const windowStart = now - this.window;
    
    const timestamps = (this.requests.get(key) || [])
      .filter(t => t > windowStart);
    
    if (timestamps.length >= this.limit) {
      return false;
    }
    
    timestamps.push(now);
    this.requests.set(key, timestamps);
    return true;
  }
}

const limiter = new RateLimiter(100, 60000); // 100 req/min

handler: async (input, context) => {
  if (!limiter.check(context.userId)) {
    throw new PluginError({
      code: 'RATE_LIMITED',
      message: 'Too many requests, please try again later',
      retryable: true,
      retryAfter: 60,
    });
  }
  // ...
}
```

## Security Checklist

### Before Submission

- [ ] All inputs validated with Zod schemas
- [ ] No hardcoded secrets
- [ ] Environment variables documented in manifest
- [ ] Error messages don't expose internals
- [ ] Logging doesn't include sensitive data
- [ ] Minimal permissions requested
- [ ] Docker runs as non-root user
- [ ] Dependencies up to date
- [ ] No use of eval() or similar
- [ ] Network requests validated and timeout-protected
- [ ] Rate limiting implemented (if applicable)

### Regular Maintenance

- [ ] Run `npm audit` weekly
- [ ] Update dependencies monthly
- [ ] Review and rotate credentials quarterly
- [ ] Monitor security advisories for dependencies
