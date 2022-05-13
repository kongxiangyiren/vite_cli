const program = require('commander');
const ora = require('ora');
const chalk = require('chalk');
const fs = require('fs-extra');
const { choose, exe, cp, getVersion } = require("../lib/index")
const templatePath = require('../lib/create/template');

const error = chalk.whiteBright.bgRed;


program.usage('<app-name>')

program.parse(process.argv);


let reg = /^[A-Za-z][0-9a-zA-Z_-]{0,}$/;
if (!reg.test(program.args[0])) {
    console.log(
        error(' ERROR '), chalk.red('项目名称可选数字、字母、下划线、-,第一位必须是字母!')
    );
} else {
    fs.pathExists(program.args[0], (err, exists) => {
        if (err) {
            return console.error(error(' ERROR '), chalk.red(err));
        }
        if (exists) {
            let questions2 = [
                {
                    name: 'created',
                    type: 'confirm',
                    message: '文件夹存在，是否覆盖?'
                }
            ];

            choose(questions2).then(answers => {
                if (answers.created) {
                    fs.remove(program.args[0], err => {
                        if (err) {
                            return console.error(error(' ERROR '), chalk.red(err));
                        }
                        init(program.args[0]);
                    });
                }
            });
        } else {
            init(program.args[0]);
        }

    });
}

async function init(title) {
    const spinner = ora(chalk.green('正在生成项目'));

    let questions1 = [
        {
            type: 'checkbox',
            message: '配置项目依赖',
            name: 'dependencies',
            choices: [
                'TypeScript',
                'Router',
                'pinia',
                'CSS 预处理器',
                'axios',
                'gzip'
            ],
            default: ['TypeScript', 'Router']
        },
        {
            name: 'routerMode',
            type: 'confirm',
            message: '是否使用历史模式?',
            default: '',
            when: answers => {
                return answers.dependencies.includes('Router');
            }
        },
        {
            name: 'css',
            type: 'list',
            message: '选择css预处理器',
            choices: ['Sass/SCSS', 'Less'],
            when: answers => {
                return answers.dependencies.includes('CSS 预处理器');
            }
        },
        {
            name: 'tool',
            type: 'list',
            message: '请选择包管理工具',
            choices: ['npm', 'yarn', 'pnpm']
        }
    ];

    let message = await choose(questions1);
    message.title = title;
    spinner.start();
    let npm = await exe(`npm -v`);

    //拉取项目模板
    await exe(
        `npm init vite@latest ${message.title} ${Number(npm.split('.')[0]) < 7 ? '' : '--'
        } --template ${message.dependencies.indexOf('TypeScript') > -1 ? 'vue-ts' : 'vue'
        }`
    );

    await exe(`cd ${message.title} && ${message.tool} install`);

    let appvue = '';
    let mainImport = '';
    let mainUse = '';
    let viteConfigImport = '';
    let viteConfigPlugin = '';

    // 安装 router
    if (message.dependencies.indexOf('Router') > -1) {
        await exe(
            `cd ${message.title} && ${message.tool === 'npm'
                ? 'npm install vue-router@4'
                : message.tool + ' add vue-router@4'
            }`
        );
        // app.vue
        appvue += `    <router-view></router-view>`;
        // main.js
        mainImport += `import router from './router';\n`;
        mainUse += `app.use(router);\n`;
        // router.js
        let createWebHistory = '';
        let RouteRecordRaw =
            message.dependencies.indexOf('TypeScript') > -1 ? ', RouteRecordRaw ' : '';
        let routerTs =
            message.dependencies.indexOf('TypeScript') > -1
                ? ': Array<RouteRecordRaw>'
                : '';

        // 历史模式
        if (message.routerMode) {
            createWebHistory = `createWebHistory`;
        } else {
            // hash模式
            createWebHistory = `createWebHashHistory`;
        }
        let reg = new RegExp('<!-- createWebHistory -->', 'g');
        templatePath.router = templatePath.router
            .replace(reg, createWebHistory)
            .replace('<!-- RouteRecordRaw -->', RouteRecordRaw)
            .replace('<!-- routerTs -->', routerTs);
        // 写入router.js
        await cp(
            `${message.dependencies.indexOf('TypeScript') > -1
                ? message.title + '/src/router.ts'
                : message.title + '/src/router.js'
            }`,
            templatePath.router
        );
    }

    // 安装 pinia
    if (message.dependencies.indexOf('pinia') > -1) {
        await exe(
            `cd ${message.title} && ${message.tool === 'npm'
                ? 'npm i pinia@next'
                : message.tool + ' add pinia@next'
            }`
        );
        //  main.js
        mainImport += `import { createPinia } from 'pinia';\n`;
        mainUse += `app.use(createPinia());\n`;

        await cp(
            `${message.dependencies.indexOf('TypeScript') > -1
                ? message.title + '/src/store/index.ts'
                : message.title + '/src/store/index.js'
            }`,
            templatePath.pinia
        );
    }

    // 安装 CSS 预处理器
    if (message.dependencies.indexOf('CSS 预处理器') > -1) {
        if (message.css === 'Sass/SCSS') {
            await exe(
                `cd ${message.title} && ${message.tool === 'npm'
                    ? 'npm install sass -D'
                    : message.tool + ' add sass -D'
                }`
            );
        } else if (message.css === 'Less') {
            await exe(
                `cd ${message.title} && ${message.tool === 'npm'
                    ? 'npm i less less-loader -D'
                    : message.tool + ' add less less-loader -D'
                }`
            );
        }
    }
    // 安装 axios
    if (message.dependencies.indexOf('axios') > -1) {
        await exe(
            `cd ${message.title} && ${message.tool === 'npm' ? 'npm i axios' : message.tool + ' add axios'
            }`
        );
    }
    // 使用 gizp
    if (message.dependencies.indexOf('gzip') > -1) {
        await exe(
            `cd ${message.title} && ${message.tool === 'npm'
                ? 'npm i vite-plugin-compression -D'
                : message.tool + ' add vite-plugin-compression -D'
            } `
        );
        viteConfigImport +=
            "import viteCompression from 'vite-plugin-compression';\n";
        viteConfigPlugin += `,
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
  })\n  `;
    }

    // 全局修改
    if (message.dependencies != '' && message.dependencies != ['TypeScript']) {
        //写入app.vue
        templatePath.appVue = templatePath.appVue.replace(
            '<!-- appVue -->',
            appvue
        );
        await cp(`${message.title}/src/app.vue`, templatePath.appVue);
        //写入main.js
        templatePath.main = templatePath.main
            .replace('<!-- mainImport -->', mainImport)
            .replace('<!-- mainUse -->', mainUse);
        await cp(
            `${message.dependencies.indexOf('TypeScript') > -1
                ? message.title + '/src/main.ts'
                : message.title + '/src/main.js'
            }`,
            templatePath.main
        );
        // 写入vite.config.js
        templatePath.viteConfig = templatePath.viteConfig
            .replace('<!-- viteConfigImport -->', viteConfigImport)
            .replace('<!-- viteConfigPlugin -->', viteConfigPlugin);
        await cp(
            `${message.dependencies.indexOf('TypeScript') > -1
                ? message.title + '/vite.config.ts'
                : message.title + '/vite.config.js'
            }`,
            templatePath.viteConfig
        );
    }

    spinner.stop();
    console.log('项目初始化成功');
    console.log(
        chalk.blue(
            `
        cd ${message.title}
        ${message.tool === 'yarn' ? 'yarn' : message.tool + ' run'} dev
        `
        )
    );

    getVersion()

}



