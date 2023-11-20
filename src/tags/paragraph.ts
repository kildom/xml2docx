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

import * as docx from "docx";
import { AnyObject, Attributes, undefEmpty } from "../common";
import { DocxTranslator } from "../docxTranslator";
import { Element, SpacesProcessing } from "../xml";
import { fromEnum, filterBool, FilterMode } from "../filters";
import { getIParagraphPropertiesOptions } from "./styles";

const headingTags: { [key: string]: docx.HeadingLevel } = {
    'h1': docx.HeadingLevel.HEADING_1,
    'h2': docx.HeadingLevel.HEADING_2,
    'h3': docx.HeadingLevel.HEADING_3,
    'h4': docx.HeadingLevel.HEADING_4,
    'h5': docx.HeadingLevel.HEADING_5,
    'h6': docx.HeadingLevel.HEADING_6,
    'title': docx.HeadingLevel.TITLE,
}

/*>>>
Paragraph.

The paragraph contains formatted text and images.
Any whitespaces at the beginning and end of the paragraph are removed.

You can avoid repeating the same attributes with `preserve` attribute.
Paragraphs can maintain its attributes if `preserve` attribute is set to true.
All following paragraphs without any attributes `<p>` will reuse the maintained attributes.
You can stop reusing attributes if you specify at least one attribute.


@api:Paragraph
*/
export function pTag(tr: DocxTranslator, attributes: Attributes, properties: AnyObject): any[] {
    let name = tr.element.name;
    let heading: docx.HeadingLevel | undefined = headingTags[name];
    let preserve: boolean | undefined = filterBool(attributes.preserve, FilterMode.UNDEF);
    attributes = { ...attributes };
    delete attributes.preserve;
    if (Object.keys(attributes).length === 0 && Object.keys(properties).length === 0 && tr.paragraphStylePreserved[name]) {
        attributes = tr.paragraphStylePreserved[name]!.attributes;
        properties = tr.paragraphStylePreserved[name]!.properties;
    } else {
        tr.paragraphStylePreserved[name] = undefined;
    }
    let options: docx.IParagraphOptions = {
        ...getIParagraphPropertiesOptions(tr, attributes),
        children: tr.copy().parseObjects(tr.element, SpacesProcessing.TRIM),
        heading,
    };
    if (preserve === true) {
        tr.paragraphStylePreserved[name] = { attributes, properties };
    } else if (preserve === false) {
        tr.paragraphStylePreserved[name] = undefined;
    }
    return [new docx.Paragraph({ ...options, ...properties })];
};

export function tabTag(): any[] {
    return [new docx.TextRun({ children: [new docx.Tab()] })];
}

export function brTag(): any[] {
    return [new docx.TextRun({ children: [new docx.CarriageReturn()] })];
}
