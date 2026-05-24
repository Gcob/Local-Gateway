---
name: markdown
description: >
  Apply when writing or reviewing any Markdown file — README, CHANGELOG, ADR, docs, CLAUDE.md,
  wiki pages, or inline doc blocks. Covers all formatting rules from markdownlint (DavidAnson,
  CommonMark) as used by the JetBrains Markdownlint plugin for PhpStorm/IntelliJ. Use this skill
  whenever you are asked to write, edit, lint, format, or review a .md file, even if the user
  just says "clean this up" or "fix the markdown".
---

# Skill — Markdown Style (markdownlint / PhpStorm)

Applies the **DavidAnson markdownlint** rule set (CommonMark), which is what the
[JetBrains Markdownlint plugin](https://plugins.jetbrains.com/plugin/20851-markdownlint) enforces
inside PhpStorm/IntelliJ. The reference config below (`default: true`) is the baseline; project
overrides live in `.markdownlint.json` or `.markdownlint.yaml` at the repo root.

---

## Reference config (`.markdownlint.json`)

```json
{
    "$schema": "https://raw.githubusercontent.com/DavidAnson/markdownlint/main/schema/markdownlint-config-schema.json",
    "default": true,
    "MD003": {
        "style": "atx"
    },
    "MD004": {
        "style": "dash"
    },
    "MD007": {
        "indent": 2
    },
    "MD013": {
        "line_length": 120,
        "code_blocks": false,
        "tables": false
    },
    "MD024": {
        "siblings_only": true
    },
    "MD029": {
        "style": "ordered"
    },
    "MD033": {
        "allowed_elements": [
            "br"
        ]
    }
}
```

MD013 (line length) is commonly set to 120 or disabled entirely for prose-heavy docs.
Match whatever is already in the project's config file if one exists.

---

## Rules quick reference

### Headings (MD001, MD003, MD018, MD019, MD022, MD023, MD024, MD025, MD026, MD041)

- ATX style only — `#`, `##`, `###` — never setext underline (`===` / `---`) **(MD003)**
- Exactly one space after `#` — not zero, not two **(MD018, MD019)**
- Levels increment by one at a time — no jumping from `##` to `####` **(MD001)**
- Only one `H1` per file **(MD025)**
- Headings must not have duplicate content at the same nesting level — siblings
  with the same text are flagged; different sections may reuse headings **(MD024)**
- No trailing punctuation in headings (no `.` `?` `!` `:`) **(MD026)**
- Must start at column 0 — no leading spaces **(MD023)**
- One blank line before and after every heading **(MD022)**
- First line of file should be an `H1` **(MD041)**

### Blank lines (MD012, MD022, MD031, MD032, MD047)

- Never more than one consecutive blank line **(MD012)**
- One blank line before and after every heading **(MD022)**
- One blank line before and after every fenced code block **(MD031)**
- One blank line before and after every list **(MD032)**
- File ends with exactly one newline **(MD047)**

### Code blocks (MD031, MD040, MD046)

- Always fenced (` ``` `) — never indented 4-space blocks **(MD046)**
- Always include a language identifier **(MD040)**
- Blank line before and after the fence **(MD031)**

Common language identifiers: `php`, `bash`, `sh`, `yaml`, `json`, `sql`, `html`,
`javascript`, `typescript`, `vue`, `dockerfile`, `nginx`, `text`.

### Lists (MD004, MD005, MD007, MD029, MD030, MD032)

- Unordered marker: `-` only — never `*` or `+` **(MD004)**
- Nested lists: indent by **2 spaces** **(MD007)**
- All items at the same level must use the same indentation **(MD005)**
- Ordered lists use sequential numbers: `1.` `2.` `3.` — not repeated `1.` **(MD029)**
- One space after the list marker (`- item`, not `-item`) **(MD030)**
- Blank line before and after the whole list block **(MD032)**

### Links and URLs (MD011, MD034, MD042, MD051)

- No bare URLs — always `[label](url)` or `<url>` **(MD034)**
- No reversed link syntax `(text)[url]` **(MD011)**
- No empty link labels `[](url)` **(MD042)**
- Fragment links (`#anchor`) must resolve to an existing heading **(MD051)**

### Whitespace (MD009, MD010, MD027, MD028, MD037, MD038, MD039)

- No trailing spaces — hard stop **(MD009)**
- No hard tabs anywhere — spaces only **(MD010)**
- No multiple spaces after blockquote `>` marker **(MD027)**
- No blank lines inside a blockquote block **(MD028)**
- No spaces inside emphasis markers: `**bold**` not `** bold **` **(MD037)**
- No spaces inside inline code: `` `code` `` not `` ` code ` `` **(MD038)**
- No spaces inside link text `[label]` **(MD039)**

### Horizontal rules (MD035)

- Consistent style — use `---` only, never `***` or `___`

### Images (MD045)

- `alt` text is required on every image: `![alt text](path)` **(MD045)**

### Inline HTML (MD033)

- Avoid inline HTML; only `<br>` is allowed by the reference config above.

---

## Patterns to avoid

```md
<!-- WRONG: setext heading -->
My Title
========

<!-- CORRECT: ATX heading -->

# My Title
```

```md
<!-- WRONG: heading level skips -->

# Title

### Subtitle

<!-- CORRECT -->

# Title

## Subtitle
```

```md
<!-- WRONG: no blank line before heading -->
Some paragraph text.

## Next section

<!-- CORRECT -->
Some paragraph text.

## Next section
```

```md
<!-- WRONG: fenced block without language -->
```

docker compose up -d

```

<!-- CORRECT -->
```bash
docker compose up -d
```

```

```md
<!-- WRONG: bare URL -->
See https://docs.traefik.io for details.

<!-- CORRECT -->
See [Traefik docs](https://docs.traefik.io) for details.
```

```md
<!-- WRONG: unordered list using * -->

* foo
* bar

<!-- CORRECT -->

- foo
- bar
```

```md
<!-- WRONG: nested list using 4-space indent (project default is 2) -->

- parent
    - child

<!-- CORRECT -->

- parent
    - child
```

```md
<!-- WRONG: ordered list all using 1. -->

1. First
1. Second
1. Third

<!-- CORRECT -->

1. First
2. Second
3. Third
```

```md
<!-- WRONG: list not surrounded by blank lines -->
Some text.

- item one
- item two
  More text.

<!-- CORRECT -->
Some text.

- item one
- item two

More text.
```

```md
<!-- WRONG: trailing punctuation in heading -->

## Prerequisites:

<!-- CORRECT -->

## Prerequisites
```

```md
<!-- WRONG: multiple consecutive blank lines -->
Some text.

## Next section

<!-- CORRECT -->
Some text.

## Next section
```

---

## Inline disable comments

Use sparingly when a violation is genuinely unavoidable:

```md
<!-- markdownlint-disable-next-line MD013 -->
This line is intentionally long because it contains a URL that cannot be shortened.

<!-- markdownlint-disable MD033 -->
<details><summary>Click to expand</summary>
Custom HTML block that requires the exception.
</details>
<!-- markdownlint-enable MD033 -->
```

---

## Tables

- Use `|` pipe syntax
- Header separator row required (`| --- |`)
- PhpStorm auto-aligns columns — accept or ignore the alignment spaces; markdownlint
  does not flag column padding
- Blank line before and after the table block **(MD058 when enabled)**

```md
| Column A | Column B | Column C |
| -------- | -------- | -------- |
| value    | value    | value    |
```