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

import * as docx from 'docx';
import { CData, Element, Node, processSpaces, processSpacesInPlace, SpacesProcessing, Text } from '../xml';
import { AnyObject, Attributes, Dict, error, selectUndef, splitListValues } from '../common';
import { FileChild } from 'docx/build/file/file-child';
import { IPropertiesOptions } from 'docx/build/file/core-properties';
import { HighlightColor } from '../enums';

type ElementHandler = (ts: TranslatorState, element: Element) => any[];
type TextHandler = (ts: TranslatorState, text: Text) => any[];
type CDataHandler = (ts: TranslatorState, cdata: CData) => any[];
type NodeHandler = TextHandler | CDataHandler | ElementHandler;

class TranslatorState {

    format: TextFormat;

    public applyCommonAttributes(element: Element): TranslatorState {
        return this;
    }

    public fetchCommonAttributes(element: Element): TranslatorState {
        return this;
    }

    public applyFormat(format?: TextFormat): TranslatorState {
        if (!format) return this;
        let copy = new TranslatorState(this.baseDir, this.format);
        for (let [name, value] of Object.entries(format)) {
            (copy.format as any)[name] = value;
        }
        return copy;
    }

    public constructor(
        public baseDir: string,
        format: TextFormat = {}
    ) {
        this.format = { ...format };
    }

}


export function extractProperties(element: Element) {
    let children: Node[] = [];
    let properties: Dict<Element> = Object.create(null);
    for (let node of element.elements) {
        if (node.type === 'element' && node.name.endsWith(':property')) {
            node.name = node.name.substring(0, node.name.length - 9);
            properties[node.name] = node;
        } else {
            children.push(node);
        }
    }
    element.elements = children;
    element.properties = properties;
}


export function evaluateProperties(element: Element): AnyObject {
    let result: AnyObject = Object.create(null);
    extractProperties(element);
    for (let property of Object.values(element.properties)) {
        throw new Error('Not implemented');
    }
    return result;
}



export function normalizeElement(
    ts: TranslatorState, element: Element,
    spacesProcessing: SpacesProcessing
): [TranslatorState, Attributes, AnyObject] {

    // Extract and evaluate properties
    let properties = evaluateProperties(element);
    // Convert <group>...</group> to <group#begin>...<group#end>
    flattenGroups(element.elements);
    // Process spaces
    processSpacesInPlace(element.elements, spacesProcessing);
    // Common attributes handling
    let tsInner = ts
        .applyCommonAttributes(element) // Apply common attributes that belongs to this element and return state without them.
        .fetchCommonAttributes(element); // Fetch common attributes from this element to new state.
    return [tsInner, element.attributes, properties];
}

function flattenGroupsRet(nodes: Node[]): Node[] {
    let result: Node[] = [];
    for (let node of nodes) {
        if (node.type === 'element' && node.name === 'group') {
            let begin: Element = {
                type: 'element',
                name: 'group#begin',
                attributes: node.attributes,
                properties: {},
                elements: [],
                line: node.line,
                column: node.column,
            };
            let end: Element = {
                type: 'element',
                name: 'group#end',
                attributes: {},
                properties: {},
                elements: [],
                line: node.line,
                column: node.column,
            };
            result.push(begin, ...flattenGroupsRet(node.elements), end);
        } else {
            result.push(node);
        }
    }
    return result;
}

function flattenGroups(nodes: Node[]): void {
    let result = flattenGroupsRet(nodes);
    nodes.splice(0, nodes.length, ...result);
}

type HeadingLevelType = (typeof docx.HeadingLevel)[keyof typeof docx.HeadingLevel];

const headingTags: Dict<HeadingLevelType | undefined> = {
    'p': undefined,
    'h1': docx.HeadingLevel.HEADING_1,
    'h2': docx.HeadingLevel.HEADING_2,
    'h3': docx.HeadingLevel.HEADING_3,
    'h4': docx.HeadingLevel.HEADING_4,
    'h5': docx.HeadingLevel.HEADING_5,
    'h6': docx.HeadingLevel.HEADING_6,
    'title': docx.HeadingLevel.TITLE,
};

const avoidOrphansVarRegExp: RegExp[] = [];
const avoidOrphansFixedRegExp: RegExp[] = [];

export function textNode(ts: TranslatorState, text: Text | CData): docx.TextRun[] {

    let value = (text.type === 'text') ? text.text : text.cdata;

    if (ts.format.useVarWidthNoBreakSpace) {
        value = value.replace(/\xA0/g, '\uFEFF ');
    }

    if (ts.format.avoidOrphans && ts.format.avoidOrphans > 0) {
        let count = ts.format.avoidOrphans;
        if (ts.format.useVarWidthNoBreakSpace) {
            if (!avoidOrphansVarRegExp[count]) {
                avoidOrphansVarRegExp[count] = new RegExp(`(?<=(?:^|\\s)\\p{Letter}{1,${count}})(?=\\s|$)`, 'gmu');
            }
            value = value.replace(avoidOrphansVarRegExp[count], '\uFEFF');
        } else {
            if (!avoidOrphansFixedRegExp[count]) {
                avoidOrphansFixedRegExp[count] = new RegExp(`(?<=(?:^|\\s)\\p{Letter}{1,${count}})\\s+`, 'gu');
            }
            value = value.replace(avoidOrphansFixedRegExp[count], '\xA0');
        }
    }

    return [new docx.TextRun({
        ...ts.format,
        text: value,
    })];
}

export interface TextFormat extends docx.IRunOptions {
    avoidOrphans?: number;
    useVarWidthNoBreakSpace?: boolean;
}

const simpleBoolTagsTable: Dict<TextFormat> = {
    'allcaps': { allCaps: true },
    'b': { bold: true },
    'bold': { bold: true },
    'boldcomplexscript': { boldComplexScript: true },
    'doublestrike': { doubleStrike: true },
    'emboss': { emboss: true },
    'imprint': { imprint: true },
    'i': { italics: true },
    'italics': { italics: true },
    'italicscomplexscript': { italicsComplexScript: true },
    'math': { math: true },
    'noproof': { noProof: true },
    'righttoleft': { rightToLeft: true },
    'smallcaps': { smallCaps: true },
    'snaptogrid': { snapToGrid: true },
    'specvanish': { specVanish: true },
    's': { strike: true },
    'strike': { strike: true },
    'sub': { subScript: true },
    'subscript': { subScript: true },
    'sup': { superScript: true },
    'super': { superScript: true },
    'superscript': { superScript: true },
    'u': { underline: { type: docx.UnderlineType.SINGLE } },
    'underline': { underline: { type: docx.UnderlineType.SINGLE } },
    'vanish': { vanish: true },
    'span': {},
    'font': {},
    'avoidorphans': { avoidOrphans: 1 },
};

type CaptureChildren = (children: any) => void;

export function vwnbspTag(ts: TranslatorState, element: Element): docx.TextRun[] {

    if (element.elements.length > 0) {
        return fontTag(ts.applyFormat({ useVarWidthNoBreakSpace: true }), {
            ...element,
            name: 'font',
        });
    } else {
        return [new docx.TextRun({
            ...ts.format,
            text: '\uFEFF ',
        })];
    }
}


const paragraphContextTags = {
    ...Object.fromEntries(Object.keys(simpleBoolTagsTable).map(tag => [tag, fontTag])),
    'vwnbsp': vwnbspTag,
    '#text': textNode,
    '#cdata': textNode,
};

class ConvertError extends Error { }
type _ConverterVariantsHelper<T> = (def?: T) => void;

function converterVariants<T extends (...args: any[]) => any>(
    func: T, globalDef: ReturnType<T> | ((...args: Parameters<T>) => ReturnType<T>)
) {
    let result: [
        (...args: [...Parameters<T>, ...Parameters<_ConverterVariantsHelper<ReturnType<T>>>]) => ReturnType<T>,
        (...args: Parameters<T>) => ReturnType<T>,
    ];
    result = [
        (...args: [...Parameters<T>, ...Parameters<_ConverterVariantsHelper<ReturnType<T>>>]) => {
            try {
                return func(...args);
            } catch (e) {
                if (!(e instanceof ConvertError)) throw e;
                error(e.message); // TODO: location based on current tag
                return args.length > func.length && args[func.length] !== undefined ? args[func.length] :
                    typeof globalDef === 'function' ? (globalDef as any)(...args) : globalDef;
            }
        },
        (...args: Parameters<T>) => {
            try {
                return func(...args);
            } catch (e) {
                return undefined;
            }
        }
    ];
    return result;
}

export const [convertUint, convertUintNoErr] = converterVariants((value: string | undefined) => {
    if (value === undefined) return undefined;
    let res = parseInt(value);
    if (res.toString() !== value) throw new ConvertError('Invalid integer value');
    if (res < 0) throw new ConvertError('Required non-negative integer value');
    if (res > 0x7FFFFFFF) throw new ConvertError('Integer value too large');
    return res;
}, 0);

export const [convertColor, convertColorNoErr] = converterVariants((value: string | undefined) => {
    if (value === undefined) return undefined;
    let text = ('' + value).trim().toLowerCase();
    let normalized = text.replace(/[^a-z]/g, '');
    if (colorTable[normalized] !== undefined) {
        return colorTable[normalized];
    }
    if (text.match(/^#[0-9a-f]{6}$/)) {
        return text;
    } else if (text.match(/^#[0-9a-f]{3}$/)) {
        return `#${text[1]}${text[1]}${text[2]}${text[2]}${text[3]}${text[3]}`;
    } else {
        throw new ConvertError(`Invalid color value "${text}".`);
    }
}, '#808080');

const enumMapCache = new Map<any, Dict<string | number>>();

function getEnumMap(enumValue: Dict<string | number>): Dict<string | number> {
    if (!enumMapCache.has(enumValue)) {
        let map: Dict<string | number> = Object.create(null);
        enumMapCache.set(enumValue, map);
        for (let entry of Object.entries(enumValue)) {
            let value = entry[1];
            for (let key of entry) {
                key = key.toString().replace(/[. _-]/g, '').toLowerCase();
                if (map[key] !== undefined && map[key] !== value) {
                    error(`Internal error: Ambiguous enum values for: ${key}`);
                }
                map[key] = value;
            }
        }
    }
    return enumMapCache.get(enumValue)!;
}

const [_convertEnum, _convertEnumNoErr] = converterVariants(
    (value: string | undefined, enumValue: Dict<string | number>, aliases?: Dict<string | number>) => {
        if (value === undefined) return undefined;
        value = value.replace(/[. _-]/g, '').toLowerCase();
        if (aliases && (value in aliases)) return aliases[value];
        let enumMap = getEnumMap(enumValue);
        if (value in enumMap) return enumMap[value];
        throw new ConvertError(`Invalid enum value "${value}" (allowed values: "${Object.keys(
            { ...enumMap, ...aliases }).join('", "')}")`);
    },
    (value: string | undefined, enumValue: Dict<string | number>) => {
        return Object.values(enumValue)[0];
    });


export function convertEnum<T extends Dict<string | number>>(
    value: string | undefined, enumValue: T, aliases?: Dict<string | number>, def?: string | number
): (T)[keyof T] {
    return _convertEnum(value, enumValue, aliases, def) as any;
}

export function convertEnumNoErr<T extends Dict<string | number>>(
    value: string | undefined, enumValue: T, aliases?: Dict<string | number>
): (T)[keyof T] {
    return _convertEnumNoErr(value, enumValue, aliases) as any;
}


/*>>>
@merge:simpleBoolStyleTable
*/
export function getIRunStylePropertiesOptions(attributes: Attributes, properties?: AnyObject): docx.IRunStylePropertiesOptions {
    let options: docx.IRunStylePropertiesOptions = {
        //* "type color" Text underline.
        //* * `type` - Underline type. @enum:UnderlineType|4
        //* * `color` - Underline color. @filterColor
        underline: splitListValues(attributes.underline, {
            type: value => convertEnumNoErr(value, docx.UnderlineType),
            color: value => convertColorNoErr(value),
        }),
        //* Text color. @@
        color: convertColor(attributes.color),
        //* Text kerning. @@
        kern: filterPositiveUniversalMeasure(attributes.kern, FilterMode.UNDEF),
        //* Position. @@
        position: filterUniversalMeasure(attributes.position, FilterMode.UNDEF),
        //* Font size. @@
        size: filterPositiveUniversalMeasure(attributes.size, FilterMode.UNDEF),
        //* Font name.
        font: attributes.font ||
            //* Alias of `font` attribute.
            attributes.face ||
            //* Alias of `font` attribute.
            attributes.family,
        //* Text Highlighting. @enum:HighlightColor
        highlight: convertEnum(attributes.highlight, HighlightColor),
        shading: selectUndef(attributes.background, {
            type: docx.ShadingType.SOLID,
            //* Background color. @@
            color: filterColor(attributes.background, FilterMode.UNDEF),
        }),
        //* Border around the text. @@
        border: getBorderOptions(attributes.border),
        //* Font scale. @@
        scale: filterUfloat(attributes.scale, FilterMode.UNDEF),
    };
    for (let [key, value] of Object.entries(attributes)) {
        if (simpleBoolStyleTable[key] !== undefined) {
            (options as any)[simpleBoolStyleTable[key]] = filterBool(value, FilterMode.EXACT);
        }
    }
    options = { ...options, ...properties };
    setTag(options, 'IRunStylePropertiesOptions');
    return removeShallowUndefined(options) as docx.IRunStylePropertiesOptions;
}

export function fontTag(ts: TranslatorState, element: Element, captureChildren?: CaptureChildren): docx.TextRun[] {

    let [tsInner, attributes, properties] = normalizeElement(ts, element, SpacesProcessing.PRESERVE);

    let format: TextFormat = {
        ...simpleBoolTagsTable[element.name],
        ...getIRunStylePropertiesOptions(attributes, properties),
        style: attributes.style,
        avoidOrphans: convertUint(attributes.avoidOrphans),
    };
    tsInner = tsInner.applyFormat(format);
    return translateNodes(tsInner, element.elements, paragraphContextTags);
}

export function pTag(ts: TranslatorState, element: Element, captureChildren?: CaptureChildren): docx.Paragraph[] {

    let [tsInner, attributes, properties] = normalizeElement(ts, element, SpacesProcessing.TRIM);

    let heading: HeadingLevelType | undefined = headingTags[element.name];
    let options: docx.IParagraphOptions = {
        //...getIParagraphPropertiesOptions(tr, attributes),
        children: translateNodes(tsInner, element.elements, paragraphContextTags),
        heading,
    };

    captureChildren?.(options.children); // TODO: For docx->doctml context switch (<...:doctml.p> tag)

    return [new docx.Paragraph({ ...options, ...properties })];
}


export class ObjectContainer {
    public constructor(
        public value: any,
        public type: 'ISectionOptions' | 'IParagraphStyleOptions' | 'ICharacterStyleOptions'
    ) { }
}

function documentTag(ts: TranslatorState, element: Element): docx.Document[] {

    let [tsInner, attributes, properties] = normalizeElement(ts, element, SpacesProcessing.IGNORE);

    addImplicitParagraphs(element.elements, [
        ...Object.keys(headingTags),
        'section', 'header', 'footer', 'table', 'p-style', 'font-style'
    ]);

    let list = translateNodes(tsInner, element.elements, {
        ...Object.fromEntries(Object.keys(headingTags).map(name => [name, pTag])),
    });

    let sections: docx.ISectionOptions[] = [];
    let paragraphStyles: docx.IParagraphStyleOptions[] = [];
    let characterStyles: docx.ICharacterStyleOptions[] = [];
    let children: FileChild[] = [];
    let options: IPropertiesOptions = {
        sections: sections,
        //* Title in document properties.
        title: attributes.title,
        //* Subject in document properties.
        subject: attributes.subject,
        //* Creator name in document properties.
        creator: attributes.creator,
        //* Keywords in document properties.
        keywords: attributes.keywords,
        //* Description in document properties.
        description: attributes.description,
        //* last-modified-by: Last modified by name in document properties.
        lastModifiedBy: attributes.lastmodifiedby,
        // TODO: More properties
        styles: {
            paragraphStyles,
            characterStyles,
        },
        ...properties,
    };
    for (let obj of list) {
        if (obj instanceof ObjectContainer) {
            if (obj.type === 'ISectionOptions') {
                sections.push(obj.value);
                children = obj.value.children;
            } else if (obj.type === 'IParagraphStyleOptions') {
                paragraphStyles.push(obj.value);
            } else if (obj.type === 'ICharacterStyleOptions') {
                characterStyles.push(obj.value);
            }
        } else {
            if (sections.length === 0) {
                children = [];
                sections.push({ children });
            }
            if ((obj instanceof docx.Header) || (obj instanceof docx.Footer)) {
                //addHeaderFooterToSection(sections.at(-1) as Mutable<docx.ISectionOptions>, obj);
            } else {
                children.push(obj);
            }
        }
    }
    return [new docx.Document(options)];

}


export function translate(root: Element, baseDir: string): docx.Document {

    let ts = new TranslatorState(baseDir);

    let list = translateNodes(ts, [root], {
        'document': documentTag,
    });

    return list[0];
}

export function translateNodes(ts: TranslatorState, nodes: Node[], tags: Dict<NodeHandler>): any[] {
    let result: any[] = [];
    let tsStack = [ts];

    for (let node of nodes) {
        if (node.type === 'text') {
            if (tags['#text']) {
                result.push(...(tags['#text'] as TextHandler)(tsStack.at(-1)!, node));
            } else {
                error('Text is not allowed in this context', node);
            }
        } else if (node.type === 'cdata') {
            if (tags['#cdata']) {
                result.push(...(tags['#cdata'] as CDataHandler)(tsStack.at(-1)!, node));
            } else {
                error('CDATA is not allowed in this context', node);
            }
        } else if (node.name === 'group#begin') {
            tsStack.push(tsStack.at(-1)!.fetchCommonAttributes(node));
        } else if (node.name === 'group#end') {
            tsStack.pop();
        } else if (tags[node.name]) {
            result.push(...(tags[node.name] as ElementHandler)(tsStack.at(-1)!, node));
        } else if (getDocxConstructor(node.name)) {
            //let constructor = getDocxConstructor(node.name);
            throw new Error('Not implemented');
        } else {
            error(`Unexpected tag '${node.name}'`, node);
        }
    }

    return result;
}

export function getDocxConstructor(name: string): any {
    if (!(name in docx)) return undefined;
    let construct = (docx as any)[name];
    if (typeof construct !== 'function') return undefined;
    return construct;
}

function addImplicitParagraphs(nodes: Node[], allowedTags: string[]): void {
    let result: Node[] = [];
    let allowed = new Set(allowedTags);
    let chunk: Node[] = [];
    for (let i = 0; i <= nodes.length; i++) {
        let node = nodes[i];
        if (node && (node.type !== 'element'
            || !(allowed.has(node.name) || getDocxConstructor(node.name) || node.name.startsWith('group#')))
        ) {
            chunk.push(node);
        } else {
            if (chunk.length > 0) {
                let paragraph: Element = {
                    type: 'element',
                    name: 'p',
                    attributes: {},
                    properties: {},
                    elements: chunk,
                    line: chunk[0].line,
                    column: chunk[0].column,
                };
                chunk = [];
                result.push(paragraph);
            }
            if (node) {
                result.push(node);
            }
        }
    }
    nodes.splice(0, nodes.length, ...result);
}


const colorTable: Dict<string> = {
    'aliceblue': '#F0F8FF',
    'antiquewhite': '#FAEBD7',
    'aqua': '#00FFFF',
    'aquamarine': '#7FFFD4',
    'azure': '#F0FFFF',
    'beige': '#F5F5DC',
    'bisque': '#FFE4C4',
    'black': '#000000',
    'blanchedalmond': '#FFEBCD',
    'blue': '#0000FF',
    'blueviolet': '#8A2BE2',
    'brown': '#A52A2A',
    'burlywood': '#DEB887',
    'cadetblue': '#5F9EA0',
    'chartreuse': '#7FFF00',
    'chocolate': '#D2691E',
    'coral': '#FF7F50',
    'cornflowerblue': '#6495ED',
    'cornsilk': '#FFF8DC',
    'crimson': '#DC143C',
    'cyan': '#00FFFF',
    'darkblue': '#00008B',
    'darkcyan': '#008B8B',
    'darkgoldenrod': '#B8860B',
    'darkgray': '#A9A9A9',
    'darkgreen': '#006400',
    'darkgrey': '#A9A9A9',
    'darkkhaki': '#BDB76B',
    'darkmagenta': '#8B008B',
    'darkolivegreen': '#556B2F',
    'darkorange': '#FF8C00',
    'darkorchid': '#9932CC',
    'darkred': '#8B0000',
    'darksalmon': '#E9967A',
    'darkseagreen': '#8FBC8F',
    'darkslateblue': '#483D8B',
    'darkslategray': '#2F4F4F',
    'darkslategrey': '#2F4F4F',
    'darkturquoise': '#00CED1',
    'darkviolet': '#9400D3',
    'deeppink': '#FF1493',
    'deepskyblue': '#00BFFF',
    'dimgray': '#696969',
    'dimgrey': '#696969',
    'dodgerblue': '#1E90FF',
    'firebrick': '#B22222',
    'floralwhite': '#FFFAF0',
    'forestgreen': '#228B22',
    'fuchsia': '#FF00FF',
    'gainsboro': '#DCDCDC',
    'ghostwhite': '#F8F8FF',
    'gold': '#FFD700',
    'goldenrod': '#DAA520',
    'gray': '#808080',
    'green': '#008000',
    'greenyellow': '#ADFF2F',
    'grey': '#808080',
    'honeydew': '#F0FFF0',
    'hotpink': '#FF69B4',
    'indianred': '#CD5C5C',
    'indigo': '#4B0082',
    'ivory': '#FFFFF0',
    'khaki': '#F0E68C',
    'lavender': '#E6E6FA',
    'lavenderblush': '#FFF0F5',
    'lawngreen': '#7CFC00',
    'lemonchiffon': '#FFFACD',
    'lightblue': '#ADD8E6',
    'lightcoral': '#F08080',
    'lightcyan': '#E0FFFF',
    'lightgoldenrodyellow': '#FAFAD2',
    'lightgray': '#D3D3D3',
    'lightgreen': '#90EE90',
    'lightgrey': '#D3D3D3',
    'lightpink': '#FFB6C1',
    'lightsalmon': '#FFA07A',
    'lightseagreen': '#20B2AA',
    'lightskyblue': '#87CEFA',
    'lightslategray': '#778899',
    'lightslategrey': '#778899',
    'lightsteelblue': '#B0C4DE',
    'lightyellow': '#FFFFE0',
    'lime': '#00FF00',
    'limegreen': '#32CD32',
    'linen': '#FAF0E6',
    'magenta': '#FF00FF',
    'maroon': '#800000',
    'mediumaquamarine': '#66CDAA',
    'mediumblue': '#0000CD',
    'mediumorchid': '#BA55D3',
    'mediumpurple': '#9370DB',
    'mediumseagreen': '#3CB371',
    'mediumslateblue': '#7B68EE',
    'mediumspringgreen': '#00FA9A',
    'mediumturquoise': '#48D1CC',
    'mediumvioletred': '#C71585',
    'midnightblue': '#191970',
    'mintcream': '#F5FFFA',
    'mistyrose': '#FFE4E1',
    'moccasin': '#FFE4B5',
    'navajowhite': '#FFDEAD',
    'navy': '#000080',
    'oldlace': '#FDF5E6',
    'olive': '#808000',
    'olivedrab': '#6B8E23',
    'orange': '#FFA500',
    'orangered': '#FF4500',
    'orchid': '#DA70D6',
    'palegoldenrod': '#EEE8AA',
    'palegreen': '#98FB98',
    'paleturquoise': '#AFEEEE',
    'palevioletred': '#DB7093',
    'papayawhip': '#FFEFD5',
    'peachpuff': '#FFDAB9',
    'peru': '#CD853F',
    'pink': '#FFC0CB',
    'plum': '#DDA0DD',
    'powderblue': '#B0E0E6',
    'purple': '#800080',
    'rebeccapurple': '#663399',
    'red': '#FF0000',
    'rosybrown': '#BC8F8F',
    'royalblue': '#4169E1',
    'saddlebrown': '#8B4513',
    'salmon': '#FA8072',
    'sandybrown': '#F4A460',
    'seagreen': '#2E8B57',
    'seashell': '#FFF5EE',
    'sienna': '#A0522D',
    'silver': '#C0C0C0',
    'skyblue': '#87CEEB',
    'slateblue': '#6A5ACD',
    'slategray': '#708090',
    'slategrey': '#708090',
    'snow': '#FFFAFA',
    'springgreen': '#00FF7F',
    'steelblue': '#4682B4',
    'tan': '#D2B48C',
    'teal': '#008080',
    'thistle': '#D8BFD8',
    'tomato': '#FF6347',
    'turquoise': '#40E0D0',
    'violet': '#EE82EE',
    'wheat': '#F5DEB3',
    'white': '#FFFFFF',
    'whitesmoke': '#F5F5F5',
    'yellow': '#FFFF00',
    'yellowgreen': '#9ACD32',
};
