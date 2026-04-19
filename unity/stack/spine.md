---
version: 1.0.0
---

# Spine

> **Scope**: Spine skeletal animation runtime for Unity — component selection, animation state management, multi-track blending, skin combining, event handling, shader and render pipeline setup, and performance tuning.
> **Load when**: playing animations with Spine, using SkeletonAnimation or SkeletonGraphic, switching or combining skins at runtime, handling animation events, debugging Spine rendering issues, setting up Spine for URP or Linear color space.

---

## Component Selection

| Component | Use When | Renderer |
|-----------|----------|----------|
| `SkeletonAnimation` | Game characters, enemies, NPCs — default choice | `MeshRenderer` (SpriteMask-compatible) |
| `SkeletonGraphic` | Canvas UI elements (portraits, health bars, menus) | `CanvasRenderer` (RectMask2D, CanvasGroup-compatible) |
| `SkeletonMecanim` | Projects that already heavily use Animator Controller | `MeshRenderer` via Animator |
| `SkeletonRenderer` | Custom / procedural animation logic with no AnimationState | `MeshRenderer`, minimal overhead |

- **Prefer `SkeletonAnimation`** for ~90 % of gameplay objects — maximum control, best runtime performance.
- **Use `SkeletonGraphic`** when the skeleton must interact with Unity's UI masking (`RectMask2D`, `CanvasGroup`). Requires `Spine/SkeletonGraphic*` shaders — **not** the regular `Spine/Skeleton` shaders.
- **Avoid `SkeletonMecanim`** unless migrating an existing Animator Controller workflow — it runs at roughly half the frame rate of `SkeletonAnimation` under load.

## Setup & Import

- Export skeleton data as **binary** (`.skel.bytes`) rather than JSON — faster loading and smaller files.
- Atlas files **must** have the `.atlas.txt` extension — Unity's Spine importer does not recognise a bare `.atlas` file.
- **Drop all export files at once** (`.skel.bytes` / `.json` + `.atlas.txt` + textures) — the importer auto-generates `SkeletonDataAsset` and `SpineAtlasAsset`. Importing individually causes "Missing Atlas" errors.
- Keep the Spine Editor version and the spine-unity runtime version in sync — mismatches produce import errors.

## Shader & Render Pipeline

### Built-In Render Pipeline
Use the `Spine/Skeleton` shader family included with the spine-unity package. No extra steps required.

### Universal Render Pipeline (URP)
- Install the `com.esotericsoftware.spine.urp-shaders` UPM package — the built-in shaders are **not** compatible with URP and produce purple / wrong materials.
- Enable **SRP Batching** in the URP Asset to reduce draw calls across many Spine GameObjects.

### Linear Color Space + PMA
Premultiplied Alpha (PMA) textures are **incompatible** with Unity's Linear color space (the default for new projects):

1. Export textures from Spine with **Straight Alpha**.
2. Enable **PMA Vertex Colors** on the `SkeletonRenderer` / `SkeletonGraphic` component.
3. Select the `"PMA Vertex, Straight Texture"` blend mode on Sprite shaders.

## Animation Control

### Setting Animations

```csharp
// Set a looping animation on track 0
TrackEntry entry = skeletonAnimation.AnimationState.SetAnimation(0, "walk", true);

// Queue an animation after the current one (delay in seconds)
skeletonAnimation.AnimationState.AddAnimation(0, "idle", true, 0.5f);

// Type-safe reference via AnimationReferenceAsset (drag-and-drop in Inspector)
[SerializeField] AnimationReferenceAsset _walkAnim;
TrackEntry entry = skeletonAnimation.AnimationState.SetAnimation(0, _walkAnim, true);
```

**Never call `SetAnimation()` inside `Update()` every frame** — the animation restarts from frame 0 on each call. Track the current state externally and call `SetAnimation` only when transitioning.

### Multi-Track Blending

Spine supports multiple animation tracks (0, 1, 2 …), applied sequentially:

- **Track 0** — base body animation (walk, run, idle).
- **Track 1+** — layered overrides affecting only their keyed bones (e.g., arm-only shooting).

```csharp
// Additive arm animation on track 1 at 80 % influence
TrackEntry armEntry = animationState.SetAnimation(1, "shoot-arm", true);
armEntry.MixBlend = MixBlend.Add;
armEntry.Alpha = 0.8f;
```

### Crossfade Duration

```csharp
// Global default mix for all pairs
skeletonAnimation.AnimationState.Data.DefaultMix = 0.2f;

// Between specific animation pairs
skeletonAnimation.AnimationState.Data.SetMix("walk", "run", 0.1f);

// Per-transition override via TrackEntry
TrackEntry entry = animationState.SetAnimation(0, "run", true);
entry.MixDuration = 0.3f;
```

### Transitioning to Setup Pose

```csharp
// Mix out to setup pose over 0.3 s
animationState.SetEmptyAnimation(0, 0.3f);

// Queue an empty animation after current
animationState.AddEmptyAnimation(0, 0.3f, 0f);
```

### Coroutine Yield Instructions

```csharp
yield return new WaitForSpineAnimationComplete(trackEntry);
yield return new WaitForSpineEvent(animationState, "footstep");
```

## Events

### Event Types

| Event | Fires When |
|-------|-----------|
| `Start` | Animation begins playback (or a queued animation starts) |
| `Interrupt` | A new animation begins mixing with the current one |
| `End` | Animation is removed from the track (interrupted, cleared, or mixed-out) |
| `Dispose` | AnimationState releases the TrackEntry from its internal pool |
| `Complete` | Non-looping animation finishes; looping animation completes one cycle |
| `Event` | User-defined event key (purple in Spine editor) is reached |

Ordering at transitions: **Complete → End → Start**

### Subscribing

```csharp
void OnEnable() {
    // All animations on all tracks
    skeletonAnimation.AnimationState.Event    += HandleSpineEvent;
    skeletonAnimation.AnimationState.Complete += HandleComplete;
}

void OnDisable() {
    skeletonAnimation.AnimationState.Event    -= HandleSpineEvent;
    skeletonAnimation.AnimationState.Complete -= HandleComplete;
}

void HandleSpineEvent(TrackEntry entry, Spine.Event e) {
    // Compare by cached EventData reference — faster than string comparison
    if (e.Data == _footstepEventData) PlayFootstep();
}
```

### Subscribing to a Specific TrackEntry (Single Animation)

```csharp
TrackEntry entry = animationState.SetAnimation(0, "attack", false);
entry.Complete += OnAttackComplete;
// Stop holding the reference from Dispose onward — the object is recycled
entry.Dispose  += _ => entry = null;
```

### EventThreshold

Controls how long user events fire during a crossfade:

```csharp
entry.EventThreshold = 0.5f; // events fire until 50 % of the mix is done
// 0 (default) = stop immediately; 1 = fire until the last mix frame
```

### Critical Warning

**Never** subscribe `AnimationState.End` to a handler that calls `SetAnimation` — `End` fires when an animation is *interrupted*, creating infinite recursion. Use `TrackEntry.End` for single-animation handling instead.

## Skeleton Manipulation

### Inspector Dropdown Attributes

```csharp
[SpineBone]                public string boneName;
[SpineSlot]                public string slotName;
[SpineAttachment]          public string attachmentName;
[SpineSkin]                public string skinName;
[SpineAnimation]           public string animationName;
[SpineEvent]               public string eventName;
[SpineIkConstraint]        public string ikConstraintName;
[SpineTransformConstraint] public string transformConstraintName;
[SpinePathConstraint]      public string pathConstraintName;
```

These attributes populate Inspector dropdowns with valid values from the `SkeletonDataAsset`.

### Skin Switching

```csharp
skeleton.SetSkin("hero-knight");
skeleton.SetSlotsToSetupPose(); // Always call — clears leftover attachment state
```

### Runtime Skin Combining (Mix-and-Match)

```csharp
var customSkin = new Skin("custom");
customSkin.AddSkin(skeletonData.FindSkin("base"));
customSkin.AddSkin(skeletonData.FindSkin("hair/brown"));
customSkin.AddSkin(skeletonData.FindSkin("clothes/hoodie"));
skeleton.SetSkin(customSkin);
skeleton.SetSlotsToSetupPose();
```

**Runtime repacking** combines skins into one texture to cut draw calls. Requires `Read/Write Enabled` on all source textures:

```csharp
using Spine.Unity.AttachmentTools;

Skin repacked = customSkin.GetRepackedSkin(
    "RepackedSkin",
    primaryMaterial,
    out Material runtimeMaterial,
    out Texture2D runtimeAtlas
);
skeleton.SetSkin(repacked);
skeleton.SetSlotsToSetupPose();
// Keep runtimeMaterial / runtimeAtlas references; destroy them when no longer needed
```

### Flipping

```csharp
// Prefer skeleton-space flipping over Transform.localScale — avoids physics/constraint issues
skeleton.ScaleX = -1f; // flip horizontal
skeleton.ScaleY =  1f;
```

### Bone Manipulation (Procedural)

Modify bones inside the `UpdateWorld` callback to avoid one-frame lag:

```csharp
skeletonAnimation.UpdateWorld += _ => {
    Bone bone = skeleton.FindBone("weapon-hand");
    bone.SetPositionSkeletonSpace(targetLocalPosition);
};
```

### Reset Helpers

```csharp
skeleton.SetToSetupPose();        // Bones + slots
skeleton.SetBonesToSetupPose();   // Bones only
skeleton.SetSlotsToSetupPose();   // Slots only (call after every SetSkin)
```

## Performance

- Enable **Immutable Triangles** if the skeleton never changes attachment visibility — skips triangle updates each frame.
- Enable **Single Submesh** when using only one material — reduces batch overhead.
- Set **`UpdateMode`** to reduce update frequency for off-screen or distant characters.
- Use **one atlas per skeleton** to minimise material switching.
- For `SkeletonGraphic`: pack all textures into a single atlas. `Multiple CanvasRenderers` mode lifts the single-texture limit at an additional rendering cost.
- Set **`Clear State on Disable = true`** when pooling Spine GameObjects — prevents animation state leaking across reuse cycles.
- Enable SRP Batching (URP) to reduce draw calls across many Spine GameObjects.

## Script Execution Order

Scripts that prepare the skeleton before `SkeletonAnimation.Update` must run earlier:

```csharp
[DefaultExecutionOrder(-1)]
public class ProceduralSetup : MonoBehaviour {
    void Update() {
        skeleton.SetToSetupPose(); // guaranteed to run before SkeletonAnimation
    }
}
```

Manual update control when execution order is not sufficient:

```csharp
skeletonAnimation.Update(0);         // Full update, no time advance
skeletonAnimation.ApplyAnimation();  // Re-apply animations only
skeletonAnimation.LateUpdateMesh();  // Rebuild mesh only
```

## Anti-patterns

- **Calling `SetAnimation` every `Update` frame** — animation never advances past frame 0; track current state and call only on transitions.
- **Using `Spine/Skeleton` shader on `SkeletonGraphic`** — invisible or broken rendering; use `Spine/SkeletonGraphic*` shaders.
- **Omitting `SetSlotsToSetupPose` after `SetSkin`** — previous attachment visibility persists on the skeleton.
- **Modifying bones outside the update callbacks** — next animation update overwrites the change; use the `UpdateWorld` callback.
- **PMA textures in Linear color space** — washed-out colors; export Straight Alpha, enable PMA Vertex Colors, use the matching blend mode.
- **Built-In shaders in a URP project** — purple/incorrect materials; install `com.esotericsoftware.spine.urp-shaders`.
- **Subscribing `AnimationState.End` to a handler that calls `SetAnimation`** — infinite recursion; use `TrackEntry.End` for single-animation scope.
- **Importing Spine assets individually** — "Missing Atlas" errors; always import all export files together in one drag-and-drop.
- **Flipping via `Transform.localScale`** — can break physics constraints; use `skeleton.ScaleX = -1f` instead.
- **Holding a `TrackEntry` reference after its `Dispose` event fires** — the object is recycled into the pool; null out the reference in the `Dispose` callback.
