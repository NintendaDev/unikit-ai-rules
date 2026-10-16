# UniText — Formatting modifiers and tags quick reference

> **Base path:** `<UniTextRoot>` is the folder of the UniText package — the one whose `package.json` has `"name": "media.lightside.unitext"` (find it with `Glob **/media.lightside.unitext/package.json`; it may sit under `Packages/` or `Library/PackageCache/`). Never hard-code its location.
> See also: [unitext-formatting-tags-full.md](unitext-formatting-tags-full.md) (one block per modifier, recipes), [unitext-markup-system.md](unitext-markup-system.md) (rules, parse priority, escaping), [unitext-components-setup.md](unitext-components-setup.md) (component and style presets), [unitext-runtime-api.md](unitext-runtime-api.md), [unitext-fonts.md](unitext-fonts.md), [unitext-effects-paint.md](unitext-effects-paint.md), [unitext-tmp-migration.md](unitext-tmp-migration.md), [unitext-performance-mobile.md](unitext-performance-mobile.md)

---

**No tag is built in.** A fresh `UniText` has no styles and the package ships no global style preset, so `<b>` prints as literal characters until a `Style` (a `TagRule("b")` source plus a `BoldModifier`) exists on the component, in a `StylePreset` on the component, or in `UniTextSettings.GlobalStylePreset`. Every tag spelling in this file is a convention you register. For the full bootstrap see the master rule `unitext.md`, section "Tag vocabulary bootstrap", and [unitext-markup-system.md](unitext-markup-system.md). The whole-text and C# forms below need no vocabulary at all, so they are the safest path for text built in code.

**Mobile verdicts** (`OK` / `LIMIT` / `AVOID`) come from reading source and docs; nothing was profiled.

## 1. Cheat sheet — "how do I make text bold / italic / …"

### 1.1 Which form needs which registration

| Form | Example | Needs |
|---|---|---|
| Tag | `<b>x</b>` | A style with `TagRule` + the modifier, in local `Styles`, a component `StylePresets` entry, or the global preset. The tag spelling is whatever you register (ASCII case-insensitive on use). |
| Markdown wrap | `**x**` | A separate style with `new MarkdownWrapRule { Marker = "**" }` + the modifier. Registering the `<b>` tag does not enable `**`. |
| Markdown list | `- x`, `1. x` | `MarkdownListParseRule` + `ListModifier` style. |
| Whole text, no markup | `text.SetWholeText<BoldModifier>("700")` | Nothing. Adds a local whole-text style; the string is the same token form a tag value uses. Also `ClearWholeText<T>()`, `ToggleWholeText<T>(param)`. Edits only the component's local `Styles`, never preset assets. |
| Fixed range | `Styles.Add(Style.Range(m, start, end, "700"))` | Nothing. Indices are codepoints of the rendered text, `end` exclusive. |
| Component property | `text.color`, `FontSize`, `HorizontalAlignment`, `Language`, `Font` | Nothing (properties of the component itself). |
| Live retune | `text.GetModifier<BoldModifier>().Weight = 800` | A style of that type already exists on the component or its presets; otherwise `GetModifier` returns `null`. It returns the **first** match: a tag style and a Markdown style of the same modifier type are two instances, retune both. |
| Inspector toggle buttons | B I / U L SC cspace / U S | Editor only (whole-text styles). |

Special wiring: `<ruby>` needs `RubyParseRule` + `RubyModifier`; `<sup>`/`<sub>` need one `ScriptPositionModifier` + a `CompositeParseRule` of two `TagRule`s; highlight has no default tag name; `<curve>`, `<trim>`, `<sizematch>` are wired nowhere and `<dir>`, `<arc>` appear only in the docs' tag table, so register any of them yourself (direction, trim and size-match are whole-text styles and need no tag).

Notation below: `T` = the `UniText`/`UniTextWorld` instance; `L` = `T.GetModifier<XModifier>()`; `Range(m, s, e, "p")` = `T.Styles.Add(Style.Range(m, s, e, "p"))`; `Whole<X>("p")` = `T.SetWholeText<X>("p")`.

### 1.2 Text style

| Effect | Tag | Markdown | No markup: whole text / range / component | Retune default on `L` |
|---|---|---|---|---|
| **Bold** | `<b>`, `<b=700>`, `<b=900>`, `<b=700,f>` force synthetic, `<b=700,r>` real face only; variable-font alt `<var=700>` | `**x**` | `Whole<BoldModifier>()`, `Whole<BoldModifier>("700,r")`; `Range(new BoldModifier(), s, e, "700")` | `L.Weight = 800; L.Mode = BoldMode.Real;` (0 = auto) |
| **Italic** | `<i>`, `<i=20>` shear % of height, `<i=-15>` back-slant, `<i=f>` font slant, `<i=r>` real face only; variable alt `<var=~,~,1>` (ital) / `<var=~,~,~,-12>` (slnt) | `*x*` | `Whole<ItalicModifier>("20")`; `Range(new ItalicModifier(), s, e)` | `L.Mode = ItalicMode.Synthetic; L.Slant = 20;` |
| **Uppercase** | `<upper>x</upper>` | – | `Whole<UppercaseModifier>()` (keeps the source string unchanged); `Range(new UppercaseModifier(), s, e)` | – (no slots) |
| **Lowercase** | `<lower>x</lower>` | – | `Whole<LowercaseModifier>()` | – |
| **Small caps** | `<smallcaps>Mixed Case</smallcaps>` | – | `Whole<SmallCapsModifier>()` | – |
| **Superscript / subscript** | `x<sup>2</sup>`, `H<sub>2</sub>O` (needs the two-rule composite) | – | `Whole<ScriptPositionModifier>("sub")` (token `super` or `sub`); `Range(new ScriptPositionModifier(), s, e, "super")` | `L.Mode = ScriptPositionModifier.Placement.Sub;` |
| **Ruby / furigana** | `<ruby>漢字<rt>かんじ</rt></ruby>`, `<ruby=かんじ>漢字</ruby>` (needs `RubyParseRule` + `RubyModifier` style) | – | `Range(new RubyModifier(), s, e, "かんじ")` | `L.RubyScale = 0.5f; L.Align = RubyModifier.RubyAlign.SpaceAround; L.Position = RubyModifier.RubyPosition.Over;` |
| **Colored** | `<color=#FF8800>`, `<color=red>`, `<color=#F80>`, `<color=#FF880080>`; custom name `Style.Tag(new ColorModifier(), "warning", "#FF0000")` | – | **component** `T.color = Color.red` (RGB change rebuilds the mesh); `Whole<ColorModifier>("#FF0000")`; `Range(new ColorModifier(), 0, 5, "#FF0000")` | `L.Color = new Color32(255, 136, 0, 255);` (bare `<color>` = white) |
| **Sized** | `<size=24>`, `<size=150%>`, `<size=+10>`, `<size=-5>`; never `em` | – | **component** `T.FontSize = 24` (+ `AutoSize`, `MinFontSize`/`MaxFontSize`); `Whole<SizeModifier>("150%")`; `Range(new SizeModifier(), s, e, "60%")` | `L.Size = UnitValue.Percent(150);` |
| **Semi-transparent** | `<alpha=0.5>`, `<alpha=50%>`, `<alpha=#80>`; bare `<alpha>` = 0.5; or colour alpha `<color=#FFFFFF80>` | – | **component** `T.color = new Color(1, 1, 1, 0.4f)` fades everything (glyph layers, emoji, sprites, decorations) with no mesh rebuild: the right channel for fades; `Whole<AlphaModifier>("0.5")`; `Range(new AlphaModifier(), s, e, "30%")` | `L.Alpha = 0.3f;` |
| **Font family** | `<font=header>x</font>` (name = `FontFamily.name` in the FontStack, case-sensitive) | – | `Whole<FontModifier>("header")`, or component `Font` / `FontStack` | `L.FamilyName = "mono";` |
| **Language (CJK `locl`)** | `<lang=ja>x</lang>` | – | component `T.Language = "ja"`; `Whole<LanguageModifier>("ja")` | `L.Language = "ja";` |
| **OpenType features** | `<feature=tnum>`, `<feature=-liga>`, `<feature=ss01 2>`, `<feature=kern 0>` (one feature per tag) | – | `Styles.Add(Style.WholeText(new FontFeatureModifier { Features = "tnum, -liga" }, null))` | `L.Features = "tnum";` |
| **Variable axes** | `<var=700>`, `<var=150%>`, `<var=+200>`, `<var=700,80>`, `<var=~,~,~,-12>` | – | `Whole<VariationModifier>("600,90")` | `L.Weight = UnitValue.Absolute(600);` |

### 1.3 Decoration

| Effect | Tag | Markdown | No markup | Retune default on `L` |
|---|---|---|---|---|
| **Underlined** | `<u>x</u>`, `<u=#FF0000>`, `<u=wavy>`, `<u=#4ECDC4,wavy,2px>`, `<u=,double,3px,-0.1>` | `++x++` | `Whole<UnderlineModifier>()`; `Range(new UnderlineModifier(), s, e, "red,wavy")` | `L.Style = LineStyle.Wavy; L.Thickness = UnitValue.Absolute(2); L.Offset = 0.05f; L.SkipInk = true; L.Overlay = true; L.Paint = PaintRef.Solid(c);` |
| **Strikethrough** | `<s>x</s>`, `<s=#FF0000,solid,2px>`; `<strikethrough>` only in the TMP vocabulary | `~~x~~` | `Whole<StrikethroughModifier>()` | same properties as underline |
| **Highlighted** (background) | **no default tag**; you pick the name: `<mark>x</mark>`, `<mark=#FFEB3B80>`, `<mark=#FFEB3B80,Block>` | none | `Styles.Add(Style.WholeText(new HighlightModifier { … }, null))`; `Range(highlight, s, e)`; `MutableRangeSource` + `Style.FromSource` for search hits | `L.Paint`, `L.Tint`, `L.GeometryMapping`, `L.CornerRadius`, `L.Padding`, `L.Order`, `L.Height`, `L.Priority` |

### 1.4 Spacing and layout

| Effect | Tag | Markdown | No markup | Retune default on `L` |
|---|---|---|---|---|
| **Letter-spaced** | `<cspace=8>`, `<cspace=0.25em>`, `<cspace=-1>` | – | `Whole<LetterSpacingModifier>("0.05em")` | `L.Spacing = UnitValue.Em(0.05f);` |
| **Monospaced cells** | `<cwidth=auto>`, `<cwidth=1em>`, `<cwidth=0.5em>` | – | `Whole<CharacterWidthModifier>("auto")` | `L.Width = UnitValue.Em(0.6f);` |
| **Word gaps** | `<wspace=0.8em>` | – | `Whole<WordSpacingModifier>("0.2em")` | `L.Spacing = UnitValue.Em(0.2f);` |
| **Line height** | `<line-height=160%>`, `<line-height=52>` (px), `<line-height=+8>`, `<line-height=,primary>`, `<line-height=,scaled,1.5>` | – | `Styles.Add(Style.WholeText(new LineHeightModifier { Mode = LineHeightMode.Scaled, Scale = 1.3f }, null))` | `L.Mode`, `L.Scale`, `L.HeightValue`, `L.Leading` |
| **Paragraph gap** | `<pspace=18>`, `<pspace=1em,0.5em>`, `<pspace=,4>` | – | `Whole<ParagraphSpacingModifier>("0.5em")` | `L.After = UnitValue.Em(0.5f);` |
| **Indented** | `<indent=2em>`, `<indent=8%>` | – | `Range(new IndentModifier(), s, e, "2em")` | `L.Indent = UnitValue.Em(2f);` |
| **Aligned** | `<align=Center>x</align>`, `<align=c>`, `<align=Justify,InterCharacter,Center>` | – | **component** `T.HorizontalAlignment` / `VerticalAlignment` (the base); per paragraph via `AlignmentModifier` | `L.Align`, `L.Justify`, `L.LastLine` |
| **Listed** (bullets / numbers) | `<li>x</li>`, `<li=1>` nested bullet, `<li=0,1>` ordered #1, `<li=0,3,★>` custom marker (tag must be wired) | `- x`, `* x`, `+ x`, `1. x`, `1) x` (nest by 2 spaces) | – | `L.MarkerPlacement = ListMarkerPlacement.Outside;` |
| **Ellipsis / cut** (`...` / no dots) | `<ellipsis=1>x</ellipsis>`, `<truncate=0.5>` | – | `Styles.Add(Style.WholeText(new EllipsisModifier(), null))` | `L.Position = 0.5f;` (truncate: `L.FadeLength = UnitValue.Em(1f);`) |
| **No break** | `<nobr>four five six</nobr>` | – | `Range(new NoBreakModifier(), s, e)` | – |
| **RTL / base direction** | `<dir=RightToLeft>` only if you wire a tag | – | `Whole<DirectionModifier>("RightToLeft")`, `ClearWholeText<DirectionModifier>()` | `L.Direction = TextDirection.RightToLeft;` |

## 2. Modifier table

**ID** = the block heading in [unitext-formatting-tags-full.md](unitext-formatting-tags-full.md). Open only the blocks you need: `Grep "^### BOLD " -A 40` (keep the trailing space so `SIZE` does not match `SIZEMATCH`; every block fits in 40 lines after its heading). The same file ends with `## Cross-cutting pitfalls`, `## Recipes` and `## Unverified`. Every block lists the C# type, tag forms, every slot, inspector-only fields, C# properties, behavior, pitfalls and an example.

**Registered by** (none of these is automatic: you still add the style):
`P` offered by the editor Styles picker · `T` included in the TMP-migration vocabulary preset (Migration window, "Markup vocabulary" card) · `S` wired in the package's BasicUsage sample (`<UniTextRoot>/Samples~/BasicUsage`) · `doc` the name appears in the package docs only · `—` wired nowhere: register it yourself with a spelling you choose · `whole` whole-text or range style, no tag.

**Slots** are comma-separated and positional in the order shown; `field` = the modifier's inspector default, used by a bare tag or an empty slot; `px`/`em`/`%`/`delta` = accepted units (see section 4).

### 2.1 Text style

| ID | Tag · registered by | What it does | Slots (order · unit · default) | Mobile |
|---|---|---|---|---|
| `BOLD` | `<b>`, Markdown `**` · P T S | Bold: real face first (static cut, `wght` axis, OS cut), synthetic dilate fallback | 1 `weight` int 1–1000, 0/omitted = auto (≥700) · 2 `mode` `f` synthetic, `r` real | OK (synthetic = shader dilate); LIMIT many distinct weights on a variable font (one atlas instance each) |
| `ITALIC` | `<i>`, Markdown `*` · P T S | Italic: real cut or axis first, synthetic vertex shear fallback | 1 `style` empty = auto, integer = shear % of height (−100…100), `f` font slant, `r` real only | OK (vertex shear) |
| `UPPER` | `<upper>` · P T S (TMP: `uppercase`, `allcaps` · T) | Uppercase via simple Unicode case map before shaping | none | OK |
| `LOWER` | `<lower>` · P T S (TMP: `lowercase` · T) | Lowercase, same mechanism | none | OK |
| `SMALLCAPS` | `<smallcaps>` · P T S | OpenType `smcp` if the primary font has it, else uppercase at 0.8x | none | OK |
| `SIZE` | `<size>` · P T S | Resizes the range relative to the component font size | 1 `size` px (field 24 px), `%`, `+n`/`-n` delta; **no em** | OK |
| `FONT` | `<font>` · P T S | Switches the range to a FontStack family by name | 1 `familyName` string, case-sensitive | OK |
| `LANG` | `<lang>` · P; sample slides | Sets the BCP 47 language for `locl` glyph variants | 1 `language` string (field `en`) | OK |
| `VAR` | `<var>` · P T (TMP `font-weight` = first slot · T) | Direct variable-font axes, no synthetic fallback | 1 wght · 2 wdth · 3 ital · 4 slnt · 5 opsz; abs/`%`/delta; `~` or empty skips; fields 400/100/0/0/12 | LIMIT: one atlas instance per distinct axis set (≤255 per text) |
| `FEATURE` | `<feature>` · P | OpenType feature settings (`tnum`, `-liga`, `ss01 2`) | 1 `features` string, one feature per tag (field `kern 0`) | OK (shaping only) |
| `MAT` | `<mat>` · P | Draws the range with a custom material | 1 `tint` colour | LIMIT: own sub-mesh and renderer, extra draw call |
| `GLYPHRES` | `whole` | Raises SDF tile resolution for the range | 1 `resolutionBoost` int 0–2 | AVOID broad use: +1 ≈ 4x tile memory, +2 ≈ 16x |
| `RUBY` | `<ruby>`, `<rt>`, `<rp>` · S (needs `RubyParseRule`) | Ruby annotation over or under the base text | reading comes from `<rt>` or `<ruby=reading>` | OK |
| `SCRIPT` | `<sup>`, `<sub>` · T (two styles), S (composite) | Superscript / subscript (native `sups`/`subs` or scaled and shifted) | 1 `mode` `super`/`sup`/`sub` (field `Super`) | OK |

### 2.2 Appearance

| ID | Tag · registered by | What it does | Slots (order · unit · default) | Mobile |
|---|---|---|---|---|
| `COLOR` | `<color>` · P T S | Overwrites the glyph vertex colour; emoji and sprites keep theirs | 1 `color`: `#RGB`, `#RRGGBB`, `#RRGGBBAA`, or a name (field white) | OK |
| `ALPHA` | `<alpha>` · P T | Multiplies glyph opacity for the range (layers, underlines, emoji, sprites; not highlights) | 1 `alpha` `0.5`, `50%` or `#80` (field 0.5) | OK (vertex alpha) |

### 2.3 Layout

| ID | Tag · registered by | What it does | Slots (order · unit · default) | Mobile |
|---|---|---|---|---|
| `CSPACE` | `<cspace>` · P T S | Letter spacing | 1 `spacing` px/em (field 0.3 px) | OK |
| `CWIDTH` | `<cwidth>` (TMP `mspace`) · P T S | Fixed character cells | 1 `width` px/em, `auto` or ≤0 = widest glyph of the range | OK |
| `WSPACE` | `<wspace>` · P S | Word spacing (only U+0020 and U+00A0) | 1 `spacing` px/em (field **0.25 em**) | OK |
| `LINEHEIGHT` | `<line-height>` · P T S | Line height nudge or mode | 1 `heightValue` `%`/em = multiplier, bare number = px, `+n` delta · 2 `mode` content/primary/scaled · 3 `scale` float (field 1.2) · 4 `leading` halfLeading/leadingAbove/leadingBelow | OK |
| `PSPACE` | `<pspace>` · P S | Space after/before a paragraph (`\n`-separated, not `<br>`) | 1 `after` · 2 `before`, each px/`%`/em (field 0) | OK |
| `LINEGAP` | `whole` (LaTeX rule) | Space below the line holding the range end | 1 `gap` px/`%`/em | OK |
| `NOBR` | `<nobr>` · P T S | No soft or CJK break inside the range | none | OK |
| `SEP` | `<sep>` void tag · P S (needs `SeparatorParseRule`) | Separator string between runs; each run stays whole across wraps | 1 per-occurrence separator string (rule default: space, bar, space) | OK |
| `ELLIPSIS` | `<ellipsis>` · P S | Replaces overflowing text with `...` | 1 `position` float 0–1 (1 end = field, 0 start, 0.5 middle) | OK |
| `TRUNCATE` | `<truncate>` · P S | Cuts overflowing text with no dots, optional fade into the cut | 1 `position` as above; inspector `fadeLength`, `fadeOffset` | OK |
| `LIST` | `<li>` · S; Markdown list · P | Bullet or numbered item with indent | 1 `level` int (0) · 2 `number` int (−1 = bullet) · 3 `marker` string | OK |
| `INDENT` | `<indent>` (TMP `line-indent`, `margin-left`) · T S | Line-start margin, nested adds | 1 `indent` px/em/`%` (field **1 em**) | OK |
| `ALIGN` | `<align>` · T S | Per-paragraph alignment and justification | 1 `align` Start/Center/End/Justify/Left/Right · 2 `justify` Auto/InterWord/InterCharacter/None · 3 `lastLine` Auto/Start/End/Center/Justify | OK |
| `DIR` | `doc` (`dir`), whole-text only | Base text direction | 1 `direction` LeftToRight/RightToLeft/Auto (field Auto); no `rtl` | OK |
| `TRIM` | `—` whole-text | CSS-like text-box-trim for optical centring | 1 `overEdge` Ascent/CapHeight/HalfLeading/Text/XHeight/Ink · 2 `underEdge` Descent/Baseline/HalfLeading/Text/Ink | OK |
| `SIZEMATCH` | `—` whole-text | Matches fallback fonts' x-/cap-height to the primary | 1 `metric` None/XHeight/CapHeight · 2 `target` float (0 = primary font) | OK |
| `ARC` | `doc` (`arc`) | Bends the range along a circular arc | 1 `angle` −360…360° (field 90) · 2 `origin` Alignment/Left/Center/Right | LIMIT: per-glyph placement, rebuilt with layout; do not animate per frame |
| `CURVE` | `—` | Lifts glyphs along an easing curve | 1 `height` px (field 40) | LIMIT (as `ARC`) |

### 2.4 Decoration

| ID | Tag · registered by | What it does | Slots (order · unit · default) | Mobile |
|---|---|---|---|---|
| `UNDERLINE` | `<u>`, Markdown `++` · P T S | Virtual-glyph line in the text mesh cut from the font's `_` glyph | 1 `paint` (hex/name/swatch, default = text fill) · 2 `style` solid/double/dotted/dashed/wavy · 3 `thickness` px/em (0 = font) · 4 `offset` plain float **em** · 5 `skipInk` bool · 6 `blend` · 7 `overlay` bool | OK solid; LIMIT wavy/dotted/dashed/double on long runs (many quads, multiplied by stroke/shadow/glow layers) |
| `STRIKE` | `<s>`, Markdown `~~` · P T S (TMP: `strikethrough` · T) | Strikethrough, same engine and slots as `UNDERLINE` | same 7 slots | same |
| `HIGHLIGHT` | no default tag, you pick the name; TMP vocabulary binds `mark` · T | Background shapes behind (or above) the range | 16 slots: 1 `paint` · 2 `geometryMapping` Glyph/Line/Range/Block · 3 `paintMapping` · 4 `shape` · 5 `fit` · 6 `angle` · 7 `scale` · 8 `paintOffset` · 9 `height` LineBox/Content/LineAdvance · 10 `padding` `x y` px/em · 11 `cornerRadius` px/em · 12 `mergeThreshold` · 13 `order` Behind/Above · 14 `tint` · 15 `blend` · 16 `spread` | LIMIT: extra renderer surface and draw call(s); AVOID `Glyph` mapping on long text |

### 2.5 Math, tables, utility

| ID | Tag · registered by | What it does | Slots / setup | Mobile |
|---|---|---|---|---|
| `MATH` | `<math>…</math>` · P (`MathParseRule`) | LaTeX-style formulas | needs a font with an OpenType MATH table | AVOID in HUD or per-frame text (heavy layout engine) |
| `TABLE` | LaTeX `tabular` (`TabularParseRule`) | Tables | – | AVOID in game UI |
| `COMPOSITE` | graph node, any tag | One tag drives several modifiers; value split by `;` per child | `<crit=#FF3B30;140%;800>` | OK |
| `EMPTY` | any rule | No-op modifier that only marks ranges | – | OK |
| `GRAPH` | `Style.Tag(new ModifierGraphModifier { Preset = … }, "link")` | Shareable modifier recipe asset (the shipped link and spoiler presets) | – | OK |

Not covered here: paint layers (`FillModifier`, `StrokeModifier`, `ShadowModifier`, `GlowModifier`, `InnerShadowModifier`, `ExtrudeModifier`) → [unitext-effects-paint.md](unitext-effects-paint.md); links, spoilers, trigger words → [unitext-interaction-links.md](unitext-interaction-links.md); `obj`/`sprite` inline media → [unitext-inline-media.md](unitext-inline-media.md); `reveal` and wave tags → [unitext-animation-reveal-sequencer.md](unitext-animation-reveal-sequencer.md), [unitext-animation-phase.md](unitext-animation-phase.md).

## 3. Named colors (case-insensitive, 21 names)

| Name | Hex | Name | Hex | Name | Hex |
|---|---|---|---|---|---|
| `white` | `#FFFFFF` | `black` | `#000000` | `red` | `#FF0000` |
| `green` | `#008000` | `blue` | `#0000FF` | `yellow` | `#FFFF00` |
| `cyan` | `#00FFFF` | `magenta` | `#FF00FF` | `orange` | `#FFA500` |
| `purple` | `#800080` | `gray` | `#808080` | `grey` | `#808080` |
| `lime` | `#00FF00` | `brown` | `#A52A2A` | `pink` | `#FFC0CB` |
| `navy` | `#000080` | `teal` | `#008080` | `olive` | `#808000` |
| `maroon` | `#800000` | `silver` | `#C0C0C0` | `gold` | `#FFD700` |

`green` is the dark CSS green; the bright one is `lime`. The package docs list 20 names; `grey` is the extra alias. Use hex for exact brand colors. Color tokens also accept `#RGB`, `#RRGGBB`, `#RRGGBBAA`; the 4-digit `#RGBA` form is not supported and tags do not parse `rgb(...)`.

## 4. Unit rules and parameter-grammar traps

### 4.1 Units

- Suffixes: `px` (or `abs`) = absolute pixels, `%` = percent, `em` = font-size multiples, `delta` = relative change.
- **A suffix-less number takes the unit of the modifier field's current value** (the inspector default). A signed suffix-less number (`+10`, `-5`) is a delta only when that field unit is absolute.
- **Always write units** on spacing, indent, padding and radius values. Bare numbers silently mean different things per modifier:

| Modifier | Bare number means | Notes |
|---|---|---|
| `SIZE` | px | `%`, `+n`/`-n` delta; **`<size=1.5em>` is read as 1.5 px**, never write em |
| `CSPACE` | px | em with suffix |
| `CWIDTH` | px | `auto`, `1em`, `0.5em` |
| `WSPACE` | em (field `Em(0.25)`) | |
| `INDENT` | em (field `Em(1)`) | `%` is of the RectTransform width |
| `LINEHEIGHT` | **absolute px** | `150%` or `1.5em` = multiplier of the line advance; `+8` delta px |
| `PSPACE` | px | `%`/em = fraction of font size |
| `UNDERLINE` / `STRIKE` thickness | px | offset is **always plain em** (see below) |
| `HIGHLIGHT` padding / radius | em | |
| `TRUNCATE` `fadeLength` | em | |

- Underline/strike `offset` (slot 4) is a plain float in ems: `<u=,,,-4px>` does not parse and silently keeps the default. Write `<u=,,,-0.1>`.

### 4.2 Parameter grammar

1. Slots are comma-separated and positional. `;` splits one value per child of a `CompositeModifier` (nested group `(a;b);c`). An empty slot keeps the default (`<pspace=,4>` sets only `before`); a `~` or an unparsable token also falls through to the field value.
2. A value that contains `,` or `>` must be quoted (`"…"` or `'…'`); `\,` escapes a comma. `""` sets an empty string, a bare empty slot means "absent".
3. Numbers are invariant-culture floats, magnitude up to 1e7 (larger = unparsable); `int` slots accept no decimals.
4. Enum tokens match the member name case-insensitively, or one character if its initial is unique among the members: `<align=c>` works, but `InterCharacter` needs the full name (`i` collides with `InterWord`). `<dir=rtl>` and `ltr` are not recognised (use `RightToLeft` or `r`).
5. Bool tokens accept prefixes of `true|yes|on|1` and `false|no|off|0`.
6. Paint tokens (leading slot of underline, strike, highlight): hex literal, a swatch name from the paint provider, or a named color. The leading paint slot and the `style` slot are peeked, so `<u=double>`, `<u=2px>`, `<u=#F00>` work without leading commas; a bare comma skips explicitly.
7. Vector slots (highlight `padding`, `paintOffset`) take two numbers separated by a space inside one slot, e.g. `0.1em 0.06em`. Highlight `padding` is slot 10, so reaching it from a tag needs a long run of empty slots; set rarely used highlight slots through the C# properties (`Padding`, `PaintOffset`) instead.
8. Cascade, weak to strong: modifier field → rule default (`TagRule.DefaultParameter`, merged per slot) → markup token (tag wins over the rule default) → owned value set through the parameter API.
9. Bare tags use field defaults that are rarely what you want:

| Bare tag | Applies |
|---|---|
| `<size>` | 24 px |
| `<cspace>` | 0.3 px |
| `<alpha>` | 0.5 |
| `<color>` | white |
| `<var>` | wght 400, wdth 100, ital 0, slnt 0, opsz 12 (all five) |
| `<indent>` | 1 em |
| `<wspace>` | 0.25 em |
| `<arc>` | 90° |
| `<curve>` | 40 px |
| `<ellipsis>` | end (position 1) |

10. An unclosed tag runs to the end of the text; `</b>` without an opener stays literal; `<b/>` on a non-void tag inserts U+FFFC (object replacement character).
11. `<br>` is a **soft** line break (same paragraph); only `\n` starts a paragraph for `pspace`, `align` and `li` item separation.
12. Spellings are conventions: `lh` (line-height) and `<letter-spacing>` appear in old comments or docs but are not wired; the `cspace` second token `,true` (monospace) was removed, use `<cwidth=auto>`.
