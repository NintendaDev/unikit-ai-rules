# Contributing to UniKit Rules

## Adding a New Rule

1. Choose the correct engine directory: `unity/`, `godot/`, `godot-net/`, `unreal-engine-5/`
2. Choose the category:
   - `core/` — universal best practices (code style, design, testing, performance)
   - `stack/` — framework-specific patterns (DOTween, Zenject, R3, etc.)
3. Create the file: `<engine>/<category>/<rule-name>.md`
4. Follow the file format below
5. Run `node scripts/build-manifest.js` to validate
6. Submit a pull request

## File Format

```markdown
---
version: 1.0.0
---

# Rule Name

> **Scope**: Brief description of what this rule covers.
> **Load when**: comma-separated keywords and contexts.

---

## Section

Rules, examples, patterns.

## Anti-patterns

Common mistakes to avoid.
```

## Naming Conventions

- **File name**: `lower-case-name.md` (e.g., `dotween.md`, `zenject.md`, `code-style.md`)
- **ID**: derived from filename without `.md` extension
- **ID format**: `^[a-z][a-z0-9-]*$` (lowercase, alphanumeric, hyphens — underscores not allowed)

## Version Bumping

When you change the content of a rule file, you **must** bump the `version` in the frontmatter. CI enforces this - if the file hash changes but the version stays the same, the build will fail.

- **Patch** (1.0.0 → 1.0.1): typo fixes, minor wording changes, formatting
- **Minor** (1.0.0 → 1.1.0): new sections, expanded examples, additional patterns
- **Major** (1.0.0 → 2.0.0): restructured content, removed sections, changed conventions

## Reference Files

For complex frameworks that need supplementary documentation:

1. Place reference files in `<engine>/<category>/references/`
2. Name them with the rule ID prefix: `rule-name-topic.md` (e.g., `aspid-mvvm-binders-full.md`)
3. Add `> **References**:` header to the main rule file pointing to the reference files
4. When updating reference files, also bump the version of the **main** rule file

## Validation

Run `node scripts/build-manifest.js` before submitting. It checks:

- ID format (`^[a-z][a-z0-9-]*$`)
- No duplicate IDs within core or stack of the same engine
- No ID overlap between core and stack
- Description length >= 10 characters
- Load When length >= 10 characters
- Version is valid semver
- Referenced files exist on disk

## Quality Guidelines

- Write rules in **English only**
- Include **code examples** wherever they clarify usage
- Keep rules **actionable**: "Use X", "Never Y", "Prefer Z over W"
- Include an **Anti-patterns** section when applicable
- Keep the Scope and Load When fields precise and keyword-rich
