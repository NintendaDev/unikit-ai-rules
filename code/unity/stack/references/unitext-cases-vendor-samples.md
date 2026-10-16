# UniText — Vendor Samples: Case Index and Case Library (formatting, fonts, layout, editing, media, 3D)

> **Base path:** `<UniTextRoot>` is the folder of the UniText package — the one whose `package.json` has `"name": "media.lightside.unitext"` (find it with `Glob **/media.lightside.unitext/package.json`; it may sit under `Packages/` or `Library/PackageCache/`). Never hard-code its location.
> See also: [unitext-cases-vendor-samples-effects-animation.md](unitext-cases-vendor-samples-effects-animation.md), [unitext-markup-system.md](unitext-markup-system.md), [unitext-formatting-tags-quickref.md](unitext-formatting-tags-quickref.md), [unitext-fonts.md](unitext-fonts.md), [unitext-emoji.md](unitext-emoji.md), [unitext-inline-media.md](unitext-inline-media.md), [unitext-layout-documents.md](unitext-layout-documents.md), [unitext-input-fields.md](unitext-input-fields.md), [unitext-clipboard-rtl-ime.md](unitext-clipboard-rtl-ime.md), [unitext-3d-text.md](unitext-3d-text.md), [unitext-performance-mobile.md](unitext-performance-mobile.md), [unitext-version-traps.md](unitext-version-traps.md)

---

The five packaged samples are the only complete worked usage the vendor ships. This file indexes every case they contain, says what each sample demonstrates, and turns the sample code into reusable cases (goal, markup, C#, setup, gotcha). All types below live in `namespace LightSide` (sample scripts sit in `LightSide.Samples`, so add `using LightSide;` in your own code).

**Reading rules**
- **No tag name works by default.** A fresh `UniText` understands no tags: the shipped prefabs have empty `styles`/`stylePresets` and `UniTextSettings` ships with no global style preset. Every tag in this file works only because the sample registered it (in C# or as a serialized rule) on the component that displays it. The "Needs" column and every case say how. Full bootstrap: master rule [unitext.md](../unitext.md), section "Tag vocabulary bootstrap", and [unitext-markup-system.md](unitext-markup-system.md).
- **Mobile verdicts** (`OK` / `LIMIT` / `AVOID`) come from reading source and docs; nothing was profiled and no measured numbers are quoted.
- **Snippets** are condensed from the sample scripts to the lines that matter. Snippets marked `// not compiled` were adapted by hand and never built; the rest are copied or abridged from sample code.
- **Two files.** This file: index, sample inventory, and the cases for formatting, Markdown, emoji, fonts, layout, RTL, large documents, editing, clipboard/media, inline sprites/objects and 3D (ids A, B, C, D, G, I, J, K, L, M, N). The companion [effects-animation file](unitext-cases-vendor-samples-effects-animation.md): animation and reveal (E), paint effects (F), links/spoilers/interaction (H), the tag-name census, the vendor-blessed runtime API list and the sample quirks not to copy. Index rows marked `*` live there.

---

## 1. Case index

| Feature | Case | What it shows | Needs | Mobile |
|---|---|---|---|---|
| Formatting | A1 | Register a tag vocabulary on one component | the component only | OK |
| Formatting | A2 | Everyday markup `<b> <i> <u> <s> <color> <size>` and their parameter forms | A1 per tag | OK |
| Formatting | A3 | Weight axis and real/forced bold and italic | A1; real faces or a variable font in the stack | OK |
| Formatting | A4 | Underline and strikethrough variants (`<u=,double>`) | A1 | OK |
| Formatting | A5 | Spacing, case, sup/sub, line and paragraph metrics | A1 per tag | OK |
| Formatting | A6 | Your own tag name with a baked-in parameter | A1 | OK |
| Formatting | A7 | One tag driving several modifiers (`CompositeModifier`, `;` parameter) | A1; paint assets for paint children | OK (LIMIT with animated paint children) |
| Formatting | A8 | Theme/skin swap with `StylePresets` | `StylePreset` objects | OK |
| Formatting | A9 | Escaping markup; switching a rule family off | `BackslashEscapeRule`, `Style.Enabled` | OK |
| Formatting | A10 | Syntax-coloured listing / coloured log | `color` + a monospaced font | OK |
| Formatting | A11 | Coloured HUD/status line built from code | `color` registered on that component | OK |
| Formatting | A12 | Which text setter to use (`Text`, `SetText` overloads, `TextResolver`) | nothing | OK |
| Markdown | B1 | `**bold**`, `&italic&`, `[text](url)` as rules | one `Style` per syntax | OK |
| Emoji | C1 | Emoji render with no emoji font in the stack | nothing | OK |
| Emoji | C2 | Emoji sequence forms and their interaction with tags | nothing | OK |
| Emoji | C3 | 3D emoji as stickers or flat images | UniText 3D module | LIMIT |
| Fonts | D1 | Named families, `<font=name>`, whole-text family | named families in the stack; `font` tag | OK |
| Fonts | D2 | Assign `Font`/`FontStack`/`FontSize` from code; automatic system fallback | font assets | OK |
| Fonts | D3 | Weight/width by variable axes or static faces | variable or multi-face family | OK |
| Fonts | D4 | Icon fonts (Font Awesome) | the icon font asset | OK |
| Fonts | D5 | Complex scripts without bundling everything | script fonts in a stack | LIMIT (font size on disk) |
| Fonts | D6 | CJK regional glyphs: `<lang=...>` and `Language` | font with `locl`; `lang` tag | OK |
| Fonts | D7 | Math font | OpenType MATH font | OK |
| Animation* | E1 | Phase-driven tags (wave, wobble, pulse, bounce, shake, float, pendulum, spin, glitch) | A1 + the modifier | LIMIT |
| Animation* | E2 | Code-driven effects: scramble, rolling counter, split-flap | A1; per-frame `Progress`/`Roll` write | LIMIT |
| Animation* | E3 | Reveal: one modifier, named handler entries | `RevealModifier` + provider | LIMIT |
| Animation* | E4 | Staggered entrance of whole texts | reveal wrapper tag | LIMIT |
| Animation* | E5 | Per-frame parameter change that needs an explicit dirty mark | `MarkModifierDirty` | AVOID on many texts |
| Paint* | F1 | Paint tags (gold, fire, ice, neon, outline, layers, inner shadow) | `UniTextPaints` asset + composites | LIMIT |
| Paint* | F2 | Code-defined gradient and scrolling paint | `InlinePaintProvider` | LIMIT |
| Paint* | F3 | Highlight/marker backgrounds with geometry and paint mapping | `HighlightModifier` | OK (LIMIT animated) |
| Layout | G1 | Alignment, justify, indent, lists, no-break, separators, ellipsis | A1 per tag | OK |
| Layout | G2 | Width-animated harness to test wrapping | a parent RectTransform | OK |
| Layout | G3 | Component layout fields and UniText inside layout groups | UGUI layout components | OK |
| Layout | G4 | LaTeX tables, text commands, math | many rules + math font | AVOID in HUD, LIMIT elsewhere |
| Layout | G5 | Ruby (furigana) | `RubyModifier` + `RubyParseRule` | OK |
| Layout | G6 | Base writing direction of the whole text | `DirectionModifier` | OK |
| Interaction* | H1 | Link with press feedback, events and `AutoOpenUrl=false` | `LinkModifier` graph | OK |
| Interaction* | H2 | `<link=scheme:value>` as an in-app command channel | H1 | OK |
| Interaction* | H3 | `@mention` / `#hashtag` chips | `TriggerWordParseRule` + graph | OK |
| Interaction* | H4 | Spoilers | `SpoilerModifier` graph | OK |
| Interaction* | H5 | Find-in-page highlight | `MutableRangeSource` | OK |
| Interaction* | H6 | Tap-to-advance that ignores interactive ranges | `HitTestRange` | OK |
| Interaction* | H7 | Links on 3D solids | `WorldPointerRaycaster`, `RaycastTarget` | LIMIT |
| Editing | I1 | The component ladder: UniText, Selectable, Editable, behaviors | UGUI EventSystem | OK |
| Editing | I2 | Password field with show/hide eye | `PasswordBehavior` | OK |
| Editing | I3 | Chat composer and message list | behaviors preset | OK |
| Editing | I4 | Rich-text toolbar mirrored from the caret | `CaretContextHandler` subclass | OK |
| Editing | I5 | Small behaviors: length limit, select-all, defocus, native overlay, placeholder | behaviors | OK (native overlay LIMIT) |
| Clipboard | J1 | Pasted/dropped images and files become attachment cards | `MediaInputBehavior` subclass | LIMIT (decoded textures) |
| Inline objects | K1 | `<sprite=name>` from a `UniTextSprites` asset | sprite asset + provider | OK |
| Inline objects | K2 | Literal syntax of sprite/obj/mat/var the vendor lists but does not run | provider setup | OK |
| Inline objects | K3 | Prefab objects in the line (`<obj=name>`) | `InlineObjProvider` | LIMIT (one clone per tag) |
| RTL | L1 | Mixed-direction UI strings | Arabic/Hebrew coverage in fonts | OK |
| RTL | L2 | Component and per-range direction/language overrides | G6, D6 | OK |
| RTL | L3 | Script coverage and word-break dictionaries | D5 | LIMIT |
| Large docs | M1 | A 2 MB tagged log in a windowed, selectable view | `UniTextDocumentView` + loader | OK (vendor design; not profiled) |
| 3D | N1 | Spawn one extruded text from the prefab | 3D module | LIMIT |
| 3D | N2 | Solid look from code: depth, bevel, materials, `Text3DLook` | 3D shader/materials | LIMIT |
| 3D | N3 | Layers: outline, ring, plate, stencil, neon tube | `Layer3DModifier` | AVOID on many texts |
| 3D | N4 | 3D motion and the 2D animation set on solids | A1-style registration | LIMIT |
| 3D | N5 | 3D reveals, deformers, per-range 3D styles | handlers/modifiers | LIMIT |
| 3D | N6 | Objects attached to glyphs (candles, snow, bulbs) | prefabs + `Attach3DModifier` | AVOID on mobile unless counts are small |
| 3D | N7 | Pin to glyph surfaces, pointer field, shatter | `Raycast`, colliders, physics | AVOID |
| 3D | N8 | Scene prerequisites for 3D | module, lights, pointer raycaster | LIMIT |

---

## 2. The five samples

| Sample | Entry (inside `<UniTextRoot>/Samples~/`) | What it demonstrates | Pick it for |
|---|---|---|---|
| BasicUsage | `BasicUsage/BasicUsage.unity` | 51 slides driven by `BasicUsageExample` (formatting, scripts, math/LaTeX, paint, animation, reveal, links, spoilers, find), plus an editing screen (chat, forms) and a 2 MB virtualized document | the broadest reference |
| Emoji | `Emoji/Emoji.unity` | the whole Unicode emoji repertoire in one `UniText` whose font stack has no emoji font | emoji behaviour |
| FontExamples | `FontExamples/FontExamples.unity` | 12 font groups: decorative, icon, monospace, static and variable stacks, multilingual | font asset and stack setups |
| Layout | `Layout/Layout.unity` | a UGUI chat-bubble auto-layout test with a composer; not an alignment demo | UniText under layout groups |
| Text3D | `Text3D/Text3D.unity` | 25 slides built from code on `UniText3D` | extruded text |

### 2.1 Importing and running

- **Samples must be imported.** The `Samples~` folder is hidden from the Unity asset database, so nothing in it is usable in place. Import through Package Manager → UniText → **Samples** tab → Import; the copy is an ordinary project folder with its own assembly definitions.
- `package.json` lists four samples (Basic Usage, Emoji, Layout, Font Examples). **Text3D is not listed**: enable the module first (Project Settings → LightSide → UniText → Modules → UniText 3D, or GameObject → LightSide → UniText → UniText3D); the module section then offers "Import UniText 3D Sample". Its assembly compiles only with the module's `UNITEXT_3D` define; the physics and URP bits use `LIGHTSIDE_HAS_PHYSICS` / `LIGHTSIDE_HAS_URP` version defines.
- Sample assemblies: `LightSide.UniText.Samples`, `LightSide.UniText.Samples.EditableText` (reference `LightSide.Core` and `LightSide.UniText`), `LightSide.UniText.3D.Samples`. Sample behaviours are `partial` classes with `[SerializeField, StatePassive]` fields (source-generated state).
- Add-component menu for sample scripts: `Add Component → LightSide → UniText → Samples → <Class>`.
- BasicUsage controls: Space / Right / D next, Left / A previous, tap the right or left half of the screen. Taps that land on a link or interactive range, and drags over 20 px, are ignored (case H6). Text3D: same keys; slides that own the pointer suppress navigation.

### 2.2 BasicUsage

**Scene `BasicUsage.unity`**

| Object | What it holds |
|---|---|
| `Canvas` | `BasicUsageExample` with `demoText`, `statusText`, `demoPaints` (a `UniTextPaints` asset), `demoSprites` (a `UniTextSprites` asset), `mathFont`, three containers (basic, editable, virtualization) |
| `DemoText` | `UniText` size 36, wrap, padding 10, Start/Top, font stack `LanguagesFont`, `styles: []`, `useGlobalStylePreset` on. Slides add and remove every style at runtime |
| `StatusText` | `UniText` size 38, `autoSize` 10-43, Center/Middle, **no styles**, yet the code writes `<color=...>` status lines into it (see quirks in the companion file) |
| Editing screen (inactive container, toggled by `Editable_Toggle`) | chat composer, formatting toolbar, attachment bar, message list, forms: field A, "Flexible field", password field, raw editable, raw selectable (cases I1-I5, J1) |
| Virtualization screen (inactive container, `Virtualization_Toggle`) | `UniTextDocumentView` + `UniText` + `UniTextDocumentLoader` + `UniTextSelectable` showing a 2 MB tagged log (case M1) |

**Assets** (all under `<UniTextRoot>/Samples~/BasicUsage/`)
- `DemoPaints.asset` (`UniTextPaints`): swatches `gold`, `fire`, `ice` (3-stop vertical gradients), `neon` (cyan to magenta, horizontal), `candy`, `photo` (a texture, `paint.png`), `shine` (a teal fill with a light band). `EditableText/UniTextPaints.asset`: `fox`, `sea`.
- `UniTextSprites.asset`: entries `unitext-logo` and `cat-sulejman`, each with size, bearing, advance, line-height-above/below and `preserveAspect` (case K1).
- `LanguageFonts/LanguagesFont.asset` (`UniTextFontStack`): 25 families, 22 unnamed script fallbacks (NotoSans plus Armenian, Bengali, Devanagari, Ethiopic, Georgian, Gujarati, Gurmukhi, Kannada, Khmer, Lao, Malayalam, Myanmar, Oriya, Sinhala, Tamil, Telugu, Thai, Arabic, Hebrew, SourceHanSans demo) and three named families: `body` (Lobster), `mono` (JetBrains Mono), `modak` (Modak). **There is no `header` family.**
- `Fonts/STIXTwoMath-Regular.asset` (math font), `Fonts/SourceHanSans-Demo.asset` (small CJK subset with `locl` for ZHS/ZHT/ZHH/KOR).
- `EditableText/`: `UniTextFonts_Default.asset` (NotoSans + Arabic + Hebrew + Thai), `BehaviorPreset.asset` (`InputBehaviorPreset`: `LinkOnPasteBehavior` + `TextFormattingBehavior`, case I4), `AttachmentCardPrefab.prefab`, `Left/RightDemoChatMessage.prefab`.
- `unitext.prev.tagged.txt`: a 2.13 MB captured Unity log (30,925 lines) with `<b>`, `<i>`, `<u>`, `<color>` tags injected around fragments; the only large-document input.

**The 51 slides** (order = `SetupSlides()`; every slide registers the styles it needs and removes them on exit)

| # | Slide | Shows / registers |
|---|---|---|
| 1 | Intro | `<b><color=#FFD700>`, `<color=#888>` |
| 2, 8-10 | BidirectionalText, Arabic, Hebrew, ComplexScripts | RTL mixes, ligatures, Devanagari, ZWJ joining, CJK (L1) |
| 3 | Emoji | category lines: faces, flags, ZWJ family, skin tones, VS16 (C2) |
| 4 | StylePresets | three runtime `StylePreset` assets; `<link=preset:fire>` swaps them (A8) |
| 5-7 | BasicStyling, Palette, RelativeSizes | `<b><i><u><s>`, colour ramps, `<size=60%>` (A2) |
| 11 | InteractiveLinks | `<link=https://...><color><u>` (H1) |
| 12 | SpacingOverview | `<cspace>`, `<line-height>` (A5) |
| 13-14 | Ruby, RubyLayout | `<ruby>..<rt>..</rt></ruby>` (G5) |
| 15 | Language | `<lang=zh-Hans/zh-Hant/ja/ko>` and `Language` (D6) |
| 16 | Font | `<font=name>`, `SetWholeText<FontModifier>` (D1) |
| 17 | Math | `<math>..</math>`, 43 formula lines and 7 symbol walls (G4) |
| 18-21 | LaTeX tables / text / rules / long tables | tabular, alignment, size, list, spacing, text and command rules (G4) |
| 22 | SystemFont | `Font`/`FontStack` null, Unicode stress sheet, `<var=900>`, `<b=,r>` (D2, D3) |
| 23-25 | PaintLayers, HighlightMappings, HighlightPaints | paint tags and highlight backgrounds (F1-F3) |
| 26 | Animations | wave wobble pulse bounce shake float pendulum spin glitch scramble roll flap (E1, E2) |
| 27-34 | Bold ... ScriptPosition | parameter forms (A3-A5) |
| 35-40 | Spacing, LineHeight, ParagraphSpacing, Alignment, Indent, Lists | (A5, G1) |
| 41-43 | NoBreak, Separator, Overflow | `<nobr> <sep> <ellipsis> <truncate>`; width animated (G1, G2) |
| 44 | Reveal | `<reveal>` with eight handler entries (E3) |
| 45 | Direction | `SetWholeText<DirectionModifier>` (G6) |
| 46-47 | InlineSprites, AssetBackedModifiers | `<sprite=...>`; literal syntax of var/sprite/obj/mat (K1, K2) |
| 48-50 | InteractiveRanges, Spoilers, Find | chips, `<spoiler>`, find-in-page (H3-H5) |
| 51 | Outro | `<link=start>` |

### 2.3 Emoji, FontExamples, Layout

- **Emoji** (`Emoji/Emoji.unity`): `EmojiTest` (`UniText` size 28, wrap) holds the complete emoji repertoire as one plain 12.6k-character string, no markup; its font stack is `<UniTextRoot>/Defaults/UniTextFonts_Default.asset` (NotoSans + Arabic + Hebrew) and **no emoji font anywhere**. A second text shows the drag hint plus U+2764 U+FE0F.
- **FontExamples** (`FontExamples/FontExamples.unity`): 12 groups, each a `Label` and a `Test`. Fixed `font` groups: DancingScript, Lobster, NotoSerif, PixelifySans (UDHR text and pangrams), Font Awesome 7 Brands / Free-Regular / Free-Solid (icons are plain private-use codepoints, U+E007..U+F8E8 for Brands), JetBrainsMono (a colour-tagged C# listing; styles `ColorModifier` + `TagRule("color")`), EdgeCases (Outfit/Comfortaa variable fonts with a whole-text `VariationModifier`). `fontStack` groups: Languages (9 script families; NotoSerifSC alone is 17 MB), StaticFont (one family: Regular + 15 faces Thin..Black x upright/italic; `BoldModifier`/`ItalicModifier` on a `FixedRangeSource` with range `..^30`, bold parameter 900), VariableFont (variable primary + variable italic; bold parameter 100). Cases D1-D5.
- **Layout** (`Layout/Layout.unity`): `Chat` (VerticalLayoutGroup) → ScrollRect → Viewport (RectMask2D) → Content (VerticalLayoutGroup spacing 20 + ContentSizeFitter vertical PreferredSize) → three bubbles (`Back` Image with `LayoutElement ignoreLayout` + `UniText` size 32, wrap, no stack so the default/system fallback applies). Bubbles: Arabic + emoji, a mixed Arabic/Latin/Devanagari/Thai/ZWJ paragraph, a 40-script wall. The `Composer` (HorizontalLayoutGroup) holds an editable `UniText` field and a Send button. The README calls it an alignment demo and lists `HorizontalAlignment` as Left/Center/Right; the enum is `Start=0, Center=1, End=2, Justify=3, Left=4, Right=5`. Cases G3, L3.

### 2.4 Text3D (`Text3D/`)

- **Scene**: three lights plus two orbiting coloured lights (`SampleOrbit`), a `Backdrop`, a `Canvas` with `Caption` and `Status` `UniText`s, a `Main Camera` with `WorldPointerRaycaster`, and `UniText 3D Example` (`Text3DExample`) that holds the text prefab, the stack, five display fonts (Lilita One, Lobster, Modak, Teko Medium, Fira Sans ExtraBold), six `Text3DLook` assets (Gold, Chrome, Candy, Comic, Neon, Engraved Stone) and the materials/prefabs for the slides. Under URP `SamplePostProcessing` adds bloom, ACES, vignette, colour grading and TAA/SMAA at runtime.
- **Text prefab** `<UniTextRoot>/3D/Defaults~/Text 3D (UniText).prefab`: RectTransform scale 0.01 size 400x100 + MeshFilter + MeshRenderer + `UniText3D` (text "UniText 3D", size 72, `depth 0.15`, front bevel shape 2 width/height 0.02 segments 4, `mirrorBevel` on, `smoothingAngle 30`, `colorGlyphs 0`, `animateInShader 1`, `buildInBackground 0`, five material slots all null, `styles: []`, `raycastTarget` on).
- **Looks** `<UniTextRoot>/3D/Looks/*.asset` (`Text3DLook`: depth, bevel, glyphs, face/edge materials plus HDRP variants, layers), applied with `look.ApplyTo(uniText3D)`.
- **25 slides** (24 without physics): Intro, Extrusion, Bevels, Looks, Surfaces, Color, Layers, Emoji, Animation, Motion, Reveal, Deformers, Ranges, Decorations, InlineObjects, Cake, Winter, Marquee, Neon, Pin, Interaction, Fields, Shatter, Languages, Outro. Cases C3 and N1-N8.

### 2.5 `Defaults/` prefabs: what a freshly created component looks like

| Prefab (`<UniTextRoot>/Defaults/`) | Contents / key serialized defaults |
|---|---|
| `Text (UniText).prefab` | `UniText` "Hello cats" size 36, wrap on, Start/Top, `autoSize 0` (min/max 10/72), `styles []`, `stylePresets []`, `useGlobalStylePreset` on, `renderMode 0` (SDF; 1 = MSDF) |
| `World Text (UniText).prefab` | `UniTextWorld`, RectTransform 220x50, Center/Middle, `raycastTarget 0`, `lit 0`, `castShadows 0` |
| `Button (UniText).prefab`, `Dropdown (UniText).prefab` | UGUI `Image` + `Button` + `UniText` label; `UniTextDropdown` + item + two `UniText` |
| `Document View (UniText).prefab`, `DocView Both Axes.prefab` | `UniTextDocumentView` + `UniTextDocumentLoader` + `UniText` (24, no wrap) + RectMask2D + scrollbar(s); "Both Axes" adds `UniTextSelectable` and a horizontal bar |
| `Editing/Editable Text`, `Selectable Text`, `InputField - UniText` | `UniText` + `UniTextSelectable` (+ `UniTextEditable` with `behaviors []`); the input field adds VLG + Image + RectMask2D and a `PlaceholderDecorator` with a "Write a message..." `Placeholder` text |
| `Editing/ContextMenu`, `SelectionHandles`, `InsertionHandle` | `UniTextContextMenu` (+ `FocusGuard`), `UniTextSelectionHandles`, handle image |
| `UniTextFonts_Default.asset` | stack NotoSans-Regular + NotoSansArabic + NotoSansHebrew |
| `ModifierGraphPresets/LinkPreset.asset`, `SpoilerPreset.asset` | ready link graph (Composite: `LinkModifier` + colour Color32(73,155,255,255) + `UnderlineModifier` + hover/pressed highlights, enter 0.18 / exit 0.1) and spoiler graph (Composite: `SpoilerModifier` + cover `HighlightModifier` Color32(32,34,42,255), `order 1`, `SpoilerConcealedRangeStateSelector`, enter 0.25 / exit 0.18) |

---

## 3. Case library: formatting, Markdown, emoji, fonts

Each case: goal, markup and/or C#, setup, gotcha. Markup strings are the sample's own runtime strings.

### A. Formatting and tags

**A1. Register a tag vocabulary on one component (prerequisite of every tag case).**
```csharp
// not compiled: condensed from the sample registration helper
var style = new Style { Modifier = new ColorModifier(), Source = new TagRule("color") };
uniText.Styles.Add(style);
// factory form, same result:
caption.Styles.Add(Style.Tag(new BoldModifier(), "b"));
caption.Styles.Add(Style.Tag(new ColorModifier(), "color"));
```
BasicUsage registers these pairs (modifier, tag): `BoldModifier` `b`, `ItalicModifier` `i`, `UnderlineModifier` `u`, `StrikethroughModifier` `s`, `ColorModifier` `color`, `SizeModifier` `size`, `LetterSpacingModifier` `cspace`, `FontModifier` `font`. Even the 3D samples register `color`, `b`, `size` on their caption text.
- Setup: none in the inspector; the component must exist (`UniText`, `UniText3D`, ...).
- Cleanup: `Styles` is the serialized list of the component, so the sample removes every style it added (`foreach (var s in added) text.Styles.Remove(s)`) when it is destroyed.
- Gotcha: a tag no registered style claims has no effect, and all shipped prefabs start with empty `styles`. A text component that only receives text (status labels) still needs its own registration, or a style preset/global preset that supplies it.

**A2. Everyday inline markup.** Needs A1 for `b i u s color size`.
```
<b>Bold</b> • <i>Italic</i> • <u>Underline</u> • <s>Strike</s>
Mix styles: <b><i><color=#FF6B6B>Bold Italic Red</color></i></b>
<size=60%>tiny</size> <size=80%>small</size> normal <size=120%>large</size> <size=150%>huge</size>
<b><color=#FFD700>UniText</color></b>   <color=#888>Professional Unicode Text Rendering</color>
```
- Colour forms: names (`<color=red>`, `orange gold lime teal navy purple pink`), hex `#F00` / `#00B4D8`, alpha `#FF000040` (25%), `#FF000080`, `#FF0000C0`, `#FF0000FF`. Emoji keep their own colours: tint applies to text only.
- Size forms: `<size=16>` absolute px, `<size=60%>` percent, `<size=+16>` / `<size=-8>` relative delta; `H<size=60%>2</size>O`; `big <size=200%>[emoji]</size> emoji` keeps the baseline.

**A3. Weight axis and real/forced realization.**
```
Weight axis: <b=100>100</b> <b=300>300</b> <b=400>400</b> <b=500>500</b> <b=700>700</b> <b=900>900</b>
Modes: bare <b>auto</b> · <b=700,r>real face only</b> · <b=700,f>forced synthetic</b>
Modes: bare <i>auto</i> · <i=r>real face only</i> · <i=f>font's own slant</i>
Synthetic shear: <i=10>10%</i> <i=20>20%</i> <i=30>30%</i> <i=45>45%</i> <i=-20>-20% back-slant</i>
```
Bold parameter = `weight[,mode]` with mode `r` or `f`; italic parameter = a mode or a shear percent. The tagged log also uses weights up to `<b=1000>`. Setup: A1; the stack needs real bold/italic faces (or a variable font, D3) for the `r` mode to find one. Game use: a heavier damage number with `<b=900>`.

**A4. Underline and strikethrough variants (colour first).**
```
<u>solid</u> <u=,double>double</u> <u=,dotted>dotted</u> <u=,dashed>dashed</u> <u=,wavy>wavy</u>
<u=#FF6B6B>red</u> <u=#4ECDC4,wavy>teal wavy</u> <u=,solid,3px>3px thick</u> <u=,solid,1px,-4px>offset down</u>
Skip-ink: <u=#A06CD5,solid,2px,,true>puppy paging gently</u>
Sale: <s=#FF0000,solid,2px>$99.00</s>  now <color=#2ECC71><b>$49.00</b></color>
```
`<s>` takes the same forms (`<s=,double>`, `<s=#888,dashed>`). Empty slots keep defaults. Game use: price drop labels, "obsolete" stat lines.

**A5. Spacing, case, script position, line and paragraph metrics.**
```
<cspace=8>S P A C E D</cspace>  <cspace=0.25em>..</cspace>  <cspace=-1>squeezed</cspace>
<cwidth=auto>iIWmll — one advance</cwidth>  <cwidth=1em>P</cwidth>  <wspace=0.8em>gaps only between words</wspace>
<line-height=160%>..</line-height>  <line-height=52>..</line-height>  <line-height=,primary>..</line-height>
<pspace=18>..</pspace>  <pspace=1em,0.5em>after 1em + before 0.5em</pspace>
<upper>..</upper> <lower>..</lower> <smallcaps>..</smallcaps>
H<sub>2</sub>O   E = mc<sup>2</sup>   1<sup>st</sup>
```
Registrations: `LetterSpacingModifier` `cspace`, `CharacterWidthModifier` `cwidth`, `WordSpacingModifier` `wspace`, `LineHeightModifier` `line-height`, `ParagraphSpacingModifier` `pspace`, `UppercaseModifier` `upper`, `LowercaseModifier` `lower`, `SmallCapsModifier` `smallcaps`. `sup` and `sub` share one modifier and are told apart by a default parameter:
```csharp
var scriptRule = new CompositeParseRule();   // not compiled: adapted from the sample
scriptRule.Rules.ReplaceAll(new ParseRule[] {
    new TagRule("sup") { DefaultParameter = "super" },
    new TagRule("sub") { DefaultParameter = "sub" } });
text.Styles.Add(new Style { Modifier = new ScriptPositionModifier(), Source = scriptRule });
```
Units: a bare number is px, `em` and `%` suffixes are accepted. Vendor captions: case mapping is Unicode-correct (bundled UCD data; OpenType `smcp` when present, else synthesized); sub/sup use OpenType `sups`/`subs` when available, otherwise scaled and shifted. The retired monospace flag of `<cspace>` is replaced by `<cwidth=auto>`.

**A6. Your own tag name with a baked-in parameter (rarity colours, item names).**
```csharp
text.Styles.Add(Style.Tag(new ColorModifier(), "warning", "#FF0000"));  // <warning>error</warning>, <warning=#FFA500>caution</warning>
text.Styles.Add(Style.Tag(new ColorModifier(), "rare", "#4A90E2"));     // not compiled: <rare>Frost Blade</rare>
```
A tag value overrides the default slot by slot. Sample precedent: `new TagRule("fire") { DefaultParameter = "#FF7A00;fire" }` and `new TagRule("texture") { DefaultParameter = "photo" }`.

**A7. One tag, several effects: `CompositeModifier` + `;` parameter.** The parameter is split by `;`, one segment per child in order; each segment uses comma slots.
```csharp
// not compiled: condensed from the theme and paint-tag slides
var composite = new CompositeModifier();
composite.Modifiers.ReplaceAll(new BaseModifier[] { new ColorModifier(), new WaveModifier() });
text.Styles.Add(new Style { Modifier = composite, Source = new TagRule("accent") { DefaultParameter = "#3A86FF;0 3,3,0.5" } });
// Stroke ; Fill (paint swatch by name):   "#2A1A00CC,0.05;gold"
// Stroke ; Stroke ; Fill (layered):       "#101010,0.40;#FFD447,0.22;#E8407A"
```
Values with spaces stay in one slot (`0 3` = wave amplitude, then frequency 3, spread 0.5). A bare first segment reaches the first child, so `<link=https://...>` works on a link graph. Mobile: a composite that animates paint is LIMIT (see the companion file, F1).

**A8. Theme/skin swap without touching the text.**
```csharp
// text: "<t>The quick brown fox</t> jumps over <t2>the lazy dog</t2>.\n<accent>Each theme brings its own personality</accent>."
var preset = ScriptableObject.CreateInstance<StylePreset>();   // not compiled: condensed; composite = CompositeModifier[Color, Bold]
preset.Styles.Add(new Style { Modifier = composite, Source = new TagRule("t") { DefaultParameter = "#FF4500" } });
text.StylePresets.Add(preset);                 // initial theme
// on <link=preset:fire>: text.StylePresets.Clear(); text.StylePresets.Add(firePreset);
// teardown: text.StylePresets.Clear(); Object.Destroy(preset);
```
Effective vocabulary resolves local `Styles`, then `StylePresets`, then the project global preset (while `Use Global Style Preset` is on); first registered wins. Production form: `StylePreset` assets (Create → LightSide → UniText → Style Preset). Editing `StylePreset.Styles` at runtime reaches every user live. Destroy runtime-created presets.

**A9. Escaping markup and switching a rule family off.**
- Print tag syntax literally with `\<`: C# `"\\<font=name>"`; the sample uses it 20 times (`\<var=700>`, `\<wave=0 8,2,0.25>`, `SetWholeText\<DirectionModifier>`). `\#` escapes a `#` so it is neither a hashtag nor a colour start.
- `BackslashEscapeRule` is a standalone rule registered as a style with no modifier: `var escapeStyle = new Style { Modifier = null, Source = new BackslashEscapeRule() }; text.Styles.Add(escapeStyle);`. `escapeStyle.Enabled = false` skips the style and keeps its configuration; the LaTeX slides disable it because `\\` would otherwise read as an escaped backslash.

**A10. Syntax-coloured listing / coloured log.** One `ColorModifier` + `TagRule("color")` and a monospaced `font`.
```
<color=#57A64A>// Cat Programmer Simulator</color>
<color=#569CD6>public class</color> <color=#4EC9B0>CatCoder</color>
    <color=#4EC9B0>Console</color>.<color=#DCDCAA>WriteLine</color>(<color=#D69D85>"Fixing bugs..."</color>);
```
The sample listing: 1,586 characters, 38 colour tags, `JetBrainsMono-Regular` at 28. With a `BackslashEscapeRule` style present, literal `<` of generics needs `\<`. Generated markup from a build log or console view works the same way: wrap spans, keep the registration local.

**A11. Coloured status/HUD line from code.**
```csharp
statusText.Text = $"<color=#2ECC71>Clicked:</color> {url}";   // also #3498DB hover, #E74C3C error
```
Needs `color` registered on that component (A1). Assigning `Text` re-parses; for per-frame values use `SetText` (A12).

**A12. Which text setter to use.** The sample exercises all of them (it cycles five paths per slide).
```csharp
text.Text = source;                          // serialized property: persists, dirties the scene in edit mode
text.SetText(char[] buffer, 0, length);      // no allocation; the buffer is re-read on every call
text.SetText(ReadOnlyMemory<char> memory);   // no serialization
text.SetText(stringBuilder);                 // copies into pooled scratch
text.TextResolver = new PrefixResolver();    // IUniTextResolver { bool TryResolve(ReadOnlyMemory<char> source, out ReadOnlyMemory<char> result) }
```
`SetText(string)` of unchanged text does nothing and never writes the serialized `text`. The sample resolver builds `(prefix + source).AsMemory()` per call, which allocates (demo only). Game use: timers and scores through the `char[]`/span overloads; localization through a resolver.

### B. Markdown

**B1. Markdown is only serialized in the chat scenes; no slide text uses it.** The composer's vocabulary (BasicUsage and Layout scenes):

| Modifier ← source | Authoring syntax |
|---|---|
| `BoldModifier` ← `CompositeParseRule{ TagRule("cat"), MarkdownWrapRule{Marker="%%"} }` | `<cat>x</cat>` or `%%x%%` (`cat` is a scene-private tag) |
| Composite[`LinkModifier` + 2 `HighlightModifier` (hover, pressed)] ← `MarkdownLinkParseRule` | `[text](https://...)` |
| `ItalicModifier` ← `MarkdownWrapRule{Marker="&"}` | `&x&` |
| Composite[`FillModifier` (asset paint) + `WaveModifier`] ← `TagRule("kittens")` | `<kittens>x</kittens>` (scene-private tag) |
| `SpriteModifier{AssetSpriteProvider}` ← `InlineTagRule{tag "sprite"}` | `<sprite>` / `<sprite=name>` |

The password and field-A components use `BoldModifier` ← `CompositeParseRule{ TagRule("b"), MarkdownWrapRule{"**"} }`, so two components in one scene can have different vocabularies. C# equivalent:
```csharp
var boldSource = new CompositeParseRule();   // not compiled: adapted from serialized scene data
boldSource.Rules.ReplaceAll(new ParseRule[] { new TagRule("b"), new MarkdownWrapRule { Marker = "**" } });
text.Styles.Add(new Style { Modifier = new BoldModifier(), Source = boldSource });
text.Styles.Add(new Style { Modifier = linkGraph, Source = new MarkdownLinkParseRule() });
```
Other built-in sources (package doc): `MarkdownWrapRule{"*"}` italic, `{"~~"}` strike, `{"++"}` underline, `MarkdownListParseRule` (`- item`, `1. item`), `RawUrlParseRule`, `CodeSpanRule`. Wrap markers follow CommonMark flanking: `_` never opens inside a word and `2 * 3` stays literal; priority equals marker length. `NoparseTagRule`, `CodeSpanRule`, `<tag #label=...>` anchor labels and self-closing `<tag/>` are documented but demonstrated by no sample.

### C. Emoji

**C1. Emoji need no font in the stack.** The Emoji sample's stack is NotoSans + Arabic + Hebrew and the string holds the full emoji list (flags, ZWJ sequences, skin tones, keycaps `0` U+FE0F U+20E3, tag-sequence flags). The BasicUsage `LanguagesFont` stack has no emoji family either and slide 3 renders every category. The sample README: "UniText uses a dedicated emoji font atlas for consistent cross-platform rendering".

**C2. Forms the Emoji slides cover (write them as codepoint sequences).**
- Flags: regional indicators `U+1F1FA U+1F1F8` (US); tag-sequence flags `U+1F3F4 U+E0067 U+E0062 U+E0073 U+E0063 U+E0074 U+E007F`; pride `U+1F3F3 U+FE0F U+200D U+1F308`.
- ZWJ family `U+1F468 U+200D U+1F469 U+200D U+1F467 U+200D U+1F466`; profession plus skin `U+1F9D1 U+1F3FD U+200D U+1F680`; skin tone `U+1F44B U+1F3FD`.
- Text vs emoji presentation: `U+263A U+FE0E` vs `U+263A U+FE0F`; `U+2764 U+FE0F` is the scene's `DemoText`.
- With formatting: `<b>` and `<i>` do not affect emoji ("Emoji unaffected", "Emoji stays upright"), `<color>` tints text only, `<size=200%>` scales an emoji. Emoji inside RTL sentences render in both BasicUsage and Layout.

**C3. 3D emoji.**
```csharp
stickers.ColorGlyphs = Text3DColorGlyphs.Sticker;   // die-cut extruded shape with the image on the front
flat.ColorGlyphs = Text3DColorGlyphs.Flat;          // flat image on the front plane
stickers.color = new Color32(255, 210, 120, 255);   // tints the solid
```
`stickers`/`flat` are `UniText3D` instances spawned as in N1. Mobile: LIMIT (extruded geometry per emoji).

### D. Fonts and font families

**D1. Named families, `<font=...>` and whole-text family.** In the stack asset (`UniTextFontStack.families[]`, each `{name, primary, faces[], preferredLanguage}` plus `fallbackStack`) only families that need a tag name get one: BasicUsage names `body` (Lobster), `mono` (JetBrains Mono), `modak` (Modak); the other 22 are unnamed script fallbacks.
```
<font=body>Body family — paragraph sample with more words.</font>   <font=mono>monospace_function(arg1, arg2)</font>
<font=modak><size=280%>BIG</size></font>
```
```csharp
text.SetWholeText<FontModifier>("body");  text.ClearWholeText<FontModifier>();   // whole text, no markup
```
Setup: `font` registered via A1 (`FontModifier` ← `TagRule("font")`) and a stack with named families. A per-range tag wins over whole-text. An unknown family name falls back to the stack and logs a warning; `UniTextFontStack.TryGetFamilyByName(name, out family)` resolves names at runtime. Family names are exact strings.

**D2. Direct assignment from code; automatic system fallback.**
```csharp
spawned.FontStack = fontStack;   // fallback chain
spawned.Font = font;             // primary UniTextFont asset, may be null
spawned.FontSize = fontSize;
spawned.Text = text;
// SystemFontSlide: fully automatic OS fallback
SystemFont.Disabled = false; text.Font = null; text.FontStack = null;
```
FontExamples sets `font` on nine of its groups and `fontStack` on three. The Layout bubbles use no stack at all and render a 40-script wall through system fallback. WebGL has no OS fonts, so give the component a stack there.

**D3. Weight/width by variable axes or static faces.**
- Tag `<var=900>龍/龙 馬/马</var>` with `VariationModifier` ← `TagRule("var")`. The vendor's literal syntax line: `positional axes wght,wdth,ital,slnt,opsz: <var=700> · <var=700,80> · <var=150%> · <var=+200> · <var=~,~,~,-12>`.
- Whole-text variation without markup: `VariationModifier{weight 674, width 100, italic 0, slant 0, opticalSize 12}` (FontExamples EdgeCases).
- Static family: `primary = NotoSans-Regular` + `faces = [Thin..Black x upright/italic]`; `BoldModifier` on a `FixedRangeSource{range "..^30"}` with parameter `900` picks the Black face. Variable family: `primary = NotoSans-VariableFont` + `faces = [NotoSans-Italic-VariableFont]`; parameter `100` drives the weight axis.

**D4. Icon fonts (Font Awesome).** Assign the FA `UniTextFont` as `font` and put the glyphs in the string as private-use codepoints (U+E007..U+F8E8 for Brands); no markup is needed.

**D5. Complex scripts without bundling everything.** BasicUsage's stack is 25 families (NotoSans + 19 script families + SourceHanSans demo + the three named); FontExamples' Languages stack has 9 (NotoSerifSC alone is 17 MB). Layout uses no stack. Mobile: LIMIT, the cost is font data in the build; pick only the scripts the game ships.

**D6. CJK regional glyphs.**
```
<lang=zh-Hans>直 骨 雪 今 家 字 漢 社 海 神 真 食</lang>   (also zh-Hant, ja, ko)
```
```csharp
text.Styles.Add(Style.Tag(new LanguageModifier(), "lang"));
text.Language = "ja";      // whole text; null = none
```
Needs a font with `locl` (SourceHanSans-Demo as a stack family). Vendor note: region-specific cuts such as Noto Serif SC contain one glyph set and look identical across rows. The sample removes the `lang` style while a component `Language` is set and re-adds it on clear.

**D7. Math font.** Assign an OpenType MATH `UniTextFont` (STIX Two Math, OFL) to `MathModifier.MathFont`: `new MathModifier { MathFont = mathFont, Mode = MathMode.Display }` (G4).

## 4. Case library: layout, RTL, large documents, editing, media, 3D

### G. Layout and typography blocks

**G1. Alignment, justify, indent, lists, no-break, separators, ellipsis.** Registrations: `AlignmentModifier` `align`, `IndentModifier` `indent`, `ListModifier` `li`, `NoBreakModifier` `nobr`, `SeparatorModifier` ← `SeparatorParseRule` (void tag), `EllipsisModifier` `ellipsis`, `TruncateModifier` `truncate`.
```
<align=Start>..</align>  <align=Center>..</align>  <align=End>..</align>  <align=Left>سلام دنیا — physical Left pins an RTL paragraph</align>
<align=Justify>Justified: this longer paragraph stretches every full line ...</align>
<align=Justify,InterCharacter,Center>inter-character justify, centred last line (spaced CJK setting)</align>
<indent=2em>margin persists across every soft-wrapped line</indent>  <indent=1.5em>outer <indent=1.5em>nested adds to 3em</indent></indent>  <indent=8%>..</indent>
<li>Bullet level 0</li>  <li=1>Nested dash</li>  <li=2>Deeper dot</li>  <li=0,1>Ordered one</li>  <li=1,1>Nested a.</li>
one two three <nobr><b><color=#FFD447>four five six</color></b></nobr> seven eight nine
Home<sep>Products<sep>Docs<sep>Pricing        A<sep=" ● ">B<sep=" ● ">C
<ellipsis=1>END: this deliberately long passage ...</ellipsis>   <truncate=1>TRUNCATE drops the overflow ...</truncate>
```
`<align=Start/End>` flip with paragraph direction, `Left`/`Right` are physical. `<sep>`: each segment lays out as a whole unit and the separator collapses when its segment wraps; quote values with spaces (`<sep=" ● ">`). Ellipsis/truncate parameter: position, 1 = end, 0 = start, 0.5 = middle; it triggers only when the content overflows the box, so size the box. Game use: breadcrumb strips (`<sep>`), truncated item names (`<ellipsis=1>`), unbreakable item names in tooltips (`<nobr>`).

**G2. Width-animated harness for wrapping tests.** `example.SetContainerWidth(Mathf.Lerp(260f, defaultWidth, Mathf.PingPong(time * 0.22f, 1f)))` resizes the parent RectTransform's `sizeDelta.x`; the NoBreak, Separator and HighlightMappings slides use it. Use it to verify wrap, ellipsis and justify on narrow phones.

**G3. Component layout fields and UniText in layout groups.** Scenes set: `wordWrap` (1 for body text; 0 for single-line labels, buttons and the 2 MB log), `padding (l,t,r,b)`, `horizontalAlignment` (0 Start, 1 Center, 2 End, 3 Justify, 4 Left, 5 Right), `verticalAlignment` (0 Top, 1 Middle, 2 Bottom), `autoSize` on with `minFontSize`/`maxFontSize` (status text: size 38, min 10, max 43). In the Layout scene `UniText` sits under `VerticalLayoutGroup` + `ContentSizeFitter` (vertical PreferredSize) inside a ScrollRect; the bubble width comes from the layout group (`childControlWidth` on, `childForceExpandWidth` off, so the bubble hugs its text). Give the text `wordWrap` and cap the width from a parent `LayoutElement`.

**G4. LaTeX-style tables, text commands and math.** Tag-delimited math (default `MathDelimiters.Tags`): `<math>\frac{a+b}{\sqrt{x}}</math>`, which composes with `<size=160%>` and `<color=#55D6BE>`. The LaTeX slides enable a family of rules only while they show:
```csharp
// not compiled: condensed from LatexSlide
add(new TableModifier(),     new TabularParseRule());          // tabular / table / longtable
add(new AlignmentModifier(), new LatexAlignmentRule());        // center, flushleft, flushright, justify, \centering
add(new SizeModifier(),      new LatexSizeRule());             // \tiny .. \Huge
add(new ListModifier(),      new LatexListRule());             // itemize / enumerate
add(new LineGapModifier(),   new LatexSpacingRule());          // \vspace, \bigskip
add(null,                    new LatexTextRule());             // \\ breaks, ties, dashes, quotes
add(new BoldModifier(),      new LatexCommandRule("textbf"));  // also textit, emph, underline, textcolor
add(new MathModifier { MathFont = mathFont }, new MathParseRule { Delimiters = MathDelimiters.LatexInline });   // and LatexDisplay
```
Covered syntax: `$..$`, `\(..\)`, `\[..\]`, `\ce{..}`, `\pu{..}`, tables with booktabs (`\toprule \midrule \bottomrule`), `\multicolumn`, `\multirow`, `\cline`, `longtable`, nested and RTL tables, math environments (`matrix`, `pmatrix`, `cases`, `aligned`, `align`, `gather`, ...). `BackslashEscapeRule` must be off while these rules are on. Mobile: tables and formulas are heavy layouts; fine in a codex or help page, avoid in HUD.

**G5. Ruby (furigana).** Register `new RubyModifier()` ← `new RubyParseRule()`.
```
<ruby>漢字<rt>かんじ</rt></ruby>   <ruby>東<rt>とう</rt>京<rt>きょう</rt></ruby>タワー   <ruby=Tōkyō>東京</ruby>   <ruby>salam<rt>سلام</rt></ruby>
```
Vendor caption: `RubyModifier` settings are `Position = Over / Under` and `Align = SpaceAround / Center / SpaceBetween / Start`; base plus reading wraps as one unit and adjacent rubies never collide.

**G6. Base writing direction of the whole text.** `text.SetWholeText<DirectionModifier>("RightToLeft")` (values `LeftToRight`, `RightToLeft`, `Auto`), `text.ClearWholeText<DirectionModifier>()`. Caption: CSS `direction` analogue (UAX #9); `Auto` detects each paragraph.

### L. RTL, bidi and multilingual text

**L1. Mixed-direction UI strings.** The component needs only a stack with Arabic/Hebrew coverage; direction is automatic, and inline tags work inside RTL runs.
```
The word <color=#4ECDC4>مرحبا</color> means "hello" in Arabic
User <color=#FF6B6B>יוסי כהן</color> sent you a message
File: <color=#A06CD5>تقرير_٢٠٢٤.pdf</color> (15 MB)       Prices: $99 | ٩٩ ريال | ₪199
```
`<align=Start>`/`<align=End>` flip with the paragraph direction, `<align=Left>` is physical, the `<li>` marker flips side, and `<cspace=6>مرحبا بالعالم</cspace>` grows Arabic kashida at joins. Complex-script lines in ComplexScriptsSlide: Arabic ligatures (`لا الله بسم الله`), Hindi (`नमस्ते दुनिया`), Arabic joining via ZWJ, CJK.

**L2. Overrides.** Whole-text direction (G6) and language (D6) are component-level; `<lang=...>` is per range.

**L3. Script coverage.** The Layout scene renders a 40-script wall (Greek through Egyptian hieroglyphs, math symbols, currencies, emoji) with no stack; its Thai line wraps on real word boundaries. The package ships word-break dictionaries `<UniTextRoot>/Defaults/Dictionaries/CJKDictionary.asset` and `KhmerDictionary.asset`. Font cost: D5.

### M. Large documents

**M1. A 2 MB tagged log in a scrollable, selectable, windowed view.**
1. Create it with GameObject → LightSide → UniText → UniTextDocumentView, or instantiate `<UniTextRoot>/Defaults/DocView Both Axes.prefab`: viewport with RectMask2D, the document text, `UniTextDocumentView` (`autoHideScrollbars` on, `elastic` on, `elasticity 0.1`, `inertia` on, `decelerationRate 0.135`, `scrollSensitivity 1`, `startAt 0`).
2. On the document `UniText`: `UniTextDocumentLoader { source = TextAssetDocumentSource { asset = <TextAsset>, encoding = 0 } }` (loads on enable; use a file-path source for big files; Android/WebGL streaming assets load asynchronously), `UniTextSelectable` for selection, `wordWrap` off, `fontSize 24`.
3. Register the tags the file uses on that component only (`color`, `b`, `i`, `u`); tags are parsed across window edges exactly.
Without the loader: `var rope = FileTextSource.Load(path, text.ScanProfile); text.SetDocument(rope, takeOwnership: true);`. Rules: a document scrolls in its own view, never inside a `ScrollRect`. Navigation: `view.Position`, `ScrollToStart`, `ScrollToEnd`, `text.ScrollDocumentTo/By`, `RevealDocumentSpan`, `ScrollToCodepoint`, `ScrollToParagraph`; `FindAll` streams the document. The sample log: 30,925 lines, 3,034 tag runs on 2,179 lines, bold weights 500-1000, italic shears 10-45 plus `r`/`f`, 37 colour spellings (19 names, 18 hex forms). To keep a raw log unparsed turn `Use Global Style Preset` off on that component.

### I. Editing and input behaviors

**I1. The component ladder.** `UniText` → add `UniTextSelectable` (click/drag/double/triple-click selection, copy) → add `UniTextEditable` (document model, undo/redo, IME, clipboard, styles, focus, behaviors), plus plain UGUI parts (Image background, RectMask2D viewport, LayoutElement/VerticalLayoutGroup). Create via Hierarchy → Shift+Right Click → UniText → Input Field / UniTextEditable / UniTextSelectable, or instantiate `<UniTextRoot>/Defaults/Editing/InputField - UniText.prefab`. Behaviors are `[SerializeReference]` entries of `UniTextEditable.behaviors`, or a reusable `InputBehaviorPreset` asset in `behaviorPresets` (one preset is shared by two fields in BasicUsage). A bare `UniTextEditable` with `behaviors []` is a valid raw editor. Needs a UGUI `EventSystem`; toolbars that must not steal focus carry core `FocusGuard`.

**I2. Password field with show/hide eye.**
```csharp
void OnToggle(bool active) {
    toggle.targetGraphic.enabled = !active;                                   // swap the eye icon
    var password = editable != null ? editable.GetBehavior<PasswordBehavior>() : null;
    if (password != null) password.Revealed = active;                         // presentation only; stored text is plain
}
```
Scene fields: `PasswordBehavior{keepFocusOnSubmit 0, maskChar U+2022, allowCopy 0}`, `PlaceholderDecorator{target "Password..."}`, `DefocusOnCancelBehavior`. The behaviour is single-line, Enter submits, line breaks are rejected, every codepoint is masked, copy/cut is blocked unless `AllowCopy`, and secure native entry is used. The package doc adds `SelectAllOnFocusBehavior` and `NativeKeyboardBehavior` (password autofill hint, autocorrection off).

**I3. Chat composer and message list.**
```csharp
input.Submitted += OnSubmitted;                       // event Action<string>
var plain = input.VisibleText.Trim();                 // VisibleText = what the field shows; Text = markup
input.SetText(string.Empty);                          // clear after send
EventSystem.current?.SetSelectedGameObject(input.gameObject);  input.Activate();   // Activate(bool showKeyboard = true)
var message = Instantiate(prefab, content, false);  message.SetText(value);        // bubble = VLG + Back Image (ignoreLayout) + UniText
// next frame: Canvas.ForceUpdateCanvases(); scrollRect.verticalNormalizedPosition = 0f;
```
Composer behaviors: `SubmitKeyBehavior{submit = Enter (Shift+Enter = newline), keepFocusOnSubmit on}`, `KeyboardAvoidanceBehavior{keyboardPadding 32, onlyWhenOverlapping on, fallbackDuration 0.25}` with a screen RectTransform target, `PlaceholderDecorator`, `DefocusOnCancelBehavior`, `CaretContextBehavior` (toolbar), `MediaPasteAttachments` (J1), one preset. Doc recipe: preset = `SubmitKeyBehavior` + a `MediaInputBehavior` subclass + `LengthLimitBehavior` + `PlaceholderDecorator`. The sample's LLM reply call is demo scaffolding; a client-side API key is public in a build.

**I4. Rich-text toolbar (B / I / U / colour) mirrored from the caret.** A `CaretContextHandler` subclass listed in `CaretContextBehavior.handlers`:
```csharp
// not compiled: condensed from FormattingPanelHandler
[Serializable] public sealed partial class FormattingPanelHandler : CaretContextHandler {
    [SerializeField, StatePassive] private Toggle boldToggle;  // assigned in the inspector
    protected override void OnAttach(UniTextEditable owner) { editable = owner; boldToggle.onValueChanged.AddListener(OnBold); Sync(); }
    protected override void OnDetach(UniTextEditable owner) { boldToggle.onValueChanged.RemoveListener(OnBold); editable = null; }
    public override void OnContextChanged(in CaretContext change) => Sync();
    void Sync() {
        boldToggle.SetIsOnWithoutNotify(editable.IsStyleActive<BoldModifier>());
        paletteIcon.color = editable.TryGetStyleParameter<ColorModifier>(out var hex) && ColorParsing.TryParse(hex, out var c) ? (Color)c : Color.white;
    }
    void OnBold(bool _) { var on = editable.ToggleStyle<BoldModifier>(); boldToggle.SetIsOnWithoutNotify(on); }
    void OnColor() => editable.ApplyStyle<ColorModifier>("#4ECDC4");   // hex string parameter
}
```
The field's `Styles` must contain the modifier types being toggled. Toggles mirror pending typing styles too. `BehaviorPreset.asset` adds `TextFormattingBehavior` (`markupVisibility 0` = Hidden, `richPaste` on, `plainTextPaste 0` Auto, `typingMarkup 0` Parse, `arrowKeyEscape` on, a `markupChrome` rule colouring visible markup, shortcuts with the primary modifier Ctrl/Cmd: B, I, U, K = a `ToggleStyleCommand` for a Fill+Wave composite, Backslash = `ClearFormattingCommand`) and `LinkOnPasteBehavior` (pasting a bare URL over a selection makes it a link; needs a Markdown-link style in `Styles`, otherwise pastes plain).

**I5. Small behaviors.** `LengthLimitBehavior{limit, unit}` (unit defaults to graphemes: a family emoji counts 1, truncation never splits a cluster); `SelectAllOnFocusBehavior`; `DefocusOnCancelBehavior` (Escape/back/cancel releases focus); `NativeFieldOverlayBehavior{presenterId "system"}` (a platform-native replica on Android/iOS/WebGL while UniText stays the document; LIMIT on mobile because a native control exists in parallel); `PlaceholderDecorator{target}` (shows another `UniText` while the field is empty).

### J. Clipboard and media paste

**J1. Pasted or dropped images and files become attachment cards.**
```csharp
[Serializable][TypeDescription("received media becomes attachment cards")][TypeGroup("Samples", 99)]
public sealed partial class MediaPasteAttachments : MediaInputBehavior {          // not compiled: condensed
    [SerializeField, StatePassive] private RectTransform attachmentsBar;          // container with a Horizontal Layout Group
    [SerializeField, StatePassive] private AttachmentCard cardPrefab;             // RawImage + UniText label + remove button
    protected override bool OnImage(byte[] data, ClipboardFormat format) {
        if (!TryDecode(data, out var tex)) return false;  Spawn().ShowImage(tex);  return true; }
    protected override bool OnFiles(string[] paths) {
        foreach (var path in paths) { var bytes = ReadFile(path);
            if (bytes != null && ClipboardFormat.TryDetectImage(bytes, out _) && TryDecode(bytes, out var tex)) Spawn().ShowImage(tex);
            else Spawn().ShowFile(System.IO.Path.GetFileName(path)); }
        return paths.Length > 0; }
}
```
Return `true` to consume; otherwise the payload falls through to the text channels. `ReadFile`/`ReadFileAsync` read file references (platform prompts happen on a real paste/drop only). Setup: the two serialized references; the card prefab wires its remove button to `AttachmentCard.Remove`. Free runtime textures yourself (the card does it in `OnDestroy`).

### K. Inline sprites and objects

**K1. `<sprite=name>` from a `UniTextSprites` asset.**
```csharp
var modifier = new SpriteModifier { Provider = new AssetSpriteProvider { Asset = sprites } };
text.Styles.Add(new Style { Modifier = modifier, Source = new TagRule("sprite") });   // scenes use InlineTagRule("sprite"): void tag, no closing tag
```
```
<sprite=cat-sulejman> starts the first line beside ordinary text.    The fifth mixes <sprite=cat-sulejman> text <sprite=unitext-logo> in one run.
```
Asset entry fields: `name, sprite, size, bearingOffset, pivot, rotation, advance, lineHeightAbove, lineHeightBelow, color, preserveAspect`; the metrics define how the sprite sits in the line (a tall sprite raises `lineHeightAbove`). Setup: a `UniTextSprites` asset (Create menu) and `AssetSpriteProvider`. Game use: currency and element icons in card text.

**K2. Literal syntax the vendor lists but does not run** (AssetBackedModifiersSlide, "setup required"): `<sprite=heart>`, `<sprite=heart,i>` (currentColor), `<sprite=heart,#FF0000>`, `<obj=icon/>` ("instantiates a RectTransform inline"), `<mat>` / `<mat=#FF8800>` ("routes glyphs to a sub-mesh material"), `<var=700>`, `<var=700,80>`, `<var=150%>`, `<var=+200>`. These need provider/material setup; see [unitext-inline-media.md](unitext-inline-media.md).

**K3. Prefab objects in the line.**
```csharp
var provider = new InlineObjProvider();
provider.Entries.Add(new InlineObject { Name = "cube", Source = spinningCubePrefab });   // RectTransform prefab
text.Styles.Add(Style.Tag(new ObjModifier { Provider = provider }, "obj"));              // one clone per tag
// text: "Cubes <obj=cube> sit\nin <obj=cube> the <obj=cube> line"
```
Shown in the 3D sample; the same API applies to 2D text. Mobile: LIMIT, every tag is an instantiated object.

### N. UniText 3D (extruded text)

Every 3D case needs the UniText 3D module and its shader/materials; every solid is real geometry (bevel segments x glyphs), so keep counts low on mobile and animate in the shader (`animateInShader` is on in the prefab) instead of rebuilding per frame.

**N1. Spawn one extruded text from the prefab.**
```csharp
var spawned = Instantiate(textPrefab, stage);     // <UniTextRoot>/3D/Defaults~/Text 3D (UniText).prefab (scale 0.01)
spawned.rectTransform.localPosition = position;
spawned.rectTransform.sizeDelta = new Vector2(width, fontSize * 1.6f);   // layout box in points; sample default width 1250
spawned.FontStack = fontStack; spawned.Font = font; spawned.FontSize = fontSize; spawned.Text = text;
spawned.RaycastTarget = false;                    // pointer events only when a slide turns it on
```
The example keeps a `created` list and destroys it on slide exit; runtime materials (`new Material(candy)`) are owned the same way.

**N2. Solid look from code.**
```csharp
text.Depth = 0.15f;                                            // fraction of font size
text.FrontBevel = new Text3DBevel { shape = Text3DBevelShape.Round, width = 0.04f, height = 0.04f, segments = 6 };   // not compiled: field names as the sample sets them
text.FaceMaterial = face; text.BevelMaterial = edge; text.SideMaterial = side;   // also BackMaterial, BackBevelMaterial
look.ApplyTo(text);                                            // Text3DLook asset: depth + bevel + materials + layers in one call
flat.SetFloat("_LightInfluence", 0f);                          // unlit copy of the same material
```
Bevel profiles: `Chamfer Round Cove Bead Step TwoSteps Ogee Engraved Custom`; `Custom` takes `bevel.curve = Ease.Of(EasingType.BounceOut)`.

**N3. Layers (outline, ring, per-word outline, plate, stencil, neon tube).**
```csharp
var layer = Text3DLayer.Default;                  // Text3DLayer.HighlightPlate is a ready plate
layer.offset = 0.06f; layer.depth = 0.12f; layer.color = Color.white; layer.faceMaterial = material;
layer.unit = Text3DLayerUnit.Word;                // Glyph | Word | Line | Text
layer.shape = Text3DLayerShape.Box;               // Box (plate) | Tube (neon)
layer.cut = Text3DLayerCut.Stencil;               // letters cut through the plate
text.Styles.Add(Style.WholeText(new Layer3DModifier { Layer = layer }));        // whole text
text.Styles.Add(Style.Tag(new Layer3DModifier { Layer = layer }, "plate"));     // or only tagged ranges
text.Glyphs = false;                              // hide the letters: a neon sign = Tube layers over a dark Box board
```
A range's layer can be swapped from code (`flicker.Layer = on ? lit : dark;`, assign the struct back).

**N4. 3D motion and the 2D set on solids.** `text.SetWholeText<Spin3DModifier>()` (also `Swing3D`, `Wave3D`, `Orbit3D`, `Tumble3D`). The 2D `wave bounce pulse shake wobble spin` modifiers run unchanged on solids (`Style.Tag(new WaveModifier(), "wave")`). `ColorModifier` colours solids per glyph, `FillModifier` paints gradients, `<u>`/`<s>` extrude with their glyphs.

**N5. 3D reveals, deformers, per-range 3D styles.** Reveal handlers `Flip3DRevealHandler`, `FlyIn3DRevealHandler`, `Extrude3DRevealHandler`, `Tumble3DRevealHandler` plus `DropRevealHandler`, in an `InlineRevealHandlerProvider` as in the companion file (E3). Deformers: `var d = Text3DDeformer.Default; d.kind = Text3DDeformerKind.Bend; d.angle = 80f; text.Styles.Add(Style.WholeText(new Deform3DModifier { Deformer = d }));` kinds `Bend, Twist, Taper, Wave, Sphere`; animate by copy-modify-assign (`var t = deform.Deformer; t.angle = a; deform.Deformer = t;`). Range styles: `Bevel3DModifier` (`<edge>`), `Surface3DModifier` (`<gold>`), `Layer3DModifier` (`<plate>`), all sample-private tag names.

**N6. Objects on glyphs (`Attach3DModifier`).**
```csharp
var candles = new Attach3DModifier { Placement = Text3DAttachPlacement.Top, Seed = 4 };  candles.Prefabs.ReplaceAll(candlePrefabs);
var snow = new Attach3DModifier { Placement = Text3DAttachPlacement.Surface, Surfaces = Text3DSurfaces.FrontEdge | Text3DSurfaces.Side,
    Facing = 0.55f, Count = 90, Spacing = 0.045f, AlignToSurface = true, ScaleJitter = 0.3f };    // not compiled: abridged
text.Styles.Add(Style.Tag(candles, "candles"));       // markup: "<candles><sprinkles>Happy Birthday</sprinkles></candles>"
cake.SetWholeText<Wave3DModifier>();                  // copies follow poses and deformations
```
Other placements: `Bottom` (icicles), `Centerline` (marquee bulbs, `Count = 200`). Attachment prefabs are measured in em (copy size = prefab size x glyph em). Counts of 40-200 per text are what the sample uses; on mobile start far lower.

**N7. Pin to surfaces, pointer field, shatter.**
```csharp
if (text.Raycast(camera.ScreenPointToRay(InputUtils.MousePosition), out var hit) && hit.surfacePoint.IsValid) pins.Add((gem, hit.surfacePoint));
if (text.TryGetPose(in point, out var pose)) { gem.SetPositionAndRotation(pose.position, pose.SurfaceRotation); gem.localScale = Vector3.one * pose.em; }
var field = orb.gameObject.AddComponent<UniText3DField>(); field.Radius = 2.2f; field.Softness = 0.75f;
text.gameObject.AddComponent<UniText3DColliders>().Shape = Text3DColliderShape.ConvexHulls;
pieces = text.Shatter(materialCopies);                // GameObject[] one per glyph; needs the Physics module (LIGHTSIDE_HAS_PHYSICS)
```
`Field3DModifier{Offset, Rotation, Scale, Color, Smoothing}` with `Fields.Add(field)` is registered `Style.Tag(reach, "field")` and the text wrapped in `<field>..</field>`. `text.GetRangeBounds(0, text.CodepointCount, rects)` returns local rects (needs `text.Buffers != null`). Mobile: AVOID.

**N8. Scene prerequisites.** Enable the UniText 3D module; `WorldPointerRaycaster` on the camera for pointer events on solids (plus `RaycastTarget`); lights and a reflection cubemap for metals; URP and Built-in use shader `LightSide/Text 3D`, HDRP needs `LightSide/Text 3D HDRP` (shipped under `<UniTextRoot>/3D/HdrpAssets~/`, outside the asset database until copied); `SamplePostProcessing` (bloom, ACES, vignette, TAA) is optional polish. On narrow screens the example widens the camera FOV (`Camera.HorizontalToVerticalFieldOfView(Camera.VerticalToHorizontalFieldOfView(designFov, 16f/9f), aspect)`).

---

## 5. Setup each family of cases needs

| To get | You must have |
|---|---|
| Any tag in these cases | a `Style`/`StylePreset`/global preset registering that tag name on the **displaying component** (A1) |
| Fonts and named families | `UniTextFont` assets in a `UniTextFontStack` (`primary`, optional `faces[]`, optional `name`, `preferredLanguage`); assign `FontStack` or a single `Font`; both null = automatic OS fallback (not on WebGL) |
| Paint tags, `PaintRef.Named` | a `UniTextPaints` asset in `AssetPaintProvider{Asset}` (or `InlinePaintProvider` swatches in code); `GlobalSettingsPaintProvider` reads the settings' paints |
| `<sprite=name>` / `<obj=name>` | `UniTextSprites` + `SpriteModifier{AssetSpriteProvider}`; `InlineObjProvider` entries + `ObjModifier` |
| Math | an OpenType MATH font in `MathModifier.MathFont` |
| CJK regional forms | a font with `locl` as a stack family, then `<lang=...>` or `Language` |
| Selectable / editable | `UniTextSelectable` (+ `UniTextEditable`) on the same GameObject as `UniText`, a UGUI `EventSystem`, behaviors/presets in the inspector |
| Media paste | a `MediaInputBehavior` subclass (partial, serializable, `[TypeDescription]`) and its references |
| Large document | `UniTextDocumentView` + `UniText` + `UniTextDocumentLoader`; markup tags registered on that text |
| 3D | module enabled (`UNITEXT_3D`), URP or Built-in shader (HDRP needs its own), `WorldPointerRaycaster` for pointer input, Physics module for `Shatter` colliders |
| Dependencies | `media.lightside.core`, `com.unity.burst`, `com.unity.ugui`; Unity 2022.3+ |

---

## 6. Pitfalls (formatting, fonts, layout, editing, media, 3D)

1. **Unregistered tag = no effect.** The vendor never relies on a built-in tag table. A fresh prefab plus an empty global preset leaves `<b>` unclaimed.
2. **Collisions follow registration layers.** Local `Styles` → `StylePresets` → global preset; first registered wins. `MarkdownWrapRule` priority is the marker length; trigger and URL detectors run at -100 so explicit markup wins.
3. **`Text` vs `SetText`.** `Text` serializes (dirties the scene in edit mode, normalizes line endings); `SetText` does not persist, ignores an unchanged string, but re-reads `char[]`/`ReadOnlyMemory` buffers every call.
4. **Escapes.** Use `\<` for literal tags; with `BackslashEscapeRule` active a LaTeX `\\` becomes an escaped backslash; escape `\#` where `TriggerWordParseRule("#")` is registered.
5. **Markup in text you do not control.** The chat shows replies through a component whose styles are active, so `<b>`, `**`, `[x](url)` and `@name` in a reply are parsed. Show untrusted text on a component with `Use Global Style Preset` off and no styles, or escape it.
6. **Named families are exact strings**; an unknown name falls back and logs. `<b=700,r>` needs a real bold face; `<var=..>` needs a variable `UniTextFont`.
7. **Slot syntax.** Empty slots are meaningful (`<u=,double>`, `<line-height=,primary>`); values with spaces stay in one slot (`<wave=3 3,2,0.35>`, `<inner-shadow=#000000E0,0.05 -0.07>`); `<sep=" ● ">` needs quotes; a composite consumes `;` segments in child order.
8. **Runtime styles live in a serialized list.** Remove what you added when the owner dies; destroy runtime `StylePreset` objects; unsubscribe event handlers (companion file, H1).
9. **Documents** need `UniTextDocumentView` and never sit inside a `ScrollRect`; the sample log uses `wordWrap` off.
10. **Layout.** Under `VerticalLayoutGroup`/`ContentSizeFitter` the width comes from the parents; set `wordWrap` and cap the width from a `LayoutElement`.
11. **3D cost.** Bevel segments x glyphs, plus layers, deformers and attachments multiply geometry; WebGL has no system fonts; pointer events need `WorldPointerRaycaster` and `RaycastTarget`; `Shatter` needs colliders and the physics define; shaders differ per pipeline.
12. **Emoji.** No emoji font needed, tints do not recolour emoji, `<b>`/`<i>` do not change them, ZWJ/flag/skin-tone sequences are one cluster, and length limits count graphemes by default.
13. **Sample scaffolding is not API.** The lazy registration helper, the Gemini key field, `DraggableRect` and `EventSystemBootstrap` are demo plumbing.

---

## Unverified

- How an unclaimed tag shows at runtime (literal text or stripped). The BasicUsage `StatusText` has no styles yet receives `<color=...>` strings; in a fresh import either a global preset supplies `color` or the tag shows literally. The 2 MB log also contains unregistered fragments such as `<PostProcess>b__417_0`; the sample does not say how they are treated.
- Which markup syntax `ToggleStyle<T>()` and the shortcut commands write when a field registers several syntaxes for one modifier (composer: `<cat>` and `%%`; password field: `<b>` and `**`).
- Meaning of `f` in `<i=f>` (caption "font's own slant") versus bold's `f` (forced synthetic); meaning of `~` in `<var=~,~,~,-12>`; the exact slot names of `<u>`/`<s>` beyond the observed forms; the parameter grammar of `<align=Mode,JustifyMode,LastLine>` beyond the three observed examples.
- Unit of the `UniTextSprites` metrics (size/advance/bearing/lineHeightAbove); the chat scenes' `InlineTagRule` default parameter `test` and the sprite provider those scenes reference is not shipped in the package.
- Whether a per-range `<lang>` beats `UniText.Language` (slide text says yes; slide code removes the tag style while a component language is set).
- Whether `UniText3D` honours the global style preset (every 3D sample registers its tags locally).
- Slot semantics of `fox,linear,0;0 3,3,0.5` in the `ToggleStyleCommand` (swatch name first is clear; `linear`, `0` not verified).
- Several FontExamples `Test` objects reference a `fontStack` that is not in the package; what the vendor project assigned there is unknown (they render through `font` plus default fallback).
