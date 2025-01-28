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

export type Dict<T> = { [key: string]: T };
export type AnyObject = Dict<any>;
export type Attributes = Dict<string>;


export type DebugFileType = 'data' | 'rendered' | 'normalized'; // If macros implemented add 'expanded'

export class DocTMLError extends Error {
    constructor(
        message: string,
        public fatal: boolean,
        public sourceError: any
    ) {
        super(message);
        this.name = 'DocTMLError';
    }
}


/**
 * Extracts the directory path from a given file path.
 *
 * @param path - The path to a file.
 *               If the input path refers to a directory, the return value is unspecified.
 * @returns      The directory portion of the given file path. It always includes trailing
 *               slash (or backslash).
 */
export function dirName(path: string): string {
    // Works only on files, if path is a directory the return value in unspecified.
    let pathParts = path.split(/([/\\]+)/);
    pathParts.pop()!;
    if (pathParts.length === 0) {
        if (typeof globalThis !== 'undefined'
            && typeof globalThis.process !== 'undefined'
            && typeof globalThis.process.platform === 'string'
            && globalThis.process.platform === 'win32'
        ) {
            return '.\\';
        } else {
            return './';
        }
    }
    return pathParts.join('');
}

export function deepCopy(obj: any) {
    return JSON.parse(JSON.stringify(obj));
}
