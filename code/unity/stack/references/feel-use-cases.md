# Feel — Use cases (feedback recipes)

> **Base path:** `Assets/Third-Party Assets/Feel/`
> See also: [feel-quickref.md](feel-quickref.md) (short index), [feel-feedbacks-full.md](feel-feedbacks-full.md) (all 199 feedbacks), [feel-tools-full.md](feel-tools-full.md) (tools, shakers, springs, haptics)

Ready-made stacks, one per block. Each is distilled from Feel's own demo scenes and
the official recipes, then rewritten as an actionable build order. Read **only the
block you need** — the main rule lists every title with a one-line summary.

**How to read a block**
- **Stack** — the feedbacks in list order inside one MMF_Player. Order matters: the
  list plays top-to-bottom with each feedback's own `Initial Delay`.
- **Delay** — the feedback's `Initial Delay` in the Timing foldout, in seconds.
- **Setup** — scene components that must exist or the stack silently does nothing.
- **Tuning** — starting numbers. Always tune down from these; over-juiced beats
  under-juiced in a demo and loses in a 30-minute session.

Timing vocabulary used throughout: **impact frame** (0 s, everything that sells the
hit), **reaction** (0.02–0.10 s, the world responding), **settle** (0.10–0.40 s,
returning to rest).

---

## CASE-01 — Hit impact on an enemy

**When**: any damage event that does not kill. The single most important stack in an
action game; build it first and reuse its shape everywhere.

**Stack** (on the enemy prefab, one `MMF_Player` named `HitFeedbacks`)

| # | Feedback | Delay | Key settings |
|---|---|---|---|
| 1 | `Time/Freeze Frame` | 0 | Duration `0.02` |
| 2 | `Renderer/Flicker` | 0 | Duration `0.12`, Octave `3`, white or damage colour |
| 3 | `Camera/Cinemachine Impulse` (or `Camera/Camera Shake`) | 0 | Short, low amplitude — see CASE-10 |
| 4 | `Audio/MMSoundManager Sound` | 0 | SFX track, pitch random `0.95–1.05` |
| 5 | `Transform/Position` | 0 | Relative offset along the hit normal, duration `0.10` |
| 6 | `Particles/Particles Play` | 0.02 | Impact burst already parented in the prefab |
| 7 | `PostProcess/Chromatic Aberration` | 0 | Intensity `0.4`, duration `0.15` |
| 8 | `UI/Floating Text` | 0.03 | Damage number — see CASE-09 |
| 9 | `Haptics/Haptic Preset` | 0 | `LightImpact` |

**Setup**: `MMTimeManager`, `MMSoundManager`, `MMFloatingTextSpawner` in the scene;
a Cinemachine Impulse Listener on the camera; the post-process shaker on the Volume.

**Tuning**: freeze frame is the load-bearing element — if the hit still feels soft,
raise it to `0.03` before touching anything else. Set a `CooldownDuration` of `0.05`
on the freeze frame and the impulse so a burst of hits cannot stack into a stall.

**Source**: `FeelDemos/Barbarians` (`FeelBarbarianEnemy.prefab`), `FeelDemos/Tactical`.

**Pitfalls**: playing this stack from a pooled enemy that gets disabled mid-sequence
leaves values stranded — set `RestoreInitialValuesOnDisable = true` on the player.

---

## CASE-02 — Enemy death / destruction

**When**: the object is removed from play. Distinct from CASE-01: bigger, slower, and
it must survive the object's own destruction.

**Stack** (on the enemy, `DeathFeedbacks`)

| # | Feedback | Delay | Key settings |
|---|---|---|---|
| 1 | `Time/Freeze Frame` | 0 | Duration `0.05` — heavier than a hit |
| 2 | `Camera/Camera Shake` | 0 | Amplitude ~2× the hit shake |
| 3 | `Audio/MMSoundManager Sound` | 0 | Death SFX, SFX track |
| 4 | `Animation/Animation Parameter` | 0 | Trigger `Death` |
| 5 | `GameObject/Instantiate Object` | 0 | Debris/VFX prefab, pooling enabled |
| 6 | `Transform/Scale Spring` | 0 | `Bump`, then collapse to zero |
| 7 | `Pause/Holding Pause` | — | Duration `0.30` — waits for everything above |
| 8 | `GameObject/Destroy` | 0 | Or `SetActive:false` for pooled enemies |
| 9 | `Haptics/Haptic Preset` | 0 | `MediumImpact` |

**Setup**: same as CASE-01.

**Tuning**: `Holding Pause` is what makes the destroy safe — it waits for the sequence
above to finish instead of guessing a delay.

**Better pattern in code**: `await deathFeedbacks.PlayFeedbacksTask(transform.position);`
then destroy from C#, so the object's own lifetime is not tied to a feedback list.

**Source**: `FeelDemos/Barbarians`, `MMFeedbacksDemo` destroy examples.

**Pitfalls**: never destroy the GameObject that owns the MMF_Player before the
sequence ends. Either use `Holding Pause` + the Destroy feedback (self-contained) or
await the task (code-driven) — not a raw `Destroy()` right after `PlayFeedbacks()`.

---

## CASE-03 — Player takes damage

**When**: the camera, not the enemy, is the subject. Screen-space effects dominate.

**Stack** (on a scene-level `PlayerDamageFeedbacks` player)

| # | Feedback | Delay | Key settings |
|---|---|---|---|
| 1 | `Camera/Flash` | 0 | Red, alpha `0.35`, duration `0.10` |
| 2 | `PostProcess/Vignette` | 0 | Intensity `0.5`, duration `0.35`, red tint |
| 3 | `PostProcess/Chromatic Aberration` | 0 | Intensity `0.6`, duration `0.25` |
| 4 | `Camera/Camera Shake` | 0 | Medium amplitude |
| 5 | `Audio/MMSoundManager Sound` | 0 | Player-hurt SFX, UI or SFX track |
| 6 | `Audio/Audio Filter Low Pass` | 0 | Cutoff dip and recovery over `0.5` — the "stunned" muffle |
| 7 | `Time/Timescale Modifier` | 0 | `0.7` for `0.12` s with lerp — only for heavy hits |
| 8 | `Haptics/Haptic Preset` | 0 | `HeavyImpact` |

**Setup**: `MMFlash` on a full-screen UI Image; post-process shakers on the Volume;
`MMTimeManager`; a low-pass filter with `MMAudioFilterLowPassShaker` on the listener bus.

**Tuning**: scale intensity with damage taken by calling
`PlayFeedbacks(position, intensity: damage / maxHealth)` and enabling per-feedback
intensity multipliers.

**Source**: `FeelDemos/Brass`, `MMFeedbacksDemo`.

**Pitfalls**: a permanent low-health vignette must be a **separate** always-on volume,
not this stack — the shaker restores its initial value after each shake.

---

## CASE-04 — UI button press and hover

**When**: every interactive UI element. Cheap, high perceived-quality return.

**Stack A — press** (on the button, `ClickFeedbacks`)

| # | Feedback | Delay | Key settings |
|---|---|---|---|
| 1 | `Transform/Scale Spring` | 0 | `Bump`, amount `~0.15`, damping `0.6` |
| 2 | `Audio/MMSoundManager Sound` | 0 | UI track — always the UI track, so it survives SFX muting |
| 3 | `Haptics/Haptic Preset` | 0 | `Selection` |

**Stack B — hover in/out** (one player, played in both directions)

Implement `IPointerEnterHandler` / `IPointerExitHandler` and flip the player's
direction instead of authoring two stacks:

```csharp
public void OnPointerEnter(PointerEventData e)
{
    _hoverPlayer.Direction = MMFeedbacks.Directions.TopToBottom;
    _hoverPlayer.PlayFeedbacks();
}

public void OnPointerExit(PointerEventData e)
{
    _hoverPlayer.Direction = MMFeedbacks.Directions.BottomToTop;
    _hoverPlayer.PlayFeedbacks();
}
```

**Setup**: `MMSoundManager` for the click sound.

**Tuning**: a spring `Bump` is strictly better than a scale curve here — the player can
spam the button and the spring re-targets instead of snapping.

**Source**: `MMFeedbacksDemo/UI/Button.prefab`, `FeelDemos/Springs`, official recipes.

**Pitfalls**: put the sound on the **UI** track. Buttons that go silent when the player
mutes SFX are a common regression.

---

## CASE-05 — Card in hand (tap, flip, highlight)

**When**: card games, deckbuilders, any UI object with several distinct interactions.
The pattern generalises: **one player per interaction**, all on the same prefab.

**Stack — tap/untap** (`TapFeedbacks`)

| # | Feedback | Delay | Key settings |
|---|---|---|---|
| 1 | `UI/Image RaycastTarget` | 0 | Off — lock input for the duration |
| 2 | `Transform/Scale` | 0 | Separate X and Y/Z feedbacks for anisotropic squash |
| 3 | `Camera/Camera Shake` | 0 | Very small |
| 4 | `Audio/MMSoundManager Sound` | 0 | Tap SFX, UI track |
| 5 | `UI/Image RaycastTarget` | last | On again |

**Stack — flip** (`FlipFeedbacks`)

| # | Feedback | Delay | Key settings |
|---|---|---|---|
| 1 | `Transform/Scale` | 0 | X to `0` over `0.10` — horizontal flip, first half |
| 2 | `Pause/Holding Pause` | — | `0` — wait for the collapse |
| 3 | `Events/Unity Events` | 0 | Swap the card face |
| 4 | `Transform/Scale` | 0 | X back to `1` over `0.10` |
| 5 | `Audio/MMSoundManager Sound` | 0 | Flip SFX |

**Stack — highlight** (`HighlightFeedbacks`)

`UI/Image` colour lift + `Transform/Position` raise + `PostProcess/Bloom` pulse +
`TextMesh Pro/TMP Text Reveal` on the rules text.

**Setup**: `MMSoundManager`.

**Source**: `FeelDemos/CardsUI` (`FeelCardsUI_Card.prefab` — 28 feedbacks across
several players; the reference implementation for multi-interaction UI).

**Pitfalls**: do not merge all interactions into one player and branch with `Chance` —
separate players stay debuggable and can be played concurrently.

---

## CASE-06 — Jump and landing

**When**: any character with vertical movement. Two stacks, mirrored.

**Stack — jump** (`JumpFeedbacks`)

| # | Feedback | Delay | Key settings |
|---|---|---|---|
| 1 | `Transform/Squash and Stretch` | 0 | Stretch on Y, `0.08` s anticipation |
| 2 | `Audio/MMSoundManager Sound` | 0.02 | Jump SFX |
| 3 | `Particles/Particles Play` | 0.02 | Dust puff at the feet |
| 4 | `Animation/Animation Parameter` | 0 | Trigger `Jump` |

**Stack — landing** (`LandFeedbacks`)

| # | Feedback | Delay | Key settings |
|---|---|---|---|
| 1 | `Transform/Squash and Stretch Spring` | 0 | `Bump` — squash on Y, settle |
| 2 | `Camera/Camera Shake` | 0 | Amplitude proportional to fall speed |
| 3 | `Audio/MMSoundManager Sound` | 0 | Landing SFX, pitch scaled by impact |
| 4 | `Particles/Particles Play` | 0 | Landing dust |
| 5 | `Time/Freeze Frame` | 0 | `0.015` — only for hard landings |
| 6 | `Haptics/Haptic Preset` | 0 | `LightImpact` |

**Setup**: the model must have a normalized (1,1,1) scale for squash-and-stretch;
put the component one level below the root so the root transform stays clean.

**Tuning**: pass fall speed as intensity: `landFeedbacks.PlayFeedbacks(pos, fallSpeed / maxFallSpeed)`.

**Source**: `FeelDemos/Bounce`, `FeelDemos/Blob`, `FeelDemos/SquashAndStretch`.

**Pitfalls**: `MMSquashAndStretch` (the automatic velocity-driven tool) and the
squash feedbacks fight each other on the same transform — pick one.

---

## CASE-07 — Pickup and loot collect

**When**: coins, ammo, power-ups. Must read instantly and never block movement.

**Stack** (on the pickup prefab)

| # | Feedback | Delay | Key settings |
|---|---|---|---|
| 1 | `Audio/MMSoundManager Sound` | 0 | Pitch rising with a combo counter reads as "streak" |
| 2 | `Particles/Particles Play` | 0 | Collect burst |
| 3 | `Transform/Scale` | 0 | Quick pop to `1.3` then to `0` over `0.15` |
| 4 | `UI/Floating Text` | 0 | `+1`, `+10 gold` |
| 5 | `Camera/Cinemachine Impulse` | 0 | Tiny — only for rare pickups |
| 6 | `Haptics/Haptic Preset` | 0 | `Selection` |
| 7 | `GameObject/Set Active` | 0.15 | Off — return to the pool |

**Setup**: `MMSoundManager`, `MMFloatingTextSpawner`; `MMLootTable<T>` if the drop is
randomized; `MMShufflebag<T>` if the pickup SFX should vary without clumping.

**Tuning**: pooled pickups must not use `GameObject/Destroy` — use `Set Active` and let
the pooler reclaim them.

**Source**: `FeelDemos/Snake` (`SnakeFood.prefab` — includes an explicit
"without feedbacks" twin for comparison).

**Pitfalls**: if the pickup is deactivated the same frame it plays, the sound and
particles die with it. Parent the effect to the spawner, or delay the deactivation past
the stack's total duration.

---

## CASE-08 — Screen shake budget and layering

**When**: as soon as more than one system can shake the camera. Without a budget the
screen turns to mush the moment two things happen at once.

**Rules**

1. **One shake source per event class.** Hits, deaths, explosions and landings each get
   one amplitude tier; never let two stacks shake for the same event.
2. **Tier the amplitudes** and keep the ratio wide, e.g. `0.3 / 1.0 / 2.5 / 6.0`.
   Narrow tiers are indistinguishable in play.
3. **Cooldown everything.** Set `CooldownDuration` on shake feedbacks to at least the
   shake duration so rapid fire cannot stack.
4. **Prefer Cinemachine Impulse** when the project uses Cinemachine: impulses sum and
   decay correctly, `MMCameraShaker` does not compose as gracefully.
5. **Clear on transitions.** Play `Camera/Cinemachine Impulse Clear` when pausing,
   opening a menu or cutting to a new shot.
6. **Never shake during a freeze frame** — shaking a frozen frame reads as a glitch.
   Give the shake an `Initial Delay` equal to the freeze duration.
7. **Ship an accessibility switch.** Use `MMFeedbacksAuthorizations` to disable every
   camera-shake feedback from one checkbox, driven by a settings toggle.

**Setup**: Cinemachine Impulse Listener on the brain camera, or `MMCameraShaker` on the
camera; `MMFeedbacksAuthorizations` on one empty scene object.

**Source**: `FeelDemos/Toaster` (four shake sources coexisting), `FeelDemos/Letters`
(uses `Cinemachine Impulse Clear`).

---

## CASE-09 — Floating damage numbers

**When**: any game showing per-hit values.

**Setup**

1. Put one `MMFloatingTextSpawner` in the scene and assign a floating-text prefab
   (a `MMFloatingText` with a TMP child).
2. Add `UI/Floating Text` to the hit stack.
3. Configure the spawner's pool size to the worst-case simultaneous hits, not the average.

**Passing the value**

The cleanest route is the play intensity:

```csharp
_hitFeedbacks.PlayFeedbacks(hitPoint, damage);
```

with the feedback set to use intensity as its value. For full control (colour by damage
type, custom formatting) reach into the feedback before playing:

```csharp
MMF_FloatingText text = _hitFeedbacks.GetFeedbackOfType<MMF_FloatingText>("Damage");
text.Value = damage.ToString("0");
text.ForceColor = true;
text.AnimateColorGradient = isCritical ? _critGradient : _normalGradient;
_hitFeedbacks.PlayFeedbacks(hitPoint);
```

**Tuning**: give critical hits their own labelled Floating Text feedback with a larger
font and a longer lifetime, and gate the two with `Chance` or by playing separate
players — not by rewriting one feedback's settings per hit.

**Source**: `FeelDemos/Barbarians` (two labelled floating-text feedbacks: "Small
Intensity" / "High Intensity"), `FeelDemos/Tactical`, official floating-text recipes.

**Pitfalls**: `GetFeedbackOfType<T>()` without a label returns the *first* match — always
pass the label when a player has more than one.

---

## CASE-10 — Progress bar (health, XP, cooldown)

**When**: any value the player watches change.

**Two options**

- **Simple** — `UI/Image Fill` animating `fillAmount`. Fine for cooldowns.
- **Real** — the `MMProgressBar` tool. Use it whenever the change should be *felt*.

**MMProgressBar setup**

| Setting | Value | Why |
|---|---|---|
| Fill Mode | `FillAmount` (or `Width` for a rectangular bar) | |
| Lerp Foreground Bar | on, duration `0.15` increasing / `0.25` decreasing | Asymmetry reads as "losing hurts" |
| Decreasing Delay | `0.5` | The delayed ghost bar showing damage taken |
| Lerp Decreasing Delayed Bar | on, duration `0.4` | |
| Bump Scale On Change | on, Bump Duration `0.2` | |
| Change Color When Bumping | on | Flash the bar on damage |

Drive it from code with `UpdateBar(current, min, max)` or `UpdateBar01(normalized)`.

**Adding feedbacks on top**: `Transform/Scale Spring` (`Bump`) on the bar container,
`Audio/MMSoundManager Sound` on the change, and `Springs/Spring Float` driving an
`MMSpringImageFillAmount` when the bar should overshoot.

**Source**: `FeelDemos/MMProgressBar` (combines the bar with spring feedbacks).

**Pitfalls**: driving both `MMProgressBar` and a `UI/Image Fill` feedback on the same
Image makes them fight. Pick one owner of `fillAmount`.

---

## CASE-11 — Weapon fire (muzzle, recoil, casing)

**When**: any ranged attack. Split across two players: the weapon and the impact.

**Stack — weapon** (`ShootFeedbacks` on the weapon)

| # | Feedback | Delay | Key settings |
|---|---|---|---|
| 1 | `Particles/Particles Play` | 0 | Muzzle flash, parented to the barrel |
| 2 | `Audio/AudioSource` (or MMSoundManager Sound) | 0 | Shot SFX, random pitch |
| 3 | `Transform/Rotation Spring` | 0 | `Bump` — recoil kick, settles on its own |
| 4 | `Transform/Position Spring` | 0 | `Bump` backwards along the barrel |
| 5 | `Lights/Light` | 0 | Muzzle light flash, `0.05` s |
| 6 | `Camera/Cinemachine Impulse` | 0 | Small |
| 7 | `GameObject/Instantiate Object` | 0.02 | Casing, pooled |
| 8 | `Animation/Animation Parameter` | 0 | Trigger `Shoot` |
| 9 | `Haptics/Haptic Preset` | 0 | `LightImpact` |

**Stack — impact** (on the projectile or hit resolver): reuse CASE-01.

**Tuning**: springs are the right choice for recoil — a full-auto weapon re-triggers the
kick before it settles, which a curve cannot handle.

**Source**: `FeelDemos/Tactical` (muzzle flash, impact particles, rotation and
squash-and-stretch springs, reload audio stop).

**Pitfalls**: a `Particles Play` feedback on a system that is still playing restarts it
mid-burst. For high fire rates use `Particles Instantiation` with pooling instead.

---

## CASE-12 — Scene transition and level start

**When**: entering or leaving a level.

**Stack — exit** (`TransitionOutFeedbacks`)

| # | Feedback | Delay | Key settings |
|---|---|---|---|
| 1 | `UI/Image RaycastTarget` / `UI/CanvasGroup BlocksRaycasts` | 0 | Lock input |
| 2 | `Camera/Fade` | 0 | FadeOut, `0.4` s |
| 3 | `Audio/MMSoundManager Track Fade` | 0 | Music to `0` over `0.4` |
| 4 | `Pause/Holding Pause` | — | `0.05` |
| 5 | `Scene/Load Scene` | 0 | Additive or via the loading-screen manager |

**Stack — entry** (`TransitionInFeedbacks`, auto-played on enable)

`Camera/Fade` FadeIn → `Audio/MMSoundManager Track Fade` music up →
`UI/CanvasGroup` panel fade-in → staggered `Transform/Position` on HUD elements with
increasing `Initial Delay` (`0`, `0.05`, `0.10`, …) for a cascade.

**Setup**: an `MMFader` image on a persistent canvas (`MMDontDestroyOnLoad`);
`MMSoundManager`; optionally `MMAdditiveSceneLoadingManager` for a loading screen.

**Source**: `FeelDemos/Common/NextDemoCanvas.prefab`, `MMTools/Demos/MMSceneLoading`.

**Pitfalls**: the fader must survive the load. If it lives in the unloaded scene the
screen snaps back to full brightness mid-transition.

---

## CASE-13 — Slot machine, spinning wheel, gacha reveal

**When**: any suspense-then-payoff moment. The structure is: accelerate, sustain,
decelerate, resolve, celebrate.

**Stack** (one player using the loop primitives)

| # | Feedback | Delay | Key settings |
|---|---|---|---|
| 1 | `Loop/Looper Start` | — | Loop entry point |
| 2 | `Transform/Position` | 0 | One step of the reel |
| 3 | `Audio/MMSoundManager Sound` | 0 | Tick, pitch rising with the loop index |
| 4 | `Particles/Particles Play` | 0 | Sparks along the way |
| 5 | `Loop/Looper` | — | Number of loops = spin length |
| 6 | `Pause/Holding Pause` | — | `0.20` — the suspense beat |
| 7 | `Time/Freeze Frame` | 0 | `0.04` on the stop |
| 8 | `Camera/Camera Shake` | 0 | Landing thump |
| 9 | `Transform/Scale Spring` | 0 | `Bump` on the winning cell |
| 10 | `PostProcess/Bloom` | 0 | Pulse on a win |
| 11 | `Haptics/Haptic Preset` | 0 | `Success` |

**Setup**: `MMTimeManager`, `MMSoundManager`.

**Tuning**: the deceleration sells the whole thing. Increase the loop's per-iteration
delay near the end, or drive the reel with `Transform/Position Spring` in `MoveTo` mode
so it overshoots the final cell and settles back.

**Source**: `FeelDemos/Wheel`, `FeelDemos/Letters` (both use Looper Start + Looper).

**Pitfalls**: an infinite `Looper` with no stop condition keeps the player "playing"
forever — `HasFeedbackStillPlaying()` will never go false, and `StopFeedbacks()` becomes
the only exit.

---

## CASE-14 — Music-driven / rhythmic feedbacks

**When**: rhythm games, music-reactive menus, beat-synced visuals.

**Two routes**

- **Audio analysis** — `MMAudioAnalyzer` samples the music, extracts bands and beats,
  and fires `MMBeatEvent`. Feed the level into an `MMRadioBroadcaster` →
  `MMRadioReceiver` to drive any property (bloom intensity, light colour, scale).
- **Authored sequence** — `MMSequence` (ScriptableObject) + `MMFeedbacksSequencer`:
  design a quantized pattern in the sequencer window, wire each track slot to an
  MMF_Player. `MMInputSequenceRecorder` records a pattern from live key presses.

**Stack per beat slot** (kept deliberately small — it fires many times a second)

`Transform/Position` + `Transform/Rotation` + `Renderer/Material` swap +
`Renderer/ShaderController` + `Audio/Sound` + a very small `Cinemachine Impulse`.

**Setup**: `MMAudioAnalyzer` or `MMSequencer` in the scene; `MMSoundManager` for audio.

**Tuning**: keep beat stacks under ~8 feedbacks and give the whole player
`PerformanceMode = true` — this stack runs at music tempo, not at event tempo.

**Source**: `FeelDemos/MMSequencer`, `MMFeedbacks/Demos/SequencingDemo` (99 feedbacks
across 11 identical per-note players).

**Pitfalls**: post-process feedbacks on every beat will saturate — put them on
downbeats only, or drive the volume weight continuously with MMRadio instead.

---

## CASE-15 — Mobile haptics layering

**When**: shipping to phones. Haptics are the cheapest perceived-quality win on mobile
and the easiest to overdo.

**Mapping**

| Event class | Preset |
|---|---|
| UI selection, tab change, toggle | `Selection` |
| Pickup, small hit | `LightImpact` |
| Standard hit, landing | `MediumImpact` |
| Death, explosion, heavy landing | `HeavyImpact` |
| Purchase / level up / quest complete | `Success` |
| Invalid action, failed craft | `Failure` |
| Low health, timer warning | `Warning` |

**Beyond presets**: `Haptics/Haptic Continuous` for sustained states (charging, engine
rumble) with amplitude driven by a curve; `Haptics/Haptic Clip` for authored `.haptic`
assets (convert an AudioClip with `AudioToHapticConverter`).

**Setup**: one `HapticReceiver` in the scene. Add `Haptics/Haptic Control` to the
settings screen to expose the global on/off and output level.

**Code**

```csharp
if (!DeviceCapabilities.isVersionSupported) { /* hide the haptics option entirely */ }
HapticController.hapticsEnabled = settings.HapticsOn;
HapticController.outputLevel = settings.HapticsStrength;
```

**Tuning**: haptics on every frame of a continuous action drain battery and stop being
noticed. Reserve them for discrete events; use `CooldownDuration` on the feedback.

**Source**: every `FeelDemos` scene layers `Haptic Preset` into its stacks;
`NiceVibrations/Demo/NiceVibrationsDemo` for the API.

**Pitfalls**: never use the deprecated `Haptics/Haptics DEPRECATED!` feedback.

---

## CASE-16 — 2D platformer / arcade feel

**When**: 2D games where the camera is orthographic and post-processing is limited.

**Substitutions from the 3D recipes**

| Instead of | Use |
|---|---|
| `Camera/Field of View` | `Camera/Orthographic Size` (+ `MMCameraOrthographicSizeShaker`) |
| `Lights/Light` | `Lights/Light2D_URP` (requires `MM_URP`) |
| Renderer colour flash | `Renderer/SpriteRenderer` / `SpriteRenderer Alpha` / `Flicker` |
| Mesh material swap | `Renderer/Sprite` and `Renderer/Material` |

**Core stack for a 2D hit**: `Time/Freeze Frame` `0.02` → `Renderer/Flicker` →
`Transform/Squash and Stretch Spring` → `Camera/Camera Shake` →
`GameObject/Rigidbody2D` knockback force → `Audio/MMSoundManager Sound` →
`Animation/Sprite Sheet Animation` for a hit-spark overlay.

**Extra tools**: `MMAutoOrderInLayer` and `MMRendererSortingLayer` keep spawned VFX
above the sprites; `MMPreventPassingThrough2D` stops fast projectiles tunnelling.

**Source**: `FeelDemos/Letters`, `FeelDemos/Snake`, `FeelDemos/Blob`.

**Pitfalls**: `Transform/Squash and Stretch` needs a normalized scale — 2D sprites
often carry a non-uniform scale from import, which breaks it. Nest the sprite under a
neutral parent and target the parent.

---

## CASE-17 — Placement confirm (tower defense, building, board games)

**When**: the player commits an action on a grid. Feedback must clearly separate
*valid* from *invalid*.

**Stack — valid placement**

| # | Feedback | Delay | Key settings |
|---|---|---|---|
| 1 | `Transform/Scale Spring` | 0 | `Bump` from slightly oversized down to `1` |
| 2 | `Particles/Particles Play` | 0 | Ground impact ring |
| 3 | `Audio/MMSoundManager Sound` | 0 | Confirm SFX, UI track |
| 4 | `Camera/Camera Shake` | 0 | Very small |
| 5 | `Renderer/Material Set Property` | 0 | Fade the ghost material to the real one |
| 6 | `UI/Floating Text` | 0 | Cost spent, e.g. `-50` |
| 7 | `Haptics/Haptic Preset` | 0 | `MediumImpact` |

**Stack — invalid placement**

| # | Feedback | Delay | Key settings |
|---|---|---|---|
| 1 | `Transform/Position Shake` | 0 | Short horizontal shake — the universal "no" |
| 2 | `Renderer/Flicker` | 0 | Red, `0.15` s |
| 3 | `Audio/MMSoundManager Sound` | 0 | Error SFX |
| 4 | `Haptics/Haptic Preset` | 0 | `Failure` |

**Setup**: `MMPositionShaker` on the ghost object; `MMSoundManager`;
`MMFloatingTextSpawner`.

**Tuning**: the invalid stack must be shorter than the valid one — rejection should not
cost the player time.

**Pitfalls**: keep the two stacks on separate players. Branching one player with
`Chance` or `Active` toggles is unreadable and cannot be tuned independently.

---

## CASE-18 — Inventory, crafting and reward reveal

**When**: an item enters the player's possession. Escalate by rarity.

**Stack** (one player, rarity passed as intensity)

| # | Feedback | Delay | Key settings |
|---|---|---|---|
| 1 | `Audio/MMSoundManager Sound` | 0 | Rarity-specific clip |
| 2 | `UI/CanvasGroup` | 0 | Reveal panel fade-in |
| 3 | `Transform/Scale Spring` | 0.05 | `Bump` on the item icon |
| 4 | `UI/Image` | 0 | Rarity colour on the frame |
| 5 | `PostProcess/Bloom` | 0 | Pulse — rare items only |
| 6 | `Particles/Particles Play` | 0.05 | Rarity burst |
| 7 | `TextMesh Pro/TMP Text Reveal` | 0.20 | Item name typing in |
| 8 | `Pause/Holding Pause` | — | `0.30` |
| 9 | `TextMesh Pro/TMP Count To` | 0 | Stat values counting up |
| 10 | `Haptics/Haptic Preset` | 0 | `Success` |

**Setup**: `MMSoundManager`; TextMeshPro package; post-process shaker for bloom.

**Tuning**: use `MMLootTable<T>` for the drop roll itself and one player per rarity
tier — trying to scale a single stack across common→legendary produces a stack that is
wrong at both ends.

**Source**: `FeelDemos/CardsUI` stat-bump pattern (`Blue/Yellow/Red Stats Bump`
labelled feedbacks).

**Pitfalls**: `TMP Count To` and `TMP Text` on the same component overwrite each other.
Use `Count To` for numbers and put static labels on a separate TMP object.

---

## CASE-19 — Dialogue line reveal

**When**: story text, tutorial prompts, barks.

**Stack** (on the dialogue box)

| # | Feedback | Delay | Key settings |
|---|---|---|---|
| 1 | `UI/CanvasGroup` | 0 | Box fade-in, `0.15` s |
| 2 | `Transform/Position Spring` | 0 | `Bump` — the box settling into place |
| 3 | `Audio/MMSoundManager Sound` | 0 | Box-open SFX, UI track |
| 4 | `TextMesh Pro/TMP Text Reveal` | 0.15 | Per character, speed tuned to reading pace |
| 5 | `Events/Unity Events` | last | Enable the "continue" prompt |

**Advance / skip**: a second player that plays `Feedbacks/MMF Player Control` →
`SkipToTheEnd` on the reveal player, so a tap completes the line instantly.

**Character emphasis**: for a shouted line add `TextMesh Pro/TMP Character Spacing`
and `TMP Font Size` bumps plus a small `Camera/Camera Shake`.

**Setup**: TextMeshPro package; `MMSoundManager`.

**Source**: `FeelDemos/CardsUI` (TMP Text Reveal), `MMFeedbacksDemo` TMP section.

**Pitfalls**: `SkipToTheEnd()` only works on a player that is currently playing and can
take up to 3 frames. Guard the skip input against a player that already finished.

---

## CASE-20 — Victory / defeat and tutorial highlight

**When**: end-of-run screens and directed attention. Both are "sustained state" stacks
rather than one-shot impacts, which changes the tooling.

**Victory** (`VictoryFeedbacks`)

| # | Feedback | Delay | Key settings |
|---|---|---|---|
| 1 | `Time/Timescale Modifier` | 0 | `0.3` for `0.6` s with lerp — the slow-motion beat |
| 2 | `Audio/MMSoundManager Track Fade` | 0 | Duck gameplay music |
| 3 | `Audio/MMSoundManager Sound` | 0.2 | Victory sting, Music track |
| 4 | `PostProcess/Color Adjustments` | 0 | Saturation lift |
| 5 | `Camera/Fade` | 0.4 | Custom colour, partial alpha |
| 6 | `UI/CanvasGroup` | 0.6 | Result panel in |
| 7 | `TextMesh Pro/TMP Count To` | 1.0 | Score tally, staggered per row |
| 8 | `Haptics/Haptic Preset` | 0 | `Success` |

**Defeat**: same skeleton with `Timescale Modifier` to `0.15` over a longer lerp,
`PostProcess/Color Adjustments` desaturating to grey, a low-pass audio filter sweep,
and `Failure` haptics.

**Tutorial highlight** (sustained, not one-shot)

Use a **looping** player: `Loop/Looper Start` → `Transform/Scale Spring` (`Bump`) →
`UI/Image` colour pulse → `Pause/Pause` `0.8` → `Loop/Looper` (infinite). Stop it with
`StopFeedbacks()` when the player performs the action. For a dimmed background use a
second always-on `MMFader` at partial alpha rather than a feedback.

**Setup**: `MMTimeManager`, `MMSoundManager`, `MMFader`, TextMeshPro.

**Pitfalls**: an infinite-loop player must be stopped explicitly — call
`StopFeedbacks()` and `RestoreInitialValues()`, otherwise the highlighted element keeps
its last scale. `RestoreInitialValuesOnDisable = true` on the player covers the case
where the tutorial object is simply deactivated.
