---
version: 1.0.0
---

# Nakama .NET SDK

> **Scope**: Nakama .NET SDK integration for Godot 4 C# — client setup, authentication, session lifecycle, real-time socket connection, error handling, retry configuration, and data serialization.
> **Load when**: integrating Nakama backend, setting up authentication, managing user sessions, connecting the real-time socket, handling API errors, configuring retry logic, serializing Nakama payloads, implementing HTML5/WebGL builds with Nakama.
> **References**: `.unikit/memory/stack/references/nakama-social.md` (social features), `.unikit/memory/stack/references/nakama-gameplay.md` (storage, RPC, matchmaking, leaderboards, notifications)

---

## Core Concepts

- **Client** (`IClient`) — HTTP client for all REST-style API calls (auth, storage, leaderboards, etc.). One instance per server. Create once and share across the app as a singleton/autoload.
- **Session** (`ISession`) — JWT representing an authenticated user. Passed with every API call. Contains `AuthToken`, `RefreshToken`, `UserId`, `Username`, `IsExpired`.
- **Socket** (`ISocket`) — WebSocket connection for real-time features (chat, match state, presence, real-time RPC). Separate from the client. Does not auto-reconnect — handle reconnection manually.

## Setup & Configuration

```csharp
// Create client — one per server, keep as a singleton/autoload node
var client = new Client("http", "127.0.0.1", 7350, "defaultkey");
client.Timeout = 10; // request timeout in seconds (default: 30)
```

### HTML5 / WebGL Builds

The standard .NET HTTP and WebSocket adapters do not work in browsers. Use Godot-specific adapters for HTML5 exports:

```csharp
#if GODOT_HTML5
var client = new Client("http", host, 7350, serverKey,
    httpAdapter: new GodotHttpAdapter(),
    socketAdapter: new GodotWebSocketAdapter());
#else
var client = new Client("http", host, 7350, serverKey);
#endif
```

**Never ship a WebGL build without the Godot adapters** — the default adapters silently fail in browsers.

### Singleton Pattern (Autoload)

Register a C# node as an autoload in Godot. Keep `client`, `session`, and `socket` as instance fields on that node. Never create multiple `IClient` instances pointing to the same server.

## Authentication

```csharp
// Device authentication — creates account automatically on first run
var session = await client.AuthenticateDeviceAsync(deviceId, create: true);

// Email / password
var session = await client.AuthenticateEmailAsync("user@example.com", "password");

// Custom (third-party identity provider)
var session = await client.AuthenticateCustomAsync(customId);

// Link an additional auth method to an existing account
await client.LinkEmailAsync(session, "user@example.com", "password");
await client.LinkDeviceAsync(session, deviceId);
```

**Device ID in Godot** — Godot has no `SystemInfo.deviceUniqueIdentifier`. Generate a GUID once and persist it:

```csharp
var config = new ConfigFile();
config.Load("user://nakama.cfg");
var deviceId = config.GetValue("auth", "device_id", Guid.NewGuid().ToString()) as string;
config.SetValue("auth", "device_id", deviceId);
config.Save("user://nakama.cfg");
```

## Session Management

Always restore and validate the session at startup before authenticating from scratch:

```csharp
var config = new ConfigFile();
config.Load("user://nakama.cfg");

var authToken    = config.GetValue("auth", "auth_token",    "") as string;
var refreshToken = config.GetValue("auth", "refresh_token", "") as string;

ISession session;
if (!string.IsNullOrEmpty(authToken))
{
    var restored = Session.Restore(authToken, refreshToken);

    // Refresh if expiring within the next hour
    if (restored.HasExpired(DateTime.UtcNow.AddHours(1)))
    {
        try   { session = await client.SessionRefreshAsync(restored); }
        catch (ApiResponseException) { session = await AuthenticateFresh(client, deviceId); }
    }
    else { session = restored; }
}
else { session = await AuthenticateFresh(client, deviceId); }

// Persist tokens after successful auth
config.SetValue("auth", "auth_token",    session.AuthToken);
config.SetValue("auth", "refresh_token", session.RefreshToken);
config.Save("user://nakama.cfg");
```

**Session variables** — pass metadata at authentication time (read-only after creation):

```csharp
var vars = new Dictionary<string, string> { { "platform", OS.GetName() } };
var session = await client.AuthenticateDeviceAsync(deviceId, vars: vars);
// Read back: session.Vars["platform"]
```

## Socket Connection

```csharp
// Create socket from the existing client (use Socket.From, not client.NewSocket — that is Unity-only)
var socket = Socket.From(client);

// Wire event handlers before connecting
socket.Connected     += () => GD.Print("Socket connected");
socket.Closed        += () => GD.Print("Socket closed");
socket.ReceivedError += ex => GD.PrintErr("Socket error: " + ex.Message);

// Connect with session
await socket.ConnectAsync(session, appearOnline: true, connectTimeout: 30);
```

**Keep the socket reference alive** — if the `ISocket` object is garbage-collected, the connection drops silently. Store it as a field on a persistent node or autoload.

### Manual Reconnection

Nakama does not auto-reconnect. Implement it explicitly:

```csharp
socket.Closed += async () =>
{
    await Task.Delay(TimeSpan.FromSeconds(2));
    try { await socket.ConnectAsync(session); }
    catch (ApiResponseException ex) { GD.PrintErr("Reconnect failed: " + ex.Message); }
};
```

## Error Handling

All `IClient` and `ISocket` async methods throw `ApiResponseException` on server-side errors:

```csharp
try
{
    var account = await client.GetAccountAsync(session);
}
catch (ApiResponseException ex)
{
    GD.PrintErr($"Nakama error {ex.StatusCode}: {ex.Message}");
    // 401 → session expired, refresh and retry
    // 404 → resource not found
    // 409 → storage version conflict
    // 429 → rate limited, back off
}
```

**Always wrap network calls in try/catch** — Nakama throws rather than returning null or error objects.

## Retry Configuration

Configure global retry with exponential backoff to handle transient network failures:

```csharp
var retryConfig = new RetryConfiguration(
    baseDelayMs: 1000,
    maxRetries: 5,
    listener: (retryCount, history) => GD.Print($"Retry #{retryCount}"));

client.GlobalRetryConfiguration = retryConfig;
```

Per-request override (e.g., to disable retries for a specific call):

```csharp
var noRetry = new RetryConfiguration(baseDelayMs: 0, maxRetries: 0);
var result = await client.GetAccountAsync(session, retryConfiguration: noRetry);
```

## Cancellation Tokens

Tie request cancellation to node lifetime to prevent callbacks firing on freed nodes:

```csharp
private readonly CancellationTokenSource _cts = new();

// In async method:
var account = await client.GetAccountAsync(session, canceller: _cts);

// On node exit:
public override void _ExitTree() => _cts.Cancel();
```

## Data Serialization

Nakama storage values, RPC payloads, and metadata fields are always JSON strings. Use `System.Text.Json`:

```csharp
// Serialize before sending
var json = JsonSerializer.Serialize(new { score = 100, level = 5 });

// Deserialize after receiving
var data = JsonSerializer.Deserialize<MyData>(storageObject.Value);
```

**Wallet and metadata fields** on `IApiAccount` are raw JSON strings — always deserialize before use:

```csharp
var wallet   = JsonSerializer.Deserialize<Dictionary<string, long>>(account.Wallet);
var metadata = JsonSerializer.Deserialize<MyMetadata>(account.User.Metadata);
```

## Feature Lookup Workflow

When implementing social or gameplay features, open the appropriate reference file:

1. **Social features** (friends, groups/clans, chat, status/presence) → open `nakama-social.md`
2. **Gameplay features** (storage, RPC, matchmaking, leaderboards, notifications) → open `nakama-gameplay.md`

Do NOT guess API method names — verify against the reference files.

## Best Practices

- Keep one `IClient` per server — never recreate it per scene.
- Always check `session.HasExpired()` at startup and after long offline gaps.
- Store both `AuthToken` **and** `RefreshToken` — refresh is far cheaper than re-authenticating.
- Use `CancellationToken` tied to node lifetime (`_ExitTree`) to prevent callbacks on freed nodes.
- Use `RetryConfiguration` with exponential backoff for all non-critical API calls.
- Set `appearOnline: false` when connecting the socket for backend-only use (matchmaking, RPC) to avoid polluting presence lists.
- User and group metadata can only be updated server-side via RPC — client writes are rejected by Nakama.

## Anti-patterns

- **Don't recreate `IClient` per scene** — it is expensive and resets retry configuration.
- **Don't ignore `ApiResponseException`** — swallowing errors hides session expiry and storage conflicts.
- **Don't use the socket before it connects** — buffer messages until `socket.Connected` fires.
- **Don't skip `RefreshToken` persistence** — losing it forces a full re-authentication on the next session expiry.
- **Don't ship WebGL without Godot adapters** — default adapters silently fail in browsers.
- **Don't hold `ISocket` in a local variable** — GC will collect it and drop the connection.
- **Don't call `client.NewSocket()`** — this is a Unity-SDK extension, unavailable in the .NET SDK; use `Socket.From(client)` instead.
- **Don't attempt to write user/group metadata from the client** — use server-side RPCs.
