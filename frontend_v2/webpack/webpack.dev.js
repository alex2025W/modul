const webpack = require('webpack');
const WatchMissingNodeModulesPlugin = require('react-dev-utils/WatchMissingNodeModulesPlugin');

const { NODE_MODULES_PATH, APP_PATH } = require('./paths');

const DEVELOPMENT_CONFIG = {
  entry: {
    'absence-page': [
      'react-hot-loader/patch',
      `${APP_PATH}/pages/absence-page/hot`,
    ],
    'material-price-page': [
      'react-hot-loader/patch',
      `${APP_PATH}/pages/material-price-page/hot`,
    ],
  },

  cache: true,
  devServer: {
    hot: true,
    port: 3000,
    inline: true,
    historyApiFallback: true,
    stats: {
      assets: true,
      timings: true,
      chunks: false,
      children: false,
    },
    proxy: {
      '*': 'http://localhost:8083', // <- backend
    },
  },
  output: {
    publicPath: '/',
  },

  plugins: [
    new webpack.HotModuleReplacementPlugin(),
    new webpack.NamedModulesPlugin(),
    new WatchMissingNodeModulesPlugin(NODE_MODULES_PATH),
  ],
};

module.exports = DEVELOPMENT_CONFIG;
