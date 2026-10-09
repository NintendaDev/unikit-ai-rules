# All In One VFX Toolkit — Runtime scripting

> **Base path:** `<AllIn1Root>` is the asset folder — the one that contains `AllIn1VfxAssemebly.asmdef` (find it with `Glob **/AllIn1VfxAssemebly.asmdef`; never hard-code its location). Runtime components are in `<AllIn1Root>/Scripts/`, namespace `AllIn1VfxToolkit`.
> See also: [all-in-one-vfx-toolkit-effects-full.md](all-in-one-vfx-toolkit-effects-full.md) (property names and "off values"), [all-in-one-vfx-toolkit-mobile-optimization.md](all-in-one-vfx-toolkit-mobile-optimization.md)

Driving toolkit materials from C#. The vendor docs cover `SetFloat`/`SetColor`/`SetTexture`, keyword toggling and the
custom-time component; the rest below is read from the shipped scripts (v2.32).

---

## Rules

1. **Drive effects by amount, not by keyword.** Enable every effect you will ever need in the material asset and make it
   invisible with its "off value" (an amount/blend property at 0, `_FadeAmount` at -0.1). `Material.EnableKeyword`/
   `DisableKeyword` is the vendor's second, "avoid" method: the keyword combination must already exist as a compiled variant
   in the build, otherwise the object turns pink or the effect vanishes — in a device build only.
2. **Property names come from the shader, never from memory.** A wrong name fails silently. Source: `Properties` block of
   `<AllIn1Root>/Shaders/AllIn1Vfx.shader`, or the effects reference. Hover a property in the inspector for its reference name.
3. **Cache ids**: `Shader.PropertyToID` once in a `static readonly int`; call `SetFloat(int, float)`, not the string overload.
4. **`Renderer.material` instantiates**; `sharedMaterial` edits the asset and every user of it (and persists in the editor).
   Own what you instantiate and `Destroy` it in `OnDestroy`. Never write to `sharedMaterial` from gameplay.
5. **Never call the authoring components or editor helpers at runtime** (`AllIn1VfxComponent` API, `AllIn1ParticleHelperComponent`,
   `AllIn1VfxNoiseCreator`).
6. **Scene-wide helpers are singletons by convention**: one `SetAllIn1VfxCustomGlobalTime`, one `AllIn1VfxFakeLightDirSetter`.

## Per-object materials vs MaterialPropertyBlock

| Approach | SRP Batcher | Cost | Use when |
|---|---|---|---|
| Shared material asset, no per-object values | batches | none | Looks that never change per instance. |
| Owned material instance per renderer (`renderer.material`, created once) | batches (same shader variant) | one `Material` allocation; its constant buffer is re-uploaded when you write to it | Animated or per-object values on an `AllIn1VfxSRPBatch` material. |
| `MaterialPropertyBlock` on the renderer | **leaves the batcher** | no allocation; breaks batching for that renderer | A few objects, or CG shaders relying on instancing (`_TimingSeed` is an instanced property there). |
| `sharedMaterial` edit | batches | edits every user and the asset | Editor tooling only. |

## Examples (original; adapt names)

Dissolve a one-shot effect through the amount property, with an owned material and cached ids:

```csharp
using UnityEngine;

public sealed class DissolveOut : MonoBehaviour
{
    private static readonly int FadeAmountId = Shader.PropertyToID("_FadeAmount"); // FADE_ON enabled in the material asset
    private const float Visible = -0.1f;  // "no fade"
    private const float Gone = 1f;        // fully faded

    [SerializeField] private Renderer _renderer;
    [SerializeField] private float _duration = 0.6f;

    private Material _material;          // owned instance, created once
    private float _elapsed = -1f;

    private void Awake()
    {
        _material = _renderer.material;   // instantiates once; destroyed in OnDestroy
        _material.SetFloat(FadeAmountId, Visible);
    }

    public void Play() => _elapsed = 0f;

    private void Update()
    {
        if (_elapsed < 0f)
        {
            return;                       // no per-frame material write while idle
        }

        _elapsed += Time.unscaledDeltaTime;
        float t = Mathf.Clamp01(_elapsed / _duration);
        _material.SetFloat(FadeAmountId, Mathf.Lerp(Visible, Gone, t));

        if (t >= 1f)
        {
            _elapsed = -1f;               // stop writing once finished
        }
    }

    private void OnDestroy() => Destroy(_material);
}
```

Reset a pooled one-shot effect on spawn (values left from the last use are the usual "ghost of the old effect" bug):

```csharp
using UnityEngine;

public sealed class PooledEffect : MonoBehaviour
{
    private static readonly int TimingSeedId = Shader.PropertyToID("_TimingSeed");
    private static readonly int AlphaId = Shader.PropertyToID("_Alpha");

    [SerializeField] private ParticleSystem[] _systems;
    [SerializeField] private Renderer[] _meshRenderers;   // owned instances, created in Awake of each

    public void Spawn(Vector3 position)
    {
        transform.position = position;
        gameObject.SetActive(true);

        float seed = Random.Range(0f, 100f);              // desync copies without a MaterialPropertyBlock
        foreach (Renderer r in _meshRenderers)
        {
            r.material.SetFloat(TimingSeedId, seed);      // r.material is the owned instance after first access
            r.material.SetFloat(AlphaId, 1f);
        }

        foreach (ParticleSystem ps in _systems)
        {
            ps.Clear(true);
            ps.Play(true);
        }
    }
}
```

Uniquely animated UI material (uGUI Images share one material instance, so the Animator cannot animate it), with cleanup the
shipped `AllIn1GraphicMaterialDuplicate` lacks:

```csharp
using UnityEngine;
using UnityEngine.UI;

public sealed class UiEffectMaterial : MonoBehaviour
{
    [SerializeField] private Graphic _graphic;
    private Material _instance;

    public Material Instance => _instance;

    private void Awake()
    {
        _instance = new Material(_graphic.material);   // per-element copy (breaks uGUI batching for this element)
        _graphic.material = _instance;
    }

    private void OnDestroy() => Destroy(_instance);
}
```
Animate `Instance` with code or a tween library (`SetFloat` per frame while animating, nothing when idle).

Pause-proof animation: tick *Use Custom Time* (`TIMEISCUSTOM_ON`) on the material **and** keep one active
`SetAllIn1VfxCustomGlobalTime` in the scene. If the effect must keep animating but the global does not reach an
`AllIn1VfxSRPBatch` material (see caveat below), write the vector yourself:

```csharp
using UnityEngine;

public sealed class CustomTimeToMaterial : MonoBehaviour
{
    private static readonly int GlobalCustomTimeId = Shader.PropertyToID("globalCustomTime");
    [SerializeField] private Renderer _renderer;
    private Material _material;

    private void Awake() => _material = _renderer.material;

    private void Update()
    {
        float t = Time.unscaledTime;                       // same layout as Unity's _Time
        _material.SetVector(GlobalCustomTimeId, new Vector4(t / 20f, t, t * 2f, t * 3f));
    }

    private void OnDestroy() => Destroy(_material);
}
```

## Shipped scripts

| Script | What it does | Cost / caveat |
|---|---|---|
| `SetAllIn1VfxCustomGlobalTime` | `Shader.SetGlobalVector("globalCustomTime", (t/20, t, 2t, 3t))` with `Time.unscaledTime` every frame (`[ExecuteInEditMode]`) | One call per frame per instance; use one. Read only by materials with `TIMEISCUSTOM_ON`; without it those freeze (global is 0). **Caveat:** in `AllIn1VfxSRPBatch`/`DOTS` the same name is a per-material property, so the global probably does not reach it [inf] — test in Play Mode with the toggle on and `Time.timeScale = 0`, otherwise write it per material as above. |
| `AllIn1VfxFakeLightDirSetter` | Sets global `_All1VfxLightDir` from a transform's forward in `Awake`, optionally every frame (`setOnUpdate`, default off). API: `SetGlobalFakeLightDir()`, `SetNewFakeLightDir(Vector3)`, `SetNewTarget(Transform)`, `SetOnUpdateBool(bool)` | Free at default. Same SRP-batch caveat. Without a setter the light direction is zero. |
| `All1VfxRandomTimeSeed` | `Start`: `MaterialPropertyBlock.SetFloat("_TimingSeed", Random.Range(min,max))` | **MPB → leaves the SRP Batcher**; for many instances set the seed on an owned material or use Custom Data row 1 on particles. |
| `AllIn1VfxScrollShaderProperty` / `…Texture` | Add `speed × deltaTime` to a float property / texture offset on `Update`, optional ping-pong, modulo and stop value | Uses `Renderer.material` (clone, never destroyed) or edits the **shared** asset + `new Material(mat)` copy; keeps calling `SetFloat`/`SetTextureOffset` **every frame even after `stopAtValue`**; NRE on a UI `Graphic`. Prefer shader scroll (`_ShapeXSpeed`, `TEXTURESCROLL`) which is free. |
| `AllIn1GraphicMaterialDuplicate` | `Awake`: `graphic.material = new Material(graphic.material)` | Never destroyed (leak per spawn); each element becomes its own UI batch. Use the pattern above. |
| `AllIn1VfxBounceAnimation`, `AllIn1LookAt`, `AllIn1AutoRotate` | Demo-grade transform animation | Per-frame transform writes; `startPosition`/orientation captured once in `Start`, wrong for pooled objects. Do not ship. |
| `AllIn1VfxAutoDestroy` | Destroy after N seconds | For Particle Systems prefer `Stop Action = Destroy`. |
| `AllIn1Shaker` / `AllIn1DoShake` | Singleton camera shaker (`AllIn1Shaker.i.DoCameraShake(amount)`) used by demos | Needs a parent object with the camera as a child at 0,0,0. Fine for prototypes; a project camera-shake system is usually better. |
| `AllIn1VfxComponent`, `AllIn1ParticleHelperComponent`, `AllIn1ParticleHelperSO`, `AllIn1VfxNoiseCreator`, `AllIn1VfxWindow` | Authoring tools | Editor-only logic; never call from gameplay. |

## Animation and tweening

- Animation clips can key material properties of Renderer-based materials; the same limitation applies to UI Images.
- For tweened properties drive the **amount/blend** values only and stop writing when the tween ends (`SetFloat` on an
  SRP-batched material dirties its constant buffer).
- Use unscaled delta time if the effect must continue during hit-stop or pause, otherwise `_Time` (scaled) is the default.
