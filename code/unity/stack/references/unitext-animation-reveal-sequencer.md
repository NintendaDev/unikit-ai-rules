# UniText — Animation: Reveal, Typewriter, Sequencer, Hide and Fade

> **Base path:** `<UniTextRoot>` is the folder of the UniText package — the one whose `package.json` has `"name": "media.lightside.unitext"` (find it with `Glob **/media.lightside.unitext/package.json`; it may sit under `Packages/` or `Library/PackageCache/`). Never hard-code its location.
> See also: [unitext-range-state-rules.md](unitext-range-state-rules.md), [unitext-animation-phase.md](unitext-animation-phase.md), [unitext-markup-system.md](unitext-markup-system.md), [unitext-runtime-api.md](unitext-runtime-api.md), [unitext-components-setup.md](unitext-components-setup.md), [unitext-performance-mobile.md](unitext-performance-mobile.md), [unitext-version-traps.md](unitext-version-traps.md), [unitext-tmp-migration.md](unitext-tmp-migration.md)

---

Scope: the reveal (typewriter) modifier and its handlers, the `UniTextDriver` clip sequencer, and hiding/fading whole texts. Phase-driven glyph effects (wave, shake, ...) are in `unitext-animation-phase.md`; hover/press feedback is in `unitext-range-state-rules.md`.

Mobile verdicts (`OK` / `LIMIT` / `AVOID`) in this file come from reading the package source and docs. Nothing was profiled and the sources give no measured numbers.

## 1. Lookup — task → answer

| Task | Use | Code? | Details |
|---|---|---|---|
| Typewriter from code | `RevealModifier` + write `Front` every frame from your own loop/tween | yes | §3.1 |
| Typewriter at constant characters/second | `Front = UnitValue.Absolute(charsPerSecond * t)` | yes | §3.1 |
| Typewriter with constant total duration | `Front = UnitValue.Percent(100f * t / seconds)` | yes | §3.2 |
| Typewriter by words or lines | `reveal.Unit = TextUnit.Word` / `Line` (markup third slot) | yes | §3.2, §9.5 |
| Skip ("tap to complete") | set `Front` to `100%`; with handlers glyphs still settle within their `Duration` | yes | §3.3 |
| Pause / resume | stop adding to your own `t`; set `reveal.Clock` for in-flight glyph effects | yes | §3.4 |
| Know when typing finished | no event exists: your loop knows; or poll `driver.IsPlaying` | yes | §3.5 |
| Restart or replace text mid-typing | reset `Front` to 0 in the same step as the text change | yes | §3.6 |
| Pauses on punctuation | no `<pause>` tag; drive `Front` from your own time table | yes | §9.2 |
| Staggered letter entrance (title) | sweeping `Front` over a `Pop`/`Drop`/`Rain` entry | yes (loop) | §9.3 |
| Staggered word entrance without code | tagged words + `PerRange` + one `UniTextDriver` clip with `Stagger` | no | §9.3, §7 |
| Fixed intro sequence, scrub in editor | `UniTextDriver` clips | no | §7 |
| Damage-number pop and fade, pooled | `Pop` entry + `Front` tween + alpha fade + `Hide()` | yes | §9.4 |
| Hide whole text (pooled label, tooltip) | `text.Hide()` / `text.Show()` | one line | §8 |
| Fade whole text | `text.color` alpha only (no rebuild), then `Hide()` | one line | §8, §9.6 |
| Fade one tagged range | `AlphaModifier` + `Own(...)` or a driver clip | small | §8, §9.7 |
| Hide a part of the text | `RevealModifier` on a tag, `Front = 0%` | no | §2 |
| Custom per-glyph appearance | `GlyphRevealing` event (code) or a custom `RevealHandler` | yes | §6 |
| Shared looks for the whole project | `UniTextRevealHandlers` asset | no | §5 |
| TextMeshPro `maxVisibleCharacters` | no counterpart; rewrite manually as `RevealModifier.Front` | yes | §3.1, `unitext-tmp-migration.md` |

## 2. Reveal model

`RevealModifier` (namespace `LightSide`) hides every grapheme cluster behind a frontier, `Front`. **Nothing advances `Front` by itself**: its default is `100%` (everything visible), and `<reveal=fade,50%>` is a static position, not an animation. The looks come from handler entries (§4, §5); without any handler, clusters appear binary (pop in).

### 2.1 Prerequisite: a reveal style must exist

A fresh `UniText` has no reveal style and understands no tag: `GetModifier<RevealModifier>()` returns null and `<reveal>` renders as literal text. The package ships prefabs with empty `styles` and `UniTextSettings` with no global style preset. For the general tag bootstrap see [unitext.md](../unitext.md) section "Tag vocabulary bootstrap" and `unitext-markup-system.md`.

| Way to register | How |
|---|---|
| Inspector picker | `Styles` → `+` → "Reveal": offered as **Whole Text** (no markup) and as **Tag · `<reveal>`** |
| C# whole text | `text.Styles.Add(Style.WholeText(reveal));` |
| C# tag | `text.Styles.Add(Style.Tag(reveal, "reveal"));` (the tag name is yours; `reveal` is the convention) |
| Shared | one `StylePreset` asset holding the Reveal style plus entries, attached to all dialogue texts (each text gets its own modifier copy) |
| Project-wide | the **Global Style Preset** in the LightSide project settings |

### 2.2 Parameters (tag slots, positional, comma-separated)

| Slot | Property | Type | Default | Meaning |
|---|---|---|---|---|
| 0 | `HandlerName` | string | `""` | Name of the handler entry (§5). Empty = the unnamed default entry. |
| 1 | `Front` | `UnitValue` | `100%` | Frontier. `50%` = percent, `12abs` = absolute units. Always write the suffix. |
| 2 | `Unit` | `TextUnit` | `Cluster` | `Cluster`, `Word`, `Line`, `Paragraph`. Changing it in code converts an absolute `Front` to the same text position in the new unit. A per-range value counts only with `PerRange = true`. |
| 3 | `Collapse` | bool | `false` | `true` removes hidden clusters from the layout (`display:none`, text reflows); `false` keeps their space (`visibility:hidden`). |
| 4 | `ReserveFor` | string | `""` | Label (`#label`) of a range that the last shown line keeps room for. Works only with `Unit = Line` and `Collapse = true`. |

Non-parameter members (no markup slot):

| Member | Default | Meaning |
|---|---|---|
| `Provider` (`IRevealHandlerProvider`) | empty inline provider | The handler entries (§5). Replacing it resets running animations and re-parses. |
| `Clock` (`PlaybackClock`) | `Unscaled` | Time source of per-glyph appear/hide phases: `Scaled`, `Unscaled`, `Manual` (advance with `AdvanceTime(float)`). Set it at setup, not while glyphs animate. |
| `PerRange` | `false` | `false`: one shared frontier over all covered clusters (ranges reveal one after another in text order). `true`: each range fills independently and simultaneously. Per-range `Front` values need `true`. |
| `VisibleRange`, `VisibleRangeIn(TextRange)` | – | Codepoint span the frontier currently shows. |
| `IsClipping` | – | True while any covered cluster is held back. Updated at mesh build; false before the first build. |
| `GlyphRevealing` | – | Event `RevealGlyphHandler(in RevealGlyphInfo)`, raised per rendered glyph during mesh build, possibly on a worker thread (§6.1). |

C# values: `UnitValue.Percent(float)`, `UnitValue.Absolute(float)`. The `RevealModifier.Param.Front` descriptor is used for owned values and driver clips.

### 2.3 Tag syntax (the tag name exists only after §2.1)

| Markup | Meaning |
|---|---|
| `<reveal>text</reveal>` | unnamed entry; `Front` from the field |
| `<reveal=fade>…</reveal>` | entry named `fade` (must exist in the provider) |
| `<reveal=fade,50%>…</reveal>` | named entry, half shown (static) |
| `<reveal=fade,12abs>…</reveal>` | first 12 clusters |
| `<reveal=fade,0%,word>…</reveal>` | frontier counts words |
| `<reveal=,4abs,line,true>…</reveal>` | unnamed entry, 4 lines, `Collapse` on |
| `<reveal #intro=fade,0%>…</reveal>` | `#label` after the tag name; used by `Ranges().WhereLabel("intro")`, `ReserveFor` and driver queries |

Markup sets only the starting `Front`. Overlapping or nested `<reveal>` ranges: a cluster belongs to the innermost one (its `Front`, handler, hide).

### 2.4 How a frame is computed

1. Visible units = percent: `clamp01(p/100) × total`; absolute: `clamp(value, 0, total)`. Spaces count as clusters; mandatory line breaks are never hidden and never counted; tags are not counted (absolute counts run over the markup-stripped text).
2. Hidden clusters are flagged. With `Collapse = false` the flags are rewritten right before each mesh build, so a per-frame `Front` is a mesh-only rebuild. With `Collapse = true` the verdict is written before itemization, so every frontier move re-parses and re-wraps (text reflows).
3. With no handler: `visible = floor(front)` (binary). With handlers: `visible = ceil(front)`, so a cluster starts its effect the moment `Front` exceeds its ordinal; the frontier cluster is blended fractionally.
4. Each cluster whose visibility flips starts a timed phase of `Duration` seconds (default 0.25 s). `Progress` goes 0→1 while appearing and 1→0 while hiding; `Progress = 1` is the settled glyph in both directions. Reversing mid-flight continues from the current state.
5. While `GlyphRevealing` has a subscriber, the frontier cluster renders fractionally and the text is marked dirty.

### 2.5 Time sources in this area

| Component | `Clock` default | Meaning |
|---|---|---|
| `RevealModifier` (glyph phases) | `Unscaled` | keeps animating at `timeScale = 0` |
| `UniTextDriver` | `Scaled` | stops at `timeScale = 0` |
| `TransitionPlayback` (rules) | `Unscaled` | see `unitext-range-state-rules.md` |
| phase modifiers (wave, shake) | `Scaled` | see `unitext-animation-phase.md` |

Decide deliberately for pause menus and slow motion.

### 2.6 Cost knobs (mobile)

| Knob | Verdict | Reason |
|---|---|---|
| Per-frame `Front` write, `Collapse = false` | OK | mesh-only rebuild per frame, no re-layout |
| Glyph effects playing | OK for dialogue lines, titles, numbers; LIMIT for multi-thousand-glyph pages | the text is dirty every frame while any glyph animates; no idle ticking afterwards |
| `Collapse = true` swept every frame | LIMIT (short boxes); AVOID on long text | every move re-parses; `Unit = Line` also re-wraps |
| `GlyphRevealing` subscriber | OK | runs per rendered glyph at mesh build; keep it allocation-free |
| Driving layout parameters (size, spacing, `Collapse`) from a clip | AVOID on long text | re-layout every frame |

## 3. Driving `Front` from C#

### 3.1 The recommended way: write `Front` per frame

Move the frontier from any clock, tween or coroutine. There is no `Play()` on `RevealModifier`. Use the absolute unit for constant characters/second; clusters are counted with `text.CountUnits(TextUnit.Cluster)` after the first parse (over-counting is harmless because `Front` clamps).

```csharp
// not compiled — checked against public signatures only
using System;
using System.Collections;
using LightSide;
using UnityEngine;

public sealed class DialogueTypewriter : MonoBehaviour
{
    [SerializeField] private UniTextBase text;
    [SerializeField] private float charsPerSecond = 40f;

    public event Action Finished;                       // UniText has no completion event; this one is ours
    public bool IsTyping => typing != null;

    private RevealModifier reveal;
    private Coroutine typing;

    private void Awake()
    {
        var provider = new InlineRevealHandlerProvider();
        provider.Entries.ReplaceAll(new[]
        {
            new RevealHandlerEntry
            {
                Name = "",                                              // default entry
                Handler = new FadeRevealHandler { Duration = 0.1f },
                HideHandler = new FadeRevealHandler { Duration = 0f },  // instant reset when Front recedes
            },
        });
        reveal = new RevealModifier { Provider = provider, Front = UnitValue.Percent(0f) };
        text.Styles.Add(Style.WholeText(reveal));       // or Style.Tag(reveal, "reveal")
    }

    public void Say(string markup)
    {
        if (typing != null) StopCoroutine(typing);
        typing = StartCoroutine(Type(markup));
    }

    public bool Skip()                                  // wire to a tap; false = nothing was typing, advance the page
    {
        if (typing == null) return false;
        StopCoroutine(typing);
        typing = null;
        reveal.Front = UnitValue.Percent(100f);
        Finished?.Invoke();
        return true;
    }

    private IEnumerator Type(string markup)
    {
        reveal.Front = UnitValue.Absolute(0f);          // set before the text so the first build is already hidden
        text.Text = markup;
        yield return null;                              // let the first parse run so counts exist
        var total = text.CountUnits(TextUnit.Cluster);
        for (var t = 0f; charsPerSecond * t < total; t += Time.unscaledDeltaTime)
        {
            reveal.Front = UnitValue.Absolute(charsPerSecond * t);   // fractions blend the frontier glyph
            yield return null;
        }
        reveal.Front = UnitValue.Percent(100f);
        yield return new WaitForSecondsRealtime(0.1f);  // let the last glyph effect settle (= entry Duration)
        typing = null;
        Finished?.Invoke();
    }
}
```

`Style.WholeText(reveal)` affects the whole text; with the tag variant only `<reveal>` ranges are revealed and the rest is always visible. This works on `UniText` (Canvas), `UniTextWorld` and `UniText3D` because all derive from `UniTextBase`.

While a driver clip or an owned value holds `Front` (`Replace` composition), writing the `Front` property has no visible effect; do not mix control surfaces on one parameter.

### 3.2 Constant duration, words, lines

- Constant total time regardless of length: `reveal.Front = UnitValue.Percent(100f * t / seconds);` (speed in chars/s then varies with length).
- Words per second: set `reveal.Unit = TextUnit.Word;` before writing `Front`, then use absolute values (each step is one word including its trailing spaces/punctuation).
- Lines: `reveal.Unit = TextUnit.Line;`. A box that grows as lines appear also needs `reveal.Collapse = true` (every move re-wraps, see §2.6). Line units need a wrapped text.
- Never type by assigning growing substrings (`SetText(s.Substring(0, i))`): every step re-parses and re-lays out, and markup breaks half-way. The frontier replaces this.

### 3.3 Skip

Set `Front` to `Percent(100f)` (see `Skip()` above). With **no** handler entries the remaining text appears that frame. With handlers there is no snap-complete API for in-flight phases: every remaining glyph starts its appear effect at once and settles within its `Duration` (0.25 s default). Make skip look instant by keeping dialogue entries short (0.08–0.15 s). A rarely needed alternative is a second entry with `Duration = 0` selected through `reveal.HandlerName = "instant"` (this re-parses).

### 3.4 Pause and resume

Freeze your own time source (stop adding to `t`, or `StopCoroutine` and keep `t`): `Front` simply stays. Glyph effects already in flight run on `reveal.Clock`, default `Unscaled`, so `timeScale = 0` does not freeze them. Set `reveal.Clock = PlaybackClock.Scaled` if a game pause must freeze them too, or `Manual` plus `reveal.AdvanceTime(dt)` per frame for exact control; set the clock before the text starts animating. For a driver: `driver.Pause()` / `driver.Play()`.

### 3.5 Know when typing has finished

Neither `RevealModifier` nor `UniTextDriver` has a completion event or callback. Pick one:

1. Your own loop/tween knows: reaching 100% is "finished". Add the entry's `Duration` if the last glyph effect must settle too (`provider.TryGet("", out var e)` gives `e.Handler.Duration`). Raise your own event as in §3.1.
2. Poll `!reveal.IsClipping`, but only after the first build that followed `Front >= 100%` (it is updated at mesh build and false before the first build).
3. Driver: `yield return new WaitUntil(() => !driver.IsPlaying);` or test `driver.Progress >= 1f`. A finite run sets `IsPlaying` to false by itself.
4. `text.Committed` / `LayoutCommitted` fire after every processed pass (typing triggers one per frame). Use them to place a "continue" marker, not as a completion signal.

### 3.6 Restart and replace text mid-typing

- Restart the same text: `reveal.Front = UnitValue.Percent(0f)`, then run the loop again. With handlers the visible glyphs animate out first (hide effect, default = appear backwards); give the entry `HideHandler = new FadeRevealHandler { Duration = 0f }` for an instant reset.
- Assign new text while typing: `Front` keeps its value (a percentage keeps the proportion, an absolute count keeps the count) and in-flight glyph effects are dropped when a range's extent changes. Set `Front` back to 0 in the same step as `text.Text = next` and restart the loop. `SetText` with identical characters is a no-op (no parse), so it restarts nothing.
- Counting units: spaces count, newlines do not, markup does not, and units are grapheme clusters, not UTF-16 chars. Use `text.CountUnits` or `StringInfo`, never `string.Length`.

### 3.7 Per-glyph time-based effects: what to expect

- Handlers are time-based per glyph: a glyph starts its `Duration` effect when the frontier crosses it. A sweeping frontier therefore produces a cascade of overlapping effects (the staggering).
- A jump of `Front` (for example 0→100% in one step) starts every glyph's effect simultaneously; there is no stagger from a jump.
- The visibility diff is taken per mesh build against the previous build. Setting 0 and then 100 in the same frame animates nothing; leave at least one build at the start value.
- `GlyphRevealing` is different: it gets frontier-derived progress (`clamp01(front − ordinal)`), not time-based, so each glyph's effect spans one ordinal of `Front`.

## 4. Reveal handler catalog

A handler class is `[Serializable]`, namespace `LightSide`, and works in every text component. Tag names such as `fade` or `pop` are **entry names you author** in a provider (§5), never built-in tags. All handlers (except Composite) multiply alpha by progress; `Scale`, `Slide` and `Spin` make that optional through `fade` (default true). No handler restricts units, so all accept every `Unit`. Offsets and radii are in pixels, angles in degrees.

Mobile verdict for every row: **OK** — O(1) quad math per glyph, no extra geometry; the cost is the per-frame mesh rebuild while glyphs animate (see §2.6). Sweeping thousands of glyphs per frame is the only LIMIT case.

| Class (inspector group) | Look | Fields (defaults) | Base / easing | Mobile |
|---|---|---|---|---|
| `FadeRevealHandler` (Essentials) | opacity rises | `startOpacity` 0 | Eased, CubicOut | OK |
| `ScaleRevealHandler` (Essentials) | grows from a scale | `startScale` (0,0); `fade` true | Geometric, pivot (.5,.5), CubicOut | OK |
| `SlideRevealHandler` (Essentials) | slides in from an offset | `offset` (0,−12); `fade` true | Eased, CubicOut | OK |
| `SpinRevealHandler` (Essentials) | rotates and scales into place | `angle` 180; `startScale` 0.35; `fade` true | Geometric | OK |
| `TintRevealHandler` (Essentials) | multiplicative colour flash into the authored colour | `startTint` (64,224,255,255); `startOpacity` 0.15 | Eased, Linear | OK |
| `PopRevealHandler` (Physical) | springs from zero scale past 1 and settles | `overshoot` 1.7 (0 = none); `pivot` (.5,.5) | no easing field | OK |
| `DropRevealHandler` (Physical) | falls from above, bounces, squashes on landing | `height` 28; `angle` 12; `squash` 0.18 | BounceOut, pivot bottom-centre | OK |
| `DominoRevealHandler` (Physical) | swings upright from a bottom corner | `angle` 82; `fromRight` false | Eased | OK |
| `FlipRevealHandler` (Physical) | unfolds around an axis | `axis` `RevealFlipAxis.Horizontal` or `Vertical` | Geometric | OK |
| `StretchRevealHandler` (Physical) | settles from a tall narrow silhouette | `startWidth` 0.35; `startHeight` 1.65 | Geometric, pivot (.5,0) | OK |
| `SwingRevealHandler` (Physical) | damped swing from the top edge | `angle` 55; `oscillations` 1.25 | pivot (.5,1) | OK |
| `SpiralRevealHandler` (Expressive) | inward spiral with rotation and scale | `radius` 24; `turns` 0.8; `spread` 0.65; `startScale` 0.2 | Geometric | OK |
| `BurstRevealHandler` (Expressive) | flies in from per-glyph radial directions | `distance` 22; `angle` 90; `startScale` 0.15 | Geometric | OK |
| `ShakeRevealHandler` (Expressive) | damped deterministic jitter | `amplitude` 7; `angle` 16; `frequency` 8 | – | OK |
| `GlitchRevealHandler` (Expressive) | jitter, shear, cyan/magenta tint, opacity flicker | `amplitude` 7; `shear` 0.3; `flicker` 0.7; `frequency` 12 | – | OK |
| `RainRevealHandler` (Expressive) | drops from staggered heights with wind and tilt | `height` 38; `wind` 9; `angle` 18 | Geometric | OK |
| `WaveRevealHandler` (Expressive) | damped vertical ripples | `amplitude` 12; `cycles` 1.5; `spread` 0.7 | – | OK |
| `SkewRevealHandler` (Expressive) | straightens from a horizontal shear | `angle` 34 | Geometric, pivot (.5,0) | OK |
| `ChaosRevealHandler` (Expressive) | random direction, rotation, scale and colour flash per glyph | `distance` 26; `angle` 220; `color` 0.65 | Geometric | OK |
| `CompositeRevealHandler` (Composition) | stacks handlers in one entry | `handlers[]`; own `Duration` 0.25 = slot length | – | OK (cost = sum of children) |

Notes:

- Every handler carries `Duration` (seconds, default 0.25, `0` = instant). Eased handlers add an `Ease` field (`Ease.Of(EasingType.CubicOut)` style struct); geometric ones add a normalized `Pivot` (0,0 bottom-left to 1,1 top-right).
- `Composite` timing: the composite's `Duration` is the slot length; a child with a shorter `Duration` settles early, a child with `Duration = 0` starts settled, a longer child is capped to the slot. Build in code with `composite.Handlers.ReplaceAll(new RevealHandler[] { ... })`.
- Randomness: Burst, Chaos, Rain, Shake, Glitch, Spiral and Wave derive per-glyph variation from `info.ordinal`. With `Unit = Word` or `Line` all clusters of one unit share the ordinal, so the glyphs of a word move alike.
- Each entry can also carry a `HideHandler` (plays when `Front` recedes). Unset = the appear handler plays backwards; a `HideHandler` with `Duration = 0` hides instantly.
- 3D module (assembly "UniText 3D"): `Flip3DRevealHandler`, `FlyIn3DRevealHandler`, `Extrude3DRevealHandler`, `Tumble3DRevealHandler` act fully only on `UniText3D`; on flat text they mostly fade or scale. See `unitext-3d-text.md`.

## 5. Handler registries and name resolution

`RevealModifier.Provider` holds `RevealHandlerEntry { Name, Handler, HideHandler }` items. Two provider types:

| Provider | Entries live in | Use when |
|---|---|---|
| `InlineRevealHandlerProvider` (default, empty) | the modifier itself (`Entries` list: `ReplaceAll`, `Add`, `Remove(name)`) | one text, or code-built texts |
| `AssetRevealHandlerProvider` | a shared `UniTextRevealHandlers` asset (`Asset` property) | one look library for the whole project; edits reach every user live |

Create the asset via `Assets → Create → LightSide → UniText → Reveal Handlers`. Code: `new AssetRevealHandlerProvider { Asset = handlers }` (same pattern as the paint and sprite asset providers). A changed entry that a modifier references re-parses its text; a value-only change just rebuilds the mesh. The asset exposes `Names`, `Count`, `TryGet(name, out entry)`, `Enumerate()`.

Name resolution:

- The tag's first slot (or `HandlerName` on the modifier for a bare tag; a per-range value overrides it) selects an entry by name, `OrdinalIgnoreCase`.
- Empty name selects the entry whose `Name` is empty. No such entry means binary reveal.
- Unknown non-empty name: one `LogWarning` (`[RevealModifier] Reveal handler "x" is not defined in the provider.`) and that range reveals binary. An entry without a `Handler` is also binary.
- Sample vocabulary for reference: unnamed (pop), `fade`, `drop`, `pop`, `spin`, `rain`, `glitch`, `composite`.

## 6. Custom reveal appearance

Contract for both options: transform only the supplied glyph quad, be safe on a worker thread (no `UnityEngine.Object` APIs), and be the **identity at `Progress = 1`** (otherwise settled glyphs stay deformed and hide playback breaks). Wrapping handlers call children with `info.WithProgress(t)`.

### 6.1 Code-only hook: `GlyphRevealing`

```csharp
// not compiled — checked against public signatures only
reveal.GlyphRevealing += OnGlyphRevealing;              // unsubscribe with -= in OnDisable

static void OnGlyphRevealing(in RevealGlyphInfo info)
{
    var t = info.Progress;                              // 0..1, 1 = settled; frontier-derived, not time-based
    if (t >= 1f) return;
    var g = info.generator;
    g.OffsetQuad(g.faceBaseIdx, 0f, 14f * (1f - t));    // rise 14 px
    var colors = g.Colors;
    for (var i = 0; i < 4; i++)
        colors[g.faceBaseIdx + i].a = (byte)(colors[g.faceBaseIdx + i].a * t);
}
```

Not serialized; coexists with serialized handlers. `RevealGlyphInfo` fields: `generator` (`faceBaseIdx`, `Vertices` in BL-TL-TR-BR order, `Colors`, `OffsetQuad`, `FontSize`), `text`, `cluster`, `unit` (range of the whole unit), `ordinal`, `count`, `front`, `hiding`, `Progress`, plus `WithProgress(float)` / `WithFront(float)`.

### 6.2 Serializable handler (usable by name in entries)

Derive from `RevealHandler` (abstract `Apply`, `Duration`), `EasedRevealHandler` (adds `Progress(in info)` = eased progress) or `GeometricRevealHandler` (adds `Pivot` and instance transform helpers). Static helpers on the base: `ApplyOffset`, `ApplyScale`, `ApplyRotation`, `ApplyFade`, `ApplyTint`, `ApplySkewX`, `ResolvePivot`. Mirror the shape of the built-ins (`[Serializable] public sealed partial class`, `[SerializeField, StateProperty]` private fields):

```csharp
// not compiled — checked against public signatures only
using System;
using LightSide;
using UnityEngine;

[Serializable]
public sealed partial class RiseRevealHandler : EasedRevealHandler
{
    [SerializeField, StateProperty] private float height = 18f;

    public override void Apply(in RevealGlyphInfo info)
    {
        var t = Progress(in info);                      // eased 0..1, identity at 1
        ApplyOffset(in info, 0f, height * (1f - t));
        ApplyFade(in info, t);
    }
}
```

It appears in the entry's **Handler** picker once compiled. For effects that move a whole word or line, override `SupportedUnits => TextUnits.Grouping` and read `info.unit` (a unit mismatch only logs a one-time warning and plays unchanged).

## 7. The sequencer: `UniTextDriver`

`UniTextDriver` is a no-code timeline component (`[ExecuteAlways]`, requires a `UniTextBase` on the same GameObject; menu `Add Component → LightSide → UniText → UniTextDriver`). It has one shared timeline in seconds; each **clip** owns one parameter of one modifier across the ranges its query matches and ramps it from `From` to `To` in its own window. It plays automatically in Play Mode (`Play On Enable`) and can be scrubbed in Edit Mode (inspector **Open Timeline** button: tracks, drag, resize, split, duplicate, mute). The modifiers it drives must live in the text's `Styles`, attached `StylePresets` or the global preset (children of a `CompositeModifier` included).

**Members are matched ranges, not letters.** A whole-text style is one member, so `Stagger` does nothing there. Per-letter stagger from a driver would need one range per letter; use a sweeping frontier (§9.3 option A) instead.

### 7.1 Public surface

| Member | Meaning |
|---|---|
| `Play()`, `Pause()` | start/continue and pause; `Play()` after a finished run restarts (from the end for negative `Speed`) |
| `Stop()` | playhead to 0 **and re-applies the t=0 state**; ownership is kept (a `Front` clip with `From = 0%` hides the text again) |
| `Seek(float normalized)`, `Playhead` (seconds), `Progress` (0..1, serialized so Animator/Timeline can key it) | scrubbing |
| `Advance(float seconds)` | adds `seconds × Speed`; works with any clock; the tick source for `Clock = Manual` |
| `Speed` | default 1; negative plays backwards |
| `IsPlaying` | poll it; no events exist |
| `TimelineLength`, `Duration` | `max(Duration, latest clip end)`; `Duration` = fixed length (0 = derive from clips) |
| `Clips` (`StateList<UniTextDriverClip>`) | `Add/Insert/Remove/Clear/ReplaceAll`; changes rebind automatically |
| `Rebind()` | re-resolve clip targets (a no-op until the style graph is built) |

Disabling the component releases every owned parameter (control returns to the normal cascade). After a finite run the last clip keeps holding `To` until the component is disabled.

### 7.2 Playback settings (inspector)

| Setting | Default | Meaning |
|---|---|---|
| Clock | `Scaled` | `Scaled` (stops at `timeScale 0`), `Unscaled`, `Manual` (only `Advance`) |
| Cycles | 1 | number of passes; `-1` = until stopped |
| Repeat (`MotionCycle`) | `Restart` | behaviour from pass 2: `Restart` replays; `PingPong` runs back retracing each curve; `Yoyo` runs back but reads each easing from its own start; `Incremental` replays forward adding each clip's `From→To` travel again per pass (non-interpolating types hold `To`) |
| Play On Enable | on | Play Mode only; deferred until the style graph is built; does not run in Edit Mode |

These four are private serialized fields; see `## Unverified` for code access.

### 7.3 Clip properties (`UniTextDriverClip`, setters public)

| Property | Default | Meaning |
|---|---|---|
| `Start` | 0 | second the window opens |
| `TargetNode`, `ParameterId` | – | modifier node and `ParameterDescriptor.Id` (e.g. `"front"`); set with `SetTarget(StateNodeId, string)` |
| `Query` | all ranges of the target | `RangeQueryDefinition`, see §7.4 |
| `From`, `To` | null | required unless the type is nullable (else `From and To values for 'x' are required.` and the clip is skipped); build with `Param.X.Values.Write(value)` |
| `Composition` | `Replace` | `Replace/Add/Multiply/Custom`; support follows the parameter type (float/int/Vector2: add+multiply; Color32: multiply; `UnitValue`: add; enum/bool/string: replace only) |
| `Priority` | 0 | against other owners of the same parameter |
| `MemberDuration` | **0.5** | seconds one member's ramp lasts (0 = step at its start) |
| `Stagger` | 0 | seconds between member starts, in text order |
| `Easing` | `Linear` | `Ease` per member |
| `Disabled` | false | mute |

Timing: clip length = `MemberDuration + Stagger × (members − 1)` (just `MemberDuration` for ≤ 0 members). It follows how many ranges the query matches now, so `TimelineLength` changes when text edits add or remove tagged ranges. Member k ramps from `Start + Stagger·k` over `MemberDuration` through `Easing`; before its window the clip holds `From`, after it `To`.

Several `Replace` clips on one parameter and priority: the latest started clip drives, earlier ones stop holding. Use `Add`/`Multiply` or different `Priority` to layer.

### 7.4 Query: which ranges a clip addresses

`RangeQueryDefinition` fields (all settable): `Label` (`#label` anchor, e.g. `<reveal #hero=pop>`), `PrimaryValue` (source-emitted value such as a link URL), `FilterToken` (raw markup token of the driven parameter), `BareOnly`, `Channel`, `Area` (`All/Intersecting/Within`) with `AreaStart`/`AreaLength` (codepoints), `Skip`, `Take` (0 = all). It is rebuilt on every bind, so it follows text edits. Code-side equivalent: `modifier.Ranges()` returns an immutable `RangeQuery` (`WhereLabel`, `WhereParameter`, `WhereToken`, `WhereBare`, `WherePrimaryValue`, `WhereChannel`, `Intersecting`, `Within`, `Where`, `Skip`, `Take`, `Collect`, `Own`). An edit inside a range retires its identity and releases ownership taken on it; query-based clips re-bind to the new parse.

### 7.5 Building a driver from code

A clip needs `SetTarget(StateNodeId, parameterId)`, and `BaseModifier.NodeId` is internal. The public way to read the id is `ParameterChange.TargetNode`, filled by `ParameterChange.SetTarget(modifier, ...)`. Build the driver **disabled** and enable it **last**: `Play()` logs `[UniTextDriver] No clip is bound; pick a parameter first.` while nothing is bound, and `Rebind` is a deferred no-op until the text has built its style graph. Play On Enable handles both cases; an explicit `Play()` after `Clips.Add` works only when the graph already exists.

```csharp
// not compiled — checked against public signatures only
var driver = text.gameObject.AddComponent<UniTextDriver>();
driver.enabled = false;                                 // build while disabled, enable last

var probe = new ParameterChange();                      // only used to read the node id of 'reveal'
probe.SetTarget(reveal, RevealModifier.Param.Front, UnitValue.Percent(100f));

var clip = new UniTextDriverClip
{
    From = RevealModifier.Param.Front.Values.Write(UnitValue.Percent(0f)),
    To   = RevealModifier.Param.Front.Values.Write(UnitValue.Percent(100f)),
    MemberDuration = 0.8f,
    Easing = Ease.Of(EasingType.Linear),
};
clip.SetTarget(probe.TargetNode, RevealModifier.Param.Front.Id);   // id is "front"
driver.Clips.Add(clip);
driver.enabled = true;                                  // Rebind, then Play On Enable
```

Query from code: `clip.Query.Label = "intro";` or `clip.Query.Skip = 1; clip.Query.Take = 1;`. Because Clock, Cycles, Repeat and Play On Enable keep their defaults here (Scaled, 1, Restart, on), configure other values on a prefab in the inspector and only add or edit clips from code. For a one-off tween, writing `Front` yourself (§3.1) is shorter and fully scriptable.

Mobile: a clip on a mesh-only parameter (`Front`, `Phase`, tints, alpha) costs one mesh rebuild per frame — OK for short text. A clip on a layout parameter (size, spacing, `Collapse`) re-lays out every frame — AVOID on long text.

## 8. Hiding and fading

| Tool | API | Effect | Mobile and caveats |
|---|---|---|---|
| Hide / show whole text | `text.Hide()`, `text.Show()`, `text.IsVisible = bool` (idempotent) | stops drawing **and** hit-testing; keeps layout, mesh and atlas glyphs; `SetText` still works while hidden; re-show is instant and allocation-free. Also hides range decorations and cloned inline objects of a Canvas text; `Raycast` returns false while hidden. On Canvas text it sets `CanvasGroup.alpha = 0`, `blocksRaycasts = false`, `interactable = false` on the render root | OK. Right tool for pooled list items, damage numbers, tooltips, HUD. Disabling the component instead frees everything and rebuilds from scratch on enable |
| Fade whole text | change only `text.color.a` | fades glyphs, all paint layers, emoji, sprites, range decorations and (Canvas text) cloned inline objects as one element, like a `CanvasGroup`. Canvas text: a lazily added `CanvasGroup` on the render root. World text: multiplied into vertex alpha of the shared batch | OK: no rebuild for an alpha-only change. A change of r/g/b rebuilds the mesh, so keep r/g/b constant while fading. Layers blend individually (outline/shadow show through a half-faded fill). Inline objects of a world text and `Existing`-mode objects keep their own opacity |
| Fade then hide | fade alpha to 0, then `Hide()` | – | **Alpha 0 is not hidden**: the text is still drawn and still takes pointer events, so call `Hide()` after the fade ends |
| Fade one range | `AlphaModifier` (picker: Whole Text and Tag · `<alpha>`; convention tag `alpha`), parameter `Alpha` float 0..1, default **0.5**, token `0.5`, `50%` or two hex digits | multiplies glyph alpha of the range (fills, strokes, shadows, glows, extrusions, decoration lines, colour emoji, inline sprites); the innermost range wins and never compounds; highlights/range backgrounds and scene-object inline objects keep their own opacity | LIMIT: each value change is a mesh rebuild; fine for a few short ranges. Animate with `Own(AlphaModifier.Param.Alpha)` or a driver clip (§9.7) |
| Hide a part of the text | `RevealModifier` on a tag, `Front = 0%` | keeps the space unless `Collapse`; hidden glyphs may animate out via `HideHandler` | OK (§2) |
| Animator keys | `UniTextAnimationBridge` + `UniTextFieldsAnimationHandler` | animate component fields (colour, size, ...) | see `unitext-animation-phase.md` |
| MoveIt `text.FadeTo(0f, timing)` | optional package | animates the same alpha | only when MoveIt is installed |

`UniTextRanges.PrefersReducedMotion` applies to range-state rules only; reveal and the driver never consult it.

## 9. Recipes

### 9.1 Dialogue with pages and tap-to-skip

Goal: one text, several pages, first tap completes the line, second tap shows the next page. Setup: the `DialogueTypewriter` of §3.1 (one `RevealModifier`, created once; do not recreate styles per page). Flow:

```csharp
// not compiled — checked against public signatures only
public void OnTap()                                     // Button / input action
{
    if (typewriter.Skip()) return;                      // was typing: line completed
    if (page + 1 < pages.Length) typewriter.Say(pages[++page]);
    else CloseDialogue();
}
```

Result: `Front` returns to 0 on each `Say`, then types. Gotcha: with long handler `Duration` the skipped line still settles over that time (§3.3).

### 9.2 Punctuation pauses (custom time table)

No pause markup exists in UniText. Build a per-cluster appear-time table over the markup-stripped text and write `Front` as the count of clusters whose time has passed. Add `System.Collections.Generic` and `System.Globalization` to the usings of §3.1.

```csharp
// not compiled — checked against public signatures only
private readonly List<float> times = new();

private IEnumerator TypeDialogue(string markup, float charsPerSecond)
{
    reveal.Front = UnitValue.Absolute(0f);
    text.Text = markup;
    yield return null;                                  // first parse: CleanText now excludes tags
    var clean = text.CleanText.ToString();              // copy: the span is pooled
    times.Clear();
    var clock = 0f;
    var e = StringInfo.GetTextElementEnumerator(clean);
    while (e.MoveNext())
    {
        var el = e.GetTextElement();
        if (el[0] == '\n' || el[0] == '\r') continue;   // line breaks are not on the frontier
        times.Add(clock);                               // this cluster appears at 'clock'
        clock += 1f / charsPerSecond + Pause(el[0]);
    }
    var shown = 0;
    for (var t = 0f; shown < times.Count; t += Time.unscaledDeltaTime)
    {
        var next = shown;
        while (next < times.Count && times[next] <= t) next++;
        if (next != shown) { shown = next; reveal.Front = UnitValue.Absolute(shown); }
        yield return null;
    }
    reveal.Front = UnitValue.Percent(100f);
}

private static float Pause(char c) =>
    c == ',' || c == ';' ? 0.12f : c == '.' || c == '!' || c == '?' || c == '…' ? 0.30f : 0f;
```

Reuse the `times` list (no per-character allocation, no `WaitForSeconds` garbage). `StringInfo` text elements approximate UniText's clusters; a rare mismatch only skews timing slightly.

### 9.3 Staggered title entrance

**Option A — frontier sweep (letters).** Entry `pop` = `PopRevealHandler { Duration = 0.3f }` (or `Drop`, `Rain`, `Spiral`, `Burst`, `Chaos`, `Wave`; or a `CompositeRevealHandler` of Fade + Slide + Scale), and sweep `Front` over about 0.8 s. Each letter pops as the frontier crosses it, giving a cascade of overlapping 0.3 s pops.

```csharp
// not compiled — checked against public signatures only
private IEnumerator TitleIn(float seconds)
{
    reveal.Front = UnitValue.Percent(0f);
    yield return null;                                  // keep one build at the hidden state (§3.7)
    for (var t = 0f; t < seconds; t += Time.unscaledDeltaTime)
    {
        reveal.Front = UnitValue.Percent(100f * t / seconds);
        yield return null;
    }
    reveal.Front = UnitValue.Percent(100f);
}
```

**Option B — per-word stagger, no coroutine.** Markup `<reveal=pop>Rogue</reveal> <reveal=pop>Brick</reveal> <reveal=pop>Dungeon</reveal>` (Tag style from §2.1, entry `pop`), `reveal.PerRange = true`, one driver clip on `RevealModifier.Front`: From `0%`, To `100%`, `MemberDuration 0.4`, `Stagger 0.25`, `Easing` Linear. Clip length = `0.4 + 0.25 × (3 − 1) = 0.9 s`; member k starts at `0.25·k`; adding or removing a tagged word updates `TimelineLength`. To drive only some words, label them (`<reveal #hero=pop>`) and set the clip's `Query` label to `hero`. With `PerRange = false` all ranges share one frontier and per-range values are not what you want.

### 9.4 Damage number: pop, hold, fade, recycle (pooled)

Setup: the pooled text has a Reveal style with a `Pop` default entry (`PopRevealHandler { Duration = 0.3f }`, as in §3.1 with that handler). The text is only `Show()`n and `Hide()`n, never destroyed.

```csharp
// not compiled — checked against public signatures only
private IEnumerator Play(int amount)
{
    text.Show();
    var c = text.color; c.a = 1f; text.color = c;
    reveal.Front = UnitValue.Percent(0f);
    text.SetText(amount.ToString());                    // no-op if unchanged; use the span/StringBuilder overload to avoid string garbage
    yield return null;                                  // one build at the hidden state
    for (var t = 0f; t < 0.12f; t += Time.unscaledDeltaTime)   // digits pop left to right
    {
        reveal.Front = UnitValue.Percent(100f * t / 0.12f);
        yield return null;
    }
    reveal.Front = UnitValue.Percent(100f);
    yield return new WaitForSecondsRealtime(0.5f);
    for (var t = 0f; t < 0.3f; t += Time.unscaledDeltaTime)    // alpha-only change: no rebuild
    {
        c.a = 1f - t / 0.3f;
        text.color = c;
        yield return null;
    }
    text.Hide();                                        // alpha 0 would still draw and take pointers
}
```

Gotcha: do not set `Front = 0` and `Front = 100` in the same frame expecting an animation (§3.7). Keep r/g/b of `color` constant, otherwise each frame rebuilds the mesh.

### 9.5 Reveal by word, by line, or only one range

- Word by word: `reveal.Unit = TextUnit.Word;` and `Front = Absolute(wordsShown)`, or markup `<reveal=fade,0%,word>`.
- Line by line with growing box: `<reveal=,0abs,line,true>` or `reveal.Unit = TextUnit.Line; reveal.Collapse = true;`. Expensive (re-wrap per move); keep the text short. `ReserveFor` keeps room beside the frontier for a labelled "continue" range.
- One tagged range of several: `reveal.PerRange = true;` and give the range a label, then own its `Front`:

```csharp
// not compiled — checked against public signatures only
// markup: <reveal #intro=fade,0%>...</reveal>
using var intro = reveal.Ranges().WhereLabel("intro").Own(RevealModifier.Param.Front);
intro.Value = UnitValue.Percent(60f);                   // only the #intro range
```

With `using` the ownership ends at scope exit; keep the handle in a field when the animation outlives the method.

### 9.6 Whole-text fade-out then hide (tooltips, toasts)

```csharp
// not compiled — checked against public signatures only
for (var t = 0f; t < 0.25f; t += Time.unscaledDeltaTime)
{
    var c = text.color; c.a = 1f - t / 0.25f; text.color = c;   // alpha only: no rebuild
    yield return null;
}
text.Hide();
// on re-show: text.Show(); then restore c.a = 1f
```

Do not animate `AlphaModifier` for whole-text fades: it rebuilds the mesh per change.

### 9.7 Fade one tagged range

Setup: an `AlphaModifier` style (picker: Tag · `<alpha>`). Markup `<alpha #ghost=1>spirit</alpha>`.

```csharp
// not compiled — checked against public signatures only
using var o = text.GetModifier<AlphaModifier>().Ranges().WhereLabel("ghost").Own(AlphaModifier.Param.Alpha);
o.Value = 0.3f;                                         // Dispose() releases it
```

`modifier.Own(param)` broadcasts to every range of the modifier. The owned set re-materializes after each parse, so new matches get the broadcast value. Drivers, rules and `Own` share one path, so owners compose by composition and priority instead of overwriting each other.

### 9.8 Title entrance with a driver (inspector, no code)

1. `UniText` with a Reveal style (§2.1); set the modifier's own `Front` to `0%` as well (guards against a one-frame flash before the driver binds).
2. Add `UniTextDriver` on the same GameObject.
3. Clip: pick **Reveal → Front**; `From = 0%`, `To = 100%`, `Start 0`, `MemberDuration 0.8`, `Stagger 0`, `Easing Linear`; empty Query (all ranges).
4. Playback card: Clock `Scaled` (or `Unscaled` for UI that must ignore `timeScale`), Cycles 1, Play On Enable on. Scrub `Progress` in Edit Mode to author.

Result: plays on enable and ends holding `To`. Replay: `driver.Play()`. Reset: `driver.Stop()`. Release control: disable the component (the field then rules; its 100% default means fully visible). For pooled prefabs, Play On Enable replays on every re-enable.

## 10. Pitfalls

**Reveal and typewriter**

1. Reveal never plays by itself: `Front` defaults to 100%, and `<reveal=fade,50%>` is a static position. Something must write `Front` over time (your code, a driver clip, `Own`, an Animator through the bridge).
2. Silent failure when the style does not exist: `<reveal>` renders literally and `GetModifier<RevealModifier>()` is null (the doc one-liner throws a `NullReferenceException`). No default preset provides it.
3. An unknown entry name logs one warning per lookup and reveals binary; an entry without a handler is binary too. Names are case-insensitive and the empty name is the default entry.
4. Always write `%` or `abs` in markup. A bare `4` is read as percent according to a source comment, while the 3.2.0 changelog says "the field's own unit".
5. An owned value beats the field: while a driver clip or `Own` handle holds `Front`, `reveal.Front = …` does nothing visible.
6. Jumps are simultaneous and same-frame 0→100% animates nothing (§3.7). Skip with handlers means "settle within `Duration`", not instant.
7. `Collapse = true` is expensive when swept (re-parse per move, plus re-wrap for `Unit = Line`); `ReserveFor` works only with `Unit = Line` and `Collapse = true`.
8. Mid-typing text change does not reset `Front`; identical `SetText` is a no-op; growing substrings re-parse every step (§3.6).
9. Clocks differ (§2.5): `timeScale = 0` freezes a `Scaled` driver but not an `Unscaled` reveal effect already in flight. Changing `Clock` while glyphs animate restarts or garbles running phases.
10. Handler contract (§6): identity at `Progress = 1`, worker-thread safe, only the supplied quad. `GlyphRevealing` sees frontier-envelope progress; serialized handlers see timed progress. Subscribing flips the frontier cluster to fractional rendering and marks the text dirty.
11. Per-range fronts need `PerRange = true`; with it off, ranges share one axis over the union of covered clusters and a per-range `Unit` is ignored.
12. Hash-based looks with `Unit = Word/Line` move the whole word alike (shared `ordinal`); a "body" effect must declare `SupportedUnits` and read `info.unit`.
13. The four 3D reveal handlers act fully only on `UniText3D`.

**Driver**

14. Members are ranges, not letters (§7).
15. There are no completion or loop events; poll `IsPlaying`/`Progress`.
16. `Stop()` re-applies the t=0 state and keeps ownership; only disabling the component releases it.
17. Code construction traps (§7.5): the `TargetNode` probe, required `From`/`To`, inspector-only playback settings, `Play()` before binding logs an error — build disabled, enable last.
18. Overlapping `Replace` clips on one parameter and priority: the latest started wins. `Incremental` is seamless across clip hand-offs only when their `From→To` travels are equal.
19. Per-frame cost: mesh-only parameters rebuild the mesh each frame; layout parameters re-lay out each frame (§2.6, §7.5).

**Hide and fade**

20. Alpha 0 is not hidden: call `Hide()` after the fade-out.
21. Change only alpha; any r/g/b change rebuilds the mesh. `AlphaModifier` rebuilds per change and does not dim highlights/range backgrounds or `Existing`-mode scene objects.
22. Do not disable/destroy and recreate toggled texts; `Hide()`/`Show()` keep the pipeline and re-show is free.

**Removed or renamed APIs** (see `unitext-version-traps.md`): `RevealModifier.Fill` and `VisibleClusters` are gone, use `Front` (`UnitValue.Percent(50f)`, markup `50%`/`12abs`); easing fields are `Ease` structs (`Ease.Of(EasingType.CubicOut)`); reveal now animates out when `Front` recedes (`HideHandler`); `UniTextPhaseDriver` is replaced by `UniTextDriver` (a looping clip on a modifier's `Phase`); the "effect" vocabulary became "rule" (`RangeStateEffect → RangeStateRule`, `UniTextEffects.For → UniTextRanges.For`).

## Unverified

- `UniTextDriver.Clock`, `Cycles`, `CycleMode` (Repeat) and `PlayOnEnable` are private `[SerializeField, StatePassive]` fields and no public property was found; `Speed` is a hand-written property. Whether code can set them is not confirmed (compile `driver.Cycles = -1;` once). Workaround: configure them on a prefab.
- Bare number token in `<reveal=fade,4>`: read as percent per a source comment, contradicted by a changelog wording. Always use `%` or `abs`.
- A user-assembly `RevealHandler` subclass written without `partial` and `[StateProperty]` (the built-ins all use both): compile and serialization unconfirmed. If in doubt use `GlyphRevealing`.
- Whether the first parse is available synchronously after `text.Text = …`: recipes wait one frame before reading `CleanText`/`CountUnits`; no public rebuild method was found on `UniTextBase`.
- The `ParameterChange.TargetNode` probe for building clips (§7.5) compiles from public signatures; its behaviour was not run.
- Tie-break between equal-priority `Replace` contributions from a driver clip, a rule and an owned value is not confirmed.
- A possible one-frame flash of fully visible text when a driver binds late (mitigated by `Front = 0%` on the modifier field).
- `text.FadeTo` from the optional MoveIt package: not checked.
- No code in this file was executed in Unity; snippets were checked against signatures only.
