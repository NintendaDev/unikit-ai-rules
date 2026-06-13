---
version: 1.0.0
---

# Game Balance

> **Scope**: Systemic balance method — cost curves for transitive systems, payoff matrices and mixed strategies for intransitive (RPS) systems, power and difficulty curves, TTK/TTC pacing targets, tuning-knob discipline (feel/curve/gate), dominant-strategy and feedback-loop diagnostics.
> **Load when**: designing or tuning numeric systems, writing formulas or stat tables, pricing objects (units, items, upgrades), checking for dominant strategies or power creep, defining tuning knobs, planning difficulty or progression curves.

---

## What Balance Is For

Balance serves the intended experience, not numeric symmetry for its own sake
(Schreiber & Romero):

- **Viable diversity** — multiple strategies and options stay worth choosing.
- **Fairness** — outcomes track decisions and skill (symmetric games), or all
  sides have comparable winning chances from unequal positions (asymmetric).
- **Progression feel** — growth is felt without trivializing the challenge.

Perfectly flat balance is a non-goal: texture (situational strengths, soft
counters) is what creates decisions. The enemy is *strictly* dominant and dead
options, not asymmetry.

## Transitive Systems: Cost Curves (Schreiber)

In transitive systems some objects are simply better — and must cost more. The
instrument is the **cost curve**: the sanctioned relation between total cost
and total benefit.

1. Express **costs** in a common currency: resource price, opportunity cost,
   situational drawbacks, setup requirements.
2. Express **benefits** in the same currency: primary effect plus
   probability-weighted situational bonuses ("+50% damage at night" ≈ +25% if
   night is half the time — estimate, write the estimate down, revisit with
   telemetry).
3. Pick an **anchor object** the curve passes through; place every other object
   ON the curve relative to the anchor.
4. Deviations are findings: above the curve → strictly better (a dominant pick
   today, power creep tomorrow); below → a dead or trap option.

- The curve need not be linear — diminishing or accelerating returns are
  legitimate curve *shapes*, chosen and documented, never accidents.

## Intransitive Systems: RPS Math (Schreiber)

When no single best answer should exist, build intransitive relations: A beats
B beats C beats A.

- Express matchups as a **payoff matrix** and solve for the **mixed-strategy
  equilibrium** (each option's expected payoff equal against the equilibrium
  mix). Asymmetric payoffs shift usage away from uniform thirds — a cheap
  counter played often and an expensive counter played rarely are both correct.
- Intransitivity is what creates a **metagame**: shifting popularity rotates
  the effective best pick. That is a feature if you want one — and a tuning
  burden always: the document needs the matchup matrix, not flavor text.
- Prefer **soft counters** (advantage) over hard counters (auto-win): hard
  counters move the decision to select/draft time and turn play into a coin
  flip.

## Power Curves, TTK / TTC

- Maintain two explicit curves: **player power growth** and **content
  difficulty**; their gap is the felt challenge over time. Express both as
  formulas or tables — not vibes.
- **TTK/TTC** (time-to-kill / time-to-clear) are the primary pacing metrics for
  combat-likes: set target bands per enemy/content tier (e.g., fodder 2–4 s,
  elite 15–25 s), then **derive stats backward from the bands**. Numbers exist
  to hit experience targets — never forward from "cool" stat values.
- Every formula follows the formula contract: named expression, variable table
  (type, range, meaning), output range (clamped or not, and why), and a worked
  example with concrete values.

## Tuning Knobs

Categorize every knob — the category states its blast radius:

| Category | What it tunes | Blast radius / when safe |
|---|---|---|
| `feel` | juice, timing, response envelopes | local; safe to tune late |
| `curve` | cost/power curve parameters, rates | systemic; re-run the curve math after any change |
| `gate` | unlock thresholds, pacing gates | structural; reshapes progression — re-check the meta loop |

- Each knob: name, category, range, default, expected impact.
- Tune one knob at a time against a stated target metric; after a `curve`
  change, re-anchor the whole curve instead of patching individual outliers.

## Degenerate Strategies & Feedback Loops

- **Dominant-strategy test** (the Sirlin check): at each major
  decision point, is there a choice that is correct regardless of context? If
  yes, the decision is dead.
- **Positive feedback** (winning → more winning) accelerates games and
  snowballs; add dampeners deliberately: diminishing returns, escalating costs,
  catch-up mechanics. **Negative feedback** stabilizes but can punish skill —
  placement matters: rubber-band resources, not the player's hands.
- Watch the classic failure modes: kingmaking (a loser decides the winner),
  turtling (passivity dominates), grinding substituting for decisions.

## Anti-patterns

- Tuning by feel with no cost curve — every buff request becomes a negotiation.
- Power creep as content strategy: new objects priced above the curve "for
  excitement".
- Nerfing the fun outlier into the floor instead of re-examining the curve it
  deviates from.
- Balancing objects in isolation, ignoring synergies and probability-weighted
  situational value.
- Chasing uniform 50% winrates or pick rates as the only success metric.
- Tuning several knobs at once — no attribution, no learning.
- Hard counters everywhere: the draft screen decides the match, play doesn't.
