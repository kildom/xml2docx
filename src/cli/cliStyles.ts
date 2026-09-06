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

import * as fs from 'node:fs';
import { printUsage } from './cliUsage';
import { loadStylesData } from '../tags/document';
import { getDocxStyles, Style } from '../docxStyles';
import { xmlEscape } from '../utils/xml';
import { getImageInfo } from '../utils/img-info';


const USAGE = `
~USAGE:~                                                    $$
    ~doctml -t styles <input>~                              $$
                                                          $$
List styles defined in DOCX or XML styles file.           $$
                                                          $$
Options:                                                  $$
                                                          $$
~<input>~                                                   $$
    Input DOCX or XML styles file.                        $$
                                                          $$
~--help~                                                    $$
    Show this message.                                    $$

You can use ~"-"~ as <input> to read the file from standard input.
`;
// TODO: "-" as output does not work.


function parseArguments() {
    let argCounter = 0;
    let args = process.argv.slice(4);
    if (args.length === 0) {
        printUsage(USAGE);
        process.exit(1);
    }
    let inputFile: string = '-';
    for (let i = 0; i < args.length; i++) {
        let arg = args[i];

        if (arg === '--help' || arg === '/?' || arg === '-h' || arg === '/h') {
            printUsage(USAGE);
            process.exit(0);
        } else if (arg.startsWith('-')) {
            throw printUsage(USAGE, `Unknown option: ${arg}`);
        } else if (argCounter === 0) {
            inputFile = arg;
            argCounter++;
        } else {
            throw printUsage(USAGE, `Unknown argument: ${arg}`);
        }
    }
    return { inputFile };
}

export function stylesMain() {
    try {
        stylesMainInner();
    } catch (err) {
        let msg = (typeof err === 'object' && err !== null && (err as any).message) ? (err as any).message : `${err}`;
        console.error(msg);
        process.exit(1);
    }
}

function stylesMainInner() {

    let args = parseArguments();
    let file = args.inputFile;
    let data = fs.readFileSync(file === '-' ? 0 : file) as Uint8Array<ArrayBuffer>;
    let view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    if (view.getUint16(0) == 0x504B) { // PK (docx document)
        showStyles(data, true);
    } else { // XML styles file
        showStyles(data, false);
    }
}

function pad(str: string, length: number, char: string = ' '): string {
    if (str.length >= length) return str;
    return str + char.repeat(length - str.length);
}

function stylesTable(styles: Style[]) {
    let cols: number[] = [10, 10];
    for (let style of styles) {
        cols[0] = Math.max(cols[0], style.id.length);
        cols[1] = Math.max(cols[1], (style.name || style.id).length);
    }
    console.log(`${pad('ID', cols[0])} ${pad('NAME', cols[1])}`);
    console.log(`${pad('', cols[0], '-')} ${pad('', cols[1], '-')}`);
    for (let style of styles) {
        console.log(`${pad(style.id, cols[0])} ${pad(style.name || style.id, cols[1])}`);
    }
}

function showStyles(data: Uint8Array, packed: boolean) {
    if (packed) {
        data = loadStylesData(data);
    }
    let externalStylesXML = new TextDecoder().decode(data);
    let styles = getDocxStyles(externalStylesXML);
    console.log('\nPARAGRAPH STYLES\n');
    stylesTable(styles.filter(x => x.type === 'paragraph'));
    console.log('\nCHARACTER STYLES\n');
    stylesTable(styles.filter(x => x.type === 'character'));
    console.log('');
}
