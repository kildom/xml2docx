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

import * as pako from 'pako';


export class ZipEntry {

    constructor(
        public fileName: string,
        public size: number,
        private data: Uint8Array,
        private compressed: boolean,
        private crc: number,
    ) { }

    public read(): Uint8Array {
        if (!this.compressed) {
            return this.data;
        }
        try {
            let zlib = new Function('return require("node:zlib")')();
            let buffer = zlib.inflateRawSync(this.data) as Buffer;
            return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
        } catch (_e) {
            // skip exceptions, use pako instead
        }
        let dec = new pako.Inflate({ raw: true });
        dec.push(this.data, true);
        if (dec.err || !dec.result) {
            throw new Error('ZIP: Failed to decompress data: ' + dec.msg);
        }
        return dec.result as Uint8Array;
    }
}


export function unZip(data: Uint8Array, fileFilter?: (filename: string) => boolean | null | undefined): ZipEntry[] {
    let view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    let offset = readCentralDirectoryOffset(view);
    let result: ZipEntry[] = [];
    while (offset < view.byteLength) {
        let signature = view.getUint32(offset, true);
        if (signature === 0x06054B50) {
            break;
        } else if (signature !== 0x02014b50) {
            throw new Error('ZIP: Invalid central directory signature or unsupported format');
        }
        let fileNameLength = view.getUint16(offset + 28, true);
        let fileNameBin = data.slice(offset + 46, offset + 46 + fileNameLength);
        let fileName = [...fileNameBin].map((b) => String.fromCharCode(b)).join('');
        let commentLength = view.getUint16(offset + 32, true);
        let extraFieldLength = view.getUint16(offset + 30, true);
        let entryLength = 46 + fileNameLength + extraFieldLength + commentLength;
        let flags = view.getUint16(offset + 8, true);
        if (flags & 0x0041) {
            // skip encrypted files
            offset += entryLength;
            continue;
        }
        if (fileFilter) {
            let filterResult = fileFilter(fileName);
            if (filterResult) {
                // process this entry
            } else if (filterResult === false) {
                // skip this entry
                offset += entryLength;
                continue;
            } else {
                // stop processing entries
                break;
            }
        }
        // let version = view.getUint16(offset + 6, true); - not used
        let method = view.getUint16(offset + 10, true);
        if (method !== 0 && method !== 8) {
            throw new Error('ZIP: Unsupported compression method ' + method);
        }
        let crc = view.getUint32(offset + 16, true);
        let compressedSize = view.getUint32(offset + 20, true);
        let uncompressedSize = view.getUint32(offset + 24, true);
        let localHeaderOffset = view.getUint32(offset + 42, true);
        let localHeaderSignature = view.getUint32(localHeaderOffset, true);
        if (localHeaderSignature !== 0x04034b50) {
            throw new Error('ZIP: Invalid local header signature');
        }
        let localFileNameLength = view.getUint16(offset + 26, true);
        let localExtraFieldLength = view.getUint16(offset + 28, true);
        let localEntryLength = 30 + localFileNameLength + localExtraFieldLength;
        let dataOffset = localHeaderOffset + localEntryLength;
        /*console.log(
            '\n',
            fileName, '\n',
            'version', view.getUint16(offset + 6, true),
            'flags', flags,
            'method', method,
            'crc', crc,
            'compressedSize', compressedSize,
            'uncompressedSize', uncompressedSize,
            'entryLength', entryLength,
            'localHeaderOffset', localHeaderOffset,
            'dataOffset', '0x' + dataOffset.toString(16),
        );*/
        offset += entryLength;
        result.push(new ZipEntry(
            fileName,
            uncompressedSize,
            data.slice(dataOffset, dataOffset + compressedSize),
            method === 8, crc));
    }
    return result;
}


function readCentralDirectoryOffset(view: DataView): number {
    for (let i = view.byteLength - 22; i >= 0; i--) {
        if (view.getUint32(i, true) === 0x06054B50) {
            let centralDirectorySize = view.getUint32(i + 12, true);
            let centralDirectoryOffset = i - centralDirectorySize;
            if (centralDirectoryOffset <= 0) {
                throw new Error('ZIP: Invalid central directory offset');
            }
            return centralDirectoryOffset;
        }
    }
    throw new Error('ZIP: End of central directory record not found');
}
