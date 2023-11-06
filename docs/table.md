# Tables

## `<table>`

Create a HTML-like table.

Only allowed child element is `<tr>`.

It is a wrapper for the [Table class](https://docx.js.org/api/classes/Table.html).
You can use `:property` elements to pass data directly to it.

### Attributes

* `columnWidths` *[optional]*

  List of column widths ([length units](general.md#length)) for fixed table layout.

* `align` *[optional]*

  Table alignment, see https://docx.js.org/api/enums/AlignmentType.html.

* `width` *[optional]*

  Table width in [length units](general.md#length) or a percentage value followed by `%` sign.

* `border-bottom`, `border-left`, `border-right`, `border-top` *[optional]*

  Table borders, [border styles](general.md#border-styles).

* `border-horizontal`, `border-vertical` *[optional]*

  Default borders between cells, [border styles](general.md#border-styles).

* `cell-margins` *[optional]*

  Default cell margins, see [surrounding lengths](general.md#surrounding-lengths).

### Floating table attributes

* `horizontal="[archon] [absolute or relative]"` *[optional]*

  Horizontal positioning for floating table.
  * `archon` *[optional]* - https://docx.js.org/api/enums/TableAnchorType.html
  * `absolute` *[optional]* - distance from referece location ([positive or negative length units](general.md#length)).
  * `relative` *[optional]* - https://docx.js.org/api/enums/RelativeHorizontalPosition.html <br/>
    The `absolute` and `relative` fields are mutually exclusive.

* `vertical="[archon] [absolute or relative]"` *[optional]*

  Vertical positioning for floating table.
  * `archon` *[optional]* - https://docx.js.org/api/enums/TableAnchorType.html
  * `absolute` *[optional]* - distance from referece location ([positive or negative length units](general.md#length)).
  * `relative` *[optional]* - https://docx.js.org/api/enums/RelativeVerticalPosition.html <br/>
    The `absolute` and `relative` fields are mutually exclusive.

* `float-margins` *[optional]*

  Distance between text and floating table, see [surrounding lengths](general.md#surrounding-lengths).

* `overlap` *[optional]*

  Boolean overlap value for floating table, see https://docx.js.org/api/types/ITableFloatOptions.html.


## `<tr>`

Create a table row.

Only allowed child element is `<td>`.

It is a wrapper for the [TableRow class](https://docx.js.org/api/classes/TableRow.html).
You can use `:property` elements to pass data directly to it.

### Attributes

* `height="[rule] [length]"` *[optional]*

  Height of the row.
  * `rule` *[optional]* - https://docx.js.org/api/enums/HeightRule.html, default `at-least`.
  * `length` *[optional]* - [length units](general.md#length)

* `header` *[optional]*

  This is header row (boolean)

* `cant-split` *[optional]*

  The row cannot split (boolean)


## `<td>`

Create a table cell.

Only allowed child elements are `<p>`, `<table>`, `<Paragraph>`, `<Table>`.

It is a wrapper for the [TableCell class](https://docx.js.org/api/classes/TableCell.html).
You can use `:property` elements to pass data directly to it.

### Attributes

* `border`, `border-bottom`, `border-left`, `border-right`, `border-top`, `border-end`, `border-start`, `border-horizontal`, `border-vertical` *[optional]*

  Cell borders, [border styles](general.md#border-styles).

* `margins` *[optional]*

  Cell margins, see [surrounding lengths](general.md#surrounding-lengths).

* `valign` *[optional]*

  Vertical content alignment, see https://docx.js.org/api/enums/VerticalAlign.html.
  You can also use HTML-like value `middle` that is alias for `center`.

* `background` *[optional]*

  Background color, see [colors](general.md#colors).

* `colspan`, `rowspan` *[optional]*

  Number of cell that this cell is spanning.

* `dir` *[optional]*

  Text direction, see https://docx.js.org/api/enums/TextDirection.html.
  You can also use short forms: `bottom-to-top`, `left-to-right`, `top-to-bottom`.
