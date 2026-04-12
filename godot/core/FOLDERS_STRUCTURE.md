---
version: 1.0.0
---

# Folder Structure

> **Scope**: Project folder organization, module structure, file conventions, external asset boundaries
> **Load when**: Creating new scripts, choosing file location, creating folders, module structure, folder layout

---

## External Assets

`addons/` (third-party plugins) — NEVER modify code in third-party addon folders. Extend via subclassing, composition, or wrapper scripts.

## Modules — Independent Reusable Modules

Structure: `modules/{module_name}/` with `scripts/`, `resources/`, and `tests/` subfolders.
Each module is self-contained and can be extracted into a separate project or addon.

```
modules/
  {module_name}/
    scripts/           — GDScript source files
    resources/         — Custom Resource types (.tres, .gd)
    tests/             — GUT test files
    scenes/            — Module-specific scenes (.tscn)
```

## Project Scripts — Feature-Based Organization

Project-specific code organized by **features, not by type**. Related scripts (controllers, views, data, resources) live together inside their feature folder rather than being scattered across type-based directories like `controllers/`, `views/`, `data/`.

> The tree below is a **universal example** of feature-based organization for a Godot game project. Adapt folder names and depth to your project's needs.

### Top-Level Folders

```
scripts/
  application/       — global app-level systems (autoloads, persist across scenes)
  gameplay/          — scene-specific gameplay logic
  debug/             — debug utilities, cheat tools
```

### scripts/application/ — Global Systems

```
application/
  core/
    boot/
      loading_operations/  — app bootstrap sequence
    saves/                 — global save/load system
    audio/                 — audio system setup
    {feature}/             — each global feature in its own folder
  ui/
    common/                — shared UI scripts and base classes
    main_menu/             — main menu feature
    content/               — concrete UI systems by feature
```

Each feature folder contains its own setup. The root autoload(s) are the entry point that wire feature systems together.

### scripts/gameplay/ — Scene-Specific Logic

```
gameplay/
  common/                  — shared gameplay utilities

  system/                  — scene infrastructure (not gameplay logic)
    bootstrap/             — scene loading sequence
    di/                    — dependency wiring (manual DI or composition root)
    saves/                 — scene-level save serializers
    {feature}/             — scene-level system integrations

  core/                    — gameplay mechanics, reusable within the scene
    {feature}/             — each mechanic in its own folder (dialogues, movement, mini_games)

  game_context/            — controllers coordinating gameplay entities
    {feature}/             — one folder per game domain (customers, trade, game_loop, items)

  game_objects/
    content/
      {entity}/            — concrete entities (player, enemy), each with own setup
    {domain}/              — domain-specific game objects outside content

  view/
    ui/
      core/                — UI framework extensions (custom controls, converters)
      gameplay/
        {feature}/         — gameplay UI by feature (inventory, counter, wallet)
    vfx/
      {feature}/           — visual effects by feature (dialogues, feedbacks)
    content/               — entity visuals (animation, presenters)
    audio/                 — audio presenters
```

### Key Structural Distinctions

- **game_context vs game_objects/content**: `game_objects/content/{entity}/` holds the entity itself (data, factory, scene). `game_context/{feature}/` holds higher-level controllers that coordinate entities
- **system vs core**: `system/` is scene infrastructure (bootstrap, DI, saves). `core/` is reusable gameplay mechanics. System wires things up; Core does the actual work
- **view/ui/core vs view/ui/gameplay**: `ui/core/` holds reusable UI building blocks (custom controls, converters, base views). `ui/gameplay/{feature}/` holds concrete feature UI

## Scenes — Scene Files (.tscn)

```
scenes/
  main.tscn                — application entry point
  gameplay.tscn            — main gameplay scene
  ui/                      — reusable UI scenes
  entities/                — entity scenes (player.tscn, enemy.tscn)
  levels/                  — level/map scenes
  vfx/                     — visual effect scenes
```

## Resources — Data Assets

```
resources/
  {feature}/               — feature-specific resources (.tres)
  configs/                 — configuration resources
  themes/                  — UI themes
```

## Assets — Art & Audio

```
assets/
  sprites/                 — 2D sprites and textures
  models/                  — 3D models
  audio/
    sfx/                   — sound effects
    music/                 — background music
  fonts/                   — font files
  shaders/                 — shader files (.gdshader)
  materials/               — material resources
```

## Dependency Flow

```
scripts/gameplay/  ──→  modules/           (allowed)
modules/           ──→  modules/           (allowed, through abstract base classes)
modules/           ──→  scripts/gameplay/  (FORBIDDEN)
```

Modules MUST NOT depend on project-specific code. Communication flows inward: project scripts depend on modules, never the reverse.
