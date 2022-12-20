import { cpSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { green, red, white, yellow } from 'kolorist';
import ora from 'ora';
import { join } from 'path';
import prompts from 'prompts';
import { exe, getVersion, tools, warnout } from '../tools';
const spinner = ora(green('正在安装配置'));

async function deploy() {
  if (!existsSync(join(process.cwd(), `./package.json`))) {
    console.log(warnout(' 找不到package.json,请在项目目录下使用该命令'));
    process.exit();
  }

  let result: prompts.Answers<'depl' | 'overwrite' | 'overwriteChecker'>;
  try {
    result = await prompts(
      [
        {
          type: 'select',
          name: 'depl',
          message: green('请选择自动化工具'),
          choices: [
            { title: 'ssh', value: 'ssh' },
            { title: 'ftp', value: 'ftp' }
          ]
        },
        {
          type: (_, { depl }: { depl: string }) => {
            if (existsSync(join(process.cwd(), `./deploy/${depl}.cjs`))) {
              return 'confirm';
            }
            return null;
          },
          name: 'overwrite',
          message: green('配置文件已经存在,是否覆盖?')
        },
        {
          type: (_, { overwrite }: { overwrite?: boolean }) => {
            if (overwrite === false) {
              throw new Error(red('✖') + ' 操作被取消');
            }
            return null;
          },
          name: 'overwriteChecker'
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

  const { depl } = result;

  spinner.start();

  const tool = await tools();

  // 添加ssh文件
  if (depl === 'ssh') {
    await exe(`${tool} ${tool === 'npm' ? 'install' : ' add'} scp2 -D`);
    let ssh = join(__dirname, './assets/ssh.jvc');
    cpSync(ssh, 'deploy/ssh.cjs', { recursive: true });
  }

  // 添加ftp文件
  if (depl === 'ftp') {
    await exe(
      `${tool} ${
        tool === 'npm' ? 'install' : ' add'
      } ftp-deploy git+https://github.91chi.fun/https://github.com/taylorgibb/promise-ftp.git -D`
    );
    let ftp = join(__dirname, './assets/ftp.jvc');
    cpSync(ftp, 'deploy/ftp.cjs', { recursive: true });
  }

  // 获取项目package.json
  let pac = require(join(process.cwd(), './package.json'));

  if (depl === 'ssh') {
    pac.scripts.ssh = 'npm run build && node ./deploy/ssh.cjs';
  }
  if (depl === 'ftp') {
    pac.scripts.ftp = 'npm run build && node ./deploy/ftp.cjs';
  }
  // 写入
  writeFileSync(join(process.cwd(), './package.json'), JSON.stringify(pac, null, 2));

  // 修改.gitignore
  let git = '';

  if (existsSync(join(process.cwd(), './.gitignore'))) {
    git = readFileSync(join(process.cwd(), './.gitignore'), { encoding: 'utf-8' });
  }
  if (git.indexOf('deploy/*') === -1) {
    git = '# 自动化部署\\ndeploy/*\\n\\n' + git;
    git = git.replace(/\\n/g, '\n');
    writeFileSync(join(process.cwd(), './.gitignore'), git);
  }
  spinner.stop();

  console.log(white('配置成功,请自行修改配置文件'));
  console.log(yellow('默认修改 .gitignore 不上传deploy文件夹,如需修改请警慎,避免造成账号密码泄露'));
  getVersion();
}

deploy();
