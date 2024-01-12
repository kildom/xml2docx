# Document

## `<document>`

<!-- >>> documentTag -->

Top level document element.

* `title` *[optional]*
    
    Title in document properties.

* `subject` *[optional]*
    
    Subject in document properties.

* `creator` *[optional]*
    
    Creator name in document properties.

* `keywords` *[optional]*
    
    Keywords in document properties.

* `description` *[optional]*
    
    Description in document properties.

* `last-modified-by` *[optional]*
    
    Last modified by name in document properties.

<!-- <<< -->

## `<header>`, `<footer>`

<!-- >>> headerFooterTag -->

Page header or footer.

* `page` *[optional]*
    
    On which page this header or footer will be displayed. Enumeration values:
    * `default`
    * `even`
    * `first`
    
    Using `first` page automatically enables title page in current section.

<!-- <<< -->

## `<section>`

<!-- >>> sectionTag -->

Section.

* `border-display` *[optional]*
    
    On which pages display the borders. Enumeration values:
    * `all-pages`
    * `first-page`
    * `not-first-page`

* `border-offset-from` *[optional]*
    
    The base from the border distance should be calculated. Enumeration values:
    * `page`
    * `text`

* `border-z-order` *[optional]*
    
    Defines if border should be above or below content. Enumeration values:
    * `back`
    * `front`

* `margin="top left bottom right"` *[optional]*
    
    Page margins. *[Positive universal measure](attributes.md#positive-universal-measure)*.
    * `top` - Top margin.
    * `right` - Right margin. Default: the same as top.
    * `bottom` - Bottom margin. Default: the same as top.
    * `left` - Left margin. Default: the same as right.

* `title-page` *[optional]*
    
    Enable title page in this section. *[Boolean value](attributes.md#boolean-value)*.

* `type` *[optional]*
    
    Section type. Enumeration values:
    * `continuous`
    * `even-page`
    * `next-column`
    * `next-page`
    * `odd-page`

* `vertical-align` *[optional]*
    
    Vertical alignment. Enumeration values:
    * `bottom`
    * `center`
    * `top`

* `border="top, left, bottom, right"` *[optional]*
    
    Page borders. 
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

* `header-margin` *[optional]*
    
    Header margin length. *[Positive universal measure](attributes.md#positive-universal-measure)*.

* `footer-margin` *[optional]*
    
    Footer margin length. *[Positive universal measure](attributes.md#positive-universal-measure)*.

* `gutter-margin` *[optional]*
    
    Gutter margin length. *[Positive universal measure](attributes.md#positive-universal-measure)*.

* `width` *[optional]*
    
    Page width. *[Positive universal measure](attributes.md#positive-universal-measure)*.

* `height` *[optional]*
    
    Page height. *[Positive universal measure](attributes.md#positive-universal-measure)*.

* `orientation` *[optional]*
    
    Page orientation. Enumeration values:
    * `landscape`
    * `portrait`

<!-- <<< -->
