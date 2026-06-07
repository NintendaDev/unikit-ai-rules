---
version: 1.0.0
---

# Unity Localization

> **Scope**: Unity Localization Package (com.unity.localization) — StringTable and AssetTable setup, LocalizedString usage and events, locale selection and switching, async initialization, and Smart Strings.
> **Load when**: adding or managing localized strings or assets, working with LocalizedString or LocalizeStringEvent, switching locales at runtime, setting up StringTable collections, configuring multi-language support in a Unity project, debugging missing translations or async loading.

---

## Setup

### Installation
Add to `Packages/manifest.json`:
```json
"com.unity.localization": "1.5.11"
```

### Localization Settings Asset
1. Go to **Edit → Project Settings → Localization**
2. Click **Create** — generates the `LocalizationSettings` ScriptableObject
3. Set a default Locale under **Locale Selectors → Specific Locale Selector** and move it to the top of the list

### Adding Locales
Use the **Locale Generator** button in Project Settings to create `Locale` assets for each supported language. Drag them into the **Available Locales** list.

### Creating String Tables
1. Open **Window → Asset Management → Localization Tables**
2. Click **New Table Collection → String Table Collection**
3. Name the table (this is the `TableReference` used in code)
4. Add entries: each entry has a **Key** (used in code) and per-locale translation values

**Tip:** Right-click a `TextMeshPro` component → **Localize** to automatically add and wire a `LocalizeStringEvent` component.

---

## Core Concepts

**Locale** — Identifies a language/region (`en`, `ru`, `fr-CA`). Represented as a `Locale` ScriptableObject asset.

**StringTable** — A key→value store for one locale's translations. Part of a `StringTableCollection` that spans all locales.

**LocalizedString** — A serializable reference to one StringTable entry. Automatically fires `StringChanged` when the active locale changes.

**LocalizedAsset\<T\>** — Generic reference to a locale-specific Unity asset (Font, Texture, AudioClip, etc.). Requires a concrete serializable subclass:
```csharp
[Serializable] public class LocalizedFont : LocalizedAsset<Font> {}
```

**LocalizationSettings** — Singleton `ScriptableObject` central access point. Manages the active locale, `StringDatabase`, `AssetDatabase`, and initialization state.

---

## API

### LocalizedString

```csharp
// Serializable field — set in Inspector (preferred)
[SerializeField] LocalizedString _welcomeText;

// In-code construction
var str = new LocalizedString("UI_Table", "WELCOME_TITLE");

// Event-driven: subscribe once, called on every locale change
void OnEnable() => _welcomeText.StringChanged += OnStringChanged;
void OnDisable() => _welcomeText.StringChanged -= OnStringChanged;
void OnStringChanged(string value) => _label.text = value;

// Synchronous retrieval (blocks — avoid on WebGL)
string text = _welcomeText.GetLocalizedString();

// Async retrieval (Addressables handle)
var handle = _welcomeText.GetLocalizedStringAsync();
yield return handle;         // coroutine
// or: await handle.ToUniTask();
string text = handle.Result;

// Force refresh (call after changing Arguments manually)
_welcomeText.RefreshString();
```

**Key properties:**

| Property | Purpose |
|----------|---------|
| `Arguments` | Non-serialized objects passed to Smart Format / `String.Format` |
| `CurrentLoadingOperation` | Active async `AsyncOperationHandle` |
| `HasChangeHandler` | True if `StringChanged` has subscribers |

**Key methods:**

| Method | Purpose |
|--------|---------|
| `GetLocalizedString(params object[])` | Sync retrieval with positional arguments |
| `GetLocalizedStringAsync()` | Async retrieval (returns `AsyncOperationHandle<string>`) |
| `RefreshString()` | Manually triggers `StringChanged` callbacks |
| `Add(string, IVariable)` / `Remove(string)` | Manage named local Smart String variables |
| `ClearChangeHandler()` | Remove all `StringChanged` subscribers |

### LocalizationSettings

```csharp
// Always yield on initialization before touching locale or tables
yield return LocalizationSettings.InitializationOperation;
// With UniTask:
await LocalizationSettings.InitializationOperation.ToUniTask();

// Get / set active locale
Locale current = LocalizationSettings.SelectedLocale;
LocalizationSettings.SelectedLocale = desiredLocale;

// All supported locales
IList<Locale> locales = LocalizationSettings.AvailableLocales.Locales;

// React to locale changes
LocalizationSettings.SelectedLocaleChanged += OnLocaleChanged;
LocalizationSettings.SelectedLocaleChanged -= OnLocaleChanged; // unsubscribe when done
```

### LocalizeStringEvent (Unity Component)

`UnityEngine.Localization.Components.LocalizeStringEvent` — MonoBehaviour holding a `LocalizedString` with a `StringReference` property and an `OnUpdateString` UnityEvent (wired to `TextMeshPro.text` in the Inspector).

```csharp
// Set entry key at runtime
GetComponent<LocalizeStringEvent>().StringReference.TableEntryReference = "MY_KEY";

// Force string to refresh
GetComponent<LocalizeStringEvent>().RefreshString();
```

---

## Patterns & Examples

### Event-Driven Locale Switching (Recommended Pattern)

```csharp
public class LocalizedLabel : MonoBehaviour
{
    [SerializeField] LocalizedString _text;
    [SerializeField] TMP_Text _label;

    void OnEnable() => _text.StringChanged += UpdateLabel;
    void OnDisable() => _text.StringChanged -= UpdateLabel;
    void UpdateLabel(string value) => _label.text = value;
}
```

### Smart String with Named Variables

```csharp
// Translation entry value: "Welcome, {player-name}! You are level {level}."
_welcomeText.Add("player-name", new StringVariable { Value = playerName });
_welcomeText.Add("level", new IntVariable { Value = playerLevel });
// StringChanged fires automatically when locale changes or variables update
```

### Async Locale Initialization

```csharp
IEnumerator Start()
{
    yield return LocalizationSettings.InitializationOperation;
    // Safe to access locales now
    foreach (var locale in LocalizationSettings.AvailableLocales.Locales)
        _dropdown.options.Add(new TMP_Dropdown.OptionData(locale.LocaleName));
}
```

### Accessing StringTable Directly from Code

```csharp
IEnumerator GetStringFromTable(string tableKey, string entryKey)
{
    var op = LocalizationSettings.StringDatabase.GetTableAsync(tableKey);
    yield return op;
    if (op.Status == AsyncOperationStatus.Succeeded)
    {
        var entry = op.Result.GetEntry(entryKey);
        string value = entry?.GetLocalizedString();
    }
}
```

### UI Toolkit Binding (Unity 2023.2+)

```csharp
// Bind LocalizedString directly to a Label without a callback
label.SetBinding("text", new LocalizedString("UI_Table", "WELCOME_TITLE"));
```

---

## Smart Strings

Enable per-entry by checking **Smart** in the String Table editor.

| Feature | Syntax | Example output |
|---------|--------|----------------|
| Named placeholder | `{player-name}` | `Alice` |
| Positional | `{0}`, `{1}` | `Player 1 won!` |
| Pluralization | `{count:plural:{} item\|{} items}` | `3 items` / `1 item` |
| Number format | `{amount:C}` | `$9.99` (locale currency) |
| Date format | `{date:d MMM}` | `5 Apr` |

Pluralization is language-specific: English has 2 forms (one/other), Arabic has 6 (zero/one/two/few/many/other). **Always provide all required plural forms** for each language or a runtime error occurs.

---

## Configuration

### Missing Translation Behaviour
Set in **Localization Settings → String Database → Missing Translation State**:

| Mode | Behaviour |
|------|-----------|
| `None` | Empty string in UI |
| `Show Warning` | Warning text in UI (default) |
| `Print Warning` | Console warning, empty string in UI |
| `Use Fallback` | Inherits parent locale translation |

Configure per-locale fallbacks: select the Locale asset → **Inspector → Metadata → Fallback Locale**.

### Locale Resolution Order (Startup)
1. Command-line flag
2. OS / device locale (system detection)
3. Explicit default Locale

Reorder by dragging entries in **Localization Settings → Locale Selectors**.

### Preloading Tables
Mark groups as preloaded in **Window → Asset Management → Addressables Groups**. Preloaded tables are ready immediately; non-preloaded tables load on first access asynchronously.

---

## Anti-patterns

- **Not yielding on `InitializationOperation`** — accessing `SelectedLocale` or tables before initialization produces null or empty results. Always `yield return LocalizationSettings.InitializationOperation` (or `await`) before any locale/string access.
- **Using table/entry names for stable references** — names can be renamed in the editor; prefer GUIDs/key IDs in production code to avoid broken references.
- **Forgetting to rebuild Addressables before standalone builds** — changing or adding table entries without rebuilding Addressables causes missing translations at runtime.
- **Incomplete plural forms for Smart Strings** — every language must have all its required plural forms defined; missing forms produce runtime errors.
- **Polling `GetLocalizedString()` every frame** — subscribe to `StringChanged` instead; it fires only when the locale changes.
- **Subscribing `StringChanged` without unsubscribing** — always pair `OnEnable` subscription with `OnDisable` unsubscription to prevent memory leaks and ghost callbacks.
