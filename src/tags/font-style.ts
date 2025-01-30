import * as docx from 'docx';
import { Attributes, Dict, Mutable, removeShallowUndefined, selectUndef, splitListValues } from '../common';
import { convertElement, prepareElement, processChildren, TagFunction, TextFormat, TranslatorState } from '../translator';
import { Element } from '../xml';
import { getSingleBorder } from '../attrs/borders-attrs';
import * as convert from '../convert';
import { getIRunStylePropertiesOptions } from '../attrs/font-attrs';
import { ObjectContainer } from './document';


export function fontStyleTag(ts: TranslatorState, element: Element): any[] {

    processChildren(ts, element, { tags: {}, removeSpaces: true });

    let opt: Mutable<docx.ICharacterStyleOptions> = {
        id: convert.mandatory(element, 'id'),
        basedOn: element.attributes.basedon,
        name: element.attributes.name,
        run: getIRunStylePropertiesOptions(element),
    };

    opt.name = opt.name || opt.id;

    return [new ObjectContainer('ICharacterStyleOptions', opt)];
}

