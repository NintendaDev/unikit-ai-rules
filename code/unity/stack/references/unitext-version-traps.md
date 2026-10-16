# UniText — Version history traps and renamed APIs

> **Base path:** `<UniTextRoot>` is the folder of the UniText package — the one whose `package.json` has `"name": "media.lightside.unitext"` (find it with `Glob **/media.lightside.unitext/package.json`; it may sit under `Packages/` or `Library/PackageCache/`). Never hard-code its location. Its `CHANGELOG.md` is the authority for every version below.
> See also: [unitext-tmp-migration.md](unitext-tmp-migration.md), [unitext-markup-system.md](unitext-markup-system.md), [unitext-components-setup.md](unitext-components-setup.md), [unitext-runtime-api.md](unitext-runtime-api.md), [unitext-fonts.md](unitext-fonts.md), [unitext-effects-paint.md](unitext-effects-paint.md), [unitext-animation-phase.md](unitext-animation-phase.md), [unitext-animation-reveal-sequencer.md](unitext-animation-reveal-sequencer.md), [unitext-interaction-links.md](unitext-interaction-links.md), [unitext-input-fields.md](unitext-input-fields.md), [unitext-emoji.md](unitext-emoji.md), [unitext-inline-media.md](unitext-inline-media.md), [unitext-layout-documents.md](unitext-layout-documents.md), [unitext-3d-text.md](unitext-3d-text.md), [unitext-performance-mobile.md](unitext-performance-mobile.md)

---

This file is written for package version 3.30.0. Use it when code, a snippet, a blog post or an AI answer mentions a name or behaviour from an older release: look the name up in section 1, then read the behaviour changes of the area (sections 2–11). A version in a table is the `## [x.y.z]` header that encloses the CHANGELOG line. Most 2.x APIs were reworked in the 3.0 rewrite, so a 2.x name usually does not exist at all. Tag spellings in this file are historical or conventional: a tag works only after a style registers it (picker preset, `StylePreset` or `Style.Tag(...)`); see the master rule section "Tag vocabulary bootstrap" ([unitext.md](../unitext.md)) and [unitext-markup-system.md](unitext-markup-system.md).

## 1. Old name → current name (lookup)

| Old name or markup | Gone in | Use now |
|---|---|---|
| `<gradient>`, `<outline>` tags; `GradientModifier`, `OutlineModifier`, `IGradientProvider`, `UniTextGradients`, `UniTextSettings.Gradients` | 3.0.0 | paint layers: `FillModifier`, `StrokeModifier`, `ShadowModifier`, `GlowModifier`, `InnerShadowModifier`; `UniTextPaints`, `UniTextSettings.Paints`; register your own tag names |
| `WobbleAnimationModifier` (`speed`) | 3.0.0 | `WaveModifier` (`frequency`) |
| `UniTextDirtyFlags` (`Color`, `Alignment`, `FontSize`, `Sorting`, `LayoutRebuild`) | 3.0.0 | `UniTextDirty` (`Mesh`, `Positions`, `Layout`, `Text`, `Font`/`Direction`) |
| `UniTextBase.HitTest`, `HitTestScreen` | 3.0.0 | `HitTestRange`, `HitTestCaret` |
| `TextClicked(TextHitResult)`, `RangeClicked`/`RangeEntered`/`RangeExited`, `IsHoveringRange`, `CurrentHoverRange` | 3.0.0 | `TextClicked(TextPointerEvent)`; interactive-modifier `Events` (`Activated`, …) |
| `IParseRule` | 3.0.0 | abstract class `ParseRule` |
| per-tag rule classes `BoldParseRule`, `ColorParseRule`, `OutlineParseRule`, `GradientParseRule`… | 2.1.0 (made `internal [Obsolete]`) | `TagRule` / `Style.Tag(modifier, "name")` |
| static `BeforeProcess` / `MeshApplied` / `AfterProcess` | 3.0.0 | per-component `FrameUpdated` / `LayoutCommitted` |
| `UniTextArrayPool<T>`; `RangeEx.WholeText`, `IsWholeText` | 3.0.0 | `ArrayPool<T>`; `RangeEx.All`, `IsAll` |
| `UniTextPhaseDriver`, `IPhaseDriven`, per-modifier Animator handlers | 3.2.0 | `UniTextDriver` clip on `Phase`, or the modifier's own `Clock` (3.9.0); `ModifierFieldsAnimationHandler` |
| `RevealModifier.Fill`, `VisibleClusters` | 3.2.0 | `Front` (`UnitValue.Percent(50f)` / `UnitValue.Absolute(12f)`; markup `<reveal=fade,50%>`) |
| bare `EasingType` assigned to an easing field | 3.2.0 | `Ease.Of(EasingType.CubicOut)` |
| `RangeStateEffect`, `InteractiveModifier.Effects`, `*Driver`, `UniTextEffects.For`, `RangeEffectClock`, `ModifierProperty`, `EffectProperty`, `GetProperty` | 3.2.0 | `RangeStateRule`, `Rules`, `*Playback`, `UniTextRanges.For`, `PlaybackClock`, `ParameterDescriptor`, `OwnedParameter`, `GetParameter` |
| `ModifierRule`, `ParameterRule`, `RuleValue`, `RangeValueSource`, `IModifierRuleWeightReceiver` | 3.8.0 | `RangeStateRule` with `Changes` (`ParameterChange.SetTarget(modifier, Param, value)`) |
| `ModifierNodeId` | 3.8.0 | `StateNodeId` |
| `InteractiveModifier { RangeType = … }`, `RangeStyler`, `StateHighlightStyler`, `SpoilerCoverStyler`, `TextHighlighter`, `DefaultTextHighlighter` | 3.0.0 | interactive rules + highlight modifiers; shipped `LinkPreset` / `SpoilerPreset` graphs |
| links/spoilers deriving from `InteractiveModifier`; `Interaction` event; `RangeInteractionChannel`; `UniTextInteractions.Get<T>`; Pass Through; `RangeAction` family (`OpenUrlAction`…); `RangeChannel<T>`, `PayloadType`, `As<T>` | 3.8.0 | `InteractiveModifierBase`, `Events`, `RangeInteractionEvents`, `RoutingProfile` + `Focusable`; handle `Events.Activated`/`ContextRequested`, override `HandleDefaultAction`; `interaction.Payload.Get<T>()` |
| `UniTextWorldRaycaster` (`BlockingMode`) | 3.8.0 | `WorldPointerRaycaster` (`Blocking`) |
| `TextLongPressProgress`; `UniTextInteractions.MoveFocus(bool)`; `PrepareForParallel` on `IUniTextResolver`; `SelectionHitTest.FindLineAtLocalY` | 3.12.x–3.20.0 | `UniTextBase.PointerLongPressProgress`; `MoveFocus(RangeNavigationDirection, …)`; (removed); `FindLineAtLocalPoint` |
| `PrefabTextContextMenu`, `NativeTextContextMenu`, `ButtonContextMenuItem`/`Cut…ContextMenuItem`, `ContextMenuAction`/`Capabilities`, `UniTextContextMenu.RequestAction`, `PrefabMagnifier`, `UniTextMagnifier` | 3.0.0 era–3.20.0 | `TextCommand` + `ContextMenuItem{Target,Command,Label,WhenUnavailable}`, `TextContextMenu.Show(...)`, `NativeMagnifier`, your own `IMagnifier` |
| `AddBehavior`/`RemoveBehavior`/`AddBehaviorPreset`, `ValidationStatus.Invalid/Pending`, `AutoConvert`, `TextFormattingBehavior.Commands/ClearFormattingKey/Toggle(...)` | 3.x | `Behaviors` list (generated accessor), `ValidationState.InvalidStatus/PendingStatus`, `MarkupVisibility`, `Shortcuts` + `TextCommand`s |
| `UniTextNativeInput.ShowKeyboard/HideKeyboard/SetEnabled/CompleteComposition/CancelComposition`, static `KeyDown`/`TextInput`/… events, `RegisterBackend(INativeInputBackend,int)` | 3.x | the native input **session** model (`OpenInput`/`QuiesceInput`/`CloseInput`/`AbortInput`); `Defocus()` instead of hide-keyboard |
| `<cspace=…,true>` second token; `LetterSpacingModifier.Monospace` | 3.2.0 | `<cwidth=auto>` (`CharacterWidthModifier`) |
| shaders `UniText/SDF`, `UniText/Lit/SDF`, `UniText/RangeDecoration`, `UniText/UI/RangeDecoration` | 3.2.0 | `LightSide/UI`, `LightSide/World`, `LightSide/World Lit` (a `Shader.Find` of an old name breaks) |
| `LightSideMaterials` property/bool forms | 3.20.0 | `LightSideMaterials.Ui(tier)`, `World(lit, tier)` |
| `MaterialModifier` compose modes `Replace/Over/Under`, `emojiMaterial` slot; `OnWriteGlyphUV`, `UseVirtualWriter` | 3.0.0 / 3.20.0 | `Replace`/`Keep`; assign `glyphDataWriter` in `OnEnable` |
| `EffectModifier.EnqueueEffectQuad`, `ApplyOwnRequests`, `EffectPacking` | 3.0.0 | `EnqueueDuplicate` + abstract `OnEmitQuad`, `OnFlush` |
| `LayoutSettings.lineSpacing`; `TextProcessor.GetPreferredHeight(…, lineSpacing)`; `TextLine.advance`, `advancePrefix` | 3.20.0 | `LineHeightModifier`; font size only; `baseline`, `top`, `bottom` |
| `BaseDirection`, `TextJustify`, `LastLineAlignment`, `OverEdge`, `UnderEdge`, `LeadingDistribution` on the component | 2.6.0 | `DirectionModifier`, `AlignmentModifier`, `TextBoxTrimModifier`, `LineHeightModifier` |
| `Style.Rule`; `RangeRule` data | 2.1.0+ | `Style.Source`; `FixedRangeSource` (old serialized data still loads); builders `Style.WholeText/Range/Tag` |
| `StylePreset.styles` field, mutation methods, `StylePreset.Changed` | 2.2.0 / 3.3.0 | `Styles` list, `DeltaChanged` |
| `UniTextFontStack.FindFontForCodepoint`; Default Font Stack editor setting | 2.5.0 | `UniTextFontProvider.FindFontForCodepoint`; no font = OS font |
| `UniTextFont.CreateRuntime()`, `BuildRuntime(byte[])`; subclassing `UniTextColorFont`/`UniTextFontVariant`/`UniTextSystemFont` | 3.20.0 | `UniTextFont.CreateFontAsset(byte[])`; the three types are `sealed` |
| `WebGLEmoji.TryRenderEmoji*` (single-emoji APIs) | 3.20.0 | assign a `UniTextColorFont` or use the shaper (WebGL builds only) |
| `PrefabMediaWrapper`, `InlineObject.Prefab` | 3.8.0 | `ObjectMediaWrapper`, `InlineObject.Source` |
| inline-media entry `width` + `height`, `bearingX` + `bearingY` | 2.11.0 | `size` (Vector2), `bearingOffset` (customised values reset: re-enter them) |
| `GlyphQuad`, `LanguageMatching.Matches`, `UniTextSettingsChangedHandler` | 3.8.0 | `UniText.Glyph`, `UniText.LanguageMatches`, `SettingsChangedHandler` |
| `InputCaretRenderer.CaretWidthRatio` as a ratio | 3.10.0 | a percent value |
| `<wave=8,2,0.25>` | 3.10.0 | `<wave=0 8,2,0.25>` (Amplitude is a `Vector2`) |
| `<u offset=3px>` | 3.10.0 | offset is a plain em fraction, for example `<u offset=0.1>` |
| menu paths `Assets > Create > UniText`, `Tools/UniText…` | 3.0.0 / 3.8.0 | `Assets > Create > LightSide > UniText`, `Tools > LightSide`, `GameObject / Add Component → LightSide → UniText`; editor scripts that execute menu items by path break |

## 2. Package, assemblies, saved-asset migration

| Version | Change | What to do |
|---|---|---|
| 3.0.0 | shared infrastructure split into `media.lightside.core`; types moved to Core keep `namespace LightSide` | add an assembly reference to `LightSide.Core` where a moved type is named |
| 3.10.0 | `CursorType` moved to `LightSide.Core` | reference the Core assembly to name `HoverCursor`'s type |
| 3.0.0 → 3.x | saved assets of 2.x are migrated automatically in the interactive editor (no menu); `ProjectSettings/LightSide/MigrationLedger.json` and `Library/LightSide/MigrationReport.txt` record it; **batch mode does not migrate** | open the project once in the interactive editor after an upgrade and commit the changed assets; code is never rewritten |
| 3.0.0 | auto-migrations of serialized data: `Outline → Stroke`, `Gradient → Fill`, `Wobble → Wave`, gradient providers → paint providers, `UniTextGradients → UniTextPaints`; `UniTextFontStack` `fonts`+`variants` → `families[]` (2.0.0) | check migrated styles; code still has to be updated by hand |
| 3.x | UniText depends on a minimum `media.lightside.core` version (raised from 3.0.0 to 3.1.0 in a 3.x release) | keep `media.lightside.unitext` and `media.lightside.core` on matching versions |

## 3. Markup, tags, styles, parameters

| Version | Change | What to do |
|---|---|---|
| 2.1.0 | `Style.WholeText/Range/Tag` builders; per-tag parse-rule classes made `internal [Obsolete]` | write `Style.Tag(new XModifier(), "tag")` |
| 2.1.9 / 2.12.6 | `<br>` appeared as a hard break, then became a **soft** line break (U+2028) | `\n` starts a paragraph, `<br>` stays in the same paragraph (no paragraph spacing) |
| 2.2.0 | global style preset (`UniTextSettings.GlobalStylePreset`) and per-component `UseGlobalStylePreset` | project-wide vocabulary = one `StylePreset` in the global slot |
| 3.0.0 | **no built-in tags:** `<gradient>` / `<outline>` removed (kept for a time only as deprecated parse rules for old markup); `IParseRule` → `ParseRule`; Markdown markers follow CommonMark flanking (`2 * 3`, `snake_case_name` stay literal); `Style.Enabled` | register tags yourself; see the master rule section "Tag vocabulary bootstrap" |
| 3.2.0 | every modifier field is a parameter (`Param`, `Ranges()`, `Own`); `<b #label>` anchors, `RangeQuery`, `OwnedParameter`; an unreadable tag value falls back to the modifier's own setting | custom modifiers must declare `[Parameter]` fields |
| 3.2.0 | "effect" vocabulary renamed to "rule" in interaction/animation (section 1) | rename identifiers |
| 3.8.2 | nested parameter groups `(a;b);c`; a fully parenthesized segment is now a nested list | quote or escape a literal parenthesized value |
| 3.20.0 | `[GenerateParameters]` is **mandatory** for modifiers with `[Parameter]` (analyzer UTP004); `ParameterDescriptorSet` replaces `ParameterDescriptor[]` | add the attribute; build descriptors with the set constructor |
| 3.20.0 | markup numbers beyond ±10,000,000 or `NaN` count as absent | clamp generated values |
| 3.20.0 | modifiers stay enabled across parses (no per-parse `OnDisable`/`OnEnable`) | reset per-parse state in `BeforeApply` |
| 3.30.0 | `ParseRule.IsCompleteMatch` decides what editable text hides (`closeStart = closeEnd = -1` for close-less syntaxes); `LatexTextRule` reads braces as grouping | custom rules in editable text must implement it; write `\{` `\}` for literal braces |

## 4. Layout, line height, auto size, large text

| Version | Change | What to do |
|---|---|---|
| 2.3.0 | `HorizontalAlignment.Justify` | – |
| 2.6.0 | paragraph properties removed from the components | use the modifiers (section 1) |
| 2.6.1 | default line height `Scaled` × 1.4 plus project-wide Text Defaults | content authored before 2.6.1 grew to the tallest font per line; a bare `LineHeightModifier` is still `Content` mode |
| 2.7.0 | `NoBreakModifier`, `ParagraphSpacingModifier`, `TruncateModifier`; 2.12.8: `<nobr>` lets wrap happen right before and after | register tags (picker) |
| 3.1.0 | Auto Size `FitSteps`; justification spacing budgets; line height follows the largest size on the line; negative paragraph spacing honoured | – |
| 3.2.0 | fit steps work without word wrap | – |
| 3.3.0 | Auto Size faster and exact (fractional `CurrentFontSize`); indents/list margins count in the fit width; ellipsis marker width reserved under Auto Size | – |
| 3.8.0 | text longer than `VirtualizationThreshold` (16,384 chars) **virtualizes itself** (breaking); Auto Size no longer throws on it (uses Min); `UniTextDocumentView` for any Canvas text; resolvers run on the main thread once per source change | supply a viewport; indices become window-relative |
| 3.9.0 | text scrolls only inside something that clips it; an overflowing axis under a clip aligns to the start edge (refined in 3.20.0) | – |
| 3.9.2 | **Auto Size keeps every word whole** (breaking): a wide word shrinks to Min instead of splitting | use a fixed `FontSize` for break-anywhere |
| 3.10.0 | wide words spend fit steps before the font shrinks | – |
| 3.12.0 | `GetMinContentWidth`/`GetMaxContentWidth`/`GetHeightForWidth` | – |
| 3.20.0 | `SetText` with identical text is a **no-op** (breaking); `UniText` is no longer an `ILayoutController`; plain text under `RectMask2D` keeps its alignment; `LayoutSettings.lineSpacing` and `TextLine.advance` removed | force a pass with `SetDirty`; use `LineHeightModifier` |
| 3.30.0 | `TextOverEdge.Ink` / `TextUnderEdge.Ink`; `AlignmentModifier` aligns tables as a whole; paragraph spacing opens below tables; `LineGapModifier`, LaTeX list/size/alignment/spacing rules; edits to a `SetDocument` rope show immediately | – |

## 5. Paint, effects, shaders, materials

| Version | Change | What to do |
|---|---|---|
| 3.0.0 | unified paint system; 2.x grammars `<outline=color-or-gradient,dilate,shape,angle>` and `<shadow=dilate,#color,offsetX,offsetY,softness>` replaced by `paint,width,align,softness,…` and `paint,offset,blur,spread,…`; gradients are per-pixel (ramp atlas) rather than per corner | rewrite stored markup and strings |
| 3.2.0 | shaders renamed (`LightSide/UI`, `LightSide/World`, `LightSide/World Lit`); custom-shader preludes `LightSide_Custom.cginc` / `LightSide_Custom-URP.hlsl`; atlases are global bindings that must **not** be in `Properties`; text, highlights, underlines, shapes and Lottie share one Canvas material | old custom shaders stop compiling: port them from the shipped templates |
| 3.2.0 | **255 painted ranges per paint layer per text**; `Spread` (Clamp/Repeat/Mirror) on swatches | extra ranges lose their paint |
| 3.5.0 | `ColorGlyphs` policy on every effect (Shadow and Glow apply to emoji by default); sprites became glyphs of `SpriteFont` | set `ColorGlyphs = Skip` per range to opt out |
| 3.12.0 | `LightSideResolveGlyphCoverage` calls gain four arguments; **Include World Shaders** setting, off in new projects | update custom text shaders; turn the setting on before building world text |
| 3.20.0 | **shader tiers** (`Text`, `StyledText`, `UnitedText`, `Full`); texts or parts of a text in different tiers do not share a draw call; `LightSideMaterials.WarmUpUi`; `UnionModifier` is opt-in (joined letters no longer automatic); custom shaders need only `_SrcBlend`/`_DstBlend` for layer blends | warm the tiers you use; add `UnionModifier` where joins matter |
| 3.30.0 | `PaintSwatch.LinearGradient(name, angle, stops)`; gradient banding fixed with dither on Canvas and unlit world text | – |

## 6. Animation and reveal

| Version | Change | What to do |
|---|---|---|
| 3.0.0 | `WobbleAnimationModifier` → `WaveModifier`; 11 glyph animations as pure functions of `Phase`; **Animator field support is opt-in** (`UniTextAnimationBridge`) | add the bridge and a handler to animate fields from an Animator |
| 3.2.0 | `UniTextPhaseDriver` removed; `GlyphParamModifier.ParseParams` → `ResolveParams`; animation inputs resolve per range; reveal `Fill`/`VisibleClusters` → `Front`; easing `Ease` structs; reveal animates out when `Front` recedes (`HideHandler`, `Duration 0` for instant) | rewrite custom modifiers to `[Parameter]` + `[GenerateParameters]` |
| 3.3.0 / 3.3.1 | reveal `Pivot` is a normalized `Vector2`; per-frame writes of `Phase`/`Front`/`Progress`/driver values rebuild only the mesh | custom modifiers should use `MarkParamsDirty` |
| 3.5.9 | `Back`/`Elastic` easing finally overshoots; rule weight no longer clamped to 0–1; `Incremental`/`Yoyo` repeat modes | – |
| 3.8.0 | `RangeStateRule` is the one rule type with `Changes`; transient modifier templates → permanent Composite siblings with a transparent `Tint` | keep feedback layers in the graph with an alpha-0 tint |
| 3.9.0 | **phase-driven modifiers run on their own `Clock` (default `Scaled`)**: a bare `<wave>` animates without a driver | set `Clock = PlaybackClock.Manual` before feeding `Phase` yourself, or it advances twice |
| 3.10.0 | `WaveModifier.Amplitude` is a `Vector2` | rewrite `<wave=8,2,0.25>` to `<wave=0 8,2,0.25>` in strings, localization and code |
| 3.12.0 | `MarqueeModifier` (Canvas only) | – |
| 3.20.0 | idle reveal styles no longer keep the editor redrawing; `GlitchModifier.Params` no longer public | – |
| 3.30.0 | 3D motion modifiers and reveal handlers (module) | [unitext-3d-text.md](unitext-3d-text.md) |

## 7. Interaction, selection, editing

| Version | Change | What to do |
|---|---|---|
| 3.0.0 | renderer became an editor: `UniTextSelectable`, `UniTextEditable`, clipboard, IME, native input; 2.x had none of this | – |
| 3.8.0 | `InteractiveModifierBase` introduced; a `LinkModifier` or `SpoilerModifier` created in **code has no default feedback**; `UniTextWorldRaycaster` → `WorldPointerRaycaster`; pointer routing profiles and `LightSideInputModule` | use the shipped `LinkPreset` / `SpoilerPreset` graphs or build the feedback rules |
| 3.8.0 | copy/paste size cap of 1,000,000 chars removed | attach `LengthLimitBehavior` for limits |
| 3.12.0 | text with interactive ranges on the same GameObject as a Button/Toggle no longer errors; that Selectable owns keyboard/gamepad focus | – |
| 3.20.0 | context menus built from commands; empty menu/handles prefab slot now presents the project prefab (no menu: empty `Commands`; no handles: `SelectionHandles = none`); new projects present the system menu/loupe on phones, upgraded projects keep the Unity-UI menu until changed | review the menu setup after upgrading |
| 3.x | `TextChanged`/`VisibleText` follow IME composition; input fields scroll via the text component (`DocumentTop`/`DocumentLeft`), not by moving the `RectTransform`; `PlaceholderDecorator` keeps its GameObject active | read `Text` for source, `VisibleText` for plain semantics |
| 3.x | copying empty text clears the clipboard; Android keyboard-visible callbacks fire when the keyboard is fully up (API 11+) | – |

## 8. Fonts, atlas, memory

| Version | Change | What to do |
|---|---|---|
| 2.0.0 | Zstd-compressed font data (level 22), `GlyphAtlas` (`Texture2DArray`, 64/128/256 tiles, LRU), word segmentation for SE-Asian scripts, `FontFamily[]` stacks, `UniTextWorld` | – |
| 2.2.x | `Font` property, `FontModifier`, named families; `fonts`/`variants` lists replaced by `FontFamily[] families` | – |
| 2.5.0 | Default Font Stack setting removed (no font → OS font); `UniTextSystemFont`, `UniTextFontVariant`, system fallback, per-axis defaults | assign a font explicitly for consistent look |
| 2.10.0 | GPU glyph rasterization where compute exists (CPU fallback e.g. WebGL); no CPU atlas copy | – |
| 3.3.0 | **Font Memory Mapping**: font bytes in a hidden sub-asset, on disk in players, memory-mapped; assets convert on first editor load after the upgrade; AssetBundle/Addressables deliver fonts on demand | commit the converted assets |
| 3.8.0 | atlas size and precision settings; GLES3 without half-float render targets supported | – |
| 3.20.0 | `UniTextColorFont`, `UniTextFontVariant`, `UniTextSystemFont` are sealed; `CreateRuntime`/`BuildRuntime` removed; `UniTextFontEditorUtility.Subset/ReplaceFontData`; subsets made by older versions lack OpenType features, names and `.notdef` | re-create old subsets |

## 9. Emoji and inline media

| Version | Change | What to do |
|---|---|---|
| 2.1.1 | emoji inside a `FontModifier` range used to be `.notdef`; they now always use the emoji font | – |
| 2.2.0 | `SpriteModifier`, `UniTextSprites`, `UniTextObjects`, `InlineTagRule` (void tags need no `/>`) | – |
| 2.11.0 (breaking) | entry `width`+`height` → `size`, `bearingX`+`bearingY` → `bearingOffset` | re-enter customised values |
| 3.5.0 | sprites are glyphs of `SpriteFont` instead of child `Image` objects: they work in `UniTextWorld`, obey layer order, accept layer effects, need no Read/Write; colour glyphs were drawn 1–2 % too small (fixed) | custom wrapper-based media derive from `InlineObjectModifier<TEntry,TWrapper,TOverride>` |
| 3.5.6 (breaking) | inline media `Pivot` anchors the content in its box; default (0,0) pins to bottom-left | set (0.5, 0.5) to restore centring |
| 3.8.0 (breaking rename) | `PrefabMediaWrapper` → `ObjectMediaWrapper`, `InlineObject.Prefab` → `Source`; inline scene objects (`InlineObjectMode.Existing`) | rename |
| 3.20.0 | `UniTextColorFont` renders on WebGL (and replaces the browser's emoji when assigned); `Hide()` also hides inline Clone objects | – |
| 3.30.0 | `UniText3D` shows emoji flat or as stickers | – |

## 10. Runtime, rendering, platforms

| Version | Change | What to do |
|---|---|---|
| 3.0.1 | `UniTextWorld.Standalone` | – |
| 3.8.0 | menus consolidated under `LightSide`; world text batches with shapes; Android GLES3 without half-float RT supported | scripts that execute menu items by path break |
| 3.10.1 | text under `RectMask2D` several times cheaper; per-frame garbage from large virtualized text fixed | – |
| 3.12.0 | WebGPU; fewer shader variants; less garbage when toggling many texts; **Include World Shaders** (new projects OFF) | enable the setting for any build with `UniTextWorld` |
| 3.20.0 | alpha-only `color` change = no rebuild; changing text makes no garbage; hidden world text is free; array pools have no size budget (10 s idle retention) | use `Hide()` after a fade-out |
| 3.20.0 | `WarmUpUi`; `Shaper` is static; `UniText` no longer `ILayoutController` | call `WarmUpUi` at boot |
| 3.30.0 | UniText 3D module, LaTeX changes, TMP migration compile-error rename pass | – |

## 11. TMP migration value differences (traps in converted content)

| Item | Difference |
|---|---|
| `<align=justified>` / `<align=flush>` | become `Justify`; flush = `Justify` + `AlignmentModifier.LastLine = Justify` (TMP Left/Right → `Start`/`End`) |
| `<alpha>` | runs to `</alpha>` and **multiplies**; TMP holds the value until the next tag |
| `<font=name>` | names a font-stack family, not a TMP asset |
| `<mark>` | the value is ignored; the look lives on the style |
| `<mspace>` | bare numbers read as pixels |
| TMP margins (L, T, R, B) | `Padding` (L, B, R, T) |
| `maxVisibleCharacters` / `firstVisibleCharacter` | no counterpart: use `RevealModifier` (manual rewrite) |
| `<quad>`, `<margin=>`, `<margin-right=>`, `<pos=>`, `<space=>`, `<width=>`, `<voffset=>`, `<rotate=>` | no equivalent |
| `TMP_SubMesh`, `TMP_SubMeshUI` | removed (no sub-meshes; one shared atlas) |
| `TMP_InputField` | migrated "exact or nothing"; scripts: `onValueChanged.AddListener(h)` → `ValueChanged += h`, `onSubmit` → `Submitted`; `onEndEdit`/`onSelect`/`onDeselect` are not rewritten |

## 12. Documentation versus code (one line each)

| Where | The text says | The code / CHANGELOG says |
|---|---|---|
| Getting Started §2.6 | "WebGL rasterizes no embedded color font" | `UniTextColorFont` renders on WebGL since 3.20.0 |
| Getting Started §4.3 vs CHANGELOG 3.0.0 | `<gradient>`/`<outline>` are "gone" vs "kept as deprecated parse rules" | do not rely on either tag; build `FillModifier` / `StrokeModifier` styles with your own tag |
| Getting Started §18.2 | custom effects use `UniTextEffect` / `UniTextFrag` / `UniText_EffectLib.hlsl` | renamed in 3.2.0; the shipped templates use `LightSideFrag`, `LightSide_EffectLib.hlsl`, `LightSide_Custom*.cginc/hlsl`: treat the templates as authoritative |
| Getting Started §13.7 | `NativeEditorAction` has `Newline` | it is `Return` |
| Getting Started §21.2 vs `UniTextDocumentLoader` page | a document does not embed in a `ScrollRect` among other content vs "inside a ScrollRect or under a mask the document scrolls and windows itself" | prefer `UniTextDocumentView`; `ScrollRectRangeViewport` exists |
| Layout sample README | `HorizontalAlignment` = Left, Center, Right | the enum has six members (Start, Center, End, Justify, Left, Right) |
| `LineHeightModifier` class remarks | tag `<lh=,primary>` | no preset wires `lh`; the picker wires `line-height` |
| Docs table of §4.2 | a `<dir>` tag | no preset or picker entry defines it; use `SetWholeText<DirectionModifier>(...)` |
| Italic slant `<i=N>` | a value read as degrees | CHANGELOG 3.3.3: N is a percentage of height (20 ≈ 11°) |
| Emoji sample README | "dedicated emoji font atlas" | a shared GPU colour atlas, not a shipped emoji font; the look comes from the OS emoji font |
| README | links `Documentation~/Fonts.md`, `ProductCapabilities.md`; shader headers cite `Docs~/SHADER_DIAGNOSTICS.md` | those files are not shipped; Getting Started §2 is the font doc |
| API reference | lists only some component properties and omits generated accessors (`FontSize`…, `UniTextFontStack.Families`, `UniTextEditable.Behaviors`/`BehaviorPresets`); prints some signatures without `out`/`in` | generated names come from `[StateProperty]` fields; rely on source for exact signatures |
| Sample `BasicUsage.unity` | a text with empty `styles` receives `<color=…>` markup | a fresh component has no `color` tag; the sample presumably relied on a preset |
| Sample README | mentions `EditableText.unity` | the editable demos live inside `BasicUsage.unity`; `BehaviorPreset.asset` carries an older class identifier |
| Serialized class label | `UniTextFonts_Default.asset` is of class `UniTextFonts` | legacy label of the script `UniTextFontStack` |
| Older tutorials | `Assets > Create > UniText` | now `Assets > Create > LightSide > UniText` |

## 13. Checking a name or behaviour you do not recognize

1. Find the package (`Glob **/media.lightside.unitext/package.json`) and read its `version`; this file describes 3.30.0, so a different installed version may differ.
2. `Grep` the identifier in `<UniTextRoot>/CHANGELOG.md` (case-sensitive). Renames and removals are described in words ("renamed", "removed") or with an arrow; the newest entry is at the top, and a `**Breaking:**` prefix marks breaking changes.
3. `Grep` the identifier in `<UniTextRoot>/Runtime/` (and `<UniTextRoot>/3D/` for 3D types). No hit means the type does not exist in this version, whatever an older answer says.
4. A tag name is not an API: it exists only if a style registers it, so search your own `Style.Tag(...)` calls and `StylePreset` assets before blaming the package.
5. For markup that shows literally on screen, check registration first (the tag's style is missing on that component), then slot syntax.

## Pitfalls

1. **A 2.x name rarely exists in 3.x.** Look it up in section 1 before debugging a compile error.
2. **`<gradient>` and `<outline>` are not tags** — register your own names for `FillModifier` / `StrokeModifier`.
3. **`<br>` is a soft break; `\n` starts a paragraph.**
4. **`SetText` with the same text does nothing** (3.20.0); use `SetDirty` to force a pass.
5. **A bare `<wave>` animates by itself since 3.9.0;** adding a manual `Phase` write doubles the speed unless `Clock = Manual`.
6. **`<wave=8,2,0.25>` from older strings must become `<wave=0 8,2,0.25>`.**
7. **Auto Size never splits a word since 3.9.2.**
8. **`<cspace=…,true>` is silently ignored;** use `<cwidth=auto>`.
9. **Custom shaders and modifiers written for 3.0–3.1 do not compile on 3.20+** (renamed includes, `[GenerateParameters]`, `ParameterDescriptorSet`).
10. **World text and Lit text fail player builds until Include World Shaders / Include Lit Shaders are on** (3.12.0 default).
11. **Batch-mode builds do not migrate 2.x assets;** open the project interactively once.
12. **Do not copy an AI answer's menu paths, event names or enum members without checking this file.**

## Unverified

- The version in which the deprecated `<gradient>` / `<outline>` parse rules were finally removed (3.0.0 says they survive as deprecated; the 3.30 guide says they are gone).
- CHANGELOG versions of the `Style.Rule` → `Source`, `RangeRule` → `FixedRangeSource` and `FromSource` changes (the old serialized data still loads).
- Whether the WebGL colour-font behaviour documented in §2.6 or in CHANGELOG 3.20.0 is the final one; source and CHANGELOG agree it works, only the guide text disagrees.
- The CHANGELOG entry that added `ArcModifier` / `CurveModifier` (present in the 3.30.0 source and API).
- The exact name of the effect function in current custom-effect templates (the guide shows the 3.0.0 name).
