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

import * as path from "node:path";
import * as fs from "node:fs";

import { os, InterceptedError, setInterface } from "./os";
import { parseExtendedJSON } from "./json";
import { fromTemplate } from "./template";
import { Element, parse } from "./xml";
import { resolveAliases } from "./aliases";
import { translate } from "./translate";


setInterface({
    path: {
        resolve: path.resolve,
        dirname: path.dirname,
    },
    fs: {
        readFileSync: (path: string, encoding?: 'utf-8') => fs.readFileSync(path, encoding),
        writeFileSync: fs.writeFileSync,
    },
    error: (...args: any[]) => {
        console.error(args);
    }
});


async function main() {
    try {
        await exec('demo/demo.xml', 'demo/demo.json', 'demo/demo.docx');
    } catch (err) {
        if (err instanceof InterceptedError) {
            let cur: Error | undefined = err;
            while (cur instanceof InterceptedError) {
                console.error(cur.message);
                cur = cur.previous;
            }
            if (cur) {
                console.error(cur.message);
            }
        }
    }
}

main();

async function exec(templateFile: string, dataFile: string, docxFile: string) {
    let templateText: string;
    let dataText: string;
    let data: any;
    let root: Element;

    try {
        dataText = os.fs.readFileSync(dataFile, 'utf-8') as string;
    } catch (err) { throw new InterceptedError(err, `Error reading file "${dataFile}".`); }

    try {
        data = parseExtendedJSON(dataText);
    } catch (err) { throw new InterceptedError(err, `Error parsing file "${dataFile}".`); }

    try {
        templateText = os.fs.readFileSync(templateFile, 'utf-8') as string;
    } catch (err) { throw new InterceptedError(err, `Error reading file "${templateFile}".`); }

    let xmlText = fromTemplate(templateFile, templateText, dataFile, data);

    try {
        root = parse(xmlText, true, true);
    } catch (err) { throw new InterceptedError(err, `Error parsing XML.`) }

    try {
        resolveAliases(root);
    } catch (err) { throw new InterceptedError(err, `Error resolving aliases.`) }

    translate(root);
}
