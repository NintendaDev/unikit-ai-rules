---
version: 1.0.0
---

# Godot Epic Online Services (EOSG)

> **Scope**: Integration of Epic Online Services (EOS) into Godot 4.2+ via the EOSG GDExtension plugin — platform initialization, authentication flows, lobby management, P2P networking, and accessing GDScript singletons from C#.
> **Load when**: integrating Epic Online Services, setting up EOSG plugin, authenticating with EOS, creating or joining lobbies, implementing P2P multiplayer with EOS, accessing EOSG autoloads from C#, configuring EOS credentials, debugging EOS errors.

---

## Overview

EOSG (`epic-online-services-godot` by 3ddelano) wraps the EOS C SDK via GDExtension. It exposes two tiers:

| Tier | Classes | When to use |
|------|---------|-------------|
| **High Level EOS (HEOS)** | `HPlatform`, `HAuth`, `HLobbies`, `HP2P`, `HAchievements`, `HStats`, `HLeaderboards`, `HFriends`, `HLog` | Default — simplified async methods + signals |
| **GDExtension EOS** | `EOS`, `IEOS` | When HEOS lacks the required call; direct SDK access |

All HEOS classes are **GDScript autoloads** added by the plugin. Install via AssetLib ("EOSG") or from GitHub releases; enable in Project Settings → Plugins.

---

## Initialization

### Credentials

Always load credentials at runtime from a secure source — never hardcode them in committed source files.

```gdscript
var credentials = HCredentials.new()
credentials.product_name    = MY_PRODUCT_NAME     # from Epic Developer Portal
credentials.product_version = "1.0.0"
credentials.product_id      = MY_PRODUCT_ID
credentials.sandbox_id      = MY_SANDBOX_ID
credentials.deployment_id   = MY_DEPLOYMENT_ID
credentials.client_id       = MY_CLIENT_ID
credentials.client_secret   = MY_CLIENT_SECRET    # sensitive — never commit
credentials.encryption_key  = MY_ENCRYPTION_KEY  # 64-char random hex string
```

### Simple setup (recommended)

```gdscript
func _ready() -> void:
    HLog.log_level = HLog.LogLevel.INFO

    var ok := await HPlatform.setup_eos_async(credentials)
    if not ok:
        printerr("EOS setup failed — check logs")
        return

    # Optional: route EOS SDK log messages
    HPlatform.log_msg.connect(_on_eos_log_msg)
    HPlatform.set_eos_log_level(EOS.Logging.LogCategory.AllCategories, EOS.Logging.LogLevel.Info)

    HAuth.logged_in.connect(_on_logged_in)

func _on_eos_log_msg(msg: EOS.Logging.LogMessage) -> void:
    print("EOS | %s: %s" % [msg.category, msg.message])
```

`setup_eos_async` handles retry logic internally (10 attempts, 200 ms delay). Use it unless you need manual control over `PlatformFlags`.

### Advanced setup (manual flags)

Use when you need to configure `PlatformFlags` explicitly, e.g. `WindowsEnableOverlayOpengl`:

```gdscript
# Step 1 — initialize SDK
var init_opts = EOS.Platform.InitializeOptions.new()
init_opts.product_name = "My Game"
init_opts.product_version = "1.0.0"
var init_res := await HPlatform.initialize_async(init_opts)
if not EOS.is_success(init_res):
    printerr("EOS init failed: ", EOS.result_str(init_res))
    return

# Step 2 — create platform
var create_opts = EOS.Platform.CreateOptions.new()
create_opts.product_id     = MY_PRODUCT_ID
# ... fill all fields ...
if OS.get_name() == "Windows":
    create_opts.flags = EOS.Platform.PlatformFlags.WindowsEnableOverlayOpengl
var ok := await HPlatform.create_platform_async(create_opts)
if not ok:
    printerr("EOS platform creation failed")
    return
```

### Shutdown

Always release EOS on exit to avoid crashes:

```gdscript
func _notification(what: int) -> void:
    if what == NOTIFICATION_WM_CLOSE_REQUEST:
        EOS.Platform.PlatformInterface.release()
        var res := EOS.Platform.PlatformInterface.shutdown()
        if not EOS.is_success(res):
            printerr("EOS shutdown failed: ", EOS.result_str(res))
```

---

## Authentication

Two EOS subsystems require login:

| Subsystem | Class | ID property | Features |
|-----------|-------|-------------|----------|
| **Epic Account Services (EAS)** | `EOS.Auth` | `HAuth.epic_account_id` | Friends, Presence, Social Overlay, ECom |
| **Epic Game Services (EGS)** | `EOS.Connect` | `HAuth.product_user_id` | Lobbies, Stats, Leaderboards, P2P |

`HAuth` handles both. By default (`auto_connect_account = true`), logging into EAS automatically logs into EGS as well. Connect to `HAuth.logged_in` to detect successful login to both.

### Login methods

```gdscript
# Development — requires Epic Dev Auth Tool running on localhost
await HAuth.login_devtool_async("localhost:4545", "MyTestUser")

# Production desktop — opens browser / Epic Games overlay
await HAuth.login_account_portal_async()

# Via Epic Games Launcher (pass -AUTH_PASSWORD=<exchange_code> on CLI)
await HAuth.login_launcher_async()

# Persistent (re-uses stored Epic refresh token from previous AccountPortal login)
await HAuth.login_persistent_auth_async()

# Anonymous / mobile (device-id based, no account required)
await HAuth.login_anonymous_async("Player Display Name")
```

### Signals

```gdscript
HAuth.logged_in.connect(_on_logged_in)          # EAS + EGS both ready
HAuth.logged_out.connect(_on_logged_out)
HAuth.login_error.connect(_on_login_error)      # EOS.Result
HAuth.display_name_changed.connect(_on_name)
HAuth.external_account_info_changed.connect(_)  # fired after login & logout
```

### Post-login user info

```gdscript
func _on_logged_in() -> void:
    print(HAuth.product_user_id)   # EGS identifier (use for lobbies, P2P, stats)
    print(HAuth.epic_account_id)   # EAS identifier (use for friends, presence)
    print(HAuth.display_name)      # auto-fetched display name

    var info = await HAuth.get_user_info_async()
    # Returns: { user_id, country, display_name, display_name_sanitized,
    #            preferred_language, nickname }
```

### Logout

```gdscript
var result := await HAuth.logout_async()
if not EOS.is_success(result):
    printerr("Logout failed: ", EOS.result_str(result))
```

---

## Lobby System

### Creating a lobby

```gdscript
var opts = EOS.Lobby.CreateLobbyOptions.new()
opts.bucket_id          = "my_game_mode"         # used for search grouping
opts.max_lobby_members  = 4
opts.permission_level   = EOS.Lobby.LobbyPermissionLevel.PublicAdvertised
opts.allow_invites      = true
opts.presence_enabled   = true
opts.enable_rtc_room    = true                   # enables voice + data channel
opts.local_rtc_options  = {
    flags = EOS.RTC.JoinRoomFlags.EnableDataChannel
}

var lobby: HLobby = await HLobbies.create_lobby_async(opts)
if not lobby:
    printerr("Failed to create lobby")
    return

# Set attributes (pending until update_async is called)
lobby.add_attribute("map", "dungeon")
lobby.add_attribute("skill", 5, EOS.Lobby.LobbyAttributeVisibility.Public)
lobby.add_current_member_attribute("username", HAuth.display_name)
await lobby.update_async()

lobby.lobby_updated.connect(_on_lobby_updated)
lobby.kicked_from_lobby.connect(_on_kicked)
lobby.lobby_owner_changed.connect(_on_owner_changed)
```

### Searching for lobbies

```gdscript
# By bucket id
var lobbies = await HLobbies.search_by_bucket_id_async("my_game_mode")

# By custom attribute (multiple = implicit AND)
var lobbies = await HLobbies.search_by_attribute_async([
    {key = "map",   value = "dungeon"},
    {key = "skill", value = 10, comparison = EOS.ComparisonOp.LessThanOrEqual}
])

# By lobby id
var lobbies = await HLobbies.search_by_lobby_id_async(known_id)

# By player
var lobbies = await HLobbies.search_by_product_user_id_async(HAuth.product_user_id)
```

`max_search_results` (default 25) and `presence_enabled` are configurable on the `HLobbies` singleton before searching.

### Joining a lobby

```gdscript
# Join from search result
var joined: HLobby = await HLobbies.join_async(lobbies[0])

# Direct join by id (only when lobby has allow_join_by_id enabled)
var joined: HLobby = await HLobbies.join_by_id_async(lobby_id)
```

### HLobby API

```gdscript
lobby.lobby_id                   # String
lobby.owner_product_user_id      # String
lobby.members                    # Array[HLobbyMember]
lobby.max_members                # int
lobby.available_slots            # int
lobby.attributes                 # Array[Dictionary {key, value, visibility}]
lobby.rtc_room_enabled           # bool

lobby.is_owner()                 # bool — checks current user
lobby.get_owner()                # HLobbyMember | null
lobby.get_current_member()       # HLobbyMember | null
lobby.get_member_by_product_user_id(id) # HLobbyMember | null
lobby.get_attribute("key")       # Dictionary | {}

# Leaving and destroying
await lobby.leave_async()        # any member
await lobby.destroy_async()      # owner only
```

---

## P2P Networking

### EOSGMultiplayerPeer (Godot MultiplayerAPI integration)

The preferred approach — integrates with Godot's built-in `multiplayer` object and enables standard `@rpc` usage.

```gdscript
var peer := EOSGMultiplayerPeer.new()
EOSGMultiplayerPeer.set_local_user_id(HAuth.product_user_id)

# Host
peer.create_server("my_socket")
peer.peer_connected.connect(_on_peer_connected)
multiplayer.multiplayer_peer = peer

# Client
peer.create_client("my_socket", host_product_user_id)
multiplayer.multiplayer_peer = peer

# Mesh (all peers equal)
peer.create_mesh("my_socket")
peer.add_mesh_peer(other_product_user_id)
multiplayer.multiplayer_peer = peer

func _on_peer_connected(peer_id: int) -> void:
    var user_id: String = peer.get_peer_user_id(peer_id)
    print("Connected: ", user_id)

@rpc("any_peer", "call_local", "reliable")
func sync_state(data: Dictionary) -> void:
    pass
```

### HP2P (low-level configuration)

```gdscript
# Check NAT type (query before connecting peers)
var nat := await HP2P.get_nat_type_async()
# EOS.P2P.NATType: Unknown, Open, Moderate, Strict

# Relay configuration
HP2P.set_relay_control(EOS.P2P.RelayControl.AllowRelays)

# Port range
HP2P.set_port_range(7777, 10)  # port 7777 + up to 10 fallbacks
```

---

## Error Handling

Always check results using `EOS.is_success()` and log with `EOS.result_str()`:

```gdscript
if not EOS.is_success(result_code):
    printerr("Operation failed: ", EOS.result_str(result_code))
    return
```

`EOS.Result.AlreadyConfigured` is a success code during `initialize` — treat it as OK:

```gdscript
if not (EOS.is_success(res) or res == EOS.Result.AlreadyConfigured):
    printerr("Init failed")
```

---

## C# Interop

HEOS singletons are GDScript autoloads. Access them from C# via `GetNode` and call methods through the Variant API.

### Accessing autoloads

```csharp
// In a Node-derived class
private GodotObject _hAuth;
private GodotObject _hPlatform;

public override void _Ready()
{
    _hAuth    = GetNode("/root/HAuth");
    _hPlatform = GetNode("/root/HPlatform");
}
```

### Calling GDScript async methods

Use `ToSignal` to await GDScript signals from C#:

```csharp
// Trigger login (fire-and-forget style)
_hAuth.Call("login_devtool_async", "localhost:4545", "TestUser");

// Await the result signal
await ToSignal(_hAuth, "logged_in");

// Read a property after login
string productUserId = _hAuth.Get("product_user_id").AsString();
string displayName   = _hAuth.Get("display_name").AsString();
```

### Connecting to signals from C#

```csharp
// Connect using lambda
_hAuth.Connect("logged_in", Callable.From(OnLoggedIn));
_hAuth.Connect("login_error", Callable.From<int>(OnLoginError));

private void OnLoggedIn()
{
    string userId = _hAuth.Get("product_user_id").AsString();
    GD.Print("Logged in: ", userId);
}

private void OnLoginError(int resultCode)
{
    GD.PrintErr("Login error code: ", resultCode);
}
```

### Recommended bridge pattern

For complex integration, create a C# singleton node that wraps EOSG and re-exposes a typed C# API:

```csharp
// EosManager.cs — Autoload (C#)
public partial class EosManager : Node
{
    public static EosManager Instance { get; private set; }
    public string ProductUserId => _hAuth.Get("product_user_id").AsString();
    public bool IsLoggedIn => !string.IsNullOrEmpty(ProductUserId);

    private GodotObject _hAuth;
    private GodotObject _hPlatform;
    private GodotObject _hLobbies;

    [Signal] public delegate void LoggedInEventHandler();
    [Signal] public delegate void LoggedOutEventHandler();

    public override void _Ready()
    {
        Instance  = this;
        _hAuth    = GetNode("/root/HAuth");
        _hPlatform = GetNode("/root/HPlatform");
        _hLobbies  = GetNode("/root/HLobbies");
        _hAuth.Connect("logged_in",  Callable.From(OnEosLoggedIn));
        _hAuth.Connect("logged_out", Callable.From(OnEosLoggedOut));
    }

    public async Task<bool> InitAsync(EosCredentials creds)
    {
        var hCreds = ClassDB.Instantiate("HCredentials").AsGodotObject();
        hCreds.Set("product_name",    creds.ProductName);
        hCreds.Set("product_id",      creds.ProductId);
        hCreds.Set("sandbox_id",      creds.SandboxId);
        hCreds.Set("deployment_id",   creds.DeploymentId);
        hCreds.Set("client_id",       creds.ClientId);
        hCreds.Set("client_secret",   creds.ClientSecret);
        hCreds.Set("encryption_key",  creds.EncryptionKey);
        hCreds.Set("product_version", creds.ProductVersion);

        // setup_eos_async returns bool — call, then await platform_created signal
        _hPlatform.Call("setup_eos_async", hCreds);
        await ToSignal(_hPlatform, "platform_created");
        return IsLoggedIn;   // adjust to your flow
    }

    private void OnEosLoggedIn()   => EmitSignal(SignalName.LoggedIn);
    private void OnEosLoggedOut()  => EmitSignal(SignalName.LoggedOut);
}
```

---

## Platform-Specific Setup

### Windows — Social Overlay

Enable the overlay by setting `PlatformFlags` before `create_platform_async`:

```gdscript
if OS.get_name() == "Windows":
    HAuth.auth_login_flags = EOS.Auth.LoginFlags.None
    create_opts.flags = EOS.Platform.PlatformFlags.WindowsEnableOverlayOpengl
```

For `AccountPortal` login on Windows, the game must be launched via the **EOS Redistributable Installer** (bootstrap the executable via an `.ini` file). DevTool login does not require this.

### Android

1. Enable Gradle build template (`Project → Export → Android → Gradle Build`)
2. Add EOS SDK dependencies to `android/build/build.gradle`:
   - `androidx.appcompat`, `androidx.constraintlayout`, `androidx.security:security-crypto`, `androidx.browser`
   - `implementation files('.../eossdk-StaticSTDC-release.aar')`
3. Set `minSdk = 23` in `android/build/config.gradle`
4. Add to `defaultConfig` in `build.gradle`:
   ```gradle
   String ClientId = "YOUR_CLIENT_ID"
   resValue("string", "eos_login_protocol_scheme", "eos." + ClientId.toLowerCase())
   ```
5. Add `EOSSDK.init(getActivity())` to `GodotApp.onCreate` in `GodotGame.java`
6. Enable `arm64-v8a` architecture and `INTERNET`/`ACCESS_NETWORK_STATE`/`ACCESS_WIFI_STATE` permissions in export settings

### iOS

Export from Godot (ignore build errors), then open the generated project in Xcode and build there. Supports `arm64` device and simulator.

---

## Best Practices

- **Credentials security**: load credentials at runtime from environment variables or encrypted config; never hardcode in committed GDScript or C# files. Use Godot's script encryption for export builds.
- **Initialization order**: await `HPlatform.setup_eos_async` to succeed before calling any other HEOS method or login.
- **Shutdown**: always call `PlatformInterface.release()` then `PlatformInterface.shutdown()` on `NOTIFICATION_WM_CLOSE_REQUEST`.
- **Login flow**: use DevTool for development, AccountPortal for production desktop, Launcher when shipping on EGS, Anonymous for mobile.
- **Persistent auth**: call `login_persistent_auth_async` first to re-use a stored session; fall back to AccountPortal if it fails.
- **HEOS first**: use HEOS methods before reaching for `EOS.*` / `IEOS.*` directly — they handle retries, user id tracking, and signal dispatch.
- **C# bridge**: wrap EOSG in a single C# `EosManager` autoload to avoid scattering `GetNode("/root/HAuth")` calls and to keep the rest of the C# codebase typed.
- **EOS Developer Portal**: enable needed permission scopes (Basic Profile, Online Presence, Friends) and set Client Policy to "Custom policy" with "User is required".
- **Tick budget**: `setup_eos_async` auto-computes `tick_budget_in_milliseconds` from the engine FPS cap (min 2 ms). Override `HPlatform.tick_budget_in_milliseconds` explicitly for dedicated servers.

---

## Anti-patterns

- **Do not** hardcode `CLIENT_SECRET` or `ENCRYPTION_KEY` in GDScript or C# source files checked into version control.
- **Do not** call lobby/stats/leaderboard methods before `HAuth.logged_in` has fired — `HAuth.product_user_id` will be empty and calls will fail silently or with `EOS.Result.InvalidUser`.
- **Do not** ignore `EOS.Result` from async calls — always check with `EOS.is_success()` and log with `EOS.result_str()`.
- **Do not** call `EOS.Platform.PlatformInterface.release()` or `shutdown()` before logging out — log out first if you need to disconnect gracefully.
- **Do not** omit `await lobby.update_async()` after `add_attribute` / `add_current_member_attribute` — attributes are staged locally until `update_async` is called.
- **Do not** forget to set `EOSGMultiplayerPeer.set_local_user_id(HAuth.product_user_id)` before calling `create_server` / `create_client` — P2P will fail to identify the local user.
- **Do not** target Android exports without setting `minSdk = 23` — the EOS Android SDK requires it; lower values cause crashes at runtime.
- **Do not** use MFA-protected Epic accounts with DevTool login — `EOS.Result.AuthMFARequired` is returned and there is no SDK-level MFA flow.
