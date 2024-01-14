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

import * as fs from 'node:fs';
import * as child_process from 'node:child_process';
import { exec } from '../src/exec';
import { printError } from '../src/os';
import { setNodeJsOsInterface } from '../src/osNode';

async function main() {
    try {
        try {
            fs.mkdirSync('test/outputs');
        } catch (err) {
            // ignore this error
        }
        for (let file of fs.readdirSync('test/inputs')) {
            if (file.endsWith('.xml')) {
                let output = 'test/outputs/' + file.replace('.xml', '.docx');
                let data = 'test/inputs/data.json';
                if (fs.existsSync(`test/inputs/${file}.json`)) {
                    data = `test/inputs/${file}.json`;
                }
                if (process.argv[2] === '-win') {
                    let args: string[] = [];
                    let env = process.env;
                    if (process.platform !== 'win32') {
                        env = { ...process.env, NODE_SKIP_PLATFORM_CHECK: '1' };
                        args.push('wine', 'dist/xml2docx.exe');
                    } else {
                        args.push('dist/xml2docx.exe');
                    }
                    args.push('--debug', '-d', data, `test/inputs/${file}`, output);
                    let res = child_process.spawnSync(args[0], args.slice(1), { env, stdio: 'inherit' });
                    if (res.error) {
                        throw res.error;
                    } else if (res.status) {
                        throw new Error(`Process exit code ${res.status}`);
                    }
                } else if (!process.argv[2]) {
                    await exec({
                        input: `test/inputs/${file}`,
                        output,
                        data,
                        debug: true,
                    });
                } else {
                    throw new Error(`Unknown platform to test "${process.platform}"`);
                }

            }
        }
    } catch (err) {
        printError(err, true);
        process.exit(1);
    }
}

setNodeJsOsInterface();
main();
