# Templates

When you using JSON5 data file input, the XML file becomes a template.
You can use JavaScript expressions and statements there.

## Data file

The data file is a file containing [JSON5](https://json5.org/).
The JSON5 format is an extension to standardized [JSON](https://www.json.org/) format.
The JSON5 is backward compatible with it.

Example JSON5 file:

```js
{
    /* "text" is a string */
    text: "What would you like to eat?",

    /* "formattedText" contains some XML tags. */
    formattedText: "What <b color=\"red\">snacks</b> do you want?",

    /* "fruit" is an object with an apple details. */
    fruit: {
        name: "Apple",
        size: "Large",
        color: "Red",
        pieces: 4,
    },

    /* "snacks" is an array of stack names. */
    snacks: [ "Popcorn", "Chocolate", "Crisps" ],
}
```

## Interpolate `<% … %>, <%= … %>`

You can place some data in the document by interpolating it with the `<% … %>`.

All the following examples uses sample data file from section above.

```xml
<p>Max: <% text %></p>
<p>Zoe: <% fruit.size %> <% fruit.color %> <% fruit.name %>.</p>
```

You can put any JavaScript expression int the `<% … %>`.

```xml
<p>Max: How many pieces?</p>
<p>Zoe: I want <% fruit.pieces %> piece<% (fruit.pieces != 1) 's' : '' %>.</p>
```

The `<% … %>` interpolation do XML-escaping, which means that you cannot add
any XML in it. If it is not your intention, you can use interpolation without
escaping `<%= … %>`.

```xml
<p>Max: <%= formattedText %></p>
```

## Execute `<%! … %>`

You can execute a JavaScript statement without interpolating.
It is useful for `if`, `for`, e.t.c.

```xml
<p>Zoe: <%! for (let snack of snacks) { %>
            <% snack %>,
        <%! } %>
        and that's all.</p>
```

## Utils

Except data from your data file, you have also access to `utils` object.

It contains some utility properties and functions:

* `utils.templateFile` - path to current template file,

* `utils.templateDir` - path to directory containing current template,

* `utils.dataFile` - path to data file,

* `utils.data` - your data file as an object,

* `utils.include(file: string): string` - a function that reads and executes another
  template file and returns result as a string. File path is relative to `templateDir`.

  You can use it to add plain text from a file using escaped interpolation.

  `<% utils.include("my_file.txt") %>`

  Or, you can add another XML file using interpolation without escaping.

  `<%= utils.include("my_file.xml") %>`

If your data file overrides `utils` object, you can use alias name `__utils__`.
