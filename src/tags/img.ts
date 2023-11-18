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

import { FileChild } from "docx/build/file/file-child";
import { getColor } from "../colors";
import { DocxTranslator } from "../docxTranslator";
import { Element, SpacesProcessing, XMLError } from "../xml";
import * as docx from "docx";
import { IPropertiesOptions } from "docx/build/file/core-properties";
import { AnyObject, Attributes, selectFirst, splitListValues, symbolInstance, undefEmpty } from "../common";
import { getMargins } from "./borders";
import { fromEnum, filterBool, filterInt, FilterMode, filterLengthInt, LengthUnits, filterLengthUintNonZero } from "../filters";


function getFlip(value: string | undefined) {
    if (value === undefined) return undefined;
    let lower = value.toLowerCase();
    return {
        horizontal: lower.indexOf('h') >= 0,
        vertical: lower.indexOf('v') >= 0
    };
}

function getHVPosition(tr: DocxTranslator, value: string, alignEnum: { [key: string]: string | number }, relEnum: { [key: string]: string | number }) {
    return splitListValues(value, {
        align: (value: string) => fromEnum(value, alignEnum, {}, false),
        relative: (value: string) => fromEnum(value, relEnum, {}, false),
        offset: (value: string) => filterLengthInt(value, LengthUnits.emu, FilterMode.ALL),
    });
}

function getWrap(value: string | undefined, margins: docx.IMargins | undefined): docx.ITextWrapping | undefined {
    let wrap = splitListValues(value, {
        side: (value: string) => fromEnum(value, docx.TextWrappingSide, {}, false),
        type: [
            (value: string) => fromEnum(value, docx.TextWrappingType, {}, false),
            () => docx.TextWrappingType.SQUARE,
        ],
    });
    if (wrap && margins) {
        wrap.margins = {
            distT: margins.top,
            distR: margins.right,
            distB: margins.bottom,
            distL: margins.left,
        };
    }
    return wrap as docx.ITextWrapping;
}

export function imgTag(tr: DocxTranslator, attributes: Attributes, properties: AnyObject): any[] {
    let margins = getMargins(tr, attributes.margins);
    let options: docx.IImageOptions = {
        data: attributes.src ? tr.filter(':file', attributes.src) : tr.filter(':base64', attributes.data),
        transformation: {
            width: filterLengthUintNonZero(attributes.width, LengthUnits.pt3q, FilterMode.EXACT),
            height: filterLengthUintNonZero(attributes.height, LengthUnits.pt3q, FilterMode.EXACT),
            rotation: filterInt(attributes.rotate, FilterMode.UNDEF),
            flip: getFlip(attributes.flip),
        },
        floating: undefEmpty({
            allowOverlap: filterBool(attributes.allowOverlap, FilterMode.UNDEF),
            behindDocument: filterBool(attributes.behindDocument, FilterMode.UNDEF),
            layoutInCell: filterBool(attributes.layoutInCell, FilterMode.UNDEF),
            lockAnchor: filterBool(attributes.lockAnchor, FilterMode.UNDEF),
            zIndex: filterInt(attributes.zIndex, FilterMode.UNDEF),
            horizontalPosition: getHVPosition(tr, attributes.horizontal, docx.HorizontalPositionAlign, docx.HorizontalPositionRelativeFrom) as docx.IHorizontalPositionOptions,
            verticalPosition: getHVPosition(tr, attributes.vertical, docx.VerticalPositionAlign, docx.VerticalPositionRelativeFrom) as docx.IVerticalPositionOptions,
            margins,
            wrap: getWrap(attributes.wrap, margins),
        }),
        ...properties,
    };
    return [new docx.ImageRun(options)];
}
