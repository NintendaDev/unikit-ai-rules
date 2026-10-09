# All In One VFX Toolkit — Textures, distortion maps and gradients

> **Base path:** `<AllIn1Root>` is the asset folder — the one that contains `AllIn1VfxAssemebly.asmdef` (find it with `Glob **/AllIn1VfxAssemebly.asmdef`; never hard-code its location). Premade content is in `<AllIn1Root>/Demo & Assets/` (`Textures/`, `Meshes/`, `Demo/Materials/`, `Demo/Prefabs/`).
> See also: [all-in-one-vfx-toolkit-authoring-workflow.md](all-in-one-vfx-toolkit-authoring-workflow.md) (the toolkit window), [all-in-one-vfx-toolkit-mobile-optimization.md](all-in-one-vfx-toolkit-mobile-optimization.md) (memory budget)

---

## Premade textures

~700 PNG textures in six categories (vendor texture documentation): **Shapes** (the largest set), **Noise** (100+ tileable),
**Others**, **Grayscale** (masks, mostly gradients), **Distortion Maps** (normal maps for screen distortion, need a
screen-distortion-capable shader), **Trails** (most tile horizontally). Almost all are 512×512 (some trails are 1024 wide, a few
256 or 1024 square). They have a **black background by design**: make black transparent with *Premultiply Color*, with a
white-texture/grayscale-as-alpha setup (`SHAPE_N_SHAPECOLOR`), or with an Additive preset.

Premade meshes and ~250 demo materials/prefabs live beside them. The Demo folder is large (hundreds of MB, 2 demo scenes);
copy out what you use, then delete or exclude the rest. **Only assets referenced by materials/scenes in the build ship.**

## Import settings

| Setting | Recommendation | Why |
|---|---|---|
| Wrap Mode | **Repeat** for anything that scrolls, tiles or is distorted | Scroll uses `% 1`; clamped textures smear. Mask/atlas cells that must not tile can stay Clamp. |
| Max Size | Match on-screen size; effect masks and noise rarely need more than 256–512 | The shipped textures import at max 2048 with default "Normal Quality" compression and **no platform overrides**. |
| Compression | Set per platform: ASTC on Android/iOS (block size by quality needs), never uncompressed for shapes/noise | Mobile compression is not preconfigured by the package. |
| Mipmaps | On for textures drawn at varying distance; **off** for UI/sprites and 2D effect sprites | Saves ~33% memory. |
| sRGB | Off for non-colour data (noise, masks, normal/distortion maps, gradients used as math) | Linear data must not be gamma-decoded. |
| Read/Write | Off | Doubles memory. |
| Channel packing | Pack several greyscale masks into R/G/B of one texture when you control the asset | One sample, three masks; use `SHAPE_N_SHAPECOLOR` (red channel as alpha) for single-channel shapes. |

The package ships two texture import presets (`AllIn1VfxImportPreset`, `AllIn1VfxSpriteImportPreset`: Repeat wrap, max 2048)
that are **not registered** in the Preset Manager and set no platform overrides — apply or register them yourself and then
add the mobile overrides above.

## Asset Window texture tools (`Tools → AllIn1 → VfxToolkitWindow → Texture Creators`)

| Tool | Use | Notes |
|---|---|---|
| Texture Editor | Edit an existing texture: tone, rotate, flip; *Save Editor Resulting Image as PNG file* | Output is PNG; default suggestion is the source folder with a new name. |
| Normal/Distortion Map Creator | Build a normal map from a `Target Image`; `Strength` sharpens, `Smoothing` blurs | For `SCREENDISTORTION`; usable for any normal map. A fisheye map is the vendor's example. |
| Color Gradient Editor | Gradient for Color Ramp or greyscale masks/shapes | The result can be **tiny** (for example 64×1) with bilinear filtering; choose filtering and size, then Save. |
| Texture Atlas / Spritesheet Packer | Pack N images into one grid (2×2 = 4 slots…) for a Particle System's Texture Sheet Animation | Textures beyond `Columns × Rows` are silently dropped. |
| Tileable Noise Creator | Eight noise types, preview, tileable output | Makes your own noise inside Unity; keep the size small. |
| White texture | Make a pure white texture here when a flat shape is needed | Or use the Additive preset / shape options. |
| Render Material To Image | Bake the current texture + material into a PNG (button on the main component; *Rendered Image Texture Scale* in the window sharpens the slightly soft result) | See below. |

## Screen distortion maps

Screen distortion needs a **normal map** (the "distortion map"). Make one outside Unity or with the Normal/Distortion Map
Creator. The vendor warns that the effect is potentially the most performance-intensive in the asset (see the mobile
reference); use the premade maps in the *Distortion Normal Maps* texture category before authoring new ones, and keep the map small.

## Gradients embedded in materials

`COLORRAMPGRAD_ON` (live gradient editor) and `TRAILWIDTH_ON` generate a small texture and store it **inside the `.mat`** as a
sub-asset (default 64×1 RGBA32, no mips, clamp, bilinear). Cost in a build is one tiny uncompressed texture per such material,
and the material must be an asset. *Assets → AllIn1Vfx Gradients → Remove All Gradient Textures* deletes **all** sub-assets of
the selected asset, not only stale gradients — use it on materials only, and re-create the gradient afterwards if needed.

## Baking effects to textures (Render Material To Image)

Bakes the current texture + material result into a texture so the GPU no longer recomputes the effect per frame; useful for
texture variants, recursive stacking (bake, then re-apply effects) and for pre-rendering. The vendor's own advice: do **not**
swap materials for baked images early — do it after profiling shows a problem ("you most likely never will, even in low end
devices"). The baked image is slightly softer; upscale with the scale setting. A baked texture is also a way to freeze a
static look (no scroll, no distortion) into a single sample on a very low-end tier.

## Choosing textures for a mobile effect

1. Reuse one shape + one noise texture across many materials instead of a unique texture per effect.
2. Prefer greyscale textures (mask and shape data) over RGBA colour textures; tint with `_ShapeColor`.
3. Prefer small tileable noise (128–256) for distortion/dissolve; resolution matters little for blurry data.
4. Atlas variants of one effect into a single texture; fewer textures also means fewer samplers and fewer materials.
5. Check `Texture Memory` in the Memory Profiler on the weakest target device after adding an effect set.
