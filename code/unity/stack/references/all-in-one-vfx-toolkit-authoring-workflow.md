# All In One VFX Toolkit — Authoring workflow (component, window, materials, prefabs)

> **Base path:** `<AllIn1Root>` is the asset folder — the one that contains `AllIn1VfxAssemebly.asmdef` (find it with `Glob **/AllIn1VfxAssemebly.asmdef`; never hard-code its location).
> See also: [all-in-one-vfx-toolkit-material-configuration.md](all-in-one-vfx-toolkit-material-configuration.md) (blend/render state), [all-in-one-vfx-toolkit-particles.md](all-in-one-vfx-toolkit-particles.md) (particle helper), [all-in-one-vfx-toolkit-textures.md](all-in-one-vfx-toolkit-textures.md)

Editor-time workflow. Everything here is tooling: none of it should run, or be called, from gameplay code.

---

## Quick start

1. Select a GameObject that has a Renderer (Mesh Renderer, Particle System Renderer, Trail/Line Renderer, Sprite Renderer) or a
   uGUI `Graphic`, then *Add Component → AllIn1VfxToolkit → AddAllIn1Vfx* (`AllIn1VfxComponent`).
2. The component replaces the current material with a new instance of the toolkit shader suited to the pipeline. The custom
   material inspector appears under the components; tick effects to enable them (each tick sets the effect's keyword).
3. Use a premade shape from the Demo textures (or generate one in the toolkit window), pick a blend preset, add effects.
4. **Press *Save Material to Folder* before making the object a prefab** (see below).
5. Remove the `AddAllIn1Vfx` component when the material is done. Leaving it costs nothing at runtime but leaves an inert
   component on every prefab.

Gotchas of the component (editor behaviour):
- Adding it to an object whose material shader name does not contain "Vfx" **silently replaces the material** with a new toolkit
  material in edit mode; the old one survives only in a private field lost on domain reload.
- *Deactivate All Effects* / *New Clean Material* leave some keywords enabled (truncated names in the reset list) — see the
  shaders reference. Audit `m_ShaderKeywords` of materials you ship.
- It is `[ExecuteInEditMode]`; its API (`MakeCopy`, `TryCreateNew`, `ClearAllKeywords`, `CleanMaterial`, `SaveMaterial`) compiles
  into players but must never be called at runtime (`ClearAllKeywords` disables ~60 keywords on the **shared** material;
  `CleanMaterial` does `Shader.Find("Sprites/Default")`, null in a build unless that shader is included).

## Component buttons

| Button | Result |
|---|---|
| Deactivate All Effects | Turns every effect off without touching property values; re-enabling restores the previous look. |
| New Clean Material | New material instance of the toolkit shader assigned to the Renderer. |
| Create New Material With Same Properties | New instance copying the current properties — use to branch a variant. |
| Save Material to Folder | Creates a Material **asset** named after the GameObject (collision suffix `_1`, `_2`…) in the *Material Save Path*, so several Renderers can share one material. |
| Apply Material To All Children | Applies this object's material to every object below it. |
| Render Material To Image | Bakes the current texture + material into a PNG (see the textures reference). |
| Add Particle System Helper | Adds the helper component; only if the object has a Particle System. |
| Remove Component / Remove Component and Material | Remove the component; the second also resets a Sprite to `Sprite/Default`. |

## Saving materials and prefabs

- By default the toolkit does **not** create a material asset: the material lives in the scene so the project is not flooded
  with assets. A prefab made from such an object loses the material reference and renders wrong or pink.
- Procedure: select the object → *Save Material to Folder* → then create or apply the prefab. For many objects that must
  share a look, save once and use *Apply Material To All Children* or assign the saved asset.
- Material assets are the unit SRP Batching and shared-material animation work on; plan one asset per distinct look.
- *Use Editable Gradient* (`COLORRAMPGRAD`) and `TRAILWIDTH` store a baked gradient texture as a **sub-asset** inside the
  `.mat`; they work only on material assets. Remove stale ones with *Assets → AllIn1Vfx Gradients → Remove All Gradient
  Textures* (it destroys **every** sub-asset of the selected asset, so run it on materials only).
- Materials that were authored under another pipeline are fixed in bulk with the toolkit window's *Auto Setup Pipeline shader
  variant* (select a folder, press the button).

## The toolkit window (`Tools → AllIn1 → VfxToolkitWindow`, `AllIn1VfxWindow`)

| Tab | What it does |
|---|---|
| Save Paths | *Material Save Path*, *Particle Presets Save Path*, *Render Material to Image Save Path* (stored in `PlayerPrefs`, per machine; defaults point into the asset's `MaterialSaves`, `ParticlePresets`, `Demo & Assets/Textures`). **Set them to project folders** when the Demo is removed. |
| Texture Editor | Tweak, rotate, flip a texture; *Save Editor Resulting Image as PNG file* (default: next to the source with a new name). |
| Texture Creators | Normal/Distortion Map Creator, Color Gradient Editor, Texture Atlas / Spritesheet Packer, Tileable Noise Creator (see the textures reference). |
| Others | *Auto Setup Pipeline shader variant* (folder), *Disable Depth and Scene Color effects* (folder; removes `SOFTPART`, `DEPTHGLOW`, `SCREENDISTORTION`), *Display Scene View Notifications*, *Refresh Lit Shader*. |

Folder tools process the files directly in the chosen folder only (not recursively).

## Editing tips

- **Reading property names:** hover a property in the inspector. For scripts, copy the name from the `Properties` block of
  `<AllIn1Root>/Shaders/AllIn1Vfx.shader` or the effects reference.
- **Animating in the Scene view:** enable *Always Refresh*; the Game view animates regardless.
- **Animating properties:** the Animation window can key any material property of a Renderer-based material. UI materials
  cannot be animated by the Animator (all Images share one material instance) — see the scripting reference.
- **Reusing demo effects:** the Demo prefabs are complete effects (projectiles, impacts, shields, auras, trails…). Copy the
  prefab and its materials into your project folders, then retune; do not reference the Demo folder directly if you plan to
  delete it.
- **Texture import:** shapes that scroll must use `Wrap Mode = Repeat`; set platform compression per project (the shipped
  import presets are not registered and do not set mobile compression).
- **Material hygiene before shipping:** delete the authoring component, turn `SHAPEDEBUG` off, remove unused effects
  (each enabled effect is code in the shipped variant), reset leftover keywords, and keep identical looks on one material asset.
- **Menu paths worth knowing:** *Add Component → AllIn1VfxToolkit → AddAllIn1Vfx*, *→ AddAllIn1VfxParticleHelper*; *Assets →
  Create → AllIn1Vfx → ParticleHelperTemplate*; *Tools → AllIn1 → VfxToolkitWindow*; *Assets → AllIn1Vfx Gradients →
  Remove All Gradient Textures*.

## Learning resources (vendor)

The vendor maintains a YouTube tutorial playlist covering the written docs and a separate VFX course; the Demo scene
contains an example of every effect, which the vendor calls the best way to discover how to use them.
