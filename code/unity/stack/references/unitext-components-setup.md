# UniText — Components, setup and settings

> **Base path:** `<UniTextRoot>` is the folder of the UniText package — the one whose `package.json` has `"name": "media.lightside.unitext"` (find it with `Glob **/media.lightside.unitext/package.json`; it may sit under `Packages/` or `Library/PackageCache/`). Never hard-code its location. `<LightSideCoreRoot>` is the folder of `media.lightside.core` (same lookup by its `package.json` name); it holds `LightSideSettings`.
> See also: [unitext-runtime-api.md](unitext-runtime-api.md), [unitext-tmp-migration.md](unitext-tmp-migration.md), [unitext-markup-system.md](unitext-markup-system.md), [unitext-fonts.md](unitext-fonts.md), [unitext-3d-text.md](unitext-3d-text.md), [unitext-performance-mobile.md](unitext-performance-mobile.md), [unitext-interaction-links.md](unitext-interaction-links.md), [unitext-version-traps.md](unitext-version-traps.md)

---

Mobile verdicts (`OK` / `LIMIT` / `AVOID`) in this file come from reading package source and docs; nothing was profiled. Memory figures marked "arithmetic" are texture-page sizes computed from the texture format, not measurements.

Snippets adapted from verified signatures were not compiled and carry a `// not compiled` comment; snippets without it are vendor-documented recipes.

## Which component to use

| Need | Component | Constraints | Mobile |
|---|---|---|---|
| HUD, menus, anything inside a Canvas (masks, scroll views, layout groups, `ContentSizeFitter`) | `UniText` | `MaskableGraphic` + `CanvasRenderer`; needs an ancestor `Canvas`; `Mask`/`RectMask2D` clip it; canvas batching; unlit | `OK` — put rapidly changing labels on their own Canvas (standard uGUI batching practice) |
| Text in the 3D/2D scene: damage numbers, labels over enemies, signage | `UniTextWorld` | any Transform parent, no Canvas; `SortingLayerID`/`SortingOrder`; optional `Lit`/`CastShadows`; batched per sorting context; build needs `Include World Shaders` | `OK` for batched text; `LIMIT` for `Standalone` (one extra draw call per text) and for `Lit`/`CastShadows` (lit shader variants, `Include Lit Shaders`) |
| Extruded, bevelled 3D letters | `UniText3D` | optional module (`UNITEXT_3D`), `MeshFilter` + `MeshRenderer`; 2D stroke/shadow/glow layers are not drawn on solids | `AVOID` for HUD or many instances (solid geometry); `LIMIT` for a few titles — see [unitext-3d-text.md](unitext-3d-text.md) |
| Selectable / editable / input-field text | `UniText` + `UniTextSelectable` (+ `UniTextEditable`) | capability components added to the same object; menu items `UniTextSelectable`, `UniTextEditable`, `Input Field` | `LIMIT` — every interactive label adds pointer/raycast work; use only where text must react |
| Dropdown | `UniTextDropdown` | a `Selectable` built from a prefab with templates (see Dropdown below) | `OK` |
| Very long text (logs, books) | `UniTextDocumentView` prefab (+ `UniTextDocumentLoader`) or `SetDocument(Rope)` | virtualized above `UniTextSettings.VirtualizationThreshold` (16384 UTF-16 chars); own scroll | `OK` (windowed processing) — see [unitext-layout-documents.md](unitext-layout-documents.md) |

All three renderers derive from one abstract `UniTextBase : MaskableGraphic` (namespace `LightSide`): markup, fonts, paints, animation, selection and editing behave identically; only the rendering target differs.

| Aspect | `UniText` (Canvas) | `UniTextWorld` | `UniText3D` |
|---|---|---|---|
| Parent | must sit under a `Canvas` | any Transform | any Transform |
| Clipping | `Mask`, `RectMask2D` | frustum / camera layers | frustum / camera layers |
| Draw order | Canvas order | `SortingLayerID` + `SortingOrder` | normal renderer sorting |
| Batching | per Canvas | per sorting context; `Standalone` opts out | per renderer |
| Lighting | unlit | unlit, or lit with `Lit` | scene lighting |
| Pointer input | `GraphicRaycaster` + `EventSystem` | `WorldPointerRaycaster` on the camera | see 3D file |

## How to create one

| Way | Use when | What you get | Trap |
|---|---|---|---|
| Menu `GameObject -> LightSide -> UniText -> UniText` / `UniTextWorld` / ... (editor) | authoring scenes | a detached `Object.Instantiate` copy of the prefab in the matching `UniTextSettings` slot (not a prefab-instance link) | with an empty slot the menu only logs a warning — it does not build a fallback object |
| `Instantiate(prefab)` of your own prefab | runtime spawning (damage numbers, popups, rows) | the template's font stack, styles, alignment, scale, raycast flags — in editor and build | none; this is the only way to carry template configuration into a player build |
| `AddComponent<UniText>()` / `AddComponent<UniTextWorld>()` in the editor | quick tests | `Reset()` copies the matching template prefab component (sample text, font, styles) | text may arrive as the template's sample string — always assign `Text` |
| `AddComponent<...>()` in a player build | code-built labels | raw field defaults, no template (see Editor vs build) | set size, alignment, fonts and styles in code |

## First working text — checklist

1. Packages `media.lightside.unitext` and `media.lightside.core` are present (Core arrives as a dependency).
2. `Project Settings -> LightSide -> UniText` shows a `UniTextSettings` asset in a `Resources` folder (opening the page creates it or restores package defaults) and the editor prefab slots (Text, World Text, Button, ...) are filled.
3. Register a tag vocabulary once and assign it as **Global Style Preset** (the "Global tag vocabulary" recipe below, or the Migration window card — see [unitext-tmp-migration.md](unitext-tmp-migration.md)). A fresh component understands no tag; `<b>x</b>` prints literally. Full bootstrap: master rule `unitext.md`, section "Tag vocabulary bootstrap", and [unitext-markup-system.md](unitext-markup-system.md).
4. Fonts: nothing is required (OS default sans-serif plus automatic OS fallback). For a controlled look create `UniTextFont` assets and a `UniTextFontStack` (`Assets -> Create -> LightSide -> UniText -> Fonts`) and assign the stack on the prefab or set `UniTextSettings.SystemFont`. WebGL has no OS fonts: a regular font is mandatory there. See [unitext-fonts.md](unitext-fonts.md).
5. Canvas text: `GameObject -> LightSide -> UniText -> UniText` under a Canvas (interaction also needs `EventSystem` + `GraphicRaycaster`).
6. World text: `... -> UniTextWorld`; set Sorting Layer/Order; enable **Project Settings -> LightSide -> Core -> Rendering -> Include World Shaders** before any player build; add `WorldPointerRaycaster` (Add Component -> LightSide -> Core) to the camera only if the text is interactive; turn `Raycast Target` off for decorative text.
7. Press Play, then check a device build: the first draw compiles shaders and rasterizes unseen glyphs (the "first-draw stalls" recipe below pre-warms shaders).

## Installation, requirements, assemblies

| Item | Value |
|---|---|
| UniText package | `media.lightside.unitext` 3.30.0 |
| Package dependencies | `media.lightside.core` 4.4.0, `com.unity.burst` 1.8.29, `com.unity.ugui` 1.0.0, `com.unity.modules.ui` |
| Unity | 2022.3 or newer |
| Optional built-in modules (feature loss only) | Unity Web Request (URL document sources), Asset Bundle, JSON Serialize (UniText clipboard format), Image Conversion |
| Optional packages the runtime asmdef references by name | `Unity.InputSystem`, `Unity.XR.Interaction.Toolkit`, `Unity.Localization` — features switch on through version defines |
| Version defines set by the runtime asmdef | `UNITEXT_INPUTSYSTEM`, `UNITEXT_XRI`, `UNITEXT_HAS_LOCALIZATION`, `UNITEXT_UGUI_2_6`, `UNITEXT_HAS_PHYSICS`, `UNITEXT_HAS_PHYSICS2D`, `UNITEXT_HAS_WEBREQUEST`, `UNITEXT_HAS_ASSETBUNDLE`, `UNITEXT_HAS_JSONSERIALIZE`, `UNITEXT_HAS_IMAGECONVERSION` |
| Scripting defines | `UNITEXT` (written to every build target by an editor initializer — usable in `#if UNITEXT`), `UNITEXT_3D` (only while the 3D module is on), `UNITEXT_DEBUG` (diagnostic logging), `UNITEXT_PROFILE` (profiler samples), `UNITEXT_POOL_DEBUG` (pool diagnostics) |

Namespace: all runtime code is in **`LightSide`** (UniText and Core). Others: `LightSide.Samples`, `LightSide.Inspection` (debug overlay), `LightSide.SceneEditing`, `LightSide.Localization`, `LightSide.Editor.SBP` (editor).

Assembly definitions (verified names):

| asmdef name | Kind / constraint | Reference from game code? |
|---|---|---|
| `LightSide.UniText` | runtime; `rootNamespace LightSide`; `allowUnsafeCode`; `autoReferenced: true` | **yes** — components, styles, modifiers, `UniTextSettings` |
| `LightSide.Core` | runtime | **yes** — public UniText APIs expose Core types (`OrderedEvent`, `PooledList`, `StyledList`, `Gradient`, `CursorType`, `VisibleWhenAttribute`, ...) |
| `LightSide.Motion` | runtime (easing, springs) | only when you name `Ease` or spring types |
| `LightSide.UniText.3D` | runtime; define constraint `UNITEXT_3D` | only when using `UniText3D` |
| `LightSide.UniText.Inspection` | runtime; define constraint `DEBUG` | no (debug overlay) |
| `LightSide.UniText.Editor`, `LightSide.Core.Editor`, `LightSide.Motion.Editor` | editor-only | only editor tools that call UniText editor utilities (for example font-creation helpers) |
| `LightSide.UniText.3D.Editor` (`UNITEXT_3D`), `LightSide.UniText.Inspection.Editor`, `LightSide.UniText.Editor.Localization` (`UNITEXT_HAS_LOCALIZATION`), `LightSide.UniText.Editor.SBP` (`UNITEXT_HAS_SBP`) | editor-only | no |
| `LightSide.UniText.Samples` and the other sample asmdefs | sample code | never |

Consumer asmdef rule: reference `LightSide.UniText` and `LightSide.Core` **by name** (the package's own asmdefs use GUIDs; names work for consumers), plus `UnityEngine.UI`; add `LightSide.Motion` only when you name `Ease`/springs. A project with no asmdefs (Assembly-CSharp) references everything automatically. If `CS0246`/`CS0012` mentions `CursorType`, `VisibleWhenAttribute` or another Core type, the assembly reference to `LightSide.Core` is missing (these types moved there in 3.x).

```json
{
  "name": "MyGame.UI",
  "references": [ "LightSide.UniText", "LightSide.Core", "UnityEngine.UI" ]
}
```

## Menus and editor entry points

- `GameObject -> LightSide -> UniText -> {UniText, Button, UniTextDropdown, UniTextSelectable, UniTextEditable, Input Field, UniTextDocumentView, UniTextDocumentView (Both Axes), UniTextWorld, UniText3D}`.
- `Add Component -> LightSide -> UniText -> <component>`: also `UniTextDriver`, `UniTextAnimationBridge`, `UniTextContextMenu`, `TextCommandButton`, `ScrollRectRangeViewport`, `CameraRangeViewport`, `UniTextDocumentLoader`, `UniTextSelectionHandles`, `UniTextPasteControl`, `InputCaretRenderer`, `UniTextDropdownItem`. Core adds `Add Component -> LightSide -> Core` (for example `WorldPointerRaycaster`).
- `Assets -> Create -> LightSide -> UniText -> {Fonts/Font Asset, Fonts/Color Font Asset, Fonts/System Font Asset, Fonts/Font Stack (Combined), Fonts/Font Stack (Per Font), Fonts/Font Variant, Paints, Objects, Sprites, Reveal Handlers, Style Preset, Modifier Graph Preset, Behavior Preset, Range Channel, Custom Effect}`.
- `Tools -> LightSide -> UniText -> {Utilities, Migration, Glyph Diagnostic, Clipboard Inspector, Range Debugger, Edit Text in Scene, Inspection Mode (Ctrl/Cmd+Shift+I), Respect Scene Visibility, Show Scene Visibility Overlay}`.
- `Project Settings -> LightSide -> UniText` and `-> Core`; component context menu `Localize` (needs Unity Localization). Shift+Right-click in Hierarchy/Project opens the LightSide command palette (Alt+L is the global shortcut).
- Scripts that execute menu items by path break across versions (all menus moved under `LightSide` in 3.8.0).

## `UniTextSettings` — what to assign

`UniTextSettings` is a project asset loaded with `Resources.Load<UniTextSettings>("UniTextSettings")` and exposed as singleton `UniTextSettings.Instance` with static accessors. A missing asset logs an error and members degrade to defaults. The package ships defaults in `<UniTextRoot>/Defaults/UniTextSettings.asset`; the settings page copies them when it creates the asset.

| Static member | Type | Shipped default | Meaning | Mobile |
|---|---|---|---|---|
| `GlobalStylePreset` | `StylePreset` | **null** | project-wide tag vocabulary, registered after local `Styles` and component `StylePresets`; a component opts out with `UseGlobalStylePreset = false` | `LIMIT` — every registered rule is walked at each markup trigger in every component that reads the preset: register only the tags you use |
| `SystemFont` | `UniTextSystemFont` | null (OS default sans-serif) | primary font for components with no `Font`/`FontStack`, plus the always-on last fallback | `OK` |
| `SystemFontDisabled`, `EmojiDisabled`, `CursorDisabled` | `bool` | false | persisted mirrors of runtime flags | `OK` |
| `Paints` | `UniTextPaints` | null | project swatch catalog for paint parameters | `OK` |
| `Language` | `string` | `""` | project-wide BCP-47 tag (`locl`, preferred language) | `OK` |
| `DefaultLineHeightMode` / `LineHeightScale` | `LineHeightMode` (`Content`=0, `Primary`=1, `Scaled`=2) / `float` | `Scaled` / **1.4** | line height = 1.4 x font size, uniform rows; `Content` = tallest font per line (TMP-like) | `OK` |
| `FontNormalizeMetric` / `FontNormalizeTarget` | enum / `float` | None / 0 | font-size adjustment for fallback fonts | `OK` |
| `VirtualizationThreshold` | `int` | 16384 | UTF-16 chars processed whole; longer text is windowed | `OK` — keep unless showing huge text |
| `SdfAtlasSize` / `MsdfAtlasSize` / `ColorAtlasSize` | `GlyphAtlasSize` (1024 / 2048) | 2048 | atlas page size | `LIMIT` — see atlas memory below |
| `SdfAtlasPrecision` / `MsdfAtlasPrecision` | `GlyphAtlasPrecision` (8 / 16 bit) | 16 bit | 8-bit halves page memory; can quantize large or effect-heavy contours | `LIMIT` (choose per quality needs) |
| `Dictionaries` | list of `WordSegmentationDictionary` | empty | Thai/Lao/Khmer/Myanmar line breaking | `OK` |
| `AndroidMenu`, `IOSMenu`, `ContextMenuPrefab`, `SelectionHandlesPrefab`, `Commands` | | | editing UI defaults | `OK` |
| Editor-only: `TextPrefab`, `WorldTextPrefab`, `Text3DPrefab`, `ButtonPrefab`, `DropdownPrefab`, `SelectableTextPrefab`, `EditableTextPrefab`, `InputFieldPrefab`, `DocumentViewPrefab`, `DocumentViewBothAxesPrefab` | `GameObject` | package defaults | menu templates and the source of `Reset()`; **absent at runtime and in builds** | — |

Non-API serialized values (defaults): caret blink/width, undo coalesce 0.5 s and memory 1 MB, long-press 0.5 s, drag slop 10 dp, multi-tap window 0.3 s / 100 dp, multi-click 0.5 s / 8 dp.

Atlas memory (arithmetic): one SDF page at 2048 / 16-bit = 8 MiB; MSDF 16-bit RGBA half = 32 MiB per page; color atlas RGBA32 2048 = 16 MiB per page; 1024 pages are a quarter of those. `RenderMode.MSDF` (per component, sharp effect corners) is `LIMIT`/avoid on mobile unless sharp-cornered display type needs it; `SDF` (default, rounded effect corners) is `OK`. Changing atlas settings discards the glyph cache and refreshes all text.

Changing `GlobalStylePreset`, `SystemFont`, `Language`, `VirtualizationThreshold` or the line-height settings at runtime broadcasts `UniTextSettings.Changed`, which marks every subscribed text dirty (font, text or layout stage): `LIMIT` — do it at startup or on a loading screen, not during gameplay.

**Assign for a mobile game (not migrating from TMP):**
1. `GlobalStylePreset` ("Global tag vocabulary" recipe) — mandatory for any tag markup.
2. Optional `SystemFont` and/or a `FontStack` on your prefab templates ([unitext-fonts.md](unitext-fonts.md)).
3. `Language` only to force a locale.
4. Atlas sizes/precision for the memory budget.
5. Keep `VirtualizationThreshold` at 16384.
6. Leave caret/long-press/menu defaults unless using editable fields.

## `LightSideSettings` (Core) — the options that matter

`LightSideSettings` lives in `<LightSideCoreRoot>/Runtime/Settings/` and is stored as `Resources/LightSideSettings.asset` (edited through `Project Settings -> LightSide -> Core`).

| Option | Effect | Mobile |
|---|---|---|
| `IncludeWorldShaders` (static bool; getter returns true when the asset is missing) | keeps the world-space shaders in builds. The package's default settings asset stores **false**, so a new project starts without them. With it off, the player build **fails** (`BuildFailedException` from scene processing, naming the scene and the object) for any scene that holds a `UniTextWorld`; runtime-spawned world text is reported at first render | required for any `UniTextWorld`; extra shader variants are the cost |
| `IncludeLitShaders` | adds the lit world shaders; only effective while `IncludeWorldShaders` holds | `LIMIT` — enable only for lit world text |
| `UseLightSideInputModule` | replaces Unity input modules on EventSystems with the LightSide module | `OK` |
| pointer routing profiles (`default`, `transparent`, `hover`, ...) | per-pointer routing queries (`PointerRoutingRequested`) | `OK` |

The shader feature profile is synchronized automatically from the installed assemblies before a build.

## Component model

```
UniTextBase : MaskableGraphic                      abstract, assembly LightSide.UniText
 |- UniText        [RequireComponent(CanvasRenderer)]   Canvas text; ILayoutElement, ICanvasClipSource, IClipper
 |- UniTextWorld   RectTransform + world batcher        IWorldBatchSource, IWorldPointerTarget, IWorldDecorationHost
 |- UniText3D      [RequireComponent(MeshFilter, MeshRenderer)]   sealed, needs UNITEXT_3D
Siblings added beside a text: UniTextSelectable, UniTextEditable, UniTextDriver, UniTextAnimationBridge,
  UniTextContextMenu, UniTextDocumentLoader, ScrollRectRangeViewport / CameraRangeViewport, ...
Separate Selectable: UniTextDropdown (+ UniTextDropdownItem on its item template)
```

Both `UniText` and `UniTextWorld` carry a `RectTransform`; the rect is the wrap and alignment box. World text is just a RectTransform in the scene (the shipped prefab has no Canvas and no CanvasRenderer).

Markup vocabulary of a component = its list of `Style` entries (`RangeSource` + `BaseModifier`). The effective list is local `Styles`, then `StylePresets` in order, then `UniTextSettings.GlobalStylePreset` (only while `UseGlobalStylePreset`). The first registered rule wins a syntax collision. Each component copies a preset's styles; `GetModifier<T>()` returns that component's live instance; editing the preset asset reaches every user live.

Helper and support types you meet in component code:

| Type | Role |
|---|---|
| `UniTextAnimationBridge` + `UniTextFieldsAnimationHandler` / `UniTextWorldFieldsAnimationHandler` | turns Animator-written serialized fields (size, color, wrap, alignment, auto-size; world: sorting, shadows) back into `SetDirty` |
| `UniTextDriver`, `UniTextDriverClip` | per-range parameter timeline over the sibling text (`Play/Pause/Stop/Seek/Advance/Rebind`, `Progress`, `Speed`, `Duration`) — see [unitext-animation-phase.md](unitext-animation-phase.md) |
| `FitStep`, `TrackingFitStep`, `GlyphScaleFitStep`, `LineHeightFitStep` | auto-size "ladder": budgets spent before the font size shrinks (tracking up to 0.02 em, glyph scale up to 2 %, line height down to 90 %; more than ~3 % glyph scale visibly distorts) |
| `IUniTextResolver` | source-text substitution hook (`TextResolver`) — see [unitext-interaction-links.md](unitext-interaction-links.md) and the runtime API file |
| `TextMeasureOptions`, `LayoutWidthContext` | arguments of `MeasureText` / `OnResolveLayoutWidth` |
| `UniTextRenderMode` | `SDF = 0` (rounded effect corners, default), `MSDF = 1` (sharp corners, more atlas memory) |
| `UniTextDirty`, `UniTextCommitChanges`, `TextOverrideSource` | pipeline-stage flags, commit-content flags, "why rendered text differs from `Text`" flags — see the runtime API file |
| `TextPointerRoutingQuery` | per-pointer routing profile query |

## Shipped prefabs and assets

Located in `<UniTextRoot>/Defaults/` (the settings page copies them where the editor slots point). Every shipped text prefab has `styles: []` and `stylePresets: []`.

| Prefab | Contents |
|---|---|
| `Text (UniText)` | UI layer; `RectTransform` 220x50, anchors centre; `UniText` with sample text, size 36, wrap on, alignment Start/Top, auto-size off (10..72), no font or font stack, `useGlobalStylePreset` on, SDF, `raycastTarget` on, `maskable` on; `CanvasRenderer` |
| `World Text (UniText)` | `RectTransform` 220x50, pivot centre, **localScale 0.01**; `UniTextWorld` with alignment **Center/Middle**, `raycastTarget` off, sortingOrder 0, lit off, castShadows off; no Canvas, no CanvasRenderer |
| `Button (UniText)` | root 220x60: sliced `Image` + Unity `Button` (colour tint); child `Text (UniText)` stretched, "Button", size 36, black, Center/Middle |
| `Dropdown (UniText)` | `UniTextDropdown` + `Template` (Canvas, Scrollbar, Viewport, Content, `Item` with `UniTextDropdownItem` + `Item Label`, checkmark) + `Blocker` + `Label` + `Arrow` |
| `Document View (UniText)` / `DocView Both Axes` | `UniTextDocumentView` + Viewport (`RectMask2D`) + `Text (UniText)` with `UniTextDocumentLoader` + scrollbars; Both Axes adds a horizontal bar, `UniTextSelectable`, wrap off |
| `Editing/Selectable Text`, `Editable Text`, `InputField - UniText` | `UniText` + `UniTextSelectable` (+ `UniTextEditable`); the input field = `Image` + `RectMask2D` + `VerticalLayoutGroup` + `LayoutElement` + Text + Placeholder |
| `UniTextFonts_Default.asset` | a `UniTextFontStack` of NotoSans-Regular, NotoSansArabic-Regular, NotoSansHebrew-Regular; **assigned to nothing** |
| `ModifierGraphPresets/{LinkPreset, SpoilerPreset}.asset` | `LinkPreset` = `CompositeModifier[LinkModifier (autoOpenUrl on), ColorModifier, UnderlineModifier, three HighlightModifier with range-state rules]` |
| `Materials/{UniTextLit, Rainbow, Hologram, Disolve}.mat`, `Dictionaries/*` | sample materials; word-segmentation dictionaries |

No shipped prefab references a font asset: text uses the OS default sans-serif system font (or `UniTextSettings.SystemFont`).

Doc-vs-code: the getting-started text says the shipped prefabs "wire the common tags"; the prefab files and the settings asset contain no styles and no global preset, so no tag works until you register one.

## Editor vs build

`UniTextBase.Reset()` — the code that copies the template prefab — is compiled only under `UNITY_EDITOR`. Consequence:

| Property | `AddComponent` in the editor | `AddComponent` in a player build |
|---|---|---|
| `Text` | template sample string | `""` |
| Font / `FontStack` | whatever the template has | none (OS default sans-serif) |
| `FontSize` | template value | **36** |
| `MinFontSize` / `MaxFontSize` / `AutoSize` | template | 10 / 72 / off |
| Alignment | template (world prefab: Center/Middle) | **Start / Top** for both components |
| `Styles` / `StylePresets` | template (empty in shipped prefabs) | empty |
| `UseGlobalStylePreset`, `RenderMode`, `raycastTarget`, `maskable` | template | true, `SDF`, true, true |
| `UniTextWorld` scale / `RaycastTarget` | template (0.01 / false) | scale 1 / **true** |

Rule: in code, always set `Text`, fonts and layout explicitly, or instantiate a prefab. An auto-added `RectTransform` is Unity's default 100x100 — set `sizeDelta`.

## `UniTextWorld` specifics

- Font size is in rect units, so unscaled world text is huge (36 at scale 1 = 36 world units tall). The shipped prefab uses scale 0.01 with a 220x50 rect; copy that or build your own prefab.
- `RaycastTarget` is its own property (default `true`, the shipped prefab sets `false`). Interactive world text needs `WorldPointerRaycaster` on the camera; a scene with an interactive world text and no raycaster logs one warning per scene. Decorative text: `RaycastTarget = false`.
- `SortingLayerID` / `SortingOrder` form the batch key together with `Lit`, `CastShadows` and `Standalone`; changing any of them re-keys the batch (`SortingChanged`) — set them once, not per frame.
- `Standalone = true` gives the text its own renderer (needed only when other sprites must sort between this text and its neighbours); one extra draw call each.
- `Hide()`/`Show()` flip batch membership cheaply; a hidden `UniTextWorld` stops following a camera (3.20.0). Core ships a `Billboard` component (3.30.0) to face cameras.
- Inline `<sprite>` media goes through the Canvas pipeline; see [unitext-inline-media.md](unitext-inline-media.md) before using it on world text.

## Canvas behavior (`UniText`)

- `UniText` is a `MaskableGraphic`: `Mask` and `RectMask2D` clip it; `maskable`/`raycastTarget` are the usual `Graphic` members. Set `raycastTarget = false` on non-interactive labels. `Padding` does not shrink the hit area (the whole rect stays raycastable).
- Layout groups: `UniText` implements `ILayoutElement` **explicitly** (`preferredWidth/Height` exist only through an `ILayoutElement` cast; `minWidth/minHeight = 0`, `flexible = -1`). `PreferredHeight`, `GetMaxContentWidth()`, `GetMinContentWidth()`, `GetHeightForWidth(float)` are the public equivalents.
- `ContentSizeFitter` Preferred/Preferred: width = widest line (no wrapping), height = height at the current rect width. `LayoutRebuilder` works; a layout rebuild that reads preferred sizes forces the first processing pass synchronously on the main thread (`EnsureFirstPassComplete`) — `LIMIT` for layout groups holding many labels that change together. `UniText` stopped being an `ILayoutController` in 3.20.0.
- `UniText` sets the Canvas `additionalShaderChannels` (TexCoord1..3) every frame; manual changes are overridden.
- uGUI invalidation is ignored: `SetAllDirty()`, `SetVerticesDirty()`, `SetMaterialDirty()` do nothing on a text (the `Canvas`-driven `SetMaterialDirty` override triggers an appearance rebuild). Use `SetDirty(UniTextDirty...)`.
- Glyph meshes, inline media and decorations live under a hidden child (`RenderRoot`) created lazily on the main thread; `Hide()` culls it and sets a `CanvasGroup` there.
- `RectTransform` size changes re-flow the text automatically (width change re-wraps or repositions; height-only change repositions); a parent change re-lays out.

## Dropdown (`UniTextDropdown`)

`UniTextDropdown` (`[DisallowMultipleComponent]`, a `Selectable`): `Value` (int; -1 only with a `placeholder` or an empty list), `SetValueWithoutNotify(int)`, `OnValueChanged` (`UnityEvent<int>`), `IsExpanded`, `Options` (state list of `OptionData{Text, Image}`), `AddOptions(List<OptionData>|List<string>|List<Sprite>)`, `ClearOptions()`, `RefreshShownValue()`, `Show()`, `Hide()`, serialized `template`, `blockerTemplate`, `captionText` (`UniText`), `captionImage`, `placeholder`, `fadeDuration` (0.15 s); virtual factory hooks (`CreateBlocker`, `CreateDropdownList`, `CreateItem`, `DestroyItem`) for pooling. Item template: `UniTextDropdownItem` (+ `Toggle`) with `UniText text` and `Image image`. Both templates must be inactive; the list template needs `Canvas` + `CanvasGroup` + raycaster, the blocker needs `Canvas` + raycaster + a target graphic. `Show()` throws `InvalidOperationException` outside a Canvas or with incomplete templates. Mutating `Options` refreshes the caption and an open list without invoking `OnValueChanged`.

## Recipes

Every tag used below exists only after a style registers it (global preset, component `Styles`, or a preset assigned to the component); each recipe shows the registration line.

### Canvas label from code

Goal: a label created in a build. Setup: a Canvas parent. Result: a centred, non-raycast label.

```csharp
// not compiled
public static UniText CreateLabel(RectTransform parent, string text, UniTextFontStack stack = null)
{
    var go = new GameObject("Label", typeof(RectTransform));   // CanvasRenderer arrives via [RequireComponent]
    var rect = (RectTransform)go.transform;
    rect.SetParent(parent, false);
    rect.sizeDelta = new Vector2(220f, 50f);                    // wrap/alignment box
    var label = go.AddComponent<UniText>();
    if (stack != null) label.FontStack = stack;                 // otherwise OS default sans-serif
    label.FontSize = 36f;                                       // already the raw default
    label.HorizontalAlignment = HorizontalAlignment.Center;
    label.VerticalAlignment = VerticalAlignment.Middle;
    label.raycastTarget = false;                                // non-interactive label
    label.Text = text;                                          // always assign: editor Reset() may have copied sample text
    return label;
}
```

Gotcha: without a style source `<tag>` stays literal; prefer `Instantiate(prefab)` when the template configuration matters.

### Global tag vocabulary (editor script)

Goal: one project-wide preset so tags work everywhere. Place under an Editor folder (or an editor asmdef referencing `LightSide.UniText` and `LightSide.Core`). Full vocabulary design: master rule `unitext.md` ("Tag vocabulary bootstrap").

```csharp
// not compiled
#if UNITY_EDITOR
using LightSide;
using UnityEditor;
using UnityEngine;

public static class CreateUniTextVocabulary
{
    [MenuItem("Tools/UniText Setup/Create Global Style Preset")]
    static void Create()
    {
        var path = EditorUtility.SaveFilePanelInProject("Create UniText Style preset", "UniTextStyles", "asset", "");
        if (string.IsNullOrEmpty(path)) return;
        var preset = ScriptableObject.CreateInstance<StylePreset>();
        AssetDatabase.CreateAsset(preset, path);                          // create first, then fill
        preset.Styles.Add(Style.Tag(new BoldModifier(), "b"));
        preset.Styles.Add(Style.Tag(new ItalicModifier(), "i"));
        preset.Styles.Add(Style.Tag(new ColorModifier(), "color"));
        preset.Styles.Add(Style.Tag(new SizeModifier(), "size"));
        preset.Styles.Add(Style.Tag(new ColorModifier(), "warning", "#FF0000"));   // custom tag + default parameter
        preset.Styles.Add(new Style { Source = new LineBreakParseRule() });        // <br>, standalone rule
        preset.Styles.Add(new Style { Source = new NoparseTagRule() });            // <noparse>, standalone rule
        EditorUtility.SetDirty(preset);
        UniTextSettings.GlobalStylePreset = preset;                       // every component with UseGlobalStylePreset reads it
        EditorUtility.SetDirty(UniTextSettings.Instance);
        AssetDatabase.SaveAssets();
    }
}
#endif
```

Register only tags you use (`LIMIT` otherwise). Rows for `<align>`, `<indent>`, `<nobr>`, `<smallcaps>`, `<upper>` and others: see [unitext-tmp-migration.md](unitext-tmp-migration.md) tag map and [unitext-formatting-tags-quickref.md](unitext-formatting-tags-quickref.md).

### Styles on one component (no preset)

```csharp
// not compiled
var text = gameObject.AddComponent<UniText>();
text.Styles.Add(Style.Tag(new BoldModifier(), "b"));     // <b> exists only because this line says so
text.Text = "Hello <b>world</b>";
text.FontSize = 24;
text.color = Color.white;
```

`Style` builders: `Style.Tag(modifier, "name", defaultParameter: null)`, `Style.WholeText(modifier, parameter: null)`, `Style.Range(modifier, start, end, parameter: null)` (codepoint span, end exclusive), `Style.FromSource(source, modifier)`. `style.Enabled = false` switches a style off without removing it. Adding or removing a style costs a re-parse (structural change) — never per frame.

### World text from code

Goal: a damage-number-sized label in the scene. Setup: `Include World Shaders` on.

```csharp
// not compiled
var go = new GameObject("Label3D", typeof(UniTextWorld));         // RectTransform added automatically
var t = go.GetComponent<UniTextWorld>();
var rect = t.rectTransform;
rect.sizeDelta = new Vector2(400f, 100f);                           // the auto-added rect is 100x100
rect.localScale = Vector3.one * 0.01f;                              // font size is in rect units
t.FontSize = 48f;
t.HorizontalAlignment = HorizontalAlignment.Center;                 // code default is Start/Top
t.VerticalAlignment = VerticalAlignment.Middle;
t.RaycastTarget = false;                                            // decorative: no WorldPointerRaycaster warning
t.SortingOrder = 10;                                                // SortingLayerID too; part of the batch key
t.Text = "Hello";
```

Interactive world text: add `WorldPointerRaycaster` to the camera (it requires a `Camera`), keep `RaycastTarget = true`, subscribe `TextClicked` or modifier events. Pooled world popups: see "Pooled damage numbers" in [unitext-runtime-api.md](unitext-runtime-api.md).

### Dropdown from code

```csharp
// not compiled
var dd = Instantiate(dropdownPrefab, canvas.transform).GetComponent<UniTextDropdown>();   // prefab = Dropdown (UniText); templates stay inactive
dd.ClearOptions();
dd.AddOptions(new List<string> { "Easy", "Normal", "Hard" });
dd.SetValueWithoutNotify(1);
dd.OnValueChanged.AddListener(i => difficulty = i);                // fires on user or Value changes
```

### Avoid first-draw stalls on phones

Goal: no shader-compile hitch the first time text appears. Setup: call behind a loading screen, main thread, once.

```csharp
// not compiled
LightSideMaterials.WarmUpUi(LightSideSurfaceTier.Text, LightSideSurfaceTier.StyledText);
// StyledText = stroke/shadow/glow/paint layers/decorations; UnitedText = UnionModifier; Full = DeformModifier
```

Gotcha: a tier the shader profile left out of the build throws `ArgumentException`; a shader missing from the build throws `InvalidOperationException`. Render targets in other formats on Vulkan/Metal/D3D12 may still compile on first draw. Never-seen glyphs are rasterized and uploaded on first appearance: draw common strings once during loading if a hitch matters. Verdict: `OK` (one-time cost, moved to loading).

### Clickable links

Goal: tappable links in dialogue/tooltips. Setup: register the link styles (they are not defined by default); raycast target on; pointer pipeline present.

```csharp
text.Styles.Add(Style.Tag(new LinkModifier(), "link"));
text.Styles.Add(Style.FromSource(new RawUrlParseRule(), new LinkModifier()));
text.Text = "See <link=https://example.com>the docs</link> or https://example.com";
```

`LinkModifier` draws nothing: compose it with `ColorModifier` + `UnderlineModifier` in a `CompositeModifier` (as the shipped `LinkPreset` does, which also adds pressed/hover highlight states). Events: `LinkClicked(string)`, `LinkEntered(string)`, `LinkExited()`. **`AutoOpenUrl` defaults to true and calls `Application.OpenURL(primaryValue)` for any non-empty value** — for in-game ids (`<link=item:42>`) set it to false or the OS tries to open "item:42". The two `Styles.Add` lines create two separate `LinkModifier` instances: `GetModifier<LinkModifier>()` returns the first, so subscribe on the one you actually use (or use one style). `RawUrlParseRule` has priority -100, so explicit markup wins.

```csharp
// not compiled
var link = new LinkModifier { AutoOpenUrl = false };
var graph = new CompositeModifier();
graph.Modifiers.ReplaceAll(new BaseModifier[] { link, new ColorModifier(), new UnderlineModifier() });
text.Styles.Add(Style.Tag(graph, "link"));
link.LinkClicked += id => OpenItemCard(id);                       // string = the tag value / URL
```

Link internals and routing: [unitext-interaction-links.md](unitext-interaction-links.md).

### Typewriter

Goal: reveal text character by character over time. Setup: a style holding `RevealModifier`.

```csharp
// not compiled
text.Styles.Add(Style.WholeText(new RevealModifier()));
var reveal = text.GetModifier<RevealModifier>();
reveal.Collapse = false;                                  // changing Collapse re-parses: set once
for (float t = 0; t < duration; t += Time.deltaTime)
{
    reveal.Front = UnitValue.Percent(100f * t / duration);   // Front changes only redraw
    yield return null;
}
```

`Unit` picks cluster/word/line/paragraph per step. A `UniTextDriver` clip on `RevealModifier.Param.Front` does the same without a coroutine. `GetModifier<RevealModifier>()` works before the first parse; only `Own`/`GetRanges` need the modifier attached. More: [unitext-animation-reveal-sequencer.md](unitext-animation-reveal-sequencer.md).

### Whole-text colour without markup

```csharp
text.Styles.Add(Style.WholeText(new ColorModifier(), "#FF0000"));   // alternative A: whole text
text.Styles.Add(Style.Range(new ColorModifier(), 0, 5, "#FF0000")); // alternative B: fixed span, codepoints 0..4
```

The two lines are alternatives, not a pair. For one whole-text colour prefer the component `color`. `SetWholeText<ColorModifier>("#FF0000")` / `ClearWholeText<ColorModifier>()` / `ToggleWholeText<T>(string)` add, update or remove a local whole-text style in place without duplicating it.

### Chat composer, password field, validated email field, system fonts only

- **Chat composer**: `UniTextSelectable` + `UniTextEditable`, then an `InputBehaviorPreset` holding `SubmitKeyBehavior` (Enter submits, Shift+Enter inserts a newline, focus survives), a `MediaInputBehavior` subclass (pasted images become attachments), `LengthLimitBehavior` and a `PlaceholderDecorator`.
- **Password field**: `PasswordBehavior` + `SelectAllOnFocusBehavior` + `NativeKeyboardBehavior` with `AutofillHint.Password` and autocorrection off.
- **Validated email field**: `EmailFilter` (rejects illegal characters as typed) + a validator subclassing `InputValidatorBase` (judges the whole value) + `AutoValidateBehavior` + `SupportingTextDecorator` to show the message.
- **System fonts only, no bundled font**: leave the stack empty or put a single `UniTextSystemFont` in it; automatic OS fallback covers the rest. WebGL has no OS fonts: a regular `UniTextFont` is needed in the stack.

Behavior details: [unitext-input-fields.md](unitext-input-fields.md). A TMP input field migrates to one composite object, never half-converted.

## Pitfalls

1. **No tag renders by default** — shipped prefabs and settings carry no styles and no global preset; `<b>x</b>` prints literally. Register a vocabulary ("Global tag vocabulary" recipe).
2. **Editor vs build divergence** — template copying exists only in the editor; builds get 36 pt, Start/Top, no font stack, no styles (and world text scale 1, `RaycastTarget` true). Set values in code or instantiate a prefab.
3. **World text and builds** — `Include World Shaders` off fails the build for scenes holding `UniTextWorld`; runtime-spawned world text in such a build is reported at first render.
4. **World text size** — unscaled world text is huge; use scale 0.01 with a 220x50 rect (or equivalent). `RaycastTarget` true without a `WorldPointerRaycaster` logs a warning once per scene.
5. **Menu with an empty prefab slot** only logs a warning. Doc-vs-code: the docs describe a code-built fallback with auto Canvas/EventSystem; the source has none.
6. **Settings asset missing** — `Resources/UniTextSettings.asset` absent at runtime logs an error and members fall to defaults (no global preset, no system font).
7. **uGUI dirty calls are no-ops** on a text — third-party code that "marks graphics dirty" does nothing.
8. `preferredWidth` / `preferredHeight` do not compile on `UniText` (explicit interface) — cast to `ILayoutElement` or use `PreferredHeight`, `GetMaxContentWidth()`, `MeasureText`.
9. Consumer asmdef without `LightSide.Core` fails with `CS0246`/`CS0012` on Core types.
10. Doc-vs-code: `UnitValue` is documented as a Core type but lives in the `LightSide.UniText` assembly (namespace `LightSide` either way, so only the assembly reference matters).
11. Changing atlas size/precision or any broadcast setting at runtime refreshes all text; do it at startup.
12. `UniTextDropdown.Show()` throws outside a Canvas or with active/incomplete templates.
13. WebGL: no OS fonts (assign fonts), no parallel processing.
14. Untrusted user text with the global preset on interprets tags (including `<link>`): opt the component out (`UseGlobalStylePreset = false`) or escape.

## Unverified

- Assigning `UniTextSettings.GlobalStylePreset` from a `[RuntimeInitializeOnLoadMethod]` method (no asset) so loaded scenes pick it up through `UniTextSettings.Changed`: inferred from the settings broadcast, not run.
- `Billboard` (Core): its API was not read.
- `CompositeModifier` default-parameter merge across `;` segments: only the sample's `"#00B4D8;2"` usage was seen.
- `FitSteps` property spelling on `UniTextBase` (generated from the `fitSteps` field; not used in any source file read).
