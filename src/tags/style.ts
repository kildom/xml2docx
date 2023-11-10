import { FileChild } from "docx/build/file/file-child";
import { getColor } from "../colors";
import { DocxTranslator, fromEnum } from "../docxTranslator";
import { Element, SpacesProcessing, XMLError } from "../xml";
import * as docx from "docx";
import { IPropertiesOptions } from "docx/build/file/core-properties";
import { AnyObject, symbolInstance } from "../common";


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

export function underlineTag(tr: DocxTranslator, src: Element, attributes: AnyObject): any[] {
    let change: docx.IRunOptions = {
        underline: {
            color: attributes.color,
            type: fromEnum(src, attributes.type, docx.UnderlineType) as docx.UnderlineType,
        }
    }
    return simpleStyleChange(tr, src, change);
}


export function fontTag(tr: DocxTranslator, src: Element, attributes: AnyObject): any[] {
    let color = getColor(attributes.color);
    if (color === undefined) throw new XMLError(src, `Invalid color "${attributes.color}".`);
    let change: docx.IRunOptions = {
        color,
        font: attributes.face,
        size: attributes.size,
    }
    return simpleStyleChange(tr, src, change);
}

function simpleStyleChange(tr: DocxTranslator, src: Element, styleChange: docx.IRunOptions) {
    let newTranslator = tr.copy(styleChange);
    let properties = newTranslator.getProperties(src);
    newTranslator = newTranslator.copy(properties);
    return newTranslator.parseObjects(src, SpacesProcessing.PRESERVE);
}

export function fallbackStyleChange(tr: DocxTranslator, src: Element): any[] | null {
    if (simpleBoolStyleTable[src.name] !== undefined) {
        return simpleStyleChange(tr, src, { [simpleBoolStyleTable[src.name]]: true });
    }
    return null;
}
