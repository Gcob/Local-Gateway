import { Command } from 'commander';

function extractDomain(rule) {
  const match = rule.match(/Host\(`([^`]+)`\)/);
  return match ? match[1] : rule;
}

function pad(str, len) {
  return str.padEnd(len);
}

export const listCommand = new Command('list')
  .description('List all routes currently active in Traefik')
  .option(
    '--api <url>',
    'Traefik API base URL',
    `http://127.0.0.1:${process.env.TRAEFIK_PORT_DASHBOARD ?? '8000'}`
  )
  .action(async (options) => {
    let routers;
    try {
      const res = await fetch(`${options.api}/api/http/routers`);
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      routers = await res.json();
    } catch (err) {
      console.error(`Error: could not reach Traefik API at ${options.api} — ${err.message}`);
      console.error('Make sure the gateway is running: just up');
      process.exit(1);
    }

    const rows = routers
      .filter((r) => r.status === 'enabled' && !r.name.endsWith('@internal'))
      .map((r) => ({
        name: r.name.replace(/@\w+$/, ''),
        domain: extractDomain(r.rule),
        entrypoints: (r.entryPoints ?? []).join(', '),
      }));

    if (rows.length === 0) {
      console.log('No active routes. Use `lgw add` to route a service.');
      return;
    }

    const w1 = Math.max(7, ...rows.map((r) => r.name.length));
    const w2 = Math.max(6, ...rows.map((r) => r.domain.length));

    console.log(`${pad('SERVICE', w1)}  ${pad('DOMAIN', w2)}  ENTRYPOINT`);
    for (const row of rows) {
      console.log(`${pad(row.name, w1)}  ${pad(row.domain, w2)}  ${row.entrypoints}`);
    }
  });
