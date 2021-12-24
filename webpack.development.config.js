//@ts-check
const os = require('os');
const productionConfig = require('./webpack.config.js');

/** @type {import("webpack").Configuration} */
const config = {
    ...productionConfig,

    mode: "development",
    output: {
        path: os.tmpdir(),
        filename: "tampermonkey_debug_sym.js",
    },
    devServer: {
        host: "https://wayfarer.nianticlabs.com/new/profile",
        port: 8080,
    },
};

module.exports = config;
