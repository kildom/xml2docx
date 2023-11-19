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

import { DocxTranslator } from "../docxTranslator";
import { Element, SpacesProcessing, XMLError } from "../xml";
import { AnyObject, Attributes, requiredAttribute, selectUndef, splitListValues, symbolInstance } from "../common";
import { filterFloat, fromEnum, filterBool, FilterMode, filterColor, filterPositiveUniversalMeasure, filterUniversalMeasure, filterUfloat } from "../filters";
import { getBorder, getBorderOptions } from "./borders";


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

/*>>> */
export function getIRunStylePropertiesOptions(attributes: Attributes): docx.IRunStylePropertiesOptions {
    let options: docx.IRunStylePropertiesOptions = {
        //* "type color" Text underline.
        //* * `type` - Underline type. @enum:UnderlineType
        //* * `color` - Underline color. @filterColor
        underline: splitListValues(attributes.underline, {
            type: (value: string) => fromEnum(value, docx.UnderlineType),
            color: (value: string) => filterColor(value, FilterMode.ALL),
        }),
        //* Text color. @@
        color: filterColor(attributes.color, FilterMode.UNDEF),
        //* Text kerning. @@
        kern: filterPositiveUniversalMeasure(attributes.kern, FilterMode.UNDEF),
        //* Position. @@
        position: filterUniversalMeasure(attributes.position, FilterMode.UNDEF),
        //* Font size. @@
        size: filterPositiveUniversalMeasure(attributes.size, FilterMode.UNDEF),
        //* Font name.
        font: attributes.font ||
        //* Alias of `font` attribute.
            attributes.face,
        //* Text Highlighting. @enum:HighlightColor
        highlight: fromEnum(attributes.highlight, HighlightColor, {}, false) as string | undefined,
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
    return removeShallowUndefined(options) as docx.IRunStylePropertiesOptions;
}

function simpleStyleChange(tr: DocxTranslator, styleChange: docx.IRunOptions, attributes: Attributes) {
    styleChange = {
        ...styleChange,
        style: attributes.style,
        ...getIRunStylePropertiesOptions(attributes),
    };
    let newTranslator = tr.copy(styleChange);
    let properties = newTranslator.getProperties(tr.element);
    newTranslator = newTranslator.copy(properties);
    return newTranslator.parseObjects(tr.element, SpacesProcessing.PRESERVE);
}

export function fallbackStyleChange(tr: DocxTranslator, attributes: Attributes): any[] | null {
    if (simpleBoolTagsTable[tr.element.name] !== undefined) {
        return simpleStyleChange(tr, simpleBoolTagsTable[tr.element.name], attributes);
    }
    return null;
}

export function fontStyleTag(tr: DocxTranslator, attributes: Attributes, properties: AnyObject): any[] {
    let options: docx.ICharacterStyleOptions = {
        id: requiredAttribute(attributes, 'id'),
        basedOn: attributes.basedOn,
        name: requiredAttribute(attributes, 'name'),
        next: attributes.next,
        run: getIRunStylePropertiesOptions(attributes),
        ...properties,
    };
    (options as any)[symbolInstance] = 'ICharacterStyleOptions';
    return [options];
}
