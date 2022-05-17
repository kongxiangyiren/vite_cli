// ftp 自动上传
const FtpDeploy = require('ftp-deploy');
const ftpServ = new FtpDeploy();

let config = {
    user: "xx",                   // 用户名
    password: "xxxxx",           // 密码
    host: "xxxxxx", // ftp 主机地址
    port: 21, // 端口
    localRoot: './dist', // 打包文件相对于项目根目录位置
    // remoteRoot: "/public_html/",
    remoteRoot: '/', // 远程资源路径
    include: ['*', '**/*'], // 包含文件
    // exclude: ['dist/**/*.map'],     // 排除文件
    deleteRemote: false, // （慎用)上传前是否删除, 如果为true，则在上传之前删除目标中的所有现有文件
    forcePasv: true, // 主动模式/被动模式
    sftp: false// sftp
};
// 上传完成后回调
ftpServ.deploy(config)
    .then(res => { // 上传成功

        console.log('finished:', res);
        console.log('项目发布完毕');
        return false;
    })
    .catch(err => { // 上传失败

        console.log(err);
        console.log('项目发布失败');
        return false;
    });