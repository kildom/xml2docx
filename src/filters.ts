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
import { getColor } from "./colors";
import { ITableCellMarginOptions } from "docx/build/file/table/table-properties/table-cell-margin";
import { pTag } from "./tags/paragraph";
import { documentTag } from "./tags/document";
import { fallbackStyleChange, fontTag, underlineTag } from "./tags/characters";
import { tableTag, tdTag, trTag } from "./tags/table";
import { imgTag } from "./tags/img";
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

function enumValueNormalize(text: string | number) {
    return text.toString().toLowerCase().replace(/[_-]/g, '');
}

export function fromEnum(src: Element, value: string | undefined, enumValue: { [key: string]: string | number }, aliases?: { [key: string]: string | number }, throws: boolean = true) {
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
        throw new XMLError(src, `Invalid enum value "${value}". Possible values: "${[...all].sort().join('", "')}"`);
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
        } else if (value.endsWith('pc')) {
            scale = targetUnitsPerPt * 12;
        } else if (value.endsWith('pi')) {
            throw new Error(`Not implemented.`); // TODO: implement
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

export const filters: { [key: string]: (value: any, src: Element, tr: DocxTranslator) => any } = {
    'pass': (value: any) => value,
    'pt': (value: any) => convertSize(value, 1),
    'pt3q': (value: any) => convertSize(value, 4 / 3),
    'pt8': (value: any) => convertSize(value, 8),
    'pt20': (value: any) => convertSize(value, 20),
    'dxa': (value: any) => convertSize(value, 20),
    'emu': (value: any) => convertSize(value, 12700),
    'file': (value: any, src:Element, tr: DocxTranslator) => {
        let filePath = os.path.resolve(tr.baseDir, value as string);
        return os.fs.readFileSync(filePath);
    },
    'textFile': (value: any, src:Element, tr: DocxTranslator) => {
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
    'enum': (value: any, element: Element) => {
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
        return fromEnum(element, arr[1], enumValue);
    },
    'color': (value: any) => {
        let col = getColor(value);
        if (col === undefined) throw new Error(`Invalid color "${value}"`);
        return col;
    },
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
