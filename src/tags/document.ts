import { FileChild } from "docx/build/file/file-child";
import { getColor } from "../colors";
import { DocxTranslator, fromEnum } from "../docxTranslator";
import { Element, SpacesProcessing, XMLError } from "../xml";
import * as docx from "docx";
import { IPropertiesOptions } from "docx/build/file/core-properties";
import { symbolInstance } from "../common";

export function documentTag(tr: DocxTranslator, src: Element): any[] {
    let attributes = tr.getAttributes(src);
    let properties = tr.getProperties(src);
    let sections: docx.ISectionOptions[] = [];
    let paragraphStyles: docx.IParagraphStyleOptions[] = [];
    let characterStyles: docx.ICharacterStyleOptions[] = [];
    let children: FileChild[] = [];
    let options: IPropertiesOptions = {
        sections: sections,
        title: attributes.title,
        subject: attributes.subject,
        creator: attributes.creator,
        keywords: attributes.keywords,
        description: attributes.description,
        lastModifiedBy: attributes.lastModifiedBy,
        // TODO: More properties
        styles: {
            paragraphStyles,
            characterStyles,
        },
        ...properties,
    }
    for (let obj of tr.parseObjects(src, SpacesProcessing.IGNORE)) {
        if (obj[symbolInstance] === 'ISectionOptions') {
            sections.push(obj);
            children = obj.children;
        } else if (obj[symbolInstance] === 'IParagraphStyleOptions') {
            paragraphStyles.push(obj);
        } else if (obj[symbolInstance] === 'ICharacterStyleOptions') {
            characterStyles.push(obj);
        } else {
            if (sections.length === 0) {
                children = [];
                sections.push({ children });
            }
            children.push(obj);
        }
    }
    return [new docx.Document(options)]
};
