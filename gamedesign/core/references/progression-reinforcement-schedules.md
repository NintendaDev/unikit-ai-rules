# Reinforcement Schedules — Catalog (Zubek)

Lookup catalog for the **progression** rule's "Reinforcement Schedules" section.
Open this when designing or auditing *when* a reward is delivered. Source: Robert
Zubek, *Elements of Game Design* (MIT Press, 2020), Ch 5 — operant-conditioning
schedules applied to game rewards.

## The five schedules

A reinforcement schedule is the rule governing when a reward is delivered. Skinner's
work showed the schedule changes behaviour dramatically, and that making rewards
*rarer* can extract more work per reward — until interest collapses. Compare schedules
on two axes: **response rate** (how hard the player works per unit time) and
**resistance to extinction** (how long they persist once rewards stop).

| Schedule | Reward arrives | Response rate | Resistance to extinction | Behaviour notes |
|----------|----------------|---------------|--------------------------|-----------------|
| Continuous | every action | low | lowest | satiation — the player stops once sated |
| Fixed interval | first action after *n* seconds | low–moderate | low | dip right after a reward, then a ramp-up as the next reward nears |
| Fixed ratio | every *n* actions | moderate–high | moderate | decent rate, but a pause right after each reward; quits faster than variable |
| Variable interval | after a random time | low–moderate | high | persistent, but reward isn't tied to effort, so less work per unit time |
| Variable ratio | after a random number of actions | **highest** | **highest** | works hardest, slowest to quit — the default game schedule (loot, crits) |

- **Random ratio** (each action independently rolled — slot machines, loot boxes) is
  treated here as a variant of variable ratio: very high response rate, low extinction
  resistance, the textbook gambling schedule. Monetised random-ratio rewards are a
  regulated red line — see the monetization-ethics rule.

## Worked example — Diablo's four stacked variable-ratio schedules

Treat combat as "work" and loot as reward:

1. **Combat, high-frequency** — each kill costs a random amount of effort and drops
   loot scaled to difficulty = a variable-ratio schedule.
2. **Combat, low-frequency** — rare collectibles drop occasionally on top = a second
   variable-ratio schedule layered over the first (a low-odds "jackpot").
3. **Exploration, high-frequency** — finding chests/areas is its own activity with its
   own frequent variable-ratio reward.
4. **Exploration, low-frequency** — rare finds while exploring = the fourth schedule.

Four distinct variable-ratio schedules chained together reward varied behaviour
(fight vs explore) and sustain engagement across activities and skills.

## Workload change & the level curve

Once a behaviour is reinforced, it becomes the base for *higher* workload at the same
reward — most visibly the XP-per-level curve, which demands steadily more XP per level.
The player must work harder/more often, or "smarter" (better gear, more profitable
targets), for the same reinforcement; whether that motivates or demotivates depends on
reward tuning and the player's own motivation. A simplified Diablo III XP curve
(cumulative, illustrative) shows the sharp ramp typical of the genre:

| Level | 2 | 3 | 4 | 5 | 10 | 20 | 30 | 40 | 50 |
|-------|---|---|---|---|----|----|----|----|----|
| XP | 280 | 2,700 | 4,500 | 6,600 | 19,200 | 57,200 | 115,200 | 420,000 | 2,080,000 |

Tune the ramp's steepness against the reward so escalating workload reads as
aspiration (worth chasing), not punishment (a grind wall). The curve-shape taxonomy,
threshold derivation, and cost-obfuscation method live in the progression rule's "XP
Curves & Thresholds" section — this catalog only adds the *schedule* lens on them.
