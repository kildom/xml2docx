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

import { Element } from './xml';


export type Dict<T> = { [key: string]: T };
export type AnyObject = Dict<any>;
export type Attributes = Dict<string>;


export type DebugFileType = 'data' | 'rendered' | 'normalized' | 'processed'; // If macros implemented add 'expanded'

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

export type Mutable<T> = {
    -readonly [P in keyof T]: T[P];
};


export type FirstConstructorParam<T> = T extends new (arg1: infer P, ...args: any[]) => any ? P : never;

export function removeShallowUndefined(object: AnyObject) {
    for (let key of [...Object.keys(object)]) {
        if (object[key] === undefined) {
            delete object[key];
        }
    }
}

export function selectUndef<T>(a: any, b: T): T | undefined;
export function selectUndef<T>(a: any, b: any, c: T): T | undefined;
export function selectUndef<T>(a: any, b: any, c: any, d: T): T | undefined;
export function selectUndef<T>(...args: (T | undefined)[]): T | undefined {
    let last: T | undefined = undefined;
    for (let a of args) {
        last = a;
        if (a === undefined) {
            return a;
        }
    }
    return last;
}

export type SplitListMatcher = (value: string) => any;
export type SplitListDefault = () => any;

/** Split a list of values into an object.
 *
 * The matchers will convert list items into properties.
 *
 * If the matcher is a function, it will be used to convert list item into output property value.
 * It returns undefined if the value does not match current property.
 * If there are no matches for this property, the property will not be present in the output object.
 *
 * If the matcher is an array of two functions, the second will be used as default value for the property.
 *
 * If the matcher is as array of two functions and a string, and there are no matches, the string will be used
 * as an error message.
 *
 * @param value Value to convert
 * @param matchers Dictionary of matchers
 * @param split List splitter character
 * @returns New object
 */
export function splitListValues(
    element: Element, name: string, value: string | undefined,
    matchers: Dict<SplitListMatcher | [SplitListMatcher, SplitListDefault] | [SplitListMatcher, SplitListDefault, string]>,
    split?: ',' | ' '
) {
    if (value === undefined) return undefined;
    let arr = value.trim().split(split === ' ' ? /\s+/ : split === ',' ? /\s*[,;]\s*/ : /(?:\s*[,;]\s*|\s+)/);
    let result: AnyObject = {};
    outerLoop:
    for (let item of arr) {
        for (let [name, matcher] of Object.entries(matchers)) {
            if (name in result) continue;
            let matcherFunc = typeof (matcher) === 'function' ? matcher : matcher[0];
            let m = matcherFunc(item);
            if (m !== undefined) {
                result[name] = m;
                continue outerLoop;
            }
        }
        element.ctx.error(`Invalid list item '${item}' in "${name}" attribute on "${element.name}" tag.`, element);
    }
    for (let [name, matcher] of Object.entries(matchers)) {
        if ((name in result) || typeof (matcher) === 'function') {
            continue;
        } else if (typeof (matcher[2]) === 'string') {
            element.ctx.error(`${matcher[2]} in "${name}" attribute on "${element.name}" tag.`, element);
            result[name] = matcher[1]();
        } else if (typeof (matcher[1]) === 'function') {
            result[name] = matcher[1]();
        }
    }
    return result;
}

export function undefEmpty<T>(obj: T | undefined): T | undefined {
    if (obj !== undefined) {
        for (let value of Object.values(obj as object)) {
            if (value !== undefined) {
                return obj;
            }
        }
    }
    return undefined;
}
