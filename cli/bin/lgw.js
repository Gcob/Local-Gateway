#!/usr/bin/env node
import { program } from 'commander';
import { addCommand } from '../src/commands/add.js';
import { listCommand } from '../src/commands/list.js';

program
  .name('lgw')
  .description('Local Gateway CLI — route your projects through Traefik')
  .version('0.1.0');

program.addCommand(addCommand);
program.addCommand(listCommand);

program.parse();
