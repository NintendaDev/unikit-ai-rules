---
version: 1.0.0
---

# Mass AI

> **Scope**: AI layer built on Mass Entity — navigation (ZoneGraph, NavMesh), steering, avoidance, StateTree integration, signal system, SmartObject interaction, MassCrowd (lanes, density, obstacles), AI-specific processors and fragments, entity config setup for AI agents
> **Load when**: building Mass-based AI crowds and traffic — composing EntityConfig traits for movement/steering/avoidance, driving entities along ZoneGraph or NavMesh via FMassMoveTargetFragment, wiring signal-driven Mass StateTree behaviors, integrating SmartObjects through FMassSmartObjectHandler, and managing crowd lanes/density with UMassCrowdSubsystem

---

## Core Concepts

Mass AI is the AI layer built on top of Mass Entity (ECS core). It spans multiple plugins providing navigation, crowd behavior, state management, and interaction systems for thousands of entities.

**Plugin dependency chain:**

```
MassEntity (core ECS)
├── MassGameplay (movement, LOD, signals, spawning)
│   ├── MassAI (navigation, steering, avoidance, debugging)
│   │   ├── MassNavigation (ZoneGraph/NavMesh path following)
│   │   └── MassSmartObjects (SmartObject interaction)
│   └── MassCrowd (crowd/traffic behaviors — lanes, density, wander)
├── MassRepresentation (visual representation)
├── MassLOD (level of detail)
└── MassActors (actor-entity bridge)
```

**Build.cs dependencies for AI:**

```cpp
PublicDependencyModuleNames.AddRange(new string[] {
    "MassEntity",
    "MassCommon",
    "MassGameplay",
    "MassMovement",
    "MassNavigation",
    "MassAI",
    "MassSmartObjects",
    "MassSignals",
    "MassSpawner",
    "MassRepresentation",
    "MassLOD",
    "MassActors",
    "MassZoneGraphNavigation",
    "ZoneGraph",
    "SmartObjectsModule",
    "StateTreeModule",
    "StructUtils"
    // Add MassCrowd only if crowd lane/density management needed
});
```

## Navigation System

### ZoneGraph Navigation

ZoneGraph is the primary navigation method for Mass crowds — a lightweight corridor-based path system. Entities follow lane segments within defined zones rather than pathfinding on a navmesh.

**Key classes:**

| Class | Module | Role |
|-------|--------|------|
| `UMassZoneGraphNavigationTrait` | MassZoneGraphNavigation | Adds ZoneGraph navigation fragments to entity |
| `UMassZoneGraphLocationInitializer` | MassZoneGraphNavigation | Initializes nearest ZoneGraph location on spawn |
| `UMassZoneGraphPathFollowProcessor` | MassZoneGraphNavigation | Updates move target along ZoneGraph path |
| `UMassZoneGraphLaneCacheBoundaryProcessor` | MassZoneGraphNavigation | Manages lane cache boundaries |
| `UMassZoneGraphAnnotationTagUpdateProcessor` | MassZoneGraphNavigation | Periodic tag updates, lane-change handling |

**Setup:**
1. Place `AZoneGraphData` actors in the level to define navigable corridors
2. Add `UMassZoneGraphNavigationTrait` to EntityConfig
3. Use ZoneGraph SpawnPoints Generator in MassSpawner to place entities on lanes

### NavMesh Navigation (UE 5.6+)

Alternative to ZoneGraph for environments with NavMesh. Uses standard Recast navmesh for path following.

| Class | Role |
|-------|------|
| `FMassNavMeshPathFollowTask` | StateTree task for navmesh path requests |
| `FMassNavMeshShortPathFragment` | Stores short path data including environment boundaries |
| `UMassNavMeshPathFollowProcessor` | Processes path requests and updates |
| `UMassNavMeshNavigationBoundaryProcessor` | Fills `FMassNavigationEdgesFragment` from navmesh |

### Move Target Fragment

`FMassMoveTargetFragment` is the central fragment driving entity movement. Both ZoneGraph and NavMesh processors write to it; movement/steering processors read from it.

```cpp
// Key fields of FMassMoveTargetFragment:
FVector Center;                          // Target position
FVector Forward;                         // Direction to target
float DistanceToGoal;                    // Distance remaining
FMassInt16Real DesiredSpeed;             // Movement speed
EMassMovementAction CurrentAction;       // Move, Stand, Animate
EMassMovementAction IntentAtGoal;        // What to do on arrival
float SlackRadius;                       // Goal tolerance radius
```

**Setting move target via deferred command:**

```cpp
EntityManager.Defer().PushCommand<FMassDeferredSetCommand>(
    [Entity](FMassEntityManager& System)
    {
        FMassArchetypeHandle Archetype = System.GetArchetypeForEntity(Entity);
        FMassEntityView View(Archetype, Entity);

        const FAgentRadiusFragment& AgentRadius =
            View.GetFragmentData<FAgentRadiusFragment>();
        const FTransformFragment& Transform =
            View.GetFragmentData<FTransformFragment>();
        const FMassMovementParameters& MovementParams =
            View.GetConstSharedFragmentData<FMassMovementParameters>();

        FMassMoveTargetFragment& MoveTarget =
            View.GetFragmentData<FMassMoveTargetFragment>();

        MoveTarget.CreateNewAction(EMassMovementAction::Move, *System.GetWorld());
        MoveTarget.DesiredSpeed.Set(MovementParams.DefaultDesiredSpeed);
        MoveTarget.IntentAtGoal = EMassMovementAction::Stand;
        MoveTarget.SlackRadius = AgentRadius.Radius;
        MoveTarget.Center = TargetLocation;

        const FVector ToTarget =
            MoveTarget.Center - Transform.GetTransform().GetLocation();
        MoveTarget.DistanceToGoal = ToTarget.Size2D();
        MoveTarget.Forward = ToTarget.GetSafeNormal2D();
    });
```

## Movement, Steering & Avoidance

### Required Traits for AI Movement

| Trait | Class | Purpose |
|-------|-------|---------|
| Movement | `UMassMovementTrait` | Base movement parameters (speed, acceleration) |
| Steering | `UMassSteeringTrait` | Steering toward move target |
| Smooth Orientation | `UMassSmoothOrientationTrait` | Gradual rotation toward movement direction |
| Avoidance | `UMassObstacleAvoidanceTrait` | Dynamic collision avoidance between entities |
| Navigation Obstacle | `UMassNavigationObstacleTrait` | Register entity as obstacle in spatial grid |

### Movement Processors (execution order)

| Processor | Phase | Role |
|-----------|-------|------|
| `UMassSteerToMoveTargetProcessor` | PrePhysics | Compute steering force toward move target |
| `UMassMovingAvoidanceProcessor` | PrePhysics | Cumulative force-based collision avoidance (accounts for environment edges in 5.6+) |
| `UMassStandingAvoidanceProcessor` | PrePhysics | Avoidance while stationary |
| `UMassApplyForceProcessor` | PrePhysics | Convert forces into desired velocity |
| `UMassApplyMovementProcessor` | PrePhysics | Update position from velocity |
| `UMassSmoothOrientationProcessor` | PrePhysics | Adjust orientation per movement |
| `UMassNavigationSmoothHeightProcessor` | PrePhysics | Smooth Z-position (excludes off-LOD) |

### Navigation Obstacle Grid

`UMassNavigationObstacleGridProcessor` maintains a `THierarchicalHashGrid2D` for spatial queries. Entities with `UMassNavigationObstacleTrait` are registered in the grid, enabling avoidance processors to detect nearby agents.

### Off-LOD Navigation

`UMassOffLODNavigationProcessor` teleports off-LOD entities directly to their move target without travel simulation. Disable if distant entities must travel realistically:

```ini
; DefaultMass.ini
[/Script/MassNavigation.MassOffLODNavigationProcessor]
ExecutionFlags=0
```

## StateTree Integration

### Setup

1. Create `UStateTree` data asset with **MassStateTreeSchema** (`UMassStateTreeSchema`)
2. Add `UMassStateTreeTrait` to EntityConfig, referencing the StateTree asset
3. Custom tasks must derive from `FMassStateTreeTaskBase`

### Signal-Driven Ticking (Critical)

Mass StateTree does NOT tick every frame. It is signal-driven:

- `UMassStateTreeProcessor` ticks a StateTree only when explicitly signaled via `UMassSignalSubsystem`
- `UMassStateTreeActivationProcessor` sends the initial activation signal
- `DeltaTime` in `Tick()` is the full elapsed time since last signal — may be seconds, not frame delta

**Consequence:** logic that depends on per-frame updates (animations, smooth transitions) must use processors, not StateTree tasks.

### StateTree Processors

| Processor | Role |
|-----------|------|
| `UMassStateTreeActivationProcessor` | Sends activation signal on first tick |
| `UMassStateTreeProcessor` | Executes StateTree logic when signaled |
| `UMassStateTreeFragmentDestructor` | Stops and uninitializes StateTree on entity destruction |

### Built-in StateTree Tasks (MassAI)

| Task | Purpose |
|------|---------|
| ZoneGraph pathfinding/standing | Navigate along ZoneGraph lanes |
| Look At | Entity gaze direction control |
| SmartObject Find/Claim/Use | Interact with SmartObjects |
| Wait Slot | Crowd wait area management |
| Wander Target | Random wandering on ZoneGraph |

## Signal System

`UMassSignalSubsystem` is the event mechanism for Mass entities. Signals trigger StateTree ticks and can coordinate processor behavior.

```cpp
// Signal a single entity
UMassSignalSubsystem& SignalSubsystem =
    GetWorld()->GetSubsystem<UMassSimulationSubsystem>()
        ->GetMutableSignalSubsystem();
SignalSubsystem.SignalEntity(FName("MySignal"), Entity);

// Delayed signal (UE 5.6+: use Deferred variant for thread safety)
SignalSubsystem.DelaySignalEntityDeferred(Entity, 2.0f);
```

**Key signals used internally:**
- Activation signal — triggers first StateTree tick
- Lane change signal — notifies MassCrowd subsystem of lane transitions
- SmartObject signals — fragment add/remove lifecycle

### Signal Processors

`UMassSignalProcessorBase` is the base class for processors that react to signals. They execute on targeted entities when the named signal fires.

## SmartObject Integration

`FMassSmartObjectHandler` mediates between `USmartObjectSubsystem` and Mass entities. Always use this handler — never call `USmartObjectSubsystem` directly from Mass processors.

### Fragments

| Fragment | Role |
|----------|------|
| `FMassSmartObjectUserFragment` | Marks entity as SmartObject user |
| `FMassSmartObjectRequestResultFragment` | Holds candidate search results |
| `FMassSmartObjectLaneLocationRequestFragment` | Lane-based SmartObject queries |
| `FMassSmartObjectWorldLocationRequestFragment` | World-position SmartObject queries |
| `FMassSmartObjectTimedBehaviorFragment` | Time-based interaction processing |
| `FSmartObjectRegistrationFragment` | Stores handle for created SmartObject |

### Processors

| Processor | Role |
|-----------|------|
| `UMassSmartObjectCandidatesFinderProcessor` | Builds candidate list per user entity |
| `UMassSmartObjectTimedBehaviorProcessor` | Manages timed behaviors with auto-release |
| `UMassActiveSmartObjectSignalProcessor` | Creates/destroys instances based on range |

### Setup

1. Add `UMassSmartObjectUserTrait` to EntityConfig
2. Configure `UMassSmartObjectSettings` (`SearchExtents`, `SmartObjectTag` for ZoneGraph lanes)
3. Use StateTree tasks (Find → Claim → Use) for the interaction flow

**ZoneGraph lane association:** SmartObjects near ZoneGraph lanes are annotated with `FSmartObjectLaneLocation`, enabling lane-based spatial queries. Configure `SearchExtents` in `UMassSmartObjectSettings` to control the lookup radius.

## Crowd System (MassCrowd)

MassCrowd extends Mass AI with crowd-specific behaviors: lane tracking, density management, wait areas, dynamic obstacles, and replication.

### Key Classes

| Class | Role |
|-------|------|
| `UMassCrowdSubsystem` | Tracks entities wandering on ZoneGraph |
| `UMassCrowdSpawnerSubsystem` | Manages crowd spawning |
| `UMassCrowdRepresentationSubsystem` | Handles crowd visual representation (actors + ISM) |
| `FMassCrowdTag` | Tag distinguishing crowd entities from others |

### Lane Management

```
ZoneGraph Lane
├── FCrowdTrackingLaneData — entity count per lane
├── FCrowdWaitAreaData — entry gate (open/close)
├── FCrowdWaitSlot — queuing position
├── FZoneGraphCrowdLaneData — runtime pedestrian navigation data
└── FCrowdBranchingLaneData — intersection branching
```

**Lane processors:**

| Processor | Role |
|-----------|------|
| `UMassCrowdLaneTrackingSignalProcessor` | Monitors lane changes, notifies subsystem |
| `UMassCrowdLaneTrackingDestructor` | Cleans up tracking on entity destruction |
| `UZoneGraphCrowdLaneAnnotations` | ZoneGraph blocking behavior |

### Density Management

`FMassCrowdLaneDensityDesc` associates lane densities to weights. At intersections, lane selection uses these weights to maintain balanced density during simulation.

### Dynamic Obstacles

| Processor | Role |
|-----------|------|
| `UMassCrowdDynamicObstacleInitializer` | Registers dynamic obstacles |
| `UMassCrowdDynamicObstacleDeinitializer` | Removes obstacles on destruction |
| `UMassCrowdDynamicObstacleProcessor` | Updates obstacle positions/state |

**Fragment:** `FMassCrowdObstacleFragment`

### Wander Targets

`FMassZoneGraphFindWanderTarget` / `FMassZoneGraphFindWanderTargetInstanceData` — StateTree task that selects a random wander location on ZoneGraph based on the agent's current lane position.

### Crowd Visualization

| Processor | Role |
|-----------|------|
| `UMassCrowdVisualizationProcessor` | Client-side crowd visualization |
| `UMassCrowdServerRepresentationProcessor` | Server-side representation (counterpart of visualization) |
| `UMassCrowdDebugCrowdVisualizationProcessor` | Debug rendering for crowd |

### Replication

- `FReplicatedCrowdAgent` — per-agent replicated data
- `FMassCrowdClientBubbleSerializer` — one per client, handles fast array replication
- `FCrowdFastArrayItem` — efficient replication array item

## Entity Config for AI Agents

Typical trait list for a fully functional AI crowd entity:

| Trait | Purpose |
|-------|---------|
| `UMassMovementTrait` | Movement parameters |
| `UMassZoneGraphNavigationTrait` | ZoneGraph path following |
| `UMassSteeringTrait` | Steering toward move target |
| `UMassSmoothOrientationTrait` | Smooth rotation |
| `UMassObstacleAvoidanceTrait` | Dynamic avoidance |
| `UMassNavigationObstacleTrait` | Register as obstacle in grid |
| `UMassStateTreeTrait` | StateTree behavior |
| `UMassSmartObjectUserTrait` | SmartObject interaction |
| `UMassSimulationLODTrait` | Simulation LOD control |
| `UMassLODCollectorTrait` | LOD distance collection |
| `UMassMovableVisualizationTrait` | Visual representation for moving entities |
| `UMassAssortedFragmentsTrait` | Attach custom fragments |

## Required DefaultMass.ini Configuration

Several AI processors are disabled by default and must be explicitly enabled:

```ini
; DefaultMass.ini (or DefaultEngine.ini [/Script/...] sections)

[/Script/MassRepresentation.MassRepresentationProcessor]
bAutoRegisterWithProcessingPhases=True

[/Script/MassRepresentation.MassVisualizationLODProcessor]
bAutoRegisterWithProcessingPhases=True

[/Script/MassLOD.MassLODCollectorProcessor]
bAutoRegisterWithProcessingPhases=True
```

Also enable in Project Settings → Mass → ProcessorsCDOs → `MassLODCollectorProcessor` → Auto Register.

## Best Practices

- Use **ZoneGraph** for crowd navigation instead of NavMesh — it is purpose-built for Mass lanes and scales to thousands of entities
- Use **`FMassSmartObjectHandler`** for SmartObject interaction — never query `USmartObjectSubsystem` directly from processors
- Design StateTree tasks for **signal-driven logic** — avoid assumptions about per-frame ticking; DeltaTime may be seconds
- **Cache subsystem data** in fragments instead of querying subsystems every tick — reduces random memory access in hot loops
- Use **`FMassCrowdTag`** to separate crowd entities from gameplay entities — enables targeted processor queries
- Configure **density weights** (`FMassCrowdLaneDensityDesc`) to balance crowd distribution at intersections
- Enable **LODCollectorProcessor** explicitly — it is disabled by default but essential for large entity counts
- Set **`UMassSmartObjectSettings::SearchExtents`** appropriately — too large wastes performance on distant SmartObjects, too small misses valid candidates
- Use **MassCrowd visualization processors** (`UMassCrowdVisualizationProcessor`) instead of base Mass visualization for crowd entities — they are optimized for crowd-specific requirements

## Anti-patterns

- **Querying `USmartObjectSubsystem` directly from Mass processors** — use `FMassSmartObjectHandler`; direct access causes entity/SmartObject state desync and missing cleanup
- **Assuming StateTree ticks per-frame** — Mass StateTree is signal-driven; per-frame logic belongs in processors
- **Ignoring `MassOffLODNavigationProcessor`** — it teleports distant entities instantly; disable it or account for it in game design
- **Modifying `FMassMoveTargetFragment` after SmartObject use without reset** — `SmartObjectUseTask` modifies the move target; entity may stop moving unless the move target is explicitly refreshed
- **Using `DelaySignalEntity` from non-game threads** — use `DelaySignalEntityDeferred` (UE 5.6+) for thread safety
- **Skipping LODCollector trait for crowd entities** — without it, LOD-based processing optimization is disabled; all entities process at full detail
- **Operating on entities outside the current processing context for avoidance** — breaks cache coherency; use the obstacle grid for cross-entity queries
- **Skeletal mesh per crowd entity** — use vertex animation textures (VAT) with ISM for crowds; skeletal meshes have prohibitive per-instance cost at scale
