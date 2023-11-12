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

import { TranslatorBase } from "./translatorBase";
import { CData, Text, Element, XMLError, InterceptedXMLError, SpacesProcessing } from "./xml";
import { FileChild } from "docx/build/file/file-child";
import { IPropertiesOptions } from "docx/build/file/core-properties";
import { os } from "./os";
import { parseExtendedJSON } from "./json";
import { AnyObject, symbolInstance, undefEmpty } from "./common";
import { getColor } from "./colors";
import { ITableCellMarginOptions } from "docx/build/file/table/table-properties/table-cell-margin";
import { pTag } from "./tags/paragraph";
import { documentTag } from "./tags/document";
import { fallbackStyleChange, fontTag, underlineTag } from "./tags/characters";
import { tableTag, tdTag, trTag } from "./tags/table";
import { imgTag } from "./tags/img";
import { filters } from "./filters";

function normalizeAttributes(attributes: AnyObject): AnyObject {
    let result: AnyObject = {};
    for (let key in attributes) {
        let norm = key
            .replace(/(?:[a-z][A-Z]|[a-zA-Z][0-9]|[0-9][a-zA-Z])/g, m => m[0] + '-' + m[1])
            .replace(/(?:[a-z][A-Z]|[a-zA-Z][0-9]|[0-9][a-zA-Z])/g, m => m[0] + '-' + m[1])
            .split(/[_-]/)
            .map((x, i) => i === 0 ? x.toLowerCase() : (x[0] || '').toUpperCase() + x.substring(1).toLowerCase())
            .join('');
        result[norm] = attributes[key];
    }
    return result;
}


const tags: { [key: string]: (tr: DocxTranslator, src: Element, attributes: AnyObject, properties: AnyObject) => any[] } = {
    'document': documentTag,
    'p': pTag,
    'h1': pTag,
    'h2': pTag,
    'h3': pTag,
    'h4': pTag,
    'h5': pTag,
    'h6': pTag,
    'title': pTag,
    'font': fontTag,
    'u': underlineTag,
    'underline': underlineTag,
    'table': tableTag,
    'tr': trTag,
    'td': tdTag,
    'img': imgTag,
}

export class DocxTranslator extends TranslatorBase {

    public paragraphStylePreserved: {
        [key: string]: {
            attributes: AnyObject,
            properties: AnyObject,
        } | undefined
    } = {};

    constructor(
        public baseDir: string,
        private runOptions: docx.IRunOptions
    ) {
        super();
    }

    public copy(runOptionsChanges?: docx.IRunOptions) {
        return new DocxTranslator(this.baseDir, { ...this.runOptions, ...runOptionsChanges });
    }

    private createFromText(text: string) {
        let options: docx.IRunOptions = { ...this.runOptions, text };
        return [new docx.TextRun(options)];
    }

    protected createTextObject(child: Text): any[] {
        let textPlain = child.text.replace(/[ \r\n]+/g, ' ');
        return this.createFromText(textPlain);
    }

    protected createCDataObject(child: CData): any[] {
        return this.createFromText(child.cdata);
    }

    protected createTagObject(src: Element): any[] | null {
        if (tags[src.name] !== undefined) {
            let args: any[] = [this, src];
            let numArgs = tags[src.name].length;
            if (numArgs > 2) args.push(normalizeAttributes(this.getAttributes(src)));
            if (numArgs > 3) args.push(this.getProperties(src));
            return tags[src.name].apply(this, args as any);
        } else {
            return fallbackStyleChange(this, src);
        }
    }

    protected createClassObject(src: Element, name: string, args: any): any[] {

        if (name === 'ParagraphStyle') {
            args[0][symbolInstance] = 'IParagraphStyleOptions';
            return args;
        } else if (name === 'CharacterStyle') {
            args[0][symbolInstance] = 'ICharacterStyleOptions'
            return args;
        } else if (name === 'Section') {
            args[0][symbolInstance] = 'ISectionOptions'
            args[0].children = args[0].children || [];
            return args;
        } else if (name === 'TotalPages') {
            return [new docx.TextRun({ ...this.runOptions, children: [docx.PageNumber.TOTAL_PAGES] })];
        } else if (name == 'CurrentPageNumber') {
            return [new docx.TextRun({ ...this.runOptions, children: [docx.PageNumber.CURRENT] })];
        }

        let construct = (docx as any)[name];
        if (!construct || typeof construct !== 'function') {
            throw new XMLError(src, `Unknown tag "${name}".`);
        }
        return [new construct(...args)];
    }

    protected singleFilter(src: Element, filterName: string, value: any): any {
        if (filters[filterName] !== undefined) {
            return filters[filterName](value, src, this);
        }

        let construct = (docx as any)[filterName];
        if (construct && typeof construct === 'function') {
            if (typeof (value) !== 'object' || !(value instanceof Array)) {
                value = [value];
            }
            return new construct(...value);
        }

        if (filterName === 'property') {
            throw new XMLError(src, 'The ":property: can be used only in tag, not an object.');
        }

        throw new XMLError(src, `Unknown filter "${filterName}".`);
    }

    public translate(root: Element): docx.Document {
        return documentTag(this, root)[0] as docx.Document;
    }

}

export function translate(root: Element, baseDir: string): docx.Document {
    let tr = new DocxTranslator(baseDir, {});
    return tr.translate(root);
}
