//@ts-check
const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const rx = require("rxjs");

const inputPath = path.resolve("wayfarer-lifelog.user.ts");
const outputPath =  path.join(os.tmpdir(), "tampermonkey_debug_sym.js");

/**
 * @param {fs.PathLike} filename
 */
const fromFsWatcher = filename => {
    const w = fs.watch(filename);
    return rx.merge(
        rx.from([filename]),
        rx.fromEvent(w, 'change'),
        rx.fromEvent(w, "rename"),
    );
}
/**
 * @param {TemplateStringsArray} template
 * @param {...unknown} substitutions
 */
 const run = (template, ...substitutions) => {
    const command = String.raw(template, ...substitutions);
    console.log(`> ${command}`);
    childProcess.execSync(command, { stdio: "inherit" });
}

fromFsWatcher(inputPath).pipe(
    rx.sampleTime(3000),
).subscribe(() => {
    try {
        run`npx tsc ${inputPath} --outFile ${outputPath}`
    }
    catch (e) {
        console.error(e);
    }
})
