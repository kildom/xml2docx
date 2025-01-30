
import * as docx from 'docx';
import * as convert from '../convert';
import { splitListValues } from '../common';
import { Element } from '../xml';

// #region SingleBorder

/**
 * Returns IBorderOptions from attribute value.
 * https://docx.js.org/api/interfaces/IBorderOptions.html
 */
/*>>> : color style size space */
export function getSingleBorder(element: Element, name: string, value?: string): docx.IBorderOptions | undefined {
    return splitListValues(element, name, value, {
        //* `color` - Border color. @filterColor
        color: (value: string) => convert.color.noErr(value),
        //* `style` - Border style. @enum:BorderStyle
        style: [
            (value: string) => convert.enumeration.noErr(element, value, docx.BorderStyle),
            () => docx.BorderStyle.SINGLE,
        ],
        //* `size` - Border size. @filterLengthUintNonZero
        size: (value: string) => convert.positiveUniversalMeasureInt.noErr(value, convert.UnitsPerPt.pt8), // Is zero allowed
        //* `space` - Space between border and content. @filterLengthUint
        space: (value: string) => convert.positiveUniversalMeasureInt.noErr(value, convert.UnitsPerPt.pt),
    }) as docx.IBorderOptions | undefined;
}

// #endregion

/**
 * Returns IBordersOptions from attribute value.
 * https://docx.js.org/api/interfaces/IBordersOptions.html
 */
/*>>> : top, left, bottom, right */
export function getBorders(element: Element, name: string, value?: string): docx.IBordersOptions | undefined {
    let borders = splitListValues(element, name, value, {
        //* `top` - Top border.
        top: [
            (value: string) => getSingleBorder(element, name, value),
            () => getSingleBorder(element, name, 'single'),
            'At least one border is required.',
        ],
        //* `right` - Right border. Default: the same as top.
        right: (value: string) => getSingleBorder(element, name, value),
        //* `bottom` - Bottom border. Default: the same as top.
        bottom: (value: string) => getSingleBorder(element, name, value),
        //* `left` - Left border. Default: the same as right.
        left: (value: string) => getSingleBorder(element, name, value),
    }, ',');
    if (borders === undefined) return undefined;
    borders.right = borders.right ?? borders.top;
    borders.bottom = borders.bottom ?? borders.top;
    borders.left = borders.left ?? borders.right;
    return borders as docx.IBordersOptions;
    /*> Each side of the border is `@short:getSingleBorder`: @getSingleBorder */
}
