
* // TODO: In debug mode, generate JS file that creates document using docx.js API.
  Creating a new object: obj = new docx.SomeClass(...args); obj[constructInfoSymbol] = { className: 'SomeClass', args }

* // TODO: Filters for multiline text:
   * trim, remove new lines and replace repeating whitespace
   * removes common indentation and trim

* // TODO: Special type of element ":attr", that works similar to ":property", but adds string value to attributes.
  Useful for multiline attributes and attributes with CDATA.

* // TODO: reconsider renaming ":property" (maybe also ":attr")

* // TODO: Simplify sections, footers, headers, styles by adding new tags for it.
  header and footer can have attribute that tells if it is just for first page in section.

* // TODO: Check if docx.js allows reusing the same image data
