---
version: 1.0.0
---

# Code Style

> **Scope**: Universal GDScript/Godot code style conventions — naming, type hints, member ordering, class structure, formatting, node approach, documentation.
> **Load when**: writing or reviewing any GDScript code, creating new classes, checking code style.

---

## Naming

- **snake_case** for variables, functions, signals, and file names: `var timer_delay_seconds: int`
- **PascalCase** for class names and enum names: `class_name PlayerController`, `enum WeaponType`
- **SCREAMING_SNAKE_CASE** for constants: `const MAX_HEALTH: int = 100`
- `private` members (convention): underscore prefix: `var _timer_delay_seconds: int`
- Signals: past tense verb: `signal day_started(day_index: int)`
  - Pattern: `{subject}_{past_tense_verb}` or `{past_tense_verb}`
  - WRONG: `signal day_start`, `signal start_day`, `signal day_starting`
- Enum values: SCREAMING_SNAKE_CASE: `enum WeaponType { MELEE, RANGED, MAGIC }`
- Bool variables MUST use `is_`/`has_`/`can_` prefix (e.g., `is_enabled`, `has_items`, `can_move`)
- When a base class exposes a public method and needs a virtual template method for subclasses, name the template method with an `_internal` suffix — e.g., `func launch()` → `func _launch_internal()`. This clearly communicates that the method is the internal hook of the public API

## Type Hints

- ALWAYS use static type hints for ALL variables, parameters, and return types
- NEVER omit type hints — always declare with explicit types

```gdscript
# ✅ Correct — explicit types everywhere
var health: int = 100
var player_name: String = ""
var items: Array[ItemData] = []

func calculate_damage(base_damage: float, multiplier: float) -> float:
    return base_damage * multiplier

# ❌ Wrong — missing type hints
var health = 100
func calculate_damage(base_damage, multiplier):
    return base_damage * multiplier
```

- Use typed arrays: `Array[ItemData]` instead of bare `Array`
- Use `StringName` for identifiers compared frequently (e.g., animation names, input actions)

## Access Modifiers

- Godot has no enforced access modifiers — use underscore `_` prefix convention for private members
- ALL members not intended for external use MUST have `_` prefix
- All Godot lifecycle methods (`_ready`, `_process`, `_physics_process`) are inherently private (prefixed `_`)

## Member Ordering in Script

**By member type (level 1):**

1. `class_name` -> 2. `extends` -> 3. Docstring -> 4. Signals -> 5. Enums -> 6. Constants -> 7. `@export` variables -> 8. Public variables -> 9. Private variables (`_prefix`) -> 10. `@onready` variables -> 11. Godot lifecycle methods (`_ready`, `_enter_tree`, `_exit_tree`, `_process`, `_physics_process`, `_input`, `_unhandled_input`) -> 12. Public methods -> 13. Private methods (`_prefix`) -> 14. Inner classes

**Godot lifecycle method ordering:**

1. `_init` -> 2. `_enter_tree` -> 3. `_ready` -> 4. `_exit_tree` -> 5. `_process` -> 6. `_physics_process` -> 7. `_input` -> 8. `_unhandled_input` -> 9. `_notification` -> 10. Other engine callbacks

If class has a public `initialize` method, it must be first among public methods, but below Godot lifecycle methods.

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
| UI | UI control/panel | `InventoryUI` |
| Data / Resource | Data container (Resource) | `PlayerData` |

## Class Structure

- Each script has clear purpose and single responsibility
- Resources with `@export` — use typed properties
- For configurations — ALWAYS use custom `Resource` classes, not dictionaries
- Make inner classes when logic is used only within one script
- Each class goes in a separate `.gd` file
- Constructor (`_init`) parameter validation: use `assert()` for mandatory arguments in debug

## Code Formatting

- Separate code into logical blocks with empty lines
- Use constants instead of magic values (strings and numbers)
- `return` ALWAYS has one empty line before it. Exception: if return is the only line in for, while, match case
- For negation in conditions, always use `== false` or `not` keyword — e.g., `if not items.has(item):` (prefer `not` over `== false` in GDScript for readability)
- Always add one empty line between functions
- When a function has more than 2 parameters, place each parameter on its own line — one parameter per line
- Use `match` instead of long `if/elif` chains for pattern matching
- Always use `pass` for empty function bodies — never leave them blank

## Node Approach (Godot)

- `@export` for inspector-visible properties
- `@export_group("Group Name")` for grouping exported properties in inspector
- `@export_category("Category")` for top-level inspector sections
- `@onready` for node references resolved at `_ready()` time: `@onready var sprite: Sprite2D = $Sprite2D`
- Custom `Resource` classes for storing data instead of autoload globals
- Use `@tool` annotation for editor scripts that need to run in the editor

## Non-Node First

Use plain `RefCounted` or `Object` classes for ALL business logic. Node scripts ONLY when:
- Visual elements on scene (transform, rendering, physics)
- Godot lifecycle (`_ready`, `_process`, `_physics_process`, `_input`)
- View components (visualization, animation, UI)

```gdscript
# ✅ Business logic in plain class
class_name Wallet
extends RefCounted

var _balance: int = 0

func add(amount: int) -> void:
    _balance += amount

# ✅ Node script only for visualization
class_name WalletView
extends Control

@onready var _label: Label = $Label

func display_balance(amount: int) -> void:
    _label.text = str(amount)
```

## Try/Error Pattern

- Method that cannot complete — use `push_error()` and return a sentinel value, or use `assert()` for debug
- `try_` prefix — returns `bool` or `Variant` (null on failure), no errors pushed
- Never swallow errors silently — always `push_error()` or `push_warning()`
- Use custom error enum returns for recoverable failures

```gdscript
# Pattern: try_ prefix returns bool
func try_spend(currency: CurrencyType, amount: int) -> bool:
    if _balance < amount:
        return false
    _balance -= amount

    return true

# Pattern: non-try method asserts/errors
func spend(currency: CurrencyType, amount: int) -> void:
    assert(amount > 0, "Amount must be positive")
    if _balance < amount:
        push_error("Insufficient funds: %d < %d" % [_balance, amount])

        return
    _balance -= amount
```

## Documentation

- English docstrings (`##`) on all public methods: purpose and parameter descriptions
- `##` comments above class declaration for class-level documentation
- NEVER write inline comments in code
- ALWAYS update documentation after editing methods

```gdscript
## Manages the player's currency balance.
## Supports multiple currency types with independent balances.
class_name Wallet
extends RefCounted

## Adds the specified amount to the given currency balance.
## [param currency]: The type of currency to add.
## [param amount]: The amount to add (must be positive).
func add(currency: CurrencyType, amount: int) -> void:
    pass
```
