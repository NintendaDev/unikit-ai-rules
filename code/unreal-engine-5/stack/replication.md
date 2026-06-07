---
version: 1.0.0
---

# Unreal Engine 5 Replication System

> **Scope**: UE5 network replication — property replication setup, RPC authoring and routing rules, RepNotify patterns, stateful vs event-based decisions, network roles and modes, relevancy and bandwidth management, push model, replicated subobjects, Fast TArray, atomic replication, and debugging.
> **Load when**: implementing multiplayer gameplay, setting up replicated properties, authoring Server/Client/Multicast RPCs, debugging replication issues, deciding between RepNotify and Multicast, handling late joiners, optimizing network bandwidth, designing server-authoritative systems, working with replicated components or subobjects.

---

## Core Concepts

UE5 uses a **server-authoritative** model: the server holds the source of truth; clients receive state.

- Replication flows **server → client only**. Client → server communication requires Server RPCs.
- An actor with `bReplicates = true` is spawned on clients **only when the server spawns it**. Client-spawned replicated actors remain local.
- Set `bReplicates = true` (and `bReplicateMovement = true` if needed) in the **constructor**, not in `BeginPlay`.

```cpp
AMyActor::AMyActor()
{
    bReplicates = true;
    bReplicateMovement = true;
}
```

### Network Roles (`ENetRole`)

| Role | Description |
|------|-------------|
| `ROLE_None` | Not networked |
| `ROLE_SimulatedProxy` | Receives updates; simulates between server ticks |
| `ROLE_AutonomousProxy` | Locally controlled; can call Server RPCs |
| `ROLE_Authority` | Server-side instance; source of truth |

```cpp
if (HasAuthority())                                   { /* Server only */ }
if (GetLocalRole() == ROLE_AutonomousProxy)           { /* Owning client */ }
if (GetLocalRole() == ROLE_SimulatedProxy)            { /* Non-owning client */ }
```

### Network Modes (`ENetMode`)

```cpp
if (GetNetMode() == NM_DedicatedServer) { /* No local player */ }
if (IsNetMode(NM_ListenServer))         { /* Server with local player */ }
if (IsNetMode(NM_Client))               { /* Pure client */ }
```

---

## Property Replication

### Step 1 — Declare in header

```cpp
// Simple replication
UPROPERTY(Replicated)
float Health;

// With RepNotify callback
UPROPERTY(ReplicatedUsing=OnRep_Health)
float Health;

UFUNCTION()
virtual void OnRep_Health();   // mark virtual — subclasses may override
```

### Step 2 — Register in GetLifetimeReplicatedProps

```cpp
#include "Net/UnrealNetwork.h"

void AMyActor::GetLifetimeReplicatedProps(TArray<FLifetimeProperty>& OutLifetimeProps) const
{
    Super::GetLifetimeReplicatedProps(OutLifetimeProps);   // never skip Super
    DOREPLIFETIME(AMyActor, Health);
}
```

### Conditional Replication

Use `DOREPLIFETIME_CONDITION` to reduce bandwidth:

```cpp
DOREPLIFETIME_CONDITION(AMyActor, PrivateData,    COND_OwnerOnly);
DOREPLIFETIME_CONDITION(AMyActor, VisualState,    COND_SkipOwner);
DOREPLIFETIME_CONDITION(AMyActor, SpawnSnapshot,  COND_InitialOnly);
```

| Condition | Who receives updates |
|-----------|----------------------|
| `COND_InitialOnly` | First replication bundle only |
| `COND_OwnerOnly` | Owner connection only |
| `COND_SkipOwner` | All connections except owner |
| `COND_SimulatedOnly` | Simulated proxies only |
| `COND_AutonomousOnly` | Autonomous proxies only |
| `COND_SimulatedOrPhysics` | Simulated or physics-enabled actors |
| `COND_InitialOrOwner` | Initial bundle or owner |
| `COND_Custom` | Controlled via `SetCustomIsActiveOverride()` |

---

## RepNotify (OnRep) Patterns

RepNotify fires a callback on clients when a property replicates from the server.

**Critical C++ vs Blueprint difference:**
- In **C++**: `OnRep_*` fires **on clients only**. The server must call it manually.
- In **Blueprint**: fires on both server (property set) and clients (property replicated).

### Canonical setter pattern

Always call the `OnRep` manually from the server setter to keep behavior consistent:

```cpp
void AMyActor::SetMesh(USkeletalMesh* NewMesh)
{
    if (HasAuthority())
    {
        Mesh = NewMesh;
        OnRep_Mesh();   // explicit call for server + listen-server
    }
}

void AMyActor::OnRep_Mesh()
{
    GetMesh()->SetSkeletalMesh(Mesh);
}
```

### Stateful vs Transient events

| Use case | Correct approach |
|----------|-----------------|
| Persistent state (door open, mesh swap, health) | `ReplicatedUsing` — late joiners receive current state |
| Cosmetic one-off (explosion, death sound) | `NetMulticast` RPC — transient, no state |
| Client → server request | `Server` RPC |
| Server → specific client | `Client` RPC |

**Never use Multicast for stateful changes.** Late joiners miss all past Multicasts — they will see stale state. Use RepNotify instead.

---

## RPCs (Remote Procedure Calls)

### Declaration

```cpp
// Header
UFUNCTION(Server, Reliable, WithValidation)
void ServerFireWeapon(FVector Origin, FVector_NetQuantizeNormal Direction);

UFUNCTION(Client, Unreliable)
void ClientPlayHitEffect(FVector Location);

UFUNCTION(NetMulticast, Unreliable)
void MulticastPlayExplosion(FVector Location);
```

```cpp
// .cpp — implement with _Implementation suffix
void AMyPawn::ServerFireWeapon_Implementation(FVector Origin, FVector_NetQuantizeNormal Direction)
{
    // Authoritative logic here
}

// WithValidation requires _Validate; return false to drop the call
bool AMyPawn::ServerFireWeapon_Validate(FVector Origin, FVector_NetQuantizeNormal Direction)
{
    return !Origin.ContainsNaN();
}
```

### RPC routing rules

| RPC specifier | Called from | Executes on |
|---------------|-------------|-------------|
| `Server` | Client (owning actor) | Server |
| `Server` | Server | Local only (meaningless) |
| `Client` | Server | Owning client |
| `NetMulticast` | Server | Server + all relevant clients |
| `NetMulticast` | Client | Local only (meaningless) |

A Server RPC from a client with no `NetConnection` for that actor is **silently dropped**.

### Reliability rules

- Use `Reliable` for **critical state changes** (fire, item pickup, respawn).
- Use `Unreliable` for **frequent cosmetic events** (hit effects, sound FX, tick-rate updates).
- **Never call `Reliable` RPCs every frame** — resend accumulation fills the buffer and disconnects players.

### RPC coding rules

- Never call `MyRPC_Implementation()` directly — bypasses the routing system; function runs locally only.
- No return values — use a ping-pong pattern (Server RPC → Client RPC response) for acknowledgement.
- Do not override RPC functions in subclasses — move game logic into a separate virtual function.
- Avoid calling Server RPCs in `BeginPlay` — `NetConnection` may not be established yet. Use `APawn::PossessedBy` or `APlayerController::AcknowledgePossession` instead.

---

## Initialization and Timing

- POD properties (`float`, `int32`, `bool`) set on the server before/during `BeginPlay` are **guaranteed valid at `BeginPlay` on the client**.
- `UObject*` / `AActor*` replicated pointers use async GUID mapping — rely on `OnRep` to react to them safely, not `BeginPlay`.
- For **placed-in-map actors**, `OnRep` may fire **after `BeginPlay`** — design initialization to tolerate this ordering.
- `AGameState` is guaranteed valid when any actor calls `BeginPlay` (driven by `bReplicatedHasBegunPlay`).

---

## Relevancy and Network Frequency

```cpp
// In constructor or defaults
NetUpdateFrequency          = 100.f;   // fast actors (characters, projectiles)
MinNetUpdateFrequency       = 33.f;    // floor under adaptive rate
NetPriority                 = 3.f;     // higher = sent first when bandwidth is saturated
NetCullDistanceSquared      = 225000000.f; // ~15 000 UU radius
```

Common `NetUpdateFrequency` guidelines:

| Actor type | Suggested frequency |
|------------|---------------------|
| Characters, projectiles | 100 |
| Vehicles | 33–66 |
| Interactables, doors | 5–10 |
| Game state actors | 1–2 |

- `bAlwaysRelevant = true` — overrides culling. Use only for GameState, scoring actors, and globally critical objects.
- `bOnlyRelevantToOwner = true` — invisible to non-owning clients (PlayerController, inventory actors).
- Override `IsNetRelevantFor()` in C++ for custom spatial or gameplay-driven relevancy.

---

## Push Model Replication

Push model replaces tick-based dirty polling with explicit dirty marking — reduces server CPU for actors with many infrequently-changing properties.

Enable in `GetLifetimeReplicatedProps`:

```cpp
#include "Net/Core/PushModel/PushModel.h"
#include "Net/UnrealNetwork.h"

void AMyActor::GetLifetimeReplicatedProps(TArray<FLifetimeProperty>& OutLifetimeProps) const
{
    Super::GetLifetimeReplicatedProps(OutLifetimeProps);
    FDoRepLifetimeParams Params;
    Params.bIsPushBased = true;
    DOREPLIFETIME_WITH_PARAMS_FAST(AMyActor, Health, Params);
}
```

Mark dirty whenever the property changes:

```cpp
void AMyActor::SetHealth(float NewHealth)
{
    MARK_PROPERTY_DIRTY_FROM_NAME(AMyActor, Health, this);
    Health = NewHealth;
}
```

Use push model when an actor has many replicated properties that change rarely (resource nodes, environment objects, inventory items).

---

## Replicated Components (Subobjects)

Enable replication on components in their constructor:

```cpp
AMyActor::AMyActor()
{
    MyComponent = CreateDefaultSubobject<UMyComponent>(TEXT("MyComponent"));
    MyComponent->SetIsReplicatedByDefault(true);
}
```

For **dynamic** subobject replication (UE5.1+):

```cpp
bool AMyActor::ReplicateSubobjects(UActorChannel* Channel, FOutBunch* Bunch, FReplicationFlags* RepFlags)
{
    bool bWroteSomething = Super::ReplicateSubobjects(Channel, Bunch, RepFlags);
    bWroteSomething |= Channel->ReplicateSubobject(MyComponent, *Bunch, *RepFlags);
    return bWroteSomething;
}
```

---

## Fast Array Replication (FTR)

For replicating large dynamic arrays of structs (inventory, ability lists), use `FFastArraySerializer` instead of plain `TArray`. Sends only delta changes, not the full array.

```cpp
USTRUCT()
struct FMyItem : public FFastArraySerializerItem
{
    GENERATED_BODY()

    UPROPERTY()
    int32 ItemId = 0;

    UPROPERTY()
    int32 Count = 0;

    void PostReplicatedAdd(const struct FMyItemArray& InArray);
    void PostReplicatedChange(const struct FMyItemArray& InArray);
    void PreReplicatedRemove(const struct FMyItemArray& InArray);
};

USTRUCT()
struct FMyItemArray : public FFastArraySerializer
{
    GENERATED_BODY()

    UPROPERTY()
    TArray<FMyItem> Items;

    bool NetDeltaSerialize(FNetDeltaSerializeInfo& DeltaParms)
    {
        return FFastArraySerializer::FastArrayDeltaSerialize<FMyItem, FMyItemArray>(
            Items, DeltaParms, *this);
    }
};

template<>
struct TStructOpsTypeTraits<FMyItemArray> : public TStructOpsTypeTraitsBase2<FMyItemArray>
{
    enum { WithNetDeltaSerializer = true };
};
```

Then declare as a replicated property and register normally with `DOREPLIFETIME`.

---

## Atomic Replication

When two or more properties must always arrive together (to avoid impossible intermediate states on clients), pack them into a struct with custom `NetSerialize`:

```cpp
USTRUCT()
struct FWeaponState
{
    GENERATED_BODY()

    UPROPERTY()
    float Ammo = 0.f;

    UPROPERTY()
    uint8 FireMode = 0;

    bool NetSerialize(FArchive& Ar, class UPackageMap* Map, bool& bOutSuccess)
    {
        Ar << Ammo << FireMode;
        bOutSuccess = true;
        return true;
    }
};

template<>
struct TStructOpsTypeTraits<FWeaponState> : public TStructOpsTypeTraitsBase2<FWeaponState>
{
    enum { WithNetSerializer = true };
};
```

Use atomic replication whenever split-packet delivery of related properties would create an invalid or unhandled client state.

---

## Debugging

- `stat net` — live bandwidth and packet statistics per actor class.
- **Network Profiler** (Editor → Tools → Network Profiler) — records and analyzes replication traffic sessions.
- Launch arguments for stress testing:
  ```
  -SimulatePacketLoss=5    # 5% simulated loss
  -NetPktLag=100           # 100ms simulated latency
  -NetPktLagVariance=20    # jitter ±20ms
  ```
- Always test with a **dedicated server process + separate client process** — listen-server masks many ownership and OnRep bugs.
- Always test **late joiner** scenarios: join an in-progress session and verify all stateful properties arrive correctly.

---

## Anti-patterns

- **`GetPlayerXXX(0)` in multiplayer** — index 0 is valid only on listen-servers. Use `GetOwningPlayer()`, `APawn::GetController()`, or `AController::GetPawn()` instead.
- **Multicast for stateful changes** — late joiners miss all past Multicasts. Use RepNotify instead.
- **`Reliable` RPC every Tick** — resend accumulation fills the reliable buffer and disconnects players.
- **Calling `_Implementation()` directly** — bypasses RPC routing; the function executes locally only, which is always wrong.
- **Server RPC in `BeginPlay`** — `NetConnection` may not exist yet; the call is silently dropped.
- **Spawning replicated actors on clients** — they won't appear on other clients. Only the server may spawn replicated actors.
- **Game logic in `AGameMode` that clients need** — `GameMode` is server-only. Move client-visible state to `AGameState` or `APlayerState`.
- **Skipping `Super::GetLifetimeReplicatedProps`** — silently breaks replication for all base-class properties.
- **`bAlwaysRelevant = true` on high-frequency actors** — forces replication to every client regardless of distance; kills bandwidth.
- **Plain `TArray` for large dynamic collections** — use `FFastArraySerializer` instead to avoid sending the full array every change.