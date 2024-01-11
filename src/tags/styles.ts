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
import { AnyObject, Attributes, isTag, requiredAttribute, setTag } from '../common';
import {
    filterFloat, filterUint, fromEnum, filterBool, FilterMode, filterLengthUint, LengthUnits,
    filterLengthInt, filterColor
} from '../filters';
import { getBorder } from './borders';
import { getIRunStylePropertiesOptions } from './characters';
import { AlignmentTypeAliases } from '../enums';

/*>>>
@merge:getIParagraphStylePropertiesOptions
*/
export function getIParagraphPropertiesOptions(tr: DocxTranslator, attributes: Attributes) {
    let options: docx.IParagraphPropertiesOptions = {
        ...getIParagraphStylePropertiesOptions(tr, attributes),
        //* Paragraph border. @@
        border: getBorder(attributes.border),
        //* Force page break before this paragraph. @@
        pageBreakBefore: filterBool(attributes.pageBreak, FilterMode.UNDEF),
        //* Tabulator stops. @@
        tabStops: getTabStops(tr, attributes.tabs),
        style: attributes.style,
        // TODO: bullet - numbering
        shading: attributes.background === undefined ? undefined : {
            type: docx.ShadingType.SOLID,
            color: filterColor(attributes.background, FilterMode.EXACT),
        },
        // TODO: what is frame?
        wordWrap: filterBool(attributes.wordWrap, FilterMode.UNDEF),
        // TODO: what is scale?
    };
    return options;
}

/*>>>
@merge:getILevelParagraphStylePropertiesOptions
*/
export function getIParagraphStylePropertiesOptions(tr: DocxTranslator, attributes: Attributes) {
    let options: docx.IParagraphStylePropertiesOptions = {
        ...getILevelParagraphStylePropertiesOptions(tr, attributes),
        // TODO: numbering
    };
    return options;
}

/*>>> */
export function getILevelParagraphStylePropertiesOptions(tr: DocxTranslator, attributes: Attributes) {
    let options: docx.ILevelParagraphStylePropertiesOptions = {
        //* Text alignment. @enum:AlignmentType+AlignmentTypeAliases
        alignment: fromEnum(attributes.align, docx.AlignmentType, AlignmentTypeAliases),
        //* Text indentation. @@
        indent: getIndent(attributes.indent),
        //* Keep text lines. @@
        keepLines: filterBool(attributes.keepLines, FilterMode.UNDEF),
        //* Keep next. @@
        keepNext: filterBool(attributes.keepNext, FilterMode.UNDEF),
        //* Outline level if this paragraph should be part of document outline. @@
        outlineLevel: filterUint(attributes.outline, FilterMode.UNDEF),
        //* Vertical spacing of the paragraph. @@
        ...getSpacing(tr, attributes.spacing),
    };
    return options;
}

/*>>> */
function getIndent(indent: string | undefined): docx.IIndentAttributesProperties | undefined {
    if (indent === undefined) return undefined;
    let arr = indent.split(/\s+/);
    let firstLine: docx.PositiveUniversalMeasure | undefined = undefined;
    let hanging: docx.PositiveUniversalMeasure | undefined = undefined;
    if (arr[2]) {
        if (arr[2].trim().startsWith('-')) {
            hanging = arr[2].replace('-', '') as docx.PositiveUniversalMeasure;
        } else {
            firstLine = arr[2] as docx.PositiveUniversalMeasure;
        }
    }
    return {
        left: !arr[0] ? undefined : arr[0] as docx.PositiveUniversalMeasure,
        right: !arr[1] ? undefined : arr[1] as docx.PositiveUniversalMeasure,
        firstLine,
        hanging,
    };
}

/*>>> */
function getSpacing(tr: DocxTranslator, spacing?: string): docx.ILevelParagraphStylePropertiesOptions | undefined {
    if (spacing === undefined) return undefined;
    let arr: string[] = spacing.split(/\s+/);
    let ba: number[] = [];
    let lineRule: (typeof docx.LineRuleType)[keyof typeof docx.LineRuleType] | undefined = undefined;
    let i: number;
    let contextualSpacing: true | undefined = undefined;
    for (i = 0; i < arr.length; i++) {
        if (arr[i] === 'contextual') {
            contextualSpacing = true;
            continue;
        }
        lineRule = fromEnum(arr[i], docx.LineRuleType, {}, false);
        if (lineRule) {
            i++;
            break;
        }
        ba.push(filterLengthUint(arr[i], LengthUnits.dxa, FilterMode.EXACT));
    }
    let lineStr: string | undefined = undefined;
    for (; i < arr.length; i++) {
        if (arr[i] === 'contextual') {
            contextualSpacing = true;
            continue;
        }
        lineStr = arr[i];
    }
    let line: number | undefined = undefined;
    if (lineStr !== undefined && lineRule !== undefined) {
        if (lineRule === docx.LineRuleType.AT_LEAST || lineRule === docx.LineRuleType.EXACT) {
            line = filterLengthUint(lineStr, LengthUnits.dxa, FilterMode.EXACT);
        } else {
            line = Math.round(240 * filterFloat(lineStr, FilterMode.EXACT));
        }
    }
    return {
        spacing: {
            before: ba[0],
            after: ba[1],
            line,
            lineRule,
        },
        contextualSpacing,
    };
}
function getSingleTabStop(tr: DocxTranslator, tab: string): docx.TabStopDefinition | undefined {
    let type: (typeof docx.TabStopType)[keyof typeof docx.TabStopType] | undefined = undefined;
    let position: number | undefined = undefined;
    let leader: (typeof docx.LeaderType)[keyof typeof docx.LeaderType] | undefined = undefined;
    let arr = tab.split(/\s+/);
    for (let value of arr) {
        let t = fromEnum(value, docx.TabStopType, {}, false);
        if (t !== undefined) {
            type = t;
            continue;
        }
        let l = fromEnum(value, docx.LeaderType, {}, false);
        if (l !== undefined) {
            leader = l;
            continue;
        }
        position = filterLengthInt(value, LengthUnits.dxa, FilterMode.EXACT);
    }
    return position !== undefined ? { type: type || docx.TabStopType.LEFT, position, leader } : undefined;
}

/*>>>
TODO: tabstops
*/
function getTabStops(tr: DocxTranslator, tabs: string | undefined): docx.TabStopDefinition[] | undefined {
    if (tabs === undefined) return undefined;
    return tabs.split(/\s*[,;]\s*/)
        .map(tab => getSingleTabStop(tr, tab))
        .filter(tab => tab)
        .sort((a, b) => a!.position - b!.position) as docx.TabStopDefinition[];
}

function pStyleFontTag(tr: DocxTranslator, attributes: Attributes, properties: AnyObject): any[] {
    return [getIRunStylePropertiesOptions(attributes, properties)];
}

/*>>>
Define a paragraph style.

Default font style inside paragraph can be set using
[`<font>` element](format.md#font) inside this element.

@merge:getIParagraphStylePropertiesOptions
*/
export function pStyleTag(tr: DocxTranslator, attributes: Attributes, properties: AnyObject): any[] {
    let fonts = tr.copy(undefined, { 'font': pStyleFontTag }).parseObjects(tr.element, SpacesProcessing.IGNORE);
    if ((fonts.length > 1) || (fonts.length > 0 && !isTag(fonts[0], 'IRunStylePropertiesOptions'))) {
        throw new Error('The <p-style> tag allows only one <font> child tag.');
    }
    let options: docx.IParagraphStyleOptions = {
        //* Style id. Use it to identify the style.
        id: requiredAttribute(attributes, 'id'),
        //* Style id of the parent style.
        basedOn: attributes.basedOn,
        //* User friendly name of the style.
        name: requiredAttribute(attributes, 'name'),
        //* Id if style for new paragraphs following this style.
        next: attributes.next,
        paragraph: getIParagraphStylePropertiesOptions(tr, attributes),
        run: fonts[0],
        ...properties,
    };
    setTag(options, 'IParagraphStyleOptions');
    return [options];
}
