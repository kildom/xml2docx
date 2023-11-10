import { getColor } from "../colors";
import { DocxTranslator, fromEnum } from "../docxTranslator";
import { Element, XMLError } from "../xml";
import * as docx from "docx";

export function getBorderOptions(tr: DocxTranslator, src: Element, text: string | undefined) {
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
            size = tr.filter(src, ':pt8', p);
        } else if (space === undefined) {
            space = tr.filter(src, ':pt', p);
        } else {
            throw new XMLError(src, 'Invalid border options.');
        }
    }
    if (style === undefined) throw new XMLError(src, 'Border style required.');
    return { color, style, size, space };
}

export function getMargins(tr: DocxTranslator, src: Element, value: string | undefined, filterName = ':emu'): docx.IMargins | undefined {
    if (value === undefined) return undefined;
    let parts = value.trim().toLowerCase().split(/\s+/);
    if (parts.length == 3) {
        parts = [...parts, parts[1]];
    } else {
        parts = [...parts, ...parts, ...parts, ...parts];
    }
    return {
        top: tr.filter(src, filterName, parts[0], true),
        right: tr.filter(src, filterName, parts[1], true),
        bottom: tr.filter(src, filterName, parts[2], true),
        left: tr.filter(src, filterName, parts[3], true),
    };
}
