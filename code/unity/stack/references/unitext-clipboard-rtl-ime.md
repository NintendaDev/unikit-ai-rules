# UniText — Clipboard, RTL/BiDi, Native Input, IME, Accessibility

> **Base path:** `<UniTextRoot>` is the folder of the UniText package — the one whose `package.json` has `"name": "media.lightside.unitext"` (find it with `Glob **/media.lightside.unitext/package.json`; it may sit under `Packages/` or `Library/PackageCache/`). Never hard-code its location.
> See also: [unitext-input-fields.md](unitext-input-fields.md), [unitext-selection-context-menu.md](unitext-selection-context-menu.md), [unitext-markup-system.md](unitext-markup-system.md), [unitext-fonts.md](unitext-fonts.md), [unitext-inline-media.md](unitext-inline-media.md), [unitext-emoji.md](unitext-emoji.md), [unitext-layout-documents.md](unitext-layout-documents.md), [unitext-performance-mobile.md](unitext-performance-mobile.md), [unitext-version-traps.md](unitext-version-traps.md)

---

Everything is in namespace `LightSide` (`using LightSide;`). Mobile verdicts (`OK` / `LIMIT` / `AVOID`) come from reading source and docs; nothing was profiled. Field setup (behaviors, events, keyboard config) lives in [unitext-input-fields.md](unitext-input-fields.md).

## Lookup: need -> answer

| I need... | Answer |
|---|---|
| Copy a string to the OS clipboard (copy-ID button) | `UniTextClipboard.SetText(s)` (R3) |
| Read the clipboard without the iOS 16+ paste prompt | `UniTextPasteControl` on a Button, not `UniTextClipboard.GetText()` / `field.Paste()` (R3) |
| Make a field accept only plain text on paste | `field.RichPaste = false` (+ `PlainTextPaste = Literal`); masked/password fields already do |
| Paste without formatting on demand | `field.PastePlain()` / Ctrl+Shift+V / `PastePlainCommand` |
| Let a custom modifier survive copy/paste to other apps | `ClipboardModifierBindMap.Register<T>(schema)` + a `Style` on the destination (R2) |
| UniText-to-UniText formatted copy | works with no registration (signature-keyed JSON) |
| Handle pasted/dropped images or files | subclass `MediaInputBehavior` (R4) |
| Register my own clipboard format adapter | not exposed (section 7) |
| Arabic/Hebrew text | nothing to switch on; check the font stack covers the script (section 8) |
| Force right-to-left regardless of content | `text.SetWholeText<DirectionModifier>("RightToLeft")` (R5) |
| Mixed Arabic + Latin + numbers | automatic; force direction with `DirectionModifier` only when leading neutrals pick the wrong direction |
| Show Eastern-Arabic digits | convert the digits in the string yourself (section 8) |
| Soft keyboard visibility / height | `UniTextNativeInput.KeyboardVisibilityChanged`, `KeyboardArea` (section 9) |
| IME composition behaviour | section 9.3 |
| Screen-reader / accessibility tree | `SemanticModifier` + `UniTextSemantics`; no native bridge ships (section 10, R6) |

## 1. Clipboard formats and priorities

Four built-in adapters (the set is fixed per field). On paste, adapters are tried in descending priority; the first whose format is present **and deserialises** wins.

| Adapter | Format id | Priority | Content | Mobile |
|---|---|---|---|---|
| `UniTextSourceClipboardAdapter` | `application/vnd.lightside.unitext` (`ClipboardFormat.UniTextSource`) | 100 | JSON `{ text, spans[{offset,length,signature,parameter,selfClosing}] }` via `JsonUtility`; compiled only under `UNITEXT_HAS_JSONSERIALIZE`. No `ClipboardModifierBindMap` registration needed. | OK |
| `TagHtmlClipboardAdapter` | `text/html` | 50 | maps elements through `ClipboardModifierBindMap`; unmapped elements are stripped (inner text kept); whitespace collapsed outside `<pre>`; nesting limited by `SourceMarkup.MaxDepth`. | OK |
| `MarkdownClipboardAdapter` | `text/markdown` | 40 | inline emphasis `**`/`__`, `*`/`_`, `~~`, links `[t](url)`. Code, headings, lists, blockquotes are **not** supported. | OK |
| `PlainTextClipboardAdapter` | `text/plain` | 0 | the floor, always present. | OK |

`IClipboardAdapter { ClipboardFormat Format; int Priority; string SerializeCopy(ClipboardCopyContext); ClipboardPasteContent DeserializePaste(string, ClipboardPasteContext) }`. `ClipboardCopyContext` carries `TextComponent`, `Editable` (null for read-only selectable copy), `SelectedSource`, `SelectedPlainText`, `SelectionStart/Length`, `VisibleText`, `Spans`. `ClipboardSpan(offset, length, BaseModifier, ParseRule, parameter, isAtomic, sourceToken)` has `Signature`.

## 2. Copy and paste behaviour

**Copy / Cut**
- Do nothing for a collapsed selection or when copy is blocked (`PasswordBehavior` without `AllowCopy`).
- Selection **without hidden markup** (no style annotations): plain text only, via `UniTextClipboard.SetText`.
- Selection that covers hidden markup: **one atomic multi-format write** of UniText-source JSON + HTML + Markdown + plain.
- A selection whose markup is *visible* (`MarkupVisibility.Raw`, or a range revealed under `RevealActiveRange`) copies plain text only: what is on screen is what pastes.
- `UniTextClipboard.SetText("")` clears the clipboard on macOS/iOS/Android (Android < 9 writes an empty clip).

**Paste** (`field.Paste()`)
1. No-op when `ReadOnly`; `RichPaste == false` -> `PastePlain()`.
2. `MediaReceived` is offered first (`MediaContent.Handled` consumes).
3. A masked field (password) -> `PastePlain()`.
4. Otherwise the adapter walk above. Plain text is inserted per `PlainTextPaste` (`Auto` = literal unless `MarkupVisibility.Raw`).
5. Pasted text passes the `InputFilter` chain (length limit, mask, filters; reason `input.paste`).
- `PasteAsync()` / `PastePlainAsync()` use `IAsyncClipboardProvider.GetItemsAsync` (needed for WebGL user activation; other platforms degrade to sync). `PasteFromItems(IReadOnlyList<ClipboardItem>)` bypasses the provider (used by the iOS paste control and drops) to avoid a second pasteboard read that would raise the iOS permission prompt.

**Gate: a format transfers only for formatting the field has a style for** (a `Style` whose modifier type matches and whose rule can wrap). A field with no bold style receives pasted `<b>` text as plain text. A custom modifier therefore needs (1) a `Style` on the component or preset and (2) `Register<T>` only for HTML/Markdown interop.

## 3. Security

- **The UniText-source payload is treated as hostile input.** On paste: span geometry is validated, scalar boundaries enforced, parameters sanitised, and spans are dropped when the destination has no style with that modifier **signature**.
- Masked (password) fields and fields with `RichPaste = false` paste **plain text only**. Set `RichPaste = false` (and `TypingMarkup = Literal`) on every field that takes untrusted input: names, chat, search, passwords.
- Clipboard-delivered HTML/Markdown can only produce formatting the field already has styles for; unknown formatting is stripped.
- Android custom/vendor MIME payloads round-trip only inside the same app (in-process cache), so a rich copy from your app pastes rich into your app and plain elsewhere.

## 4. `ClipboardModifierBindMap` and schemas

`ClipboardModifierBindMap` (static): `Register<T>(ModifierClipboardSchema)` where `T : BaseModifier` — once per type, main thread, repeats are no-ops; a schema with neither `CanonicalTagName` nor `MatchesSourceTagName` is rejected with a warning (factory helpers set it). Also `GetSchema(BaseModifier|Type)`, `Entries`, `EnsureInitialized()`. There is no assembly scan (IL2CPP-safe).

These schemas are HTML/Markdown mappings, **not UniText tags**: a field still needs a `Style` for the modifier before it formats anything (see the master rule `unitext.md` section "Tag vocabulary bootstrap" and [unitext-markup-system.md](unitext-markup-system.md)).

| Pre-registered modifier | HTML | Markdown |
|---|---|---|
| Bold | `b`, `strong`, `span` | `**` / `__` |
| Italic | `i`, `em` | `*` / `_` |
| Underline | `u`, `ins` | — |
| Strikethrough | `s`, `del`, `strike` | `~~` |
| Color / Alpha / Size / Font | CSS `color` / `opacity` / `font-size` / `font-family` | — |
| Link | `<a href>` | `[t](url)` |
| Language | `<span lang>` | — |
| LineHeight, LetterSpacing, SmallCaps, FontFeature, Lowercase/Uppercase (`text-transform`) | CSS | — |
| ScriptPosition | `sup` / `sub` (via `{tagName}`) | — |

An unregistered modifier copies as plain text in the HTML/Markdown channels and its formatting is stripped from HTML/Markdown pastes (UniText-source still carries it).

Schema factories (`ModifierClipboardSchema`): `HtmlInline(params elements)`, `InlineFormat(markdownMarker, params elements)`, `InlineFormatStyled(...)`, `InlineStyle(cssProperty, params extraElements)` / `InlineStyle(cssProperty, CssValueFormat, params ...)`, `InlineStyleValue(cssProp, cssValue, params ...)`, `InlineMatchingElements(params ...)`, `InlineWithAttribute(element, attribute, canonicalTagName=null, markdown=null)`, `MarkdownDelimited(marker, canonicalTagName=null)`, `DoHtml(open, close, params ...)`, plus a constructor `(html, markdown, canonicalTagName, matchesSourceTagName)`. `CssValueFormat`: `Verbatim, Length, LineHeight, Color, Opacity`. HTML templates may contain `{value}` (the parameter) and `{tagName}`. `CanonicalTagName` is only checked as non-empty at registration; matching is by modifier type/signature.

## 5. Platform clipboard API

`UniTextClipboard` (static, real OS clipboard, bypasses `GUIUtility.systemCopyBuffer`): `GetText()`, `SetText(string)` (empty clears), `HasText()` and `HasContent()` (availability probes without transfer), `Task<string> GetTextAsync()` / `GetTextAsync(ClipboardFormat)`, `IClipboardProvider Provider {get;set}` (set `null` = platform default; assign a mock in tests).

Provider interfaces: `IClipboardProvider` (`HasContent`, `HasFormat`, `GetText(fmt)`, `TryGetText`, `GetData`, `SetItems(IReadOnlyList<ClipboardItem>)` atomic multi-format write), `IAsyncClipboardProvider` (`GetTextAsync`, `HasFormatAsync`, `GetItemsAsync(formats)`), `IMediaClipboardProvider` (`HasFiles`, `GetFiles`, `ReadFile`, `ReadFileAsync`, `GetAvailableFormats`). `ClipboardFormat` (equality by `Identifier`): `PlainText`, `Html`, `Url`, `Markdown`, `UniTextSource`, `Png`, `Jpeg`, `Gif`, `Custom(string)`, `IsImage`, `TryDetectImage(span, out format)`. `ClipboardItem(ClipboardFormat, byte[] | string)`.

| Platform | Behaviour | Mobile |
|---|---|---|
| Windows | CF_UNICODETEXT, CF_HTML, registered formats, CF_HDROP, PNG + DIBV5 | n/a |
| macOS / iOS | UTI pasteboard, one atomic write; **iOS 16+ shows a system paste notice on programmatic reads outside a user action** | LIMIT: use `UniTextPasteControl` |
| Android | plain + HTML in one `ClipData`; custom MIME only via an in-process cache; images via FileProvider; Android 12+ shows a paste notice on reads | OK for writes; reads may notify |
| WebGL | async Clipboard API; sync reads come from the paste-event capture cache; programmatic paste must be async and inside a user activation; custom formats via Chromium web-prefix, invisible to Firefox/Safari | LIMIT: always `PasteAsync`/`GetTextAsync` |
| Linux | `xclip` / `wl-clipboard` subprocesses; sync reads spawn a blocking process; writes offer one format | AVOID sync reads: use async |
| Other | `systemCopyBuffer`, plain text only | — |

## 6. `UniTextPasteControl`

MonoBehaviour for a paste button (`Add Component → LightSide → UniText → UniTextPasteControl`). Members: `Target` (`UniTextEditable`; empty = searched in parents), `FallbackButton` (empty = own/child `Button`), `DisplayMode` (`IconAndLabel`, `IconOnly`, `LabelOnly`), `CornerStyle` (`Capsule`, `Dynamic`, `Fixed`, `Small`), `TriggerPaste()`, `event Action Pasted`.
- **iOS 16+**: a native `UIPasteControl` overlays the component's `RectTransform`; a tap pastes with no permission prompt (through `PasteFromItems`). Calling `TriggerPaste()` programmatically outside a user action shows the system prompt.
- Elsewhere the button drives `Target.Paste()`. `Pasted` fires on both paths.
- Context-menu paste/copy use the commands (`PasteCommand`, `PastePlainCommand`, `CopyCommand`, `TextCommandButton`) — see [unitext-selection-context-menu.md](unitext-selection-context-menu.md).

## 7. Media paste and what is not exposed

- `MediaContent` (struct): `Editable`, `Source` (`MediaSource.Paste`, `Drop`, `Pick`), sticky `Handled`, `HasFiles`, `Has(ClipboardFormat)`, `GetData(fmt)`, `GetFiles()`, `ReadFile(path)`, `ReadFileAsync(path)`. Delivered through the editable's `MediaReceived` hook **before** the text pipeline; unhandled media falls through to the text channels.
- `MediaInputBehavior` overrides: `bool OnMedia(MediaContent)`, `bool OnFiles(string[])`, `bool OnImage(byte[], ClipboardFormat)`; helpers `ReadFile`, `ReadFileAsync`; return `true` = consumed. Mobile verdict LIMIT: reading files or images can show OS prompts on iOS/Android/web; use `ReadFileAsync` for big files.
- **Not exposed**: a public way to register a custom `IClipboardAdapter` (the built-in set is fixed); per-field choice of adapters; a configurable priority. For non-text payloads use `MediaInputBehavior`.

## 8. RTL / BiDi

**Automatic**
- Unicode Bidirectional Algorithm (UAX #9) per paragraph (Arabic, Hebrew, Syriac, Thaana, nested embeddings, mirrored brackets, neutral runs); HarfBuzz shaping with cursive joining.
- `TextDirection.Auto` is the default (paragraph direction from the first strong character).
- BiDi-aware caret, selection and hit-test with `CaretAffinity` (`Downstream`/`Upstream`) disambiguating soft-wrap and LTR/RTL run boundaries; arrows, Home/End, selection and IME work on RTL lines.
- `HorizontalAlignment.Start` (default) is **logical**: left in an LTR paragraph, right in an RTL one; `End` is the opposite. `Left`/`Right` are physical and defeat RTL; `Center`, `Justify` as usual.
- Positive `LetterSpacingModifier` renders tatweel on cursive scripts instead of breaking joins.

**What the developer still does**
| Task | How |
|---|---|
| Fonts for the script | The default font stack (`UniTextFonts_Default` under `<UniTextRoot>/Defaults`) is NotoSans + NotoSansArabic + NotoSansHebrew. A custom stack must keep an Arabic/Hebrew-capable family, or leave the stack empty for system-font fallback (**WebGL has no OS fonts**). Per-run fallback picks the first family covering a codepoint. See [unitext-fonts.md](unitext-fonts.md). |
| Force a base direction | `DirectionModifier { Direction }` (`LeftToRight`, `RightToLeft`, `Auto`) is **whole-text only**: its value is the base direction of every paragraph. Apply with `SetWholeText<DirectionModifier>("RightToLeft")`, or `Style.WholeText(new DirectionModifier { Direction = TextDirection.RightToLeft })` in `Styles`. Revert with `ClearWholeText<DirectionModifier>()`. For an editable field set it on `field.TextComponent`. |
| Alignment | Keep `Start`/`End`; never hard-code `Left`/`Right` in localised UI. |
| Digits | No numeral shaping or substitution exists: digit forms render as typed. For Eastern-Arabic digits (٠١٢٣…) convert the string yourself. |
| Mixed strings | Embed numbers and Latin names in RTL text as-is; brackets mirror automatically. When leading neutrals pick the wrong direction, force direction with the modifier. |
| Language forms | `<lang=...>` / `Language` (BCP 47) selects `locl` glyph forms. |

Per-paragraph mixed direction (Arabic paragraph followed by an English one) needs `Auto`; a whole-text modifier forces one direction for all paragraphs.

## 9. Native input and IME

### 9.1 Facade
`UniTextNativeInput` (static): `IsKeyboardVisible`, `KeyboardArea` (Unity screen px, Y up, zero when hidden), `event KeyboardVisibilityChanged(bool)`, `event KeyboardChanged(KeyboardEvent)`, `SetInputFieldRect(Rect)`, `SetCursorScreenPos(Vector2, float lineHeight)` (IME candidate anchor), `SetImeCaretScreenRect(RectInt)`, `GetWindowClientSize()`, `RegisterBackend(Func<INativeInputBackend> factory, int priority = 0)`.
- **There is no public Show/HideKeyboard**: show = `editable.Activate(true)`, hide = `editable.Defocus()` / `Deactivate()`.
- On Android 11+ `KeyboardVisibilityChanged(true)` fires when the keyboard is fully up; `KeyboardChanged`/`KeyboardArea` follow from the animation start.
- Backends registered at priority 0: Windows (TSF plugin), macOS, iOS, Android (`UniTextInput.aar` + native libs, hidden `_UniTextNativeInput` object), WebGL. Linux, UWP, tvOS and visionOS use `ManagedInputBackend`, which drains Unity key events with `PopEvent` (other key consumers stop seeing keys while a field is focused).
- Advanced seam `INativeInputBackend` (`OpenInput`, `QuiesceInput`, `CloseInput`, `AbortInput`, `SetCursorScreenPos`, `SetInputFieldRect`, `FlushPendingInput`, `PushTextContext`): a backend whose `OpenInput` throws must clean itself up, UniText does not call `AbortInput`. Text offsets in `ITextInputContext` are UTF-16; `WritingDirection(int)`: 0 natural, 1 LTR, 2 RTL.
- Soft-keyboard modes, keyboard types, return key and Android fallbacks: [unitext-input-fields.md](unitext-input-fields.md) section 7.

### 9.2 What the platform layer provides
Input comes from OS text services, independent of Unity's input system (Legacy, New or Both). Android mirrors up to 1024 UTF-16 units of the document (else a ~512-unit window around the selection) to the IME so Gboard suggestions work. `NativeFieldOverlayBehavior` makes the OS text view the visible field, which is also the only accessibility surface for fields today.

### 9.3 IME composition
- `CompositionData` (ref struct): `text`, `clauses`, `cursorPosition` (-1 hidden). `CompositionClause { startOffset, endOffset, style }`, `CompositionClauseStyle`: `Unconverted`, `TargetConverted`, `Converted`, `TargetNotConverted`, `Error`.
- Composition is shown **inline** at the insertion point. `TextChanged` and `VisibleText` include it; `Text`, `CharCount`, `CopyTextTo`, `TextEquals`, `ValueChanged`, `DocumentChanged` cover **committed text only**. `IsComposing` / `CompositionStateChanged(bool)` expose the state.
- Commit goes through the filter chain as `input.type.compose`: a length limit or mask is enforced at commit, never mid-composition. Committing unchanged text makes no edit and raises no event.
- Pointer gestures, deselect, app pause and focus loss commit the composition first. An input method that marks existing text (some Android keyboards) changes nothing until the composition differs.
- Do not promise composition underline visuals: the managed code stores `clauses` but styling of clauses is not confirmed (see Unverified).

## 10. Accessibility

- `UniTextSemantics` (sealed, `IDisposable`): static `For(UniTextBase)` (creates), static `TryGet(UniTextBase, out UniTextSemantics)`; `Nodes` (codepoint order), `FocusedIdentity`, `TryGet(RangeIdentity, out TextSemanticNode)`, `PerformAction(RangeIdentity, TextSemanticActions)`; events `Changed(TextSemanticChange{Kind: Added|Updated|Removed, Node})`, `Committed` (after a layout commit), `ActionRequested` (`TextSemanticActionRequest` with `Handle()` / `PreventDefault()`; Activate and Context run normal interaction routing unless `PreventDefault`).
- `SemanticModifier` is the only producer, applied through a `Style` like any modifier: `Label` (empty -> derived from covered text when `DeriveLabelFromText`), `Value`, `Hint`, `Language`, `Role` (`Text, Link, Button, Mention, Tag, Code, Math, Heading, Image, Comment, Error, Status`), `States` (flags `Disabled, Selected, Focused, Expanded, Checked, Busy, Invalid, Concealed, Visited, ReadOnly`), `Actions` (flags `Activate, Context, Expand, Collapse, Copy, Increment, Decrement`), `Priority`, `DeriveLabelFromText`, `Channel`. `TextSemanticNode`: `Identity, Channel, Payload, Segments, Role, Label, Value, Hint, Language, States, Actions, Bounds` (component-local), `Revision`.
- **Nothing enters the tree by itself.** Only ranges covered by a `SemanticModifier` appear, and `UniTextEditable` does not publish to it. **No native bridge ships**: a TalkBack/VoiceOver adapter is code you write over this tree (or test automation).
- Other switches: `Accessibility.PrefersReducedMotion {get;set}` + `PrefersReducedMotionChanged` (core package; read by `FloatingLabelDecorator` and animation) and `InputCaretRenderer.PrefersNonBlinkingCaret`. **The package's managed code never sets either from the OS**: your integration layer must.
- `NativeFieldOverlayBehavior.Identifier` exposes a stable id to platform tooling (Android tag, iOS accessibility id, DOM id); a native replica is a real OS text view.

## 11. Recipes

### R1. Plain-only field that ignores clipboard formatting
```csharp
field.RichPaste      = false;                              // paste always plain
field.PlainTextPaste = PlainTextPastePolicy.Literal;       // pasted text is never parsed as markup
field.TypingMarkup   = TypingMarkupPolicy.Literal;         // typed tags stay literal
```
Set in `Awake/OnEnable` (not serialized). Read the value from `VisibleText`. Result: pasting "<b>x</b>" or HTML from a browser yields the literal/plain text. Gotcha: `PasswordBehavior` already pastes plain, but the other two lines still matter when styles exist.

### R2. Custom modifier that survives copy/paste
```csharp
static class MyClipboardSetup
{
    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.BeforeSceneLoad)]
    static void Register()                               // once, main thread
    {
        ClipboardModifierBindMap.Register<MyHighlightModifier>(
            ModifierClipboardSchema.InlineStyle("background-color", CssValueFormat.Color));  // HTML <span style="background-color:{value}">
        // parameterless variants:
        //   ModifierClipboardSchema.InlineFormat("==", "mark")   (HTML <mark> + Markdown ==..==)
        //   ModifierClipboardSchema.HtmlInline("mark")           (HTML only)
    }
}
```
Setup: the destination field must also have a `Style` for `MyHighlightModifier` (paste gate). UniText-to-UniText copy needs no registration. Gotcha: the call combination is composed from verified signatures but not compiled here.

### R3. Copy button, read clipboard, native paste button
```csharp
UniTextClipboard.SetText(playerId);        // plain text through the OS clipboard; empty string clears
bool any = UniTextClipboard.HasText();     // probe, no transfer
string s = UniTextClipboard.GetText();     // may show the iOS 16+ / Android 12+ paste notice
var s2 = await UniTextClipboard.GetTextAsync();   // WebGL needs a user-activation context
```
Paste button for a field: put `UniTextPasteControl` on a Button object (Target found in parents or assigned). On iOS 16+ the native control pastes without a prompt; elsewhere the Button calls `Target.Paste`. Gotcha: your own button calling `field.Paste()` works but prompts on iOS 16+.

### R4. Pasted/dropped images or files (chat attachments)
```csharp
[Serializable]
public sealed partial class AttachImages : MediaInputBehavior
{
    protected override bool OnImage(byte[] data, ClipboardFormat fmt) { Queue(data); return true; }   // true = consumed
    protected override bool OnFiles(string[] paths)
    {
        foreach (var p in paths) Queue(ReadFile(p));
        return paths.Length > 0;
    }
}
```
Add it to the field's behaviors. `MediaContent.Source` tells paste, drop and pick apart; use `ReadFileAsync` for big files. Gotcha: reads may show OS prompts on iOS/Android/web.

### R5. RTL/Arabic/Hebrew UI
- Do nothing for content: leave direction `Auto`, alignment `Start`, default font stack.
- Force an RTL screen regardless of content (e.g. Arabic UI full of Latin names and numbers):
```csharp
label.SetWholeText<DirectionModifier>("RightToLeft");   // "LeftToRight", "Auto"
label.ClearWholeText<DirectionModifier>();              // revert
```
- Eastern-Arabic digits: convert before assigning, e.g. map `'0'..'9'` to `'٠'..'٩'` yourself.
- Custom font stack: add an Arabic/Hebrew-capable font, or the glyphs fall back to system fonts (none on WebGL).

### R6. Accessibility tree and flags
```csharp
text.Styles.Add(Style.Tag(new SemanticModifier { Role = TextSemanticRole.Button, Label = "Buy",
                                                  Actions = TextSemanticActions.Activate }, "buy"));   // the "buy" tag exists because this line adds it
var tree = UniTextSemantics.For(text);                  // TryGet(text, out tree) does not create
tree.Changed         += c => { /* c.Kind Added|Updated|Removed; c.Node.Label/Role/States/Bounds */ };
tree.ActionRequested += req => { if (req.Action == TextSemanticActions.Activate) { req.Handle(); req.PreventDefault(); } };
tree.PerformAction(tree.Nodes[0].Identity, TextSemanticActions.Activate);

Accessibility.PrefersReducedMotion = platformSaysReduceMotion;    // set from OS settings yourself
InputCaretRenderer.PrefersNonBlinkingCaret = platformSaysNoBlink;
```
Setup: a `Style` carrying the `SemanticModifier`. Result: only the covered range appears in `tree.Nodes`. Gotcha: this is a model for your own adapter; nothing talks to TalkBack/VoiceOver on its own, and the code is composed from the API page (not compiled).

## 12. Pitfalls

1. **UniText-source JSON is hostile input.** It is validated and signature-gated, yet always set `RichPaste=false` on untrusted fields; never rely on the gate as the only defence.
2. **Rich paste keeps only formats the field has styles for.** A field without a bold `Style` shows pasted bold as plain; a modifier missing from `ClipboardModifierBindMap` is stripped from HTML/Markdown pastes.
3. **No custom adapter registration.** Do not plan a proprietary clipboard format around `IClipboardAdapter`; use `MediaInputBehavior` for non-text payloads.
4. **Programmatic reads prompt.** iOS 16+ and Android 12+ show a paste notice for `field.Paste()` / `UniTextClipboard.GetText()` outside a user gesture; use `UniTextPasteControl`. WebGL needs the async APIs inside a user activation; Linux sync reads block on a subprocess.
5. **Android custom MIME payloads stay in-process**: rich copy between two different apps degrades to plain + HTML.
6. **Copy of a field with visible markup is plain.** `Raw` and revealed ranges copy as on screen.
7. **Whole-text direction only.** `DirectionModifier` cannot give two paragraphs two directions; `Auto` does that.
8. **`Left`/`Right` alignment defeats RTL**; use `Start`/`End`.
9. **Digits are not auto-converted** between ASCII and Eastern-Arabic forms.
10. **WebGL has no OS font fallback**: assign a font stack covering the target scripts.
11. **IME composition is not in `Text`/`ValueChanged`**; limits and masks apply at commit.
12. **`ManagedInputBackend` platforms and WebGL**: Unity key events are drained or absent while a field is focused; use field events, not `Input.GetKey`.
13. **No accessibility bridge, no automatic reduced-motion flags**: set `Accessibility.PrefersReducedMotion` and `PrefersNonBlinkingCaret` from the OS yourself; editable fields publish nothing to `UniTextSemantics`.
14. **No public Show/HideKeyboard**: use `Activate` / `Defocus`.

## Unverified
- A public way to register a custom `IClipboardAdapter` (docs say the built-in set is fixed; the API text mentions priorities above 100 for custom adapters but no registration member was found).
- Whether any managed code renders IME clause styling (underline, squiggle); the clauses are stored in the composition overlay, and the OS may draw them on desktop or in the native replica.
- Whether Unicode bidi control characters (U+200E/U+200F) are honoured as direction marks in plain text; only skipping them in math is documented.
- The `<dir>` tag name for `DirectionModifier` appears only in the package documentation's tag table, not in any shipped preset; use `SetWholeText<DirectionModifier>` / `Style.WholeText(...)` instead.
- Who, if anyone, sets `Accessibility.PrefersReducedMotion` / `PrefersNonBlinkingCaret` from the OS on the native plugin side (the managed code does not).
