---
version: 1.0.0
---

# ASPID MVVM — UI Binding Framework

> **Scope**: Rules for Aspid.MVVM UI binding framework: ViewModel creation, MonoView, binding attributes, commands, observable collections, binders, Zenject registration, R3 integration.
> **Load when**: UI views, ViewModel, MonoView, data binding, ICommand, RelayCommand, ASPID MVVM, UI feature development.
> **References**: `references/aspid-mvvm-binders-quickref.md` (quick lookup), `references/aspid-mvvm-binders-full.md` (exhaustive index), `references/aspid-mvvm-converters.md` (converter catalog).

---

## Overview

Aspid.MVVM — source-generator-based MVVM framework for Unity UI. Code creates ViewModel (plain C#) and View (MonoBehaviour inheriting `MonoView`). Scene configuration (ViewInitializer, Binders on children) is done manually in Unity Editor.

Before writing ASPID MVVM code, load up-to-date docs via Context7 MCP (search "Aspid MVVM" or "aspid-mvvm").

---

## Data Flow & Responsibilities

### Architecture Rule: ViewModel is Self-Managing

ViewModel is the **sole owner of its state**. It receives domain dependencies via constructor (DI), subscribes to domain services/models in `Initialize()`, and handles user actions through `[RelayCommand]`. **No external Presenter or Controller is needed** to drive the ViewModel — it manages itself.

External code **must not** set ViewModel properties directly. The only acceptable ways to update ViewModel state:
1. ViewModel subscribes to domain services via R3 in `Initialize()`
2. ViewModel reacts to user commands (`[RelayCommand]`)
3. Parent ViewModel creates child ViewModels via factory methods (for collections)

### Data Flow Diagram

```
Domain Model / Service
        │
        ├── (constructor DI) ──→ ViewModel (dependencies)
        │
        └── (R3 Observable) ──→ ViewModel.Initialize() ──→ ViewModel properties
                                                                │
                                                    (Source-gen binding)
                                                                │
                                                                ▼
                                                        MonoView / Binders ──→ UI
                                                                ▲
                                                                │
                                                    User action (click, input)
                                                                │
                                                        [RelayCommand] ──→ Service call
```

### Lifecycle

1. **Zenject** resolves ViewModel with all constructor dependencies
2. **Zenject** calls `Initialize()` (via `IComponentInitializable`) — ViewModel sets up R3 subscriptions
3. **ViewInitializer** (or manual code) calls `_view.Initialize(viewModel)` — binding is activated
4. During gameplay — ViewModel reacts to R3 streams and commands, View auto-updates via binders
5. **Cleanup** — `_view.DeinitializeView()?.DisposeViewModel()`, or Zenject calls `Dispose()` (via `IDisposable`) automatically when the container is destroyed

**Important:** `BindInterfacesAndSelfTo<T>()` in Zenject auto-binds both `IComponentInitializable` (for `Initialize()`) and `IDisposable` (for `Dispose()`). This is why it is required for ViewModel registration.

---

## ViewInitializer (Scene Setup)

`ViewInitializer` is a **StarterKit component** added to the View's GameObject in the Unity Inspector. It replaces manual Bootstrap code for connecting Views to ViewModels.

### Configuration in Inspector

1. Add `ViewInitializer` component to the same GameObject as the View
2. Drag the View into the `View` field
3. Set `Resolve` mode:
   - **DI (Zenject)** — ViewModel is resolved from the DI container automatically
   - **References** — ViewModel is serialized directly in the Inspector (requires `[Serializable]` on ViewModel)

### Manual Alternative (Bootstrap Code)

When `ViewInitializer` is not used, connect View to ViewModel manually:

```csharp
// Initialization
_view.Initialize(viewModel);

// Deinitialization + disposal
_view.DeinitializeView()?.DisposeViewModel();
```

### Zenject Integration

Enabled via define symbol `ASPID_MVVM_ZENJECT_INTEGRATION` in Project Settings > Player > Scripting Define Symbols. After enabling, `ViewInitializer` can automatically resolve ViewModels from the Zenject container.

---

## File Locations & Namespaces

| File | Path | Namespace |
|------|------|-----------|
| ViewModel | `Assets/Game/Scripts/Gameplay/UI/{Feature}/{Feature}ViewModel.cs` | `Game.Gameplay.UI` |
| View | `Assets/Game/Scripts/Gameplay/UI/{Feature}/{Feature}View.cs` | `Game.Gameplay.UI` |
| Child ViewModel | `Assets/Game/Scripts/Gameplay/UI/{Feature}/{Sub}/{Sub}ViewModel.cs` | `Game.Gameplay.UI` |
| Child View | `Assets/Game/Scripts/Gameplay/UI/{Feature}/{Sub}/{Sub}View.cs` | `Game.Gameplay.UI` |
| Zenject installer | `Assets/Game/Scripts/Gameplay/UI/GameplayUIInstaller.cs` | `Game.Gameplay.UI` |

**Namespace is always `Game.Gameplay.UI`** regardless of nesting depth.

---

## ViewModel

### Rules

1. `[ViewModel]` attribute on class
2. `sealed partial` modifiers
3. Implement `IDisposable` for subscription cleanup
4. Implement `IComponentInitializable` for deferred initialization (R3 subscriptions)
5. Dependencies via constructor, all dependency fields `readonly`
6. Binding field names: underscore prefix + camelCase (`_fieldName`)
7. In code use **generated properties** (PascalCase), not backing fields

### Template

```csharp
using System;
using Aspid.MVVM;
using Aspid.MVVM.StarterKit;
using R3;

namespace Game.Gameplay.UI
{
    [ViewModel]
    public sealed partial class {Feature}ViewModel : IDisposable, IComponentInitializable
    {
        private readonly ISomeService _someService;
        private readonly CompositeDisposable _disposables = new();

        [OneWayBind] private string _title;
        [OneWayBind] private int _count;
        [TwoWayBind] private string _inputText;

        public {Feature}ViewModel(ISomeService someService)
        {
            _someService = someService;
        }

        public void Dispose() => _disposables.Dispose();

        public void Initialize()
        {
            _someService.Title
                .Subscribe(value => Title = value)
                .AddTo(_disposables);
        }

        [RelayCommand]
        private void Submit()
        {
            _someService.Submit(InputText);
        }

        [RelayCommand(CanExecute = nameof(CanReset))]
        private void Reset()
        {
            Count = 0;
        }

        private bool CanReset() => Count > 0;
    }
}
```

### Binding Attributes

| Attribute | Direction | Use Case |
|-----------|-----------|----------|
| `[OneWayBind]` | ViewModel -> View | Display data (text, icons, progress) |
| `[TwoWayBind]` | ViewModel <-> View | Input fields (InputField) |
| `[Bind]` | Determined by Binder | General attribute |

**Restriction:** Cannot use `[OneWayBind]` with `const` or `readonly` fields.

### Commands (`[RelayCommand]`)

```csharp
// Simple -> generates SaveCommand : IRelayCommand
[RelayCommand]
private void Save() { }

// With parameter -> SelectItemCommand : IRelayCommand<int>
[RelayCommand]
private void SelectItem(int itemId) { }

// With CanExecute condition
[RelayCommand(CanExecute = nameof(CanDelete))]
private void Delete() { }
private bool CanDelete() => _selectedItem != null;

// Multiple parameters -> AttackCommand : IRelayCommand<int, int>
[RelayCommand]
private void Attack(int targetId, int damage) { }
```

### Access Control (`[Access]`)

Generated properties have `private` setter by default. Use `[Access]` to change:

```csharp
[Access(Access.Public)]
[OneWayBind] private string _name;  // public get, public set

[Access(Get = Access.Public, Set = Access.Private)]
[OneWayBind] private bool _isActive;  // public get, private set
```

### Code Generation Summary

| Source | Generated |
|--------|-----------|
| `[OneWayBind] private int _count;` | Property `Count`, method `SetCount(int)`, event `CountChanged` |
| `[TwoWayBind] private string _text;` | Property `Text`, method `SetText(string)`, event `TextChanged` |
| `[RelayCommand] private void Save()` | Property `SaveCommand` of type `IRelayCommand` |
| `[RelayCommand] private void Click(int id)` | Property `ClickCommand` of type `IRelayCommand<int>` |

**NEVER** manually create properties/events for bound fields — the Source Generator handles this.

---

## View

### Rules

1. `[View]` attribute on class
2. `sealed partial` modifiers
3. Inherit from `MonoView`
4. **Field names MUST match** ViewModel field names
5. All fields marked `[SerializeField]`
6. Use `[RequireBinder(typeof(T))]` for type validation
7. View contains **NO logic** — only binder field declarations

### Template

```csharp
using Aspid.MVVM;
using Aspid.MVVM.StarterKit;
using UnityEngine;

namespace Game.Gameplay.UI
{
    [View]
    public sealed partial class {Feature}View : MonoView
    {
        [RequireBinder(typeof(string))]
        [SerializeField] private MonoBinder _title;

        [RequireBinder(typeof(int))]
        [SerializeField] private MonoBinder _count;

        [RequireBinder(typeof(string))]
        [SerializeField] private MonoBinder _inputText;

        [Header("Commands")]
        [SerializeField] private ButtonCommandBinder _submitCommand;
        [SerializeField] private ButtonCommandBinder _resetCommand;
    }
}
```

### Field Naming Rules

Source Generator supports styles: `_name`, `m_name`, `s_name`, `name`.

| ViewModel | View | Result |
|-----------|------|--------|
| `_title` | `_title` | OK |
| `[RelayCommand] void Submit()` | `_submitCommand` | OK (method `Submit` -> property `SubmitCommand` -> field `_submitCommand`) |
| `_count` | `_amount` | ERROR — names don't match |

**Command rule:** Method `MethodName()` with `[RelayCommand]` generates `MethodNameCommand`. View field is `_methodNameCommand`.

### Binder Lookup Workflow

When selecting a binder for a View field, use the reference files in `references/`:

1. **First** — open `aspid-mvvm-binders-quickref.md`. It contains task-based and VM-property-type lookup tables covering the most common scenarios.
2. **If nothing fits** — open `aspid-mvvm-binders-full.md`. It is the exhaustive index of every binder organized by folder/component, including all Switcher, Enum, EnumGroup, Addressable, and Caster variants.

**Do NOT guess binder names.** Always verify against the reference files.

### Converter Lookup Workflow

When a View field needs a value converter (e.g., `int` → `bool`, `float` → `string`, vector swizzle), check the converter catalog before creating a custom one:

1. **First** — open `aspid-mvvm-converters.md`. It contains a quick lookup table (`From → To`) and all built-in converter implementations grouped by category (Bool, Number, String, Color, Vector).
2. **If a matching converter exists** — use it. Converters are configured in the Inspector on the binder component via `[SerializeReference]`.
3. **Only if nothing fits** — create a custom `IConverter<TFrom, TTo>` implementation.

**Do NOT create custom converters when a built-in one already covers the conversion.** Always verify against `aspid-mvvm-converters.md`.

### MonoBinder vs Typed Binder

```csharp
// Single typed binder
[SerializeField] private ImageSpriteBinder _icon;

// Array for multiple binders on one property
[RequireBinder(typeof(bool))]
[SerializeField] private MonoBinder[] _isActive;

// Single generic binder with type constraint
[RequireBinder(typeof(int))]
[SerializeField] private MonoBinder _count;
```

---

## Zenject Registration

Add ViewModel binding in `GameplayUIInstaller.cs`:

```csharp
// Singleton — one ViewModel per scene
Container.BindInterfacesAndSelfTo<ExampleViewModel>().AsSingle();

// Transient — new instance each time
Container.BindInterfacesAndSelfTo<AnotherViewModel>().AsTransient();
```

**Rules:**
- Use `BindInterfacesAndSelfTo<T>()` for auto-binding `IDisposable` and `IComponentInitializable`
- `AsSingle()` — for ViewModels existing as single instance
- `AsTransient()` — for ViewModels created multiple times
- Child ViewModels (collection items) are **NOT registered** in Zenject — created via parent factory methods

---

## Observable Collections (Dynamic UI Lists)

Для динамического создания/удаления UI-элементов (список товаров, кнопки, слоты) используется связка:

**ViewModel** — `IReadOnlyObservableListSync<TChildViewModel>` + `CreateSync()`
**View** — `ViewModelObservableListMonoBinder`

### Как работает CreateSync

`CreateSync()` — extension-метод, создающий **синхронизированную проекцию** одной observable-коллекции в другую. При добавлении/удалении элементов в источнике — автоматически создаются/удаляются дочерние ViewModel-ы.

```
ObservableList<TModel>  ──CreateSync(mapper)──→  IReadOnlyObservableListSync<TViewModel>
     (источник)                                        (привязка во View)
```

### Иерархия типов

```
IReadOnlyObservableList<T>          ← базовый observable-список
    └── IReadOnlyObservableListSync<T>  ← синхронизированная проекция (CreateSync)
```

`ViewModelObservableListMonoBinder` принимает оба типа (через `IBinder<IReadOnlyObservableList<T>>`), но **каноничный паттерн проекта — всегда `IReadOnlyObservableListSync`**.

### Когда какой тип

| Сценарий | Тип в ViewModel | Пример |
|----------|-----------------|--------|
| Маппинг Model → ChildVM из observable-источника | `IReadOnlyObservableListSync<TChildVM>` | Inventory slots → item views |
| Маппинг статического списка → ChildVM | `IReadOnlyObservableListSync<TChildVM>` (обернуть в `ObservableList`) | Config list → button views |

### Пример: статический список → динамические UI-элементы

```csharp
[ViewModel]
public sealed partial class ButtonsPanelViewModel : IDisposable
{
    [OneWayBind] private IReadOnlyObservableListSync<ButtonViewModel> _buttons;

    private ObservableList<ItemConfig> _sourceList;

    public void ShowButtons(IReadOnlyList<ItemConfig> configs)
    {
        Buttons?.Dispose();
        _sourceList = new ObservableList<ItemConfig>(configs);
        Buttons = _sourceList.CreateSync(config => new ButtonViewModel(config));
    }

    public void Dispose() => Buttons?.Dispose();
}
```

**Важно:** всегда вызывать `Dispose()` на `IReadOnlyObservableListSync` — это отписывает синхронизацию.

### Parent ViewModel

```csharp
[ViewModel]
public sealed partial class ListViewModel : IComponentInitializable, IDisposable
{
    [OneWayBind] private IReadOnlyObservableListSync<ItemViewModel> _items;

    private readonly IDataService _dataService;

    public ListViewModel(IDataService dataService)
    {
        _dataService = dataService;
    }

    public void Initialize()
    {
        Items = _dataService.Items.CreateSync(CreateItemViewModel);
    }

    private ItemViewModel CreateItemViewModel(ItemData data)
    {
        return new ItemViewModel(data, clickCommand: OnClickItemCommand);
    }

    [RelayCommand]
    private void OnClickItem(ItemViewModel item) { }

    public void Dispose() => Items?.Dispose();
}
```

### Parent View

```csharp
[View]
public sealed partial class ListView : MonoView
{
    [SerializeField] private ViewModelObservableListMonoBinder _items;

    [Header("Commands")]
    [SerializeField] private ButtonCommandBinder _onClickItemCommand;
}
```

### Child ViewModel (list item)

```csharp
[ViewModel]
public sealed partial class ItemViewModel
{
    [Access(Access.Public)]
    [OneWayBind] private Sprite _icon;

    [Access(Get = Access.Public, Set = Access.Private)]
    [OneWayBind] private bool _hasItem;

    [OneWayBind] private IRelayCommand _clickCommand;

    // Empty constructor for empty items
    public ItemViewModel()
    {
        SetIcon(null);
        ClickCommand = RelayCommand.Empty;
    }

    // Constructor with data
    public ItemViewModel(ItemData data, IRelayCommand<ItemViewModel> clickCommand)
    {
        Title = data.Title;
        Icon = data.Icon;
        ClickCommand = clickCommand.CreateCommandWithoutParametersOrEmpty(this);
        HasItem = true;
    }
}
```

### Child View

```csharp
[View]
public sealed partial class ItemView : MonoView
{
    [SerializeField] private ImageSpriteBinder _icon;

    [RequireBinder(typeof(bool))]
    [SerializeField] private MonoBinder[] _hasItem;

    [Header("Commands")]
    [SerializeField] private ButtonCommandBinder _clickCommand;
}
```

---

## R3 Integration

Subscriptions go in `Initialize()`:

```csharp
public void Initialize()
{
    _someService.CurrentValue
        .Subscribe(value => PropertyName = value)
        .AddTo(_disposables);

    // CombineLatest for computed properties
    _health.Current
        .CombineLatest(_health.Max, (current, max) => max > 0 ? (float)current / max : 0f)
        .Subscribe(value => HealthPercent = value)
        .AddTo(_disposables);
}
```

**Rules:**
1. Subscriptions in `Initialize()` (interface `IComponentInitializable`)
2. All subscriptions into `CompositeDisposable` via `.AddTo(_disposables)`
3. Cleanup in `Dispose()` -> `_disposables.Dispose()`
4. In subscriptions assign generated properties (PascalCase)
