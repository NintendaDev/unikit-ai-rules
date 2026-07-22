---
version: 1.0.0
---

# Material System

> **Scope**: Unreal Engine 5 material authoring and runtime material management — choosing between UMaterialInstanceDynamic, UMaterialInstanceConstant, Material Parameter Collections, and Custom Primitive Data; C++ parameter API; parent material architecture; shader permutation management.
> **Load when**: creating or modifying materials at runtime, setting up UMaterialInstanceDynamic in C++, using Material Parameter Collections, designing parent material hierarchies, optimizing draw calls or Nanite shading bins related to materials, swapping textures at runtime, animating material parameters per-frame.

---

## Core Concepts

UE5 materials form a class hierarchy: `UMaterialInterface` → `UMaterial` (parent) → `UMaterialInstance` → `UMaterialInstanceConstant` (editor asset) / `UMaterialInstanceDynamic` (runtime object). All instances share the parent's compiled shader; only parameter values differ — 100 instances of one parent consume essentially the same shader memory as a single instance.

**Material Instance Constant (MIC)** — editor-created asset (`MI_` prefix). Supports static and dynamic parameter overrides baked at save time. Zero per-frame GPU overhead. Use for every material variation that does not change during gameplay (color variants, weapon skins).

**Material Instance Dynamic (MID)** — runtime-only `UObject` created in C++ or Blueprint. Supports only dynamic (scalar, vector, texture) parameter changes. Each MID is a distinct `UObject` and may break draw call batching in non-Nanite pipelines or increase shading bins under Nanite. Use when parameters must change during gameplay and Custom Primitive Data is insufficient.

**Material Parameter Collection (MPC)** — editor asset (`MPC_` prefix) holding global scalar and vector parameters shared by any material that references it. Best for world-wide effects (time-of-day, wind, weather). Limits: max **2 MPC references per material**; max **1024 scalars + 1024 vectors** per collection.

**Custom Primitive Data** — floats stored directly on a `UPrimitiveComponent` (up to 36 by default). Zero extra `UObject`s, preserves draw call batching, instances sharing the same base material stay in one Nanite shading bin. Use for 1–4 numeric per-instance parameters (dissolve progress, damage tint intensity) when no texture swap is required.

## API / Interface

### UMaterialInstanceDynamic

```cpp
// Preferred: let the component manage instance lifetime
UMaterialInstanceDynamic* MID = MeshComp->CreateDynamicMaterialInstance(0 /*slot index*/);

// Alternative: explicit factory (when the component is not the natural owner)
UMaterialInstanceDynamic* MID = UMaterialInstanceDynamic::Create(BaseMaterial, Outer);
MeshComp->SetMaterial(0, MID);

// Parameter setters — names must match Material Editor exactly (case-sensitive)
MID->SetScalarParameterValue(TEXT("Roughness"), 0.5f);
MID->SetVectorParameterValue(TEXT("BaseColor"), FLinearColor::Red);
MID->SetTextureParameterValue(TEXT("MainTex"), MyTexture);

// Per-frame optimization: cache index once, use index-based setter every frame
int32 EmissiveIdx = INDEX_NONE;
MID->InitializeScalarParameterAndGetIndex(TEXT("EmissiveIntensity"), 0.f, EmissiveIdx);
// ... in Tick:
if (EmissiveIdx != INDEX_NONE)
    MID->SetScalarParameterByIndex(EmissiveIdx, NewValue);
```

### UMaterialParameterCollectionInstance (MPC at runtime)

```cpp
// Always obtain the world instance — never modify the UMaterialParameterCollection asset directly
UMaterialParameterCollectionInstance* MPCI =
    GetWorld()->GetParameterCollectionInstance(MyMPCAsset);

if (MPCI)
{
    MPCI->SetScalarParameterValue(TEXT("WindSpeed"), 3.5f);
    MPCI->SetVectorParameterValue(TEXT("SunColor"), FLinearColor(1.f, 0.9f, 0.7f));
    // Read back:
    float CurrentWind;
    MPCI->GetScalarParameterValue(TEXT("WindSpeed"), CurrentWind);
}
```

### Custom Primitive Data

```cpp
// In the Material Editor: enable "Use Custom Primitive Data" on the parameter node
// and assign a Data Index. Then in C++:
MeshComp->SetCustomPrimitiveDataFloat(/*Index=*/0, /*Value=*/0.75f);
```

## Patterns & Examples

### Hit Flash (damage indicator)

```cpp
// BeginPlay — create and cache once
MID = MeshComp->CreateDynamicMaterialInstance(0);

// On hit event
MID->SetScalarParameterValue(TEXT("FlashIntensity"), 1.0f);

// In Tick — fade out
float Current;
MID->GetScalarParameterValue(TEXT("FlashIntensity"), Current);
MID->SetScalarParameterValue(
    TEXT("FlashIntensity"),
    FMath::FInterpTo(Current, 0.f, DeltaTime, 8.f));
```

### Dissolve Effect (prefer Custom Primitive Data)

```cpp
// No MID needed — zero UObject overhead, preserves batching
MeshComp->SetCustomPrimitiveDataFloat(0, DissolveAmount); // 0=solid, 1=fully dissolved
```

### Global Time-of-Day (MPC)

```cpp
// In a WorldSubsystem updated each frame
UMaterialParameterCollectionInstance* MPCI =
    GetWorld()->GetParameterCollectionInstance(TimeOfDayMPC);
if (MPCI)
{
    MPCI->SetScalarParameterValue(TEXT("SunElevation"), SunAngleDegrees);
    MPCI->SetVectorParameterValue(TEXT("SkyColor"), CurrentSkyColor);
}
```

### Runtime Texture Swap (MID required — Custom Primitive Data cannot store textures)

```cpp
UMaterialInstanceDynamic* MID = MeshComp->CreateDynamicMaterialInstance(0);
MID->SetTextureParameterValue(TEXT("CharacterSkin"), LoadedSkinTexture);
```

## Configuration

**Parent material architecture** — prefer 5–7 focused parent materials separated by blend mode and shading model, **not** by surface type (red brick and blue tile share the same opaque parent; translucent glass requires a different parent):

| Asset Name | Use Case |
|---|---|
| `M_Master_Opaque` | Standard PBR surfaces |
| `M_Master_Masked` | Foliage, fences, hair |
| `M_Master_Translucent` | Glass, water, particles |
| `M_Master_Emissive` | Screens, lights, glowing objects |
| `M_Master_Decal` | Decal-domain surfaces |

**What to expose as parameters**: color tint (Vector multiplied against albedo, default white), texture slots (`TextureSampleParameter2D`), roughness/metallic multipliers (Scalar), UV tiling/offset, emissive intensity (Scalar, default 0).

**What to hardcode**: shading model, blend mode, two-sided toggle — these should not vary per instance; a new blend mode requires a new parent material.

**Static Switch Parameters** produce one shader permutation per unique combination (2^N permutations for N switches). Keep to ≤ 5–6 static switches per parent. Never mix opaque/translucent logic via static switches — use separate parent materials instead.

**Hierarchy depth** — keep to 2–3 levels max (Parent → `MI_Base` → `MI_Variant`). Deeper hierarchies slow parameter lookup traversal and create organizational confusion.

**Naming conventions**:

| Prefix | Asset Type |
|---|---|
| `M_` | Base Materials |
| `MI_` | Material Instance assets (MIC) |
| `MF_` | Material Functions |
| `MPC_` | Material Parameter Collections |

**Folder structure**: shared parent materials in `Materials/Library/`; feature-specific instances alongside their mesh/texture assets (e.g., `Characters/PlayerCharacter/Materials/MI_PlayerArmor_Blue`).

## Best Practices

- **Cache MID references in `BeginPlay` or initialization** — never call `CreateDynamicMaterialInstance` or `UMaterialInstanceDynamic::Create` inside `Tick` or frequently-fired event handlers; each call allocates a new `UObject`.
- **Prefer Custom Primitive Data over MID for numeric per-instance parameters** — preserves draw call batching and Nanite shading bin sharing, requires zero extra `UObject`s, and supports editor-time tweaking without Construction Scripts.
- **Prefer MPC over MID for world-wide parameters** — one `SetScalarParameterValue` call on the `MPCI` pushes the value to every material in the scene in a single uniform buffer update.
- **Use `CreateDynamicMaterialInstance` (component method) over static `UMaterialInstanceDynamic::Create`** when the mesh component is the natural owner; the component tracks instance lifetime automatically.
- **Declare parameter name constants** — parameter name strings are case-sensitive and typos fail silently. Define them as `static const FName` or preprocessor constants to catch renames at compile time.
- **Use index-cached setters for per-frame updates** — call `InitializeScalarParameterAndGetIndex` once, then `SetScalarParameterByIndex` each frame to skip the name-hash lookup.
- **Disable "Automatically Set Usage in Editor"** during development — leaving it enabled multiplies shader permutation counts. Audit and set Usage Flags explicitly on parent materials.
- **Minimize Nanite raster bin count** — each unique (blend mode × deformation state) combination occupies a separate, costly shading bin. Opaque non-deformed instances batch freely; masked materials always cost extra bins.

## Anti-patterns

- **Recreating MIDs every Tick or on every event** — leaks `UObject`s and causes garbage collection hitches every ~60 seconds. Create once, cache the pointer.
- **Using MID when Custom Primitive Data suffices** — MIDs break instancing batching and add GC pressure. For simple numeric per-actor variations, Custom Primitive Data is almost always cheaper.
- **Deep material hierarchies (> 3 levels)** — parameter lookup traverses the full chain; flatten to 2–3 levels.
- **Excessive static switches** — N switches produce up to 2^N shader permutations, multiplying cook time, memory, and PSO cache size. Cap at 5–6 per parent.
- **Modifying the `UMaterialParameterCollection` asset at runtime** — the asset is the definition; runtime modifications must go through `UWorld->GetParameterCollectionInstance()`. Editing the asset during PIE has no per-instance effect.
- **String name lookups in tight loops** — cache parameter indices via `InitializeScalarParameterAndGetIndex` for any parameter updated more than once per second.
- **More than 2 MPC references per material** — the shader compiler silently ignores a third MPC binding. Restructure or merge collections.