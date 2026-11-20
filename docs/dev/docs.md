# Writing documentation

This guide explains how to add and update the project’s user-facing DocTML documentation. It assumes you already know Markdown and YAML; it focuses on the conventions and extra features used by this repository.

- Use Markdown pages for longer, narrative explanations.
- Use YAML definitions for tags, attributes, types, enums, groups, and the table of contents.
- Start with the YAML reference in [Documentation tags format (YAML)](../dev/docs-yaml.md) when adding a language reference entry.
- Keep examples runnable and concise. Tag and attribute examples are shown with generated code previews.

## Where documentation lives

- `docs/*.md` contains regular documentation pages. A page named `topic.md` is linked as `topic.md` in Markdown and appears in the generated site as `topic.html`.
- `docs/*.yaml` contains definitions. The YAML files are all loaded together, so definitions can refer to one another regardless of which YAML file they are in.
- `docs/dev/*.md` contains developer documentation. For example, `docs/dev/docs.md` is published as `dev-docs.html`; `docs/dev/index.md` is the developer landing page.
- `docs/img/` holds images copied to the generated site. Refer to them as `img/name.ext` from a page.

The main documentation navigation is configured in `docs/toc.yaml`. If a new public page or tag should appear in navigation, add it there as well. See the YAML guide for TOC syntax.

## Markdown extensions and conventions

Markdown is converted to HTML with Showdown. The build enables tables, GitHub-compatible heading IDs, simplified automatic links for bare URLs, and automatic code syntax highlighting. In addition, these project-specific extensions are available:

### GitHub-style alerts

Start an alert with a quoted marker line, `> [!TYPE]`, then put the alert text on one or more following quoted lines. The marker and every body line must begin with `>`:

```markdown
> [!NOTE]
> Useful information that users should know, even when skimming content.
```

The accepted types are `NOTE`, `TIP`, `IMPORTANT`, `WARNING`, and `CAUTION`. Use alerts sparingly for important information; GitHub recommends no more than one or two per article. Alerts cannot be nested, and consecutive alerts should be avoided. See [GitHub’s alert syntax](https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax#alerts).

### Light/dark image variants

Add `#gh-dark-mode-only` or `#gh-light-mode-only` to an image URL to mark the image for the matching theme. The generated site styles the image accordingly.

```markdown
![Dark theme screenshot](img/screenshot-dark.png#gh-dark-mode-only)
![Light theme screenshot](img/screenshot-light.png#gh-light-mode-only)
```

### Inline requirement labels

In Markdown descriptions, `@required` and `@optional` render as styled labels. `@conditional {condition}` renders the condition followed by “Conditionally required”. Keep the condition in braces on one line.

```markdown
- **position** @required — Tab stop position.
- **leader** @optional — Tab leader.
- **width** @conditional {when wrapping is enabled} — Image width.
```

These are textual replacements, so use them only where they are intended as labels. The `@enum Name` notation found in some existing descriptions is ordinary text, not a build directive; use the template `enumerator()` helper (below) when the values should be generated dynamically.

Raw HTML in Markdown is passed through to the generated page; use it only when Markdown cannot express the needed markup. HTML comments such as `<!-- @example ... -->`, `<!-- @end -->`, and `<!-- @preview -->` are not interpreted by the documentation builder. They remain comments and do not alter generated content.

### DocTML code blocks and previews

A fenced block labelled `xml` is treated as DocTML. It is syntax-highlighted and, by default, the build also runs it to generate a document preview. The optional fence info may contain a JSON5 options object:

````markdown
```xml { prefix: '<document>', suffix: '</document>' }
<p align="center">A previewable example.</p>
```
````

The options supported by the preview builder are:

- `prefix` and `suffix`: DocTML text added around the fenced code. Use these when the snippet needs a root tag or setup without showing it in the displayed code.
- `data`: JSON-compatible data supplied to the DocTML renderer.
- `noPreview: true`: show and highlight the code without executing it or generating a preview.

The code and any prefix/suffix are executed as DocTML during the documentation build. Only use trusted, safe examples. Preview generation requires the project’s CLI build and document-to-PDF conversion tools; a preview failure may therefore be an environment/tooling issue rather than a Markdown error.

### Markdown links

The build rewrites Markdown links ending in `.md` to generated `.html` pages, preserving fragments such as `#section`. Links to developer pages written as `../dev/name.md` are rewritten to `dev-name.html`. Only Markdown links are rewritten; raw HTML links are left unchanged. Prefer these source-style `.md` links so links work in the generated site.

Wrap these forms in Markdown inline-code delimiters (backticks) to generate links to language-reference entries. The tag and attribute names must exist in the combined YAML input:

- **&#96;&lt;p&gt;&#96;** — link to a tag page.
- **&#96;align=&quot;…&quot;&#96;** — link to that attribute on the tag currently being documented.
- **&#96;&lt;p align=&quot;center&quot;&#96;** — link to an attribute on another tag.
- A trailing slash is accepted for tags with no children, for example **&#96;&lt;br/&gt;&#96;**; the closing `>` can be included or omitted on attribute forms.

For example, in a paragraph about paragraphs, **&#96;align=&quot;center&quot;&#96;** links to the current tag’s attribute. For a cross-reference, write **&#96;&lt;img src=&quot;…&quot;&#96;**. These auto-references are recognized inside backticks; plain, unformatted tag text is not linked. Hidden tags are not valid targets for tag-only auto-links. The substitutions run before Markdown parsing and are not limited to prose, so avoid reference-shaped text in code snippets when it must remain literal.

### Markdown templates

Documentation text (Markdown pages, tag/attribute descriptions, aliases, examples, and enum descriptions) can use Underscore-style template markers. They are processed before Markdown conversion:

- **&lt;# expression #&gt;** inserts the expression result as Markdown.
- **&lt;#= expression #&gt;** also interpolates a result.
- **&lt;#! statements #&gt;** executes template code without inserting its return value.

For example, **&lt;# enumerator('docx.AlignmentType', { oneLine: true }) #&gt;** inserts a compact list of supported alignments without duplicating the values in prose.

The current item and parsed docs are available through `ctx` (`ctx.docs`, `ctx.tag`, `ctx.attribute`, `ctx.page`, or `ctx.enumerator`, depending on the content being processed). The per-build `data` object is also available; the HTML build currently sets `data.agents` to `false`. `lorem(options)` generates sample text, and `enumerator(name, options)` renders an enum as a list. The `enumerator` options are `indent`, `oneLine`, and `collapse`; `collapse` wraps the output in an HTML `<details>` block with the supplied summary. Template code is not escaped: use it only in trusted documentation, and use Markdown-safe output.

Example code is templated too, but its code is not processed for Markdown links or auto-references. Keep template markers out of code unless you deliberately want them evaluated.

## Adding examples

For a tag or attribute, add examples in its YAML definition. Each item requires a short `brief` and DocTML `code`; optional `details` gives context and supports the same Markdown extensions and templates.

```yaml
- tag-name: sample-tag
  brief: A short summary.
  examples:
    - brief: Basic use
      options:
        prefix: '<document>'
        suffix: '</document>'
      code: |
        <p>Hello from the example.</p>
```

For attributes, place the `examples` list under the attribute key. Prefer literal YAML block scalars (`|`) for multiline DocTML. The optional `options` mapping on a YAML example accepts `prefix`, `suffix`, `data`, and `noPreview`, with the same behavior as the JSON5 options after a Markdown `xml` fence. Use `prefix` and `suffix` to add required wrapping DocTML while keeping the displayed example focused. Set `noPreview: true` to display the code without generating a preview.

A preview is generated automatically for every XML-labelled fenced block unless disabled. Examples within YAML are displayed as XML fenced blocks and get the same preview behavior. Check that the finished example is valid and that it does not rely on undocumented local files.

## Build and view the documentation

From the repository root, run:

```sh
npm run build-docs
```

The generated site is written to `dist/html/`. Open `dist/html/index.html` in a browser to inspect it. For the developer guide, open `dist/html/dev.html`; this page is produced from `docs/dev/index.md`. Verify navigation, in-page fragments, auto-links, code highlighting, and any generated previews after editing. Re-run the build after making changes; generated output is not the source of truth.

DocTML preview generation needs the compiled CLI and a DOCX-to-PDF converter. On a clean checkout, run `npm run build-cli` before `npm run build-docs`. The default converter is Microsoft Office on Windows; for local-only rendering with LibreOffice, set `DOCX_CONVERT_SOFFICE=soffice` when building. LibreOffice may render differently from Office, so use the project’s configured Office/conversion-server setup for official documentation output.

## Before submitting

- Check spelling, DocTML spelling/case, Markdown rendering, and YAML indentation.
- Confirm new names and references resolve; the build rejects unknown tags, attributes, types, enums, and TOC targets.
- Add public pages and tags to `docs/toc.yaml` where appropriate.
- Keep definitions in the existing topic-oriented YAML files where practical. Use hidden definitions for shared implementation data rather than exposing them as public reference pages.
