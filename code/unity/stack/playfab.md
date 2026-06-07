---
version: 1.0.0
---

# PlayFab

> **Scope**: PlayFab Unity SDK — player authentication, player data storage (classic UserData and Entity Objects), statistics, leaderboards, CloudScript via Azure Functions, title data, economy integration, and concurrency patterns for Unity games.
> **Load when**: integrating PlayFab backend services into a Unity game, implementing player authentication or login flows, saving or loading player data with PlayFab, working with leaderboards or player statistics, calling Azure Functions CloudScript from Unity, setting up PlayFab economy or inventory, debugging PlayFab API errors.

---

## Setup & Configuration

- Install via **PlayFab Editor Extensions** (`PlayFabEditorExtensions.UnityPackage`) — the recommended route. Opens an in-editor panel for SDK install and version upgrades.
- Set `TitleId` **before** making any API call. Preferred approach: configure `PlayFabSharedSettings.asset` (Window → PlayFab → MakePlayFabSharedSettings) — no code required. Code alternative:

```csharp
PlayFabSettings.staticSettings.TitleId = "YOUR_TITLE_ID"; // call once at startup
```

- **Never** include `DeveloperSecretKey` in a game client build. Secret keys are for server-only (CloudScript / Azure Functions) use.
- Use `UnityWebRequest` as the HTTP transport (SDK default). Switch only when targeting a very old Unity version.
- For new projects, prefer the **Unified SDK (v2)** — modular architecture lets you include only the components you need.

---

## API Callback Pattern

All PlayFab APIs are asynchronous and use a callback pair. Both callbacks execute on Unity's main thread.

```csharp
PlayFabClientAPI.SomeMethod(
    request,
    result => { /* success */ },
    error  => { Debug.LogError(error.GenerateErrorReport()); }
);
```

- Response time: ~50–200 ms on desktop; longer on mobile networks.
- Always supply an error callback — never omit it.
- Use `error.GenerateErrorReport()` for the full debug string. Also inspect `error.errorMessage` and `error.errorDetails` for structured data.

---

## Authentication

Log in once per session before calling any other Player API. The `LoginResult` provides `PlayFabId`, `SessionTicket`, and `EntityToken`.

```csharp
// Android — use for mobile production builds
PlayFabClientAPI.LoginWithAndroidDeviceID(new LoginWithAndroidDeviceIDRequest
{
    AndroidDeviceId = SystemInfo.deviceUniqueIdentifier,
    CreateAccount   = true
}, OnLoginSuccess, OnLoginFailure);

// iOS — use for mobile production builds
PlayFabClientAPI.LoginWithIOSDeviceID(new LoginWithIOSDeviceIDRequest
{
    DeviceId      = SystemInfo.deviceUniqueIdentifier,
    CreateAccount = true
}, OnLoginSuccess, OnLoginFailure);

// Desktop / testing only — do NOT use in mobile production
PlayFabClientAPI.LoginWithCustomID(new LoginWithCustomIDRequest
{
    CustomId      = "PlayerIdentifier",
    CreateAccount = true
}, OnLoginSuccess, OnLoginFailure);
```

After a successful login the SDK populates `PlayFabSettings.staticPlayer`:

| Property | Value |
|----------|-------|
| `PlayFabSettings.staticPlayer.PlayFabId` | Classic player ID |
| `PlayFabSettings.staticPlayer.EntityId` | Entity ID for Entity APIs |
| `PlayFabSettings.staticPlayer.EntityType` | Entity type string (usually `"title_player_account"`) |

**Login method by platform:**

| Platform | API Method |
|----------|-----------|
| Android | `LoginWithAndroidDeviceID` |
| iOS | `LoginWithIOSDeviceID` |
| Facebook | `LoginWithFacebook` |
| Steam | `LoginWithSteam` |
| Google Play Games | `LoginWithGooglePlayGamesServices` |
| Desktop / testing | `LoginWithCustomID` |

---

## Entity System

The Entity API is PlayFab's modern data layer. Every player login automatically creates a `title_player_account` entity.

**Supported entity types** (type strings are case-sensitive):

| Type | Meaning | ID source |
|------|---------|-----------|
| `title_player_account` | The player in this title | `LoginResult.EntityToken.Id` |
| `master_player_account` | The player across all studio titles | `LoginResult.PlayFabId` |
| `title` | Global title data | `TitleId` |
| `character` | Sub-entity of a player | `characterId` |
| `group` | Group / clan entity | `result.Group.Id` |
| `game_server` | Authenticated game server | `AuthenticateGameServerWithCustomId` result |

Build an `EntityKey` once from the login result and reuse it:

```csharp
var entityKey = new PlayFab.DataModels.EntityKey
{
    Id   = PlayFabSettings.staticPlayer.EntityId,
    Type = PlayFabSettings.staticPlayer.EntityType   // "title_player_account"
};
```

---

## Player Data Storage

Two storage systems exist. Use Entity Objects for new titles.

### Classic UserData (Key/Value string pairs)

```csharp
// Write
PlayFabClientAPI.UpdateUserData(new UpdateUserDataRequest
{
    Data = new Dictionary<string, string>
    {
        { "Level",    "5" },
        { "LastZone", "desert" }
    }
},
result => Debug.Log("Saved"),
error  => Debug.LogError(error.GenerateErrorReport()));

// Read
PlayFabClientAPI.GetUserData(new GetUserDataRequest
{
    PlayFabId = PlayFabSettings.staticPlayer.PlayFabId,
    Keys      = null   // null = return all keys
}, result =>
{
    if (result.Data.TryGetValue("Level", out var entry))
        Debug.Log("Level: " + entry.Value);
}, error => Debug.LogError(error.GenerateErrorReport()));
```

**Access modes:**

| Mode | Write | Read |
|------|-------|------|
| Client | Client API (`UpdateUserData`) | Client API (`GetUserData`) |
| ReadOnly | Server API (`UpdateUserReadOnlyData`) | Client API (`GetUserReadOnlyData`) |
| Internal | Server API (`UpdateUserInternalData`) | Server only (`GetUserInternalData`) |

To expose data to other players set `Permission = UserDataPermission.Public` when writing.

### Entity Objects (recommended for new titles)

```csharp
// Write
var payload = new Dictionary<string, object> { { "Health", 100 }, { "Coins", 500 } };
PlayFabDataAPI.SetObjects(new SetObjectsRequest
{
    Entity  = entityKey,
    Objects = new List<SetObject>
    {
        new SetObject { ObjectName = "PlayerData", DataObject = payload }
    }
},
result => Debug.Log("Saved — profile v" + result.ProfileVersion),
error  => Debug.LogError(error.GenerateErrorReport()));

// Read
PlayFabDataAPI.GetObjects(new GetObjectsRequest { Entity = entityKey },
result =>
{
    if (result.Objects.TryGetValue("PlayerData", out var obj))
        Debug.Log(obj.DataObject.ToString());
}, error => Debug.LogError(error.GenerateErrorReport()));
```

**Limits:** free tier — up to 3 objects per entity. Classic UserData and Entity Objects are **separate storage** — data written with one API is invisible to the other.

---

## Statistics & Leaderboards

Statistics underlie leaderboards. Create the statistic first in Game Manager (Statistics → New Statistic).

```csharp
// Submit a score
// Requires "Allow client to post player statistics" enabled in Game Manager → API Features
PlayFabClientAPI.UpdatePlayerStatistics(new UpdatePlayerStatisticsRequest
{
    Statistics = new List<StatisticUpdate>
    {
        new StatisticUpdate { StatisticName = "HighScore", Value = playerScore }
    }
},
result => Debug.Log("Score submitted"),
error  => Debug.LogError(error.GenerateErrorReport()));

// Get top-N leaderboard
PlayFabClientAPI.GetLeaderboard(new GetLeaderboardRequest
{
    StatisticName   = "HighScore",
    StartPosition   = 0,
    MaxResultsCount = 10
}, result =>
{
    foreach (var entry in result.Leaderboard)
        Debug.Log($"#{entry.Position + 1}  {entry.DisplayName}: {entry.StatValue}");
}, error => Debug.LogError(error.GenerateErrorReport()));

// Get leaderboard centered around the current player
PlayFabClientAPI.GetLeaderboardAroundPlayer(new GetLeaderboardAroundPlayerRequest
{
    StatisticName   = "HighScore",
    MaxResultsCount = 5
}, result =>
{
    foreach (var entry in result.Leaderboard)
        Debug.Log($"#{entry.Position + 1}  {entry.DisplayName}: {entry.StatValue}");
}, error => Debug.LogError(error.GenerateErrorReport()));
```

To reset a leaderboard (increment statistic version):

```csharp
PlayFabAdminAPI.IncrementPlayerStatisticVersion(
    new IncrementPlayerStatisticVersionRequest { StatisticName = "HighScore" },
    result => Debug.Log("Leaderboard reset"),
    error  => Debug.LogError(error.GenerateErrorReport()));
```

---

## CloudScript — Azure Functions

Use `PlayFabCloudScriptAPI.ExecuteFunction` to invoke a registered Azure Function.

```csharp
using PlayFab;
using PlayFab.CloudScriptModels;

PlayFabCloudScriptAPI.ExecuteFunction(new ExecuteFunctionRequest
{
    Entity = new PlayFab.CloudScriptModels.EntityKey
    {
        Id   = PlayFabSettings.staticPlayer.EntityId,
        Type = PlayFabSettings.staticPlayer.EntityType
    },
    FunctionName            = "CalculateReward",
    FunctionParameter       = new Dictionary<string, object> { { "level", 5 } },
    GeneratePlayStreamEvent = false
}, result =>
{
    if (result.FunctionResultTooLarge ?? false)
    {
        Debug.LogWarning("Result exceeded PlayFab size limit");
        return;
    }
    Debug.Log($"Result: {result.FunctionResult}  ({result.ExecutionTimeMilliseconds} ms)");
}, error => Debug.LogError(error.GenerateErrorReport()));
```

**Execution timeout limits:**

| Trigger | Limit |
|---------|-------|
| PlayFab API (direct call) | 10 s |
| PlayStream V2 | 10 s |
| Scheduled task | 4.5 s |
| PlayStream V1 | 1 s |

- Register functions in Game Manager → Automation → Cloud Script → Register Function.
- Use **Function-level authorization** (not Anonymous) in production Azure Functions.
- Deploy in **US-West / US-West 2 / US-West 3** regions to minimize latency to PlayFab.
- Store the function secret in Azure Application Settings; retrieve via `Environment.GetEnvironmentVariable()` — never hardcode it.
- Always check `result.FunctionResultTooLarge` before consuming the result.

---

## Title Data (Global Config)

Title data is server-side key/value configuration shared across all players. Read it from the client after login:

```csharp
PlayFabClientAPI.GetTitleData(new GetTitleDataRequest
{
    Keys = new List<string> { "EventEndTime", "SeasonBonus" }
}, result =>
{
    if (result.Data.TryGetValue("SeasonBonus", out var value))
        Debug.Log("Bonus: " + value);
}, error => Debug.LogError(error.GenerateErrorReport()));
```

---

## Concurrency

- Multiple concurrent **read** requests for the same player are safe.
- Multiple concurrent **write** requests to the same entity can return `APIConcurrentRequestLimitExceeded` or `ConcurrentEditError` — serialize writes to the same entity, or implement retry with exponential back-off.

---

## Best Practices

- Set `TitleId` once at application startup (e.g., in `Awake` on a persistent GameObject) before any API call.
- Cache the login state in `PlayFabSettings.staticPlayer` — do not re-login on every scene load.
- Build the `EntityKey` once from the login result and reuse it throughout the session.
- Prefer Entity Objects (`PlayFabDataAPI`) for structured data; use classic `UpdateUserData` only for simple string key/value pairs.
- Never store `DeveloperSecretKey` in client builds — perform privileged operations via CloudScript or a dedicated server.
- Serialize write requests to the same entity to avoid concurrency errors.
- For Economy, use `PlayFabEconomyAPI` (v2) — Economy v1 is deprecated for new titles.

---

## Anti-patterns

- **Omitting the error callback** — always supply it; silent failures are hard to diagnose.
- **Calling Player APIs before login** — all player-scoped calls require a valid session ticket.
- **`LoginWithCustomID` in mobile production** — use device-specific (`LoginWithAndroidDeviceID` / `LoginWithIOSDeviceID`) or social login instead.
- **`UpdatePlayerStatistics` from client without enabling the setting** — call fails unless "Allow client to post player statistics" is checked in Game Manager → API Features.
- **`DeveloperSecretKey` in the client build** — exposes the entire title to unauthorized server-level calls.
- **Anonymous Azure Function authorization in production** — allows anyone to invoke your function endpoint.
- **Expecting classic UserData to appear in Entity Object API (or vice versa)** — these are separate storage systems with no data overlap.
- **Multiple concurrent writes to the same entity** — causes `ConcurrentEditError`; serialize writes or retry with back-off.
- **PlayFab Party with dedicated servers** — incompatible; use alternative networking for dedicated-server multiplayer.
