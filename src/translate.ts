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
import { CData, Element, Node, processSpacesInPlace, SpacesProcessing, Text } from './xml';
import { AnyObject, Attributes, Dict, error } from './common';
import { TextFormat } from './tags/text';
import { documentTag } from './tags/document';

type ElementHandler = (ts: TranslatorState, element: Element) => any[];
type TextHandler = (ts: TranslatorState, text: Text) => any[];
type CDataHandler = (ts: TranslatorState, cdata: CData) => any[];
type NodeHandler = TextHandler | CDataHandler | ElementHandler;

export class TranslatorState {

    format: TextFormat;

    public applyCommonAttributes(element: Element): TranslatorState {
        return this;
    }

    public fetchCommonAttributes(element: Element): TranslatorState {
        return this;
    }

    public applyFormat(format?: TextFormat): TranslatorState {
        if (!format) return this;
        let copy = new TranslatorState(this.baseDir, this.format);
        for (let [name, value] of Object.entries(format)) {
            (copy.format as any)[name] = value;
        }
        return copy;
    }

    public constructor(
        public baseDir: string,
        format: TextFormat = {}
    ) {
        this.format = { ...format };
    }

}


export function extractProperties(element: Element) {
    let children: Node[] = [];
    let properties: Dict<Element> = Object.create(null);
    for (let node of element.elements) {
        if (node.type === 'element' && node.name.endsWith(':property')) {
            node.name = node.name.substring(0, node.name.length - 9);
            properties[node.name] = node;
        } else {
            children.push(node);
        }
    }
    element.elements = children;
    element.properties = properties;
}


export function evaluateProperties(element: Element): AnyObject {
    let result: AnyObject = Object.create(null);
    extractProperties(element);
    for (let property of Object.values(element.properties)) {
        throw new Error('Not implemented');
    }
    return result;
}



export function normalizeElement(
    ts: TranslatorState, element: Element,
    spacesProcessing: SpacesProcessing
): [TranslatorState, Attributes, AnyObject] {

    // Extract and evaluate properties
    let properties = evaluateProperties(element);
    // Convert <group>...</group> to <group#begin>...<group#end>
    flattenGroups(element.elements);
    // Process spaces
    processSpacesInPlace(element.elements, spacesProcessing);
    // Common attributes handling
    let tsInner = ts
        .applyCommonAttributes(element) // Apply common attributes that belongs to this element and return state without them.
        .fetchCommonAttributes(element); // Fetch common attributes from this element to new state.
    return [tsInner, element.attributes, properties];
}

function flattenGroupsRet(nodes: Node[]): Node[] {
    let result: Node[] = [];
    for (let node of nodes) {
        if (node.type === 'element' && node.name === 'group') {
            let begin: Element = {
                type: 'element',
                name: 'group#begin',
                attributes: node.attributes,
                properties: {},
                elements: [],
                line: node.line,
                column: node.column,
            };
            let end: Element = {
                type: 'element',
                name: 'group#end',
                attributes: {},
                properties: {},
                elements: [],
                line: node.line,
                column: node.column,
            };
            result.push(begin, ...flattenGroupsRet(node.elements), end);
        } else {
            result.push(node);
        }
    }
    return result;
}

function flattenGroups(nodes: Node[]): void {
    let result = flattenGroupsRet(nodes);
    nodes.splice(0, nodes.length, ...result);
}

export type CaptureChildren = (children: any) => void;


export function translate(root: Element, baseDir: string): docx.Document {

    let ts = new TranslatorState(baseDir);

    let list = translateNodes(ts, [root], {
        'document': documentTag,
    });

    return list[0];
}

export function translateNodes(ts: TranslatorState, nodes: Node[], tags: Dict<NodeHandler>): any[] {
    let result: any[] = [];
    let tsStack = [ts];

    for (let node of nodes) {
        if (node.type === 'text') {
            if (tags['#text']) {
                result.push(...(tags['#text'] as TextHandler)(tsStack.at(-1)!, node));
            } else {
                error('Text is not allowed in this context', node);
            }
        } else if (node.type === 'cdata') {
            if (tags['#cdata']) {
                result.push(...(tags['#cdata'] as CDataHandler)(tsStack.at(-1)!, node));
            } else {
                error('CDATA is not allowed in this context', node);
            }
        } else if (node.name === 'group#begin') {
            tsStack.push(tsStack.at(-1)!.fetchCommonAttributes(node));
        } else if (node.name === 'group#end') {
            tsStack.pop();
        } else if (tags[node.name]) {
            result.push(...(tags[node.name] as ElementHandler)(tsStack.at(-1)!, node));
        } else if (getDocxConstructor(node.name)) {
            //let constructor = getDocxConstructor(node.name);
            throw new Error('Not implemented');
        } else {
            error(`Unexpected tag '${node.name}'`, node);
        }
    }

    return result;
}

export function getDocxConstructor(name: string): any {
    if (!(name in docx)) return undefined;
    let construct = (docx as any)[name];
    if (typeof construct !== 'function') return undefined;
    return construct;
}
