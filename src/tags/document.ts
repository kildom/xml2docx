
import * as docx from 'docx';

import { Context } from '../context';
import { Element } from '../xml';
import { ProcessOptions, TranslatorState, processChildren } from '../translator';
import { headingTagNames, headingTags } from './p';
import { FirstConstructorParam, Mutable } from '../common';
import { fontStyleTag } from './font-style';
import { pStyleTag } from './p-style';

export class ObjectContainer {
    public constructor(
        public type: 'ISectionOptions' | 'IParagraphStyleOptions' | 'ICharacterStyleOptions',
        public value: any
    ) { }
}

export function documentTag(ts: TranslatorState, element: Element): docx.Document {

    let list = processChildren(ts, element, {
        tags: {
            ...headingTags,
            'fontstyle': fontStyleTag,
            'pstyle': pStyleTag,
        }, // TODO: Table, Header, footer, styles, and section
        implicitTag: 'p',
        removeSpaces: true,
    });

    let attributes = element.attributes;

    let sections: docx.ISectionOptions[] = [];
    let paragraphStyles: docx.IParagraphStyleOptions[] = [];
    let characterStyles: docx.ICharacterStyleOptions[] = [];
    let children: Mutable<docx.ISectionOptions['children']> = [];
    let options: FirstConstructorParam<typeof docx.Document> = {
        sections: sections,
        //* Title in document properties.
        title: attributes.title,
        //* Subject in document properties.
        subject: attributes.subject,
        //* Creator name in document properties.
        creator: attributes.creator,
        //* Keywords in document properties.
        keywords: attributes.keywords,
        //* Description in document properties.
        description: attributes.description,
        //* last-modified-by: Last modified by name in document properties.
        lastModifiedBy: attributes.lastmodifiedby,
        // TODO: More properties
        styles: {
            paragraphStyles,
            characterStyles,
        },
    };

    for (let obj of list) {
        if (obj instanceof ObjectContainer) {
            if (obj.type === 'ISectionOptions') {
                sections.push(obj.value);
                children = obj.value.children;
            } else if (obj.type === 'IParagraphStyleOptions') {
                paragraphStyles.push(obj.value);
            } else if (obj.type === 'ICharacterStyleOptions') {
                characterStyles.push(obj.value);
            }
        } else {
            if (sections.length === 0) {
                children = [];
                sections.push({ children });
            }
            if ((obj instanceof docx.Header) || (obj instanceof docx.Footer)) {
                //addHeaderFooterToSection(sections.at(-1) as Mutable<docx.ISectionOptions>, obj);
            } else {
                children.push(obj);
            }
        }
    }

    return new docx.Document(options);
}

