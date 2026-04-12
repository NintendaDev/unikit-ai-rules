---
version: 1.0.0
---

# Design Principles

> **Scope**: Universal software design principles adapted for Godot — SOLID, GRASP, KISS, DRY, inheritance guidelines, SRP decision framework, method design, defensive programming.
> **Load when**: designing systems, creating new classes, choosing architecture patterns, deciding when to split or merge classes, method design, defensive programming.

---

## SOLID Principles

- **Single Responsibility** — each class has one reason to change. Don't mix logic, input, visual, and data in one Node
- **Open/Closed** — extend behavior through inheritance, composition (child nodes), and signals, not modifying existing code
- **Liskov Substitution** — subclass must fully replace base type without breaking behavior
- **Interface Segregation** — GDScript has no formal interfaces; use small, focused base classes or protocols (duck typing with type hints) per specific role. Alternatively, define interface-like classes with `class_name` as abstract base
- **Dependency Inversion** — dependencies point from concrete to abstract. Pass dependencies via constructor (`_init`) or `initialize()` method rather than hardcoding references

### SRP in Practice: When to Split Classes

Apply SRP through the lens of **High Cohesion** and **Low Coupling** (GRASP). A class violates SRP when it accumulates many loosely related dependencies that operate on different data — this signals low cohesion and warrants splitting.

**Do NOT split** when:

1. **Dependencies are few and logic is unified by a single domain concept.** Multiple sub-responsibilities under one cohesive name are fine. Example: `QuestManager` handles quest creation, progression, and rewards — different operations, but all bound by the "quest" domain. Contrast with `GameManager` where "game" implies everything — such a class should be split.

2. **The class is a facade for developer convenience.** A public API facade may aggregate multiple responsibilities to simplify usage for consumers. Split the implementation into separate helper scripts to keep each file focused. This is an exception — do not abuse it.

**Method-level SRP:** When a class keeps multiple sub-responsibilities without being split into separate classes, each responsibility MUST be expressed as a separate method. Never mix different operations in one method. Example: `QuestManager.start_new_quest()` and `QuestManager.receive_reward()` — not a single `QuestManager.process_quest()`.

- Keep methods short and focused — extract private helper methods when a method grows beyond a single logical step
- Always decompose methods by SRP within the class — each method does one thing, complex operations are composed from smaller reusable private methods

## GRASP Principles

- **Information Expert** — assign responsibility to the class that owns the data for it
- **Creator** — object is created by whoever contains, aggregates, or has data for initialization. In Godot, use `preload`/`load` + `instantiate()`, or factory scripts
- **Controller** — separate controller class for handling system events and coordination. Controller holds no business logic — delegates only
- **Low Coupling** — minimize dependencies between classes. Use signals, dependency injection, and the autoload event bus pattern
- **High Cohesion** — all class members work toward one task. Extract unrelated logic into separate nodes or plain classes
- **Polymorphism** — replace conditional logic (`match` by type) with polymorphism via inheritance or duck typing
- **Indirection** — introduce intermediaries (autoload services, signal buses) to reduce direct coupling
- **Static Method Extraction** — Static functions in non-utility classes are an anti-pattern. Extract to a dedicated utility class. Before adding a utility function, check whose data it operates on (Information Expert) — if the data belongs to another type, the method should be there
- **Pure Fabrication** — create service classes (Calculator, Validator, Factory) not tied to domain if it increases cohesion
- **Protected Variations** — protect system from changes through abstract base classes or signal-based interfaces at instability points

## Method Patterns

- When a `can_{action}` method defines preconditions and a `try_{action}` method performs the action, `try_{action}` MUST call `can_{action}` for its guard check — never duplicate the conditions. If `can_{action}` uses data-retrieval calls that `try_{action}` also needs for the actual work, re-querying after the `can` check is acceptable for infrequent operations. For hot paths, warn the developer about the double lookup and confirm the approach before proceeding
- Virtual template methods (overridden by subclasses) MUST be called by the base class (Template Method pattern). If a virtual method is only called by subclasses, it is unnecessary indirection — remove it and let subclasses call the concrete helper directly

## API Design

- Public methods MUST NOT return engine implementation-detail types (e.g., `Tween`, internal node references). Return `void`, domain types, or purpose-built result types
- Prefer returning typed arrays `Array[T]` over untyped `Array`

## Subscription Lifecycle

- Connect signals in `_ready()` and disconnect in `_exit_tree()` when connecting to external nodes
- For self-connections within the same node, signals are automatically disconnected when the node is freed
- For plain (non-Node) classes, connect in `_init()` / `initialize()` and keep track for manual disconnection

```gdscript
# ✅ Connect/disconnect to external signals
func _ready() -> void:
    EventBus.day_started.connect(_on_day_started)

func _exit_tree() -> void:
    EventBus.day_started.disconnect(_on_day_started)
```

## Defensive Programming

- Every method is responsible for the correctness of its own actions. Each method MUST validate preconditions before performing operations that could lead to incorrect state (e.g., `has()` before `erase()`, null check before use, valid index before access). If the same validation logic is repeated across multiple methods, extract it into a dedicated validation/guard method so other methods can reuse a single check point
- Use `assert()` for invariants in debug builds — these are stripped in release
- Use `push_error()` for conditions that indicate a bug but allow recovery — logs with callstack
- Use `is_instance_valid(node)` before accessing nodes that may have been freed
- Every `erase`/`append` on a state-tracking collection must be preceded by an existence check (`has`, `has_key`, `find`). Never assume the caller guarantees the item is present — validate at the mutation site
- `match` statements on enum MUST include `_:` wildcard with `push_error("Unexpected value: %s" % value)` — GDScript does not check exhaustiveness of match
- Methods that iterate over a mutable collection in a `while` loop must include a safety-break counter (`max_iterations`) and `push_warning()` if the limit is hit — prevents infinite loops when an invariant is violated at runtime

## KISS & DRY

- **KISS (Keep It Simple, Stupid)** — prefer the simplest solution that works. KISS balances SOLID: don't introduce abstractions or patterns until complexity demands it. Especially on early project stages — start with a concrete class, extract an interface when a second implementation or testability actually requires it. Over-engineering upfront costs more than refactoring later.

- **DRY (Don't Repeat Yourself)** — every piece of knowledge should have a single authoritative source. When the same logic appears in 3+ places, extract it into a shared method or class. But do not merge code that merely looks similar yet represents different domain concepts — coincidental duplication is not real duplication.

- **Shallow Inheritance** — keep inheritance hierarchies flat: ideally one level deep from a Godot base class. Prefer composition (child nodes, components) over deep inheritance chains. Godot's node/scene model is designed for composition — use it. Deeper hierarchies are a rare exception, not the norm.
