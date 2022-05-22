// ssh 自动上传
// 只需安装scp2
// npm i scp2 -D
// 服务器配置信息
const server = {
  prefix: '/www/wwwroot/', //服务器路径前缀
  host: 'xxxx.xxxx.xx', // 服务器ip
  port: '22', // 端口一般默认22
  username: 'root', // 用户名
  password: 'xxxxx', // 密码
  pathName: 'www.xxxx.com', // 上传到服务器的位置,默认为 prefix + pathName
  assetsDir: 'assets', //css,fonts,js等文件存放文件夹
  locaPath: './dist/' // 打包文件相对于项目根目录位置
};

// 引入scp2
const client = require('scp2');

const Client = require('ssh2').Client; // 创建shell脚本
const conn = new Client();

console.log('正在建立连接');
conn
  .on('ready', function () {
    console.log('已连接');
    if (!server.pathName) {
      console.log('连接已关闭');
      conn.end();
      return false;
    }
    // 先删除静态资源文件
    conn.exec(
      'rm -rf ' + server.prefix + server.pathName + '/' + server.assetsDir,
      function (err, stream) {
        console.log('删除文件');
        stream.on('close', function (code, signal) {
          console.log('开始上传');
          client.scp(
            server.locaPath,
            {
              host: server.host,
              port: server.port,
              username: server.username,
              password: server.password,
              path: server.prefix + server.pathName
            },
            err => {
              if (!err) {
                console.log('项目发布完毕');
              } else {
                console.log('err', err);
                console.log('项目发布失败');
              }
              conn.end(); // 结束命令
            }
          );
        });
      }
    );
  })
  .connect({
    host: server.host,
    port: server.port,
    username: server.username,
    password: server.password
    //privateKey: '' //使用 私钥密钥登录
  });
