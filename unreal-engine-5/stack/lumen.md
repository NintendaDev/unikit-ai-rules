---
version: 1.0.0
---

# Lumen Global Illumination & Reflections

> **Scope**: Lumen GI and reflections system — software/hardware ray tracing, surface cache, mesh cards, distance fields, console variables, Post Process Volume settings, scalability, material compatibility, performance optimization
> **Load when**: configuring or troubleshooting Lumen global illumination and reflections — choosing between software and hardware ray tracing, tuning Post Process Volume settings like Max Trace Distance and Final Gather Quality, adjusting r.Lumen cvars, diagnosing surface cache and mesh card issues, and profiling Lumen GPU cost

---

## Core Concepts

Lumen is UE5's default dynamic global illumination and reflection system. It combines a **Surface Cache** (card-based low-resolution lighting representation) with ray tracing to deliver real-time GI and reflections.

**Pipeline:**
1. **Screen Traces** — fast screen-space pass for visible geometry
2. **Ray Tracing** — software (SDF) or hardware (BVH) for off-screen and occluded geometry
3. **Surface Cache** — results cached on mesh cards for frame-to-frame reuse
4. **Final Gather** — combines direct + cached indirect lighting

**Two ray tracing modes:**

| Mode | How It Works | When to Use |
|------|-------------|-------------|
| Software Ray Tracing (SRT) | Traces against Signed Distance Fields; SM5+ hardware | 60 FPS target, broad platform support |
| Hardware Ray Tracing (HRT) | Full BVH tracing via RT cores; sharper results | 30 FPS quality mode, RTX/RDNA2+ GPUs |

## Enabling & Configuration

### Project Settings (Required)

- **Generate Mesh Distance Fields** — must be enabled for Software Ray Tracing
- **Support Hardware Ray Tracing** — must be enabled for Hardware Ray Tracing

### Core Console Variables

```ini
# GI method selection
r.DynamicGlobalIlluminationMethod=1          # 1 = Lumen GI

# Ray tracing mode
r.Lumen.HardwareRayTracing=0                 # 0 = Software, 1 = Hardware

# Software ray tracing detail
r.Lumen.TraceMeshSDFs=1                      # 1 = Detail Tracing (Epic), 0 = Global Tracing only (High)

# Tessellation (Nanite integration)
r.Nanite.AllowTessellation=1                 # Config-only, read-only at runtime

# Visualization & debugging
r.Lumen.Visualize.CardPlacement=1            # Show mesh card placement
```

### Scalability Levels

| Level | GI | Reflections | Target |
|-------|----|-------------|--------|
| Epic | Detail Tracing (`TraceMeshSDFs=1`) | Full quality, Hit Lighting optional | 30 FPS / ~8ms at 1080p |
| High | Global Tracing only (`TraceMeshSDFs=0`) | Standard | 60 FPS |
| Medium | Disabled — fallback to SSGI/DFAO | Disabled — fallback to SSR | Lower-end |
| Low | Disabled | Disabled | Minimum spec |

## Reflection Settings

### Console Variables

| Variable | Purpose | Notes |
|----------|---------|-------|
| `r.Lumen.Reflections.Allow` | Enable/disable Lumen reflections | `0` falls back to SSR |
| `r.Lumen.Reflections.MaxRoughnessToTrace` | Roughness threshold for ray tracing | Surfaces above threshold use final gather (cheaper) |
| `r.Lumen.Reflections.MaxRoughnessToTraceForFoliage` | Foliage roughness threshold | Default `0` (no foliage reflection tracing) |
| `r.Lumen.Reflections.MaxBounces` | Override max reflection bounces | Requires HRT; default via Post Process |
| `r.Lumen.Reflections.HardwareRayTracing.Bias` | HRT reflection ray bias | UE 5.6+; improves reflection accuracy |
| `r.Lumen.Reflections.HardwareRayTracing.NormalBias` | HRT normal bias | UE 5.6+ |
| `r.Lumen.TranslucencyReflections.FrontLayer.Allow` | Translucent surface reflections | — |

### Hit Lighting for Reflections

- Provides highest reflection quality — sharp mirrors require this
- Expensive; recommended only for Epic scalability on high-end PCs
- Automatically enabled when using Lumen Reflections without Lumen GI (UE 5.3+, requires HRT)

### Standalone Reflections (UE 5.3+)

Lumen Reflections can operate **without Lumen GI** on static-lit projects. Requires Hardware Ray Tracing enabled.

## GI Settings

### Console Variables

| Variable | Purpose | Notes |
|----------|---------|-------|
| `r.Lumen.ScreenProbeGather.ShortRangeAO` | Short-range contact AO | High-frequency ambient occlusion |
| `r.Lumen.DiffuseIndirect.SSAO` | SSAO with Lumen | `1` = enable alongside Lumen |
| `r.Lumen.ScreenProbeGather.Software` | Force software tracing | `1` = force SRT mode |

### Post Process Volume Settings

| Setting | Default | Recommended | Impact |
|---------|---------|-------------|--------|
| Max Trace Distance | 10,000 | 2,000 (interiors) | Biggest single perf win |
| Indirect Lighting Intensity | 1.0 | 0.3–0.5 | Minimal visual loss, ~15ms gain possible |
| Indirect Lighting Smoothness | 1.0 | 0.3–0.5 | Below 0.3 causes banding |
| Final Gather Quality | High | Medium | 2–5ms savings |
| Screen Trace Interval | 1 pixel | 2–3 pixels | Saves GPU in motion-heavy scenes |

## Software Ray Tracing Details

### Distance Field Tracing

- **Detail Tracing** (default/Epic) — traces against per-mesh SDF for first 2 meters, then Global Distance Field for the rest
- **Global Tracing** (High) — traces against Global Distance Field only (faster, lower quality)
- Configure via Project Settings: **Software Ray Tracing Mode**

### Geometry Support (SRT)

| Geometry Type | Supported | Notes |
|---------------|-----------|-------|
| Static Mesh | Yes | Primary use case |
| Instanced Static Mesh | Yes | — |
| HISM | Yes | — |
| Landscape | Yes | Heightfield representation |
| Foliage | Yes | Must enable `Affect Distance Field Lighting` in Foliage Tool |
| Skeletal Mesh | No | Not represented in Lumen Scene (SRT) |

### Material Limitations (SRT)

- **World Position Offset (WPO)** — not supported in SRT
- **Translucent materials** — receive diffuse GI only via Lumen card when using Hit Lighting
- Distance fields are built from the **Static Mesh Asset's** material, not component overrides — overriding with a different Blend Mode or Two-Sided flag causes SDF mismatch
- Wireframe mode not supported

### Geometry Requirements (SRT)

- Levels must use **modular geometry** — walls, floors, ceilings as separate meshes
- Large single meshes (mountains, multi-story buildings) produce poor SDF representation causing self-occlusion artifacts
- Walls must be **no thinner than 10 cm** to avoid light leaking
- SDFs cannot represent extremely thin features or one-sided meshes seen from behind — use closed geometry
- Mesh Distance Field resolution is based on **imported scale**, not component scale — if scaling up, set resolution in Static Mesh Editor Build Settings
- Non-uniform scaling handled poorly (mirroring ok; 2x scale generally unnoticeable)

## Hardware Ray Tracing Details

- Uses full BVH ray tracing on supported GPUs (NVIDIA RTX, AMD RDNA2+)
- Sharper results, reduces seams from screen-space dependence
- Higher VRAM consumption
- UE 5.6 optimizations match SRT frame budgets on current-gen hardware, freeing CPU resources for 60 Hz
- Not always faster than SRT — test both per scene type (e.g., complex interiors may be slower with HRT)

## Performance Budget

| Metric | Target |
|--------|--------|
| Total Lumen cost | < 8ms at 1080p (Epic quality on next-gen consoles) |
| Warning threshold | > 6ms consistently → revisit scene scale, cache resolution, materials |
| 60 FPS budget | Use High scalability + SRT |
| 30 FPS budget | Epic scalability + HRT optional |

### Profiling Commands

```
stat lumen              // Lumen-specific breakdown (GI, reflections, screen traces)
stat gpu                // GPU cost per pass
r.Lumen.Visualize       // Cache + tracing visualization
r.Lumen.Visualize.CardPlacement 1  // Show mesh card placement
r.Lumen.ShowMeshDrawEvents 1       // Per-material costs (if available)
```

Profile during **gameplay with camera movement**, not static viewport — Lumen cost depends on temporal reprojection and camera velocity.

## Material Guidelines

**Performance ranking (best to worst):**
1. **Opaque, no WPO** — best Lumen performance
2. **Opaque with minimal WPO** — acceptable (HRT only for WPO)
3. **Masked** — more expensive; use sparingly
4. **Translucent** — limited GI support; receives diffuse GI via cards with Hit Lighting only

**Rules:**
- Mark glass as `Affect Dynamic Indirect Lighting = false` unless it needs to cast colored light
- Enable `Affect Distance Field Lighting` on foliage materials (off by default)
- Keep material instruction counts reasonable — complex shaders negate GI optimization
- Bake static deformations into geometry rather than using WPO

## Mesh Cards & Surface Cache

- Lumen places **lighting data cards** over scene surfaces at screen-relevant resolution
- Acts as a constantly-updating lightmap for frame-to-frame reuse
- Modular environments (tiled walls, houses) can generate too many cards — monitor with `r.Lumen.Visualize.CardPlacement`
- Lumen cannot efficiently handle both interior and exterior cards on the same mesh simultaneously

## Best Practices

- Use **hybrid lighting**: Lumen for dynamic elements, baked lightmaps for static architecture, distance field shadows for large distant geometry
- Set Max Trace Distance to **2,000 units for interiors** (default 10,000 is excessive)
- Use SRT for 60 FPS targets, reserve HRT for 30 FPS quality mode
- Limit dynamic lights — not every light needs to be dynamic
- Enable Distance Field Shadows on large static meshes — reduces Lumen tracing cost ~40%
- Use `Final Gather Quality = Medium` for 2–5ms savings with minimal visual loss
- Implement conditional Lumen usage with SSGI/DFAO fallback for lower-end platforms
- Profile per-level — scene characteristics vary; don't apply one config universally
- Profile during gameplay with camera movement, not in static viewport

## Anti-patterns

- **Default trace distance** — leaving Max Trace Distance at 10,000 tanks performance; always reduce for interiors
- **Too many dynamic lights** — every dynamic light adds Lumen tracing cost
- **Overusing Lumen Scopes** — use sparingly; only in areas that truly need them
- **Modular geometry card explosion** — heavily tiled environments generate excessive mesh cards
- **Ignoring SDF quality** — importing small meshes and scaling up produces poor distance fields; set resolution in Build Settings
- **One-sided meshes** — cause SDF artifacts; use closed geometry
- **Walls thinner than 10 cm** — cause light leaking through SDFs
- **Material override mismatch** — overriding a mesh's material with different Blend Mode or Two-Sided breaks SDF representation
- **Static viewport profiling** — Lumen costs differ dramatically during camera movement; always profile in gameplay
- **All-Lumen approach** — using Lumen for everything instead of a hybrid approach (Lumen + baked + distance field shadows)
- **Ignoring scalability fallbacks** — not implementing SSGI/DFAO path for Medium/Low settings
