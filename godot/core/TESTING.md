---
version: 1.0.0
---

# Unit Testing Rules

> **Scope**: Rules for GUT (Godot Unit Test) framework — test structure, naming, test doubles (Fake/Stub/Mock), parameterized tests, boundary conditions, test organization, Resource in tests.
> **Load when**: writing or reviewing unit tests, creating test doubles, setting up test structure.

---

## Framework & Mode

- Framework: **GUT** (Godot Unit Test) — `addons/gut/`
- Test location: `tests/` at project root, or `modules/{module_name}/tests/` for module-specific tests
- Test files: `test_{class_name}.gd` — GUT auto-discovers files prefixed with `test_`
- All test scripts extend `GutTest` (or `res://addons/gut/test.gd`)

## Class Type -> Test Approach

| Class type | Unit test | Integration test |
|---|---|---|
| Pure GDScript (RefCounted, no Node) | Recommended | Not needed |
| Resource (custom data) | Recommended | Not needed |
| Node with extractable logic | For pure logic | For lifecycle |
| Node with _process/_physics_process | Not applicable | Required |
| Node with physics/UI interaction | Not applicable | Required |
| Static utility functions | Recommended | Not needed |
| Autoload singletons | With mock replacement | With real autoload |

## File & Folder Structure

```
tests/
  unit/
    test_doubles/
      fake_{dependency_name}.gd
      stub_{dependency_name}.gd
      mock_{dependency_name}.gd
    test_{class_name}.gd
  integration/                     <- only if integration tests needed
    test_{feature_name}.gd

modules/{module_name}/
  tests/
    test_doubles/
      fake_{dependency_name}.gd
    test_{class_name}.gd
```

**One test double = one file.** Never place test doubles inside the test file.

### GUT Configuration (.gutconfig.json)

```json
{
    "dirs": ["res://tests/", "res://modules/"],
    "prefix": "test_",
    "suffix": ".gd",
    "include_subdirs": true,
    "log_level": 1
}
```

## Naming

| Element | Rule | Example |
|---------|------|---------|
| Test file | `test_{class_name}.gd` | `test_wallet.gd` |
| Test class | `Test{ClassName}` (inner class) or script-level | `TestWallet` |
| Test double | Prefix `Fake`/`Stub`/`Mock`, file `{prefix}_{name}.gd` | `fake_currency.gd`, `stub_data_service.gd` |
| Test method | `test_{condition}_{expected_result}` or `test_{action}_{expected_result}` | `test_with_valid_amount_increases_balance` |

## Test Class Structure

- Test script extends `GutTest`
- Group tests via **inner classes** (by operation/scenario) — GUT supports inner class test discovery
- `before_each()` for common initialization — keep minimal (create SUT + inject stubs)
- `after_each()` for cleanup (mandatory for Node instances — `queue_free()`)
- `before_all()` / `after_all()` for one-time setup/teardown

```gdscript
extends GutTest

class TestAddOperation:
    extends GutTest

    var _wallet: Wallet

    func before_each() -> void:
        _wallet = Wallet.new()

    func test_with_valid_amount_increases_balance() -> void:
        # Arrange
        var initial_balance: int = _wallet.get_balance(CurrencyType.COINS)

        # Act
        _wallet.add(CurrencyType.COINS, 50)

        # Assert
        assert_eq(_wallet.get_balance(CurrencyType.COINS), initial_balance + 50)
```

## AAA Pattern

Every test strictly follows **Arrange — Act — Assert** with empty line separators:

```gdscript
func test_with_sufficient_funds_returns_true_and_decreases_balance() -> void:
    # Arrange
    var wallet: Wallet = _create_wallet_with_balance(100)

    # Act
    var result: bool = wallet.try_spend(CurrencyType.COINS, 30)

    # Assert
    assert_true(result)
    assert_eq(wallet.get_balance(CurrencyType.COINS), 70)
```

Each test method tests **one behavior**. Multi-assert only when verifying a single logical outcome.

## Parameterized Tests

Use `ParameterFactory` or manual iteration for multiple input values:

```gdscript
var _damage_params: Array = [
    [0.5, 100, 50],
    [1.0, 100, 100],
    [2.0, 100, 200],
]

func test_with_various_multipliers_returns_expected_value(params = use_parameters(_damage_params)) -> void:
    # Arrange
    var multiplier: float = params[0]
    var cost: int = params[1]
    var expected: int = params[2]

    # Act
    var result: int = _calculator.calculate(cost, multiplier)

    # Assert
    assert_eq(result, expected)
```

## Boundary Conditions

For **every** method under test, check applicable boundaries:

### Value Boundaries

- Null arguments (`null` for Object/RefCounted types)
- Empty collections (Array/Dictionary with `size() == 0`)
- Single-element collections
- `int`: 0, -1, large values (2^31 - 1 for 32-bit contexts)
- `float`: 0.0, -1.0, `INF`, `NAN`, very small values
- `String`: `""` (empty), `" "` (whitespace)
- `StringName`: `&""` (empty StringName)
- `Vector2` / `Vector3`: `Vector2.ZERO`, very large magnitudes, `NAN` components
- Enums: first value, last value, invalid cast `WeaponType.values().size()` (out of range)

### State Boundaries

- Node not yet in tree (before `_ready`)
- Node already freed (`is_instance_valid() == false`)
- Method called twice in a row (idempotency)
- Order-dependent sequences (e.g., `initialize()` before `execute()`)

### Collection Boundaries

- Add to full collection (if capacity-limited)
- Remove from empty collection
- Access by index: -1, 0, last, beyond last
- Duplicate entries

### Godot-Specific Boundaries

- Node is not visible (`visible == false`)
- Node processing is disabled (`set_process(false)`)
- `delta` = 0 (paused via `get_tree().paused = true`)
- Missing node references (`get_node_or_null()` returns `null`)
- Node not in scene tree (`is_inside_tree() == false`)

## Stub / Mock / Fake Rules

- Each double in a separate file under `test_doubles/`
- **Reusable doubles belong to the interface owner's test folder.** If a test double extends a base class from another module, place it in that module's `tests/test_doubles/`, not in the consumer's tests
- Extend the same base class or implement the same duck-typed interface as production code
- `##` docstring documentation mandatory

### Prefixes

| Prefix | Purpose | Has logic? | Records calls? |
|--------|---------|-----------|----------------|
| `Stub` | Provides canned data, no assertions | Minimal | No |
| `Fake` | Working in-memory implementation | Yes | No |
| `Mock` | Records calls for verification | Minimal | Yes |

### Stub Template

```gdscript
# stub_currency.gd
## Stub Currency returning fixed values for unit testing.
class_name StubCurrency
extends RefCounted

var id: String = "coins"
var max_stack: int = 999

func get_id() -> String:
    return id

func get_max_stack() -> int:
    return max_stack
```

### Mock Template

```gdscript
# mock_event_bus.gd
## Mock EventBus recording published events for assertion.
class_name MockEventBus
extends RefCounted

var _published_events: Array[String] = []

var publish_call_count: int:
    get:
        return _published_events.size()

func publish(event_name: String) -> void:
    _published_events.append(event_name)

func was_published(event_name: String) -> bool:
    return _published_events.has(event_name)

func assert_published(event_name: String) -> void:
    assert(was_published(event_name),
        "Expected event '%s' was not published. Published: %s" % [event_name, _published_events])

func assert_not_published(event_name: String) -> void:
    assert(not was_published(event_name),
        "Event '%s' was published but should not have been." % event_name)
```

### Fake Template

```gdscript
# fake_currency.gd
## In-memory Currency fake for unit testing wallet operations.
class_name FakeCurrency
extends RefCounted

# Working lightweight implementation with real logic
```

## Resource in Tests

```gdscript
func before_each() -> void:
    _config = EnemyConfig.new()
    _config.health = 100
    _config.speed = 5.0

# No cleanup needed for RefCounted-based Resources — auto-freed
# For Node-based test objects:
func after_each() -> void:
    if is_instance_valid(_node):
        _node.queue_free()
```

## Node in Tests

For tests requiring scene tree:

```gdscript
extends GutTest

var _player: PlayerController

func before_each() -> void:
    _player = PlayerController.new()
    add_child_autofree(_player)  # GUT auto-frees after test

func test_ready_initializes_health() -> void:
    # Arrange — node is already in tree after add_child_autofree

    # Assert
    assert_eq(_player.current_health, 100)

func test_take_damage_when_node_not_in_tree_does_not_apply() -> void:
    # Arrange
    var detached_player: PlayerController = PlayerController.new()
    # Not added to tree

    # Act
    detached_player.take_damage(50)

    # Assert
    assert_eq(detached_player.current_health, 100)
    detached_player.free()
```

### Scene Instantiation in Tests

```gdscript
func test_enemy_scene_spawns_correctly() -> void:
    # Arrange
    var scene: PackedScene = preload("res://scenes/entities/enemy.tscn")

    # Act
    var enemy: Node = scene.instantiate()
    add_child_autofree(enemy)

    # Assert
    assert_not_null(enemy)
    assert_true(enemy is Enemy)
```

## Assertion Methods (GUT)

| Method | Purpose |
|--------|---------|
| `assert_eq(actual, expected)` | Assert equality |
| `assert_ne(actual, not_expected)` | Assert inequality |
| `assert_true(value)` | Assert boolean true |
| `assert_false(value)` | Assert boolean false |
| `assert_null(value)` | Assert null |
| `assert_not_null(value)` | Assert not null |
| `assert_almost_eq(actual, expected, epsilon)` | Assert float near-equality |
| `assert_between(value, low, high)` | Assert value in range |
| `assert_has(array, value)` | Assert array contains value |
| `assert_does_not_have(array, value)` | Assert array does not contain value |
| `assert_string_contains(string, substring)` | Assert string contains |
| `assert_called(mock, method_name)` | Assert mock method was called |
| `assert_call_count(mock, method_name, count)` | Assert mock method call count |

## Running Tests

```
# In-editor: GUT panel (bottom dock) > Run All / Run Selected
# Command line:
godot --headless -s addons/gut/gut_cmdln.gd -gdir=res://tests/ -gexit

# Run specific test file:
godot --headless -s addons/gut/gut_cmdln.gd -gtest=res://tests/unit/test_wallet.gd -gexit

# Run specific test method:
godot --headless -s addons/gut/gut_cmdln.gd -gtest=res://tests/unit/test_wallet.gd -gunit_test_name=test_with_valid_amount -gexit
```

## Additional Test Requirements

- When code uses string constants to reference node paths, input actions, or animation names (e.g., `$"NodePath"`, `Input.is_action_pressed(&"action_name")`), these constants SHOULD be covered by tests verifying the referenced node/action/animation exists
- Always free Node instances in `after_each()` — use GUT's `add_child_autofree()` for automatic cleanup
- When testing autoloads, mock them or use GUT's `double()` for replacement
- Cover pool-friendly `reset()` methods with a test verifying all fields return to default values after reset

## Untestable Code

If a class is untestable (tightly coupled, no abstractions, global state dependencies), suggest refactoring:

1. Extract logic into plain `RefCounted` classes — needed for isolated testing
2. Replace autoload singleton access with injected dependencies (pass via `initialize()`)
3. Move calculation logic from lifecycle methods (`_process`, `_ready`) into pure functions
4. Provide refactored base classes alongside the tests
