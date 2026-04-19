---
version: 1.0.0
---

# Firebase Unity SDK

> **Scope**: Firebase Unity SDK integration — project setup, initialization, Authentication, Realtime Database, Crashlytics, and Remote Config service patterns for Unity games on iOS, Android, and desktop.
> **Load when**: integrating Firebase into a Unity project, setting up Firebase configuration files, implementing player authentication flows, reading or writing to Realtime Database, recording crashes with Crashlytics, configuring Remote Config parameters, troubleshooting Firebase build or dependency errors.

---

## Core Concepts

- **FirebaseApp** — the entry point for all Firebase services. Must be initialized before any service is used. All service singletons (`DefaultInstance`) depend on it.
- **EDM4U (External Dependency Manager for Unity)** — bundled with every Firebase package. Resolves iOS CocoaPods and Android Maven dependencies automatically. Do not bypass it.
- **Config files** — `google-services.json` (Android) and `GoogleService-Info.plist` (iOS) contain non-secret project identifiers. Both must be placed in `Assets/`.
- **Async tasks** — all Firebase operations return `Task` or `Task<T>`. Use `ContinueWithOnMainThread()` from `Firebase.Extensions` to dispatch callbacks to Unity's main thread.
- **Desktop support** — Auth, Database, Firestore, Functions, Remote Config, Storage, App Check, and AI Logic have functional desktop implementations. Other services provide stubs for compilation only. Desktop is **development-only**, not production.

## Setup & Configuration

### Prerequisites
- Unity 2021 LTS or later
- iOS: Xcode 16.2+, CocoaPods 1.12.0+, target iOS 15+
- Android: API level 23 (Marshmallow)+

### Project setup steps
1. Create a Firebase project in the Firebase Console.
2. Register each platform app (iOS bundle ID / Android package name) — these are case-sensitive and immutable.
3. Download `google-services.json` and `GoogleService-Info.plist`; place both in `Assets/` (filenames must be exact — no appended "(2)" etc.).
4. Import Firebase packages via **Unity Package Manager (UPM)** — import as `.tgz` files. Preferred over `.unitypackage` for cleaner updates.
5. Keep all Firebase packages at the **same version** — mismatched versions cause runtime errors.

### Installation method rule
Use either UPM **or** `.unitypackage` — **never mix** the two in the same project. EDM4U must also have exactly one copy in the project.

### Android multidex
If your build fails with "Cannot fit requested classes in a single dex file" (65K method limit):
- Enable **Minify** in Player Settings → Android → Publishing Settings, **or**
- Enable multidex in `mainTemplate.gradle`.

### iOS method swizzling
**Never disable method swizzling** on iOS. It is required for FCM token handling and other SDK features.

## Initialization Pattern

Always call `CheckAndFixDependenciesAsync()` before using any Firebase service. Use `ContinueWithOnMainThread()` to stay on Unity's main thread.

```csharp
using Firebase;
using Firebase.Extensions;

void Start()
{
    FirebaseApp.CheckAndFixDependenciesAsync().ContinueWithOnMainThread(task =>
    {
        if (task.Result == DependencyStatus.Available)
        {
            InitializeFirebase();
        }
        else
        {
            Debug.LogError($"Firebase dependencies unavailable: {task.Result}");
        }
    });
}
```

### Editor instances
When creating a `FirebaseApp` inside the Unity Editor, use a unique name — **never** `DefaultInstance`. This prevents option conflicts between editor and build:

```csharp
var options = new AppOptions { /* ... */ };
FirebaseApp editorApp = FirebaseApp.Create(options, "editor-unique-name");
```

## Firebase Authentication

### Key classes
- `FirebaseAuth` — singleton accessed via `DefaultInstance`
- `AuthResult` — result of any sign-in or create-user operation
- `FirebaseUser` — authenticated user; properties: `UserId`, `DisplayName`, `Email`, `PhotoUrl`, `IsValid()`

### Sign-in operations

```csharp
// Email + password — create user
auth.CreateUserWithEmailAndPasswordAsync(email, password).ContinueWithOnMainThread(task =>
{
    if (task.IsFaulted) { Debug.LogError(task.Exception); return; }
    Debug.Log($"Created: {task.Result.User.UserId}");
});

// Email + password — sign in
auth.SignInWithEmailAndPasswordAsync(email, password).ContinueWithOnMainThread(task =>
{
    if (task.IsFaulted) { Debug.LogError(task.Exception); return; }
    Debug.Log($"Signed in: {task.Result.User.DisplayName}");
});

// Anonymous sign-in
auth.SignInAnonymouslyAsync().ContinueWithOnMainThread(task => { /* ... */ });

// Custom token
auth.SignInWithCustomTokenAsync(customToken).ContinueWithOnMainThread(task => { /* ... */ });
```

Supported identity providers: Google, Facebook, Twitter/X, GitHub, Microsoft, Yahoo, Phone, Anonymous.

### Auth state listener — subscribe and unsubscribe

```csharp
void InitializeFirebase()
{
    auth = FirebaseAuth.DefaultInstance;
    auth.StateChanged += AuthStateChanged;
    AuthStateChanged(this, null); // Sync initial state
}

void AuthStateChanged(object sender, EventArgs e)
{
    if (auth.CurrentUser != null && auth.CurrentUser.IsValid())
    {
        string userId = auth.CurrentUser.UserId;
        // User is signed in — update game state
    }
}

void OnDestroy()
{
    auth.StateChanged -= AuthStateChanged; // Always unsubscribe
    auth = null;
}
```

## Firebase Realtime Database

### Key classes
- `FirebaseDatabase` — service entry point; access via `DefaultInstance`
- `DatabaseReference` — reference to a node; navigate with `.Child("key")`
- `DataSnapshot` — immutable snapshot of a node; `.Value` returns `Dictionary<string, object>` or a primitive

### Write operations

```csharp
DatabaseReference db = FirebaseDatabase.DefaultInstance.RootReference;

// Overwrite a node
db.Child("users").Child(userId).SetValueAsync(userData);

// Write a serialized JSON object
string json = JsonUtility.ToJson(myObject);
db.Child("users").Child(userId).SetRawJsonValueAsync(json);

// Atomic multi-location update (preferred over sequential SetValueAsync calls)
var updates = new Dictionary<string, object>
{
    ["/scores/" + key]                    = entryValues,
    ["/user-scores/" + userId + "/" + key] = entryValues
};
db.UpdateChildrenAsync(updates);

// Append to a list — generates a unique push key
string key = db.Child("scores").Push().Key;

// Delete a node
db.Child("path").RemoveValueAsync();
```

### Read operations

```csharp
// One-time read
db.GetReference("Leaders").GetValueAsync().ContinueWithOnMainThread(task =>
{
    if (!task.IsCompleted) return;
    DataSnapshot snapshot = task.Result;
    // snapshot.Value is Dictionary<string, object> or null
});

// Real-time listener
db.GetReference("Leaders").ValueChanged += HandleValueChanged;

void HandleValueChanged(object sender, ValueChangedEventArgs args)
{
    if (args.DatabaseError != null)
    {
        Debug.LogError(args.DatabaseError.Message);
        return;
    }
    DataSnapshot snapshot = args.Snapshot;
}

void OnDestroy()
{
    db.GetReference("Leaders").ValueChanged -= HandleValueChanged; // Always unsubscribe
}
```

Child events: `ChildAdded`, `ChildChanged`, `ChildRemoved`, `ChildMoved` — use for list-style data.

### Queries

```csharp
// Order + limit (use only one OrderBy method per query)
db.GetReference("Leaders")
  .OrderByChild("score")
  .LimitToLast(10)
  .ValueChanged += HandleValueChanged;
```

Ordering: `OrderByChild(key)`, `OrderByKey()`, `OrderByValue()`.  
Filtering: `LimitToFirst(n)`, `LimitToLast(n)`, `StartAt(value)`, `EndAt(value)`, `EqualTo(value)`.

Add `.indexOn` rules in Firebase Security Rules for any key you `OrderByChild()` to avoid slow queries.

### Transactions

Use `RunTransaction()` for data that multiple clients may modify concurrently:

```csharp
leaderboardRef.RunTransaction(mutableData =>
{
    var leaders = mutableData.Value as List<object>;
    if (leaders == null) return TransactionResult.Abort();
    // modify leaders...
    mutableData.Value = leaders;
    return TransactionResult.Success(mutableData);
});
```

Transaction functions may receive `null` data initially — always guard with null checks.

## Firebase Crashlytics

### Initialization

```csharp
FirebaseApp.CheckAndFixDependenciesAsync().ContinueWithOnMainThread(task =>
{
    if (task.Result == DependencyStatus.Available)
    {
        Firebase.FirebaseApp.DefaultInstance;
        Crashlytics.ReportUncaughtExceptionsAsFatal = true; // Recommended for production
    }
});
```

Enable **Google Analytics** alongside Crashlytics to get automatic breadcrumb logs (user actions before a crash).

### Customizing crash reports

```csharp
// Attach a log message to crashes (visible in Firebase Console)
Crashlytics.Log("Player entered level 5");

// Attach searchable key-value pairs (max 64 pairs, 1 kB each)
Crashlytics.SetCustomKey("level", "5");
Crashlytics.SetCustomKey("character", "warrior");

// Attach a non-PII user identifier
Crashlytics.SetUserId(playerId);

// Record a handled (non-fatal) exception
try { RiskyOperation(); }
catch (Exception e) { Crashlytics.LogException(e); }

// Toggle data collection (for GDPR / user consent flows)
Crashlytics.IsCrashlyticsCollectionEnabled = consentGiven;
```

`IsCrashlyticsCollectionEnabled` persists across launches once set.

### Android IL2CPP: upload debug symbols

After every IL2CPP Android build, upload symbols so Crashlytics can symbolicate native stack traces:

```bash
firebase crashlytics:symbols:upload --app=FIREBASE_APP_ID PATH/TO/SYMBOLS
```

### Verifying setup

Force a test crash during development to confirm the setup is working:

```csharp
throw new Exception("Test crash — verify in Firebase Console after 5 minutes");
```

## Firebase Remote Config

### Key classes
- `FirebaseRemoteConfig` — singleton via `DefaultInstance`
- `ConfigValue` — value wrapper; `.StringValue`, `.BooleanValue`, `.DoubleValue`, `.LongValue`
- `ConfigInfo` — fetch metadata; `.LastFetchStatus`, `.FetchTime`

### Fetch → Activate pattern

Always set defaults first so the app works offline on first launch:

```csharp
var remoteConfig = FirebaseRemoteConfig.DefaultInstance;

// 1. Set in-app defaults
await remoteConfig.SetDefaultsAsync(new Dictionary<string, object>
{
    { "max_lives",    5 },
    { "feature_flag", false },
    { "welcome_msg",  "Hello!" }
});

// 2. Fetch (12h cache for production; TimeSpan.Zero only during testing)
await remoteConfig.FetchAsync(TimeSpan.FromHours(12));

// 3. Activate — separates fetch from use so values don't change mid-frame
if (remoteConfig.Info.LastFetchStatus == LastFetchStatus.Success)
    await remoteConfig.ActivateAsync();

// 4. Read
bool featureEnabled = remoteConfig.GetValue("feature_flag").BooleanValue;
```

### Real-time config updates (v11.0.0+)

```csharp
void OnEnable()
{
    FirebaseRemoteConfig.DefaultInstance.OnConfigUpdateListener += OnConfigUpdated;
}

void OnConfigUpdated(object sender, ConfigUpdateEventArgs args)
{
    if (args.Error != RemoteConfigError.None) return;
    FirebaseRemoteConfig.DefaultInstance.ActivateAsync();
}

void OnDisable()
{
    FirebaseRemoteConfig.DefaultInstance.OnConfigUpdateListener -= OnConfigUpdated;
}
```

Requires **Remote Config Realtime API** to be enabled in Google Cloud Console.

**Never store secrets in Remote Config** — all parameters are accessible to client apps.

## Platform Considerations

| Platform | Support | Notes |
|----------|---------|-------|
| Android | Full | API 23+; enable multidex if >65K methods |
| iOS | Full | iOS 15+; do not disable method swizzling |
| tvOS | Full | Same constraints as iOS |
| macOS / Windows / Linux | Beta | Editor/dev only; 8 services with functional implementations |

Desktop platforms: Auth, Database, Firestore, Functions, Remote Config, Storage, App Check, and AI Logic have functional implementations. All other services compile but are no-ops.

## Best Practices

- Always call `CheckAndFixDependenciesAsync()` at startup — before any Firebase service access.
- Use `ContinueWithOnMainThread()` for all task continuations — raw `ContinueWith()` runs on a background thread and will crash on any Unity API call.
- Install via **UPM** — cleaner asset directory, simpler updates, and no manual folder cleanup.
- All Firebase packages must share the **same version** — update them together, never individually.
- Always unsubscribe from events (`StateChanged`, `ValueChanged`, `OnConfigUpdateListener`) in `OnDestroy()` / `OnDisable()` to prevent memory leaks.
- Use `UpdateChildrenAsync()` for atomic multi-location writes — sequential `SetValueAsync()` calls are not atomic.
- Use `Push()` for list items — auto-generated keys are safe for concurrent writes; array indices are not.
- Set `Crashlytics.ReportUncaughtExceptionsAsFatal = true` in production to accurately classify fatal crashes.
- Use `FetchAsync(TimeSpan.FromHours(12))` in production — `TimeSpan.Zero` bypasses the cache and hits rate limits.
- Call `SetDefaultsAsync()` before the first Remote Config fetch — ensures the app is functional offline.
- Enable **budget alerts** in Google Cloud Console before going live.

## Anti-patterns

- **Mixing install methods** — importing some Firebase packages via UPM and others via `.unitypackage` causes EDM4U conflicts and duplicate libraries.
- **Partial version update** — updating only some Firebase packages creates ABI mismatches and runtime crashes at service initialization.
- **Calling Firebase APIs before `CheckAndFixDependenciesAsync` completes** — the app will crash with a native exception, especially on Android where Play Services may need updating.
- **Using raw `ContinueWith()`** instead of `ContinueWithOnMainThread()` — callback runs on a thread pool thread; any call to Unity objects (`Debug.Log`, `GetComponent`, etc.) will throw.
- **Forgetting to unsubscribe event handlers** — `auth.StateChanged`, `ref.ValueChanged`, and `OnConfigUpdateListener` hold references to subscriber objects, preventing garbage collection.
- **Using `DefaultInstance` in Editor scripts** — creates a conflict between the editor's Firebase instance and the runtime instance; always use a named `FirebaseApp.Create()` in Editor code.
- **Disabling method swizzling on iOS** — breaks FCM token delivery and other push notification features.
- **Passing `TimeSpan.Zero` to `FetchAsync()` in production** — Google imposes fetch rate limits; excessive fetches result in `ThrottledError` and apps fall back to stale cached values.
- **Storing secrets in Remote Config** — parameters are readable by any client app that has your `google-services.json`; treat all Remote Config values as public.
- **Using sequential `SetValueAsync()` calls for related data** — not atomic; a connection drop between calls leaves the database in an inconsistent state. Use `UpdateChildrenAsync()` instead.
- **Ignoring `DatabaseError` in `ValueChanged` handlers** — permission errors and connection failures surface through `args.DatabaseError`; swallowing it silently breaks the listener.
- **Relying on desktop Firebase in production builds** — desktop support is beta and explicitly documented as development-only by Google.
