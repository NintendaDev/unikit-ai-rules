---
version: 1.0.0
---

# Design Principles

> **Scope**: Universal software design principles — SOLID, GRASP, KISS, DRY, inheritance guidelines, SRP decision framework, method design, defensive programming.
> **Load when**: designing systems, creating new classes, choosing architecture patterns, deciding when to split or merge classes, method design, defensive programming.

---

## SOLID Principles

- **Single Responsibility** — each class has one reason to change. Don't mix logic, input, visual, and data in one class
- **Open/Closed** — extend behavior through inheritance, interfaces, and composition, not modifying existing code
- **Liskov Substitution** — subclass must fully replace base type without breaking behavior
- **Interface Segregation** — create narrow interfaces per specific role
- **Dependency Inversion** — dependencies point from concrete to abstract. Both high-level and low-level depend on interfaces

### SRP in Practice: When to Split Classes

Apply SRP through the lens of **High Cohesion** and **Low Coupling** (GRASP). A class violates SRP when it accumulates many loosely related dependencies that operate on different data — this signals low cohesion and warrants splitting.

**Do NOT split** when:

1. **Dependencies are few and logic is unified by a single domain concept.** Multiple sub-responsibilities under one cohesive name are fine. Example: `QuestManager` handles quest creation, progression, and rewards — different operations, but all bound by the "quest" domain. Contrast with `GameManager` where "game" implies everything — such a class should be split.

2. **The class is a framework facade for developer convenience.** A public API facade may aggregate multiple responsibilities to simplify usage for consumers. Split the implementation into `partial` class files (`{ClassName}_{Section}.cs`) to keep each file focused. This is an exception — do not abuse it. Example: `NetworkRunner` in Photon Fusion 2.

**Method-level SRP:** When a class keeps multiple sub-responsibilities without being split into separate classes, each responsibility MUST be expressed as a separate method. Never mix different operations in one method. Example: `QuestManager.StartNewQuest()` and `QuestManager.ReceiveReward()` — not a single `QuestManager.ProcessQuest()`.

- Keep methods short and focused — extract private helper methods when a method grows beyond a single logical step
- Always decompose methods by SRP within the class — each method does one thing, complex operations are composed from smaller reusable private methods

## GRASP Principles

- **Information Expert** — assign responsibility to the class that owns the data for it
- **Creator** — object is created by whoever contains, aggregates, or has data for initialization
- **Controller** — separate controller class for handling system events and coordination. Controller holds no business logic — delegates only
- **Low Coupling** — minimize dependencies between classes. Use interfaces and events
- **High Cohesion** — all class members work toward one task. Extract unrelated logic
- **Polymorphism** — replace conditional logic (`switch` by type) with polymorphism via interfaces/inheritance
- **Indirection** — introduce intermediaries (services, facades) to reduce direct coupling
- **Static Method Extraction** — Static methods in non-static classes are an anti-pattern. Extract to a dedicated `internal static class` with a `UseCase` or `Helper` suffix. Before adding a utility method, check whose data it operates on (Information Expert) — if the data belongs to another type, the method should be there
- **Pure Fabrication** — create service classes (Calculator, Validator, Factory) not tied to domain if it increases cohesion
- **Protected Variations** — protect system from changes through interfaces at instability points

## Method Patterns

- When a `Can{Action}` method defines preconditions and a `Try{Action}` method performs the action, `Try{Action}` MUST call `Can{Action}` for its guard check — never duplicate the conditions. If `Can{Action}` uses data-retrieval calls (e.g., `TryGetX(key, out _)`) that `Try{Action}` also needs for the actual work, re-querying after the `Can` check is acceptable for infrequent operations. For hot paths, warn the developer about the double lookup and confirm the approach before proceeding
- `protected abstract` methods MUST be called by the base class (Template Method pattern). If a `protected abstract` method is only called by subclasses, it is unnecessary indirection — remove it and let subclasses call the concrete helper directly.

## API Design

- Public methods MUST NOT return implementation-detail types (e.g., DOTween `Sequence`, internal data structures). Return `void`, domain types, or purpose-built result types.

## Subscription Lifecycle

- In plain (non-MonoBehaviour) classes, subscribe to events (C# events, SignalBus, R3 observables) in the constructor and unsubscribe in `IDisposable.Dispose()`

## Defensive Programming

- Every method is responsible for the correctness of its own actions. Each method MUST validate preconditions before performing operations that could lead to incorrect state (e.g., check `Contains` before `Remove`, verify non-null before use, confirm valid index before access). If the same validation logic is repeated across multiple methods, extract it into a dedicated validation/guard method so other methods can reuse a single check point.
- Methods that iterate over a mutable collection in a `while` loop (e.g., eviction until capacity is met) must include a safety-break counter (`maxIterations`) and log a warning if the limit is hit — prevents infinite loops when an invariant is violated at runtime.
- Every Remove/Add on a state-tracking collection must be preceded by an existence check (`Contains`, `ContainsKey`, `TryGetValue`). Never assume the caller guarantees the item is present — validate at the mutation site.
- **EnsureInitialized for MonoBehaviour** — MonoBehaviour public methods called by external systems (Zenject, MVVM binding, other components) MUST be resilient to calls before `Awake()`. Use `EnsureInitialized()` pattern with a null-guard (`if (_field != null) return`). Never rely on `Awake()` call order between components.
- Switch statements on enum MUST include `default: throw new ArgumentOutOfRangeException()` — C# compiler does not check exhaustiveness of enum switches.

## KISS & DRY

- **KISS (Keep It Simple, Stupid)** — prefer the simplest solution that works. KISS balances SOLID: don't introduce interfaces, abstractions, or patterns until complexity demands it. Especially on early project stages — start with a concrete class, extract an interface when a second implementation or testability actually requires it. Over-engineering upfront costs more than refactoring later.

- **DRY (Don't Repeat Yourself)** — every piece of knowledge should have a single authoritative source. When the same logic appears in 3+ places, extract it into a shared method or class. But do not merge code that merely looks similar yet represents different domain concepts — coincidental duplication is not real duplication.

- **Shallow Inheritance** — keep inheritance hierarchies flat: ideally one level deep from an interface or abstract base class. Prefer composition over deep inheritance chains. Deeper hierarchies are a rare exception, not the norm.
