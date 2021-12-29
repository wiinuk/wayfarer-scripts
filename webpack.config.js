//@ts-check
const UserScriptPlugin = require("./webpack-user-script-plugin");

const entry = "./source/wayfarer-lifelog.user.ts";

/** @type {import("webpack").Configuration} */
const config = {
    mode: "production",
    entry,
    plugins: [UserScriptPlugin],
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: "ts-loader",
            },
        ],
    },
    resolve: {
        extensions: [".ts", ".js"],
    },
    optimization: {
        minimize: false,
    },
    output: {
        path: __dirname,
        filename: "wayfarer-lifelog.user.js",
    },
};
module.exports = config;
