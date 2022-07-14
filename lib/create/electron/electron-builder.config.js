// https://www.electron.build/configuration/configuration
module.exports = {
  appId: 'YourAppID', // 你的应用程序ID
  productName: 'YourAppName', // 你的应用程序名称
  asar: true, // 是否使用asar包装
  directories: {
    output: 'dist_electron/${version}' // 包的输出目录
  },
  electronDownload: {
    mirror: 'https://npmmirror.com/mirrors/electron/' // electron下载地址
  },
  files: ['dist'], // 需要打包的文件
  mac: {
    artifactName: '${productName}_${version}.${ext}', // 包名称
    target: ['dmg'] // 包类型
  },
  win: {
    icon: '', // 图标 需要256x256的图标
    target: [
      {
        target: 'nsis', // 包类型
        arch: ['x64'] // 包架构
      }
    ],
    artifactName: '${productName}_${version}.${ext}' // 包名称
  },
  nsis: {
    oneClick: false, // 是否一键安装
    perMachine: false, // 是否单机安装
    allowToChangeInstallationDirectory: true, // 是否允许用户更改安装目录
    deleteAppDataOnUninstall: false, // 是否删除安装后的数据
    allowElevation: true, // 是否允许提升权限
    installerIcon: './public/favicon.ico', // 安装图标
    uninstallerIcon: './public/favicon.ico', // 卸载图标
    installerHeaderIcon: './public/favicon.ico', // 安装时头部图标
    createDesktopShortcut: true, // 是否创建桌面图标
    createStartMenuShortcut: true, // 是否创建开始菜单图标
    shortcutName: '${productName}' // 图标名称
  }
};
