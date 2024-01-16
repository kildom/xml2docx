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

import * as showdown from 'showdown';
import { template } from 'underscore';
const showdownHighlight = require('showdown-highlight');

showdown.extension('gitHubAlerts', function () {
    let myext1 = {
        type: 'lang',
        regex: /(?<!(?:^|\n)\s*>[^\n]*\r?\n)(?<=^|\n)(?<prefix>[ \t]*>)(?<type>[ \t]*\[!(?:NOTE|TIP|IMPORTANT|WARNING|CAUTION)\][ \t]*)(?<text>(?:\r?\n\k<prefix>.*?(?=\r?\n|$))+)/gsi,
        replace: (m0, prefix, type, text) => {
            let className = type.replace(/[^a-z]+/gi, '').toLowerCase();
            let title = className.substring(0, 1).toUpperCase() + className.substring(1);
            let res = `${prefix}<div class="--gitHubAlert-begin-${className}">${title}</div>${text}\n`
                + `${prefix}<div class="--gitHubAlert-end"></div>\n`;
            return res;
        }
    };
    let myext2 = {
        type: 'output',
        regex: /<div class="--gitHubAlert-begin-(\w+)">(.*?)<\/div>/g,
        replace: '<div class="gitHubAlert-$1"><div class="gitHubAlert-title">$2</div><div class="gitHubAlert-text">'
    };
    let myext3 = {
        type: 'output',
        regex: /<div class="--gitHubAlert-end"><\/div>/g,
        replace: '</div></div>'
    };
    return [myext1, myext2, myext3];
});


let docsDir = 'docs';
let webDir = 'web';
let markdownFiles: string[] = [];

try {
    markdownFiles = fs.readdirSync(docsDir);
} catch (err) {
    docsDir = `../${docsDir}`;
    markdownFiles = fs.readdirSync(docsDir);
}
let toc = markdownFiles.find(file => file === 'toc.md') as string;

let orderedFiles = [...fs.readFileSync(`${docsDir}/${toc}`, 'utf-8').matchAll(/\(([a-z0-9_/\\-]+\.md)[#)]/gi)].map(m => m[1]);
orderedFiles = Object.keys(Object.fromEntries(orderedFiles.map(x => [x, null])));
let tocText = convertMarkdown(toc);

markdownFiles = markdownFiles
    .filter(name => name.endsWith('.md'))
    .filter(name => name !== toc)
    .filter(name => fileSortKey(name) >= 0)
    .sort((a, b) => fileSortKey(a) - fileSortKey(b));

let markdownTexts = Object.fromEntries(markdownFiles.map(name => [name, convertMarkdown(name)]));

for (let file of fs.readdirSync(docsDir)) {
    if (file.indexOf('.template.') > 0) {
        let templateText = fs.readFileSync(`${docsDir}/${file}`, 'utf-8');
        let compiled = template(templateText);
        let output = compiled({ markdownTexts, tocText, fileNameToId });
        fs.writeFileSync(`${webDir}/${file.replace('.template.', '.')}`, output);
    }
}

function fileNameToId(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
}

function convertMarkdown(fileName: string): string {
    let markdown = fs.readFileSync(`${docsDir}/${fileName}`, 'utf-8');
    let mdConverter = new showdown.Converter({
        extensions: [
            showdownHighlight({
                pre: true,
                auto_detection: true,
            }),
            'gitHubAlerts',
        ],
        ghCompatibleHeaderId: true,
        //openLinksInNewWindow: true,
        prefixHeaderId: `${fileNameToId(fileName)}---`,
        simplifiedAutoLink: true,
    });
    let html = mdConverter.makeHtml(markdown);
    html = html
        .replace(/href="#(.*?)"/gi, (_, frag) => `href="#${fileNameToId(fileName)}---${frag}"`)
        .replace(/href="([a-z0-9_/\\-]+\.md)#(.*?)"/gi, (_, name, frag) => `href="#${fileNameToId(name)}---${frag}"`)
        .replace(/href="([a-z0-9_/\\-]+\.md)"/gi, (_, name) => `href="#${fileNameToId(name)}"`);
    return html;
}

function fileSortKey(fileName: string): number {
    for (let i = 0; i < orderedFiles.length; i++) {
        if (fileName === orderedFiles[i]) {
            return i;
        }
    }
    return -1;
}
