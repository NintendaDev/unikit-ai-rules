# UniText — Emoji and color glyphs

> **Base path:** `<UniTextRoot>` is the folder of the UniText package — the one whose `package.json` has `"name": "media.lightside.unitext"` (find it with `Glob **/media.lightside.unitext/package.json`; it may sit under `Packages/` or `Library/PackageCache/`). Never hard-code its location.
> See also: [unitext-inline-media.md](unitext-inline-media.md), [unitext-markup-system.md](unitext-markup-system.md), [unitext-fonts.md](unitext-fonts.md), [unitext-effects-paint.md](unitext-effects-paint.md), [unitext-materials-shaders.md](unitext-materials-shaders.md), [unitext-performance-mobile.md](unitext-performance-mobile.md), [unitext-input-fields.md](unitext-input-fields.md), [unitext-layout-documents.md](unitext-layout-documents.md), [unitext-3d-text.md](unitext-3d-text.md), [unitext-version-traps.md](unitext-version-traps.md)

---

Mobile verdicts (`OK` / `LIMIT` / `AVOID`) in this file come from reading the package source and docs; nothing was profiled. Figures marked "arithmetic" are derived from atlas settings, not measured.

## 1. Quick answers

| Question | Answer |
|---|---|
| How do I put an emoji into text? | Write the real Unicode character(s): `text.Text = "Win \U0001F3C6 x3";`. No tag, no style, no font setup. Needs an OS emoji font on the platform and *Disable Emoji* off. |
| Which emoji exist? | Whatever the platform emoji font covers (or your own color font). No emoji font or emoji list ships with UniText. UniText classifies emoji with Unicode 17.0.0 tables, so classification never limits you — font coverage does. |
| Is there `:shortcode:` or an `<emoji>` tag? | No. Nothing in the package maps names to emoji. Use a C# replace map (recipe R4) or `<sprite=name/>` for custom art ([unitext-inline-media.md](unitext-inline-media.md)). |
| ZWJ sequences, skin tones, flags, keycaps? | They are just more code points; UniText segments them into one cluster and draws one picture (table in section 3). |
| My heart suit, check mark or `™` turned into a colored picture | Symbols flagged `Extended_Pictographic` at or above U+2000 are routed to the emoji font even without a variation selector. Append U+FE0E (`"♥︎"`) for text style, or draw icons as sprites (section 4). |
| Same look on every device? | Ship a color font as `UniTextColorFont` (CBDT, sbix, COLRv0 or COLRv1) and make it the primary of a family in the font stack (section 5). |
| Does `<color>`, `<b>`, `<i>`, `<font>` affect emoji? | No. Alpha, fade, `FilterModifier` and `FillModifier` do; shadow and glow decorate emoji by default; stroke, extrude, inner shadow and glitch only with `ColorGlyphs = Apply` (section 6). |
| Does animation affect emoji? | Emoji clusters are ordinary glyph quads in the mesh. Deformers (arc/curve) do not bend them. See `## Unverified` for glyph animation and reveal. |
| Emoji missing on a device? | Draws as missing glyph or split components depending on platform; probe with `EmojiFont` (R6) and fall back to a sprite or plain text. |
| Turn emoji off? | `UniTextSettings.EmojiDisabled = true` or `EmojiFont.Disabled = true` (R9). |
| Count or cut text that contains emoji? | Never with `string.Length` / `Substring`. Use `TextMeasure` or `TextLengthUnit.Graphemes` (the default for `UniTextEditable` length limits). |
| Icons that must look identical everywhere (hearts, coins, suits)? | Use inline sprites, not text symbols. |
| Does it work on WebGL? | Yes: browser emoji through Canvas 2D at 64 px, or an assigned `UniTextColorFont` (section 9). |

## 2. Where emoji come from

### 2.1 Model

```
string with emoji chars -> grapheme clusters (ZWJ / regional-indicator / modifier aware)
  emoji cluster?  (EmojiSequenceClassifier / single-code-point rule, section 3) -- bypasses the font chain
     yes -> a stack family whose PRIMARY is a UniTextColorFont and covers cluster[0]
            else the system EmojiFont (reserved fontId -1; Android: one face per cluster)
            shaped as Script=Common, LTR (even inside RTL paragraphs), no font variations
     no  -> normal chain: requested family -> fallback chain -> system font
  color bitmap -> shared color glyph atlas (RGBA32, mipmapped) -> mesh quad, vertex color white
  effects on a color glyph use a silhouette distance field derived from the bitmap alpha
```

- The default font stack of the package holds only Noto Sans, Noto Sans Arabic and Noto Sans Hebrew. Emoji "render from the OS emoji font by default — nothing to configure".
- The samples' phrase "dedicated emoji font atlas" means UniText's own shared GPU color atlas, not a shipped font. Consistency across devices needs your own color font.
- Routing to the emoji font only happens while `EmojiFont.IsAvailable` is true (an emoji font exists and *Disable Emoji* is off).

### 2.2 Per platform

| Platform | Source of the emoji font | Rendering path | Notes |
|---|---|---|---|
| Windows (Editor, Standalone) | `seguiemj.ttf` (Segoe UI Emoji) from the Windows fonts folder | FreeType / Blend2D into the color atlas | Missing file means no emoji. |
| macOS (Editor, Standalone) | Apple Color Emoji `.ttc` (sbix) | FreeType | Must be a color font and contain U+1F600, else null. |
| iOS | CoreText system emoji face; opaque (no file, no bytes) | CoreText native rasterization and shaping | ZWJ, skin tones and flags combine. Single default-text pictographs get VS16 appended internally. |
| Android | Per cluster: the platform font matcher with the emoji script locale `und-Zsye`; a different face is loaded when the matcher answers with another font | FreeType / Blend2D (CBDT or COLR) | Look is device-specific (Noto Color Emoji, Samsung, other vendors). Emoji newer than the device font come out missing or split. |
| Linux (Editor, Standalone) | First existing of `/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf`, `/usr/share/fonts/google-noto-emoji/NotoColorEmoji.ttf`, `/usr/share/fonts/noto-emoji/NotoColorEmoji.ttf`; Symbola paths are tried next but rejected as monochrome | FreeType | No Noto Color Emoji installed means `EmojiFont.IsAvailable == false`. |
| WebGL | The browser, via Canvas 2D (`BrowserEmoji.jslib`) at color size 64 px | JS batch render to RGBA, then the color atlas | Asks the browser whether a ZWJ sequence is supported, otherwise draws components separately. No OS fonts exist on WebGL. |

Validation applied to every candidate emoji font: it must contain color glyphs and a glyph for U+1F600.

### 2.3 Classification versus coverage

- UniText's Unicode property table is version 17.0.0 (header `0x00110000`). A brand-new emoji is therefore recognized as an emoji cluster; whether it draws as a picture depends only on the font that serves it.
- Look and coverage change with the OS version: Unicode 15/16/17 emoji appear only on OSes whose emoji font has them. Without a bundled color font you cannot control either.
- Open the package's Emoji sample scene (`<UniTextRoot>/Samples~/Emoji/Emoji.unity`) on target hardware as a coverage test: it is one long string of the whole fully-qualified emoji set plus a draggable label. Look for boxes and split sequences.

### 2.4 Color font formats UniText can render (for `UniTextColorFont`)

| Format | Rendered? | Mobile |
|---|---|---|
| CBDT/CBLC (Google bitmap) | yes | OK; large file — subset it (section 5) |
| sbix (Apple bitmap) | yes | OK; large file — subset it |
| COLRv0 | yes | OK |
| COLRv1 | yes, through UniText's own Blend2D paint renderer, decided per glyph from the font's color table; glyphs COLRv1 lacks fall back to bitmap or outline | LIMIT: CPU vector rendering is heavier than bitmap strikes on low-end devices |
| OpenType-SVG (`SVG ` table only) | **no** — detected but not rendered, draws nothing | AVOID: pick a COLR/CBDT/sbix build of the font |

Bitmap strikes snap to the nearest available size; vector COLR renders at `ColorPixelSize`.

## 3. Writing emoji: what counts as an emoji cluster

Input forms and whether UniText routes the cluster to the color font. The threshold "U+2000" is `EmojiRangeThreshold`.

| Input (one grapheme cluster) | Routed to color font? | C# literal |
|---|---|---|
| Single code point at or above U+2000 that is `Emoji_Presentation` or `Extended_Pictographic` (not a regional indicator) | yes, even without VS16 | `"\U0001F600"`, `"❤"`, `"⭐"` |
| The same plus U+FE0F (VS16) | yes | `"❤️"` |
| The same plus U+FE0E (VS15) | **no**: normal font chain, text glyph, tintable by `<color>` | `"❤︎"` |
| Code point below U+2000 (`©` U+00A9, `®` U+00AE) plus VS16 | yes | `"©️"` |
| Lone code point below U+2000 (`1`, `#`, `*`, `©`, `®`) | no: normal text font | — |
| Keycap: base `0-9 # *`, optional U+FE0F, then U+20E3 | yes | `"1️⃣"` or `"1⃣"`, `"#️⃣"` |
| Flag: exactly two regional indicators U+1F1E6–U+1F1FF | yes (a lone regional indicator is NOT emoji) | `"\U0001F1FA\U0001F1F8"` (US) |
| Subdivision flag: U+1F3F4, tag characters U+E0020–E007E, cancel tag U+E007F | yes | England: `"\U0001F3F4\U000E0067\U000E0062\U000E0065\U000E006E\U000E0067\U000E007F"` |
| ZWJ sequence (first code point `Extended_Pictographic`, or U+200D at index 1 or later) | yes | family: `"\U0001F468‍\U0001F469‍\U0001F467‍\U0001F466"` |
| Skin tone: base plus modifier U+1F3FB–U+1F3FF | yes (one cluster) | thumbs up: `"\U0001F44D\U0001F3FD"` |
| Rainbow flag: U+1F3F3, VS16, ZWJ, U+1F308 | yes | `"\U0001F3F3️‍\U0001F308"` |

Rules that follow:

- A cluster whose second code point is U+FE0E is never emoji, whatever precedes it.
- Once a cluster is routed, `<font>` / `FontModifier` is ignored for it: emoji always resolve to the emoji font (or your color family).
- Shaping is `Script=Common`, left-to-right, even inside Arabic/Hebrew paragraphs, and without font variations.
- Anything the property tables do not flag stays a normal character and goes through the ordinary font chain.
- Selection, caret and backspace treat one cluster as one unit (one arrow press, one backspace). A C# `"\U0001F3C6"` is a surrogate pair, so `string.Length == 2`; a family emoji is 11 UTF-16 units.

## 4. Text symbols versus emoji (VS15 / VS16)

Symbols that are `Extended_Pictographic` and at or above U+2000 become **color emoji when written alone**. If the emoji font lacks the glyph, the result is a missing-glyph box. Symbols that are not flagged stay in the text font.

| Symbol | Code point | Alone becomes color emoji? | Text-style form |
|---|---|---|---|
| ❤ heavy black heart | U+2764 | yes | `"❤︎"` |
| ♥ ♠ ♣ ♦ suits | U+2665 U+2660 U+2663 U+2666 | yes | add `︎` |
| ✔ ✖ | U+2714 U+2716 | yes | add `︎` |
| ™ trade mark | U+2122 | yes | add `︎` |
| ☎ ⚙ ⚔ ✂ ✉ | U+260E U+2699 U+2694 U+2702 U+2709 | yes | add `︎` |
| ▶ ⬅ | U+25B6 U+2B05 | yes | add `︎` |
| ↔ ↕ ↖ ↗ ↘ ↙, ↩ ↪ (arrows) | U+2194–U+2199, U+21A9–U+21AA | yes | add `︎` |
| ⭐ star, ⚡ high voltage | U+2B50 U+26A1 | yes, always (`Emoji_Presentation`) | add `︎` |
| ★ ☆ | U+2605 U+2606 | no | already text |
| ✓ | U+2713 | no | already text |
| → • ● | U+2192 U+2022 U+25CF | no | already text |
| © ® | U+00A9 U+00AE | no alone (below U+2000); yes with `️` | `"©️"` for color |

- **Remedy for an unwanted color symbol:** append U+FE0E. The cluster then goes through the normal font chain, so it renders only if your font stack or the system fallback has that glyph. Check the target device; do not assume Noto Sans covers it.
- **Remedy for a wanted color symbol:** append U+FE0F; this is the fully-qualified form the Emoji sample uses.
- For UI icons (HUD hearts, card suits, rating stars, checkmarks) that must look the same on every device and be tintable, use sprites or a custom font, not text symbols.

## 5. Shipping your own color font (one look on every device)

A `UniTextColorFont` placed as the **primary of a family** in the font stack wins over the system emoji font for every cluster whose **first code point** it covers. Family order does not matter for emoji routing: every family whose primary is a color font is scanned and the first one with a glyph for the cluster's first code point serves it; otherwise the system emoji font does.

1. Get a color emoji `.ttf` whose licence allows embedding, with a `COLR` (v0 or v1), `CBDT` or `sbix` table. Inspect the file: an `SVG ` table alone draws nothing.
2. Select the font file, then `Assets → Create → LightSide → UniText → Fonts → Color Font Asset`. The inspector exposes *Color Pixel Size* (16–512, default 128; clamped internally to between 8 and the atlas page size minus 8).
3. Add it as the **Primary** of its own `FontFamily` in the component's `UniTextFontStack` (create the stack with `Assets → Create → LightSide → UniText → Fonts → Font Stack (Combined)` or edit *Families*). Keep your text font as the **first** family: the first family's primary supplies the strut metrics (line height, ascent, descent).
4. Keep *Color Pixel Size* at 128 unless there is a reason. The color atlas is shared with the system emoji font, and the first color font loaded sets the tile size (normally the 128 px system font); a font asking for more pixels is downscaled.
5. Verify on every target with the Emoji sample scene.
6. Shrink it (R8): the font bytes are embedded (Zstd) in the asset, and on WebGL the color rasterizer is added to the build.

```csharp
// In-memory setup (e.g. a font downloaded at runtime); no AssetDatabase needed. // not compiled
var color = UniTextFont.CreateFontAsset<UniTextColorFont>(File.ReadAllBytes(path));
var stack = ScriptableObject.CreateInstance<UniTextFontStack>();
stack.Families.ReplaceAll(new[]
{
    new FontFamily { primary = latinFont },   // first family: strut metrics
    new FontFamily { primary = color },       // color emoji family
});
text.FontStack = stack;
```

Mobile: a custom bitmap font is `OK` for runtime cost but `LIMIT` for build size (subset it); COLRv1 is `LIMIT` (CPU rendering); raising *Color Pixel Size* above need is `AVOID` because it enlarges every atlas tile.

## 6. How color, style and effects act on emoji

Tag names in this table (`<color>`, `<b>`, `<i>`, `<font>`, `<size>`, `<alpha>`, `<mat>`) are authored vocabulary, not built-ins: a fresh component understands none of them. They work only after the tag is registered through a Styles picker preset, the TMP-migration vocabulary, or code (master rule section "Tag vocabulary bootstrap" in `../unitext.md`, and [unitext-markup-system.md](unitext-markup-system.md)). The behaviours below apply to the modifier behind the tag, whatever name you give it.

| Feature | On emoji | Mobile |
|---|---|---|
| `<color>` / `ColorModifier` | **ignored**; vertex color of emoji is fixed white | OK |
| Component `color` alpha, `Hide()` / `Show()`, `FadeTo`, `CrossFadeAlpha` | fades with the text (Canvas text: `CanvasGroup` on the render root; world text: vertex alpha) | OK |
| `<alpha>` / `AlphaModifier` | fades the emoji with its range | OK |
| `<b>` fake bold, `<i>` synthetic slant | not applied to color glyphs | OK |
| `<size>`, component font size, auto size | emoji scale proportionally with font size | OK |
| Font-size normalization (`FontSizeMatch`) | the system emoji font is excluded, so emoji are not matched to x-height | OK |
| `<font>` / `FontModifier` | ignored; clusters always resolve to the emoji font or your color family | OK |
| Deformers (`DeformModifier`: arc, curve, ...) | color glyphs are **not deformed** | OK |
| `FilterModifier` (greyscale, sepia, tint filters) | **recolors emoji** | OK |
| `FillModifier` | `ColorGlyphs = Skip`: the emoji is drawn as its own picture at the fill's layer position. `Apply`: the emoji is painted as a silhouette in the fill's paint (solid, gradient, texture) | LIMIT: silhouette field per emoji |
| Shadow, Glow | **decorate emoji by default** (silhouette from bitmap alpha, 50 % threshold) | LIMIT: one extra SDF-atlas entry per decorated emoji |
| Stroke, InnerShadow, Extrude, Glitch | skip emoji unless `ColorGlyphs = Apply` | LIMIT with `Apply`: same silhouette cost |
| `MaterialModifier` (`<mat>`) | emoji are handled like text through the unified vertex mode; glyphs drawn from textures outside the atlases (sprites) are not copied into the sub-mesh | OK |
| Bidi | emoji runs shape LTR, script Common | OK |
| Selection, caret, backspace, line breaks | one cluster is one unit | OK |
| `UniText3D` | `colorGlyphs = Flat` (default, picture on the front of the extrusion) or `Sticker` (shape extruded with the image on front; `stickerBorder` in em, default 0.04); 2D effect layers are not drawn on 3D text | LIMIT: see [unitext-3d-text.md](unitext-3d-text.md) |

`ColorGlyphPolicy` has three values: `Inherit` (no value, use the effect's default), `Skip` (0) and `Apply` (1). Defaults: `ShadowModifier` and `GlowModifier` are `Apply`; `StrokeModifier`, `ExtrudeModifier`, `InnerShadowModifier`, `GlitchModifier` and `FillModifier` are `Skip`. Set it:

- Inspector: the style's modifier, *Color Glyphs* dropdown.
- C#: `new StrokeModifier { ColorGlyphs = ColorGlyphPolicy.Apply }`.
- Markup: it is the last positional slot of each effect tag; prefer the inspector or C# (slot index not verified, see `## Unverified`). Enum tokens accept the full name or a unique first letter (`apply`/`a`, `skip`/`s`).

First use of an effect on a color glyph derives a silhouette distance field into the SDF atlas, one entry per decorated emoji. Effect details live in [unitext-effects-paint.md](unitext-effects-paint.md).

## 7. Size, baseline and line height

- Emoji glyph scale is `fontSize * FontScale / unitsPerEm` of the serving font, so an emoji follows the surrounding font size; its advance and ascent come from the emoji font, not from your text font.
- Color glyphs were drawn 1–2 % too small before 3.5.0; this is fixed.
- `LineHeightModifier` default mode is `Content`: the line grows to the tallest font on it, so the emoji font's ascent and descent can open the line. A line with emoji is therefore sometimes taller than neighbouring lines. Setting that modifier's mode to `primary` stops fallback glyphs (including emoji) from enlarging the line. Register the line-height tag yourself (the tag name is data; see [unitext-formatting-tags-quickref.md](unitext-formatting-tags-quickref.md)).
- The first family of the font stack supplies the strut metrics (line height, ascent, descent); a color family added later does not change them.
- Selection and measurement: use grapheme-aware APIs (`TextMeasure`, `TextLengthUnit.Graphemes`); family emoji counts as 1.

## 8. Mobile cost

| Item | Facts | Verdict |
|---|---|---|
| Color atlas | RGBA32, mipmapped; one tile is `ColorPixelSize + 2 * 4` px square (136 px at the default 128) per distinct emoji; shared by system emoji, `UniTextColorFont` and the silhouettes of decorated sprites | LIMIT |
| Page 2048 x 2048 (default `ColorAtlasSize`) | about 16 MB RGBA32, about 21 MB with mips, about 15 x 15 = 225 tiles (arithmetic) | LIMIT |
| Page 1024 x 1024 (`GlyphAtlasSize.Size1024`) | about 4 MB, 7 x 7 = 49 tiles (arithmetic) | OK for a game that shows a few dozen distinct emoji; saves about 12 MB per page |
| Many distinct emoji (chat, emoji picker) | pages grow on demand; hundreds of distinct emoji need several pages either way | LIMIT: keep `Size2048` there, and do not raise *Color Pixel Size* |
| First use of each emoji | system emoji face is created on the first text refresh; each bitmap is rasterized (in batches, on worker threads where allowed, never on WebGL) the first time it is shown | LIMIT: pre-warm (R12) |
| Memory pressure | `Application.lowMemory` disposes the emoji face pools | OK |
| Custom COLRv1 font | Blend2D vector paint on the CPU | LIMIT |
| Whole-text shadow or glow containing emoji | silhouette field per decorated emoji | LIMIT |
| Stroke / fill with `ColorGlyphs = Apply` on emoji | same silhouette field | LIMIT |
| System emoji font on Android | one face per cluster, per device; look and coverage are not controllable | OK for cost, uncontrolled for look |

`UniTextSettings.ColorAtlasSize` (Project Settings → LightSide → UniText, Atlases) is `Size1024` or `Size2048` (default); a page grows to fit a tile larger than the size, and changing it refreshes cached color glyphs.

## 9. WebGL

- Browser emoji render through Canvas 2D at color size 64 px (128 px elsewhere): `WebGLEmoji` batches renders to RGBA, `WebGLEmojiShaper` asks the browser whether a ZWJ sequence is supported and otherwise draws components separately.
- An assigned `UniTextColorFont` replaces the browser emoji and renders on WebGL too (since 3.20.0), at the cost of a larger build (the color rasterizer is added to the WebGL player). The `WebGLEmoji.TryRenderEmoji*` single-emoji APIs were removed in 3.20.0 (WebGL builds only).
- Discrepancy: the package docs' color-font section still says WebGL rasterizes no embedded color font; the runtime and changelog 3.20.0 render it. Trust the runtime.
- There are no OS fonts on WebGL: assign real text fonts as well.
- Mobile web: `LIMIT` (64 px tiles and JS render cost; a color font adds build size).

## 10. Types and settings

| Type / member | Kind | Purpose | Mobile |
|---|---|---|---|
| `EmojiFont` : `ColorFontCore` | class | System emoji provider singleton. `static EmojiFont Instance` (auto-creates; null when disabled or unavailable), `static bool IsAvailable`, `static bool Disabled {get;set}` (invalidates glyph caches, raises `DisableChanged`), `static void EnsureInitialized()`, `const int FontId = -1`, `static event Action DisableChanged`. Pre-warmed on the first text dirty | OK |
| `SystemEmojiFont` | static class | `static string GetDefaultEmojiFont()`: path of the OS emoji font file, or null (iOS always null; class not compiled on WebGL) | OK |
| `ColorFontCore` : `UniTextFont.Core` | class | Rasterizes color glyphs. `CreateFromPath(path, faceIndex=0, pixelSize=128)`, `CreateFromData(bytes, faceIndex, pixelSize, name)`, `ColorPixelSize`, `AtlasSize`, `DefaultSize` (128; 64 on WebGL), `DisposeFacePool()` | LIMIT |
| `UniTextColorFont` : `UniTextFont` (sealed) | ScriptableObject | Your color font. `int ColorPixelSize {get;set}`. Add as primary of a `FontFamily` | LIMIT |
| `ColorGlyphPolicy` | enum | `Inherit`, `Skip = 0`, `Apply = 1`; property `EffectModifier.ColorGlyphs` | LIMIT (`Apply`) |
| `Text3DColorGlyphs` | enum | `Flat` / `Sticker` for `UniText3D.colorGlyphs` | LIMIT |
| `UniTextSettings.EmojiDisabled` | static property | Persisted mirror of *Disable Emoji* (Project Settings → LightSide → UniText); drives `EmojiFont.Disabled` | OK |
| `UniTextSettings.ColorAtlasSize` | static property (`GlyphAtlasSize`) | `Size1024` or `Size2048` (default) | LIMIT (`Size2048`) |
| `UniTextEditable.InsertObject<T>(string)` | method | Inserts an inline object at the caret (see [unitext-inline-media.md](unitext-inline-media.md)) | OK |

## 11. Recipes

### R1. Emoji in a plain label (zero setup)
```csharp
text.Text = "Victory \U0001F3C6  x3 \U0001F525";   // trophy U+1F3C6, fire U+1F525 (\U = 8 hex digits, one code point)
```
Literal characters pasted into the inspector Text field or a UTF-8 `.cs` string work equally. Needs only an OS emoji font and *Disable Emoji* off. Gotcha: the C# literal is a surrogate pair, so `string.Length == 2`.

### R2. Cheat sheet of forms
```csharp
const string Smile   = "\U0001F600";                         // single code point
const string Heart   = "❤️";                       // VS16, explicit emoji presentation
const string HeartTx = "❤︎";                       // VS15, NOT emoji: drawn by the text font chain
const string Thumb   = "\U0001F44D\U0001F3FD";               // base + skin tone
const string FlagUS  = "\U0001F1FA\U0001F1F8";               // exactly two regional indicators
const string FlagEng = "\U0001F3F4\U000E0067\U000E0062\U000E0065\U000E006E\U000E0067\U000E007F";
const string Family  = "\U0001F468‍\U0001F469‍\U0001F467‍\U0001F466";   // ZWJ sequence
const string Keycap5 = "5️⃣";                      // "5⃣" is also accepted
const string Rainbow = "\U0001F3F3️‍\U0001F308";
```
Gotcha: write VS16, ZWJ and tag characters as escapes in source; invisible characters pasted into files are easily dropped by editors.

### R3. Hearts and card suits in a HUD
`text.Text = "♥︎ 3"` draws a text-style tintable heart (if the font chain has the glyph); `"♥"` alone or `"♥️"` draws the color emoji heart. For a HUD heart or a card suit that must look the same on every device and recolor with `<color>`, use an inline sprite. Gotcha: with `<color=red>` a lone `♥` stays its own color because it is routed to the emoji font.

### R4. `:shortcode:` to emoji or sprite (no built-in; do it in C#)
```csharp
using System;
using System.Collections.Generic;
using System.Text.RegularExpressions;

public static class EmojiShortcodes
{
    static readonly Dictionary<string, string> Map = new(StringComparer.OrdinalIgnoreCase)
    {
        ["smile"]    = "\U0001F604",
        ["fire"]     = "\U0001F525",
        ["heart"]    = "❤️",
        ["thumbsup"] = "\U0001F44D",
        ["coin"]     = "<sprite=coin/>",   // custom art; needs the sprite style (unitext-inline-media.md)
    };
    static readonly Regex Token = new(@":([a-z0-9_+\-]+):", RegexOptions.Compiled | RegexOptions.IgnoreCase);

    public static string Expand(string s) =>
        Token.Replace(s, m => Map.TryGetValue(m.Groups[1].Value, out var v) ? v : m.Value);
}
// text.Text = EmojiShortcodes.Expand("GG :fire: +50 :coin:");   // not compiled
```
Unknown names are left untouched, so `12:30:45` survives. Run it on the final string before assignment (for chat input, not per keystroke). The markup-engine alternative `StringParseRule` is not standalone (`AddRule` logs an error unless paired with a modifier in a `Style`) and allows one fixed replacement per rule; prefer the C# map. If `<sprite=...>` outputs come from user text, see the sanitization pitfall in [unitext-inline-media.md](unitext-inline-media.md).

### R5. Emoji in localization tables, JSON and TSV
Store emoji as literal UTF-8 in TSV and JSON, or as UTF-16 escapes (`😀`) in JSON. `\U0001F600` is not a JSON escape. Do not let tooling strip U+200D, U+FE0F, U+20E3 or tag characters at cell edges; they are not whitespace, but some editors drop them. Count and cut with grapheme-aware APIs.

### R6. Can this device show emoji X? (probe plus fallback)
```csharp
static bool CanShowEmoji(int codepoint)
{
    var font = EmojiFont.Instance;            // null when disabled or no emoji font on this platform
    return font != null && font.GetGlyphIndexForUnicode((uint)codepoint) != 0;   // not compiled
}
// Unicode 14 "melting face": CanShowEmoji(0x1FAE0). Single code points only; sequences cannot be probed this way.
bool anyEmoji = EmojiFont.IsAvailable;        // false on Linux without Noto Color Emoji, etc.
```
Use it to swap a too-new emoji for a sprite or an ASCII fallback. Main thread only (`Instance` may create the face). On Android the primary face answers only for itself; a cluster may be served by another per-cluster face, so a false result is certain but a true result is only likely.

### R7. One consistent emoji look on every device
Follow section 5. Result: the same pictures on iOS, Android, Windows and WebGL for every emoji the font covers; emoji it lacks still fall to the system emoji font, so test the exact set you ship. Gotcha: the first color font loaded fixes the atlas tile size, so keep *Color Pixel Size* at 128 unless you have a reason.

### R8. Shrink a color font to the emoji the game uses
Editor: `Tools → LightSide → UniText → Utilities → Font Subsetter` (mode *Keep*, give a text corpus or ranges). It keeps OpenType features and accepts color fonts; only a font with no outlines and no color glyphs (plain bitmaps) is refused. Scripted (editor assembly):
```csharp
// Keep every code point of each sequence: U+200D, U+FE0F, U+20E3, regional indicators, tag characters, skin-tone modifiers.
var subset = UniTextFontEditorUtility.Subset(bytes, "\U0001F3C6\U0001F525❤️\U0001F1FA\U0001F1F8");   // string overload decodes surrogate pairs
UniTextFontEditorUtility.ReplaceFontData(colorFontAsset, subset);   // keeps GUID and references; one Undo step
```
Gotcha: a sequence whose joiner or selector was left out collapses into its parts.

### R9. Turn emoji off or on globally
```csharp
UniTextSettings.EmojiDisabled = true;   // persisted mirror (Project Settings -> LightSide -> UniText -> Disable Emoji)
EmojiFont.Disabled = true;              // runtime flag: invalidates glyph caches, raises DisableChanged, texts rebuild
```
Disabled means emoji code points follow the ordinary font chain (the system font fallback may draw monochrome glyphs or boxes).

### R10. Shadow, glow and stroke around emoji
```csharp
text.Styles.Add(Style.WholeText(new ShadowModifier()));    // emoji get a silhouette shadow by default
text.Styles.Add(Style.WholeText(new StrokeModifier { ColorGlyphs = ColorGlyphPolicy.Apply }));  // stroke traces the emoji
```
Per-range opt-out: set `ColorGlyphs = Skip` for that style or range. A whole-text shadow also shadows every emoji and every sprite in the text; scope it with a tag range when that is not wanted.

### R11. "Locked / disabled" look for emoji
`<color>` does nothing to emoji. Use a `FilterModifier` (greyscale or sepia filter recolors emoji) over the range, `FillModifier` with `ColorGlyphs = Apply` to paint the silhouette in one paint, or fade with `<alpha=50%>`. Exact filter setup belongs to [unitext-effects-paint.md](unitext-effects-paint.md).

### R12. Pre-warm emoji at load (avoid first-show hitches)
Render a hidden or off-screen text that contains every emoji the game will show (damage reactions, emoji buttons) once while a loading screen is up; each emoji is rasterized into the color atlas the first time it is drawn.
```csharp
warmup.Text = "\U0001F525\U0001F3C6❤️\U0001F44D";   // active but off-screen for a frame or two; not compiled
```

### R13. Emoji picker or chat screen budget
Keep `ColorAtlasSize = Size2048`, leave *Color Pixel Size* at 128, show only the visible page of emoji (a recycled list), and accept several atlas pages. For a small fixed set elsewhere in the game, `Size1024` saves memory.

## 12. Pitfalls

**Presentation**
1. Lone `♥ ♠ ♣ ♦ ❤ ✔ ✖ ™ ☎ ⚙ ⚔ ▶ ⬅` become color emoji (or boxes when the emoji font lacks them). Add U+FE0E or use sprites. `★ ☆ ✓ → • ●` are not affected.
2. A lone regional indicator is not emoji; two make a flag. Unsupported flags and ZWJ sequences degrade to their parts, depending on browser or OS.
3. `<color>`, `<b>`, `<i>`, `<font>` and deformers do nothing to emoji by design. Grey an emoji with a filter, fill(`Apply`) or alpha.
4. Stroke, extrude, inner shadow, glitch and fill skip emoji unless `ColorGlyphs = Apply`; shadow and glow decorate them by default.

**Platform**
5. Look and coverage differ per platform and OS version and are out of your control without a custom color font. The Android answer is per cluster per device.
6. Linux player or editor without Noto Color Emoji means no emoji at all (`EmojiFont.IsAvailable == false`).
7. SVG-in-OpenType color fonts (some Twemoji and OpenMoji builds) draw nothing; pick a COLR, CBDT or sbix build.
8. WebGL default color size is 64 px; an assigned color font works there but grows the build.

**Layout and counting**
9. A line with emoji can be taller than others in `Content` line-height mode; use mode `primary` where uniform lines matter.
10. `string.Length`, `Substring`, `Take` and similar break surrogate pairs and ZWJ sequences. Use grapheme-aware measurement.
11. The first family in the font stack gives the strut metrics: put your text font first, the color family after it.

**Performance**
12. Do not raise *Color Pixel Size* without need; every tile grows and atlas pages multiply.
13. Do not rely on first-show rasterization during gameplay: pre-warm (R12).
14. Each decorated emoji adds a silhouette-field entry to the SDF atlas; avoid whole-text shadow or glow on emoji-heavy chat text on low-end devices.

## Unverified

- Exact on-screen result for an emoji the Android or Windows font lacks (box, split components or blank): the code has no special fallback to a text glyph.
- Which COLR version (v0 or v1) Segoe UI Emoji and Android Noto ship on a given OS build; both are supported by the runtime.
- Behaviour of *Disable Emoji* together with a `UniTextColorFont`: inferred (emoji are not specially routed, the normal chain serves what the color family covers), not tested.
- Which open emoji sets (Noto Color Emoji, Twemoji, OpenMoji, ...) are published with which tables and under which licence: inspect the file you choose for `COLR`, `CBDT` or `sbix`.
- Whether glyph animations, reveal effects and per-glyph timing move an emoji quad as they do other glyphs, and whether `FilterModifier` and glyph animations combine with custom color fonts: not run.
- Markup slot index of `ColorGlyphs` per effect (derived as slot 15 for `stroke` from the documented grammar): use the inspector or C# property.
- Whether a lone ♥ with U+FE0E is drawn by Noto Sans: depends on the font stack, check on device.
- Magnitude of the COLRv1 CPU cost versus bitmap emoji on low-end phones; mip memory of the color atlas is derived from configuration, not measured.
- `CanShowEmoji` (R6) and the in-memory stack snippet (section 5) are composed from source signatures and not compiled.
