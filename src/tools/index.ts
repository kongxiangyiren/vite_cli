import { exec } from 'child_process';
import { rm } from 'fs';
import { bgRed, red } from 'kolorist';

const tools = {
  /** 错误样式 */
  errout(str: string): string {
    return red(bgRed(' ERROR ')) + red(str);
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
  }
};

export = tools;
