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

import { CaptureChildren, normalizeElement, translateNodes, TranslatorState } from '../translate';
import { AnyObject, Attributes, Dict, removeShallowUndefined, selectUndef, splitListValues } from '../common';
import { CData, Element, SpacesProcessing, Text } from '../xml';
import { HighlightColor } from '../enums';
import {
    convertBool, convertColor, convertEnum, convertPositiveUniversalMeasure,
    convertUfloat, convertUint, convertUniversalMeasure
} from '../converters';
import { getSingleBorder } from './borders';


// #region Tables

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

/*>>> simpleBoolStyleTable
*/
const simpleBoolStyleTable: Dict<string> = {
    /*>

    The following attributes are optional
    *[boolean values](attributes.md#boolean-value)*
    defining the text format.

    * `bold`
    * `italics`
    * `strike`
    * `double-strike`
    * `sub` (alias `sub-script`)
    * `super` (alias `super-script`)
    * `small-caps`
    * `all-caps`
    * `emboss`
    * `imprint`
    * `vanish`
    * `spec-vanish`
    * `no-proof`
    * `snap-to-grid`
    * `math`
    * `bold-complex-script`
    * `italics-complex-script`
    * `size-complex-script`
    * `highlight-complex-script`
    * `right-to-left`
    * `vwnbsp` - see [`<vwnbsp>` tag](paragraph.md#vwnbsp)
    */
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
    vwnbsp: 'useVarWidthNoBreakSpace',
};

// #endregion


export interface TextFormat extends docx.IRunOptions {
    avoidOrphans?: number;
    useVarWidthNoBreakSpace?: boolean;
}

const avoidOrphansVarRegExp: RegExp[] = [];
const avoidOrphansFixedRegExp: RegExp[] = [];

export const paragraphContextTags = {
    ...Object.fromEntries(Object.keys(simpleBoolTagsTable).map(tag => [tag, fontTag])),
    'vwnbsp': vwnbspTag,
    '#text': textNode,
    '#cdata': textNode,
};


// #region IRunStylePropertiesOptions

/*>>>
@merge:simpleBoolStyleTable
*/
export function getIRunStylePropertiesOptions(attributes: Attributes, properties?: AnyObject): docx.IRunStylePropertiesOptions {
    let options: docx.IRunStylePropertiesOptions = {
        //* "type color" Text underline.
        //* * `type` - Underline type. @enum:UnderlineType|4
        //* * `color` - Underline color. @filterColor
        underline: splitListValues(attributes.underline, {
            type: value => convertEnum.noErr(value, docx.UnderlineType),
            color: value => convertColor.noErr(value),
        }),
        //* Text color. @@
        color: convertColor(attributes.color),
        //* Text kerning. @@
        kern: convertPositiveUniversalMeasure(attributes.kern),
        //* Position. @@
        position: convertUniversalMeasure(attributes.position),
        //* Font size. @@
        size: convertPositiveUniversalMeasure(attributes.size),
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
            color: convertColor(attributes.background),
        }),
        //* Border around the text. @@
        border: getSingleBorder(attributes.border),
        //* Font scale. @@
        scale: convertUfloat(attributes.scale),
    };
    for (let [key, value] of Object.entries(attributes)) {
        if (simpleBoolStyleTable[key] !== undefined) {
            (options as any)[simpleBoolStyleTable[key]] = convertBool(value);
        }
    }
    options = { ...options, ...properties };
    removeShallowUndefined(options);
    return options;
}

// #endregion


// #region #text

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

// #endregion


// #region <font>

export function fontTag(ts: TranslatorState, element: Element, captureChildren?: CaptureChildren): docx.TextRun[] {

    let [tsInner, attributes, properties] = normalizeElement(ts, element, SpacesProcessing.PRESERVE);

    let format: TextFormat = {
        ...simpleBoolTagsTable[element.name],
        ...getIRunStylePropertiesOptions(attributes, properties),
        style: attributes.style,
        avoidOrphans: convertUint(attributes.avoidOrphans),
    };
    tsInner = tsInner.applyFormat(format);
    let children = translateNodes(tsInner, element.elements, paragraphContextTags);
    captureChildren?.(children);
    return children;
}

// #endregion


// #region <vwnbsp>

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

// #endregion
