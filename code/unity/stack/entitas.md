---
version: 1.0.0
---

# Entitas ECS

> **Scope**: Entitas Entity Component System framework — component definition, entity lifecycle, context and group management, system types and pipeline setup, reactive systems, entity indices, code generation workflow, and Unity integration.
> **Load when**: building game logic with Entitas ECS, defining components or systems, setting up Contexts and Groups, authoring ReactiveSystem or MultiReactiveSystem, wiring entity indices, troubleshooting code generation errors, designing ECS architecture in Unity.

---

## Core Concepts

Four fundamental types:

- **Context** — owns all entities; use `context.CreateEntity()` and `context.DestroyEntity(e)`.
- **Entity** — data container; add/replace/remove components via generated extension methods.
- **Component** — a plain C# class implementing `IComponent`; holds only data, no logic.
- **Group** — cached reactive subset of entities matching a matcher; never iterate raw context.

Always get a group via `context.GetGroup(matcher)`. Groups are cached — the same matcher returns the same group instance.

```csharp
var group = gameContext.GetGroup(GameMatcher.AllOf(GameMatcher.Position, GameMatcher.Velocity));
```

---

## Component Definition

Components implement `IComponent` and contain only public fields (required by code generator).

```csharp
// Data component
[Game]
public sealed class PositionComponent : IComponent
{
    public Vector3 value;
}

// Flag component (no fields — presence/absence is the data)
[Game]
public sealed class DestroyedComponent : IComponent { }
```

**Rules:**
- Always mark the component with a context attribute (`[Game]`, `[Input]`, `[Ui]`, or custom).
- All fields must be `public` — the code generator uses reflection.
- Keep components focused on a single concern. Split if two fields have different lifetimes or are consumed by different systems.
- Use flag components (empty `IComponent`) to signal state rather than adding a bool field to an unrelated component.
- Use `[Unique]` for components that must have at most one entity across the entire context (e.g., `GameStateComponent`). Access via `context.myComponentEntity`.
- Never store references to other `Entity` objects in components — store IDs instead and look up via `EntityIndex`.

---

## System Types

| Interface | Lifecycle | Use For |
|-----------|-----------|---------|
| `IInitializeSystem` | Once, on start | Setup, initial entity creation |
| `IExecuteSystem` | Every frame | Polling / per-frame logic |
| `ICleanupSystem` | After all Execute | Destroy flag entities, clear accumulators |
| `IReactiveSystem` (via `ReactiveSystem<T>`) | On component change | Event-driven processing |
| `ITearDownSystem` | On shutdown | Final cleanup |

Combine interfaces freely — a system can be `IInitializeSystem` + `ReactiveSystem<T>` simultaneously.

---

## Execute System

Use for per-frame polling or when reacting via collectors is impractical.

```csharp
using static GameMatcher;

public sealed class MoveSystem : IExecuteSystem
{
    readonly IGroup<GameEntity> _group;

    public MoveSystem(GameContext context)
    {
        _group = context.GetGroup(AllOf(Position, Velocity));
    }

    public void Execute()
    {
        foreach (var e in _group.GetEntities())
            e.ReplacePosition(e.position.value + e.velocity.value);
    }
}
```

**Rules:**
- Store the group as a field — never call `context.GetGroup()` inside `Execute()`.
- Call `_group.GetEntities()` each frame — it returns a cached snapshot array; avoid caching the array itself.
- Prefer `ReplaceX()` over `RemoveX()` + `AddX()` — Replace is an atomic operation.

---

## Reactive System

Use `ReactiveSystem<T>` when logic should only run when specific component data changes.

```csharp
public sealed class RenderPositionSystem : ReactiveSystem<GameEntity>
{
    public RenderPositionSystem(Contexts contexts) : base(contexts.game) { }

    protected override ICollector<GameEntity> GetTrigger(IContext<GameEntity> context)
        => context.CreateCollector(GameMatcher.Position);

    protected override bool Filter(GameEntity entity)
        => entity.hasPosition && entity.hasView;

    protected override void Execute(List<GameEntity> entities)
    {
        foreach (var e in entities)
            e.view.gameObject.transform.position = e.position.value;
    }
}
```

**Rules:**
- Always implement `Filter()` — entities may lose required components between the trigger and execution. Check for all components the system needs.
- `GetTrigger()` returns a `Collector` — prefer `GroupEvent.Added` or `GroupEvent.AddedOrRemoved` over `GroupEvent.Removed` alone.
- The `entities` list in `Execute()` contains deduplicated entities — safe to modify components freely.
- Reactive systems skip `Execute()` entirely if no entities were collected — they are zero-cost when idle.

---

## Multi-Context Reactive System

Use `MultiReactiveSystem<T, TContexts>` when the same logic applies across entities from multiple contexts.

```csharp
public interface IPositionView : IEntity, IPosition, IView { }

public partial class EnemyEntity : IPositionView { }
public partial class ProjectileEntity : IPositionView { }

public sealed class SyncViewSystem : MultiReactiveSystem<IPositionView, Contexts>
{
    public SyncViewSystem(Contexts contexts) : base(contexts) { }

    protected override ICollector[] GetTrigger(Contexts contexts) => new ICollector[]
    {
        contexts.enemy.CreateCollector(EnemyMatcher.Position),
        contexts.projectile.CreateCollector(ProjectileMatcher.Position),
    };

    protected override bool Filter(IPositionView entity)
        => entity.hasView && entity.hasPosition;

    protected override void Execute(List<IPositionView> entities)
    {
        foreach (var e in entities)
            e.view.transform.position = e.position.value;
    }
}
```

Define a shared interface combining the required component interfaces. Declare `partial` on the entity classes.

---

## Groups and Collectors (Manual)

Use a manual `Collector` when you need to accumulate group events outside a `ReactiveSystem`.

```csharp
var group = gameContext.GetGroup(GameMatcher.Position);
var collector = group.CreateCollector(GroupEvent.Added);

// Process accumulated entities:
foreach (var e in collector.collectedEntities)
{
    // process e
}
collector.ClearCollectedEntities();

// Stop observing:
collector.Deactivate();
```

**Rules:**
- Always call `ClearCollectedEntities()` after processing; otherwise entities accumulate indefinitely.
- Call `Deactivate()` when the collector is no longer needed to stop group observation.
- Prefer `ReactiveSystem<T>` over manual collectors — it handles deactivation and clearing automatically.

---

## Entity Indices

Use indices for fast entity lookup by a field value without iterating groups.

```csharp
// Unique lookup (one entity per value):
[Game]
public sealed class IdComponent : IComponent
{
    [PrimaryEntityIndex]
    public int value;
}
// Generated: contexts.game.GetEntityWithId(42)

// Multi-entity lookup (many entities per value):
[Game]
public sealed class FactionComponent : IComponent
{
    [EntityIndex]
    public string name;
}
// Generated: contexts.game.GetEntitiesWithFaction("Player")
```

**Rules:**
- Use `[PrimaryEntityIndex]` for ID-like fields that uniquely identify an entity (enforces uniqueness).
- Use `[EntityIndex]` for fields shared by many entities (faction, team, zone).
- All indexed fields must be `public`.
- For components shared across multiple contexts add all context attributes: `[Game, Input, Ui]`.
- Never store direct `Entity` references in components — store an `int` id and look up with the generated index accessor.

---

## System Pipeline (Systems Class)

Wire all systems into a `Systems` or `Feature` class and drive it from a Unity MonoBehaviour.

```csharp
// Systems wiring
public sealed class GameSystems : Feature
{
    public GameSystems(Contexts contexts)
    {
        Add(new InputSystems(contexts));
        Add(new GameplaySystems(contexts));
        Add(new ViewSystems(contexts));
        Add(new DestroySystem(contexts));   // cleanup last
    }
}

// MonoBehaviour driver
public sealed class GameController : MonoBehaviour
{
    Systems _systems;

    void Start()
    {
        var contexts = Contexts.sharedInstance;
        _systems = new GameSystems(contexts);
        _systems.Initialize();
    }

    void Update()    => _systems.Execute();
    void LateUpdate() => _systems.Cleanup();
    void OnDestroy() => _systems.TearDown();
}
```

**Rules:**
- Order matters: input → logic → view → cleanup.
- Add `ICleanupSystem` systems last so they run after all `IExecuteSystem` and `ReactiveSystem` in the same frame.
- Use `Feature` (which extends `Systems`) for grouping related systems — it gives automatic visual debugger support.
- Call `TearDown()` in `OnDestroy()` to release resources.

---

## Destroying Entities

Never destroy an entity while other systems may still react to it in the same frame.

```csharp
// Wrong — other systems cannot react to the removed components.
context.DestroyEntity(e);

// Correct — mark for destruction; a cleanup system destroys at frame end.
e.isDestroyed = true;  // generated from DestroyedComponent (flag)

// Cleanup system (runs last):
public sealed class DestroySystem : ICleanupSystem
{
    readonly IGroup<GameEntity> _group;

    public DestroySystem(GameContext context)
        => _group = context.GetGroup(GameMatcher.Destroyed);

    public void Cleanup()
    {
        foreach (var e in _group.GetEntities())
            context.DestroyEntity(e);
    }
}
```

---

## Code Generation

Entitas uses a code generator (Jenny / Entitas.CodeGeneration) to produce context classes, matchers, and entity extension methods from component definitions.

**Workflow:**
1. Define components with context attributes (`[Game]`, etc.).
2. In Unity editor: **Tools → Jenny → Generate** (or the configured menu path).
3. Never hand-edit generated files — they are overwritten on every generation.

**When compile errors break generation:**
1. Note the breaking component.
2. Create a temporary folder outside the generated output.
3. Delete the generated folder contents manually.
4. Move the breaking component temporarily to the temp folder.
5. Generate to restore a valid state.
6. Move the component back and refactor using the IDE.
7. Generate again.

**Rules:**
- Always regenerate after adding, renaming, or removing a component.
- Configure assembly paths in Entitas preferences — without them the generator cannot discover components in custom assemblies.
- Open the C# project (`Assets > Open C# Project`) at least once before generating if `Library/ScriptAssemblies/` is empty.

---

## Visual Debugger

Add the `Entitas.Unity.Visual Debugging` module to get Unity editor support:
- Inspect contexts, groups, and all entities at runtime.
- Visualize component data as Inspector fields.
- Monitor system execution times in the Systems window.

Annotate component fields with `[Entitas.CodeGeneration.Attributes.DontGenerate]` to exclude helper fields from code generation.

---

## Best Practices

- **One concern per component.** If two fields always change together and are consumed by the same systems, they can share a component. Otherwise split.
- **Minimize system query width.** Each system should declare the minimum set of required components. Smaller matchers enable partial processing and easier parallelisation.
- **Use flag components for state transitions.** Rather than a bool field, add/remove a flag component — it integrates naturally with reactive systems and group matchers.
- **Prefer `ReactiveSystem` over polling.** Execute systems running every frame waste CPU when entities are not changing. Reserve polling for logic that genuinely needs every-frame evaluation.
- **Lazy-initialize view objects.** Create `GameObject` representations in a reactive system triggered on `GameMatcher.Asset.Added`, not at entity creation time. Entities that are destroyed before rendering never pay the creation cost.
- **Use explicit types for type safety.** Prefer `IGroup<GameEntity>` over `IGroup`, `Collector<GameEntity>` over `ICollector` (see UpgradeGuide).

---

## Anti-patterns

- **Storing entity references in components.** Entities can be destroyed at any time; dangling references corrupt state. Use `[PrimaryEntityIndex]` + int ID instead.
- **Calling `context.GetGroup()` inside `Execute()`.** Groups are cached objects — retrieving them in the hot loop is wasteful and expresses intent incorrectly. Store the group as a field.
- **Modifying components directly** (e.g., `e.position.value = ...`). This bypasses Entitas change tracking and breaks reactive systems and group listeners. Always use `Replace` or `Add`.
- **Too many groups on frequently-updated components.** Each group listens to every component change on every entity. 100 groups × 20 000 replacements/frame = 2 000 000 matcher calls. Avoid creating groups on high-frequency components (e.g., `Position`) unless necessary; consider batching updates.
- **Ignoring the destroy-flag pattern.** Destroying entities mid-frame causes other systems and reactive collectors to miss the change. Always use a flag component + cleanup system.
- **Monolithic components with prefixed fields.** `controlMovementDirection`, `controlJumpForce` signals a single component is doing too much. Split into `MovementComponent`, `JumpComponent`.
- **Adding `Collector` / `EntityIndex` on every component.** Both create hidden `Groups` internally, compounding matcher overhead. Add indices only where lookup is a real use case.
