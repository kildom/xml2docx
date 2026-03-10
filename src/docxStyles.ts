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

import sax from 'sax';

export interface Style {
    type: 'paragraph' | 'character';
    id: string;
    name?: string;
}

export function getDocxStyles(xmlText: string) {

    let parser = sax.parser(false, {
        normalize: true,
        lowercase: true,
    });

    let styles: Style[] = [];
    let current: Style | undefined = undefined;

    parser.onopentag = (tag: sax.Tag) => {
        if (tag.name === 'w:style') {
            let type = tag.attributes['w:type'];
            let id = tag.attributes['w:styleid'];
            if (type === 'paragraph' || type === 'character') {
                current = { type, id };
                styles.push(current);
            }
        } else if (current && tag.name === 'w:name') {
            current.name = tag.attributes['w:val'];
        }
    };

    parser.onclosetag = (tagName: string) => {
        if (tagName === 'w:style') {
            current = undefined;
        }
    };

    parser.write(xmlText);
    parser.close();

    return styles;
}
