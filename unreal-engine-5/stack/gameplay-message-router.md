---
version: 1.0.0
---

# Gameplay Message Router

> **Scope**: UE5 Gameplay Message Router plugin — broadcasting and receiving typed USTRUCT messages via Gameplay Tag channels using `UGameplayMessageSubsystem`, listener handle lifecycle, tag channel design, `EGameplayMessageMatch` matching modes, module setup, and integration patterns.
> **Load when**: broadcasting events between unconnected game systems, subscribing to game-wide events via tag channels, setting up `UGameplayMessageSubsystem` listeners in C++, managing `FGameplayMessageListenerHandle` lifetime, designing decoupled HUD or UI data feeds, choosing between Gameplay Messages and delegates or GAS Gameplay Events.

---

## Core Concepts

Gameplay Message Router implements a **Publish-Subscribe** pattern for decoupled communication between otherwise unconnected UE5 objects — no direct references, no delegates, no hard dependencies.

Three elements must agree for a message to be delivered:
- **Channel** — a `FGameplayTag` identifying the message topic. Both broadcaster and listener must use the **same tag**.
- **Message** — any `USTRUCT`. Both broadcaster and listener must use the **same struct type** (verified at runtime, not compile time).
- **MatchType** — controls tag hierarchy matching (see `EGameplayMessageMatch` below).

**Key constraints:**
- Messages are **local-client only** — not replicated over the network. Use RPCs or `RepNotify` for cross-client communication.
- Broadcasts are **synchronous** — callbacks fire immediately in broadcast order; execution order across multiple listeners is not guaranteed.
- Designed for **low-frequency, global events** — not per-frame data.

---

## Module Setup

**Enable the plugin** — add to `.uproject` plugins list:
```json
{ "Name": "GameplayMessageRouter", "Enabled": true }
```

**Add module dependencies** in `Build.cs`:
```csharp
PublicDependencyModuleNames.AddRange(new string[]
{
    "GameplayMessageRuntime",
    "GameplayTags"
});
```

Use `PublicDependencyModuleNames` when the message structs or handle types appear in your module's public headers. Use `PrivateDependencyModuleNames` if all usage is internal.

**Include header:**
```cpp
#include "GameFramework/GameplayMessageSubsystem.h"
```

---

## C++ API

### Get the Subsystem

```cpp
// Preferred — asserts if subsystem is unavailable
UGameplayMessageSubsystem& MsgSys = UGameplayMessageSubsystem::Get(this);

// Nullable — use when availability is conditional
UGameplayMessageSubsystem* MsgSys = GetWorld()->GetSubsystem<UGameplayMessageSubsystem>();
```

### Broadcast a Message

```cpp
FMyMessage Payload;
Payload.SomeValue = 42;

UGameplayMessageSubsystem& MsgSys = UGameplayMessageSubsystem::Get(this);
MsgSys.BroadcastMessage(MyChannel, Payload);
```

`BroadcastMessage` is templated on the struct type — the compiler infers it from the payload argument.

### Register a Listener

**Member function callback:**
```cpp
// Declared in header:
FGameplayMessageListenerHandle ListenerHandle;

// Registered in BeginPlay or Initialize:
ListenerHandle = MsgSys.RegisterListener(MyChannel, this, &UMyClass::OnMessageReceived);

// Callback signature:
void UMyClass::OnMessageReceived(FGameplayTag Channel, const FMyMessage& Message)
{
    // Handle message
}
```

**Lambda callback (UE 5.1+):**
```cpp
ListenerHandle = MsgSys.RegisterListener<FMyMessage>(MyChannel,
    [this](FGameplayTag Channel, const FMyMessage& Msg)
    {
        // Handle message
    });
```

### MatchType — Tag Hierarchy Matching

The optional third argument to `RegisterListener` controls hierarchy behavior:

```cpp
// Only triggers for exact tag match (default)
MsgSys.RegisterListener(MyChannel, this, &UMyClass::OnMessage, EGameplayMessageMatch::ExactMatch);

// Triggers for MyChannel AND all more-specific child tags
// e.g. listening to "Game.Event.Item" catches "Game.Event.Item.Pickup" too
MsgSys.RegisterListener(MyChannel, this, &UMyClass::OnMessage, EGameplayMessageMatch::PartialMatch);
```

| `EGameplayMessageMatch` | Behavior |
|------------------------|---------|
| `ExactMatch` | Only the exact tag fires the listener (default) |
| `PartialMatch` | The tag and all more-specific child tags fire the listener |

Use `PartialMatch` for category-level listeners (e.g., listen to all `Game.Event.Combat.*`). Use `ExactMatch` for precise, single-purpose channels.

### Unregister a Listener

Always unregister explicitly in `EndPlay` or the destructor — do not rely on automatic cleanup:

```cpp
void UMyClass::EndPlay(const EEndPlayReason::Type Reason)
{
    Super::EndPlay(Reason);
    ListenerHandle.Unregister();
}
```

Alternatively:
```cpp
UGameplayMessageSubsystem::Get(this).UnregisterListener(ListenerHandle);
```

---

## Message Struct Design

Define message structs as `USTRUCT(BlueprintType)` for Blueprint interoperability:

```cpp
USTRUCT(BlueprintType)
struct FPlayerDiedMessage
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly)
    TObjectPtr<AActor> Instigator = nullptr;

    UPROPERTY(BlueprintReadOnly)
    TObjectPtr<AActor> Victim = nullptr;

    UPROPERTY(BlueprintReadOnly)
    float Damage = 0.0f;
};
```

**Lyra's `FLyraVerbMessage` pattern** — one reusable generic struct for diverse events:
```cpp
USTRUCT(BlueprintType)
struct FLyraVerbMessage
{
    GENERATED_BODY()

    FGameplayTag Verb;                // action identifier
    TObjectPtr<UObject> Instigator;
    TObjectPtr<UObject> Target;
    FGameplayTagContainer InstigatorTags;
    FGameplayTagContainer TargetTags;
    FGameplayTagContainer ContextTags;
    double Magnitude = 0.0;
};
```

Use the Lyra pattern when many similar events share the same semantic shape. Use dedicated structs when events have distinct fields — dedicated structs give compile-time type safety.

---

## Tag Channel Design

**Organize channels hierarchically** — mirrors Gameplay Tags conventions:
```
Game.Event.Player.Died
Game.Event.Player.Scored
Game.Event.Inventory.ItemAdded
Game.Event.Inventory.ItemRemoved
Game.Event.Match.Started
Game.Event.Match.Ended
```

**Rules:**
- Define channel tags in `.ini` files or `UGameplayTagsManager` — never as raw `FName` strings.
- One channel = one message struct type. Do not broadcast different struct types on the same channel.
- Prefix channels with a game-specific namespace (e.g., `MyGame.Event.*`) to avoid conflicts.
- Use `PartialMatch` listeners only for parent-category channels (`Game.Event.Inventory`) — they receive all child events.

---

## Blueprint API

The subsystem exposes Blueprint nodes:
- **Broadcast Message** — broadcasts a message struct by tag.
- **Listen for Gameplay Messages** — creates a listener; returns a `FGameplayMessageListenerHandle`.
- **Stop Listening for Gameplay Messages** — unregisters the handle.

Use the Blueprint API for UI widgets (UMG) that need to react to gameplay events without holding actor references.

---

## Best Practices

- **Use for cross-system, low-frequency events** — player deaths, inventory changes, match state transitions, HUD updates.
- **Store handles as class members** — `FGameplayMessageListenerHandle` goes stale if the variable is destroyed. Never store in a local variable.
- **Unregister in `EndPlay`** — explicit cleanup prevents dangling listeners even if the destructor fires first.
- **One struct per channel** — encoding the struct type implicitly in the channel tag prevents type confusion at runtime.
- **Prefer specific structs over generic ones** for critical events — type safety at the message boundary is worth the extra struct definition.
- **Do not replace direct references with messages when coupling is minimal** — if two classes naturally know about each other, use direct calls or delegates.
- **Multiplayer:** broadcast a message locally on both server and client as needed — messages do not self-replicate.

---

## Anti-patterns

- **Mismatched struct type** — broadcasting `FStructA` on a channel and listening for `FStructB` produces a runtime error that is difficult to locate. Define and document one struct per channel.
- **Forgetting to unregister** — `FGameplayMessageListenerHandle` does not auto-unregister when its owning object is garbage-collected. Dangling listeners cause callbacks to fire into destroyed objects.
- **Per-frame messaging** — broadcasting every tick creates constant iteration overhead. Use delegates or direct calls for high-frequency data.
- **Expecting replication** — messages fire locally; cross-client or server-authoritative events require RPCs or `RepNotify`.
- **Using for local tightly-scoped events** — if sender and receiver are in the same component or have a direct reference, use delegates. Message Router is for *unconnected* objects.
- **Unguaranteed callback order** — never design logic that depends on the order in which multiple listeners receive the same broadcast.
- **Storing the handle in a local variable** — the handle is invalidated when the local goes out of scope; always use a member variable.