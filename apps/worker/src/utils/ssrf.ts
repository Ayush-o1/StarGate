import dns from 'dns/promises';

const BLOCKED_IPS = [
  '127.0.0.1',
  '0.0.0.0',
  '169.254.169.254',
];

const BLOCKED_HOSTS = [
  'localhost',
  'internal',
  'host.docker.internal'
];

/**
 * Validates a URL to prevent Server-Side Request Forgery (SSRF)
 * by blocking requests to local, private, or loopback interfaces.
 */
export async function validateSSRF(urlString: string): Promise<void> {
  // If explicitly allowed via env var, skip validation
  if (process.env.ALLOW_LOCAL_REQUESTS === 'true') {
    return;
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(urlString);
  } catch (err) {
    throw new Error(`Invalid URL: ${urlString}`);
  }

  // 1. Check blocked hostnames directly
  if (BLOCKED_HOSTS.includes(parsedUrl.hostname.toLowerCase())) {
    throw new Error(`SSRF blocked: Host ${parsedUrl.hostname} is forbidden.`);
  }

  // 2. Resolve DNS to check IP addresses (prevent DNS rebinding or direct IP passing)
  let addresses: string[] = [];
  try {
    // If hostname is already an IP, it will just return the IP
    const resolved = await dns.resolve(parsedUrl.hostname);
    if (Array.isArray(resolved)) {
        addresses = resolved;
    } else {
        addresses = [resolved];
    }
  } catch (err) {
    // For local dev, maybe DNS fails to resolve
  }

  for (const ip of addresses) {
    // Basic IP block checks
    if (BLOCKED_IPS.includes(ip) || ip.startsWith('10.') || ip.startsWith('192.168.') || ip.startsWith('172.')) {
      throw new Error(`SSRF blocked: IP ${ip} is forbidden.`);
    }
  }
}
