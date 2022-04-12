#!/usr/bin/env node
import { program } from 'commander';
import inquirer from 'inquirer';
import { exec } from 'child_process';
import ora from 'ora';
import chalk from 'chalk';
import fs from 'fs-extra';
import templatePath from './template.js';
program.version('1.0.0');

program
  .command('create <app-name>')
  .description('创建项目') //描述
  .action(async res => {
    let reg = /^[A-Za-z][0-9a-zA-Z_-]{0,}$/;
    if (!reg.test(res)) {
      return console.log(
        chalk.red('项目名称由数字、字母、下划线、-组成,且第一位必须是字母!')
      );
    }
    fs.pathExists(res, (err, exists) => {
      if (err) {
        console.log(err);
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
              if (err) return console.error(err);
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
      choices: ['TypeScript', 'Router', 'pinia', 'CSS 预处理器', 'gzip'],
      default: ['TypeScript', 'Router'],
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
    }
  ];

  let message = await choose(questions1);
  message.title = title;
  spinner.start();
  let npm = await exe(`npm -v`);

  // 拉取项目模板
  await exe(
    `npm init vite@latest ${message.title} ${
      Number(npm.split('.')[0]) < 7 ? '' : '--'
    } --template ${
      message.dependencies.indexOf('TypeScript') > -1 ? 'vue-ts' : 'vue'
    }`
  );

  await exe(`cd ${message.title} && npm i`);

  let appvue = '';
  let mainImport = '';
  let mainUse = '';
  let viteConfigImport = '';
  let viteConfigPlugin = '';
  // 安装 router
  if (message.dependencies.indexOf('Router') > -1) {
    // npm i vue-router
    await exe(`cd ${message.title} && npm install vue-router@4`);
    // app.vue
    appvue += `<router-view></router-view>`;
    // main.js
    mainImport += `import router from './router';\n`;
    mainUse += `app.use(router);\n`;
    // router.js
    let createWebHistory = '';
    let routerTs =
      message.dependencies.indexOf('TypeScript') > -1 ? ':any' : '';
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
    // npm i pinia@next
    await exe(`cd ${message.title} && npm i pinia@next`);
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
        `cd ${message.title} && npm install node-sass sass-loader sass -D`
      );
    } else if (message.css === 'Less') {
      await exe(`cd ${message.title} && npm i less less-loader -D`);
    }
  }
  if (message.dependencies.indexOf('gzip') > -1) {
    await exe(`cd ${message.title} && npm i vite-plugin-compression -D`);
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
    await cp( `${
      message.dependencies.indexOf('TypeScript') > -1
        ? message.title + '/vite.config.ts'
        : message.title + '/vite.config.js'
    }`, templatePath.viteConfig);
  }

  spinner.stop();
  console.log('项目初始化成功');
  console.log(
    chalk.blue(
      `
      cd ${message.title}
      npm run dev
      `
    )
  );
}

const args = program.parse(process.argv);
