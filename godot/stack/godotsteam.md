---
version: 1.0.0
---

# GodotSteam

> **Scope**: GodotSteam GDExtension integration for Godot 4 — installation, initialization lifecycle, callback management, achievements and stats, lobby and matchmaking, cloud save, export/shipping, and common error patterns.
> **Load when**: integrating GodotSteam into a project, initializing the Steamworks SDK, implementing Steam achievements or statistics, creating Steam lobbies or matchmaking flows, using Steam Cloud save, exporting a game for Steam, debugging GodotSteam errors or callback failures.

---

## Installation (GDExtension, Godot 4.4+)

- Use the **GDExtension variant** for Godot 4 — it works without engine recompilation.
- Download the release that **exactly matches your Godot version** (e.g., GodotSteam 4.13 for Godot 4.4.x). A minor version mismatch causes a hard load failure at startup.
- Install by dropping the zip contents into the **project root**. The extension registers itself — it does **not** appear in the Plugin list and does not need to be enabled.
- Expected file structure:
  ```
  addons/
    godotsteam/
      godotsteam.gdextension
      win64/
        libgodotsteam.windows.template_debug.x86_64.dll
        libgodotsteam.windows.template_release.x86_64.dll
        steam_api64.dll
      linux64/ ...
      osx/    ...
  ```
- Restart the editor once after placing files to trigger extension registration.
- The `Steam` singleton is available globally in GDScript after the extension loads — no `preload` or `import` needed.

## Initialization

Use `steamInitEx()` (not `steamInit()`) — it returns a status dictionary with richer failure information:

```gdscript
var result: Dictionary = Steam.steamInitEx(YOUR_APP_ID)
# result = { "status": SteamAPIInitResult, "verbal": String }
if result["status"] > Steam.STEAM_API_INIT_RESULT_OK:
    push_error("Steam init failed: %s" % result["verbal"])
    get_tree().quit()
```

- `steamInit()` returns only a `bool` — prefer `steamInitEx()` for diagnosable failures.
- **App ID for development**: use `480` (Valve's SpaceWar test app). Replace with the real ID before shipping.
- **`steam_appid.txt`**: place a file containing only the app ID number in the editor root (parent of `res://`) for running outside the Steam client during development. **Never ship this file**.
- GodotSteam 4.14+ exposes Project Settings under `Steam > Initialization` to configure app ID, `embed_callbacks`, and `auto-initialize` — avoids hardcoding parameters.

## Callback Management

Steam callbacks **must run every frame** — without this, achievements, lobby events, invites, and most async responses silently stop working.

**Approach 1 — Manual `_process()` (most reliable)**:
```gdscript
func _process(_delta: float) -> void:
    Steam.run_callbacks()
```
Place in a global autoload that cannot be paused.

**Approach 2 — Embed callbacks parameter**:
```gdscript
Steam.steamInitEx(YOUR_APP_ID, true)  # second param = embed_callbacks
```
Reliable from GodotSteam 4.15+; was broken in 4.14. Use approach 1 as fallback when targeting older versions.

**Approach 3 — Project Settings**: enable `Steam > Initialization > Embed Callbacks` (same version caveat as approach 2).

- Prefer approach 1 until you have confirmed `embed_callbacks` works in your exact plugin version.
- Set `process_mode = PROCESS_MODE_ALWAYS` on the autoload node so callbacks are not blocked during game pauses.

## Autoload Pattern

Create a dedicated autoload (`SteamManager`) that owns all Steam initialization and signal wiring:

```gdscript
# steamworks.gd — registered as autoload "SteamManager"
extends Node

const APP_ID: int = 480  # Replace with real app ID before shipping

var is_on_steam_deck: bool = false
var steam_id: int = 0
var username: String = ""

func _init() -> void:
    # Set env vars before Steam loads — must happen in _init, not _ready
    OS.set_environment("SteamAppId", str(APP_ID))
    OS.set_environment("SteamGameId", str(APP_ID))

func _ready() -> void:
    _initialize_steam()
    _connect_signals()

func _process(_delta: float) -> void:
    Steam.run_callbacks()

func _initialize_steam() -> void:
    var result: Dictionary = Steam.steamInitEx(APP_ID)
    if result["status"] > Steam.STEAM_API_INIT_RESULT_OK:
        push_error("Steam init failed: %s" % result["verbal"])
        get_tree().quit()
        return
    steam_id = Steam.getSteamID()
    username = Steam.getPersonaName()
    is_on_steam_deck = Steam.isSteamRunningOnSteamDeck()

func _connect_signals() -> void:
    Steam.overlay_toggled.connect(_on_overlay_toggled)
    # Add other project-wide Steam signals here
```

- Never call `Steam.*` functions from other scripts before `SteamManager._ready()` has completed.
- Use `SteamManager.steam_id` and `SteamManager.username` as the authoritative source of local player data throughout the project.
- Set environment variables in `_init()`, not `_ready()` — they must be present before GodotSteam's own `_ready()` executes.

## Achievements & Stats

Maintain **local mirror dictionaries** keyed by Steam API names to avoid redundant Steam calls and enable offline comparison:

```gdscript
var achievements: Dictionary[String, bool] = {
    "ACH_WIN_ONE_GAME": false,
    "ACH_WIN_100_GAMES": false,
}
var statistics: Dictionary[String, int] = {
    "stat_games_played": 0,
    "stat_wins": 0,
}
```

**Loading** — compare local and Steam state, sync differences:
```gdscript
func load_steam_achievements() -> void:
    for key in achievements.keys():
        var result: Dictionary = Steam.getAchievement(key)
        if not result["ret"]:
            continue  # not published in the Steamworks backend — skip
        if achievements[key] != result["achieved"]:
            _set_achievement(key)
```

**Unlocking**:
```gdscript
func _set_achievement(achievement_id: String) -> void:
    if not achievements.has(achievement_id):
        return
    achievements[achievement_id] = true
    Steam.setAchievement(achievement_id)
    _store_steam_data()

func _store_steam_data() -> void:
    # storeStats() is REQUIRED — without it the Steam overlay popup will not appear
    Steam.storeStats()
```

Key rules:
- Always call `storeStats()` after `setAchievement()` — without it the overlay notification does not fire.
- Achievement API names must be **published** in the Steamworks developer backend. Adding them and not publishing means the API returns `"ret": false`.
- SDK 1.61+: stats auto-sync on init. Do **not** call the removed `requestCurrentStats()`.
- Check `getAchievement()["ret"]` before using the result — it is `false` when the achievement ID does not exist in the backend.

## Lobbies & Matchmaking

Connect lobby signals in the autoload or a dedicated `LobbyManager`:

```gdscript
func _connect_lobby_signals() -> void:
    Steam.lobby_created.connect(_on_lobby_created)
    Steam.lobby_joined.connect(_on_lobby_joined)
    Steam.lobby_match_list.connect(_on_lobby_match_list)
    Steam.lobby_chat_update.connect(_on_lobby_chat_update)
    Steam.lobby_message.connect(_on_lobby_message)
    Steam.join_requested.connect(_on_join_requested)
    Steam.lobby_invite.connect(_on_lobby_invite)
```

**Creating**:
```gdscript
Steam.createLobby(Steam.LOBBY_TYPE_PUBLIC, max_players)
# Resolves via signal: lobby_created(result: int, lobby_id: int)
```

**Searching and joining**:
```gdscript
Steam.requestLobbyList()

func _on_lobby_match_list(lobbies: Array) -> void:
    var joined := false
    for lobby_id in lobbies:
        var num_members: int = Steam.getNumLobbyMembers(lobby_id)
        var game_mode: String = Steam.getLobbyData(lobby_id, "game_mode")
        if num_members < max_players and game_mode == desired_mode:
            Steam.joinLobby(lobby_id)
            joined = true
            break
    if not joined:
        matchmake_phase += 1
        _matchmaking_loop()  # expand search radius or create a new lobby
```

- Use **phase-based matchmaking**: start with `LOBBY_DISTANCE_FILTER_CLOSE` and expand to `LOBBY_DISTANCE_FILTER_WORLDWIDE` on each failed attempt.
- Store custom lobby metadata via `Steam.setLobbyData(lobby_id, key, value)` immediately after `lobby_created` fires.
- For P2P networking on top of lobbies, use `SteamMultiplayerPeer` (separate GodotSteam addon).

## Cloud Save (Remote Storage)

```gdscript
# Async write (preferred — no frame stall)
func cloud_save(filename: String, data: Dictionary) -> void:
    var bytes: PackedByteArray = JSON.stringify(data).to_utf8_buffer()
    Steam.fileWriteAsync(filename, bytes, bytes.size())
    # Resolves via signal: file_write_async_complete(filename, result)

# Load
func cloud_load(filename: String) -> Dictionary:
    if not Steam.fileExists(filename):
        return {}
    var bytes: PackedByteArray = Steam.fileRead(filename, Steam.getFileSize(filename))
    return JSON.parse_string(bytes.get_string_from_utf8())

# Manage quota
func cloud_forget(filename: String) -> void:
    # Removes from Cloud but keeps locally — call fileWrite again to re-persist
    Steam.fileForget(filename)
```

- Use `fileWriteAsync` over synchronous `fileWrite` to avoid stalling the main thread.
- Steam Cloud uses a **flat file namespace** — no subdirectories. Use prefixes for organization (e.g., `"save_slot_1.json"`).
- `filePersisted(filename)` returns `false` if `fileForget` was called — use it before relying on Cloud state.

## Export & Shipping

- Use **GodotSteam-compiled export templates**, not the standard Godot ones. A standard Godot template will crash at launch because the Steamworks API is absent.
- In the Godot Export dialog: set `Custom Templates > Release` (and optionally `Debug`) to the GodotSteam template `.exe` / binary.
- **`steam_appid.txt`**: required next to the executable for testing exports outside the Steam client. A plain text file with just the app ID number. **Do not include in the final uploaded build**.
- **SDK DLL conflict**: the Steam distribution of Godot ships older `steam_api64.dll` / `steam_api.dll` that conflict with GodotSteam plugins. Always use the SDK files bundled with GodotSteam.
- Supported platforms: Windows 32/64, Linux 32/64/ARM64, macOS Universal, Android ARM64.

## Anti-patterns

- **`Steam isn't declared in the current scope`** — wrong editor build (missing GDExtension files) or GDExtension files built for a different Godot version. Match plugin release to exact Godot minor version.
- **Overlay does not render in the editor or Forward+ builds** — expected behavior. The overlay renders correctly when a shipped build is launched via the Steam client. Works in Compatibility (OpenGL) mode immediately.
- **Achievements do not trigger** — not published in the Steamworks developer backend. Publishing is a separate step after adding achievements in the dashboard.
- **Stats not updating** — calling the removed `requestCurrentStats()` (SDK 1.61+). Remove it; stats sync automatically.
- **Callbacks silently stop** — `run_callbacks()` is not called every frame, or the autoload node is paused (`process_mode` not set to `PROCESS_MODE_ALWAYS`).
- **`Cannot load a GDExtension built for Godot 4.4.1 using Godot 4.4.0`** — exact version mismatch. Always match GodotSteam release to the exact Godot minor/patch version.
- **Old `steamInitEx` signature** — pre-SDK 1.61 signature was `steamInitEx(true, 480, true)`. Current signature is `steamInitEx(app_id, embed_callbacks)`.
- **`embed_callbacks` unreliable** — was broken in GodotSteam 4.14. Use manual `run_callbacks()` in `_process()` as a safe fallback.
