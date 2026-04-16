---
version: 1.0.0
---

# GodotTestDriver

> **Scope**: Integration testing for Godot 4 C# projects using the Chickensoft.GodotTestDriver library — scene loading via the Fixture class, the test-driver pattern for abstracting node interactions, input simulation (keyboard, mouse, controller, actions), and async waiting utilities.
> **Load when**: writing integration or scene tests with GodotTestDriver, creating custom node drivers, simulating user input in tests, waiting for async game conditions, setting up or tearing down test fixtures, integrating with GoDotTest runner.

---

## Core Concepts

**GodotTestDriver is NOT a test runner** — it is a helper library for writing integration tests. Use it together with **GoDotTest** (`Chickensoft.GoDotTest`), which handles test discovery, execution, and reporting.

The library is built around three pillars:

1. **Fixture** — manages scene/node lifecycle: loads scenes into the tree, schedules auto-cleanup, and ensures all tree modifications happen on the main thread.
2. **Drivers** — abstraction layers over Godot nodes. A driver wraps a *producer function* that returns a node (or `null`). Drivers decouple test code from the node tree structure.
3. **Input & Wait extensions** — extension methods on `Node`, `Viewport`, and `SceneTree` for simulating user input and waiting for async conditions.

---

## Setup

Install via NuGet:

```bash
dotnet add package Chickensoft.GodotTestDriver
dotnet add package Chickensoft.GoDotTest
```

Add to your test project's `.csproj`:

```xml
<PropertyGroup>
  <!-- Required for netstandard2.1 targets to work with Godot's mono runtime -->
  <CopyLocalLockFileAssemblies>true</CopyLocalLockFileAssemblies>

  <!-- Exclude test files from export release builds -->
  <DefaultItemExcludes Condition="'$(Configuration)' == 'ExportRelease'">
    $(DefaultItemExcludes);test/**/*
  </DefaultItemExcludes>
</PropertyGroup>

<ItemGroup>
  <PackageReference Include="Chickensoft.GodotTestDriver" Version="*" />
  <PackageReference Include="Chickensoft.GoDotTest" Version="*" />
</ItemGroup>
```

---

## Fixture Class

`Fixture` is the entry point for every integration test. Always create one in setup, always call `Cleanup()` in teardown.

```csharp
using Chickensoft.GodotTestDriver;

public class MyTest
{
    private Fixture _fixture;

    public async Task Setup(SceneTree tree)
    {
        _fixture = new Fixture(tree);

        // Load a scene and add it to the tree root — auto-freed on cleanup
        var arena = await _fixture.LoadAndAddScene<Arena>("res://arena.tscn");

        // Load a scene without adding it to the tree
        var player = _fixture.LoadScene<Player>("res://player.tscn");
        arena.AddChild(player);

        // Instantiate a node directly and schedule it for auto-free
        var weapon = _fixture.AutoFree(new Weapon());
        player.AddChild(weapon);
    }

    public async Task TearDown()
    {
        await _fixture.Cleanup(); // frees all tracked nodes in reverse order
    }
}
```

### Custom cleanup steps

Register arbitrary cleanup actions while the test runs:

```csharp
fixture.AddCleanupStep(() => File.Delete("user://savegame.dat"));
// Runs automatically during fixture.Cleanup()
```

### Fixture API summary

| Method | Description |
|--------|-------------|
| `LoadAndAddScene<T>(path)` | Load `.tscn`, add to tree root, schedule auto-free |
| `LoadScene<T>(path)` | Load `.tscn` without adding to tree, schedule auto-free |
| `AutoFree(node)` | Track any manually created node for auto-free |
| `AddCleanupStep(action)` | Register a custom `Action` to run during `Cleanup()` |
| `Cleanup()` | Free all tracked nodes (in reverse order) and run custom steps |

---

## Driver Pattern

Drivers wrap a *producer* — a `Func<T?>` that returns a node or `null`. Drivers never throw `NullReferenceException`; they validate state only when an *operation* is performed.

Use drivers instead of direct `GetNode` calls so tests don't break when the node tree is reorganized.

### Built-in Drivers

| Driver | Node type | Key operations |
|--------|-----------|----------------|
| `ControlDriver<T>` | Any `Control` | `IsPresent`, `IsVisible`, `IsFullyInView`, `ClickCenter()`, `Hover(duration)`, `GrabFocus()` |
| `ButtonDriver` | `Button` | `Click()`, `IsDisabled`, `Text` |
| `BaseButtonDriver<T>` | `BaseButton` | `IsPressed`, `Toggle()` |
| `CheckBoxDriver` | `CheckBox` | `IsChecked`, `Toggle()` |
| `LabelDriver` | `Label` | `Text` |
| `RichTextLabelDriver` | `RichTextLabel` | `Text`, `ParsedText` |
| `LineEditDriver` | `LineEdit` | `Text`, `Type(text)`, `Clear()` |
| `TextEditDriver` | `TextEdit` | `Text`, `Type(text)`, `Clear()` |
| `OptionButtonDriver` | `OptionButton` | `SelectedIndex`, `Select(index)` |
| `ItemListDriver` | `ItemList` | `SelectedIndex`, `Select(index)` |
| `PopupMenuDriver` | `PopupMenu` | `IsVisible`, `ClickItem(index)` |
| `GraphEditDriver` | `GraphEdit` | Graph-level interaction |
| `GraphNodeDriver` | `GraphNode` | Node-level interaction |
| `WindowDriver` | `Window` | `IsVisible`, `Close()` |
| `Node2DDriver<T>` | Any `Node2D` | `GlobalPosition`, `Rotation`, `Scale`, `IsVisible` |
| `Camera2DDriver` | `Camera2D` | Viewport control |
| `Sprite2DDriver` | `Sprite2D` | Texture and transform |
| `CanvasItemDriver<T>` | Any `CanvasItem` | Drawing layer abstraction |
| `NodeDriver<T>` | Any `Node` | Generic base — extend for custom node types |

### Creating custom drivers

Extend the appropriate base class. Child drivers navigate from the parent's `Root` node.

```csharp
using Chickensoft.GodotTestDriver.Drivers;
using Godot;

public class ConfirmDialogDriver : ControlDriver<PanelContainer>
{
    public LabelDriver Message { get; }
    public ButtonDriver YesButton { get; }
    public ButtonDriver NoButton { get; }

    public ConfirmDialogDriver(Func<PanelContainer?> producer) : base(producer)
    {
        // Use GetNodeOrNull so producers never throw
        Message   = new LabelDriver(  () => Root?.GetNodeOrNull<Label> ("VBox/Message"));
        YesButton = new ButtonDriver(() => Root?.GetNodeOrNull<Button>("VBox/HBox/YesButton"));
        NoButton  = new ButtonDriver(() => Root?.GetNodeOrNull<Button>("VBox/HBox/NoButton"));
    }

    // Expose domain-level operations, not raw clicks
    public void Confirm() => YesButton.ClickCenter();
    public void Deny()    => NoButton.ClickCenter();
}

// Usage
var dialog = new ConfirmDialogDriver(
    () => GetTree().GetNodeOrNull<PanelContainer>("UI/ConfirmDialog")
);
dialog.Confirm();
await GetTree().WithinSeconds(2, () => Assert.False(dialog.IsVisible));
```

**Rules for producer functions:**
- Never throw — return `null` when the node is absent.
- Use `GetNodeOrNull<T>()`, not `GetNode<T>()`.
- Only throw `InvalidOperationException` inside *operation* methods when preconditions fail (e.g., clicking an invisible button).

---

## Input Simulation

Import the appropriate namespace:
- `using Chickensoft.GodotTestDriver.Input;`

### Keyboard

Extension methods on `Node`:

```csharp
node.PressKey(Key.A);
node.ReleaseKey(Key.A);
node.TypeKey(Key.Enter);                              // press + release
node.TypeKey(Key.S, control: true);                  // Ctrl+S
node.TypeKey(Key.Z, control: true, shift: true);     // Ctrl+Shift+Z
await node.HoldKeyFor(1.5f, Key.Space);              // hold for seconds
```

### Mouse

Extension methods on `Viewport`:

```csharp
viewport.MoveMouseTo(new Vector2(100, 100));
viewport.ClickMouseAt(new Vector2(200, 150));                     // left-click
viewport.ClickMouseAt(new Vector2(200, 150), MouseButton.Right);  // right-click
viewport.PressMouse(MouseButton.Left);
viewport.ReleaseMouse(MouseButton.Left);
viewport.DragMouse(new Vector2(100, 100), new Vector2(400, 400), MouseButton.Left);
```

### Controller (Joypad)

Extension methods on `Node`:

```csharp
node.PressJoypadButton(JoyButton.A);
node.ReleaseJoypadButton(JoyButton.A);
node.TapJoypadButton(JoyButton.Y);                   // press + release
node.PressJoypadButton(JoyButton.Start, deviceId: 0);
node.MoveJoypadAxisTo(JoyAxis.LeftX, 0.5f);         // -1.0 to 1.0
node.ReleaseJoypadAxis(JoyAxis.LeftX);               // return to 0.0
await node.HoldJoypadButtonFor(1.5f, JoyButton.RightShoulder);
await node.HoldJoypadAxisFor(2.0f, JoyAxis.TriggerRight, 1.0f);
```

### Input Actions

Extension methods on `Node` (requires the action to be in the project InputMap):

```csharp
node.StartAction("jump");
node.EndAction("jump");
node.StartAction("move_forward", strength: 0.5f);  // 0.0–1.0
await node.HoldActionFor(1.0f, "sprint");
```

---

## Waiting Utilities

Import: `using Chickensoft.GodotTestDriver.Util;`

### Frame and time waits

Extension methods on `SceneTree`:

```csharp
await tree.NextFrame();              // wait 1 process frame
await tree.NextFrame(3);            // wait N process frames
await tree.PhysicsProcessFrame();   // wait 1 physics frame
await tree.PhysicsProcessFrame(2);  // wait N physics frames
await tree.WaitForEvents();         // wait 2 frames (process input events)
await tree.Wait(0.5f);             // wait real seconds (process frames)
await tree.WaitPhysics(0.5f);      // wait real seconds (physics frames)
await tree.WaitUntil(() => player.IsReady, timeoutSeconds: 3.0f);
```

### Condition-based waits

**`WithinSeconds`** — retry an assertion until it passes (optimistic):

```csharp
// Keeps retrying every frame for up to 5 s; throws TimeoutException if not met
await tree.WithinSeconds(5.0f, () => player.IsDead);

await tree.WithinSeconds(3.0f, () => {
    Assert.True(enemy.Health < 50);
    Assert.True(player.Score > 100);
});
```

**`DuringSeconds`** — verify a condition holds throughout a period (pessimistic):

```csharp
// Fails immediately if the condition becomes false at any frame during 5 s
await tree.DuringSeconds(5.0f, () => {
    Assert.Equal(player.MaxHealth, player.Health);
});
```

| Method | When to use |
|--------|-------------|
| `WithinSeconds` | Waiting for something to *eventually* become true (animations, async state changes) |
| `DuringSeconds` | Verifying something *stays* true for a sustained period |
| `WaitUntil` | Simpler `bool` predicate without an assertion framework |

---

## Best Practices

- **Always pair `Fixture` creation with `Cleanup()`** — use `try/finally` to guarantee cleanup even on test failure.
- **Use drivers over `GetNode` in test assertions** — drivers survive node tree refactors; bare `GetNode` calls don't.
- **Producer functions must return `null`, never throw** — wrap in `GetNodeOrNull<T>()`.
- **After input, await at least one frame** — most input methods don't advance the frame automatically. Call `await tree.WaitForEvents()` or `await tree.NextFrame()` before asserting state changes.
- **Use `WithinSeconds` for async state changes** — never `Assert` immediately after triggering an async operation.
- **Register cleanup steps during the test** — prefer `fixture.AddCleanupStep()` over ad-hoc teardown logic.
- **Custom drivers expose domain operations, not raw clicks** — `dialog.Confirm()` is better than `dialog.YesButton.ClickCenter()` in every test.

---

## Anti-patterns

- **Skipping `Cleanup()`** — scenes and nodes accumulate across tests, causing state bleed and false passes/failures.
- **Asserting synchronously after async triggers** — always `await` at least one frame or use `WithinSeconds`.
- **Throwing from producer functions** — a producer that throws breaks every driver method silently rather than giving a meaningful error at the operation site.
- **Hard-coding node paths directly in test assertions** — restructuring the scene tree breaks all tests; centralize path logic in the driver.
- **Using `Wait(N)` for magic sleep** — prefer `WithinSeconds` with a real condition; fixed waits make tests slow and flaky.
- **Mixing GodotTestDriver with a different test runner** — pair with GoDotTest (`Chickensoft.GoDotTest`) for the full Chickensoft testing stack; other runners may not provide `SceneTree` access in the same way.
