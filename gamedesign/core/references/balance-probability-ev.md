# Balance — Probability & Expected Value

Detailed probability/EV math toolkit extracted from `balance.md` (load on demand
when computing odds, distributions, or expected values). The main rule keeps the
one-line EV principle and points cross-references (Triangularity, Situational
Balance, Intransitive Systems) here for the full tooling. Source: Jesse Schell,
*The Art of Game Design*, Ch 12; loss-aversion/regret via Kahneman–Tversky.

## Probability & Expected Value

Chance is math, not intuition — never eyeball odds (Schell, Ch 12). The
designer-grade essentials:

- **Probability = desired outcomes ÷ equally-likely possible outcomes**, always in
  `[0, 1]`. A result above 1 (or below 0) means the math is wrong — the classic
  de Méré error was *adding* the per-roll chance four times (`4 × 1/6 = 0.66`)
  instead of combining correctly.
- **Combine correctly:** "OR" = **add** only for *mutually exclusive* events;
  "AND" = **multiply** only for *independent* events. For "at least one X over N
  tries," compute the complement: `P = 1 − P(never)`. (de Méré's real win chance:
  one die ×4 → `1 − (5/6)⁴ ≈ 51.8%`; two dice ×24 → `1 − (35/36)²⁴ ≈ 49.1%` — a
  *loser*, which is why he went broke.)
- **Summing dice is not a flat roll.** Adding several uniform rolls makes a
  bell-shaped distribution (`3d6` → 10–11 common, 3/18 rare). Choose the
  **probability-distribution curve** you want, then pick the dice/RNG that yields
  it — `3d6` and `1d20` give the same range but utterly different games.
- **Monte-Carlo for the intractable.** When enumeration explodes, just *simulate*
  N runs and count — it needs no closed-form math and captures real-world skew.

**Expected value (EV)** = the probability-weighted average payoff, and the single
most important balance tool: `EV = Σ(P(outcome) × value(outcome))`. Hold EV
roughly constant across competing options to keep choices live; let it differ
deliberately to bias play.

> **Worked EV — a payout die game** (win on a two-dice roll):

| Win on | P(win) | Payout | P(lose) | Loss | EV per round |
|---|---|---|---|---|---|
| 7 or 11 | 8/36 | +$5 | 28/36 | −$1 | `8/36·5 + 28/36·(−1) = +$0.33` |
| 7 only | 6/36 | +$5 | 30/36 | −$1 | `6/36·5 + 30/36·(−1) = $0.00` (coin-flip) |
| 11 only | 2/36 | +$5 | 34/36 | −$1 | `2/36·5 + 34/36·(−1) = −$0.86` (rigged loss) |

> **EV is *situational* — weigh real, usable values** (the trap to avoid):

| Attack | Nominal | vs 500-HP boss | vs 15-HP enemy |
|---|---|---|---|
| Wind | 4, always | EV 4 | EV 4 |
| Fireball | 5 at 80% | `5·0.8 = 4` | `5·0.8 = 4` |
| Lightning | 40 at 20% | `40·0.2 = 8` (best) | `15·0.2 = 3` (**worst** — only 15 of the 40 is usable) |

Lightning looks twice as good on paper but the EV collapses once you cap damage
at the target's actual HP — count only the value the player can *use*, and fold
in any hidden penalty.

**Humans systematically misjudge odds — design for *perceived* probability too.**

- Players infer wrong frequencies from small samples (a few missed Lightnings →
  "it never hits," EV = 0 in their head). You must control perceived odds, not
  just real ones.
- **Loss aversion & regret (Kahneman–Tversky).** Given Game A (66%·$2400 +
  33%·$2500 + 1%·$0, EV ≈ $2409) vs the certain Game B ($2400, EV $2400), 82%
  pick the *lower-EV* certain option to avoid the regret of the 1% zero. People
  pay to dodge a guaranteed loss (Puzzle & Dragons' "pay to keep your loot") and
  over-risk to claw back a loss; the gambler's-fallacy and lucky-streak illusions
  are real, exploitable player behaviours.
- **Choosing the skill/chance mix** is itself an EV-of-the-audience decision —
  estimating odds *is* a skill (Blackjack counting), and predicting/controlling
  pure chance is an *imagined* skill that still adds fun. Tune the mix to taste:
  e.g. Germans favour low-chance board games more than Americans.
