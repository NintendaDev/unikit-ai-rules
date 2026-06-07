---
version: 1.0.0
---

# Folder Structure & Modules

> **Scope**: Project folder organization, module structure, namespace conventions, plugin boundaries, Build.cs patterns
> **Load when**: Creating new classes, choosing file location, setting up modules, creating folders, folder layout

---

## External Assets

`Plugins/` (third-party) — NEVER modify code in third-party plugin folders. Extend via subclassing, composition, or wrapper classes. Engine plugins in `Engine/Plugins/` are also off-limits.

## Source Modules — Independent Reusable Modules

Structure: `Source/{ModuleName}/Public/` + `Private/` + `{ModuleName}.Build.cs`. Each module has its own Build.cs defining dependencies.

```
Source/
  {ModuleName}/
    Public/                   — Headers (.h) exposed to other modules
      {ModuleName}/           — Optional subfolder matching module name
    Private/                  — Implementation (.cpp) + internal headers
    {ModuleName}.Build.cs     — Module build rules and dependencies
```

### Module Build.cs Template

```csharp
using UnrealBuildTool;

public class MyModule : ModuleRules
{
    public MyModule(ReadOnlyTargetRules Target) : base(Target)
    {
        PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;

        PublicDependencyModuleNames.AddRange(new string[]
        {
            "Core",
            "CoreUObject",
            "Engine",
        });

        PrivateDependencyModuleNames.AddRange(new string[]
        {
            // Internal-only dependencies
        });
    }
}
```

**Rules:**
- `PublicDependencyModuleNames` — types used in Public headers (exposed to dependents)
- `PrivateDependencyModuleNames` — types used only in Private code (not leaked to dependents)
- Minimize `PublicDependencyModuleNames` — keep the public API surface small

## Primary Game Module — Feature-Based Organization

Project-specific code organized by **features, not by type**. Related classes (controllers, components, data, widgets) live together inside their feature folder rather than being scattered across type-based directories like `Controllers/`, `Components/`, `Data/`.

> The tree below is a **universal example** of feature-based organization for a UE5 game project. Adapt folder names and depth to your project's needs.

### Top-Level Source Structure

```
Source/
  {ProjectName}/                — Primary game module
    Public/
      Application/              — Global systems (persist across maps)
      Gameplay/                 — Map-specific gameplay logic
      Debug/                    — Debug utilities, cheat manager extensions
    Private/
      Application/
      Gameplay/
      Debug/
    {ProjectName}.Build.cs
    {ProjectName}Module.cpp     — Module implementation (StartupModule/ShutdownModule)
```

### Application/ — Global Systems

```
Application/
  Core/
    Boot/                       — Game instance setup, loading operations
    Saves/                      — Save game system (USaveGame subclasses)
    Audio/                      — Audio system setup, sound manager
    {Feature}/                  — Each global feature in its own folder
  Settings/
    {Feature}Settings.h         — UDeveloperSettings subclasses for project settings
  UI/
    Common/                     — Shared UI widgets and base classes
    MainMenu/                   — Main menu feature
    Content/                    — Concrete UI systems by feature
```

### Gameplay/ — Map-Specific Logic

```
Gameplay/
  Common/                       — Shared gameplay utilities

  Framework/                    — Gameplay Framework extensions (not gameplay logic)
    GameModes/                  — AGameModeBase subclasses
    GameStates/                 — AGameStateBase subclasses
    PlayerControllers/          — APlayerController subclasses
    PlayerStates/               — APlayerState subclasses

  Core/                         — Gameplay mechanics, reusable within the level
    {Feature}/                  — Each mechanic in its own folder (Dialogue, Trading, MiniGames)

  Entities/
    {Entity}/                   — Concrete entities (Player, Customer, Item)
      Components/               — Entity-specific components
      Data/                     — Entity data assets and structs

  View/
    UI/
      Core/                     — UI framework extensions (custom widgets, converters)
      Gameplay/
        {Feature}/              — Gameplay UI by feature (Inventory, Shop, HUD)
    VFX/
      {Feature}/                — Visual effects by feature (Niagara systems, materials)
    Animation/                  — Animation Blueprints, Montages references
```

### Key Structural Distinctions

- **Framework vs Entities**: `Framework/` holds Gameplay Framework subclasses (GameMode, GameState). `Entities/{Entity}/` holds concrete game entities with their components and data
- **Framework vs Core**: `Framework/` is map infrastructure (game rules, player setup). `Core/` is reusable gameplay mechanics (dialogue, trading). Framework wires things up; Core does the actual work
- **View/UI/Core vs View/UI/Gameplay**: `UI/Core/` holds reusable UI building blocks (custom widgets, converters). `UI/Gameplay/{Feature}/` holds concrete feature UI

## Content/ — Assets

```
Content/
  {ProjectName}/                — Project-specific assets (avoid loose files in root Content/)
    Blueprints/
      {Feature}/                — Blueprint assets organized by feature
    Data/
      DataTables/               — UDataTable assets (.csv → .uasset)
      DataAssets/               — UDataAsset instances
      Curves/                   — UCurveFloat, UCurveVector assets
    Maps/
      {MapName}/                — Level assets + sub-levels
    UI/
      Widgets/                  — UMG Widget Blueprints
      Materials/                — UI materials
    Characters/
      {CharacterName}/          — Meshes, Materials, AnimBP, Montages
    Environment/
      {Category}/               — Meshes, Materials, Textures by environment type
    VFX/
      {Feature}/                — Niagara systems, particle materials
    Audio/
      SFX/                      — Sound effects
      Music/                    — Background music
      SoundCues/                — Sound Cue assets
    Materials/
      Master/                   — Master materials
      Instances/                — Material instances by category
```

### Content Naming Conventions

| Type | Prefix | Example |
|------|--------|---------|
| Blueprint | `BP_` | `BP_PlayerCharacter` |
| Widget Blueprint | `WBP_` | `WBP_InventoryPanel` |
| Material | `M_` | `M_MasterLit` |
| Material Instance | `MI_` | `MI_WoodFloor` |
| Texture | `T_` | `T_Wood_D` (diffuse), `T_Wood_N` (normal) |
| Static Mesh | `SM_` | `SM_Chair` |
| Skeletal Mesh | `SK_` | `SK_PlayerCharacter` |
| Animation Montage | `AM_` | `AM_Attack` |
| Animation Blueprint | `ABP_` | `ABP_PlayerCharacter` |
| Niagara System | `NS_` | `NS_MuzzleFlash` |
| Sound Cue | `SC_` | `SC_Footstep` |
| Data Table | `DT_` | `DT_ItemDatabase` |
| Data Asset | `DA_` | `DA_WeaponConfig` |
| Enum | `E_` | `E_WeaponType` |
| Curve | `C_` | `C_DamageFalloff` |

## Config/ — Project Configuration

```
Config/
  DefaultEngine.ini             — Engine settings
  DefaultGame.ini               — Game settings
  DefaultInput.ini              — Input mappings
  DefaultEditor.ini             — Editor preferences
  Default{Custom}.ini           — Custom config sections
```

Access via `GConfig`:
```cpp
GConfig->GetString(TEXT("/Script/MyModule.MySettings"), TEXT("PropertyName"), Value, GGameIni);
```

Prefer `UDeveloperSettings` over raw `.ini` editing — type-safe, Blueprint-accessible, shows in Project Settings.

## Plugins/ — Project Plugins

```
Plugins/
  {PluginName}/
    Source/
      {PluginName}/
        Public/
        Private/
        {PluginName}.Build.cs
    Content/                    — Plugin content assets
    {PluginName}.uplugin        — Plugin descriptor
```

Use plugins for:
- Reusable systems shared across projects
- Third-party integrations with clear boundaries
- Optional features that can be toggled

## Dependency Flow

```
Source/{GameModule}/  ──→  Source/{SharedModules}/  (allowed)
Source/{SharedModules}/ ──→  Source/{SharedModules}/ (allowed, through interfaces)
Source/{SharedModules}/ ──→  Source/{GameModule}/    (FORBIDDEN)
Plugins/              ──→  Engine modules only       (should not depend on game modules)
```

Modules MUST NOT depend on the primary game module. Communication flows inward: game module depends on shared modules, never the reverse. Use interfaces or delegates for reverse communication.
