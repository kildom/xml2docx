# xml2docx

A tool for creating `.docx` files from templates.

The input consist of two files:
* One is an XML file template. Its format is described below.
  It contains templating placeholders written in JavaScript.
* Second is a JSON file or an XML file that contains data for the templating engine.

> ### WARNING
>
> The input files contains a JavaScript code that is executed without
> restrictions. You must trust the files in order to use them with this tool.

## XML File Format

The tool is based on [docx.js](https://docx.js.org/).
The file format is an XML representation of its [API](https://docx.js.org/api/)
with some additions that makes it look a little like HTML.

### XML Syntax

#### General syntax

The interfaces are described using XML elements and attributes.
For example, `ParagraphStyle` element uses [`IParagraphStyleOptions`](https://docx.js.org/api/interfaces/IParagraphStyleOptions.html).
It can be expressed as following XML element:
```xml
<ParagraphStyle id="centered" name="Centered text">
    <paragraph>
        <alignment>center</alignment>
        <indent firstLine="1cm"/>
    </paragraph>
<ParagraphStyle>
```

The interface properties can be represented as both attribute or child element. For example, the following element:
```xml
<paragraph>
    <alignment>center</alignment>
</paragraph>
```
is the same as:
```xml
<paragraph alignment="center"/>
```

#### Filters

XML attributes and elements can only hold strings. The API requires varius
types of data and units. You can filter the attributes and elements values by
adding `:` and filter name. For example, the attribute `italics:bool="y"` will
convert `"y"` string into `true` value of boolean type and assign it the the
`italics` property.

Available filters:
 * `:int` - convert string to integer,
 * `:bool` - convert string to boolean, possible values are:
   `true/false`, `t/f`, `yes/no`, `y/n`, `1/0`, `on/off`
 * `:file` - convert file path (relative to input XML file) to buffer containing its contents.
 * `:json` - parse JSON string.
 * units converter - convert a distance (in `cm`, `mm`, `in`, `pt`, `pc`) to any of the following units:
    * `:pt` - point
    * `:pt3q` - 3/4 of point
    * `:pt8` - 1/8 of point
    * `:pt20` - 1/20 of point (DXA)
    * `:dxa` - 1/20 of point (DXA)
    * `:emu` - 1/360000 of centimeter (EMU - English Metric Unit)
 * other filter described below: `alias`, `new`, `FileChildren`, `ParagraphChildren`.

Some examples of filters:
```xml
<borders>
    <pageBorderTop style="single" size:pt8="0.52mm" space:pt="1cm" />
</borders>
```

```xml
<ParagraphStyle>
  <run size="22pt" bold:bool="true" />
</ParagraphStyle>
```

```xml
<margins marginUnitType="dxa" top:dxa="1cm" bottom:dxa="2cm"
    left:dxa="1cm" right:dxa="1cm" />
```

#### Arrays

Array items are created with the `<_>` element, for example:

```xml
<tabStops>
    <_ position:dxa="1cm" type="left" />
    <_ position:dxa="10.5cm" type="center" />
    <_>
        <position:dxa>17cm</position:dxa>
        <type>right<type>
    </_>
</tabStops>
```

If you want empty array, you can use the following instruction:
```xml
<tabStops>
    <%empty%>
</tabStops>
```

#### New objects

To assing new object of specific class from docx.js API, you can use
`ClassName:new` element. Content of the element is passed to the
constructor as the first parameter, for example:

```xml
<Section>
    ...
    <headers><default>
        <Header:new>
            <children>...</children>
        </Header:new>
    </default></headers>
</Section>
```


#### Aliases

On document level, you can define an alias which can be later used
inside other element.


The `<element _="alias_id">` syntax takes all properties from alias `alias_id` and moves them into element, for example:

```xml
<Alias id="noHorizontalBorder">
    <borders>
        <top style="nil" />
        <bottom style="nil" />
    </borders>
</Alias>

<table>
<tr>
    <td _="noHorizontalBorder"><p>Hello World!</p></td>
</tr>
</table>
```

The `<element attr:alias="alias_id">` syntax sets `attr` property of `element` to value defined by the alias `alias_id`.

```xml
<Alias id="border">
    <bottom size:pt8="0.25mm" space:pt="5mm" style="single" />
</Alias>

<p border:alias="border">Hello World!</p>
```

#### Contexts

Depending on context, elements have different meanings:

* Document context - children of top level `<document>` element, only few
  elements are allowed in this context:
    `<ParagraphStyle>`,
    `<CharacterStyle>`,
    `<Alias>`,
    `<Section>`, and all from "Paragraphs context".
  ```xml
  <document>
      <!-- We are in document context. -->
      <Section>
          ...
      </Section>
      ...
  ```

* Paragraphs context - children of elements expecting paragraphs, e.g. `<td>`,
  only few elements are allowed in this context:
    `<p>`,
    `<h1>`...`<h9>`,
    `<table>`,
    `<Paragraph>`,
    `<Table>`,
    `<TableOfContents>`.
  ```xml
  <table><tr><td>
      <!-- We are in paragraphs context. -->
      <p>Hello</p>
      ...
  ```

* Text context - children inside `<p>` element.
  ```xml
  <p>
      <!-- We are in text context. -->
      Hello <b>World</b>!!!
  </p>
  ```

* Interface context - children describes properties of an interface
  of the docx.js API.
  ```xml
  <ParagraphStyle>
      <!-- We are in interface context. -->
      <run size="22pt" bold:bool="true" />
  </ParagraphStyle>
  ```

If you want to switch context to text or paragraph context, you can use
`:ParagraphChildren` or `:FileChildren`, for example:

```xml
<Section>
    ...
    <headers><default>
        <Header:new>
            <children:FileChildren>
                <h1>Hello,</h1>
                <p>how are you?</p>
            </children:FileChildren>
        </Header:new>
    </default></headers>
</Section>
```


### Elements

The top level element is `<document>`:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<document>
    ...
</document>
```

#### Document context

* **`<Section>`** - Start a section (group of pages).
  At least one section at the beginning of document is required.
  Content is [ISectionOptions](https://docx.js.org/api/interfaces/ISectionOptions.html).
* **`<ParagraphStyle>`** - Add paragraph style to the document.
  Content is [IParagraphStyleOptions](https://docx.js.org/api/interfaces/IParagraphStyleOptions.html).
* **`<CharacterStyle>`** - Add character stype to the document.
  Content is [ICharacterStyleOptions](https://docx.js.org/api/interfaces/ICharacterStyleOptions.html)
* **`<Alias>`** - Define an alias (described above).

#### Paragraphs context

* **`<p>`** - Paragraph. Attributes are [IParagraphOptions](https://docx.js.org/api/interfaces/IParagraphOptions.html), the content is "text context".
* **`<h1>`...`<h9>`** - The same as paragraph, but sets `style` to `Heading1`...`Heading9`.
* **`<table>`** - A table. Attributes are [ITableOptions](https://docx.js.org/api/interfaces/ITableOptions.html), children are `<tr>` elements (rows).
* **`<Paragraph>`** - [Paragraph](https://docx.js.org/api/classes/Paragraph.html) class.
* **`<Table>`** -  [Table](https://docx.js.org/api/classes/Table.html) class.
* **`<TableOfContents>`** -  [TableOfContents](https://docx.js.org/api/classes/TableOfContents.html) class.

> TODO: Finish and fix the documentation!!!
