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

const linuxASCIIArt = `
    \x1B[38;2;87;144;246m+▄\x1B[48;2;87;144;246m                \x1B[0m\x1B[38;2;87;144;246m▄\x1B[0m
    \x1B[38;2;254;254;254m\x1B[48;2;87;144;246m           ▄      \x1B[0m
    \x1B[38;2;254;254;254m\x1B[48;2;21;101;243m     ▂    ▟▘▂     \x1B[0m
    \x1B[38;2;254;254;254m\x1B[48;2;21;101;243m ▂▄▆▀Ó   ▟▘ Ó▀▆▄▂ \x1B[0m
    \x1B[38;2;254;254;254m+\x1B[48;2;10;74;189m Ć▀ł▄▂  ▟▘  ▂▄ł▀Ć \x1B[0m
    \x1B[38;2;254;254;254m+\x1B[48;2;10;74;189m     Ć ▟▘   Ć     \x1B[0m
    \x1B[38;2;254;254;254m++\x1B[48;2;7;49;128m      ▝▘          \x1B[0m
    \x1B[38;2;7;49;128m+▀\x1B[48;2;7;49;128m                \x1B[0m\x1B[38;2;7;49;128m▀\x1B[0m
    \x1B[38;2;130;130;130m        ▁▁\x1B[0m
    \x1B[38;2;130;130;130m▕▔╲ ▁ ▁ ▕ ▕╲╱▏▕\x1B[0m
    \x1B[38;2;130;130;130m▕▁╱▕ ▏▏ ▕ ▕  ▏▕▁▁\x1B[0m
    \x1B[38;2;130;130;130m    ▔ ▔\x1B[0m
    `
    .replace(/Ó/g, '\x1B[48;2;254;254;254m\x1B[38;2;21;101;243m▆\x1B[38;2;254;254;254m\x1B[48;2;21;101;243m')
    .replace(/Ć/g, '\x1B[48;2;254;254;254m\x1B[38;2;10;74;189m▆\x1B[38;2;254;254;254m\x1B[48;2;10;74;189m')
    .replace(/ł/g, '\x1B[48;2;254;254;254m\x1B[38;2;10;74;189m▂\x1B[38;2;254;254;254m\x1B[48;2;10;74;189m')
    ;

const macASCIIArt = `
    \x1B[38;5;111m▄\x1B[48;5;111m                \x1B[0m\x1B[38;5;111m▄\x1B[0m
    \x1B[38;5;15m+\x1B[48;5;111m           ▄      \x1B[0m
    \x1B[38;5;15m++\x1B[48;5;33m     ▂    ▟▘▂     \x1B[0m
    \x1B[38;5;15m++\x1B[48;5;33m ▂▄▆▀Ó   ▟▘ Ó▀▆▄▂ \x1B[0m
    \x1B[38;5;15m++\x1B[48;5;26m Ć▀ł▄▂  ▟▘  ▂▄ł▀Ć \x1B[0m
    \x1B[38;5;15m++\x1B[48;5;26m     Ć ▟▘   Ć     \x1B[0m
    \x1B[38;5;15m++\x1B[48;5;25m      ▝▘          \x1B[0m
    \x1B[38;5;25m▀\x1B[48;5;25m                \x1B[0m\x1B[38;5;25m▀\x1B[0m
    \x1B[38;5;247m        ▁▁\x1B[0m
    \x1B[38;5;247m▕▔╲ ▁ ▁ ▕ ▕╲╱▏▕\x1B[0m
    \x1B[38;5;247m▕▁╱▕ ▏▏ ▕ ▕  ▏▕▁▁\x1B[0m
    \x1B[38;5;247m    ▔ ▔\x1B[0m
    `
    .replace(/Ó/g, '\x1B[48;5;15m\x1B[38;5;33m▆\x1B[38;5;15m\x1B[48;5;33m')
    .replace(/Ć/g, '\x1B[48;5;15m\x1B[38;5;26m▆\x1B[38;5;15m\x1B[48;5;26m')
    .replace(/ł/g, '\x1B[48;5;15m\x1B[38;5;26m▂\x1B[38;5;15m\x1B[48;5;26m')
    ;

const winASCIIArt = `
    \x1B[38;2;87;144;246m+▄\x1B[48;2;87;144;246m               \x1B[0m\x1B[38;2;87;144;246m▄\x1B[0m
    \x1B[38;2;254;254;254m\x1B[48;2;87;144;246m          ▄      \x1B[0m
    \x1B[38;2;254;254;254m\x1B[48;2;21;101;243m         ▄▀      \x1B[0m
    \x1B[38;2;254;254;254m\x1B[48;2;21;101;243m ▄▄▀▀   ▄▀  ▀▀▄▄ \x1B[0m
    \x1B[38;2;254;254;254m+\x1B[48;2;10;74;189m ▀▀▄▄  ▄▀   ▄▄▀▀ \x1B[0m
    \x1B[38;2;254;254;254m+\x1B[48;2;10;74;189m      ▄▀         \x1B[0m
    \x1B[38;2;254;254;254m++\x1B[48;2;7;49;128m      ▀          \x1B[0m
    \x1B[38;2;7;49;128m+++++▀\x1B[48;2;7;49;128m               \x1B[0m\x1B[38;2;7;49;128m▀\x1B[0m
    \x1B[38;2;130;130;130m\x1B[0m
    \x1B[38;2;130;130;130m   D o c T M L\x1B[0m
    `;

export function printUsage(usage: string, failed?: string): void {
    let text;
    if (process.stdout.isTTY && !failed) {
        let highlight = false;
        let aaText = process.platform.startsWith('win') ? winASCIIArt
            : process.platform.startsWith('darwin') ? macASCIIArt
                : linuxASCIIArt;
        let aaLines = aaText
            .split('\n')
            .map(x => x.trim().replace(/\+/g, ''))
            .filter(x => x.length > 0)
            ;
        text = usage
            .replace(/~~/g, () => { highlight = !highlight; return highlight ? '\x1B[33m' : '\x1B[0m'; })
            .replace(/~/g, () => { highlight = !highlight; return highlight ? '\x1B[38;2;87;144;246m' : '\x1B[0m'; })
            .replace(/\$\$/g, () => aaLines.shift() ?? '');
    } else {
        text = usage
            .replace(/~/g, '')
            .replace(/ *\$\$/g, '');
    }
    if (failed) {
        console.error('\n' + failed);
        console.log(text);
        process.exit(3);
    } else {
        console.log(text);
    }
}
