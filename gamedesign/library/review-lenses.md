---
version: 1.0.0
---

# Review Lenses & Severity

> **Scope**: The review toolkit for design documents — critique vs review distinction, the lens catalog (completeness, clarity/implementability, pillar alignment, systems-math, domain, feasibility, scope), the four-level severity rubric, verdict semantics, the adversarial reviewer stance, Braintrust dynamics, plussing, and cross-scope consistency checks.
> **Load when**: reviewing a design document or concept, running adversarial lenses, classifying finding severity, issuing review verdicts, structuring critique on drafts, performing cross-document consistency review, calibrating feedback tone.

---

## Critique vs Review (Connor & Irizarry)

Two different activities — never blur them:

| | Critique | Review |
|---|---|---|
| Object | work in progress (draft, section) | a finished document |
| Goal | improve the next iteration | decide: ready or not |
| Output | observations, questions, builds | verdict + severity-rated findings |
| Findings are | discussion inputs, declinable | weighted; Critical/Major block |
| When | continuously, inside authoring | at milestones, in a fresh session |

A "review" that delivers vague impressions wastes a verdict slot; a critique
that issues verdicts poisons collaboration. Quality reviews are
`unikit-gd-review`'s job; its mechanical twin (`unikit-gd-verify`) checks
self-consistency, not quality — a verify conflict cannot be declined, a review
finding can.

## Lens Catalog

Each lens is one question asked adversarially against the document:

| Lens | Question | Typical findings |
|---|---|---|
| Completeness | are all sections decisions, not placeholders? | empty or hand-wave sections, TBDs inside core rules |
| Clarity & implementability | can a programmer build this without guessing? | ambiguous rules, missing data shapes, undefined terms |
| Pillar alignment | does each mechanic pass a pillar's design test? | pillar drift, orphan mechanics, contradicted design tests |
| Systems-math | do the formulas produce the described behavior? | range errors, degenerate values, curve breaks, dominant strategies |
| Domain (economy / UX / accessibility / ethics / liveops) | does the content hold against domain expertise? | violations of the matching domain library rule |
| Feasibility | implementable under DESCRIPTION/ARCHITECTURE constraints? | technically impossible mechanics, scope–tech mismatch |
| Scope | is the size (S/M/L/XL) proportional to the system's tier? | an XL spec for a tier-3 system, an underspecified tier-1 |

- Apply domain lenses only when the document actually touches the domain.
- The feasibility lens is the **single sanctioned exception** to the one-way
  boundary: it may read DESCRIPTION.md / ARCHITECTURE.md — never code.

## Severity Rubric

| Severity | Meaning | Examples |
|---|---|---|
| **Critical** | blocks handoff | contradicts a pillar or a registry fact; unimplementable; hole in core rules; dominant strategy; monetization-ethics violation |
| **Major** | risk if unaddressed | ambiguous rule; empty section; missing edge case; untestable AC; terminology drift |
| **Minor** | text quality | missing example; weak rationale |
| **Suggestion** | "what if…" (plussing) | never blocks; offered, not required |

- Severity attaches to **evidence, not taste**: a finding cites the document
  section AND the contradicted fact, pillar, or rule. No citation → it is an
  opinion; downgrade it to Suggestion.
- **Diagnose, don't prescribe**: "FORM-damage's output range contradicts
  PIL-2's design test" — not "change the damage formula to X". Prescriptions
  are opt-in (see Plussing).

## Verdicts

- **Single document**: APPROVED / NEEDS REVISION / MAJOR REVISION.
- **Cross-document** (full-design review): PASS / CONCERNS / FAIL, where
  FAIL = at least one Critical anywhere in the set.
- **Required before implementation** = all Critical + Major findings; Minor
  and Suggestion items go to a separate, explicitly non-blocking list.
- The verdict informs the user's Status decision in GD-INDEX; it never
  auto-applies. The room has no authority (Braintrust) — the user decides.

## Adversarial Stance

The reviewer's job is NOT to validate — it is to find problems. Lens prompt
template (for parallel read-only `Agent()` lenses, or sequential self-passes
when sub-agents are unavailable):

> "Here is the design document for <system> and the structural findings so
> far. Your job is NOT to validate this design — find what is wrong,
> underspecified, likely to cause problems, or missing entirely, through the
> <lens> lens. Be specific and critical: cite the section and the evidence for
> every finding. Disagreement with other findings is welcome."

- Run lenses independently — a lens forms its findings before seeing another
  lens's output (anchoring kills independent coverage).
- Merge, dedupe, then severity-classify findings with the rubric above.

## Braintrust Dynamics (Catmull)

- Honesty over politeness — about the work, never the person.
- The review has no authority: it surfaces problems; the user decides what to
  do with them.
- **Name what works** ("I like…") — honest calibration, not flattery. A review
  with zero positives is as miscalibrated as one with zero findings.
- Repeat unaddressed findings verbatim across sessions. Politeness decay —
  softening a finding each round until it disappears — is a review failure.

## Plussing (d.school)

Structure invited suggestions as builds: **"I like / I wish / What if…"** —
anchored to something that works, phrased as direction, not directive.
Plussing is opt-in: offer it when the user asks "how would you fix it", never
inside the findings table.

## Constraints Lens (Acar)

Creativity follows an inverted-U over constraints: too few → unfocused,
generic output; too many → no room to move.

- A bland concept is usually under-constrained — tighten the frame (audience,
  pillar count, scope budget) before adding features.
- An infeasible concept is usually over-constrained — name which constraint is
  relaxed, deliberately.

## Cross-Scope Checks (reviewing "everything")

Beyond per-document lenses, a cross-review inspects the seams:

- **Depends symmetry** — every dependency edge is known to both sides and
  matches GD-INDEX.
- **Formula compatibility** — shared currencies and scales agree across
  systems.
- **Cross-AC consistency** — no two systems' acceptance criteria contradict
  each other.
- **Pillar drift** — later documents quietly diverging from GAME.md pillars.
- **Scope vs tiers** — summed scope signals checked against tier budgets.
- **End-to-end scenarios** — trace 3–5 concrete player moments through every
  involved system; the seams no single-document lens can see break here.

## Anti-patterns

- Prescribing solutions inside findings nobody asked for.
- Severity inflation: taste disagreements filed as Critical.
- Validation theater: a review designed to confirm, not to find.
- Blurring critique into review: verdicts on drafts, vague vibes at milestones.
- Lenses reading each other's findings before forming their own.
- Zero "I like" entries — calibration lost, the author defensive by round two.
- Findings without a section and evidence citation.
- Treating verify conflicts as declinable review findings.
