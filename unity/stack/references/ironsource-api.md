# IronSource / LevelPlay — API Reference

> **Base path:** `Unity.Services.LevelPlay` (`com.unity.services.levelplay`)
> See also: [`ironsource.md`](../ironsource.md) — patterns, lifecycle, best practices

---

## LevelPlay (static class)

| Method / Event | Description |
|---|---|
| `Init(string appKey, string userId = null)` | Initialize SDK. Register callbacks first. |
| `event Action OnInitSuccess` | SDK ready — create ad objects here |
| `event Action OnInitFailed` | Initialization failed — retry later |
| `SetMetaData(string key, string value)` | Set SDK flag (e.g. `"is_test_suite"`, `"is_child_directed"`) |
| `SetMetaData(string key, string[] values)` | Set flag with multiple values |
| `SetDynamicUserId(string userId)` | User ID for server-to-server reward callbacks |
| `SetSegment(LevelPlaySegment segment)` | User segment for waterfall/bidding targeting |
| `SetConsent(bool consent)` | GDPR — set before `Init` |
| `SetPauseGame(bool pause)` | iOS only — pause game during fullscreen ads |
| `LaunchTestSuite()` | Launch integration verification UI (after `OnInitSuccess`) |

---

## LevelPlayRewardedAd

```csharp
// Constructor
LevelPlayRewardedAd(string adUnitId, Config config = null)

// Methods
void        LoadAd()
void        ShowAd(string placementName = null)
bool        IsAdReady()
LevelPlayReward GetReward(string placementName)
void        DestroyAd()
static bool IsPlacementCapped(string placementName)

// Events
event Action<LevelPlayAdInfo>                      OnAdLoaded
event Action<LevelPlayAdError>                     OnAdLoadFailed
event Action<LevelPlayAdInfo>                      OnAdDisplayed
event Action<LevelPlayAdInfo, LevelPlayAdError>    OnAdDisplayFailed
event Action<LevelPlayAdInfo, LevelPlayReward>     OnAdRewarded        // grant reward HERE
event Action<LevelPlayAdInfo>                      OnAdClosed
event Action<LevelPlayAdInfo>                      OnAdClicked
event Action<LevelPlayAdInfo>                      OnAdInfoChanged
```

---

## LevelPlayInterstitialAd

```csharp
// Constructor
LevelPlayInterstitialAd(string adUnitId, Config config = null)

// Methods
void        LoadAd()
void        ShowAd(string placementName = null)
bool        IsAdReady()
void        DestroyAd()
static bool IsPlacementCapped(string placementName)

// Events
event Action<LevelPlayAdInfo>                         OnAdLoaded
event Action<LevelPlayAdError>                        OnAdLoadFailed
event Action<LevelPlayAdInfo>                         OnAdDisplayed
event Action<LevelPlayAdDisplayInfoError>             OnAdDisplayFailed
event Action<LevelPlayAdInfo>                         OnAdClosed
event Action<LevelPlayAdInfo>                         OnAdClicked
event Action<LevelPlayAdInfo>                         OnAdInfoChanged
```

---

## LevelPlayBannerAd

```csharp
// Constructor
LevelPlayBannerAd(string adUnitId, Config config)   // Config is required

// Methods
void LoadAd()
void ShowAd()
void HideAd()
void DestroyAd()           // permanent — create a new instance to show again
void PauseAutoRefresh()
void ResumeAutoRefresh()

// Events
event Action<LevelPlayAdInfo>                   OnAdLoaded
event Action<LevelPlayAdError>                  OnAdLoadFailed
event Action<LevelPlayAdInfo>                   OnAdDisplayed
event Action<LevelPlayAdInfo, LevelPlayAdError> OnAdDisplayFailed
event Action<LevelPlayAdInfo>                   OnAdClicked
event Action<LevelPlayAdInfo>                   OnAdCollapsed
event Action<LevelPlayAdInfo>                   OnAdExpanded
event Action<LevelPlayAdInfo>                   OnAdLeftApplication
```

---

## Config Builders

```csharp
// Rewarded & Interstitial
new LevelPlayRewardedAd.Config.Builder()
    .SetBidFloor(double bidFloorUSD)   // minimum accepted bid in USD
    .Build()

// Banner (all fields optional except the builder itself)
new LevelPlayBannerAd.Config.Builder()
    .SetSize(LevelPlayAdSize size)
    .SetPosition(LevelPlayBannerPosition position)
    .SetDisplayOnLoad(bool display)          // auto-show after load
    .SetPlacementName(string name)
    .SetBidFloor(double bidFloor)
    .SetRespectSafeArea(bool respect)        // Android display cutouts
    .Build()
```

---

## Privacy Settings

```csharp
LevelPlay.SetConsent(bool consent)                                    // GDPR
LevelPlayPrivacySettings.SetCCPA(bool doNotSell)                      // CCPA
LevelPlayPrivacySettings.SetCOPPA(bool isChild)                       // COPPA
LevelPlay.SetMetaData("is_child_directed",                 "true")    // child-directed flag
LevelPlay.SetMetaData("is_deviceid_optout",                "true")    // no device ID
LevelPlay.SetMetaData("Google_Family_Self_Certified_SDKS", "true")    // mixed-audience apps
```

---

## Data Classes

```csharp
class LevelPlayAdInfo {
    string AdUnitId       { get; }
    string NetworkName    { get; }
    string PlacementName  { get; }
    double Bid            { get; }
    string AbTest         { get; }
    string EncryptedCPM   { get; }
}

class LevelPlayAdError {
    int    ErrorCode      { get; }
    string ErrorMessage   { get; }
}

class LevelPlayReward {
    string Name           { get; }
    int    Amount         { get; }
}

class LevelPlaySegment {
    string SegmentName      { get; set; }   // max 32 chars
    int    IsPaying         { get; set; }   // 0 or 1
    double IapTotal         { get; set; }   // 1–999999.99 USD
    long   UserCreationDate { get; set; }   // Unix time in milliseconds
    int    Level            { get; set; }
    void   SetCustom(string key, string value)  // up to 5 properties, max 32 chars each
}
```

---

## Enums

```csharp
// Ad sizes
LevelPlayAdSize.BANNER              // 320×50 dp  — standard leaderboard
LevelPlayAdSize.LARGE               // 320×90 dp
LevelPlayAdSize.MEDIUM_RECTANGLE    // 300×250 dp — MREC
LevelPlayAdSize.CreateAdaptiveAdSize()  // full-width × calculated height (SDK 8.8.0+)

// Banner positions
LevelPlayBannerPosition.TopLeft
LevelPlayBannerPosition.TopCenter
LevelPlayBannerPosition.TopRight
LevelPlayBannerPosition.CenterLeft
LevelPlayBannerPosition.Center
LevelPlayBannerPosition.CenterRight
LevelPlayBannerPosition.BottomLeft
LevelPlayBannerPosition.BottomCenter
LevelPlayBannerPosition.BottomRight
new LevelPlayBannerPosition(new Vector2(x, y))  // custom pixel offset
```

---

## Error Codes

| Code | Context | Meaning |
|------|---------|---------|
| 508 | All | Initialization failed — SDK not ready |
| 509 | Rewarded / Interstitial | No ads available to show |
| 510 | All | Load failed — server error |
| 520 | Rewarded / Interstitial | No internet connection |
| 524 | Rewarded / Interstitial | Placement frequency cap reached |
| 526 | Rewarded / Interstitial | Daily cap per session reached |
| 604 | Banner | Placement is capped |
| 605 | Banner | Exception while loading |
| 606 | Banner | No fill from any network |
| 626 | All | Invalid ad unit ID (check dashboard) |
| 1007 | All | Auction missing required info |
| 1035 | Interstitial | Empty waterfall — no networks configured |
| 1036 | Interstitial | Cannot show while another interstitial is already showing |
