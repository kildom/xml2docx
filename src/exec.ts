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
import JSON5 from 'json5';

import { os, InterceptedError } from './os';
import { fromTemplate } from './template';
import { Element, normalizeDoctmlContext, parse, stringify } from './xml';
import { resolveAliases } from './aliases';
import { translate } from './new/translate';

export enum ReturnOutput {
    BUFFER = ':buffer',
    BASE64 = ':base64',
}

export interface ExecOptions {
    input: string;
    output: string | ReturnOutput;
    data?: string;
    debug: boolean;
}

export async function exec(args: ExecOptions): Promise<string | Uint8Array> {

    let inputText: string;
    try {
        inputText = os.fs.readFileSync(args.input, 'utf-8') as string;
    } catch (err) { throw new InterceptedError(err, `Error reading input file "${args.input}".`); }

    if (args.data) {
        let dataText: string;
        let data: any;

        try {
            dataText = os.fs.readFileSync(args.data, 'utf-8') as string;
        } catch (err) { throw new InterceptedError(err, `Error reading data file "${args.data}".`); }

        try {
            data = JSON5.parse(dataText);
        } catch (err) { throw new InterceptedError(err, `Error parsing file "${args.data}".`); }

        if (args.debug) {
            os.fs.writeFileSync(args.output + '.json', JSON.stringify(data, null, 4));
        }

        inputText = fromTemplate(args.input, inputText, args.data, data);

        if (args.debug) {
            os.fs.writeFileSync(args.output + '.executed.xml', JSON.stringify(data, null, 4));
        }
    }

    let xmlRoot = parse(inputText);

    xmlRoot = rootToDocument(xmlRoot);

    try {
        resolveAliases(xmlRoot);
    } catch (err) { throw new InterceptedError(err, 'Error resolving aliases.'); }

    if (args.debug) {
        os.fs.writeFileSync(args.output + '.aliased.xml', stringify(xmlRoot, true));
    }

    normalizeDoctmlContext(xmlRoot);

    let document: docx.Document;

    try {
        document = translate(xmlRoot, os.path.dirname(args.input));
    } catch (err) { throw new InterceptedError(err, 'Error translating XML to docx.js API.'); }

    let result: string | Uint8Array;

    try {
        if (args.output === ':base64') {
            result = await docx.Packer.toBase64String(document);
        } else if (typeof Buffer !== 'undefined') {
            result = await docx.Packer.toBuffer(document);
        } else {
            let blob = await docx.Packer.toBlob(document);
            result = new Uint8Array(await blob.arrayBuffer());
        }
    } catch (err) { throw new InterceptedError(err, 'Error packing content to docx.'); }

    if (args.output !== ':buffer' && args.output !== ':base64') {
        try {
            os.fs.writeFileSync(args.output, result);
        } catch (err) { throw new InterceptedError(err, `Error writing to output file "${args.output}".`); }
    }

    return result;
}

function rootToDocument(xmlRoot: Element): Element {
    if (xmlRoot.elements.length === 1 && xmlRoot.elements[0].type === 'element' && xmlRoot.elements[0].name === 'document') {
        return xmlRoot.elements[0];
    } else {
        let document: Element = {
            type: 'element',
            name: 'document',
            attributes: {},
            properties: {},
            elements: xmlRoot.elements,
            line: 0,
            column: 1,
        };
        return document;
    }
}

