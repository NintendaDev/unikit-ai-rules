# UniText — Layout, alignment, auto size and large documents

> **Base path:** `<UniTextRoot>` is the folder of the UniText package — the one whose `package.json` has `"name": "media.lightside.unitext"` (find it with `Glob **/media.lightside.unitext/package.json`; it may sit under `Packages/` or `Library/PackageCache/`). Never hard-code its location.
> See also: [unitext-components-setup.md](unitext-components-setup.md), [unitext-runtime-api.md](unitext-runtime-api.md), [unitext-markup-system.md](unitext-markup-system.md), [unitext-formatting-tags-quickref.md](unitext-formatting-tags-quickref.md), [unitext-fonts.md](unitext-fonts.md), [unitext-tmp-migration.md](unitext-tmp-migration.md), [unitext-input-fields.md](unitext-input-fields.md), [unitext-3d-text.md](unitext-3d-text.md), [unitext-performance-mobile.md](unitext-performance-mobile.md), [unitext-version-traps.md](unitext-version-traps.md)

---

Everything is in namespace `LightSide`. Mobile verdicts (`OK` / `LIMIT` / `AVOID`) come from reading the package source and docs; nothing was profiled and no measured figures are quoted.

**No tag name is wired to an effect by default.** A fresh component understands no tags; the package ships prefabs with empty `styles` and `UniTextSettings` with no global style preset. Every tag below needs a registration. The "Registration" column uses these words:

- **picker** — a ready preset in the component's `Styles` `+` menu; choosing it registers the tag on that one component. To make it project-wide, put the style into a `StylePreset` assigned as the Global Style Preset.
- **code/preset** — not offered by the picker; register it with `Style.Tag(new XModifier(), "name")` in code or add the style to a `StylePreset`. The tag name is your choice; the spelling shown is the convention.
- **whole-text** — meant to be applied to the whole text with `Style.WholeText(modifier)` or `text.SetWholeText<T>(...)`; no tag is normally used.
- **TMP vocab** — also created by the markup-vocabulary card of the TMP migration window.

Full bootstrap of a tag vocabulary: master rule section "Tag vocabulary bootstrap" ([unitext.md](../unitext.md)) and [unitext-markup-system.md](unitext-markup-system.md).

## 1. Lookup: layout need → where it lives

| I want | Property / modifier | Inspector label | C# | Default | Tag, registration |
|---|---|---|---|---|---|
| Left / centre / right / justified | `HorizontalAlignment` field | alignment buttons, row 1 | `text.HorizontalAlignment = HorizontalAlignment.Center` | `Start` on the Canvas prefab; `Center` on the world and 3D prefabs | `<align=center>` (`AlignmentModifier` slot 1) — code/preset; also TMP vocab |
| Top / middle / bottom | `VerticalAlignment` field | alignment buttons, row 2 | `text.VerticalAlignment = VerticalAlignment.Middle` | `Top` on the Canvas prefab; `Middle` on world and 3D prefabs | none |
| Justify spacing mode | `AlignmentModifier.Justify` (`TextJustify`) | modifier field | `new AlignmentModifier { Justify = TextJustify.InterWord }` | `Auto` | `<align=justify,InterWord>` (slot 2) — code/preset |
| Last line of a justified paragraph | `AlignmentModifier.LastLine` (`LastLineAlignment`) | modifier field | `LastLine = LastLineAlignment.Center` | `Auto` (= start) | `<align=justify,,Center>` (slot 3) — code/preset |
| Wrap at the box edge | `WordWrap` | Word Wrap toggle | `text.WordWrap = false` | on | none |
| Shrink font to fit the box | `AutoSize`, `MinFontSize`, `MaxFontSize` | Auto Size, Min, Max (Current is read-only) | `text.AutoSize = true; text.MinFontSize = 18; text.MaxFontSize = 40;` read `text.CurrentFontSize` | off; Min 10, Max 72 | none |
| Squeeze tracking/glyph width/line height before shrinking | `FitSteps` list (`TrackingFitStep`, `GlyphScaleFitStep`, `LineHeightFitStep`) | Fit Steps (visible with Auto Size) | build in the inspector or on a prefab | empty | none |
| Font size | `FontSize` | Font Size (hidden while Auto Size is on) | `text.FontSize = 40` | 36 | `<size=...>` (picker; other area) |
| Inner margin of the box | `Padding` (`Vector4`: x Left, y Bottom, z Right, w Top) | Padding | `text.Padding = new Vector4(20, 15, 20, 15)` | (0,0,0,0) | none |
| Line height | `LineHeightModifier` or the project default (`UniTextSettings.DefaultLineHeightMode` / `LineHeightScale`) | Project Settings, Text Defaults | `Style.WholeText(new LineHeightModifier { Mode = LineHeightMode.Scaled, Scale = 1.2f })` | project default `Scaled` × 1.4 | `<line-height=,scaled,1.2>` — picker; also TMP vocab |
| Gap between paragraphs | `ParagraphSpacingModifier` | modifier field | `new ParagraphSpacingModifier { After = UnitValue.Em(0.4f) }` | 0 / 0 | `<pspace=after,before>` — picker |
| Extra space under one line | `LineGapModifier` | modifier field | `Gap` (`UnitValue`) | 0 | no tag; fed by LaTeX spacing rules — code/preset |
| Indent | `IndentModifier` | modifier field | `new IndentModifier()` | 1 em | `<indent=1em>` — code/preset; TMP vocab also maps `line-indent`, `margin-left` |
| Paragraph base direction (LTR/RTL) | `DirectionModifier` | modifier field | `text.SetWholeText<DirectionModifier>("RightToLeft")` | `Auto` | `<dir>` convention only — code/preset |
| Cut long text with `...` | `EllipsisModifier` | modifier field | `Style.WholeText(new EllipsisModifier())` | position 1 (end) | `<ellipsis=0.5>` — picker |
| Cut long text with a fade, no dots | `TruncateModifier` | modifier field | `new TruncateModifier { FadeLength = UnitValue.Em(1.5f) }` | position 1, no fade | `<truncate=0.5>` — picker |
| Keep words together | `NoBreakModifier` | – | `new NoBreakModifier()` | – | `<nobr>…</nobr>` — picker; TMP vocab |
| Wrap-whole segments with separators | `SeparatorModifier` + `SeparatorParseRule` | – | – | separator " \| " | `<sep>` / `<sep=" ● ">` — picker |
| Soft line break inside a paragraph | `LineBreakParseRule` | – | – | – | `<br>`, `<br/>`, `<br />` — picker (standalone rule); TMP vocab |
| Tracking / word spacing / fixed cell | `LetterSpacingModifier`, `WordSpacingModifier`, `CharacterWidthModifier` | – | – | – | `<cspace=5>`, `<wspace=0.25em>`, `<cwidth=1em>` / `<cwidth=auto>` — picker |
| Trim the line box to cap height / ink | `TextBoxTrimModifier` | modifier field | `OverEdge`, `UnderEdge` | `Ascent` / `Descent` | whole-text only |
| Scroll a too-long single line | `MarqueeModifier` (Canvas `UniText` only) | modifier field | `new MarqueeModifier { Mode = MarqueeMode.PingPong }` | – | whole-text only |
| Size a label to its content | `ContentSizeFitter` on `UniText`; `MeasureText`, `GetHeightForWidth` | – | section 7 | – | – |
| Show a 100 KB+ text | auto-virtualized `Rope`, `UniTextDocumentView`, `UniTextDocumentLoader` | – | section 9 | threshold 16,384 UTF-16 chars | – |

If a tag in this table appears literally on screen, its style is not registered on that component.

## 2. The two homes of layout

### 2.1 Component fields (every `UniTextBase`: `UniText`, `UniTextWorld`, `UniText3D`)

| C# property | Inspector label | Type | Default | Invalidates | Notes |
|---|---|---|---|---|---|
| `Text` | Text | string | "" | Text | serialized; `SetText(...)` is a runtime override that does not dirty the scene |
| `FontSize` | Font Size | float | 36 | Layout | setter minimum 0.01; the inspector warns below 1 ("lower the GameObject's Scale instead") |
| `WordWrap` | Word Wrap | bool | true | Layout | wrap width = rect width − Padding L − Padding R |
| `AutoSize` | Auto Size | bool | false | Layout | section 6 |
| `MinFontSize` / `MaxFontSize` | Min / Max | float | 10 / 72 | Layout (only while AutoSize) | shaping is done once at Max when AutoSize is on |
| `CurrentFontSize` | Current (read-only) | float | – | – | effective size after auto size; windowed text reports Min |
| `FitSteps` | Fit Steps | list of `FitStep` | empty | Layout | shown only with Auto Size; section 6 |
| `Padding` | Padding | `Vector4` (L, B, R, T) | (0,0,0,0) | own handler | **not** `RectOffset` order; does not shrink the raycast area; good for outline/shadow bleed and caret insets |
| `HorizontalAlignment` | alignment buttons | `HorizontalAlignment` | `Start` | Positions | section 3 |
| `VerticalAlignment` | alignment buttons | `VerticalAlignment` | `Top` | Positions | measured against the padded rect |
| `RenderMode` | Render Mode | `UniTextRenderMode` SDF / MSDF | SDF | own handler | hidden on `UniText3D` |
| `ResultSize`, `ResultGlyphs`, `GlyphCount`, `PreferredHeight`, `ViewportRect` | – | read-only | – | – | `PreferredHeight` = content height at the rect's width **without** vertical padding; stale until the frame's text pass has run |
| `GetPaddedRect()` | – | method | – | – | rect minus padding; use it for any hand layout |

Property names are confirmed by the TMP-migration script rewrite (`.FontSize`, `.MinFontSize`, `.MaxFontSize`, `.AutoSize`, `.WordWrap`, `.HorizontalAlignment`, `.VerticalAlignment`). Names with no inspector or API page of their own (the `FitSteps` list accessor) are listed in `## Unverified`.

Rect geometry: word-wrap width = `rect.width − Padding.x − Padding.z`; height bound = `rect.height − Padding.y − Padding.w`. Vertical alignment, the ellipsis height clamp and the auto-size height fit all measure against that padded rect. Hit-testing and raycasting use the full `RectTransform`.

Which component: `UniText` is a Canvas `MaskableGraphic` (masks, `RectMask2D`, layout groups, `ContentSizeFitter`, the only one with `ILayoutElement` and a document view). `UniTextWorld` is a mesh batcher (rect units × transform scale; the prefab uses scale 0.01, so 100 rect units = 1 world unit). `UniText3D` is an extruded solid on a `MeshRenderer`.

Prefab defaults: Canvas `Text (UniText)` 220×50, font 36, wrap on, Start/Top. `World Text (UniText)` scale 0.01, 220×50, font 36, Center/Middle, raycast target off, Lit off, CastShadows off. `Text 3D (UniText)` scale 0.01, 400×100, font 72, Center/Middle, depth 0.15.

### 2.2 Modifiers (per range or whole text)

Justify mode, last-line alignment, line height, paragraph spacing, ellipsis, indent, direction and box trim are **not component properties**: they were removed from `UniText`/`UniTextWorld` in 2.6.0 and live in `AlignmentModifier`, `LineHeightModifier`, `ParagraphSpacingModifier`, `EllipsisModifier`, `IndentModifier`, `DirectionModifier`, `TextBoxTrimModifier`. Code or answers that set `BaseDirection`, `TextJustify`, `LastLineAlignment`, `OverEdge`, `UnderEdge` or `LeadingDistribution` on the component do not compile.

A layout modifier on a whole-text style (`Style.WholeText(modifier)`) behaves like a component property; the same modifier on a `TagRule` gives per-paragraph or per-range control. Parameter resolution order: modifier field → rule default → markup token → owned value.

### 2.3 Project-wide defaults

Project Settings → LightSide → UniText holds sections Styling, Text Defaults, Fonts, Texture Atlases, Word Segmentation, Editing, Selection UI, Gestures, Cursor, Modules, Debug. Layout-relevant values (static accessors on `UniTextSettings`):

| Setting | C# | Default | Notes |
|---|---|---|---|
| Line Height Mode | `UniTextSettings.DefaultLineHeightMode` | `Scaled` | applies to every text that has no `LineHeightModifier` range |
| Line height scale | `UniTextSettings.LineHeightScale` | 1.4 | "matches typical web/app UIs (1.375–1.5)" |
| Font Size Match | `FontNormalizeMetric` / `FontNormalizeTarget` | None / 0 | scale fallback fonts to a shared x-height / cap-height |
| Virtualization Threshold | `UniTextSettings.VirtualizationThreshold` | 16384 UTF-16 chars | must be ≥ 1; longer text becomes a windowed document |
| Disable System Font Fallback / Disable Emoji | `SystemFontDisabled`, `EmojiDisabled` | off | |
| Word Segmentation dictionaries | `UniTextSettings.Dictionaries` | empty list | needed for Thai/Lao/Khmer/Myanmar word breaks |

`LayoutSettings.Default` core values: `textJustify` Auto, `lastLineAlignment` Auto, `overEdge` Ascent, `underEdge` Descent, `leadingDistribution` HalfLeading, `measureTrailingWhitespace` false, justify budgets word space 0.8–1.33, letter space 0–0, glyph scale 1–1 (disabled).

### 2.4 Which change costs what

`UniTextDirty` stages, cheapest first: `Mesh` < `Positions` < `Layout` < `Text` < `Font`/`Direction`.

| Change | Stage | Mobile |
|---|---|---|
| `HorizontalAlignment`, `VerticalAlignment` | Positions | OK — cheap |
| `WordWrap`, `AutoSize`, `FontSize`, `Min/MaxFontSize` (with AutoSize), rect **width** change | Layout (re-break lines) | OK for a few labels; LIMIT for per-frame writes on many |
| `Padding`, `FitSteps` | own handlers | OK |
| text, style graph change, `Language`, font | Text (re-parse + re-shape) | LIMIT on hot paths |
| `color` alpha | no rebuild | OK |
| `color` RGB | Mesh | OK |

`SetDirty(UniTextDirty.X)` re-enters at stage X: pass the least expensive stage that captures the change. Several edits in one frame cost one pass per component.

## 3. Enums

| Enum | Values (int) | Meaning |
|---|---|---|
| `HorizontalAlignment` | `Start` 0, `Center` 1, `End` 2, `Justify` 3, `Left` 4, `Right` 5 | `Start`/`End`/`Justify` follow each paragraph's own base direction (UAX #9: an Arabic paragraph with `Start` sits at the right); `Left`/`Right` are physical |
| `VerticalAlignment` | `Top` 0, `Middle` 1, `Bottom` 2 | inside the padded rect |
| `TextJustify` | `Auto` 0, `InterWord` 1, `InterCharacter` 2, `None` 3 | `Auto` = word spaces, falls back to inter-character on lines without separators (pure CJK); `None` = justified lines render start-aligned |
| `LastLineAlignment` | `Auto` 0, `Start` 1, `End` 2, `Center` 3, `Justify` 4 | last line of a paragraph, or the line before a mandatory break; `Auto` = `Start` under justify (CSS `text-align-last`) |
| `LineHeightMode` | `Content` 0, `Primary` 1, `Scaled` 2 | `Content`: grows to the tallest font on the line including fallback fonts (CSS `normal`); `Primary`: primary font only; `Scaled`: exactly `scale × fontSize` |
| `LeadingDistribution` | `HalfLeading` 0, `LeadingAbove` 1, `LeadingBelow` 2 | CSS / Figma+iOS / Android style |
| `TextOverEdge` | `Ascent` 0, `CapHeight` 1, `HalfLeading` 2, `Text` 3, `XHeight` 4, `Ink` 5 | box-trim top edge; `Ink` = highest outline of the first line (3.30.0) |
| `TextUnderEdge` | `Descent` 0, `Baseline` 1, `HalfLeading` 2, `Text` 3, `Ink` 4 | box-trim bottom edge |
| `TextDirection` | `LeftToRight` 0, `RightToLeft` 1, `Auto` 2 | base direction for bidi |
| `UnitKind` (tag value grammar) | `Absolute` (`24`, `24px`, `24abs`), `Percent` (`150%`), `Em` (`0.5em`), `Delta` (`+10`, `-5`, `10delta`) | units accepted by layout tags; a bare number's unit is the field's own unit (see line height trap) |

Enum tokens in markup are the full member name (case-insensitive) or one letter when that initial is unique in the enum. For `HorizontalAlignment`: `c` Center, `j` Justify, `e` End, `s` Start, `l` Left, `r` Right. For `TextJustify`: `a` Auto, `n` None, but `i` is ambiguous — write `InterWord` or `InterCharacter`.

## 4. Layout modifiers and tags

Slots are written in markup order: `<tag=slot1,slot2,...>`; an empty slot keeps the default. Fields marked "no slot" are inspector/code only.

| Modifier | Tag (convention) | Registration | Slots | Defaults | Behaviour and gotchas | Mobile |
|---|---|---|---|---|---|---|
| `AlignmentModifier` | `<align=center>` | code/preset, TMP vocab | Align, Justify, LastLine (enums, section 3) | Start, Auto, Auto. No slot: `WordSpacingMin` 80 (50–100 %), `WordSpacingMax` 133 (100–300), `LetterSpacingMin` 0 (−10–0 % em), `LetterSpacingMax` 0 (0–10), `GlyphScalingMin` 100 (90–100 %), `GlyphScalingMax` 100 (100–110) | per paragraph; tables and blocks align as a whole (3.30.0). Justify spends word spaces up to Max first, then letter spacing, then glyph scale; residual lands on word spaces; overflowing justified lines compress to `WordSpacingMin` | OK |
| `LineHeightModifier` | `<line-height=...>` (class remarks say `<lh=,primary>`; `lh` is wired nowhere) | picker; TMP vocab | Value, Mode, Scale, Leading | Value 0 (no nudge; `%`/`em` multiply, a **bare number is pixels**, `+10`/`-5` are pixel deltas), Mode **Content**, Scale 1.2, Leading HalfLeading | a bare tag resets the range to Content mode (see section 5.1); several absolute heights on one line: the largest wins; the line follows the largest size on the line (3.1.0) | OK |
| `ParagraphSpacingModifier` | `<pspace=after,before>` | picker | After, Before (px / % / em) | 0, 0 | gap between newline-separated paragraphs; never at block edges; no margin collapsing (values add); negative pulls together; the largest per side wins on overlap; opens below tables (3.30.0) | OK |
| `LineGapModifier` | none | code/preset (LaTeX spacing rule feeds it) | Gap | 0 | space below the line holding the range's last char; negative allowed (3.30.0) | OK |
| `IndentModifier` | `<indent=1em>` | code/preset; TMP vocab also `line-indent`, `margin-left` | one value (px / em / % of rect width) | 1 em | indents lines whose first codepoint is in the range; nested indents add; negative outdents; `%` is ignored without a finite rect width | OK |
| `LetterSpacingModifier` | `<cspace=5>`, `0.1em` | picker; TMP vocab | spacing | per modifier | tracking; innermost wins, never compounds; cursive scripts get tatweel; the 2.x monospace flag is gone | OK |
| `WordSpacingModifier` | `<wspace=0.25em>` | picker | spacing | – | affects space + NBSP only | OK |
| `CharacterWidthModifier` | `<cwidth=1em>` / `<cwidth=auto>` | picker; TMP vocab | width | – | fixed cell, glyph centred; `auto` = widest glyph of the range; spacing adds on top | OK |
| `NoBreakModifier` | `<nobr>` | picker; TMP vocab | – | – | no soft/CJK/dictionary break inside the range; wrap is allowed right before and after; a range wider than the box still breaks | OK |
| `SeparatorModifier` + `SeparatorParseRule` | `<sep>` / `<sep=" ● ">` | picker (Tag – Separator Parse Rule) | separator string | space, vertical bar, space | segments wrap whole; the separator before a moved segment collapses | OK |
| `EllipsisModifier` | `<ellipsis=0.5>` | picker | Position 0..1 | 1 (end); 0 start, 0.5 middle | marker is three ASCII dots, not U+2026 (section 5.2); with word wrap the last fitting line gets the marker, lower lines are hidden but keep layout space and Position has no effect | LIMIT — re-layout on every rect-height change; do not use on texts whose box is resized each frame |
| `TruncateModifier` | `<truncate=0.5>` | picker | Position 0..1 | 1 | like ellipsis without a marker. `FadeLength` (`UnitValue`, default 0 em = hard cut) and `FadeOffset` are inspector/code only (no slot); text that fits never fades | OK |
| `TextBoxTrimModifier` | none | whole-text | OverEdge, UnderEdge | Ascent, Descent | trims the line box to metrics or ink; `Ink` + `Ink` with `VerticalAlignment.Middle` centres drawn letters (icon letters in tiles) | OK |
| `DirectionModifier` | `<dir>` (convention) | code/preset; whole-text | Direction (`TextDirection`) | Auto | paragraph base direction (UAX #9); apply to the whole text | OK |
| `FontSizeMatchModifier` | none | code/preset | Metric, Target | XHeight, 0 | match mixed fonts on x-height / cap-height; project default `Font Size Match` is None | OK |
| `LineBreakParseRule` | `<br>`, `<br/>`, `<br />` | picker (standalone rule); TMP vocab | – | – | **soft** break (U+2028): wraps but stays in the same paragraph (no paragraph spacing); a literal `\n` starts a new paragraph | OK |
| `MarqueeModifier` | none | whole-text; Canvas `UniText` only | Mode (Loop/PingPong), Speed, Pause, Gap, Always, Fade, Phase, Clock | – | throws `NotSupportedException` on `UniTextWorld`; scrolls while wider than the padded rect; clips left/right to the rect itself; vertical overflow stays visible; not combinable with a document or another scroller | LIMIT — continuous animation; one or two labels |
| `ArcModifier`, `CurveModifier` | `<arc>` (convention) | code/preset | – | – | glyphs on a circle or curve (animation/effects area); `OnResolveLayoutWidth` lets a shape supply the width used by wrap, AutoSize and ellipsis | LIMIT — per-glyph placement rebuilt with the layout |

Markdown and LaTeX layout sources (brief): `MarkdownListParseRule` + `ListModifier`; `LatexAlignmentRule`, `LatexSpacingRule`, `LatexSizeRule`, `LatexListRule`, `TabularParseRule` + `TableModifier`. Details are in the markup and modifier references.

## 5. Line height and ellipsis traps

### 5.1 Line height

- **The default is not font metrics.** Since 2.6.1 the project-wide default is `Scaled` × 1.4: every row is exactly `1.4 × fontSize` regardless of the fonts on it, so a fallback CJK or emoji glyph does not enlarge its line.
- **`LineHeightModifier` itself defaults to `Content` mode.** A bare tag or style — `<line-height=150%>` or `new LineHeightModifier()` — switches its range to `Content` mode, where the height grows to the tallest font on the line and `150%` multiplies *that*. The range therefore looks different from the surrounding `Scaled 1.4` text.
- **A bare number is pixels** in the Value slot: `<line-height=40>` is 40 px, not a multiplier. Use `%` or `em` for relative values.
- **To keep the project's mode and only change the scale, set the mode explicitly:** `<line-height=,scaled,1.2>` (empty Value slot, then Mode, then Scale) or `Style.WholeText(new LineHeightModifier { Mode = LineHeightMode.Scaled, Scale = 1.2f })`.
- Use `Content` only when you want fallback fonts (CJK, emoji) to push lines apart; for UI rows keep `Scaled`.
- There is no line-height field on the component: change it project-wide (`UniTextSettings.LineHeightScale`) or with a modifier.

### 5.2 Ellipsis and truncate

- **The marker is `...` (three ASCII dots)**, drawn in the font resolved for `.`; it is not U+2026. Its width is reserved correctly under AutoSize since 3.3.0.
- **It truncates only in a bounded rect.** Width truncation happens only with `WordWrap` off. Height truncation needs a real rect height; with wrap on, the last line that fits gets the marker and the lines below are hidden but keep layout space. One line always survives.
- **A box whose height comes from a `ContentSizeFitter` is unbounded**, so nothing is cut. Give the text a fixed-height rect.
- With wrap on, `Position` has no effect (the marker always sits on the last fitting line).
- Per range: `Style.Tag(new EllipsisModifier(), "ellipsis")`, then `<ellipsis>long clause</ellipsis>`.
- Prefer `TruncateModifier` when a soft fade fits the art direction: no marker glyph, no font lookup, same bounded-rect rule.

### 5.3 Alignment

- `Start`/`End` follow each paragraph's own direction; use `Left`/`Right` when you need a physical edge (for example a number that must hug the right edge in every language).
- `Justify` leaves the last line start-aligned unless `AlignmentModifier.LastLine` says otherwise. Pure CJK lines justify between characters under `Auto`.
- Plain text under a `RectMask2D` keeps its alignment (since 3.20.0); only scrolling hosts (input fields, windowed text, `UniTextDocumentView`) lay an overflowing axis out from its start edge.

## 6. AutoSize

- **Semantics:** the largest size between Min and Max that fits the padded rect; with word wrap, never one that could only be reached by splitting a word. A word wider than the box shrinks the font to Min instead of breaking (since 3.9.2). The result is fractional (`CurrentFontSize`) and follows resizes smoothly.
- **Set a fixed `FontSize` when you want break-anywhere behaviour.** `FontSize` is ignored while AutoSize is on, also inside `MeasureText`.
- **Algorithm:** shaping runs once at Max; each probe re-breaks lines at a trial size; the probe count is logarithmic. Width and height results are cached (keyed by width, then rect height).
- **Cost:** one probe sequence per rebuild, growing with text length and the Min–Max span; re-runs on text change, rect width/height change, and changes to Min/Max/FontSize/WordWrap. Mobile: OK for buttons, titles, tab labels; LIMIT on text that changes every frame; AVOID in pooled lists of hundreds — use a fixed `FontSize` there.
- **`FitSteps` ladder** (spent in order *before* the font shrinks, each only as far as it buys back size): `TrackingFitStep.MaxCompression` (em, default 0.02, range 0–0.1), `GlyphScaleFitStep.MaxCompression` (percent, default 2, range 0–10; above about 3 % it visibly distorts — print systems cap this lever at 2 %), `LineHeightFitStep.MinScale` (percent of natural line height, default 90, range 50–100). Fit steps work without word wrap (3.2.0); wide words spend fit steps before shrinking (3.10.0).
- **World text:** AutoSize works on `UniTextWorld` (it silently used Max before 2.1.0).
- **Windowed (virtualized) text:** AutoSize is not supported; the text uses Min (since 3.8.0).
- Indents and list margins count in the fit width (3.3.0).
- `UniText3D` derives from `UniTextBase`, but AutoSize on it is listed in `## Unverified`.

## 7. Measuring and fitting to content

| API | Meaning |
|---|---|
| `UniText : ILayoutElement` | `minWidth` 0; `preferredWidth` = widest unwrapped line + horizontal padding; `preferredHeight` = wrapped height at the rect's width + vertical padding; `flexible*` −1. `ContentSizeFitter` and layout groups work for **Canvas `UniText` only**; `UniTextWorld`/`UniText3D` have no `ILayoutElement`. Since 3.20.0 `UniText` is no longer an `ILayoutController` (it fits itself in its own rebuild) |
| `GetMinContentWidth()` / `GetMaxContentWidth()` / `GetHeightForWidth(float)` | content measurement for custom layout, padding included; min = narrowest without splitting a word (at Min size under AutoSize); max = widest line between forced breaks (at Max size under AutoSize); `GetHeightForWidth` shares the text's cache, but at a width other than the rect's it schedules a Positions pass |
| `MeasureText(TextMeasureOptions)` → `Vector2` | measures the current text or any markup string with no side effect on the displayed text; every field is nullable and falls back to the component; fields `text, maxWidth, maxHeight, fontSize, autoSize, minFontSize, maxFontSize, wordWrap, padding`; null `maxWidth` = unconstrained; `maxHeight` only matters with AutoSize; dimensions are outer (padding included); main thread only; re-parses and re-shapes, so **cache the result** |
| `OnResolveLayoutWidth` | event that can substitute the width that wrap, AutoSize and ellipsis measure against |
| `ResultSize`, `ResultGlyphs`, `GetRangeBounds`, `HitTestRange` | post-layout results; stale until the frame's text pass |

Text passes run once per frame for all dirty components (before Canvas rendering). Inside layout groups a layout rebuild forces a synchronous first pass when it reads preferred sizes.

## 8. Line breaking by script

- UAX #14 line breaking, UAX #9 bidi, UAX #29 graphemes and UAX #24 scripts are implemented as Burst kernels with identical managed fallbacks.
- Latin, Cyrillic, Greek: break at spaces and hyphens. Korean breaks at spaces and never mid-word. Chinese and Japanese break between characters with no dictionary; a dictionary only refines word selection, navigation and word-by-word animation.
- **Thai, Lao, Khmer, Myanmar need a `WordSegmentationDictionary`** listed in Project Settings → Word Segmentation (`UniTextSettings.Dictionaries`); until one is listed these lines do not break at words. The package ships dictionary assets (about 2–18 MB each) but the list is empty by default: add only the scripts you ship.
- Justification: `TextJustify.Auto` inter-word with inter-character fallback; use `InterCharacter` explicitly for Japanese, Chinese, Thai.
- Soft hyphen U+00AD and no-break space U+00A0 are UAX #14 classes; `<nobr>` and NBSP keep text together. There is no automatic hyphenation.
- Mandatory breaks: CR, LF, NEL, LS, PS, VT, FF. `<br>` is a soft break (U+2028) inside one paragraph; `\n` starts a paragraph.

## 9. Large documents

**When to use:** text that exceeds roughly 16,000 characters or is appended to and scrolled for long — terms of service, licences, patch notes, logs and consoles, chat history, codex pages, a 1–10 MB file. **Not** for HUD labels, item names or short dialogue: they render whole and keep normal behaviour (AutoSize, ellipsis).

### 9.1 What happens automatically

Any `Text` (or resolver output) longer than `UniTextSettings.VirtualizationThreshold` (16,384 UTF-16 chars) silently becomes a windowed `Rope`:

- `IsWindowed` is true; `RawText` is the full input; `RenderedText` is the materialized window; `RenderedCodepointOffset` is the document index of the first rendered codepoint. Hit tests and ranges are **window-relative**.
- Without a viewport the text is **clipped to its own rect** and logs once: "Large text is virtualized and clipped to its RectTransform. Supply a viewport...". A viewport is supplied by a `RectMask2D` clip, a `ScrollRect` with `ScrollRectRangeViewport`, a `UniTextDocumentView`, or `DeclareVisibleWindow(Rect)`.
- Mesh emission is bounded by the viewport: paragraphs outside it produce no quads; layout, selection, caret and hit-testing stay whole-document.
- A `RectTransform` laid out from a document is capped at `MaxLayoutExtent` = 2^21 units (float precision); a longer document must scroll in a `UniTextDocumentView`. Under a layout group or fitter the text reports the document extent (capped) as its preferred size.
- **Legibility:** when one em covers fewer than `LegibilityFloorPixels` (3.5 px) on screen, a windowed document renders as bars (`IsGreeked`) instead of text; lines merge until each bar covers 2 px. Canvas text takes its projected size from the canvas, world text from the main (or `CameraRangeViewport`) camera.
- AutoSize is not supported on windowed text (uses Min).
- Raising `VirtualizationThreshold` is a deliberate memory and layout trade-off (cost grows linearly with the text).

### 9.2 Types

| Type / member | Role |
|---|---|
| `UniTextDocumentView` (Canvas `UniText` only) | `RectTransform` + `RectMask2D` viewport: drag, wheel, inertia, elastic ends, scrollbars. Public: `Text` (type `UniText`; found in a child when empty), `VerticalScrollbar`, `HorizontalScrollbar`, `StartAt` (`UniTextDocumentView.StartEdge.Top`/`Bottom`), `Position` (double, document Y at the viewport top; setting teleports and stops), `ScrollToStart()`, `ScrollToEnd()`, `StopMovement()`. Serialized only: `autoHideScrollbars` true, `elastic` true, `elasticity` 0.1 s, `inertia` true, `decelerationRate` 0.135, `scrollSensitivity` 1 |
| Text-side navigation (on every `UniTextBase`) | `ScrollDocumentTo(double)`, `ScrollDocumentBy(double,double)`, `RevealDocumentSpan`, `RevealLocalSpan`, `ScrollToCodepoint(int)`, `ScrollToParagraph(int)`, `DocumentTop/Left`, `MaxDocumentTop/Left`, `LocalToDocumentY`, `DocumentToLocalY`, `GetCodepointDocumentSpan`; events `DocumentChanged`, `DocumentGeometryChanged`, `DocumentPositionChanged`, `DocumentScrollRequested`; usable the moment a document is set |
| `UniTextDocumentLoader` (MonoBehaviour, `[ExecuteAlways]`, one per object) | loads a `DocumentSource` into a `UniTextBase` on enable and whenever source, settings or text change, and hands the `Rope` over with ownership. Members: `Text` (same object or below when empty), `Source`, `IsLoading`, `Reload()`, `Cancel()`, event `Loaded(Rope)`. A failed load logs an exception on the loader and keeps the previous document; the path may name a file that does not exist yet; an empty source loads nothing. Add Component: LightSide → UniText → UniTextDocumentLoader |
| `DocumentSource` (abstract) | `IsEmpty`, `IDisposable Load(ScanProfile, Action<Rope>)`; a custom source is a `partial` subclass with `[StateProperty]` fields and appears in the picker |
| `FileDocumentSource` | `Root` (`DocumentPathRoot`: `Absolute` 0, `StreamingAssets` 1 (default), `PersistentData` 2, `Data` 3, `TemporaryCache` 4), `Path`, `Encoding` (`TextFileEncoding`: `Auto` = BOM else UTF-8, `Utf8`, `Utf16LE/BE`, `Utf32LE/BE`), `Backend` (`FileTextBackend`: `Auto` = memory-map when proven else chunked, `ChunkedRead`, `MemoryMapped`), `ResolvedLocation`, `IsRemote`, statics `RootLocation(root)`, `IsUrl(s)`. A location containing `://` (StreamingAssets on Android/WebGL, or an http(s) URL given with `Root = Absolute`) loads **asynchronously** through UnityWebRequest and needs the built-in **Unity Web Request** module (`UNITEXT_HAS_WEBREQUEST`), otherwise it throws `NotSupportedException` |
| `TextAssetDocumentSource` | `Asset` (`TextAsset`), `Encoding`; the whole asset is in memory — fine up to a few megabytes; larger files go to StreamingAssets with `FileDocumentSource` |
| `FileTextSource.Load(path, ScanProfile, TextFileEncoding = Auto, FileTextBackend = Auto)` / `FromBytes(ReadOnlyMemory<byte>, profile, enc)` | static, returns a `Rope`. UTF-8 stays UTF-8 in blocks (residency ≈ file size); blocks of about 4k chars are cut at paragraph boundaries (never inside a UTF-8 sequence or CRLF); facts are computed in parallel on `WorkerPool`; UTF-16/32 decode to UTF-16 blocks; invalid UTF-8 becomes U+FFFD per byte; BOM skipped. Memory passed to `FromBytes` must stay unmodified for the document's life |
| `Rope` (`IDisposable`, **main thread only**) | `new Rope(ScanProfile)`, `Rope.FromChars(span, profile)`, `Insert/Delete/Replace/SetText/Clear`, `Length`/`CharCount`, `CodepointCount`, `ParagraphCount`, `BlockCount`, `MeasuredBlockCount`, `TotalHeight`, `ContentWidth`, `Version`, `CopyChars`, `GetCodepointRange`, `ToString()` (allocates the whole text), `Dispose()`. Position queries are O(log blocks); an edit costs O(edited block), or O(blocks) when the block count changes. Edits may not split a surrogate pair (they throw) |
| `text.SetDocument(Rope, bool takeOwnership)` | renders a document in any text; the serialized text is untouched; with `takeOwnership` the text disposes the rope |
| `text.ScanProfile`, `ScanProfile.SetTriggers(string)` | pass the component's profile when building a `Rope` so blocks record whether they can start a markup match |

World text has no document view: it scrolls with the camera (`CameraRangeViewport`, `DocumentScrollRequested`).

### 9.3 Markup across window edges

The component records which markup is open at the end of each block (walking from the document start toward the window under a per-pass budget and skipping blocks that contain no markup trigger) and re-opens it as a hidden prelude in front of the window. After a far jump the window renders with what is known and re-renders when the start state arrives; blocks measured under unknown state stay provisional and are re-measured. Estimated heights above the viewport are corrected as blocks get measured: that changes the number of `DocumentTop`, never what stands under the viewport.

### 9.4 Editing limits

`UniTextEditable` stores its text as a `Rope` and shares the viewport, scroll and virtualization machinery; a `UniTextDocumentView` can host an editable field; `FindAll` streams the document. Copy and paste have no package size cap (the 1,000,000-char cap was removed in 3.8.0), so attach a `LengthLimitBehavior` for limits. Rich-text import and attributed undo snapshots still process the whole content: use plain fields for big editable documents. The undo memory ceiling is 1 MiB by default (`undoMemoryLimit` 1048576). Details: [unitext-input-fields.md](unitext-input-fields.md).

### 9.5 Menu entries and prefabs

`GameObject → LightSide → UniText → UniTextDocumentView` creates a view from the settings slot `Document View Prefab` (wrap on, font 24, padding 16 on all sides, vertical scrollbar, `RectMask2D` viewport). `UniTextDocumentView (Both Axes)` uses `DocView Both Axes` (Word Wrap off, both scrollbars, extra bottom padding for the horizontal scrollbar). Both prefab slots are editor-only fields of `UniTextSettings`.

Mobile for documents: OK for logs, terms and chat history (mesh cost is bounded by the viewport). LIMIT: a `TextAsset` source above a few MB (whole asset resident) and per-frame `Rope` edits that change the block count. AVOID: pushing a huge string through `text.Text` repeatedly (each assignment re-scans and re-windows).

## 10. Recipes

Preamble for all snippets: `using LightSide;`. `text` is a Canvas `UniText` unless stated.

**R1. HUD counter or short label — centred, no wrap, fixed size, no garbage**
Setup: Font Size 40, Word Wrap off, rect = the slot size, `Raycast Target` off (Graphic option).
```csharp
text.FontSize = 40; text.WordWrap = false;
text.HorizontalAlignment = HorizontalAlignment.Center;   // Positions stage only (cheap)
text.VerticalAlignment   = VerticalAlignment.Middle;
sb.Clear().Append(score); text.SetText(sb);              // StringBuilder overload: no string alloc; same chars = no-op
```
Gotcha: for a number that must hug the right edge in RTL languages too, use `Right` (physical), not `End`.

**R2. Button or tab label that shrinks to fit**
```csharp
text.AutoSize = true; text.MinFontSize = 18; text.MaxFontSize = 40;   // FontSize is ignored while AutoSize is on
text.WordWrap = false;                                                  // one line: shrinks instead of wrapping
```
Result: `text.CurrentFontSize` is the largest size that fits the padded rect. Optional ladder: add `TrackingFitStep` / `GlyphScaleFitStep` / `LineHeightFitStep` in the inspector's Fit Steps list. Gotcha: set the rect size first; do not use on per-frame text or large pools.

**R3. Multi-line description cut with "..." at the bottom**
Setup: fixed rect height (for example 120), Word Wrap on, whole-text `EllipsisModifier` (picker: Layout → Ellipsis, or code).
```csharp
text.Styles.Add(Style.WholeText(new EllipsisModifier()));
```
Result: the last fitting line ends with `...`; lines below are hidden but keep layout space. Gotcha: a rect driven by `ContentSizeFitter` is unbounded and nothing is cut.

**R4. One-line item name cut with a soft fade**
```csharp
text.WordWrap = false;
text.Styles.Add(Style.WholeText(new TruncateModifier { FadeLength = UnitValue.Em(1.5f) }));
```
`Position` 1 cuts the end, 0 the start, 0.5 the middle. Text that fits never fades. `FadeLength` has no markup slot.

**R5. Justified dialogue paragraph with a centred last line**
```csharp
text.HorizontalAlignment = HorizontalAlignment.Justify;
text.Styles.Add(Style.WholeText(new AlignmentModifier {
    Align = HorizontalAlignment.Justify, LastLine = LastLineAlignment.Center }));
```
Per-paragraph markup needs `Style.Tag(new AlignmentModifier(), "align")` first: `<align=center>Title</align>\n<align=justify,InterWord,Center>body…`. Optional spacing budgets (`LetterSpacingMax`, `LetterSpacingMin`, in % of em) widen the range justification may use before it stretches word spaces.

**R6. UI-friendly line height and paragraph spacing**
Project-wide: Project Settings → Text Defaults → Line Height Mode `Scaled`, value 1.4 (already the default) or `UniTextSettings.LineHeightScale = 1.25f;`. Per text:
```csharp
text.Styles.Add(Style.WholeText(new LineHeightModifier { Mode = LineHeightMode.Scaled, Scale = 1.2f }));
text.Styles.Add(Style.WholeText(new ParagraphSpacingModifier { After = UnitValue.Em(0.4f) }));
```
Markup forms after `Style.Tag(..., "line-height")` / `"pspace"`: `<line-height=,scaled,1.2>`, `<pspace=0.4em>`, `<pspace=10,4>`.

**R7. Tooltip that sizes to its content with a maximum width**
Option A (layout-driven): panel with `ContentSizeFitter` Vertical = Preferred and a fixed width (for example 360); `UniText.preferredHeight` is the wrapped height at that width plus padding. Do not set Horizontal = Preferred on a wrapping text — preferred width is the unwrapped line width.
Option B (code):
```csharp
Vector2 size = text.MeasureText(new TextMeasureOptions { text = markup, maxWidth = 360f });   // outer size, padding included
tooltipRect.sizeDelta = size;                                                                  // main thread; cache the result
```

**R8. Chat bubble — width follows the message up to a maximum**
Setup: a bubble `Image` with a `UniText` child stretched inside it (`Padding` for the bubble margins, for example 20/15/20/15, `WordWrap` on).
```csharp
void Fit(UniText label, RectTransform bubble, string msg, float maxWidth)
{
    float natural = label.MeasureText(new TextMeasureOptions { text = msg }).x;      // unconstrained width, padding included
    float width = Mathf.Min(Mathf.Ceil(natural), maxWidth);
    Vector2 size = label.MeasureText(new TextMeasureOptions { text = msg, maxWidth = width });
    label.SetText(msg);
    bubble.sizeDelta = size;                                                         // short messages hug the text; long ones wrap at maxWidth
}
```
Result: bubbles of different messages get their own size without a layout rebuild. Gotchas: `MeasureText` re-parses and re-shapes, so call it once per message, not per frame; set `Raycast Target` off on the text if only the bubble takes taps; long histories belong in a document (R12), not in hundreds of bubbles.

**R9. World-space label sized to its text** (`UniTextWorld` has no `ILayoutElement`)
```csharp
Vector2 s = world.MeasureText(new TextMeasureOptions { maxWidth = 600f });   // rect units; the prefab's 0.01 scale converts to metres
world.rectTransform.sizeDelta = s;
```
After the first layout `world.ResultSize` holds the computed size. Add `WorldPointerRaycaster` to the camera only if the text must take clicks.

**R10. Keep a value together; chip-style separators**
`<nobr>1,250 gold</nobr>` after `Style.Tag(new NoBreakModifier(), "nobr")` wraps before or after the value, never inside it. `Model<sep>Skin<sep>Level` with `SeparatorParseRule` + `SeparatorModifier`: each segment wraps whole and the separator before a moved segment disappears; `<sep=" ● ">` overrides the separator per occurrence.

**R11. Long quest title scrolling in a small label (Canvas only)**
```csharp
text.Styles.Add(Style.WholeText(new MarqueeModifier {
    Mode = MarqueeMode.PingPong, Speed = UnitValue.Absolute(40f), Pause = 1f, Fade = UnitValue.Em(1f) }));
```
`Speed` is px/s or em/s; `Always` scrolls even when the text fits. It clips itself to the rect's left and right edges and throws on `UniTextWorld`.

**R12. Terms, licence or changelog viewer from StreamingAssets (Canvas)**
Setup: `GameObject → LightSide → UniText → UniTextDocumentView`; select the child text; on its `UniTextDocumentLoader` choose Source = File, Root = StreamingAssets, Path = `legal/terms.txt`, Encoding Auto. Code equivalent:
```csharp
var loader = view.GetComponentInChildren<UniTextDocumentLoader>();
loader.Source = new FileDocumentSource { Root = DocumentPathRoot.StreamingAssets, Path = "legal/terms.txt" };
loader.Loaded += rope => view.ScrollToStart();    // fires after the Rope is handed over; async on Android: check loader.IsLoading
```
Result: a windowed document; only the visible blocks are meshed. The file sits under `StreamingAssets/`. On Android and WebGL the location is a URL, so the built-in **Unity Web Request** module must be enabled. For a bundled `TextAsset` up to a few MB use `new TextAssetDocumentSource { Asset = ta }`. Gotcha: a failed load keeps the previous document and logs on the loader.

**R13. Append-only log or chat history with auto-follow**
```csharp
var rope = new Rope(text.ScanProfile);               // empty document classified for this text's markup triggers
text.SetDocument(rope, takeOwnership: true);
view.StartAt = UniTextDocumentView.StartEdge.Bottom;
void Add(string line) { rope.Insert(rope.Length, line + "\n"); view.ScrollToEnd(); }   // main thread only
```
Since 3.30.0 each edit of a `SetDocument` rope updates the text, and an edit above the viewport keeps the content in place. Trim old lines with `rope.Delete(0, n)`. Terminal-style logs: Word Wrap off plus `UniTextDocumentView (Both Axes)`. Gotchas: never touch the rope from another thread; do not call `rope.ToString()` per line (allocates the whole text).

**R14. A very long string without any loader**
`text.Text = hugeString;` (over 16,384 chars) silently windows. Put the text under a `RectMask2D` or a `UniTextDocumentView`, or it is clipped to its rect and warns once. Indices from `HitTestRange` and ranges are relative to `RenderedCodepointOffset`; `RawText` is the full text.

**R15. Pooled damage numbers and popups (show, fade, hide without rebuilds)**
```csharp
label.SetText(sb);                              // new digits: one rebuild; unseen glyphs may need raster + upload on first sight
label.Show();                                   // instant: layout, mesh and atlas references are kept
var c = label.color; c.a = t; label.color = c;  // alpha-only change: no layout, no mesh pass
// when t reaches 0:  label.Hide();             // alpha 0 is still drawn and still takes pointer events
```
Gotchas: disabling the component or GameObject releases everything, and the next enable rebuilds from scratch — pool with `Hide()`/`Show()`. Pre-warm the digits once (`SetText("0123456789")`) at load so the atlas holds them. More: [unitext-performance-mobile.md](unitext-performance-mobile.md).

## 11. Pitfalls

1. **A tag that is not registered in a style is literal text.** `align`, `indent`, `dir`, `arc` are not in the picker; wire them with `Style.Tag(modifier, "name")` or a preset.
2. **Per-paragraph properties are not on the component** (section 2.2); old snippets using them do not compile.
3. **Bare `<line-height=150%>` switches the range to Content mode; a bare number is pixels** (section 5.1).
4. **`WordWrap` + `AutoSize`:** a too-wide word shrinks the font to Min, never splits. `FontSize` is ignored while AutoSize is on.
5. **Ellipsis and truncate silently do nothing** when the relevant axis is unbounded (section 5.2). The marker is `...`, not U+2026.
6. **`Padding` order is Left, Bottom, Right, Top** and does not shrink the raycast area.
7. **`ContentSizeFitter` Horizontal = Preferred on a wrapping label** gives the unwrapped one-line width; Vertical = Preferred gives the wrapped height at the current rect width (+ padding). World and 3D text cannot be fitted by uGUI.
8. **Alignment tokens:** `Start`/`End` follow paragraph direction (Arabic `Start` = right); use `Left`/`Right` for physical edges.
9. **More than 16,384 chars is silently virtualized** (clipped to its rect with a one-time warning without a viewport); indices become window-relative and `RenderedText` differs from `RawText`.
10. **Document in a `ScrollRect`:** one doc page says a document does not embed into a `ScrollRect` among other content (it scrolls in its own view), while the loader page says a document under a `ScrollRect` or mask scrolls and windows itself, and `ScrollRectRangeViewport` exists for it. Prefer `UniTextDocumentView`.
11. **`UniTextDocumentView.Text` is `UniText` (Canvas).** World documents scroll through `CameraRangeViewport`.
12. **Android and WebGL StreamingAssets loads are asynchronous** (`IsLoading`, `Loaded`) and need the Unity Web Request module, else `NotSupportedException`. `TextAssetDocumentSource` keeps the whole asset in memory.
13. **`Rope` is main-thread only and disposable;** `ToString()` allocates the whole text. With `SetDocument(rope, takeOwnership: false)` you must dispose it; a rope from `FileTextSource.FromBytes` references your bytes — never mutate them.
14. **`SetText` with identical text no longer rebuilds** (3.20.0); force a pass with `SetDirty`. The `char[]` and `ReadOnlyMemory<char>` overloads always re-read.
15. **Alpha 0 is still drawn and clickable** — `Hide()` after the fade-out. Changing R/G/B of `color` rebuilds the mesh; alpha does not.
16. **`MeasureText` re-parses and re-shapes** and is main-thread only: cache results. `GetHeightForWidth` at a width other than the rect's schedules a Positions pass.
17. **Mixed styled and plain text splits draw calls** (shader tiers do not batch together); see [unitext-performance-mobile.md](unitext-performance-mobile.md).
18. **Layout sample README is stale** ("HorizontalAlignment: Left, Center, Right"): the enum has six members. The sample scene is a chat UI (composer and bubbles) that uses `Padding` 20/15/20/15 and `VerticalAlignment.Middle` for the placeholder.
19. **`<gradient>` / `<outline>` do not exist** in the current package; see [unitext-version-traps.md](unitext-version-traps.md).
20. **Animator-driven component fields** (`FontSize`, `WordWrap`, alignment, AutoSize) need `UniTextAnimationBridge` + `UniTextFieldsAnimationHandler`; the Animator bypasses setters.

## Unverified

- C# accessor name of the `FitSteps` list (field `fitSteps`; probably `FitSteps`). `FontSize`, `WordWrap`, `AutoSize`, `MinFontSize`, `MaxFontSize` are confirmed.
- Whether `FileDocumentSource` with `Root = Absolute` and an `http(s)://` path is a supported public use (derived from the `IsUrl` logic; the docs only name StreamingAssets URLs).
- Whether a visible hyphen is drawn when a soft hyphen (U+00AD) causes a break; no automatic hyphenation was found.
- Whether AutoSize is supported on `UniText3D`.
- Whether `MeasureText`'s `maxWidth` is outer (padding included) like the result; the API page says "dimensions are outer".
