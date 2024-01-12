
import * as fs from 'node:fs';

import * as showdown from 'showdown';
import { template } from 'underscore';

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
let markdownFiles: string[] = [];

try {
    markdownFiles = fs.readdirSync(docsDir);
} catch (err) {
    docsDir = `../${docsDir}`;
    markdownFiles = fs.readdirSync(docsDir);
}
markdownFiles = markdownFiles
    .filter(name => name.endsWith('.md'))
    .sort((a, b) => a.startsWith('README') ? -1 : 1);
let markdownTexts = Object.fromEntries(markdownFiles.map(name => [name, convertMarkdown(name)]));

let templateText = fs.readFileSync(`${docsDir}/template.html`, 'utf-8');
let compiled = template(templateText);
let output = compiled({ markdownTexts, fileNameToId });

fs.writeFileSync(`${docsDir}/index.html`, output);

function fileNameToId(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
}

function convertMarkdown(fileName: string): string {
    let markdown = fs.readFileSync(`${docsDir}/${fileName}`, 'utf-8');
    let mdConverter = new showdown.Converter({
        extensions: ['gitHubAlerts'],
        ghCompatibleHeaderId: true,
        //openLinksInNewWindow: true,
        prefixHeaderId: `${fileNameToId(fileName)}---`,
        simplifiedAutoLink: true,
    });
    let html = mdConverter.makeHtml(markdown);
    html = html
        .replace(/href="#(.*?)"/gi, (_, frag) => `href="#${fileNameToId(fileName)}---${frag}"`)
        .replace(/href="([a-z0-9_/\\-]+\.md)#(.*?)"/gi, (_, name, frag) => `href="#${fileNameToId(name)}---${frag}"`);
    return html;
}
