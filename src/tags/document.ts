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
import { FirstConstructorParam, Mutable, undefEmpty } from '../common';
import { fontStyleTag } from './font-style';
import { pStyleTag } from './p-style';
import { tableTag } from './table';
import { headerFooterTag, sectionTag } from './section';
import { HeaderFooterPage } from '../enums';
import * as convert from '../convert';

export class ObjectContainer {
    public constructor(
        public type: 'ISectionOptions'
            | 'IParagraphStyleOptions'
            | 'ICharacterStyleOptions'
            | 'FontOptions'
            | 'default'
            | 'even'
            | 'first',
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
            embeddedfont: embeddedFontTag,
        },
        implicitTag: 'p',
        removeSpaces: true,
    });

    let attributes = element.attributes;

    let sections: Mutable<docx.ISectionOptions>[] = [];
    let paragraphStyles: docx.IParagraphStyleOptions[] = [];
    let characterStyles: docx.ICharacterStyleOptions[] = [];
    let children: Mutable<docx.ISectionOptions['children']> = [];
    let fonts: Mutable<FirstConstructorParam<typeof docx.Document>['fonts']> = [];

    for (let obj of list) {

        if (obj instanceof ObjectContainer) {
            if (obj.type === 'ISectionOptions') {
                sections.push(obj.value);
                children = obj.value.children;
                continue;
            } else if (obj.type === 'IParagraphStyleOptions') {
                paragraphStyles.push(obj.value);
                continue;
            } else if (obj.type === 'ICharacterStyleOptions') {
                characterStyles.push(obj.value);
                continue;
            } else if (obj.type === 'FontOptions') {
                fonts.push(obj.value);
                continue;
            }
        }

        if (sections.length === 0) {
            children = [];
            sections.push({ children });
        }

        if (obj instanceof ObjectContainer) {
            if ((obj.value instanceof docx.Header) || (obj.value instanceof docx.Footer)) {
                addHeaderFooterToSection(sections.at(-1)!, obj.value, obj.type as HeaderFooterPage);
            }
        } else {
            children.push(obj);
        }
    }

    return new docx.Document({
        sections: sections,
        title: attributes.title,
        subject: attributes.subject,
        creator: attributes.creator,
        keywords: attributes.keywords,
        description: attributes.description,
        lastModifiedBy: attributes.lastmodifiedby,
        background: undefEmpty({
            color: convert.color(element, 'background'),
        }),
        customProperties: (!attributes.customproperties
            ? undefined
            : attributes.customproperties.split(/(.*?=(?:\\.|.)*?(?:,|$))/)
                .map(x => x.trim())
                .filter(x => x)
                .map(x => x
                    .split(/(^.*?)=/)
                    .slice(1)
                )
                .filter(x => x.length)
                .map(x => ({
                    name: x[0].replace(/\\(.)/g, '$1'),
                    value: x[1].replace(/\\(.)/g, '$1'),
                }))),
        revision: convert.uint(element, 'revision'),
        styles: {
            paragraphStyles,
            characterStyles,
        },
        fonts: undefEmpty(fonts),
    });
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

function embeddedFontTag(ts: TranslatorState, element: Element): ObjectContainer[] {
    let fonts: Mutable<FirstConstructorParam<typeof docx.Document>['fonts']> = [];
    let data = convert.src(element, 'src', true);
    fonts.push({
        name: convert.mandatory(element, 'name'),
        characterSet: convert.enumeration(element, 'charset', docx.CharacterSet),
        data: Buffer.from(data),
    });
    return fonts.map(x => ({type: 'FontOptions', value: x}));
}
