# UniText — Effects and Paint Layers

> **Base path:** `<UniTextRoot>` is the folder of the UniText package — the one whose `package.json` has `"name": "media.lightside.unitext"` (find it with `Glob **/media.lightside.unitext/package.json`; it may sit under `Packages/` or `Library/PackageCache/`). Never hard-code its location.
> See also: [unitext-materials-shaders.md](unitext-materials-shaders.md), [unitext-markup-system.md](unitext-markup-system.md), [unitext-formatting-tags-quickref.md](unitext-formatting-tags-quickref.md), [unitext-emoji.md](unitext-emoji.md), [unitext-animation-phase.md](unitext-animation-phase.md), [unitext-range-state-rules.md](unitext-range-state-rules.md), [unitext-performance-mobile.md](unitext-performance-mobile.md), [unitext-runtime-api.md](unitext-runtime-api.md), [unitext-3d-text.md](unitext-3d-text.md), [unitext-version-traps.md](unitext-version-traps.md)

---

Mobile verdicts in this file (`OK` / `LIMIT` / `AVOID`) come from reading package source and docs. Nothing was profiled. Figures that come from the package docs are labelled "vendor". All code assumes `using LightSide;` and the main thread.

## 1. Lookup — "I want X, do this"

| I want | Do this | Recipe |
|---|---|---|
| Outline on the whole text | `text.SetWholeText<StrokeModifier>("#000000,2px")` (or `Style.WholeText(new StrokeModifier(), "...")`) | R1 |
| Outline on one word or range | `Style.Tag(new StrokeModifier(), "stroke", "#000000,0.08em")`, markup `<stroke>word</stroke>` | R2 |
| Drop shadow | `ShadowModifier`, e.g. `Style.WholeText(new ShadowModifier(), "#000000B0,2px -2px,1px,0")` | R4 |
| Glow / halo | `GlowModifier`, parameter `paint,radius` (radius default 0.3 em, already at the reach cap) | R5 |
| Inset / letterpress | `InnerShadowModifier` registered **after** a `FillModifier` | R11 |
| Extruded / 3D-looking title | `ExtrudeModifier` (solid colours only, titles only) | R12 |
| Plain face colour | Use `<color>` (`ColorModifier`), **not** `FillModifier` | R3 |
| Solid fill with softness/dilate, or any paint feature | `FillModifier` (any fill switches the component to list-order stacking) | §4, §7 |
| Linear gradient | `FillModifier` + a swatch (`PaintSwatch.LinearGradient`) in a provider | R6, R7 |
| Radial or angular (conic) gradient | swatch with `projection.kind = Radial` / `Angular`, optional `fit = Contain` | R8 |
| Texture / foil / marble fill | swatch with a `Texture` source, `fit = Tile`; costs separate draws | R10 |
| Named project-wide paints (`<fill=gold>`) | `UniTextPaints` asset + `GlobalSettingsPaintProvider` on each layer | R9 |
| Rarity-coloured item names | composite (stroke + fill) per rarity tag, gradient swatches | R6 |
| Hollow (outline-only) text, double outline | composite with a transparent fill / two stroke instances | R13 |
| Per-range effect | `Style.Tag(modifier, "name", defaultParam)` | R2 |
| Whole-text effect | `Style.WholeText(...)` / `SetWholeText<T>(...)` / picker "Whole Text" | R1 |
| Effect on emoji / inline sprites | `ColorGlyphs = ColorGlyphPolicy.Apply` on the modifier (shadow and glow already apply) | R14 |
| Grey out a locked item / sepia | `FilterModifier` registered **last** in Styles | R15 |
| Additive / screen glow | `Blend = LayerBlend.Additive` as a modifier field | R16 |
| Change an effect at runtime | write the modifier property (`glow.Radius = ...`) | R17 |
| Same vocabulary in every text | `StylePreset` assigned as the global style preset | R18 |
| Line drawn above the text with its own outline | `UnderlineModifier` slot `overlay=true` | R19 |
| Neighbouring glyph layers interleave (tight tracking, big shadows) | `PaintOrderModifier` (glyph-major) | R20 |
| Arabic / script font strokes cross the joins | `UnionModifier` (heavier shader tier) | R22 |
| Sharp mitred outline corners | component `RenderMode = MSDF` and `Corners = sharp` | §9 |
| Per-letter rainbow, dissolve, hologram, custom shader | `MaterialModifier` — see [unitext-materials-shaders.md](unitext-materials-shaders.md) | — |

## 2. Core rules

1. **No effect has a built-in tag.** A fresh component understands no tag. The Styles picker offers Fill, Stroke, Shadow, Glow, Inner Shadow, Extrude only as **Whole Text** styles. A per-range effect needs `Style.Tag(...)` (or a Tag Rule source set in the Style inspector). For the full bootstrap see the master rule `../unitext.md`, section "Tag vocabulary bootstrap", and [unitext-markup-system.md](unitext-markup-system.md).
2. **Always write units.** A number without a suffix uses the field's unit, which is **em** for every width, blur, radius and softness. `<stroke=2>` is a 2 em stroke. Write `2px` or `0.08em`.
3. **A layer has no paint provider by default.** Swatch names (`<fill=gold>`) resolve only after a provider is assigned. Without one, the token is read as a colour literal; an unknown name becomes **opaque white**, silently.
4. **Styles list order is z-order** once any `FillModifier` exists. Without a fill, outward layers (outside stroke, shadow, glow, extrude) are placed behind the text automatically.
5. **A solid fill overwrites `<color>`.** Do not add a `FillModifier` just to set a colour.
6. **The shader tier is per text component.** One outlined word moves the whole component to the `StyledText` tier. Keep long body text effect-free and put decorated numbers/titles in their own components.
7. **Every outward effect is capped at 0.5 em** of reach (the SDF atlas range). Wider strokes, bigger glows and larger blur+spread clip.

Doc-vs-code: the 2.x `<outline>` and `<gradient>` tags do not exist in 3.30 source (the docs disagree about whether they "survive"). Treat both as absent; use `StrokeModifier` and `FillModifier` with your own tag names.

## 3. Which effects have a tag, and how a tag gets there

| Effect | Built-in tag | Picker entry | To use per range |
|---|---|---|---|
| Fill, Stroke, Shadow, Glow, Inner Shadow, Extrude | none | Whole Text group (Fill/Stroke/Shadow also in the quick-toggle row) | `Style.Tag(modifier, "name", default)` — name is yours |
| Filter, Union, PaintOrder, GlyphResolution, Highlight | none | auto-listed Whole Text entries | same; `Style.Tag(...)` |
| `<color>`, `<alpha>`, `<u>`, `<s>`, `<mat>` | none until registered | picker tag presets | add the preset in the inspector or register the style in code |
| `<outline>`, `<gradient>` | removed in 3.x | — | not usable; `TagRuleMigration` only retypes old assets to a `TagRule` of that name, without a working modifier |
| `stroke`, `shadow`, `glow`, `extrude`, `fill`, `inner-shadow` | sample convention only | — | the BasicUsage sample registers them; copy the idea, not the assumption |

Style sources (`Style` factory methods): `Style.Tag(modifier, tagName, defaultParam = null)`, `Style.WholeText(modifier, param = null)` (no source, applies everywhere, the parameter is the default parameter), `Style.Range(modifier, start, end, param = null)` (codepoint indices of the **rendered** text, end exclusive), `Style.FromSource(source, modifier)` (Markdown rules, trigger words, mutable ranges). A style can be skipped with `Style.Enabled = false` without losing its configuration. Collision order: local `Styles` list, then `StylePresets`, then the global preset; the first registered rule for a name wins.

`Style.Tag(...)` semantics: `<warning>` uses the default parameter; `<warning=#FFA500>` overrides slot by slot (merge is per slot). Prefer one dedicated tag per look with a default parameter over long positional strings in markup.

## 4. Layer catalog

Every layer is an ordinary modifier. Each layer is one extra quad per glyph drawn from the same SDF atlas through the shared UI material; there is no per-effect material. Slot defaults are the modifier's serialized defaults (what a freshly created style gets).

| C# type | What it does | Own slots, in order, with defaults | Picker | Mobile |
|---|---|---|---|---|
| `FillModifier` | Fills the glyph interior with colour, gradient or texture. The first fill **claims the base quad** (no extra geometry for solid/gradient); more fills stack as extra quads. Any fill suppresses the implicit default fill. | `paint` (Default = white), `softness` (em, 0), `dilate` (em, 0, outward growth) | Whole Text "Fill" | OK. Solid, softness 0, dilate 0 recolours the base quad in place and stays on the `Text` tier. Extra fill layers: LIMIT (+1 quad each). |
| `StrokeModifier` | A real rim band around the outline; works with fill off. | `paint` (Default = black), `width` (**0.12 em**; rim half-width = width/2), `align` (-1 inside .. 0 centred .. **+1 outside**; keywords `inside` / `center` / `outside`), `softness` (em, 0) | Whole Text "Stroke" | OK (+1 quad/glyph). Budget 1-3 layers on HUD/list text. |
| `ShadowModifier` | Offset, blurred duplicate with real blur and spread, any paint. | `paint` (Default = `#00000080`), `offset` (**0.1 -0.1 em**, token `"x y"`), `blur` (em, 0.1), `spread` (em, 0.1, outward growth) | Whole Text "Shadow" | OK (+1 quad/glyph). Decorates emoji by default. |
| `GlowModifier` | Soft halo: a shadow with no offset and a wide soft edge. | `paint` (Default = white), `radius` (em, **0.3**) | Whole Text "Glow" | OK (+1 quad/glyph). Decorates emoji by default. |
| `InnerShadowModifier` | Inset shadow hugging the inner edge; the offset is a second SDF tap in the shader, not a quad move. | `paint` (Default = black), `offset` (**0 -0.1 em**), `blur` (em, 0.1) | Whole Text "Inner Shadow" | LIMIT: two atlas taps per fragment (+1 quad, no growth). |
| `ExtrudeModifier` | A stack of progressively offset duplicate quads behind the face, shaded near to far. Solid colours only (no swatch or gradient). | `offset` (plain floats, token `"x y"`, **0.3 -0.3 em**; px when `FixedPixelSize`), `nearColor` (white), `farColor` (black), `dilate` (0), `softness` (0) | Whole Text "Extrude" | AVOID on lists and animated text; fine for a title. Costs `Steps` quads per glyph (default 10, doubled with `Bevel`). |

Non-markup fields of `ExtrudeModifier`: `Steps` (10, minimum 1), `Bevel` (false, alternates near/far per slice and doubles the slice count), `FixedPixelSize` (false). Set them in C# or the inspector; they are not tag slots.

Other effect-related modifiers:

| C# type | What it does | Slots / fields | Registration | Mobile |
|---|---|---|---|---|
| `FilterModifier` | Adjustment layer: its `ColorFilter` recolours the face and every layer **below it in Styles**, plus colour emoji and texture paints. Stacked filters compose bottom-up. | `strength` (0..1, default 1); field `Filter` (default `GrayscaleFilter`) | user tag, e.g. `locked` | OK (no extra quads; texture paints use colour-matrix atlas rows, gradients re-bake a ramp row per filter) |
| `UnionModifier` | Draws overlapping letters (Arabic, cursive, script fonts) as one shape so strokes do not cross joins and translucent layers do not double. | no parameters | Whole Text | LIMIT: moves the text to the heavier `UnitedText` tier. Colour glyphs, deformation, texture paint, non-Normal blend, glyph-major order, custom shaders and HDRP lit world text draw per glyph instead. Use only where joins show. |
| `PaintOrderModifier` | Per-range painter order: layer-major vs glyph-major. | `order` (`layer`/`glyph` or `l`/`g`, default glyph), `reverse` (bool, glyph-major only: first glyph on top) | user tag or Whole Text | LIMIT: per-glyph sort on the CPU |
| `UnderlineModifier`, `StrikethroughModifier` | Lines drawn as virtual glyph quads; stroke/shadow/glow reach them. | `paint` (inherit face), `style` (`solid`/`double`/`dotted`/`dashed`/`wavy`), `thickness` (0 = font metric), `offset` (em), `skipInk` (false), `blend` (inherit), `overlay` (false) | picker tags `u` / `s` (Markdown `++x++`, `~~x~~` optional) | OK |
| `HighlightModifier` | Range background (not a glyph effect); same presentation as live selection. | `paint` (translucent blue `#3380FF66`), `geometryMapping`, `paintMapping`, `shape`, `fit`, `angle`, `scale`, `paintOffset`, `height`, `padding`, `cornerRadius`, `mergeThreshold`, `order`, `tint`, `blend`, `spread` | Whole Text; samples use composites; link/selection use: [unitext-interaction-links.md](unitext-interaction-links.md) | OK. Its default provider is `GlobalSettingsPaintProvider` (unlike layers). |
| `AlphaModifier` | Multiplies alpha of the glyph and every layer drawn from it; nested tags do not compound. | `alpha`: `0.5`, `50%` or `#80` | picker tag `alpha` | OK |
| `ColorModifier` | Sets the face vertex colour. | `#RGB`, `#RRGGBB`, `#RRGGBBAA` or a named colour (white black red green blue yellow cyan magenta orange purple gray lime brown pink navy teal olive maroon silver gold) | picker tag `color` | OK. Overridden by a solid `FillModifier`. |
| `GlyphResolutionModifier` | Raises atlas tile resolution of its glyphs by 0-2 size classes (about 4x tile memory per class); grow-only, shared across components. | `resolutionBoost` (int 0-2) | Whole Text | LIMIT: large crisp headings only, never paragraphs |
| `MaterialModifier` | Routes a range to a sub-mesh drawn with your own material. | markup slot `tint`; fields `Material`, `RenderOrder`, `ConstantUv2/3`, ... | picker tag `mat` | LIMIT: splits batches; see [unitext-materials-shaders.md](unitext-materials-shaders.md) |

Underline slot order is paint, style, thickness, offset, skipInk, blend, overlay; the overlay slot is the seventh (`<u=,,,,,,true>`).

### Shared tail slots (Fill, Stroke, Shadow, Glow, Inner Shadow)

After a layer's own slots, every paint layer reads these in order. Each has a serialized property of the same name and a per-tag override.

| # | Slot (property) | Values | Default -> final fallback | Meaning |
|---|---|---|---|---|
| 1 | mapping (`Mapping`) | `inherit`, `block`(b), `line`(l), `glyph`(g), `range`(r) | Inherit -> **Block** | Frame the paint is measured against: whole text block, per line, per glyph, or the styled range. One sweep across a sentence = Block or Range; restart per letter = Glyph. |
| 2 | shape (`Shape`) | `linear`(l), `radial`(r), `angular`(a), `pattern`(p, reads as linear in text) | Inherit -> Linear | Gradient geometry (gradient swatches only) |
| 3 | fit (`Fit`) | `stretch`(s), `contain`, `cover`, `tile`(t) (write `contain`/`cover` in full) | Inherit -> Stretch | Aspect handling. Radial/Angular with non-Stretch keep rings circular; Linear ignores it; Tile uses `scale` as the repeat count. Textures use pixel aspect. |
| 4 | angle (`Angle`) | degrees | NaN -> 0 | Mapping rotation. 0 = left to right; the frame math is `u = dx*cos + dy*sin`. |
| 5 | scale (`Scale`) | float | NaN -> 1 (non-positive -> 1) | Uniform zoom of the frame |
| 6 | offset (`PaintOffset`) | `"x y"` | NaN -> (0,0) | Pan in normalised frame units |
| 7 | corners (`Corners`) | `round`(r), `sharp`(s) | Round | Round = Euclidean distance, artefact-free. Sharp = mitred up to `miterLimit`; **single-channel SDF draws Sharp as Round**. |
| 8 | miterLimit (`MiterLimit`) | 1..8 | 2 | SVG miter-limit semantics |
| 9 | tint (`Tint`) | Color32 | white | Multiplies every paint kind. Alpha 0 on a non-fill layer = the layer emits nothing. |
| 10 | blend (`Blend`) | `normal`, `multiply`, `screen`, `additive`, `exclusion`, `inherit` | Inherit -> swatch blend -> Normal | Composites against the layers beneath |
| 11 | spread (`PaintSpread`) | `clamp`(c), `repeat`(r), `mirror`(m) | Inherit -> Clamp | Gradient continuation outside the frame; inert for Angular; textures use the texture's own wrap mode |
| 12 | colorGlyphs (`ColorGlyphs`) | `inherit`, `skip`(s), `apply`(a) | Inherit -> effect default | Whether the effect decorates emoji/inline sprites (§10). Last slot of every effect. |

`Extrude` has no projection slots: its tag is `offset, nearColor, farColor, dilate, softness, blend, spread, colorGlyphs`.

## 5. Slot grammar — how to decode a tag value

Full positional order per layer (paint is optional slot 0):

- **Fill**: `paint, softness, dilate, mapping, shape, fit, angle, scale, offset, corners, miterLimit, tint, blend, spread, colorGlyphs`
- **Stroke**: `paint, width, align, softness, mapping, shape, fit, angle, scale, offset, corners, miterLimit, tint, blend, spread, colorGlyphs`
- **Shadow**: `paint, offset, blur, spread, mapping, shape, ...` (same tail as Fill). Here `spread` is outward growth in em, **not** the gradient `paintSpread` slot (#11 of the tail).
- **Glow**: `paint, radius, mapping, ...`
- **InnerShadow**: `paint, offset, blur, mapping, ...`
- **Extrude**: as in the table above.

Rules the parser follows:

- **Paint slot is consumed only if the first token is a genuine paint**: a `#hex` literal, a known swatch name (when a provider exists) or a named colour. Anything else rewinds, so `<stroke=2px>` is a width, not a paint.
- An **empty leading slot** (`<stroke=,2px>`) is consumed and means "default paint".
- **Empty middle slots take the default** (`<fill=gold,,,range>` leaves softness and dilate alone).
- A tag value overrides the style's default parameter per slot; a bare tag uses the default parameter, then the modifier's own field values. An unreadable tag value falls back to the modifier's own setting.
- An `x y` value (offset) is one token with a space inside; commas separate slots.

Worked decodes:

```
<stroke=#FF3030,3px,center>        stroke: paint=#FF3030  width=3px  align=center
<grad=sunset,,,glyph,radial,contain>   fill: paint=sunset  (softness,dilate empty)  mapping=glyph  shape=radial  fit=contain
<shadow=#00000099,0.04em -0.06em,0.05em,0>   shadow: paint  offset=(0.04em,-0.06em)  blur=0.05em  spread=0
<u=#FFD23F,wavy,2px,,,,true>       underline: paint  style=wavy  thickness=2px  offset,skipInk,blend empty  overlay=true
```

Do not write positional strings beyond the first three or four slots. Positional numbers differ per modifier, and the later slots (blend, spread, colorGlyphs) are easy to misplace. Use the modifier field instead (`new GlowModifier { Blend = LayerBlend.Additive }`) and expose it as its own tag.

### Units

`UnitValue` / `UnitVector2` suffixes: `px` or `abs` (absolute, constant on-screen size), `em` (multiple of font size, scales with the text), `%`, `delta`. A suffix-less number uses the **field's unit** (em for all effect defaults above). A `UnitVector2` shares one unit: em if either axis says em, otherwise absolute. Inspectors of paint layers offer only `px` and `em`; use only those two for effect geometry. In C#: `UnitValue.Em(0.2f)`. Pixel-art fonts (Snap To Pixel Grid) make strokes, glows and shadows step in whole font pixels.

## 6. The paint model

**`PaintRef`** — the authored choice on a layer's `paint` slot: `Default` (the layer's own default colour), `Color` (inline `Color32`), `Swatch` (a name). Helpers: `PaintRef.Solid(Color32)`, `PaintRef.Named(string)`, `IsDefault`. In markup a token starting with `#` is always a colour; otherwise a swatch name is tried first, then a named colour.

**`PaintSwatch`** — one catalogue row: `{ string name; Paint paint; PaintMapping mapping; }`. `Paint` is `{ PaintSource source; PaintProjection projection; LayerBlend blend; }`. `PaintSource` has a kind (`Solid`, `Gradient`, `Texture`), a colour, a gradient and a texture. `PaintProjection` has kind, fit, spread, angle, scale, offset.

**`TextPaint`** — the resolved runtime paint (never serialized). Custom paint consumers and custom `PaintLayerModifier` subclasses use `TextPaint.Solid`, `Resolve(token, catalog)`, `Resolve(PaintRef, catalog)`, `BuildFrame(Rect)`.

**Providers** (`IPaintProvider`, a named catalogue of swatches). A layer's `Provider` property is null until you assign one:

| Provider | Source of swatches | Use |
|---|---|---|
| `InlinePaintProvider` | its own `.Entries` list, filled in code | per component or per style, swatches defined in C# |
| `AssetPaintProvider` | `.Asset` = a `UniTextPaints` asset | per style, swatches from a specific asset |
| `GlobalSettingsPaintProvider` | `UniTextSettings.Paints` (project-wide, rebinds when it changes) | the shared look vocabulary |

`UniTextPaints` is a ScriptableObject (`Create -> LightSide -> UniText -> Paints`). The package ships `UniTextSettings` with no `Paints` asset assigned, so a global provider resolves nothing until you assign one. Swatch edits re-render only the texts that referenced the changed names. Provider hooks run on the main thread. A gradient can be reached **only through a swatch**.

**Null-provider behaviour (silent):** the leading token goes through `IsPaintToken` (hex literal, known swatch name, or named colour). With no provider, `gold` is a named colour and paints flat gold, and `legendary` paints opaque white. No warning is logged.

**Resolution rules.** A gradient swatch needs a row in the shared ramp atlas (256-sample half-float row per distinct gradient, deduped and ref-counted); an empty stop list gives a solid fallback. A texture swatch with a null or destroyed texture renders **magenta** and logs one warning. Create and assign the swatch before the text rebuilds that use it.

**Projection chain** (weakest to strongest): swatch -> modifier field -> default parameter (`TagRule.defaultParameter` / `Style.DefaultParameter`) -> tag attribute. `Inherit` enum members and `NaN` floats mean "no value here". Final fallbacks: mapping Block, shape Linear, fit Stretch, spread Clamp, blend Normal, angle 0, scale 1, offset (0,0).

Enums (all in `LightSide`):

| Type | Members |
|---|---|
| `PaintRefKind` | Default, Color, Swatch |
| `PaintSourceKind` | Solid, Gradient, Texture |
| `PaintMapping` | Inherit, Block, Line, Glyph, Range (the swatch field; not the highlight's `RangePaintMapping`) |
| `PaintProjectionKind` | Inherit, Linear, Radial, Angular, Pattern |
| `PaintFit` | Inherit, Stretch, Contain, Cover, Tile |
| `PaintSpread` | Inherit, Clamp, Repeat, Mirror |
| `LayerBlend` | Inherit, Normal, Multiply, Screen, Additive, Exclusion (premultiplied; Multiply exact only over opaque backdrops) |
| `ColorGlyphPolicy` | Inherit, Skip, Apply |
| `PaintLayerModifier.CornerStyle` | Round, Sharp |
| `PaintOrder` | Layer, Glyph |
| `UniTextRenderMode` | SDF (default, rounded effect corners), MSDF (sharp corners); per component |

**Gradients.** `LightSide.Gradient` (not `UnityEngine.Gradient`; qualify it if both namespaces are imported) holds any number of `GradientStop(float time, Color color)` with colour and alpha in one list: `new Gradient(stops, GradientInterpolation)`, `Evaluate(t)`, `WithStops/WithStop/WithAddedStop/WithoutStopAt`. `GradientInterpolation`: Smooth (sRGB lerp), Linear (linear light), Perceptual (Oklab), Stepped. `PaintSwatch.LinearGradient(name, angle, params GradientStop[])` builds a Perceptual gradient, mapping Range, Linear/Stretch/Clamp. There is no builder for radial, angular or texture swatches: fill the struct fields.

**Colour filters** (`FilterModifier.Filter`): `GrayscaleFilter`, `SaturationFilter` (`Amount` 0..3), `HueRotateFilter` (`Degrees`), `BrightnessFilter`, `ContrastFilter`, `ExposureFilter` (`Stops`), `InvertFilter`, `SepiaFilter`, `TintFilter` (`Color`), `ColorMatrixFilter` (3x4 `Matrix`). Subclass `ColorFilter` (`ToMatrix()`) for your own; a serialized field on a custom filter needs `[StatePassive]` or `[StateField]` in a `partial` class, otherwise compile error LSST008. Setting `Amount/Degrees/Stops/Color/Matrix` from script re-renders the text by itself.

## 7. Stacking and z-order

Every quad (the face and each duplicate) records a layer sequence, and the mesh index buffer is sorted by it.

- **No explicit fill** (no `FillModifier`, no `MaterialModifier` in Replace mode): layers that render behind the fill (outside stroke with `align > 0`, shadow, glow, extrude) get negative sequences **below** the implicit base fill. Other layers (inside/centred stroke, inner shadow, ...) follow Styles order above it.
- **Any explicit fill**: every layer takes plain **Styles list order**; earlier = lower.
- Safe order for a full stack when a fill exists: shadow, glow, extrude, stroke, fill, inner shadow (outward layers before the fill, inset layers after, filter last).
- A stroke with `align <= 0` renders in front of the fill.
- Overlapping ranges of **one layer instance** resolve once per codepoint: the innermost wins (greater start, then narrower end). Nested same-tag ranges do **not** stack. Stacking needs separate modifier instances (a composite). At most **255 applied ranges per layer instance**; extra ranges keep the earlier winner.
- `CompositeModifier [child;child;...]`: `;` splits the tag parameter per child; child order is layer order. One tag can drive several layers (R6, R13).
- Decoration lines (`u`/`s`) take part in the stack; `overlay=true` raises the line's whole stack (face, stroke, shadow, glow) above the text it crosses.

**Compositing mode.** Layer-major (the component default, cheapest) paints each layer across all glyphs, then the next layer. Glyph-major (`PaintOrderModifier`) paints all layers of glyph 1, then glyph 2, and so on, so a shadow of one letter no longer covers its neighbour. Texture paints and the colour-glyph segment always stay layer-major; a blend change between adjacent glyph-major quads splits the draw.

## 8. Cost model (what each feature adds)

| Feature | Extra geometry | Shader tier / fragment cost | Draw effect | Mobile |
|---|---|---|---|---|
| Plain text, `<color>`, `<alpha>`, solid fill (softness 0, dilate 0) | 0 | `Text` | batches with other `Text` texts | OK |
| Solid fill with softness/dilate; any gradient fill | 0 (claims base quad) | `StyledText`; gradient adds one ramp-row fetch | same material | OK |
| Stroke / Shadow / Glow | +1 quad per glyph per layer, enlarged by the effect reach (overdraw) | `StyledText`, one atlas tap | merges into one draw while blend is uniform | OK, 1-3 layers |
| Inner shadow | +1 quad, no growth | two atlas taps | same | LIMIT |
| Extrude | +`Steps` quads (default 10, bevel x2) | `StyledText` | same | AVOID on lists/animated text |
| Texture fill | textured copy in a per-(texture, sequence, blend) sub-mesh | `StyledText` + paint-texture path | separate draw(s); always layer-major | LIMIT |
| `UnionModifier` | none | `UnitedText` (heavier) | splits from `StyledText` texts | LIMIT |
| Non-Normal `LayerBlend` | none | | each blend change is a new draw entry | AVOID mixing blends in one text |
| `MaterialModifier` | Replace: 0 extra; Keep: +1 | custom shader | own renderer, splits batches | LIMIT |
| Glyph-major `PaintOrder` | none | | per-glyph CPU sort | LIMIT |
| `FilterModifier` | 0 | colour-matrix rows | none | OK |
| Underline / strike | virtual glyph quads (+ layers) | `StyledText` | | OK |
| `GlyphResolutionModifier` | 0 | atlas tile memory x4 per class | | headings only |
| Parameter change at runtime | text mesh rebuild (parallel worker) | | | LIMIT per frame on many texts |

**Tier selection.** A text draws with the lightest shader tier that covers everything on it: `Text` (glyph fill + colour glyphs) < `StyledText` (stroke/shadow/glow/inner shadow, corner styles, fill softness, paint layers, colour filters, range decorations) < `UnitedText` (StyledText + glyph unions) < `Full` (everything including deformation). The base segment's tier is `Full` if any glyph is deformed, else `UnitedText` if unions exist, else `StyledText` if the extra UV channels are allocated, else `Text`. A compiled program's register allocation is static, so a heavier tier slows every fragment it draws, and materials of different tiers never batch.

**Draw merging.** The base segment is emitted as one draw per maximal run with one blend and no separate-material sub-mesh between its consecutive layer sequences. So fill + stroke + shadow + glow on one text is **one draw** while they share a blend and nothing textured or custom sits between them. A sub-mesh whose sequence falls between two layers splits the run there. Vendor claim: on a low-end phone, plain text takes several times less GPU time than before tiers existed. Check real draw counts in the Frame Debugger.

**Runtime parameter writes.** Layer properties are state-tracked: a write marks the mesh dirty (a mesh-only rebuild, no re-shaping). Cost is one text mesh rebuild per change. Animating `PaintOffset` does not touch the ramp but still rebuilds the mesh; animating gradient *stops* also re-bakes a ramp row. Per-frame animation of layer parameters on many texts is expensive; prefer a shader-time effect ([unitext-materials-shaders.md](unitext-materials-shaders.md)) or a driver clip on a few texts ([unitext-animation-phase.md](unitext-animation-phase.md)).

## 9. Reach cap, SDF vs MSDF, atlas quality

- The atlas stores signed distance in em clamped to **±0.5 em** (`GlyphAtlas.Pad`). Every effect's outward reach is capped there. Reach by effect: outside stroke about `width + softness`, shadow `spread + blur`, glow `2 x radius` (the default radius 0.3 em is already past the cap), fill `dilate + softness`. Keep glow radius at or below about 0.25 em, and the sum of blur + spread below 0.5 em.
- The glyph's atlas rim grows in tiers on demand (0.06, 0.15, 0.30 glyph heights, then the full spread). Larger rims cost tile resolution and a re-raster.
- Atlas defaults: 2048x2048 pages, 16-bit precision. 8-bit halves page memory but can band in effects far from the glyph edge. Changing atlas size or precision at runtime discards cached glyphs. MSDF pages are four times the bytes of SDF pages (vendor figures: 16 MiB SDF and 64 MiB MSDF for the two page-sized upload buffers that 3.1 removed).
- Prefer **SDF** on mobile. MSDF only buys `Corners = sharp` (mitred outline and shadow corners) and crisp display type. Effects of every kind work in both modes.
- Quality set in `UniTextSettings`: `SdfAtlasSize`/`MsdfAtlasSize`/`ColorAtlasSize` (1024 or 2048), `SdfAtlasPrecision`/`MsdfAtlasPrecision` (8 or 16 bit); per component `RenderMode`.

## 10. Colour glyphs (emoji and inline sprites)

Defaults (`DefaultColorGlyphPolicy`): **Shadow and Glow = Apply**; Fill, Stroke, InnerShadow, Extrude, Glitch = **Skip**. Set `ColorGlyphs` on the modifier (or in the last slot) to change it.

- `Apply` makes the effect follow the emoji silhouette (alpha at a 50 % threshold), so a stroke outlines the emoji shape.
- `Fill` with `Apply` repaints the silhouette in its paint instead of the picture. A fill that leaves a colour glyph untouched keeps the picture at that fill's layer position (the topmost such fill wins).
- `AlphaModifier` and `FilterModifier` always include colour glyphs.
- Inline sprites are drawn as glyphs inside the text mesh, so they follow the same policy. Emoji fonts and sprite handling: [unitext-emoji.md](unitext-emoji.md).

## 11. `<mat>` and `MaterialModifier` versus paint layers

`MaterialModifier` is a different mechanism: it routes a range into a sub-mesh with its own `CanvasRenderer` and your own material and shader. Paint layers on the same range are still separate base-mesh quads through the stock shader; they never pass through your custom shader. `RenderOrder.Replace` removes only the face on the range; stroke, shadow and glow keep rendering. `Keep` draws the material as an extra layer ordered by its Styles position. The tag only selects the range, and the material is a field, so **one tag = one material**. Everything about shipped materials, custom shaders and per-text knobs is in [unitext-materials-shaders.md](unitext-materials-shaders.md).

## 12. C# surface

| Member | Notes |
|---|---|
| `UniTextBase.Styles` | the style list; `Add` / `Remove`; order is z-order |
| `SetWholeText<T>(string parameter = null)`, `ClearWholeText<T>()`, `ToggleWholeText<T>(string)`, `GetWholeTextParameter<T>()` | `where T : BaseModifier, new()`; idempotent (updates the parameter of an existing local whole-text style of type T, else adds one); touches local `Styles` only |
| `EnsureStyleFor<T>(ParseRule)` | merges several syntaxes (a tag and a Markdown marker) into one modifier through `CompositeParseRule` |
| `GetModifier<T>()`, `TryGetModifier<T>(out T)`, `GetModifiers<T>(List<T>, bool includeChildren = false)` | return the **component's own copy** (preset styles are copied per component) |
| `MarkModifierDirty(this UniTextBase, BaseModifier, UniTextDirty)` | the package sample calls it with `UniTextDirty.Mesh` after changing a glow nested in a composite |
| Layer properties | `Paint`, `Provider`, `Mapping`, `Shape`, `Fit`, `Angle`, `Scale`, `PaintOffset`, `Corners`, `MiterLimit`, `Tint`, `Blend`, `PaintSpread`, `ColorGlyphs`; `StrokeModifier.Width/Align/Softness`; `ShadowModifier.Offset/Blur/Spread`; `GlowModifier.Radius`; `InnerShadowModifier.Offset/Blur`; `FillModifier.Softness/Dilate`; `ExtrudeModifier.Offset/NearColor/FarColor/Dilate/Softness/Steps/Bevel/FixedPixelSize` |
| `Param` descriptors | one for every slot except `paint` (`StrokeModifier.Param.Width`, `PaintLayerModifier.Param.Tint`, `ExtrudeModifier.Param.Offset`), so rules and driver clips can animate any slot except the paint itself ([unitext-range-state-rules.md](unitext-range-state-rules.md)) |
| `UniTextBase.RenderMode` | `UniTextRenderMode` SDF (default) / MSDF |
| `UniTextWorld` flags | `Lit` (default off), `CastShadows` (off), `Standalone` (own renderer, +1 draw call). Effects work on world text; a build must include the world shaders (the **Include World Shaders** option, plus **Include Lit Shaders** for lit text; see [unitext-materials-shaders.md](unitext-materials-shaders.md)). |
| `UniTextSettings.Paints` / `GlobalStylePreset` | project-wide paints asset and style preset (`Create -> LightSide -> UniText -> Style Preset`) |

## 13. Recipes

The snippets are adapted from the package samples and API pages and were not compiled in a project. "Add tag" always means `text.Styles.Add(Style.Tag(modifier, "name", defaultParam))`.

**R1 — Outline the whole text (HUD counter, button label)**

```csharp
text.SetWholeText<StrokeModifier>("#000000,2px");        // paint, width: 2 px rim outside the glyph
bool on = text.ToggleWholeText<StrokeModifier>("#000000,2px");   // toggle-able
// or: text.Styles.Add(Style.WholeText(new StrokeModifier(), "#000000,2px"));
```

Setup: none beyond the component. Result: a black 2 px rim behind the glyphs (no fill exists, so the outside stroke is placed behind automatically). Inspector equivalent: Styles `+` -> Whole Text -> Stroke, set Width to `px`. Gotcha: `"2"` without a unit is 2 em.

**R2 — Outline one word: a per-range stroke tag**

```csharp
text.Styles.Add(Style.Tag(new StrokeModifier(), "stroke", "#000000,0.08em"));
text.Text = "Normal <stroke>outlined</stroke> and <stroke=#FF3030,3px,center>red centred</stroke>";
```

Setup: the tag name `stroke` is yours; nothing is registered until this line runs. Result: the bare tag uses the default `#000000,0.08em`; the second use overrides paint, width, align per slot. Inspector route: add Whole Text -> Stroke, open the style's Source foldout, choose Tag Rule, set the tag name and Default Parameter. Gotcha: nested `<stroke>` inside `<stroke>` does not stack (innermost wins).

**R3 — Outlined damage number / pickup text**

```csharp
text.Styles.Add(Style.WholeText(new StrokeModifier(), "#1A0A00,0.08em"));
text.Styles.Add(Style.WholeText(new ShadowModifier(), "#00000099,0.04em -0.06em,0.05em,0"));
text.Styles.Add(Style.Tag(new ColorModifier(), "color"));
text.Text = "<color=#FFD23F>-125</color>";
```

Result: gold digits with a dark outline and a soft shadow, both behind the face. Keep `<color>` as the face colour; do not add a `FillModifier`. Pool the component and `Hide()` it after the fade-out. Gotcha: component alpha fades all layers as one group, but each layer still blends on its own, so a half-faded text shows the outline and shadow through the fill. Call `Hide()` once the fade-out ends (a text at alpha 0 is still drawn and takes pointer events).

**R4 — Drop shadow under HUD text**

```csharp
text.SetWholeText<ShadowModifier>("#000000B0,2px -2px,1px,0");   // paint, offset, blur, spread
```

Result: a crisp 2 px shadow down and right (negative y is down). A bare shadow is 50 % black with offset (0.1, -0.1) em, blur 0.1 em, spread 0.1 em. The offset moves the quad and is not SDF-limited; blur + spread are limited by the 0.5 em cap. One extra quad per glyph: OK on HUD and list text.

**R5 — Glowing title**

```csharp
text.Styles.Add(Style.Tag(new GlowModifier(), "glow", "#FFD54A,0.2em"));   // paint, radius
text.Text = "<glow>HOT</glow> and <glow=#40E0FF,0.15em>cold</glow>";
```

Result: a soft halo about twice the radius wide. Keep the radius at or below 0.25 em. Glow and shadow decorate emoji by default; set `ColorGlyphs = ColorGlyphPolicy.Skip` on the modifier to stop that.

**R6 — Rarity-coloured gradient names**

```csharp
// not compiled
var paints = new InlinePaintProvider();
paints.Entries.Add(PaintSwatch.LinearGradient("rare", 0f,
    new GradientStop(0f, new Color(0.25f, 0.55f, 1f)), new GradientStop(1f, new Color(0.65f, 0.9f, 1f))));
paints.Entries.Add(PaintSwatch.LinearGradient("legendary", 0f,
    new GradientStop(0f, new Color(1f, 0.55f, 0.1f)), new GradientStop(1f, new Color(1f, 0.9f, 0.3f))));

CompositeModifier Look(IPaintProvider p)
{
    var c = new CompositeModifier();
    c.Modifiers.ReplaceAll(new BaseModifier[] { new StrokeModifier { Provider = p }, new FillModifier { Provider = p } });
    return c;
}
text.Styles.Add(Style.Tag(Look(paints), "rare", "#0A1A33,0.06em;rare"));          // stroke ; fill
text.Styles.Add(Style.Tag(Look(paints), "legendary", "#1A0A00,0.06em;legendary"));
text.Text = "Found <legendary>Dragonfang</legendary> and <rare>Frost Rune</rare>";
```

Setup: the swatches must be in a provider that the fill layer uses; the stroke part takes an inline colour. The `;` splits the parameter per child, and child order is layer order (stroke under fill). Result: each name gets its own gradient across the tagged word (`LinearGradient` uses Range mapping). For one sweep across the whole sentence use `Mapping = PaintMapping.Block`. Gotcha: a misspelled swatch name paints opaque white with no error. Rarity gradients on item names are static, so the cost is one extra quad per glyph for the stroke and none for the gradient fill.

**R7 — Gradient across a sentence versus per word**

`<grad=sunset,,,block>` sweeps once across the whole text block; `<grad=sunset,,,range>` (or a swatch with Range mapping) sweeps across the tagged range; `<grad=sunset,,,glyph>` restarts per letter. Slots are paint, softness, dilate, mapping.

**R8 — Radial or angular gradient**

```csharp
// not compiled
var orb = PaintSwatch.LinearGradient("orb", 0f,
    new GradientStop(0f, Color.white), new GradientStop(1f, new Color(1f, 0.4f, 0f)));
orb.paint.projection.kind = PaintProjectionKind.Radial;   // or Angular (conic; spread has no effect)
orb.paint.projection.fit = PaintFit.Contain;              // keeps rings circular on a non-square frame
paints.Entries.Add(orb);
```

Per-tag override: `<grad=orb,,,glyph,radial,contain>`. Result: a ring-shaped fill per letter. Gotcha: no builder exists for radial/angular, so edit the struct.

**R9 — Project-wide named paints (`<fill=gold>`)**

Create the asset (`Create -> LightSide -> UniText -> Paints`), add swatches (colour, gradient or texture with mapping, shape, fit, angle, scale, offset, spread, blend), assign it as `UniTextSettings.Paints` (Project Settings -> LightSide -> UniText), and give every layer `Provider = new GlobalSettingsPaintProvider()` (inspector: Provider -> Global Settings). Then `<fill=gold>` and `<stroke=ink,2px>` resolve through the asset. Gotcha: without a provider on the layer, a swatch name is not looked up (rule 3).

**R10 — Texture fill (marble, foil)**

```csharp
// not compiled
var src = PaintSource.Default; src.kind = PaintSourceKind.Texture; src.texture = marbleTex;
var proj = PaintProjection.Default; proj.fit = PaintFit.Tile; proj.scale = 2f;   // Tile: scale = repeat count
paints.Entries.Add(new PaintSwatch { name = "marble", mapping = PaintMapping.Range,
    paint = new Paint { source = src, projection = proj, blend = LayerBlend.Normal } });
```

Scroll it with `fill.PaintOffset = new Vector2(Mathf.Repeat(t * 0.15f, 1f), 0f)`. Wrap comes from the texture asset. A texture paint costs a separate draw and a mesh rebuild per scroll step; use it for a few titles.

**R11 — Inset / letterpress**

Register `FillModifier` before `InnerShadowModifier` so the inset sits above the fill, e.g. sample markup `<inner-shadow=#000000E0,0.05 -0.07><fill=#EDE6D0>INSET</fill></inner-shadow>` after registering tags `fill` and `inner-shadow`. Default offset is (0, -0.1) em, blur 0.1 em, black. Two atlas taps per fragment, so use on a few elements.

**R12 — Extrude title**

```csharp
var ex = new ExtrudeModifier { Steps = 6, Bevel = false };
text.Styles.Add(Style.Tag(ex, "extrude", "0.08 -0.08,#FFE9A8,#7A3E00"));   // offset "x y" em, near, far
```

Total depth is `offset`; each slice is offset by `offset * t`, colours blend near to far. `Bevel = true` alternates colours and doubles the slices. `FixedPixelSize = true` reads offset/dilate/softness as px. Solid colours only. Keep to a handful of static titles.

**R13 — Hollow text and two stacked strokes**

Hollow: composite stroke + fill with a transparent fill paint, tag default `"#FFFFFF,0.06em;#00000000"`. The fill claims the base quad but paints alpha 0, leaving only the rim. Two strokes: composite of two `StrokeModifier` and a fill, default `"#101010,0.40;#FFD447,0.22;#E8407A"` (outer dark, inner gold, pink face). Two instances are required because nested same-modifier tags do not stack. Stay within the 0.5 em reach cap (outer width 0.40 em outside is already near it).

**R14 — Effects on emoji and inline sprites**

```csharp
text.Styles.Add(Style.Tag(new StrokeModifier { ColorGlyphs = ColorGlyphPolicy.Apply }, "stroke", "#000000,0.06em"));
```

Set the policy on the modifier, not per tag. The stroke then follows the emoji silhouette (alpha at 50 %). Shadow and glow already apply to emoji. `FillModifier` with `Apply` repaints the silhouette flat. Result with `Skip` (the Stroke default): emoji keep their picture with no outline.

**R15 — Grey-out a locked item / sepia flashback**

```csharp
text.Styles.Add(Style.Tag(new FilterModifier { Filter = new GrayscaleFilter() }, "locked"));   // register LAST
// <locked>Iron Sword</locked>   <locked=0.5>half</locked>   (strength 0..1)
```

A filter recolours everything **below it in Styles** (face, stroke, shadow, glow, emoji, textures). Put it at the end of the list.

**R16 — Additive glow**

```csharp
text.Styles.Add(Style.Tag(new GlowModifier { Blend = LayerBlend.Additive }, "hot", "#FF6A00,0.2em"));
```

Set the blend on the modifier and expose it as its own tag. A non-Normal blend splits the draw at that layer.

**R17 — Animate an effect at runtime**

```csharp
var glow = text.GetModifier<GlowModifier>();              // the component's own copy
glow.Radius = UnitValue.Em(0.15f + 0.25f * pulse);        // state-tracked: mesh-only rebuild
text.MarkModifierDirty(composite, UniTextDirty.Mesh);     // only for a glow nested in a composite, as the sample does
```

Each change rebuilds that text's mesh. Fine for one or two texts; for many, use a shader-time effect.

**R18 — Ship the effect vocabulary once**

Create a `StylePreset` (`Create -> LightSide -> UniText -> Style Preset`), add the styles of R2-R16 (tags `stroke`, `shadow`, `glow`, `rare`, `locked`, ...), and assign it in Project Settings -> LightSide -> UniText -> Global Style Preset. Every component applies it while Use Global Style Preset is on, on its own copy. Editing the asset updates all components live.

**R19 — Line above the text with its own outline**

`<u=#FFD23F,wavy,2px,,,,true>` draws a wavy gold line above the glyphs. With `overlay=false` each layer of the line stacks at its own Styles position, so the line's stroke can sit under glyph faces. For a fixed look use a default parameter: `Style.Tag(new UnderlineModifier(), "u", ",,,,,,true")`.

**R20 — Glyph-major order for tight tracking**

```csharp
text.Styles.Add(Style.WholeText(new PaintOrderModifier()));                           // glyph-major, whole text
text.Styles.Add(Style.Tag(new PaintOrderModifier { Reverse = true }, "glyphs-rev"));  // first glyph on top
```

Use only where neighbouring glyphs' layers must interleave; costs a per-glyph sort and is excluded from `UnionModifier` shapes.

**R21 — Keep bulk text cheap**

Put decorated headings, numbers and names into their own `UniText` components and leave body text effect-free. A paragraph with a single outlined word draws entirely on `StyledText`.

**R22 — Script fonts and crisp headings: `UnionModifier`, `GlyphResolutionModifier`**

```csharp
text.SetWholeText<UnionModifier>();                                          // Arabic/cursive: strokes no longer cross joins
text.Styles.Add(Style.Tag(new GlyphResolutionModifier(), "hd", "1"));        // <hd>TITLE</hd>: one size class sharper
```

`UnionModifier` takes no parameter and moves the text to the `UnitedText` tier, so apply it only to components that show joins. `GlyphResolutionModifier` takes an int 0-2 and costs about 4x atlas tile memory per class; use it for a few large headings, never paragraphs.

## 14. Pitfalls

Silent failures

1. **Null provider**: `<fill=gold>` on a fresh layer is a named colour (flat gold), and a custom name paints opaque white. Set `Provider`.
2. **Unitless = em**: `<stroke=2>` is 2 em and clips against the reach cap. Write `px` or `em`.
3. **`FillModifier` overwrites `<color>`** and the component RGB (Default paint = white).
4. **Order matters once any fill exists**: a shadow or stroke registered after the fill draws over the text.
5. **Nested same-tag ranges do not stack**; 255 ranges per layer instance.
6. **Reach cap 0.5 em**: wide strokes, large glow radii and big blur + spread clip at the quad edge; the default glow radius is already at the cap.
7. `Corners = sharp` draws as round in single-channel SDF mode.
8. **Emoji/sprites are skipped** by stroke, inner shadow, extrude and fill unless `ColorGlyphs = Apply`; shadow and glow apply by default.
9. `Shadow.spread` (outward growth, em) is a different thing from the shared `paintSpread` slot. Avoid positional tags beyond the first three or four slots.
10. `paint` has no descriptor: rules and drivers cannot animate the paint itself; animate `Tint`, geometry slots, or swap swatches.
11. A texture swatch with a null texture renders magenta; an empty gradient falls back to a solid.
12. Default mapping is **Block** (one sweep across the whole text), while `LinearGradient(...)` uses **Range**. "Gradient restarts per tag" versus "gradient across the sentence" is a mapping setting.
13. `Style.Range(start, end)` uses codepoint indices of the **rendered** text (markup stripped).
14. `ExtrudeModifier` takes colours only; `Steps`, `Bevel`, `FixedPixelSize` are not tag slots.
15. `UnionModifier` is opt-in: without it, Arabic/cursive strokes cross joins and translucent layers double up.
16. `PaintMapping` and the highlight's `RangePaintMapping` are different enums; do not mix them.
17. `GetModifier<T>()` returns the **component's own copy** of a style (preset styles are copied per component). Write to it to change one component; edit the `StylePreset` asset to change them all.

Performance and mobile

18. Any stroke/shadow/glow/inner shadow/softened fill/gradient/decoration moves the **whole component** to `StyledText`; union to `UnitedText`; deformation to `Full`. Tiers do not batch together.
19. Each outward layer is a full extra quad per glyph with a growth margin (overdraw). Extrude is `Steps` quads per glyph (20 with bevel).
20. Draw splitters: texture fills, `MaterialModifier`, non-Normal blends, mixed tiers, `UniTextWorld.Standalone`, Canvas masks. Plain-blend layers of one text stay one draw.
21. Runtime parameter writes rebuild the text mesh; avoid per-frame writes on many texts.
22. `GlyphResolutionModifier` and large effects grow atlas tiles (x4 memory per class; a larger rim tier re-rasterizes). Headings only.
23. First draw of each tier compiles a shader program (a hitch on low-end phones). Warm up behind a loading screen: `LightSideMaterials.WarmUpUi(LightSideSurfaceTier.Text, LightSideSurfaceTier.StyledText)` (add `UnitedText` if unions are used). Details in [unitext-materials-shaders.md](unitext-materials-shaders.md).
24. Prefer SDF to MSDF (four times the page bytes); keep 8-bit atlas precision only if banding in wide effects is acceptable.
25. UniText 3D does not draw 2D strokes, shadows or glows; use its own layer modifier ([unitext-3d-text.md](unitext-3d-text.md)).

## Unverified

- Exact draw-call and overdraw numbers for a given stack; nothing was profiled (use the Frame Debugger).
- Whether `%` and `delta` units are honoured by effect geometry (inspectors offer only `px` and `em`).
- Whether a modifier nested inside a `CompositeModifier` needs `MarkModifierDirty` after property writes (the sample calls it; plain writes on a top-level modifier need nothing).
- Screen direction of `angle = 90` (the frame math is `u = dx*cos + dy*sin`, so with a Y-up layout it should run bottom to top).
- Whether the component `color` RGB multiplies a solid `FillModifier` paint (source: the solid fill overwrites the base quad's colour; component alpha always applies).
- Radial/angular swatch recipe (R8) assigns struct fields after `LinearGradient(...)`; the field names follow the source but the snippet was not compiled.
- Visual result of effects that exceed the 0.5 em cap (reach formulas come from source; the on-screen clipping was not observed).
