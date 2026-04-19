---
version: 1.0.0
---

# IronSource / LevelPlay

> **Scope**: IronSource LevelPlay ad monetization SDK for Unity — initialization lifecycle, rewarded/interstitial/banner ad patterns, mediation setup, privacy compliance, and revenue optimization.
> **Load when**: integrating IronSource or LevelPlay ads, loading rewarded video ads, showing interstitial or banner ads, handling ad callbacks, configuring ad mediation, GDPR or COPPA compliance for ads, debugging ad load failures or reward delivery.
> **References**: `.unikit/memory/stack/references/ironsource-api.md` (API lookup — all classes, methods, events, enums, error codes)

---

## Core Concepts

- **LevelPlay** — Unity's re-branded name for the IronSource mediation platform. Package: `com.unity.services.levelplay` (v9.4.0+). Namespace: `using Unity.Services.LevelPlay;`
- **Ad Unit ID** — identifier assigned per ad format per platform in the LevelPlay dashboard. Must match exactly (case-sensitive).
- **Mediation** — LevelPlay loads from multiple ad networks in priority order (waterfall) or real-time auction (in-app bidding), then serves the highest-paying ad.
- **Placement** — a named configuration in the dashboard that applies frequency caps and reward rules on top of an ad unit.
- All ad callbacks fire on the **main thread** — UI updates inside callbacks are safe.

---

## Setup

**Package**: Window → Package Manager → search "Ads Mediation" → Install `com.unity.services.levelplay`

**Minimum requirements**: Android API 19+ / iOS 13+ / Xcode 16+

**Network adapters**: Window → Ads Mediation → Network Manager → install adapters → Assets → Mobile Dependency Manager → Android Resolver → Resolve

---

## Initialization

Always register `OnInitSuccess`/`OnInitFailed` **before** calling `Init`. Create ad objects only inside `OnInitSuccess`.

```csharp
void Start()
{
    LevelPlay.OnInitSuccess += OnSdkInitialized;
    LevelPlay.OnInitFailed  += OnSdkInitFailed;
    LevelPlay.Init("YourAppKey");           // optional: second arg is userId
}

void OnSdkInitialized()
{
    CreateRewardedAd();
    CreateInterstitialAd();
    CreateBannerAd();
}

void OnSdkInitFailed()
{
    Invoke(nameof(Start), 5f);              // retry after delay
}
```

**Application lifecycle** — add to every MonoBehaviour that manages ads:

```csharp
void OnApplicationPause(bool isPaused) =>
    IronSource.Agent.onApplicationPause(isPaused);
```

**Test mode** — call before `Init`, then launch test UI after `OnInitSuccess`:

```csharp
LevelPlay.SetMetaData("is_test_suite", "enable");
LevelPlay.Init("YourAppKey");
// inside OnSdkInitialized:
LevelPlay.LaunchTestSuite();
```

**Editor mock ads** — use `"editor"` as appKey and `"editor_banner"` / `"editor_interstitial"` / `"editor_rewarded"` as ad unit IDs during development.

---

## Rewarded Ads

Grant reward only in `OnAdRewarded` — it may fire **after** `OnAdClosed`.

```csharp
void CreateRewardedAd()
{
    _rewardedAd = new LevelPlayRewardedAd("rewardedAdUnitId");
    _rewardedAd.OnAdLoaded       += (info)          => { /* ready — can show */ };
    _rewardedAd.OnAdLoadFailed   += (error)         => { /* log error.ErrorCode; retry later */ };
    _rewardedAd.OnAdRewarded     += (info, reward)  => GrantReward(reward.Name, reward.Amount);
    _rewardedAd.OnAdClosed       += (info)          => _rewardedAd.LoadAd(); // preload next
    _rewardedAd.OnAdDisplayFailed+= (info, error)   => { /* log; offer retry */ };
    _rewardedAd.LoadAd();
}
```

**Show pattern** — always check readiness and capping:

```csharp
void TryShowRewarded(string placement = null)
{
    if (!_rewardedAd.IsAdReady()) return;
    if (placement != null && LevelPlayRewardedAd.IsPlacementCapped(placement)) return;
    _rewardedAd.ShowAd(placement);
}
```

**Dynamic reward info** — retrieve after `OnInitSuccess` to build UI copy:

```csharp
LevelPlayReward reward = _rewardedAd.GetReward("placement_name");
if (reward.Amount > 0)
    rewardButton.text = $"Watch to earn {reward.Amount} {reward.Name}";
```

---

## Interstitial Ads

Show at natural transition points only (level complete, back to menu). Never on every user action.

```csharp
void CreateInterstitialAd()
{
    _interstitialAd = new LevelPlayInterstitialAd("interstitialAdUnitId");
    _interstitialAd.OnAdLoaded       += (info)        => { };
    _interstitialAd.OnAdLoadFailed   += (error)       => { };
    _interstitialAd.OnAdDisplayFailed+= (info, error) => { };
    _interstitialAd.OnAdClosed       += (info)        => _interstitialAd.LoadAd();
    _interstitialAd.LoadAd();
}

void TryShowInterstitial(string placement = null)
{
    if (!_interstitialAd.IsAdReady()) return;
    if (placement != null && LevelPlayInterstitialAd.IsPlacementCapped(placement)) return;
    _interstitialAd.ShowAd(placement);
}
```

---

## Banner Ads

```csharp
void CreateBannerAd()
{
    var config = new LevelPlayBannerAd.Config.Builder()
        .SetSize(LevelPlayAdSize.BANNER)
        .SetPosition(LevelPlayBannerPosition.BottomCenter)
        .SetDisplayOnLoad(true)
        .SetRespectSafeArea(true)        // handles Android display cutouts
        .Build();

    _bannerAd = new LevelPlayBannerAd("bannerAdUnitId", config);
    _bannerAd.OnAdLoaded     += (info)        => { };
    _bannerAd.OnAdLoadFailed += (error)       => { };
    _bannerAd.LoadAd();
}
```

**Available sizes**: `BANNER` (320×50 dp), `LARGE` (320×90 dp), `MEDIUM_RECTANGLE` (300×250 dp), `CreateAdaptiveAdSize()`.

**Lifecycle after creation**:

```csharp
_bannerAd.HideAd();           // hide without destroying
_bannerAd.ShowAd();           // show again
_bannerAd.PauseAutoRefresh(); // pause refresh (e.g. during loading screen)
_bannerAd.ResumeAutoRefresh();
_bannerAd.DestroyAd();        // permanent — create a new instance to show again
```

---

## Privacy & Compliance

Set all privacy flags **before `Init`**:

```csharp
// GDPR — true if user granted consent
LevelPlay.SetConsent(true);

// CCPA — true = user opted out of data sale
LevelPlayPrivacySettings.SetCCPA(true);

// COPPA — true = child-directed user
LevelPlayPrivacySettings.SetCOPPA(true);

// Child-directed app (or mixed-audience with age gate)
LevelPlay.SetMetaData("is_child_directed",                  "true");
LevelPlay.SetMetaData("is_deviceid_optout",                 "true");
LevelPlay.SetMetaData("Google_Family_Self_Certified_SDKS",  "true");
```

---

## Price Floors & Segmentation

Increase revenue by filtering low bids for high-LTV users:

```csharp
var config = new LevelPlayRewardedAd.Config.Builder()
    .SetBidFloor(user.IsWhale ? 2.50 : 0.50)
    .Build();
_rewardedAd = new LevelPlayRewardedAd("rewardedAdUnitId", config);
```

User segmentation for mediation waterfall targeting:

```csharp
var segment = new LevelPlaySegment
{
    SegmentName = "paying_users",   // max 32 chars
    IsPaying    = 1,
    Level       = player.Level,
    IapTotal    = player.TotalSpend
};
LevelPlay.SetSegment(segment);     // may be called before or after Init
```

---

## Best Practices

- Preload the next ad inside `OnAdClosed` to minimize user wait time.
- Show interstitials at most once per significant transition; rely on dashboard placement caps as a safety net.
- Keep rewarded reward values small relative to IAPs — e.g. 50 gems via ad vs 500 gems for $4.99 — to avoid competing with purchases.
- Keep all network adapters updated (Window → Ads Mediation → Network Manager).
- Prefer in-app bidding networks for top mediation positions; fill gaps with waterfall instances.
- On iOS set `LevelPlay.SetPauseGame(true)` to auto-pause game logic during fullscreen ads.
- Use dashboard placement frequency caps instead of manual in-code rate limiting.

---

## Anti-patterns

- **Creating ad objects before `OnInitSuccess`** — SDK is not ready; the objects fail silently or throw.
- **Granting reward in `OnAdClosed`** — `OnAdRewarded` can fire after `OnAdClosed`; only grant in `OnAdRewarded`.
- **Calling `ShowAd()` without `IsAdReady()` check** — produces a display error (code 509) and no ad.
- **Omitting `OnApplicationPause`** — corrupts SDK state across pause/resume cycles; required in every scene that manages ads.
- **Hardcoding reward values** — use `GetReward(placement)` so values stay in sync with the dashboard.
- **Reusing a banner after `DestroyAd()`** — the instance is invalidated; create a new `LevelPlayBannerAd`.
- **Setting privacy flags after `Init`** — COPPA and GDPR must be applied before `Init` to be respected by ad networks.
- **Showing ads too frequently** — increases user churn; always cap interstitials per session in the dashboard.

---

## API Lookup Workflow

1. Open `ironsource-api.md` when you need: exact method/event signatures, enum values (sizes, positions), Config builder parameters, or error code meanings.
2. Use the error codes table in `ironsource-api.md` when debugging `OnAdLoadFailed` or `OnAdDisplayFailed`.
3. Check `IsAdReady()` and `IsPlacementCapped()` first — do not guess from error codes alone.
