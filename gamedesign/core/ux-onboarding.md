---
version: 1.0.0
---

# UX & Onboarding

> **Scope**: Player-facing UX and onboarding method — George Fan's tutorial principles, just-in-time teach-by-doing, the FTUE funnel as an instrumented telemetry contract, cognitive-load budgets (Hodent), UI flow diagrams, feedback/affordance/signifier discipline, Schell's juiciness and the interaction loop, channels-and-modes information mapping, interface transparency, the first-impression hook, indirect control through UI constraints, Sylvester's interface-as-intent-translation (mapping, constrained control, invisible input assist, interface friction/noise), metaphor and intuition in the interface, and the learning ramp / skill ladder (accessibility floor, depth ceiling, skill range, invisible/optional/adaptive teaching, flexible goals), and learning as overcoming uncertainty (Koster's safe-experimentation space, Costikyan's uncertainty taxonomy as a teaching sequence).
> **Load when**: designing tutorials, onboarding, or first-time user experience; building UI flows or menus; instrumenting funnels; teaching mechanics; reducing cognitive load; designing the HUD; mapping information to display channels; designing or auditing interface modes; tuning game-feel feedback ("juice"); shaping the opening minutes / first impression; guiding player choices without explicit instruction; mapping controls to player intent and minimizing interface friction; choosing interface metaphors or building a metaphor vocabulary; designing a difficulty/skill ramp and widening a game's skill range with flexible goals; framing onboarding as managing player uncertainty.
> **References**: `.unikit/memory/gamedesign/core/references/ux-onboarding-channels-modes.md` (the channel-assignment process, the worked information→channel→presentation table, and the mode-error discipline); `.unikit/memory/gamedesign/core/references/ux-onboarding-interface-craft.md` (Sylvester's intent-translation model, mapping / constrained-control / invisible-input-assist craft, and the metaphor toolkit with good/bad table); `.unikit/memory/gamedesign/core/references/ux-onboarding-learning-ramp.md` (the full Sylvester learning ramp + Zubek's uncertainty-taxonomy lens).

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
- Define the funnel: name the events, the drop-off you'll
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

## The Interaction Loop & Feedback (Juiciness)

Schell frames the interface as a continuous **loop of interaction**: information
flows player → game → player, again and again, and the return half of that loop
is feedback. The signifier discipline above governs *legibility*; Schell adds the
*aliveness* axis — **juiciness** (Lens of Juiciness):

- **Map every player action to a feedback response.** A "dry" interface answers
  some inputs and ignores others; a "juicy" one responds to each one, richly and
  immediately. Audit: is there an action the game receives but does not visibly,
  audibly, or tactilely acknowledge?
- **Second-order motion** is the engine of juice — motion *derived* from the
  player's action, amplified and easy to control (Schell's Swiffer hinge: a small
  wrist turn produces a large, satisfying sweep). Player input that produces
  abundant, controllable downstream motion *feels* powerful.
- **A juicy response can reward on several channels at once** (visual + audio +
  haptic + score). When the player earns feedback, ask how multi-modal it can be.
- Schell ties feedback to *fun*: a great game reached through a dry interface
  creates a contradiction. The interface is the first thing the player touches —
  make it satisfying before the content has to carry the experience.

> **Juiciness checklist** (Schell)
> - Does the interface answer *every* player action? If not, why not?
> - Is there controllable second-order motion derived from the player's input?
> - When the player is rewarded, how many channels carry it at once?

This is the *legibility* (UX) and *richness* (Schell) side of feedback; the
~100 ms responsiveness *budget* is owned by the frameworks game-feel section.

## Channels & Modes of Information

Schell's **Lens of Channel and Dimension** is the process for deciding *what* the
player needs to know and *through which path* it reaches them — a complement to the
Hodent load budgets (load asks "how much"; this asks "through which path"). The
core moves: **list every piece of information and rank it by need** (always visible
/ during play / sometimes), so salience follows rank; **list the channels** (HUD
regions, the character, sound, the screen edge, an enemy's body — many are
world-borne, not chrome); **assign each piece to a channel**, grouping like data;
and choose each channel's **dimension** (color/size/font), spending extra
dimensions sparingly. Rule of thumb: don't overload one channel, and **if it looks
different it must behave different** (and vice-versa). A **mode** (the same input
now doing something else) is taught at a cost: use as few as possible, never
overlap two modes on one input channel, and make every mode change large and
unmissable (the `vi` invisible-mode failure).

→ The full channel-assignment process, the worked information→channel→presentation
mapping table, and the mode-error discipline with both checklists are in
`references/ux-onboarding-channels-modes.md` — load it when laying out a HUD,
mapping information to channels, or designing interface modes.

## Transparency & Interface Relationships

Schell models the interface as the bridge between player and game world, built
from **physical input/output** (controller, screen, audio), a **virtual layer**
(score readouts, menus, the camera's view — not part of the world but not the raw
hardware either), and the **mappings** (the code on every arrow) that connect
them. The design goal is not "looks good" but a felt sense of **control** (Lens
of Control): players get the result they expected, believe their actions decide
the outcome, and feel powerful.

The highest expression of this is **transparency** (Lens of Transparency): *the
best interface disappears.* When the interface is intuitive and uncluttered, the
player stops perceiving it and projects straight into the world — "I climbed the
hill and threw the rope," not "I pressed the button." Heuristics:

- Can a new player use it intuitively after brief practice? If not, what is the
  first thing that confuses them, and at what moment?
- Does it stay correct in *edge cases* (character at a cliff edge while moving
  fast) and under *pressure* (combat) — or does it betray the player exactly when
  the stakes are highest?
- **Borrow genre-standard interface conventions** as a starting point (players
  arrive pre-trained), then differentiate — but never copy so literally the game
  reads as a clone. Build the design *around its physical interface*; a control
  scheme that fits one input cleanly beats one that targets every input poorly.

## First Impressions / Onboarding Hook

The FTUE funnel above measures onboarding; Schell's **interest curve** (Lens of
the Interest Curve) shapes its *emotional* arc, and crucially the curve **starts
before play begins**:

- **Point A — initial interest** is set by expectations the player already holds:
  box art, store page, trailers, friends' word of mouth, the loading screen, the
  menu. Onboarding inherits this level; design the pre-play surfaces, not just the
  first level. (Caution: an over-inflated initial expectation makes everything
  after feel like a letdown.)
- **Point B — the hook** is the early spike that makes the player "stop and
  watch" and buys patience for the slower setup that follows. The opening minutes
  must hook before they teach; a hookless start bleeds interest until the player
  crosses the abandonment threshold (the cliff a funnel drop-off names). This is
  the *why* behind Fan's "get the player playing fast."
- **Shape**: open strong (hook) → ease off so the player can settle and learn →
  ramp interest with peaks and rests → climactic finish → leave a little residual
  interest ("leave them wanting more"). Interest curves are **fractal** — the
  whole game, each session, and each first challenge each want this shape, so the
  first session is a small interest curve in its own right.
- Validate against real players: have playtesters draw their own interest curve
  and compare it to the one you intended; a flat opening segment is the
  first-impression defect to cut or let players skip.

> **First-impression checklist** (Schell)
> - What sets the player's expectation *before* they press start, and is it
>   pitched right (high, not impossible)?
> - Is there a hook in the opening minutes — something that makes them stop and
>   watch — and does it land before any teaching load?
> - Does the first session itself rise, rest, and pay off (its own small curve)?

## Indirect Control: Guiding Without Telling

Schell's **indirect control** (Lens of Indirect Control) extends the signifier
idea: lead the player's choices so they act as you intend yet feel free — control
the *sense* of freedom, not the freedom itself. The UI-relevant levers:

- **Constraints reduce choice without removing it.** Offering three colors, not
  an open field of millions, makes deciding easy and still feels like a choice; a
  room with two doors all but guarantees the player walks through one. In UI:
  surface a curated short list (a "top picks" set) instead of the full catalog.
- **The interface itself constrains intent.** Players only attempt what the
  interface implies is possible — a plastic-guitar controller never prompts "jump
  off the stage." Choosing the input and the affordances *silently* rules options
  in and out, more reliably than instructions.
- **Visual design steers the eye, and the player walks toward what they look at.**
  A dominant focal element (Disney's "weenie" — the castle that pulls guests
  inward) directs movement without a sign; a strong guiding line can override
  competing distractions so completely that players follow it yet later have no
  memory of it. Use composition and salience to lead attention, then choices.
- **Goals are indirect control**: a clear goal makes players visit only the
  places that serve it — design content along that path rather than building
  freedom the player will never exercise.

The discipline is to *guide without telling*: the player should reach the
intended action by their own apparent volition. ("When a good leader's work is
done, the people say: we did it ourselves.")

(Sylvester names the same toolkit — nudging, priming, and social imitation
through companion NPCs — as a second source for indirect control; the levers
above already cover it.)

## Interface as Intent Translation & Metaphor (Sylvester)

Sylvester frames the interface as a **two-way translator** ("*the game is no more
than what it communicates*"): one arrow carries the game's **state** out, the other
carries the player's **intent** in, and the goal is **synchronization** between
intent and in-game action with no felt gap. Every fidelity loss is **interface
friction** — *output* noise (loud/beautiful signal that means nothing; over-detailed
art burying mechanically-relevant shapes) or *input* loss (ambiguous mapping,
mutually-impossible controls fronting simultaneous actions, lag). Counter it with
**redundancy** (send a must-not-miss message across several paths). The input-side
craft: **mapping** that *resembles* its effect (BioShock's left/right triggers =
left/right hands), **constrained controls** fronting mutually-exclusive actions, and
**invisible input assist** (aim assist nudging only what the player can't perceive).
Make an interface *intuitive* with **metaphor** — wrap unfamiliar mechanics in
familiar concepts — but keep a consistent **metaphor vocabulary** (one unchanging
look for "interactive"), because a broken metaphor sends the player pixel-hunting.

→ The full intent-translation model, the mapping / constrained-control /
invisible-input-assist craft, the metaphor sources, the good/bad metaphor table, and
both checklists are in `references/ux-onboarding-interface-craft.md` — load it when
mapping controls to intent, minimizing friction, or building a metaphor vocabulary.

## The Learning Ramp & Uncertainty (Sylvester, Zubek)

Where JIT/teach-by-doing covers *how* to introduce one mechanic, Sylvester frames
onboarding as building the player's **mental model up an escalating ramp**, fitting
the game's **skill range** to its audience. Three anchors: the **accessibility
floor** (minimum skill to play — chronically underestimated), the **depth/skill
ceiling** (where more mastery stops helping), and the **range** between them
(*easy to learn, hard to master* is the elegant goal). The model deepens through
three transformations — **mechanical → situational → intellectual** — and good
teaching walks the player up them with **invisible/optional/adaptive teaching**,
**flexible (graded) goals**, the right **difficulty-adjustment** mode (explicit /
adaptive / implicit), and **emotional support** over the pre-skill boundary. Zubek
(via Koster/Costikyan) adds the *why*: **fun is learning**, which needs a **safe
experimentation space**, and what the player learns is to **manage uncertainty** —
so synchronise each difficulty increase to the *rising* skill curve (too fast
frustrates, too slow bores).

→ The full ramp (floor/ceiling/range, the three transformations, every
ramp-building lever, the checklist) and Zubek's uncertainty-taxonomy table are in
`references/ux-onboarding-learning-ramp.md` — load it when designing a skill ramp,
widening the skill range, or framing onboarding as managing uncertainty.

## Accessibility Intersection

UX and accessibility overlap but are distinct: UX optimizes for the *intended*
player; accessibility ensures players with impairments can play at all. Subtitle
defaults, remappable controls, colorblind-safe signifiers, and text scaling are
owned by the accessibility rule — UX must leave room for them (e.g., never encode
critical state by color alone).

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
- A "dry" interface that swallows player actions without acknowledging them.
- Two modes sharing one input channel, or a mode change with no perceptible cue
  (a `vi`-style invisible mode) — the player no longer knows what their inputs do.
- Overloading one channel, or things that look different but behave the same (or
  look the same but behave differently) — color-only variants read as functional.
- A hookless opening that teaches before it interests; or pre-play surfaces (menu,
  store page, loading) left undesigned so initial interest starts at the floor.
- Building free-roam content the player's goals will never lead them to, instead
  of polishing the path they will actually take.
- Noise dressed as signal: loud or beautiful interface/graphics elements that
  carry no meaning to the player's model — over-detailed art burying the
  mechanically-relevant shapes (Sylvester).
- A control mapping that must be memorized instead of resembling its effect; or
  constrained physical controls fronting unconstrained actions (tool-swap and
  movement on the same thumb) — forcing the player to stop one to do the other.
- Fiction that implies mechanics the game doesn't deliver, or breaking an
  established metaphor vocabulary mid-game — the player pixel-hunts or quits at a
  wall that was never meant to block them (Sylvester).
- A binary pass/fail challenge where graded goals would serve a wider skill range;
  or punishing failure with a restart/grind instead of a graded, forward-moving
  setback.
- Adaptive difficulty exposed to (or used on) expert players, who detect and game
  it and then distrust every outcome.
- Teaching the pre-skill opening minutes with a "press W to walk" wall instead of
  carrying the player on skill-free emotional triggers.
- Punishing early mistakes hard instead of protecting a safe experimentation
  space — learning needs room to fail (Koster).
- Escalating difficulty out of sync with the player's rising skill — too fast
  frustrates, too slow bores.

## Source Map

| Source | Used for |
|--------|----------|
| George Fan, GDC 2012 talk on *Plants vs. Zombies* tutorials | Onboarding Principles (Fan); Just-in-Time & Teach-by-Doing |
| GameAnalytics FTUE funnel model | The FTUE Funnel & Instrumentation |
| Celia Hodent, *The Gamer's Brain* | Cognitive Load (Hodent) |
| Jesse Schell, *The Art of Game Design: A Book of Lenses* (Russian translation), Ch 15, 16, 18 | The Interaction Loop & Feedback (Juiciness — Lens of Juiciness, second-order motion); Channels & Modes of Information (Lens of Channel and Dimension, the channel-assignment process and mapping table); Modes & Mode Errors (Lens of Modes); Transparency & Interface Relationships (Lens of Control / Transparency, physical-virtual-mapping model); First Impressions / Onboarding Hook (Lens of the Interest Curve, point-A initial interest, the hook, fractal curves); Indirect Control: Guiding Without Telling (Lens of Indirect Control — constraints, interface affordance, visual "weenie", goals) |
| Robert Zubek, *Elements of Game Design* (MIT Press, 2020; Russian translation), Ch 5 | "Learning as Overcoming Uncertainty" — Koster's fun-as-learning and the safe-experimentation-space requirement; Costikyan's uncertainty taxonomy reframed as an onboarding ramp (performance / perception / decision / player-unpredictability / complexity / anticipation); skill-uncertainty as the directly-tunable lever and synchronising difficulty to rising skill |
| Tynan Sylvester, *Designing Games* (O'Reilly, 2013; Russian translation), Ch 3, 9 | Interface as Intent Translation (two-way intent↔state bridge, input/output signal, synchronization of intent and action, interface friction, noise vs signal, redundancy — uniform/varied/passive); Mapping, Constrained Control & Invisible Input Assist (stove/BioShock mapping, constrained vs unconstrained controls, aim-assist sub-systems); Metaphor & Intuition (metaphor sources, metaphor vocabulary, the good/bad metaphor table); The Learning Ramp (accessibility floor, depth/skill ceiling, skill range, mechanical→situational→intellectual transformations, invisible/optional/adaptive teaching, flexible goals, explicit/adaptive/implicit difficulty, emotional support over the skill boundary); plus anti-patterns and a second-source note on indirect control (nudge/prime/social imitation) |
