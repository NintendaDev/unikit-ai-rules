# Design Frameworks — Elegance (Depth from Simplicity)

Detailed elegance-audit material extracted from `frameworks.md` (load on demand
when auditing a mechanic's depth-to-complexity ratio or deciding whether to add or
cut a mechanic). The main rule keeps the conceptual hook (elegance =
depth ÷ complexity; depth from interaction; remove the inessential); this file
holds the full "smells of elegance" heuristics catalog and the Hellion-vs-Reaper
worked comparison. Source: Tynan Sylvester, *Designing Games* (O'Reilly, 2013),
Ch 1–2.

## Elegance — Depth from Simplicity (Sylvester)

**Elegance** is Sylvester's core design heuristic and is **genuinely new vs. everything
in `frameworks.md`** (Schell does not cover it): **maximize the emotional power and
variety of the experience while minimizing the costs — player comprehension burden and
developer effort.** Phrased as a ratio, **elegance = depth ÷ complexity**: how much
emergent experience a mechanic yields per unit of rules the player must learn and the
team must build/balance. Checkers' few-minute ruleset generates millions of distinct
games — that is elegance; tic-tac-toe (low ceiling, quickly "solved") is its opposite.

- **Every mechanic has a cost** — dev time, compute, narrative/marketing pull, and most
  expensively **player attention**. A mechanic earns its keep only if its depth pays back
  that cost. The design move is *subtractive*: like a sculptor revealing the form in the
  marble, **remove the inessential** rather than pile on.
- **Depth comes from unpredictable *interaction*, not from more parts.** Combining simple
  mechanics that **multiply** (not merely add) produces a combinatorial explosion of
  emergent situations — "shoot, look, run" is a tiny ruleset behind a multi-billion-dollar
  genre. **Mechanics that interact with many other mechanics are deeper; mechanics that
  interact with one or two are not.**

### "Smells of elegance" — heuristics to judge a mechanic

You can't pre-compute every outcome of an elegant system, so judge by trained intuition.
A proposed mechanic **smells elegant** when it:

| Heuristic | Smells elegant when… | Anti-pattern (inelegant) |
|---|---|---|
| **Interaction count** | it interacts with many other mechanics (other units, terrain, allies, even itself) | it touches only one thing (a staff that *only* hits goblins) |
| **Simplicity** | the rule fits on a napkin and feels obvious *once learned* | it needs tedious math/rounding or a manual to use |
| **Multi-use** | one tool serves offense *and* defense, tactics *and* strategy (Resident Evil's gun both kills and stalls zombies) | it does exactly one thing |
| **Distinct role** | it opens a genuinely new kind of play, not a re-skin of an existing role | it duplicates a role another mechanic already fills (= ballast) |
| **Reuse of conventions** | it leverages symbols/controls players already know (genre-standard schemes, archetypes) | it invents novelty with no payoff, taxing comprehension for nothing |
| **Tight scaling** | its numeric ranges mesh with the game's other ranges, yielding many natural interactions without hard math (Magic: The Gathering) | mismatched scales force ugly conversions and kill interactions |
| **Repeatability** | it can be used thousands of times and still generate fresh experience each time | it's a one-shot trick — cost:payoff is locked at 1:1, so it can't be elegant |
| **No content restriction** | it works with existing content | it forces redesign of everything around it (a 6-metre jump forces every level to be re-walled — a *hidden* cost paid for years) |
| **Full interface use** | it wrings every nuance out of the existing input (analog angle, trigger pressure, hold/release) | it adds hardware/input the depth doesn't justify |

- **Elegance is hard *because* it's interconnected.** In an inelegant game a bug is a
  local fix (nerf the goblin-only staff — no side effects). In an elegant game every knob
  touches everything, so tuning is harder — but interconnection is the *only* source of
  lasting depth. **Accept harder tuning as the price of emergence.**
- **Content restriction is the most-missed cost.** A change that improves the prototype
  *now* but forces the rest of the game to be built around it (a jump height, a room size,
  a vehicle) carries a hidden cost spread over years and usually larger than it looks.
  Benefits are concentrated and immediate; costs are diffuse and deferred — which is
  exactly why this trap is so common. **Prefer mechanics that work with existing content.**
- **Elegant often looks boring.** The most elegant mechanic can seem prosaic next to a
  flashy gimmick; judge by the *space of possibilities it opens in play*, not by how
  exciting it looks on paper.

### Example — elegance is depth, not flashiness (StarCraft II: Hellion vs. Reaper)

Two Terran units share the same role (fast, mid-cost, area-damage skirmishers). Both are
equally simple to build and learn — equal **complexity**. The Reaper *looks* flashier;
the Hellion was the one Blizzard kept, because it has more **depth** per unit of
complexity:

| Stat | Reaper (circular AoE) | Hellion (line AoE) |
|---|---|---|
| Speed | 4 | 4.25 |
| HP | 140 | 90 |
| Attack | 15 dmg + 20-dmg shockwave to all *adjacent* units (circle around self) | 8-dmg flame in a *line*; +6 vs. light (+5 more with upgrade) |
| Attack cooldown | 1 s | 2.5 s |

- The Reaper's **circular** burst rewards being *surrounded* — which a smart opponent
  simply avoids; its short range gives **no synergy** with terrain or allies, and its fast
  cadence means you throw it in and hope. Its play space is **narrow and predictable** —
  low skill ceiling.
- The Hellion's **line** attack makes effectiveness depend on **geometry**: enemies in a
  row get melted; surrounded, it hits one and is near-useless. Its range lets it shoot
  from behind cover/allies and knock units off ledges; its **slow cadence** enables
  hit-and-run micro (fire, reposition to line them up, fire). Same complexity, **far more
  tactics, situations, and skill expression** — that is elegance.

**Takeaway:** when two mechanics fill the same role, keep the one with the higher
depth-to-complexity ratio and cut the other — a duplicate role with less depth is ballast.
