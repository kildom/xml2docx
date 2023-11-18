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

import { FileChild } from "docx/build/file/file-child";
import { DocxTranslator } from "../docxTranslator";
import { SpacesProcessing } from "../xml";
import * as docx from "docx";
import { IPropertiesOptions } from "docx/build/file/core-properties";
import { AnyObject, Attributes, symbolInstance } from "../common";

export function documentTag(tr: DocxTranslator, attributes: Attributes, properties: AnyObject): any[] {
    let sections: docx.ISectionOptions[] = [];
    let paragraphStyles: docx.IParagraphStyleOptions[] = [];
    let characterStyles: docx.ICharacterStyleOptions[] = [];
    let children: FileChild[] = [];
    let options: IPropertiesOptions = {
        sections: sections,
        title: attributes.title,
        subject: attributes.subject,
        creator: attributes.creator,
        keywords: attributes.keywords,
        description: attributes.description,
        lastModifiedBy: attributes.lastModifiedBy,
        // TODO: More properties
        styles: {
            paragraphStyles,
            characterStyles,
        },
        ...properties,
    }
    for (let obj of tr.parseObjects(tr.element, SpacesProcessing.IGNORE)) {
        if (obj[symbolInstance] === 'ISectionOptions') {
            sections.push(obj);
            children = obj.children;
        } else if (obj[symbolInstance] === 'IParagraphStyleOptions') {
            paragraphStyles.push(obj);
        } else if (obj[symbolInstance] === 'ICharacterStyleOptions') {
            characterStyles.push(obj);
        } else {
            if (sections.length === 0) {
                children = [];
                sections.push({ children });
            }
            children.push(obj);
        }
    }
    return [new docx.Document(options)]
};
