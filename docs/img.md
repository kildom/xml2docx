# `<img>`

The `<img>` element adds an image to the document.
It must be decendent of the `<p>` element.

Supported image formats: `JPEG`, `BMP`, `GIF`, `PNG`.

It is a wrapper for the [ImageRun class](https://docx.js.org/api/classes/ImageRun.html).
You can use `:property` elements to pass data directly to it.

## Attributes

* `src` or `data` *[required]*

  The image. A path relative to the main XML file location should be provided in the `src` attribute. A base-64 encoded string containing the image should be provided in the `data` attribute. The `src` and `data` are mutually exclusive.

* `width`, `height` *[required]*

  Desired size of the image ([length units](general.md#length)).

* `rotate` *[optional]*

  Clockwise rotation in degrees.

* `flip` *[optional]*

  Combination of `horizontal` and `vertical`. You can also use also short forms: `h` and `v`.

* `wrap="[type] [side]"` *[optional]*

  Text wrapping around the image.
  * `type` *[optional]* - https://docx.js.org/api/enums/TextWrappingType.html
  * `side` *[optional]* - https://docx.js.org/api/enums/TextWrappingSide.html

* `margins` *[optional]*

  Margins around the image. See [surrounding lengths](general.md#surrounding-lengths).

* `vertical="[relative-from] [offset or align]"` *[optional]*

  Vertical location of the image.
  * `relative-from` *[optional]* - https://docx.js.org/api/enums/VerticalPositionRelativeFrom.html
  * `offset` *[optional]* - distance from referece location ([positive or negative length units](general.md#length)).
  * `align` *[optional]* - https://docx.js.org/api/enums/VerticalPositionAlign.html

    The `offset` and `align` fields are mutually exclusive.

* `horizontal="[relative-from] [offset or align]"` *[optional]*

  Horizontal location of the image.
  * `relative-from` *[optional]* - https://docx.js.org/api/enums/HorizontalPositionRelativeFrom.html
  * `offset` *[optional]* - distance from referece location ([positive or negative length units](general.md#length)).
  * `align` *[optional]* - https://docx.js.org/api/enums/HorizontalPositionAlign.html

    The `offset` and `align` fields are mutually exclusive.

* `allow-overlap`, `behind-document`, `layout-in-cell`, `lock-anchor`, `z-index` *[optional]*

  Other image floating options defined by the [IFloating in docx API](https://docx.js.org/api/interfaces/IFloating.html).