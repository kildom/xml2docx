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
import { normalizeElement, translateNodes, TranslatorState } from '../translate';
import { Element, SpacesProcessing } from '../xml';
import { addImplicitParagraphs, headingTags, pTag } from './paragraph';
import { FirstConstructorParam, Mutable } from '../common';
import { tableTag } from './table';

export class ObjectContainer {
    public constructor(
        public value: any,
        public type: 'ISectionOptions' | 'IParagraphStyleOptions' | 'ICharacterStyleOptions'
    ) { }
}

export function documentTag(ts: TranslatorState, element: Element): docx.Document[] {

    let [tsInner, attributes, properties] = normalizeElement(ts, element, SpacesProcessing.IGNORE);

    addImplicitParagraphs(element.elements, [
        ...Object.keys(headingTags),
        'section', 'header', 'footer', 'table', 'p-style', 'font-style'
    ]);

    let list = translateNodes(tsInner, element.elements, {
        ...Object.fromEntries(Object.keys(headingTags).map(name => [name, pTag])),
        table: tableTag,
    });

    let sections: docx.ISectionOptions[] = [];
    let paragraphStyles: docx.IParagraphStyleOptions[] = [];
    let characterStyles: docx.ICharacterStyleOptions[] = [];
    let children: Mutable<docx.ISectionOptions['children']> = [];
    let options: FirstConstructorParam<typeof docx.Document> = {
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
