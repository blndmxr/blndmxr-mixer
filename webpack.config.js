const path = require("path");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyPlugin = require("copy-webpack-plugin");
const SriPlugin = require("webpack-subresource-integrity");
const devMode = process.env.NODE_ENV !== "production";

const webpack = require("webpack");
const config = require("./config/globals.json");

module.exports = {
	mode: "development",
	entry: "./src/index.tsx",
	devtool: "source-map",
	plugins: [
		new SriPlugin({
			hashFuncNames: ["sha256"],
			enabled: process.env.NODE_ENV === "production",
		}),
		new CleanWebpackPlugin(),
		new HtmlWebpackPlugin({
			title: `${config.WALLET_NAME} wallet`,
			template: "./src/index.html",
		}),
		new CopyPlugin([{ from: "./public", to: "." }]),
		new webpack.ProvidePlugin({
			GLOBALS: "GLOBALS",
		}),
	],
	module: {
		rules: [
			{
				test: /\.worker\.ts$/,
				use: ["worker-loader"],
			},
			{
				test: /\.tsx?$/,
				use: "ts-loader",
				exclude: /node_modules/,
			},
			{
				test: /\.css$/,
				use: ["style-loader", "css-loader"],
			},
			{
				test: /\.scss$/,
				use: [
					"style-loader",
					"css-loader",
					"sass-loader",
					{
						loader: "sass-resources-loader",
						options: {
							resources: "./config/globals.scss",
						},
					},
				],
			},
			{
				test: /\.(png|jpg|svg|eot|woff|woff2|ttf)$/i,
				use: ["file-loader"],
			},
		],
	},
	resolve: {
		extensions: [".tsx", ".ts", ".js", ".css", ".scss"],
		alias: {
			GLOBALS: path.resolve(__dirname, "./config/globals.json"),
		},
	},
	output: {
		crossOriginLoading: "anonymous",
		filename: "[name].[contenthash].js",
		path: path.resolve(__dirname, "dist"),
		publicPath: process.env.USE_CDN ? `https://${config.MIXER_NAME}.com/` : "/",
	},
	devServer: {
		contentBase: path.join(__dirname, "dist"),
		compress: true,
		port: 9000,
		filename: "[name].[contenthash].js",
		historyApiFallback: true,
	},
	//   optimization: {
	//          runtimeChunk: 'single',
	//          splitChunks: {
	//            cacheGroups: {
	//              vendor: {
	//                test: /[\\/]node_modules[\\/]/,
	//                name: 'vendors',
	//                chunks: 'all'
	//            }
	//         }
	//      }
	//  }
};
