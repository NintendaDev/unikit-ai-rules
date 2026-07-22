---
version: 1.0.0
---

# Google Play Games Plugin for Godot

> **Scope**: Integration of Google Play Game Services (achievements, leaderboards, sign-in, cloud saves) into Godot 4 Android projects using the `godot-play-game-services` plugin — covers installation, credential configuration, C# wrapper patterns, node lifecycle, and troubleshooting authentication errors.
> **Load when**: integrating Google Play Game Services in Godot 4, implementing Android achievements or leaderboards, setting up sign-in via Google Play, configuring OAuth2 credentials for Android export, debugging DEVELOPER_ERROR or authentication failures, using the godot-play-game-services plugin with C#.

---

## Core Concepts

- **Plugin**: `godot-play-game-services` by `godot-sdk-integrations` (Godot 4.3+, Android API 34+, Google Play Game Services SDK v20.1.2).
- **Node-based architecture**: the plugin exposes feature nodes (`SignIn`, `Leaderboards`, `Achievements`, `Snapshots`) rather than autoloads. Only the main `GodotPlayGamesServices` node is registered as an autoload — it requires manual initialization.
- **No automatic sign-in**: the plugin does not perform authentication on startup. You must trigger sign-in explicitly.
- **Game ID**: the unique identifier from Google Play Console. Set it once via the editor dock (bottom panel). Never change it accidentally before a build — a wrong Game ID silently breaks all Google Play Game Services features.
- **Custom Gradle build**: mandatory. The plugin does not work with the default Godot Android export.

---

## Installation

1. Download `addons.zip` from GitHub releases or install from the Godot Asset Store.
2. Extract to `[project root]/addons/GodotPlayGameServices/`.
3. Enable via `Project > Project Settings > Plugins`.
4. Install the Android build template: `Project > Install Android Build Template...`.
5. Enter the Game ID in the editor dock (bottom panel).

---

## Google Console Setup

1. Create a Google Developer account (one-time payment required).
2. Create a **game** (not just an app) in Google Play Console.
3. Configure Games Services — add achievements and leaderboards to generate their IDs.
4. Note the **Game ID** from the Games Services configuration.
5. Create an **OAuth2 Android client** in Google Cloud Console:
   - Set the package name to match your Godot project's Android package name exactly.
   - Provide the SHA-1 fingerprint of your signing keystore.

---

## Credential Strategy

Always maintain **three separate OAuth2 Android clients**:

| Credential | Keystore | Use |
|---|---|---|
| Debug | Godot default debug keystore | Local development & testing |
| Release | Your release keystore | Release builds before upload |
| Play Store | Google-managed upload key | Production builds on Play Store |

The Play Store SHA-1 is not your keystore's SHA-1 — Google signs the APK with its own certificate after upload. Find it in Play Console under `Release > Setup > App signing`.

---

## Export Configuration

In `Project > Export > Android`:
- Enable **Custom Gradle Build**.
- Set the correct **package name** (must match the OAuth2 client registration).
- Configure the signing keystore that matches the OAuth2 client you're testing with.

Use the **debug** credential set during development. Switch to the **Play Store** credential set for production.

---

## C# Wrapper Pattern

Since the plugin is written in GDScript, access it from C# via `Engine.GetSingleton` and `GodotObject.Call`. Wrap it in a service node to keep the rest of the codebase decoupled:

```csharp
public partial class PlayGamesService : Node
{
    private const string PluginName = "GodotPlayGameServices";

    public GodotObject Plugin { get; private set; }

    // Expose C# events for game code to subscribe to
    public delegate void AuthenticatedHandler(bool isAuthenticated);
    public event AuthenticatedHandler UserAuthenticated;

    public override void _Ready()
    {
        if (Engine.HasSingleton(PluginName))
        {
            Plugin = Engine.GetSingleton(PluginName);
            Plugin.Call("initialize");

            Plugin.Connect("userAuthenticated",
                Callable.From<bool>(authenticated => UserAuthenticated?.Invoke(authenticated)));
        }
        else
        {
            GD.PrintErr($"[PlayGamesService] Plugin '{PluginName}' not found. " +
                        "Ensure you are running on Android with the plugin enabled.");
        }
    }

    public void SignIn() => Plugin?.Call("signIn");

    public void IsAuthenticated() => Plugin?.Call("isAuthenticated");

    public void UnlockAchievement(string achievementId) =>
        Plugin?.Call("unlockAchievement", achievementId);

    public void IncrementAchievement(string achievementId, int steps) =>
        Plugin?.Call("incrementAchievement", achievementId, steps);

    public void ShowAchievements() => Plugin?.Call("showAchievements");

    public void SubmitScore(string leaderboardId, long score) =>
        Plugin?.Call("submitScore", leaderboardId, score);

    public void ShowLeaderboard(string leaderboardId) =>
        Plugin?.Call("showLeaderboard", leaderboardId);

    public void ShowAllLeaderboards() => Plugin?.Call("showAllLeaderboards");
}
```

**Rules for the C# wrapper:**
- Always guard plugin calls with `Plugin?.Call(...)` (null-safe) — `Plugin` is null when running outside Android.
- Check `Engine.HasSingleton(PluginName)` in `_Ready` before calling `initialize`. Print an error if not found.
- Translate GDScript signals into C# events inside the wrapper so game code uses typed C# delegates, not raw `Connect`.
- Use `Callable.From<T>` for type-safe lambda signal connections instead of `new Callable(this, nameof(...))`.

---

## Sign-In Flow

Sign-in is not automatic — trigger it explicitly after initialization:

```csharp
// In your game's startup flow:
_playGamesService.UserAuthenticated += OnUserAuthenticated;
_playGamesService.IsAuthenticated(); // Check if already signed in
// If not authenticated, call SignIn() on user action or startup

private void OnUserAuthenticated(bool isAuthenticated)
{
    if (isAuthenticated)
    {
        GD.Print("Signed in to Google Play Games.");
        // Enable achievements/leaderboard UI
    }
    else
    {
        GD.Print("Not signed in. Optionally prompt user.");
    }
}
```

- Call `IsAuthenticated()` on startup to restore a previous session silently.
- Only call `SignIn()` in response to a user action (button tap) if `IsAuthenticated()` returns false.
- Design game features to work without sign-in — never block gameplay on authentication.

---

## Feature Nodes

The plugin exposes feature functionality via nodes available in the **Create New Node** dialog:

| Node | Purpose |
|---|---|
| `SignIn` | Authentication with Google Play |
| `Achievements` | Unlock, increment, reveal, and display achievements |
| `Leaderboards` | Submit scores, load rankings, display boards |
| `Snapshots` | Cloud save — save, load, and delete game state |

Add these as children of a manager node or use the singleton wrapper pattern described above.

---

## Best Practices

- **Never call Play Games methods when `Plugin == null`** — use `Plugin?.Call(...)` everywhere. Running in the Godot editor or on non-Android platforms always produces a null plugin.
- **Keep Game ID constant** — set it once, never change it without a deliberate decision. A Game ID change invalidates all linked achievements and leaderboards.
- **Three-credential setup from day one** — debug, release, and Play Store credentials should be configured before first test build. Adding them retroactively breaks in-progress testing.
- **Verify method names against the installed plugin version** — method names differ between major plugin versions. Always check the GDScript source or Godot Editor documentation browser for the installed version, not older tutorials.
- **Use editor documentation** — the GDScript API is documented inline. In Godot Editor, open the Script tab and use the doc search to look up available methods and signals for the plugin's nodes.
- **Test on a physical Android device** — Google Play Game Services does not work in the Godot editor or Android emulator. All testing requires a real device.
- **Use `adb logcat` to diagnose auth failures** — authentication errors always surface in `adb` logs before they appear in Godot's output. Filter by `GodotPlayGameServices`.

---

## Anti-patterns

- **Relying on automatic sign-in** — the plugin does not auto-authenticate. Calling feature methods before an explicit `initialize` + `signIn` flow causes silent failures.
- **Single OAuth2 credential for all build types** — using your release keystore's SHA-1 for the Play Store credential causes DEVELOPER_ERROR. The Play Store re-signs your APK; you need a credential for its certificate.
- **Skipping the consent screen setup for test accounts** — if the Google Cloud project audience is set to Internal, test accounts outside the organization cannot sign in. Set it to External + Testing and add test emails.
- **Calling plugin methods in the editor** — the plugin singleton only exists on Android. Any unconditional call at startup crashes the editor. Always guard with `Engine.HasSingleton(PluginName)`.
- **Hardcoding achievement/leaderboard IDs as magic strings** — define them as constants in a dedicated class to avoid typos and make future ID changes trackable.

---

## Troubleshooting

### DEVELOPER_ERROR on sign-in

**Cause**: Package name or SHA-1 fingerprint does not match the registered OAuth2 Android client.

**Diagnosis**: Run `adb logcat` and look for:
```
APP NOT CORRECTLY CONFIGURED TO USE GOOGLE PLAY GAME SERVICES
Package name and certificate fingerprint do not match client ID
```

**Fix**:
1. Confirm the Godot export package name matches the OAuth2 client exactly.
2. Confirm the keystore SHA-1 in Godot export settings matches the OAuth2 client in Google Cloud.
3. If testing a Play Store build, add a separate OAuth2 client with the Play Store SHA-1 (from `Release > Setup > App signing`).

### ClassNotFoundException / silent sign-in failure

**Cause**: Google Cloud project audience is set to Internal, blocking test accounts.

**Fix**:
1. Go to Google Cloud Console > APIs & Services > OAuth consent screen > Audience.
2. Change Publishing Status to External > Testing.
3. Add test account emails to the Test users list.

### "Nonexistent function" error from `Plugin.Call`

**Cause**: Method name used in C# code does not match the installed plugin version's GDScript API.

**Fix**: Open the installed plugin's GDScript source in Godot Editor, find the correct method name for your installed version. Do not rely on tutorials written for older versions.
