// eslint-disable-next-line @typescript-eslint/no-var-requires
const HtmlWebpackPlugin = require("html-webpack-plugin");
// eslint-disable-next-line @typescript-eslint/no-var-requires,import/no-extraneous-dependencies
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

module.exports = {
  webpack: (config) => ({
    ...config,
    entry: {
      popup: ["./src/popup/index.tsx"],
      options: "./src/options/index.tsx",
      background: "./src/background/background.ts",
    },
    output: {
      ...config.output,
      filename: "js/[name].js",
      chunkFilename: "js/[name].chunk.js",
      assetModuleFilename: "media/[name][ext]",
    },
    plugins: [
      // ...config.plugins,
      new MiniCssExtractPlugin({
        filename: "static/css/[name].css",
      }),
      new HtmlWebpackPlugin({
        inject: true,
        title: "Popup",
        chunks: ["popup"],
        template: "./public/index.html",
        filename: "popup.html",
      }),
      new HtmlWebpackPlugin({
        inject: true,
        title: "Options",
        template: "./public/index.html",
        chunks: ["options"],
        filename: "options.html",
      }),
    ],
    experiments: {
      topLevelAwait: true,
    },
  }),
};
