/*!
 * Copyright 2023 Dominik Kilian
 *
 * Redistribution and use in source and binary forms, with or without modification, are permitted provided that the
 * following conditions are met:
 * 1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following
 *    disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the
 *    following disclaimer in the documentation and/or other materials provided with the distribution.
 * 3. Neither the name of the copyright holder nor the names of its contributors may be used to endorse or promote
 *    products derived from this software without specific prior written permission.
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS “AS IS” AND ANY EXPRESS OR IMPLIED WARRANTIES,
 * INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 * WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

//removeDir('web', (entry) => /index.html$/.test(entry));

const workerEntryPoints = [
    'vs/language/json/json.worker.js',
    'vs/language/css/css.worker.js',
    'vs/language/html/html.worker.js',
    'vs/language/typescript/ts.worker.js',
    'vs/editor/editor.worker.js'
];

build({
    entryPoints: workerEntryPoints.map((entry) => `./node_modules/monaco-editor/esm/${entry}`),
    bundle: true,
    sourcemap: true,
    minify: true,
    target: ['es2020', 'chrome80', 'edge80', 'firefox78'],
    format: 'iife',
    outbase: './node_modules/monaco-editor/esm/',
    outdir: path.join(__dirname, '../web'),
    metafile: true,
}, false, 'dist/web-monaco.json');

build({
    entryPoints: ['src/xml2docx-worker.ts'],
    bundle: true,
    sourcemap: true,
    minify: true,
    format: 'iife',
    outdir: path.join(__dirname, '../web'),
    metafile: true,
}, false, 'dist/web-worker.json');

build({
    entryPoints: ['src/xml2docx-web.tsx'],
    bundle: true,
    sourcemap: true,
    minify: true,
    format: 'iife',
    outdir: path.join(__dirname, '../web'),
    metafile: true,
    loader: {
        '.ttf': 'file',
        '.svg': 'file',
        '.woff': 'file',
        '.woff2': 'file',
        '.eot': 'file',
    },

}, true, 'dist/web-main.json');

/**
 * @param {import ('esbuild').BuildOptions} opts
 */
async function build(opts, startServer, metaFileName) {
    /** @type {'s'| 'w'| ''} */
    let mode = (process.argv[2] || '').substring(0, 1).toLowerCase();
    let ctx = await esbuild.context(opts);
    if (startServer && mode === 's') {
        let result = await ctx.serve({
            host: '127.0.0.1',
            port: 8080,
            servedir: path.join(__dirname, '../web'),
        });
        console.log('Server running on:');
        console.log(`    http://${result.host}:${result.port}/`);
    } else if (mode !== '') {
        await ctx.watch();
    } else {
        let result = await ctx.rebuild();
        if (result.errors.length > 0) {
            console.error(result.errors);
        }
        if (result.warnings.length > 0) {
            console.error(result.warnings);
        }
        if (!result.errors.length && !result.warnings.length) {
            console.log('Build done.');
        }
        ctx.dispose();
        if (!mode && metaFileName) {
            fs.mkdirSync(path.dirname(metaFileName), { recursive: true });
            fs.writeFileSync(metaFileName, JSON.stringify(result.metafile, null, 4));
        }
    }
}

/**
 * Remove a directory and all its contents.
 * @param {string} _dirPath
 * @param {(filename: string) => boolean} [keep]
 */
function removeDir(_dirPath, keep) {
    if (typeof keep === 'undefined') {
        keep = () => false;
    }
    const dirPath = path.join(__dirname, '..', _dirPath);
    if (!fs.existsSync(dirPath)) {
        return;
    }
    rmDir(dirPath, _dirPath);
    console.log(`Deleted ${_dirPath}`);

    /**
     * @param {string} dirPath
     * @param {string} relativeDirPath
     * @returns {boolean}
     */
    function rmDir(dirPath, relativeDirPath) {
        let keepsFiles = false;
        const entries = fs.readdirSync(dirPath);
        for (const entry of entries) {
            const filePath = path.join(dirPath, entry);
            const relativeFilePath = path.join(relativeDirPath, entry);
            if (keep(relativeFilePath)) {
                keepsFiles = true;
                continue;
            }
            if (fs.statSync(filePath).isFile()) {
                fs.unlinkSync(filePath);
            } else {
                keepsFiles = rmDir(filePath, relativeFilePath) || keepsFiles;
            }
        }
        if (!keepsFiles) {
            fs.rmdirSync(dirPath);
        }
        return keepsFiles;
    }
}
