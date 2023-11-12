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

import { getColor } from "../colors";
import { DocxTranslator } from "../docxTranslator";
import { fromEnum } from "../filters";
import { Element, XMLError } from "../xml";
import * as docx from "docx";

export function getBorderOptions(tr: DocxTranslator, src: Element, text: string | undefined) {
    if (text === undefined) return undefined;
    let parts = text.trim().split(/\s+/);
    let color: string | undefined = undefined;
    let style: docx.BorderStyle = docx.BorderStyle.SINGLE;
    let size: number | undefined = undefined;
    let space: number | undefined = undefined;
    for (let p of parts) {
        let c = getColor(p);
        if (c !== undefined) {
            color = c;
            continue;
        }
        let st = fromEnum(src, p, docx.BorderStyle, undefined, false) as docx.BorderStyle;
        if (st !== undefined) {
            style = st;
            continue;
        }
        if (size === undefined) {
            size = tr.filter(src, ':pt8', p);
        } else if (space === undefined) {
            space = tr.filter(src, ':pt', p);
        } else {
            throw new XMLError(src, 'Invalid border options.');
        }
    }
    if (style === undefined) throw new XMLError(src, 'Border style required.');
    return { color, style, size, space };
}

export function getBorder(tr: DocxTranslator, src: Element, value: string | undefined) {
    if (value === undefined) return undefined;
    let parts = value.trim().toLowerCase().split(/[,;]/);
    if (parts.length == 3) {
        parts = [...parts, parts[1]];
    } else {
        parts = [...parts, ...parts, ...parts, ...parts];
    }
    return {
        top: getBorderOptions(tr, src, parts[0]),
        right: getBorderOptions(tr, src, parts[1]),
        bottom: getBorderOptions(tr, src, parts[2]),
        left: getBorderOptions(tr, src, parts[3]),
    }
}

export function getMargins(tr: DocxTranslator, src: Element, value: string | undefined, filterName = ':emu'): docx.IMargins | undefined {
    if (value === undefined) return undefined;
    let parts = value.trim().toLowerCase().split(/(\s+|[,;])/);
    if (parts.length == 3) {
        parts = [...parts, parts[1]];
    } else {
        parts = [...parts, ...parts, ...parts, ...parts];
    }
    return {
        top: tr.filter(src, filterName, parts[0], true),
        right: tr.filter(src, filterName, parts[1], true),
        bottom: tr.filter(src, filterName, parts[2], true),
        left: tr.filter(src, filterName, parts[3], true),
    };
}
