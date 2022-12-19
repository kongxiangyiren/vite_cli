#!/usr/bin/env node
import { program } from 'commander';

program
  .helpOption('-h, --help', '查看帮助')
  .version(require('../package.json').version, '-v, --version', '查看版本')
  .addHelpCommand(false);

program
  .command('create')
  .description('创建项目')
  .action(() => require('./create/index'));

program.parse(process.argv);
