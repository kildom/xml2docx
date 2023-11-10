import * as docx from "docx";
import { AnyObject, undefEmpty } from "../common";
import { DocxTranslator, fromEnum } from "../docxTranslator";
import { Element, SpacesProcessing } from "../xml";
import { getBorderOptions } from "./borders";


export function pTag(tr: DocxTranslator, src: Element, attributes: AnyObject, properties: AnyObject): any[] {
    let style: string | undefined = undefined;
    let m = src.name.match(/^h([1-9])$/);
    if (m) style = 'Heading' + m[1];
    let options: docx.IParagraphOptions = {
        children: tr.parseObjects(src, SpacesProcessing.TRIM),
        alignment: fromEnum(src, attributes.align, docx.AlignmentType, { justify: 'both' }) as docx.AlignmentType,
        style: attributes.style || style,
        border: undefEmpty({
            bottom: getBorderOptions(tr, src, attributes.borderBottom),
            left: getBorderOptions(tr, src, attributes.borderLeft),
            right: getBorderOptions(tr, src, attributes.borderRight),
            top: getBorderOptions(tr, src, attributes.borderTop),
        }),
    };
    return [new docx.Paragraph({ ...options, ...properties })];
};
