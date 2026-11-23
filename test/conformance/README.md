# Conformance Tests

This is most comprehensive tests of DocTML.

TODO: Detailed description of Conformance Tests


## Level of tests

The tests have different entry point depending on level of testing that need to be done:

- `src/test-runner-<name>.ts` - Test all input files with runner specified by `<name>`. 
  It writes runner outputs to `artifacts/test/conformance/runner-{runner-name}/` and its report to
  `artifacts/test/conformance/runner-{runner-name}.html`.
  Returns:
  - 0 - no issues were found
  - 4 - failure in any of the tests
  - other - unexpected error

- `src/test-crosscheck.ts` - Run selected runners and compare their normalized DOCX contents.
  Each runner is executed in a new process of its `src/test-runner-<name>.ts` script. By default all runners
  are used; runner names can be supplied as arguments. Only the first runner performs output conversion;
  subsequent runners run with `--only-docx`. Pass `--only-docx` to skip output conversion for all runners.
  Each runner generates a report at `artifacts/test/conformance/runner-{runner-name}.html` and
  `artifacts/test/conformance/runner-{runner-name}.md`. The crosscheck writes an interactive report to
  `artifacts/test/conformance/crosscheck-report.html` and a concise Markdown report to
  `artifacts/test/conformance/crosscheck-report.md`. Differences are saved beside the corresponding test cases.
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

## Single-runner tests

A single-runner script executes every generated conformance case using one implementation of DocTML. The runner owns only the execution-specific work; case parsing, result validation, output conversion, and report generation are shared.

### Script responsibilities

- [`src/case-parser.ts`](./src/case-parser.ts) defines `TestCase`, discovers the `.doctml` inputs under `test/conformance/inputs/` and the generated documentation examples at `artifacts/test/conformance/docs/tests.doctml`, then saves one case per annotated XML comment. The text before the first case and after `END` is shared by each case. Comment lines describe tag or attribute coverage (`tag:` / `tag.attribute:`), expected errors (`ERROR:`), and template values (`DATA:`). A sibling `.json` file provides base template data; inline `DATA` values override it. The output directory is reset before use, shared `include/` assets are copied into it, and each case gets metadata, source, and optional data files.
- [`src/test-runner-cli.ts`](./src/test-runner-cli.ts) is the CLI runner example. It checks for the platform-specific binary (build it with `npm run build-cli` if missing), then runs the CLI once per case with `--debug`, `-d`, the case source, and the output DOCX path. When a case has no data file, it passes the copied `include/empty.json`. A runner should record the raw `runStatus` and append each raw error as `{ message }` to `testCase.errors`; shared finalization handles interpretation.
- [`src/test-runner-api.ts`](./src/test-runner-api.ts) imports `src/doctml.ts` and invokes `generate` directly for every case, using the same input/data files, debug outputs, and shared report finalization as the CLI runner.
- [`src/test-runner-cjs.ts`](./src/test-runner-cjs.ts) and [`src/test-runner-esm.ts`](./src/test-runner-esm.ts) build and pack the package, install it in an isolated workspace, then run each case through Node.js using its CommonJS or ESM package entry point.
- [`src/runners-common.ts`](./src/runners-common.ts) provides `finalizeRunner`. It checks execution status and DOCX outputs, verifies declared tag/attribute coverage against `artifacts/test/conformance/docs/tags.json`, optionally converts outputs, normalizes error messages and matches them against expected errors, saves updated metadata, and writes the interactive report. A failed case sets the process exit code to `4` unless a larger exit code is already set. The report template is [`src/templates/runner-report.html`](./src/templates/runner-report.html).
- [`src/pdf2png.ts`](./src/pdf2png.ts) creates the combined PNG preview from a PDF. DOCX-to-PDF/HTML conversion is shared through [`scripts/common/docx2pdf.ts`](../../scripts/common/docx2pdf.ts).

### Running the CLI runner

Run commands from the repository root. Build documentation first if `artifacts/test/conformance/docs/tests.doctml` is missing. The CLI runner exits with code `10` if its binary is unavailable.

```sh
npm run build-docs
npm run build-cli
npx tsx test/conformance/src/test-runner-cli.ts
```

Run the direct API runner without building the CLI binary:

```sh
npx tsx test/conformance/src/test-runner-api.ts
```

Test both installed package module formats (these runners build and pack the package themselves):

```sh
npx tsx test/conformance/src/test-runner-cjs.ts --only-docx
npx tsx test/conformance/src/test-runner-esm.ts --only-docx
```

To generate DOCX files and debug output without PDF, HTML, or PNG conversion, pass `--only-docx`:

```sh
npx tsx test/conformance/src/test-runner-cli.ts --only-docx
```

If LibreOffice is available, set `DOCX_CONVERT_SOFFICE=soffice` to enable DOCX-to-PDF/HTML conversion on platforms where local Microsoft Office conversion is unavailable:

```sh
DOCX_CONVERT_SOFFICE=soffice npx tsx test/conformance/src/test-runner-cli.ts
```

The runner writes case files and outputs under `artifacts/test/conformance/runner-{name}/` (including the shared `include/` files). The self-contained interactive report is written beside that directory as `artifacts/test/conformance/runner-{name}.html`. A Markdown summary for agents is written next to it as `artifacts/test/conformance/runner-{name}.md`; it links to the interactive report and to per-case artifacts. The HTML report contains result counts and filters, per-input summaries, coverage rows, error details, source/debug tabs, and links or previews for generated outputs when those files exist.

### Adding or changing a runner script

Use the CLI runner as the execution pattern rather than changing case parsing. Give the runner a unique name and obtain its output directory with `getRunnerDirectory(name)`. After `createTestCases(dir)`, execute each case and populate `runStatus` and raw `errors`; do not normalize or match expected errors in the runner. Catch per-case execution failures and record them as error messages so other cases can continue. Finally, await `finalizeRunner(name, dir, Object.values(testCases))` so all runners share the same coverage checks, status rules, output conversion, and report format. The `TestCase` fields and file helpers are documented in [`src/case-parser.ts`](./src/case-parser.ts).

