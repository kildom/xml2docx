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

import { template } from 'underscore';
import { dirName } from './common';
import { Context } from './context';


class TemplateUtils {
    public templateDir: string;
    public inputFile: string;
    public inputDir: string;
    public dataFile: string;
    public dataDir: string;
    public data: any;

    constructor(
        public ctx: Context,
        public templateFile: string
    ) {
        this.templateDir = dirName(this.templateFile);
        this.inputFile = ctx.inputFile;
        this.inputDir = dirName(this.inputFile);
        this.dataFile = ctx.dataFile!;
        this.dataDir = dirName(this.dataFile);
        this.data = ctx.data;
    }

    public include(fileName: string): string {
        let template = this.ctx.readFile(fileName, false) as string;
        let text = renderTemplate(this.ctx, template, fileName);
        return text;
    }

}

export function renderTemplate(ctx: Context, input: string, inputFile: string): string {

    let compiled: ReturnType<typeof template>;
    try {
        compiled = template(input, {
            evaluate: /<%!([\s\S]+?)%>/g,
            interpolate: /<%=([\s\S]+?)%>/g,
            escape: /<%(?![!=])([\s\S]+?)%>/g
        });
    } catch (err) {
        ctx.fatal(`Error parsing template from "${inputFile}".`, err);
    }

    try {
        let utils = new TemplateUtils(ctx, inputFile);
        return compiled({ utils: utils, ...ctx.data, __utils__: utils });
    } catch (err) {
        ctx.fatal(`Error evaluating template from "${inputFile}" with data from "${ctx.dataFile}".`, err);
    }
}
