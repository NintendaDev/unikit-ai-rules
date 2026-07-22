version: 1.0.0

# Mass Entity

> **Scope**: UE5 Mass Entity framework — authoring Fragments, Processors, Traits, and Tags; spawning entities; modifying entity composition via deferred commands; configuring observer processors; integrating Mass Avoidance and Navigation; debugging with the Mass Debugger.
> **Load when**: implementing a Mass Entity system, authoring custom Fragments or Processors, spawning Mass entities from C++, modifying entity composition at runtime, setting up Mass Avoidance or Navigation, debugging Mass processor execution, designing crowd or simulation systems with Mass.

---

## Core Concepts

Mass is UE5's archetype-based **Entity Component System (ECS)** built for data-oriented, high-performance simulations (crowds, traffic, large AI populations).

| Mass Term | ECS Equivalent | Role |
|-----------|---------------|------|
| Entity | Entity | Integer ID — an index into fragment data |
| Fragment | Component | The data itself — small UStruct |
| Processor | System | Behavior logic — operates on fragment collections |
| Trait | — | Bundle of Fragments + initialization logic |
| Tag | — | Empty marker struct — used for query filtering only |
| Archetype | Archetype | Unique combination of Fragments+Tags sharing contiguous memory |

**Why archetypes matter for performance**: entities of identical composition are stored in contiguous memory chunks → cache-friendly bulk iteration. A `ForEachEntityChunk` call processes a tight data array, not scattered objects — enabling 6–100x throughput vs OOP.

**Entities have no logic.** All behavior lives in Processors. An entity is only data.

---

## Plugin Architecture

| Plugin | Module | Contents |
|--------|--------|----------|
| `MassEntity` | `Runtime/MassEntity` | Core: entity manager, archetypes, processors, queries |
| `MassGameplay` | `Runtime/MassGameplay` | LOD, representation, signals, spawning utilities |
| `MassAI` | `Plugins/AI/MassAI` | Navigation, avoidance, SmartObjects, StateTree integration |
| `MassCrowd` | `Plugins/AI/MassCrowd` | Crowd/traffic behaviors built on top of MassAI |

Add to `Build.cs`:
```cpp
PrivateDependencyModuleNames.AddRange(new string[]
{
    "MassEntity",
    "MassGameplay",
    "StructUtils",
    // Add MassAI, MassNavigation etc. as needed
});
```

---

## Fragment Types

### FMassFragment — per-entity data
```cpp
USTRUCT(BlueprintType)
struct FMyVelocityFragment : public FMassFragment
{
    GENERATED_BODY()
    FVector Value = FVector::ZeroVector;
};
```

### FMassSharedFragment — shared across entities of same archetype
Use for config data (radius, speed settings) shared by all entities of a type.
```cpp
USTRUCT()
struct FMyAgentConfigSharedFragment : public FMassSharedFragment
{
    GENERATED_BODY()
    UPROPERTY()
    float MaxSpeed = 300.f;
};
```
**Rule**: shared fragments must be **Crc-hashable** — only use value types (no pointers/TArray of pointers). The EntityManager caches them: identical values return the same handle.

### FMassChunkFragment — per-chunk data
Rarely needed. Use only for data specific to an archetype memory chunk (e.g., chunk-level spatial partitioning).

### FMassTag — zero-size filter marker
```cpp
USTRUCT()
struct FMyDeadTag : public FMassTag
{
    GENERATED_BODY()
};
```
Tags have **no data**. Use them to switch processor behavior via query presence checks. Give them meaningful names — they appear in the Mass Debugger.

---

## Trait Authoring

A Trait bundles related fragments and their initial values. Assign traits to Entity Config assets in the editor or compose them in code.

```cpp
UCLASS()
class UMyMovementTrait : public UMassEntityTraitBase
{
    GENERATED_BODY()
public:
    UPROPERTY(EditAnywhere)
    float MaxSpeed = 300.f;

    virtual void BuildTemplate(FMassEntityTemplateBuildContext& BuildContext,
                               const UWorld& World) const override
    {
        BuildContext.AddFragment<FMyVelocityFragment>();
        BuildContext.RequireFragment<FTransformFragment>(); // assert it's present
        BuildContext.AddSharedFragment(FConstSharedStruct::Make(
            FMyAgentConfigSharedFragment{ MaxSpeed }));
        BuildContext.AddTag<FMyMovingTag>();
    }
};
```

**Rule**: use `RequireFragment` (not `AddFragment`) for fragments that must be provided by another Trait to avoid duplicate additions.

---

## Processor Authoring

### Minimal processor
```cpp
UCLASS()
class UMyMovementProcessor : public UMassProcessor
{
    GENERATED_BODY()
public:
    UMyMovementProcessor();
protected:
    virtual void ConfigureQueries() override;
    virtual void Execute(FMassEntityManager& EntityManager,
                         FMassExecutionContext& Context) override;
private:
    FMassEntityQuery MovementQuery;
};
```

```cpp
UMyMovementProcessor::UMyMovementProcessor()
{
    // Auto-registers into the default processing pipeline
    bAutoRegisterWithProcessingPhases = true;
    ExecutionOrder.ExecuteInGroup = UE::Mass::ProcessorGroupNames::Movement;
    // For game-thread-only operations:
    // bRequiresGameThreadExecution = true;
}

void UMyMovementProcessor::ConfigureQueries()
{
    MovementQuery.AddRequirement<FTransformFragment>(EMassFragmentAccess::ReadWrite);
    MovementQuery.AddRequirement<FMyVelocityFragment>(EMassFragmentAccess::ReadOnly);
    MovementQuery.AddTagRequirement<FMyMovingTag>(EMassFragmentPresence::All);
    MovementQuery.AddTagRequirement<FMyDeadTag>(EMassFragmentPresence::None); // exclude dead
    MovementQuery.RegisterWithProcessor(*this);
}

void UMyMovementProcessor::Execute(FMassEntityManager& EntityManager,
                                   FMassExecutionContext& Context)
{
    MovementQuery.ForEachEntityChunk(EntityManager, Context,
        [](FMassExecutionContext& Context)
        {
            const float DeltaTime = Context.GetDeltaTimeSeconds();
            auto Transforms = Context.GetMutableFragmentView<FTransformFragment>();
            auto Velocities = Context.GetFragmentView<FMyVelocityFragment>();

            for (int32 i = 0; i < Context.GetNumEntities(); ++i)
            {
                const FVector Delta = Velocities[i].Value * DeltaTime;
                Transforms[i].GetMutableTransform().AddToTranslation(Delta);
            }
        });
}
```

### Processing phases (execution order)
Phases run each tick in ascending order:
1. `PrePhysics`
2. `StartPhysics`
3. `DuringPhysics`
4. `EndPhysics`
5. `PostPhysics`
6. `FrameEnd`

Set via `ExecutionFlags` and `ExecutionOrder`. Use `ExecuteAfter` / `ExecuteBefore` in `ExecutionOrder` to express fine-grained dependencies.

### Fragment access levels
| Enum | Meaning |
|------|---------|
| `EMassFragmentAccess::ReadOnly` | Const view, safe for parallel execution |
| `EMassFragmentAccess::ReadWrite` | Mutable view |

### Presence requirements
| Enum | Meaning |
|------|---------|
| `EMassFragmentPresence::All` | Entity must have this fragment/tag |
| `EMassFragmentPresence::None` | Entity must NOT have this fragment/tag |
| `EMassFragmentPresence::Any` | Match if any of listed are present |
| `EMassFragmentPresence::Optional` | Included if present; iteration continues if absent |

---

## Observer Processors

Triggered when entity composition changes (fragment/tag added or removed). Use for initialization that depends on composition:

```cpp
UCLASS()
class UMyRadiusInitializer : public UMassObserverProcessor
{
    GENERATED_BODY()
public:
    UMyRadiusInitializer()
    {
        ObservedType = FAgentRadiusFragment::StaticStruct();
        Operation = EMassObservedOperation::Add;
        bAutoRegisterWithProcessingPhases = false; // Observers self-register
    }
protected:
    virtual void ConfigureQueries() override;
    virtual void Execute(FMassEntityManager& EntityManager,
                         FMassExecutionContext& Context) override;
private:
    FMassEntityQuery InitQuery;
};

void UMyRadiusInitializer::Execute(FMassEntityManager& EntityManager,
                                   FMassExecutionContext& Context)
{
    InitQuery.ForEachEntityChunk(EntityManager, Context,
        [](FMassExecutionContext& Context)
        {
            auto Radii = Context.GetMutableFragmentView<FAgentRadiusFragment>();
            for (auto& Radius : Radii)
            {
                Radius.Radius = 40.f;
            }
        });
}
```

**Rule**: never call `UMassEntitySubsystem::BuildEntity` directly if observers must trigger. All standard composition APIs (Defer, EntityBuilder) fire observers correctly.

---

## Spawning Entities

### FEntityBuilder (UE 5.6+ — preferred)
```cpp
// Simple spawn
FMassEntityHandle NewEntity = EntityManager.MakeEntityBuilder()
    .Add<FMassStaticRepresentationTag>()
    .Add<FTransformFragment>(FTransformFragment{ FTransform(SpawnLocation) })
    .Add<FAgentRadiusFragment>(FAgentRadiusFragment{ .Radius = 35.f })
    .Commit();

// Get reference before commit
UE::Mass::FEntityBuilder Builder(EntityManager);
FTransformFragment& Transform = Builder.Add_GetRef<FTransformFragment>();
Transform.GetMutableTransform().SetTranslation(SpawnLocation);
FMassEntityHandle Handle = Builder.Commit();
```

### AMassSpawner (editor placement, simple cases)
Place `AMassSpawner` in level — it auto-spawns using an `EntityConfig` Data Asset. Not suitable for dynamic runtime spawning.

### Batch spawning from C++ (UE 5.4+)
```cpp
// 1. Reserve handles synchronously
TArray<FMassEntityHandle> Entities;
EntityManager.BatchReserveEntities(NumToSpawn, Entities);

// 2. Create with archetype in deferred context
EntityManager.Defer().PushCommand<FMassDeferredSetCommand>(
    [Entities, Archetype, SharedValues](FMassEntityManager& EM)
    {
        EM.BatchCreateReservedEntities(Archetype, SharedValues, Entities);
    });
```

**Rule**: never spawn entities while Mass processing is executing (inside a `ForEachEntityChunk`). Always use `Defer()` or spawn outside the processing tick.

---

## Deferred Commands

**Never modify entity composition directly inside `ForEachEntityChunk`** — use `Context.Defer()`:

```cpp
// Add tag
Context.Defer().AddTag<FMyDeadTag>(Context.GetEntity(EntityIdx));

// Remove tag
Context.Defer().RemoveTag<FMyMovingTag>(Context.GetEntity(EntityIdx));

// Add fragment with value
Context.Defer().PushCommand<FMassCommandAddFragmentInstances>(
    Context.GetEntity(EntityIdx),
    FMyDamageFragment{ .Amount = 50.f });

// Destroy entity
Context.Defer().DestroyEntity(Context.GetEntity(EntityIdx));
```

Commands are flushed at the end of the processing phase, after all processors complete.

---

## Accessing Subsystems in Processors

Declare requirements in `ConfigureQueries`, then access in `Execute`:

```cpp
void UMyProcessor::ConfigureQueries()
{
    MyQuery.AddSubsystemRequirement<UMassNavigationSubsystem>(
        EMassFragmentAccess::ReadOnly);
    MyQuery.RegisterWithProcessor(*this);
}

void UMyProcessor::Execute(FMassEntityManager& EntityManager,
                           FMassExecutionContext& Context)
{
    MyQuery.ForEachEntityChunk(EntityManager, Context,
        [](FMassExecutionContext& Context)
        {
            const UMassNavigationSubsystem& NavSubsystem =
                Context.GetSubsystemChecked<UMassNavigationSubsystem>();
            // ...
        });
}
```

**Rule**: declare subsystem requirements — do not access `GEngine` or `GWorld` directly inside processors. This ensures correct thread-safety guarantees and dependency tracking.

---

## Mass Avoidance & Navigation

### Key fragments
| Fragment | Purpose |
|----------|---------|
| `FMassMoveTargetFragment` | Current navigation destination |
| `FMassVelocityFragment` | Current velocity |
| `FAgentRadiusFragment` | Collision/avoidance radius |
| `FMassNavMeshShortPathFragment` | Short navmesh path with environment boundaries |

### Key processors (auto-registered via Traits)
| Processor | Role |
|-----------|------|
| `UMassMovingAvoidanceProcessor` | Force-based avoidance for moving agents |
| `UMassStandingAvoidanceProcessor` | Avoidance for stationary agents |
| `UMassSteerToMoveTargetProcessor` | Steering toward current MoveTarget |
| `UMassSmoothOrientationProcessor` | Orientation update based on movement |
| `UMassNavigationObstacleGridProcessor` | Updates avoidance obstacle grid |

### Enabling avoidance
Add `UMassNavigationObstacleTrait` and `UMassObstacleAvoidanceTrait` and `UMassSteeringTrait` to an EntityConfig. These traits register the required fragments and processors automatically.

### Setting a move target from C++
```cpp
// Access inside a processor or game code
if (FMassMoveTargetFragment* MoveTarget =
    EntityManager.GetFragmentDataPtr<FMassMoveTargetFragment>(Entity))
{
    MoveTarget->CreateNewAction(EMassMoveTargetAction::Move, *GetWorld());
    MoveTarget->Center = TargetLocation;
    MoveTarget->DistanceToGoal = FVector::Dist(CurrentPos, TargetLocation);
    MoveTarget->SlackRadius = 50.f;
    MoveTarget->DesiredSpeed.Set(MaxSpeed);
}
```

---

## LOD System

Mass uses tags to switch detail levels:
```cpp
HighLODQuery.AddTagRequirement<FMassHighLODTag>(EMassFragmentPresence::All);
MediumLODQuery.AddTagRequirement<FMassMediumLODTag>(EMassFragmentPresence::All);
OffLODQuery.AddTagRequirement<FMassOffLODTag>(EMassFragmentPresence::All);
```

Use `UMassLODSubsystem` to manage LOD transitions. Entities far from the camera switch to simpler processors, saving CPU.

**Rule**: design separate processors per LOD level rather than branching inside a single processor. Simpler queries → better archetype matching → better cache performance.

---

## Built-in Fragments Reference

| Fragment | Data | Source module |
|----------|------|---------------|
| `FTransformFragment` | `FTransform Transform` | MassGameplay |
| `FMassActorFragment` | `TWeakObjectPtr<AActor>` | MassGameplay |
| `FAgentRadiusFragment` | `float Radius` | MassGameplay |
| `FMassVelocityFragment` | `FVector Value` | MassGameplay |
| `FMassMoveTargetFragment` | Navigation destination | MassNavigation |
| `FMassRepresentationFragment` | Visual representation state | MassGameplay |
| `FMassForceFragment` | Accumulated force | MassGameplay |

---

## Debugging

### Console commands
```
mass.debug                          -- Enable general debugging overlay
mass.debug.DebugEntity 42           -- Debug specific entity by index
mass.debug.SetDebugEntityRange 0 99 -- Debug entity index range
mass.SimulationTickingEnabled 0     -- Pause all Mass simulation
```

### Visual Logger
Open via `Tools > Debug > Visual Logger`. Enable `ENABLE_UNIQUE_NAMES_IN_VISLOG` for correct subsystem row separation when multiple simulation instances run.

### Gameplay Debugger (MassAI plugin)
- `Shift+A` — AI agents overlay
- `Shift+O` — avoidance overlay
Requires `MassAI` plugin enabled.

### Mass Debugger (Editor panel)
Shows active processors, their execution order, and fragment compositions per archetype. Access via the Mass Debugger editor utility widget.

### Optimizing debug builds
In `Build.cs` for debug iteration:
```csharp
OptimizeCode = CodeOptimization.Never; // in the Mass module's Build.cs
```
This enables stepping through Mass engine internals in DebugGame.

### FMassDebugger API
Use in editor tooling or debug code:
```cpp
TArray<FMassArchetypeHandle> Archetypes =
    FMassDebugger::GetAllArchetypes(EntityManager);

TArray<FMassEntityHandle> Entities =
    FMassDebugger::GetEntitiesOfArchetype(ArchetypeHandle);

bool bCompatible = FMassDebugger::DoesArchetypeMatchRequirements(
    ArchetypeHandle, Requirements, *GLog);
```

---

## Best Practices

- **Design data first**: define Fragments as pure data structs before writing Processors. Small, focused Fragments improve reuse and cache efficiency.
- **Prefer Tags over conditional fragments**: use tags to branch behavior between queries rather than checking fragment values inside a loop.
- **Keep Processors stateless**: all state lives in Fragments. Processors are logic-only — this enables safe parallelism.
- **Use `FEntityBuilder` for spawning** (5.6+): cleaner API, immediate handle access, composable.
- **Declare subsystem requirements** in `ConfigureQueries` — never access global state directly inside `ForEachEntityChunk`.
- **Cache derived values**: avoid per-entity subsystem lookups in tight loops; access subsystems once per chunk outside the entity loop.
- **Batch composition changes**: group deferred commands rather than one-at-a-time to minimize flush overhead.
- **Name Tags meaningfully**: they appear in the Mass Debugger and aid diagnosability.
- **Design per-LOD queries**: separate `HighLODQuery`, `MediumLODQuery`, `OffLODQuery` in one processor class instead of a single query with conditions.

---

## Anti-patterns

- **Modifying entity composition inside ForEachEntityChunk** — causes undefined behavior. Always use `Context.Defer()`.
- **Storing entity indices as stable IDs** — entity chunk layout changes between frames; entity index from one tick is not valid in another. Store `FMassEntityHandle` instead.
- **Calling `UMassEntitySubsystem::BuildEntity` directly** — bypasses observers. Use `FEntityBuilder` or `Defer().PushCommand()`.
- **Accessing `GWorld` or `GEngine` inside processors** — breaks thread-safety and dependency tracking. Declare subsystem requirements instead.
- **Creating one large Fragment with many fields** — increases archetype fragmentation and hurts cache locality. Split into focused fragments accessed only when needed.
- **Using shared fragments for per-entity data** — shared fragments are shared across all entities of the same archetype; mutating them affects every entity. Use regular fragments for per-entity state.
- **Spawning entities while processing is active** — not yet supported. Spawn during `BeginPlay`, from GameMode, or via deferred commands.
- **Branching on tag presence inside entity loop** — defeats the purpose of query filtering. Use separate queries with tag requirements instead.
