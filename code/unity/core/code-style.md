---
version: 1.0.0
---

# Code Style

> **Scope**: Universal C#/Unity code style conventions — naming, access modifiers, member ordering, class structure, formatting, component approach, documentation.
> **Load when**: writing or reviewing any C# code, creating new classes, checking code style.

---

## Naming

- **CamelCase** for all identifiers
- `private` fields: underscore prefix + lowercase: `private int _timerDelaySeconds;`
- Constants: uppercase first letter: `private const int TimerDelaySeconds = 5;`
- `public`/`protected` properties: uppercase first letter: `public int TimerDelaySeconds { get; }`
- Events: `On` prefix + past tense verb: `public event Action<int> OnDayStarted;`
  - Pattern: `On{Subject}{PastTenseVerb}` or `On{PastTenseVerb}`
  - WRONG: `public event Action DayStart;`, `public event Action StartDay;`, `public event Action DayStarting;`
- Container/panel ViewModels that hold a collection of child ViewModels must include `Panel` in the name when the base name differs only by pluralization — e.g., `MiniGameButtonsPanelViewModel` (not `MiniGameButtonsViewModel`) for a panel containing `MiniGameButtonViewModel` items. Apply the same disambiguation to Views and other paired class types.
- When a base class exposes a public/explicit-interface method and needs a protected abstract template method for subclasses, name the template method with an `Internal` suffix — e.g., `void IMiniGame.Launch(MiniGameItemConfig config)` → `protected abstract void LaunchInternal(TConfig config)`. This clearly communicates that the method is the internal hook of the public API.
- Bool properties and fields MUST use `Is`/`Has`/`Can` prefix (e.g., `IsEnabled`, `HasItems`, `CanMove`).

## Access Modifiers

- ALWAYS specify access modifier explicitly
- Fields initialized in constructor — ALWAYS `readonly`
- No inheritors — ALWAYS `sealed`; has inheritors — ALWAYS `abstract`
- NEVER make fields `public` — maintain encapsulation
- All Unity lifecycle methods in MonoBehaviour — `private`

## Type Declarations

- NEVER use `var` — always declare local variables with explicit types
- Exception: tuple deconstruction `(string guid, AssetReference assetRef) = ...` uses explicit types inline

## Member Ordering in Class

**By member type (level 1):**

1. Constant Fields -> 2. Fields -> 3. Constructors -> 4. Finalizers -> 5. Delegates -> 6. Events -> 7. Enums -> 8. Interfaces (implementations) -> 9. Properties -> 10. Indexers -> 11. Methods -> 12. Structs -> 13. Classes

**By access modifier within each group (level 2):**

public -> internal -> protected internal -> protected -> private protected -> private

**Additional sorting (levels 3-4):**

- `static` before non-static
- `readonly` before non-readonly

**Unity lifecycle method ordering:**

Unity lifecycle methods in MonoBehaviour ALWAYS above user methods:

1. Awake -> 2. OnEnable -> 3. OnDisable -> 4. Start -> 5. OnDestroy -> 6. OnTriggerEnter -> 7. OnCollisionEnter -> 8. OnTriggerStay -> 9. OnCollisionStay -> 10. OnTriggerExit -> 11. OnCollisionExit -> 12. Other MonoBehaviour events

If class has public `Initialize` method, it must be first within its interface scope, but below Unity lifecycle methods.

## Class Naming Suffixes

| Suffix | Purpose | Example |
|--------|---------|---------|
| System | Large subsystem | `CombatSystem` |
| Controller | GRASP controller, coordination | `ZombieKillFinishController` |
| Calculator / Validator | Utility logic | `ScoreCalculator` |
| Manager | Collection management | `EnemyManager` |
| Factory | Object creation | `WeaponFactory` |
| Provider | Data provision | `ConfigProvider` |
| View | Visualization (MonoBehaviour) | `PlayerView` |
| Presenter | UI logic (MonoBehaviour) | `ShopPresenter` |
| Model | Data model | `PlayerModel` |

## Class Structure

- Each class has clear purpose and single responsibility
- Serializable structs with `[field: SerializeField]` — properties MUST have `{ get; private set; }`
- Don't use dictionaries for serialized fields — use serializable lists
- For configurations — ALWAYS create public methods for collection data access (Information Expert)
- Make classes/structs `internal` and `private` if used only within one class
- Partial class files: `{ClassName}_{Section}.cs`
- Each class/struct goes in a separate .cs file
- Constructor null checks MUST be symmetric — if any parameter is validated with `?? throw new ArgumentNullException`, ALL reference-type parameters in the same constructor must be validated the same way. Never leave some parameters checked and others unchecked.
- Trivial properties (`get => _field; set => _field = value;`) for non-serialized fields are an anti-pattern — use `internal` fields directly. A property is justified only when it adds value: validation, lazy init, side effects, readonly restriction, or a bridge between `[SerializeField] private _camelCase` and `internal PascalCase`.

## Code Formatting

- Separate code into logical blocks with empty lines
- Use constants instead of magic values (strings and numbers)
- `return` ALWAYS has one empty line before it. Exception: if return is the only line in for, while, foreach, case
- For negation in conditions, always use `== false` instead of `!` operator — e.g., `_loadingGuids.Contains(guid) == false` (not `!_loadingGuids.Contains(guid)`)
- Always add one empty line between properties
- When a method has more than 2 parameters, place each parameter on its own line — one parameter per line

## Component Approach (Unity)

- `[SerializeField]` for private fields in MonoBehaviour displayed in inspector
- `[Title()]` for grouping serialized fields in inspector
- `[Required]` for mandatory serialized object references
- `ScriptableObject` for storing data instead of static classes
- `[RequireComponent()]` if MonoBehaviour gets components via `GetComponent`
- When renaming `[SerializeField]` fields, ALWAYS add `[FormerlySerializedAs("oldName")]` to prevent data loss in scenes and prefabs

## Non-MonoBehaviour First

Use plain C# classes for ALL business logic. MonoBehaviour ONLY when:
- Visual elements on scene (physics, transform access)
- Unity lifecycle (Awake, Start, Update, OnTrigger, OnCollision)
- View components (visualization, animation, UI)

## Try/Exception Pattern

- Method that cannot complete — MUST throw exception
- `Try` prefix — returns `bool`, no exceptions, result via `out` parameter
- Never swallow exceptions silently (`catch {}`) — log or rethrow
- Never use bare `catch` — always specify the exception type (`catch (Exception)` at minimum), even if rethrowing. Different exception types may require different cleanup paths

## Documentation

- English XML docs on all public methods: purpose and parameter descriptions
- NEVER write inline comments in code
- ALWAYS update documentation after editing methods
