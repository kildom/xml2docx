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
import { Dict } from '../common';
import { CaptureChildren, getDocxConstructor, normalizeElement, translateNodes, TranslatorState } from '../translate';
import { Element, Node, SpacesProcessing } from '../xml';
import { paragraphContextTags } from './text';

type HeadingLevelType = (typeof docx.HeadingLevel)[keyof typeof docx.HeadingLevel];

export const headingTags: Dict<HeadingLevelType | undefined> = {
    'p': undefined,
    'h1': docx.HeadingLevel.HEADING_1,
    'h2': docx.HeadingLevel.HEADING_2,
    'h3': docx.HeadingLevel.HEADING_3,
    'h4': docx.HeadingLevel.HEADING_4,
    'h5': docx.HeadingLevel.HEADING_5,
    'h6': docx.HeadingLevel.HEADING_6,
    'title': docx.HeadingLevel.TITLE,
};


export function pTag(ts: TranslatorState, element: Element, captureChildren?: CaptureChildren): docx.Paragraph[] {

    let [tsInner, attributes, properties] = normalizeElement(ts, element, SpacesProcessing.TRIM);

    let heading: HeadingLevelType | undefined = headingTags[element.name];
    let options: docx.IParagraphOptions = {
        //...getIParagraphPropertiesOptions(tr, attributes),
        children: translateNodes(tsInner, element.elements, paragraphContextTags),
        heading,
    };

    captureChildren?.(options.children); // TODO: For docx->doctml context switch (<...:doctml.p> tag)

    /*unused*/ attributes;

    return [new docx.Paragraph({ ...options, ...properties })];
}


export function addImplicitParagraphs(nodes: Node[], allowedTags: string[]): void {
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
