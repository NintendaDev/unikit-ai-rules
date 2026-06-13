---
version: 1.0.0
---

# Game Economy

> **Scope**: In-game economy method — the faucet/sink conservation model, currency taxonomy (soft/hard/premium/event), value chains (Cook), Machinations resource-flow notation, inflation and deflation guardrails, pity/gacha probability math, sink design, and economy health telemetry.
> **Load when**: designing currencies or resources, modeling faucet/sink flow, pricing rewards or shop items, designing gacha/loot/pity systems, checking for inflation or a stalled economy, drawing resource-flow diagrams.

---

## The Faucet / Sink Model

Every economy is a set of **faucets** (sources that create currency/resources)
and **sinks** (drains that destroy them). The economy's health is the relation
between them, not the size of either.

- **Faucet** — any rule that mints a resource: quest reward, drop, daily login,
  passive generation.
- **Sink** — any rule that destroys it: crafting cost, repair, upgrade, tax,
  consumable, decay.
- **Net flow** = faucets − sinks per cohort per time. Persistent positive net
  flow → inflation; persistent negative → starvation/grind. Neither is wrong by
  default — it must be a *chosen* target with a guardrail.
- The **faucet/sink ledger** per currency names every source and every drain,
  with rate estimates. A currency with faucets and no sinks is a
  design bug — it accumulates into meaninglessness (this is the resource-flow
  half of the core-loops rule, owned here for the math).

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

## Value Chains (Cook)

A value chain (Daniel Cook) traces how player **actions** convert into
**resources** and finally into **player value**:

- Each link adds value or it is waste: action → resource → upgrade → new action.
- **Reward staleness**: a reward loses value as the player accumulates it
  (the 100th potion is worth ~nothing). Curve reward *types* to the player's
  stage — early faucets feed needs, late faucets feed aspiration.
- Map the chain end-to-end before tuning numbers; a broken link (a resource with
  no meaningful spend) is found structurally, not in a spreadsheet.

## Machinations Notation (Adams & Dormans)

Model economies as **resource-flow diagrams** before building them:

- Primitives: **pools** (hold resources), **flows** (move them at a rate),
  **gates** (route probabilistically or conditionally), **sources/drains**
  (faucets/sinks), **converters** (X → Y), **traders** (exchange).
- Distinguish **deterministic** flows (a converter: 3 ore → 1 ingot) from
  **stochastic** ones (a gate: 5% drop) — they have very different variance and
  feel.
- The diagram makes feedback loops visible: a pool that feeds its own faucet is a
  positive loop (snowball); route it through a sink or a diminishing gate.
- The diagram is checkable on paper / by simulation before any playtest — spend
  playtests on perception, not on arithmetic the model already answers.

## Inflation & Deflation Guardrails

- **Open faucets + weak sinks = inflation**: prices rise, new players can't
  catch up, the currency becomes worthless. Add sinks that scale with wealth
  (escalating upgrade costs, repair, prestige resets, cosmetic money-burns).
- **Monotonic accumulation** (a currency that only ever goes up) signals a
  missing sink. A healthy currency oscillates around a band.
- **Soft caps** (sharply diminishing returns past a threshold) and **hard caps**
  (an absolute ceiling) bound accumulation — state which and why.
- Closed-economy items (resources that never leave once minted) compound
  forever; prefer **consumable** sinks for anything minted at scale.

## Pity / Gacha Math

For randomized acquisition, specify the full distribution — never just the base
rate (legal/ethical framing lives in monetization-ethics; the *math* lives here):

- **Base rate** — per-pull probability of the rare outcome.
- **Soft pity** — rate ramps up after N pulls without a hit (smooths variance,
  shortens the worst-case tail).
- **Hard pity / guarantee** — a ceiling pull count that forces the rare outcome
  (consumer-protection floor on the worst case).
- **50/50 and banner mechanics** — losing the 50/50 guarantees the next; document
  the guarantee state machine, not just the headline %.
- Compute and document **expected pulls** and **worst-case pulls** (to hard pity)
  for every rate band. "5% drop" with no pity has an exponential tail that
  punishes unlucky players invisibly — the worst case is the number that matters.

## Economy Health Telemetry

Telemetry for an economy (questions it answers):

- Per-currency **balance distribution** by cohort — are whales draining sinks,
  are new players starved?
- **Faucet/sink ratio** per source and drain — which faucet floods, which sink is
  dead?
- **Sink coverage** — what fraction of minted currency is ever spent?
- Gacha **pulls-to-rare** distribution vs the designed pity curve.

## Anti-patterns

- A currency with faucets and no sinks — guaranteed inflation to irrelevance.
- Tuning prices object-by-object with no faucet/sink ledger and no value chain.
- Soft currency convertible to premium, or premium cashable to money — an
  unintended real-money market.
- Publishing a gacha base rate with no pity ceiling — an invisible exponential
  worst-case tail.
- Modeling the economy only in a stats spreadsheet, never as a flow diagram —
  feedback loops stay hidden until live.
- Rewards that never go stale: the 100th identical drop still claimed as
  progression.
- Treating inflation as a bug to patch late instead of a guardrail to design in.
