var webpack = require("webpack");
var path = require("path");

module.exports = {
  entry: {
    content: "./src/content.js",
    background: "./src/background.js"
  },
  output: {
    filename: "[name].js",
    path: path.resolve(__dirname, "./dist")
  }
};
// vim: et sw=2
