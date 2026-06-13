---
version: 1.0.0
---

# UX & Onboarding

> **Scope**: Player-facing UX and onboarding method — George Fan's tutorial principles, just-in-time teach-by-doing, the FTUE funnel as an instrumented telemetry contract, cognitive-load budgets (Hodent), UI flow diagrams, and feedback/affordance/signifier discipline.
> **Load when**: designing tutorials, onboarding, or first-time user experience; building UI flows or menus; instrumenting funnels; teaching mechanics; reducing cognitive load; designing the HUD; preparing the ux section pack.

---

## Onboarding Principles (Fan)

George Fan's tutorial rules (GDC 2012, *Plants vs. Zombies*) — the durable core:

- **Teach by doing, not by telling.** A mechanic learned through a forced action
  sticks; a tooltip is forgotten in seconds.
- **One concept at a time**, spaced out — let each be used before the next
  arrives (the level-design "gym" is the spatial form of this).
- **Get the player playing fast**; minimize the gap between launch and the core
  verb. Front-loaded text/cutscenes are where first-session players quit.
- **Remove distractions** while teaching — hide UI and options not yet relevant.
- **Reward immediately** so the first loop closes and feels good.
- **Word economy**: cut tutorial text relentlessly; if a line can be a moment of
  play instead, make it play.
- **Respect prior knowledge**: let experienced players skip; don't gate them
  behind a tutorial for genre conventions they already own.

## Just-in-Time & Teach-by-Doing

- Introduce a mechanic **at the moment it is first needed**, not in an upfront
  manual. Just-in-time instruction is remembered because it is immediately
  applied.
- Prefer **affordance over instruction**: design the situation so the correct
  action is discoverable (a ledge you can grab, an enemy weak to the new tool).
- Fade hand-holding: the third time a mechanic appears, the prompt is gone.

## The FTUE Funnel & Instrumentation

The first-time user experience is a **measured funnel**, not a vibe
(GameAnalytics FTUE model):

- Define the onboarding as **discrete, ordered steps** (launch → first verb →
  first reward → first system → first session-end). Each step is a telemetry
  event.
- The funnel is a **section I contract**: name the events, the drop-off you'll
  watch per step, and the KPI ("≥X% reach first reward"). A step with no event is
  a blind spot — you cannot fix a drop-off you can't see.
- **Drop-off is localized**: a cliff between step 3 and 4 names the exact moment
  the design loses players. Instrument first, then iterate against the data.

## Cognitive Load (Hodent)

*The Gamer's Brain* (Celia Hodent) — design within the player's mental budgets:

- **Perception**: players see what is salient, miss the rest — make critical
  information the most legible thing on screen; don't bury it.
- **Attention** is a single spotlight: one new demand at a time; competing
  prompts cause both to be missed.
- **Memory** is limited: don't require recalling a mechanic taught an hour ago
  with no reminder; reteach on re-encounter.
- Overload symptom: players ignoring tutorials isn't laziness — it's a load
  budget exceeded. Cut, don't repeat louder.

## UI Flow Diagrams

Design menus and screens as a **graph** before laying out pixels:

- Nodes = screens/states, edges = transitions (button → screen). The graph
  exposes **dead-ends** (a screen with no clear back-out) and **deep nesting**
  (the action three menus down that should be one tap).
- Every screen needs a **legible way back**; modal traps are a UX defect.
- Count taps to the most common actions; the core loop's UI should be shallow.

## Feedback & Signifiers

- **Immediate, legible feedback** for every input — the player must know the game
  heard them (the responsiveness *budget*, ~100 ms, is owned by the frameworks
  game-feel section; UX owns the *legibility* of the response).
- **Signifiers** communicate affordances: a button that looks pressable, an
  interactable with a consistent highlight. Inconsistent signifier language
  forces pixel-hunting.
- State changes must be **announced** (damage numbers, cooldown sweeps, status
  icons) — an effect the player can't perceive might as well not exist.

## Accessibility Intersection

UX and accessibility overlap but are distinct: UX optimizes for the *intended*
player; accessibility ensures players with impairments can play at all. Subtitle
defaults, remappable controls, colorblind-safe signifiers, and text scaling are
owned by the accessibility rule — UX must leave room for them (e.g., never encode
critical state by color alone).

## Authoring

- Onboarding step list + drop-off KPIs → section I (telemetry) and section H
  (acceptance criteria: "AC: ≥70% of new players complete the first core-loop
  pass").
- UI flow graph → section C; menu depth budgets are design facts.
- Feedback/signifier conventions referenced across systems live in GD-IDS or the
  GAME.md UX pillar, not re-decided per screen.

## Anti-patterns

- Front-loading text or cutscenes before the player touches the core verb.
- Teaching by tooltip wall instead of teach-by-doing.
- Multiple new concepts introduced in one beat — attention overload.
- An onboarding with no funnel instrumentation — drop-offs invisible, iteration
  blind.
- Critical information rendered low-salience or encoded by color alone.
- UI screens that dead-end with no legible back-out.
- "Players ignore the tutorial" answered by repeating it louder instead of
  cutting load.
