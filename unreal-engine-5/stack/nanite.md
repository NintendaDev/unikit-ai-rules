---
version: 1.0.0
---

# Nanite

> **Scope**: UE5 Nanite virtualized geometry system — enabling Nanite on assets, supported mesh and component types, material restrictions, World Position Offset clamping, fallback mesh configuration, C++ support APIs, console variables, visualization modes, and performance budgeting.
> **Load when**: enabling or disabling Nanite on static meshes or geometry collections, authoring Nanite-compatible materials, configuring WPO displacement clamping, profiling Nanite rendering passes, debugging Nanite culling or cluster artifacts, choosing between Nanite and traditional LODs, setting up Nanite for foliage or landscapes, integrating Nanite with Lumen or Virtual Shadow Maps.

---

## Core Concepts

Nanite is a **virtualized geometry system** — a separate rasterization path inside UE5 that runs alongside the legacy path. It divides meshes into fixed **128-triangle clusters** organized in hierarchical multi-level cluster trees, enabling smooth, pop-free LOD transitions without manual LOD authoring.

**Rendering pipeline:**
1. **GPU culling** — frustum culling, hierarchical Z-buffer occlusion, backface, and small-feature rejection.
2. **Visibility Buffer pass** — records triangle ID, material ID, and barycentric coordinates for each visible pixel.
3. **Deferred material pass** — shades only visible pixels; material is evaluated once per pixel, not per triangle.
4. **Streaming** — cluster pages are streamed between system RAM and VRAM based on screen contribution.

**Two rasterization paths:**
- **Software rasterizer** (compute-driven) — handles triangles with screen-space edges under ~32 pixels. Should dominate a healthy scene.
- **Hardware rasterizer** — handles larger triangles near the camera. Expensive for sub-pixel geometry.

In Nanite visualization, software raster shows as **blue**, hardware raster as **red**. Optimization goal: maximize blue.

---

## Supported Asset Types & Components

**Assets that can have Nanite enabled:**
- `UStaticMesh`
- `UGeometryCollection` (Chaos fracture meshes)
- `USkeletalMesh` (UE 5.5+, stable)

**Component types that work with Nanite-enabled assets:**
- `UStaticMeshComponent`
- `USkeletalMeshComponent`
- `UInstancedStaticMeshComponent`
- `UHierarchicalInstancedStaticMeshComponent`
- `USplineMeshComponent`
- `UGeometryCollectionComponent`
- Foliage painter
- Landscape grass

**Not suitable for Nanite:**
- VR applications — streaming latency causes motion sickness.
- Small objects requiring precise collision data — use traditional meshes.
- Transparent/translucent geometry — unsupported blend mode.

---

## Enabling Nanite on Assets

**Individual mesh (editor):**
- Static Mesh Editor → Details → **Nanite Settings** → check **Enable Nanite Support**.
- Geometry Collections Editor → Details → **Nanite** → check **Enable Nanite**.

**Batch enable (Content Browser):**
Select multiple Static or Skeletal Mesh assets → right-click → **Nanite > Enable**.

**Disable Nanite per component (C++/Blueprint):**
Use the `SetForceDisableNanite` Blueprint node (available in UE 5.7+) or set the **Disallow Nanite** option on the `UStaticMeshComponent`.

**Runtime feature detection (from `RenderUtils.h`):**
```cpp
bool NaniteAtomicsSupported();          // atomics support (required for Nanite)
bool NaniteSkinnedMeshesSupported();    // skinned mesh Nanite support
bool NaniteSplineMeshesSupported();     // spline mesh Nanite support
bool NaniteWorkGraphMaterialsSupported(); // Work Graph materials support
```

Always call these before enabling Nanite-specific code paths on console or older hardware.

---

## Material Restrictions

Nanite supports only **Opaque** and **Masked** blend modes.

| Feature | Supported |
|---------|-----------|
| Opaque blend mode | Yes |
| Masked blend mode | Yes (use sparingly — see Anti-patterns) |
| Translucent blend mode | **No** — default material assigned, warning in Output Log |
| Mesh Decals (Translucent) | **No** |
| Decals projected onto surface | Yes |
| Wireframe checkbox | **No** |
| Vertex Interpolator node | Yes — evaluated **3× per pixel** (expensive) |
| Custom UVs | Yes — evaluated **3× per pixel** (expensive) |

When an unsupported material is detected, Nanite assigns a default material and logs a warning. Audit the Output Log after adding materials to Nanite meshes.

---

## World Position Offset & Displacement

WPO is supported on Nanite meshes but has important implications:

- Nanite meshes are split into small clusters, each with **individual GPU-side bounds**. WPO that moves geometry outside a cluster's bounds causes **culling artifacts** (geometry disappears).
- Each WPO material creates its **own raster bin** — multiple WPO materials multiply rendering pass overhead.

**Always clamp WPO displacement:**
In the material or material instance, set **Max World Position Offset Displacement** (under Details → World Position Offset or Material Property Overrides). This caps how far WPO can shift geometry and prevents culling artifacts.

**Displacement priority (best → worst performance):**
1. Opaque, no offsets
2. Opaque with minimal WPO
3. Masked materials
4. Heavy WPO / Pixel Depth Offset / displacement — worst, separate raster bin per material

**Bake static deformation into geometry** instead of computing it in shaders wherever possible.

---

## Fallback Mesh

Nanite automatically generates a **fallback mesh** used when Nanite rendering is unavailable (unsupported hardware, fallback rendering modes, ray tracing shadow geometry).

**Fallback build settings (`FRayTracingFallbackBuildSettings` from `NaniteBuilder.h`):**
```cpp
struct FRayTracingFallbackBuildSettings
{
    float FallbackPercentTriangles;  // target triangle reduction percentage
    float FallbackRelativeError;     // relative error tolerance
    float FoliageOverOcclusionBias;  // bias for foliage occlusion

    bool IsFallbackReduced();
};
```

**Recommended fallback triangle count:** ~10,000 triangles for typical static meshes.

Use **Custom Fallback Mesh LODs** for assets where auto-generated fallback is inadequate (e.g., assets with complex silhouettes critical to gameplay collisions).

---

## Console Variables

| CVar | Purpose |
|------|---------|
| `r.Nanite 0` | Globally disable Nanite (must re-run each editor launch) |
| `r.Nanite.VirtualTexturePoolSize` | VRAM budget for Nanite streaming pool (default: 4 GB; limit to ~2.5 GB on mid-range GPUs) |
| `r.Nanite.Streaming.PreloadAll` | Force pre-load all clusters (reduces streaming benefits, increases memory usage) |
| `r.Nanite.Visualize.Advanced 1` | Enable advanced visualization options for low-level debugging |
| `r.nanite.showmeshdrawevents 1` | Show which materials consume GPU time |

**Global disable (Project Settings):** Edit → Project Settings → Engine → Rendering → Nanite → uncheck.

**Resize streaming pool at runtime:**
```
r.Nanite.VirtualTexturePoolSize <MB>
```

---

## Visualization & Debugging

**Nanite visualization mode** (Viewport → View Mode → Nanite Visualization, or `nanite.visualize`):
- **Clusters** — cluster LOD heatmap; look for evenly-sized blocks. Oversized = fill-rate waste; fragmented = VRAM inflation.
- **Rasterization mode** — red = hardware raster (expensive near camera), blue = software raster (target state).
- **VSM static cache** — identifies objects incorrectly invalidating Virtual Shadow Maps static cache.

```cpp
// Change visualization mode from C++ (Editor only)
FNaniteVisualizationMenuCommands::ChangeNaniteVisualizationMode(WeakViewportClient, ModeName);

// Check current mode
FNaniteVisualizationMenuCommands::IsNaniteVisualizationModeSelected(WeakViewportClient, ModeName);
```

**Profiling commands:**
```
stat gpu              // GPU pass timing in milliseconds
stat scenerendering   // scene rendering statistics
stat unitgraph        // frame time visualization
Nanite.Stats          // Nanite-specific draw call and cluster counts
```

**Key GPU passes to profile:**
- `Nanite VisBuffer` — visibility and culling (HZB, primitives, instances, clusters)
- `Nanite BasePass` — material shading of visible pixels
- `Material Classification` — material binning overhead

---

## Performance Guidelines

**Material binning:** Nanite groups non-deformed opaque materials into a single raster bin. Deformed materials (WPO, PDO, displacement, masked) each require a **separate raster bin**, multiplying rendering passes. Batch deformed materials spatially to reduce bin switching.

**Instance count vs. triangle count:** Reducing instance count saves more VRAM than reducing triangle detail. Root clusters remain resident regardless of distance. Thousands of off-screen Nanite instances still drain resources.

**Memory budgeting per platform:**
- Always set `r.Nanite.VirtualTexturePoolSize` explicitly per target platform.
- Mid-range GPU (RTX 4070 class): limit pool to ~2.5 GB.
- SSD speed matters for open worlds — NVMe required; SATA drives cause streaming stutters.

**Cluster optimization workflow:**
1. Profile with `stat gpu` and `stat scenerendering`; record VisBuffer and BasePass costs.
2. Enable Rasterization Mode visualization; identify red zones near camera.
3. Audit deformation materials; merge similar effects; replace masked with opaque where possible.
4. Batch spatially similar deformed materials.
5. Validate with `stat unitgraph`; confirm <16.66 ms at 60 FPS target.

**Foliage:** Material bin overhead and overdraw make foliage expensive with Nanite. Monitor closely.

**Niagara particles:** Particle collisions fail against Nanite geometry — provide separate simplified collision meshes alongside Nanite assets.

**Virtual Shadow Maps:** Use simplified collision meshes for stable VSM shadow casting.

---

## Best Practices

- **Use Nanite for:** high-poly static architecture, photogrammetry, scan data, terrain, environmental props with 100K+ triangles.
- **Hybrid workflow:** Nanite handles static/rigid environmental assets; traditional LOD meshes handle dynamic, deformable, or VR content.
- **Foreground objects with collision:** keep as traditional meshes — Nanite doesn't simplify collision generation.
- **Disable lightmap UV generation** for Nanite assets when using Lumen + Virtual Shadow Maps (lightmaps not needed; reduces import time).
- **Clamp WPO displacement** via Max World Position Offset Displacement on every material applied to Nanite meshes.
- **Test on mid-range hardware** — Nanite's benefits vary significantly across GPU tiers.
- **Import setting:** check Build Nanite during import for new high-poly assets; enable for new projects by default.
- **Nanite Pass Switch node:** use in materials to provide alternate logic for the Nanite rasterization path vs. legacy path.

---

## Anti-patterns

- **Masked materials on everything** — each masked material gets its own raster bin; costs explode with many unique masked meshes.
- **Nanite on insignificant details** — door handles, screws, bolts rarely benefit; they're rarely the bottleneck and add instance overhead.
- **No WPO clamping** — causes visible cluster culling artifacts (geometry popping in and out) on animated or wind-affected Nanite meshes.
- **Over-triangulating flat surfaces** — kills cluster efficiency; flat faces collapse poorly in Nanite's LOD hierarchy.
- **Messy topology / random edge flow** — inconsistent triangle density creates fragmented clusters and inflates VRAM.
- **Using Nanite for VR** — latency from cluster streaming is incompatible with VR comfort requirements.
- **Assuming infinite detail = zero optimization** — Nanite reduces *geometry* cost, not material/shader cost. Expensive materials still tank framerate.
- **Neglecting SSD speed in open worlds** — SATA drives cause streaming stutters that cannot be solved by reducing polygon counts.
- **Enabling Nanite on translucent meshes** — silently falls back to default material; always check Output Log after enabling.