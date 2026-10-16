# UniText — Input Fields and Editable Text

> **Base path:** `<UniTextRoot>` is the folder of the UniText package — the one whose `package.json` has `"name": "media.lightside.unitext"` (find it with `Glob **/media.lightside.unitext/package.json`; it may sit under `Packages/` or `Library/PackageCache/`). Never hard-code its location.
> See also: [unitext-clipboard-rtl-ime.md](unitext-clipboard-rtl-ime.md), [unitext-selection-context-menu.md](unitext-selection-context-menu.md), [unitext-markup-system.md](unitext-markup-system.md), [unitext-tmp-migration.md](unitext-tmp-migration.md), [unitext-components-setup.md](unitext-components-setup.md), [unitext-runtime-api.md](unitext-runtime-api.md), [unitext-layout-documents.md](unitext-layout-documents.md), [unitext-performance-mobile.md](unitext-performance-mobile.md), [unitext-version-traps.md](unitext-version-traps.md)

---

Everything is in namespace `LightSide` (`using LightSide;`). Mobile verdicts (`OK` / `LIMIT` / `AVOID`) come from reading source and docs; nothing was profiled. Input fields exist since UniText 3.0; 2.x had no editing.

## Lookup: task -> recipe

| I need... | Use | Recipe |
|---|---|---|
| Create a field in the editor | `GameObject → LightSide → UniText → Input Field` | R1 |
| Read the value / react to typing, Enter, focus loss | `VisibleText`, `TextChanged`, `Submitted`, `Defocused` | R2 |
| Single-line field (name, title) | `SingleLineBehavior` + Word Wrap off | R3 |
| Nickname: length cap, allowed chars, live hint, counter | `LengthLimitBehavior` + custom `InputFilterBase` + validator + `CharacterCounterDecorator` | R4 |
| Integer / decimal / email only | `IntegerFilter` / `DecimalFilter` / `EmailFilter` + keyboard type | R5 |
| Phone / date / card number mask | `InputMaskBehavior` | R6 |
| Password with show/hide toggle | `PasswordBehavior` + `Revealed` | R7 |
| Chat input: Enter sends, Send button keeps keyboard | `SubmitKeyBehavior` + `FocusGuard` | R8 |
| Search box with placeholder, clear button, Search key | `PlaceholderDecorator` + `ReturnKeyType.Search` | R9 |
| Focus / unfocus / read-only / "interactable" | `Activate`, `Defocus`, `ReadOnly` | R10 |
| Keep the field above the soft keyboard | `KeyboardAvoidanceBehavior` | R11 |
| Prefill a value that must obey mask/limit | `SetText("")` + `InsertText(...)` | R12 |
| Plain-only field (no markup from users) | `TypingMarkup=Literal`, `RichPaste=false` | R13 |
| Rich editing (bold/italic/colour) | styles + `TextFormattingBehavior` | R13 |
| Own filter / sanitiser / key rule | subclass `InputBehavior` / `InputFilterBase` | R14 |
| One setup reused by many fields | `InputBehaviorPreset` asset | R15 |
| Port `TMP_InputField` code | mapping table | section 8 |
| Pasted images/files, custom clipboard formats, paste button | [unitext-clipboard-rtl-ime.md](unitext-clipboard-rtl-ime.md) | — |
| RTL / Arabic / Hebrew field | [unitext-clipboard-rtl-ime.md](unitext-clipboard-rtl-ime.md) | — |

## 1. Field structure

### 1.1 Creating a field
- Editor: `GameObject → LightSide → UniText → Input Field` (or Hierarchy `Shift+Right Click → UniText → Input Field`). The menu instantiates the `InputFieldPrefab` slot of `UniTextSettings` (shipped prefabs live under `<UniTextRoot>/Defaults/Editing/`: Input Field, Editable Text, Selectable Text). **An empty slot creates nothing and logs a warning.**
- The menu places the field into the Canvas of the selected object (or the first active Canvas) and creates a Canvas, CanvasScaler and an `EventSystem` with the matching input module when the stage has none.
- Other entries: `... → UniTextEditable` (single-object editable text), `... → UniTextSelectable` (read-only selectable text), `Add Component → LightSide → UniText → UniTextEditable` (on an existing `UniText`), `Assets → Create → LightSide → UniText → Behavior Preset`, `Add Component → LightSide → UniText → InputCaretRenderer`, `UniTextPasteControl`, `UniTextDocumentView`. Editor tool: `Tools → LightSide → UniText → Edit Text in Scene` (authoring only).

### 1.2 Hierarchy of the shipped Input Field (580x90)
```
InputField - UniText     Image (rounded, Sliced) + RectMask2D + VerticalLayoutGroup (controls child w/h)
│                        + LayoutElement
├─ Placeholder           UniText "Write a message..." (raycastTarget OFF), LayoutElement ignoreLayout
└─ Text (UniText)        UniText (wordWrap ON, padding 20/15/20/15)
                         + UniTextSelectable + UniTextEditable { behaviors: [PlaceholderDecorator -> Placeholder] }
```
- **`UniTextEditable` sits on the child `Text (UniText)`, never on the root.** A serialized reference to the field means that child.
- Default behaviour: multi-line, word-wrapped, fixed 90 px tall, text scrolls inside the masked root, Enter inserts a newline, no limit, no keyboard config. All policy is added as behaviors.
- The "Editable Text" prefab is one object (`UniText` + `UniTextSelectable` + `UniTextEditable`) with an empty behaviors list.

### 1.3 Component ladder
- `UniText` renders. `UniTextSelectable` (auto-added via `RequireComponent`) owns gestures, selection, handles, context menu. `UniTextEditable` (sealed, `[ExecuteAlways]`, one per GameObject) adds the document, undo/redo, IME composition, caret, clipboard, behaviors, validation, focus lifecycle.
- It forces `TextComponent.IsDocumentHost = true` and replaces the text component's content with its own document view. **Writing `UniText.Text` of that component afterwards releases the view and desyncs the field.** Never write it; use `editable.SetText`. It never holds the live value either.
- A hidden runtime `UniTextFocusable : Selectable` is the EventSystem tab stop. A GameObject holds one `Selectable`: if a `Button` (or other Selectable) is on the same object, none is created and that Selectable owns navigation.
- Size comes from the text component's `ILayoutElement`. For an auto-growing box put `ContentSizeFitter` (Vertical = Preferred) on the **root**, cap with a `LayoutElement` max height. A fitter on the text child fights the root layout group.
- Under a `RectMask2D` the text scrolls inside (`DocumentTop/DocumentLeft`), not by `anchoredPosition`.
- Requirements: `EventSystem` in the scene (focus is the uGUI `ISelectHandler`), Canvas with `GraphicRaycaster`, `Raycast Target` on for the text child and **off** for the placeholder. Native text input itself does not depend on Unity's input system (works with Active Input Handling Legacy, New or Both).

### 1.4 Behaviors, hooks, presets
- `InputBehavior` is a `[Serializable]` abstract class shown through a `[SerializeReference]` type picker (groups: Field / Filtering / Formatting / Keys / Native / Placeholder / Support / Validation). **Filters, validators and decorators are behaviors** and share the one `Behaviors` list. Order = list order; local behaviors first, then each preset's runtime copy.
- `editable.Behaviors` and `editable.BehaviorPresets` are source-generated list accessors (absent from the API page, like `Styles`). Mutating them at runtime reconciles live. `GetBehavior<T>()` / `GetBehaviors<T>(List<T>)` search local and preset behaviors. `AddBehavior/RemoveBehavior` from old 3.0 notes do not exist.
- Four hooks, all ordered (ascending order, equal order = subscription order): `InputFilter(ref InputEdit)`, `KeyResolver(ref KeyResolve)`, `KeyboardResolver(ref KeyboardRequest)`, and `event MediaReceivedHook MediaReceived`. `InputEdit.Rejected` is sticky.
- Subtypes: `InputFilterBase` (character filter), `InputValidatorBase` (whole-value judge), `FieldDecorator` (visuals), `KeyboardBehavior` (soft-keyboard reactions), `MediaInputBehavior`, `CaretContextHandler`.

## 2. Reading, writing, events

### 2.1 Text spaces (do not mix)
| Space | Used by |
|---|---|
| Codepoint index (surrogate pair = 1) | `Selection`, `CaretPosition`, `SelectionStart/End`, `CodepointCount`, `MoveCaretTo`, `Select`, `InputEdit.insertCodepointIndex` |
| UTF-16 unit | `CharCount`, `CopyTextTo`, `TextEquals`, `Utf16Units` limit, native IME offsets |
| Grapheme cluster | `LengthLimitBehavior` default unit, `CharacterCounterDecorator` (a family emoji = 1) |
| Source vs visible | `Text`, `ValueChanged`, `Submitted` carry the **serialized source** (markup/escape syntax when the field has styles); `VisibleText` is the shown text, including in-flight IME composition. Equal while the field has no style annotations. |

### 2.2 Value API
- `Text {get;set}` source; `VisibleText` shown text (allocates); `SetText(string)`; `CharCount`, `CodepointCount`, `TextEquals(string|ReadOnlySpan<char>)`, `CopyTextTo(Span<char>)` are allocation-free; `SelectedText` allocates.
- `ReadOnly {get;set}`, `IsActive`, `IsComposing`, `CanUndo/CanRedo`, `CaretPosition {get;set}`, `SelectionStart/End`.
- Methods: `InsertText(string|ReadOnlySpan<char>)`, `DeletePrevious/DeleteNext/DeleteSelection/DeleteWord*/DeleteToLine*`, `Copy/Cut/Paste/PastePlain` (+ `Task` async variants), `Undo/Redo/ClearUndoHistory`, `SelectAll`, `MoveCaretTo`, `Select(start,end)`, `Activate(bool showKeyboard=true)`, `Deactivate`, `Defocus`, `RequestDefocusAfterSubmit`, `SetValidation`, `GetCaretScreenPosition(int, bool bottom)`, `SetTextProgrammatic(value, recordUndo=false, preserveHistory=false, reason=null)`.
- Style API (needs styles on the component): `ToggleStyle<T>()`, `IsStyleActive<T>()`, `ApplyStyle<T>(string)`, `TryGetStyleParameter<T>(out string)`, `ApplyStyleRange/SetStyle/RemoveStyleRange`, `ClearFormatting()`, `InsertObject<T>(string)`.

### 2.3 Events (C# events only, no `UnityEvent`)
| Event | Signature | Fires |
|---|---|---|
| `TextChanged` | `Action` | at most once per frame when the **shown** text changed, **including every IME composition change/start/end**. Use for live search and Send-button state. |
| `ValueChanged` | `Action<string>` | committed text changes only (no IME preview); string = `Text` (source). Allocates only while subscribed. |
| `DocumentChanged` | `Action<string reason>` | with `ValueChanged`; reason is a `TextChangeReason` string. |
| `Submitted` | `Action<string>` | Enter via `SingleLine`/`Password`/`SubmitKey`, soft-keyboard Go/Search/Send/Done, gamepad submit. String = `Text`. |
| `Cancelled` | `Action` | Escape / system back. **Does not defocus by itself.** |
| `Focused` | `Action` | synchronously inside `Activate` (pointer, navigation, code). |
| `Defocused` | `Action<EditingEndReason>` | session ended; may complete asynchronously while the native session quiesces. |
| `SelectionChanged` | `Action<int,int>` | frame-coalesced codepoint range. |
| `EditApplied` | `Action<EditShape>` | **synchronous** after each edit, before `TextChanged`. |
| `CompositionStateChanged` | `Action<bool>` | IME composition start / commit-cancel. |
| `CaretContextChanged` | `Action<CaretContext>` | frame-coalesced modifiers-at-caret diff. |
| `ValidationChanged` | `Action<ValidationState>` | when `SetValidation` changes the state. |
| `MediaReceived` | `MediaReceivedHook` | paste/drop/pick before the text pipeline. |
| static `ActiveEditorChanged`, `UniTextNativeInput.KeyboardVisibilityChanged(bool)` | `Action` / `Action<bool>` | shared by all editors. |

- Per-frame order: `TextChanged` -> `ValueChanged` -> `DocumentChanged` -> `SelectionChanged` -> caret context. Several edits in one frame raise each event once: never count keystrokes.
- **Changing text inside `TextChanged`/`ValueChanged` logs a warning and is processed next frame.**
- **There is no `SetTextWithoutNotify`.** `SetText` raises `TextChanged`, `ValueChanged` and `DocumentChanged("program.set")`. Guard echoes with `reason.StartsWith("input.")`.
- `EditingEndReason`: `Dismissed` (focus left without a verdict: other field, tap elsewhere, keyboard dismissed, code), `Committed` (ended on submit), `Cancelled` (ended on cancel). `onEndEdit(string)` has no equivalent payload: read the text yourself.
- `TextChangeReason` constants: `input.type`, `input.type.compose`, `input.paste`, `input.delete[.backward|.forward]`, `input.cut`, `input.drop` (reserved), `input.format`, `input.restore` (undo/redo), `program.set`, `sync.network`. `input.*` means user-originated.

### 2.4 Which edits pass the filter chain
| Path | InputFilter chain | Undo entry |
|---|---|---|
| Typing, IME commit (`input.type`, `input.type.compose`) | yes | yes |
| Paste, cut, delete | yes | yes |
| `InsertText(string)` | **yes** | yes |
| Undo/Redo replay | no | - |
| IME composition in progress | no (preview only) | no |
| `Text =`, `SetText` | **no**, history cleared | cleared |
| `SetTextProgrammatic(v, recordUndo, preserveHistory, reason)` | **no** | optional |

Filters, mask, length limit and case transform therefore act only on **committed user edits** (and `InsertText`). A limit or filter never bites during composition; it acts at commit.

## 3. Built-in behaviors

Property names are the generated accessors of serialized fields (`new LengthLimitBehavior { Limit = 20 }` is how the shipped migrator builds them). Mobile column: OK unless stated.

| Behavior | Properties (default) | What it does | Mobile |
|---|---|---|---|
| `SingleLineBehavior` | `KeepFocusOnSubmit` (false) | Enter -> `Submit`; newlines stripped from typing, paste and IME commit (multi-line paste is joined); `Submitted` -> defocus unless KeepFocus; selects the single-line native control and Return = Done. Pair with `UniText.WordWrap = false` for a horizontally scrolling field. | OK |
| `PasswordBehavior : SingleLineBehavior` | `MaskChar` ("•", first codepoint only), `AllowCopy` (false), `Revealed` (runtime-only, not serialized) | native secure entry; render-only mask (stored text stays plain); copy/cut blocked unless `AllowCopy`; paste into a masked field is plain text only; includes SingleLine semantics. | OK |
| `LengthLimitBehavior` | `Limit` (0 = off), `Unit` (`Graphemes`) | truncates an insert on a grapheme/codepoint/surrogate boundary, rejects when no room, deletions always pass; publishes `editable.LengthLimit` for counters; **counts the document source** (hidden markup counts). | OK (grapheme cache per keystroke) |
| `InputMaskBehavior` | `Pattern` ("(###) ###-####"), `RawText` (get) | rewrites the **whole field** on each edit. `#` digit (`char.IsDigit`), `A` letter (`char.IsLetter`), `*` letter or digit, any other char is an auto-inserted literal. BMP only. Backspace onto a literal removes the nearest entered char; deleting the last entered char empties the field. | OK (short values) |
| `CaseTransformBehavior` | `Case` (`Upper`; `Lower`, `Title`) | maps inserted text with simple Unicode case maps (no locale rules, e.g. Turkish dotless I); `Title` capitalises after any non-alphanumeric. Changes the stored value. | OK |
| `SelectAllOnFocusBehavior` | - | `SelectAll()` on `Focused`; vetoes the first pointer-gesture selection change. | OK |
| `DefocusOnCancelBehavior` | - | `Cancelled` -> `Defocus()`. Without it Escape/back does not release focus. | OK |
| `RestoreOnCancelBehavior` | - | remembers `Text` on `Focused`; on `Cancelled` restores it (`SetTextProgrammatic(..., reason: Restore)`) then `Defocus()`. TMP "Restore On ESC". | OK |
| `SubmitKeyBehavior` | `Submit` (`Enter`; or `ModifierEnter`), `KeepFocusOnSubmit` (true) | field stays multi-line. `Enter`: Enter submits, Shift+Enter inserts a newline. `ModifierEnter`: Ctrl/Cmd+Enter submits, Enter newline. **On a soft keyboard there is no Shift, so `Enter` always submits.** | OK |
| `TabKeyBehavior` | - | plain Tab inserts a tab (Shift/Ctrl+Tab still navigate). Default: Tab = focus traversal. | OK |
| `TextFormattingBehavior` | `MarkupVisibility` (Hidden), `RichPaste` (true), `PlainTextPaste` (Auto), `TypingMarkup` (Parse), `ArrowKeyEscape` (true), `Shortcuts`, `markupChrome` | shortcut layer: Ctrl/Cmd+B/I/U toggle `Bold/Italic/Underline` styles, `\` clears formatting; the first shortcut whose key matches and whose command is applicable runs, else the key falls through. On enable it **sets** the editable's markup/paste properties (restored on disable). Useless without styles. | OK |
| `CaretContextBehavior` | `handlers`, event `ContextChanged` | hosts `CaretContextHandler`s (e.g. `StyleStateHandler.Changed(bool)` when "typing now produces style X" flips) for toolbar state without polling. | OK |
| `LinkOnPasteBehavior` | - | pasting a bare URL over a non-empty selection turns the selection into a link (field's link style; none -> plain URL). | OK |
| `StripFormatOnPasteBehavior` | `Format` | removes one modifier (by signature) from pasted attributed content. | OK |
| `MediaInputBehavior` (abstract) | override `OnMedia`, `OnFiles`, `OnImage` | consumes pasted/dropped media; true = consumed. See [unitext-clipboard-rtl-ime.md](unitext-clipboard-rtl-ime.md). | LIMIT: file/image reads may prompt on iOS/Android/web |
| `NativeKeyboardBehavior` | `Keyboard` (`NativeKeyboardConfig`) | sets the soft-keyboard config; wins over a filter's preferred keyboard type. Inert on desktop. | OK |
| `NativeFieldOverlayBehavior` | `PresenterId` ("system"), `Identifier`, `PresenterData` | docks a native replica of the field above the keyboard (Android/iOS/WebGL); `UniTextEditable` stays authoritative; placeholder is shown by the replica. Activation fails where no presenter has this id. | OK, mobile only; adds a native view |
| `KeyboardAvoidanceBehavior : KeyboardBehavior` | `Target` (null = clipping parent, else the field), `KeyboardPadding` (32 dp), `OnlyWhenOverlapping` (true), `FallbackDuration` (0.25 s), `FallbackEasing` (`EaseOut`) | moves `Target.anchoredPosition.y` up so the field's visible bottom clears the keyboard top plus padding; frame-synced on Android API 30+, timed animation elsewhere; settles back on focus loss. Target must not be layout-driven on Y. | OK (cheap per frame while animating) |
| `AutoValidateBehavior` | `Mode` (`OnUnfocus`) | runs every `InputValidatorBase` in list order, first invalid wins, publishes through `SetValidation`. Modes: `OnValueChanged`, `OnUnfocus`, `OnSubmit`, `Always`. **Without it validators never run.** | OK |

Behavior classes you write yourself with serialized fields follow the shipped pattern: `[Serializable] public sealed partial class X : InputBehavior` with `[SerializeField, StatePassive]` fields (see Unverified).

## 4. Filters and validators

`InputFilterBase : InputBehavior` — `abstract bool Allows(in EditProposal proposal)` judges the **post-state**; `false` drops the entire edit (it does not sanitise: a paste with one bad character is lost whole). Deletions, IME preview, undo and programmatic writes never reach it. `virtual KeyboardType PreferredKeyboardType` is used only when no `NativeKeyboardBehavior` set a config. Helpers: `DocumentContains(in EditProposal, int codepoint)` (O(n)), `AcceptsLeadingSign(...)`. `EditProposal` is a `readonly ref struct { ITextDocument Document; TextRange ReplacedRange; ReadOnlySpan<char> Inserted; string Reason }`.

| Filter | Property | Accepts | Preferred keyboard |
|---|---|---|---|
| `IntegerFilter` | `AllowNegative` (false) | ASCII `0-9`, one leading `-` if allowed | `NumberPad`; negative -> `NumbersAndPunctuation` |
| `DecimalFilter` | `AllowNegative` (false) | digits, **one** separator (`.`, `,` or the culture's decimal separator), optional leading `-`; separator kept as typed | `DecimalPad`; negative -> `NumbersAndPunctuation` |
| `AlphanumericFilter` | - | Unicode letters + ASCII digits (no space, no `_`) | Default |
| `EmailFilter` | - | ASCII letters/digits, one `@` (not first), `.` (not first, not right after `@`), `- _ + %`; **not** RFC validation | `EmailAddress` |
| `NameFilter` | - | Unicode letters, space, `-`, `'`, U+2019 | Default |

- **Rewriting hook** (sanitise instead of reject): subscribe `editable.InputFilter.Subscribe(handler)`, `void Handler(ref InputEdit e)`. `InputEdit` has `text`, `insertCodepointIndex`, `replacedCodepoints`, `document`, `caret` (-1 = after inserted), `Reason`, sticky `Rejected`, `RemoveFormatting(BaseModifier)`. If you reduce `text` to empty while `replacedCodepoints == 0`, set `Rejected = true`. Put a sanitiser **before** `LengthLimitBehavior` in the list.
- **Validators**: `InputValidatorBase.Validate(ITextDocument)` returns a `ValidationState` (`Valid()`, `Invalid(message)`, `Pending()`; `Status` open token, empty = valid; `IsValid`, `Message`). No validators ship; write your own and add `AutoValidateBehavior`. App code may call `editable.SetValidation(state)` directly (async server check: `Pending()` then the result); an identical state is a no-op. Show the result with `SupportingTextDecorator`.

## 5. Decorators

`FieldDecorator : InputBehavior` (abstract) overrides `OnFieldState(in FieldState)`; `FieldState` = `IsEmpty` (no committed text and not composing), `IsFocused`, `IsComposing`, `LengthLimit {Max, Unit}`, `Validation`. Optional `OnAttach/OnDetach/OnTick(float)` with `RequestTick()/StopTick()`.

| Decorator | Serialized | Behaviour |
|---|---|---|
| `PlaceholderDecorator` | `Target` (UniText) | `Target.IsVisible = state.IsEmpty`; the GameObject stays active (forced active on attach). Keep its raycastTarget off. Native replica reuses its text as placeholder. |
| `FloatingLabelDecorator` | `Label`, `FloatedTo`, `FloatedScale` (0.8), `Duration` (0.12), `Easing` | label floats when focused or non-empty; instant when `Accessibility.PrefersReducedMotion`. |
| `SupportingTextDecorator` | `Target`, `Helper`, `ErrorColor` | shows `Helper`; while invalid with a message shows `Validation.Message` in the error colour. |
| `CharacterCounterDecorator` | `Target`, `OverflowColor` | `count` or `count/limit` in the limit's unit (graphemes with no cap); recolours at `count >= limit`; counts document source. |

## 6. Caret
- `InputCaretRenderer : MaskableGraphic` draws the caret as a rect. Empty `CaretRenderer` slot -> one is auto-created on first activation. Subclass and override `OnPopulateMesh` (use `CaretRect`, `BlinkVisible`) then assign `editable.CaretRenderer`. Members: `PrefersNonBlinkingCaret` (+ event), `CaretWidthPercent`, `Padding`, `SetCaretPosition(Rect)`, `ResetBlink()`.
- Blink and sizing are global in `UniTextSettings`: `CaretBlinkInterval` (half period, 0.5 s), `CaretBlinkTimeout` (0 = forever), `CaretWidthPercent` (6), `CaretPadding`. There is no per-field blink rate.
- `CaretAffinity` (`Downstream`/`Upstream`) disambiguates soft-wrap and LTR/RTL run boundaries. `CaretContext { Active, Entered, Exited, Selection, IsComposing, Editable }` — the lists are reused, copy them to keep.
- Related project-wide settings: `undoCoalesceTimeout` 0.5 s (same-class edits merge), `undoMemoryLimit` 1 MiB per field (oldest evicted, 0 = unlimited), `virtualizationThreshold` 16384 UTF-16 chars (longer text materialises only the visible window).

## 7. Focus and soft keyboard

### 7.1 Focus model
- One active editor app-wide (`UniTextEditable.ActiveEditor`). `Activate()` on a second editor queues, deactivates the first, then activates; it **returns silently when the component is not `isActiveAndEnabled`**.
- EventSystem `OnSelect` -> `Activate`. **Touch focus waits for the tap** (press and release in place), so scroll gestures never focus. `OnDeselect` commits IME composition then deactivates — **unless the press landed under a `FocusGuard`** (Add Component → LightSide → Core → FocusGuard), which keeps the editor and the keyboard up. Put toolbars, Send and Clear buttons under a `FocusGuard`.
- `Defocus()` = clear the EventSystem selection if this field holds it, else `Deactivate()`. This is the only way to hide the keyboard (no public Show/HideKeyboard exists). `RequestDefocusAfterSubmit()` defers defocus until every `Submitted` subscriber has run.
- Enter and Escape on desktop are claimed by the editor (they reach the input session, not EventSystem submit/cancel). EventSystem submit (gamepad, external keyboard) activates an inactive field or submits an active one. App pause/focus loss commits IME composition.
- `Next`/`Previous` keyboard keys call `FindSelectableOnDown/Up` of the field's selectable: **set uGUI navigation neighbours** or they do nothing.

### 7.2 Keyboard modes
1. **Transparent producer (default).** A hidden native input surface feeds UniText; UniText still draws text and caret. The keyboard covers the field unless `KeyboardAvoidanceBehavior` lifts it. If the user dismisses the keyboard, the editor stays active (caret blinks, no keyboard) until tapped again.
2. **`NativeFieldOverlayBehavior`.** A native replica docked above the keyboard mirrors the document. If the keyboard stays gone for more than 1 s the field is `Defocus()`ed. TMP "Hide Mobile Input = off" equivalent.
- Backends: Windows, macOS, iOS, Android, WebGL native plugins ship in the package and are included automatically; Linux/UWP/tvOS/visionOS use `ManagedInputBackend`, which drains Unity key events (`PopEvent`) so IMGUI/legacy `Event` consumers stop seeing keys while a field is focused. In WebGL Unity gets no key events (Enter included) while editing: use `Submitted/Cancelled/Defocused`, not `Input.GetKey`.
- Android mirrors the whole document to the IME up to 1024 UTF-16 units, else a ~512-unit window around the selection, so Gboard suggestions keep working. `ImeFlags.NoPersonalizedLearning` gives an incognito keyboard for sensitive fields.
- Observe the keyboard: `UniTextNativeInput.KeyboardVisibilityChanged(bool)`, `KeyboardChanged(KeyboardEvent)`, `KeyboardArea` (Unity screen px, zero when hidden). On Android 11+ visibility fires when the keyboard is fully up. Phases: `WillShow`, `AnimationProgress` (Android 30+), `DidShow`, `WillHide`, `DidHide`, `WillChangeFrame`.

### 7.3 `NativeKeyboardConfig` and platform fallbacks
Cross-platform: `KeyboardType`, `ReturnKeyType`, `AutoCapitalization`, `AutoCorrection`, `SpellChecking`, `AutofillHint`. iOS only: `SmartQuotes/SmartDashes/SmartInsertDelete`, `EnablesReturnKeyAutomatically`, `PasswordRules`, `IOSKeyboardTypeOverride`, `IOSReturnKeyOverride`. Android only: `ImeFlags` (`NoPersonalizedLearning`, `ForceAscii`).
- `KeyboardType`: `Default, ASCIICapable, NumbersAndPunctuation, URL, NumberPad, PhonePad, EmailAddress, DecimalPad, WebSearch`. `ReturnKeyType`: `Default, Go, Search, Send, Next, Previous, Done, Enter`. `AutofillHint`: `None, Username, Password, NewPassword, OneTimeCode, EmailAddress, TelephoneNumber, Name, GivenName, FamilyName, PostalAddress, PostalCode, CreditCardNumber, URL`.

| Android mapping | Result |
|---|---|
| `NumberPad` | `TYPE_CLASS_NUMBER` |
| `DecimalPad` | number + decimal + **signed** |
| `PhonePad` | `TYPE_CLASS_PHONE` (these three return early: autocap/autocorrect/spellcheck flags are **not** applied) |
| `URL`, `EmailAddress` | text URI / email variation |
| **`Default`, `ASCIICapable`, `NumbersAndPunctuation`, `WebSearch`** | plain `TYPE_CLASS_TEXT` |
| password mode | text-password variation (number-password for NumberPad/DecimalPad) |

- Signed `IntegerFilter`/`DecimalFilter` ask for `NumbersAndPunctuation`, which Android renders as an ordinary text keyboard (the filter still blocks characters). Prefer `DecimalPad` via `NativeKeyboardBehavior` (Android DecimalPad is signed; the iOS decimal pad has no minus key).
- **Return key:** a field that accepts newlines gets `IME_ACTION_NONE` on Android regardless of `ReturnKeyType` and a plain Return on iOS. Single-line fields map `Default` -> Done and `Go/Search/Send/Next/Previous/Done` to the matching action. `SubmitKeyBehavior` does not relabel the key of a multi-line field.
- Soft-keyboard actions route as `NativeEditorAction` strings: `Submit` (Go/Search/Send/Done), `Return` (goes through key bindings, so `SubmitKeyBehavior` can turn it into submit; the package guide still shows the old name `Newline`), `Done` (end session, defocus, no submit), `Next`/`Previous`, `Cancel`, clipboard and undo actions.
- Android 13/14 with the keyboard up, or apps using Predictive Back, dismiss the keyboard without raising `Cancelled`.

### 7.4 Desktop key bindings (platform primary modifier: Cmd on macOS/iOS/WebGL-on-Apple, else Ctrl)
Select all A, copy C, cut X, paste V (+Shift = plain paste), undo Z, redo Shift+Z (and Y off-Mac), word move/select with Ctrl/Alt+arrows, Ctrl+Backspace/Delete word delete, Shift+Delete cut, Ctrl/Shift+Insert copy/paste, Escape = `Cancel`, Menu key / Shift+F10 context menu, **Return = newline** (submits only via SingleLine/Password/SubmitKey), macOS Emacs bindings. Windows AltGr never triggers shortcuts. Customise per field with `editable.KeyResolver` (set `KeyResolve.action`, never overwrite an already-set action; `EditAction.Ignore` swallows a key).

## 8. TMP_InputField differences and mapping

TMP is one monolithic component with UnityEvents on Unity `Input`/`TouchScreenKeyboard`. UniText is composable behaviors, C# events, OS-native text input independent of Active Input Handling, grapheme-aware limits, undo with coalescing, rich clipboard formats and BiDi caret.

| TMP_InputField | UniText |
|---|---|
| `text`, `onValueChanged`, `onSubmit` | `Text`/`VisibleText`; `ValueChanged += s =>` or `TextChanged += () =>`; `Submitted += s =>` (`RemoveListener` -> `-=`) |
| `onEndEdit` / `onSelect` / `onDeselect` | `Defocused(EditingEndReason)` / `Focused` / `Defocused` (signatures differ) |
| `ActivateInputField()` / `DeactivateInputField()` / `isFocused` | `Activate()` / `Defocus()` or `Deactivate()` / `IsActive` |
| `readOnly` | `ReadOnly` |
| `interactable` | no equivalent (use `ReadOnly`, disable the component, or block raycasts) |
| `characterLimit` | `LengthLimitBehavior{Limit, Unit}` (TMP counted UTF-16 units: use `Utf16Units` to match) |
| Content Type Integer/Decimal/Alphanumeric/Name/Email | `IntegerFilter`/`DecimalFilter`/`AlphanumericFilter`/`NameFilter`/`EmailFilter` |
| Input Type Password + asterisk | `PasswordBehavior{MaskChar}` |
| Line Type Single Line / Multi Line Submit / Multi Line Newline | `SingleLineBehavior` (+ Word Wrap off) / `SubmitKeyBehavior{Enter, KeepFocusOnSubmit=false}` / nothing |
| Keyboard Type, Auto-Correct | `NativeKeyboardBehavior` |
| Hide Mobile Input = off | `NativeFieldOverlayBehavior` |
| On Focus Select All / Restore On ESC | `SelectAllOnFocusBehavior` / `RestoreOnCancelBehavior` (else `DefocusOnCancelBehavior`) |
| Placeholder | `PlaceholderDecorator{Target}` |
| `SetTextWithoutNotify` | none (see 2.3) |
| selection colour / caret blink | `UniTextSelectable.SelectionHighlight.Paint` / global `UniTextSettings.CaretBlinkInterval` |

The editor migrator converts exactly-mappable fields and leaves the field as TMP when it finds a custom validator, line limit, scrollbar, non-default scroll sensitivity, soft-keyboard hiding, non-default deactivation, caret/selection customisation or UnityEvent persistent listeners. It never rewrites `onEndEdit/onSelect/onDeselect` handlers. See [unitext-tmp-migration.md](unitext-tmp-migration.md).

## 9. Recipes

All snippets assume `using LightSide; using UnityEngine;` (+ `System`, `UnityEngine.UI`, `UnityEngine.EventSystems` where used). Runtime `field.Behaviors.Add(...)` lines are not compiled here (`// not compiled`); the same setup can be done in the inspector list.

### R1. Create a field
1. `GameObject → LightSide → UniText → Input Field` under a Canvas (menu auto-creates Canvas and EventSystem when missing; at runtime `Add Component → LightSide → Core → EventSystemBootstrap` creates an EventSystem if a scene lacks one).
2. Edit the placeholder string on the `Placeholder` child's `UniText`; add behaviors on the `UniTextEditable` of `Text (UniText)`.
3. Leave `Font`/`FontStack` empty for the default stack (Latin + Arabic + Hebrew); set a stack only for custom fonts.
4. Height is the root's `RectTransform`; for auto-grow add `ContentSizeFitter` on the root plus a `LayoutElement` max height.

### R2. Read, write, observe
```csharp
public sealed class FormView : MonoBehaviour
{
    [SerializeField] UniTextEditable field;          // the "Text (UniText)" child, not the root

    void OnEnable()
    {
        field.TextChanged     += OnShown;            // typing + IME composition, <= 1/frame
        field.DocumentChanged += OnCommitted;        // committed edits, with reason
        field.Submitted       += OnSubmitted;
        field.Defocused       += OnDefocused;        // onEndEdit analogue
    }
    void OnDisable()
    {
        field.TextChanged -= OnShown; field.DocumentChanged -= OnCommitted;
        field.Submitted -= OnSubmitted; field.Defocused -= OnDefocused;
    }
    void OnShown() { var live = field.VisibleText; }                        // allocates
    void OnCommitted(string reason) { if (reason.StartsWith("input.")) { /* user edit */ } }
    void OnSubmitted(string text) { var value = field.VisibleText.Trim(); }
    void OnDefocused(EditingEndReason why) { if (why == EditingEndReason.Cancelled) { /* Esc/back */ } }
}
```
Set with `field.SetText("hello")` (caret to end, undo cleared, **no filters**); clear with `SetText(string.Empty)`. Hot checks: `CharCount == 0`, `TextEquals("x")`, `CopyTextTo(span)`. Read `VisibleText` for plain values.

### R3. Single-line field (name, email, title)
Inspector: add `SingleLineBehavior` (optionally `DefocusOnCancelBehavior`), uncheck Word Wrap on the field's `UniText`, keep alignment `Start`. Enter submits and releases focus (`KeepFocusOnSubmit` keeps it). Soft-keyboard Return shows Done; for a different key add `NativeKeyboardBehavior{Keyboard.ReturnKeyType = Go/Next/...}` (`Next` needs navigation neighbours).
```csharp
field.TextComponent.WordWrap = false;                    // not compiled
field.Behaviors.Add(new SingleLineBehavior());
field.Behaviors.Add(new DefocusOnCancelBehavior());
```
Multi-line paste is joined into one line; the horizontal scroll resets to the alignment edge on defocus.

### R4. Nickname: length cap, allowed characters, live hint, counter
Inspector list, in order: `SingleLineBehavior`; your sanitiser/filter; `LengthLimitBehavior{Limit=16, Unit=Graphemes}` (use `Utf8Bytes`/`Utf16Units` to match a server column); `NativeKeyboardBehavior{AutoCapitalization=None, AutoCorrection=Disabled, SpellChecking=Disabled, AutofillHint=Username}`; `CharacterCounterDecorator{Target = counter text}`; your validator; `AutoValidateBehavior{Mode=OnValueChanged}`; `SupportingTextDecorator{Target = hint text, Helper = "3-16 letters, digits, _"}`.
```csharp
[Serializable]
public sealed class NicknameCharsFilter : InputFilterBase
{
    public override bool Allows(in EditProposal p)
    {
        var s = p.Inserted;                              // this insert only
        for (int i = 0; i < s.Length; i++)
            if (!(char.IsLetterOrDigit(s[i]) || s[i] == '_')) return false;   // whole edit rejected
        return true;
    }
}

[Serializable]
public sealed partial class MinLengthValidator : InputValidatorBase   // partial + [StatePassive], like shipped extensions
{
    [SerializeField, StatePassive] int minLength = 3;
    public override ValidationState Validate(ITextDocument d)
        => d.CodepointCount >= minLength ? ValidationState.Valid()
                                         : ValidationState.Invalid($"At least {minLength} characters");
}
```
`AlphanumericFilter` (no `_`) and `NameFilter` cover simpler cases. A paste containing one disallowed character is dropped whole; to strip instead, use the rewriting hook (R14).

### R5. Numeric, decimal, email
- Integer: `IntegerFilter` (+ `SingleLineBehavior`) -> number pad. A signed value gets a plain text keyboard on Android; add `NativeKeyboardBehavior{KeyboardType = DecimalPad}` explicitly.
- Decimal: `DecimalFilter` keeps the separator as typed: `float.Parse(s.Replace(',', '.'), CultureInfo.InvariantCulture)`.
- Email: `EmailFilter` + your own validator for real checks, `KeyboardType.EmailAddress`, `AutofillHint.EmailAddress`.
- Pasted or IME-committed text uses the same filter (a pasted "1 000" is rejected whole by `IntegerFilter`); `SetText` skips it, so validate yourself.

### R6. Phone / date / card mask
```csharp
field.Behaviors.Add(new InputMaskBehavior { Pattern = "(###) ###-####" });   // not compiled
field.Behaviors.Add(new NativeKeyboardBehavior { Keyboard = new NativeKeyboardConfig {
    KeyboardType = KeyboardType.PhonePad, AutofillHint = AutofillHint.TelephoneNumber } });
var raw = field.GetBehavior<InputMaskBehavior>().RawText;     // "5551234567", literals stripped
```
Other patterns: `##/##/####`, `#### #### #### ####`, `AA-####`. Stored text is the formatted value (`VisibleText` == "(555) 123-4567"). `RawText` may contain non-ASCII digits (`char.IsDigit`): normalise before sending to a backend. The pattern length is the cap, so no `LengthLimitBehavior` is needed. A literal digit in the pattern (`+7 (###)`) is auto-inserted and swallowed if typed; there is no "8 -> +7" rewrite. `PhonePad` on Android ignores autocap/autocorrect.

### R7. Password with show/hide toggle
Inspector: `PasswordBehavior{MaskChar="•", AllowCopy=false}`, optionally `SelectAllOnFocusBehavior`, `NativeKeyboardBehavior{AutofillHint=Password or NewPassword, AutoCorrection=Disabled}`, `PlaceholderDecorator`. `PasswordBehavior` already includes single-line semantics.
```csharp
public sealed class PasswordVisibility : MonoBehaviour
{
    public UniTextEditable editable; public Toggle toggle;
    void Awake() { toggle.onValueChanged.AddListener(OnToggle); OnToggle(toggle.isOn); }
    void OnToggle(bool on)
    {
        var pw = editable.GetBehavior<PasswordBehavior>();
        if (pw != null) pw.Revealed = on;                // render-only; stored text is always plain
    }
}
```
Read with `field.Submitted += s => Login(s)` or `VisibleText`. Set `field.TypingMarkup = TypingMarkupPolicy.Literal` (R13) so a password containing `<b>` is not parsed when styles exist. In native-overlay mode the OS field owns its own reveal.

### R8. Chat composer: Enter sends, Send button keeps the keyboard
Inspector: `SubmitKeyBehavior{Submit=Enter, KeepFocusOnSubmit=true}`, `LengthLimitBehavior{Limit=500}`, `PlaceholderDecorator`, `KeyboardAvoidanceBehavior{Target = panel root}`, `DefocusOnCancelBehavior`; keep wrapping; auto-grow with a root `ContentSizeFitter` + max height. Put the Send/attach buttons under a `FocusGuard` (on the panel root).
```csharp
void OnEnable()  { input.Submitted += OnSubmit; sendButton.onClick.AddListener(Send); }
void OnDisable() { input.Submitted -= OnSubmit; sendButton.onClick.RemoveListener(Send); }
void OnSubmit(string _) => Send();
void Send()
{
    var msg = input.VisibleText.Trim();
    if (msg.Length == 0) return;
    Post(msg);
    input.SetText(string.Empty);
    EventSystem.current?.SetSelectedGameObject(input.gameObject);   // keep typing
    input.Activate();
}
```
On a phone Return always submits with `SubmitKey.Enter` (no Shift, no newline). Use `ModifierEnter` only for desktop/hardware keyboards. Pasted images: add a `MediaInputBehavior` subclass ([unitext-clipboard-rtl-ime.md](unitext-clipboard-rtl-ime.md)). Chat of untrusted users: also apply the plain-only settings of R13.

### R9. Search box
Inspector: `SingleLineBehavior`, `NativeKeyboardBehavior{ReturnKeyType=Search, AutoCorrection=Disabled}` (`WebSearch` is a plain text keyboard on Android), `PlaceholderDecorator{Target=hint}`, `DefocusOnCancelBehavior`.
```csharp
void OnEnable()
{
    field.TextChanged += Refresh;                        // while typing and during IME composition
    field.Submitted   += _ => Search(field.VisibleText.Trim());
    clearButton.onClick.AddListener(Clear);              // under a FocusGuard to keep the keyboard
    Refresh();
}
void Refresh()
{
    clearButton.gameObject.SetActive(field.CharCount > 0 || field.IsComposing);
    Debounce(field.VisibleText);                         // restart a ~0.25 s timer, then query
}
void Clear() { field.SetText(string.Empty); field.Activate(); }   // never call SetText inside TextChanged
```
The placeholder stays active and only toggles `IsVisible`; its raycast is off so taps reach the field.

### R10. Focus, defocus, read-only, "interactable"
```csharp
field.Activate();            // focus + raise soft keyboard (queues if another editor is releasing)
field.Activate(false);       // focus without the keyboard
field.Defocus();             // canonical release: hides keyboard, Defocused(Dismissed)
EventSystem.current.SetSelectedGameObject(field.gameObject);   // same as a pointer select
field.ReadOnly = true;       // selection + copy kept; type/paste/cut/undo refused
```
No `interactable` exists. Inert field: `ReadOnly = true` (still selectable and copyable), or `field.enabled = false` (+ disable the `Selectable` to stop selection), or block raycasts (`CanvasGroup.blocksRaycasts = false`). Escape/back only raises `Cancelled`: add `DefocusOnCancelBehavior`.

### R11. Soft keyboard on phones
- Always add `KeyboardAvoidanceBehavior` with `Target` = popup/panel root (not a layout-driven child; it animates `anchoredPosition.y`). Works from `KeyboardChanged` area in Unity screen px, so it is correct under CanvasScaler.
- Native look: add `NativeFieldOverlayBehavior`; set `Identifier` for UI automation and accessibility ids.
- Custom reaction (resize a scroll view): subclass `KeyboardBehavior` (`OnKeyboardWillShow(KeyboardEvent)`, `OnKeyboardUpdate(float)`).
- Hide on submit: `SingleLineBehavior` default, or `field.Defocus()` in `Submitted`.
- Required plugins (Android `UniTextInput.aar` + native libs per ABI, iOS xcframework and `.mm` bridges, WebGL jslib) ship in the package; no manual setup. WebGL disables `WebGLInput.captureAllKeyboardInput`.

### R12. Programmatic fill that obeys the rules
```csharp
field.SetText(string.Empty);          // clears undo, no filters
field.InsertText("5551234567");       // goes through mask, limit and filters; records undo; no-op when ReadOnly
```
`SetTextProgrammatic(text, recordUndo: true)` records one undoable replace but still skips filters. To ignore your own writes, skip `DocumentChanged` reasons that do not start with `input.` or use a re-entrancy flag.

### R13. Rich editing and plain-only fields
Rich editing needs styles on the text component; the package ships none. Register in code, or assign a `StylePreset` (component Style Presets or the Global Style Preset in the settings asset). Tag vocabulary bootstrap: see the master rule `unitext.md` section "Tag vocabulary bootstrap" and [unitext-markup-system.md](unitext-markup-system.md).
```csharp
var text = field.TextComponent;
text.Styles.Add(Style.Tag(new BoldModifier(),      "b"));   // tags exist only because you add them here
text.Styles.Add(Style.Tag(new ItalicModifier(),    "i"));
text.Styles.Add(Style.Tag(new UnderlineModifier(), "u"));
field.Behaviors.Add(new TextFormattingBehavior());          // Ctrl/Cmd+B, I, U and \ (clear)
// toolbar under a FocusGuard: onClick -> field.ToggleStyle<BoldModifier>();
// colour: field.ApplyStyle<ColorModifier>("#FFB3BA"); state: field.IsStyleActive<BoldModifier>()
```
- Toolbar state without polling: `CaretContextBehavior` + `StyleStateHandler{Style=Bold}.Changed`, or subclass `CaretContextHandler`. Toolbar without code: `TextCommandButton` (follows `ActiveEditor`, keeps focus).
- `MarkupVisibility`: `Hidden` (default; tags atomic and invisible, Backspace over a styled char deletes the pair as one undo step), `RevealActiveRange` (reveal at caret), `Raw` (source editor: tags literal, plain paste parsed, copy plain). Style visible delimiters with `MarkupChrome` + `RefreshMarkup()`.
- `TypingMarkup=Parse` (default) turns a hand-typed complete `<b>x</b>` into bold when the field has that style; `Literal` escapes triggers.
- **Plain-only field** (names, chat of untrusted users, passwords, search). Set in `Awake/OnEnable` (these properties are not serialized) and read `VisibleText`:
```csharp
field.TypingMarkup  = TypingMarkupPolicy.Literal;
field.RichPaste     = false;
field.PlainTextPaste = PlainTextPastePolicy.Literal;
```
Do not add `TextFormattingBehavior` there.

### R14. Own behavior, filter hook, key rule
```csharp
[Serializable]
[TypeDescription("Trim leading spaces")]             // picker label; TypeGroup("Formatting", 1) groups it
public sealed class NoLeadingSpaceBehavior : InputBehavior
{
    protected override void OnEnable()  => editable.InputFilter.Subscribe(Filter);
    protected override void OnDisable() => editable.InputFilter.Unsubscribe(Filter);
    static void Filter(ref InputEdit e)
    {
        if (e.Rejected || e.insertCodepointIndex != 0 || string.IsNullOrEmpty(e.text)) return;
        e.text = e.text.TrimStart();
        if (e.text.Length == 0 && e.replacedCodepoints == 0) e.Rejected = true;
    }
}
```
Other hooks: `editable.KeyResolver.Subscribe((ref KeyResolve k) => { if (k.key == NativeKeyCode.Escape && k.action == EditAction.None) k.action = EditAction.Ignore; })`; `KeyboardResolver` (`ref KeyboardRequest r` -> set `r.config`). Subscribe in `OnEnable`, unsubscribe in `OnDisable`. Built-ins restore host state on disable with the `Saved<T>` slot pattern (`Capture/Restore`).

### R15. Reusable archetype
`Assets → Create → LightSide → UniText → Behavior Preset`, add e.g. `SingleLineBehavior + LengthLimitBehavior + NativeKeyboardBehavior`, assign it in each field's **Behavior Presets**. Each field runs its own runtime copy; preset edits replay live into every field. **A preset cannot reference scene objects**: `PlaceholderDecorator.Target`, `KeyboardAvoidanceBehavior.Target` and counter targets stay in the field's local `Behaviors` (the editor audits presets for scene refs).

## 10. Pitfalls

**Wrong-value traps**
1. **Programmatic writes skip the rules.** `Text =`, `SetText`, `SetTextProgrammatic` bypass filters, mask, limit, case transform. A prefilled "5551234567" shows unmasked; a 100-char `SetText` ignores the limit. Use `SetText("")` + `InsertText` (R12).
2. **`Text` is source, not display.** `Text`, `ValueChanged`, `Submitted` carry markup/escape syntax when the field has styles. Read `VisibleText` for plain semantics.
3. **Never write `UniText.Text` of an editable's text component** (releases the document view).
4. **Typed markup is parsed by default** whenever a matching style exists: a nickname typed as `<color=red>x</color>` becomes styled and `Text` then carries tags. Use the plain-only settings (R13). The editor also registers a `BackslashEscapeRule` on the field's parser when none exists, so a backslash before ASCII punctuation may be consumed as an escape in typed text: read `VisibleText` and test paths/regex input.
5. **Filters judge the insert, not sanitise it.** One bad character drops a whole paste; deletions, IME composition, undo and programmatic text never reach filters.
6. **`TextChanged` includes IME composition; `ValueChanged`/`DocumentChanged` do not.** Live search and Send-button state belong on `TextChanged` + `VisibleText`; dirty-form tracking on `ValueChanged` is committed-only. Events coalesce per frame; no `SetTextWithoutNotify`.
7. **Default Input Field is a multi-line document**: nothing submits until you add `SingleLineBehavior`, `PasswordBehavior` or `SubmitKeyBehavior`. `SubmitKey.Enter` makes newlines impossible on soft keyboards.
8. **`Cancelled` does not defocus**; add `DefocusOnCancelBehavior` or `RestoreOnCancelBehavior`.
9. **Behavior presets cannot hold scene references** (R15).
10. **Selectable on the same object**: if a `Button` sits on the field's GameObject no focusable is created and navigation stays with the Button. `Activate()` returns silently when the component is not active and enabled.
11. **Any other control defocuses the field** and drops the keyboard unless it is under a `FocusGuard`. A drag that starts on a field never focuses it.
12. **Android numeric keyboards**: only `NumberPad`, `DecimalPad` (signed) and `PhonePad` are numeric; `NumbersAndPunctuation`, `ASCIICapable`, `WebSearch` become a plain text keyboard.
13. **`InputMaskBehavior`**: BMP only, `#`/`A`/`*` accept non-ASCII digits and letters, whole-field rewrite each edit, programmatic text unformatted, a pattern that starts with literal digits swallows typed digits.
14. **Length units**: default Graphemes; a server `varchar(16)` or byte limit needs `Utf16Units`/`Utf8Bytes`. Limit and counter measure the document source (markup characters count). `editable.LengthLimit` is read-only state; writing it changes nothing.
15. **Password**: `Revealed` is runtime-only and render-only; `AllowCopy=false` blocks Cut/Copy; `Submitted` hands the real text; masked fields paste plain text only.
16. **Transparent keyboard mode covers the field**: add `KeyboardAvoidanceBehavior` (non-layout target) or `NativeFieldOverlayBehavior`. A user-dismissed keyboard leaves the editor active until tapped again. No public HideKeyboard: use `Defocus()`.
17. **Undo/redo**: `SetText` and `SetTextProgrammatic(recordUndo:false, preserveHistory:false)` clear history; `ReadOnly` disables undo/redo; `Undo()/Redo()` are not wired to buttons (call them or use `UndoCommand`/`RedoCommand`/`TextCommandButton`).
18. **Per-key allocations**: `Text`, `VisibleText`, `SelectedText` build strings each call; use `CharCount`, `TextEquals`, `CopyTextTo`. `DocumentContains` is O(document) per call, so a per-character custom filter on long multi-line text is O(n^2).
19. **Long text**: above `virtualizationThreshold` only the visible window is materialised, but rich-text import and attributed undo snapshots still process everything: use plain fields, a length limit, and `UniTextDocumentView` for big editable documents.
20. **Layout**: placeholder, hint and counter are separate `UniText` objects; the placeholder must stay active and non-raycast; fit the **root** with `ContentSizeFitter`; never aim `KeyboardAvoidance` at a layout child.
21. **Desktop/WebGL key polling**: `ManagedInputBackend` drains Unity key events and WebGL gives none while editing: use `Submitted/Cancelled/Defocused`, not `Input.GetKey`/`Keyboard.current`.

## Unverified
- Public accessibility of `editable.Behaviors` / `BehaviorPresets` from game assemblies (generated accessors, used by editor-side migrator code): compile-check `field.Behaviors.Add(...)` before relying on it at runtime.
- Whether the analyzer rejects a custom `InputBehavior` subclass with serialized fields that is not `partial` + `[StatePassive]`.
- Whether `CanvasGroup.interactable = false` or `Selectable.interactable = false` blocks a UniText field (no `interactable` member exists).
- Whether Android `KeyboardArea` accounts for edge-to-edge insets; no editing code reads `Screen.safeArea`.
- Whether calling `Activate()` in the same frame a screen is enabled works before the first layout.
- Whether a backslash escape consumed in typed text re-emits as `\x` in `Text` in a running field (read from source only).
