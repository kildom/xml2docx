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
import { getDocxStyles } from '../docxStyles';
import { xmlEscape } from '../utils/xml';
import { getImageInfo } from '../utils/img-info';


const USAGE = `
~USAGE:~                                                    $$
    ~doctml -t embed <output.doctml> <input1> <input2> ...~ $$
                                                          $$
Create a DocTML file containing files embedded into       $$
the source code as base64 data URIs.                      $$
                                                          $$
Supported input file formats are:                         $$
 - images: PNG, JPEG, GIF, BMP, SVG                       $$
 - fonts: TTF, OTF, TTC                                   $$
 - external styles: DOCX, XML                             $$
                                                          $$
Options:                                                  $$

~<output.doctml>~
    Output DocTML file.

~<inputN>~
    Input file to embed. You can specify multiple input files.

~--help~
    Show this message.

You can use ~"-"~ as <inputN> to read the file from standard input.
You can also use ~"-"~ as <output.doctml> to write result to standard output.
`;
// TODO: "-" as output does not work.


function parseArguments() {
    let argCounter = 0;
    let args = process.argv.slice(4);
    if (args.length === 0) {
        printUsage(USAGE);
        process.exit(1);
    }
    let outputFile: string | undefined = undefined;
    let inputFiles: string[] = [];
    for (let i = 0; i < args.length; i++) {
        let arg = args[i];

        if (arg === '--help' || arg === '/?' || arg === '-h' || arg === '/h') {
            printUsage(USAGE);
            process.exit(0);
        } else if (arg.startsWith('-')) {
            throw printUsage(USAGE, `Unknown option: ${arg}`);
        } else if (argCounter === 0) {
            outputFile = arg;
            argCounter++;
        } else {
            inputFiles.push(arg);
            argCounter++;
        }
    }
    return { outputFile: outputFile!, inputFiles };
}

let externalStyles: string | undefined = undefined;
let externalStylesXML: string | undefined = undefined;
let fonts: {
    uri: string;
    name: string;
}[] = [];
let images: {
    uri: string;
    name: string;
    width: number;
    height: number;
}[] = [];

function row(...args: string[]) {
    let result = '        <tr>\n';
    for (let arg of args) {
        result += `            <td>\n                ${arg}\n            </td>\n`;
    }
    return result + '        </tr>\n';
}

export function embedMain() {
    try {
        embedMainInner();
    } catch (err) {
        let msg = (typeof err === 'object' && err !== null && (err as any).message) ? (err as any).message : `${err}`;
        console.error(msg);
        process.exit(1);
    }
}

function embedMainInner() {

    let args = parseArguments();
    for (let file of args.inputFiles) {
        let data = fs.readFileSync(file === '-' ? 0 : file) as Uint8Array;
        let view = new DataView(data.buffer, data.byteOffset, data.byteLength);
        if (view.getUint16(0) == 0x504B) { // PK (docx document)
            embedStyles(data, true);
        } else if (view.getUint32(0) == 0x00010000 && data[4] == 0x00) { // TTF
            embedFont(file, data);
        } else if (view.getUint32(0) == 0x4F54544F || view.getUint32(0) == 0x74746366) { // OTF or TTC
            embedFont(file, data);
        } else if (view.getUint32(0) == 0x89504E47 && view.getUint32(4) == 0x0D0A1A0A) { // PNG
            embedImage(file, data, 'image/png');
        } else if ((view.getUint32(0) | 0xFF) == (0xFFD8FF00 | 0xFF)) { // JPEG
            embedImage(file, data, 'image/jpeg');
        } else if (view.getUint16(0) === 0x424D) { // BMP
            embedImage(file, data, 'image/bmp');
        } else if (view.getUint32(0) === 0x47494638) { // GIF
            embedImage(file, data, 'image/gif');
        } else {
            let text = new TextDecoder().decode(data.slice(0, 1024)).trimStart().toLowerCase();
            if (text.startsWith('<')) {
                let posSvg = text.indexOf('<svg') & 0x3FFFFFFF;
                let posStyles = text.indexOf('<w:styles') & 0x3FFFFFFF;
                if (posSvg < posStyles) {
                    embedImage(file, data, 'image/svg+xml');
                } else if (posStyles < 0x20000000) {
                    embedStyles(data, false);
                } else {
                    throw new Error(`Unsupported file format: ${file}`);
                }
            } else {
                throw new Error(`Unsupported file format: ${file}`);
            }
        }
    }

    let output = '<document';
    if (externalStyles) {
        output += '\n    styles="' + externalStyles + '"\n';
    }
    output += '>\n\n';

    for (let font of fonts) {
        output += `    <embedded-font name="${xmlEscape(font.name)}" src="${xmlEscape(font.uri)}"/>\n\n`;
    }

    if (images.length > 0) {
        output += '\n    <h1>Embedded images</h1>\n';
        output += '    <table width="100%">\n';
        output += row('<b>FILE</b>', '<b>IMAGE</b>');
        for (let image of images) {
            if (image.width > image.height) {
                output += row(xmlEscape(image.name), `<img width="4cm" src="${image.uri}"/>`);
            } else {
                output += row(xmlEscape(image.name), `<img height="4cm" src="${image.uri}"/>`);
            }
        }
        output += '    </table>\n';
    }

    if (fonts.length > 0) {
        output += '\n    <h1>Embedded fonts</h1>\n';
        output += '    <table width="100%">\n';
        output += row('<b>NAME</b>', '<b>SAMPLE</b>');
        for (let font of fonts) {
            output += row(xmlEscape(font.name), `<p font.face="${xmlEscape(font.name)}" font.size="1cm">Lorem Ipsum</p>`);
        }
        output += '    </table>\n';
    }

    if (externalStyles && externalStylesXML) {
        output += '\n    <h1>Embedded styles</h1>\n';
        output += '    <table width="100%">\n';
        output += row('<b>TYPE</b>', '<b>ID</b>', '<b>NAME</b>');
        for (let style of getDocxStyles(externalStylesXML)) {
            output += row(xmlEscape(style.type), xmlEscape(style.id), xmlEscape(style.name || style.id));
        }
        output += '    </table>\n';
    }

    output += '\n</document>\n';
    if (args.outputFile === '-') {
        fs.writeFileSync(process.stdout.fd, output);
    } else {
        fs.writeFileSync(args.outputFile, output);
    }
}

function embedStyles(data: Uint8Array, packed: boolean) {
    if (externalStyles) {
        throw new Error('Only one external styles file can be embedded.');
    }
    if (packed) {
        data = loadStylesData(data);
    }
    externalStyles = createDataURI(data, 'application/xml');
    externalStylesXML = new TextDecoder().decode(data);
}

function createDataURI(data: Uint8Array, type: string): string {
    let base64 = Buffer.from(data).toString('base64');
    return `data:${type};base64,${base64}`;
}

function embedFont(name: string, data: Uint8Array) {
    if (name === '-') name = 'Standard Input';
    let m = name.match(/(?:.*[\\/])?(.*?)(?:\.(....?))?$/i);
    let ext = (m![2] || 'ttf').toLowerCase();
    fonts.push({
        name: m![1],
        uri: createDataURI(data, `font/${ext}`),
    });
}

function embedImage(file: string, data: Uint8Array, mime: string) {
    let info = getImageInfo(data);
    images.push({
        name: file,
        uri: createDataURI(data, mime),
        width: info?.width || 100,
        height: info?.height || 100,
    });
}

