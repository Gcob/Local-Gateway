import { execFileSync } from 'child_process';
import { readFileSync } from 'fs';

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function matchesHost(content, domain) {
  const cleaned = content
    .split('\n')
    .filter((line) => !/^\s*#/.test(line))
    .map((line) => line.replace(/#.*$/, ''))
    .join('\n');
  const pattern = new RegExp(`(^|\\s)${escapeRegExp(domain)}(\\s|$)`, 'mi');
  return pattern.test(cleaned);
}

export function hasHost(domain) {
  try {
    return matchesHost(readFileSync('/etc/hosts', 'utf8'), domain);
  } catch {
    return false;
  }
}

const VALID_HOSTNAME =
  /^[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?(\.[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?)*$/;

export function addHost(domain, { skipCheck = false } = {}) {
  const normalized = domain.toLowerCase();

  if (!VALID_HOSTNAME.test(normalized)) {
    throw new Error(`Invalid domain '${domain}'`);
  }

  if (!skipCheck && hasHost(normalized)) {
    console.log(`'${normalized}' already in /etc/hosts, skipping`);
    return;
  }

  console.log(`Adding '${normalized}' to /etc/hosts — sudo password may be required`);
  const entry = `127.0.0.1   ${normalized} # managed by local-gateway\n`;

  execFileSync('sudo', ['tee', '-a', '/etc/hosts'], {
    input: entry,
    stdio: ['pipe', 'ignore', 'inherit'],
  });

  console.log(`'${normalized}' added to /etc/hosts`);
}
