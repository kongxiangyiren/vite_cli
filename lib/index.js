const inquirer = require('inquirer');
const { exec } = require('child_process');
const fs = require('fs-extra');
const chalk = require('chalk');
const { get } = require('axios');
const { version } = require("../package.json")
const warning = chalk.hex('#FFA500');
const error = chalk.whiteBright.bgRed;

module.exports = {
    // 选择器
    choose(message) {
        return inquirer.prompt(message);
    },
    // 安装命令
    exe(command) {
        return new Promise((resolve, reject) => {
            exec(command, (err, stdout, stderr) => {
                if (err) {
                    console.log(
                        "\n", error(' ERROR '), chalk.red(`${command} 失败`)
                    );
                    process.exit(0)
                } else {
                    resolve(stdout);
                }
            });
        });
    },

    /**
     * @description:
     * @param {string} project - 项目文件路径
     * @param {string} template - 模板内容
     * @return {Promise}
     */
    cp(project, template) {
        return new Promise((resolve, reject) => {
            fs.outputFile(project, template)
                .then(() => {
                    resolve();
                })
                .catch(err => {
                    reject(err);
                });
        });
    },
    // 判断是不是最新版本
    async getVersion() {
        const { data: res } = await get('https://gitee.com/fei-yuhao/vite_cli/raw/master/package.json').catch(err => {
            process.exit(0)
        })
        if (version !== res.version) {
            return console.log(
                warning(
                    `最新版本:${res.version},当前版本:${version},请运行 npm i @feiyuhao/vite_cli -g 更新`
                )
            );
        }
    },
    // 判断包项目使用的包管理工具
    tools() {
        return new Promise((resolve, reject) => {
            fs.pathExists("./package-lock.json", (err, exists) => {
                if (err) {
                    return console.error(error(' ERROR '), chalk.red(err));
                }
                if (exists) {
                    resolve("npm")
                } else {
                    fs.pathExists("./yarn.lock", (err, exists) => {
                        if (err) {
                            return console.error(error(' ERROR '), chalk.red(err));
                        }
                        if (exists) {
                            resolve("yarn")
                        } else {
                            fs.pathExists("./pnpm-lock.yaml", (err, exists) => {
                                if (err) {
                                    return console.error(error(' ERROR '), chalk.red(err));
                                }
                                if (exists) {
                                    resolve("pnpm")
                                } else {
                                    resolve("npm")
                                }

                            })
                        }

                    })
                }

            })
        })
    }

}