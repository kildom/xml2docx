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
import { AnyObject, undefEmpty } from "../common";
import { DocxTranslator } from "../docxTranslator";
import { Element, SpacesProcessing } from "../xml";
import { fromEnum } from "../filters";
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

export function pTag(tr: DocxTranslator, src: Element, attributes: AnyObject, properties: AnyObject): any[] {
    let heading: docx.HeadingLevel | undefined = headingTags[src.name];
    let preserve: boolean | undefined = tr.filter(src, ':bool', attributes.preserve, true);
    attributes = { ...attributes };
    delete attributes.preserve;
    if (Object.keys(attributes).length === 0 && Object.keys(properties).length === 0 && tr.paragraphStylePreserved[src.name]) {
        attributes = tr.paragraphStylePreserved[src.name]!.attributes;
        properties = tr.paragraphStylePreserved[src.name]!.properties;
    } else {
        tr.paragraphStylePreserved[src.name] = undefined;
    }
    let options: docx.IParagraphOptions = {
        ...getIParagraphPropertiesOptions(tr, src, attributes),
        children: tr.copy().parseObjects(src, SpacesProcessing.TRIM),
        heading,
    };
    if (preserve === true) {
        tr.paragraphStylePreserved[src.name] = { attributes, properties };
    } else if (preserve === false) {
        tr.paragraphStylePreserved[src.name] = undefined;
    }
    return [new docx.Paragraph({ ...options, ...properties })];
};

export function tabTag(tr: DocxTranslator, src: Element, attributes: AnyObject, properties: AnyObject): any[] {
    return [new docx.TextRun({ children: [new docx.Tab()] })];
}

export function brTag(tr: DocxTranslator, src: Element, attributes: AnyObject, properties: AnyObject): any[] {
    return [new docx.TextRun({ children: [new docx.CarriageReturn()] })];
}
