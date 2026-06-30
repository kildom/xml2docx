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

import * as sax from 'sax';
import { Attributes, Dict } from './common';

const gifSignature = 0x47494638;
const pngSignature = 0x89504E47;
const bmpSignature = 0x424D0000;
const bmpSignatureMask = 0xFFFF0000;
const jpegSignature = 0xFFD8FF00;
const jpegSignatureMask = 0xFFFFFF00;

export interface ImageInfo {
    type: 'png' | 'gif' | 'bmp' | 'jpg' | 'svg';
    width: number;
    height: number;
}

function getGifSize(view: DataView): ImageInfo {
    return {
        type: 'gif',
        width: view.getUint16(6, true),
        height: view.getUint16(8, true),
    };
}

function getPngSize(view: DataView): ImageInfo {
    return {
        type: 'png',
        width: view.getUint32(16, false),
        height: view.getUint32(20, false),
    };
}

function getBmpSize(view: DataView): ImageInfo {
    let size = view.getUint32(14, true);
    if (size === 12) {
        return {
            type: 'bmp',
            width: view.getUint16(18, true),
            height: view.getUint16(20, true),
        };
    } else {
        return {
            type: 'bmp',
            width: view.getUint32(18, true),
            height: view.getUint32(22, true),
        };
    }
}

function getJpegSize(view: DataView): ImageInfo {
    let offset = 2;
    while (offset < view.byteLength) {
        let marker = view.getUint16(offset);
        if (marker >= 0xFFC0 && marker <= 0xFFCF && marker !== 0xFFC4 && marker !== 0xFFC8 && marker !== 0xFFCC) {
            return {
                type: 'jpg',
                height: view.getUint16(offset + 5),
                width: view.getUint16(offset + 7),
            };
        }
        offset += 2 + view.getUint16(offset + 2);
    }
    throw new Error('Invalid JPEG image');
}

const svgPointsPerUnit: Dict<number> = {
    cap: 12,
    ch: 8,
    em: 16,
    ex: 8,
    ic: 12,
    lh: 16,
    rcap: 12,
    rch: 8,
    rem: 16,
    rex: 8,
    ric: 12,
    rlh: 16,
    vh: 5,
    vw: 5,
    vmax: 5,
    vmin: 5,
    vb: 5,
    vi: 5,
    cqw: 5,
    cqh: 5,
    cqi: 5,
    cqb: 5,
    cqmin: 5,
    cqmax: 5,
    px: 72 / 96,
    cm: 7200 / 254,
    mm: 720 / 254,
    q: 720 / 254 / 4,
    in: 72,
    pc: 12,
    pt: 1,
    pi: 12,
    '': 72 / 96,
    '%': 5,
};

function parseSvgLength(value: string | undefined): number {
    let result: number = NaN;
    let match = (value ?? '').match(/^\s*([0-9.]+)\s*([a-z%]*)\s*$/i);
    if (!match) {
        return result;
    }
    let unit = match[2].toLowerCase();
    if (unit in svgPointsPerUnit) {
        result = parseFloat(match[1]) * svgPointsPerUnit[unit] / 72 * 96;
    }
    return result;
}

function getSvgSize(view: DataView): ImageInfo {
    let text = new TextDecoder().decode(view);
    let svgTagStart = text.indexOf('<svg');
    let svgTagEnd = text.indexOf('>', svgTagStart);
    if (svgTagStart < 0 || svgTagStart > 1000 || svgTagEnd < 0) {
        throw new Error('Invalid SVG image');
    }
    let svgElementText = text.slice(svgTagStart, svgTagEnd) + '/>';

    let parser = sax.parser(true, {
        trim: false,
        normalize: true,
        lowercase: true,
        xmlns: false,
        position: true,
        noscript: true,
        unquotedAttributeValues: true,
    } as any);

    let attributes: Attributes = {};

    parser.onopentag = (tag: sax.Tag) => {
        if (tag.name === 'svg') {
            attributes = { ...tag.attributes } as Attributes;
        }
    };

    parser.write(svgElementText);
    parser.close();

    // Get viewBox width and height
    let boxItems = (attributes.viewBox ?? '')?.split(/[\s,]+/);
    let boxWidth = Math.max(1e-9, parseFloat(boxItems[2]));
    let boxHeight = Math.max(1e-9, parseFloat(boxItems[3]));
    if (isNaN(boxWidth)) {
        if (isNaN(boxHeight)) {
            boxWidth = 100;
            boxHeight = 100;
        } else {
            boxWidth = boxHeight;
        }
    } else if (isNaN(boxHeight)) {
        boxHeight = boxWidth;
    }

    let width = parseSvgLength(attributes.width);
    let height = parseSvgLength(attributes.height);

    if (isNaN(width)) {
        if (isNaN(height)) {
            width = boxWidth;
            height = boxHeight;
        } else {
            width = height * boxWidth / boxHeight;
        }
    } else if (isNaN(height)) {
        height = width * boxHeight / boxWidth;
    }

    return {
        type: 'svg',
        width: width,
        height: height,
    };
}

export function getImageInfo(image: BufferSource): ImageInfo | undefined {
    try {
        let view: DataView;
        let result: ImageInfo;

        if (image instanceof ArrayBuffer) {
            view = new DataView(image);
        } else {
            view = new DataView(image.buffer, image.byteOffset, image.byteLength);
        }

        let signature = view.getUint32(0);

        if (signature === gifSignature) {
            result = getGifSize(view);
        } else if (signature === pngSignature) {
            result = getPngSize(view);
        } else if ((signature & bmpSignatureMask) === (bmpSignature & bmpSignatureMask)) {
            result = getBmpSize(view);
        } else if ((signature & jpegSignatureMask) === (jpegSignature & jpegSignatureMask)) {
            result = getJpegSize(view);
        } else {
            result = getSvgSize(view);
        }

        if (result.width <= 0 || result.height <= 0
            || result.width > 1e12 || result.height > 1e12
            || isNaN(result.width) || isNaN(result.height)
        ) {
            return undefined;
        }

        return result;

    } catch (_) {
        // All errors should be treated as unsupported format
    }

    return undefined;
}
