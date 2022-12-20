import { exec } from 'child_process';
import { existsSync, rm } from 'fs';
import { bgRed, bgYellow, red, white, yellow } from 'kolorist';
import axios from 'axios';

const tools = {
  /** 错误样式 */
  errout(str: string): string {
    return white(bgRed(' ERROR ')) + red(str);
  },
  warnout(str: string): string {
    return white(bgYellow(' WARN ')) + yellow(str);
  },
  /** 异步递归删除文件夹 */
  asyncRm(dir: string) {
    return new Promise((resolve, reject) => {
      rm(dir, { recursive: true }, err => {
        if (err) {
          return reject(err);
        }
        return resolve(true);
      });
    });
  },
  // 安装命令
  exe(command: any) {
    return new Promise((resolve, reject) => {
      exec(command, (err, stdout, stderr) => {
        if (err) {
          console.log('\n', tools.errout(` ${command} 失败`));
          process.exit();
        } else {
          resolve(stdout);
        }
      });
    });
  },
  /** 判断包项目使用的包管理工具 */
  tools() {
    return new Promise((resolve, reject) => {
      if (existsSync('./package-lock.json')) {
        resolve('npm');
      } else if (existsSync('./yarn.lock')) {
        resolve('yarn');
      } else if (existsSync('./pnpm-lock.yaml')) {
        resolve('pnpm');
      } else {
        resolve('npm');
      }
    });
  },
  /**  判断是不是最新版本*/
  async getVersion() {
    const { version } = require('../../package.json');
    const { data: res } = await axios
      .get('https://registry.npmmirror.com/@feiyuhao/vite_cli')
      .catch(err => {
        process.exit();
      });
    if (version !== res['dist-tags'].latest) {
      return console.log(
        yellow(
          `最新版本:${res['dist-tags'].latest},当前版本:${version},请运行 npm i @feiyuhao/vite_cli --global 更新`
        )
      );
    }
  }
};

export = tools;
