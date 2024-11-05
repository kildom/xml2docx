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
import { Attributes, Dict, error, selectUndef, splitListValues, undefEmpty } from '../common';
import { CaptureChildren, normalizeElement, translateNodes, TranslatorState } from '../translate';
import { Element, SpacesProcessing } from '../xml';
import { getBorders, getMargin } from './borders';
import {
    convertBool, convertColor, convertEnum, convertPositiveUint, convertPositiveUniversalMeasure,
    convertPositiveUniversalMeasureInt, convertUInt, convertUniversalMeasure, UnitsPerPt
} from '../converters';
import { TextDirectionAliases, VerticalAlignAliases } from '../enums';
import { addImplicitParagraphs, headingTags, pTag } from './paragraph';



/*>>>
Table.

Child elements of the row are `<tr>` (or its associated @api class) or `<tc>`.

@api:classes/Table.
*/
export function tableTag(ts: TranslatorState, element: Element, captureChildren?: CaptureChildren): docx.Table[] {

    let [tsInner, attributes, properties] = normalizeElement(ts, element, SpacesProcessing.IGNORE);
    tsInner = tsInner.newTableData();
    let tableData = tsInner.tableData;

    //* Horizontal floating position. @@:RelativeHorizontalPosition
    let hFloat = getTableHVPosition(attributes.horizontal, docx.RelativeHorizontalPosition);
    //* Vertical floating position. @@:RelativeVerticalPosition
    let vFloat = getTableHVPosition(attributes.vertical, docx.RelativeVerticalPosition);
    //* Distance between table and surrounding text in floating mode. @@
    let floatMargins = getMargin(attributes.floatmargins, convertPositiveUniversalMeasure);
    //* Table border. @@
    let border = getBorders(attributes.border);
    //* inner-border: Default border between cells. @@
    let insideBorder = getBorderHV(attributes.innerborder);
    let percentage = attributes.width?.endsWith('%');
    //* column-widths: List of columns widths for fixed table layout. @convertPositiveUniversalMeasureInt
    let columnWidths = attributes.columnWidths ? (attributes.columnwidths as string)
        .trim()
        .split(/[;, ]+/)
        .map(x => convertPositiveUniversalMeasureInt(x, UnitsPerPt.dxa)!) : undefined;

    let rows = translateNodes(tsInner, element.elements, {
        'tc': tcTag,
        'tr': trTag,
    });

    captureChildren?.(rows);

    for (let i = 0; i < tableData.columns.length; i++) {
        let col = tableData.columns[i];
        if (col?.width !== undefined) {
            columnWidths = columnWidths ?? [];
            columnWidths[i] = col?.width;
        }
    }

    let options: docx.ITableOptions = {
        rows,
        columnWidths,
        layout: columnWidths ? docx.TableLayoutType.FIXED : docx.TableLayoutType.AUTOFIT,
        //* Table alignment. @enum:AlignmentType
        alignment: convertEnum(attributes.align, docx.AlignmentType),
        //* Table width. It can be expressed as percentage of entire available space (with `%` sign)
        //* or straightforward distance. @convertPositiveUniversalMeasure
        width: attributes.width ? {
            type: percentage ? docx.WidthType.PERCENTAGE : docx.WidthType.DXA,
            size: percentage
                ? convertUInt(attributes.width.substring(0, attributes.width.length - 1))!
                : convertPositiveUniversalMeasure(attributes.width)!,
        } : undefined,
        borders: undefEmpty({
            bottom: border?.bottom,
            left: border?.left,
            right: border?.right,
            top: border?.top,
            insideHorizontal: insideBorder?.horizontal,
            insideVertical: insideBorder?.vertical,
        }),
        margins: attributes.cellmargin ? {
            marginUnitType: docx.WidthType.DXA,
            //* Default cell margins. @@
            ...getMargin(attributes.cellmargin,
                (value: string) => convertPositiveUniversalMeasureInt(value, UnitsPerPt.dxa)
            ),
        } : undefined,
        float: undefEmpty({
            horizontalAnchor: hFloat?.anchor,
            absoluteHorizontalPosition: hFloat?.absolute,
            relativeHorizontalPosition: hFloat?.relative,
            verticalAnchor: vFloat?.anchor,
            absoluteVerticalPosition: vFloat?.absolute,
            relativeVerticalPosition: vFloat?.relative,
            overlap: !attributes.overlap ? undefined
                //* Enable overlapping for floating mode. @@
                : convertBool(attributes.overlap) ? docx.OverlapType.OVERLAP : docx.OverlapType.NEVER,
            topFromText: floatMargins?.top,
            rightFromText: floatMargins?.right,
            bottomFromText: floatMargins?.bottom,
            leftFromText: floatMargins?.left,
        }),
    };

    return [new docx.Table({ ...options, ...properties })];
}


function trTag(ts: TranslatorState, element: Element, captureChildren?: CaptureChildren): docx.TableRow[] {

    let [tsInner, attributes, properties] = normalizeElement(ts, element, SpacesProcessing.IGNORE);
    let tableData = tsInner.tableData;

    tableData.columnIndex = 0;
    for (let col of tableData.columns) {
        col.rowSpanRemaining = (col.rowSpanRemaining || 1) - 1;
    }

    let cells = translateNodes(tsInner, element.elements, {
        'td': tdTag,
    });

    captureChildren?.(cells);

    let options: docx.ITableRowOptions = {
        children: cells,
        //* Row can be splitted into multiple pages. @@
        cantSplit: convertBool(attributes.cantsplit),
        //* This row is a table header. @@
        tableHeader: convertBool(attributes.header),
        //* Table height. @@
        height: getTableRowHeight(attributes.height),
    };
    return [new docx.TableRow({ ...options, ...properties })];
}

/*>>> : rule value
*/
function getTableRowHeight(text: string | undefined) {

    let result = splitListValues(text, {
        rule: [
            value => convertEnum.noErr(value, docx.HeightRule, { exactly: docx.HeightRule.EXACT }),
            () => docx.HeightRule.ATLEAST,
        ],
        value: value => convertPositiveUniversalMeasure.noErr(value),
    });

    if ((result?.rule === docx.HeightRule.ATLEAST || result?.rule === docx.HeightRule.EXACT)
        && result?.value === undefined
    ) {
        error(`Height value required in "${text}"`);
        result.value = '1mm';
    }

    return result as {
        rule: (typeof docx.HeightRule)[keyof typeof docx.HeightRule];
        value: docx.PositiveUniversalMeasure,
    } | undefined;
}

function tcTag(ts: TranslatorState, element: Element): any[] {

    let [tsInner, attributes] = normalizeElement(ts, element, SpacesProcessing.IGNORE);
    let tableData = tsInner.tableData;

    //* Tells for how many columns this element applies to. @@
    let colSpan = convertUInt(attributes.colspan) ?? 1;
    for (let i = 0; i < colSpan; i++) {
        tableData.columns.push({
            common: tsInner.common,
            //* Sets width of the column. @@
            width: convertPositiveUniversalMeasureInt(attributes.width, UnitsPerPt.dxa),
        });
    }
    return [];
}

function tdTag(ts: TranslatorState, element: Element, captureChildren?: CaptureChildren): docx.TableCell[] {

    let tableData = ts.tableData;

    // Skip columns that are still inside row span
    while (tableData.columnIndex < tableData.columns.length
        && (tableData.columns[tableData.columnIndex]?.rowSpanRemaining || 0) > 0
    ) {
        tableData.columnIndex++;
    }

    tableData.columns[tableData.columnIndex] = tableData.columns[tableData.columnIndex] ?? { rowSpanRemaining: 0 };
    let tsColumn = ts.setCommon(tableData.columns[tableData.columnIndex]?.common);
    let [tsInner, attributes, properties] = normalizeElement(tsColumn, element, SpacesProcessing.IGNORE);

    addImplicitParagraphs(element.elements, [
        ...Object.keys(headingTags), 'table',
    ]);

    let children = translateNodes(tsInner, element.elements, {
        ...Object.fromEntries(Object.keys(headingTags).map(name => [name, pTag])),
        table: tableTag,
    });

    captureChildren?.(children);

    // Parse children and prepare options
    let options: docx.ITableCellOptions = {
        children,
        //* Cell border. @@
        borders: getBorders(attributes.border),
        //* Number of spanning columns. @@
        columnSpan: convertPositiveUint(attributes.colspan),
        //* Number of spanning rows. @@
        rowSpan: convertPositiveUint(attributes.rowspan),
        margins: selectUndef(attributes.margin, {
            marginUnitType: docx.WidthType.DXA,
            //* Cell inner margins. @@
            ...getMargin(attributes.margin,
                (value: string) => convertPositiveUniversalMeasureInt(value, UnitsPerPt.dxa)
            ),
        }),
        //* Text direction. @enum:TextDirection+TextDirectionAliases
        textDirection: convertEnum(attributes.dir, docx.TextDirection, TextDirectionAliases),
        //* Vertical alignment. @enum:VerticalAlign+VerticalAlignAliases
        verticalAlign: convertEnum(attributes.valign, docx.VerticalAlign, VerticalAlignAliases),
        shading: selectUndef(attributes.background, {
            type: docx.ShadingType.SOLID,
            //* Background color. @@
            color: convertColor(attributes.background),
        }),
    };
    // Set remaining rows span in current column
    tableData.columns[tableData.columnIndex].rowSpanRemaining = options.rowSpan || 1;
    // Increment current column index
    tableData.columnIndex += options.columnSpan || 1;
    return [new docx.TableCell({ ...options, ...properties })];
}

/*>>> : anchor absolute|relative
*/
function getTableHVPosition<T extends Dict<string>>(text: string | undefined, enumValue: T) {
    return splitListValues(text, {
        anchor: value => convertEnum.noErr(value, docx.TableAnchorType),
        relative: value => convertEnum.noErr(value, enumValue),
        absolute: value => convertUniversalMeasure.noErr(value),
    }) as {
        anchor?: typeof docx.TableAnchorType[keyof typeof docx.TableAnchorType],
        relative?: T[keyof T],
        absolute?: docx.UniversalMeasure,
    };
}


/*>>> : horizontal, vertical */
export function getBorderHV(value: string | undefined) {
    let borders = getBorders(value);
    if (borders === undefined) return undefined;
    if (borders.bottom || borders.right) error('At most two border values required in "inside-border" attribute');
    return {
        //* `horizontal` - Horizontal borders.
        horizontal: borders.top,
        //* `vertical` - Vertical borders.
        vertical: borders.left,
    };
    /*> Each type of the border is `@short:getBorderOptions`: @getBorderOptions */
}

export class TableData {
    public columnIndex: number = 0;
    public columns: {
        width?: number,
        common?: { [tagName: string]: Attributes },
        rowSpanRemaining?: number,
    }[] = [];
}
