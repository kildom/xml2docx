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


export const GLOBE_PNG = new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, 0x00, 0x00,
    0x00, 0x13, 0x00, 0x00, 0x00, 0x13, 0x02, 0x03, 0x00, 0x00, 0x00, 0x0f, 0x3e, 0xde, 0x5f, 0x00, 0x00, 0x00,
    0x0c, 0x50, 0x4c, 0x54, 0x45, 0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0xab, 0xab, 0xab, 0x54, 0x54, 0x54, 0xcf,
    0xae, 0x58, 0x32, 0x00, 0x00, 0x00, 0x52, 0x49, 0x44, 0x41, 0x54, 0x08, 0xd7, 0x63, 0x60, 0x60, 0x58, 0xc1,
    0x00, 0x04, 0xaa, 0xa1, 0x09, 0x40, 0x32, 0x76, 0xe6, 0x15, 0x06, 0x06, 0xc6, 0x63, 0x42, 0xbe, 0x0c, 0x0c,
    0xec, 0x2a, 0x02, 0x8f, 0x1d, 0x80, 0xc2, 0xa1, 0x40, 0x09, 0x89, 0x09, 0x02, 0x12, 0x13, 0x18, 0x04, 0x80,
    0xa4, 0x00, 0xc3, 0x84, 0x0f, 0x02, 0x16, 0x12, 0x0c, 0x53, 0x81, 0xe2, 0x11, 0x10, 0x36, 0x44, 0x1c, 0xa2,
    0x06, 0xaa, 0x9e, 0x5d, 0x47, 0x20, 0xd9, 0x01, 0x6c, 0x0e, 0xc4, 0x4c, 0xa8, 0xf9, 0x10, 0xbb, 0x00, 0x78,
    0x4f, 0x18, 0x4d, 0x03, 0xb9, 0x39, 0x00, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60,
    0x82
]);

export const HELLO_XML = `<?xml version="1.0" encoding="UTF-8"?>
<document>
    <p>
        <img src="globe.png" width="5mm" height="5mm" />
        Hello <% name %>!
    </p>
</document>
`;

export const DATA_JSON5 = `{
    "name": "World"
}
`;
