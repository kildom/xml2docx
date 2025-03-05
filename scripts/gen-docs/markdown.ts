
import * as showdown from 'showdown';
import showdownHighlight from 'showdown-highlight';

import { getEnum } from './parser';


let pluginsRegistered = false;

export function markdownToHtml(markdown: string, withParagraphs: boolean = true): string {

    if (!pluginsRegistered) {
        registerPlugins();
        pluginsRegistered = true;
    }

    let mdConverter = new showdown.Converter({
        extensions: [
            showdownHighlight({
                pre: true,
                auto_detection: true,
            }),
            'gitHubAlerts',
            'docs',
        ],
        ghCompatibleHeaderId: true,
        simplifiedAutoLink: true,
        tables: true,
    });
    let html = mdConverter.makeHtml(markdown) as string;

    if (withParagraphs) {
        return html;
    } else {
        return html
            .split(/<p>|<\/p>/)
            .map(x => x.trim())
            .filter(x => x.length > 0)
            .join('<br>');
    }
}

function registerPlugins() {

    showdown.extension('gitHubAlerts', function () {
        let ext1 = {
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
        let ext2 = {
            type: 'output',
            regex: /<div class="--gitHubAlert-begin-(\w+)">(.*?)<\/div>/g,
            replace: '<div class="gitHubAlert-$1"><div class="gitHubAlert-title">$2</div><div class="gitHubAlert-text">'
        };
        let ext3 = {
            type: 'output',
            regex: /<div class="--gitHubAlert-end"><\/div>/g,
            replace: '</div></div>'
        };
        return [ext1, ext2, ext3];
    });

    showdown.extension('docs', function () {
        let ext1 = {
            type: 'output',
            regex: /@conditional\s*\{(.*)\}/g,
            replace: '<span class="conditional"><span><span>$1</span></span>Conditionally required</span>',
        };
        let ext2 = {
            type: 'output',
            regex: /@(optional|required)/g,
            replace: (m0, text) => `<span class="${text}">${text[0].toUpperCase() + text.substring(1)}</span>`,
        };
        let ext3 = {
            type: 'lang',
            regex: /^(\s*)@enum\s*([a-zA-Z0-9_-]+)/gm,
            replace: (m0, prefix, text) => generateEnumMarkdown(text, prefix),
        };
        let tagLink = {
            type: 'lang',
            regex: /(`<([a-z._-]+)>`)/gi,
            replace: '[$1]($2.html)',
        };
        let attrLink = {
            type: 'lang',
            regex: /`([a-z._-]+)="(…|\.\.\.)?"`/gi,
            replace: '[`$1="…"`](#attr-$1)',
        };
        let tagAttrLink = {
            type: 'lang',
            regex: /`<([a-z._-]+) ([a-z._-]+)="(…|\.\.\.)?"`/gi,
            replace: '[`<$1 $2="…"`]($1.html#tag-$2)',
        };
        return [ext1, ext2, ext3, tagLink, attrLink, tagAttrLink];
    });


}


function generateEnumMarkdown(enumName: any, prefix: any) {
    let info = getEnum(enumName);
    let result = '';
    for (let [name, text] of Object.entries(info.values)) {
        if (text) {
            result += `${prefix}- \`${name}\` - ${text}\n`;
        } else {
            result += `${prefix}- \`${name}\`\n`;
        }
    }
    return result.trimEnd();
}
