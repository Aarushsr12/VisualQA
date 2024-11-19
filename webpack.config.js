const path = require("path");

module.exports = {
  entry: "./inject.js", // Path to your inject.js
  output: {
    filename: "inject.bundle.js", // Bundled output
    path: path.resolve(__dirname, "dist"),
  },
  mode: "production",
};
