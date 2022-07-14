const program = require('commander');
const ora = require('ora');
const chalk = require('chalk');
const fs = require('fs-extra');
const { choose, exe, cp, getVersion, copy, read } = require('../lib/index');
const templatePath = require('../lib/create/template');
const path = require('path');

const error = chalk.whiteBright.bgRed;

program.usage('<app-name>');

program.parse(process.argv);

if (program.args[0] === undefined) {
  console.log(error(' ERROR '), chalk.red('请输入项目名称'));
  process.exit(1);
}

let reg = /^[a-z][0-9a-z_-]{0,}$/;
if (!reg.test(program.args[0])) {
  console.log(
    error(' ERROR '),
    chalk.red('项目名称可选数字、小写字母、下划线、-,第一位必须是小写字母!')
  );
} else {
  fs.pathExists(program.args[0], (err, exists) => {
    if (err) {
      return console.error(error(' ERROR '), chalk.red(err));
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
          fs.remove(program.args[0], err => {
            if (err) {
              return console.error(error(' ERROR '), chalk.red(err));
            }
            init(program.args[0]);
          });
        }
      });
    } else {
      init(program.args[0]);
    }
  });
}

async function init(title) {
  const spinner = ora(chalk.green('正在生成项目'));

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
        // 'ESLint',
        // 'electron'
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
      name: 'eslint',
      type: 'list',
      message: 'ESLint 配置',
      choices: [
        'ESLint with error prevention only',
        'ESLint + Airbnb config',
        'ESLint + Standard config',
        'ESLint + Prettier'
      ],
      when: answers => {
        return answers.dependencies.includes('ESLint');
      }
    },

    {
      name: 'tool',
      type: 'list',
      message: '请选择包管理工具',
      choices: ['npm', 'yarn', 'pnpm']
    }
  ];

  let message = await choose(questions1);
  message.title = title;
  spinner.start();

  // 验证eslint所需node版本
  if (message.dependencies.indexOf('ESLint') > -1) {
    // node 要大于等于13.10.0
    let node = await exe(`node -v`);
    if (
      Number(node.slice(1, node.split('.')[0].length)) < 13 ||
      (Number(node.slice(1, node.split('.')[0].length)) === 13 && Number(node.split('.')[1]) < 10)
    ) {
      console.log('\n', error(' ERROR '), chalk.red('安装eslint需要node版本升级到13.10.0及以上'));
      process.exit(1);
    }
  }

  let npm = await exe(`npm -v`);

  //拉取项目模板
  await exe(
    `npm init vite@latest ${message.title} ${
      Number(npm.split('.')[0]) < 7 ? '' : '--'
    } --template ${message.dependencies.indexOf('TypeScript') > -1 ? 'vue-ts' : 'vue'}`
  );

  await exe(`cd ${message.title} && ${message.tool} install`);

  let appvue = '';
  let mainImport = '';
  let mainUse = '';
  let viteConfigImport = '';
  let viteConfigPlugin = '';
  let scriptlang = message.dependencies.indexOf('TypeScript') > -1 ? ' lang="ts"' : '';
  let stylelang = '';

  // 安装 router
  if (message.dependencies.indexOf('Router') > -1) {
    await exe(
      `cd ${message.title} && ${
        message.tool === 'npm' ? 'npm install vue-router@4' : message.tool + ' add vue-router@4'
      }`
    );
    // app.vue
    appvue += `    <router-view></router-view>`;
    // main.js
    mainImport += `import router from './router';\n`;
    mainUse += `app.use(router);\n`;
    // router.js
    let createWebHistory = '';
    let RouteRecordRaw = message.dependencies.indexOf('TypeScript') > -1 ? ', RouteRecordRaw ' : '';
    let routerTs = message.dependencies.indexOf('TypeScript') > -1 ? ': Array<RouteRecordRaw>' : '';

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
          ? message.title + '/src/router/index.ts'
          : message.title + '/src/router/index.js'
      }`,
      templatePath.router
    );
    // 创建views文件夹
    fs.mkdirs(message.title + '/src/views');
  } else {
    appvue += `    <div></div>`;
  }

  // 安装 pinia
  if (message.dependencies.indexOf('pinia') > -1) {
    await exe(
      `cd ${message.title} && ${
        message.tool === 'npm' ? 'npm i pinia@next' : message.tool + ' add pinia@next'
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
          message.tool === 'npm' ? 'npm install sass -D' : message.tool + ' add sass -D'
        }`
      );
      stylelang = ' lang="scss"';
    } else if (message.css === 'Less') {
      await exe(
        `cd ${message.title} && ${
          message.tool === 'npm'
            ? 'npm i less less-loader -D'
            : message.tool + ' add less less-loader -D'
        }`
      );
      stylelang = ' lang="less"';
    }
  }
  // 安装 axios
  if (message.dependencies.indexOf('axios') > -1) {
    await exe(
      `cd ${message.title} && ${
        message.tool === 'npm' ? 'npm i axios' : message.tool + ' add axios'
      }`
    );
  }
  // 使用 gizp
  if (message.dependencies.indexOf('gzip') > -1) {
    await exe(
      `cd ${message.title} && ${
        message.tool === 'npm'
          ? 'npm i vite-plugin-compression -D'
          : message.tool + ' add vite-plugin-compression -D'
      } `
    );
    viteConfigImport += "import viteCompression from 'vite-plugin-compression';\n";
    viteConfigPlugin += `,
  viteCompression({
    disable: false, // 是否禁用
    verbose: true, // 是否在控制台输出压缩结果
    filter: /\.(js|css)$/i, // 压缩文件的过滤规则
    threshold: 10240, // 文件大小阈值，以字节为单位
    algorithm: 'gzip', // 压缩算法,可选 [ 'gzip' , 'brotliCompress' ,'deflate' , 'deflateRaw']
    ext: '.gz', // 	生成的压缩包后缀
    compressionOptions: { // 压缩选项
      level: 9, // 压缩等级，范围1-9,越小压缩效果越差，但是越大处理越慢，所以一般取中间值;
    },
    deleteOriginFile: true // 是否删除原始文件
  })`;
  }

  //   安装eslint
  if (message.dependencies.indexOf('ESLint') > -1) {
    if (message.eslint === 'ESLint with error prevention only') {
      if (message.dependencies.indexOf('TypeScript') > -1) {
        await exe(
          `cd ${message.title} && ${
            message.tool === 'npm'
              ? 'npm i @types/eslint vite-plugin-eslint eslint eslint-plugin-vue@latest @typescript-eslint/eslint-plugin@latest @typescript-eslint/parser@latest -D'
              : message.tool +
                ' add @types/eslint vite-plugin-eslint eslint eslint-plugin-vue@latest @typescript-eslint/eslint-plugin@latest @typescript-eslint/parser@latest -D'
          }`
        );
        let eslintrcTS = path.join(__dirname, '../lib/create/eslint/.eslintrcTS.js');
        copy(`${message.title}/.eslintrc.js`, eslintrcTS);
      } else {
        await exe(
          `cd ${message.title} && ${
            message.tool === 'npm'
              ? 'npm i vite-plugin-eslint eslint eslint-plugin-vue@latest -D'
              : message.tool + ' add vite-plugin-eslint eslint eslint-plugin-vue@latest -D'
          }`
        );
        let eslintrcJs = path.join(__dirname, '../lib/create/eslint/.eslintrc.js');
        copy(`${message.title}/.eslintrc.js`, eslintrcJs);
      }
    }

    if (message.eslint === 'ESLint + Airbnb config') {
      if (message.dependencies.indexOf('TypeScript') > -1) {
        await exe(
          `cd ${message.title} && ${
            message.tool === 'npm'
              ? 'npm i @types/eslint vite-plugin-eslint eslint eslint-plugin-vue@latest @typescript-eslint/eslint-plugin@latest @typescript-eslint/parser@latest eslint-config-airbnb-base eslint-plugin-import -D'
              : message.tool +
                ' add @types/eslint vite-plugin-eslint eslint eslint-plugin-vue@latest @typescript-eslint/eslint-plugin@latest @typescript-eslint/parser@latest eslint-config-airbnb-base eslint-plugin-import -D'
          }`
        );

        let eslintrcAts = path.join(__dirname, '../lib/create/eslint/.eslintrc-airbnb-ts.js');
        copy(`${message.title}/.eslintrc.js`, eslintrcAts);
      } else {
        await exe(
          `cd ${message.title} && ${
            message.tool === 'npm'
              ? 'npm i vite-plugin-eslint eslint eslint-plugin-vue@latest eslint-config-airbnb-base@latest eslint-plugin-import -D'
              : message.tool +
                ' add vite-plugin-eslint eslint eslint-plugin-vue@latest eslint-config-airbnb-base@latest eslint-plugin-import -D'
          }`
        );
        let eslintrcaj = path.join(__dirname, '../lib/create/eslint/.eslintrcaj.js');
        copy(`${message.title}/.eslintrc.js`, eslintrcaj);
      }
    }

    if (message.eslint === 'ESLint + Standard config') {
      if (message.dependencies.indexOf('TypeScript') > -1) {
        await exe(
          `cd ${message.title} && ${
            message.tool === 'npm'
              ? 'npm i @types/eslint vite-plugin-eslint eslint-plugin-vue@latest @typescript-eslint/eslint-plugin@latest eslint-config-standard@latest eslint eslint-plugin-import eslint-plugin-n eslint-plugin-promise @typescript-eslint/parser -D'
              : message.tool +
                ' add @types/eslint vite-plugin-eslint eslint-plugin-vue@latest @typescript-eslint/eslint-plugin@latest eslint-config-standard@latest eslint eslint-plugin-import eslint-plugin-n eslint-plugin-promise @typescript-eslint/parser -D'
          }`
        );

        let eslintrcst = path.join(__dirname, '../lib/create/eslint/.eslintrcst.js');
        copy(`${message.title}/.eslintrc.js`, eslintrcst);
      } else {
        await exe(
          `cd ${message.title} && ${
            message.tool === 'npm'
              ? 'npm i vite-plugin-eslint eslint  eslint-plugin-vue@latest eslint-config-standard@latest eslint-plugin-import eslint-plugin-n eslint-plugin-promise -D'
              : message.tool +
                ' add vite-plugin-eslint eslint  eslint-plugin-vue@latest eslint-config-standard@latest eslint-plugin-import eslint-plugin-n eslint-plugin-promise -D'
          }`
        );
        let eslintrcsj = path.join(__dirname, '../lib/create/eslint/.eslintrcsj.js');
        copy(`${message.title}/.eslintrc.js`, eslintrcsj);
      }
    }
    if (message.eslint === 'ESLint + Prettier') {
      let prettierrcJS = path.join(__dirname, '../lib/create/eslint/.prettierrc.js');
      copy(`${message.title}/.prettierrc.js`, prettierrcJS);

      let prettieriGnore = path.join(__dirname, '../lib/create/eslint/.prettierignore');
      copy(`${message.title}/.prettierignore`, prettieriGnore);

      if (message.dependencies.indexOf('TypeScript') > -1) {
        await exe(
          `cd ${message.title} && ${
            message.tool === 'npm'
              ? 'npm i @types/eslint vite-plugin-eslint eslint eslint-plugin-vue@latest @typescript-eslint/eslint-plugin@latest @typescript-eslint/parser@latest eslint-plugin-prettier eslint-config-prettier prettier -D'
              : message.tool +
                ' add @types/eslint vite-plugin-eslint eslint eslint-plugin-vue@latest @typescript-eslint/eslint-plugin@latest @typescript-eslint/parser@latest eslint-plugin-prettier eslint-config-prettier prettier -D'
          }`
        );
        let eslintrcpt = path.join(__dirname, '../lib/create/eslint/.eslintrcpt.js');
        copy(`${message.title}/.eslintrc.js`, eslintrcpt);
      } else {
        await exe(
          `cd ${message.title} && ${
            message.tool === 'npm'
              ? 'npm i vite-plugin-eslint eslint eslint-plugin-vue@latest eslint-plugin-prettier eslint-config-prettier prettier -D'
              : message.tool +
                ' add vite-plugin-eslint eslint eslint-plugin-vue@latest eslint-plugin-prettier eslint-config-prettier prettier -D'
          }`
        );
        let eslintrcpj = path.join(__dirname, '../lib/create/eslint/.eslintrcpj.js');
        copy(`${message.title}/.eslintrc.js`, eslintrcpj);
      }
    }
    viteConfigImport += "import eslint from 'vite-plugin-eslint';\n";
    viteConfigPlugin += ',\n  eslint()';
  }
  // 安装electron
  if (message.dependencies.indexOf('electron') > -1) {
    await exe(
      `cd ${message.title} && ${
        message.tool === 'npm'
          ? 'npm i vite-plugin-electron electron electron-builder -D'
          : message.tool + ' add vite-plugin-electron electron electron-builder -D'
      } `
    );
    viteConfigImport += "import electron from 'vite-plugin-electron'\n";
    viteConfigPlugin += `,
    // https://www.electron.build/configuration/configuration
    electron({
      main: {
        entry: 'electron/main.${message.dependencies.indexOf('TypeScript') > -1 ? 'ts' : 'js'}',
      },
      //preload: {
       // input: {
         // // Must be use absolute path, this is the restrict of Rollup
         // preload: path.join(__dirname, 'electron/preload.${
           message.dependencies.indexOf('TypeScript') > -1 ? 'ts' : 'js'
         }'),
        //},
      //},
      // Enables use of Node.js API in the Electron-Renderer
      renderer: {},
    })`;
    let electronMain =
      message.dependencies.indexOf('TypeScript') > -1
        ? path.join(__dirname, '../lib/create/electron/_electron.vc')
        : path.join(__dirname, '../lib/create/electron/_electron2.vc');
    copy(
      `${message.title}/electron/main.${
        message.dependencies.indexOf('TypeScript') > -1 ? 'ts' : 'js'
      }`,
      electronMain
    );

    let electronBuilder = path.join(
      __dirname,
      '../lib/create/electron/electron-builder.config.json'
    );
    copy(`${message.title}/electron-builder.config.json`, electronBuilder);

    let git = await read(message.title + '/.gitignore');
    git = '# electron\\ndist_electron/\\n\\n' + git;
    git = git.replace(/\\n/g, '\n');
    await cp('./.gitignore', git);

    if (message.dependencies.indexOf('TypeScript') > -1) {
      let tsc = await read(message.title + '/tsconfig.json');
      let tsco = JSON.parse(tsc);
      tsco.include.push('electron/**/*.ts');
      await cp(message.title + '/tsconfig.json', JSON.stringify(tsco, null, 2));
    }
  }

  // 全局修改
  if (message.dependencies != '' && message.dependencies != ['TypeScript']) {
    //写入app.vue
    templatePath.appVue = templatePath.appVue
      .replace('<!-- appVue -->', appvue)
      .replace('<!-- scriptlang -->', scriptlang)
      .replace('<!-- stylelang -->', stylelang);
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
      .replace('<!-- viteConfigPlugin -->', viteConfigPlugin + '\n  ');
    await cp(
      `${
        message.dependencies.indexOf('TypeScript') > -1
          ? message.title + '/vite.config.ts'
          : message.title + '/vite.config.js'
      }`,
      templatePath.viteConfig
    );

    if (message.dependencies.indexOf('electron') > -1) {
      let pack = await read(message.title + '/package.json');
      let pac = JSON.parse(pack);
      pac.main = 'dist/electron/main.js';
      pac.scripts.dev = 'chcp 65001 && vite';
      pac.scripts.build =
        message.dependencies.indexOf('TypeScript') > -1
          ? 'chcp 65001 && vue-tsc --noEmit && vite build && electron-builder --config electron-builder.config.json'
          : 'chcp 65001 && vite build && electron-builder --config electron-builder --config electron-builder.config.json';
      await cp(message.title + '/package.json', JSON.stringify(pac, null, 2));

      await exe(
        `cd ${path.join(
          __dirname,
          '..'
        )} && npx prettier --config .prettierrc.js --write ${path.join(
          process.cwd(),
          message.title
        )}/vite.config.${message.dependencies.indexOf('TypeScript') > -1 ? 'ts' : 'js'} ${path.join(
          process.cwd(),
          message.title
        )}/src/**/*.{js,ts} ${path.join(process.cwd(), message.title)}/electron/**/*.{js,ts}`
      );
    } else {
      // 使用prettier格式化代码
      await exe(
        `cd ${path.join(
          __dirname,
          '..'
        )} && npx prettier --config .prettierrc.js --write ${path.join(
          process.cwd(),
          message.title
        )}/vite.config.${message.dependencies.indexOf('TypeScript') > -1 ? 'ts' : 'js'} ${path.join(
          process.cwd(),
          message.title
        )}/src/**/*.{js,ts}`
      );
    }

    if (message.dependencies.indexOf('ESLint') > -1) {
      let pack = await read(message.title + '/package.json');
      let pac = JSON.parse(pack);
      if (message.dependencies.indexOf('electron') > -1) {
        pac.scripts.lint = 'eslint src/**/*.{js,jsx,vue,ts,tsx} electron/**/*.{js,ts} --fix';
      } else {
        pac.scripts.lint = 'eslint src/**/*.{js,jsx,vue,ts,tsx} --fix';
      }

      await cp(message.title + '/package.json', JSON.stringify(pac, null, 2));
      await exe(
        `cd ${message.title} && ${
          message.tool === 'yarn' ? 'yarn lint' : message.tool + ' run lint'
        }`
      );
    }
  }

  spinner.stop();
  console.log('项目初始化成功');
  console.log(
    chalk.blue(
      `
        cd ${message.title}
        ${message.tool === 'yarn' ? 'yarn' : message.tool + ' run'} dev
        `
    )
  );

  getVersion();
}
