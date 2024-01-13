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

import { FrontEndEvent, RequestResultType, WorkerEvent, WorkerFile, normalizeFileName } from './web-common';

import { exec } from './exec';
import { printError, OS, setInterface } from './os';
import JSZip from 'jszip';


const OUTPUT_DIR = 'output/';

let files: WorkerFile[] = [];
let mainFile: string = '';
let messageQueue: WorkerEvent[] | undefined = undefined;
let modified: boolean = false;
let errors: string[] = [];


function isEqualContent(a: Uint8Array | string, b: Uint8Array | string) {
    if (typeof a === 'string' || typeof b === 'string') return a === b;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if (a[i] != b[i]) return false;
    }
    return true;
}

function writeFile(name: string, content: string | Uint8Array) {
    let file = files.find(f => f.name === name);
    if (!file) {
        modified = true;
        files.push({ name, content });
    } else {
        modified = modified || !isEqualContent(file.content, content);
        file.content = content;
    }
}

const os: OS = {
    path: {
        resolve: (...paths: string[]) => {
            return normalizeFileName(paths.join('/'));
        },
        dirname: (path: string) => {
            path = normalizeFileName(path);
            let parts = path.split('/');
            if (parts.length === 1) {
                return '.';
            } else {
                parts.pop();
                return parts.join('/');
            }
        },
    },
    fs: {
        readFileSync: (path: string, encoding?: 'utf-8') => {
            path = normalizeFileName(path);
            let file = files.find(f => f.name === path);
            if (!file) {
                throw new Error(`Cannot find file "${path}".`);
            }
            let content = file.content;
            if (encoding === 'utf-8' && typeof content !== 'string') {
                content = new TextDecoder().decode(content);
            } else if (encoding !== 'utf-8' && typeof content === 'string') {
                content = new TextEncoder().encode(content);
            }
            return content;
        },
        writeFileSync: (path: string, data: Uint8Array | string) => {
            path = normalizeFileName(path);
            writeFile(path, data);
        },
    },
    convert: {
        fromBase64: (str: string) => {
            let binary = atob(str);
            return Uint8Array.from(binary, (m) => m.codePointAt(0) as number);
        }
    },
    error: (...args: string[]) => {
        console.error(...args);
    }
};

setInterface(os);


async function onFrontEndEvent(event: WorkerEvent) {
    console.log(event);
    modified = mainFile !== event.mainFile;
    mainFile = event.mainFile;

    if (event.reset) {
        files.splice(0);
        modified = true;
    }

    for (let file of event.files) {
        writeFile(file.name, file.content);
    }

    if (modified) {
        errors = [];
        files = files.filter(file => !file.name.startsWith(OUTPUT_DIR));
        try {
            await exec({
                input: mainFile,
                output: OUTPUT_DIR + 'output.docx',
                extData: false,
                debug: false,
            });
        } catch (err) {
            printError(err, false, (message: any) => errors.push(`${message}`));
            if (errors.length === 0) {
                errors.push('Unknown error!');
            }
        }
    }

    let res: FrontEndEvent = {
        errors: errors,
        eventId: event.eventId,
        resultType: RequestResultType.NONE,
    };

    if (event.requestResult === RequestResultType.DOCX) {
        res.result = os.fs.readFileSync(OUTPUT_DIR + 'output.docx') as Uint8Array;
        res.resultType = RequestResultType.DOCX;
    } else if (event.requestResult === RequestResultType.ZIP) {
        let zip = new JSZip();
        for (let file of files) {
            zip.file(file.name, file.content);
        }
        res.result = await zip.generateAsync({ compressionOptions: { level: 9 }, type: 'uint8array' });
        res.resultType = RequestResultType.ZIP;
    }

    //await new Promise(resolve => setTimeout(resolve, 5000));

    postMessage(res);
}

async function onFrontEndEventWrapper(event: WorkerEvent) {
    if (messageQueue) {
        messageQueue.push(event);
    } else {
        messageQueue = [event];
        while (messageQueue.length > 0) {
            let nextEvent = messageQueue.shift() as WorkerEvent;
            try {
                await onFrontEndEvent(nextEvent);
            } catch (err) {
                let res: FrontEndEvent = {
                    errors: [err?.message || 'Unknown error!'],
                    eventId: nextEvent.eventId,
                    resultType: RequestResultType.NONE,
                };
                postMessage(res);
            }
        }
        messageQueue = undefined;
    }
}

onmessage = (e) => {
    console.log(e.data);
    onFrontEndEventWrapper(e.data as WorkerEvent);
    console.log('WORKER THREAD:', e.data);
};

