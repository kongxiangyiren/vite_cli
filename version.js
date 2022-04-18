const { get } = require('axios');

let getVersion = () => {
  return get('https://gitee.com/fei-yuhao/vite_cli/raw/master/package.json');
};
module.exports = {
  getVersion
};
