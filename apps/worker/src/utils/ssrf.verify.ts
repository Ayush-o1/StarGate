/**
 * SSRF Verification Script
 * ========================
 * Run with:  npx ts-node src/utils/ssrf.verify.ts
 *
 * Proves that:
 *   - localhost            → BLOCKED
 *   - 127.0.0.1            → BLOCKED
 *   - 10.x.x.x             → BLOCKED
 *   - 172.16.x.x           → BLOCKED   (start of private range)
 *   - 172.31.x.x           → BLOCKED   (end of private range)
 *   - 172.67.x.x           → ALLOWED   (Cloudflare — was the false-positive)
 *   - 192.168.1.1          → BLOCKED
 *   - 169.254.169.254      → BLOCKED   (AWS metadata endpoint)
 *   - jsonplaceholder.typicode.com → ALLOWED
 */

import { validateSSRF, checkIP } from './ssrf';

// ─── ANSI colours ────────────────────────────────────────────────────────────
const GREEN  = '\x1b[32m';
const RED    = '\x1b[31m';
const YELLOW = '\x1b[33m';
const RESET  = '\x1b[0m';
const BOLD   = '\x1b[1m';

type CaseKind = 'BLOCK' | 'ALLOW';

interface TestCase {
  label: string;
  kind: CaseKind;
  fn: () => Promise<void>;
}

let passed = 0;
let failed = 0;
const failedCases: string[] = [];

async function run(tc: TestCase): Promise<void> {
  let threw = false;
  let errMsg = '';
  try {
    await tc.fn();
  } catch (e: unknown) {
    threw = true;
    errMsg = e instanceof Error ? e.message : String(e);
  }

  const blocked = threw;
  const ok =
    (tc.kind === 'BLOCK' && blocked) ||
    (tc.kind === 'ALLOW' && !blocked);

  const icon   = ok ? '✓' : '✗';
  const color  = ok ? GREEN : RED;
  const expect = tc.kind === 'BLOCK' ? 'BLOCKED' : 'ALLOWED';
  const actual = blocked
    ? `BLOCKED (${errMsg})`
    : 'ALLOWED';

  console.log(`${color}${icon}${RESET} [${expect}] ${tc.label}`);
  if (!ok) {
    console.log(`       ${YELLOW}→ got: ${actual}${RESET}`);
    failedCases.push(tc.label);
    failed++;
  } else {
    passed++;
  }
}

// ─── Test cases ──────────────────────────────────────────────────────────────

const cases: TestCase[] = [
  // ── Hostnames that must be blocked ──────────────────────────────────────
  {
    label: 'localhost (hostname)',
    kind: 'BLOCK',
    fn: () => validateSSRF('http://localhost/'),
  },
  {
    label: 'host.docker.internal (hostname)',
    kind: 'BLOCK',
    fn: () => validateSSRF('http://host.docker.internal/'),
  },

  // ── Direct IPs that must be blocked ─────────────────────────────────────
  {
    label: '127.0.0.1 (loopback)',
    kind: 'BLOCK',
    fn: () => validateSSRF('http://127.0.0.1/'),
  },
  {
    label: '127.0.0.2 (loopback range)',
    kind: 'BLOCK',
    fn: () => validateSSRF('http://127.0.0.2/'),
  },
  {
    label: '10.0.0.1 (RFC-1918 class A)',
    kind: 'BLOCK',
    fn: () => validateSSRF('http://10.0.0.1/'),
  },
  {
    label: '10.255.255.255 (RFC-1918 class A end)',
    kind: 'BLOCK',
    fn: () => validateSSRF('http://10.255.255.255/'),
  },
  {
    label: '172.16.0.1 (RFC-1918 class B start)',
    kind: 'BLOCK',
    fn: () => validateSSRF('http://172.16.0.1/'),
  },
  {
    label: '172.31.255.255 (RFC-1918 class B end)',
    kind: 'BLOCK',
    fn: () => validateSSRF('http://172.31.255.255/'),
  },
  {
    label: '192.168.1.1 (RFC-1918 class C)',
    kind: 'BLOCK',
    fn: () => validateSSRF('http://192.168.1.1/'),
  },
  {
    label: '169.254.169.254 (AWS metadata / link-local)',
    kind: 'BLOCK',
    fn: () => validateSSRF('http://169.254.169.254/'),
  },
  {
    label: '0.0.0.0 (literal blocked IP)',
    kind: 'BLOCK',
    fn: () => validateSSRF('http://0.0.0.0/'),
  },
  {
    label: '100.64.0.1 (shared address space RFC-6598)',
    kind: 'BLOCK',
    fn: () => validateSSRF('http://100.64.0.1/'),
  },

  // ── IP addresses that must be ALLOWED ────────────────────────────────────
  {
    label: '172.67.0.1 (Cloudflare — was false-positive)',
    kind: 'ALLOW',
    fn: async () => { checkIP('172.67.0.1'); },
  },
  {
    label: '172.32.0.1 (public, just outside RFC-1918 class B)',
    kind: 'ALLOW',
    fn: async () => { checkIP('172.32.0.1'); },
  },
  {
    label: '8.8.8.8 (Google DNS)',
    kind: 'ALLOW',
    fn: async () => { checkIP('8.8.8.8'); },
  },
  {
    label: '1.1.1.1 (Cloudflare DNS)',
    kind: 'ALLOW',
    fn: async () => { checkIP('1.1.1.1'); },
  },

  // ── Public DNS resolution (live network check) ───────────────────────────
  {
    label: 'jsonplaceholder.typicode.com (must resolve + be allowed)',
    kind: 'ALLOW',
    fn: () => validateSSRF('https://jsonplaceholder.typicode.com/posts/1'),
  },
  {
    label: 'github.com (must resolve + be allowed)',
    kind: 'ALLOW',
    fn: () => validateSSRF('https://github.com'),
  },
  {
    label: 'api.github.com (must resolve + be allowed)',
    kind: 'ALLOW',
    fn: () => validateSSRF('https://api.github.com'),
  },
];

// ─── Entry point ─────────────────────────────────────────────────────────────

(async () => {
  console.log(`\n${BOLD}════════════════════════════════════════════${RESET}`);
  console.log(`${BOLD}  SSRF Validator — Verification Suite${RESET}`);
  console.log(`${BOLD}════════════════════════════════════════════${RESET}\n`);

  for (const tc of cases) {
    await run(tc);
  }

  const total = passed + failed;
  console.log(`\n${BOLD}────────────────────────────────────────────${RESET}`);
  console.log(`Results: ${GREEN}${passed} passed${RESET} / ${failed > 0 ? RED : GREEN}${failed} failed${RESET} / ${total} total`);

  if (failedCases.length > 0) {
    console.log(`\n${RED}Failed cases:${RESET}`);
    failedCases.forEach(c => console.log(`  • ${c}`));
    process.exit(1);
  } else {
    console.log(`\n${GREEN}${BOLD}All SSRF checks passed. ✓${RESET}`);
    process.exit(0);
  }
})();
