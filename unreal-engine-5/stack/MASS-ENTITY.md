---
version: 1.0.0
---

# Mass Entity Framework

> **Scope**: Mass ECS architecture — fragments, processors, traits, observers, tags, archetypes, queries, spawning, LOD, entity manager, C++ API patterns, module dependencies, debugging
> **Load when**: Mass, MassEntity, ECS, Entity Component System, FMassFragment, UMassProcessor, FMassEntityManager, archetype, crowd simulation, MassGameplay, MassAI, FMassTag, UMassObserverProcessor

---

## Core Concepts

Mass is UE5's native archetype-based Entity Component System (ECS), production-ready since UE 5.2. Created by Epic's AI team for massive crowd simulations (used in "The Matrix Awakens" demo). Uses data-oriented design — entities are lightweight identifiers, data lives in contiguous fragment arrays organized by archetype.

**ECS mapping:**

| ECS Term | Mass Term | UE Class |
|----------|-----------|----------|
| Entity | Entity | `FMassEntityHandle` |
| Component | Fragment | `FMassFragment` |
| System | Processor | `UMassProcessor` |
| Component bundle | Trait | `UMassEntityTraitBase` |
| Tag / Flag | Tag | `FMassTag` |

**Key subsystems:**

| Subsystem | Plugin | Purpose |
|-----------|--------|---------|
| `UMassEntitySubsystem` | MassEntity | Hosts default `FMassEntityManager` |
| `UMassSimulationSubsystem` | MassGameplay | Phase management, entity processing |
| `UMassSpawnerSubsystem` | MassSpawner | Entity spawning control |

## Plugin / Module Structure

| Plugin | Purpose |
|--------|---------|
| **MassEntity** | Core framework — entity creation, storage, queries |
| **MassGameplay** | Movement, LOD, representation, signals, spawning |
| **MassAI** | AI behaviors, navigation, debugging |
| **MassCrowd** | Crowd/traffic behaviors (CitySample) |
| **MassActors** | Actor-entity integration |
| **MassMovement** | Movement processors |
| **MassNavigation** | Pathfinding integration |
| **MassRepresentation** | Visual representation management |
| **MassLOD** | Level-of-detail system |
| **MassSmartObjects** | SmartObject interaction |
| **MassSpawner** | Spawning infrastructure |
| **MassSignals** | Signal/event system |

### Build.cs Dependencies

```csharp
PublicDependencyModuleNames.AddRange(new string[] {
    "MassEntity",
    "MassCommon",
    "MassGameplay",
    "MassMovement",
    "MassSpawner",
    "MassActors",
    "MassNavigation",
    "MassRepresentation",
    "StructUtils"
    // Add MassAI, MassCrowd, MassSignals, MassSmartObjects as needed
});
```

## Fragment Types

### FMassFragment — Per-Entity Data

Each entity gets its own copy. Stored contiguously in archetype chunks for cache efficiency.

```cpp
USTRUCT(BlueprintType)
struct FHealthFragment : public FMassFragment
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere)
    float CurrentHealth = 100.0f;

    UPROPERTY(EditAnywhere)
    float MaxHealth = 100.0f;
};
```

### FMassSharedFragment — Shared Across Entities

Single instance shared by all entities with the same value. Must be CRC hashable. Use for configuration, LOD settings, replication config.

```cpp
USTRUCT()
struct FTeamConfigSharedFragment : public FMassSharedFragment
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere)
    FLinearColor TeamColor;

    UPROPERTY(EditAnywhere)
    float AggroRadius = 500.0f;
};
```

### FMassConstSharedFragment — Immutable Shared Data

Like `FMassSharedFragment` but read-only after assignment. Use for truly constant configuration.

### FMassChunkFragment — Per-Chunk Data

Single instance per archetype chunk. Rare; use for chunk-level metadata.

### Built-in Fragments

| Fragment | Module | Purpose |
|----------|--------|---------|
| `FTransformFragment` | MassGameplay | Entity world transform |
| `FMassVelocityFragment` | MassMovement | Current velocity |
| `FMassMoveTargetFragment` | MassMovement | Target location to reach |
| `FAgentRadiusFragment` | MassGameplay | Agent collision radius |
| `FMassActorFragment` | MassActors | Pointer to associated actor |
| `FMassRepresentationFragment` | MassRepresentation | Visual representation data |
| `FMassViewerInfoFragment` | MassLOD | Viewer distance/LOD info |
| `FMassMontageFragment` | MassGameplay | Animation montage data |

## Tags

Empty UStructs for filtering entities in queries. No data, only presence/absence matters.

```cpp
USTRUCT()
struct FEnemyTag : public FMassTag
{
    GENERATED_BODY()
};
```

Tags appear in the Mass debugger and can be dynamically added/removed via deferred commands.

## Traits

Traits assign fragments and tags to entity templates. Created as Data Assets or C++ classes inheriting `UMassEntityTraitBase`.

```cpp
UCLASS()
class UCombatTrait : public UMassEntityTraitBase
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere)
    float DefaultHealth = 100.0f;

public:
    virtual void BuildTemplate(
        FMassEntityTemplateBuildContext& BuildContext,
        const UWorld& World) const override
    {
        BuildContext.AddFragment<FHealthFragment>();
        BuildContext.AddFragment<FTransformFragment>();
        BuildContext.RequireFragment<FAgentRadiusFragment>();
        BuildContext.AddTag<FEnemyTag>();
    }
};
```

**BuildTemplate methods:**
- `AddFragment<T>()` — include fragment type in archetype
- `RequireFragment<T>()` — declare dependency on another fragment
- `AddTag<T>()` — apply tag to entities
- `GetMutableFragment<T>()` — set initial fragment values

## Processors

### UMassProcessor — Per-Frame Processing

Processors execute once per simulation tick. Configure queries in `ConfigureQueries()`, process entities in `Execute()`.

```cpp
UCLASS()
class UMovementProcessor : public UMassProcessor
{
    GENERATED_BODY()

    FMassEntityQuery MovementQuery;

public:
    UMovementProcessor()
    {
        bAutoRegisterWithProcessingPhases = true;
        ProcessingPhase = EMassProcessingPhase::PrePhysics;
        ExecutionOrder.ExecuteInGroup = UE::Mass::ProcessorGroupNames::Movement;
        ExecutionFlags = (int32)(EProcessorExecutionFlags::Client |
                                 EProcessorExecutionFlags::Standalone);
        bRequiresGameThreadExecution = false; // multithreaded by default
    }

    virtual void ConfigureQueries() override
    {
        MovementQuery.AddRequirement<FTransformFragment>(EMassFragmentAccess::ReadWrite);
        MovementQuery.AddRequirement<FMassVelocityFragment>(EMassFragmentAccess::ReadOnly);
        MovementQuery.AddTagRequirement<FMoverTag>(EMassFragmentPresence::All);
        MovementQuery.RegisterWithProcessor(*this);
    }

    virtual void Execute(FMassEntityManager& EntityManager,
                         FMassExecutionContext& Context) override
    {
        MovementQuery.ForEachEntityChunk(EntityManager, Context,
            [this](FMassExecutionContext& Context)
            {
                const TArrayView<FTransformFragment> Transforms =
                    Context.GetMutableFragmentView<FTransformFragment>();
                const TConstArrayView<FMassVelocityFragment> Velocities =
                    Context.GetFragmentView<FMassVelocityFragment>();
                const float DeltaTime = Context.GetDeltaTimeSeconds();

                for (int32 i = 0; i < Context.GetNumEntities(); ++i)
                {
                    Transforms[i].GetMutableTransform().AddToTranslation(
                        Velocities[i].Value * DeltaTime);
                }
            });
    }
};
```

### Processing Phases

Execution order within a frame:

```
PrePhysics → StartPhysics → DuringPhysics →
EndPhysics → PostPhysics → FrameEnd
```

Mass builds a dependency graph of processors using `ExecutionOrder` rules so they execute in correct order within each phase.

### Execution Flags

| Flag | When Processor Runs |
|------|-------------------|
| `EProcessorExecutionFlags::Client` | Client in multiplayer |
| `EProcessorExecutionFlags::Server` | Dedicated server |
| `EProcessorExecutionFlags::Standalone` | Standalone game |
| `EProcessorExecutionFlags::Editor` | Editor simulation |

### Query Requirements

**Fragment access modes:**

| Access | Getter | Use |
|--------|--------|-----|
| `EMassFragmentAccess::ReadOnly` | `GetFragmentView<T>()` | Read data |
| `EMassFragmentAccess::ReadWrite` | `GetMutableFragmentView<T>()` | Modify data |

**Fragment presence:**

| Presence | Meaning |
|----------|---------|
| `EMassFragmentPresence::All` | Entity must have this fragment/tag |
| `EMassFragmentPresence::Any` | At least one from group required |
| `EMassFragmentPresence::None` | Exclude entities with this fragment/tag |
| `EMassFragmentPresence::Optional` | Include if present, not required |

**Shared fragment and subsystem access:**

```cpp
// Shared fragment
MyQuery.AddSharedRequirement<FTeamConfigSharedFragment>(EMassFragmentAccess::ReadOnly);
// In execution:
const auto& Config = Context.GetConstSharedFragment<FTeamConfigSharedFragment>();

// Subsystem access
MyQuery.AddSubsystemRequirement<UMySubsystem>(EMassFragmentAccess::ReadWrite);
// In execution:
auto& Subsystem = Context.GetMutableSubsystemChecked<UMySubsystem>();
```

### Parallel Processing

```cpp
// Process chunks in parallel (for large entity counts)
MovementQuery.ParallelForEachEntityChunk(EntityManager, Context,
    [](FMassExecutionContext& Context)
    {
        // Thread-safe processing per chunk
    },
    EParallelForMode::Auto);
```

## Observer Processors

Triggered on fragment/tag addition or removal — not per-frame.

```cpp
UCLASS()
class UHealthInitObserver : public UMassObserverProcessor
{
    GENERATED_BODY()

    FMassEntityQuery EntityQuery;

public:
    UHealthInitObserver()
    {
        ObservedType = FHealthFragment::StaticStruct();
        Operation = EMassObservedOperation::Add;
    }

    virtual void ConfigureQueries() override
    {
        EntityQuery.AddRequirement<FHealthFragment>(EMassFragmentAccess::ReadWrite);
        EntityQuery.RegisterWithProcessor(*this);
    }

    virtual void Execute(FMassEntityManager& EntityManager,
                         FMassExecutionContext& Context) override
    {
        EntityQuery.ForEachEntityChunk(EntityManager, Context,
            [](FMassExecutionContext& Context)
            {
                auto HealthFragments = Context.GetMutableFragmentView<FHealthFragment>();
                for (int32 i = 0; i < Context.GetNumEntities(); ++i)
                {
                    HealthFragments[i].CurrentHealth = HealthFragments[i].MaxHealth;
                }
            });
    }
};
```

**Observer operations:**
- `EMassObservedOperation::Add` — fragment/tag added to entity
- `EMassObservedOperation::Remove` — fragment/tag removed from entity

## Entity Manager API

### Entity Lifecycle

```cpp
FMassEntityManager& EntityManager = /* from subsystem */;

// Reserve entity handle
FMassEntityHandle Entity = EntityManager.ReserveEntity();

// Check entity state
EntityManager.IsEntityValid(Entity);
EntityManager.IsEntityActive(Entity);
EntityManager.IsEntityBuilt(Entity);
EntityManager.IsEntityReserved(Entity);

// Build entities via builder pattern (UE 5.5+)
auto Builder = EntityManager.MakeEntityBuilder();
```

### Fragment Manipulation

```cpp
// Add/remove fragments
EntityManager.AddFragmentToEntity(Entity, FragmentType);
EntityManager.RemoveFragmentFromEntity(Entity, FragmentType);
EntityManager.RemoveFragmentListFromEntity(Entity, FragmentList);

// Add/remove tags
EntityManager.AddTagToEntity(Entity, TagType);
EntityManager.RemoveTagFromEntity(Entity, TagType);
EntityManager.SwapTagsForEntity(Entity, FromTagType, ToTagType);

// Set fragment values
EntityManager.SetEntityFragmentsValues(Entity, FragmentInstanceList);

// Move entity to different archetype
EntityManager.MoveEntityToAnotherArchetype(Entity, NewArchetypeHandle);

// Remove composition
EntityManager.RemoveCompositionFromEntity(Entity, Descriptor);
```

### Deferred Commands (Preferred During Processing)

```cpp
// Inside processor Execute():
Context.Defer().AddTag<FSomeTag>(Context.GetEntity(i));
Context.Defer().RemoveTag<FSomeTag>(Context.GetEntity(i));
Context.Defer().DestroyEntity(Entity);
Context.Defer().DestroyEntities(EntityArray);
```

### FMassEntityView — Convenience Wrapper

```cpp
FMassEntityView EntityView(EntityManager, EntityHandle);

if (EntityView.HasTag<FEnemyTag>())
{
    if (auto* Health = EntityView.GetFragmentDataPtr<FHealthFragment>())
    {
        // Read fragment data
    }
}
```

## Entity Spawning

### Mass Spawner Actor

Place in level to spawn entities. Configure:
1. **Count** — number of entities
2. **EntityConfig** (`UMassEntityConfigAsset`) — trait composition
3. **Spawn Data Generators** — spatial distribution

```cpp
// Spawner API
Spawner->DoSpawning();
Spawner->DoDespawning();
Spawner->ScaleSpawningCount(2.0f);
```

### Spawn Data Generators

| Generator | Purpose |
|-----------|---------|
| EQS SpawnPoints Generator | Distribute via Environment Query System |
| ZoneGraph SpawnPoints Generator | Distribute along ZoneGraph paths |
| Custom Generator | Derive from `UMassEntitySpawnDataGeneratorBase` |

### Programmatic Spawning (UE 5.6+)

```cpp
FMassEntitySpawnExecutionContext SpawnContext =
    MassSpawnerSubsystem->SpawnEntities(/* params */);
// Commands and observers flushed when SpawnContext is released
```

## LOD System

Tag-based behavior scaling for processing thousands of entities at varying detail.

```cpp
// Separate queries per LOD
void ConfigureQueries()
{
    HighLODQuery.AddTagRequirement<FMassHighLODTag>(EMassFragmentPresence::All);
    LowLODQuery.AddTagRequirement<FMassLowLODTag>(EMassFragmentPresence::All);
    HighLODQuery.RegisterWithProcessor(*this);
    LowLODQuery.RegisterWithProcessor(*this);
}
```

Requires `LODCollector` trait and `MassLODCollectorProcessor` registration in Project Settings.

## Actor-Entity Integration

`UMassAgentComponent` bridges actors and Mass entities:

| Sync Direction | Use Case |
|---------------|----------|
| Actor → Mass | Physics/collision-driven actors updating Mass data |
| Mass → Actor | Processor-driven updates pushing to actor transform |

## Debugging

| Tool | Command / How |
|------|--------------|
| Mass debugger | `mass.debug` console command |
| Target entity | `mass.debug.DebugEntity [Index]` |
| Toggle simulation | `mass.SimulationTickingEnabled` |
| Visual Logger | Tools > Debug > Visual Logger |
| Gameplay Debugger | Compile with `WITH_GAMEPLAY_DEBUGGER` + `WITH_MASSGAMEPLAY_DEBUG` |

### Debug Build Optimization

Disable optimization in Mass modules for stepping through internals:

```csharp
// In your Module.Build.cs
OptimizeCode = CodeOptimization.Never;
```

## Best Practices

- Use **deferred commands** (`Context.Defer()`) during processing — direct entity manager operations during `Execute()` can cause composition conflicts
- Processors are **multithreaded by default** — set `bRequiresGameThreadExecution = true` only when accessing game-thread-only systems
- **Cache subsystem data** in fragments instead of querying subsystems every frame — minimizes random memory access
- Use **tags for filtering**, not boolean fragment fields — tags change archetype, enabling query-level filtering
- Use **shared fragments** for configuration common to groups (team config, LOD settings) — avoid duplicating data per entity
- Prefer `ForEachEntityChunk` with array access over per-entity iteration — respects contiguous memory layout
- Use the **LOD system** for large crowds — process expensive logic only for nearby entities
- Keep fragments **small and focused** — one concern per fragment for better archetype granularity
- Register processors with **appropriate phases** — movement in PrePhysics, rendering updates in PostPhysics
- Set **ExecutionFlags** correctly — don't run client-only processors on dedicated server

## Anti-patterns

- **Direct entity operations during processing** — modifying entity composition (add/remove fragments) directly in `Execute()` breaks iteration; always defer
- **Large monolithic fragments** — combining unrelated data in one fragment wastes memory and reduces archetype efficiency
- **Unnecessary game thread execution** — leaving `bRequiresGameThreadExecution = true` when not needed kills parallelism
- **Per-entity subsystem queries** — accessing `UWorldSubsystem` inside the inner loop instead of caching in fragments or using subsystem requirements
- **Small entity counts** — Mass has overhead from archetype management; unsuitable for <100 entities, prefer regular actors
- **Ignoring execution order** — not configuring `ExecutionOrder.ExecuteInGroup` or `ExecuteAfter`/`ExecuteBefore` leads to undefined processor ordering
- **Entity handle caching across frames** — entity indices can become invalid after archetype reorganizations; validate with `IsEntityValid()` before use
- **Assuming API stability** — Mass API has changed across 5.2→5.5→5.6; expect further changes, check release notes on upgrade
