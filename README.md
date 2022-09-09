# vue3 vite 脚手架

## 说明

1、这是对[**create-vite**](https://www.npmjs.com/package/create-vite) 的再一次封装，加入了vue-router、pinia、sass、less、axios、gzip、eslint、electron配置

~~2、目前~~ [**~~create-vite~~**](https://www.npmjs.com/package/create-vite) ~~已经更新到vite3版本,如果要使用本插件请更新到 **2** 最新版本，vite3对应版本正在开发中。~~

~~3、更新到vite3版本，但暂时没有适配vite3的eslint和electron，如果要使用eslint和electron请使用2版本，安装~~`npm i @feiyuhao/vite_cli@2 -g`

## 安装

```bash
npm i @feiyuhao/vite_cli -g
```

## 卸载

```bash
npm uni @feiyuhao/vite_cli -g
```

## 使用

|说明|命令|
|-|-|
|查看版本号|vc -V|
|查看信息|vc -h|
|创建项目|vc create 项目名称|
|添加自动化部署配置|vc deploy|

## 关于自动化部署

由于自动化部署太危险,默认不提交git,如果要提交git请自行修改 `.gitignore` 文件

运行`vc deploy`会生成deploy文件夹

请自行修改配置信息

多服务器部署可复制deploy下文件,并修改`package.json`的scripts配置

### package.json下scripts配置

```json
 "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "ssh": "vite build && node ./deploy/ssh.js",
    "ftp": "vite build && node ./deploy/ftp.js"
  },
```

## 关于electron

1、需要使用hash模式

2、不能使用gzip压缩文件

3、设置electron镜像

```csharp
npm config set ELECTRON_MIRROR https://npmmirror.com/mirrors/electron/
或
yarn config set ELECTRON_MIRROR https://npmmirror.com/mirrors/electron/
或
pnpm config set ELECTRON_MIRROR https://npmmirror.com/mirrors/electron/
```

## 仓库卡片

[![空巷一人/vite_cli](https://gitee.com/fei-yuhao/vite_cli/widgets/widget_card.svg?colors=4183c4,ffffff,ffffff,e3e9ed,666666,9b9b9b)](https://gitee.com/fei-yuhao/vite_cli)

## 下载量

[![downloads](https://img.shields.io/npm/dt/@feiyuhao/vite_cli) ](https://www.npmjs.com/package/@feiyuhao/vite_cli)

## 仓库地址

gitee: <https://gitee.com/fei-yuhao/vite_cli>

github: <https://github.com/kongxiangyiren/vite_cli>