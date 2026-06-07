---
version: 1.0.0
---

# Unreal Build System

> **Scope**: UnrealBuildTool (UBT) configuration — Build.cs module rules, Target.cs target setup, module types and loading phases, IWYU include discipline, conditional compilation, and third-party library integration for UE5 C++ projects.
> **Load when**: configuring Build.cs dependencies, authoring a new module, setting up Target.cs for a project or plugin, choosing module type or loading phase, integrating a third-party library, enabling a plugin in code, diagnosing include or linking errors, optimizing build times.

---

## How UBT Works

UnrealBuildTool (UBT) is the build orchestrator:

1. Compiles `.Target.cs` and `.Build.cs` C# files at startup to obtain the build graph
2. Resolves the module dependency tree from all `*DependencyModuleNames` lists
3. Runs Unreal Header Tool (UHT) for all modules containing `UCLASS` / `USTRUCT` / `UENUM`
4. Generates compiler/linker command sequences and invokes the platform toolchain

**Key rule:** UBT builds from `.Target.cs` / `.Build.cs` — it ignores IDE `.sln` / `.vcxproj` files. Editing the IDE solution does not change what gets compiled. All dependency and compilation settings must live in Build.cs.

---

## Build.cs — Module Rules

Every module must have `[ModuleName].Build.cs` at its root, defining one class that inherits `ModuleRules`.

### Dependency Types

| Property | Visibility | When to Use |
|----------|-----------|-------------|
| `PublicDependencyModuleNames` | Exposed to dependents | Types from this dependency appear in your **public headers** |
| `PrivateDependencyModuleNames` | Hidden from dependents | Types used only in `.cpp` files or private headers |
| `DynamicallyLoadedModuleNames` | Loaded at runtime | Modules loaded manually via `FModuleManager::LoadModuleChecked<>()` |

**Default to private.** A dependency is public only when a type from it appears in a public `.h` file. Use forward declarations in headers to eliminate unnecessary public dependencies and reduce dependent module compile times.

```csharp
using UnrealBuildTool;

public class MyModule : ModuleRules
{
    public MyModule(ReadOnlyTargetRules Target) : base(Target)
    {
        PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;

        // Public: types appear in public headers (e.g., FVector, UObject)
        PublicDependencyModuleNames.AddRange(new string[]
        {
            "Core",
        });

        // Private: used only in .cpp files — keep as much here as possible
        PrivateDependencyModuleNames.AddRange(new string[]
        {
            "CoreUObject",
            "Engine",
        });
    }
}
```

### PCH and IWYU Settings

| Setting | Effect |
|---------|--------|
| `PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs` | **Recommended for all new modules.** Each file explicitly includes its own dependencies. Required for IWYU compliance. |
| `PCHUsage = PCHUsageMode.UseSharedPCHs` | Legacy mode. Relies on shared PCHs and implicit transitive includes. |
| `bEnforceIWYU = true` | UBT validates that no source file relies on transitive includes. Recommended after adopting explicit includes. |

Always set `PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs` in new modules.

### Conditional Compilation in Build.cs

```csharp
public MyModule(ReadOnlyTargetRules Target) : base(Target)
{
    PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;

    PublicDependencyModuleNames.Add("Core");
    PrivateDependencyModuleNames.AddRange(new string[] { "CoreUObject", "Engine" });

    // Editor-only dependency — mandatory guard
    if (Target.bBuildEditor)
    {
        PrivateDependencyModuleNames.Add("UnrealEd");
    }

    // Platform-specific
    if (Target.Platform == UnrealTargetPlatform.Win64)
    {
        PrivateDependencyModuleNames.Add("WindowsPlatformFeatures");
    }

    // Feature-gated dependency — only for non-server targets
    if (Target.Type != TargetType.Server)
    {
        PrivateDependencyModuleNames.Add("OnlineSubsystem");
    }
}
```

### Adding a Plugin Dependency

1. Enable the plugin in `.uproject` (`"Enabled": true` in the Plugins array)
2. Declare the dependency in Build.cs:

```csharp
PrivateDependencyModuleNames.Add("MyPlugin"); // must match plugin's module Name
```

Forgetting step 2 causes `#include "MyPlugin/..."` to fail at compile time even though the plugin is "enabled" in the editor.

### Third-Party Library Integration

```csharp
// Always use ModuleDirectory + Path.Combine — never hardcode absolute paths
string ThirdPartyPath = Path.Combine(ModuleDirectory, "ThirdParty", "MyLib");

PublicIncludePaths.Add(Path.Combine(ThirdPartyPath, "include"));
PublicAdditionalLibraries.Add(Path.Combine(ThirdPartyPath, "lib", "Win64", "MyLib.lib"));
RuntimeDependencies.Add(Path.Combine(ThirdPartyPath, "bin", "Win64", "MyLib.dll"));
```

---

## Target.cs — Target Rules

`.Target.cs` defines one build target (Game, Editor, Client, Server, or Program). A project typically has `GameName.Target.cs` (Game) and `GameNameEditor.Target.cs` (Editor).

### Minimal Template

```csharp
using UnrealBuildTool;

public class MyProjectTarget : TargetRules
{
    public MyProjectTarget(TargetInfo Target) : base(Target)
    {
        Type = TargetType.Game;
        DefaultBuildSettings = BuildSettingsVersion.Latest;   // latest UBT behavior
        IncludeOrderVersion = EngineIncludeOrderVersion.Latest; // current include strategy

        ExtraModuleNames.Add("MyProject");
    }
}
```

### Target Types

| Type | Description | When to Use |
|------|-------------|-------------|
| `Game` | Standalone game (client + server code) | Main game executable |
| `Client` | Game without server code | Client-only multiplayer build |
| `Server` | Game without client code, no rendering | Dedicated server |
| `Editor` | Extends the Unreal Editor | Always pair with a `Game` target |
| `Program` | Standalone utility, no full engine startup | CLI tools, automation programs |

### Build Configurations

| Configuration | Optimization | Debug Info | Typical Use |
|--------------|-------------|------------|-------------|
| `Debug` | None | Full | Debugging engine code |
| `DebugGame` | Engine optimized, game debug | Game symbols | Debugging your game code |
| `Development` | Balanced | Partial | **Daily development** |
| `Test` | Shipping-like | Minimal | QA, profiling |
| `Shipping` | Full | None | Release build |

Use `Development` for daily work; use `DebugGame` when stepping through your own C++ code in a debugger.

---

## Module Types and Loading Phases

### Module Types (in `.uproject` / `.uplugin`)

| Type | Loaded In | Stripped From | Use Case |
|------|-----------|---------------|----------|
| `Runtime` | Game, Editor, Server | — | Core gameplay systems |
| `RuntimeNoCommandlet` | Game, Editor | Commandlets | Input, UI systems |
| `Editor` | Editor only | Game, Server, Shipping | Blueprint/asset tooling |
| `EditorNoCommandlet` | Editor only (no commandlets) | Game, Server, Shipping | Editor widgets, inspectors |
| `Developer` | Development + Editor | **Shipping** | Debug overlays, profiling, cheat systems |
| `Program` | Standalone programs only | — | CLI tools |

**Critical:** Runtime modules must **never** depend on Editor modules. This breaks non-editor configurations (Game, Server, Shipping). Isolate all editor-specific code in a separate `Editor` type module.

### Loading Phases

| Phase | Timing | Use Case |
|-------|--------|----------|
| `EarliestPossible` | Before config/pak system | Compression format plugins, pak file readers |
| `PostConfigInit` | After `.ini` config system | Modules that need config values at boot |
| `PreLoadingScreen` | Before engine init | Custom loading screen implementations |
| `PreDefault` | Just before Default | Modules that Default-phase modules depend on |
| `Default` | During engine init | **Standard — use unless there is a specific reason not to** |
| `PostDefault` | Just after Default | Modules that depend on Default-phase modules |
| `PostEngineInit` | After engine fully initialized | Modules needing a fully warmed-up engine |
| `None` | Manual only | Modules loaded explicitly via `FModuleManager` |

Use `Default` unless you have a specific bootstrap requirement. An incorrect loading phase causes crashes at startup or "module not found" errors when other systems try to use it.

---

## IWYU — Include Discipline

IWYU (Include What You Use) means each file explicitly includes every header it directly uses, rather than relying on transitive includes pulled in by PCHs or other headers.

### Header Rules

```cpp
// MyComponent.h — always include CoreMinimal.h, never Engine.h
#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "MyComponent.generated.h"  // MUST be the last include in every UObject header
```

```cpp
// MyComponent.cpp — include own header first, then the rest
#include "MyComponent.h"

#include "Engine/World.h"
#include "GameFramework/Actor.h"
```

### CoreMinimal.h vs Engine.h

| Header | Size | Rule |
|--------|------|------|
| `CoreMinimal.h` | Minimal — core types only (`FString`, `TArray`, `UObject` base) | **Use in all headers** |
| `Engine.h` | Monolithic — pulls in most of the engine | **Never use in headers**; only in `.cpp` if unavoidable |

Include specific headers for specific types: `"Engine/World.h"` for `UWorld`, `"GameFramework/Actor.h"` for `AActor`, `"Kismet/GameplayStatics.h"` for `UGameplayStatics`.

### Build.cs Settings for IWYU Compliance

```csharp
PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs; // required
bEnforceIWYU = true;                              // recommended for new modules
```

---

## Best Practices

- **Never depend on the primary game module from shared modules** — see `folders-structure.md` for dependency flow rules; shared modules communicate back via interfaces or delegates
- **Isolate editor code in a separate `[Module]Editor` module** — use `#if WITH_EDITOR` only for small inline additions (e.g., a details customization registration); avoid scattering editor logic throughout Runtime code
- **Guard `UnrealEd` and other editor-only modules** — always wrap with `if (Target.bBuildEditor)` to avoid link errors in non-editor configurations
- **Keep `ExtraModuleNames` lean in Target.cs** — each extra module expands rebuild scope; plugins register their own modules automatically via `.uplugin`
- **Set `DefaultBuildSettings = BuildSettingsVersion.Latest`** — picks up UBT improvements and is required by some modern engine features
- **Set `IncludeOrderVersion = EngineIncludeOrderVersion.Latest`** — aligns the module's include resolution strategy with the current engine version
- **Use `DynamicallyLoadedModuleNames` for optional runtime modules** — modules that may not be present on all platforms or configurations should be loaded via `FModuleManager` rather than statically linked

---

## Anti-patterns

- **Putting all dependencies in `PublicDependencyModuleNames`** — leaks compile-time dependencies to every module that depends on yours, multiplying compile times and increasing coupling; default to private
- **Using `Engine.h` in headers** — include `CoreMinimal.h` plus specific narrow headers instead
- **Runtime module depending on an Editor module** — compiles in Editor but fails in Game, Server, and Shipping configurations; always separate editor code into its own `Editor` type module
- **Circular module dependencies** — UBT reports an error; redesign using interfaces or dependency inversion
- **Hardcoded absolute paths in third-party integration** — always construct paths relative to `ModuleDirectory` using `Path.Combine`
- **Wrong module type for debug/profiling code** — debug overlays and profiling utilities belong in a `Developer` module, not `Runtime`; `Developer` modules are stripped from Shipping builds automatically
- **Wrong loading phase** — defaulting to `PostEngineInit` for a module that other Default-phase modules depend on causes a crash at startup; use `Default` unless you have a documented reason for a different phase
- **Enabling a plugin in `.uproject` without declaring it in Build.cs** — the plugin is enabled in the editor but its headers are unavailable to the compiler; both steps are required
