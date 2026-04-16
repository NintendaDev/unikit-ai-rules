version: 1.0.0

# Gameplay Tags

> **Scope**: Unreal Engine's hierarchical tag system — defining and registering tags, `FGameplayTag` and `FGameplayTagContainer` API, tag hierarchy matching, native C++ tag macros, `FGameplayTagQuery` construction, `IGameplayTagAssetInterface`, replication configuration, and tag dictionary design patterns.
> **Load when**: defining or querying gameplay tags, creating `FGameplayTag` or `FGameplayTagContainer` properties, writing native C++ tags, implementing `IGameplayTagAssetInterface`, configuring tag replication, designing tag hierarchies, debugging tag matching behavior.

---

## Setup

Add the `"GameplayTags"` module to `YourProject.Build.cs`:

```cpp
PublicDependencyModuleNames.AddRange(new string[] {
    "GameplayTags"
});
```

Define tags via **Project Settings → Project → GameplayTags → Manage Gameplay Tags** or in dedicated C++ files (preferred for code-defined tags).

---

## Native C++ Tags

Prefer native C++ tags over `RequestGameplayTag()` calls at runtime. Native tags are registered once at startup, avoid repeated FName lookups, and provide type safety.

**Three macros (UE 4.27+):**

```cpp
// GameplayTags.h — expose tag across modules
UE_DECLARE_GAMEPLAY_TAG_EXTERN(TAG_Damage_Fire);
UE_DECLARE_GAMEPLAY_TAG_EXTERN(TAG_Status_Stunned);

// GameplayTags.cpp — define and register
UE_DEFINE_GAMEPLAY_TAG(TAG_Damage_Fire, "Damage.Fire");
UE_DEFINE_GAMEPLAY_TAG(TAG_Status_Stunned, "Status.Stunned");

// .cpp only — file-local scope (no paired declaration needed)
UE_DEFINE_GAMEPLAY_TAG_STATIC(TAG_Internal_Only, "Internal.Only");

// With documentation comment
UE_DEFINE_GAMEPLAY_TAG_COMMENT(TAG_Damage_Fire, "Damage.Fire", "Applied by fire damage sources");
```

**File organization:** Maintain a dedicated `GameplayTags.h` / `GameplayTags.cpp` pair for all exposed native tags rather than scattering declarations across class files.

**Naming convention:** Prefix C++ tag variables with `TAG_`, using underscores to mirror the dot hierarchy: `TAG_Damage_DoT_Fire` → `"Damage.DoT.Fire"`.

---

## FGameplayTag API

Always use `FGameplayTag` for a single tag — never store a tag as `FName` or `FString`.

```cpp
// Retrieve from registry (use only when native tags are not applicable)
FGameplayTag Tag = FGameplayTag::RequestGameplayTag(FName("Damage.Fire"));

// Validation
bool bValid = Tag.IsValid();

// Name access
FName Name = Tag.GetTagName(); // returns "Damage.Fire"

// Hierarchy-aware matching (parent matches its children)
bool bMatch = Tag.MatchesTag(OtherTag);         // true if OtherTag == Tag or is a child
bool bExact = Tag.MatchesTagExact(OtherTag);    // true only if identical

// Match against a set
bool bAny  = Tag.MatchesAny(Container);         // hierarchical, any match
bool bAnyE = Tag.MatchesAnyExact(Container);    // exact, any match
```

---

## FGameplayTagContainer API

Always use `FGameplayTagContainer` for multiple tags. Never use `TArray<FGameplayTag>` — the container caches parent tags internally for O(1) hierarchy checks.

### Querying

```cpp
FGameplayTagContainer Container;

// Hierarchical matching — true if Container has the tag OR any of its ancestors
bool bHas   = Container.HasTag(TAG_Damage_Fire);

// Exact matching — true only if Container has the exact tag
bool bExact = Container.HasTagExact(TAG_Damage_Fire);

// Any / All variants (both hierarchical and exact)
bool bAny   = Container.HasAny(OtherContainer);        // true if any tag matches (hierarchical)
bool bAnyE  = Container.HasAnyExact(OtherContainer);   // true if any tag matches (exact)
bool bAll   = Container.HasAll(OtherContainer);        // true if all tags present (hierarchical)
bool bAllE  = Container.HasAllExact(OtherContainer);   // true if all tags present (exact)

// Filter — returns new container with only matching tags
FGameplayTagContainer Filtered      = Container.Filter(FilterSet);       // hierarchical
FGameplayTagContainer FilteredExact = Container.FilterExact(FilterSet);  // exact
```

**Hierarchy example:**
```cpp
// Container has "Weapon.AR.AK47"
Container.HasTag(TAG_Weapon);         // true  (parent match)
Container.HasTagExact(TAG_Weapon);    // false (no exact "Weapon" tag present)
```

### Modification

```cpp
Container.AddTag(TAG_Damage_Fire);
Container.RemoveTag(TAG_Damage_Fire);
Container.AppendTags(OtherContainer);   // prefer over multiple AddTag calls
Container.Reset();                       // clear all
```

### Utility

```cpp
int32 Count = Container.Num();
bool bEmpty = Container.IsEmpty();
bool bValid = Container.IsValid();      // all tags exist in registry
```

---

## UPROPERTY Integration

```cpp
// Single tag — shows full tag picker in editor
UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Tags")
FGameplayTag DamageType;

// Container — shows multi-tag picker
UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Tags")
FGameplayTagContainer BlockedTags;

// Restrict the editor picker to a specific subtree
UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Tags", meta = (Categories = "Damage"))
FGameplayTag DamageCategory;  // dropdown shows only Damage.* tags
```

---

## FGameplayTagQuery

Use `FGameplayTagQuery` for complex boolean conditions (AND/OR/NOT combinations). Prefer it over chaining multiple `HasTag` calls.

```cpp
// Simple factory methods
FGameplayTagQuery Q1 = FGameplayTagQuery::MakeQuery_MatchAllTags(RequiredContainer);
FGameplayTagQuery Q2 = FGameplayTagQuery::MakeQuery_MatchAnyTags(AnyContainer);
FGameplayTagQuery Q3 = FGameplayTagQuery::MakeQuery_MatchNoTags(BlockedContainer);

// Evaluate
bool bPasses = Q1.Matches(ActorTagContainer);
```

**Complex query construction** — for logic like `(A && B) || (C && !D)`:

```cpp
// ALL( ANY( ALL(A,B), ALL(C) ), NONE(D) )
FGameplayTagQuery Query;
Query.Build(FGameplayTagQueryExpression()
    .AllExprMatch()
    .AddExpr(FGameplayTagQueryExpression()
        .AnyExprMatch()
        .AddExpr(FGameplayTagQueryExpression().AllTagsMatch().AddTag(TAG_A).AddTag(TAG_B))
        .AddExpr(FGameplayTagQueryExpression().AllTagsMatch().AddTag(TAG_C)))
    .AddExpr(FGameplayTagQueryExpression().NoTagsMatch().AddTag(TAG_D)));

bool bMatch = Query.Matches(Container);
```

`FGameplayTagQueryExpression` match types:
- `AllTagsMatch()` / `AnyTagsMatch()` / `NoTagsMatch()` — operate on a set of tags
- `AllExprMatch()` / `AnyExprMatch()` / `NoExprMatch()` — operate on nested sub-expressions

---

## IGameplayTagAssetInterface

Implement `IGameplayTagAssetInterface` on any actor or object that owns tags to enable standardized querying without casting.

```cpp
// MyCharacter.h
#include "GameplayTagAssetInterface.h"

class AMyCharacter : public ACharacter, public IGameplayTagAssetInterface
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Tags")
    FGameplayTagContainer OwnedTags;

    virtual void GetOwnedGameplayTags(FGameplayTagContainer& TagContainer) const override
    {
        TagContainer.AppendTags(OwnedTags);
    }
};
```

**Query any tagged object without casting:**

```cpp
if (IGameplayTagAssetInterface* TagInterface = Cast<IGameplayTagAssetInterface>(Actor))
{
    FGameplayTagContainer Tags;
    TagInterface->GetOwnedGameplayTags(Tags);
    if (Tags.HasTag(TAG_Status_Stunned)) { /* ... */ }
}
```

---

## Tag Hierarchy Design

- **Structure by function-first, then specifics:** `Ability.Attack.Melee` not `Ability.Melee.Attack`
- **Recommended depth:** 3–4 levels maximum. `Damage.DoT.Fire` is good; `Damage.DoT.Fire.Ground.Area` is too deep.
- **Common root categories:** `Ability.`, `Status.`, `Damage.`, `State.`, `Event.`, `UI.`, `Item.`
- **Plan the dictionary upfront** — restructuring tags after Blueprint and C++ usage is widespread is expensive.
- **No duplicate semantics:** do not create both `State.Stunned` and `Status.Stunned` — pick one root.

---

## Replication

`FGameplayTag` and `FGameplayTagContainer` replicate natively over the network.

**Fast Replication** (Project Settings → GameplayTags → Fast Replication):
- Replicates tags by integer index instead of full name string — significantly reduces bandwidth.
- **Requirement:** server and all clients must have an identical tag list. Adding tags at runtime after connection is not supported.
- Key settings:
  - `NumBitsForContainerSize` — bits for container size (default 6 bits → max 63 tags per container per RPC)
  - `NetIndexFirstBitSegment` — minimum bits always sent per tag
  - `CommonlyReplicatedTags` — list tags replicated most frequently to assign them low indices (fewer bits)

**Loose tags via GAS:**

```cpp
AbilitySystemComponent->AddReplicatedLooseGameplayTag(TAG_Status_Stunned);
AbilitySystemComponent->RemoveReplicatedLooseGameplayTag(TAG_Status_Stunned);
```

**Diagnostic console command:**
```
GameplayTags.PrintReplicationFrequencyReport
```

---

## GAS Integration

Within the Gameplay Ability System, tags control ability lifecycle automatically:

| Property | Effect |
|---|---|
| `AbilityTags` | Tags that identify the ability itself |
| `BlockAbilitiesWithTag` | Prevents other abilities with these tags from activating |
| `CancelAbilitiesWithTag` | Cancels running abilities with these tags on activation |
| `ActivationRequiredTags` | Owner must have all these tags for the ability to activate |
| `ActivationBlockedTags` | Owner must NOT have any of these tags to activate |
| `SourceRequiredTags` | Source actor must have all these tags |
| `TargetRequiredTags` | Target actor must have all these tags |

For stacking behavior (counting multiple sources of the same tag), GAS provides `FGameplayTagCountContainer`. Standard `FGameplayTagContainer` has no count — adding the same tag twice does not increase a counter.

---

## Best Practices

- **Prefer native C++ tags** for any tag accessed in code — declare once in `GameplayTags.h`, define in `GameplayTags.cpp`.
- **Use `FGameplayTagContainer` over `TArray<FGameplayTag>`** — richer API, internal parent-tag cache, replication support.
- **Use `meta = (Categories = "Parent.Sub")`** on `UPROPERTY` to limit editor dropdowns to relevant subtrees.
- **Implement `IGameplayTagAssetInterface`** on all actors that own tags — avoids cast-heavy querying code.
- **Use `FGameplayTagQuery`** instead of multiple chained `HasTag` calls for compound conditions.
- **Use `AppendTags`** instead of looping `AddTag` calls when bulk-adding.
- **Scope file-local tags with `UE_DEFINE_GAMEPLAY_TAG_STATIC`** — no header pollution, no external exposure.

---

## Anti-patterns

- **`TArray<FGameplayTag>` instead of `FGameplayTagContainer`** — loses query helpers, parent cache, and replication optimizations.
- **Calling `FGameplayTag::RequestGameplayTag()` in hot paths** — cache the result as a native tag or member variable.
- **Hard-coded tag strings scattered across classes** — all tags must go through a central `GameplayTags.h` file to prevent typos and enable refactoring.
- **Unplanned tag dictionary** — adding tags ad-hoc creates naming collisions and semantic duplicates that are expensive to untangle.
- **Hierarchies deeper than 4 levels** — impractical for designers and hard to query coherently.
- **Using `HasTag` where exact matching is semantically required** — checking if an actor is `Status.Stunned` (exact state) should use `HasTagExact`, not `HasTag` (which would also match `Status` alone).
- **Mixing Actor `Tags` (FName-based) with Gameplay Tags** — pick one system per project; using both creates confusion and double-maintenance.
- **Modifying `FGameplayTagContainer` during iteration** — cache the container or collect tags to modify into a temporary list first.
