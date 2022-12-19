import { cpSync, readdir, stat, unlink } from 'fs';
import { join } from 'path';

function build() {
  cpSync('./src', './dist', { recursive: true });
  nots('./dist');
}

// 删除ts
function nots(dir: string) {
  readdir(dir, function (err, files) {
    files.forEach(function (filename) {
      var src = join(dir, filename);
      stat(src, function (err, st) {
        if (err) {
          throw err;
        }
        // 判断是否为文件
        if (st.isFile()) {
          if (/\.ts$/.test(filename)) {
            unlink(src, err => {
              if (err) throw err;
              //   console.log('成功删除：' + src);
            });
          }
        } else {
          // 递归作为文件夹处理
          nots(src);
        }
      });
    });
  });
}
build();
