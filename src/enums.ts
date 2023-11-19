
import * as docx from "docx";

export enum VerticalAlignAliases {
    middle = docx.VerticalAlign.CENTER,
};

export enum TextDirectionAliases {
    topToBottom = docx.TextDirection.TOP_TO_BOTTOM_RIGHT_TO_LEFT,
    leftToRight = docx.TextDirection.LEFT_TO_RIGHT_TOP_TO_BOTTOM,
    bottomToTop = docx.TextDirection.BOTTOM_TO_TOP_LEFT_TO_RIGHT,
};

export enum AlignmentTypeAliases {
    justify = docx.AlignmentType.BOTH,
};
