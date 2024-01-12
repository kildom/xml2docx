# Paragraphs

## `<p>`

<!-- >>> pTag -->

Paragraph.

The paragraph contains formatted text and images.
Any whitespaces at the beginning and end of the paragraph are removed.

You can avoid repeating the same attributes with `preserve` attribute.
Paragraphs can preserve its attributes if `preserve` attribute is set to true.
All following paragraphs without any attributes will reuse the preserved attributes.
You can stop reusing attributes if you specify at least one attribute in new paragraph.

[Paragraph](https://docx.js.org/api/Paragraph.html)

* `preserve` *[optional]*
    
    Preserve the attributes. See description above. *[Boolean value](attributes.md#boolean-value)*.

* `border="top, left, bottom, right"` *[optional]*
    
    Paragraph border. 
    * `top` - Top border.
    * `right` - Right border. Default: the same as top.
    * `bottom` - Bottom border. Default: the same as top.
    * `left` - Left border. Default: the same as right.
    
    Each side of the border is `color style size space`: 
    * `color` - Border color. *[Hex color value or color name](attributes.md#color)*.
    * `style` - Border style. Enumeration values:
        * `dash-dot-stroked`
        * `dash-small-gap`
        * `dashed`
        * `dot-dash`
        * `dot-dot-dash`
        * `dotted`
        * `double`
        * `double-wave`
        * `inset`
        * `nil`
        * `none`
        * `outset`
        * `single`
        * `thick`
        * `thick-thin-large-gap`
        * `thick-thin-medium-gap`
        * `thick-thin-small-gap`
        * `thin-thick-large-gap`
        * `thin-thick-medium-gap`
        * `thin-thick-small-gap`
        * `thin-thick-thin-large-gap`
        * `thin-thick-thin-medium-gap`
        * `thin-thick-thin-small-gap`
        * `three-d-emboss`
        * `three-d-engrave`
        * `triple`
        * `wave`
    * `size` - Border size. *[Positive universal measure](attributes.md#positive-universal-measure) without zero*.
    * `space` - Space between border and content. *[Positive universal measure](attributes.md#positive-universal-measure)*.

* `page-break` *[optional]*
    
    Force page break before this paragraph. *[Boolean value](attributes.md#boolean-value)*.

* `tabs="position type leader, ..."` *[optional]*
    
    Tabulator stops. 
    * `type` *[optional]* - Type of tab. Enumeration values:
        * `bar`
        * `center`
        * `clear`
        * `decimal`
        * `end`
        * `left`
        * `num`
        * `right`
        * `start`
    * `leader` *[optional]* - Type of tab leader. Enumeration values:
        * `dot`
        * `hyphen`
        * `middle-dot`
        * `none`
        * `underscore`
    * `position` *[required]* - Tab position. *[Universal measure](attributes.md#universal-measure)*.

* `align` *[optional]*
    
    Text alignment. Enumeration values:
    * `center`
    * `distribute`
    * `end`
    * `high-kashida`
    * `justify` (aliases: `justified`, `both`)
    * `left`
    * `low-kashida`
    * `medium-kashida`
    * `num-tab`
    * `right`
    * `start`
    * `thai-distribute`

* `indent` *[optional]*
    
    Text indentation.

* `keep-lines` *[optional]*
    
    Keep text lines. *[Boolean value](attributes.md#boolean-value)*.

* `keep-next` *[optional]*
    
    Keep next. *[Boolean value](attributes.md#boolean-value)*.

* `outline="positive integer"` *[optional]*
    
    Outline level if this paragraph should be part of document outline.

* `spacing` *[optional]*
    
    Vertical spacing of the paragraph.

<!-- <<< -->

## `<title>` `<h1>` `<h2>` `<h3>` ...

Header paragraphs. They takes the same attributes as the [`<p>`](#p) tag.

When preserving attributes with the `preserve`,
each tag preserves the attributes by its own, so preserving attributes
for `<h1>` does not affect the `<p>` elements.

## `<tab/>`

<!-- >>> tabTag -->

Adds tabulation.

<!-- <<< -->

## `<br/>`

<!-- >>> brTag -->

Adds line break without breaking the paragraph.

<!-- <<< -->

## `<p-style>`

<!-- >>> pStyleTag -->

Define a paragraph style.

Default font style inside paragraph can be set using
[`<font>` element](format.md#font) inside this element.

* `id` *[required]*
    
    Style id. Use it to identify the style.

* `based-on` *[optional]*
    
    Style id of the parent style.

* `name` *[required]*
    
    User friendly name of the style.

* `next` *[optional]*
    
    Id if style for new paragraphs following this style.

* `align` *[optional]*
    
    Text alignment. Enumeration values:
    * `center`
    * `distribute`
    * `end`
    * `high-kashida`
    * `justify` (aliases: `justified`, `both`)
    * `left`
    * `low-kashida`
    * `medium-kashida`
    * `num-tab`
    * `right`
    * `start`
    * `thai-distribute`

* `indent` *[optional]*
    
    Text indentation.

* `keep-lines` *[optional]*
    
    Keep text lines. *[Boolean value](attributes.md#boolean-value)*.

* `keep-next` *[optional]*
    
    Keep next. *[Boolean value](attributes.md#boolean-value)*.

* `outline="positive integer"` *[optional]*
    
    Outline level if this paragraph should be part of document outline.

* `spacing` *[optional]*
    
    Vertical spacing of the paragraph.

<!-- <<< -->
