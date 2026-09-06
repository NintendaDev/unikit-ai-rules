# Feel — Quick reference (start here)

> **Base path:** `Assets/Third-Party Assets/Feel/` (Feel v5.9.1)
> See also: [feel-feedbacks-full.md](feel-feedbacks-full.md) (all 199 feedbacks), [feel-tools-full.md](feel-tools-full.md) (all tools, shakers, springs, haptics), [feel-use-cases.md](feel-use-cases.md) (ready-made recipes)

The ~15% of Feel that covers ~85% of real work. **Read this file first.** If nothing
here matches the task, open the matching full index — do not guess a class name.

---

## 1. Pick a feedback by intent

| I want to… | Use | Notes |
|---|---|---|
| Punch / pop an object | `Transform/Scale` or `Transform/Scale Spring` | Spring version survives re-triggering mid-flight |
| Nudge, knock back, slide | `Transform/Position` | Relative offset mode is what you usually want |
| Wobble, jitter, tension | `Transform/Position Shake`, `Rotation Shake` | Needs the matching shaker on the target |
| Make something feel alive/organic | `Transform/Squash and Stretch Spring` | Mass-conserving deformation |
| Sell an impact | `Time/Freeze Frame` | 0.01–0.05 s. Needs `MMTimeManager`. Highest impact-per-effort in the library |
| Shake the screen | `Camera/Camera Shake` or `Camera/Cinemachine Impulse` | Impulse if the project uses Cinemachine |
| Punch-zoom the camera | `Camera/Camera Zoom` | Needs `MMCameraShaker` |
| Flash the whole screen | `Camera/Flash` | Needs an `MMFlash` image |
| Fade in / out | `Camera/Fade` | Needs an `MMFader` image |
| Slow motion / bullet time | `Time/Timescale Modifier` | Needs `MMTimeManager` |
| Flash a character white on hit | `Renderer/Flicker` | Or `Renderer/MMBlink` for multi-phase patterns |
| Distort the screen on hit | `PostProcess/Chromatic Aberration` + `Lens Distortion` | Pipeline-suffixed variant + shaker on the Volume |
| Damage vignette | `PostProcess/Vignette` | |
| Play a sound | `Audio/MMSoundManager Sound` | `Audio/Sound` only for throwaway prototypes |
| Duck the music | `Audio/MMSoundManager Track Fade` | |
| Play particles | `Particles/Particles Play` | Prefer over Instantiation when the system can live in the prefab |
| Spawn a prefab / VFX | `GameObject/Instantiate Object` | Enable pooling in the feedback |
| Show damage numbers | `UI/Floating Text` | Needs `MMFloatingTextSpawner`; pass the number as play intensity |
| Fire an animation | `Animation/Animation Parameter` | |
| Fade a UI panel | `UI/CanvasGroup` | |
| Animate a bar / cooldown | `UI/Image Fill` | Or the `MMProgressBar` tool for anything with delay/bump |
| Count a score up | `TextMesh Pro/TMP Count To` | |
| Typewriter text | `TextMesh Pro/TMP Text Reveal` | |
| Call my own code | `Events/Unity Events` | |
| Wait before the next stage | `Pause/Holding Pause` | Waits for everything above to finish; plain `Pause` does not |
| Repeat part of the stack | `Loop/Looper Start` + `Loop/Looper` | |
| Chain several players | `Feedbacks/MMF Player Chain` | |
| Vibrate the phone | `Haptics/Haptic Preset` | No-op on desktop, safe to leave in |
| Animate a property nothing else covers | `GameObject/Property` | Reflection-based universal fallback |
| Document a long stack | `Debug/Comment` | Costs nothing, makes the list readable |

---

## 2. Most-used feedbacks by category

Counts in brackets are how many feedbacks the category holds in total.

**Transform (16)** — `Position`, `Rotation`, `Scale`, `Position Shake`, `Rotation Shake`,
`Position Spring`, `Rotation Spring`, `Scale Spring`, `Squash and Stretch Spring`, `Destination`.

**Camera (11)** — `Camera Shake`, `Camera Zoom`, `Flash`, `Fade`, `Cinemachine Impulse`,
`Field of View`, `Orthographic Size`.

**Time (2)** — `Freeze Frame`, `Timescale Modifier`. Both need `MMTimeManager` in the scene.

**Audio (19)** — `MMSoundManager Sound`, `MMSoundManager Track Fade`, `AudioSource`,
`AudioSource Pitch`, `Audio Filter Low Pass`, `MMPlaylist`.

**PostProcess (32)** — `Chromatic Aberration`, `Lens Distortion`, `Vignette`, `Bloom`,
`Depth Of Field`, `Color Adjustments`. **Always pick the variant matching the render
pipeline** (`… URP`, `… HDRP`, or unsuffixed for Post Processing v2) and put the matching
shaker on the Volume — the feedback inspector's **Automatic Shaker Setup** button does both.

**Renderer (15)** — `Flicker`, `MMBlink`, `Material Set Property`, `Sprite`,
`SpriteRenderer`, `Shader Global`, `Texture Offset`.

**UI (21)** — `Image`, `Image Alpha`, `Image Fill`, `CanvasGroup`, `Floating Text`,
`RectTransform Pivot`, `Image RaycastTarget`.

**TextMesh Pro (15)** — `TMP Count To`, `TMP Text Reveal`, `TMP Color`, `TMP Font Size`,
`TMP Character Spacing`.

**GameObject (13)** — `Set Active`, `Enable Behaviour`, `Instantiate Object`, `Destroy`,
`Rigidbody`, `Property`.

**Particles (4)** — `Particles Play`, `Particles Instantiation`.

**Animation (5)** — `Animation Parameter`, `Animator Speed`, `Animation Crossfade`.

**Sequencing — Pause (2) / Loop (2) / Feedbacks (4)** — `Pause`, `Holding Pause`,
`Looper Start` + `Looper`, `MMF Player Chain`, `MMF Player Control`.

**Events (3)** — `Unity Events`, `MMGameEvent`.

**Haptics (6)** — `Haptic Preset`, `Haptic Continuous`, `Haptic Clip`.
Never use `Haptics DEPRECATED!`.

**Springs (5)**, **Lights (2)**, **Scene (2)**, **Debug (3)**, **UI Toolkit (17)** —
niche; look them up in the full index when needed.

---

## 3. Key tools

| Tool | Use it for |
|---|---|
| `MMTimeManager` | **Required** for Freeze Frame and Timescale Modifier. One per scene. |
| `MMSoundManager` | Pooled audio with tracks (Master/Music/SFX/UI), fades, per-sound IDs, saved volume settings. Required by every `MMSoundManager *` feedback. |
| `MMProgressBar` | Health/XP/cooldown bars: delayed ghost bar, bump on change, colour flash, fill by scale/fillAmount/width/anchor. |
| `MMFloatingTextSpawner` | Pooled damage numbers; the `UI/Floating Text` feedback drives it. |
| `MMFlash` / `MMFader` | Full-screen flash and fade images. Required by the Flash and Fade feedbacks. |
| `MMCameraShaker` / `MMCinemachineCameraShaker` | Required by Camera Shake and Camera Zoom. |
| Post-process shakers (`MMVignetteShaker_URP` etc.) | Required on the Volume by every post-process feedback. |
| `MMChannel` (ScriptableObject) | Named channels for shakers and remote players — prefer over raw integers. |
| `MMF_PlayerDebugInput` | Play a feedback stack from a key press while iterating. |
| `MMFeedbacksAuthorizations` | Globally disable a whole feedback class (all haptics, all post-process) per platform or accessibility setting. |
| Spring components (`MMSpringPosition`, `MMSpringScale`, `MMSpringImageFillAmount`…) | Interruptible, re-targetable animation — the right tool for anything the player can spam. |
| `MMBlink` / `MMWiggle` | Multi-phase blink and continuous wiggle; targeted by their feedbacks. |
| `MMSquashAndStretch` | Automatic velocity-driven squash on a model. |
| `MMShufflebag<T>` | Random without clumping — variation in sounds and effects. |
| `MMLootTable<T>` | Weighted random drops. |
| `MMTween` / `MMTweenType` | Feel's easing library; `MMTweenType` is the serialized field used across feedbacks. |
| `MMDebugMenu` | Mobile-friendly in-game debug menu with a command line. |
| Menu `Tools > More Mountains > MMFeedbacks > Output MMF_Feedbacks list` | Prints which feedbacks actually compiled in this project — the definitive answer when one is missing from the dropdown. |

---

## 4. Ten rules that prevent most mistakes

1. Use `MMF_Player`, never the legacy `MMFeedbacks` component.
2. Post-process, camera and audio-filter feedbacks do nothing without their shaker —
   press **Automatic Shaker Setup** in the feedback inspector.
3. Pick the render-pipeline variant that matches the project, and make sure the
   corresponding define (`MM_URP` / `MM_HDRP`) is set, or the feedback will not exist.
4. Freeze Frame and Timescale Modifier need `MMTimeManager` in the scene.
5. After changing a feedback's timing at runtime, call `ComputeCachedTotalDuration()`.
   After changing any cached property, call `Initialization()`.
6. `Pause` blocks the sequence blindly; `Holding Pause` waits for the feedbacks above
   it to finish. Use `Holding Pause` when you mean "then".
7. Never copy an MMF_Player with Unity's "copy component values" — use Feel's own
   Copy/Paste buttons.
8. Label every feedback, and address it as `GetFeedbackOfType<T>("Label")` when a player
   holds more than one of a type.
9. Give repeatable effects a `CooldownDuration` so spam cannot thrash them.
10. Prefer springs over curves for anything the player can re-trigger before it finishes.
