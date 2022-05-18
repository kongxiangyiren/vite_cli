const { choose, exe, tools, copy, read, cp } = require("../lib/index")
const ora = require('ora');
const chalk = require('chalk');
const path = require("path")

const spinner = ora(chalk.green('正在安装配置'));
async function deploy() {

    const questions1 = [
        {
            type: 'checkbox',
            message: '选择自动部署方式',
            name: 'deploy',
            choices: [
                'ssh',
                'ftp'
            ],
            default: ['ssh']
        }
    ];

    const message = await choose(questions1)

    spinner.start()

    // 判断包管理器
    const tool = await tools()

    if (message.deploy.indexOf("ssh") > -1) {
        await exe(`${tool === 'npm' ? 'npm i' : tool + " add"} scp2 -D`)
        let ssh = path.join(__dirname, "../lib/deploy/ssh.js")
        copy("deploy/ssh.js", ssh)
    }

    if (message.deploy.indexOf("ftp") > -1) {
        await exe(`${tool === 'npm' ? 'npm i' : tool + " add"} ftp-deploy -D`)
        let ftp = path.join(__dirname, "../lib/deploy/ftp.js")
        copy("deploy/ftp.js", ftp)
    }


    let pack = await read("./package.json")
    let pac = JSON.parse(pack)

    if (message.deploy.indexOf("ssh") > -1) {
        pac.scripts.ssh = "vite build && node ./deploy/ssh.js"
    }
    if (message.deploy.indexOf("ftp") > -1) {
        pac.scripts.ftp = "vite build && node ./deploy/ftp.js"
    }

    await cp('./package.json', JSON.stringify(pac, null, 2));

    let git = await read("./.gitignore")
    if (git.indexOf("deploy/*") === -1) {
        git = "deploy/*\\n" + git
        git = git.replace(/\\n/g, "\n")
        await cp('./.gitignore', git);
    }
    spinner.stop()

    console.log(chalk.white("配置成功,请自行修改配置文件"));
}

deploy()