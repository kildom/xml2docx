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
import { AnyObject, Attributes, selectFirst, splitListValues, symbolInstance, undefEmpty } from "../common";
import { DocxTranslator } from "../docxTranslator";
import { filterBool, filterLengthUint, FilterMode, filterPositiveUniversalMeasure, fromEnum, LengthUnits } from "../filters";
import { getBorder, getMargins } from "./borders";


/*>>>
Section.
*/
export function sectionTag(tr: DocxTranslator, attributes: Attributes, properties: AnyObject): any[] {
    let attr = undefEmpty({
        //* On which pages display the borders. @enum:PageBorderDisplay
        display: fromEnum(attributes.borderDisplay, docx.PageBorderDisplay) as any,
        //* The base from the border distance should be calculated. @enum:PageBorderOffsetFrom
        offsetFrom: fromEnum(attributes.borderOffsetFrom, docx.PageBorderOffsetFrom) as any,
        //* Defines if border should be above or below content. @enum:PageBorderZOrder
        zOrder: fromEnum(attributes.borderZOrder, docx.PageBorderZOrder) as any,
    });
    //* Page margins. @@
    let margins = getMargins(tr, attributes.margins, ':pass');
    let options: docx.ISectionOptions = {
        children: [],
        properties: undefEmpty({
            //* Enable title page in this section. @@
            titlePage: filterBool(attributes.titlePage, FilterMode.UNDEF),
            //* Section type. @enum:SectionType
            type: fromEnum(attributes.type, docx.SectionType) as any,
            //* Vertical alignment. @enum:VerticalAlign
            verticalAlign: fromEnum(attributes.verticalAlign, docx.VerticalAlign) as any,
            page: undefEmpty({
                borders: undefEmpty({
                    //* Page borders. @@
                    ...convertBorderToPageBorder(getBorder(attributes.border)),
                    pageBorders: attr,
                }),
                margin: undefEmpty({
                    ...margins,
                    //* Header margin length. @@
                    header: filterLengthUint(attributes.headerMargin, LengthUnits.emu, FilterMode.UNDEF),
                    //* Footer margin length. @@
                    footer: filterLengthUint(attributes.footerMargin, LengthUnits.emu, FilterMode.UNDEF),
                    //* Gutter margin length. @@
                    gutter: filterLengthUint(attributes.gutterMargin, LengthUnits.emu, FilterMode.UNDEF),
                }),
                size: undefEmpty({
                    //* Page width. @@
                    width: filterPositiveUniversalMeasure(attributes.width, FilterMode.UNDEF),
                    //* Page height. @@
                    height: filterPositiveUniversalMeasure(attributes.height, FilterMode.UNDEF),
                    //* Page orientation. @enum:PageOrientation
                    orientation: fromEnum(attributes.orientation, docx.PageOrientation) as any,
                }),
            }),
        }),
    };
    return [{ ...options, ...properties, [symbolInstance]: 'ISectionOptions' }];
};


function convertBorderToPageBorder(borders: { [key: string]: any; } | undefined): docx.IPageBordersOptions | undefined {
    if (!borders) return undefined;
    return undefEmpty({
        pageBorderTop: borders.top,
        pageBorderRight: borders.right,
        pageBorderBottom: borders.bottom,
        pageBorderLeft: borders.left,
    });
}

