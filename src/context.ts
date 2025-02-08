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

import * as docx from 'docx';
import JSON5 from 'json5';

import { Options, Result } from './doctml';
import { DebugFileType, Dict, DocTMLError } from './common';


export class Context implements Result {

    public options: Readonly<Options> = {};
    public inputFile = ':undefined';
    public outputFile = ':undefined';
    public errors: DocTMLError[] = [];
    public output = new Uint8Array();

    public document?: docx.Document;
    public data?: any;
    public dataFile?: string;
    public input = '';

    public enumMapCache = new Map<any, Dict<string | number>>();

    public setOptions(options: Readonly<Options>) {

        // Copy basic options with defaults if needed.
        this.options = options;
        this.inputFile = options.inputFile ?? ':input';
        this.dataFile = options.dataFile ?? (options.data == null ? undefined : ':data');

        // Set output file name to default if not specified.
        if (options.outputFile == null) {
            if (this.inputFile === ':input') {
                this.outputFile = ':output';
            } else {
                let pathParts = this.inputFile!.split(/([/\\])/);
                let name = pathParts.at(-1)!;
                let nameParts = name.split('.');
                if (nameParts.length === 1) {
                    nameParts.push('docx');
                }
                nameParts[nameParts.length - 1] = 'docx';
                pathParts[pathParts.length - 1] = nameParts.join('.');
                this.outputFile = pathParts.join('');
            }
        } else {
            this.outputFile = options.outputFile;
        }

        // Read input if just file name given.
        if (options.input == null) {
            if (options.inputFile == null) {
                this.fatal('No input given.');
            }
            this.input = this.readFile(options.inputFile, false);
        } else {
            this.input = options.input;
        }

        // Read data if just data file name given.
        this.data = options.data;
        if (options.data == null && options.dataFile != null) {
            this.data = this.readFile(options.dataFile, false);
        }

        // Parse JSON5 string if needed.
        if (typeof this.data === 'string') {
            try {
                this.data = JSON5.parse(this.data);
            } catch (err) {
                this.fatal('Error parsing input data.', err);
            }
        }
    }

    public error(message: string, location: { line: number; column: number; }): void;
    public error(message: string, sourceError?: any, fatal?: boolean): void;
    public error(message: string, sourceErrorOrLocation?: any, fatal?: boolean): void {

        if (fatal === undefined
            && !(sourceErrorOrLocation instanceof Error)
            && typeof sourceErrorOrLocation === 'object'
            && sourceErrorOrLocation.line != null
            && sourceErrorOrLocation.column != null
        ) {
            let line = sourceErrorOrLocation.line;
            let column = sourceErrorOrLocation.column;
            message = message + ` (line ${line + 1}, column ${column + 1})`;
            sourceErrorOrLocation = undefined;
        }

        try {
            // Throw an error to get a stack trace.
            throw new DocTMLError(message, !!fatal, sourceErrorOrLocation);
        } catch (err) {
            this.errors.push(err as DocTMLError);
        }
    }

    public fatal(message: string, sourceError?: any): never {
        let err = new DocTMLError(message, true, sourceError);
        this.errors.push(err);
        throw err;
    }

    public writeFile(content: Uint8Array) {
        if (this.options.writeFile) {
            try {
                this.options.writeFile(this, content);
            } catch (err) {
                if (err instanceof DocTMLError) {
                    if (err !== this.errors.at(-1))
                        this.errors.push(err);
                    err.fatal = true;
                    throw err;
                } else {
                    this.fatal('Error writing output file.', err);
                }
            }
        }
    }

    public debugFile(type: DebugFileType, content: string | Uint8Array) {
        if (this.options.debugFile) {
            try {
                this.options.debugFile(this, type, content);
            } catch (err) {
                if (err instanceof DocTMLError) {
                    if (err !== this.errors.at(-1))
                        this.errors.push(err);
                    err.fatal = true;
                    throw err;
                } else {
                    this.fatal(`Error writing "${type}" debug file.`, err);
                }
            }
        }
    }

    public readFile(fileName: string, binary: false): string;
    public readFile(fileName: string, binary: true): Uint8Array;
    public readFile(fileName: string, binary: boolean): string | Uint8Array {
        if (this.options.readFile) {
            try {
                return this.options.readFile(this, fileName, binary);
            } catch (err) {
                if (err instanceof DocTMLError) {
                    if (err !== this.errors.at(-1))
                        this.errors.push(err);
                    err.fatal = true;
                    throw err;
                } else {
                    this.fatal(`Error reading "${fileName}".`, err);
                }
            }
        } else {
            this.fatal(`Error reading "${fileName}". No "readFile" callback given.`);
        }
    }
}
