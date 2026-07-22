---
version: 1.0.0
---

# Mirage.Godot

> **Scope**: High-level C# networking for Godot 4 — NetworkBehaviour authoring, SyncVar field synchronization, ServerRpc/ClientRpc remote calls, networked object spawning, server/client lifecycle events, and UDP transport configuration.
> **Load when**: implementing multiplayer networking in Godot 4, authoring NetworkBehaviour scripts, synchronizing game state with SyncVar, sending remote procedure calls, spawning networked objects, setting up a NetworkServer or NetworkClient, configuring a host/server/client topology, debugging connection or synchronization issues, choosing between authority models.

---

## Installation

Mirage.Godot uses Mono.Cecil post-compilation IL weaving via `Mirage.CodeGen.exe` to generate RPC dispatch and SyncVar plumbing. The code generator **must run after every build and before every export**.

### Setup steps

```sh
# 1. Clone repo alongside your project (use symlinks on Windows — requires admin)
git clone -c core.symlinks=true git@github.com:James-Frowen/Mirage.Godot.git

# 2. Copy Scripts into your project
cp -r ../Mirage.Godot/src/Mirage.Godot/Scripts ./Mirage.Godot/Scripts

# 3. Build the code generator once
dotnet build src/Mirage.Core/Mirage.CodeGen/Mirage.CodeGen.csproj -c Release
```

### Required `.csproj` configuration

```xml
<PropertyGroup>
  <TargetFramework>net8.0</TargetFramework>
  <EnableDynamicLoading>true</EnableDynamicLoading>
  <AllowUnsafeBlocks>true</AllowUnsafeBlocks>
  <GenerateAssemblyInfo>false</GenerateAssemblyInfo>
</PropertyGroup>

<ItemGroup>
  <ProjectReference Include="..\Mirage.Godot\src\Mirage.Core\Mirage.Logging\Mirage.Logging.csproj" />
  <ProjectReference Include="..\Mirage.Godot\src\Mirage.Core\Mirage.SocketLayer\Mirage.SocketLayer.csproj" />
</ItemGroup>

<!-- Runs codegen after every build (editor iteration) -->
<Target Name="PostBuild" AfterTargets="PostBuildEvent">
  <Exec Command="dotnet build ..\Mirage.Godot\src\Mirage.Core\Mirage.CodeGen\Mirage.CodeGen.csproj -c Release" />
  <Exec Command="..\Mirage.Godot\src\Mirage.Core\Mirage.CodeGen\bin\Release\net8.0\Mirage.CodeGen.exe $(TargetPath) -force" />
  <Error Condition="$(ExitCode) == 1" />
</Target>

<!-- Runs codegen before export ($(TargetPath) is unavailable during Publish) -->
<Target Name="PrePublish" BeforeTargets="Publish">
  <Exec Command="dotnet build ..\Mirage.Godot\Mirage.Core\Mirage.CodeGen\Mirage.CodeGen.csproj -c Release" />
  <Exec Command="..\Mirage.Godot\src\Mirage.Core\Mirage.CodeGen\bin\Release\net8.0\Mirage.CodeGen.exe $(PublishDir)$(TargetFileName) $(TargetDir) -force" />
  <Error Condition="$(ExitCode) == 1" />
</Target>
```

Both targets are **required**. `PostBuild` handles editor iteration; `PrePublish` handles exports where `$(TargetPath)` is unavailable.

---

## Core Concepts

| Component | Role |
|-----------|------|
| `NetworkIdentity` | Root networked node. Every networked scene has exactly one. Carries `NetId`, `Owner`, and all lifecycle events. |
| `NetworkBehaviour` | Base class for networked scripts. Must be in a hierarchy that contains a `NetworkIdentity`. |
| `NetworkServer` | Server-side manager: listens for connections, authenticates players, broadcasts state. |
| `NetworkClient` | Client-side manager: connects to server, receives state, sends RPCs. |
| `ServerObjectManager` | Spawns, destroys, and assigns ownership of networked objects (server only). |
| `ClientObjectManager` | Prefab registry for receiving spawned objects on clients. Register all spawnable prefabs here. |
| `NetworkManager` | Optional convenience node that pre-wires `NetworkServer`, `NetworkClient`, and the object managers. |
| `NetworkPlayer` | Represents a connected peer. Has `Address` and authority-assignment methods. |
| `UdpSocketFactory` | Default UDP transport. Assign to `NetworkServer.SocketFactory`. |

**Key architecture difference from Mirror**: Mirage splits what Mirror's `NetworkManager` did into separate scene components. None are static singletons — add them to the scene and reference via `[Export]`.

---

## NetworkBehaviour Authoring

```csharp
using Godot;
using Mirage;

public partial class Player : NetworkBehaviour
{
    [SyncVar(hook = nameof(OnHealthChanged))]
    private int health = 100;

    [SyncVar]
    private string playerName;

    public override void _Ready()
    {
        // Register lifecycle events in _Ready (or via Godot Inspector)
        Identity.OnStartServer.AddListener(OnStartServer);
        Identity.OnStartClient.AddListener(OnStartClient);
        Identity.OnStartLocalPlayer.AddListener(OnStartLocalPlayer);
        Identity.OnAuthorityChanged.AddListener(OnAuthorityChanged);
        Identity.OnStopClient.AddListener(OnStopClient);
        Identity.OnStopServer.AddListener(OnStopServer);
    }

    private void OnStartServer() { /* initialize server-side state */ }
    private void OnStartClient() { /* initialize visuals */ }
    private void OnStartLocalPlayer() { /* enable camera, input handling */ }
    private void OnAuthorityChanged(bool hasAuthority) { }
    private void OnStopClient() { }
    private void OnStopServer() { }

    private void OnHealthChanged(int oldValue, int newValue)
    {
        // Called on clients when health changes
        UpdateHealthBar(newValue);
    }

    public void ProcessInput()
    {
        if (!this.HasAuthority()) return; // extension method on NetworkBehaviour
        // ...
    }
}
```

### State properties

| Property | Meaning |
|----------|---------|
| `Identity.IsServer` | Running as server and this object is spawned |
| `Identity.IsClient` | Running as client and object was spawned by server |
| `Identity.IsHost` | Host mode — server + client in same process |
| `Identity.IsLocalPlayer` | This is the local player's object |
| `Identity.HasAuthority` | This client has authority over the object |
| `Identity.NetId` | Unique network id assigned at spawn |
| `Identity.Owner` | The `NetworkPlayer` that owns this object (server side) |

Extension methods: `this.IsServer()`, `this.IsClient()`, `this.HasAuthority()`.

### Lifecycle events

All events live on `Identity`. Register in `_Ready()` — events not registered before spawning are missed.

| Event | Fired when |
|-------|-----------|
| `OnStartServer` | Object spawned on server |
| `OnStartClient` | Object spawned on client |
| `OnStartLocalPlayer` | Object is the local player on the owning client |
| `OnAuthorityChanged(bool)` | Authority granted or revoked |
| `OnStopClient` | Object despawned on client |
| `OnStopServer` | Object despawned on server |

Mirror's virtual override pattern (`override void OnStartServer()`) does **not** exist in Mirage — use events only.

---

## SyncVar

Synchronizes a field **server → clients** automatically. Must only be mutated on the server.

```csharp
// Basic sync
[SyncVar]
private int score;

// With 2-argument hook (old value, new value)
[SyncVar(hook = nameof(OnNameChanged))]
private string playerName;

// Initial-only: sent in the spawn message, not on subsequent changes
[SyncVar(initialOnly = true)]
private int playerId;

// Invoke hook on server too (useful in host mode)
[SyncVar(hook = nameof(OnWeaponChanged), invokeHookOnServer = true)]
private string currentWeapon;

// Invoke hook on the owner when sending (useful for client-authority patterns)
[SyncVar(hook = nameof(OnPositionChanged), invokeHookOnOwner = true)]
private Vector3 syncedPosition;

private void OnNameChanged(string oldName, string newName)
{
    // Runs on clients after the new value is set
    UpdateNameLabel(newName);
}
```

**Hook type** (`hookType`): `Automatic` (default, infers from signature), `MethodWith0Arg`, `MethodWith1Arg`, `MethodWith2Arg`.

**Rules:**
- Change SyncVar values **only on the server**. Mutations on clients are silently ignored.
- The hook fires after the value is already updated.
- Use `initialOnly = true` for identity data set once at spawn (reduces ongoing sync overhead).

### SyncList / SyncDictionary / SyncHashSet

Collections that replicate server-side changes to clients. Declare as `readonly` fields.

```csharp
readonly SyncList<int> inventory = new SyncList<int>();
readonly SyncDictionary<string, int> stats = new SyncDictionary<string, int>();
readonly SyncHashSet<string> flags = new SyncHashSet<string>();
```

Mutate only on the server. Clients receive incremental change events.

---

## Remote Calls

### ServerRpc — Client → Server

```csharp
// Default: caller must have authority over the object
[ServerRpc]
private void CmdMove(Vector3 direction)
{
    // Runs on server — validate all input here
    if (direction.Length() > 1) direction = direction.Normalized();
    serverPosition += direction * 5f;
}

// Any client can call (no authority check)
// Mirage auto-fills 'sender' — never set it manually
[ServerRpc(requireAuthority = false)]
private void CmdSendChat(string message, INetworkPlayer sender = null)
{
    GD.Print($"Chat from {sender?.Address}: {message}");
    RpcReceiveChat(message);
}

// Unreliable channel for high-frequency updates
[ServerRpc(channel = Channel.Unreliable)]
private void CmdSyncPosition(Vector3 pos, Quaternion rot) { ... }

// Async return value — client awaits without blocking
[ServerRpc]
private async UniTask<int> CmdRequestScore()
{
    return score; // or async computation
}
```

**Rules:**
- `[ServerRpc]` methods cannot be `static`.
- Validate all input on the server — clients can send arbitrary data.
- Never call reliable ServerRpc every frame. Use `Channel.Unreliable` for position/rotation, or rate-limit.
- Never set the auto-injected `INetworkPlayer sender` parameter manually.

### ClientRpc — Server → Clients

```csharp
// To all observers
[ClientRpc]
private void RpcPlaySound(string soundName) { ... }

// To owner only
[ClientRpc(target = RpcTarget.Owner)]
private void RpcShowDamageIndicator(int damage, Vector3 hitDir) { ... }

// To all observers except owner
[ClientRpc(excludeOwner = true)]
private void RpcPlayHitEffect(Vector3 position) { ... }

// To a specific player
[ClientRpc(target = RpcTarget.Player)]
private void RpcPrivateMessage(NetworkPlayer target, string message) { ... }

// Unreliable for frequent visual updates
[ClientRpc(channel = Channel.Unreliable)]
private void RpcUpdateTransform(Vector3 pos, Quaternion rot) { ... }
```

### Guard attributes

```csharp
[Server]         // throws if not running on server
void SpawnCoin() { ... }

[Server(error = false)]  // no-op silently if not server (Mirror's [ServerCallback])
void MaybeSpawn() { ... }

[Client]         // throws if not running on client
void ShowUI() { ... }

[HasAuthority]   // throws if caller does not have authority
void HandleInput() { ... }

[LocalPlayer]    // throws if not the local player
void EnableCamera() { ... }
```

### Mirror → Mirage attribute mapping

| Mirror | Mirage |
|--------|--------|
| `[Command]` | `[ServerRpc]` |
| `[TargetRpc]` | `[ClientRpc(target = RpcTarget.Player)]` |
| `[ServerCallback]` | `[Server(error = false)]` |
| `[ClientCallback]` | `[Client(error = false)]` |

---

## NetworkServer Setup

```csharp
public partial class GameServer : Node
{
    [Export] public NetworkServer Server;
    [Export] public ServerObjectManager ObjectManager;
    [Export] public UdpSocketFactory SocketFactory;

    public override void _Ready()
    {
        Server.SocketFactory = SocketFactory;
        Server.ObjectManager = ObjectManager;
        Server.DisconnectOnException = true;

        Server.Started.AddListener(OnServerStarted);
        Server.Connected += OnPlayerConnected;
        Server.Authenticated += OnPlayerAuthenticated;
        Server.Disconnected += OnPlayerDisconnected;
    }

    public void StartDedicatedServer() => Server.StartServer();
    public void StartHost(NetworkClient localClient) => Server.StartServer(localClient);

    private void OnPlayerAuthenticated(NetworkPlayer player)
    {
        // Spawn objects for the player only after authentication
        SpawnPlayer(player);
    }
}
```

---

## Spawning Objects

```csharp
// Spawn a player character (assigns ownership)
private void SpawnPlayer(NetworkPlayer player, PackedScene prefab)
{
    var node = prefab.Instantiate();
    GetTree().Root.AddChild(node);                     // add to tree FIRST

    if (node is Node3D n) n.GlobalPosition = GetSpawnPoint();

    var identity = NodeHelper.GetNetworkIdentity(node, includeChild: true);
    identity.PrefabHash = PrefabHashHelper.GetPrefabHash(prefab); // required

    ObjectManager.AddCharacter(player, identity);      // assigns owner + spawns
}

// Spawn without owner (enemies, pickups)
private void SpawnEnemy(PackedScene prefab, Vector3 position)
{
    var node = prefab.Instantiate();
    GetTree().Root.AddChild(node);
    if (node is Node3D n) n.GlobalPosition = position;

    var identity = NodeHelper.GetNetworkIdentity(node, includeChild: true);
    identity.PrefabHash = PrefabHashHelper.GetPrefabHash(prefab);

    ObjectManager.Spawn(identity);
}

// Spawn with explicit owner
ObjectManager.Spawn(identity, owner: player);

// Destroy a networked object
ObjectManager.Destroy(identity, destroyServerObject: true);

// Authority management
identity.AssignClientAuthority(player);
identity.RemoveClientAuthority();
```

**Rules:**
- Add the node to the scene tree **before** calling `Spawn()`.
- Always set `identity.PrefabHash` before spawning. Clients need it to instantiate the object.
- Register spawnable prefabs in `ClientObjectManager` so clients can receive them.
- Spawn only after `Server.Authenticated` fires for a player, not on `Server.Connected`.

---

## NetworkManager (Convenience Wrapper)

```csharp
public partial class GameNetworkManager : NetworkManager
{
    [Export] public PackedScene PlayerPrefab;

    public override void _Ready()
    {
        base._Ready();
        Server.Authenticated += OnServerAuthenticated;
        Client.Authenticated.AddListener(OnClientAuthenticated);
    }

    private void OnServerAuthenticated(NetworkPlayer player)
    {
        var node = PlayerPrefab.Instantiate();
        GetTree().Root.AddChild(node);
        var identity = NodeHelper.GetNetworkIdentity(node, includeChild: true);
        identity.PrefabHash = PrefabHashHelper.GetPrefabHash(PlayerPrefab);
        ServerObjectManager.AddCharacter(player, identity);
    }
}
```

Use `StartServer()`, `StartClient()`, or `StartHost()` on the manager node.

---

## Bit Packing (Bandwidth Optimization)

Reduce bits used for SyncVar fields and RPC parameters:

| Attribute | Use case |
|-----------|---------|
| `[BitCount(N)]` | Integer: fixed N-bit encoding |
| `[BitCountFromRange(min, max)]` | Integer: auto-calculate required bits from range |
| `[ZigZagEncode]` | Signed integers that cluster near zero |
| `[VarInt]` | Dynamic-size integer with 3 configurable ranges |
| `[VarIntBlocks]` | Dynamic-size integer for wider ranges (block-based) |
| `[FloatPack]` | Compress float to fewer bits |
| `[VectorPack]` | Compress Vector2 / Vector3 |
| `[QuaternionPack]` | Compress Quaternion rotations |

```csharp
[SyncVar]
[BitCountFromRange(0, 100)]   // 7 bits instead of 32
private int health;

[ServerRpc(channel = Channel.Unreliable)]
private void CmdSyncRotation([QuaternionPack] Quaternion rotation) { ... }
```

---

## Best Practices

- **Validate all ServerRpc input on the server** — clients can send arbitrary data; trust nothing from the network.
- **Use `Channel.Unreliable` for high-frequency updates** (position, rotation). Reliable RPCs called every frame cause bandwidth spikes and head-of-line blocking.
- **Register lifecycle events in `_Ready()`**, before the object is spawned. Events registered after spawning are never called.
- **Spawn after `Server.Authenticated`**, not `Server.Connected`. Authentication confirms the peer is trusted.
- **Use `initialOnly = true`** for fields set once at spawn (player ID, team) to reduce ongoing sync overhead.
- **Apply bit packing attributes** to frequently synced SyncVars (positions, small integers) to reduce bandwidth.
- **Prefer server authority** for all game-affecting state (health, scores, position). Use client authority only when you fully trust the client and the data is non-competitive.
- **Use `NetworkManager` for simple games** and manual `NetworkServer`/`NetworkClient` wiring for full control.

---

## Anti-patterns

- **Mutating SyncVars from clients** — changes are silently ignored on clients; route changes through `[ServerRpc]`.
- **Treating NetworkServer/Client as static singletons** — Mirage components are scene nodes, not global statics. Access via `[Export]` fields or `Identity.Server` / `Identity.Client`.
- **Calling reliable ServerRpc every frame** — use `Channel.Unreliable` or rate-limit to avoid bandwidth saturation.
- **Manually setting the `sender` parameter** in `requireAuthority = false` ServerRpc — Mirage injects it; setting it manually causes undefined behavior.
- **Registering lifecycle events after spawn** — they will never fire. Always register in `_Ready()`.
- **Forgetting `identity.PrefabHash` before `Spawn()`** — clients receive the spawn message but cannot instantiate the node, causing invisible objects on clients.
- **Adding a node to the scene after calling `Spawn()`** — the node must already be in the tree when `Spawn()` is called.
- **Using virtual override pattern for lifecycle** (`override void OnStartServer()`) — Mirage uses events, not overrides. Subscribe to `Identity.OnStartServer` instead.
