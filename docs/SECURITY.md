# Stargate Security

> Security architecture, threat mitigations, and hardening measures in the Stargate platform.

---

## Table of Contents

- [Security Overview](#security-overview)
- [Authentication & Session Management](#authentication--session-management)
- [Authorization & RBAC](#authorization--rbac)
- [SSRF Protection](#ssrf-protection)
- [Input Validation & Payload Limits](#input-validation--payload-limits)
- [Cyclic Dependency Prevention](#cyclic-dependency-prevention)
- [Execution Timeout Enforcement](#execution-timeout-enforcement)
- [HTTP Security Headers](#http-security-headers)
- [Secret Management](#secret-management)
- [Known Limitations](#known-limitations)

---

## Security Overview

Stargate's threat model centers on two primary attack surfaces:

1. **The API Gateway** — An authenticated multi-tenant REST service that must enforce workspace isolation and reject malformed inputs.
2. **The Execution Worker** — A headless process that executes arbitrary HTTP requests on behalf of users, creating risk of SSRF, resource exhaustion, and denial-of-service.

| Threat | Mitigation |
|--------|-----------|
| Unauthenticated access | JWT-based auth on all resource endpoints |
| Cross-tenant data access | Per-workspace RBAC with membership validation |
| SSRF via HTTP nodes | DNS-resolved IP blocking in worker validator |
| DoS via large payloads | 1MB Express middleware limit |
| DoS via infinite loops | Cyclic graph detection (topological sort) |
| Thread starvation | 5-minute global execution timeout |
| Credential exposure | Hashed passwords (bcrypt), hashed refresh tokens |

---

## Authentication & Session Management

### Password Storage
Passwords are hashed using **bcrypt** before storage. The raw password is never persisted.

```typescript
// Registration
const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
await prisma.user.create({ data: { email, passwordHash, name } });

// Login verification
const isValid = await bcrypt.compare(inputPassword, user.passwordHash);
```

### JWT Tokens
Stargate uses a **dual-token** authentication pattern:

| Token | Storage | TTL | Purpose |
|-------|---------|-----|---------|
| `accessToken` | In-memory (Zustand) | 15 minutes | API authorization |
| `refreshToken` | HTTP-only (secure) | 7 days | Access token renewal |

The access token is short-lived to limit the damage window of token interception. The refresh token is stored in the database as a **hashed** value — the raw token is never persisted.

### Refresh Token Rotation
Every refresh operation:
1. Validates the incoming refresh token against its hash in the database
2. Verifies it is not revoked and not expired
3. **Revokes** the used refresh token
4. Issues a **new** access token and refresh token pair

This means a stolen refresh token can only be used once. If it's used, the legitimate user's next refresh will fail (the token is already revoked), alerting them to re-authenticate.

### Token Invalidation
Logout explicitly revokes the refresh token in the database:
```typescript
await prisma.refreshToken.update({
  where: { hashedToken: hash(refreshToken) },
  data: { revoked: true }
});
```

---

## Authorization & RBAC

### Workspace-Scoped Authorization
Every resource (Workflow, Node, Edge, Trigger, Execution) is owned by a Workspace. API middleware validates that the requesting user is a member of the target workspace before allowing access.

```typescript
// Authorization middleware (simplified)
async function requireWorkspaceMember(req, res, next) {
  const { userId } = req.user;
  const { workspaceId } = req.params;
  
  const membership = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } }
  });
  
  if (!membership) {
    return res.status(403).json({ error: 'Forbidden: not a member of this workspace' });
  }
  
  req.membership = membership;
  next();
}
```

### Role Definitions
| Role | Permissions |
|------|------------|
| `OWNER` | Full CRUD on workspace, workflows, members; can delete workspace |
| `MEMBER` | Read/write workflows and executions; cannot modify workspace settings |

### Cross-Workspace Isolation
The database schema enforces workspace ownership at the Prisma query level. All workflow queries include a `workspaceId` filter, ensuring data from one workspace is never accessible from another, even if a user is a member of multiple workspaces.

---

## SSRF Protection

Server-Side Request Forgery (SSRF) is the most critical threat in a workflow orchestrator because users define HTTP node URLs through the UI, and the worker executes them server-side. Without protections, a malicious user could target internal services.

### Threat Model
```
Attacker defines HTTP node URL: http://169.254.169.254/latest/meta-data/
Worker executes it → Returns AWS/GCP cloud metadata (keys, credentials)

Attacker defines HTTP node URL: http://localhost:3000/api/v1/admin/
Worker executes it → Bypasses external auth, accesses internal endpoints
```

### Implementation (`apps/worker/src/utils/ssrf.ts`)

The `validateSSRF()` function is called before **every** HTTP node execution:

```typescript
const BLOCKED_IPS = [
  '127.0.0.1',       // IPv4 loopback
  '0.0.0.0',         // Null address
  '169.254.169.254', // AWS/GCP/Azure instance metadata service
];

const BLOCKED_HOSTS = [
  'localhost',
  'internal',
  'host.docker.internal'
];

export async function validateSSRF(urlString: string): Promise<void> {
  const parsedUrl = new URL(urlString);

  // 1. Block forbidden hostnames directly
  if (BLOCKED_HOSTS.includes(parsedUrl.hostname.toLowerCase())) {
    throw new Error(`SSRF blocked: Host ${parsedUrl.hostname} is forbidden.`);
  }

  // 2. Resolve DNS and check resolved IPs
  // This prevents DNS rebinding attacks where a public domain
  // resolves to a private IP address
  const addresses = await dns.resolve(parsedUrl.hostname);
  
  for (const ip of addresses) {
    if (
      BLOCKED_IPS.includes(ip) ||
      ip.startsWith('10.') ||        // RFC 1918 private range
      ip.startsWith('192.168.') ||   // RFC 1918 private range
      ip.startsWith('172.')          // RFC 1918 private range (172.16.0.0/12)
    ) {
      throw new Error(`SSRF blocked: IP ${ip} is forbidden.`);
    }
  }
}
```

### DNS Rebinding Prevention
The validator performs **DNS resolution** and checks resolved IP addresses — not just the hostname string. This prevents:
- Using a custom domain `attacker.com` that resolves to `127.0.0.1`
- Time-of-check to time-of-use (TOCTOU) attacks via DNS rebinding

### Bypass Mechanism (Development Only)
For local development where testing against `localhost` is needed:
```bash
ALLOW_LOCAL_REQUESTS=true  # In .env (development only)
```
This env var is explicitly not present in `.env.example` and must never be set in production.

---

## Input Validation & Payload Limits

### Request Payload Size Limit
All inbound JSON payloads are limited to **1MB**:
```typescript
app.use(express.json({ limit: '1mb' }));
```

Requests exceeding 1MB receive a `413 Payload Too Large` response. This prevents memory exhaustion from large malicious payloads.

### Zod Schema Validation
All API inputs are validated against Zod schemas before processing. Invalid payloads are rejected early with descriptive error messages, preventing malformed data from reaching the database layer.

---

## Cyclic Dependency Prevention

Before any workflow execution is queued, the API performs a **topological sort** on the workflow graph. If the sort cannot complete (i.e., not all nodes are sorted), a cycle is detected and the execution is rejected:

```typescript
if (sorted.length !== nodes.length) {
  return res.status(400).json({
    error: 'Workflow validation failed: cyclic dependency detected'
  });
}
```

Without this check, a cyclic workflow could cause infinite execution loops, consuming worker resources indefinitely.

---

## Execution Timeout Enforcement

All workflow executions are wrapped in a **5-minute global timeout**:

```typescript
const WORKFLOW_TIMEOUT_MS = 5 * 60 * 1000; // 300,000ms

await Promise.race([
  runWorkflowNodes(executionId, nodes, edges),
  new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Workflow exceeded 5-minute limit')), WORKFLOW_TIMEOUT_MS)
  )
]);
```

Additionally, individual HTTP nodes have a configurable per-node timeout (default 30 seconds) enforced via `AbortController`:

```typescript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
const response = await fetch(url, { signal: controller.signal });
```

These two layers prevent:
- Single slow external APIs from blocking the worker indefinitely
- Entire workflows from running forever (e.g., polling loops misconfigured)

---

## HTTP Security Headers

The API uses **Helmet.js** to set security-relevant HTTP response headers:

```typescript
app.use(helmet());
```

Helmet automatically configures:
| Header | Value | Protection |
|--------|-------|------------|
| `X-Content-Type-Options` | `nosniff` | MIME sniffing attacks |
| `X-Frame-Options` | `SAMEORIGIN` | Clickjacking |
| `X-XSS-Protection` | `0` (modern browsers use CSP instead) | Legacy XSS |
| `Strict-Transport-Security` | `max-age=15552000` | HTTP downgrade |
| `Content-Security-Policy` | Default strict policy | XSS injection |

---

## Secret Management

### Environment Variables
All secrets are managed via environment variables:

```env
JWT_ACCESS_SECRET=<strong-random-string>
JWT_REFRESH_SECRET=<strong-strong-string>
DATABASE_URL=postgresql://...
```

The `.env.example` file provides placeholder values only — the secrets shown in the example are example format placeholders and must be replaced with strong random values before any deployment.

### Generating Strong Secrets
```bash
# Generate a 64-character hex secret
openssl rand -hex 32

# Or using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Known Limitations

| Limitation | Risk Level | Mitigation Path |
|-----------|-----------|----------------|
| **172.x SSRF block** | Medium | The current check blocks all `172.x` ranges including non-RFC-1918 ranges. More precise blocking (`172.16.0.0` – `172.31.255.255`) is a future improvement. |
| **IPv6 SSRF** | Medium | SSRF validation only checks IPv4. IPv6 loopback (`::1`) and private ranges are not explicitly blocked. |
| **Shared worker pool** | Low | All tenant executions share the same worker. A rate-limited tenant could affect others. |
| **No request signing** | Low | Webhook ingestion accepts any POST to `/webhooks/:path`. HMAC signature verification is not yet implemented. |
| **No CSP for frontend** | Low | Content Security Policy for the React frontend is not configured at the nginx level. |
