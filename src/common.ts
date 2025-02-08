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

export type Dict<T> = { [key: string]: T };
export type AnyObject = Dict<any>;
export type Attributes = Dict<string>;

const symbolTag: unique symbol = Symbol('instance');

export function setTag<T extends object, T2>(obj: T, tag: T2): void {
    (obj as any)[symbolTag] = tag;
}

export function isTag<T2>(obj: any, tag: T2): boolean {
    return typeof obj === 'object' && obj[symbolTag] === tag;
}

export function getTag<T2>(obj: any): T2 | undefined {
    if (typeof obj === 'object') {
        return obj[symbolTag] as T2;
    } else {
        return undefined;
    }
}

export function undefEmpty<T extends object>(obj: T): T | undefined {
    for (let value of Object.values(obj)) {
        if (value !== undefined) {
            return obj;
        }
    }
    return undefined;
}

export function requiredAttribute(attributes: Attributes, name: string): string {
    if (attributes[name] === undefined) {
        throw new Error(`This element requires "${name}" attribute.`);
    }
    return attributes[name];
}


export type SplitListMatcher = (value: string) => any;
export type SplitListDefault = () => any;

export function splitListValues(
    value: string | undefined, matchers: Dict<SplitListMatcher | [SplitListMatcher, SplitListDefault | string]>,
    split?: ',' | ' '
) {
    if (value === undefined) return undefined;
    let arr = value.trim().split(split === ' ' ? /\s+/ : split === ',' ? /\s*[,;]\s*/ : /(?:\s*[,;]\s*|\s+)/);
    let result: AnyObject = {};
    outerLoop:
    for (let item of arr) {
        for (let [name, matcher] of Object.entries(matchers)) {
            if (name in result) continue;
            matcher = typeof (matcher) === 'function' ? [matcher, ''] : matcher;
            let m = matcher[0](item);
            if (m !== undefined) {
                result[name] = m;
                continue outerLoop;
            }
        }
        throw new Error(`Invalid list item ${item}.`);
    }
    for (let [name, matcher] of Object.entries(matchers)) {
        if ((name in result) || typeof (matcher) === 'function') {
            continue;
        } else if (typeof (matcher[1]) === 'string') {
            throw new Error(matcher[1]);
        } else if (typeof (matcher[1]) === 'function') {
            result[name] = matcher[1]();
        }
    }
    return result; // TODO: Use more this function in more places
}

export function selectFirst<T>(...args: (T | undefined)[]): T | undefined {
    for (let a of args) {
        if (a !== undefined) {
            return a;
        }
    }
    return undefined;
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

export type Mutable<T> = {
    -readonly [P in keyof T]: T[P];
};

export type FirstConstructorParam<T> = T extends new (arg1: infer P, ...args: any[]) => any ? P : never;
