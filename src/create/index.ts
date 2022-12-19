import { program } from 'commander';
import { existsSync } from 'fs';
import { green, red } from 'kolorist';
import { join } from 'path';
import prompts from 'prompts';
import { asyncRm, errout } from '../tools';

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
            { title: 'axios', value: 'axios' },
            { title: 'gzip', value: 'gzip' },
            { title: 'ESLint', value: 'ESLint' },
            { title: 'electron', value: 'electron' }
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
  const { overwrite, dependencies, history, css, prettier, npmrc } = result;
  console.log(projectName, result);
  if (overwrite) {
    await asyncRm(join(process.cwd(), projectName)).catch(err => {
      // 如果删除失败
      console.log(errout(' ' + err));
      process.exit();
    });
  }
}

create();
