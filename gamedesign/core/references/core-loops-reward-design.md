# Core Loops — Reward Cadence & Type Palette

Detailed reward-design material extracted from `core-loops.md` (load on demand
when scheduling rewards or choosing what reward a loop pays out). The main rule
keeps the conceptual hook; this file holds the full cadence rules and the
reward-type palette catalog. Sources: Schreiber & Romero, *Game Balance*, Ch 11
(Project Horseshoe progression report); Jesse Schell, *The Art of Game Design*.

## Reward Cadence

Beyond "variable beats fixed," pace rewards deliberately (Schreiber & Romero, Ch 11;
Project Horseshoe progression report):

- **Tie intermittent rewards to deliberate player action** — never reward something
  the player didn't know about or couldn't control. Good: random loot from a
  deliberately-defeated enemy. Bad: login trophies, hidden achievements, "win 5
  gambles in a row", "deal exactly 123 damage".
- **Reward magnitude has diminishing returns** — many small spaced gains beat one
  big lump or an early flurry.
- **Chart all reward *types* on one timeline and avoid stacking** — reserve
  simultaneous power+level+story payoffs for major beats; sprinkle the rest into the
  gaps so each lands.
- **Detect false progression** — random systems can *simulate* progress without
  delivering it (slot near-miss; non-upgrade "loot" that still feels like a step). It
  works only while hope survives; perceived-too-low odds flip it to futility. Give
  failed pulls a real outlet (convert/fuse/sell, guild loot queues) so the loop has
  genuine granularity, not binary have/have-not.

## Reward-Type Palette

Cadence answers *when and how often* a reward lands; the **type** answers *what
the reward actually is*. Pair the two — pick a type that fits the loop's motivator,
then schedule it. Schell's palette of reward types (Jesse Schell, *Game Design*):

| Reward type | What the player gets | Best fits |
|---|---|---|
| Praise | acknowledgement, "well done" feedback | early loops, onboarding |
| Points / score | a legible number to grow and compare | skill loops, mastery |
| Prolonged play | more game (extra life, continue, extra turn) | arcade / run loops |
| Access / gateways | a door opens — new area, mode, content | exploration, meta |
| Spectacle | a sight or moment worth reaching | climaxes, finales |
| Expression | cosmetics, customization, creation | identity / status |
| Powers | new abilities that change what you can do | skill + accumulation |
| Resources | currency, materials, fuel for other loops | economy loops |
| Status | rank, reputation, leaderboard standing | social / competition |
| Completion | closing a set, finishing a thing | collection, closure |

Heuristics: match the reward type to the loop's motivator (a Mastery loop wants
*points/powers*, not cosmetics; an Expression loop wants *expression*, not raw
resources) — a type/motivator mismatch produces a hollow reward even on a perfect
schedule. Vary the palette across the experience so successive rewards feel
distinct; chart the *types* on the same timeline the cadence rule charts, and
reserve the strongest types (spectacle, powers, big access) for interest-curve
peaks.
