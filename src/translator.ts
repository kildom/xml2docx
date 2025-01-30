import * as docx from 'docx';
import { Context } from "./context";
import { Element } from "./xml";
import { Attributes, Dict } from './common';

export class TableData {
    public columnIndex: number = 0;
    public columns: {
        width?: number,
        common?: { [tagName: string]: Attributes },
        rowSpanRemaining?: number,
    }[] = [];
}

export interface TextFormat extends docx.IRunOptions {
    avoidOrphans?: number;
    useVarWidthNoBreakSpace?: boolean;
}

export class TranslatorState {

    tableData: TableData;
    format: TextFormat;
    common: { [tagName: string]: Attributes };

    public constructor(
        public ctx: Context,
        public baseDir: string = '',
        format: TextFormat = {},
        tableData?: TableData,
    ) {
        this.format = { ...format }; // TODO: make format readonly, so copying can be avoided
        this.common = Object.create(null);
        this.tableData = tableData ?? new TableData();
    }

    public newTableData(): TranslatorState {
        let copy = this.copy();
        copy.tableData = new TableData();
        return copy;
    }

    public applyCommonAttributes(element: Element): TranslatorState {
        if (!this.common[element.name]) return this;
        for (let [attributeName, value] of Object.entries(this.common[element.name])) {
            element.attributes[attributeName] = value;
        }
        let copy = this.copy();
        delete copy.common[element.name];
        return copy;
    }

    public fetchCommonAttributes(element: Element): TranslatorState {
        let common: undefined | typeof this.common = undefined;
        for (let [name, value] of Object.entries(element.attributes)) {
            let pos = name.indexOf('.');
            if (pos > 0) {
                let tagName = name.substring(0, pos);
                let attributeName = name.substring(pos + 1);
                common = common ?? {};
                common[tagName] = common[tagName] ?? {};
                common[tagName][attributeName] = value;
                delete element.attributes[name];
            }
        }
        if (!common) return this;
        let copy = this.copy();
        copy.copyCommon(common);
        return copy;
    }

    private copyCommon(common: { [tagName: string]: Attributes; }) {
        for (let [tagName, attributes] of Object.entries(common)) {
            for (let [attributeName, value] of Object.entries(attributes)) {
                this.common[tagName] = this.common[tagName] ?? {};
                this.common[tagName][attributeName] = value;
            }
        }
    }

    public applyFormat(format?: TextFormat): TranslatorState {
        if (!format) return this;
        let copy = this.copy();
        for (let [name, value] of Object.entries(format)) {
            (copy.format as any)[name] = value;
        }
        return copy;
    }

    public copy(): TranslatorState {
        let copy = new TranslatorState(this.ctx, this.baseDir, this.format, this.tableData);
        copy.copyCommon(this.common);
        return copy;
    }

    public setCommon(common?: { [tagName: string]: Attributes }): TranslatorState {
        if (!common || Object.keys(common).length === 0) return this;
        let copy = this.copy();
        copy.copyCommon(common);
        return copy;
    }

}

export type TagFunction = (ts: TranslatorState, element: Element) => any[];

export interface ProcessOptions {
    tags: Dict<TagFunction>;
    removeSpaces: boolean;
    implicitTag?: string;
}

export function prepareElement(ts: TranslatorState, element: Element, options: ProcessOptions): TranslatorState {
    let tsInner = ts
        .applyCommonAttributes(element) // Apply common attributes that belongs to this element and return state without them.
        .fetchCommonAttributes(element); // Fetch common attributes from this element to new state.

    if (options.implicitTag) {
        addImplicitTags(element, options);
    }

    if (options.removeSpaces) {
        removeSpaces(element);
    }

    return tsInner;
}

export function processChildren(ts: TranslatorState, element: Element, options: ProcessOptions): any[] {

    let tsInner = prepareElement(ts, element, options);
    return convertElement(tsInner, element, options);
}

function anyAllowedTags(elements: Element[], options: ProcessOptions): boolean {
    for (let element of elements) {
        if (element.name === 'group') {
            if (anyAllowedTags(element.elements, options)) return true;
        } else {
            if (element.name in options.tags) return true;
        }
    }
    return false;
}

function addImplicitTags(element: Element, options: ProcessOptions) {

    // Divide into chunks. Each chunk contains a single allowed tag or adjacent not allowed tags.
    let chunks: (Element[] | Element)[] = [];

    for (let sub of element.elements) {

        let directDescendant = (sub.name === 'group')
            ? anyAllowedTags(sub.elements, options)
            : (sub.name in options.tags);

        if (directDescendant) {
            chunks.push(sub);
        } else {
            let last = chunks.at(-1);
            if (Array.isArray(last)) {
                last.push(sub);
            } else {
                chunks.push([sub]);
            }
        }
    }

    element.elements.splice(0);

    for (let chunk of chunks) {
        if (Array.isArray(chunk)) {
            let filtered = chunk.filter(sub => sub.text !== ' ');
            if (filtered.length === 0) {
                // If array has nothing but spaces, then skip it.
            } else if (filtered.length === 1 && filtered[0].name === 'group') {
                // If array has exactly one group element and nothing else (except spaces), then put it on top level
                // and add implicit tags inside group.
                addImplicitTags(filtered[0], options);
                element.elements.push(...chunk);
            } else {
                // If it is an array where everything is not allowed tag, add implicit tag around it.
                element.elements.push({
                    ctx: element.ctx,
                    name: options.implicitTag!,
                    elements: chunk,
                    attributes: {},
                    text: '',
                    line: chunk[0].line,
                    column: chunk[0].column,
                });
            }
        } else if (chunk.name === 'group') {
            // If it is a group containing allowed tags, add implicit tags inside group and add group to this element.
            addImplicitTags(chunk, options);
            element.elements.push(chunk);
        } else {
            // If it is an allowed tag, add it to this element.
            element.elements.push(chunk);
        }
    }

}

function removeSpaces(element: Element) {
    element.elements = element.elements.filter(sub => sub.text !== ' ');
    for (let sub of element.elements) {
        if (sub.name === 'group') {
            removeSpaces(sub);
        }
    }
}

function convertElementsInternal(result: any[], ts: TranslatorState, elements: Element[], options: ProcessOptions): void {
    for (let element of elements) {
        if (element.name === 'group') {
            let tsInner = ts.fetchCommonAttributes(element); // Fetch common attributes from this element to new state.
            convertElementsInternal(result, tsInner, element.elements, options);
        } else if (element.name in options.tags) {
            result.push(...options.tags[element.name](ts, element));
        } else {
            ts.ctx.error(`The <${element.name}> tag not expected here.`, element);
        }
    }
}

export function convertElement(ts: TranslatorState, element: Element, options: ProcessOptions): any[] {
    let result: any[] = [];
    convertElementsInternal(result, ts, element.elements, options);
    return result;
}

