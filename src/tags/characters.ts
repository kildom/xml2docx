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

import { FileChild } from "docx/build/file/file-child";
import { getColor } from "../colors";
import { DocxTranslator } from "../docxTranslator";
import { Element, SpacesProcessing, XMLError } from "../xml";
import * as docx from "docx";
import { IPropertiesOptions } from "docx/build/file/core-properties";
import { AnyObject, symbolInstance } from "../common";
import { fromEnum } from "../filters";


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

export function underlineTag(tr: DocxTranslator, src: Element, attributes: AnyObject): any[] {
    let change: docx.IRunOptions = {
        underline: {
            color: attributes.color,
            type: fromEnum(src, attributes.type, docx.UnderlineType) as docx.UnderlineType,
        }
    }
    return simpleStyleChange(tr, src, change);
}


export function fontTag(tr: DocxTranslator, src: Element, attributes: AnyObject): any[] {
    let color = getColor(attributes.color);
    if (color === undefined) throw new XMLError(src, `Invalid color "${attributes.color}".`);
    let change: docx.IRunOptions = {
        color,
        font: attributes.face,
        size: attributes.size,
    }
    return simpleStyleChange(tr, src, change);
}

function simpleStyleChange(tr: DocxTranslator, src: Element, styleChange: docx.IRunOptions) {
    let newTranslator = tr.copy(styleChange);
    let properties = newTranslator.getProperties(src);
    newTranslator = newTranslator.copy(properties);
    return newTranslator.parseObjects(src, SpacesProcessing.PRESERVE);
}

export function fallbackStyleChange(tr: DocxTranslator, src: Element): any[] | null {
    if (simpleBoolStyleTable[src.name] !== undefined) {
        return simpleStyleChange(tr, src, { [simpleBoolStyleTable[src.name]]: true });
    }
    return null;
}
