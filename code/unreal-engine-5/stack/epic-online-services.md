---
version: 1.0.0
---

# Epic Online Services (EOS)

> **Scope**: Integration of Epic Online Services into UE5 via the Online Subsystem EOS plugin — SDK initialization, authentication flows, sessions, lobbies, voice chat, player data, achievements, leaderboards, and cross-platform account identity.
> **Load when**: integrating EOS into a UE5 project, setting up online multiplayer with EOS sessions or lobbies, implementing authentication for Epic or third-party accounts (Steam, Xbox, Device ID), adding achievements or leaderboards, enabling voice chat, configuring the EOS plugin in DefaultEngine.ini, debugging EOS callbacks not firing.

---

## Core Concepts

**Two integration layers in UE5 — choose one:**
- **Online Subsystem EOS (OSSv1)** — the stable, well-documented layer; maps to `IOnlineSubsystem`. Works in all UE5 versions.
- **Online Services EOS (OSSv2)** — the newer interface; requires UE 5.7+ for full functionality. Prefer OSSv1 for projects targeting UE 5.3–5.6.

**Two user identity types — never mix them:**
- `EOS_EpicAccountId` — tied to an Epic Games account. Required for friends list, presence, and the Epic Social Overlay.
- `EOS_ProductUserId` — game-scoped identity via the Connect Interface. Supports Steam, Xbox, PlayStation, Device ID, and other external providers. Required for Game Services. A player can have a `ProductUserId` without an Epic account.

**Two EOS service groups:**
- **Epic Account Services (EAS)**: Friends, Presence, Social Overlay — require `EOS_EpicAccountId`.
- **Game Services**: Sessions, Lobbies, Achievements, Leaderboards, Stats, Player Data Storage, P2P, Anti-Cheat, Voice — require `EOS_ProductUserId`.

**All EOS SDK calls are asynchronous.** Callbacks fire only when `EOS_Platform_Tick` is called. If tick is missing or throttled, no callbacks will ever fire.

---

## Initialization

Always initialize in this exact order — the Social Overlay must hook into the graphics pipeline before Direct3D is initialized:

```cpp
// 1. Initialize SDK — must be the very first EOS call
EOS_InitializeOptions InitOpts = {};
InitOpts.ApiVersion   = EOS_INITIALIZE_API_LATEST;
InitOpts.ProductName  = "MyGame";
InitOpts.ProductVersion = "1.0";
EOS_EResult InitResult = EOS_Initialize(&InitOpts);
check(InitResult == EOS_EResult::EOS_Success || InitResult == EOS_EResult::EOS_AlreadyConfigured);

// 2. Create platform handle — BEFORE Direct3D initialization (overlay requirement)
EOS_Platform_Options PlatformOpts = {};
PlatformOpts.ApiVersion          = EOS_PLATFORM_OPTIONS_API_LATEST;
PlatformOpts.ProductId           = "YOUR_PRODUCT_ID";
PlatformOpts.SandboxId           = "YOUR_SANDBOX_ID";
PlatformOpts.DeploymentId        = "YOUR_DEPLOYMENT_ID";
PlatformOpts.ClientCredentials.ClientId     = "YOUR_CLIENT_ID";
PlatformOpts.ClientCredentials.ClientSecret = "YOUR_CLIENT_SECRET";
EOS_HPlatform PlatformHandle = EOS_Platform_Create(&PlatformOpts);

// 3. Acquire interface handles from the platform handle
EOS_HAuth    AuthHandle    = EOS_Platform_GetAuthInterface(PlatformHandle);
EOS_HConnect ConnectHandle = EOS_Platform_GetConnectInterface(PlatformHandle);
EOS_HAchievements AchievementsHandle = EOS_Platform_GetAchievementsInterface(PlatformHandle);
EOS_HLeaderboards LeaderboardsHandle = EOS_Platform_GetLeaderboardsInterface(PlatformHandle);
```

**Tick every frame** — drives all async callbacks. Never skip or throttle below 100 ms:

```cpp
void AMyGameMode::Tick(float DeltaTime)
{
    Super::Tick(DeltaTime);
    EOS_Platform_Tick(PlatformHandle);
}
```

When using UE's Online Subsystem EOS plugin, ticking is handled automatically. Only call `EOS_Platform_Tick` manually when using the raw EOS C SDK directly.

---

## Authentication

### Two-step login (EAS + Game Services)

Most games need both identities — `EpicAccountId` for friends/overlay and `ProductUserId` for game services:

```cpp
// Step 1: Epic Account login (EAS)
EOS_Auth_Credentials Creds = {};
Creds.ApiVersion = EOS_AUTH_CREDENTIALS_API_LATEST;
Creds.Type       = EOS_LCT_AccountPortal;  // Use EOS_LCT_DevAuth in development, EOS_LCT_PersistentAuth for auto-login
EOS_Auth_LoginOptions LoginOpts = {};
LoginOpts.ApiVersion  = EOS_AUTH_LOGIN_API_LATEST;
LoginOpts.Credentials = &Creds;
EOS_Auth_Login(AuthHandle, &LoginOpts, this, OnAuthLoginCallback);

// Step 2: Inside OnAuthLoginCallback — copy ID Token, then do Connect login
EOS_Auth_CopyIdTokenOptions CopyOpts = {};
CopyOpts.ApiVersion = EOS_AUTH_COPYIDTOKEN_API_LATEST;
CopyOpts.AccountId  = EpicAccountId;  // From callback data
EOS_Auth_IdToken* IdToken = nullptr;
EOS_Auth_CopyIdToken(AuthHandle, &CopyOpts, &IdToken);  // Caller owns this — must Release

EOS_Connect_Credentials ConnectCreds = {};
ConnectCreds.ApiVersion = EOS_CONNECT_CREDENTIALS_API_LATEST;
ConnectCreds.Token      = IdToken->JsonWebToken;
ConnectCreds.Type       = EOS_ECT_EPIC_ID_TOKEN;
EOS_Connect_LoginOptions ConnectOpts = {};
ConnectOpts.ApiVersion  = EOS_CONNECT_LOGIN_API_LATEST;
ConnectOpts.Credentials = &ConnectCreds;
EOS_Connect_Login(ConnectHandle, &ConnectOpts, this, OnConnectLoginCallback);

EOS_Auth_IdToken_Release(IdToken);  // Release after Connect_Login call is made
```

### External platform login (Steam, Xbox, etc.)

```cpp
EOS_Auth_Credentials Creds = {};
Creds.ApiVersion   = EOS_AUTH_CREDENTIALS_API_LATEST;
Creds.Type         = EOS_LCT_ExternalAuth;
Creds.ExternalType = EOS_ECT_STEAM_SESSION_TICKET;
Creds.Token        = SteamSessionTicket;
```

### Handling new accounts (ContinuanceToken)

If `EOS_Connect_Login` callback data contains result `EOS_InvalidUser`, the player has no `ProductUserId` yet. A `ContinuanceToken` is provided — use it to create a new account:

```cpp
// Do NOT treat EOS_InvalidUser as an error — it means first-time login
if (Data->ResultCode == EOS_EResult::EOS_InvalidUser)
{
    EOS_Connect_CreateUserOptions CreateOpts = {};
    CreateOpts.ApiVersion        = EOS_CONNECT_CREATEUSER_API_LATEST;
    CreateOpts.ContinuanceToken  = Data->ContinuanceToken;
    EOS_Connect_CreateUser(ConnectHandle, &CreateOpts, this, OnCreateUserCallback);
}
```

---

## Sessions (UE OSSv1)

Access via the Online Subsystem interface — do not call raw EOS SDK session functions directly in UE projects using OSSv1:

```cpp
IOnlineSubsystem*  OSS     = Online::GetSubsystem(GetWorld());
IOnlineSessionPtr  Session = OSS->GetSessionInterface();
```

### Create a session

```cpp
TSharedRef<FOnlineSessionSettings> Settings = MakeShared<FOnlineSessionSettings>();
Settings->NumPublicConnections = 4;
Settings->bShouldAdvertise     = true;
Settings->bUsesPresence        = false;  // true only if joining via Epic Overlay / presence

// REQUIRED: at least one custom setting — FindSessions returns nothing without any filter
Settings->Settings.Add(
    FName(TEXT("GameMode")),
    FOnlineSessionSetting(FString(TEXT("Deathmatch")), EOnlineDataAdvertisementType::ViaOnlineService));

this->CreateDelegateHandle = Session->AddOnCreateSessionCompleteDelegate_Handle(
    FOnCreateSessionCompleteDelegate::CreateUObject(this, &UMyClass::OnCreateComplete));
Session->CreateSession(0, FName(TEXT("GameSession")), *Settings);

void UMyClass::OnCreateComplete(FName SessionName, bool bWasSuccessful)
{
    Session->ClearOnCreateSessionCompleteDelegate_Handle(this->CreateDelegateHandle);
    this->CreateDelegateHandle.Reset();
}
```

### Find sessions

```cpp
TSharedRef<FOnlineSessionSearch> Search = MakeShared<FOnlineSessionSearch>();
// Empty the default filters — EOS ignores open-ended searches
Search->QuerySettings.SearchParams.Empty();
Search->QuerySettings.Set(FName(TEXT("GameMode")), FString(TEXT("Deathmatch")), EOnlineComparisonOp::Equals);

// To include both listening and non-listening sessions, add empty __EOS_bListening filter
Search->QuerySettings.Set(FName(TEXT("__EOS_bListening")), FVariantData(), EOnlineComparisonOp::Equals);

this->FindDelegateHandle = Session->AddOnFindSessionsCompleteDelegate_Handle(
    FOnFindSessionsComplete::FDelegate::CreateUObject(this, &UMyClass::OnFindComplete, Search));
Session->FindSessions(0, Search);

void UMyClass::OnFindComplete(bool bWasSuccessful, TSharedRef<FOnlineSessionSearch> Search)
{
    Session->ClearOnFindSessionsCompleteDelegate_Handle(this->FindDelegateHandle);
    this->FindDelegateHandle.Reset();

    for (auto& Result : Search->SearchResults)
    {
        FString ConnectInfo;
        if (Result.IsValid() && Session->GetResolvedConnectString(Result, NAME_GamePort, ConnectInfo))
        {
            // Store Result and ConnectInfo — both needed for JoinSession
        }
    }
}
```

---

## Voice Chat (UE OSSv1)

```cpp
void UMyClass::SetupVoice()
{
    IVoiceChat*          VoiceChat = IVoiceChat::Get();
    this->VoiceChatUser            = VoiceChat->CreateUser();

    IOnlineIdentityPtr Identity  = Online::GetSubsystem(GetWorld())->GetIdentityInterface();
    TSharedPtr<const FUniqueNetId> UserId = Identity->GetUniquePlayerId(0);
    FPlatformUserId PlatformUserId = Identity->GetPlatformUserIdFromUniqueNetId(*UserId);

    VoiceChatUser->Login(
        PlatformUserId, UserId->ToString(), TEXT(""),
        FOnVoiceChatLoginCompleteDelegate::CreateUObject(this, &UMyClass::OnVoiceLoginComplete));
}

void UMyClass::BeginDestroy() override
{
    IVoiceChat* VoiceChat = IVoiceChat::Get();
    if (VoiceChatUser && VoiceChat)
    {
        VoiceChat->ReleaseUser(VoiceChatUser);  // Always release — prevents memory leak
        VoiceChatUser = nullptr;
    }
    Super::BeginDestroy();
}
```

Retrieve the associated lobby ID from a voice channel:

```cpp
for (const auto& ChannelName : VoiceChatUser->GetChannels())
{
    FString LobbyId = VoiceChatUser->GetSetting(
        FString::Printf(TEXT("__EOS_LobbyId:%s"), *ChannelName));
}
```

---

## Configuration (DefaultEngine.ini)

```ini
[OnlineSubsystemEOS]
bEnabled=True

[OnlineSubsystem]
DefaultPlatformService=EOS

[EpicOnlineServices]
ProductId=YOUR_PRODUCT_ID
SandboxId=YOUR_SANDBOX_ID
DeploymentId=YOUR_DEPLOYMENT_ID
ClientCredentialsId=YOUR_CLIENT_ID
ClientCredentialsSecret=YOUR_CLIENT_SECRET

; Enable 'Join' and 'Invite' in the Epic Social Overlay for sessions
PresenceAdvertises=Session

; Development only — address of the EOS Developer Authentication Tool (do not ship)
; DevAuthToolAddress=localhost:6300
```

Add to `Build.cs`:

```csharp
PrivateDependencyModuleNames.AddRange(new string[]
{
    "OnlineSubsystemEOS",
    "OnlineSubsystem",
    "OnlineSubsystemUtils",
});
```

---

## Memory Management (Raw SDK)

All raw EOS SDK functions follow these memory ownership conventions:

| Function verb | Memory owner | Required action |
|---|---|---|
| `Get` | SDK | Copy data **inside** the callback; never cache the pointer past callback return |
| `Copy` | Caller | Must call the corresponding `Release` function before SDK shutdown |
| Callback data | SDK | Valid **only** for the duration of the callback function |

```cpp
// Copy → caller owns → must Release
EOS_Auth_IdToken* IdToken = nullptr;
EOS_Auth_CopyIdToken(AuthHandle, &CopyOpts, &IdToken);
// ... use IdToken ...
EOS_Auth_IdToken_Release(IdToken);
```

---

## Best Practices

- **Tick every frame** — `EOS_Platform_Tick` must not be throttled below 100 ms; missing ticks cause callbacks to never fire, making async calls appear to hang indefinitely.
- **Set `ApiVersion` explicitly** — always initialize options structs with `EOS_XXX_API_LATEST`; when upgrading the SDK, pin to a specific version to avoid silent breaking changes.
- **Prefer `ProductUserId` for game logic** — use `EpicAccountId` only when explicitly targeting friends list or Social Overlay features.
- **Use UE 5.3+** for any P2P networking — SDK 1.16 (bundled in UE 5.3) contains a mandatory WebRTC security fix; earlier SDK versions are vulnerable.
- **Handle `EOS_InvalidUser` from Connect Login** — this is expected on first login; create a new account with `ContinuanceToken` rather than treating it as a hard error.
- **Store delegate handles in member variables** — reset them inside the callback; a dangling handle can fire a callback on a destroyed object.
- **Never set `ClientCredentialsSecret` to an empty string** — the EOS plugin silently skips loading all online features without logging an error.

---

## Anti-patterns

- **No `EOS_Platform_Tick` call** — callbacks never fire; all async operations appear to hang forever.
- **Caching pointers from `Get` functions past the callback** — the SDK frees that memory when the callback returns; dereferencing the pointer causes a crash.
- **Omitting `Release` on `Copy` results** — causes memory leaks that accumulate across sessions.
- **Creating sessions without any custom settings** — `FindSessions` returns zero results; EOS requires at least one filter attribute to run a query.
- **Initializing Direct3D before `EOS_Platform_Create`** — the Social Overlay cannot hook into the graphics pipeline and will not render.
- **Empty `ClientCredentialsSecret`** — the EOS plugin loads but silently disables all online features; no error is logged.
- **Placing console SDK binaries inside the main plugin folder** — UBT emits a build warning; console support code must remain in a separate, platform-specific folder.
- **Confusing `EOS_EpicAccountId` with `EOS_ProductUserId`** — they are not interchangeable; Game Services APIs require `ProductUserId` and will fail silently if given `EpicAccountId`.
- **Ignoring the `__EOS_bListening` filter** — omitting this when searching causes the query to match only one type of session; include an empty-value filter to discover both listening and non-listening sessions.