//@ts-check

'use strict';

const path = require('path');
const { DefinePlugin } = require('webpack');
const { TsconfigPathsPlugin } = require('tsconfig-paths-webpack-plugin');

//@ts-check
/** @typedef {import('webpack').Configuration} WebpackConfig **/

/** @type WebpackConfig */
const extensionConfig = {
  target: 'node', // VS Code extensions run in a Node.js-context 📖 -> https://webpack.js.org/configuration/node/
  mode: 'none', // this leaves the source code as close as possible to the original (when packaging we set this to 'production')

  entry: './src/extension.ts', // the entry point of this extension, 📖 -> https://webpack.js.org/configuration/entry-context/
  output: {
    // the bundle is stored in the 'dist' folder (check package.json), 📖 -> https://webpack.js.org/configuration/output/
    path: path.resolve(__dirname, 'dist'),
    filename: 'extension.js',
    libraryTarget: 'commonjs2'
  },
  externals: {
    vscode: 'commonjs vscode' // the vscode-module is created on-the-fly and must be excluded. Add other modules that cannot be webpack'ed, 📖 -> https://webpack.js.org/configuration/externals/
    // modules added here also need to be added in the .vscodeignore file
  },
  resolve: {
    // support reading TypeScript and JavaScript files, 📖 -> https://github.com/TypeStrong/ts-loader
    extensions: ['.ts', '.js'],
    modules: [
      path.resolve(__dirname, 'src'),
      path.resolve(__dirname, 'node_modules'),
      path.resolve(__dirname, '.yalc')
    ],
    alias: {
      // Hackfix for bundling `ws`.
      "bufferutil": path.resolve(__dirname, "node_modules/bufferutil/fallback.js"),
      "utf-8-validate": path.resolve(__dirname, "node_modules/utf-8-validate/fallback.js")
    },
    plugins: [new TsconfigPathsPlugin({ configFile: "./tsconfig.json" })]
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              transpileOnly: true
            }
          }
        ]
      }
    ]
  },
  devtool: 'source-map',
  infrastructureLogging: {
    level: "log", // enables logging required for problem matchers
  },
  plugins: [
    new DefinePlugin({
      // window: "global",
      // WebSocket: "require('ws').WebSocket"
    })
  ]
};
module.exports = [extensionConfig];