# Images

## `<img>`

<!-- >>> imgTag -->

Adds image to the document.

You must put it into `<p>` element. Suggested image formats are: `JPEG` and `PNG`. It also supports `BMP` and `GIF`,
but those are not recommended.

One of the `src` and `data` attributes is required. They are mutually exclusive, so use exactly one of them.

[ImageRun](https://docx.js.org/api/classes/ImageRun.html)

* `margin="top left bottom right"` *[optional]*
    
    Margins around the image. *[Positive universal measure](attributes.md#positive-universal-measure)*.
    * `top` - Top margin.
    * `right` - Right margin. Default: the same as top.
    * `bottom` - Bottom margin. Default: the same as top.
    * `left` - Left margin. Default: the same as right.

* `src` *[optional]*
    
    Image source path. An absolute path or a path relative to main input file.

* `data` *[optional]*
    
    Raw image data in BASE-64 encoding.

* `width` *[required]*
    
    Width of the image. *[Positive universal measure](attributes.md#positive-universal-measure) without zero*.

* `height` *[required]*
    
    Height of the image. *[Positive universal measure](attributes.md#positive-universal-measure) without zero*.

* `rotate="integer"` *[optional]*
    
    Clockwise rotation in degrees.

* `flip` *[optional]*
    
    Image flip. Combination of `horizontal` (mirror) and `vertical`. You can also use also short forms: `h` and `v`.

* `allow-overlap` *[optional]*
    
    Allow overlapping. *[Boolean value](attributes.md#boolean-value)*.

* `behind-document` *[optional]*
    
    Put image behind text. *[Boolean value](attributes.md#boolean-value)*.

* `layout-in-cell` *[optional]*
    
    Layout in cell. *[Boolean value](attributes.md#boolean-value)*.

* `lock-anchor` *[optional]*
    
    Lock image archon in single place. *[Boolean value](attributes.md#boolean-value)*.

* `z-index="integer"` *[optional]*
    
    Image z-index. Decides which image is on top another.

* `horizontal="anchor align|offset"` *[optional]*
    
    Horizontal position in floating mode. 
    * `anchor` - Archon from which position is relative to. Enumeration values:
        * `character`
        * `column`
        * `inside-margin`
        * `left-margin`
        * `margin`
        * `outside-margin`
        * `page`
        * `right-margin`
    * `align` - Image alignment relative to archon. Enumeration values:
        * `center`
        * `inside`
        * `left`
        * `outside`
        * `right`
    * `offset` - Offset of absolute position from the archon. *[Universal measure](attributes.md#universal-measure)*.
    
    
    The `align` and `offset` fields are mutually exclusive. Specify just one of them.
    
    You must provide both `vertical` and `horizontal` attributes or none.
    Specifying just one of them is an error.

* `vertical="anchor align|offset"` *[optional]*
    
    Vertical position in floating mode. 
    * `anchor` - Archon from which position is relative to. Enumeration values:
        * `bottom-margin`
        * `inside-margin`
        * `line`
        * `margin`
        * `outside-margin`
        * `page`
        * `paragraph`
        * `top-margin`
    * `align` - Image alignment relative to archon. Enumeration values:
        * `bottom`
        * `center`
        * `inside`
        * `outside`
        * `top`
    * `offset` - Offset of absolute position from the archon. *[Universal measure](attributes.md#universal-measure)*.
    
    
    The `align` and `offset` fields are mutually exclusive. Specify just one of them.
    
    You must provide both `vertical` and `horizontal` attributes or none.
    Specifying just one of them is an error.

* `wrap="side type"` *[optional]*
    
    Text wrapping around the image. 
    * `side` - Wrapping side. Enumeration values:
        * `both-sides`
        * `largest`
        * `left`
        * `right`
    * `type` - Wrapping type. Enumeration values:
        * `none`
        * `square`
        * `tight`
        * `top-and-bottom`

<!-- <<< -->
