version: 1.0.0

# Gameplay Framework

> **Scope**: UE5 Gameplay Framework class roles, responsibilities, and inter-class relationships — covering GameMode, GameState, PlayerController, PlayerState, Pawn, Character, HUD, and GameInstance; their replication rules, access patterns, and data ownership decisions.
> **Load when**: designing game mode or match flow, choosing where to store player or match data, wiring PlayerController or PlayerState, deciding between GameMode and GameState, setting up multiplayer replication boundaries, implementing persistent cross-level data, working with HUD or game session logic.

---

## Core Concepts

The Gameplay Framework enforces strict separation of concerns:

- **Controllers decide** — `APlayerController` and `AAIController` direct Pawns
- **Pawns execute** — `APawn` / `ACharacter` is the physical world representation
- **States replicate data** — `APlayerState` and `AGameState` carry network-visible data
- **GameMode rules** — defines spawn classes and match flow; server-only

### Class Availability

| Class | Server | Owning Client | Other Clients | Replicated |
|-------|--------|---------------|---------------|------------|
| `AGameMode` / `AGameModeBase` | ✓ | ✗ | ✗ | No |
| `AGameState` / `AGameStateBase` | ✓ | ✓ | ✓ | Yes |
| `APlayerController` | ✓ | ✓ | ✗ | No |
| `APlayerState` | ✓ | ✓ | ✓ | Yes |
| `APawn` / `ACharacter` | ✓ | ✓ | ✓ | Yes |
| `AHUD` | ✗ | ✓ | ✗ | No |
| `UGameInstance` | ✓ | ✓ | — | No |

---

## Class Responsibilities

### `AGameModeBase` / `AGameMode`

Server-only class that defines the rules of the game. Never exists on any client.

- **Responsibilities**: framework class registration (Pawn, PC, HUD, GameState, PlayerState), player login/logout callbacks, match flow control
- Use `AGameModeBase` for single-player or simple games — lighter, no match state machine
- Use `AGameMode` for multiplayer that needs a built-in match state machine (`WaitingToStart` → `InProgress` → `WaitingPostMatch`)

```cpp
// Register all framework classes in the constructor
AMyGameMode::AMyGameMode()
{
    DefaultPawnClass       = AMyCharacter::StaticClass();
    PlayerControllerClass  = AMyPlayerController::StaticClass();
    GameStateClass         = AMyGameState::StaticClass();
    PlayerStateClass       = AMyPlayerState::StaticClass();
    HUDClass               = AMyHUD::StaticClass();
}
```

### `AGameStateBase` / `AGameState`

Replicated match state — the client-visible mirror of `AGameMode`. Exists and replicates to all machines.

- **Responsibilities**: shared match data (scores, timer, round phase), player list via `PlayerArray`
- The only safe place to read match-wide state from client code
- `PlayerArray` holds all `APlayerState` objects and is accessible on every machine

```cpp
// Expose match timer as a replicated property in GameState
UPROPERTY(Replicated)
float MatchTimeRemaining;
```

### `APlayerController`

Exists on the server and the owning client only. Not visible to other clients.

- **Responsibilities**: input processing, camera management (`UPlayerCameraManager`), possessing Pawns, owning `AHUD`
- Never store data here that other players need to see — use `APlayerState` instead

```cpp
// Access PlayerController from Pawn
AMyPlayerController* PC = Cast<AMyPlayerController>(GetController());

// Access owned HUD from PlayerController
AMyHUD* HUD = Cast<AMyHUD>(PC->GetHUD());
```

### `APlayerState`

Replicated to all machines. Persists when the Pawn is destroyed (e.g., on death).

- **Responsibilities**: per-player data visible to all clients (score, team ID, ping, display name)
- Data here survives Pawn respawn — use it for anything that must persist across deaths

```cpp
// Properties in AMyPlayerState
UPROPERTY(Replicated)
int32 Score;

UPROPERTY(Replicated)
int32 TeamID;
```

### `APawn` / `ACharacter`

Replicated physical representation in the world. Possessed by a Controller.

- `APawn` — base class; override `SetupPlayerInputComponent()` for input bindings
- `ACharacter` — extends `APawn` with `USkeletalMeshComponent`, `UCapsuleComponent`, `UCharacterMovementComponent`; use for humanoid characters
- Store only transient per-frame data here; persistent stats belong in `APlayerState`

```cpp
AMyCharacter::AMyCharacter()
{
    CameraBoom = CreateDefaultSubobject<USpringArmComponent>(TEXT("CameraBoom"));
    CameraBoom->SetupAttachment(RootComponent);
    CameraBoom->TargetArmLength = 300.0f;
    CameraBoom->bUsePawnControlRotation = true;

    FollowCamera = CreateDefaultSubobject<UCameraComponent>(TEXT("FollowCamera"));
    FollowCamera->SetupAttachment(CameraBoom, USpringArmComponent::SocketName);
    FollowCamera->bUsePawnControlRotation = false;
}
```

### `AHUD`

Client-only, owned by `APlayerController`. Not replicated.

- Use for game-critical HUD overlays (crosshair, minimal debug UI)
- In practice prefer `UUserWidget` (UMG) over `AHUD` for complex, data-driven UI
- Read display data from `APlayerState` and `AGameState`

### `UGameInstance`

One instance per game process. Not replicated. Persists across level transitions from launch to shutdown.

- Use for data that must survive map changes: save state, lobby configuration, matchmaking data
- Do not use for per-match or per-session data — that belongs in `AGameState` / `APlayerState`

```cpp
UMyGameInstance* GI = GetGameInstance<UMyGameInstance>();
```

---

## Access Patterns

```cpp
// GameMode — server only (null on clients)
AMyGameMode* GM = GetWorld()->GetAuthGameMode<AMyGameMode>();

// GameState — all machines
AMyGameState* GS = GetWorld()->GetGameState<AMyGameState>();

// PlayerController — from a Pawn
AMyPlayerController* PC = Cast<AMyPlayerController>(GetController());

// PlayerController — iterate all (server-side)
for (auto It = GetWorld()->GetPlayerControllerIterator(); It; ++It)
{
    AMyPlayerController* PC = Cast<AMyPlayerController>(It->Get());
}

// PlayerState — from Pawn or Controller
AMyPlayerState* PS = GetPlayerState<AMyPlayerState>();   // APawn / ACharacter API
AMyPlayerState* PS = PC->GetPlayerState<AMyPlayerState>();

// HUD — from PlayerController
AMyHUD* HUD = Cast<AMyHUD>(PC->GetHUD());

// GameInstance
UMyGameInstance* GI = GetGameInstance<UMyGameInstance>();

// All PlayerStates via GameState (works on all machines)
for (APlayerState* PS : GS->PlayerArray) { ... }
```

---

## Data Ownership Decision

Use this decision tree when choosing where to store a variable:

| Condition | Correct location |
|-----------|-----------------|
| Other players must see it | `APlayerState` |
| Match-wide, not per-player | `AGameState` |
| Client-side input or camera only | `APlayerController` |
| Must survive level transitions | `UGameInstance` |
| Server-only game logic / rules | `AGameMode` |
| Physical / transient per-character | `APawn` / `ACharacter` |

---

## Best Practices

- Prefer `AGameModeBase` over `AGameMode` for single-player — no match state machine overhead
- Never read `GameMode` data directly on clients; expose it through `AGameState` instead
- Use `GS->PlayerArray` to iterate over all players on any machine (no server-only restriction)
- Register all spawnable framework classes in `AGameMode`'s constructor via the class properties
- Always call `Super::` on overridden lifecycle methods (`BeginPlay`, `PostInitializeComponents`, `Logout`, etc.)
- Use `GetWorld()->GetAuthGameMode<T>()` on the server; guard with `HasAuthority()` before calling it
- Prefer the templated accessors (`GetGameState<T>()`, `GetPlayerState<T>()`) over raw casts for null safety

---

## Anti-patterns

- **Storing shared match data in `AGameMode`**: clients never receive it — put shared state in `AGameState`.
- **Storing per-player replicated data in `APlayerController`**: only exists on owning client and server; other clients never see it.
- **Storing persistent stats only in `APawn`**: Pawns are destroyed on death — use `APlayerState` for anything that must survive respawn.
- **Using `UGameInstance` for per-match data**: it outlives the match — use `AGameState` or `APlayerState` for match-scoped data.
- **Using `AGameMode` where `AGameModeBase` suffices**: adds unnecessary match state machine overhead for single-player games.
- **Accessing `AGameMode` from client code without a null-check**: `GetAuthGameMode()` always returns null on clients; guard every call with `HasAuthority()`.
- **Overriding `SetupPlayerInputComponent` in `APlayerController`**: input binding lives in `APawn::SetupPlayerInputComponent`, not in the controller.
