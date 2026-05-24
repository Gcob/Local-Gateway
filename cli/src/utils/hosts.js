import { execFileSync } from 'child_process';
import { readFileSync } from 'fs';

export function addHost(domain) {
  if (!/^[A-Za-z0-9.-]+$/.test(domain)) {
    throw new Error(`Invalid domain '${domain}'`);
  }

  const hostsContent = readFileSync('/etc/hosts', 'utf8');
  const escaped = domain.replace(/\./g, '\\.');
  const pattern = new RegExp(`(^|\\s)${escaped}(\\s|#|$)`, 'm');

  if (pattern.test(hostsContent)) {
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
