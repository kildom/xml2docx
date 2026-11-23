# Conformance report for `<%= runnerName %>` runner

## <%= counts.failed === 0 ? 'SUCCESS' : 'FAILED' %>

## Test cases

- Failed: **<%= counts.failed %>**
- Success: **<%= counts.success %>**
- Total: **<%= counts.total %>**

Case files are under `<%= outputDirectory %>/`. Use the ID shown for each test case to locate its files:

- `<%= outputDirectory %>/<id>.doctml` — test source
- `<%= outputDirectory %>/<id>.json` — metadata, coverage, run status, and errors
- `<%= outputDirectory %>/<id>-data.json` — template input data, when supplied
- `<%= outputDirectory %>/<id>.docx` — generated DOCX, when produced
- `<%= outputDirectory %>/<id>.pdf` — PDF converted from DOCX, when produced
- `<%= outputDirectory %>/<id>.html` — converted HTML source, when produced
- `<%= outputDirectory %>/<id>.png` — combined PNG preview, when produced
- `<%= outputDirectory %>/<id>.debug.*` — debug files, when produced (for example `rendered.doctml`, `normalized.doctml`, `processed.doctml`, or `json`)

<% for (const testCase of reportCases) { %>
### Test case `<%= testCase.id %>`

Result: **<%= testCase.success ? 'SUCCESS' : 'FAIL' %>**  
File: [<%= testCase.inputBaseNameMd %>](<%= testCase.inputHref %>)  
Line: <%= testCase.inputLine %>

Coverage:
<%= testCase.coverage.map(item => `- ${item.label}: ${item.title}`).join('\n') %>

<% if (testCase.matchedExpectedErrors.length > 0) { %>
Expected errors:

<%= testCase.errorFence %>text
<% for (const message of testCase.matchedExpectedErrors) { %><%= message %>
<% } %><%= testCase.errorFence %>
<% } %>
<% if (testCase.unexpectedErrors.length > 0) { %>
Unexpected errors:

<%= testCase.errorFence %>text
<% for (const message of testCase.unexpectedErrors) { %><%= message %>
<% } %><%= testCase.errorFence %>
<% } %>
<% if (testCase.missingExpectedErrors.length > 0) { %>
Expected errors that did not happen:

<%= testCase.errorFence %>text
<% for (const message of testCase.missingExpectedErrors) { %><%= message %>
<% } %><%= testCase.errorFence %>
<% } %>
<% } %>
## Input files

| Input file | Failed | Success | Total |
| --- | ---: | ---: | ---: |
<%= inputGroups.map(input => input.tableRow).join('\n') %>

## Coverage

Tag rows count cases that directly cover the tag. Attribute-specific cases are counted only in their attribute row.

| Tag / attribute | Description | Failed | Success | Total |
| --- | --- | ---: | ---: | ---: |
<%= coverageRows.map(row => row.tableRow).join('\n') %>
