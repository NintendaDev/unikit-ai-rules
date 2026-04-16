---
version: 1.0.0
---

# Chickensoft AutoInject

> **Scope**: Reflection-free, node-based dependency injection for Godot 4 C# — Provider/Dependent patterns, automatic node binding with `[Node]`, lifecycle hooks, and test-friendly initialization via source-generated metadata (no reflection).
> **Load when**: wiring dependencies between nodes, authoring Provider or Dependent nodes, using `[Dependency]` or `[Node]` attributes, setting up `IAutoInit`/`IAutoOn`/`IAutoConnect` mixins, testing nodes with faked dependencies, debugging unresolved dependencies or notification hooks.

---

## Setup

### `.csproj` packages

```xml
<ItemGroup>
  <PackageReference Include="Chickensoft.GodotNodeInterfaces" Version="*" />
  <PackageReference Include="Chickensoft.Introspection" Version="*" />
  <PackageReference Include="Chickensoft.Introspection.Generator"
    Version="*" PrivateAssets="all" OutputItemType="analyzer" />
  <PackageReference Include="Chickensoft.AutoInject"
    Version="*" PrivateAssets="all" />
  <PackageReference Include="Chickensoft.AutoInject.Analyzers"
    Version="*" PrivateAssets="all" OutputItemType="analyzer" />
</ItemGroup>

<PropertyGroup>
  <WarningsAsErrors>CS9057</WarningsAsErrors>
</PropertyGroup>
```

### Mandatory `_Notification` override

Every node using **any** AutoInject mixin must include exactly this line — without it, all mixins silently do nothing:

```csharp
public override void _Notification(int what) => this.Notify(what);
```

### `[Meta]` attribute

Apply `[Meta(typeof(...))]` to every node class that uses AutoInject mixins. Use `IAutoNode` to get all mixins at once, or list only the ones you need:

```csharp
// All mixins at once
[Meta(typeof(IAutoNode))]
public partial class MyNode : Node { ... }

// Only what you need
[Meta(typeof(IAutoOn), typeof(IDependent))]
public partial class MyDependent : Node { ... }
```

---

## Mixins Overview

| Mixin | Purpose |
|-------|---------|
| `IAutoNode` | Shorthand — applies all mixins below |
| `IProvider` | Marks node as dependency provider for descendants |
| `IDependent` | Marks node as dependency consumer from ancestors |
| `IAutoConnect` | Auto-binds `[Node]` properties to scene tree nodes |
| `IAutoInit` | Calls `Initialize()` before `_Ready` in production (skipped in tests) |
| `IAutoOn` | Enables .NET-style notification handlers: `OnReady()`, `OnProcess()`, etc. |
| `IProvideAny` | Dynamic runtime provider — service-locator pattern |

---

## Provider Pattern

Provider nodes supply typed values to all descendant nodes that request them.

```csharp
[Meta(typeof(IAutoNode))]
public partial class GameRoot : Node,
    IProvide<IGameState>,
    IProvide<IAudioService>
{
    public override void _Notification(int what) => this.Notify(what);

    // IAutoInit: runs only in production, skipped in tests
    public IGameState State { get; private set; } = default!;
    public IAudioService Audio { get; private set; } = default!;

    IGameState IProvide<IGameState>.Value() => State;
    IAudioService IProvide<IAudioService>.Value() => Audio;

    public void Initialize()
    {
        State = new GameState();
        Audio = new AudioService();
    }

    // MUST call this.Provide() from OnReady (= _Ready)
    public void OnReady() => this.Provide();

    // Called after all descendants have resolved their dependencies
    public void OnProvided() { }
}
```

**Rule**: call `this.Provide()` from `OnReady()`. Delaying it past `_Ready` risks dependency resolution deadlock.

---

## Dependent Pattern

Dependent nodes declare their needs with `[Dependency]` and receive them before the first frame via `OnResolved()`.

```csharp
[Meta(typeof(IAutoOn), typeof(IDependent))]
public partial class PlayerHUD : Control
{
    public override void _Notification(int what) => this.Notify(what);

    [Dependency]
    public IGameState State => this.DependOn<IGameState>();

    [Dependency]
    public IAudioService Audio => this.DependOn<IAudioService>();

    // Fallback used only when no ancestor provides the type
    [Dependency]
    public GameConfig Config => this.DependOn<GameConfig>(() => new GameConfig());

    public void OnResolved()
    {
        // All dependencies are guaranteed available here, before first _Process
        State.OnScoreChanged += UpdateScore;
    }

    public void OnExitTree()
    {
        // Always unsubscribe from dependency events here
        State.OnScoreChanged -= UpdateScore;
    }

    private void UpdateScore(int score) { /* ... */ }
}
```

---

## IAutoConnect — Automatic Node Binding

Bind scene-tree nodes to properties at `_Ready` time. Use only on **properties**, not fields.

```csharp
[Meta(typeof(IAutoConnect))]
public partial class PlayerController : CharacterBody2D
{
    public override void _Notification(int what) => this.Notify(what);

    // Explicit path
    [Node("Visuals/Sprite")]
    public ISprite2D Sprite { get; set; } = default!;

    // Property name → unique node: "AnimationPlayer" → "%AnimationPlayer"
    [Node]
    public IAnimationPlayer AnimationPlayer { get; set; } = default!;

    // Explicit unique name (property name ≠ node name)
    [Node("%HealthBarUI")]
    public IProgressBar HealthBar { get; set; } = default!;

    // Snake_case converted: "_jumpSound" → "%JumpSound"
    [Node]
    public IAudioStreamPlayer2D _jumpSound { get; set; } = default!;
}
```

**Rule**: use `GodotNodeInterfaces` interface types (`ISprite2D`, `INode2D`, etc.) for properties — they enable mocking in unit tests. Concrete Godot types also work when mocking is not needed.

---

## IAutoInit — Test-Friendly Initialization

`Initialize()` is called before `_Ready` in production. In tests, set `IsTesting = true` (or use `FakeDependency`) to skip it and inject mocks directly.

```csharp
[Meta(typeof(IAutoInit), typeof(IAutoOn))]
public partial class EnemyManager : Node
{
    public override void _Notification(int what) => this.Notify(what);

    public ISpawnService Spawner { get; set; } = default!;

    public void Initialize()
    {
        // Only runs in production
        Spawner = new ProductionSpawnService();
    }

    public void OnReady() { /* Spawner is guaranteed set here */ }
}
```

---

## IAutoOn — Notification Handlers

Replace `override _Ready()` with `OnReady()` etc. for cleaner composition.

```csharp
[Meta(typeof(IAutoOn))]
public partial class MyNode : Node2D
{
    public override void _Notification(int what) => this.Notify(what);

    public void OnReady() { }

    // Process callbacks require manual enablement
    public void OnProcess(double delta) { }      // needs SetProcess(true)
    public void OnPhysicsProcess(double delta) { } // needs SetPhysicsProcess(true)

    public void OnExitTree() { }
}
```

**Rule**: `OnProcess` and `OnPhysicsProcess` are not called unless you explicitly call `SetProcess(true)` / `SetPhysicsProcess(true)`.

---

## Node as Both Provider and Dependent

A node can provide values to its children while depending on values from its ancestors. Call `this.Provide()` from `OnResolved()` instead of `OnReady()`.

```csharp
[Meta(typeof(IAutoNode))]
public partial class MiddleLayer : Node,
    IProvide<IChildService>
{
    public override void _Notification(int what) => this.Notify(what);

    [Dependency]
    public IRootService Root => this.DependOn<IRootService>();

    IChildService IProvide<IChildService>.Value() => _childService;
    private IChildService _childService = default!;

    public void OnResolved()
    {
        // Root is available — use it to create child services
        _childService = new ChildService(Root);
        this.Provide(); // now children can resolve IChildService
    }
}
```

---

## Testing

### Fake a dependency

Call `FakeDependency` **before** adding the node to the tree. Faked values override any ancestor provider.

```csharp
var node = new PlayerHUD();
node.FakeDependency<IGameState>(new MockGameState());
node.FakeDependency<IAudioService>(new MockAudioService());

testScene.AddChild(node);
node._Notification((int)Node.NotificationReady);

Assert.IsTrue(node.IsResolved);
```

### Skip Initialize() in tests

```csharp
var manager = new EnemyManager
{
    Spawner = new MockSpawnService()
};
(manager as IAutoInit).IsTesting = true;
testScene.AddChild(manager);
manager._Notification((int)Node.NotificationReady);
```

---

## Lifecycle Order

**Production:**
```
Initialize() → [children _Ready bottom-up] → OnReady() → this.Provide()
    → children: OnResolved() → OnProvided()
```

**Testing (IAutoInit):**
```
[manual mock injection] → OnReady() → this.Provide()
    → children: OnResolved() → OnProvided()
```

**Resolution complexity**: O(n) tree traversal at setup, O(1) property access thereafter.

---

## Anti-patterns

- **Calling `Provide()` asynchronously or after `_Ready`** — causes deadlock or unresolved dependencies; always call from `OnReady()`.
- **Omitting `_Notification` override** — all mixins silently stop working; every AutoInject node must have it.
- **Using `IProvideAny` on the scene root** — swallows unresolved dependency errors that would otherwise bubble up.
- **Using `[Node]` on fields** — `IAutoConnect` only binds properties; fields are silently ignored.
- **Expecting `OnProcess` without `SetProcess(true)`** — the handler exists but is never invoked.
- **Not unsubscribing from dependency events** — always detach handlers in `OnExitTree()` to avoid memory leaks.
- **Depending on concrete types instead of interfaces** — prevents mocking in tests; prefer `IMyService` over `MyService`.
