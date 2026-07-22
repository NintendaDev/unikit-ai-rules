# Level Design — Metrics & Metric-Driven Production Pipeline

Detailed metrics-and-production method extracted from `level-design.md` (load on
demand when setting movement/combat metrics or running the build pipeline). The main
rule keeps the conceptual hook; this file holds the two-pass metric derivation, the
AI-friendly-space rule, and the 4-stage pipeline. Source: Михаил Кадиков,
*Проектирование виртуальных миров. Теория и практика дизайна уровней* (Ridero, 2020).

## Metrics & Metric-Driven Production Pipeline

Levels are built to **metrics** — the measured ranges of player capability that
geometry must respect:

- Movement metrics: jump height/distance, dash range, climb reach, run speed, max
  walkable slope, step-over height, vault height, max safe fall height.
- Combat metrics: weapon effective range, sightlines, cover spacing, encounter
  footprint.
- Keep the metric set consistent so every level reads from the same numbers; a wall
  jumpable in one level and not another is a metrics-desync bug.
- Build greyboxes to metrics first; art and theming come after the space plays.

**Two-pass metric derivation.** (1) Fix character dimensions in every pose, then
movement metrics; derive architectural standards from them (door/corridor/ceiling
sizes, railing/step heights, vent passage). Build a dedicated **test level** with
every obstacle, plus simple **helper models / measuring gizmos** to verify geometry
against the standards. (2) Standardize environment sizes so every mechanic works —
for an FPS: cover dimensions, optimal cover-to-cover distance, grenade-throw range,
jump-pad/rocket-jump height; build **sphere models** sized to each weapon's effective
range to visually verify cover spacing. The phase output is a "design code" — a
rulebook of space-construction standards.

**AI-friendly space.** Find the environment where each AI type poses the most
interesting challenge, and confine it there: a slow melee enemy is lethal only when
the player is boxed into a tight space and helpless in the open — keep such enemies
to enclosed spaces. Validate behavior (reaction, navigation, cover use) on a
dedicated AI test level.

**The 4-stage production pipeline.**

| Stage | Output | Gate |
|-------|--------|------|
| **1. Planning** | conceptualize (setting + gameplay) → visualize (reference, concept art) → gameplay plan (schematic + walkthrough doc, MP/SP checklists) → technical doc (asset list, time estimates) | a clear vision of how it looks, plays, and what's needed |
| **2. Playable prototype (greybox / designer block-out)** | primitives-only 3D sketch (reshape fast and cheap); set up functionality after locking scale (spawns, triggers, AI); active playtest, iterate out the worst annoyances | **the layout plan is approved and frozen — no further layout changes** |
| **3. Geometry prototype (whitebox / art block-out)** | artists build temp models to standards (modular); assemble on top of the gameplay prototype *without altering gameplay* (but improve nav via lighting/composition/contrast); designer re-sets functionality the art pass broke; use **layers** for parallel multi-discipline work | a near-final level from temp assets |
| **4. Final assembly** | swap temp assets for finals (+ optional art polish); **freeze content**, then optimize (draw distance, LOD, shadow quality, delete unused); final playtest & bug-fix | content frozen — no new content after the optimization freeze |

## Anti-patterns

- Levels built to eyeballed distances, desyncing from the movement metrics; sizing to
  the bare minimum so the player or AI can't maneuver.
- Changing the layout after the greybox freeze.
- The artist altering prototype gameplay during whitebox.
- Adding content after the optimization freeze.
