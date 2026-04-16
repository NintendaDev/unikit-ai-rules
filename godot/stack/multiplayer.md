---
version: 1.0.0
---

# Godot Multiplayer

> **Scope**: Godot 4 built-in multiplayer system — MultiplayerAPI, MultiplayerSynchronizer, MultiplayerSpawner, RPC annotation system, authority model, peer management, and scene replication patterns for networked games.
> **Load when**: implementing multiplayer networking, setting up server/client connections, writing or reviewing RPC calls, configuring MultiplayerSpawner or MultiplayerSynchronizer, managing multiplayer authority, syncing player state across peers, handling peer connections and disconnections, debugging replication issues.

---

## Core Concepts

- **Peer ID** — every participant has a unique integer ID. Server is always `1`. Clients receive random positive integers at connection time. Never assume sequential IDs.
- **MultiplayerAPI** — accessed via the `multiplayer` property on any node. Manages peer state, RPC routing, and connection lifecycle. The default implementation is `SceneMultiplayer`.
- **Authority** — designates which peer "owns" a node and can send state updates for it. Defaults to the server (peer `1`). Check with `node.is_multiplayer_authority()` before processing local input.
- **Transport layer** — the underlying `MultiplayerPeer` implementation handles actual packet delivery. `ENetMultiplayerPeer` is the default for most games.

## Network Setup

**Server:**
```gdscript
var peer := ENetMultiplayerPeer.new()
peer.create_server(PORT, MAX_CLIENTS)
multiplayer.multiplayer_peer = peer
```

**Client:**
```gdscript
var peer := ENetMultiplayerPeer.new()
peer.create_client(SERVER_IP, PORT)
multiplayer.multiplayer_peer = peer
```

**Connection signals** — connect in the autoload that manages the session:

| Signal | Trigger | Typical use |
|--------|---------|-------------|
| `peer_connected` | New peer joined | Track arrivals, spawn player |
| `peer_disconnected` | Peer left | Remove player node, clean up data |
| `connected_to_server` | Client connected | Begin lobby / request spawn |
| `connection_failed` | Client failed to connect | Show error, retry |
| `server_disconnected` | Server closed | Return to main menu |

**Transport options:**
- `ENetMultiplayerPeer` — UDP-based, full IPv6 support. Default choice.
- `WebRTCMultiplayerPeer` — browser-friendly peer-to-peer.
- `WebSocketMultiplayerPeer` — WebSocket transport for HTML5 exports.

**Platform notes:**
- Android: enable `INTERNET` permission in export preset.
- LAN play: use internal IP `192.168.x.x`.
- Internet play: forward the UDP port; provide public IP to clients.

## Authority System

```gdscript
# Assign authority to a specific peer
node.set_multiplayer_authority(peer_id)

# Guard local logic — skip if not the authority
if not is_multiplayer_authority():
    return

# Read who currently owns this node
var owner_id := get_multiplayer_authority()
```

**Rules:**
- Set authority in `_enter_tree()` or in the `spawn_function` callback of a `MultiplayerSpawner` — **not** in `_ready()`. Changing authority after `_ready()` causes timing errors (see Anti-patterns).
- Authority changes must happen **simultaneously on every peer**. A peer whose authority state is out of sync will silently ignore RPCs.
- Child nodes inherit authority from their parent unless explicitly overridden.
- **Recommended player pattern**: keep `CharacterBody` authority on the server; give authority over a dedicated `InputSync` child node to the owning client. This isolates controls from authoritative game logic.

## RPC System

The `@rpc` annotation makes a function callable across peers.

**Syntax:**
```gdscript
@rpc(mode, sync, transfer_mode, transfer_channel)
func my_func(arg: int) -> void:
    pass
```

**Parameters:**

| Param | Options | Default | Meaning |
|-------|---------|---------|---------|
| `mode` | `"authority"`, `"any_peer"` | `"authority"` | Who may invoke this RPC remotely |
| `sync` | `"call_remote"`, `"call_local"` | `"call_remote"` | Whether it also executes on the calling peer |
| `transfer_mode` | `"reliable"`, `"unreliable"`, `"unreliable_ordered"` | `"reliable"` | Delivery guarantee |
| `transfer_channel` | integer | `0` | Independent packet stream; prevents traffic types from blocking each other |

**Transfer mode guidance:**
- `reliable` — critical events: kills, pickups, score changes, chat.
- `unreliable` — high-frequency continuous updates where minor loss is acceptable: position, rotation.
- `unreliable_ordered` — animation states or particle triggers where sequence matters but stale packets can be discarded.

**Invocation:**
```gdscript
my_func.rpc(5)              # broadcast to all peers
my_func.rpc_id(1, 5)        # call specifically on the server
my_func.rpc_id(peer_id, 5)  # call on a specific client

# Inside an RPC — identify the caller
var sender := multiplayer.get_remote_sender_id()
```

**Critical requirements:**
- RPC signature (function name, annotation, and node path) must match exactly on every peer. Mismatches cause silent failures or crashes — there is no compile-time check.
- `@rpc("any_peer")` allows any connected client to invoke the function — always validate input server-side inside any_peer RPCs. Never trust client data blindly.
- Do not use `await` inside RPC functions — RPCs dispatch synchronously; awaiting creates unpredictable state across peers.

## MultiplayerSpawner

Automatically replicates dynamically instantiated nodes across all connected peers when the authority adds them under `spawn_path`.

**Key properties:**

| Property | Type | Purpose |
|----------|------|---------|
| `spawn_path` | `NodePath` | Container where spawned nodes are added on all peers |
| `spawn_limit` | `int` | Max concurrent spawned nodes; `0` = unlimited |
| `spawn_function` | `Callable` | Custom instantiation callback that receives the spawn data argument |

**Auto Spawn List:** scenes added in the editor are automatically replicated whenever the authority instances one under `spawn_path`.

**Custom spawn with data (recommended for players):**
```gdscript
func _ready() -> void:
    spawner.spawn_function = _spawn_player

func _spawn_player(data) -> Node:
    var player := PlayerScene.instantiate()
    player.set_multiplayer_authority(data)  # data = peer_id
    return player

# Authority triggers the spawn (server only):
spawner.spawn(peer_id)
```

**Rules:**
- Only the spawner's authority may call `spawner.spawn()`. Clients must request spawning via an RPC to the server.
- The spawner's authority and the spawned node's authority are independent — configure them separately.
- Use `spawn_limit` in competitive games to prevent spawning abuse.
- Use MultiplayerSpawner to load levels dynamically instead of `change_scene_to_file()` — ensures late joiners receive the level through the normal replication path.

## MultiplayerSynchronizer

Synchronizes specific node properties to peers at a configured interval. Properties are configured in the Replication tab in the editor.

**Replication modes per property:**

| Mode | Behavior | Use for |
|------|----------|---------|
| `Spawn` | Sync once when the node is first spawned | Initial state: max HP, character name, team |
| `Sync` | Periodic sync at `replication_interval` | Continuous state: position, velocity |
| `Watch` | Reliable sync only when the value changes (4.1+) | Infrequent state: health, score, ammo |

**Key configuration:**
```gdscript
# How fast to send updates (seconds; 0 = every frame)
synchronizer.replication_interval = 0.05   # 20 Hz

# Node whose properties are replicated (relative path from synchronizer)
synchronizer.root_path = NodePath("../CharacterBody3D")

# Visibility filter — limit which peers receive this synchronizer's updates
synchronizer.add_visibility_filter(func(peer_id: int) -> bool:
    return _is_in_range(peer_id)
)
```

**Authority:**
- The synchronizer sends data only when it has authority on the current peer. Without authority it is in receive-only mode.
- Set authority on the synchronizer to match the node it replicates: `synchronizer.set_multiplayer_authority(peer_id)`.

**Visibility filters:**
- Apply the same filter to **all synchronizers belonging to the same spawned node**. If one synchronizer is visible and a related one is not, the node will spawn but not move, or move but not spawn — depending on which synchronizer is misconfigured.

**Input isolation pattern:**
```gdscript
# Tree layout:
# Player (authority = server)
# ├── CharacterBody3D
# │   └── MultiplayerSynchronizer  (authority = server, syncs position/velocity)
# └── InputSync  (authority = owning client)
#     └── MultiplayerSynchronizer  (authority = client, syncs input_direction)

# InputSync.gd
@export var input_direction: Vector2 = Vector2.ZERO

func _physics_process(_delta: float) -> void:
    if not is_multiplayer_authority():
        return
    input_direction = Input.get_vector("ui_left", "ui_right", "ui_up", "ui_down")
```

**Synchronized property paths for nested data:**
Use `"nodepath:property:key"` format for properties within child nodes or Resource subproperties.

**Restriction:** synchronized properties must be native types (`bool`, `int`, `float`, `String`, `Vector2`, `Vector3`, etc.). Arbitrary `Object` decoding is disabled by default for security.

## Architecture Patterns

### Server-Authoritative Lobby

```gdscript
# NetworkManager.gd (autoload)
var players: Dictionary = {}  # peer_id → { "name": String }

func _ready() -> void:
    multiplayer.peer_connected.connect(_on_peer_connected)
    multiplayer.peer_disconnected.connect(_on_peer_disconnected)

func _on_peer_disconnected(id: int) -> void:
    players.erase(id)

@rpc("any_peer", "reliable")
func register_player(player_name: String) -> void:
    var id := multiplayer.get_remote_sender_id()
    players[id] = { "name": player_name }

@rpc("authority", "reliable", "call_local")
func start_game() -> void:
    # All peers, including server, enter game scene
    pass
```

### Synchronized Start (wait for all peers)

```gdscript
@rpc("any_peer", "reliable")
func player_loaded() -> void:
    var id := multiplayer.get_remote_sender_id()
    loaded_peers[id] = true
    if loaded_peers.size() == players.size():
        _begin_game.rpc()
```

### Dedicated Server Detection

```gdscript
func _ready() -> void:
    if DisplayServer.get_name() == "headless":
        _start_server()
    else:
        _show_main_menu()
```

### Late-Join Support

Do not use `change_scene_to_file()` for the game level. Spawn the level via a `MultiplayerSpawner` instead — late joiners receive it automatically through the normal replication flow:

```gdscript
# Server spawns the level scene through a spawner
level_spawner.spawn("main_level")
```

## Best Practices

- **Prefer `Watch` mode over `Sync` for infrequent properties** — reduces bandwidth for health, ammo, score; `Sync` floods the network even when nothing changes.
- **Use `transfer_channel` to isolate traffic** — prevents high-frequency position updates from blocking reliable chat or event packets (channel 0 has three internal sub-channels, higher channels are fully independent).
- **Set `force_readable_name = true` on dynamically added nodes** — ensures consistent node paths across peers so RPC routing works correctly.
- **Validate all input server-side** — reject actions that violate game constraints (position beyond proximity, insufficient resources) before applying them.
- **Use Spawner/Synchronizer for standard gameplay** — switch to manual RPC only when you need client-side prediction, rollback networking, or strict anti-cheat. Manual replacement takes significant engineering effort.
- **Use separate synchronizers for different authority contexts** — one for server-owned movement data, one for client-owned input data. Never mix authorities in a single synchronizer.
- **Connect disconnection signals immediately after creating the server/client** — `peer_disconnected` may fire before `_ready()` in some edge cases on fast connections.

## Anti-patterns

- **Setting authority in `_ready()`** — always set it in `_enter_tree()` or in the `spawn_function` callback. Authority set during `_ready()` races with the node becoming networked and causes inconsistent state (tracked issue: godotengine/godot#75067).
- **Using `change_scene_to_file()` / `change_scene_to_packed()` during a multiplayer session** — the new scene is not replicated; late joiners miss it. Use a `MultiplayerSpawner` to load the level instead.
- **Mismatched visibility filters** — applying a filter to one synchronizer but not to a related synchronizer on the same spawned node causes spawn/movement desync: nodes appear but are frozen, or nodes move without ever appearing.
- **Trusting client data without validation** — any peer can invoke `@rpc("any_peer")` functions; always validate the sender's data on the server before applying state changes.
- **Indexing players by join order** — peer IDs are not sequential. Always key player data by peer ID (`Dictionary`), never by a counter or array index.
- **Calling RPC on nodes outside the scene tree** — RPC routing resolves by node path; nodes must be fully inside the tree before any RPC targeting them will dispatch correctly.
- **Synchronized properties using arbitrary Object types** — `Object` decoding is disabled by default. Use native GDScript types only (`int`, `float`, `String`, `Vector3`, `Color`, etc.) for synchronized properties.
