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
import { AnyObject, Attributes, Dict } from '../common';
import { DocxTranslator } from '../docxTranslator';
import { SpacesProcessing } from '../xml';
import { filterBool, FilterMode } from '../filters';
import { getIParagraphPropertiesOptions } from './styles';
import { simpleStyleChange } from './characters';
import { filterPreserved } from './table';

type HeadingLevelType = (typeof docx.HeadingLevel)[keyof typeof docx.HeadingLevel];

const headingTags: Dict<HeadingLevelType> = {
    'h1': docx.HeadingLevel.HEADING_1,
    'h2': docx.HeadingLevel.HEADING_2,
    'h3': docx.HeadingLevel.HEADING_3,
    'h4': docx.HeadingLevel.HEADING_4,
    'h5': docx.HeadingLevel.HEADING_5,
    'h6': docx.HeadingLevel.HEADING_6,
    'title': docx.HeadingLevel.TITLE,
};

/*>>>
Paragraph.

The paragraph contains formatted text and images.
Any whitespaces at the beginning and end of the paragraph are removed.

You can avoid repeating the same attributes with `preserve` attribute.
Paragraphs can preserve its attributes if `preserve` attribute is set to true.
All following paragraphs without any attributes will reuse the preserved attributes.
You can stop reusing attributes if you specify at least one attribute in new paragraph.

Default text format in the paragraph can be changed using attributes with the
the `font-` prefix from the [`<font>`](format.md#font) tag.

@api:Paragraph

@merge:getIParagraphPropertiesOptions
*/
export function pTag(tr: DocxTranslator, attributes: Attributes, properties: AnyObject): any[] {
    let name = tr.element.name;
    let heading: HeadingLevelType | undefined = headingTags[name];
    //* Preserve the attributes. See description above. @@
    let preserve: boolean | undefined = filterBool(attributes.preserve, FilterMode.UNDEF);
    attributes = { ...attributes };
    delete attributes.preserve;
    if (Object.keys(attributes).length === 0 && Object.keys(properties).length === 0 && tr.preserved[name]) {
        attributes = tr.preserved[name]!.attributes;
        properties = tr.preserved[name]!.properties;
    } else {
        tr.preserved[name] = undefined;
    }
    let trCopy = simpleStyleChange(tr, {}, filterPreserved('font', attributes));
    let options: docx.IParagraphOptions = {
        ...getIParagraphPropertiesOptions(tr, attributes),
        children: trCopy.parseObjects(tr.element, SpacesProcessing.TRIM),
        heading,
    };
    if (preserve === true) {
        tr.preserved[name] = { attributes, properties };
    } else if (preserve === false) {
        tr.preserved[name] = undefined;
    }
    return [new docx.Paragraph({ ...options, ...properties })];
}

/*>>>
Adds tabulation.
*/
export function tabTag(tr: DocxTranslator): any[] {
    return [new docx.TextRun({ ...tr.runOptions, children: [new docx.Tab()] })];
}

/*>>>
Adds line break without breaking the paragraph.
*/
export function brTag(tr: DocxTranslator): any[] {
    return [new docx.TextRun({ ...tr.runOptions, children: [new docx.EmptyElement('w:br')] })];
}

/*>>>
If used alone `<vwnbsp/>`, adds "zero width no-break space" and "normal space" characters which
is workaround to achieve "variable width no-break space" in docx.
If used with content inside, replaces all "no-break spaces" with "variable width no-break space" sequences.
This workaround works with a desktop Word application. It will not work in browsers and probably in other
applications.
*/
export function vwnbspTag(tr: DocxTranslator): any[] {
    let children = tr.copy({ useVarWidthNoBreakSpace: true }).parseObjects(tr.element, SpacesProcessing.PRESERVE);
    if (children.length === 0) {
        return [new docx.TextRun({ ...tr.runOptions, text: '\uFEFF ' })];
    } else {
        return children;
    }
}

/*>>>
Adds total pages count. Can be used only in header and footer.
*/
export function totalPagesTag(tr: DocxTranslator): any[] {
    return [new docx.TextRun({ ...tr.runOptions, children: [docx.PageNumber.TOTAL_PAGES] })];
}

/*>>>
Adds current page number. Can be used only in header and footer.
*/
export function pageNumberTag(tr: DocxTranslator): any[] {
    return [new docx.TextRun({ ...tr.runOptions, children: [docx.PageNumber.CURRENT] })];
}

export function createDummyParagraph(tr: DocxTranslator, children: any) {
    for (let child of children) {
        if (!(child instanceof docx.Paragraph) && !(child instanceof docx.Table)) {
            return tr.parseObjects([{
                name: 'p',
                path: tr.element.path + '/p[auto]',
                type: 'element',
                attributes: {},
                elements: tr.element.elements?.filter(
                    element => element.type !== 'element' || !element.name.endsWith(':property')
                ),
            }], SpacesProcessing.IGNORE);
        }
    }
    return children;
}
