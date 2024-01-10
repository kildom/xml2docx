# Tables

## `<table>`

<!-- >>> tableTag -->

Table.

Child elements of the row are `<tr>` (or its associated [docx.js API](https://docx.js.org/api/) class).

[Table](https://docx.js.org/api/classes/Table.html).

* `horizontal="anchor absolute|relative"` *[optional]*
  
  Horizontal floating position. 
  * `anchor` - Archon from which position is relative to. Enumeration values:
    * `margin`
    * `page`
    * `text`
  * `absolute` - Absolute position. *[Universal measure](attributes.md#universal-measure)*.
  * `relative` - Relative position. Enumeration values:
    * `center`
    * `inside`
    * `left`
    * `outside`
    * `right`
  
  The `absolute` and `relative` fields are mutually exclusive. Specify just one of them.

* `vertical="anchor absolute|relative"` *[optional]*
  
  Vertical floating position. 
  * `anchor` - Archon from which position is relative to. Enumeration values:
    * `margin`
    * `page`
    * `text`
  * `absolute` - Absolute position. *[Universal measure](attributes.md#universal-measure)*.
  * `relative` - Relative position. Enumeration values:
    * `bottom`
    * `center`
    * `inline`
    * `inside`
    * `outside`
    * `top`
  
  The `absolute` and `relative` fields are mutually exclusive. Specify just one of them.

* `float-margins="top left bottom right"` *[optional]*
  
  Distance between table and surrounding text in floating mode. *[Positive universal measure](attributes.md#positive-universal-measure)*.
  * `top` - Top margin.
  * `right` - Right margin. Default: the same as top.
  * `bottom` - Bottom margin. Default: the same as top.
  * `left` - Left margin. Default: the same as right.

* `border="top, left, bottom, right"` *[optional]*
  
  Table border. 
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

* `inside-border="horizontal, vertical"` *[optional]*
  
  Default border between cells. 
  * `horizontal` - Horizontal borders.
  * `vertical` - Vertical borders.
  
  Each type of the border is `color style size space`: 
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

* `column-widths` *[optional]*
  
  List of columns widths for fixed table layout. *[Positive universal measure](attributes.md#positive-universal-measure)*.

* `align` *[optional]*
  
  Table alignment. Enumeration values:
  * `center`
  * `distribute`
  * `end`
  * `high-kashida`
  * `justified` (alias `both`)
  * `left`
  * `low-kashida`
  * `medium-kashida`
  * `num-tab`
  * `right`
  * `start`
  * `thai-distribute`

* `width` *[optional]*
  
  Table width. It can be expressed as percentage of entire available space (with `%` sign)
  or straightforward distance. *[Positive universal measure](attributes.md#positive-universal-measure)*.

* `cell-margins="top left bottom right"` *[optional]*
  
  Default cell margins. *[Positive universal measure](attributes.md#positive-universal-measure)*.
  * `top` - Top margin.
  * `right` - Right margin. Default: the same as top.
  * `bottom` - Bottom margin. Default: the same as top.
  * `left` - Left margin. Default: the same as right.

* `overlap` *[optional]*
  
  Enable overlapping for floating mode. *[Boolean value](attributes.md#boolean-value)*.

<!-- <<< -->

## `<tr>`

<!-- >>> trTag -->

Table row.

Child elements of the row are `<td>` (or its associated [docx.js API](https://docx.js.org/api/) class).

[TableRow](https://docx.js.org/api/classes/TableRow.html).

* `cant-split` *[optional]*
  
  Row can be splitted into multiple pages. *[Boolean value](attributes.md#boolean-value)*.

* `header` *[optional]*
  
  This row is a table header. *[Boolean value](attributes.md#boolean-value)*.

* `height="rule value"` *[optional]*
  
  Table height. 
  * `rule` - Rule how the row height is determined. Enumeration values:
    * `atleast` (alias `at-least`)
    * `auto`
    * `exact`
  * `value` - Height value. *[Positive universal measure](attributes.md#positive-universal-measure)*.

<!-- <<< -->

## `<td>`

<!-- >>> tdTag -->

Table cell.

Child elements of the cell must be `<p>` or `<table>` (or its associated [docx.js API](https://docx.js.org/api/) classes).
If they are not, then the content of the cell will be put into automatically generated `<p>` element.

[TableCell](https://docx.js.org/api/classes/TableCell.html).

* `border="top, left, bottom, right"` *[optional]*
  
  Cell border. 
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

* `colspan="non-zero positive integer"` *[optional]*
  
  Number of spanning columns.

* `rowspan="non-zero positive integer"` *[optional]*
  
  Number of spanning rows.

* `margins="top left bottom right"` *[optional]*
  
  Cell inner margins. *[Positive universal measure](attributes.md#positive-universal-measure)*.
  * `top` - Top margin.
  * `right` - Right margin. Default: the same as top.
  * `bottom` - Bottom margin. Default: the same as top.
  * `left` - Left margin. Default: the same as right.

* `dir` *[optional]*
  
  Text direction. Enumeration values:
  * `bottom-to-top` (aliases: `bottom-to-top-left-to-right`, `bt-lr`)
  * `left-to-right` (aliases: `left-to-right-top-to-bottom`, `lr-tb`)
  * `top-to-bottom` (aliases: `top-to-bottom-right-to-left`, `tb-rl`)

* `valign` *[optional]*
  
  Vertical alignment. Enumeration values:
  * `bottom`
  * `middle` (alias `center`)
  * `top`

* `background` *[optional]*
  
  Background color. *[Hex color value or color name](attributes.md#color)*.

<!-- <<< -->
