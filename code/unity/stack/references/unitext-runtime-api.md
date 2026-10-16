# UniText — Runtime C# API

> **Base path:** `<UniTextRoot>` is the folder of the UniText package — the one whose `package.json` has `"name": "media.lightside.unitext"` (find it with `Glob **/media.lightside.unitext/package.json`; it may sit under `Packages/` or `Library/PackageCache/`). Never hard-code its location.
> See also: [unitext-components-setup.md](unitext-components-setup.md), [unitext-markup-system.md](unitext-markup-system.md), [unitext-range-state-rules.md](unitext-range-state-rules.md), [unitext-interaction-links.md](unitext-interaction-links.md), [unitext-animation-phase.md](unitext-animation-phase.md), [unitext-performance-mobile.md](unitext-performance-mobile.md), [unitext-version-traps.md](unitext-version-traps.md)

---

Mobile verdicts (`OK` / `LIMIT` / `AVOID`) come from reading source and docs; nothing was profiled. Snippets adapted from verified signatures were not compiled and carry `// not compiled`. All snippets assume `using LightSide; using UnityEngine;` plus `System`, `System.Text` or `UnityEngine.UI` where named.

## Task → member → trap

| Task | Use | Trap |
|---|---|---|
| Show a value that changes at runtime (score, timer, damage) | `SetText(string)`, `SetText(ReadOnlySpan<char>)`, `SetText(StringBuilder)` | skipped when the characters are unchanged; never writes the serialized field or dirties a scene |
| Feed a reusable char buffer | `SetText(char[], start, length)`, `SetText(ReadOnlyMemory<char>)` | always rebuilds; the buffer must stay valid and unchanged until the next assignment; no CRLF normalization |
| Force a re-parse with identical text | `SetDirty(UniTextDirty.Text)` | `SetText(sameText)` is a deliberate no-op |
| Set authored text (inspector, prefab, editor script) | `Text = "..."` | writes the serialized field and dirties the scene in edit mode; no-op for the same string unless a `SetText` override is active |
| Fade a text | `color` alpha only | no rebuild; at alpha 0 the text is still drawn and still takes pointer events — call `Hide()` when the fade ends |
| Tint a text | `color` RGB | rebuilds the mesh stage; keep RGB constant while fading |
| Measure before showing | `MeasureText(new TextMeasureOptions { ... })` | result is outer size (padding included); null `maxWidth`/`maxHeight` = unconstrained; never per frame |
| Height for a candidate width | `GetHeightForWidth(float)` (`UniText` only) | padding included; schedules a Positions pass when the width differs from the rect's |
| Read size/glyphs in the same frame as the change | `LayoutCommitted` event, `MeasureText`, `GetHeightForWidth`; `Canvas.ForceUpdateCanvases()` (see Unverified) | `ResultSize`, `PreferredHeight`, `CleanText`, ranges are stale until the frame's canvas pass |
| Line count | `Buffers.lines.count` | valid after layout only |
| Effective font size under auto-size | `CurrentFontSize` | `FontSize` is ignored while `AutoSize` is on |
| What is under a pointer | `HitTestRange(...)` | camera `null` for an Overlay canvas; `cluster` is a rendered-text codepoint index |
| Nearest caret index | `HitTestCaret(...)` | snaps to glyph edges; lands past a range's last glyph |
| Cursor/hover over text | `IsOverText(screen, camera)` | inside line band and content extent only |
| Hide and reuse a label (pooling) | `Hide()` / `Show()` | not `SetActive(false)`, not empty text — both tear the pipeline down |
| Find a substring | `FindAll(query, comparison, Span<TextRange>)` | query up to 64 chars; searches rendered text |
| Text without markup | `CleanText` | pooled span; stale until the pass; copy before the next rebuild |
| Rectangles of a range (highlight boxes) | `GetRangeBounds(start, end, IList<Rect>)` | local space, one rect per line |
| Ranges produced by one tag | `GetModifier<T>().GetRanges(list)` / `.Ranges()` | throws while the modifier is not attached to a text |
| Recolour/retune tagged ranges from code | `Ranges().WhereLabel("x").Own(Param)` | keep the handle; editing inside an owned single range releases it |
| Add or drop a whole-text effect | `SetWholeText<T>(param)` / `ClearWholeText<T>()` | local style only; presets untouched |
| Animator/tween writes fields | `UniTextAnimationBridge` + a handler | without it nothing is invalidated |
| Layout-group preferred sizes | `((ILayoutElement)label).preferredWidth`, `PreferredHeight` | `preferredWidth` does not compile on the type itself |
| Localized text | `LocalizeStringEvent -> SetText(string)` or `TextResolver` | see Localization recipe |
| Raw text with no tags | `UseGlobalStylePreset = false` | also leave `Styles`/`StylePresets` empty |

## Processing model — when results exist

Pipeline stages, coarse to fine: `Font` > `Text`/`Direction` (re-parse + re-shape) > `Layout` (re-break lines) > `Positions` (re-place glyphs: alignment) > `Mesh` (rebuild vertices from cached positions). `UniTextDirty.FullRebuild = Text | Font | Direction`; `All = Mesh | Positions | Layout | FullRebuild`. `SetDirty(flags)` ORs into the pending flags, registers the component once and raises `DirtyFlagsChanged`.

Frame flow (all dirty components share one scheduled pass):
1. Your `Update`/`LateUpdate` set `Text`, `FontSize`, `color`, ...; flags accumulate; nothing is processed yet. Several edits in one frame cost one pass per component.
2. `Canvas.preWillRenderCanvases`: validate/init, then the **first pass** (parse markup, analyse, BiDi, shape) for components whose text, font or direction changed — in parallel on a worker pool (not on WebGL or single-core; static toggle `UniTextBase.UseParallel`).
3. `Canvas.willRenderCanvases`: line breaking and auto-size, mesh preparation, glyph rasterization into the shared atlas, mesh generation, GPU flush, apply (writes `ResultSize`), then `Committed(UniTextCommitChanges)` and `LayoutCommitted` per component that reprocessed.
4. Only now do `ResultSize`, `ResultGlyphs`, `GlyphCount`, `CodepointCount`, `CleanText`, `Buffers.lines`, range lists and `PreferredHeight` describe the new text — in the same frame, but after all your scripts.

If atlas/GPU delivery is not ready the batch retries next frame. A component that is not active and enabled is not registered (no processing). In the editor the pass is skipped during domain reload and player builds.

Same-frame alternatives:

| Need | Option | Notes |
|---|---|---|
| A size now, without touching the displayed text | `MeasureText(in TextMeasureOptions)` | full pipeline (styles, fallback, direction, wrap) but bypasses the resolver; leaves displayed text, caches and dirty flags alone; main thread only |
| Height for a width (Canvas text) | `GetHeightForWidth(w)` | no rect change |
| React when geometry is final | `LayoutCommitted += handler` | main thread; raised only when *this* text reprocessed; `Committed` says which outputs changed (`Content`, `Layout`, `GlyphGeometry`, `Appearance`) |
| Force the canvas pass | `Canvas.ForceUpdateCanvases()` | unverified whether it runs UniText's hooks in every case |
| Force a layout rebuild | `LayoutRebuilder.ForceRebuildLayoutImmediate(rect)` | works; `UniText` implements `ILayoutElement` and runs `EnsureFirstPassComplete` |

Invalidation model — what to pass to `SetDirty` when you changed something outside the property setters:

| Change | Pass |
|---|---|
| source text changed behind the component's back (resolver output, language switch) | `SetDirty(UniTextDirty.Text)` |
| font data or stack changed | `UniTextDirty.Font` |
| width-affecting custom state | `Layout` |
| alignment-like change only | `Positions` |
| colours/appearance only | `Mesh`, or `SetAppearanceDirty()` |
| force a rebuild with identical text | `SetDirty(UniTextDirty.Text)` |
| Animator wrote a serialized field | `UniTextAnimationBridge` + handler(s), or subscribe `Animated` and call `SetDirty` |

`SetDirty(UniTextDirty, UniTextCommitChanges)` additionally declares which outputs change (must not be `None`). Rect changes invalidate by themselves: a width change repositions when the lines can be reused (re-lays out otherwise), a height-only change repositions (non-windowed), a parent change re-lays out. Modifier property writes through `GetModifier<T>()` route to the minimum stage that modifier declares; structural style changes (`Styles.Add/Remove`, preset swaps) cost a re-parse.

## Cost of each kind of change

| Change | Stage | Mobile |
|---|---|---|
| `color` alpha | none (one-element fade: `CanvasGroup` on the Canvas render root, vertex alpha in the world batch) | `OK` — free, animate freely |
| `color` RGB | `Mesh` | `LIMIT` — many texts per frame |
| `HorizontalAlignment`, `VerticalAlignment` | `Positions` | `OK` |
| `FontSize`, `WordWrap`, `Padding`, `AutoSize`, `Min/MaxFontSize`, `FitSteps`, rect width | `Layout` (re-break lines) | `LIMIT` — do not animate `FontSize` per frame on many texts; scale the transform instead |
| `Text`/`SetText` with new characters, `Font`, `FontStack`, `Language`, direction, style graph change | re-parse + re-shape | `OK` for HUD counters (guarded by skip-if-unchanged); `LIMIT` for long texts every frame |
| `Styles.Add/Remove`, preset swap, `RevealModifier.Collapse` | re-parse (`Text`) | `AVOID` per frame; set once |
| `MeasureText` with `options.text` | re-parses and re-shapes both texts | `AVOID` per frame — cache the result |
| `Hide()` / `Show()` | none (no re-parse, shape, layout or mesh) | `OK` — the pooling path |
| `SetActive(false)` / `enabled = false` / empty text | `DeInit`: atlas refs, processor, font provider, mesh generator released; re-enable rebuilds from scratch | `LIMIT` — never as a pooling mechanism |

## Serialized state = public properties

Public properties are generated from private serialized `[StateProperty]`/`[StateField]` fields (names = field name capitalised: `fontSize` → `FontSize`). Assigning an equal value does nothing (equality gate), so `label.FontSize = 36f` when already 36 is free. They do not appear on the `UniTextBase` API page (it lists protected fields) but exist in source and samples. List-like state (`Styles`, `StylePresets`) is a `StyledList<T>` (`Add/Remove/RemoveAt/Insert/Clear/Replace/Move/ReplaceAll/ToArray`) publishing one structural change per mutation.

| Property | Type | Default | Invalidates | Notes |
|---|---|---|---|---|
| `Text` | `string` | `""` | `Text` | getter returns the serialized field only; setter normalizes CRLF to LF and clears a `SetText` override |
| `Font` | `UniTextFont` | null | `Font` | primary when both `Font` and `FontStack` are set |
| `FontStack` | `UniTextFontStack` | null | `Font` | fallbacks |
| `FontSize` | `float` | **36** | `Layout` | clamped to >= 0.01; ignored while `AutoSize` |
| `WordWrap` | `bool` | true | `Layout` | |
| `Padding` | `Vector4` (Left, **Bottom**, Right, Top) | 0 | `Layout` | hit area stays the whole rect |
| `HorizontalAlignment` | enum `Start=0, Center=1, End=2, Justify=3, Left=4, Right=5` | `Start` | `Positions` | `Start`/`End` follow paragraph direction (RTL-aware); `Left`/`Right` are physical |
| `VerticalAlignment` | enum `Top=0, Middle=1, Bottom=2` | `Top` | `Positions` | |
| `AutoSize` | `bool` | false | `Layout` | largest size in [Min, Max] that fits; with wrap a word is never split (shrinks to Min instead); windowed text uses Min |
| `MinFontSize` / `MaxFontSize` | `float` | 10 / 72 | `Layout` when auto-size | |
| `FitSteps` | `TypedList<FitStep>` | empty | `Layout` | empty = font size is the only lever |
| `Styles` / `StylePresets` | `StyledList<Style>` / `StyledList<StylePreset>` | empty | structural → `Text` | |
| `UseGlobalStylePreset` | `bool` | true | reconciles presets | opt-out for raw logs/debug overlays |
| `RenderMode` | `UniTextRenderMode` | `SDF` | `Mesh`; drops staged glyphs | per component |
| `Language` | `string` (BCP-47) | null | `Text` | implemented as a whole-text language modifier |
| `color` | `Color` (overrides `Graphic.color`) | white | RGB → mesh; alpha → none | |
| `raycastTarget`, `maskable` | `Graphic` members | true / true | | set `raycastTarget = false` on non-interactive `UniText`; `UniTextWorld` has its own `RaycastTarget` |

`UniText` extras: `CanvasRenderers`, `CanvasClipRect`, `RenderRoot`, `GetMaxContentWidth()`, `GetMinContentWidth()`, `GetHeightForWidth(float)`, `static LanguageMatches(string, string)`. `UniTextWorld` extras: `SortingOrder` (0), `SortingLayerID` (0), `Lit` (false), `CastShadows` (false), `Standalone` (false), `RaycastTarget` (true), static `Active`, `Activated`/`Deactivated`, render-data events; changing sorting/shadows/standalone re-keys the batch.

## Read-only and runtime members

| Member | Meaning / trap |
|---|---|
| `RawText` (`ReadOnlyMemory<char>`) | runtime source before the resolver; the full input even when virtualized |
| `ResolvedText`, `RenderedText`, `CleanText` (`ReadOnlySpan<char>`, pooled) | resolver output; what the parser reads (windowed text: the window); text with markup stripped |
| `TextOverride` (`TextOverrideSource`: `None`, `SetText`, `Resolver`) | why rendered text differs from `Text` |
| `TextResolver` (`IUniTextResolver`) | get/set; assigning clears an active document source and marks `Text` dirty |
| `CodepointCount`, `RenderedCodepoints` (`ReadOnlySpan<int>`), `TextSpan` (`TextRange`) | codepoint space used by every range API; 0/empty before the first rebuild |
| `ResultSize` (`Vector2`), `ResultGlyphs` (`ReadOnlySpan<PositionedGlyph>`), `GlyphCount` | computed size and laid-out glyphs; valid after the frame's canvas pass |
| `PreferredHeight` | content-box height at the current rect width (vertical padding excluded); cached; stale until a pass |
| `CurrentFontSize` | effective size incl. auto-size (windowed auto-size reports `MinFontSize`; before the first layout `MaxFontSize`) |
| `PrimaryFont` | explicit `Font`, else `FontStack.PrimaryFont` (null for asset-less text) |
| `Buffers` (`UniTextBuffers`) | `lines` (`PooledBuffer<TextLine>`, `.count` = line count), `orderedRuns`, `codepoints`, `baseDirection` |
| `TextProcessor`, `MeshGenerator`, `FontProvider` | internals exposed for custom modifiers |
| `CurrentDirtyFlags`, `IsVisible`, `IsWorldSpace` | pending flags, visibility, true on world text |
| `RenderRoot` (`RectTransform`) | Canvas only: hidden child holding glyph renderers, inline media, decorations (created lazily, main thread) |
| `GetPaddedRect()` | rect minus padding (pixel-adjusted on a pixel-perfect canvas); main thread |
| `SetAllDirty/SetVerticesDirty/SetMaterialDirty` | ignored (uGUI invalidation is a no-op; Canvas `SetMaterialDirty` triggers an appearance rebuild) |
| `AddRule(ParseRule)` / `RemoveRule(ParseRule)` | standalone rules only (`NoparseTagRule`, `BackslashEscapeRule`, `LineBreakParseRule`, ...); other rules log an error |
| `GetModifier<T>()`, `GetModifier(Type)`, `TryGetModifier<T>(out T[, out Style])`, `GetModifiers<T>(List<T>, bool includeChildren=false)`, `HasModifier<T>()`, `TryGetStyle<T>`, `TryGetWholeTextStyle<T>`, `GetStylesOfType<T>()` | live runtime instances; search local styles, then preset copies, descending into `CompositeModifier` children; `T` may be an interface. `GetModifier<T>()` returns the **first** match, including a modifier nested in a composite |
| `SetWholeText<T>(string parameter = null)`, `ClearWholeText<T>()`, `ToggleWholeText<T>(string)`, `GetWholeTextParameter<T>()` (`T : BaseModifier, new()`) | add/update/remove a local whole-text style; shared preset assets are never touched |
| `EnsureStyleFor<T>(ParseRule)` / `EnsureStyleFor(BaseModifier, ParseRule)` | find-or-add a style pairing a modifier with a rule |
| `GetRangeText(TextRange)`, `Units(TextUnit[, TextRange])`, `CountUnits`, `UnitAt`, `TryGetLabeled(string label, out TextRange)` | structure queries in codepoint space |
| `CaptureTextSnapshot()` → `TextSnapshot` | immutable rendered text + revision; **throws before the first parse** |
| `GetRangeBounds(int start, int end, IList<Rect>)`, `CollectRangeEntries(...)` | per-line rects of a codepoint range, local space |
| Documents: `Document` (`Rope`), `SetDocument(Rope, bool takeOwnership)`, `IsWindowed`, `DocumentTop/Left`, `ScrollDocumentTo/By`, `RevealDocumentSpan`, `ScrollToCodepoint/Paragraph`, `VisibleWindow`, `DeclareVisibleWindow(Rect)`, `ReleaseDeclaredWindow()`, `ViewportRect` | long text above `VirtualizationThreshold` (16384 UTF-16 chars) is windowed; see [unitext-layout-documents.md](unitext-layout-documents.md) |
| Statics | `UseParallel`; consts `MaxLayoutExtent`, `LegibilityFloorPixels`, `RangeInteractionEventOrder`, `ComponentDefaultEventOrder` |

## Text assignment and measuring

```csharp
public string Text { get; set; }                                   // serialized; normalizes CRLF; clears the SetText override
public void SetText(string source);                                // null = empty; skipped if same chars as the current string/scratch source
public void SetText(ReadOnlySpan<char> source);                    // copied into pooled scratch; skipped if unchanged; safe with pooled builders
public void SetText(StringBuilder source);                         // copied into scratch; skipped if unchanged
public void SetText(char[] source, int start, int length);         // keeps the array; ALWAYS re-reads (caller may edit in place)
public void SetText(ReadOnlyMemory<char> source);                  // keeps the memory; ALWAYS re-reads; must stay valid until next assignment; no CRLF normalization
public Vector2 MeasureText(in TextMeasureOptions options = default);
public struct TextMeasureOptions { public string text; public float? maxWidth, maxHeight, fontSize, minFontSize, maxFontSize;
                                   public bool? autoSize, wordWrap; public Vector4? padding; }
```

- Skip-if-unchanged applies only when the current text came from a string or from the span/`StringBuilder` overloads (scratch buffer) — not when the characters came from a `char[]`/`ReadOnlyMemory` buffer or `SetDocument`; then every `SetText` rebuilds. Code that used `SetText(sameText)` to force a rebuild must call `SetDirty(UniTextDirty.Text)`.
- `SetText` never writes the serialized field and never dirties a scene or prefab. `Text =` after `SetText` clears the override and re-sources from the serialized string. `Text = sameString` is a no-op unless a `SetText` override is active.
- Setting empty text releases the pipeline (`DeInit`) on non-document hosts; real text afterwards rebuilds from scratch. For short empty phases use `Hide()`.
- `MeasureText`: null `maxWidth`/`maxHeight` = unconstrained (not "the component rect"); other null fields use the component's values; dimensions are **outer** (padding included); with `autoSize` the font shrinks into `maxWidth x maxHeight`; returns the padding size if the pipeline cannot start; main thread only.
- No `SetText(string, args)` formatting overloads exist: format yourself and pass a span or `StringBuilder`.

## Colour, visibility, fade, pooling

| API | Behavior | Cost |
|---|---|---|
| `Hide()` / `Show()` / `IsVisible` | stops drawing and pointer hit-testing, keeps layout, mesh, atlas glyphs and pooled buffers; the text can still take `SetText` while hidden; Canvas: cull + `CanvasGroup` (`blocksRaycasts`/`interactable` off) on the render root; World: batch membership flipped | `Show()` after `Hide()` costs no re-parse/shape/layout/mesh |
| `color` alpha | fades glyphs, layers, emoji, sprites and decorations as one element | no rebuild; alpha 0 still draws and takes pointer events → `Hide()` at the end |
| `color` RGB | mesh rebuild | `Mesh` stage |
| `text.FadeTo(0f, timing)` (when the MoveIt package is installed) | animates the alpha on `UniText` and `UniTextWorld` | |
| disable component / `SetActive(false)` | releases everything; re-enable = full rebuild | avoid for pooling |

Pool by `Hide()`/`Show()`. A hidden `UniTextWorld` stops following a camera.

## Threading

- All component API is main-thread: `Graphic`/`RectTransform` access, `GetPaddedRect`, `MeasureText`, `FindAll`, `RenderRoot`, hit tests, `SetText`.
- Processing runs parts on worker threads: modifiers' apply and glyph callbacks run on workers, so custom modifiers must not touch `UnityEngine.Object` APIs. Modifiers stay enabled across parses (since 3.20.0): reset per-parse state in `BeforeApply`, not `OnEnable`.
- Resolvers run on the main thread, once per source change. `Committed`, `LayoutCommitted` and `GlyphsFiled` are raised on the main thread. Subscribing/unsubscribing `FrameUpdated` from worker-run modifier lifecycle is safe (deferred).
- Pooled spans and buffers (`CleanText`, `RenderedCodepoints`, `ResultGlyphs`, `Buffers.*`) are valid only until the next rebuild: copy what must outlive it. `TextPointerEvent` instances are reused across emissions: never retain one.

## Events

`Rebuilding`, `GlyphsFiled`, `RectHeightChanged`, `DirtyFlagsChanged(UniTextDirty)`, `FrameUpdated` (per frame while enabled; keeps the editor pumping frames while subscribed — unsubscribe), `LayoutCommitted`, `Committed(UniTextCommitChanges)`, `Animated`, `TextClicked(TextPointerEvent)`, `ContextRequested`, `PointerPressed`, `PointerLongPressProgress`, `HoverChanged(TextHitResult)` (hover tracking runs only while subscribed), `BeforeGenerateMesh` (ordered event), `OnResolveLayoutWidth`. `TextPointerEvent` carries `Hit`, `Trigger`, `Kind`, `PointerId`, `ScreenPosition`, `EventCamera`, `Modifiers`, `Consumed` (set true to stop propagation to parents). Routing and modifier events: [unitext-interaction-links.md](unitext-interaction-links.md).

## Hit testing

```csharp
// not compiled
bool IsOverLink(UniText label, Canvas canvas, Vector2 screenPos)
{
    var cam = canvas.renderMode == RenderMode.ScreenSpaceOverlay ? null : canvas.worldCamera;
    TextHitResult hit = label.HitTestRange(screenPos, cam, 0f);   // 0 disables the nearest-glyph fallback (default 20)
    if (!hit.hit) return false;
    var link = label.GetModifier<LinkModifier>();                  // null unless a style with LinkModifier exists
    return link != null && link.TryGetRange(hit.cluster, out _);
}
```

Overloads: `HitTestRange(Vector2 local, float maxDistance = 20)` and `HitTestRange(Vector2 screen, Camera cam, float maxDistance = 20)` → `TextHitResult { hit, glyphIndex, cluster, glyphPosition, distance }`; `HitTestCaret(Vector2 screen, Camera cam)` → `int` (also `(..., out bool upstream)`); `IsOverText(Vector2 screen, Camera cam)`. `cluster` is a codepoint index in rendered text (offset by `RenderedCodepointOffset` when windowed). Use `HitTestRange` for entities (links, mentions). Prefer the `TextClicked`/modifier events over polling:

```csharp
// not compiled
label.TextClicked += e =>
{
    if (e.Hit.hit) Debug.Log(label.GetRangeText(new TextRange(e.Hit.cluster, 1)));   // copy fields; do not store 'e'
};
```

## Ranges, glyphs and lines

- `BaseModifier.GetRanges(List<ModifierRange>)` returns the modifier's ranges in text order (throws if the modifier is not attached to a text). `ModifierRange` carries `Modifier`, `Identity`, `Segment`, `Range` (`TextRange`, rendered-text codepoints), `PrimaryValue` (URL/id), `Label`, `Channel`, `IsValid`.
- `ResultGlyphs` is a span of `PositionedGlyph { glyphId, cluster, x, y, fontId, scale, shapedGlyphIndex, left, top, right, bottom }`; `Buffers.lines` holds `TextLine { range, runStart/Count, glyphStart/Count, width, widthPx, baseline, top, bottom, boxLeft, boxWidth, alignment, endedByMandatoryBreak, IsRtl }`. Read `baseline`, `top`, `bottom` for vertical metrics (`advance` was removed in 3.x).
- `TextRange { start, length }`: `End` (exclusive), `Contains(int)`, `Overlaps(TextRange)`, constructor `(start, length)`.
- All indices are **codepoints**, not UTF-16 chars (`CodepointCount`, not `Text.Length`).

Value and utility types:

| Type | Definition |
|---|---|
| `UnitValue` | `float value; UnitKind unit`; `UnitValue.Absolute(f)`, `Percent(f)`, `Em(f)`, `Delta(f)`, ctor `(float, UnitKind)`, `ResolvePx(float emSize)` (em multiplies; absolute/delta pass through) |
| `UnitKind : byte` | `Absolute` (`24`, `24px`), `Percent` (`150%`), `Em` (`0.5em`), `Delta` (`+10`/`-5` when the context default is absolute) |
| `UnitVector2` | `Vector2 value; UnitKind unit` (for example `0.1em -0.1em`) |
| `TextHitResult` | `hit`, `glyphIndex`, `cluster`, `glyphPosition`, `distance`; `TextHitResult.None` |
| `ParameterAttribute`, `GenerateParametersAttribute` (type must be `partial`; errors UTP001-UTP004), `OptionsAttribute("@paints")`, `UnitAttribute` | custom-modifier authoring; see [unitext-markup-system.md](unitext-markup-system.md) |

## Range ownership and parameters

Cascade (weak → strong): modifier field → rule default parameter → markup token → **owned value**. Code, range-state rules and driver clips all use this path. Descriptors live in a nested `Param` class per modifier: `ColorModifier.Param.Color` (`ParameterDescriptor<ColorModifier, Color32>`), `WaveModifier.Param.Amplitude` (`Vector2`), `RevealModifier.Param.Front` (`UnitValue`), `LinkModifier.Param.Url` (`string`).

```csharp
// BaseModifier
public void GetRanges(List<ModifierRange> results);
public RangeQuery Ranges();                                          // = RangeQuery.For(this)
public OwnedParameterSet<TModifier,TValue> Own<TModifier,TValue>(ParameterDescriptor<TModifier,TValue> parameter,
        ParameterComposition composition = ParameterComposition.Replace, int priority = 0) where TModifier : BaseModifier;

// RangeQuery (immutable; filters AND together)
RangeQuery WhereLabel(string);                       // "#label" anchor; empty string throws
RangeQuery WhereParameter<TModifier,TValue>(ParameterDescriptor<TModifier,TValue>, TValue value);
RangeQuery WhereToken(ParameterDescriptor, string rawToken);   // mutually exclusive with WhereParameter
RangeQuery WhereBare(); WherePrimaryValue(string); WhereChannel(RangeChannel);
RangeQuery Intersecting(TextRange); Within(TextRange); Where(ModifierRangePredicate); Skip(int); Take(int);   // Take(0) = all
void Collect(List<ModifierRange>);  bool Matches(in ModifierRange);

// ModifierRange: OwnedParameter<TValue> Own<TModifier,TValue>(descriptor, composition, priority); TValue Resolve<...>(descriptor)
public sealed class OwnedParameter<TValue> : IDisposable { TValue Value {get;set;} TValue Baseline; bool IsAlive; void Release(); void Dispose(); }
public sealed class OwnedParameterSet<TModifier,TValue> : IDisposable {
  TValue Value {get;set;}            // broadcast to all members now AND to members added by later parses
  int Count; ModifierRange GetRange(int i); void SetValue(int i, TValue v);   // per-member, until the next parse
  void Withhold();                   // deactivate every member's value, keep membership
  event Action Changed;              // after re-materialization against a new parse
  bool IsAlive; void Release(); void Dispose(); }
public enum ParameterComposition : byte { Replace, Add, Multiply, Custom }
```

Composition by value type: `float`, `int`, `Vector2` support add and multiply; `Color32` multiply (and replace); `UnitValue`/`UnitVector2` add (with mixed units the owned value wins whole); enums, `bool`, `string` replace only. Owned values compose on top of the cascade; conflicts resolve by `ParameterComposition`, then `priority`, then declaration order.

Lifetime rules:
- A range stays addressable while the parser preserves its `Identity`; **an edit inside the range retires the identity and releases ownership taken on it** (`OwnedParameter`).
- `OwnedParameterSet` is standing: ranges that stop matching release, new matches receive the broadcast `Value`, survivors keep theirs, `SetValue(i, ..)` lives only until the next parse (it is reset by every parse).
- `Dispose()` equals `Release()` and is idempotent. Every member of `OwnedParameter` except `IsAlive` and `Release` throws `ObjectDisposedException` once dead.
- `using var alert = ...Own(...)` releases ownership at scope exit: keep the handle in a field for a lasting override, release it in `OnDestroy`/`OnDisable`.
- `Own` on a modifier with no owner throws `InvalidOperationException` ("not attached to a text component").

```csharp
// not compiled
public sealed class StockWarning : MonoBehaviour
{
    [SerializeField] UniText text;                       // text uses "<color #alert>...</color>"; <color> must be registered (global preset or text.Styles)
    OwnedParameterSet<ColorModifier, Color32> alert;     // a field: 'using var' would release at scope exit

    void OnEnable()  { text.LayoutCommitted += Acquire; }
    void OnDisable() { text.LayoutCommitted -= Acquire; alert?.Release(); alert = null; }

    void Acquire()                                       // after the first processing pass the modifier has an owner
    {
        if (alert != null) return;
        alert = text.GetModifier<ColorModifier>().Ranges().WhereLabel("alert").Own(ColorModifier.Param.Color);
        alert.Value = new Color32(255, 64, 64, 255);     // every matching range, now and after future parses
        // alert.SetValue(0, new Color32(255, 160, 0, 255));   // first match only, until the next parse
    }
}
```

Dim a disabled option without touching authored colour: `Own(ColorModifier.Param.Color, ParameterComposition.Multiply)` with `Value = new Color32(128, 128, 128, 255)`. Single-range form: `ranges[i].Own(ColorModifier.Param.Color)` returns an `OwnedParameter<Color32>`. Inspect ranges: `var list = new List<ModifierRange>(); text.GetModifier<LinkModifier>().GetRanges(list);`.

## `ILayoutElement` and preferred sizes (`UniText`)

`preferredWidth`/`preferredHeight` are **explicit** interface members: `((ILayoutElement)label).preferredHeight`; `minWidth`/`minHeight` are 0 and `flexible` is -1. Public equivalents: `PreferredHeight`, `GetMaxContentWidth()` (widest line, padding included), `GetMinContentWidth()` (widest unbreakable run, at Min size under auto-size), `GetHeightForWidth(float)`. For `ContentSizeFitter` Preferred/Preferred: width = widest line without wrapping, height at the current rect width. A layout rebuild reading these forces the first pass synchronously on the main thread: `LIMIT` in large layout groups.

## Text resolver

`TextResolver` (`IUniTextResolver`) substitutes the source text without a serialized change (`TryResolve(ReadOnlyMemory<char> source, out ReadOnlyMemory<char> result)`, optional `OnAttached`/`OnDetached(UniTextBase owner)`). It runs on the main thread when the source text changes or is marked dirty, not on every rebuild; `MeasureText` bypasses it; `RawText` is the key, `ResolvedText` the translation, `RenderedText` what is parsed. When the output changes while the source does not (language switch) call `SetDirty(UniTextDirty.Text)`. Full treatment: [unitext-interaction-links.md](unitext-interaction-links.md).

## Recipes

Every tag used below exists only after a style registers it (global preset, `Styles`, or a preset on the component).

### Zero-allocation HUD counter

Goal: a score label with no allocation and no rebuild when unchanged. Setup: none beyond the component.

```csharp
// not compiled
public sealed class ScoreLabel : MonoBehaviour
{
    [SerializeField] UniText label;
    readonly char[] buffer = new char[16];
    int shown = int.MinValue;

    public void Set(int score)
    {
        if (score == shown) return;
        shown = score;
        score.TryFormat(buffer, out var n);                          // BCL span formatting
        label.SetText(new ReadOnlySpan<char>(buffer, 0, n));         // copied to pooled scratch; skipped if equal to the current text
    }
}
```

Result: one rebuild per real change. Gotcha: use the span overload — `SetText(char[], 0, n)` works but always re-reads. Use `SetText`, not `Text =`, for runtime values.

### Pooled damage numbers (world text)

Setup: prefab `World Text (UniText)` (scale 0.01, `RaycastTarget` off), `Include World Shaders` on.

```csharp
// not compiled
public sealed class DamagePopup : MonoBehaviour
{
    [SerializeField] UniTextWorld text;
    public void Play(Vector3 pos, string value, Color32 rgb)
    {
        transform.position = pos;
        text.SetText(value);                                   // a hidden text still accepts SetText
        text.color = new Color32(rgb.r, rgb.g, rgb.b, 255);
        text.Show();
    }
    public void SetAlpha(float a)                              // per-frame fade: alpha only, no rebuild
    {
        var c = text.color; c.a = a; text.color = c;           // keep RGB constant
    }
    public void End() { text.Hide(); }                         // stops drawing AND pointer events; keeps mesh/layout for reuse
}
```

Gotcha: never `SetActive(false)` pooled texts (rebuild from scratch on re-enable). `Standalone` only when sprites must sort between neighbours (one extra draw call each).

### Size to content before showing

```csharp
// not compiled
Vector2 size = label.MeasureText(new TextMeasureOptions { text = "Long <b>markup</b> string", maxWidth = 300f });
label.rectTransform.sizeDelta = size;                          // outer size, padding included
```

Cache the result: measuring another `text` re-parses and re-shapes both texts and runs the whole pipeline. For layout groups use `ContentSizeFitter` instead.

### Read layout in the same frame

```csharp
// not compiled
label.Text = "New text";
Canvas.ForceUpdateCanvases();            // see Unverified: believed to run the same canvas hooks UniText uses
float h = label.PreferredHeight;         // fresh after the forced pass
// source-verified alternatives: label.MeasureText(); label.GetHeightForWidth(w); or react: label.LayoutCommitted += OnLaidOut;
```

Reading `PreferredHeight` right after `Text =` inside `Update` returns the previous value.

### Item names with rarity colours

Markup route: register `Style.Tag(new ColorModifier(), "epic", "#A335EE")` once in the global preset, then `SetText($"<epic>{name}</epic> x{count}")` (`<epic=#FF00FF>` overrides the default). Theming route: write `<color #rarity>name</color>` and `Own(ColorModifier.Param.Color)` on label `rarity` per theme change. Keep tags inside the translated string; never concatenate tag fragments across translations.

### Localization

- Unity Localization: the component context menu `Localize` adds a `LocalizeStringEvent` with a persistent listener `OnUpdateString -> SetText(string)` (the runtime-only overload, so edit-mode previews do not dirty the scene). By code: `localize.OnUpdateString.AddListener(text.SetText);`.
- Resolver route (key in, translation out, no serialized change):

```csharp
// not compiled
sealed class KeyResolver : IUniTextResolver
{
    readonly Dictionary<string, string> table;
    public KeyResolver(Dictionary<string, string> table) { this.table = table; }
    public bool TryResolve(ReadOnlyMemory<char> source, out ReadOnlyMemory<char> result)
    {
        if (table.TryGetValue(source.ToString(), out var s)) { result = s.AsMemory(); return true; }   // must stay valid until the next call
        result = default; return false;                                                                  // false = parse the source unchanged
    }
}
label.TextResolver = new KeyResolver(table);
label.SetDirty(UniTextDirty.Text);       // after a language switch: output changed, source did not
```

Language/fonts: `UniText.Language = "ja"` (whole-text `locl` + family `preferredLanguage`) or `UniTextSettings.Language`; `<lang=...>` per range (needs its style registered).

### Auto-size label

```csharp
// not compiled
label.WordWrap = true;
label.AutoSize = true; label.MinFontSize = 18f; label.MaxFontSize = 48f;   // FontSize ignored while AutoSize is on
float used = label.CurrentFontSize;                                          // effective size after the layout pass
```

The result depends on the rect (width and height); with wrap a word is never split — the size drops to `MinFontSize`, where a long word may then overflow or break. Optional `FitSteps` (`TrackingFitStep`, `GlyphScaleFitStep`, `LineHeightFitStep`) squeeze before shrinking. Resizing the rect re-fits.

### Preset per theme at runtime

```csharp
// not compiled
var preset = ScriptableObject.CreateInstance<StylePreset>();
var composite = new CompositeModifier();
composite.Modifiers.ReplaceAll(new BaseModifier[] { new ColorModifier(), new BoldModifier() });
preset.Styles.Add(new Style { Modifier = composite, Source = new TagRule("t") { DefaultParameter = "#FF4500" } });
text.StylePresets.Clear();
text.StylePresets.Add(preset);          // one structural change (re-parse); Destroy(preset) when done
```

A `CompositeModifier` splits a parameter by `;`, one segment per child (the sample feeds `"#00B4D8;2"` as colour then spacing).

### Animator- or tween-driven fields

The Animator writes serialized fields directly, bypassing setters, so nothing invalidates. Add `UniTextAnimationBridge` beside the text and put `UniTextFieldsAnimationHandler` (or `UniTextWorldFieldsAnimationHandler`) in its `Handlers`; `ModifierFieldsAnimationHandler` covers modifier fields; per-range animation goes through ownership or `UniTextDriver`. Animated `color` alpha costs no rebuild; size/wrap/auto-size set `Layout`, alignment sets `Positions`. Without the bridge the component does no per-frame diff work.

### Opt a component out of markup

`label.UseGlobalStylePreset = false;` (with empty `Styles`/`StylePresets`) renders `<b>` literally; or register `BackslashEscapeRule`/`CodeSpanRule`/`NoparseTagRule` through `AddRule` for escapes. Untrusted user text with the global preset on interprets tags (including `<link>`): use the opt-out or escape.

## Pitfalls

1. **Stale reads**: `ResultSize`, `ResultGlyphs`, `GlyphCount`, `CodepointCount`, `CleanText`, `PreferredHeight`, ranges reflect the previous pass until the current frame's canvas pass. `GetRanges`/`Own` throw while the modifier has no owner; `CaptureTextSnapshot()` throws before the first parse.
2. **`SetText(same)` is a no-op** (3.20.0 breaking change); `SetText(char[]/ReadOnlyMemory<char>)` always rebuilds and keeps your buffer; `SetText` does not normalize CRLF (the `Text` setter does).
3. **Empty text and `SetActive(false)` tear the pipeline down**; toggle with `Hide()`/`Show()`. Hidden text still re-processes if you change it.
4. **Faded-out text is still drawn and still hit-testable**: `Hide()` when the fade ends.
5. **Ownership**: `using var` releases at scope exit; editing inside an owned single range retires its identity; standing sets re-materialize after every parse and reset per-member `SetValue` overrides; `Color32` supports Multiply/Replace only; `bool`/`string`/enums only Replace.
6. **Pooled data**: `TextPointerEvent`, `CleanText`, `RenderedCodepoints`, `ResultGlyphs`, `Buffers.*` are reused — copy before the next rebuild or emission.
7. **Subscriptions**: unsubscribe `FrameUpdated` (it keeps the editor pumping); `LinkModifier` events live on the modifier instance and die with the style graph — re-subscribe after replacing styles. `GetModifier<T>()` returns the first match, including nested composite children (for example the `ColorModifier` inside `LinkPreset`); use `GetModifiers<T>` or labelled ranges.
8. **uGUI dirty calls are no-ops** (`SetAllDirty/SetVerticesDirty/SetMaterialDirty`); `preferredWidth` does not compile; `GetPreferredValues`, `ForceMeshUpdate`, `textInfo` do not exist.
9. **Per-frame costs**: do not toggle styles/presets or `Collapse` per frame; do not animate `FontSize`/`WordWrap`/`Padding` on many texts; do not call `MeasureText` per frame; every `Styles` rule is walked at each markup trigger in every component that uses it (`LIMIT` for big global presets).
10. **Canvas rebuilds**: a text change hands a mesh to the Canvas (rebuild/batch break) — keep fast-changing text on its own Canvas; world text batches per sorting context.
11. **Atlas growth**: first appearance of unseen glyphs rasterizes and uploads them; draw common strings once during loading ([unitext-components-setup.md](unitext-components-setup.md), warm-up recipe).
12. Doc-vs-code: `UnitValue` is documented as a Core type but sits in the `LightSide.UniText` assembly.

API changes that break old code (full list: [unitext-version-traps.md](unitext-version-traps.md)):

| Version | Change |
|---|---|
| 3.0.0 | `UniTextDirtyFlags` → `UniTextDirty` (`Color`→`Mesh`, `Alignment`→`Positions`, `FontSize` folded into `Layout`); `IParseRule` → abstract `ParseRule`; `HitTest`/`HitTestScreen` → `HitTestRange` (+ `HitTestCaret`); `TextClicked` carries `TextPointerEvent`; `RangeClicked/Entered/Exited` removed (use `InteractiveModifier`/`LinkModifier` events); static `BeforeProcess/MeshApplied/AfterProcess` replaced by per-component `FrameUpdated`/`LayoutCommitted` |
| 3.2.0 | `RangeQuery`, `OwnedParameter`, `#label` anchors; modifier properties became `ParameterDescriptor`s |
| 3.8.0 | `UniTextWorldRaycaster` → `WorldPointerRaycaster`; renames (`GlyphQuad` → `UniText.Glyph`, `LanguageMatching.Matches` → `UniText.LanguageMatches`); resolvers run on the main thread once per source change; long text virtualizes |
| 3.9.0 / 3.10.0 | `VisibleWhenAttribute` and `CursorType` moved to the Core assembly; phase-driven modifiers own a `Clock` (default `Scaled`) |
| 3.12.0 | `GetMaxContentWidth/GetMinContentWidth/GetHeightForWidth`; world shaders off by default for new projects |
| 3.20.0 | `SetText(same)` no-op; `UniText` no longer `ILayoutController`; modifiers stay enabled across parses; `TextLine.advance` removed; `TextLongPressProgress` → `PointerLongPressProgress`; alpha fade without rebuild |

## Unverified

- `Canvas.ForceUpdateCanvases()` running UniText's `preWillRenderCanvases`/`willRenderCanvases` hooks in every case: Unity invokes both events from it (reasoned, not run). `MeasureText`, `GetHeightForWidth` and `LayoutRebuilder.ForceRebuildLayoutImmediate` are source-verified alternatives.
- `Own`/`GetRanges` before the first parse: the throw is inferred from the owner check (the owner is set when the parser registers the modifier); create ownerships after the first `LayoutCommitted`.
- `FitSteps` property spelling/type on `UniTextBase` (generated from the `fitSteps` field; not used in any source file read).
- `UniTextAnimationBridge.Handlers` as the code-side member name (the inspector list is confirmed, the C# accessor was not read).
