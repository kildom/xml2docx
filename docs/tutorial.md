# Tutorial

## Empty document

Let's start with an empty document.
The input file is an XML with a [`<document>`](#document.md#document)
element on top, so put it to the file and call it `hello.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<document>
    
</document>
```

If you are using a [web interface](https://kildom.github.io/xml2docx/),
just put the code in the `hello.xml` file and click `Download document`
button. Open downloaded file to see the result.

If you are using command line, generate `hello.docx` output with
the following command:
```sh
xml2docx hello.xml
```

## Paragraph

Any text in the document must be placed inside paragraphs ([&lt;p> tag](paragraph.md#p)).


```xml
<?xml version="1.0" encoding="UTF-8"?>
<document>
    <p>
        Hello World!
    </p>
</document>
```

You can manipulate style of the paragraphs using its attributes.
Refer the [&lt;p> tag](paragraph.md#p) documentation for a full list of
attributes. For example, `align` attribute controls the paragraph alignment.

```xml
<p align="center">
    Hello World!
</p>
```

You can break a line without starting a new paragraph using the `<br/>` tag.

```xml
<p>
    Hello<br/>World!
</p>
```

## Paragraph attributes preservation

Useful feature of the paragraphs is a `preserve` attribute.
Setting this attribute to `true` will reuse the same attributes in
following paragraphs until paragraph with any attribute is reached.
For example:


```xml
<p align="center">
    Centered.
</p>
<p>
    Back to left-alignment.
</p>
<p align="center" preserve="y">
    Centered again, but this time we use "preserve" attribute.
</p>
<p>
    This is also centered since attributes are copied from
    the previous paragraph.
</p>
<p>
    And centered again.
</p>
<p background="yellow">
    Not centered any more because this paragraph has some attributes.
</p>
```

## Tabulators

Use tabulators to align text within paragraphs in table-like structure.
Each paragraph defines its own set of tabulator stops using `tabs` attribute.

```xml
<h1>Table of contents</h1>
<p tabs="1cm right, 1.3cm, 15cm dot right" preserve="y">
    <tab/>1.<tab/>Table of contents<tab/>1
</p>
<p>
    <tab/>2.<tab/>Introduction<tab/>2
</p>
<p>
    <tab/>3.<tab/>Content<tab/>4
</p>
```

Each tabulator stop contains distance (required), alignment (optional,
left by default) and leader sign (optional, none by default).

You can add tabulators to text using:
* actual tabulators character,
* `&#9;` symbol entity,
* `<tab/>` element.

## Sections

A section is a set of pages with specific size, style, headers, e.t.c.
You can start a section by putting a [`<section>`](document.md#section)
element inside `<document>`. If you start any content before `<section>`,
a new default section will be created.

We will put our a document on landscape A5 paper with 1 cm margins:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<document>
    <section
        margin="1cm"
        width="148mm" height="210mm"
        orientation="landscape"
    />
    <p>Hello World!</p>
</document>
```

## Margins

A `margin` attribute defines four margins separated by spaces or commas.
The order is "top", "right", "bottom", "left" (similar to CSS).
In other words, the order is clockwise starting from 12 o'clock.
If you specify less values, the order is following:
* one value: "all four margins"
* two values: "top and bottom", "right and left",
* three values: "top", "right and left", "bottom".

For example, if you want `2 cm` margins on top and bottom, and
`1 cm` margins on left and right:

```xml
<section margin="2cm 1cm"/>
```

The same rules apply to margins and borders in other tags.

## Header and footer

The header and footer are added to `<document>` element in the
[`<header>`](document.md#header-footer) and [`<footer>`](document.md#header-footer).
They are assigned to recent section.


```xml
<?xml version="1.0" encoding="UTF-8"?>
<document>
    <header>
        <p>Page <page-number/> of <total-pages/></p>
    </header>
    <p>Hello World!</p>
    <p page-break="y">Next page</p>
</document>
```

The `<page-number/>` and `<total-pages/>` elements put fields
showing current page number and total pages respectively.
They can be used only in header and footer.

If you want to have different header or footer on the first page,
you have two options.

1. Create separate section for the first page.
   
    ```xml
    <section/>
    <title>First page</title>
    <section/>
    <footer>
        <p>Page <page-number/> of <total-pages/></p>
    </footer>
    <p>Next page in a new section.</p>
    ```

2. Use `page="first"` attribute.
   
    ```xml
    <footer page="first"></footer>
    <footer>
        <p>Page <page-number/> of <total-pages/></p>
    </footer>
    <title>First page</title>
    <p page-break="y">Next page in the same section.</p>
    ```

## Text formatting

You can change text format with the [`<font>`](format.md#font) tag.
It has numerous attributes controlling the format.

```xml
<p>
    <font face="Arial" color="green">Hello</font>
    <font face="Times New Roman" bold="y">World</font>!
</p>
```

Commonly used styles that have boolean (true/false) values are available
as shorthand, e.g. [`<b>`, `<i>`, `<u>`](format.md#b-i-u-).

```xml
<p>
    Hello <b>World</b>!
</p>
```

## Tables

Tables must be put on the same level as paragraphs.
They cannot be inside paragraphs.

Table structure is similar to HTML, but limited to 
[`<table>`](table.md#table), [`<tr>`](table.md#tr) (table row) and 
[`<td>`](table.md#td) (table cell) tags.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<document>
    <table>
        <tr><td>Name:</td><td>John Smith</td></tr>
        <tr><td>Job:</td><td>Plumber</td></tr>
    </table>
</document>
```

This will create an "auto-fit" table which means that column sizes
are automatically determined based on the content.
You can provide `column-widths` attribute to have "fixed" table.

```xml
<table column-widths="3cm 4cm">
    <tr><td>Name:</td><td>John Smith</td></tr>
    <tr><td>Job:</td><td>Plumber</td></tr>
</table>
```

Or, you can set width of entire table and allow column to be adjusted accordingly. The width can be also in percentage.

```xml
<table width="100%">
    <tr><td>Name:</td><td>John Smith</td></tr>
    <tr><td>Job:</td><td>Plumber</td></tr>
</table>
```

## Images

Images can be added to the `<p>` element using the [`<img>`](image.md#img) tag.
You have to provide at least `src`, `width` and `height` attributes.

```xml
<p>
    <img src="globe.png" width="1cm" height="1cm"/> - this is globe icon.
</p>
```

By default it is placed inside text as any other character.
You can create "floating" images with the `horizontal` and `vertical`
attributes which controls vertical and horizontal positioning respectively.

First value inside `horizontal` and `vertical` attributes is archon,
which tells what is the object from we are calculating the positioning.
Second is an offset or alignment. Offset tells what is the distance
of image from the archon. Alignment tells how image should be aligned
relative to archon.

For example, the following image will be centered horizontally
on the page and 1 cm above beginning of current paragraph.

```xml
<p>
    <img src="globe.png"
        width="10cm" height="10cm"
        horizontal="page center" vertical="paragraph -1cm"
    />
    This is a text in the same paragraph.
</p>
```