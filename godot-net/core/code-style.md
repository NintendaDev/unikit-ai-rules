---
version: 1.0.0
---

# Code Style

> **Scope**: Universal C#/Godot .NET code style conventions — naming, access modifiers, member ordering, class structure, formatting, node approach, documentation.
> **Load when**: writing or reviewing any C# code, creating new classes, checking code style.

---

## Naming

- **CamelCase** for all identifiers
- `private` fields: underscore prefix + lowercase: `private int _timerDelaySeconds;`
- Constants: uppercase first letter: `private const int TimerDelaySeconds = 5;`
- `public`/`protected` properties: uppercase first letter: `public int TimerDelaySeconds { get; }`
- Signals: `On` prefix + past tense verb, defined via delegate: `[Signal] public delegate void OnDayStartedEventHandler(int dayIndex);`
  - Pattern: `On{Subject}{PastTenseVerb}EventHandler` or `On{PastTenseVerb}EventHandler`
  - WRONG: `DayStartEventHandler`, `StartDayEventHandler`, `DayStartingEventHandler`
- Container/panel ViewModels that hold a collection of child ViewModels must include `Panel` in the name when the base name differs only by pluralization — e.g., `MiniGameButtonsPanelViewModel` (not `MiniGameButtonsViewModel`) for a panel containing `MiniGameButtonViewModel` items. Apply the same disambiguation to Views and other paired class types
- When a base class exposes a public/explicit-interface method and needs a protected abstract template method for subclasses, name the template method with an `Internal` suffix — e.g., `public void Launch()` → `protected abstract void LaunchInternal()`. This clearly communicates that the method is the internal hook of the public API
- Bool properties and fields MUST use `Is`/`Has`/`Can` prefix (e.g., `IsEnabled`, `HasItems`, `CanMove`)

## Access Modifiers

- ALWAYS specify access modifier explicitly
- Fields initialized in constructor — ALWAYS `readonly`
- No inheritors — ALWAYS `sealed`; has inheritors — ALWAYS `abstract`
- NEVER make fields `public` — maintain encapsulation
- All Godot lifecycle methods (`_Ready`, `_Process`, `_PhysicsProcess`, etc.) — `public override`

## Type Declarations

- NEVER use `var` — always declare local variables with explicit types
- Exception: tuple deconstruction `(string guid, StringName path) = ...` uses explicit types inline
- Godot .NET requires `partial class` for all Node-derived scripts (source generators)

## Member Ordering in Class

**By member type (level 1):**

1. Constant Fields -> 2. Signal delegates (`[Signal]`) -> 3. Fields -> 4. Constructors -> 5. Finalizers -> 6. Events -> 7. Enums -> 8. Interfaces (implementations) -> 9. Properties -> 10. Indexers -> 11. Methods -> 12. Structs -> 13. Classes

**By access modifier within each group (level 2):**

public -> internal -> protected internal -> protected -> private protected -> private

**Additional sorting (levels 3-4):**

- `static` before non-static
- `readonly` before non-readonly

**Godot lifecycle method ordering:**

Godot lifecycle methods in Node scripts ALWAYS above user methods:

1. _EnterTree -> 2. _Ready -> 3. _ExitTree -> 4. _Process -> 5. _PhysicsProcess -> 6. _Input -> 7. _UnhandledInput -> 8. _Notification -> 9. Other Godot engine callbacks

If class has public `Initialize` method, it must be first within its interface scope, but below Godot lifecycle methods.

## Class Naming Suffixes

| Suffix | Purpose | Example |
|--------|---------|---------|
| System | Large subsystem (autoload) | `CombatSystem` |
| Controller | Coordination, input handling | `PlayerController` |
| Calculator / Validator | Utility logic | `ScoreCalculator` |
| Manager | Collection management (autoload) | `EnemyManager` |
| Factory | Object/scene creation | `WeaponFactory` |
| Provider | Data provision | `ConfigProvider` |
| View | Visualization (Node-based) | `PlayerView` |
| Presenter | UI logic (Control-based) | `ShopPresenter` |
| Model | Data model | `PlayerModel` |
| Data | Data container (Resource) | `ItemData` |

## Class Structure

- Each class has clear purpose and single responsibility
- Resource classes with `[Export]` — properties MUST have `{ get; set; }`
- Don't use dictionaries for exported fields — use exported typed arrays with Godot collections
- For configurations — ALWAYS create custom `Resource` classes with public methods for collection data access (Information Expert)
- Make classes/structs `internal` and `private` if used only within one class
- Partial class files: `{ClassName}.{Section}.cs` — also required by Godot source generators for Node scripts
- Each class/struct goes in a separate .cs file
- Constructor null checks MUST be symmetric — if any parameter is validated with `?? throw new ArgumentNullException`, ALL reference-type parameters in the same constructor must be validated the same way. Never leave some parameters checked and others unchecked
- Trivial properties (`get => _field; set => _field = value;`) for non-exported fields are an anti-pattern — use `internal` fields directly. A property is justified only when it adds value: validation, lazy init, side effects, readonly restriction, or a bridge between `[Export] private` and `internal PascalCase`

## Code Formatting

- Separate code into logical blocks with empty lines
- Use constants instead of magic values (strings and numbers)
- `return` ALWAYS has one empty line before it. Exception: if return is the only line in for, while, foreach, case
- For negation in conditions, always use `== false` instead of `!` operator — e.g., `_loadedIds.Contains(id) == false` (not `!_loadedIds.Contains(id)`)
- Always add one empty line between properties
- When a method has more than 2 parameters, place each parameter on its own line — one parameter per line

## Node Approach (Godot .NET)

- `[Export]` for inspector-visible properties
- `[ExportGroup("Group Name")]` for grouping exported properties in inspector
- `[ExportCategory("Category")]` for top-level inspector sections
- Cache node references in `_Ready()`: `_sprite = GetNode<Sprite2D>("Sprite2D");`
- Custom `Resource` subclasses for storing data instead of static classes or autoload globals
- Use `[Tool]` attribute for editor scripts that need to run in the editor

## Non-Node First

Use plain C# classes (or `GodotObject` / `RefCounted` subclasses) for ALL business logic. Node scripts ONLY when:
- Visual elements on scene (transform, rendering, physics)
- Godot lifecycle (`_Ready`, `_Process`, `_PhysicsProcess`, `_Input`)
- View components (visualization, animation, UI)

```csharp
// ✅ Business logic in plain C# class
public sealed class Wallet
{
    private int _balance;

    public void Add(int amount)
    {
        _balance += amount;
    }
}

// ✅ Node script only for visualization
public partial class WalletView : Control
{
    private Label _label;

    public override void _Ready()
    {
        _label = GetNode<Label>("Label");
    }

    public void DisplayBalance(int amount)
    {
        _label.Text = amount.ToString();
    }
}
```

## Try/Exception Pattern

- Method that cannot complete — MUST throw exception
- `Try` prefix — returns `bool`, no exceptions, result via `out` parameter
- Never swallow exceptions silently (`catch {}`) — log or rethrow
- Never use bare `catch` — always specify the exception type (`catch (Exception)` at minimum), even if rethrowing. Different exception types may require different cleanup paths
- Use `GD.PushError()` for engine-visible errors, `GD.PushWarning()` for warnings

## Documentation

- English XML docs on all public methods: purpose and parameter descriptions
- NEVER write inline comments in code
- ALWAYS update documentation after editing methods
