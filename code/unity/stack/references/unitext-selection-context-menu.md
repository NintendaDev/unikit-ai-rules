# UniText — Selection, copy and context menu

> **Base path:** `<UniTextRoot>` is the folder of the UniText package — the one whose `package.json` has `"name": "media.lightside.unitext"` (find it with `Glob **/media.lightside.unitext/package.json`; it may sit under `Packages/` or `Library/PackageCache/`). Never hard-code its location.
> See also: [unitext-interaction-links.md](unitext-interaction-links.md), [unitext-input-fields.md](unitext-input-fields.md), [unitext-clipboard-rtl-ime.md](unitext-clipboard-rtl-ime.md), [unitext-layout-documents.md](unitext-layout-documents.md), [unitext-runtime-api.md](unitext-runtime-api.md), [unitext-components-setup.md](unitext-components-setup.md), [unitext-version-traps.md](unitext-version-traps.md), [unitext-performance-mobile.md](unitext-performance-mobile.md)

---

Everything is in namespace `LightSide`. Mobile verdicts (`OK` / `LIMIT` / `AVOID`) come from reading the package source and docs; nothing was profiled and no measured figures are quoted. No markup tag is involved in selection: it is a component, not a modifier, so it needs no style registration.

## 1. Lookup — "I want to ..." → answer

| I want to | Do this | Where |
|---|---|---|
| Let players select and copy text (promo code, chat line, log) | add `UniTextSelectable` to a text object (or create it from the GameObject menu) | S1, section 4 |
| Offer only Copy (and Select All) in the menu | replace the field's *Commands* list (default `ProjectCommands`) with `CopyCommand` + `SelectAllCommand` | S1 |
| Select text from code (e.g. pre-select a code) | `SetSelection(anchor, focus)`, `SelectWord(i)`, `SelectAll()` | S2 |
| Block or clamp user selection | `SelectionChanging.Subscribe(handler)` — set `Cancel` or change `Proposed` | S2 |
| React to selection changes | `SelectionChanged` event (`Previous`, `Current`, `UserEvent` reason) | S2 |
| Read the selected text | `GetSelectedText()` (markup-stripped, `""` when collapsed) | section 5 |
| Add my own menu item ("Look up item", "Wiki") | derive `TextCommand` (or `new SearchWebCommand(title, urlWithPlaceholder)`) and list it in *Commands* | S3 |
| A game-styled menu instead of the default one | prefab with `UniTextContextMenu` + `ContextMenuItem` list; assign as project/field *Unity UI Menu* | S4 |
| Force the Unity-UI menu on phones instead of the system menu | field `AndroidMenu`/`IOSMenu` = `UnityUI` (or the project setting) | S4 |
| A toolbar "Copy" / "Select all" button | `TextCommandButton { Command, Target }` or run the command from code | S5 |
| Highlights/annotations that follow text edits | `MutableRangeSource` + `BeginUpdate` | S6, section 6 |
| Find-in-text matches | `UniTextBase.FindAll` + `MutableRangeSource` | S6 |
| Touch handles / magnifier behaviour | `SelectionHandles` (`ITouchHandles`), `Magnifier` (`IMagnifier`) | section 8 |
| Open or close the menu from code | `RequestContextMenu(screenPos)` / `DismissContextMenu()` | section 5 |
| A custom context menu implementation | derive `TextContextMenu` | section 7.5 |

## 2. Read this first

- **Selection is a component.** Add `UniTextSelectable` (one per GameObject, after the text component) to make text selectable and copyable. The text component (`UniText` or `UniTextWorld`) must already exist on the GameObject: the `RequireComponent` cannot auto-add the abstract `UniTextBase`, and a missing text logs a warning.
- **Needs input plumbing:** `Raycast Target` on the text, an EventSystem, and (Canvas text) a `GraphicRaycaster`; world text also needs a `WorldPointerRaycaster` on the rendering camera ([unitext-interaction-links.md](unitext-interaction-links.md) section 8.2).
- **Indices are rendered codepoints:** the text's markup-stripped content counted in codepoints (a surrogate pair = 1; not UTF-16 chars, not graphemes). Tags in `Text` are not counted. Indices are clamped, never rejected.
- **On Android and iOS a new project shows the system edit menu and the native loupe.** Desktop, WebGL and the Editor always show the Unity-UI menu prefab and no loupe — test the phone path on a device.
- **`SelectionChanging` is an ordered, vetoable event, not a C# `event`** (`+=` does not compile; use `.Subscribe`/`.Unsubscribe`, duplicates throw).
- **Touch:** a plain swipe scrolls the parent; selection starts from long press or double tap. Mouse/pen drag selects.

## 3. Selection model

- `TextSelection` (readonly struct): `Anchor`, `Focus`, `Affinity` (`CaretAffinity.Downstream = 0` default, `Upstream = 1`), computed `IsCollapsed`, `Start`, `End`, `Length`, `Clamp(count)`. Create with `new TextSelection(anchor, focus, affinity)` or `TextSelection.Caret(i)`.
- `UniTextSelectable.Selection` is the current immutable value. Mutators return `bool`: false = unchanged or vetoed.
- Selection indices are **not** remapped across text edits. After a relayout the selection is clamped (reason `select.clamp`) and the highlight re-baked; re-apply a programmatic selection after the text changes.
- For long texts that the package windows into a document (above the virtualization threshold, 16384 characters by default), the index space is document codepoints and `GetSelectedText()` includes text outside the visible window ([unitext-layout-documents.md](unitext-layout-documents.md)).

## 4. Making text selectable

Two ways, both end in the same component:
1. Editor menu `GameObject → LightSide → UniText → UniTextSelectable`: instantiates the project's selectable-text prefab (`UniTextSettings.SelectableTextPrefab`, default `<UniTextRoot>/Defaults/Editing/Selectable Text (UniText).prefab`), already wired with handles and menu.
2. `Add Component → LightSide → UniText → UniTextSelectable` on an existing text object, or from code:
```csharp
var sel = text.gameObject.AddComponent<UniTextSelectable>();   // text component must already be on the GameObject
```
A selectable added by hand or code takes the project's menu choice, the native loupe (`NativeMagnifier`) and the project's handles prefab.

Additional facts:
- The component adds a hidden runtime `UniTextFocusable : Selectable` (hidden, not saved) to the GameObject unless another `Selectable` (Button, Toggle) already sits there; that one then owns keyboard/gamepad focus and pointer interaction keeps working. Navigation mode is Automatic for editable/interactive text and None for selection-only text.
- `UniTextEditable` ([unitext-input-fields.md](unitext-input-fields.md)) plugs into the same pointer surface; `UniTextSelectable` alone is read-only selection.
- Project defaults for the menu choice, menu prefab, handles prefab and command list live in Project Settings → LightSide → UniText → *Selection UI*.

## 5. `UniTextSelectable` API

| Member | Signature / type | Notes |
|---|---|---|
| `TextComponent` | `UniTextBase` | the text on the same GameObject |
| `Selection` | `TextSelection` | current state |
| `SetCaret` | `bool SetCaret(int codepointIndex, CaretAffinity affinity = Downstream, string userEvent = SelectionChangeReason.Programmatic)` | collapses; clamps to `[0, codepointCount]` |
| `SetSelection` | `bool SetSelection(int anchor, int focus, CaretAffinity = Downstream, string userEvent = Programmatic)` | |
| `ExtendSelection` | `bool ExtendSelection(int newFocus, CaretAffinity = Downstream, string userEvent = SelectionChangeReason.Extend)` | anchor stays fixed |
| `DragSelectionHandle` | `bool DragSelectionHandle(bool draggingAnchor, int codepointIndex, CaretAffinity = Downstream)` | touch-handle contract: never collapses, may swap anchor/focus roles |
| `SelectWord / SelectLine / SelectParagraph` | `bool X(int codepointIndex)` | line = soft-wrapped visual line, paragraph = between hard breaks |
| `SelectAll()` / `ClearSelection(string userEvent = Programmatic)` | bool | `ClearSelection` collapses at the focus, false if already collapsed |
| `GetSelectedText()` | `string` | markup stripped; `""` when collapsed |
| `RequestContextMenu(Vector2 screenPosition)` / `DismissContextMenu()` / `IsContextMenuVisible` | | during a touch session the menu opens as touch does (clear of the selection); otherwise at the point, holding the keyboard (Escape closes) |
| `RefreshHighlight()` | void | re-bake highlight rectangles after out-of-band repositioning |
| `TryGetSelectionScreenRect(out Rect)`, `TryGetSelectionHandlePoints(out Vector2 anchor, out Vector2 focus)`, `TryGetCaretScreenPoint(int, out Vector2)`, `TryGetCaretScreenRect(int, out Rect)`, `TryGetContextMenuScreenRect(out Rect)`, `TryGetLineScreenRect(Vector2, out Rect)`, `GetViewportScreenRect()` | geometry | screen pixels, clipped to the visible viewport; for custom handle/loupe entities |
| gesture drivers: `HandlePrimaryClick(TextHitResult, Vector2 screen, PointerModifiers = None)`, `DispatchTap/DoubleTap/TripleTap(int)`, `BeginDrag/UpdateDrag/EndDrag`, `ResetGestureState()` | | single = caret, double = word (and arms word-by-word drag), triple = paragraph, Shift extends |
| `SelectionChanging` | `OrderedValueEvent<SelectionChangingArgs>`: `.Subscribe(Action<SelectionChangingArgs> cb, int order = 0)`, `.Unsubscribe(cb)` | lower order runs first; duplicate subscribe or unknown unsubscribe **throws `InvalidOperationException`**. Args: `Previous`, `Proposed` (settable), `UserEvent`, `Cancel` (settable) |
| `SelectionChanged` | `event Action<SelectionChangedArgs>` | struct: `Previous`, `Current`, `UserEvent` |
| `SelectionDragStarted / Updated / Ended` | `event Action<TextPointerEvent>` | anchored at the press position; `Hit` is not computed |
| `SelectionHighlight` | `HighlightPresentation` (never null) | same type authored `HighlightModifier` highlights use; default colour (51,128,255,102) blue |
| `SelectionHandles` | `ITouchHandles` (default `PrefabSelectionHandles`; null = no handles) | |
| `Magnifier` | `IMagnifier` (default `NativeMagnifier`; null = none) | |
| `AndroidMenu`, `IOSMenu` | `TextMenuOverride { ProjectDefault = 0, SystemMenu = 1, UnityUI = 2 }` | per-field override of the project choice |
| `ContextMenuPrefab` | `TextContextMenu` | empty = the project's `UniTextSettings.ContextMenuPrefab` |
| `Commands` | list of `TextCommandSource`, default `[ProjectCommands]` | author it in the Inspector; the settings analogue is `StateList<TextCommandSource> UniTextSettings.Commands` |
| static `MultiClickMaxInterval` (0.5 s), `MultiClickMaxDistance` (8 dp) | float | write through to the UniText settings |

### 5.1 Reasons (`SelectionChangeReason`, static string constants)

Match a family with `reason.StartsWith("select.")`.

| Constant | Value | Raised when |
|---|---|---|
| `Pointer` | `select.pointer` | mouse/touch caret placement or drag |
| `Move`, `Extend` | `select.move`, `select.extend` | keyboard-style move / extend |
| `Word`, `Line`, `Paragraph`, `All` | `select.word`, `select.line`, `select.paragraph`, `select.all` | the matching selection call or gesture |
| `Programmatic` | `select.programmatic` | default for `SetCaret/SetSelection/ClearSelection` |
| `Input` | `select.input` | moved by a text mutation |
| `Clamp`, `Normalize` | `select.clamp`, `select.normalize` | layout/text changed |
| `Style`, `Restore` | `select.style`, `select.restore` | formatting change, undo/redo |
| `Defocus` | `select.defocus` | EventSystem deselect cleared it |
| `Command` | `select.command` | an Android menu command collapsed it |

`SelectionChanging` is raised only for the public mutators and gestures. Text-edit side effects (insert, delete, IME, undo), clamping and menu-driven internal moves bypass it, so a veto cannot stop `select.input/restore/clamp`.

### 5.2 Behaviour by input

- **Mouse/pen:** press = caret, double = word (arms word-by-word drag), triple = paragraph; Shift+press extends; drag selects from the first pixel; right click opens the menu, promoting a collapsed selection to the word under the pointer and keeping an existing selection. Auto-scrolls while a mouse drag passes the viewport edge.
- **Touch:** a plain swipe is forwarded to the enclosing scroll container. Selection starts from long press (selects the word under the finger, arms word drag, raises menu + handles + loupe) or double tap. Handles are draggable; the menu follows the selection and hides while a gesture or scroll runs.
- **Keyboard** (while the text is the EventSystem's selected object): Copy and Select All shortcuts; the Menu key / Shift+F10 open the menu under the caret/selection.
- **Defocus** (EventSystem deselect) clears the selection (`select.defocus`) and dismisses the menu: one selection per document, except while the pointer is over a `FocusGuard` panel (menu/toolbar), where focus is reclaimed.
- **Wheel:** handled on both axes; forwarded to a parent scroll handler when the text itself cannot scroll.
- **Copy** of read-only text writes plain text, plus other clipboard formats the adapters produce when the markup carries formatting the parser can represent ([unitext-clipboard-rtl-ime.md](unitext-clipboard-rtl-ime.md)).

## 6. Highlights that survive edits: `MutableRangeSource`

Use for find-in-page matches, annotations and tappable keywords that must follow text edits. No tag is needed: `Style.FromSource(source, modifier)`.

| Item | Notes |
|---|---|
| `MutableRangeSource` | `RangeSource`, serializable; `SetIdentity(string)`, `Count`, `CaptureEntities()`, `TryGetEntity(RangeId, out RangeEntity)`. Ranges are patched through every text edit; a range whose whole span was removed is dropped under the default tracking |
| `RangeTracking` | struct: `StartAffinity`, `EndAffinity` (`RangeBoundaryAffinity`), `DeletionBehavior` (`RangeDeletionBehavior`); ctor `(start, end, deletion)`; static `Content` = insertion at the start or end stays outside, deleting all content removes the range. Pass `tracking:` per range |
| `BeginUpdate(TextRevision)` / `BeginUpdate(in TextSnapshot)` | returns `MutableRangeUpdate` (`IDisposable`): `RangeId Add(TextRange, string parameter = null, string defaultParameter = null, RangeChannel channel = null, object payload = null, RangeTracking tracking = default, RangePointAffinity pointAffinity = After)`, `AddOpaque(TextRange, string value, ...)` (value bypasses tokenization), `Move`, `SetParameters`, `SetOpaqueValue`, `SetPayload`, `Remove(id)`, `Clear()`, `Commit()`. `Dispose()` without `Commit()` discards |
| `SetRanges(TextRevision, IEnumerable<TextRange>)` | replaces everything in one notification |
| `TextRange(start, length)` | rendered codepoints (tags excluded) |
| `TextRevision` | monotonic `ulong` wrapper (`IsValid`; zero is invalid). Get it from `text.CaptureTextSnapshot()` or `source.Snapshot` |
| `UniTextBase.FindAll(ReadOnlySpan<char> query, StringComparison, Span<TextRange> results)` | rendered text, left to right, non-overlapping; no allocation up to 64 UTF-16 chars; main thread. Helpers: `GetRangeText(TextRange)`, `GetRangeBounds(startCluster, endCluster, IList<Rect>)` |

`BeginUpdate` and `Commit` **throw** when the text moved on since the revision was taken, or when the source is not bound to a component with a completed parse (`Snapshot` is invalid until the first parse after the style is attached). One source per highlight kind and one style per source is the working pattern.

## 7. Commands and the context menu

### 7.1 Built-in commands

All are `[Serializable] TextCommand` subclasses. Title = fixed text, `LocalizedCommandTitle` (a Unity Localization string-table entry; needs the Unity Localization package, loads asynchronously on WebGL) or your own `ICommandTitle`; the default title is the type name in sentence case without "Command".

| Command | Applies when | Notes |
|---|---|---|
| `CopyCommand` | `context.CanCopy` (non-collapsed and copy allowed; false in password fields) | the only edit command besides Select All that works on read-only text |
| `SelectAllCommand` | text not empty and not already fully selected | keeps the menu open |
| `CutCommand`, `PasteCommand`, `PastePlainCommand`, `UndoCommand`, `RedoCommand`, `ClearFormattingCommand`, `ToggleStyleCommand` | editable fields only | `PastePlainCommand` only when the clipboard has formatting |
| `ShareCommand` | Android/iOS player and `CanCopy` | system share sheet |
| `SearchWebCommand(string title, string searchUrl)` | `CanCopy` | `{0}` in the URL = the selected text (first 1000 chars); default Google; reuse for dictionary/wiki/map |
| `SystemTextActions` (a `TextCommandSource`, not a command) | `CanCopy` | Android: one entry per app that handles text selection (Translate ...) in both menus; iOS 16+: Look Up/Translate/Share in the **system** menu only |
| `ProjectCommands` (a source) | — | stands for the project list (Project Settings → LightSide → UniText → Selection UI → *Commands*); the default list is Cut, Copy, Paste, PastePlain, SelectAll, SystemTextActions, Share |

An **empty `Commands` list = no menu**, and a menu that would show nothing stays hidden.

### 7.2 Custom command

Derive `TextCommand` as `[Serializable] public sealed partial class X : TextCommand` (`partial` because serialized state fields use UniText state attributes; `[StatePassive]` for plain settings). Override `bool IsApplicable(in TextCommandContext)` and `void Execute(in TextCommandContext)`; optionally `IsActive`, `KeepsMenu`, `Matches(TextCommand)`, protected `DefaultTitle`; `base(string title)` gives a fixed title. `TextCommandContext` exposes `Selectable`, `Editable` (null for read-only), `CanCopy`, `CanEdit`, `CaptureSelection()` → `CapturedSelection.Replace(string)` (false if the field was destroyed or the text changed). Run from code: `cmd.Execute(new TextCommandContext(selectable))` after checking `IsApplicable`. `TextCommandButton` (on a Button/Toggle) runs a command: fields `Command`, `Target` (`UniTextSelectable`; **read-only text needs an explicit Target**; editables default to the active editor); it is interactable only while the command applies, and a Toggle shows `IsActive`.

### 7.3 Which menu appears

Project settings `UniTextSettings.AndroidMenu` / `IOSMenu` are `TextMenuPresentation { SystemMenu = 0, UnityUI = 1 }`, default SystemMenu.

| Platform | Menu | Loupe | Handles |
|---|---|---|---|
| Android 6.0+ | system menu, unless the field's `AndroidMenu` is not `ProjectDefault` or it has its own `ContextMenuPrefab` | `android.widget.Magnifier`, Android 9.0+ | prefab handles (touch only) |
| iOS 13+ | system menu under the same rules | system loupe, iOS 17+ | prefab handles (touch only) |
| older Android/iOS | falls back to the Unity-UI menu | none | prefab handles |
| Desktop, WebGL, Editor | always the Unity-UI menu (`UniTextSettings.ContextMenuPrefab`, default `<UniTextRoot>/Defaults/Editing/ContextMenu.prefab`) | none | none (mouse/pen shows no handles) |

- The system menu is implemented by the bundled native plugin (an Android `.aar` and an iOS plugin) and shows the commands that apply, in list order: Cut/Copy/Paste/Select All as the OS's own localized items (unless the command has its own title), Paste-as-plain-text on Android 8.0+, other commands under their title. Invoked commands still run UniText's pipeline. On Android a menu opened by touch ends the selection after a command (`select.command`); iOS keeps it. Text-action entries (translate apps) exist only on devices.
- The bundled Android plugin's manifest merge adds a package-visibility query and an invisible result activity to every Android app, whether or not `SystemTextActions` is listed. Check this against store/privacy review needs.

### 7.4 Unity-UI menu: `UniTextContextMenu`

A prefab root with `UniTextContextMenu` (adds `RectTransform`, `CanvasGroup`, `FocusGuard`) and child Buttons/Toggles. `Items` is a list of `ContextMenuItem { Target (GameObject), Command (TextCommand; empty = "every other command" row), Label (UniTextBase receiving the title), WhenUnavailable (UnavailableMenuItem: Hide | Disable) }`. The target's own Button/Toggle runs the command; an object with neither runs it on a click anywhere inside. Commands with no matching item are shown as copies of the first command-less item's object; without such an item they are not shown at all (the default prefab has such a row). The prefab is instantiated once under the shared touch overlay canvas and every field presenting it shares one instance. Assign it as the project's *Unity UI Menu* or a field's `ContextMenuPrefab`.

### 7.5 Own menu implementation

Derive `TextContextMenu` (MonoBehaviour): `abstract void Show(TextMenuPlacement placement, IReadOnlyList<TextMenuEntry> entries, Action<int> invoke)`, `abstract void Hide()`, `abstract bool IsVisible`, `virtual void HandleKey(NativeKeyCode, NativeModifiers)`. `TextMenuPlacement { Point (screen px), Target (Rect to keep clear of), HasTarget, Trigger }`; `TextMenuTrigger { Touch = 0, Pointer = 1, Keyboard = 2 }`; `TextMenuEntry { Source, Title, Standard (StandardEditCommand?: Cut/Copy/Paste/SelectAll/PasteAsPlainText/Share), KeepsMenu, IsActive, IsEnabled }`. Never invoke a disabled entry.

## 8. Touch handles and magnifier

- `ITouchHandles : ISelectableEntity` with capability interfaces `ISelectionHandles` (`Show/Hide/UpdatePositions`; events `AnchorDragged(Vector2 screen)`, `FocusDragged(Vector2)`, `SelectionHandleDragStarted/Ended`), `IInsertionHandle` (caret handle, needs an editable; `InsertionHandleDragged/Tapped/DragStarted/DragEnded`) and `ITouchHandleBounds.TryGetScreenBounds(out Rect)` (so the menu keeps clear of handles). Base class for your own entity: `SelectableEntity` (`OnAttach/OnDetach/ValidateAttachment/RequireOwner`); it is a managed reference, so a plain serializable class, not a `UnityEngine.Object`.
- `PrefabSelectionHandles { UniTextSelectionHandles Prefab }`: an empty slot = the project's prefab (Selection UI → *Selection Handles*, default `<UniTextRoot>/Defaults/Editing/SelectionHandles.prefab`, handle size 44 dp). The prefab owns look and pivot; code forces the size, so enable Preserve Aspect on the handle `Image`. Handles live in a canvas-level overlay, so a `RectMask2D` on the field never clips them. Touch only.
- `IMagnifier` (`Show(Vector2)`, `Hide()`, `UpdatePosition(Vector2)`); `NativeMagnifier` is the default: Android 9.0+ and iOS 17+ only, works on Screen Space - Overlay canvases, needs no prefab or camera, **no loupe in the Editor, on desktop or on older devices**. A Unity-UI magnifier no longer exists. The selectable shows the loupe while a handle is dragged.
- No handles: `SelectionHandles = null`. No loupe: `Magnifier = null`.

## 9. Recipes

Conventions: `sel` is the `UniTextSelectable`; `using LightSide; using UnityEngine;` implied. Unsubscribe with named methods.

### S1. Copyable text (promo code, chat line, log)
Setup: add `UniTextSelectable` to the text object (section 4); the text needs `Raycast Target`, an EventSystem and a `GraphicRaycaster`. User flow: desktop drag or double click; touch long press → word + handles + system (or Unity-UI) menu with **Copy** / **Select All** (read-only) plus Share/system actions from the project list. Copy-only menu: in the field's *Commands* replace `ProjectCommands` with `CopyCommand` (+ `SelectAllCommand`). Copy writes the **markup-stripped** text (plus other clipboard formats when the markup can be carried). Programmatic copy without UI: `UniTextClipboard.SetText(text.CleanText.ToString())` (`CleanText` is a pooled span: copy immediately) or S5. Gotcha: on a phone the selection starts from long press, not from a drag.

### S2. Programmatic selection, veto and change notifications
```csharp
private void OnEnable()
{
    sel.SelectionChanged += OnChanged;                       // void OnChanged(SelectionChangedArgs a)
    sel.SelectionChanging.Subscribe(OnChanging, order: 0);   // lower order first; duplicate Subscribe throws
}
private void OnDisable() { sel.SelectionChanged -= OnChanged; sel.SelectionChanging.Unsubscribe(OnChanging); }

private void OnChanging(SelectionChangingArgs a)
{
    if (a.UserEvent.StartsWith("select.pointer")) a.Cancel = true;      // block mouse/touch placement
    // or clamp: a.Proposed = new TextSelection(Mathf.Clamp(a.Proposed.Anchor, 10, 40), Mathf.Clamp(a.Proposed.Focus, 10, 40));
}
private void OnChanged(SelectionChangedArgs a)
{
    if (!a.UserEvent.StartsWith("select.")) return;
    if (a.UserEvent == SelectionChangeReason.Input) return;             // moved by an edit, not by the user
    string picked = sel.GetSelectedText();
}
bool changed = sel.SetSelection(0, 5);     // false = unchanged or vetoed; indices clamp to [0, codepointCount]
sel.SelectWord(12); sel.SelectParagraph(12); sel.SelectAll(); sel.ClearSelection();
```
Indices are rendered codepoints (tags excluded): do not use `string.IndexOf` results from the source string when it contains tags. Edit-driven moves bypass the veto.

### S3. Custom context-menu command ("Look up item" on selected text)
```csharp
[Serializable]
public sealed partial class LookUpItemCommand : TextCommand      // partial: serialized state uses UniText state attributes
{
    protected override string DefaultTitle => "Look up";
    public override bool IsApplicable(in TextCommandContext c) => c.CanCopy;      // non-collapsed, copy allowed
    public override void Execute(in TextCommandContext c) => Codex.Open(c.Selectable.GetSelectedText());
}
```
Add it in the field's *Commands* list (or the project's list) through the Inspector's type picker (managed reference). The system menu shows it under its title; the Unity-UI menu shows it on the first command-less item row. Results that arrive later (editable fields): `var cap = c.CaptureSelection(); Translate(text, r => cap.Replace(r));` — dropped if the text changed. Variants without code: `new SearchWebCommand("Wiki", "https://en.wikipedia.org/w/index.php?search={0}")`.

### S4. A game-styled Unity-UI menu
Build a prefab with `UniTextContextMenu` on the root and one `ContextMenuItem` per button (`Target`, `Command` = e.g. `CopyCommand`, optional `Label` = a `UniText` inside the button, `WhenUnavailable`), plus optionally one item **without** a command as the template row for every other command. Assign it as the project's *Unity UI Menu* or a field's `ContextMenuPrefab`. To force it on phones set the field's `AndroidMenu`/`IOSMenu` to `UnityUI` (or the project setting to `UnityUI`). One instance per prefab is shared by all fields.

### S5. Copy / Select-All buttons without the context menu
```csharp
// not compiled
// toolbar control: Button + TextCommandButton { Command = CopyCommand, Target = <the UniTextSelectable> }
// or from code:
public void CopyAll()
{
    sel.SelectAll();
    var ctx = new TextCommandContext(sel);
    var copy = new CopyCommand();
    if (copy.IsApplicable(ctx)) copy.Execute(ctx);           // plain + rich clipboard write
    sel.ClearSelection();
}
```
`Target` is required for read-only text.

### S6. Highlights that follow edits (find-in-text, annotations)
```csharp
// not compiled
// one MutableRangeSource per highlight kind, one Style per source
var matches = new MutableRangeSource();
text.Styles.Add(Style.FromSource(matches, new HighlightModifier { /* paint, padding, radius */ }));

void ShowMatches(string query)
{
    var snap = matches.Snapshot;                             // invalid before the first parse
    if (!snap.IsValid) return;
    int n = text.FindAll(query, StringComparison.OrdinalIgnoreCase, hits);   // TextRange[] hits
    using var update = matches.BeginUpdate(snap.Revision);
    update.Clear();
    for (int i = 0; i < n; i++) update.Add(hits[i]);
    update.Commit();                                         // throws if the text moved on
}
```
Typing before a range shifts it; deleting its whole span drops it; pass `tracking: new RangeTracking(...)` to change boundary behaviour. `matches.SetRanges(rev, ranges)` swaps all ranges in one notification. For a "current match" layer add a second source with its own highlight style and a higher decoration priority. Tappable keywords on the same mechanism: [unitext-interaction-links.md](unitext-interaction-links.md) R5.

## 10. Pitfalls and mobile verdicts

### 10.1 Pitfalls
1. **No selection appears:** the text lacks `Raycast Target`, no EventSystem/`GraphicRaycaster`, another graphic covers the text, or (world text) no `WorldPointerRaycaster`. Selecting needs the same plumbing as links.
2. **`+=` on `SelectionChanging` does not compile**; it is an `OrderedValueEvent`. Duplicate `Subscribe` and unsubscribing something not subscribed throw `InvalidOperationException`.
3. **Indices are rendered codepoints**, not source-string offsets (tags excluded), not UTF-16 chars, not graphemes; clamped silently.
4. **Selection does not follow text edits** and is clamped on relayout; only `MutableRangeSource` ranges follow edits. Re-apply programmatic selections.
5. **The veto does not cover edits:** `select.input`, `select.restore`, `select.clamp` and menu-driven internal moves bypass `SelectionChanging`.
6. **Phones do not drag-select.** Touch swipes scroll the parent; selection starts from long press or double tap. Do not promise "tap and drag to select" on mobile. A plain label (no selectable) never captures drags.
7. **System menu/loupe exist only on devices** (Android 6+/9+, iOS 13+/17+). Editor, desktop and WebGL always show the Unity-UI menu and no loupe, so the phone path must be tested on a device. On Android a menu command collapses the selection (`select.command`); iOS keeps it.
8. **Empty `Commands` = no menu.** `PasteCommand`/`CutCommand` never apply to read-only text; `TextCommandButton` on read-only text needs `Target`.
9. **`BeginUpdate`/`Commit` throw** when the text moved on or the source has not completed a parse; `FindAll` positions go stale after any text change.
10. **A hidden `UniTextFocusable : Selectable` appears at runtime** next to selectable text (unless another `Selectable` owns the GameObject); it joins automatic keyboard/gamepad navigation.
11. **Faded-out text still takes pointer events** (`color.a = 0` is still hit); call `Hide()` after the fade.
12. **One selection per document:** deselecting the EventSystem selection clears it (`select.defocus`) unless the pointer is over a `FocusGuard` panel.
13. **Declare custom commands exactly as documented:** `[Serializable] public sealed partial class X : TextCommand` (`partial` because serialized state uses UniText state attributes).
14. **A custom menu must not invoke disabled entries**, and handles prefab sizing is forced by code (Preserve Aspect on the `Image`).
15. **Removed names you may "remember"** — section 11.

### 10.2 Mobile verdicts

| Feature | Verdict | Reason (source reading) |
|---|---|---|
| Selection highlight | OK | highlight rectangles baked on selection change, same machinery as authored highlights |
| Touch handles and menu (shared overlay canvas, one instance per prefab) | OK | overlay UI; no per-text duplicates |
| Native loupe | OK | drawn by the OS; the copy of the frame is done natively (cheaper since 3.10.x); devices only |
| Unity-UI menu | OK | one shared instance |
| `SystemTextActions` / bundled Android plugin | LIMIT | adds a manifest query and an invisible activity to every Android build |
| `GetSelectedText()` on huge windowed texts | LIMIT | includes text outside the visible window; allocates the whole selection |
| `FindAll` / `MutableRangeSource` re-tag | LIMIT | one pass per string change; zero-allocation only up to 64 chars of query |
| Many selectable texts at once | LIMIT | each adds a pointer surface and a hidden `Selectable`; add the component only where copying is needed |
| `Raycast Target` on non-interactive text | AVOID | blocks pointers and adds raycast work |

## 11. Removed and renamed names (selection, menu, touch)

Names an assistant may recall from older versions; none exists in v3.30:
- `UniTextSelectable.SelectionStyle` (`HighlightStyle`), `TextHighlighter` / `DefaultTextHighlighter` → `SelectionHighlight` (`HighlightPresentation`).
- Context menu rework: `ITextContextMenu`, `PrefabTextContextMenu`, **`NativeTextContextMenu`** (no longer exists), `ButtonContextMenuItem`, `CutContextMenuItem`, `ContextMenuAction`, `ContextMenuCapabilities`, `UniTextSelectable.ContextMenuRequested` / `ContextMenuDismissRequested`, `UniTextContextMenu.RequestAction` → replaced by `TextCommand` + `ContextMenuItem { Target, Command, Label, WhenUnavailable }` + `TextContextMenu.Show(placement, entries, invoke)`. Formatting shortcuts now run commands (`TextFormattingBehavior.Shortcuts`).
- Touch: the Unity-UI magnifier (`PrefabMagnifier`, `UniTextMagnifier`) is removed → `NativeMagnifier` or your own `IMagnifier`. `SelectionHitTest.FindLineAtLocalY` → `FindLineAtLocalPoint`.
- An empty menu or handles prefab slot now presents the project's prefab. To have no menu use an empty `Commands` list; for no handles set `SelectionHandles` to none.
- New projects present the system menu and loupe on phones; projects updated from older versions keep the Unity-UI menu until the setting is changed.
- A text with interactive ranges, selectable or editable behaviour on the same GameObject as a Button/Toggle no longer errors: that `Selectable` owns keyboard/gamepad focus.
- Interaction-area renames (range events, rules, routing): [unitext-interaction-links.md](unitext-interaction-links.md) section 13.

## Unverified

- The exact C# type and accessor of the generated `UniTextSelectable.Commands` member (documented by name only; the settings analogue is `StateList<TextCommandSource> UniTextSettings.Commands`). Author the list in the Inspector when unsure.
- Geometry mapping of the default selection presentation on a selectable added from code (colour is known; mapping was not checked).
- Whether the default command list (Cut, Copy, Paste, PastePlain, SelectAll, SystemTextActions, Share) is identical in a freshly created project's settings asset; it was read from an existing project's asset.
- Whether `MutableRangeUpdate.Commit()` bumps `Snapshot.Revision` (matters only for naive re-tag loops; guard by comparing the string).
- Index space and behaviour of programmatic selection on windowed (virtualized) documents: described from source, not exercised.
- `LightSideInputModule` together with selectable drag forwarding on a device: not exercised.
