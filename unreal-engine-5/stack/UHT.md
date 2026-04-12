---
version: 1.0.0
---

# Unreal Header Tool (UHT)

> **Scope**: Unreal Header Tool — reflection macros (UCLASS, UPROPERTY, UFUNCTION, USTRUCT, UENUM), specifiers, metadata, GENERATED_BODY, .generated.h code generation, UINTERFACE, delegates, UHT limitations
> **Load when**: UHT, UCLASS, UPROPERTY, UFUNCTION, USTRUCT, UENUM, UMETA, UINTERFACE, GENERATED_BODY, .generated.h, reflection, specifier, metadata, BlueprintCallable, BlueprintReadWrite, EditAnywhere, Replicated, delegate, DECLARE_DYNAMIC_MULTICAST_DELEGATE

---

## Core Concepts

Unreal Header Tool (UHT) is a custom parsing and code-generation tool that powers the UObject reflection system. It scans C++ headers for annotated types and generates reflection metadata, thunk functions, and serialization code.

**Pipeline:** UBT invokes UHT → UHT parses `.h` files → generates `ClassName.generated.h` + `ClassName.gen.cpp` → compiled with the module.

**Reflection enables:** Details Panel editing, serialization, garbage collection, network replication, Blueprint/C++ interop.

### Required Setup

Every reflected header must include its generated header **as the last include**:

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "MyActor.generated.h"  // MUST be last #include

UCLASS()
class MYMODULE_API AMyActor : public AActor
{
    GENERATED_BODY()  // Required in every reflected class/struct
    // ...
};
```

### Generated Files

| File | Purpose |
|------|---------|
| `ClassName.generated.h` | Type info, thunk functions, helper macros — included in the header |
| `ClassName.gen.cpp` | Registration code, default property values — compiled separately |

### Type Hierarchy (Reflection)

```
UField
├── UStruct
│   ├── UClass       — reflected C++ class (UCLASS)
│   ├── UScriptStruct — reflected C++ struct (USTRUCT)
│   └── UFunction    — reflected function (UFUNCTION)
├── UEnum            — reflected enum (UENUM)
└── FProperty        — reflected member variable (UPROPERTY)
```

---

## UCLASS Specifiers

### Blueprint Integration

| Specifier | Purpose |
|-----------|---------|
| `Blueprintable` | Class can be used as a Blueprint base class |
| `BlueprintType` | Class can be used as a variable type in Blueprints |
| `NotBlueprintable` | Prevents Blueprint subclassing (default) |
| `NotBlueprintType` | Prevents use as Blueprint variable type |
| `Abstract` | Cannot be instantiated — base class only |
| `Const` | All properties and functions treated as const in Blueprint subclasses |

### Component & Actor

| Specifier | Purpose |
|-----------|---------|
| `meta=(BlueprintSpawnableComponent)` | Appears in "Add Component" dropdown |
| `EditInlineNew` | Can create instances inline in property panels |
| `DefaultToInstanced` | Each instance gets a unique copy |
| `Placeable` | Can be placed in levels (default for Actors) |
| `NotPlaceable` | Cannot be dragged into levels |
| `Within=ClassName` | Can only exist as inner object of specified class |

### Module & Compilation

| Specifier | Purpose |
|-----------|---------|
| `MinimalAPI` | Exports only type info for casting — faster compile times |
| `Transient` | Never saved to disk |
| `Deprecated` | Marks class as deprecated; instances won't save |
| `Config=ConfigName` | Stores properties in .ini files |

### Editor Display

| Specifier | Purpose |
|-----------|---------|
| `meta=(DisplayName="Name")` | Custom name in Blueprint editors |
| `HideCategories=(Cat1,Cat2)` | Hide property categories in Details |
| `ShowCategories=(Cat1)` | Re-show inherited hidden categories |
| `AutoExpandCategories=(Cat1)` | Auto-expand categories in Details |
| `ClassGroup="Group"` | Group in Actor Browser |
| `meta=(ChildCanTick)` | Blueprint children can enable tick |
| `meta=(ChildCannotTick)` | Blueprint children cannot tick |

### Example

```cpp
UCLASS(Blueprintable, BlueprintType, meta=(BlueprintSpawnableComponent))
class MYMODULE_API UMyComponent : public UActorComponent
{
    GENERATED_BODY()
public:
    UMyComponent();
};
```

---

## UPROPERTY Specifiers

### Editor Visibility

| Specifier | Defaults | Instances | Editable |
|-----------|----------|-----------|----------|
| `EditAnywhere` | Yes | Yes | Yes |
| `EditDefaultsOnly` | Yes | No | Yes |
| `EditInstanceOnly` | No | Yes | Yes |
| `VisibleAnywhere` | Yes | Yes | No (read-only) |
| `VisibleDefaultsOnly` | Yes | No | No |
| `VisibleInstanceOnly` | No | Yes | No |

### Blueprint Access

| Specifier | Purpose |
|-----------|---------|
| `BlueprintReadOnly` | Read in Blueprints, no write |
| `BlueprintReadWrite` | Read and write in Blueprints |
| `BlueprintGetter=FuncName` | Custom getter function |
| `BlueprintSetter=FuncName` | Custom setter function |
| `meta=(AllowPrivateAccess=true)` | Allow Blueprint access to private members |

### Organization

| Specifier | Purpose |
|-----------|---------|
| `Category="Cat\|SubCat"` | Group in Details panel (pipe for nesting) |
| `meta=(DisplayName="Label")` | Custom property name |
| `meta=(ToolTip="Help text")` | Hover tooltip |
| `AdvancedDisplay` | Hidden in collapsible "Advanced" section |
| `meta=(DisplayAfter="OtherProp")` | Control display order |
| `meta=(DisplayPriority=N)` | Sort priority (lower = first) |

### Numeric Constraints

```cpp
UPROPERTY(EditAnywhere, meta=(ClampMin=0, ClampMax=100))
int32 HealthPercent;

UPROPERTY(EditAnywhere, meta=(UIMin=0.0, UIMax=1.0))
float NormalizedValue;  // Slider clamped, typed values can exceed

UPROPERTY(EditAnywhere, meta=(Units="cm/s"))
float Speed;

UPROPERTY(EditAnywhere, meta=(Delta=5))
int32 StepValue;  // Drag increment = 5
```

### Conditional Editing

```cpp
UPROPERTY(EditAnywhere)
bool bCanFly;

UPROPERTY(EditAnywhere, meta=(EditCondition="bCanFly"))
float MaxFlightSpeed;  // Grayed out when bCanFly is false

UPROPERTY(EditAnywhere, meta=(EditCondition="bCanFly", EditConditionHides))
float FlightStamina;  // Completely hidden when bCanFly is false

UPROPERTY(EditAnywhere, meta=(InlineEditConditionToggle))
bool bOverrideSpeed;  // Shows as inline checkbox next to SpeedOverride

UPROPERTY(EditAnywhere, meta=(EditCondition="bOverrideSpeed"))
float SpeedOverride;
```

### Replication

```cpp
UPROPERTY(Replicated)
int32 PlayerScore;  // Synced across network

UPROPERTY(ReplicatedUsing=OnRep_Health)
float Health;

UFUNCTION()
void OnRep_Health(float OldHealth);  // Called when replicated value changes

// In struct — exclude from replication:
UPROPERTY(NotReplicated)
int32 LocalOnlyValue;
```

### Asset & Class Picking

```cpp
UPROPERTY(EditAnywhere, meta=(AllowedClasses="StaticMesh,SkeletalMesh"))
FSoftObjectPath MeshAsset;

UPROPERTY(EditAnywhere, meta=(MetaClass="UserWidget"))
FSoftClassPath WidgetClass;

UPROPERTY(EditAnywhere, meta=(MustImplement="InteractableInterface"))
TSubclassOf<AActor> InteractableClass;
```

### Collections

```cpp
UPROPERTY(EditAnywhere, EditFixedSize)
TArray<FString> FixedArray;  // Cannot resize in editor

UPROPERTY(EditAnywhere, meta=(TitleProperty="Name"))
TArray<FCharacterData> Characters;  // Shows Name field as element title

UPROPERTY(EditAnywhere, meta=(ForceInlineRow))
TMap<FGameplayTag, int32> TagValues;  // Table display for maps
```

### Other Key Specifiers

| Specifier | Purpose |
|-----------|---------|
| `Transient` | Not saved/loaded — runtime-only |
| `Config` | Saved/loaded from .ini files |
| `GlobalConfig` | Config that cannot be overridden in subclasses |
| `Instanced` | Unique copy per instance |
| `Export` | Fully exported during copy |
| `NoClear` | Cannot clear object reference |
| `BlueprintAssignable` | Multicast delegate assignable in Blueprints |
| `BlueprintCallable` | Multicast delegate callable from Blueprints |
| `meta=(ExposeOnSpawn=true)` | Show in SpawnActor/ConstructObject nodes |
| `meta=(Categories="Tag.Sub")` | Filter GameplayTag picker |

---

## UFUNCTION Specifiers

### Blueprint Integration

| Specifier | Purpose |
|-----------|---------|
| `BlueprintCallable` | Can be called from Blueprints |
| `BlueprintPure` | No side effects — no exec pin in Blueprints |
| `BlueprintNativeEvent` | C++ provides default, Blueprint can override. Implement as `FuncName_Implementation()` |
| `BlueprintImplementableEvent` | No C++ body — Blueprint must implement |
| `BlueprintAuthorityOnly` | Only runs on authority (server) |
| `BlueprintCosmetic` | Only runs on non-dedicated server (visual only) |

### Network Replication (RPCs)

| Specifier | Purpose |
|-----------|---------|
| `Server` | Runs on server, called from client |
| `Client` | Runs on owning client, called from server |
| `NetMulticast` | Runs on server and all clients |
| `Reliable` | Guaranteed delivery (use sparingly) |
| `Unreliable` | May be dropped — for frequent updates |
| `WithValidation` | Requires `FuncName_Validate()` — returns bool to reject calls |

### Other

| Specifier | Purpose |
|-----------|---------|
| `Exec` | Console command — callable from console |
| `Category="Name"` | Blueprint graph category |
| `meta=(DisplayName="Name")` | Custom node name in Blueprints |
| `meta=(ExpandEnumAsExecs="Param")` | Enum parameter becomes exec pins |
| `meta=(ReturnDisplayName="Name")` | Custom return value label |
| `meta=(DefaultToSelf="Param")` | Auto-fill parameter with `self` |
| `meta=(HidePin="Param")` | Hide parameter from Blueprint node |
| `meta=(WorldContext="Param")` | Auto-provide world context |
| `CallInEditor` | Callable from Details panel button |

### BlueprintNativeEvent Pattern

```cpp
// Header
UFUNCTION(BlueprintNativeEvent, Category="Combat")
float CalculateDamage(float BaseDamage);

// .cpp — note the _Implementation suffix
float AMyActor::CalculateDamage_Implementation(float BaseDamage)
{
    return BaseDamage * DamageMultiplier;
}
```

### Server RPC with Validation

```cpp
// Header
UFUNCTION(Server, Reliable, WithValidation)
void ServerFireWeapon(FVector_NetQuantize Origin, FVector_NetQuantize Direction);

// .cpp
void AMyCharacter::ServerFireWeapon_Implementation(FVector_NetQuantize Origin, FVector_NetQuantize Direction)
{
    // Server-side fire logic
}

bool AMyCharacter::ServerFireWeapon_Validate(FVector_NetQuantize Origin, FVector_NetQuantize Direction)
{
    // Return false to disconnect cheating client
    return Direction.IsNormalized();
}
```

---

## USTRUCT Specifiers

```cpp
USTRUCT(BlueprintType)  // Expose to Blueprints
struct FMyData
{
    GENERATED_BODY()  // Required

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    int32 Value;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    FString Name;
};
```

| Specifier | Purpose |
|-----------|---------|
| `BlueprintType` | Can be used as Blueprint variable |
| `Atomic` | Always serialized as a single unit |
| `NoExport` | No autogenerated export code |

**Key difference from UCLASS:** structs are value types, not garbage-collected, cannot have UFUNCTIONs, and support `NetSerialize()` for custom replication.

---

## UENUM & UMETA Specifiers

```cpp
UENUM(BlueprintType)
enum class ECharacterState : uint8
{
    Idle       UMETA(DisplayName="Standing Still"),
    Running    UMETA(DisplayName="On The Move"),
    Dead       UMETA(DisplayName="Eliminated"),
    COUNT      UMETA(Hidden)  // Hidden from editor pickers
};
```

### UENUM

| Specifier | Purpose |
|-----------|---------|
| `BlueprintType` | Expose to Blueprint variables |
| `meta=(Bitflags)` | Use as bitmask with integer UPROPERTY |
| `meta=(Experimental)` | Mark as experimental |

### UMETA (per-value)

| Specifier | Purpose |
|-----------|---------|
| `DisplayName="Name"` | Custom display name in editor |
| `Hidden` | Hide value from editor dropdowns |
| `ToolTip="Text"` | Custom hover tooltip |

### Bitmask Pattern

```cpp
UENUM(BlueprintType, meta=(Bitflags, UseEnumValuesAsBitmaskValues))
enum class EAbilityFlags : uint8
{
    None      = 0,
    CanFly    = 1 << 0,
    CanSwim   = 1 << 1,
    CanClimb  = 1 << 2
};

UPROPERTY(EditAnywhere, meta=(Bitmask, BitmaskEnum=EAbilityFlags))
int32 AbilityFlags;
```

---

## UINTERFACE

```cpp
UINTERFACE(MinimalAPI, Blueprintable)
class UInteractable : public UInterface
{
    GENERATED_BODY()
};

class IInteractable
{
    GENERATED_BODY()
public:
    UFUNCTION(BlueprintNativeEvent, BlueprintCallable, Category="Interaction")
    void Interact(AActor* Caller);
};
```

**Rules:**
- `UINTERFACE` macro goes on the `UInterfaceName` class (derives from `UInterface`)
- Actual interface methods go on the `IInterfaceName` class
- Check with `Implements<UInteractable>()` or `Cast<IInteractable>(Actor)`
- `BlueprintNativeEvent` in interfaces allows both C++ and Blueprint implementation

---

## Delegates

### Declaration Macros

| Macro | Params | Usage |
|-------|--------|-------|
| `DECLARE_DELEGATE(Name)` | 0 | Single-cast, C++ only |
| `DECLARE_DELEGATE_OneParam(Name, Type1)` | 1 | Single-cast with 1 param |
| `DECLARE_DELEGATE_RetVal(RetType, Name)` | 0 | Single-cast with return value |
| `DECLARE_MULTICAST_DELEGATE(Name)` | 0 | Multi-cast, C++ only |
| `DECLARE_DYNAMIC_DELEGATE(Name)` | 0 | Single-cast, Blueprint compatible |
| `DECLARE_DYNAMIC_MULTICAST_DELEGATE(Name)` | 0 | Multi-cast, Blueprint compatible |

### Dynamic Multicast (Blueprint-exposed)

```cpp
// Declaration
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnHealthChanged, float, NewHealth);

UCLASS()
class AMyActor : public AActor
{
    GENERATED_BODY()
public:
    UPROPERTY(BlueprintAssignable, Category="Events")
    FOnHealthChanged OnHealthChanged;

    void TakeDamage(float Amount)
    {
        Health -= Amount;
        OnHealthChanged.Broadcast(Health);
    }
};
```

---

## UHT Limitations

- **Not a full C++ parser** — does not understand all C++ syntax
- **No templates on reflected types** — only built-in containers (`TArray`, `TMap`, `TSet`, `TSubclassOf`, `TSoftObjectPtr`, `TSoftClassPtr`, `TObjectPtr`) are supported
- **No nested template parameters** — `TArray<TArray<int32>>` is not supported
- **Limited preprocessor support** — cannot use `#if`/`#ifdef` around UPROPERTY/UFUNCTION (except `WITH_EDITOR`, `WITH_EDITORONLY_DATA`)
- **Empty modules** — a module must have at least one UObject for UHT to process it
- **Path issues** — folder names with digits at the start (e.g., "4.14") cause invalid `#define` names

---

## Best Practices

- Always place `.generated.h` as the **last include** in the header file
- Use `GENERATED_BODY()` (not the legacy `GENERATED_UCLASS_BODY()`) — it sets the default access to `private`
- Prefer `BlueprintReadOnly` over `BlueprintReadWrite` — restrict Blueprint write access unless necessary
- Use `meta=(AllowPrivateAccess=true)` for private properties that need Blueprint read access
- Mark RPCs as `Unreliable` by default — use `Reliable` only for critical state changes
- Always add `WithValidation` to `Server` RPCs in multiplayer — prevents client-side cheating
- Use `Category` on every UPROPERTY and UFUNCTION — keeps Details panel and Blueprint graph organized
- Prefer `BlueprintNativeEvent` over `BlueprintImplementableEvent` when C++ needs a default implementation
- Use `MinimalAPI` on UCLASS when only casting is needed from other modules — reduces compile times
- Use `meta=(EditCondition)` and `meta=(EditConditionHides)` to declutter the Details panel

## Anti-patterns

- **Missing `.generated.h` include or wrong position** — causes cryptic UHT errors. Must be the last `#include`, before any code.
- **Forgetting `GENERATED_BODY()`** — class compiles but reflection, serialization, and garbage collection are broken.
- **Using `#if` around reflected members** — UHT cannot parse conditional compilation (except `WITH_EDITOR`/`WITH_EDITORONLY_DATA`). Move conditional logic to runtime checks instead.
- **Reflecting template types** — `UPROPERTY() TMyTemplate<int> X;` fails. Use only UE-supported containers.
- **`BlueprintReadWrite` on everything** — breaks encapsulation. Use `BlueprintReadOnly` + setter functions for controlled mutation.
- **`Reliable` on frequent RPCs** — floods the reliable buffer, causing disconnects. Use `Unreliable` for movement, rotation, and cosmetic updates.
- **Missing `_Implementation` suffix** — `BlueprintNativeEvent` functions require the C++ body in `FuncName_Implementation()`, not `FuncName()`.
- **Nested includes before `.generated.h`** — if another header is included after `.generated.h`, UHT may fail silently or produce errors.
- **`EditAnywhere` + `BlueprintReadWrite` on the same property without `Category`** — creates an unorganized Details panel. Always specify `Category`.
