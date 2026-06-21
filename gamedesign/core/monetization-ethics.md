---
version: 1.0.0
---

# Monetization Ethics

> **Scope**: Ethical monetization method — the dark-pattern taxonomy (Zagal's four categories; darkpattern.games), the named cognitive biases monetization exploits, cost-obfuscation pricing tactics, the exploit-vs-honest design fork, expected-value vs utility, pay-to-win / whale-targeting ethics, loot-box/gacha odds disclosure, the legal landscape (FTC v. Epic, regional loot-box rulings, UK ICO Children's Code), designing for minors, and the friction/honesty test.
> **Load when**: designing monetization, IAP, loot boxes, gacha, or premium currency; pricing F2P bundles or premium currency; reviewing a design for dark patterns or exploited biases; checking legal or regulatory obligations; setting odds disclosure; designing anything aimed at children.

---

This rule carries the **dark-pattern catalog and the legal landscape** for the
whole module — the core-loops, economy, and liveops rules reference it rather than
restating it.

## The Dark-Pattern Catalog (Zagal)

Four categories of manipulative game design (Zagal et al.; catalogued at
darkpattern.games). A pattern is a *dark* pattern when it works **against the
player's interest for the operator's gain**:

| Category | Mechanism | Examples |
|---|---|---|
| **Temporal** | exploit the player's time | forced grind, appointment abuse, energy timers, "can't stop now" |
| **Monetary** | obscure or inflate real cost | premium-currency layers hiding $ value, mismatched bundle sizes, pay-to-skip pain you designed |
| **Social** | weaponize relationships | guilt/obligation, social pyramid pressure, friend-spam, fear of letting a guild down |
| **Psychological** | exploit named cognitive biases | variable-ratio (gambling) reward, **near-miss**, anchoring, FOMO, loss-aversion, sunk cost |

- **Premium-currency layering** (real money → premium → items, with bundle sizes
  that never match prices) is the canonical monetary pattern: it severs the player's
  sense of real cost. Name it when it is load-bearing.
- **Variable-ratio monetized rewards** are a loaded psychological pattern — research
  links loot-box engagement with problem-gambling severity (Zendle & Cairns).
- **Near-miss** is a *distinct* exploit, not a variant of variable-ratio:
  manufacturing "close but not quite" (slot reels one position off; four of five
  royal-flush cards) to inflate the feeling of almost-winning.

## Named Biases a Monetization Design Exploits

Name the *specific* bias a mechanic exploits — that is the ethical-review tell
(Schreiber & Romero, Ch 20):

| Bias | How monetization weaponizes it |
|---|---|
| Selection bias | memorable rare wins feel common — publicized jackpots/winners |
| Self-serving bias | players over-attribute wins to skill, keep paying to "prove" it |
| Attribution bias | rewards internalized, setbacks externalized — random *rewards* never draw backlash, so never sell them as "fair" |
| Dunning–Kruger | weak players overrate themselves and spend to validate it |
| Anchoring | the first number seen sets all comparisons (struck-through "original" prices, "best value" bundles, big premium-currency numbers) |
| Gambler's / hot-hand fallacy | streak misperception drives "due for a win" / "on a roll" spending |

- **Anchoring is the canonical pricing dark pattern.** A "2 for 1" relabel of a
  "1 to 1" payout is mathematically identical but reads bigger; a struck-through high
  price makes a sale feel like a deal. Flag anchored pricing — don't present it as
  neutral merchandising.

## Cost Obfuscation in F2P Pricing

Because players punish *visible* price raises, F2P designs hide them — a tactic
family to recognize and refuse (Schreiber & Romero, Ch 6):

- **Drop-rate cuts** — quietly lower a drop rate so players must buy more (friction
  disguised as economy tuning).
- **Quantity shrinkflation** — fewer units at the same price (125 → 120 units for $10).
- **"Now more gold!" framing** — raise units *and* price together, advertise only the
  bigger quantity, hide the higher per-unit cost.
- **Perpetual "% off"** sales run off an inflated anchor price.
- **Per-player price discrimination** — show different prices to different players for
  the same item: lower to non-spenders to convert them, *higher* to proven spenders
  (especially new items with no public price history). The authors note "the ethics
  of such practices are regularly questioned" — treat dynamic per-player pricing as
  an explicit ethics decision, never a silent optimization.

**Honesty test:** would the player understand the *real per-unit money cost of
progress*, or has it been deliberately severed?

## The Exploit-vs-Honest Choice

The book's signature ethical statement: facing player biases, the designer takes one
of two roads (Schreiber & Romero, Ch 20).

- **Exploitation ("the Dark Side").** Skew hidden odds to match biases, manufacture
  near-misses, publicize winners (selection bias), anchor inflated prices. The
  authors equate this with selling out to casinos/scams: "this is dishonest… we
  teach our players [something] we know is wrong."
- **The Honest Solution.** Expose the *results* of random processes, not just the
  stated odds — running win/loss stats, visible roll histories (the Tetris arcade's
  piece-count side panel; Catan pip dots; post-hand Poker reveals; Risk roll logs) —
  and make randomness visceral and legible rather than concealed.

Make "exploit or be honest" an **explicit, recorded decision** in any
monetized-random or bias-adjacent design.

## Expected Value vs Utility

A bet's *expected value* and its *perceived worth (utility)* diverge predictably,
and monetization exploits the gap (Schreiber & Romero, Ch 20):

- People rationally refuse +EV bets when stakes are too high (loss aversion),
  win-frequency too low, or stakes too trivial to matter. Utility also **saturates**
  past "unimaginably large" — a 1-in-a-million shot at $1B feels the same as at $1T.

  | Bet | EV edge | Reaction |
  |---|---|---|
  | $1 to win $15 on a d20 roll of 19–20 | +50% | good — people take it |
  | same edge scaled to $1,499 → $15,000 | +0.067% | people correctly refuse |

- Ethical disclosure conveys the **full distribution and real odds** of the thing the
  player is buying — not a flattering headline EV.

## Pay-to-Win & Whale Targeting

- **Pay-to-win vs pay-for-convenience vs pay-for-cosmetics is a values decision** —
  state it. A competitive game selling power is a different ethical posture than a
  co-op game selling hats. The four ways to balance an open (real-money) economy
  (economy rule) carry different postures: limit spending / limit power (sell
  *options not power*) / competitive gates = fair; **survival of the richest**
  (power locked behind money) = explicit pay-to-win.
- **The spender-segregation auction trap.** Matchmaking *segregates whales together*,
  which erases the advantage they bought — yet they then **spend more to out-bid each
  other** like an auction with a bidder driving the price. Designing a system whose
  endgame is whales bidding each other up is the sharpest pay-to-win ethics line.
- **Deliberate ramp-out of non-payers.** F2P designs cast a wide net for store
  ratings, then spike difficulty on day 2–3 to "ramp out" non-spenders and
  reallocate attention to whales — often prompting a review *before* the ramp hits.
  Surface *whom* the difficulty curve is engineered for, and whether the fun is gated
  behind a monetization wall by design.

## Loot Boxes, Gacha & Odds Disclosure

- **Disclose the odds.** Publishing per-item probabilities is now an industry standard
  and a legal/store requirement in many jurisdictions (and platform policy on
  iOS/Android). Never ship a randomized monetized reward with hidden odds.
- **Pity as consumer protection**: a hard-pity guarantee bounds the worst case and is
  the ethical floor for monetized randomness (the *math* lives in the economy rule;
  the *obligation* lives here).
- Disclose the **full distribution** the player faces — base rate, soft/hard pity,
  banner guarantees — not a headline rate that hides an exponential tail, and convey
  *utility* (real odds of the thing bought), not a favorable-sounding EV.

## The Legal Landscape

A moving target — flag obligations, don't pretend to final legal advice:

- **FTC v. Epic (2022)** — dark patterns and unauthorized/accidental charges drew a
  record settlement; obscured cancellation, easy-to-mis-tap purchases, and charges
  without informed consent are US enforcement targets.
- **Regional loot-box rulings** — Belgium and the Netherlands have restricted or
  banned paid loot boxes as gambling; other regulators are active. A monetized
  random-reward design must check the **target markets**.
- **UK ICO Children's Code** (Age Appropriate Design Code) — services likely accessed
  by minors must default to high privacy and **must not use nudge techniques to
  encourage spending or data sharing**.

## Designing for Minors

- If children are in the realistic audience, the **Children's Code stance is the
  floor**: no behavioral nudges toward spending, no FOMO/loss-aversion levers aimed at
  minors, conservative defaults.
- Age-gating monetization and disabling manipulative mechanics for younger players is
  a design requirement, not a courtesy.

## The Friction & Honesty Test

Honest monetization sells **value, expression, or time-respect** — never
manufactured anxiety:

- **Sell value**: cosmetics, expansions, convenience that doesn't gate fun. Selling
  *time* (skip ahead on the same curve a free player walks) is gentler than selling power.
- **The friction test**: friction belongs on the *spend* (a confirm step, a clear
  price), not on *escaping* the spend (hard-to-find cancel, dark-pattern flows).
  Inverted friction is the tell.
- **Design test**: "are we rewarding play, or monetizing anxiety?" and "would this
  mechanic still be in the game if it made no money?" If the schedule *is* the game,
  that is a finding.

## Anti-patterns

- Hidden loot-box/gacha odds, or a headline rate concealing a no-pity tail.
- Premium-currency layering and mismatched bundles presented as neutral economy.
- **Skewing hidden odds to match player biases** (display 75%, roll 95%; suppress
  streak-breakers).
- **Manufactured near-miss** ("close but not quite") to inflate almost-winning.
- **Drop-rate nerfs / quantity shrinkflation / "now more gold!"** framing that raises
  effective price without a visible price change.
- **Per-player price discrimination** — charging proven spenders more for the same item.
- **Designed day-2/3 difficulty ramp** to ramp out non-payers; prompting for a store
  review *before* the paywall ramp hits.
- **"Survival of the richest" auction dynamic** — segregating whales so they bid each
  other up to spend more.
- Variable-ratio monetized rewards labeled "engagement".
- FOMO, loss-aversion, or social-guilt mechanics as primary spend drivers —
  especially aimed at minors.
- Friction on cancellation/escape instead of on the spend itself.
- Shipping in a loot-box-restricted market with no legal check.
- A monetization design with no explicit ethics statement naming what it refuses, and
  no recorded exploit-vs-honest decision.

## Source Map

| Source | Used for |
|--------|----------|
| Schreiber & Romero, *Game Balance* (CRC Press, 2021), Ch 6 "Economic Systems" | Cost-obfuscation pricing tactics; per-player price discrimination; whale targeting & ramp-out |
| — Ch 10 "Combat / Open & Closed Economies" | Pay-to-win postures; survival-of-the-richest; spender-segregation auction trap |
| — Ch 20 "Probability and Human Intuition" | Named cognitive biases; anchoring as pricing pattern; near-miss; EV vs utility; the exploit-vs-honest fork |
