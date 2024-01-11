
import * as docx from 'docx';

export const VerticalAlignAliases = {
    middle: docx.VerticalAlign.CENTER,
};

export const TextDirectionAliases = {
    topToBottom: docx.TextDirection.TOP_TO_BOTTOM_RIGHT_TO_LEFT,
    leftToRight: docx.TextDirection.LEFT_TO_RIGHT_TOP_TO_BOTTOM,
    bottomToTop: docx.TextDirection.BOTTOM_TO_TOP_LEFT_TO_RIGHT,
};

export const AlignmentTypeAliases = {
    justify: docx.AlignmentType.BOTH,
};

export enum HighlightColor {
    BLACK = 'black',
    BLUE = 'blue',
    CYAN = 'cyan',
    DARK_BLUE = 'darkBlue',
    DARK_CYAN = 'darkCyan',
    DARK_GRAY = 'darkGray',
    DARK_GREEN = 'darkGreen',
    DARK_MAGENTA = 'darkMagenta',
    DARK_RED = 'darkRed',
    DARK_YELLOW = 'darkYellow',
    GREEN = 'green',
    LIGHT_GRAY = 'lightGray',
    MAGENTA = 'magenta',
    RED = 'red',
    WHITE = 'white',
    YELLOW = 'yellow',
}

export enum HeaderFooterPage {
    DEFAULT = 'default',
    EVEN = 'even',
    FIRST = 'first',
}

export enum SectionPropertiesOptionsType {
    CONTINUOUS = 'continuous',
    NEXT_PAGE = 'nextPage',
    NEXT_COLUMN = 'nextColumn',
    EVEN_PAGE = 'evenPage',
    ODD_PAGE = 'oddPage',
}
