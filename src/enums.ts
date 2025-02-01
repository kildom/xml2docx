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

export const VerticalAlignAliases = {
    middle: docx.VerticalAlign.CENTER,
};

export const TextDirectionAliases = {
    toptobottom: docx.TextDirection.TOP_TO_BOTTOM_RIGHT_TO_LEFT,
    lefttoright: docx.TextDirection.LEFT_TO_RIGHT_TOP_TO_BOTTOM,
    bottomtotop: docx.TextDirection.BOTTOM_TO_TOP_LEFT_TO_RIGHT,
};

export const AlignmentTypeAliases = {
    justify: docx.AlignmentType.BOTH,
};

export enum HighlightColor {
    BLACK = 'black',
    BLUE = 'blue',
    CYAN = 'cyan',
    DARK_BLUE = 'darkBlue',
    DARK_CYAN = 'darkCyan',
    DARK_GRAY = 'darkGray',
    DARK_GREEN = 'darkGreen',
    DARK_MAGENTA = 'darkMagenta',
    DARK_RED = 'darkRed',
    DARK_YELLOW = 'darkYellow',
    GREEN = 'green',
    LIGHT_GRAY = 'lightGray',
    MAGENTA = 'magenta',
    RED = 'red',
    WHITE = 'white',
    YELLOW = 'yellow',
}

export enum HeaderFooterPage {
    DEFAULT = 'default',
    EVEN = 'even',
    FIRST = 'first',
}

export enum SectionPropertiesOptionsType {
    CONTINUOUS = 'continuous',
    NEXT_PAGE = 'nextPage',
    NEXT_COLUMN = 'nextColumn',
    EVEN_PAGE = 'evenPage',
    ODD_PAGE = 'oddPage',
}

export enum ImageFileTypes {
    png = 'png',
    gif = 'gif',
    bmp = 'bmp',
    jpg = 'jpg',
    svg = 'svg',
}

export enum RegularImageFileTypes {
    png = 'png',
    gif = 'gif',
    bmp = 'bmp',
    jpg = 'jpg',
}
