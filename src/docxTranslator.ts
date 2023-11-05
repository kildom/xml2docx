import * as docx from "docx";

import { TranslatorBase } from "./translatorBase";
import { CData, Text, Element, XMLError, InterceptedXMLError, SpacesProcessing } from "./xml";
import { FileChild } from "docx/build/file/file-child";
import { IPropertiesOptions } from "docx/build/file/core-properties";
import { os } from "./os";
import { parseExtendedJSON } from "./json";
import { AnyObject, undefEmpty } from "./common";
import { getColor } from "./colors";

const symbolInstance: unique symbol = Symbol('instance');

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

const simpleBoolStyleTable: { [key: string]: string } = {
    'allCaps': 'allCaps',
    'all-caps': 'allCaps',
    'b': 'bold',
    'boldComplexScript': 'boldComplexScript',
    'bold-complex-script': 'boldComplexScript',
    'doubleStrike': 'doubleStrike',
    'double-strike': 'doubleStrike',
    'emboss': 'emboss',
    'imprint': 'imprint',
    'i': 'italics',
    'italics': 'italics',
    'italicsComplexScript': 'italicsComplexScript',
    'italics-complex-script': 'italicsComplexScript',
    'math': 'math',
    'noProof': 'noProof',
    'no-proof': 'noProof',
    'rightToLeft': 'rightToLeft',
    'right-to-left': 'rightToLeft',
    'smallCaps': 'smallCaps',
    'small-caps': 'smallCaps',
    'snapToGrid': 'snapToGrid',
    'snap-to-grid': 'snapToGrid',
    'specVanish': 'specVanish',
    'spec-vanish': 'specVanish',
    's': 'strike',
    'strike': 'strike',
    'sub': 'subScript',
    'subScript': 'subScript',
    'sub-script': 'subScript',
    'sup': 'superScript',
    'superScript': 'superScript',
    'super-script': 'superScript',
    'vanish': 'vanish',
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


export class DocxTranslator extends TranslatorBase {

    private tags: { [key: string]: (src: Element, attributes: AnyObject, properties: AnyObject) => any[] };
    private filters: { [key: string]: (value: any, src: Element) => any };

    constructor(
        private baseDir: string,
        private runOptions: docx.IRunOptions
    ) {
        super();

        this.tags = {
            'document': this.documentTag,
            'p': this.pTag,
            'h1': this.pTag,
            'h2': this.pTag,
            'h3': this.pTag,
            'h4': this.pTag,
            'h5': this.pTag,
            'h6': this.pTag,
            'h7': this.pTag,
            'h8': this.pTag,
            'h9': this.pTag,
            'font': this.fontTag,
            'u': this.underlineTag,
            'table': this.tableTag,
            'tr': this.trTag,
            'td': this.tdTag,
            'underline': this.underlineTag,
            'img': this.imgTag,
        }

        this.filters = {
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

    private copy(runOptionsChanges: docx.IRunOptions) {
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
        if (this.tags[src.name] !== undefined) {
            let args: any[] = [src];
            let numArgs = this.tags[src.name].length;
            if (numArgs > 1) args.push(normalizeAttributes(this.getAttributes(src)));
            if (numArgs > 2) args.push(this.getProperties(src));
            return this.tags[src.name].apply(this, args);
        } else {
            return this.fallbackTag(src);
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
        return this.documentTag(root)[0] as docx.Document;
    }

    private getBorderOptions(src: Element, text: string | undefined) {
        if (text === undefined) return undefined;
        let parts = text.trim().split(/\s+/);
        let color: string | undefined = undefined;
        let style: docx.BorderStyle | undefined = undefined;
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
                size = this.filter(src, ':pt8', p);
            } else if (space === undefined) {
                space = this.filter(src, ':pt', p);
            } else {
                throw new XMLError(src, 'Invalid border options.');
            }
        }
        if (style === undefined) throw new XMLError(src, 'Border style required.');
        return { color, style, size, space };
    }

    private simpleStyleChange(src: Element, styleChange: docx.IRunOptions) {
        let newTranslator = this.copy(styleChange);
        let properties = newTranslator.getProperties(src);
        newTranslator = newTranslator.copy(properties);
        return newTranslator.parseObjects(src, SpacesProcessing.PRESERVE);
    }

    private fallbackTag(src: Element): any[] | null {
        if (simpleBoolStyleTable[src.name] !== undefined) {
            return this.simpleStyleChange(src, { [simpleBoolStyleTable[src.name]]: true });
        }
        return null;
    }

    // --------------------------------- <p><h1><h2>... ---------------------------------

    private pTag(src: Element, attributes: AnyObject, properties: AnyObject): any[] {
        let style: string | undefined = undefined;
        let m = src.name.match(/^h([1-9])$/);
        if (m) style = 'Heading' + m[1];
        let options: docx.IParagraphOptions = {
            children: this.parseObjects(src, SpacesProcessing.TRIM),
            alignment: fromEnum(src, attributes.align, docx.AlignmentType, { justify: 'both' }) as docx.AlignmentType,
            style: attributes.style || style,
            border: undefEmpty({
                bottom: this.getBorderOptions(src, attributes.borderBottom),
                left: this.getBorderOptions(src, attributes.borderLeft),
                right: this.getBorderOptions(src, attributes.borderRight),
                top: this.getBorderOptions(src, attributes.borderTop),
            }),
        };
        return [new docx.Paragraph({ ...options, ...properties })];
    };

    // --------------------------------- <table><tr><td> ---------------------------------

    private tableTag(src: Element, attributes: AnyObject, properties: AnyObject): any[] {
        let options: docx.ITableOptions = {
            rows: this.parseObjects(src, SpacesProcessing.IGNORE),
            columnWidths: (attributes.columnWidths as string)
                .split(',')
                .map(x => this.filter(src, ':dxa', x))
        };
        return [new docx.Table({ ...options, ...properties })];
    };

    private trTag(src: Element, attributes: AnyObject, properties: AnyObject): any[] {
        let options: docx.ITableRowOptions = {
            children: this.parseObjects(src, SpacesProcessing.IGNORE),
        };
        return [new docx.TableRow({ ...options, ...properties })];
    };

    private tdTag(src: Element, attributes: AnyObject, properties: AnyObject): any[] {
        let options: docx.ITableCellOptions = {
            children: this.parseObjects(src, SpacesProcessing.IGNORE),
        };
        return [new docx.TableCell({ ...options, ...properties })];
    };

    // --------------------------------- <u> ---------------------------------

    private underlineTag(src: Element, attributes: AnyObject): any[] {
        let change: docx.IRunOptions = {
            underline: {
                color: attributes.color,
                type: fromEnum(src, attributes.type, docx.UnderlineType) as docx.UnderlineType,
            }
        }
        return this.simpleStyleChange(src, change);
    }

    // --------------------------------- <font> ---------------------------------

    private fontTag(src: Element, attributes: AnyObject): any[] {
        let color = getColor(attributes.color);
        if (color === undefined) throw new XMLError(src, `Invalid color "${attributes.color}".`);
        let change: docx.IRunOptions = {
            color,
            font: attributes.face,
            size: attributes.size,
        }
        return this.simpleStyleChange(src, change);
    }

    // --------------------------------- <img> ---------------------------------

    private getFlip(src: Element, value: string | undefined) {
        if (value === undefined) return undefined;
        let lower = value.toLowerCase();
        let horizontal: boolean = lower.indexOf('h') >= 0;
        let vertical: boolean = lower.indexOf('v') >= 0;
        return { horizontal, vertical };
    }

    private getHVPosition(src: Element, value: string, alignEnum: { [key: string]: string | number }, relEnum: { [key: string]: string | number }) {
        if (value === undefined) return undefined;
        let parts = value.trim().toLowerCase().split(/\s+/);
        let align: any = undefined;
        let offset: number | undefined = undefined;
        let relative: any = undefined;
        for (let part of parts) {
            let a = fromEnum(src, part, alignEnum, {}, false);
            if (a !== undefined) {
                align = a;
                continue;
            }
            let r = fromEnum(src, part, relEnum, {}, false);
            if (r !== undefined) {
                relative = r;
                continue;
            }
            offset = this.filter(src, ':emu', part);
        }
        return { align, offset, relative };
    }

    private getMargins(src: Element, value: string | undefined, filterName = ':emu'): docx.IMargins | undefined {
        if (value === undefined) return undefined;
        let parts = value.trim().toLowerCase().split(/\s+/);
        parts = [...parts, ...parts, ...parts, ...parts];
        return {
            top: this.filter(src, filterName, parts[0], true),
            right: this.filter(src, filterName, parts[1], true),
            bottom: this.filter(src, filterName, parts[2], true),
            left: this.filter(src, filterName, parts[3], true),
        };
    }

    private getWrap(src: Element, value: string | undefined, margins:docx.IMargins | undefined): docx.ITextWrapping | undefined {
        if (value === undefined) return undefined;
        let parts = value.trim().toLowerCase().split(/\s+/);
        let side: docx.TextWrappingSide | undefined = undefined;
        let type: docx.TextWrappingType | undefined = undefined;
        for (let part of parts) {
            let s = fromEnum(src, part, docx.TextWrappingSide, {}, false);
            if (s !== undefined) {
                side = s as docx.TextWrappingSide;
                continue;
            }
            let t = fromEnum(src, part, docx.TextWrappingType, {}, false);
            if (t !== undefined) {
                type = t as docx.TextWrappingType;
                continue;
            }
            throw new XMLError(src, 'Invalid wrapping options.');
        }
        if (type === undefined) throw new XMLError(src, 'At least wrapping side is required.');
        return {
            side,
            type,
            margins: !margins ? undefined : {
                distT: margins.top,
                distR: margins.right,
                distB: margins.bottom,
                distL: margins.left,
            },
        };
    }

    private imgTag(src: Element, attributes: AnyObject, properties: AnyObject): any[] {
        let margins = this.getMargins(src, attributes.margins);
        let options: docx.IImageOptions = {
            data: attributes.src ? this.filter(src, ':file', attributes.src) : this.filter(src, ':base64', attributes.data),
            transformation: {
                width: this.filter(src, ':pt3q', attributes.width, true),
                height: this.filter(src, ':pt3q', attributes.height, true),
                rotation: this.filter(src, ':int', attributes.rotate, true),
                flip: this.getFlip(src, attributes.flip),
            },
            floating: undefEmpty({
                allowOverlap: this.filter(src, ':bool', attributes.allowOverlap, true),
                behindDocument: this.filter(src, ':bool', attributes.behindDocument, true),
                layoutInCell: this.filter(src, ':bool', attributes.layoutInCell, true),
                lockAnchor: this.filter(src, ':bool', attributes.lockAnchor, true),
                zIndex: this.filter(src, ':int', attributes.zIndex, true),
                horizontalPosition: this.getHVPosition(src, attributes.horizontal, docx.HorizontalPositionAlign, docx.HorizontalPositionRelativeFrom) as docx.IHorizontalPositionOptions,
                verticalPosition: this.getHVPosition(src, attributes.vertical, docx.VerticalPositionAlign, docx.VerticalPositionRelativeFrom) as docx.IVerticalPositionOptions,
                margins,
                wrap: this.getWrap(src, attributes.wrap, margins),
            }),
        };
        return [new docx.ImageRun(options)];
    }

    // --------------------------------- <document> ---------------------------------

    private documentTag(src: Element): any[] {
        let attributes = this.getAttributes(src);
        let properties = this.getProperties(src);
        let sections: docx.ISectionOptions[] = [];
        let paragraphStyles: docx.IParagraphStyleOptions[] = [];
        let characterStyles: docx.ICharacterStyleOptions[] = [];
        let children: FileChild[] = [];
        let options: IPropertiesOptions = {
            sections: sections,
            title: attributes.title,
            subject: attributes.subject,
            creator: attributes.creator,
            keywords: attributes.keywords,
            description: attributes.description,
            lastModifiedBy: attributes.lastModifiedBy,
            // TODO: More properties
            styles: {
                paragraphStyles,
                characterStyles,
            },
            ...properties,
        }
        for (let obj of this.parseObjects(src, SpacesProcessing.IGNORE)) {
            if (obj[symbolInstance] === 'ISectionOptions') {
                sections.push(obj);
                children = obj.children;
            } else if (obj[symbolInstance] === 'IParagraphStyleOptions') {
                paragraphStyles.push(obj);
            } else if (obj[symbolInstance] === 'ICharacterStyleOptions') {
                characterStyles.push(obj);
            } else {
                if (sections.length === 0) {
                    children = [];
                    sections.push({ children });
                }
                children.push(obj);
            }
        }
        return [new docx.Document(options)]
    };

}

export function translate(root: Element, baseDir: string): docx.Document {
    let tr = new DocxTranslator(baseDir, {});
    return tr.translate(root);
}
