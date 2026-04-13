---
version: 1.0.0
---

# Code Style

> **Scope**: Universal C++/UE5 code style conventions — naming, type prefixes, member ordering, class structure, formatting, UObject approach, macros, documentation.
> **Load when**: writing or reviewing any C++ code, creating new classes, checking code style.

---

## Naming

- **PascalCase** for all identifiers (classes, functions, variables, properties)
- Type prefixes (mandatory — enforced by Unreal Header Tool):

| Prefix | Applies to | Example |
|--------|-----------|---------|
| `U` | UObject-derived classes | `UInventoryComponent` |
| `A` | AActor-derived classes | `APlayerCharacter` |
| `F` | Structs, non-UObject classes | `FItemData`, `FHitResult` |
| `E` | Enums | `EWeaponType` |
| `I` | Interface classes (pure abstract) | `IDamageable` |
| `T` | Template classes | `TArray`, `TSubclassOf` |
| `S` | Slate widgets | `SInventoryPanel` |

- `private`/`protected` fields: NO underscore prefix — UE5 uses PascalCase for all members
- `bool` variables MUST use `b` prefix: `bool bIsEnabled;`, `bool bHasItems;`, `bool bCanMove;`
- Pointer variables: `*` attached to type, not name: `UObject* Object;` (not `UObject *Object`)
- Events/Delegates: `On` prefix + past tense verb for dynamic multicast delegates: `FOnDayStarted OnDayStarted;`
  - Pattern: `FOn{Subject}{PastTenseVerb}` or `FOn{PastTenseVerb}`
  - Blueprint-assignable delegates: `DECLARE_DYNAMIC_MULTICAST_DELEGATE` with `F` prefix
  - C++-only delegates: `DECLARE_MULTICAST_DELEGATE` or `DECLARE_DELEGATE`
- Enum values: PascalCase, optionally with enum name prefix for unscoped enums
  - Prefer `enum class` (scoped): `enum class EWeaponType : uint8 { Melee, Ranged, Magic };`
- When a base class exposes a public method and needs a protected virtual template method for subclasses, name the template method with an `_Implementation` suffix or use `_Internal` suffix — e.g., `void Launch()` → `virtual void LaunchInternal()`. UE5 convention: `BlueprintNativeEvent` uses `_Implementation` suffix automatically

## Access Modifiers

- ALWAYS specify access modifier explicitly (`public:`, `protected:`, `private:`)
- Fields set in constructor — ALWAYS mark `const` when possible
- No inheritors — mark class `final`; has inheritors — use `virtual` destructor
- NEVER make fields `public` in gameplay classes — use accessors with `UFUNCTION(BlueprintPure)` or `UPROPERTY(BlueprintReadOnly)`
- Minimize `friend` declarations — prefer interface-based access

## Type Declarations

- Use `auto` ONLY for iterator types and complex template return types where the type is obvious from context
- NEVER use `auto` for basic types — always declare with explicit types: `int32 Count = 0;` (not `auto Count = 0;`)
- Prefer UE types over STL: `int32` over `int`, `uint8` over `unsigned char`, `FString` over `std::string`
- Use `TEXT("string")` macro for string literals — ensures proper encoding on all platforms
- Use `FName` for identifiers (hashed, fast comparison), `FString` for mutable strings, `FText` for user-facing localized text

## Member Ordering in Class

**By access modifier (level 1):**

`public:` -> `protected:` -> `private:`

**Within each access block (level 2):**

1. Friend declarations -> 2. Type aliases (`using`) -> 3. Enums -> 4. Static constants -> 5. Delegates -> 6. UPROPERTY fields -> 7. Plain fields -> 8. Constructor / Destructor -> 9. UE lifecycle overrides -> 10. UFUNCTION methods -> 11. Plain methods -> 12. Static methods

**UE lifecycle method ordering (within public/protected):**

1. Constructor -> 2. `PostInitProperties` -> 3. `PostLoad` -> 4. `BeginPlay` -> 5. `EndPlay` -> 6. `Tick` -> 7. `BeginDestroy` -> 8. `GetLifetimeReplicatedProps` -> 9. Other engine overrides

For Actors specifically:
1. Constructor -> 2. `PreInitializeComponents` -> 3. `PostInitializeComponents` -> 4. `BeginPlay` -> 5. `EndPlay` -> 6. `Tick` -> 7. `Destroyed` -> 8. `OnConstruction` -> 9. Input/Collision handlers

If class has a public `Initialize` method, it must be first among user methods, but below UE lifecycle methods.

## Class Naming Suffixes

| Suffix | Purpose | Example |
|--------|---------|---------|
| Subsystem | Engine/Game subsystem | `UQuestSubsystem` |
| Component | Actor component | `UHealthComponent` |
| Controller | Player/AI controller | `AShopkeeperController` |
| Manager | Collection management (not for Actors) | `FEnemyManager` |
| Factory | Object creation | `UWeaponFactory` |
| Provider | Data provision | `UConfigProvider` |
| Widget | Slate/UMG widget | `UInventoryWidget` |
| HUD | Head-up display | `APlayerHUD` |
| GameMode | Game rules | `APawnshopGameMode` |
| GameState | Shared game state | `APawnshopGameState` |
| PlayerState | Per-player state | `AShopkeeperPlayerState` |
| Settings | Settings/Config object | `UGameplaySettings` |

## Class Structure

- Each class has clear purpose and single responsibility
- UPROPERTY for all UObject* fields — mandatory for GC to track references
- UFUNCTION for methods exposed to Blueprint or replicated
- For configurations — use `UDataAsset` or `UDeveloperSettings`, not raw structs
- Forward-declare in headers, `#include` in `.cpp` — minimize header dependencies
- Use `#pragma once` instead of include guards
- Each class goes in a separate `.h` / `.cpp` pair (header + implementation)
- Inline trivial getters in the header; all non-trivial logic in `.cpp`
- Constructor null checks: `check(Param != nullptr)` for mandatory dependencies. For CDO-safe constructors, defer validation to `BeginPlay` or `Initialize`
- Aggregate initialization for `USTRUCT`: use designated initializers when C++20 is available, or explicit member initialization in the struct declaration

## Code Formatting

- Separate code into logical blocks with empty lines
- Use constants (`constexpr`, `static const`, or `UPROPERTY` config) instead of magic values
- `return` ALWAYS has one empty line before it. Exception: if return is the only line in for/while/switch case
- For negation in conditions, use `== false` for `bool` UPROPERTY/UFUNCTION results — e.g., `bIsActive == false` (not `!bIsActive`). For raw C++ bools, `!` is acceptable
- Always add one empty line between methods in `.cpp`
- When a function has more than 2 parameters, place each parameter on its own line — one parameter per line
- Opening brace `{` on the SAME line as the statement (UE5/Epic style): `if (Condition) {`
- Use `// @todo` for planned improvements (UE convention)

## UObject / Component Approach

- `UPROPERTY(EditAnywhere)` for designer-tweakable fields
- `UPROPERTY(BlueprintReadOnly)` for read-only Blueprint access
- `UPROPERTY(VisibleAnywhere)` for inspector-visible, non-editable references
- `UPROPERTY(Category = "GroupName")` for grouping properties in Details panel
- `UPROPERTY(meta = (ClampMin = "0", ClampMax = "100"))` for value constraints
- `TSubclassOf<T>` for class references instead of raw `UClass*`
- `TSoftObjectPtr<T>` / `TSoftClassPtr<T>` for async-loadable asset references
- `UPROPERTY(Transient)` for runtime-only data that should not be serialized
- When renaming UPROPERTY fields, use `CoreRedirects` in `.ini` to prevent data loss in existing assets

## Non-Actor First

Use plain C++ classes (`F` prefix) or `UObject` subclasses for ALL business logic. `AActor` / `UActorComponent` ONLY when:
- Physical presence in the world (transform, collision, rendering)
- Needs Tick, BeginPlay, EndPlay lifecycle
- Replication (networked state)
- View components (widget, HUD, animation)

For pure logic without world presence, prefer `USubsystem` (UGameInstanceSubsystem, UWorldSubsystem) over singletons or Actors.

## Error Handling

- UE5 does NOT use C++ exceptions — exceptions are disabled in builds
- `check(Condition)` — fatal assert, crashes in all builds (use for invariants that must never be violated)
- `checkf(Condition, TEXT("Message %s"), *ContextInfo)` — fatal assert with formatted message
- `verify(Expression)` — like check, but expression is always evaluated (even in shipping builds)
- `ensure(Condition)` — non-fatal assert, logs callstack + continues. Fires only once per callsite
- `ensureMsgf(Condition, TEXT("Message"))` — ensure with message
- `UE_LOG(LogCategory, Verbosity, TEXT("Format"), ...)` for logging
- Never swallow errors silently — always `UE_LOG` or `ensure`
- Define custom log categories with `DECLARE_LOG_CATEGORY_EXTERN` / `DEFINE_LOG_CATEGORY`
- Use `unimplemented()` macro in pure virtual stubs that should never execute

## Documentation

- English `/** */` block comments on all public methods and UPROPERTY fields
- `@brief` for one-line summary, `@param` for parameters, `@return` for return value
- `UFUNCTION(meta = (ToolTip = "..."))` for Blueprint tooltip overrides
- NEVER write inline comments in code — code should be self-explanatory
- ALWAYS update documentation after editing methods

```cpp
/**
 * Manages the player's currency balance.
 * Supports multiple currency types with independent balances.
 */
UCLASS(BlueprintType)
class GAME_API UWalletComponent : public UActorComponent
{
    GENERATED_BODY()

public:
    /**
     * Adds the specified amount to the given currency balance.
     * @param Currency  The type of currency to add.
     * @param Amount    The amount to add (must be positive).
     */
    UFUNCTION(BlueprintCallable, Category = "Wallet")
    void Add(ECurrencyType Currency, int32 Amount);
};
```
