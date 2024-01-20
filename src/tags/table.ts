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

import { DocxTranslator } from '../docxTranslator';
import { SpacesProcessing } from '../xml';
import * as docx from 'docx';
import { AnyObject, Attributes, Dict, selectUndef, undefEmpty } from '../common';
import { getBorder, getMargin } from './borders';
import {
    filterUintNonZero, fromEnum, filterBool, FilterMode, LengthUnits, filterLengthUintNonZero, filterColor,
    filterLengthUint, filterPositiveUniversalMeasure, filterInt
} from '../filters';
import { TextDirectionAliases, VerticalAlignAliases } from '../enums';
import { createDummyParagraph } from './paragraph';


/*>>> : anchor absolute|relative
*/
function getTableHVPosition<T extends Dict<string>>(text: string | undefined, enumValue: T) {
    if (text === undefined) return undefined;
    //* `anchor` - Archon from which position is relative to. @enum:TableAnchorType
    let anchor: string | undefined = undefined;
    //* `absolute` - Absolute position. @filterUniversalMeasure
    let absolute: docx.UniversalMeasure | undefined = undefined;
    //* `relative` - Relative position. @enum:@0@
    let relative: T[keyof T] | undefined = undefined;
    /*> The `absolute` and `relative` fields are mutually exclusive. Specify just one of them. */
    let parts = text.split(' ');
    for (let part of parts) {
        let a = fromEnum(part, docx.TableAnchorType, {}, false);
        if (a !== undefined) {
            anchor = a as string;
            continue;
        }
        let r = fromEnum(part, enumValue, {}, false);
        if (r !== undefined) {
            relative = r as T[keyof T];
            continue;
        }
        absolute = part as docx.UniversalMeasure;
    }
    return { anchor, absolute, relative };
}


/*>>> : horizontal, vertical */
export function getBorderHV(value: string | undefined) {
    let borders = getBorder(value);
    if (borders === undefined) return undefined;
    return {
        //* `horizontal` - Horizontal borders.
        horizontal: borders.top,
        //* `vertical` - Vertical borders.
        vertical: borders.left,
    };
    /*> Each type of the border is `@short:getBorderOptions`: @getBorderOptions */
}

interface TablePreservedData {
    columnIndex: number;
    columns: {
        width?: number,
        attributes: Attributes,
    }[];
}

/*>>>
Table.

Child elements of the row are `<tr>` (or its associated @api class) or `<tc>`.

All attributes starting with `td-`, `tr-`, `tc-`, `p-` and `font-` prefixes will be passed to
all cells, rows, columns, paragraphs (as preserved attributes) and paragraphs default
text format.

@api:classes/Table.
*/
export function tableTag(tr: DocxTranslator, attributes: Attributes, properties: AnyObject): any[] {
    tr = tr.copy(undefined, { 'tr': trTag, 'tc': tcTag });
    let tableData: TablePreservedData = { columnIndex: 0, columns: [] };
    tr.preserved.table = { attributes, properties: {}, data: tableData };
    //* Horizontal floating position. @@:RelativeHorizontalPosition
    let hFloat = getTableHVPosition(attributes.horizontal, docx.RelativeHorizontalPosition);
    //* Vertical floating position. @@:RelativeVerticalPosition
    let vFloat = getTableHVPosition(attributes.vertical, docx.RelativeVerticalPosition);
    //* Distance between table and surrounding text in floating mode. @@
    let floatMargins = getMargin(attributes.floatMargins);
    //* Table border. @@
    let border = getBorder(attributes.border);
    //* Default border between cells. @@
    let insideBorder = getBorderHV(attributes.insideBorder);
    let percentage = attributes.width?.endsWith('%');
    //* List of columns widths for fixed table layout. @filterPositiveUniversalMeasure
    let columnWidths = attributes.columnWidths ? (attributes.columnWidths as string)
        .trim()
        .split(/[;, ]+/)
        .map(x => filterLengthUintNonZero(x, LengthUnits.dxa, FilterMode.EXACT)) : undefined;
    let rows = tr.parseObjects(tr.element, SpacesProcessing.IGNORE);
    for (let i = 0; i < tableData.columns.length; i++) {
        let col = tableData.columns[i];
        if (col?.width !== undefined) {
            columnWidths = columnWidths || [];
            columnWidths[i] = col?.width;
        }
    }
    let options: docx.ITableOptions = {
        rows,
        columnWidths,
        layout: attributes.columnWidths ? docx.TableLayoutType.FIXED : docx.TableLayoutType.AUTOFIT,
        //* Table alignment. @enum:AlignmentType
        alignment: fromEnum(attributes.align, docx.AlignmentType),
        //* Table width. It can be expressed as percentage of entire available space (with `%` sign)
        //* or straightforward distance. @filterPositiveUniversalMeasure
        width: attributes.width ? {
            type: percentage ? docx.WidthType.PERCENTAGE : docx.WidthType.DXA,
            size: percentage
                ? filterInt(attributes.width.substring(0, attributes.width.length - 1), FilterMode.EXACT)
                : filterPositiveUniversalMeasure(attributes.width, FilterMode.EXACT),
        } : undefined,
        borders: undefEmpty({
            bottom: border?.bottom,
            left: border?.left,
            right: border?.right,
            top: border?.top,
            insideHorizontal: insideBorder?.horizontal,
            insideVertical: insideBorder?.vertical,
        }),
        margins: attributes.cellMargin ? {
            marginUnitType: docx.WidthType.DXA,
            //* Default cell margins. @@
            ...getMargin(attributes.cellMargin,
                (value, mode) => filterLengthUint(value, LengthUnits.dxa, mode)
            ),
        } : undefined,
        float: undefEmpty({
            horizontalAnchor: hFloat?.anchor as (typeof docx.TableAnchorType)[keyof typeof docx.TableAnchorType],
            absoluteHorizontalPosition: hFloat?.absolute,
            relativeHorizontalPosition: hFloat?.relative,
            verticalAnchor: vFloat?.anchor as (typeof docx.TableAnchorType)[keyof typeof docx.TableAnchorType],
            absoluteVerticalPosition: vFloat?.absolute,
            relativeVerticalPosition: vFloat?.relative,
            overlap: !attributes.overlap ? undefined
                //* Enable overlapping for floating mode. @@
                : filterBool(attributes.overlap, FilterMode.UNDEF) ? docx.OverlapType.OVERLAP : docx.OverlapType.NEVER,
            topFromText: floatMargins?.top,
            rightFromText: floatMargins?.right,
            bottomFromText: floatMargins?.bottom,
            leftFromText: floatMargins?.left,
        }),
    };
    return [new docx.Table({ ...options, ...properties })];
}

/*>>> : rule value
*/
function getTableRowHeight(text: string | undefined) {
    if (text === undefined) return undefined;
    let parts = text.split(' ');
    if (parts.length > 1) {
        //* `rule` - Rule how the row height is determined. @enum:HeightRule
        let e = fromEnum(parts[0], docx.HeightRule, {}, false);
        if (e) {
            return {
                rule: e,
                value: parts[1] as /* a small hack */ unknown as number
            };
        } else {
            return {
                rule: fromEnum(parts[1], docx.HeightRule),
                value: parts[0] as /* a small hack */ unknown as number
            };
        }
        //* `value` - Height value. @filterPositiveUniversalMeasure
    } else if (text.toLowerCase() === 'auto') {
        return { rule: docx.HeightRule.AUTO, value: 0 };
    } else {
        return { rule: docx.HeightRule.ATLEAST, value: text as /* a small hack */ unknown as number };
    }
}


export function filterPreserved(tag: string, input?: Attributes, keepPrefix?: boolean): Attributes {
    let result: Attributes = {};
    for (let [key, value] of Object.entries(input || {})) {
        let m = key.match(/^(t[dr]|p|font)([A-Z])(.*)$/);
        if (!m || m[1] !== tag) continue;
        if (keepPrefix) {
            result[m[1] + m[2] + m[3]] = value;
        } else {
            result[m[2].toLowerCase() + m[3]] = value;
        }
    }
    return result;
}

/*>>>
Table column.

This element has no children, instead it defines a column of a table.
Actual cells are located in rows.

All attributes starting with `td-`, `p-` and `font-` prefixes will be passed to
all cells, paragraphs (as preserved attributes) and paragraphs default
text format.

*/
function tcTag(tr: DocxTranslator, attributes: Attributes): any[] {
    attributes = { ...filterPreserved('tc', tr.preserved.table?.attributes), ...attributes };
    //* Tells for how many columns this element applies to. @@
    let colSpan = filterUintNonZero(attributes.colspan, FilterMode.UNDEF) || 1;
    let tableData = (tr.preserved.table?.data || {}) as TablePreservedData;
    for (let i = 0; i < colSpan; i++) {
        tableData.columns.push({
            attributes,
            //* Sets width of the column. @@
            width: filterLengthUintNonZero(attributes.width, LengthUnits.dxa, FilterMode.UNDEF),
        });
    }
    return [];
}

/*>>>
Table row.

Child elements of the row are `<td>` (or its associated @api class).

All attributes starting with `td-`, `p-` and `font-` prefixes will be passed to
all cells, paragraphs (as preserved attributes) and paragraphs default
text format.

@api:classes/TableRow.
*/
function trTag(tr: DocxTranslator, attributes: Attributes, properties: AnyObject): any[] {
    let trCopy = tr.copy(undefined, { 'td': tdTag });
    trCopy.preserved = {
        ...tr.preserved,
        tr: { attributes, properties: {} },
    };
    if (trCopy.preserved.table?.data) {
        trCopy.preserved.table.data.columnIndex = 0;
    }
    attributes = { ...filterPreserved('tr', tr.preserved.table?.attributes), ...attributes };
    let options: docx.ITableRowOptions = {
        children: trCopy.parseObjects(trCopy.element, SpacesProcessing.IGNORE),
        //* Row can be splitted into multiple pages. @@
        cantSplit: filterBool(attributes.cantSplit, FilterMode.UNDEF),
        //* This row is a table header. @@
        tableHeader: filterBool(attributes.header, FilterMode.UNDEF),
        //* Table height. @@
        height: getTableRowHeight(attributes.height),
    };
    return [new docx.TableRow({ ...options, ...properties })];
}

/*>>>
Table cell.

Child elements of the cell must be `<p>` or `<table>` (or its associated @api classes).
If they are not, then the content of the cell will be put into automatically generated `<p>` element.

The cell will inherit all attributes from associated `<table>`, `<tc>`, and `<tr>` elements
that are prefixed by `td-`. If single attribute comes from different sources, then the priority
is following: current `<td>` element, inherited from `<tr>` element,
inherited from `<tc>` element, inherited from `<table>` element.

All attributes starting with `p-` and `font-` prefixes will be passed to
all paragraphs (as preserved attributes) and paragraphs default
text format.

@api:classes/TableCell.
*/
export function tdTag(tr: DocxTranslator, attributes: Attributes, properties: AnyObject): any[] {
    // Fetch or keep preserved attributes and properties
    let tableData = (tr.preserved.table?.data || {}) as TablePreservedData;
    // Fetch inherited properties and attributes
    attributes = {
        ...filterPreserved('td', tr.preserved.table?.attributes),
        ...filterPreserved('td', tableData.columns[tableData.columnIndex]?.attributes),
        ...filterPreserved('td', tr.preserved.tr?.attributes),
        ...attributes
    };
    let pAttributes = {
        ...filterPreserved('p', tr.preserved.table?.attributes),
        ...filterPreserved('font', tr.preserved.table?.attributes, true),
        ...filterPreserved('p', tableData.columns[tableData.columnIndex]?.attributes),
        ...filterPreserved('font', tableData.columns[tableData.columnIndex]?.attributes, true),
        ...filterPreserved('p', tr.preserved.tr?.attributes),
        ...filterPreserved('font', tr.preserved.tr?.attributes, true),
        ...filterPreserved('p', attributes),
        ...filterPreserved('font', attributes, true),
    };
    let trCopy = tr.copy();
    trCopy.preserved.p = {
        attributes: pAttributes,
        properties: {},
    };
    // Parse children and prepare options
    let children = trCopy.parseObjects(trCopy.element, SpacesProcessing.IGNORE);
    children = createDummyParagraph(trCopy, children);
    let options: docx.ITableCellOptions = {
        children,
        //* Cell border. @@
        borders: getBorder(attributes.border),
        //* Number of spanning columns. @@
        columnSpan: filterUintNonZero(attributes.colspan, FilterMode.UNDEF),
        //* Number of spanning rows. @@
        rowSpan: filterUintNonZero(attributes.rowspan, FilterMode.UNDEF),
        margins: selectUndef(attributes.margin, {
            marginUnitType: docx.WidthType.DXA,
            //* Cell inner margins. @@
            ...getMargin(attributes.margin,
                (value, mode) => filterLengthUint(value, LengthUnits.dxa, mode)
            ),
        }),
        //* Text direction. @enum:TextDirection+TextDirectionAliases
        textDirection: fromEnum(attributes.dir, docx.TextDirection, TextDirectionAliases, true),
        //* Vertical alignment. @enum:VerticalAlign+VerticalAlignAliases
        verticalAlign: fromEnum(attributes.valign, docx.VerticalAlign, VerticalAlignAliases, true),
        shading: attributes.background === undefined ? undefined : {
            type: docx.ShadingType.SOLID,
            //* Background color. @@
            color: filterColor(attributes.background, FilterMode.EXACT),
        }
    };
    // Increment current column index
    tableData.columnIndex += options.columnSpan || 1;
    return [new docx.TableCell({ ...options, ...properties })];
}
