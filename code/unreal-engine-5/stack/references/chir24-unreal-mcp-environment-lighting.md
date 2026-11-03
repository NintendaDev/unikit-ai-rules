# ChiR24 Unreal MCP — Environment and lighting

| Outcome | Discover in `build_environment` |
|---|---|
| Terrain | `create_landscape`, `sculpt`, `edit_landscape`, `erode_landscape` |
| Vegetation | `create_foliage_type`, `configure_foliage`, `add_foliage`, `get_foliage_instances` |
| Roads and modular construction | `plan_road`, `create_spline`, `edit_spline`, `configure_spline_meshes`, `assemble_modules` |
| Sky/weather/water | `configure_atmosphere`, `create_weather_system`, `configure_weather`, `create_water_body`, `configure_water` |
| Lights and lighting model | `create_light`, `create_sky_light`, `configure_lighting`, `configure_lightmass`, `build_lighting` |
| Exposure/bloom/color/DOF | `configure_post_process` |
| Captures/reflections | `create_capture_actor`, `configure_scene_capture` |

## Build a terrain slice

```json
{"operation":"search","query":"create landscape","tool":"build_environment","limit":2}
```

Create terrain at a defined size, scale and elevation; read its component/layout requirements from the contract. Inspect its bounds before shaping a region. Import heightmaps only after checking dimensions, axis/height interpretation and destination.

Sculpt/paint a bounded area, inspect the visible result and material/layer assignments, then save the map and generated assets. A layer name without its layer-info/material setup is insufficient. For erosion use supported previews and inspect resulting terrain/rivers before committing the next stage.

For a road: find endpoints → request a slope-aware plan → inspect the returned route → follow the appropriate construction `nextCall` or landscape-spline call. Shape uphill terrain to a road where needed; raising an intersecting slab can create floating geometry elsewhere.

For foliage: resolve the mesh/type, density, placement/collision and culling rules; place a small region first; inspect instance counts and distribution. Keep an owned tag/region for later cleanup rather than invoking broad removal.

## Tune lighting without hiding the cause

```json
{"operation":"search","query":"configure exposure","tool":"build_environment","limit":3}
```

Distinguish per-light properties, post-process-volume overrides and project rendering methods. The first two belong here; project Lumen/ray-tracing/AA settings belong in [builds-performance](chir24-unreal-mcp-builds-performance.md).

1. Record the camera/view mode, light and post-process values before changing them.
2. Confirm the intended volume bounds, priority, blend weight and override flags; an unbound volume can affect the whole world.
3. Control exposure for a before/after comparison, or measure through `inspect.analyze_view`. Automatic exposure can hide an albedo/intensity change.
4. Read back light channels, shadow/mobility and relevant material/receiver settings. Judge at the intended viewpoint and renderer.
5. A lighting-build request needs its final outcome; a completed call is not evidence that static lighting or Lumen is configured as intended. Check diagnostics and the result.

## Capture and water checks

Scene capture setup is capture actor → render target asset → assignment → source/resolution → capture → inspect the produced image. Avoid confusing a viewport screenshot with the render target's contents. Validate any exported file at its actual path.

Water/weather actors can require optional engine plugins and associated material/volume/runtime wiring. Inspect availability first; then verify visibility, bounds and behavior in the relevant editor or PIE world. Creation alone does not prove swimming, buoyancy or weather timing.

Sources: [Roadmap phases 26–29](https://github.com/ChiR24/Unreal_mcp/blob/dev/docs/Roadmap.md), [action reference](https://github.com/ChiR24/Unreal_mcp/blob/dev/docs/action-reference.generated.md), [world-building playbook](https://github.com/ChiR24/Unreal_mcp/blob/dev/plugins/EngineWire/Source/EngineWire/Private/MCP/Primitives/McpPromptPlaybooks.cpp). Roadmap phase 29 explicitly lacks its full live-acceptance record; verify the actual task.
