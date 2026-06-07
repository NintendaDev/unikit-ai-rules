---
version: 1.0.0
---

# Pipeline Rules: Minimizing Editor Restarts

> **Scope**: UE5 development pipeline — C++ scaffolding strategy, Blueprint iteration, Live Coding boundaries, structural change batching, data-driven configuration. Architecture-specific sections: Actor/Component, GAS, Mass Entity.
> **Load when**: **ALWAYS** for planning, research, and plan improvements; also for ordering implementation tasks, creating C++ classes, adding UPROPERTY/UFUNCTION, blueprint iteration, live coding, compilation strategy, task phasing, implementation phases.
> **MANDATORY**: This guide MUST ALWAYS be used when researching the codebase, creating implementation plans, and improving/refining plans. All planning, research, and plan improvement tasks MUST follow the phasing and principles described here.

---

## Planning Requirements

> **MANDATORY**: These rules apply to ALL plan creation, research, and plan improvement tasks — no exceptions.

1. **Architecture-first pipeline selection** — examine the project's architecture (Actor/Component, GAS, Mass Entity, or hybrid) and select the matching pipeline section from this guide. All plan phases and task ordering MUST align with the chosen pipeline.
2. **Minimize compilations and editor restarts** — structure the plan to batch all structural changes (`.h` edits, new classes, new fragments) into the fewest possible sessions. Reorder tasks so that all header-level work happens together, followed by iteration-only work.
3. **Mark restart points explicitly** — every point in the plan where an editor restart or full rebuild is required MUST be marked with a visible label (e.g., `⚠️ RESTART REQUIRED`). During plan execution, ALWAYS stop at these points and notify the user that a rebuild and editor restart is needed before proceeding further.
4. **Mandatory post-restart verification phase** — whenever the plan includes a point requiring an editor restart or full recompilation, the plan MUST include a dedicated verification phase immediately after that restart point. This phase checks the correctness of ALL new scripts and functionality implemented in the preceding phase. No further implementation work may begin until this verification phase passes.

---

## Common Principles (All Architectures)

### Planning Phase (before writing code)

- **Entity inventory** — list all project entities (characters, enemies, items, projectiles, triggers) and determine properties, functions, and events for each before writing any code
- **Inheritance hierarchy upfront** — define inheritance hierarchies before implementation; changing them later requires editor restart
- **C++ vs Blueprint split** — separate logic into "rarely changes" (C++) and "will iterate frequently" (Blueprint). Rule of thumb: if a designer will touch it → Blueprint; if it's a performance-critical path → C++
- **Declare with headroom** — declare properties and functions generously; an unused `UPROPERTY` is free, a missing one costs a restart

### C++ Scaffolding Phase (one large session)

- **Batch all structural declarations** — all `UPROPERTY`, `UFUNCTION`, `DECLARE_DYNAMIC_MULTICAST_DELEGATE` in one session, not spread across multiple days
- **Category on every public function** — every `BlueprintCallable`/`BlueprintImplementableEvent`/`BlueprintNativeEvent` must have a `Category` specifier; without it, Blueprint node menus become chaotic
- **`BlueprintImplementableEvent`** — for visual feedback (effects, sounds, UI reactions) that Blueprint implements entirely
- **`BlueprintNativeEvent`** — when C++ provides default logic that Blueprint may override
- **`BlueprintCallable`** — for utility functions Blueprint calls but does not override
- **Delegates for inter-system communication** — declare multicast delegates so subscribers can be rewired in Blueprint without recompilation
- **`UINTERFACE` for contracts** — declare interfaces (`IDamageable`, `IInteractable`, `ISaveable`) for cross-system communication boundaries
- **Data assets for numeric parameters** — extract balance values, curves, and configuration into `UDataAsset` / `UDataTable` / `UCurveFloat`; these are editable in-editor without any compilation
- **Full build + verify** — after scaffolding, build once, launch the editor, and verify all properties and functions are visible in Blueprint before proceeding to iteration

### Daily Iteration (no restarts)

- **Live Coding for function bodies** — change C++ function bodies via Live Coding (Ctrl+Alt+F11); no editor restart needed
- **Blueprint for visual logic** — system wiring, parameter tuning, visual feedback, level logic — all in Blueprint
- **Data assets for balance** — tweak numbers in DataAssets/DataTables directly in the editor; zero compilation
- **Evaluate before adding new declarations** — before adding a new `UFUNCTION`: can a Blueprint function suffice? Before adding a new `UPROPERTY`: can an existing property or `TMap`/`TArray` handle it?

### When Restart Is Unavoidable

- **Batch structural changes** — accumulate all `.h` changes and apply in one session, not one at a time
- **Review headers before build** — before compiling, review all `.h` files: is everything declared? Will you need to add more in an hour?
- **Verify in Blueprint immediately** — after restart, immediately check in Blueprint that new properties/functions are accessible

### Post-Restart Verification Phase (mandatory after every restart)

Whenever a restart or recompilation is required, the plan MUST include a dedicated verification phase immediately after that restart point. This phase is **non-skippable** — no implementation work may proceed until all applicable checks pass.

**Verification checklist:**
- [ ] Compilation completes with no errors and no warnings about missing or broken declarations
- [ ] All new `UPROPERTY` / `UFUNCTION` declarations are visible in Blueprint Details Panel and node menus
- [ ] New component classes appear in the **Add Component** menu
- [ ] New `UINTERFACE` implementations are accessible from Blueprint
- [ ] Any Blueprint or script that uses new C++ functions compiles and runs without errors
- [ ] New `UDataAsset` / `UDataTable` fields are editable in-editor
- [ ] *(GAS)* New `AttributeSet` attributes are visible in GameplayEffect magnitude fields
- [ ] *(Mass Entity)* New `FMassFragment` types are picked up with no archetype errors in the log

Only after all applicable checks pass may the plan advance to the next phase.

---

## Actor/Component — Pipeline Specifics

### Component Design

- **Reusable logic in components** — all shared behavior goes into `UActorComponent` / `USceneComponent`, not into Actors directly. Examples: `HealthComponent`, `InventoryComponent`, `InteractionComponent`
- **Self-contained components** — each component is a standalone unit; declared once in C++, then added/removed in Blueprint without recompilation
- **Actor as container** — Actors are containers for components with minimal logic of their own
- **Delegate-based component communication** — components communicate via delegates, not direct references (e.g., `HealthComponent` fires `OnDeath`, others subscribe)

### Blueprint Layer

- **BP inheritors for every C++ Actor** — create Blueprint children for each C++ Actor (e.g., `BP_PlayerCharacter` ← `APlayerCharacter`)
- **Component composition in Blueprint** — add/remove components visually in Blueprint without recompilation
- **Assets in Blueprint, not C++** — meshes, materials, sounds, particles assigned via Details Panel, never hardcoded in C++
- **Level logic entirely in Blueprint** — triggers, doors, elevators, cutscenes are pure Blueprint
- **Prototype in Blueprint first** — new enemy/item prototypes start as pure Blueprint; promote hot paths to C++ only when profiling demands it

### Live Coding Boundaries

- **Function bodies iterate via Live Coding** — collision logic, damage calculation, movement — iterate through Live Coding
- **New component class = restart** — adding a new C++ component class requires editor restart; plan all components upfront
- **`CreateDefaultSubobject` changes = restart** — constructor changes are NOT picked up by Live Coding
- **New `.cpp` file = restart** — UBT must discover new compilation units; Live Coding only recompiles existing ones
- **Test files in scaffolding** — create test `.cpp` with stub `RunTest` bodies during scaffolding; fill test logic via Live Coding after restart

---

## GAS — Pipeline Specifics

### Scaffolding (most critical phase — mistakes are expensive)

- **ASC on base character** — declare `UAbilitySystemComponent` and attach to the base character class in C++
- **All attributes upfront** — design ALL `UAttributeSet` attributes in advance (Health, MaxHealth, Mana, Stamina, Armor, AttackPower...). Adding a new attribute later = `.h` change = restart
- **Base C++ classes for extensibility** — declare `UMyGameplayAbility`, `UMyGameplayEffect`, `UMyDamageExecution` base classes with all helper properties and methods that Blueprint subclasses will use
- **Gameplay Tags in config** — declare `FGameplayTag` values in `.ini` or `GameplayTagsManager`; tags can be added without recompilation
- **Configure AbilitySystemGlobals once** — set up `AbilitySystemGlobals` in the scaffolding phase

### Blueprint Iteration (primary GAS workflow)

- **Concrete abilities as BP subclasses** — Fireball, Dash, Heal are Blueprint children of `UMyGameplayAbility`
- **GameplayEffects as BP assets** — damage, buffs, DoTs created and tuned as Blueprint assets in the editor
- **Ability → Effect → Cue chains in Blueprint** — assemble full ability pipelines (ability triggers effect, effect triggers cue) entirely in Blueprint/assets
- **GameplayCues as BP classes** — visual effects for abilities iterate instantly as Blueprint classes
- **Tag + Effect combos are asset work** — new tag combinations and effect interactions require zero C++ compilation
- **Balance in GameplayEffect assets** — damage values, cooldowns, buff durations are all in GameplayEffect assets

### C++ Boundaries in GAS

- **`ExecutionCalculation` in C++** — complex damage formulas live in C++; iterate function bodies via Live Coding
- **`ModMagnitudeCalculation` in C++** — same as above; Live Coding for body iteration
- **`AttributeSet::PostGameplayEffectExecute`** — critical method; iterate body via Live Coding
- **New C++ ability class only for new mechanics** — a new `UGameplayAbility` C++ class is needed only for fundamentally new mechanics (e.g., channeling); for variants of existing abilities, use a Blueprint subclass

---

## Mass Entity — Pipeline Specifics

> Blueprint layer is minimal for Mass Entity. The pipeline shifts toward:
> **C++ scaffolding + Live Coding + Data-Driven configuration.**

### Fragment and Processor Design

- **All fragments upfront** — design all `FMassFragment` types in advance; adding a new fragment changes archetypes and requires rebuild
- **Small, atomic fragments** — `FTransformFragment`, `FHealthFragment`, `FVelocityFragment` — not mega-structures. Better cache locality and easier to compose
- **`FMassTag` for filtering** — tags (markers without data) are cheap to add; use them for filtering instead of boolean fields in fragments
- **`FMassSharedFragment` for common data** — faction settings, unit type parameters shared across hundreds of entities; change once, applies to all
- **Declare processors upfront** — declare `UMassProcessor` classes and define execution order (`ExecutionOrder` Before/After) during scaffolding
- **Small, focused processors** — `MovementProcessor`, `AvoidanceProcessor`, `DamageProcessor` — easier to iterate one at a time

### Live Coding — Primary Iteration Tool

- **`Execute()` bodies are the main Live Coding target** — processor logic iterates without restart
- **`FMassEntityQuery` configuration in bodies** — query setup (which fragments to request) lives in function bodies and is picked up by Live Coding
- **Formulas, filtering, thresholds** — all iterate without restart via Live Coding
- **Debug helpers via Live Coding** — add `UE_LOG`, `DrawDebugLine`, `DrawDebugSphere` in processor bodies through Live Coding

### Data-Driven Configuration (replaces Blueprint layer)

- **`UMassEntityConfigAsset`** — defines fragment + trait combinations per entity type; editable in editor
- **`UDataAsset` / `UDataTable` for parameters** — speed, attack radius, HP edited without compilation
- **`FMassEntityTemplate`** — spawn configuration in assets
- **`UMassEntityTraitBase`** — declared in C++, but parameters are set in editor via Details Panel
- **New enemy type = new ConfigAsset** — combine existing traits in a new asset instead of creating a new C++ class

### Hybrid Approach (Mass Entity + Actor/Component)

- **`UMassAgentComponent`** — bridges Mass Entity ↔ Actor when individual entities need Actor-level logic
- **Mass entities for crowds** — bullets, resources, background NPCs — pure Mass Entity
- **Actors for unique entities** — player, boss, dialogue NPCs — Actor/Component with Blueprint
- **`UMassSignalSubsystem`** — event communication between Mass processors and the Actor world
- **Visualization via Traits** — ISM/HISM rendering for crowds configured through Traits in assets, not in C++

### Live Coding Boundaries in Mass Entity

- **New `FMassFragment` = rebuild** — changes archetype layout
- **New `UMassProcessor` = rebuild** — requires registration in the system
- **`ExecutionOrder` changes = rebuild** — dependency chain modifications
- **`FMassEntityQuery` requirement changes** — usually picked up by Live Coding, but may require restart if archetypes are affected

---

## Anti-Patterns

- **Hardcoded asset references in C++** — use `TSoftObjectPtr` + assign in Blueprint instead
- **Incremental UPROPERTY additions** — do not add structural declarations one at a time between sessions; batch them
- **Hot Reload instead of Live Coding** — Hot Reload is unstable and corrupts editor state; always use Live Coding
- **All logic in C++ "for performance"** — premature optimization; Blueprint is fast enough for 90% of game logic
- **Deep inheritance hierarchies** — prefer composition (components) over inheritance
- **Frequent `.h` edits throughout the day** — one scaffolding session, then iterate without restarts
- **Fat fragments in Mass Entity** — small atomic fragments give better cache locality and flexibility
- **Actor per entity in crowds** — Mass Entity + ISM/HISM for mass objects; Actors only for unique entities
- **Blueprint logic in Mass Entity processors** — Blueprint does not work with ECS; use Data-Driven approach instead
