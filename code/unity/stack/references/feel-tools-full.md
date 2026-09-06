# Feel — Full tool index (MMTools, shakers, springs, haptics)

> **Base path:** `Assets/Third-Party Assets/Feel/` (Feel v5.9.1)
> See also: [feel-quickref.md](feel-quickref.md) (short index — read this first), [feel-feedbacks-full.md](feel-feedbacks-full.md) (all 199 feedbacks), [feel-use-cases.md](feel-use-cases.md) (recipes)

Everything in Feel that is **not** a feedback: the receivers feedbacks talk to
(shakers, springs), the standalone systems (sound, UI, time, pooling, scene loading),
the utility layer, and the Nice Vibrations haptics API.

Feel's `MMTools` is a general-purpose Unity toolbox, not only a game-feel library.
A large part of it duplicates functionality this project already gets from other
packages — before adopting one, check whether the project already has an equivalent.

---

## 1. MMF_Player ecosystem

Components that surround the player itself.

| Component / class | What it does |
|---|---|
| `MMF_Player` | The component holding the ordered feedback list. Everything else in Feel is triggered from it. |
| `MMF_PlayerDebugInput` | Add next to an MMF_Player to play it at runtime on a configurable key — the fastest way to iterate on a stack without gameplay. |
| `MMF_PlayerEnabler` | Auto-added by the player in AutoPlayOnEnable mode so it replays after being disabled and re-enabled. |
| `MMFeedbacksAuthorizations` | Put on one empty object in the scene: exposes a checkbox per feedback type and globally disables the unchecked ones. Use it to kill an entire effect class (e.g. all haptics, all post-process) on a platform or for accessibility. |
| `MMChannel` (ScriptableObject) | Named channel asset. Prefer it over integer channels — feedbacks and shakers wired through a `MMChannel` asset are refactor-safe and self-documenting. |
| `MMChannelData` | Runtime struct describing a channel (mode + int + asset). Required argument of every shaker event trigger. |
| `MMF_Feedback` | Abstract base class of every feedback — inherit from it to author custom feedbacks. |
| `MMFeedbackTiming` | Serialized block holding per-feedback delay, cooldown, chance and repeat settings. |
| `MMFeedbackTargetAcquisition` | Serialized block driving automatic target resolution (self, parent, child, reference holder…). |

---

## 2. Shakers (56)

A shaker is a component placed **on the thing being affected**. The feedback broadcasts
an event; the shaker on the matching channel receives it and animates the property.
All inherit `MMShaker`, which contributes: `ShakeDuration`, `PlayOnAwake`,
`PermanentShake`, `Interruptible`, `CooldownBetweenShakes`, `TimescaleMode`,
`OnlyUseShakerValues`, and the `Play()` / `Stop()` / `StartShaking()` API.

Set `OnlyUseShakerValues = true` when the shaker, not the feedback, should own the
tuning — useful when many different feedbacks trigger the same visual.

### 2.1 Camera

| Shaker | Attach to | Driven by |
|---|---|---|
| `MMCameraShaker` | Camera | Camera Shake, Camera Zoom |
| `MMCameraShakerRotation` | Camera | Camera Shake (rotational variant) |
| `MMCameraFieldOfViewShaker` | Camera | Field of View |
| `MMCameraOrthographicSizeShaker` | Camera | Orthographic Size |
| `MMCameraClippingPlanesShaker` | Camera | Clipping Planes |
| `MMCinemachineCameraShaker` | Cinemachine virtual camera | Camera Shake |
| `MMCinemachineFieldOfViewShaker` | Cinemachine virtual camera | Field of View |
| `MMCinemachineOrthographicSizeShaker` | Cinemachine virtual camera | Orthographic Size |
| `MMCinemachineClippingPlanesShaker` | Cinemachine virtual camera | Clipping Planes |

### 2.2 Transform / renderer

| Shaker | Attach to | Driven by |
|---|---|---|
| `MMPositionShaker` | Any transform | Position Shake |
| `MMRotationShaker` | Any transform | Rotation Shake |
| `MMScaleShaker` | Any transform | Scale Shake |
| `MMLookAtShaker` | Any transform | LookAt |
| `MMSpriteRendererShaker` | SpriteRenderer | SpriteRenderer |
| `MMLightShaker` | Light | Light |
| `MMLight2DShaker_URP` | URP 2D Light | Light2D_URP |

### 2.3 Audio

| Shaker | Attach to |
|---|---|
| `MMAudioSourceVolumeShaker` | AudioSource |
| `MMAudioSourcePitchShaker` | AudioSource |
| `MMAudioSourceStereoPanShaker` | AudioSource |
| `MMAudioFilterDistortionShaker` | AudioDistortionFilter |
| `MMAudioFilterEchoShaker` | AudioEchoFilter |
| `MMAudioFilterHighPassShaker` | AudioHighPassFilter |
| `MMAudioFilterLowPassShaker` | AudioLowPassFilter |
| `MMAudioFilterReverbShaker` | AudioReverbFilter |

### 2.4 Post-processing — three pipeline families

Place on the Volume (URP/HDRP) or the PostProcessVolume (v2) that owns the override.

| Effect | PPv2 | URP | HDRP |
|---|---|---|---|
| Bloom | `MMBloomShaker` | `MMBloomShaker_URP` | `MMBloomShaker_HDRP` |
| Chromatic Aberration | `MMChromaticAberrationShaker` | `MMChromaticAberrationShaker_URP` | `MMChromaticAberrationShaker_HDRP` |
| Lens Distortion | `MMLensDistortionShaker` | `MMLensDistortionShaker_URP` | `MMLensDistortionShaker_HDRP` |
| Vignette | `MMVignetteShaker` | `MMVignetteShaker_URP` | `MMVignetteShaker_HDRP` |
| Depth of Field | `MMDepthOfFieldShaker` | `MMDepthOfFieldShaker_URP` | `MMDepthOfFieldShaker_HDRP` |
| Colour | `MMColorGradingShaker` | `MMColorAdjustmentsShaker_URP` | `MMColorAdjustmentsShaker_HDRP` |
| Channel Mixer | — | `MMChannelMixerShaker_URP` | `MMChannelMixerShaker_HDRP` |
| Film Grain | — | `MMFilmGrainShaker_URP` | `MMFilmGrainShaker_HDRP` |
| Motion Blur | — | `MMMotionBlurShaker_URP` | `MMMotionBlurShaker_HDRP` |
| Panini Projection | — | `MMPaniniProjectionShaker_URP` | `MMPaniniProjectionShaker_HDRP` |
| White Balance | — | `MMWhiteBalanceShaker_URP` | `MMWhiteBalanceShaker_HDRP` |
| Exposure | — | — | `MMExposureShaker_HDRP` |
| Volume weight blend | — | `MMVolumeBlendShaker_URP` | — |

### 2.5 Other

| Shaker | What it receives |
|---|---|
| `MMFeedbacksShaker` | Lets a remote MMF_Player be triggered by the `Feedbacks/Feedbacks Player` feedback on a channel. |

### 2.6 Post-processing helper components (not shakers)

| Component | What it does |
|---|---|
| `MMFlash` | Put on a full-screen UI Image; catches `MMFlashEvent` and flashes the screen. Required by the Flash feedback. |
| `MMPostProcessingMovingFilter` | Moves a post-process filter volume through the world; driven by the PPMovingFilter feedback. |
| `MMAutoFocus` / `MMAutoFocus_URP` | Automatically keeps depth of field focused on a set of targets. |
| `MMCameraZoom` | Standalone camera zoom driver used by the Camera Zoom feedback path. |
| `MMCinemachineZoom`, `MMCinemachineFreeLookZoom` | Cinemachine-specific zoom drivers. |
| `MMCinemachinePriorityListener`, `MMCinemachinePriorityBrainListener` | Catch priority-change events to blend between virtual cameras. |

---

## 3. Springs

Feel's spring system is a **separate animation model** from curve-based feedbacks: no
fixed duration, physically damped, interruptible and re-targetable mid-flight. Prefer
springs whenever the effect can be re-triggered before it finishes (UI, pickups, hits).

### 3.1 Core

| Class | What it is |
|---|---|
| `MMSpringFloat`, `MMSpringVector2/3/4`, `MMSpringColor` | The spring *definitions* — damping, frequency, clamp settings and the solver. |
| `MMSpringComponentBase` | Abstract base of every spring component. Exposes `Stop()`, `Finish()`, `RestoreInitialValue()`, `ResetInitialValue()`, `SetVelocityLowThreshold()` and the `OnEquilibriumReached` UnityEvent. |
| `MMSpringFloatComponent` etc. | Typed bases adding the driving API: `MoveTo`, `MoveToAdditive`, `MoveToSubtractive`, `MoveToInstant`, `MoveToRandom`, `Bump`, `BumpRandom`. |
| `MMSpringClampSettings` | Min/max clamping so a spring cannot overshoot past a limit. |
| `MMSpringDebug` | Inspector debug readout of a spring's state. |

### 3.2 Ready-made spring components (attach to the target)

| Group | Components |
|---|---|
| Transform | `MMSpringPosition`, `MMSpringRotation`, `MMSpringRotationAround`, `MMSpringScale`, `MMSpringSquashAndStretch` |
| UI | `MMSpringRectTransformPosition`, `MMSpringRectTransformSizeDelta`, `MMSpringImageAlpha`, `MMSpringImageColor`, `MMSpringImageFillAmount` |
| TextMeshPro | `MMSpringTMPAlpha`, `MMSpringTMPTextColor`, `MMSpringTMPFontSize`, `MMSpringTMPCharacterSpacing`, `MMSpringTMPWordSpacing`, `MMSpringTMPLineSpacing`, `MMSpringTMPDilate`, `MMSpringTMPSoftness` |
| Rendering | `MMSpringSpriteColor`, `MMSpringTextureOffset`, `MMSpringTextureScale`, `MMSpringShaderController` |
| Lights | `MMSpringLightIntensity`, `MMSpringLightColor`, `MMSpringLightRange` |
| Camera | `MMSpringCameraFieldOfView`, `MMSpringCameraOrthographicSize` |
| Audio | `MMSpringAudioSourceVolume`, `MMSpringAudioSourcePitch` |
| Misc | `MMSpringAnimatorSpeed`, `MMSpringMMTimeScale` |

---

## 4. Audio system

| Component / class | What it does |
|---|---|
| `MMSoundManager` | Persistent singleton, pooled audio source manager. Tracks: `Master`, `Music`, `Sfx`, `UI`, `Other`. API: `PlaySound(clip, options)`, `PauseSound`, `ResumeSound`, `StopSound`, `FreeSound`, per-track `MuteTrack` / `SetTrackVolume` / `PauseTrack` / `StopTrack` / `FreeTrack`, `FadeTrack`, `FadeSound`, `MuteAllSounds`, `StopAllSounds`. Saves/loads settings through `MMSoundManagerSettingsSO`. |
| `MMSoundManagerPlayOptions` | Struct describing one playback: track, volume, pitch, loop, fade, 3D settings, `ID` used later for control. |
| `MMSoundManagerSettingsSO` | ScriptableObject persisting per-track volumes and mute flags. |
| `MMSoundManagerTrackVolumeSlider` | Drop on a UI Slider to bind it to a track volume. |
| `MMSoundManagerAudioPool` | Internal AudioSource pool. |
| `MMPlaylist` + `MMPlaylistRemote` | Sequenced background-music player with per-song volume/pitch ranges and crossfade; the remote drives it from elsewhere. |
| `MMSMPlaylist` / `MMSMPlaylistManager` | ScriptableObject-based playlist variant routed through the MMSoundManager. |
| `MMAudioAnalyzer` | Samples an AudioSource (or the whole scene, or the mic), extracts spectrum bands and beats, and fires `MMBeatEvent`. The entry point for music-reactive visuals. |
| `MMAudioListener` | Add to every AudioListener to suppress Unity's duplicate-listener warning during scene transitions. |
| `AudioToHapticConverter` | Editor helper converting an AudioClip into a `.haptic` clip. |

**Sound events** (`MMSoundManagerEvent`, `MMSoundManagerSoundPlayEvent`,
`MMSoundManagerSoundControlEvent`, `MMSoundManagerSoundFadeEvent`,
`MMSoundManagerTrackEvent`, `MMSoundManagerTrackFadeEvent`,
`MMSoundManagerAllSoundsControlEvent`) let any script drive the manager without a
reference, which is exactly what the Audio feedbacks do internally.

---

## 5. UI and HUD

| Component | What it does |
|---|---|
| `MMProgressBar` | The most reusable UI tool in Feel. Fill modes: `LocalScale`, `FillAmount`, `Width`, `Height`, `Anchor`. Supports a delayed "ghost" bar for both increase and decrease, lerp speed or fixed duration, bump-on-change with colour flash, and text output. API: `UpdateBar(current, min, max)`, `UpdateBar01(normalized)`, `SetBar(...)`, `SetBar01(...)`. |
| `MMHealthBar` | Auto-generated or prefab-based world-space health bar that follows an object. Built on MMProgressBar. |
| `MMRadialProgressBar` | Legacy radial bar; prefer MMProgressBar in `FillAmount` mode. |
| `MMFader`, `MMFaderRound`, `MMFaderDirectional` | Full-screen fade images that catch `MMFadeEvent` / `MMFadeInEvent` / `MMFadeOutEvent`. Required by the Fade feedback. |
| `MMCountdown` | Countdown timer with per-threshold ("floor") events. |
| `MMParallaxUI` | Binds UI layers to mouse position or device gyroscope for a parallax card/menu effect. |
| `MMUIFollowMouse` | Makes a UI element follow the cursor. |
| `MMTwoSidedUI` | Flips between two aligned UI faces on an axis — card flip. |
| `MMSliderStep` | Fires events when a slider crosses configured steps. |
| `MMRaycastTarget` | Invisible `Graphic` acting as a raycast target without an Image (no draw call). |
| `MMGetFocusOnEnable` | Sets EventSystem focus to the object when enabled — gamepad menu navigation. |
| `MMCursorVisible` | Forces the hardware cursor visible or hidden. |
| `MMSceneName` | Writes the current scene name into a Text component. |
| `MMFloatingText` + `MMFloatingTextSpawner` | Pooled floating-damage-number system. The spawner owns the pool, lifetime, movement curves and colour gradients; the `UI/Floating Text` feedback drives it. |

---

## 6. Time

| Component / class | What it does |
|---|---|
| `MMTimeManager` | Singleton catching `MMTimeScaleEvent` and `MMFreezeFrameEvent`. **Required** by the Freeze Frame and Timescale Modifier feedbacks. Supports stacking, lerped in/out timescale changes and unscaled-time islands. |
| `MMFreezeFrameEvent` | `MMFreezeFrameEvent.Trigger(0.05f)` — one-line hit-stop from any script. |
| `MMTimeScaleEvent` | Set a timescale for a duration, with optional interpolation — slow-motion. |
| `MMCooldown` | Serializable cooldown/resource block (consumption, refill, pause phases) you can embed in gameplay classes. |
| `MMTime` | Static time helpers (formatting, conversion). |

---

## 7. Property control and signal routing (MMRadio)

The MMRadio system connects "something that produces a 0–1 value" to "any property on
any object", entirely in the inspector — a data-flow layer parallel to feedbacks.

| Component | What it does |
|---|---|
| `MMRadioSignal` | Base signal emitter. |
| `MMRadioSignalGenerator` | Produces a normalized signal from combined waveforms (sine, square, noise, curve…). |
| `MMRadioSignalAudioAnalyzer` | Exposes a beat/band level from a `MMAudioAnalyzer` as a signal. |
| `MMRadioBroadcaster` | Reads a signal (or any property) and broadcasts its level, directly or via `MMRadioLevelEvent`. |
| `MMRadioReceiver` | Receives a level and writes it into almost any property on any object. |
| `MMEmmiterReceiver` | Single-component shortcut: drive property B from property A without a broadcaster. |
| `MMPropertyPicker` / `MMPropertyEmitter` / `MMPropertyReceiver` | The reflection layer that lets the inspector target any field or property; `MMPropertyLink*` implements the per-type setters. |
| `FloatController` | Animates a float on any component over time (curve, random, driven, one-shot). Targeted by the FloatController feedback. |
| `ShaderController` | Same idea for a named shader property. Targeted by the ShaderController feedback. |
| `LightController` | Animates a Light's intensity. |
| `TransformController` | Animates position / rotation / scale properties directly. |

---

## 8. Pooling and spawning

| Component | What it does |
|---|---|
| `MMObjectPooler` | Abstract base of the pooling system. |
| `MMSimpleObjectPooler` | Pool of a single prefab. |
| `MMMultipleObjectPooler` | Pool of several prefabs with per-type counts and pooling methods (random, sequential, weighted). |
| `MMPoolableObject` | Required on pooled prefabs; adds lifetime and `Destroy()` semantics that return the object to the pool. |
| `MMMiniObjectPooler` / `MMMiniObjectPool` / `MMMiniPoolableObject` | Lightweight pooler used internally by the Instantiate Object and Particles Instantiation feedbacks. |
| `MMRandomInstantiator` | Spawns one prefab picked at random from a list. |
| `MMRandomBoundsInstantiator` | Spawns objects at random points inside a 3D collider's bounds. |
| `MMSpawnAround` (static) + `MMSpawnAroundProperties` | Randomizes position, rotation and scale around a point when instantiating — loot bursts, debris. |
| `MMAutoDestroyParticleSystem` | Destroys a ParticleSystem once it stops emitting. |
| `MMTimedDestruction` / `MMTimedActivation` | Destroy or activate an object N seconds after Start. |

---

## 9. Movement and transform helpers

| Component | What it does |
|---|---|
| `MMFollowTarget` | Follows a target with configurable interpolation, offsets and axis locks. |
| `MMAutoRotate` | Continuous self-rotation. |
| `MMSquashAndStretch` | Automatically squashes and stretches a model based on its velocity — put it one level below the root. |
| `MMWiggle` | Continuous or triggered position / rotation / scale wiggle. Target of the Wiggle feedback. |
| `MMBlink` | Multi-phase blink (on/off durations, offsets, repeat counts) on renderers, lights or materials. Target of the MMBlink feedback. |
| `MMPath` + `MMPathMovement` | Author a waypoint path in the scene and move an object along it. |
| `MMFaceDirection` | Rotates a transform to face its movement direction or a fixed one. |
| `MMBillboard` | Keeps a sprite facing the camera. |
| `MMPositionRecorder` | Periodically records a transform's position into an array — trails, rewind, ghosts. |
| `MMPreventPassingThrough2D` / `3D` | Back-raycasts after each move so fast objects do not tunnel through colliders. |
| `MMStayInPlace` | Locks a transform's position/rotation/scale against parent movement. |
| `MMViewportEdgeTeleporter` | Wraps an object to the opposite screen edge. |
| `MMTransformRandomizer` | Randomizes position/rotation/scale on demand or on start. |
| `MMParentingOnStart` | Reparents on start (or unparents to root). |

---

## 10. Camera helpers

| Component | What it does |
|---|---|
| `MMCameraAspectRatio` | Forces an aspect ratio on a camera. |
| `MMAspectRatioSafeZones` | Displays safe zones for the ratios configured in the inspector. |
| `MMOrbitalCamera` | Orbits a camera around a target. |
| `MMGhostCamera` | Free-fly debug camera driven by the axes and up/down keys. |
| `MMCameraFog` | Overrides scene fog settings while the camera is active. |
| `MMCinemachineZone2D` / `MMCinemachineZone3D` | Trigger volumes that enable a virtual camera on entry and handle the blend. |
| `MMGyroParallax` / `MMGyroscope` | Moves bound virtual cameras with the device gyroscope. |

---

## 11. Scene flow and persistence

| Component / class | What it does |
|---|---|
| `MMSceneLoadingManager` | Classic loading-screen scene loader. |
| `MMAdditiveSceneLoadingManager` | Newer additive loader with a fully customizable load sequence, progress interpolation intervals and anti-spill handling. |
| `MMAdditiveSceneLoadingManagerSettings` | Serializable settings block for the above. |
| `MMLoadScene` | Simple component exposing `LoadScene()` for UnityEvents. |
| `MMSceneLoadingImageProgress` / `MMSceneLoadingTextProgress` | Bind an Image fill or a Text to loading progress. |
| `MMSceneRestarter` | Restarts the active scene on a key press. |
| `MMSaveLoadManager` (static) | Save/load objects to disk. Methods: binary, encrypted binary, JSON, encrypted JSON. |
| `MMPersistenceManager` + `MMPersistent` / `MMPersistentBase` | GUID-based per-scene object state persistence (transform and custom data). |
| `MMDontDestroyOnLoad` | Marks an object persistent across scenes. |

---

## 12. Events and architecture

| Class | What it does |
|---|---|
| `MMEventManager` + `MMGameEvent` | Global typed event bus. `MMGameEvent.Trigger("LevelComplete")` plus `MMEventListener<T>` on the receiving side. Targeted by the MMGameEvent feedback. |
| `MMGameEventListener` | Component firing UnityEvents when a named `MMGameEvent` is raised — no code needed. |
| `MMStateMachine<T>` | Minimal enum-driven state machine with a `MMStateChangeEvent`. |
| `MMSingleton<T>`, `MMPersistentSingleton<T>`, `MMPersistentHumbleSingleton<T>` | Singleton bases used by Feel's own managers. |
| `MMObservable<T>` | Small observable value wrapper with change notification. |
| `MMReferencedScriptableObject<T>` | Auto-referenced ScriptableObject instances by type. |

---

## 13. Gameplay systems

| Class | What it does |
|---|---|
| `MMAchievementManager` + `MMAchievementList` + `MMAchievementRules` + `MMAchievementDisplayer` | Complete achievement system: simple and progress-based achievements, save/load, on-screen unlock display. |
| `MMLootTable<T>` / `MMLootTableGameObject` / `Float` / `String` / `MMLootTableGameObjectSO` | Weighted random loot tables with a ScriptableObject variant. |
| `MMShufflebag<T>` | Controlled randomness: draws without replacement until the bag is empty — avoids clumping in a way plain `Random` cannot. |
| `AIBrain` + `AIState` + `AIAction` + `AIDecision` + `AITransition` | Component-based finite-state AI framework. |
| `MMConeOfVision` / `MMConeOfVision2D` | Angle-and-distance vision cone with target detection and mesh visualisation. |
| `MMRagdoller` (+ `MMRagdollerIgnore`) | Switches an animated character to ragdoll and back. |
| `MMAnimationModifier` (StateMachineBehaviour) | Controls an animation's start position and speed from the Animator. |
| `MMAnimatorMirror` | Mirrors one Animator's parameters onto another. |
| `MMOffsetAnimation` | Offsets an animation by a random amount so crowds do not sync. |
| `MMStopMotionAnimation` | Forces a stepped, low-frame-rate look on an Animator. |

---

## 14. Procedural generation

| Class | What it does |
|---|---|
| `MMGridGenerator` family | Grid generators: `Full`, `Random`, `Path`, `PerlinNoise`, `PerlinNoiseGround`, `RandomWalk`, `RandomWalkGround`, `RandomWalkAvoider`. |
| `MMTilemapGenerator` + `MMTilemapGeneratorLayer` | Fills a Tilemap by combining generator layers. |
| `MMTilemap`, `MMTilemapCleaner`, `MMTilemapShadow`, `MMTilemapGridRenderer` | Tilemap helpers: bulk operations, one-click clear, shadow/copy tilemaps. |

---

## 15. Sequencing

| Class | What it does |
|---|---|
| `MMSequence` (ScriptableObject) | Stores recorded or authored note sequences (timestamp + track ID). |
| `MMSequencer` | Quantized step-sequencer interface for designing and playing a `MMSequence`. |
| `MMSoundSequencer` / `MMAudioSourceSequencer` | Sequencers with slots wired to sounds or AudioSources. |
| `MMFeedbacksSequencer` | Sequencer whose slots trigger MMF_Players — rhythm-driven game feel. |
| `MMInputSequenceRecorder` | Records a sequence from live input presses. |

---

## 16. Debug, performance, editor quality-of-life

| Class | What it does |
|---|---|
| `MMDebugMenu` (+ `MMDebugMenuData`, item and tab components, event listeners) | Mobile-friendly in-game debug menu: buttons, checkboxes, sliders, choices, values, a log tab and a command line (`[MMDebugLogCommand]` on any static method registers it). |
| `MMDebugOnScreenConsole` / `MMConsole` | On-screen console output. |
| `MMDebugController` | Central switch to enable/disable logs and debug draws. |
| `MMDebug` (static) | Debug helpers: `DebugLogTime`, `DebugDrawCross`, `DebugDrawArrow`, ray casting with visualisation. |
| `MMFPSCounter` | Writes real-time FPS into a Text component. |
| `MMFPSUnlock` | Sets `targetFrameRate` and `vSyncCount`. |
| `MMSpeedTest` (static) | `StartTest()` / `EndTest()` timing block for quick profiling. |
| `MMGizmo` | Inspector-configured gizmos for position or collider, with optional text. |
| `MMSceneViewIcon` | Shows an object's name in the scene view. |
| `MMSelectionBase` | Makes an object always win scene-view selection over its children. |
| `MMScreenshot` | Takes editor screenshots at configurable resolutions. |
| `MMAnimationCurveGenerator` | Generates and saves a `.curves` asset of standard easing curves. |
| `MMPlotter` / `MMPlotterGenerator` | Plots curves and signals in the scene for visual tuning. |
| Menu: `Tools > More Mountains > MMFeedbacks > Output MMF_Feedbacks list` | Dumps the full list of available feedbacks in the current project — the authoritative answer to "which feedbacks compiled with my current packages and defines". |
| Menu: `Tools > More Mountains > Enable/Disable Help in Inspectors` | Toggles the help boxes in every MM inspector. |

---

## 17. Input helpers

Legacy-oriented; a project on the Input System package normally does not need these.

| Component | What it does |
|---|---|
| `MMTouchButton` | Turns a UI Image into a button with down / pressed / up events. |
| `MMTouchJoystick`, `MMTouchFollowerJoystick`, `MMTouchRepositionableJoystick` | On-screen joysticks. |
| `MMTouchAxis` | UI Image acting as a single axis. |
| `MMTouchControls` | Container binding a control set. |
| `MMSwipeZone` | Detects swipes and fires `MMSwipeEvent`. |
| `MMOnMouse` | Collider-level mouse click / drag / enter / exit events. |
| `MMOnPointer` | UI pointer events routed to methods. |
| `MMInputExecution` | Binds keycodes to UnityEvents. |
| `MMAutoInputModule` | Adds the correct EventSystem input module for the active input backend. |
| `MMDebugTouchDisplay` | Visualises touch positions on screen. |

---

## 18. Activation and lifecycle helpers

| Component | What it does |
|---|---|
| `MMActivationOnStart` | Enables/disables a list of objects on Awake or Start. |
| `MMAutoExecution` | Fires UnityEvents on Awake, Enable, Disable, Start or instantiation. |
| `MMConditionalActivation` | Enables target components only once other targets are ready. |
| `MMPeriodicExecution` | Fires an event at random intervals. |
| `MMPlatformActivation` / `MMApplicationPlatformActivation` | Enables/disables an object based on platform. |
| `MMToggleActive` | Exposes a `Toggle()` method for UnityEvents. |
| `MMTriggerAndCollision`, `MMTriggerFilter`, `MMTriggerAndCollisionFilter` | Filtered trigger/collision event forwarding. |
| `MMApplicationQuit`, `MMOpenURL` | One-method helpers for buttons. |

---

## 19. Utility statics and extensions

| Class | What it provides |
|---|---|
| `MMMaths` | Remapping, rounding, weighted random, vector maths, spring helpers. |
| `MMTween` / `MMTweenType` / `MMTweenDefinitions` | Feel's own easing library (Penner-style curves). `MMTweenType` is the serialized field type used across feedbacks — accepts either a curve or a named ease. |
| `MMSignal` | Generates standard signal shapes (sine, square, triangle, noise…) as values or curves. |
| `MMAnimationCurves` | Prebuilt AnimationCurve constants. |
| `MMCircularList<T>` | List that wraps around at both ends. |
| `MMSerializableDictionary<K,V>` | Inspector-serializable dictionary. |
| `MMShufflebag<T>` | See §13. |
| `MMHelpers`, `MMScene`, `MMLayers`, `MMString`, `MMImage`, `MMColors`, `MMGeometry`, `MMGUI`, `MMCoroutine`, `MMFade`, `MMMovement`, `MMArray` | Assorted static helpers. |
| Extension classes | `MMAnimatorExtensions`, `MMCameraExtensions`, `MMColorExtensions`, `MMFloatExtensions`, `MMGameObjectExtensions`, `MMRectTransformExtensions`, `MMVector2/3/4Extensions`, `TransformExtensions`, `ListExtensions`, `LayermaskExtensions`, `RendererExtensions`, `ScrollRectExtensions`, `MMBoundsExtensions`, `MMDictionaryExtensions`, `RectExtensions`. |
| Inspector attributes | `MMInspectorGroup`, `MMInspectorButton`, `MMInspectorButtonBar`, `MMCondition`, `MMEnumCondition`, `MMReadOnly`, `MMReadOnlyWhenPlaying`, `MMInformation`, `MMVector`, `MMLayer`, `MMDropdown`, `MMColor`, `MMBackgroundColor`, `MMHidden`, `MMExecutionOrder`. Useful in the project's own scripts once Feel is referenced. |

---

## 20. VFX and art helpers

| Component | What it does |
|---|---|
| `MMPanningTexture` | Pans a sprite or mesh texture at a set speed. |
| `MMBezierLineRenderer` | Adds bezier control points to a LineRenderer. |
| `MMLineRendererDriver` | Binds a LineRenderer's points to a list of transforms. |
| `MMLineRendererCircle` | Draws a circle with a LineRenderer. |
| `MMRendererSortingLayer`, `MMTrailRendererSortingLayer`, `MMVisibleParticle`, `MMAutoOrderInLayer` | Sorting-layer control for renderers and particles. |
| `MMRuntimeParticleControl` | Runtime play/pause/stop controls on a particle system. |
| `MMDelayParticles` | Delays particle emission. |
| Prototype textures & VFX assets | `MMPrototypeTextures`, `MMBloomDirt`, `MMBrushes`, `MMNoise`, `MMPalette`, `MMRamps`, `MMRipple` — greybox materials and VFX source textures. |

---

## 21. Nice Vibrations (haptics)

Shipped inside Feel as a full copy of the Nice Vibrations asset. On platforms without
haptics every call is a safe no-op, so haptic feedbacks can stay in shared stacks.

| Class | What it does |
|---|---|
| `HapticController` (static) | The main API. Properties: `hapticsEnabled`, `outputLevel`, `clipLevel`, `clipFrequencyShift`, `fallbackPreset`. Methods: `Init()`, `Load(HapticClip)`, `Play()`, `Play(clip)`, `Stop()`, `Seek(time)`, `Loop(bool)`, `IsPlaying()`, `Reset()`, `ProcessApplicationFocus(bool)`. Events: `LoadedClipChanged`, `PlaybackStarted`, `PlaybackStopped`. |
| `HapticPatterns` (static) | Preset patterns: `Selection`, `LightImpact`, `MediumImpact`, `HeavyImpact`, `RigidImpact`, `SoftImpact`, `Success`, `Failure`, `Warning`. Also `PlayEmphasis(amplitude, frequency)` and `PlayConstant(amplitude, frequency, duration)`. |
| `HapticSource` (MonoBehaviour) | Per-object playback of one `HapticClip`, with `priority`, `loop`, `level`, `frequencyShift`, `fallbackPreset` and `Play()` / `Stop()` / `Seek()`. The AudioSource analogue for haptics. |
| `HapticReceiver` (MonoBehaviour) | Scene-level component forwarding global `HapticController` settings and handling application focus/pause events. Put one in the scene when using haptics. |
| `HapticClip` (ScriptableObject) | An imported `.haptic` asset. |
| `DeviceCapabilities` (static) | Reports what the current device supports — query it before offering a haptics setting in the options menu. |
| `GamepadRumbler` (static) | Plays a `GamepadRumble` pattern on a connected controller. |
| `LofeltHaptics` | Low-level native SDK wrapper — not called directly in normal use. |

---

## 22. Demo scenes

Demo scenes are the best reference for how a full stack is assembled. Built-in
render pipeline versions live in `FeelDemos/`; **URP versions are shipped as
`FeelDemosURP/FeelDemosURP.unitypackage`** and must be imported (double-click inside
Unity) — importing overwrites the same scenes and materials with URP-compatible ones,
it does not create a separate folder. HDRP works the same way via `FeelDemosHDRP/`.

| Scene | What it demonstrates |
|---|---|
| `MMFeedbacksDemo/MMF_PlayerDemo` | Every feedback in the library, one isolated demo per feedback. The reference scene. |
| `FeelDemos/GettingStartedTutorial` | Minimal first stack — the tutorial. |
| `FeelDemos/Barbarians` | Character combat: hits, deaths, floating text, impulses, haptics. |
| `FeelDemos/Tactical` | Top-down shooter: muzzle flash, impact particles, recoil springs, reload audio. |
| `FeelDemos/Toaster` | Physical machine juice: springs, shakes, freeze frames, camera zoom. |
| `FeelDemos/CardsUI` | Card-game UI: tap, flip, highlight, stat bumps, text reveal. |
| `FeelDemos/Springs` | The spring system in isolation, side by side with curve feedbacks. |
| `FeelDemos/MMProgressBar` | Progress bar bumps, delayed bars, spring-driven bars. |
| `FeelDemos/Bounce`, `Blob`, `Duck`, `Snake`, `Letters`, `Brass`, `Wheel` | Small vertical-slice games, each focused on one juice style. |
| `FeelDemos/Snake` + `FeelSnakeWithoutFeedbacks` | Before/after pair — the clearest demonstration of what feedbacks add. |
| `FeelDemos/MMSequencer` | Rhythm-driven feedbacks via the sequencer. |
| `FeelDemos/MMSoundManager*` | Track control, fades and playlist management. |
| `FeelDemos/UIToolkitFeedbacksDemo` | Every UI Toolkit feedback. |
| `FeelDemos/SquashAndStretch`, `ParallaxUI` | Focused single-tool demos. |
| `MMTools/Demos/*` | Tool demos: MMRadio, MMTween plotter, debug menu, gizmos, follow target, ghost camera, scene loading, observable. |
| `NiceVibrations/Demo/NiceVibrationsDemo` | Full haptics playground. |
