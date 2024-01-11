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
import { CData, Text, Element, XMLError, InterceptedXMLError } from "./xml";
import { AnyObject, Attributes, setTag } from "./common";
import { brTag, pTag, tabTag } from "./tags/paragraph";
import { documentTag, headerFooterTag } from "./tags/document";
import { fallbackStyleChange, fontStyleTag } from "./tags/characters";
import { tableTag } from "./tags/table";
import { imgTag } from "./tags/img";
import { filters } from "./filters";
import { pStyleTag } from "./tags/styles";
import { sectionTag } from "./tags/section";

export type TagsSet = { [key: string]: (tr: DocxTranslator, attributes: Attributes, properties: AnyObject) => any[] };

function normalizeAttributes(attributes: Attributes): AnyObject {
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

const tags: TagsSet = {
    'document': documentTag,
    'section': sectionTag,
    'header': headerFooterTag,
    'footer': headerFooterTag,
    'p': pTag,
    'h1': pTag,
    'h2': pTag,
    'h3': pTag,
    'h4': pTag,
    'h5': pTag,
    'h6': pTag,
    'title': pTag,
    'table': tableTag,
    'img': imgTag,
    'tab': tabTag,
    'br': brTag,
    'p-style': pStyleTag,
    'font-style': fontStyleTag,
}

export class DocxTranslator extends TranslatorBase {

    public paragraphStylePreserved: {
        [key: string]: {
            attributes: Attributes,
            properties: AnyObject,
        } | undefined
    } = {};

    constructor(
        public baseDir: string,
        private runOptions: docx.IRunOptions,
        public element: Element,
        public customTags?: TagsSet
    ) {
        super();
    }

    public copy(runOptionsChanges?: docx.IRunOptions, customTags?: TagsSet) {
        return new DocxTranslator(this.baseDir, { ...this.runOptions, ...runOptionsChanges }, this.element, customTags);
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
        let oldElement = this.element;
        this.element = src;
        try {
            let currentTags = this.customTags || tags;
            if (currentTags[src.name] !== undefined) {
                let args: any[] = [this];
                let numArgs = currentTags[src.name].length;
                if (numArgs > 1) args.push(normalizeAttributes(this.getAttributes(src)));
                if (numArgs > 2) args.push(this.getProperties(src));
                return currentTags[src.name].apply(this, args as any);
            } else {
                let attr = normalizeAttributes(this.getAttributes(src));
                return fallbackStyleChange(this, attr);
            }
        } catch(err) {
            if (err instanceof XMLError) {
                throw err;
            }
            throw new InterceptedXMLError(src, err, 'Error processing XML element.');
        } finally {
            this.element = oldElement;
        }
    }

    protected createClassObject(src: Element, name: string, args: any): any[] {
        let oldElement = this.element;
        this.element = src;
        try {
            if (name === 'ParagraphStyle') {
                setTag(args[0], 'IParagraphStyleOptions');
                return args;
            } else if (name === 'CharacterStyle') {
                setTag(args[0], 'ICharacterStyleOptions');
                return args;
            } else if (name === 'Section') {
                setTag(args[0], 'ISectionOptions');
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
        } catch(err) {
            if (err instanceof XMLError) {
                throw err;
            }
            throw new InterceptedXMLError(src, err, 'Error processing XML element.');
        } finally {
            this.element = oldElement;
        }
    }

    protected singleFilter(filterName: string, value: any): any {
        if (filters[filterName] !== undefined) {
            return filters[filterName](value, this);
        }

        let construct = (docx as any)[filterName];
        if (construct && typeof construct === 'function') {
            if (typeof (value) !== 'object' || !(value instanceof Array)) {
                value = [value];
            }
            return new construct(...value);
        }

        if (filterName === 'property') {
            throw new Error('The ":property: can be used only in tag, not an object.');
        }

        throw new Error(`Unknown filter "${filterName}".`);
    }

    public translate(root: Element): docx.Document {
        let document = this.createTagObject(root);
        if (!document || document.length !== 1 || !(document[0] instanceof docx.Document)) {
            throw new Error(`Expecting exactly one <document> root element.`);
        }
        return document[0];
    }

}

export function translate(root: Element, baseDir: string): docx.Document {
    let tr = new DocxTranslator(baseDir, {}, root);
    return tr.translate(root);
}
