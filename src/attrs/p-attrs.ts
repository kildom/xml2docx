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
import { splitListValues, undefEmpty } from '../common';
import { Element } from '../xml';
import { getBorders } from './borders-attrs';
import { AlignmentTypeAliases } from '../enums';


/*>>> : exactly|at-least distance|multiple
*/
function getLineSpacing(element: Element, name: string): docx.ISpacingProperties | undefined {
    let text = element.attributes[name];
    // TODO: beforeAutoSpacing?: boolean; afterAutoSpacing?: boolean;
    let spacing = splitListValues(element, name, text, {
        //* `exactly|at-least` *[optional]* - Use exactly or at least the value. `at-least` by default.
        exactly: (value: string) => value.toLowerCase()[0] === 'e' ? true : undefined,
        atLeast: (value: string) => value.toLowerCase()[0] === 'a' ? true : undefined,
        //* `distance` *[optional]* - Absolute distance. @@
        distance: (value: string) => convert.positiveUniversalMeasureInt.noErr(value, convert.UnitsPerPt.dxa),
        //* `multiple` *[optional]* - Multiple of one line, fractions allowed. @@
        multiple: (value: string) => convert.ufloat.noErr(value),
    }) as { distance: number, multiple: number, exactly: boolean } | undefined;
    /*> Provide exactly one of `distance` or `multiple`.
    */

    if (spacing?.distance !== undefined) {
        return {
            line: spacing.distance,
            lineRule: spacing.exactly ? docx.LineRuleType.EXACT : docx.LineRuleType.AT_LEAST,
        };
    } else if (spacing?.multiple !== undefined) {
        return {
            line: Math.round(240 * Math.max((spacing.exactly ? 0 : 1), spacing.multiple)),
            lineRule: docx.LineRuleType.EXACTLY,
        };
    } else {
        return undefined;
    }
}

/*>>> : before after contextual
*/
function getSpacing(element: Element, name: string): docx.ILevelParagraphStylePropertiesOptions | undefined {
    let text = element.attributes[name];
    let spacing = splitListValues(element, name, text, {
        //* `before` *[optional]* - Space before paragraph. @@
        before: (value: string) => convert.positiveUniversalMeasureInt.noErr(value, convert.UnitsPerPt.dxa),
        //* `after` *[optional]* - Space after paragraph. @@
        after: (value: string) => convert.positiveUniversalMeasureInt.noErr(value, convert.UnitsPerPt.dxa),
        //* `contextual` *[optional]* - Use contextual spacing. If set, it is literal `contextual`.
        contextual: (value: string) => value.toLowerCase()[0] === 'c' ? true : undefined,
    }) as { before: number, after: number, contextual: boolean } | undefined;

    if (spacing) {
        return {
            spacing: {
                before: spacing.before,
                after: spacing.after,
            },
            contextualSpacing: spacing.contextual,
        };
    } else {
        return undefined;
    }
}


/*>>> : left right first-line
*/
function getIndent(element: Element, name: string): docx.IIndentAttributesProperties | undefined {

    let indent = element.attributes[name];
    let result = splitListValues(element, name, indent, {
        //* `left` *[optional]* - Left indent. Zero by default. @filterPositiveUniversalMeasure
        left: (value: string) => convert.positiveUniversalMeasure.noErr(value),
        //* `right` *[optional]* - Right indent. Zero by default. @filterPositiveUniversalMeasure
        right: (value: string) => convert.positiveUniversalMeasure.noErr(value),
        //* `first-line` *[optional]* - First line offset relative to `left`. Zero by default. @filterUniversalMeasure
        firstLine: (value: string) => convert.universalMeasure.noErr(value),
    });

    if (result?.firstLine?.startsWith('-')) {
        result.hanging = (result.firstLine as string).replace(/^-/, '');
        delete result.firstLine;
    }

    return result;
}

/*>>> */
export function getILevelParagraphStylePropertiesOptions(element: Element) {
    //* Vertical spacing of the paragraph. @@
    let spacing = getSpacing(element, 'spacing');
    //* Spacing between lines. @@
    let lineSpacing = getLineSpacing(element, 'linespacing');
    let options: docx.ILevelParagraphStylePropertiesOptions = {
        //* Text alignment. @enum:AlignmentType+AlignmentTypeAliases
        alignment: convert.enumeration(element, 'align', docx.AlignmentType, AlignmentTypeAliases),
        //* Text indentation. @@
        indent: getIndent(element, 'indent'),
        //* Keep text lines. @@
        keepLines: convert.bool(element, 'keeplines'),
        //* Keep next. @@
        keepNext: convert.bool(element, 'keepnext'),
        //* Outline level if this paragraph should be part of document outline. @@
        outlineLevel: convert.uint(element, 'outline'),
        contextualSpacing: spacing?.contextualSpacing,
        spacing: undefEmpty({
            ...spacing?.spacing,
            ...lineSpacing,
        })
    };
    return options;
}


/*>>>
@merge:getILevelParagraphStylePropertiesOptions
*/
export function getIParagraphStylePropertiesOptions(element: Element) {
    let options: docx.IParagraphStylePropertiesOptions = {
        ...getILevelParagraphStylePropertiesOptions(element),
        // TODO: numbering
    };
    return options;
}


/*>>> : position type leader, ...
*/
function getSingleTabStop(element: Element, tab: string): docx.TabStopDefinition | undefined {

    let result = splitListValues(element, 'tabs', tab, {
        //* `type` *[optional]* - Type of tab. @enum:TabStopType
        type: (value: string) => [
            convert.enumeration.noErr(element, value, docx.TabStopType),
            () => docx.TabStopType.LEFT,
        ],
        //* `leader` *[optional]* - Type of tab leader. @enum:LeaderType
        leader: (value: string) => convert.enumeration.noErr(element, value, docx.LeaderType),
        //* `position` *[required]* - Tab position. @@
        position: [
            (value: string) => convert.universalMeasureInt.noErr(value, convert.UnitsPerPt.dxa),
            () => 0,
            'Invalid tab position.',
        ]
    });

    return result as docx.TabStopDefinition | undefined;
}

/*>>>
@merge:getSingleTabStop
*/
function getTabStops(element: Element): docx.TabStopDefinition[] | undefined {
    let tabs = element.attributes.tabs;
    if (tabs === undefined) return undefined;
    return tabs.split(/\s*[,;]\s*/)
        .map(tab => getSingleTabStop(element, tab))
        .filter(tab => tab)
        .sort((a, b) => a!.position - b!.position) as docx.TabStopDefinition[];
}

/*>>>
@merge:getIParagraphStylePropertiesOptions
*/
export function getIParagraphPropertiesOptions(element: Element) {
    let attributes = element.attributes;
    let options: docx.IParagraphPropertiesOptions = {
        ...getIParagraphStylePropertiesOptions(element),
        //* Paragraph border. @@
        border: getBorders(element, 'border', attributes.border),
        //* Force page break before this paragraph. @@
        pageBreakBefore: convert.bool(element, 'pagebreak'),
        //* Tabulator stops. @@
        tabStops: getTabStops(element),
        style: attributes.style,
        // TODO: bullet - numbering
        shading: attributes.background === undefined ? undefined : {
            type: docx.ShadingType.SOLID,
            color: convert.color(element, 'background'),
        },
        // TODO: what is frame?
        wordWrap: convert.bool(element, 'wordwrap'),
        // TODO: what is scale?
    };
    return options;
}
