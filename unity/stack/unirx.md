---
version: 1.0.0
---

# UniRx

> **Scope**: UniRx reactive programming for Unity — observables, subscriptions, ReactiveProperty, Subject types, operators, Unity lifecycle integration, subscription disposal, MVVM/MVP patterns, and MessageBroker pub/sub.
> **Load when**: working with UniRx observables or ReactiveProperty, subscribing to event streams, using Subject to bridge Unity callbacks, managing subscription lifecycle and disposal, authoring reactive UI bindings, debugging memory leaks from undisposed subscriptions, integrating UniRx with MVVM or MVP architecture.

---

> **Status notice:** UniRx repository was archived in February 2024. The creator recommends migrating to **Cysharp/R3** for new projects. Use UniRx only when working with an existing codebase that already depends on it.

---

## Core Concepts

UniRx treats events, timers, and data changes as composable streams. Every stream follows the contract: `OnNext* (OnError | OnCompleted)?`

| Type | Role |
|------|------|
| `IObservable<T>` | Source stream — emits values over time |
| `IObserver<T>` | Consumer — receives `OnNext`, `OnError`, `OnCompleted` |
| `Subject<T>` | Both observable and observer — bridges non-Rx callbacks |
| `ReactiveProperty<T>` | Observable value wrapper — notifies subscribers on value change |
| `IDisposable` | Subscription handle — **must be disposed** to stop the stream |

---

## Subject Types

| Type | Behavior | When to Use |
|------|----------|-------------|
| `Subject<T>` | No initial value; emits only future values | Event-like one-shot signals |
| `BehaviorSubject<T>` | Holds current value; new subscribers receive it immediately | State with a meaningful "current value" |
| `ReplaySubject<T>` | Buffers past N values; replays them to new subscribers | Late subscribers that need history |
| `AsyncSubject<T>` | Emits only the last `OnNext` value, and only on `OnCompleted` | Single async result |

Use `Subject<T>` to bridge Unity callbacks into observable streams:

```csharp
static Subject<string> _errorSubject;

public static IObservable<string> ErrorsAsObservable()
{
    if (_errorSubject == null)
    {
        _errorSubject = new Subject<string>();
        Application.logMessageReceived += (condition, _, type) =>
        {
            if (type == LogType.Error)
                _errorSubject.OnNext(condition);
        };
    }
    return _errorSubject.AsObservable(); // expose as read-only
}
```

Always expose `Subject<T>` fields as `IObservable<T>` via `.AsObservable()` — prevents external code from calling `OnNext`.

---

## ReactiveProperty

`ReactiveProperty<T>` is an observable value: read `.Value` to get current, write `.Value` to notify all subscribers.

```csharp
// Model
public class Enemy
{
    public ReactiveProperty<long> CurrentHp { get; } = new ReactiveProperty<long>(1000);
    public ReadOnlyReactiveProperty<bool> IsDead { get; }

    public Enemy()
    {
        IsDead = CurrentHp.Select(hp => hp <= 0).ToReadOnlyReactiveProperty();
    }
}

// Presenter
enemy.CurrentHp.SubscribeToText(hpText);
enemy.CurrentHp.SubscribeToText(hpText, hp => $"HP: {hp}");
enemy.IsDead
    .Where(dead => dead)
    .Subscribe(_ => button.interactable = false)
    .AddTo(this);
```

Use `ReadOnlyReactiveProperty<T>` for derived computed values that must not be set externally:

```csharp
FullName = GivenName
    .CombineLatest(FamilyName, (g, f) => $"{g} {f}")
    .ToReadOnlyReactiveProperty();
```

Inspector-serializable variants (show in Unity Inspector): `IntReactiveProperty`, `FloatReactiveProperty`, `BoolReactiveProperty`, `StringReactiveProperty`.

Force subscribers to update even when value hasn't changed:

```csharp
property.SetValueAndForceNotify(property.Value);
```

---

## Observable Creation

| Factory | Description |
|---------|-------------|
| `Observable.EveryUpdate()` | Emits every frame (Update loop) |
| `Observable.EveryFixedUpdate()` | Emits every FixedUpdate |
| `Observable.EveryEndOfFrame()` | Emits at end of frame |
| `Observable.Timer(dueTime)` | Single emission after time delay |
| `Observable.Interval(period)` | Periodic emissions at fixed interval |
| `Observable.IntervalFrame(n)` | Periodic emissions every N frames |
| `Observable.TimerFrame(n)` | Single emission after N frames |
| `Observable.Return(value)` | Single value then complete |
| `Observable.Empty<T>()` | Completes immediately, no values |
| `Observable.Never<T>()` | Never emits, never completes |
| `Observable.Throw<T>(ex)` | Errors immediately |
| `Observable.Create<T>(observer => ...)` | Custom observable with manual control |
| `Observable.FromCoroutine(...)` | Wraps `IEnumerator` as observable |
| `Observable.Start(Func<T>)` | Runs on thread pool, result available on main thread |

---

## Operators

### Filtering & Transformation

```csharp
.Where(x => x > 0)               // pass only values matching predicate
.Select(x => x * 2)              // transform each value
.SelectMany(x => LoadAsync(x))   // flatten inner observable (replaces nested Subscribe)
.Distinct()                      // skip duplicate values
.DistinctUntilChanged()          // skip consecutive identical values
.First()                         // take first value then complete
.Take(n)                         // complete after N values
.Skip(n)                         // ignore first N values
.Buffer(n)                       // collect N values into List<T>, emit list
.Scan(seed, (acc, x) => ...)     // running accumulator (like Aggregate but continuous)
```

### Combining

```csharp
.Merge(other)                                 // emit from either source as they arrive
.Zip(other, (a, b) => ...)                    // pair values by index, waits for both
.CombineLatest(other, (a, b) => ...)          // pair latest from each, emits on any change
Observable.WhenAll(obs1, obs2, obs3)          // wait for all to complete, collect results array
```

### Timing

```csharp
.Throttle(TimeSpan.FromSeconds(1))            // emit after 1s of silence
.ThrottleFirst(TimeSpan.FromSeconds(1))       // emit first, suppress next 1s
.Delay(TimeSpan.FromSeconds(0.5))             // shift each emission by delay
.Timeout(TimeSpan.FromSeconds(5))            // error if no emission within 5s
.Sample(TimeSpan.FromSeconds(1))             // emit latest value every 1s
.SampleFrame(30)                             // emit latest value every 30 frames
.DelayFrame(n)                               // delay each emission by N frames
```

### Lifecycle / Completion

```csharp
.TakeWhile(predicate)                // complete when predicate returns false
.TakeUntil(other)                    // complete when another observable emits
.TakeUntilDestroy(gameObject)        // complete on GameObject.OnDestroy
.TakeUntilDisable(component)         // complete when component is disabled
.RepeatUntilDestroy(gameObject)      // restart on OnCompleted, stop on destroy
.RepeatUntilDisable(component)       // restart on OnCompleted, stop on disable
```

### Error Handling

```csharp
.Catch<T, TException>(ex => fallback)  // recover from specific exception type
.CatchIgnore<T, TException>()          // silently swallow exception, complete
.OnErrorRetry(maxRetryCount: 3)        // retry up to 3 times on error
```

### Threading

```csharp
.ObserveOnMainThread()      // marshal subsequent operators to Unity main thread
.SubscribeOnMainThread()    // subscribe on main thread
```

---

## Subscription Disposal

Every `Subscribe()` returns `IDisposable`. Not disposing causes:
- Memory leaks (subscribers held alive)
- Callbacks on destroyed objects (NullReferenceException, MissingReferenceException)

### AddTo — preferred for MonoBehaviours

Automatically disposes when the component or GameObject is destroyed:

```csharp
Observable.EveryUpdate()
    .Where(_ => Input.GetKeyDown(KeyCode.Space))
    .Subscribe(_ => Fire())
    .AddTo(this);          // disposed on this.OnDestroy()
```

`AddTo` overloads:
- `AddTo(Component)` — destroyed with component's GameObject
- `AddTo(GameObject)` — destroyed with the GameObject
- `AddTo(ICollection<IDisposable>)` — added to any collection (e.g., `CompositeDisposable`)

### CompositeDisposable — for multiple subscriptions

```csharp
readonly CompositeDisposable _disposables = new CompositeDisposable();

void Start()
{
    _hp.Subscribe(UpdateHpBar).AddTo(_disposables);
    _isDead.Subscribe(ShowDeathScreen).AddTo(_disposables);
}

void OnDestroy() => _disposables.Dispose();
```

- `Clear()` — disposes all entries and empties the collection (reusable after clear)
- `Dispose()` — disposes all and permanently closes the collection

### TakeUntilDestroy — for non-MonoBehaviour subscriptions

```csharp
model.Health
    .TakeUntilDestroy(this.gameObject)
    .Subscribe(UpdateHpBar);
```

---

## ObservableTriggers

Converts MonoBehaviour lifecycle events to observables without subclassing.

```csharp
// Lifecycle
this.UpdateAsObservable()
this.FixedUpdateAsObservable()
this.LateUpdateAsObservable()
this.OnDestroyAsObservable()
this.OnEnableAsObservable()
this.OnDisableAsObservable()
this.StartAsObservable()
this.AwakeAsObservable()

// Physics
this.OnTriggerEnterAsObservable()
this.OnTriggerExitAsObservable()
this.OnTriggerStayAsObservable()
this.OnCollisionEnterAsObservable()
this.OnCollisionExitAsObservable()
this.OnCollisionStayAsObservable()

// Input (legacy Input Manager only — does NOT work with new Input System)
this.OnMouseDownAsObservable()
this.OnMouseUpAsObservable()
```

For an external GameObject, add the trigger component manually:

```csharp
var trigger = other.AddComponent<ObservableUpdateTrigger>();
trigger.UpdateAsObservable()
    .Subscribe(HandleOtherUpdate)
    .AddTo(this);
```

---

## Unity UI Binding

```csharp
// Button
button.OnClickAsObservable().Subscribe(_ => OnClick()).AddTo(this);

// Toggle
toggle.OnValueChangedAsObservable().Subscribe(isOn => Handle(isOn)).AddTo(this);

// InputField
inputField.OnValueChangedAsObservable()
    .Throttle(TimeSpan.FromMilliseconds(300))
    .Subscribe(text => Search(text))
    .AddTo(this);

// Bind ReactiveProperty to UI Text
health.SubscribeToText(healthText);                      // "42"
health.SubscribeToText(healthText, h => $"HP: {h}");    // "HP: 42"

// Bind bool ReactiveProperty to button interactable
isReady.SubscribeToInteractable(button);

// Pipe one UI event to another
toggle.OnValueChangedAsObservable()
    .SubscribeToInteractable(button);
```

---

## MessageBroker

Type-filtered in-memory pub/sub. Decouples publishers from subscribers without direct references.

```csharp
// Subscribe — typically in Start/Awake, always AddTo
MessageBroker.Default
    .Receive<EnemyDiedEvent>()
    .Subscribe(e => score += e.Points)
    .AddTo(this);

// Publish — from anywhere
MessageBroker.Default.Publish(new EnemyDiedEvent { Points = 100 });
```

Create isolated brokers (avoid polluting the global scope):

```csharp
// Prefer scoped broker over MessageBroker.Default in modular designs
private readonly MessageBroker _broker = new MessageBroker();
```

---

## Async & Coroutine Integration

```csharp
// FromCoroutine — wrap IEnumerator as observable with cancellation support
IObservable<Texture2D> LoadTexture(string url) =>
    Observable.FromCoroutine<Texture2D>((observer, ct) => LoadCoroutine(url, observer, ct));

// Start — run heavy work off the main thread, receive result on main thread
Observable.Start(() => HeavyComputation())
    .ObserveOnMainThread()
    .Subscribe(result => Apply(result))
    .AddTo(this);

// WhenAll — fire multiple async operations in parallel, wait for all
Observable.WhenAll(
        FetchData("https://api.example.com/a"),
        FetchData("https://api.example.com/b"))
    .Subscribe(results => ProcessAll(results[0], results[1]))
    .AddTo(this);
```

---

## Patterns & Examples

### Input with cooldown

```csharp
this.UpdateAsObservable()
    .Where(_ => Input.GetKeyDown(KeyCode.Space))
    .ThrottleFirst(TimeSpan.FromSeconds(0.5f))
    .Subscribe(_ => Jump())
    .AddTo(this);
```

### Drag-and-drop

```csharp
var trigger = GetComponent<ObservableEventTrigger>();
trigger.OnBeginDragAsObservable()
    .SelectMany(_ => trigger.OnDragAsObservable()
        .TakeUntil(trigger.OnEndDragAsObservable()))
    .RepeatUntilDestroy(this)
    .Subscribe(e => HandleDrag(e))
    .AddTo(this);
```

### Watch external property each frame

```csharp
transform.ObserveEveryValueChanged(t => t.position)
    .Subscribe(pos => OnPositionChanged(pos))
    .AddTo(this);
```

### MVP presenter wiring

```csharp
void Start()
{
    // View → Model
    _attackButton.OnClickAsObservable()
        .Subscribe(_ => _player.Attack())
        .AddTo(this);

    // Model → View
    _player.Health
        .SubscribeToText(_healthText, h => $"{h} HP")
        .AddTo(this);

    _player.IsDead
        .Where(dead => dead)
        .Subscribe(_ => ShowGameOver())
        .AddTo(this);
}
```

---

## Anti-patterns

**Nested Subscribe — never subscribe inside Subscribe:**

```csharp
// BAD: inner subscription is never disposed — leak
outer.Subscribe(x =>
{
    inner.Subscribe(y => Use(x, y));
});

// GOOD: use CombineLatest or SelectMany
outer.CombineLatest(inner, (x, y) => (x, y))
    .Subscribe(pair => Use(pair.x, pair.y))
    .AddTo(this);
```

**Raw `Repeat()` without lifecycle guard:**

```csharp
// BAD: infinite loop that never stops, freezes editor on play
observable.Repeat().Subscribe(Process);

// GOOD: tie to a lifecycle
observable.RepeatUntilDestroy(this).Subscribe(Process).AddTo(this);
```

**Ignoring the disposable:**

```csharp
// BAD: no disposal — subscription lives until process exit
Observable.Interval(TimeSpan.FromSeconds(1)).Subscribe(Tick);

// GOOD
Observable.Interval(TimeSpan.FromSeconds(1)).Subscribe(Tick).AddTo(this);
```

**ReactiveProperty allocated in a property getter:**

```csharp
// BAD: new instance created on every access
public ReactiveProperty<int> Score => new ReactiveProperty<int>();

// GOOD: allocated once
public ReactiveProperty<int> Score { get; } = new ReactiveProperty<int>();
```

**`OnMouseDownAsObservable` with new Input System:**

```csharp
// BAD: does not fire when the new Input System is active
this.OnMouseDownAsObservable().Subscribe(OnClick);

// GOOD: use UI Button's observable, or handle via new Input System API
button.OnClickAsObservable().Subscribe(OnClick).AddTo(this);
```
