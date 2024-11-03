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
import { Attributes, Dict, splitListValues, undefEmpty } from '../common';
import { CaptureChildren, getDocxConstructor, normalizeElement, translateNodes, TranslatorState } from '../translate';
import { Element, Node, SpacesProcessing } from '../xml';
import { paragraphContextTags } from './text';
import { getBorders } from './borders';
import {
    convertBool, convertColor, convertEnum, convertPositiveUniversalMeasure, convertPositiveUniversalMeasureInt,
    convertUfloat, convertUint, convertUniversalMeasure, convertUniversalMeasureInt, UnitsPerPt
} from '../converters';
import { AlignmentTypeAliases } from '../enums';

type HeadingLevelType = (typeof docx.HeadingLevel)[keyof typeof docx.HeadingLevel];

export const headingTags: Dict<HeadingLevelType | undefined> = {
    'p': undefined,
    'h1': docx.HeadingLevel.HEADING_1,
    'h2': docx.HeadingLevel.HEADING_2,
    'h3': docx.HeadingLevel.HEADING_3,
    'h4': docx.HeadingLevel.HEADING_4,
    'h5': docx.HeadingLevel.HEADING_5,
    'h6': docx.HeadingLevel.HEADING_6,
    'title': docx.HeadingLevel.TITLE,
};

/*>>>
@merge:getIParagraphStylePropertiesOptions
*/
export function getIParagraphPropertiesOptions(attributes: Attributes) {
    let options: docx.IParagraphPropertiesOptions = {
        ...getIParagraphStylePropertiesOptions(attributes),
        //* Paragraph border. @@
        border: getBorders(attributes.border),
        //* Force page break before this paragraph. @@
        pageBreakBefore: convertBool(attributes.pagebreak),
        //* Tabulator stops. @@
        tabStops: getTabStops(attributes.tabs),
        style: attributes.style,
        // TODO: bullet - numbering
        shading: attributes.background === undefined ? undefined : {
            type: docx.ShadingType.SOLID,
            color: convertColor(attributes.background),
        },
        // TODO: what is frame?
        wordWrap: convertBool(attributes.wordwrap),
        // TODO: what is scale?
    };
    return options;
}

/*>>>
@merge:getILevelParagraphStylePropertiesOptions
*/
export function getIParagraphStylePropertiesOptions(attributes: Attributes) {
    let options: docx.IParagraphStylePropertiesOptions = {
        ...getILevelParagraphStylePropertiesOptions(attributes),
        // TODO: numbering
    };
    return options;
}

/*>>> */
export function getILevelParagraphStylePropertiesOptions(attributes: Attributes) {
    //* Vertical spacing of the paragraph. @@
    let spacing = getSpacing(attributes.spacing);
    //* Spacing between lines. @@
    let lineSpacing = getLineSpacing(attributes.linespacing);
    let options: docx.ILevelParagraphStylePropertiesOptions = {
        //* Text alignment. @enum:AlignmentType+AlignmentTypeAliases
        alignment: convertEnum(attributes.align, docx.AlignmentType, AlignmentTypeAliases),
        //* Text indentation. @@
        indent: getIndent(attributes.indent),
        //* Keep text lines. @@
        keepLines: convertBool(attributes.keeplines),
        //* Keep next. @@
        keepNext: convertBool(attributes.keepnext),
        //* Outline level if this paragraph should be part of document outline. @@
        outlineLevel: convertUint(attributes.outline),
        contextualSpacing: spacing?.contextualSpacing,
        spacing: undefEmpty({
            ...spacing?.spacing,
            ...lineSpacing,
        })
    };
    return options;
}


/*>>> : before after contextual
*/
function getSpacing(text: string | undefined): docx.ILevelParagraphStylePropertiesOptions | undefined {
    let spacing = splitListValues(text, {
        //* `before` *[optional]* - Space before paragraph. @@
        before: (value: string) => convertPositiveUniversalMeasureInt.noErr(value, UnitsPerPt.dxa),
        //* `after` *[optional]* - Space after paragraph. @@
        after: (value: string) => convertPositiveUniversalMeasureInt.noErr(value, UnitsPerPt.dxa),
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

/*>>> : exactly|at-least distance|multiple
*/
function getLineSpacing(text?: string): docx.ISpacingProperties | undefined {
    // TODO: beforeAutoSpacing?: boolean; afterAutoSpacing?: boolean;
    let spacing = splitListValues(text, {
        //* `exactly|at-least` *[optional]* - Use exactly or at least the value. `at-least` by default.
        exactly: (value: string) => value.toLowerCase()[0] === 'e' ? true : undefined,
        atLeast: (value: string) => value.toLowerCase()[0] === 'a' ? true : undefined,
        //* `distance` *[optional]* - Absolute distance. @@
        distance: (value: string) => convertPositiveUniversalMeasureInt.noErr(value, UnitsPerPt.dxa),
        //* `multiple` *[optional]* - Multiple of one line, fractions allowed. @@
        multiple: (value: string) => convertUfloat.noErr(value),
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

/*>>> : left right first-line
*/
function getIndent(indent: string | undefined): docx.IIndentAttributesProperties | undefined {

    let result = splitListValues(indent, {
        //* `left` *[optional]* - Left indent. Zero by default. @filterPositiveUniversalMeasure
        left: (value: string) => convertPositiveUniversalMeasure.noErr(value),
        //* `right` *[optional]* - Right indent. Zero by default. @filterPositiveUniversalMeasure
        right: (value: string) => convertPositiveUniversalMeasure.noErr(value),
        //* `first-line` *[optional]* - First line offset relative to `left`. Zero by default. @filterUniversalMeasure
        firstLine: (value: string) => convertUniversalMeasure.noErr(value),
    });

    if (result?.firstLine?.startsWith('-')) {
        result.hanging = (result.firstLine as string).replace(/^-/, '');
        delete result.firstLine;
    }

    return result;
}

/*>>> : position type leader, ...
*/
function getSingleTabStop(tab: string): docx.TabStopDefinition | undefined {


    let result = splitListValues(tab, {
        //* `type` *[optional]* - Type of tab. @enum:TabStopType
        type: (value: string) => [
            convertEnum.noErr(value, docx.TabStopType),
            () => docx.TabStopType.LEFT,
        ],
        //* `leader` *[optional]* - Type of tab leader. @enum:LeaderType
        leader: (value: string) => convertEnum.noErr(value, docx.LeaderType),
        //* `position` *[required]* - Tab position. @@
        position: [
            (value: string) => convertUniversalMeasureInt.noErr(value, UnitsPerPt.dxa),
            () => 0,
            'Invalid tab position.',
        ]
    });

    return result as docx.TabStopDefinition | undefined;
}

/*>>>
@merge:getSingleTabStop
*/
function getTabStops(tabs: string | undefined): docx.TabStopDefinition[] | undefined {
    if (tabs === undefined) return undefined;
    return tabs.split(/\s*[,;]\s*/)
        .map(tab => getSingleTabStop(tab))
        .filter(tab => tab)
        .sort((a, b) => a!.position - b!.position) as docx.TabStopDefinition[];
}

export function pTag(ts: TranslatorState, element: Element, captureChildren?: CaptureChildren): docx.Paragraph[] {

    let [tsInner, attributes, properties] = normalizeElement(ts, element, SpacesProcessing.TRIM);

    let heading: HeadingLevelType | undefined = headingTags[element.name];
    let options: docx.IParagraphOptions = {
        ...getIParagraphPropertiesOptions(attributes),
        children: translateNodes(tsInner, element.elements, paragraphContextTags),
        heading,
    };

    captureChildren?.(options.children); // TODO: For docx->doctml context switch (<...:doctml.p> tag)

    /*unused*/ attributes;

    return [new docx.Paragraph({ ...options, ...properties })];
}


export function addImplicitParagraphs(nodes: Node[], allowedTags: string[]): void {
    let result: Node[] = [];
    let allowed = new Set(allowedTags);
    let chunk: Node[] = [];
    for (let i = 0; i <= nodes.length; i++) {
        let node = nodes[i];
        if (node && (node.type !== 'element'
            || !(allowed.has(node.name) || getDocxConstructor(node.name) || node.name.startsWith('group#')))
        ) {
            chunk.push(node);
        } else {
            if (chunk.length > 0) {
                let paragraph: Element = {
                    type: 'element',
                    name: 'p',
                    attributes: {},
                    properties: {},
                    elements: chunk,
                    line: chunk[0].line,
                    column: chunk[0].column,
                };
                chunk = [];
                result.push(paragraph);
            }
            if (node) {
                result.push(node);
            }
        }
    }
    nodes.splice(0, nodes.length, ...result);
}
