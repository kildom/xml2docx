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

import { DocxTranslator } from '../docxTranslator';
import { SpacesProcessing } from '../xml';
import * as docx from 'docx';
import { AnyObject, Attributes, FirstConstructorParam, Mutable, getTag, isTag, setTag } from '../common';
import { fromEnum } from '../filters';
import { HeaderFooterPage } from '../enums';
import { createDummyParagraph } from './paragraph';


function addHeaderFooterToSection(section: Mutable<docx.ISectionOptions>, obj: docx.Header | docx.Footer) {
    let isFooter = obj instanceof docx.Footer;
    let page = getTag<HeaderFooterPage>(obj);
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
        }
    }
}


/*>>>
Top level document element.
*/
export function documentTag(tr: DocxTranslator, attributes: Attributes, properties: AnyObject): any[] {
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
        //* Last modified by name in document properties.
        lastModifiedBy: attributes.lastModifiedBy,
        // TODO: More properties
        styles: {
            paragraphStyles,
            characterStyles,
        },
        ...properties,
    };
    for (let obj of tr.parseObjects(tr.element, SpacesProcessing.IGNORE)) {
        if (isTag(obj, 'ISectionOptions')) {
            sections.push(obj);
            children = obj.children;
        } else if (isTag(obj, 'IParagraphStyleOptions')) {
            paragraphStyles.push(obj);
        } else if (isTag(obj, 'ICharacterStyleOptions')) {
            characterStyles.push(obj);
        } else {
            if (sections.length === 0) {
                children = [];
                sections.push({ children });
            }
            if ((obj instanceof docx.Header) || (obj instanceof docx.Footer)) {
                addHeaderFooterToSection(sections.at(-1) as Mutable<docx.ISectionOptions>, obj);
            } else {
                children.push(obj);
            }
        }
    }
    return [new docx.Document(options)];
}


/*>>>
Page header or footer.
*/
export function headerFooterTag(tr: DocxTranslator, attributes: Attributes, properties: AnyObject): any[] {
    tr = tr.copy();
    let children = tr.parseObjects(tr.element, SpacesProcessing.IGNORE);
    children = createDummyParagraph(tr, children);
    let result: docx.Header | docx.Footer;
    if (tr.element.name === 'header') {
        result = new docx.Header({ children, ...properties });
    } else {
        result = new docx.Footer({ children, ...properties });
    }
    //* On which page this header or footer will be displayed. @enum:HeaderFooterPage
    //*
    //* Using `first` page automatically enables title page in current section.
    setTag(result, fromEnum(attributes.page || HeaderFooterPage.DEFAULT, HeaderFooterPage));
    return [result];
}
