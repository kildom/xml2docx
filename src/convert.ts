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

import { PositiveUniversalMeasure, UniversalMeasure } from 'docx';
import { Dict } from './common';
import { Element } from './xml';
import { Context } from './context';

// #region Common

class ConvertError extends Error { }

function converterVariants<T extends (value: string, ...args: any[]) => any>(
    func: T, globalDef: ReturnType<T> | ((...args: Parameters<T>) => ReturnType<T>)
) {
    type Tail<T extends any[]> = T extends [any, ...infer Rest] ? Rest : never;
    type RemainingParams<T extends (...args: any) => any> = Tail<Parameters<T>>;
    type _ConverterVariantsHelper<T> = (def?: T) => void;
    type Func = (element: Element, name: string, ...args:
        [...RemainingParams<T>, ...Parameters<_ConverterVariantsHelper<ReturnType<T>>>]) => ReturnType<T>;
    type FuncNoErr = (value: string, ...args: RemainingParams<T>) => ReturnType<T>;
    let result: Func & { noErr: FuncNoErr };
    result = ((element: Element, name: string, ...args:
        [...RemainingParams<T>, ...Parameters<_ConverterVariantsHelper<ReturnType<T>>>]
    ) => {
        try {
            let value = element.attributes[name];
            return func(value, ...args);
        } catch (e) {
            if (!(e instanceof ConvertError)) throw e;
            element.ctx.error(`${e.message} in "${name}" attribute on "${element.name}" tag`, element);
            return args.length > func.length && args[func.length] !== undefined ? args[func.length] :
                typeof globalDef === 'function' ? (globalDef as any)(...args) : globalDef;
        }
    }) as typeof result;
    result.noErr = (value: string, ...args: RemainingParams<T>) => {
        try {
            return func(value, ...args);
        } catch (e) {
            if (!(e instanceof ConvertError)) throw e;
            return undefined;
        }
    };
    return result;
}

// #endregion


// #region Mandatory

export function mandatory(element: Element, name: string): string {
    let value = element.attributes[name];
    if (value === undefined || value === null) {
        element.ctx.error(`Missing mandatory attribute "${name}" on "${element.name}" tag.`, element);
        return '';
    }
    return value;
}

// #endregion


// #region Base-64

const fromBase64Map = (function () {
    let charMap = {
        'A': 0, 'B': 1, 'C': 2, 'D': 3,
        'E': 4, 'F': 5, 'G': 6, 'H': 7,
        'I': 8, 'J': 9, 'K': 10, 'L': 11,
        'M': 12, 'N': 13, 'O': 14, 'P': 15,
        'Q': 16, 'R': 17, 'S': 18, 'T': 19,
        'U': 20, 'V': 21, 'W': 22, 'X': 23,
        'Y': 24, 'Z': 25, 'a': 26, 'b': 27,
        'c': 28, 'd': 29, 'e': 30, 'f': 31,
        'g': 32, 'h': 33, 'i': 34, 'j': 35,
        'k': 36, 'l': 37, 'm': 38, 'n': 39,
        'o': 40, 'p': 41, 'q': 42, 'r': 43,
        's': 44, 't': 45, 'u': 46, 'v': 47,
        'w': 48, 'x': 49, 'y': 50, 'z': 51,
        '0': 52, '1': 53, '2': 54, '3': 55,
        '4': 56, '5': 57, '6': 58, '7': 59,
        '8': 60, '9': 61, '+': 62, '/': 63,
    };
    let result = new Uint8Array(256);
    for (let [key, value] of Object.entries(charMap)) {
        result[key.charCodeAt(0)] = value;
    }
    return result;
})();


export function fromBase64(value: string): Uint8Array {
    if (typeof globalThis.Buffer !== 'undefined' && typeof globalThis.Buffer.from === 'function') {
        return globalThis.Buffer.from(value, 'base64');
    } else if (typeof globalThis.atob === 'function') {
        let binary = globalThis.atob(value);
        let bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
    } else {
        value = value.replace(/[^A-Za-z0-9+/]/g, '');
        let bytes = new Uint8Array((value.length * 3) >> 2);
        let bytesOffset = 0;
        let valueOffset = 0;
        while (valueOffset + 4 <= value.length) {
            let a = fromBase64Map[value.charCodeAt(valueOffset++)];
            let b = fromBase64Map[value.charCodeAt(valueOffset++)];
            let c = fromBase64Map[value.charCodeAt(valueOffset++)];
            let d = fromBase64Map[value.charCodeAt(valueOffset++)];
            let v = (a << 18) | (b << 12) | (c << 6) | d;
            bytes[bytesOffset++] = (v >> 16) & 0xFF;
            bytes[bytesOffset++] = (v >> 8) & 0xFF;
            bytes[bytesOffset++] = v & 0xFF;
        }
        if (valueOffset === value.length - 3) {
            let a = fromBase64Map[value.charCodeAt(valueOffset++)];
            let b = fromBase64Map[value.charCodeAt(valueOffset++)];
            let c = fromBase64Map[value.charCodeAt(valueOffset++)];
            let v = (a << 12) | (b << 6) | c;
            bytes[bytesOffset++] = (v >> 10) & 0xFF;
            bytes[bytesOffset++] = (v >> 2) & 0xFF;
        } else if (valueOffset === value.length - 2) {
            let a = fromBase64Map[value.charCodeAt(valueOffset++)];
            let b = fromBase64Map[value.charCodeAt(valueOffset++)];
            let v = (a << 6) | b;
            bytes[bytesOffset++] = (v >> 4) & 0xFF;
        }
        return bytes;
    }
}

// #endregion


// #region Numbers

export const positiveUint = converterVariants((value: string | undefined) => {
    if (value === undefined) return undefined;
    let res = parseInt(value.toString().trim());
    if (res.toString() !== value) throw new ConvertError('Invalid integer value');
    if (res < 1) throw new ConvertError('Required integer value greater than zero');
    if (res > 0x7FFFFFFF) throw new ConvertError('Integer value too large');
    return res;
}, 1);

export const uint = converterVariants((value: string | undefined) => {
    if (value === undefined) return undefined;
    let res = parseInt(value.toString().trim());
    if (res.toString() !== value) throw new ConvertError('Invalid integer value');
    if (res < 0) throw new ConvertError('Required non-negative integer value');
    if (res > 0x7FFFFFFF) throw new ConvertError('Integer value too large');
    return res;
}, 0);

export const int = converterVariants((value: string | undefined) => {
    if (value === undefined) return undefined;
    let res = parseInt(value.toString().trim());
    if (res.toString() !== value) throw new ConvertError('Invalid integer value');
    if (res < -0x80000000) throw new ConvertError('Integer value too small');
    if (res > 0x7FFFFFFF) throw new ConvertError('Integer value too large');
    return res;
}, 0);

export const ufloat = converterVariants((value: string | undefined) => {
    if (value === undefined) return undefined;
    let res = Number(value.toString().trim());
    if (Number.isNaN(res) || !Number.isFinite(res)) {
        throw new ConvertError(`Invalid number "${value}".`);
    } else if (res < 0) {
        throw new ConvertError('Expecting positive number.');
    }
    return res;
}, 0);

export const float = converterVariants((value: string | undefined) => {
    if (value === undefined) return undefined;
    let res = Number(value.toString().trim());
    if (Number.isNaN(res) || !Number.isFinite(res)) {
        throw new ConvertError(`Invalid number "${value}".`);
    }
    return res;
}, 0);

// #endregion


// #region Bool

const boolValues: Dict<boolean> = {
    'true': true,
    't': true,
    'yes': true,
    'y': true,
    '1': true,
    'on': true,
    'false': false,
    'f': false,
    'no': false,
    'n': false,
    '0': false,
    'off': false,
};

export const bool = converterVariants((value: string | undefined) => {
    if (value === undefined) return undefined;
    value = value.toString().trim().toLowerCase();
    if (!(value in boolValues)) throw new ConvertError(`Invalid boolean value "${value}".`);
    return boolValues[value];
}, false);

// #endregion


// #region Universal Measure

/* unit name => number of points per this unit */
const units: Dict<number> = {
    mm: 720 / 254,
    cm: 7200 / 254,
    in: 72,
    pt: 1,
    pi: 12,
    pc: 12,
    px: 72 / 96,
};

export const UnitsPerPt = {
    pt: 1,
    pt3q: 4 / 3,
    pt8: 8,
    dxa: 20,
    emu: 12700,
};

function splitUnits(value: string): [number, string] {
    if (Number(value) === 0) return [0, 'mm'];
    let m = value
        .toString()
        .toLowerCase()
        .match(/^\s*(-?)\s*((?:[0-9]+(?:[.,][0-9]*)?|[0-9]*(?:\.[0-9]+)?)(?:e[+-]?[0-9]+)?)\s*([a-z]+)\s*$/);
    if (!m) throw new ConvertError(`Invalid length "${value}".`);
    let numStr = (m[1] + m[2]).toLowerCase().replace(/,/g, '.');
    let num = Number(numStr);
    if (Number.isNaN(num) || !Number.isFinite(num)) throw new ConvertError(`Invalid number "${numStr}".`);
    return [num, m[3].toLowerCase()];
}

function convertUniversalMeasureCommon(value: string, min: number, max: number): [number, string] {
    let [num, unit] = splitUnits(value);
    if (units[unit] === undefined) throw new ConvertError(`Invalid unit "${unit}".`);
    if (Number.isNaN(num) || !Number.isFinite(num) || num < min || num > max) new ConvertError(`Invalid length "${value}".`);
    if (unit === 'px') {
        unit = 'pt';
        num *= units.px;
    }
    return [num, unit];
}

function convertUniversalMeasureStrCommon(value: string | undefined, min: number, max: number) {
    if (value === undefined) return undefined;
    let [num, unit] = convertUniversalMeasureCommon(value, min, max);
    let str = num.toString();
    if (str.indexOf('e') >= 0) {
        if (Math.abs(num) > 1e30) throw new ConvertError(`Invalid length "${value}". Too big.`);
        let digits = Math.ceil(-Math.log10(Math.abs(num))) + 7;
        if (digits > 40) throw new ConvertError(`Invalid length "${value}". Too small.`);
        str = num.toFixed(digits);
    }
    return str + unit;
}

function convertUniversalMeasureIntCommon(value: string | undefined, min: number, max: number, unitsPerPt: number) {
    if (value === undefined) return undefined;
    let [num, unit] = convertUniversalMeasureCommon(value, -Number.MAX_VALUE, Number.MAX_VALUE);
    num = num * units[unit]; // input_unit * pt/input_unit = pt
    num = num * unitsPerPt; // pt * output_unit/pt = output_unit
    let rounded = Math.round(num); // round to nearest integer
    if (rounded === 0 && num != 0) {
        rounded = Math.sign(num); // very small numbers should be interpreted as 1 or -1.
    }
    if (rounded < min) throw new ConvertError(`Length to small "${value}"`);
    if (rounded > max) throw new ConvertError(`Length to big "${value}"`);
    return rounded;
}

export const universalMeasure = converterVariants(
    (value: string | undefined) => {
        return convertUniversalMeasureStrCommon(value, -Number.MAX_VALUE, Number.MAX_VALUE) as (UniversalMeasure | undefined);
    }, '0mm');

export const positiveUniversalMeasure = converterVariants(
    (value: string | undefined) => {
        return convertUniversalMeasureStrCommon(value, 0, Number.MAX_VALUE) as (PositiveUniversalMeasure | undefined);
    }, '0mm');

export const universalMeasureInt = converterVariants(
    (value: string | undefined, unitsPerPt: number) => {
        return convertUniversalMeasureIntCommon(value, -0x80000000, 0x7FFFFFFF, unitsPerPt);
    }, 0);

export const positiveUniversalMeasureInt = converterVariants(
    (value: string | undefined, unitsPerPt: number) => {
        return convertUniversalMeasureIntCommon(value, 0, 0x7FFFFFFF, unitsPerPt);
    }, 0);

// #endregion


// #region Enum

function getEnumMap(ctx: Context, enumValue: Dict<string | number>): Dict<string | number> {
    if (!ctx.enumMapCache.has(enumValue)) {
        let map: Dict<string | number> = Object.create(null);
        ctx.enumMapCache.set(enumValue, map);
        for (let entry of Object.entries(enumValue)) {
            let value = entry[1];
            for (let key of entry) {
                key = key.toString().replace(/[. _-]/g, '').toLowerCase();
                if (map[key] !== undefined && map[key] !== value) {
                    throw new Error(`Internal error: Ambiguous enum values for: ${key}`);
                }
                map[key] = value;
            }
        }
    }
    return ctx.enumMapCache.get(enumValue)!;
}

const _convertEnum = converterVariants((value: string | undefined,
    enumMap: Dict<string | number>, aliases?: Dict<string | number>) => {

    if (value === undefined) return undefined;
    value = value.replace(/[. _-]/g, '').toLowerCase();
    if (aliases && (value in aliases)) return aliases[value];
    if (value in enumMap) return enumMap[value];
    throw new ConvertError(`Invalid enum value "${value}" (allowed values: "${Object.keys(
        { ...enumMap, ...aliases }).join('", "')}")`);

}, (value: string | undefined, enumMap: Dict<string | number>) => {

    return Object.values(enumMap)[0];

});


export function enumeration<T extends Dict<string | number>>(
    element: Element, name: string, enumValue: T, aliases?: Dict<string | number>, def?: string | number
): (T)[keyof T] {
    let enumMap = getEnumMap(element.ctx, enumValue);
    return _convertEnum(element, name, enumMap, aliases, def) as any;
}

enumeration.noErr = function convertEnumNoErr<T extends Dict<string | number>>(
    element: Element, value: string, enumValue: T, aliases?: Dict<string | number>
): (T)[keyof T] {
    let enumMap = getEnumMap(element.ctx, enumValue);
    return _convertEnum.noErr(value, enumMap, aliases) as any;
};

// #endregion


// #region Color

export const color = converterVariants((value: string | undefined) => {
    if (value === undefined) return undefined;
    let text = ('' + value).trim().toLowerCase();
    let normalized = text.replace(/[^a-z]/g, '');
    if (colorTable[normalized] !== undefined) {
        return colorTable[normalized];
    }
    if (text.match(/^#[0-9a-f]{6}$/)) {
        return text;
    } else if (text.match(/^#[0-9a-f]{3}$/)) {
        return `#${text[1]}${text[1]}${text[2]}${text[2]}${text[3]}${text[3]}`;
    } else {
        throw new ConvertError(`Invalid color value "${text}".`);
    }
}, '#808080');


const colorTable: Dict<string> = {
    'aliceblue': '#F0F8FF',
    'antiquewhite': '#FAEBD7',
    'aqua': '#00FFFF',
    'aquamarine': '#7FFFD4',
    'azure': '#F0FFFF',
    'beige': '#F5F5DC',
    'bisque': '#FFE4C4',
    'black': '#000000',
    'blanchedalmond': '#FFEBCD',
    'blue': '#0000FF',
    'blueviolet': '#8A2BE2',
    'brown': '#A52A2A',
    'burlywood': '#DEB887',
    'cadetblue': '#5F9EA0',
    'chartreuse': '#7FFF00',
    'chocolate': '#D2691E',
    'coral': '#FF7F50',
    'cornflowerblue': '#6495ED',
    'cornsilk': '#FFF8DC',
    'crimson': '#DC143C',
    'cyan': '#00FFFF',
    'darkblue': '#00008B',
    'darkcyan': '#008B8B',
    'darkgoldenrod': '#B8860B',
    'darkgray': '#A9A9A9',
    'darkgreen': '#006400',
    'darkgrey': '#A9A9A9',
    'darkkhaki': '#BDB76B',
    'darkmagenta': '#8B008B',
    'darkolivegreen': '#556B2F',
    'darkorange': '#FF8C00',
    'darkorchid': '#9932CC',
    'darkred': '#8B0000',
    'darksalmon': '#E9967A',
    'darkseagreen': '#8FBC8F',
    'darkslateblue': '#483D8B',
    'darkslategray': '#2F4F4F',
    'darkslategrey': '#2F4F4F',
    'darkturquoise': '#00CED1',
    'darkviolet': '#9400D3',
    'deeppink': '#FF1493',
    'deepskyblue': '#00BFFF',
    'dimgray': '#696969',
    'dimgrey': '#696969',
    'dodgerblue': '#1E90FF',
    'firebrick': '#B22222',
    'floralwhite': '#FFFAF0',
    'forestgreen': '#228B22',
    'fuchsia': '#FF00FF',
    'gainsboro': '#DCDCDC',
    'ghostwhite': '#F8F8FF',
    'gold': '#FFD700',
    'goldenrod': '#DAA520',
    'gray': '#808080',
    'green': '#008000',
    'greenyellow': '#ADFF2F',
    'grey': '#808080',
    'honeydew': '#F0FFF0',
    'hotpink': '#FF69B4',
    'indianred': '#CD5C5C',
    'indigo': '#4B0082',
    'ivory': '#FFFFF0',
    'khaki': '#F0E68C',
    'lavender': '#E6E6FA',
    'lavenderblush': '#FFF0F5',
    'lawngreen': '#7CFC00',
    'lemonchiffon': '#FFFACD',
    'lightblue': '#ADD8E6',
    'lightcoral': '#F08080',
    'lightcyan': '#E0FFFF',
    'lightgoldenrodyellow': '#FAFAD2',
    'lightgray': '#D3D3D3',
    'lightgreen': '#90EE90',
    'lightgrey': '#D3D3D3',
    'lightpink': '#FFB6C1',
    'lightsalmon': '#FFA07A',
    'lightseagreen': '#20B2AA',
    'lightskyblue': '#87CEFA',
    'lightslategray': '#778899',
    'lightslategrey': '#778899',
    'lightsteelblue': '#B0C4DE',
    'lightyellow': '#FFFFE0',
    'lime': '#00FF00',
    'limegreen': '#32CD32',
    'linen': '#FAF0E6',
    'magenta': '#FF00FF',
    'maroon': '#800000',
    'mediumaquamarine': '#66CDAA',
    'mediumblue': '#0000CD',
    'mediumorchid': '#BA55D3',
    'mediumpurple': '#9370DB',
    'mediumseagreen': '#3CB371',
    'mediumslateblue': '#7B68EE',
    'mediumspringgreen': '#00FA9A',
    'mediumturquoise': '#48D1CC',
    'mediumvioletred': '#C71585',
    'midnightblue': '#191970',
    'mintcream': '#F5FFFA',
    'mistyrose': '#FFE4E1',
    'moccasin': '#FFE4B5',
    'navajowhite': '#FFDEAD',
    'navy': '#000080',
    'oldlace': '#FDF5E6',
    'olive': '#808000',
    'olivedrab': '#6B8E23',
    'orange': '#FFA500',
    'orangered': '#FF4500',
    'orchid': '#DA70D6',
    'palegoldenrod': '#EEE8AA',
    'palegreen': '#98FB98',
    'paleturquoise': '#AFEEEE',
    'palevioletred': '#DB7093',
    'papayawhip': '#FFEFD5',
    'peachpuff': '#FFDAB9',
    'peru': '#CD853F',
    'pink': '#FFC0CB',
    'plum': '#DDA0DD',
    'powderblue': '#B0E0E6',
    'purple': '#800080',
    'rebeccapurple': '#663399',
    'red': '#FF0000',
    'rosybrown': '#BC8F8F',
    'royalblue': '#4169E1',
    'saddlebrown': '#8B4513',
    'salmon': '#FA8072',
    'sandybrown': '#F4A460',
    'seagreen': '#2E8B57',
    'seashell': '#FFF5EE',
    'sienna': '#A0522D',
    'silver': '#C0C0C0',
    'skyblue': '#87CEEB',
    'slateblue': '#6A5ACD',
    'slategray': '#708090',
    'slategrey': '#708090',
    'snow': '#FFFAFA',
    'springgreen': '#00FF7F',
    'steelblue': '#4682B4',
    'tan': '#D2B48C',
    'teal': '#008080',
    'thistle': '#D8BFD8',
    'tomato': '#FF6347',
    'turquoise': '#40E0D0',
    'violet': '#EE82EE',
    'wheat': '#F5DEB3',
    'white': '#FFFFFF',
    'whitesmoke': '#F5F5F5',
    'yellow': '#FFFF00',
    'yellowgreen': '#9ACD32',
};

// #endregion
