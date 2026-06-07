---
version: 1.0.0
---

# Addressables

> **Scope**: Unity Addressable Asset System — async asset loading and releasing, memory management via reference counting, AssetBundle lifecycle, groups and labels organization, profiles, content builds, and remote content delivery.
> **Load when**: loading or unloading assets at runtime with Addressables, working with AsyncOperationHandle or AssetReference, managing groups and profiles, debugging memory leaks from unreleased assets, integrating Addressables with UniTask, configuring content builds or remote delivery.

---

## Core Concepts

- **Addressable Asset**: any project asset marked as Addressable with a unique string address.
- **Address**: a string key (e.g. `"Characters/Hero"`) decoupled from the asset's physical path — location can change without touching game code.
- **AssetBundle**: the underlying bundle Unity packages Addressable group assets into at build time.
- **Content Catalog**: a runtime file mapping addresses to asset locations. Can be local or remote (with hash file for update checking).
- **Group**: a named collection of assets sharing build and load settings (local vs. remote, compression, packing mode).
- **Label**: a tag applied to assets across multiple groups; enables bulk loading by label.
- **Profile**: a named set of path variables (`Build Path`, `Load Path`) for different environments (development, staging, production).
- **AsyncOperationHandle\<T\>**: the handle returned by every async load/instantiate call. Holds the result, operation status, and is used for release.
- **AssetReference**: a serializable Inspector-friendly field type for Addressable asset assignment. Prefer over raw strings for editor-assigned assets.

---

## API / Interface

### Load a Single Asset

```csharp
AsyncOperationHandle<T> handle = Addressables.LoadAssetAsync<T>(addressOrKey);
```

Three standard completion patterns:

```csharp
// 1. Coroutine
IEnumerator Load()
{
    var handle = Addressables.LoadAssetAsync<T>(address);
    yield return handle;
    if (handle.Status == AsyncOperationStatus.Succeeded) Use(handle.Result);
}

// 2. Callback
handle.Completed += h =>
{
    if (h.Status == AsyncOperationStatus.Succeeded) Use(h.Result);
    else Debug.LogError($"Load failed: {h.OperationException}");
};

// 3. UniTask (preferred — see UniTask Integration below)
T asset = await handle.ToUniTask(cancellationToken: ct);
```

### Load Multiple Assets by Label or Keys

```csharp
AsyncOperationHandle<IList<T>> handle = Addressables.LoadAssetsAsync<T>(
    keys,                          // single key or IList<string>
    asset => { /* per-asset callback, called as each asset loads */ },
    Addressables.MergeMode.Union,  // Union or Intersection for multiple keys
    releaseDependenciesOnFailure: false
);
await handle.Task;
// Release the whole batch with one call:
Addressables.Release(handle);
```

### Instantiate a Prefab

```csharp
// InstantiateAsync tracks the handle internally (trackHandle = true by default)
AsyncOperationHandle<GameObject> handle =
    Addressables.InstantiateAsync(address, position, rotation, parent);
await handle.Task;

// To destroy + release in one call:
Addressables.ReleaseInstance(handle);
// Or using the GameObject reference:
Addressables.ReleaseInstance(go);
```

> Do NOT call `Addressables.Release(handle)` on instantiate handles — use `Addressables.ReleaseInstance`.

### Load via AssetReference

```csharp
public AssetReference reference; // Assign in Inspector

void Start()
{
    var handle = reference.LoadAssetAsync<T>();
    handle.Completed += h =>
    {
        if (h.Status == AsyncOperationStatus.Succeeded)
            Instantiate(reference.Asset as T);
    };
}

void OnDestroy()
{
    reference.ReleaseAsset();
}
```

### Load a Scene

```csharp
AsyncOperationHandle<SceneInstance> sceneHandle =
    Addressables.LoadSceneAsync(sceneRef, LoadSceneMode.Additive);
await sceneHandle.Task;

// Unload when leaving:
await Addressables.UnloadSceneAsync(sceneHandle).Task;
```

### Query Locations Without Loading

```csharp
var locHandle = Addressables.LoadResourceLocationsAsync(keyOrLabel);
await locHandle.Task;
foreach (var loc in locHandle.Result)
{
    Debug.Log($"{loc.PrimaryKey} — {loc.ResourceType}");
}
Addressables.Release(locHandle); // always release location handles too
```

---

## UniTask Integration

When both Addressables and UniTask are imported, `AsyncOperationHandle` is automatically awaitable via UniTask. No extra configuration needed.

```csharp
using Cysharp.Threading.Tasks;
using UnityEngine.AddressableAssets;

// Basic await with cancellation support
T asset = await Addressables.LoadAssetAsync<T>(address).ToUniTask(cancellationToken: ct);

// Auto-release the handle when the token is cancelled
T asset = await Addressables.LoadAssetAsync<T>(address)
    .ToUniTask(cancellationToken: ct, autoReleaseWhenCanceled: true);

// Full service wrapper pattern
public async UniTask<T> LoadAsync<T>(string address, CancellationToken ct)
{
    var handle = Addressables.LoadAssetAsync<T>(address);
    try
    {
        return await handle.ToUniTask(cancellationToken: ct);
    }
    catch
    {
        if (handle.IsValid()) Addressables.Release(handle);
        throw;
    }
}
```

**Prefer `.ToUniTask(ct)` over `.Task`** — integrates with cancellation token conventions, supports `autoReleaseWhenCanceled`, and fits the project's async style.

**Known issue**: `Addressables.InstantiateAsync(...).ToUniTask()` can throw `InvalidKeyException` when bundle dependencies are involved. Use `LoadAssetAsync<GameObject>` + `Instantiate` as an alternative.

---

## Release Rules

**Mirror every load call with a release call.** This is the single most important rule for Addressables memory management.

| Load call | Matching release |
|-----------|-----------------|
| `Addressables.LoadAssetAsync<T>` | `Addressables.Release(handle)` |
| `AssetReference.LoadAssetAsync<T>` | `reference.ReleaseAsset()` |
| `Addressables.LoadAssetsAsync<T>` | `Addressables.Release(handle)` |
| `Addressables.InstantiateAsync` | `Addressables.ReleaseInstance(handle or go)` |
| `Addressables.LoadSceneAsync` | `Addressables.UnloadSceneAsync(handle)` |
| `Addressables.LoadResourceLocationsAsync` | `Addressables.Release(handle)` |

**Standard pattern — release in `OnDestroy`:**

```csharp
private AsyncOperationHandle<T> _handle;

void Start()
{
    _handle = Addressables.LoadAssetAsync<T>(address);
    _handle.Completed += h =>
    {
        if (h.Status == AsyncOperationStatus.Succeeded) Use(h.Result);
    };
}

void OnDestroy()
{
    if (_handle.IsValid())
        Addressables.Release(_handle);
}
```

Always guard with `handle.IsValid()` before releasing — prevents double-release exceptions.

---

## Memory Management

**Reference counting:** each asset and bundle maintains a reference count. Loading increments, releasing decrements. When the count reaches zero the asset is eligible for unloading; actual unload happens when the containing AssetBundle's count also reaches zero.

**AssetBundle atomicity:** you cannot partially unload a bundle. All assets in a bundle stay in memory until the entire bundle is unloaded. Group assets that load and unload together into the same bundle.

**Asset churn:** releasing the last asset in a bundle and immediately reloading any asset from that same bundle triggers a wasteful unload+reload cycle. Keep bundles loaded through transitions if assets in them are needed again shortly.

**Avoid `Resources.UnloadUnusedAssets()`** — it is very slow and causes frame hitches. Only acceptable on dedicated loading screens when all other options are exhausted.

**Event Viewer** (Window → Asset Management → Addressables → Event Viewer): real-time visualization of load/release events and reference counts. Use during development to catch leaks and unexpected churn.

---

## Groups & Organization

**Group by usage cohort** — assets that load and unload at the same time belong in the same bundle. This prevents dependency-induced bundle loading and asset churn.

**Group by update frequency:**
- Stable assets → **Local** group (shipped with the build)
- Frequently updated assets → **Remote** group (served from CDN/CCD)

**Packing mode guidance:**

| Mode | Bundle result | When to use |
|------|---------------|-------------|
| Pack Together | One bundle per group | Coarse load/unload, best compression |
| Pack Separately | One bundle per asset | Maximum granularity, high overhead |
| Pack by Label | One bundle per label | Themed asset sets |

**Labels** — use for cross-group bulk loading (e.g. `Addressables.LoadAssetsAsync<T>("level-1", ...)`). Avoid over-labeling: each label combination adds catalog size.

**Compression:**
- Local bundles → `LZ4` (fast random access, good for loading screens)
- Remote bundles → `LZMA` (better ratio for downloads)

---

## Profiles

Define separate profiles for each environment and switch via the Profiles window (Window → Asset Management → Addressables → Profiles):

| Variable | Development | Production |
|----------|-------------|------------|
| `LocalBuildPath` | `[UnityEngine.AddressableAssets.Addressables.BuildPath]/[BuildTarget]` | same |
| `RemoteBuildPath` | local server path | CDN upload path |
| `RemoteLoadPath` | `http://localhost/[BuildTarget]` | `https://cdn.example.com/[BuildTarget]` |

Keep bootstrapping assets and the initial catalog on `Local` — they must be available before network requests can be made.

---

## Build & Deployment

1. **Content Build** is separate from Player Build. Run: **Build → New Build → Default Build Script**.
2. For incremental remote updates: **Build → Update a Previous Build** (preserves catalog compatibility).
3. Deploy the remote catalog + hash file together — the hash enables update detection at runtime.
4. Always run a Content Build before entering Play Mode with **Use Existing Build** play mode.

**Analyze Tool** (Window → Asset Management → Addressables → Analyze): detects duplicate assets in multiple bundles and missing dependencies before building.

---

## Anti-patterns

- **Missing release** — loading an asset and never calling `Release` leaks it until app exit. Every load must have a paired release. No exceptions.
- **Double release** — calling `Release` on an already-released handle throws. Guard with `handle.IsValid()`.
- **Using `Addressables.Release` on instantiate handles** — instantiated objects require `Addressables.ReleaseInstance`, not `Addressables.Release`.
- **String addresses in code for editor-assigned assets** — prefer `AssetReference` typed fields; string keys are for data-driven/dynamic loading only.
- **Ignoring `AsyncOperationStatus.Failed`** — always check `handle.Status` after completion; swallowed failures produce silent null references downstream.
- **`InstantiateAsync().ToUniTask()` with bundle dependencies** — known UniTask issue causing `InvalidKeyException`. Use `LoadAssetAsync<GameObject>` + `Object.Instantiate` instead.
- **Loading additive scenes without unloading** — scenes accumulate in memory; always call `UnloadSceneAsync` when a scene is no longer needed.
- **Mixing Resources and Addressables for the same asset** — an asset can't be managed by both systems simultaneously; pick one and be consistent.
