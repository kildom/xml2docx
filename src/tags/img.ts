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
import * as convert from '../convert';
import { Dict, dirName, splitListValues, undefEmpty } from '../common';
import { prepareElement, TranslatorState } from '../translator';
import { Element } from '../xml';
import { getMargin } from '../attrs/borders-attrs';
import { getImageInfo, ImageInfo } from '../img-info';
import { ImageFileTypes, RegularImageFileTypes } from '../enums';


const defaultImage = new Uint8Array([
    // Black PNG file
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00,
    0x01, 0x00, 0x00, 0x00, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x37, 0x6e, 0xf9, 0x24, 0x00, 0x00, 0x00, 0x0a, 0x49,
    0x44, 0x41, 0x54, 0x78, 0x01, 0x63, 0x60, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01, 0x73, 0x75, 0x01, 0x18, 0x00, 0x00,
    0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82
]);

function getFlip(value: string | undefined) {
    if (value === undefined) return undefined;
    let lower = value.toLowerCase();
    return {
        horizontal: (lower.indexOf('h') >= 0 || lower.indexOf('m') >= 0),
        vertical: lower.indexOf('v') >= 0
    };
}

function loadImage(element: Element, srcAttribute: string, dataAttribute: string, errorIfMissing: boolean, loadInfo: boolean) {

    let srcValue = element.attributes[srcAttribute];
    let dataValue = element.attributes[dataAttribute];
    let data = defaultImage;

    if (srcValue) {
        if (dataValue) {
            element.ctx.error(`Both ${srcAttribute} and ${dataAttribute} attributes are present in img tag.`, element);
        }
        data = element.ctx.readFile(dirName(element.ctx.inputFile) + srcValue, true);
    } else if (dataValue) {
        try {
            data = convert.fromBase64(dataValue);
        } catch (_) {
            element.ctx.error(`Invalid BASE-64 encoding in ${dataAttribute} attribute.`, element);
        }
    } else if (errorIfMissing) {
        element.ctx.error(`No ${srcAttribute} or ${dataAttribute} attribute in img tag.`, element);
    }

    let info: ImageInfo | undefined = undefined;

    if (loadInfo) {
        info = getImageInfo(data);
        if (!info) {
            element.ctx.error('Cannot parse image file. ' +
                'Provide valid file or all necessary attributes for this <img> element.', element);
            info = { type: 'png', width: 96, height: 96 };
        }
    }

    return { data, info };
}

/*>>> : anchor align|offset */
function getHVPosition(element: Element, name: string, alignEnum: Dict<string | number>, relEnum: Dict<string | number>) {
    return splitListValues(element, name, element.attributes[name], {
        //* `anchor` - Archon from which position is relative to. @enum:@1@
        relative: (value: string) => convert.enumeration.noErr(element, value, relEnum),
        //* `align` - Image alignment relative to archon. @enum:@0@
        align: (value: string) => convert.enumeration.noErr(element, value, alignEnum),
        //* `offset` - Offset of absolute position from the archon. @filterLengthInt
        offset: (value: string) => convert.universalMeasureInt.noErr(value, convert.UnitsPerPt.emu),
    });
    /*>
    The `align` and `offset` fields are mutually exclusive. Specify just one of them.

    You must provide both `vertical` and `horizontal` attributes or none.
    Specifying just one of them is an error.
    */
}

/*>>> : side type */
function getWrap(element:Element, name: string, margin: docx.IMargins | undefined): docx.ITextWrapping | undefined {
    let wrap = splitListValues(element, name, element.attributes[name], {
        //* `side` - Wrapping side. @enum:TextWrappingSide
        side: (value: string) => convert.enumeration.noErr(element, value, docx.TextWrappingSide),
        //* `type` - Wrapping type. @enum:TextWrappingType
        type: [
            (value: string) => convert.enumeration.noErr(element, value, docx.TextWrappingType),
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

Suggested image formats are: `JPEG` and `PNG`. The `SVG` is also supported, but some editors does not support it.
You can provide a fallback image in case the `SVG` is not supported. Use `fallback-src` and `fallback-data` attributes
for that. The `BMP` and `GIF` are also supported, but those are not recommended.

The image size is determined by the `width` and `height` attributes. If one of them is missing, the converter will try
to parse the image to find out the size keeping original aspect ratio. If both are missing, the image will be inserted
using `1px` per one image pixel which is 96 DPI. The source DPI metadata is ignored.

One of the `src` and `data` attributes is required. They are mutually exclusive, so use exactly one of them.

*/
export function imgTag(ts: TranslatorState, element: Element): any[] {

    prepareElement(ts, element, {
        tags: {},
        removeSpaces: true,
    });

    let attributes = element.attributes;

    //* src: Image source path. An absolute path or a path relative to main input file.
    //* data: Raw image data in BASE-64 encoding.
    let image = loadImage(element, 'src', 'data', true, !attributes.width || !attributes.height || !attributes.type);
    //* fallback-src: Fallback image source path.
    //* fallback-data: Raw fallback image data in BASE-64 encoding.
    let fallback = loadImage(element, 'fallbacksrc', 'fallbackdata', false, !attributes.fallbacktype);

    let widthImg = 1;
    let heightImg = 1;

    if (attributes.width && attributes.height) {
        //* Width of the image. If not provided, file will be parsed to find out the width. @@
        widthImg = convert.positiveUniversalMeasureInt(element, 'width', convert.UnitsPerPt.pt3q)!;
        //* Height of the image. If not provided, file will be parsed to find out the height. @@
        heightImg = convert.positiveUniversalMeasureInt(element, 'height', convert.UnitsPerPt.pt3q)!;
    } else {
        if (image.info!.width > 65535) {
            image.info!.height = image.info!.height * 65535 / image.info!.width;
            image.info!.width = 65535;
        }
        if (image.info!.height > 65535) {
            image.info!.width = image.info!.width * 65535 / image.info!.height;
            image.info!.height = 65535;
        }
        if (!attributes.width) {
            if (!attributes.height) {
                widthImg = convert.positiveUniversalMeasureInt.noErr(image.info!.width + 'px', convert.UnitsPerPt.pt3q)!;
                heightImg = convert.positiveUniversalMeasureInt.noErr(image.info!.height + 'px', convert.UnitsPerPt.pt3q)!;
            } else {
                heightImg = convert.positiveUniversalMeasureInt(element, 'height', convert.UnitsPerPt.pt3q)!;
                widthImg = Math.round(image.info!.width * heightImg / image.info!.height);
            }
        } else if (!attributes.height) {
            widthImg = convert.positiveUniversalMeasureInt(element, 'width', convert.UnitsPerPt.pt3q)!;
            heightImg = Math.round(image.info!.height * widthImg / image.info!.width);
        }
    }

    //* Image file type. If not provided, the converter will try to parse and detect file type. @@
    let type = convert.enumeration(element, 'type', ImageFileTypes, { 'jpeg': 'jpg' }) ?? image.info!.type;

    let transformation: docx.IMediaTransformation = {
        //* Width of the image. @@
        width: Math.max(1, widthImg),
        //* Height of the image. @@
        height: Math.max(1, heightImg),
        //* Clockwise rotation in degrees. @@
        rotation: convert.int(element, 'rotate'),
        //* Image flip. Combination of `horizontal` (mirror) and `vertical`. You can also use also short forms: `h` and `v`.
        flip: getFlip(attributes.flip),
    };

    //* Margins around the image. @@
    let margin = getMargin(element, 'margin',
        (value) => convert.positiveUniversalMeasureInt.noErr(value, convert.UnitsPerPt.emu)
    );

    let floating = undefEmpty<docx.IFloating>({
        //* Allow overlapping. @@
        allowOverlap: convert.bool(element, 'allowoverlap'),
        //* Put image behind text. @@
        behindDocument: convert.bool(element, 'behinddocument'),
        //* Layout in cell. @@
        layoutInCell: convert.bool(element, 'layoutincell'),
        //* Lock image archon in single place. @@
        lockAnchor: convert.bool(element, 'lockanchor'),
        //* Image z-index. Decides which image is on top another. @@
        zIndex: convert.int(element, 'zindex'),
        //* Horizontal position in floating mode. @@:HorizontalPositionAlign|HorizontalPositionRelativeFrom
        horizontalPosition: getHVPosition(element, 'horizontal', docx.HorizontalPositionAlign,
            docx.HorizontalPositionRelativeFrom) as docx.IHorizontalPositionOptions,
        //* Vertical position in floating mode. @@:VerticalPositionAlign|VerticalPositionRelativeFrom
        verticalPosition: getHVPosition(element, 'vertical', docx.VerticalPositionAlign,
            docx.VerticalPositionRelativeFrom) as docx.IVerticalPositionOptions,
        margins: margin,
        //* Text wrapping around the image. @@
        wrap: getWrap(element, 'wrap', margin),
    });

    let options: docx.IImageOptions;

    if (type === 'svg') {
        options = {
            type: 'svg',
            data: image.data,
            transformation,
            floating,
            fallback: {
                type: convert.enumeration(element, 'fallbacktype', RegularImageFileTypes, { 'jpeg': 'jpg' })
                    ?? fallback.info!.type,
                data: fallback.data,
            },
        };
    } else {
        options = {
            type: type,
            data: image.data,
            transformation,
            floating,
        };
    }

    return [new docx.ImageRun(options)];
}
