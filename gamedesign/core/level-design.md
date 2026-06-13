---
version: 1.0.0
---

# Level Design

> **Scope**: Level and content design method — bubble diagrams and graph layout, pacing via beat sheets and intensity graphs, the kishōtenketsu four-part structure, the "gym" mechanic-teaching pattern, movement/combat metrics, critical/golden/optional paths, and composition and guidance.
> **Load when**: designing levels, encounters, or content layout; pacing a level or campaign; sequencing mechanic introductions; setting movement or combat metrics; drawing bubble diagrams or intensity graphs.

---

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

## Pacing: Beat Sheets & Intensity Graphs

- A **beat sheet** lists the ordered moments of a level (arrival → first threat →
  puzzle → setpiece → rest → climax → exit) — the level's score.
- An **intensity graph** plots tension over time. The shape, not a flat line, is
  the design: a **sawtooth** (rise–release–rise, each peak higher) sustains
  engagement; **rest beats** (safe rooms, vistas, downtime) make the next spike
  land. Continuous high intensity numbs; continuous low bores.
- Pace **mechanic density** too: introduce, let breathe, then combine — don't
  stack three new mechanics in one encounter.

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

## Metrics

Levels are built to **metrics** — the measured ranges of player capability that
geometry must respect:

- Movement metrics: jump height/distance, dash range, climb reach, run speed.
- Combat metrics: weapon range, sightlines, cover spacing, encounter footprint.
- Keep the metric set consistent so every level reads from the same numbers; a
  wall jumpable in one level and not another is a metrics-desync bug.
- Build greyboxes to metrics first; art and theming come after the space plays.

## Critical, Golden & Optional Paths

- **Critical path** — the minimum route to completion; it must be unmissable and
  fully paced on its own.
- **Golden path** — the intended *ideal* route a guided player takes; shaped by
  composition (below), not by walls.
- **Optional content** — rewards exploration; never gate critical progress behind
  it, and never hide the critical path so well it reads as optional.

## Composition & Guidance

Guide players without UI markers wherever the pillars allow:

- **Landmarks** — tall/bright/unique features orient and pull the player.
- **Affordances & signifiers** — a ledge that *looks* climbable should be; a
  consistent visual language for interactables prevents pixel-hunting.
- **Leading lines, light, and contrast** — composition steers the eye toward the
  golden path; the brightest readable spot is usually where players go.
- Reserve hard markers (quest arrows, waypoints) for when implicit guidance
  fails or accessibility requires them (the accessibility rule may mandate an
  explicit-guidance option).

## Anti-patterns

- Greyboxing geometry before the topology (bubble graph) exists.
- A flat intensity curve — all-action or all-calm — with no rest/spike rhythm.
- Teaching a mechanic under lethal pressure instead of in safety first.
- Tooltip walls where teach-by-doing would work.
- Levels built to eyeballed distances, desyncing from the movement metrics.
- The critical path hidden so well it reads as optional; or core progress gated
  behind genuinely optional content.
- Quest-marker arrows compensating for composition that should guide the eye.
