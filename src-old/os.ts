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

export interface OS {
    path: {
        resolve(...paths: string[]): string;
        dirname(path: string): string;
    },
    fs: {
        readFileSync(path: string, encoding?: 'utf-8'): string | Uint8Array;
        writeFileSync(path: string, data: Uint8Array | string): void;
    },
    convert: {
        fromBase64(str: string): Uint8Array;
    },
    error: (...args: string[]) => void; // TODO: use it instead of console or callbacks
}

export let os: OS;

export function setInterface(newOs: OS) {
    os = newOs;
}

export class InterceptedError extends Error {
    public constructor(public previous: any, message: string) {
        super(message);
    }
}

export function printError(err: any, debug: boolean, callback?: (message: any) => void): void {
    callback = callback || console.error;
    while (err instanceof InterceptedError) {
        callback(err.message);
        err = err.previous;
    }
    if (err) {
        if (debug) {
            callback(err);
        } else {
            callback(err.message);
        }
    }
}
