import { FileChild } from "docx/build/file/file-child";
import { getColor } from "../colors";
import { DocxTranslator, fromEnum } from "../docxTranslator";
import { Element, SpacesProcessing, XMLError } from "../xml";
import * as docx from "docx";
import { IPropertiesOptions } from "docx/build/file/core-properties";
import { AnyObject, symbolInstance, undefEmpty } from "../common";
import { getMargins } from "./borders";


function getFlip(src: Element, value: string | undefined) {
    if (value === undefined) return undefined;
    let lower = value.toLowerCase();
    let horizontal: boolean = lower.indexOf('h') >= 0;
    let vertical: boolean = lower.indexOf('v') >= 0;
    return { horizontal, vertical };
}

function getHVPosition(tr: DocxTranslator, src: Element, value: string, alignEnum: { [key: string]: string | number }, relEnum: { [key: string]: string | number }) {
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
        offset = tr.filter(src, ':emu', part);
    }
    return { align, offset, relative };
}

function getWrap(src: Element, value: string | undefined, margins: docx.IMargins | undefined): docx.ITextWrapping | undefined {
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

export function imgTag(tr: DocxTranslator, src: Element, attributes: AnyObject, properties: AnyObject): any[] {
    let margins = getMargins(tr, src, attributes.margins);
    let options: docx.IImageOptions = {
        data: attributes.src ? tr.filter(src, ':file', attributes.src) : tr.filter(src, ':base64', attributes.data),
        transformation: {
            width: tr.filter(src, ':pt3q', attributes.width, true),
            height: tr.filter(src, ':pt3q', attributes.height, true),
            rotation: tr.filter(src, ':int', attributes.rotate, true),
            flip: getFlip(src, attributes.flip),
        },
        floating: undefEmpty({
            allowOverlap: tr.filter(src, ':bool', attributes.allowOverlap, true),
            behindDocument: tr.filter(src, ':bool', attributes.behindDocument, true),
            layoutInCell: tr.filter(src, ':bool', attributes.layoutInCell, true),
            lockAnchor: tr.filter(src, ':bool', attributes.lockAnchor, true),
            zIndex: tr.filter(src, ':int', attributes.zIndex, true),
            horizontalPosition: getHVPosition(tr, src, attributes.horizontal, docx.HorizontalPositionAlign, docx.HorizontalPositionRelativeFrom) as docx.IHorizontalPositionOptions,
            verticalPosition: getHVPosition(tr, src, attributes.vertical, docx.VerticalPositionAlign, docx.VerticalPositionRelativeFrom) as docx.IVerticalPositionOptions,
            margins,
            wrap: getWrap(src, attributes.wrap, margins),
        }),
    };
    return [new docx.ImageRun(options)];
}
