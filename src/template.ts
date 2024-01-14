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

import { CompiledTemplate, template } from 'underscore';
import { InterceptedError, os } from './os';
import { AnyObject } from './common';

const commonUtils = {
    templateFile: '',
    dataFile: '',
    data: ({} as any),
    templateDir: '',
    include: function (fileName: string) {
        let includeFile: string;
        let templateFile: string;
        try {
            includeFile = os.path.resolve(this.templateDir, fileName);
            templateFile = os.fs.readFileSync(includeFile, 'utf-8') as string;
        } catch (ex) { throw new InterceptedError(ex, `Error reading "${fileName}" file.`); }
        try {
            return fromTemplate(includeFile, templateFile, this.dataFile, this.data);
        } catch (ex) { throw new InterceptedError(ex, `Error evaluating template from "${fileName}" include file.`); }
    }
};

export function fromTemplate(templateFile: string, templateText: string, dataFile: string, data: any): string {

    let compiled: CompiledTemplate;
    try {
        compiled = template(templateText, {
            evaluate: /<%!([\s\S]+?)%>/g,
            interpolate: /<%=([\s\S]+?)%>/g,
            escape: /<%(?![!=])([\s\S]+?)%>/g
        });
    } catch (ex) { throw new InterceptedError(ex, `Error parsing template from "${templateFile}".`); }

    try {
        let utils: AnyObject = { ...commonUtils };
        utils.templateFile = templateFile;
        utils.dataFile = dataFile;
        utils.data = data;
        utils.templateDir = os.path.dirname(templateFile);
        return compiled({ utils: utils, ...data, __utils__: utils });
    } catch (ex) {
        throw new InterceptedError(ex,
            `Error evaluating template from "${templateFile}" with data from "${dataFile}".`);
    }
}
