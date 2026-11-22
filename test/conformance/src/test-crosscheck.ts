

/*

1. Run `test-runner.ts` for each runner. Do conversion only for first runner.

2. Compare docx files for each runner. If differences detected in single test case:
  - create diff between first runner and others using internal docx XML representation

  Diff written in `artifacts/test/conformance/runner-{runner-name}/{case-id}-{first-runner-name}-docx.diff`

3. Create report with:
  - list of runner with:
    - runner status
    - link to runner report
  - list of test cases with:
    - comparison status with diff if difference detected
    - diff of internal docx XML representation between first runner and others that does not match
    - links to test cases in runners report
    - test status for each runner

*/