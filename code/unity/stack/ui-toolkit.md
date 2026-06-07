---
version: 1.0.0
---

# Unity UI Toolkit

> **Scope**: Unity UI Toolkit — runtime and editor UI development using VisualElement hierarchy, UXML layout files, USS stylesheets, event system, data binding, and performance tuning via usage hints and texture atlasing.
> **Load when**: building or modifying UI screens using UI Toolkit, authoring UXML templates or USS stylesheets, writing VisualElement-derived custom controls, handling UI events (click, pointer, keyboard, value change), binding UI to data sources, optimizing UI performance, debugging UI layout or batching issues.

---

## Core Components

| Component | Purpose |
|-----------|---------|
| `UIDocument` | MonoBehaviour that attaches a UXML tree to a scene. One per logical UI layer. |
| `PanelSettings` | Configures rendering, scale mode, texture atlasing, and vertex budget for a panel. |
| `VisualTreeAsset` | Serialized UXML asset. Instantiated via `CloneTree()` or assigned to `UIDocument.visualTreeAsset`. |
| `VisualElement` | Base class for all UI elements. Drives hierarchy, layout, styling, and rendering. |

```csharp
[RequireComponent(typeof(UIDocument))]
public class HudView : MonoBehaviour
{
    [SerializeField] private VisualTreeAsset _sourceAsset;
    [SerializeField] private PanelSettings _panelSettings;

    private VisualElement _root;

    void Awake()
    {
        var doc = GetComponent<UIDocument>();
        doc.panelSettings = _panelSettings;
        doc.visualTreeAsset = _sourceAsset;
    }

    void OnEnable()
    {
        _root = GetComponent<UIDocument>().rootVisualElement;
        // query, cache, and bind here
    }
}
```

---

## UXML Structure

- Declare hierarchy in UXML; avoid building complex trees programmatically in C#.
- Use UXML for structure, USS for appearance, C# for logic and data binding.
- Use BEM class naming over element names (`#id`) for flexible USS targeting.
- Use `<Template>` and `<Instance>` to reuse sub-trees across screens.

```xml
<UXML xmlns="UnityEngine.UIElements">
    <VisualElement class="hud">
        <VisualElement class="hud__score">
            <Label class="hud__score-label" text="Score: " />
            <Label class="hud__score-value" text="0" />
        </VisualElement>
        <VisualElement class="hud__health-bar">
            <VisualElement class="hud__health-fill" />
        </VisualElement>
    </VisualElement>
</UXML>
```

---

## Querying Elements

```csharp
// Query by class (BEM-based) — preferred; keeps UI reusable
var scoreLabel = _root.Q<Label>(className: "hud__score-value");

// Query multiple matching elements
var buttons = _root.Query<Button>(className: "menu__button").ToList();
```

- Use `Q<T>()` for single-element lookup; `Query<T>()` for multiple.
- Query by class, not by name (`#id`) — names couple code to layout identifiers.
- Query and cache references **once** in `OnEnable()`. Never query in Update.

---

## USS Styling

### Selector Performance Hierarchy

| Selector type | Performance | Recommendation |
|---------------|-------------|----------------|
| Single class (`.class-name`) | Fastest | **Preferred** |
| Child combinator (`.parent > .child`) | Fast | OK |
| Descendant combinator (`.ancestor .descendant`) | Medium | Use sparingly |
| Universal (`*`) inside complex chains | Slowest | Avoid |

### BEM Convention

Follow Block-Element-Modifier naming. Never use type selectors (`Button`, `Label`) or IDs (`#id`) in reusable USS — they couple style to element type and make composition fragile.

```css
/* Block */
.health-bar { height: 20px; background-color: darkgray; }

/* Element */
.health-bar__fill { background-color: green; }
.health-bar__label { color: white; font-size: 12px; }

/* Modifier */
.health-bar--critical .health-bar__fill { background-color: darkred; }
```

### USS Variables (Custom Properties)

Define design tokens at `:root` to avoid magic values across stylesheets:

```css
:root {
    --color-primary: #3a86ff;
    --color-danger: #e63946;
    --color-hover: rgba(255,255,255,0.15);
    --spacing-md: 10px;
    --font-size-heading: 24px;
}

.hud__score-label {
    color: var(--color-primary);
    font-size: var(--font-size-heading);
    margin: var(--spacing-md);
}
```

### Inline Styles vs. USS Classes

- Prefer USS class toggles over `element.style.*` assignments for state changes.
- Reserve inline styles for **runtime-driven, per-frame values** (e.g., health bar fill width).
- Use `AddToClassList()` / `RemoveFromClassList()` / `EnableInClassList()` for conditional states.

```csharp
// Correct — state change via class toggle
healthBar.EnableInClassList("health-bar--critical", normalized < 0.3f);

// Correct — runtime dynamic value updated from code
fillElement.style.width = new StyleLength(Length.Percent(normalized * 100f));

// Incorrect — setting visual properties inline for static states
element.style.color = Color.red;    // use USS class instead
element.style.fontSize = 24;        // use USS variable + class instead
```

### :hover Caution

Avoid complex `:hover` selector chains. Mouse movement invalidates the **entire matched hierarchy**, causing style recalculation on every frame with cursor movement.

```css
/* Bad — invalidates all children on every mouse move */
.container:hover > * > Button { background-color: gray; }

/* Good — direct single-class target */
.menu__button:hover { background-color: var(--color-hover); }
```

---

## Event Handling

Register callbacks in `OnEnable()`; unregister in `OnDisable()` to prevent leaks.

```csharp
private Button _playButton;
private TextField _nameField;

void OnEnable()
{
    _root = GetComponent<UIDocument>().rootVisualElement;

    _playButton = _root.Q<Button>(className: "menu__play-button");
    _playButton.clicked += OnPlayClicked;

    _nameField = _root.Q<TextField>(className: "player__name-field");
    _nameField.RegisterValueChangedCallback(OnNameChanged);
}

void OnDisable()
{
    if (_playButton != null) _playButton.clicked -= OnPlayClicked;
    if (_nameField != null) _nameField.UnregisterValueChangedCallback(OnNameChanged);
}

private void OnPlayClicked() { /* ... */ }

private void OnNameChanged(ChangeEvent<string> evt)
{
    Debug.Log($"Name: {evt.previousValue} → {evt.newValue}");
}
```

### Event Bubbling

Use bubbling to handle child events with a single registration on a parent:

```csharp
// One handler on the board container instead of one per button
_gameBoard.RegisterCallback<ClickEvent>(evt =>
{
    if (evt.target is Button btn && btn.ClassListContains("game-button--active"))
    {
        HandleButtonClicked(btn);
        evt.StopImmediatePropagation();
    }
});
```

### Pointer Capture

```csharp
element.RegisterCallback<PointerDownEvent>(evt =>
{
    // Continues receiving PointerMove/Up even when cursor leaves the element
    element.CapturePointer(evt.pointerId);
    evt.StopPropagation();
});
element.RegisterCallback<PointerUpEvent>(evt =>
{
    element.ReleasePointer(evt.pointerId);
});
```

### Silent Value Update

Use `SetValueWithoutNotify()` to update a control's value without firing registered callbacks:

```csharp
volumeSlider.SetValueWithoutNotify(savedVolume); // won't trigger OnVolumeChanged
```

---

## Data Binding

### Manual Binding (recommended for gameplay UIs)

Explicit and predictable. Subscribe to ViewModel observables (R3/UniTask) and update labels directly:

```csharp
private Label _scoreLabel;
private CompositeDisposable _disposables = new();

void OnEnable()
{
    _root = GetComponent<UIDocument>().rootVisualElement;
    _scoreLabel = _root.Q<Label>(className: "hud__score-value");

    _viewModel.Score
        .Subscribe(score => _scoreLabel.text = score.ToString())
        .AddTo(_disposables);
}

void OnDisable() => _disposables.Clear();
```

### UXML Declarative Binding (ScriptableObject / Editor tools)

Set `binding-path` on controls in UXML to bind to serialized properties:

```xml
<TextField binding-path="playerName" label="Name:" />
<Toggle binding-path="isEnabled" label="Enabled" />
```

For runtime data sources with change notifications, implement `INotifyBindablePropertyChanged`:

```csharp
[CreateAssetMenu, GeneratePropertyBag]
public class PlayerData : ScriptableObject, INotifyBindablePropertyChanged, IDataSourceViewHashProvider
{
    [SerializeField, DontCreateProperty] private string _name;
    private long _version;

    public event EventHandler<BindablePropertyChangedEventArgs> propertyChanged;

    [CreateProperty]
    public string Name
    {
        get => _name;
        set { _name = value; _version++; Notify(); }
    }

    private void Notify([CallerMemberName] string property = "") =>
        propertyChanged?.Invoke(this, new BindablePropertyChangedEventArgs(property));

    public long GetViewHashCode() => _version;
}
```

---

## Visibility and Display

Choose the correct hide/show method based on toggle frequency and layout requirements:

| Method | Renders | Occupies layout | Toggle cost | Use when |
|--------|---------|-----------------|-------------|----------|
| `element.visible = false` | No | Yes | Low | Element must keep layout space |
| `style.display = DisplayStyle.None` | No | No | Medium | Panel toggled occasionally |
| `element.RemoveFromHierarchy()` | No | No | Highest | Dialog fully unloaded between uses |
| `style.opacity = 0` | **Yes** | Yes | Low | Almost never — element still renders |

Never use `opacity = 0` as a hiding strategy — the element continues to render and occupies GPU budget.

---

## Performance

### Layout Optimization

Animate position and size using **transforms**, not layout properties. Transforms bypass layout recalculation and run on the GPU directly.

```csharp
// Good — GPU transform, no layout recalc
element.style.translate = new StyleTranslate(new Translate(100, 0));

// Bad — triggers full layout recalculation every frame
element.style.left = new StyleLength(100);
```

Avoid switching classes on large hierarchies during animations — class changes trigger style recalculation across all affected subtrees. Use transform properties or `DynamicTransform` usage hint instead.

### Usage Hints

Set `usageHints` to tell the rendering system how an element will be used, reducing draw calls and geometry regeneration:

```csharp
// Element moves/transforms frequently (position updates every frame)
element.usageHints = UsageHints.DynamicTransform;

// Container whose many children are all transformed together
container.usageHints = UsageHints.GroupTransform;

// Container with multiple overlapping masking layers
maskContainer.usageHints = UsageHints.MaskContainer;
```

| Hint | When to use |
|------|-------------|
| `DynamicTransform` | Element position or transform changes frequently |
| `GroupTransform` | Parent container with multiple animated children moved as a group |
| `MaskContainer` | Container stacking multiple masking layers |

### Batching

Elements must share identical GPU state (shader, textures, mesh parameters) to batch together. Batch breaks increase draw calls and CPU overhead.

- The uber shader supports **up to 8 textures per batch** — exceeding this forces a new batch.
- Group elements with matching textures adjacently in the hierarchy.
- Use **2D Sprite Atlas** (for static content) or **Dynamic Texture Atlas** (for runtime textures) to pack multiple images into a single texture and reduce batch breaks.
- **Rectangular masks** preserve batching (shader-based). **Rounded-corner or stencil masks** break batches at each nesting level.
- Call `panel.ResetDynamicAtlas()` when extensive runtime texture changes fragment the dynamic atlas.

### Masking

- Prefer rectangular masks — unlimited nesting depth, shader-based, no batch breaks.
- Stencil masks (rounded corners, complex shapes) support **max 7 nested levels** and break batches at each level.
- Apply `UsageHints.MaskContainer` on the outer container when multiple mask layers are unavoidable.

### Vertex Budget

Set an explicit vertex budget in `PanelSettings` for complex UIs. The default (0 = automatic) may fragment the vertex buffer and produce multiple draw calls.

```
PanelSettings → Vertex Budget: 20000   // example starting point for a complex HUD
```

Use Frame Debugger + Profiler to find the right value — higher budget uses more memory.

### Memory and Asset Loading

USS and UXML files load all referenced assets immediately on import. Avoid putting rarely-used content in always-loaded documents.

- Split UI into scene-specific documents; load only what the current scene needs.
- Unload unused documents: `element.RemoveFromHierarchy()`, then release via Addressables or `AssetBundle.Unload(true)`.
- Use `VisualTreeAsset.CloneTree()` to instantiate sub-trees on demand.

### Virtualized Lists

Use `ListView` (or `TreeView`) with fixed-height virtualization for any scrollable list with more than ~30 items. Never manually instantiate one element per data item for large collections.

```csharp
var listView = new ListView(
    items,
    itemHeight: 40f,
    makeItem: () => new Label(),
    bindItem: (el, i) => ((Label)el).text = items[i].ToString()
);
listView.virtualizationMethod = CollectionVirtualizationMethod.FixedHeight;
listView.fixedItemHeight = 40f;
root.Add(listView);
```

---

## Custom Elements

Derive from `VisualElement` (or a specific control class). Declare USS classes in the constructor so they are available immediately for USS targeting and in UI Builder.

```csharp
public class HealthBar : VisualElement
{
    public new class UxmlFactory : UxmlFactory<HealthBar, UxmlTraits> { }
    public new class UxmlTraits : VisualElement.UxmlTraits { }

    private readonly VisualElement _fill;

    public HealthBar()
    {
        AddToClassList("health-bar");

        _fill = new VisualElement();
        _fill.AddToClassList("health-bar__fill");
        Add(_fill);
    }

    public void SetHealth(float normalized)
    {
        _fill.style.width = new StyleLength(Length.Percent(normalized * 100f));
        _fill.EnableInClassList("health-bar__fill--critical", normalized < 0.3f);
    }
}
```

- Call `AddToClassList()` in the **constructor**, not later.
- Prefix custom USS classes with a project or component identifier to prevent naming conflicts.
- Expose public state-change methods that call `AddToClassList` / `RemoveFromClassList` — never expose `style.*` directly from outside the element.

---

## Anti-patterns

- **Querying elements in Update** — query once in `OnEnable()`, cache the reference.
- **Building entire UI trees in C#** — use UXML for structure; C# only for logic and data binding.
- **Deep selector chains in USS** (`.grandparent .parent .child`) — use BEM classes on each element instead.
- **Type selectors in reusable styles** (`Button { }`, `Label { }`) — couple USS to element type; use classes.
- **Class toggles during per-frame animations** — use transform properties or `DynamicTransform` hint instead.
- **Using `opacity = 0` to hide elements** — elements still render; use `style.display = DisplayStyle.None`.
- **Forgetting to unregister callbacks** — always pair `RegisterCallback` / `clicked +=` with removal in `OnDisable`.
- **Stencil mask depth > 7** — Unity silently misbehaves beyond 7 nested stencil layers.
- **Leaving vertex budget at 0 on complex UIs** — profile and set an explicit budget to consolidate draw calls.
- **One `UIDocument` for all UI layers** — split by update frequency (static HUD, animated overlay, modal dialogs) into separate documents.
