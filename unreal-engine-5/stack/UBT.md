---
version: 1.0.0
---

# Unreal Build Tool (UBT)

> **Scope**: Unreal Build Tool — Build.cs module rules, Target.cs target configuration, module dependencies, PCH/IWYU, module types, loading phases, plugin descriptors, build environments, link types
> **Load when**: Build.cs, Target.cs, ModuleRules, TargetRules, PublicDependencyModuleNames, PrivateDependencyModuleNames, PCHUsage, IWYU, module, plugin, .uplugin, .uproject, ExtraModuleNames, DynamicallyLoadedModuleNames, MODULE_API, build configuration, UBT

---

## Core Concepts

Unreal Build Tool (UBT) is the custom build orchestrator for UE5. It reads C# `.Build.cs` and `.Target.cs` files, compiles them into a Rules assembly (`Intermediate/Build/BuildRules/`), then drives the actual C++ compilation.

**Pipeline:** `.Build.cs` + `.Target.cs` → Rules Assembly (DLL) → C++ Compilation

- **Target.cs** — defines the build target (Game, Editor, Server, etc.), global settings, and which modules to include. One per executable.
- **Build.cs** — defines per-module compilation rules: dependencies, PCH, include paths, preprocessor defines. One per module.

UBT ignores IDE solution files — the `.Build.cs`/`.Target.cs` files are the sole source of truth.

---

## Build.cs (ModuleRules)

Every module requires a `[ModuleName].Build.cs` in the module root. The class inherits from `ModuleRules`.

### Minimal Example

```csharp
using UnrealBuildTool;

public class MyModule : ModuleRules
{
    public MyModule(ReadOnlyTargetRules Target) : base(Target)
    {
        PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;

        PublicDependencyModuleNames.AddRange(new string[]
        {
            "Core"
        });

        PrivateDependencyModuleNames.AddRange(new string[]
        {
            "CoreUObject",
            "Engine"
        });
    }
}
```

### Key Properties

| Property | Type | Purpose |
|----------|------|---------|
| `PCHUsage` | `PCHUsageMode` | PCH strategy — always use `UseExplicitOrSharedPCHs` |
| `PublicDependencyModuleNames` | `List<string>` | Modules exposed to dependents (transitive) |
| `PrivateDependencyModuleNames` | `List<string>` | Modules used only internally (non-transitive) |
| `DynamicallyLoadedModuleNames` | `List<string>` | Runtime-loaded modules (no compile-time linking) |
| `PublicIncludePaths` | `List<string>` | Additional public include directories |
| `PrivateIncludePaths` | `List<string>` | Additional private include directories |
| `PublicDefinitions` | `List<string>` | Preprocessor defines exposed to dependents |
| `PrivateDefinitions` | `List<string>` | Preprocessor defines for internal use only |
| `bEnforceIWYU` | `bool` | Enforce Include-What-You-Use (set `true`) |
| `CppStandard` | `CppStandardVersion` | C++ standard version (`Cpp17`, `Cpp20`, `Latest`) |
| `OptimizeCode` | `CodeOptimization` | Override optimization (`Never`, `InNonDebugBuilds`, `Always`) |
| `bUseUnity` | `bool` | Unity build (merges .cpp files) — `true` by default |
| `bPrecompile` | `bool` | Precompile this module for distribution |

### Public vs Private Dependencies

- **PublicDependencyModuleNames** — use ONLY when your **public headers** `#include` headers from that module. Everything in Public is transitive to downstream modules.
- **PrivateDependencyModuleNames** — use when the dependency is only needed in `.cpp` files or `Private/` headers. Does NOT propagate to dependents.

```
Module A (Public depends on Core, Engine)
└── Module B depends on A
    └── B automatically sees Core and Engine headers (transitive)

Module A (Private depends on Slate)
└── Module B depends on A
    └── B does NOT see Slate headers (non-transitive)
```

**Rule:** Default to `PrivateDependencyModuleNames`. Only promote to `PublicDependencyModuleNames` when a public header actually includes from that module. Over-using public dependencies bloats transitive include paths for every downstream module.

### PCH & IWYU Configuration

```csharp
PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;
bEnforceIWYU = true;
```

- `UseExplicitOrSharedPCHs` — the modern UE5 standard. Each module either uses its own explicit PCH or shares one from a dependency.
- `bEnforceIWYU = true` — each `.cpp` file must include exactly what it uses. Prevents hidden dependency on PCH contents.
- Avoid `NoPCHs` (slow builds) and `UseSharedPCHs` (legacy).

### Conditional Logic

Build.cs is regular C# — use `Target` properties for platform/config branching:

```csharp
if (Target.bBuildEditor)
{
    PrivateDependencyModuleNames.Add("UnrealEd");
}

if (Target.Platform == UnrealTargetPlatform.Win64)
{
    PublicDefinitions.Add("PLATFORM_SUPPORTS_FEATURE=1");
}
```

---

## Target.cs (TargetRules)

Defines the build target. Class inherits from `TargetRules`.

### Minimal Example

```csharp
using UnrealBuildTool;

public class MyGameTarget : TargetRules
{
    public MyGameTarget(TargetInfo Target) : base(Target)
    {
        Type = TargetType.Game;
        DefaultBuildSettings = BuildSettingsVersion.Latest;
        IncludeOrderVersion = EngineIncludeOrderVersion.Latest;
        ExtraModuleNames.Add("MyGame");
    }
}
```

### Target Types

| Type | Purpose | Typical Use |
|------|---------|-------------|
| `Game` | Standalone game build | Shipping, testing |
| `Editor` | Editor build with tool support | Development |
| `Client` | Client-only (multiplayer) | Dedicated client builds |
| `Server` | Dedicated server (no rendering) | Server builds |
| `Program` | Standalone utility outside engine | Custom tools |

### Key Properties

| Property | Purpose |
|----------|---------|
| `Type` | Target type (`Game`, `Editor`, `Client`, `Server`, `Program`) |
| `DefaultBuildSettings` | Build settings version — use `BuildSettingsVersion.Latest` |
| `IncludeOrderVersion` | Include order version — use `EngineIncludeOrderVersion.Latest` |
| `ExtraModuleNames` | Root modules to include in this target |
| `LinkType` | `Modular` (multiple DLLs, hot reload) or `Monolithic` (single DLL, shipping) |
| `BuildEnvironment` | `Shared` (launcher engine) or `Unique` (source build) |
| `bUseUnityBuild` | Enable unity builds globally |
| `bEnforceIWYU` | Enforce IWYU globally |
| `CustomConfig` | Custom config variant (loads `Config/Custom/{NAME}/` files) |

### Link Type

- **Modular** — default for Editor targets. Multiple DLLs, supports Hot Reload / Live Coding.
- **Monolithic** — default for Game targets. Single DLL, faster startup, required for shipping.

### Build Environment

- **Shared** — pre-built engine from Epic Launcher. Cannot modify PCH or plugin states for targets.
- **Unique** — source engine build. Full control over plugins, PCH, and build settings.

To use `EnablePlugins` / `DisablePlugins` in non-editor targets:
```csharp
BuildEnvironment = TargetBuildEnvironment.Unique;
```

### Build Configurations

| Configuration | Purpose |
|--------------|---------|
| `Debug` | Full debugging, no optimization |
| `DebugGame` | Engine optimized, game code debug |
| `Development` | Default development build |
| `Test` | Near-shipping with console commands |
| `Shipping` | Final release, stripped |

### Centralized Settings Pattern (Lyra)

Share settings across multiple targets with a static method:

```csharp
public class MyGameTarget : TargetRules
{
    public MyGameTarget(TargetInfo Target) : base(Target)
    {
        Type = TargetType.Game;
        ApplySharedSettings(this);
    }

    internal static void ApplySharedSettings(TargetRules Target)
    {
        Target.DefaultBuildSettings = BuildSettingsVersion.Latest;
        Target.IncludeOrderVersion = EngineIncludeOrderVersion.Latest;
        // Common settings...
    }
}

public class MyGameEditorTarget : TargetRules
{
    public MyGameEditorTarget(TargetInfo Target) : base(Target)
    {
        Type = TargetType.Editor;
        MyGameTarget.ApplySharedSettings(this);
    }
}
```

This works because UBT compiles ALL `.Target.cs` files into a single Rules assembly.

---

## Module Types & Loading Phases

### Module Types (in .uproject / .uplugin)

| Type | Loaded In | Use Case |
|------|-----------|----------|
| `Runtime` | All builds including shipping | Gameplay code |
| `RuntimeNoCommandlet` | All builds except commandlets | Code that needs a game world |
| `Developer` | Development & Editor only | Debug tools, not in shipping |
| `Editor` | Editor only | Editor extensions, custom tools |
| `EditorNoCommandlet` | Editor except commandlets | Editor UI tools |
| `Program` | Standalone programs only | Build utilities |

### Loading Phases

| Phase | When | Use Case |
|-------|------|----------|
| `EarliestPossible` | As soon as possible | Low-level platform modules |
| `PostConfigInit` | After config system init | Shader plugins, rendering modules |
| `PostSplashScreen` | After splash screen | Early UI modules |
| `PreEarlyLoadingScreen` | Before loading screen | Loading screen modules |
| `PreLoadingScreen` | Before loading screen | Asset-heavy modules |
| `PreDefault` | Before default phase | Modules other default modules depend on |
| `Default` | Normal loading | Most gameplay modules |
| `PostDefault` | After default phase | Modules that depend on default modules |
| `PostEngineInit` | After engine fully initialized | Modules needing full engine |
| `None` | Not automatically loaded | Manually loaded modules |

### Module Descriptor Example

```json
"Modules": [
    {
        "Name": "MyGame",
        "Type": "Runtime",
        "LoadingPhase": "Default"
    },
    {
        "Name": "MyGameEditor",
        "Type": "Editor",
        "LoadingPhase": "Default"
    }
]
```

---

## API Export Macro

Every class, function, or variable visible across DLL boundaries requires the `MYMODULE_API` macro:

```cpp
// In MyModule's public header
class MYMODULE_API UMyComponent : public UActorComponent
{
    GENERATED_BODY()
    // ...
};

// Functions
MYMODULE_API void MyGlobalFunction();

// Enums and structs
enum class MYMODULE_API EMyEnum : uint8 { Value1, Value2 };
```

UBT auto-generates the `MYMODULE_API` macro based on the module name (uppercased with underscores). Missing this macro causes `unresolved external symbol` linker errors when another module references the symbol.

---

## Plugin Configuration

### Plugin Descriptor (.uplugin)

```json
{
    "FileVersion": 3,
    "Version": 1,
    "VersionName": "1.0",
    "FriendlyName": "My Plugin",
    "Description": "Plugin description",
    "Category": "Gameplay",
    "EnabledByDefault": false,
    "CanContainContent": true,
    "Modules": [
        {
            "Name": "MyPlugin",
            "Type": "Runtime",
            "LoadingPhase": "Default"
        }
    ]
}
```

### Plugin in Target.cs

```csharp
// Requires Unique build environment for non-editor targets
BuildEnvironment = TargetBuildEnvironment.Unique;
EnablePlugins.Add("MyPlugin");
DisablePlugins.Add("UnwantedPlugin");
```

### Plugin Metadata Fields

| Field | Purpose |
|-------|---------|
| `EnabledByDefault` | Auto-enable — `false` for game feature plugins |
| `ExplicitlyLoaded` | `true` for game feature plugins (loaded by GFP subsystem) |
| `EditorOnly` | Exclude from runtime builds |
| `NeverBuild` | Force exclusion from all builds |

---

## Best Practices

- Always set `PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs` and `bEnforceIWYU = true`
- Default dependencies to `PrivateDependencyModuleNames` — only promote to Public when public headers require it
- Use `DefaultBuildSettings = BuildSettingsVersion.Latest` and `IncludeOrderVersion = EngineIncludeOrderVersion.Latest` in Target.cs
- Register every module in `.uproject` or `.uplugin` — UBT ignores modules not listed in descriptors
- Add the `MODULE_API` macro to all symbols that cross DLL boundaries
- Use the centralized settings pattern (static method) when you have multiple targets
- Set `BuildEnvironment = TargetBuildEnvironment.Unique` only when needed (source builds)
- Use `DynamicallyLoadedModuleNames` for optional modules loaded at runtime without compile-time linking

## Anti-patterns

- **Putting everything in PublicDependencyModuleNames** — bloats transitive includes for all downstream modules. Only use when public headers `#include` from that module.
- **Forgetting MODULE_API macro** — causes `unresolved external symbol` linker errors. Every cross-DLL symbol needs it.
- **Not registering module in .uproject/.uplugin** — UBT silently skips the module. Compilation succeeds but the module doesn't exist at runtime.
- **Using `NoPCHs`** — dramatically slows builds. Use `UseExplicitOrSharedPCHs` instead.
- **Relying on PCH for includes** — code compiles but breaks when PCH changes. Enable IWYU to catch missing includes.
- **Editor dependencies in Runtime modules** — adding `UnrealEd` to a Runtime module causes packaging failures. Guard with `if (Target.bBuildEditor)`.
- **Stale Rules assembly** — when updating plugins with preserved timestamps, the Rules assembly may not rebuild. Clean `Intermediate/Build/BuildRules/` if builds behave unexpectedly after plugin updates.
- **Multiple UBT instances** — in Visual Studio, limit parallel project builds to 1 (Tools > Options). UBT handles internal parallelization; multiple instances cause file access conflicts.
