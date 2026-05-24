import { Command } from 'commander';
import { select, input, confirm } from '@inquirer/prompts';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { readCompose, writeCompose, addTraefikLabels } from '../utils/compose.js';
import { addHost, hasHost } from '../utils/hosts.js';

export const addCommand = new Command('add')
  .description('Add Traefik routing labels to a service in the current project')
  .option('--service <name>', 'service name from docker-compose.yml')
  .option('--domain <domain>', 'domain to route (e.g. myapp.localhost)')
  .option('--port <port>', 'container port to forward to', Number)
  .option('--write-hosts', 'add the domain to /etc/hosts (sudo required; non-interactive only)')
  .action(async (options) => {
    const composePath = resolve(process.cwd(), 'docker-compose.yml');

    if (!existsSync(composePath)) {
      console.error('Error: no docker-compose.yml found in current directory');
      process.exit(1);
    }

    const { doc, services } = readCompose(composePath);

    if (services.length === 0) {
      console.error('Error: no services found in docker-compose.yml');
      process.exit(1);
    }

    const isTTY = process.stdin.isTTY;
    let { service, domain, port } = options;

    if (port !== undefined && (!Number.isInteger(port) || port <= 0)) {
      console.error('Error: --port must be a positive integer');
      process.exit(1);
    }

    if (!isTTY) {
      if (!service || !domain || port === undefined) {
        console.error(
          'Error: --service, --domain, and --port are required when not running in a terminal'
        );
        process.exit(1);
      }
    } else {
      if (!service) {
        service = await select({
          message: 'Which service should be routed?',
          choices: services.map((s) => ({ value: s, name: s })),
        });
      }

      if (!domain) {
        domain = await input({
          message: 'Domain:',
          default: `${service}.localhost`,
        });
      }

      if (port === undefined) {
        const portInput = await input({
          message: 'Container port:',
          default: '80',
          validate: (v) =>
            Number.isInteger(Number(v)) && Number(v) > 0 ? true : 'Enter a valid port number',
        });
        port = Number(portInput);
      }

      console.log(`\nEquivalent command: lgw add --service ${service} --domain ${domain} --port ${port}\n`);
    }

    if (!services.includes(service)) {
      console.error(`Error: service '${service}' not found in docker-compose.yml`);
      process.exit(1);
    }

    addTraefikLabels(doc, service, domain, port);
    writeCompose(composePath, doc);
    console.log(`Traefik labels added to service '${service}'`);

    if (domain.endsWith('.localhost')) {
      let writeHosts;
      let verifiedNotInHosts = false;

      if (options.writeHosts !== undefined) {
        writeHosts = options.writeHosts;
      } else if (isTTY) {
        let alreadyInHosts = false;
        try {
          alreadyInHosts = hasHost(domain);
          verifiedNotInHosts = !alreadyInHosts;
        } catch {
          // /etc/hosts unreadable — treat as not present, addHost will re-check
        }
        if (!alreadyInHosts) {
          writeHosts = await confirm({
            message: `Add '${domain}' to /etc/hosts? (sudo required)`,
            default: true,
          });
        }
      } else {
        writeHosts = false;
      }

      if (writeHosts) {
        addHost(domain, { skipCheck: verifiedNotInHosts });
      }
    } else {
      console.log(`Note: '${domain}' is not a .localhost domain — configure DNS manually`);
    }

    console.log(`\nService '${service}' is now routed to http://${domain}`);
    console.log(`\nTo apply the changes:\n  docker compose up -d ${service}`);
  });
