---
version: 1.0.0
---

# Game Balance

> **Scope**: Systemic balance method — kinds of balance and how to verify them (including Schell's twelve named axes of balance), possibility-space levers (determinism, information, symmetry, solvability), cost curves and anchors for transitive systems, payoff matrices and mixed strategies for intransitive (RPS) systems, triangularity (safe-vs-risky choices), probability and expected-value tooling, situational and shadow costs, character-build viability, power/difficulty curves with TTK/TTC, luck-vs-skill design, DDA and AI fairness, tuning-knob discipline and the doubling/halving method, perfect imbalance, dominant-strategy/feedback diagnostics, Sylvester's depth-vs-complexity (elegance) lens on balance, his degenerate-strategy framing, his experience-first balancing stance (balance strategies-in-situations, not tools; cut rather than patch; build a systems mental model from playtests), and the simulation-harness method plus staged production-timeline balancing cadence (Zubek).
> **Load when**: designing or tuning numeric systems, writing formulas or stat tables, pricing objects (units, items, upgrades, classes), solving rock-paper-scissors or asymmetric matchups, balancing character builds, auditing dominant or degenerate strategies or power creep, setting difficulty/DDA or AI behaviour, defining tuning knobs, choosing the skill-vs-chance mix, estimating probabilities or expected values, planning difficulty or progression curves, deciding which of the twelve balance axes a problem belongs to, judging whether a new option adds depth or just complexity, deciding which skill tier to balance for, choosing a balancing method or staging balance across production, or choosing between patching a number and cutting a feature.
> **References**: `.unikit/memory/gamedesign/core/references/balance-schell-twelve-types.md` (Schell's twelve-type pre-tuning audit checklist), `.unikit/memory/gamedesign/core/references/balance-probability-ev.md` (probability & expected-value math toolkit with worked tables).

---

## What Balance Is For

Balance serves the intended experience, not numeric symmetry for its own sake
(Schreiber & Romero):

- **Viable diversity** — multiple strategies and options stay worth choosing.
- **Fairness** — outcomes track decisions and skill (symmetric games), or all
  sides have comparable winning chances from unequal positions (asymmetric).
- **Progression feel** — growth is felt without trivializing the challenge.

Perfectly flat balance is a non-goal: texture (situational strengths, soft
counters) is what creates decisions. A perfectly balanced game is also
**solvable** and goes rote — players conclude their choices don't matter. The
enemy is *strictly* dominant and dead options, not asymmetry.

- **Fairness is expectation-relative.** Balance exists to deliver fairness *as
  the player expects it*. Deliberate imbalance works when signalled up front
  (asymmetric-faction games, party games like *The Great Dalmuti*) and fails when
  discovered mid-play after a fair fight was expected. Asymmetric-but-fair design
  works by making **everyone overpowered** so skill decides (*Civ Revolution*:
  every faction looks unbeatable, so none is).
- **Numbers aren't always balance.** A scoring or reward system can be re-tuned
  freely without touching balance — it only changes *which play is emphasized*.
  Single-player / narrative games tolerate far more imbalance than symmetric PvP.
- **Priced peaks are a feature.** Deliberate, *bounded* deviations from the cost
  curve give players something to hunt and fuel the metagame (see Perfect
  Imbalance under Intransitive Systems). They must be chosen and priced, never
  accidental power creep.

## Depth vs Complexity — Elegance as a Balance Goal (Sylvester)

Sylvester reframes the whole balance brief as an efficiency problem. Every
mechanic has a **cost** — mostly the player's *attention* (rules they must learn,
hold, and apply) plus dev/runtime cost. Players pay that cost only to buy
experience. So the design target is **maximum depth per unit of complexity**:

- **Depth** = the volume of *meaningful decisions* (and learnable nuance) a
  system keeps generating — how long a player can keep discovering and improving.
  Chess, poker, StarCraft are deep: you can study them for decades and still
  learn. Tic-tac-toe is shallow: once solved, nothing remains.
- **Complexity** = the rules the player must hold in their head to play at all.
- **Elegance** = high depth from low complexity. A balanced system should be
  *small, simple, focused* — the opposite of "add another viable option." Depth
  comes from mechanics that **interact** (multiply, not add): the more *other*
  mechanics a tool touches, the deeper the possibility space per rule.

This is the lever behind "more isn't deeper" (see Degenerate Strategies below):
adding options raises complexity for free, but only adds depth if it opens
genuinely new strategies. Sylvester's heuristics for sensing elegance before a
mechanic is even built ("the smell of elegance"):

| Smell test | Elegant if… | Bloat if… |
|---|---|---|
| Interaction count | touches many other mechanics | touches one or two |
| Multi-use | usable offensively/defensively/tactically/strategically | one fixed function |
| Distinct role | opens a play-style no existing tool does | duplicates an existing role |
| Reuse / repeatability | replayed thousands of times, fresh each time | a one-shot trick (1:1 cost-to-payoff) |
| Familiar interface | reuses conventions players already know | invents new norms without a reason |
| No content constraint | works with existing content | forces every level/asset to be reshaped around it |

> **Worked depth-vs-complexity comparison (StarCraft II — Reaper vs Hellion).**
> Two fast, mid-cost area-damage skirmishers, *same complexity* (equally simple to
> learn and implement). Only the Hellion shipped — because depth-per-rule is far
> higher.

| Stat | Reaper | Hellion | Why it matters |
|---|---|---|---|
| Attack shape | circular splash around self | long narrow line | line attack interacts with terrain, geometry, ally positions |
| Attack delay | ~1 s (constant fire) | ~2.5 s (gaps between shots) | gaps enable hit-and-run micro; constant fire forbids it |
| Range / synergy | short; little ally/cover synergy | ranged; hides behind walls/units, knocks enemies off ledges | more interactions → more situations |

The Reaper plays out one way every fight — *shallow*. The Hellion's identical
rule-count yields kiting, line-up baiting, cover play, and ledge control —
*deep*. Elegance is not flashy; the Hellion looks duller. Balance for depth, not
for surface appeal.

**Depth has a ceiling and a floor; balance the whole range.**

- **Skill ceiling** = the skill level above which results stop improving (the game
  is "solved" for that player and goes rote). A game whose ceiling sits beyond
  human reach is *infinitely deep* (Chess; *Modern Warfare*'s lethal aim). Lower
  ceilings (Assassin's Creed's animation-locked combat) are fine for narrative
  games — depth was traded for art/story on purpose.
- **Skill floor / accessibility** = the minimum skill below which the game is
  unplayable. Designers chronically under-weigh it because they no longer feel it.
- **Skill range** = floor → ceiling. *Wide* range (easy to learn, hard to master)
  is the prize, and the **best way to widen it is elegance** — squeeze maximum
  depth from each mechanic, then layer **nested skills** that unlock as earlier
  ones become automatic (mechanical → situational → intellectual / yomi). One
  simple skill can't stretch far; a game stays deep by having a game inside the
  game inside the game.

## Kinds of Balance & How to Verify

Name *which* balance you mean before tuning — they fail differently (Schreiber &
Romero, Ch 1):

| Kind | Question | Fails as |
|---|---|---|
| Mathematical | are object costs/benefits priced consistently? | dominant picks, dead options |
| Difficulty | is the challenge curve right for the audience? | walls or trivialization |
| Progression | is growth paced to the time budget? | grind or burnout (→ progression rule) |
| Initial conditions | are starting positions fair/comparable? | decided-at-setup matches |
| Between strategies | are multiple lines viable? | one-strategy meta |
| Between objects | are peers interchangeable in value? | god/dump items |
| Fairness | does the result track skill/decisions? | feels-cheated losses |

**How to know if it is balanced** — no single test; combine four methods and
match the *mix* to genre and project phase:

| Method | Best for | Note |
|---|---|---|
| Designer experience / intuition | unique-mechanic action/art games | objects that resist spreadsheet comparison (a gravity gun) |
| Small-scale playtesting | most games, all phases | can't surface mass-scale dynamics |
| Analytics | live-service / F2P / MMO | the only way to see emergent mass behaviour (see liveops) |
| Mathematics (cost curves, matrices) | TCGs, MOBAs, stat-heavy systems | heavy up-front, then validate by playtest |

- Cloning numbers from a proven game works **only** if systems are identical and
  you understand *why* they were balanced — otherwise it imports invisible bugs.
- The success target itself is set by **audience + intent + purpose**. A masocore
  game, a kids' game, and an F2P friction game are each "balanced" to different
  win/loss feels — uniform 50% is not the universal goal.

## The Twelve Types of Balance (Schell)

The Schreiber & Romero "Kinds of Balance" taxonomy above asks "is the *math*
priced right?". Jesse Schell's **twelve types of game balance** are a wider,
qualitative checklist of **axes the designer must consciously place** — most
aren't about cost curves at all. Run the list as a **pre-tuning audit**: for each
axis decide where this game should sit and why. The axes are: (1) fairness
symmetric-vs-asymmetric, (2) challenge-vs-success flow corridor, (3) meaningful
choices, (4) skill-vs-chance, (5) head-vs-hands, (6) competition-vs-cooperation,
(7) short-vs-long session, (8) rewards, (9) punishment, (10)
freedom-vs-controlled, (11) simple-vs-complex (elegance), (12)
detail-vs-imagination. Several map onto the deeper sections of this rule.

> The full **twelve-axis checklist** — each axis with its tools and examples,
> plus the worked asymmetric-balance pass (Schell's biplane fight) — lives in
> `core/references/balance-schell-twelve-types.md`. Load it when running a
> qualitative pre-tuning audit across all twelve axes.

## Triangularity

**Triangularity** (Schell) is the design *value* of the safe-low-reward vs
risky-high-reward choice — "asymmetric risk balance" made pronounceable. The
player is one vertex, the cautious low-payoff option a second, the risky
high-payoff option the third. When ~8 of 10 "no-fun" prototypes are diagnosed,
the missing ingredient is this choice. It is the *framing* behind the intransitive
payoff math below (which handles A>B>C>A loops); triangularity is the simpler,
ever-present "play it safe or go for the jackpot?" tension. Add it to any flat
loop and it comes alive — Space Invaders is mindless shooting *until* the rare,
hard-to-hit, dangerous-to-chase UFO worth 100–300 pts appears.

Balance triangularity by holding **expected value** roughly constant across the
safe and risky options (use the EV tooling below):

| Qix rectangle | Hit chance | Points if drawn | EV |
|---|---|---|---|
| Fast (blue), normal danger | 20% | 100 | 20 |
| Slow (orange), 2× danger / 2× area | 10% | **200** (to hold EV) | 20 |

The slow rectangle is twice as risky, so it must pay twice as much to keep the
choice live. (Mario Kart is wall-to-wall triangularity: manual vs auto steering,
kart vs trick-wheelie bike, grab-the-item-box vs play-it-safe, early-throttle
boost vs false start, the dangerous fork with more boost pads.)

## Possibility-Space Levers

The "critical vocabulary" of balance is a set of levers that reshape the
*possibility space* and dictate how you analyze it (Schreiber & Romero, Ch 2):

- **Determinism vs randomness** — adding randomness widens the possibility space
  cheaply: one die roll (`1–7 damage`) replaces six hand-written special cases.
  Use it to add variety without rules bloat; remove it to make play readable.
- **Symmetry** — symmetric games are mathematically auto-fair, but still need
  progression/pacing balance and remain exploit-vulnerable. "Make it symmetric"
  is not a balance fix.
- **Information** — perfect vs hidden vs imperfect information changes what skill
  means (see Luck & Skill). Hidden adjustment only "feels fair" because it is
  imperceptible.
- **Intransitivity** — enlarges the *perceived* possibility space (more
  interesting choices) even when it doesn't change the literal one.
- **Solvability gates your method** — trivially-solvable → solve directly;
  theoretically-solvable (Chess/Go) → lean on expert opinion + tournament stats;
  computationally-solvable → brute-force simulation. Non-deterministic games are
  still "solvable" as the line that wins *most often* (Blackjack basic strategy).

## Transitive Systems: Cost Curves

In transitive systems some objects are simply better — and must cost more. The
instrument is the **cost curve**: the sanctioned relation between total cost and
total benefit.

1. **Find the anchor *resource* first.** Before any object pricing, identify the
   single resource every other resource reduces to — usually the win/loss driver
   (HP in RPGs, victory points in board games). Prove each candidate reduces to
   it: Attack saves HP by cutting hits taken, Defense by cutting damage per hit,
   MP by converting to heals/prevention. Set the anchor's value by hand, then
   price everything as a net effect on it.
2. Express **costs** in a common currency: resource price, opportunity cost,
   situational drawbacks, setup requirements — and the **shadow costs** below.
3. Express **benefits** in the same currency: primary effect plus
   probability-weighted situational value. Probability-weighting is the *first
   pass*, not the answer — a conditional benefit is worth **less** than its
   probability share when consistency matters for planning, and **more** when the
   player can influence the trigger.
4. Pick an **anchor object** on the curve; place every other object ON the curve
   relative to it. Deviations are findings: above → strictly better (dominant
   today, power creep tomorrow); below → dead/trap option (unless a *deliberate*
   priced peak).

- **Keep the curve as identity; encode non-linear cost as points.** When resource
  cost scales triangularly/exponentially (gold inflates, late cards over-scale),
  convert cost to points first (`1g=1pt, 3g=2pt, 6g=3pt`) so the curve stays the
  readable identity (1 cost-point = 1 benefit-point) and above/below is visible at
  a glance. A `+4 Attack` weapon at `6 gold` = 3 cost-pts vs 4 benefit-pts = **+1
  above curve** — which a raw triangular curve would hide.
- **PvP without object costs balances to a *constant*, not zero.** For
  cost-less competitors (fighting-game characters, single-character MMOs), pick
  one you call balanced, compute `benefits − cost = e.g. +50`, then make every
  other total the same `+50` so all feel net-powerful.
- **Comparative anchor for parallel choices.** Price mutually-exclusive,
  cost-less options (classes, factions) by summing each option's stats into one
  number and balancing the sums. Sums need *not* be equal — a deficit is repaid
  by a more valuable stat, an extra ability, or a gentler curve. (Stat sums
  317/350/350 → fix the 317 by raising it, by valuing Constitution-type stats
  higher, or by compensating elsewhere.)
- **Build the spreadsheet formulaically off named input cells.** Drive every
  value from a formula referencing the anchor/rate cells; color-code the few
  hand-entered inputs (value-per-HP, improvement rate, crit premium) so one edit
  re-prices hundreds of objects. Round player-facing costs to memorable values.

**Cost-curve guidelines (hard rules):**

- A limited/situational benefit is never worth **less than 0**.
- A choice between two effects is worth **at least the more expensive** of them;
  an unused option is worth 0, never negative.
- **Solve one unknown at a time** — never first-design an object carrying two
  unpriced abilities (you learn nothing about the curve).
- **When unsure, undercost the benefit (ship it weak).** A too-weak object only
  hurts itself; a single too-strong object invalidates the whole curve.

**Power creep is partly structural.** In any expandable game, each set must be
balanced against the *best* existing objects (not the average) to feel desirable,
and a fraction always lands slightly high — the baseline ratchets up. Distinguish
this inevitable ratchet (manage and minimize it) from **deliberate
pay-to-stay-current creep** (the real anti-pattern, drives churn).

## Deriving & Auditing a Cost Curve

To recover an undocumented curve, treat each object as an equation
(`Σcosts = Σbenefits`) and solve like simultaneous equations:

- Start with single-unknown objects ("vanilla" units), or two near-identical
  objects differing in one thing, and subtract to isolate a value.
- Cross-check the derived model against community tier lists / tournament results.
  Persistent disagreement means either a hidden synergy your model misses or a
  pricing mistake.

> **Worked derivation (Magic-style).** `1 colorless mana ≈ +1 Power`;
> `Power + Toughness ≈ total mana + 2`. Costs: 1 baseline, +1/colorless, +2 first
> colored, +3 second colored, +1 at 5 mana, +2 at 7 mana. Benefits: 1/stat point,
> 1/most keywords, 2/Deathtouch, ½/Reach, −1 for Defender (a restriction). Each
> printed card becomes a check on the model.

## Situational Balance

Most objects aren't uniformly good — price the *situation*, not the headline
number (Schreiber & Romero, Ch 23):

- **Situational value = expected value, multiplier re-evaluated.**
  `EV = Σ(P(situation) × value-in-situation)`. Never assume "double damage" = 2×
  or "half damage" = 0.5×: double is worthless if you already one-shot; "half"
  against flat armor can mean *zero* and force a worse tool (net negative).

  | Object | Calc | Result |
  |---|---|---|
  | Sword, 2× vs dragons (10% of fights) | `0.90·1.0 + 0.10·2.0` | 1.1 → +10% cost |
  | Sword, 1.5× base but −250 vs trolls (5%) | `150·0.95 + (−250)·0.05` | 130 → worth +30% over a 100 plain sword |

  You can tune base value, the multiplier, **or the frequency of the situation**
  (don't place the troll-weak sword in a troll region).
- **Versatility ∝ uncertainty, inversely ∝ switch-cost.** A versatile object is
  worth more the less you know the situation, and **less** the cheaper it is to
  swap specialists. A Fire-and-Ice scroll: known opponent → 10g; unknown-until-too-late
  → 20g (= both); guess-then-rebuy → `0.5·10 + 0.5·20 = 15g`. **Switch-cost is
  itself a knob** — a 5 s weapon-swap delay can make one generalist beat a full
  specialist kit.
- **Shadow costs belong on the curve.** Price non-resource costs:
  - *Sunk cost* — prerequisite spend with no standalone value; amortize across the
    *expected* number of things it enables. (StarCraft Dragoon: Gateway 150 +
    Cybernetics 200 are sunk; 1 Dragoon really costs `475m/50g`, but build 10 and
    it amortizes to `~160m/50g` each.)
  - *Opportunity cost* — taking A forecloses B (locked tech branches, color
    commitment); never zero.
  - *Metagame cost* — a sideboard/alt slot; small and error-prone. Cost a
    situational sideboard object as if its situation occurs ~**100%** of the time
    (the player only deploys it when useful) — *not* by raw occurrence frequency.
- **Combos: price the whole, then split by standalone utility.** Balance a
  weak-alone/devastating-together pair as one comparable powerful effect (small
  discount for needing two pieces), then split the cost weighted by each piece's
  out-of-combo usefulness and drawbacks. (Lich + Mirror Universe = win; set
  combined 10 mana, split Lich 4 / Mirror 6 because Lich carries a fatal drawback.)

## Intransitive Systems: Payoff Matrices

When no single best answer should exist, build intransitive relations: A beats B
beats C beats A. Solve with a payoff matrix and a **mixed-strategy equilibrium**.

**Solving procedure:**

1. Build the payoff table.
2. **Eliminate dominated options** — if one option is ≥ another in every cell,
   delete it. (RPS-Dynamite: Dynamite dominates Paper, so delete Paper and you
   are back to plain RPS — a dead added option.)
3. Trace best-response arrows to find the intransitive **loop**; anything off the
   loop is dominated.
4. Set all viable options' expected payoffs equal (= 0 in a symmetric zero-sum
   game), add `Σp = 1`, and solve.

- **Asymmetric payoffs shift usage away from uniform thirds** — counter-intuitively.

  > **Cost-weighted RPS (Rock wins count double).** Payoffs
  > `R/P/S = [0,−1,+2; +1,0,−1; −2,+1,0]`. Solving gives **r : p : s = 1 : 2 : 1** —
  > *Paper*, not Rock, is played most, because Scissors becomes too risky so Paper
  > rarely loses. Weighting a win up makes *its counter's counter* the most-played throw.

  > **Asymmetric RPS (Player A scores 2 for a Rock win).** Solve both payoff
  > matrices in triangular form: B plays `4:5:3`, A plays `3:5:4`, and the
  > advantage `X = 1/12` — A's entire edge is **1 extra win per 12 games**. Solving
  > for `X` quantifies the imbalance directly.

- **Multiplayer raises the equation degree** — treat all opponents as one combined
  opponent; 3 players = quadratic, 4 = cubic. Past 4 players, stop and use
  playtest analytics. (3-player "Rock double" → `3:4:3`, *closer* to even than the
  2-player `1:2:1`.)
- **No unique solution is a design smell** — if solving yields a *range* (e.g.
  Scissors ∈ [1/3, 1/2]), the new option is poorly designed.
- Prefer **soft counters** (advantage) over hard counters (auto-win): hard
  counters move the decision to select/draft time and turn play into a coin flip.

**Perfect imbalance & counters all the way down** (James Portnow; David Sirlin,
Ch 16):

- **Perfect imbalance** = intentional, *bounded* (~**10–15%**) deviations from the
  cost curve. They create the game-within-a-game of finding and countering the
  current best lines, keeping the metagame churning. Three preconditions: no build
  does everything well; the curve is understood so deviations are deliberate; the
  option pool is wide enough that every line has a *soft* counter.
- You need only **3 Yomi layers** of counters in-game (dominant → counter →
  counter-counter → the 4th wraps to the original), and **2** at the committed
  metagame level. That bounds how many soft counters you must build — perfect
  imbalance without infinite complexity.

## Power, Difficulty, TTK / TTC

- Maintain two explicit curves: **player power growth** and **content
  difficulty**; their gap is the felt challenge over time. Express both as
  formulas or tables — not vibes.
- **TTK/TTC** (time-to-kill / time-to-clear) are the primary pacing metrics for
  combat-likes: set target bands per enemy/content tier (e.g., fodder 2–4 s, elite
  15–25 s), then **derive stats backward from the bands**.
- **Derive enemy power from player power, around one anchor.** Player and enemy
  power are mutually dependent — pick the anchor (usually the player at a known
  level): sum XP from enemies placed up to a point → map to level via the curve →
  that fixes expected damage dealt/taken → choreograph each encounter from "how
  many hits to kill?" and "how long to player death?". In skill-progression games
  there is no stat anchor — gate by rank/matchmaking or "you cleared the last level."
- **Hit-count before math.** Decide the *number of hits* an encounter should take,
  then derive the stats: Romero wanted the DOOM Cyberdemon dead in 2–3 hits — "it
  could have had 3 HP or 300, what mattered is the hit count."
- **Budget the content space against time.** A 10 h game with combat as 1 of 3
  pillars wanting 100 weapons + 200 monsters demands mastering ~20 creatures/h and
  10 weapons/h — provably too large; cut to fit the time.
- Every formula follows the formula contract: named expression, variable table
  (type, range, meaning), output range (clamped or not, and why), and a worked
  example with concrete values.

## Probability & Expected Value

Chance is math, not intuition — never eyeball odds (Schell, Ch 12). The operative
tool is **expected value (EV)** = the probability-weighted average payoff and the
single most important balance instrument: `EV = Σ(P(outcome) × value(outcome))`.
Hold EV roughly constant across competing options to keep choices live; let it
differ deliberately to bias play. Two cautions that recur across this rule: EV is
**situational** — weigh only the value the player can *actually use* (a 40-damage
nuke is worth `15·0.2` against a 15-HP enemy, not `40·0.2`); and humans
systematically **misjudge and avoid risk** (loss aversion / regret), so the
highest-EV option is not always the one players pick — design for *perceived*
probability too.

> The full **probability & EV math toolkit** — the probability definition and the
> de Méré error, correct OR/AND combination and the complement rule, dice
> distributions, Monte-Carlo, the worked payout-die and situational-attack EV
> tables, and the Kahneman–Tversky loss-aversion/regret data — lives in
> `core/references/balance-probability-ev.md`. Load it when computing odds,
> distributions, or expected values.

## Luck & Skill

Skill and luck are **two independent axes**, not endpoints of one line
(Schreiber & Romero, Ch 19):

| | Low luck | High luck |
|---|---|---|
| **High skill** | Chess, Go | Poker |
| **Low skill** | Tic-Tac-Toe | Candyland, coin-flip |

- Luck converts into *skill* only when the player is rewarded for **predicting and
  responding** to the randomness (Poker: bet/fold after seeing odds). If the
  optimal response is a memorizable lookup (Blackjack basic strategy), it is
  execution, not decision.
- **Place luck deliberately — input vs output randomness:**
  - *Input randomness* happens **before** the decision (random map/board/deal):
    boosts replayability, preserves deep planning; if it is the *only* randomness
    the game can become solvable or cause analysis paralysis. (Catan board, Civ
    map, Carcassonne tile-draw.)
  - *Output randomness* happens **after** the decision (to-hit/damage rolls): adds
    tension, speeds turns, enables risk/reward and comebacks; but lets luck
    dominate and produces "cheap" losses. (RPG to-hit, wargame dice, slots.)
- **Kinds of uncertainty** — *complete* (blind, no clues) vs *hidden* (player
  doesn't know RNG exists — e.g. a silent loser-nudge) vs *measured* (outcome
  unknown but possibility space + probabilities known — Catan dice). Only
  **measured** randomness supports strategic decisions. *Incomplete* information
  (you know which facts are hidden, e.g. Poker hands) differs from *imperfect*
  (your info may be wrong, e.g. an unreliable Seer).
- **Modify the mix at the perceivable layer.** To let weaker players occasionally
  win, add a *perceivable* luck mechanic (FPS head-shots that sometimes land by
  accident); remove it to raise skill. Players sense *results*, not distributions —
  shifting a random *range* (`+0..+10` → `−3..+15`) is nearly invisible, while
  changing base damage is immediate. Tune visible knobs first.

## Difficulty, DDA & AI Fairness

- **Illusion of winnability (Chris Crawford).** A game must appear winnable to all
  players yet never be truly winnable. Protect it with *cleanliness* (no "gotcha"
  clutter intimidating beginners) and by making failures read as the player's own
  *correctable* mistake ("that was a silly mistake!"), never as engine/control
  flaws or demands for superhuman play.
- **AI is negative space.** Design enemy AI as the implied set of fun player
  counters. It must be deliberately *dumbed down* (its job is "put up a good fight
  and then lose"), preserve **mutual opportunity** (no AI-only abilities;
  rubber-band resources, never the AI's hands), and match the player's mental model.
- **Active DDA over silent rubber-banding.** Let the player set the pace and push
  back proportionally (Halo "doesn't make itself easier if you suck"). If the AI
  cheats at the top difficulty, **say so** — naming a tier "Insane"/"Unfair"
  pre-sets expectations so the cheat feels fair (see the progression rule for
  player-controlled DDA patterns).

## Characters & Builds

- **God stats & dump stats are the build-layer dominant-strategy failure.** Any
  attribute mandatory for an optimal build (god stat) or safely ignorable (dump
  stat) is a non-meaningful decision. A meaningful build choice needs real
  gameplay impact **and** several *viable* alternatives. The three non-meaningful
  shapes: a clearly-better option, a blind unknowable pick, identical outcomes.
- **Design within the viable↔optimal range, not at a point.** Players spread
  across Optimal / Viable / Marginal / Nonviable, and the gap widens each level.
  Tune content to the range — ship difficulty modes, and/or shrink the gap by
  sourcing most power from non-chosen things (found-weapon base damage) so choices
  are minor modifiers.

  | Spread | Base | Optimal | Verdict |
  |---|---|---|---|
  | Acceptable | 80–100 | 100–130 | fine |
  | Broken | 80–100 | 300–600 | min-maxers uncontent-tunable; balance complaints |

- Never ship a build that is *viable for 30 h then nonviable* at the final boss
  (fire mage vs fire-immune boss) — it forces a restart or a quit.

## Tuning Knobs

Categorize every knob — the category states its blast radius:

| Category | What it tunes | Blast radius / when safe |
|---|---|---|
| `feel` | juice, timing, response envelopes | local; safe to tune late |
| `curve` | cost/power curve parameters, rates | systemic; re-run the curve math after any change |
| `gate` | unlock thresholds, pacing gates | structural; reshapes progression — re-check the meta loop |

- Each knob: name, category, range, default, expected impact, **and
  perceivability** (how visible the change is to players — a range edit needs many
  samples before anyone notices; a base-damage edit is felt instantly).
- Tune one knob at a time against a stated target metric; after a `curve` change,
  re-anchor the whole curve instead of patching individual outliers.

**Balancing methods (process — Schell, Ch 13):**

- **Doubling and halving (Sid Meier / Brian Reynolds "Rule of 2").** When unsure,
  don't nudge by 10% — **double or halve** to bracket the value fast, then binary-
  search the gap. Drastic moves reveal a number's true effect immediately and stop
  you getting lost wondering whether a tiny change did anything.

  > **Worked bracketing.** A rocket does 100 dmg and feels too strong. Don't try
  > 90, then 80… Set it to **50** → now too weak. Try the midpoint **75** → still
  > a touch high → **62** → good. Four playtests bracket the right value instead of
  > a dozen blind 10% steps.

- **Train your intuition by guessing exactly.** Don't round to convenient
  numbers — force a precise guess ("13.7? no… 13.8 — yes"), apply it, observe.
  Even a wrong guess sharpens the next one (the microwave-timing drill). Designer
  intuition is the only tool for objects that resist spreadsheets.
- **State the problem first** (problem-statement lens) and **keep written model
  notes** — tuning and the balance model co-evolve, so record what each change did
  *and* whether it shifted the model. Build the game so values are editable, ideally
  live, before you need to balance them.
- **Don't let the player balance it.** Player-set difficulty sliders fail because
  of conflict of interest — players tune away the challenge, get a brief power
  rush, then quit bored (the Monopoly "Free Parking jackpot" effect). Difficulty
  *modes* are fine; whole-game balance is the designer's job.
- **Dynamic difficulty is a beautiful trap.** Adapting enemy power to the player on
  the fly breaks world realism, is exploitable (play badly to make it easier), and
  insults players trying to improve (*The Incredible Hulk* backlash). Prefer the
  player-controlled / signalled DDA patterns under AI Fairness.

## Degenerate Strategies (Sylvester)

Sylvester's **degenerate strategy** is the dynamic twin of the dominant-strategy
test above: a strategy that is the obvious best choice in a decision, so it
*collapses the decision* and removes depth. Adding a tool can **subtract**
meaningful decisions if it creates one. His complements to the file's static
dominant-strategy diagnostics:

- **They hide in emergent interactions, not on the stat sheet.** The "Chuck
  Norris unit" (strictly strongest → always pick it) is the toy case. Real ones
  surface only in play: *Morrowind*'s intelligence-potion loop (brew potions that
  raise Intelligence, use the higher Intelligence to brew stronger potions →
  runaway, one-shot dragons in minutes) is invisible even on a design read. So
  detection is a **playtest/analytics** job, not a spreadsheet job — players
  hunt for them relentlessly, and (the paradox) *hate the designer once they
  find one*, because it spoils the game they wanted to keep mastering.
- **Degeneracy is skill-relative — name the tier you balance.** A strategy can be
  degenerate at one skill level and not another, because skill gates which
  strategies are reachable. Tic-tac-toe is degenerate for adults, magic for
  children. The SC2 *rush* is degenerate only at low skill (beginners can't
  defend it) and *anti*-degenerate at pro level (experts shut it down). You
  almost never balance every tier at once — decide **which skill tier the game is
  for** and balance there, accepting degeneracy elsewhere (SC2 balances for
  experts; *BioShock*/*Morrowind* balance for the low/mid tier and tolerate
  degenerate kills because the value is narrative, not mastery, and the game is
  short enough that few players exploit them). High-tier balance is *expensive*
  (forecloses un-balanceable ideas, needs weeks of expert testing, ships with
  exploits found post-launch); pay it only for skill-driven competitive games.

**"Maximize viable strategies" is the wrong goal — enrich, don't multiply.**
Sylvester recants his own earlier draft here, and it qualifies the file's
"viable diversity" framing:

- More viable options ≠ deeper game. *Rock-paper-scissors-lizard-Spock* has five
  viable throws vs RPS's three, yet is no deeper — just more complex. Poker is a
  superb game with **only two** live moves in most spots (fold or call).
- Once a decision has **two** viable strategies, adding a third does *not*
  automatically improve it. The real goal is a more **detailed, intense internal
  decision process** — richer reasoning over the existing options — which makes
  the design *smaller and more elegant*, not larger. Reach for depth-per-option,
  not option count (this is the depth-vs-complexity lever applied to choices).

## Balance Method & Philosophy (Sylvester)

Sylvester's experience-first stance complements Schell's twelve types and
Schreiber & Romero's cost-curve math — it governs *how* and *toward what* you
tune.

- **Balance is a method, not a goal.** "Balanced" is misused to mean "fun" or
  "fair." Balance = adjusting the relative power of tools/units/strategies; it
  can serve *any* design end (clarity, fiction, elegance). Its two headline goals
  are **fairness** (so wins/losses feel earned) and **depth** (so even experts
  hesitate over the choice). Everything else is delivered by other means.
- **Balance strategies-in-situations, not tools in isolation.** You cannot make
  a sword and a fire spell "equal" — each is strong or useless depending on
  context (fire melts the ogre, wastes itself on a goblin swarm). Tune so that
  the *choice between strategies in a given situation* is live: e.g. sword wins if
  the fight lasts <30 s, fire wins if it lasts >30 s — now the player must *guess
  the future*, which is the meaningful decision.
- **Max the role-defining levers, then lock them; balance with the rest.** Find
  the properties essential to a tool's fiction/role (a jetpack must launch you far
  and fast; armor must be tough) and push them to the limit, then **freeze** them
  — weakening them erases the tool's identity. Balance only by turning the
  *secondary* levers (cost, weight, vulnerability, noise) or by adding a new
  drawback mechanic. If you can't balance it without touching a core lever, **cut
  the tool** rather than ship a slow, pointless jetpack.
- **Cut, don't paper over with special-case rules.** Blizzard's discipline: an
  un-balanceable feature (the early over-massive Thor) is *trimmed to fit* rather
  than patched with "except/unless" exceptions that destroy elegance. A boring
  tool that works beats an exotic one that warps the game.
- **Don't chase one problem at a time.** Strategies are interlinked, so every fix
  spawns new imbalances elsewhere — "peeling bubbles out from under wallpaper."
  Slow down, think system-wide, and accept a change only if it **creates fewer
  problems than it solves** (watch the *implicit* goals you're not currently
  tracking). The cure is iteration toward a model, not reflexive knob-twisting.
- **The strategic landscape should have hills and valleys.** A perfectly flat
  game (every strategy equal) is balanced *and* dull, like a coin flip. Keep
  peaks and pits — priced by **skill-cost**: the harder a strategy is to execute,
  the bigger its payoff. (Same idea as the file's priced peaks / perfect
  imbalance, framed as a reward for mastery.) Occasionally run a "turn it to 11"
  pass — deliberately try an absurd value to surface a missed emotional peak,
  then keep it only if it survives.
- **Balance by playtest — collect *experience*, not suggestions.** Watch real
  players; their choices and faces reveal their internal experience better than
  their feature requests (a "make the rifle weaker" note is a *symptom* — dig for
  the bad experience behind it). One test gives a *story*; after ~10–20 tests your
  mental model flips from stories to **systems and relationships** — only then can
  you predict how a change ripples, and only then balance seriously. Build the
  game so values are editable (ideally live) *before* you need to tune them.

## Balancing Methods & Cadence (Zubek)

Two additions to the four-method matrix above and the philosophy section, from
Zubek (*Elements of Game Design*, Ch 3–4).

- **Add the simulation harness as a fifth method.** Beyond designer intuition,
  small-scale playtest, analytics, and spreadsheet math, a **bot can play the game
  (or one isolated system) at high speed or in parallel "on a farm"**, surfacing
  dominant/degenerate lines far faster than human play. It is costly to build and
  hard to drive in complex games, so it pays off most on number-heavy, isolable
  systems (economy, combat) — and it complements, never replaces, the others (a bot
  can't judge *feel*).
- **Buff over nerf where the choice is equivalent.** A buff (raise a stat) reads as
  reward; a nerf (lower one) reads as punishment, so prefer balancing upward — add
  more empowering items/events rather than cut — when both reach the same relative
  result. (Echoes Schell's "convert punishment to reward" under the twelve types.)
- **Balance in stages across production — don't leave it to one end pass.**
  Balancing is like painting: a rough sketch first, then iterative detail. Rough-
  balance each system *as it is built* (confirm platformer movement feels right
  before level design); **re-balance after integration** so coupled systems mesh
  (test character + camera + control together early, since all three shape the felt
  experience); then run a **holistic alpha pass** with all systems in place — small
  changes, but full-game testing surfaces flaws no isolated pass can. (Never balance
  before the game is playable — the worked asymmetric/EV passes above all assume a
  running build.)

## Degenerate Strategies & Feedback Loops

- **Dominant-strategy test** (the Sirlin check): at each major decision point, is
  there a choice that is correct regardless of context? If yes, the decision is dead.
- **Positive feedback** (winning → more winning) accelerates games and snowballs;
  add dampeners deliberately: diminishing returns, escalating costs, catch-up
  mechanics. **Negative feedback** stabilizes but can punish skill — placement
  matters: rubber-band resources, not the player's hands.
- **Balance the metagame too.** Out-of-play activity (deckbuilding, drafting,
  hiring) feeds in-play balance and forms its own positive loop (winners get richer
  → win more). Counter with structural dampeners — drafts (worst picks first),
  salary/roster caps, revenue sharing.
- If a *degenerate* strategy is more fun than intended play, consider
  **refocusing the game around it** (rocket-jumping) rather than only nerfing it.
- Watch the classic failure modes: kingmaking (a loser decides the winner),
  turtling (passivity dominates), grinding substituting for decisions.

## Anti-patterns

- Tuning by feel with no cost curve — every buff request becomes a negotiation.
- Deliberate pay-to-stay-current power creep (distinct from the inevitable ratchet).
- Nerfing the fun outlier into the floor instead of re-examining the curve it
  deviates from.
- Balancing objects in isolation, ignoring synergies and probability-weighted
  situational value.
- Chasing uniform 50% winrates or pick rates as the only success metric — a truly
  uniform game is solvable and rote; the success target is set by audience+intent.
- Tuning several knobs at once — no attribution, no learning.
- Hard counters everywhere: the draft screen decides the match, play doesn't.
- **God stat / dump stat** — an attribute mandatory-to-max or safe-to-ignore.
- **Shipping a build that becomes nonviable late** — forces a restart or quit.
- **Pricing a sideboard/situational object by raw occurrence frequency**
  (`40%×10=4`) — it effectively fires ~100% of the time; under-costing warps the meta.
- **Designing an object with two unpriced abilities at once** — neither value can
  be isolated.
- **Erring overcosted-strong instead of undercosted-weak** — one above-curve object
  invalidates the whole curve.
- **Hand-entered derived numbers** — a single curve correction becomes a hundred-cell
  manual edit and breeds data-entry errors.
- **Dead added option in an intransitive set** — an option some optimal line can
  entirely ignore (RPS-Dynamite's Paper) is wasted content.
- **Imbalance discovered mid-play** — shipping imbalance without setting
  expectations; fine if signalled, bad as a surprise.
- **Bullet-sponge "balancing"** — no real counter to a threat, compensated with raw
  HP; removes mastery, reads as unfair.
- **Forward-designed AI** ("smarter/tougher/more realistic" as the goal) — ends in
  a game people never win; tune AI to lose believably and keep mutual opportunity.
- **Eyeballing odds** — treating probability as intuition; combining "OR" by adding
  non-exclusive events or "AND" without independence (the de Méré error).
- **Balancing purely on nominal EV** — ignoring that humans avoid regret / loss and
  misperceive frequencies, so the highest-EV option is not the one players pick.
- **Letting the player balance the game** (open difficulty sliders) or **silent
  dynamic difficulty** — conflict of interest and broken realism, respectively.
- **Genre mislabelling head-vs-hands** — selling a puzzle game as an action game
  (or vice versa) disappoints both audiences.
- **Adding options to "deepen" a game** — raises complexity for free; only adds
  depth if it opens a genuinely new strategy. Two viable strategies is enough;
  enrich the decision, don't multiply choices (RPSLS vs RPS).
- **Balancing tools instead of strategies-in-situations** — a sword and a spell
  can't be made "equal"; only the contextual choice between them can be balanced.
- **Patching the same problem repeatedly with special-case rules** — peeling
  bubbles under wallpaper; each fix spawns a new imbalance. Slow down, model the
  system, or cut the offending feature instead of layering exceptions.
- **Weakening a tool's role-defining lever to balance it** — a slow jetpack or a
  fragile armor erases identity; tune secondary levers or cut the tool.
- **Balancing for the wrong skill tier (or all tiers at once)** — pick the tier
  the game is for and accept degeneracy elsewhere; chasing every tier is near
  impossible and starves the rest of the design.
- **Treating playtest feedback as a suggestion list** — collect the player's
  *experience*, not their fixes; balance from a systems mental model built over
  many tests, not from one test's story.
- **Leaving balance to a single end-of-project pass** instead of staging it
  (rough per-system → re-balance after integration → holistic alpha pass).

## Source Map

| Source | Used for |
|--------|----------|
| Schreiber & Romero, *Game Balance* (CRC Press, 2021), Ch 1 "Foundations of Game Balance" | Kinds of balance taxonomy; the four balancing methods matched to genre/phase; audience+intent success target |
| — Ch 2 "Critical Vocabulary" | Possibility-space levers (determinism, symmetry, information, intransitivity, solvability); metagame balance & dampeners |
| — Ch 5 "Finding an Anchor" | Anchor-resource procedure; comparative anchor; formulaic spreadsheet tooling; priced peaks |
| — Ch 8 "Transitivity & Cost Curves" | Cost-in-points/identity curve; PvP balanced-as-constant; probability-weighting caveat; four guidelines; structural power creep; curve reverse-engineering |
| — Ch 9 "Characters & Builds" | God/dump stats & meaningful decisions; levels of viability and the viable↔optimal gap |
| — Ch 10 "Combat" | Player-vs-enemy power derivation; hit-count-first; asset-budget math; illusion of winnability; AI-as-negative-space; active DDA |
| — Ch 16 "Beyond Balance" | Fairness = expectation-relative; numbers ≠ balance; perfect imbalance (~10–15%); counters all the way down (3 Yomi layers) |
| — Ch 19 "Managing Luck & Skill" | Skill/luck double axis; input vs output randomness; kinds of uncertainty/information; perceivable-layer tuning |
| — Ch 23 "Situational Balance" | Situational EV with non-literal multiplier; versatility vs switch-cost; shadow costs (sunk/opportunity/metagame); combo cost-splitting |
| — Ch 25 "Intransitive Mechanics & Payoff Matrices" | Payoff-matrix solving procedure; cost-weighted RPS (1:2:1); asymmetric RPS (X=1/12); dominated-option elimination; multiplayer degree |
| Jesse Schell, *The Art of Game Design: A Book of Lenses* (Russian translation), Ch 12–13 | The twelve types of game balance (named axis checklist); triangularity (safe-vs-risky framing + Qix/Space Invaders EV); balancing methods (doubling/halving Rule-of-2 worked bracketing, intuition-by-exact-guess, don't-let-the-player-balance, dynamic-difficulty trap); asymmetric-force summing (biplane); probability rules & combination; expected value (payout-die & situational-attack tables); perceived-probability / loss-aversion / regret (Kahneman–Tversky); skill↔chance interactions; elegance & natural-vs-artificial balance |
| Robert Zubek, *Elements of Game Design* (MIT Press, 2020; Russian translation), Ch 3–4 | Balancing Methods & Cadence — the simulation-harness method (bot plays at speed / on a farm) as a fifth balancing method; buff-over-nerf preference; staged balancing across production (rough per-system → re-balance after integration → holistic alpha pass; "balancing is like painting") |
| Tynan Sylvester, *Designing Games* (O'Reilly, 2013; Russian translation), Ch 2, 5–6 | Depth-vs-complexity (elegance) as the balance goal — maximize depth per unit complexity; smell-of-elegance heuristics; Reaper-vs-Hellion depth comparison; skill ceiling/floor/range and nested skills; degenerate-strategy framing (Morrowind potion loop, Chuck-Norris case, skill-relative degeneracy + which-tier-to-balance, SC2/BioShock); "more viable strategies is not the goal — enrich, don't multiply" (RPSLS/poker); balance-as-method philosophy (balance strategies-in-situations not tools, max-then-lock role levers, cut-don't-patch / Blizzard Thor, don't chase one bug at a time, hills-and-valleys priced by skill, turn-it-to-11); playtest to build a systems mental model, collect experience not suggestions |
