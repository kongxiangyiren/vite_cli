#!/usr/bin/env node
const { program } = require('commander');
const inquirer = require('inquirer');
const { exec } = require('child_process');
const ora = require('ora');
const chalk = require('chalk');
const fs = require('fs-extra');
const templatePath = require('./template.js');
const { getVersion } = require('./version.js');
const { version } = require('./package');
program.version(version);

program
  .command('create <app-name>')
  .description('创建项目') //描述
  .action(async res => {
    let reg = /^[A-Za-z][0-9a-zA-Z_-]{0,}$/;
    if (!reg.test(res)) {
      return console.log(
        chalk.red('项目名称可选数字、字母、下划线、-,第一位必须是字母!')
      );
    }
    fs.pathExists(res, (err, exists) => {
      if (err) {
        return console.error('\033[41;37m ERROR \033[0m', chalk.red(err));
      }
      if (exists) {
        let questions2 = [
          {
            name: 'created',
            type: 'confirm',
            message: '文件夹存在，是否覆盖?'
          }
        ];
        choose(questions2).then(answers => {
          if (answers.created) {
            fs.remove(res, err => {
              if (err) {
                return console.error(
                  '\033[41;37m ERROR \033[0m',
                  chalk.red(err)
                );
              }
              init(res);
            });
          }
        });
      } else {
        init(res);
      }
    });
  });
const spinner = ora(chalk.green('正在生成项目'));

let choose = message => {
  return inquirer.prompt(message);
};

let exe = command => {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        spinner.stop();
      } else {
        resolve(stdout);
      }
    });
  });
};

/**
 * @description:
 * @param {string} project - 项目文件路径
 * @param {string} template - 模板内容
 * @return {Promise}
 */
let cp = (project, template) => {
  return new Promise((resolve, reject) => {
    fs.outputFile(project, template)
      .then(() => {
        resolve();
      })
      .catch(err => {
        reject(err);
      });
  });
};

async function init(title) {
  let questions1 = [
    {
      type: 'checkbox',
      message: '配置项目依赖',
      name: 'dependencies',
      choices: [
        'TypeScript',
        'Router',
        'pinia',
        'CSS 预处理器',
        'axios',
        'gzip'
      ],
      default: ['TypeScript', 'Router']
    },
    {
      name: 'routerMode',
      type: 'confirm',
      message: '是否使用历史模式?',
      default: '',
      when: answers => {
        return answers.dependencies.includes('Router');
      }
    },
    {
      name: 'css',
      type: 'list',
      message: '选择css预处理器',
      choices: ['Sass/SCSS', 'Less'],
      when: answers => {
        return answers.dependencies.includes('CSS 预处理器');
      }
    },
    {
      name: 'npmOrYarn',
      type: 'list',
      message: 'npm 或 yarn',
      choices: ['npm', 'yarn']
    }
  ];

  let message = await choose(questions1);
  message.title = title;
  spinner.start();
  let npm = await exe(`npm -v`);

  //拉取项目模板
  await exe(
    `npm init vite@latest ${message.title} ${
      Number(npm.split('.')[0]) < 7 ? '' : '--'
    } --template ${
      message.dependencies.indexOf('TypeScript') > -1 ? 'vue-ts' : 'vue'
    }`
  );

  await exe(
    `cd ${message.title} && ${
      message.npmOrYarn === 'yarn' ? 'yarn' : 'npm'
    } install`
  );

  let appvue = '';
  let mainImport = '';
  let mainUse = '';
  let viteConfigImport = '';
  let viteConfigPlugin = '';
  // 安装 router
  if (message.dependencies.indexOf('Router') > -1) {
    await exe(
      `cd ${message.title} && ${
        message.npmOrYarn === 'yarn'
          ? 'yarn add vue-router@4'
          : 'npm install vue-router@4'
      }`
    );
    // app.vue
    appvue += `<router-view></router-view>`;
    // main.js
    mainImport += `import router from './router';\n`;
    mainUse += `app.use(router);\n`;
    // router.js
    let createWebHistory = '';
    let RouteRecordRaw =
      message.dependencies.indexOf('TypeScript') > -1 ? ', RouteRecordRaw' : '';
    let routerTs =
      message.dependencies.indexOf('TypeScript') > -1
        ? ': Array<RouteRecordRaw>'
        : '';

    // 历史模式
    if (message.routerMode) {
      createWebHistory = `createWebHistory`;
    } else {
      // hash模式
      createWebHistory = `createWebHashHistory`;
    }
    let reg = new RegExp('<!-- createWebHistory -->', 'g');
    templatePath.router = templatePath.router
      .replace(reg, createWebHistory)
      .replace('<!-- RouteRecordRaw -->', RouteRecordRaw)
      .replace('<!-- routerTs -->', routerTs);
    // 写入router.js
    await cp(
      `${
        message.dependencies.indexOf('TypeScript') > -1
          ? message.title + '/src/router.ts'
          : message.title + '/src/router.js'
      }`,
      templatePath.router
    );
  }

  // 安装 pinia
  if (message.dependencies.indexOf('pinia') > -1) {
    await exe(
      `cd ${message.title} && ${
        message.npmOrYarn === 'yarn'
          ? 'yarn add pinia@next'
          : 'npm i pinia@next'
      }`
    );
    //  main.js
    mainImport += `import { createPinia } from 'pinia';\n`;
    mainUse += `app.use(createPinia());\n`;
    await cp(
      `${
        message.dependencies.indexOf('TypeScript') > -1
          ? message.title + '/src/store/index.ts'
          : message.title + '/src/store/index.js'
      }`,
      templatePath.pinia
    );
  }
  // 安装 CSS 预处理器
  if (message.dependencies.indexOf('CSS 预处理器') > -1) {
    if (message.css === 'Sass/SCSS') {
      await exe(
        `cd ${message.title} && ${
          message.npmOrYarn === 'yarn'
            ? 'yarn add sass -D'
            : 'npm install sass -D'
        }`
      );
    } else if (message.css === 'Less') {
      await exe(
        `cd ${message.title} && ${
          message.npmOrYarn === 'yarn'
            ? 'yarn add less less-loader -D'
            : 'npm i less less-loader -D'
        }`
      );
    }
  }
  // 安装 axios
  if (message.dependencies.indexOf('axios') > -1) {
    await exe(
      `cd ${message.title} && ${
        message.npmOrYarn === 'yarn' ? 'yarn add axios' : 'npm i axios'
      }`
    );
  }
  // 使用 gizp
  if (message.dependencies.indexOf('gzip') > -1) {
    await exe(
      `cd ${message.title} && ${
        message.npmOrYarn === 'yarn'
          ? 'yarn add vite-plugin-compression -D'
          : 'npm i vite-plugin-compression -D'
      } `
    );
    viteConfigImport +=
      "import viteCompression from 'vite-plugin-compression';\n";
    viteConfigPlugin += ` viteCompression({
      disable:false, // 是否禁用
      verbose:true, // 是否在控制台输出压缩结果
      filter: /\\.(js|css)$/i, // 压缩文件的过滤规则
      threshold: 10240, // 文件大小阈值，以字节为单位
      algorithm: 'gzip', // 压缩算法,可选 [ 'gzip' , 'brotliCompress' ,'deflate' , 'deflateRaw']
      ext: '.gz', // 	生成的压缩包后缀
      compressionOptions: { // 压缩选项
        level: 9, // 压缩等级，范围0-9,越小压缩效果越差，但是越大处理越慢，所以一般取中间值;
      },
      deleteOriginFile: true, // 是否删除原始文件
      
    })`;
  }

  // 全局修改
  if (message.dependencies != '' && message.dependencies != ['TypeScript']) {
    //写入app.vue
    templatePath.appVue = templatePath.appVue.replace(
      '<!-- appVue -->',
      appvue
    );
    await cp(`${message.title}/src/app.vue`, templatePath.appVue);
    //写入main.js
    templatePath.main = templatePath.main
      .replace('<!-- mainImport -->', mainImport)
      .replace('<!-- mainUse -->', mainUse);
    await cp(
      `${
        message.dependencies.indexOf('TypeScript') > -1
          ? message.title + '/src/main.ts'
          : message.title + '/src/main.js'
      }`,
      templatePath.main
    );
    // 写入vite.config.js
    templatePath.viteConfig = templatePath.viteConfig
      .replace('<!-- viteConfigImport -->', viteConfigImport)
      .replace('<!-- viteConfigPlugin -->', viteConfigPlugin);
    await cp(
      `${
        message.dependencies.indexOf('TypeScript') > -1
          ? message.title + '/vite.config.ts'
          : message.title + '/vite.config.js'
      }`,
      templatePath.viteConfig
    );
  }

  spinner.stop();
  console.log('项目初始化成功');
  console.log(
    chalk.blue(
      `
      cd ${message.title}
      ${message.npmOrYarn === 'yarn' ? 'yarn' : 'npm run'} dev
      `
    )
  );

  let { data: res } = await getVersion();
  if (version !== res.version) {
    console.log(
      chalk.yellow(
        `最新版本:${res.version},当前版本:${version},请运行 npm i @feiyuhao/vite_cli -g 更新`
      )
    );
  }
}

const args = program.parse(process.argv);
