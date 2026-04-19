# Zenject — Async Initialization

> See also: [zenject.md](../zenject.md)

Zenject's standard injection is synchronous and one-time. Use `AsyncInject<T>` when a dependency must be resolved asynchronously (e.g., loading from Addressables, remote config, async database) before it's available to consumers.

---

## Core Concept

`AsyncInject<T>` is an intermediary wrapper. Instead of injecting `T` directly (which would block if `T` isn't ready), inject `AsyncInject<T>` and poll or await it when the value is needed.

## Binding

```csharp
Container.BindAsync<IFoo>()
    .FromMethod(async () =>
    {
        await Task.Delay(100);              // simulate async work
        return (IFoo)new Foo();
    })
    .AsCached();
```

Add `.NonLazy()` to start the async operation immediately at container build time, rather than on first resolve:

```csharp
Container.BindAsync<RemoteConfig>()
    .FromMethod(async () => await RemoteConfigLoader.LoadAsync())
    .AsCached()
    .NonLazy();
```

## Consuming AsyncInject\<T\>

```csharp
public class GameBootstrapper : IInitializable, IDisposable
{
    readonly AsyncInject<RemoteConfig> _remoteConfig;

    public GameBootstrapper(AsyncInject<RemoteConfig> remoteConfig)
    {
        _remoteConfig = remoteConfig;
    }

    public void Initialize()
    {
        // Option 1: check if ready now
        if (_remoteConfig.TryGetResult(out var config))
        {
            ApplyConfig(config);
        }
        else
        {
            // Option 2: react when it arrives
            _remoteConfig.Completed += OnConfigLoaded;
        }
    }

    void OnConfigLoaded(RemoteConfig config)
    {
        ApplyConfig(config);
    }

    public void Dispose()
    {
        _remoteConfig.Completed -= OnConfigLoaded;
    }
}
```

## AsyncInject\<T\> API

| Member | Type | Description |
|--------|------|-------------|
| `HasResult` | `bool` | True when the async operation has completed |
| `TryGetResult(out T)` | `bool` | Returns false if not yet resolved |
| `Result` | `T` | Direct access — throws `InvalidOperationException` if not ready |
| `Completed` | `event Action<T>` | Fires once when the value becomes available |
| `await asyncInject` | awaitable | Await the inject directly in an async method |

**Await directly (UniTask / async-compatible contexts):**
```csharp
public async UniTask Initialize()
{
    var config = await _remoteConfig;
    ApplyConfig(config);
}
```

## Current Limitations

- `BindAsync` does not support pooling (no `FromMemoryPool` equivalent).
- `BindAsync` does not support factory creation methods (`FromFactory`, `FromMethod` with parameters).
- Validation does not execute async methods — async bindings are not validated by `CTRL+SHIFT+V`.

## Key Rules

- Use `AsyncInject<T>` only when the dependency genuinely requires async resolution (remote data, Addressables, file I/O). For everything else, use synchronous injection.
- Always handle the "not yet ready" case — never access `.Result` without checking `HasResult` or awaiting first.
- Unsubscribe from `Completed` in `Dispose()` to prevent callbacks on destroyed objects.
- Prefer `.NonLazy()` when the async operation is expensive and should start as early as possible.
- `AsCached()` ensures the async method runs once and the result is shared — use `AsTransient()` only if each consumer needs its own async resolution.
