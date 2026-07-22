---
version: 1.0.0
---

# Cinemachine

> **Scope**: Unity Cinemachine camera system — Virtual Camera authoring, CinemachineBrain setup, body and aim algorithms, noise and impulse effects, camera blending and priority, State-Driven cameras, Timeline integration, and scripting via extensions.
> **Load when**: setting up or tuning cameras with Cinemachine, authoring Virtual Cameras, configuring body/aim/noise, switching cameras by priority, blending between shots, adding camera shake or impulse, integrating cameras with animation states or Timeline, writing CinemachineExtension scripts.

---

## Core Architecture

Cinemachine separates camera **intent** (Virtual Cameras) from camera **execution** (Unity Camera + CinemachineBrain).

- **CinemachineCamera** (Virtual Camera) — a lightweight GameObject that defines *where* and *how* the camera should look. One is "Live" at any time; the rest run in Standby.
- **CinemachineBrain** — component on the main Unity Camera that monitors the priority stack, selects the current live camera, and applies blending.
- A camera cut is just a zero-duration blend.

```csharp
// Access the brain at runtime
var brain = Camera.main.GetComponent<CinemachineBrain>();
var liveCamera = brain.ActiveVirtualCamera as CinemachineCamera;
```

## Virtual Camera States

| State | Behaviour |
|-------|-----------|
| **Live** | Actively controls the Unity Camera via the Brain |
| **Standby** | Tracks Follow/LookAt targets but does not drive the camera; consumes minimal CPU |
| **Disabled** | Fully inactive; zero processing cost |

Use `Priority` to determine which camera the Brain picks as Live. When two cameras share the same priority, the most recently activated one wins.

## Body Algorithms (Position)

Set on the Virtual Camera's **Body** property. Controls how the camera moves relative to the Follow target.

| Algorithm | When to use |
|-----------|-------------|
| **Transposer** | Fixed offset from the Follow target in world or local space |
| **Framing Transposer** | Screen-space positioning; keep target at a given screen position |
| **Orbital Transposer** | Variable distance/angle; good for third-person input-driven cameras |
| **Tracked Dolly** | Move along a predefined spline path |
| **Hard Lock to Target** | Camera position equals the Follow target position exactly |
| **Do Nothing** | No positional movement; use when driven entirely by scripts or animation |

## Aim Algorithms (Rotation)

Set on the Virtual Camera's **Aim** property. Controls how the camera rotates toward the LookAt target.

| Algorithm | When to use |
|-----------|-------------|
| **Composer** | Frame a single LookAt target with dead zone and soft zone composition |
| **Group Composer** | Frame multiple targets simultaneously (target group) |
| **POV** | Direct input-driven rotation (no automatic tracking) |
| **Same As Follow Target** | Match the rotation of the Follow target exactly |
| **Hard Look At** | Instantly center the LookAt target; no damping or composition zones |
| **Do Nothing** | No rotation; use for locked-angle cameras or scripted orientation |

## Lens Configuration

Lens settings are per-Virtual Camera and override the Unity Camera when Live.

- **Field of View** — vertical FOV in degrees (Perspective mode). Lower values (~40°) create a telephoto, cinematic look.
- **Orthographic Size** — half-height of the view (Orthographic mode).
- **Near / Far Clip Planes** — drawing range; change only when necessary.
- **Dutch** — Z-axis roll in degrees for dramatic tilted composition.
- **Camera Mode Override** — switch between Perspective / Orthographic / Physical per virtual camera.

## Noise & Camera Shake

Noise simulates handheld, vehicle, or environmental vibration without affecting damping behavior (noise does not accumulate into future frame positions).

```csharp
// Assign a noise profile at runtime
var noise = virtualCamera.GetCinemachineComponent<CinemachineBasicMultiChannelPerlin>();
noise.NoiseProfile = myNoiseSettings;
noise.AmplitudeGain = 1.5f;
noise.FrequencyGain = 1.0f;
```

**Noise profile best practices:**
- Start with **rotation noise** first — operators move the camera rotationally more than positionally.
- Mix **3 frequency channels** (low + medium + high) per axis for natural-looking results.
- Wider lenses need larger amplitude; telephoto lenses need smaller amplitude.

## Cinemachine Brain

Attach one `CinemachineBrain` to the main Unity Camera. Configure key fields:

| Field | Purpose |
|-------|---------|
| `DefaultBlend` | Blend curve and duration used when no specific blend is defined |
| `CustomBlends` | `CinemachineBlenderSettings` asset for per-camera-pair blend overrides |
| `BlendUpdateMethod` | When blends are evaluated: `FixedUpdate`, `LateUpdate`, or `ManualUpdate` |
| `ChannelMask` | Filters which Virtual Cameras this Brain processes (multi-brain setups) |
| `IgnoreTimeScale` | If `true`, cameras respond in real-time even when `Time.timeScale == 0` |
| `ShowDebugText` | Shows active camera name in Game view — always enable during development |

**Update method guidance:**
- Use `LateUpdate` (default) for most games.
- Use `FixedUpdate` when the Follow target is driven by physics (`Rigidbody`).
- Use `ManualUpdate` when you need explicit frame-by-frame control from a custom script.

## Camera Blending

Blend styles available in `CinemachineBlendDefinition`:

| Style | Effect |
|-------|--------|
| `EaseInOut` | Smooth acceleration and deceleration — default, cinematic |
| `EaseIn` | Starts slow, ends sharp |
| `EaseOut` | Starts sharp, ends smooth |
| `Linear` | Constant-speed blend; can feel mechanical but suits fast action |
| `HardIn` / `HardOut` | Aggressive curve variants |
| `Cut` | Zero-duration; instant switch |

**BlendHints** flags on the Virtual Camera control position interpolation during blends:

- `SphericalPosition` — arc around the LookAt target; avoids "cutting through" the subject.
- `CylindricalPosition` — spherical on XZ, linear on Y; useful for vertical transitions.
- `InheritPosition` — incoming camera snaps to the outgoing camera's position on activation; avoids a pop.
- `ScreenSpaceAimWhenTargetsDiffer` — smooth screen-space blend when cameras have different LookAt targets.

## Priority & Camera Switching

Control which camera is Live by manipulating Priority at runtime. Higher priority wins.

```csharp
// Switch to a combat camera
combatCamera.Priority = 20;    // was 10 — now beats the exploration camera
explorationCamera.Priority = 10;

// Or simply enable/disable: enabled cameras always beat disabled ones
cutsceneCamera.gameObject.SetActive(true);
```

Rules:
- Prefer `SetActive` / `enabled` for simple on/off switching.
- Use `Priority` when multiple cameras should coexist with ranked preference.
- Never leave two cameras at the same priority when order matters — be explicit.

## Specialized Camera Types

**FreeLook Camera** — three-rig setup (Top, Middle, Bottom) for third-person orbit cameras. Input driven; requires an Input Axis configuration.

**State-Driven Camera** — links child Virtual Cameras to Animator states. When the animator enters a state, the mapped camera becomes Live automatically.

```
Setup:
1. GameObject > Cinemachine > State-Driven Camera
2. Assign "Animated Target" (GameObject with Animator)
3. Add child CinemachineCameras
4. Map each child to an animation state in the State list
```

**ClearShot Camera** — automatically selects the child camera with the best unobstructed view (via `CinemachineDeoccluder`). Use for AI-director style selection.

**Dolly Camera with Track** — camera follows a spline (CinemachineSplineDolly). Author the path with a Spline component; set `Tracked Dolly` as the Body algorithm.

## Impulse System

Camera shake triggered by in-world events, not baked noise.

**Setup:**
1. Add `CinemachineImpulseSource` (scripted events) or `CinemachineCollisionImpulseSource` (collision events) to the source GameObject.
2. Add `CinemachineImpulseListener` extension to the Virtual Camera(s) that should react.

```csharp
// Trigger an impulse from code
[SerializeField] CinemachineImpulseSource _impulseSource;

void OnExplosion()
{
    _impulseSource.GenerateImpulse();                   // default force
    _impulseSource.GenerateImpulseWithForce(2.5f);      // custom amplitude
    _impulseSource.GenerateImpulseAt(hitPoint, force);  // world position
}
```

**CinemachineCollisionImpulseSource** filtering:
- `LayerMask` — only collisions on specified layers generate impulse.
- `IgnoreTag` — objects with this tag never trigger impulse.
- `ScaleImpactWithMass` / `ScaleImpactWithSpeed` — physical scaling for realistic response.

## Extensions & Scripting

Create reusable camera behaviors by inheriting from `CinemachineExtension`:

```csharp
public class MyZoomExtension : CinemachineExtension
{
    public float ZoomOffset = 5f;

    protected override void PostPipelineStageCallback(
        CinemachineVirtualCameraBase vcam,
        CinemachineCore.Stage stage,
        ref CameraState state,
        float deltaTime)
    {
        if (stage == CinemachineCore.Stage.Body)
        {
            state.RawPosition += state.ReferenceUp * ZoomOffset;
        }
    }
}
```

`PostPipelineStageCallback` fires after each pipeline stage: `Body`, `Aim`, `Noise`, `Finalize`. Modify `state.RawPosition` or `state.RawOrientation` in place.

**ThirdPersonAim extension** — projects a ray from camera forward to find the true aiming point; populates `state.ReferenceLookAt`. Use with ThirdPersonFollow for shooter cameras. Enable **Noise Cancellation** to stabilize the crosshair even with positional noise active.

## Performance

- **Deactivate unused Virtual Cameras.** Standby cameras are cheap; Disabled cameras are free. Only activate cameras needed for the current gameplay context.
- Each active (non-disabled) camera still ticks every frame in Standby mode. In a scene with 20+ cameras, batch-deactivate cameras that are never needed simultaneously.
- Monitor camera updates with the Unity Profiler; custom `ManualUpdate` callbacks must complete in under 1 ms.
- For LOD-style complexity: reduce noise channels or disable Composer soft zone logic on distant/secondary cameras.

## Timeline Integration

Control Virtual Camera properties directly from a Cinemachine Track in Timeline:

1. Add a **Cinemachine Track** to the Timeline asset.
2. Bind the track to the `CinemachineBrain`.
3. Add **Cinemachine Shot clips** — each clip maps to a Virtual Camera and defines its active window.
4. Overlap clips to define blend duration and curve between shots.

Use Timeline for cutscenes where frame-exact timing is required. Use priority/activation for real-time gameplay cameras.

## Anti-patterns

- **One camera for all states.** Do not animate a single camera's properties directly. Instead, create dedicated Virtual Cameras per state and blend between them.
- **Manipulating the Unity Camera transform directly.** The Brain owns the Unity Camera transform while a Virtual Camera is live. Direct `transform.position` writes are overridden every frame.
- **Setting Follow and LookAt to the same object for a cinematic shot.** For subject-framing shots, LookAt the subject and Follow a separate dolly or anchor point.
- **Excessive damping.** Values above 3–4 make the camera visibly lag behind fast targets. Values near 0 create mechanical snapping. Use 0.5–2.0 as a starting range and tune per genre.
- **Dead zone too large.** The camera won't reframe until the target reaches the edge. For action games, keep the dead zone tight (0.05–0.1 normalized). For strategy/exploration, wider dead zones feel appropriate.
- **Ignoring UpdateMethod mismatch.** If the Follow target moves in `FixedUpdate` (physics Rigidbody) but the Brain uses `LateUpdate`, expect judder. Match the Brain's `BlendUpdateMethod` to the target's update timing.
- **Forgetting `ImpulseListener` on the camera.** `CinemachineImpulseSource.GenerateImpulse()` does nothing if no Virtual Camera has a `CinemachineImpulseListener` extension attached.
