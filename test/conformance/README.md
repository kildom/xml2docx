# Conformance Tests

This is most comprehensive tests of DocTML.

TODO: Detailed description of Conformance Tests


## Level of tests

The tests have different entry point depending on level of testing that need to be done:

- `src/test-runner-<name>.ts` - Test all input files with runner specified by `<name>`. 
  It generates report in `artifacts/test/conformance/runner-{runner-name}/report.html`.
  Returns:
  - 0 - no issues were found
  - 4 - failure in any of the tests
  - other - unexpected error

- `src/test-crosscheck.ts` - Test all input with multiple runners as compare the outputs.
  Each runner is executed in a new process of `src/test-runner.ts` script.
  By default all runner will be used. You can provide which runners to run by providing them in arguments.
  For each runner, it generates report in `artifacts/test/conformance/runner-{runner-name}/report.html`.
  The scripts compares results of all runners. If difference if found, the test fails.
  Report with comparison between runners is in `artifacts/test/conformance/crosscheck-report.html`.
  Returns:
  - 0 - no issues were found
  - 3 - comparison error (some runners produce different output)
  - 4 - failure in any of the tests
  - other - unexpected error

- `src/test-regression.ts` - Test regression. First argument provides git commit reference in
  the past. Current state of workspace will be compared with provided commit.
  It creates temporary workspace from provided commit. It runs `src/test-crosscheck.ts` for both
  current workspace and temporary workspace and places the results from temporary workspace in
  `artifacts/test/conformance/old/`. It compares test outputs between those two versions and
  produces report in `artifacts/test/conformance/regression-report.html`.
  You can specify list of runner after the commit reference argument to limit runner under test.
  Return 0 if no issues were found, 2 for test failure in any of the runners, 3 for comparison error
  (some runners produce different output), other value on unexpected error.
  Returns:
  - 0 - no issues were found
  - 1 - regression warnings reported - regression report requires user attention,
    but not necessary an error
  - 2 - regression errors reported
  - 3 - comparison error (some runners produce different output)
  - 4 - failure in any of the tests
  - other - unexpected error

Runner is a way to execute DocTML tool, for example:
- execute from CLI
- import API and call API functions directly
- execute webpack and build web application that runs in browser
