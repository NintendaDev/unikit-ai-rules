---
version: 1.0.0
---

# UniText (LightSide)

> **Scope**: LightSide UniText v3.30.0 (namespace `LightSide`, packages `media.lightside.unitext` + `media.lightside.core`) — a Unicode text and document engine for Unity UI, world space and extruded 3D: choosing the component, installing fonts and font families, writing formatted text (bold, italic, strikethrough, underline, color, size, Markdown, links, spoilers), building the tag vocabulary a project needs, applying effects (stroke, shadow, glow, gradients), animating text (wave, shake, typewriter reveal, sequencer, hover rules), emoji and inline sprites, selection and input fields, the runtime C# API, layout and large documents, and what is affordable on a phone.
> **Load when**: putting text on screen with UniText or replacing TextMesh Pro, wiring or debugging rich-text tags that print literally, choosing or installing fonts and font families, making text bold/italic/struck/underlined/colored or applying outlines, shadows, glows and gradients, animating text or building a typewriter or damage-number effect, using emoji or inline icons in strings, making keywords or links tappable, building input fields, scripting UniText from C# (SetText, styles, ranges, parameters), diagnosing text that is missing glyphs, stale-sized, slow or failing in a build, deciding whether a text feature is affordable on mobile.
> **References**: `.unikit/memory/code/stack/references/unitext-components-setup.md` (components, settings, first text, editor-vs-build), `.unikit/memory/code/stack/references/unitext-runtime-api.md` (SetText, measuring, invalidation, ranges, parameter ownership), `.unikit/memory/code/stack/references/unitext-markup-system.md` (styles, parse rules, vocabulary bootstrap, custom tags and modifiers), `.unikit/memory/code/stack/references/unitext-formatting-tags-quickref.md` (cheat sheet and one line per modifier), `.unikit/memory/code/stack/references/unitext-formatting-tags-full.md` (per-modifier detail), `.unikit/memory/code/stack/references/unitext-fonts.md` (font assets, stacks, families, languages), `.unikit/memory/code/stack/references/unitext-effects-paint.md` (stroke, shadow, glow, fills, gradients), `.unikit/memory/code/stack/references/unitext-materials-shaders.md` (materials, custom shaders), `.unikit/memory/code/stack/references/unitext-animation-phase.md` (wave, shake, pulse ..., clock, Animator, marquee), `.unikit/memory/code/stack/references/unitext-animation-reveal-sequencer.md` (typewriter reveal, sequencer, hide and fade), `.unikit/memory/code/stack/references/unitext-range-state-rules.md` (signal-driven range rules), `.unikit/memory/code/stack/references/unitext-emoji.md` (emoji), `.unikit/memory/code/stack/references/unitext-inline-media.md` (inline sprites and objects), `.unikit/memory/code/stack/references/unitext-interaction-links.md` (links, spoilers, tappable ranges), `.unikit/memory/code/stack/references/unitext-selection-context-menu.md` (selection, context menu), `.unikit/memory/code/stack/references/unitext-input-fields.md` (editable text, behaviors, mobile keyboard), `.unikit/memory/code/stack/references/unitext-clipboard-rtl-ime.md` (clipboard, RTL, IME, accessibility), `.unikit/memory/code/stack/references/unitext-layout-documents.md` (alignment, wrap, AutoSize, large documents), `.unikit/memory/code/stack/references/unitext-3d-text.md` (extruded text), `.unikit/memory/code/stack/references/unitext-performance-mobile.md` (full mobile chapter), `.unikit/memory/code/stack/references/unitext-version-traps.md` (removed and renamed features), `.unikit/memory/code/stack/references/unitext-tmp-migration.md` (TextMesh Pro mapping), `.unikit/memory/code/stack/references/unitext-cases-vendor-samples.md` (case library from the packaged samples: formatting, fonts, emoji, layout, editing, media, 3D), `.unikit/memory/code/stack/references/unitext-cases-vendor-samples-effects-animation.md` (sample cases for animation, reveal, effects and links, plus the tag-name census, vendor API usage and sample quirks)

---

## Core Concepts

- **One text model, three renderers.** `UniText` (Canvas, a `MaskableGraphic`), `UniTextWorld` (scene mesh, no Canvas) and `UniText3D` (extruded solids, opt-in module) all derive from `UniTextBase`. Markup, fonts, paints, animation, selection and editing work the same on all of them; selection and editing exist only on `UniText` and `UniTextWorld`.
- **UniText does not use Unity font assets or TextMesh Pro.** It reads OpenType files itself (`UniTextFont` wraps one font file; `UniTextFontStack` lists `FontFamily` entries plus fallback stacks). Rendering is SDF (rounded effect corners) or MSDF (sharp corners, more atlas memory) from a shared dynamic atlas, with HarfBuzz shaping and Unicode bidi.
- **Markup = Style = source + modifier, and nothing couples a tag name to an effect.** A `Style` pairs a `RangeSource` (a `TagRule("b")`, a Markdown rule, a fixed range, whole text) with a `BaseModifier` (`BoldModifier`, `ColorModifier`, `WaveModifier`, `StrokeModifier` ...). A component's vocabulary is its local `Styles`, then its `StylePresets`, then the project-wide `UniTextSettings.GlobalStylePreset`. Tag spellings such as `<b>` or `<wave>` are conventions you register, not built-ins.
- **Modifier parameters resolve through a cascade**: inspector field → rule default (`TagRule.DefaultParameter`) → markup token → owned value (driver clip, state rule, `Own` handle). Tag slots are positional, separated by `,`; children of a `CompositeModifier` are separated by `;`; vectors use a space (`0 8`).
- **Effects are paint layers** (fill, stroke, shadow, glow, inner shadow, extrude, filter): ordinary modifiers over one paint system, each costing about one extra quad per glyph through the same material. **Animation** is phase-driven modifiers (wave, shake, spin, pulse, wobble, bounce, float, pendulum, glitch, rolling, scramble, marquee), the `RevealModifier` typewriter, the `UniTextDriver` sequencer and range state rules.
- **Emoji are literal characters** rendered from the platform's color emoji font (or your own `UniTextColorFont`); there are no shortcodes. Inline icons are `<sprite=name/>` / `<obj=name/>`.
- **Processing is batched once per frame** for all dirty components, in the canvas pre-render/will-render hooks; results (`ResultSize`, `PreferredHeight`, ranges) are stale until then.
- **Docs and installed code can disagree** (the docs claim shipped prefabs wire the common tags; they do not). When they differ, trust the installed package source and the rules below.

## Locating the package and referencing it

The package folder (`<UniTextRoot>` in every reference) can sit under `Packages/` (embedded) or `Library/PackageCache/`. **Never hard-code its location**: find it with `Glob **/media.lightside.unitext/package.json` (the package name is `media.lightside.unitext`; the shared infrastructure package is `media.lightside.core`, `<LightSideCoreRoot>`). Read exact tag names, parameter orders and defaults from the modifier source (`[Parameter]` declaration order) before relying on a remembered spelling.

- All types live in namespace `LightSide`. A game assembly that uses UniText references `LightSide.UniText` and `LightSide.Core`; custom modifiers and rules also need the Roslyn analyzers shipped in the packages' `Analyzers` folders (whether they apply to a user-owned asmdef is unconfirmed — compile once to check).
- Samples are imported from Package Manager → UniText → Samples (BasicUsage, Emoji, Layout, Font Examples, plus Text3D with the 3D module). They live in `Samples~` until imported.
- Project-wide settings are two assets loaded from `Resources`: `UniTextSettings` (global style preset, paints, default prefabs, line-height defaults, fonts, dictionaries) and the LightSide settings asset (module toggles, world-shader inclusion). Edit them in Project Settings → LightSide → UniText.
- Menu: `GameObject → LightSide → UniText → UniText / UniTextWorld / Button / Selectable Text / Editable Text / Input Field`. TextMesh Pro migration: `Tools → LightSide → UniText → Migration`.

## Critical rules (read before writing any UniText code or markup)

1. **A fresh component understands no tags.** Every shipped prefab has empty `styles`, and `UniTextSettings` ships with no global style preset, so `<b>x</b>` prints literally. Create one `StylePreset` and assign it as the global preset (see "Tag vocabulary bootstrap"), or add styles per component.
2. **Tag names are yours.** Bold, italic, underline, strikethrough, color, size and a few others can be added from the editor's Styles picker; stroke, shadow, glow, fill, every animation, reveal, highlight, ruby, indent, align, arc, `<interactive>`, `<sprite>` and `<obj>` have no default tag — register the name you want with `Style.Tag(...)` (inline media needs `InlineTagRule`, see `unitext-inline-media.md`). A tag is registered correctly when a preset, the picker, the TMP-migration vocabulary or your code defined it; a sample's tag name proves nothing.
3. **Text built in code does not need tags.** `text.SetWholeText<BoldModifier>()`, `Style.WholeText(...)` and `Style.Range(...)` work with no vocabulary; use them for dynamic strings instead of concatenating markup (and never put untrusted strings through a markup-enabled component without escaping).
4. **Write units.** A suffix-less number takes the modifier field's own unit (em for spacing, indent and effect geometry, px for others), so `<stroke=2>` is a 2 em stroke. Always write `px`, `em` or `%`; `<size>` accepts `24`, `150%`, `+10`, `-5` but reads `1.5em` as 1.5 px, and the underline/strikethrough offset slot is plain em (a `px` suffix is ignored).
5. **Unknown, malformed or disabled tags render as literal text with no warning.** `<b >` and `<color =red>` do not match; tag names are ASCII case-insensitive; there are no aliases (`b` and `strong` need two rules); an unclosed tag runs to the end of the text.
6. **`AddComponent<UniText>()` in a player build gets raw defaults** (36 pt, Start/Top, no font stack, no styles), because the editor-only `Reset()` is what copies the template prefab. Instantiate a prefab, or set font, size and styles in code. A text with no font assigned renders with the OS font on device and fails on WebGL.
7. **Fonts**: `<font=name>` matches only `FontFamily.name` inside the component's own font stack. Resolution is requested family → fallback chain → OS font; a symbol missing from your fonts silently comes from the device font (looks different per device). The shipped Noto Sans covers Latin and Cyrillic but not arrows (`↑↓←→`), check marks, stars, card suits or `≈ ≤ ≥ ∞` — verify symbols on a device or ship a font that has them.
8. **Emoji**: use literal characters (`"\U0001F600"`, `"❤️"`); no `:shortcode:` syntax exists. Some plain symbols (♥ ❤ ✔ ™ ☎ ⚙ …) turn into color emoji; ★ ☆ ✓ → • ● do not; append `U+FE0E` to force the text form.
9. **Animation costs a full re-mesh of that text every frame** while it runs. The default clock is `Scaled` (freezes at `timeScale = 0`; use `Unscaled` for pause menus); writing `Phase` from code needs `Clock = Manual` or values add up; Glitch and Deform are the heaviest.
10. **Reveal never advances itself.** `RevealModifier.Front` defaults to 100% and something must move it; there is no completion event and no pause tag — drive `Front` from your own tween and detect the end yourself. `Collapse = true` re-wraps the text on every step.
11. **Results are stale until the end of the frame's canvas pass.** Read sizes in the same frame with `MeasureText` / `GetHeightForWidth`, or subscribe to `LayoutCommitted`; do not read `ResultSize` right after setting text.
12. **`SetText(string|span|StringBuilder)` skips unchanged text; `char[]` / `ReadOnlyMemory` overloads always rebuild.** An alpha-only change of `color` is free (no rebuild); an RGB change rebuilds the mesh. `Hide()` / `Show()` is the pooling path; alpha 0 still draws and still receives pointer events.
13. **Links**: `LinkModifier.AutoOpenUrl` is on by default (including the shipped link preset) and sends any link id to `Application.OpenURL`; turn it off for in-app command links. Canvas text needs an EventSystem, GraphicRaycaster and Raycast Target; world text needs `WorldPointerRaycaster` on the rendering camera. Touch has no hover.
14. **Input fields**: the policy lives in `InputBehavior` objects; the default field is multi-line and nothing submits until you add `SingleLineBehavior` / `SubmitKeyBehavior`; programmatic writes (`Text =`, `SetText`) bypass filters, length limit and masks (`SetText("")` then `InsertText(...)` goes through them); `Text` carries markup source, `VisibleText` the plain value; any other control steals focus and drops the soft keyboard unless it sits under a `FocusGuard`.
15. **Style, rule and modifier instances cannot be shared** between components, twice in one list, or inside two parents; share through a `StylePreset` (each component gets its own copy). Modifier callbacks run on worker threads: no Unity API inside `OnApply` / `TryMatch`.
16. **World text in a player build** needs the "Include World Shaders" option enabled in the LightSide settings; otherwise a build containing `UniTextWorld` fails.
17. **Layout traps**: a bare `<line-height=150%>` flips that range to Content mode where a bare number means pixels (write `<line-height=,scaled,1.2>` to keep the project's Scaled ×1.4 mode); `<ellipsis>` draws three ASCII dots and truncates only in a bounded rect, `<truncate>` cuts without dots; any `Text` over 16,384 UTF-16 characters silently becomes a windowed document clipped to its rect.
18. **UniText replaces TextMesh Pro rather than extending it** (one text component per GameObject), and TMP tags do not carry over blindly: some have no UniText equivalent (`<voffset>`, `<rotate>`, `<pos>`, `<space>`, `<width>`); see `unitext-tmp-migration.md`.

## Choosing the component

| Need | Use | Notes |
|------|-----|-------|
| HUD, menus, anything in a Canvas | `UniText` | masks, `RectMask2D`, scroll views, layout groups and `ContentSizeFitter` work (only `UniText` implements `ILayoutElement`); unlit |
| Damage numbers, labels over enemies, signage | `UniTextWorld` | any Transform parent, sorting layer/order, optional lit/shadows, `Standalone` = own draw call; needs world shaders in builds |
| Extruded bevelled letters | `UniText3D` | module `UNITEXT_3D`, CPU-built solids, not for HUD text |
| Tappable or selectable text | `UniText` + `UniTextSelectable` / `UniTextEditable` | capability components on the same object |
| Very long text | `UniTextDocumentView` + `UniTextDocumentLoader` | any `Text` over 16,384 UTF-16 chars silently becomes a windowed document |

## First working text

1. Package installed, a `Canvas` and EventSystem in the scene (the Create menu adds them when missing).
2. `GameObject → LightSide → UniText → UniText` (or instantiate your own prefab with fonts and styles pre-filled).
3. Assign a font or font stack if you need more than the OS default; check Cyrillic and symbol coverage (`unitext-fonts.md`).
4. Create the project vocabulary once (below); every component with *Use Global Style Preset* on picks it up.
5. Set text from code with `text.SetText("...")`; configure size/alignment through properties (`FontSize`, `WordWrap`, `AutoSize`, `HorizontalAlignment`, `Padding`).
6. Turn off Raycast Target on labels that need no input.

## Tag vocabulary bootstrap

Inspector route: `Assets → Create → LightSide → UniText → Style Preset`; in it use **+ → Tags** to add Bold, Italic, Size, Color, Underline, Strikethrough, Line Height, add the standalone *Line Break* (`<br>`) and the protection *Noparse Tag*; then Project Settings → LightSide → UniText → Styling → **Global Style Preset** = that asset. The global preset also feeds buttons, dropdowns and input-field text, and every user-visible string — keep it lean.

Editor-script route (not compiled; place in an Editor-only asmdef referencing `LightSide.UniText` and `LightSide.Core`):

```csharp
#if UNITY_EDITOR
using LightSide;
using UnityEditor;
using UnityEngine;

public static class GameTextVocabulary
{
    [MenuItem("Tools/Game/Build UniText Vocabulary")]
    public static void Build()
    {
        var preset = ScriptableObject.CreateInstance<StylePreset>();
        AssetDatabase.CreateAsset(preset, "Assets/<YourFolder>/GameTextStyles.asset"); // create first, then fill

        preset.Styles.Add(new Style { Source = new NoparseTagRule() });        // protection first
        preset.Styles.Add(new Style { Source = new LineBreakParseRule() });    // <br>
        preset.Styles.Add(Style.Tag(new BoldModifier(), "b"));
        preset.Styles.Add(Style.Tag(new ItalicModifier(), "i"));
        preset.Styles.Add(Style.Tag(new UnderlineModifier(), "u"));
        preset.Styles.Add(Style.Tag(new StrikethroughModifier(), "s"));
        preset.Styles.Add(Style.Tag(new ColorModifier(), "color"));
        preset.Styles.Add(Style.Tag(new SizeModifier(), "size"));
        // semantic tags with a default parameter: <rare>Frost Blade</rare>, override with <rare=#FFFFFF>
        preset.Styles.Add(Style.Tag(new ColorModifier(), "rare", "#4D8BFF"));

        EditorUtility.SetDirty(preset);
        UniTextSettings.GlobalStylePreset = preset;               // static setter, needs the settings asset
        EditorUtility.SetDirty(UniTextSettings.Instance);
        AssetDatabase.SaveAssets();
    }
}
#endif
```

`UniTextSettings.GlobalStylePreset` is stored in the `Resources/UniTextSettings.asset`; if that asset is missing, `UniTextSettings.Instance` logs an error and the assignment is silently ignored (create it from Project Settings → LightSide → UniText).

Per component, in code: `text.Styles.Add(Style.Tag(new BoldModifier(), "b"));` (bulk: `Styles.ReplaceAll(...)` for one re-parse). Each `Style` needs its own rule and modifier instances. Details, Markdown rules, composite tags, custom rules: `unitext-markup-system.md`.

## Formatting quick reference

Tag/Markdown columns need the matching style registered; the whole-text and code forms need nothing.

| Effect | Tag | Markdown | Without a vocabulary (whole text / range) |
|--------|-----|----------|--------------------------------------------|
| Bold | `<b>x</b>`, `<b=700>`, `<b=700,r>` real face only, `<b=700,f>` synthetic | `**x**` | `text.SetWholeText<BoldModifier>()`, `Style.Range(new BoldModifier(), s, e)` |
| Italic | `<i>`, `<i=20>` shear %, `<i=r>` real face only | `*x*` | `SetWholeText<ItalicModifier>()` |
| Underline | `<u>`, `<u=#FF0000,wavy,2px>` | `++x++` | `SetWholeText<UnderlineModifier>()` |
| Strikethrough | `<s>`, `<s=#FF0000,solid,2px>` | `~~x~~` | `SetWholeText<StrikethroughModifier>()` |
| Highlight | no default tag — pick one (`<mark>`) | none | `Style.WholeText(new HighlightModifier{...}, null)` |
| Color | `<color=#FF8800>`, `<color=red>`, `#RGB`, `#RRGGBBAA` | – | component `color`, or `Style.WholeText(new ColorModifier(), "#FF0000")` |
| Size | `<size=24>`, `<size=150%>`, `<size=+10>` | – | component `FontSize` (+ `AutoSize`) |
| Opacity | `<alpha=0.5>`, `<alpha=50%>`, `<alpha=#80>` | – | component `color` alpha (fades everything, no rebuild) |
| Case / small caps | `<upper>`, `<lower>`, `<smallcaps>` | – | `SetWholeText<UppercaseModifier>()` |
| Sub/superscript | `<sup>`, `<sub>` (two rules into one modifier) | – | `SetWholeText<ScriptPositionModifier>("sub")` |
| Letter spacing | `<cspace=8>`, `<cspace=0.25em>`; fixed cell `<cwidth=auto>` | – | `SetWholeText<LetterSpacingModifier>("0.05em")` |
| Line height, paragraph gap | `<line-height=160%>`, `<pspace=18>` | – | `Style.WholeText(new LineHeightModifier{...}, null)` |
| Link, list, ruby | `<link=url>`, `<li>`, `<ruby=かんじ>` | `[t](url)`, `- x` | picker presets / own rules |
| Line break | `<br>` (standalone rule) | – | `\n` in the string always works |

All 21 named colors, every slot order, the real-vs-synthetic bold rules and per-modifier traps: `unitext-formatting-tags-quickref.md`, then `unitext-formatting-tags-full.md` (grep `^### <ID>`).

## Fonts in one screen

- Create a font asset from a `.ttf` / `.otf` with the Tools window (Create Font Asset); group regular/bold/italic faces in a `FontFamily`; list families and fallbacks in a `UniTextFontStack`; assign `Font` or `FontStack` on the component. Name families only when markup selects them (`<font=header>`).
- `<b>` / `<i>` prefer real faces (static cut, variable `wght` / `ital` / `slnt` axis, OS cut) and synthesize only as a fallback; emoji are never emboldened or slanted.
- Variable fonts (`<var=...>`), color fonts, pixel-art fonts (pixel grid, nearest sampling), per-language fonts (`<lang=...>`), the Font Subsetter and Dictionary Builder (Thai, Lao, Khmer, Myanmar, CJK word breaking) — see `unitext-fonts.md`.
- Mobile cost: one 2048 atlas page is 8 MiB (SDF) or 32 MiB (MSDF); fonts ship compressed; the first appearance of a glyph costs rasterization.

## Effects in one screen

- Fill, Stroke, Shadow, Glow, Inner Shadow and Extrude are whole-text picker entries; per-range use needs your own tag (`Style.Tag(new StrokeModifier(), "stroke")`). Layer geometry defaults to **em**; the paint slot comes first and can be omitted (`<stroke=2px>` is a width).
- Gradients and texture fills are paint sources (`Paint` with `PaintMapping`, fit, projection); named swatches need a paint provider (otherwise the name silently reads as a color literal or opaque white).
- With no explicit fill, outward layers sit behind the text automatically; once any fill exists, Styles list order is z-order; a solid fill overwrites `<color>`.
- Cost: each layer ≈ +1 quad per glyph (extrude 10, 20 with bevel); layers merge into one draw unless a texture paint, `MaterialModifier` or a non-Normal blend splits it; one outlined word moves the whole component to a heavier shader tier. Details and recipes: `unitext-effects-paint.md`; custom shaders: `unitext-materials-shaders.md`.

## Animation and reveal in one screen

- No animation tag is wired by default: register one (`Style.Tag(new WaveModifier(), "wave")`). `<wave=0 8,2,0.25>` = vertical wave, 2 rad/s, spread 0.25 — a single number sets only the X amplitude; frequencies are radians per second, not hertz. Catalog, slots, cost: `unitext-animation-phase.md`.
- Typewriter: add `RevealModifier` (whole text or tag), animate `Front` from 0 to 100% yourself; looks come from named `RevealHandlerEntry` items (Fade, Slide, Scale, Pop, Drop, Rain, Burst ...). Sequencer (`UniTextDriver`) clips ramp parameters over matched ranges (members are ranges, not letters). Hover/press effects without code use range state rules on interactive modifiers. See `unitext-animation-reveal-sequencer.md` and `unitext-range-state-rules.md`.
- The Animator route (`UniTextAnimationBridge`) only covers the component's own styles.

## Emoji, inline icons, interaction, input

- Emoji coverage = the platform color emoji font (Windows Segoe UI Emoji, macOS/iOS Apple Color Emoji, Android system matcher, Linux Noto Color Emoji, WebGL browser canvas); add a `UniTextColorFont` as the first font of a family for one look everywhere. Color/bold/italic/font tags do not change emoji; alpha and filters do. → `unitext-emoji.md`.
- Inline icons: `<sprite=name/>` from a `UniTextSprites` asset and `<obj=name/>` for prefabs; positional slots, wrong names fail silently. → `unitext-inline-media.md`.
- Tappable ranges: register `LinkModifier` / `InteractiveModifier` styles, subscribe to the modifier's `Events.Activated` (or `LinkClicked`), read `Range.PrimaryValue`. → `unitext-interaction-links.md`. Selection and context menu → `unitext-selection-context-menu.md`.
- Input fields: menu `Input Field`; `UniText`, `UniTextSelectable` and `UniTextEditable` sit on the child text object; add `SingleLineBehavior` / `SubmitKeyBehavior` / `LengthLimitBehavior` / `InputMaskBehavior` / `KeyboardAvoidanceBehavior`; on mobile put buttons under a `FocusGuard`. → `unitext-input-fields.md`, `unitext-clipboard-rtl-ime.md`.

## Runtime API essentials

```csharp
using LightSide;

var label = GetComponent<UniText>();
label.SetText($"Damage {value}");           // skips if unchanged; no scene dirtying
label.FontSize = 36f;                         // equality-gated: assigning the same value is free
label.color = new Color(1f, 1f, 1f, alpha);   // alpha only: no rebuild
label.Hide();                                 // pool-friendly; alpha 0 alone still draws and takes input
Vector2 size = label.MeasureText(new TextMeasureOptions { /* maxWidth, maxHeight ... */ }); // same-frame, main thread, never per frame
```

- Public properties such as `FontSize`, `WordWrap`, `AutoSize`, `Padding`, `Font`, `FontStack`, `HorizontalAlignment`, `Styles` are generated from `[StateProperty]` fields and do not appear on the API page of `UniTextBase`; they are real and equality-gated.
- `GetModifier<T>()` returns the component's own live copy of a style's modifier (null until the style exists and a parse ran); tune it at runtime instead of mutating preset assets.
- Pooled spans (`CleanText`, `RenderedCodepoints`, `ResultGlyphs`) are valid only until the next rebuild — copy what must outlive it. Range and parameter ownership, `using var` release semantics: `unitext-runtime-api.md`.

## Mobile chapter — what works on phones and what does not

Verdicts come from reading the package source and vendor docs; **nothing here was profiled on a device**. Treat them as guidelines and measure before shipping a heavy screen. Full cost model, atlas arithmetic and the gate procedure: `unitext-performance-mobile.md`.

| Verdict | Items |
|---------|-------|
| **OK** | plain labels with no styles (no markup parser is even created); `SetText` with unchanged text; alpha-only color changes; `Hide()`/`Show()` pooling; bold/italic/color/size tags; one stroke or shadow; SDF mode; Marquee (does not re-mesh) |
| **LIMIT** | a large global preset (every rule is walked at each trigger character in every component that reads it); several paint layers on long text; per-frame text changes that introduce new glyphs (atlas rasterization); color-emoji heavy screens (RGBA atlas, about 16 MB per 2048² page); animations on many labels at once (each running text re-meshes every frame); `RevealModifier` with `Collapse = true`; `UniTextWorld.Standalone`; MSDF; many `<obj>` clones (each is a GameObject) |
| **AVOID** | Glitch / Deform animations on long or many texts; texture paints, `MaterialModifier` or non-Normal blends on lists of labels (they split draw calls); Extrude on many labels; `UniText3D` for HUD text; adding styles per frame; `RawUrlParseRule` / Markdown list rules on numeric HUD or damage text; shipping a full emoji font unsubsetted; very long text without a document view |

Gate for any new text feature on a gameplay screen: (1) can it be a plain label with `SetText`? (2) if it needs markup, is the vocabulary lean and are heavy graphs on those components only? (3) does it animate — how many texts run at once? (4) check atlas growth (new glyphs, emoji) and build size (fonts, dictionaries), then (5) test on a low-end device before approving.

## Task router

| Task | Open |
|------|------|
| Add text to a screen, create from code, settings, editor-vs-build | `unitext-components-setup.md` |
| Set/measure/read text, hide, ranges, parameters from C# | `unitext-runtime-api.md` |
| Tags print literally; build or extend the vocabulary; custom tag/modifier/rule | `unitext-markup-system.md` |
| Bold, italic, strikethrough, underline, color, size, spacing, lists, alignment tags | `unitext-formatting-tags-quickref.md` → `unitext-formatting-tags-full.md` |
| Install fonts, families, fallbacks, Cyrillic, variable/pixel/color fonts | `unitext-fonts.md` |
| Outline, shadow, glow, gradient, texture fill | `unitext-effects-paint.md` |
| Custom material or shader, `<mat>` | `unitext-materials-shaders.md` |
| Wave, shake, pulse, glitch, rolling counter, ticker | `unitext-animation-phase.md` |
| Typewriter, staggered entrance, fade in/out, sequencer | `unitext-animation-reveal-sequencer.md` |
| Hover/press effects on parts of a text without code | `unitext-range-state-rules.md` |
| Emoji in strings, consistent emoji look, missing emoji | `unitext-emoji.md` |
| Icons or widgets inside text | `unitext-inline-media.md` |
| Tappable keywords, links, spoilers, world-space clicks | `unitext-interaction-links.md` |
| Selectable/copyable text, context menu | `unitext-selection-context-menu.md` |
| Input field, mask, password, chat, keyboard behavior | `unitext-input-fields.md` |
| Clipboard formats, Arabic/Hebrew, IME, accessibility | `unitext-clipboard-rtl-ime.md` |
| Alignment, wrap, AutoSize, ellipsis, long documents | `unitext-layout-documents.md` |
| Extruded 3D text | `unitext-3d-text.md` |
| Frame cost, memory, build size, WebGL | `unitext-performance-mobile.md` |
| Something stopped working after an upgrade; removed tags/types | `unitext-version-traps.md` |
| Moving from TextMesh Pro | `unitext-tmp-migration.md` |
| Want a worked example of a feature; which tag names are only sample conventions | `unitext-cases-vendor-samples.md` (formatting, fonts, emoji, layout, editing, media, 3D); `unitext-cases-vendor-samples-effects-animation.md` (animation, reveal, effects, links, tag census, sample quirks) |

## Reference Lookup Workflow

1. Read this file first; the Critical rules cover the failures that account for most wasted time.
2. Pick the row of the Task router that matches the task and open only that reference; open a second one only when the task crosses areas (for example a damage number needs `unitext-animation-phase.md` plus `unitext-effects-paint.md`).
3. For tags, scan `unitext-formatting-tags-quickref.md` for candidates, then `Grep "^### <ID>" -A 25` the full file for the chosen ones — do not read it whole.
4. Before relying on a slot order, unit or default, confirm it against the modifier's source in `<UniTextRoot>` (`[Parameter]` declaration order; a subclass's own parameters come before inherited ones).
5. Do not guess: when a reference marks something as unverified, compile or test it in the editor before building on it.

## Anti-patterns

- Expecting `<b>`, `<wave>`, `<link>` or `<sprite>` to work in a new project without registering them.
- Building strings with markup for dynamic data when `SetWholeText<T>()` / `Style.Range` express the same thing safely; putting player-supplied text through a markup-enabled component.
- A big global preset with Markdown and auto-link rules attached to every pooled HUD label.
- Reading `ResultSize` or `PreferredHeight` immediately after setting text; calling `Text =` every frame with changing content; adding or removing styles per frame.
- Using `Hide()`-less alpha fades for text that stays in the scene (it still draws and receives pointer events).
- Writing `Phase` or `Front` from code while a driver clip, rule or `Own` handle holds the parameter, or while the clock is not `Manual`.
- Using `AddComponent<UniText>()` in builds and expecting the editor defaults; forgetting Include World Shaders for `UniTextWorld`.
- Depending on the OS font for symbols (arrows, checks, stars) or on emoji coverage being identical across devices.
- Leaving `LinkModifier.AutoOpenUrl` on for in-app command links; relying on hover on touch devices.
- Sharing one `Style`, rule or modifier instance between components; touching Unity objects from modifier callbacks.
- Copying sample code verbatim: samples add `Phase` on top of a scaled clock, pulse glows with per-frame rebuilds and reference fonts or assets they do not ship.

## Source Map

| Source | Used for |
|--------|----------|
| https://unity.lightside.media/unitext/docs/v3.30.0 and `/getting-started` | component, font, markup, paint, animation, interaction, editing and runtime API sections |
| https://unity.lightside.media/unitext/docs/v3.30.0/api (700 type pages, `llms.txt` index) | type roles, member signatures, slot semantics |
| https://unity.lightside.media/en/unitext/faq | performance, build size and atlas facts (read through a summarizing fetch) |
| Installed package — `Documentation/GettingStarted.md`, `Documentation/TmpMigration.md`, `README.md`, `CHANGELOG.md` | full docs with code blocks, migration map, version traps |
| Installed package — `Runtime/**`, `Editor/**`, `Defaults/**`, `Shaders/**`, `3D/**` | tiebreaker for tag names, parameter orders, defaults, units and doc-versus-code conflicts |
| Installed package — `Samples~/**` | case library, tag-name census, vendor usage patterns |
| Installed package `media.lightside.core` — `README.md`, `Runtime/**` | shared infrastructure, state attributes, color parsing |
