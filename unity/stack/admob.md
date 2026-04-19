---
version: 1.0.0
---

# Google Mobile Ads (AdMob)

> **Scope**: Google Mobile Ads Unity plugin — SDK initialization, UMP consent flow, banner/interstitial/rewarded/app-open ad loading and lifecycle management, ad event callbacks, test ad unit IDs, and mobile ad monetization patterns.
> **Load when**: integrating AdMob or Google Mobile Ads into a Unity project, showing banner or interstitial ads, implementing rewarded video or rewarded interstitial ads, setting up app open ads, handling GDPR/UMP consent before ad initialization, configuring ad unit IDs, debugging ad load failures, managing ad lifecycle and memory.

---

## Installation & Configuration

**Install via OpenUPM** (recommended): add `com.google.ads.mobile` scope in Package Manager → My Registries.
Alternatively, import the `.unitypackage` from GitHub releases (googleads/googleads-mobile-unity).

After installation, enter your Android and iOS AdMob App IDs:
**Assets → Google Mobile Ads → Settings**

Required namespaces:

```csharp
using GoogleMobileAds;
using GoogleMobileAds.Api;
using GoogleMobileAds.Ump.Api; // UMP consent
```

Platform requirements: Unity 2019.4+, Android API 23+, iOS 13.0+.

---

## Initialization Order

The correct order is always: **consent → ads init → load ads**.

```csharp
void Start()
{
    var request = new ConsentRequestParameters();
    ConsentInformation.Update(request, OnConsentInfoUpdated);
}

void OnConsentInfoUpdated(FormError error)
{
    if (error != null)
    {
        Debug.LogError(error);
        return;
    }

    ConsentForm.LoadAndShowConsentFormIfRequired(formError =>
    {
        if (formError != null)
        {
            Debug.LogError(formError);
            return;
        }

        // Only initialize after consent is confirmed
        if (ConsentInformation.CanRequestAds())
        {
            MobileAds.Initialize(initStatus =>
            {
                // Safe to load ads now.
                // When using mediation, wait for this callback before loading.
            });
        }
    });
}
```

- Call `MobileAds.Initialize()` **once** at app launch — never on scene reloads or re-entry.
- When using mediation, **wait for the `Initialize()` callback** before loading any ad.
- UMP consent must be obtained **before** `MobileAds.Initialize()` — not after.
- Call `ConsentInformation.Update()` at **every** app launch to re-check consent status.

---

## Test Ad Unit IDs

Always use test IDs during development. Using production IDs in test builds risks account suspension.

| Format | Android | iOS |
|--------|---------|-----|
| Banner | `ca-app-pub-3940256099942544/6300978111` | `ca-app-pub-3940256099942544/2934735716` |
| Interstitial | `ca-app-pub-3940256099942544/1033173712` | `ca-app-pub-3940256099942544/4411468910` |
| Rewarded | `ca-app-pub-3940256099942544/5224354917` | `ca-app-pub-3940256099942544/1712485313` |
| Rewarded Interstitial | `ca-app-pub-3940256099942544/5354046379` | `ca-app-pub-3940256099942544/6978759866` |
| App Open | `ca-app-pub-3940256099942544/9257395921` | `ca-app-pub-3940256099942544/5575463023` |

Use `#if UNITY_ANDROID / #elif UNITY_IPHONE` directives to select per-platform IDs.

---

## Banner Ads (BannerView)

`BannerView` is persistent — load once and keep alive for the lifetime of a scene. Unlike full-screen formats, it is not single-use.

```csharp
private BannerView _bannerView;

void CreateBannerView()
{
    _bannerView?.Destroy(); // destroy previous before creating new

    _bannerView = new BannerView(_adUnitId, AdSize.Banner, AdPosition.Bottom);

    _bannerView.OnBannerAdLoaded += () => Debug.Log("Banner loaded");
    _bannerView.OnBannerAdLoadFailed += error => Debug.LogError("Banner failed: " + error);
    _bannerView.OnAdPaid += adValue => Debug.Log("Banner paid: " + adValue.Value);
    _bannerView.OnAdFullScreenContentOpened += () => { /* pause audio/game */ };
    _bannerView.OnAdFullScreenContentClosed += () => { /* resume audio/game */ };

    _bannerView.LoadAd(new AdRequest());
}

void OnDestroy()
{
    _bannerView?.Destroy();
}
```

**AdSize options:**

| Constant | Size | Notes |
|----------|------|-------|
| `AdSize.Banner` | 320×50 dp | Standard, all devices |
| `AdSize.LargeBanner` | 320×100 dp | Taller banner |
| `AdSize.MediumRectangle` | 300×250 dp | MREC, high eCPM |
| `AdSize.FullBanner` | 468×60 dp | Tablets |
| `AdSize.Leaderboard` | 728×90 dp | Tablets |
| Adaptive | Screen width | Preferred over SmartBanner |

- Prefer **Adaptive banner** over deprecated `AdSize.SmartBanner`.
- On failed load, call `LoadAd()` on the existing `BannerView` — do not destroy and recreate.
- When using mediation, disable auto-refresh in the third-party ad source dashboard to prevent double-refresh.

---

## Interstitial Ads (InterstitialAd)

Interstitials are **single-use** — each instance can only be shown once. Destroy and reload after every show.

```csharp
private InterstitialAd _interstitialAd;

public void LoadInterstitialAd()
{
    _interstitialAd?.Destroy(); // destroy previous before loading new
    _interstitialAd = null;

    InterstitialAd.Load(_adUnitId, new AdRequest(),
        (InterstitialAd ad, LoadAdError error) =>
        {
            if (error != null || ad == null)
            {
                Debug.LogError("Interstitial failed to load: " + error);
                return;
            }

            _interstitialAd = ad;

            ad.OnAdFullScreenContentClosed += () =>
            {
                LoadInterstitialAd(); // preload next ad immediately
            };
            ad.OnAdFullScreenContentFailed += _ =>
            {
                LoadInterstitialAd(); // preload next on failure too
            };
        });
}

public void ShowInterstitialAd()
{
    if (_interstitialAd != null && _interstitialAd.CanShowAd())
    {
        _interstitialAd.Show();
    }
}
```

- Show only at **natural transition points** (level complete, menu open) — never mid-gameplay.
- Always check `CanShowAd()` before calling `Show()`.
- Preload the next ad inside `OnAdFullScreenContentClosed` and `OnAdFullScreenContentFailed`.
- Ads expire after ~1 hour — do not cache them longer than that without reloading.

---

## Rewarded Ads (RewardedAd)

Rewarded ads are **single-use**. Grant rewards only inside the `Show()` callback.

```csharp
private RewardedAd _rewardedAd;

public void LoadRewardedAd()
{
    _rewardedAd?.Destroy();
    _rewardedAd = null;

    RewardedAd.Load(_adUnitId, new AdRequest(),
        (RewardedAd ad, LoadAdError error) =>
        {
            if (error != null || ad == null)
            {
                Debug.LogError("Rewarded failed to load: " + error);
                return;
            }

            _rewardedAd = ad;

            ad.OnAdFullScreenContentClosed += () => LoadRewardedAd();
            ad.OnAdFullScreenContentFailed += _ => LoadRewardedAd();
        });
}

public void ShowRewardedAd()
{
    if (_rewardedAd != null && _rewardedAd.CanShowAd())
    {
        _rewardedAd.Show(reward =>
        {
            Debug.Log($"Reward earned: {reward.Type} x{reward.Amount}");
            // Grant the reward here — this callback fires only when reward is earned
        });
    }
}
```

- Grant rewards **only inside the `Show()` callback** — not in `OnAdFullScreenContentClosed`.
  `OnAdFullScreenContentClosed` fires even when the user skips the ad; the `Show()` callback fires only when fully earned.
- Use `SetServerSideVerificationOptions()` when server-side reward validation is required.

---

## Rewarded Interstitial Ads (RewardedInterstitialAd)

Same lifecycle as `RewardedAd`, but shows automatically without requiring user opt-in.

```csharp
private RewardedInterstitialAd _rewardedInterstitialAd;

public void LoadRewardedInterstitialAd()
{
    _rewardedInterstitialAd?.Destroy();
    _rewardedInterstitialAd = null;

    RewardedInterstitialAd.Load(_adUnitId, new AdRequest(),
        (RewardedInterstitialAd ad, LoadAdError error) =>
        {
            if (error != null || ad == null)
            {
                Debug.LogError("RewardedInterstitial failed: " + error);
                return;
            }

            _rewardedInterstitialAd = ad;
            ad.OnAdFullScreenContentClosed += () => LoadRewardedInterstitialAd();
            ad.OnAdFullScreenContentFailed += _ => LoadRewardedInterstitialAd();
        });
}

public void ShowRewardedInterstitialAd()
{
    if (_rewardedInterstitialAd != null && _rewardedInterstitialAd.CanShowAd())
    {
        _rewardedInterstitialAd.Show(reward =>
        {
            Debug.Log($"Reward earned: {reward.Type} x{reward.Amount}");
        });
    }
}
```

---

## App Open Ads (AppOpenAd)

App open ads overlay the app during launch or foreground resume. They **expire after 4 hours** — always validate the load timestamp before showing.

```csharp
private AppOpenAd _appOpenAd;
private DateTime _appOpenExpireTime;

public void LoadAppOpenAd()
{
    _appOpenAd?.Destroy();
    _appOpenAd = null;

    AppOpenAd.Load(_adUnitId, new AdRequest(),
        (AppOpenAd ad, LoadAdError error) =>
        {
            if (error != null || ad == null)
            {
                Debug.LogError("App Open failed: " + error);
                return;
            }

            _appOpenAd = ad;
            _appOpenExpireTime = DateTime.UtcNow + TimeSpan.FromHours(4);

            ad.OnAdFullScreenContentClosed += () => LoadAppOpenAd();
            ad.OnAdFullScreenContentFailed += _ => LoadAppOpenAd();
        });
}

private bool IsAdAvailable =>
    _appOpenAd != null && DateTime.UtcNow < _appOpenExpireTime;

public void ShowAppOpenAd()
{
    if (IsAdAvailable && _appOpenAd.CanShowAd())
    {
        _appOpenAd.Show();
    }
}
```

**App foreground integration** — hook into `AppStateEventNotifier`:

```csharp
void OnEnable()  => AppStateEventNotifier.AppStateChanged += OnAppStateChanged;
void OnDisable() => AppStateEventNotifier.AppStateChanged -= OnAppStateChanged;

void OnAppStateChanged(AppState state)
{
    if (state == AppState.Foreground && IsAdAvailable)
        ShowAppOpenAd();
}
```

- Do NOT show app open ads during active gameplay — only on app launch or foreground resume.
- Always validate expiry before showing; discard and reload if expired.

---

## Full-Screen Ad Event Reference

All full-screen formats (`InterstitialAd`, `RewardedAd`, `RewardedInterstitialAd`, `AppOpenAd`) share this event set:

| Event | Type | When fires |
|-------|------|-----------|
| `OnAdPaid` | `Action<AdValue>` | Ad is estimated to have earned money |
| `OnAdImpressionRecorded` | `Action` | Impression recorded |
| `OnAdClicked` | `Action` | User taps the ad |
| `OnAdFullScreenContentOpened` | `Action` | Ad opens full-screen (pause game audio here) |
| `OnAdFullScreenContentClosed` | `Action` | User closes the ad (resume game, preload next) |
| `OnAdFullScreenContentFailed` | `Action<AdError>` | Failed to open full-screen (preload next) |

`BannerView` uses different event names: `OnBannerAdLoaded` and `OnBannerAdLoadFailed`.

---

## Anti-patterns

- **Initializing SDK before consent** — Always complete the UMP flow and confirm `CanRequestAds()` before calling `MobileAds.Initialize()`.
- **Not destroying old ad objects** — All ad types must be explicitly `Destroy()`-ed before creating or loading a new instance to avoid memory leaks.
- **Reusing single-use ad objects** — `InterstitialAd`, `RewardedAd`, `RewardedInterstitialAd`, and `AppOpenAd` can only be shown once. Always load a fresh instance after each show.
- **Skipping `CanShowAd()` check** — Always call `CanShowAd()` before `Show()`; the ad may have expired or already been shown.
- **Granting rewards in `OnAdFullScreenContentClosed`** — This event fires even for skipped rewarded ads. Grant rewards only inside the `Show(reward => {...})` callback.
- **Loading retry loops without backoff** — Tight retry loops on failed loads flood the ad server and risk account issues. Preload at natural points (scene transitions, after close) instead.
- **Using production ad unit IDs during development** — Always use test IDs in dev and QA builds.
- **Showing app open ads with an expired cache** — App open ads expire after 4 hours; always validate the timestamp before showing.
- **Not waiting for mediation initialization callback** — When mediation is enabled, load ads only after the `MobileAds.Initialize()` callback fires.
- **Calling `MobileAds.Initialize()` multiple times** — Initialize once at app launch only. Multiple calls are no-ops but indicate a structural problem.
