
import * as docx from 'docx';

import { Context } from '../context';
import { Element } from '../xml';
import { TranslatorState } from '../translator';
import { documentTag } from './document';


export function rootTag(ts: TranslatorState, element: Element): docx.Document {

    let documentElement: Element;

    // Special kind of adding implicit tags - one global <document> tag for all if needed.
    let filtered = element.elements.filter(e => e.text !== ' ');
    if (filtered.length === 1 && filtered[0].name === 'document') {
        documentElement = filtered[0];
    } else {
        documentElement = {
            ctx: ts.ctx,
            name: 'document',
            attributes: {},
            elements: [...element.elements],
            text: '',
            line: 0,
            column: 1,
        };
        element.elements.splice(0, element.elements.length, documentElement);
    }

    return documentTag(ts, documentElement);
}
