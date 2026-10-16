# UniText — 3D text (`UniText3D`, the `UNITEXT_3D` module)

> **Base path:** `<UniTextRoot>` is the folder of the UniText package — the one whose `package.json` has `"name": "media.lightside.unitext"` (find it with `Glob **/media.lightside.unitext/package.json`; it may sit under `Packages/` or `Library/PackageCache/`). Never hard-code its location. The 3D module lives in `<UniTextRoot>/3D/` (runtime, editor, shaders, `Looks/`, `Defaults~/`), its sample in `<UniTextRoot>/Samples~/Text3D/`.
> See also: [unitext-components-setup.md](unitext-components-setup.md), [unitext-runtime-api.md](unitext-runtime-api.md), [unitext-materials-shaders.md](unitext-materials-shaders.md), [unitext-effects-paint.md](unitext-effects-paint.md), [unitext-animation-phase.md](unitext-animation-phase.md), [unitext-animation-reveal-sequencer.md](unitext-animation-reveal-sequencer.md), [unitext-emoji.md](unitext-emoji.md), [unitext-interaction-links.md](unitext-interaction-links.md), [unitext-performance-mobile.md](unitext-performance-mobile.md), [unitext-version-traps.md](unitext-version-traps.md)

---

Everything is in namespace `LightSide`. The module exists since 3.30.0; older versions have no `UniText3D`. Mobile verdicts (`OK` / `LIMIT` / `AVOID`) in this file are **working guidelines** derived from reading the source and API pages: the vendor publishes no mobile budget for 3D text (no vertex counts, no per-glyph build times) and nothing was profiled.

## 1. Lookup: I want → do this

| I want | Do this | Section |
|---|---|---|
| A level-complete banner, logo, neon sign or title with real depth | `UniText3D` on a scene object, `Depth`, bevel, a `Text3DLook` | 4, 7, R1 |
| Rounded / chamfered / stepped edges | `FrontBevel` (`Text3DBevel` struct), optionally `BackBevel`, `MirrorBevel` | 4 |
| One-click material look (gold, chrome, candy, neon, stone) | `Text3DLook.ApplyTo(text3D)` with a shipped or custom look asset | 7 |
| An outline plate, highlight plate, stencil or engraved plate behind or around the letters | `Layer3DModifier` + `Text3DLayer` presets | 5, R2 |
| Bend, twist, taper, wave or spline-follow the text | `Deform3DModifier` + `Text3DDeformer` | 5, R2 |
| Letters that spin, swing, orbit, tumble or wave on their own | `Spin3DModifier`, `Swing3DModifier`, `Orbit3DModifier`, `Tumble3DModifier`, `Wave3DModifier` | 5, 9 |
| Typewriter entrance in depth (fly-in, flip, extrude, tumble) | `RevealModifier` with `FlyIn3DRevealHandler` etc. | 5, R3 |
| Pick or click one letter | camera needs `WorldPointerRaycaster`; `text3D.Raycast(ray, out hit)` | R4 |
| Physics letters or a shatter effect | `UniText3DColliders` (Boxes / ConvexHulls for dynamic bodies), `Shatter(...)` | 5, R4 |
| Avoid the first-sight build hitch of a glyph | `BakedSolids` asset, `WarmCharacters`, `BuildInBackground` | 10 |
| Turn the result into a static mesh | editor context menu: Bake To Mesh Asset / Static Object / LOD Group | 3 |
| Real scene lighting and shadows | the `MeshRenderer` on the same GameObject (shadow casting, probes, layers) | 8 |
| A HUD label, list row, counter, long paragraph, text that changes characters often | **not** `UniText3D`: use `UniText` / `UniTextWorld` | 2 |
| Code that must still compile when the module is off | wrap every mention of `UniText3D` / `Text3DLook` in `#if UNITEXT_3D` | 3 |

## 2. When to use it

| Use case | Verdict |
|---|---|
| A few titles, logos, banners, signage that must have depth, bevel, lighting, shadows, per-glyph 3D motion or physics | LIMIT — fine in small numbers; geometry is built on the CPU |
| Text whose characters change often (score, timer, chat) | AVOID — every unseen glyph is built on first appearance; use `UniText`/`UniTextWorld`, or `WarmCharacters` for a fixed alphabet |
| HUD labels, menu buttons, lists, long paragraphs | AVOID — use the SDF text components |
| Hundreds of glyphs animated by deformers or layers | AVOID on mobile — these force CPU placement and multiply vertices |

`UniText3D` uses the same parse, shape, layout, modifier and animation pipeline as `UniTextWorld`; only the mesh generator differs: each outline glyph is built into a closed solid (cached per font/variation/glyph/shape key) and assembled into **one mesh with five material slots**. It does not use the SDF atlas.

## 3. Enable the module and set up

1. **Enable:** Project Settings → LightSide → UniText → **Modules → UniText 3D** (confirm dialog; it recompiles all platforms, copies the default prefab `Text 3D (UniText)` into the project's UniText folder, and fills `UniTextSettings.Text3DPrefab` and the default 3D material for the active pipeline). Alternatively create a text through `GameObject → LightSide → UniText → UniText3D`, which offers the same switch. Disabling clears the material and scripts that use the module show "missing script". The button `Import UniText 3D Sample` copies the sample into the project's `Samples` folder.
2. **Compile-time module:** the scripting define `UNITEXT_3D` gates the assembly `LightSide.UniText.3D` (`defineConstraints: UNITEXT_3D`). It references `Unity.Splines` and defines `LIGHTSIDE_HAS_PHYSICS` / `LIGHTSIDE_HAS_SPLINES` when those packages are present. A player build for a platform that lacks the define while another platform has it fails (`UniText3DBuildGuard`): keep the define consistent across all build targets.
3. **Code guard:** any script naming `UniText3D`, `Text3DLook`, `Layer3DModifier` and so on fails to compile without the define. Wrap it in `#if UNITEXT_3D`, or put 3D code in an assembly with `defineConstraints: UNITEXT_3D`.
4. **Prefab:** the menu instantiates the settings' 3D prefab (400×100 rect, scale 0.01, font 72, centred, depth 0.15). The `UniTextSettings.Text3DPrefab` field is editor-only (`#if UNITY_EDITOR`), so **runtime code needs its own `[SerializeField] UniText3D` prefab reference**. The menu never creates 3D text inside a Canvas.
5. **Pipelines and materials:** URP and Built-in use shader `LightSide/Text 3D`; HDRP uses the Shader Graph `LightSide/Text 3D HDRP`, which is copied into the project only in HDRP projects (together with ten `UniText 3D * HDRP` materials). Look assets carry HDRP counterparts (`hdrpFaceMaterial`, `hdrpEdgeMaterial`).
6. **Other prerequisites:** `Unity.Splines` for `Path` deformers; the Physics module for `UniText3DColliders` and `Shatter`; `WorldPointerRaycaster` (Add Component → LightSide → Core) on the camera for pointer events; scene lights and, for metals, a reflection cubemap; `Include World Shaders` (Project Settings → LightSide → Core → Rendering) as for any world-batched text.
7. **Editor tools:** the `UniText3D` context menu offers Apply Look…, Bake To Mesh Asset / Static Object / Static Object With Lightmap UVs / Level Of Detail Group / pieces per glyph, Export OBJ (FBX with the FBX Exporter package), and `Convert To UniText 3D` on a `UniTextWorld`.
8. **Units:** the rect is in "points"; the prefab's 0.01 scale makes 100 points = 1 world unit. `Depth` and most sizes are in **em of the font size**, not metres.

## 4. `UniText3D` properties

`UniText3D : UniTextBase` (sealed). Settings live in the inspector sections shown; renderer settings (shadow casting, probes, layers, sorting) are on the `MeshRenderer` of the same GameObject, whose inspector is shown inside the `UniText3D` inspector.

| C# property | Section / label | Default | Meaning | Mobile |
|---|---|---|---|---|
| `Depth` | Extrusion / Depth | 0.15 em | front-to-back distance (min 0) | OK |
| `Pivot` | Pivot | Front | `Text3DPivot` Front / Center / Back: which plane sits on the transform | OK |
| `FrontFace`, `Sides`, `BackFace` | Front Face / Sides / Back Face | true | close the solids / side walls; switch off what the camera never sees | OK — fewer faces, fewer vertices |
| `Glyphs` | Draw Glyphs | true | off = keep only layers (stencil or engraved plate) | OK |
| `SmoothingAngle` | Smoothing Angle | 30° (0–180) | corners sharper than this keep a hard edge | OK |
| `CurveTolerance` | Curve Tolerance | 0.001 em (0.0001–0.02) | maximum deviation of curved outlines; lower = smoother and heavier | LIMIT — raise (coarser) on mobile |
| `AdaptiveDetail` | Adaptive Detail | false | Play Mode only: coarser curves and bevels when the text is small on screen (within 0.5 px) | OK — turn on for distant text |
| `ColorGlyphs`, `StickerBorder` | Color Glyphs / Sticker Border | Flat / 0.04 em | emoji as flat images or extruded die-cut stickers (`Text3DColorGlyphs.Sticker`) | LIMIT for Sticker |
| `BuildInBackground` | Build In Background | false | build solids of not-yet-seen glyphs on worker threads (web: in slices of coming frames) and show each when ready | OK — avoids hitches; glyphs pop in |
| `WarmCharacters` | Warm Characters | "" | characters (and per-glyph layers) built together with the text and kept ready: counters, names that change at runtime | OK |
| `BakedSolids` | Baked Solids (+ bake row) | null | `Text3DBakedSolids` asset of pre-built glyph solids matched by font bytes, variation, glyph and every shape input; stale entries are rebuilt; an asset from another solid-builder version is reported once and unused | OK — removes the first-sight build |
| `AnimateInShader` | Animate In Shader | true | the shader places animated glyphs (cost per glyph/quad, not per vertex) through a float "quad table" (170 quads per row); CPU placement is used with deformers, cross-glyph layers, or when something reads the mesh (a particle mesh shape); returns to the shader after `RestFrames` at rest | OK while the shader path holds |
| `FrontBevel`, `MirrorBevel`, `BackBevel` | Edges: Front / Same Edge At The Back / Back | `Text3DBevel.Default`: Round, width 0.02, height 0.02, segments 4, roundness 0; mirror true | see below | LIMIT — segments multiply vertices |
| `FaceMaterial`, `BevelMaterial`, `SideMaterial`, `BackBevelMaterial`, `BackMaterial` | Materials | null | fallbacks: back bevel → bevel → face → the settings' `Default 3D Material`; `GetSurfaceMaterial(Text3DSurface)` | OK — each distinct material is a draw call |
| `RaycastTarget` | – | true | pointer events need `WorldPointerRaycaster` on the camera; set false for decorative text | OK |
| `Raycast(Ray, out Text3DRaycastHit)`, `TryGetPose(in Text3DSurfacePoint, out Text3DSurfacePose)`, `Shatter(List<Material>)` → `GameObject[]`, `GetLayerMaterial(...)`, `CurrentGlyphPose` | – | – | queries on the solids as last drawn; `Text3DSurfacePoint` (Cluster, Surface, IsValid) keeps its place through poses, animation and deformers, and is invalidated by a change of text, font, size, depth or edge | OK |

`Text3DBevel` struct: `shape` (`Text3DBevelShape`: None, Chamfer, Round, Cove, Bead, Step, TwoSteps, Ogee, Engraved, Custom), `width`, `height` (em), `segments` (≥ 2 for Bead, ≥ 3 for Ogee), `roundness` (−1 hollow … 1 nearly square, for Round), `curve` (`Ease`, for Custom). `Text3DSurface` slots: Front, FrontEdge, Side, BackEdge, Back.

**`Text3DBevel`, `Text3DLayer` and `Text3DDeformer` are value types:** copy the struct, edit the copy, assign it back, or the change is lost.

## 5. 3D modifiers

All of them do nothing on flat text. Register them as styles: `text.Styles.Add(Style.WholeText(new X { ... }))` or `Style.Tag(x, "tag")` for per-range use. No tag name is wired by default; modifiers the sample uses without a tag are whole-text.

| Modifier | Purpose and main properties | Mobile |
|---|---|---|
| `Layer3DModifier` (`Layer` = `Text3DLayer`) | extra solids. `Text3DLayer` fields: `enabled`, `shape` (Outline / Box / Tube), `unit` (Glyph / Word / Line / Text), `offset`, `width`, `corners` (Round / Sharp), `radius`, `cut` (None / Stencil / Engrave), `cutOffset`, `engraveDepth`, `position`, `depth`, `bevel`, `color`, `faceMaterial`, `bevelMaterial`, `sideMaterial`. Presets: `Text3DLayer.Default` (Outline, unit Text, offset 0.04, position 0.02, depth 0.1, colour (0.2, 0.2, 0.25)), `GlyphOutline`, `GlyphRim`, `RaisedCore`, `LinePlate`, `HighlightPlate`, `WordChip`, `StencilPlate`, `EngravedPlate`, `NeonTube`. Layers draw in modifier order. The 2D Stroke/Shadow/Glow layers are **not drawn** on 3D text; this replaces them | LIMIT — each layer is another solid; unit `Glyph` multiplies it by the glyph count |
| `Deform3DModifier` (`Deformer` = `Text3DDeformer`) | `kind` Bend / Twist / Taper / Wave / Sphere / Path; `axis` Horizontal / Vertical; `direction` Depth / Plane; `angle` (default 60), `taper` 0.5, `amplitude` 0.1 em, `wavelength` 2 em, `speed`, `phase`, `pivot` 0.5, `path` (`SplineContainer`, same scene only), `position` 0.5. Applied per range around its own pivot, in modifier order; edges are split to follow the curve (≥ 1/32 em) | LIMIT — forces CPU placement and adds vertices |
| `Bevel3DModifier`, `Depth3DModifier` (multiplier of the text depth), `Surface3DModifier` (five material slots), `Transform3DModifier` (Pitch, Yaw, Roll, Lift in em, Scale) | per-range overrides | OK |
| `Spin3DModifier` (Axis, Frequency, Spread), `Swing3DModifier` (Axis, Angle, Frequency, Spread), `Wave3DModifier` (Amplitude in em, Frequency, Spread), `Orbit3DModifier` (Radius in em, Frequency, Spread), `Tumble3DModifier` (Frequency, Spread) | phase-driven glyph motion; the phase runs on its own clock since 3.9.0 (`Clock` default `Scaled`) | OK for a title — shader-placed |
| `Extrude3DRevealHandler`, `Flip3DRevealHandler`, `FlyIn3DRevealHandler`, `Tumble3DRevealHandler` | `RevealModifier` handlers (typewriter) in depth; each has `Fade` | OK |
| `Attach3DModifier` | prefab copies on glyphs: `Placement` (Top / Bottom / Front / Centerline / Surface), `Count`, `Surfaces`, `Facing`, `Spacing`, `AlignToSurface`, `Scale`, `ScaleJitter`, `Spin`, `Seed`; prefab size is measured in em; colour glyphs take none | AVOID — cost per copy (a real object each) |
| `Field3DModifier` + `UniText3DField` (Shape Sphere / Box / Linear, Radius, Size, Softness, Invert, `WeightAt(Vector3)`) | proximity effect: Offset, Push, Rotation, Scale, Depth, Color, Smoothing, UnscaledTime; scene objects, same scene only; redraws only when something moves | LIMIT |
| `UniText3DColliders` (MonoBehaviour) | `Shape` Mesh (static or kinematic only, never trigger) / Boxes / ConvexHulls, `IsTrigger`, `SurfaceMaterial`; colliders sit on a hidden child | Mesh: AVOID with moving glyphs (cooking on every move, and it forces CPU placement); Boxes / ConvexHulls: LIMIT |
| `Text3DLook` (ScriptableObject) | see section 7 | OK |
| `UniText3DFieldsAnimationHandler` | animates the 3D fields from an Animator (needs `UniTextAnimationBridge`) | OK |

A `Path` deformer's spline and `Field3DModifier` fields are scene objects: they cannot be referenced from presets or prefab assets of another scene.

## 6. What carries over from 2D text, and what does not

| Feature | On `UniText3D` |
|---|---|
| Markup, styles, presets, colour, `Fill` gradient, `UnderlineModifier` / `StrikethroughModifier` (extruded with the glyphs), `LinkModifier`, `ObjModifier` | works |
| `RevealModifier` with 2D handlers (for example Drop) and the 3D handlers | works |
| 2D phase animations (Wave, Bounce, Pulse, Shake, Wobble, Spin) and the `UniTextDriver` / Animator machinery | works; they move and colour the solids as they do flat glyphs |
| Range decorations (highlights) and flat colour glyphs | stay flat on the front face, drawn by the world batcher and deformed with the solids |
| 2D `Stroke`, `Shadow`, `Glow`, `InnerShadow`, `Extrude` layers | **not drawn** — use `Layer3DModifier` |
| Emoji | flat image or sticker (`ColorGlyphs`); see [unitext-emoji.md](unitext-emoji.md) |
| `ContentSizeFitter`, layout groups | not available (no `ILayoutElement`); size the rect from code |
| Marquee, `RenderMode` SDF/MSDF | not applicable (`RenderMode` is hidden; no atlas) |

## 7. Look presets (`Text3DLook`)

`Create → LightSide → UniText → Text 3D Look` makes a look asset. `ApplyTo(UniText3D)` sets depth, the front bevel (mirrored), `glyphs`, and the face/edge materials of the **active pipeline** (the HDRP counterparts `hdrpFaceMaterial` / `hdrpEdgeMaterial` on HDRP), clears the side and back material slots, and replaces whole-text `Layer3DModifier` styles. Text, fonts and every other style stay untouched.

Shipped looks (in `<UniTextRoot>/3D/Looks/`, with matching `UniText 3D *.mat` materials; copy the ones you want into your project):

| Look | Depth | Bevel | Layers |
|---|---|---|---|
| Plain | 0.15 | round 0.02 | – |
| Gold | 0.14 | round 0.03 | – |
| Chrome | 0.12 | chamfer 0.025 | – |
| Candy | 0.18 | round 0.045 | outline layer |
| Comic | 0.10 | round 0.015 | outline layer |
| Neon | 0.05 | round 0.012 | – |
| Engraved Stone | 0.12 | – (glyphs off) | engraved box plate |

Apply a look first, then override individual properties; a later `ApplyTo` replaces whole-text layer styles you added by hand.

## 8. Shaders, materials, lighting and shadows

`LightSide/Text 3D` (`Text3DShaders.Lit`) has two SubShaders: URP (`UniversalForwardOnly`, ShadowCaster, DepthOnly, DepthNormals, MotionVectors, Meta; `RenderType` Opaque, queue Geometry) and Built-in. Properties: `_BaseColor`, `_BaseMap`, `_TextureSpace` (Surface / Text), `_Metallic` 0, `_Smoothness` 0.5, `_EmissionColor` (HDR), `_LightInfluence` 1 (0 = unlit branch, 1 = fully lit), `_DitherFade` on, `_Cull` back. HDRP materials toggle the dither fade as Alpha Clipping.

- **Lighting is real scene lighting**: shadows are cast and received through the `MeshRenderer`; the sample scene adds a reflection cubemap so metals read as metal.
- **Alpha is a screen-door dither, not blending.** `UniText3D` is opaque and sorts by depth; there is no transparent glyph blending and no soft fade of the whole text, so fade with `color` alpha only knowing it dithers.
- Mobile: LIMIT — real-time shadows and many lights on 3D text cost like any lit mesh; `_LightInfluence` 0 selects the unlit branch (guideline: cheaper than lit) for neon and signage.
- Different materials for face, bevel and side mean up to five draw calls per text; leave the slots null to fall back to one material when art allows.

## 9. Animation parity

The same markup, styles, `RevealModifier`, 2D phase animations and `UniTextDriver` / Animator machinery apply as on flat text, with these 3D additions: the 3D motion modifiers and reveal handlers (section 5), deformers, layers, attachments and fields. Phase animation runs on its own clock (`Scaled` by default); drive `Phase` yourself only with `Clock = Manual`. `AnimateInShader` keeps the animation cost per quad rather than per vertex until a deformer, a cross-glyph layer or a mesh reader forces CPU placement. Details: [unitext-animation-phase.md](unitext-animation-phase.md), [unitext-animation-reveal-sequencer.md](unitext-animation-reveal-sequencer.md).

## 10. Cost on mobile (working guidelines)

| Driver | Why it costs | What to do |
|---|---|---|
| First appearance of each new glyph | solid built on the CPU, then cached in `GlyphSolidCache` (key: font, variation, glyph, shape inputs) | pre-bake with `BakedSolids`; list the alphabet in `WarmCharacters`; `BuildInBackground`; show title text once while loading |
| Bevel `segments`, small `CurveTolerance` | multiply vertices per glyph | 2–4 segments; raise `CurveTolerance`; `AdaptiveDetail` on |
| Many `Layer3DModifier`s, unit `Glyph` | each layer is another solid | one or two layers; unit `Text`/`Line` when a plate will do |
| Deformers, cross-glyph layers | CPU placement of animated glyphs, edge splitting | keep to a handful of titles; bake the final pose to a static mesh |
| Mesh collider on moving glyphs | cooking on every move | Boxes or ConvexHulls for dynamic bodies |
| `Attach3DModifier` | cost per prefab copy | few copies, or avoid |
| Static result | – | Bake To Static Object / LOD Group from the context menu; render the baked mesh instead of live text |

Rule of thumb: titles and logos only, never lists or HUD numbers. WebGL builds solids in slices over the coming frames and has no system fonts, so assign a font stack to the 3D text.

Starting budget (guideline): copy the values of the shipped looks — depth 0.05–0.18 em and a round bevel of width 0.012–0.045 em with the default 4 segments (the sample scenes use 4–10 segments; stay at the low end on mobile) — and add layers, deformers and attachments one at a time, checking the frame time on a target phone after each. Keep the number of live 3D texts on a screen to a few; bake what does not need to change.

## 11. Recipes

Preamble: `using LightSide;` and the whole script (or its assembly) is guarded by `#if UNITEXT_3D`.

**R1. 3D title from your own prefab, with a look**
Setup: module enabled; a prefab of your own made from the menu-created `Text 3D (UniText)`; a look asset (copy of `Gold` or your own) referenced from the script.
```csharp
[SerializeField] UniText3D prefab;
[SerializeField] Text3DLook gold;

void Show(Transform parent)
{
    var t = Instantiate(prefab, parent);
    t.rectTransform.sizeDelta = new Vector2(1250, 200);   // rect points; prefab scale 0.01 → 100 points = 1 unit
    t.FontSize = 160;
    t.Text = "LEVEL UP";
    gold.ApplyTo(t);                                      // depth, bevel, materials of the active pipeline, layers
    t.RaycastTarget = false;                              // decorative text
}
```
Result: a lit, bevelled banner. Gotcha: `ApplyTo` replaces whole-text `Layer3DModifier` styles, so apply the look before adding your own layers.

**R2. Outline plate, bevel profile and bend**
```csharp
t.Depth = 0.3f;
t.FrontBevel = new Text3DBevel { shape = Text3DBevelShape.Round, width = 0.04f, height = 0.04f, segments = 6 };

var outline = Text3DLayer.Default;                         // struct copy
outline.offset = 0.06f; outline.position = 0.05f; outline.depth = 0.12f; outline.color = Color.white;
t.Styles.Add(Style.WholeText(new Layer3DModifier { Layer = outline }));   // per-glyph plates: outline.unit = Text3DLayerUnit.Glyph

var d = Text3DDeformer.Default; d.kind = Text3DDeformerKind.Bend; d.angle = 80f;
var deform = new Deform3DModifier { Deformer = d };
t.Styles.Add(Style.WholeText(deform));

var x = deform.Deformer; x.angle = 55f + 35f * Mathf.Sin(Time.time); deform.Deformer = x;   // animate: copy, edit, assign back
```
Gotcha: assigning into a struct property copy does nothing; always write the struct back. A deformer forces CPU placement, so animate it on one title at most.

**R3. Entrance plus idle motion**
```csharp
// adapted from the sample; not compiled
var reveal = new RevealModifier { Provider = inlineProvider };      // InlineRevealHandlerProvider holding
                                                                    // new RevealHandlerEntry { Name = string.Empty, Handler = new FlyIn3DRevealHandler() }
t.Styles.Add(Style.Tag(reveal, "enter"));
t.Text = "<enter>" + text + "</enter>";
reveal.Front = UnitValue.Percent(p);                                // drive p from 0 to 100 with your tween
t.SetWholeText<Wave3DModifier>();                                   // idle motion on its own clock
```
Gotcha: the tag name `enter` is yours; nothing registers it by default.

**R4. Click a letter; physics**
Setup: `WorldPointerRaycaster` on the camera; `RaycastTarget` true.
```csharp
if (t.Raycast(cam.ScreenPointToRay(pos), out var hit) && hit.surfacePoint.IsValid)
{
    t.TryGetPose(in hit.surfacePoint, out var pose);
    gem.SetPositionAndRotation(pose.position, pose.SurfaceRotation);   // place a prefab on the touched letter
}
```
For dynamic bodies add `UniText3DColliders` with Boxes or ConvexHulls; `Shape = Mesh` only for static or kinematic bodies. `Shatter(List<Material>)` returns the pieces as `GameObject[]` and needs colliders and the physics define.

**R5. A counter that changes at runtime without hitches**
Set `WarmCharacters = "0123456789"` on the 3D text (and enable `BuildInBackground` when a pop-in is acceptable). Result: the digit solids are built together with the text and kept ready. Gotcha: characters outside the list are still built on first sight.

**R6. Your own look asset**
Setup: `Create → LightSide → UniText → Text 3D Look`; set depth, front bevel (it is mirrored to the back), whether glyphs are drawn, and the face and edge materials. On HDRP also fill the HDRP counterparts (`hdrpFaceMaterial`, `hdrpEdgeMaterial`); `ApplyTo` picks the set of the active pipeline. Optional whole-text layers (outline plate, engraved plate) can be part of the look.
```csharp
[SerializeField] Text3DLook rarityEpic;
rarityEpic.ApplyTo(titleText3D);                 // replaces whole-text Layer3DModifier styles, clears side/back material slots
```
Result: one asset restyles any number of 3D texts consistently (for example one look per item rarity). Gotcha: the look does not touch text, fonts or non-layer styles, so per-range motion and tags survive an `ApplyTo`.

**R7. Per-range 3D motion with a tag**
```csharp
titleText3D.Styles.Add(Style.Tag(new Spin3DModifier(), "spin3d"));   // the tag name is yours; nothing registers it by default
titleText3D.Text = "SCORE <spin3d>x2</spin3d>";
```
Result: only the tagged letters spin; tune `Axis`, `Frequency`, `Spread` on the modifier instance. Whole-text motion needs no tag: `titleText3D.SetWholeText<Wave3DModifier>();`.

**R8. Freeze a finished title into static geometry (editor)**
Select the `UniText3D`, open its context menu and choose Bake To Static Object (or Static Object With Lightmap UVs, Level Of Detail Group, Bake To Mesh Asset, pieces per glyph). Result: ordinary mesh geometry with no live text cost. Gotcha: the baked object is static; a change of text, font or look needs a re-bake.

## 12. Pitfalls

1. **A different cost class:** CPU-built geometry, opaque dithered alpha, no 2D stroke/shadow/glow, not creatable inside a Canvas, gated at compile time.
2. **Code naming `UniText3D` fails to compile without `UNITEXT_3D`.** Guard with `#if UNITEXT_3D`; keep the define identical on all build targets (`UniText3DBuildGuard`).
3. **`UniTextSettings.Text3DPrefab` is editor-only:** runtime code needs its own prefab reference.
4. **Struct settings are values** (`Text3DBevel`, `Text3DLayer`, `Text3DDeformer`): copy, edit, assign back.
5. **Scene objects are not asset data:** a `Path` deformer's spline and `Field3DModifier` fields cannot be used from presets or prefabs of another scene.
6. **Mesh colliders** need static or kinematic bodies and cook on every glyph move; they also force CPU placement of animated glyphs.
7. **`Text3DLook.ApplyTo` replaces whole-text `Layer3DModifier` styles** and clears the side/back material slots.
8. **Surface points are invalidated** by a change of text, font, size, depth or edge; re-raycast after such a change.
9. **Pointer events need `WorldPointerRaycaster` on the camera and `RaycastTarget` true;** turn the latter off for decorative text.
10. **Disabling the module** clears the default 3D material and leaves "missing script" on existing 3D objects.
11. **No transparency blending:** the text is opaque and screen-door dithered; plan fades and overlays accordingly.
12. **WebGL:** no system fonts (assign a font stack) and solids are built in slices over the coming frames.

## Unverified

- Whether `AddComponent<UniText3D>()` at runtime works without the prefab (the sample always instantiates the prefab; `MeshFilter`/`MeshRenderer` requirements were not checked).
- Whether `AutoSize` is supported on `UniText3D` (it derives from `UniTextBase`; not tested).
- Whether the 3D shaders ship in a player build when `Include World Shaders` is off (the setup instructions list the setting; the shader inclusion path was not read).
- Any vendor mobile budget for 3D text (vertex counts, per-glyph build time): none was found; every verdict above is a guideline.
