
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

* CI for PRs:
  * Compare visually the test results using following flow: 
    `xml  --xml2docx-->  docx  --docx2pdf.py-->  pdf  --GhostScript-->  png  -->  compare script`
  * For each test xml generate following variants:
     * **old** = old commit + old test xml
     * **comp** = new commit + old test xml
     * **new** = new commit + new test xml
  * old != comp - failure or backward compatibility broken - report 
    as error, but still merging possible after manually ensuring that
    this was intentional back compatibility break.
  * old != new - some changes in the tests that does not break 
    compatibility - report warning to verify the new content.
  * else old == comp == new - everything ok, nothing to do
