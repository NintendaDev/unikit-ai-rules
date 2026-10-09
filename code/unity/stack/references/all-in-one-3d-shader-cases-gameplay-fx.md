# All In One 3D Shader — Cases: gameplay effects

> **Base path:** `Assets/Third-Party Assets/VFX/AllIn13DShader/`
> See also: [all-in-one-3d-shader-runtime-scripting.md](all-in-one-3d-shader-runtime-scripting.md) (property access, off values), [all-in-one-3d-shader-effects-full.md](all-in-one-3d-shader-effects-full.md) (property names), [all-in-one-3d-shader-cases-mobile-profiles.md](all-in-one-3d-shader-cases-mobile-profiles.md) (material bases)

Read only the block you need. Cases are distilled from the shader code and the vendor's effect and scripting pages; all code
is original. Every case assumes the effect is **enabled in the material asset** and driven by amount properties.

**Shared conventions.**
- Cache `Shader.PropertyToID` ids as `static readonly int`.
- Per-object state needs an **owned** material instance (`renderer.material` once, destroyed with the owner) or a swap
  between prepared materials; never an MPB, never `sharedMaterial` for one object.
- Keep driver components disabled while idle (`enabled = false`) so no `Update` runs.

---

## FX-01 — Hit flash

**Goal.** Flash an object white or red for ~0.1 s when damaged.

**Setup.** Material with `Hit` On (`_HitColor`, `_HitGlow` 1–3, `_HitBlend` 0). Two options:

| Option | Pros | Cons |
|---|---|---|
| Owned instance + `_HitBlend` ramp (`MaterialFlash`, runtime-scripting RS-03) | Smooth fade of the flash | One material instance per object |
| Swap to a prepared "flash" material (below) | Zero allocation, no instances; base and flash share one baked shader so both batch | Binary on/off flash |

```csharp
using UnityEngine;

public sealed class MaterialSwapFlash : MonoBehaviour
{
    [SerializeField] private Renderer _renderer;
    [SerializeField] private Material _flashMaterial;   // same shader as the base, _HitBlend = 1
    [SerializeField] private float _duration = 0.08f;

    private Material _baseMaterial;
    private float _remaining;

    private void Awake()
    {
        _baseMaterial = _renderer.sharedMaterial;
        enabled = false;
    }

    public void Play()
    {
        _remaining = _duration;
        _renderer.sharedMaterial = _flashMaterial;
        enabled = true;
    }

    private void Update()
    {
        _remaining -= Time.deltaTime;

        if (_remaining > 0f)
        {
            return;
        }

        _renderer.sharedMaterial = _baseMaterial;
        enabled = false;
    }
}
```

**Pitfalls.**
- Base and flash material must use the same shader asset (generic or the same baked shader) to stay in one batch; the
  base keeps `Hit` On with `_HitBlend` 0.
- `Hit` is applied after lighting: the flash is not shaded and keeps the object's alpha.
- Skinned meshes with several materials need a flash material per slot; swap the array.

---

## FX-02 — Death dissolve with burn edge

**Goal.** The object burns away along a noise pattern.

**Setup.** MOB-04 settings (Opaque + Alpha Cutoff, `Fade` On, burn On). Drive `_FadeAmount` 0 → 1.

```csharp
using UnityEngine;

public sealed class DissolveOnDeath : MonoBehaviour
{
    private static readonly int FadeAmountId = Shader.PropertyToID("_FadeAmount");

    [SerializeField] private Renderer _renderer;
    [SerializeField] private float _duration = 0.7f;

    private Material _material;
    private float _elapsed;

    private void Awake()
    {
        _material = _renderer.material;
        enabled = false;
    }

    public void Begin()
    {
        _elapsed = 0f;
        _material.SetFloat(FadeAmountId, 0f);
        enabled = true;
    }

    private void Update()
    {
        _elapsed += Time.deltaTime;
        float t = Mathf.Clamp01(_elapsed / _duration);
        _material.SetFloat(FadeAmountId, t);

        if (t >= 1f)
        {
            enabled = false;           // owner despawns or pools the object
        }
    }

    private void OnDestroy()
    {
        if (_material != null)
        {
            Destroy(_material);
        }
    }
}
```

**Pitfalls.** Reset to 0 on respawn (`Begin` is not called for a living object — call `_material.SetFloat(FadeAmountId, 0f)`
from the pool's reset). The shadow pass also dissolves. The burn color is HDR: without Bloom it reads as flat orange.

---

## FX-03 — Shield or force field from rim light

**Goal.** A translucent bubble that glows at its edges and pulses on impact; no depth texture.

| Setting | Value |
|---|---|
| Render Preset | Additive (or Transparent with `_GeneralAlpha`) |
| Light Model / shadows | `None` / off |
| Rim | After lighting, HDR color, `_MinRim` ~0.2, `_MaxRim` 1, `_RimAttenuation` 1 |
| Scroll Texture | On a hex or noise main texture, slow `_ScrollTextureX/Y` |
| Hit | On, pulse `_HitBlend` on impact |

**Budget.** ≤ 2 samples; overdraw is the cost — keep the sphere low-poly and short-lived.

**Mobile verdict.** Use this instead of `Intersection Glow` (needs the depth texture, AVOID on mobile). On desktop,
`Intersection Glow` adds the contact edge where the field meets the floor.

**Pitfall.** The back faces also render when `Culling Mode` is Off; keep Back unless the shield must be seen from inside.

---

## FX-04 — See-through obstruction and ghost

**Goal A.** Objects between the camera and the player become see-through. **Goal B.** A ghost-like creature.

**A — obstruction.** Opaque + Alpha Cutoff + `Fade By Cam Distance` with `Near Fade` (`_NearFade`) + `Dither`.
`_MinDistanceToFade` / `_MaxDistanceToFade` set the near band: the factor is 0 outside it and 1 inside, and it scales
the dither threshold, so holes appear as the camera approaches. Keep the mesh opaque so there is no sorting.

**B — ghost.** Transparent preset, `Rim or Fresnel` with an HDR color, `_GeneralAlpha` 0.4–0.6, ZWrite off (the preset's
default); or the cheaper opaque dissolve-style `Fade` frozen at a partial `_FadeAmount`.

**Pitfalls.** `Dither` raises the scene-depth define; confirm it behaves on a renderer with Depth Texture off. Transparent
ghosts overdraw — limit their count on screen.

---

## FX-05 — Power-up pulse: inflate plus emission

**Goal.** The object swells and brightens briefly.

**Setup.** `Vertex Inflate` On (`_MinInflate` 0, `_MaxInflate` 0.15), `Hit` or `Emission` On (use `Hit` where Bloom is
unavailable). Drive `_InflateBlend` and `_HitBlend`/`_EmissionSelfGlow` together:

```csharp
using UnityEngine;

public sealed class SinePulse : MonoBehaviour
{
    private static readonly int InflateId = Shader.PropertyToID("_InflateBlend");
    private static readonly int HitId = Shader.PropertyToID("_HitBlend");

    [SerializeField] private Renderer _renderer;
    [SerializeField] private float _speed = 6f;

    private Material _material;

    private void Awake()
    {
        _material = _renderer.material;
    }

    private void Update()
    {
        float wave = 0.5f + 0.5f * Mathf.Sin(Time.time * _speed);
        _material.SetFloat(InflateId, wave);
        _material.SetFloat(HitId, wave * 0.6f);
    }

    private void OnDestroy()
    {
        if (_material != null)
        {
            Destroy(_material);
        }
    }
}
```

**Pitfalls.** Inflate moves vertices along normals: hard-edged meshes split; use smooth normals. The inflate also runs
in the shadow and depth passes (consistent shadow, small cost).

---

## FX-06 — Status looks: freeze, stone, poison

**Goal.** Tint or restyle a creature while a status is active.

| Status | Effects | Notes |
|---|---|---|
| Freeze | `Matcap` (icy matcap, `_MatcapBlend`), `Greyscale` partial, `Hue Shift` toward blue | `Matcap` adds a texture sample |
| Stone | `Greyscale` + `Posterize`, `Contrast` up | all cheap ALU |
| Poison | `Hue Shift` toward green, slight `Vertex Shake` | |

**Choosing the mechanism.**
- ALU-only effects (Greyscale, Hue Shift, Hit, Contrast): keep them On in the base material with off values and drive
  amounts; the always-on cost is small.
- Texture or vertex effects (Matcap, Vertex Shake): do **not** leave them On for everyone; use a prepared status
  material (MOB-07 style swap) so only affected objects pay.

**Pitfalls.** A prepared material with a different effect set is a different shader variant and breaks the batch with the
base material — acceptable for a short status, avoid for permanent states of whole crowds.

---

## FX-07 — Selection or boss outline toggled without keywords

**Goal.** Show an outline only on the selected or targeted object.

**Setup.** An outline-shader material (`Outline Type` `Simple`/`Constant`, `_OutlineColor`, `_OutlineThickness`,
`_OutlineMode` `Clean`), the `OutlinePass` Render Objects features on the renderer (URP-02), and a toggle at runtime:

```csharp
using UnityEngine;

public sealed class OutlineSwitch : MonoBehaviour
{
    private const string OutlinePassName = "OutlinePass";      // the pass's LightMode tag value

    [SerializeField] private Renderer _renderer;

    private Material _material;

    private void Awake()
    {
        _material = _renderer.material;                         // owned: other objects stay unaffected
        _material.SetShaderPassEnabled(OutlinePassName, false);
    }

    public void SetSelected(bool selected)
    {
        _material.SetShaderPassEnabled(OutlinePassName, selected);
    }

    private void OnDestroy()
    {
        if (_material != null)
        {
            Destroy(_material);
        }
    }
}
```

**Notes.** `SetShaderPassEnabled` addresses the pass by its `LightMode` value [Unity manual]. Verify once on the target
Unity/URP version that a disabled pass is skipped by the `Render Objects` feature. Alternatively swap between an outline and
a non-outline prepared material.

**Pitfalls.** An outline material for a whole crowd defeats the purpose — outline only the objects that need it; a disabled
pass costs nothing at draw time but the shader still compiles the outline variant.

---

## FX-08 — Teleport glitch and hologram flicker

**Goal.** A short digital distortion when something teleports or appears.

**Setup.** A prepared "teleport" material swapped in for 0.3–0.6 s (see FX-01 swap), with `Glitch` On
(`_GlitchAmount` animated 0 → 1 → 0, `_GlitchSpeed`, `_GlitchTiling`), optional `Hologram` (`_HologramColor` HDR,
`_HologramFrequency`) with a Transparent preset, and `Hit` for the flash.

**Mobile verdict.** LIMIT: Glitch is vertex-heavy and Hologram needs blending; both are acceptable only for a handful of
objects and a fraction of a second. Never leave them on permanently, and never on the batched crowd material.
