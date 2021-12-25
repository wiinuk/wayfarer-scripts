//@ts-check
const Path = require("path");
const { ConcatSource } = require("webpack-sources")

const PluginName = "WebpackUserScriptPlugin";
const userScriptPattern = /(?=(^|\n))\s*\/\/\s*==UserScript==\s*\n((.|\r\n)*?)\r\n\s*\/\/\s*==\/UserScript==\s*(\n|$)/i;

/** @type {import("webpack").WebpackPluginFunction} */
module.exports = compiler => compiler.hooks.emit.tapPromise(PluginName, async compilation => {
    for (const chunk of compilation.chunks) {
        if (!chunk.canBeInitial()) { continue; }

        for (const fileName of chunk.files) {
            if (Path.extname(fileName) !== ".js") { continue; }

            const contents = compilation.assets[fileName].source().toString()
            const userScriptMatch = contents.match(userScriptPattern);
            if (userScriptMatch == null) { continue }

            const headerContents = userScriptMatch[0];
            const contentsWithoutHeader = contents.replace(userScriptPattern, "")

            compilation.assets[fileName] = new ConcatSource(
                headerContents, "\n",
                contentsWithoutHeader
            )
        }
    }
})
