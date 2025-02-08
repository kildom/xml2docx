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

import { DocxTranslator } from '../docxTranslator';
import * as docx from 'docx';
import { AnyObject, Attributes, Dict, requiredAttribute, splitListValues, undefEmpty } from '../common';
import { getMargin } from './borders';
import {
    fromEnum, filterBool, filterInt, FilterMode, filterLengthInt, LengthUnits, filterLengthUintNonZero, filterLengthUint
} from '../filters';


function getFlip(value: string | undefined) {
    if (value === undefined) return undefined;
    let lower = value.toLowerCase();
    return {
        horizontal: lower.indexOf('h') >= 0,
        vertical: lower.indexOf('v') >= 0
    };
}

/*>>> : anchor align|offset */
function getHVPosition(value: string, alignEnum: Dict<string | number>, relEnum: Dict<string | number>) {
    return splitListValues(value, {
        //* `anchor` - Archon from which position is relative to. @enum:@1@
        relative: (value: string) => fromEnum(value, relEnum, {}, false),
        //* `align` - Image alignment relative to archon. @enum:@0@
        align: (value: string) => fromEnum(value, alignEnum, {}, false),
        //* `offset` - Offset of absolute position from the archon. @filterLengthInt
        offset: (value: string) => filterLengthInt(value, LengthUnits.emu, FilterMode.ALL),
    });
    /*>
    The `align` and `offset` fields are mutually exclusive. Specify just one of them.

    You must provide both `vertical` and `horizontal` attributes or none.
    Specifying just one of them is an error.
    */
}

/*>>> : side type */
function getWrap(value: string | undefined, margin: docx.IMargins | undefined): docx.ITextWrapping | undefined {
    let wrap = splitListValues(value, {
        //* `side` - Wrapping side. @enum:TextWrappingSide
        side: (value: string) => fromEnum(value, docx.TextWrappingSide, {}, false),
        //* `type` - Wrapping type. @enum:TextWrappingType
        type: [
            (value: string) => fromEnum(value, docx.TextWrappingType, {}, false),
            () => docx.TextWrappingType.SQUARE,
        ],
    });
    if (wrap && margin) {
        wrap.margins = {
            distT: margin.top,
            distR: margin.right,
            distB: margin.bottom,
            distL: margin.left,
        };
    }
    return wrap as docx.ITextWrapping;
}

/*>>>
Adds image to the document.

You must put it into `<p>` element. Suggested image formats are: `JPEG` and `PNG`. It also supports `BMP` and `GIF`,
but those are not recommended.

One of the `src` and `data` attributes is required. They are mutually exclusive, so use exactly one of them.

@api:classes/ImageRun
*/
export function imgTag(tr: DocxTranslator, attributes: Attributes, properties: AnyObject): any[] {
    //* Margins around the image. @@
    let margin = getMargin(attributes.margin,
        (value, mode) => filterLengthUint(value, LengthUnits.emu, mode)
    );
    let type: 'jpg' | 'png' | 'gif' | 'bmp' = 'png';
    if (attributes.type) {
        type = fromEnum(attributes.type, { 'jpg': 'jpg', 'png': 'png', 'gif': 'gif', 'bmp': 'bmp' }, { 'jpeg': 'jpg' }, false) as any;
    } else if (attributes.src) {
        let name = attributes.src.toLowerCase();
        if (name.endsWith('.jpg') || name.endsWith('.jpeg')) {
            type = 'jpg';
        } else if (name.endsWith('.png')) {
            type = 'png';
        } else if (name.endsWith('.gif')) {
            type = 'gif';
        } else if (name.endsWith('.bmp')) {
            type = 'bmp';
        }
    }
    let options: docx.IImageOptions = {
        type,
        //* Image source path. An absolute path or a path relative to main input file.
        data: attributes.src ? tr.filter(':file', attributes.src)
            //* Raw image data in BASE-64 encoding.
            : tr.filter(':base64', attributes.data),
        transformation: {
            //* Width of the image. @@
            width: filterLengthUintNonZero(requiredAttribute(attributes, 'width'), LengthUnits.pt3q, FilterMode.EXACT),
            //* Height of the image. @@
            height: filterLengthUintNonZero(requiredAttribute(attributes, 'height'), LengthUnits.pt3q, FilterMode.EXACT),
            //* Clockwise rotation in degrees. @@
            rotation: filterInt(attributes.rotate, FilterMode.UNDEF),
            //* Image flip. Combination of `horizontal` (mirror) and `vertical`. You can also use also short forms: `h` and `v`.
            flip: getFlip(attributes.flip),
        },
        floating: undefEmpty({
            //* Allow overlapping. @@
            allowOverlap: filterBool(attributes.allowOverlap, FilterMode.UNDEF),
            //* Put image behind text. @@
            behindDocument: filterBool(attributes.behindDocument, FilterMode.UNDEF),
            //* Layout in cell. @@
            layoutInCell: filterBool(attributes.layoutInCell, FilterMode.UNDEF),
            //* Lock image archon in single place. @@
            lockAnchor: filterBool(attributes.lockAnchor, FilterMode.UNDEF),
            //* Image z-index. Decides which image is on top another. @@
            zIndex: filterInt(attributes.zIndex, FilterMode.UNDEF),
            //* Horizontal position in floating mode. @@:HorizontalPositionAlign|HorizontalPositionRelativeFrom
            horizontalPosition: getHVPosition(attributes.horizontal, docx.HorizontalPositionAlign,
                docx.HorizontalPositionRelativeFrom) as docx.IHorizontalPositionOptions,
            //* Vertical position in floating mode. @@:VerticalPositionAlign|VerticalPositionRelativeFrom
            verticalPosition: getHVPosition(attributes.vertical, docx.VerticalPositionAlign,
                docx.VerticalPositionRelativeFrom) as docx.IVerticalPositionOptions,
            margins: margin,
            //* Text wrapping around the image. @@
            wrap: getWrap(attributes.wrap, margin),
        }),
        ...properties,
    };
    return [new docx.ImageRun(options)];
}
