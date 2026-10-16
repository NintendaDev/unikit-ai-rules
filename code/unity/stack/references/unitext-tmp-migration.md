# UniText — TextMeshPro migration

> **Base path:** `<UniTextRoot>` is the folder of the UniText package — the one whose `package.json` has `"name": "media.lightside.unitext"` (find it with `Glob **/media.lightside.unitext/package.json`; it may sit under `Packages/` or `Library/PackageCache/`). Never hard-code its location.
> See also: [unitext-components-setup.md](unitext-components-setup.md), [unitext-runtime-api.md](unitext-runtime-api.md), [unitext-markup-system.md](unitext-markup-system.md), [unitext-formatting-tags-quickref.md](unitext-formatting-tags-quickref.md), [unitext-fonts.md](unitext-fonts.md), [unitext-inline-media.md](unitext-inline-media.md), [unitext-input-fields.md](unitext-input-fields.md), [unitext-interaction-links.md](unitext-interaction-links.md)

---

Mobile verdicts (`OK` / `LIMIT` / `AVOID`) come from reading source and docs; nothing was profiled. The source of truth for the tag map is `<UniTextRoot>/Editor/Migration/MigrationMapping.cs` (`TagVocabulary`, `UnsupportedTags`, `TagsNeedingManualSetup`, `TagValueNotes`); the migration window is `<UniTextRoot>/Editor/Migration/UniTextMigrationWindow.cs`.

## TMP thing → UniText (components and types)

| TMP | UniText | Auto-migrated? |
|---|---|---|
| `TextMeshProUGUI` | `UniText` | yes (Simple; Moderate for highlight style, Geometry/Baseline/Capline alignment, masking/scroll/page/linked overflow, non-zero char/word/line/paragraph spacing, `fontWeight != 400`, vertex gradient) |
| `TextMeshPro` (3D object text) | `UniTextWorld` (needs `Include World Shaders`) | yes (Complex). A world `TextMeshPro` that uses `<sprite>` tags stays on TMP: `SpriteModifier` renders through Canvas UI |
| `TMP_SubMesh`, `TMP_SubMeshUI` | removed (no sub-meshes; one shared atlas) | yes |
| `TMP_InputField` | `UniTextSelectable` + `UniTextEditable` on the field's own text object, with Input Field policies from Project Settings | yes, exact-or-nothing (Complex): a composite or nothing, never half-converted |
| `TMP_Dropdown` | `UniTextDropdown` (rebuild from the `Dropdown (UniText)` prefab) | **no** — Manual |
| `TMP_FontAsset` | `UniTextFont` (+ `UniTextFontStack`) | yes, in the Fonts stage |
| `TMP_SpriteAsset` | `UniTextSprites` catalog + `SpriteModifier` + `AssetSpriteProvider` + `InlineTagRule("sprite")` | yes, per component |
| `TMP_StyleSheet` / `<style=>` | `StylePreset` asset | Manual |
| `TMP_Settings` | Project Settings -> LightSide -> UniText | Manual |
| `TMP_ColorGradient`, `VertexGradient` | gradient paint on `FillModifier` | Manual |
| `TextAlignmentOptions` | `HorizontalAlignment` + `VerticalAlignment` | literals rewritten in scripts |
| `FontStyles` | whole-text `BoldModifier`, `ItalicModifier`, ... | yes |
| `FontWeight` | `VariationModifier` on the `wght` axis | yes (no effect on static fonts) |
| `TextOverflowModes` | `EllipsisModifier` / `TruncateModifier` (Masking, ScrollRect, Page, Linked: none) | partial |
| `TextWrappingModes` | `WordWrap` (`bool`) | yes |
| `TMP_TextInfo`, `TMP_CharacterInfo`, `TMP_LineInfo`, `TMP_WordInfo` | `Buffers`, `ResultGlyphs`, `Buffers.lines`, `CaptureTextSnapshot()`, `TextRange`, `Units(TextUnit)` | Manual (reported) |
| `TMP_TextUtilities` | `FindAll`, `GetRangeText`, `HitTestRange` | Manual |
| `TMPro_EventManager` | C# events on the component (`Committed`, `LayoutCommitted`, ...) | Manual |

## What the migration tool does

- Menu: **`Tools -> LightSide -> UniText -> Migration`** opens a workspace with tabs Dashboard, Analysis, Font Mapping, Script Preview, Settings, Log. It scans, ranks and rewrites **only what you select**; nothing runs on build or project open.
- Preconditions: Asset Serialization = **Force Text** (the scan is refused otherwise); commit to version control first (the diff is the real undo); keep TextMesh Pro installed until the last finding is handled; use a short-lived branch; have a project-wide Style preset (see the Dashboard card below).
- Scope: the project's Assets and Packages folders — scenes, prefabs, C# scripts, `.asset`, `.mat`, `.anim`, `.asmdef`, `.csv/.json/.txt` containing markup. UniText's own packages are never scanned.

Four ordered stages:

| Stage | What happens |
|---|---|
| 1 Fonts | each TMP font gets a UniText font plus a `UniTextFontStack`; migrated components point at the **stack**. Mapping creates assets and never deletes TMP assets. Per-font fallback tables are flattened depth-first; `TMP_Settings` project fallbacks become one shared fallback stack chained through `fallbackStack`. A fallback without a UniText font drops out and is logged — boxes appear where CJK/emoji used to render |
| 2 Components | prefabs leaf-first, scenes last, per file. Sibling `RequireComponent` types the replacement also satisfies (for example `Graphic` shadow/outline decorators) are set aside and restored; types UniText can never satisfy (`TMP_Text`-requiring animators/localisers) are removed with their full state written to the losses file. A whole swap is one Undo step per scene |
| 3 Scripts + asmdefs | an asmdef referencing `Unity.TextMeshPro` must reference UniText **before** scripts are rewritten; a `.bak` is kept beside each rewritten file; a compile-error-driven rename pass finishes members on unresolved receivers |
| 4 Cleanup | materials, animation curves, rich-text assets, compiled assemblies: manual |

Buttons: `Migrate simple components`, `Migrate all pending` (also 3D text), a one-pass run, `Verify`, `Re-check`, `Mark handled`, `Skip`, `Restore N reference(s)`. State files: `ProjectSettings/UniText/{MigrationState, FontMappings, MigrationLosses}.json` (commit them) and `Library/UniText/*` (do not commit).

Script rewrite: renames types `TextMeshProUGUI` → `UniText`, `TextMeshPro` → `UniTextWorld`, `TMP_Text` → `UniTextBase`, `TMP_InputField` → `UniTextEditable`, `TMP_FontAsset` → `UniTextFont`, `using TMPro;` → `using LightSide;`. It touches members only on receivers it can type (others are reported; the compile-error pass finishes `.text`-style members). Alignment literal assignments become two statements using fully qualified `LightSide.HorizontalAlignment` / `LightSide.VerticalAlignment`. Everything in the tool's "Reported, never rewritten" list is ported by hand.

### Markup vocabulary card (Dashboard)

While no `GlobalStylePreset` is assigned the Dashboard shows a "Create Style preset (N tags)" card. It opens a save dialog (default name `UniText Styles.asset`), builds a `StylePreset` from **every** entry of `MigrationMapping.TagVocabulary` (**31 entries**) and assigns it to `UniTextSettings.GlobalStylePreset`. It works in a project that never had TMP: it is the fastest way to a working tag set. It leaves out `<sprite>` (per-component catalog), `<quad>`, `<material>`, `<gradient>`; an entry that cannot be built (for example `link` when the shipped `LinkPreset` asset is not found) is skipped with a warning.

| Choice | Mobile |
|---|---|
| Keep all 31 vocabulary tags in the global preset | `LIMIT` — every registered rule is walked at each markup trigger in every text using the preset; delete rows your content never uses (the migration keeps the full table because runtime/localized text is never scanned) |
| Migrate `enableAutoSizing` to `AutoSize` | `LIMIT` — each rect-size change re-fits (layout stage); see [unitext-runtime-api.md](unitext-runtime-api.md) |
| `TextMeshPro` (3D) → `UniTextWorld` | `OK` (batched per sorting context); requires `Include World Shaders` before building |

## Tag map (`MigrationMapping.TagVocabulary`)

No tag is wired to an effect in a fresh project. Every row marked "Dashboard preset" exists only after you press the card above or register the same `Style.Tag(modifier, name, defaultParameter)` entries yourself ([unitext-components-setup.md](unitext-components-setup.md), recipe "Global tag vocabulary"; the master rule `unitext.md`, section "Tag vocabulary bootstrap"). The tag spellings are authored data in the preset.

| TMP tag | UniText tag | Modifier / rule | Default param | Registered by | Notes |
|---|---|---|---|---|---|
| `<b>` `<i>` `<u>` `<s>` `<strikethrough>` | same names (`s` and `strikethrough` both bind `StrikethroughModifier`) | `BoldModifier`, `ItalicModifier`, `UnderlineModifier`, `StrikethroughModifier` | — | Dashboard preset | `<b=700>` weight, `<b=700,f>` synthesize, `<b=700,r>` real face only |
| `<mark=#RRGGBBAA>` | `<mark>` | `HighlightModifier` | — | Dashboard preset | colour comes from the `Paint` configured on the Style entry; the **tag value is ignored** |
| `<sub>` `<sup>` | `<sub>` `<sup>` | `ScriptPositionModifier` | `"sub"` / `"super"` | Dashboard preset | OpenType `subs`/`sups` when present, otherwise synthesized |
| `<smallcaps>` `<lowercase>` `<uppercase>` `<allcaps>` | same, plus `<upper>`, `<lower>` | `SmallCapsModifier`, `LowercaseModifier`, `UppercaseModifier` (`allcaps` → uppercase) | — | Dashboard preset | |
| `<nobr>` | `<nobr>` | `NoBreakModifier` | — | Dashboard preset | |
| `<size=24>` `<size=150%>` `<size=+10>` | `<size>` | `SizeModifier` | — | Dashboard preset | same vocabulary: `24`, `150%`, `+10`, `-5` |
| `<color=#RRGGBB[AA]>`, named, `<color="red">` | `<color>` | `ColorModifier` | — | Dashboard preset | `#RGB/#RRGGBB/#RRGGBBAA` + 20 names (white black red green blue yellow cyan magenta orange purple gray lime brown pink navy teal olive maroon silver gold); alpha multiplies the component alpha |
| `<alpha=#80>` | `<alpha>` | `AlphaModifier` | — | Dashboard preset | `0.5`, `50%`, `#80`. **Reach differs**: TMP holds until the next `<alpha>`/`<color>`/`</color>`; UniText runs to `</alpha>` or the text end and multiplies existing alpha; nested tags do not compound |
| `<font="name">` | `<font=name>` | `FontModifier` | — | Dashboard preset | names a `FontFamily.name` in the component's `FontStack`, **not** a font asset; an unknown name falls back and logs a warning — rewrite the value |
| `<font-weight=700>` | `<font-weight>` (+ `<var>`) | `VariationModifier` | — | Dashboard preset | variable fonts only; a static font ignores it |
| `<align=left\|center\|right\|justified\|flush>` | `<align>` | `AlignmentModifier` | — | Dashboard preset | UniText values are Start/Center/End/Justify (+ Left/Right); rewrite `justified` and `flush` (flush = Justify + `LastLineAlignment = Justify`) |
| `<cspace=5>` | `<cspace>` | `LetterSpacingModifier` | — | Dashboard preset | `5`, `0.1em`; the old monospace flag is gone: use `<cwidth=auto>` |
| `<mspace=...>` | `<mspace>` (also `<cwidth>`) | `CharacterWidthModifier` | — | Dashboard preset | unitless = **pixels** in UniText vs font units in TMP; also `1em`, `0.5em`, `auto` — verify visually |
| `<indent=15%>` `<line-indent>` `<margin-left>` | same names | `IndentModifier` | — | Dashboard preset | left side only |
| `<line-height=...>` | `<line-height>` | `LineHeightModifier` | — | Dashboard preset | scale differs (default line height is `Scaled` 1.4 x font size) |
| `<br>` | `<br>`, `<br/>` | `LineBreakParseRule` (standalone rule, no modifier) | — | Dashboard preset | inserts a U+2028 soft break that wraps inside the paragraph; `\n` is a paragraph break |
| `<link="id">` | `<link=id>` | `ModifierGraphModifier` applying the shipped `LinkPreset` graph | — | Dashboard preset | `LinkModifier.LinkClicked(string)`; **`AutoOpenUrl` defaults to true** and calls `Application.OpenURL(primaryValue)` for any non-empty value — for in-game ids turn it off |
| `<sprite=name>` `<sprite index=n>` | `<sprite=15>` / `<sprite=15/>` (numeric key kept) | `SpriteModifier` + `InlineTagRule("sprite")` + `AssetSpriteProvider` | — | the sprite migration, per component (not in the preset) | per-component `UniTextSprites` catalog; Canvas text only — see [unitext-inline-media.md](unitext-inline-media.md) |
| `<quad=...>` | `<obj=name/>` | `ObjModifier` (`TagRule("quad")` if you keep the TMP spelling) | — | by hand (not in the preset) | register the image/object; asset-bound |
| `<gradient=name>` | none by default | `FillModifier` + `TagRule("gradient")` + a paint swatch | — | by hand | you create the Style entry and assign the swatch |
| `<material=name>` | `<mat>` (or keep `<material>` through `TagRule("material")`) | `MaterialModifier` | — | by hand | assign the replacement material; an **unconfigured** `MaterialModifier` suppresses the text it covers |
| `<noparse>` | `<noparse>` | `NoparseTagRule` (standalone rule) | — | by hand: `new Style { Source = new NoparseTagRule() }` or `AddRule` (not in `TagVocabulary`) | the tool classifies `noparse` as "no modifier"; the standalone rule exists |

Names UniText adds beyond TMP inside the same preset: `<var>`, `<cwidth>`, `<upper>`, `<lower>`. A tag outside TMP's own tag list was never markup to TMP and is not migrated.

### Tags with no equivalent

`<pos>`, `<space>`, `<voffset>`, `<rotate>`, `<width>`, `<page>`, `<margin>`, `<margin-right>` and `<style>`: **there is no UniText tag for these and no migration path.** The tool reports them; left in the text they render as literal characters, so the markup itself must be rewritten or removed. Do not assume a UniText tag with a similar name exists; decide per case and check [unitext-formatting-tags-quickref.md](unitext-formatting-tags-quickref.md) for effects that may fit the intent. Only two have a direct rewrite: `<style>` becomes the tag names of a `StylePreset`, `<margin-left>` becomes `<indent>`.

## TMP members → UniText members

| TMP member | UniText equivalent | Note |
|---|---|---|
| `text` | `Text` (serialized) / `SetText(...)` | auto-renamed |
| `fontSize` | `FontSize` | auto |
| `fontSizeMin` / `fontSizeMax` | `MinFontSize` / `MaxFontSize` | defaults 10 / 72 (TMP's differ) |
| `enableAutoSizing` | `AutoSize` | semantics differ (see differences) |
| `enableWordWrapping` / `textWrappingMode` | `WordWrap` | auto / manual |
| `font` (`TMP_FontAsset`) | `Font` (`UniTextFont`) or `FontStack` | migrated components point at the **stack** |
| `color`, `faceColor` | `color` | `Graphic.color`; alpha-only changes are free |
| `alignment`, `horizontalAlignment`, `verticalAlignment` | `HorizontalAlignment` + `VerticalAlignment` | Left/Right → `Start`/`End` (logical; use `Left`/`Right` for physical); Center/Top/Middle/Bottom/Justified exact; Flush → Justify + whole-text `AlignmentModifier` last-line justify; Geometry (H) → Center; Baseline/Geometry/Capline (V) → Middle |
| `margin` (L, T, R, B) | `Padding` (L, **B**, R, **T**) | order differs |
| `raycastTarget`, `maskable` | same `Graphic` members | carried |
| `fontStyle` flags | whole-text Bold, Italic, Underline, Lowercase, Uppercase, SmallCaps, Strikethrough; Superscript/Subscript → `ScriptPositionModifier` | Highlight is dropped: add `HighlightModifier` by hand |
| `fontWeight` | `VariationModifier` (`wght`) | lost on static fonts |
| `characterSpacing`, `wordSpacing`, `lineSpacing`, `paragraphSpacing` | whole-text `LetterSpacingModifier`, `WordSpacingModifier`, `LineHeightModifier`, `ParagraphSpacingModifier` | scales differ, check visually |
| `overflowMode` | `EllipsisModifier` / `TruncateModifier` (whole-text) | Masking, ScrollRect, Page, Linked: none |
| `richText` | none | opt out per component: `UseGlobalStylePreset = false` + no styles; protect spans with a `<noparse>` rule |
| `isRightToLeftText` | whole-text `DirectionModifier` (base direction is auto-detected by default, UAX #9) | |
| `maxVisibleCharacters`, `firstVisibleCharacter` | `RevealModifier` (`Front`) | see [unitext-animation-reveal-sequencer.md](unitext-animation-reveal-sequencer.md) |
| `textInfo` | `Buffers`, `ResultGlyphs`, `CaptureTextSnapshot()` | reported |
| `characterCount` | `CodepointCount` | codepoints, not UTF-16 chars |
| `ForceMeshUpdate()` | `SetDirty(flags)`; to read now: `Canvas.ForceUpdateCanvases()` / `MeasureText` | processing is deferred to the canvas pass |
| `GetPreferredValues(...)`, `preferredWidth/Height` | `MeasureText(new TextMeasureOptions{...})`, `PreferredHeight`, `GetMaxContentWidth()`, explicit `ILayoutElement` | `preferredWidth` does not compile on `UniText` |
| `renderedWidth/Height` | `ResultSize` | valid after the frame's canvas pass |
| `fontSharedMaterial`, `fontMaterial` | none; `MaterialModifier` per range | |
| `outlineColor/outlineWidth`, underlay, glow (`_OutlineColor`, `_OutlineWidth`, `_UnderlayColor`, `_UnderlayOffsetX/Y`, `_GlowColor`) | `StrokeModifier`, `ShadowModifier`, `GlowModifier` (whole-text or tagged) | see [unitext-effects-paint.md](unitext-effects-paint.md) |
| `colorGradient`, `enableVertexGradient` | `FillModifier` gradient paint | |
| `spriteAsset` | `UniTextSprites` via `AssetSpriteProvider` | |
| `styleSheet`, `textStyle` | `StylePreset` | |
| `autoSizeTextContainer` | `ContentSizeFitter` on the RectTransform | |
| `pageToDisplay`, `linkedTextComponent`, `parseCtrlCharacters`, `overrideColorTags` | none | |
| input field `onValueChanged.AddListener(h)`, `onSubmit` | `ValueChanged += h`, `Submitted += h` | C# events, not `UnityEvent` |
| input field `text`, `readOnly`, `caretPosition`, `isFocused` | `Text`, `ReadOnly`, `CaretPosition`, `IsActive` | `characterLimit` → `LengthLimitBehavior`; `contentType` → input filter + `PasswordBehavior`; `ActivateInputField` → focus through the EventSystem; `SetTextWithoutNotify` → `SetTextProgrammatic`; `UniTextEditable` is a `MonoBehaviour`, not a `Selectable`, so navigation/transition members need a `Selectable` of your own beside it |

## Behavior differences

| Topic | TMP | UniText |
|---|---|---|
| Rich text on/off | `richText` toggle per text | no toggle: a tag is live only if some `Style` (local, preset or global) registers it; text with no matching style shows tags literally. Per-component opt-out: `UseGlobalStylePreset = false`, `Style.Enabled = false`, `<noparse>`/`BackslashEscapeRule`/`CodeSpanRule` protection rules |
| Auto size | `enableAutoSizing` with min/max; `fontSize` reads the live size | `AutoSize` + `MinFontSize`/`MaxFontSize`; `FontSize` is ignored while on, read `CurrentFontSize`; word wrap never splits a word (shrinks to Min instead); optional `FitSteps` (tracking → glyph scale → line height budgets) before size reduction; windowed (very long) text renders at Min |
| Line height | font line metrics + `lineSpacing` | default `Scaled` 1.4 x font size (uniform rows); `Content` = tallest font per line (TMP-like) |
| Alignment | physical Left/Right | `Start`/`End` follow paragraph direction; `Left`/`Right` physical |
| Fonts | `TMP_FontAsset` + material per font | `UniTextFont` reads OpenType directly; `FontStack` families with names and per-family `preferredLanguage`; shared atlas; automatic OS fallback; system font as default primary |
| Materials | per-text material instance; presets | shared materials; looks are layers (stroke/shadow/glow/fill) or `MaterialModifier` |
| Sprite assets | `TMP_SpriteAsset`, `<sprite>` | `UniTextSprites` + `SpriteModifier` (Canvas); `<obj>` for prefabs/images |
| Links | `OnPointerClick` + `TMP_TextUtilities.FindIntersectingLink`; no auto open | `LinkModifier.LinkClicked/LinkEntered/LinkExited`; `AutoOpenUrl` default true opens URLs; needs raycast target and the interactive pipeline |
| Layout reads | `preferredWidth/Height`, `textInfo` valid after `ForceMeshUpdate` | processing deferred to the canvas pass; `MeasureText`/`GetHeightForWidth` for immediate numbers; `preferredWidth` only via `ILayoutElement` |
| Input events | `UnityEvent`s | C# events |
| Setting text | `SetText(string, args)` formatting overloads | no formatting overloads: format yourself and feed a span/`StringBuilder` |
| Typewriter | `maxVisibleCharacters` | `RevealModifier.Front` (`UnitValue` percent or absolute count; `Unit` = cluster/word/line/paragraph) |
| Dropdown | `TMP_Dropdown` | `UniTextDropdown` exists (menu item + prefab); the migration tool does not convert `TMP_Dropdown` |
| Mixed scripts / emoji | fallbacks via font-asset tables | families in a stack + OS fallback; emoji via `UniTextColorFont` or the platform emoji cascade |

## Recipes

### Migrate a TMP project (order that works)

1. Commit; set Asset Serialization to Force Text; create a short-lived branch.
2. Open `Tools -> LightSide -> UniText -> Migration`, press the Dashboard "Create Style preset" card (or register your own vocabulary first).
3. Font Mapping: map every TMP font; check the logged dropped fallbacks.
4. Components: `Migrate simple components`, then review Moderate/Complex findings by hand; fix text that uses the no-equivalent tags (rewrite the markup).
5. Scripts + asmdefs: replace `Unity.TextMeshPro` with `LightSide.UniText` (+ `LightSide.Core`) in asmdefs **before** applying script rewrites; apply, compile, run the compile-error rename pass; port the "reported" members by hand.
6. `Verify`, then Cleanup (materials, curves, rich-text assets). Keep `using TMPro;` only while a TMPro type without a counterpart remains; remove TextMesh Pro last.

### Port a TMP script by hand

```csharp
// not compiled
// before                                              // after
using TMPro;                                           using LightSide;               // + using UnityEngine.UI; for ILayoutElement
[SerializeField] TextMeshProUGUI title;                [SerializeField] UniText title;
title.text = "Hi"; title.fontSize = 24;                title.Text = "Hi"; title.FontSize = 24;
title.enableAutoSizing = true;                         title.AutoSize = true;
title.fontSizeMin = 12; title.fontSizeMax = 40;        title.MinFontSize = 12; title.MaxFontSize = 40;
title.alignment = TextAlignmentOptions.TopRight;       title.HorizontalAlignment = LightSide.HorizontalAlignment.End;
                                                       title.VerticalAlignment   = LightSide.VerticalAlignment.Top;
var w = title.preferredWidth;                          var w = ((ILayoutElement)title).preferredWidth;   // or title.GetMaxContentWidth()
title.ForceMeshUpdate(); var h = title.preferredHeight;   Canvas.ForceUpdateCanvases(); var h = title.PreferredHeight;   // or MeasureText
title.maxVisibleCharacters = n;                        // RevealModifier.Front = UnitValue.Absolute(n)
title.margin = new Vector4(l, t, r, b);                title.Padding = new Vector4(l, b, r, t);          // order differs
```

Gotcha: alignment *reads*, `fontStyle`, spacings, `overflowMode`, `richText`, `textInfo`, `GetPreferredValues` and gradient/outline/material members are reported and ported by hand.

### Register the TMP-compatible tags in code (no Migration window)

Goal: make TMP-style markup work in a project that never ran the tool. Setup: per-component styles shown here; for the whole project put the same entries in the global preset (recipe "Global tag vocabulary" in [unitext-components-setup.md](unitext-components-setup.md)).

```csharp
// not compiled
void RegisterTmpTags(UniText text)
{
    var s = text.Styles;
    s.Add(Style.Tag(new BoldModifier(), "b"));
    s.Add(Style.Tag(new ItalicModifier(), "i"));
    s.Add(Style.Tag(new UnderlineModifier(), "u"));
    s.Add(Style.Tag(new StrikethroughModifier(), "s"));
    s.Add(Style.Tag(new StrikethroughModifier(), "strikethrough"));
    s.Add(Style.Tag(new ColorModifier(), "color"));
    s.Add(Style.Tag(new AlphaModifier(), "alpha"));
    s.Add(Style.Tag(new SizeModifier(), "size"));
    s.Add(Style.Tag(new ScriptPositionModifier(), "sub", "sub"));      // default parameters from TagVocabulary
    s.Add(Style.Tag(new ScriptPositionModifier(), "sup", "super"));
    s.Add(Style.Tag(new LetterSpacingModifier(), "cspace"));
    s.Add(Style.Tag(new LineHeightModifier(), "line-height"));
    s.Add(new Style { Source = new LineBreakParseRule() });            // <br>, standalone rule: no modifier
}
```

Result: `"<color=#FF0000>HP</color> <b>low</b>"` renders styled. Gotcha: each added style is a structural change (re-parse) and a rule walked at every markup trigger — register once at creation, only the tags the text uses.

### Keep one text literal (rich text off)

`label.UseGlobalStylePreset = false;` with empty `Styles`/`StylePresets` renders `<b>` literally; or register `NoparseTagRule`/`BackslashEscapeRule` through `AddRule` to protect only some spans.

## Pitfalls

1. **A migrated project renders tags literally until a vocabulary exists** — nothing is registered by migrating components; create the Dashboard preset (or your own) before judging results.
2. **Keep TextMesh Pro installed until the last finding is handled**; remove it last. Mapping never deletes TMP assets.
3. **Force Text is mandatory**; the scan is refused otherwise.
4. **Asmdef order**: reference UniText from the asmdef before running script rewrites, or the rewritten code does not compile.
5. **Dropped fallbacks show boxes** where a fallback font without a UniText counterpart used to supply CJK/emoji; read the log after the Fonts stage.
6. **`<alpha>` reach, `<mspace>` units, `<font>` meaning, `<mark>` colour, `<align>` values, `Left/Right` alignment, `Padding` order** differ from TMP; the tool reports some, but verify text visually.
7. **No-equivalent tags** (`pos`, `space`, `voffset`, `rotate`, `width`, `page`, `margin`, `margin-right`) stay as literal text.
8. **`<link>` auto-opens**: `AutoOpenUrl` defaults to true, so id-style values reach `Application.OpenURL` unless you turn it off.
9. **An unconfigured `MaterialModifier` suppresses its text** (the `<material>` tag is manual).
10. **Input fields migrate as one composite or not at all**; `TMP_Dropdown` is never converted.
11. **Prefab-override carry-over, UnityEvent rebinding and open-scene save prompts** are handled by the 3.30.0 tool; commit before each run anyway.
12. **Mobile cost sits in the preset size, auto-size layouts and interactive fields** (the `LIMIT` rows in the choices table), not in the act of migrating.

Doc-vs-code discrepancies a developer could be misled by:
- Migration docs state `TMP_Dropdown` has no equivalent; `UniTextDropdown` ships with a menu item, but the tool still does not convert `TMP_Dropdown`.
- Migration docs mention a `<letter-spacing>` tag "supplied by the preset"; `TagVocabulary` has no such key (it has `cspace`, `cwidth`, `var`, `upper`, `lower`).
- Migration docs say `<noparse>` has "no modifier"; a standalone `NoparseTagRule` exists but is not part of `TagVocabulary` — add it by hand.
- The getting-started text says shipped prefabs wire common tags; they ship empty (`styles: []`) and no global preset, so a TMP-migrated project needs the Dashboard card.

## Unverified

- A UniText replacement for TMP `<voffset>`, `<rotate>`, `<pos>`, `<space>`, `<width>`, `<page>`, `<margin>`: no tag exists; any suggested substitute would be a guess.
- Exact wording/location of Project Settings pages beyond the tooltips quoted in source (the Include World Shaders path "Project Settings > LightSide > Core > Rendering" is confirmed by the build error text).
- Whether world text with inline `<sprite>` can work without the Canvas pipeline (the tool keeps such `TextMeshPro` objects on TMP; no other source was read).
