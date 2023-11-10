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
import { getBorderOptions } from "./tags/borders";
import { documentTag } from "./tags/document";
import { fallbackStyleChange, fontTag, underlineTag } from "./tags/style";
import { tableTag, tdTag, trTag } from "./tags/table";
import { imgTag } from "./tags/img";

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

function normalizeAttributes(attributes: AnyObject): AnyObject {
    let result: AnyObject = {};
    for (let key in attributes) {
        let norm = key
            .replace(/(?:[a-z][A-Z]|[a-zA-Z][0-9]|[0-9][a-zA-Z])/g, m => m[0] + '-' + m[1])
            .replace(/(?:[a-z][A-Z]|[a-zA-Z][0-9]|[0-9][a-zA-Z])/g, m => m[0] + '-' + m[1])
            .split(/[_-]/)
            .map((x, i) => i === 0 ? x.toLowerCase() : (x[0] || '').toUpperCase() + x.substring(1).toLowerCase())
            .join('');
        result[norm] = attributes[key];
    }
    return result;
}


const tags: { [key: string]: (tr: DocxTranslator, src: Element, attributes: AnyObject, properties: AnyObject) => any[] } = {
    'document': documentTag,
    'p': pTag,
    'h1': pTag,
    'h2': pTag,
    'h3': pTag,
    'h4': pTag,
    'h5': pTag,
    'h6': pTag,
    'h7': pTag,
    'h8': pTag,
    'h9': pTag,
    'font': fontTag,
    'u': underlineTag,
    'table': tableTag,
    'tr': trTag,
    'td': tdTag,
    'img': imgTag,
}

export class DocxTranslator extends TranslatorBase {

    private filters: { [key: string]: (value: any, src: Element) => any };

    constructor(
        private baseDir: string,
        private runOptions: docx.IRunOptions
    ) {
        super();

        this.filters = {
            'pass': (value: any) => value,
            'pt': (value: any) => convertSize(value, 1),
            'pt3q': (value: any) => convertSize(value, 4 / 3),
            'pt8': (value: any) => convertSize(value, 8),
            'pt20': (value: any) => convertSize(value, 20),
            'dxa': (value: any) => convertSize(value, 20),
            'emu': (value: any) => convertSize(value, 12700),
            'file': (value: any) => {
                let filePath = os.path.resolve(this.baseDir, value as string);
                return os.fs.readFileSync(filePath);
            },
            'textFile': (value: any) => {
                let filePath = os.path.resolve(this.baseDir, value as string);
                return os.fs.readFileSync(filePath, 'utf-8');
            },
            'int': (value: any) => {
                let result = Number(value.trim());
                if (Number.isNaN(result) || !Number.isFinite(result)) {
                    throw new Error(`Invalid number "${value}".`);
                }
                return Math.round(result);
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
    }

    public copy(runOptionsChanges: docx.IRunOptions) {
        return new DocxTranslator(this.baseDir, { ...this.runOptions, ...runOptionsChanges });
    }

    private createFromText(text: string) {
        let options: docx.IRunOptions = { ...this.runOptions, text };
        return [new docx.TextRun(options)];
    }

    protected createTextObject(child: Text): any[] {
        let textPlain = child.text.replace(/[ \r\n]+/g, ' ');
        return this.createFromText(textPlain);
    }

    protected createCDataObject(child: CData): any[] {
        return this.createFromText(child.cdata);
    }

    protected createTagObject(src: Element): any[] | null {
        if (tags[src.name] !== undefined) {
            let args: any[] = [this, src];
            let numArgs = tags[src.name].length;
            if (numArgs > 2) args.push(normalizeAttributes(this.getAttributes(src)));
            if (numArgs > 3) args.push(this.getProperties(src));
            return tags[src.name].apply(this, args as any);
        } else {
            return fallbackStyleChange(this, src);
        }
    }

    protected createClassObject(src: Element, name: string, args: any): any[] {

        if (name === 'ParagraphStyle') {
            args[0][symbolInstance] = 'IParagraphStyleOptions';
            return args;
        } else if (name === 'CharacterStyle') {
            args[0][symbolInstance] = 'ICharacterStyleOptions'
            return args;
        } else if (name === 'Section') {
            args[0][symbolInstance] = 'ISectionOptions'
            args[0].children = args[0].children || [];
            return args;
        } else if (name === 'TotalPages') {
            return [new docx.TextRun({ ...this.runOptions, children: [docx.PageNumber.TOTAL_PAGES] })];
        } else if (name == 'CurrentPageNumber') {
            return [new docx.TextRun({ ...this.runOptions, children: [docx.PageNumber.CURRENT] })];
        }

        let construct = (docx as any)[name];
        if (!construct || typeof construct !== 'function') {
            throw new XMLError(src, `Unknown tag "${name}".`);
        }
        return [new construct(...args)];
    }

    protected singleFilter(src: Element, filterName: string, value: any): any {
        if (this.filters[filterName] !== undefined) {
            return this.filters[filterName](value, src);
        }

        let construct = (docx as any)[filterName];
        if (construct && typeof construct === 'function') {
            if (typeof (value) !== 'object' || !(value instanceof Array)) {
                value = [value];
            }
            return new construct(...value);
        }

        if (filterName === 'property') {
            throw new XMLError(src, 'The ":property: can be used only in tag, not an object.');
        }

        throw new XMLError(src, `Unknown filter "${filterName}".`);
    }

    public translate(root: Element): docx.Document {
        return documentTag(this, root)[0] as docx.Document;
    }

}

export function translate(root: Element, baseDir: string): docx.Document {
    let tr = new DocxTranslator(baseDir, {});
    return tr.translate(root);
}
