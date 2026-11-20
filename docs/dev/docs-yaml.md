# Documentation YAML reference

The YAML files describe DocTML language-reference pages and site navigation. This guide is for contributors adding or changing those definitions; see [Writing documentation](../dev/docs.md) for Markdown extensions, examples, templates, and build instructions.

## File and entry structure

Put definitions in a YAML file directly under `docs/`, preferably alongside related definitions (for example, tag entries in `p.yaml`, shared attribute types in `type-simple.yaml`). Every YAML file in that directory is read as a list of entries. A single file can contain different entry kinds, but each list item must have exactly one identifying key:

- `tag-name`: a DocTML tag entry.
- `group-name`: a named collection of tags.
- `page-name`: a Markdown page whose content is in `text`.
- `type-name`: a reusable attribute definition.
- `enum-name`: an enumeration definition.
- `toc-name`: a table of contents.

The schema is strict: unknown keys and duplicate names fail the build. Names are global across YAML files, so one definition can refer to another defined in any `docs/*.yaml` file. References must resolve; a typo is a build error. Markdown files under `docs/` are pages named after their filenames, so usually narrative pages belong in `.md` files rather than a YAML `page-name` entry. Developer Markdown files are loaded from `docs/dev/` and published with the `dev-` page prefix (except `index.md`, which is the `dev` page).

Use YAML block scalars (`|`) for multiline Markdown and code. Keep indentation consistent, especially under `attributes`, `examples`, and `details`.

## Tags and tag descriptions

A basic tag entry looks like this:

```yaml
- tag-name: p
  brief: Paragraph.
  details: |
    A longer Markdown description of the tag.
    It can include links, templates, and inline tag/attribute references.
  children: [font]
  implicit: font
  attributes:
    align:
      value: alignment
      brief: Paragraph alignment.
      details: |
        The `align=""` value controls the paragraph alignment.
```

- `brief` is a short Markdown summary shown near the tag name.
- `details` is the long Markdown description. It supports the same Markdown extensions and templates as Markdown pages.
- `children` lists tags or groups that may appear inside this tag. Group names can be used to include a group’s tags.
- `implicit` names a tag that is implicitly wrapped around the content. It is also treated as a child. Both `children` and `implicit` must reference existing tags or groups as applicable.
- `attributes` is a map from attribute name to an attribute definition (see below).
- `examples` is a list of tag examples (see [Examples](#examples)).
- `dev` is an optional Markdown comment for DocTML developers. It appears as a DEV alert on the generated tag page only in developer mode; it is omitted from the regular documentation.
- `combine` merges one or more other tag definitions into this tag. Attributes merge by key, and later definitions override earlier fields. It is commonly used for shared attribute sets and local overrides.
- `custom-page` supplies the Markdown content for a custom tag page. It replaces the normal generated tag summary/attribute reference layout; use it for entries that need a hand-written page rather than the standard tag reference.

### Writing the description fields

Write `brief` as a concise definition, not as a second heading. Put caveats, detailed behavior, examples in prose, and links in `details`. Since both fields are Markdown, use backtick auto-references for internal tag and attribute links (documented in [Writing documentation](../dev/docs.md#markdown-extensions-and-conventions)). Prefer one fact per paragraph or list item so long descriptions remain scannable.

For a special page, put its content in `custom-page: |`. It is Markdown and can contain headings, links, templates, alerts, and DocTML code fences just like a Markdown page. Do not confuse the `custom-page` body with the `details` body: `custom-page` is the page content and selects the custom layout.

## Attributes and reusable types

Each attribute is a mapping under `attributes`. Common supported fields are:

- `value`: short value syntax shown after `name="` (for example `length` or `anchor offset`).
- `brief`: one-line Markdown summary.
- `details`: longer Markdown explanation.
- `type`: name of a reusable `type-name` definition. Fields from the type are inherited; fields on the attribute override them.
- `required`: `true` to mark it required; `false` or omission means not required. A string is also accepted as a truthy required marker. Put conditional wording in `details` or `brief`, because the generated badge itself is simply “Required”.
- `experimental`: `true` displays an Experimental badge.
- `validation`: Markdown validation text, including templates if needed.
- `dev`: optional Markdown comment for DocTML developers. It appears as a DEV alert on the generated attribute page only in developer mode; it is omitted from regular documentation.
- `examples`: examples specific to this attribute.

Reusable types use the same attribute fields, with `type-name` as their identifier. Types may inherit from another type using `type`. Define them at the top level:

```yaml
- type-name: positive-length
  value: positive length
  brief: A length greater than zero.

- tag-name: picture
  attributes:
    width:
      type: positive-length
      details: The rendered width of the image.
```

When `width` uses `positive-length`, it receives that type’s `value` and `brief`; its explicit `details` takes precedence where the same field is defined. Keep types focused on reusable attribute documentation, not whole tags.

## Aliases

Use `alias-of` when a tag is another spelling or shortcut for an existing tag. The target must exist. Alias pages point readers to the original tag and do not generate a separate Attributes section; define attributes on the canonical tag instead. Give the alias its own `brief` and optional `details` to explain its behavior. `alias-text` optionally replaces the default “Alias of” link with a Markdown expression describing the equivalent syntax. It supports templates and auto-references.

```yaml
- tag-name: strong
  alias-of: font
  alias-text: bold font shortcut
  brief: Bold text shortcut.
```

The alias is still a distinct tag name for references and TOC links. Aliases are also listed on the canonical tag’s generated page. Avoid defining an alias cycle.

## Hidden definitions

A tag or group whose name begins with `-` is hidden from public tag pages, groups/navigation, and tag auto-links. Hidden tags are useful for internal building blocks: for example, a shared attribute-only tag that other tags `combine`, or an internal wrapper shared by public tags. They let the documentation stay DRY without presenting implementation helpers as DocTML elements.

```yaml
- tag-name: -common-font-attributes-
  attributes:
    color:
      value: color
      brief: Text color.

- tag-name: font
  combine: [-common-font-attributes-]
```

Hidden groups similarly organize definitions without creating a public group. Do not use a leading hyphen for a public tag or group. Hidden names are valid for internal references but should not be used as public navigation targets.

## Groups

A group has a unique `group-name`, a required `tags` list, and an optional Markdown `brief`:

```yaml
- group-name: text-elements
  brief: Text-related tags.
  tags: [TEXT, CDATA, br, tab]
```

A group can be referenced by a tag’s `children` list or by another group’s `tags` list. A public tag can belong to only one visible group; hidden groups do not claim public group membership. A group provides a collection/navigation organization, not a new DocTML tag.

## Examples

Examples are attached to a tag or an attribute. Each example requires `brief` and `code`; `details` is optional and supports Markdown. The optional `options` mapping is passed to the XML code-block renderer:

```yaml
- tag-name: p
  examples:
    - brief: Centered paragraph
      details: The `align` attribute controls paragraph alignment.
      options:
        prefix: '<document>'
        suffix: '</document>'
      code: |
        <p align="center">Hello.</p>
  attributes:
    align:
      brief: Paragraph alignment.
      examples:
        - brief: Right aligned
          code: <p align="right">Text.</p>
```

Write multiline DocTML as a literal block (`|`). The generated page displays the code as XML and tries to render a document preview. `options` accepts the same keys as the JSON5 object after an `xml` fence: `prefix` and `suffix` wrap the example code for preview generation, `data` supplies renderer data, and `noPreview: true` disables preview generation while keeping the code block. The options are serialized into the generated XML fence, so the visible code remains just `code`. Examples are processed for documentation templates; the XML code itself is not transformed as Markdown. See [Adding examples](../dev/docs.md#adding-examples).

## Enumerations

An enum has a unique `enum-name` and optional `values` map. Each value maps to a Markdown description; use `null` for a value with no description. `combine` merges values from other enum definitions, with later values overriding earlier ones.

```yaml
- enum-name: image-kind
  values:
    png: Portable Network Graphics image.
    svg: Scalable Vector Graphics image.
    bmp: null
```

If `values` is omitted, the build can populate it from a source enum named with the `docx.` or `enums.` prefix (for example, `docx.AlignmentType`). Use `enumerator('enum-name', options)` in Markdown templates to produce a formatted list. When documenting a curated subset or adding descriptions, explicitly supply `values` and combine it with a source enum as appropriate.

## Cross-file references at a glance

Names are resolved across all YAML files under `docs/`; there is no import statement. Use these fields to reference definitions:

| Field | Reference target |
| --- | --- |
| `children` | Tag name or group name |
| `implicit` | Tag name |
| `combine` on a tag | Tag name |
| attribute `type` | `type-name` |
| `alias-of` | Tag name |
| `tags` in a group | Tag or group name |
| enum `combine` | `enum-name` |
| TOC links | Markdown page or tag name |

Put the referenced definitions in any root-level `docs/*.yaml` file, but define each name only once. YAML `type` inheritance and tag `combine` are separate: `type` applies a reusable attribute definition, while tag `combine` merges another tag definition (including its attributes) into the current tag.

## Table of contents

The TOC is defined in `docs/toc.yaml`. A `toc-name` selects the TOC, and `items` is a nested list. A plain page link looks like `paragraphs.md`; a tag link uses angle brackets, such as `<p>` or `<br/>`. To display a custom label, use a one-key mapping:

```yaml
- toc-name: main
  items:
    - Paragraphs: paragraphs.md
    - Paragraph tag: <p>
    - Language reference:
      - _link: intro.md
      - _collapse: true
      - _expandOn: [intro.md, <p>]
      - <p>
```

A nested item without `_link` is a non-link heading. The optional underscore properties apply to that nested item: `_link` makes the heading itself link to a page or tag, `_collapse` starts its children collapsed, and `_expandOn` lists page/tag targets that cause it to expand. Page links may include a fragment, such as `paragraphs.md#headings`. All target pages and tags must exist.

## Validation checklist

- Use a list at the YAML document root; every item must be a mapping with exactly one supported identifier key.
- Keep names unique and check every cross-reference for spelling and case.
- Use `|` for multiline descriptions, examples, and custom page content.
- Use Markdown backtick auto-references for tag/attribute links in descriptions.
- Run `npm run build-docs` from the repository root and inspect the generated pages. See [Writing documentation](../dev/docs.md#build-and-view-the-documentation).
