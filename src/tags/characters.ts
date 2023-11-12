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

import * as docx from "docx";

import { getColor } from "../colors";
import { DocxTranslator } from "../docxTranslator";
import { Element, SpacesProcessing, XMLError } from "../xml";
import { AnyObject, requiredAttribute, symbolInstance } from "../common";
import { fromEnum } from "../filters";
import { getBorder } from "./borders";


const simpleBoolTagsTable: { [key: string]: docx.IRunOptions } = {
    'allCaps': { allCaps: true },
    'all-caps': { allCaps: true },
    'b': { bold: true },
    'bold': { bold: true },
    'boldComplexScript': { boldComplexScript: true },
    'bold-complex-script': { boldComplexScript: true },
    'doubleStrike': { doubleStrike: true },
    'double-strike': { doubleStrike: true },
    'emboss': { emboss: true },
    'imprint': { imprint: true },
    'i': { italics: true },
    'italics': { italics: true },
    'italicsComplexScript': { italicsComplexScript: true },
    'italics-complex-script': { italicsComplexScript: true },
    'math': { math: true },
    'noProof': { noProof: true },
    'no-proof': { noProof: true },
    'rightToLeft': { rightToLeft: true },
    'right-to-left': { rightToLeft: true },
    'smallCaps': { smallCaps: true },
    'small-caps': { smallCaps: true },
    'snapToGrid': { snapToGrid: true },
    'snap-to-grid': { snapToGrid: true },
    'specVanish': { specVanish: true },
    'spec-vanish': { specVanish: true },
    's': { strike: true },
    'strike': { strike: true },
    'sub': { subScript: true },
    'subScript': { subScript: true },
    'sub-script': { subScript: true },
    'sup': { superScript: true },
    'superScript': { superScript: true },
    'super-script': { superScript: true },
    'u': { underline: { type: docx.UnderlineType.SINGLE } },
    'underline': { underline: { type: docx.UnderlineType.SINGLE } },
    'vanish': { vanish: true },
    'span': {},
    'font': {},
};

const simpleBoolStyleTable: { [key: string]: string } = {
    noProof: 'noProof',
    bold: 'bold',
    boldComplexScript: 'boldComplexScript',
    italics: 'italics',
    italicsComplexScript: 'italicsComplexScript',
    sizeComplexScript: 'sizeComplexScript',
    rightToLeft: 'rightToLeft',
    smallCaps: 'smallCaps',
    allCaps: 'allCaps',
    strike: 'strike',
    doubleStrike: 'doubleStrike',
    sub: 'subScript',
    subScript: 'subScript',
    super: 'superScript',
    superScript: 'superScript',
    highlightComplexScript: 'highlightComplexScript',
    emboss: 'emboss',
    imprint: 'imprint',
    snapToGrid: 'snapToGrid',
    vanish: 'vanish',
    specVanish: 'specVanish',
    math: 'math',
};

enum HighlightColor {
    BLACK = 'black',
    BLUE = 'blue',
    CYAN = 'cyan',
    DARK_BLUE = 'darkBlue',
    DARK_CYAN = 'darkCyan',
    DARK_GRAY = 'darkGray',
    DARK_GREEN = 'darkGreen',
    DARK_MAGENTA = 'darkMagenta',
    DARK_RED = 'darkRed',
    DARK_YELLOW = 'darkYellow',
    GREEN = 'green',
    LIGHT_GRAY = 'lightGray',
    MAGENTA = 'magenta',
    RED = 'red',
    WHITE = 'white',
    YELLOW = 'yellow',
};

export function removeShallowUndefined(object: { [key: string]: any }) {
    object = { ...object };
    for (let key of [...Object.keys(object)]) {
        if (object[key] === undefined) {
            delete object[key];
        }
    }
    return object;
}

type SplitListMatcher = (tr: DocxTranslator, src: Element, value: string) => any;

export function splitListValues(tr: DocxTranslator, src: Element, value: string | undefined, matchers: { [key: string]: SplitListMatcher }, split: ',' | ' ' | 'both' = 'both') {
    if (value === undefined) return undefined;
    let arr = value.split(split == ' ' ? /\s+/ : split == ',' ? /\s*[,;]\s*/ : /(?:\s*[,;]\s*|\s+)/);
    let result: { [key: string]: any } = {};
    outerLoop:
    for (let item of arr) {
        for (let [name, matcher] of Object.entries(matchers)) {
            if (name in result) continue;
            let m = matcher(tr, src, item);
            if (m !== undefined) {
                result[name] = m;
                continue outerLoop;
            }
        }
        throw new XMLError(src, `Invalid list item ${item}.`);
    }
    return result; // TODO: Use more this function in more places
}


export function getIRunStylePropertiesOptions(tr: DocxTranslator, src: Element, attributes: AnyObject): docx.IRunStylePropertiesOptions {
    let options: docx.IRunStylePropertiesOptions = {
        underline: splitListValues(tr, src, attributes.underline, {
            type: (tr: DocxTranslator, src: Element, value: string) => fromEnum(src, value, docx.UnderlineType, {}, false),
            color: (tr: DocxTranslator, src: Element, value: string) => getColor(value, src),
        }),
        color: getColor(attributes.color),
        kern: attributes.kern,
        position: attributes.position,
        size: attributes.size,
        font: attributes.font || attributes.face,
        highlight: fromEnum(src, attributes.highlight, HighlightColor, {}, false) as string | undefined,
        shading: attributes.background && {
            type: docx.ShadingType.SOLID,
            color: getColor(attributes.background),
        },
        border: getBorder(tr, src, attributes.border)?.top,
        scale: tr.filter(src, ':float', attributes.scale, true),
    };
    for (let [key, value] of Object.entries(attributes)) {
        if (simpleBoolStyleTable[key] !== undefined) {
            (options as any)[simpleBoolStyleTable[key]] = tr.filter(src, ':bool', value);
        }
    }
    return removeShallowUndefined(options) as docx.IRunStylePropertiesOptions;
}

function simpleStyleChange(tr: DocxTranslator, src: Element, styleChange: docx.IRunOptions, attributes: AnyObject) {
    styleChange = {
        ...styleChange,
        style: attributes.style,
        ...getIRunStylePropertiesOptions(tr, src, attributes),
    };
    let newTranslator = tr.copy(styleChange);
    let properties = newTranslator.getProperties(src);
    newTranslator = newTranslator.copy(properties);
    return newTranslator.parseObjects(src, SpacesProcessing.PRESERVE);
}

export function fallbackStyleChange(tr: DocxTranslator, src: Element, attributes: AnyObject): any[] | null {
    if (simpleBoolTagsTable[src.name] !== undefined) {
        return simpleStyleChange(tr, src, simpleBoolTagsTable[src.name], attributes);
    }
    return null;
}

export function fontStyleTag(tr: DocxTranslator, src: Element, attributes: AnyObject, properties: AnyObject): any[] {
    let options: docx.ICharacterStyleOptions = {
        id: requiredAttribute(src, attributes, 'id'),
        basedOn: attributes.basedOn,
        name: requiredAttribute(src, attributes, 'name'),
        next: attributes.next,
        run: getIRunStylePropertiesOptions(tr, src, attributes),
    };
    (options as any)[symbolInstance] = 'ICharacterStyleOptions';
    return [options]
   
}
