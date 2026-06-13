---
version: 1.0.0
---

# Design Frameworks

> **Scope**: Foundational experience frameworks for grounding design decisions — MDA aesthetics targeting (8 aesthetics, backward design), self-determination needs (SDT/PENS), the flow channel with player-controlled difficulty (active DDA), and game-feel responsiveness budgets (~100 ms).
> **Load when**: defining pillars or experience goals, evaluating a mechanic against the intended experience, writing Player Fantasy sections, designing difficulty or pacing, tuning controls and responsiveness, justifying a design recommendation with theory.

---

## MDA: Mechanics → Dynamics → Aesthetics

**Mechanics** are the authored rules and data. **Dynamics** are the run-time
behaviors that emerge when mechanics meet player input. **Aesthetics** are the
emotional responses the dynamics evoke (Hunicke, LeBlanc, Zubek).

The eight aesthetics:

| Aesthetic | The game as… | Typical carriers |
|---|---|---|
| Sensation | sense-pleasure | juice, audiovisual impact, tactility |
| Fantasy | make-believe | role embodiment, power fantasy |
| Narrative | drama | authored arcs, character stakes |
| Challenge | obstacle course | mastery, fair difficulty |
| Fellowship | social framework | co-op, guilds, shared goals |
| Discovery | uncharted territory | exploration, secrets, system depth |
| Expression | self-discovery | builds, customization, creation |
| Submission | pastime | low-friction ritual, ambient play |

- **The designer authors mechanics, but the player meets the game from the other
  end — aesthetics first.** Design backward: pick target aesthetics, ask which
  dynamics produce them, then which mechanics produce those dynamics.
- Target **2–3 aesthetics per pillar or system, never all eight.** Aesthetics
  compete: Challenge pulls against Submission; heavy Narrative constrains
  Expression. Name the trade-off you are accepting.
- Use MDA as a **diagnostic lens**: when a mechanic "feels wrong", locate the
  dynamic that breaks the target aesthetic instead of patching the mechanic
  blindly (e.g., a trading mechanic breeds hoarding dynamics that kill the
  intended Fellowship).
- Tuning is second-order: a number change shifts dynamics, which shifts the felt
  aesthetic. Trace the chain M→D→A before and after every significant change.

## SDT / PENS: Need Satisfaction

Self-Determination Theory (Ryan, Rigby, Przybylski) explains sustained engagement
through three innate needs; the PENS model operationalizes them for games:

- **Competence** — feeling effective: optimal challenge, readable feedback,
  visible skill growth. Served by fair difficulty, mastery curves, clear
  cause→effect.
- **Autonomy** — acting by one's own volition: meaningful choices with
  consequences, room for self-direction. **Option count is NOT autonomy** —
  choices must matter and express intent.
- **Relatedness** — mattering to others: cooperation, recognition, contributing
  to a group (well-written NPCs can partially serve this).

PENS additions: **intuitive controls** (clumsy input blocks all three needs
before content is even reached) and **presence/immersion as an outcome** of need
satisfaction, not a separate feature to add.

- Need satisfaction predicts long-term engagement better than moment-to-moment
  "fun" — design every core system to clearly serve at least one need.
- **Overjustification risk**: stapling heavy extrinsic rewards onto an already
  intrinsically satisfying activity erodes the intrinsic motivation. Reward
  outcomes and expression; don't bribe the action itself.

## Flow & Active DDA (Chen)

- The **flow channel**: engagement holds while challenge tracks skill — boredom
  below the channel, anxiety above. Player skill grows constantly, so a static
  difficulty always exits the channel eventually.
- **Sawtooth pacing**: alternate tension and release inside the channel;
  difficulty rises in waves with deliberate valleys (mastery moments), not
  monotonically.
- **Passive DDA** (the system silently rubber-bands) risks breaking trust and
  cheapening Competence the moment players notice it. Prefer **active DDA**:
  embed difficulty regulation into player choices themselves — optional risk
  routes, push-your-luck mechanics, freely chosen pace — so adjusting flow IS
  gameplay.
- For wide audiences, widen the flow zone through choice architecture rather
  than hunting one perfect curve for a mythical average player.

## Game Feel (Swink)

- **Real-time control budget**: input → visible response within **~100 ms**
  reads as instantaneous; beyond it, controls feel sluggish. Wind-up animations
  that delay response are a feel cost paid deliberately — never free flavor.
- Three building blocks: **real-time control**, **simulated space** (collision
  and physics give the world tactility and weight), and **polish** (particles,
  screenshake, hitstop, audio — amplifying physicality without changing rules).
- Think in response envelopes (attack/decay/sustain/release of motion): how fast
  movement starts, settles, and stops. "Snappy" vs "weighty" is an envelope
  decision — document it as intent, not as an accident of implementation.
- Feel parameters are tuning knobs of category `feel` — tunable late, but the
  response *budget* is a design commitment made early.

## Anti-patterns

- Designing mechanics-first, then rationalizing an aesthetic story around them.
- A pillar list targeting all eight aesthetics — that is no targeting at all.
- "Fun" or "engaging" written as an experience goal — name the aesthetic, the
  need, or the flow intent instead.
- Passive rubber-banding that silently invalidates player skill.
- Input chains beyond ~100 ms excused as "weighty" without an explicit envelope
  decision.
- Bribing intrinsically satisfying actions with stacked extrinsic rewards.
- Treating immersion as a feature to bolt on rather than an outcome of needs
  being met.
