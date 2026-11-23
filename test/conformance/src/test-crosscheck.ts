

/*

Keep this description as future reference.

1. Run `test-runner-<name>.ts` for each runner. Do conversion only for first runner.
   Rest of the runners will have `--only-docx` option.
   Keep the exit code for later.
   By default all runners from `runnersList` will be executed. If arguments provided,
   execute just runners from the arguments. This script will also accept `--only-docx`
   option - if specified, the first runner will also run with `--only-docx` option.

2. For each test case, where docx was produced, uncompress content of docx file into
   text representation. The decompression is following:
   - for each decompressed ZIP entry detect file type by extension (case insensitive):
     - xml, rels - XML file (also file name starting with dot `.rels` is considered XML)
     - jpeg, jpg, png, gif, bmp, svg - Binary file (yes, even SVG is treated as binary here)
     - odttf or ttf - Font file
     - if unknown extension, do detection by content:
       - if it converts to string using UTF-8 encoding without errors (`new TextDecoder("utf-8", { fatal: true }).decode(bytes);`) and starts with `<?xml ` (after skipping any leading whitespace), consider it as XML file
       - if it contains at least 6 of those strings at the first 512 bytes (`new TextDecoder("utf-8", { fatal: false }).decode(bytes);`), consider it as Font file: `OS/2`, `VDMX`, `cmap`, `cvt `, `fpgm`, `glyf`, `hdmx`, `head`, `hhea`, `hmtx`, `kern`, `loca`, `maxp`, `name`, `post`, `prep`
       - otherwise, consider it as Binary file
   - convert file content to text representation based on detected type:
     - XML file - keep as UTF-8 string and format XML using `xml-formatter` module (install if not available as dev dependency)
     - Binary file - calculate sha256 hash
     - Font file - calculate sha256 hash of the file content starting from the byte offset 32. First 32 bytes may be scrambled, so we must skip them.
   - skip directory entries
   - sort files by their file names (full path).
   - combine all text representations into a single string. Each file will start with header:
     ```
     ----------------------------------------------------------------
     {file-path}
     ----------------------------------------------------------------
     ```
   - replace text patterns that may vary between runs:
     - timestamps: `/[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}[.0-9Zz:+-]/g` replace with `--TIMESTAMP--`
     - UUIDs: `/[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}/gi` replace with `00000000-0000-0000-0000-000000000000`
   - write this text into `.docx.txt` file for corresponding test case - `testCase.getOutputFile('docx.txt')`
   You can see `test/conformance/__old_src/docx-compare.ts` for decompression example,
   but it is old implementation.

3. For each test case, where docx was not produced, write `.docx.txt` file depending on the test case result:
   - failed test case: `FAILED`
   - success test case: `SUCCESS`

4. Generate diff using `git diff` command between `.docx.txt` of first runner and other runners for each test case.
   Write the diff output to the file obtained by `testCase.getOutputFile('diff')`. Compare always test case from first runner with matching (by id) test case from other runners and save diff for other runners.
   Keep `git diff` command exit code to see if differences were detected. If files are identical, remove diff file. If exit code is non-zero, but diff does not exists or it is empty, create diff file with "Exit code <exit-code>" text.
   There can be missing test cases for some runners, then use following approach:
     - if a test case is missing in first runner, assume that `.docx.txt` is empty and use empty file for comparison.
     - if a test case is missing in other runners, compare `.docx.txt` from first runner with an empty file and write the diff to the first runner. This is an exception from rule that diff is saved only for other runners.

5. Create a report similar to single runner report with following content:
  - table of runners with:
    - runner name
    - link to runner report
    - runner exit code, if non-zero, mark entire row in red
  - list of test cases. The list is preceded by counters that also work as filters (like in single runner report): `SUCCESS and MATCH`, `FAILED or MISMATCH`, `TOTAL`.
    - coverage, input file, input line, test id - like in single runner report
    - list of runners. This is skipped if list has no FAILED status or MISMATCH matching status. Each runner entry contains:
      - runner name with link to runner report of this test case
      - runner status of this test case: FAILED or SUCCESS
      - matching status: MATCH (diff does not exists) or MISMATCH (diff exists)
      - expandable diff (as code block) if matching status is MISMATCH (collapsed by default)
      - mark row in red if runner status is FAILED or matching status is MISMATCH
    - mark this test case card in red if any runner has FAILED status or any matching status is MISMATCH

*/