---
version: 1.0.0
---

# Online Subsystem / Online Services

> **Scope**: Unreal Engine's Online Subsystem (OSSv1) and Online Services (OSSv2) — session creation and lifecycle, asynchronous delegate patterns, multi-OSS configuration, platform identity and friends interfaces, and the architectural trade-offs between the two API generations.
> **Load when**: implementing multiplayer sessions, configuring EOS or Steam integration, working with IOnlineSession or ISessions, debugging session creation or matchmaking, setting up lobby or presence systems, choosing between Online Subsystem and Online Services, integrating online platform services into a UE5 game.

---

## Core Concepts

**Online Subsystem (OSSv1)** — the established plugin (`OnlineSubsystem`) that abstracts Steam, EOS, Xbox Live, PlayStation Network, and other backends behind a unified C++ interface. Stable and production-proven.

**Online Services (OSSv2)** — the modern replacement (`OnlineServicesInterface`), lives in `UE::Online` namespace. More modular, cleaner API, but still maturing. Prefer OSSv1 in production until OSSv2 stabilizes.

**Null subsystem** — ships with the engine; supports LAN/direct-IP only. Use it for development and local testing. Cannot host internet-visible sessions without an external master server.

**OSSv1 vs OSSv2 decision rule:**
- Use **OSSv1** for any production title or platform-specific integration (Steam, Xbox, PlayStation).
- Use **OSSv2** only if the project is EOS-only and can tolerate ongoing API changes.

---

## Architecture

OSS is a **plugin-based, single-instance-per-platform** system. One `IOnlineSubsystem` instance exists per loaded subsystem. All operations are asynchronous — results arrive via delegates.

```
Game Code
    └── UGameInstanceSubsystem (session manager)
            └── AGameSession            ← game-specific wrapper
                    └── IOnlineSession  ← platform interface (server-only)
                            └── Platform Backend (EOS SDK / Steam SDK)
```

### OSSv1 Key Interfaces

| Interface | Access method | Purpose |
|-----------|--------------|---------|
| `IOnlineSession` | `GetSessionInterface()` | Session create/find/join/destroy |
| `IOnlineFriends` | `GetFriendsInterface()` | Friends list, invites |
| `IOnlineIdentity` | `GetIdentityInterface()` | Login, auth tokens, user IDs |
| `IOnlinePresence` | `GetPresenceInterface()` | Rich presence / status |
| `IOnlineLeaderboards` | `GetLeaderboardsInterface()` | Read/write leaderboards |
| `IOnlineAchievements` | `GetAchievementsInterface()` | Unlock and query achievements |
| `IOnlineVoice` | `GetVoiceInterface()` | In-game VOIP |
| `IOnlineExternalUI` | `GetExternalUIInterface()` | Platform overlays (invite, store) |

**Not all interfaces are implemented on every platform.** Always null-check before use.

### OSSv2 Key Interfaces (`UE::Online` namespace)

`IAuth`, `ISessions`, `ILobbies`, `IPresence`, `ILeaderboards`, `IStats`, `ISocial`, `IUserInfo`, `IConnectivity`, `IPrivileges`, `IExternalUI`, `ICommerce`, `IAchievements`, `ITitleFile`, `IUserFile`

Access via `UE::Online::GetServices<UE::Online::IOnlineServices>(GetWorld())`.

---

## Configuration

### DefaultEngine.ini

```ini
[OnlineSubsystem]
DefaultPlatformService=EOS   ; or Steam, Null, EOSPlus

[OnlineSubsystemEOS]
bEnabled=true
; Client credentials set in project settings — restart editor after changing them

[OnlineSubsystemSteam]
bEnabled=true
bRelaunchInSteam=false
GameVersion=1

; For multi-OSS: enable all needed backends
[OnlineSubsystemPlayFab]
bEnabled=true
```

**EOS-specific:** Credential names are **case-sensitive** (`Context_1`, `Context_2`). Settings changes in Project Settings do not take effect in the running editor — always restart.

### Build.cs

```csharp
PrivateDependencyModuleNames.AddRange(new string[]
{
    "OnlineSubsystem",
    "OnlineSubsystemUtils",   // always include — provides world-aware helpers
    // Add one or more of:
    // "OnlineSubsystemEOS",
    // "OnlineSubsystemSteam",
    // "OnlineSubsystemNull",
});
```

`OnlineSubsystemUtils` is mandatory when using world-aware access — do not omit it.

---

## Asynchronous Delegate Pattern

Every OSSv1 operation is asynchronous. The pattern is always:
**Register delegate → Call operation → Receive callback → Clear delegate.**

```cpp
// Header
FDelegateHandle CreateSessionHandle;

// Before the async call — register
IOnlineSessionPtr Sessions = Online::GetSessionInterface(GetWorld());

CreateSessionHandle = Sessions->AddOnCreateSessionCompleteDelegate_Handle(
    FOnCreateSessionCompleteDelegate::CreateUObject(
        this, &UMySessionSubsystem::OnCreateSessionComplete));

// Initiate the async operation
Sessions->CreateSession(0, NAME_GameSession, SessionSettings);

// Callback — always clear the delegate first
void UMySessionSubsystem::OnCreateSessionComplete(FName SessionName, bool bWasSuccessful)
{
    IOnlineSessionPtr Sessions = Online::GetSessionInterface(GetWorld());
    Sessions->ClearOnCreateSessionCompleteDelegate_Handle(CreateSessionHandle);

    if (!bWasSuccessful) { /* handle error */ return; }
    // Proceed to next step only after confirmation
}
```

**Rules:**
- Store every `FDelegateHandle` returned by `AddOn*_Handle` — without it you cannot clear the delegate.
- Clear the delegate **inside the callback**, not outside.
- Never chain a second async call without receiving the first callback.
- Timeout can be up to ~60 seconds — design UI accordingly.

---

## Session Lifecycle

Full lifecycle: **Create → (Update) → Start → End → Destroy**

```
CreateSession ──> [wait] ──> StartSession ──> [match plays] ──> EndSession ──> DestroySession
                                                                                      │
                                                           Destroy before creating again!
```

- Call `UpdateSession()` between matches to change settings (map, mode) without destroying.
- Cache `FOnlineSessionSettings` so `UpdateSession` can reuse it.
- Always **destroy** the current session before creating a new one — stale sessions block all future `CreateSession` calls.

### FOnlineSessionSettings Quick Reference

```cpp
FOnlineSessionSettings Settings;
Settings.NumPublicConnections = 4;
Settings.bIsLANMatch          = false;   // true for NULL subsystem testing
Settings.bUsesPresence        = true;    // needed for FindSessions with SEARCH_PRESENCE
Settings.bAllowJoinInProgress = true;
Settings.bShouldAdvertise     = true;    // visible in search results
Settings.bUseLobbiesIfAvailable = true; // prefer Lobby API when backend supports it
Settings.Set(SETTING_MAPNAME, FString("MyMap"), EOnlineDataAdvertisementType::ViaOnlineService);
```

---

## Session Operations

### Create Session

```cpp
void UMySessionSubsystem::CreateGameSession(int32 NumPlayers)
{
    IOnlineSessionPtr Sessions = Online::GetSessionInterface(GetWorld());
    if (!Sessions) return;

    // Destroy any existing session first
    if (Sessions->GetNamedSession(NAME_GameSession))
    {
        Sessions->DestroySession(NAME_GameSession);
        return; // handle in OnDestroySessionComplete, then create
    }

    FOnlineSessionSettings Settings;
    Settings.NumPublicConnections = NumPlayers;
    Settings.bShouldAdvertise     = true;
    Settings.bUsesPresence        = true;

    CreateSessionHandle = Sessions->AddOnCreateSessionCompleteDelegate_Handle(
        FOnCreateSessionCompleteDelegate::CreateUObject(this, &UMySessionSubsystem::OnCreateSessionComplete));
    Sessions->CreateSession(0, NAME_GameSession, Settings);
}
```

### Find Sessions

```cpp
void UMySessionSubsystem::FindSessions()
{
    IOnlineSessionPtr Sessions = Online::GetSessionInterface(GetWorld());
    if (!Sessions) return;

    SearchSettings = MakeShareable(new FOnlineSessionSearch());
    SearchSettings->MaxSearchResults = 20;
    SearchSettings->bIsLanQuery      = false;
    SearchSettings->QuerySettings.Set(SEARCH_PRESENCE, true, EOnlineComparisonOp::Equals);

    FindSessionsHandle = Sessions->AddOnFindSessionsCompleteDelegate_Handle(
        FOnFindSessionsCompleteDelegate::CreateUObject(this, &UMySessionSubsystem::OnFindSessionsComplete));
    Sessions->FindSessions(0, SearchSettings.ToSharedRef());
}
```

**Note:** `FOnlineSessionSearchResult` cannot be exposed to Blueprint — wrap in a custom `USTRUCT` for Blueprint-facing APIs.

### Join Session

```cpp
void UMySessionSubsystem::JoinGameSession(const FOnlineSessionSearchResult& Result)
{
    IOnlineSessionPtr Sessions = Online::GetSessionInterface(GetWorld());
    if (!Sessions) return;

    JoinSessionHandle = Sessions->AddOnJoinSessionCompleteDelegate_Handle(
        FOnJoinSessionCompleteDelegate::CreateUObject(this, &UMySessionSubsystem::OnJoinSessionComplete));
    Sessions->JoinSession(0, NAME_GameSession, Result);
}

void UMySessionSubsystem::OnJoinSessionComplete(FName SessionName, EOnJoinSessionCompleteResult::Type Result)
{
    Online::GetSessionInterface(GetWorld())->ClearOnJoinSessionCompleteDelegate_Handle(JoinSessionHandle);
    if (Result != EOnJoinSessionCompleteResult::Success) return;

    // Travel to server
    APlayerController* PC = GetGameInstance()->GetFirstLocalPlayerController();
    FString URL;
    if (PC && Online::GetSessionInterface(GetWorld())->GetResolvedConnectString(SessionName, URL))
    {
        PC->ClientTravel(URL, ETravelType::TRAVEL_Absolute);
    }
}
```

---

## Accessing the Subsystem

Always prefer the **world-aware** helper from `OnlineSubsystemUtils`:

```cpp
// PREFERRED — handles multiple worlds in PIE correctly
#include "OnlineSubsystemUtils.h"
IOnlineSessionPtr Sessions = Online::GetSessionInterface(GetWorld());

// FALLBACK — use only when GetWorld() is unavailable (e.g., static context)
IOnlineSubsystem* OSS = IOnlineSubsystem::Get();               // default OSS
IOnlineSubsystem* Steam = IOnlineSubsystem::Get(FName("Steam")); // named OSS
```

Always null-check the returned pointer — the subsystem may not be loaded or initialized.

---

## Multi-OSS Pattern

Run multiple backends simultaneously: a primary OSS for matchmaking and a platform OSS for native features.

```cpp
// Access a specific non-default subsystem by name
IOnlineSubsystem* PlatformOSS = IOnlineSubsystem::Get(FName("Steam"));
IOnlineSubsystem* BackendOSS  = IOnlineSubsystem::Get(FName("PlayFab"));
```

**Pattern:**
- Create a `USessionManagerSubsystem` (or similar) that wraps all OSS calls.
- Use `DefaultPlatformService` in INI for the primary matchmaking backend.
- Use named access (`IOnlineSubsystem::Get(FName("Steam"))`) for platform overlays and friends.
- Guard platform-specific calls with availability checks — `GetFriendsInterface()` returns `nullptr` on unsupported platforms.

---

## Online Services (OSSv2) Overview

OSSv2 lives in `Engine/Plugins/Online/OnlineBase` (shared code) and `Engine/Plugins/Online/OnlineServicesInterface`.

```cpp
#include "Online/OnlineServices.h"
#include "Online/Auth.h"
#include "Online/Sessions.h"

UE::Online::IOnlineServicesPtr Services = UE::Online::GetServices(GetWorld());
if (Services)
{
    UE::Online::IAuthPtr Auth = Services->GetAuthInterface();
    // Async ops return TOnlineResult / TOnlineAsyncOp handles instead of delegates
}
```

**When to use OSSv2:**
- EOS-only projects on UE 5.4+
- When Lobby API is preferred over traditional sessions (OSSv2 `ILobbies` is more natural)
- New projects that can absorb API churn

**When to stick with OSSv1:**
- Any platform requiring Steam / Xbox / PlayStation integration
- Existing codebases with established OSS usage
- Production titles that cannot tolerate in-flight API changes

The `OnlineBase` plugin contains adapter code (`SessionsOSSAdapter`) bridging OSSv2 events back to OSSv1 event system — useful during a staged migration.

---

## Best Practices

- **Manage sessions in a `UGameInstanceSubsystem`** — persists across level transitions, clean ownership, accessible from anywhere.
- **Use `NAME_GameSession`** as the standard session name for all regular gameplay sessions.
- **Always destroy before creating** — check `GetNamedSession(NAME_GameSession)` and destroy if present before calling `CreateSession`.
- **Cache `FOnlineSessionSettings`** as a member variable so `UpdateSession` can modify and reuse it.
- **Wrap `FOnlineSessionSearchResult`** in a `USTRUCT` if any Blueprint layer needs to store or pass it.
- **Use `SEARCH_PRESENCE`** query setting when searching for player-hosted sessions (not dedicated servers).
- **Set `bUseLobbiesIfAvailable = true`** in session settings — EOS and newer platforms prefer lobby API over traditional sessions; the subsystem handles the mapping automatically.
- **Test with multiple PIE instances** — always use world-aware helpers; single-world helpers silently return the wrong interface in multi-world PIE.

---

## Anti-patterns

- **Ignoring delegate callbacks** — calling `FindSessions` immediately after `CreateSession` without waiting for `OnCreateSessionComplete` causes undefined behavior.
- **Not clearing delegates via `FDelegateHandle`** — leaks bindings; callbacks fire multiple times on subsequent operations.
- **Using `IOnlineSubsystem::Get()` without null-check** — returns `nullptr` when no subsystem is loaded (common in editor contexts without configuration).
- **Not destroying stale sessions** — `CreateSession` fails silently if `NAME_GameSession` already exists; previous session must be destroyed first.
- **Hardcoding platform-specific logic** — use feature flags in INI or runtime interface checks instead.
- **Storing `FOnlineSessionSearchResult` as `UPROPERTY`** — it is not a UOBJECT and cannot be reflected; crashes the Blueprint VM.
- **Treating EOS credential names as case-insensitive** — they are case-sensitive. `Context_1` ≠ `context_1`.
- **Not restarting the editor after EOS settings changes** — EOS plugin reads its credentials at startup; in-session changes have no effect.
- **Accessing `IOnlineSession` directly from `AGameMode`** — prefer `AGameSession` as the game-layer wrapper; direct access bypasses game-specific session configuration.