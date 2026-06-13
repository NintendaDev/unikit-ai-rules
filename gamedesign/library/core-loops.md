---
version: 1.0.0
---

# Core Loops

> **Scope**: Engagement loop architecture — loop anatomy (action→reward→investment→re-entry), timescale layering from moment-to-moment to meta, dual skill/accumulation loops, appointment and return triggers, resource-flow diagnostics, and the ethical line between habit and compulsion exploitation.
> **Load when**: designing or documenting a core loop, defining session structure, layering progression over moment-to-moment play, designing daily or retention mechanics, evaluating reward schedules, drawing the GAME.md loop stack, questioning why players return.

---

## Loop Anatomy

A loop is a closed chain **action → reward → investment → re-entry**. Each stage
must have an explicit answer:

- **Action** — what the player *does* (a verb; skill-expressive where possible).
- **Reward** — what they *get*, immediately and legibly.
- **Investment** — where the reward *goes* so the next pass is different or
  better (upgrade, unlock, base, knowledge).
- **Re-entry** — why the next pass is *desirable now* (goal proximity, fresh
  variation, restored tension).

A loop missing investment is a treadmill; a loop missing re-entry leaks players
at every pass boundary.

## Timescale Layers

| Layer | Horizon | Question it answers | Typical carriers |
|---|---|---|---|
| Moment | seconds | is doing this satisfying right now? | game feel, micro-feedback |
| Core loop | 30 s – minutes | one full verb→reward pass | the central activity |
| Session | 5–30 min | what makes one sitting feel complete? | quests, runs, levels |
| Meta | days–weeks | what am I building toward? | progression, collection, base |
| Social / event | weeks+ | what is happening in the world? | events, seasons, guilds |

- Document each layer with its loop and its **"why again"**. A missing layer is
  a deliberate, named decision (a session game may legitimately have no meta) —
  not an oversight.
- Mid-core pattern (Deconstructor of Fun): a core loop simple enough for short
  sessions + a meta deep enough for long-term goals. Accessibility lives in the
  core, depth lives in the meta.

## Dual Loops

Pair a **skill loop** (mastery-driven: better play → better outcomes) with an
**accumulation loop** (progress-driven: time invested → guaranteed growth):

- The accumulation loop carries motivation through skill plateaus; the skill
  loop keeps accumulation from degenerating into pure waiting.
- Keep the exchange rate honest: if accumulated power fully substitutes for
  skill, the skill loop dies (and Competence with it); if accumulation is
  irrelevant, dry skill plateaus churn players.

## Resource Flow Diagnostics

- Trace every loop output to an input somewhere: rewards with no sink pile up
  into meaninglessness; sinks with no faucet starve the loop. (Full faucet/sink
  economy math belongs to the economy rule.)
- Name each loop's **aspirational driver** — the visible thing the player wants
  that the loop feeds. A loop without a visible aspiration is maintenance work.
- Loop connections across systems are GD-INDEX `Depends` edges: state which
  system produces and which consumes every connecting resource.

## Appointment & Return Triggers

Appointment mechanics (daily quests, timed rewards, energy, events) build
return habits. The honest/manipulative line:

- **Honest**: rewards presence and respects absence — show-up bonuses, catch-up
  mechanics, earned things never decay.
- **Manipulative**: punishes absence — streak loss, decaying progress, fear of
  missing out as the primary driver. Retention built on loss-aversion is churn
  debt plus reputational risk.

Design test: **does the loop respect a player who leaves for a week?**

## Compulsion-Loop Ethics

Variable-ratio reward schedules (random reward per action) are the strongest
known habit engine — and the most ethically loaded:

- Research links loot-box spending with problem-gambling severity (Zendle &
  Cairns). Randomized **monetized** rewards are a red-line domain; the
  monetization-ethics rule carries the dark-pattern catalog and the legal
  landscape.
- Zagal's dark-pattern categories — **temporal** (forced grind, appointment
  abuse), **monetary** (pay to skip pain you designed), **social** (guilt and
  obligation as levers), **psychological** (exploitative variable rewards) —
  are Critical-severity review findings when they are load-bearing in a loop.
- Design tests: "would this loop still be engaging with deterministic
  rewards?" (if no — the schedule is the game, and that is a finding); "are we
  rewarding play, or monetizing anxiety?"
- Randomness for *variety* (build diversity, encounter spice) is distinct from
  randomness as a *retention or monetization lever* aimed at compulsion.

## Documenting Loops

- **GAME.md loop stack**: the verb chain per layer (e.g., `scout → fight →
  loot → upgrade → unlock region`), one line per layer with its "why again".
- **Per-system GDDs** state the system's loop role (which stage of which layer
  it serves) in sections A/B, and wire timing targets into section H acceptance
  criteria (e.g., "AC: a full core-loop pass completes in 45–90 s").

## Anti-patterns

- A loop whose reward feeds nothing — no investment stage, no re-entry pull.
- Rewards detached from the verb: the player is paid for logging in, not for
  playing.
- The meta loop devouring the core: optimal play becomes menu management.
- Retention via punishment: streaks, decay, and FOMO as primary return drivers.
- Variable-ratio schedules stacked on monetized rewards and labeled
  "engagement".
- Loop timing asserted nowhere — no acceptance criteria, no target bands, "it
  feels right" as the spec.
- Loops documented as marketing prose instead of a traceable verb/resource
  chain.
