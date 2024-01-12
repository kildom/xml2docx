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

import { DocxTranslator } from '../docxTranslator';
import { SpacesProcessing } from '../xml';
import { AnyObject, Attributes, Dict, requiredAttribute, selectUndef, setTag, splitListValues } from '../common';
import {
    fromEnum, filterBool, FilterMode, filterColor, filterPositiveUniversalMeasure, filterUniversalMeasure, filterUfloat
} from '../filters';
import { getBorderOptions } from './borders';
import { HighlightColor } from '../enums';


const simpleBoolTagsTable: Dict<docx.IRunOptions> = {
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
};

export function removeShallowUndefined(object: AnyObject) {
    object = { ...object };
    for (let key of [...Object.keys(object)]) {
        if (object[key] === undefined) {
            delete object[key];
        }
    }
    return object;
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
        highlight: fromEnum(attributes.highlight, HighlightColor, {}, false),
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

/*>>> fontTag
@merge:getIRunStylePropertiesOptions
*/
function simpleStyleChange(tr: DocxTranslator, styleChange: docx.IRunOptions, attributes: Attributes) {
    styleChange = {
        ...styleChange,
        //* Font style id.
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

/*>>>
Define a font style.

This tag inherits all the attributes from the [`<font>` tag](#font)
except `style` attribute.
It also defines the following own attributes:
*/
export function fontStyleTag(tr: DocxTranslator, attributes: Attributes, properties: AnyObject): any[] {
    let options: docx.ICharacterStyleOptions = {
        //* Style id. Use it to identify the style.
        id: requiredAttribute(attributes, 'id'),
        //* Style id of the parent style.
        basedOn: attributes.basedOn,
        //* User friendly name of the style.
        name: requiredAttribute(attributes, 'name'),
        run: getIRunStylePropertiesOptions(attributes),
        ...properties,
    };
    setTag(options, 'ICharacterStyleOptions');
    return [options];
}
