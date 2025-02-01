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
import { removeShallowUndefined, selectUndef, splitListValues } from '../common';
import { Element } from '../xml';
import { getSingleBorder } from './borders-attrs';

// #region IRunStylePropertiesOptions

/*>>>
@merge:simpleBoolStyleTable
*/
export function getIRunStylePropertiesOptions(element: Element): docx.IRunStylePropertiesOptions {
    let options: docx.IRunStylePropertiesOptions = {
        //* Font name.
        font: element.attributes.face,
        //* Font size. @@
        size: convert.positiveUniversalMeasure(element, 'size'),
        //* "type color" Text underline.
        //* * `type` - Underline type. @enum:UnderlineType|4
        //* * `color` - Underline color. @filterColor
        underline: splitListValues(element, 'underline', element.attributes.underline, {
            type: value => convert.enumeration.noErr(element, value, docx.UnderlineType),
            color: value => convert.color.noErr(value),
        }),
        //* Text color. @@
        color: convert.color(element, 'color'),
        //* Text kerning. @@
        kern: convert.positiveUniversalMeasure(element, 'kern'),
        //* Position. @@
        position: convert.universalMeasure(element, 'position'),
        //* Text Highlighting. @enum:HighlightColor
        highlight: convert.enumeration(element, 'highlight', docx.HighlightColor),
        shading: selectUndef(element.attributes.background, {
            type: docx.ShadingType.SOLID,
            //* Background color. @@
            color: convert.color(element, 'background'),
        }),
        //* Border around the text. @@
        border: getSingleBorder(element, 'border', element.attributes.border),
        //* Font scale. @@
        scale: convert.ufloat(element, 'scale'),
        //* All Caps. @@
        allCaps: convert.bool(element, 'allcaps'),
        //* Bold. @@
        bold: convert.bool(element, 'bold'),
        //* Bold complex script. @@
        boldComplexScript: convert.bool(element, 'boldcomplexscript'),
        //* Double strike. @@
        doubleStrike: convert.bool(element, 'doublestrike'),
        //* Emboss. @@
        emboss: convert.bool(element, 'emboss'),
        //* Imprint. @@
        imprint: convert.bool(element, 'imprint'),
        //* Italics. @@
        italics: convert.bool(element, 'italics'),
        //* Italics complex script. @@
        italicsComplexScript: convert.bool(element, 'italicscomplexscript'),
        //* Math. @@
        math: convert.bool(element, 'math'),
        //* No proofing. @@
        noProof: convert.bool(element, 'noproof'),
        //* Right to left. @@
        rightToLeft: convert.bool(element, 'righttoleft'),
        //* Small caps. @@
        smallCaps: convert.bool(element, 'smallcaps'),
        //* Snap to grid. @@
        snapToGrid: convert.bool(element, 'snaptogrid'),
        //* Spec vanish. @@
        specVanish: convert.bool(element, 'specvanish'),
        //* Strike. @@
        strike: convert.bool(element, 'strike'),
        //* Subscript. @@
        subScript: convert.bool(element, 'subscript'),
        //* Superscript. @@
        superScript: convert.bool(element, 'superscript'),
        //* Vanish. @@
        vanish: convert.bool(element, 'vanish'),
    };
    removeShallowUndefined(options);
    return options;
}

// #endregion

