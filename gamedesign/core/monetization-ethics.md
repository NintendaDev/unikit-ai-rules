---
version: 1.0.0
---

# Monetization Ethics

> **Scope**: Ethical monetization method — the dark-pattern taxonomy (Zagal's four categories; darkpattern.games), loot-box/gacha odds disclosure, the legal landscape (FTC v. Epic, regional loot-box rulings, UK ICO Children's Code), designing for minors, and the friction/honesty test.
> **Load when**: designing monetization, IAP, loot boxes, gacha, or premium currency; reviewing a design for dark patterns; checking legal or regulatory obligations; setting odds disclosure; designing anything aimed at children.

---

This rule carries the **dark-pattern catalog and the legal landscape** for the
whole module — the core-loops, economy, and liveops rules reference it rather
than restating it.

## The Dark-Pattern Catalog (Zagal)

Four categories of manipulative game design (Zagal et al.; catalogued at
darkpattern.games). A pattern is a *dark* pattern when it works **against the
player's interest for the operator's gain**:

| Category | Mechanism | Examples |
|---|---|---|
| **Temporal** | exploit the player's time | forced grind, appointment abuse, energy timers, "can't stop now" |
| **Monetary** | obscure or inflate real cost | premium-currency layers hiding $ value, mismatched bundle sizes, pay-to-skip pain you designed |
| **Social** | weaponize relationships | guilt/obligation, social pyramid pressure, friend-spam, fear of letting a guild down |
| **Psychological** | exploit cognition | variable-ratio (gambling) reward, near-miss framing, FOMO, loss-aversion, sunk cost |

- **Premium-currency layering** (real money → premium → items, with bundle sizes
  that never match prices) is the canonical monetary pattern: it severs the
  player's sense of real cost. Name it when it is load-bearing.
- **Variable-ratio monetized rewards** are the most loaded psychological
  pattern — research links loot-box engagement with problem-gambling severity
  (Zendle & Cairns).

## Loot Boxes, Gacha & Odds Disclosure

- **Disclose the odds.** Publishing per-item probabilities is now an industry
  standard and a legal/store requirement in many jurisdictions (and platform
  policy on iOS/Android). Never ship a randomized monetized reward with hidden
  odds.
- **Pity as consumer protection**: a hard-pity guarantee bounds the worst case
  and is the ethical floor for monetized randomness (the *math* lives in the
  economy rule; the *obligation* lives here).
- Disclose the **full distribution** the player faces — base rate, soft/hard
  pity, banner guarantees — not a headline rate that hides an exponential tail.

## The Legal Landscape

A moving target — flag obligations, don't pretend to final legal advice:

- **FTC v. Epic (2022)** — dark patterns and unauthorized/accidental charges drew
  a record settlement; obscured cancellation, easy-to-mis-tap purchases, and
  charges without informed consent are enforcement targets in the US.
- **Regional loot-box rulings** — Belgium and the Netherlands have restricted or
  banned paid loot boxes as gambling; other regulators are active. A monetized
  random-reward design must check the **target markets**.
- **UK ICO Children's Code** (Age Appropriate Design Code) — services likely
  accessed by minors must default to high privacy and **must not use nudge
  techniques to encourage spending or data sharing**.

## Designing for Minors

- If children are in the realistic audience, the **Children's Code stance is the
  floor**: no behavioral nudges toward spending, no FOMO/loss-aversion levers
  aimed at minors, conservative defaults.
- Age-gating monetization and disabling manipulative mechanics for younger
  players is a design requirement, not a courtesy.

## The Friction & Honesty Test

Honest monetization sells **value, expression, or time-respect** — never
manufactured anxiety:

- **Sell value**: cosmetics, expansions, convenience that doesn't gate fun.
- **The friction test**: friction belongs on the *spend* (a confirm step, a clear
  price), not on *escaping* the spend (hard-to-find cancel, dark-pattern flows).
  Inverted friction is the tell.
- **Design test**: "are we rewarding play, or monetizing anxiety?" and "would
  this mechanic still be in the game if it made no money?" If the schedule *is*
  the game, that is a finding.
- Pay-to-win vs pay-for-convenience vs pay-for-cosmetics is a values decision —
  state it; a competitive game selling power is a different ethical posture than a
  co-op game selling hats.

## Anti-patterns

- Hidden loot-box/gacha odds, or a headline rate concealing a no-pity tail.
- Premium-currency layering and mismatched bundles presented as neutral economy.
- Variable-ratio monetized rewards labeled "engagement".
- FOMO, loss-aversion, or social-guilt mechanics as primary spend drivers —
  especially aimed at minors.
- Friction on cancellation/escape instead of on the spend itself.
- Shipping in a loot-box-restricted market with no legal check.
- A monetization design with no explicit ethics statement naming what it refuses.
