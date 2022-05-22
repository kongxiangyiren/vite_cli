#!/usr/bin/env node

const program = require('commander');

program
  .version(require('../package.json').version)
  .usage('<command> [options]')
  .command('create <app-name>', '创建项目')
  .command('deploy', '添加自动化部署')
  .parse(process.argv);
