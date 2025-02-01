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
import { TranslatorState } from '../translator';
import { Element } from '../xml';


const avoidOrphansVarRegExp: RegExp[] = [];
const avoidOrphansFixedRegExp: RegExp[] = [];


function textWithChild(ts: TranslatorState, child: any): any[] {
    return [new docx.TextRun({
        ...ts.format,
        children: [child],
    })];
}

function textWithString(ts: TranslatorState, text: string): any[] {
    return [new docx.TextRun({
        ...ts.format,
        text: text,
    })];
}

export function brTag(ts: TranslatorState): any[] {
    return textWithChild(ts, new docx.EmptyElement('w:br'));
}


export function tabTag(ts: TranslatorState): any[] {
    return textWithChild(ts, new docx.Tab());
}

export function spaceTag(ts: TranslatorState): any[] {
    return textWithString(ts, ' ');
}

export function pagenumberTag(ts: TranslatorState): any[] {
    return textWithChild(ts, docx.PageNumber.CURRENT);
}

export function totalpagesTag(ts: TranslatorState): any[] {
    return textWithChild(ts, docx.PageNumber.TOTAL_PAGES);
}

export function pagebreakTag(): any[] {
    return [new docx.PageBreak()];
}

export function vwnbspTag(ts: TranslatorState): any[] {
    return textWithString(ts, '\uFEFF ');
}

export function textTag(ts: TranslatorState, element: Element): any[] {

    let value = element.text;

    if (ts.format.useVarWidthNoBreakSpace) {
        value = value.replace(/\xA0/g, '\uFEFF ');
    }

    if (ts.format.avoidOrphans && ts.format.avoidOrphans > 0) {
        let count = ts.format.avoidOrphans;
        if (ts.format.useVarWidthNoBreakSpace) {
            if (!avoidOrphansVarRegExp[count]) {
                avoidOrphansVarRegExp[count] = new RegExp(`(?<=(?:^|\\s)\\p{Letter}{1,${count}})(?=\\s|$)`, 'gmu');
            }
            value = value.replace(avoidOrphansVarRegExp[count], '\uFEFF');
        } else {
            if (!avoidOrphansFixedRegExp[count]) {
                avoidOrphansFixedRegExp[count] = new RegExp(`(?<=(?:^|\\s)\\p{Letter}{1,${count}})\\s+`, 'gu');
            }
            value = value.replace(avoidOrphansFixedRegExp[count], '\xA0');
        }
    }

    return textWithString(ts, value);
}
