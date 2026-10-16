# UniText — Performance, memory and mobile chapter

> **Base path:** `<UniTextRoot>` is the folder of the UniText package — the one whose `package.json` has `"name": "media.lightside.unitext"` (find it with `Glob **/media.lightside.unitext/package.json`; it may sit under `Packages/` or `Library/PackageCache/`). Never hard-code its location. `<LightSideCoreRoot>` is the folder of `media.lightside.core` (same lookup by `package.json` name); it holds the shared materials, atlas and settings code.
> See also: [unitext-fonts.md](unitext-fonts.md), [unitext-effects-paint.md](unitext-effects-paint.md), [unitext-materials-shaders.md](unitext-materials-shaders.md), [unitext-animation-phase.md](unitext-animation-phase.md), [unitext-animation-reveal-sequencer.md](unitext-animation-reveal-sequencer.md), [unitext-emoji.md](unitext-emoji.md), [unitext-inline-media.md](unitext-inline-media.md), [unitext-interaction-links.md](unitext-interaction-links.md), [unitext-layout-documents.md](unitext-layout-documents.md), [unitext-3d-text.md](unitext-3d-text.md), [unitext-runtime-api.md](unitext-runtime-api.md), [unitext-version-traps.md](unitext-version-traps.md)

---

Everything is in namespace `LightSide`. **Evidence labels used in this file:** `vendor` = a figure or claim from the package CHANGELOG or the vendor FAQ, measured by the vendor on the device named; `code` = read from the package source, API pages or documentation; `guideline` = a working guideline derived from the other two. **Nothing in this file was profiled.** Treat `guideline` verdicts as defaults to verify with the Frame Debugger and the profiler on a target device, not as measurements.

Tag spellings used here (`<var>`, `<b=N>`, `<ellipsis>`, …) name modifiers by convention: no tag works until a style registers it (picker preset, `StylePreset`, or `Style.Tag(...)` in code). See the master rule section "Tag vocabulary bootstrap" ([unitext.md](../unitext.md)) and [unitext-markup-system.md](unitext-markup-system.md).

## 1. Quick verdicts (read this first)

**OK — use freely:**

| Pattern | Why | Basis |
|---|---|---|
| Plain text, `<color>`, `<alpha>`, bold/italic, solid fill | lightest shader tier (`Text`), batches with other `Text`-tier texts; no extra geometry | code, vendor |
| `SetText` with a `string`, `ReadOnlySpan<char>` or `StringBuilder` whose characters did not change | no parse, no layout, no mesh; zero garbage on change | vendor |
| Fade with the alpha of `color` | no layout, no mesh pass | vendor |
| `Hide()` / `Show()` for pooled labels, tooltips, damage numbers | layout, mesh and atlas references stay; `Show()` is instant | code |
| Alignment changes (`Positions` stage), mesh-only changes (RGB colour) | cheapest dirty stages | code |
| Windowed documents (logs, terms, chat history) | meshing is bounded by the viewport | vendor, code |
| Inline sprites packed into one atlas | glyphs in the text mesh; one draw per distinct texture | code |
| Text under `RectMask2D` in a scrolling list | "several times cheaper" since 3.10.1 | vendor |
| Selectable / link text in small numbers | idle cost is zero; the router attaches only while a range is interactive | code |

**LIMIT — budget the number of instances:**

| Pattern | Why | Basis |
|---|---|---|
| 1–3 outward paint layers (stroke, shadow, glow) on titles and HUD | +1 quad per glyph per layer, overdraw, moves the whole component to the `StyledText` tier | code, guideline |
| Gradient / softened fill / colour filters, inner shadow | `StyledText` tier; inner shadow takes two SDF taps | code |
| `AutoSize` | one probe sequence per rebuild; grows with text length and the Min–Max span | code, guideline |
| `<ellipsis>` on rects that resize often | re-layout on every rect-height change | code |
| Running phase animations (Wave, Bounce, Shake…) | one **whole-component** mesh rebuild per frame | code |
| Typewriter reveal | a mesh rebuild per frame while any glyph animates (mesh-only with `Collapse=false`); fine for dialogue lines and titles, not for multi-thousand-glyph pages | code |
| `MarqueeModifier` | continuous animation (re-places the built mesh; the cheapest continuous effect) | code |
| Colour emoji | separate RGBA32 colour atlas; each distinct emoji is a 136×136 px tile; first sight rasterizes | code |
| Variable-font weights (`<b=N>`, `<var>`) | each distinct axis set is another registered instance with its own atlas glyphs (max 255 per text) | code |
| Texture paints, `MaterialModifier`, non-Normal `LayerBlend` | split the batch (own sub-mesh or draw entry) | code, vendor |
| Large global style preset on many labels | every rule is walked at every `<`; each component deep-copies the preset styles on first parse | code, guideline |
| `MeasureText` with a different `text` | re-parse + re-shape; cache the result | code |
| Thousands of interactive ranges in one text | focus-target de-duplication is O(n·m) | code |
| `UniText3D` for titles | CPU-built geometry; see [unitext-3d-text.md](unitext-3d-text.md) | code, guideline |

**AVOID on mobile:**

| Pattern | Why | Basis |
|---|---|---|
| `ExtrudeModifier` on lists or animated text | `Steps` (default 10, bevel doubles it) extra quads per glyph | code |
| `DeformModifier` | forces the heaviest `Full` shader tier and quad growth | code, vendor |
| `UnionModifier` except where letter joins visibly matter | `UnitedText` tier, splits from other tiers | code |
| MSDF render mode unless sharp mitred corners are needed | 4× the bytes per texel of SDF | code |
| `GlyphResolutionModifier` on paragraphs | raises tile classes (about 4× tile memory per class) | code |
| Per-frame writes of `FontSize`, spacing, line height, `Padding`, wrap on many labels | layout-level re-break every frame | code |
| `RevealModifier.Collapse = true` swept every frame on long text | re-parse (and re-wrap for the Line unit) on every frontier move | code |
| Pooling with `SetActive(false)` / disabling the component | releases atlas references, processor and mesh generator; re-enable rebuilds from scratch | code |
| New characters assigned every frame (`Text =` with fresh glyphs) | rebuild plus raster/upload of unseen glyphs | code |
| Math / LaTeX / Table in HUD text | heavy layout engine | code |
| Wavy, dotted or dashed long underlines; per-glyph highlight mapping on large text | many figures per cluster | guideline |
| Hundreds of `<obj>` clones | each clone is a real GameObject | code |
| Adding word-segmentation dictionaries "just in case" | 2–18 MB each in the build | code |
| `Attach3DModifier`, mesh colliders on moving 3D glyphs | cost per copy / cooking per move | code |

## 2. The atlas model

- **One shared atlas per render mode, created at runtime** (nothing is pre-baked in the editor): SDF (`RHalf`, single channel), MSDF (`RGBAHalf`) and a colour/emoji atlas (`RGBA32`, mipmapped). Each is a `Texture2DArray` of pages, 2048×2048 by default, shelf-packed. Render mode is a **component** property (`RenderMode`), not a font property. `code`
- **Adaptive tile size 64 / 128 / 256 px**, chosen per glyph by contour complexity (not by text size), shifted by `SDF Detail` and `Tile Size Offset` (±2 steps) or per-glyph overrides. `GlyphResolutionModifier` raises tiles by up to two classes. Effects grow the tile rim in tiers (the SDF stores signed distance clamped to ±0.5 em), so heavy outlines and glows enlarge atlas use and can trigger a re-raster. `code`
- **Lifetime:** glyphs are reference-counted with LRU eviction; pages are recycled and shrunk after a frame with no allocations; past 16 slices a page group grows by 25 % instead of doubling. A character that no text shows any more no longer allocates atlas entries (3.20.0). `code`, `vendor`
- **Variable fonts and variants:** every `UniTextFontVariant` and every distinct variable-axis tuple has its own atlas entries and shaper cache. `code`
- **Decorated colour glyphs:** the first effect on an emoji or sprite derives a silhouette distance field into the SDF atlas (one extra entry per decorated glyph); for a sprite the first request does a synchronous GPU blit and `ReadPixels`. `code`

### Page memory (arithmetic from the formats; `guideline`)

| Atlas | Format | One 2048² page | One 1024² page |
|---|---|---|---|
| SDF 16-bit (default) | `RHalf` | 8 MiB | 2 MiB |
| SDF 8-bit | `R8` | 4 MiB | 1 MiB |
| MSDF 16-bit (default) | `RGBAHalf` | 32 MiB | 8 MiB |
| MSDF 8-bit | `RGBA32` | 16 MiB | 4 MiB |
| Colour / emoji | `RGBA32` + mips | 16 MiB (+ mips ≈ 21 MiB) | 4 MiB (+ mips) |

Tile capacity of a 2048 page if one class were used alone: 1024 tiles of 64 px, 256 of 128 px, 64 of 256 px. One 128 px SDF tile is 32 KiB at 16-bit. A colour tile is the colour pixel size plus 4 px gutters on each side: 136×136 px at the default 128, so about 15×15 = 225 tiles on a 2048 page and 7×7 = 49 on a 1024 page. SDF and MSDF atlases have no mips.

Settings (Project Settings → LightSide → UniText → Texture Atlases; C# static properties on `UniTextSettings`): `SdfAtlasSize` / `MsdfAtlasSize` / `ColorAtlasSize` (`GlyphAtlasSize.Size1024` or `Size2048`, default 2048) and `SdfAtlasPrecision` / `MsdfAtlasPrecision` (`GlyphAtlasPrecision.Bits8` or `Bits16`, default 16 bit).

- **8-bit precision halves page memory** and "can band in effects far from the glyph edge"; test glow and shadow before shipping it.
- **1024 pages** lower the allocation step without changing glyph resolution. A scene that shows only a few dozen distinct emoji can use `ColorAtlasSize = Size1024` (about 12 MiB saved per page); chat or emoji-picker screens need more pages either way.
- **Changing any atlas setting at runtime discards cached glyphs and refreshes all text:** call it on the main thread, outside text processing, never during gameplay.
- **MSDF only buys sharp mitred corners** (`Corners = Sharp`) and sharp display type; effects of every kind work in both modes. Prefer SDF on mobile.
- **Upload buffers:** with GPU rasterization the atlas keeps no CPU-side copy (about half the memory, 2.10.0), and steady-state glyph-upload buffers dropped from two page-sized buffers per atlas (16 MiB SDF, 64 MiB MSDF) to a small shared pool released when idle (3.3.0). `vendor`

## 3. Rasterization: what the first glyph costs

- **Where compute shaders are supported** glyphs are rasterized by a binned **GPU compute rasterizer**; the main thread only dispatches, and completion is tracked with a graphics fence polled per frame. A submission-cost budget (250 ms mobile / 500 ms desktop; the period it applies to is not stated) bounds the GPU raster work. `code`, `vendor`
- **Without compute** (WebGL) a **parallel CPU rasterizer** (Burst, fanned out per font and across cores) is used automatically with matching results. `vendor`
- **Cached glyphs are reused** until invalidated or evicted. The spike is the first screen that shows many new characters (CJK, pasted chat, a full emoji picker), not steady state.
- `vendor` figures (Galaxy S21 FE 5G, Adreno 660, Vulkan, IL2CPP release): cold-atlas fill of 3,029 multilingual glyphs ≈ **33 ms of main-thread dispatch** for UniText versus 8,635 ms (TextMeshPro) and 6,446 ms (UI Toolkit) of synchronous work; the atlas finishes filling about 2.1 s later without blocking a frame. A decorative 609-glyph fill: 96 ms versus 2,025 ms / 826 ms. Editor, 12-core desktop, CPU path: 220 ms versus 2,138 ms single-threaded (≈ 9.7×).
- There is **no glyph pre-rasterization API**. Pre-warm by showing a hidden text that contains the characters a screen needs (digits, damage-number sets, the emoji you will show) before they matter; see recipe P1.
- The system emoji face is created on the first text refresh; emoji bitmaps are rasterized in batches the first time each is shown (on worker threads where allowed, never on WebGL). The first use of a rare script can trigger a platform font lookup (cached afterwards and shared across texts with the same chain and language).

## 4. Font memory, build size and startup

| Topic | Fact | Basis | Verdict |
|---|---|---|---|
| Font bytes in builds | `UniTextFont` bytes are Zstd (level 22) compressed at import; decompression is lazy (first `FontData` access). Decompress speed ≈ 600 MB/s desktop, ≈ 175 MB/s low-end Android; a 600 KB Latin font takes under 1 ms | vendor | OK |
| Build size effect | "~2.7× smaller builds for Latin/Arabic fonts, ~1.3× for CJK" (the baseline is not stated; the comparison is with uncompressed font bytes in the asset). The source `.ttf` is not needed in builds | vendor | OK |
| Font Memory Mapping (3.3.0) | packaged fonts ship as `.ufontz` entries under `StreamingAssets/UniText/Fonts/` (plus `catalog.bin`), are decompressed once into `Application.temporaryCachePath/UniText/Fonts/v1`, then **memory-mapped**: bytes never stay resident, fonts never displayed are never decompressed, unused fonts stay compressed. OS fonts are memory-mapped in place. WebGL and embedded editor assets keep bytes in the asset | code, vendor | OK |
| What ships | only fonts referenced by the build's packed content; an incremental build that cannot report packed content packages every project font and says so in the console (a clean build restores the minimal set). AssetBundle and Addressables deliver fonts through on-demand entries | code | OK — build clean for size checks |
| Runtime-created fonts | `UniTextFont.CreateFontAsset(byte[])` keeps the bytes in managed memory (no Zstd payload, no memory map, nothing persisted) | code | LIMIT — only for downloaded fonts |
| Subsetting | Font Subsetter (Keep/Remove by chars, ranges or a corpus; keeps OpenType features, names and `.notdef`) and the editor APIs `UniTextFontEditorUtility.Subset` / `ReplaceFontData`. The subset must still contain every character dynamic text can show (user names, localized strings). Subsets made by versions before 3.20.0 lack features and names: re-create them | code, vendor | OK — subset CJK and large Latin families |
| Dictionaries | word-segmentation assets are large (CJK 17.7 MB, Khmer 11.4 MB, Myanmar 6.8 MB, Lao 3.9 MB, Thai 1.9 MB as asset files) and only matter for Thai/Lao/Khmer/Myanmar line breaks; Chinese and Japanese break without one | code | AVOID adding unneeded ones |
| Unicode data | the package keeps its Unicode tables in a resource loaded into persistent `NativeArray`s (off the GC heap) shared by the Burst and fallback paths | vendor, code | OK |
| Native size | the runtime Zstd decompressor library is about 80 KB; glyph atlases are created at runtime and not shipped; Android builds no longer pull `System.Xml` (3.9.0). Per-platform native library sizes are not stated | vendor | OK |
| Low memory | atlases are disposable caches that refill on demand; `Application.lowMemory` disposes the emoji face pools | code | OK |

Choose one or two font files per game; every extra family costs build size and, when active, a memory map plus atlas tiles.

### Startup: shaders and first frames

- **Shader tiers.** Each part of a text draws with the lightest shader variant that renders what it shows (`LightSideSurfaceTier`): `Text` (plain glyph fill and colour glyphs), `StyledText` (stroke, shadow, glow, inner shadow, softened fill, gradients and other paint layers, colour filters, range decorations), `UnitedText` (adds `UnionModifier`), `Full` (adds `DeformModifier`). A heavier tier slows every fragment it draws, and **parts or texts of different tiers do not share a draw call.** `vendor`: "On a low-end phone, plain text takes several times less GPU time than before, and the shader a screen of plain text needs compiles several times faster when the screen first appears" (3.20.0).
- **Per-component tier.** The tier of a text's base segment is `Full` if any glyph is deformed, else `UnitedText` if a union block exists, else `StyledText` if the text allocated extra UV channels (any outward layer, soft fill, gradient…), else `Text`. One outlined word therefore moves the **whole component** to `StyledText`. Keep body text effect-free and put effects on separate labels. `code`
- **First Canvas draw compiles a shader program.** Compile the tiers you use behind a loading screen with `LightSideMaterials.WarmUpUi(params LightSideSurfaceTier[])`; it throws `ArgumentException` for a tier the build's shader profile left out and `InvalidOperationException` when the shader is absent. Stock materials come from `LightSideMaterials.Ui(tier)` / `World(lit, tier)` (shared `HideAndDontSave` instances, one per shader and tier for the whole process — that sharing is what lets Canvas batch). `code`
- **World text** needs `Include World Shaders` (Project Settings → LightSide → Core → Rendering; off in new projects, plus `Include Lit Shaders` for `Lit` text). A build with world text in a scene fails and names the object; world text created at runtime reports the missing shader at first render.
- Warm shaders and glyphs together at boot (recipe P1); first-use shader compilation is a mobile hitch.

## 5. Allocation, GC, threads

| Topic | Fact | Basis |
|---|---|---|
| Changing text | `SetText(string / span / StringBuilder)` with identical characters is a no-op; changing a label every frame makes no garbage (64 score labels changing every frame: about 18 KB per frame before 3.20.0, 0 now; typing in a 2,000-character field ≈ 4 KB per key before, 0 now). The `char[]` and `ReadOnlyMemory<char>` overloads always re-read | vendor |
| Hot-path reads | zero-alloc: `CharCount`, `CopyTextTo(Span<char>)`, `TextEquals`, `RawText`/`RenderedText`/`CleanText` (the `CleanText` span is pooled: copy it to keep it), `FindAll` up to 64 UTF-16 chars. Allocating: `Text`, `VisibleText`, `SelectedText` (a new string per call), `MeasureText`, `Rope.ToString()` | code |
| Toggling many texts | enabling and disabling many texts is allocation-flat (3.12.0); large virtualized text no longer allocates per frame (3.10.1) | vendor |
| Pooled arrays | the array pools keep every returned array and release storage unused for *Idle Retention (Seconds)*, default 10 (Project Settings → LightSide → Core → Array Pools); the old 16 MiB budget is gone | vendor |
| Pipeline | one scheduled pass per frame for all dirty components; Unicode analysis (BiDi, script, grapheme, line break) runs as Burst kernels (Burst ≥ 1.8.29 is a declared dependency) with byte-identical managed fallbacks; analysis and shaping are per paragraph and cached (`ParagraphAnalysisCache`, `ParagraphShapeCache`, cross-text `WordShapeCache`): unchanged paragraphs and words are never re-shaped | vendor, code |
| Parallelism | `UniTextBase.UseParallel` (static, default true) fans components and paragraphs over a `WorkerPool`; effective only where `WorkerPool.IsParallelSupported`; text processing runs on worker threads, the mesh apply is on the main thread; the worker count is not tunable in the sources read | code |
| Vendor timings | Galaxy S21 FE, Vulkan, IL2CPP release: cold rebuild of 100 multilingual objects 69 ms (UniText) versus 167 ms (UI Toolkit) and 455 ms (TextMeshPro, which does not shape Arabic/bidi); an incremental edit 43 ms versus 69 ms cold. Editor, 12-core: 92 ms parallel versus 351 ms single-threaded (≈ 3.8×) | vendor |
| Modifier access | `GetModifier<T>()` walks the styles: cache the result, never call it per frame | code |
| Events | `TextPointerEvent` instances are reused across emissions: do not retain them | code |

Hot-path rule: HUD counters use `SetText(StringBuilder)` (or a span); read state with `CharCount`/`TextEquals` instead of `Text`.

## 6. Batching and draw calls

| Topic | Fact | Basis | Verdict |
|---|---|---|---|
| Canvas text | each text is a `CanvasRenderer` mesh with one sub-mesh per material; texts with the same material and render state batch. Text, highlights, underlines, shapes and Lottie of LightSide share one Canvas material (3.2.0); "text, shapes and Lottie share a draw call when render state and draw order match" | code, vendor | OK |
| World text | a shared `WorldBatcher` keyed by sorting context (sorting layer, order, `SortingGroup`, Unity layer, scene, shadow casting); shards of 16,384 vertices (index type grows to UInt32 past 65,535); text batches with shapes; `Standalone` = own renderer, one draw call each; hidden world text costs nothing per frame | code, vendor | OK |
| Canvas rebuilds | a changing Canvas text hands its mesh to the Canvas, which re-batches it | code | LIMIT — keep fast-changing text on its own nested Canvas (`guideline`, standard uGUI practice) |
| What splits a batch | a different shader tier; a texture paint (own sub-mesh per texture/sequence/blend); `MaterialModifier` / `materialOverride` segments; a non-Normal `LayerBlend` (each blend change is a new draw entry); range decorations (rendered in `Decorations (Behind)` / `Decorations (Above)` children: at least one extra draw per side); Canvas boundaries and masks; `Standalone`; a different sprite texture | code, vendor | LIMIT |
| What does not split | fill + stroke + shadow + glow on one text merge into **one draw** as long as they share a blend and no textured or custom sub-mesh sits between them | code | OK |
| Mixed styles on a screen | plain and outlined labels land in different tiers and draw separately | vendor | LIMIT — group by style; isolate effect labels |
| Sprites and objects | inline sprites are glyphs in the text mesh, one draw per distinct texture (pack icons into one atlas, keep atlas rotation off); each `<obj>` Clone is a pooled GameObject (Existing mode is one object) | code | OK / LIMIT |
| Raycasts | a Canvas `raycastTarget` on every label costs `GraphicRaycaster` work; set it off on decorative text | code | OK |

Verify draw counts in the Frame Debugger; no draw-call figure for any concrete scene was measured.

## 7. Per-frame behaviour: what each kind of change costs

| Driver | Cost | Basis | Verdict |
|---|---|---|---|
| Running phase animation (`Wave`, `Bounce`, `Pulse`, `Shake`, `Wobble`, `Spin`…) | one full mesh rebuild of the whole component per frame (all glyphs, not only the animated range), plus the Canvas re-batch; no re-shape or re-layout. The per-glyph math is negligible | code | LIMIT — short and few texts, never 50 list rows |
| Amplitude set to 0 | still ticks and re-meshes every frame; only a `Manual` clock or removing the range stops it (swap the markup for "off") | code | – |
| `Hide()` on a text whose phase clock runs | the clock keeps ticking while the modifier has a range; whether a hidden text skips the mesh pass is not confirmed | code | – |
| `RevealModifier` `Front` per frame | mesh-only with `Collapse=false`; `Collapse=true` clusters leave the layout and each move re-parses (Line unit re-wraps) | code | OK / AVOID |
| `Scramble`, `Rolling` | zero cost when settled (`Progress=1`, `Roll=0`); `Roll` marks the mesh dirty through `MarkMeshDirty`, a bit heavier per frame than `Phase` | code | OK for one counter |
| `MarqueeModifier` | re-places the built mesh, no rebuild | code | LIMIT |
| Driving `Phase`, `Front`, `Progress`, driver output | mesh-only rebuild (3.3.1) instead of re-applying all styles | vendor | OK |
| Writing layout parameters (`FontSize`, size, spacing, line height, indent, `Padding`, wrap) | re-lays out every frame | code | AVOID per frame on many labels |
| Writing paint-layer parameters at runtime | one text mesh rebuild per change; animating them on many texts is expensive | code, guideline | LIMIT — few texts, or use `UniTextDriver`/shader-time effects |
| Structural style changes (`Styles.Add/Remove`, preset swaps), `Language`, font change | re-parse (`Text` stage) | code | AVOID per frame |
| `color` alpha | nothing rebuilt; fades glyphs, layers, emoji, sprites, decorations and cloned inline objects as one element (a lazily added `CanvasGroup` on the render root, or vertex alpha in the world batch). Alpha 0 is still drawn and clickable: `Hide()` when the fade ends | vendor | OK |
| `color` RGB | mesh rebuild; keep RGB constant while fading | code | OK |
| Text changes that only touch the mesh (new colour, animation) | skip analysis and shaping; Canvas text hands its mesh to the Canvas with less work (3.20.0) | vendor | OK |
| `Hide()` / `Show()` | no re-parse, shape, layout or mesh on `Show()` | code | OK |
| Disable / `SetActive(false)` | `DeInit` releases atlas references, processor, font provider and mesh generator; re-enable rebuilds everything | code | AVOID for pools |

Dirty-stage order (cheapest first): `Mesh` < `Positions` < `Layout` < `Text` < `Font`/`Direction`. Call `SetDirty` with the least expensive stage that captures the change. Several edits in one frame cost one pass per component.

## 8. Per-feature cost list (mobile verdicts)

| Feature | What it adds | Verdict | Basis |
|---|---|---|---|
| Plain text, colour, alpha, solid fill | nothing | OK | code |
| Synthetic bold | shader dilate + advance correction; soft on headings | OK | code |
| Gradient fill, softened fill / dilate | `StyledText` tier; one ramp-row fetch per fragment | OK — keep on few labels | code |
| Stroke / shadow / glow | +1 quad per glyph per layer, enlarged by the effect reach (overdraw); one SDF tap | LIMIT — 1–3 layers on HUD/lists | code, guideline |
| Inner shadow | +1 quad, two SDF taps | LIMIT | code |
| Extra fill layers | +1 quad each | AVOID unless needed | code |
| Extrude | `Steps` (10) quads per glyph, bevel doubles it | AVOID — a handful of titles only | code |
| `FilterModifier` | no extra quads; textures use colour-matrix rows, gradients re-bake a row per filter | OK | code |
| Underline / strikethrough | virtual glyph quads (+ layers) | OK; wavy/dotted/dashed long lines LIMIT | code |
| `HighlightModifier` | extra renderer surface and draw per side; `GeometryMapping.Glyph` = a rounded figure per cluster | LIMIT; Glyph mapping on long text AVOID | code |
| `UnionModifier` | joined letters | AVOID except where joins show | code |
| `DeformModifier` | `Full` tier, quad growth | AVOID | code |
| `GlyphResolutionModifier` | bigger atlas tiles | headings only | code |
| `MaterialModifier` | own sub-mesh / `CanvasRenderer`, splits batches | LIMIT | code |
| Texture paint | per-texture sub-mesh, always layer-major | LIMIT | code |
| `PaintOrder` glyph-major | per-glyph CPU sort | LIMIT | code |
| Non-Normal `LayerBlend` | new draw entry per blend change | AVOID mixing blends in one text | code |
| `<var>` / many `<b=N>` weights on a variable font | one atlas instance per distinct axis set (max 255 per text) | LIMIT | code |
| `UniTextFontVariant` per cut | own atlas tiles and shaper cache | LIMIT | code |
| Math, LaTeX, Table | heavy layout engine | AVOID in HUD | code |
| `ArcModifier` | per-glyph rigid-quad placement rebuilt with the layout | LIMIT — static labels | code |
| `AutoSize` | probe sequence per rebuild; re-runs on text/rect/limits change | LIMIT; AVOID in big pools | code, guideline |
| `<ellipsis>` | re-layout on rect-height change | LIMIT | code |
| `MarqueeModifier` | continuous re-place | LIMIT | code |
| Phase animation | whole-component mesh rebuild per frame | LIMIT | code |
| Colour emoji | RGBA32 colour atlas page (≈ 16 MiB, ≈ 21 MiB with mips); first-sight raster | LIMIT | code |
| Inline sprites | glyphs in the text mesh; one draw per texture; first effect on a new sprite does a blit + `ReadPixels` | OK | code |
| `<obj>` Clone | a GameObject per occurrence | LIMIT / AVOID in hundreds | code |
| Interactive ranges | fragments + rule playbacks per range; hover does not exist on touch; feedback mesh is cheap when kept persistent with a transparent `Tint` | OK in tens, AVOID thousands | code |
| Selection, touch handles, loupe | overlay UI (one shared canvas per prefab); the native loupe copies the frame on the OS side | OK | code |
| Editing | per-key strings from `Text`/`VisibleText`; rich-text import and undo snapshots process the whole content (undo ceiling 1 MiB) | LIMIT for large fields | code |
| Large `Rope` documents | O(log blocks) queries; edits O(edited block), O(blocks) when the block count changes | OK | code |
| Large global style preset | every rule walked at every `<` in every component; deep copy per component | LIMIT — keep the vocabulary lean; set `UseGlobalStylePreset` off for HUD numbers and damage text | code, guideline |
| `UniText3D` | CPU-built solids, five material slots | LIMIT — titles only | see [unitext-3d-text.md](unitext-3d-text.md) |

## 9. WebGL differences

- **No OS fonts:** assign a real `UniTextFont` (or a stack); with none, `UniTextFontProvider` logs an exception and the text does not render.
- **No compute shaders:** glyphs take the CPU raster path; whether `UseParallel` brings parallelism on WebGL depends on `WorkerPool.IsParallelSupported` (not read).
- **Fonts stay in memory** (no memory map).
- **Colour fonts:** an assigned `UniTextColorFont` renders on WebGL since 3.20.0 and replaces the browser's emoji; WebGL builds grow by the colour-glyph rasterizer. The Getting Started guide's section 2.6 ("WebGL rasterizes no embedded color font") is stale; source and CHANGELOG 3.20.0 agree it works. Browser emoji are drawn through Canvas 2D at a 64 px colour size; the single-emoji `WebGLEmoji.TryRenderEmoji*` APIs were removed in 3.20.0.
- **Upload:** glyph upload no longer waits on the browser's GPU process (3.20.0; before, Chrome froze for 50–130 ms several times a second). WebGPU is supported (3.12.0).
- `UniText3D` builds solids in slices over the coming frames; programmatic paste needs the async variants (`PasteAsync`); Unity receives no key events (including Enter) while a field is being edited, so use `Submitted`/`Cancelled`/`Defocused` events instead of polling input.

## 10. Driver quirks fixed in the current package (stay on ≥ 3.30)

GLES3 without half-float render targets (atlas as a sampled array, 3.8.0); crash loop on 32-bit Android `GPU upload failed (SourceOutOfRange)` (3.3.0); magenta text on Adreno 3xx (3.12.0); garbled glyphs on Mali-G52 Vulkan on the first screen (3.20.0); Metal "command encoder already encoding" crash (3.12.0, 3.12.1). A project pinned to an older package can still meet these.

## 11. Gate procedure: adding a new text feature to a screen

Run this before shipping any new tag, modifier, animation, font or text screen.

1. **Describe the use.** Which screen (HUD, menu, popup, world), how many simultaneous instances, how often the text changes, and which characters it can show.
2. **Find the row** in sections 1 and 8. `AVOID`: choose another technique (a sprite, a shader effect on one title, pre-rendered art) or restrict to a handful of instances. `LIMIT`: write the instance budget down.
3. **Tier check.** Which shader tier does it move the text to (section 4)? Is that text isolated from plain body text? Is the tier in the `WarmUpUi` call at boot?
4. **Change class.** What changes at runtime — alpha, RGB, alignment, size, text, styles? Map it to the dirty stage (section 7) and pick the cheapest channel (alpha for fades, `Hide()`/`Show()` for pools, `SetText(StringBuilder)` for numbers).
5. **Atlas and memory.** New characters, scripts, emoji, `<var>` tuples, variants, bigger effect rims or `GlyphResolutionModifier`? Pre-warm the glyphs (recipe P1) and recheck page counts; subset the font if a new script is added.
6. **Batching.** Does it add a texture paint, material, blend mode, decoration or `Standalone` text? Put it on its own Canvas or sorting context if it animates.
7. **Garbage.** No `Text`/`VisibleText`/`SelectedText` reads or string concatenation on hot paths; cached `GetModifier<T>()` results.
8. **Build impact.** Fonts referenced, dictionaries listed, `Include World Shaders` / `Include Lit Shaders`, WebGL font assignment.
9. **Verify on a target phone** (lowest supported device): Frame Debugger draw calls for the screen, profiler GC allocation per frame, memory profiler for atlas pages, a cold first-screen frame time. The vendor's Inspection overlay (the package's `Inspection` assembly) can be used alongside.
10. **Record the decision** (verdict, budget, what was measured) next to the feature so the next change inherits it.

## 12. Recipes

**P1. Boot-time warm-up** (Bootstrap scene or loading screen)
```csharp
LightSideMaterials.WarmUpUi(LightSideSurfaceTier.Text, LightSideSurfaceTier.StyledText);   // only tiers the game uses
// then SetText a hidden UniText with the characters the first screens need so glyphs rasterize before they are seen:
warmLabel.SetText("0123456789");   // digits, the damage-number set, the emoji you will show; Hide() afterwards
```
Result: first Canvas draw does not compile shaders; digits are already in the atlas. Gotcha: a tier the build's shader profile omits throws `ArgumentException`.

**P2. Cut atlas memory**
```csharp
UniTextSettings.SdfAtlasPrecision = GlyphAtlasPrecision.Bits8;   // halves SDF page memory; may band in far-reaching glow/shadow
UniTextSettings.SdfAtlasSize = GlyphAtlasSize.Size1024;          // smaller allocation step
```
Prefer setting these once in the settings asset. At runtime they discard cached glyphs and refresh all text (main thread, outside text processing).

**P3. React to a memory warning**
```csharp
Application.lowMemory += () => {
    UniTextFont.ClearRuntimeData();           // drops FreeType faces, glyph caches and atlas entries; next use rebuilds
    SystemFont.TrimUnused();
    UniTextFontProvider.TrimUnusedVariations();
};
```
Result: atlases refill on demand. The frame-time cost of the re-rasterization burst on a low-end phone was not measured.

**P4. Pooled damage numbers**
```csharp
label.SetText(sb);                              // StringBuilder overload: no string garbage
label.Show();
var c = label.color; c.a = t; label.color = c;  // alpha only: no rebuild
// when the fade ends:  label.Hide();           // alpha 0 would still be drawn and clickable
```
Pool with `Hide()`/`Show()`, never `SetActive(false)`. Set `UseGlobalStylePreset` off on these labels if the global preset is large.

**P5. Isolate an animated label from the rest of a Canvas**
Place the constantly animating `UniText` (phase animation, typewriter) under its own nested `Canvas` so its per-frame mesh does not force the parent Canvas to re-batch. `guideline` — standard uGUI practice, not confirmed for UniText.

## 13. Pitfalls

1. **Nothing here was measured.** Verify `guideline` verdicts on a target device before relying on them.
2. **One outlined word moves the whole component to the `StyledText` tier,** and tiers never batch together; split effect text into its own label.
3. **A running phase animation rebuilds the whole component every frame,** even at amplitude 0.
4. **Per-frame writes of `FontSize`, spacing, wrap or `Padding` re-lay out;** animate transforms, alpha or mesh-only parameters instead.
5. **`SetActive(false)` on pooled texts throws away layout, mesh and atlas references;** use `Hide()`/`Show()`.
6. **Alpha 0 is still drawn and takes pointer events;** `Hide()` after the fade.
7. **First sight of new glyphs, emoji and effect rims costs rasterization and upload;** warm them up behind a loading screen.
8. **Changing atlas size or precision at runtime discards every cached glyph.**
9. **MSDF pages are 4× SDF pages;** colour emoji add a 16–21 MiB RGBA32 page.
10. **Each distinct variable-axis tuple and each `UniTextFontVariant` has its own atlas entries.**
11. **World text fails player builds until `Include World Shaders` is on;** `WarmUpUi` throws for a tier the build omitted.
12. **Dictionaries and CJK fonts dominate build size:** subset fonts, list only the dictionaries you need.
13. **`Text`, `VisibleText`, `SelectedText` and `MeasureText` allocate or re-shape;** use `CharCount`, `TextEquals`, `CopyTextTo`, cached measurements.
14. **A large global style preset is paid by every label** (rules walked at every `<`, styles deep-copied per component).
15. **In a clean build only referenced fonts ship;** an incremental build that cannot report packed content ships all of them.

## Unverified

- Real on-device cost: draw-call counts per scenario, glyph-atlas memory on a device (only formats and page sizes are known), the frame-time cost of the re-rasterization burst after `ClearRuntimeData` on a low-end phone.
- The unit and period of the GPU raster "submission-cost budget (250 ms mobile / 500 ms desktop)".
- The "~2.7× / ~1.3× smaller builds" baseline (the changelog compares with uncompressed font bytes in the asset).
- Whether a hidden text (or a Canvas-culled one) skips the per-frame mesh pass while a phase clock ticks; the cost of re-meshing one `UniTextWorld` inside a shared batch.
- Whether underline/strikethrough decoration quads move the base text to the `StyledText` tier or only their own surface.
- Whether `UseParallel` brings parallelism on WebGL (`WorkerPool.IsParallelSupported` was not read) and how many worker threads are used.
- Nested-Canvas isolation (P5) as a UniText-specific win; it is generic uGUI practice.
- Any vendor mobile budget for UniText 3D.
