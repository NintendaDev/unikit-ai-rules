---
version: 1.0.0
---

# Lumen

> **Scope**: Lumen global illumination and reflections system in UE5 — hardware and software ray tracing modes, scene and material requirements, Post Process Volume configuration, performance tuning, scalability tiers, and platform compatibility.
> **Load when**: configuring Lumen GI or reflections, choosing between hardware and software ray tracing, optimizing Lumen performance, setting up emissive lighting, debugging light leaking or flickering, designing lighting for console targets, authoring materials that interact with Lumen.

---

## Core Concepts

Lumen is UE5's real-time dynamic global illumination and reflections system. It eliminates pre-baked lightmaps and supports fully dynamic scenes. Lumen works in two phases:

1. **Screen Traces** — fast screen-space pass, executed first on every frame.
2. **Scene Traces** — either hardware ray tracing (against actual triangles) or software ray tracing (against signed distance fields), executed when screen traces miss.

Primary shipping target: large open worlds at **60 FPS on next-gen consoles** (High scalability level).
Secondary target: clean indoor lighting at **30 FPS on next-gen consoles** (Epic scalability level, ~8 ms GI+Reflections at 1080p with TSR upscaling to 4K).

---

## Configuration Setup

### Project Settings

Enable in **Edit > Project Settings > Engine > Rendering**:

```ini
# DefaultEngine.ini — [/Script/Engine.RendererSettings]
r.DynamicGlobalIlluminationMethod=1   ; 0=None, 1=Lumen, 2=SSGI, 3=Plugin
r.ReflectionMethod=2                  ; 0=None, 1=SSR, 2=Lumen
r.GenerateMeshDistanceFields=True     ; mandatory for Software Ray Tracing
```

### Hardware Ray Tracing (optional, higher quality)

```ini
# DefaultEngine.ini — [/Script/Engine.RendererSettings]
r.SupportHardwareRayTracing=1
r.Lumen.HardwareRayTracing=1
```

For hit lighting on reflections (highest quality, higher cost):
```ini
r.Lumen.Reflections.HardwareRayTracing.LightingMode=1   ; 0=Surface Cache, 1=Hit Lighting
```

### Sky Light

- Always set the Sky Light to **Movable** mobility for Lumen outdoor scenes.
- Enable **Real-Time Capture** on the Sky Light component to allow Lumen to update sky irradiance dynamically.
- A Sky Light is the foundation of outdoor Lumen lighting — without it, bounced sky light is absent.

### Post Process Volume

Key Lumen settings exposed in Post Process Volume:

| Setting | Recommended | Notes |
|---------|-------------|-------|
| Global Illumination Intensity | 1.0 (default) | Reduce to 0.7–0.8 to suppress over-bright interiors |
| Indirect Lighting Smoothness | 0.3–0.5 | Lower values = sharper shadows; default 1.0 is too soft |
| Final Gather Quality | High → Medium | Medium saves 2–5 ms with minimal visual loss |
| Screen Trace Distance | 2,000 units | Default 10,000; reducing gives ~8 ms gain |

---

## Ray Tracing Modes

### Hardware Ray Tracing (HWRT)

- Traces against **actual triangles** — supports skinned meshes (characters, cloth).
- Two hit lighting modes: **Surface Cache** (cheaper) and **Hit Lighting** (accurate, expensive).
- Requires a dedicated RT-capable GPU (NVIDIA RTX 20-series or newer).
- UE5.6: HWRT performance was substantially improved, now matching Software RT frame budgets on current-gen consoles.

### Software Ray Tracing (SRT)

Two sub-modes controlled by `r.Lumen.TraceMeshSDFs`:

| Mode | CVar | Quality | Use Case |
|------|------|---------|----------|
| Detail Tracing (MDF) | `r.Lumen.TraceMeshSDFs=1` | Epic | Complex scenes, higher overlap cost |
| Global Tracing (GDF) | `r.Lumen.TraceMeshSDFs=0` | High | Lower-resolution, cheaper alternative |

**Choosing between HWRT and SRT:** Profile both with `stat lumen` while moving through the level. HWRT is not universally faster — in dense interior scenes SRT can outperform it on mid-range cards.

---

## Scene Requirements

Rules that prevent light leaking, occlusion artifacts, and self-shadowing:

- **Geometry must be modular** — walls, floors, and ceilings as separate meshes. Avoid large monolithic meshes (mountains, multi-story buildings in a single asset) — they produce poor distance field representation and self-occlusion.
- **Minimum wall thickness: 10 cm** — thinner walls cause light to bleed through.
- **No one-sided meshes viewed from behind** — distance fields cannot represent back-faces; always use closed geometry or ensure camera never sees back faces.
- **Foliage** must have **Affect Distance Field Lighting** enabled in the Foliage Tool settings to be represented in Lumen Scene.
- Only **Static Meshes, Instanced Static Meshes, HISMs, and Landscape** are represented in the Software Lumen Scene. Skeletal meshes require Hardware Ray Tracing.
- **Distance field resolution** is based on the **import scale** of the Static Mesh asset. If you scale up a mesh on the placed component, the distance field resolution will be insufficient. Fix by setting the desired scale as the import scale in Static Mesh Editor Build Settings.

---

## Material Requirements

- **World Position Offset (WPO) is not supported** by Software Ray Tracing distance fields. Meshes with WPO materials will have a mismatch between their visual position and their GI contribution.
- **Do not override material Blend Mode or Two-Sided** on components via override materials — this causes a mismatch between the triangle representation and the mesh's distance field.
- **Roughness below 0.2 on metallic materials** causes excessive light bouncing ("disco ball" effect). Keep roughness ≥ 0.2.
- Translucent materials receive diffuse GI (as a Lumen card) when **Hit Lighting for Reflections** is enabled.

### Emissive Materials

- Mark emissive meshes as **Emissive Light Source** in the Details panel — without this flag, small objects are culled from the Lumen Scene and only contribute via screen traces, leading to inconsistent lighting.
- Mark transparent/particle materials as `Affect Dynamic Indirect Lighting = false` unless colored light interaction is required — saves significant cost.
- Avoid high-frequency firefly artifacts from bright emissive sources when using lower Final Gather quality settings — increase Final Gather quality or reduce emissive intensity.

---

## Key Console Variables

### Quality & Performance

```ini
r.DynamicGlobalIlluminationMethod=1           ; Enable Lumen GI
r.ReflectionMethod=2                          ; Enable Lumen reflections
r.GenerateMeshDistanceFields=1                ; Required for SRT
r.Lumen.HardwareRayTracing=1                  ; Enable HWRT
r.Lumen.TraceMeshSDFs=1                       ; 1=Detail Tracing (Epic), 0=Global Tracing (High)
r.Lumen.IndirectLightingIntensity=1.0         ; Indirect bounce strength (reduce to 0.3–0.5 for perf)
r.Lumen.Reflections.MaxBounces=64             ; Override max reflection bounces (requires HWRT)
r.Lumen.Reflections.MaxRoughnessToTrace=0.4   ; Foliage: set to 0
```

### Screen Traces

```ini
r.Lumen.ScreenProbeGather.Distance=2000       ; Screen trace distance (default ~10,000)
r.Lumen.ScreenProbeGather.ShortRangeAO=1      ; High-frequency contact shadows
r.Lumen.DiffuseIndirect.SSAO=1                ; Enable SSAO alongside Lumen (pair with ShortRangeAO=0)
r.Lumen.ShortRangeAO.HalfResolution=1         ; UE5.6+: ShortRangeAO at half res, 2x perf boost
```

### Surface Cache

```ini
r.Lumen.SurfaceCache.UpdateDistance=<value>   ; UE5.6+: drive cache updates by frustum distance
```

### Reflections Bias (UE5.6+)

```ini
r.Lumen.Reflections.HardwareRayTracing.Bias=<value>
r.Lumen.Reflections.HardwareRayTracing.NormalBias=<value>
```

### Profiling

```ini
stat lumen                                    ; Break down GI, reflections, screen trace costs
r.Lumen.ScreenProbeGather.Software=1          ; Force software mode for A/B comparison
```

---

## Scalability & Platform Support

| Scalability Level | Lumen State | Target |
|-------------------|-------------|--------|
| Epic | Enabled — Detail Tracing (MDF) | High-end PC, consoles at 30 FPS |
| High | Enabled — Global Tracing (GDF) | Next-gen consoles at 60 FPS, mid-range PC |
| Medium | Disabled (fallback to SSGI/DFAO) | — |
| Low | Disabled | — |

**Supported platforms:** PS5, Xbox Series X/S, PC with DX11+ (SRT) or RT-capable GPU (HWRT).

**Not supported:** PS4, Xbox One, mobile (generally), Medium/Low scalability. Provide fallback SSGI or DFAO for those tiers.

Performance budget: High scalability targets **60 FPS on next-gen console**; Epic targets **~8 ms** GI+Reflections at 1080p (TSR → 4K).

---

## Best Practices

- Always profile with `stat lumen` **while moving** through the level — static viewport numbers are misleading.
- Profile in **packaged builds**, not PIE — the editor overhead masks real performance.
- Use **hybrid approaches** for large open worlds: Lumen for dynamic hero assets and interiors, low-resolution baked lightmaps for static distant geometry.
- For foliage and small props, use **Screen Space only** mode — skip full GI tracing on secondary assets that barely affect lighting perception.
- Test both HWRT and SRT configurations before committing; HWRT is not always faster.
- Reduce **Indirect Lighting Smoothness** to 0.3–0.5 early in a project — the default value of 1.0 produces blurry GI that obscures shading details.
- When targeting consoles, develop at **High scalability** from the start. Epic is a quality bar, not the console target.
- Use **Virtual Shadow Maps** alongside Lumen for accurate distant shadow detail.

---

## Performance Optimization

- **Reduce Screen Trace Distance** from 10,000 to ~2,000 units — this alone can recover ~8 ms.
- **Lower Final Gather Quality** from High to Medium — ~2–5 ms saved, ~90% visual quality retained.
- **Disable Translucency Lighting Volume** if volumetric effects are unused (~3 ms saved).
- **Simplify high-poly decorative geometry** — Lumen's distance fields struggle with dense poly counts. Reduce decorative meshes (fences, foliage) to the minimum required silhouette fidelity.
- **Modular tiled environments** (repeated wall tiles, repeating floor) can generate too many Lumen cards, hurting performance. Merge repeated tiles where GI fidelity inside that volume is not critical.
- Cap hardware ray tracing **samples per pixel to 2** if thermal throttling is observed on console.
- Typical Lumen frame cost: **15–25% of the frame budget**. If `stat lumen` shows >20 ms, begin systematic reduction.

**Quality preset impact (non-linear):**

| Transition | Approximate FPS Gain |
|------------|----------------------|
| Epic → High | ~5 FPS |
| High → Medium | ~20 FPS (major threshold) |

---

## Profiling & Debugging

- `stat lumen` — primary profiling command; shows GI, reflections, and screen trace costs broken down.
- **Lumen Scene View Mode** (`Show > Visualize > Lumen Scene`) — inspect which meshes are represented in the Lumen Scene and their surface cards.
- **Lumen Cost Visualization Mode** — identifies expensive areas in the scene.
- Common debugging workflow:
  1. Open `stat lumen` while flying through the level.
  2. Identify the highest-cost category (Screen Traces vs Scene Traces vs Surface Cache).
  3. Apply targeted CVar adjustments to the dominant cost.
  4. Validate in a packaged build.

---

## Anti-Patterns

- **Never rely on editor PIE FPS** to make Lumen optimization decisions — always measure in a packaged build.
- **Never use a single monolithic mesh** for large environment structures (full building, terrain as one mesh) — distance field resolution will be too coarse and produce self-occlusion.
- **Never leave walls thinner than 10 cm** in a Lumen scene — guaranteed light leaking.
- **Avoid roughness < 0.2 on metallic surfaces** — creates excessive GI bounce artifacts.
- **Do not rely on Lumen for particle/VFX emissive** without disabling `Affect Dynamic Indirect Lighting` — particles can act as radioactive light sources in GI.
- **Do not use WPO materials** for geometry that must cast accurate GI shadows — the distance field won't update to match the deformed geometry.
- **Avoid both Lumen and Nanite simultaneously** on resource-constrained platforms (laptops, mid-range consoles) without explicit profiling — their combined cost may exceed the frame budget.
- **Do not scale up meshes on placement** if high distance field resolution is needed — set the scale in the Static Mesh asset's Build Settings instead.