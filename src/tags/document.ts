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
import { Element } from '../xml';
import { TranslatorState, processChildren } from '../translator';
import { headingTags } from './p';
import { FirstConstructorParam, Mutable } from '../common';
import { fontStyleTag } from './font-style';
import { pStyleTag } from './p-style';
import { tableTag } from './table';
import { headerFooterTag, sectionTag } from './section';
import { HeaderFooterPage } from '../enums';

export class ObjectContainer {
    public constructor(
        public type: 'ISectionOptions' | 'IParagraphStyleOptions' | 'ICharacterStyleOptions' | 'default' | 'even' | 'first',
        public value: any
    ) { }
}

export function documentTag(ts: TranslatorState, element: Element): docx.Document {

    let list = processChildren(ts, element, {
        tags: {
            ...headingTags,
            table: tableTag,
            fontstyle: fontStyleTag,
            pstyle: pStyleTag,
            section: sectionTag,
            header: headerFooterTag,
            footer: headerFooterTag,
        },
        implicitTag: 'p',
        removeSpaces: true,
    });

    let attributes = element.attributes;

    let sections: Mutable<docx.ISectionOptions>[] = [];
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
            } else if ((obj.value instanceof docx.Header) || (obj.value instanceof docx.Footer)) {
                addHeaderFooterToSection(sections.at(-1)!, obj.value, obj.type as HeaderFooterPage);
            }
        } else {
            if (sections.length === 0) {
                children = [];
                sections.push({ children });
            }
            children.push(obj);
        }
    }

    return new docx.Document(options);
}


function addHeaderFooterToSection(section: Mutable<docx.ISectionOptions>, obj: docx.Header | docx.Footer,
    page: HeaderFooterPage
) {
    let isFooter = obj instanceof docx.Footer;
    if (isFooter) {
        let footers = (section.footers || {}) as Mutable<Exclude<typeof section.footers, undefined>>;
        section.footers = footers;
        switch (page) {
        case HeaderFooterPage.DEFAULT:
            footers.default = obj;
            break;
        case HeaderFooterPage.EVEN:
            footers.even = obj;
            break;
        case HeaderFooterPage.FIRST:
            section.properties = section.properties || {};
            (section.properties as Mutable<typeof section.properties>).titlePage = true;
            footers.first = obj;
            break;
        }
    } else {
        let headers = (section.headers || {}) as Mutable<Exclude<typeof section.headers, undefined>>;
        section.headers = headers;
        switch (page) {
        case HeaderFooterPage.DEFAULT:
            headers.default = obj;
            break;
        case HeaderFooterPage.EVEN:
            headers.even = obj;
            break;
        case HeaderFooterPage.FIRST:
            section.properties = section.properties || {};
            (section.properties as Mutable<typeof section.properties>).titlePage = true;
            headers.first = obj;
            break;
        }
    }
}
