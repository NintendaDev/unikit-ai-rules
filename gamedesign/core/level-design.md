---
version: 1.0.0
---

# Level Design

> **Scope**: Level and content design method, theory and practitioner craft. The architecture of game spaces (space schemas, Alexander's pattern lens, function-first layout, the level's structural anatomy, landmarks, virtual-scale cues), bubble diagrams, scale & proportions, modular kit construction, pacing (beat sheets, intensity graphs, the interest curve, the kishōtenketsu structure, whole-game macrostructure), the "gym" mechanic-teaching pattern, level memorability (the signature hook and the wow-moment palette), atmosphere & believability, environmental storytelling, the psychology of perception and of horror, navigation/readability/wayfinding and the diegetic signal palette, movement organization and exploration incentives, the object-readability "visual language", combat encounter design (focus, front line, cover, waves, allies), sandbox design (vantage points, tools, nonlinearity), multiplayer layout & balance (classic topologies, spawns, points of interest), movement/combat metrics, and the metric-driven greybox→whitebox→final production pipeline.
> **Load when**: designing levels, encounters, or content layout; laying out a game space or choosing a spatial schema; deriving form from real-world function; setting scale, proportions, or world-standard metrics; building a modular kit; pacing a level, session, or campaign; plotting an interest curve or the early-mid-end-game arc; making a level memorable or staging a wow-moment; building atmosphere, believability, or environmental storytelling; tuning perception (detail, color, space) or designing horror; leading the player without UI markers; choosing wayfinding signals; organizing movement, loops, and exploration rewards; designing object visual-language readability; designing combat encounters, cover, front lines, flanking, or wave attacks; designing a sandbox with vantage points and tools; designing a competitive multiplayer map, its spawns, balance, and points of interest; setting movement or combat metrics; running the greybox→whitebox→final production pipeline.
> **References**: `.unikit/memory/gamedesign/core/references/level-design-combat-encounters.md` (combat encounter structure — focus, front line, flanking, cover taxonomy & placement numbers, wave staging, allies), `.unikit/memory/gamedesign/core/references/level-design-multiplayer.md` (competitive PvP maps — readability, classic topologies, balance math, spawns, points of interest), `.unikit/memory/gamedesign/core/references/level-design-metrics-production.md` (metrics derivation, AI-friendly space, the 4-stage greybox→whitebox→final production pipeline), `.unikit/memory/gamedesign/core/references/level-design-horror.md` (the 13-technique / four-lever horror taxonomy), `.unikit/memory/gamedesign/core/references/level-design-sandbox.md` (sandbox design — vantage points, tools, nonlinear gameplay sections).

---

## Architecture of Game Spaces

Schell frames the level designer as a **kindred of the architect**: the purpose
of architecture is not the building's outward form but **shaping the occupant's
experience** — neither architect nor designer makes the experience directly,
both use *indirect control* (below) over a space people enter to use. Virtual
space removes physical constraint (no gravity, no cost of stone), which is freedom
and burden both: when anything is possible, decide the **organizing principle of
the space first**. Schell's five canonical space schemas (complement, don't
replace, the bubble graph — they name the *shape* a graph takes):

| Schema | Shape | Use it for | Examples (Schell) |
|--------|-------|-----------|-------------------|
| **Linear** | one path forward/back, or a loop | tight, authored pacing | Mario, Crash Bandicoot, Guitar Hero |
| **Grid** | tessellated cells (square/hex/tri) | readability, fair proportions, easy sim | chess, Advance Wars, Minecraft |
| **Web** | nodes joined by edges | several destinations, multiple routes | Trivial Pursuit, Zork, Puzzle Quest |
| **Points in space** | isolated nodes in open void | wander-and-return (oasis) loops, sandbox | Animal Crossing, Final Fantasy |
| **Divided space** | regions of varied shape/size | territory / map control | Civilization, Spore, Axis & Allies |

Schemas combine (Clue = grid + divided; baseball = linear + points). Pick one
deliberately against the pillars, then sketch the functional skeleton, then the
bubble graph.

**Landmarks anchor memory.** A space without landmarks is the "maze of twisty
passages, all alike" — disorienting and forgettable. A landmark (tall, bright,
unique, a vista) is what players *remember, talk about, and navigate by*; build
them in to make a space legible and memorable. (This is the spatial-memory role;
the eye-pull role lives under Navigation & Wayfinding; the level-identity role
under Memorability.)

**Christopher Alexander — "the quality without a name."** Alexander (*The
Timeless Way of Building*, *A Pattern Language*) catalogued what makes a built
space feel *alive*: a quality that resists definition but is unmistakable on
contact — spaces that feel alive, whole, comfortable, exact, free of inner
contradiction. Schell's strongest borrowings for level layout:

- **Inner-contradiction audit** — a space (or rule) that fights its own purpose
  is the root of bad design. Name the space's intent, then strip anything that
  contradicts it rather than excusing it.
- **The cycle / "pave the desire paths"** — Alexander's advice: *don't lay the
  paths; sow grass, watch where people wear trails, then pave those.* Greybox,
  playtest, observe the routes players actually take, then build to them.
- **Pattern lens** — *A Pattern Language* gives ~253 reusable spatial patterns
  (each carrying the quality). Treat level motifs as a pattern library;
  distilled actionable heuristics below.

**Alexander-style spatial patterns (distilled as level heuristics):**

| Pattern | Level-design heuristic |
|---------|------------------------|
| Levels of scale | Nest scales — room inside zone inside world; let easy spaces unlock harder ones (mirrors the fractal interest curve). |
| Strong centers | Give each space a dominant focal point (the boss, the objective, the landmark) the eye and the goal resolve to. |
| Boundaries | Define the space with deliberate edges (walls, fences, light falloff); a boundary makes the inside read as a place. |
| The void | A large *empty* space around a strong center amplifies it — the boss alone in a vast hall. Don't fill every meter. |
| Contrast | Adjacent spaces should differ (bright/dark, open/tight, calm/lethal); contrast is what makes each one register. |
| Gradients | Let qualities change gradually across the space (rising difficulty, thinning cover) rather than in flat steps. |
| Echo | Repeat related motifs (a boss sharing silhouette with its minions; a recurring shape) for cohesion. |
| Not-separateness | Every element should feel bound to its surroundings — props, geometry, and rules that read as one place feel alive. |

**Virtual-architecture realities (Schell):**

- **Mental maps are relative, not absolute** — players store "which door leads
  where," not a true floor plan. A 3D space need not have a coherent 2D map;
  what matters is what the player *feels* moving through it. Spaces can overlap,
  defy physics, and waste volume and still read fine.
- **Scale needs anchors** — virtual space lacks the real-world cues (stereo
  vision, your own body) that fix scale. Tie world units to **real units
  (meters/feet)** so a 15-unit car is obviously wrong, and anchor scale with
  **humans and doorways** (the two strongest scale references). See *Scale &
  Proportions* for the practitioner method.
- **Third-person distortion** — a correctly-proportioned interior feels cramped
  in third person (the camera sits meters behind the avatar). Fix per the
  *Max Payne* recipe: **enlarge the room, slightly enlarge furniture, and spread
  it out** so the space reads right with a trailing camera.

## Think Like an Architect: Function-First Layout (Kadikov)

The level designer ≠ the environment artist. The artist owns the visual style and
set dressing; the designer owns *gameplay* — the functional organization of space.
Work like an architect who designs **functional** space, but bend every choice to
the needs of play. The practitioner method that makes a space believable *and*
playable:

**Form follows function.** Do not build abstract gameplay spaces and bolt meaning
on afterward. Assign every building and every room a **real-world function first**;
gameplay hooks, a memorable silhouette, and meaning then fall out of that function
(Sullivan's "form follows function"). A space's exterior should read as a
consequence of the process happening inside it. Replace generic crates/barrels
with **context-appropriate cover** dictated by the room's function. Make functional
elements double as mechanics where possible (a bank vault that is itself an
elevator; a mansion's switch-driven transforming rooms with mechanism cavities that
double as hidden routes — *Dishonored* series).

**From large to small.** Decide the constituent elements *and their functions*
before building anything; decompose top-down by scale and list the real systems
each level needs:

| Scale | List & select the functional systems it needs |
|-------|-----------------------------------------------|
| City | districts (business/residential), parks/squares, industry, infrastructure (bridges, towers, power lines), civic services (police/fire/post/hospital/school), transit (rail/metro/bus), lighting, drainage — pick only what the level actually uses + the best gameplay/story sites |
| Military base | fortifications (checkpoints, walls, watchtowers, trenches, bunkers), living/training (barracks, mess, medical, range), storage (provisions/ammo/fuel), garages, power + perimeter lighting |
| Street | road + pedestrian ways, parking, transit shelters, storm drainage (channels/manholes/grates), urban signage (house numbers, street names, road signs, markings), street furniture (benches, meters, hydrants, light masts) |
| Building / interior | give each room a function and detail it accordingly |

**Logic & common sense.** Players subconsciously compare every space to reality —
honour real-world logic down to small details so nothing contradicts it (an
oversized crate that can't fit through its room's small door breaks immersion; fix
by resizing the door *or* the prop). Match the chosen key elements to the intended
combat range: enclosed spaces (interiors, caves, alleys) for melee/CQB; open spaces
(long streets, bridges, rooftops, sparse-cover deserts) for sniping/long range.

**Anti-pattern: corridor design.** Monotonous corridors stuffed with identical
crates/barrels, the abstract-space-then-styling pipeline — cheap, common in sci-fi,
and it guts world quality. Prefer architect-first placement of functional buildings
on the terrain for organic, believable levels.

## Anatomy of a Level: Structural Geometry, Props, Decals, Background (Kadikov)

Any level decomposes into the same fixed layers regardless of engine. Knowing them
lets you plan detail budgets and production order:

| Layer | What it is | Craft rule |
|-------|-----------|-----------|
| **Structural geometry** | the "body" of the level — all mass that defines space (buildings, roads, squares, bridges, tunnels, shafts; for natural levels: terrain — cliffs, caves, ravines). Strip all props and this is what remains. | Block this out first; it carries the layout and the metrics. |
| **Props (environment details)** | objects that dress the low-detail structural geometry, in three size tiers — **large** (structures, fences, vehicles, trees), **medium** (furniture, signage, containers), **small** (bottles, rocks, grass, litter). | Budget detail by **proximity of inspection**: the closer the player can examine an object, the higher its poly count, texture resolution, and material complexity. |
| **Decals** | projected images that fake detail cheaply — cracks, stains, graffiti, vents, ads, road markings, puddles. | Use decals to simulate complex geometry on flat/damaged surfaces instead of modeling it (*Fallout 3* does almost all damage detail this way). |
| **Background** | everything beyond the playable space, sold to imply a large believable world (skybox, vista, distant city). | Make far-visible event consequences (smoke, fireworks) readable here for wayfinding. |
| **Lighting / Audio & VFX / Gameplay functionality** | the dynamic and interactive layers. | Covered under their own sections (Atmosphere, Visual Language, Combat). |

## Layout: Bubble Diagrams & Graphs

Design the **topology before the geometry** (The Level Design Book):

- A **bubble diagram** is a node-edge sketch: nodes are spaces (rooms, arenas,
  hubs), edges are connections (doors, paths, gates). It captures flow and
  gating without committing to art or metrics.
- Read the graph for structure: **loops** (return paths — reduce backtrack
  tedium, enable shortcuts), **gates** (lock-and-key pacing), **hubs**
  (branching choice), **bottlenecks** (forced story/encounter beats).
- A purely linear graph is a deliberate choice (tight pacing), not a default;
  so is an open graph (exploration). Name which and why against the pillars.
- For large multi-area levels add a **block-schematic / flow chart** that names
  each location and the order the player visits them.

## Scale & Proportions (Kadikov)

Set scale the **moment you open the editor**, before anything else — small errors
compound and can force a full rebuild. Distrust first-person view; it lies about
scale. The practitioner method:

- **Anchor with human-tied objects.** Judge scale from things sized by the human
  body — door openings, stair-step height, wall height, tables/chairs, handles,
  switches. Drop human- and vehicle-sized reference models into the scene the
  instant you lay terrain or blockout. Never judge scale from terrain or
  industrial structures alone — they are *scale-blind* (their size is set by
  function and varies wildly). Tie world units to real meters.
- **The 1.25× cap.** Never scale an asset that wasn't authored for scaling by more
  than **¼ (1.25×)** — beyond that, proportion errors become visible to the naked
  eye. Keep scale **constant** for identical objects across the level; the same
  model at different sizes reads as fake. Prefer **1:1** for landmarks now that
  engines allow it (*AC Syndicate*'s London; *Witcher 3*'s Kaer Morhen).
- **World standards from character metrics.** Define a dimension system derived
  from the character's **collision габариты** (height *and* width in every pose:
  standing, crouching, sitting, prone). Derive *all* environment dimensions from
  these — door width, ceiling height, step height. Size the world to the **largest**
  relevant enemy (bigger AI needs wider corridors/stairs: *Doom* 2016 widens
  stairs/corridors **~3×** once big monsters appear). Plan with **headroom, not the
  bare minimum** — the minimum only stops the player getting stuck; too-tight space
  traps the player or AI mid-fight. Standardized sizes also *teach* a mechanic (jump
  one gap, learn your max jump).
- **Deliberate distortion as style or mechanic.** Breaking proportions on purpose
  can become a signature look (*Gears of War* enlarges all set dressing — wider
  doors, thicker columns — so bulky armored characters take cover comfortably) or a
  core mechanic (shrink/grow weapons; scaling set dressing to fake giant characters,
  as in *Bulletstorm*'s miniature-skyscraper cover). Do it knowingly, never by
  accident.

## Modularity (Kadikov)

A modular kit is a standardized library of parts that snap to each other and to
other assets. **Minimizing the number of unique modules is the key to a good kit** —
mix, rotate, scale, and recombine a few pieces to dress most of the world.

- **Start the kit only after the greybox gameplay prototype is approved.** Before
  modeling, lock down two things: the **snapping rules** for joining modules at
  various angles, and the **standardized module sizes**.
- **Use a power-of-two grid: 512 / 128 / 64 / 32.** Larger cells are easier to
  author on. **Pivot points must also sit on the grid** (snap pivots, not just
  geometry) for perfect mating.
- **Production order:** structural geometry → detail props → unique one-off
  elements.

| | Modularity |
|---|---|
| **Pros** | faster production (fewer people make more levels); designer can swap modules without an artist; update the library once → propagates to every level; performance (fewer unique objects/textures → faster loads, less VRAM). *Gears of War* reuses ~**90%** modular elements. |
| **Cons / risks** | complex to set up (needs both grid discipline and art skill); **visible repetition** (counter with creative recombination and unusual reuse); **grid sterility** — modules snapped to 45°/90° kill realism. |

**Cure for grid sterility → artistic disorder.** Place objects *off the grid*, tilt
structures, minimize right angles, use curved/rounded forms — the fewer straight
angles, the more believable, especially for natural landscapes (this is the explicit
fix for the modular look; see also Atmosphere).

## Pacing: Beat Sheets & Intensity Graphs

- A **beat sheet** lists the ordered moments of a level (arrival → first threat →
  puzzle → setpiece → rest → climax → exit) — the level's score.
- An **intensity graph** plots tension over time. The shape, not a flat line, is
  the design: a **sawtooth** (rise–release–rise, each peak higher) sustains
  engagement; **rest beats** (safe rooms, vistas, downtime) make the next spike
  land. Continuous high intensity numbs; continuous low bores.
- Pace **mechanic density** too: introduce, let breathe, then combine — don't
  stack three new mechanics in one encounter.
- **Tempo via movement speed (Kadikov).** Slow the player with obstacles that
  force a stop/think (a superior enemy that must be stealth-bypassed, puzzles,
  detail-rich rooms with loot/scripts); speed them up with time limits (ticking
  bomb, timed evac, draining air), flight from danger (chase, collapsing
  environment), or pursuit. In sandboxes a player who sticks to one style flatlines
  the tempo — periodically force a style change.
- **Levolution / scenery change (Kadikov).** In-match triggered events that reshape
  a level's look *and* layout (term coined by *Battlefield 4* — topple a skyscraper,
  fight on its rubble) renew pacing; low-budget version is reusing one space with a
  weather/visual re-skin (*Left 4 Dead 2* "Hard Rain" flooded re-skin).

## Interest-Curve Pacing (Schell)

Schell's **interest curve** is the intensity graph named by its parts. An
experience is a *series of moments*; the curve plots how engaged the guest stays
over time, and its **shape is the design**. The canonical good shape:

- **Initial interest** — the player arrives with interest set by expectation
  (packaging, marketing, word of mouth). Useful, but pitch it *not too high* —
  over-promising makes everything after feel flat.
- **The hook** — an early intensity spike ("stop and look": Hamlet's ghost, a
  guitar riff, an opening cutscene/setpiece). The hook buys patience through the
  slower establishing beats that follow.
- **Peaks and valleys** — interest *rises overall*, with each peak a little
  higher and brief dips between (rest beats) so the next peak lands. This is the
  sawtooth above, with explicit vocabulary.
- **Climax** — a final peak that eclipses all prior ones.
- **Residual interest** — leave the player wanting more (interest at exit higher
  than at entry): "always leave them wanting more."

The classic failure curve: weak/absent hook → interest decays past the
**quit threshold** (the channel-change / close-the-game point) → late spikes
arrive after the player has already mentally left.

**Fractal curves** — the curve nests. A challenge has its own curve, inside a
level's curve, inside the whole game's (and, for multiplayer/live, a
session-over-session meta-curve). When a level has a *flat segment*, either cut
it or give players a shortcut past it (Schell's *Aladdin* magic-carpet fix).

> Note (vs intensity graph above): "intensity graph / sawtooth / rest beats"
> and "interest curve / hook / climax / fractal" describe the **same shape** in
> two vocabularies — no contradiction; use whichever the team speaks.

**What raises interest** (calibrate, don't just count peaks): *inherent
interest* (risk > safety, fantasy > reality, novelty > routine), *poetry of
presentation* (aesthetic quality of delivery), and **projection** — empathy and
imagination pulling the player into the world; deep projection (the player *is*
the protagonist) is interactivity's edge and can carry low inherent interest
(e.g. Tetris).

**Example — interest-curve beat table for one level** (intensity 0–10):

| Beat | Moment | Intensity | Curve role |
|------|--------|-----------|-----------|
| 1 | Arrival vista / cinematic reveal | 5 | initial interest from expectation |
| 2 | First ambush on entry | 8 | the hook |
| 3 | Quiet traversal + lore / breather | 3 | valley (rest beat) |
| 4 | Skill-gate puzzle or arena | 7 | peak 1 |
| 5 | Safe room, save point, vista | 3 | valley |
| 6 | Escalated encounter (combine mechanics) | 8 | peak 2 (higher) |
| 7 | Short tension lull before the door | 4 | valley |
| 8 | Boss / setpiece | 10 | climax |
| 9 | Exit reward + tease of next zone | 6 | residual interest |

## Macrostructure & Content Arcs (Zubek)

The intensity graph and interest curve above pace a *level*; Zubek (*Elements of
Game Design*, Ch 6) names the largest scale — **macrostructure**, the content arc
across the *whole* game — and how to pace it even when no story drives it.

**The three-act arc applies to non-story games.** Borrow theatre's setup →
confrontation/rising-action → resolution shape for the campaign, and apply it even
to games with zero narrative as **early game → mid game → end game**:

| Stage | Character | Tune for |
|-------|-----------|----------|
| Early game | orientation, exploration, gathering, base-building; low tension, recoverable mistakes | teaching and a gentle on-ramp |
| Mid game | the "real" game — obstacles, conflict, fighting for resources; rising intensity | the bulk of the depth and challenge |
| End game | difficulty/conflict peak, push to resolution (win, score-max, completion) | a climax that overshadows the rest |

Players and reviewers critique games *per stage* ("the mid game drags", "the end
game is poorly tuned"), so design and tune each stage as a distinct experience.
Stage length and intensity vary by genre (an RTS saves its biggest battles for the
end; Monopoly's notorious flaw is a long, low-tension end-game war of attrition).

**Compose the campaign from nested episode arcs.** Split a long game into episodes
— by region, quest-line, or level — each a small setup→rise→resolution arc, while
the player advances the larger arc underneath. Episodes are the lever for *varying*
stress and intensity; sequence runs of easier beats punctuated by harder ones for
surprise and drama, and use **filler / breather episodes** (optional side content,
open encounters) to relieve pacing without advancing the main arc.

**Pacing rest tactics — exploration vs busywork.** Lowering intensity between peaks
has two cross-genre tools: *exploration* (self-paced wandering and experimentation,
read positively) and *busywork* (travel, gathering, crafting chores that
deliberately spend time but feel pointless unless made interesting between
challenges). The "vary intensity, never sustain high, insert rest beats" core is
the intensity-graph rule above — Zubek adds this rest-tactic split and the caution
that systems-driven games must make tempo *emerge* from systems and loops, which is
harder than hand-placing it (Left 4 Dead 2's auto-pacing "Director" was criticised
for predictability — proof that good pacing is hard).

**When there is no authored plot, make the macro-arc emerge from systems.** In
simulation/sandbox games you cannot hand-place a content arc, so generate one: gate
new abilities over time with **tech trees / crafting** (Civilization, Factorio);
use **achievement-gated eras/ages** that unlock abilities and rebalance the game
for a visible arc (Tropico 5's nation-building eras); inject **random events**
(droughts, fires) that spike difficulty and disrupt long-term plans (Caesar,
CityVille). Still plan the macrostructure explicitly — players perceive distinct
early/mid/end stages whether or not you authored them.

## Memorability: The "Изюминка" & Wow-Moments (Kadikov)

A level built only from the **cliché base** (the stock image of the location a
player already recognizes) reads as forgettable filler — accurate but faceless
"grey-mass" levels. Make every level a two-part structure: cliché base **+ one
signature hook** (*изюминка*) that makes it stick. Five levers to source the hook:

| Lever | How | Example |
|-------|-----|---------|
| **Thematic contrast** | fuse two clashing themes into one space, or drop one out-of-place object into an ordinary one | *Crysis* frozen jungle; *Black Ops* "Nuketown"; pool atop a Nepali skyscraper (*Uncharted 2*) |
| **Landmark / attraction** | one signature landmark — *use it to name the level*; anchor the area's backstory to it | *Fallout: New Vegas* tower visible across the desert; *Spec Ops: The Line* sand-buried Dubai |
| **Expressive image** | manufacture identity from weather + lighting, with a gameplay consequence | *Left 4 Dead 2* "Hard Rain" downpour that floods the town and wrecks visibility |
| **Gameplay gimmick** | one unique mechanic/scenario that exists only there; in MP, a contested attraction/trap | *Dishonored 2* "A Crack in the Slab" time-jump; *TF2* "Sawmill" twin saw traps |
| **Three-in-one** | stack three hooks that *causally interlock*: an art image → that produces a gameplay condition → that yields a story state | *Dishonored 2* sandy district: wind turbines → sandstorms drop visibility → buried, depopulated quarter |

**Wow-moments** are key on-level events engineered to maximally impress and renew
the player's drive to continue — pitched at Hollywood scale, interactive or
scripted. Place them at three points with three jobs (this is the interest-curve
hook/peak/climax as an explicit level checklist): at the **start** to hook and set
mood; in the **middle** as a peak that shifts pacing and introduces new mechanics;
at the **end** as a reward that raises interest in the next beat. Tie them to
gameplay where possible (an impending catastrophe that forces the player to rush
forward, each advance triggering the next beat). A palette of set-piece types:

| Wow type | Craft |
|----------|-------|
| **Catastrophe** | natural (quake, tsunami, avalanche, flood) or man-made (crashes, dam/plant disasters) |
| **Hypertrophied scale** | exaggerate on-screen scale — masses of vehicles/troops, or oversize the enemies (titans, planet-ships); sheer quantity reads as triumph, destruction optional |
| **Impressive panorama** | achieve by *contrast* — trap the player in a dull, cramped space (cave/tunnel/interior), then reveal a vast detailed vista |
| **Shocking violence** | for 18+ titles, excess cruelty drives most wow-moments |
| **Quiet beauty** | rare calm communion-with-nature beats as a pacing valley/contrast |

Sourcing test: mine real disaster/combat footage — if it takes your breath away and
makes you think "what would I do here?", it is strong wow-moment (or whole-level)
material.

## Kishōtenketsu (Hayashida)

Nintendo's four-part level structure (Hayashida, on *Mario* design) teaches
without text or failure:

1. **Ki (introduce)** — present the mechanic in total safety; the player can't
   die learning it.
2. **Shō (develop)** — let the player use it deliberately, raise the stakes.
3. **Ten (twist)** — recontextualize it: a new combination or surprise use.
4. **Ketsu (conclude)** — a mastery test combining the prior beats.

The structure scales from a single room to a whole level. Its core lesson:
**teach in safety, test under pressure** — never the reverse.

## The Gym: Teaching Mechanics

- Teach **one mechanic at a time** in a controlled space ("the gym") where the
  consequence of failure is near-zero, then escalate (overlaps the ux-onboarding
  rule — that rule owns the FTUE method; this rule owns the *spatial* teaching).
- Teach **by doing**, not by tooltip: a gap that requires a jump teaches jumping
  better than a "press A to jump" popup.
- Sequence: **teach → test → combine → twist**. Every mechanic introduced earns
  a payoff beat later, or it was noise.
- **Diegetic tutorials (Kadikov).** Embed teaching in the environment to preserve
  immersion instead of breaking it with pop-ups: wall writing ("cut off their
  limbs" — *Dead Space*), a zombie already killed by a sawblade that hints at the
  gravity-gun strategy (*Half-Life 2* "Ravenholm"), live test rooms that demo a
  weapon on a real enemy (*Prey*).

## Atmosphere & Believability (Kadikov)

Immersion scales with atmosphere — an emotional environment built from many small
details. Five sub-principles to make a world *live*:

- **Imitate nature & weather** — day/night cycle, light optics, reflections, rain,
  fog, dust; extreme weather reads most dramatic, and it must affect the character
  too (wind-blown hair, wet clothes, visible breath in cold).
- **Imitate motion (the "breathing" world)** — animate foliage, flags, signs,
  floating dust/litter; make windmills/watermills actually run. A static
  environment reads subconsciously as a fake.
- **Artistic disorder / off-grid placement** — tilt structures, minimize right
  angles, use curved corridors and rounded forms (the cure for modular-grid
  sterility).
- **Imitate the audio background** — global + local ambience, per-room-type
  reverb, and **off-screen audio** so the player's imagination reconstructs unseen
  events (*Half-Life 2*'s off-screen apartment "beating" that never physically
  happens).
- **Physics & interactivity** — throwable/breakable props, ragdolls, many
  interactive objects.

**Consistency & believability.** Keep the visual style consistent and convey both
*place* and *time* authentically. If a location copies a real place, research the
prototype deeply (style, layout, proportions, terrain) — you need not build a 1:1
copy, just recognizable iconic details + atmosphere. Match the era in architecture,
clothing, daily life, and technology. (Random gibberish foreign text and stereotype-
built locales instantly break immersion for players who know the real place.)

**Simulation of life.** Populate the world with believable NPC behavior; people
love watching people. Include characters of *all* ages and signs of family life to
imply a real life-cycle. Scale background-activity complexity to world size, let
life continue *beyond* the level bounds and into the distance, stage social
crowds/events as attractors, and add player-independent random events to prove the
world lives by its own rules (let them double as gameplay choices — intervene or
observe).

## Environmental Storytelling (Kadikov)

> This is shared with the **narrative** rule (which owns story structure); here is
> the *level-design* craft of telling story through space.

**Telling clues — the detective model.** Events the player didn't witness can only
be known indirectly; treat the player as a detective reconstructing a scene from
physical clues (props, decals, audio/visual FX). Place clues at maximum visibility
so they read subconsciously, no on-screen text. Clue clusters do six jobs:
reconstruct a past event; build atmosphere / foreshadow danger; characterize an
enemy before first contact; signal a safe vs unsafe space; flesh out a character via
their dwelling; embed diegetic tutorials. Clues can double as wayfinding signposts
in repetitive spaces (*Portal 2*'s wall messages across near-identical chambers).

**Local vs global events.** *Local events* are small self-contained vignettes whose
traces never leave one space (the *Metro 2033* corpse-and-shell-casings tableau);
use many for depth and local atmosphere. *Global events* paint world state across
the whole environment — the setting must visibly carry the consequence of the
world-changing event (*The Last of Us*' 20-years-overgrown cities; *Dishonored*'s
plague-split Dunwall). A third channel — notes, audio logs, video — supports both
but has one cost: it forces the player to stop and actively focus.

**Focusing attention (composition craft).** Three techniques to lock the eye on a
target without UI: place story scenes on **forks/junctions** so they're unmissable
whichever branch is taken; use **frame-in-frame** (environment geometry as a natural
frame, e.g. staging scenes at lift exits and doorways); set **deliberate obstacles**
before a new area that force a detour past story or supplies.

## Psychology of Perception (Kadikov)

**Detail — the 15-20-minute rule.** Players form their verdict on graphics within
the first **15-20 minutes**, judging by comparison to other games — so make opening
levels maximally detailed. Front-load high-detail **rounded/curved objects** early
(fidelity is hard to judge from rectangles). The **first occurrence** of any vivid
event burns into memory as the reference standard and keeps its emotional charge on
every repeat — so lavish detail on first encounters (new enemy, first spectacle) and
cheaply simplify later repeats; memory papers over the gap. Detail whatever the eye
is fixed on (MP spawn points, vista cliff-edges).

**Color.** Use color **temperature** for mood: warm/orange = warmth, safety;
prolonged cold (blue) = loneliness, isolation; red = anger and reads subconsciously
as danger. The same space reads differently by color — **cool tones expand** a
space, **warm tones shrink** it; light objects feel lighter, dark heavier. A unique
per-level palette boosts memorability; the art director usually delivers it as a
**color script** covering every location.

**Space.** Shape geometry to evoke targeted emotion:

| Target feeling | Geometry |
|----------------|----------|
| Claustrophobia / panic | narrow corridors restricting maneuver; flooded rooms (limited oxygen forces decisions); reduced view distance via fog/dark/restricted FOV |
| Release / liberation | a sharp closed→open contrast |
| Vulnerability | open cover-less ground makes a lone figure an obvious target; cover that doesn't cover from above still exposes (standard for boss arenas — keep the player moving cover-to-cover) |
| Dwell vs flow | a **square is static** (invites rest — hold the player here); a **rectangle is dynamic** — the longer/narrower, the more it urges movement (a long corridor with a far door makes players sprint) |
| Vertigo / fear of heights | narrow walkways over an abyss; cliffs that overhang slightly inward (read as more dangerous than a vertical wall); tall rectangular columns that imply a deep shaft |

## Psychology of Horror (Kadikov)

Horror level design works through four levers — **(1) maximize immersion, (2) pull
the player out of the comfort zone, (3) strip situational control, (4) make the
player vulnerable** — realized by a taxonomy of 13 named techniques (first-person
view, invading personal space, the discomfort zone, loss of control,
unpredictable/invulnerable enemies, "fear has big eyes", the false alarm, the
agonizing wait, a vivid cost of failure, nowhere to run, loss of progress).

> The full **13-technique horror checklist** with the design mechanism for each
> technique lives in `core/references/level-design-horror.md`. Load it when designing
> a horror game or a horror level/section.

## Navigation, Readability & Wayfinding

Players prize a **feeling of freedom**; you rarely need real freedom, only the
feeling of it — so lead them through a space *without explicit instruction*.
Schell: "when the good leader's work is done, the people say *we did it
ourselves*."

**Schell's indirect-control levers (the spatial subset):**

- **Constraints / funnels** — fewer exits → predictable movement. A bare room
  with two doors is a near-guaranteed choice (a door says "open me"); an open
  field is unpredictable. Funnel geometry to shape the route while the player
  still feels they chose.
- **Goals** — a stated goal ("find all the bananas") implicitly picks the door
  the player takes. You need only build the spaces the goal pulls them toward.
- **Visual design / the "weenie"** — sight composition steers the eye, and the
  eye leads the body. Walt Disney's *weenie*: a dominant focal landmark (the
  castle on Main Street) pulls guests inward. Keep the **eye ahead of the
  avatar**; the brightest readable spot is usually where players go.
- **Leading lines / breadcrumbs** — a single strong visual line can override
  competing distractions. Schell's *Aladdin* "red line on the floor" led 90% of
  flyers to the throne — with **no conscious memory** of the line.
- **Characters & "collusion"** — NPCs the player takes seriously redirect
  behavior; give them a hidden second goal: *guide the player and pace the
  experience*.
- **Sound / music cues** — tempo and tone change behavior below conscious notice.

**Maps & markers policy (Kadikov).** Use HUD maps/markers when the game is
action-dense and the player has no time to study terrain — universal and need no
tuning, but they break immersion via constant attention-switching. The only
mitigation is to **diegetically justify** the navigation tool (show the hero using
it): *The Division*'s in-world holographic map studied *with* the character;
*Dead Space*'s suit drawing an on-demand line on the floor.

**The diegetic wayfinding palette (Kadikov).** Embed navigation hints into the
environment so a lost player self-finds the path, never feeling led by the hand.
Organize by function — **attract → direct → orient**:

| Signal | Craft |
|--------|-------|
| **Composition, contrast & light** | orient objects to form leading lines; mark the focal point with contrast (round vs square, big vs small, saturated vs dull, clean vs dirty); a lone light in darkness is an exceptionally strong attractor, and light beams form leading lines |
| **Landmarks** | a far-visible object lets players self-locate and creates a sense of journey; structure a *linear* level as a chain of reachable landmarks; one giant landmark visible everywhere unifies a stylistically varied world; events with far-visible consequences (smoke, fireworks) pull toward story beats |
| **Characters** | allies as living signposts; companions give a fixed self-exploration window *first*, then hint when the player is confirmed stuck; recurring mystery characters motivate full exploration |
| **Movement** | any moving element (blinking lights, sparks, opening doors, an umbrella carried by wind) signposts direction |
| **Pickups** | lay collectibles along the intended path as nav beacons; in MP they also create contested attractor points |
| **Signs** | in-world imagery (arrows, graffiti, plaques, schematics) — reads natural *only* if justified by logic/story; more info on a sign = more player time it costs |
| **Color coding** | paint symmetric/repeated parts different colors so players know which half they're in (*TF2* "2Fort" RED/BLUE); give same-looking biomes a signature ambient color |

## Movement Organization & Exploration (Kadikov)

**Critical, golden & optional paths (foundation):**

- **Critical path** — the minimum route to completion; unmissable and fully paced
  on its own.
- **Golden path** — the intended *ideal* route a guided player takes; shaped by
  wayfinding, not by walls.
- **Optional content** — rewards exploration; never gate critical progress behind
  it, and never hide the critical path so well it reads as optional.

**Movement-organization toolkit.** Smooth, logical traversal is decisive for
overall impression — plan it at layout stage:

| Tool | Craft |
|------|-------|
| **Obstacles & detours** | make the goal visible immediately but blocked, forcing a detour; win on *density* of visitable space, not size |
| **Sequence (exit last)** | flow the player room-by-room like water down a riverbed; place the exit/goal in the **last** room of the chain (else they leave early and skip content), and trigger story progression right after the last room is searched |
| **Seal off the previous area** | enforce one-way movement with a **height drop** you can't climb back up (or rubble/slammed doors); also seals an arena for a horde/boss fight and, in MP, gates each spawn so it can't be camped |
| **The loop** | on reaching the objective, return to the start via a newly opened passage or a drop — eliminates the dull backtrack across a now-empty area |
| **Changing conditions (area reuse)** | reuse one space with new scenarios each pass (cheap: add enemies on the return; bigger: a global event that changes rules *and* look) |
| **False dead-ends** | reveal the correct path only when the player hits an apparent dead-end and turns 180° |
| **Obvious boundaries** | make where-you-can-go obvious at a glance (visible junk/furniture barricades, an ajar inward door reads as inviting) — avoid ambiguous states that waste player attempts |
| **Negative space** | use space the player *doesn't* want to be in (open cover-less ground, lethal enemies) as a **repelling** guide that pushes them along the only correct route (ideal for chase/flee sequences) |

**Exploration incentives.** Exploration rests on the **reward principle** — the
player must always trust that curiosity is rewarded. Kadikov's four reward types
(use as a checklist): **items** (ammo, medkits, keys, treasure), **capabilities**
(shortcuts, vantage points, new takedowns), **story** (scenes, lore, audio logs),
**jokes/easter eggs**. Placement craft:

- Hide loot in unexpected spots (open a wardrobe, smash glass); put tables/cabinets
  in the **center** of rooms so the player circles to peek behind each one.
- **Item bait (shop-window principle):** dangle a valuable item *behind* a barrier;
  let the player **see** the locked treasure's contents (window/grate) so they can
  judge whether it's worth a key/lockpick/time. Solving a puzzle to reach loot beats
  grabbing freebies on the path.
- **Reachable-landmark bait:** a far-visible landmark used as bait *must* be
  genuinely reachable and enterable (lit at night) — never tempt with unreachable
  background scenery.
- **Stashes & codes:** hint stash locations via notes/dialogue/treasure-maps; tie a
  key's hiding spot to NPC personality (deduction); integrate safe codes into the
  environment and scale puzzle difficulty.
- **Interconnected & vertical areas:** provide route variety; encourage *vertical*
  exploration (ledges, balconies, vents), not just horizontal; reward high content
  **density** — a small world with rich per-m² interactivity holds players for hours.

## Visual Language (Kadikov)

A system of visual cues that communicates an object's **state** and **how to
interact with it**, bypassing the UI by building a firm association between an
object's look and its gameplay function. It works **only under the consistency
principle**: *every* copy of an interactive object on a level must respond
identically — break consistency and readability collapses. Use distinct cues per
interaction type, and encode: gameplay capability; gameplay function (e.g.
explosive); object **status** (open/empty vs closed/full, locked/unlocked);
**relationships** between objects (a bright cable linking a switch to its target);
stash markers; danger warnings and safe zones; and the **surfaces** a mechanic works
on (climbable ledges = white in *Uncharted 4*, orange in *Robinson*; portal-able
walls = white in *Portal 2*).

**Anti-patterns (consistency violations):** reusing the interactive-marker color for
non-interactive geometry (*Wolfenstein II*'s yellow on ladders *and* interactives →
important objects become unreadable) — reserve the marker color **exclusively** for
interactives; applying a path cue non-universally so the player loses the trail
(*The Last Guardian*) — apply the cue everywhere it's valid.

## Combat Encounter Design (Kadikov)

Interesting firefights come from a defined battlefield **structure**, not scattered
cover and surprise spawns: a clear *focus* the player's attention centers on, a
readable *front line* with a no-man's-land between sides, telegraphed enemy
entrances, fair coverless-crossroads handling, flanking that always pays, a cover
taxonomy tuned to the core combat, stepwise *wave* escalation, and allies that never
steal the fun.

> The full **combat-encounter method** — focus rules, the coverless-crossroads
> fairness rule, front line / no-man's-land, flanking, the cover taxonomy with
> placement numbers (1-2 / 2-3 covers), wave staging, and the four ally rules —
> lives in `core/references/level-design-combat-encounters.md`. Load it when
> designing combat encounters, cover layouts, or wave-based fights.

## Sandbox Design (Kadikov)

Total freedom makes players passive — a sandbox must *motivate* action through three
elements: **vantage points** (an elevated safe spot to read options and risks before
acting; interior version: the "bunker"), **tools** (several verbs to solve each
problem — a playground for experimentation), and a **nonlinear structure** (many
paths through each entry→exit gameplay section, which also bounds the AI).

> The full **sandbox method** — vantage-point/bunker craft and the AI-reachability
> fairness constraint, the tools palette, and nonlinear gameplay-section structure —
> lives in `core/references/level-design-sandbox.md`. Load it when designing a
> sandbox, immersive-sim, or stealth space with multiple solutions.

## Multiplayer Level Design (Kadikov)

Competitive PvP maps add their own constraints: player-model **readability** against
the environment, simple quickly-memorable layouts built from named topology
primitives (Circle / Figure-8 / 0+8 / Gut / Defense), **balance** via mirroring or
travel-time calculation, camp-proof multi-exit spawns, points of interest where
every advantage is counterbalanced by a vulnerability, and support for every
playstyle.

> The full **multiplayer method** — character/readability rules, the classic-topology
> catalog, mirror & timing balance math, spawn placement & protection, points of
> interest, and playstyle support — lives in
> `core/references/level-design-multiplayer.md`. Load it when designing a competitive
> multiplayer map, its spawns, balance, or points of interest.

## Metrics & Metric-Driven Production Pipeline (Kadikov)

Levels are built to **metrics** — the measured ranges of player capability (movement
and combat) that geometry must respect, kept consistent so every level reads from the
same numbers (a wall jumpable in one level and not another is a metrics-desync bug).
Greybox to metrics first; art and theming come after the space plays, through a staged
pipeline with explicit layout and content freezes.

> The full **metrics & production method** — the two-pass metric derivation (character
> dimensions → architectural standards → environment sizes, with test levels and
> measuring gizmos), the AI-friendly-space rule, and the 4-stage
> greybox→whitebox→final pipeline with its freeze gates — lives in
> `core/references/level-design-metrics-production.md`. Load it when setting movement
> or combat metrics or running the production pipeline.

## Anti-patterns

- Greyboxing geometry before the topology (bubble graph) exists.
- Corridor design — abstract space stuffed with identical crates/barrels, styled
  afterward, instead of architect-first functional layout.
- A flat intensity curve — all-action or all-calm — with no rest/spike rhythm.
- Teaching a mechanic under lethal pressure instead of in safety first.
- Tooltip walls where teach-by-doing (or a diegetic clue) would work.
- Mis-scaling: scaling a non-tileable asset past 1.25×, inconsistent sizes of repeated
  assets, no human/doorway reference, or cramped third-person interiors.
- A "grey-mass" level that is only cliché with no signature hook; building from stock
  representations of a place.
- A modular kit with visible repetition and grid sterility (all 45°/90°, on-grid) left
  uncured by artistic disorder.
- A static, "stuck-to-the-floor" world; stereotype-built or anachronistic locales;
  background life that stops dead at the level boundary.
- Reusing the interactive-marker color for plain geometry, or applying a path cue
  non-universally so the player loses the trail (visual-language consistency breaks).
- The critical path hidden so well it reads as optional; or core progress gated behind
  genuinely optional content; the level exit placed before the last room so players
  skip content.
- Quest-marker arrows compensating for composition that should guide the eye; an
  unjustified map menu that breaks immersion; a space with no landmarks ("all-alike
  maze").
- A flat segment in the interest curve left in (cut it or offer a shortcut);
  over-pitched initial expectation that flattens everything after; no hook, so interest
  decays past the quit threshold.
- A flat whole-game macrostructure — no early/mid/end-game arc; or a stage (commonly
  the end game) left untuned into a low-tension war of attrition; a simulation/sandbox
  shipped with no planned macrostructure.

> Mode- and phase-specific anti-patterns (combat encounters, sandbox, multiplayer,
> metrics & production) live with their methods in the reference files listed in the
> header — load the matching reference for its own Anti-patterns section.

## Source Map

| Source | Used for |
|--------|----------|
| Jesse Schell, *The Art of Game Design: A Book of Lenses* (Russian translation), Ch 16, 18, 21 | "Architecture of Game Spaces" (architect↔designer parallel, five space schemas, landmarks-as-memory, Alexander's "quality without a name", pattern-lens heuristics, virtual-scale & third-person realities); "Navigation, Readability & Wayfinding" (Schell's indirect-control levers: constraints/funnels, goals, the "weenie"/visual design, leading-line breadcrumbs, characters & collusion, sound cues); "Interest-Curve Pacing" (hook, initial/residual interest, peaks-and-valleys, climax, fractal nesting, inherent interest / poetry / projection, the beat table) |
| The Level Design Book (theleveldesignbook.com) | "Layout: Bubble Diagrams & Graphs" — topology-before-geometry, bubble diagrams, loops/gates/hubs/bottlenecks |
| Hayashida (Nintendo), on *Super Mario* level design — kishōtenketsu | "Kishōtenketsu" four-part teach-in-safety / test-under-pressure structure |
| Robert Zubek, *Elements of Game Design* (MIT Press, 2020; Russian translation), Ch 6 | "Macrostructure & Content Arcs" — macrostructure as the whole-game content arc; the three-act model applied to non-story games (early/mid/end game, tune each stage); nested episode arcs and filler/breather episodes; pacing rest tactics (exploration vs busywork) and the systems-driven-pacing caution (L4D2 Director); emergent macro-arc in simulation games (tech-tree gating, achievement-gated eras, random events) |
| Михаил Кадиков, *Проектирование виртуальных миров. Теория и практика дизайна уровней* (Ridero, 2020) | "Think Like an Architect" (function-first / form-follows-function, from-large-to-small decomposition); "Anatomy of a Level" (structural geometry, props, decals, background, proximity-based detail budget); "Scale & Proportions" (scale anchors, the 1.25× cap, world standards from character габариты, deliberate distortion); "Modularity" (power-of-two grid 512/128/64/32, pivot snapping, pros/cons, artistic-disorder cure); pacing additions (tempo via movement speed, levolution); "Memorability & Wow-Moments" (the изюминка + five levers + three-in-one, the wow-moment palette); diegetic tutorials; "Atmosphere & Believability" (imitation of reality, the breathing world, consistency & believability, simulation of life); "Environmental Storytelling" (telling clues, local/global events, focusing-attention composition); "Psychology of Perception" (the 15-20-min detail rule, color temperature & color script, spatial-emotion geometry); "Navigation, Readability & Wayfinding" (maps/markers policy, the attract/direct/orient diegetic signal palette); "Movement Organization & Exploration" (the eight-tool movement toolkit, four reward types and exploration-incentive craft); "Visual Language" (the consistency principle and object-readability cues). The extracted reference files carry their own provenance: "Psychology of Horror", "Combat Encounter Design", "Sandbox Design", "Multiplayer Level Design", and "Metrics & Metric-Driven Production Pipeline" are sourced from the same Kadikov book in their respective `references/level-design-*.md` files. |
