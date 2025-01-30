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


import * as docx from 'docx';

import { renderTemplate } from './template';
import { DocTMLError, DebugFileType } from './common';
import { Context } from './context';
import { normalize, parse, stringify } from './xml';
import { rootTag } from './tags/root';
import { TranslatorState } from './translator';

export { DocTMLError, DebugFileType }

export interface Options {
    input?: string;
    inputFile?: string;
    data?: any;
    dataFile?: string;
    outputFile?: string;
    docxJsEnabled?: boolean;
    debugFile?: (result: Result, type: DebugFileType, content: string | Uint8Array) => void;
    readFile?: (result: Result, file: string, binary: boolean) => Uint8Array | string;
    writeFile?: (result: Result, content: Uint8Array) => void;
}

export interface Result {
    options: Options;
    inputFile: string;
    outputFile: string;
    errors: DocTMLError[];
    output: Uint8Array;
}

export async function generate(options: Options): Promise<Result> {

    let ctx: Context = new Context();

    try {

        ctx.setOptions(options);

        // Output debugging data file.
        if (ctx.data != null && ctx.options.debugFile) {
            ctx.debugFile('data', JSON.stringify(ctx.data, null, 4));
        }

        if (ctx.data != null) {
            // Render template if data provided.
            ctx.input = renderTemplate(ctx, ctx.input, ctx.inputFile);
            // Output debugging rendered file.
            ctx.debugFile('rendered', ctx.input);
        }

        let rootNode = parse(ctx);

        // Process macros.
        // Macros are not currently implemented, but may be in future.

        // Normalize spaces, tag and attribute names in the document.
        normalize(rootNode);
        if (ctx.options.debugFile) {
            ctx.debugFile('normalized', stringify(rootNode));
        }

        let document = rootTag(new TranslatorState(ctx), rootNode);

        if (ctx.options.debugFile) {
            ctx.debugFile('processed', stringify(rootNode));
        }

        if (typeof Buffer !== 'undefined') {
            ctx.output = await docx.Packer.toBuffer(document);
        } else {
            let blob = await docx.Packer.toBlob(document);
            ctx.output = new Uint8Array(await blob.arrayBuffer());
        }

        ctx.writeFile(ctx.output);

    } catch (err) {

        if (err instanceof DocTMLError) {
            // Ignore DocTMLError errors since they are already in the errors array.
        } else {
            throw err;
        }

    }

    return ctx;
}
