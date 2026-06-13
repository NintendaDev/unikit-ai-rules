---
version: 1.0.0
---

# Brainstorming Methods

> **Scope**: Ideation method toolkit — diverge/converge discipline (Double Diamond, IDEO "defer judgment"), brainwriting with an LLM (production blocking), the divergence method catalog (verb-first, genre mashup, MDA-backward, world-first, constraint-first; SCAMPER, random stimulus, Lotus Blossom), problem framing (How Might We), convergence tools (Pugh matrix, How-Now-Wow, idea backlog), the Klein pre-mortem, find-the-fun, and constraints as fuel.
> **Load when**: brainstorming a concept or system, generating mechanic ideas, framing a design problem, expanding a favored idea, converging on a choice, running a pre-mortem, scoping an MVP, deciding what to prototype.

---

This rule is the **theory home** for ideation methods. `unikit-gd-brainstorm`
carries the phase protocol and references these methods by name — the techniques
themselves are specified here once and not duplicated in the skill.

## Diverge, Then Converge — Never Both at Once

The Double Diamond separates two opposed mental modes. Mixing them kills both
(IDEO's "defer judgment"):

- **Divergence** generates without filtering — quantity over quality, wild over
  safe, building on fragments ("yes, and…"). Judgment is suspended.
- **Convergence** selects with explicit criteria — only after a pool exists.
- Announce which mode is active. Critiquing an idea mid-divergence (or generating
  new options mid-convergence) is a process error, not a contribution.
- One idea per beat, headline-first; depth comes after selection.

## Brainwriting With an LLM

A solo human ideating with an LLM is structurally **brainwriting**, not verbal
brainstorming — and that is an advantage. Verbal group brainstorming suffers
**production blocking** (Diehl & Stroebe 1987): only one person talks at a time,
so ideas are lost while waiting. Written, parallel idea streams have no blocking.

- Generate in **batches** ("here are 5; say 'more' for another 5"), not one idea
  at a time — exploit the no-blocking property.
- Build on the user's fragments with "yes, and…"; treat half-formed user input as
  a seed to extend, never as a finished proposal to judge.
- The user sets quantity; the skill never declares the pool "complete".

## Divergence Methods

Generate concepts/mechanics through **different lenses** so the pool is varied,
not five variants of one idea:

| Method | Prompt | Guards against |
|---|---|---|
| Verb-first (Anthropy & Clark) | start from the core verb the player *does* | theme-first decoration with no play |
| Genre mashup (Zukowski caveat) | cross two genres' core loops | a mashup whose audience is the *intersection*, not the union — name the risk |
| Experience-first / MDA-backward | pick a target aesthetic, work back to mechanics | mechanics with no intended feeling |
| World-first | start from setting/fantasy, derive systems | a world with nothing to do |
| Constraint-first | start from a hard limit (solo dev, one button) | unfocused, unscoped concepts |

Expanders for a chosen favorite (the "more 5"):

- **SCAMPER** (Eberle): Substitute, Combine, Adapt, Modify, Put to another use,
  Eliminate, Reverse — seven transforms applied to an existing idea.
- **Random stimulus** (de Bono): force a connection between the idea and an
  unrelated word/image to break a rut.
- **Lotus Blossom**: put the idea at center, generate 8 sub-themes, then 8 ideas
  per sub-theme — structured radial expansion.

## Framing: How Might We

Before diverging, frame the problem as 3–5 **"How might we…"** questions
(Basadur; NN/g): positively framed, solution-neutral, neither too broad ("HMW
make it fun") nor too narrow ("HMW add double jump" — that smuggles the answer
in). Pick one HMW to diverge against; the frame focuses the pool.

## Convergence Tools

- **Pugh matrix**: score candidates against weighted criteria (hook,
  scope-fit, team-fit, market signal, personal fire). The user owns the weights;
  show the arithmetic transparently — the matrix structures the discussion, it
  does not decide.
- **How-Now-Wow** (when "everything looks good"): plot ideas on
  novelty × feasibility. *Now* = safe & doable, *Wow* = novel & doable, *How* =
  novel but hard (park it). Cuts an over-full pool fast.
- **Idea backlog** (`IDEAS.md`): rejected ideas are not deleted — record idea,
  essence, rejection reason (scope / not-fun / off-theme / duplicate), and a
  revival condition. The backlog is design memory, not a graveyard.

## Pre-mortem (Klein)

Run Klein's protocol *verbatim* — the certainty framing is the mechanism:

> "Crystal ball: it is six months from now and this project **failed. That is a
> fact.** Why?"

- "It failed, that is a fact" outperforms "what are the risks?" — prospective
  hindsight surfaces ~30% more concrete causes (Klein, HBR 2007).
- Generate 8–12 causes across fun / scope / market / tech / team. The user marks
  which are *real*; write mitigations only for those.

## Find-the-Fun (Cerny)

The Cerny Method: before committing, build the **smallest prototype that proves
or kills the core**. Pre-production exists to find the fun; if the minimal
verb-loop isn't fun in a rough build, no amount of content will save it. The
brainstorm's handoff names this prototype.

## Constraints as Fuel (Acar)

Creativity follows an **inverted-U** over constraints (Acar et al. 2019): too few
→ generic, unfocused output; too many → no room to move.

- A bland pool is usually **under-constrained** — tighten the frame (audience,
  pillar count, scope budget) before adding methods.
- An impossible idea is usually **over-constrained** — name which constraint to
  relax, deliberately.

## Applying in Authoring

- Concept cards capture divergence output: one idea, its core verb, its target
  aesthetic, its hook, its biggest risk (the brainstorm skill owns the card
  shape).
- The pre-mortem feeds the MVP-cut and the find-the-fun prototype recommendation.
- Convergence output is a single chosen (or hybridized) concept plus a populated
  `IDEAS.md` backlog — never a silent discard.

## Anti-patterns

- Judging ideas during divergence; generating new ones during convergence.
- One idea at a time when the medium has no production blocking — leaving
  batch throughput on the table.
- A genre mashup pitched without naming the intersection-audience risk.
- HMW questions with the solution baked in.
- A Pugh matrix presented as a verdict instead of a structuring aid.
- Deleting rejected ideas instead of backlogging them with a revival condition.
- "What are the risks?" instead of Klein's "it failed — why?" certainty framing.
- Greenlighting a concept with no find-the-fun prototype named.
- Adding features to fix a bland concept that is actually under-constrained.
