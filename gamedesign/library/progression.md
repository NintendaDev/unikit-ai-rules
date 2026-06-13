---
version: 1.0.0
---

# Progression

> **Scope**: Progression architecture — progression axes (vertical power, horizontal breadth, cosmetic, mastery), XP curve formula families and threshold derivation, time-to-max and pacing budgets, unlock pacing and gating, power-vs-content coupling, skill-tree and build-diversity design, and the bounds of adaptive difficulty.
> **Load when**: designing levels/XP, writing progression formulas, pacing unlocks, designing skill trees or talent systems, setting time-to-max targets, coupling power growth to content difficulty, preparing the progression section pack.

---

## Progression Axes

Name which axis a system advances — they feel different and fail differently:

| Axis | Player gains | Risk |
|---|---|---|
| Vertical (power) | raw strength: damage, HP, stats | power creep; trivializes old content |
| Horizontal (breadth) | new options, not more power | option overload; shallow choices |
| Cosmetic | expression, status | none mechanically — pure Expression payoff |
| Mastery / knowledge | the player gets better, the avatar doesn't | invisible to telemetry; hard to pace |

- Most games blend axes; **state the mix per pillar**. A game whose only
  progression is vertical eventually fights its own content difficulty (hand the
  curve coupling to the balance rule).
- Horizontal unlocks must be **real choices** — if a new option is strictly
  better, it is vertical progression wearing a horizontal costume (a dominant
  strategy; balance-rule territory).

## XP Curves & Thresholds

The XP curve is the **time-shape** of progression. Pick a family deliberately
(gamedeveloper.com — quantitative XP design):

| Family | Per-level cost | Feel |
|---|---|---|
| Linear | constant | steady, predictable; flattens late |
| Polynomial (e.g. `base · level^k`) | accelerating | classic RPG; early-fast, late-grind |
| Exponential | sharply accelerating | prestige/idle; needs faucet scaling |
| Piecewise / tuned table | authored per band | full control; most tuning effort |

- **Derive thresholds from a time budget, not from a pretty formula.** Decide
  "level 10 by end of session 1, level 50 by week 4", convert to an XP-per-hour
  faucet estimate (from the economy ledger), then solve the curve to hit the
  bands. Numbers serve the pacing target — never forward from a cool exponent.
- State **cumulative vs per-level** explicitly — a tenfold difference in reading.
- Every curve obeys the formula contract (FORM-id, variable table, output range,
  worked example) — section D.

## Time-to-Max & Pacing Budgets

- Set an explicit **time-to-max** (or time-to-soft-cap) budget; it is a hard
  design commitment that constrains the whole curve and the faucet rates.
- Pace the **introduction of new verbs/systems**, not just numbers — a player
  flooded with five systems in session one churns; a player handed nothing new
  for ten hours churns differently. Map the unlock schedule against sessions.
- Reserve **headroom**: a maxed player with nothing left is a retention cliff;
  prestige, mastery, or horizontal breadth extends the tail honestly (FOMO-free —
  see liveops).

## Unlock Pacing & Gating

- **Drip new mechanics** so each gets a teaching beat (onboarding overlap — defer
  the FTUE method to the ux-onboarding rule) before the next arrives.
- Gate types and their honesty:

  | Gate | Unlocks on | Note |
  |---|---|---|
  | Level / XP | accumulated play | pure time/skill; fair |
  | Quest / story | reaching a beat | paces with narrative |
  | Skill / mastery | demonstrated ability | rewards competence |
  | Paywall | payment | a monetization decision — flag in review |

- A gate that blocks **core fun** behind grind or payment is a Major+ review
  finding; gate *breadth and depth*, never the core verb.

## Power vs Content Coupling

- Progression's structural side; the **curve math** (player-power vs
  content-difficulty curves, TTK/TTC, the felt-challenge gap) is owned by the
  balance rule. This rule decides *what unlocks when*; balance decides *how strong*.
- The two must stay coupled: if content difficulty outruns the power curve →
  walls; if power outruns content → the game trivializes. Document both curves
  and their intended gap in section D.

## Skill Trees & Build Diversity

- **Orthogonality**: nodes should open *different* play, not stack the same
  number. Parallel "+5% damage" nodes are a pacing filler, not a build.
- **Trap nodes** (options that look good and aren't) punish the players least able
  to evaluate them — avoid, or signpost. Hidden dominant nodes collapse build
  diversity (balance-rule dominant-strategy check).
- **Respec policy** is a design statement: free respec encourages experimentation;
  costly/locked respec raises commitment stakes — choose for the pillars, not by
  default.

## Adaptive Difficulty Bounds

- Where progression meets difficulty, **active DDA** (player-chosen risk/pace) is
  preferred over silent rubber-banding (the flow/DDA theory is owned by the
  frameworks rule). Zohaib's DDA survey: hidden adjustment that players notice
  breaks trust and cheapens earned progress.
- If difficulty adapts, **say so** in section J/G and make the adaptation legible
  or opt-in — secret rubber-banding invalidates the vertical axis it rides on.

## Anti-patterns

- An XP curve chosen for its formula, then time-to-max discovered after the fact.
- Cumulative vs per-level left ambiguous in the threshold table.
- A skill tree of parallel stat bumps marketed as "build diversity".
- Trap nodes that punish new players for not knowing the meta.
- Gating the core verb behind grind or a paywall.
- Power and content curves tuned independently — walls and trivializations.
- A maxed player with no headroom — the retention cliff left undesigned.
- Silent rubber-banding presented as a fair vertical progression.
