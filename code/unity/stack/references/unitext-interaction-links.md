# UniText — Interaction: links, spoilers, tappable ranges, gestures, viewports

> **Base path:** `<UniTextRoot>` is the folder of the UniText package — the one whose `package.json` has `"name": "media.lightside.unitext"` (find it with `Glob **/media.lightside.unitext/package.json`; it may sit under `Packages/` or `Library/PackageCache/`). Never hard-code its location. `<LightSideCoreRoot>` is the folder of `media.lightside.core` (same lookup by `package.json` name); it holds the pointer plumbing (`WorldPointerRaycaster`, routing profiles, `LightSideInputModule`).
> See also: [unitext-markup-system.md](unitext-markup-system.md), [unitext-range-state-rules.md](unitext-range-state-rules.md), [unitext-selection-context-menu.md](unitext-selection-context-menu.md), [unitext-3d-text.md](unitext-3d-text.md), [unitext-components-setup.md](unitext-components-setup.md), [unitext-runtime-api.md](unitext-runtime-api.md), [unitext-effects-paint.md](unitext-effects-paint.md), [unitext-inline-media.md](unitext-inline-media.md), [unitext-layout-documents.md](unitext-layout-documents.md), [unitext-performance-mobile.md](unitext-performance-mobile.md), [unitext-version-traps.md](unitext-version-traps.md)

---

Everything is in namespace `LightSide`. Mobile verdicts (`OK` / `LIMIT` / `AVOID`) come from reading the package source and docs; nothing was profiled and no measured figures are quoted.

## 1. Lookup — "I want to ..." → recipe

| I want to | Do this | Recipe |
|---|---|---|
| A tappable keyword/item name inside markup, with a callback and the value in C# | Define your own tag: `Style.Tag(new InteractiveModifier(), "item")`, subscribe `modifier.Events.Activated`, read `i.Range.PrimaryValue` | R3 |
| A link to a web page (`<link>`, `[t](url)`, bare URL) | Register a `LinkModifier` style (picker preset or `Style.Tag`/`Style.FromSource`); optional `LinkClicked(string)` handler | R1, R2 |
| An in-app command link (`quest:42`, `item:sword`) | Same as web link but set `LinkModifier.AutoOpenUrl = false` (or `PreventDefault()`), handle `LinkClicked` | R10 |
| Hover highlight / press glow on a term | `RangeStateRule` + `ParameterChange` in the same modifier graph (the shipped `LinkPreset` already does it for links) | R6, R7 |
| Long press on a range (item tooltip, share menu) | `Events.ContextRequested` (touch/pen hold 0.5 s, right click), `Events.LongPressProgress` for a hold ring | R9 |
| Spoiler (tap to reveal) | `<spoiler>` via `SpoilerPreset` graph; `SpoilerModifier.RevealChanged`, `SetRevealed`, `ConcealAll` | R8 |
| Clicks on world-space text | `WorldPointerRaycaster` on the rendering camera + `UniTextWorld.RaycastTarget = true` | R13 |
| Interactive text inside a `ScrollRect` / world text that must pan a camera | `ScrollRectRangeViewport` / `CameraRangeViewport` | R14 |
| Localization: scene stores a key, text comes from your tables | `IUniTextResolver` assigned to `UniTextBase.TextResolver` | R15, section 9 |
| Make plain-text words tappable with no markup (localized strings without tags) | `MutableRangeSource` + `FindAll` + `AddOpaque` | R5 |
| Bigger finger-sized tap targets | `MinimumHitSize` / `HitPadding` / `WrappedGapPolicy` on the modifier | R12 |
| Place a tooltip next to a tapped range | `i.AnchorRect` (text-local) or `i.ScreenPosition` | R19 |
| Decide which of several overlapping ranges gets the tap | `InteractionPriority` | R11 |
| Keyboard / gamepad navigation across links | `UniTextInteractions.MoveFocus / ActivateFocused` | R16 |
| "Did the tap land on interactive text?" before forwarding it | `HitTestRange(..., 0f)` + `modifier.TryGetRange` | R17 |
| A custom swipe/drag on a range | `GetGestureRecognizers()` returning a `DragRangeGestureRecognizer` | R18 |
| Veto or replace the built-in action (URL open, spoiler toggle) | `PreventDefault()` / `AutoOpenUrl = false` | R10 |
| One handler for many texts | `RangeChannel` asset + `UniTextInteractions.For(text).Get(channel)` | R4 |

Selection, copy and the context menu are a different component: see [unitext-selection-context-menu.md](unitext-selection-context-menu.md).

## 2. Read this first

- **Nothing is wired by default.** A range reacts to taps only when a `Style` pairs a range source (`TagRule`, `MarkdownLinkParseRule`, `RawUrlParseRule`, `TriggerWordParseRule`, `MutableRangeSource`) with an `InteractiveModifierBase` subclass (`LinkModifier`, `SpoilerModifier`, `InteractiveModifier`). A fresh `UniText` from a shipped prefab has no styles and the package ships `UniTextSettings` with no global style preset, so `<link=...>` shows as literal text until you register the style. Bootstrap: the master rule's section "Tag vocabulary bootstrap" and [unitext-markup-system.md](unitext-markup-system.md).
- **`<interactive=...>` is not a defined tag anywhere** (no preset, picker entry or sample uses it). The tag name of an interactive range is the developer's choice: `Style.Tag(new InteractiveModifier(), "item")` gives `<item=sword_iron>`.
- **Callback with a value:** `modifier.Events.Activated += i => use(i.Range.PrimaryValue)` works for every `InteractiveModifierBase` with no asset. `LinkModifier` also raises `LinkClicked(string url)`, `LinkEntered(string url)`, `LinkExited()`. Code-created ranges can carry an object: `i.Payload.Get<T>()`.
- **A bare `new LinkModifier()` has no visuals** (no colour, underline or hover feedback). **`AutoOpenUrl` defaults to `true`**, in code and in the shipped `LinkPreset`, so any link value (including `quest:42`) goes to `Application.OpenURL` unless you turn it off.
- **Input plumbing:** Canvas text needs an EventSystem, a `GraphicRaycaster` on the Canvas and `Raycast Target` on the text. World text needs `WorldPointerRaycaster` on the rendering camera and `RaycastTarget = true` (the shipped World Text prefab has it off). Touch has no hover.

## 3. Mental model

```
UniTextBase (UniText | UniTextWorld)
 └ Styles[]  : Style = { Source (RangeSource), Modifier (BaseModifier) }
      Source   emits ranges  (TagRule, MarkdownLinkParseRule, RawUrlParseRule, TriggerWordParseRule, MutableRangeSource)
      Modifier = InteractiveModifierBase subclass (directly, or inside a CompositeModifier / ModifierGraphModifier)
 └ UniTextInteractions   ONE router per text, created lazily: UniTextInteractions.For(text)
      builds hit fragments from final glyph geometry, hit-tests, arbitrates overlaps, tracks pointers,
      dispatches RangeInteraction events: Capture -> Target -> Bubble -> default action
 └ UniTextRanges         per-text rule runtime: plays RangeStateRule feedback from signals (hover/press/focus/revealed)
```

- An interactive modifier registers itself with the router when enabled; the router attaches to the host's pointer events only while at least one interactive modifier is registered. Hit fragments are rebuilt after every commit that changes glyph geometry.
- `UniTextBase` handles pointer down/up/enter/exit/move itself. A plain label forwards pointer down/up to its parent hierarchy and resolves the click on its own, so a `Button` parent still gets clicks and a `ScrollRect` parent still drags.

| Term | Meaning |
|---|---|
| `PrimaryValue` (`i.Range.PrimaryValue`) | opaque string: link URL, trigger word (without the trigger char), `<item=VALUE>` token, `AddOpaque` value; null for `<spoiler>` |
| `Payload` (`RangePayloadView`: `HasValue`, `Type`, `Get<T>()`, `TryGet<T>(out T)`) | any object attached from code (`MutableRangeUpdate.Add/AddOpaque(..., payload: obj)`); markup ranges have none. `Get<T>()` throws `InvalidCastException` when absent or incompatible |
| `Identity` (`RangeIdentity`) | stable runtime address (source id + `RangeId`); spoiler reveal state, focus and hover are keyed on it; an edit inside the range retires it |
| `RangeChannel` | empty `ScriptableObject` (`Assets → Create → LightSide → UniText → Range Channel`) used to group ranges from several modifiers/texts for `UniTextInteractions.Get(channel)` |
| `RangeInteraction` | the event context: a **borrowed, pooled** object reused between events. Copy what you need before the callback returns |

## 4. Registering interactive ranges

Tag names are authored data. Column "Registered by" says how the name reaches a component; none of these works on a fresh component until that step is done.

| Markup | Registered by | Value in C# | Mobile |
|---|---|---|---|
| `<link=URL>text</link>` | picker: Styles → + → Tags/Common → **Link** (a `TagRule("link")` with default parameter `;#4285F4` plus a copy of the shipped `LinkPreset` graph); code: `Style.Tag(modifier, "link")` | resolved `Url` slot | OK |
| `[text](url)` | picker: Markdown → **Link** (`MarkdownLinkParseRule { DefaultParameter = ";#4285F4" }`); code: `Style.FromSource(new MarkdownLinkParseRule(), modifier)` | whole URL string | OK |
| bare `https://x.y`, `http://`, `ftp(s)://`, `file://`, `mailto:`, `tel:`, `www.x` | picker: Markdown → **Link (Raw URL)**; code: `Style.FromSource(new RawUrlParseRule(), modifier)` | URL string; `www.` input becomes `https://www....` | LIMIT — auto-detect scans every character of every text carrying the style; attach it only to texts that can contain URLs (chat, logs), never to a global preset used by all HUD labels |
| `<spoiler>hidden</spoiler>` | picker: Tags/Interactive → **Spoiler** (copy of the shipped `SpoilerPreset` graph); code: `Style.Tag(new ModifierGraphModifier { Preset = spoilerPreset }, "spoiler")` | none | OK |
| `@name`, `#tag` (single trigger char) | picker: "Interactive" auto-detect entry; code: `Style.FromSource(new TriggerWordParseRule("@"), new InteractiveModifier())` | word without the trigger | LIMIT — auto-detect scan like Raw URL; scope to the texts that need mentions |
| `<item=sword_iron>text</item>` (your own tag) | code only: `Style.Tag(new InteractiveModifier(), "item")` — the name is yours | the token | OK |
| plain keywords, no markup | code only: `MutableRangeSource` + `UniTextBase.FindAll` + `AddOpaque` (R5) | `AddOpaque` value, optional payload | LIMIT — one `FindAll` pass per string change; fine for a few keywords per text |

Rules per form:
- **`<link>`:** slot 0 is the URL, then the shared hit slots (section 5). The URL is tokenized: `,` and `;` split slots and parentheses group, so keep commas and semicolons out of tag URLs. Tag names are ASCII case-insensitive; the value may be quoted (`<link="...">`, outer quotes are stripped before tokenizing). A range whose resolved URL is empty is dropped (no range at all).
- **`[text](url)`:** URL is trimmed; empty URL = no match; same line only; the default parameter is merged behind the URL, which is why `";#4285F4"` colours the text. This is the safest form for URLs containing commas.
- **Raw URL:** needs a non-word character before the scheme; stops at whitespace and `" ' < > backtick [ ]`; trailing `. , ; : ! ?` before whitespace or end are excluded; style-only (the text stays on screen, nothing is consumed); explicit markup claims a position first. Priority is -100 (auto-detect).
- **Trigger word:** word characters are Unicode letters/digits/`_` plus `ExtraWordChars`; the trigger must start a word and be followed by at least one word character, so `user@host` and `@@x` stay plain text. The text stays visible.
- **`<spoiler>`:** accepts only the shared hit slots (`<spoiler=5>` = priority).
- **Do not use `StringParseRule` for "make this word tappable"**: it replaces each match (by its `Replacement` or by nothing).

### The shipped Link graph

The `LinkPreset` is a `ModifierGraphPreset`: `Composite[ Composite[ LinkModifier, HighlightModifier(hover), HighlightModifier(pressed), HighlightModifier(activation flash) ], ColorModifier, UnderlineModifier ]`. The outer composite splits the tag value by `;`: segment 0 → URL (into `LinkModifier`), segment 1 → colour, segment 2 → underline, so `<link=https://a.b;#FF8800;solid>` recolours one link. Feedback rules on its `LinkModifier`: hover/pressed highlight fade-in 0.18 s / out 0.1 s, a stronger highlight while pressed, and a one-shot flash on activation. It sets `hoverCursor = Link`, `routingProfile = interactive`, `focusable = true`, `autoOpenUrl = true`. `SpoilerPreset` is `Composite[ SpoilerModifier (rule: concealed → cover Tint), HighlightModifier (opaque dark cover, drawn above the text) ]`; tap toggles. Originals live in `<UniTextRoot>/Defaults/ModifierGraphPresets/`. Editing a preset asset reaches every component that references it, live.

## 5. The modifiers

### 5.1 `InteractiveModifierBase` (abstract; base of Link, Spoiler, Interactive)

Tag slot order = the subclass's own parameters first (`Value` for `InteractiveModifier`, `Url` for `LinkModifier`, none for `SpoilerModifier`), then the shared `[Parameter]` slots in the order below. Fields marked "—" in the slot column are Inspector/C# only.

| Member | Type / default | Slot | Meaning |
|---|---|---|---|
| `Channel` | `RangeChannel`, null (inherits the source's channel) | — | routing group for `UniTextInteractions.Get(channel)` |
| `HoverCursor` | `CursorType` (LightSide.Core), `Link` | — | hardware cursor while mouse/pen hovers; `Default` = none. Naming the type needs an asmdef reference to `LightSide.Core` |
| `InteractionPriority` | int, 0 | 1 | overlap winner, higher first |
| `ActivationScope` | `RangeInteractionScope`, `Entity` | 2 | press origin must match release target by `Segment` / `Entity` / `Channel` |
| `HitPadding` | `UnitVector2`, (0,0) em | 3 | symmetric growth of hit geometry, independent of visual padding |
| `MinimumHitSize` | `UnitVector2`, (0,0) px | 4 | minimum width/height of **every** hit fragment (centred growth) — the mobile tap-target knob |
| `WrappedGapPolicy` | `Separate` / `JoinLineFragments` / `BoundingBlock`, `Separate` | 5 | how a range that wraps over several lines forms hit areas |
| `WhitespacePolicy` | `Layout` / `VisibleGlyphs`, `Layout` | 6 | whether spaces inside the range are hittable |
| `InlineObjectPolicy` | `Include` / `Exclude` / `Only`, `Include` | 7 | whether inline-object clusters (U+FFFC) take part |
| `RoutingProfile` | string id, `"interactive"` | 8 | pointer routing profile at the hit position (section 8.3); a token in this slot names a profile |
| `Focusable` | bool, true | 9 | include in keyboard/gamepad navigation |
| `Rules` | `RangeStateRule[]` (`Rules.Add/ReplaceAll`), empty | — | state-driven visuals |
| `NavigationOrder`, `NavigationGroup`, `WrapNavigation` | `Logical`/`Visual`, `Host`/`Channel`, false | — | arrow/gamepad navigation |
| `Events` | `RangeInteractionEvents`, created lazily | — | per-modifier events, also for ranges without a channel |
| `InteractiveRanges` | `ReadOnlySpan<InteractiveRange>` | — | ranges produced by the last apply cycle |
| `TryGetRange(int cluster, out InteractiveRange)` | virtual bool | — | first owned range containing a rendered cluster |
| `GetRangeState(in InteractiveRange)` | `RangeState` | — | aggregate state over all pointers |
| `IsRangeEnabled(in InteractiveRange)` | protected virtual bool | — | return false ⇒ range is `Disabled` (not hit-tested, no events): visited links, locked items |
| `HandleInteraction`, `HandleDefaultAction`, `HandleRangesRebuilt`, `GetGestureRecognizers()` | protected virtual | — | extension points for custom subclasses; custom ranges are produced by calling `AddRange(in RangeApplyContext, string primary)` from `OnApply` |

`UnitKind` values: `Absolute` (px), `Em` (times the current font size), `Percent`, `Delta`. Set `HitPadding`/`MinimumHitSize` in C# or the Inspector: `m.MinimumHitSize = new UnitVector2(new Vector2(0f, 48f), UnitKind.Absolute);`.

### 5.2 Concrete modifiers

| Type | Own members | Notes | Mobile |
|---|---|---|---|
| `InteractiveModifier` | `string Value` (slot 0; fallback when source/markup supply none) | the general tappable range; value arrives as `PrimaryValue ?? Value`; events come from `Events` | OK |
| `LinkModifier` | `string Url` (slot 0); `bool AutoOpenUrl` (default **true**, a plain field — no markup slot); events `LinkClicked(string)` (on Activated), `LinkEntered(string)`, `LinkExited()` | default action = `Application.OpenURL(PrimaryValue)` on Activated when `AutoOpenUrl` and the value is non-empty. No visuals when created in code | OK |
| `SpoilerModifier` | static `RangeSignal<bool> RevealedSignal`; `IsRevealed(in InteractiveRange)`, `SetRevealed(in InteractiveRange, bool)`, `ConcealAll()`, `event RevealChanged` = `delegate void (in InteractiveRangeHit hit, bool revealed)` | default action on Activated **toggles** reveal. State is keyed on `RangeIdentity` (survives a re-parse while the identity survives, pruned when the range disappears). `SetRevealed`/`IsRevealed` throw `ArgumentException` for a range this modifier does not currently own. The cover is only a highlight drawn over the text: the hidden text stays in `CleanText`, selection and clipboard | OK |

## 6. Callbacks: events, dispatch, Handle vs PreventDefault

### 6.1 Event sources

| Where | Use |
|---|---|
| `modifier.Events` (`RangeInteractionEvents`) | handler for one modifier, no assets |
| `UniTextInteractions.For(text).Get(channel).Activated` | one handler for ranges of one channel in one text |
| `LinkModifier.LinkClicked / LinkEntered / LinkExited` | link-specific convenience |
| `router.Capturing` / `router.Bubbling` | host-level preview / after-target handlers (`RangeInteractionHandler`) |

`RangeInteractionEvents` members, all `Action<RangeInteraction>`: `Activated`, `ContextRequested`, `Entered`, `Exited`, `StateChanged`, `LongPressProgress`, `Gesture` (also raised for pressed/released/canceled), `FocusChanged`, and the catch-all `Interaction` (fires **first** for every kind; `Handle()` there skips the typed events).

When each fires: `Activated` = a confirmed primary click/tap (release over the same activation target, not dragged, no long press fired) or `ActivateFocused()` / the Submit key. `ContextRequested` = right click, touch/pen long press (at least `longPressDuration`), Menu key on a focused range; that press then produces no `Activated`. `Entered`/`Exited` = mouse/pen only. `StateChanged` = boolean Hovered/Pressed/Focused/Disabled transitions. `LongPressProgress` = every frame while a touch/pen press is held (never for a mouse hold), `Progress` 0→1.

### 6.2 `RangeInteraction` (copy fields out; do not store the object)

`Kind`, `Route` (`Capture|Target|Bubble`), `Range` (`InteractiveRange`: `PrimaryValue`, `Payload`, `Identity`, `Segment`, `Channel`, `Source`, `IsValid`, `Contains(int)`), `Entity`, `Channel`, `Payload`, `TextHit`, `Trigger` (`PrimaryClick/SecondaryClick/LongPress/Hover/Keyboard`), `PointerKind` (`Mouse/Touch/Pen`), `PointerId`, `HasPointer` (false for keyboard), `ScreenPosition`, `LocalPosition`, `EventCamera`, `Modifiers` (Shift/Control/Alt/Meta), `AnchorRect` (text-local union rectangle of the range — for tooltips), `PreviousState`/`State`/`Signal`/`SignalValue` (for `StateChanged`), `Progress`, `GesturePhase`, `Handled`, `DefaultPrevented`, and the two methods below.

### 6.3 Dispatch order and the two veto flags

One event runs: `router.Capturing` → (not Handled) channel events, only when the range has a channel and somebody called `Get(channel)` → (not Handled) `modifier.Events` then `HandleInteraction` (raises `LinkClicked/Entered/Exited`) → (not Handled) `router.Bubbling` → (not `DefaultPrevented`) `HandleDefaultAction` (URL open, spoiler toggle).

| Call | Effect | Does not do |
|---|---|---|
| `i.Handle()` | stops **later route stages** (a `Handle()` in a channel handler suppresses `LinkClicked`) | does not cancel the built-in action (`OpenURL` still runs) |
| `i.PreventDefault()` | skips `HandleDefaultAction` (no `OpenURL`, no spoiler toggle) | other handlers and `LinkClicked` still run |

They are independent. For "I handle links myself", the simplest form is `LinkModifier.AutoOpenUrl = false`.

### 6.4 `UniTextInteractions` (router; sealed, one per text)

| Member | Notes |
|---|---|
| `static For(UniTextBase)` / `TryGet(UniTextBase, out UniTextInteractions)` | get-or-create / no create |
| `Get(RangeChannel)` → `RangeInteractionEvents` | **throws `ArgumentNullException` for a null channel**; without a channel use `modifier.Events` |
| `Capturing` / `Bubbling` | host-level events; `Capturing` + `Handle()` stops everything after it |
| `HasTargets`, `EntityCount`, `FocusedEntity` | introspection (`HasTargets` only says some range exists) |
| `TryGetBounds(RangeIdentity, out Rect)` | bounds in text-local space |
| `ScrollIntoView(RangeIdentity)` | false when no viewport adapter is subscribed |
| `Focus(identity)`, `FocusFirst()`, `MoveFocus(RangeNavigationDirection, RangeNavigationOrder = Logical, RangeChannel = null, bool wrap = false)`, `Blur()`, `ActivateFocused()`, `ContextForFocused()` | keyboard/gamepad driving; `Focus*` also selects the host in the EventSystem |
| `CancelPointer(int pointerId)` | cancels a press in flight |

Diagnostics: `UniTextRangeDebugSnapshot.Capture(text)`, `RangeEntityDiagnostic` (identity, bounds, state, priority, style order, registration order) and the window `Tools → LightSide → UniText → Range Debugger`.

## 7. Range states, signals, feedback

- `RangeState`: `Normal → Hovered → Pressed`, plus `Disabled` when `IsRangeEnabled` returns false. Activation is an event, not a state. Read with `modifier.GetRangeState(in range)`.
- Feedback is driven by **signals**, not by `RangeState`: `RangeSignals.Hovered / Pressed / Focused / Disabled`, plus app-publishable `Selected`, `Current`, `Visited`, and `SpoilerModifier.RevealedSignal`. `RangeStateRule { Selector, Playback, Scope, Trigger, Priority, Changes }` matches signals through `InteractionRangeStateSelector { Required, Excluded }` (`InteractionSignalMask` flags `Hovered, Pressed, Focused, Disabled`). `RangeRuleEvent.Activated` as `Trigger` gives a one-shot flash. Publish your own with `UniTextRanges.For(text).SetSignal(identity, signal, value)` or `SetSignalForAll`.
- A rule animates **parameters of modifiers in the same graph** through `ParameterChange.SetTarget(modifier, ParameterDescriptor, value)` (e.g. `HighlightModifier.Param.Tint`, `PaintLayerModifier.Param.Tint`, `ColorModifier.Param.Color`); `SetTarget` throws when the modifier is not in the same graph or lacks the parameter. The usual pattern: keep a feedback layer (`HighlightModifier`, glow/stroke paint layer) with a transparent `Tint`, and let the rule drive it opaque.
- `TransitionPlayback { EnterDuration 0.12, ExitDuration 0.10, Easing CubicOut, Clock Unscaled }`, `InstantPlayback`. `RangeDecorationPriorities.Interactive = -10` draws feedback under annotations. Full model: [unitext-range-state-rules.md](unitext-range-state-rules.md).
- **Pressed is instant for every pointer kind; hover exists for mouse/pen only.** Design touch feedback on Pressed, `Activated` and `LongPressProgress`.

## 8. Hit policy, overlaps, requirements, touch

### 8.1 Hit geometry and overlap resolution

- Hit fragments follow the final glyph/line geometry in the text's local space, plus `HitPadding`, with every fragment grown to at least `MinimumHitSize`. A long name that wraps can be one area per line with `WrappedGapPolicy.JoinLineFragments`. Neighbouring padded ranges overlap and are then arbitrated.
- **One event goes to one winner.** Order: higher `InteractionPriority` first; ties are broken by style order, then by the shorter range, then by registration order. Ranges at the same point other than the winner get nothing and there is no bubbling between ranges. Do not lean on the tie-breakers: give overlapping interactive styles explicit priorities (slot 1 of the tag: `<link=https://x,10>`).
- A press that travels more than `dragSlop` (10 dp) or turns into a `ScrollRect` drag cancels the activation.
- Helpers on `UniTextBase`: `HitTestRange(Vector2 local, float maxDistance = 20f)` and `HitTestRange(Vector2 screen, Camera eventCamera, float maxDistance = 20f)` (glyph box hit with a closest-glyph fallback; pass 0 for exact); `HitTestCaret(...)` snaps to glyph edges and lands past a link's last glyph, so use it for carets only; `IsOverText(screen, camera)`; events `TextClicked(TextPointerEvent)`, `ContextRequested`, `PointerPressed` (set `Consumed` to stop later defaults), `PointerReleased`, `PointerLongPressProgress`, `PointerEntered/Exited/Moved`. `TextPointerEvent` is reused — copy fields. Canvas camera for hit tests: `CanvasUtil.GetCanvasCamera(canvas)` (null for Screen Space - Overlay).

### 8.2 Requirements

| Need | Canvas text (`UniText`) | World text (`UniTextWorld`, `UniText3D`) |
|---|---|---|
| Event system | `EventSystem` + an input module (Standalone, Input System UI module or `LightSideInputModule`) | same |
| Raycaster | `GraphicRaycaster` on the Canvas (Camera / World Space canvases need `worldCamera`) | `WorldPointerRaycaster` on **the camera that renders the text**; no colliders needed; one raycaster serves all LightSide world surfaces on that camera |
| Receive pointer | `Raycast Target` on the text. Also check parent `CanvasGroup.blocksRaycasts/interactable`, `RectMask2D` clipping and graphics on top (only the topmost target gets hover/press) | `UniTextWorld.RaycastTarget = true` (code default true; **0 in the shipped World Text prefab**) |
| Markup vocabulary | component `Styles`, style presets, or the Global Style Preset in the UniText settings (empty by default) | same |
| Scrolling | `ScrollRectRangeViewport` | `CameraRangeViewport` |
| Game asmdef | add `LightSide.UniText`; add `LightSide.Core` when you name `CursorType`, `WorldPointerRaycaster`, `OrderedValueEvent`, `PointerKind` | same |

A world text without a raycaster draws normally but receives nothing and logs once per scene that it is an interactive `UniTextWorld` with no World Pointer Raycaster. `UniTextWorld` hit area = its whole rect; `UniText3D` solids are hit through the same raycaster ([unitext-3d-text.md](unitext-3d-text.md)).

### 8.3 Pointer routing profiles (LightSide.Core)

A `PointerRoutingProfile` sets, per channel (Hover, Primary, Secondary, Middle, Scroll), a `PointerRoutingMode` (`Pass`, `Receive`, `Block`, `ReceiveAndBlock`). Shipped profiles: `default` (all ReceiveAndBlock), `transparent` (all Pass), `hover` (Hover Receive, rest Pass), `observe` (all Receive), `interactive` (all ReceiveAndBlock except Scroll = Receive), `blocker` (all Block), `context` (Hover Receive, Secondary ReceiveAndBlock, rest Pass).

- Plain text without an assigned profile behaves like `observe`; interactive ranges use their own `RoutingProfile` (default `interactive`) at the hit position. The `PointerRouting` component assigns a profile to any UI object.
- **Profiles are honoured only by `LightSideInputModule`**, which is off by default (Project Settings → LightSide → Core → Pointer Routing → *Use LightSideInputModule*). Under Unity's own modules the text is an ordinary topmost raycast target: it still forwards press/release to its parent hierarchy, but a sibling button beneath it is blocked. Switch `Raycast Target` off on non-interactive labels.
- With `LightSideInputModule`, an `observe` range emits events without consuming the pointer (a button under the text still gets the tap), while `interactive` consumes primary and secondary: a tap on a link does not also tap what is below, and a long press on a link does not open the text's selection menu.

### 8.4 Touch behaviour and gesture thresholds

- No hover on touch: `Entered`, `Exited`, `LinkEntered`, `LinkExited` and Hovered feedback never happen for touch. `Pressed` is immediate, `Activated` fires on release, a hold fires `ContextRequested`.
- Thresholds live in the UniText settings asset (Project Settings → LightSide → UniText): `longPressDuration` 0.5 s (touch/pen hold; a mouse hold never long-presses), `dragSlop` 10 dp (scaled by `Screen.dpi/160`, fallback canvas scale factor), `multiTapWindow` 0.3 s / `multiTapSlop` 100 dp (touch multi-tap, used by selection), `multiClickInterval` 0.5 s / `multiClickSlop` 8 dp (desktop multi-click). Hit padding and minimum size are per modifier, not global.
- A runtime-added hidden `UniTextFocusable : Selectable` appears on any GameObject whose text has interactive ranges (and on selectable/editable text) unless another `Selectable` (Button, Toggle) already sits there; it joins automatic keyboard/gamepad navigation. Do not be surprised by it in the hierarchy.

### 8.5 Viewports and gestures

| Type | Role | Rules |
|---|---|---|
| `ScrollRectRangeViewport` | Canvas text inside a `ScrollRect`: reveals a range by minimally shifting the content; keeps the text's visible window current for culling | fields `ScrollRect` (Reset picks the parent), `Padding` (Vector4 px: left, bottom, right, top); throws if the ScrollRect/Content is missing |
| `CameraRangeViewport` | world text: pans a camera (or `MoveTarget` rig) in its view plane; never zooms or rotates | fields `TargetCamera`, `MoveTarget`, `Padding` (px, 16); throws if the range is behind the camera |
| `RangeViewportAdapter` (abstract base of both) | `Reveal(in RangeScrollRequest)`, `RefreshVisibleWindow()` | a text accepts **one** scroll owner; a second adapter throws `InvalidOperationException` |
| `RangeGestureRecognizer` (abstract) | custom gesture claimed on a pressed range | `Priority` (default 1; built-in selection/scroll drag = 0), `Compatibility` (`RangeGestureCompatibility` flags `None`, `TextSelection`, `ParentScroll`); decisions `Pending/Reject/Claim`; key per-pointer state by `PointerId` + `Range.Identity` |
| `DragRangeGestureRecognizer` | claims a drag after the slop is exceeded | `Compatibility` default `None` = exclusive over selection and parent-scroll drags |

Modifiers return recognizers from `GetGestureRecognizers()`; there is no Inspector list.

## 9. Localization hook: `IUniTextResolver`

Use it when the scene stores a key (`"ui.reward.title"`) and the visible string comes from your own tables.

```csharp
public interface IUniTextResolver
{
    void OnAttached(UniTextBase owner) { }                        // default-implemented, optional
    void OnDetached(UniTextBase owner) { }                        // default-implemented, optional
    bool TryResolve(ReadOnlyMemory<char> source, out ReadOnlyMemory<char> result);
}
```

- **Contract:** `TryResolve` returns false ⇒ `source` is parsed unchanged. Assign through `UniTextBase.TextResolver` (get/set): the setter calls `OnDetached(old)`, `OnAttached(this)` and marks the text dirty.
- **When it runs:** on the main thread only, once when the source text is assigned or marked dirty — not on every rebuild, never on a worker thread. Its output is what long text virtualizes.
- **Language switch:** when the output changes but the input does not, call `owner.SetDirty(UniTextDirty.Text)` on the owner received in `OnAttached`.
- **Lifetime of `result`:** it must stay valid and unchanged until the next call on the same component or `OnDetached`. Keep the translated string in a field; never return a pooled or temporary buffer.
- Output is parsed afterwards, so translations may contain markup (`<link=...>`, `<item=...>`, `<spoiler>`). Every re-resolve rebuilds ranges: spoiler reveal state resets, and `MutableRangeSource` ranges must be re-added (R5 does that).
- One resolver instance may serve several components only if it tracks every `owner` separately.
- Introspection on `UniTextBase`: `Text` (serialized field; the resolver never writes it, so scenes stay clean), `RawText` (runtime source before the resolver), `ResolvedText` (resolver's last output, empty if none or false), `RenderedText` (what is parsed), `CleanText` (markup-free, a pooled span — copy it), `TextOverride` (`TextOverrideSource` flags `None = 0`, `SetText = 1`, `Resolver = 2`). `MeasureText` bypasses the resolver.
- Doc-vs-code: the online API page prints `TryResolve(ReadOnlyMemory<char>, ReadOnlyMemory<char>)` without `out`; the source signature above is authoritative. `PrepareForParallel` no longer exists on the interface.

## 10. Recipes

Conventions: `using LightSide; using UnityEngine;` implied; `text` is a `UniTextBase` (`UniText` on a Canvas or `UniTextWorld`). Unsubscribe in `OnDisable/OnDestroy` with **named methods** (lambdas cannot be unsubscribed). Game-specific calls (`Tooltip`, `ItemDb`, `Loc`, `Rewards`) are placeholders.

### R1. Web link authored in the Inspector, with your own handler
Goal: `<link=url>`, `[t](url)` and bare URLs raise one callback. Setup: UniText → Styles → **+** → *Link* (Tags/Common); add *Link* under Markdown and *Link (Raw URL)* for the other two forms.
```csharp
public sealed class WebLinkHandler : MonoBehaviour
{
    [SerializeField] private UniTextBase text;
    private LinkModifier link;

    private void OnEnable()
    {
        link = text.GetModifier<LinkModifier>();       // first LinkModifier, found inside composite/preset graphs
        if (link == null) { Debug.LogError("No link style on " + text.name, text); return; }
        link.AutoOpenUrl = false;                       // we decide (confirm dialog, allow-list)
        link.LinkClicked += OnClicked;
    }
    private void OnDisable() { if (link != null) link.LinkClicked -= OnClicked; }
    private void OnClicked(string url) => Application.OpenURL(url);   // validate first
}
```
Text: `"Docs: <link=https://example.com>the docs</link>, [site](https://example.com), https://example.com"`. Result: all three forms raise `LinkClicked(url)`; with the default `AutoOpenUrl = true` and no handler the URL opens by itself. Gotchas: `GetModifier<T>()` returns only the first match — the Markdown and raw-URL styles are separate instances (`GetModifiers<LinkModifier>(list)` returns all); cache the result, never call it per frame; `LinkEntered/LinkExited` never fire for touch.

### R2. Link style from code (no Editor presets)
```csharp
// behaviour only: no colour, no underline, no hover feedback
text.Styles.Add(Style.Tag(new LinkModifier(), "link"));
text.Styles.Add(Style.FromSource(new RawUrlParseRule(), new LinkModifier()));
text.Text = "See <link=https://example.com>the docs</link> or https://example.com";

// full look: reuse the shipped graph (not compiled)
[SerializeField] private ModifierGraphPreset linkPreset;   // assign a LinkPreset graph asset
text.Styles.Add(Style.Tag(new ModifierGraphModifier { Preset = linkPreset }, "link", ";#4285F4"));
text.Styles.Add(Style.FromSource(new MarkdownLinkParseRule { DefaultParameter = ";#4285F4" },
                                 new ModifierGraphModifier { Preset = linkPreset }));
```
`";#4285F4"` = empty URL segment + colour segment (segments split by `;`). Without the preset you must compose `CompositeModifier[ link, ColorModifier, UnderlineModifier ]` yourself.

### R3. Tappable item names inside markup, value in C#
Goal: `"Loot: <item=sword_iron>Iron Sword</item>"` — tap opens a tooltip. Setup: your own tag name; the tag must be registered on the component.
```csharp
public sealed class ItemTextLinks : MonoBehaviour
{
    [SerializeField] private UniTextBase text;
    private InteractiveModifier items;

    private void Awake()
    {
        items = new InteractiveModifier();                       // Value (slot 0) is the fallback when markup gives none
        text.Styles.Add(Style.Tag(items, "item"));               // YOUR tag name
        text.Styles.Add(Style.Tag(new ColorModifier(), "color"));
        items.Events.Activated += OnItem;
        items.Events.ContextRequested += OnItemLongPress;
        text.Text = "Loot: <item=sword_iron><color=#FFD27A>Iron Sword</color></item>, <item=potion_hp>Health Potion</item>";
    }
    private void OnDestroy()
    {
        if (items == null) return;
        items.Events.Activated -= OnItem;
        items.Events.ContextRequested -= OnItemLongPress;
    }
    private void OnItem(RangeInteraction i) => Tooltip.Show(i.Range.PrimaryValue, i.ScreenPosition);   // copy values out now
    private void OnItemLongPress(RangeInteraction i) => Tooltip.Show(i.Range.PrimaryValue, i.ScreenPosition);
}
```
Result: tap = `Activated`; touch/pen long press (0.5 s) or right click = `ContextRequested` and then no `Activated` for that press. Gotchas: values containing `, ; ( ) "` are tokenized — keep ids identifier-like or use R5/Markdown links; slots after the first are the shared hit params (`<item=sword_iron,5>` = priority 5); no visual feedback is included (add R6 rules or colour tags).

### R4. One handler for many texts through a `RangeChannel`
Setup: create the asset (`Assets → Create → LightSide → UniText → Range Channel`) and assign it to the modifier's *Channel* (or the source's).
```csharp
[SerializeField] private UniTextBase text;
[SerializeField] private RangeChannel channel;
private RangeInteractionEvents events;

private void OnEnable()  { events = UniTextInteractions.For(text).Get(channel); events.Activated += OnActivated; }
private void OnDisable() { events.Activated -= OnActivated; }
private void OnActivated(RangeInteraction i) => Debug.Log(i.Range.PrimaryValue, text);
```
Gotchas: `Get(null)` throws; with no channel use `modifier.Events`; channel subscribers run **before** `modifier.Events`/`LinkClicked`; `Handle()` in a channel handler suppresses `LinkClicked` but not `OpenURL` (use `PreventDefault()` or `AutoOpenUrl = false`). Code-only: `ScriptableObject.CreateInstance<RangeChannel>()`, assign to `Channel`, destroy when done.

### R5. Make plain-text keywords tappable (no markup, survives edits, with payload)
Use when a localized string has no tags: find the words and publish them as ranges.
```csharp
// not compiled
public sealed class KeywordTapper : MonoBehaviour
{
    [SerializeField] private UniTextBase text;
    private readonly MutableRangeSource source = new();
    private readonly InteractiveModifier tap = new();
    private readonly TextRange[] hits = new TextRange[32];
    private string taggedFor;

    private void Awake()
    {
        source.SetIdentity("game.keywords");
        text.Styles.Add(Style.FromSource(source, tap));
        tap.Events.Activated += OnTap;
        text.LayoutCommitted += Retag;                  // fires when this component's layout is final
    }
    private void OnDestroy() { text.LayoutCommitted -= Retag; tap.Events.Activated -= OnTap; }

    private void Retag()
    {
        var snap = source.Snapshot;                     // invalid until the source took part in a parse
        if (!snap.IsValid || text.RenderedText.Span.SequenceEqual(taggedFor)) return;   // guard: our Commit re-applies modifiers
        taggedFor = text.RenderedText.ToString();
        int n = text.FindAll("Iron Sword", StringComparison.Ordinal, hits);   // rendered-codepoint ranges, no allocation up to 64 chars
        using var update = source.BeginUpdate(snap.Revision);
        update.Clear();
        for (int i = 0; i < n; i++)
            update.AddOpaque(hits[i], "sword_iron", payload: ItemDb.Get("sword_iron"));   // value bypasses ',' ';' tokenizing
        update.Commit();                                // throws if the text moved on meanwhile
    }
    private void OnTap(RangeInteraction i)
    {
        if (i.Payload.TryGet<ItemDef>(out var def)) ItemPopup.Show(def, i.AnchorRect);   // Get<T>() throws when absent
    }
}
```
Needs `using System;`. The ranges follow later edits of the text, so re-tagging is needed only when the string changes (language switch ⇒ new `RenderedText`). For visuals add a `HighlightModifier`/`UnderlineModifier` style on the same source (one source can feed several styles) or R6 rules. `BeginUpdate`/`Commit` throw when the text moved on since the revision was taken or the source has not yet taken part in a completed parse; ranges added with positional `Add(range, parameter)` are tokenized, `AddOpaque` is not. More on `MutableRangeSource`: [unitext-selection-context-menu.md](unitext-selection-context-menu.md) section 6.

### R6. Hover/press glow on a tappable term (state rules in code)
```csharp
// not compiled
static InteractiveModifier AddGlowTerm(UniTextBase text, string tag)
{
    var glow = new GlowModifier
    {
        Paint = PaintRef.Solid(new Color32(255, 210, 90, 255)),
        Radius = UnitValue.Em(0.25f),
        Tint = new Color32(255, 255, 255, 0),            // invisible until a rule drives it opaque
    };
    var term = new InteractiveModifier();
    term.Rules.Add(MakeRule(InteractionSignalMask.Hovered, glow, 0.12f, 0.20f));   // mouse/pen
    term.Rules.Add(MakeRule(InteractionSignalMask.Pressed, glow, 0f, 0.15f));      // touch gives Pressed only
    var graph = new CompositeModifier();
    graph.Modifiers.ReplaceAll(new BaseModifier[] { term, glow });
    text.Styles.Add(Style.Tag(graph, tag));
    return term;                                          // subscribe term.Events.Activated as in R3
}
static RangeStateRule MakeRule(InteractionSignalMask signal, PaintLayerModifier layer, float enter, float exit)
{
    var change = new ParameterChange();
    change.SetTarget(layer, PaintLayerModifier.Param.Tint, new Color32(255, 255, 255, 255));
    var rule = new RangeStateRule
    {
        Selector = new InteractionRangeStateSelector { Required = signal },
        Playback = new TransitionPlayback { EnterDuration = enter, ExitDuration = exit },
    };
    rule.Changes.Add(change);
    return rule;
}
```
For a background chip use a `HighlightModifier { Paint = PaintRef.Solid(..), GeometryMapping = GeometryMapping.Range, Height = RangeHeight.Content, Padding = new UnitVector2(new Vector2(0.15f, 0.05f), UnitKind.Em), CornerRadius = UnitValue.Em(0.25f), Priority = RangeDecorationPriorities.Interactive, Tint = transparent }` and target `HighlightModifier.Param.Tint`. A one-shot flash on activation: a `RangeStateRule` with `Trigger = RangeRuleEvent.Activated`, a playback and no selector. Keep feedback layers persistent with transparent `Tint` instead of adding/removing modifiers.

### R7. Retune hover/press look of the shipped Link/Spoiler graph
Edit the preset asset the style references (Inspector of the `ModifierGraphPreset`): the three highlight paint colours, the rule `TransitionPlayback` durations, the `ColorModifier` colour, the `UnderlineModifier`. Edits reach every component using that asset, live, also in Play Mode. Per component: `text.GetModifier<LinkModifier>()` returns that component's own modifier instance — change `HitPadding`, `MinimumHitSize`, `AutoOpenUrl` there without touching the asset. Per link: `<link=https://x;#FF8800;solid>`.

### R8. Spoiler for a hidden reward (tap to reveal once; programmatic reveal)
```csharp
// not compiled
[SerializeField] private ModifierGraphPreset spoilerPreset;     // assign a SpoilerPreset graph asset
private SpoilerModifier spoiler;

private void Awake()
{
    text.Styles.Add(Style.Tag(new ModifierGraphModifier { Preset = spoilerPreset }, "spoiler"));
    spoiler = text.GetModifier<SpoilerModifier>();               // reachable before the first rebuild
    spoiler.Events.Activated += OnTapSpoiler;
    spoiler.RevealChanged += OnReveal;
    text.Text = "Chest: <spoiler>Legendary Bow</spoiler>";
}
private void OnTapSpoiler(RangeInteraction i)
{
    if (spoiler.IsRevealed(i.Range)) i.PreventDefault();         // default action TOGGLES; this keeps it revealed
}
private void OnReveal(in InteractiveRangeHit hit, bool revealed) { if (revealed) Rewards.Claim(); }   // `in` parameter in the delegate
public void RevealAll() { foreach (var r in spoiler.InteractiveRanges) spoiler.SetRevealed(r, true); }
public void ConcealAll() => spoiler.ConcealAll();
```
Reveal state is kept across re-parses while the range identity survives and is lost when the text changes enough to retire it. A spoiler hides pixels, not data: the text underneath remains in `CleanText`, selection, clipboard and accessibility output.

### R9. Long press / context request on a range
`modifier.Events.ContextRequested += OnCtx;` fires for right click, touch/pen hold of at least `longPressDuration` (0.5 s) and `ContextForFocused()`. Drive a hold ring with `Events.LongPressProgress` (`i.Progress` 0→1, touch/pen only, every frame). After the hold fires the press is cancelled and release does not activate. Place UI with `i.AnchorRect` or `i.ScreenPosition`. The `interactive` profile blocks the Secondary channel (under `LightSideInputModule`), so the text's own selection menu does not open over a range.

### R10. Intercept or veto the built-in action
```csharp
link.AutoOpenUrl = false;                                    // simplest: handle LinkClicked yourself
link.Events.Activated += i =>                                // or keep AutoOpenUrl and veto selectively
{
    if (!Allowed(i.Range.PrimaryValue)) i.PreventDefault();  // skips Application.OpenURL; LinkClicked still raised
};
```
Always set `AutoOpenUrl = false` for in-game ids (`quest:42`): with the default they go to `Application.OpenURL("quest:42")`. (`Handle()` vs `PreventDefault()`: section 6.3.)

### R11. Overlapping ranges
`<link=https://x,10>` nested in a larger `<item=...>`: priority 10 wins regardless of length. Give every overlapping interactive style an explicit `InteractionPriority`; check the outcome in the Range Debugger (`RangeEntityDiagnostic.Priority/StyleOrder`).

### R12. Finger-sized tap targets
```csharp
items.MinimumHitSize = new UnitVector2(new Vector2(0f, 48f), UnitKind.Absolute);   // minimum height of every fragment
items.HitPadding     = new UnitVector2(new Vector2(0.2f, 0.1f), UnitKind.Em);      // grows with font size
items.WrappedGapPolicy = WrappedGapPolicy.JoinLineFragments;                       // one target per line when a long name wraps
```
Geometry is rebuilt on commits, not per frame. Neighbouring padded ranges overlap and are arbitrated (R11).

### R13. Clickable world-space text
Setup: an `EventSystem` + input module in the scene; `WorldPointerRaycaster` on **the camera that renders the text** (`Add Component → LightSide → Core → WorldPointerRaycaster`; set `Blocking` to ThreeD/TwoD only if solid geometry must occlude); `RaycastTarget = true`; styles as in R1/R3.
```csharp
var world = gameObject.AddComponent<UniTextWorld>();
world.RaycastTarget = true;                                  // the shipped World Text prefab has it OFF
if (cam.GetComponent<WorldPointerRaycaster>() == null) cam.gameObject.AddComponent<WorldPointerRaycaster>();
```
Hover is re-hit every frame while a mouse pointer is inside (camera motion moves text under a still cursor). `UniText3D` solids use the same raycaster.

### R14. Interactive text inside a ScrollRect
Add `ScrollRectRangeViewport` to the text, assign the `ScrollRect` (Reset picks the parent), optional `Padding`. It reveals focused ranges (keyboard/gamepad focus, `ScrollIntoView`) by shifting the content and keeps the text's visible window updated so off-screen glyphs and decorations are culled. Dragging over a link scrolls (the click is cancelled because the ScrollRect owns the drag). One adapter per text. For world text use `CameraRangeViewport`.

### R15. Localization through `IUniTextResolver`
```csharp
// not compiled
public sealed class KeyResolver : IUniTextResolver
{
    private UniTextBase owner;
    private string translated;                               // result must stay valid until the next call / OnDetached
    public void OnAttached(UniTextBase o) { owner = o; Loc.LanguageChanged += Refresh; }
    public void OnDetached(UniTextBase o) { Loc.LanguageChanged -= Refresh; owner = null; }
    public bool TryResolve(ReadOnlyMemory<char> source, out ReadOnlyMemory<char> result)
    {
        if (!Loc.TryGet(source.ToString(), out translated)) { result = default; return false; }   // false => parsed as is
        result = translated.AsMemory();
        return true;
    }
    private void Refresh() => owner?.SetDirty(UniTextDirty.Text);   // output changed, source did not
}
// text.Text = "ui.reward.title"; text.TextResolver = new KeyResolver();   // setter attaches and marks Text dirty
```
`Loc` is your localization facade. Translations may contain `<link>/<item>/<spoiler>` markup; R5 re-tags automatically through its `RenderedText` guard. Per-language font stacks are covered in [unitext-fonts.md](unitext-fonts.md).

### R16. Keyboard / gamepad focus over links
```csharp
var router = UniTextInteractions.For(text);
router.FocusFirst();                                         // also selects the text GameObject in the EventSystem
router.MoveFocus(RangeNavigationDirection.Next);             // wrap: MoveFocus(Next, RangeNavigationOrder.Logical, null, wrap: true)
router.ActivateFocused();                                    // same routed Activated + default action as a pointer
```
With a focused text under EventSystem navigation, arrows/Tab (through the hidden `UniTextFocusable`) move between ranges and Submit activates. `Focusable = false` keeps a range out; `NavigationOrder = Visual` gives geometry-based arrows. Drive a focus ring with `InteractionSignalMask.Focused`.

### R17. Did the tap land on interactive text?
```csharp
var hit = text.HitTestRange(screenPos, canvasCamera, 0f);    // 0 = exact glyph box only
bool onRange = hit.hit && (link.TryGetRange(hit.cluster, out _) || items.TryGetRange(hit.cluster, out _));
```
`canvasCamera = CanvasUtil.GetCanvasCamera(text.canvas)` (null for Screen Space - Overlay). `HitTestCaret` is the wrong tool here (section 8.1).

### R18. Custom swipe/drag gesture on a range (advanced)
```csharp
// not compiled
[Serializable]
public sealed class SwipeInteractive : InteractiveModifier
{
    private readonly RangeGestureRecognizer[] recognizers =
        { new DragRangeGestureRecognizer { Compatibility = RangeGestureCompatibility.None } };   // exclusive over selection drag + parent scroll
    protected override ReadOnlySpan<RangeGestureRecognizer> GetGestureRecognizers() => recognizers;
}
// swipe.Events.Gesture += i => { if (i.GesturePhase == RangeGesturePhase.Moved) { /* i.ScreenPosition */ } };
```
A custom claim must exceed the built-in drag priority (0); the default is 1. The base method is `protected internal`; across assemblies the override is written `protected`.

### R19. Tooltip anchored to a range
```csharp
// not compiled
Vector3 world = text.rectTransform.TransformPoint(i.AnchorRect.center);
Vector2 screen = RectTransformUtility.WorldToScreenPoint(i.EventCamera, world);   // EventCamera is null for overlay canvases, which is what WorldToScreenPoint expects
```
`i.AnchorRect` is the text-local union of the range's hit fragments; `UniTextInteractions.For(text).TryGetBounds(i.Entity, out var rect)` returns the same space.

## 11. Pitfalls

Silent failures
1. **Tag renders as literal text.** No style for that tag on the component and the global style preset is empty. Add the style (picker, `Style.Tag`, or a `StylePreset` asset). The tag name must match the rule's `Tag` string (ASCII case-insensitive).
2. **`<interactive=...>` does nothing** unless you create `Style.Tag(new InteractiveModifier(), "interactive")` yourself. The only built-in non-link interactive source is `TriggerWordParseRule`.
3. **Link is clickable but looks plain.** Code-created `LinkModifier`/`SpoilerModifier` carry no colour, underline, hover rules or spoiler cover; only the `LinkPreset`/`SpoilerPreset` graphs do.
4. **Nothing is clickable.** Check: no EventSystem / `GraphicRaycaster`; `Raycast Target` off; another raycast target on top; parent `CanvasGroup` not interactable; world text without `WorldPointerRaycaster` or with `RaycastTarget` 0 (shipped prefab); raycaster on a different camera than the one rendering the text; a `LinkModifier` range with an empty URL (silently dropped).
5. **Hover events and hover feedback never happen on touch** (`Entered/Exited/LinkEntered/LinkExited`). Design on Pressed, `Activated`, `LongPressProgress`.
6. **`AutoOpenUrl` is true by default**, so `<link=item:42>` goes to `Application.OpenURL`. `Handle()` does not stop the default action; `PreventDefault()` does not stop other handlers.
7. **Values split on `,` and `;` and group on `( )`.** `<link=https://a/?x=1,2>` yields URL `https://a/?x=1` and sends `2` to the next slot (priority). For arbitrary values use Markdown `[t](url)`, bare URLs, `TriggerWordParseRule` or `MutableRangeUpdate.AddOpaque`.
8. **`RangeInteraction` is pooled.** Do not store it, or `Range`-derived data, across frames or awaits; copy `PrimaryValue`, `Entity`, positions.
9. **API exceptions:** `UniTextInteractions.Get(null)` throws `ArgumentNullException`; `Payload.Get<T>()` throws `InvalidCastException`; `SetRevealed/IsRevealed` on a foreign range throw `ArgumentException`; a second scroll adapter throws `InvalidOperationException`.
10. **Range state is lost on text change.** Spoiler reveal, keyboard focus and hover are keyed on `RangeIdentity`; an edit inside a range retires it. Setting equal text is a no-op (no parse) and keeps state.
11. **`MutableRangeSource` coordinates are rendered codepoints** (tags excluded), and `BeginUpdate/Commit` throw when the text has moved on. Re-tag when the *string* changes.
12. **`StringParseRule` consumes its matches** — it is not a "highlight this word" rule.
13. **`HitTestCaret` is for carets**; for entity hit tests use `HitTestRange` or `TryGetRange`.
14. **Profiles are ignored under Unity's own input modules**; with `Raycast Target` on, a UniText blocks a sibling button beneath it. Turn Raycast Target off on decorative labels.
15. **Hidden `UniTextFocusable : Selectable`** is added at runtime next to interactive text; `Focusable = false` on the modifier keeps ranges out of range focus.
16. **Faded-out text still takes pointer events**: `color.a = 0` text is still drawn and hit; call `Hide()` after the fade (it removes pointer events and decorations).
17. **Only one scroll owner per text**; a document view does not embed into a `ScrollRect`.
18. **Removed names you may remember** — see section 13.

## 12. Mobile verdicts

| Feature | Verdict | Reason (source reading) |
|---|---|---|
| Interactive modifier on a text, idle | OK | router attaches only while an interactive modifier is registered; no per-frame work when nothing is pressed |
| Mouse hover hit-test | OK | runs per mouse move over the text; none for touch |
| World text hover re-hit every frame | OK | only while a mouse pointer is inside |
| Geometry rebuild for hit fragments | OK | once per commit that changes glyph geometry, not per frame |
| Hundreds of ranges in one text | OK | |
| Thousands of ranges in one text (auto-detect URL/mention over a huge chat or log) | AVOID | focus-target de-duplication is a nested loop (quadratic); scope auto-detect rules to the texts that need them or window the text |
| Per-range rule playbacks (`TransitionPlayback` on `Tint`) | LIMIT | each range carries a runtime playback; fine for a handful per visible text, no geometry rebuild |
| Animated glow/highlight on every word of a long text | AVOID | feedback layers are mesh geometry |
| `LongPressProgress` event | OK | per-frame only during a touch/pen hold |
| `GetModifier<T>()` per frame | AVOID | walks styles; cache the result |
| `Raycast Target` on decorative labels | AVOID | extra raycast work and blocks pointers; keep off, and `Hide()` pooled texts |
| `RangeViewportAdapter` culling | OK | reduces glyph/decoration work off-screen |

## 13. Removed and renamed names (interaction area)

Names an assistant may recall from older versions; none exists in v3.30:
- `InteractiveModifier { RangeType = "mention" }`; `RangeClicked/RangeEntered/RangeExited/RangeStateChanged/RangeContextRequested/RangeLongPressProgress` on the modifier and on `UniTextBase`; `IsHoveringRange`, `CurrentHoverRange`; `RangeStyler`, `StateHighlightStyler`, `SpoilerCoverStyler`, `InteractiveModifier.Styler`; `UniTextBase.HitTest/HitTestScreen` (now `HitTestRange`); `TextClicked(TextHitResult)` (now `TextClicked(TextPointerEvent)`).
- "Effect" became "rule": `RangeStateEffect` → `RangeStateRule`, `InteractiveModifier.Effects` → `Rules`, `.Ranges` → `.InteractiveRanges`, drivers → playbacks (`TransitionPlayback`, `InstantPlayback`), `UniTextEffects.For` → `UniTextRanges.For`, `GetProperty` → `GetParameter`, `ModifierProperty` → `ParameterDescriptor`, `EffectProperty` → `OwnedParameter`.
- Links and spoilers no longer derive from `InteractiveModifier`; they derive from `InteractiveModifierBase`. The modifier's `Interaction` event became `Events`; `RangeInteractionChannel` → `RangeInteractionEvents` (events take `Action<RangeInteraction>`); `UniTextInteractions.Get<T>` is gone; **Pass Through** was replaced by `RoutingProfile` + `Focusable` (a token in that slot now names a profile).
- Range actions (`RangeAction`, `OpenUrlAction`, `CopyRangeTextAction`, `SetActiveAction`, the `Actions` list) are removed: handle `Events.Activated/ContextRequested` or override `HandleDefaultAction`. Typed payloads (`RangeChannel<T>`, `PayloadType`, `As<T>`, payload bindings) are removed: use `Payload.Get<T>()` / `TryGet<T>`. The Inspector gesture-recognizer list is removed: use `GetGestureRecognizers()`.
- `UniTextWorldRaycaster` → `WorldPointerRaycaster` (`BlockingMode` → `Blocking`). `UniTextInteractions.MoveFocus(bool)` → `MoveFocus(RangeNavigationDirection, ...)`. `TextLongPressProgress` → `UniTextBase.PointerLongPressProgress` (carries `Hit`). `PrepareForParallel` removed from `IUniTextResolver`. `CursorType` moved to `LightSide.Core`.
- Online API pages print some signatures without `out`/`in` (`TryResolve`, `TryGetRange`); rely on the source signatures.

Selection/menu/touch-handle renames are in [unitext-selection-context-menu.md](unitext-selection-context-menu.md) section 11.

## Unverified

- `<interactive=...>`: no definition was found in package presets, picker or samples; whether any external document uses it is unknown. Treat the name as yours.
- Tag-slot syntax for `HitPadding`/`MinimumHitSize` (`UnitVector2` contains a comma, which is also the slot separator): set them in C# or the Inspector.
- Quoting/escaping of `, ; ( )` inside `<link=...>` values through `TagRule` (outer quotes are stripped before tokenizing): not confirmed to protect inner separators.
- Whether `MutableRangeUpdate.Commit()` bumps `Snapshot.Revision`: the string-equality guard in R5 avoids a re-tag loop either way.
- Whether a hand-written `InteractiveModifier` subclass in a game assembly serializes and appears in the Inspector type picker without `partial`/parameter attributes, and whether `GetGestureRecognizers` can be overridden as `protected` across assemblies (R18).
- Touch hover: derived from code (hover returns early for `PointerKind.Touch`), not device-tested.
- Direction of the style-order tie-break in overlap arbitration (later style wins per source reading): confirm in the Range Debugger or set explicit priorities.
- Hit-geometry units: `HitPadding`/`MinimumHitSize` in `Absolute` are text-local units (canvas units under a `CanvasScaler`), not device pixels; inferred from the geometry code.
- `LightSideInputModule` together with `UniTextSelectable` drag forwarding on a device: not exercised.
