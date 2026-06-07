---
version: 1.0.0
---

# AppLovin MAX

> **Scope**: AppLovin MAX ad mediation SDK for Unity — SDK initialization and consent flow, all ad format lifecycles (Interstitial, Rewarded, Banner, MREC), impression-level revenue tracking, and mediation debugging.
> **Load when**: integrating ads with AppLovin MAX, initializing the MAX SDK, loading or showing interstitial or rewarded ads, creating banner or MREC ads, handling ad callbacks, tracking ad revenue, debugging mediation networks, configuring privacy and consent.

---

## Installation & Setup

- Import via Unity Package Manager (UPM) — recommended. Use the installer from the AppLovin dashboard, then Assets > Import Package > Custom Package.
- Alternatively: download and import `.unitypackage` directly.
- Unity 2019.4+ required.
- **Android**: Enable Jetifier — Assets > External Dependency Manager > Android Resolver > Settings > check "Use Jetifier".
- **iOS**: CocoaPods required; Bitcode is not supported (deprecated in Xcode 14).
- Enter SDK Key: AppLovin > Integration Manager > SDK Settings. Key is at AppLovin dashboard > Account > General > Keys.
- All AppLovin MAX API calls must run on the main thread.

---

## SDK Initialization

Always initialize on app startup — mediated networks need time to cache ad assets.

```csharp
// Set consent BEFORE initializing (see Privacy section)
MaxSdk.SetHasUserConsent(true);

// Subscribe to init event first, then call init
MaxSdkCallbacks.OnSdkInitializedEvent += OnSdkInitialized;
MaxSdk.InitializeSdk();

private void OnSdkInitialized(MaxSdk.SdkConfiguration sdkConfiguration)
{
    // Start loading ads here — DO NOT initialize mediated network SDKs manually
    InitializeInterstitialAds();
    InitializeRewardedAds();
    InitializeBannerAds();
}
```

Selective initialization (only specific ad units):
```csharp
MaxSdk.InitializeSdk(new[] { "ad-unit-id-1", "ad-unit-id-2" });
```

---

## Privacy & Consent

Set all consent flags **before** `MaxSdk.InitializeSdk()` — the SDK reads them at init time.

```csharp
// GDPR: user grants consent for interest-based advertising
MaxSdk.SetHasUserConsent(true);

// CCPA / US multi-state: user opts out of selling data
MaxSdk.SetDoNotSell(true);
```

MAX Terms & Privacy Policy Flow (recommended for ATT + GDPR compliance):
- Configure in editor: AppLovin > Integration Manager > Terms and Privacy Policy Flow
- Set Privacy Policy URL and optional Terms of Service URL
- Enable "Show GDPR Alert in GDPR Region" if needed
- When submitting to App Store: include ATT permission request note in Review Notes section

Show CMP flow for existing users who already consented:
```csharp
MaxSdk.CmpService.ShowCmpForExistingUser(error =>
{
    if (error == null) { /* CMP displayed successfully */ }
});
```

**Children restriction:** Never pass AppLovin child user data. Do not integrate MAX into apps exclusively targeting children. For mixed-audience apps, exclude child users from AppLovin sessions entirely.

---

## Platform Ad Unit IDs

Always use platform-specific ad unit IDs:
```csharp
#if UNITY_IOS
    private const string AdUnitId = "«iOS-ad-unit-ID»";
#else
    private const string AdUnitId = "«Android-ad-unit-ID»";
#endif
```

---

## Interstitial Ads

```csharp
private int _retryAttempt;

public void InitializeInterstitialAds()
{
    MaxSdkCallbacks.Interstitial.OnAdLoadedEvent += OnInterstitialLoaded;
    MaxSdkCallbacks.Interstitial.OnAdLoadFailedEvent += OnInterstitialLoadFailed;
    MaxSdkCallbacks.Interstitial.OnAdDisplayedEvent += OnInterstitialDisplayed;
    MaxSdkCallbacks.Interstitial.OnAdDisplayFailedEvent += OnInterstitialDisplayFailed;
    MaxSdkCallbacks.Interstitial.OnAdClickedEvent += OnInterstitialClicked;
    MaxSdkCallbacks.Interstitial.OnAdHiddenEvent += OnInterstitialHidden;
    MaxSdkCallbacks.Interstitial.OnAdRevenuePaidEvent += OnInterstitialRevenuePaid;
    LoadInterstitial();
}

private void LoadInterstitial() => MaxSdk.LoadInterstitial(AdUnitId);

public void ShowInterstitial(string placement = null)
{
    if (!MaxSdk.IsInterstitialReady(AdUnitId)) return;
    if (placement != null)
        MaxSdk.ShowInterstitial(AdUnitId, placement);
    else
        MaxSdk.ShowInterstitial(AdUnitId);
}

private void OnInterstitialLoaded(string adUnitId, MaxSdk.AdInfo adInfo)
{
    _retryAttempt = 0;
}

private void OnInterstitialLoadFailed(string adUnitId, MaxSdk.ErrorInfo errorInfo)
{
    // Exponential backoff: 2^min(6, attempt) seconds — caps at 64s
    _retryAttempt++;
    float delay = (float) Math.Pow(2, Math.Min(6, _retryAttempt));
    Invoke(nameof(LoadInterstitial), delay);
}

private void OnInterstitialDisplayFailed(string adUnitId, MaxSdk.ErrorInfo errorInfo, MaxSdk.AdInfo adInfo)
{
    LoadInterstitial(); // Always reload on display failure
}

private void OnInterstitialHidden(string adUnitId, MaxSdk.AdInfo adInfo)
{
    LoadInterstitial(); // Pre-load next ad
}
```

---

## Rewarded Ads

Same retry pattern as interstitials. Grant reward only in `OnAdReceivedRewardEvent`.

```csharp
private int _retryAttempt;

public void InitializeRewardedAds()
{
    MaxSdkCallbacks.Rewarded.OnAdLoadedEvent += OnRewardedLoaded;
    MaxSdkCallbacks.Rewarded.OnAdLoadFailedEvent += OnRewardedLoadFailed;
    MaxSdkCallbacks.Rewarded.OnAdDisplayedEvent += OnRewardedDisplayed;
    MaxSdkCallbacks.Rewarded.OnAdDisplayFailedEvent += OnRewardedDisplayFailed;
    MaxSdkCallbacks.Rewarded.OnAdClickedEvent += OnRewardedClicked;
    MaxSdkCallbacks.Rewarded.OnAdHiddenEvent += OnRewardedHidden;
    MaxSdkCallbacks.Rewarded.OnAdReceivedRewardEvent += OnRewardReceived;
    MaxSdkCallbacks.Rewarded.OnAdRevenuePaidEvent += OnRewardedRevenuePaid;
    LoadRewardedAd();
}

private void LoadRewardedAd() => MaxSdk.LoadRewardedAd(AdUnitId);

public void ShowRewardedAd(string placement = null)
{
    if (!MaxSdk.IsRewardedAdReady(AdUnitId)) return;
    if (placement != null)
        MaxSdk.ShowRewardedAd(AdUnitId, placement);
    else
        MaxSdk.ShowRewardedAd(AdUnitId);
}

private void OnRewardedLoaded(string adUnitId, MaxSdk.AdInfo adInfo)
{
    _retryAttempt = 0;
}

private void OnRewardedLoadFailed(string adUnitId, MaxSdk.ErrorInfo errorInfo)
{
    _retryAttempt++;
    float delay = (float) Math.Pow(2, Math.Min(6, _retryAttempt));
    Invoke(nameof(LoadRewardedAd), delay);
}

private void OnRewardedDisplayFailed(string adUnitId, MaxSdk.ErrorInfo errorInfo, MaxSdk.AdInfo adInfo)
{
    LoadRewardedAd();
}

private void OnRewardedHidden(string adUnitId, MaxSdk.AdInfo adInfo)
{
    LoadRewardedAd();
}

private void OnRewardReceived(string adUnitId, MaxSdk.Reward reward, MaxSdk.AdInfo adInfo)
{
    // Grant the user their reward here
}
```

---

## Banner Ads

```csharp
public void InitializeBannerAds()
{
    MaxSdkCallbacks.Banner.OnAdLoadedEvent += OnBannerLoaded;
    MaxSdkCallbacks.Banner.OnAdLoadFailedEvent += OnBannerLoadFailed;
    MaxSdkCallbacks.Banner.OnAdClickedEvent += OnBannerClicked;
    MaxSdkCallbacks.Banner.OnAdRevenuePaidEvent += OnBannerRevenuePaid;
    MaxSdkCallbacks.Banner.OnAdExpandedEvent += OnBannerExpanded;
    MaxSdkCallbacks.Banner.OnAdCollapsedEvent += OnBannerCollapsed;

    var config = new MaxSdk.AdViewConfiguration(MaxSdk.AdViewPosition.BottomCenter);
    MaxSdk.CreateBanner(AdUnitId, config);
    MaxSdk.SetBannerBackgroundColor(AdUnitId, Color.black);
}

// Visibility
MaxSdk.ShowBanner(AdUnitId);
MaxSdk.HideBanner(AdUnitId);
MaxSdk.DestroyBanner(AdUnitId); // Call when banner is no longer needed

// Auto-refresh control
MaxSdk.StopBannerAutoRefresh(AdUnitId);
MaxSdk.StartBannerAutoRefresh(AdUnitId);
MaxSdk.LoadBanner(AdUnitId); // Manual refresh
```

Available positions: `TopLeft`, `TopCenter`, `TopRight`, `CenterLeft`, `Centered`, `CenterRight`, `BottomLeft`, `BottomCenter`, `BottomRight`.

Custom pixel position (safe area coordinates):
```csharp
var config = new MaxSdk.AdViewConfiguration(x: 100, y: 200);
```

Adaptive banners (enabled by default on major networks):
```csharp
var config = new MaxSdk.AdViewConfiguration(MaxSdk.AdViewPosition.BottomCenter)
{
    IsAdaptive = false // Disable adaptive
};
float adaptiveHeight = MaxSdkUtils.GetAdaptiveBannerHeight(screenWidth);
```

Custom refresh rate (10–120 seconds):
```csharp
MaxSdk.SetBannerExtraParameter(AdUnitId, "ad_refresh_seconds", "30");
```

---

## MREC Ads (Medium Rectangle — 300×250)

Same lifecycle pattern as Banner.

```csharp
public void InitializeMRecAds()
{
    MaxSdkCallbacks.MRec.OnAdLoadedEvent += OnMRecLoaded;
    MaxSdkCallbacks.MRec.OnAdLoadFailedEvent += OnMRecLoadFailed;
    MaxSdkCallbacks.MRec.OnAdClickedEvent += OnMRecClicked;
    MaxSdkCallbacks.MRec.OnAdRevenuePaidEvent += OnMRecRevenuePaid;

    var config = new MaxSdk.AdViewConfiguration(MaxSdk.AdViewPosition.Centered);
    MaxSdk.CreateMRec(AdUnitId, config);
}

MaxSdk.ShowMRec(AdUnitId);
MaxSdk.HideMRec(AdUnitId);
MaxSdk.DestroyMRec(AdUnitId);
MaxSdk.StopMRecAutoRefresh(AdUnitId);
MaxSdk.StartMRecAutoRefresh(AdUnitId);
```

---

## Impression-Level Revenue Tracking

Subscribe per ad format:

```csharp
MaxSdkCallbacks.Interstitial.OnAdRevenuePaidEvent += OnAdRevenuePaid;
MaxSdkCallbacks.Rewarded.OnAdRevenuePaidEvent += OnAdRevenuePaid;
MaxSdkCallbacks.Banner.OnAdRevenuePaidEvent += OnAdRevenuePaid;
MaxSdkCallbacks.MRec.OnAdRevenuePaidEvent += OnAdRevenuePaid;

private void OnAdRevenuePaid(string adUnitId, MaxSdk.AdInfo adInfo)
{
    double revenue = adInfo.Revenue;
    string precision = adInfo.RevenuePrecision; // "publisher_defined", "exact", "estimated", "undefined"
    string networkName = adInfo.NetworkName;
    string adFormat = adInfo.AdFormat;
    string placement = adInfo.Placement;
    // Forward to your analytics SDK (e.g., Adjust, AppsFlyer, Firebase)
}
```

---

## Ad Placements

Set placement names for revenue analytics. Set immediately after creating Banner/MREC.

```csharp
MaxSdk.SetBannerPlacement(AdUnitId, "MainMenu_Bottom");
MaxSdk.SetMRecPlacement(AdUnitId, "Gameplay_Center");
MaxSdk.ShowInterstitial(AdUnitId, "LevelComplete");
MaxSdk.ShowRewardedAd(AdUnitId, "ExtraLife");
```

---

## Advanced Configuration

```csharp
// Mute ads — set BEFORE loading, not after
MaxSdk.SetMuted(true);

// Verbose logging for development
MaxSdk.SetVerboseLogging(true);

// Associate a user ID (useful for rewarded ad server-side callbacks)
MaxSdk.SetUserId("user-id");

// Get banner layout (Rect in Unity coordinates)
Rect layout = MaxSdk.GetBannerLayout(AdUnitId);

// Convert screen coordinates
float density = MaxSdkUtils.GetScreenDensity();
```

---

## Testing & Debugging

Show Mediation Debugger after SDK init:

```csharp
MaxSdkCallbacks.OnSdkInitializedEvent += (config) =>
{
    MaxSdk.ShowMediationDebugger();
};
```

The Mediation Debugger provides:
- **Integration Status** — verifies adapter versions and SKAdNetwork IDs
- **Test Ads** — loads network-specific test credentials per network
- **Live Ads** — tests through actual waterfall with country/LAT targeting
- **Sharing** — generates shareable integration checklists

For Google AdMob test devices:
```csharp
MaxSdk.SetExtraParameter("google_test_device_hashed_id", "«hashed-device-id»");
```

---

## Anti-patterns

- **Never initialize mediated network SDKs in `OnSdkInitializedEvent`** — MAX initializes them automatically.
- **Never set consent after `InitializeSdk()`** — consent values are read at init time and ignored afterward.
- **Never call MAX APIs from a background thread** — all calls must be on the main thread.
- **Never show an ad without `IsInterstitialReady` / `IsRewardedAdReady` check** — calling `Show` when the ad is not loaded causes a no-op or error.
- **Never skip Jetifier on Android** — build will fail with dependency conflicts.
- **Never set `SetMuted` after ad load** — mute state must be configured before loading.
- **Do not retry immediately on load failure** — use exponential backoff (`2^min(6, attempt)` seconds) to avoid hammering the network.
- **Never call `DestroyBanner` / `DestroyMRec` and then `ShowBanner`** — destroyed ads must be recreated with `CreateBanner`.
- **Avoid Meta Audience Network SDK below 11.0** — the MAX adapter requires version 11.0+.
- **Do not initialize AppLovin for child users** — `setIsAgeRestrictedUser` is no longer supported; simply exclude children from MAX sessions.
