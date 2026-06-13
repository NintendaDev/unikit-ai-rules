---
version: 1.0.0
---

# Player Motivation

> **Scope**: Audience motivation models for targeting and validating design decisions — the Quantic Foundry 12-motivation model (6 pairs, 3 empirical clusters, 9 gamer types), motivation-driven audience definition, system-coverage checks, and the limits of the Bartle taxonomy.
> **Load when**: defining target audience, writing concept cards, choosing or cutting systems for an audience, mapping features to motivations, validating pillar alignment against the audience, selecting comparable games, questioning who a mechanic is for.

---

## The Quantic Foundry Model (primary)

An empirical model built by factor analysis over hundreds of thousands of gamer
surveys: **12 motivations in 6 pairs, grouping into 3 high-level clusters.**

| Cluster | Pair | Motivation | The player seeks |
|---|---|---|---|
| Action–Social | Action | Destruction | guns, explosions, chaos, mayhem |
| | | Excitement | fast pace, surprises, thrills |
| | Social | Competition | duels, rankings, besting others |
| | | Community | co-op, chat, being part of a team |
| Mastery–Achievement | Mastery | Challenge | practice, demanding tests of skill |
| | | Strategy | thinking ahead, decisions with weight |
| | Achievement | Completion | every collectible, every quest, 100% |
| | | Power | a strong character, powerful gear |
| Immersion–Creativity | Immersion | Fantasy | being someone else, somewhere else |
| | | Story | narrative arcs, characters that matter |
| | Creativity | Design | self-expression, customization |
| | | Discovery | exploring, tinkering, finding what's hidden |

Findings to design by:

- **Motivations are continuous spectra, not boxes.** Every player is a blend;
  segments are densities in a distribution, not species.
- Motivations within a cluster correlate: a Challenge-seeker is likelier to also
  value Strategy than Story. Secondary appeal usually lives in the same cluster
  as the primary.
- Demographics shift profiles — Quantic Foundry's data shows appetite for
  Competition and Excitement declines markedly with age. "Core gamer"
  assumptions silently encode an age bracket; check the data, not the trope.
- The 9 gamer types (Acrobat, Gardener, Slayer, Skirmisher, Gladiator, Ninja,
  Bounty Hunter, Architect, Bard) are convenience segments layered on the
  spectra — useful as conversation anchors, too coarse as a specification.

## Bartle: Historical Context and Limits

Bartle's four types (Achiever, Explorer, Socializer, Killer) describe behavior
observed **in 1990s MUDs** — persistent, multiplayer, social text worlds.

- Use it as conversational shorthand at most. It predates data-driven
  validation, and empirical motivation data does not reproduce its quadrants.
- Its axes (acting↔interacting × players↔world) do not transfer to
  single-player or session-based games; "Killer" conflates competition,
  griefing, and power expression into one box.
- Bartle himself cautions against applying the taxonomy outside the context it
  described. Never write a target-audience section in Bartle terms.

## Applying Motivation Targeting

- **Audience definition** = 2–3 primary motivations + supporting evidence from
  comparable games: which motivations do the comps serve, what do their players
  praise and complain about? "For everyone" is a refusal to decide.
- **Concept cards** (brainstorm) name their target motivations explicitly; a
  hook that serves no named motivation is decoration.
- **Coverage check** (spec/review): map core systems × target motivations.
  Every core system serves ≥1 target motivation; every target motivation is
  served by ≥1 core system. An orphan on either side is a finding.
- **Cuts and scope**: protect systems serving primary motivations; a "cool"
  system serving only non-target motivations is the first candidate out.
- **Onboarding order**: the first session leads with the primary motivation's
  payoff — the hook the audience came for; secondary payoffs can wait.
- Genres carry motivation baselines (builder audiences index on Design and
  Completion; arena audiences on Competition and Excitement). Deviating from
  the baseline is a legitimate, deliberate, *named* bet — not an oversight.

## Anti-patterns

- Target audience defined as a demographic ("18–35, mobile") instead of
  motivations with evidence.
- Bartle types used as an audience spec or segmentation model.
- A coverage matrix where every system "serves" every motivation — wishful
  annotation, not targeting.
- Assuming the team's own motivation profile equals the audience's.
- Picking comparable games by theme while ignoring their motivation profile.
- Adding a competitive mode "for engagement" to a game whose audience indexes
  on Immersion–Creativity.
