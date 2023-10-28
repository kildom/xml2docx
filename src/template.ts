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

import { template } from "underscore";
import { os } from './os';

const commonUtils = {
    templateFile: '',
    dataFile: '',
    data: ({} as any),
    templateDir: '',
    include: function (fileName: string) {
        os.error.push(`Could not read include file "${fileName}".`);
        let includeFile = os.path.resolve(this.templateDir, fileName);
        let templateFile = os.fs.readFileSync(includeFile, 'utf-8') as string;
        os.error.pop();
        os.error.push(`Could not create XML from template.`);
        let xmlText = fromTemplate(includeFile, templateFile, this.dataFile, this.data);
        os.error.pop();
        return xmlText;
    }
};

export function fromTemplate(templateFile: string, templateText: string, dataFile: string, data: any) {

    os.error.push(`Could not parse template "${templateFile}".`);
    let compiled = template(templateText);
    os.error.pop();

    os.error.push(`Could not execute template "${templateFile}" with data from "${dataFile}".`);
    let utils:{[key:string]:any} = {...commonUtils};
    utils.templateFile = templateFile;
    utils.dataFile = dataFile;
    utils.data = data;
    utils.templateDir = os.path.dirname(templateFile);
    let result = compiled({ utils: utils, ...data, __utils__: utils });
    os.error.pop();

    return result;
}
