---
version: 1.0.0
---

# Mirror Networking

> **Scope**: Mirror multiplayer networking for Unity — NetworkBehaviour authoring, SyncVar/SyncList synchronization, Commands and RPCs, authority model, object spawning, NetworkManager configuration, transport setup, and interest management.
> **Load when**: implementing multiplayer features with Mirror, authoring NetworkBehaviour scripts, wiring SyncVars or sync collections, writing Commands or ClientRpc calls, managing server/client authority, spawning networked objects, configuring NetworkManager or transport, debugging network synchronization.

---

## Core Architecture

Mirror follows a **server-authoritative model**: the server owns and manages game state; clients request actions via Commands. Never trust raw client input — always validate on the server.

Two server configurations:
- **Dedicated server** — headless process, no local client
- **Host mode** — one client acts as both server and client simultaneously

Inherit from `NetworkBehaviour` instead of `MonoBehaviour` for any script that requires network synchronization.

Runtime context guards:

```csharp
// Always guard logic to the correct side
if (isServer) { /* server-only logic */ }
if (isClient) { /* client-only logic */ }
if (isLocalPlayer) { /* only for the local player object */ }
if (isOwned) { /* client-side authority check */ }
```

Attribute guards (throw a warning if called on the wrong side):

```csharp
[Server]         void LevelUp() {}       // server only, logs warning if client calls
[Client]         void PlayEffect() {}    // client only, logs warning if server calls
[ServerCallback] void OnTrigger() {}     // server only, silent on client (no warning)
[ClientCallback] void OnAnim() {}        // client only, silent on server (no warning)
```

---

## Lifecycle Callbacks

Callback execution order for a spawned NetworkBehaviour:

| Callback | Where fires | When |
|---|---|---|
| `OnStartServer()` | Server | Object spawned / server started |
| `OnStartAuthority()` | Owning client | After `OnStartServer`, before `OnStartClient` |
| `OnStartClient()` | All clients | Object activated on client; SyncVars guaranteed up-to-date |
| `OnStartLocalPlayer()` | Local client only | After `OnStartClient`; activate camera, input here |
| `OnStopLocalPlayer()` | Local client only | Before `OnStopClient`; deactivate camera, input |
| `OnStopClient()` | All clients | Server destroyed the object |
| `OnStopAuthority()` | Owning client | Authority removed |
| `OnStopServer()` | Server | Object unspawned; save persistent state here |

Use `OnStartLocalPlayer()` to enable components that must only exist for the controlling player (camera, input, UI HUD). Use `OnStopServer()` to save game data before the object is removed.

```csharp
public class Player : NetworkBehaviour
{
    public override void OnStartLocalPlayer()
    {
        // Only runs for the client that owns this player object
        GetComponent<PlayerInputHandler>().enabled = true;
        Camera.main.GetComponent<CameraFollow>().SetTarget(transform);
    }

    public override void OnStopServer()
    {
        // Persist player data before object is destroyed on server
        SaveService.Save(netId, health, position);
    }
}
```

---

## Synchronization

### SyncVar

`[SyncVar]` syncs a field **from server to all clients** automatically. Only the server should write to SyncVars.

```csharp
public class Player : NetworkBehaviour
{
    [SyncVar] public int health = 100;
    [SyncVar] public string playerName;

    // Hook fires on ALL clients (including host) when the value changes
    [SyncVar(hook = nameof(OnHealthChanged))]
    public int shieldHealth = 50;

    // Hook signature: void Method(T oldValue, T newValue)
    void OnHealthChanged(int oldVal, int newVal)
    {
        healthBar.SetValue(newVal);
    }

    // Always modify SyncVars on the server
    [Server]
    void TakeDamage(int amount) => health -= amount;
}
```

SyncVar limitations:
- Sync direction is **server → clients only**. To send data from client to server, use `[Command]`.
- Hooks execute on clients only (not on the server, even in host mode for the hook itself — but the field is still set).
- Supports: basic value types, strings, Vector3, Quaternion, NetworkIdentity, GameObject (registered prefabs). Does not support arrays; use SyncList instead.

### Sync Collections

Use sync collections instead of arrays for synchronized lists/sets/dictionaries.

```csharp
public class Player : NetworkBehaviour
{
    // Server populates; clients receive updates automatically
    public readonly SyncList<Item>              inventory  = new SyncList<Item>();
    public readonly SyncDictionary<string, int> stats      = new SyncDictionary<string, int>();
    public readonly SyncHashSet<string>         flags      = new SyncHashSet<string>();

    void Awake()
    {
        // Subscribe to collection change callbacks
        inventory.Callback += OnInventoryChanged;
    }

    void OnInventoryChanged(SyncList<Item>.Operation op, int index, Item item)
    {
        // op: Add / Remove / Set / Insert / Clear
        RefreshInventoryUI();
    }
}
```

### Sync-to-Owner

To restrict SyncVar data to the **owning client only** (inventories, stats, card hands), change "Network Sync Mode" on the NetworkBehaviour from **Observers** to **Owner** in the Inspector. This reduces bandwidth significantly — e.g., 50 clients → 1 message instead of 50.

### Custom Serialization

Override `OnSerialize`/`OnDeserialize` when the auto-generated code is insufficient:

```csharp
public override void OnSerialize(NetworkWriter writer, bool initialState)
{
    base.OnSerialize(writer, initialState);
    writer.WriteInt(customField);
}

public override void OnDeserialize(NetworkReader reader, bool initialState)
{
    base.OnDeserialize(reader, initialState);
    customField = reader.ReadInt();
}
```

---

## Remote Actions (Commands and RPCs)

### [Command] — Client → Server

Called from an owning client; executes on the server. Naming convention: `Cmd` prefix.

```csharp
// Client calls this; server executes it
[Command]
void CmdSpawnProjectile(Vector3 direction)
{
    // Validate input on server!
    if (direction.sqrMagnitude < 0.001f) return;
    
    GameObject proj = Instantiate(projectilePrefab, firePoint.position, Quaternion.identity);
    NetworkServer.Spawn(proj, connectionToClient);
}
```

By default, Commands require the caller to have authority over the object. To allow any client to invoke (e.g., interacting with a world object), set `requiresAuthority = false` and identify the sender via the optional parameter:

```csharp
[Command(requiresAuthority = false)]
void CmdInteract(NetworkConnectionToClient sender = null)
{
    // sender.identity is the player who called this
    Debug.Log($"Interacted by: {sender?.identity?.name}");
}
```

### [ClientRpc] — Server → All Clients

Called on the server; executes on all observing clients. Naming convention: `Rpc` prefix.

```csharp
// Server calls this; all clients that observe this object execute it
[ClientRpc]
void RpcPlayExplosion(Vector3 pos)
{
    Instantiate(explosionFX, pos, Quaternion.identity);
}

// Exclude the owner client (e.g., avoid playing feedback twice)
[ClientRpc(includeOwner = false)]
void RpcNotifyOthers(string msg)
{
    Debug.Log($"Others hear: {msg}");
}
```

### [TargetRpc] — Server → Specific Client

Called on the server; executes on one specific client.

```csharp
// Target a specific connection explicitly
[TargetRpc]
void TargetSendSecret(NetworkConnectionToClient target, string secret)
{
    Debug.Log($"Only you see: {secret}");
}

// Omit the connection — implicitly targets the object's owner
[TargetRpc]
void TargetUpdateQuest(QuestData data)
{
    questUI.Refresh(data);
}
```

### RPC parameter restrictions

Parameters must be **Mirror-supported types**: value types, strings, `Vector3`/`Quaternion`, `NetworkIdentity`, `GameObject` (registered prefab), or custom types with a registered reader/writer. **Not supported**: `Transform`, component references, script instances, sub-component types.

---

## Authority & Ownership

Server authority is the default for all objects. Player objects are the exception — they are owned by the spawning client.

```csharp
// Spawn a non-player object with client ownership
GameObject go = Instantiate(prefab);
NetworkServer.Spawn(go, connectionToClient);  // connectionToClient = owning connection

// Transfer authority after spawn
identity.AssignClientAuthority(conn);         // grant authority to a specific client
identity.RemoveClientAuthority();             // revoke; server regains authority

// For player objects, use ReplacePlayerForConnection instead of AssignClientAuthority
```

Checking authority at runtime:

| Property | Available on | True when |
|---|---|---|
| `isServer` | Both | Running on server (or host server side) |
| `isClient` | Both | Running on a client (or host client side) |
| `isLocalPlayer` | Client | This is the local player's object |
| `isOwned` | Client | This client has authority over the object |
| `hasAuthority` | Both | Same as `isOwned` on clients; `isServer` on server |

Authority callbacks (override in NetworkBehaviour):
- `OnStartAuthority()` — called when this client gains authority
- `OnStopAuthority()` — called when this client loses authority

---

## Spawning

Only the **server** spawns networked objects. Never use plain `Instantiate()` for objects that must exist on all clients.

```csharp
// Server spawns for all clients; no explicit owner
GameObject go = Instantiate(prefab, position, rotation);
NetworkServer.Spawn(go);

// Spawn with owner (client gets authority)
NetworkServer.Spawn(go, connectionToClient);

// Despawn (destroy across all clients)
NetworkServer.Destroy(go);  // or NetworkServer.UnSpawn(go) to keep it locally
```

All spawnable prefabs must be registered:
- Via the "Registered Spawnable Prefabs" list on NetworkManager in the Inspector, or
- Via code: `NetworkClient.RegisterPrefab(prefab)`

Spawn flow:
1. Client calls `[Command]`
2. Server instantiates via `Instantiate()`
3. Server calls `NetworkServer.Spawn()` — registers with network, syncs to all clients
4. SyncVars/collections are sent to new observers on spawn

---

## NetworkManager

NetworkManager is a **singleton** — one per scene. Do not attach it to GameObjects that also have `NetworkIdentity`.

Key configuration in Inspector:
- **Network Address** — server address (or FQDN like `game.example.com`)
- **Transport** — the low-level protocol component (default: KCP/UDP)
- **Player Prefab** — spawned automatically for each connecting client
- **Offline Scene / Online Scene** — auto-loaded on disconnect / connect
- **Registered Spawnable Prefabs** — all prefabs that can be network-spawned

Starting a session:

```csharp
NetworkManager.singleton.StartServer();   // dedicated server
NetworkManager.singleton.StartClient();   // client only
NetworkManager.singleton.StartHost();     // server + local client
```

Override virtual methods for custom behavior:

```csharp
public class GameNetworkManager : NetworkManager
{
    public override void OnServerAddPlayer(NetworkConnectionToClient conn)
    {
        // Default behavior: spawn player prefab
        base.OnServerAddPlayer(conn);
        // Additional: assign team, send welcome message, etc.
    }

    public override void OnServerDisconnect(NetworkConnectionToClient conn)
    {
        // Custom cleanup before base removes the player object
        CleanupPlayerData(conn.identity);
        base.OnServerDisconnect(conn);
    }

    public override void OnClientConnect()
    {
        base.OnClientConnect();
        // UI update, analytics, etc.
    }
}
```

Scene management:

```csharp
// Transition all clients to a new scene (server only)
NetworkManager.singleton.ServerChangeScene("GameScene");
```

Keep NetworkManager alive across scenes: enable "Don't Destroy On Load" (DDOL). Register all prefabs before the DDOL scene transition to avoid missing prefab errors.

---

## Transport

The transport layer is a **separate component** on the NetworkManager object, providing protocol flexibility.

| Transport | Protocol | Use case |
|---|---|---|
| `KcpTransport` | UDP | Default; low latency, good reliability |
| `TelepathyTransport` | TCP | Reliable, ordered; higher latency |
| `SimpleWebTransport` | WebSocket | WebGL clients |
| `FizzySteamworks` | Steam P2P | Steam-based multiplayer |
| `MultiplexTransport` | Multiple | Host UDP + WebSocket simultaneously |

Swap by replacing the Transport component on the NetworkManager GameObject and assigning it to the `Transport` field.

---

## Interest Management

Interest Management controls which clients **observe** (receive updates for) which objects. Without it, all clients see all objects.

Built-in implementations (attach to the same GameObject as NetworkManager):
- `DistanceInterestManagement` — visibility by distance
- `SpatialHashInterestManagement` — grid-based, better performance at scale
- `SceneInterestManagement` — visibility by scene
- `MatchInterestManagement` — visibility by match/room
- `TeamInterestManagement` — visibility by team

Custom implementation:

```csharp
public class FactionInterestManagement : InterestManagement
{
    [ServerCallback]
    public override bool OnCheckObserver(NetworkIdentity identity, NetworkConnectionToClient newObserver)
    {
        // Return true if newObserver's player can see identity
        var viewer = newObserver.identity?.GetComponent<PlayerFaction>();
        var target = identity.GetComponent<PlayerFaction>();
        return viewer == null || target == null || viewer.faction == target.faction;
    }

    [ServerCallback]
    public override void OnRebuildObservers(NetworkIdentity identity, HashSet<NetworkConnectionToClient> newObservers)
    {
        foreach (var conn in NetworkServer.connections.Values)
        {
            if (OnCheckObserver(identity, conn))
                newObservers.Add(conn);
        }
    }
}
```

---

## Anti-patterns

**Never call `[Command]` from server-side code.** Commands travel client → server. Calling them on the server does nothing and will generate a warning.

**Never send a `[Command]` every frame from `Update`.** This floods the network. Throttle input Commands or use delta compression — only send when the value actually changes.

**Never use `Instantiate()` alone for networked objects.** Always follow with `NetworkServer.Spawn()`, or the object will exist only locally on the server and not be replicated.

**Never write SyncVars from the client.** Only the server should set SyncVar fields. Client-side writes are silently ignored; use `[Command]` to request the server to change state.

**Never attach `NetworkManager` to a `NetworkIdentity` GameObject.** The NetworkManager must be on a standalone object with no NetworkIdentity.

**Never perform physics simulation on clients.** All authoritative physics runs on the server. Clients may have cosmetic simulation only. Configure `Rigidbody.isKinematic = true` on clients and drive movement from synced state.

**Avoid `Destroy()` on networked objects from clients.** Only the server calls `NetworkServer.Destroy()`. Clients cannot destroy server-owned objects.

**Don't pass unsupported types as RPC/Command parameters.** `Transform`, component references, and `MonoBehaviour` subclasses are not serializable by Mirror. Pass `NetworkIdentity`, primitive values, or custom structs with registered serializers.
