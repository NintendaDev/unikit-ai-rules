# Sonity — Function index

> **Base path:** `Assets/Plugins/Sonity/Scripts/Public/` (namespace `Sonity`)
> See also: [sonity-soundparameters.md](sonity-soundparameters.md)

Exhaustive index of the public runtime API of Sonity 1.2.0. Every function listed on
`SoundEvent` has a mirror on `SoundManager` that takes the `SoundEvent` as its first
argument — the two forms are equivalent, so only the differences are called out.

`SP` below is shorthand for `params SoundParameterInternals[] soundParameters`.

---

## Which entry point to use

| Call site | Form | Note |
|-----------|------|------|
| You hold a `SoundEvent` field | `soundEvent.Play(transform)` | Logs a warning and no-ops when no SoundManager exists |
| You need a global operation | `SoundManager.Instance.StopEverything()` | Throws `NullReferenceException` when `Instance` is null |
| Designer picks the sounds in the inspector | `soundPicker.Play(transform)` | `SoundPicker` serialized field |
| Component-driven, no code | `SoundTrigger` component | `soundTrigger.Play()` for manual firing |

---

## SoundEvent — 3D / owner-based playback

| Function | Overloads |
|----------|-----------|
| `Play(Transform owner)` | `+ SoundTagBase`, `+ SP`, `+ SoundTagBase + SP` |
| `PlayAtPosition(Transform owner, Transform position)` | `+ SoundTagBase`, `+ SP`, `+ SoundTagBase + SP` |
| `PlayAtPosition(Transform owner, Vector3 position)` | `+ SoundTagBase`, `+ SP`, `+ SoundTagBase + SP` |
| `Stop(Transform owner, bool allowFadeOut = true)` | — |
| `StopAtPosition(Transform position, bool allowFadeOut = true)` | — |
| `StopAllAtOwner(Transform owner, bool allowFadeOut = true)` | — |
| `StopEverywhere(bool allowFadeOut = true)` | stops this SoundEvent on every owner |
| `StopEverything(bool allowFadeOut = true)` | stops every SoundEvent in the project |
| `StopAllowFadeOut(Transform owner)` | UnityEvent-friendly, no bool argument |
| `StopAtPositionAllowFadeOut(Transform position)` | UnityEvent-friendly |
| `StopAllAtOwnerAllowFadeOut(Transform owner)` | UnityEvent-friendly |
| `StopImmediate(Transform owner)` | UnityEvent-friendly, skips fade |
| `StopAtPositionImmediate(Transform position)` | UnityEvent-friendly |
| `StopAllAtOwnerImmediate(Transform owner)` | UnityEvent-friendly |
| `Pause(Transform owner, bool forcePause = false)` | `forcePause` overrides "Ignore Local Pause" |
| `Unpause(Transform owner)` | — |
| `PauseAllAtOwner(Transform owner, bool forcePause = false)` | — |
| `UnpauseAllAtOwner(Transform owner)` | — |
| `PauseEverywhere(bool forcePause = false)` / `UnpauseEverywhere()` | this SoundEvent only |
| `PauseEverything(bool forcePause = false)` / `UnpauseEverything()` | all SoundEvents |

## SoundEvent — UI family (2D, no owner)

Uses the SoundManager's internal UI Transform, so no owner is passed.

| Function | Overloads |
|----------|-----------|
| `UIPlay()` | `+ SoundTagBase`, `+ SP`, `+ SoundTagBase + SP` |
| `UIPlayAtPosition(Vector3 position)` / `UIPlayAtPosition(Transform position)` | — |
| `UIStop(bool allowFadeOut = true)` / `UIStopAll(bool allowFadeOut = true)` | — |
| `UIPause(bool forcePause = false)` / `UIUnpause()` | — |
| `UIPauseAll(bool forcePause = false)` / `UIUnpauseAll()` | — |
| `UIGetSoundEventState()` | returns `SoundEventState` |
| `UIGetLastPlayedClipLength(bool pitchSpeed)` | — |
| `UIGetLastPlayedClipTimeSeconds(bool pitchSpeed)` | — |
| `UIGetLastPlayedClipTimeRatio()` | `0`..`1` |
| `UIGetTimePlayed()` | — |
| `UIGetTransform()` | the shared UI Transform |

## SoundEvent — Music family

Uses the SoundManager's internal music Transform.

| Function | Notes |
|----------|-------|
| `MusicPlay(bool stopAllOtherMusic = true, bool allowFadeOut = true)` | `+ SP` overload |
| `MusicPlayAllowFadeOut(bool stopAllOtherMusic = true)` | UnityEvent-friendly |
| `MusicPlayImmediate(bool stopAllOtherMusic = true)` | UnityEvent-friendly |
| `MusicStop(bool allowFadeOut = true)` / `MusicStopAll(bool allowFadeOut = true)` | — |
| `MusicPause(bool forcePause = false)` / `MusicUnpause()` | — |
| `MusicPauseAll(bool forcePause = false)` / `MusicUnpauseAll()` | — |
| `MusicGetSoundEventState()` | — |
| `MusicGetLastPlayedClipLength(bool pitchSpeed)` | — |
| `MusicGetLastPlayedClipTimeSeconds(bool pitchSpeed)` | — |
| `MusicGetLastPlayedClipTimeRatio()` | `0`..`1` |
| `MusicGetTimePlayed()` | — |
| `MusicGetTransform()` | the shared music Transform |

## SoundEvent — queries and audio data

| Function | Returns |
|----------|---------|
| `GetSoundEventState(Transform owner)` | `SoundEventState` — `NotPlaying`, `Delayed`, `Playing`, `Paused` |
| `GetLastPlayedClipLength(Transform owner, bool pitchSpeed)` | seconds |
| `GetLastPlayedClipTimeSeconds(Transform owner, bool pitchSpeed)` | seconds |
| `GetLastPlayedClipTimeRatio(Transform owner)` | `0`..`1` |
| `GetTimePlayed(Transform owner)` | seconds since the voice started |
| `GetMaxLength()` | longest possible duration of this SoundEvent |
| `GetMaxDistance()` | audible radius in Unity units |
| `GetContainsLoop()` | `true` when any SoundContainer loops |
| `GetLastPlayedAudioSource(Transform owner)` | `AudioSource` — may be recycled, do not cache |
| `GetSpectrumData(Transform owner, ref float[] samples, int channel, FFTWindow window, SpectrumDataFrom spectrumDataFrom)` | fills `samples` |
| `LoadAudioData()` / `UnloadAudioData()` | audio data of all its SoundContainers |

## SoundManager — global-only functions

These have no `SoundEvent` equivalent; call them on `SoundManager.Instance`.

| Function | Purpose |
|----------|---------|
| `SetGlobalPause()` / `SetGlobalUnpause()` / `GetGlobalPaused()` | drives `AudioListener.pause`; skips SoundEvents flagged "Ignore Global Pause" |
| `SetGlobalVolumeDecibel(float)` / `GetGlobalVolumeDecibel()` | drives `AudioListener.volume` — affects non-Sonity AudioSources too |
| `SetGlobalVolumeRatio(float)` / `GetGlobalVolumeRatio()` | linear form of the same |
| `SetGlobalSoundTagAtIndex(int index, SoundTag)` / `GetGlobalSoundTagAtIndex(int)` | current global SoundTag slots |
| `SetGlobalDistanceScale(float)` / `GetGlobalDistanceScale()` | world-scale multiplier for all distance falloff |
| `SetSpeedOfSoundEnabled(bool)` / `SetSpeedOfSoundScale(float)` / `GetSpeedOfSoundScale()` | distance-based playback delay; scale `1` ≈ 430 units/second |
| `SetVoiceLimit(int)` / `GetVoiceLimit()` | max simultaneous voices |
| `SetVoiceEffectLimit(int)` / `GetVoiceEffectLimit()` | max simultaneous lowpass/highpass/distortion chains |
| `SetDisablePlayingSounds(bool)` / `GetDisablePlayingSounds()` | global mute switch that skips playback entirely |
| `GetSoundManagerTransform()` | the SoundManager's own Transform |
| `GetAddressableAudioMixer()` | the loaded AudioMixer instance when the addressable-mixer mode is on |
| `GetAddressableAudioMixerHasLoaded()` | load state for that mode |
| `ManualUpdate()` | drive Sonity's update yourself; needs `SONITY_ENABLE_SOUNDMANAGER_MANUAL_UPDATE` |
| `ActionAddressableAudioMixerLoaded` | `event Action<bool>` raised when that mixer finishes loading |

## SoundPicker (serialized field)

| Function | Overloads |
|----------|-----------|
| `Play(Transform owner)` | `+ SoundTagBase`, `+ SP`, `+ SoundTagBase + SP` |
| `PlayAtPosition(Transform owner, Transform position)` | `+ SoundTagBase`, `+ SP`, `+ SoundTagBase + SP` |
| `PlayAtPosition(Transform owner, Vector3 position)` | `+ SoundTagBase`, `+ SP`, `+ SoundTagBase + SP` |
| `Stop`, `StopAtPosition`, `Pause`, `Unpause` | same shapes as `SoundEvent` |
| `LoadAudioData()` / `UnloadAudioData()` | for every SoundEvent it holds |

## SoundTrigger (component)

| Function | Notes |
|----------|-------|
| `Play()` | `+ SoundTagBase`, `+ SP`, `+ SoundTagBase + SP`; owner is the component's Transform |
| `PlayAtPosition(Transform position)` / `PlayAtPosition(Vector3 position)` | same overload set |
| `Stop(bool allowFadeOut = true)` / `StopAtPosition(Transform position, bool allowFadeOut = true)` | — |
| `Pause(bool forcePause = false)` / `Unpause()` | — |
| `PauseEverywhere(bool forcePause = false)` / `UnpauseEverywhere()` | — |
| `GetSoundEventState()` | — |
| `LoadAudioData()` / `UnloadAudioData()` | — |
| `Initialize()` | call after changing its SoundEvent from code |

Trigger sources are `SoundTriggerOnType`: `OnBasic`, `OnTrigger`, `OnCollision`, `OnMouse`.
Each mapped action is a `SoundTriggerAction`: `Play`, `Stop`, `StopImmediate`, `Pause`,
`PauseForced`, `Unpause`.

## SoundDataGroup (ScriptableObject)

| Function | Notes |
|----------|-------|
| `LoadAudioData(bool includeChildren)` | loads every assigned SoundEvent's clips |
| `UnloadAudioData(bool includeChildren)` | frees them again |

## Legacy functions — do not use in new code

Compiled only when `SONITY_ENABLE_LEGACY_FUNCTIONS_MUSIC_AND_2D` is defined.

| Legacy | Modern replacement |
|--------|--------------------|
| `Play2D`, `Play2DAtPosition` | `UIPlay`, `UIPlayAtPosition` |
| `Stop2D`, `StopAll2D` | `UIStop`, `UIStopAll` |
| `Pause2D`, `Unpause2D`, `PauseAll2D`, `UnpauseAll2D` | `UIPause`, `UIUnpause`, `UIPauseAll`, `UIUnpauseAll` |
| `Get2DSoundEventState`, `Get2DLastPlayedClip*`, `Get2DTimePlayed`, `Get2DTransform` | `UIGetSoundEventState`, `UIGetLastPlayedClip*`, `UIGetTimePlayed`, `UIGetTransform` |
| `PlayMusic`, `PlayMusicAllowFadeOut`, `PlayMusicImmediate` | `MusicPlay`, `MusicPlayAllowFadeOut`, `MusicPlayImmediate` |
| `StopMusic`, `StopAllMusic` | `MusicStop`, `MusicStopAll` |
| `PauseMusic`, `UnpauseMusic`, `PauseAllMusic`, `UnpauseAllMusic` | `MusicPause`, `MusicUnpause`, `MusicPauseAll`, `MusicUnpauseAll` |
| `GetMusicSoundEventState`, `GetMusicLastPlayedClip*`, `GetMusicTimePlayed`, `GetMusicTransform` | `MusicGetSoundEventState`, `MusicGetLastPlayedClip*`, `MusicGetTimePlayed`, `MusicGetTransform` |
| `SetGlobalSoundTag` / `GetGlobalSoundTag` (needs `SONITY_ENABLE_LEGACY_FUNCTIONS_GLOBAL_SOUNDTAG`) | `SetGlobalSoundTagAtIndex` / `GetGlobalSoundTagAtIndex` |
