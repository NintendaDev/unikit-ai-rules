---
version: 1.0.0
---

# Folder Structure & Namespaces

> **Scope**: Project folder organization, module structure, namespace conventions, external asset boundaries
> **Load when**: Creating new scripts, choosing file location, setting namespace, creating folders, module structure, folder layout

---

## External Assets

`addons/` (third-party plugins) — NEVER modify code in third-party addon folders. Extend via subclassing, composition, or wrapper scripts.

## Modules — Independent Reusable Modules

Structure: `modules/{ModuleName}/Scripts/` + `Tests/`. Submodules: `modules/{ModuleName}/{SubModule}/Scripts/` + `Tests/`.
Each module is self-contained with its own namespace: `Modules.{ModuleName}`. Can be extracted into a separate project or NuGet package.

```
modules/
  {ModuleName}/
    Scripts/            — C# source files
    Resources/          — Custom Resource types (.tres, .cs)
    Tests/              — Test files
    Scenes/             — Module-specific scenes (.tscn)
```

## Project Scripts — Feature-Based Organization

Project-specific code organized by **features, not by type**. Related scripts (controllers, views, models, resources) live together inside their feature folder rather than being scattered across type-based directories like `Controllers/`, `Views/`, `Models/`.

> The tree below is a **universal example** of feature-based organization for a Godot .NET game project. Adapt folder names and depth to your project's needs.

### Top-Level Folders

```
scripts/
  Application/     — global app-level systems (autoloads, persist across scenes)
  Gameplay/        — scene-specific gameplay logic
  Debug/           — debug utilities, cheat tools
```

### Application/ — Global Systems

```
Application/
  Core/
    Boot/
      LoadingOperations/  — app bootstrap sequence
    Saves/                — global save/load system
    Audio/                — audio system setup
    {Feature}/            — each global feature in its own folder
  UI/
    Common/               — shared UI scripts and base classes
    MainMenu/             — main menu feature
    Content/              — concrete UI systems by feature
```

Each feature folder contains its own setup. The root autoload(s) are the entry point that wire feature systems together.

### Gameplay/ — Scene-Specific Logic

```
Gameplay/
  Common/                 — shared gameplay utilities

  System/                 — scene infrastructure (not gameplay logic)
    Bootstrap/            — scene loading sequence
    DI/                   — dependency wiring (manual DI or composition root)
    Saves/                — scene-level save serializers
    {Feature}/            — scene-level system integrations

  Core/                   — gameplay mechanics, reusable within the scene
    {Feature}/            — each mechanic in its own folder (Dialogues, Movement, MiniGames)

  GameContext/            — controllers coordinating gameplay entities
    {Feature}/            — one folder per game domain (Customers, Trade, GameLoop, Items)

  GameObjects/
    Content/
      {Entity}/           — concrete entities (Player, Enemy), each with own setup
    {Domain}/             — domain-specific game objects outside Content

  View/
    UI/
      Core/               — UI framework extensions (custom controls, converters)
      Gameplay/
        {Feature}/        — gameplay UI by feature (Inventory, Counter, Wallet)
    VFX/
      {Feature}/          — visual effects by feature (Dialogues, Feedbacks)
    Content/              — entity visuals (animation, presenters)
    Audio/                — audio presenters
```

### Key Structural Distinctions

- **GameContext vs GameObjects/Content**: `GameObjects/Content/{Entity}/` holds the entity itself (model, factory, scene). `GameContext/{Feature}/` holds higher-level controllers that coordinate entities
- **System vs Core**: `System/` is scene infrastructure (bootstrap, DI, saves). `Core/` is reusable gameplay mechanics. System wires things up; Core does the actual work
- **View/UI/Core vs View/UI/Gameplay**: `UI/Core/` holds reusable UI building blocks (custom controls, converters, base views). `UI/Gameplay/{Feature}/` holds concrete feature UI

## Scenes — Scene Files (.tscn)

```
scenes/
  Main.tscn               — application entry point
  Gameplay.tscn            — main gameplay scene
  UI/                      — reusable UI scenes
  Entities/                — entity scenes (Player.tscn, Enemy.tscn)
  Levels/                  — level/map scenes
  VFX/                     — visual effect scenes
```

## Resources — Data Assets

```
resources/
  {Feature}/               — feature-specific resources (.tres)
  Configs/                 — configuration resources
  Themes/                  — UI themes
```

## Namespaces

Namespace is fixed by the second-level folder, independent of deeper nesting:

| Folder | Namespace |
|--------|-----------|
| `Application/Core/**` | `Game.Application.Core` |
| `Application/UI/**` | `Game.Application.UI` |
| `Gameplay/Common/**` | `Game.Gameplay.Common` |
| `Gameplay/System/**` | `Game.Gameplay` |
| `Gameplay/Core/**` | `Game.Gameplay` |
| `Gameplay/GameContext/**` | `Game.Gameplay.GameContext` |
| `Gameplay/GameObjects/**` | `Game.Gameplay.GameObjects` |
| `Gameplay/View/**` | `Game.Gameplay.View` |

Infrastructure folders (`System/`, `Core/`) use the parent `Game.Gameplay` namespace — they are internal plumbing, not a public API boundary. Feature-oriented folders (`GameContext/`, `GameObjects/`, `View/`) get their own sub-namespace.

## Dependency Flow

```
scripts/Gameplay/  ──→  modules/           (allowed)
modules/           ──→  modules/           (allowed, through interfaces)
modules/           ──→  scripts/Gameplay/  (FORBIDDEN)
```

Modules MUST NOT depend on project-specific code. Communication flows inward: project scripts depend on modules, never the reverse.
