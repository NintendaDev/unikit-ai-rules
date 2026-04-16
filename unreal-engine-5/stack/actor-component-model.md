version: 1.0.0

# Actor/Component Model

> **Scope**: Unreal Engine 5 Actor/Component architecture — component hierarchy, ownership model, Actor and Component lifecycle hooks, component declaration patterns, component communication, and runtime composition.
> **Load when**: designing Actor or Component classes, choosing between UActorComponent and USceneComponent, wiring components in a constructor, binding delegates across components, accessing sibling components, adding components at runtime, debugging initialization order or lifecycle issues, structuring Actor/Component ownership.

---

## Component Hierarchy

| Class | Has Transform | Use For |
|---|---|---|
| `UActorComponent` | No | Abstract behaviors: health, inventory, AI logic, input interpretation |
| `USceneComponent` | Yes | Spatial behaviors without geometry: attachment points, spring arms, audio sources |
| `UPrimitiveComponent` | Yes | Renderable/collidable: meshes, shapes, collision volumes |

Choose `UActorComponent` when the behavior has no physical location. Choose `USceneComponent` when you need world position, attachment, or scene hierarchy. `UPrimitiveComponent` is the right base only when the component renders geometry or participates in collision queries.

---

## Ownership Model

- Actors are containers. Their behavior is defined entirely by components — keep Actors thin.
- Components created via `CreateDefaultSubobject<T>()` are **default subobjects**: serialized, registered in Blueprint's component tree, and destroyed with their owning Actor.
- `GetOwner()` from any component returns the owning `AActor*`. Safe to call from `BeginPlay()` onward.
- Components hold a strong GC reference to their owning Actor via `GetOwner()`. Never store a raw `AActor*` back-reference without `UPROPERTY` — GC cannot track it.

---

## Actor and Component Lifecycle

Actors initialize in this order:

1. **`Constructor`** — create default subobjects (`CreateDefaultSubobject`), set property defaults. The constructor runs for the CDO too — never call gameplay logic, world queries, or delegate binding here.
2. **`PostInitProperties`** — UPROPERTY members are initialized from instance data / CDO. Useful for computed values derived from designer-set properties.
3. **`PostLoad`** / **`PostActorCreated`** — serialized actors use `PostLoad`; spawned actors use `PostActorCreated`. Use for setup that depends on the actor type.
4. **`OnConstruction`** — Blueprint construction scripts run here. Re-runs every time a property changes in the editor.
5. **`PreInitializeComponents`** — called before any component initialization begins.
6. **Per-component sequence**: `OnComponentCreated` → `OnRegister` → `InitializeComponent` (only when `bWantsInitializeComponent = true`).
7. **`PostInitializeComponents`** — all components have been initialized. **Best place to bind delegates between components.**
8. **`BeginPlay`** — world is ready, all actors are initialized. Primary hook for gameplay initialization logic. Components receive their own `BeginPlay` call after the owning Actor's `BeginPlay`.

Component endplay / destruction sequence:

- **`EndPlay(EEndPlayReason::Type)`** — actor is leaving the world (destroyed, level unloaded, PIE end). Release external resources, unbind delegates.
- **`OnComponentDestroyed`** — component is being destroyed.

### Key component hooks

```cpp
// Called every frame when ticking is enabled
virtual void TickComponent(float DeltaTime, ELevelTick TickType,
    FActorComponentTickFunction* ThisTickFunction) override;

// Called when the component is registered with the scene — fires in editor too.
// Do NOT create sub-objects here.
virtual void OnRegister() override;

// Conditional initialization — set bWantsInitializeComponent = true to enable.
virtual void InitializeComponent() override;

// Safe primary initialization hook. GetOwner() is valid here.
virtual void BeginPlay() override;

// Cleanup hook.
virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;
```

Tick order between components and their owning Actor is not guaranteed. Use `AddTickPrerequisiteActor` / `AddTickPrerequisiteComponent` to enforce tick ordering when it matters.

---

## Patterns & Examples

### Component declaration: private + BlueprintGetter (recommended)

Declaring components as `private` with a `UFUNCTION(BlueprintGetter)` prevents accidental overwrites in subclasses and external code while keeping full Blueprint graph access.

```cpp
// MyActor.h
UCLASS()
class MYPROJECT_API AMyActor : public AActor
{
    GENERATED_BODY()

public:
    AMyActor();

    UFUNCTION(BlueprintGetter, Category = "Components")
    UHealthComponent* GetHealthComponent() const { return HealthComponent; }

private:
    UPROPERTY(VisibleAnywhere, BlueprintGetter = GetHealthComponent, Category = "Components")
    TObjectPtr<UHealthComponent> HealthComponent;
};

// MyActor.cpp
AMyActor::AMyActor()
{
    HealthComponent = CreateDefaultSubobject<UHealthComponent>(TEXT("HealthComponent"));
}
```

### Scene component with attachment hierarchy

```cpp
AMyCharacter::AMyCharacter()
{
    RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));

    MeshComp = CreateDefaultSubobject<USkeletalMeshComponent>(TEXT("Mesh"));
    MeshComp->SetupAttachment(RootComponent);

    SpringArmComp = CreateDefaultSubobject<USpringArmComponent>(TEXT("SpringArm"));
    SpringArmComp->SetupAttachment(RootComponent);

    CameraComp = CreateDefaultSubobject<UCameraComponent>(TEXT("Camera"));
    CameraComp->SetupAttachment(SpringArmComp);
}
```

### Delegate binding: PostInitializeComponents (preferred for inter-component wiring)

```cpp
void AMyActor::PostInitializeComponents()
{
    Super::PostInitializeComponents();

    // Both components are initialized here — safe to cross-wire delegates.
    HealthComponent->OnHealthChanged.AddDynamic(this, &AMyActor::OnHealthChanged);
}
```

### Component BeginPlay — access owner and bind to Actor delegates

```cpp
void UHealthComponent::BeginPlay()
{
    Super::BeginPlay();

    AActor* Owner = GetOwner();
    if (Owner)
    {
        Owner->OnTakeAnyDamage.AddDynamic(this, &UHealthComponent::HandleTakeDamage);
    }
    Health = MaxHealth;
}
```

### Disable Tick when not needed

```cpp
AMyActor::AMyActor()
{
    PrimaryActorTick.bCanEverTick = false; // default: off — opt in only where required

    HealthComponent = CreateDefaultSubobject<UHealthComponent>(TEXT("HealthComponent"));
    // Component tick is also off by default in UActorComponent
}
```

### Dynamic component creation at runtime

Use only when composition must change at runtime (e.g., procedural actors). Prefer constructor creation for all static components.

```cpp
UMyComponent* NewComp = NewObject<UMyComponent>(this);
NewComp->SetupAttachment(RootComponent); // if USceneComponent
NewComp->RegisterComponent();
AddInstanceComponent(NewComp); // marks as instance-level (serialized with the Actor instance)
```

### Finding a component on another Actor

```cpp
// Direct member reference — always preferred when you own the Actor.
UHealthComponent* HC = HealthComponent;

// FindComponentByClass — use when accessing a component on an external Actor.
UHealthComponent* HC = OtherActor->FindComponentByClass<UHealthComponent>();
if (HC)
{
    HC->ApplyDamage(10.f);
}

// Avoid GetComponentsByClass — returns TArray, use only when expecting multiple components of the same type.
```

---

## Best Practices

- **Prefer private components with `BlueprintGetter`** over public properties or `AllowPrivateAccess` meta — clear ownership, no accidental overwrite.
- **Use `TObjectPtr<T>` for all `UPROPERTY` component references in UE5** — required for GC visibility and virtualized asset support.
- **Create all static components in the constructor via `CreateDefaultSubobject`** — they appear in Blueprint's component tree and are serialized correctly.
- **Bind delegates in `PostInitializeComponents` or `BeginPlay`**, never in the constructor — CDO has no world context.
- **Call `GetOwner()` from `BeginPlay()` onward** — owner is not guaranteed to be fully set up in `OnRegister` or `InitializeComponent`.
- **Keep components self-contained** — a component should not hold direct references to sibling components; communicate via delegates or interfaces.
- **Keep Actors thin** — an Actor is a container. Put all reusable behavior in components.
- **Disable `PrimaryActorTick.bCanEverTick`** and component tick by default; enable only where explicitly needed.
- **Prefer `FindComponentByClass<T>()` over casting the Actor** — cleaner and avoids tight coupling.
- **Assign assets (meshes, materials, sounds) in Blueprint Details Panel**, never with `ConstructorHelpers::FObjectFinder` or hardcoded paths in C++.

---

## Anti-Patterns

- **Creating sub-objects in `OnRegister`** — `OnRegister` fires every time the Actor is modified in the editor; sub-objects created there accumulate as duplicates.
- **Binding delegates in the constructor** — the CDO is constructed without a world; results in crashes or double-binding at runtime.
- **Raw `T*` UPROPERTY component references in UE5** — use `TObjectPtr<T>`; raw pointers opt out of the virtualized asset system.
- **Raw `T*` pointers without UPROPERTY** — the garbage collector cannot track them; the object may be destroyed and leave a dangling pointer.
- **Calling `GetOwner()` in `OnRegister`** — the owner may not be fully initialized at this stage; defer to `BeginPlay`.
- **Components directly accessing sibling components** — creates tight coupling; use multicast delegates or `UINTERFACE` contracts instead.
- **Iterating all components with `GetComponents<T>()`** — expensive; cache a direct reference in `BeginPlay` or keep a typed member pointer.
- **Dynamic component creation in `BeginPlay` when the component is always present** — `CreateDefaultSubobject` in the constructor is cheaper, Blueprint-friendly, and properly serialized.
- **Deep inheritance hierarchies on Actors** — prefer composition (add a component) over extending an inheritance chain.
