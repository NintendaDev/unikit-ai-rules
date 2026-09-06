# Sonity — SoundParameter catalog

> **Base path:** `Assets/Plugins/Sonity/Scripts/Internal/SoundParameter.cs` (namespace `Sonity`)
> See also: [sonity-functions.md](sonity-functions.md)

Every class below derives from `SoundParameterInternals` and is passed to any
`Play` / `UIPlay` / `MusicPlay` overload that ends in `params SoundParameterInternals[]`.
Verified against Sonity 1.2.0.

---

## All SoundParameter types

`UpdateMode` column: **Once/Continuous** means the constructor takes an
`UpdateMode updateMode = UpdateMode.Once` argument and the parameter can be re-read
every frame while the voice plays. **Once only** means the constructor has no
`UpdateMode` argument — the value is read when the voice starts and never again.

| Class | Constructor | Default | Range / meaning | UpdateMode |
|-------|-------------|---------|-----------------|------------|
| `SoundParameterVolumeDecibel` | `(float volumeDecibel, UpdateMode)` | `0f` | `-Infinity`..`0` dB offset | Once/Continuous |
| `SoundParameterVolumeRatio` | `(float volumeRatio, UpdateMode)` | `1f` | `0`..`1` linear multiplier | Once/Continuous |
| `SoundParameterPitchSemitone` | `(float pitchSemitone, UpdateMode)` | `0f` | semitone offset | Once/Continuous |
| `SoundParameterPitchRatio` | `(float pitchRatio, UpdateMode)` | `1f` | `0`..`Infinity` playback-rate multiplier | Once/Continuous |
| `SoundParameterDelay` | `(float delay)` | `0f` | `0`..`Infinity` seconds added before start | Once only |
| `SoundParameterIncrease2D` | `(float increase2D, UpdateMode)` | `0f` | `0`..`1` — blends the voice towards 2D without disabling distance | Once/Continuous |
| `SoundParameterIntensity` | `(float intensity, UpdateMode)` | `1f` | drives the SoundContainer's intensity curves (volume / pitch / filter / crossfade) | Once/Continuous |
| `SoundParameterReverbZoneMixDecibel` | `(float reverbZoneMixDecibel, UpdateMode)` | `0f` | `-Infinity`..`0` dB | Once/Continuous |
| `SoundParameterReverbZoneMixRatio` | `(float reverbZoneMixRatio, UpdateMode)` | `1f` | `0`..`1` | Once/Continuous |
| `SoundParameterStartPosition` | `(float startPosition)` | `0f` | `0`..`1` (0 = clip start, 1 = clip end) | Once only |
| `SoundParameterReverse` | `(bool reverse, UpdateMode)` | `false` | play backwards; needs an uncompressed or decompress-on-load AudioClip, and a start position at the end | Once/Continuous |
| `SoundParameterStereoPan` | `(float stereoPanOffset, UpdateMode)` | `0f` | `-1` (left) .. `1` (right); 2D only | Once/Continuous |
| `SoundParameterPolyphony` | `(int polyphony)` | `1` | `1`..`int.MaxValue`; overrides the SoundEvent's base polyphony | Once only |
| `SoundParameterDistanceScale` | `(float distanceScale)` | `1f` | `0`..`Infinity`; multiplies the SoundManager distance scale | Once only |
| `SoundParameterDistortionIncrease` | `(float distortionIncrease, UpdateMode)` | `0f` | `0`..`1`; no effect unless distortion is enabled on the SoundContainer | Once/Continuous |
| `SoundParameterFadeInLength` | `(float fadeInLength, UpdateMode)` | `0f` | `0`..`Infinity` seconds | Once/Continuous |
| `SoundParameterFadeInShape` | `(float fadeInShape, UpdateMode)` | `2f` | `-16`..`16` (negative exponential, 0 linear, positive logarithmic) | Once/Continuous |
| `SoundParameterFadeOutLength` | `(float fadeOutLength, UpdateMode)` | `0f` | `0`..`Infinity` seconds | Once/Continuous |
| `SoundParameterFadeOutShape` | `(float fadeOutShape, UpdateMode)` | `-2f` | `-16`..`16` | Once/Continuous |
| `SoundParameterFollowPosition` | `(bool followPosition, UpdateMode)` | `true` | voice tracks the owner/position Transform each frame | Once/Continuous |
| `SoundParameterForce2D` | `(bool force2D)` | `true` | disables distance and spatialization entirely; makes the voice eligible for PlayOneShot optimization | Once only |
| `SoundParameterBypassReverbZones` | `(bool bypassReverbZones, UpdateMode)` | `false` | skip Unity reverb zones | Once/Continuous |
| `SoundParameterBypassVoiceEffects` | `(bool bypassVoiceEffects, UpdateMode)` | `false` | skip lowpass / highpass / distortion for this voice | Once/Continuous |
| `SoundParameterBypassListenerEffects` | `(bool bypassListenerEffects, UpdateMode)` | `false` | skip listener effects | Once/Continuous |

## Settable property per type

Each class exposes exactly one public property, named after its constructor argument
with the first letter capitalised. Mutate it on a cached instance instead of
allocating a new parameter.

| Class | Property |
|-------|----------|
| `SoundParameterVolumeDecibel` | `VolumeDecibel` |
| `SoundParameterVolumeRatio` | `VolumeRatio` |
| `SoundParameterPitchSemitone` | `PitchSemitone` |
| `SoundParameterPitchRatio` | `PitchRatio` |
| `SoundParameterDelay` | `Delay` |
| `SoundParameterIncrease2D` | `Increase2D` |
| `SoundParameterIntensity` | `Intensity` |
| `SoundParameterReverbZoneMixDecibel` | `ReverbZoneMixDecibel` |
| `SoundParameterReverbZoneMixRatio` | `ReverbZoneMixRatio` |
| `SoundParameterStartPosition` | `StartPosition` |
| `SoundParameterReverse` | `Reverse` |
| `SoundParameterStereoPan` | `StereoPanOffset` |
| `SoundParameterPolyphony` | `Polyphony` |
| `SoundParameterDistanceScale` | `DistanceScale` |
| `SoundParameterDistortionIncrease` | `DistortionIncrease` |
| `SoundParameterFadeInLength` | `FadeInLength` |
| `SoundParameterFadeInShape` | `FadeInShape` |
| `SoundParameterFadeOutLength` | `FadeOutLength` |
| `SoundParameterFadeOutShape` | `FadeOutShape` |
| `SoundParameterFollowPosition` | `FollowPosition` |
| `SoundParameterForce2D` | `Force2D` |
| `SoundParameterBypassReverbZones` | `BypassReverbZones` |
| `SoundParameterBypassVoiceEffects` | `BypassVoiceEffects` |
| `SoundParameterBypassListenerEffects` | `BypassListenerEffects` |

## Picking a parameter

| Goal | Parameter |
|------|-----------|
| Randomise loudness per shot | `SoundParameterVolumeDecibel` (Once) |
| Randomise pitch per shot | `SoundParameterPitchSemitone` (Once) |
| Drive a sound from a gameplay magnitude (impact speed, engine RPM, charge level) | `SoundParameterIntensity` |
| Make a 3D sound read as "the player's own" | `SoundParameterIncrease2D` or `SoundParameterForce2D` |
| Stagger a burst of identical one-shots | `SoundParameterDelay` |
| Let more copies of one SoundEvent overlap at one owner | `SoundParameterPolyphony` |
| Fade a loop in or out at a call site | `SoundParameterFadeInLength` / `SoundParameterFadeOutLength` |
| Start a clip partway through | `SoundParameterStartPosition` |
| Cheapen a voice on low-end hardware | `SoundParameterBypassVoiceEffects` |
