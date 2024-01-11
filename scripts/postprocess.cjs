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

const fs = require('node:fs');

let files = {
    'dist/xml2docx.cjs': fs.readFileSync('dist/xml2docx.cjs', 'utf-8'),
    'dist/xml2docx.cjs.map': fs.readFileSync('dist/xml2docx.cjs.map', 'utf-8'),
    'package.json': fs.readFileSync('package.json', 'utf-8'),
};

for (let file of fs.readdirSync('src')) {
    if (file.endsWith('.ts') || file.endsWith('.js')) {
        files[`src/${file}`] = fs.readFileSync(`src/${file}`, 'utf-8');
    }
}

for (let file of fs.readdirSync('scripts')) {
    if (file.endsWith('.ts') || file.endsWith('.js')) {
        files[`scripts/${file}`] = fs.readFileSync(`scripts/${file}`, 'utf-8');
    }
}

fs.writeFileSync('dist/map.js', `exports.files = ${JSON.stringify(files)};`);

let src = files['dist/xml2docx.cjs'].replace('(eaDsfsDe9f)', '("./map.js")');
fs.writeFileSync('dist/xml2docx.cjs', src);
