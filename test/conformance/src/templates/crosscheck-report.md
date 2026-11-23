# Conformance crosscheck

## Runners

| Runner | Exit code |
| --- | ---: |
<%= runnerRows.map(runner => `| ${runner.name} | ${runner.exitCode} |`).join('\n') %>

## Test cases

- SUCCESS and MATCH: **<%= counts.success %>**
- FAILED or MISMATCH: **<%= counts.failed %>**
- TOTAL: **<%= counts.total %>**

<% for (const testCase of cases) { %>
### `<%= testCase.id %>` — <%= testCase.issue ? 'FAILED or MISMATCH' : 'SUCCESS and MATCH' %>

File: `<%= testCase.inputFile %>` · line <%= testCase.inputLine %>

Coverage:
<%= testCase.coverage.map(item => `- ${item.attribute ? `${item.tag}.${item.attribute}` : item.tag}: ${item.title}`).join('\n') %>

<% if (testCase.issue) { %>
| Runner | Status | Matching |
| --- | --- | --- |
<%= testCase.runners.map(runner => `| ${runner.name} | ${runner.status} | ${runner.matching} |`).join('\n') %>
<% } else { %>
All runners succeeded and matched.
<% } %>

<% } %>
