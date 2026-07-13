import qre from "qre";
import { template } from 'underscore';
import { Docs, DocsAttribute, DocsEnum, DocsExample, DocsPage, DocsTag, parseDocs } from "./parse-docs";
import { lorem } from "../lorem";
import { cloneWithRefs, isDirectExecution } from '../utils';


/*

Preprocess the docs Markdown before generating output.
It does Markdown to Markdown transformations.
The following preprocessing steps are performed.

Render docs templates
=====================

The following template markers are used in the docs (different than DocTML to avoid conflicts):
 - <# ... #> - interpolate
 - <#! ... #> - evaluate
 - no escape marker is available, since template output is Markdown, not HTML/XML.

The following identifiers are available in the template:
 - ctx.docs - the docs data structure
 - ctx.tag - the current tag object being processed (if any)
 - ctx.attribute - the current attribute object being processed (if any)
 - ctx.enumerator - the current enum object being processed (if any)
 - ctx.page - the current page object being processed (if any)
 - ctx.userData - any additional user-provided context passed to preprocessDocs() function
 - lorem(options) - generate lorem ipsum text with the given options
 - enumerator(name, options) - get markdown for specified enum name and format options

Links substitution
==================

Links in Markdown are passed to callback to substitute them if needed.
Only markdown links are processed, not HTML links.
Normally docs uses the following format of links:
 - `filename.md` - link to the file in the docs directory
 - `filename.md#github-compatible-anchor` - link to the section in the file
 - Auto-reference links defined below.

Auto-reference links
====================

The following auto-reference links are available in the docs:
 - `<tag>` - link to the tag with the given name (tag must exist)
 - `<tag attr=""` - link to the attribute of tag different than the current tag (tag and attribute must exist)
 - `attr=""` - link to the attribute of the current tag (attribute must exist)

*/

interface EnumeratorOptions {
    indent?: number;
    collapse?: string;
    oneLine?: boolean;
};

class TemplateData {

    public renderedEnums: Record<string, DocsEnum> = {};
    public autoRefRegex: Record<string, RegExp> = {};
    public lorem = lorem;
    public data: Record<string, any> = {};

    constructor(
        public ctx: PreprocessContext
    ) { }

    enumerator(name: string, options?: EnumeratorOptions): string {

        options = options || {};
        options.indent = options.indent || 0;

        let enumObj = this.renderedEnums[name];
        
        if (!enumObj) {
            enumObj = this.ctx.docs.enums[name];
            if (!enumObj) {
                throw new Error(`Enumerator ${name} not found in tag ${this.ctx.tag?.name || '[none]'}, `+
                    `attribute ${this.ctx.attribute?.name || '[none]'}, page ${this.ctx.page?.name || '[none]'}`);
            }
            preprocessEnum(this, enumObj);
            this.renderedEnums[name] = enumObj;
        }

        let output = '';
        let indentStr = ' '.repeat(options.indent);
        let first = true;

        for (let [enumName, enumBrief] of Object.entries(enumObj.values)) {
            let lines = enumBrief.split(/\r?\n/).map(x => x.trim());
            // Remove leading and trailing empty lines
            for (let i = 0; i < 2; i++) {
                while (lines.length > 0 && lines[0] === '') {
                    lines.shift();
                }
                lines.reverse();
            }

            if (options.oneLine) {
                if (!first) {
                    output += ', ';
                }
                if (lines.length > 0) {
                    output += `\`${enumName}\` - ` + lines.join(` `);
                } else {
                    output += `\`${enumName}\``;
                }
            } else if (lines.length > 0) {
                output += `${indentStr}- \`${enumName}\` - ` + lines.join(`\n${indentStr}   `) + '\n';
            } else {
                output += `${indentStr}- \`${enumName}\`\n`;
            }

            first = false;
        }

        if (options.collapse) {
            output = `${indentStr}<details>\n` +
                `${indentStr}<summary>\n\n` +
                `${indentStr}${options.collapse}\n\n` +
                `${indentStr}</summary>\n\n` +
                `${indentStr}${output.trim()}\n\n` +
                `${indentStr}</details>`;
        }

        return output.trim();
    }
};

export interface PreprocessContext {
    options: PreprocessOptions;
    userData?: any;
    docs: Docs;
    tag?: DocsTag;
    attribute?: DocsAttribute;
    enumerator?: DocsEnum;
    page?: DocsPage;
};

export interface PreprocessOptions {
    substituteLink?: (ctx: PreprocessContext, link: string, text: string) => string | undefined;
    referenceTag?: (ctx: PreprocessContext, tag: DocsTag) => string;
    referenceAttribute?: (ctx: PreprocessContext, tag: DocsTag, attribute: DocsAttribute, value?: string) => string;
    templateData?: (ctx: PreprocessContext, tag?: DocsTag, attribute?: DocsAttribute, page?: DocsPage,
        enumObj?: DocsEnum) => Record<string, any>;
    userData?: any;
};



export function preprocessDocs(docs: Docs, options: PreprocessOptions = {}): void {
    options = { ...options };

    if (!options.substituteLink) {
        options.substituteLink = defaultSubstituteLink;
    }

    if (!options.referenceTag) {
        options.referenceTag = defaultReferenceTag;
    }

    if (!options.referenceAttribute) {
        options.referenceAttribute = defaultReferenceAttribute;
    }

    if (!options.templateData) {
        options.templateData = defaultTemplateData;
    }

    let ctx: PreprocessContext = {
        options,
        userData: options.userData,
        docs,
    };

    let templateData = new TemplateData(ctx);

    // Preprocess tags and attributes
    for (let tag of Object.values(docs.tags).filter(t => !t.hidden)) {
        templateData.ctx.tag = tag;
        templateData.data = templateData.ctx.options.templateData!(templateData.ctx, tag);
        tag.brief = preprocessMarkdown(templateData, tag.brief);
        tag.details = preprocessMarkdown(templateData, tag.details);
        if (tag.aliasOf) {
            tag.aliasOf.text = preprocessMarkdown(templateData, tag.aliasOf.text);
        }
        preprocessExamples(templateData, tag.examples);
        for (let attribute of Object.values(tag.attributes)) {
            templateData.ctx.attribute = attribute;
            templateData.data = templateData.ctx.options.templateData!(templateData.ctx, tag, attribute);
            attribute.brief = preprocessMarkdown(templateData, attribute.brief);
            attribute.details = preprocessMarkdown(templateData, attribute.details);
            attribute.validation = preprocessMarkdown(templateData, attribute.validation);
            attribute.value = preprocessMarkdown(templateData, attribute.value);
            preprocessExamples(templateData, attribute.examples);
            delete templateData.ctx.attribute;
        }
        delete templateData.ctx.tag;
    }
    // Preprocess pages
    for (let page of Object.values(docs.pages)) {
        templateData.ctx.page = page;
        templateData.data = templateData.ctx.options.templateData!(templateData.ctx, undefined, undefined, page);
        page.text = preprocessMarkdown(templateData, page.text);
        delete templateData.ctx.page;
    }
    // Preprocess enums (just reference them, they are preprocessed if referenced)
    for (let enumName of Object.keys(docs.enums)) {
        templateData.enumerator(enumName);
    }
}

function preprocessEnum(templateData: TemplateData, enumObj: DocsEnum): void {
    for (let [name, value] of Object.entries(enumObj.values)) {
        templateData.data = templateData.ctx.options.templateData!(templateData.ctx, undefined, undefined, undefined,
            enumObj);
        enumObj.values[name] = preprocessMarkdown(templateData, value);
    }
}

function preprocessExamples(templateData: TemplateData, examples: DocsExample[]): void {
    for (let example of examples) {
        example.brief = preprocessMarkdown(templateData, example.brief);
        example.details = preprocessMarkdown(templateData, example.details);
        example.code = renderTemplate(templateData, example.code);
    }
}


function preprocessMarkdown(templateData: TemplateData, input: string): string {
    let result = renderTemplate(templateData, input);
    result = substituteLinks(templateData, result);
    result = autoRefLinks(templateData, result);
    return result;
}

const autoRefRegex = qre.global.legacy`
    "\`"
    {
        "<"
        1: ("tag" or "names") // Converted to "tag|names" and will be replace with full list of tag names
        ">"
    } or {
        2: ("attr" or "names") // Converted to "attr|names" and will be replace with list of attributes of the current tag
        '="'
        optional ("…" or "..." or 3: repeat not ["\`])
        '"'
    } or {
        "<"
        4: ("tag attr" or "names") // Converted to "tag attr|names" and will be replace with list of all attributes
        '="'
        optional ("…" or "..." or 5: repeat not ["\`])
        '"'
        optional '>'
    }
    "\`"
`; // https://kildom.github.io/qre-web-demo/#2lVXbSsNAEPU5X7EsQltQobeX2Bb8BfEtDSRqaitVIU2qoA9+jR/ml3jOTHZTS2NqHkJyZmfnzJmZ3bREinm2uHh63Jzsl4/Vs5dBoDPDpdfZAsOfvWkxqxK6qgVsTjtPrHy8y1ugiSJ8+qHp2iJ9sGxw+5xCZdvj1OJw2CItTGLxYrjiQ43Q7t68rtasOevFkwH/xdIsoDBEAjMMHRyMONRRZxpVR8nDAxJIiyJvYcAlrRRcdC5e3ZYopXBZZuauzHEKFuTlQ3emtuN/fCt37ffnl5LBeMnHMHSdyd6LIGncq3epNtnLa1fkUSWy8GpXWpYdnytsdb7/T258THK/NunMqozrBkt8V8odhHZMghtkgk4OzTyZIKvZPAmuwNNh5Dy18D6AkttBA9kfNPCAp4VBibio8qNhGkxVrCZH0m6wkcwf5hZKchuJP8RT7fJsU64pnojo793dQT+DsOd4AmwUal2iKDrtx3EcaBAHDQht03WZYcYVGhJyDEKBRn6VeBIaE5IYSU+Zufta+e2Bu+xg+gE=

function createAutoRefRegex(docs: Docs, currentTag: DocsTag | undefined): RegExp {

    let regexPattern = autoRefRegex.source;
    let regexFlags = autoRefRegex.flags;

    let allTagNames = Object.entries(docs.tags)
        .filter(([name, tag]) => !tag.hidden)
        .map(([name, tag]) => name);
    regexPattern = regexPattern.replace('tag|names', allTagNames.join('|'));

    if (currentTag) {
        let allAttrNames = Object.keys(currentTag.attributes);
        regexPattern = regexPattern.replace('attr|names', allAttrNames.join('|'));
    } else {
        regexPattern = regexPattern.replace('attr|names', 'ThiSIsNoTATagSoNoAttr');
    }

    let allTagAttrPairs = [];

    for (let tag of Object.values(docs.tags)) {
        let pairs = Object.keys(tag.attributes)
            .map(attrName => `${tag.name} ${attrName}`);
        allTagAttrPairs.push(...pairs);
    }

    regexPattern = regexPattern.replace('tag attr|names', allTagAttrPairs.join('|'));

    return new RegExp(regexPattern, regexFlags);
}

function autoRefLinks(templateData: TemplateData, input: string): string {

    let tagName = templateData.ctx.tag?.name || '';
    let regex = templateData.autoRefRegex[tagName];

    if (!regex) {
        regex = createAutoRefRegex(templateData.ctx.docs, templateData.ctx.tag);
        templateData.autoRefRegex[tagName] = regex;
    }

    let result = input.replace(regex, (searchString, tagName, attrName, attrValue, tagAttrPair, pairValue) => {
        if (typeof tagName === 'string') {
            return templateData.ctx.options.referenceTag!(templateData.ctx, templateData.ctx.docs.tags[tagName]);
        } else if (typeof attrName === 'string') {
            return templateData.ctx.options.referenceAttribute!(
                templateData.ctx,
                templateData.ctx.tag!,
                templateData.ctx.tag!.attributes[attrName],
                attrValue);
        } else if (typeof tagAttrPair === 'string') {
            let [tagName, attrName] = tagAttrPair.split(' ');
            return templateData.ctx.options.referenceAttribute!(
                templateData.ctx,
                templateData.ctx.docs.tags[tagName],
                templateData.ctx.docs.tags[tagName].attributes[attrName],
                pairValue);
        } else {
            return searchString;
        }
    });
    return result;
}

const markdownLinkRegex = qre.global.legacy`
    "["
    1: lazy-at-least-1 {                                           // Text part
        ("\\", any)                                                // Escape in text
            or ("\`", lazy-repeat (("\\", any) or not "\`"), "\`") // Code block in text
            or not "]"                                             // Any other non-terminating character
    }
    "]("
    2: lazy-at-least-1 not ")"                                     // Link part: any non-terminating character
    ")"
`; // https://kildom.github.io/qre-web-demo/#2lVVNT8MwDOWcX1FFHBqpW7UdCxcECA4cuSWRUtasZf3ItHSCgfjv2MlayirYFqmt2jrPL/azDU5KO61X9uIwd5g6ekWIL5g63ZSZeWuewB7KX7/7dO6T2OWNoDwpp+45S4Iq/dhNBtH9PFa+vyv5GfIZQM9pHR6ukApBI4wnOwOqw7u3i3StsVxRKT0oLqx0KhRgO857YYRDf2CCUkArFvkHgt6CToOXyizKv4DdLknPZXvT7ALTFhoBml4I0CGDXiTO05ePugx92OfjsDsC7DQC4Bhz7MKe4MGPeAdconqZuIkA0lCE320hIu72YGRYtO3aJnGcwQe8coNTgE0Jt6bWggv5Y5NmdrkqbLZ0JoQLhTZcCvWfzaMG5b5aIYQKeCqBOIeG2+TDXbkxOcwC2BIzZO1Jb7TdVsjase/Hz0jyERxrAotgkhNoi9eXM+iKBGvIv87x1Zko5tG70eN9HHwceYD/3w==

function substituteLinks(templateData: TemplateData, input: string): string {
    let result = input.replace(markdownLinkRegex, (searchString, text, link) => {
        let newLink = templateData.ctx.options.substituteLink!(templateData.ctx, link, text) || link;
        if (!newLink) {
            return searchString;
        }
        return `[${text}](${newLink})`;
    });
    return result;
}

function renderTemplate(templateData: TemplateData, input: string): string {
    if (input.indexOf('<#') < 0) {
        return input;
    }
    let compiled: ReturnType<typeof template>;
    compiled = template(input, {
        evaluate: /<#!([\s\S]+?)#>/g,
        interpolate: /<#(?:=|[^!])([\s\S]+?)#>/g,
    });
    return compiled(templateData);
}

function defaultSubstituteLink(ctx: PreprocessContext, link: string): string | undefined {
    return undefined;
}

function defaultReferenceTag(ctx: PreprocessContext, tag: DocsTag): string {
    return `[\`&lt;${tag.name}&gt;\`](${tag.name}.md)`;
}

function defaultTemplateData(): Record<string, any> {
    return { };
}

function defaultReferenceAttribute(ctx: PreprocessContext, tag: DocsTag, attribute: DocsAttribute,
    value?: string): string {

    return `[\`&lt;${tag.name} ${attribute.name}="${value || '…'}"\`](${tag.name}.md#${attribute.name})`;
}

(typeof __RUN_SELF_TEST__ === 'boolean' ? __RUN_SELF_TEST__ : isDirectExecution(import.meta.url)) && (async () => {
    let util = await import('node:util');
    let docs = parseDocs();
    preprocessDocs(docs, {
        substituteLink(ctx, link, text) {
            return `----------LINK-${link}----------`;
        },
        referenceTag(ctx, tag) {
            return `----------TAG-${tag.name}----------`;
        },
        referenceAttribute(ctx, tag, attribute, value) {
            if (ctx.tag === tag) {
                return `----------ATTR-THIS-TAG-${attribute.name}="${value || '…'}"----------`;
            } else {
                return `----------ATTR-${tag.name}-${attribute.name}="${value || '…'}"----------`;
            }
        }
    });
    console.log(util.inspect(cloneWithRefs(docs), { depth: null, colors: false, compact: false }));
})();
