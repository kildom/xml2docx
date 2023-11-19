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

import * as docx from "docx";

import { TranslatorBase } from "./translatorBase";
import { CData, Text, Element, XMLError, InterceptedXMLError, SpacesProcessing } from "./xml";
import { FileChild } from "docx/build/file/file-child";
import { IPropertiesOptions } from "docx/build/file/core-properties";
import { os } from "./os";
import { parseExtendedJSON } from "./json";
import { AnyObject, symbolInstance, undefEmpty } from "./common";
import { DocxTranslator } from "./docxTranslator";

const boolValues: { [key: string]: boolean } = {
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

/* unit name => number of points per this unit */
const units = {
    mm: 360 / 127,
    cm: 3600 / 127,
    in: 72,
    pt: 1,
    pi: 12,
    pc: 12,
    px: 72 / 96,
};

export const LengthUnits = {
    pt: 1,
    pt3q: 4 / 3,
    pt8: 8,
    dxa: 20,
    emu: 12700,
};

export enum FilterMode {
    EXACT, // exact value required, undefined or invalid value will cause exception.
    UNDEF, // undefined value allowed (it will return undefined), invalid value will cause exception.
    ALL, // all values allowed, undefined or invalid value will return undefined.
};

function returnInvalid(mode: FilterMode, message: string): undefined {
    if (mode === FilterMode.ALL) {
        return undefined;
    } else {
        throw new Error(message);
    }
}

/*>>> filterBool
*[Boolean value](attributes.md#boolean-value)*.
*/
export function filterBool(value: any, mode: FilterMode.EXACT): boolean;
export function filterBool(value: any, mode: Exclude<FilterMode, FilterMode.EXACT>): boolean | undefined;
export function filterBool(value: any, mode: FilterMode): boolean | undefined {
    if (mode != FilterMode.EXACT && value === undefined) return undefined;
    let v = ('' + value).toLowerCase();
    if (boolValues[v] !== undefined) {
        return boolValues[v];
    } else {
        return returnInvalid(mode, `Invalid boolean value "${value}"`);
    }
}

function filterIntCommon(value: any, mode: FilterMode, min: number, max: number): number | undefined {
    if (mode !== FilterMode.EXACT && value === undefined) return undefined;
    let result = Number(('' + value).trim());
    if (Number.isNaN(result) || !Number.isFinite(result) || !Number.isInteger(result) || result < min || result > max) {
        return returnInvalid(mode, `Invalid number "${value}".`);
    }
    return result;
}

/*>>> :integer */
export function filterInt(value: any, mode: FilterMode.EXACT): number;
export function filterInt(value: any, mode: Exclude<FilterMode, FilterMode.EXACT>): number | undefined;
export function filterInt(value: any, mode: FilterMode): number | undefined {
    return filterIntCommon(value, mode, -0x80000000, 0x7FFFFFFF);
}

/*>>> :positive integer */
export function filterUint(value: any, mode: FilterMode.EXACT): number;
export function filterUint(value: any, mode: Exclude<FilterMode, FilterMode.EXACT>): number | undefined;
export function filterUint(value: any, mode: FilterMode): number | undefined {
    return filterIntCommon(value, mode, 0, 0x7FFFFFFF);
}

/*>>> :non-zero positive integer */
export function filterUintNonZero(value: any, mode: FilterMode.EXACT): number;
export function filterUintNonZero(value: any, mode: Exclude<FilterMode, FilterMode.EXACT>): number | undefined;
export function filterUintNonZero(value: any, mode: FilterMode): number | undefined {
    return filterIntCommon(value, mode, 1, 0x7FFFFFFF);
}

function filterFloatCommon(value: any, mode: FilterMode, min: number, max: number): number | undefined {
    if (mode != FilterMode.EXACT && value === undefined) return undefined;
    let result = Number(('' + value).trim());
    if (Number.isNaN(result) || !Number.isFinite(result) || value < min || value > max) {
        return returnInvalid(mode, `Invalid number "${value}".`);
    }
    return result;
}

/*>>> :number */
export function filterFloat(value: any, mode: FilterMode.EXACT): number;
export function filterFloat(value: any, mode: Exclude<FilterMode, FilterMode.EXACT>): number | undefined;
export function filterFloat(value: any, mode: FilterMode): number | undefined {
    return filterFloatCommon(value, mode, -Number.MAX_VALUE, Number.MAX_VALUE);
}

/*>>> :positive number */
export function filterUfloat(value: any, mode: FilterMode.EXACT): number;
export function filterUfloat(value: any, mode: Exclude<FilterMode, FilterMode.EXACT>): number | undefined;
export function filterUfloat(value: any, mode: FilterMode): number | undefined {
    return filterFloatCommon(value, mode, 0, Number.MAX_VALUE);
}

function splitUnits(value: string, mode: FilterMode): [number | undefined, string] {
    if (mode != FilterMode.EXACT && value === undefined) return [undefined, ''];
    let m = value.match(/^\s*(-?)\s*((?:[0-9]+(?:[.,][0-9]*)?|[0-9]*(?:\.[0-9]+)?)(?:e[+-]?[0-9]+)?)\s*([a-z]+)\s*$/);
    if (!m) {
        return [returnInvalid(mode, `Invalid length "${value}".`), ''];
    }
    let numStr = (m[1] + m[2]).toLowerCase().replace(/,/g, '.');
    let num = Number(numStr);
    if (Number.isNaN(num) || !Number.isFinite(num)) {
        return [returnInvalid(mode, `Invalid number "${numStr}".`), ''];
    }
    return [num, m[3].toLowerCase()];
}

function filterLengthIntCommon(value: any, targetUnitsPerPt: number, mode: FilterMode, min: number, max: number): number | undefined {
    let [num, unit] = splitUnits(value, mode);
    if (num === undefined) return undefined;
    if (units[unit] === undefined) {
        return returnInvalid(mode, `Invalid unit "${value}".`);
    }
    let numFloat = num * units[unit] * targetUnitsPerPt;
    let numInt = Math.round(numFloat);
    if (numInt < min || numInt > max) {
        numInt = Math.ceil(numFloat);
        if (numInt < min || numInt > max) {
            numInt = Math.floor(numFloat);
        }
    }
    if (Number.isNaN(numInt) || numInt < min || numInt > max) {
        return returnInvalid(mode, `Invalid length "${value}".`);
    }
    return numInt;
}

/*>>> filterLengthInt
*[Universal measure](attributes.md#universal-measure)*.
*/
export function filterLengthInt(value: any, targetUnitsPerPt: number, mode: FilterMode.EXACT): number;
export function filterLengthInt(value: any, targetUnitsPerPt: number, mode: Exclude<FilterMode, FilterMode.EXACT>): number | undefined;
export function filterLengthInt(value: any, targetUnitsPerPt: number, mode: FilterMode): number | undefined {
    return filterLengthIntCommon(value, targetUnitsPerPt, mode, -0x80000000, 0x7FFFFFFF);
}

/*>>> filterLengthUint
*[Positive universal measure](attributes.md#positive-universal-measure)*.
*/
export function filterLengthUint(value: any, targetUnitsPerPt: number, mode: FilterMode.EXACT): number;
export function filterLengthUint(value: any, targetUnitsPerPt: number, mode: Exclude<FilterMode, FilterMode.EXACT>): number | undefined;
export function filterLengthUint(value: any, targetUnitsPerPt: number, mode: FilterMode): number | undefined {
    return filterLengthIntCommon(value, targetUnitsPerPt, mode, 0, 0x7FFFFFFF);
}

/*>>> filterLengthUintNonZero
*[Positive universal measure](attributes.md#positive-universal-measure) without zero*.
*/
export function filterLengthUintNonZero(value: any, targetUnitsPerPt: number, mode: FilterMode.EXACT): number;
export function filterLengthUintNonZero(value: any, targetUnitsPerPt: number, mode: Exclude<FilterMode, FilterMode.EXACT>): number | undefined;
export function filterLengthUintNonZero(value: any, targetUnitsPerPt: number, mode: FilterMode): number | undefined {
    return filterLengthIntCommon(value, targetUnitsPerPt, mode, 1, 0x7FFFFFFF);
}

function filterUniversalMeasureCommon(value: any, mode: FilterMode, min: number, max: number): string | undefined {
    let [num, unit] = splitUnits(value, mode);
    if (num === undefined) return undefined;
    if (units[unit] === undefined) {
        return returnInvalid(mode, `Invalid unit "${value}".`);
    }
    if (Number.isNaN(num) || num < min || num > max) {
        return returnInvalid(mode, `Invalid length "${value}".`);
    }
    if (unit === 'px') {
        unit = 'pt';
        num *= units.px;
    }
    let str = num.toString();
    if (str.indexOf('e') >= 0) {
        if (Math.abs(num) > 1) {
            return returnInvalid(mode, `Invalid length "${value}". Too big.`);
        }
        let digits = Math.ceil(-Math.log10(Math.abs(num))) + 5;
        if (digits > 40) {
            return returnInvalid(mode, `Invalid length "${value}". Too small.`);
        }
        str = num.toFixed(digits);
    }
    return str + unit;
}

/*>>> filterUniversalMeasure
*[Universal measure](attributes.md#universal-measure)*.
*/
export function filterUniversalMeasure(value: any, mode: FilterMode.EXACT): docx.UniversalMeasure;
export function filterUniversalMeasure(value: any, mode: Exclude<FilterMode, FilterMode.EXACT>): docx.UniversalMeasure | undefined;
export function filterUniversalMeasure(value: any, mode: FilterMode): docx.UniversalMeasure | undefined {
    return filterUniversalMeasureCommon(value, mode, -Number.MAX_VALUE, Number.MAX_VALUE) as docx.UniversalMeasure;
}

/*>>> filterPositiveUniversalMeasure
*[Positive universal measure](attributes.md#positive-universal-measure)*.
*/
export function filterPositiveUniversalMeasure(value: any, mode: FilterMode.EXACT): docx.PositiveUniversalMeasure;
export function filterPositiveUniversalMeasure(value: any, mode: Exclude<FilterMode, FilterMode.EXACT>): docx.PositiveUniversalMeasure | undefined;
export function filterPositiveUniversalMeasure(value: any, mode: FilterMode): docx.PositiveUniversalMeasure | undefined {
    return filterUniversalMeasureCommon(value, mode, 0, Number.MAX_VALUE) as docx.PositiveUniversalMeasure;
}

/*>>> filterColor
*[Hex color value or color name](attributes.md#color)*.
*/
export function filterColor(value: any, mode: FilterMode.EXACT): string;
export function filterColor(value: any, mode: Exclude<FilterMode, FilterMode.EXACT>): string | undefined;
export function filterColor(value: any, mode: FilterMode): string | undefined {
    if (mode != FilterMode.EXACT && value === undefined) return undefined;
    let text = ('' + value).trim().toLowerCase();
    let normalized = text.replace(/[^a-z]/g, '');
    if (colorTable[normalized] !== undefined) {
        return colorTable[normalized];
    }
    let m: RegExpMatchArray | null;
    if ((m = text.match(/^#[0-9a-f]{6}$/))) {
        return text;
    } else if ((m = text.match(/^#[0-9a-f]{3}$/))) {
        return `#${text[1]}${text[1]}${text[2]}${text[2]}${text[3]}${text[3]}`;
    } else {
        return returnInvalid(mode, `Invalid color value "${text}".`);
    }
}

function enumValueNormalize(text: string | number) {
    return text.toString().toLowerCase().replace(/[_-]/g, '');
}

export function fromEnum(value: string | undefined, enumValue: { [key: string]: string | number }, aliases?: { [key: string]: string | number }, throws: boolean = true) {
    if (value === undefined) return undefined;
    // By Enum key
    if (enumValue[value] !== undefined) return enumValue[value];
    // By Enum value
    if (Object.values(enumValue).map(x => x.toString()).indexOf(value) >= 0) return value;
    // By Alias
    if (aliases && aliases[value] != undefined) return aliases[value];
    // By Enum key (normalized)
    let valueNorm = enumValueNormalize(value);
    let index = Object.keys(enumValue).map(enumValueNormalize).indexOf(valueNorm);
    if (index >= 0) return Object.values(enumValue)[index];
    // By Enum value (normalized)
    index = Object.values(enumValue).map(enumValueNormalize).indexOf(valueNorm);
    if (index >= 0) return Object.values(enumValue)[index];
    // By Alias (normalized)
    if (aliases) {
        let index = Object.keys(aliases).map(enumValueNormalize).indexOf(valueNorm);
        if (index >= 0) return Object.values(aliases)[index];
    }
    // Not found - error reporting
    if (throws) {
        let all = new Set(Object.values(enumValue));
        if (aliases) Object.keys(aliases).forEach(key => all.add(key));
        throw new Error(`Invalid enum value "${value}". Possible values: "${[...all].sort().join('", "')}"`);
    } else {
        return undefined;
    }
}

function convertSize(value: string | string[], targetUnitsPerPt: number): any {
    if (typeof (value) == 'string') {
        value = value.trim();
        let scale: number;
        if (value.endsWith('mm')) {
            scale = targetUnitsPerPt * 360 / 127;
        } else if (value.endsWith('cm')) {
            scale = targetUnitsPerPt * 3600 / 127;
        } else if (value.endsWith('in')) {
            scale = targetUnitsPerPt * 72;
        } else if (value.endsWith('pt')) {
            scale = targetUnitsPerPt * 1;
        } else if (value.endsWith('pc') || value.endsWith('pi')) {
            scale = targetUnitsPerPt * 12;
        } else if (value.endsWith('px')) { // TODO: filter px in string lengths
            scale = targetUnitsPerPt * 72 / 96;
        } else {
            throw new Error(`Unknown units at "${value}".`);
        }
        value = value.substring(0, value.length - 2).trim().replace(',', '.');
        let result = Number(value.trim());
        if (Number.isNaN(result) || !Number.isFinite(result)) {
            throw new Error(`Invalid number "${value}".`);
        }
        return Math.round(result * scale);
    } else if (typeof (value) == 'object' && value instanceof Array) {
        return value.map((x: string) => convertSize(x, targetUnitsPerPt));
    }
}

export const filters: { [key: string]: (value: any, tr: DocxTranslator) => any } = {
    'pass': (value: any) => value,
    'pt': (value: any) => convertSize(value, 1),
    'pt3q': (value: any) => convertSize(value, 4 / 3),
    'pt8': (value: any) => convertSize(value, 8),
    'pt20': (value: any) => convertSize(value, 20),
    'dxa': (value: any) => convertSize(value, 20),
    'emu': (value: any) => convertSize(value, 12700),
    'file': (value: any, tr: DocxTranslator) => {
        let filePath = os.path.resolve(tr.baseDir, value as string);
        return os.fs.readFileSync(filePath);
    },
    'textFile': (value: any, tr: DocxTranslator) => {
        let filePath = os.path.resolve(tr.baseDir, value as string);
        return os.fs.readFileSync(filePath, 'utf-8');
    },
    'int': (value: any) => {
        let result = Number(value.trim());
        if (Number.isNaN(result) || !Number.isFinite(result)) {
            throw new Error(`Invalid number "${value}".`);
        }
        return Math.round(result);
    },
    'float': (value: any) => {
        let result = Number(value.trim());
        if (Number.isNaN(result) || !Number.isFinite(result)) {
            throw new Error(`Invalid number "${value}".`);
        }
        return result;
    },
    'bool': (value: any) => {
        let v = ('' + value).toLowerCase();
        if (boolValues[v] !== undefined) {
            return boolValues[v];
        } else {
            throw new Error(`Invalid boolean value "${value}"`);
        }
    },
    'enum': (value: any) => {
        let arr = ('' + value).split(/[:.=>\\\/,;|-]+/);
        if (arr.length != 2) {
            throw new Error(`Invalid ":enum" filter input "${value}".`);
        }
        let enums = (docx as unknown as { [key: string]: AnyObject });
        let enumName = enumValueNormalize(arr[0]);
        let index = Object.keys(enums).map(enumValueNormalize).indexOf(enumName);
        if (index < 0) {
            throw new Error(`Undefined enum "${arr[0]}"`);
        }
        let enumValue = Object.values(enums)[index];
        return fromEnum(arr[1], enumValue);
    },
    'color': (value: any) => filterColor(value, FilterMode.EXACT),
    'json': (value: any) => {
        return parseExtendedJSON(value);
    },
    'first': (value: any) => {
        if (typeof (value) !== 'object' || !(value instanceof Array) || value.length === 0)
            throw new Error(`Input value for ":first" filter must be a non-empty array.`);
        return value[0];
    },
    'emptyArray': (value: any) => {
        if (value !== '') throw new Error(`The ":emptyArray" filter requires empty input.`);
        return [];
    },
    'emptyObject': (value: any) => {
        if (value !== '') throw new Error(`The ":emptyObject" filter requires empty input.`);
        return {};
    },
    'base64': (value: any) => {
        if (typeof (value) !== 'string') throw new Error(`The ":base64" filter requires string input.`);
        return os.convert.fromBase64(value);
    }
};

const colorTable: { [key: string]: string } = {
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
