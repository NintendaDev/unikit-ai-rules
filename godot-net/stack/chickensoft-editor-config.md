---
version: 1.0.0
---

# Chickensoft EditorConfig

> **Scope**: Setup and conventions for the Chickensoft `.editorconfig` used in Godot 4 C# projects — formatting defaults per file type, C# code style rules (var, expression-bodied members, pattern matching, braces, namespaces), the Chickensoft naming convention system, and Roslyn diagnostic overrides.
> **Load when**: setting up or modifying `.editorconfig` in a Chickensoft Godot project, onboarding a new editor environment, adjusting C# code style enforcement, adding or changing Roslyn analyzer rules, debugging style warnings from the .NET analyzer, configuring VS Code or Rider for the project.

---

## Overview

Chickensoft ships a standard `.editorconfig` described as *"Godot-friendly coding style with a bit of Dart-style flair."*
It is identical across all Chickensoft templates (`GodotGame`, `GodotPackage`, `LogicBlocks`, etc.) and is the recommended starting point for any Chickensoft Godot 4 C# project.

The file lives at the project root with `root = true` so editors stop scanning parent directories for additional configs.

**Canonical source**: `chickensoft-games/GodotGame` → `.editorconfig`

## Setup

1. Copy the full `.editorconfig` from `chickensoft-games/GodotGame` into the project root.
2. Verify `root = true` is at the very top of the file.
3. No NuGet packages or extra tools are required — EditorConfig is natively supported by the .NET Roslyn analyzer pipeline, VS Code (C# extension), Visual Studio, and Rider.
4. For VS Code, add the following to `.vscode/settings.json` to apply style rules on save:

```json
"editor.formatOnSave": true,
"editor.codeActionsOnSave": {
  "source.fixAll": "explicit",
  "source.organizeImports": "explicit"
}
```

## Global Defaults (`[*]`)

Applied to every file in the project:

```editorconfig
charset = utf-8
indent_style = space
indent_size = 2
insert_final_newline = true
trim_trailing_whitespace = true
end_of_line = lf
```

- Use **LF** line endings globally, even on Windows. Only batch files use CRLF.
- 2-space indentation is the default for all non-exception file types.

## File-Type Overrides

| File pattern | `indent_style` | `end_of_line` | Notes |
|---|---|---|---|
| `*.{gd,gdshader,gdshaderinc}` | tab | — | GDScript convention; always tabs |
| `*.sln` | tab | — | Visual Studio requirement |
| `*.{csproj,vbproj,...}` | space (2) | — | XML project files |
| `*.{xml,config,props,...}` | space (2) | — | |
| `*.{json,json5,webmanifest}` | space (2) | — | |
| `*.{yml,yaml}` | space (2) | — | |
| `*.{md,mdx}` | space (2) | — | `trim_trailing_whitespace = false` |
| `*.{htm,html,js,ts,...}` | space (2) | — | Web files |
| `*.{cmd,bat}` | — | crlf | Windows batch requirement |
| `Makefile` | tab | — | |

**Key rule**: GDScript uses tabs; C# and everything else uses 2 spaces.

## Generated Code

```editorconfig
[*{_Generated.cs,.g.cs,.generated.cs}]
dotnet_diagnostic.CS1591.severity = none
```

Suppresses missing XML documentation warnings for source-generated files.
Apply this glob to any additional file patterns the project's source generators produce.

## C# Analyzer Default Severity

```editorconfig
[*.cs]
dotnet_analyzer_diagnostic.severity = warning
```

All .NET code style diagnostics default to `warning`. Individual rules below may override to `suggestion`, `none`, or `error`.

## `var` Preferences

Chickensoft default enforces `var` everywhere:

```editorconfig
csharp_style_var_for_built_in_types = true:warning
csharp_style_var_when_type_is_apparent = true:warning
csharp_style_var_elsewhere = true:warning
```

> **Project override**: `core/code-style.md` mandates explicit types (`NEVER use var`).
> The project rule wins. Add the following block after the defaults to suppress `var` warnings:
>
> ```editorconfig
> # Project override: always use explicit types
> csharp_style_var_for_built_in_types = false:warning
> csharp_style_var_when_type_is_apparent = false:warning
> csharp_style_var_elsewhere = false:warning
> ```

## Expression-Bodied Members

```editorconfig
csharp_style_expression_bodied_constructors = false:warning  # always block body
csharp_style_expression_bodied_methods = when_on_single_line:warning
csharp_style_expression_bodied_operators = true:warning
csharp_style_expression_bodied_properties = true:warning
csharp_style_expression_bodied_indexers = true:warning
csharp_style_expression_bodied_accessors = true:warning
csharp_style_expression_bodied_lambdas = true:warning
csharp_style_expression_bodied_local_functions = true:warning
```

- **Constructors**: always block body (`false`).
- **Methods**: expression body only when it fits on a single line.
- **Everything else**: prefer expression body.

## Pattern Matching

```editorconfig
csharp_style_pattern_matching_over_is_with_cast_check = true:warning
csharp_style_pattern_matching_over_as_with_null_check = true:warning
csharp_style_prefer_switch_expression = true:warning
csharp_style_prefer_pattern_matching = true:warning
csharp_style_prefer_not_pattern = true:warning
```

Use `is` patterns and switch expressions instead of cast checks and switch statements.

## Braces & Statements

```editorconfig
csharp_prefer_braces = true:warning
csharp_preserve_single_line_statements = false
csharp_preserve_single_line_blocks = true
```

- Always use braces, even for single-line `if`/`else` bodies.
- `csharp_preserve_single_line_statements = false` means `if (x) return;` on one line is flagged — use braces.

## Namespace & Using Directives

```editorconfig
csharp_style_namespace_declarations = file_scoped:warning
csharp_using_directive_placement = inside_namespace:warning
dotnet_sort_system_directives_first = true
dotnet_separate_import_directive_groups = false
dotnet_style_namespace_match_folder = false
dotnet_diagnostic.IDE0130.severity = none
```

- Use **file-scoped namespaces**: `namespace Foo;` not `namespace Foo { ... }`.
- Place `using` directives **inside** the namespace block.
- Sort `System.*` using directives first.
- Namespace does **not** need to match folder structure — organize as the project requires.

## Null Checks & Coalescing

```editorconfig
dotnet_style_coalesce_expression = true:warning
dotnet_style_null_propagation = true:warning
dotnet_style_prefer_is_null_check_over_reference_equality_method = true:warning
csharp_style_prefer_null_check_over_type_check = true:warning
```

- Prefer `??` and `?.` operators over explicit null branches.
- Use `is null` / `is not null` instead of `== null` / `!= null`.

## Unused Code

```editorconfig
csharp_style_unused_value_expression_statement_preference = discard_variable
csharp_style_unused_value_assignment_preference = discard_variable
dotnet_code_quality_unused_parameters = non_public:suggestion
```

Assign unused values to `_` (discard variable). Unused non-public parameters are a suggestion-level warning.

## Modifier Order

```editorconfig
csharp_preferred_modifier_order = public,private,protected,internal,static,extern,new,virtual,abstract,sealed,override,readonly,unsafe,volatile,async:warning
```

Always write modifiers in this exact order. Deviating from it is a warning.

## Naming Conventions

Chickensoft deviates from Microsoft's official naming guidelines. The following table is authoritative:

| Symbol | Style | Example |
|---|---|---|
| `const` fields (all accessibilities) | `UPPER_CASE` with `_` separator | `MAX_SPEED`, `DEFAULT_TIMEOUT` |
| Non-public fields | `_camelCase` | `_health`, `_timer` |
| Public fields | `PascalCase` | `Health`, `Timer` |
| Namespaces, classes, enums, structs, delegates, events, methods, properties | `PascalCase` | `PlayerController`, `OnDied` |
| Interfaces | `I` + `PascalCase` | `IMovable`, `ISerializable` |
| Generic type parameters | `T` + `PascalCase` | `TState`, `TValue` |
| Parameters | `camelCase` | `maxSpeed`, `entityId` |
| Fallback (anything else) | `camelCase` | — |

- `dotnet_diagnostic.CA1707.severity = none` — underscores are allowed (required for `_camelCase` fields and `UPPER_CASE` constants).
- The `Async` method suffix rule is **intentionally disabled** (commented out in the editorconfig). GoDotTest cannot call static or async test methods, making the suffix impractical for test classes.

## Roslyn Diagnostic Overrides

| Diagnostic | Severity | Reason |
|---|---|---|
| `CA1051` | none | Allow `protected` fields — common in Chickensoft base/derived node patterns |
| `CS8073` | none | Allow null checks the analyzer believes are always-true — they may not be at runtime |
| `IDE0058` | none | Allow discarding expression results implicitly — required for clean Moq/NSubstitute usage |
| `CA1711` | none | Allow "Collection" suffix in type names |
| `CA1716` | none | Allow reserved keyword names (e.g., `On` methods, common in Chickensoft signal handlers) |
| `CA1822` | private only | Only flag private methods that could be `static`; public test methods stay instance (GoDotTest requirement) |
| `IDE0290` | none | No primary constructors — tooling support is insufficient |
| `IDE0046` | none | Allow plain `if` statements instead of forcing ternary expressions |
| `IDE0072` | warning | Require switch **expressions** to handle all cases exhaustively |
| `IDE0010` | none | Don't require switch **statements** to be exhaustive |
| `IDE0062` | warning | Local functions should be `static` where possible |
| `IDE0032` | none | Allow public fields without forcing auto-properties |
| `IDE0130` | none | Namespace-folder mismatch is allowed |

## Anti-patterns

- **Omitting `root = true`** — without it, editors merge configs from parent directories, producing inconsistent style enforcement.
- **Using `this.` qualifiers** — all four `dotnet_style_qualification_for_*` rules are set to `false`; the analyzer warns when `this.` is present.
- **Using `as` + null check** — prefer `if (obj is MyType t)` pattern matching.
- **Writing modifier order differently** than the declared sequence — modifier order is enforced as a warning.
- **Enabling the `Async` suffix naming rule** — it is disabled deliberately; re-enabling it causes excessive verbosity in test projects using GoDotTest.
- **Setting `dotnet_style_namespace_match_folder = true`** — Chickensoft explicitly disables this to allow flexible project organization.
- **Editing generated file sections** (`_Generated.cs`, `.g.cs`, `.generated.cs`) — keep the CS1591 suppression; do not add stricter rules to generated output.
