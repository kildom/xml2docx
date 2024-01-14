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

import { printError } from './os';
import { setNodeJsOsInterface } from './osNode';
import { ExecOptions, exec } from './exec';


const USAGE = `
USAGE:
    xml2docx [options] input.xml [output.docx]

Convert XML file to docx file. See https://kildom.github.io/xml2docx/ for
XML file format documentation.

Options:

    -d <data.json>
        Tread the input file as a template and use <data.json> file as
        a template input data. The data file is in JSON format. See the
        documentation for more details about template syntax.
        WARNING: Setting this option will execute arbitrary code from the
                 <input.xml> file without any restrictions. You must have
                 this file from a trusted source.

    --debug
        Dump intermediate files alongside the output after each step of
        processing and show more verbose output in case of errors. This
        option is mainly useful when debugging the template or the tool.

    --help
        Show this message.
`;

function printUsage(failed?: string): void {
    if (failed) {
        console.error(failed);
        console.error(USAGE);
        process.exit(3);
    } else {
        console.log(USAGE);
    }
}

function parseArguments(): ExecOptions {
    let input: string | undefined;
    let output: string | undefined;
    let data: string | undefined;
    let debug = false;
    let argCounter = 0;
    let dataJsonArg = false;
    for (let arg of process.argv.slice(2)) {
        if (dataJsonArg) {
            data = arg;
            dataJsonArg = false;
        } else if (arg === '-d') {
            if (data) {
                throw printUsage('Only one data file allowed.');
            }
            dataJsonArg = true;
        } else if (arg === '--debug') {
            debug = true;
        } else if (arg === '--help' || arg === '/?' || arg === '-h') {
            printUsage();
            process.exit(0);
        } else if (argCounter === 0) {
            input = arg;
            argCounter++;
        } else if (argCounter === 1) {
            output = arg;
            argCounter++;
        } else {
            throw printUsage('Too many arguments.');
        }
    }
    if (!input) {
        throw printUsage('No input file provided.');
    }
    if (!output) {
        output = input.replace(/\.xml$/, '') + '.docx';
    }
    return { input, output, data, debug };
}

async function main() {
    let args = parseArguments();
    try {
        await exec(args);
    } catch (err) {
        printError(err, args.debug);
        process.exit(1);
    }
}

setNodeJsOsInterface();
main();
