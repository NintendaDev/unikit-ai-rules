---
version: 1.0.0
---

# Progression

> **Scope**: Progression architecture — progression axes (vertical, horizontal, cosmetic, mastery), relationship types, the curve-type taxonomy and threshold derivation, time-to-max and pacing budgets, velocity/acceleration, actual-vs-perceived progression and the four elements of perceived difficulty, unlock pacing and gating, the reinforcement-schedule taxonomy and workload-change/level-curve pacing (Zubek), regression and loss, power-vs-content coupling, skill-tree design, the elder-game transition, co-op progression pitfalls, adaptive difficulty, and PvP progression (sum × feedback matrix, power curves, game length).
> **Load when**: designing levels/XP, writing progression formulas, choosing a curve shape, pacing unlocks, designing or auditing a reinforcement schedule, designing skill trees or talent systems, setting time-to-max targets, tuning perceived difficulty, designing death/loss penalties, coupling power to content, designing PvP power curves or co-op progression.
> **References**: `.unikit/memory/gamedesign/core/references/progression-reinforcement-schedules.md` (reinforcement-schedule catalog).

---

## Progression Axes

Name which axis a system advances — they feel different and fail differently:

| Axis | Player gains | Risk |
|---|---|---|
| Vertical (power) | raw strength: damage, HP, stats | power creep; trivializes old content |
| Horizontal (breadth) | new options, not more power | option overload; shallow choices |
| Cosmetic | expression, status | none mechanically — pure Expression payoff |
| Mastery / knowledge | the player gets better, the avatar doesn't | invisible to telemetry; hard to pace |

- Most games blend axes; **state the mix per pillar**. A purely vertical game
  eventually fights its own content difficulty (hand the coupling to the balance rule).
- Horizontal unlocks must be **real choices** — a strictly-better option is vertical
  progression wearing a horizontal costume (a dominant strategy; balance territory).
- Each axis traces to an intrinsic motivator (agency→power, mastery→skill,
  curiosity→knowledge, closure→completion, expression→cosmetics). The
  motivation→loop→reward map and the engagement-loop machinery live in the
  **core-loops** rule; this rule owns the *pacing* of each axis.

## Relationship Types

Distinguish the two numerical-relationship families (Schreiber & Romero, Ch 4):

- **Tradeoff** — one resource for another (5 MP → 25 HP; gold → sword; money →
  skip a timer).
- **Progression** — spend a resource (usually time) for forward movement
  ("level 1 → 100"). Progression is a special tradeoff: time → progress.

**Numbers are relational, not absolute.** A value means nothing alone: 250 damage
is "a nice hit" vs 25 HP and "a tragic fumble" vs 25,000 HP. Beware the doubling
trap — doubling a sword's cost *and* all income changes the appearance but not the
felt cost. **Rule of 2** (Sid Meier): when unsure how to retune a number, double or
halve it — drastic moves reveal a value's effect faster than repeated 10% nudges.

## XP Curves & Thresholds

The XP curve is the **time-shape** of progression. Pick a shape deliberately by its
feel (Schreiber & Romero, Ch 4):

| Curve | Formula | Feel / use |
|---|---|---|
| Identity | `y = x` | two resources 1:1 — a tradeoff dial; if freely convertible, consider merging them into one resource |
| Linear | `y = m·x` | constant rate (identity is the `m=1` case); cost-per-point pricing; flattens late |
| Polynomial | `base · level^k` | accelerating; classic RPG, early-fast/late-grind |
| Triangular | `n(n+1)/2` = `(x²−x)/2` (1,3,6,10,15,21…) | between linear and exponential, **player-readable**; common board-game/XP ladder; the default gentle ramp |
| Exponential | `base · m^level` (e.g. `100·2^L`) | start slow, explode late; prestige/idle, doublers — destabilizing unless duration/cost-limited |
| Logarithmic | `y = log_b x` | harsh diminishing returns; the inverse view of XP→level (exponential XP ⇒ logarithmic level-from-XP) |
| Custom / cost-obfuscation | hand-authored table | per-band control; rounded to memorable zeros, or an exponential that switches base mid-curve to tame the tail |

- **Derive thresholds from a time budget, not a pretty formula.** Decide "level 10
  by end of session 1, level 50 by week 4", convert to an XP-per-hour faucet
  estimate (from the economy ledger), then solve the curve to hit the bands.
- **Cost obfuscation in practice:** a base-2 XP table hits 26.2M at L20; switching
  to base-1.5 at L13 lands L20 at 2.6M — same early ramp, far gentler tail. Round
  thresholds to trailing zeros so players can remember them. (When this hides a
  real-money cost rather than serving pacing, it crosses into a dark pattern — see
  monetization-ethics.)
- State **cumulative vs per-level** explicitly — a tenfold difference in reading.
- Every curve obeys the formula contract (FORM-id, variable table, output range,
  worked example).

## Time-to-Max, Velocity & Pacing Budgets

- Set an explicit **time-to-max** (or time-to-soft-cap) budget; it is a hard
  commitment constraining the whole curve and the faucet rates.
- **Velocity *and* acceleration drive quit decisions.** Don't just set the *rate* of
  progress (velocity) — its *change* (acceleration) is what players feel. A player
  progressing slowly but *accelerating* stays; one progressing fast but
  *decelerating* shops for another loop. Common shapes: linear; exponential
  (positive feedback, Catan); fast-then-slowing (RPG/idle — early dopamine, then
  stretch content once hooked); saw-tooth (tension/release); irregular. No universal
  "correct" rate — choose per beat.
- Pace the **introduction of new verbs/systems**, not just numbers — five systems in
  session one churns; nothing new for ten hours churns differently. Map the unlock
  schedule against sessions.
- **The elder game (post-cap transition).** A maxed player with nothing left is a
  retention cliff — but the *transition itself* causes churn: an abrupt switch from
  "progress" to "express/compete/coordinate" loses progression-lovers. Design the
  cap→elder handoff as a first-class beat: soften it, extend the pre-elder game
  (cap-raising expansions, alt builds), or make elder activities compelling (raids,
  arenas, guild leadership, live events; idle-prestige resets that grant stackable
  multipliers). FOMO-free — see liveops.

## Friction & Perceived Progression

Players perceive difficulty against their *current trajectory* and assume progress
is linear (Schreiber & Romero, Ch 11):

- Friction has four phases — **Discovery → Learning → Mastery → Fluency**. During
  Learning and early Mastery players feel near-constant friction and "I'll never get
  past this" even when about to break through. Front-load challenge into Discovery
  and Mastery, **shorten the Learning phase**, and show an honest progress bar where
  possible. Fluency carries ~zero residual friction for a key/lock but small
  residual for a deep system (skill never fully automates).

**The four elements of perceived difficulty** — one *felt* signal, four *design
knobs*; perceived challenge ≈ `(Cv + Cs) − (Pv + Ps)`:

| Knob | Symbol | What it is |
|---|---|---|
| Player skill | Ps | the human's real decision-making ability |
| Virtual skill | Pv | the avatar's power (HP, damage) |
| Virtual challenge | Cv | enemy raw power / count (no smarter, just more) |
| Skill challenge | Cs | demands new tactics (smarter AI, new puzzle types) |

- With Cv, Cs, Pv flat, perceived challenge still **falls** over time because Ps
  rises — a static game must add difficulty just to hold a constant feel.
- Grind is **not** difficulty: "a tedious task is not difficult, merely
  time-consuming." Don't confuse a time-sink with a challenge.

## Unlock Pacing & Gating

- **Drip new mechanics** so each gets a teaching beat (FTUE method → ux-onboarding)
  before the next arrives.
- **Shape the player-skill curve deliberately.** To *accelerate* mastery use the
  3-stage teach pattern: (1) safe sandbox for a new toy, (2) easy area to exercise
  it, (3) hard area forcing integration with prior skills. To *slow* it, use
  skill-gating (progressively harder challenges with no teaching — guarantees
  readiness, but slow and unfriendly). Give a strong toy early so the player enjoys
  it (gravity gun, portal gun) — then provide combination *depth* or shorten the
  game to avoid power stagnation.
- Gate types and their honesty:

  | Gate | Unlocks on | Note |
  |---|---|---|
  | Level / XP | accumulated play | pure time/skill; fair |
  | Quest / story | reaching a beat | paces with narrative |
  | Skill / mastery | demonstrated ability | rewards competence |
  | Paywall | payment | a monetization decision — flag in review |

- **Never gate core fun behind grind or payment**; gate *breadth and depth*, never
  the core verb. **Honesty litmus:** grind is acceptable *only* if the core loop is
  already fun ("more of a good thing isn't punishment"). Using progression rewards
  or loss-threats to paper over weak gameplay holds players hostage — they leave
  bitter, not awaiting the sequel. Ask: does this system *deepen* engagement with
  the best systems, or *gate access* to them?
- **Juiciness** amplifies *perceived* gain: reserve the juiciest feedback (fanfare,
  particles, screen-shake) for the rarest milestones; a deliberate absence reads as
  anticlimax. (Reward *cadence* — variable schedules, diminishing magnitude,
  interleaving reward types — is owned by core-loops.)

## Reinforcement Schedules (Zubek)

A reinforcement schedule is the rule for *when* a reward arrives — an
operant-conditioning lever Zubek (*Elements of Game Design*, Ch 5) applies to
progression reward delivery. The headline that variable schedules out-pull fixed
ones is owned by the core-loops "Reward Cadence" and player-motivation "Fulfillment
vs Compulsion" sections; this rule owns the *full taxonomy* and its use in pacing a
progression curve. Key takeaways:

- **Variable ratio is the default** — highest response rate *and* highest resistance
  to extinction; nearly every progression reward (loot, XP-per-kill) uses it. Layer
  several (Diablo stacks four) to reward varied behaviour across activities.
- **Workload change is how a level curve motivates.** A reinforced behaviour becomes
  the base for *more* work at the same reward — the XP-per-level ramp (the XP Curves
  section above) is that same mechanism seen as a schedule: the player must work
  harder, or "smarter" (better gear, richer targets), for each level. Tune the ramp
  so it reads as aspiration, not a grind wall.
- A schedule with **no felt payoff** is the compulsion trap — screen any reward
  structure against the fulfillment test in the player-motivation rule.

**Lookup workflow:** open
`references/progression-reinforcement-schedules.md` for the full five-schedule
comparison (response rate × resistance to extinction × behaviour), the Diablo
four-stacked-schedule worked example, and the Diablo III XP-curve numbers. Keep
conceptual guidance here; the catalog lives in the reference.

## Regression & Loss

Loss of earned progress is emotionally heavier than equivalent gains (loss
aversion); tune the *feel* of risk on two axes — extent of loss × probability of
loss (Schreiber & Romero, Ch 11):

| | Low loss-probability | High loss-probability |
|---|---|---|
| **High penalty** | Punishing — cautious, weighty play (easy permadeath) | Ruthless — Nethack: ~50 h flawless run; few legit wins |
| **Low penalty** | Casual — proceed without anxiety | Masocore — Super Meat Boy: die constantly, ~30 s setback, reckless retry |

- Velocity can be **negative** (death/regression). D&D level-drain was feared more
  than a dragon because lost *levels* = weeks of progress vs a death you resurrect from.
- If progress is permadeath-only, unlock **meta** progress (new characters/options)
  to carry forward, or the loop feels futile.

## Power vs Content Coupling

- Progression's structural side; the **curve math** (player-power vs
  content-difficulty curves, TTK/TTC, the felt-challenge gap) is owned by the
  balance rule. This rule decides *what unlocks when*; balance decides *how strong*.
- The two must stay coupled: content outrunning power → walls; power outrunning
  content → trivialization. Document both curves and their intended gap.
- **Power isn't linear in cost when effects are quantized.** Price on *breakpoints*,
  not raw magnitude: vs 4-HP enemies, 3→4 damage (one-shots) is worth far more than
  2→3 (still two hits) or 4→5 (no fewer hits). (Cost ladder 1/2/2.5/4/4.5… — mostly
  linear with a flat spot and a jump at the breakpoint.)

## Skill Trees & Build Diversity

- **Orthogonality**: nodes should open *different* play, not stack the same number.
  Parallel "+5% damage" nodes are pacing filler, not a build.
- **Trap nodes** (look good, aren't) punish the players least able to evaluate them
  — avoid or signpost. Hidden dominant nodes collapse build diversity (balance-rule
  dominant-strategy check).
- **Respec policy** is a design statement: free respec encourages experimentation;
  costly/locked respec raises commitment stakes — choose for the pillars.

## Co-op Progression Pitfalls

- **The commander / alpha-player problem.** In co-op PvE, one expert can hijack
  everyone's decisions and reduce the game to solitaire. It needs shared/perfect
  information + a skill gap — break either: real-time pressure (no time to play
  others' turns), privileged/hidden information (Hanabi's reversed hands),
  restricted communication (Magic Maze's "Do Something" pawn), a hidden traitor
  (info-sharing now has a cost), or cultural framing ("superheroes don't ask
  permission").

## Adaptive Difficulty & PvP Flow

- Where progression meets difficulty, **active DDA** (player-chosen risk/pace) is
  preferred over silent rubber-banding (flow/DDA theory → frameworks rule). DDA is a
  *negative feedback loop* that punishes doing well; players who reverse-engineer it
  will **deliberately sandbag** to bank catch-up bonuses and rush a late win.
- Prefer **player-controlled DDA**: flOw (dive deeper / back off anytime), God of
  War (offers lower difficulty after repeated deaths), Pirates! (raise difficulty
  for higher reward %), Bastion/Transistor (toggle specific hardeners for bonus
  XP/gold). If difficulty adapts, **say so**; if the AI cheats at the top tier, name
  it ("Insane"). Rotate fresh playtesters — returning testers become experts and
  misjudge novice difficulty.
- **Difficulty appropriateness = audience expectation, not 50/50.** Masocore
  expects frequent failure; casual may make loss impossible; co-op power-fantasy
  should be weighted in the player's favor (illusion of a hard fight, then a win).
- **PvP flow is matchmaking, not content tuning.** You generally *want* the better
  player to win, so you can't keep both in flow by tuning content. The PvE
  difficulty-slider equivalent is a **voluntary handicap** (players expect fairness
  by default) and, at scale, a **rating + matchmaking** system pairing similar
  skill — the real source of flow and uncertain matches. Distinguish a *fair* game
  (most-skilled wins) from an *even* game (each has an equal chance).

## PvP Progression & Power Curves

Classify a PvP economy by **sum** (does total player power rise/fall/stay) and by
dominant **feedback loop**, then read off the power-curve shape and game-length risk
(Schreiber & Romero, Ch 12). Positive feedback is usually opponent-independent
(rewards absolute power, snowballs, hits hardest early); negative feedback is
opponent-dependent (catch-up, hits hardest late):

| | Positive feedback | Negative feedback |
|---|---|---|
| **Positive-sum** | leader extends lead → win (4X/Civ; hide standings to avoid futility) | "braid": leader throttled, trailer boosted; exciting end (Catan trading; kart rubber-band) |
| **Zero-sum** | early lead → quick win; only for *short* games | swings pull the leader back; **stalemate** risk — needs a time/turn cap. Combo (neg early + pos late) = back-and-forth then a decisive finish |
| **Negative-sum** | losing player spirals down faster (Chess-ish; demoralizing) | "race to the bottom" braid |

- **Game-length levers:** a hard turn/time cap (sometimes lazy), or tune sum-ness +
  feedback strength so the win point ≈ the end point. Design distinct early/mid/end
  **phases**; let players partially control phase length (Netrunner) for depth.
- **Coordination pathologies** — each needs a 3-condition chain you can break:
  - *Kill-the-leader / sandbagging* — needs a *visible* leader + belief that
    attacking is best + ability to coordinate. Break via hidden scoring, multiple
    victory paths, alt targets, or a leader-defense bonus (Risk: territory/continent
    bonuses + capture-cards reward the otherwise-bad attack). If leading is punished,
    optimal play is to idle in 2nd (sandbagging).
  - *Kingmaking* — a player who can't win decides who does; break via hidden
    standings or removing transferable support.
  - *Turtling* — passivity dominates; add incentives/pressure to act.
- **Player elimination** = a bored player waiting. Mitigate: disincentivize
  elimination, switch the win to VP, end on the *first* elimination (best standing
  wins), or make elimination fun (eliminated player becomes NPCs/monsters or keeps
  tasks/chat, à la Among Us).
- **Balancing asymmetry** — symmetric is far easier; map asymmetric factions onto a
  *shared cost curve / shared core stats* (StarCraft factions share unit HP/damage
  and the objective), add **intransitive counters** so no side is uncounterable, and
  lean harder on playtesting/analytics the more asymmetric (less math-comparable)
  the sides are.

## Anti-patterns

- An XP curve chosen for its formula, then time-to-max discovered after the fact.
- Cumulative vs per-level left ambiguous in the threshold table.
- Tuning the wrong difficulty knob — cranking enemy HP (Cv) when the wall is a skill
  wall (Cs), because the four elements were collapsed into "make it harder".
- A long Learning phase that makes a winnable challenge *feel* unwinnable, with no
  progress indicator.
- A skill tree of parallel stat bumps marketed as "build diversity".
- Trap nodes that punish new players for not knowing the meta.
- Gating the core verb behind grind or a paywall; progression-as-gate over a broken
  core loop.
- Power and content curves tuned independently — walls and trivializations.
- A maxed player with no headroom, or an abrupt cap→elder transition — the retention
  cliff left undesigned.
- Silent rubber-banding presented as fair vertical progression (and the sandbagging
  it breeds when players reverse-engineer it).
- Permadeath-only progress with no meta-unlocks to carry forward — feels futile.
- A reward schedule with high response rate but no felt payoff — a compulsion trap
  (escalating workload on a level curve that reads as a grind wall, not aspiration).
- Sum/feedback mismatched to game length — zero-sum + strong negative feedback →
  unwinnable stalemate; zero-sum + positive feedback in a long game → demoralizing
  early blowout.
- Symmetric-illusion asymmetry — asymmetric sides off a shared cost curve and
  lacking intransitive counters → an uncounterable dominant faction.
- Early player elimination with a long tail; kingmaking; kill-the-leader overshoot.

## Source Map

| Source | Used for |
|--------|----------|
| Schreiber & Romero, *Game Balance* (CRC Press, 2021), Ch 4 "Components of Progression — Curves" | Relationship types; numbers-are-relational + Rule of 2; curve-type taxonomy (triangular formula, cost-obfuscation); breakpoint costing |
| — Ch 11 "Progression in PvE Games" | Friction phases (actual vs perceived); four elements of perceived difficulty; velocity & acceleration; regression & loss matrix; 3-stage teaching / skill-gating; the elder game; commander problem; artificial-gating honesty; difficulty appropriateness + player-controlled DDA; juiciness |
| — Ch 12 "Progression in PvP Games" | Sum × feedback matrix & power-curve archetypes; game length & phases; PvP flow (fair vs even); kill-the-leader/sandbagging/kingmaking/turtling; player elimination; balancing asymmetry |
| Robert Zubek, *Elements of Game Design* (MIT Press, 2020; Russian translation), Ch 5 | Reinforcement Schedules — the five-schedule taxonomy (response rate × resistance to extinction × behaviour), variable-ratio as the default, the Diablo four-stacked-schedule worked example, and the workload-change / level-curve mechanism with the Diablo III XP numbers (extracted to `references/progression-reinforcement-schedules.md`) |
