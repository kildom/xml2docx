import fs from 'node:fs';
import path from 'node:path';
import * as yaml from 'yaml';
import { z } from 'zod';
import * as docx from 'docx';
import * as customEnums from '../../src/enums';
import { cloneWithRefs, isDirectExecution } from '../utils';
import { parseDocsInput, YamlAttribute, YamlDocs, YamlEnum, YamlExample, YamlGroup, YamlTag, YamlToc, TocItemsSchemaType } from './parse-yaml';

/*

The file is responsible for parsing raw input (from "parse-yaml.ts") and produces a data structure
that is fully validated, reference-resolved, and ready for generating documentation from it.

*/

export interface DocsExample {
    type: 'example';
    brief: string;                 ///< Example title
    details: string;               ///< Example details
    code: string;                  ///< Example code
}

export interface DocsAttribute {
    type: 'attribute';
    yaml: YamlAttribute;           ///< The original YAML attribute object
    name: string;                  ///< Attribute name
    value: string;
    required: boolean;
    brief: string;
    details: string;
    experimental: boolean;
    examples: DocsExample[];
    validation: string;
};


export interface DocsTag {
    type: 'tag';
    yaml: YamlTag;                 ///< The original YAML tag object
    name: string;                  ///< Tag name, e.g. "p", "h1", "table", etc.
    location: string;              ///< Location: file and top-level item name
    children: DocsTag[];           ///< List of child tags
    implicit?: DocsTag;            ///< Implicit wrapper tag
    allChildren: DocsTag[];        ///< List of all child tags also available over implicit wrapper tag
    parents: DocsTag[];            ///< List of parent tags (if any)
    allParents: DocsTag[];         ///< List of all parent tags also available over implicit wrapper tag
    brief: string;                 ///< Brief description
    details: string;               ///< Detailed description (custom page content if customPage is true)
    attributes: Record<string, DocsAttribute>;   ///< Tag attributes
    customPage: boolean;           ///< If true, this tag shows a custom page instead of generated content
    aliasOf?: {                    ///< This tag is an alias of another tag
        tag: DocsTag;              ///< The tag that this tag is an alias of
        text: string;              ///< The alias information text
    };
    aliases: DocsTag[];            ///< List of tags that are aliases of this tag
    examples: DocsExample[];       ///< List of examples for this tag
    inGroup?: DocsGroup;           ///< A visible group that this tag belongs to (if any)
    hidden: boolean;               ///< If true, this tag is hidden from the documentation (e.g., internal tags)
};

export interface DocsGroup {
    type: 'group';
    yaml: YamlGroup;               ///< The original YAML group object
    name: string;                  ///< Group name
    location: string;              ///< Location: file and top-level item name
    brief: string;                 ///< Brief description
    tags: DocsTag[];               ///< List of tags in this group
    hidden: boolean;               ///< If true, this group is hidden from the documentation (e.g., internal groups)
};

export interface DocsPage {
    type: 'page';
    name: string;                  ///< Page name, e.g. "index", "getting-started", etc.
    location: string;              ///< Location: file and top-level item name
    text: string;                  ///< Page content in Markdown format
};

export interface DocsEnum {
    type: 'enum';
    yaml: YamlEnum;                 ///< The original YAML enum object
    name: string;                   ///< Enum name
    location: string;               ///< Location: file and top-level item name
    values: Record<string, string>; ///< Enum values and their descriptions
};

export interface DocsTocItem {
    type: 'tag' | 'page' | 'none';
    title: string;                    ///< TOC item title
    link: DocsTag | DocsPage | null;  ///< The tag or page that this TOC item links to (if any)
    section: string;                  ///< Section name in the page (empty if none)    
    children: DocsTocItem[];          ///< Nested TOC items (if any)
    collapse: boolean;                ///< If true, this TOC item is collapsed by default
    expandOn: (DocsPage | DocsTag)[]; ///< If specified, this TOC item will expand for any of the listed objects
};

export interface DocsToc {
    type: 'toc';
    name: string;          ///< TOC name
    location: string;      ///< Location: file and top-level item name
    items: DocsTocItem[];  ///< TOC items
};

export interface Docs {
    tags: Record<string, DocsTag>;
    pages: Record<string, DocsPage>;
    groups: Record<string, DocsGroup>;
    enums: Record<string, DocsEnum>;
    tocs: Record<string, DocsToc>;
};


export function parseDocs(): Docs {

    let yaml = parseDocsInput();

    let result: Docs = {
        tags: {},
        pages: {},
        groups: {},
        enums: {},
        tocs: {},
    };

    function parseExamples(examples?: YamlExample[]): DocsExample[] {
        if (!examples || examples.length === 0) {
            return [];
        }

        let result: DocsExample[] = [];

        for (let example of examples) {
            result.push({
                type: 'example',
                brief: example.brief,
                details: example.details || '',
                code: example.code,
            });
        }

        return result;
    }

    function getCombinedYamlTag(tagName: string): YamlTag {

        let base = yaml.tags[tagName];
        if (!base) {
            throw new Error(`Referenced tag "${tagName}" not found in YAML input.`);
        }

        if (!base.combine || base.combine.length === 0) {
            return base;
        }

        let list = [...base.combine.map(name => getCombinedYamlTag(name)), base];

        let result = list.shift()!;

        for (let combineTag of list) {
            result = {
                ...result,
                ...combineTag,
                attributes: {
                    ...result.attributes,
                    ...combineTag.attributes,
                },
            };
        }

        return result;
    }

    function getCombinedYamlAttribute(base: YamlAttribute): YamlAttribute {
        if (!base.type) {
            return base;
        }
        let type = yaml.types[base.type];
        if (!type) {
            throw new Error(`Referenced type "${base.type}" not found in YAML input.`);
        }
        return { ...getCombinedYamlAttribute(type), ...base };
    }

    function parseAttribute(attrName: string, attrYaml: YamlAttribute): DocsAttribute {

        attrYaml = getCombinedYamlAttribute(attrYaml);

        return {
            type: 'attribute',
            yaml: attrYaml,
            name: attrName,
            brief: attrYaml.brief || '',
            details: attrYaml.details || '',
            value: attrYaml.value || '',
            required: !!attrYaml.required,
            examples: parseExamples(attrYaml.examples),
            experimental: !!attrYaml.experimental,
            validation: attrYaml.validation || '',
        }
    }

    function getTagOrGroupTags(name: string): DocsTag[] {
        if (yaml.tags[name]) {
            return [getTag(name)];
        }
        if (!yaml.groups[name]) {
            throw new Error(`Referenced tag or group "${name}" not found in YAML input.`);
        }
        return yaml.groups[name].tags.map(childName => getTagOrGroupTags(childName)).flat();
    }

    function getTag(tagName: string): DocsTag {
        if (result.tags[tagName]) {
            return result.tags[tagName];
        }

        let tagYaml = getCombinedYamlTag(tagName);

        let tag: DocsTag = {
            type: 'tag',
            yaml: tagYaml,
            name: tagYaml['tag-name'],
            location: tagYaml.location,
            children: [],
            implicit: undefined,
            allChildren: [],
            parents: [],
            allParents: [],
            brief: tagYaml.brief || '',
            details: tagYaml['custom-page'] || tagYaml.details || '',
            attributes: {},
            customPage: tagYaml['custom-page'] ? true : false,
            examples: [],
            aliases: [],
            aliasOf: undefined,
            inGroup: undefined,
            hidden: tagYaml['tag-name'].startsWith('-'),
        };

        result.tags[tagName] = tag;

        tag.children = (tagYaml.children || []).map(childName => getTagOrGroupTags(childName)).flat();
        tag.implicit = tagYaml.implicit ? getTag(tagYaml.implicit) : undefined;
        if (tag.implicit && !tag.children.includes(tag.implicit)) {
            tag.children.push(tag.implicit);
        }
        tag.attributes = Object.fromEntries(
            Object.entries(tagYaml.attributes || {})
                .map(([key, value]) => [key, parseAttribute(key, value)])
        );
        tag.examples = parseExamples(tagYaml.examples);

        if (tagYaml['alias-of']) {
            let aliasOfTag = getTag(tagYaml['alias-of']);
            tag.aliasOf = {
                tag: aliasOfTag,
                text: tagYaml['alias-text'] || '',
            };
            aliasOfTag.aliases.push(tag);
        }

        return tag;
    }

    function parseTags() {
        for (let tagName of Object.keys(yaml.tags)) {
            getTag(tagName);
        }
    }

    function resolveTagsRelations() {

        let visited: Set<string> = new Set();
        function findAllChildren(tag: DocsTag) {
            if (visited.has(tag.name)) {
                return;
            }
            visited.add(tag.name);
            tag.allChildren = [...tag.children];
            if (tag.implicit) {
                findAllChildren(tag.implicit);
                tag.allChildren = [...tag.allChildren, ...tag.implicit.allChildren];
            }
            for (let child of tag.children) {
                child.parents.push(tag);
            }
            for (let child of tag.allChildren) {
                child.allParents.push(tag);
            }
        }

        for (let tag of Object.values(result.tags)) {
            findAllChildren(tag);
        }

        for (let tag of Object.values(result.tags)) {
            tag.children = [...new Set(tag.children)].filter(x => !x.name.startsWith('-'));
            tag.allChildren = [...new Set(tag.allChildren)].filter(x => !x.name.startsWith('-'));
            tag.parents = [...new Set(tag.parents)].filter(x => !x.name.startsWith('-'));
            tag.allParents = [...new Set(tag.allParents)].filter(x => !x.name.startsWith('-'));
        }
    }

    function parsePages() {
        for (let page of Object.values(yaml.pages)) {
            result.pages[page['page-name']] = {
                type: 'page',
                name: page['page-name'],
                location: page['location'],
                text: page['text'],
            };
        }
    }

    function parseGroup(groupYaml: YamlGroup) {
        let group: DocsGroup = {
            type: 'group',
            yaml: groupYaml,
            name: groupYaml['group-name'],
            location: groupYaml.location,
            brief: groupYaml.brief || '',
            tags: (groupYaml.tags || []).map(tagName => getTagOrGroupTags(tagName)).flat(),
            hidden: groupYaml['group-name'].startsWith('-'),
        };
        result.groups[group.name] = group;
        if (!group.hidden) {
            for (let tag of group.tags) {
                if (tag.inGroup) {
                    throw new Error(`Tag "${tag.name}" is already in group "${tag.inGroup.name}", cannot add to group "${group.name}".`);
                }
                tag.inGroup = group;
            }
        }
    }

    function parseGroups() {
        for (let group of Object.values(yaml.groups)) {
            parseGroup(group);
        }
    }

    function getEnumFromSourceCode(enumName: string): Record<string, string> {
        let sourceEnum: Record<string, string> | undefined = undefined;
        if (enumName.startsWith('docx.')) {
            sourceEnum = (docx as any)[enumName.slice('docx.'.length)];
        } else if (enumName.startsWith('enums.')) {
            sourceEnum = (customEnums as any)[enumName.slice('enums.'.length)];
        }
        if (!sourceEnum) {
            throw new Error(`Referenced enum "${enumName}" not found in the source code.`);
        }
        let valueMap: Map<any, string> = new Map();
        let result: Record<string, string> = {};
        for (let [key, value] of Object.entries(sourceEnum)) {
            let keyNormalized = key.toLowerCase().replace(/[_ ]/g, '-');
            let desc = '';
            if (!valueMap.has(value)) {
                valueMap.set(value, keyNormalized);
            } else {
                desc = `Alias of \`${valueMap.get(value)}\`.`;
            }
            result[keyNormalized] = desc;
        }
        return result;
    }

    function getCombinedYamlEnum(enumName: string): YamlEnum {

        let base = yaml.enums[enumName];
        if (!base) {
            throw new Error(`Referenced enum "${enumName}" not found in YAML input.`);
        }

        if (!base.values) {
            base.values = getEnumFromSourceCode(enumName);
        }

        if (!base.combine || base.combine.length === 0) {
            return base;
        }

        let list = [...base.combine.map(name => getCombinedYamlEnum(name)), base];

        let result = list.shift()!;

        for (let combineEnum of list) {
            result = {
                ...result,
                ...combineEnum,
                values: {
                    ...result.values,
                    ...combineEnum.values,
                },
            };
        }

        return result;
    }

    function parseEnum(enumYaml: YamlEnum) {
        enumYaml = getCombinedYamlEnum(enumYaml['enum-name']);

        let enumObj: DocsEnum = {
            type: 'enum',
            yaml: enumYaml,
            name: enumYaml['enum-name'],
            location: enumYaml.location,
            values: Object.fromEntries(
                Object.entries(enumYaml.values || {}).map(([key, value]) => [key, value || ''])
            ) || {},
        };
        result.enums[enumObj.name] = enumObj;
    }

    function parseEnums() {
        for (let enumYaml of Object.values(yaml.enums)) {
            parseEnum(enumYaml);
        }
    }

    function parseTocLink(link: string, title?: string): DocsTocItem {
        link = link.trim();
        let m: RegExpMatchArray | null;
        if ((m = link.match(/^(<([a-z0-9._-]+)\/?>)$/i))) {
            let tagName = m[2];
            if (!result.tags[tagName]) {
                throw new Error(`Tag "${tagName}" referenced from TOC not found in the parsed tags.`);
            }
            return {
                type: 'tag',
                title: m[1],
                link: result.tags[tagName],
                section: '',
                children: [],
                collapse: false,
                expandOn: [],
            };
        } else if ((m = link.match(/^([a-z0-9._-]+?).md(?:#(.+))?$/i))) {
            let pageName = m[1];
            let section = m[2] || '';
            let page = result.pages[pageName];
            if (!page) {
                throw new Error(`Page "${pageName}" referenced from TOC not found in the parsed pages.`);
            }
            return {
                type: 'page',
                title: title || pageName,
                link: page,
                children: [],
                section: section,
                collapse: false,
                expandOn: [],
            };
        } else {
            throw new Error(`Invalid TOC link "${link}". Must be a tag name in angle brackets (e.g., <tag>) or a page name with optional section (e.g., page.md#section).`);
        }
    }

    function getTocYamlProperty(item: string | boolean | Record<string, string | boolean | TocItemsSchemaType>) {
        if (typeof item === 'object' &&
            Object.keys(item).length === 1 &&
            Object.keys(item)[0].startsWith('_')
        ) {
            return [Object.keys(item)[0].substring(1), Object.values(item)[0]];
        } else {
            return null;
        }
    }

    function parseTocItems(items: TocItemsSchemaType): [DocsTocItem[], Record<string, any>] {
        let result: DocsTocItem[] = [];
        let properties = Object.fromEntries(items
            .map(item => getTocYamlProperty(item))
            .filter(item => item) as any[]);
        for (let item of items.filter(item => !getTocYamlProperty(item))) {
            if (typeof item === 'boolean') {
                throw new Error(`Invalid TOC item: boolean values are not allowed here. Found: ${item}`);
            } else if (typeof item === 'string') {
                result.push(parseTocLink(item, undefined));
            } else if (Object.keys(item).length === 1 && typeof Object.values(item)[0] === 'string') {
                result.push(parseTocLink(Object.values(item)[0] as any, Object.keys(item)[0]));
            } else if (Object.keys(item).length === 1 && Array.isArray(Object.values(item)[0])) {
                let [items, childProperties] = parseTocItems(Object.values(item)[0] as any);
                let docsItem: DocsTocItem;
                if (childProperties.link) {
                    docsItem = parseTocLink(childProperties.link, Object.keys(item)[0]);
                } else {
                    docsItem = {
                        type: 'none',
                        title: Object.keys(item)[0],
                        link: null,
                        section: '',
                        children: [],
                        collapse: false,
                        expandOn: [],
                    };
                }
                docsItem.children = items;
                docsItem.collapse = !!childProperties.collapse;
                docsItem.expandOn = (childProperties.expandOn || []).map((link: string) => {
                    let tocItem = parseTocLink(link);
                    if (tocItem.type === 'tag' || tocItem.type === 'page') {
                        return tocItem.link!;
                    } else {
                        throw new Error(`Invalid TOC item in "expandOn": ${link}. Must be a tag or page.`);
                    }
                });
                result.push(docsItem);
            } else {
                throw new Error(`Invalid TOC item: ${JSON.stringify(item)}. Must be a string, an object with a single key-value pair, or an object with a single key and an array of child items.`);
            }
        }
        return [result, properties];
    }

    function parseTocs() {
        for (let toc of Object.values(yaml.tocs)) {
            let tocObj: DocsToc = {
                type: 'toc',
                location: toc.location,
                name: toc['toc-name'],
                items: parseTocItems(toc.items)[0],
            };
            result.tocs[tocObj.name] = tocObj;
        }
    }

    parseTags();
    resolveTagsRelations();
    parsePages();
    parseGroups();
    parseEnums();
    parseTocs();

    return result;
}


(typeof __RUN_SELF_TEST__ === 'boolean' ? __RUN_SELF_TEST__ : isDirectExecution(import.meta.url)) && (async () => {
    let util = await import('node:util');
    let docs = parseDocs();
    console.log(util.inspect(cloneWithRefs(docs), { depth: null, colors: false, compact: false }));
})();
