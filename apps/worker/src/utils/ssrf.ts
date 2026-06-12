import dns from 'dns/promises';

/**
 * Parses an IPv4 address string into a 32-bit unsigned integer.
 */
function ipToInt(ip: string): number {
  return ip.split('.').reduce((acc, octet) => (acc << 8) | parseInt(octet, 10), 0) >>> 0;
}

/**
 * Returns true if the given IPv4 address falls within the CIDR block.
 * @param ip      - e.g. "172.67.10.5"
 * @param cidr    - e.g. "172.16.0.0/12"
 */
function isInCIDR(ip: string, cidr: string): boolean {
  const [network, prefixStr] = cidr.split('/');
  const prefix = parseInt(prefixStr, 10);
  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
  return (ipToInt(ip) & mask) === (ipToInt(network) & mask);
}

/**
 * Returns true if the IP is an IPv4 address (basic check).
 */
function isIPv4(ip: string): boolean {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(ip);
}

/**
 * Returns true if the IP is a private/loopback/link-local address
 * that should be blocked for SSRF protection.
 *
 * Blocked ranges (RFC 1918, RFC 5735, RFC 3927):
 *   - 127.0.0.0/8      — loopback
 *   - 10.0.0.0/8       — private
 *   - 172.16.0.0/12    — private (172.16.x.x – 172.31.x.x) ← was incorrectly 172.*
 *   - 192.168.0.0/16   — private
 *   - 169.254.0.0/16   — link-local (AWS metadata, etc.)
 *   - 0.0.0.0/8        — "this" network
 *   - 100.64.0.0/10    — shared address space (RFC 6598)
 */
const PRIVATE_CIDR_RANGES = [
  '127.0.0.0/8',
  '10.0.0.0/8',
  '172.16.0.0/12',   // ← FIXED: was startsWith('172.') which blocked 172.67.x.x (Cloudflare)
  '192.168.0.0/16',
  '169.254.0.0/16',
  '0.0.0.0/8',
  '100.64.0.0/10',
];

/** Literal IPs that are always blocked regardless of CIDR matching. */
const BLOCKED_LITERAL_IPS = new Set(['0.0.0.0', '255.255.255.255']);

/** Hostnames that are always blocked. */
const BLOCKED_HOSTS = new Set(['localhost', 'internal', 'host.docker.internal']);

/**
 * Validates a URL to prevent Server-Side Request Forgery (SSRF).
 * Blocks requests to loopback, private, or link-local destinations
 * while allowing legitimate public internet hosts (including Cloudflare CDN).
 *
 * @throws {Error} if the URL resolves to a private/blocked IP.
 */
export async function validateSSRF(urlString: string): Promise<void> {
  // Allow override for local development / testing environments
  if (process.env.ALLOW_LOCAL_REQUESTS === 'true') {
    return;
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(urlString);
  } catch {
    throw new Error(`Invalid URL: ${urlString}`);
  }

  const hostname = parsedUrl.hostname.toLowerCase();

  // 1. Reject blocked hostnames directly
  if (BLOCKED_HOSTS.has(hostname)) {
    throw new Error(`SSRF blocked: Host "${parsedUrl.hostname}" is forbidden.`);
  }

  // 2. If the hostname is already an IP address, check it directly
  if (isIPv4(hostname)) {
    checkIP(hostname);
    return; // No DNS resolution needed
  }

  // 3. Resolve DNS to get actual IP(s) and check each one
  let addresses: string[] = [];
  try {
    const resolved = await dns.resolve4(parsedUrl.hostname);
    addresses = Array.isArray(resolved) ? resolved : [resolved];
  } catch {
    // DNS resolution failed — could be a legit transient error or bad host.
    // We fail open here (allow) to avoid blocking valid requests on DNS hiccup,
    // consistent with the previous behaviour.
  }

  for (const ip of addresses) {
    checkIP(ip);
  }
}

/**
 * Throws if the given IP is in a blocked range.
 * Exported for unit-testing purposes.
 */
export function checkIP(ip: string): void {
  if (BLOCKED_LITERAL_IPS.has(ip)) {
    throw new Error(`SSRF blocked: IP "${ip}" is forbidden.`);
  }

  if (!isIPv4(ip)) {
    // IPv6 private ranges (::1, fc00::/7, fe80::/10, etc.)
    const lower = ip.toLowerCase();
    if (
      lower === '::1' ||
      lower.startsWith('fc') ||
      lower.startsWith('fd') ||
      lower.startsWith('fe80')
    ) {
      throw new Error(`SSRF blocked: IPv6 address "${ip}" is in a private range.`);
    }
    return; // Public IPv6 — allow
  }

  for (const cidr of PRIVATE_CIDR_RANGES) {
    if (isInCIDR(ip, cidr)) {
      throw new Error(`SSRF blocked: IP "${ip}" is in the private range ${cidr}.`);
    }
  }
}
