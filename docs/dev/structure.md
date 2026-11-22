# Project file structure

This guide maps the main source, documentation, test, and generated-output areas. The root [README.md](../../README.md) is the project overview.

## Maintained project files

- [`src/`](../../src/) — TypeScript implementation of DocTML. Its top-level modules handle document conversion, translation, templates, styles, shared context, and enums.
  - [`attrs/`](../../src/attrs/) — definitions for supported XML attributes.
  - [`tags/`](../../src/tags/) — implementations of DocTML document elements.
  - [`cli/`](../../src/cli/) — command-line entry points and helpers.
  - [`utils/`](../../src/utils/) — shared parsing and file utilities.
- [`docs/`](../) — user-facing documentation sources. Markdown describes features and usage; YAML files provide structured tag, attribute, enum, and example definitions for the documentation generator.
  - [`img/`](../img/) — images used by the documentation.
  - [`dev/`](./) — contributor documentation, including this guide.
- [`scripts/`](../../scripts/) — build, documentation-generation, release-support, and development utilities.
  - [`common/`](../../scripts/common/) — helpers shared by scripts.
  - [`gen-docs/`](../../scripts/gen-docs/) — documentation generator and templates. See its [README](../../scripts/gen-docs/README.md) for details.
  - [`resources/`](../../scripts/resources/) — resources used by scripts.
  - `__old/` — retained legacy tooling.
- [`test/`](../../test/) — API, CLI, macro, template, and conformance tests, plus test fixtures. See the [test README](../../test/README.md).
  - [`template/`](../../test/template/) — tests and data fixtures for template behavior.
  - [`conformance/`](../../test/conformance/) — input documents and runners for regression and cross-runner checks; see its [README](../../test/conformance/README.md).
  - [`docker-helper/`](../../test/docker-helper/) — DOCX conversion helper for testing; see its [README](../../test/docker-helper/README.md).
- [`package.json`](../../package.json) — dependencies and npm scripts for checking, testing, building the CLI/API, and generating docs.
- [`tsconfig*.json`](../../tsconfig.json) — TypeScript compiler settings. The CJS and ESM configurations emit to separate directories under `dist/`; the base configuration's temporary output is `dist/_temp/`.
- [`eslint.config.mjs`](../../eslint.config.mjs) and [`typedoc.json`](../../typedoc.json) — lint and API-documentation configuration.

## Generated and temporary directories

These paths are build or script outputs rather than maintained source. They are ignored by Git (along with `node_modules/`). Their exact contents may vary by task or platform.

- [`dist/`](../../dist/) — build output.
  - `cli/` — bundled command-line program, source map, build metadata, and license.
  - `cjs/` and `esm/` — compiled API modules for CommonJS and ES modules.
  - `deno-compile/` — CLI staging files and platform-specific compiled executables. TODO: Is it possible to move build files to artifacts and keep just output here?
  - `html/` — generated documentation pages and tag pages, graphs, previews, images, and static assets.
  - `_temp/` — intermediate TypeScript JavaScript, declaration, and source-map files. TODO: Is is possible to move it to artifacts?
  - Version/license metadata and development helpers may also be written here by build scripts.
- [`artifacts/`](../../artifacts/) — scratch and generated artifacts.
  - `docs-graph/` — intermediate Graphviz graph files.
  - `preview/` — temporary DocTML examples and assets used to generate documentation previews.
  - `docx2pdf/` — temporary input/output and supporting data for DOCX-to-PDF/HTML conversion.
  - Conformance runs may also add reports and comparison outputs.
- [`test/outputs/`](../../test/outputs/) — ignored test-run output, including generated documents and temporary conversion/test files. TODO: Remove this directory, use `artifacts` instead.

The `__old/` and `__old_src/` folders under `docs/`, `scripts/`, and `test/conformance/` contain legacy material, not active entry points for the current project structure.
