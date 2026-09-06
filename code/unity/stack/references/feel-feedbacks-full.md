# Feel — Full feedback index

> **Base path:** `Assets/Third-Party Assets/Feel/MMFeedbacks/` (Feel v5.9.1, 199 feedbacks)
> See also: [feel-quickref.md](feel-quickref.md) (short index — read this first), [feel-tools-full.md](feel-tools-full.md) (tools, shakers, springs, haptics), [feel-use-cases.md](feel-use-cases.md) (recipes)

Exhaustive index of every feedback shipped with Feel, grouped by the category shown
in the MMF_Player "Add new feedback" dropdown. `Menu path` is what you type in the
inspector search field; `Class` is what `GetFeedbackOfType<T>()` expects in code.

**How to read the Setup column**
- `—` — works out of the box, only needs a target reference.
- `Shaker: X` — a component of type `X` must exist on the effect target. Most of these
  expose the **Automatic Shaker Setup** button in the feedback inspector, which creates
  the shaker (and the Volume, if needed) for you.
- `Scene: X` — a manager singleton of type `X` must be present in the scene.
- `Pkg: X` — the corresponding Unity package must be installed.
- `Define: X` — the scripting define symbol must be set, otherwise the feedback is
  compiled out and does not appear in the dropdown at all.

---

## 1. Transform (16)

Object-space animation. The workhorses of game feel — `Position`, `Scale`, `Rotation`
cover most needs, the `*Shake` and `*Spring` variants add procedural motion.

| Menu path | Class | What it does | Setup |
|---|---|---|---|
| Transform/Position | `MMF_Position` | Animates position over a duration along per-axis curves, from an initial to a destination point; supports relative offsets, world/local space, and path modes. | — |
| Transform/Rotation | `MMF_Rotation` | Animates rotation on three independent per-axis curves for a set duration. | — |
| Transform/Scale | `MMF_Scale` | Animates scale on three per-axis curves with a shared multiplier. The default "punch" feedback. | — |
| Transform/Position Shake | `MMF_PositionShake` | Emits a position shake event with speed, range and direction; either drives a `TargetShaker` directly or broadcasts on a channel. | Shaker: `MMPositionShaker` (or direct target) |
| Transform/Rotation Shake | `MMF_RotationShake` | Same as Position Shake but on rotation — procedural wobble around the current orientation. | Shaker: `MMRotationShaker` |
| Transform/Scale Shake | `MMF_ScaleShake` | Procedural scale shake, useful for idle jitter and sustained tension. | Shaker: `MMScaleShaker` |
| Transform/Position Spring | `MMF_PositionSpring` | Drives position with a damped spring. Modes: `MoveTo`, `MoveToAdditive`, `Bump`. Overshoots and settles instead of following a curve. | Requires `AnimatePositionTarget` |
| Transform/Rotation Spring | `MMF_RotationSpring` | Spring-driven rotation with the same MoveTo / Bump modes. | Requires target |
| Transform/Scale Spring | `MMF_ScaleSpring` | Spring-driven scale — the most natural "pop" for UI and pickups. | Requires target |
| Transform/Squash and Stretch | `MMF_SquashAndStretch` | Scales one axis while the other axes compensate to conserve volume. Target must have a normalized (1,1,1) scale. | Normalized scale on target |
| Transform/Squash and Stretch Spring | `MMF_SquashAndStretchSpring` | Spring version of squash-and-stretch — mass-conserving deformation that overshoots and settles. | Requires target |
| Transform/Destination | `MMF_DestinationTransform` | Animates position, rotation and/or scale of a target to exactly match another transform. | — |
| Transform/LookAt | `MMF_LookAt` | Rotates a transform to look at a target over time; can also broadcast a `MMLookAtShake` event on a channel. | Optional shaker: `MMLookAtShaker` |
| Transform/Rotate Position Around | `MMF_RotatePositionAround` | Moves the target along an arc around a specified rotation center — orbit, not self-rotation. | — |
| Transform/Set Parent | `MMF_SetParent` | Reparents a transform on play, optionally preserving world position. | — |
| Transform/Wiggle | `MMF_Wiggle` | Triggers position / rotation / scale wiggles on an object carrying a `MMWiggle` component, each with its own duration. | Component: `MMWiggle` |

---

## 2. Camera (11)

Screen-level framing effects. Anything named `Camera *` needs a shaker on the camera;
`Cinemachine *` needs the Cinemachine package plus an Impulse Listener.

| Menu path | Class | What it does | Setup |
|---|---|---|---|
| Camera/Camera Shake | `MMF_CameraShake` | Broadcasts a camera shake with duration, amplitude and frequency. The default impact effect. | Shaker: `MMCameraShaker` (or `MMCinemachineCameraShaker`) |
| Camera/Camera Zoom | `MMF_CameraZoom` | Punch-zooms the camera FOV (`For`, `Set` or `Reset` mode) and returns to the original value. | Shaker: `MMCameraShaker` |
| Camera/Field of View | `MMF_CameraFieldOfView` | Animates a perspective camera's field of view along a curve. | Shaker: `MMCameraFieldOfViewShaker` |
| Camera/Orthographic Size | `MMF_CameraOrthographicSize` | Animates an orthographic camera's size — the 2D equivalent of FOV zoom. | Shaker: `MMCameraOrthographicSizeShaker` |
| Camera/Clipping Planes | `MMF_CameraClippingPlanes` | Animates near/far clipping planes, used for dissolve-in and reveal tricks. | Shaker: `MMCameraClippingPlanesShaker` |
| Camera/Fade | `MMF_Fade` | Triggers a fade event (FadeIn / FadeOut / Custom) intercepted by a fader image. | Component: `MMFader` / `MMFaderRound` / `MMFaderDirectional` |
| Camera/Flash | `MMF_Flash` | Broadcasts a `MMFlashEvent` — a full-screen colour flash of a chosen colour, alpha and duration. | Component: `MMFlash` on a full-screen UI image |
| Camera/Cinemachine Impulse | `MMF_CinemachineImpulse` | Fires a Cinemachine Impulse with a raw signal definition — the modern way to shake a virtual camera. | Pkg: Cinemachine + Impulse Listener |
| Camera/Cinemachine Impulse Source | `MMF_CinemachineImpulseSource` | Generates an impulse through an existing `CinemachineImpulseSource` component, reusing its authored profile. | Pkg: Cinemachine + Impulse Source & Listener |
| Camera/Cinemachine Impulse Clear | `MMF_CinemachineImpulseClear` | Instantly cancels every impulse currently playing — use it when cutting scenes or pausing. | Pkg: Cinemachine |
| Camera/Cinemachine Transition | `MMF_CinemachineTransition` | Changes the priority of a virtual camera to trigger a blend to another shot. | Pkg: Cinemachine |

---

## 3. Audio (19)

`Audio/Sound` is the minimal one-shot player. Everything prefixed `MMSoundManager`
routes through Feel's own pooled audio manager and needs it in the scene.

| Menu path | Class | What it does | Setup |
|---|---|---|---|
| Audio/Sound | `MMF_Sound` | Minimal one-shot: plays an AudioClip with optional random pitch/volume. Simple by design — prefer the MMSoundManager version for anything real. | — |
| Audio/AudioSource | `MMF_AudioSource` | Plays / stops / pauses an existing AudioSource in the scene, with optional randomization of clip, pitch and volume. | — |
| Audio/AudioSource Volume | `MMF_AudioSourceVolume` | Animates an AudioSource's volume over time. | Shaker: `MMAudioSourceVolumeShaker` |
| Audio/AudioSource Pitch | `MMF_AudioSourcePitch` | Animates an AudioSource's pitch over time — the cheapest way to sell speed changes. | Shaker: `MMAudioSourcePitchShaker` |
| Audio/AudioSource Stereo Pan | `MMF_AudioSourceStereoPan` | Animates stereo pan from left to right over time. | Shaker: `MMAudioSourceStereoPanShaker` |
| Audio/AudioMixer Snapshot Transition | `MMF_AudioMixerSnapshotTransition` | Transitions the AudioMixer to a target snapshot over a duration — the standard "underwater / muffled" switch. | AudioMixer with snapshots |
| Audio/Audio Filter Distortion | `MMF_AudioFilterDistortion` | Animates a distortion filter's level over time. | Shaker: `MMAudioFilterDistortionShaker` |
| Audio/Audio Filter Echo | `MMF_AudioFilterEcho` | Animates an echo filter's wet mix over time. | Shaker: `MMAudioFilterEchoShaker` |
| Audio/Audio Filter High Pass | `MMF_AudioFilterHighPass` | Animates a high-pass filter's cutoff frequency. | Shaker: `MMAudioFilterHighPassShaker` |
| Audio/Audio Filter Low Pass | `MMF_AudioFilterLowPass` | Animates a low-pass filter's cutoff — the classic "stunned / muffled" effect. | Shaker: `MMAudioFilterLowPassShaker` |
| Audio/Audio Filter Reverb | `MMF_AudioFilterReverb` | Animates a reverb filter's level over time. | Shaker: `MMAudioFilterReverbShaker` |
| Audio/MMSoundManager Sound | `MMF_MMSoundManagerSound` | Plays a sound through the pooled MMSoundManager with full options: track, loop, fade, 3D settings, `SoundID` for later control. | Scene: `MMSoundManager` |
| Audio/MMSoundManager Sound Control | `MMF_MMSoundManagerSoundControl` | Pauses / plays / stops / frees a previously played sound identified by its `SoundID`. | Scene: `MMSoundManager` |
| Audio/MMSoundManager Sound Fade | `MMF_MMSoundManagerSoundFade` | Fades one specific sound (by `SoundID`) to a target volume over a duration. | Scene: `MMSoundManager` |
| Audio/MMSoundManager Track Control | `MMF_MMSoundManagerTrackControl` | Plays / pauses / mutes / unmutes / stops / frees every sound on a track (Master, Music, SFX, UI). | Scene: `MMSoundManager` |
| Audio/MMSoundManager Track Fade | `MMF_MMSoundManagerTrackFade` | Fades a whole track's volume at once — the standard music duck. | Scene: `MMSoundManager` |
| Audio/MMSoundManager All Sounds Control | `MMF_MMSoundManagerAllSoundsControl` | Pauses / plays / stops / frees every sound currently playing. | Scene: `MMSoundManager` |
| Audio/MMSoundManager Save and Load | `MMF_MMSoundManagerSaveLoad` | Triggers save, load or reset of the player's sound settings (volumes, mutes). | Scene: `MMSoundManager` |
| Audio/MMPlaylist | `MMF_Playlist` | Drives a `MMPlaylist`: play, pause, stop, next, previous, play at index. | Component: `MMPlaylist` |

---

## 4. PostProcess (32)

Three parallel families, one per render pipeline. **Only the family matching your
pipeline exists at compile time** — the URP set is guarded by `MM_URP`, the HDRP set by
`MM_HDRP`, and the unsuffixed set requires the legacy Post Processing Stack v2 package.
Every one of these needs its shaker on the Volume/Profile; all support Automatic Shaker Setup.

### 4.1 Post Processing Stack v2 (unsuffixed) — 7

| Menu path | Class | What it does | Setup |
|---|---|---|---|
| PostProcess/Bloom | `MMF_Bloom` | Animates bloom intensity and threshold. | Pkg: PostProcessing v2 + `MMBloomShaker` |
| PostProcess/Chromatic Aberration | `MMF_ChromaticAberration` | Animates chromatic aberration intensity — the cheapest "hit" tell. | Pkg: PostProcessing v2 + `MMChromaticAberrationShaker` |
| PostProcess/Color Grading | `MMF_ColorGrading` | Animates post exposure, hue shift and saturation. | Pkg: PostProcessing v2 + `MMColorGradingShaker` |
| PostProcess/Depth Of Field | `MMF_DepthOfField` | Animates focus distance, aperture and focal length. | Pkg: PostProcessing v2 + `MMDepthOfFieldShaker` |
| PostProcess/Lens Distortion | `MMF_LensDistortion` | Animates lens distortion intensity — sells speed and impact. | Pkg: PostProcessing v2 + `MMLensDistortionShaker` |
| PostProcess/Vignette | `MMF_Vignette` | Animates vignette intensity and colour — damage and low-health states. | Pkg: PostProcessing v2 + `MMVignetteShaker` |
| PostProcess/Global PP Volume Auto Blend | `MMF_GlobalPPVolumeAutoBlend` | Drives a `MMGlobalPostProcessingVolumeAutoBlend` component, blending a whole volume's weight over time. | Component on the volume |

### 4.2 URP — 12 (all require `Define: MM_URP`)

| Menu path | Class | What it does | Setup |
|---|---|---|---|
| PostProcess/Bloom URP | `MMF_Bloom_URP` | Animates URP Bloom intensity and threshold. | Volume + `MMBloomShaker_URP` |
| PostProcess/Chromatic Aberration URP | `MMF_ChromaticAberration_URP` | Animates URP chromatic aberration intensity. | Volume + `MMChromaticAberrationShaker_URP` |
| PostProcess/Color Adjustments URP | `MMF_ColorAdjustments_URP` | Animates post exposure, contrast, hue shift, saturation and colour filter. | Volume + `MMColorAdjustmentsShaker_URP` |
| PostProcess/Channel Mixer URP | `MMF_ChannelMixer_URP` | Animates the red/green/blue channel mixer values — strong stylised tints. | Volume + `MMChannelMixerShaker_URP` |
| PostProcess/Depth Of Field URP | `MMF_DepthOfField_URP` | Animates URP depth of field focus distance, aperture and focal length. | Volume + `MMDepthOfFieldShaker_URP` |
| PostProcess/Film Grain URP | `MMF_FilmGrain_URP` | Animates film grain intensity and response. | Volume + `MMFilmGrainShaker_URP` |
| PostProcess/Lens Distortion URP | `MMF_LensDistortion_URP` | Animates URP lens distortion intensity. | Volume + `MMLensDistortionShaker_URP` |
| PostProcess/Motion Blur URP | `MMF_MotionBlur_URP` | Animates motion blur intensity and clamp. | Volume + `MMMotionBlurShaker_URP` |
| PostProcess/Panini Projection URP | `MMF_PaniniProjection_URP` | Animates panini projection distance and crop-to-fit — wide-FOV correction pops. | Volume + `MMPaniniProjectionShaker_URP` |
| PostProcess/Vignette URP | `MMF_Vignette_URP` | Animates URP vignette intensity, colour and smoothness. | Volume + `MMVignetteShaker_URP` |
| PostProcess/White Balance URP | `MMF_WhiteBalance_URP` | Animates temperature and tint — warm/cold shifts for state changes. | Volume + `MMWhiteBalanceShaker_URP` |
| PostProcess/Global PP Volume Auto Blend URP | `MMF_GlobalPPVolumeAutoBlend_URP` | Blends the weight of a whole URP Volume over time via a Global PP Volume Auto Blend URP component. | Component on the volume |

### 4.3 HDRP — 12 (all require `Define: MM_HDRP`)

| Menu path | Class | What it does | Setup |
|---|---|---|---|
| PostProcess/Bloom HDRP | `MMF_Bloom_HDRP` | Animates HDRP bloom intensity and scatter. | Volume + `MMBloomShaker_HDRP` |
| PostProcess/Chromatic Aberration HDRP | `MMF_ChromaticAberration_HDRP` | Animates HDRP chromatic aberration intensity. | Volume + `MMChromaticAberrationShaker_HDRP` |
| PostProcess/Color Adjustments HDRP | `MMF_ColorAdjustments_HDRP` | Animates post exposure, contrast, hue shift and saturation. | Volume + `MMColorAdjustmentsShaker_HDRP` |
| PostProcess/Channel Mixer HDRP | `MMF_ChannelMixer_HDRP` | Animates the channel mixer matrix. | Volume + `MMChannelMixerShaker_HDRP` |
| PostProcess/Depth of Field HDRP | `MMF_DepthOfField_HDRP` | Animates HDRP depth of field focus distance. | Volume + `MMDepthOfFieldShaker_HDRP` |
| PostProcess/Exposure HDRP | `MMF_Exposure_HDRP` | Animates fixed exposure and compensation — HDRP-only, no URP equivalent. | Volume + `MMExposureShaker_HDRP` |
| PostProcess/Film Grain HDRP | `MMF_FilmGrain_HDRP` | Animates film grain intensity and response. | Volume + `MMFilmGrainShaker_HDRP` |
| PostProcess/Lens Distortion HDRP | `MMF_LensDistortion_HDRP` | Animates HDRP lens distortion intensity. | Volume + `MMLensDistortionShaker_HDRP` |
| PostProcess/Motion Blur HDRP | `MMF_MotionBlur_HDRP` | Animates motion blur intensity. | Volume + `MMMotionBlurShaker_HDRP` |
| PostProcess/Panini Projection HDRP | `MMF_PaniniProjection_HDRP` | Animates panini projection distance. | Volume + `MMPaniniProjectionShaker_HDRP` |
| PostProcess/Vignette HDRP | `MMF_Vignette_HDRP` | Animates HDRP vignette intensity and colour. | Volume + `MMVignetteShaker_HDRP` |
| PostProcess/White Balance HDRP | `MMF_WhiteBalance_HDRP` | Animates temperature and tint. | Volume + `MMWhiteBalanceShaker_HDRP` |

### 4.4 Pipeline-agnostic — 1

| Menu path | Class | What it does | Setup |
|---|---|---|---|
| PostProcess/PPMovingFilter | `MMF_PPMovingFilter` | Fires an event caught by a `MMPostProcessingMovingFilter` object — moves a filter volume through the world instead of tweening a value. | Component: `MMPostProcessingMovingFilter` |

---

## 5. UI (21)

uGUI (Canvas) feedbacks. For UI Toolkit see section 6; for TextMeshPro see section 7.

| Menu path | Class | What it does | Setup |
|---|---|---|---|
| UI/Image | `MMF_Image` | Animates an Image's colour over time; can also drive one or many image shakers on a channel. | — |
| UI/Image Alpha | `MMF_ImageAlpha` | Animates only the alpha of an Image — cheaper than a full colour tween. | — |
| UI/Image Fill | `MMF_ImageFill` | Animates `fillAmount` — cooldown sweeps, radial timers, simple bars. | Image in Filled mode |
| UI/Image Sprite | `MMF_ImageSprite` | Swaps the sprite of an Image on play (single, sequential or random). | — |
| UI/Image Material | `MMF_ImageMaterial` | Swaps the material on a UI Image. | — |
| UI/Image RaycastTarget | `MMF_ImageRaycastTarget` | Toggles `raycastTarget` — the standard way to lock input during a transition. | — |
| UI/Image Texture Offset | `MMF_ImageTextureOffset` | Animates the texture offset on a UI Image's material — scrolling patterns. | — |
| UI/Image Texture Scale | `MMF_ImageTextureScale` | Animates the texture scale on a UI Image's material. | — |
| UI/Graphic | `MMF_Graphic` | Animates the colour of any `Graphic` (Image, RawImage, Text…) over time. | — |
| UI/Graphic CrossFade | `MMF_GraphicCrossFade` | Triggers Unity's built-in `CrossFadeColor` / `CrossFadeAlpha` on a Graphic. | — |
| UI/CanvasGroup | `MMF_CanvasGroup` | Animates a CanvasGroup's alpha over time — the cleanest whole-panel fade. | — |
| UI/CanvasGroup BlocksRaycasts | `MMF_CanvasGroupBlocksRaycasts` | Toggles `blocksRaycasts` on a CanvasGroup on play. | — |
| UI/RectTransform Anchor | `MMF_RectTransformAnchor` | Animates the min and max anchors of a RectTransform over time. | — |
| UI/RectTransform Offset | `MMF_RectTransformOffset` | Animates `offsetMin` / `offsetMax` — the corner offsets relative to the anchors. | — |
| UI/RectTransform Pivot | `MMF_RectTransformPivot` | Animates the pivot position, which changes what the element rotates and scales around. | — |
| UI/RectTransformSizeDelta | `MMF_RectTransformSizeDelta` | Animates `sizeDelta` — resizing a panel without touching scale. | — |
| UI/Text | `MMF_Text` | Replaces the contents of a legacy `Text` component. | — |
| UI/Text Color | `MMF_TextColor` | Animates a legacy `Text` colour over time. | — |
| UI/Text Font Size | `MMF_TextFontSize` | Animates a legacy `Text` font size over time. | — |
| UI/Floating Text | `MMF_FloatingText` | Spawns a pooled floating text (damage numbers, gold, "+1"), with value, colour gradient and direction; the played intensity can be used as the displayed value. | Scene: `MMFloatingTextSpawner` |
| UI/Video Player | `MMF_VideoPlayer` | Controls a VideoPlayer: Play, Pause, Toggle, Stop, Prepare, StepForward/Backward, SetPlaybackSpeed, SetDirectAudioVolume/Mute, GoToFrame, ToggleLoop. | — |

---

## 6. UI Toolkit (17)

All operate on a named element inside a target `UIDocument`. Useful for editor tools
and UITK-based runtime UI; ignore this whole block if the project is uGUI-only.

| Menu path | Class | What it does |
|---|---|---|
| UI Toolkit/UITK Background Color | `MMF_UIToolkitBackgroundColor` | Animates an element's background colour. |
| UI Toolkit/UITK Border Color | `MMF_UIToolkitBorderColor` | Animates an element's border colour. |
| UI Toolkit/UITK Border Radius | `MMF_UIToolkitBorderRadius` | Animates an element's corner radius. |
| UI Toolkit/UITK Border Width | `MMF_UIToolkitBorderWidth` | Animates an element's border width. |
| UI Toolkit/UITK Opacity | `MMF_UIToolkitOpacity` | Animates an element's opacity. |
| UI Toolkit/UITK Scale | `MMF_UIToolkitScale` | Scales an element. |
| UI Toolkit/UITK Rotate | `MMF_UIToolkitRotate` | Rotates an element. |
| UI Toolkit/UITK Translate | `MMF_UIToolkitTranslate` | Translates an element. |
| UI Toolkit/UITK Size | `MMF_UIToolkitSize` | Animates an element's width and height. |
| UI Toolkit/UITK Transform Origin | `MMF_UIToolkitTransformOrigin` | Changes the transform origin (pivot) used by scale and rotation. |
| UI Toolkit/UITK Font Size | `MMF_UIToolkitFontSize` | Animates an element's font size. |
| UI Toolkit/UITK Text | `MMF_UIToolkitText` | Replaces an element's text content. |
| UI Toolkit/UITK Text Color | `MMF_UIToolkitTextColor` | Animates an element's text colour. |
| UI Toolkit/UITK Image Tint | `MMF_UIToolkitImageTint` | Animates the tint colour of an image element. |
| UI Toolkit/UITK Class | `MMF_UIToolkitClass` | Adds / removes / toggles a USS class on an element — the idiomatic UITK state switch. |
| UI Toolkit/UITK Stylesheet | `MMF_UIToolkitStylesheet` | Swaps the stylesheet applied to the document. |
| UI Toolkit/UITK Visible | `MMF_UIToolkitVisible` | Sets an element's visibility. |

---

## 7. TextMesh Pro (15)

Requires the TextMeshPro package. All target a `TMP_Text` component.

| Menu path | Class | What it does |
|---|---|---|
| TextMesh Pro/TMP Text | `MMF_TMPText` | Replaces the text content of a TMP component. |
| TextMesh Pro/TMP Text Reveal | `MMF_TMPTextReveal` | Reveals the text one character, word or line at a time — typewriter effect. |
| TextMesh Pro/TMP Count To | `MMF_TMPCountTo` | Counts a float from A to B along a curve and writes it into the text — score tickers. |
| TextMesh Pro/TMP Count To Long | `MMF_TMPCountToLong` | Same as Count To but with a `long` value, for big idle-game numbers. |
| TextMesh Pro/TMP Color | `MMF_TMPColor` | Animates the text colour over time. |
| TextMesh Pro/TMP Alpha | `MMF_TMPAlpha` | Animates the text alpha over time. |
| TextMesh Pro/TMP Font Size | `MMF_TMPFontSize` | Animates the font size. |
| TextMesh Pro/TMP Character Spacing | `MMF_TMPCharacterSpacing` | Animates the character spacing — a very cheap "impact" on headings. |
| TextMesh Pro/TMP Word Spacing | `MMF_TMPWordSpacing` | Animates the word spacing. |
| TextMesh Pro/TMP Line Spacing | `MMF_TMPLineSpacing` | Animates the line spacing. |
| TextMesh Pro/TMP Paragraph Spacing | `MMF_TMPParagraphSpacing` | Animates the paragraph spacing. |
| TextMesh Pro/TMP Dilate | `MMF_TMPDilate` | Animates the SDF dilate value — makes the glyphs swell and thin. |
| TextMesh Pro/TMP Softness | `MMF_TMPSoftness` | Animates the SDF softness — blur-in / focus effects. |
| TextMesh Pro/TMP Outline Color | `MMF_TMPOutlineColor` | Animates the outline colour. |
| TextMesh Pro/TMP Outline Width | `MMF_TMPOutlineWidth` | Animates the outline width. |

---

## 8. Renderer (15)

Anything that touches materials, sprites and renderer-level visuals.

| Menu path | Class | What it does | Setup |
|---|---|---|---|
| Renderer/Flicker | `MMF_Flicker` | Flickers a renderer's colour for a duration at a given octave — the classic hit flash on characters. | — |
| Renderer/Material | `MMF_Material` | Swaps the material on a renderer (single, sequential or random). | — |
| Renderer/Material Set Property | `MMF_MaterialSetProperty` | Sets or animates a named property on a renderer's material (float, colour, vector, texture). | — |
| Renderer/Shader Global | `MMF_ShaderGlobal` | Sets a global shader property or enables/disables a shader keyword — affects every material at once. | — |
| Renderer/ShaderController | `MMF_ShaderController` | Triggers a one-shot play on a target `ShaderController` component, which owns the curve and remap settings. | Component: `ShaderController` |
| Renderer/Sprite | `MMF_Sprite` | Swaps the sprite on a SpriteRenderer. | — |
| Renderer/SpriteRenderer | `MMF_SpriteRenderer` | Animates a SpriteRenderer's colour and can flip it on X or Y; can also drive `MMSpriteRendererShaker`s. | — |
| Renderer/SpriteRenderer Alpha | `MMF_SpriteRendererAlpha` | Animates only the alpha of a SpriteRenderer. | — |
| Renderer/Texture Offset | `MMF_TextureOffset` | Animates a material's texture offset — scrolling belts, treads, water. | — |
| Renderer/Texture Scale | `MMF_TextureScale` | Animates a material's texture scale. | — |
| Renderer/Skybox | `MMF_Skybox` | Replaces the scene skybox on play, with a specific or randomly picked material. | — |
| Renderer/Fog | `MMF_Fog` | Animates the scene fog's density, colour, start and end distance. | — |
| Renderer/Line Renderer | `MMF_LineRenderer` | Animates a LineRenderer's width and colour over time. | — |
| Renderer/Trail Renderer | `MMF_TrailRenderer` | Animates a TrailRenderer's length, width and colour over time. | — |
| Renderer/MMBlink | `MMF_Blink` | Triggers a blink sequence on a `MMBlink` component — richer than Flicker: phases, offsets, repeat counts. | Component: `MMBlink` |

---

## 9. GameObject (13)

Object lifecycle, physics and generic property manipulation.

| Menu path | Class | What it does | Setup |
|---|---|---|---|
| GameObject/Set Active | `MMF_SetActive` | Sets, forces or toggles a GameObject's active state on Init, Play, Stop and Reset independently. | — |
| GameObject/Enable Behaviour | `MMF_Enable` | Enables / disables / toggles a specific `Behaviour` (a single component, not the whole object). | — |
| GameObject/Instantiate Object | `MMF_InstantiateObject` | Instantiates a prefab at the feedback's position with an offset; can build and reuse an object pool at initialization. | — |
| GameObject/Destroy | `MMF_Destroy` | Destroys a target via `Destroy`, `DestroyImmediate`, or by deactivating it. | — |
| GameObject/Layer | `MMF_Layer` | Changes a GameObject's layer on play, optionally recursively. | — |
| GameObject/Collider | `MMF_Collider` | Enables / disables / toggles a 3D collider, or flips its `isTrigger` flag. | — |
| GameObject/Collider2D | `MMF_Collider2D` | Same as above for `Collider2D`. | — |
| GameObject/Rigidbody | `MMF_Rigidbody` | Applies forces and torques (relative or world) to a Rigidbody — knockback, launches. | — |
| GameObject/Rigidbody2D | `MMF_Rigidbody2D` | Same as above for `Rigidbody2D`. | — |
| GameObject/Property | `MMF_Property` | Animates *any* exposed property or field on *any* component over time via reflection. The universal escape hatch. | Target component selected |
| GameObject/FloatController | `MMF_FloatController` | Triggers a one-shot play on a target `FloatController`, which owns the curve/remap config. | Component: `FloatController` |
| GameObject/Broadcast | `MMF_Broadcast` | Broadcasts a float value into the MMRadio system for any number of receivers to consume. | — |
| GameObject/MMRadioSignal | `MMF_RadioSignal` | Plays a target `MMRadioSignal` with a specified duration and timescale, feeding a broadcaster. | Component: `MMRadioSignal` |

---

## 10. Springs (5)

Generic spring drivers, complementary to the `Transform/*Spring` feedbacks. These
target a spring **component** and pilot its value type directly.

| Menu path | Class | What it does | Setup |
|---|---|---|---|
| Springs/Spring Float | `MMF_SpringFloat` | Drives a float spring component (`MoveTo`, `MoveToAdditive`, `Bump`), with optional damping/frequency override per play. | Component: `MMSpringFloatComponent` subclass |
| Springs/Spring Vector2 | `MMF_SpringVector2` | Drives a Vector2 spring component. | Component: `MMSpringVector2Component` subclass |
| Springs/Spring Vector3 | `MMF_SpringVector3` | Drives a Vector3 spring component. | Component: `MMSpringVector3Component` subclass |
| Springs/Spring Vector4 | `MMF_SpringVector4` | Drives a Vector4 spring component. | Component: `MMSpringVector4Component` subclass |
| Springs/Spring Color | `MMF_SpringColor` | Drives a colour spring component. | Component: `MMSpringColorComponent` subclass |

---

## 11. Animation (5)

| Menu path | Class | What it does |
|---|---|---|
| Animation/Animation Parameter | `MMF_Animation` | Sets a bool, int, float or trigger parameter on an Animator, with optional randomization. The standard way to fire an animation from a feedback stack. |
| Animation/Animation Crossfade | `MMF_AnimationCrossfade` | Cross-fades an Animator into a named state over a transition duration. |
| Animation/Animator Play State | `MMF_AnimatorPlayState` | Plays a specific Animator state directly, in normalized or fixed time. |
| Animation/Animator Speed | `MMF_AnimatorSpeed` | Changes an Animator's speed — once, instantly-then-reset, or interpolated over time. |
| Animation/Sprite Sheet Animation | `MMF_SpriteSheetAnimation` | Plays a list of sprites on a SpriteRenderer or Image at a given frame rate, looping or not, with an optional random offset. |

---

## 12. Particles (4)

| Menu path | Class | What it does | Setup |
|---|---|---|---|
| Particles/Particles Play | `MMF_Particles` | Plays / stops / pauses an existing ParticleSystem already in the scene. Prefer this over instantiation when the system can live in the prefab. | — |
| Particles/Particles Instantiation | `MMF_ParticlesInstantiation` | Instantiates a ParticleSystem prefab at a position on Start or on Play, optionally nesting and pooling it. | — |
| Particles/VisualEffect | `MMF_VisualEffect` | Basic Play / Stop / Send-Event control on a VFX Graph `VisualEffect`. | Pkg: Visual Effect Graph |
| Particles/VisualEffectSetProperty | `MMF_VisualEffectSetProperty` | Sets a named exposed property (float, int, vector, bool) on a VFX Graph effect. | Pkg: Visual Effect Graph |

---

## 13. Lights (2)

| Menu path | Class | What it does | Setup |
|---|---|---|---|
| Lights/Light | `MMF_Light` | Animates a Light's colour, intensity and range over a duration, or sets them instantly. | Shaker: `MMLightShaker` for channel mode |
| Lights/Light2D_URP | `MMF_Light2D_URP` | Animates a URP 2D light's intensity, colour, falloff, shadow strength and volumetric intensity. | Define: `MM_URP` + `MMLight2DShaker_URP` |

---

## 14. Time (2)

Both require a `MMTimeManager` in the scene — without it they silently do nothing.

| Menu path | Class | What it does | Setup |
|---|---|---|---|
| Time/Freeze Frame | `MMF_FreezeFrame` | Freezes the timescale for a very short duration (0.01–0.05 s is the useful range). The single highest-impact "hit" feedback. | Scene: `MMTimeManager` |
| Time/Timescale Modifier | `MMF_TimescaleModifier` | Fires a `MMTimeScaleEvent`: sets a new timescale for a duration, with optional lerp in/out — slow-motion, bullet time. | Scene: `MMTimeManager` |

---

## 15. Pause & Loop (4)

Sequencing primitives. They do not affect the world — they shape *when* the other
feedbacks in the list run.

| Menu path | Class | What it does |
|---|---|---|
| Pause/Pause | `MMF_Pause` | Blocks the sequence for a fixed duration; nothing below it runs until it completes. |
| Pause/Holding Pause | `MMF_HoldingPause` | Waits until every feedback above it has finished, *then* pauses for the specified duration. Use this to build true sequential stages. |
| Loop/Looper Start | `MMF_LooperStart` | Marks the loop entry point; also acts as a pause. |
| Loop/Looper | `MMF_Looper` | Loops the sequence back to the nearest Looper Start above it, a set number of times or infinitely. |

---

## 16. Feedbacks (4)

Feedbacks that orchestrate other MMF_Players — composition without code.

| Menu path | Class | What it does | Setup |
|---|---|---|---|
| Feedbacks/MMF Player Chain | `MMF_PlayerChain` | Plays any number of target MMF_Players one after another, with delays before and after each. The cleanest way to build long cutscene-like sequences. | — |
| Feedbacks/MMF Player Control | `MMF_PlayerControl` | Plays / stops / pauses / resumes / skips / restores one or more target MMF_Players. | — |
| Feedbacks/Feedbacks Player | `MMF_Feedbacks` | Triggers a target MMF_Player, or every MMF_Player on a channel within a range. | Shaker: `MMFeedbacksShaker` on remote players |
| Feedbacks/MMF Reference Holder | `MMF_ReferenceHolder` | Stores a reference other feedbacks in the same list read to auto-resolve their target. Does nothing when played. | — |

---

## 17. Events (3)

| Menu path | Class | What it does |
|---|---|---|
| Events/Unity Events | `MMF_Events` | Binds UnityEvents to the feedback's Play, Stop, Initialization and Reset phases. The standard bridge from a feedback stack back into game code. |
| Events/Random Unity Events | `MMF_RandomEvents` | Picks one UnityEvent out of a weighted list and plays it — variation without a script. |
| Events/MMGameEvent | `MMF_MMGameEvent` | Fires a named `MMGameEvent` on the global event bus, for decoupled listeners. |

---

## 18. Scene (2)

| Menu path | Class | What it does |
|---|---|---|
| Scene/Load Scene | `MMF_LoadScene` | Requests a scene load with the chosen method (direct, additive, or via Feel's loading-screen managers). |
| Scene/Unload Scene | `MMF_UnloadScene` | Unloads a scene by name or build index. |

---

## 19. Haptics (6)

Nice Vibrations integration. On desktop these are no-ops, so they are safe to leave in
a shared feedback stack. See [feel-tools-full.md](feel-tools-full.md) for the underlying API.

| Menu path | Class | What it does |
|---|---|---|
| Haptics/Haptic Preset | `MMF_NVPreset` | Plays one of the built-in presets (Selection, Light/Medium/Heavy/Rigid/Soft Impact, Success, Failure, Warning). Simplest and most portable option. |
| Haptics/Haptic Emphasis | `MMF_NVEmphasis` | Plays a short transient burst with real-time amplitude and frequency control. |
| Haptics/Haptic Continuous | `MMF_NVContinuous` | Plays a continuous vibration of a given amplitude/frequency over a duration, with optional randomization and modulation curves. |
| Haptics/Haptic Clip | `MMF_NVClip` | Plays an authored `.haptic` clip asset, with randomizable level and frequency shift. |
| Haptics/Haptic Control | `MMF_NVControl` | Global control: stop all haptics, enable/disable them, set the global output level, init or release the haptic engine. |
| Haptics/Haptics DEPRECATED! | `MMF_Haptics` | Legacy shim kept only for upgrade compatibility. **Never use in new work** — replace with one of the five above. |

---

## 20. Debug (3)

| Menu path | Class | What it does |
|---|---|---|
| Debug/Log | `MMF_DebugLog` | Writes a message to the console as Log, Warning, Error or Assertion. |
| Debug/Comment | `MMF_DebugComment` | Does nothing by default — a note in the feedback list to document intent. Can optionally print itself. Use it to label the stages of a long stack. |
| Debug/Break | `MMF_DebugBreak` | Forces an editor break (pauses play mode) — a breakpoint you can place inside a feedback sequence. |

---

## 21. Non-feedback classes in the same namespace

These appear in `MMF_*` code but are **not** feedbacks — do not look for them in the
Add-feedback dropdown.

| Class | What it is |
|---|---|
| `MMF_Player` | The component that holds and plays the feedback list. |
| `MMF_Feedback` | Abstract base class for every feedback; inherit from it to author custom ones. |
| `MMF_PlayerEnabler` | Helper auto-added by MMF_Player in AutoPlayOnEnable mode so it can replay after being disabled. |
| `MMF_PlayerDebugInput` | Debug component: plays a MMF_Player at runtime on a configurable key press. |
| `MMF_PlayerConfiguration` | Editor-only settings asset controlling inspector behaviour and performance. |
| `MMF_BroadcastProxy` | Internal proxy used by the Broadcast feedback. |
| `MMF_UIToolkit*Base` | Abstract bases (`Bool`, `Color`, `Float`, `Vector2`) shared by the UI Toolkit feedbacks. |
| `MMF_MMSoundManagerSoundData` | Data holder used by the MMSoundManager Sound feedback. |
