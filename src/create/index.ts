import { program } from 'commander';
import { cpSync, existsSync, readFileSync, unlink, writeFileSync } from 'fs';
import { green, red } from 'kolorist';
import { join } from 'path';
import prompts from 'prompts';
import { asyncRm, errout, exe } from '../tools';

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
            { title: 'electron', value: 'electron', disabled: true }
          ]
        },
        {
          type: (_, { dependencies }: { dependencies: string[] }) =>
            dependencies.includes('TypeScript') ? 'confirm' : null,
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

  //拉取项目模板
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
    await exe(
      `cd ${projectName} && ${packageManagement} ${
        packageManagement === 'npm' ? 'install' : 'add'
      } vite-plugin-electron electron electron-builder -D`
    );
  }
}

create();
