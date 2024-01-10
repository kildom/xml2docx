# gen-docs.ts

The `gen-docs.ts` script automatically generates tags and attributes documentation
based on special comments in the source code.

The special comments are organized into hierarchical structure:
 * *Entry* - top level structure that describes one tag, function, filters, e.t.c.
   Contains list of *items* and *notes*.
 * *Item* - contained in the *entry*, describes an attribute.
 * *Note* - a pice of text that can be placed between attributes.

## Entry

The entry is declared in the following comment:

```javascript
/*>>> unique_entry_name: short description
Entry long description.
*/
function functionName(...) ...
```

* `unique_entry_name` *(optional)* is the name of the entry.
  If missing, the function name below the comment will be used.
* `short description` *(optional)* is a short description. For
  attribute filters is a string that will be shown as attribute
  value: `attr="short description"`.
* `Entry long description.` *(optional)* is multiline entry description.

## Item

The item is declared in the following comment. It is added to last entry.

```javascript
//* "short description" Item long description.
... = attributes.attributeName;
```

* `short description` *(optional)* is a short description. For
  attributes is a string that will be shown as attribute
  value: `attr="short description"`.
* `Item long description.` is entry description.

The line of code following the comment is used to deduce:
* attribute name
* if it is required or not based on `!.` operator or `requiredAttribute` function.

## Note

The note is placed with the following comment:

```javascript
/*> Note text. */
```

## Commands

The text in the comments can use commands. The command format is:

```
@commandName:commandParameters
```

The `commandParameters` are optional.

### List of commands

* `@api` - link to `docx.js` API.
* `@api:path` - link to specific file in the `docx.js` API.
* `@enum:enumName1+enumName2+...` - adds list of items in one or more enums.
* `@short:entryName` - adds short description of specified entry.
* `@merge:entryName` - merge specified entry to this one. Merging:
  * add source items and notes at the end of current entry,
  * takes short description from source entry if it does not exist in current entry.
  * places description from source entry at the command invocation.
* `@merge:entryName|param1|param2|...` - the same as above, but with parameters
  accessible from source entry as `@...@` command.
* `@...` (where `...` is entry name) - you can use entry as a command in item.
  Used mostly for filters.
  It will:
  * put its description here,
  * put its items and notes as subitems here,
  * use its short description as current item short description.
* `@...:param1|param2|...` - the same as above, but with parameters
  accessible from specified entry as `@...@` command.
* `@@` - deduce filter name from the code below item and use it as a command,
  see command above.
* `@...@` (where `...` is a digit from `0` to `9`) - put here parameter passed
  when invoking this entry as a command or merging it.

## Markdown placement

The entry is placed in markdown file with following comments:

```html
<!-- >>> entryName -->
... the script will replace text between those comments ...
<!-- <<< -->
```