import * as docx from "docx";
import { CData, Element, Text, TextProcessing, XMLError, processText } from "./xml";
import { IPropertiesOptions } from "docx/build/file/core-properties";
import { FileChild } from "docx/build/file/file-child";

class State {

    constructor(
        public runOptions: docx.IRunOptions = {}
    ) {
    }

    public copy(runOptionsChanges: docx.IRunOptions): State {
        return new State({ ...this.runOptions, ...runOptionsChanges });
    }
};

function createFromText(state: State, text: string) {
    let options: docx.IRunOptions = { ...state.runOptions, text };
    return [new docx.TextRun(options)];
}

function createCDataObject(state: State, child: CData) {
    return createFromText(state, child.cdata);
}

function createTextObject(state: State, child: Text) {
    return createFromText(state, child.text);
}

function extractName(input: string | Element) {
    if (typeof(input) !== 'string') input = input.name;
    return input.split(':')[0];
}

function getAttributes(state: State, element: Element) {
    let ref: { [key: string]: any } = {};
    let obj: { [key: string]: any } = {};
    for (let [key, value] of Object.entries({ ...(element.attributes || {}) })) {
        obj[extractName(key)] = filter(key, value);
    }
    return obj;
}

function filter(filters: string[] | string, value: any): any {
    return value; // TODO: filters
}

function checkNoAttributes(element: Element)
{
    if (Object.keys(element.attributes || {}).length != 0) {
        throw new XMLError(element, 'This element cannot have attributes.');
    }
}

function parseXMLValueNotation(state: State, element: Element, name: string = element.name) {
    let filters = name.split(':');
    name = filters.shift() as string;

    if (filters.at(-1) === '_') { // TODO: filter that takes first item from array: <some:first:_><p>Text</p></some:first:_> - assign paragraph to "some" property.
        filters.pop();
        let attributes = getAttributes(state, element);
        let skipSpaces = attributes['skip-spaces'] || attributes['skipSpaces'];
        if (skipSpaces === undefined) skipSpaces = 'true';
        let objects = getObjects(state, element, filter(':bool', skipSpaces));
        return filter(filters, objects);
    }
    // TODO: filter that returns empty array and checks if content is empty: <arr:emptyArray/>
    // TODO: filter that returns empty object and checks if content is empty: <obj:emptyObject/>

    let children = element.elements || [];
    let result: any;

    if (children.length == 1 && children[0].type === 'text') {

        checkNoAttributes(element);
        result = children[0].text;

    } else if (children.length == 1 && children[0].type === 'cdata') {

        checkNoAttributes(element);
        result = children[0].cdata;

    } else {

        children = processText(children, TextProcessing.IGNORE_SPACES);

        if (children.length == 0 && Object.keys(element.attributes || {}).length == 0) {

            result = '';

        } else if (children.length > 0 && children[0].type === 'element' && extractName(children[0]) === '_') {

            checkNoAttributes(element);
            let arr: any[] = [];
            for (let child of children) {
                if (child.type === 'element' && extractName(child.name) === '_') {
                    let value = parseXMLValueNotation(state, child);
                    arr.push(value);
                } else {
                    throw new XMLError(child, 'Expecting only items in array.');
                }
            }
            result = arr;

        } else {

            let obj = getAttributes(state, element);
            for (let child of children) {
                if (child.type == 'element') {
                    let value = parseXMLValueNotation(state, child);
                    obj[extractName(child)] = value;
                } else {
                    throw new XMLError(child, 'Expecting only elements.');
                }
            }
            result = obj;
        }
    }

    return filter(filters, result);
}

function getProperties(state: State, element: Element): { [key: string]: any } {
    let result: { [key: string]: any } = {};
    for (let child of element.elements || []) {
        if (child.type === 'element') {
            let names = child.name.split(':');
            if (names.length > 1 && names.at(-1) == 'property') {
                result[names[0]] = parseXMLValueNotation(state, child, names.slice(0, names.length - 1).join(':'));
            }
        }
    }
    return result;
}

function getObjects(state: State, container: Element, skipSpaces: boolean): any[] {

    let result: any[] = [];
    let children = container.elements || [];

    if (skipSpaces) {
        children = processText(children, TextProcessing.IGNORE_SPACES);
    }

    for (let child of children) {
        if (child.type === 'instruction') {
            throw new XMLError(child, 'Unexpected XML instruction.');
        } else if (child.type === 'text') {
            result.push(...createTextObject(state, child));
        } else if (child.type === 'cdata') {
            result.push(...createCDataObject(state, child));
        } else {
            let names = child.name.split(':');
            if (names.length < 2 || names.at(-1) !== 'property') {
                result.push(...createElementObject(state, child));
            }
        }
    }

    return result;
}

function enumValueNormalize(text: string) {
    return text.toLowerCase().replace(/[_-]/g, '');
}


function fromEnum(src: Element, value: string | undefined, enumValue: any, aliases?: { [key: string]: string }) {
    if (value === undefined) return undefined;
    // By Enum key
    if (enumValue[value] !== undefined) return enumValue[value];
    // By Enum value
    if (Object.values(enumValue).indexOf(value) >= 0) return value;
    // By Alias
    if (aliases && aliases[value] != undefined) return aliases[value];
    // By Enum key (normalized)
    let valueNorm = enumValueNormalize(value);
    let index = Object.keys(enumValue).map(enumValueNormalize).indexOf(valueNorm);
    if (index >= 0) return Object.values(enumValue)[index];
    // By Enum value (normalized)
    index = (Object.values(enumValue) as string[]).map(enumValueNormalize).indexOf(valueNorm);
    if (index >= 0) return Object.values(enumValue)[index];
    // By Alias (normalized)
    if (aliases) {
        let index = Object.keys(aliases).map(enumValueNormalize).indexOf(valueNorm);
        if (index >= 0) return Object.values(aliases)[index];
    }
    // Not found - error reporting
    let all = new Set(Object.values(enumValue));
    if (aliases) Object.keys(aliases).forEach(key => all.add(key));
    throw new XMLError(src, `Invalid enum value "${value}". Possible values: "${[...all].sort().join('", "')}"`);
}

const symbolInstance: unique symbol = Symbol('instance');

function simpleStyleChange(state: State, src: Element, styleChange: docx.IRunOptions) {
    state = state.copy(styleChange);
    let properties = getProperties(state, src);
    state = state.copy(properties);
    return getObjects(state, src, false);
}

const simpleBoolStyleTable: { [key: string]: string } = {
    'allCaps': 'allCaps',
    'all-caps': 'allCaps',
    'b': 'bold',
    'boldComplexScript': 'boldComplexScript',
    'bold-complex-script': 'boldComplexScript',
    'doubleStrike': 'doubleStrike',
    'double-strike': 'doubleStrike',
    'emboss': 'emboss',
    'imprint': 'imprint',
    'i': 'italics',
    'italics': 'italics',
    'italicsComplexScript': 'italicsComplexScript',
    'italics-complex-script': 'italicsComplexScript',
    'math': 'math',
    'noProof': 'noProof',
    'no-proof': 'noProof',
    'rightToLeft': 'rightToLeft',
    'right-to-left': 'rightToLeft',
    'smallCaps': 'smallCaps',
    'small-caps': 'smallCaps',
    'snapToGrid': 'snapToGrid',
    'snap-to-grid': 'snapToGrid',
    'specVanish': 'specVanish',
    'spec-vanish': 'specVanish',
    's': 'strike',
    'strike': 'strike',
    'sub': 'subScript',
    'subScript': 'subScript',
    'sub-script': 'subScript',
    'sup': 'superScript',
    'superScript': 'superScript',
    'super-script': 'superScript',
    'vanish': 'vanish',
};

class Tags {

    p(state: State, src: Element): any[] {
        let attributes = getAttributes(state, src);
        let properties = getProperties(state, src);
        let options: docx.IParagraphOptions = {
            children: getObjects(state, src, false),
            alignment: fromEnum(src, attributes.align, docx.AlignmentType, { justify: 'both' }),
        };
        return [new docx.Paragraph({ ...options, ...properties })]
    };

    u(state: State, src: Element): any[] {
        return this.underline(state, src);
    }

    underline(state: State, src: Element): any[] {
        let attributes = getAttributes(state, src);
        let change: docx.IRunOptions = {
            underline: {
                color: attributes.color,
                type: fromEnum(src, attributes.type, docx.UnderlineType),
            }
        }
        return simpleStyleChange(state, src, change);
    }

    document(state: State, src: Element): any[] {
        let attributes = getAttributes(state, src);
        let properties = getProperties(state, src);
        let sections: docx.ISectionOptions[] = [];
        let paragraphStyles: docx.IParagraphStyleOptions[] = [];
        let characterStyles: docx.ICharacterStyleOptions[] = [];
        let children: FileChild[] = [];
        let options: IPropertiesOptions = {
            sections: sections,
            title: attributes.title,
            subject: attributes.subject,
            creator: attributes.creator,
            keywords: attributes.keywords,
            description: attributes.description,
            lastModifiedBy: attributes.lastModifiedBy,
            // TODO: More properties
            styles: {
                paragraphStyles,
                characterStyles,
            },
            ...properties,
        }
        for (let obj of getObjects(state, src, true)) {
            if (obj[symbolInstance] === 'ISectionOptions') {
                sections.push(obj);
                children = obj.children;
            } else if (obj[symbolInstance] === 'IParagraphStyleOptions') {
                paragraphStyles.push(obj);
            } else if (obj[symbolInstance] === 'ICharacterStyleOptions') {
                characterStyles.push(obj);
            } else {
                if (sections.length === 0) {
                    children = [];
                    sections.push({ children });
                }
                children.push(obj);
            }
        }
        return [new docx.Document(options)]
    };

    fallbackTag(state: State, src: Element): any[] | null {
        if (simpleBoolStyleTable[src.name] !== undefined) {
            return simpleStyleChange(state, src, { [simpleBoolStyleTable[src.name]]: true });
        }
        return null;
    }
};

const tags = (new Tags()) as unknown as { [key: string]: (state: State, src: Element) => any[] };

function createTagObject(state: State, src: Element) {
    if (src.name in tags) {
        return (tags[src.name])(state, src);
    } else {
        return tags.fallbackTag(state, src);
    }
    return null;
}

function constructObject(state: State, src: Element, name: string, args: any) {
    let construct = (docx as any)[name];
    if (!construct || typeof construct !== 'function') {
        throw new XMLError(src, `Unknown tag "${name}".`);
    }
    return [new construct(...args)];
}

function createElementObject(state: State, src: Element) {

    let tag = createTagObject(state, src);
    if (tag !== null) {
        return tag;
    }

    let args = parseXMLValueNotation(state, src);

    if (typeof (args) !== 'object' || !(args instanceof Array)) {
        args = [args];
    }

    return constructObject(state, src, extractName(src.name), args);

}

export function translate(root: Element): docx.Document {
    let state = new State();
    return tags.document(state, root)[0] as docx.Document;
}
