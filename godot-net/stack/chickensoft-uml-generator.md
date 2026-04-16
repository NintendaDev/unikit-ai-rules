---
version: 1.0.0
---

# Chickensoft UMLGenerator

> **Scope**: Build-time PlantUML diagram generation from C# class declarations and Godot `.tscn` scene files — the `[ClassDiagram]` attribute, csproj configuration, generated `.g.puml` file placement, and IDE rendering setup.
> **Load when**: adding UML diagrams to a class, configuring UMLGenerator in csproj, setting up PlantUML rendering in VS Code or Rider, including Godot scene files in generated diagrams, deciding which classes to annotate with `[ClassDiagram]`.

---

## Installation

Add as a Roslyn analyzer (standard pattern for Chickensoft source generators):

```xml
<PackageReference Include="Chickensoft.UMLGenerator" Version="1.3.1"
                  PrivateAssets="all" OutputItemType="analyzer" />
```

`PrivateAssets="all"` prevents generator dependencies from leaking into downstream projects.
`OutputItemType="analyzer"` registers the package as a Roslyn source generator with the build system.

## Godot Scene Integration (optional)

To include `.tscn` scene node relationships in generated diagrams, add to your `.csproj`:

```xml
<AdditionalFiles Include="**/*.tscn" />
```

Exclude third-party plugin scenes to avoid parse overhead and potential malformed content:

```xml
<AdditionalFiles Include="**/*.tscn" Exclude="addons/**/*.tscn" />
```

Without this entry, only C# type relationships (inheritance, interfaces, properties) appear in diagrams. Scene node hierarchies are absent.

## ClassDiagramAttribute

Namespace: `Chickensoft.UMLGenerator`. Apply to any class, struct, or record to trigger `.g.puml` generation on build:

```csharp
using Chickensoft.UMLGenerator;

[ClassDiagram(UseVSCodePaths = true)]
public class Game : Node, IGame
{
    public IGameRepo GameRepo { get; set; }
    public IGameLogic GameLogic { get; set; }
}
```

`[AttributeUsage(AttributeTargets.Class, AllowMultiple = false)]` — only one `[ClassDiagram]` per type.

### Attribute Properties

| Property | Type | Default | Purpose |
|----------|------|---------|---------|
| `UseVSCodePaths` | `bool` | `false` | Emits `vscode://` protocol paths so the VS Code PlantUML extension can navigate to source. Set to `false` (or omit) for JetBrains Rider. |
| `GetAllTopLevelNodes` | `bool` | `false` | When `true`, the diagram also contains every other top-level scene node in the project, not just the annotated class. |

### IDE Setup

**VS Code** — install the [PlantUML extension](https://marketplace.visualstudio.com/items?itemName=jebbs.plantuml), then annotate with:
```csharp
[ClassDiagram(UseVSCodePaths = true)]
```

**JetBrains Rider** — install the PlantUML Integration plugin, then omit the flag or set it to `false`:
```csharp
[ClassDiagram]               // UseVSCodePaths defaults to false
// or explicitly:
[ClassDiagram(UseVSCodePaths = false)]
```

## Generated Output

After a build, `*.g.puml` files are written **alongside the source files** they describe. Each diagram captures:

- Class inheritance hierarchies
- Interface implementations
- Property declarations and types
- Method signatures
- Scene node relationships (only when `.tscn` `AdditionalFiles` is configured)

Open `.g.puml` files in the IDE's PlantUML plugin to render diagrams, or paste into an online PlantUML viewer.

## What the Generator Processes

The generator is a Roslyn incremental source generator. It:

1. Collects `.tscn` files registered as `AdditionalTexts` and parses their scene hierarchy via `Righthand.GodotTscnParser`.
2. Walks all `TypeDeclarationSyntax` nodes (classes, structs, records) in the project directory.
3. Emits `.g.puml` only for types decorated with `[ClassDiagram]`.

Types **without** the attribute appear in diagrams only if they are base types, implemented interfaces, or property types of an annotated class.

## Anti-patterns

- **Don't omit `PrivateAssets="all" OutputItemType="analyzer"`** — without these the package is treated as a runtime dependency, breaking build output and adding unnecessary assemblies to the game.
- **Don't set `UseVSCodePaths = true` in Rider** — Rider cannot resolve `vscode://` links; rendered diagrams work but source navigation is broken.
- **Don't annotate every class** — apply `[ClassDiagram]` only to architecturally significant types (top-level systems, major state machines, key scene nodes). Over-annotating creates noise and slows incremental builds.
- **Don't include `addons/` in `AdditionalFiles`** — third-party `.tscn` files add parse overhead and may be malformed, causing silent skips of entire scene trees.
- **Don't expect full scene trees without `AdditionalFiles`** — scene node relationships require explicit `.tscn` registration; omitting the entry silently produces C#-only diagrams.
