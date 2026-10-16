# UniText — Fonts, Font Families, Languages

> **Base path:** `<UniTextRoot>` is the folder of the UniText package — the one whose `package.json` has `"name": "media.lightside.unitext"` (find it with `Glob **/media.lightside.unitext/package.json`; it may sit under `Packages/` or `Library/PackageCache/`). Never hard-code its location.
> See also: [unitext-components-setup.md](unitext-components-setup.md), [unitext-markup-system.md](unitext-markup-system.md), [unitext-formatting-tags-quickref.md](unitext-formatting-tags-quickref.md), [unitext-emoji.md](unitext-emoji.md), [unitext-performance-mobile.md](unitext-performance-mobile.md), [unitext-tmp-migration.md](unitext-tmp-migration.md), [unitext-runtime-api.md](unitext-runtime-api.md), [unitext-materials-shaders.md](unitext-materials-shaders.md), [unitext-version-traps.md](unitext-version-traps.md)

---

Scope: UniText 3.30.0 fonts — asset types, families and stacks, fallback and resolution, bold/italic/variable axes, language, shipped default fonts and their glyph coverage, atlas and build-size numbers, editor tools, runtime creation. Mobile verdicts (`OK` / `LIMIT` / `AVOID`) come from reading source and docs; nothing was profiled. Memory sizes are arithmetic from the atlas formats (labelled "derived"); the only vendor-stated figures are the file sizes of shipped assets and the tile/page defaults.

## 1. Task → answer lookup

| I need to... | Do this |
|---|---|
| Use my own TTF/OTF | Select the file, `Assets > Create > LightSide > UniText > Fonts > Font Asset`. UniText does **not** use Unity `Font` or TMP font assets; the file bytes are embedded (compressed) in the `UniTextFont` asset. Assign it to the component's **Font** (one font) or put it in a `UniTextFontStack` (several). See C1-C2. |
| Get real Bold / Italic / Bold-Italic | Create one asset per static file, select them all, `Fonts > Font Stack (Combined)` → one family (primary = Regular, others in `faces`), assign to **Font Stack**, register the `b`/`i` tags. Or use a variable font (C3, C8). |
| Pick a font from markup | `<font=name>` — `name` is a `FontFamily.name` typed in the component's FontStack (case-sensitive). Needs the `font` tag registered. Code: `text.SetWholeText<FontModifier>("name")` (C6). |
| Fallback for missing symbols | Put a font that has them **after** the primary in the stack (or chain stacks with `FallbackStack`). Otherwise the OS font draws them (differs per device) or a box appears (C4, C5). |
| Cyrillic | Shipped `NotoSans-Regular` covers the whole Cyrillic block incl. Ё ё І Ї Є Ґ Ў. Shipped Arabic/Hebrew fonts have **no** Cyrillic. A display font without Cyrillic: add Noto Sans after it (C4). |
| `↑ ↓ ← → ✓ ★ ≈ ≤ ≥ ∞ ♥ ●` | **Not** in shipped Noto Sans (§7). Add a symbol-capable font to the stack; do not rely on device fonts (C5). |
| Variable-font axis (weight/width/slant) | Create the asset from the variable file; pin axis defaults in **Variable Font Axes**; `<var=700,80>` or `<b>`/`<i>` (C8). |
| Pixel-art font | Create the asset normally; Pixel Grid is auto-detected; use font sizes that are multiples of the grid; keep Snap To Pixel Grid on (C13). |
| Color font / emoji font | `Fonts > Color Font Asset` from a CBDT/sbix/COLR font, add to the stack (C14, [unitext-emoji.md](unitext-emoji.md)). |
| Use an OS font | `Fonts > System Font Asset` with per-platform names, or leave Font/FontStack empty to get the OS default sans-serif. Not on WebGL (C15). |
| Different font per language | `FontFamily.preferredLanguage` + a language set via `text.Language`, `<lang=..>` or `UniTextSettings.Language` (C9). |
| Load a font at runtime | `UniTextFont.CreateFontAsset(byte[])`, then `text.Font = font` (C11). |
| Make a font smaller | Font Subsetter (Keep mode) or `UniTextFontEditorUtility.Subset` (editor only) (C12). |
| Match glyph heights across fonts | Font Size Match (`XHeight` for body text, `CapHeight` for caps/symbol fonts); off by default (§4.4). |
| Sharp corners on outlines | `text.RenderMode = UniTextRenderMode.MSDF` — 4x atlas memory (C16, §9). |
| Equal-width digits in a HUD counter | `<feature=tnum>` if the font has `tnum` (C17). |
| Know which font draws a character / why a box | `text.FontProvider.FindFontForCodepoint(cp)` (C18). |
| Thai/Lao/Khmer/Myanmar line breaks | Dictionary assets in `UniTextSettings.Dictionaries` — never needed for Latin/Cyrillic (§8). |
| `<b>` shows as literal text | No tag is built in; register styles (§3, C7). |
| Cut atlas memory | SDF 8-bit, 1024 pages, avoid MSDF and many variants (§9). |
| Migrate TMP fonts | `Tools > LightSide > UniText > Migration` ([unitext-tmp-migration.md](unitext-tmp-migration.md)). |

## 2. Font asset model

### 2.1 Layers

1. **Component** (`UniText` / `UniTextWorld`, both `UniTextBase`): `Font` (optional single primary), `FontStack`, `RenderMode`, `FontSize` (default 36), whole-text `Language`.
2. **`UniTextFontStack`** (ScriptableObject): ordered `FontFamily` entries plus an optional `FallbackStack`. It flattens to one chain: own families, then the fallback stack's families, depth-first. A cycle throws `InvalidOperationException` on assignment/enable.
3. **`FontFamily`** (serializable struct): `name`, `primary`, `faces[]`, `preferredLanguage`. Faces are split into upright and italic by the `isItalic` flag read from each font file; lookup order inside a family is primary, upright faces, italic faces.
4. **`UniTextFont`** (ScriptableObject) and its three sealed subclasses: `UniTextFontVariant`, `UniTextSystemFont`, `UniTextColorFont`. You cannot subclass the built-in types.
5. **`UniTextFont.Core`**: the runtime object (face access, glyph tables, atlas pipeline), created lazily on first glyph/shaping need. First access is main-thread unless a provider already captured it.
6. **`UniTextFontProvider`**: one per component, composes `[Font?] + [stack families...] + [SystemFont.Default?]` and resolves codepoint sequences to a concrete face. The first family with a non-null primary is the *primary*: its metrics set line height, ascent and descent.

FreeType rasterizes, HarfBuzz shapes. Glyph atlases are built **at runtime** (dynamic, shared per render mode); there is no editor atlas baking.

### 2.2 Asset types

| Type | Create via | Holds / role | Mobile |
|---|---|---|---|
| `UniTextFont` | `Assets > Create > LightSide > UniText > Fonts > Font Asset` on a `.ttf/.otf/.ttc/.otc` (or Unity `Font`); Tools window; code `CreateFontAsset(byte[])` | One face: `FaceInfo`, raster tuning, axis defaults, glyph overrides, Zstd-compressed bytes. Render mode is **not** a font property. `.ttc/.otc` creates face 0 only. | OK — compressed in the build, memory-mapped when active |
| `UniTextFontVariant` (sealed) | `... > Fonts > Font Variant` with a `UniTextFont` selected | Borrows another font's bytes (`Source`, `FaceIndex`); owns metrics, raster settings, axis defaults, glyph overrides. Use it to pin a variable-font design point (e.g. `wght=900` as a "Black" face) or to render one file two ways. | LIMIT — own atlas tiles and shaper cache per variant; do not create many |
| `UniTextSystemFont` (sealed) | `... > Fonts > System Font Asset` | Per-platform tabs (Common, Windows, macOS, Linux, iOS, Android): `fontName`, `defaultWeight`, FaceInfo override, `sdfDetailMultiplier`, `tileSizeOffsetOverride`. Bytes come from the OS by family **name**. No glyph overrides. Not supported on WebGL. | OK — no bytes in the build; first use of a rare script costs a platform lookup (cached) |
| `UniTextColorFont` (sealed) | `... > Fonts > Color Font Asset` | CBDT/sbix bitmap or COLRv0/v1 glyphs; `ColorPixelSize` 16..512, default 128 (64 on WebGL). SVG-in-OpenType is detected but not rendered. | LIMIT — shares the RGBA32 color atlas (§9); the first color font loaded fixes the tile size, larger ones are downscaled |
| `UniTextFontStack` | `... > Fonts > Font Stack (Combined)` (2+ fonts selected) or `Font Stack (Per Font)` | `families[]`, `fallbackStack`. Combined groups fonts by `FaceInfo.familyName`, primary = nearest weight 400 upright, rest into `faces`; **family `name` is left empty**. | OK |
| `WordSegmentationDictionary` | Tools window > Dictionary Builder | Compiled trie for dictionary-based word breaking; active only when listed in `UniTextSettings.Dictionaries`. | AVOID unless the script needs it (2-18 MB each) |

Create menu entries under `Assets > Create > LightSide > UniText > Fonts`: Font Asset, Color Font Asset, System Font Asset, Font Stack (Combined), Font Stack (Per Font), Font Variant. The LightSide command palette (Shift + Right Click in Project/Hierarchy) offers the same entries.

### 2.3 Resolution order for a codepoint sequence

1. **Emoji presentation** → the `UniTextColorFont` from the chain that covers the first codepoint, otherwise the platform emoji cascade. These codepoints **never** use the normal chain. `Disable Emoji` turns this off globally.
2. **`<font=name>`** on the range → that family is tried first; inside it the best-scoring face that covers the sequence wins (`<font=header><b>` picks the header family's bold face). If the family cannot cover a codepoint, resolution continues below — not an error.
3. **Language-matched families** — when the run has a language, families whose `preferredLanguage` matches are tried next, in chain order. Match = case-insensitive prefix at a subtag boundary (`zh` matches `zh-Hans` and vice versa).
4. **Remaining families in chain order**: component `Font`, the stack's families, fallback-stack families, finally `SystemFont.Default` (OS fallback; absent on WebGL or when disabled). Inside a family, faces are scored (unsupported requested axes ×1,000,000; wrong slant +100,000; CSS Fonts L4 §5.2 weight distance); the best-scoring face that actually covers the sequence is used, else the next best, else the next family.
5. **Nothing covers it** → the primary font's `.notdef` (usually a box).

Results are cached process-wide per (codepoint, chain hash, language, style key, explicit font) and shared by every text with the same fonts and language.

### 2.4 Components with no font assigned

A component with **neither Font nor FontStack still renders** with the OS default sans-serif (`SystemFont.Default`: Segoe UI / Roboto / Helvetica Neue / DejaVu Sans). The shipped `Text (UniText)` prefab has both slots empty; only the Selectable Text prefab and some samples reference the default stack asset. There is **no** project-wide default font stack setting (removed in 2.5.0). On WebGL there is no OS font: the provider logs an exception ("no font assigned and no OS default font available") and the text does not render. Always assign a font for a deterministic look.

### 2.5 Bold and italic realization

| Request | Result |
|---|---|
| `<b>` | Target weight = `min(1000, max(700, primaryFaceWeight + 300))`. Uses a real family face with the nearest weight (CSS rule) **or** sets the variable `wght` axis to the target. If neither reaches it, synthetic dilate of `(target − faceWeight)/300` steps; each step = `em/24` total stroke and the same advance growth (line breaks stay consistent). |
| `<b=700,f>` | Force synthetic bold on the current face. |
| `<b=700,r>` / `<b=,r>` | Real face only; stays at natural weight if there is none. |
| `<i>` | Real italic face (family italic face, variable `ital` ≥ 0.5 or `slnt` axis, OS italic cut for system fonts), else synthetic shear using the run font's `ItalicStyle` (asset default 30 = top leans right by 0.30 of height, about 16.7°). |
| `<i=20>` | Force synthetic shear 20 (range −100..100), ignores real faces. |
| `<i=f>` | Synthetic shear using the font's own `ItalicStyle`. |
| `<i=r>` | Real italic only; upright if none. |

Color fonts never get synthetic bold/italic. A system font (OS default or `UniTextSystemFont`) pulls the **real installed bold/italic cut from the OS** instead of synthesizing. `UniTextFont.FakeBoldWeight` is a separate always-on baseline bold for every glyph of one font. Synthetic italic shears around half x-height; the line gets a bleed reserve.

### 2.6 Language

Three inputs feed one per-codepoint language value: component `Language` (a whole-text `LanguageModifier`), `<lang=tag>` per range, and project-wide `UniTextSettings.Language` (used only where neither is set). The tag (a) goes to HarfBuzz and drives OpenType `locl` (Han unification: Chinese/Japanese/Korean forms of one codepoint), (b) steers `preferredLanguage` family choice, (c) is passed to the OS font matcher as locale. Line breaking and case conversion do **not** depend on language. Setting `text.Language` adds the style automatically; null/empty removes it. `LanguageRegistry` accepts at most **255** distinct tags per process; an ill-formed tag (subtags of 1-8 ASCII letters/digits joined by `-` or `_`) yields "unset" — `<lang>` logs a warning and the range keeps the text's language.

### 2.7 System font backends

| Platform | Backend | "System Sans-Serif" default |
|---|---|---|
| Windows | `WindowsFontBackend` | Segoe UI (serif Times New Roman, mono Consolas) |
| macOS / iOS | CoreText | Helvetica Neue (serif Times, mono Menlo); a `San Francisco` entry maps to `.AppleSystemUIFont` |
| Android | `AFontMatcher` NDK API on **API 29+**; `/system/etc/fonts.xml` parser below API 29 | Roboto (serif Noto Serif, mono Droid Sans Mono); role entries follow the device's own sans/serif/mono, incl. manufacturer replacements |
| Linux | fontconfig | DejaVu Sans |
| WebGL | none (`SystemFont.Default` is null) | — |

A family-name entry is rejected when the OS substitutes a different family; role entries accept whatever the OS binds. Names compare case-insensitively on Windows, ordinally elsewhere.

### 2.8 Atlas model

One process-wide glyph atlas per render mode (SDF, MSDF) plus one color atlas. Tiles are 64/128/256 px; the class is chosen by glyph **contour complexity** (not text size), shifted by `SDF Detail` / `Tile Size Offset`. Glyphs rasterize lazily on the CPU (Burst) when first drawn and upload through the native GPU plugin; unreferenced glyphs are evicted LRU and pages are compacted/shrunk after a frame with no allocations. Render mode is a **component** property. Variable-font instances and `UniTextFontVariant`s each get their own glyph entries. Heavy effects (outline, glow) enlarge tiles by re-rasterization ([unitext-materials-shaders.md](unitext-materials-shaders.md)).

## 3. Tags and modifiers that touch fonts

**No tag is wired by default.** A fresh component, the shipped prefabs (empty `styles`) and `UniTextSettings` (no global style preset) understand no tags; `<b>x</b>` renders literally. Tags exist only through a `Style` on the component, in a `StylePreset`, or in `UniTextSettings.GlobalStylePreset`. The Styles picker offers presets with default names (below); `Style.Tag(modifier, "name")` accepts any name. The TMP migration window does not create tags — a preset supplies them. For the full bootstrap see the master rule section "Tag vocabulary bootstrap" and [unitext-markup-system.md](unitext-markup-system.md).

| Tag | Modifier | Registered by | Parameters | Mobile |
|---|---|---|---|---|
| `<b>` (Markdown `**x**`) | `BoldModifier` | picker preset "Bold" (`.Tag("b").Markdown("**")`) / code | 1: CSS weight 1..1000 (empty/0 = auto); 2: `f` synthetic or `r` real-only. `<b>`, `<b=700>`, `<b=700,f>`, `<b=,r>` | OK — synthetic = shader dilate + advance change |
| `<i>` (Markdown `*x*`) | `ItalicModifier` | picker "Italic" (`.Tag("i").Markdown("*")`) / code | 1 token: empty auto; integer = shear percent; `f`; `r` | OK |
| `<font=name>` | `FontModifier` | picker "Font" (`.Tag("font")`) / code | `FontFamily.name` in the component's FontStack. Unknown name → one `LogWarning` per name, default rendering | OK |
| `<var=...>` | `VariationModifier` | picker "Variation" (`.Tag("var")`) / code | Positional `wght, wdth, ital, slnt, opsz`; `~` skips; each value absolute, `NNN%` of the font default, or `+N`/`-N` delta. Ranges: wght 1..1000 (% 25..225, delta −300..500), wdth 50..200 (% 50..200, delta −50..100), ital 0..1, slnt −90..90, opsz 1..144 (% 8..1200, delta −11..132). `<var=700>`, `<var=150%>`, `<var=+200>`, `<var=700,80>`, `<var=~,~,~,-12>` | LIMIT — each distinct axis tuple = one registered instance with its own atlas glyphs; max 255 configs per text; values clamp to the font's min/max; never animate continuously |
| `<feature=...>` | `FontFeatureModifier` | picker "Font Features" (`.Tag("feature")`) / code | Comma-separated 4-char OpenType tags; bare = on, `-liga` off, value after space/colon/equals (`kern 0`, `tnum`, `ss01 2`, `-kern,+dlig`); unknown tags ignored; nested features merge, innermost wins | OK |
| `<lang=tag>` | `LanguageModifier` | picker "Language" (`.Tag("lang")`) / `text.Language` | BCP 47 (`zh-Hans`, `ja`, `ru`). Ill-formed → warning, range keeps the text's language | OK |
| (whole text) | `FontSizeMatchModifier` | picker, Layout group / Project Settings | `metric` (`FontNormalizeMetric`, modifier default XHeight), `target` (0 = match primary) | OK |
| (whole text) | `GlyphResolutionModifier` | picker, Appearance group | Raises the atlas tile resolution of the range (grow-only, shared) | LIMIT — more atlas memory |

`<upper>`, `<lower>`, `<smallcaps>` (uses `smcp` when the font has it), `<size>`, `<cspace>`, `<sup>`/`<sub>` (`sups`/`subs`, synthesized otherwise) are text-style tags covered in the formatting references. Case conversion uses simple Unicode mappings: no Turkish dotless-I.

## 4. Inspector fields and settings

### 4.1 `UniTextFont` inspector

| Label (member) | Type, default, range | Effect |
|---|---|---|
| Italic Style (`ItalicStyle`) | float, 30; 0 falls back to 30; negative leans left | Synthetic slant in percent of height (30 = 0.30·height, about 16.7°, not 30°). |
| Spacing Offset (`SpacingOffset`) | int design units, 0 | Extra advance for every glyph; adds to style-level letter spacing. |
| Space Width (`SpaceAdvance`) | int design units; **−100 = auto** | Replaces the HarfBuzz space width. |
| Fake Bold Weight (`FakeBoldWeight`) | float 0..2, 0 | Baseline synthetic bold in CSS-weight steps (1 ≈ Regular→Bold), SDF dilate + advance compensation; no effect on color fonts. |
| Font Scale (`FontScale`) | float 0.1..5, 1 | Visual size multiplier for fonts drawn too small/large. |
| Normalize Size (`participatesInNormalization`) | bool, true; auto-false for pixel fonts | Lets font-size normalization rescale this font (only active when Font Size Match is on). |
| SDF Detail (`sdfDetailMultiplier`) | float 0.25..8, 1; hidden for pixel fonts | Scales the contour-complexity estimate that picks the tile class; raise for hairline/calligraphic faces. |
| Tile Size Offset (`tileSizeOffset`) | int −2..2, 0; hidden for pixel fonts | Steps the chosen tile along 64/128/256 (+1 larger), clamped; per-glyph overrides ignore it. |
| Pixel Grid (`pixelsPerEm`) | int 0..128; 0 = distance field | Pixel-art grid, auto-detected on creation; **Detect Pixel Grid** re-detects. |
| Snap To Pixel Grid (`snapToPixelGrid`) | bool, true | Origins and effect/animation offsets round to whole font pixels; no effect when Pixel Grid = 0. |
| Face Info / Metrics (`FaceInfo`) | struct, design units | Edit when a font ships bad `lineHeight`/`ascentLine`/`descentLine`; **Reset Metrics** re-reads the file. Family/style/weight/italic are read-only except on variants. |
| Units Per Em | int, usually 1000/2048 | The value the text is sized by. |
| Glyph Overrides (`glyphOverrides[]`) | `{glyphIndex, tileSizeOverride (0 auto/64/128/256), advanceScale (0 or 1 = unchanged), offset (em, visual), scale (visual)}` | Per-glyph fixes, e.g. icon-font spacing. |
| Variable Font Axes (`axisDefaults[]`) | `{tag (4-char OpenType), value}` | Pins any axis (also `GRAD`, `opsz`, which `<var>` cannot address); base for `<var>` %/delta; drives rendering when no `<var>` is active. |
| Collection Face | int | Face index for `.ttc/.otc` files. |
| Font Data Status (read-only) | — | Raw bytes and "Compressed in asset: N bytes (P% of raw)". |
| Runtime Data > Clear Runtime Data | button | `ClearDynamicData`. |

`FaceInfo` fields: faceIndex, familyName, styleName, weightClass (1..1000, 0 unavailable), isItalic, unitsPerEm, lineHeight, ascentLine, capLine, meanLine (x-height), descentLine (negative), typo/win metrics, `useTypoMetrics`, super/subscript offsets and sizes, underline/strikethrough offset and thickness, tabWidth.

### 4.2 Family and stack members

| Member | Meaning |
|---|---|
| `FontFamily.name` | Id for `<font=...>`; case-sensitive; duplicates in a stack log a warning and the first wins; empty = not addressable. |
| `FontFamily.primary` | Required — a family without it is ignored (inspector warns). Strut metrics when the first family. Keep it **Regular upright**: plain text scores faces against weight 400/upright. |
| `FontFamily.Faces`; ctor `FontFamily(string name, UniTextFont primary, UniTextFont[] faces = null, string preferredLanguage = null)`; `WithFaces(UniTextFont[])` | Bold/italic/bold-italic/light/variable faces (face storage is detached/cloned). A face whose `familyName` differs from the primary's only produces an info box. Faces with `weightClass` 0 count as 400 in the editor helper. |
| `FontFamily.preferredLanguage` | BCP 47 hint (`zh-Hans`, `ja`, `en-GB`); effective only for runs that carry a language. |
| `UniTextFontStack.FallbackStack` | Get/set, throws on cycle; searched after this stack's own families. |
| `UniTextFontStack.PrimaryFont`, `HasFaces`, `TryGetFamilyByName(string, out FontFamily)` | First family's primary; any family in the chain has faces or a variable font; case-sensitive first-wins lookup across the fallback chain. |
| `UniTextBase.Font` | Optional explicit primary — becomes the **first, unnamed** family; the stack still supplies fallbacks. |
| `UniTextBase.FontStack`, `PrimaryFont`, `FontProvider`, `RenderMode`, `FontSize`, `Language` | Stack; `Font` else `FontStack.PrimaryFont` (null for asset-less components); resolved provider; `SDF=0` / `MSDF=1`; float (default 36); whole-text language string. |
| `UniTextFontProvider.FindFontForCodepoint(int cp)` / `(int cp, byte language)` | Font id the chain picks (cached); throws if not a Unicode scalar. |
| `UniTextFontProvider.TryGetFontIdByFamilyName(string)`, `GetFont(int id)` | 0 when unknown; `Core` runtime for an id. |
| `UniTextFontProvider.InactiveVariationCapacity` (static, 256), `VariationMemoryStats`, `TrimUnusedVariations()` | Variable-instance bookkeeping and release. |
| `UniText.LanguageMatches(string a, string b)` | Static prefix match at subtag boundary; empty → false. |

### 4.3 `UniTextSettings` (Project Settings > LightSide > UniText)

The asset must live at `Resources/UniTextSettings.asset` (a `Resources` folder anywhere under the project's assets); the settings page creates it. If it is missing, text logs `UniTextSettings not found at Resources/UniTextSettings.asset`.

| Section / label | Static member | Package default | Effect |
|---|---|---|---|
| Fonts > Default System Font | `SystemFont` (`UniTextSystemFont`) | unset | Primary for asset-less components **and** the final-fallback family; resolves real OS bold/italic. Unset → OS default sans-serif fills both. |
| Fonts > Disable System Font Fallback | `SystemFontDisabled` | false | No OS fallback and no OS-default primary; assigned `UniTextSystemFont` assets keep working. Turn on in QA builds to expose glyph gaps. |
| Fonts > Disable Emoji | `EmojiDisabled` | false | No color emoji. |
| Text Defaults > Font Size Match | `FontNormalizeMetric` (`None`/`XHeight`/`CapHeight`), `FontNormalizeTarget` (0 = match primary) | `None` / 0 | CSS font-size-adjust style scaling of fallback fonts; `FontSizeMatchModifier` overrides per component. |
| Text Defaults > Line Height Mode | `DefaultLineHeightMode` (`Content=0`, `Primary=1`, `Scaled=2`), `LineHeightScale` | `Scaled`, 1.4 | `Content` grows lines for taller fallback glyphs; `Scaled` = fixed scale × fontSize (uniform rows). |
| Localization > Language | `Language` | empty | Default language for codepoints without a component/range tag; drives `locl` and `preferredLanguage`. |
| Word Segmentation > Dictionaries | `Dictionaries` | empty list | Enables dictionary breaking; an **empty slot throws** `InvalidOperationException`. |
| Texture Atlases > SDF / MSDF | `SdfAtlasSize`/`MsdfAtlasSize` (`Size1024`/`Size2048`), `SdfAtlasPrecision`/`MsdfAtlasPrecision` (`Bits8`/`Bits16`) | 2048 / 16-bit | Page side and distance precision. Changing discards the cache and refreshes all text. |
| Texture Atlases > Color / Emoji | `ColorAtlasSize` | 2048 | RGBA32 page; grows to fit a larger tile. |
| Styling > Global Style Preset | `GlobalStylePreset` | unset | Appended after local styles; the way to ship tags project-wide. |

### 4.4 Font size normalization

Fallback fonts with different x-height look mismatched. `FontNormalizeMetric.XHeight` (body text) or `CapHeight` (all-caps/symbol fonts) rescales each font to the primary's metric. Default is `None`, so per-font **Normalize Size** (default on) does nothing until you enable Font Size Match in settings or add `FontSizeMatchModifier`. Disable Normalize Size on decorative fonts. Do not use `FontScale`/normalization to paper over a wrong font choice.

## 5. Editor tools — what each is for

| Tool | Where | Use it when |
|---|---|---|
| Create Font Asset | `Assets > Create > ... > Fonts > Font Asset` (Color: " (Color)" suffix); Tools window tab (also accepts files outside the project and asks for an output folder) | Always, once per custom font file. Saved next to the source, name = file name, bytes stored as a hidden sub-asset; metrics, pixel grid and variable axes auto-read. The original `.ttf` is not needed in builds. |
| Font Stack (Combined / Per Font), Font Variant, System Font Asset | same `Fonts` submenu | Building families/fallback chains (Per Font stacks exist for chaining via `FallbackStack`), pinning variable cuts, OS fonts. |
| UniText Tools window | `Tools > LightSide > UniText > Utilities` | Hosts the three tabs below. |
| Font Subsetter | Tools window tab | Shrinking big fonts (CJK, large Noto families) to the alphabet the game really shows. **Not** needed to limit atlas size (atlases are dynamic). Modes Keep/Remove; script rows (Latin Basic/Extended/Vietnamese, Cyrillic, Greek, Armenian, Georgian, Semitic, Indic, SE Asian, Hiragana/Katakana, Symbols: Digits, Punctuation, Currency, Math, Arrows, Box Drawing); "Custom Text"; "Copy All Characters"; `.ttc` face picker; outputs **Create Font File** (.ttf) or **Create UniText Font**. Cyrillic = U+0400-04FF, Basic Latin = U+0020-007E, Latin Extended = U+00A0-024F. Keeps all OpenType features, names, glyph names and `.notdef`; legacy `kern`-only fonts lose kerning (warning); bitmap-only fonts refused. HarfBuzz-based, editor-only. |
| Dictionary Builder | Tools window tab | Only for Thai/Lao/Khmer/Myanmar line breaking or CJK word selection/navigation. Input: UTF-8 word lists (one word + optional tab-separated non-negative cost per line); same-script inputs merge into one `WordSegmentationDictionary`. Must then be added to `UniTextSettings.Dictionaries`. |
| Glyph Diagnostic | `Tools > LightSide > UniText > Glyph Diagnostic` | Per-glyph inspection; with the component Inspection Mode overlay it shows which font/fallback drew a glyph. |
| FontFamily drawer | stack inspector | Family row = primary + name; foldout: Preferred Language, Faces. |
| TMP migration | `Tools > LightSide > UniText > Migration` | Per-TMP-font `Create font + stack`; carries fallback tables into a shared project fallback stack. `<font=...>` values must be rewritten to family names. |

## 6. Runtime C# for fonts

Public API (listed in the API reference or used by shipped sample code):

| API | Notes |
|---|---|
| `static UniTextFont UniTextFont.CreateFontAsset(byte[])`, `static T CreateFontAsset<T>(byte[]) where T : UniTextFont` | Unsaved ScriptableObject (`CreateInstance`, main thread); reads FaceInfo/unitsPerEm/pixel grid from face 0; `null` + `LogError` on empty/invalid bytes. In a player the bytes stay in a managed array (no disk cache). `CreateFontAsset<UniTextColorFont>` makes a color font. |
| `static int UniTextFont.ComputeFontDataHash(byte[])` | Content hash (FNV-1a variant) used as identity. |
| `UniTextFont.ClearRuntimeData()` (static), `font.ClearDynamicData()`, `font.Runtime` | Drop FT faces/glyph caches/atlas entries; the asset stays and rebuilds on next use. |
| `font.GetGlyphIndexForUnicode(uint cp)` (0 = missing), `font.HasGlyphInAtlas(uint glyphIndex, UniTextRenderMode)` | Coverage checks. |
| `font.FaceInfo`, `UnitsPerEm`, `FontScale`, `ItalicStyle`, `SpacingOffset`, `SpaceAdvance`, `FakeBoldWeight`, `PixelsPerEm`, `SnapToPixelGrid`, `IsVariable`, `IsColor`, `HasFontData` | Property setters publish change events and refresh every text using the font. |
| `SystemFont.Disabled`, `Default`, `TryResolve(uint cp, Core stylePrimary = null)`, `TryResolveStyled(uint cp, int weight, bool italic, Core)`, `TryResolveStyledFamily(string family, uint cp, int weight, bool italic, Core)`, `Trim()`, `TrimUnused()`, `Reset()`, `InactiveSourceCapacity` (32), `InactiveByteBudget` (64 MiB), `MemoryStats`, events `Changed`, `DisableChanged` | OS font cache; returned runtimes are cache-owned — never dispose. |
| `UniTextSystemFont.GetConfig(FontPlatform)`, `SetConfig(FontPlatform, PlatformConfig)`, `Invalidate()`; read-only `ResolvedPath`, `ResolvedFontName`, `ResolvedPlatform`, `ResolveFailed` (unset until first draw) | `PlatformConfig{fontName, defaultWeight 1..1000, faceInfo, sdfDetailMultiplier, tileSizeOverride}`. |
| `UniTextSettings.SystemFont`, `SystemFontDisabled`, `EmojiDisabled`, `Language`, `Dictionaries`, `GlobalStylePreset`, atlas size/precision statics, `Instance` | §4.3; `Instance` is null (with an error log) when the asset is not in `Resources`. |
| `LanguageRegistry.Register(string) → byte`, `GetTag(byte)`, `Unset = 0` | Max 255 tags. |
| `UniTextBase.SetWholeText<FontModifier>("family")`, `ClearWholeText<FontModifier>()`, `text.Styles.Add(Style.Tag(new XModifier(), "tag"))` | Whole-text font selection / tag registration. |
| `GlyphAtlas.GetInstance(UniTextRenderMode)` | Disposable cache; settings in §4.3. |

Seen only in editor code (not confirmed usable from game code): `UniTextFontStack.Families` (generated state list; the editor calls `stack.Families.ReplaceAll(...)`), `UniTextFontEditorUtility.Subset(byte[] fontData, IEnumerable<int> codepoints, int faceIndex = 0)` / `Subset(byte[], string characters, int faceIndex = 0)` / `ReplaceFontData(UniTextFont, byte[], int faceIndex = 0)` (editor assembly only; `ReplaceFontData` is one Undo step, keeps GUID/settings, throws for variants and system fonts).

Removed in 3.x/2.x (do not use): `UniTextFont.CreateRuntime()`, `BuildRuntime(byte[])`, `UniTextFontStack.FindFontForCodepoint` (use the provider's), the project-wide default font stack setting.

## 7. Shipped default fonts and glyph coverage

Defaults live in `<UniTextRoot>/Defaults/`. Coverage was computed by parsing each file's `cmap`.

| Asset | Content | Raw bytes | Coverage |
|---|---|---|---|
| `NotoSans-Regular` (`.asset` + `.ttf`) | `UniTextFont`, family "Noto Sans", Regular, weight 400, unitsPerEm 1000, **static** (no axes), SDF Detail 1, Tile Size Offset 0, italicStyle 30, fakeBold 0 | 629,024 | 3,094 codepoints. Basic Latin 95/95, Latin-1 96/96, **Cyrillic U+0400-04FF 256/256** (Ё ё, І і Ї ї Є є Ґ ґ Ў ў), Cyrillic Supplement 48/48, Cyrillic Ext-A 32/32, Ext-B 96/96, Greek 121/144. Punctuation U+2010-2027 24/24, `₽` U+20BD, `№` U+2116, `« » „ " " ' '`, `… — – •`, `× ÷ ± ° ½ ¼ ¾ ‰ −`. Hebrew/Arabic: none. |
| `NotoSansArabic-Regular` | Arabic | 194,176 | Arabic block 256/256, Basic Latin 95/95, Latin-1 84/96, **Cyrillic 0** |
| `NotoSansHebrew-Regular` | Hebrew | 48,036 | Hebrew 88/112, Basic Latin 95/95, **Cyrillic 0** |
| `UniTextFonts_Default` | A `UniTextFontStack` (serialized class id is still `UniTextFonts`): 3 families `[NotoSans, NotoSansArabic, NotoSansHebrew]`, no names, no faces, no `preferredLanguage`, no fallback stack | — | Used by the Selectable Text prefab and some samples; **not** by `Text (UniText)`, World Text or Button prefabs |
| `SystemFont` | `UniTextSystemFont` with baked Segoe UI metrics, all platform tabs unset | — | Not assigned in the shipped settings (`systemFont` empty) |
| `Dictionaries/` | CJK 17.7 MB, Khmer 11.4 MB, Myanmar 6.8 MB, Lao 3.9 MB, Thai 1.9 MB (asset file sizes) | — | Shipped but **not enabled** (`dictionaries` list empty) |

**Missing from Noto Sans Regular (verified, zero coverage):**

- Arrows: U+2190-2193 and the whole block U+2190-21FF (0/112) — `← ↑ → ↓ ↔ ⇒` all absent.
- Check marks and crosses: `✓` U+2713, `✔` U+2714, `✗` U+2717.
- Stars: `★` U+2605, `☆` U+2606; `✦`.
- Card suits `♠ ♣ ♥ ♦`; `⚡`.
- Geometric shapes: `◆ ● ○ ■ □ ▲ ▼ ► ◄`.
- Math: `∞ ≈ ≠ ≤ ≥`. (`× ÷ ± − °` **are** present.)

**What happens for a missing symbol:** the chain continues to the next family; if no family has it, the **OS system-font fallback** (on by default everywhere except WebGL) supplies a glyph — the look and metrics differ per device/OEM, and `Content` line-height mode may grow the line. If the OS fallback is off or absent (WebGL), the primary font's `.notdef` (a box) is drawn. Arabic/Hebrew defaults do not help for Cyrillic or these symbols. For a Russian + English game the shipped Noto Sans covers every letter, `₽ № « » „ " — … ×`; add a font with the symbol glyphs you use (arrows, ✓, ★, ≈ ≤ ≥) as a later family in the stack.

With the shipped single-face Noto Sans, `<b>` is synthetic dilate and `<i>` a 30% shear; the OS font is not asked for bold/italic because a chain family already covers those glyphs.

## 8. Dictionaries (word segmentation)

Thai/Lao/Khmer/Myanmar write words without spaces: line breaking needs a `WordSegmentationDictionary` in `UniTextSettings.Dictionaries`. Chinese/Japanese already break between characters; a dictionary only improves word selection, navigation and word-by-word animation. Dictionaries are 2-18 MB each on disk: **AVOID** adding any for a Latin/Cyrillic game. An empty slot in the list throws. Build your own with the Dictionary Builder.

## 9. Numbers, memory, build size

Default page = 2048×2048 = 4,194,304 texels. Derived from the atlas formats (SDF R8 / RHalf, MSDF RGBA32 / RGBAHalf, color RGBA32):

| Atlas | Bytes per page | Mobile |
|---|---|---|
| SDF 16-bit (default) | 8 MiB | OK — default; pages added on demand, evicted/compacted when idle |
| SDF 8-bit | 4 MiB | OK — halves memory; quantization can affect enlarged contours and effects |
| MSDF 16-bit (default MSDF) | 32 MiB | AVOID unless sharp outline corners are required |
| MSDF 8-bit | 16 MiB | LIMIT — still 2× SDF 16-bit |
| Color/emoji (RGBA32, with mips) | 16 MiB (+ mips) | LIMIT — only pays off when emoji/color fonts are used; `ColorPixelSize` default 128 |
| 1024×1024 pages | one quarter of the above | OK — smaller allocation granularity, same glyph resolution |

SDF/MSDF atlases have no mips. Tile capacity per 2048 page if only one class were used (derived): 1024 tiles of 64 px, 256 of 128 px, 64 of 256 px. Pages grow and shrink with use.

Font bytes: shipped fonts are Zstd-compressed (see **Font Data Status**) and packaged as `StreamingAssets/UniText/Fonts/<hash>.ufontz` plus `catalog.bin`; at first use the player decompresses into `Application.temporaryCachePath/UniText/Fonts/v1` and memory-maps the file; unused fonts stay compressed. WebGL and the Editor keep the bytes inside the asset. Only fonts referenced by the build's packed content ship; an incremental build that cannot report packed content packages every project font and says so in the console (a clean build restores the minimal set). Large families still add to APK/IPA size — a CJK sample font is 4.46 MB raw, shipped dictionaries 2-18 MB: subset big fonts (C12) and skip dictionaries you do not need. Mobile verdict for a 1-2 font Latin/Cyrillic setup: **OK**.

Other limits: 255 distinct `<var>` configurations per text; 255 language tags per process; `InactiveVariationCapacity` 256; `SystemFont.InactiveSourceCapacity` 32 and `InactiveByteBudget` 64 MiB.

Glyphs rasterize on first draw (Burst, CPU); the changelog states cold-glyph rasterization costs the main thread almost nothing. There is no pre-rasterization/pre-warm API for glyphs. For shaders, `LightSideMaterials.WarmUpUi(...)` (3.20.0) behind a loading screen compiles Canvas shader variants.

Low-memory hook (atlases are disposable caches and refill on demand):

```csharp
// not compiled
Application.lowMemory += () => {
    UniTextFont.ClearRuntimeData();
    SystemFont.TrimUnused();
    UniTextFontProvider.TrimUnusedVariations();
};
```

### WebGL limits

- No OS fonts (`SystemFont.Default` null): asset-less text fails with an exception; `UniTextSystemFont` is unsupported — assign regular `UniTextFont` assets everywhere.
- No OS emoji font access: emoji come from the browser unless a `UniTextColorFont` is assigned. Color fonts work since 3.20.0 but builds grow (they carry the color rasterizer); default `ColorPixelSize` is 64.
- Rasterization is single-threaded (`RendersInParallel` false).
- Font bytes live inside each font asset (no memory map, no streaming), so every font adds to the download.

## 10. Recipes

Snippets assume `using LightSide;`. Tag-based markup assumes the styles from C7 exist on the component or in a global preset.

### C1. Create a font asset from a TTF/OTF
Select the file in the Project window → `Assets > Create > LightSide > UniText > Fonts > Font Asset` (or `Tools > LightSide > UniText > Utilities > Create Font Asset`, which also takes files outside the project). Result: `<name>.asset` beside the source. Tune only if needed: Font Scale (face too small), Space Width, Spacing Offset, Italic Style / Fake Bold Weight (no real cut), SDF Detail / Tile Size Offset (hairline faces). Gotcha: a `.ttc` produces face 0 only — make a `UniTextFontVariant` with another `FaceIndex` for other faces.

### C2. One font on one text
Drag the `UniTextFont` into **Font** (leave Font Stack empty → fallback is only the OS font).
```csharp
// not compiled
[SerializeField] UniTextFont bodyFont;                       // assigned in the inspector
void Awake() { GetComponent<UniText>().Font = bodyFont; }
```
Gotcha: assigning only `Font` makes an **unnamed** family; `<font=...>` cannot address it.

### C3. Real Regular/Bold/Italic/Bold-Italic family
1. Create assets for each static file of the family.
2. Select all → `Fonts > Font Stack (Combined)`, or build by hand: Font Families `+`, **Primary** = Regular, **Faces** = the rest.
3. Type a family **name** if you want `<font=...>` access, assign the stack to **Font Stack**, register `b`/`i` (C7).
4. `<b>` picks the Bold face by CSS weight distance, `<i>` the Italic face, `<b><i>` Bold-Italic. QA check: `<b=700,r>` and `<i=r>` render real-only and stay regular if the face is missing.

### C4. Stylized Latin display font + Cyrillic + icon font
Display fonts for games often lack Cyrillic. Stack families in order: `[DisplayFont (name "title"), NotoSans, IconFont]`. Each codepoint takes the **first family that covers it** — Latin uses the display font, Cyrillic falls to Noto Sans. To share a tail across stacks make Stack B = `[NotoSans, IconFont]` and set `stackA.FallbackStack = stackB`. If glyph heights differ, enable Font Size Match (`XHeight`) and turn Normalize Size off on decorative fonts. For Private-Use icon glyphs use Glyph Overrides (`advanceScale`, `offset`, `scale`). Gotcha: while the OS fallback is on, an uncovered glyph silently comes from the device font; enable **Disable System Font Fallback** in QA builds to see the gaps.

### C5. Russian + English card text with arrows (↑ ↓) and symbols
Noto Sans covers the letters, `₽ № « »`, but not `↑ ↓ → ✓ ★ ≈ ≤ ≥`. Stack: first family = a font that covers Cyrillic (Noto Sans is enough); then a font that contains your symbols. Text such as `Урон ↑ 20%, скорость ↓` then resolves letters in Noto Sans and arrows in the symbol font. Without a symbol font the arrows come from the device font (look differs; box on WebGL). Verify with `bodyFont.GetGlyphIndexForUnicode(0x2191) != 0` and a QA build with the OS fallback disabled. Project-wide `UniTextSettings.Language` can stay empty (or `ru`): it only matters for `locl` and `preferredLanguage`. Register tags (C7) or `<b>` stays literal.

### C6. Select a font family from markup and code
Stack families named `title`, `body`, `mono`:
```
<font=title>BOSS FIGHT</font> normal text <font=mono>0x2A</font>
```
```csharp
text.SetWholeText<FontModifier>("title");   // whole text → family "title"
text.ClearWholeText<FontModifier>();        // back to chain order
```
Rules: name is case-sensitive; the family must be in the component's FontStack or its fallback chain; the `Font` slot is unnamed; per-range tags win over whole-text; uncovered codepoints still fall through the normal chain; unknown name → warning once. `SetWholeText` needs no tag style; the `<font=...>` markup does.

### C7. Make tags exist (b, i, font, var, lang, feature)
Per component:
```csharp
text.Styles.Add(Style.Tag(new BoldModifier(),        "b"));
text.Styles.Add(Style.Tag(new ItalicModifier(),      "i"));
text.Styles.Add(Style.Tag(new FontModifier(),        "font"));
text.Styles.Add(Style.Tag(new VariationModifier(),   "var"));
text.Styles.Add(Style.Tag(new LanguageModifier(),    "lang"));
text.Styles.Add(Style.Tag(new FontFeatureModifier(), "feature"));
text.Text = "<b>Bold</b> <i>italic</i> <font=title>Title</font>";
```
Project-wide (preferred): `Create > LightSide > UniText > Style Preset`, add the same styles, assign it to `Project Settings > LightSide > UniText > Styling > Global Style Preset`. Components apply it while **Use Global Style Preset** is on (default on in shipped prefabs); a component's own style wins collisions. Details: [unitext-markup-system.md](unitext-markup-system.md).

### C8. Variable font
1. Create the asset from the variable `.ttf`; **Variable Font Axes** lists each axis with min/default/max. Pin defaults (e.g. `wght` 400, or `GRAD`/`opsz`).
2. Markup: `<var=700>`, `<var=150%>`, `<var=+200>`, `<var=700,80>`, `<var=~,~,~,-12>`. `<b>` on a variable family sets `wght` through the axis (real bold); `<i>` uses `ital`/`slnt` when present.
3. A named cut without tags: `Fonts > Font Variant` on the variable font, set the variant's axis defaults (`wght` 900), put the variant in a family's **Faces**.
Gotchas: static and variable faces of one family in `faces` both take part in scoring; every distinct axis tuple registers separate instances/glyph tiles (`UniTextFontProvider.VariationMemoryStats`, `TrimUnusedVariations()`).

### C9. Per-language fonts (single stack, many locales)
Stack: `[Latin (no hint), NotoSansSC (preferredLanguage "zh-Hans"), NotoSansJP ("ja"), NotoSansKR ("ko")]`.
```csharp
text.Language = "ja";                  // component default (whole-text LanguageModifier)
UniTextSettings.Language = "ja";       // project default for runs without a tag
// per range, needs the lang tag style:  <lang=zh-Hans>骨</lang> <lang=ja>骨</lang>
```
The language-matched family is tried first (`zh` also matches `zh-Hans`), then chain order. Language also feeds HarfBuzz `locl`: pan-CJK fonts show regional forms of one codepoint; region-specific cuts hold one glyph set and look identical across tags. A Russian/English-only game needs no `preferredLanguage`.

### C10. Localization with one component
A resolver turns a stored key into the translation; refresh on language switch:
```csharp
class KeyResolver : IUniTextResolver {
    public bool TryResolve(System.ReadOnlyMemory<char> source, out System.ReadOnlyMemory<char> result) {
        result = Loc.Get(source.ToString()).AsMemory();   // your table lookup
        return true;
    }
}
text.TextResolver = new KeyResolver();
text.Language = currentLocale;                    // BCP 47
text.SetDirty(UniTextDirty.Text);                 // resolver output changed, source did not
```
Pair it with a per-language font stack (C9). `IUniTextResolver` also has default-implemented `OnAttached(UniTextBase)` / `OnDetached(UniTextBase)`. See [unitext-runtime-api.md](unitext-runtime-api.md).

### C11. Create fonts at runtime (downloaded or bundled bytes)
```csharp
IEnumerator LoadFont(UniText text, string url) {
    using var req = UnityWebRequest.Get(url);
    yield return req.SendWebRequest();
    var font = UniTextFont.CreateFontAsset(req.downloadHandler.data);   // face 0, unsaved
    if (font != null) text.Font = font;      // becomes primary; stack still gives fallbacks
}
```
Keep a reference and `Destroy` the asset when done. For a stack from code, mirror what the editor does (`CreateInstance<UniTextFontStack>()` then `Families.ReplaceAll(...)`) — only after confirming `Families` is accessible to your assembly; assigning a pre-made stack asset is the safe route. **AssetBundles/Addressables:** fonts packed in content ship their payload as container entry `unitext/fonts/payload/<token>` (needs the built-in AssetBundle module); load the bundle before the text draws the font (a font arriving in the same frame is prefetched before layout since 3.20.0); a content directory delivered from outside the player's StreamingAssets gives embedded fonts no data.

### C12. Shrink a font to the game's alphabet
Tools window > Font Subsetter, mode **Keep**: tick Latin Basic (+ Extended if needed), **Cyrillic**, Digits, Punctuation, Currency, add **Custom Text** with the exact extra symbols (`↑↓₽№«»`), choose **Create UniText Font**. From an editor script:
```csharp
var source = File.ReadAllBytes(ttfPath);                         // path of the source font file
var keep = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
         + "АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдеёжзийклмнопрстуфхцчшщъыьэюя"
         + "0123456789.,:;!?-—«»₽№↑↓";                            // every character the game can show
var subset = UniTextFontEditorUtility.Subset(source, keep);
UniTextFontEditorUtility.ReplaceFontData(existingFont, subset);  // keeps GUID, settings, references
```
Result: smaller single-face font, features/names/`.notdef` kept, glyph ids renumbered, overrides follow characters. Gotchas: legacy `kern`-only fonts lose kerning; the subset must include every character dynamic text can show (player names, localized strings) or those fall to the OS font; run on fonts, not variants/system fonts; subsets made by versions before 3.20.0 lack OpenType features/names/`.notdef` — re-create them.

### C13. Pixel-art font
A font whose outlines sit on a grid gets **Pixel Grid** (e.g. 8) automatically and is excluded from size normalization; set it by hand or press **Detect Pixel Grid** when detection misses. Render at font sizes that are integer multiples of the grid (the inspector warns otherwise). Keep **Snap To Pixel Grid** on so shadow/extrude/wave/shake/reveal offsets step in whole font pixels; turn it off for smooth motion. A Canvas with **Pixel Perfect** also aligns the origin to the device pixel. SDF Detail / Tile Size Offset are ignored. Effects work in font pixels (1 px stroke = a one-pixel ring).

### C14. Color fonts and emoji in a stack
`Fonts > Color Font Asset` from a CBDT/sbix/COLRv0/v1 font, add it to the stack. For emoji-presentation codepoints an assigned color font beats the system emoji font; for other codepoints it serves what it covers through the normal chain. The first color font loaded fixes the shared color-atlas tile size; bigger glyphs are downscaled. `Disable Emoji` removes color emoji globally. See [unitext-emoji.md](unitext-emoji.md).

### C15. Platform UI font as primary
`Fonts > System Font Asset`; set per-platform font names (or Common "System Sans-Serif"); put it in a stack or assign it as **Default System Font**. Leave Font/FontStack empty on a text to use the OS default sans-serif. Matching is by **family name**; `Default Weight` (1..1000) picks the cut when the text requests none, while `<b>` / `<var wght>` request their own weight. Not on WebGL.

### C16. Sharp-cornered outlines on display text
`text.RenderMode = UniTextRenderMode.MSDF;` (or the **Render Mode** field). SDF rounds outline/underlay corners; MSDF keeps them sharp, uses a separate RGBAHalf atlas (32 MiB/page) — set it per component on the few titles that need it, never globally on mobile.

### C17. Tabular numerals for HUD counters
Markup `<feature=tnum>12 480</feature>` (with the `feature` tag registered). Works only if the font carries `tnum`; unknown features are ignored; subsetting keeps features. Whole-text form: `Style.WholeText(new FontFeatureModifier(), "tnum")`.

### C18. Which font draws this character / why a box
```csharp
var fp   = text.FontProvider;                 // null until the component has processed text once
int id   = fp.FindFontForCodepoint(0x2191);   // '↑'
var core = fp.GetFont(id);                    // UniTextFont.Core (core.Name, core.FaceInfo.familyName)
bool inAsset = bodyFont.GetGlyphIndexForUnicode(0x2191) != 0;
```
Box = `.notdef` of the primary: nothing in the chain (and no OS fallback) covers it. Glyph Diagnostic and the Inspection Mode overlay help in the editor.

## 11. Pitfalls

**Silent failures**
1. **Tags are not built in** — `<b>`, `<i>`, `<font>`, `<var>`, `<lang>`, `<feature>` print literally until a style defines them.
2. **`<font=name>` matches only `FontFamily.name` in the component's FontStack chain** — not the OS font name, not the asset file name, not the `Font` slot. Editor-created stacks have **empty names**; type them. Case-sensitive; unknown name = one warning, default rendering; duplicates warn, first wins.
3. **No font assigned is not an error on mobile**: text uses the OS default sans-serif, so art direction differs per device/OEM. On WebGL it throws and does not render.
4. **Uncovered glyphs come from the OS font silently** (different look, taller lines in `Content` mode). Default Noto Sans lacks arrows, checks, stars, suits, shapes, `≈ ≤ ≥ ∞`.
5. **`<b=700,r>` / `<i=r>` do nothing when the family has no real cut**; `<b>` on a single-face family is synthetic.
6. **Ill-formed language tags are ignored** (warning for `<lang>` only); `preferredLanguage` only matters for runs that carry a language; max 255 tags.
7. **The family `primary` is not always what plain text uses**: faces are scored against weight 400/upright, so keep Regular upright as `primary`. A family with an empty `primary` is ignored; if it is first, line metrics come from the next family.
8. **Fallback does not dedupe across stacks**: the component `Font` family is always first and the stack's first family may repeat after it (harmless).
9. **TMP assets are unusable.** Recreate a `UniTextFont` from the source TTF. TMP `<font=...>` values name font assets while UniText names `FontFamily` entries; TMP `fontWeight` needs a variable font (static: weight lost).
10. **Font Size Match is off by default**, so Normalize Size does nothing until you turn the metric on.

**Ordering / lifecycle**
11. Changing `UniTextSettings` atlas size/precision discards the cache and refreshes all text — do it on the main thread outside text processing, not in gameplay.
12. `CreateFontAsset(byte[])` needs the main thread, reads face 0 only and is not persisted — keep a reference.
13. A fallback cycle throws on enable/assignment; an empty `Dictionaries` slot throws when word segmentation initializes.
14. `SystemFont` runtimes are cache-owned (never dispose); `UniTextSystemFont.ResolvedFontName`/`ResolveFailed` are unset until first draw.
15. Editor domain reload clears runtime font data; a live-editor session can show a brief re-rasterization.

**Performance / mobile**
16. MSDF pages are 4× the SDF 16-bit memory; use SDF unless sharp corners are required.
17. Every `UniTextFontVariant` and every distinct `<var>` tuple has its own atlas tiles and shaper cache; never animate `<var>` per frame.
18. Large and complex-script fonts are multi-MB; subset them. First use of a rare script can cost a platform font lookup (cached after).

## 12. Version notes (fonts)

- 3.20.0 (breaking): `UniTextColorFont`, `UniTextFontVariant`, `UniTextSystemFont` are sealed; `CreateRuntime()` / `BuildRuntime(byte[])` removed; `Subset`/`ReplaceFontData` added; color fonts work on WebGL; the "Units Per Em" field edits the value text is sized by.
- 3.3.0: font bytes live in a hidden sub-asset/payload (assets convert on first editor load); players use the memory-mapped cache; fonts ship only for packed content.
- 3.0.0: shared code moved to `media.lightside.core`; create menu is `Assets > Create > LightSide > UniText > ...` and tools live under `Tools/LightSide/` (older material says `Assets > Create > UniText`).
- 2.5.0: default font stack setting removed (no font → OS font); `UniTextSystemFont`, `UniTextFontVariant`, per-axis defaults and real OS bold/italic added.
- 2.2.x: `Font`, `FontModifier`, `FontFamily.name`, `preferredLanguage`, `TryGetFamilyByName`, `TryGetFontIdByFamilyName`; older `fonts`/`variants` lists replaced by `FontFamily[] families`.
- Doc-vs-code: the API reference page for `UniTextFontStack` omits the generated `Families` accessor, and the README links font documents that are not shipped in the package; the Getting Started guide is the only in-package font document.

## Unverified

- `UniTextFontStack.Families` as game-code API — the field carries `[StateList]` without `IsPublic = false` so the generated accessor should be public, but only editor-assembly use was seen and the API page omits it; runtime stack building from code is unconfirmed.
- Which symbols (U+2191/2193 arrows, check marks, stars) Roboto / Noto / San Francisco cover on target devices — no source lists OS font coverage; test on device or ship a font with the glyphs.
- Whether `⚡ ⭐ ✅` (default emoji presentation in Unicode) take the emoji path in UniText instead of the font chain — Noto Sans lacks them either way.
- Size saving of subsetting Noto Sans to Russian + English and typical atlas page counts per scene — no source gives numbers.
- Cost of the first-use rasterization burst and of a re-fill after `ClearRuntimeData()` on a low-end Android phone — nothing was benchmarked; the changelog claims near-zero main-thread cost.
- Whether a component-level `Language` and a `<lang>` tag style coexist on one component (a sample removes the tag style when setting `Language`, yet its comment says per-range tags win).
- `Style.WholeText(new FontFeatureModifier(), "tnum")` parameter syntax — `<feature=tnum>` is documented; whole-text equivalence is inferred.
- Whether Font Size Match gives visually equal Cyrillic/Latin x-heights between Noto Sans and an arbitrary Latin display font.
- Behavior of a `UniTextFontVariant` with `FaceIndex` > 0 inside stacks (inspector supports it; runtime path not read).
- Whether fonts created by `CreateFontAsset(byte[])` in a player skip the memory map and disk cache (inferred from the managed-array source).
- `<upper>` on Russian text — Cyrillic has 1:1 simple case pairs so it should work with simple Unicode mappings; not observed.
