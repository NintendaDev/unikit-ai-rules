---
version: 1.0.0
---

# GodotSteam / Steam Integration (Godot 4 .NET C#)

> **Scope**: Steam platform integration in Godot 4 .NET C# projects — choosing between GodotSteam and Steamworks.NET, installing and initializing the Steam API, implementing the SteamManager autoload singleton, running callbacks every frame, using Callback<T> and CallResult<T> patterns, and integrating achievements, stats, leaderboards, lobbies, and the Steam overlay.
> **Load when**: integrating Steam into a Godot 4 C# project, implementing achievements or leaderboards, setting up Steam lobbies or P2P networking, asking about GodotSteam compatibility with C#, configuring steam_appid.txt or DLL placement, debugging Steam initialization failures, handling Steam callbacks, publishing a game to Steam.

---

## C# vs GDScript: Critical Distinction

**GodotSteam** (godotsteam.com) is a GDScript-first plugin — it is **not directly accessible from C#**. Using it from a C# project requires awkward dynamic singleton calls via `Engine.GetSingleton("Steam")` and is unsupported by the GodotSteam maintainers.

**For Godot 4 .NET C# projects, use Steamworks.NET** — the official C# wrapper for Valve's Steamworks SDK. Two options:

| Option | What it is | When to choose |
|--------|-----------|----------------|
| **Steamworks.NET** (raw) | Direct C# bindings for the full Steamworks SDK | Full control, minimal overhead |
| **Godot.Steamworks.NET** | Thin Godot-specific wrapper around Steamworks.NET | Cleaner Godot lifecycle integration, quicker start |

Both build on the same underlying SDK. The Chickensoft GameTemplate uses raw Steamworks.NET.

---

## Installation

### Option A — Raw Steamworks.NET (recommended)

```xml
<!-- GameTemplate.csproj -->
<PackageReference Include="Steamworks.NET.AnyCPU" Version="#.#.#" />
```

On **macOS**, Steamworks.NET cannot locate the Steam libraries without a `dllmap` entry. Add `app.config` to your project root:

```xml
<!-- app.config -->
<configuration>
  <dllmap dll="steam_api" target="libsteam_api.dylib" os="osx" />
  <dllmap dll="steam_api64" target="libsteam_api.dylib" os="osx" />
</configuration>
```

### Option B — Godot.Steamworks.NET wrapper

```
dotnet add package Steamworks.NET.AnyCPU --version <ver>
```

Copy `addons/Godot.Steamworks.NET/` from the demo project into your `addons/`, build, then enable the plugin in Project Settings → Plugins.

---

## Required Files

Place these files **next to the Godot editor executable** (and next to your exported game executable):

| File | Platform | Purpose |
|------|----------|---------|
| `steam_appid.txt` | All | Contains your App ID (one integer, no whitespace). Required for editor runs. |
| `steam_api64.dll` | Windows | Steamworks native library |
| `libsteam_api.so` | Linux | Steamworks native library |
| `libsteam_api.dylib` | macOS | Steamworks native library |

`steam_appid.txt` must contain **only your AppID** (e.g., `480` for SpaceWar test app) with no trailing newline issues. Delete it from the final shipped build — it is for development only.

---

## SteamManager Singleton (Godot Adaptation)

Adapt the standard `SteamManager` as an autoloaded Godot `Node`. Add it to **Project Settings → Autoload** as the first (or very early) autoload so Steam is ready before any other script runs.

```csharp
using Godot;
using Steamworks;

/// <summary>
/// Autoload singleton. Must be first in the autoload list.
/// </summary>
public partial class SteamManager : Node
{
    public static SteamManager Instance { get; private set; }

    /// <summary>True when SteamAPI.Init() succeeded.</summary>
    public static bool Initialized { get; private set; }

    public override void _Ready()
    {
        // Prevent duplicate singletons (editor hot-reload safety)
        if (Instance != null)
        {
            QueueFree();
            return;
        }

        Instance = this;

        // Skip Steam in non-Steam builds (e.g., itch.io, demo)
        if (!OS.HasFeature("steam"))
        {
            GD.Print("[Steam] No 'steam' feature tag — skipping initialization.");
            return;
        }

        if (!SteamAPI.Init())
        {
            GD.PrintErr("[Steam] SteamAPI.Init() failed. Is Steam running? " +
                        "Is steam_appid.txt present next to the executable?");
            return;
        }

        Initialized = true;
        GD.Print($"[Steam] Initialized. Hello, {SteamFriends.GetPersonaName()}!");
    }

    public override void _Process(double delta)
    {
        if (!Initialized) return;
        // REQUIRED every frame — dispatches all Callbacks and CallResults
        SteamAPI.RunCallbacks();
    }

    public override void _ExitTree()
    {
        if (!Initialized) return;
        SteamAPI.Shutdown();
        Initialized = false;
        GD.Print("[Steam] Shutdown.");
    }
}
```

**Feature tag guard:** Export templates can be configured with a `steam` feature tag so the same binary can run Steam-enabled vs DRM-free paths without #if directives.

---

## Callback\<T\> and CallResult\<T\> Patterns

Steam delivers results asynchronously. Two mechanisms:

**`Callback<T>`** — subscribes to a Steam event that fires automatically whenever Steam pushes it:

```csharp
public partial class AchievementsSystem : Node
{
    // MUST be stored as a field — GC will collect it otherwise and callbacks stop firing
    private Callback<UserAchievementStored_t> _achievementStored;

    public override void _Ready()
    {
        if (!SteamManager.Initialized) return;

        _achievementStored = Callback<UserAchievementStored_t>.Create(OnAchievementStored);
    }

    private void OnAchievementStored(UserAchievementStored_t cb)
    {
        GD.Print($"[Steam] Achievement stored: {cb.m_rgchAchievementName}");
    }
}
```

**`CallResult<T>`** — associates a specific API call (identified by a `SteamAPICall_t` handle) with a one-shot callback:

```csharp
private CallResult<LeaderboardFindResult_t> _findLeaderboardResult;

public void FindLeaderboard(string name)
{
    _findLeaderboardResult = CallResult<LeaderboardFindResult_t>.Create(OnLeaderboardFound);
    SteamAPICall_t handle = SteamUserStats.FindLeaderboard(name);
    _findLeaderboardResult.Set(handle);
}

private void OnLeaderboardFound(LeaderboardFindResult_t result, bool ioFailure)
{
    if (ioFailure || result.m_bLeaderboardFound == 0)
    {
        GD.PrintErr("[Steam] Leaderboard not found.");
        return;
    }
    _leaderboardHandle = result.m_hSteamLeaderboard;
    GD.Print("[Steam] Leaderboard ready.");
}
```

---

## Achievements

Stats sync automatically at Steam startup (Steamworks SDK 1.61+). No need to call `RequestCurrentStats()` manually before reading.

```csharp
public static class SteamAchievements
{
    /// <summary>Unlock achievement and upload to Steam immediately.</summary>
    public static void Unlock(string id)
    {
        if (!SteamManager.Initialized) return;

        SteamUserStats.SetAchievement(id);
        SteamUserStats.StoreStats(); // must call to persist
    }

    /// <summary>Returns true if achievement is already unlocked.</summary>
    public static bool IsUnlocked(string id)
    {
        if (!SteamManager.Initialized) return false;

        SteamUserStats.GetAchievement(id, out bool achieved);
        return achieved;
    }

    /// <summary>Reset achievement (development only).</summary>
    public static void Clear(string id)
    {
        if (!SteamManager.Initialized) return;

        SteamUserStats.ClearAchievement(id);
        SteamUserStats.StoreStats();
    }
}
```

---

## Stats

```csharp
// Write integer stat
SteamUserStats.SetStat("games_played", gamesPlayed);
SteamUserStats.StoreStats(); // upload to Steam

// Read integer stat
SteamUserStats.GetStat("games_played", out int count);

// Float stat
SteamUserStats.SetStat("total_distance_km", distance);
SteamUserStats.GetStat("total_distance_km", out float km);
```

Always call `StoreStats()` after setting stats. Avoid calling it every frame — batch updates and call once per session end or milestone.

---

## Leaderboards

Leaderboards require an async find-then-use flow. Cache the `SteamLeaderboard_t` handle after the first lookup.

```csharp
public partial class LeaderboardManager : Node
{
    private SteamLeaderboard_t _handle;
    private CallResult<LeaderboardFindResult_t> _findResult;
    private CallResult<LeaderboardScoreUploaded_t> _uploadResult;
    private CallResult<LeaderboardScoresDownloaded_t> _downloadResult;

    public void Initialize(string leaderboardName)
    {
        if (!SteamManager.Initialized) return;

        _findResult = CallResult<LeaderboardFindResult_t>.Create(OnFound);
        _findResult.Set(SteamUserStats.FindLeaderboard(leaderboardName));
    }

    private void OnFound(LeaderboardFindResult_t r, bool fail)
    {
        if (fail || r.m_bLeaderboardFound == 0) return;
        _handle = r.m_hSteamLeaderboard;
    }

    public void UploadScore(int score)
    {
        if (!SteamManager.Initialized || _handle == SteamLeaderboard_t.Invalid) return;

        _uploadResult = CallResult<LeaderboardScoreUploaded_t>.Create(OnUploaded);
        _uploadResult.Set(SteamUserStats.UploadLeaderboardScore(
            _handle,
            ELeaderboardUploadScoreMethod.k_ELeaderboardUploadScoreMethodKeepBest,
            score, null, 0));
    }

    public void DownloadTopScores(int count = 10)
    {
        if (!SteamManager.Initialized || _handle == SteamLeaderboard_t.Invalid) return;

        _downloadResult = CallResult<LeaderboardScoresDownloaded_t>.Create(OnDownloaded);
        _downloadResult.Set(SteamUserStats.DownloadLeaderboardEntries(
            _handle,
            ELeaderboardDataRequest.k_ELeaderboardDataRequestGlobal,
            1, count));
    }

    private void OnUploaded(LeaderboardScoreUploaded_t r, bool fail)
    {
        if (fail || r.m_bSuccess == 0) GD.PrintErr("[Steam] Score upload failed.");
        else GD.Print($"[Steam] Score {r.m_nScore} uploaded. New best: {r.m_bScoreChanged != 0}");
    }

    private void OnDownloaded(LeaderboardScoresDownloaded_t r, bool fail) { /* parse entries */ }
}
```

---

## Steam Overlay

```csharp
// Open store page for current game
SteamFriends.ActivateGameOverlay("store");

// Open a URL in the overlay browser
SteamFriends.ActivateGameOverlayToWebPage("https://store.steampowered.com/app/480");

// Listen for overlay open/close events
private Callback<GameOverlayActivated_t> _overlayActivated;

_overlayActivated = Callback<GameOverlayActivated_t>.Create(cb =>
{
    GD.Print($"[Steam] Overlay {(cb.m_bActive != 0 ? "opened" : "closed")}");
    GetTree().Paused = cb.m_bActive != 0; // pause during overlay
});
```

---

## User Info

```csharp
string name = SteamFriends.GetPersonaName();       // local user
CSteamID steamId = SteamUser.GetSteamID();         // CSteamID (ulong)
ulong steamId64 = steamId.m_SteamID;               // 64-bit Steam ID

// Friend's name
SteamFriends.GetFriendPersonaName(friendSteamId);
```

---

## Godot.Steamworks.NET Wrapper (Alternative)

If using the wrapper, the patterns simplify:

```csharp
// Check initialization
if (GodotSteamworks.Instance.IsInitialized) { }

// Achievements
GodotSteamworks.Instance.Achievements.Unlock("FIRST_WIN");

// Lobbies
GodotSteamworks.Lobby.CreateLobby();

// Fall through to raw API when needed
string name = SteamFriends.GetPersonaName();
```

---

## Testing in Editor

1. Place `steam_appid.txt` (containing your App ID or `480` for Spacewar) **next to the Godot editor executable**.
2. Start Steam and log in before running the editor.
3. The Steam overlay should appear in-game if everything is configured correctly.
4. Enable `OS.HasFeature("steam")` guard only in export builds — in editor, you typically want Steam always active during development.

For CI/CD: headless Steam is not supported for testing. Mock the Steam interface or use feature flags to skip `SteamAPI.Init()` in CI.

---

## Anti-patterns

- **Calling Steam APIs before `SteamManager.Initialized`** — always guard with `if (!SteamManager.Initialized) return;` at every call site.
- **Not storing `Callback<T>` as a field** — callbacks registered as local variables are garbage collected and stop firing silently.
- **Forgetting `SteamAPI.RunCallbacks()` every frame** — callbacks never fire without it; all async results stall indefinitely.
- **Calling `StoreStats()` every frame** — batch stat changes and call once per significant event or session end.
- **Accessing leaderboard before `FindLeaderboard` callback fires** — the `SteamLeaderboard_t` handle is `0` (Invalid) until the CallResult succeeds; always check.
- **Using GodotSteam plugin from C# via dynamic calls** — unsupported and fragile; use Steamworks.NET directly.
- **Mixing GodotSteam module + GodotSteam plugin** — results in duplicate calls and unpredictable errors; use one distribution method only.
- **Shipping `steam_appid.txt` in the final build** — this file is for development only; Steamworks reads the App ID from the Steam client in production.
- **Not handling `SteamAPI.Init()` returning false gracefully** — log the error clearly and disable all Steam-dependent features; never crash the game because Steam isn't running.
