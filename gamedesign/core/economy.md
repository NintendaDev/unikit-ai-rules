---
version: 1.0.0
---

# Game Economy

> **Scope**: In-game economy method — the faucet/sink conservation model, economy archetypes (fixed / player-dynamic / F2P / prestige / real-currency), currency taxonomy, value chains (Cook) and marginal value, Machinations resource-flow notation, supply & demand and market price, scarcity as a lever, time as a resource, supply-side vs demand-side inflation guardrails, open vs closed economies, trading and auction design, pity/gacha probability math, conversion chains and the exchange-rate calculation, conversion-loop profitability and the four runaway-loop limiters (Zubek), and economy health telemetry.
> **Load when**: designing currencies or resources, classifying or modeling an economy, modeling faucet/sink flow, pricing rewards or shop items, setting supply/demand or market prices, designing player trading or auctions, designing gacha/loot/pity systems, checking for inflation or a stalled economy, drawing resource-flow diagrams, computing a conversion/exchange rate, auditing a grindable conversion loop's profitability or bounding a runaway loop.
> **References**: `.unikit/memory/gamedesign/core/references/economy-conversion-loops.md` (conversion-loop exchange-rate math).

---

## The Faucet / Sink Model

Every economy is a set of **faucets** (sources that create currency/resources)
and **sinks** (drains that destroy them). The economy's health is the relation
between them, not the size of either.

- **Faucet** — any rule that mints a resource: quest reward, drop, daily login,
  passive generation.
- **Sink** — any rule that destroys it: crafting cost, repair, upgrade, tax,
  consumable, decay.
- **Net flow** = faucets − sinks per cohort per time. Persistent positive net flow
  → inflation; persistent negative → starvation/grind. Neither is wrong by
  default — it must be a *chosen* target with a guardrail.
- The **faucet/sink ledger** per currency names every source and drain with rate
  estimates. A currency with faucets and no sinks is a design bug.

**The five mechanical characteristics of an economy** — a system earns the label
"economic" by how many it has (Schreiber & Romero, Ch 6):

| Characteristic | Meaning |
|---|---|
| Generation | a faucet mints a resource |
| Conversion | create something *new* (2 sticks + 3 iron → axe; shop purchase) |
| Consumption | spend to change an *existing* state (not a new object) |
| Trading | resources move between players |
| Resource limits | caps, scarcity, inventory |

- Distinguish **conversion** (make new) from **consumption** (change existing) —
  they have different ledger effects. A single coins→lives swap (Mario) is not an
  economy; Monopoly (all five) is.
- A **zero-sum transfer** (Monopoly rent: money moves player→player) is neither
  faucet nor sink — name it as its own category in the ledger.

## Economy Archetypes

Classify the whole economy before tuning — each archetype has different price
control dials (Schreiber & Romero, Ch 6):

| Archetype | Who sets price | Example | Note |
|---|---|---|---|
| **Fixed** (command) | the designer sets all prices | Final Fantasy, Dragon Quest | full control; the game is the only seller |
| **Player-dynamic** | players, via trade/auction | WoW auction house | designer sets only *boundaries* |
| **F2P** | real money / "monetizing actions" buy resources | Candy Crush | defined by deliberate *friction* that pushes purchases |
| **Prestige** | real money buys status, no gameplay effect | TF2 hats, virtual land | pure expression (see player-motivation) |
| **Real-currency / gambling** | two-way money↔resource exchange | Poker | the two-way exchange is what legally makes it gambling |

## Currency Taxonomy

| Type | Earned by | Typical role | Convertibility |
|---|---|---|---|
| Soft | playing | the working economy: craft, repair, level | freely earned, freely spent |
| Hard / premium | paying (or scarce earn) | accelerators, premium cosmetics | one-way: money → hard, never hard → money |
| Event / seasonal | limited-time activity | event shops, FOMO-bounded | expires by design — state the reset |

- **Conversion is directional.** Money buys premium; premium may buy soft; soft
  must never buy premium and premium must never cash out — the moment it does you
  have a real-money market and a regulatory problem.
- Premium currency is sold in **mismatched bundle sizes** vs item prices by
  industry convention; treat this as a dark pattern when it is load-bearing (see
  monetization-ethics) — name the intent.

## Supply, Demand & Market Price

In a player-dynamic economy the price emerges from two curves; in a fixed economy
the designer *is* the price (Schreiber & Romero, Ch 6):

- **Supply curve** slopes up or flat (more sellers as price rises, never down);
  **demand curve** slopes down or flat (fewer buyers as price rises, never up).
  The **market price** is their intersection.

  | Change | Market price |
  |---|---|
  | demand & supply unchanged | constant |
  | demand ↓ and/or supply ↑ | falls |
  | demand ↑ and/or supply ↓ | rises |
  | both ↑ or both ↓ | indeterminate (one may dominate) |

- **Set price per archetype.** Fixed economy: price from the anchor (e.g. "10 gold
  per HP of damage") plus per-ability premiums, summed. Player-dynamic economy:
  set only the *boundaries* — drop rarity, store availability, store placement,
  class/level usage restrictions — and let players find the price. The NPC
  sell-back price acts as a **price floor** (players won't auction below it).
- **The invisible hand.** Players price-discover fast even with zero published
  stats — a rarer item of equal utility trades higher though no one knows the true
  drop counts. Revealing vs concealing economy data is a deliberate lever:
  transparency aids good decisions; concealment gives the community something to
  discover.
- **Volatility scales inversely with player count.** Fewer players → bigger price
  swings (each controls more of supply/consumption). A 3-player Catan clay rate
  swings wildly; Magic card prices stay stable and only lurch on a new expansion.
- **Marginal value: willingness-to-pay depends on how many a player already owns.**
  Usually it *decreases* (the 1st potion is craved, the 10th barely — cap by
  inventory/marginal limits, not price). It can *increase* near a goal or for set
  items (each owned gear piece raises demand for the next; Monopoly color groups).
  F2P "margin pressure" counts on players paying for the *last* units before a goal.
- **Substitutes & complements link demand curves.** *Imperfect substitutes* (heal
  potion vs mana-cast heal): raising one's price lifts demand for the other — use
  to stabilize prices. *Complements* (set-bonus gear): demand rises/falls
  together — use to drive collection.

## Scarcity as a Design Lever

Choosing limited vs unlimited resources changes what the game is *about*
(Schreiber & Romero, Ch 6):

| Resource model | Examples | Player behaviour |
|---|---|---|
| Scarce ammo | DOOM, Half-Life | conserve, fire cautiously, switch to abundant weapons |
| Unlimited ammo | Overwatch | fire liberally, swap freely |
| Limited units | Fire Emblem, FF Tactics | keep every unit alive, minimize casualties |
| Renewable units | Advance Wars, Civ | outproduce the opponent, units expendable |

Unlimited resources + generators turn income into a **positive feedback loop** and
make the game about ramping production fastest.

## Time as a Resource

Treat play time as the master resource — derive other quantities from it
(Schreiber & Romero, Ch 3):

- Pick the intended **game length first**; the progression budget falls out of it.
  (10 h RPG → target level 30 → ~3 levels/h → ~15 content stages → ~45 enemy
  configs.) Hand the curve math to the progression rule; the economy owns the
  *faucet rates* that feed it.
- Distinguish time *flavours*: turn-time (real-time vs turn-based), cooldowns,
  build/production time, action-point cost, time-to-level, movement speed. Each is
  a resource you can price and trade against (money-to-skip-timer is a tradeoff).

## Value Chains (Cook)

A value chain (Daniel Cook) traces how player **actions** convert into
**resources** and finally into **player value**:

- Each link adds value or it is waste: action → resource → upgrade → new action.
- **Reward staleness**: a reward loses value as the player accumulates it (the
  100th potion is worth ~nothing — this is the demand-curve mechanism above). Curve
  reward *types* to the player's stage — early faucets feed needs, late faucets
  feed aspiration.
- Map the chain end-to-end before tuning numbers; a broken link (a resource with
  no meaningful spend) is found structurally, not in a spreadsheet.

## Machinations Notation (Adams & Dormans)

Model economies as **resource-flow diagrams** before building them:

- Primitives: **pools** (hold resources), **flows** (move them at a rate),
  **gates** (route probabilistically or conditionally), **sources/drains**
  (faucets/sinks), **converters** (X → Y), **traders** (exchange).
- Distinguish **deterministic** flows (a converter: 3 ore → 1 ingot) from
  **stochastic** ones (a gate: 5% drop) — very different variance and feel.
- The diagram makes feedback loops visible: a pool that feeds its own faucet is a
  positive loop (snowball); route it through a sink or a diminishing gate. Scarcity
  decides *which* loop dominates (see above).
- The diagram is checkable on paper / by simulation before any playtest — spend
  playtests on perception, not on arithmetic the model already answers.

## Conversion-Loop Lookup Workflow

When you need to put a **number** on a conversion/production loop — compute the net
gold (or HP, or arrows) a player nets per source unit, judge whether the loop is
profitable, and bound a runaway loop — open
`.unikit/memory/gamedesign/core/references/economy-conversion-loops.md`. It carries
the chain-substitution method (the worked Diablo "+3 gold/monster" derivation), the
four runaway-loop limiters (hard caps → outcome variance → raise running cost →
dynamic tuning), and the stable-chains-vs-realistic-simulation lesson (Ultima Online).
Reach for it only when modeling a specific loop; the everyday economy concepts
(faucet/sink, inflation guardrails below) stay here.

## Inflation & Deflation Guardrails

Diagnose *which curve moved* before applying a fix (Schreiber & Romero, Ch 6):

- **Supply-side inflation** — too much currency is minted (gold farming, bots,
  generous drops); the supply curve shifts, prices skyrocket, items leave ordinary
  players' reach. (WoW peak gold-farming was estimated at ~100k full-time farmers.)
- **Demand-side inflation** — each player is individually richer (positive-sum loot
  accumulation), so willingness-to-pay rises and the demand curve drifts right.
  Also triggered by balance patches (buffed items gain trade value) and new content
  devaluing old items. In a positive-sum economy this drift is *structural*, not
  accidental.

**Three escalating tools** (least → most disruptive):

1. **Add negative-sum mechanics (sinks)** — NPC consumable sales, repair/upkeep,
   death penalties, prestige resets, one-off ultra-expensive cosmetic burns, or a
   mandated quest-item sink that pulls cash from all players at once.
2. **Remove positive-sum mechanics** — gradually cut drop rates. Risky: players
   notice and feel cheated.
3. **Economic reset / server wipe** — the nuclear option. Does **not** fix
   positive-sum drift; only equalizes starts at the next cycle, and disadvantages
   late joiners. (TCG seasonal rotation is a planned, gentler form.)

- **Health metric:** track **average currency per player over time** and tune
  sources/sinks until it stops trending. "A sink should take out about as much as
  the sources add in."
- **Soft caps** (sharp diminishing returns past a threshold) and **hard caps** (an
  absolute ceiling) bound accumulation — state which and why.
- **Granularity / numeric headroom.** Set ranges with room to insert future content
  (10 swords at 1–10 damage leave no room for an 11th without fractions; rescale to
  10–100 with enemy HP ×10 — proportionally identical, room for 90 more). Prefer
  whole numbers; add zeros for "pinball" excitement; values lose perceptual meaning
  past ~billions.
- Items that never leave once minted compound forever; prefer **consumable** sinks
  for anything minted at scale. *(Note: "non-consumable item" here is a different
  sense of "closed" than the open/closed-economy distinction below.)*

## Open vs Closed Economies

A **closed** economy cannot be influenced from outside (most AAA/analog games —
easier to balance, full designer control); an **open** economy lets outside
money/resources in (competitive F2P). Players resent a closed economy being opened
(try selling Monopoly money for cash). To balance an open economy where players
spend wildly different amounts, choose among four strategies (Schreiber & Romero,
Ch 6 / Ch 10):

| Strategy | Mechanism | Ethics posture |
|---|---|---|
| Limit spending | buy-in caps (poker) | neutral |
| Limit power | spend buys *options not power* (CCG: more decks, not stronger) | fair |
| Competitive gates | matchmake/segregate by spend or skill; paid advantage neutralizes; protect new players | fair |
| Survival of the richest | most powerful gear is purchase-only | explicit pay-to-win (see monetization-ethics) |

- **Whale dynamic, counter-intuitively:** segregating high spenders together does
  *not* make them quit — like an auction with a bidder "driving the price," they
  spend *more* to out-do each other. A softer alternative is to **sell time, not
  power** — money skips ahead on the same curve a free player walks.

## Trading & Auctions

Player trading injects unpredictability into an otherwise-controlled economy and
acts as a negative feedback loop in competition (players give better deals to
whoever's behind). Restrict deliberately (Schreiber & Romero, Ch 7):

- **Trade limits** by partner/timing/count prolong play, prevent trade-domination,
  and keep idle players engaged (Catan/Bohnanza: trades only in the active player's
  phase). **Usage restrictions** let a low-level char hold but not use high-level
  gear.
- **Trade costs are built-in dials:** a % cut is a sink and discourages big trades
  (Warbook: only 90% of a sent army arrives — the lost 10% is a sink); a flat fee
  discourages small trades; a time/count cap throttles spam and exploits.
- **Gifting ≠ trading.** In F2P, gifts are resources the giver *never owned* —
  allocated daily, use-it-or-lose-it, requestable from non-players. Design gifting
  for **retention** (an appointment mechanic: "the more you give the more you get")
  and **virality** (gift items rare enough that players recruit friends). Model
  gifts as **pure faucets keyed to social actions**, never as player-to-player
  transfers in the ledger.

**Auction formats** — an auction is the purest willingness-to-pay extractor; with
imperfect information the seller usually gets just above the *second-highest* bid,
not the maximum. Pick the format for the behaviour you want:

| Format | How it works | Note |
|---|---|---|
| Open (eBay) | any bid any time, highest wins | ends just above 2nd-highest WTP |
| Circle | turn-based bid-or-pass | once-around favors the last player; until-all-pass favors early bidders |
| Fixed-price | seller sets, buyers accept/decline | hardest *for the seller* to price |
| Silent / blind | secret simultaneous bids | needs a tie-break; "highest unique bid" variant |
| Dutch | price counts *down*, first to stop pays | most efficient (stops at top WTP) |
| Second-price (Vickrey) | top bidder wins, pays 2nd bid | makes honest max-bidding optimal |

- **Two orthogonal dials:** *who pays* (winner-pays = safe bidding; all-pay /
  some-pay = manufactured tension, war-of-attrition risk) and *where the money
  goes* (to bank = deflationary sink; to seller = zero-sum transfer; to a pool =
  redistributed). Route proceeds to the bank when the auction itself should be a sink.
- **Beware bidding-zero traps:** all-pay single-winner auctions escalate toward
  infinity, and item-drafts with items ≥ players make a zero bid dominant —
  collapsing price discovery.

## Pity / Gacha Math

For randomized acquisition, specify the full distribution — never just the base
rate (legal/ethical framing lives in monetization-ethics; the *math* lives here):

- **Base rate** — per-pull probability of the rare outcome.
- **Soft pity** — rate ramps up after N pulls without a hit (smooths variance).
- **Hard pity / guarantee** — a ceiling pull count that forces the rare outcome.
- **50/50 and banner mechanics** — losing the 50/50 guarantees the next; document
  the guarantee state machine, not just the headline %.
- Compute and document **expected pulls** and **worst-case pulls** (to hard pity)
  for every rate band. A "5% drop" with no pity has an exponential tail that
  punishes unlucky players invisibly. (Full-set math compounds fast: 10/10/10
  rarities at 10/30/60% ≈ 293 pulls for a set; 100 of each ≈ 5,000 pulls.)

## Economy Health Telemetry

Telemetry for an economy (questions it answers):

- **Average currency per player over time** — the single most actionable aggregate;
  flat = balanced, trending = inflation/starvation.
- Per-currency **balance distribution** by cohort — are whales draining sinks, are
  new players starved?
- **Faucet/sink ratio** per source and drain — which faucet floods, which sink is dead?
- **Sink coverage** — what fraction of minted currency is ever spent?
- Gacha **pulls-to-rare** distribution vs the designed pity curve.

## Anti-patterns

- A currency with faucets and no sinks — guaranteed inflation to irrelevance.
- Treating inflation as one phenomenon — applying a sink fix when the cause is
  demand-side drift (or vice versa).
- Pricing items in a player-dynamic/open economy as if you set the price — you
  control only the boundaries (rarity, availability, placement, restrictions).
- Tuning prices object-by-object with no faucet/sink ledger and no value chain.
- Soft currency convertible to premium, or premium cashable to money — an
  unintended real-money market.
- Publishing a gacha base rate with no pity ceiling — an invisible exponential
  worst-case tail.
- Modeling the economy only in a stats spreadsheet, never as a flow diagram —
  feedback loops stay hidden until live.
- Rewards that never go stale: the 100th identical drop still claimed as progression.
- Numeric ranges with no granularity headroom (1–10) in an expandable/live game.
- Player trades with no limits in a balance-sensitive game — gifting power to crown
  a winner (**kingmaking**) or farming new players.
- Modeling F2P "gifts" as player-to-player transfers — they are conjured faucets;
  mis-modeling double-counts or hides the real source.
- Auctions whose dominant strategy is bidding zero (all-pay single-winner; items ≥
  players) — collapses tension and price discovery.
- Server reset used as an inflation *fix* — it doesn't change positive-sum drift.
- An unbounded profitable conversion loop fed by an infinite source — players farm
  the money fountain and trivialise the tuned progression.
- A realistic simulated economy that collapses under player scale where stable,
  fixed-rate resource chains would give a predictable, tunable faucet (Ultima Online).

## Source Map

| Source | Used for |
|--------|----------|
| Schreiber & Romero, *Game Balance* (CRC Press, 2021), Ch 3 "Where to Start — Systems" | Time as a resource; resource types; the five mechanical characteristics |
| — Ch 5 "Finding an Anchor" | Granularity / numeric headroom; anchor-based fixed pricing |
| — Ch 6 "Economic Systems" | Economy archetypes; supply/demand & market price; invisible hand; volatility vs player count; marginal value; substitutes/complements; scarcity lever; supply-side vs demand-side inflation; the three inflation tools + resets; open vs closed economies + whale dynamic |
| — Ch 7 "Trading Systems" | Trade limits & costs; gifting as retention/virality; auction formats; payment & money-destination dials; bidding-zero traps |
| Robert Zubek, *Elements of Game Design* (MIT Press, 2020; Russian translation), Ch 4 | Conversion Chains & the Exchange-Rate Calculation — conversion chains and the chain-substitution exchange-rate calc (Diablo +3 gold/monster worked example); conversion-loop profitability and the unbounded-loop hazard; the four runaway-loop limiters (hard caps, outcome variance, raise running cost, dynamic tuning); stable fixed-rate chains vs realistic simulation (Ultima Online) |
