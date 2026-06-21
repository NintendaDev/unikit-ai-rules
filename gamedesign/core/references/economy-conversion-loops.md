# Conversion Chains & the Exchange-Rate Calculation (Zubek)

Quantitative deep-dive for `economy.md`. Open this when you need to compute the net
value a player extracts from a conversion/production loop, judge whether the loop is
profitable, and bound it. Where Machinations gives the *notation* and Cook's value
chains the *qualitative* shape, Zubek (*Elements of Game Design*, Ch 4) adds the
**quantitative** tool: collapse the loop into one net figure per source unit, then tune it.

## Model the loop as a conversion chain, then chain-substitute the rates

Express each conversion as a rate and substitute through the chain to collapse the whole
loop into one *net figure per source unit*. Worked Diablo loop:

| Conversion | Rate |
|------------|------|
| Sell 1 loot | 10 gold |
| Restock arrows | 10 gold → 100 arrows (1 gold = 10 arrows) |
| Heal | 1 gold = 1 HP |
| Fight | 10 monsters → ~10 loot, costing 60 HP + 100 arrows |

Substituting: 1 monster ≈ 1 loot − 6 HP − 10 arrows → 10 gold − 6 HP − 10 arrows →
(pay 10 gold to restock the arrows) 9 gold − 6 HP → (pay 6 gold to heal) **+3 gold
net per monster**. The monster is effectively a gold faucet worth ~+3 gold each —
a number you can now tune against the rest of the economy.

## Conversion loops are profitable or unprofitable — an unbounded profitable loop is a hazard

A loop whose income exceeds its per-pass cost grows wealth linearly (the +3/monster
loop above); double the potion+arrow cost and the same loop goes *unprofitable* — a
grinding player slowly goes bankrupt and calls the loop "broken". Worse, a profitable
loop fed by an **infinite source** (respawning monsters) is an infinite money fountain
that players farm to trivialise progression. Always bound a production loop. Four
limiters, least to most disruptive:

1. **Hard caps** — break gear after N uses, cap the monster count. Crude but certain.
2. **Outcome variance** — let a run sometimes come back empty; skilled players still
   average the expected reward, but the loop stops being a guaranteed faucet.
3. **Raise the cost of running it** — more time/travel per pass ("grind"); players
   resent it but keep going while profit stays high.
4. **Dynamic tuning** — make per-run cost *rise over time* so the loop drifts from
   profitable to unprofitable; the rational player banks the early gains and moves to
   a new zone *before* costs balloon. Works best when the player freely chooses when
   to stop.

## Stable resource chains beat realistic simulation for predictability

Ultima Online's realistic hunt-and-sell ecosystem collapsed under player scale (early
hunters stripped the forests; later players found nothing). The fix was to *remove*
the dynamic simulation and replace it with stable, loop-free chains — animals
respawn at a fixed rate, vendors buy at fixed prices — guaranteeing a predictable,
*tunable* income source. Predictable-and-tunable beats realistic-but-chaotic for a
faucet the whole population draws on.

> Source: Robert Zubek, *Elements of Game Design* (MIT Press, 2020), Ch 4.
