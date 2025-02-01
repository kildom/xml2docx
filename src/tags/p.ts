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
import { Dict } from '../common';
import { processChildren, TagFunction, TranslatorState } from '../translator';
import { Element } from '../xml';
import { fontTag } from './font';
import { getIParagraphPropertiesOptions } from '../attrs/p-attrs';


type HeadingLevelType = (typeof docx.HeadingLevel)[keyof typeof docx.HeadingLevel];

export const headingTags: Dict<TagFunction> = {
    p: (ts, element) => pTag(ts, element, undefined),
    h1: (ts, element) => pTag(ts, element, docx.HeadingLevel.HEADING_1),
    h2: (ts, element) => pTag(ts, element, docx.HeadingLevel.HEADING_2),
    h3: (ts, element) => pTag(ts, element, docx.HeadingLevel.HEADING_3),
    h4: (ts, element) => pTag(ts, element, docx.HeadingLevel.HEADING_4),
    h5: (ts, element) => pTag(ts, element, docx.HeadingLevel.HEADING_5),
    h6: (ts, element) => pTag(ts, element, docx.HeadingLevel.HEADING_6),
    title: (ts, element) => pTag(ts, element, docx.HeadingLevel.TITLE),
};

export const headingTagNames = Object.keys(headingTags);

function pTag(ts: TranslatorState, element: Element, heading?: HeadingLevelType): any[] {

    trimElement(element, true);
    trimElement(element, false);

    let children = processChildren(ts, element, {
        tags: { font: fontTag },
        implicitTag: 'font',
        removeSpaces: false,
    });

    return [
        new docx.Paragraph({
            ...getIParagraphPropertiesOptions(element),
            children,
            heading,
        })
    ];
}

function trimElement(element: Element, reverse: boolean): boolean {
    if (reverse) element.elements.reverse();
    let i = 0;
    while (i < element.elements.length) {
        let sub = element.elements[i];
        if (sub.text === ' ') {
            // whitespace - remove and retry with the same item
            element.elements.splice(i, 1);
        } else if (sub.name === 'group') {
            if (trimElement(sub, reverse)) {
                // non-whitespace group was trimmed - stop processing
                if (reverse) element.elements.reverse();
                return true;
            } else {
                // whitespace group was trimmed - move to the next item
                i++;
            }
        } else {
            // non-whitespace item - stop processing
            if (reverse) element.elements.reverse();
            return true;
        }
    }
    // all items were whitespace, return false to indicate that there is nothing in it
    if (reverse) element.elements.reverse();
    return false;
}
