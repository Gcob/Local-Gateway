import { Command } from 'commander';
import { execFileSync } from 'child_process';
import { abbreviatePath } from '../utils/paths.js';

function extractDomain(rule) {
  const match = rule.match(/Host\(`([^`]+)`\)/);
  return match ? match[1] : rule;
}

function buildUrl(rule, entryPoints) {
  const scheme = (entryPoints ?? []).includes('websecure') ? 'https' : 'http';
  return `${scheme}://${extractDomain(rule)}`;
}


function getComposePaths(routerNames) {
  try {
    const ids = execFileSync('docker', ['ps', '-q'], { encoding: 'utf8' })
      .trim()
      .split('\n')
      .filter(Boolean);
    if (ids.length === 0) return {};

    const lines = execFileSync(
      'docker',
      ['inspect', '--format', '{{json .Config.Labels}}', ...ids],
      { encoding: 'utf8' }
    )
      .trim()
      .split('\n')
      .filter(Boolean);

    const paths = {};
    for (const line of lines) {
      let labels;
      try {
        labels = JSON.parse(line);
      } catch {
        continue;
      }
      if (!labels) continue;
      for (const name of routerNames) {
        if (`traefik.http.routers.${name}.rule` in labels) {
          const configFiles = labels['com.docker.compose.project.config_files'];
          if (configFiles) {
            paths[name] = abbreviatePath(configFiles.split(',')[0]);
          }
        }
      }
    }
    return paths;
  } catch (err) {
    if (process.env.DEBUG === '1') console.error(`[debug] docker inspect failed: ${err instanceof Error ? err.stack : String(err)}`);
    return {};
  }
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

    const visible = routers.filter(
      (r) => r.status === 'enabled' && !r.name.endsWith('@internal')
    );

    if (visible.length === 0) {
      console.log('No active routes. Use `lgw add` to route a service.');
      return;
    }

    const routerNames = visible.map((r) => r.name.replace(/@\w+$/, ''));
    const composePaths = getComposePaths(routerNames);

    const rows = visible.map((r) => {
      const name = r.name.replace(/@\w+$/, '');
      return {
        name,
        url: buildUrl(r.rule, r.entryPoints),
        source: composePaths[name] ?? '—',
      };
    });

    const w1 = Math.max(7, ...rows.map((r) => r.name.length));
    const w2 = Math.max(3, ...rows.map((r) => r.url.length));

    console.log(`${pad('SERVICE', w1)}  ${pad('URL', w2)}  SOURCE`);
    for (const row of rows) {
      console.log(`${pad(row.name, w1)}  ${pad(row.url, w2)}  ${row.source}`);
    }
  });
