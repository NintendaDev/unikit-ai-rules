---
version: 1.0.0
---

# Blueprint

> **Scope**: Blueprint visual scripting conventions, C++/Blueprint integration patterns, UFUNCTION specifiers, communication patterns, performance, organization
> **Load when**: working with Blueprints or exposing C++ to them — naming BP_/WBP_/ABP_ assets, choosing UFUNCTION specifiers like BlueprintCallable/BlueprintPure/BlueprintNativeEvent/BlueprintImplementableEvent, picking a communication pattern (interfaces, event dispatchers, casting), and avoiding tick/cast/hard-reference performance traps

---

## Asset Naming Conventions

- Prefix Blueprint classes with `BP_` (e.g., `BP_PlayerCharacter`)
- Prefix Animation Blueprints with `ABP_` (e.g., `ABP_PlayerMovement`)
- Prefix Widget Blueprints with `WBP_` (e.g., `WBP_MainMenu`)
- Prefix Blueprint Interfaces with `BPI_` (e.g., `BPI_Interactable`)
- Prefix Blueprint Function Libraries with `BPFL_` (e.g., `BPFL_MathUtils`)
- Prefix Blueprint Macro Libraries with `BPML_` (e.g., `BPML_FlowControl`)

## Variable Naming in Blueprints

- Use PascalCase for all variable names (e.g., `Health`, `PlayerName`)
- Prefix booleans with lowercase `b` (e.g., `bIsAlive`, `bHasWeapon`, `bCanJump`)
- Do NOT include atomic type names in variable names (no `FloatHealth`, `IntScore`)
- DO include non-atomic type references in names (e.g., `TargetActor`, `WeaponMesh`)
- Use plural names for arrays (e.g., `Enemies`, `SpawnPoints`)
- Organize variables into categories using pipes: `"Combat|Health"`, `"Movement|Speed"`
- Default variables to private — expose only what designers need
- Every exposed variable must have a tooltip and sensible default value

## Function & Event Naming

- Use verb-based names for functions: `GetHealth()`, `ApplyDamage()`, `SetPlayerName()`
- Prefix boolean queries with `Is`/`Can`/`Has`: `IsAlive()`, `CanMove()`, `HasWeapon()`
- Prefix event handlers and dispatchers with `On`: `OnPlayerDeath`, `OnHealthChanged`
- Prefix RepNotify functions with `OnRep_`: `OnRep_Health`, `OnRep_AmmoCount`

## C++/Blueprint Integration — UFUNCTION Specifiers

### BlueprintCallable

Exposes a C++ function as an executable node in Blueprint. Must include `Category`.

```cpp
UFUNCTION(BlueprintCallable, Category = "Combat")
void ApplyDamage(float DamageAmount);
```

Use `const` on the function to produce a node without execution pins (ideal for getters):

```cpp
UFUNCTION(BlueprintCallable, Category = "Combat")
float GetCurrentHealth() const;
```

### BlueprintPure

Creates a node without execution pins. Implies `BlueprintCallable`. Must have a return value.

```cpp
UFUNCTION(BlueprintPure, Category = "Math")
float CalculateDistanceToTarget() const;
```

**Warning:** Pure functions execute once per connection without caching. Never connect expensive pure functions to multiple nodes — cache the result in a variable first.

### BlueprintImplementableEvent

Blueprint provides the implementation — no C++ body exists.

```cpp
// Void functions become Event nodes; functions with return types become Function nodes
UFUNCTION(BlueprintImplementableEvent, Category = "Gameplay")
void OnQuestCompleted(FName QuestID);
```

Combine with `BlueprintCallable` to allow calling from Blueprint too:

```cpp
UFUNCTION(BlueprintCallable, BlueprintImplementableEvent, Category = "Inventory")
void SetupInventory();
```

### BlueprintNativeEvent

C++ provides a base implementation; Blueprint can optionally override it. Implement with `_Implementation` suffix.

```cpp
// Header
UFUNCTION(BlueprintCallable, BlueprintNativeEvent, Category = "Combat")
void OnHit(float Damage);

// Source — note the _Implementation suffix
void AMyCharacter::OnHit_Implementation(float Damage)
{
    Health -= Damage;
}
```

### Event Exposure Pattern (Notify/Receive)

When exposing events to subclasses, use the two-function pattern:

1. Virtual `Notify` function — C++ calls this
2. `BlueprintImplementableEvent` `Receive` function — Blueprint overrides this

```cpp
// C++ virtual function
virtual void NotifyDamageTaken(float Damage);

// Blueprint-overridable event
UFUNCTION(BlueprintImplementableEvent, Category = "Combat")
void ReceiveDamageTaken(float Damage);

// Default implementation calls the Blueprint event
void AMyCharacter::NotifyDamageTaken(float Damage)
{
    ReceiveDamageTaken(Damage);
}
```

### Useful Meta Specifiers

```cpp
// Restrict to owning Blueprint only
UFUNCTION(BlueprintCallable, meta = (BlueprintProtected), Category = "Internal")
void InternalUpdate();

// Mark deprecated with migration guidance
UFUNCTION(BlueprintCallable, meta = (DeprecatedFunction,
    DeprecationMessage = "Use ApplyDamageV2 instead"), Category = "Combat")
void ApplyDamage(float Damage);
```

## Communication Patterns

### Blueprint Interfaces (Preferred)

- Use interfaces for polymorphic communication — no hard references, no type checking overhead
- Eliminate memory bloat from reference cascades
- Scale cleanly as project grows
- Prefer over casting in all cases where you don't need the concrete type

### Event Dispatchers

- Use for one-to-many broadcasting (e.g., boss death triggering multiple systems)
- Broadcaster is decoupled from listeners
- **Always unbind when listeners are destroyed** — prevents memory leaks
- Support network replication

### Direct Reference / Casting

- Use only for known, specific one-to-one relationships
- **Cast once in BeginPlay, cache the reference** — never cast on Tick
- Creates hard references that load entire dependency chains
- Audit with the Reference Viewer to catch cascade bloat

### Hard Reference Prevention

- Use `TSoftObjectPtr` / `TSoftClassPtr` for lazy loading in C++
- Use Blueprint Interfaces instead of concrete type references
- Prefer component-based architecture over deep actor references
- Audit dependency chains with the Reference Viewer regularly

## Blueprint Organization

### Graph Standards

- No spaghetti: avoid tangled, overlapping wires
- Align wires (not nodes) for visual clarity
- White execution lines take priority in layout
- Use Comment boxes with color coding for major logic sections
- Remove all disconnected/unused nodes before committing
- Maintain left-to-right execution flow

### Function Size Rule

- **Maximum 50 nodes per function** — break larger functions into smaller ones
- Functions over 50 nodes become unmaintainable and harder to debug
- All functions must have explicit return nodes
- Public functions require descriptions in the Details panel

### Functions vs Macros vs Events

| Use | When |
|-----|------|
| **Functions** | Default choice — reusable logic, cross-BP communication, support overriding |
| **Events** | Responding to gameplay triggers, network replication, event-driven patterns |
| **Macros** | Only when functions won't work — latent nodes (Delay, Timeline), multiple execution paths |

Avoid macro overuse — they expand inline, bloating Blueprint size and cannot be overridden.

### Level Blueprints — Avoid in Production

- Non-reusable, causes binary merge conflicts, untestable in isolation
- Use only for truly level-unique, never-reused logic
- Prefer proper Blueprint Actors for all reusable logic

## Performance

### Event Tick Anti-Pattern

Never use Event Tick for logic that can be event-driven. Alternatives:

- Custom events triggered by gameplay conditions
- Timers with appropriate intervals (0.1–0.5s for non-critical)
- Collision events (`OnBeginOverlap`, `OnComponentHit`)
- `SetActorTickInterval` when tick is truly needed

Migrating from tick-dependent to event-driven architecture yields 20–30% performance improvement.

### Pure Function Trap

Pure functions execute once **per connection** without caching. In a `ForEach` loop with 8 elements, a pure function input executes **17 times** (2n+1), not 8.

- Cache pure function results in local variables before loops
- Never connect expensive pure functions to more than one pin
- Use impure functions for `GetAllActorsOfClass` and similar heavy operations

### Node Count Guidelines

| Nodes | Assessment |
|-------|-----------|
| < 100 | Excellent |
| 100–300 | Acceptable for most use cases |
| 300–500 | Noticeable VM overhead — consider refactoring |
| > 500 | Migrate hot paths to C++ |

Blueprint VM executes 10–15x slower than native C++. Only convert after profiling confirms the bottleneck.

### When to Use C++ vs Blueprint

**C++:** Physics per frame, complex AI decisions, network replication logic, math-heavy generation, profiled bottlenecks, plugin/engine extensions.

**Blueprint:** High-level gameplay orchestration, UI/menus, level-specific scripting, prototyping, balance tuning (damage, cooldowns), designer-accessible functionality.

## Data-Driven Design

### Data-Only Blueprints

- Contain only inherited variables, no new logic nodes
- Faster loading than logic-heavy Blueprints
- Use for weapon/enemy/item variants — designers create new variants without touching code

### Data Assets vs Data Tables

| Feature | Data Assets | Data Tables |
|---------|-------------|-------------|
| Inheritance | Yes | No |
| UObject refs | Yes | No |
| Bulk editing | No | Yes (CSV/JSON) |
| Best for | Complex hierarchies | Flat datasets (100+ entries) |

## Anti-Patterns

- **Casting on Tick** — cast once in BeginPlay, cache the reference
- **Hard reference cascading** — one reference can load gigabytes of assets; use interfaces and soft references
- **Level Blueprint production logic** — causes merge conflicts, untestable, non-reusable
- **Macro abuse** — use functions unless you specifically need latent nodes or multiple exec paths
- **Ignoring compile warnings** — fix immediately; warnings cascade into unexpected behavior
- **Skipping tooltips on exposed variables** — every `EditAnywhere` / `BlueprintReadWrite` variable needs a tooltip
- **Deep inheritance instead of composition** — prefer mixing specialized ActorComponents over monolithic actor hierarchies
