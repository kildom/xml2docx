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

export interface WorkerFile {
    name: string;
    content: Uint8Array | string;
}

export enum RequestResultType {
    NONE,
    DOCX,
    ZIP,
    DEBUG, // TODO: Add debug to GUI
}

export interface WorkerEvent {
    eventId: number;
    files: WorkerFile[];
    mainFile: string;
    dataFile?: string;
    reset: boolean;
    requestResult: RequestResultType;
}

export interface FrontEndEvent {
    eventId: number;
    errors: string[];
    result?: ArrayBuffer;
    resultType: RequestResultType;
}

export function normalizeFileName(name: string) {
    let parts = name
        .split(/[\\/]+/)
        .map(p => p.trim())
        .filter(p => p && p !== '.');
    return parts.join('/');
}

export enum FileType {
    UNKNOWN,
    XML,
    JSON,
    IMAGE,
}

const fileExtensions: {[key:string]:FileType} = {
    '.png': FileType.IMAGE,
    '.gif': FileType.IMAGE,
    '.bmp': FileType.IMAGE,
    '.jpeg': FileType.IMAGE,
    '.jpg': FileType.IMAGE,
    '.jif': FileType.IMAGE,
    '.xml': FileType.XML,
    '.json': FileType.JSON,
    '.json5': FileType.JSON,
    '.js': FileType.JSON,
};

export function getFileType(name: string): FileType {
    name = normalizeFileName(name);
    name = name.split('/').at(-1) as string;
    let pos = name.lastIndexOf('.');
    if (pos < 0) return FileType.UNKNOWN;
    let ext = name.substring(pos).toLowerCase();
    return fileExtensions[ext] || FileType.UNKNOWN;
}
