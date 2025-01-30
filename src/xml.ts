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

import * as sax from 'sax';
import { Attributes, deepCopy, Dict } from './common';
import { Context } from './context';


export interface Element {
    ctx: Context,
    name: string | '#TEXT' | '#CDATA';
    attributes: Attributes;
    elements: Element[];
    text: string;
    line: number;
    column: number;
}


export function parse(ctx: Context): Element {

    let parser = sax.parser(true, {
        trim: false,
        normalize: true,
        lowercase: true,
        xmlns: false,
        position: true,
        noscript: true,
        unquotedAttributeValues: true,
    } as any);

    let root: Element = {
        ctx,
        name: 'ROOT',
        attributes: {},
        elements: [],
        line: 1,
        column: 1,
        text: '',
    };

    let stack = [root];
    let tagStart = {
        line: 1,
        column: 1,
    };

    parser.onopentagstart = (tag) => {
        tagStart.line = parser.line;
        tagStart.column = Math.max(1, parser.column - tag.name.length - 1);
    };

    parser.onopentag = (tag: sax.Tag) => {
        let element: Element = {
            ctx,
            name: tag.name,
            attributes: tag.attributes,
            elements: [],
            text: '',
            ...tagStart,
        };
        stack.at(-1)!.elements.push(element);
        stack.push(element);
    };

    parser.onclosetag = () => {
        stack.pop();
    };

    parser.ontext = (t: string) => {
        let text: Element = {
            ctx,
            name: '#TEXT',
            text: t,
            line: parser.line,
            column: parser.column,
            elements: [],
            attributes: {},
        };
        stack.at(-1)!.elements.push(text);
    };

    parser.oncdata = (t: string) => {
        let cdata: Element = {
            ctx,
            name: '#CDATA',
            text: t,
            line: parser.line,
            column: parser.column,
            elements: [],
            attributes: {},
        };
        stack.at(-1)!.elements.push(cdata);
    };

    parser.onerror = (e) => {
        ctx.error(e.message, parser);
        parser.resume();
    };

    parser.onprocessinginstruction = () => {
        ctx.error('Unexpected XML instruction.', parser);
    };

    parser.write(ctx.input);
    parser.close();

    if (stack.length !== 1 || stack[0] !== root) {
        ctx.error('Invalid XML parsing result.');
    }

    return root;
}

function xmlEscape(text: string) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function stringifyInner(result: string[], node: Element) {
    if (node.name === '#TEXT') {
        result.push(xmlEscape(node.text));
    } else if (node.name === '#CDATA') {
        result.push(`<![CDATA[${node.text}]]>`);
    } else {
        result.push(`<${node.name}`);
        for (let [key, value] of Object.entries(node.attributes)) {
            result.push(` ${key}="${xmlEscape(value)}"`);
        }
        if (node.elements.length > 0) {
            result.push('>');
            for (let sub of node.elements) {
                stringifyInner(result, sub);
            }
            result.push(`</${node.name}>`);
        } else {
            result.push('/>');
        }
    }
}

export function stringify(element: Element) {
    let result: string[] = [];
    for (let sub of element.elements) {
        stringifyInner(result, sub);
    }
    return result.join('');
}

export enum SpacesProcessing {
    PRESERVE,
    IGNORE,
    TRIM,
}

function trimSpacesAndNewLines(text: string) {
    return text.replace(/(?:^[ \r\n]*|[ \r\n]*$)/g, '');
}

function trimStartSpacesAndNewLines(text: string) {
    return text.replace(/^[ \r\n]*/, '');
}

function trimEndSpacesAndNewLines(text: string) {
    return text.replace(/[ \r\n]*$/, '');
}

/*
export function processSpacesInPlace(nodes: Element[] | undefined, textProcessing: SpacesProcessing) {
    if (nodes !== undefined) {
        let ret = processSpaces(nodes, textProcessing);
        nodes.splice(0, nodes.length, ...ret);
    }
}

export function processSpaces(nodes: Element[] | undefined, textProcessing: SpacesProcessing) {

    if (textProcessing === SpacesProcessing.PRESERVE || !nodes) {

        return nodes || [];

    } else if (textProcessing === SpacesProcessing.IGNORE) {

        return nodes.filter(node => node.name !== '#TEXT' || trimSpacesAndNewLines(node.text) !== '');

    } else {

        let i: number;
        let input: Element[] = nodes;
        let result: Element[] = [];
        for (i = 0; i < input.length; i++) {
            let node = input[i];
            if (node.type === 'text') {
                if (trimSpacesAndNewLines(node.text) !== '') {
                    result.push({ ...node, text: trimStartSpacesAndNewLines(node.text) });
                    i++;
                    break;
                }
            } else if (node.type === 'element' && (node.name.endsWith(':property') || node.name.startsWith('group#'))) {
                result.push(node);
            } else {
                break;
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
            } else if (node.type === 'element' && (node.name.endsWith(':property') || node.name.startsWith('group#'))) {
                result.push(node);
            } else {
                break;
            }
        }
        for (; i < input.length; i++) {
            result.push(input[i]);
        }

        result.reverse();

        return result;
    }
}*/


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

export function normalize(node: Element) {
    if (node.name.startsWith('#')) return;
    // Normalize tag and attribute names
    node.name = node.name.replace(/[_-]/g, '').toLowerCase();
    let attributes = Object.create(null);
    for (let [name, value] of Object.entries(node.attributes)) {
        attributes[name.replace(/[_-]/g, '').toLowerCase()] = value;
    }
    node.attributes = attributes;
    // Concatenate adjacent text nodes
    let lastText: Element | undefined = undefined;
    let joined = [];
    for (let sub of node.elements) {
        if (sub.name === '#TEXT') {
            if (lastText) {
                lastText.text = lastText.text + sub.text;
            } else {
                joined.push(sub);
                lastText = sub;
            }
        } else if (sub.name === '#CDATA') {
            joined.push(sub);
            lastText = undefined;
        } else {
            normalize(sub);
            joined.push(sub);
            lastText = undefined;
        }
    }
    // Separate leading or trailing space as a single text node with single space character
    node.elements.splice(0);
    for (let sub of joined) {
        if (sub.name === '#TEXT') {
            let text = sub.text;
            let trimmedEnd = text.trimEnd();
            let trimmedBoth = trimmedEnd.trimStart();
            if (trimmedBoth === '') {
                sub.text = ' ';
                node.elements.push(sub);
            } else {
                if (trimmedBoth.length < trimmedEnd.length) {
                    node.elements.push({ ...sub, text: ' ', });
                }
                sub.text = trimmedBoth;
                node.elements.push(sub);
                if (trimmedEnd.length < text.length) {
                    node.elements.push({ ...sub, text: ' ', });
                }
            }
        } else {
            node.elements.push(sub);
        }
    }
}
