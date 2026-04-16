---
version: 1.0.0
---

# Chickensoft GodotNodeInterfaces

> **Scope**: Patterns and rules for using GodotNodeInterfaces to make Godot node scripts unit-testable — generated interfaces for node types, `IFakeNodeTreeEnabled` adoption, `Ex` extension methods, fake scene tree setup, and integration with the Chickensoft testing ecosystem.
> **Load when**: writing testable node scripts, mocking child nodes in unit tests, adopting interface-based node access, debugging fake node tree failures, integrating GodotNodeInterfaces with AutoInject or PowerUps.

---

## Core Concepts

GodotNodeInterfaces generates a C# interface for every Godot node type (`ISprite2D`, `INode2D`, `IAnimationPlayer`, …) and a corresponding adapter that wraps the real node. This lets production code refer to children by interface type, so tests can substitute mock objects without ever instantiating the real scene.

Key types:
- **`IFakeNodeTreeEnabled`** — marker interface that makes a node script opt in to fake-tree support. Requires a `FakeNodeTree? FakeNodes { get; set; }` property.
- **`FakeNodeTree`** — a `Dictionary<string, INode>`-backed object that maps node paths to mock objects; used only when `RuntimeContext.IsTesting == true`.
- **`RuntimeContext.IsTesting`** — global static flag. Must be `true` before any node that uses `Ex` methods is initialized in tests.
- **`Ex` extension methods** — drop-in replacements for standard Godot tree methods that transparently delegate to `FakeNodes` during tests.

---

## Installation

```
dotnet add package Chickensoft.GodotNodeInterfaces
```

---

## API / Interface

### `Ex` extension methods (all in `Chickensoft.GodotNodeInterfaces`)

| Method | Replaces |
|--------|----------|
| `GetNodeEx<T>(path)` | `GetNode<T>(path)` |
| `GetNodeOrNullEx<T>(path)` | `GetNodeOrNull<T>(path)` |
| `GetChildEx<T>(idx)` | `GetChild<T>(idx)` |
| `GetChildOrNullEx<T>(idx)` | `GetChildOrNull<T>(idx)` |
| `GetChildrenEx()` | `GetChildren()` |
| `GetChildCountEx()` | `GetChildCount()` |
| `FindChildEx(pattern)` | `FindChild(pattern)` |
| `FindChildrenEx(pattern)` | `FindChildren(pattern)` |
| `AddChildEx(node)` | `AddChild(node)` |
| `RemoveChildEx(node)` | `RemoveChild(node)` |
| `HasNodeEx(path)` | `HasNode(path)` |

Always call `Ex` variants — they are the only ones that resolve against `FakeNodes` in test mode.

---

## Patterns & Examples

### Production node script

```csharp
using Chickensoft.GodotNodeInterfaces;
using Godot;

// Define an interface for your own node (recommended for testability of callers)
public interface IPlayer : INode { }

public partial class Player : CharacterBody2D, IPlayer, IFakeNodeTreeEnabled
{
    // Declare child node references as interface types
    public ISprite2D Sprite { get; private set; } = default!;
    public IAnimationPlayer Animator { get; private set; } = default!;
    public ICollisionShape2D Hitbox { get; private set; } = default!;

    // Required by IFakeNodeTreeEnabled
    public FakeNodeTree? FakeNodes { get; set; }

    public override void _Ready()
    {
        // Use GetNodeEx, not GetNode
        Sprite    = this.GetNodeEx<ISprite2D>("Sprite2D")!;
        Animator  = this.GetNodeEx<IAnimationPlayer>("AnimationPlayer")!;
        Hitbox    = this.GetNodeEx<ICollisionShape2D>("CollisionShape2D")!;
    }

    public void TakeDamage()
    {
        Animator.Play("hurt");
        Sprite.Modulate = new Color(1, 0, 0);
    }
}
```

### Unit test

```csharp
using Chickensoft.GodotNodeInterfaces;
using Moq;
using NUnit.Framework;

[TestFixture]
public class PlayerTest
{
    [SetUp]
    public void SetUp()
    {
        // Must be set before any node with Ex methods is initialized
        RuntimeContext.IsTesting = true;
    }

    [Test]
    public void TakeDamagePlaysHurtAnimation()
    {
        var mockSprite   = new Mock<ISprite2D>();
        var mockAnimator = new Mock<IAnimationPlayer>();
        var mockHitbox   = new Mock<ICollisionShape2D>();

        var player = new Player
        {
            FakeNodes = new FakeNodeTree(null!, new Dictionary<string, INode>
            {
                ["Sprite2D"]        = mockSprite.Object,
                ["AnimationPlayer"] = mockAnimator.Object,
                ["CollisionShape2D"]= mockHitbox.Object,
            })
        };

        player._Ready();
        player.TakeDamage();

        mockAnimator.Verify(a => a.Play("hurt"), Times.Once);
    }
}
```

### Enabling `RuntimeContext.IsTesting` in test bootstrap (Main.cs)

```csharp
public override void _Ready()
{
#if RUN_TESTS
    Environment = TestEnvironment.From(OS.GetCmdlineArgs());
    if (Environment.ShouldRunTests)
    {
        Chickensoft.GodotNodeInterfaces.RuntimeContext.IsTesting = true;
        CallDeferred(nameof(RunTests));
        return;
    }
#endif
    CallDeferred(nameof(StartApp));
}
```

---

## Best Practices

- **Implement `IFakeNodeTreeEnabled` on every node script that accesses child nodes** — without it, `Ex` methods cannot inject mocks even when `IsTesting == true`.
- **Declare all child node references as interface types, never as concrete types** — `ISprite2D`, not `Sprite2D`; `ITimer`, not `Timer`.
- **Use only `Ex` methods for child node operations** — standard `GetNode<T>()` / `AddChild()` calls are invisible to the fake tree and will bypass mocks.
- **Set `RuntimeContext.IsTesting = true` in `[SetUp]` or test bootstrap, before any node's `_Ready()` runs** — setting it after initialization has no effect.
- **Define a custom interface for each of your own node types** (`IPlayer : INode`) — this allows callers of that node to mock it too.
- **One script per scene root** — do not attach scripts to non-root nodes unless that subtree is extracted as its own scene. Keeps each node's dependency surface small and testable.
- **Manipulate only direct children, never grandchildren** — if a script needs to touch a grandchild, extract that subtree into a sub-scene with its own root script.
- **Assign `FakeNodes` before calling `_Ready()`** — constructing `FakeNodeTree` after `_Ready()` has no effect.

---

## Integration

### With `AutoInject` (`[Node]` attribute)

When using AutoInject's `IAutoConnect` mixin, the `[Node]` attribute auto-binds properties to scene tree nodes and returns them as interface types via GodotNodeInterfaces. Only **properties** (not fields) can be bound this way.

```csharp
[Node] public ISprite2D Sprite { get; set; } = default!;
```

### With `PowerUps` (`AutoNode`)

The `AutoNode` power-up from the PowerUps package uses GodotNodeInterfaces under the hood to resolve `[Node]`-tagged properties as interfaces — no manual `GetNodeEx` call needed when `AutoNode` is applied to the node class.

---

## Anti-patterns

- **Using concrete node types for child references** (`Sprite2D sprite`) — the fake tree stores `INode` mocks; a concrete cast will fail or bypass the mock.
- **Forgetting `RuntimeContext.IsTesting = true`** — `Ex` methods fall through to the real scene tree, causing `NullReferenceException` or unintended node lookups in tests.
- **Mixing `GetNode<T>()` and `GetNodeEx<T>()` in the same script** — the plain `GetNode` call will always hit the real tree, making partial mocking unreliable.
- **Putting scripts on non-root child nodes without extracting a sub-scene** — inflates the test surface and makes `FakeNodeTree` setup exponentially larger.
- **Binding to fields instead of properties in `AutoInject`** — `IAutoConnect` and `AutoNode` skip fields; only properties with public or internal setters are bound.
- **Constructing `FakeNodeTree` after `_Ready()`** — the tree is resolved during `_Ready()`, so late-constructed fakes are never consulted.
