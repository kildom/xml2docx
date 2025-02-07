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
import { DebugFileType, DocTMLError, generate, Options, Result } from './doctml';

const linuxASCIIArt = `
    \x1B[38;2;87;144;246m+▄\x1B[48;2;87;144;246m                \x1B[0m\x1B[38;2;87;144;246m▄\x1B[0m
    \x1B[38;2;254;254;254m\x1B[48;2;87;144;246m           ▄      \x1B[0m
    \x1B[38;2;254;254;254m\x1B[48;2;21;101;243m     ▂    ▟▘▂     \x1B[0m
    \x1B[38;2;254;254;254m\x1B[48;2;21;101;243m ▂▄▆▀Ó   ▟▘ Ó▀▆▄▂ \x1B[0m
    \x1B[38;2;254;254;254m+\x1B[48;2;10;74;189m Ć▀ł▄▂  ▟▘  ▂▄ł▀Ć \x1B[0m
    \x1B[38;2;254;254;254m+\x1B[48;2;10;74;189m     Ć ▟▘   Ć     \x1B[0m
    \x1B[38;2;254;254;254m++\x1B[48;2;7;49;128m      ▝▘          \x1B[0m
    \x1B[38;2;7;49;128m+▀\x1B[48;2;7;49;128m                \x1B[0m\x1B[38;2;7;49;128m▀\x1B[0m
    \x1B[38;2;130;130;130m        ▁▁\x1B[0m
    \x1B[38;2;130;130;130m▕▔╲ ▁ ▁ ▕ ▕╲╱▏▕\x1B[0m
    \x1B[38;2;130;130;130m▕▁╱▕ ▏▏ ▕ ▕  ▏▕▁▁\x1B[0m
    \x1B[38;2;130;130;130m    ▔ ▔\x1B[0m
    `
    .replace(/Ó/g, '\x1B[48;2;254;254;254m\x1B[38;2;21;101;243m▆\x1B[38;2;254;254;254m\x1B[48;2;21;101;243m')
    .replace(/Ć/g, '\x1B[48;2;254;254;254m\x1B[38;2;10;74;189m▆\x1B[38;2;254;254;254m\x1B[48;2;10;74;189m')
    .replace(/ł/g, '\x1B[48;2;254;254;254m\x1B[38;2;10;74;189m▂\x1B[38;2;254;254;254m\x1B[48;2;10;74;189m')
    ;

const macASCIIArt = `
    \x1B[38;5;111m▄\x1B[48;5;111m                \x1B[0m\x1B[38;5;111m▄\x1B[0m
    \x1B[38;5;15m+\x1B[48;5;111m           ▄      \x1B[0m
    \x1B[38;5;15m++\x1B[48;5;33m     ▂    ▟▘▂     \x1B[0m
    \x1B[38;5;15m++\x1B[48;5;33m ▂▄▆▀Ó   ▟▘ Ó▀▆▄▂ \x1B[0m
    \x1B[38;5;15m++\x1B[48;5;26m Ć▀ł▄▂  ▟▘  ▂▄ł▀Ć \x1B[0m
    \x1B[38;5;15m++\x1B[48;5;26m     Ć ▟▘   Ć     \x1B[0m
    \x1B[38;5;15m++\x1B[48;5;25m      ▝▘          \x1B[0m
    \x1B[38;5;25m▀\x1B[48;5;25m                \x1B[0m\x1B[38;5;25m▀\x1B[0m
    \x1B[38;5;247m        ▁▁\x1B[0m
    \x1B[38;5;247m▕▔╲ ▁ ▁ ▕ ▕╲╱▏▕\x1B[0m
    \x1B[38;5;247m▕▁╱▕ ▏▏ ▕ ▕  ▏▕▁▁\x1B[0m
    \x1B[38;5;247m    ▔ ▔\x1B[0m
    `
    .replace(/Ó/g, '\x1B[48;5;15m\x1B[38;5;33m▆\x1B[38;5;15m\x1B[48;5;33m')
    .replace(/Ć/g, '\x1B[48;5;15m\x1B[38;5;26m▆\x1B[38;5;15m\x1B[48;5;26m')
    .replace(/ł/g, '\x1B[48;5;15m\x1B[38;5;26m▂\x1B[38;5;15m\x1B[48;5;26m')
    ;

const winASCIIArt = `
    \x1B[38;2;87;144;246m+▄\x1B[48;2;87;144;246m               \x1B[0m\x1B[38;2;87;144;246m▄\x1B[0m
    \x1B[38;2;254;254;254m\x1B[48;2;87;144;246m          ▄      \x1B[0m
    \x1B[38;2;254;254;254m\x1B[48;2;21;101;243m         ▄▀      \x1B[0m
    \x1B[38;2;254;254;254m\x1B[48;2;21;101;243m ▄▄▀▀   ▄▀  ▀▀▄▄ \x1B[0m
    \x1B[38;2;254;254;254m+\x1B[48;2;10;74;189m ▀▀▄▄  ▄▀   ▄▄▀▀ \x1B[0m
    \x1B[38;2;254;254;254m+\x1B[48;2;10;74;189m      ▄▀         \x1B[0m
    \x1B[38;2;254;254;254m++\x1B[48;2;7;49;128m      ▀          \x1B[0m
    \x1B[38;2;7;49;128m+++++▀\x1B[48;2;7;49;128m               \x1B[0m\x1B[38;2;7;49;128m▀\x1B[0m
    \x1B[38;2;130;130;130m\x1B[0m
    \x1B[38;2;130;130;130m   D o c T M L\x1B[0m
    `;

const USAGE = `
~USAGE:~                                                   $$
    ~doctml [options] <input.xml> [output.docx]~           $$
                                                         $$
Transform an DocTML file into a docx file.               $$
                                                         $$
For detailed DocTML file format, please see the          $$
documentation at: ~https://kildom.github.io/doctml/~       $$
                                                         $$
Options:                                                 $$
                                                         $$
~<input.xml>~                                              $$
    Input DocTML file.                                   $$

~[output.docx]~
    Output document. By default, it is <input> with the ".docx" extension.

~-d <data.json>~
~--data <data.json>~
    Interpret the input file as a template and use the <data.json> file for
    template input data.
    ~~CAUTION!~~ ACTIVATING THIS OPTION WILL PERMIT THE EXECUTION OF ARBITRARY
             CODE FROM THE <input.xml> FILE WITHOUT LIMITATIONS. USE ONLY
             DOCTML FILES FROM A TRUSTED SOURCE.

~--docx.js~
    Enable <docx.js> tags in the input file.
    ~~CAUTION!~~ ACTIVATING THIS OPTION WILL PERMIT THE EXECUTION OF ARBITRARY
             CODE FROM THE <input.xml> FILE WITHOUT LIMITATIONS. USE ONLY
             DOCTML FILES FROM A TRUSTED SOURCE.

~--help~
    Show this message.

~--version~
    Show version information.

~--license~
    Show license information.

~--debug~
    Dump intermediate files alongside the output after each step of
    processing and show more verbose output in case of errors. This option
    is mainly useful when debugging the template or the tool.

You can use ~"-"~ as <input.xml> or <data.json> to read the file from standard
input. You can also use ~"-"~ as [output.docx] to write result to standard output.
`;


function printUsage(failed?: string): void {
    let text;
    if (process.stdout.isTTY && !failed) {
        let highlight = false;
        let aaText = process.platform.startsWith('win') ? winASCIIArt
            : process.platform.startsWith('darwin') ? macASCIIArt
                : linuxASCIIArt;
        let aaLines = aaText
            .split('\n')
            .map(x => x.trim().replace(/\+/g, ''))
            .filter(x => x.length > 0)
            ;
        text = USAGE
            .replace(/~~/g, () => { highlight = !highlight; return highlight ? '\x1B[33m' : '\x1B[0m'; })
            .replace(/~/g, () => { highlight = !highlight; return highlight ? '\x1B[38;2;87;144;246m' : '\x1B[0m'; })
            .replace(/\$\$/g, () => aaLines.shift() ?? '');
    } else {
        text = USAGE
            .replace(/~/g, '')
            .replace(/ *\$\$/g, '');
    }
    if (failed) {
        console.error('\n' + failed);
        console.log(text);
        process.exit(3);
    } else {
        console.log(text);
    }
}


function printLicense(): void {
    if (!fs.existsSync(__dirname + '/license.txt')) {
        console.error('License information not found.');
        console.error('Probably you running directly from sources.');
        process.exit(1);
    }
    console.log(fs.readFileSync(__dirname + '/license.txt', 'utf-8'));
}


function printVersion(): void {
    let loc = fs.existsSync(__dirname + '/version.json') ? '/version.json'
        : fs.existsSync(__dirname + '/../version.json') ? '/../version.json'
            : undefined;
    if (!loc) {
        console.error('Version information not found.');
        console.error('Probably you running directly from sources.');
    } else {
        let info = JSON.parse(fs.readFileSync(__dirname + loc, 'utf-8')) as {
            commit: string,
            time: number,
            tag: {
                name: string,
                commit: string,
                time: number,
            },
            dirty: boolean,
        };
        if (info.commit !== info.tag.commit) {
            console.log(`DocTML version ${info.commit} (${new Date(info.time * 1000).toLocaleString()})`);
            console.log(`    based on ${info.tag.name} (${new Date(info.tag.time * 1000).toLocaleString()})`);
        } else {
            console.log(`DocTML version ${info.tag.name} (${new Date(info.tag.time * 1000).toLocaleString()})`);
        }
        if (info.dirty) {
            console.log('    with local modifications');
        }
    }

    if (typeof ((globalThis as any).Deno) == 'object'
        && typeof ((globalThis as any).Deno.version) == 'object'
        && typeof ((globalThis as any).Deno.version.deno) == 'string'
    ) {
        console.log(`    runtime: Deno ${(globalThis as any).Deno.version.deno} with V8 ${(globalThis as any).Deno.version.v8}`);
    } else if (typeof (process) == 'object'
        && typeof (process.versions) == 'object'
        && typeof (process.versions.node) == 'string'
    ) {
        console.log(`    runtime: Node.js ${process.version} with V8 ${process.versions.v8}`);
    }
}


function parseArguments() {
    let options: Options = {};
    let debug = false;
    let argCounter = 0;
    let args = process.argv.slice(2);
    if (args.length === 0) {
        printUsage();
        process.exit(1);
    }
    for (let i = 0; i < args.length; i++) {
        let arg = args[i];
        let next = args[i + 1];

        if (arg === '-d' || arg === '--data') {
            if (options.dataFile) {
                printUsage('Only one data file allowed.');
            } else if (next === undefined) {
                printUsage('The "--data" option requires a parameter.');
            } else {
                options.dataFile = next;
                i++;
            }
        } else if (arg === '--docx.js') {
            options.docxJsEnabled = true;
        } else if (arg === '--help' || arg === '/?' || arg === '-h' || arg === '/h') {
            printUsage();
            process.exit(0);
        } else if (arg === '--license') {
            printLicense();
            process.exit(0);
        } else if (arg === '--version' || arg === '-v') {
            printVersion();
            process.exit(0);
        } else if (arg === '--debug') {
            debug = true;
        } else if (arg.startsWith('-') && arg.length > 1) {
            throw printUsage(`Unknown option: ${arg}`);
        } else if (argCounter === 0) {
            options.inputFile = arg;
            argCounter++;
        } else if (argCounter === 1) {
            options.outputFile = arg;
            argCounter++;
        } else {
            throw printUsage('Too many arguments.');
        }
    }
    return { options, debug };
}


function addCallbacks(options: Options, debug: boolean) {

    options.readFile = (result: Result, file: string, binary: boolean): Uint8Array | string => {
        return fs.readFileSync(
            file === '-' ? 0 : file,
            { encoding: binary ? null : 'utf8' });
    };

    options.writeFile = (result: Result, content: Uint8Array) => {
        fs.writeFileSync(
            result.outputFile === '-'
                ? process.stdout.fd
                : (result.outputFile ?? 'doctml-output.docx'),
            content);
    };

    if (debug) {
        options.debugFile = (result: Result, type: DebugFileType, content: string | Uint8Array) => {
            let fileName = result.outputFile;
            if (fileName === '-' || fileName == null) {
                fileName = 'doctml-output.debug';
            }
            if (fileName.match(/\.docx$/i)) {
                fileName = fileName.substring(0, fileName.length - 5);
            }
            switch (type) {
            case 'data':
                fileName += '.debug.json';
                break;
            case 'rendered':
            case 'normalized':
            case 'processed':
                fileName += `.debug.${type}.doctml`;
                break;
            default:
                fileName += `.debug.${type}.dat`;
                break;
            }
            fs.writeFileSync(fileName, content);
        };
    }
}


function printError(err: any, debug: boolean): void {
    while (err instanceof DocTMLError) {
        console.error(err.message);
        err = err.sourceError;
    }
    if (err) {
        if (debug) {
            console.error(err);
        } else {
            console.error(err.message);
        }
    }
}


async function main() {

    let args = parseArguments();
    addCallbacks(args.options, args.debug);

    if (args.options.inputFile === '-' && !args.options.outputFile) {
        args.options.outputFile = '-';
    }

    let result = await generate(args.options);

    if (result.errors.length > 0) {
        for (let err of result.errors) {
            printError(err, args.debug);
        }
        process.exit(1);
    }
}


main();
