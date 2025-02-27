import fs from 'node:fs';
import path from 'node:path';
import * as yaml from 'yaml';

import { template } from 'underscore';
import * as docx from 'docx';
import * as customEnums from '../../src/enums';

import * as showdown from 'showdown';
const showdownHighlight = require('showdown-highlight');


export function compileTemplate(input: string) {
    let compiled: ReturnType<typeof template>;
    compiled = template(input, {
        evaluate: /<%!([\s\S]+?)%>/g,
        interpolate: /<%=([\s\S]+?)%>/g,
        escape: /<%(?![!=])([\s\S]+?)%>/g
    });
    return compiled;
}

interface EnumInfo {
    name: string;
    values: Record<string, string>;
}

interface AttributeInfo {
    name: string;
    value: string;
    required: boolean | string;
    brief: string;
    details: string;
    testCases: string[];
}

interface TagInfo {
    name: string;
    brief: string;
    details: string;
    attributes: AttributeInfo[];
    testCases: string[];
}

interface EnumYaml {
    'enum-name': string;
    combine?: string[];
    values?: Record<string, string | null>;
}

interface AttributeYaml {
    value?: string;
    required?: boolean | string;
    brief?: string;
    details?: string;
    type?: string;
    TC?: string[];
}

interface TypeYaml extends AttributeYaml {
    'type-name': string;
}

interface TagYaml {
    'tag-name': string;
    brief?: string;
    details?: string;
    attributes?: Record<string, AttributeYaml>;
    TC?: string[];
}

type TopLevelYaml = TypeYaml | EnumYaml | TagYaml;


function convertTag(source: TopLevelYaml[], tag: TagYaml): TagInfo {
    const attributes: AttributeInfo[] = [];
    if (tag.attributes) {
        for (const [name, attr] of Object.entries(tag.attributes)) {
            attributes.push(convertAttribute(source, name, attr));
        }
    }

    return {
        name: tag['tag-name'],
        brief: tag.brief || '',
        details: tag.details || '',
        attributes,
        testCases: tag.TC || []
    };
}

function convertAttribute(source: TopLevelYaml[], name: string, attr: AttributeYaml): AttributeInfo {
    let result: AttributeInfo = {
        name,
        value: attr.value || '',
        required: attr.required || false,
        brief: attr.brief || '',
        details: attr.details || '',
        testCases: attr.TC || []
    };
    if (attr.type) {
        let type = source.find(x => 'type-name' in x && x['type-name'] === attr.type);
        if (!type) throw new Error(`Type not found: ${attr.type}`);
        let typeAttr = convertAttribute(source, attr.type, type as TypeYaml);
        if (typeAttr.value) result.value = (result.value + ' ' + typeAttr.value).trim();
        if (typeAttr.brief) result.brief = (result.brief + ' ' + typeAttr.brief).trim();
        if (typeAttr.details) result.details = (result.details + '\n\n' + typeAttr.details);
    }
    return result;
}

let source: TopLevelYaml[] = [];

async function main() {
    // Parse source YAML files
    source = [];
    for (let file of fs.readdirSync('docs/tags')) {
        if (!file.endsWith('.yaml')) continue;
        let fullPath = path.join('docs/tags', file);
        let arr = yaml.parse(fs.readFileSync(fullPath, 'utf-8')) as TopLevelYaml[] | TopLevelYaml;
        if (!Array.isArray(arr)) {
            arr = [arr];
        }
        source.push(...arr);
    }
    let output: TagInfo[] = [];
    for (let item of source) {
        if (!('tag-name' in item)) continue;
        let tag = item as TagYaml;
        output.push(convertTag(source, tag));
    }
    let template = compileTemplate(fs.readFileSync('scripts/gen-docs/templates/tag.html', 'utf-8'));
    for (let tag of output) {
        let text = template({ tag,
            markdownWithParagraphs: (text: string) => {
                return markdownWithParagraphs(text, source);
            },
            markdown: (text: string) => {
                return markdown(text, source);
            }
        });
        fs.writeFileSync(path.join('dist/docs', tag.name + '.html'), text);
    }
}

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
    let myext4 = {
        type: 'output',
        regex: /@conditional\s*\{(.*)\}/g,
        replace: '<span class="conditional"><span><span>$1</span></span>Conditionally required</span>',
    };
    let myext5 = {
        type: 'output',
        regex: /@(optional|required)/g,
        replace: (m0, text) => `<div class="${text}">${text[0].toUpperCase() + text.substring(1)}</div>`,
    };
    let myext6 = {
        type: 'lang',
        regex: /^(\s*)@enum\s*([a-zA-Z0-9_-]+)/gm,
        replace: (m0, prefix, text) => generateEnumMarkdown(text, prefix),
    };
    return [myext1, myext2, myext3, myext4, myext5, myext6];
});


function markdownWithParagraphs(markdown: string, source: TopLevelYaml[]): string {
    let mdConverter = new showdown.Converter({
        extensions: [
            showdownHighlight({
                pre: true,
                auto_detection: true,
            }),
            'gitHubAlerts',
        ],
        ghCompatibleHeaderId: true,
        //prefixHeaderId: `${fileNameToId(fileName)}---`,
        simplifiedAutoLink: true,
        tables: true,
    });
    let html = mdConverter.makeHtml(markdown);
    return html as string;
}

function markdown(markdown: string, source: TopLevelYaml[]) {
    return markdownWithParagraphs(markdown, source)
        .split(/<p>|<\/p>/)
        .map(x => x.trim())
        .filter(x => x.length > 0)
        .join('<br>');
}


function generateEnumMarkdown(enumName: any, prefix: any) {
    let info = getEnumInfo(enumName);
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

main();

function getEnumInfo(enumName: string) {
    let enumYaml = source.find(x => 'enum-name' in x && x['enum-name'] === enumName) as EnumYaml;
    if (!enumYaml) {
        return getTsEnumInfo(enumName);
    }
    let values: Record<string, string> = {};
    for (let subName of enumYaml.combine ?? []) {
        for (let [name, text] of Object.entries(getEnumInfo(subName).values)) {
            values[name] = text.trim();
        }
    }
    for (let [name, text] of Object.entries(enumYaml.values ?? {})) {
        if (values[name]) {
            values[name] = (values[name] + ' ' + (text ?? '')).trim();
        } else {
            values[name] = text?.trim() ?? '';
        }
    }
    let result: EnumInfo = {
        name: enumName,
        values: values,
    };
    return result;
}

function getTsEnumInfo(enumName: string) {
    let enumObject = customEnums[enumName] as Record<string, string | number> | undefined;
    if (!enumObject) {
        enumObject = docx[enumName] as any;
        if (!enumObject) {
            throw new Error(`Enum not found: ${enumName}`);
        }
    }
    let values = new Set<string>();
    for (let entry of Object.entries(enumObject)) {
        for (let name of entry) {
            if (typeof name !== 'string') continue;
            let prettyName = name
                .split(/[^a-zA-Z0-9]+|(?<=[a-z0-9])(?=[A-Z])|(?<=[a-zA-Z])(?=[0-9])|(?<=[0-9])(?=[a-z])/)
                .map(x => x.toLowerCase())
                .filter(x => x.length > 0)
                .join('-');
            values.add(prettyName);
        }
    }
    let result: EnumInfo = {
        name: enumName,
        values: Object.fromEntries([...values].map(x => [x, ''])),
    };
    return result;
}
