const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');

module.exports = {
  mode: 'development',
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
  },
  devtool: 'source-map',
  optimization: {
    minimize: false,
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env', '@babel/preset-react'],
          },
        },
      },
      {
        test: /\.module\.css$/,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: {
              modules: {
                localIdentName: '[name]__[local]--[hash:base64:5]',
              },
            },
          },
        ],
      },
      {
        test: /\.css$/,
        exclude: /\.module\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.(svg|png|jpg|jpeg|gif)$/,
        type: 'asset/resource',
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/index.html',
    }),
    new webpack.DefinePlugin({
      'process.env': JSON.stringify({
        NODE_ENV: 'development',
        REACT_APP_SF_ACCESS_TOKEN: process.env.REACT_APP_SF_ACCESS_TOKEN || undefined,
        REACT_APP_SF_INSTANCE_URL: process.env.REACT_APP_SF_INSTANCE_URL || undefined,
        REACT_APP_SF_USERNAME: process.env.REACT_APP_SF_USERNAME || '',
        REACT_APP_SF_ORG_ALIAS: process.env.REACT_APP_SF_ORG_ALIAS || '',
        REACT_APP_USE_MOCK_DATA: process.env.REACT_APP_USE_MOCK_DATA || 'false',
      }),
    }),
  ],
  devServer: {
    static: {
      directory: path.join(__dirname, 'public'),
    },
    compress: true,
    port: 3000,
    open: true,
    historyApiFallback: true, // This is crucial for React Router
  },
  resolve: {
    extensions: ['.js', '.jsx'],
  },
};
