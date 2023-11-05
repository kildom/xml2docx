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

import * as xmlJs from 'xml-js';
import { InterceptedError } from './os';

export interface Element {
    type: 'element';
    name: string;
    attributes?: { [key: string]: string };
    elements?: Node[];
    path: string;
}

export interface Text {
    type: 'text';
    text: string;
    path: string;
}

export interface CData {
    type: 'cdata';
    cdata: string;
    path: string;
}

export interface Instruction {
    type: 'instruction';
    name: string;
    instruction: string;
    path: string;
}

export type Node = Element | Text | CData | Instruction;

export class XMLError extends Error {
    constructor(node: Node, message: string) {
        super(message + ` [at ${node.path}]`);
    }
}

export class InterceptedXMLError extends InterceptedError {
    public constructor(node: Node, previous: any, message: string) {
        super(previous, message + ` [at ${node.path}]`);
    }
}

interface PathTagState {
    first: Node;
    count: number;
};

export function addXPathsTo(xml: Element, path: string) {
    let index = 0;
    let tagStates = new Map<string, PathTagState>();
    for (let node of xml.elements || []) {
        let name = node.type === 'element' ? node.name : node.type.toUpperCase();
        if (tagStates.has(name)) {
            let state = tagStates.get(name);
            node.path = `${path}/${name}[${state!.count}]`;
            if (state!.count === 1) {
                state!.first.path += '[0]';
            }
            state!.count++;
        } else {
            node.path = path + '/' + name;
            tagStates.set(name, {
                first: node,
                count: 1,
            });
        }
    }
    for (let node of xml.elements || []) {
        if (node.type === 'element') {
            addXPathsTo(node, node.path);
        }
    }
}

export function parse(xmlText: string, addXPaths: boolean, singleRoot: boolean): Element {
    let xml = xmlJs.xml2js(xmlText, {
        ignoreComment: true,
        captureSpacesBetweenElements: true,
    });
    let res: Element;
    if (singleRoot) {
        let elements = (xml.elements as Node[]).filter(node => !(node.type === 'text' && node.text.trim() === ''));
        if (elements.length > 1) {
            throw new XMLError(elements[1], 'Only one root element expected.');
        } else if (elements.length === 0) {
            throw new XMLError({ type: 'text', path: '', text: '' }, 'Only one root element expected.');
        } else if (elements[0].type !== 'element') {
            throw new XMLError(elements[0], 'XML element expected at the root of document.');
        }
        res = elements[0];
    } else {
        res = {
            type: 'element',
            name: 'ROOT',
            path: '',
            elements: xml.elements,
        }
    }
    if (addXPaths) {
        addXPathsTo(res, '');
    }
    return res;
}

export function stringify(element: Element, singleRoot: boolean) {
    if (singleRoot) {
        let root: Element = {
            type: 'element',
            name: 'ROOT',
            path: '',
            elements: [element],
        }
        return xmlJs.js2xml(root, { compact: false })
    } else {
        return xmlJs.js2xml(element, { compact: false })
    }
}

export enum SpacesProcessing {
    PRESERVE,
    IGNORE,
    TRIM,
};

function trimSpacesAndNewLines(text: string) {
    return text.replace(/(?:^[ \r\n]*|[ \r\n]*$)/g, '');
}

function trimStartSpacesAndNewLines(text: string) {
    return text.replace(/^[ \r\n]*/, '');
}

function trimEndSpacesAndNewLines(text: string) {
    return text.replace(/[ \r\n]*$/, '');
}

export function processSpaces(nodes: Node[] | undefined, textProcessing: SpacesProcessing) {

    if (textProcessing === SpacesProcessing.PRESERVE || !nodes) {

        return nodes || [];

    } else if (textProcessing === SpacesProcessing.IGNORE) {

        return nodes.filter(node => node.type != 'text' || trimSpacesAndNewLines(node.text) !== '');

    } else {

        let i;
        let input: Node[] = nodes;
        let result: Node[] = [];
        for (i = 0; i < input.length; i++) {
            let node = input[i];
            if (node.type === 'text') {
                if (trimSpacesAndNewLines(node.text) !== '') {
                    result.push({ ...node, text: trimStartSpacesAndNewLines(node.text) });
                    i++;
                    break;
                }
            } else {
                result.push(node);
            }
        }
        for (; i < input.length; i++) {
            result.push(input[i]);
        }

        result.reverse();

        input = result;
        result = [];
        for (i = 0; i < input.length; i++) {
            let node = input[i];
            if (node.type === 'text') {
                if (trimSpacesAndNewLines(node.text) !== '') {
                    result.push({ ...node, text: trimEndSpacesAndNewLines(node.text) });
                    i++;
                    break;
                }
            } else {
                result.push(node);
            }
        }
        for (; i < input.length; i++) {
            result.push(input[i]);
        }

        result.reverse();

        return result;
    }
}

export function deepCopy(obj: any) {
    return JSON.parse(JSON.stringify(obj));
}

export function mergeElements(base: Element, addition: Element): Element {
    base = deepCopy(base);
    for (let [key, value] of Object.entries(addition.attributes || {})) {
        base.attributes = base.attributes || {};
        base.attributes[key] = value;
    }
    for (let node of addition.elements || []) {
        base.elements = base.elements || [];
        base.elements.push(deepCopy(node));
    }
    return base;
}
