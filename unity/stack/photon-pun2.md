---
version: 1.0.0
---

# Photon PUN 2

> **Scope**: Photon Unity Networking 2 — room-based multiplayer networking for Unity using Photon Cloud, covering networked object synchronization via PhotonView, RPC communication, state serialization with IPunObservable, matchmaking, custom room/player properties, and ownership management.
> **Load when**: implementing multiplayer features with PUN 2, creating networked prefabs with PhotonView, writing or receiving RPCs, managing room creation and matchmaking, synchronizing player state with IPunObservable, handling ownership transfer, debugging Photon connection or room issues.

---

## Core Concepts

**PUN 2 is in LTS (maintenance) mode.** New projects should evaluate Photon Fusion (state sync) or Quantum (deterministic ECS) instead. PUN 2 receives only bug fixes and Unity compatibility updates (latest: v2.48 for Unity 6).

**Architecture layers:**
- **High-level**: Unity-specific — networked objects, RPCs, PhotonView, MonoBehaviourPun
- **Mid-level**: Realtime/LoadBalancing API — matchmaking, room management, events
- **Low-level**: Serialization and Photon protocol DLLs (rarely touched directly)

**Key terms:**

| Term | Meaning |
|------|---------|
| `PhotonView` | Component that identifies a networked object and tracks its owner |
| `Master Client` | One designated client per room — authoritative for scene loading and game events; migrates automatically on disconnect |
| `Room` | An isolated session with up to N players; the unit of matchmaking |
| `Owner` | The client responsible for writing state updates for a PhotonView |
| `RPC` | Remote Procedure Call — invokes a method on one or more remote clients |
| `IPunObservable` | Interface for continuous state sync; called ~10x/sec by PhotonView |
| `RaiseEvent` | Low-level custom event system not tied to GameObjects |

**Photon Cloud topology:** client → Name Server → Master Server (lobby, matchmaking) → Game Server (room). All traffic is client-server, not peer-to-peer.

---

## API / Interface

### PhotonNetwork — static connection

```csharp
PhotonNetwork.ConnectUsingSettings();                // connect using PhotonServerSettings asset
PhotonNetwork.Disconnect();                          // leave server
PhotonNetwork.OfflineMode = true;                    // local testing without server
PhotonNetwork.GameVersion = "1.0";                   // set before Connect; separates player pools
PhotonNetwork.AutomaticallySyncScene = true;         // set before Connect; enables LoadLevel sync
```

### PhotonNetwork — matchmaking

```csharp
PhotonNetwork.JoinRoom("MyRoom");
PhotonNetwork.JoinRandomRoom();
PhotonNetwork.JoinRandomRoom(filterProps, 0);        // filter by custom properties
PhotonNetwork.CreateRoom(null, roomOptions);         // null = server-assigned name
PhotonNetwork.JoinOrCreateRoom(name, options, TypedLobby.Default);
PhotonNetwork.LeaveRoom();
```

### PhotonNetwork — gameplay

```csharp
PhotonNetwork.Instantiate("Prefabs/Player", pos, rot);           // prefab must be in Resources/
PhotonNetwork.InstantiateSceneObject("Prefabs/Pickup", pos, rot);// owned by master client
PhotonNetwork.Destroy(gameObject);                               // removes networked object everywhere
PhotonNetwork.LoadLevel("GameScene");                            // syncs scene load across all clients
```

### PhotonNetwork — properties and state

```csharp
PhotonNetwork.IsMasterClient          // bool
PhotonNetwork.IsConnected             // bool
PhotonNetwork.InRoom                  // bool
PhotonNetwork.LocalPlayer             // Player reference
PhotonNetwork.CurrentRoom             // Room reference
PhotonNetwork.Time                    // double — synchronized timestamp, use instead of Time.time
PhotonNetwork.PlayerList              // Player[] in current room
```

### PhotonView

```csharp
photonView.IsMine                     // true if owned by local player
photonView.Owner                      // Player who owns this view
photonView.ViewID                     // int identifier
photonView.RPC(nameof(Method), RpcTarget.All, param1, param2);
photonView.RequestOwnership();        // request ownership (for Request/Takeover modes)
photonView.TransferOwnership(player); // explicitly hand off ownership
```

### Base classes

| Class | Use case |
|-------|----------|
| `MonoBehaviourPunCallbacks` | Inherit to receive callbacks; auto-registers and unregisters with Photon |
| `MonoBehaviourPun` | Inherit when only the `photonView` property is needed, without callbacks |

### Callbacks (override in MonoBehaviourPunCallbacks)

```csharp
// Connection
public override void OnConnectedToMaster() { }           // ready for matchmaking
public override void OnDisconnected(DisconnectCause c) { }

// Matchmaking
public override void OnJoinedRoom() { }
public override void OnLeftRoom() { }
public override void OnJoinRandomRoomFailed(short code, string msg) { }
public override void OnJoinRoomFailed(short code, string msg) { }
public override void OnCreateRoomFailed(short code, string msg) { }

// Room events
public override void OnPlayerEnteredRoom(Player other) { }
public override void OnPlayerLeftRoom(Player other) { }
public override void OnMasterClientSwitched(Player newMaster) { }

// Properties
public override void OnRoomPropertiesUpdate(Hashtable changed) { }
public override void OnPlayerPropertiesUpdate(Player player, Hashtable changed) { }
```

### RpcTarget values

| Value | Delivery |
|-------|----------|
| `RpcTarget.All` | All clients instantly (including sender) |
| `RpcTarget.Others` | All except sender |
| `RpcTarget.MasterClient` | Master only |
| `RpcTarget.AllViaServer` | All, routed through server (ordered) |
| `RpcTarget.AllBuffered` | All + cached for future joiners |
| `RpcTarget.AllBufferedViaServer` | Ordered + cached for future joiners |

Use `AllBuffered` for state changes that late joiners must see (damage, item pickups, game-start events).

### IPunObservable

Implement and add the script to PhotonView's **Observed Components** list. Called ~10x/sec.

```csharp
void IPunObservable.OnPhotonSerializeView(PhotonStream stream, PhotonMessageInfo info)
{
    if (stream.IsWriting)          // this client owns the object → send
    {
        stream.SendNext(health);
        stream.SendNext(isFiring);
    }
    else                           // remote instance → receive
    {
        health    = (float)stream.ReceiveNext();
        isFiring  = (bool)stream.ReceiveNext();
    }
}
```

**Order of `SendNext` / `ReceiveNext` calls must be identical** — the stream is a sequential queue.

### Built-in sync components (add to Observed Components)

| Component | Syncs |
|-----------|-------|
| `PhotonTransformView` | Position, rotation, scale with interpolation |
| `PhotonAnimatorView` | Animator parameters (Discrete: 10/sec, Continuous: per-frame) |
| `PhotonRigidbodyView` | Rigidbody velocity / angular velocity |

### Custom properties

```csharp
// Room properties
PhotonNetwork.CurrentRoom.SetCustomProperties(new Hashtable { { "map", "forest" } });

// Player properties
PhotonNetwork.LocalPlayer.SetCustomProperties(new Hashtable { { "score", 42 } });

// Read
object val = PhotonNetwork.CurrentRoom.CustomProperties["map"];
```

### Ownership transfer modes (PhotonView.OwnershipTransfer)

| Mode | Behaviour |
|------|-----------|
| `Fixed` (default) | No transfer; scene objects → master, player objects → creator |
| `Request` | Two-step: `RequestOwnership()` triggers `OnOwnershipRequest`; current owner calls `TransferOwnership()` |
| `Takeover` | `RequestOwnership()` auto-accepts; current owner receives `OnOwnershipTransfered` |

---

## Patterns & Examples

### Connect → matchmake → start game

```csharp
public class GameLauncher : MonoBehaviourPunCallbacks
{
    void Start()
    {
        PhotonNetwork.AutomaticallySyncScene = true;
        PhotonNetwork.ConnectUsingSettings();
    }

    public override void OnConnectedToMaster()
        => PhotonNetwork.JoinRandomRoom();

    public override void OnJoinRandomRoomFailed(short code, string msg)
        => PhotonNetwork.CreateRoom(null, new RoomOptions { MaxPlayers = 4 });

    public override void OnJoinedRoom()
    {
        if (PhotonNetwork.IsMasterClient)
            PhotonNetwork.LoadLevel("Arena");
    }
}
```

### Ownership guard (place at top of Update / input handlers)

```csharp
void Update()
{
    if (!photonView.IsMine) return;
    // local-only input and logic here
}
```

### RPC — use nameof() to avoid string literals

```csharp
// Invoke on all clients, cached for late joiners
photonView.RPC(nameof(ApplyDamage), RpcTarget.AllBuffered, 25f);

[PunRPC]
void ApplyDamage(float amount, PhotonMessageInfo info)
{
    health -= amount;
    Debug.Log($"Damage from {info.Sender.NickName}");
}
```

### Room with custom properties for matchmaking

```csharp
const string MAP  = "map";
const string MODE = "gm";

var opts = new RoomOptions
{
    MaxPlayers = 8,
    CustomRoomProperties         = new Hashtable { { MAP, "desert" }, { MODE, "tdm" } },
    CustomRoomPropertiesForLobby = new[] { MAP, MODE }      // expose for lobby filtering
};
PhotonNetwork.CreateRoom(null, opts);

// Filter on join:
PhotonNetwork.JoinRandomRoom(new Hashtable { { MODE, "tdm" } }, 0);
```

### Network-synchronized projectile using PhotonNetwork.Time

```csharp
// On local spawn:
photonView.RPC(nameof(SpawnProjectile), RpcTarget.AllBuffered,
    transform.position, transform.forward, PhotonNetwork.Time);

[PunRPC]
void SpawnProjectile(Vector3 origin, Vector3 dir, double spawnTime)
{
    float elapsed = (float)(PhotonNetwork.Time - spawnTime);
    transform.position = origin + dir * speed * elapsed;   // compensate latency
}
```

### Player persistence across scene loads

```csharp
void Awake()
{
    if (photonView.IsMine)
        DontDestroyOnLoad(gameObject);
}
```

### Ownership transfer (Takeover)

```csharp
// On PhotonView: set OwnershipTransfer = Takeover in Inspector or:
// photonView.OwnershipTransfer = OwnershipOption.Takeover;

// Any client picks up the object:
photonView.RequestOwnership();

// Callback on previous owner:
public override void OnOwnershipTransfered(PhotonView view, Player prev)
    => Debug.Log($"Ownership moved to {view.Owner.NickName}");
```

---

## Configuration

### PhotonServerSettings asset

| Field | Notes |
|-------|-------|
| `AppId Realtime` | App ID from Photon Dashboard |
| `App Version` | Separates player pools (include build version) |
| `Fixed Region` | Pin to `"us"`, `"eu"`, etc.; empty = auto region selection |
| `Network Logging` | `Error` in production; `Full` when debugging connectivity |
| `Protocol` | Default UDP; use WebSocket for WebGL builds |

### RoomOptions reference

| Field | Type | Notes |
|-------|------|-------|
| `MaxPlayers` | `byte` | 0 = unlimited |
| `IsVisible` | `bool` | Visible in lobby room list |
| `IsOpen` | `bool` | Accepts new joiners |
| `CleanupCacheOnLeave` | `bool` | Destroy player's objects on disconnect (default true) |
| `CustomRoomProperties` | `Hashtable` | Initial room data |
| `CustomRoomPropertiesForLobby` | `string[]` | Keys exposed for lobby filtering — keep minimal |

---

## Best Practices

- Inherit from `MonoBehaviourPunCallbacks` (not raw `MonoBehaviour`) to receive all Photon callbacks automatically.
- Guard all local-only code with `if (!photonView.IsMine) return;` as the first line in `Update()` and input handlers.
- Use `nameof()` in all RPC calls: `photonView.RPC(nameof(MyMethod), ...)` — enables IDE find-usages and refactor safety.
- Set `PhotonNetwork.AutomaticallySyncScene = true` before `ConnectUsingSettings()` when using `PhotonNetwork.LoadLevel`.
- Use `PhotonNetwork.LoadLevel` (not `SceneManager.LoadScene`) for synchronized scene transitions; only master client should call it.
- Place networked prefabs in a `Resources/` subfolder; the path passed to `Instantiate` is relative to `Resources/`.
- Prefer `RpcTarget.AllBuffered` for state-changing events (damage, pickups) that late-joining clients must receive.
- Use `PhotonNetwork.InstantiateSceneObject` for shared environment objects (level items, spawners) — they are owned by master client and survive player disconnects.
- Use `PhotonNetwork.Time` (not `Time.time`) for any cross-client timing (projectile spawn, countdown timers).
- Keep `CustomRoomPropertiesForLobby` to the minimum needed for matchmaking — every extra key adds lobby traffic.
- Use `Takeover` ownership mode for physics props players can pick up; use `Request` when explicit owner approval is required.
- Enable `PhotonNetwork.OfflineMode` in level-preview and unit-test scenes to avoid server dependency.

---

## Anti-patterns

- **String literals in RPC calls** — `photonView.RPC("MyMethod", ...)` silently breaks on rename. Always use `nameof()`.
- **Missing `IsMine` guard** — forgetting to check `photonView.IsMine` runs input and physics logic on every remote copy, causing duplicate actions.
- **PhotonView on DontDestroyOnLoad singletons with a fixed ViewID** — collides with room-instantiated objects. Either create the PhotonView at runtime (no fixed ID) or skip networking for singletons that don't need it.
- **Using `SceneManager.LoadScene` in multiplayer** — only the local client transitions; use `PhotonNetwork.LoadLevel` from master client instead.
- **Calling `PhotonNetwork.Destroy(childGameObject)`** — destroys the root parent, not the child. Use an RPC to remove child objects selectively.
- **Exposing many keys in `CustomRoomPropertiesForLobby`** — bloats lobby traffic for every client; expose only matchmaking-filter keys.
- **Mismatched `SendNext` / `ReceiveNext` order in `IPunObservable`** — the stream is a sequential queue; any mismatch silently corrupts remote state.
- **Forgetting to cast `stream.ReceiveNext()`** — returns `object`; always cast: `health = (float)stream.ReceiveNext()`.
- **Mobile background disconnect** — Android/iOS background pauses the Photon message loop; subscribe to `Application.focusChanged` and call `PhotonNetwork.Reconnect()` or reconnect flow on resume.
- **Using `PhotonAnimatorView` Discrete mode for fast characters** — 10 updates/sec causes visible hitching; use Continuous for smooth animation replay.
- **Storing ViewIDs outside Photon callbacks** — ViewIDs can be reassigned; use `PhotonView.Find(id)` only during callback scope, or hold the `PhotonView` component reference directly.
