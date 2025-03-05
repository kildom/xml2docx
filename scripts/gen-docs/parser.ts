import * as fs from 'node:fs';
import * as path from 'node:path';
import * as yaml from 'yaml';
import * as docx from 'docx';
import * as customEnums from '../../src/enums';

// #region Constants

const DOCS_DIR = 'docs/tags';

// #endregion


// #region Interfaces

export interface EnumDocs {
    name: string;
    values: Record<string, string>;
}

export interface AttributeDocs {
    name: string;
    value: string;
    required: boolean | string;
    brief: string;
    details: string;
    testCases: string[];
}

export interface TagDocs {
    name: string;
    customPage: string;
    children: TagDocs[];
    parents: TagDocs[];
    implicitChild?: TagDocs;
    indirectChildren: TagDocs[];
    indirectParents: TagDocs[];
    brief: string;
    details: string;
    attributes: Record<string, AttributeDocs>;
    testCases: string[];
}

export interface PageDocs {
    name: string;
    text: string;
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
    'custom-page'?: string;
    combine?: string[];
    children?: string[];
    implicit?: string;
    brief?: string;
    details?: string;
    attributes?: Record<string, AttributeYaml>;
    TC?: string[];
}

interface GroupYaml {
    'group-name': string;
    tags?: string[];
}

interface PageYaml {
    'page-name': string;
    text: string;
}

type TopLevelYaml = TypeYaml | EnumYaml | TagYaml | GroupYaml | PageYaml;

// #endregion


// #region Globals

const yamlElements: TopLevelYaml[] = [];
const enums: Record<string, EnumDocs> = {};
const tags: Record<string, TagDocs> = {};

// #endregion


// #region Parser

export function parse() {
    if (yamlElements.length) return;
    // Parse all files in the docs directory
    for (let file of fs.readdirSync(DOCS_DIR)) {
        let fullPath = path.join(DOCS_DIR, file);
        if (file.endsWith('.yaml')) {
            parseYaml(fullPath);
        } else if (file.endsWith('.md')) {
            parseMarkdown(fullPath);
        }
    }
    // Collect all indirect children from implicit tags (full nested hierarchy)
    for (let tagYaml of [...yamlElements.filter(x => ('tag-name' in x))]) {
        let tag = getTag(tagYaml['tag-name']);
        if (!tag.implicitChild) continue;
        collectIndirectChildren(tag);
    }
    // Remove from indirect children tags that are direct children
    for (let tagYaml of yamlElements.filter(x => ('tag-name' in x))) {
        let tag = getTag(tagYaml['tag-name']);
        if (!tag.implicitChild) continue;
        let done = new Set<TagDocs>(tag.children);
        let filtered: TagDocs[] = [];
        for (let child of tag.indirectChildren) {
            if (!done.has(child)) {
                done.add(child);
                filtered.push(child);
            }
        }
        tag.indirectChildren = filtered;
    }
    // Add parents and indirect parents references
    for (let tagYaml of yamlElements.filter(x => ('tag-name' in x) && !x['tag-name'].startsWith('-'))) {
        let tag = getTag(tagYaml['tag-name']);
        for (let child of tag.children) {
            child.parents.push(tag);
        }
        for (let child of tag.indirectChildren) {
            child.indirectParents.push(tag);
        }
    }
}

function parseMarkdown(fullPath: string) {
    yamlElements.push({
        'page-name': path.basename(fullPath, '.md'),
        text: fs.readFileSync(fullPath, 'utf-8')
    });
}

function parseYaml(fullPath: string) {
    const fileContent = fs.readFileSync(fullPath, 'utf-8');
    const parsedYaml = yaml.parse(fileContent) as TopLevelYaml[];
    yamlElements.push(...parsedYaml);
}

// #endregion


// #region Tags

export function getTags(): TagDocs[] {
    return Object.values(tags)
        .filter(x => !x.name.startsWith('-'));
}

function getTag(name: string, optional?: false): TagDocs;
function getTag(name: string, optional: true): TagDocs | undefined;
function getTag(name: string, optional?: boolean): TagDocs | undefined {

    if (name in tags) return tags[name];

    let tagYaml = yamlElements.find(x => 'tag-name' in x && x['tag-name'] === name) as TagYaml | undefined;
    if (!tagYaml) {
        if (optional) {
            return undefined;
        } else {
            throw new Error(`Tag ${name} not found`);
        }
    }

    let tagDocs: TagDocs = {
        name: name,
        customPage: '',
        children: [],
        parents: [],
        indirectChildren: [],
        indirectParents: [],
        attributes: {},
        brief: '',
        details: '',
        testCases: [],
    };

    tags[name] = tagDocs;

    for (let combinedName of tagYaml.combine ?? []) {
        let combined = getTag(combinedName);
        combineTagDocs(tagDocs, combined);
    }

    let attributes = Object.fromEntries(
        Object.entries(tagYaml.attributes ?? {})
            .map(([attrName, attrYaml]) => [attrName, convertAttribute(attrName, attrYaml)])
    ) as Record<string, AttributeDocs>;

    combineTagDocs(tagDocs, {
        name,
        customPage: tagYaml['custom-page'] ?? '',
        children: getGroupFromList(tagYaml.children) ?? [],
        parents: [],
        implicitChild: tagYaml.implicit ? getTag(tagYaml.implicit) : undefined,
        indirectChildren: [],
        indirectParents: [],
        attributes,
        brief: tagYaml.brief || '',
        details: tagYaml.details || '',
        testCases: tagYaml.TC || [],
    });

    return tagDocs;
}

function combineTagDocs(tagDocs: TagDocs, combined: TagDocs) {
    tagDocs.implicitChild = combined.implicitChild ?? tagDocs.implicitChild;
    tagDocs.customPage = combined.customPage || tagDocs.customPage;
    tagDocs.children.push(...combined.children);
    for (let [attrName, attr] of Object.entries(combined.attributes)) {
        tagDocs.attributes[attrName] = attr;
    }
    tagDocs.testCases.push(...combined.testCases);
    if (combined.brief) {
        tagDocs.brief = (tagDocs.brief + ' ' + combined.brief).trim();
    }
    if (combined.details) {
        tagDocs.details = (tagDocs.details + '\n\n' + combined.details).trim();
    }
}

function getGroup(groupName: string): TagDocs[] | undefined {
    let groupYaml = yamlElements.find(x => 'group-name' in x && x['group-name'] === groupName) as GroupYaml | undefined;
    return getGroupFromList(groupYaml?.tags);
}

function getGroupFromList(names: string[] | undefined): TagDocs[] | undefined {
    if (!names) {
        return undefined;
    }

    let groupTags: TagDocs[] = [];
    for (let tagName of names) {
        let tag = getTag(tagName, true);
        if (tag) {
            groupTags.push(tag);
        } else {
            let nestedGroupTags = getGroup(tagName);
            if (nestedGroupTags) {
                groupTags.push(...nestedGroupTags);
            } else {
                throw new Error(`Tag or group "${tagName}" not found.`);
            }
        }
    }

    return groupTags;
}

function collectIndirectChildren(tag: TagDocs) {
    if (!tag.implicitChild) return [];
    if (tag.indirectChildren.length > 0) return tag.indirectChildren;
    tag.indirectChildren.push(tag.implicitChild);
    tag.indirectChildren.push(...tag.implicitChild.children);
    collectIndirectChildren(tag.implicitChild);
    tag.indirectChildren.push(...tag.implicitChild.indirectChildren);
}

// #endregion


// #region Attributes

function convertAttribute(attrName: string, attr: AttributeYaml): AttributeDocs {
    let result: AttributeDocs = {
        name: attrName,
        value: attr.value || '',
        required: attr.required || false,
        brief: attr.brief || '',
        details: attr.details || '',
        testCases: attr.TC || []
    };
    if (attr.type) {
        let type = yamlElements.find(x => 'type-name' in x && x['type-name'] === attr.type);
        if (!type) throw new Error(`Type "${attr.type}" not found.`);
        let typeAttr = convertAttribute(attr.type, type as TypeYaml);
        if (typeAttr.value) result.value = (result.value + ' ' + typeAttr.value).trim();
        if (typeAttr.brief) result.brief = (result.brief + ' ' + typeAttr.brief).trim();
        if (typeAttr.details) result.details = (result.details + '\n\n' + typeAttr.details);
    }
    return result;
}

// #endregion


// #region Enums

export function getEnum(name: string): EnumDocs {

    if (name in enums) return enums[name];

    let enumYaml = yamlElements.find(x => x['enum-name'] === name) as EnumYaml | undefined;
    if (!enumYaml) {
        enumYaml = getDocxEnum(name);
    }

    let enumDocs: EnumDocs = {
        name: name,
        values: {},
    };

    enums[name] = enumDocs;

    if (enumYaml.combine?.length) {
        for (let combinedName of enumYaml.combine) {
            let combined = getEnum(combinedName);
            Object.assign(enumDocs.values, combined.values);
        }
    }

    if (enumYaml.values) {
        for (let [key, value] of Object.entries(enumYaml.values)) {
            if (value || !enumDocs.values[key]) {
                enumDocs.values[key] = value ?? '';
            }
        }
    }

    return enumDocs;
}

function getDocxEnum(enumName: string): EnumYaml {
    let enumObject = customEnums[enumName] as Record<string, string | number> | undefined;
    if (!enumObject) {
        enumObject = docx[enumName] as any;
        if (!enumObject) {
            throw new Error(`Enum ${enumName} not found`);
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
    for (let name of [...values]) {
        if (name.indexOf('-') < 0) continue;
        let normalized = name.replace(/-/g, '');
        values.delete(normalized);
    }
    let result: EnumYaml = {
        'enum-name': enumName,
        values: Object.fromEntries([...values].map(x => [x, ''])),
    };
    return result;
}

// #endregion


// #region Pages

export function getPages(): PageDocs[] {
    return yamlElements
        .filter(x => 'page-name' in x)
        .map(x => ({ name: x['page-name'], text: x.text }));
}

// #endregion
