import { Command } from 'commander';
import { execFileSync } from 'child_process';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { isSeq, isMap } from 'yaml';
import { abbreviatePath } from '../utils/paths.js';
import { readCompose } from '../utils/compose.js';
import { hasHost } from '../utils/hosts.js';

export function extractLabels(doc, service) {
  const labelsNode = doc.getIn(['services', service, 'labels']);
  if (!labelsNode) return {};

  if (isSeq(labelsNode)) {
    const result = {};
    for (const item of labelsNode.items) {
      const val = typeof item.value === 'string' ? item.value : String(item.value ?? '');
      const eqIdx = val.indexOf('=');
      if (eqIdx > -1) result[val.slice(0, eqIdx)] = val.slice(eqIdx + 1);
    }
    return result;
  }

  if (isMap(labelsNode)) {
    const json = labelsNode.toJSON();
    const result = {};
    for (const [k, v] of Object.entries(json)) result[k] = String(v ?? '');
    return result;
  }

  return {};
}

export function extractTraefikInfo(labels) {
  if (labels['traefik.enable'] !== 'true' && labels['traefik.enable'] !== true) return null;

  // Find first router with a Host() rule; capture the router name
  let domain = null;
  let routerName = null;
  for (const [key, value] of Object.entries(labels)) {
    const km = key.match(/^traefik\.http\.routers\.([^.]+)\.rule$/);
    if (km) {
      const hm = String(value).match(/Host\(\s*[`"]([^`"]+)[`"]/);
      if (hm) { domain = hm[1]; routerName = km[1]; break; }
    }
  }

  if (!domain) return null;

  // Resolve service name: router can point to a named service via .service label
  const serviceOverride = labels[`traefik.http.routers.${routerName}.service`];
  const serviceName = serviceOverride ? String(serviceOverride) : routerName;

  const portKey = `traefik.http.services.${serviceName}.loadbalancer.server.port`;
  const port = portKey in labels ? String(labels[portKey]) : null;

  return { domain, port: port ?? '—' };
}

export function parseDockerComposePs(output) {
  const status = {};
  for (const line of String(output ?? '').trim().split('\n').filter(Boolean)) {
    const tab = line.indexOf('\t');
    if (tab > -1) status[line.slice(0, tab)] = line.slice(tab + 1).trim();
  }
  return status;
}

function getDockerStatus(cwd) {
  try {
    const out = execFileSync(
      'docker',
      ['compose', 'ps', '--format', '{{.Service}}\t{{.State}}'],
      { encoding: 'utf8', cwd }
    );
    return parseDockerComposePs(out);
  } catch (err) {
    if (process.env.DEBUG === '1') console.error(`[debug] docker compose ps failed: ${err instanceof Error ? err.stack : String(err)}`);
    return null;
  }
}

export function resolveStatus(dockerStatus, service) {
  if (dockerStatus === null) return 'unknown';
  return dockerStatus[service] ?? 'stopped';
}

function pad(str, len) {
  return String(str ?? '').padEnd(len);
}

export const infoCommand = new Command('info')
  .description('Show Traefik routing details for the current project')
  .action(() => {
    const cwd = process.cwd();
    const composePath = resolve(cwd, 'docker-compose.yml');

    if (!existsSync(composePath)) {
      infoCommand.error(`No docker-compose.yml found in ${cwd}. Run this command from your project root.`);
    }

    const { doc, services } = readCompose(composePath);
    const displayPath = abbreviatePath(composePath);

    console.log(`docker-compose.yml: ${displayPath}\n`);

    if (services.length === 0) {
      console.log('No services found in docker-compose.yml.');
      return;
    }

    const dockerStatus = getDockerStatus(cwd);

    const routed = [];
    const other = [];

    for (const service of services) {
      const labels = extractLabels(doc, service);
      const traefik = extractTraefikInfo(labels);
      if (traefik) {
        routed.push({ service, ...traefik });
      } else {
        other.push(service);
      }
    }

    if (routed.length === 0) {
      console.log('No services are currently routed through Traefik.');
      console.log('Run `lgw add` to get started.\n');
      console.log(`Services: ${services.join(', ')}`);
      return;
    }

    const rows = routed.map(({ service, domain, port }) => {
      const url = `http://${domain}`;
      const status = resolveStatus(dockerStatus, service);
      let hosts = '—';
      if (domain.endsWith('.localhost')) {
        hosts = hasHost(domain) ? 'yes' : 'no';
      }
      return { service, url, port: String(port), status, hosts };
    });

    const w1 = Math.max(7, ...rows.map((r) => r.service.length));
    const w2 = Math.max(3, ...rows.map((r) => r.url.length));
    const w3 = Math.max(4, ...rows.map((r) => r.port.length));
    const w4 = Math.max(6, ...rows.map((r) => r.status.length));

    console.log(
      `${pad('SERVICE', w1)}  ${pad('URL', w2)}  ${pad('PORT', w3)}  ${pad('STATUS', w4)}  HOSTS`
    );
    for (const row of rows) {
      console.log(
        `${pad(row.service, w1)}  ${pad(row.url, w2)}  ${pad(row.port, w3)}  ${pad(row.status, w4)}  ${row.hosts}`
      );
    }

    if (other.length > 0) {
      console.log(`\nOther services (not routed): ${other.join(', ')}`);
    }
  });
