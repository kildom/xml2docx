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

import { AnyObject } from "./common";
import { CData, Element, InterceptedXMLError, Text, SpacesProcessing, XMLError, processSpaces } from "./xml";

export abstract class TranslatorBase {

    protected abstract createTextObject(child: Text): any[];
    protected abstract createCDataObject(child: CData): any[];
    protected abstract createTagObject(src: Element): any[] | null;
    protected abstract createClassObject(src: Element, name: string, args: any): any[];
    protected abstract singleFilter(src: Element, filterName: string, value: any): any;

    public filter(src: Element, filters: string[] | string, value: any, allowUndefined: boolean = false) {
        if (allowUndefined && value === undefined) {
            return undefined;
        }
        if (typeof (filters) === 'string') {
            filters = filters.split(':');
            filters.shift();
        }
        for (let name of [...filters].reverse()) {
            try {
                value = this.singleFilter(src, name, value);
            } catch (err) {
                if (err instanceof XMLError) {
                    throw err;
                }
                throw new InterceptedXMLError(src, err, `Error in "${name}" filter.`);
            }
        }
        return value;
    }

    protected extractName(input: string | Element) {
        if (typeof (input) !== 'string') input = input.name;
        return input.split(':')[0];
    }

    protected checkNoAttributes(element: Element) {
        if (Object.keys(element.attributes || {}).length != 0) {
            throw new XMLError(element, 'This element cannot have attributes.');
        }
    }

    public getAttributes(element: Element) {
        let obj: AnyObject = {};
        for (let [key, value] of Object.entries({ ...(element.attributes || {}) })) {
            obj[this.extractName(key)] = this.filter(element, key, value);
        }
        return obj;
    }

    public getProperties(element: Element): AnyObject {
        let result: AnyObject = {};
        for (let child of element.elements || []) {
            if (child.type === 'element') {
                let names = child.name.split(':');
                if (names.length > 1 && names.at(-1) == 'property') {
                    result[names[0]] = this.parseValue(child, names.slice(0, names.length - 1).join(':'));
                }
            }
        }
        return result;
    }

    protected parseValue(element: Element, name: string = element.name) {
        let filters = name.split(':');
        name = filters.shift() as string;

        if (filters.at(-1) === '_') {
            filters.pop();
            let attributes = this.getAttributes(element);
            let spacesAttr = attributes['spaces'] as string || 'IGNORE';
            let spaces: SpacesProcessing;
            if (spacesAttr.trim().toUpperCase() === 'IGNORE') {
                spaces = SpacesProcessing.IGNORE;
            } else if (spacesAttr.trim().toUpperCase() === 'PRESERVE') {
                spaces = SpacesProcessing.PRESERVE;
            } else if (spacesAttr.trim().toUpperCase() === 'TRIM') {
                spaces = SpacesProcessing.TRIM;
            } else {
                throw new XMLError(element, 'Invalid spaces attribute.');
            }
            let objects = this.parseObjects(element, spaces);
            return this.filter(element, filters, objects);
        }

        let children = element.elements || [];
        let result: any;

        if (children.length == 1 && children[0].type === 'text') {

            this.checkNoAttributes(element);
            result = children[0].text;

        } else if (children.length == 1 && children[0].type === 'cdata') {

            this.checkNoAttributes(element);
            result = children[0].cdata;

        } else {

            children = processSpaces(children, SpacesProcessing.IGNORE);

            if (children.length == 0 && Object.keys(element.attributes || {}).length == 0) {

                result = '';

            } else if (children.length > 0 && children[0].type === 'element' && this.extractName(children[0]) === '_') {

                this.checkNoAttributes(element);
                let arr: any[] = [];
                for (let child of children) {
                    if (child.type === 'element' && this.extractName(child.name) === '_') {
                        let value = this.parseValue(child);
                        arr.push(value);
                    } else {
                        throw new XMLError(child, 'Expecting only items in array.');
                    }
                }
                result = arr;

            } else {

                let obj = this.getAttributes(element);
                for (let child of children) {
                    if (child.type == 'element') {
                        let value = this.parseValue(child);
                        obj[this.extractName(child)] = value;
                    } else {
                        throw new XMLError(child, 'Expecting only elements.');
                    }
                }
                result = obj;
            }
        }

        return this.filter(element, filters, result);
    }

    public parseObjects(container: Element, spaces: SpacesProcessing): any[] {

        let result: any[] = [];
        let children = processSpaces(container.elements, spaces);

        for (let child of children) {
            if (child.type === 'instruction') {
                throw new XMLError(child, 'Unexpected XML instruction.');
            } else if (child.type === 'text') {
                result.push(...this.createTextObject(child));
            } else if (child.type === 'cdata') {
                result.push(...this.createCDataObject(child));
            } else {
                let names = child.name.split(':');
                if (names.length < 2 || names.at(-1) !== 'property') {
                    result.push(...this.createObject(child));
                }
            }
        }

        return result;
    }

    private createObject(src: Element) {
        let tag = this.createTagObject(src);
        if (tag !== null) {
            return tag;
        }
        let args = this.parseValue(src);
        if (typeof (args) !== 'object' || !(args instanceof Array)) {
            args = [args];
        }
        return this.createClassObject(src, this.extractName(src.name), args);
    }

};

