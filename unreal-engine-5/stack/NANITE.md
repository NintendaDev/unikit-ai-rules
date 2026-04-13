---
version: 1.0.0
---

# Nanite Virtualized Geometry

> **Scope**: Nanite mesh settings, enabling/disabling, material compatibility, console variables, cluster optimization, profiling, C++ API, performance guidelines, limitations
> **Load when**: enabling or troubleshooting Nanite on static meshes — adjusting cluster/raster settings, diagnosing material incompatibility, tuning r.Nanite cvars, profiling virtualized geometry performance

---

## Core Concepts

Nanite is UE5's virtualized micropolygon geometry system. It automatically manages level-of-detail by splitting meshes into **128-triangle clusters** and streaming only the detail visible at a given pixel resolution. No manual LOD setup required.

**Key classes and functions:**

| Symbol | Header / Module | Purpose |
|--------|----------------|---------|
| `FMeshNaniteSettings` | Engine | Struct holding per-mesh Nanite configuration |
| `UStaticMeshEditorSubsystem::SetNaniteSettings()` | StaticMeshEditor | Apply Nanite settings to a `UStaticMesh` in C++ |
| `UStaticMeshEditorSubsystem::GetNaniteSettings()` | StaticMeshEditor | Retrieve current Nanite settings from a mesh |
| `NaniteAtomicsSupported()` | RenderCore / RenderUtils.h | Check platform support for Nanite atomics |
| `NaniteSkinnedMeshesSupported()` | RenderCore / RenderUtils.h | Check if skinned Nanite meshes are supported |
| `NaniteSplineMeshesSupported()` | RenderCore / RenderUtils.h | Check if spline Nanite meshes are supported |
| `UseNaniteTessellation()` | RenderCore / RenderUtils.h | Check if Nanite tessellation is enabled |

## C++ API

### Setting Nanite Settings Programmatically

```cpp
#include "StaticMeshEditorSubsystem.h"

void EnableNaniteOnMesh(UStaticMesh* Mesh)
{
    if (!Mesh) return;

    FMeshNaniteSettings Settings = UStaticMeshEditorSubsystem::GetNaniteSettings(Mesh);
    Settings.bEnabled = true;
    UStaticMeshEditorSubsystem::SetNaniteSettings(Mesh, Settings, /*bApplyChanges=*/ true);
}
```

### Checking Feature Support at Runtime

```cpp
#include "RenderUtils.h"

if (NaniteAtomicsSupported())
{
    // Platform supports Nanite
}

if (NaniteSkinnedMeshesSupported())
{
    // UE 5.5+: skinned meshes supported
}
```

## Supported Features

| Feature | Status | Notes |
|---------|--------|-------|
| Static Meshes | Supported | Primary use case |
| Skinned Meshes | Supported (UE 5.5+) | GPU skinning before Nanite culling/rasterization |
| Spline Meshes | Supported | Check with `NaniteSplineMeshesSupported()` |
| Opaque materials | Supported | Best performance — batched into single raster bin |
| Masked materials | Supported | Use sparingly — more expensive than opaque |
| Tessellation | Supported | Requires `r.Nanite.AllowTessellation=1` in config |
| Virtual Shadow Maps | Supported | Works automatically |
| Lumen GI | Supported | Manually flag meshes for illumination contribution |
| Decals (projected) | Supported | Standard decal projection onto Nanite surfaces |
| World Partition | Supported | Adjust culling distance scale |

## Limitations

| Feature | Status | Notes |
|---------|--------|-------|
| Translucent materials | Not supported | Default material assigned; warning in Output Log |
| Mesh Decals | Not supported | Requires Translucent Blend Mode |
| Wireframe checkbox | Not supported | — |
| Morph Targets | Not supported | — |
| Cloth simulation | Not supported | Use non-Nanite meshes for cloth |
| Dynamic water tessellation | Not supported | Incompatible with Nanite surfaces |
| VR | Problematic | Micro-stutters cause motion sickness |
| Mobile | Limited | Only simple scenes; not production-ready |
| Vertex Interpolator / Custom UVs | Supported but expensive | Evaluated 3x per pixel |

## Console Variables

### Core Settings

| Variable | Default | Description |
|----------|---------|-------------|
| `r.Nanite.AllowTessellation` | 0 | Enable tessellation support (read-only, set in config) |
| `r.Nanite.Tessellation` | 0 | Toggle tessellation at runtime (requires AllowTessellation=1) |
| `r.Nanite.MaxPixelsPerEdge` | 1 | Controls LOD selection; higher = simpler geometry. Values >4 reduce quality significantly |
| `r.Nanite.VirtualTexturePoolSize` | — | VRAM budget cap in MB. Start at 2500 for mid-range GPU, up to 8000 for high-end |
| `r.Nanite.Streaming.PreloadAll` | 0 | Force preloading all data (loses streaming benefits) |
| `r.Nanite.ShowMeshDrawEvents` | 0 | Identify per-material costs |
| `r.Nanite.Visualize.Advanced` | 0 | View rasterization mode breakdown |

### Profiling Commands

```
stat nanite              // Nanite-specific stats (visible/culled triangles)
stat gpu                 // GPU process timing (target <16.66ms for 60 FPS)
stat scenerendering      // Scene rendering statistics
stat unitgraph           // Frame time visualization
nanite.visualize         // Debug view for culling/streaming
```

**Two main GPU passes to monitor:**
- **Nanite VisBuffer** — visibility and culling
- **Nanite BasePass** — material rendering

## Mesh Preparation

### Triangle Budget

| Asset Type | Target Triangle Count |
|------------|----------------------|
| Hero assets (close inspection) | 1M-10M+ |
| Background / mid-ground | 100K-2M |
| Distant terrain | 10K-25K per m² |
| Fallback LOD | ~10,000 (safety threshold) |

### Geometry Guidelines

- Keep triangle count under 1-2M per mesh for manageable UV workflows
- UV-continuous meshes are better — UV splits increase vertex count; aim for ~half the vertex count relative to triangle count
- Remove hidden / occluded faces before import
- Avoid long thin triangles — they cluster poorly
- Merge unnecessary micro-detail
- Convert instanced static meshes with unique vertex data to regular static meshes

### Cluster Optimization

- Nanite splits geometry into exactly **128-triangle clusters**
- Visualize clusters: **Nanite Visualization > Clusters** — target evenly-sized blocks
- Adjust `Target Triangles per Cluster` import parameter
- Ensure logical mesh splits for smooth LOD transitions

## Material Performance

Materials ranked from best to worst performance:

1. **Opaque, no offsets** — fastest; all batch into a single raster bin
2. **Opaque with minimal WPO** — good performance
3. **Masked materials** — acceptable; use sparingly
4. **Complex deformation (heavy WPO/PDO)** — slowest; each deformed material gets its own raster bin

### Rasterization Paths

| Mode | Color in Visualization | Best For | Notes |
|------|----------------------|----------|-------|
| Software Raster | Blue | Triangles < 1 pixel | Fast (compute-optimized) |
| Hardware Raster | Red | Triangles > 1 pixel | Slower for small-scale triangles |

Target: most geometry should render in software raster (blue). Red regions indicate expensive fallback.

### Material Optimization

- Minimize deformation materials — they cannot batch, each creating separate raster bin passes
- Group similar deformed materials spatially to reduce bin switching
- Bake static deformations into geometry instead of using WPO
- Merge similar deformation materials where possible
- Replace opacity masks with fully opaque materials when visual difference is negligible

## Memory Management

| GPU Tier | Recommended Pool Size |
|----------|----------------------|
| Mid-range (RTX 4070 level) | 2048-2560 MB |
| High-end (RTX 4080+) | 4096-8192 MB |
| Large detail-heavy scenes | Start at 1024 MB, increase to 2048+ |

- NVMe SSD is mandatory — SATA SSDs cause visible pop-in artifacts
- Thousands of small Nanite meshes consume resources even when off-screen

## Best Practices

- Use Nanite selectively — mid-ground static geometry benefits most; foreground can use regular meshes, distant can use impostors
- Profile early and continuously with `stat nanite` and `stat gpu` — do not defer to end of project
- Test in full production levels, not just small test maps — assets that work in isolation may break at scale
- Manually adjust World Partition culling distances — default loading can pull in distant meshes unnecessarily
- Manually flag meshes for Lumen illumination contribution vs. receive-only
- Keep material instruction counts reasonable — complex shader layering negates geometry optimization

## Anti-patterns

- **All-or-nothing approach** — enabling Nanite on every mesh universally instead of strategic per-zone deployment
- **Ignoring raster bins** — using many unique deformation materials without checking bin count overhead
- **Skipping profiling** — relying on editor preview without `stat nanite` / `stat gpu` verification
- **Excessive small objects** — thousands of tiny Nanite meshes still consume tracking resources
- **Mixing old lighting with Nanite** — shadows become inconsistent when combining legacy shadow methods with Nanite-heavy scenes
- **Over-reliance for animation** — attempting character deformation or cloth with Nanite produces artifacts
- **Ignoring memory budgets** — not setting `r.Nanite.VirtualTexturePoolSize` leads to VRAM spikes
- **Late-stage testing** — importing assets without checking draw calls; discovering performance issues only in full levels
