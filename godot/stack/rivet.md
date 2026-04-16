---
version: 1.0.0
---

# Rivet / OpenGameBackend

> **Scope**: Integration of the Rivet/OpenGameBackend multiplayer backend into Godot 4 — plugin setup, matchmaker and lobby flow, game server lifecycle, actor-based backend design, and GDScript client patterns.
> **Load when**: adding multiplayer backend to a Godot 4 game, using Rivet or OpenGameBackend plugin, setting up matchmaking or lobbies, configuring game servers with autoscaling, integrating backend actors via WebSocket, deploying a server-authoritative game.

---

## Platform Status & Context

Rivet (rivet.gg) was originally a dedicated game backend platform. The company pivoted to a general stateful serverless/actor platform (rivet.dev). Game-backend functionality continues under the **OpenGameBackend** project:

- **Plugin repo**: `github.com/OpenGameBackend/plugin-godot` (v2.3.x, Apache-2.0)
- **Godot Asset Library**: search "Rivet" — official page, asset id 1881
- **Current rivet.dev**: stateful actor platform (AI agents, collaborative apps) — usable as a game room backend via WebSocket actors
- **Original game-backend docs** (rivet.gg/docs/godot) are offline. Use plugin source and examples from `github.com/rivet-dev/examples` (archived Dec 2024).

---

## Installation

**Recommended (Asset Library)**
Open *AssetLib* tab in Godot, search "Rivet", install plugin, enable via *Project → Project Settings → Plugins*.

**Manual**
```
1. Download from: https://releases.rivet.gg/plugin-godot/{VERSION}/rivet-plugin-godot.zip
2. Extract addons/rivet → your-project/addons/rivet
3. Enable in Project → Project Settings → Plugins
```

**gd-plug**
```gdscript
plug("rivet/plugin-godot")
```

**Build from source** — requires Git LFS, Rust, Deno:
```bash
deno run -A scripts/build_dev.ts
```

---

## Architecture

```
Godot Client  ──→  Rivet Plugin (GDExtension + GDScript)
                        │
             ┌──────────┴──────────┐
             │                     │
         Local dev              Rivet Cloud
         (port 6420)            (rivet.gg)
             │                     │
         Backend TS            Backend TS
         Modules               Modules (deployed)
```

Key components:
- **RivetPluginBridge** — editor singleton; handles `bootstrap()`, `sign_in()`, `sign_out()`; emits `bootstrapped` signal
- **RivetGlobal** — runtime singleton; exposes `backend_endpoint`, `env_type` (LOCAL/REMOTE), `is_authenticated`, lifecycle signals
- **Auto-generated SDK** — `Backend.*` GDScript classes generated from TypeScript backend module definitions; regenerated on every `unikit-ai backend sdk` run
- **GDExtension (Rust)** — powers toolchain operations; required for deploy/dev commands

---

## Classic Matchmaker & Lobby API

Used with the game-backend version of Rivet (OpenGameBackend plugin).

### Client: Find a Lobby and Connect

```gdscript
# Always await — all Rivet API calls are async
func join_game() -> void:
    var response = await Rivet.matchmaker.lobbies.find({
        "game_modes": ["default"]
    })
    
    if response.result != OK:
        push_error("Matchmaker error: %s" % response.error)
        return
    
    # Extract connection info from response
    var player_token: String = response.body.player.token
    var host: String = response.body.ports.default.host
    var port: int = response.body.ports.default.port
    
    # Set token BEFORE connecting — server uses it to validate the player
    RivetHelper.set_player_token(player_token)
    
    var peer := ENetMultiplayerPeer.new()
    peer.create_client(host, port)
    multiplayer.multiplayer_peer = peer
```

### Server: Initialize and Signal Ready

```gdscript
func _ready() -> void:
    # RivetHelper.start_server fires when Rivet provisions the server
    RivetHelper.start_server.connect(_on_start_server)

func _on_start_server(port: int) -> void:
    # RivetHelper.setup_multiplayer() replaces manual ENetMultiplayerPeer setup
    RivetHelper.setup_multiplayer()
    
    # Tell matchmaker this lobby is ready to accept players
    Rivet.matchmaker.lobbies.ready()

# Fired when a peer connects — validate their token
func _on_peer_connected(peer_id: int) -> void:
    # Rivet automatically validates tokens registered via set_player_token()
    pass
```

### Lobby Response Shape

```gdscript
# response.body structure from matchmaker.lobbies.find():
# {
#   "lobby": { "lobby_id": "...", "region_id": "...", "game_mode_id": "..." },
#   "player": { "token": "rivet_play_..." },
#   "ports": {
#     "default": { "host": "...", "port": 7777, "is_tls": false }
#   }
# }
```

---

## Modern Actor-Based Approach (Current Rivet / RivetKit)

The current `rivet.dev` exposes Rivet Actors — stateful TypeScript processes that handle WebSocket connections and persist state across requests. Use this when deploying to Rivet Cloud or self-hosting the current Rivet platform.

### Backend: Define a Game Room Actor (TypeScript)

```typescript
// backend/game_room.ts
import { actor } from "rivetkit";

export const gameRoom = actor({
    state: {
        players: [] as Array<{ id: string; name: string; score: number }>,
        gameStarted: false,
    },
    
    // createConnState: called once per new WebSocket connection
    createConnState: (c, params: { authToken: string }) => {
        if (!validateToken(params.authToken)) throw new Error("Invalid token");
        return { userId: getUserId(params.authToken) };
    },
    
    actions: {
        joinGame: (c, player: { id: string; name: string }) => {
            if (c.state.players.some(p => p.id === player.id)) return { alreadyJoined: true };
            c.state.players.push({ ...player, score: 0 });
            c.broadcast("playerJoined", { playerId: player.id, total: c.state.players.length });
            return { success: true };
        },
        
        startGame: (c) => {
            if (c.state.players.length < 2) throw new Error("Need at least 2 players");
            c.state.gameStarted = true;
            c.broadcast("gameStarted", { timestamp: Date.now() });
        },
        
        updateScore: (c, data: { playerId: string; points: number }) => {
            const player = c.state.players.find(p => p.id === data.playerId);
            if (!player) throw new Error("Player not found");
            player.score += data.points;
            c.broadcast("scoreUpdated", { playerId: data.playerId, newScore: player.score });
        },
    },
});
```

### Client: Connect to Actor via WebSocket (GDScript)

```gdscript
extends Node

var _ws := WebSocketPeer.new()
var _backend_url: String

func _ready() -> void:
    # RivetGlobal.backend_endpoint resolves to local dev URL or Rivet Cloud
    _backend_url = RivetGlobal.backend_endpoint
    _connect_to_room("room-123")

func _connect_to_room(room_id: String) -> void:
    var url = "%s/actors/game-room/%s/connect" % [_backend_url, room_id]
    var err = _ws.connect_to_url(url)
    if err != OK:
        push_error("WebSocket connect failed: %d" % err)

func _process(_delta: float) -> void:
    _ws.poll()
    match _ws.get_ready_state():
        WebSocketPeer.STATE_OPEN:
            while _ws.get_available_packet_count() > 0:
                var raw = _ws.get_packet().get_string_from_utf8()
                _handle_message(JSON.parse_string(raw))
        WebSocketPeer.STATE_CLOSING:
            pass
        WebSocketPeer.STATE_CLOSED:
            push_warning("WebSocket closed: code=%d" % _ws.get_close_code())

func _send(action: String, payload: Dictionary = {}) -> void:
    var msg = JSON.stringify({ "type": action, "data": payload })
    _ws.send_text(msg)

func _handle_message(msg: Dictionary) -> void:
    match msg.get("type", ""):
        "playerJoined":
            print("Player joined: ", msg.data.playerId)
        "gameStarted":
            get_tree().change_scene_to_file("res://scenes/game.tscn")
        "scoreUpdated":
            _on_score_updated(msg.data)

func join_game(player_name: String) -> void:
    _send("joinGame", { "id": str(multiplayer.get_unique_id()), "name": player_name })
```

---

## Environment & Configuration

```gdscript
# Check current environment
if RivetGlobal.env_type == RivetGlobal.EnvType.LOCAL:
    print("Dev mode — backend at: ", RivetGlobal.local_backend_endpoint)
else:
    print("Cloud mode — backend at: ", RivetGlobal.backend_endpoint)

# Listen for environment changes (e.g., user switches env in editor)
func _ready() -> void:
    RivetGlobal.env_update.connect(_on_env_changed)

func _on_env_changed() -> void:
    # Reconnect or refresh backend endpoint
    _backend_url = RivetGlobal.backend_endpoint
```

**rivet.json** (classic game backend configuration):
```json
{
    "matchmaker": {
        "max_players": 12,
        "docker": {
            "image_id": "...",
            "ports": {
                "default": { "port": 7777, "protocol": "udp" }
            }
        },
        "game_modes": {
            "default": {}
        }
    }
}
```

---

## Best Practices

- **Always `await` Rivet calls** — `matchmaker.lobbies.find()` and all backend actions are async; skipping `await` returns a coroutine, not the result.
- **Call `matchmaker.lobbies.ready()` after full setup** — do it inside `_on_start_server`, after `setup_multiplayer()`, not in `_ready()`. Players should not arrive before the server is initialized.
- **Use `RivetGlobal.backend_endpoint` everywhere** — never hardcode URLs; the endpoint changes between LOCAL dev and REMOTE cloud environments.
- **Set player token before creating peer** — `RivetHelper.set_player_token(token)` must be called before `peer.create_client()`; the server validates tokens on connection.
- **Handle response errors explicitly** — check `response.result != OK` on every matchmaker call; don't assume success.
- **Use ENet for real-time games, WebSocket for HTML5/turn-based** — ENet has lower latency; WebSocket is required for HTML5 export targets.
- **For actor approach: validate auth tokens in `createConnState`** — this is the only place to reject unauthorized connections before state is touched.
- **Broadcast state changes from actors, not individual actions** — use `c.broadcast()` after state mutations so all clients stay in sync.

---

## Anti-Patterns

- **Calling matchmaker without `await`** — `var response = Rivet.matchmaker.lobbies.find(...)` without `await` binds a coroutine object, causing silent failures when you read `response.body`.
- **Calling `lobbies.ready()` in `_ready()`** — players can connect before the ENet peer is listening. Always call it from `_on_start_server`.
- **Hardcoding the backend port** — `backend_endpoint` and `local_backend_port` (default 6420) are managed by `RivetGlobal`; reading them from config prevents mismatches between environments.
- **Ignoring WebSocket state in `_process`** — always check `get_ready_state()` before calling `get_packet()`; polling on a closed socket causes errors.
- **Using actor key as player ID directly** — actor keys are global routing identifiers. Use `createConnState` to associate a player identity with a connection.
- **Not removing disconnected players from actor state** — implement `onDisconnect` in the actor to clean up `c.state.players` when a WebSocket closes; stale entries break lobby logic.
- **Deploying without Dockerfile verification** — Rivet cloud runs server builds in Docker; test `docker build` locally before running `rivet deploy`.
