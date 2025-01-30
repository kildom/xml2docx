import * as docx from 'docx';
import { Attributes, Dict, Mutable, removeShallowUndefined, selectUndef, splitListValues } from '../common';
import { convertElement, prepareElement, processChildren, TagFunction, TextFormat, TranslatorState } from '../translator';
import { Element } from '../xml';
import { getSingleBorder } from '../attrs/borders-attrs';
import * as convert from '../convert';
import { getIRunStylePropertiesOptions } from '../attrs/font-attrs';
import { ObjectContainer } from './document';
import { getIParagraphPropertiesOptions } from '../attrs/p-attrs';


export function pStyleFontTag(ts: TranslatorState, element: Element): any[] {
    prepareElement(ts, element, {
        tags: {},
        removeSpaces: true,
    });
    return [getIRunStylePropertiesOptions(element)];
}


export function pStyleTag(ts: TranslatorState, element: Element): any[] {

    element.elements.push({
        ...element,
        name: 'dummy',
        elements: [],
        attributes: {},
    });

    let list = processChildren(ts, element, {
        tags: { 'font': pStyleFontTag },
        removeSpaces: true,
        implicitTag: 'font',
    });

    let run: docx.IRunStylePropertiesOptions = {};

    for (let font of list) {
        run = { ...run, ...font };
    }

    let opt: Mutable<docx.IParagraphStyleOptions> = {
        id: convert.mandatory(element, 'id'),
        basedOn: element.attributes.basedon,
        name: element.attributes.name,
        paragraph: getIParagraphPropertiesOptions(element),
        run,
    };

    opt.name = opt.name || opt.id;

    return [new ObjectContainer('IParagraphStyleOptions', opt)];
}

