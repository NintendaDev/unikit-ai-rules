# All In One 3D Shader — Runtime scripting

> **Base path:** `Assets/Third-Party Assets/VFX/AllIn13DShader/Scripts/` (namespace `AllIn13DShader`, assembly `AllIn13DShaderAssemebly` — the vendor's spelling)
> See also: [all-in-one-3d-shader-effects-full.md](all-in-one-3d-shader-effects-full.md) (property names and off values), [all-in-one-3d-shader-cases-gameplay-fx.md](all-in-one-3d-shader-cases-gameplay-fx.md) (recipes)

Source tags: **[code]** shader/script code (v2.74) · **[docs]** vendor docs · **[unity]** Unity manual · **[general]**.

## Section index

| ID | Section |
|---|---|
| RS-01 | Choosing material access: instance, shared, property block |
| RS-02 | Driving an effect: amount properties and "off" values |
| RS-03 | Per-object flash component (owned instance) |
| RS-04 | Time: scaled by default, custom unscaled time, random offset |
| RS-05 | Animating: clips, tweens, and the UI limitation |
| RS-06 | Toggling passes and shadows without keywords |
| RS-07 | Global components reference |
| RS-08 | Editor workflow facts that affect code |

---

## RS-01 — Material access

| Access | Effect | Use when | Watch out |
|---|---|---|---|
| `renderer.material` | Creates a per-renderer instance on first use | One object needs its own values (flash, seed) | The instance must be destroyed with the owner; never call it per hit — cache it once |
| `renderer.sharedMaterial` | Edits the shared asset; all users change; in the editor the asset file is modified | Changing a look for everyone (rare at runtime) | Persists in the editor after Play; surprising diffs |
| `MaterialPropertyBlock` | Per-renderer overrides without a material instance | Prototyping only | Makes the renderer incompatible with the SRP Batcher [unity] |
| Prepared material variants | Swap `renderer.sharedMaterial` between prepared assets | Quality tiers, fixed states (frozen, burning) | Needs the variants to exist in the build |

- The vendor's scripting page: `Material.SetFloat/SetColor/SetTexture` with property names taken from the inspector
  tooltip or the top of `AllIn13DShader.shader`; `material` for one instance, `sharedMaterial` for all [docs].
- Cache every property id once: `private static readonly int HitBlendId = Shader.PropertyToID("_HitBlend");`, and use
  the `SetFloat(int, float)` overloads (the project's performance rule).
- Toggles: ticking an effect in the inspector sets the float **and** the keyword; `SetFloat("_Hit", 1f)` sets only the
  float [code]. Never rely on it; see RS-02.

## RS-02 — Driving an effect

Rule: enable the effect in the material asset, then move an **amount** property between its off value and its on value
[docs: "all effects have a property value combination that makes them look deactivated"]. Never `EnableKeyword`
[docs, variant stripping — see variants-and-baking VAR-06].

| Effect | Amount property | Off value |
|---|---|---|
| Hit | `_HitBlend` | 0 |
| Fade | `_FadeAmount` | 0 (visible) → 1 (gone) |
| Vertex Inflate | `_InflateBlend` | 0, provided `_MinInflate` is 0 (the offset is `lerp(_MinInflate, _MaxInflate, _InflateBlend)`) |
| Vertex Shake | `_ShakeBlend` | 0 |
| Vertex Distortion | `_VertexDistortionAmount` | 0 |
| Voxelize | `_VoxelBlend` | 0 |
| Glitch | `_GlitchAmount` | 0 |
| Wind | `_WindAttenuation` | 0 |
| Rim | `_RimAttenuation` | 0 |
| Highlights | `_HighlightsStrength` | 0 |
| Emission | `_EmissionSelfGlow` | 0 |
| Matcap | `_MatcapBlend` | 0 |
| Color Ramp | `_ColorRampBlend` | 0 |
| Greyscale | `_GreyscaleBlending` | 0 |
| Hue Shift | `_HueShift`, `_HueSaturation`, `_HueBrightness` | 0, 1, 1 |
| Contrast and Brightness | `_Contrast`, `_Brightness` | 1, 0 |
| Distortion / Wave UV | `_DistortAmount` / `_WaveStrength` | 0 |
| Hologram | `_HologramAlpha` plus `_HologramBaseAlpha` | no single off value — leave the effect for hologram-only materials |
| Outline | none — use RS-06 (pass toggle) | — |
| General alpha | `_GeneralAlpha` | 1 (opaque) — meaningful on blended materials |

Colors and textures: `SetColor`/`SetTexture` with ids (`_Color`, `_HitColor`, `_RimColor`, `_EmissionColor`,
`_OutlineColor`, `_MainTex`, `_FadeTex`). HDR colors take values above 1.

## RS-03 — Per-object flash component (original example)

```csharp
using UnityEngine;

public sealed class MaterialFlash : MonoBehaviour
{
    private static readonly int HitBlendId = Shader.PropertyToID("_HitBlend");

    [SerializeField] private Renderer _renderer;
    [SerializeField] private float _duration = 0.12f;

    private Material _material;
    private float _remaining;

    private void Awake()
    {
        _material = _renderer.material;     // owned instance, created once
        _material.SetFloat(HitBlendId, 0f);
        enabled = false;                    // no Update while idle
    }

    public void Play()
    {
        _remaining = _duration;
        enabled = true;
    }

    private void Update()
    {
        _remaining = Mathf.Max(0f, _remaining - Time.deltaTime);
        _material.SetFloat(HitBlendId, _remaining / _duration);

        if (_remaining <= 0f)
        {
            enabled = false;
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

Requires `Hit` ticked in the material asset. For pooled objects, create the instance when the pooled object is created and
destroy it when the pool disposes it — not on spawn/despawn. A tween library can drive the same property id; the
vendor recommends one for animating material values from code [docs].

## RS-04 — Time

- Default: shader time is Unity's `_Time`, which follows `Time.timeScale`, so UV and mesh effects stop when the game is
  paused [docs].
- Per material, **Use Custom Time** (`_USE_CUSTOM_TIME`) switches the shader to the global vector
  `allIn13DShader_globalTime`. Put one `ShaderGlobalTimeController` in the scene: it writes
  `(unscaledTime / 20, unscaledTime, unscaledTime * 2, unscaledTime * 3)` each `Update` [code]. Without the component the
  vector stays zero and every time-driven effect freezes on that material.
- Every effect reads `time + _TimingSeed`. Identical materials animate in lockstep; a different `_TimingSeed` per object
  de-synchronizes them. The shipped `AllIn13DShaderRandomTimeSeed` sets it with a `MaterialPropertyBlock` in `Start`
  (range 0–100) [code] — that breaks SRP batching for the object [unity]. For batched crowds set the seed once on an
  owned material instance instead:

```csharp
using UnityEngine;

public sealed class ShaderTimeOffset : MonoBehaviour
{
    private static readonly int TimingSeedId = Shader.PropertyToID("_TimingSeed");

    [SerializeField] private Renderer _renderer;
    [SerializeField] private float _maxSeed = 100f;

    private Material _material;

    private void Awake()
    {
        _material = _renderer.material;
        _material.SetFloat(TimingSeedId, Random.Range(0f, _maxSeed));
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

- In the editor, enable *Always Refresh* in the Scene view to see time-driven effects animate [docs].

## RS-05 — Animating

- Material inspector properties can be animated in the Animation window like any component property, for **renderer**
  materials [docs]. Record against the object that owns the renderer.
- UI `Image` uses a shared material: Unity does not allow animating shared-material properties through animation clips,
  so the clip route does not work on UI images — drive the property from code (any tween library or a plain `Update`
  lerp) [docs, video transcript].
- Prefer code or a tween for gameplay values; clips are for authored one-off animations on scene objects.

## RS-06 — Passes and shadows without keywords

- Outline: `material.SetShaderPassEnabled("OutlinePass", enabled)` — the API addresses a pass by its `LightMode` tag
  value, and the outline pass has `LightMode = OutlinePass` [unity][code]. Verify once on the target Unity/URP version.
- Shadow casting for one renderer: `renderer.shadowCastingMode = ShadowCastingMode.Off` (cheaper than relying on the
  material toggle, see MO-04).
- Keep these toggles at spawn/state changes, not per frame.

## RS-07 — Global components

| Component | Required by | Writes (globals) | Properties |
|---|---|---|---|
| `WindController` | Wind effect | `global_windNoiseTex`, `global_windForce`, `global_noiseSpeed`, `global_useWindDir`, `global_windDir`, `global_minWindValue`, `global_maxWindValue`, `global_windWorldSize` every `Update` | `windForce` (0–3), `noiseSpeed` (X,Y), `bidirectionalWind`, `useWindDir` (uses the object's forward), `worldSize`, `windNoise` texture |
| `FastLightConfigurator` | Light Model `FastLighting` | `global_lightDirection` = −forward of its transform, `global_lightColor` every `Update` | `lightColor`; `Reset()` copies the color from a `Light` on the same object |
| `ShadowsConfigurator` | Custom Shadow Color | `global_shadowColor` in `OnEnable`; every frame only if `updateEveryFrame` (editor: always) | `shadowColor`, `updateEveryFrame` |
| `DepthColoringCamera` + `AllIn1DepthColoringProperties` asset | Depth Coloring | `global_MinDepth`, `global_DepthZoneLength`, `global_DepthGradientFallOff`, `global_DepthGradient` via `ApplyValues()` in `OnEnable` | asset: `depthColoringMinDepth`, `depthZoneLength`, `fallOff` (0.1–1.5), `depthColoringGradientTex`; the component sets `depthTextureMode` in the editor only |
| `ShaderGlobalTimeController` | Use Custom Time | `allIn13DShader_globalTime` every `Update` | none |
| `AllIn13DShaderRandomTimeSeed` | optional | `_TimingSeed` via MPB in `Start` | `minSeedValue`, `maxSeedValue` |

All are `[ExecuteInEditMode]` and live on any active GameObject in the scene; one of each is enough. Globals persist until
changed.

## RS-08 — Editor workflow facts

- `AddAllIn13DShader` creates a material scene-bound and works on the renderer's `sharedMaterial`; the component is
  editor tooling and is removed after setup [docs][code]. Before building a prefab press **Save Material to Folder**
  [docs]; a prefab without it renders wrong.
- Create assets from `Assets/Create/AllIn13DShader/Materials` (Default, Toon, PBR, Basic Lighting, AllIn13D Look) or
  convert existing ones with `Assets/AllIn1/Convert ALL materials to AllIn13DShader` / `Convert Standard materials to
  AllIn13DShader` (the dialog offers override or copy) [code][docs].
- An asmdef that references the shader scripts needs the reference `AllIn13DShaderAssemebly`.
