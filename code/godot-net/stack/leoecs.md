---
version: 1.0.0
---

# LeoECS Lite

> **Scope**: LeoECS Lite (Leopotam.EcsLite) entity-component-system framework usage — defining components and systems, world and filter management, entity lifecycle, event patterns, system groups, and Godot 4 node integration.
> **Load when**: building ECS-based game logic with LeoECS Lite, authoring components or systems, wiring up EcsWorld and EcsSystems in Godot 4, implementing event or state-machine patterns with ECS, using ecslite-di or ecslite-extendedsystems extensions.

---

> **Repository status (April 2026):** The official `Leopotam/ecslite` repo was archived on 22.04.2026. Use the maintained community fork **`LeoECSCommunity/ecslite`** for bug fixes and continued development. API is identical — only the source repository changes.

---

## Installation

Add to `.csproj`:

```xml
<PackageReference Include="Leopotam.EcsLite" Version="1.0.1" />
<!-- optional extensions -->
<PackageReference Include="Leopotam.EcsLite.ExtendedSystems" Version="1.0.0" />
```

Or reference the community fork source directly in your project.

---

## Core Concepts

**Entity** — an `int` identifier. It is a container for components and nothing more. Entities auto-destroy when the last component is removed from them. Never hold a raw `int` across frames as a persistent reference — use `EcsPackedEntity` instead.

**Component** — a `struct` holding only data. Avoid logic in components; keep them pure data containers. Reference-type fields are allowed but checked for null in DEBUG builds unless annotated with `[EcsIgnoreNullCheck]`.

**System** — a class implementing one or more lifecycle interfaces. All game logic lives in systems.

**EcsWorld** — the root container. Owns all entities, component pools, and filters.

**EcsFilter** — a live, auto-updating view of entities that match an include/exclude constraint. Cache filters in `Init()`, iterate in `Run()`.

**EcsPool\<T\>** — manages storage for a single component type. Cache pools in `Init()`.

---

## Initialization Pattern

```csharp
// Shared data passed to all systems via GetShared<T>()
class GameServices {
    public SceneTree SceneTree;
    public Node RootNode;
}

EcsWorld _world;
IEcsSystems _updateSystems;
IEcsSystems _physicsUpdateSystems;

void Setup(SceneTree tree, Node root) {
    _world = new EcsWorld();

    var shared = new GameServices { SceneTree = tree, RootNode = root };

    _updateSystems = new EcsSystems(_world, shared)
        .Add(new InputSystem())
        .Add(new MovementSystem())
        .Add(new AnimationSystem())
        .Init();

    _physicsUpdateSystems = new EcsSystems(_world, shared)
        .Add(new PhysicsSystem())
        .Add(new CollisionSystem())
        .Init();
}

void Update()        => _updateSystems?.Run();
void PhysicsUpdate() => _physicsUpdateSystems?.Run();

void Teardown() {
    // Destroy systems BEFORE world — always in this order
    _updateSystems?.Destroy();
    _updateSystems = null;
    _physicsUpdateSystems?.Destroy();
    _physicsUpdateSystems = null;
    _world?.Destroy();
    _world = null;
}
```

---

## Godot 4 Node Integration

Wire the ECS loop into a Godot Node (autoload or main scene node):

```csharp
using Godot;
using Leopotam.EcsLite;

public partial class EcsBootstrap : Node {
    EcsWorld _world;
    IEcsSystems _updateSystems;
    IEcsSystems _physicsSystems;

    public override void _Ready() {
        _world = new EcsWorld();

        var shared = new SharedServices {
            SceneTree = GetTree(),
            RootNode  = this
        };

        _updateSystems = new EcsSystems(_world, shared)
            .Add(new InputSystem())
            .Add(new MovementSystem())
            .Init();

        _physicsSystems = new EcsSystems(_world, shared)
            .Add(new PhysicsSystem())
            .Init();
    }

    public override void _Process(double delta)        => _updateSystems?.Run();
    public override void _PhysicsProcess(double delta) => _physicsSystems?.Run();

    public override void _ExitTree() {
        _updateSystems?.Destroy();
        _physicsSystems?.Destroy();
        _world?.Destroy();
    }
}
```

Use `GetShared<SharedServices>()` inside any system to access `SceneTree`, config, or service objects. Never use `GD.` statics or Godot singletons directly inside ECS systems — pass them through shared data.

---

## EcsWorld API

```csharp
// Custom capacity tuning (optional — defaults are fine for most games)
var world = new EcsWorld(new EcsWorld.Config {
    Entities             = 1024,
    RecycledEntities     = 512,
    Pools                = 256,
    Filters              = 128,
    PoolDenseSize        = 1024,
    PoolRecycledSize     = 512,
    EntityComponentsSize = 16
});

// Entity operations
int entity = world.NewEntity();
world.DelEntity(entity);                         // removes all components, then destroys entity
world.CopyEntity(srcEntity, dstEntity);          // copies all components

// Introspection
int count      = world.GetUsedEntitiesCount();
int[] entities = null;
int n          = world.GetAllEntities(ref entities); // populates array, returns count

// Named worlds (for UI, events, etc.)
var eventsWorld = new EcsWorld();
systems.AddWorld(eventsWorld, "events");
// Access inside system:
EcsWorld events = systems.GetWorld("events");

world.Destroy(); // always call when done
```

---

## EcsPool\<T\> API

```csharp
// Get pool (creates on first call, cached after)
EcsPool<Position> positions = world.GetPool<Position>();

ref Position pos = ref positions.Add(entity);   // add component, returns ref
pos.X = 100f;

bool has = positions.Has(entity);               // safe existence check
ref Position p = ref positions.Get(entity);     // throws in DEBUG if not present
positions.Del(entity);                           // remove; if last component → entity destroyed
positions.Copy(srcEntity, dstEntity);
```

Always check `Has()` before calling `Get()` unless you are certain the component exists.

---

## EcsFilter API

```csharp
// Build filter: entities WITH Position AND Velocity, WITHOUT Dead
EcsFilter _filter = world.Filter<Position>()
    .Inc<Velocity>()
    .Exc<Dead>()
    .End();

// Iterate
foreach (int entity in _filter) {
    ref Position pos = ref _positions.Get(entity);
    ref Velocity vel = ref _velocities.Get(entity);
    pos.X += vel.Dx;
    pos.Y += vel.Dy;
}
```

Filters update automatically when components are added/removed. Cache the filter instance in `Init()` — do **not** call `.Filter(...).End()` every frame.

---

## System Lifecycle Interfaces

| Interface | Method | When called |
|-----------|--------|-------------|
| `IEcsPreInitSystem` | `PreInit(IEcsSystems)` | Before all `Init()` calls |
| `IEcsInitSystem` | `Init(IEcsSystems)` | After all `PreInit()` calls |
| `IEcsRunSystem` | `Run(IEcsSystems)` | Every frame (`systems.Run()`) |
| `IEcsPostRunSystem` | `PostRun(IEcsSystems)` | After all `Run()` calls |
| `IEcsDestroySystem` | `Destroy(IEcsSystems)` | On `systems.Destroy()` |
| `IEcsPostDestroySystem` | `PostDestroy(IEcsSystems)` | After all `Destroy()` calls |

A single system class can implement any combination of these interfaces.

---

## Patterns & Examples

### Entity as Component Field — Always Use EcsPackedEntity

Never store a raw `int` entity in a component — entity IDs are recycled after deletion.

```csharp
struct Target {
    public EcsPackedEntity Enemy;  // safe reference with generation check
}

// Pack
int enemy = world.NewEntity();
ref Target t = ref targets.Add(player);
t.Enemy = world.PackEntity(enemy);

// Unpack (validates entity is still alive)
if (t.Enemy.Unpack(world, out int e)) {
    // e is valid
} else {
    t.Enemy = default; // entity was destroyed
}

// Cross-world reference
EcsPackedEntityWithWorld safe = world.PackEntityWithWorld(enemy);
if (safe.Unpack(out EcsWorld w, out int id)) { /* use id */ }
```

### Event Pattern — One-Frame Components

Create an entity with an event component, process it this frame, then delete it.

```csharp
// Raise event
int evt = world.NewEntity();
ref DamageEvent dmg = ref _damagePool.Add(evt);
dmg.Amount = 10;
dmg.Target = world.PackEntity(target);

// Process in another system
foreach (int e in _damageFilter) {
    ref DamageEvent d = ref _damagePool.Get(e);
    if (d.Target.Unpack(world, out int victim)) {
        ref Health hp = ref _healthPool.Get(victim);
        hp.Current -= d.Amount;
    }
    world.DelEntity(e); // consume event
}
```

With `ecslite-extendedsystems`, use `DelHere<T>()` for automatic cleanup instead of manual deletion.

### Custom Component Reset / Copy

```csharp
// Called automatically when component is removed (Del/DelEntity)
struct MyComponent : IEcsAutoReset<MyComponent> {
    public List<int> Data;
    public void AutoReset(ref MyComponent c) {
        c.Data?.Clear();
    }
}

// Called automatically by CopyEntity
struct MyComponent : IEcsAutoCopy<MyComponent> {
    public int Id;
    public void AutoCopy(ref MyComponent src, ref MyComponent dst) {
        dst.Id = src.Id;
    }
}
```

### Shared Data for Services and Config

```csharp
class SharedServices {
    public IAudioService Audio;
    public IInputService  Input;
    public float          Gravity = -9.8f;
}

var systems = new EcsSystems(world, new SharedServices { Audio = audioSvc });

// Inside any system
SharedServices svc = systems.GetShared<SharedServices>();
svc.Audio.Play("hit");
```

---

## Extension: ecslite-di

Inject worlds, pools, filters, shared, and custom objects automatically by declaring readonly fields in systems.

```csharp
// Call .Inject() BEFORE .Init() — never after
systems.Add(new MovementSystem()).Inject().Init();

// Inside system — no manual Init() wiring needed
class MovementSystem : IEcsRunSystem {
    readonly EcsWorldInject _world    = default;
    readonly EcsWorldInject _events   = "events"; // named world

    readonly EcsPoolInject<Position> _pos = default;
    readonly EcsPoolInject<Velocity> _vel = default;

    readonly EcsFilterInject<Inc<Position, Velocity>, Exc<Dead>> _filter = default;

    readonly EcsSharedInject<SharedServices> _shared  = default;
    readonly EcsCustomInject<IAudioService>  _audio   = default; // from Inject(audioSvc)

    public void Run(IEcsSystems systems) {
        foreach (int e in _filter.Value) {
            ref var pos = ref _pos.Pools.Inc1.Get(e);
            ref var vel = ref _vel.Value.Get(e);
            pos.X += vel.Dx;
        }
    }
}
```

Constraints: `Inc<>` supports up to 8 components; `Exc<>` supports up to 4.

---

## Extension: ecslite-extendedsystems

### System Groups (Runtime Toggle)

```csharp
using Leopotam.EcsLite.ExtendedSystems;

var systems = new EcsSystems(world)
    .Add(new BaseLogicSystem())
    .AddGroup("Combat", false, null,       // disabled by default
        new MeleeSystem(),
        new RangedSystem())
    .AddGroup("Dialogue", false, null,
        new DialogueSystem())
    .Init();

// Enable group via event entity
int e = world.NewEntity();
ref EcsGroupSystemState s = ref world.GetPool<EcsGroupSystemState>().Add(e);
s.Name  = "Combat";
s.State = true;
```

### DelHere — Automatic Event Cleanup

```csharp
systems
    .Add(new DamageApplySystem())
    .DelHere<DamageEvent>()    // removes all DamageEvent entities after DamageApplySystem runs
    .Add(new HealthBarSystem())
    .Init();
```

---

## Best Practices

- Define all components as `struct` — no classes, no inheritance.
- Cache filters and pools in `Init()` — never call `GetPool<T>()` or `Filter<T>().End()` in `Run()`.
- Use separate `EcsSystems` instances for `_Process` and `_PhysicsProcess` — they share the same `EcsWorld`.
- Use named worlds to isolate concerns: events world, UI world, main gameplay world.
- Pass Godot services and configuration through shared data — keep systems free of Godot singletons.
- Use `EcsPackedEntity` whenever storing an entity reference in a component.
- Implement `IEcsAutoReset<T>` on components that hold reference-type fields (List, array, etc.) to prevent stale references after pooling.
- Use `EcsGroupSystem` to toggle feature sets at runtime instead of adding state checks to every system.
- Destroy systems before world (`systems.Destroy()` → `world.Destroy()`).
- Use DEBUG builds during development — all validation and null checks are compiled out in RELEASE.

---

## Anti-patterns

- **Raw int entity in components** — entity IDs are recycled; use `EcsPackedEntity` or `EcsPackedEntityWithWorld`.
- **Logic in components** — components are data; move logic into systems.
- **Rebuilding filters or pools every frame** — cache them once in `Init()`.
- **Calling `pool.Get()` without `pool.Has()`** — throws in DEBUG mode; guard with `Has()` first.
- **Multithreading the ECS API** — LeoECS Lite is not thread-safe; integrate thread work as a system that collects results from a thread pool.
- **Forgetting to call `Destroy()` on systems and world** — causes resource leaks; always wire to `_ExitTree()`.
- **Calling `.Inject()` after `.Init()` with ecslite-di** — injection must happen before initialization.
- **Modifying component state during filter iteration from outside the iteration scope** — safe within the same system, but can cause unexpected filter updates when modified from a different system mid-frame.
- **Keeping reference-type fields in components without `IEcsAutoReset<T>`** — stale object references after component recycling.
