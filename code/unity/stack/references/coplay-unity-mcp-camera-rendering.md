# Coplay Unity MCP — Cameras, captures and rendering

| Goal | MCP | CLI |
|---|---|---|
| Discover cameras/Brain | `mcpforunity://scene/cameras`; `manage_camera`: `ping`, `list_cameras`, `get_brain_status` | `camera ping/list/brain-status` |
| Configure camera | `create_camera`, `set_target`, `set_lens`, `set_priority` | `camera create/set-target/set-lens/set-priority` |
| Cinemachine pipeline | `ensure_brain`, `set_body`, `set_aim`, `set_noise`, extensions/blends | Corresponding `camera` commands |
| Capture Game/Scene view | `screenshot`, `screenshot_multiview` | `camera screenshot`, `camera screenshot-multiview` |
| Pipeline/features/volumes | `manage_graphics` | `graphics ...` |
| Bake lightmaps/probes | `manage_graphics` `bake_*` | `graphics bake-*` |
| Create a light | Object/component tools | `lighting create` |

## Capture the right evidence

- For final UI, use the Game view/ScreenCapture path **without** `camera`. Direct camera rendering excludes Screen Space Overlay canvases.
- Use `capture_source="scene_view"` to inspect the editor viewport and gizmos, not as proof of player presentation.
- `include_image=true` provides inline image content; a path-only response must be opened before visual judgment. Start with 256–640 inline pixels on the long edge; increase detail for text/layout only when needed.
- `batch="surround"` produces six viewpoints; `orbit` uses a configurable angular/elevation grid. `screenshot_multiview` is the surround shorthand with inline content. These are geometry inspections, not six independent UI layouts.
- Use `view_target` and a temporary capture viewpoint instead of changing the gameplay camera just to inspect an asset. `view_rotation` overrides target aiming when both are supplied.
- Route output to the intended artifact directory inside the project when appropriate. Avoid unintentionally importing many screenshots under Assets.

```python
manage_camera(action="screenshot", include_image=True, max_resolution=640,
              output_folder="Captures")
manage_camera(action="screenshot", capture_source="scene_view", view_target="ProbeMesh",
              include_image=True, max_resolution=512, output_folder="Captures")
```

```powershell
unity-mcp --format json camera screenshot --include-image --max-resolution 640 --output-folder Captures
unity-mcp --format json camera screenshot --capture-source scene_view --view-target ProbeMesh --include-image --max-resolution 512 --output-folder Captures
```

CLI `--camera-ref` maps to tool `camera`; `--file-name` maps to `screenshot_file_name`; `--super-size` maps to `screenshot_super_size`. Use generic raw dispatch for `view_position`, `view_rotation` or `orbit_*` fields not exposed by wrappers.

## Camera control

- Read camera and Brain state first. Basic camera operations can work without Cinemachine; Brain/pipeline/extensions/blending require the installed Cinemachine package and compatible types.
- Inspect action-specific `properties`; lens values belong there, rather than inventing top-level `fov`. Match the real camera's projection, clipping and target references.
- If forcing a camera for inspection, call `release_override` afterward and verify normal Brain selection resumes. Save only intended authoring changes.

Example lens change after resolving the camera uniquely:

```python
manage_camera(action="set_lens", target="PreviewCamera", properties={"fieldOfView": 45})
```

```powershell
unity-mcp --format json camera set-lens 'PreviewCamera' --fov 45
```

## Rendering and baking

1. Use `manage_graphics(action="ping")`/`pipeline_get_info`, inspect active quality and pipeline. Inspect `mcpforunity://scene/volumes` and `mcpforunity://pipeline/renderer-features` when relevant.
2. For volumes, choose the intended shared/embedded profile; inspect effects and override flags before tuning. Changing a shared profile has wider scope than one volume instance.
3. Use `feature_list` before URP feature changes; feature indices/order can change after mutation. Rediscover them before subsequent indexed operations.
4. Bake in **Edit Mode**. Configure only intended settings, start once, poll `bake_status`, then inspect outputs and console. A queued bake is not completed lighting.
5. Treat quality/pipeline/environment changes as persistent project changes when they are; follow project restrictions on settings.

```python
manage_graphics(action="volume_get_info", target="PostProcessing")
manage_graphics(action="volume_set_effect", target="PostProcessing", effect="Bloom",
                parameters={"intensity": 0.8})
```

```powershell
unity-mcp --format json graphics volume-info --target PostProcessing
unity-mcp --format json graphics volume-set-effect --target PostProcessing --effect Bloom -p intensity 0.8
```

For skybox/ambient/fog/reflection/sun, inspect `skybox_get` then use the matching `skybox_set_*` action. For performance evidence, use [profiling](coplay-unity-mcp-profiling.md); a rendering counter snapshot is not a timing benchmark.

Sources: [camera](https://coplaydev.github.io/unity-mcp/reference/tools/core/manage_camera), [graphics](https://coplaydev.github.io/unity-mcp/reference/tools/core/manage_graphics), [CLI capture options](https://coplaydev.github.io/unity-mcp/guides/cli).
