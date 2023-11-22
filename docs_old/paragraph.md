# Images

## `<p>`

The `<p>` element adds a new paragraph to the document.
Document text must be contained within the paragraph.

It is a wrapper for the [Paragraph class](https://docx.js.org/api/classes/Paragraph.html).
You can use `:property` elements to pass data directly to it.

### Attributes

* `style` *[optional]*

  Style name for this paragraph.

* `border-bottom`, `border-left`, `border-right`, `border-top` *[optional]*

  Paragraph borders, ser [border styles](general.md#border-styles).


## `<h1>` `<h2>` `<h3>` ...

Header paragraphs. Those are aliases for the `<p>` tag with `style` attribute
set to `Heading1`, `Heading2`, `Heading3`, and so on.


## Styles

* `align` *[optional]*

  Text alignment, see https://docx.js.org/api/enums/AlignmentType.html.
  One additional value `justify` which is alias of `both`.

* `spacing="[before] [after] [rule] [line] [contextual]"` *[optional]*

  Paragraph vertical spacing.
  * `before` *[optional]* - space before the paragraph in [length units](general.md#length)
  * `after` *[optional]* - space after the paragraph in [length units](general.md#length)
  * `rule` *[required if "line" is present]* - https://docx.js.org/api/enums/LineRuleType.html
  * `line` *[optional]* - space between lines in [length units](general.md#length) for "at-least" and "exact" rules,
    fraction of a line for other rules.
  * `contextual` *[optional]* - if it is literally `contextual` string, then skip space for the same paragraph styles.

* `indent="[left] [right] [first-line]"` *[optional]*

  Paragraph indentation.
  * `left` *[optional]* - left indentation in [length units](general.md#length)
  * `right` *[optional]* - right indentation in [length units](general.md#length)
  * `first-line` *[optional]* - first line indentation in [length units](general.md#length)

* `outline` *[optional]*

  Level of the document outline.

* `keep-lines` *[optional]*

* `keep-next` *[optional]*
