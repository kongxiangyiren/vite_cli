#!/usr/bin/env node

const program = require('commander');

program
  .version(require('../package.json').version)
  .usage('<command> [options]')
  .command('create <app-name>', '创建项目')
  .parse(process.argv);
