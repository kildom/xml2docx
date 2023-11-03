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

import * as fs from 'node:fs';
import * as path from "node:path";
import * as process from "node:process";
import * as util from 'node:util';
import * as docx from "docx";
import { template } from 'underscore';
import { convert } from './converter';
import { fromTemplate } from './template';
import { writeSources } from './dev';
import { os, setInterface } from './os';

let debugMode = false;
export let error: string[] = [];

function help() {
    console.log('Usage: xml2doc output.docx template.xml [data.json|data.xml]');
}

async function mainInner(args: string[]) {

    let outputFile = args[0];
    let templateFile = args[1];
    let dataFile = args[2];
    let templateText: string;
    let xmlText: string;

    error.push(`Could not read template file "${templateFile}".`);
    templateText = fs.readFileSync(templateFile, 'utf-8');
    error.pop();

    let templateData: any;
    if (!dataFile) {
        templateData = {};
    } else {
        let dataText: string;

        error.push(`Could not read data file "${dataFile}".`);
        dataText = fs.readFileSync(dataFile, 'utf-8');
        error.pop();

        if (dataFile.toLowerCase().endsWith('.json')) {

            error.push(`Could not parse JSON data file "${dataFile}".`);
            templateData = (new Function(`return ${dataText};`))();
            error.pop();

        } else if (dataFile.toLowerCase().endsWith('.xml')) {
            error.push('XML data file not implemeted.'); // TODO: XML data file support
            throw new Error();
        } else {
            error.push('Only XML and JSON data files allowed.');
            throw new Error();
        }
    }

    if (debugMode) {
        error.push('Could not dump debug file.');
        fs.writeFileSync(outputFile + '.data.json', JSON.stringify(templateData, null, 2));
        error.pop();
    }

    error.push(`Could not create XML from template.`);
    xmlText = fromTemplate(templateFile, templateText, dataFile || '[no data]', templateData);
    error.pop();

    if (debugMode) {
        error.push('Could not dump debug file.');
        fs.writeFileSync(outputFile + '.source.xml', xmlText);
        error.pop();
    }

    error.push('Could not convert to docx.');
    let buffer = await convert(templateFile, xmlText);
    error.pop();

    error.push(`Could not write to output file "${outputFile}".`);
    fs.writeFileSync(outputFile, buffer);
    error.pop();
}

async function main() {

    let args = process.argv.slice(2);

    while (args.length > 0 && args[0].startsWith('-')) {
        if (args[0] == '-h' || args[0] == '--help') {
            help();
            process.exit(0);
        } else if (args[0] == '-d' || args[0] == '--debug') {
            debugMode = true;
        } else if (args[0] == '--sources') {
            writeSources();
            process.exit(0);
        }
        args.shift();
    }

    if (args.length != 3 && args.length != 2) {
        help();
        process.exit(1);
    }

    try {
        await mainInner(args);
    } catch (err) {
        if (error.length) {
            for (let err of error) {
                console.error(err);
            }
        } else {
            console.error('Unexpected error!');
        }
        console.error(`${(err as any).name}: ${(err as any).message}`);
        if (debugMode) {
            throw err;
        } else if ((err as any).code === 'EBUSY') {
            console.error('Output file cannout be open in any other program!');
            process.exit(45);
        }
        process.exit(2);
    }
}

setInterface({
    error: error,
    path: {
        resolve: path.resolve,
        dirname: path.dirname,
    },
    fs: {
        readFileSync: (path: string, encoding?: 'utf-8') => fs.readFileSync(path, encoding),
        writeFileSync: fs.writeFileSync,
    }
});

main();
