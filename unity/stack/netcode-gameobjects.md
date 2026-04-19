---
version: 1.0.0
---

# Netcode for GameObjects

> **Scope**: Unity Netcode for GameObjects (NGO) v2.x — client-server and distributed authority multiplayer networking, covering NetworkObject spawning and lifecycle, NetworkBehaviour callbacks, NetworkVariable state synchronization, RPC invocation patterns, ownership and authority management, and NetworkManager configuration.
> **Load when**: implementing multiplayer with Netcode for GameObjects, writing NetworkBehaviour subclasses, declaring NetworkVariables or subscribing to value changes, sending or receiving RPCs, managing NetworkObject spawning or despawning, debugging network authority or ownership issues, wiring NetworkManager, choosing between RPC and NetworkVariable.

---

## Core Concepts

**Netcode for GameObjects (NGO)** is Unity's high-level networking library for GameObject/MonoBehaviour workflows. It abstracts transport-layer details and provides authoritative synchronization via `NetworkVariable`, `NetworkObject`, and RPCs.

**Topology options:**

| Topology | Description |
|----------|-------------|
| **Client-Server** | Server is authoritative for all game state. Clients send requests, server validates and applies. Default mode. |
| **Distributed Authority** | Ownership is distributed — each client is authoritative over the objects it owns. Available in Unity Gaming Services. |

**Key components:**

| Component | Role |
|-----------|------|
| `NetworkManager` | Singleton — central hub for all networking. Manages sessions, spawning, transport config. |
| `NetworkObject` | Marks a GameObject as network-aware; required on any object that needs to be synchronized. |
| `NetworkBehaviour` | Base class for scripts that interact with the network. Provides lifecycle callbacks and network properties. |
| `NetworkVariable<T>` | Automatically synchronized state field. Changes are replicated to all observers. |
| `[Rpc]` | Attribute for remote procedure calls — invokes a method on other peers. |

---

## NetworkBehaviour Lifecycle

All network initialization **must** go in `OnNetworkSpawn`, not in `Start` or `Awake`.

```csharp
public class PlayerController : NetworkBehaviour
{
    public override void OnNetworkSpawn()
    {
        base.OnNetworkSpawn(); // always call base
        // Subscribe to NetworkVariables here
        Health.OnValueChanged += OnHealthChanged;
    }

    public override void OnNetworkDespawn()
    {
        base.OnNetworkDespawn(); // always call base
        // Unsubscribe here to prevent memory leaks
        Health.OnValueChanged -= OnHealthChanged;
    }

    public override void OnGainedOwnership()
    {
        // Invoked on server and the new owner's client
    }

    public override void OnLostOwnership()
    {
        // Invoked when local client loses ownership
    }
}
```

**Callback order differs by spawning method:**

| Spawn method | Order |
|--------------|-------|
| Dynamically spawned | `Awake` → `OnNetworkSpawn` → `Start` |
| In-scene placed | `Awake` → `Start` → `OnNetworkSpawn` |

Never rely on `Start` being called before or after `OnNetworkSpawn`. Put network-dependent logic only in `OnNetworkSpawn`.

---

## NetworkVariable

### Declaration

Declare as a field — **never assign** `new NetworkVariable<T>()` at field-declaration level for `NetworkList`. For `NetworkVariable<T>` (scalar types) field initialization is fine. For `NetworkList<T>` always initialize in `Awake`.

```csharp
// OK — scalar NetworkVariable declared at field level
public NetworkVariable<int> Score = new NetworkVariable<int>(
    0,
    NetworkVariableReadPermission.Everyone,
    NetworkVariableWritePermission.Server);

// OK — NetworkList initialized in Awake to avoid memory leaks
private NetworkList<int> _inventory;

void Awake()
{
    _inventory = new NetworkList<int>();
}
```

### Supported types

| Category | Examples |
|----------|---------|
| C# unmanaged primitives | `bool`, `byte`, `int`, `float`, `double`, `ulong`, `enum` |
| Unity value types | `Vector2/3/4`, `Quaternion`, `Color`, `Color32`, `Ray`, `Ray2Int` |
| Unmanaged structs | Any struct implementing `INetworkSerializeByMemcpy` |
| Custom serializable | Any type implementing `INetworkSerializable` |
| Fixed strings | `FixedString32Bytes` … `FixedString4096Bytes` |

**Strings (`string`) are not supported** — they are immutable and cause a GC allocation on every update. Use `FixedString32Bytes` / `FixedString64Bytes` instead.

**Nested NetworkVariables are not supported** — NGO's code generation cannot handle `NetworkVariable<NetworkVariable<T>>`.

### Permissions

```csharp
// Default: server writes, everyone reads
public NetworkVariable<float> Health = new NetworkVariable<float>();

// Owner-authoritative (e.g. ammo for the owning player only)
public NetworkVariable<int> Ammo = new NetworkVariable<int>(
    default,
    NetworkVariableReadPermission.Owner,
    NetworkVariableWritePermission.Owner);
```

| Permission | Options |
|------------|---------|
| `NetworkVariableReadPermission` | `Everyone` (default), `Owner` |
| `NetworkVariableWritePermission` | `Server` (default), `Owner` |

### OnValueChanged

Subscribe in `OnNetworkSpawn`, unsubscribe in `OnNetworkDespawn`. The callback receives `(previousValue, newValue)`.

```csharp
public NetworkVariable<bool> IsAlive = new NetworkVariable<bool>(true);

public override void OnNetworkSpawn()
{
    IsAlive.OnValueChanged += HandleAliveStateChanged;
}

public override void OnNetworkDespawn()
{
    IsAlive.OnValueChanged -= HandleAliveStateChanged;
}

private void HandleAliveStateChanged(bool previous, bool current)
{
    // React to the change — runs on every observer
}
```

### Collections

After modifying a `NetworkList` (or any nested collection), call `CheckDirtyState()` once — **not** after each individual change. This method is expensive on large collections.

```csharp
_inventory.Add(42);
_inventory.Add(99);
_inventory.CheckDirtyState(); // one call after all modifications
```

---

## RPC System (v2.x)

### Declaration

Mark with `[Rpc(SendTo.Target)]` and append `Rpc` to the method name. Both are required — the suffix is enforced at compile time.

```csharp
[Rpc(SendTo.Server)]
public void RequestPickupRpc(ulong itemId) { }

[Rpc(SendTo.Everyone)]
public void PlayExplosionEffectRpc(Vector3 position) { }
```

### SendTo targets

| Target | Who executes |
|--------|-------------|
| `SendTo.Server` | Server only |
| `SendTo.NotServer` | All clients (not server); filtered by observer list |
| `SendTo.Owner` | Only the NetworkObject's current owner |
| `SendTo.NotOwner` | Everyone except the owner; filtered by observer list |
| `SendTo.Me` | Local machine only |
| `SendTo.NotMe` | Everyone except local machine; filtered by observer list |
| `SendTo.Everyone` | All clients and server; filtered by observer list |
| `SendTo.ClientsAndHost` | All clients including host; adapts to host vs. dedicated server |
| `SendTo.SpecifiedInParams` | Target specified at call site via `RpcParams` |

### RpcParams — runtime targeting

Add `RpcParams rpcParams = default` as the **last** parameter to access sender info or override the target at call time.

```csharp
[Rpc(SendTo.Server)]
public void PingServerRpc(int count, RpcParams rpcParams = default)
{
    // Reply only to the sender
    SendPongRpc(count, RpcTarget.Single(rpcParams.Receive.SenderClientId, RpcTargetUse.Temp));
}

[Rpc(SendTo.SpecifiedInParams)]
private void SendPongRpc(int count, RpcParams rpcParams = default) { }
```

Use `RpcTargetUse.Temp` for one-off calls; `RpcTargetUse.Persistent` for reused target objects.

### Attribute options

| Parameter | Values | Default |
|-----------|--------|---------|
| `Delivery` | `RpcDelivery.Reliable`, `RpcDelivery.Unreliable` | `Reliable` |
| `InvokePermission` | `Everyone`, `Owner`, `Server` | `Everyone` |
| `DeferLocal` | `bool` | `false` |
| `AllowTargetOverride` | `bool` | `false` |

Use `DeferLocal = true` when RPCs call other RPCs to prevent message-ordering issues:

```csharp
[Rpc(SendTo.Everyone, DeferLocal = true)]
public void OpenDoorRpc(int doorId) { }
```

### Migrating legacy attributes (v1.x → v2.x)

```csharp
// Legacy                              // v2.x equivalent
[ServerRpc]                         →  [Rpc(SendTo.Server, InvokePermission = RpcInvokePermission.Owner)]
[ServerRpc(RequireOwnership = false)]→  [Rpc(SendTo.Server, InvokePermission = RpcInvokePermission.Everyone)]
[ClientRpc]                         →  [Rpc(SendTo.NotServer)]
```

### RPC vs NetworkVariable — when to use which

| Use case | Prefer |
|----------|--------|
| Continuous state (health, position, score) | `NetworkVariable` |
| Event-driven action (attack, door open) | `RPC` |
| Late-joining client needs current value | `NetworkVariable` (state is synced automatically) |
| One-off trigger that doesn't persist | `RPC` |
| High-frequency position updates (character movement) | `RPC` with `Unreliable` delivery |

---

## Ownership & Authority

In client-server mode the **server is authoritative by default**. Clients request actions via RPCs; the server validates and applies.

### Authority checks

```csharp
NetworkManager.Singleton.IsServer   // true on server and host
NetworkManager.Singleton.IsClient   // true on clients and host
NetworkManager.Singleton.IsHost     // true when server + client in one process

// Per-object (on NetworkBehaviour):
IsOwner          // local client owns this object
IsOwnedByServer  // server owns this object
IsServer         // shorthand for NetworkManager.Singleton.IsServer
IsClient         // shorthand for NetworkManager.Singleton.IsClient
```

Guard server-only logic with `if (!IsServer) return;` and owner-only logic with `if (!IsOwner) return;`.

### Ownership transfer

```csharp
// Server can reassign ownership at any time
networkObject.ChangeOwnership(clientId);

// Callbacks fire on both old and new owner
public override void OnGainedOwnership() { }
public override void OnLostOwnership()   { }
```

---

## NetworkObject Spawning

Only the **server** (or authority in distributed mode) spawns and despawns `NetworkObject`s.

```csharp
// Server-owned spawn
var go = Instantiate(prefab);
go.GetComponent<NetworkObject>().Spawn();

// Spawn with immediate ownership
go.GetComponent<NetworkObject>().SpawnWithOwnership(clientId);

// Spawn as the player object for a specific client
go.GetComponent<NetworkObject>().SpawnAsPlayerObject(clientId);

// Despawn (destroys by default)
networkObject.Despawn();

// Despawn without destroying the GameObject
networkObject.Despawn(destroy: false);
```

### Prefab registration

All networked prefabs must be registered in **NetworkManager → Network Prefabs** before use. Attempting to spawn an unregistered prefab throws a runtime error.

---

## Configuration

### NetworkManager setup

| Setting | Notes |
|---------|-------|
| `NetworkPrefabs` | Register all networked prefabs here |
| `PlayerPrefab` | Automatically spawned for each connecting client |
| `ConnectionApproval` | Enable for server-side connection validation |
| `NetworkTickSystem` | Tick rate drives NetworkVariable update frequency (default 30 Hz) |
| Transport | Add `UnityTransport` component; configure for Relay or direct IP |

### Starting a session

```csharp
// Host (server + local client)
NetworkManager.Singleton.StartHost();

// Dedicated server only
NetworkManager.Singleton.StartServer();

// Client only
NetworkManager.Singleton.StartClient();

// Callbacks
NetworkManager.Singleton.OnClientConnectedCallback    += OnClientConnected;
NetworkManager.Singleton.OnClientDisconnectCallback   += OnClientDisconnected;
NetworkManager.Singleton.OnServerStarted              += OnServerReady;
```

---

## Best Practices

- Put all network initialization and `NetworkVariable` subscriptions in `OnNetworkSpawn`, not `Start` or `Awake`.
- Always call `base.OnNetworkSpawn()`, `base.OnNetworkDespawn()`, and `base.OnDestroy()` when overriding lifecycle methods.
- Unsubscribe from `NetworkVariable.OnValueChanged` in `OnNetworkDespawn` to prevent leaks after despawn.
- Prefer unmanaged types (`int`, `float`, `enum`, unmanaged struct) for `NetworkVariable` to avoid GC pressure.
- Use `FixedString32Bytes` / `FixedString64Bytes` instead of `string` in `NetworkVariable`.
- Initialize `NetworkList<T>` in `Awake`, never at field-declaration level.
- Guard server-only state changes with `if (!IsServer) return;`; guard owner-only input with `if (!IsOwner) return;`.
- Use `[Rpc(SendTo.Server)]` with `InvokePermission = RpcInvokePermission.Everyone` when clients need to call server methods without owning the object.
- Prefer `NetworkVariable` for persistent state late-joiners need; prefer RPC for transient events.
- Use `RpcDelivery.Unreliable` for high-frequency, low-importance updates (position, rotation) to reduce bandwidth.
- Call `CheckDirtyState()` once after batching all modifications to a `NetworkList`, not after each individual change.

---

## Anti-patterns

- **Network logic in `Start` or `Awake`** — `OnNetworkSpawn` has not fired yet; `IsOwner`, `IsServer`, and `NetworkVariable` access are unreliable.
- **Writing to a `NetworkVariable` before the object is spawned** — produces a warning and the write is silently dropped. Only write after `IsSpawned` is true.
- **Using `string` in `NetworkVariable`** — immutable C# strings cause a GC allocation on every network update. Use `FixedString` types.
- **Nesting `NetworkVariable` inside a `NetworkVariable`** — NGO code generation doesn't support this; results in serialization errors.
- **Initializing `NetworkList` at field declaration** — `new NetworkList<T>()` at the field level creates a memory leak because `Dispose` is never called. Initialize in `Awake` instead.
- **Missing `IsServer` / `IsOwner` guard** — running authoritative logic on all clients causes duplicate state mutations and desyncs.
- **Forgetting to call `base` in lifecycle overrides** — `NetworkTransform`, `NetworkAnimator`, and other built-in components rely on base implementations; skipping them breaks synchronization silently.
- **Subscribing to `OnValueChanged` in `Start`** — subscription may run before `OnNetworkSpawn` on dynamically spawned objects; always subscribe in `OnNetworkSpawn`.
- **Spawning objects on the client** — `Spawn()` must be called on the server; calling it on a client throws an exception.
- **Unregistered network prefabs** — any prefab not listed in `NetworkManager.NetworkPrefabs` cannot be spawned over the network; add all prefabs before entering play mode.
