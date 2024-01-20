# Formatting

## `<font>`

Change the font options. Alias: `<span>`.

You can use font options shorthand tags that works the same as
`<font>`, but additionally sets specific attribute.

For example:
```xml
<b>Bold text</b> is a shorthand for <font bold="y">bold text</font>.
```

The shorthand tags are:
`<b>` (alias `<bold>`), &nbsp;
`<i>` (alias `<italics>`), &nbsp;
`<u>` (alias `<underline>`), &nbsp;
`<s>` (alias `<strike>`), &nbsp;
`<double-strike>`, &nbsp;
`<sub>` (alias `<sub-script>`), &nbsp;
`<sup>` (alias `<super-script>`), &nbsp;
`<small-caps>`, &nbsp;
`<all-caps>`, &nbsp;
`<emboss>`, &nbsp;
`<imprint>`, &nbsp;
`<vanish>`, &nbsp;
`<spec-vanish>`, &nbsp;
`<no-proof>`, &nbsp;
`<snap-to-grid>`, &nbsp;
`<math>`, &nbsp;
`<bold-complex-script>`, &nbsp;
`<italics-complex-script>`, &nbsp;
`<right-to-left>`.

<!-- >>> fontTag -->

* `style` *[optional]*
    
    Font style id.

* `underline="type color"` *[optional]*
    
    Text underline.
    * `type` - Underline type. Enumeration values:
        * `dash`
        * `dashdotdotheavy` (alias `dash-dot-dot-heavy`)
        * `dashdotheavy` (alias `dash-dot-heavy`)
        * `dashedheavy` (alias `dashed-heavy`)
        * `dashlong` (alias `dash-long`)
        * `dashlongheavy` (alias `dash-long-heavy`)
        * `dotdash` (alias `dot-dash`)
        * `dotdotdash` (alias `dot-dot-dash`)
        * `dotted`
        * `dottedheavy` (alias `dotted-heavy`)
        * `double`
        * `none`
        * `single`
        * `thick`
        * `wave`
        * `wavydouble` (alias `wavy-double`)
        * `wavyheavy` (alias `wavy-heavy`)
        * `words`
    * `color` - Underline color. *[Hex color value or color name](attributes.md#color)*.

* `color` *[optional]*
    
    Text color. *[Hex color value or color name](attributes.md#color)*.

* `kern` *[optional]*
    
    Text kerning. *[Positive universal measure](attributes.md#positive-universal-measure)*.

* `position` *[optional]*
    
    Position. *[Universal measure](attributes.md#universal-measure)*.

* `size` *[optional]*
    
    Font size. *[Positive universal measure](attributes.md#positive-universal-measure)*.

* `font` *[optional]*
    
    Font name.

* `face` *[optional]*
    
    Alias of `font` attribute.

* `family` *[optional]*
    
    Alias of `font` attribute.

* `highlight` *[optional]*
    
    Text Highlighting. Enumeration values:
    * `black`
    * `blue`
    * `cyan`
    * `dark-blue`
    * `dark-cyan`
    * `dark-gray`
    * `dark-green`
    * `dark-magenta`
    * `dark-red`
    * `dark-yellow`
    * `green`
    * `light-gray`
    * `magenta`
    * `red`
    * `white`
    * `yellow`

* `background` *[optional]*
    
    Background color. *[Hex color value or color name](attributes.md#color)*.

* `border="color style size space"` *[optional]*
    
    Border around the text. 
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

* `scale="positive number"` *[optional]*
    
    Font scale.

The following attributes are optional
*[boolean values](attributes.md#boolean-value)*
defining the text format.

* `bold`
* `italics`
* `strike`
* `double-strike`
* `sub` (alias `sub-script`)
* `super` (alias `super-script`)
* `small-caps`
* `all-caps`
* `emboss`
* `imprint`
* `vanish`
* `spec-vanish`
* `no-proof`
* `snap-to-grid`
* `math`
* `bold-complex-script`
* `italics-complex-script`
* `size-complex-script`
* `highlight-complex-script`
* `right-to-left`

<!-- <<< -->

## `<font-style>`

<!-- >>> fontStyleTag -->

Define a font style.

This tag inherits all the attributes from the [`<font>` tag](#font)
except `style` attribute.
It also defines the following own attributes:

* `id` *[required]*
    
    Style id. Use it to identify the style.

* `based-on` *[optional]*
    
    Style id of the parent style.

* `name` *[required]*
    
    User friendly name of the style.

<!-- <<< -->
