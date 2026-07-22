# Level Design — Sandbox Design

Detailed sandbox method extracted from `level-design.md` (load on demand when
designing a sandbox, immersive-sim, or stealth space with multiple solutions). The
main rule keeps the conceptual hook; this file holds the full three-element method
incl. the "bunker", AI-reachability fairness, and gameplay-section bounding. Source:
Михаил Кадиков, *Проектирование виртуальных миров. Теория и практика дизайна уровней*
(Ridero, 2020).

## Sandbox Design

The core problem of total freedom: players are passive and rarely self-entertain — a
good sandbox must *motivate* action. It rests on three elements:

1. **Vantage points (plan-ahead).** An elevated spot with a good view where the
   player stays unseen, feels safe, and plans. Its job is to acquaint the player
   with their options — show the main goal plus all **opportunities** (bypass
   routes, cover, stealth entries, tools) and **risks** (patrols, snipers, cameras,
   dogs, searchlights), and let them overhear enemy dialogue. The interior version
   is a **"bunker"**: a room with no enemy but windowed doors to peek into the next
   room and plan. **Fairness constraint:** always place a vantage point the AI *can*
   reach if the player gives away their position — unreachable spots make the AI
   helpless and the game unfair.
2. **Tools (verbs to solve the problem).** Give several ways to do a task at once
   (to blow something up: remote charges, collapse a structure onto a tank, gas-fill
   then ignite, a rolled booby-trapped vehicle). Distraction tools (noise-makers,
   throwable fragile objects) are huge in stealth sandboxes. Tools create a
   playground for experimentation that pushes active play.
3. **Nonlinear structure.** Base structure = **entry (spawn) + exit (goal)**; the
   space between is a **gameplay section** holding one or more fights plus actions.
   Nonlinearity = many paths to the goal *within one section*; note **AI cannot
   cross gameplay sections**, which bounds the encounter. Convert linear A→B to
   nonlinear by splitting a path in two, adding interiors, and widening space; add
   **vertical** routes (attics, roofs, basements, sewers).

## Anti-patterns

- A vantage point the AI cannot reach (free unpunished kills, helpless AI).
