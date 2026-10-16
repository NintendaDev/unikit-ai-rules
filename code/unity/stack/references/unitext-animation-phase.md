# UniText — Phase-driven text animation (wave, shake, glitch, rolling, scramble, marquee)

> **Base path:** `<UniTextRoot>` is the folder of the UniText package — the one whose `package.json` has `"name": "media.lightside.unitext"` (find it with `Glob **/media.lightside.unitext/package.json`; it may sit under `Packages/` or `Library/PackageCache/`). Never hard-code its location.
> See also: [unitext-animation-reveal-sequencer.md](unitext-animation-reveal-sequencer.md) (typewriter / reveal, driver clips), [unitext-range-state-rules.md](unitext-range-state-rules.md) (hover/press/focus-driven parameter changes), [unitext-runtime-api.md](unitext-runtime-api.md) (per-range ownership, `Ranges()`, labels), [unitext-markup-system.md](unitext-markup-system.md) (tags, parameter slots, tag vocabulary), [unitext-effects-paint.md](unitext-effects-paint.md), [unitext-materials-shaders.md](unitext-materials-shaders.md), [unitext-performance-mobile.md](unitext-performance-mobile.md), [unitext-3d-text.md](unitext-3d-text.md)

---

Mobile verdicts in this file (`OK` / `LIMIT` / `AVOID`) come from reading the package source and docs. Nothing was profiled and no source states measured numbers.

**Read this first: no animation tag works out of the box.** UniText has no built-in tag vocabulary. `WaveModifier`, `ShakeModifier`, ... are ordinary modifiers; `<wave>` means something only on a component whose `Styles` (or an attached/global `StylePreset`) pair `new WaveModifier()` with the tag `wave`. A fresh `UniText` / `UniTextWorld` has zero styles, the shipped prefabs have empty `styles`, `UniTextSettings` has no global style preset, and the inspector style picker does not offer animation tags as ready-made tag rules. Without the style the text shows `<wave>` as literal characters. Registration is one line (section 2). The tag names used below (`wave`, `shake`, ...) are conventions used by the package samples, not constraints.

## 1. Lookup — "I want a ... text"

| I want | Modifier (C# type) | Conventional tag | Typical markup | Mobile |
|---|---|---|---|---|
| Wavy / snake / sine line (title, "loading...") | `WaveModifier` | `wave` | `<wave=0 6,5,0.6>Title</wave>` | OK (few short texts) |
| Shaking / trembling / jitter (anger, low HP, impact) | `ShakeModifier` | `shake` | `<shake=1.5,6,15>NO!</shake>` | OK (few short texts) |
| Letters spinning in place | `SpinModifier` | `spin` | `<spin=0.5,0.1>wheee</spin>` | OK (few short texts) |
| Pulsing / breathing / "puffing" (NEW badge) | `PulseModifier` | `pulse` | `<pulse=0.15,6,0>NEW</pulse>` | OK (few short texts) |
| Wobbling / jelly rocking | `WobbleModifier` | `wobble` | `<wobble=8,4,0.8>jelly</wobble>` | OK (few short texts) |
| Bouncing / hopping letters | `BounceModifier` | `bounce` | `<bounce=6,9,0.35>boing</bounce>` | OK (few short texts) |
| Floating / drifting / ghostly | `FloatModifier` | `float` | `<float=2,0.6,1.3>ghost</float>` | OK (few short texts) |
| Pendulum / hanging sign swinging | `PendulumModifier` | `pendulum` | `<pendulum=15,2,0.5>creak</pendulum>` | OK (few short texts) |
| Glitch / RGB split / signal loss | `GlitchModifier` | `glitch` | `<glitch=0.6,4,3,14>SIGNAL LOST</glitch>` | LIMIT (extra quads, heavier shader tier) |
| Liquid / melting / wobbling outline | `DeformModifier` | `deform` | `<deform=0.02,5>slime</deform>` | AVOID (heaviest shader tier) |
| Rolling counter / odometer / split-flap board | `RollingModifier` | `roll` (digits), `flap` (letters) | `<roll>12,345</roll>` + code drives `Roll` | OK (one counter) |
| Scramble / "decrypt" reveal of characters | `ScrambleModifier` | `scramble` | `<scramble>ACCESS GRANTED</scramble>` + code drives `Progress` | OK (cost only while `Progress < 1`) |
| News ticker / long song title scrolling in a box | `MarqueeModifier` | none (whole-text style) | no markup; `Style.WholeText(new MarqueeModifier{...})` | OK (cheapest continuous effect; Canvas `UniText` only) |
| Typewriter / per-glyph reveal | `RevealModifier` | `reveal` | see [unitext-animation-reveal-sequencer.md](unitext-animation-reveal-sequencer.md) | see that file |
| Whole text animated, no markup | any glyph animation | — | `text.SetWholeText<WaveModifier>("0 3,5,0.5")` | as the modifier |
| Keep animating while `Time.timeScale == 0` (pause menu, shop) | any phase modifier | — | `Clock = PlaybackClock.Unscaled` | — |
| Pause / slow-mo / scrub / reverse / sync several texts | any `IPhaseModifier` | — | `Clock = Manual` + write `Phase` | one mesh rebuild per write |
| Drive an animation from Animator / Timeline | bridge + handler, or `UniTextDriver.Progress` | — | section 9 | — |
| A motion UniText does not ship | subclass `GlyphParamModifier<TParams>` | your tag | section 11 | per-frame mesh rebuild |
| Different value on one range at runtime (HP-scaled shake) | `Ranges().WhereLabel(..).Own(Modifier.Param.X)` | — | [unitext-runtime-api.md](unitext-runtime-api.md) | — |
| Stop an animation without leaving per-frame cost | assign text without the tag, or `Clock = Manual` | — | section 8.3 | none afterwards |

---

## 2. Registering the tag (nothing is wired by default)

One line per modifier, once per component (or author the same styles in a `StylePreset` asset):

```csharp
using LightSide;

text.Styles.Add(Style.Tag(new WaveModifier(), "wave"));
text.Text = "<wave=0 6,5,0.6>Rogue Brick</wave>";
```

| Route | How | Scope |
|---|---|---|
| Code | `text.Styles.Add(Style.Tag(modifier, "tag"))` | that one component |
| Code, whole text, no tag | `text.Styles.Add(Style.WholeText(modifier, "slots"))` or `text.SetWholeText<WaveModifier>("slots")` | that one component |
| Inspector | Styles `+` -> Whole Text -> Animation -> pick the modifier, then change the style's **Source** to Tag Rule and type the tag name | that one component |
| Shared vocabulary | author the styles in a `StylePreset` asset (`Create > LightSide > UniText > Style Preset`), attach it to the component's **Style Presets** list or assign it as **Global Style Preset** in the LightSide UniText project settings | every text with **Use Global Style Preset** on |

Rules:
- The inspector picker lists all phase animations only under **Whole Text > Animation** (Wave, Wobble, Pulse, Bounce, Shake, Float, Pendulum, Spin, Glitch, Scramble, Rolling, Deform, Marquee). Choosing one creates a whole-text style; switch its Source to a tag rule to use markup.
- Collision order when several sources define the same tag: local `Styles`, then component presets in list order, then the global preset; the first registered wins.
- `Style.Tag(modifier, "wave", "0 6,2,0.3")` — the third argument is the default slot string used when a use of the tag has no `=value`; slots merge one by one and the markup slot wins.
- The instance you pass to `Style.Tag` stays live: keep a reference and set its properties later (section 8). `text.GetModifier<WaveModifier>()` returns the component's own copy even when the modifier came from a preset, so retuning one text never edits the shared asset.
- Setting a style's `Enabled = false`, or removing the style, un-registers the tag and its markup shows as literal characters.
- Code that touches these types must reference the `LightSide.UniText` assembly definition (and `LightSide.Core` for attributes and `HashNoise`).

Full bootstrap (preset assets, TMP-style vocabularies): master section "Tag vocabulary bootstrap" and [unitext-markup-system.md](unitext-markup-system.md).

Register the whole animation vocabulary in code:

```csharp
public static class TextFxVocabulary
{
    public static void Apply(UniTextBase text)
    {
        text.Styles.Add(Style.Tag(new WaveModifier(),     "wave"));
        text.Styles.Add(Style.Tag(new WobbleModifier(),   "wobble"));
        text.Styles.Add(Style.Tag(new PulseModifier(),    "pulse"));
        text.Styles.Add(Style.Tag(new BounceModifier(),   "bounce"));
        text.Styles.Add(Style.Tag(new ShakeModifier(),    "shake"));
        text.Styles.Add(Style.Tag(new FloatModifier(),    "float"));
        text.Styles.Add(Style.Tag(new PendulumModifier(), "pendulum"));
        text.Styles.Add(Style.Tag(new SpinModifier(),     "spin"));
        text.Styles.Add(Style.Tag(new GlitchModifier(),   "glitch"));
        text.Styles.Add(Style.Tag(new ScrambleModifier(), "scramble")); // inert until Progress < 1
        text.Styles.Add(Style.Tag(new RollingModifier(),  "roll"));     // inert until Roll != 0
    }
}
```

---

## 3. Reading a parameter token (`<wave=0 8,2,0.25>` slot by slot)

`<tag=slot0,slot1,slot2>`: slots are comma-separated in the order the modifier declares them. An empty slot keeps its default, and omitted trailing slots keep their defaults (`<wave=,6>` sets only the frequency).

`<wave=0 8,2,0.25>` decoded:

| Slot | Parameter | Written | Meaning |
|---|---|---|---|
| 0 | `amplitude` (`Vector2`, px) | `0 8` | x = 0, y = 8 px: purely vertical wave, 8 px peak |
| 1 | `frequency` (rad per second) | `2` | `phase * 2` fed to `sin`: period 2π/2 ≈ 3.1 s, i.e. ≈ 0.32 Hz — slow |
| 2 | `spread` (rad per glyph) | `0.25` | neighbouring glyphs are 0.25 rad apart: one full wave every 2π/0.25 ≈ 25 glyphs |

Token rules (they decide whether your markup does what you meant):
- **`Vector2` is two numbers separated by a space** (`0 8`), not a comma (the comma separates slots). A single number sets **x only**; y keeps its default. So `<wave=8>` is amplitude (8, 3) — an orbit, not a vertical wave of 8. Vertical only is `<wave=0 8>`.
- **`UnitValue`** (Marquee `speed`, `gap`, `fade`): a number plus suffix `px` (or `abs`), `em`, `%`, `delta`. A number **without suffix uses the parameter's default unit**, which is `em` for the marquee fields: `60` means 60 em. Write `60px`.
- **Enums** by name, case-insensitive, or a unique first character (`<marquee=p>` is PingPong).
- **Slotless parameters cannot be set in markup**: `Phase` on every modifier, `ScrambleModifier.Progress` and `.Rate`, `RollingModifier.Roll`. They are code / inspector / driver only.
- **Optional label** for code targeting: `<wave #title=0 8>Name</wave>` (closing tag plain `</wave>`); `Ranges().WhereLabel("title")` finds it.
- Composite modifiers take one parameter string split by `;`, one segment per child (section 12, R10).
- Parameter cascade per range: field default, then style/rule default string, then markup token, then an owned value (code / driver / state rule).

Frequency / spread conversion for the sine-based modifiers (`wave`, `wobble`, `pulse`, `bounce`, `pendulum`):
- `frequency = 2π × Hz`: 1 Hz ≈ 6.3, 2 Hz ≈ 12.6, 0.5 Hz ≈ 3.1. (The API tooltip says "oscillations per phase unit"; the formulas use `sin(phase * frequency)`, so it is radians.)
- Wavelength in glyphs = `2π / spread` (0.5 ≈ 12.6 glyphs, 1.0 ≈ 6).
- `cluster` in the per-glyph formula is the glyph's index in the **whole rendered text** (markup stripped), not its index inside the tag, so a wave inside a long string starts at an arbitrary phase.

---

## 4. Catalog — glyph-quad animations

All eight derive from `GlyphParamModifier<TParams>`. They move the four vertices of each covered glyph quad during mesh generation and never change layout, line breaks or advances. They also move emoji and inline-sprite quads. Inspector fields common to all: `Clock` (default `Scaled`) and `Phase` (shown only when `Clock == Manual`).

Property names are the C# properties you set at runtime (`wave.Amplitude`, `shake.Rate`, ...). Slot order = declaration order.

| C# type | Motion | Slot 0 | Slot 1 | Slot 2 | Notes |
|---|---|---|---|---|---|
| `WaveModifier` | `dx = cos(a)*Amplitude.x`, `dy = sin(a)*Amplitude.y`, `a = phase*Frequency + cluster*Spread`. One axis = line, both = ellipse/orbit, equal = circle; negate one axis to reverse the orbit | `Amplitude` `Vector2` px, default `(0, 3)` | `Frequency` default `3` (rad/s) | `Spread` default `0.5` | translation snaps on pixel fonts (below) |
| `WobbleModifier` | rotation about the glyph centre `sin(a)*Angle` | `Angle` deg, `8` | `Frequency` `4` | `Spread` `0.8` | "jelly rocking" |
| `PulseModifier` | uniform scale about the glyph centre `1 + sin(a)*Amount` | `Amount` `0.15` (85%..115%) | `Frequency` `3` | `Spread` `0.3` | `Spread` 0 = all glyphs pulse in sync |
| `BounceModifier` | `s = sin(a)`; `s <= 0` rests; else lifts `s^3 * Amplitude` up — hops half the cycle, rests the other half | `Amplitude` px, `6` | `Frequency` `2` | `Spread` `0.35` | default hop period ≈ 3.1 s: raise `Frequency` to 8-12 for snappy hops |
| `ShakeModifier` | per glyph `step = floor(phase*Rate)`; offset and tilt are hashes of `(cluster, step)`, so it is deterministic per phase | `Amplitude` px, `1.5` | `Angle` deg, `6` (0 = upright) | `Rate` re-rolls per second, `15` | no frequency/spread; scrub and rewind safe |
| `FloatModifier` | smooth value noise drift, `t = phase*Frequency + cluster*Spread` | `Amplitude` px, `2` | `Frequency` `0.6` (noise steps per second, **not** radians) | `Spread` `1.3` (noise offset per glyph; 0 = all drift together) | gentle idle motion |
| `PendulumModifier` | rotation `sin(a)*Angle` about the **top-centre** of the glyph quad | `Angle` deg, `15` | `Frequency` `2` | `Spread` `0.5` | hanging-sign look |
| `SpinModifier` | rotation of `phase*Frequency + cluster*Spread` **full turns** about the centre | `Frequency` turns per second, `0.5` | `Spread` turns per glyph, `0.1` | — | the only sine-free one: frequency really is turns/s |

Mobile verdict for all eight: `OK` for a handful of short texts. The per-frame cost is the whole-component mesh rebuild (section 6), not the per-glyph math (1-3 trig calls and 4 vertex writes per covered glyph). Keep them off long paragraphs and off lists of dozens of rows. Text carrying only these eight stays on the lightest text shader tier.

Pixel-art fonts: wave / shake / bounce / float translations go through `OffsetQuad`, which rounds to whole pixel steps when the font's **Snap To Pixel Grid** option is on (default on, pixel fonts only). A sub-step amplitude then does nothing. Turn the font option off for smooth sub-pixel motion.

### 4.1 `DeformModifier` — bend the glyph shape (AVOID on mobile)

| Slot | Parameter | Default | Meaning |
|---|---|---|---|
| 0 | `Amplitude` | `0.02` | glyph heights; subtle, above about 0.1 glyphs lose their shape |
| 1 | `Scale` | `5` | noise cells per glyph height |
| — | `Drift` (`Vector2`, default `(0.5, 0)`) | | field travel per phase unit; **inspector/code only, no markup slot** |

It bends the glyph's signed-distance field per pixel with travelling noise: outline, fill, stroke, shadow and glow bend together, and it composes with the vertex animations. Colour glyphs are untouched. It forces the heaviest `Full` shader tier and reserves outward reach (quad growth), so texts using it do not share draw calls with plain text. Use on one title at most; consider `LightSideMaterials.WarmUpUi` behind a loading screen for the `Full` tier. `deform` is a convention tag, not a registered default.

### 4.2 `GlitchModifier` — RGB split bursts (LIMIT)

`GlitchModifier` is an `EffectModifier` (a layered effect) and an `IPhaseModifier`. A glitching glyph gets cyan and magenta copies pushed up to `Split` px apart under a crisp original, horizontal jerks and rare blink-outs.

| Slot | Parameter | Default | Meaning |
|---|---|---|---|
| 0 | `Intensity` | `0.5` | 0..1 (clamped). A glyph is "in burst" when its hash is below `Intensity * 0.4`, so **1.0 = at most 40% of glyphs at once**, not constant chaos |
| 1 | `Split` | `3` | px offset of the cyan/magenta copies |
| 2 | `Amplitude` | `2` | px horizontal jerk (vertical is 0.2x) |
| 3 | `Rate` | `12` | re-rolls per second |
| 4-6 | `blend`, `paintSpread`, `colorGlyphs` | inherited | layer blend, paint spread, colour-glyph policy (default skips emoji; `Apply` lets emoji glitch) |

Each bursting glyph emits up to 3 extra quads (cyan, magenta, face clone) and a UV2 buffer, which moves the text to the heavier styled-text shader tier (no draw-call sharing with plain text). Use for short titles and warnings, or event-driven flashes (recipe R6). Layer order follows the order of the styles in `Styles`.

### 4.3 `ScrambleModifier` — decrypt / scramble (OK)

Unresolved characters show random glyphs from `Charset` and settle left to right as `Progress` goes 0 to 1. Layout never reflows. Spaces and line breaks stay real and are not counted.

| Member | Default | Notes |
|---|---|---|
| `Progress` | **`1`** (real text, zero cost) | 0..1, slotless |
| `Rate` | `12` | re-picks per second, slotless |
| `Charset` | `"ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&"` | BMP characters only; inspector/code only; every charset glyph must resolve from the font stack |
| `Phase`, `Clock` | — , `Scaled` | |

There are **no markup slots at all**: all tuning is code, inspector or driver. The tag does nothing visible until something sets `Progress < 1`. It re-meshes every frame only while some range has `Progress < 1`.

### 4.4 `RollingModifier` — odometer / split-flap (OK)

Characters found in `Wheel` roll on a cyclic glyph wheel; the fractional part of the position shows two wheel glyphs sliding (1 em per step, clipped to the wheel's ink band). A digit wheel is an odometer; a letter wheel with a trailing space is a split-flap board.

| Member | Default | Notes |
|---|---|---|
| `Spread` | `0.3` | slot 0 (`<roll=1.5>`): roll reduction per rolling character |
| `Roll` | `0` | steps still to travel; `0` = real text, zero cost; negative rolls the other way; slotless |
| `Wheel` | `"0123456789"` | BMP only; inspector/code only; characters outside the wheel pass through unrolled |

`RollingModifier` has **no `Clock` and no `Phase`** and does not implement `IPhaseModifier`: you drive `Roll` yourself. Each wheel character shows `wheelIndex - effectiveRoll`, with `effectiveRoll = |Roll| - ordinal * Spread` (ordinal = position among the wheel characters of the range). With positive `Spread` the **rightmost** digit reaches rest first and the leftmost last (the docs word it the other way round; the formula wins). It animates every digit to its final digit; it does not count numerically from the old value to the new one. It injects 2 virtual glyphs per rolling character, and setting `Roll` invalidates with the heavier mesh-dirty path used for range edits, so it costs more per frame than a wave (fine for one counter).

### 4.5 `MarqueeModifier` — scrolling ticker (OK, cheapest)

See section 10 for modes and restrictions. Slots: `mode`, `speed`, `pause`, `gap`, `always`, `fade`.

---

## 5. Phase and clock model

Every glyph animation is a pure function of one input: `Phase` (`Roll` for `RollingModifier`, `Progress` for `ScrambleModifier`). Because it is pure, the same phase always draws the same frame; scrubbing, rewinding and syncing are safe.

| `Clock` | Advances `Phase` by | Use for |
|---|---|---|
| `PlaybackClock.Scaled` (**default**) | `Time.deltaTime` (1 per second, frozen at `timeScale 0`) | world / gameplay text |
| `PlaybackClock.Unscaled` | `Time.unscaledDeltaTime` | pause menu, shop, HUD that must keep moving while paused, badges |
| `PlaybackClock.Manual` | nothing; only your writes | scrub, slow-mo, reverse, Animator/Timeline/tween, sync across texts |

Rules:
- **A bare tag animates on its own** under `Scaled`/`Unscaled`: no driver, no Animator, no code.
- Rendered phase = the `Phase` field (as an offset) **plus** the running clock. Under `Manual` the `Phase` field is the exact input.
- **Additive trap:** writing `Phase` from code, a tween, an Animator curve or a driver clip while `Clock` is not `Manual` adds your value to the running clock (double speed, jumpy). Anything that feeds `Phase` externally needs `Clock = PlaybackClock.Manual`. One package sample drives `Phase` on the default `Scaled` clock — do not copy that.
- **Pause menus:** `Scaled` freezes when `Time.timeScale = 0`. Set `Clock = Unscaled` for any text that must keep animating then.
- The clock ticks from the component's per-frame update (just before script `Update`), subscribed only while the modifier is enabled **and** `Clock != Manual`.
- A modifier is enabled at the first parse that gives it ranges and disabled when a parse leaves it none. A text without the tag does no per-frame work. The accumulated clock time survives disable/enable and resets only when the clock is switched to `Manual`.
- Switching `Clock` to `Manual` zeroes the accumulated time: the pose snaps to the `Phase` field. Switching away from `Manual` counts from 0 again.
- There is no public pause/seek on a running clock (the accumulated time is internal). To pause "in pose", be on `Manual` from the start.
- Edit Mode: animations run in the Scene/Game view without Play mode (steps clamped to 34 ms) and keep the editor pumping frames. For a still pose set `Clock = Manual` and edit `Phase`.
- `IPhaseModifier { float Phase; PlaybackClock Clock; }` is the non-generic handle. Implemented by the eight glyph animations, `DeformModifier`, `GlitchModifier`, `ScrambleModifier`, `MarqueeModifier`. **Not** by `RollingModifier` (no clock) and not by `RevealModifier` (own `Clock`, default `Unscaled`). `GetModifier<T>` / `TryGetModifier<T>` / `GetModifiers<T>` accept interface types.
- `Phase` is a slotless parameter: no markup slot, but it takes part in the cascade, in per-range ownership, rules and driver clips.
- Ways to drive a phase: own clock (default); `Manual` plus code/tween; a `UniTextDriver` clip on the phase parameter (optional, only to sequence/stagger/curve per range — see [unitext-animation-reveal-sequencer.md](unitext-animation-reveal-sequencer.md)); Animator via bridge handler or by animating `UniTextDriver.Progress` (section 9).

---

## 6. Cost model and mobile verdicts

**A running phase animation rebuilds the mesh of the whole text component every frame** (all glyphs of that component, not only the animated range), from cached shaping and layout; nothing is re-shaped or re-laid out. A Canvas `UniText` is a `MaskableGraphic`, so each rebuild also dirties its Canvas: isolate constantly animated texts on their own nested Canvas (standard uGUI practice) and keep the number of simultaneously animated texts small (a HUD title and a few labels, not 50 list rows).

| State | Per-frame work |
|---|---|
| The text has no range for the modifier | none (modifier disabled) |
| Running `Scaled`/`Unscaled` clock, ranges present | one whole-component mesh rebuild per frame |
| `Manual` clock, nobody writes `Phase` | none |
| `Manual` clock, `Phase` written every frame | one mesh rebuild per write |
| `ScrambleModifier` with `Progress == 1` / `RollingModifier` with `Roll == 0` | none |
| `ScrambleModifier` `Progress < 1` | mesh rebuild per frame |
| `RollingModifier` `Roll != 0` | mesh rebuild per frame, heavier invalidation than the phase modifiers |
| `MarqueeModifier` scrolling | **no rebuild**: re-places the built mesh each tick; no tick at all while the text fits |
| `GlitchModifier` active | rebuild + up to 3 extra quads per bursting glyph; styled-text shader tier |
| `DeformModifier` active | rebuild + per-pixel noise; `Full` shader tier; quad growth |

What stops the per-frame cost:

| Action | Stops it? |
|---|---|
| Assign text without the tag (modifier has no ranges) | yes |
| `Clock = Manual` and stop writing `Phase` | yes |
| `text.enabled = false` (suspends playback, releases the built mesh; rebuilt on enable) | yes |
| Amplitude / Angle / Amount set to 0 under a running clock | **no** — still ticks and re-meshes |
| `Hide()` on the text | **no** — the clock keeps ticking while ranges exist |
| `Scramble.Progress = 1`, `Rolling.Roll = 0` | yes |

Verdicts: Marquee is the cheapest continuous effect; Wave/Shake/Bounce/Float/Pulse/Wobble/Pendulum/Spin cost one mesh rebuild per frame (`OK` for a few short texts, `LIMIT` for long paragraphs and many simultaneous texts); Glitch and especially Deform are the heaviest. Different shader tiers do not share a draw call (plain text < styled text < united text < full); if the first appearance of a Glitch/Deform text stalls, warm the tiers up with `LightSideMaterials.WarmUpUi` behind a loading screen. Details: [unitext-materials-shaders.md](unitext-materials-shaders.md), [unitext-performance-mobile.md](unitext-performance-mobile.md).

Edit Mode: a running clock keeps the editor pumping frames until it is removed, which costs editor CPU.

---

## 7. Stacking and merging

- Ranges of every modifier sharing an `AttributeKey` land in one per-glyph slot: a glyph renders the parameters of the range **applied last**. Two `WaveModifier` instances, or a `<wave>` nested in a `<wave>`, never add — one wins.
- Different animation types have different keys (`wave, bounce, shake, float, wobble, pendulum, spin, pulse, glitch, deform`) and each runs its own per-glyph callback, so they **stack** on one glyph (wave + pulse + spin).
- Per key the range index saturates at 255 per apply cycle: ranges beyond the 255th of one type all render the 255th range's parameters.
- Layered effects (`GlitchModifier`) stack in the order of the styles in `Styles`.
- Cost does not grow with the number of stacked types: still one mesh rebuild per frame per component.

---

## 8. Runtime control from C#

### 8.1 Find the live modifier and set fields

```csharp
var wave = text.GetModifier<WaveModifier>();   // null when the text has no such style
if (wave != null)
{
    wave.Amplitude = new Vector2(0f, 10f);     // px
    wave.Frequency = 12.6f;                    // ~2 Hz (radians per second)
    wave.Spread    = 0.3f;
    wave.Clock     = PlaybackClock.Unscaled;
}
```

- `GetModifier<T>()` returns the component's own live instance: local styles first, then preset copies, including children of a `CompositeModifier`. `T` may be an interface (`IPhaseModifier`).
- Related lookups: `TryGetModifier<T>(out T modifier)` (also an overload returning the owning `Style`), `GetModifiers<T>(List<T> list, bool includeChildren = false)` (clears the list, then collects every match).
- Every property setter invalidates through the mesh-only path: **no re-parse, no re-shape**, and it costs nothing while the modifier has no range.
- Changing `Frequency` or `Spread` on a running clock makes the argument `phase*frequency` jump (a visible pop). For smooth speed ramps use `Manual` and integrate the phase yourself (R12).
- Properties edited on a modifier held in a `StylePreset` asset update in place for every consumer.
- Whole-text helpers: `SetWholeText<T>(string parameter = null)` adds/updates a source-less whole-text style (updating an existing one's parameter re-parses), `ClearWholeText<T>()`, `ToggleWholeText<T>(param)`, `GetWholeTextParameter<T>()`. `EnsureStyleFor<T>(ParseRule)` idempotently ensures a style for a modifier type and merges a rule.

### 8.2 Per-range values (ownership)

When one tag use needs a different value than the next (shake that scales with HP, one scramble per line), use per-range ownership rather than separate modifier instances:

```csharp
// text.Text = "<shake #hp>12 / 100</shake>";
var shake = hpLabel.GetModifier<ShakeModifier>();
var amplitude = shake.Ranges().WhereLabel("hp").Own(ShakeModifier.Param.Amplitude);
amplitude.Value = Mathf.Lerp(0f, 3f, 1f - hpFraction);   // px, every matching range
// OnDestroy: amplitude.Dispose();   // returns the range to its cascade
```

The ownership handle (`OwnedParameterSet`) re-materializes after every parse, so it survives text changes. Full API, composition and priority: [unitext-runtime-api.md](unitext-runtime-api.md); hover/press/focus-driven values: [unitext-range-state-rules.md](unitext-range-state-rules.md). Per-range values are not diffable by the Animator (section 9).

### 8.3 Stop an animation cleanly

| Want | Do | Cost afterwards |
|---|---|---|
| Remove for good on this text | assign text without the tag | none |
| Freeze in a pose, keep markup | `m.Clock = Manual; m.Phase = pose` | none |
| Stop ticking, resume later | `Clock = Manual`, later `Scaled`/`Unscaled` | none while `Manual` |
| Neutral look (no offset) | set `Amplitude` / `Amount` / `Angle` to 0 | **still ticks and re-meshes** unless also `Manual` |
| Remove the style | `text.Styles.Remove(style)` or `style.Enabled = false` | tags become literal characters |
| Pooled text going idle | `enabled = false` | built layout/mesh released |

### 8.4 Pause, seek, scrub, reverse, sync (Manual clock)

```csharp
readonly List<IPhaseModifier> phased = new();
float t;                                              // your playback time in seconds

void TakeOver(UniTextBase text)
{
    text.GetModifiers(phased, includeChildren: true); // Wave..Spin, Deform, Glitch, Scramble, Marquee (not Rolling)
    foreach (var m in phased) m.Clock = PlaybackClock.Manual;   // zeroes the internal clock time
}

void Tick(float dt, float speed)                      // speed 0 = pause, negative = rewind, 0.3 = slow-mo
{
    t += dt * speed;
    foreach (var m in phased) m.Phase = t;            // exact pose for t; replays identically backwards
}
```

Feed several texts the same `t` to keep them in sync. Shake, Glitch, Scramble and Float hash by `floor(phase * rate)`, so the same phase always gives the same frame (deterministic tests and scrubbing).

### 8.5 Reduced-motion option

The phase modifiers do **not** read the platform/accessibility reduced-motion flag (only range-state-rule playbacks do). Implement your own switch: for each `IPhaseModifier` set `Clock = Manual; Phase = 0`; for Shake, Glitch and Float also zero `Amplitude` / `Intensity` (a static pose is not neutral for them), or assign tag-free text.

### 8.6 Inspect what is active

`Tools > LightSide > UniText > Inspection Mode` (Ctrl/Cmd+Shift+I; F8 in play mode and development builds) lists every modifier covering the probed glyph with its parameters resolved there.

---

## 9. Animator / Timeline integration

| Goal | Route |
|---|---|
| Animator/Timeline writes component fields (font size, colour, wrap, alignment) | `Animator` + `UniTextAnimationBridge` + `UniTextFieldsAnimationHandler` (or `UniTextWorldFieldsAnimationHandler` for `UniTextWorld`) |
| Animator/Timeline writes modifier fields (amplitude, tint, ...) | `UniTextAnimationBridge` + `ModifierFieldsAnimationHandler`; set the modifier `Clock = Manual` when animating its `Phase` |
| One float scrubs a whole authored sequence | add `UniTextDriver`, author clips on the modifier parameters, turn **Play On Enable** off (or set its clock to Manual), keyframe the driver's serialized `Progress` (0..1) in the Animator/Timeline clip — no bridge needed |
| Own diff logic | subscribe `UniTextBase.Animated` and call `SetDirty(...)` with the matching flag, or subclass `AnimationHandler` |
| Code / tween / Timeline signal | `Clock = Manual` and write `m.Phase = value`; one mesh rebuild per write |

`UniTextAnimationBridge` is a sealed `MonoBehaviour` (`[RequireComponent(typeof(UniTextBase))]`, `[ExecuteAlways]`, `[DisallowMultipleComponent]`), added via Add Component > LightSide > UniText > UniTextAnimationBridge. It holds a `Handlers` list (`AnimationHandler[]`, serialized by reference) and subscribes to the component's `Animated` event, which fires after the Animator applied properties. On each event it runs `Diff()` on every handler: a handler compares current field values with a baseline snapshot and re-issues the invalidation the setters would have raised. **Without the bridge nothing diffs**: a field the Animator writes silently does nothing visible.

| Handler | Covers |
|---|---|
| `UniTextFieldsAnimationHandler` | `UniText` own fields: font size (layout), colour, word wrap, auto-size + min/max, horizontal/vertical alignment; one combined invalidation per diff |
| `UniTextWorldFieldsAnimationHandler` (sealed) | `UniTextWorld`: the base fields plus `SortingOrder`, `SortingLayerID`, `CastShadows` |
| `UniText3DFieldsAnimationHandler` | `UniText3D` fields (see [unitext-3d-text.md](unitext-3d-text.md)) |
| `ModifierFieldsAnimationHandler` (sealed) | every state field of every modifier in the host's **own `Styles`** (nested composite children included), rebinding when the style graph changes |

Limits of `ModifierFieldsAnimationHandler`:
- The component's own `Styles` only — not modifiers living in a `StylePreset` copy or the global preset.
- Fields whose change notification needs a value transition (previous/current) are skipped (likely `ScrambleModifier.Progress`); drive those through `UniTextDriver`, per-range ownership or code.
- Per-range parameter values are not diffable.

A custom handler derives from `AnimationHandler` (`[Serializable]`, abstract): `OnBind(host)` snapshots baselines, `OnDiff(host)` re-issues invalidation (keep it allocation-free), `OnUnbind()` cleans up. The old per-modifier handlers (`PhaseAnimationHandler`, `ColorAnimationHandler`, `SizeAnimationHandler`, `LetterSpacingAnimationHandler`, `GlowAnimationHandler`, `ShadowAnimationHandler`, `StrokeAnimationHandler`, `ModifierAnimationHandler`) no longer exist; an entry for one in a saved bridge is dropped on load.

---

## 10. Marquee — modes and restrictions

```csharp
ticker.WordWrap = false;                 // else the text wraps inside the box and nothing scrolls
ticker.AutoSize = false;
ticker.Styles.Add(Style.WholeText(new MarqueeModifier
{
    Mode  = MarqueeMode.Loop,            // endless loop of copies
    Speed = UnitValue.Absolute(80f),     // px per second; negative = reverse
    Gap   = UnitValue.Em(3f),            // Loop only: space between the end and the next copy
    Pause = 0f,
    Fade  = UnitValue.Em(1f),            // soft edge width; padding keeps resting text clear of it
}));
ticker.Text = "BREAKING: ...";
```

| Slot | Parameter | Default | Meaning |
|---|---|---|---|
| 0 | `mode` (`MarqueeMode`) | `Loop` | `Loop` = endless loop of copies; `PingPong` = there and back |
| 1 | `speed` (`UnitValue`) | `2em` | px or em per second; negative reverses |
| 2 | `pause` (seconds, >= 0) | `1` | rest at the start edge each cycle (and at the end edge in PingPong) |
| 3 | `gap` (`UnitValue`: px / em / %) | `2em` | Loop only; `%` is of the padded rect width |
| 4 | `always` (bool) | `false` | scroll even when the text fits |
| 5 | `fade` (`UnitValue`: px / em) | `0em` | soft left/right edge; 0 = hard cut |

Timing: Phase unit = 1 second; position is a pure function of phase. Loop cycle = `pause + (width + gap) / speed`; PingPong cycle = `2 * (pause + span / speed)`.

Behaviour and restrictions:
- **Canvas `UniText` only.** On `UniTextWorld` / `UniText3D` (anything that is not `UniText`) enabling it throws `NotSupportedException`. A document-backed text, or one scrolled by a document view/viewport, does not scroll and logs `InvalidOperationException` once per occurrence.
- Whole-text only: parameters resolve from the first applied range; every line moves together. A tag rule would still move the whole text — register it as a whole-text style.
- It scrolls only when the laid-out content is wider than the padded rect (plus 0.5 px) or `Always` is on. With word wrap or auto-size on, the text stays inside the box and nothing scrolls.
- Everything (glyphs, highlights, decorations, inline objects, loop copies) is clipped to the rect's left/right edges without `RectMask2D`; vertical overflow stays visible; clicks and hover reach all copies. An inline scene object in `Existing` mode stays outside the clip and copies.
- It rests at the start edge (left for LTR, right for RTL) regardless of `HorizontalAlignment`.
- Changing the text content rewinds the cycle. The clock engages only while it actually scrolls.
- Cost: no mesh rebuild; Loop adds only as many copies as cover the rect.
- Song title in a fixed box: `Mode = MarqueeMode.PingPong, Pause = 1.5f, Speed = UnitValue.Em(1.5f)`; a title that fits stays still unless `Always = true`.

---

## 11. Custom animated modifier — `GlyphParamModifier<TParams>`

Minimal complete example (sway: tilt plus lift on a sine), modelled on the shipped `WaveModifier`:

```csharp
using System;
using UnityEngine;
using LightSide;                      // assembly references: LightSide.UniText + LightSide.Core

namespace MyGame.TextFx
{
    [Serializable]
    [TypeGroup("Animation", 20)]                         // optional: inspector picker category/order
    [TypeDescription("Glyphs sway and lift on a sine.")] // optional
    [GenerateParameters]                                 // the class must be partial
    public partial class SwayModifier : GlyphParamModifier<SwayModifier.Params>   // not compiled
    {
        // Per-range resolved values. `unmanaged` only: no strings, arrays or classes.
        public struct Params
        {
            public float angle;
            public float lift;
            public float frequency;
            public float spread;
        }

        // One [Parameter] per markup slot, in declaration order: <sway=angle,lift,frequency,spread>
        [Tooltip("Peak tilt in degrees.")]
        [SerializeField, Parameter, Essential, StateProperty(nameof(MarkParamsDirty))]
        private float angle = 10f;

        [Tooltip("Peak vertical lift in pixels.")]
        [SerializeField, Parameter, Essential, StateProperty(nameof(MarkParamsDirty))]
        private float lift = 2f;

        [Tooltip("Radians per phase unit (per second under a running clock).")]
        [SerializeField, Parameter, Essential, StateProperty(nameof(MarkParamsDirty))]
        private float frequency = 4f;

        [Tooltip("Phase offset between neighbouring glyphs, in radians.")]
        [SerializeField, Parameter, StateProperty(nameof(MarkParamsDirty))]
        private float spread = 0.6f;

        // Unique per modifier type; modifiers sharing a key share one per-glyph buffer (last applied wins).
        protected override string AttributeKey => "myGame.sway";

        // Main thread, before every mesh rebuild: read state only, no side effects.
        protected override Params ResolveParams(in RangeApplyContext context) => new()
        {
            angle     = Param.Angle.Resolve(this, in context),
            lift      = Param.Lift.Resolve(this, in context),
            frequency = Param.Frequency.Resolve(this, in context),
            spread    = Param.Spread.Resolve(this, in context),
        };

        // May run on a worker thread: pure function of (p, phase, cluster); no Unity API, no Random/Time.
        protected override void OnGlyph(UniTextMeshGenerator gen, int cluster, in Params p, float phase)
        {
            var s = Mathf.Sin(phase * p.frequency + cluster * p.spread);
            var verts = gen.Vertices;
            var baseIdx = gen.faceBaseIdx;                // first of the 4 face vertices (BL, TL, TR, BR)

            if (p.lift != 0f) gen.OffsetQuad(baseIdx, 0f, s * p.lift);   // pixel-grid aware translate
            if (p.angle != 0f)
            {
                var c = UniText.Glyph.Center(verts, baseIdx);
                UniText.Glyph.Rotate(verts, baseIdx, c.x, c.y, s * p.angle * Mathf.Deg2Rad);
            }
        }
    }
}
```

Use it: `text.Styles.Add(Style.Tag(new SwayModifier(), "sway")); text.Text = "<sway=12,3,6,0.5>Hello</sway>";`. The properties `Angle`, `Lift`, `Frequency`, `Spread` are generated from the `[StateProperty]` fields; `Phase` and `Clock` are inherited; `GetModifier<SwayModifier>()` works.

Rules and traps:
- `TParams` must be `unmanaged`. The subclass must be `partial` and carry `[GenerateParameters]`. Compiler diagnostics: `UTP001` class not partial, `UTP002` no parameter fields, `UTP004` `[Parameter]` fields without `[GenerateParameters]`. The generator ships as `LightSide.UniText.ParamCodeGen.dll` (a Roslyn analyzer under `<UniTextRoot>/Analyzers/`) and works in your own assemblies.
- Every serialized field needs a state attribute (`[StateProperty(...)]`, `[StatePassive]`, ...) because `BaseModifier` is a state hierarchy. Point parameter fields at `MarkParamsDirty` (mesh-only invalidation; since 3.5.12 it takes a `StateMember`).
- One `Param.<Name>.Resolve(this, in context)` per field. In `OnGlyph` read **`p`**, never the private fields, so per-range ownership, driver clips and rules work. A field without `[Parameter]` (like `DeformModifier.drift`) is inspector/code only.
- `OnGlyph` may run on a worker thread: no `Time`, `Random`, `GameObject`, `Camera`, no allocation; a pure `f(p, phase, cluster)`. For noise use `HashNoise.Hash01 / HashSigned(int a, int b, int c = 0)` and `ValueSigned(float t, int seed)` from `LightSide.Core` (deterministic, scrub-safe). `ResolveParams` runs on the main thread and must be side-effect free.
- Translate with `gen.OffsetQuad` (pixel-font snapping); `UniText.Glyph.Offset / Rotate / Scale / Center(verts, baseIdx, ...)` are raw vertex helpers (positive radians = counter-clockwise).
- A custom modifier that resets per-parse state must do it in `BeforeApply`, not `OnEnable` (modifiers stay enabled while the text changes).
- Because it derives from `GlyphParamModifier`, it gets the clock, `Phase`, tick, per-frame mesh rebuild and `IPhaseModifier` for free.

---

## 12. Recipes

### R1. Wavy title
Markup: `<wave=0 6,5,0.6>Rogue Brick</wave>` — 6 px vertical amplitude, ≈0.8 Hz, one wave per ≈10 glyphs. Setup: register `wave` (section 2). Result: animates with no further code. Gotcha: `<wave=6>` would orbit (x = 6, y = 3).

### R2. Pulsing NEW badge that keeps pulsing while paused
```csharp
text.Styles.Add(Style.Tag(new PulseModifier { Clock = PlaybackClock.Unscaled }, "pulse"));
text.Text = "<pulse=0.12,6,0>NEW</pulse>";   // 12%, ~1 Hz, spread 0 = glyphs in sync
```
Result: each glyph scales about its own centre, so the word "puffs" rather than scaling as one block. Gotcha: with the default `Scaled` clock it freezes at `timeScale 0`.

### R3. Shaking low-HP warning
A. Swap markup when the state changes (a re-parse, fine for rare changes, not per frame):
```csharp
hpLabel.Text = low ? $"<shake=1.2,4,18>{hp}/{max}</shake>" : $"{hp}/{max}";
```
The calm state has no range, so the modifier is disabled and costs nothing.
B. Keep the tag and scale severity per range with ownership: section 8.2. Gotcha: amplitude 0 still re-meshes every frame (the default 6° tilt still applies); prefer A for "off".

### R4. Floating damage numbers (pooled)
Rise = transform tween; fade = alpha of `label.color` (an alpha-only change rebuilds nothing). Plain numbers need **no** animation modifier.
```csharp
label.enabled = true;                          // UniTextWorld (world) or UniText (canvas)
label.Text = crit ? $"<shake=1.5,5,30>{dmg}!</shake>" : dmg.ToString();
label.color = Color.white;                     // then tween alpha 1 -> 0 and the transform up
// on release to the pool, after an animated (crit) number:
label.enabled = false;                         // not just Hide()
```
Why: `Hide()` keeps layout and mesh for a cheap re-show but the phase clock keeps ticking and re-meshing while the modifier has ranges. Alternative: assign plain text before `Hide()` so the modifier has no range.

### R5. Glitch effect (always-on title, and a hit flash)
Always on: `<glitch=0.6,4,3,14>SIGNAL LOST</glitch>` (intensity 0.6 ≈ 24% of glyphs mid-burst, split 4 px, jerk 3 px, 14 re-rolls/s). Event-driven flash without a permanent per-frame rebuild:
```csharp
var g = new GlitchModifier { Intensity = 0f, Clock = PlaybackClock.Manual };   // idle: no tick
text.Styles.Add(Style.Tag(g, "glitch"));
// on hit:
g.Clock = PlaybackClock.Scaled; g.Intensity = 0.9f;
// coroutine: ramp g.Intensity to 0, then
g.Intensity = 0f; g.Clock = PlaybackClock.Manual;   // stop ticking
```
Gotcha: keep it to short texts; every bursting glyph emits up to 3 extra quads.

### R6. Rolling score counter / odometer / split-flap
```csharp
var roll = new RollingModifier { Spread = 0.3f };            // Wheel default "0123456789"
text.Styles.Add(Style.Tag(roll, "roll"));                    // once

IEnumerator ShowScore(int score)
{
    roll.Roll = 10f;                                         // set BEFORE the text so the first frame is not final
    text.Text = $"<roll>{score:N0}</roll>";                  // separators outside the wheel pass through
    for (var t = 0f; t < 1f; t += Time.unscaledDeltaTime)
    {
        roll.Roll = 10f * (1f - t) * (1f - t);               // ease-out 10 -> 0
        yield return null;
    }
    roll.Roll = 0f;                                          // real text, zero cost
}
```
Rightmost digit settles first. It animates each digit to its final value, not a numeric count-up from the old score. Letter board: `new RollingModifier { Wheel = "ABCDEFGHIJKLMNOPQRSTUVWXYZ " }` with tag `flap`. Wheel is BMP-only and the font stack must contain every wheel glyph.

### R7. Scramble / decrypt text
```csharp
var scramble = new ScrambleModifier { Progress = 0f, Rate = 18f, Charset = "01#$%&" };
text.Styles.Add(Style.Tag(scramble, "scramble"));
text.Text = "<scramble>ACCESS GRANTED</scramble>";
// coroutine: scramble.Progress = t / 1.2f;   settles left to right, clamped 0..1, 1 = real text and zero cost
```
No markup slots exist; all tuning is code. Per-range progress: `scramble.Ranges().WhereLabel("a").Own(ScrambleModifier.Param.Progress)` (use `using var` or `Dispose`).

### R8. Scrolling ticker / long song title
Section 10 (Canvas `UniText` only, `WordWrap = false`, `AutoSize = false`).

### R9. Wavy whole text, no markup
`text.SetWholeText<WaveModifier>("0 3,5,0.5");` — changing the parameter of an existing whole-text style re-parses.

### R10. Several animations on one range
- Nest different types: `<wave=0 4,5,0.5><pulse=0.1,5,0.5>HYPE</pulse></wave>`. Never nest the same type expecting a sum.
- One reusable tag through a composite (default parameter split by `;`, one segment per child):
```csharp
var fx = new CompositeModifier();
fx.Modifiers.Add(new WaveModifier());
fx.Modifiers.Add(new PulseModifier());
fx.Modifiers.Add(new ColorModifier());
text.Styles.Add(Style.Tag(fx, "hype", "0 4,5,0.5;0.1,5,0.5;#FFD700"));   // <hype>HYPE</hype>
```
Override one child per use with empty segments: `<hype=;;#FF4040>`. `GetModifier<WaveModifier>()` still finds the child inside the composite.

### R11. Dialogue / emphasis presets
`<shake=0.8,3,25>NO!</shake>` (angry), `<wave=0 3,5,0.6>whispers</wave>`, `<float=1.5,0.5,1.3>ghost</float>`, `<spin=0.3,0.05>wheee</spin>`, `<pendulum=12,3,0.4>creak</pendulum>`. A typewriter reveal composes with these; each revealed glyph still gets the phase modifiers' transform ([unitext-animation-reveal-sequencer.md](unitext-animation-reveal-sequencer.md)).

### R12. Pause / scrub / sync, retune at runtime, Animator
Pause/scrub/sync: section 8.4. Retune: section 8.1. Animator/Timeline: section 9.

---

## 13. Pitfalls

**Silent failures**

1. **`<wave>` shows as literal text** on any component whose styles/presets lack the animation style (fresh components, UI built in code, a text with **Use Global Style Preset** off). Register the style (section 2).
2. **`<wave=8>` is not "amplitude 8 vertically"**: the first number is X; Y stays 3, giving an 8x3 orbit. Vertical only is `<wave=0 8>`. Old `<wave=8,2,0.25>` strings in runtime code, localization tables and hand-written markup must be rewritten to `<wave=0 8,2,0.25>` (scenes, prefabs and assets migrate automatically).
3. **`<scramble>` and `<roll>` do nothing by themselves**: `Progress` defaults to 1 and `Roll` to 0. They need code, a driver or a state rule. `<scramble>` accepts no markup slots at all.
4. **`frequency` is not Hz** for wave/wobble/pulse/bounce/pendulum (radians per second), so defaults look slow (wave period 2.1 s, bounce 3.1 s). `Spin.Frequency` is turns/s, `Float.Frequency` noise steps/s, shake/glitch/scramble `Rate` re-rolls/s.
5. **Driving `Phase` without `Clock = Manual`** adds to the running clock (double speed).
6. **`Scaled` freezes at `timeScale 0`**: texts on pause menus, shop screens or HUD over a pause need `Unscaled`.
7. `Style.Enabled = false`, or removing the style, turns the markup into literal characters.
8. Nested/overlapping ranges of the **same** modifier type (or two instances sharing a key) do not add; the later-applied wins; past the 255th range per key per cycle all reuse the 255th's parameters.
9. `RollingModifier` is not an `IPhaseModifier`: `GetModifiers<IPhaseModifier>` loops miss it; drive `Roll` explicitly.
10. `ModifierFieldsAnimationHandler` silently ignores modifiers from a `StylePreset` or the global preset, per-range values and value-transition fields.
11. **Marquee**: throws on `UniTextWorld`/`UniText3D`; with `WordWrap`/`AutoSize` on, nothing scrolls; document-backed or externally scrolled text logs one error and does not scroll; suffix-less `speed`/`gap`/`fade` numbers are `em`, not px; only the first applied range's parameters count.
12. Pixel-art fonts with **Snap To Pixel Grid** round wave/shake/bounce/float offsets to whole font pixels: tiny amplitudes look dead.
13. `Glitch.Intensity = 1` is at most 40% of glyphs, not "constant chaos".
14. Rolling and Scramble characters outside the BMP cannot be in `Wheel` / `Charset`; characters missing from the wheel pass through unrolled; charset/wheel glyphs must exist in the font stack.
15. Rolling `Spread` direction: positive `Spread` settles right to left (the docs word it the other way).
16. The glyph animations drive vertex positions, not layout: they never reflow text, so a large amplitude can overlap neighbours or leave the rect (no clipping unless a mask is present).

**Performance / mobile**

17. **A running clock = a mesh rebuild of the whole component every frame**, plus a Canvas re-batch for Canvas text. Keep few texts animated; isolate them on a nested Canvas; do not animate list rows or paragraphs.
18. `Hide()` does not stop the tick; `enabled = false` does. Pooled animated texts: disable, or strip the tag first.
19. Zeroing amplitude does not stop the rebuild; only a `Manual` clock or removing ranges does.
20. Glitch (extra quads, styled-text tier) and Deform (`Full` tier, quad growth) are the expensive ones; keep them to one short text.
21. Changing `Frequency` / `Spread` on a running animation pops; animate via your own accumulated phase.

**Threading / lifecycle**

22. `OnGlyph` may run on a worker thread: no Unity API, no allocation.
23. Switching `Clock` to `Manual` discards accumulated clock time (the pose snaps to `Phase`); switching away counts from 0 again; disable/enable keeps it.
24. The phase modifiers ignore the reduced-motion accessibility flag (section 8.5).

**Version traps**

| Version | Change | Impact |
|---|---|---|
| 3.0 | v2 wobble animation became `WaveModifier`, a pure function of `Phase`; 11 glyph animations added; `UniTextAnimationBridge` became opt-in | code assuming self-animating wobble or automatic field diffing breaks |
| 3.2 | `UniTextPhaseDriver` and `IPhaseDriven` removed; per-modifier Animator handlers replaced by `ModifierFieldsAnimationHandler`; custom modifiers use `[Parameter]` + `[GenerateParameters]` + `ResolveParams` / `OnGlyph(..., phase)` | rewrite old custom modifiers |
| 3.3 | writing `Phase` / `Progress` / driver values rebuilds only the mesh | use `MarkParamsDirty` in custom modifiers |
| 3.9 | phase modifiers animate on their own `Clock` (default `Scaled`); `IPhaseModifier` added | externally fed phases need `Manual` |
| 3.10 | `WaveModifier.Amplitude` is `Vector2`; markup `<wave=8,...>` must become `<wave=0 8,...>` | rewrite runtime strings by hand |
| 3.12 | `MarqueeModifier` added (Canvas only) | — |
| 3.20 | lightest shader tier per text; `GlitchModifier.Params` no longer public | `WarmUpUi` tiers |

---

## Unverified

- Which of two nested same-type ranges counts as "applied last" (the later/inner one is likely).
- Whether stacking different animation types through nested tags (R10) and the composite per-child override `<hype=;;#FF4040>` behave as deduced from the per-type attribute keys and the empty-slot rule; neither was run.
- Whether a hidden (`Hide()`), culled or off-screen text skips the per-frame mesh pass while its clock ticks.
- Whether the Unity Animation window can bind a curve to a modifier field inside the serialized `Styles` list for `ModifierFieldsAnimationHandler`; the docs state only that the handler covers those fields.
- Whether an assembly holding custom modifiers must declare `[assembly: GenerateStateAccessors(Marker = "LightSide.ParameterAttribute")]` (the built-in assemblies do); the custom-modifier example in section 11 was not compiled.
- The exact static descriptor for `Phase` on a concrete modifier (`WaveModifier.Param.Phase`): the generated `Param` class was not readable; documented fallback is `ParameterDescriptor.Find(modifier, "phase")`. `Param.Amplitude` and similar field descriptors are documented.
- Size of the atlas hitch the first time a `Scramble` charset or `Rolling` wheel glyph is rasterized.
- Whether Glitch's extra quads add a draw call (they probably stay in the same batch, sorted by layer sequence).
- Cost of re-meshing one `UniTextWorld` that shares a sorting-context batch with others.
- The changelog says Deform has a "default tag name" `deform`, but no preset or picker entry creates it; treat `deform` as a convention.
- Order of per-glyph callbacks between independently registered animations (matters for non-commuting effects such as rotate-then-offset); colour/alpha write ordering for custom `GlyphParamModifier` subclasses is likewise untested.
- The string form `text.SetWholeText<MarqueeModifier>("PingPong,40px,1.5")` follows the documented slot order and enum parsing but was not run; the "word wrap off is required to scroll" rule is deduced from the measure check.
