---
version: 1.0.0
---

# Chickensoft LogicBlocks

> **Scope**: Hierarchical, serializable state machine authoring with LogicBlocks — defining logic blocks, states, inputs, outputs, blackboard dependencies, lifecycle hooks, the binding system, and integrating state machines into Godot .NET nodes.
> **Load when**: authoring state machines with LogicBlocks, defining states or transitions, wiring inputs or outputs, using the blackboard, testing logic blocks, serializing game state, integrating logic blocks into Godot nodes.

---

## Installation

Add three packages to your `.csproj`. Generator packages require `PrivateAssets` and `OutputItemType`:

```xml
<PackageReference Include="Chickensoft.LogicBlocks" Version="#.#.#" />
<PackageReference Include="Chickensoft.LogicBlocks.DiagramGenerator"
  Version="#.#.#" PrivateAssets="all" OutputItemType="analyzer" />
<PackageReference Include="Chickensoft.Introspection.Generator"
  Version="#.#.#" PrivateAssets="all" OutputItemType="analyzer" />
```

Keep `LogicBlocks` and `LogicBlocks.DiagramGenerator` on the **same version** — they release together.

Add to `PropertyGroup` to catch compiler-mismatch issues early:

```xml
<WarningsAsErrors>CS9057</WarningsAsErrors>
```

## Core Concepts

A **logic block** is a class that receives **inputs**, maintains a single **state** instance, and produces **outputs**. It operates as a Moore machine: outputs come from state entry/exit, not from transitions themselves.

| Statecharts term | LogicBlocks term |
|------------------|-----------------|
| Event            | Input           |
| Action           | Output          |
| Internal transition | Self transition |

## Anatomy of a Logic Block

A minimal logic block requires:

- `partial` class inheriting `LogicBlock<TState>`
- `[Meta]` and `[LogicBlock(typeof(State), Diagram = true)]` attributes
- Override `GetInitialState()` returning `To<InitialState>()`
- Nested `Input` static class — input definitions
- Nested `Output` static class — output definitions
- Nested `abstract record State : StateLogic<State>` — base state

```csharp
using Chickensoft.Introspection;

[Meta, LogicBlock(typeof(State), Diagram = true)]
public partial class LightSwitch : LogicBlock<LightSwitch.State> {
  public override Transition GetInitialState() => To<State.PoweredOff>();

  public static class Input {
    public readonly record struct Toggle;
  }

  public static class Output {
    public readonly record struct StatusChanged(bool IsOn);
  }

  public abstract record State : StateLogic<State> {
    public record PoweredOn : State, IGet<Input.Toggle> {
      public PoweredOn() {
        this.OnEnter(() => Output(new Output.StatusChanged(IsOn: true)));
      }
      public Transition On(in Input.Toggle input) => To<PoweredOff>();
    }

    public record PoweredOff : State, IGet<Input.Toggle> {
      public PoweredOff() {
        this.OnEnter(() => Output(new Output.StatusChanged(IsOn: false)));
      }
      public Transition On(in Input.Toggle input) => To<PoweredOn>();
    }
  }
}
```

## Inputs

- Define as `readonly record struct` inside a nested `static class Input`.
- Use `readonly record struct` — keeps inputs on the stack, prevents heap allocation when no queuing is needed.
- States handle inputs by implementing `IGet<TInput>` and providing `public Transition On(in TInput input)`.
- Inputs are processed **one at a time, in order**.
- Unhandled inputs are **silently discarded** — design state machines so states only receive inputs they expect.

```csharp
public static class Input {
  public readonly record struct Toggle;
  public readonly record struct SetBrightness(double Level);
}
```

Sending an input from outside:

```csharp
logic.Input(new LightSwitch.Input.Toggle());
```

Sending an input from **within** a state handler (e.g., during `OnEnter`):

```csharp
this.OnEnter(() => Context.Input(new Input.SomeFollowUp()));
```

## Outputs

- Define as `readonly record struct` inside a nested `static class Output`.
- Produce outputs from lifecycle callbacks (`OnEnter`, `OnExit`) or from within `On()` handlers.
- Use `Output(new Output.X(...))` syntax inside states.

```csharp
public record PoweredOn : State, IGet<Input.Toggle> {
  public PoweredOn() {
    this.OnEnter(() => Output(new Output.StatusChanged(IsOn: true)));
  }
  public Transition On(in Input.Toggle input) {
    Output(new Output.StatusChanged(IsOn: false));
    return To<PoweredOff>();
  }
}
```

## Lifecycle Callbacks

Register all callbacks in the **state's constructor**. Callbacks are extension methods — use `this.OnEnter` / `this.OnExit`.

| Callback       | When it fires                                          | Typical use                        |
|----------------|--------------------------------------------------------|------------------------------------|
| `this.OnEnter` | State becomes the active state (type match)            | Produce outputs, trigger effects   |
| `this.OnExit`  | State is no longer the active state (type match)       | Cleanup, produce outputs           |
| `OnAttach`     | State instance is attached (including hierarchy enter) | Subscribe to events/signals        |
| `OnDetach`     | State instance is detached                             | Unsubscribe from events/signals    |

```csharp
public MyState() {
  this.OnEnter(() => Output(new Output.Activated()));
  this.OnExit(() => Output(new Output.Deactivated()));
  OnAttach(() => someSignal += OnSignalFired);
  OnDetach(() => someSignal -= OnSignalFired);
}
```

`OnAttach`/`OnDetach` fire on **instance change** (new object created), while `OnEnter`/`OnExit` fire on **type hierarchy change**.

## Hierarchical States

Use inheritance to create composite (parent) states. Lifecycle callbacks execute in constructor order — parent constructor runs first (base class first):

```csharp
public abstract record Active : State {
  public Active() {
    this.OnEnter(() => Console.WriteLine("Active entered"));
  }

  public record Walking : Active {
    public Walking() {
      this.OnEnter(() => Console.WriteLine("Walking entered"));
    }
  }

  public record Running : Active {
    public Running() {
      this.OnEnter(() => Console.WriteLine("Running entered"));
    }
  }
}
```

When entering `Walking`, the output order is: `"Active entered"` → `"Walking entered"`.

## Blackboard

The blackboard is a typed data store shared between the logic block and all its states.

Set dependencies **before starting** the logic block:

```csharp
logic.Set<IPlayerService>(new PlayerService());
logic.Set<GameData>(new GameData());
```

Access from within states using `Get<T>()`:

```csharp
public Transition On(in Input.Jump input) {
  var data = Get<GameData>();
  if (data.IsGrounded) {
    Output(new Output.JumpStarted());
    return To<Jumping>();
  }
  return ToSelf();
}
```

## Transition Modification with `.With()`

Use `To<T>().With(...)` to configure the next state before it becomes active:

```csharp
public Transition On(in Input.StartFade input) =>
  To<FadingOut>()
    .With(state => ((FadingOut)state).TargetScene = input.Scene);
```

Prefer typed state properties over dynamic blackboard values when the data is specific to the transition.

## Binding System

Use `logic.Bind()` to observe a logic block from a Godot node or any external consumer. The binding is `IDisposable` — store it and dispose when done.

```csharp
public partial class Player : CharacterBody3D {
  private PlayerLogic _logic = default!;
  private PlayerLogic.IBinding _binding = default!;

  public override void _Ready() {
    _logic = new PlayerLogic();
    _logic.Set<IPhysicsService>(new GodotPhysicsService(this));
    _binding = _logic.Bind();

    _binding
      .Handle((in PlayerLogic.Output.MovementUpdated output) =>
        _animationPlayer.Play(output.AnimationName))
      .Handle((in PlayerLogic.Output.Died output) =>
        GetTree().ReloadCurrentScene());

    _logic.Start();
  }

  public override void _ExitTree() => _binding.Dispose();
}
```

Binding API:

| Method                          | Purpose                                    |
|---------------------------------|--------------------------------------------|
| `binding.Handle((in Output.X)…)` | React to a specific output type           |
| `binding.Watch((in Input.X)…)`   | Observe a specific input being processed  |
| `binding.When((State.X _)…)`     | React when state is of a specific type    |
| `binding.Catch((Exception e)…)`  | Handle all exceptions from the logic block |

**Prefer `Handle` (outputs) over `When` (state changes)** — outputs express intent explicitly, state checks are implicit and fragile.

## Integration with Godot Nodes

Keep Godot nodes "dumb" — they forward engine events as inputs and react to outputs. The logic block contains all game logic.

```csharp
// Node: translate Godot event → input
public override void _Input(InputEvent @event) {
  if (@event.IsActionPressed("jump"))
    _logic.Input(new PlayerLogic.Input.Jump());
}

// Node: react to output → call engine API
private void OnOutputJumpStarted() =>
  _animPlayer.Play("jump");
```

Two-phase initialization separates construction from binding, enabling clean unit testing:

```csharp
public override void _Ready() {
  _logic = new PlayerLogic();     // Phase 1: construct, inject deps
  _logic.Set<IMyService>(_service);
  _binding = _logic.Bind();       // Phase 2: bind outputs
  BindOutputs();
  _logic.Start();
}
```

## Testing

Use `CreateFakeContext()` to unit-test states in isolation without a real logic block:

```csharp
[Fact]
public void TransitionsToJumping_WhenGrounded() {
  var state = new PlayerLogic.State.Idle();
  var context = state.CreateFakeContext();

  context.Set(new PlayerData { IsGrounded = true });

  var result = state.On(new PlayerLogic.Input.Jump());

  result.State.ShouldBeOfType<PlayerLogic.State.Jumping>();
}
```

`context.Set<T>()` injects blackboard values; `context.Get<T>()` reads them after the handler runs.

## Serialization

LogicBlocks supports JSON serialization via `System.Text.Json` with `Chickensoft.Serialization`:

```csharp
var options = new JsonSerializerOptions {
  WriteIndented = true,
  TypeInfoResolver = new SerializableTypeResolver(),
  Converters = { new SerializableTypeConverter() }
};

var json = JsonSerializer.Serialize(logic, options);
var restored = JsonSerializer.Deserialize<MyLogicBlock>(json, options);
```

Add `[Id("unique_id")]` to each serializable type for stable discriminators across renames. Serialization is AOT-compatible.

## Diagram Generation

Add `Diagram = true` to the `[LogicBlock]` attribute to enable UML diagram generation. The generator outputs `*.g.puml` files visualizable with PlantUML.

```csharp
[Meta, LogicBlock(typeof(State), Diagram = true)]
public partial class MyLogic : LogicBlock<MyLogic.State> { ... }
```

## Anti-patterns

- **Forgetting `this.` on `OnEnter`/`OnExit`** — they are extension methods; calling `OnEnter(...)` without `this.` compiles but does nothing or calls the wrong method.
- **Using class-based or non-readonly inputs/outputs** — always use `readonly record struct` to avoid heap allocations and ensure immutability.
- **Not marking the logic block class `partial`** — source generators will not run and attributes will have no effect.
- **Relying on unhandled inputs to be "silently safe"** — they are discarded without error; design states to explicitly handle every expected input or add defensive logging.
- **Producing outputs from `OnAttach`/`OnDetach`** — these fire on instance creation/destruction, not on logical state entry/exit; use `OnEnter`/`OnExit` for game-logic outputs.
- **Performing Godot engine calls directly inside state handlers** — states should produce outputs; the Godot node's binding translates outputs into engine calls, maintaining decoupling.
- **Starting the logic block before setting blackboard dependencies** — call `logic.Set<T>(...)` for all required services before `logic.Start()` or before the first `logic.Input(...)`.
- **Not disposing the binding** — forgetting `binding.Dispose()` leaks memory; store as a field and dispose in `_ExitTree()`.
- **Using LogicBlocks for trivial two-state switches** — LogicBlocks shines for hierarchical, testable, complex state machines; a simple bool flag is sufficient for trivial cases.
