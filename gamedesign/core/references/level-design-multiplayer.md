# Level Design — Multiplayer Level Design

Detailed competitive-multiplayer map method extracted from `level-design.md` (load on
demand when designing a PvP map, its topology, balance, spawns, or points of
interest). The main rule keeps the conceptual hook; this file holds the full topology
catalog, the balance math, and the spawn/POI rules. Source: Михаил Кадиков,
*Проектирование виртуальных миров. Теория и практика дизайна уровней* (Ridero, 2020).

## Multiplayer Level Design

**Character readability.** A fair PvP duel demands the player model **contrast** with
the environment — an extra second finding a camouflaged opponent loses the fight.
Avoid over-detailing (visual noise hides enemies); push complex detail *out of the
focus of battle* (e.g. above gameplay height), keep gameplay-level surfaces light and
clean. Light haze helps silhouettes pop. Watch vegetation: make large bushes
semi-transparent (can't hide behind), keep grass below waist height.

**Environment & flow.** Statistically the most popular arenas are **well-lit, sunny,
warm-palette**; night MP only works with heavy artificial lighting. Keep layouts
**simple and quickly memorable** — a maze reduces fun; **two or three main paths** is
enough. Protect movement speed: the #1 MP annoyance is **getting stuck on geometry**
(smooth the collision hull, use invisible smoothing surfaces); avoid 90° graph-paper
grids (sharp corners force braking — think racetrack, use smoothed corners); remove
multi-press climb barriers; size high-traffic spots (wide stairs, double doors) to
fit all fighters without choke-jams.

**Classic layouts (named topology primitives).** Combine these, but keep it simple:

| Layout | Shape & use |
|--------|-------------|
| **Circle** | a main loop + a few diameter cross-paths; players circulate hunting each other; best for deathmatch / constant-action play |
| **Figure-8** | two loops forced to intersect at a crossing point; ideal for objective team play (CTF, plant/defuse); crossing count sets tactical depth |
| **0 + 8** | Figure-8 + Circle, three intersections; universal — the optimal complexity ceiling (going to "8+8" turns the map into a maze) |
| **"Gut" / S-line** | an elongated S with one main route through all control points; for tug-of-war / sequential capture / payload escort; the last point sits near the enemy base |
| **Defense** | a central attractive structure (bunker/fortress) with bonuses and several access points; keep team balance so it isn't too strong for defenders |

**Balance.**

- **Mirrored layout** is the simplest way to guarantee equal starting conditions
  (both teams run equal distance to first contact). Break artificial symmetry
  without breaking balance by mirroring most of the map but flipping selected
  elements on the vertical axis too (180° rotation — *Nuketown*).
- **Timing calculation** balances *asymmetric* layouts: compute travel time so both
  teams reach each first-contact point simultaneously (whoever arrives first claims
  power positions). Levers: move spawns closer/farther; lengthen/shorten routes; slow
  one team with deliberate obstacles. (*CS:GO* "Dust2" first-contact times ≈ 12 / 6 /
  10 sec across its three chokepoints.)
- **Spawn placement.** For objective modes, move spawns **forward** as objectives
  fall (eliminates long cross-map runs and focuses combat on the next area). Surround
  the *first* objective with flank routes and cover (helps attackers vs a slight
  defender timing edge); place the *second* equidistant from both spawns; put the
  *final* objective on a narrow straight stretch by the defenders' base for a
  climactic last push.
- **Spawn protection.** Never give a spawn a single exit (it gets camped): **≥3
  exits** spread across opposite sides and different floors, each with a bulletproof
  window to check for campers. Make the spawn **physically inaccessible** to the
  enemy — a one-way invisible wall (stylized games) or a **height drop** /
  point-of-no-return (realistic games).
- **Points of interest / power positions.** Build arena play around contested
  strategically-valuable spots (high ground, fortified firing positions, resupply;
  in objective modes, the objectives themselves). **Core balance law: every
  advantage must be counterbalanced by a vulnerability** — a power position dominates
  one axis while exposing the holder on others (the dominant tower in *CS:GO* "Lake"
  is cornered if the enemy reaches its stairs and exposed from the balcony and the
  basement route).
- **Support all playstyles.** Treat the level as a third faction: an all-corridor map
  favors CQB weapons, an open one favors snipers. Provide a variety of spaces so
  every class/loadout has an equal chance (*TF2* "2Fort": sniper balconies, the
  double-jump bridge roof, the underground corridors).

## Anti-patterns

- Dark or maze-like maps.
- Over-detailed visual noise that hides enemies.
- 90° graph-paper grids and geometry that snags movement.
- A single-exit spawn that gets camped.
- A power position with no counterbalancing vulnerability.
- A layout that favors only one weapon class.
