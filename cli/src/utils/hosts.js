import { execFileSync } from 'child_process';
import { readFileSync } from 'fs';

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function hasHost(domain) {
  const pattern = new RegExp(`(^|\\s)${escapeRegExp(domain)}(\\s|#|$)`, 'm');
  try {
    return pattern.test(readFileSync('/etc/hosts', 'utf8'));
  } catch {
    return false;
  }
}

export function addHost(domain, { skipCheck = false } = {}) {
  if (!/^[A-Za-z0-9.-]+$/.test(domain)) {
    throw new Error(`Invalid domain '${domain}'`);
  }

  if (!skipCheck && hasHost(domain)) {
    console.log(`'${domain}' already in /etc/hosts, skipping`);
    return;
  }

  console.log(`Adding '${domain}' to /etc/hosts — sudo password may be required`);
  const entry = `127.0.0.1   ${domain} # managed by local-gateway\n`;

  execFileSync('sudo', ['tee', '-a', '/etc/hosts'], {
    input: entry,
    stdio: ['pipe', 'ignore', 'inherit'],
  });

  console.log(`'${domain}' added to /etc/hosts`);
}
