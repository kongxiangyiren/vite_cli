import { program } from 'commander';
import { cpSync, existsSync, readFileSync, unlink, writeFileSync } from 'fs';
import { green, red } from 'kolorist';
import { join } from 'path';
import prompts from 'prompts';
import { asyncRm, errout, exe, getVersion, warnout } from '../tools';
import ora from 'ora';
const spinner = ora(green('正在生成项目\n'));

async function create() {
  let projectName = program.args[1];

  let result: prompts.Answers<
    | 'projectName'
    | 'overwrite'
    | 'overwriteChecker'
    | 'dependencies'
    | 'history'
    | 'css'
    | 'prettier'
    | 'npmrc'
    | 'packageManagement'
  >;

  try {
    result = await prompts(
      [
        {
          type: projectName && /^[a-z][0-9a-z_-]{0,}$/.test(projectName) ? null : 'text',
          name: 'projectName',
          message: green('请输入项目名称: '),
          initial: 'vue-project',
          onState: state => {
            projectName = state.value || projectName || 'vue-project';
          },
          validate: value =>
            /^[a-z][0-9a-z_-]{0,}$/.test(value)
              ? true
              : '项目名称可选数字、小写字母、下划线、-,第一位必须是小写字母!'
        },
        {
          type: () => (!existsSync(join(process.cwd(), projectName)) ? null : 'confirm'),
          name: 'overwrite',
          message: green('项目已经存在,是否删除?')
        },
        {
          type: (_, { overwrite }: { overwrite?: boolean }) => {
            if (overwrite === false) {
              throw new Error(red('✖') + ' 操作被取消');
            }
            return null;
          },
          name: 'overwriteChecker'
        },
        {
          type: 'multiselect',
          name: 'dependencies',
          message: green('配置项目依赖: '),
          choices: [
            // disabled :禁用 selected :默认选择
            // { title: 'Green', value: '#00ff00', disabled: true },
            { title: 'TypeScript', value: 'TypeScript', selected: true },
            { title: 'Router', value: 'Router', selected: true },
            { title: 'pinia', value: 'pinia' },
            { title: 'CSS 预处理器', value: 'CSS 预处理器' },
            { title: 'gzip', value: 'gzip' },
            { title: 'ESLint', value: 'ESLint' },
            { title: 'electron', value: 'electron' }
          ]
        },
        {
          type: (_, { dependencies }: { dependencies: string[] }) =>
            dependencies.includes('Router') ? 'confirm' : null,
          name: 'history',
          message: green('是否使用历史模式?')
        },
        {
          type: (_, { dependencies }: { dependencies: string[] }) =>
            dependencies.includes('CSS 预处理器') ? 'select' : null,
          name: 'css',
          message: green('请选择CSS 预处理器'),
          choices: [
            { title: 'sass', value: 'sass' },
            { title: 'less', value: 'less' }
          ]
        },
        {
          type: (_, { dependencies }: { dependencies: string[] }) =>
            dependencies.includes('ESLint') ? 'confirm' : null,
          name: 'prettier',
          message: green('ESLint是否使用prettier?')
        },
        {
          type: (_, { dependencies }: { dependencies: string[] }) =>
            dependencies.includes('electron') ? 'confirm' : null,
          name: 'npmrc',
          message: green('electron是否需要设置npmmirror镜像?')
        },
        {
          type: 'select',
          name: 'packageManagement',
          message: green('请选择包管理工具'),
          choices: [
            { title: 'npm', value: 'npm' },
            { title: 'yarn', value: 'yarn' },
            { title: 'pnpm', value: 'pnpm' }
          ]
        }
      ],
      {
        onCancel: () => {
          throw new Error(red('✖') + ' 操作被取消');
        }
      }
    );
  } catch (cancelled: any) {
    console.log(cancelled.message);
    return;
  }

  spinner.start();
  const { overwrite, dependencies, history, css, prettier, npmrc, packageManagement } = result;
  // console.log(projectName, result);

  // 判断是否有相同的文件夹
  if (overwrite) {
    await asyncRm(join(process.cwd(), projectName)).catch(err => {
      // 如果删除失败
      console.log(errout(' ' + err));
      process.exit();
    });
  }

  // 获取npm版本
  let npm = (await exe(`npm -v`)) + '';

  //拉取项目模板 因为通过yarn拉取如果没有配置全局目录的话会报错，使用都使用npm拉取
  await exe(
    `npm init vue@latest ${projectName} ${Number(npm.split('.')[0]) < 7 ? '' : '--'} --default ${
      dependencies.includes('TypeScript') ? '--ts' : ''
    } ${dependencies.includes('Router') ? '--router' : ''} ${
      dependencies.includes('pinia') ? '--pinia' : ''
    } ${
      dependencies.includes('ESLint') && prettier
        ? '--eslint-with-prettier'
        : dependencies.includes('ESLint') && !prettier
        ? '--eslint'
        : ''
    } `
  );

  // 为项目设置镜像
  if (npmrc) {
    cpSync(join(__dirname, './assets/.npmrc'), join(process.cwd(), projectName, '.npmrc'), {
      recursive: true
    });
  }
  // install
  await exe(`cd ${projectName} && ${packageManagement} install`);

  // 默认历史模式，修改路由
  if (dependencies.includes('Router') && !history) {
    // 判断是不是ts，获取路由文件
    let routerPath = dependencies.includes('TypeScript')
      ? `./${projectName}/src/router/index.ts`
      : `./${projectName}/src/router/index.js`;

    let his = readFileSync(routerPath, { encoding: 'utf-8' });
    // 替换
    his = his.replace(/createWebHistory/g, 'createWebHashHistory');
    // 写入
    writeFileSync(routerPath, his);
  }

  // 安装 CSS 预处理器
  if (dependencies.includes('CSS 预处理器')) {
    if (css === 'sass') {
      await exe(
        `cd ${projectName} && ${packageManagement} ${
          packageManagement === 'npm' ? 'install' : 'add'
        } sass -D`
      );
    } else if (css === 'less') {
      await exe(
        `cd ${projectName} && ${packageManagement} ${
          packageManagement === 'npm' ? 'install' : 'add'
        } less less-loader -D`
      );
    }
  }

  // 安装gzip
  if (dependencies.includes('gzip')) {
    await exe(
      `cd ${projectName} && ${packageManagement} ${
        packageManagement === 'npm' ? 'install' : 'add'
      } vite-plugin-compression -D`
    );
    // 判断是不是ts，获取配置文件
    let vcPath = dependencies.includes('TypeScript')
      ? `./${projectName}/vite.config.ts`
      : `./${projectName}/vite.config.js`;
    //读取配置文件
    let vcg = readFileSync(vcPath, { encoding: 'utf-8' });
    vcg = "import viteCompression from 'vite-plugin-compression';\n" + vcg;
    vcg = vcg.replace(
      'vue()',
      `vue(),
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
    })`
    );
    // 写入
    writeFileSync(vcPath, vcg);
  }

  // eslint
  if (dependencies.includes('ESLint') && prettier) {
    unlink(`./${projectName}/.prettierrc.json`, err => {
      if (err) {
        throw new Error(errout(' ' + err));
      }
    });
    // 设置 prettier
    cpSync(
      join(__dirname, './assets/.prettierrc.yaml'),
      join(process.cwd(), projectName, '.prettierrc.yaml')
    );
  }

  // electron配置
  if (dependencies.includes('electron')) {
    // 安装
    await exe(
      `cd ${projectName} && ${packageManagement} ${
        packageManagement === 'npm' ? 'install' : 'add'
      } vite-plugin-electron electron electron-builder -D`
    );

    // 修改package.json
    let pac = require(join(process.cwd(), `./${projectName}/package.json`));
    pac.main = 'dist-electron/main.js';
    pac.author = 'Your Name';
    pac.scripts['electron-build'] =
      'chcp 65001 && electron-builder --config electron-builder.config.cjs';
    pac.scripts.dev = 'chcp 65001 && ' + pac.scripts.dev;

    if (dependencies.includes('TypeScript')) {
      pac.scripts.build = 'chcp 65001 && ' + pac.scripts.build;
      pac.scripts['build-only'] =
        'chcp 65001 && ' + pac.scripts['build-only'] + ' && npm run electron-build';
    } else {
      pac.scripts.build = 'chcp 65001 && ' + pac.scripts.build + ' && npm run electron-build';
    }

    // 写入
    writeFileSync(
      join(process.cwd(), `./${projectName}/package.json`),
      JSON.stringify(pac, null, 2)
    );

    // 修改vite.config
    // 判断是不是ts，获取配置文件
    let vcPath = dependencies.includes('TypeScript')
      ? `./${projectName}/vite.config.ts`
      : `./${projectName}/vite.config.js`;
    //读取配置文件
    let vcg = readFileSync(vcPath, { encoding: 'utf-8' });
    vcg = "import electron from 'vite-plugin-electron';\n" + vcg;
    vcg = vcg.replace(
      'vue()',
      `vue(),
      // 默认最新vite-plugin-electron, 如果插件报错, 具体请看 https://github.com/electron-vite/vite-plugin-electron
      electron({
        entry: 'electron/main.${dependencies.includes('TypeScript') ? 'ts' : 'js'}',
        onstart: options => {
          // Start Electron App
          options.startup(['.', '--no-sandbox'])
        },
        // vite: {
        //   build: {
        //     rollupOptions: {
        //       // Here are some C/C++ plugins that can't be built properly.
        //       external: [
        //         'serialport',
        //         'sqlite3',
        //       ],
        //     },
        //   },
        // }
      })`
    );
    // 写入
    writeFileSync(vcPath, vcg);

    // 创建electron文件夹
    if (dependencies.includes('TypeScript')) {
      cpSync(join(__dirname, './assets/electron/main.tvc'), `./${projectName}/electron/main.ts`, {
        recursive: true
      });
      // 修改 tsconfig.json
      let tsc = require(join(process.cwd(), `./${projectName}/tsconfig.json`));
      tsc.compilerOptions.types = ['vite-plugin-electron/electron-env'];
      writeFileSync(
        join(process.cwd(), `./${projectName}/tsconfig.json`),
        JSON.stringify(tsc, null, 2)
      );
    } else {
      cpSync(join(__dirname, './assets/electron/main.jvc'), `./${projectName}/electron/main.js`, {
        recursive: true
      });
    }

    // 创建electron配置
    cpSync(
      join(__dirname, './assets/electron/electron-builder.config.jvc'),
      `./${projectName}/electron-builder.config.cjs`,
      { recursive: true }
    );

    // 修改 .gitignore
    let ign = readFileSync(`./${projectName}/.gitignore`, { encoding: 'utf-8' });
    ign = '#electron\ndist_electron\ndist-electron\n\n' + ign;
    writeFileSync(`./${projectName}/.gitignore`, ign);
  }

  // 格式化
  if (dependencies.includes('ESLint')) {
    await exe(
      `cd ${projectName} && ${packageManagement} ${packageManagement === 'yarn' ? '' : 'run'} lint`
    );
  } else {
    await exe(
      ` npx prettier --config ${join(__dirname, './assets/.prettierrc.yaml')} --write ${join(
        process.cwd(),
        projectName
      )}/vite.config.${dependencies.includes('TypeScript') ? 'ts' : 'js'} ${join(
        process.cwd(),
        projectName
      )}/src/**/*.{js,ts} ${
        dependencies.includes('electron')
          ? join(process.cwd(), projectName) + '/electron/**/*.{ts,js}'
          : ''
      }`
    );
  }
  // 完成
  spinner.stop();
  console.log('项目初始化成功');
  if (dependencies.includes('electron')) {
    if (dependencies.includes('gzip')) {
      console.log(warnout(' electron 不能使用gzip'));
    }
    if (history) {
      console.log(warnout(' electron打包后不能使用历史模式'));
    }
  }
  console.log(
    `
        cd ${projectName}
        ${packageManagement === 'yarn' ? 'yarn' : packageManagement + ' run'} dev
        `
  );

  getVersion();
}

create();
