import * as docx from 'docx';
import { Attributes, Dict, removeShallowUndefined, selectUndef, splitListValues } from '../common';
import { convertElement, prepareElement, processChildren, TagFunction, TextFormat, TranslatorState } from '../translator';
import { Element } from '../xml';
import { getSingleBorder } from './borders-attrs';
import * as convert from '../convert';

// #region IRunStylePropertiesOptions

/*>>>
@merge:simpleBoolStyleTable
*/
export function getIRunStylePropertiesOptions(element: Element): docx.IRunStylePropertiesOptions {
    let options: docx.IRunStylePropertiesOptions = {
        //* Font name.
        font: element.attributes.face,
        //* Font size. @@
        size: convert.positiveUniversalMeasure(element, 'size'),
        //* "type color" Text underline.
        //* * `type` - Underline type. @enum:UnderlineType|4
        //* * `color` - Underline color. @filterColor
        underline: splitListValues(element, 'underline', element.attributes.underline, {
            type: value => convert.enumeration.noErr(element, value, docx.UnderlineType),
            color: value => convert.color.noErr(value),
        }),
        //* Text color. @@
        color: convert.color(element, 'color'),
        //* Text kerning. @@
        kern: convert.positiveUniversalMeasure(element, 'kern'),
        //* Position. @@
        position: convert.universalMeasure(element, 'position'),
        //* Text Highlighting. @enum:HighlightColor
        highlight: convert.enumeration(element, 'highlight', docx.HighlightColor),
        shading: selectUndef(element.attributes.background, {
            type: docx.ShadingType.SOLID,
            //* Background color. @@
            color: convert.color(element, 'background'),
        }),
        //* Border around the text. @@
        border: getSingleBorder(element, 'border', element.attributes.border),
        //* Font scale. @@
        scale: convert.ufloat(element, 'scale'),
        //* All Caps. @@
        allCaps: convert.bool(element, 'allcaps'),
        //* Bold. @@
        bold: convert.bool(element, 'bold'),
        //* Bold complex script. @@
        boldComplexScript: convert.bool(element, 'boldcomplexscript'),
        //* Double strike. @@
        doubleStrike: convert.bool(element, 'doublestrike'),
        //* Emboss. @@
        emboss: convert.bool(element, 'emboss'),
        //* Imprint. @@
        imprint: convert.bool(element, 'imprint'),
        //* Italics. @@
        italics: convert.bool(element, 'italics'),
        //* Italics complex script. @@
        italicsComplexScript: convert.bool(element, 'italicscomplexscript'),
        //* Math. @@
        math: convert.bool(element, 'math'),
        //* No proofing. @@
        noProof: convert.bool(element, 'noproof'),
        //* Right to left. @@
        rightToLeft: convert.bool(element, 'righttoleft'),
        //* Small caps. @@
        smallCaps: convert.bool(element, 'smallcaps'),
        //* Snap to grid. @@
        snapToGrid: convert.bool(element, 'snaptogrid'),
        //* Spec vanish. @@
        specVanish: convert.bool(element, 'specvanish'),
        //* Strike. @@
        strike: convert.bool(element, 'strike'),
        //* Subscript. @@
        subScript: convert.bool(element, 'subscript'),
        //* Superscript. @@
        superScript: convert.bool(element, 'superscript'),
        //* Vanish. @@
        vanish: convert.bool(element, 'vanish'),
    };
    removeShallowUndefined(options);
    return options;
}

// #endregion

