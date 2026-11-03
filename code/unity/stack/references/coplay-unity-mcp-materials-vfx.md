# Coplay Unity MCP — Materials, textures, shaders and effects

| Need | Tool | Group / CLI |
|---|---|---|
| Material properties and renderer assignment | `manage_material` | `core`; `material ...` |
| Shader source files | `manage_shader` | `vfx`; `shader ...` |
| Procedural pixels/import settings/sprites | `manage_texture` | `vfx`; `texture ...` |
| ParticleSystem modules and playback | `manage_vfx` with `particle_*` | `vfx`; `vfx particle ...` or raw |
| VFX Graph component/assets/properties/events | `manage_vfx` with `vfx_*` | `vfx`; raw; requires VFX Graph package |
| LineRenderer/TrailRenderer | `manage_vfx` with `line_*`/`trail_*` | `vfx`; `vfx line/trail ...` or raw |
| Volumes, pipeline, lighting/baking | `manage_graphics` | See [camera/rendering](coplay-unity-mcp-camera-rendering.md) |

## Material ownership and shaders

- MCP material parameters `material_path`/`search_method` become CLI raw `materialPath`/`searchMethod`; texture `fill_color` becomes `fillColor`. Inspect each adapter instead of using the MCP payload verbatim. VFX action settings remain inside `properties`.
- Read the material's actual shader and properties before editing. `manage_material` defaults to `Standard`; specify a compatible shader explicitly in URP/HDRP rather than inheriting that default.
- Select the renderer material slot deliberately. Inspect `mode`: `shared` can affect all users, while `instance`, `property_block`, and `create_unique` have different ownership/persistence behavior. Verify action-specific support; do not assume a property block creates an asset.
- `manage_shader` edits shader **source**, not a complete Shader Graph node-authoring API. Keep generated shader source and Shader Graph assets distinct.
- After shader imports, inspect compiler/console errors and the rendered result. A created material path does not prove pipeline compatibility.

```python
manage_material(action="create", material_path="Assets/Materials/ProbeGlow.mat",
    shader="Universal Render Pipeline/Unlit", properties={"_BaseColor": [0.1, 0.7, 0.9, 1.0]})
manage_material(action="assign_material_to_renderer", target="ProbeMesh", search_method="by_name",
    material_path="Assets/Materials/ProbeGlow.mat", slot=0, mode="shared")
```

```powershell
unity-mcp --format json raw manage_material '{"action":"create","materialPath":"Assets/Materials/ProbeGlow.mat","shader":"Universal Render Pipeline/Unlit","properties":{"_BaseColor":[0.1,0.7,0.9,1.0]}}'
unity-mcp --format json raw manage_material '{"action":"assign_material_to_renderer","target":"ProbeMesh","searchMethod":"by_name","materialPath":"Assets/Materials/ProbeGlow.mat","slot":0,"mode":"shared"}'
```

Use only after confirming this shader exists in the target project. Reread renderer assignment and material properties after the write.

## Procedural texture or imported image

- Use `manage_texture` for deterministic fills, patterns, gradients, noise, pixel regions and importer changes. Use the generation workflow for provider-generated images; these are different tools.
- Set dimensions and destination explicitly. For importer settings, inspect `srgb`, `alpha_is_transparency`, `readable`, mipmaps, compression and sprite mode according to the asset's use.
- Do not leave CPU readability enabled just because it was needed during pixel authoring. Verify the actual importer after reimport.

```python
manage_texture(action="create", path="Assets/Textures/ProbeMask.png", width=64, height=64,
               fill_color=[1.0, 1.0, 1.0, 1.0])
```

```powershell
unity-mcp --format json raw manage_texture '{"action":"create","path":"Assets/Textures/ProbeMask.png","width":64,"height":64,"fillColor":[1.0,1.0,1.0,1.0]}'
```

## Effect workflow

1. Activate `vfx`. Inspect component type, material, repeated-component index and installed packages before editing.
2. Use the relevant prefix; action-specific parameters belong in **`properties`**, not invented top-level fields. The generic schema does not enumerate every nested key: inspect the matching action in the official tools reference or installed `ManageVFX.cs` when uncertain.
3. For particles, read current modules, modify the intended module, restart/simulate/play as needed, and observe over the relevant time interval. A single capture does not establish duration, looping or stop behavior.
4. For lines/trails, verify positions, world/local coordinate mode, width, material and time. Distinguish persistent settings from transient emitted geometry.
5. Save the intended prefab/scene and inspect its state separately from playback. Check console and capture the effect against its actual background/camera.

```python
manage_vfx(action="particle_set_main", target="ProbeSparks",
    properties={"startLifetime": 0.6, "startSpeed": 3.0, "maxParticles": 80})
manage_vfx(action="particle_play", target="ProbeSparks")
```

```powershell
unity-mcp --format json raw manage_vfx '{"action":"particle_set_main","target":"ProbeSparks","properties":{"startLifetime":0.6,"startSpeed":3.0,"maxParticles":80}}'
unity-mcp --format json vfx particle play 'ProbeSparks'
```

For CLI `vfx raw ACTION TARGET --params JSON`, `--params` represents action properties; generic `unity-mcp raw manage_vfx` instead receives the complete tool payload shown above. Do not mix these envelopes.

## VFX Graph limits

Inspect `com.unity.visualeffectgraph` and the render pipeline first. The reviewed CLI guide reports testing against VFX Graph 12.1.13; it does **not** establish compatibility with every newer Unity package. Inspect exposed properties/events and verify them in the current version. Neither `manage_vfx` availability nor group activation guarantees arbitrary graph editing support.

Sources: [VFX family](https://coplaydev.github.io/unity-mcp/reference/tools/vfx), [materials](https://coplaydev.github.io/unity-mcp/reference/tools/core/manage_material), [action examples](https://github.com/CoplayDev/unity-mcp/blob/beta/unity-mcp-skill/references/tools-reference.md), [CLI](https://coplaydev.github.io/unity-mcp/guides/cli).
