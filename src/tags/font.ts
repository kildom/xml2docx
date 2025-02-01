/*!
 * Copyright 2025 Dominik Kilian
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
import * as convert from '../convert';
import { Dict } from '../common';
import { convertElement, prepareElement, TagFunction, TextFormat, TranslatorState } from '../translator';
import { Element } from '../xml';
import { getIRunStylePropertiesOptions } from '../attrs/font-attrs';
import { brTag, pagebreakTag, pagenumberTag, spaceTag, tabTag, textTag, totalpagesTag, vwnbspTag } from './text-leaf';
import { imgTag } from './img';

const textTags: Dict<TagFunction> = {

    // Formatting tags
    font: (ts, element) => fontTag(ts, element, {}),
    span: (ts, element) => fontTag(ts, element, {}),
    b: (ts, element) => fontTag(ts, element, { bold: true }),
    i: (ts, element) => fontTag(ts, element, { italics: true }),
    s: (ts, element) => fontTag(ts, element, { strike: true }),
    u: (ts, element) => fontTag(ts, element, { underline: { type: docx.UnderlineType.SINGLE } }),
    sub: (ts, element) => fontTag(ts, element, { subScript: true }),
    sup: (ts, element) => fontTag(ts, element, { superScript: true }),

    // Leaf Tags
    '#TEXT': textTag,
    '#CDATA': textTag,
    img: imgTag,
    br: brTag,
    tab: tabTag,
    space: spaceTag,
    pagenumber: pagenumberTag,
    totalpages: totalpagesTag,
    pagebreak: pagebreakTag,
    vwnbsp: vwnbspTag,
};



const fontTagOptions = {
    tags: textTags,
    removeSpaces: false,
};


export function fontTag(ts: TranslatorState, element: Element, formatChange?: TextFormat): any[] {

    let tsInner = prepareElement(ts, element, fontTagOptions);

    let attributes = element.attributes;

    let format: TextFormat = {
        ...formatChange,
        ...getIRunStylePropertiesOptions(element),
        style: attributes.style,
        avoidOrphans: convert.uint(element, 'avoidorphans'),
        useVarWidthNoBreakSpace: convert.bool(element, 'vwnbsp'),
    };
    tsInner = tsInner.applyFormat(format);

    return convertElement(tsInner, element, fontTagOptions);
}
