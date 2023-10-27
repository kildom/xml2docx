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
import * as path from "node:path";
import * as util from 'node:util';
import * as xmlJs from 'xml-js';
import * as docx from "docx";
import { error } from './xml2docx';

type docxFileChild = docx.Paragraph | docx.Table | docx.TableOfContents;

interface Element {
    type: 'element';
    name: string;
    attributes?: { [key: string]: string };
    elements?: Node[];
}

interface Text {
    type: 'text';
    text: string;
}

interface CData {
    type: 'cdata';
    cdata: string;
}

interface Instruction {
    type: 'instruction';
    name: string;
    instruction: string;
}

type Node = Element | Text | CData | Instruction;


let fileDir: string;
let sections: docx.ISectionOptions[];
let currentSection: docx.ISectionOptions;
let paragraphStyles: docx.IParagraphStyleOptions[];
let characterStyles: docx.ICharacterStyleOptions[];
let aliases: { [id: string]: any };


function noSpacesBetween(arr?: Node[]) {
    if (arr) {
        return arr.filter(node => (node.type != 'text' || node.text.trim() != ''));
    } else {
        return [];
    }
}

function extractName(nameWithFilter: string) {
    let arr = nameWithFilter.split(':');
    if (arr.length != 2) {
        return nameWithFilter;
    } else {
        return arr[0];
    }
}


function extractFilter(nameWithFilter: string) {
    let arr = nameWithFilter.split(':');
    if (arr.length != 2) {
        return null;
    } else {
        return arr[1];
    }
}


function convertSize(value: string | number | string[] | number[], nonZero: boolean = false, fraction: boolean = false, targetUnitsPerPt: number = 1): any {
    if (typeof (value) == 'string') {
        value = value.trim();
        let scale: number;
        if (value.endsWith('mm')) {
            scale = targetUnitsPerPt * 360 / 127;
        } else if (value.endsWith('cm')) {
            scale = targetUnitsPerPt * 3600 / 127;
        } else if (value.endsWith('in')) {
            scale = targetUnitsPerPt * 72;
        } else if (value.endsWith('pt')) {
            scale = targetUnitsPerPt * 1;
        } else if (value.endsWith('pc')) {
            scale = targetUnitsPerPt * 12;
        } else {
            throw Error(`Unknown units at "${value}"`);
        }
        let result = parseFloat(value.substring(0, value.length - 2)) * scale;
        if (!fraction) {
            result = Math.round(result);
        }
        if (nonZero && result < 1) {
            result = 1;
        }
        return result;
    } else if (typeof (value) == 'object' && value instanceof Array) {
        return value.map((x: string | number) => convertSize(x, nonZero, fraction, targetUnitsPerPt));
    } else {
        return value;
    }
}

const boolValues: { [key: string]: boolean } = {
    'true': true,
    't': true,
    'yes': true,
    'y': true,
    '1': true,
    'on': true,
    'false': false,
    'f': false,
    'no': false,
    'n': false,
    '0': false,
    'off': false,
};

function getPropertyNormalized(obj: any, name: string): any {
    name = name.toLowerCase().replace(/[_.-]/g, '');
    for (let prop of Object.keys(obj)) {
        if (name === prop.toLowerCase().replace(/[_.-]/g, '')) {
            return obj[prop];
        }
    }
    return undefined;
}

const filters: { [key: string]: (value: any) => any } = {
    'file': (value: any) => {
        let filePath = path.resolve(fileDir, value as string);
        return fs.readFileSync(filePath);
    },
    'int': (value: any) => Math.round(parseFloat(value as string)),
    'pt': (value: any) => convertSize(value as any, false, false),
    'pt3q': (value: any) => convertSize(value as any, false, false, 4 / 3),
    'pt8': (value: any) => convertSize(value as any, false, false, 8),
    'pt20': (value: any) => convertSize(value as any, false, false, 20),
    'dxa': (value: any) => convertSize(value as any, false, false, 20),
    'emu': (value: any) => convertSize(value as any, false, false, 12700),
    'bool': (value: any) => {
        let v = ('' + value).toLowerCase();
        if (v in boolValues) {
            return boolValues[v];
        } else {
            throw new Error(`Invalid boolean value "${value}"`);
        }
    },
    'enum': (value: any) => {
        let arr = ('' + value).split(/[:.=>\\\/,;|-]+/);
        if (arr.length != 2) {
            throw new Error(`Invalid ":enum" filter input "${JSON.stringify(arr)}"`);
        }
        let enumObj = getPropertyNormalized(docx, arr[0]) as { [key: string]: any };
        if (!enumObj) {
            throw new Error(`Unknown enum name "${arr[0]}"`);
        }
        let result = getPropertyNormalized(enumObj, arr[1]);
        if (result === undefined) {
            throw new Error(`Unknown enum item "${arr[1]}"`);
        }
        return result;
    },
    'alias': (value: any) => {
        if (value === undefined || value === null || value === false) {
            return false;
        } else if (value === true) {
            return true;
        } else if (value in aliases) {
            return JSON.parse(JSON.stringify(aliases[value]));
        } else {
            console.error(aliases);
            throw new Error(`Undefined alias "${value}"`);
        }
    },
    'json': (value: any) => (new Function(`return ${value};`))(),
    'new': (value: any) => value,
    'FileChildren': (value: any) => value,
    'ParagraphChildren': (value: any) => value,
};

function filter(filterName: string, value: any, passUndefined: boolean = false): any {
    if (passUndefined && value === undefined) return value;
    let filter = extractFilter(filterName);
    if (filter === null) {
        return value;
    }
    if (filter in filters) {
        return filters[filter](value);
    } else {
        throw new Error(`Unknown filter ${filter}`);
    }
}

function attributesToOptions(element: Element, children?: Node[]) {
    let ref: { [key: string]: any } = {};
    let obj: { [key: string]: any } = {};
    for (let [key, value] of Object.entries({ ...(element.attributes || {}) })) {
        if (key == '_') {
            ref = { ...ref, ...aliases[value] };
        } else {
            obj[extractName(key)] = filter(key, value);
        }
    }
    children = children || element.elements || [];
    let first = children.findIndex(node => (node.type != 'text' || node.text.trim() != ''));
    let ext = children[first];
    if (ext && ext.type == 'element' && ext.name == '__') {
        children.splice(0, first + 1);
        return { ...ref, ...obj, ...elementToOptions(ext) };
    }
    return { ...ref, ...obj };
}

function elementToOptions(element: Element): any {
    /*
    Type of elements:
        String: <str>The text</str>
        CData: <data><![CDATA[ ... ]]></data>
        Array: <arr><_ ...></_><_ .../></arr>
            empty array: <arr><?empty?></arr>
        Object: <obj prop1="..."><prop2>...</prop2><prop3>...</prop3></obj>
        FileChildren array: <children><?FileChildren?>...<children>
        ParagraphChildren array: <children><?ParagraphChildren?>...<children>
    */
    let elements = noSpacesBetween(element.elements);

    if (elements.length == 1 && elements[0].type == 'text') {

        return filter(element.name, elements[0].text);

    } else if (elements.length == 1 && elements[0].type == 'cdata') {

        return filter(element.name, elements[0].cdata);

    } else if (extractFilter(element.name) == 'FileChildren') {

        let arr: docxFileChild[] = [];
        processFileChildren(element, arr);
        return arr;

    } else if (extractFilter(element.name) == 'ParagraphChildren') {

        let arr: docx.ParagraphChild[] = [];
        processParagraphChildren(element, arr, {});
        return arr;

    } else if (elements.length == 1 && elements[0].type == 'element' && extractFilter(elements[0].name) == 'new') {

        let obj = new ((docx as any)[extractName(elements[0].name)])(elementToOptions(elements[0]));
        return obj;

    } else if (elements.length == 1 && elements[0].type == 'element' && elements[0].name == '_empty') {

        return [];

    } else if (elements.length > 0 && elements[0].type == 'element' && extractName(elements[0].name) == '_') {

        let arr: any[] = [];
        if (element.attributes && Object.entries(element.attributes).length > 0) {
            throw new Error(`Array <${element.name}> does not allow attribute.`);
        }
        for (let sub of elements) {
            if (sub.type == 'element' && extractName(sub.name) == '_') {
                let value = elementToOptions(sub);
                arr.push(value);
            } else {
                throw new Error(`Expecting only items in array <${element.name}>.`);
            }
        }
        return filter(element.name, arr);

    } else {

        let obj: { [key: string]: any } = attributesToOptions(element, elements);
        for (let sub of elements) {
            if (sub.type == 'element') {
                let value = elementToOptions(sub);
                obj[extractName(sub.name)] = value;
            } else {
                throw new Error(`Expecting only elements in <${element.name}>.`);
            }
        }
        return filter(element.name, obj);

    }
    // TODO: More error checking
}

const directTextTags: { [key: string]: string } = {
    'b': 'bold',
    'i': 'italics',
    'u': 'underline',
    's': 'strike',
    'sub': 'subScript',
    'super': 'superScript',
    'allCaps': 'allCaps',
    'smallCaps': 'smallCaps',
    'doubleStrike': 'doubleStrike',
    'emboss': 'emboss',
};

function filterText(text: string) {
    return text.replace(/\s*\r?\n\s*/g, ' ');
}

function processParagraphChild(node: Node, target: docx.ParagraphChild[], state: docx.IRunOptions) {
    if (node.type == 'instruction') {
        throw new Error(`Unexpected instruction <?${node.name}?>`);
    } else if (node.type == 'text') {
        target.push(new docx.TextRun({ ...state, text: filterText(node.text) }));
    } else if (node.type == 'cdata') {
        target.push(new docx.TextRun({ ...state, text: node.cdata }));
    } else if (node.name == 'img') {
        addImage(node, target);
    } else if (node.name == 'a') {
        let opt = attributesToOptions(node);
        let children: docx.ParagraphChild[] = [];
        let hyperlink: docx.XmlComponent;
        processParagraphChildren(node, children, state);
        if ('relationshipId' in opt) {
            hyperlink = new docx.ConcreteHyperlink(children, opt.relationshipId, opt.anchor);
        } else if ('anchor' in opt) {
            hyperlink = new docx.InternalHyperlink({ children, anchor: opt.anchor });
        } else {
            hyperlink = new docx.ExternalHyperlink({ children, link: opt.link || opt.href });
        }
        target.push(hyperlink);
    } else if (node.name == 'tab') {
        target.push(new docx.TextRun({ ...state, text: '\t' }));
    } else if (node.name == 'br') {
        target.push(new docx.TextRun({ ...state, children: [new docx.CarriageReturn()] }));
    } else if (node.name == 'TotalPages') {
        target.push(new docx.TextRun({ ...state, children: [docx.PageNumber.TOTAL_PAGES] }));
    } else if (node.name == 'CurrentPageNumber') {
        target.push(new docx.TextRun({ ...state, children: [docx.PageNumber.CURRENT] }));
    } else if (node.name == 'font') {
        let opt = attributesToOptions(node);
        let addition: { [key: string]: any } = {};
        if (opt.size) addition.size = opt.size;
        if (opt.color) addition.color = opt.color;
        if (opt.name) addition.font = opt.name;
        if (opt.highlight) addition.highlight = opt.highlight;
        if (opt.kern) addition.kern = opt.kern;
        if (opt.scale) addition.scale = filter(':int', opt.scale);
        if (opt.spacing) addition.characterSpacing = filter(':dxa', opt.spacing);
        if (opt.style) addition.style = opt.style;
        processParagraphChildren(node, target, { ...state, ...addition });
    } else if (node.name in directTextTags) {
        let addition: { [key: string]: any } = {};
        addition[directTextTags[node.name]] = true;
        processParagraphChildren(node, target, { ...state, ...addition });
    } else if (node.type == 'element') {
        let name = extractName(node.name);
        let obj = new ((docx as any)[name])(elementToOptions(node));
        target.push(obj);
    }
}

function processParagraphChildren(parent: Element, target: docx.ParagraphChild[], state: docx.IRunOptions) {
    for (let child of (parent.elements || [])) {
        processParagraphChild(child, target, state);
    }
}

function processCells(parent: Element, target: docx.TableCell[]) {
    for (let element of noSpacesBetween(parent.elements)) {
        if (element.type != 'element' || extractName(element.name) != 'td') {
            throw new Error(`Expecting only <td> in <tr>.`);
        }
        let children: docxFileChild[] = [];
        let opt = attributesToOptions(element);
        processFileChildren(element, children);
        let cell = new docx.TableCell({ ...opt, children });
        target.push(cell);
    }
}

function processRows(parent: Element, target: docx.TableRow[]) {
    for (let element of noSpacesBetween(parent.elements)) {
        if (element.type != 'element' || extractName(element.name) != 'tr') {
            throw new Error(`Expecting only <tr> in <table>.`);
        }
        let children: docx.TableCell[] = [];
        let opt = attributesToOptions(element);
        processCells(element, children);
        let row = new docx.TableRow({ ...opt, children });
        target.push(row);
    }
}

function processFileChild(element: Node, target: docxFileChild[]) {

    if (element.type != 'element') {
        throw new Error('Only element nodes are allowed as file child element.'); // TODO: better message
    }

    if (element.name == 'p') {
        let children: docx.ParagraphChild[] = [];
        let options = attributesToOptions(element);
        processParagraphChildren(element, children, {});
        let paragraph = new docx.Paragraph({ ...options, children });
        target.push(paragraph);
    } else if (element.name.match(/^h[1-9]$/)) {
        let children: docx.ParagraphChild[] = [];
        let options = attributesToOptions(element);
        processParagraphChildren(element, children, {});
        let style = 'Heading' + element.name.substring(1);
        let paragraph = new docx.Paragraph({ style, ...options, children });
        target.push(paragraph);
    } else if (element.name == 'table') {
        let rows: docx.TableRow[] = [];
        let options = attributesToOptions(element);
        processRows(element, rows);
        if (options.columnWidths) {
            options.columnWidths = (options.columnWidths as string)
                .split(',')
                .map(x => filter(':dxa', x.trim()));
        }
        let table = new docx.Table({ ...options, rows });
        target.push(table);
    } else if (element.name == 'Paragraph' || element.name == 'Table' || element.name == 'TableOfContents') {
        let options = elementToOptions(element);
        let constr = (docx as any)[element.name];
        target.push(new constr(options));
    } else {
        throw new Error(`Unexpected file child element <${element.name}>`);
    }
}

function processFileChildren(parent: Element, target: docxFileChild[]) {
    for (let child of noSpacesBetween(parent.elements)) {
        processFileChild(child, target);
    }
}

function processTopLevel(document: Element) {
    for (let element of noSpacesBetween(document.elements)) {
        if (element.type != 'element') {
            throw new Error(`Only element nodes are allowed inside top level element. Found ${element.type}.`);
        }
        if (element.name == 'ParagraphStyle') {
            let obj = elementToOptions(element);
            paragraphStyles.push(obj);
            continue;
        } else if (element.name == 'CharacterStyle') {
            let obj = elementToOptions(element);
            characterStyles.push(obj);
            continue;
        } else if (element.name == 'Alias') {
            let id = element.attributes?.id;
            if (!id) {
                throw new Error('Alias without id');
            }
            delete element.attributes!.id;
            let obj = elementToOptions(element);
            aliases[id] = obj;
            continue;
        } else if (element.name == 'Section') {
            let obj = elementToOptions(element);
            currentSection = { ...obj, children: [] };
            sections.push(currentSection);
            continue;
        } else {
            processFileChild(element, currentSection.children as docxFileChild[]);
        }
    }
}

function removeUndefinedProperties(value: any) {
    let result = false;
    if (typeof value != 'object') {
        return true;
    } else if (value instanceof Array) {
        for (let i = 0; i < value.length; i++) {
            if (removeUndefinedProperties(value[i])) {
                result = true;
            }
        }
    } else {
        for (let key of [...Object.keys(value)]) {
            if (value[key] === undefined) {
                delete value[key];
            } else {
                if (removeUndefinedProperties(value[key])) {
                    result = true;
                } else {
                    delete value[key];
                }
            }
        }
    }
    return result;
}

function addImage(node: Element, target: docx.ParagraphChild[]) {

    let input = elementToOptions(node);

    if (!input.src || !('width' in input) || !('height' in input)) {
        throw new Error(`Missing required attributes in <img>`);
    }

    let options: docx.IImageOptions = {
        data: filter(':file', input.src),
        transformation: {
            width: filter(':pt3q', input.width, true),
            height: filter(':pt3q', input.height, true),
            rotation: filter(':int', input.rotation, true),
            flip: {
                horizontal: filter(':bool', input.flipHorizontal, true),
                vertical: filter(':bool', input.flipVertical, true),
            }
        },
        floating: {
            allowOverlap: filter(':bool', input.allowOverlap, true),
            behindDocument: filter(':bool', input.behindDocument, true),
            layoutInCell: filter(':bool', input.layoutInCell, true),
            lockAnchor: filter(':bool', input.lockAnchor, true),
            zIndex: filter(':int', input.zIndex, true),
            horizontalPosition: {
                align: input.horizontalAlign,
                relative: input.horizontalRelative,
                offset: filter(':emu', input.horizontalOffset, true),
            },
            verticalPosition: {
                align: input.verticalAlign,
                relative: input.verticalRelative,
                offset: filter(':emu', input.verticalOffset, true),
            },
            margins: {
                bottom: filter(':emu', input.marginBottom, true),
                left: filter(':emu', input.marginLeft, true),
                right: filter(':emu', input.marginRight, true),
                top: filter(':emu', input.marginTop, true),
            },
            wrap: {
                margins: {
                    distB: filter(':emu', input.wrapMarginBottom, true),
                    distL: filter(':emu', input.wrapMarginLeft, true),
                    distR: filter(':emu', input.wrapMarginRight, true),
                    distT: filter(':emu', input.wrapMarginTop, true),
                },
                side: input.wrapSide,
                type: input.wrapType ? filter(':enum', 'TextWrappingType.' + input.wrapType, true) : undefined,
            }
        }
    };

    removeUndefinedProperties(options);

    target.push(new docx.ImageRun(options));
}

export async function convert(inputFile: string, xmlText: string) {
    fileDir = path.dirname(inputFile);
    sections = [];
    currentSection = (null as unknown as docx.ISectionOptions);
    paragraphStyles = [];
    characterStyles = [];
    aliases = {};

    error.push('Cannot parse XML file.');
    let xml = xmlJs.xml2js(xmlText, {
        ignoreComment: true,
        captureSpacesBetweenElements: true,
    });
    error.pop();

    fs.writeFileSync('a.json', JSON.stringify(xml, undefined, 4));

    let topLevelElements = noSpacesBetween(xml.elements);

    if (topLevelElements.length != 1 || topLevelElements[0].type !== 'element' || topLevelElements[0].name !== 'document') {
        throw new Error('Invalid top level structure of the document. Required one top level <document> element.');
    }

    error.push('Cannot process XML.');
    let document = topLevelElements[0] as Element;
    processTopLevel(document);
    error.pop();

    error.push('Cannot create document from generated data.');
    const doc = new docx.Document({ sections, styles: { paragraphStyles, characterStyles } });
    error.pop();

    error.push('Cannot pack to docx format.');
    let result = await docx.Packer.toBuffer(doc);
    error.pop();

    return result;
}

