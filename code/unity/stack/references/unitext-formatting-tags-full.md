# UniText — Formatting modifiers and tags full reference

> **Base path:** `<UniTextRoot>` is the folder of the UniText package — the one whose `package.json` has `"name": "media.lightside.unitext"` (find it with `Glob **/media.lightside.unitext/package.json`; it may sit under `Packages/` or `Library/PackageCache/`). Never hard-code its location.
> See also: [unitext-formatting-tags-quickref.md](unitext-formatting-tags-quickref.md) (cheat sheet, one line per modifier, colors, unit rules — start there), [unitext-markup-system.md](unitext-markup-system.md) (rules, priorities, escaping, Markdown), [unitext-components-setup.md](unitext-components-setup.md), [unitext-runtime-api.md](unitext-runtime-api.md), [unitext-fonts.md](unitext-fonts.md), [unitext-effects-paint.md](unitext-effects-paint.md), [unitext-materials-shaders.md](unitext-materials-shaders.md), [unitext-range-state-rules.md](unitext-range-state-rules.md), [unitext-performance-mobile.md](unitext-performance-mobile.md)

---

Do not read this file top to bottom. Find the modifier ID in the quick reference, then `Grep "^### <ID> " -A 40` here (keep the trailing space so `SIZE` does not match `SIZEMATCH`; every block fits in 40 lines). The tail of the file holds `## Cross-cutting pitfalls`, `## Recipes` and `## Unverified`.

**Conventions in every block.** All modifier types live in `namespace LightSide`. **Registered by**: `P` editor Styles picker offers it, `T` TMP-migration vocabulary preset, `S` package BasicUsage sample, `doc` name only in the docs, `—` wired nowhere, `whole` whole-text/range style without a tag. None of this is automatic: a fresh component understands no tag until you add the style (master rule `unitext.md`, section "Tag vocabulary bootstrap"; [unitext-markup-system.md](unitext-markup-system.md)). **Slots** are positional, comma-separated; `field` is the serialized default used by a bare tag or an empty slot; the slot notation is `type unit default {range}`. **C# properties** are the generated public properties; retune them on the live instance (`text.GetModifier<T>()`, `null` until a style of that type exists). **Inspector-only** fields have no markup slot. `L` = that live instance, `text` = the component. Mobile verdicts come from reading source and docs; nothing was profiled.

Parameters of every modifier follow one cascade, weak to strong: field → rule default (`TagRule.DefaultParameter`, merged per slot) → markup token → owned value. A suffix-less number takes the field's unit; always write `px`/`em`/`%` (quickref section 4).

---

## Text style

### BOLD — Bold
- **Type:** `BoldModifier` · **Tag:** `<b>` · **Markdown:** `**x**` (a separate style with `new MarkdownWrapRule { Marker = "**" }`) · **Registered by:** P T S
- **Slots:**
  1. `weight` — int, CSS weight 1–1000; `0` or omitted = auto, `clamp(max(700, faceWeight + 300), ≤ 1000)`; field 0.
  2. `mode` — token: `f` = Synthetic, `r` = Real, anything else or omitted = Auto.
- **Inspector-only:** none. **C# properties:** `Weight` (int), `Mode` (`BoldMode`: Auto, Synthetic, Real).
- **Behavior:** the resolver tries a **real** face first: a static cut in the `FontFamily` ranked by the CSS font-matching rule (target below 400 prefers the nearest lighter weight, above 500 the nearest heavier, 400–500 a weight in [target, 500] first), a variable font's `wght` axis (clamped to the axis range), or an installed OS cut for system fonts. Resolved weight ≥ request = real; lower and synthesis allowed = **synthetic**: SDF dilate plus advance correction, counted in 300-weight steps above the face weight, one step = em/24 extra stroke (`<b>` on a Regular 400 font targets 700 = one step). Requests lighter than the face add nothing (cannot thin). `f` ignores real faces and the `wght` axis and adds only the positive difference over the current face. `r` never synthesizes and stays at the face's weight if no cut matches. Layers on the font's configured axis defaults (only named axes change) and honours the family picked by `<font>`. Emoji and colour glyphs are never emboldened. `UniTextFont.FakeBoldWeight` (font asset, "Spacing & Style") is the last-resort synthesis knob.
- **Pitfalls:** on a single Regular face `<b>` is synthetic: fine for UI, soft for headings, so supply a bold cut or a variable font. A `wght` axis whose maximum is below the request ends partly synthetic. With a variable font every distinct weight is another atlas instance (verdict LIMIT for many weights). Cover a run with either `<b>` or `<var>`, not both. `**` needs its own Markdown style; the `<b>` tag style does not enable it.
- **Mobile:** OK (synthetic = shader dilate; colour glyphs skipped).
- **Example:** `text.Text = "<b>BOSS</b> approaches, <b=900,f>5000 HP</b>";` — whole text, no markup: `label.SetWholeText<BoldModifier>("700,r");`

### ITALIC — Italic
- **Type:** `ItalicModifier` · **Tag:** `<i>` · **Markdown:** `*x*` (`MarkdownWrapRule { Marker = "*" }`) · **Registered by:** P T S
- **Slots:**
  1. `style` — token: empty = Auto; integer = synthetic shear in **percent of height** {−100…100} (20 ≈ 11°, 30 ≈ 16.7°; not degrees); `f` = shear using the run font's own `UniTextFont.ItalicStyle` (default 30); `r` = real face only.
- **Inspector-only:** none. **C# properties:** `Style` (`ItalicStyle { mode, slant }`), `Mode` (`ItalicMode`: Auto, Synthetic, FontSlant, RealOnly), `Slant`.
- **Behavior:** Auto picks, in order: a real italic cut in the family; a variable `ital` axis (set to 1 when the axis maximum is ≥ 0.5); a `slnt` axis (set to −12°, or the system font's own non-zero default slant); an OS italic cut; otherwise **synthetic** vertex shear by the font's `ItalicStyle` percent. `<i=N>` shears by N % and ignores real faces entirely; `<i=r>` uses a real face only (stays upright if there is none). The shear pivots at half x-height and the line reserves width for the overhang. Colour glyphs never slant.
- **Pitfalls:** `<i=20>` forces a synthetic slant even when a real italic cut exists; use bare `<i>` for the best face. Negative values slant backwards (`<i=-15>`).
- **Mobile:** OK (vertex shear).
- **Example:** `"She <i>whispered</i>, then <i=r>sighed</i>."` — C# default retune: `L.Mode = ItalicMode.Synthetic; L.Slant = 20;`

### UPPER — Uppercase
- **Type:** `UppercaseModifier` · **Tag:** `<upper>` (TMP vocabulary also `uppercase`, `allcaps`) · **Markdown:** none · **Registered by:** P T S
- **Slots:** none. **Inspector-only / C# properties:** none.
- **Behavior:** rewrites the codepoint buffer before shaping with the bundled Unicode **simple** case mapping. The component's `Text` string is unchanged.
- **Pitfalls:** no `ß` → `SS`, no locale rules (Turkish dotless i). To keep a localization key or saved string readable, use the whole-text form instead of uppercasing the string in code.
- **Mobile:** OK.
- **Example:** `"<upper>Level up!</upper>"` — `title.SetWholeText<UppercaseModifier>();`

### LOWER — Lowercase
- **Type:** `LowercaseModifier` · **Tag:** `<lower>` (TMP vocabulary also `lowercase`) · **Registered by:** P T S
- **Slots / inspector-only / C# properties:** none.
- **Behavior:** same mechanism as `UPPER` (simple case mapping before shaping).
- **Pitfalls:** same locale limits as `UPPER`.
- **Mobile:** OK.
- **Example:** `"<lower>NEW GAME</lower>"`

### SMALLCAPS — Small capitals
- **Type:** `SmallCapsModifier` · **Tag:** `<smallcaps>` · **Registered by:** P T S
- **Slots / inspector-only / C# properties:** none.
- **Behavior:** uses the native OpenType `smcp` feature when the **primary** font has it; otherwise synthesizes uppercase at 0.8x scale (advance and glyph). Capitals stay capitals. Merges with other OpenType features on the range.
- **Pitfalls:** only the primary font is checked for `smcp`. Mixed case input is required to see the effect.
- **Mobile:** OK.
- **Example:** `"<cspace=0.08em><smallcaps>Dungeon Run</smallcaps></cspace>"`

### SIZE — Size
- **Type:** `SizeModifier` · **Tag:** `<size>` · **Registered by:** P T S
- **Slots:**
  1. `size` — `UnitValue` `px` | `%` | `delta`, field `Absolute(24)`: `24`, `150%`, `+10`, `-5`. **`em` is not handled**: `1.5em` falls into the absolute branch and means 1.5 px.
- **Inspector-only:** none. **C# properties:** `Size` (`UnitValue`).
- **Behavior:** the scale is `value/baseSize` (px), `value/100` (%), `(baseSize + value)/baseSize` (delta), where `baseSize` is the component's shaping font size (auto-size aware); a scale ≤ 0 is ignored. Nested or overlapping `<size>` ranges **overwrite**, they never compound (unlike CSS). The line box follows the largest size on the line in both directions (an absolute `<line-height=px>` pins it). Underline/strike thickness and offset follow the range size; pixel-sized layer geometry (stroke width) keeps its pixel size on scaled glyphs.
- **Pitfalls:** a bare `<size>` is 24 px. `em` is never valid. Changing sizes per frame re-lays out the text; animate `color.a` or transforms instead.
- **Mobile:** OK.
- **Example:** `text.Text = $"<size=130%><b><color=#FFD60A>-{damage}</color></b></size>";` — whole text with the component: `text.FontSize = 24;`

### FONT — Font family
- **Type:** `FontModifier` · **Tag:** `<font>` · **Registered by:** P T S
- **Slots:**
  1. `familyName` — string = `FontFamily.name` in the component's FontStack, **case-sensitive**. Field `""`: an empty value or bare tag does nothing.
- **Inspector-only:** none. **C# properties:** `FamilyName`.
- **Behavior:** wins over `preferredLanguage` and the fallback chain. An unknown name logs one `Debug.LogWarning` per name and falls back. Bold and italic inside the range resolve their faces within the chosen family.
- **Pitfalls:** the name is a family name from the FontStack, not an asset name or path. Fonts must carry the glyphs of the text (see [unitext-fonts.md](unitext-fonts.md)).
- **Mobile:** OK.
- **Example:** `"<font=header><b=800>TITLE</b></font> body text"`

### LANG — Language
- **Type:** `LanguageModifier` · **Tag:** `<lang>` · **Registered by:** P; BasicUsage sample slides add it locally
- **Slots:**
  1. `language` — BCP 47 string (`zh-Hans`, `ja`, `ko`, `ar`), field `"en"`.
- **Inspector-only:** none. **C# properties:** `Language`.
- **Behavior:** drives HarfBuzz `locl` substitutions (regional Han glyph variants, Arabic forms). Needs a font that ships `locl` (Source Han class). An ill-formed tag logs a warning and the range keeps the text language. The component property `UniText.Language` is the whole-text default.
- **Pitfalls:** a font without `locl` shows no change. Set the component `Language` for whole labels instead of wrapping them in a tag.
- **Mobile:** OK.
- **Example:** `"<lang=ja>直</lang> / <lang=zh-Hans>直</lang>"` — `text.Language = "ja";`

### VAR — Variable font axes
- **Type:** `VariationModifier` · **Tag:** `<var>` (TMP vocabulary: `font-weight` maps to the first slot) · **Registered by:** P T
- **Slots** (each `UnitValue` absolute | `%` | `delta`; `~` or an empty slot skips that axis):
  1. `wght` field `Absolute(400)` · 2. `wdth` field 100 · 3. `ital` field 0 · 4. `slnt` field 0 · 5. `opsz` field 12.
- **Inspector-only:** none (inspector range hints: wght 1–1000, wdth 50–200, ital 0–1, slnt ±90, opsz 1–144). **C# properties:** `Weight`, `Width`, `Italic`, `Slant`, `OpticalSize`.
- **Behavior:** direct axis control with **no synthetic fallback**. Layers on the font's configured axis defaults: axes you do not name keep them. A bare `<var>` applies all five field defaults (400/100/0/0/12). Each distinct axis set is its own glyph instance in the atlas, at most 255 sets per text.
- **Pitfalls:** do not combine with `<b>` or `<i>` on the same run (they also set `wght`, `ital`, `slnt`). A static font ignores axes. Many different weights on screen cost atlas space.
- **Mobile:** LIMIT (one atlas instance per distinct axis set).
- **Example:** `"<var=700,80>Wide bold</var>"`, italic by axis `"<var=~,~,1>slanted</var>"`, `label.SetWholeText<VariationModifier>("600,90");`

### FEATURE — OpenType features
- **Type:** `FontFeatureModifier` · **Tag:** `<feature>` · **Registered by:** P (not in the sample or TMP vocabulary)
- **Slots:**
  1. `features` — string of OpenType settings: `kern 0`, `-liga` (off), `+dlig`, `tnum` (bare = on), `ss01 2` (value after a space, `:` or `=`). Field `"kern 0"`.
- **Inspector-only:** none. **C# properties:** `Features`.
- **Behavior:** affects shaping only. Features **merge** with small caps, sup/sub and overlapping ranges; the innermost wins; unknown tags are ignored.
- **Pitfalls:** a string slot ends at the first comma, so write **one feature per tag** (nesting merges them), use a `DefaultParameter`, or set several in C# (`Features = "kern 0, -liga"`). The font must contain the feature.
- **Mobile:** OK.
- **Example:** `"<feature=tnum>0123456789</feature>"` — `Styles.Add(Style.WholeText(new FontFeatureModifier { Features = "tnum" }, null));`

### MAT — Material
- **Type:** `MaterialModifier` · **Tag:** `<mat>` · **Registered by:** P (not in the sample or TMP vocabulary)
- **Slots:**
  1. `tint` — `Color32` (hex or name) multiplying the vertex colour.
- **Inspector-only:** field `glyphDataWriter`. **C# properties:** `Material`, `RenderOrder` (`Replace` default / `Keep`), `SortIndex`, `ConstantUv2`, `ConstantUv3`, `QuadPaddingOverride` (−1 = the shader's), `CloneMaterial` (true), `Tint`.
- **Behavior:** the range gets its own sub-mesh and `CanvasRenderer`, so each material modifier adds a draw call. The shader must include `LightSide_Custom.cginc`. `Replace` suppresses the base face of the range.
- **Pitfalls:** an unconfigured material hides the text. Authoring details are in [unitext-materials-shaders.md](unitext-materials-shaders.md).
- **Mobile:** LIMIT (extra sub-mesh and draw call per modifier).
- **Example:** `"<mat=#FFD700>Legendary</mat>"` (after the style carries a configured `Material`).

### GLYPHRES — Glyph resolution
- **Type:** `GlyphResolutionModifier` · **Tag:** none (whole-text or range style) · **Registered by:** `whole`
- **Slots:**
  1. `resolutionBoost` — int {0…2}.
- **Inspector-only:** none. **C# properties:** `ResolutionBoost`.
- **Behavior:** raises SDF tile resolution for crisper large glyphs. Each +1 class is about 4x tile memory (+2 about 16x); the atlas grows only and is shared across components.
- **Pitfalls:** never apply it to a whole paragraph or to many labels; scope it to a heading or a single word.
- **Mobile:** AVOID broad use (tile memory); a single hero word is acceptable.
- **Example:** `Styles.Add(Style.Range(new GlyphResolutionModifier(), 0, 5, "1"));`

### RUBY — Ruby annotation
- **Type:** `RubyModifier` + parse rule `RubyParseRule` (rule fields `rubyTag = "ruby"`, `textTag = "rt"`, `parenTag = "rp"`) · **Tags:** `<ruby>base<rt>reading</rt></ruby>` and `<ruby=reading>base</ruby>` · **Registered by:** S (needs the rule + modifier pair; not in the picker)
- **Slots:** the modifier reads the reading as its first token, delivered by the rule.
- **Inspector-only:** `rubyScale` 0.5 {0.1…1}, `align` (`SpaceAround` default, `Center`, `SpaceBetween`, `Start`), `position` (`Over` default, `Under`). **C# properties:** `RubyScale`, `Align` (`RubyModifier.RubyAlign`), `Position` (`RubyModifier.RubyPosition`).
- **Behavior:** several `<rt>` after one base make mono-ruby; `<rp>` is stripped; the end tag of `rt`/`rp` is optional. Base and reading wrap as one unit. The annotation raises the line height of its rows.
- **Pitfalls:** leave top padding or the first line's annotation clips at the box edge. Tags **inside the base are not parsed**. A missing `</ruby>` leaves the markup literal. Horizontal LTR base only, over or under.
- **Mobile:** OK.
- **Example:**
```csharp
text.Styles.Add(new Style { Source = new RubyParseRule(), Modifier = new RubyModifier { RubyScale = 0.5f } });
text.Text = "<ruby>漢字<rt>かんじ</rt></ruby>を<ruby=よ>読</ruby>む";
```

### SCRIPT — Superscript / subscript
- **Type:** `ScriptPositionModifier` · **Tags:** `<sup>`, `<sub>` (two rules, default parameters `super` / `sub`) · **Registered by:** T (two styles), S (composite); not in the picker
- **Slots:**
  1. `mode` — `super` or `sup` = Super, `sub` = Sub; any other token fails to parse and the field (`Super`) applies.
- **Inspector-only:** none. **C# properties:** `Mode` (`ScriptPositionModifier.Placement`).
- **Behavior:** native OpenType `sups`/`subs` where the primary font has the glyph; otherwise scales from the OS/2 sizes (fallback 0.7) and raises or lowers by the OS/2 offset (fallback 35 % / 12 % em). Features merge with other features on the range. Synthetic sub/sup do not move the `Ink` text-box trim.
- **Pitfalls:** one modifier serves both tags, so each rule must carry its own default parameter (`super` / `sub`); a `<sub>` without it would take the field default `Super`. Two separate styles with defaults also work (the TMP vocabulary does that).
- **Mobile:** OK.
- **Example:**
```csharp
var scripts = new CompositeParseRule();
scripts.Rules.ReplaceAll(new ParseRule[] {
    new TagRule("sup") { DefaultParameter = "super" },
    new TagRule("sub") { DefaultParameter = "sub" } });
preset.Styles.Add(Style.FromSource(scripts, new ScriptPositionModifier())); // preset: a StylePreset
text.Text = "H<sub>2</sub>O and E = mc<sup>2</sup>";
```

## Appearance

### COLOR — Color
- **Type:** `ColorModifier` · **Tag:** `<color>` · **Registered by:** P T S
- **Slots:**
  1. `color` — `Color32`: `#RGB`, `#RRGGBB`, `#RRGGBBAA`, or one of the 21 names (quickref section 3). Field white. `#RGBA` (4 digits) and `rgb()` are not parsed.
- **Inspector-only:** none. **C# properties:** `Color`; static helper `ColorModifier.TryGetColor(buffers, cluster, out Color32 c)`.
- **Behavior:** the tag RGB **overwrites** the glyph's vertex colour (it does not tint the component colour). The component's alpha is applied separately (a `CanvasGroup` on Canvas text, vertex alpha on world text), so it **multiplies** with the tag's alpha: an opaque tag colour inherits the component alpha. `#RRGGBB00` packs as alpha 1/255, never "unset". Emoji, colour glyphs and sprites keep their own colours. The component property `color` sets the base colour: an RGB change rebuilds the mesh, an alpha-only change rebuilds nothing.
- **Pitfalls:** a bare `<color>` is white. Name your own colour tags rather than repeating hex: `Style.Tag(new ColorModifier(), "warning", "#FF0000")` makes `<warning>` red and `<warning=#FFA500>` overrides it (the tag value wins over the rule default).
- **Mobile:** OK.
- **Example:** `"Found <color=#A335EE>Shadow Blade</color> (<color=red>-12 HP</color>)"` — whole text: `label.SetWholeText<ColorModifier>("#FF0000");` or `label.color = Color.red;`

### ALPHA — Alpha
- **Type:** `AlphaModifier` · **Tag:** `<alpha>` · **Registered by:** P T (not in the sample)
- **Slots:**
  1. `alpha` — float {0…1} written as `0.5`, `50%` or `#80` (hex byte); clamped; field **0.5**.
- **Inspector-only:** none. **C# properties:** `Alpha`.
- **Behavior:** multiplies the alpha a glyph has at the point where `GlyphOpacityOrder` runs (component alpha plus `ColorModifier` alpha). Fills, strokes, shadows, glows, extrusions, **underlines/strikethroughs**, colour emoji and inline sprites fade with it. Scene-object inline objects and **highlights keep their own opacity**. The innermost range wins and values never compound. A fully transparent glyph keeps its layout space. The component's `color.a` fades everything including range decorations without rebuilding the mesh; at 0 the text is still drawn and still hit-testable, so call `Hide()` after the fade-out.
- **Pitfalls:** a bare `<alpha>` is 0.5. Unlike TMP, the effect ends at `</alpha>` and multiplies (TMP holds until the next tag).
- **Mobile:** OK (vertex alpha).
- **Example:** `"<alpha=#40>ghost</alpha> text"` — fade a whole label with `text.color = new Color(1f, 1f, 1f, a);`

---

## Layout

### CSPACE — Letter spacing
- **Type:** `LetterSpacingModifier` · **Tag:** `<cspace>` · **Registered by:** P T S
- **Slots:**
  1. `spacing` — `UnitValue` `px` | `em`, field `Absolute(0.3)`; negative tightens.
- **Inspector-only:** none. **C# properties:** `Spacing`.
- **Behavior:** overlapping ranges resolve innermost-wins, never compound. In cursive joining scripts positive spacing draws tatweel (kashida, U+0640) bars so joins survive. Trailing tracking is stripped from the line width, so centred and right-aligned text stays on its axis. Pipeline order: `cwidth` cells first, then `cspace`/`wspace` added on top, then justification budgets.
- **Pitfalls:** a bare `<cspace>` is 0.3 px. The old second token `<cspace=…,true>` (monospace) is gone; use `<cwidth=auto>`. The font needs `U+0640` for Arabic spacing.
- **Mobile:** OK.
- **Example:** `"<cspace=0.08em>S T A G E  3</cspace>"` — `title.SetWholeText<LetterSpacingModifier>("0.05em");`

### CWIDTH — Character width
- **Type:** `CharacterWidthModifier` · **Tag:** `<cwidth>` (TMP `mspace` maps here) · **Registered by:** P T S
- **Slots:**
  1. `width` — `UnitValue` `px` | `em` (custom parser): `1em` full-width, `0.5em` half-width, a bare number = px, **`auto` or ≤ 0 = the widest glyph of the range**. Field 0 = auto.
- **Inspector-only:** none. **C# properties:** `Width`.
- **Behavior:** changes advances and offsets only (no glyph substitution). Runs before `cspace`/`wspace`, which add on top. Each authored range resolves its own widest advance. TMP `mspace` bare numbers read as px.
- **Pitfalls:** do not use `auto` for numbers that change (a score counter): every range sizes to its own widest glyph and the cells jump. Use a fixed `0.6em` or tabular figures (`FEATURE`).
- **Mobile:** OK.
- **Example:** `"<cwidth=0.6em>0123</cwidth>"` — `hud.SetWholeText<CharacterWidthModifier>("0.6em");`

### WSPACE — Word spacing
- **Type:** `WordSpacingModifier` · **Tag:** `<wspace>` · **Registered by:** P S (not in the TMP vocabulary)
- **Slots:**
  1. `spacing` — `UnitValue` `px` | `em`, field **`Em(0.25)`**.
- **Inspector-only:** none. **C# properties:** `Spacing`.
- **Behavior:** applies only to U+0020 and U+00A0; tabs and U+2000–200A / U+3000 are untouched. Negative values tighten. The trailing space is excluded from the line width. Overlapping ranges: innermost wins.
- **Pitfalls:** the field unit is em, so write the unit explicitly (`<wspace=4px>` vs `<wspace=0.4em>`).
- **Mobile:** OK.
- **Example:** `"<wspace=0.6em>wide gaps between words</wspace>"`

### LINEHEIGHT — Line height
- **Type:** `LineHeightModifier` · **Tag:** `<line-height>` (`lh` appears only in old comments, it is not wired) · **Registered by:** P T S
- **Slots:**
  1. `heightValue` — `UnitValue` `px` | `%` | `delta`, field 0: `150%` or `1.5em` = **multiplier** of the line's advance; a **bare number = absolute px**; `+10`/`-5` = delta px; `0` or empty = no nudge.
  2. `mode` — `content` | `primary` | `scaled`.
  3. `scale` — float, field 1.2; used only by `scaled` (line pitch is exactly `scale × fontSize`).
  4. `leading` — `halfLeading` | `leadingAbove` | `leadingBelow`.
- **Inspector-only:** none. **C# properties:** `HeightValue`, `Mode` (`LineHeightMode`, field `Content`), `Scale`, `Leading` (field `HalfLeading`).
- **Behavior:** reach later slots with empty ones: `<line-height=,primary>`, `<line-height=,scaled,1.5>`. Several absolute heights on one line: the largest wins. The legacy first tokens `h` / `s` still parse. With no modifier the text uses the package default from `UniTextSettings` "Text Defaults": mode `Scaled`, scale 1.4. The line height follows the largest `<size>` on the line.
- **Pitfalls:** the modifier's own default mode is `Content` (rows grow with tall glyphs) while the package default is `Scaled` (uniform rows; tall fallback glyphs and emoji can overlap): set `Mode` explicitly when you add the modifier. `<line-height=40>` means 40 px, not a multiplier. `pspace` is a separate, paragraph-level gap.
- **Mobile:** OK.
- **Example:** `"<line-height=160%>Long lore text that needs air between lines.</line-height>"` — `Styles.Add(Style.WholeText(new LineHeightModifier { Mode = LineHeightMode.Scaled, Scale = 1.3f }, null));`

### PSPACE — Paragraph spacing
- **Type:** `ParagraphSpacingModifier` · **Tag:** `<pspace>` · **Registered by:** P S (not in the TMP vocabulary)
- **Slots:**
  1. `after` — `UnitValue` `px` | `%` | `em`, field 0.
  2. `before` — same.
  (`10` = 10 px; `50%` and `0.5em` = that fraction of the font size; `<pspace=,4>` sets only `before`.)
- **Inspector-only:** none. **C# properties:** `After`, `Before`.
- **Behavior:** a paragraph is text separated by `\n` (or U+2029); `<br>` is a soft break and adds no paragraph gap. Gaps of two paragraphs **add** (no margin collapsing). Nothing is added at the block edges. Negative values pull paragraphs together but never invert. Several ranges on one paragraph: largest per side.
- **Pitfalls:** separate paragraphs with `\n`, not `<br>`.
- **Mobile:** OK.
- **Example:** `text.SetWholeText<ParagraphSpacingModifier>("0.4em");` on text such as `"Line one\nLine two"`.

### LINEGAP — Line gap
- **Type:** `LineGapModifier` · **Tag:** none (produced by the LaTeX `\vspace` rule) · **Registered by:** `whole`
- **Slots:**
  1. `gap` — `UnitValue` `px` | `%` | `em`.
- **Inspector-only:** none. **C# properties:** `Gap`.
- **Behavior:** adds space below the line that holds the range's last character; gaps add up; negative values are allowed. Introduced with the 3.30.0 LaTeX rules.
- **Pitfalls:** it adds space only below the one line that holds the range's last character; use `pspace` for paragraph rhythm.
- **Mobile:** OK.
- **Example:** `Styles.Add(Style.Range(new LineGapModifier(), 0, 12, "8px"));`

### NOBR — No break
- **Type:** `NoBreakModifier` · **Tag:** `<nobr>` · **Registered by:** P T S
- **Slots / inspector-only / C# properties:** none.
- **Behavior:** the range takes no soft, CJK or dictionary break inside it but may break immediately before or after. Explicit `\n` and `<br>` still break. A range wider than the box still splits.
- **Pitfalls:** none beyond the over-wide case; use it around number-plus-unit pairs.
- **Mobile:** OK.
- **Example:** `"Deal <nobr>120 damage</nobr> to all enemies"`

### SEP — Separator
- **Type:** `SeparatorModifier` + parse rule `SeparatorParseRule` (rule fields `tagName = "sep"`, `separator` = space, bar, space) · **Tag:** void tag `<sep>`, `<sep=" ● ">` · **Registered by:** P (standalone group) S
- **Slots:** the rule reads 1 per-occurrence separator string (quote it to keep spaces).
- **Inspector-only:** none. **C# properties:** none on the modifier; rule fields are `tagName` and `separator`.
- **Behavior:** the rule inserts the separator string; the modifier keeps each run between separators whole across line wraps, and the separator collapses when its segment wraps. Parse priority 1.
- **Pitfalls:** the value must be quoted when it contains spaces or commas.
- **Mobile:** OK.
- **Example:** `"Armor<sep=\" ● \">Speed<sep=\" ● \">Luck"` (breadcrumb or stat strip).

### ELLIPSIS — Ellipsis
- **Type:** `EllipsisModifier` · **Tag:** `<ellipsis>` · **Registered by:** P S
- **Slots:**
  1. `position` — float {0…1}: `1` end (field), `0` start, `0.5` middle.
- **Inspector-only:** none. **C# properties:** `Position`.
- **Behavior:** acts **only when the content overflows**: width without word wrap, height with word wrap. The marker is three ASCII dots `...` in the surrounding font. With word wrap the text is clamped to the lines that fit the box height (`position` has no effect there) and the lower lines are hidden but keep their layout space. Ruby, list markers and inline media inside truncated ranges are hidden too. Reflow on a rect-height change is automatic.
- **Pitfalls:** nothing happens while the text fits the RectTransform. The font needs a `.` glyph. Hidden lines keep their layout space, so the box does not shrink to the visible lines.
- **Mobile:** OK.
- **Example:** `label.WordWrap = false; label.Styles.Add(Style.WholeText(new EllipsisModifier(), null));` — middle ellipsis for file or player names: `new EllipsisModifier { Position = 0.5f }`.

### TRUNCATE — Truncate
- **Type:** `TruncateModifier : EllipsisModifier` · **Tag:** `<truncate>` · **Registered by:** P S
- **Slots:**
  1. `position` — as `ELLIPSIS`.
- **Inspector-only:** `fadeLength` (`UnitValue` px | em, `Em(0)` = hard cut), `fadeOffset`. **C# properties:** `Position`, `FadeLength`, `FadeOffset`.
- **Behavior:** same overflow rules and `position` meaning as `ELLIPSIS`, but it removes the overflowing text **without drawing dots**. With a positive `fadeLength` the text beside each cut dissolves into it, fully transparent at the cut (`fadeOffset` shifts where transparency is reached: positive inside the text, negative leaves the cut partly visible); text that fits never fades. The fade is exact on vertex-colour layers; gradient, texture, colour-glyph and custom-material layers fade through vertex alpha (a gradient bends across a straddling glyph). Scene-object inline objects and range backgrounds keep their own opacity.
- **Pitfalls:** `FadeLength` and `FadeOffset` have no tag slot: set them in C# or on the style entry. With the default `Em(0)` it is a hard cut with no visual hint that text is missing.
- **Mobile:** OK.
- **Example:** `label.Styles.Add(Style.WholeText(new TruncateModifier { FadeLength = UnitValue.Em(1.5f) }, null));`

### LIST — Lists
- **Type:** `ListModifier` (+ `MarkdownListParseRule` for Markdown) · **Tag:** `<li>` · **Markdown:** `- x`, `* x`, `+ x`, `1. x`, `1) x` · **Registered by:** `<li>` S; the picker offers only the Markdown list (P)
- **Slots:**
  1. `level` — int, field 0 (nesting level).
  2. `number` — int, field −1 = bullet; `≥ 0` = ordered item with that number.
  3. `marker` — string; replaces the bullet or number.
- **Inspector-only:** `markerPlacement` (`Inside` default / `Outside`), `bulletMarkers` (`•`, `-`, `·` by level, the last repeats), `orderedStyles` (Decimal, LowerAlpha, LowerRoman by level). **C# properties:** `Level`, `Number`, `Marker`, `MarkerPlacement` (`ListMarkerPlacement`).
- **Behavior:** no number gives the bullet `bulletMarkers[min(level, last)]`; a number gives the ordered marker in `orderedStyles[min(level, last)]` (`1.`, `a.`, `i.`) plus a space. Content is indented by the marker widths of the ancestor levels (`Inside`) or by `(level + 1) × widest marker` (`Outside`). Marker glyphs are injected as virtual glyphs; RTL flips the marker side. Markdown: `MarkdownListParseRule.spacesPerLevel` = 2; an item ends at the first line break unless the next line is indented deeper; there is no lazy continuation. `* item` at line start is a list item, `*word*` is italic.
- **Pitfalls:** `<li>` is a range, not a line: it adds **no newline**, separate items with `\n` yourself. `<li>` is not in the picker: add `Style.Tag(new ListModifier(), "li")`. The bullet glyphs `•`, `-`, `·` must exist in the font stack or the marker is silently missing.
- **Mobile:** OK.
- **Example:**
```csharp
preset.Styles.Add(Style.Tag(new ListModifier(), "li"));   // preset: a StylePreset
text.Text = "<b>Fire Sword</b>\n<li>+12 damage</li>\n<li>Burns for 3 s</li>\n<li=0,1>First</li>\n<li=0,2>Second</li>";
```

### INDENT — Indent
- **Type:** `IndentModifier` · **Tag:** `<indent>` (TMP vocabulary also `line-indent`, `margin-left`) · **Registered by:** T S (not in the picker)
- **Slots:**
  1. `indent` — `UnitValue` `px` | `em` | `%`, field **`Em(1)`**; `%` is of the RectTransform width (ignored for unbounded width); negative outdents; nested indents add.
- **Inspector-only:** none. **C# properties:** `Indent`.
- **Behavior:** adds a line-start margin to every line whose first codepoint lies in the range; it holds across wrapped lines until the tag closes. A tag opened mid-line widens the previous glyph's advance.
- **Pitfalls:** write units explicitly (`<indent=24px>`, `<indent=2em>`); a bare number takes the field's em unit.
- **Mobile:** OK.
- **Example:** `"<indent=1.5em><i>Ignites foes on hit.</i></indent>"`

### ALIGN — Alignment
- **Type:** `AlignmentModifier` · **Tag:** `<align>` · **Registered by:** T S (not in the picker)
- **Slots:**
  1. `align` — `Start`, `Center`, `End`, `Justify`, `Left`, `Right` (initials `s c e j l r` work).
  2. `justify` — `Auto`, `InterWord`, `InterCharacter`, `None` (write the two `I…` names in full: `i` collides).
  3. `lastLine` — `Auto`, `Start`, `End`, `Center`, `Justify`.
- **Inspector-only:** `wordSpacingMin` 80 {50…100 %}, `wordSpacingMax` 133 {100…300}, `letterSpacingMin` 0 {−10…0 % em}, `letterSpacingMax` 0 {0…10}, `glyphScalingMin` 100 {90…100}, `glyphScalingMax` 100 {100…110}. **C# properties:** `Align`, `Justify`, `LastLine`, plus the six budgets (`WordSpacingMin`, `WordSpacingMax`, `LetterSpacingMin`, `LetterSpacingMax`, `GlyphScalingMin`, `GlyphScalingMax`).
- **Behavior:** applies per paragraph. The component's `HorizontalAlignment` (default `Start`) and `VerticalAlignment` stay on `UniText` and are the base. `Start`/`End` follow the paragraph direction, `Left`/`Right` are physical. Justify spends word-space stretch up to `wordSpacingMax` first, then letter spacing, then glyph scaling. TMP's `justified`/`flush` values must be rewritten to `Justify` with a `justify` mode.
- **Pitfalls:** CJK spaced setting wants `InterCharacter`. For RTL text prefer `Start`/`End`; `<align=Left>` pins physically.
- **Mobile:** OK.
- **Example:** `"<align=Justify,InterWord,Center>Long paragraph…</align>"` — whole text: `Styles.Add(Style.WholeText(new AlignmentModifier { Align = HorizontalAlignment.Justify, LastLine = LastLineAlignment.Center, WordSpacingMax = 150f }, null));`

### DIR — Text direction
- **Type:** `DirectionModifier` · **Tag:** none (the docs name `dir`; nothing wires it) · **Registered by:** `doc`, whole-text only
- **Slots:**
  1. `direction` — `LeftToRight` | `RightToLeft` | `Auto` (field `Auto`; single characters `l`, `r`, `a` work; **`ltr`/`rtl` are not recognised**).
- **Inspector-only:** none. **C# properties:** `Direction` (`TextDirection`).
- **Behavior:** applied once per text (the last applied value wins). `Auto` detects direction per paragraph (UAX #9). Lists flip the marker side in RTL.
- **Pitfalls:** this is whole-text only in practice. `<dir=rtl>` is silently wrong.
- **Mobile:** OK.
- **Example:** `text.SetWholeText<DirectionModifier>("RightToLeft"); ... text.ClearWholeText<DirectionModifier>();`

### TRIM — Text box trim
- **Type:** `TextBoxTrimModifier` · **Tag:** none · **Registered by:** `—` (whole-text)
- **Slots:**
  1. `overEdge` — `Ascent` (default), `CapHeight`, `HalfLeading`, `Text`, `XHeight`, `Ink` (`TextOverEdge`).
  2. `underEdge` — `Descent` (default), `Baseline`, `HalfLeading`, `Text`, `Ink` (`TextUnderEdge`).
- **Inspector-only:** none. **C# properties:** `OverEdge`, `UnderEdge`.
- **Behavior:** trims the layout box top and bottom (CSS `text-box-trim` / `text-box-edge`), so a button label centres on cap height and baseline. `Ink` measures the shaped outlines of the first and last line (inline objects, effects, animation and synthetic sub/sup do not move it); `Ink` + `Ink` with `Middle` alignment centres the letters themselves.
- **Pitfalls:** whole-text only. Pair it with `VerticalAlignment.Middle` when centring button labels.
- **Mobile:** OK.
- **Example:** `label.Styles.Add(Style.WholeText(new TextBoxTrimModifier { OverEdge = TextOverEdge.CapHeight, UnderEdge = TextUnderEdge.Baseline }, null)); label.VerticalAlignment = VerticalAlignment.Middle;`

### SIZEMATCH — Font size match
- **Type:** `FontSizeMatchModifier` · **Tag:** none · **Registered by:** `—` (whole-text)
- **Slots:**
  1. `metric` — `None` | `XHeight` | `CapHeight`.
  2. `target` — float; `0` = match the primary font.
- **Inspector-only:** none. **C# properties:** `Metric` (`FontNormalizeMetric`, field `XHeight`), `Target`.
- **Behavior:** normalises fallback fonts' x-height or cap height to the primary font (or to a target aspect), per component. The package default is `UniTextSettings.FontNormalizeMetric` = `None`; each `UniTextFont` can opt out with its `Normalize Size` option (on by default).
- **Pitfalls:** useless unless several fonts are in the stack (CJK or Arabic fallback next to a Latin primary). Whole-text only.
- **Mobile:** OK.
- **Example:** `text.Styles.Add(Style.WholeText(new FontSizeMatchModifier { Metric = FontNormalizeMetric.XHeight }, null));`

### ARC — Arc
- **Type:** `ArcModifier` · **Tag:** none (the docs name `arc`) · **Registered by:** `doc`
- **Slots:**
  1. `angle` — float {−360…360}°, field 90: positive arches up, negative down, 0 straight.
  2. `origin` — `Alignment` (default), `Left`, `Center`, `Right` (`ArcOrigin`).
- **Inspector-only:** `circle` (`RectPlacement`; `Fill` default = the sweep decides; give it its own box for a fixed rail, then `angle` and `origin` are unused and the layout width is the circumference). **C# properties:** `Angle`, `Origin`, `Circle`, read-only `Sweep`, static `Rail(...)`.
- **Behavior:** glyphs are placed as rigid quads on concentric arcs; each line's radius is derived so the range spans exactly `angle` (the label holds its sweep and flattens as text grows). A range wider than the circle laps (`Sweep` above 360°). Ranges of one modifier type share an axis per cluster (last wins); different Arc/Curve modifier types on the same cluster bend twice.
- **Pitfalls:** rebuilt with text and layout: do not animate `Angle` per frame on many labels. Pair with component `HorizontalAlignment = Center`.
- **Mobile:** LIMIT (per-glyph placement).
- **Example:** `text.Styles.Add(Style.Tag(new ArcModifier(), "arc")); text.Text = "<arc=140,Center>LEVEL UP</arc>";`

### CURVE — Curve
- **Type:** `CurveModifier` · **Tag:** none (pick a spelling, e.g. `curve`) · **Registered by:** `—`
- **Slots:**
  1. `height` — float px, field 40; negative flips, 0 is straight.
- **Inspector-only:** `curve` (`Ease`, default `EaseProfiles.Bulge`). **C# properties:** `Height`, `Curve`, read-only `Frame`.
- **Behavior:** lifts glyphs along `curve(0..1)` across the range. Shares the per-cluster axis rule with `ARC`.
- **Pitfalls:** same rebuild cost as `ARC`; a bare tag lifts by 40 px.
- **Mobile:** LIMIT (as `ARC`).
- **Example:** `text.Styles.Add(Style.Tag(new CurveModifier(), "curve")); text.Text = "<curve=24>WAVE 3</curve>";`

---

## Decoration

Underline and strikethrough are **virtual glyph quads inside the text mesh** (paintable, affected by per-glyph layers). Highlight is **range-decoration geometry** drawn on separate canvas surfaces. They share almost nothing:

| Aspect | `UNDERLINE` / `STRIKE` (`BaseLineModifier`) | `HIGHLIGHT` (`BaseRangeDecorationModifier`) |
|---|---|---|
| Geometry | virtual glyph quads emitted through the glyph pipeline; per line fragment: left cap + one body quad per covered glyph + right cap | mesh authored after final layout, drawn by `Decorations (Behind)` / `Decorations (Above)` children of the render root (world text: inside the text's own batch) |
| Topology | follows the glyphs | `GeometryMapping` Glyph / Line / Range / Block |
| Paint | `Paint` default inherits the text fill; own swatch, gradient, texture; `Blend` | `PaintRef` plus projection (`Shape`, `Fit`, `Angle`, `Scale`, `PaintOffset`, `Spread`, `Blend`, `Tint`); `PaintMapping` frame independent of topology |
| Order | stacks at its position in `Styles`; `Overlay` raises the line **and its stroke/shadow/glow** above all text | `Order` Behind (default) / Above; draw priority among decorations by `Priority` |
| Fading | `<alpha>` and component alpha fade it; `<size>` scales thickness and offset | `<alpha>` does **not** fade it; component alpha does; `Hide()` hides it too |
| Cost | about one extra quad per glyph, multiplied by stacked stroke/shadow/glow layers | extra renderer surface and draw call(s) |

### UNDERLINE — Underline
- **Type:** `UnderlineModifier : BaseLineModifier` · **Tag:** `<u>` · **Markdown:** `++x++` · **Registered by:** P T S
- **Slots:**
  1. `paint` — optional leading token: hex, named color or swatch name from the provider; default = **inherit the text fill** (CSS `currentColor`).
  2. `style` — `solid` (default), `double`, `dotted`, `dashed`, `wavy`; prefix match (`dot`, `wa`).
  3. `thickness` — `UnitValue` `px` | `em`; `0` or omitted = the font's metric.
  4. `offset` — **plain float in em** (shift from the metric line position); a `px` suffix does not parse and the slot silently keeps its default.
  5. `skipInk` — bool, default false; splits the line around descenders.
  6. `blend` — `Inherit` (default), `Normal`, `Multiply`, `Screen`, `Additive`, `Exclusion`.
  7. `overlay` — bool, default false; raises the line and its stroke/shadow/glow layers above the whole text.
  The paint and style slots are peeked, so `<u=double>`, `<u=2px>` and `<u=#F00>` work without leading commas; a bare comma skips a slot explicitly.
- **Inspector-only:** `provider` (`IPaintProvider` resolving swatch names; null by default, so only inline colors and color names work until you assign one). **C# properties:** `Provider`, `Paint` (`PaintRef`), `Style` (`LineStyle`), `Thickness`, `Offset`, `SkipInk`, `Blend`, `Overlay`.
- **Behavior:** the line's position is the primary font's `underlineOffset` plus `offset`. Quads are cut from the font's `_` glyph SDF. Solid = per line fragment: left cap + one body quad per covered glyph + right cap (about glyph count + 2 quads); `double` = twice that; `dotted` uses the `•` glyph with one quad per `max(4.5 × thickness, mark + 1)` step; `dashed` one bar per step (mark = 3 × thickness); `wavy` one tile quad per wave period; `skipInk` splits segments around descenders (more quads). Every per-glyph layer (stroke, shadow, glow) multiplies these quads. The line splits across wrapped lines automatically and its thickness follows `<size>`.
- **Pitfalls:** **no `_` glyph in the text's primary font means no line, silently** (pixel and icon fonts); dotted also needs `•`. `offset` is em-only: the package's `UnderlineSlide` sample still shows `-4px`, which is ignored since 3.10.0 (write `-0.1`). Avoid non-solid styles on long runs. `<alpha>` and component alpha fade the line as well.
- **Mobile:** OK for solid; LIMIT for wavy/dotted/dashed/double on long runs (quad count, multiplied by layers).
- **Example:** `"<u=#4ECDC4,wavy,2px>misspelled</u>"`, `"<u=,double,3px,-0.1>"`, Markdown `"++new++"`; retune: `L.Style = LineStyle.Wavy; L.Thickness = UnitValue.Absolute(2); L.Offset = 0.05f; L.SkipInk = true; L.Paint = PaintRef.Solid(new Color32(78, 205, 196, 255));`

### STRIKE — Strikethrough
- **Type:** `StrikethroughModifier : BaseLineModifier` · **Tag:** `<s>` (the TMP vocabulary also binds `strikethrough`) · **Markdown:** `~~x~~` · **Registered by:** P T S
- **Slots:** the same seven as `UNDERLINE` (`paint`, `style`, `thickness`, `offset` em, `skipInk`, `blend`, `overlay`).
- **Inspector-only / C# properties:** the same as `UNDERLINE`.
- **Behavior:** same engine and quad cost as `UNDERLINE`; the line sits at the font's `strikethroughOffset`, or half x-height if the font has none.
- **Pitfalls:** same as `UNDERLINE` (needs the `_` glyph; offset in em; `~~` needs its own Markdown style).
- **Mobile:** OK for solid; LIMIT for non-solid long runs.
- **Example:** `"<s=#FF0000,solid,2px>$99.00</s> now <color=#2ECC71><b>$49.00</b></color>"`

### HIGHLIGHT — Highlight (background)
- **Type:** `HighlightModifier : BaseRangeDecorationModifier` · **Tag:** **none by default**; the name is yours (`mark`, `highlight`, `key`). The TMP vocabulary binds `mark`. · **Registered by:** T only (`mark`)
- **Slots:**
  1. `paint` — optional leading token (hex, color name, swatch); default paint `#3380FF66` (translucent blue).
  2. `geometryMapping` — `Glyph` | `Line` | `Range` (default) | `Block`.
  3. `paintMapping` — `InheritGeometry` (default) | `Glyph` | `Line` | `Range` | `TextBlock`.
  4. `shape` — paint projection: `Inherit` (default) | `Linear` | `Radial` | `Angular` | `Pattern`.
  5. `fit` — `Inherit` (default) | `Stretch` | `Contain` | `Cover` | `Tile`.
  6. `angle` — float; NaN = inherit from the weaker layer.
  7. `scale` — float; NaN = inherit.
  8. `paintOffset` — `Vector2` `x y` in one slot; NaN = inherit.
  9. `height` — `LineBox` (default) | `Content` | `LineAdvance`.
  10. `padding` — `UnitVector2` `x y`, `px` | `em`, field `0 0` em.
  11. `cornerRadius` — `UnitValue` `px` | `em`, field 0 em.
  12. `mergeThreshold` — `UnitValue` `px` | `em`, field 0; negative = use the corner radius.
  13. `order` — `Behind` (default) | `Above`.
  14. `tint` — `Color32`, field white; multiplies the paint.
  15. `blend` — `LayerBlend` (`Inherit` default).
  16. `spread` — `Inherit` | `Clamp` | `Repeat` | `Mirror`.
- **Inspector-only:** none beyond the slots. **C# properties:** `Presentation` (`HighlightPresentation`) and mirrors `Provider`, `Paint`, `GeometryMapping`, `PaintMapping`, `Shape`, `Fit`, `Angle`, `Scale`, `PaintOffset`, `Height`, `Padding`, `CornerRadius`, `MergeThreshold`, `Order`, `Tint`, `Blend` (no `Spread` mirror: use `Presentation.Spread`); base-class `Priority` (int, `RangeDecorationPriorities`: Interactive −10, Custom 0 = default, Selection 100, FindCurrent 200, Diagnostics 300).
- **Behavior:** `Glyph` = one rounded figure per cluster; `Line` = one per line or BiDi fragment; `Range` = fragments rounded only at the logical endpoints, other corners square; `Block` = one connected multi-line contour with no seams. `Height`: `LineBox` runs ascender to descender (visible gaps with line spacing above 1), `Content` is tight glyph ink, `LineAdvance` is the full line pitch with no gaps. `MergeThreshold` snaps adjacent-line edges together when they are closer than the value. Surfaces are batched per texture and blend: at least one extra draw call per side (Behind / Above), +1 per extra texture or blend. The default paint provider is `GlobalSettingsPaintProvider`, which reads the swatch asset assigned in the LightSide settings (`UniTextSettings.Paints`); inline colors work without it. The same `HighlightPresentation` renders live selection (`UniTextSelectable.SelectionHighlight`).
- **Pitfalls:** a transparent paint or tint draws nothing. `<alpha>` does not fade a highlight (component alpha does). The `Decorations (Behind|Above)` children belong to the render root: do not move or destroy them. `Glyph` mapping on long text produces many figures. Named swatches need the paint asset; hex always works.
- **Mobile:** LIMIT (extra renderer surface and draw call per side); AVOID `Glyph` mapping on long text.
- **Example:**
```csharp
text.Styles.Add(Style.Tag(new HighlightModifier {
    Paint = PaintRef.Solid(new Color32(255, 235, 59, 128)),
    Height = RangeHeight.Content }, "mark"));
text.Text = "Deliver the <mark>ancient key</mark> to the guard.";
```

---

## Math, tables, utility

### MATH — Math formulas
- **Type:** `MathModifier` + parse rule `MathParseRule` (priority 10) · **Tags:** rule `Delimiters`: `Tags` (default) = `<math>…</math>` (case-insensitive); `LatexInline` = `\(…\)`, `$…$` (Pandoc rule: `$20 and $30` stays text), `\ce{…}`, `\pu{…}`; `LatexDisplay` = `\[…\]`, `$$…$$` and the `equation`/`align`/`gather`/`multline`/`flalign`/`alignat`/`eqnarray` environments (each on a centred, numbered line) · **Registered by:** P (`MathParseRule`)
- **Slots:** none in markup.
- **Inspector-only:** `mathFont` (a `UniTextFont` with an OpenType **MATH** table, e.g. STIX Two Math; a missing or unusable font fails the whole text), `mode` (`Inline` default / `Display`). **C# properties:** `MathFont`, `Mode`.
- **Behavior:** a formula that fails to parse shows its source between bars and logs one warning per distinct formula.
- **Pitfalls:** heavy layout engine: static content only. LaTeX uses `\` and `$`, which collide with `BackslashEscapeRule` and with prices in chat text; do not enable `LatexInline` on general player text.
- **Mobile:** AVOID in HUD or per-frame text.
- **Example:** markup `Damage = <math>\frac{a}{b}</math>` (escape the backslash in a C# literal), with a `MathParseRule` using `Delimiters.Tags` and a MATH-table font assigned to the modifier.

### TABLE — Tables
- **Type:** `TableModifier` + `TabularParseRule` · **Tags:** LaTeX `tabular`, `tabular*`, `tabularx`, `tabulary`, `longtable` (plus `table` float and captions) · **Registered by:** `—`
- **Slots:** none in markup. **C# properties:** `RuleWidth`, `CellPadding`, `ParagraphAlignment`, `CaptionSpacing` (em).
- **Behavior:** typesets LaTeX tables as a layout engine.
- **Pitfalls:** pointer only; use real UI layout for game tables.
- **Mobile:** AVOID in game UI.
- **Example:** none needed (not for game UI).

### COMPOSITE — Composite
- **Type:** `CompositeModifier` · **Tag:** any rule (a graph node, bind it to a tag name yourself) · **Registered by:** `—`
- **Slots:** the parameter splits by **`;`**, one segment per child in child order; a nested composite takes `(a;b)`.
- **Inspector-only:** none. **C# properties:** `Modifiers` (`TypedList<BaseModifier>`; `.Add`, `.ReplaceAll(...)`); static `CompositeModifier.FindLeaf(root, type)`.
- **Behavior:** one tag drives several modifiers. The rule's `DefaultParameter` is merged per slot with the tag value.
- **Pitfalls:** every child needs its own fresh instance. The shipped link graph is a composite, so `<link=url;#3B82F6;solid>` splits per child.
- **Mobile:** OK.
- **Example:** `crit.Modifiers.ReplaceAll(new BaseModifier[] { new ColorModifier(), new SizeModifier(), new BoldModifier() }); preset.Styles.Add(Style.Tag(crit, "crit", "#FF3B30;140%;800"));` then `"<crit>512</crit>"`.

### EMPTY — Empty
- **Type:** `EmptyModifier` · **Tag:** any rule · **Registered by:** `—`
- **Slots / inspector-only / C# properties:** none.
- **Behavior:** a no-op that only marks ranges; read them with `GetModifier<EmptyModifier>().GetRanges(list)` without changing the look.
- **Pitfalls:** none.
- **Mobile:** OK.
- **Example:** `text.Styles.Add(Style.Tag(new EmptyModifier(), "marker"));`

### GRAPH — Modifier graph
- **Type:** `ModifierGraphModifier` / `ModifierGraphPreset` · **Tag:** any, e.g. `Style.Tag(new ModifierGraphModifier { Preset = linkPreset }, "link")` · **Registered by:** the shipped link preset via P and T
- **Slots:** as the root modifier of the graph (the shipped link preset root is a composite of Link, Color, Underline and highlight feedback).
- **Inspector-only:** none. **C# properties:** `Preset` (`ModifierGraphPreset`).
- **Behavior:** a shareable, modifier-only recipe (`LinkPreset`, `SpoilerPreset` ship in the package); each component gets its own runtime copy.
- **Pitfalls:** link and spoiler behavior is covered in [unitext-interaction-links.md](unitext-interaction-links.md).
- **Mobile:** OK.
- **Example:** see the link recipes in [unitext-interaction-links.md](unitext-interaction-links.md).

---

## Cross-cutting pitfalls

1. **Literal tags:** with no style registered, `<b>` prints as characters. "Formatting does nothing" means check the vocabulary first.
2. **Docs name ≠ working tag:** `sup`/`sub`, `li`, `indent`, `align`, `dir`, `arc`, highlight need your own registration; the spelling is whatever you pass to `Style.Tag(modifier, "name")`.
3. **One modifier instance per style.** A modifier holds a single owner; create a fresh instance per `Style`, or put the vocabulary in a `StylePreset` (each component works on its own copies).
4. **Cheapest channel for animation:** colour, alpha and tint are mesh-level; component `color.a` alone rebuilds nothing; size, spacing, line-height, list and indent changes re-shape or re-layout. Animate per range through the parameter API (`Own`) or a driver, see [unitext-range-state-rules.md](unitext-range-state-rules.md).
5. **`GetModifier<T>()` returns the first match and null when absent**; null-check before retuning, and retune both the tag and Markdown instance when both exist.
6. **Vocabulary cost:** every rule in the global and component presets is walked at every markup trigger in every component that reads it; keep the vocabulary to what the game uses, and switch `Use Global Style Preset` off for debug and log text.
7. **Markdown flanking:** `*`, `**`, `~~`, `++` follow CommonMark flanking (a non-space must touch the marker; `2 * 3` stays literal; `_` markers never open mid-word); `**` (priority 2) beats `*` (1). Markdown forms exist only if you register a `MarkdownWrapRule` style.
8. **Unclosed tag styles to the end of the text; `</b>` without an opener stays literal; `<b/>` produces U+FFFC;** values containing `,` or `>` need quotes.
9. **Version traps** (removed tags, renamed types, unit changes such as the em-only underline offset) are listed in [unitext-version-traps.md](unitext-version-traps.md); TMP value differences are in [unitext-tmp-migration.md](unitext-tmp-migration.md).

---

## Recipes

`preset` is a `StylePreset` (the vocabulary object, see the master rule's "Tag vocabulary bootstrap"); `text` is the `UniText`; `L` is `text.GetModifier<T>()`. Markup assumes the tags exist unless a recipe says otherwise.

### Vocabulary, safety, runtime control

- **One vocabulary for the whole game (editor).** Goal: every label understands `<b>`, `<color>`, … Setup: `Create → LightSide → UniText → Style Preset`, open it, press **+** and pick entries from the Common / Text Style / Decoration / Layout categories (the picker writes both source and modifier; Bold also offers Markdown `**`), then `Project Settings → LightSide → UniText → Global Style Preset` = that asset. Result: every component with *Use Global Style Preset* on (the default) understands the tags. Gotcha: the global slot is empty until you assign it; turn the toggle off on raw-log and debug text.
- **Safe user-generated text (chat, player names).** Goal: a player typing `<b>` or `**x**` cannot format your UI. Option A: render the field on a component with *Use Global Style Preset* off and no local styles (everything stays literal). Option B: register the protection rule and escape the input before concatenating: `text.AddRule(new BackslashEscapeRule());` then escape `\` as `\\` and every ASCII punctuation character as `\` + character. Gotcha: protection rules outrank every other rule; `BackslashEscapeRule` and LaTeX share `\`. See [unitext-markup-system.md](unitext-markup-system.md).
- **Toggle or swap a whole-text style at runtime.** `bool on = text.ToggleWholeText<BoldModifier>(); text.SetWholeText<ItalicModifier>("20"); text.ClearWholeText<ItalicModifier>();` Result: edits only the component's local `Styles`, never a preset asset.
- **Retune a style live (theme, accessibility scale).** `var u = text.GetModifier<UnderlineModifier>(); if (u != null) { u.Style = LineStyle.Wavy; u.Overlay = true; }` and `text.GetModifier<LineHeightModifier>().Scale = 1.5f` (null-check it). Result: a preset-sourced instance changes for this component only; editing the `StylePreset` asset itself reaches every component live. Per-range overrides without touching the default go through `L.Ranges().WhereLabel("alert").Own(ColorModifier.Param.Color)` (see [unitext-range-state-rules.md](unitext-range-state-rules.md)).

### Game text

- **Damage numbers and crits.** Markup: `text.Text = $"<size=130%><b><color=#FFD60A>-{dmg}</color></b></size>";` As one tag, using `COMPOSITE` defaults: `preset.Styles.Add(Style.Tag(crit, "crit", "#FF3B30;140%;800"));` with `crit` built as in the `COMPOSITE` block, then `text.Text = "<crit>512</crit>";`. Fade a pooled number without rebuilding the mesh: `text.color = new Color(1f, 1f, 1f, alpha);` and `text.Hide();` when done (keeps layout, mesh and atlas for reuse; `Show()` restores). Gotcha: per-frame `FontSize` or size changes re-lay out the text; animate only `color.a` or transforms.
- **Rarity item names with data-driven colours.** `preset.Styles.Add(Style.Tag(new ColorModifier(), "legendary", "#FF8000"));` then `<legendary>Fire Sword</legendary>`; `<legendary=#FFA500>` overrides for one name. Build strings from a `Dictionary<Rarity, string>` of tag names instead of inlining hex. For bold-and-coloured names make the style a composite `[Color, Bold]` with default `"#A335EE;700"`.
- **Dialogue emphasis.** `"She <i>whispered</i>, then <b><color=#FF6B6B>screamed</color></b>."` Typewriter reveal is another area ([unitext-animation-reveal-sequencer.md](unitext-animation-reveal-sequencer.md)).
- **Title card.** `"<cspace=0.08em><smallcaps>Dungeon Run</smallcaps></cspace>"`; no-tag form: `text.Styles.Add(Style.WholeText(new LetterSpacingModifier { Spacing = UnitValue.Em(0.08f) }, null)); text.Styles.Add(Style.WholeText(new SmallCapsModifier(), null));`. Gotcha: true small caps needs a font with `smcp`; otherwise uppercase at 0.8x is synthesized.
- **Sale price.** `"<s=#FF0000,solid,2px>$99.00</s> now <color=#2ECC71><b>$49.00</b></color>"`. Gotcha: the font needs an `_` glyph for the strike line.
- **HUD counters that do not jitter.** Fixed cells: `<cwidth=0.6em>0123</cwidth>` (never `auto` for changing numbers) or tabular figures `<feature=tnum>` / `text.Styles.Add(Style.WholeText(new FontFeatureModifier { Features = "tnum" }, null))` if the font has `tnum`. Keep a unit with its number: `<nobr>120 HP</nobr>`. Update with `text.SetText(stringBuilder)` (identical content is a no-op).

### Items, tooltips, chips

- **Tooltip with list, indent and paragraph gap.** `text.Text = "<b>Fire Sword</b>\n<li>+12 damage</li>\n<li>Burns for 3 s</li>\n<indent=1em><i>Ignites foes on hit.</i></indent>"; text.SetWholeText<ParagraphSpacingModifier>("0.4em");` Setup: `Style.Tag(new ListModifier(), "li")` (not in the picker). Markdown form needs `MarkdownListParseRule` + `ListModifier`: `"- +12 damage\n- Burns for 3 s\n  - nested"` (nest by 2 spaces). Ordered: `<li=0,1>One</li>\n<li=0,2>Two</li>`. Gotcha: items are separated by `\n` you write; `<br>` gets no paragraph gap.
- **Chemistry and exponents.** `"H<sub>2</sub>O"`, `"E = mc<sup>2</sup>"` after the two-rule composite from the `SCRIPT` block. `<sup>` uses OpenType `sups` when the primary font has the glyph, else scaled and raised.
- **Keycap chips and inline badges (highlight with your own tag).**
```csharp
text.Styles.Add(Style.Tag(new HighlightModifier {
    Paint = PaintRef.Solid(new Color32(60, 60, 70, 255)),
    GeometryMapping = GeometryMapping.Line,           // one rounded rect per line fragment
    Height = RangeHeight.Content,
    Padding = new UnitVector2(new Vector2(0.25f, 0.08f), UnitKind.Em),
    CornerRadius = UnitValue.Em(0.25f) }, "key"));
text.Text = "Press <nobr><key>Space</key></nobr> to jump";   // nobr keeps the chip on one line
```
  Result: a rounded chip behind the word (`Order` is `Behind` by default). Gotcha: it costs an extra renderer surface and draw call.
- **Find-in-page and search hits.** Use `MutableRangeSource` + `HighlightModifier` styles, set the ranges inside a `BeginUpdate … Commit` block, and give the current hit `Priority = RangeDecorationPriorities.FindCurrent`; the BasicUsage sample's `FindSlide.cs` shows `FindAll(query, StringComparison.OrdinalIgnoreCase, TextRange[])`. Ranges survive edits; see [unitext-range-state-rules.md](unitext-range-state-rules.md).

### Layout, overflow, scripts

- **Button and label overflow.** Single line: `text.WordWrap = false; text.Styles.Add(Style.WholeText(new EllipsisModifier(), null));` (end `...`; `Position = 0.5f` for the middle of file names) or `new TruncateModifier { FadeLength = UnitValue.Em(1.5f) }` for a soft fade without dots. Multi-line: with word wrap the text clamps to the lines that fit the **box height** and the last visible line ends in `...`. Gotcha: acts only when the content actually overflows the RectTransform.
- **RTL, CJK and locale.** Force direction with `text.SetWholeText<DirectionModifier>("RightToLeft")` (default `Auto` detects per paragraph); `<lang=ja>…</lang>` or `text.Language = "ja"` for Han glyph variants; `Start`/`End` alignment mirrors for RTL while `<align=Left>` pins physically; lists flip the marker side.
- **Furigana.** See the `RUBY` block example; leave top padding or a non-top `VerticalAlignment` so the first line's annotation is not clipped; `Position = RubyModifier.RubyPosition.Under` puts it below.
- **Justified paragraph with a centred last line.** `"<align=Justify,InterWord,Center>…long paragraph…</align>"` or the whole-text `AlignmentModifier` from the `ALIGN` block; CJK spaced setting uses `InterCharacter` (full name).
- **Curved badge label.** `text.Styles.Add(Style.Tag(new ArcModifier(), "arc")); text.Text = "<arc=140,Center>LEVEL UP</arc>";` with component `HorizontalAlignment = Center`; read `L.Sweep` (above 360 means it laps). For fixed ring artwork assign `Circle` a `RectPlacement` box instead (then `angle` and `origin` are unused). Gotcha: prefer static labels; animating `Angle` rebuilds meshes.
- **Optical vertical centring in a button.** `text.Styles.Add(Style.WholeText(new TextBoxTrimModifier { OverEdge = TextOverEdge.CapHeight, UnderEdge = TextUnderEdge.Baseline }, null)); text.VerticalAlignment = VerticalAlignment.Middle;` All-caps labels centre on the capitals; for a single glyph in a tile use `Ink` / `Ink`.
- **Mixed fonts with matched x-height.** `text.Styles.Add(Style.WholeText(new FontSizeMatchModifier { Metric = FontNormalizeMetric.XHeight }, null));` so a CJK or Arabic fallback does not look larger than the Latin primary; the project-wide switch is `UniTextSettings.FontNormalizeMetric`.
- **Per-word font and weight.** `<font=header><b=800>TITLE</b></font>`: `<font>` takes a `FontFamily.name` from the component's FontStack (case-sensitive) and `<b>` then resolves the bold face or axis inside that family.

---

## Unverified

- **Bare numbers in em-default fields** (`wspace`, `indent`, highlight padding and radius, truncate fade): the rule "a suffix-less number takes the field's unit" is read from the parameter parser, not run; `IndentModifier`'s XML doc says "`20` or `20px`", which contradicts it. Always write units.
- **`<size=1.5em>`:** `SizeModifier` has no `Em` branch in its apply code (read from source), so it is treated as px; not run.
- **`<feature=-kern,+dlig>`:** docs and changelog say several comma-separated settings work, the string parameter reads one comma slot; needs a runtime test. Use one feature per tag.
- **`<i=0>`:** whether a zero synthetic shear intentionally forces upright over a real italic face is inferred from the encoding.
- **`<b>` plus `<var=…>` on one run:** source shows the bold request overwriting the `wght` value when real weight is allowed; the on-screen result was not observed.
- **`<var=700>` with later slots empty:** whether axes 2–5 stay at the font's configured defaults or take the field defaults (400/100/0/0/12 apply for a bare `<var>`) was not run.
- **`<mark=#RRGGBBAA>`:** the TMP-migration mapping says the tag value is ignored, while `HighlightModifier` reads a leading paint token; whether the value colours the highlight is unconfirmed. Set colors on the style entry or in C#.
- **`<crit=#FFFFFF>` override** of a composite default with one segment: presumably replaces only the first child's slot (the colour); not run.
- **Bare `<line-height>`:** height 0 means no nudge (read from `OnApply`), mode and leading from the field are still recorded; not run.
- **Component alpha final composite:** the shader's last multiplication of vertex colour with the CanvasRenderer colour was not read.
- **Shipped default fonts and OpenType features:** whether the package's default font carries `smcp`, `tnum`, `sups` (checked at runtime against the primary font) and the default `UniTextFont.FakeBoldWeight` value were not inspected.
- **Sharing one modifier instance across components or styles:** assumed unsupported from the single-owner fields; no explicit guard was found.


