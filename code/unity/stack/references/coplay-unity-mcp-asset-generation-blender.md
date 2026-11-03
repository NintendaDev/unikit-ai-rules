# Coplay Unity MCP — Asset generation, import and Blender

| Goal | MCP | CLI |
|---|---|---|
| Generate image | `generate_image` | `asset-gen generate-image`, raw for exact options |
| Generate 3D model | `generate_model` | `asset-gen generate-model` |
| Generate sound/music | `generate_audio` | `asset-gen generate-audio` |
| Search/preview/import Sketchfab | `import_model` | `asset-gen import-model` or raw |
| Import an existing on-disk model | `import_model_file` | `asset-gen import-model-file` or raw |
| Read/operate running Blender | `blender_bridge` | `blender ...` or raw |

## Provider generation is an async workflow

- CLI raw uses Unity wire fields: generation `outputFolder`/`jobId`, local import `sourcePath`/`targetSize`/`animationType`, Blender `objectNames`/`placeInScene`/`autoAnimate`/`savePrefab`/`ensureBloom`. These differ from direct MCP snake_case parameters. A generic raw call does not execute Python adapter conversions.
1. Activate `asset_gen`; inspect `list_providers` on the relevant tool and `list_models` for current capabilities. Provider keys remain in the Editor's configured store; do not request keys in prompts or send them through tool payloads.
2. Choose the actual model/mode/format returned by discovery, or deliberately use the Editor's selected default by omitting `model`. Catalog refresh can continue in the background; requery while `catalogs[].refreshing` is true, following limit/offset paging.
3. Submit one job with the intended name/output folder and retain `job_id`. Poll **the same tool's** `status` action; do not assume an image job is a model/import job.
4. Wait for a terminal result and imported `assetPath`, inspect any error, then inspect the actual imported asset and importer. Provider completion without successful import is not a usable Unity asset.
5. On timeout, poll the existing ID before resubmission. Use the matching `cancel` action if cancellation is requested.

Example: image request after provider/model discovery.

```python
generate_image(action="list_providers")
generate_image(action="list_models", search="texture", limit=10, offset=0)
generate_image(action="generate", provider="fal", mode="text",
    prompt="Seamless slate tile texture, orthographic lighting, no text",
    name="SlateTile", output_folder="Assets/Art/Generated", width=512, height=512)
generate_image(action="status", job_id="returned-image-job-id")
```

```powershell
unity-mcp --format json raw generate_image '{"action":"list_providers"}'
unity-mcp --format json raw generate_image '{"action":"list_models","search":"texture","limit":10,"offset":0}'
unity-mcp --format json raw generate_image '{"action":"generate","provider":"fal","mode":"text","prompt":"Seamless slate tile texture, orthographic lighting, no text","name":"SlateTile","outputFolder":"Assets/Art/Generated","width":512,"height":512}'
unity-mcp --format json raw generate_image '{"action":"status","jobId":"returned-image-job-id"}'
```

The provider in the example must actually be configured. Do not invoke a generation example merely to test connectivity.

## Capability limits that affect acceptance

- In the reviewed image implementation, `transparent=true` sets the importer alpha-transparency flag; it **does not generate a transparent background**. Inspect alpha pixels. `remove_background` is explicitly unsupported in this snapshot.
- Model providers and formats differ: the reviewed fal model path supports GLB. Discover before selecting output formats, tiers or model versions; do not pin a fashionable model name as a rule.
- `generate_audio` currently documents fal, a discovered model, prompt and requested duration. Duration is constrained by model capability. Imported AudioClip existence proves neither audible quality nor exact requested length; inspect metadata and obtain listening evidence when quality matters.
- Sketchfab workflow is `search` → `preview` → `import` → `status`. Preview includes license, topology and thumbnails; use those facts to choose a suitable downloadable model instead of blindly importing search result 1.

## Local DCC model import

`import_model_file` copies an existing file into Assets and returns `asset_path`/`asset_guid`; it is distinct from the async generation/marketplace tools.

```python
import_model_file(source_path="D:/ArtExports/Probe.fbx", name="Probe",
    output_folder="Assets/Art/Models", target_size=1.5, animation_type="generic")
```

```powershell
unity-mcp --format json raw import_model_file '{"sourcePath":"D:/ArtExports/Probe.fbx","name":"Probe","outputFolder":"Assets/Art/Models","targetSize":1.5,"animationType":"generic"}'
```

- Set `animation_type="generic"` or `"humanoid"` for rigged FBX when clips are required; omitted/`none` can import zero clips. `legacy` is a different animation system. GLB/glTF ignore that option and require glTFast support.
- For multi-file exports, use a ZIP containing the `.gltf` + `.bin` or `.obj` + `.mtl`/textures. A bare source file is copied without sidecars.
- Verify resulting bounds, scale, materials, rig and clips. `target_size` normalizes the largest dimension in meters; it is not an arbitrary multiplier.

## Blender bridge

1. `blender_bridge(action="status")` checks the running Blender addon connection. Unity communicates with that addon directly; another BlenderMCP client is not required.
2. Use `scene_info`/`object_info` before export and explicit object names or deliberate selection. Omitted selection/object filters can export the whole scene.
3. `import_model` can export, import, place, normalize, auto-create animation, save a prefab and enable bloom. Set these options deliberately; avoid unrelated camera/volume/controller changes from defaults.
4. For skinned meshes/shape keys, use `apply_modifiers=false` when required by the export. For FBX animation, set `animation_type`; GLB handles animation through its importer.
5. Use `compare_screenshot` for visual fidelity, then inspect scale/material/rig data. Inspect saved prefab and animation assets separately from the placed instance.

```python
blender_bridge(action="status")
blender_bridge(action="import_model", object_names=["Probe"], format="glb", name="Probe",
    output_folder="Assets/Art/Models", target_size=0, place_in_scene=False,
    auto_animate=False, save_prefab=False, ensure_bloom=False)
```

```powershell
unity-mcp --format json blender status
unity-mcp --format json raw blender_bridge '{"action":"import_model","objectNames":["Probe"],"format":"glb","name":"Probe","outputFolder":"Assets/Art/Models","targetSize":0,"placeInScene":false,"autoAnimate":false,"savePrefab":false,"ensureBloom":false}'
```

`run_python` executes inside Blender; inspect code and its side effects. `check_updates` fetches a configured addon checkout; `sync_addon` writes the installed addon and requires a Blender restart. These are maintenance actions, not prerequisite steps for every import.

Sources: [asset generation family](https://coplaydev.github.io/unity-mcp/reference/tools/asset_gen), [image limits](https://coplaydev.github.io/unity-mcp/reference/tools/asset_gen/generate_image), [local import](https://coplaydev.github.io/unity-mcp/reference/tools/asset_gen/import_model_file), [Blender options](https://coplaydev.github.io/unity-mcp/reference/tools/asset_gen/blender_bridge), [CLI](https://coplaydev.github.io/unity-mcp/guides/cli).
