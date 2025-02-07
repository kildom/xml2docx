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
import { Mutable, undefEmpty } from '../common';
import { processChildren, TranslatorState } from '../translator';
import { Element } from '../xml';
import * as convert from '../convert';
import { getBorders, getMargin } from '../attrs/borders-attrs';
import { headingTags } from './p';
import { HeaderFooterPage } from '../enums';
import { ObjectContainer } from './document';
import { tableTag } from './table';


/*>>>
Section.
*/
export function sectionTag(ts: TranslatorState, element: Element): ObjectContainer[] {
    processChildren(ts, element, {
        tags: {},
        removeSpaces: true,
    });
    let attributes = element.attributes;
    let pageBorders = undefEmpty<docx.IPageBorderAttributes>({
        //* On which pages display the borders. @enum:PageBorderDisplay
        display: convert.enumeration(element, 'borderDisplay', docx.PageBorderDisplay),
        //* The base from the border distance should be calculated. @enum:PageBorderOffsetFrom
        offsetFrom: convert.enumeration(element, 'borderOffsetFrom', docx.PageBorderOffsetFrom),
        //* Defines if border should be above or below content. @enum:PageBorderZOrder
        zOrder: convert.enumeration(element, 'borderZOrder', docx.PageBorderZOrder),
    });
    let paperSize: Mutable<docx.IPageSizeAttributes> | undefined = undefined;
    if (attributes.width || attributes.height) {
        if (attributes.size) {
            ts.ctx.error('Section size attribute is ignored when width or height is set.', element);
        }
        paperSize = {
            //* Page width. @@
            width: convert.positiveUniversalMeasure(element, 'width'),
            //* Page height. @@
            height: convert.positiveUniversalMeasure(element, 'height'),
            //* Page orientation. @enum:PageOrientation
            orientation: convert.enumeration(element, 'orientation', docx.PageOrientation),
        };
    } else if (attributes.size) {
        let sizeFiltered = attributes.size.trim().replace(/[. _/-]/g, '').toLowerCase();
        let dim: typeof convert.paperSizes[0] | undefined = undefined;
        for (let [key, value] of Object.entries(convert.paperSizes)) {
            let keyFiltered = key.trim().replace(/[. _/-]/g, '').toLowerCase();
            if (sizeFiltered === keyFiltered) {
                dim = value;
                break;
            }
        }
        if (!dim) {
            ts.ctx.error(`Unknown page size: ${attributes.size}.`, element);
        } else {
            paperSize = {
                width: dim[0],
                height: dim[1],
                orientation: convert.enumeration(element, 'orientation', docx.PageOrientation),
            };
        }
    }
    //* Page margins. @@
    let margin = getMargin(element, 'margin', convert.universalMeasure.noErr);
    let options: docx.ISectionOptions = {
        children: [],
        properties: undefEmpty<docx.ISectionPropertiesOptions>({
            //* Enable title page in this section. @@
            titlePage: convert.bool(element, 'titlePage'),
            //* Section type. @enum:SectionType
            type: convert.enumeration(element, 'type', docx.SectionType),
            //* Vertical alignment. @enum:VerticalAlign
            verticalAlign: convert.enumeration(element, 'verticalAlign', docx.VerticalAlign),
            page: undefEmpty({
                borders: undefEmpty({
                    //* Page borders. @@
                    ...convertBorderToPageBorder(getBorders(element, 'border', attributes.border)),
                    pageBorders,
                }),
                margin: undefEmpty({
                    ...margin,
                    //* Header margin length. @@
                    header: convert.positiveUniversalMeasure(element, 'headerMargin'),
                    //* Footer margin length. @@
                    footer: convert.positiveUniversalMeasure(element, 'footerMargin'),
                    //* Gutter margin length. @@
                    gutter: convert.positiveUniversalMeasure(element, 'gutterMargin'),
                }),
                size: undefEmpty(paperSize),
            }),
        }),
    };
    return [new ObjectContainer('ISectionOptions', options)];
}


function convertBorderToPageBorder(borders: docx.IBordersOptions | undefined): docx.IPageBordersOptions | undefined {
    if (!borders) return undefined;
    return undefEmpty({
        pageBorderTop: borders.top,
        pageBorderRight: borders.right,
        pageBorderBottom: borders.bottom,
        pageBorderLeft: borders.left,
    });
}


/*>>>
Page header or footer.
*/
export function headerFooterTag(ts: TranslatorState, element: Element): ObjectContainer[] {
    let children = processChildren(ts, element, {
        tags: {
            ...headingTags,
            table: tableTag,
        },
        implicitTag: 'p',
        removeSpaces: true,
    });

    let result: docx.Header | docx.Footer;
    if (element.name === 'header') {
        result = new docx.Header({ children });
    } else {
        result = new docx.Footer({ children });
    }
    //* On which page this header or footer will be displayed. @enum:HeaderFooterPage
    //*
    //* Using `first` page automatically enables title page in current section.
    let page = convert.enumeration(element, 'page', HeaderFooterPage);
    if (!page) {
        page = HeaderFooterPage.DEFAULT;
    }
    return [new ObjectContainer(page, result)];
}