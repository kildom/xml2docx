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
import { Dict, selectUndef, splitListValues, undefEmpty } from '../common';
import { convertElement, prepareElement, processChildren, ProcessOptions, TranslatorState } from '../translator';
import { Element } from '../xml';
import * as convert from '../convert';
import { getBorders, getMargin } from '../attrs/borders-attrs';
import { headingTags } from './p';
import { TextDirectionAliases, VerticalAlignAliases } from '../enums';

function filterAttribute(element: Element, name: string, value: string): [Element, string] {
    return [ // TODO: This function is strage. The convert functions should be able to handle it.
        {
            ...element,
            attributes: {
                ...element.attributes,
                [name]: value,
            },
        },
        name];
}


const tableTagOptions: ProcessOptions = {
    tags: { tr: trTag, tc: tcTag },
    removeSpaces: true,
};

/*>>>
Table.

Child elements of the row are `<tr>` (or its associated @api class) or `<tc>`.

@api:classes/Table.
*/
export function tableTag(ts: TranslatorState, element: Element): docx.Table[] {

    let tsInner = prepareElement(ts, element, tableTagOptions);
    tsInner = tsInner.newTableData();
    let tableData = tsInner.tableData;
    let attributes = element.attributes;
    let children = convertElement(tsInner, element, tableTagOptions);

    //* Horizontal floating position. @@:RelativeHorizontalPosition
    let hFloat = getTableHVPosition(element, 'horizontal', docx.RelativeHorizontalPosition);
    //* Vertical floating position. @@:RelativeVerticalPosition
    let vFloat = getTableHVPosition(element, 'vertical', docx.RelativeVerticalPosition);
    //* Distance between table and surrounding text in floating mode. @@
    let floatMargins = getMargin(element, 'floatmargins', convert.positiveUniversalMeasure.noErr);
    //* Table border. @@
    let border = getBorders(element, 'border', attributes.border);
    //* inner-border: Default border between cells. @@
    let insideBorder = getBorderHV(element, 'innerborder');
    let percentage = attributes.width?.endsWith('%');
    //* column-widths: List of columns widths for fixed table layout. @convertPositiveUniversalMeasureInt
    let columnWidths = attributes.columnwidths ? (attributes.columnwidths as string)
        .trim()
        .split(/[;, ]+/)
        .map(x => convert.positiveUniversalMeasureInt(
            ...filterAttribute(element, 'columnwidths', x),
            convert.UnitsPerPt.dxa)!) : undefined;

    for (let i = 0; i < tableData.columns.length; i++) {
        let col = tableData.columns[i];
        if (col?.width !== undefined) {
            columnWidths = columnWidths ?? [];
            columnWidths[i] = col?.width;
        }
    }

    let options: docx.ITableOptions = {
        rows: children,
        columnWidths,
        layout: columnWidths ? docx.TableLayoutType.FIXED : docx.TableLayoutType.AUTOFIT,
        //* Table alignment. @enum:AlignmentType
        alignment: convert.enumeration(element, 'align', docx.AlignmentType),
        //* Table width. It can be expressed as percentage of entire available space (with `%` sign)
        //* or straightforward distance. @convertPositiveUniversalMeasure
        width: attributes.width ? {
            type: percentage ? docx.WidthType.PERCENTAGE : docx.WidthType.DXA,
            size: percentage
                ? convert.uint(...filterAttribute(element, 'width', attributes.width.substring(0, attributes.width.length - 1)))!
                : convert.positiveUniversalMeasure(element, 'width')!,
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
            ...getMargin(element, 'cellmargin',
                (value: string) => convert.positiveUniversalMeasureInt.noErr(value, convert.UnitsPerPt.dxa)
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
                : convert.bool(element, 'overlap') ? docx.OverlapType.OVERLAP : docx.OverlapType.NEVER,
            topFromText: floatMargins?.top,
            rightFromText: floatMargins?.right,
            bottomFromText: floatMargins?.bottom,
            leftFromText: floatMargins?.left,
        }),
    };

    return [new docx.Table(options)];
}

const trTagOptions: ProcessOptions = {
    tags: { td: tdTag },
    removeSpaces: true,
};

function trTag(ts: TranslatorState, element: Element): docx.TableRow[] {

    let tsInner = prepareElement(ts, element, trTagOptions);
    let tableData = tsInner.tableData;
    let children = convertElement(tsInner, element, trTagOptions);

    tableData.columnIndex = 0;
    for (let col of tableData.columns) {
        col.rowSpanRemaining = (col.rowSpanRemaining || 1) - 1;
    }

    let options: docx.ITableRowOptions = {
        children,
        //* Row can be splitted into multiple pages. @@
        cantSplit: convert.bool(element, 'cantsplit'),
        //* This row is a table header. @@
        tableHeader: convert.bool(element, 'header'),
        //* Table height. @@
        height: getTableRowHeight(element, 'height'),
    };
    return [new docx.TableRow(options)];
}

/*>>> : rule value
*/
function getTableRowHeight(element: Element, name: string) {

    let text = element.attributes[name];

    let result = splitListValues(element, name, text, {
        rule: [
            value => convert.enumeration.noErr(element, value, docx.HeightRule, { exactly: docx.HeightRule.EXACT }),
            () => docx.HeightRule.ATLEAST,
        ],
        value: value => convert.positiveUniversalMeasure.noErr(value),
    });

    if ((result?.rule === docx.HeightRule.ATLEAST || result?.rule === docx.HeightRule.EXACT)
        && result?.value === undefined
    ) {
        element.ctx.error(`Height value required in "${text}"`, element);
        result.value = '1cm';
    }

    return result as {
        rule: (typeof docx.HeightRule)[keyof typeof docx.HeightRule];
        value: docx.PositiveUniversalMeasure,
    } | undefined;
}

function tcTag(ts: TranslatorState, element: Element): any[] {

    let tsInner = prepareElement(ts, element, {
        tags: {},
        removeSpaces: true,
    });
    let tableData = tsInner.tableData;

    //* Tells for how many columns this element applies to. @@
    let colSpan = convert.uint(element, 'colspan') ?? 1;
    for (let i = 0; i < colSpan; i++) {
        tableData.columns.push({
            common: tsInner.common,
            //* Sets width of the column. @@
            width: convert.positiveUniversalMeasureInt(element, 'width', convert.UnitsPerPt.dxa),
        });
    }
    return [];
}

function tdTag(ts: TranslatorState, element: Element): any[] {

    let tableData = ts.tableData;
    let attributes = element.attributes;

    // Skip columns that are still inside row span
    while (tableData.columnIndex < tableData.columns.length
        && (tableData.columns[tableData.columnIndex]?.rowSpanRemaining || 0) > 0
    ) {
        tableData.columnIndex++;
    }

    tableData.columns[tableData.columnIndex] = tableData.columns[tableData.columnIndex] ?? { rowSpanRemaining: 0 };
    let tsColumn = ts.setCommon(tableData.columns[tableData.columnIndex]?.common);

    let children = processChildren(tsColumn, element, {
        tags: {
            ...headingTags,
            table: tableTag,
        },
        implicitTag: 'p',
        removeSpaces: true,
    });

    // Parse children and prepare options
    let options: docx.ITableCellOptions = {
        children,
        //* Cell border. @@
        borders: getBorders(element, 'border', attributes.border),
        //* Number of spanning columns. @@
        columnSpan: convert.positiveUint(element, 'colspan'),
        //* Number of spanning rows. @@
        rowSpan: convert.positiveUint(element, 'rowspan'),
        margins: selectUndef(attributes.margin, {
            marginUnitType: docx.WidthType.DXA,
            //* Cell inner margins. @@
            ...getMargin(element, 'margin',
                (value: string) => convert.positiveUniversalMeasureInt.noErr(value, convert.UnitsPerPt.dxa)
            ),
        }),
        //* Text direction. @enum:TextDirection+TextDirectionAliases
        textDirection: convert.enumeration(element, 'dir', docx.TextDirection, TextDirectionAliases),
        //* Vertical alignment. @enum:VerticalAlign+VerticalAlignAliases
        verticalAlign: convert.enumeration(element, 'valign', docx.VerticalAlign, VerticalAlignAliases),
        shading: selectUndef(attributes.background, {
            type: docx.ShadingType.SOLID,
            //* Background color. @@
            color: convert.color(element, 'background'),
        }),
    };
    // Set remaining rows span in current column
    tableData.columns[tableData.columnIndex].rowSpanRemaining = options.rowSpan || 1;
    // Increment current column index
    tableData.columnIndex += options.columnSpan || 1;
    return [new docx.TableCell(options)];
}

/*>>> : anchor absolute|relative
*/
function getTableHVPosition<T extends Dict<string>>(element: Element, name: string, enumValue: T) {
    return splitListValues(element, name, element.attributes[name], {
        anchor: value => convert.enumeration.noErr(element, value, docx.TableAnchorType),
        relative: value => convert.enumeration.noErr(element, value, enumValue),
        absolute: value => convert.universalMeasure.noErr(value),
    }) as {
        anchor?: typeof docx.TableAnchorType[keyof typeof docx.TableAnchorType],
        relative?: T[keyof T],
        absolute?: docx.UniversalMeasure,
    };
}


/*>>> : horizontal, vertical */
export function getBorderHV(element: Element, name: string) {
    let borders = getBorders(element, name, element.attributes[name]);
    if (borders === undefined) return undefined;
    if (borders.bottom || borders.right) {
        element.ctx.error('At most two border values required in "inside-border" attribute', element);
    }
    return {
        //* `horizontal` - Horizontal borders.
        horizontal: borders.top,
        //* `vertical` - Vertical borders.
        vertical: borders.left,
    };
    /*> Each type of the border is `@short:getBorderOptions`: @getBorderOptions */
}
