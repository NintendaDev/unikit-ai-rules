---
version: 1.0.0
---

# UniTask Async/Await

> **Scope**: UniTask async/await rules — CancellationToken, exception handling, timeouts, UniTaskVoid, API conventions.
> **Load when**: async code, UniTask, CancellationToken, CancellationTokenSource, async UniTask, UniTaskVoid, await.

---

## Rules

Use UniTask only when async tasks are genuinely required.

### CancellationToken — Mandatory

- Every async method MUST accept `CancellationToken cancellationToken` as **last** parameter
- Parameter name ALWAYS `cancellationToken` (not `ct`, not `token`)
- Pass token to **all** nested async calls

```csharp
// WRONG
public async UniTask LoadDataAsync() { ... }

// CORRECT
public async UniTask LoadDataAsync(CancellationToken cancellationToken) { ... }
```

### CancellationTokenSource Management

**Plain classes** — create CTS, release via `IDisposable`:

```csharp
public sealed class DataLoader : IDisposable
{
    private CancellationTokenSource _cancellationTokenSource;

    public async UniTask LoadAsync()
    {
        _cancellationTokenSource = new CancellationTokenSource();
        try { await LoadInternalAsync(_cancellationTokenSource.Token); }
        catch (OperationCanceledException) { }
    }

    public void Dispose()
    {
        _cancellationTokenSource?.Cancel();
        _cancellationTokenSource?.Dispose();
        _cancellationTokenSource = null;
    }
}
```

**MonoBehaviour** — use `this.GetCancellationTokenOnDestroy()` for lifecycle binding.

### Linked Tokens

```csharp
using var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(
    _operationCts.Token, externalCancellationToken);
await PerformOperationAsync(linkedCts.Token);
```

### Exception Handling

- ALWAYS wrap async calls in `try-catch` with `OperationCanceledException` handling
- In long loops check `cancellationToken.ThrowIfCancellationRequested()`

### UniTask API — Always Pass Token

```csharp
await UniTask.Delay(TimeSpan.FromSeconds(1), cancellationToken: cancellationToken);
await UniTask.WaitUntil(condition, PlayerLoopTiming.Update, cancellationToken);
await UniTask.WhenAll(LoadUserDataAsync(cancellationToken), LoadGameDataAsync(cancellationToken));
await SceneManager.LoadSceneAsync(sceneName).ToUniTask(cancellationToken: cancellationToken);
await Addressables.LoadAssetAsync<T>(key).ToUniTask(cancellationToken: cancellationToken);
```

### UniTaskVoid

- Use `async UniTaskVoid` ONLY in MonoBehaviour for fire-and-forget (Start, event handlers)
- Do NOT use `UniTaskVoid` in plain classes — use `UniTask`

### Timeouts

```csharp
using var timeoutCts = new CancellationTokenSource();
timeoutCts.CancelAfterSlim(TimeSpan.FromSeconds(5));
using var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken, timeoutCts.Token);
try { await LoadDataAsync(linkedCts.Token); }
catch (OperationCanceledException) when (timeoutCts.IsCancellationRequested) { /* timeout */ }
```

## Anti-patterns

- Do NOT use `.Forget()` without error handling — wrap in `UniTaskVoid` with try-catch
- Do NOT use `async void` — only `async UniTask` or `async UniTaskVoid`
- Do NOT forget `Dispose()` for `CancellationTokenSource`

## Async Safety

- When state is mutated before an async operation (e.g., registered in a dictionary before `LoadAsync`), wrap the async call in `try-catch(OperationCanceledException)` to unregister/rollback the state before rethrowing — prevents inconsistent state on cancellation
- Event subscriptions that precede fallible async operations should be wrapped in `try-catch` with unsubscribe in `catch` block — prevents dangling subscriptions on failure
- When multiple async methods can load the same resource concurrently, deduplicate loads using a "loading in progress" guard (HashSet/Dictionary) with wait-for-completion fallback — never assume async pool accessors won't overlap
- In async resource acquisition chains (e.g., LoadAsync → Instantiate → GetComponent), if a subsequent step fails, release resources acquired by previous steps in the catch block (e.g., Addressables.Release after failed Instantiate)
