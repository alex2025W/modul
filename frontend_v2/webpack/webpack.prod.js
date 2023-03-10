const path = require('path');
const webpack = require('webpack');
const ManifestPlugin = require('webpack-manifest-plugin');
const ChunkManifestPlugin = require('chunk-manifest-webpack-plugin');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const CompressionPlugin = require('compression-webpack-plugin');

const WebpackMd5Hash = require('webpack-md5-hash');

const { DIST_PATH, APP_PATH } = require('./paths');
const { cssLoader, sassLoader, postcssLoader } = require('./loaders');

const PRODUCTION_CONFIG = {
  entry: {
    'absence-page': path.resolve(APP_PATH, 'pages/absence-page'),
    'material-price-page': path.resolve(APP_PATH, 'pages/material-price-page'),
  },

  output: {
    path: DIST_PATH,
    filename: '[name]/[chunkhash].bundle.js',
  },

  module: {
    rules: [
      {
        test: /\.(sass|css)$/,
        include: APP_PATH,
        loader: ExtractTextPlugin.extract({
          fallback: 'style-loader',
          use: [cssLoader, postcssLoader, sassLoader],
        }),
      },
    ],
  },

  performance: {
    hints: 'warning',
  },

  plugins: [
    new webpack.HashedModuleIdsPlugin(),

    new webpack.LoaderOptionsPlugin({
      minimize: true,
      debug: false,
    }),

    new ExtractTextPlugin({
      filename: '[name]/css/[contenthash].css',
      disable: false,
      allChunks: true,
    }),

    new webpack.optimize.UglifyJsPlugin({
      compress: {
        screw_ie8: true,
        warnings: false,
      },
      mangle: {
        screw_ie8: true,
      },
      output: {
        comments: false,
        screw_ie8: true,
      },
      sourceMap: true,
    }),

    new ManifestPlugin({
      fileName: 'webpack-asset-manifest.json',
    }),

    new webpack.optimize.CommonsChunkPlugin({
      name: 'vendor',
      minChunks: Infinity,
    }),

    new ChunkManifestPlugin({
      filename: 'webpack-chunk-manifest.json',
      manifestVariable: 'webpackManifest',
    }),

    new CompressionPlugin({
      asset: '[file].gz',
      algorithm: 'gzip',
      test: /\.js$|\.css$/,
      threshold: 10240,
      minRatio: 0.8,
    }),

    new WebpackMd5Hash(),
  ],
};

module.exports = PRODUCTION_CONFIG;
