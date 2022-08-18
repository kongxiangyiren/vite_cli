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
    icon: '', // mac图标，需要.icns格式或者png格式, 512*512
    target: ['dmg'] // 包类型
  },
  win: {
    icon: '', // 图标 需要256x256的图标
    target: [
      {
        target: 'nsis', // 包类型
        arch: ['x64'] // 包架构
      }
    ]
  },
  nsis: {
    //https://www.electron.build/configuration/nsis
    artifactName: '${productName}-setup-${arch}-${version}.${ext}', // 包名
    oneClick: false, // 是否一键安装
    perMachine: false, // 是否单机安装
    allowToChangeInstallationDirectory: true, // 是否允许用户更改安装目录
    deleteAppDataOnUninstall: true, // 是否删除安装后的数据
    allowElevation: true, // 是否允许提升权限
    runAfterFinish: false, // 安装完成后是否运行
    installerIcon: './public/favicon.ico', // 安装图标
    uninstallerIcon: './public/favicon.ico', // 卸载图标
    installerHeader: './public/favicon.ico', // 安装的头部(右边的图标)
    installerHeaderIcon: './public/favicon.ico', // 安装时头部图标
    // installerSidebar: './public/sidebar.bmp', // 安装包安装侧边图片，要求164 × 314 像素
    // uninstallerSidebar: './public/sidebar.bmp', // 安装包卸载侧边图片，要求164 × 314 像素
    createDesktopShortcut: true, // 是否创建桌面图标
    createStartMenuShortcut: true, // 是否创建开始菜单图标
    shortcutName: '${productName}' // 图标名称
    // license: './LICENSE.txt' // 许可证 需要gb2312格式
  },
  // extraResources: [ // 额外的资源文件
  //   {
  //     from: 'public/', // 资源文件的来源
  //     to: 'public/' // 资源文件的目标位置 会在打包后的resources目录下
  //   }
  // ]
  // fileAssociations: [ // 文件关联
  //   {
  //     ext: ['md'], // 文件后缀，可以为string，也可以为string[]
  //     icon: './public/favicon.ico', // 文件图标
  //   }
  // ], //可以配置多个 生产环境使用 主进程process.argv[1]获取
};
