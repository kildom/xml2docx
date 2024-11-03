
import * as docx from 'docx';
import { splitListValues } from '../common';
import { convertColor, convertEnum,  convertPositiveUniversalMeasureInt, UnitsPerPt } from '../converters';

/**
 * Returns IBorderOptions from attribute value.
 * https://docx.js.org/api/interfaces/IBorderOptions.html
 */
/*>>> : color style size space */
export function getSingleBorder(text: string | undefined): docx.IBorderOptions | undefined {
    return splitListValues(text, {
        //* `color` - Border color. @filterColor
        color: (value: string) => convertColor.noErr(value),
        //* `style` - Border style. @enum:BorderStyle
        style: [
            (value: string) => convertEnum.noErr(value, docx.BorderStyle),
            () => docx.BorderStyle.SINGLE,
        ],
        //* `size` - Border size. @filterLengthUintNonZero
        size: (value: string) => convertPositiveUniversalMeasureInt.noErr(value, UnitsPerPt.pt8), // Is zero allowed
        //* `space` - Space between border and content. @filterLengthUint
        space: (value: string) => convertPositiveUniversalMeasureInt.noErr(value, UnitsPerPt.pt),
    }) as docx.IBorderOptions | undefined;
}

/**
 * Returns IBordersOptions from attribute value.
 * https://docx.js.org/api/interfaces/IBordersOptions.html
 */
/*>>> : top, left, bottom, right */
export function getBorders(value: string | undefined): docx.IBordersOptions | undefined {
    let borders = splitListValues(value, {
        //* `top` - Top border.
        top: [
            (value: string) => getSingleBorder(value),
            () => getSingleBorder('single'),
            'At least one border is required.',
        ],
        //* `right` - Right border. Default: the same as top.
        right: (value: string) => getSingleBorder(value),
        //* `bottom` - Bottom border. Default: the same as top.
        bottom: (value: string) => getSingleBorder(value),
        //* `left` - Left border. Default: the same as right.
        left: (value: string) => getSingleBorder(value),
    }, ',');
    if (borders === undefined) return undefined;
    borders.right = borders.right ?? borders.top;
    borders.bottom = borders.bottom ?? borders.top;
    borders.left = borders.left ?? borders.right;
    return borders as docx.IBordersOptions;
    /*> Each side of the border is `@short:getSingleBorder`: @getSingleBorder */
}
