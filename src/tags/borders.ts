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

import * as docx from "docx";
import { getColor } from "../colors";
import { selectFirst, splitListValues } from "../common";
import { DocxTranslator } from "../docxTranslator";
import { FilterMode, LengthUnits, filterLengthUint, filterLengthUintNonZero, fromEnum } from "../filters";

function getBorderOptions(tr: DocxTranslator, text: string | undefined) {
    if (text == '0.3mm') text = text;
    return splitListValues(text, {
        color: (value: string) => getColor(value),
        style: [
            (value: string) => fromEnum(value, docx.BorderStyle, undefined, false) as docx.BorderStyle,
            () => docx.BorderStyle.SINGLE,
        ],
        size: (value: string) => filterLengthUintNonZero(value, LengthUnits.pt8, FilterMode.ALL),
        space: (value: string) => filterLengthUint(value, LengthUnits.pt, FilterMode.ALL),
    });
}

//* @sub:getBorder
export function getBorder(tr: DocxTranslator, value: string | undefined) {
    let borders = splitListValues(value, {
        top: [
            (value: string) => getBorderOptions(tr, value),
            'At least one border is required.'
        ],
        right: (value: string) => getBorderOptions(tr, value),
        bottom: (value: string) => getBorderOptions(tr, value),
        left: (value: string) => getBorderOptions(tr, value),
    }, ',');
    if (borders === undefined) return undefined;
    borders.right = selectFirst(borders.right, borders.top);
    borders.bottom = selectFirst(borders.bottom, borders.top);
    borders.left = selectFirst(borders.left, borders.right);
    return borders;
}

//* @sub:getMargins
export function getMargins(tr: DocxTranslator, value: string | undefined, filterName = ':emu'): docx.IMargins | undefined {
    let margins = splitListValues(value, {
        //* Top margin.
        top: [
            (value: string) => tr.filter(filterName, value),
            'At least one margin is required.'
        ],
        //* Right margin. Default: the same as top.
        right: (value: string) => tr.filter(filterName, value),
        //* Bottom margin. Default: the same as top.
        bottom: (value: string) => tr.filter(filterName, value),
        //* Left margin. Default: the same as right.
        left: (value: string) => tr.filter(filterName, value),
    });
    if (margins === undefined) return undefined;
    margins.right = selectFirst(margins.right, margins.top);
    margins.bottom = selectFirst(margins.bottom, margins.top);
    margins.left = selectFirst(margins.left, margins.right);
    return margins;
}
