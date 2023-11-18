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

import { DocxTranslator } from "../docxTranslator";
import { Element, SpacesProcessing, XMLError } from "../xml";
import * as docx from "docx";
import { AnyObject, Attributes, symbolInstance, undefEmpty } from "../common";
import { getBorder, getMargins } from "./borders";
import { filterUintNonZero, fromEnum, filterBool, FilterMode, LengthUnits, filterLengthUintNonZero, filterColor } from "../filters";


function getTableHVPosition<T>(text: string | undefined, enumValue: { [key: string]: string }) {
    if (text === undefined) return undefined;
    let anchor: docx.TableAnchorType | undefined = undefined;
    let absolute: docx.UniversalMeasure | undefined = undefined;
    let relative: T | undefined = undefined;
    let parts = text.split(' ');
    for (let part of parts) {
        let a = fromEnum(part, docx.TableAnchorType, {}, false);
        if (a !== undefined) {
            anchor = a as docx.TableAnchorType;
            continue;
        }
        let r = fromEnum(part, enumValue, {}, false);
        if (r !== undefined) {
            relative = r as T;
            continue;
        }
        absolute = part as docx.UniversalMeasure;
    }
    return { anchor, absolute, relative };
}

export function tableTag(tr: DocxTranslator, attributes: Attributes, properties: AnyObject): any[] {
    let hFloat = getTableHVPosition<docx.RelativeHorizontalPosition>(attributes.horizontal, docx.RelativeHorizontalPosition);
    let vFloat = getTableHVPosition<docx.RelativeVerticalPosition>(attributes.vertical, docx.RelativeVerticalPosition);
    let floatMargins = getMargins(tr, attributes.floatMargins, ':pass');
    let border = getBorder(attributes.border);
    let insideBorder = getBorder(attributes.insideBorder);
    let options: docx.ITableOptions = {
        rows: tr.copy().parseObjects(tr.element, SpacesProcessing.IGNORE),
        columnWidths: attributes.columnWidths && (attributes.columnWidths as string)
            .trim()
            .split(/[, ]+/)
            .map(x => filterLengthUintNonZero(x, LengthUnits.dxa, FilterMode.EXACT)),
        layout: attributes.columnWidths ? docx.TableLayoutType.FIXED : docx.TableLayoutType.AUTOFIT,
        alignment: fromEnum(attributes.align, docx.AlignmentType) as docx.AlignmentType,
        width: attributes.width && {
            type: attributes.width.endsWith('%') ? docx.WidthType.PERCENTAGE : docx.WidthType.DXA,
            size: attributes.width,
        },
        borders: undefEmpty({
            bottom: border?.bottom,
            left: border?.left,
            right: border?.right,
            top: border?.top,
            insideHorizontal: insideBorder?.top,
            insideVertical: insideBorder?.right,
        }),
        margins: attributes.cellMargins && { // TODO: Rename to margin to be compatible with CSS
            marginUnitType: docx.WidthType.DXA,
            ...getMargins(tr, attributes.cellMargins, ':pass'),
        },
        float: undefEmpty({
            horizontalAnchor: hFloat?.anchor,
            absoluteHorizontalPosition: hFloat?.absolute,
            relativeHorizontalPosition: hFloat?.relative,
            verticalAnchor: vFloat?.anchor,
            absoluteVerticalPosition: vFloat?.absolute,
            relativeVerticalPosition: vFloat?.relative,
            overlap: !attributes.overlap ? undefined
                : filterBool(attributes.overlap, FilterMode.UNDEF) ? docx.OverlapType.OVERLAP : docx.OverlapType.NEVER,
            topFromText: floatMargins?.top,
            rightFromText: floatMargins?.right,
            bottomFromText: floatMargins?.bottom,
            leftFromText: floatMargins?.left,
        }),
    };
    return [new docx.Table({ ...options, ...properties })];
}

function getTableRowHeight(text: string | undefined) {
    if (text === undefined) return undefined;
    let parts = text.split(' ');
    if (parts.length > 1) {
        let e = fromEnum(parts[0], docx.HeightRule, {}, false) as (docx.HeightRule | undefined);
        if (e) {
            return {
                rule: e,
                value: parts[1] as /* a small hack */ unknown as number
            };
        } else {
            return {
                rule: fromEnum(parts[1], docx.HeightRule, {}) as docx.HeightRule,
                value: parts[0] as /* a small hack */ unknown as number
            };
        }
    } else if (text.toLowerCase() === 'auto') {
        return { rule: docx.HeightRule.AUTO, value: 0 };
    } else {
        return { rule: docx.HeightRule.ATLEAST, value: text as /* a small hack */ unknown as number };
    }
}

export function trTag(tr: DocxTranslator, attributes: Attributes, properties: AnyObject): any[] {
    let options: docx.ITableRowOptions = {
        children: tr.parseObjects(tr.element, SpacesProcessing.IGNORE),
        cantSplit: filterBool(attributes.cantSplit, FilterMode.UNDEF),
        tableHeader: filterBool(attributes.header, FilterMode.UNDEF),
        height: getTableRowHeight(attributes.height),
    };
    return [new docx.TableRow({ ...options, ...properties })];
};

//* <td>
//* Table cell.<br/>Child elements of the cell must be `<p>` or `<table>` (or its associated @api classes).
//* If they are not, then the content of the cell will be put into automatically generated `<p>` element.
//* @api:TableCell
export function tdTag(tr: DocxTranslator, attributes: Attributes, properties: AnyObject): any[] {
    let children = tr.parseObjects(tr.element, SpacesProcessing.IGNORE);
    for (let child of children) {
        if (!(child instanceof docx.Paragraph) && !(child instanceof docx.Table)) {
            children = tr.parseObjects([{
                name: 'p',
                path: tr.element.path + '/p[auto]',
                type: 'element',
                attributes: {},
                elements: tr.element.elements?.filter(element => element.type !== 'element' || !element.name.endsWith(':property')),
            }], SpacesProcessing.IGNORE);
            break;
        }
    }
    let options: docx.ITableCellOptions = {
        children,
        //* Cell border.
        borders: getBorder(attributes.border),
        //* Number of spanning columns.
        columnSpan: filterUintNonZero(attributes.colspan, FilterMode.UNDEF),
        //* Number of spanning rows.
        rowSpan: filterUintNonZero(attributes.rowspan, FilterMode.UNDEF),
        //* Cell inner margins.
        margins: attributes.margins && {
            marginUnitType: docx.WidthType.DXA,
            ...getMargins(tr, attributes.margins, ':pass'),
        },
        //* Text direction.
        textDirection: fromEnum(attributes.dir, docx.TextDirection, {
            topToBottom: docx.TextDirection.TOP_TO_BOTTOM_RIGHT_TO_LEFT,
            leftToRight: docx.TextDirection.LEFT_TO_RIGHT_TOP_TO_BOTTOM,
            bottomToTop: docx.TextDirection.BOTTOM_TO_TOP_LEFT_TO_RIGHT,
        }, true) as docx.TextDirection,
        verticalAlign: fromEnum(attributes.valign, docx.VerticalAlign, { middle: docx.VerticalAlign.CENTER }, true) as docx.VerticalAlign,
        shading: attributes.background === undefined ? undefined : {
            type: docx.ShadingType.SOLID,
            color: filterColor(attributes.background, FilterMode.EXACT),
        }
    };
    return [new docx.TableCell({ ...options, ...properties })];
};
