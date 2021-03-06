const path = require('path');

module.exports = {
  mode: 'development',
  entry: './src/index.js',
  watch: true,
  watchOptions: {
      poll: true
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'index.js'
  },
  devServer: {
    index: 'default.html',
    contentBase: path.join(__dirname, "."),
    compress: true,
    port: 8080
  },
  plugins: [
  ]
};
