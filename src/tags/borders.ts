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

import * as docx from 'docx';
import { selectFirst, splitListValues } from '../common';
import {
    FilterCallback, FilterMode, LengthUnits, filterColor, filterLengthUint, filterLengthUintNonZero,
    filterPositiveUniversalMeasure, fromEnum
} from '../filters';

/**
 * Returns IBorderOptions from attribute value.
 * https://docx.js.org/api/interfaces/IBorderOptions.html
 */
/*>>> : color style size space */
export function getBorderOptions(text: string | undefined): docx.IBorderOptions | undefined {
    return splitListValues(text, {
        //* `color` - Border color. @filterColor
        color: (value: string) => filterColor(value, FilterMode.ALL),
        //* `style` - Border style. @enum:BorderStyle
        style: [
            (value: string) => fromEnum(value, docx.BorderStyle, undefined, false),
            () => docx.BorderStyle.SINGLE,
        ],
        //* `size` - Border size. @filterLengthUintNonZero
        size: (value: string) => filterLengthUintNonZero(value, LengthUnits.pt8, FilterMode.ALL),
        //* `space` - Space between border and content. @filterLengthUint
        space: (value: string) => filterLengthUint(value, LengthUnits.pt, FilterMode.ALL),
    }) as docx.IBorderOptions | undefined;
}

/**
 * Returns IBordersOptions from attribute value.
 * https://docx.js.org/api/interfaces/IBordersOptions.html
 */
/*>>> : top, left, bottom, right */
export function getBorder(value: string | undefined): docx.IBordersOptions | undefined {
    let borders = splitListValues(value, {
        //* `top` - Top border.
        top: [
            (value: string) => getBorderOptions(value),
            'At least one border is required.'
        ],
        //* `right` - Right border. Default: the same as top.
        right: (value: string) => getBorderOptions(value),
        //* `bottom` - Bottom border. Default: the same as top.
        bottom: (value: string) => getBorderOptions(value),
        //* `left` - Left border. Default: the same as right.
        left: (value: string) => getBorderOptions(value),
    }, ',');
    if (borders === undefined) return undefined;
    borders.right = selectFirst(borders.right, borders.top);
    borders.bottom = selectFirst(borders.bottom, borders.top);
    borders.left = selectFirst(borders.left, borders.right);
    return borders as docx.IBordersOptions;
    /*> Each side of the border is `@short:getBorderOptions`: @getBorderOptions */
}

/**
 * Returns margins from attribute value.
 * https://docx.js.org/api/interfaces/IMargins.html
 * ITableCellOptions
 */
/*>>> : top left bottom right
@filterLengthUint
*/
export function getMargin(value: string | undefined, filter: FilterCallback = filterPositiveUniversalMeasure as any) {
    let margin = splitListValues(value, {
        //* `top` - Top margin.
        top: [
            (value: string) => filter(value, FilterMode.ALL),
            'At least one margin is required.'
        ],
        //* `right` - Right margin. Default: the same as top.
        right: (value: string) => filter(value, FilterMode.ALL),
        //* `bottom` - Bottom margin. Default: the same as top.
        bottom: (value: string) => filter(value, FilterMode.ALL),
        //* `left` - Left margin. Default: the same as right.
        left: (value: string) => filter(value, FilterMode.ALL),
    });
    if (margin === undefined) return undefined;
    margin.right = selectFirst(margin.right, margin.top);
    margin.bottom = selectFirst(margin.bottom, margin.top);
    margin.left = selectFirst(margin.left, margin.right);
    return margin;
}
