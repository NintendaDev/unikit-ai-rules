---
version: 1.0.0
---

# Folder Structure & Namespaces

> **Scope**: Project folder organization, module structure, namespace conventions, external asset boundaries
> **Load when**: Creating new scripts, choosing file location, setting namespace, creating folders, module structure, folder layout

---

## External Assets

`Assets/Third-Party Assets`, `Assets/Plugins` — NEVER modify code in these folders.

## Assets/Modules — Independent Reusable Modules

Structure: `Modules/{ModuleName}/Scripts/` + `Tests/`. Submodules: `Modules/{ModuleName}/{SubModule}/Scripts/` + `Tests/`.
Each `Scripts` folder has its own Assembly Definition. Root Namespace = `Modules.{ModuleName}`.

## Assets/Game/Scripts — Project Integration Code

Project-specific code organized by **features, not by type**. This is a feature-based folder structure: related scripts (installers, controllers, views, models) live together inside their feature folder rather than being scattered across type-based directories like `Controllers/`, `Views/`, `Models/`.

> The tree below is a **universal example** of feature-based organization for a Unity game project. Adapt folder names and depth to your project's needs.

### Top-Level Folders

```
Application/     — global app-level systems (persist across scenes)
Gameplay/        — scene-specific gameplay logic
Debug/           — debug utilities, cheat tools
Editor/          — custom editor tools and inspectors
Generated/       — auto-generated code (do not edit manually)
```

### Application/ — Global Systems

```
Application/
  Core/
    Boot/
      LoadingOperations/  — app bootstrap sequence (ILoadingOperation implementations)
    Saves/                — global save serializers (SaveSerializer<TService, TData>)
    Audio/                — audio system setup
    {Feature}/            — each global feature in its own folder with its installer
  UI/
    Common/               — shared UI scripts and base classes
    MainMenu/             — main menu feature
    Content/              — concrete UI systems by feature
```

Each feature folder contains its own installer. The root `ApplicationInstaller` (ScriptableObjectInstaller) is the DI entry point that references feature installers.

### Gameplay/ — Scene-Specific Logic

```
Gameplay/
  Common/                 — shared gameplay utilities (e.g., object pools)

  System/                 — scene infrastructure (not gameplay logic)
    Bootstrap/
      LoadingOperations/  — scene loading sequence (ILoadingOperation implementations)
    DI/                   — DI installers for gameplay scenes
    Saves/                — scene-level save serializers
    {Feature}/            — scene-level system integrations (e.g., MiniGames adapter)

  Core/                   — gameplay mechanics, reusable within the scene
    {Feature}/            — each mechanic in its own folder (Dialogues, Movement, MiniGames)

  GameContext/            — GRASP controllers coordinating gameplay entities
    {Feature}/            — one folder per game domain (Customers, Trade, GameLoop, Items)

  GameObjects/
    Content/
      {Entity}/           — concrete entities (Player, Enemy), each with own installer
    {Domain}/             — domain-specific game objects outside Content (e.g., Wallet)

  View/
    UI/
      Core/               — UI framework extensions (custom binders, converters)
      Gameplay/
        {Feature}/        — gameplay UI by feature (Inventory, Counter, MiniGames, Wallet)
    VFX/
      {Feature}/          — visual effects by feature (Dialogues, Feedbacks, Wallet)
    Content/              — entity visuals (animation, presenters: MovePresenter, DamagePresenter)
    Audio/, Animation/    — audio and animation presenters
```

### Key Structural Distinctions

- **GameContext vs GameObjects/Content**: `GameObjects/Content/{Entity}/` holds the entity itself (model, factory, installer). `GameContext/{Feature}/` holds higher-level GRASP controllers that coordinate entities.
- **System vs Core**: `System/` is scene infrastructure (bootstrap, DI, saves). `Core/` is reusable gameplay mechanics (dialogues, movement). System wires things up; Core does the actual work.
- **View/UI/Core vs View/UI/Gameplay**: `UI/Core/` holds reusable UI building blocks (custom binders, converters, base views). `UI/Gameplay/{Feature}/` holds concrete feature UI (views + view models).

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
