---
version: 1.0.0
---

# Sonity

> **Scope**: Sonity audio middleware for Unity — the SoundContainer/SoundEvent asset model, playing and stopping sounds from C#, owner Transform lifecycle, SoundParameters and Modifiers, polyphony and voice budgeting, mixing and player volume control, audio data loading, and the SoundManager settings that govern all of it.
> **Load when**: playing or stopping sounds from code with Sonity, wiring SoundEvents into gameplay or UI, authoring SoundContainer and SoundEvent assets, passing SoundParameters such as intensity or volume, budgeting voices and polyphony for many simultaneous sounds, setting up or tuning the SoundManager, implementing player volume sliders, loading or unloading audio data, debugging silent, stolen, or never-stopping sounds.
> **References**: `.unikit/memory/code/stack/references/sonity-soundparameters.md` (SoundParameter catalog), `.unikit/memory/code/stack/references/sonity-functions.md` (exhaustive function index)

---

## Core Concepts

The asset chain is always the same, and code only ever touches the last link:

```
AudioClip(s)  ->  SoundContainer (_SC)  ->  SoundEvent (_SE)  ->  Play() from C#
```

- **SoundContainer** — holds the AudioClips plus *how a single layer sounds*: loop, volume, pitch, spatial blend, distance curve, lowpass/highpass, distortion, crossfades. Never referenced from gameplay code.
- **SoundEvent** — holds one or more SoundContainers on a timeline plus *how the sound behaves as an event*: polyphony, priority, cooldown, probability, fades, mixer routing, trigger-on-play/stop/tail. **This is the only Sonity asset gameplay code should reference.**
- **SoundManager** — one MonoBehaviour singleton per game. Owns the voice pool, global volume/pause, distance scale, and all statistics. Nothing plays without it.

Every Sonity asset is a `ScriptableObject` and is live-editable in play mode — audio designers can retune while the game runs, so never mirror SoundEvent values into your own serialized fields.

Namespaces: the public API is `Sonity`; anything under `Sonity.Internal` is implementation detail. **Never reference `Sonity.Internal` types from gameplay code** other than the `SoundParameterInternals` array type required by the `params` overloads.

### Asset type map

| Asset / component | Default file prefix | Use it for |
|---|---|---|
| `SoundContainer` | `_SC` | one audio layer and its playback settings |
| `SoundEvent` | `_SE` | the playable unit referenced from code |
| `SoundPolyGroup` | `POL_` | capping total voices across *several* SoundEvents |
| `SoundVolumeGroup` | `_VOL` | editor-time volume balancing of a sound category |
| `SoundMix` | `_MIX` | hierarchical modifier groups (volume, distance scale) |
| `SoundTag` | `TAG_` | swapping sound variants by context (indoor/outdoor, material) |
| `SoundPreset` | `SoundPreset_` | applying settings automatically by asset name |
| `SoundDataGroup` | `_DAT` | bulk load/unload of audio data |
| `SoundPhysicsCondition` | `SPC_` | material/velocity conditions for `SoundPhysics` |
| `SoundTrigger` | component | designer-driven playback on Unity callbacks |
| `SoundPhysics` / `SoundPhysics2D` (+ `NoFriction`) | component | collision and friction sounds |
| `AudioListenerDistance` | component | required when "Override Listener Distance" is on |
| `SoundPicker` | serialized field | inspector-assignable set of SoundEvents + modifiers |

---

## Scene Setup

- Exactly one `SoundManager` must exist. Add the `SoundManager` prefab from `Assets/Plugins/Sonity/Prefabs`, or the `Sonity 🔊/Sonity - Sound Manager` component to an empty GameObject. A second instance is destroyed automatically with a warning.
- **Set the SoundManager's Script Execution Order to a negative value (e.g. `-50`)** whenever anything plays a sound during `Awake`. `SoundManager.Instance` is `null` until its own `Awake` runs.
- Set **Distance Scale** to match world scale before authoring any 3D sound — it multiplies every distance curve in the project, so changing it later re-balances the whole mix.
- Leave **Use DontDestroyOnLoad** on for a persistent audio system; it reparents the SoundManager GameObject to the scene root.

---

## Playing Sounds from Code

Two equivalent forms exist. They are **not** equally safe:

```csharp
using UnityEngine;
using Sonity;

public sealed class BlockImpactAudio : MonoBehaviour
{
    [SerializeField] private SoundEvent _impactSoundEvent;

    private void OnImpact()
    {
        // Preferred: instance call on the asset.
        // Guards internally and logs a warning if no SoundManager exists.
        _impactSoundEvent.Play(transform);

        // Equivalent, but throws NullReferenceException when Instance is null
        // (e.g. during Awake, or in a test scene without a SoundManager).
        SoundManager.Instance.Play(_impactSoundEvent, transform);
    }
}
```

- **Default to `soundEvent.Play(transform)`.** Use `SoundManager.Instance.*` only for the global functions that have no SoundEvent equivalent (`SetGlobalPause`, `SetGlobalVolumeDecibel`, `SetVoiceLimit`, …).
- Reference SoundEvents with `[SerializeField] private SoundEvent _field;` — never `public`, in line with the project code-style rules.
- Neither form guards a **null SoundEvent field**. An unassigned reference throws. Validate assignment in the editor (Odin `[Required]`) rather than adding runtime null checks to every call site.

### Three playback families — pick by role, not by convenience

| Family | Call | Owner | Use for |
|---|---|---|---|
| Spatial | `Play(owner)` / `PlayAtPosition(owner, position)` | your Transform | everything in the world |
| UI | `UIPlay()` | SoundManager's UI Transform | button clicks, menus, 2D feedback |
| Music | `MusicPlay(stopAllOtherMusic, allowFadeOut)` | SoundManager's music Transform | music tracks and stingers |

The UI and Music families exist so you never have to invent an owner Transform for a
non-positional sound. `MusicPlay` stops all other music by default, which is what makes
music transitions crossfade correctly — do not roll your own "stop then play".

```csharp
_buttonClickSoundEvent.UIPlay();
_menuMusicSoundEvent.MusicPlay();                  // stops other music, fades out
_menuMusicSoundEvent.MusicPlay(stopAllOtherMusic: true, allowFadeOut: false);
```

**Never use the legacy `Play2D*` / `PlayMusic*` / `StopMusic*` names.** They were renamed in 1.1.0 and only compile behind the `SONITY_ENABLE_LEGACY_FUNCTIONS_MUSIC_AND_2D` define symbol. The full old→new mapping is in the function index reference.

---

## Owner Transform Discipline

The `owner` Transform is Sonity's **identity key**. Polyphony, `Stop`, `Pause`, and every
state query are resolved per (SoundEvent, owner) pair.

- Stop with the **same Transform** you played with. `enemy.Play(transform)` stopped via `enemy.Stop(otherTransform)` silently does nothing.
- For a one-shot fired from a pooled or shared emitter, use `PlayAtPosition(owner, position)`: the owner keeps ownership for polyphony and stopping, while the audio is heard at `position`.
- **Always stop looping sounds when the owner dies.** A looping voice whose owner Transform is destroyed keeps playing unless the SoundContainer has "Stop if Transform is Null" enabled — enable it on every looping container *and* stop explicitly:

```csharp
public sealed class EngineLoopAudio : MonoBehaviour
{
    [SerializeField] private SoundEvent _engineLoopSoundEvent;

    private void OnEnable() => _engineLoopSoundEvent.Play(transform);

    private void OnDisable()
    {
        // StopAllAtOwner covers every SoundEvent this object started,
        // which is what you want on pooled objects returning to the pool.
        _engineLoopSoundEvent.StopAllAtOwner(transform);
    }
}
```

- For pooled objects prefer `StopAllAtOwner(transform)` over per-event `Stop` calls — a recycled object must not inherit voices from its previous life.
- `GetLastPlayedAudioSource(owner)` returns a pooled `AudioSource`. Read it and discard; **never cache it** — the voice pool reassigns it.

---

## SoundParameters

SoundParameters are the only way to change playback **from code**. They are plain C#
objects passed to any `params SoundParameterInternals[]` overload. The full catalog of
all 24 types, their constructors, defaults, ranges, and settable properties lives in the
parameter reference.

### Cache parameters — never allocate per play call

Two allocations hide in a naive parameterised play call: the parameter object *and* the
implicit `params` array. On a mobile project firing dozens of impacts per second this is
measurable GC pressure.

```csharp
// BAD — two heap allocations on every single impact
_impactSoundEvent.Play(transform, new SoundParameterVolumeDecibel(volumeDb));

// GOOD — cache both the parameter and the array; mutate the value in place
public sealed class ImpactAudio : MonoBehaviour
{
    [SerializeField] private SoundEvent _impactSoundEvent;

    private readonly SoundParameterVolumeDecibel _volume = new(0f, UpdateMode.Once);
    private readonly SoundParameterPitchSemitone _pitch = new(0f, UpdateMode.Once);
    private SoundParameterInternals[] _parameters;

    private void Awake() => _parameters = new SoundParameterInternals[] { _volume, _pitch };

    public void PlayImpact(float strength01)
    {
        _volume.VolumeDecibel = Mathf.Lerp(-12f, 0f, strength01);
        _pitch.PitchSemitone = Random.Range(-2f, 2f);
        _impactSoundEvent.Play(transform, _parameters);
    }
}
```

### UpdateMode — read once vs. read every frame

- `UpdateMode.Once` (the default): the value is captured when the voice starts. Mutating the instance afterwards does nothing to that voice.
- `UpdateMode.Continuous`: the voice re-reads the instance every frame, so you keep writing to the same object to steer a playing loop.

**A `Continuous` parameter instance is shared by every voice that received it.** Cache one
per emitter, not one per prefab type — otherwise all instances of a sound follow the same
value.

Some parameters are Once-only by construction (no `UpdateMode` argument):
`SoundParameterDelay`, `SoundParameterStartPosition`, `SoundParameterPolyphony`,
`SoundParameterDistanceScale`, `SoundParameterForce2D`.

### Intensity — the parameter that matters most

`SoundParameterIntensity` maps any gameplay magnitude (impact speed, explosion radius,
charge level, RPM) into whatever the SoundContainer's intensity curves are wired to:
volume, pitch, lowpass, or a soft/medium/hard layer crossfade. Design the mapping in the
SoundContainer; the code just supplies a number.

```csharp
public sealed class DestructibleBlockAudio : MonoBehaviour
{
    [SerializeField] private SoundEvent _breakSoundEvent;

    // Once: one-shot physics impact, sampled at the moment of collision
    private readonly SoundParameterIntensity _impactIntensity = new(1f, UpdateMode.Once);

    private void OnCollisionEnter2D(Collision2D collision)
    {
        _impactIntensity.Intensity = collision.relativeVelocity.magnitude;
        _breakSoundEvent.PlayAtPosition(transform, collision.GetContact(0).point);
    }
}
```

```csharp
public sealed class CoreChargeAudio : MonoBehaviour
{
    [SerializeField] private SoundEvent _chargeLoopSoundEvent;

    // Continuous: a looping sound steered every frame
    private readonly SoundParameterIntensity _charge = new(0f, UpdateMode.Continuous);

    private void OnEnable() => _chargeLoopSoundEvent.Play(transform, _charge);

    private void Update() => _charge.Intensity = CurrentChargeRatio;

    private void OnDisable() => _chargeLoopSoundEvent.StopAllAtOwner(transform);
}
```

Use the SoundContainer's **intensity record** in the editor to discover the real value
range at runtime, then use "Scale Max to 1" / "Scale Min-Max to 0-1" to normalise it —
do not pre-normalise in code, or the designer loses the ability to retune.

### Where a value can come from — the override chain

When the same setting is specified in several places, the winner is:

```
SoundParameter  >  SoundMix  >  SoundTrigger / SoundPicker  >  SoundTag  >  SoundEvent
```

Everything except a `Continuous` SoundParameter is evaluated **once, at voice start**.
So: Modifiers and SoundMix cannot animate a playing loop. For a value that must change
while a loop plays, use a `Continuous` SoundParameter, or route the sound through an
`AudioMixerGroup` and animate the exposed mixer parameter.

---

## Polyphony and Voice Budget

This is where Sonity projects fail on mobile — many simultaneous emitters producing
identical sounds. Use the cheapest control that solves the problem, in this order:

1. **SoundEvent → Cooldown Time.** The retrigger guard. A block-break sound with a 0.05 s cooldown collapses a burst of 30 simultaneous breaks into a few audible hits at zero code cost.
2. **SoundEvent → Probability %.** Thin out a dense stream of identical impacts without a hard cutoff.
3. **SoundEvent → Polyphony + Polyphony Mode.**
   - `LimitedPerOwner` — N copies per owner Transform. The default; right for per-entity sounds.
   - `LimitedGlobally` — N copies across the whole game. Reassigns ownership to the SoundManager Transform, and is ignored by `UIPlay` and `MusicPlay`.
4. **SoundPolyGroup.** The only way to cap voices *across* different SoundEvents: assign every material-variant of a bullet impact to one group with a limit, and the group as a whole never exceeds it.
5. **SoundManager → Voice Limit** as the last-resort global ceiling.

Voice stealing picks the victim by **priority × current volume**, so a distant quiet
sound is stolen before a close loud one. Set high priority on music and player-critical
sounds; enable "Never Steal Voice" only on music.

### SoundManager performance settings

| Setting | Guidance |
|---|---|
| **Voice Limit** | the hard ceiling; must be ≥ Voice Preload |
| **Voice Preload** | voices created at startup — set it to the expected steady-state count to avoid mid-game allocation hitches |
| **Voice Disable Time** | seconds an unused voice stays warm; higher = less retrigger overhead, more idle AudioSources |
| **Voice Effect Limit** | simultaneous lowpass/highpass/distortion chains. These run on the audio thread — keep it low on mobile |
| **PlayOneShot Optimization** | enable it; Sonity uses `AudioSource.PlayOneShot` where possible |
| **Disable Voice Effects** | for low-end targets; also needs the `SONITY_DISABLE_VOICE_EFFECTS` define |

**PlayOneShot Optimization** applies only when the voice has distance disabled, spatial
blend 0, or Force2D. It is skipped for looping sounds, trigger-on-tail, random or non-zero
start position, and follow-position. When active it disables SoundContainer
"Prevent End Clicks" and makes `GetLastPlayedClipTimeSeconds` / `GetLastPlayedClipTimeRatio`
return meaningless values — if you drive UI from clip time, disable the optimization on
that SoundContainer via "No PlayOneShot Optimize".

---

## Mixing and Volume Control

Three separate volume systems, each with one correct job:

| System | Job | Runtime-safe? |
|---|---|---|
| `AudioMixerGroup` on the SoundEvent | routing, effect chains, **player volume sliders** | yes |
| `SoundVolumeGroup` | balancing a sound category during development | **no** |
| `SoundMix` | hierarchical modifier groups (volume, distance scale) | evaluated once at voice start |
| `SoundManager` global volume | master mute / global duck | yes, but drives `AudioListener.volume` and so affects non-Sonity AudioSources |

- **Player-facing volume sliders must go through AudioMixer exposed parameters**, not `SoundVolumeGroup` and not global volume. Convert the 0..1 slider to decibels; snap the bottom of the range to `-80f` so 0 is true silence:

```csharp
private const float LowestDecibel = -40f;

public void SetCategoryVolume(AudioMixer mixer, string exposedParameter, float volume01)
{
    volume01 = Mathf.Clamp01(volume01);
    float decibel = (1f - volume01) * LowestDecibel;
    if (decibel <= LowestDecibel)
    {
        decibel = -80f; // AudioMixer's -infinity
    }

    mixer.SetFloat(exposedParameter, decibel);
}
```

- Assign the `AudioMixerGroup` on the **SoundEvent**, not the SoundContainer (removed there in 1.0.6).
- **Use few AudioMixerGroups.** Switching a voice's group costs performance during voice matching, so reserve groups for effect chains and broad categories (MUS / SFX / AMB / UI / VO), never one per sound.
- Raising volume above 0 dB requires "Enable Volume Increase" plus the `SONITY_ENABLE_VOLUME_INCREASE` define. Prefer the alternative: author everything ~20 dB low and make up the gain in the mixer, which preserves headroom.

---

## Audio Data and Memory

- `soundEvent.LoadAudioData()` / `UnloadAudioData()` handle one event's clips.
- `SoundDataGroup.LoadAudioData(includeChildren)` / `UnloadAudioData(includeChildren)` handle a whole nested group — the right granularity for per-level or per-biome audio.

```csharp
public sealed class RunAudioLoader : MonoBehaviour
{
    [SerializeField] private SoundDataGroup _runSoundData;

    public void PreloadRun() => _runSoundData.LoadAudioData(includeChildren: true);

    public void ReleaseRun() => _runSoundData.UnloadAudioData(includeChildren: true);
}
```

### AudioClip import settings

| Use case | Length | Frequency | Load Type | Notes |
|---|---|---|---|---|
| SFX — impacts, footsteps, UI | < 1 s | high | Decompress On Load | enable Preload Audio Data + Load In Background |
| Medium one-shots | 1–60 s | any | Compressed In Memory | — |
| Music, long ambience | > 60 s | low | Streaming | keep under ~10 concurrent streams |
| Localised 3D ambience | > 60 s | high | Compressed In Memory | streaming does not scale per-emitter |

- Compression: Vorbis, quality ≈ 60 (≈192 kbit/s stereo). Drop to 30 for dense SFX libraries.
- Sample rate: match the platform (48 kHz) so no runtime resampling occurs, and so pitch-shifting keeps high-frequency content.
- Mono halves the bitrate — make every 3D sound mono; keep stereo for music, UI, and 2D ambience.
- `SoundParameterReverse` and the Reverse modifier need uncompressed or decompress-on-load clips.

---

## Components for Designer-Driven Audio

- **`SoundTrigger`** — plays or stops a SoundEvent from Unity callbacks (`OnBasic`, `OnTrigger`, `OnCollision`, `OnMouse`), with tag filtering and velocity→intensity conversion. Prefer it over a bespoke MonoBehaviour whenever the logic is purely "callback fires → play sound". Subclass it (plus an editor script) when you need extra fields rather than duplicating it.
- **`SoundPhysics`** — collision and friction sounds. Requires a `Rigidbody`/`Rigidbody2D` on the same object. **Use the `NoFriction` variants unless friction sounds are actually needed** — they skip `FixedUpdate` and the `Stay` callbacks entirely.
- **`SoundPicker`** — a serialized field letting designers pick several SoundEvents plus modifiers on any MonoBehaviour:

```csharp
public sealed class ChestOpenAudio : MonoBehaviour
{
    [SerializeField] private SoundPicker _openSounds;

    public void Open() => _openSounds.Play(transform);
}
```

  **`SoundPicker` cannot be nested inside an array, a `List<>`, or a custom serializable class** — it relies on a `CustomPropertyDrawer` and Unity's serializer does not support polymorphism there. One field per MonoBehaviour, at the top level. If you need N sets, use N fields or fall back to `SoundEvent[]`.

- **`AudioListenerDistance`** — required in the scene when "Override Listener Distance" is on. Put the `AudioListener` on the camera and this component on the player so falloff follows the character while spatialization follows the camera. Essential for top-down and third-person cameras.

---

## SoundTags

`SoundTag` swaps which SoundContainers a SoundEvent plays, and applies modifiers, based on
context — surface material, indoor/outdoor acoustics, accessibility variants.

- **Local**: pass it per call — `soundEvent.Play(transform, _woodSoundTag)`.
- **Global**: `SoundManager.Instance.SetGlobalSoundTagAtIndex(0, _indoorSoundTag);` — multiple indexed slots since 1.1.2.
- A SoundTag is not forwarded to the SoundEvents it itself triggers, which is what prevents infinite recursion.
- `SetGlobalSoundTag` / `GetGlobalSoundTag` (no index) are legacy and need `SONITY_ENABLE_LEGACY_FUNCTIONS_GLOBAL_SOUNDTAG`.

---

## Scripting Define Symbols

Sonity gates optional behaviour behind define symbols **and** a matching SoundManager
toggle. Setting one without the other produces a startup warning — always change both.

| Symbol | Enables |
|---|---|
| `SONITY_ENABLE_VOLUME_INCREASE` | +24 dB on SoundEvent/SoundContainer, +12 dB on SoundVolumeGroup |
| `SONITY_DISABLE_VOICE_EFFECTS` | strips lowpass/highpass/distortion (low-end platforms) |
| `SONITY_ENABLE_SOUNDMANAGER_MANUAL_UPDATE` | replaces the internal `Update` with `SoundManager.Instance.ManualUpdate()` |
| `SONITY_ENABLE_ADDRESSABLE_AUDIOMIXER` | loads the AudioMixer as an addressable asset instead of a direct reference |
| `SONITY_ENABLE_INTEGRATION_STEAM_AUDIO` | Steam Audio spatializer settings on SoundContainers |
| `SONITY_ENABLE_INTEGRATION_PLAYMAKER` | PlayMaker actions |
| `SONITY_ENABLE_LEGACY_FUNCTIONS_MUSIC_AND_2D` | pre-1.1.0 `Play2D*` / `PlayMusic*` names — do not add to new projects |
| `SONITY_ENABLE_LEGACY_FUNCTIONS_GLOBAL_SOUNDTAG` | pre-1.1.2 single-slot global SoundTag API |

---

## Authoring Conventions

- Create assets in bulk: select the AudioClips (or their folder) → right-click → `Create / Sonity / Create Assets from Selection`. Do not hand-create `_SC` + `_SE` pairs one at a time.
- **Use `SoundPreset` with Auto Match naming** so `UI_`, `MUS_`, `AMB_`, `VO_` prefixes apply the right defaults (distance off + spatial blend 0 for UI, max priority + never-steal for music, no random pitch for voice). This is what keeps a large library consistent without manual per-asset work.
- A SoundContainer whose filename contains `loop` automatically gets looping, follow-position, stop-if-null, and random start position. Name looping assets accordingly.
- Naming a set of containers `Close`/`Distant`/`Far` or `Soft`/`Medium`/`Hard` auto-wires distance and intensity crossfades.
- After a Sonity version upgrade run `Tools / Sonity 🔊 / Tools / Reserialize - All Sonity Assets` to refresh the cached GUIDs Sonity uses for asset comparison.

---

## Debugging

- **SoundManager → Statistics** is the first stop: active/inactive/total SoundEvent instances, real vs. virtual voices, stolen and max-simultaneous voice counts, and voice-effect usage. If "stolen" is climbing, the voice budget is the problem, not the assets.
- **Log SoundEvents** prints play/stop/pause/pool events; click a log line to select the owner, position, or SoundEvent asset.
- **Draw SoundEvents** renders active SoundEvent names in the scene and game views.
- Enable debug locally with the EditorPrefs-backed toggle (per-machine, not committed); use "Force Debug" only for shared debug scenes.
- Sonity sits on native Unity `AudioSource`s, so the standard Unity Profiler Audio module and deep profiling work normally.

---

## Anti-patterns

- **Playing a SoundContainer.** Only SoundEvents are playable. A SoundContainer reference in gameplay code is always a mistake.
- **`new SoundParameterX(...)` inside a play call in a hot path.** Allocates the parameter and the `params` array every call — cache both.
- **Stopping with a different Transform than you played with.** Silently does nothing; the loop plays forever.
- **Not stopping loops on pooled objects.** Call `StopAllAtOwner(transform)` in `OnDisable`, not just `OnDestroy`.
- **Caching the `AudioSource` from `GetLastPlayedAudioSource`.** The pool reassigns it to another voice.
- **Driving player volume sliders through `SoundVolumeGroup` or `AudioListener.volume`.** `SoundVolumeGroup` is a development-time balancing tool and is not meant to change in builds; `AudioListener.volume` also silences non-Sonity sources. Use AudioMixer exposed parameters.
- **One `AudioMixerGroup` per sound.** Voice-group switching costs performance; use a handful of category groups.
- **Expecting a Modifier or SoundMix to animate a playing loop.** They are evaluated once at voice start — use a `Continuous` SoundParameter or an animated mixer parameter.
- **Sharing one `Continuous` SoundParameter instance across many emitters.** Every voice that received it follows the same value.
- **Playing during `Awake` without fixing Script Execution Order.** `SoundManager.Instance` is `null` and, with the `SoundManager.Instance.*` form, throws.
- **Solving sound spam by raising Voice Limit.** Fix it at the source with Cooldown Time, Probability, polyphony, and SoundPolyGroups; the voice limit is a ceiling, not a mixer.
- **Using the legacy `Play2D` / `PlayMusic` names.** They do not compile without a define symbol; use `UIPlay` / `MusicPlay`.

---

## Function Lookup Workflow

1. For a **SoundParameter** — which types exist, their constructor arguments, defaults, ranges, settable property, and whether they support `UpdateMode.Continuous` — open `.unikit/memory/code/stack/references/sonity-soundparameters.md`.
2. For a **function signature** — the exact overload set of `Play` / `Stop` / `Pause`, the UI and Music families, the getters, the SoundManager-only globals, or the legacy→modern rename table — open `.unikit/memory/code/stack/references/sonity-functions.md`.
3. Only the common calls are shown in this file. Do NOT guess an overload or a parameter name — verify it against the reference files.

---

## Source Map

| Source | Used for |
|--------|----------|
| `Assets/Plugins/Sonity/Scripts/Public/**` (v1.2.0 source) | exact public API surface, overload sets, legacy `#if` gating, asset file prefixes |
| `Assets/Plugins/Sonity/Scripts/Internal/SoundParameter.cs` | the 24 SoundParameter types, constructors, defaults, ranges, UpdateMode support |
| `Assets/Plugins/Sonity/Scripts/Internal/SoundManagerInternalsSettings.cs`, `SoundManagerBase.cs` | SoundManager settings, define-symbol warnings, null-guard behaviour |
| `Assets/Plugins/Sonity/Templates/*.cs` | volume-slider decibel conversion, music/UI singleton patterns |
| `Assets/Plugins/Sonity/Documentation/Sonity Changelog.txt` | version 1.2.0 feature set, deprecations |
| https://sonity.gitbook.io/docs/sonity/getting-started.md | scene setup, script execution order, asset creation workflow |
| https://sonity.gitbook.io/docs/soundevent.md | polyphony modes, priority, cooldown, probability, trigger-on-tail, intensity scaling |
| https://sonity.gitbook.io/docs/soundcontainer.md | container settings, loop naming, crossfade naming, PlayOneShot opt-out |
| https://sonity.gitbook.io/docs/soundmanager.md | voice budget settings, PlayOneShot conditions, statistics, debug tools |
| https://sonity.gitbook.io/docs/modifiers.md | the modifier override chain and once-at-start evaluation |
| https://sonity.gitbook.io/docs/soundparameter.md, `.../soundparameterintensity.md` | UpdateMode semantics, intensity usage patterns |
| https://sonity.gitbook.io/docs/soundpolygroup.md, `.../soundmix.md`, `.../soundvolumegroup.md`, `.../sounddatagroup.md`, `.../soundtag.md`, `.../soundpreset.md`, `.../soundpicker.md`, `.../soundtrigger.md` | asset-type roles, runtime-safety limits, SoundPicker nesting limitation |
| https://sonity.gitbook.io/docs/how-to-guides/optimize-audioclip-settings.md | AudioClip import settings table |
| https://sonity.gitbook.io/docs/sonity/legacy-support.md, `.../soundmanager/soundmanager-functions.md`, `.../soundevent/soundevent-functions.md` | legacy→modern rename mapping, global function list |
