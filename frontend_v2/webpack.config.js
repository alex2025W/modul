const webpack = require('webpack');
const webpackMerge = require('webpack-merge');
const path = require('path');
const htmlWebpackPlugin = require('html-webpack-plugin');

const DEVELOPMENT_CONFIG = require('./webpack/webpack.dev');
const PRODUCTION_CONFIG = require('./webpack/webpack.prod');
const BOOTSTRAP_CONFIG = require('./webpack/webpack.bootstrap.config');

const { APP_PATH, DIST_PATH, NODE_MODULES_PATH } = require('./webpack/paths');
const { cssLoader, sassLoader, postcssLoader } = require('./webpack/loaders');

const ENV = process.env.NODE_ENV;
const VALID_ENVIRONMENTS = ['test', 'development', 'production'];

if (!VALID_ENVIRONMENTS.includes(ENV)) {
  throw new Error(`${ENV} is not valid environment!`);
}

const isProduction = ENV === 'production';

const bootstrapConfig = isProduction
  ? BOOTSTRAP_CONFIG.prod
  : BOOTSTRAP_CONFIG.dev;

const config = {
  development: DEVELOPMENT_CONFIG,
  production: PRODUCTION_CONFIG,
}[ENV];

const COMMON_CONFIG = {
  entry: {
    // common: path.resolve(APP_PATH, 'common'),
    vendor: [
      'react',
      'react-dom',
      'redux',
      'react-redux',
      'redux-thunk',
      'react-router-dom',
      'redux-saga',
    ],
    bootstrap: bootstrapConfig,
    tether: 'tether',
    'font-awesome': 'font-awesome-loader',
    'whatwg-fetch': 'whatwg-fetch',
  },

  output: {
    path: DIST_PATH,
    filename: '[name].js',
    publicPath: '/frontend_v2_build/',
  },

  // define loaders for js and css
  module: {
    rules: [
      {
        test: /\.js$/,
        include: APP_PATH,
        use: ['babel-loader', 'eslint-loader'],
      },
      {
        test: /\.(sass|css)$/,
        include: APP_PATH,
        use: ['style-loader', cssLoader, postcssLoader, sassLoader],
      },
      {
        test: /\.(jpe?g|png|gif|svg)$/i,
        use: ['file-loader?name=images/[hash].[ext]', 'image-webpack-loader'],
      },
      {
        test: /\.(woff2?|svg)$/,
        loader: 'url-loader?limit=10000&name=fonts/[name].[ext]',
      },
      { test: /\.(ttf|eot)$/, loader: 'file-loader?name=fonts/[name].[ext]' },
      // Bootstrap 3
      {
        test: /bootstrap-sass\/assets\/javascripts\//,
        loader: 'imports-loader?jQuery=jquery',
      },
    ],
  },

  resolve: {
    extensions: ['.js', '.sass'],
    modules: [NODE_MODULES_PATH, APP_PATH],
    alias: {
      widgets: path.resolve(APP_PATH, 'widgets'),
      services: path.resolve(APP_PATH, 'services'),
      commonStyles: path.resolve(APP_PATH, 'common-styles'),
      commonReducers: path.resolve(APP_PATH, 'common-reducers'),
      commonSagas: path.resolve(APP_PATH, 'common-sagas'),
    },
  },

  plugins: [
    // automatic load plugin without using import or require
    new webpack.ProvidePlugin({
      'window.Tether': 'tether',
      $: 'jquery',
      jQuery: 'jquery',
    }),
    new webpack.optimize.CommonsChunkPlugin({
      name: 'vendor',
      minChunks: 2,
    }),

    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(ENV),
    }),

    new webpack.SourceMapDevToolPlugin({
      filename: '[file].map',
      exclude: /vendor.*\.js$/,
    }),

    // Plugin only for migration from webpack1. To give necessary options to all plugins.
    new webpack.LoaderOptionsPlugin({
      options: { eslint: { emitWarning: true } },
    }),

    // Create HTML page from template with including necessary chunks
    new htmlWebpackPlugin({
      inject: true,
      title: 'Отсутствия',
      chunks: ['absence-page', 'vendor', 'common', 'bootstrap'],
      template: `${APP_PATH}/master-pages/master-page.ejs`,
      filename: 'absence-page/index.html',
      minify: {
        collapseWhiteSpace: true,
      },
    }),
    // Create HTML page from template with including necessary chunks
    new htmlWebpackPlugin({
      inject: true,
      title: 'Стоимость материала',
      chunks: ['material-price-page', 'vendor', 'common', 'bootstrap'],
      template: `${APP_PATH}/master-pages/master-page.ejs`,
      filename: 'material-price-page/index.html',
      minify: {
        collapseWhiteSpace: true,
      },
    }),
  ],
};

module.exports = webpackMerge.smart(COMMON_CONFIG, config);
