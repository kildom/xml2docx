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
import { getLicense, writeSources } from './dev';


const USAGE = `
USAGE:
    xml2docx [options] input.xml [output.docx]

Transform an XML file into a docx file.

For detailed XML file format specifications, please see the documentation
at https://kildom.github.io/xml2docx/.

Options:

-d <data.json>
    Interpret the input file as a template and use the <data.json> file for
    template input data. The data file should be formatted in JSON5 which is
    backward compatible with standard JSON format. Detailed information on
    the template syntax can be found within the documentation.
    CAUTION! ACTIVATING THIS OPTION WILL PERMIT THE EXECUTION OF ARBITRARY
             CODE FROM THE <input.xml> FILE WITHOUT LIMITATIONS. USE ONLY
             XML FILES FROM A TRUSTED SOURCE.

--debug
    Dump intermediate files alongside the output after each step of
    processing and show more verbose output in case of errors. This option
    is mainly useful when debugging the template or the tool.

--help
    Show this message.

--license
    Show license information.

--sources
    Dump source files to a '_src' directory (for debug only).
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
        } else if (arg === '--license') {
            console.log(getLicense());
            process.exit(0);
        } else if (arg === '--sources') {
            writeSources();
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
