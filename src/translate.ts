import * as docx from "docx";
import { CData, Element, Text, TextProcessing, XMLError, processText } from "./xml";

interface State {

};

interface TranslationResult {
    objects: any[];
    properties: { [key: string]: any };
};

function createCDataObject(child: CData) {
    return [];
}

function createTextObject(child: Text) {
    return [];
}


class Tags {
    p(src: Element): any[] {
        return [];
    };
};

const tags = (new Tags()) as unknown as { [key: string]: (src: Element) => any[] };

function createElementObject(src: Element) {

    let tag = createTagObject(src);
    if (tag) {
        return tag;
    }

    let attributes = translateAttributes(src);
    let properties = translatePropertiesContext(src);
    let args: any[];

    if (typeof (properties) === 'object' && properties instanceof Array) {
        if (Object.keys(attributes).length !== 0) {
            throw new XMLError(src, 'Attributes not allowed in object with array constructor parameters.');
        }
        args = properties;
    } else {
        args = [ { ...attributes, ...properties } ];
    }

    let construct = (docx as any)[src.name];

    if (!construct || typeof construct !== 'function') {
        throw new XMLError(src, `Unknown tag "${src.name}".`);
    }

    return [ new construct(...args) ];
}

function translateObjectsContext(state: State, container: Element, skipSpaces: boolean): TranslationResult {

    let result: TranslationResult = {
        objects: [],
        properties: {},
    };

    let children = container.elements || [];
    if (skipSpaces) {
        children = processText(children, TextProcessing.IGNORE_SPACES);
    }

    for (let child of children) {

        if (child.type === 'instruction') {
            throw new XMLError(child, 'Unexpected XML instruction.');
        } else if (child.type === 'text') {
            result.objects.push(...createTextObject(child));
            continue;
        } else if (child.type === 'cdata') {
            result.objects.push(...createCDataObject(child));
            continue;
        }

        let names = child.name.split(':');

        if (names.length > 1 && names.at(-1) == 'property') {
            // TODO: add property
            continue;
        }

        result.objects.push(...createElementObject(child));
    }

    return result;
}

export function translate(root: Element) {
    console.log(root);
}
