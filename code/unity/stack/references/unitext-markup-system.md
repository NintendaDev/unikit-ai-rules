# UniText — Markup system: sources, parse rules, styles, presets, parameters

> **Base path:** `<UniTextRoot>` is the folder of the UniText package — the one whose `package.json` has `"name": "media.lightside.unitext"` (find it with `Glob **/media.lightside.unitext/package.json`; it may sit under `Packages/` or `Library/PackageCache/`). Never hard-code its location.
> See also: [unitext-components-setup.md](unitext-components-setup.md), [unitext-formatting-tags-quickref.md](unitext-formatting-tags-quickref.md), [unitext-formatting-tags-full.md](unitext-formatting-tags-full.md), [unitext-tmp-migration.md](unitext-tmp-migration.md), [unitext-interaction-links.md](unitext-interaction-links.md), [unitext-effects-paint.md](unitext-effects-paint.md), [unitext-animation-phase.md](unitext-animation-phase.md), [unitext-range-state-rules.md](unitext-range-state-rules.md), [unitext-inline-media.md](unitext-inline-media.md), [unitext-performance-mobile.md](unitext-performance-mobile.md), [unitext-version-traps.md](unitext-version-traps.md)

---

Mobile verdicts (`OK` / `LIMIT` / `AVOID`) in this file come from reading the package source and documentation; nothing was profiled and no vendor figures are quoted. Code identifiers, tag spellings and namespaces (`using LightSide;`) are exact. Game assemblies need references to `LightSide.UniText` and `LightSide.Core`.

**The one fact to remember: in UniText no tag name is wired to an effect.** A fresh `UniText` / `UniTextWorld` (menu-created, `AddComponent`, or any shipped prefab) understands nothing: `<b>x</b>` prints literally, `<br>` is not a line break, Markdown and URLs are not detected. The package ships prefabs with empty `styles` and `UniTextSettings` with no global style preset. A tag works only after a `Style` that binds a tag name to a modifier is registered where the component reads it. The complete procedure is under **Tag vocabulary bootstrap**. (The package's Getting Started page says the shipped prefabs wire the common tags; in 3.30.0 they do not.)

## Lookup: to get X, do Y

| To get | Do | Where |
|---|---|---|
| `<b>`, `<color=...>` etc. to work in the whole game | Build a `StylePreset` (asset), fill it with `Style.Tag(...)` entries, assign it as `UniTextSettings.GlobalStylePreset` | Tag vocabulary bootstrap, routes A/B |
| A tag on one component only, from code | `text.Styles.Add(Style.Tag(new BoldModifier(), "b"))` | route C |
| A tag with a built-in default value (`<rare>` = blue) | `Style.Tag(new ColorModifier(), "rare", "#4D8BFF")`; a tag token still overrides it (`<rare=#FFF>`) | R4 |
| Several spellings for one effect (`<b>`, `<strong>`, `**x**`) | One `Style` whose source is a `CompositeParseRule` of several rules | R6 |
| One tag that applies several effects (colour + size + bold) | `CompositeModifier` as the style's modifier, per-child values split by `;` | R5 |
| Markdown (`**`, `*`, `++`, `~~`, `[t](url)`, lists) | `MarkdownWrapRule { Marker = "**" }` + modifier; picker group Markdown | Picker table |
| Automatic link detection (`https://...`, `www.`) | `Style.FromSource(new RawUrlParseRule(), linkModifier)`; picker "Link (Raw URL)" | R8 |
| `@mentions` / `#hashtags` | `TriggerWordParseRule("@")` + `InteractiveModifier` | R9 |
| Protect text from parsing | Standalone rules: `NoparseTagRule`, `CodeSpanRule`, `BackslashEscapeRule`; or a label with `UseGlobalStylePreset = false` and no styles | R10 |
| `<br>` line break | `new Style { Source = new LineBreakParseRule() }` (standalone, no modifier) | bootstrap |
| Apply a style to the whole text, no markup | `Style.WholeText(mod, param)`, `text.SetWholeText<T>(param)`, `ToggleWholeText<T>()`, inspector toggle row | R11 |
| A style on a fixed index range | `Style.Range(mod, start, end, param)` (rendered-codepoint indices, does not follow edits) | R12 |
| Ranges that follow edits / search hits | `MutableRangeSource` inside `Style.FromSource` | R13 |
| Re-colour or drive authored ranges at runtime | `#label` in the tag + `modifier.Ranges().WhereLabel(...).Own(param)` | R7 |
| A tag for an effect with no picker preset (stroke, shadow, glow, fill, wave, shake, ruby, highlight) | Create the tag yourself: `Style.Tag(new WaveModifier(), "wave")` | R21 |
| Share one vocabulary across components | `StylePreset` asset: global (`UniTextSettings.GlobalStylePreset`) or per component (`text.StylePresets.Add(p)`) | Sharing |
| Skin / theme switching without touching strings | Swap `text.StylePresets`; every preset defines the same tag names | R17 |
| A component with no markup at all (HUD numbers, raw logs) | `text.UseGlobalStylePreset = false`, no styles, no presets (no parser is created) | R20 |
| Toggle an effect off (reduce motion) | `style.Enabled = false` | R18 |
| A custom effect | `[GenerateParameters] partial class X : BaseModifier`, register with `Style.Tag(new X(), "x")` | Custom authoring |
| A custom syntax (`[[term]]`) | Subclass `ParseRule`, implement `TryMatch`, override `MarkupTriggers` | Custom authoring |
| Tags print literally | No style for that name, `UseGlobalStylePreset` off, global slot empty, style disabled, or malformed tag | Pitfalls 1-4 |

## Mental model

```
UniTextBase (UniText | UniTextWorld | UniText3D)
 ├─ Styles            local list, registered first
 ├─ StylePresets      per-component preset assets, in list order
 ├─ UseGlobalStylePreset (bool, default true) -> UniTextSettings.GlobalStylePreset, registered last
 └─ effective vocabulary = Styles ++ StylePresets[0..n] ++ GlobalStylePreset  (disabled styles skipped)
Style
 ├─ Source   : RangeSource or null    (null = one implicit whole-text entity)
 │             ParseRule family (TagRule, InlineTagRule, MarkdownWrapRule, ...), FixedRangeSource,
 │             MutableRangeSource, custom RangeSource
 ├─ Modifier : BaseModifier graph     (leaf, CompositeModifier, ModifierGraphModifier{Preset})
 ├─ DefaultParameter : string         (read only when Source == null, i.e. whole-text)
 └─ Enabled  : bool
```

- **Style = source/rule + modifier graph.** The rule decides *which ranges exist* and what parameter token each carries; the modifier decides *what happens to a range*. Nothing couples a tag name to an effect: `TagRule("b")` + `BoldModifier` is only a convention, and the same modifier can sit behind `<b>`, `<strong>`, `**x**` and a whole-text rule at once.
- A rule with `IsStandalone == true` (`NoparseTagRule`, `CodeSpanRule`, `BackslashEscapeRule`, `LineBreakParseRule`, `LatexTextRule`) needs no modifier: `new Style { Source = rule }` or `text.AddRule(rule)` (standalone rules only; others log an error).
- A modifier's `OnApply(in RangeApplyContext)` runs once per segment on the rebuild **worker thread**. Parameters arrive in `context.Parameters` (explicit tokens plus the source default, kept as separate layers) and are read with `Param.X.Resolve(this, in context)`.
- Instances are single-owner: a `Style`, rule or modifier cannot be in two components, twice in one list, or under two parents ("Range source X is already bound to another UniText parser", "same instance more than once", "node identity used more than once"). A `StylePreset` solves sharing: each component works on its own deep copies of the preset's styles, and `GetModifier<T>()` returns that component's copy.
- Lazy parser: a component with no local styles and no non-empty attached/global preset never creates an `AttributeParser`, so plain labels pay nothing for markup.

### What a fresh component understands

| Source of the component | Styles / presets | Global preset | Result |
|---|---|---|---|
| Menu `GameObject -> LightSide -> UniText -> UniText` (instantiates `UniTextSettings.TextPrefab`) | none / none | `UseGlobalStylePreset = true`, but `UniTextSettings.GlobalStylePreset` is null as shipped | no tags, no Markdown, no auto-detect, no escapes; `<br>` literal (needs `LineBreakParseRule`); `\n` works |
| `gameObject.AddComponent<UniText>()` | none / none | same | same |
| Any shipped Defaults prefab (Text, World Text, Button, Dropdown, Selectable, Editable, Input Field, Document View) | `[]` / `[]` | toggle on | same |
| The BasicUsage sample | built in code (`AddSharedStyles`) | - | sample-only vocabulary, not a default |

A designer's own text prefab with pre-filled `Styles`, assigned to the `textPrefab` slot (Project Settings -> LightSide -> UniText -> Editor Only), is a fourth way to give menu-created text a vocabulary. Because the shipped UI prefabs (Button label, Dropdown items, context menu, Input Field) also have `useGlobalStylePreset: 1`, a global preset applies to UI chrome and to every string unless the component opts out.

## Styles picker presets

Inspector **Styles -> +** creates one `Style` per pick. Both halves (Source, Modifier) stay editable afterwards (type dropdown per row, Default Parameter foldout). The picker is built from curated entries, then appends every other standalone `ParseRule` type, then every other concrete `BaseModifier` as a source-less whole-text entry, plus a blank `Custom...`. Top-level groups: **Whole Text, Tags, Inline Tags, Markdown, Auto-detect, Protection** (plus `LaTeX` and a second `Tags` entry for `<br>`). Under Whole Text and Tags a second level groups by modifier category (Common, Text Style, Decoration, Appearance, Layout, Interactive, Inline, Utility, Animation, Custom).

**Group Tags** — rule is `TagRule(name)`, default parameter empty, unless stated.

| Picker item (sub-group) | Syntax added | Modifier | Mobile / notes |
|---|---|---|---|
| Bold (Common) | `<b>` | `BoldModifier` | `OK`; `<b=700>`, `<b=700,f>` (synthetic), `<b=700,r>` (real face) |
| Italic (Common) | `<i>` | `ItalicModifier` | `OK` |
| Size (Common) | `<size>` | `SizeModifier` | `OK`; `24`, `150%`, `+10` |
| Color (Common) | `<color>` | `ColorModifier` | `OK`; hex or name |
| Underline / Strikethrough (Common) | `<u>` / `<s>` | `UnderlineModifier` / `StrikethroughModifier` | `OK` |
| Link (Common) | `<link>`, default parameter `;#4285F4` | deep copy of shipped `LinkPreset` root (Composite{Composite{LinkModifier + 3 Highlight}, Color, Underline}) | `LIMIT`: heavy graph (3 highlights + state rules per range); only where links exist |
| Uppercase / Lowercase / Small Caps (Text Style) | `<upper>` / `<lower>` / `<smallcaps>` | `UppercaseModifier` / `LowercaseModifier` / `SmallCapsModifier` | `OK` |
| Letter Spacing, Character Width, Word Spacing (Text Style) | `<cspace>`, `<cwidth>`, `<wspace>` | `LetterSpacingModifier`, `CharacterWidthModifier`, `WordSpacingModifier` | `OK`; `<cspace=5>`, `<cspace=0.1em>`; `<cwidth=1em>` / `auto` (monospace) |
| Variation, Font Features, Font, Language (Text Style) | `<var>`, `<feature>`, `<font>`, `<lang>` | `VariationModifier`, `FontFeatureModifier`, `FontModifier`, `LanguageModifier` | `OK`; `<font>` takes a `FontFamily.name` of the FontStack (case-sensitive); `<lang>` BCP 47; `<var>` axes `wght,wdth,ital,slnt,opsz`, `~` skips; `<feature>` e.g. `kern 0`, `-liga`, `tnum` |
| Alpha (Appearance) | `<alpha>` | `AlphaModifier` | `OK`; `0.5`, `50%`, `#80` |
| Material (Appearance) | `<mat>` | `MaterialModifier` | `LIMIT`: custom-material sub-mesh; keep out of HUD hot paths |
| Line Height, Paragraph Spacing, No Break (Layout) | `<line-height>`, `<pspace>`, `<nobr>` | `LineHeightModifier`, `ParagraphSpacingModifier`, `NoBreakModifier` | `OK`; `<pspace=10,4>` = after,before |
| Separator (Layout) | `<sep>`, `<sep/>`, `<sep=" ● ">` via `SeparatorParseRule` (default text: space, pipe, space) | `SeparatorModifier` | `OK`; collapsible separators |
| Ellipsis / Truncate (Layout) | `<ellipsis>` / `<truncate>` | `EllipsisModifier` / `TruncateModifier` | `OK`; `1` end, `0` start, `0.5` middle |
| Reveal (Layout) | `<reveal>` | `RevealModifier` | `OK`; typewriter engine, `<reveal=fade,50%>` |
| Spoiler (Interactive) | `<spoiler>` | deep copy of shipped `SpoilerPreset` root (Composite{Spoiler, Highlight cover}) | `LIMIT`: tap-to-reveal graph with state rules |
| Math (Inline) | `<math>...</math>` via `MathParseRule` (priority 10, default `MathDelimiters.Tags`) | `MathModifier` | `AVOID` in HUD: typesetting cost |

**Group Inline Tags**: Inline Object `<obj=name>` (`InlineTagRule("obj")` + `ObjModifier`), Inline Sprite `<sprite=name>` (`InlineTagRule("sprite")` + `SpriteModifier`). `InlineTagRule` is a void element: no `/` needed, a stray `</sprite>` is silently consumed. Needs sprite/object catalogs: see [unitext-inline-media.md](unitext-inline-media.md).

**Group Markdown** (`OK` unless stated):

| Item | Syntax | Rule -> modifier |
|---|---|---|
| Bold / Italic | `**x**` / `*x*` | `MarkdownWrapRule { Marker = "**" }` / `"*"` -> `BoldModifier` / `ItalicModifier` |
| Underline / Strikethrough | `++x++` / `~~x~~` | `MarkdownWrapRule { Marker = "++" }` / `"~~"` -> `UnderlineModifier` / `StrikethroughModifier` |
| Link | `[text](url)` | `MarkdownLinkParseRule { DefaultParameter = ";#4285F4" }` -> Link preset copy (`LIMIT`, as above) |
| Link (Raw URL), shown as "Auto-detect - URL" | bare `http(s)://`, `ftp(s)://`, `file://`, `mailto:`, `tel:`, `www.` | `RawUrlParseRule { DefaultParameter = ";#4285F4" }` -> Link preset copy; `LIMIT`: its scan stops at every h/f/t/m/w letter |
| List | `- x`, `* x`, `+ x`, `1. x`, `1) x` at line start | `MarkdownListParseRule` -> `ListModifier`; `LIMIT` on numeric HUD text (stops at every digit and `-*+`) |

`_italic_` / `__bold__` are not in the picker; build `MarkdownWrapRule { Marker = "_" }` yourself (underscore markers never toggle inside words).

**Group Auto-detect**: Interactive -> `TriggerWordParseRule` (trigger `@`) + `InteractiveModifier`; add a second one with trigger `#` for hashtags.

**Standalone sweep (no modifier, `Style.Source` only)**: Protection: Noparse Tag, Code Span, Backslash Escape; Tags: Line Break (`<br>`); LaTeX: Latex Text.

**Group Whole Text** (source-less: the modifier covers the whole text, `Style.DefaultParameter` is the parameter, no markup involved). Curated: Bold, Italic, Size, Uppercase, Lowercase, Small Caps, Color, Alpha, Letter Spacing, Character Width, Word Spacing, Line Height, Paragraph Spacing, No Break, Underline, Strikethrough, Ellipsis, Truncate, Reveal, **Fill, Stroke, Shadow, Glow, Inner Shadow, Extrude**, Variation, Font Features, Font, Language, Material. Then every other concrete modifier alphabetically by category: Ruby, ScriptPosition, Alignment, Arc, Curve, Direction, FontSizeMatch, Indent, LineGap, TextBoxTrim, Table, Highlight, GlyphResolution, Filter, Union, Composite, ModifierGraph, Empty, the animations (Wave, Wobble, Pulse, Bounce, Shake, Float, Pendulum, Spin, Glitch, Deform, Rolling, Scramble, Marquee), 3D modifiers when the 3D module is on, and `Custom...`. Paint layers and animations are `LIMIT` on mobile (extra per-glyph/mesh work; budget per screen, see [unitext-effects-paint.md](unitext-effects-paint.md) and [unitext-animation-phase.md](unitext-animation-phase.md)). **These entries are whole-text styles, not tags**: to make one answer to a tag, switch the row's Source type to *Tag* and name it, or build it with `Style.Tag(...)`.

**Inspector toggle row** (above the list: Bold, Italic | Uppercase, Lowercase, Small Caps, Letter Spacing | Underline, Strikethrough | Fill, Stroke, Shadow): each pill adds or removes the **whole-text** variant in the component's own `Styles`. It never enables a tag. A pill shows "on" only for the component's own styles, not preset/global ones. Beside it: `Use Global Style Preset (N)` (N = style count of the global preset).

## Tag grammar

| Syntax | Behavior |
|---|---|
| `<b>text</b>` | open tag, no parameter; range = text between |
| `<color=#FF0000>`, `<color="#FF0000">`, `<color='...'>` | value after `=` up to the first `>` outside quotes, trimmed; one pair of outer same-kind quotes stripped. A quoted value may contain `<` `>` |
| `<tag/>`, `<tag=v/>` | self-closing (a `/` right before `>`). On a plain `TagRule` it inserts U+FFFC (object replacement char) with the modifier span attached; meaningful only for inline-media modifiers |
| `<b #intro>`, `<color #warn=red>`, `<obj #icon=star/>` | `#label` anchor: exactly one space after the name, then `#` + letters/digits/`_`/`-`, before `=`, `/` or `>`. Stripped with the tag; travels as `ModifierRange.Label`. Closing tag stays `</b>`. `SeparatorParseRule` rejects labels |
| Name matching | ASCII case-insensitive (`<B>` matches `TagRule("b")`). The char after the name must be `>`, `=`, `/>` or ` #`. So `<bold>` is not `b`; `<b >`, `<color =red>`, `<color red>` do not match (stay literal). No aliases: use two rules or a `CompositeParseRule` |
| Close tag | exactly `</name>`, case-insensitive, no spaces, no parameters |
| Nesting | each rule instance has its own LIFO stack: `<b>a<b>b</b>c</b>` nests; different tags may overlap (`<b><i>x</b></i>` works) |
| Unclosed open tag | closed at end of text (range runs to the end; tag still stripped in static text) |
| Stray close tag | not matched -> literal `</b>` (for `InlineTagRule`/void rules it is silently consumed) |
| Unknown tag / tag with no registered rule | literal text, no warning |
| `<noparse>...</noparse>` | `NoparseTagRule`: content literal, markers stripped; a missing closer protects the rest of the text. Must be registered |
| `` `x` ``, ``` ``x`` ``` | `CodeSpanRule`: balanced backtick runs (CommonMark); backticks stripped, content literal and unstyled (no monospace); unmatched run stays literal |
| `\*`, `\<`, `\\`, `\[` | `BackslashEscapeRule`: backslash + any CommonMark ASCII punctuation char -> that literal char; backslash before anything else stays. Conflicts with LaTeX `\\` (use `LatexTextRule` instead; never both) |
| HTML entities (`&lt;`) | not decoded; use `\<` or noparse |
| URL ending in `/` inside a tag | `<link=https://x.com/>` is read as self-closing; quote it: `<link="https://x.com/">` |

**Parameter value grammar** (the part after `=`, after the outer-quote strip):
- `,` separates positional **slots** of one modifier (`<pspace=10,4>`). An empty slot keeps the default (`<pspace=,4>`); `""` / `''` is a set empty string.
- `;` separates **children of a `CompositeModifier`** (one segment per child, in child order). A child that splits again takes its list as one parenthesized segment: `<x=((bold;italic);red);2>`, `<link=(https://a.com);#3B82F6;solid>`. A bare value reaches the first child of a nested graph.
- Parentheses group only where `;` splits; `rgb(255,0,0)` stays one token; an unbalanced `(` is plain text; a literal group is `"(a;b)"` or `\(a;b\)`.
- Escapes inside a slot: `\,` `\;` `\\` `\'` `\"` `\(` `\)`. Quotes shield `,` `;` `(`. Whitespace around a token is trimmed.
- Vectors are one slot with a space between axes: `<wave=0 8,2,0.25>` slot 1 is Vector2 `0 8`. `UnitValue`: `24`, `10px`, `150%`, `0.5em`, `+10`, `-5` (signed suffix-less = delta in an absolute context; suffixes `px % em delta abs`).
- Numbers use invariant culture; infinities, `NaN` and values beyond ±10,000,000 count as absent (the slot falls back). Bool: prefix of `true/yes/on/1` or `false/no/off/0`. Enum: full member name (case-insensitive) or a single character when unique. Colors: `#RGB`, `#RRGGBB`, `#RRGGBBAA`, or a name (white black red green blue yellow cyan magenta orange purple gray grey lime brown pink navy teal olive maroon silver gold; `green` = (0,128,0), `lime` = (0,255,0)).
- Link-like sources (`MarkdownLinkParseRule`, `RawUrlParseRule`, `TriggerWordParseRule`) hand the value as an opaque primary (URL/word verbatim; commas and semicolons allowed); their `DefaultParameter` merges behind it. `<link=...>` via `TagRule` is positional, so a URL containing `,` or `;` must be quoted/escaped (`\,`) or written as `[text](url)`.

**Default parameter merge** (`TagRule.DefaultParameter`, `Style.DefaultParameter`): per `;`-group, then per `,`-slot, a non-empty tag token wins and an empty/missing slot takes the default's token (default `"10,4"` + `<pspace=,6>` gives `10,6`); trailing separators are trimmed; nested groups merge by child then slot. The default applies to ranges produced by that rule instance (`TagRule`, `MarkdownWrapRule`, `MarkdownLinkParseRule`, `RawUrlParseRule`, `TriggerWordParseRule`, `FixedRangeSource.Entry.Parameter`) and, for whole-text, `Style.DefaultParameter`. An explicit but unparsable token (`<warning=banana>` with default `#FF0000`) resolves to the modifier's own field value, not the rule default.

### Parse walk, priority, collisions

1. All registered `ParseRule`s (leaf or composite) are collected in registration order (local, then presets in list order, then global) and sorted by `Priority` descending.
2. The text is scanned left to right. A jump table built from the union of the rules' `ScanTriggers` skips plain runs (disabled for the whole component if any rule returns `null` triggers). At each stop the rules are tried in sorted order; the **first whose `TryMatch` returns `> index` claims the position**, the walk resumes after its end, and no lower rule sees those characters. Then every rule's `Finalize` runs (closes unclosed tags).
3. Hence protection rules (`int.MaxValue`) always win, then longer Markdown markers, then tags, then auto-detect (negative).
4. A matched rule's markup is stripped from the rendered text; self-closing forms are replaced by their insert string.
5. **Collision**: when two rules claim the same syntax (two `TagRule("b")`) the first in the sorted list wins and the loser never fires. "Local overrides component preset overrides global" holds by registration order, but the sort is `List<T>.Sort` on `Priority` only, so among equal priorities the order is reliable only for small lists. Never rely on override order in a large vocabulary: keep tag names unique across local/preset/global.

| Rule | Priority |
|---|---|
| `NoparseTagRule`, `CodeSpanRule`, `BackslashEscapeRule` | `int.MaxValue` |
| `MathParseRule` | 10 |
| `MarkdownWrapRule` | marker length (`**`=2, `*`=1, `~~`/`++`=2) |
| `LineBreakParseRule` (`<br>`), `SeparatorParseRule` (`<sep>`) | 1 |
| `TagRule`, `InlineTagRule`, `MarkdownLinkParseRule`, `MarkdownListParseRule`, `RubyParseRule`, default `ParseRule` | 0 |
| `RawUrlParseRule`, `TriggerWordParseRule` | -100 |
| `CompositeParseRule` | max of its children (0 when empty) |

Consequences: `**x**` is tried before `*x*`; `* item` lists survive because `*` followed by a space cannot open emphasis (flanking), so the list rule gets it; `2 * 3` stays literal; a URL inside an opening tag (`<link=https://x>`) or a Markdown link target is not re-detected by `RawUrlParseRule` (the explicit rule consumed it), while a URL in the content of `<b>...</b>` is.

## Tag vocabulary bootstrap

Goal: after this section a project has a working, project-wide tag vocabulary. The mechanism is the same on every route: **create `Style` objects (each with its own rule and modifier instances) and put them in a list the component reads.** The three places, in registration order: the component's `Styles`, the component's `StylePresets`, the global preset.

Rules that hold for every route:
1. A tag exists only if a `Style` names it. Standalone rules (`<br>`, `<noparse>`) are styles with a `Source` and no modifier.
2. Create fresh `Style`/rule/modifier instances for every list. Never put one instance in two lists, two components or two `Style`s. Return new objects from a factory method.
3. `UniTextSettings.GlobalStylePreset` needs the `UniTextSettings` asset at `Resources/UniTextSettings.asset` (created from Project Settings -> LightSide -> UniText, or by the package installer). If it is missing, `UniTextSettings.Instance` logs an error and the assignment is ignored. The settings asset references the preset, so the preset ships in player builds.
4. Components pick up the global preset only while `UseGlobalStylePreset` is on (default). Menu-created, `AddComponent`-created and prefab text behave the same.
5. The global preset also feeds UI chrome (Button/Dropdown/Input Field/context-menu text) and every user-visible string. Keep it lean (below); put Markdown, auto-detect and heavy graphs in per-component presets.
6. Changing a preset asset or its `Styles` list updates every using component live (Edit and Play Mode). Components apply new styles on the next rebuild (frame).

### Recommended starter vocabulary (a convention, not shipped)

These names are the common rich-text spellings. UniText does not define them; the table is what to register. Exact slot lists per modifier are in [unitext-formatting-tags-quickref.md](unitext-formatting-tags-quickref.md).

| Tag | Registered as | Example |
|---|---|---|
| (protection) | `new Style { Source = new NoparseTagRule() }` | `<noparse><b></noparse>` prints `<b>` |
| `<br>` | `new Style { Source = new LineBreakParseRule() }` | soft line break in the same paragraph (`\n` = new paragraph) |
| `b` | `Style.Tag(new BoldModifier(), "b")` | `<b>CRIT</b>`, `<b=700>` |
| `i` | `Style.Tag(new ItalicModifier(), "i")` | `<i>whisper</i>` |
| `u` | `Style.Tag(new UnderlineModifier(), "u")` | `<u>hint</u>` |
| `s` | `Style.Tag(new StrikethroughModifier(), "s")` | `<s>old price</s>` |
| `color` | `Style.Tag(new ColorModifier(), "color")` | `<color=#FF4040>-35</color>`, `<color=red>` |
| `size` | `Style.Tag(new SizeModifier(), "size")` | `<size=150%>`, `<size=24>`, `<size=+10>` |
| `alpha` | `Style.Tag(new AlphaModifier(), "alpha")` | `<alpha=50%>`, `<alpha=0.5>`, `<alpha=#80>` |
| `cspace` | `Style.Tag(new LetterSpacingModifier(), "cspace")` | `<cspace=2>`, `<cspace=0.1em>` |
| `line-height` | `Style.Tag(new LineHeightModifier(), "line-height")` | block spacing |

Optional additions, same pattern: `upper` / `lower` / `smallcaps` (`UppercaseModifier`, `LowercaseModifier`, `SmallCapsModifier`), `sup` / `sub` (R6), semantic colours (R4), `BackslashEscapeRule` (only if content uses `\<` escaping; it also eats `\` before any punctuation, e.g. Windows paths), `link` (R8), `sprite` / `obj` ([unitext-inline-media.md](unitext-inline-media.md)), effect tags (R21). Keep Markdown rules and `RawUrlParseRule` out of the global preset: they hit every string.

If the content comes from TextMeshPro, the migration tool builds the equivalent global preset itself ([unitext-tmp-migration.md](unitext-tmp-migration.md)): `b i u s strikethrough mark nobr smallcaps lowercase lower uppercase allcaps upper sub sup size color alpha font font-weight align cspace mspace cwidth indent line-indent margin-left line-height var link` plus `<br>`. `sub`/`sup` share `ScriptPositionModifier` (defaults `sub` / `super`); `link` is the shipped `LinkPreset`.

### Shared factory (runtime assembly; used by routes B and C)

```csharp
// signatures checked against package source; not compiled
using System.Collections.Generic;
using LightSide;

public static class GameTextVocabulary
{
    // Returns FRESH instances on every call: one list per component or per preset.
    public static List<Style> CreateStyles() => new List<Style>
    {
        new Style { Source = new NoparseTagRule() },       // protection first (standalone, no modifier)
        new Style { Source = new LineBreakParseRule() },   // <br>
        Style.Tag(new BoldModifier(),          "b"),
        Style.Tag(new ItalicModifier(),        "i"),
        Style.Tag(new UnderlineModifier(),     "u"),
        Style.Tag(new StrikethroughModifier(), "s"),
        Style.Tag(new ColorModifier(),         "color"),
        Style.Tag(new SizeModifier(),          "size"),
        Style.Tag(new AlphaModifier(),         "alpha"),
        Style.Tag(new LetterSpacingModifier(), "cspace"),
        Style.Tag(new LineHeightModifier(),    "line-height"),
    };
}
```

### Route A: inspector only (no code)

1. `Assets -> Create -> LightSide -> UniText -> Style Preset` (or Project window Shift+Right-Click -> UniText -> Style Preset). Name it for the game.
2. Select it, **Styles -> +**: Tags/Common *Bold*, *Italic*, *Underline*, *Strikethrough*, *Color*, *Size*; Tags/Appearance *Alpha*; Tags/Text Style *Letter Spacing*; Tags/Layout *Line Height*; the standalone *Line Break* (`<br>`); Protection *Noparse Tag*. Add *Link* only when links are used.
3. `Edit -> Project Settings -> LightSide -> UniText -> Styling -> Global Style Preset` = that asset.
4. Any text with `Use Global Style Preset` on now parses the tags; the component shows `Use Global Style Preset (N)`.

### Route B: editor script (reproducible, global preset)

Editor-only assembly referencing `LightSide.UniText` and `LightSide.Core` (plus the runtime assembly holding `GameTextVocabulary`).

```csharp
// signatures checked against package source; not compiled
#if UNITY_EDITOR
using LightSide;
using UnityEditor;
using UnityEngine;

public static class GameTextVocabularyMenu
{
    [MenuItem("Tools/Game/Build Global Text Vocabulary")]
    private static void BuildInteractive()
    {
        var path = EditorUtility.SaveFilePanelInProject(
            "Global text vocabulary", "GameTextStyles", "asset", "Where to store the StylePreset.");
        if (!string.IsNullOrEmpty(path)) Build(path);
    }

    public static StylePreset Build(string assetPath)
    {
        var preset = AssetDatabase.LoadAssetAtPath<StylePreset>(assetPath);
        if (preset == null)
        {
            preset = ScriptableObject.CreateInstance<StylePreset>();
            AssetDatabase.CreateAsset(preset, assetPath);          // create the asset first, then fill it
        }
        preset.Styles.ReplaceAll(GameTextVocabulary.CreateStyles()); // one transition, idempotent re-run
        EditorUtility.SetDirty(preset);

        var settings = UniTextSettings.Instance;                   // logs an error when Resources/UniTextSettings.asset is missing
        if (settings != null)
        {
            UniTextSettings.GlobalStylePreset = preset;            // components reconcile live
            EditorUtility.SetDirty(settings);
        }
        AssetDatabase.SaveAssets();
        return preset;
    }
}
#endif
```

Result: every `UniText`/`UniTextWorld` with the default `UseGlobalStylePreset` renders `<b>`, `<color=...>`, `<br>` etc. Gotcha: if `UniTextSettings.Instance` is null the preset still exists; assign it in Project Settings after the settings asset is created.

### Route C: code-only, per component (the four `Style` builders)

No assets. Use for a few special components, tests, or generated UI.

```csharp
// not compiled; signatures verified
using LightSide;

public static void ApplyVocabulary(UniText text)
{
    text.UseGlobalStylePreset = false;                    // optional: this component owns its vocabulary
    text.Styles.ReplaceAll(GameTextVocabulary.CreateStyles());   // bulk = ONE re-parse (Add per style = one each)

    // the four builders, each returns a Style that you add to text.Styles:
    text.Styles.Add(Style.Tag(new ColorModifier(), "warning", "#FF0000"));          // tag (+ default parameter)
    text.Styles.Add(Style.WholeText(new LetterSpacingModifier(), "1"));              // no markup, whole text
    text.Styles.Add(Style.Range(new UnderlineModifier(), 0, 5));                     // fixed [0,5) rendered codepoints
    text.Styles.Add(Style.FromSource(new MarkdownWrapRule { Marker = "**" },         // any source FIRST, then modifier
                                     new BoldModifier()));
    text.Text = "Deal <b>12</b> damage, <warning>low HP</warning>, **bold** too";
}
```

`new Style { Source = ..., Modifier = ..., DefaultParameter = "..." }` is equivalent to the builders. Builders throw `ArgumentNullException` for a null modifier/source and `ArgumentException` for an empty tag name.

### Verify it works

Create text `<b>A</b> <color=#FF0000>B</color>`: the tags must vanish, A bold, B red. If they print literally: no style for that name, `UseGlobalStylePreset` off (route C sets it off on purpose), the global slot is empty or the preset is empty, the style's eye toggle is off, or the tag is malformed (`<b >`, `<color =red>`). There is no warning for any of these. Inspector hint: the component shows `Use Global Style Preset (N)`; N = 0 means an empty or missing global preset.

## Parameter system

**Cascade** (weak to strong, per slot): modifier field -> rule default (`DefaultParameter`) -> markup token -> owned value (`Own`). `ParameterDescriptor<TModifier,TValue>.Resolve(modifier, in context)` runs the cascade then applies owned values by `ParameterComposition` and priority. `TryResolve` also reports whether a token, default or ownership supplied the value. A subclass's own `[Parameter]` fields occupy slots **before** inherited ones; never guess `<tag=a,b,c>` order, read the modifier's declaration order or the inspector's Default Parameter list. `Slot == -1` means no markup presence (`[SlotlessParameter]`).

| Item | Meaning |
|---|---|
| `[GenerateParameters]` (class) | opt in; class must be `partial`; the generator emits a nested `static partial class Param` (one descriptor per parameter, field name in PascalCase), `Param.All` and `Descriptors` |
| `[Parameter]` (field) | next positional markup slot in declaration order. Options: `Parser = nameof(StaticMethod)` (`static bool M(ReadOnlySpan<char> token, out T value)`), `Operations = nameof(IParameterOps<T> member)`, `Invalidate = nameof(instance void M())`, `Descriptor = false` (slot + editor schema, no cascade/ownership) |
| `[SlotlessParameter]` | cascade + ownership + rules/clips, no markup slot (animation `Phase`) |
| `[ParameterContainer(Invalidate = ...)]` | flattens a `[SerializeReference]` object's `[Parameter]` fields into the owner's schema; `Invalidate` mandatory; no nesting |
| Inspector-only: `[Unit(...)]`, `[Options("@paints")]`, `[Variant(...)]`, `[VisibleWhen]`, `[Essential]` | do not affect parsing |
| `[DefaultParameter]` | on a string field named `defaultParameter` of a `ParseRule` / `Style` / `FixedRangeSource.Entry` / `ChromeRule`: the inspector draws the parameter list generated from the paired modifier. Not used on modifiers |
| Descriptor API | `Id` (field name; what bindings persist), `DisplayName`, `Slot`, `ValueType`, `ModifierType`, `SupportedCompositions`; `Resolve`, `ResolveCascade`, `TryResolve`, `ReadRoot`, `SetRoot`, `Lerp`, `Compose` |
| Token types parsed automatically | `float`, `int`, `bool`, `string`, `Vector2`, **`Color32`**, `UnitValue`, `UnitVector2`, any enum; `IMarkupValue` structs (`ToToken`/`FromToken`; built-ins `PaintRef`, `ItalicStyle`, `SpriteColorRef`). Anything else (`UnityEngine.Color`, `Vector3`, `Sprite`) needs `Parser=` or is opaque (no markup parse) |
| `ParameterComposition` | `Replace` (highest priority wins), `Add`, `Multiply`, `Custom` (via `WithCustom(func, neutral)`) |
| Supported by type | `float`/`int`/`Vector2`: Add + Multiply; `Color32`: Multiply only; `UnitValue`/`UnitVector2`: Add (mixed units cannot combine: the owned value wins whole), no Multiply; enums/`bool`/`string`/unknown: Replace only |
| Ownership | `ModifierRange.Own(param[, composition, priority])` -> `OwnedParameter<T>` (`Value`, `Baseline`, `IsAlive`, `Release`/`Dispose`); `RangeQuery.Own(...)` -> `OwnedParameterSet<TModifier,T>` (`Value` broadcast, `Count`, `GetRange(i)`, `SetValue(i, v)`, `Withhold()`, `Release()`, `Changed`); `BaseModifier.Own(...)` = every range |
| Range queries | `modifier.Ranges()` -> immutable `RangeQuery`: `WhereLabel`, `WhereParameter`, `WhereToken`, `WhereBare`, `WherePrimaryValue`, `WhereChannel`, `Intersecting`, `Within`, `Where`, `Skip`, `Take`, `Collect`, `Matches`. `modifier.GetRanges(List<ModifierRange>)` throws if the modifier is not attached. `ModifierRange`: `Range`, `Identity`, `Segment`, `PrimaryValue`, `Label`, `Channel`, `Resolve(param)`, `Own`. A range stays addressable while its `Identity` survives; an edit inside it retires it and releases ownership |
| `ParameterReader` (public ref struct) | for hand-written parsers: `Next`, `TryPeek`, `NextFloat/NextInt/NextColor/NextEnum<T>/NextString/NextVector2/NextUnitFloat/NextUnitVector2`, static `ParseFloat` |

## C# API for styles, presets, queries

| Member (on `UniTextBase`: UniText, UniTextWorld, UniText3D) | Purpose |
|---|---|
| `Styles` (`StyledList<Style>`) | local list: `Add`, `Insert`, `Remove`, `RemoveAt`, `Clear`, `Move`, `Replace`, `ReplaceAll(IEnumerable<Style>)` (one transition = one re-parse), indexer, `IndexOf`, `Contains`, `ToArray`, `Count`, `Changed` |
| `StylePresets` (`StyledList<StylePreset>`) | per-component presets, same list API; null items and duplicates rejected |
| `UseGlobalStylePreset` (bool) | opt out of the project-wide preset (debug overlays, raw logs, user text) |
| `AddRule(ParseRule)` / `RemoveRule(ParseRule)` | standalone rules only |
| `GetModifier<T>()`, `TryGetModifier<T>(out T[, out Style])`, `GetModifiers<T>(List<T>, bool includeChildren=false)`, `HasModifier<T>()`, `TryGetStyle<T>(out Style)`, `GetStylesOfType<T>()` | search local, then preset copies, then global; descend into composites; return the component's own live copy; `T` may be an interface. Calling them attaches the parser (safe before the first rebuild) |
| `SetWholeText<T>(string parameter=null)`, `ClearWholeText<T>()`, `ToggleWholeText<T>(...)`, `GetWholeTextParameter<T>()` | manage a LOCAL whole-text style of modifier type `T` (updates in place) |
| `EnsureStyleFor<T>(ParseRule rule)` / `EnsureStyleFor(BaseModifier, ParseRule)` | merge another syntax into the existing LOCAL style of that modifier type through a `CompositeParseRule`; creates the style if none; a modifier that exists only in a preset is not found, so a new local style is created |
| `StylePreset.Styles`, event `DeltaChanged(StylePreset, in StylePresetChange)` | preset content (`StylePreset.Changed` no longer exists) |
| `UniTextSettings.GlobalStylePreset` (static get/set) | project-wide preset; the setter fires settings `Changed` and components reconcile live |
| `TagRule`: ctor `TagRule()` / `TagRule(string)`, props `Tag`, `Name`, `TagName`, `DefaultParameter` | `InlineTagRule(string)` same, void semantics |

Every `Styles.Add/Remove` publishes a structural change and re-parses on the next frame: use `ReplaceAll` for bulk and never add styles per frame. Mutate on the main thread.

## Parse rule catalog

| Rule | Syntax / behavior | Pri | Standalone | Mobile |
|---|---|---|---|---|
| `TagRule` | `<name>...</name>`, `<name=v>`, `<name/>`, `<name #label=v>`; props `Tag`, `DefaultParameter` | 0 | no | `OK`; cost grows with the number of tag rules at each `<` |
| `InlineTagRule` (sealed) | void: `<name>`/`<name=v>` always inserts one U+FFFC; stray `</name>` consumed | 0 | no | `OK` |
| `SeparatorParseRule` | `<sep>`, `<sep/>`, `<sep=" ● ">`; ctor `(tagName, separator)`; pairs with `SeparatorModifier` | 1 | no | `OK` |
| `LineBreakParseRule` | `<br>`, `<br/>`, `<br />` (spaces/tabs before `/`/`>`); inserts U+2028 soft break (same paragraph, no paragraph spacing); `\n` = new paragraph | 1 | yes | `OK` |
| `RubyParseRule` | `<ruby>base<rt>reading</rt></ruby>`; several `<rt>` allowed; `<rp>` stripped; `<rt>`/`<rp>` end tags optional; shorthand `<ruby=reading>base</ruby>`; `</ruby>` required else literal; tags inside the base are not parsed; pair with `RubyModifier`; not curated in the picker (choose it as Source type) | 0 | no | `OK` |
| `MarkdownWrapRule` | `marker x marker`, CommonMark flanking; `_` markers never toggle intraword; `2 * 3` stays literal; `Marker`, `DefaultParameter` | marker length | no | `OK` |
| `MarkdownLinkParseRule` | `[text](url)`; no newline inside; balanced brackets; empty URL = no match | 0 | no | `OK` |
| `MarkdownListParseRule` | line-start bullets and `1.` / `1)` numbers (up to 9 digits); nesting by indent; `spacesPerLevel`=2; parameter `level` or `level,number` for `ListModifier` | 0 | no | `LIMIT`: every digit/`-*+` is a scan stop; not for numeric HUD text |
| `RawUrlParseRule` | `http(s)://`, `ftp(s)://`, `file://`, `mailto:`, `tel:`, `www.` (becomes `https://`); non-word char before; trailing `.,;:!?` and unbalanced `)` trimmed; style-only (text stays) | -100 | no | `LIMIT`: every h/f/t/m/w letter stops the scan |
| `TriggerWordParseRule` | `@name`, `#tag`; trigger at word start, at least one word char; ctor `(string trigger)`; `extraWordChars`; email `a@b` stays plain | -100 | no | `OK` |
| `StringParseRule` | literal case-sensitive `patterns[]` replaced by `replacement` (or removed) | 0 | no | `OK` |
| `CompositeParseRule` | tries children in order at each position; `Rules` (`TypedList<ParseRule>`, `ReplaceAll`) | max child | no | `OK` |
| `NoparseTagRule`, `CodeSpanRule`, `BackslashEscapeRule` | see grammar | `int.MaxValue` | yes | `OK` |
| `MathParseRule` | `<math>...</math>` (default), LaTeX `\(..\)`, `$..$`, `\ce{}`, `\pu{}`, display forms `\[..\]`, `$$..$$`; `Delimiters` | 10 | no | `AVOID` in HUD: typesetting |
| `LatexCommandRule`, `LatexTextRule`, `LatexSizeRule`, `LatexAlignmentRule`, `LatexListRule`, `LatexSpacingRule`, `TabularParseRule` | LaTeX subset (`\textbf{}`, `\\`, `\tiny..\Huge`, `center`, `itemize`, `\vspace`, `tabular`); `LatexTextRule` replaces `BackslashEscapeRule` | - | `LatexTextRule` yes | `AVOID` in HUD; rare |
| `ChromeRule` + `IMarkupSelector` | styles visible tag characters in editable text (`UniTextEditable.MarkupChrome`) | - | - | editing area only |

Every custom rule must override `MarkupTriggers`: a rule with `null` triggers turns the jump scan off for the **whole component** (every rule, every character).

### Range sources other than parse rules

| Source | Use | Key API |
|---|---|---|
| none (`Style.Source == null`) | whole text; `Style.DefaultParameter` is the parameter | `Style.WholeText` |
| `FixedRangeSource` | few authored spans in rendered (markup-stripped) codepoint coordinates; `Entry{Range, Parameter}`; `Range` is C# range text `0..5`, `^10..`, empty = whole; invalid -> `FormatException` | `new FixedRangeSource(start, end, param)`, `.Entries`; `Style.Range` |
| `MutableRangeSource` | runtime-driven ranges that survive edits: search hits, diagnostics, annotations | `SetIdentity(string)`, `BeginUpdate(TextRevision/TextSnapshot)` -> `Add`, `Move`, `SetParameters`, `Remove`, `Clear`, `Commit` (via `using`), `SetRanges`, `Count`, `Snapshot` |
| custom `RangeSource` | any producer | override `CollectRanges(in TextSnapshot, RangeMatchWriter)`; `writer.Add(TextRange, parameter, ...)`; `NotifyChanged()`; add via `Style.FromSource` |

## Authoring custom modifiers and rules

### Custom modifier (marker: reads data back, draws nothing)

```csharp
// not compiled; pattern taken from EmptyModifier + LanguageModifier
using System;
using System.Collections.Generic;
using LightSide;
using UnityEngine;

[Serializable]
[TypeDescription("Marks a range with a game keyword id; no visual effect.")]
[GenerateParameters]                                   // class MUST be partial (UTP001)
public partial class KeywordModifier : BaseModifier
{
    [Tooltip("Keyword id. A tag value overrides it.")]
    [SerializeField, Parameter, Essential, StateProperty(nameof(MarkTextDirty))]
    private string id = "";                            // generates public Id and Param.Id
}

// register (preset or component), then use the markup:
//   text.Styles.Add(Style.Tag(new KeywordModifier(), "kw"));   text.Text = "Deal <kw=burn>burning</kw> damage";
// read after a rebuild (e.g. in a LayoutCommitted handler):
var list = new List<ModifierRange>();
text.GetModifier<KeywordModifier>().GetRanges(list);   // throws if not attached; GetModifier attaches
foreach (var r in list)
{
    string id = r.Resolve(KeywordModifier.Param.Id);   // "burn": token > rule default > field
    TextRange span = r.Range;                          // rendered-codepoint start/length
}
```

For tap/hover on keywords prefer `<link=kw:burn>` + `LinkClicked` ([unitext-interaction-links.md](unitext-interaction-links.md)); this marker pattern is for read-only data.

### Custom modifier that edits codepoints

```csharp
// not compiled; pattern from UppercaseModifier
[Serializable]
[GenerateParameters]
public partial class MaskModifier : BaseModifier
{
    [SerializeField, Parameter, StateProperty(nameof(MarkTextDirty))]
    private string mask = "*";

    protected override void OnApply(in RangeApplyContext context)   // WORKER thread: no Unity API
    {
        var token = Param.Mask.Resolve(this, in context);
        int symbol = string.IsNullOrEmpty(token) ? '*' : token[0];
        var range = context.Segment.Range;
        var codepoints = buffers.codepoints.Span.Slice(range.start, range.length);
        for (var i = 0; i < codepoints.Length; i++)
            if (codepoints[i] > ' ') codepoints[i] = symbol;
    }
}
// text.Styles.Add(Style.Tag(new MaskModifier(), "mask"));  "<mask>secret</mask>"
```

Rules: a modifier without `OnApply` still gets ranges. Optional hooks: `OnEnable`/`OnDisable`/`OnDestroy`, `BeforeApply` (clear per-parse accumulators here, never in `OnApply`/`OnEnable`), `PrepareForParallel` (`protected internal override`; cache main-thread-only values), `Invalidate = nameof(Method)` on `[Parameter]`. Use `Color32` for colour parameters; any other non-built-in type needs `[Parameter(Parser = nameof(TryParseMine))]` with `static bool TryParseMine(ReadOnlySpan<char> token, out T value)` (precedent `AlphaModifier.ParseAlpha`). Pooled per-glyph data derives from `GlyphModifier<T>` / `PooledAttributeModifier<T>` (custom `AttributeKey`); layout hooks from `RangeCollectingModifier`; animations from `GlyphParamModifier<TParams>` (see [unitext-animation-phase.md](unitext-animation-phase.md)).

### Custom parse rule (`[[term]]`, only `TryMatch` is required)

```csharp
// not compiled; pattern from NoparseTagRule / CodeSpanRule
using System;
using LightSide;

[Serializable]
public sealed class DoubleBracketRule : ParseRule
{
    public override int Priority => 1;               // beat MarkdownLinkParseRule's '[' (priority 0)
    public override string MarkupTriggers => "[";    // REQUIRED for the fast scan; null disables it component-wide
    public override string TypingTriggers => "[]";   // used by editable text

    public override int TryMatch(ReadOnlySpan<char> text, int index, PooledList<ParsedRange> results)
    {
        if (text[index] != '[' || index + 1 >= text.Length || text[index + 1] != '[') return index;
        var rest = text.Slice(index + 2);
        var close = rest.IndexOf("]]".AsSpan());
        if (close <= 0 || rest.Slice(0, close).IndexOf('\n') >= 0) return index;   // return index = no match
        var contentStart = index + 2;
        var closeStart = contentStart + close;
        // open markup [index, contentStart) and close markup [closeStart, closeStart+2) are stripped
        results.Add(new ParsedRange(index, contentStart, closeStart, closeStart + 2));
        return closeStart + 2;                       // index after the match
    }
}
// text.Styles.Add(Style.FromSource(new DoubleBracketRule(), new ColorModifier { Color = new Color32(255, 215, 0, 255) }));
```

Contract: return `> index` only when you consume characters. `ParsedRange(openStart, openEnd, closeStart, closeEnd, parameter = null)`; `ParsedRange.SelfClosing(openStart, openEnd, insertString, parameter, label)` replaces a token with text; `closeStart = closeEnd = -1` for syntaxes without a close marker. State kept in the instance must be reset in `Reset()` and flushed in `Finalize` (the walk calls both around every parse; one rule instance serves one parser; walks are not re-entrant). Serialized fields on a rule need `partial` + `[StateProperty(nameof(NotifyChanged))]`, plus a string field named `defaultParameter` marked `[DefaultParameter]` for the inspector parameter list. Override `Identity` when instances can be configured differently; `SourceToken`/`CanWrap`/`Apply` only if the editor should re-emit your syntax.

### Compile diagnostics a custom author meets

| Id | Meaning |
|---|---|
| UTP001 | `[GenerateParameters]` type is not `partial` |
| UTP002 | `[GenerateParameters]` type declares no `[Parameter]` / `[SlotlessParameter]` fields |
| UTP003 | `[ParameterContainer]` field without `Invalidate` |
| UTP004 | a modifier declares `[Parameter]` / `[ParameterContainer]` without `[GenerateParameters]` (error since 3.20) |
| LSST0xx (Core state generator) | state contract. Every serialized field of a `BaseModifier` / `RangeSource` subclass must declare exactly one of `StateProperty`, `StateField`, `StateCollection`, `StateList`, `StatePassive`; the type and all containing types must be `partial`; a tracked field must be changed through its generated property (never assign the backing field); handler signatures must be `void M()` or `M(StateMember member = default)` |

The generators ship as Roslyn analyzer DLLs in `<UniTextRoot>/Analyzers` (and Core's `Analyzers`) labelled `RoslynAnalyzer`, not under an asmdef folder, so they are expected to apply to every assembly. Whether they run for a user-owned asmdef is not confirmed (see Unverified): compile a custom modifier once and check that `Param` exists before building on it.

## Sharing, threading, performance

- **Per-component copies.** `StylePreset.CreateRuntimeStyles` deep-copies the preset's styles for each component on first parse, so a preset costs memory per component. Editing the preset asset reaches every user; editing a copy via `GetModifier<T>()` affects only that text. The reference from `GetModifier<T>()` stays valid across disable/enable and preset edits.
- **Rule cost** = number of rules x trigger positions in the text, per component. A large global preset multiplied by hundreds of pooled labels is wasteful: lean global preset (the starter vocabulary), heavy graphs (Link, Spoiler, Math, LaTeX, Material, Table) only through per-component `StylePresets`, and `UseGlobalStylePreset = false` for HUD numbers and damage text (no parser, no copies).
- **Worker threads.** `OnApply`, `TryMatch`, `Finalize` run on rebuild worker threads: no Unity API, no `Resources.Load`, no `Transform`; cache main-thread values in `PrepareForParallel`. A modifier stays enabled across re-parses, so per-parse state belongs in `BeforeApply`; a `PooledAttributeModifier<T>` subclass overriding `OnDisable`/`BeforeApply` must call `base`.
- **Animators.** `ModifierFieldsAnimationHandler` (Animator) animates only the component's own `Styles`; `UniTextDriver` clips can also target presets and the global preset.
- **Disabled styles** (`Style.Enabled = false`) are skipped by parser, render and queries; their tag then prints literally.

## Recipes

All C# below needs `using LightSide;`. Signatures come from the package source and its BasicUsage sample, not from a compile run; compile once in the editor.

**R4. Semantic colour tags with defaults (rarity, UI states).**
```csharp
preset.Styles.Add(Style.Tag(new ColorModifier(), "common",    "#B0B0B0"));
preset.Styles.Add(Style.Tag(new ColorModifier(), "rare",      "#4D8BFF"));
preset.Styles.Add(Style.Tag(new ColorModifier(), "legendary", "#FFA500"));
```
`"Dropped <rare>Frost Blade</rare>"`; per-use override `<rare=#FFFFFF>...</rare>` (token wins). One palette lives in the asset and localized strings keep only semantic tags. Each `Style` owns its own `ColorModifier`. Gotcha: do not nest two colour tags that must blend (same attribute key; the range applied last wins a contested codepoint).

**R5. One tag, several effects, per-child defaults with `;`.**
```csharp
var crit = new CompositeModifier();
crit.Modifiers.ReplaceAll(new BaseModifier[] { new ColorModifier(), new SizeModifier(), new BoldModifier() });
preset.Styles.Add(Style.Tag(crit, "crit", "#FFD23F;150%"));   // child0 colour ; child1 size ; child2 bold
```
`<crit>128!</crit>` is gold, 150 %, bold. `<crit=#FF3030>` changes only the colour; `<crit=;200%>` only the size; a bare value goes to the first child. Slots inside one child still use `,`.

**R6. Several syntaxes, one modifier.**
```csharp
var boldRule = new CompositeParseRule();
boldRule.Rules.ReplaceAll(new ParseRule[] { new TagRule("b"), new TagRule("strong"), new MarkdownWrapRule { Marker = "**" } });
preset.Styles.Add(Style.FromSource(boldRule, new BoldModifier()));
var script = new CompositeParseRule();                       // sup/sub: one modifier, two defaults
script.Rules.ReplaceAll(new ParseRule[] { new TagRule("sup") { DefaultParameter = "super" }, new TagRule("sub") { DefaultParameter = "sub" } });
preset.Styles.Add(Style.FromSource(script, new ScriptPositionModifier()));
```
A composite's priority is its highest child's. On a live component `text.EnsureStyleFor<BoldModifier>(new TagRule("strong"))` merges into the existing LOCAL bold style.

**R7. Named ranges and runtime override.**
```csharp
text.Styles.Add(Style.Tag(new ColorModifier(), "color"));
text.Text = "Stock <color #alert=red>low</color>, restock <color #alert=red>today</color>";
var color = text.GetModifier<ColorModifier>();                  // attaches the parser
var alert = color.Ranges().WhereLabel("alert").Own(ColorModifier.Param.Color);   // keep in a field
alert.Value = new Color32(255, 64, 64, 255);                    // every labelled range
alert.SetValue(0, new Color32(255, 160, 0, 255));               // only the first, until the next parse
```
Keep the `OwnedParameterSet` alive while the override should last; `Dispose`/`Release` restores the authored colour. `Color32` supports Multiply only; `float`/`Vector2`/`UnitValue` also Add (layer a pulse over the authored value).

**R8. Links: plain, styled, with events.**
```csharp
var tagLink = new LinkModifier { AutoOpenUrl = false };         // one LinkModifier instance PER Style
var urlLink = new LinkModifier { AutoOpenUrl = false };
text.Styles.Add(Style.Tag(tagLink, "link"));                    // <link=https://...>text</link>
text.Styles.Add(Style.FromSource(new RawUrlParseRule(), urlLink)); // bare https:// and www.
tagLink.LinkClicked += url => Debug.Log($"Clicked: {url}");     // also LinkEntered(url), LinkExited()
// styled: reuse the shipped graph from a serialized ModifierGraphPreset field (package Defaults folder is not in Resources)
text.Styles.Add(new Style {
    Modifier = new ModifierGraphModifier { Preset = linkPreset },   // <UniTextRoot>/Defaults/ModifierGraphPresets/LinkPreset.asset or a copy
    Source   = new TagRule("link") { DefaultParameter = ";#4285F4" } });   // ';' leaves the URL child empty, 2nd segment colours the Color child
text.GetModifier<LinkModifier>().LinkClicked += OnLink;         // reachable inside the preset copy
```
A bare `LinkModifier` has no look. `AutoOpenUrl` is on by default (opens the URL on click) unless you subscribe and turn it off. `[text](url)` needs a `MarkdownLinkParseRule` style too. Quote URLs ending in `/` or containing `,`/`;` inside a tag.

**R9. Mentions / hashtags.**
```csharp
var mention = new InteractiveModifier();
text.Styles.Add(Style.FromSource(new TriggerWordParseRule("@"), mention));
mention.Events.Interaction += e => Debug.Log($"{e.Kind}: {e.Range.PrimaryValue}");   // the word without '@'
```

**R10. Untrusted text (player names, chat) without markup injection.** Cheapest first:
1. No markup at all: label with `UseGlobalStylePreset = false`, empty `Styles`/`StylePresets`.
2. Escape and keep markup around it (needs `BackslashEscapeRule` in the vocabulary; the package has no public escape helper):
```csharp
static string EscapeMarkup(string s)               // extend with every marker your vocabulary uses
{
    var sb = new System.Text.StringBuilder(s.Length + 8);
    foreach (var c in s)
    {
        if ("\\<*[`~+_#@".IndexOf(c) >= 0) sb.Append('\\');
        sb.Append(c);
    }
    return sb.ToString();
}
text.Text = $"<color=#FFD23F>{EscapeMarkup(playerName)}</color>: {EscapeMarkup(message)}";
```
3. `<noparse>` around user text only after removing every `</noparse>` (case-insensitive) from it, otherwise the player can break out.
Gotcha: a global Markdown vocabulary on chat makes `*Boss*` italic, `- x` / `1. x` a list, bare URLs links.

**R11. Whole-text styles (no markup).**
```csharp
text.Styles.Add(Style.WholeText(new ColorModifier(), "#FF0000"));
text.SetWholeText<BoldModifier>();               // add-or-update a LOCAL whole-text style
text.SetWholeText<LetterSpacingModifier>("2");
text.ToggleWholeText<UnderlineModifier>();
```
**R12. Fixed span.** `text.Styles.Add(Style.Range(new ColorModifier(), 0, 5, "#FF0000"));` indexes the markup-stripped text, one emoji/surrogate pair is one codepoint, and it does not follow edits.

**R13. Keyword / search highlight without markup.**
```csharp
var hits = new MutableRangeSource();
hits.SetIdentity("game.keyword-hits");
text.Styles.Add(Style.FromSource(hits, new HighlightModifier {
    Paint = PaintRef.Solid(new Color32(255, 210, 60, 90)), GeometryMapping = GeometryMapping.Range, CornerRadius = UnitValue.Em(0.25f) }));
// after the first parse (hits.Snapshot is invalid before it):
var buf = new TextRange[64];
int n = text.FindAll("fox", StringComparison.OrdinalIgnoreCase, buf);
using (var u = hits.BeginUpdate(hits.Snapshot.Revision))
{
    u.Clear();
    for (int i = 0; i < n; i++) u.Add(buf[i]);
    u.Commit();                                   // one atomic range-set change
}
```
**R17. Theme / skin switching.** `text.StylePresets.Clear(); text.StylePresets.Add(firePreset);` Each preset defines the same tag names (`<t>`, `<accent>`) with different modifiers/defaults; strings are unchanged. Destroy generated presets (`Object.Destroy`) when done.

**R18. Style on/off.** `var wave = Style.Tag(new WaveModifier(), "wave"); text.Styles.Add(wave); wave.Enabled = false;` (config kept, restores precedence when re-enabled). For "reduce motion" the tag then prints literally; keep the rule alive through a no-op `EmptyModifier` style if the markup must keep disappearing.

**R19/R20. Raw/debug and lean pooled labels.** `rawLog.UseGlobalStylePreset = false;` keeps only the component's own styles. Damage numbers and counters need no markup: opt out, set colour/size through `color`/`FontSize`; if a few effects are needed, attach ONE small `StylePreset` (e.g. `crit`) instead of the global vocabulary.

**R21. Tags for effects without picker presets.**
```csharp
preset.Styles.Add(Style.Tag(new StrokeModifier(), "stroke"));
preset.Styles.Add(Style.Tag(new ShadowModifier(), "shadow"));
preset.Styles.Add(Style.Tag(new GlowModifier(),   "glow"));
preset.Styles.Add(Style.Tag(new FillModifier(),   "fill"));
preset.Styles.Add(Style.Tag(new WaveModifier(),   "wave"));    // "<wave=0 8,2,0.25>text</wave>"
preset.Styles.Add(Style.Tag(new ShakeModifier(),  "shake"));
```
Paint layers are whole-text presets by design (their parameter set is richer than a tag carries): put the real look into the modifier's inspector fields and let the tag add only the range. Slot orders and units: [unitext-effects-paint.md](unitext-effects-paint.md), [unitext-animation-phase.md](unitext-animation-phase.md).

## Shipped modifier graph presets

`ModifierGraphPreset` (ScriptableObject, `Assets -> Create -> LightSide -> UniText -> Modifier Graph Preset`) is a reusable modifier-only recipe; `ModifierGraphModifier { Preset = p }` references it (each text gets a private copy; throws at runtime when `Preset` is null). The picker instead deep-copies the preset root into the `Style`.
- `LinkPreset.asset`: `Composite[ Composite[ LinkModifier (hoverCursor, 3 RangeStateRules), Highlight(hover), Highlight(press), Highlight(activate) ], ColorModifier, UnderlineModifier ]`. Parameter string = `urlSegment ; colorSegment ; underlineSegment`: `<link=https://x.com>` with default `;#4285F4` sends the URL to `LinkModifier` and `#4285F4` to `ColorModifier`.
- `SpoilerPreset.asset`: `Composite[SpoilerModifier (SpoilerConcealedRangeStateSelector animates Highlight Tint), HighlightModifier cover]`.
Both live in `<UniTextRoot>/Defaults/ModifierGraphPresets/`.

## Pitfalls

**Vocabulary / silent failures**
1. Literal tags in a new project: nothing is wired by default (see "What a fresh component understands"). Causes: no style for that name, `UseGlobalStylePreset` off, empty global slot, disabled style, malformed tag. Case does not matter.
2. The inspector pill row (B I U ...) is whole-text and never enables a tag; the picker's *Tags* group adds `<b>`. Fill/Stroke/Shadow/Glow/Inner Shadow/Extrude, animations, Highlight, Ruby, Indent, Align, Arc have no tag preset: the tag name is yours to define.
3. Unknown tag, stray close tag, unclosed `<ruby>`, malformed open tag and disabled style all render as literal text with no warning or log.
4. `<tag/>` on a plain `TagRule` inserts U+FFFC; only inline-media rules should be self-closed. Use `InlineTagRule` for `sprite`/`obj` (the picker does; the BasicUsage sample uses `TagRule("sprite")`).
5. `<link=https://x.com/>` parses as self-closing: quote it. URL values with `,`/`;` in a positional tag value split into slots/children: quote, escape, or use `[text](url)`.
6. An unparsable explicit token (`<color=banana>`) falls back to the modifier's field value, not the rule default. Numbers beyond ±10,000,000 or non-finite count as absent.
7. Slot order: a subclass's own parameters precede inherited ones; read the declaration order, never guess.

**Ordering / collisions**
8. Duplicate syntaxes (two `TagRule("b")`, `**` in two styles): the first in the sorted list wins and the other style is dead. Keep names unique across local/preset/global.
9. `EnsureStyleFor<T>` merges only into LOCAL styles; a preset-only modifier is not found and a second style (second rule) is created.
10. Markdown rules in a global vocabulary hit every string (`*word*`, `~~`, `++`, line-start `- `/`* `/`1. `, bare `www.`). `\` + punctuation is consumed by `BackslashEscapeRule` (Windows paths, regexes) and fights LaTeX `\\`.

**Sharing / lifecycle / threading**
11. A `Style`, rule or modifier instance cannot serve two components, appear twice in one list, or sit in two parents. Create per component or share through a `StylePreset`. Do not mutate preset assets at runtime unless you mean to dirty them; retune the component's copy via `GetModifier<T>()`.
12. `OnApply`/`TryMatch`/`Finalize` run on worker threads: no Unity API.
13. Custom modifier fields need exactly one state attribute each, `partial` types, and writes through the generated property (LSST errors); `[Parameter]` without `[GenerateParameters]` is UTP004; use `Color32`, not `Color`.
14. A custom rule with `MarkupTriggers == null` (the default) disables the jump scan for the entire component; stateful rules must implement `Reset()`/`Finalize()`.
15. `Style.Range(start, end)` indexes the markup-stripped text and does not follow edits; `MutableRangeSource.Snapshot` is invalid until the first parse (guard with `Snapshot.IsValid`); `GetRanges` throws if the modifier is not attached (call `text.GetModifier<T>()` first, read after a rebuild).
16. Untrusted text: no public escape helper exists; `<noparse>` is breakable by a `</noparse>` in the data (R10).
17. Doc-vs-code: the `ParseRule` XML doc mentions `UniText.RegisterRule` (the API is `AddRule`/`RemoveRule`, standalone only); changelog lines about `StylePreset.AddStyle/RemoveStyle/ClearStyles` and `AddStylePreset()` describe removed 2.x APIs (use the `Styles`/`StylePresets` lists); the docs' named-colour list omits `grey`, which the code accepts. Version-specific changes: [unitext-version-traps.md](unitext-version-traps.md).

## Unverified

- Roslyn generators in a user asmdef: whether `LightSide.UniText.ParamCodeGen` / `LightSide.StateCodeGen` run for a user-owned assembly, and which references the generated code needs (expected `LightSide.UniText` + `LightSide.Core`). The custom modifier and rule snippets, and the bootstrap snippets, were checked against signatures but not compiled.
- Exact LSST00x ids per message: only UTP001-UTP004 meanings are confirmed (UTP004 from the changelog).
- `StringParseRule` with `hasReplacement` off: the code inserts an empty string (match removed); what a paired modifier receives was not traced.
- Order of equal-priority rules for more than 16 rules at runtime (`List<T>.Sort` is used; stability is not guaranteed).
- Nested tags writing the same attribute key (`<rare>` inside `<epic>`): "the range applied last wins a contested codepoint"; the application order of nested spans was not traced (avoid it).
- Picker display names of the standalone entries (Noparse Tag, Code Span, Backslash Escape, Line Break, Latex Text) are derived from type names.
- Whether IL2CPP/managed stripping keeps custom `[SerializeReference]` modifier/rule types referenced only by asset data (Core ships a `link.xml`; Unity normally preserves types in serialized data).
- Not available: any public API to escape/sanitize markup, and any runtime tag-name -> modifier registry (the vocabulary is only `Styles`).
