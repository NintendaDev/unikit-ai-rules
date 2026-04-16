---
version: 1.0.0
---

# Audio Modulation

> **Scope**: UE5 Audio Modulation plugin — Control Bus and Bus Mix authoring, runtime modulation parameter control via `UAudioModulationStatics`, Modulation Generator setup, Patch wiring, and integration with MetaSound, Sound Wave, and Submix destinations.
> **Load when**: setting up runtime audio parameter control, authoring Control Buses or Bus Mixes, activating or deactivating mixes from C++, integrating Audio Modulation with MetaSound, debugging modulation not affecting audio, designing dynamic mixing systems.

---

## Core Concepts

The Audio Modulation plugin provides a runtime value-passing system that sits on top of the Audio Mixer. It is **not** the same as the Audio Bus system (which routes audio signal). Control Buses carry **parameter values** (normalized floats), not audio.

Key classes:

| Class | Role |
|-------|------|
| `USoundModulationParameter` | Defines the value type (Volume, Pitch, Lowpass, Highpass, Custom) and the mix function. Default mix function: multiplication of all active values. |
| `USoundControlBus` | A named "knob" that holds a single normalized `[0.0, 1.0]` value. Always alive once referenced. Has no effect until something sets its value. |
| `USoundControlBusMix` | A snapshot that drives one or more Control Buses to target values. Must be explicitly activated/deactivated. Multiple mixes can be simultaneously active; their contributions are multiplied. |
| `USoundModulationPatch` | Combines multiple bus inputs through transform curves into one output value. Use when non-linear mapping between bus value and destination is required. |
| `USoundModulationGenerator` | Procedural value source (LFO, AD Envelope, Envelope Follower). Drives buses directly without a mix. |

**Data flow:**

```
Generators ──┐
             ▼
Bus Mixes ──► Control Bus ──► Patch (optional) ──► Destination
                                                  (Sound Wave, MetaSound,
                                                   Sound Class, Submix)
```

Each destination exposes four modulation slots: Volume, Pitch, Lowpass filter cutoff, Highpass filter cutoff.

---

## Module Setup

Add to `Build.cs`:

```csharp
PublicDependencyModuleNames.AddRange(new string[]
{
    "AudioModulation"
});
```

Required headers:

```cpp
#include "AudioModulationStatics.h"
#include "SoundControlBus.h"
#include "SoundControlBusMix.h"
#include "SoundModulationParameter.h"
```

Enable the plugin: **Project Settings → Plugins → Audio Modulation**.

---

## C++ API — `UAudioModulationStatics`

### Activate / Deactivate a Bus Mix

```cpp
// Activate — the mix immediately begins driving its target buses.
UAudioModulationStatics::ActivateBusMix(this, MusicMix);

// Deactivate — buses return to their default values.
UAudioModulationStatics::DeactivateBusMix(this, MusicMix);

// Deactivate ALL mixes in the world (use only for emergency reset).
UAudioModulationStatics::DeactivateAllBusMixes(this);
```

Always call `DeactivateBusMix` in `EndPlay` or the owner's destructor. Activated mixes outlive their activator unless explicitly released.

### Update a Mix Stage at Runtime

Use `UpdateMix` to adjust a stage's target value after the mix is already active (e.g., applying user volume settings):

```cpp
TArray<FSoundControlBusMixStage> Stages;
FSoundControlBusMixStage Stage;
Stage.Bus = MasterVolumeBus;
Stage.Value.TargetValue   = NormalizedVolume;  // [0.0, 1.0]
Stage.Value.AttackTime    = 0.1f;              // seconds
Stage.Value.ReleaseTime   = 0.2f;
Stages.Add(Stage);

UAudioModulationStatics::UpdateMix(this, Stages, MasterMix, /*FadeInTime=*/0.1f);
```

### Set / Clear a Bus Value Directly

Use `SetGlobalBusMixValue` when you want to control a single bus without creating a persistent mix asset:

```cpp
// Push value onto the bus with a fade.
UAudioModulationStatics::SetGlobalBusMixValue(this, MusicBus, 0.5f, /*FadeTime=*/0.3f);

// Release the override; bus reverts to mix-driven value.
UAudioModulationStatics::ClearGlobalBusMixValue(this, MusicBus, /*FadeTime=*/0.3f);
```

### Filter-Based Bulk Update

`SetBusMixByFilter` updates all stages that match an address pattern and/or parameter class:

```cpp
UAudioModulationStatics::SetBusMixByFilter(
    this,
    TEXT("/Game/Audio/Buses/*"),           // address filter (empty = match all)
    USoundVolumeModulationParameter::StaticClass(),
    nullptr,                               // specific param (null = match class only)
    0.8f,                                  // target value
    0.2f,                                  // fade time
    MyMix
);
```

### Create a Mix Dynamically at Runtime

Prefer asset-defined mixes. Use dynamic creation only for procedural scenarios:

```cpp
TArray<FSoundControlBusMixStage> Stages;
// ... fill stages ...

USoundControlBusMix* DynamicMix = UAudioModulationStatics::CreateBusMix(
    this, FName("DynamicMix"), Stages
);
UAudioModulationStatics::ActivateBusMix(this, DynamicMix);
```

### Generators

```cpp
// Activate a generator so it begins producing values.
UAudioModulationStatics::ActivateGenerator(this, MyLFO);
UAudioModulationStatics::DeactivateGenerator(this, MyLFO);
```

**UE5.6+ note:** Blueprint nodes `Activate Bus`, `Deactivate Bus`, `Activate Generator`, `Deactivate Generator` are deprecated. Use the `Modulation Destination` type in Blueprint instead. The C++ `UAudioModulationStatics` API remains unchanged.

---

## Asset Authoring Workflow

1. **Create `USoundModulationParameter`** — or reuse built-in `USoundVolumeModulationParameter`, `USoundPitchModulationParameter`, etc.
2. **Create `USoundControlBus`** — assign the parameter. Set a sensible default value (typically `1.0` for volume buses).
3. **Create `USoundControlBusMix`** — add a stage per bus with target value and fade times.
4. **Assign buses as modulators** — open a Sound Wave / MetaSound / Sound Class / Submix, locate the Modulation section, add buses to the Volume/Pitch/Filter modulator slots.
5. **Activate the mix** — call `UAudioModulationStatics::ActivateBusMix` from C++ or Blueprint when the scenario begins.

---

## Patterns & Examples

### User Settings Volume Sliders

Create a persistent mix that is activated at game start and updated when the user changes settings:

```cpp
// In your audio manager subsystem or game instance:
void UAudioManager::BeginPlay()
{
    UAudioModulationStatics::ActivateBusMix(this, UserSettingsMix);
    ApplyVolumeSetting(SavedMasterVolume);
}

void UAudioManager::ApplyVolumeSetting(float NormalizedVolume)
{
    TArray<FSoundControlBusMixStage> Stages;
    FSoundControlBusMixStage Stage;
    Stage.Bus = MasterVolumeBus;
    Stage.Value.TargetValue = NormalizedVolume;
    Stage.Value.AttackTime  = 0.05f;
    Stage.Value.ReleaseTime = 0.1f;
    Stages.Add(Stage);
    UAudioModulationStatics::UpdateMix(this, Stages, UserSettingsMix, 0.05f);
}

void UAudioManager::EndPlay(const EEndPlayReason::Type Reason)
{
    UAudioModulationStatics::DeactivateBusMix(this, UserSettingsMix);
    Super::EndPlay(Reason);
}
```

### Gameplay Scenario Mix (e.g., Combat Intensity)

```cpp
// Activate an "intense combat" mix that ducks music and boosts SFX.
void UMyAudioComponent::EnterCombat()
{
    UAudioModulationStatics::ActivateBusMix(this, CombatIntensityMix);
}

void UMyAudioComponent::ExitCombat()
{
    UAudioModulationStatics::DeactivateBusMix(this, CombatIntensityMix);
}
```

---

## Debugging

```
// In the console (in-editor or in-game):
au.Debug.SoundModulation 1      // shows active buses and current normalized values
au.Debug.SoundModulation 2      // shows the modulation matrix (bus interactions)
```

**Audio Insights plugin** (if enabled): the *Control Buses* tab shows each active bus value as a float in `[0.0, 1.0]`. The *Modulation Matrix* tab shows how multiple buses combine to affect each source.

---

## Best Practices

- **Always use fade times.** Every `UpdateMix`, `SetGlobalBusMixValue`, and mix activation supports attack/release times. Instant value changes cause audible pops.
- **Layer mixes by concern.** Keep a persistent "user settings" mix for volume preferences and activate/deactivate gameplay-driven mixes on top. Never overload one mix with unrelated responsibilities.
- **Prefer asset-defined mixes over dynamic creation.** Asset mixes are visible in the Modulation Matrix and easier to debug. Reserve `CreateBusMix` for procedural scenarios.
- **Use a World Subsystem or Audio Manager to own mix activation.** Activating mixes from transient actors (pawns, projectiles) leads to dangling activations when the actor is destroyed without calling `DeactivateBusMix`.
- **Set sensible bus defaults.** A volume bus defaulting to `0.0` will silence all sounds until a mix explicitly sets it. Default to `1.0` unless the use case requires otherwise.
- **MetaSound is the preferred sound type.** MetaSounds natively support modulation and give full control over how bus values are consumed inside the graph.

---

## Anti-patterns

- **Sound Cues with modulation** — Sound Cues have a modulation section in the editor, but it does not function. Use Sound Wave or MetaSound for modulated sounds.
- **Activating mixes without cleanup** — `ActivateBusMix` increases an internal ref count. If the owning object is destroyed without calling `DeactivateBusMix`, the mix remains active for the duration of the world.
- **Confusing Control Bus with Audio Bus** — `USoundControlBus` carries modulation parameter values. `UAudioBus` routes audio signal through the mixer. They are unrelated and cannot be substituted for each other.
- **Missing `AudioModulation` module in Build.cs** — `UAudioModulationStatics` will be unavailable at compile time. Symptom: linker errors referencing the statics class.
- **Forgetting to enable the plugin** — the Audio Modulation plugin ships with UE5 but is disabled by default in many project templates. Check *Project Settings → Plugins → Audio Modulation*.
- **Setting normalized values outside `[0.0, 1.0]`** — bus values are always normalized. Values outside this range produce undefined parameter behavior depending on the parameter's mix function.