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
import { splitListValues } from '../common';
import { Element } from '../xml';

// #region SingleBorder

/**
 * Returns IBorderOptions from attribute value.
 * https://docx.js.org/api/interfaces/IBorderOptions.html
 */
/*>>> : color style size space */
export function getSingleBorder(element: Element, name: string, value?: string): docx.IBorderOptions | undefined {
    return splitListValues(element, name, value, {
        //* `color` - Border color. @filterColor
        color: (value: string) => convert.color.noErr(value),
        //* `style` - Border style. @enum:BorderStyle
        style: [
            (value: string) => convert.enumeration.noErr(element, value, docx.BorderStyle),
            () => docx.BorderStyle.SINGLE,
        ],
        //* `size` - Border size. @filterLengthUintNonZero
        size: (value: string) => convert.positiveUniversalMeasureInt.noErr(value, convert.UnitsPerPt.pt8), // Is zero allowed
        //* `space` - Space between border and content. @filterLengthUint
        space: (value: string) => convert.positiveUniversalMeasureInt.noErr(value, convert.UnitsPerPt.pt),
    }) as docx.IBorderOptions | undefined;
}

// #endregion

/**
 * Returns IBordersOptions from attribute value.
 * https://docx.js.org/api/interfaces/IBordersOptions.html
 */
/*>>> : top, left, bottom, right */
export function getBorders(element: Element, name: string, value?: string): docx.IBordersOptions | undefined {
    let borders = splitListValues(element, name, value, {
        //* `top` - Top border.
        top: [
            (value: string) => getSingleBorder(element, name, value),
            () => getSingleBorder(element, name, 'single'),
            'At least one border is required.',
        ],
        //* `right` - Right border. Default: the same as top.
        right: (value: string) => getSingleBorder(element, name, value),
        //* `bottom` - Bottom border. Default: the same as top.
        bottom: (value: string) => getSingleBorder(element, name, value),
        //* `left` - Left border. Default: the same as right.
        left: (value: string) => getSingleBorder(element, name, value),
    }, ',');
    if (borders === undefined) return undefined;
    borders.right = borders.right ?? borders.top;
    borders.bottom = borders.bottom ?? borders.top;
    borders.left = borders.left ?? borders.right;
    return borders as docx.IBordersOptions;
    /*> Each side of the border is `@short:getSingleBorder`: @getSingleBorder */
}

/**
 * Returns margins from attribute value.
 * https://docx.js.org/api/interfaces/IMargins.html
 * ITableCellOptions
 */
/*>>> : top left bottom right
@filterLengthUint
*/
export function getMargin(element: Element, name: string, converterNoErr: (v: string) => any) {
    let margin = splitListValues(element, name, element.attributes[name], {
        //* `top` - Top margin.
        top: [
            (value: string) => converterNoErr(value),
            () => converterNoErr('0mm'),
            'At least one margin length is required.'
        ],
        //* `right` - Right margin. Default: the same as top.
        right: (value: string) => converterNoErr(value),
        //* `bottom` - Bottom margin. Default: the same as top.
        bottom: (value: string) => converterNoErr(value),
        //* `left` - Left margin. Default: the same as right.
        left: (value: string) => converterNoErr(value),
    });
    if (margin === undefined) return undefined;
    margin.right = margin.right ?? margin.top;
    margin.bottom = margin.bottom ?? margin.top;
    margin.left = margin.left ?? margin.right;
    return margin;
}
