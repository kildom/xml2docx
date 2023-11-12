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
import { fromEnum } from "../filters";
import { getBorder } from "./borders";


export function getIParagraphPropertiesOptions(tr: DocxTranslator, src: Element, attributes: AnyObject) {
    let options: docx.IParagraphPropertiesOptions = {
        ...getIParagraphStylePropertiesOptions(tr, src, attributes),
        border: getBorder(tr, src, attributes.border),
        pageBreakBefore: tr.filter(src, ':bool', attributes.pageBreak, true),
        tabStops: getTabStops(tr, src, attributes.tabs),
        style: attributes.style,
        // TODO: bullet - numbering
        shading: attributes.background && {
            type: docx.ShadingType.SOLID,
            color: getColor(attributes.background),
        },
        // TODO: what is frame?
        wordWrap: tr.filter(src, ':bool', attributes.wordWrap, true),
        // TODO: what is scale?
    }
    return options;
}

export function getIParagraphStylePropertiesOptions(tr: DocxTranslator, src: Element, attributes: AnyObject) {
    let options: docx.IParagraphStylePropertiesOptions = {
        ...getILevelParagraphStylePropertiesOptions(tr, src, attributes),
        // TODO: numbering
    };
    return options;
}

export function getILevelParagraphStylePropertiesOptions(tr: DocxTranslator, src: Element, attributes: AnyObject) {
    let options: docx.ILevelParagraphStylePropertiesOptions = {
        alignment: fromEnum(src, attributes.align, docx.AlignmentType, { justify: 'both' }) as docx.AlignmentType,
        indent: getIndent(attributes),
        keepLines: tr.filter(src, ':bool', attributes.keepLines, true),
        keepNext: tr.filter(src, ':bool', attributes.keepNext, true),
        outlineLevel: tr.filter(src, ':int', attributes.outline, true),
        ...getSpacing(tr, src, attributes),
    };
    return options;
}

function getIndent(attributes: AnyObject): docx.IIndentAttributesProperties | undefined {
    let indent = attributes.indent;
    if (indent === undefined) return undefined;
    let arr = indent.split(/\s+/);
    let firstLine: docx.PositiveUniversalMeasure | undefined = undefined;
    let hanging: docx.PositiveUniversalMeasure | undefined = undefined;
    if (arr[2]) {
        if (arr[2].trim().startsWith('-')) {
            hanging = arr[2].replace('-', '');
        } else {
            firstLine = arr[2];
        }
    }
    return {
        left: !arr[0] ? undefined : arr[0],
        right: !arr[1] ? undefined : arr[1],
        firstLine,
        hanging,
    };
}

function getSpacing(tr: DocxTranslator, src: Element, attributes: AnyObject): docx.ILevelParagraphStylePropertiesOptions | undefined {
    if (attributes.spacing === undefined) return undefined;
    let arr: string[] = attributes.spacing.split(/\s+/);
    let ba: number[] = [];
    let lineRule: docx.LineRuleType | undefined = undefined;
    let i: number;
    let contextualSpacing: true | undefined = undefined;
    for (i = 0; i < arr.length; i++) {
        if (arr[i] === 'contextual') {
            contextualSpacing = true;
            continue;
        }
        lineRule = fromEnum(src, arr[i], docx.LineRuleType, {}, false) as docx.LineRuleType | undefined;
        if (lineRule) {
            i++;
            break;
        }
        ba.push(tr.filter(src, ':pt20', arr[i], true));
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
            line = tr.filter(src, ':pt20', lineStr);
        } else {
            line = Math.round(240 * tr.filter(src, ':float', lineStr));
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
    }
}
function getSingleTabStop(tr: DocxTranslator, src: Element, tab: string): docx.TabStopDefinition | undefined {
    let type: docx.TabStopType | undefined = undefined;
    let position: number | undefined = undefined;
    let leader: docx.LeaderType | undefined = undefined;
    let arr = tab.split(/\s+/);
    for (let value of arr) {
        let t = fromEnum(src, value, docx.TabStopType, {}, false) as docx.TabStopType | undefined;
        if (t !== undefined) {
            type = t;
            continue;
        }
        let l = fromEnum(src, value, docx.LeaderType, {}, false) as docx.LeaderType | undefined;
        if (l !== undefined) {
            leader = l;
            continue;
        }
        position = tr.filter(src, ':dxa', value);
    }
    return position !== undefined ? { type: type || docx.TabStopType.LEFT, position, leader } : undefined;
}

function getTabStops(tr: DocxTranslator, src: Element, tabs: string | undefined): docx.TabStopDefinition[] | undefined {
    if (tabs === undefined) return undefined;
    return tabs.split(/\s*[,;]\s*/)
        .map(tab => getSingleTabStop(tr, src, tab))
        .filter(tab => tab)
        .sort((a, b) => a!.position - b!.position) as docx.TabStopDefinition[];
}

