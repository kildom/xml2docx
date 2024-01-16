## Raw docx.js access

> [!NOTE]
> You should have a basic knowledge of JavaScript to read this section.

The `xml2docx` tool is using [docx.js](https://docx.js.org/) as underlying
docx output. Not all features of docx.js are available with the `xml2docx`,
but you can access most of them using XML that maps directly to
[docx.js API](https://docx.js.org/api/).

### Class creation

If you want to create a docx.js class inside any element, you can simply use
its name as a tag. For example:

```xml
<p>
    First page.
    <!-- Create PageBreak class object directly into paragraph. -->
    <PageBreak/>
    Second page.
</p>
```

When you creating a class, everything inside the element
will be converted to JavaScript object and will go into
the first constructor's parameter. The first parameter is
the `options` parameter in the most of docx.js API.

Once you are inside the docx.js class, you are in a different context and normal
XML tags does not apply there anymore. Everything inside this context becomes
a JavaScript value. Let's call this "API context" and the rest "normal context".

The following pseudo-classes can be used inside the `<document>` element.
They will be added to appropriate place in the document structure.
* `Section` - implements `ISectionOptions`,
* `ParagraphStyle` - implements `IParagraphStyleOptions`,
* `CharacterStyle` - implements `ICharacterStyleOptions`.

### API context

When you create an object from the API class, you switching to API context.
For example:

```xml
<TextRun font="Arial" highlight="lightGray">
    <text>This is text.</text>
</TextRun>
```

Above code will create a JavaScript object with `font` and `highlight` properties
taken from the attributes and one property `text` taken from the child. The
object will be passed to the constructor of the `TextRun` class.

It is equivalent to the following JavaScript expression:

```js
new TextRun({
    font: "Arial",
    highlight: "lightGray",
    text: "This is text."
})
```

XML inside API context have the following syntax.

The `...` in tag names below represent the names when adding
properties to an object, the `_` when adding items to an array.

#### String

```xml
<...>Text</...>
<...><![CDATA[Text]]><...>
<...></...>
```

Those lines generates the string values and adds them to the parent
object or array. For example:

```xml
<TextRun>
    <!-- The following "text" property is a string. -->
    <text>Hello World.</text>
</TextRun>
```

#### Object

```xml
<... prop1="..." prop2="..." ...>
    <property3>...</property3>
    <property4>...</property4>
    ...
</...>
```

It generates an object and adds it to the parent object or array.
The object properties are taken from the attributes and children.
You can use attributes or children whatever suits you the best.
For example:

```xml
<TextRun text="Foo bar.">
    <!-- The following "border" property is an object. -->
    <border size="32">
        <style>thinThickThinMediumGap</style>
        <color>#FF0000</color>
    </border>
</TextRun>
```

#### Array

```xml
<...>
    <_>...</_>
    <_>...</_>
    ...
</...>
```
It generates an array and adds it to the parent object or array.
The array items are `<_>...</_>`.
For example:

```xml
<TextRun>
    <!-- The following "children" property is an array of three items. -->
    <children>
        <_>Now is the year </_> <!-- string -->
        <_:YearLong/> <!-- object of class YearLong (see filters below) -->
        <_>.</_> <!-- string -->
    </children>
</TextRun>
```

When you passing an array to the constructor each array item becomes
one parameter, so you can use arrays to pass multiple parameters
to the constructor.

#### Switch to normal context

```xml
<...:_>
    ...
</...>
```

It generates an array from elements created using normal context, i.e.
containing `<p>`, `<b>`, `<img>` elements.

For example:

```xml
<Paragraph alignment="center">
    <!-- The following "children" property is an array of objects created
    using normal context. -->
    <children:_>
        This is <b>normal context</b> again.
    </children:_>
</Paragraph>
```

### Filters

The `.docx` format uses a lot of different units. Also, API requires some other
types than object, array or string. To solve this problems, you can use filters.

A filter is a function that takes one value, transforms it, and returns the
transformed value.

Simplest examples are the measurement units. Borders thickness is expressed as
integer number of 1/8 pt units. The `pt8` filter takes string in
*[Universal measure](attributes.md#universal-measure)* and converts it to
1/8 pt units.

```xml
<TextRun text="Foo bar.">
    <border style="single" size:pt8="0.5mm"/>
</TextRun>
```

Filters can be added to:
* attributes (`size:pt8="0.5mm"`),
* properties (`<size:pt8>0.5mm</size:pt8>`),
* array items (`<_:textFile>my_text_file.txt</_:textFile>`).
* classes (`<TextRun:json>{text:"Hello World!"}</TextRun:json>`),

Filters can be chained. They are executed from right to left, for example:

```xml
<TextRun:json:textFile>external_text_run.json5</TextRun:json:textFile>
```

It will read the `external_text_run.json5` file, parse it as JSON5, and
pass to the `TextRun` constructor.

You can use API class name as a filter. It will get the value, pass it to the constructor,
and return constructed object. For example:

```xml
<Paragraph>
    <children>
        <!-- The array item is a TextRun constructed with one parameter
        which is an object containing "text" and "color" properties. -->
        <_:TextRun text="Hello World!" color="#008800"/>
    </children>
</Paragraph>
```

List of filters:
* Unit conversions filters takes *[Universal measure](attributes.md#universal-measure)*
  and returns integer in specified units.
    * `pt` - 1 pt
    * `pt3q` - 3/4 pt
    * `pt8` - 1/8 pt
    * `pt20` and `dxa` - 1/20 pt
    * `emu` - 1/12700 pt
* `pass` - do nothing
* `file` - read file and return `Uint8Array` with content. Path must be absolute or relative to the directory containing main file.
* `textFile` - read UTF-8 file and return string with content. Path must be absolute or relative to the directory containing main file.
* `int` - convert string to number and round it.
* `float` - convert string to number.
* `bool` - convert string to boolean, see *[Boolean value](attributes.md#boolean-value)*.
* `enum` - use docx.js API enum to convert or verify the value. The input is `EnumName:value`.
* `color` - convert string to color, see *[Hex color value or color name](attributes.md#color)*.
* `json` and `json5` - parse input string as JSON5.
* `first` - return first element of input array. Can be useful if you want to create just one element from normal context within API context.
* `emptyArray` - return empty array. The array syntax described above does not allow empty arrays. Use this filter instead.
* `emptyObject` - return empty object. The object syntax described above does not allow empty objects. Use this filter instead.
* `base64` - decode base64 string to `Uint8Array`.