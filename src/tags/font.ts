import * as docx from 'docx';
import { Attributes, Dict, removeShallowUndefined, selectUndef, splitListValues } from '../common';
import { convertElement, prepareElement, processChildren, TagFunction, TextFormat, TranslatorState } from '../translator';
import { Element } from '../xml';
import { getSingleBorder } from '../attrs/borders-attrs';
import * as convert from '../convert';
import { getIRunStylePropertiesOptions } from '../attrs/font-attrs';

const avoidOrphansVarRegExp: RegExp[] = [];
const avoidOrphansFixedRegExp: RegExp[] = [];

const textTags: Dict<TagFunction> = {

    // Formatting tags
    font: (ts, element) => fontTag(ts, element, {}),
    span: (ts, element) => fontTag(ts, element, {}),
    b: (ts, element) => fontTag(ts, element, { bold: true }),
    i: (ts, element) => fontTag(ts, element, { italics: true }),
    s: (ts, element) => fontTag(ts, element, { strike: true }),
    u: (ts, element) => fontTag(ts, element, { underline: { type: docx.UnderlineType.SINGLE } }),
    sub: (ts, element) => fontTag(ts, element, { subScript: true }),
    sup: (ts, element) => fontTag(ts, element, { superScript: true }),
    vwnbsp: dummyTag,

    // Leaf Tags
    '#TEXT': textTag,
    '#CDATA': textTag,
    img: dummyTag,
    br: dummyTag,
    tab: dummyTag,
    pagenumber: dummyTag,
    totalpages: dummyTag,
    pagebreak: dummyTag,
};



function textTag(ts: TranslatorState, element: Element): any[] {

    let value = element.text;

    if (ts.format.useVarWidthNoBreakSpace) {
        value = value.replace(/\xA0/g, '\uFEFF ');
    }

    if (ts.format.avoidOrphans && ts.format.avoidOrphans > 0) {
        let count = ts.format.avoidOrphans;
        if (ts.format.useVarWidthNoBreakSpace) {
            if (!avoidOrphansVarRegExp[count]) {
                avoidOrphansVarRegExp[count] = new RegExp(`(?<=(?:^|\\s)\\p{Letter}{1,${count}})(?=\\s|$)`, 'gmu');
            }
            value = value.replace(avoidOrphansVarRegExp[count], '\uFEFF');
        } else {
            if (!avoidOrphansFixedRegExp[count]) {
                avoidOrphansFixedRegExp[count] = new RegExp(`(?<=(?:^|\\s)\\p{Letter}{1,${count}})\\s+`, 'gu');
            }
            value = value.replace(avoidOrphansFixedRegExp[count], '\xA0');
        }
    }

    return [new docx.TextRun({
        ...ts.format,
        text: value,
    })];
}

const fontTagOptions = {
    tags: textTags,
    removeSpaces: false,
};

export function fontTag(ts: TranslatorState, element: Element, formatChange?: TextFormat): any[] {

    let tsInner = prepareElement(ts, element, fontTagOptions);

    let attributes = element.attributes;

    let format: TextFormat = {
        ...formatChange,
        ...getIRunStylePropertiesOptions(element),
        style: attributes.style,
        avoidOrphans: convert.uint(element, 'avoidorphans'),
    };
    tsInner = tsInner.applyFormat(format);

    return convertElement(tsInner, element, fontTagOptions);
}


function dummyTag(ts: TranslatorState, element: Element): any[] { // TODO: Remove it
    return [];
}

