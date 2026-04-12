---
version: 1.0.0
---

# Gameplay Tags

> **Scope**: FGameplayTag, FGameplayTagContainer, FGameplayTagQuery, native tag declaration, hierarchy design, matching operations, replication, UPROPERTY meta specifiers, tag count container, C++ API patterns
> **Load when**: GameplayTag, FGameplayTag, FGameplayTagContainer, FGameplayTagQuery, tag, tags, UE_DEFINE_GAMEPLAY_TAG, UE_DECLARE_GAMEPLAY_TAG_EXTERN, MatchesTag, HasTag, HasAny, HasAll, tag hierarchy

---

## Core Concepts

Gameplay Tags are hierarchical, centrally-managed FName-based identifiers registered in `UGameplayTagsManager` at startup. They replace raw strings, booleans, and enums with a type-safe, editor-friendly tagging system.

**Key types:**

| Type | Purpose |
|------|---------|
| `FGameplayTag` | Single hierarchical tag (wraps FName) |
| `FGameplayTagContainer` | Collection of tags with matching operations |
| `FGameplayTagQuery` | Logical query run against containers |
| `FGameplayTagCountContainer` | Container with tag reference counting |
| `FGameplayTagQueryExpression` | Builder for complex query expressions |

**Hierarchy:** Tags use dot-separated levels — `Damage.DoT.Fire`, `State.Debuff.Stun`, `Ability.Skill.Fireball`. Matching can test exact tag or any parent in the hierarchy.

## Module Setup

```csharp
// MyProject.Build.cs
PublicDependencyModuleNames.Add("GameplayTags");
```

```cpp
#include "GameplayTagContainer.h"
// For native tag macros:
#include "NativeGameplayTags.h"
```

## Declaring Tags

### Native C++ Tags (Preferred)

Registered at module startup. No dictionary lookup at runtime — safest and fastest approach.

```cpp
// Header — shared across modules
UE_DECLARE_GAMEPLAY_TAG_EXTERN(TAG_Damage_Fire);

// CPP — definition
UE_DEFINE_GAMEPLAY_TAG(TAG_Damage_Fire, "Damage.Fire");

// With comment (appears in tag manager)
UE_DEFINE_GAMEPLAY_TAG_COMMENT(TAG_Damage_Physical, "Damage.Physical",
    "Physical damage from melee and projectile hits");

// CPP-only (not shared across modules)
UE_DEFINE_GAMEPLAY_TAG_STATIC(TAG_Internal_State, "Internal.Processing.State");
```

Usage — direct variable access, no lookup:

```cpp
if (DamageTag.MatchesTag(TAG_Damage_Fire))
{
    // Handle fire damage
}
```

### INI / Project Settings Tags

Defined in Project Settings > GameplayTags > Manage Gameplay Tags. Stored in `DefaultGameplayTags.ini`. Convenient for designers but less reliable in edge cases (config load ordering).

### DataTable Tags

Import from CSV/JSON via `FGameplayTagTableRow`. Useful for bulk tag definitions from external tools.

### RequestGameplayTag (Runtime Lookup)

```cpp
FGameplayTag Tag = FGameplayTag::RequestGameplayTag(FName("Damage.Fire"));
```

Performs dictionary lookup — use sparingly. Prefer native tags for frequently-accessed tags. Avoid in constructors (dictionary may not be initialized yet).

## FGameplayTag Operations

### Matching

```cpp
FGameplayTag FireTag = TAG_Damage_Fire;          // "Damage.Fire"
FGameplayTag DamageTag = TAG_Damage;              // "Damage"

// Exact match — same tag only
FireTag == DamageTag;                              // false
FireTag.MatchesTagExact(DamageTag);               // false

// Hierarchical match — checks if tag is child of (or equal to) other tag
FireTag.MatchesTag(DamageTag);                    // true ("Damage.Fire" is child of "Damage")
DamageTag.MatchesTag(FireTag);                    // false ("Damage" is NOT child of "Damage.Fire")
```

### Validity

```cpp
if (Tag.IsValid())
{
    // Tag is registered in the dictionary
}
```

## FGameplayTagContainer Operations

Always prefer `FGameplayTagContainer` over `TArray<FGameplayTag>` — it provides optimized matching and automatic parent tag tracking.

### Adding / Removing

```cpp
FGameplayTagContainer Tags;
Tags.AddTag(TAG_State_Burning);
Tags.AddTag(TAG_State_Stunned);
Tags.AppendTags(OtherContainer);
Tags.RemoveTag(TAG_State_Burning);
Tags.Reset();  // Clear all
```

### Matching Methods

```cpp
FGameplayTagContainer RequiredTags;
RequiredTags.AddTag(TAG_State_Burning);
RequiredTags.AddTag(TAG_State_Poisoned);

// Has specific tag (hierarchical match)
bool bBurning = Tags.HasTag(TAG_State_Burning);

// Has ANY of the specified tags
bool bHasAny = Tags.HasAny(RequiredTags);

// Has ALL of the specified tags
bool bHasAll = Tags.HasAll(RequiredTags);

// Exact match variants (no hierarchy)
bool bExact = Tags.HasTagExact(TAG_State_Burning);
```

### Iteration

```cpp
for (const FGameplayTag& Tag : Tags)
{
    UE_LOG(LogTemp, Log, TEXT("Tag: %s"), *Tag.ToString());
}
```

## FGameplayTagCountContainer

Maintains reference counts per tag — multiple systems can add/remove the same tag independently without conflicts. Essential for stacking mechanics.

```cpp
FGameplayTagCountContainer TagCounts;
TagCounts.UpdateTagCount(TAG_State_Burning, 1);   // Add
TagCounts.UpdateTagCount(TAG_State_Burning, 1);   // Count = 2
TagCounts.UpdateTagCount(TAG_State_Burning, -1);  // Count = 1, tag still present
TagCounts.UpdateTagCount(TAG_State_Burning, -1);  // Count = 0, tag removed
```

Register delegates for tag changes:

```cpp
TagCounts.RegisterGameplayTagEvent(TAG_State_Burning,
    EGameplayTagEventType::NewOrRemoved)
    .AddUObject(this, &AMyActor::OnBurningTagChanged);
```

## FGameplayTagQuery

Complex logical queries evaluated against containers.

### Building Queries

```cpp
// Simple: has any of these tags
FGameplayTagQuery Query = FGameplayTagQuery::MakeQuery_MatchAnyTags(
    FGameplayTagContainer::CreateFromArray(
        TArray<FGameplayTag>{TAG_State_Burning, TAG_State_Poisoned}));

// Complex expression-based query
FGameplayTagQuery ComplexQuery;
ComplexQuery.Build(
    FGameplayTagQueryExpression()
        .AllExprMatch()
        .AddExpr(FGameplayTagQueryExpression()
            .AnyTagsMatch()
            .AddTag(TAG_State_Burning)
            .AddTag(TAG_State_Poisoned))
        .AddExpr(FGameplayTagQueryExpression()
            .NoTagsMatch()
            .AddTag(TAG_State_Immune))
);

// Evaluate
bool bMatches = ComplexQuery.Matches(EntityTags);
```

### Query Expression Types

| Method | Meaning |
|--------|---------|
| `AllTagsMatch()` | Container must have ALL listed tags |
| `AnyTagsMatch()` | Container must have ANY listed tag |
| `NoTagsMatch()` | Container must have NONE of listed tags |
| `AllExprMatch()` | All sub-expressions must be true |
| `AnyExprMatch()` | Any sub-expression must be true |
| `NoExprMatch()` | No sub-expression may be true |

## UPROPERTY Meta Specifiers

### Category Filtering

Restrict which tags appear in the editor dropdown:

```cpp
// Only show tags under "Damage" hierarchy
UPROPERTY(EditAnywhere, meta = (Categories = "Damage"))
FGameplayTag DamageType;

// Multiple categories
UPROPERTY(EditAnywhere, meta = (Categories = "Weapon.AR,Weapon.SMG"))
FGameplayTag WeaponType;

// Filter containers too
UPROPERTY(EditAnywhere, meta = (Categories = "State"))
FGameplayTagContainer ActiveStates;
```

### Common UPROPERTY Patterns

```cpp
// Editable tag with Blueprint access
UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Tags")
FGameplayTagContainer OwnedTags;

// Tag query for requirements
UPROPERTY(EditAnywhere, Category = "Requirements")
FGameplayTagQuery ActivationRequirements;
```

## Hierarchy Design

### Naming Conventions

| Pattern | Example | Use |
|---------|---------|-----|
| `Category.Subcategory.Specific` | `Damage.DoT.Fire` | Standard hierarchy |
| `System.Action` | `Ability.Cast`, `Input.Move` | System-action pairing |
| `State.Condition` | `State.Debuff.Stun` | Entity state flags |

### Structure Principles

- Structure tags by **category first**: `Item.Heal.Apple` not `Item.Apple.Heal`
- Keep top-level categories broad and stable — they define the matching tree
- Avoid breaking existing hierarchies when expanding
- Use separate tag hierarchies for orthogonal concerns (State vs Ability vs Damage)
- Design for `MatchesTag()` parent queries — `HasTag(TAG_Damage)` matching all damage subtypes

## Replication

### Fast Replication (Recommended)

Enable in Project Settings > GameplayTags > Fast Replication. Tags replicated by index instead of full FName — requires identical tag lists on client and server.

**Tuning:**

| Setting | Purpose | Default |
|---------|---------|---------|
| `NetIndexFirstBitSegment` | Minimum bits always sent | 16 |
| `NumBitsForContainerSize` | Bits for container element count | 6 (max 63 tags) |
| `CommonlyReplicatedTags` | Array of tags assigned lowest indices | — |

Use `GameplayTags.PrintReplicationFrequencyReport` console command to identify commonly replicated tags for the `CommonlyReplicatedTags` array.

### Dynamic Replication

Uses IRIS system. Experimental — not production-ready. Cannot be used simultaneously with Fast Replication.

## Performance Characteristics

| Operation | Cost | Notes |
|-----------|------|-------|
| Native tag access | Zero | Direct variable, no lookup |
| `RequestGameplayTag()` | Moderate | Dictionary hash lookup |
| FGameplayTag equality (`==`) | Extremely cheap | Two uint32 comparisons (FName internals) |
| `MatchesTag()` (hierarchical) | Cheap | Parent chain traversal, still fast |
| FGameplayTag copy | Minimal | 8-12 bytes |
| `HasAny()` / `HasAll()` | Cheap | Optimized container operations |
| Network replication (fast) | Optimized | Index-based bit packing |

### Limits

- Maximum **65,535 tags** per project
- FName max size: **1,024 characters**
- Tag hierarchy depth: no hard limit, but keep practical (3-5 levels)

## GAS Integration

Gameplay Tags are central to the Gameplay Ability System:

| GAS Concept | Tag Usage |
|-------------|-----------|
| Ability activation | Tags grant/block ability activation |
| GameplayEffects | Tags applied/required/blocked by effects |
| GameplayCues | Tag-triggered visual/audio feedback (`GameplayCue.Damage.Fire`) |
| Attribute modifiers | Tag-conditioned modifiers |
| Ability blocking | `ActivationBlockedTags`, `ActivationRequiredTags` |
| Ability granting | Tag-based ability queries |

## Best Practices

- **Always use native tags** (`UE_DEFINE_GAMEPLAY_TAG`) for tags accessed in C++ — eliminates runtime lookup and prevents dictionary timing issues
- **Use `FGameplayTagContainer`** instead of `TArray<FGameplayTag>` — optimized matching, automatic parent tracking
- **Use `meta = (Categories = "...")`** on UPROPERTY to filter editor dropdowns — prevents tag misuse by designers
- **Design hierarchy for `MatchesTag()`** — put the broadest category first so parent matching works logically
- **Enable Fast Replication** for multiplayer — configure `CommonlyReplicatedTags` based on frequency reports
- **Use `FGameplayTagCountContainer`** for stacking effects — prevents tag loss when multiple sources add the same tag
- **Centralize tag declarations** in dedicated header files (e.g., `MyProjectTags.h`) — one authoritative source per module
- **Avoid `RequestGameplayTag()` in hot paths** — cache the result or use native tags
- **Never access tags in constructors** — the tag dictionary may not be initialized yet

## Anti-patterns

- **Raw string comparisons** — using `FName` or `FString` for tag-like behavior instead of `FGameplayTag`; loses hierarchy, editor UI, and type safety
- **`TArray<FGameplayTag>` instead of `FGameplayTagContainer`** — loses optimized matching and parent tag tracking
- **Boolean fields instead of tags** — `bIsStunned`, `bIsBurning` don't compose, scale, or integrate with GAS; use tags
- **`RequestGameplayTag()` in tight loops** — repeated dictionary lookups; use native tags or cache the result
- **Constructor tag access** — `UGameplayTagsManager` may not be initialized; use native macros instead
- **Flat tag hierarchies** — tags like `Stun`, `Fire`, `Heal` without hierarchy lose parent matching capability
- **Overly deep hierarchies** — `Game.Combat.Damage.Type.Element.Fire.DoT.Tick.Small` is unwieldy; keep 3-5 levels
- **INI tag deletion without redirects** — removing tags from config silently breaks serialized references; use `FGameplayTagRedirect` to remap
- **Ignoring replication settings** — default replication sends full FName strings; enable Fast Replication for multiplayer
