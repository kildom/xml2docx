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
import { AnyObject, symbolInstance, undefEmpty } from "../common";
import { getBorderOptions, getMargins } from "./borders";
import { fromEnum } from "../filters";
import { pTag } from "./paragraph";


function getTableHVPosition<T>(src: Element, text: string | undefined, enumValue: { [key: string]: string }) {
    if (text === undefined) return undefined;
    let anchor: docx.TableAnchorType | undefined = undefined;
    let absolute: docx.UniversalMeasure | undefined = undefined;
    let relative: T | undefined = undefined;
    let parts = text.split(' ');
    for (let part of parts) {
        let a = fromEnum(src, part, docx.TableAnchorType, {}, false);
        if (a !== undefined) {
            anchor = a as docx.TableAnchorType;
            continue;
        }
        let r = fromEnum(src, part, enumValue, {}, false);
        if (r !== undefined) {
            relative = r as T;
            continue;
        }
        absolute = part as docx.UniversalMeasure;
    }
    return { anchor, absolute, relative };
}

export function tableTag(tr: DocxTranslator, src: Element, attributes: AnyObject, properties: AnyObject): any[] {
    let hFloat = getTableHVPosition<docx.RelativeHorizontalPosition>(src, attributes.horizontal, docx.RelativeHorizontalPosition);
    let vFloat = getTableHVPosition<docx.RelativeVerticalPosition>(src, attributes.vertical, docx.RelativeVerticalPosition);
    let floatMargins = getMargins(tr, src, attributes.floatMargins, ':pass');
    let options: docx.ITableOptions = {
        rows: tr.copy().parseObjects(src, SpacesProcessing.IGNORE),
        columnWidths: attributes.columnWidths && (attributes.columnWidths as string)
            .trim()
            .split(/[, ]+/)
            .map(x => tr.filter(src, ':dxa', x)),
        layout: attributes.columnWidths ? docx.TableLayoutType.FIXED : docx.TableLayoutType.AUTOFIT,
        alignment: fromEnum(src, attributes.align, docx.AlignmentType) as docx.AlignmentType,
        width: attributes.width && {
            type: attributes.width.endsWith('%') ? docx.WidthType.PERCENTAGE : docx.WidthType.DXA,
            size: attributes.width,
        },
        borders: undefEmpty({
            bottom: getBorderOptions(tr, src, attributes.borderBottom),
            left: getBorderOptions(tr, src, attributes.borderLeft),
            right: getBorderOptions(tr, src, attributes.borderRight),
            top: getBorderOptions(tr, src, attributes.borderTop),
            insideHorizontal: getBorderOptions(tr, src, attributes.borderHorizontal),
            insideVertical: getBorderOptions(tr, src, attributes.borderVertical),
        }),
        margins: attributes.cellMargins && {
            marginUnitType: docx.WidthType.DXA,
            ...getMargins(tr, src, attributes.cellMargins, ':pass'),
        },
        float: undefEmpty({
            horizontalAnchor: hFloat?.anchor,
            absoluteHorizontalPosition: hFloat?.absolute,
            relativeHorizontalPosition: hFloat?.relative,
            verticalAnchor: vFloat?.anchor,
            absoluteVerticalPosition: vFloat?.absolute,
            relativeVerticalPosition: vFloat?.relative,
            overlap: !attributes.overlap ? undefined
                : tr.filter(src, ':bool', attributes.overlap) ? docx.OverlapType.OVERLAP : docx.OverlapType.NEVER,
            topFromText: floatMargins?.top,
            rightFromText: floatMargins?.right,
            bottomFromText: floatMargins?.bottom,
            leftFromText: floatMargins?.left,
        }),
    };
    return [new docx.Table({ ...options, ...properties })];
}

function getTableRowHeight(src: Element, text: string | undefined) {
    if (text === undefined) return undefined;
    let parts = text.split(' ');
    if (parts.length > 1) {
        let e = fromEnum(src, parts[0], docx.HeightRule, {}, false) as (docx.HeightRule | undefined);
        if (e) {
            return {
                rule: e,
                value: parts[1] as /* a small hack */ unknown as number
            };
        } else {
            return {
                rule: fromEnum(src, parts[1], docx.HeightRule, {}) as docx.HeightRule,
                value: parts[0] as /* a small hack */ unknown as number
            };
        }
    } else if (text.toLowerCase() === 'auto') {
        return { rule: docx.HeightRule.AUTO, value: 0 };
    } else {
        return { rule: docx.HeightRule.ATLEAST, value: text as /* a small hack */ unknown as number };
    }
}

export function trTag(tr: DocxTranslator, src: Element, attributes: AnyObject, properties: AnyObject): any[] {
    let options: docx.ITableRowOptions = {
        children: tr.parseObjects(src, SpacesProcessing.IGNORE),
        cantSplit: tr.filter(src, ':bool', attributes.cantSplit, true),
        tableHeader: tr.filter(src, ':bool', attributes.header, true),
        height: getTableRowHeight(src, attributes.height),
    };
    return [new docx.TableRow({ ...options, ...properties })];
};

export function tdTag(tr: DocxTranslator, src: Element, attributes: AnyObject, properties: AnyObject): any[] {
    let children = tr.parseObjects(src, SpacesProcessing.IGNORE);
    for (let child of children) {
        if (!(child instanceof docx.Paragraph) && !(child instanceof docx.Table)) {
            children = pTag(tr, {
                name: 'p',
                path: src.path + '/p[auto]',
                type: 'element',
                attributes: {},
                elements: src.elements?.filter(element => element.type !== 'element' || !element.name.endsWith(':property')),
            }, {}, {});
            break;
        }
    }
    let options: docx.ITableCellOptions = {
        children,
        borders: undefEmpty({
            bottom: getBorderOptions(tr, src, attributes.borderBottom || attributes.borderVertical || attributes.border),
            left: getBorderOptions(tr, src, attributes.borderLeft || attributes.borderHorizontal || attributes.border),
            right: getBorderOptions(tr, src, attributes.borderRight || attributes.borderHorizontal || attributes.border),
            top: getBorderOptions(tr, src, attributes.borderTop || attributes.borderVertical || attributes.border),
            end: getBorderOptions(tr, src, attributes.borderEnd),
            start: getBorderOptions(tr, src, attributes.borderStart),
        }),
        columnSpan: tr.filter(src, ':int', attributes.colspan, true),
        rowSpan: tr.filter(src, ':int', attributes.rowspan, true),
        margins: attributes.margins && {
            marginUnitType: docx.WidthType.DXA,
            ...getMargins(tr, src, attributes.margins, ':pass'),
        },
        textDirection: fromEnum(src, attributes.dir, docx.TextDirection, {
            topToBottom: docx.TextDirection.TOP_TO_BOTTOM_RIGHT_TO_LEFT,
            leftToRight: docx.TextDirection.LEFT_TO_RIGHT_TOP_TO_BOTTOM,
            bottomToTop: docx.TextDirection.BOTTOM_TO_TOP_LEFT_TO_RIGHT,
        }, true) as docx.TextDirection,
        verticalAlign: fromEnum(src, attributes.valign, docx.VerticalAlign, { middle: docx.VerticalAlign.CENTER }, true) as docx.VerticalAlign,
        shading: attributes.background && {
            type: docx.ShadingType.SOLID,
            color: getColor(attributes.background),
        }
    };
    return [new docx.TableCell({ ...options, ...properties })];
};
