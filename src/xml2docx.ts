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
import * as docx from "docx";

import { os, InterceptedError, setInterface } from "./os";
import { parseExtendedJSON } from "./json";
import { fromTemplate } from "./template";
import { Element, addXPathsTo, parse, stringify } from "./xml";
import { resolveAliases } from "./aliases";
import { translate } from "./docxTranslator";


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
    },
    convert: {
        fromBase64: (str: string): Uint8Array => {
            return Buffer.from(str, 'base64');
        }
    },
});

let debug: boolean = true;

async function main() {
    try {
        fs.writeFileSync('a.docx', await exec('demo/demo.xml', 'demo/demo.json', 'demo/demo.docx'));
    } catch (err) {
        let cur: any = err;

        if (err instanceof InterceptedError) {
            while (cur instanceof InterceptedError) {
                console.error(cur.message);
                cur = cur.previous;
            }
        }

        if (cur) {
            if (debug) {
                console.error(cur);
            } else {
                console.error(cur.message);
            }
        }
    }
}

main();

async function exec(templateFile: string, dataFile: string, docxFile: string, base64: boolean = false) {
    let templateText: string;
    let dataText: string;
    let data: any;
    let root: Element;
    let document: docx.Document;

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

    os.fs.writeFileSync('a.xml', stringify(root, true));
    addXPathsTo(root, '');

    try {
        document = translate(root, os.path.dirname(templateFile));
    } catch (err) { throw new InterceptedError(err, `Error translating XML to docx.js API.`) }

    try {
        return base64 ? await docx.Packer.toBase64String(document) : await docx.Packer.toBuffer(document);
    } catch (err) { throw new InterceptedError(err, `Error packing content to docx.`) }

    // TODO: In debug mode, generate JS file that creates document using docx.js API.
    //       Creating a new object: obj = new docx.SomeClass(...args); obj[constructInfoSymbol] = { className: 'SomeClass', args }
    // TODO: Filters for multiline text:
    //       1) trim, remove new lines and replace repeating whitespace
    //       2) removes common indentation and trim
    // TODO: Special type of element ":attr", that works similar to ":property", but adds string value to attributes.
    //       Useful for multiline attributes and attributes with CDATA.
    // TODO: reconsider renaming ":property" (maybe also ":attr")
    // TODO: Simplify sections, footers, headers, styles by adding new tags for it.
    //       header and footer can have attribute that tells if it is just for first page in section.
    // TODO: Check if docx.js allows reusing the same image data
}
