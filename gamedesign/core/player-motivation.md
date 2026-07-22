---
version: 1.0.0
---

# Player Motivation

> **Scope**: Audience motivation models for targeting and validating design decisions — the Quantic Foundry 12-motivation model (6 pairs, 3 empirical clusters, 9 gamer types), Maslow/SDT need framing, Bartle and Lazzaro as complementary lenses, LeBlanc's pleasure taxonomy, demographic/psychographic audience signals, the four player mental abilities behind constructed experience, Sylvester's audience-facing emotional triggers, the fulfillment-vs-compulsion (genuine satisfaction vs Skinner-box motivation) distinction, the Big Five (OCEAN) personality correlation with motivations (Zubek/Yee), motivation-driven audience definition, and system-coverage checks.
> **Load when**: defining target audience, writing concept cards, choosing or cutting systems for an audience, mapping features to motivations, validating pillar alignment against the audience, selecting comparable games, questioning who a mechanic is for, auditing which needs/pleasures a design serves, checking fun-type coverage, reasoning about immersion and engagement, judging whether rewards fulfil or merely compel, auditing reward schedules for addiction/player-regret risk, correlating motivations with personality traits.
> **References**: `.unikit/memory/gamedesign/core/references/player-motivation-emotion-triggers.md` (Sylvester audience-facing emotion-trigger inventory).

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

## Personality & Motivation — the Big Five Link (Zubek)

Zubek (*Elements of Game Design*, Ch 2) connects Yee's empirical motivations to
the **Big Five / OCEAN** personality traits (Openness, Conscientiousness,
Extraversion, Agreeableness, Neuroticism) — the bridge from "what players want" to
"who they are". A follow-up survey found weak-but-real correlations on three of the
five traits and none on the other two (treat them as audience-level tendencies, not
facts about an individual):

| Big Five trait | Correlated motivations |
|---|---|
| Openness | Fantasy, Story, Design, Discovery (the Immersion–Creativity cluster) |
| Extraversion | Excitement, Competition, Community |
| Conscientiousness | Strategy (weak) |
| Agreeableness | none notable |
| Neuroticism | none notable |

Design reads:

- **Extraversion explains a counter-intuitive pairing.** Competition and Community
  look opposed yet co-occur, because both express extraversion — a desire to
  *engage other people*. Treat "engages with others" as the latent driver, not
  "cooperative vs competitive"; an audience that wants Community is a better bet for
  Competition than its surface profile suggests.
- **Games express identity, not escape from it.** Yee's data contradicts the
  "games are escapist fantasy" cliché: the games people choose *reflect* their
  existing traits. Target the audience's real dispositions; don't assume players
  want to be someone opposite to themselves.
- **Empirical models earn the spec; designer taxonomies seed ideas.** Big Five and
  Yee's profiles let categories *emerge from data* rather than imposing a predefined
  grid — the shared defect of Myers-Briggs, the four humours, and (to a lesser
  degree) Bartle. Keep using designer theories (Bartle below; Koster's
  fun-as-learning) and personas as idea sources and conversation anchors, but anchor
  any *commitment* in the empirical link above. (This is the "why it works" behind
  the SDT spine in the frameworks rule and the lens-selection table below.)

## Bartle: Historical Context and Limits

Bartle's four types (Achiever, Explorer, Socializer, Killer) describe behavior
observed **in 1990s MUDs** — persistent, multiplayer, social text worlds. Schell
endorses them as a quick lens (each tied to a dominant pleasure: Achiever →
challenge, Explorer → discovery, Socializer → fellowship, Killer →
competition/destruction) and plots them on two axes — **acting↔interacting ×
players↔world**: Achievers act on the world, Explorers interact with the world,
Socializers interact with players, Killers act on players. Use Schell's framing
for fast, memorable design conversations about a *multiplayer* world.

- It is a **conversational lens, not an audience spec.** It predates data-driven
  validation, and empirical motivation data does not reproduce its quadrants.
  Schell himself warns against over-trusting any such tidy four-box scheme to
  explain something as complex as human desire.
- Its axes do not transfer cleanly to single-player or session-based games;
  "Killer" conflates competition, griefing, and power expression into one box.
- Bartle himself cautions against applying the taxonomy outside the context it
  described. Never write a target-audience section in Bartle terms.

**Bartle vs Quantic Foundry — when to use which.** They are complementary, not
competing. Reach for **Bartle** as a fast back-of-napkin lens when sketching a
*social/multiplayer* loop and you need a shared vocabulary in the room. Reach for
**Quantic Foundry** whenever the output is a *commitment* — a target-audience
section, a system×motivation coverage matrix, a cut decision, or a comp-set
choice — because it is empirical, continuous, and works for single-player. If the
two ever disagree, the empirical model wins for any spec.

## Needs a Game Can Satisfy (Maslow, SDT)

Schell applies **Maslow's hierarchy** as a locator: read off *which* needs a
design already serves, then ask which higher need it could reach next. Many game
actions (mastering skills, hitting goals) sit at **esteem**; multiplayer titles
out-engage single-player largely because they reach *more* levels at once. Schell's
worked example: Minecraft covers the whole pyramid — the bottom two via fiction
(gather resources → build shelter) and the top three by being a multiplayer game
about mastery and creativity.

| Maslow level | What a game can offer |
|---|---|
| Physiological / Safety | only via *fiction* — survival loops, gather/shelter, "don't die" |
| Belonging | co-op, guilds, chat, real relationships with real people |
| Esteem | goals achieved, skills mastered, fair objective judgement of ability |
| Self-actualization | creation, self-expression, doing "what one is meant to do" |

- **Locate, then deepen.** Find the design's current level, then design *up*.
  Self-actualization (creation tools) and belonging (online play) are the two
  strongest retention levers Schell highlights.
- **Promise vs delivery.** A game must *deliver* a need, not merely gesture at it.
  If a player expects to feel more skilled or closer to friends and the game
  fails to pay that off, they leave for one that does.
- **SDT (Ryan & Deci)** gives the psychological needs that map cleanly to games:
  **Competence** (be good at something), **Autonomy** (act freely — games even let
  you stop), **Relatedness** (connect with others). This is the same SDT/PENS
  spine covered in the frameworks rule — treat it as the "why it works"
  explanation behind the motivations here, not a separate model to re-specify.

**Intrinsic vs extrinsic (brief).** Schell frames these as a *continuum* that
combine like vines on a fence, not opposites — and warns that stapling points,
achievements, and rewards onto an already-intrinsically-fun activity can backfire
(the overjustification effect: paid drawings were *more numerous but worse*, and
the children stopped the instant pay ended). The full overjustification danger and
its SDT mechanism already live in the frameworks rule (SDT) — reference it; do not
duplicate. Schell adds a second, orthogonal axis worth a check: **want vs must**
(pleasure-seeking vs pain-avoidance). Healthy loops run want+must in tandem
("earn stars" + "don't die"); a danger sign is a loop that *drifts* from want to
must over time (the classic free-to-play / guild-obligation slide where players
"don't quit the game, they divorce it"). A quick audit: place each motivator on a
2×2 of intrinsic/extrinsic × want/must and look for drift and conflict.

## Motivation Models — Which Lens, When

| Model | What it captures | Best used for |
|---|---|---|
| **Quantic Foundry** (12 motivations / 6 pairs / 3 clusters) | empirical, continuous appetite spectra across all genres incl. single-player | the **default for any commitment**: audience definition, coverage matrices, cut/comp decisions |
| **Bartle** (4 types) | dominant pleasure + acting/interacting × players/world, MUD-rooted | fast shared vocabulary when sketching a *social/multiplayer* loop — never an audience spec |
| **Lazzaro 4 Keys to Fun** (4 fun types) | emotional *experiences* a session evokes | a **fun-coverage checklist** during prototyping/playtest — is each kind of fun present? |
| **LeBlanc pleasures** (8 + extended list) | the *types of pleasure* a game can deliver (MDA aesthetics) | an **enrichment checklist** — which pleasures are present, weak, or missing? |

Use one model's strength to backfill another's blind spot: Quantic Foundry says
*who* to build for; Lazzaro and LeBlanc say *what experiences* must then be
present for that audience.

## Lazzaro's 4 Keys to Fun (coverage checklist)

Nicole Lazzaro's four types of fun name distinct emotional experiences a session
can produce. Treat them as a **playtest coverage checklist**, not a player
typology — a strong game usually delivers two or more; a one-key game feels flat.

- **Hard Fun** — challenge, mastery, the triumph of *fiero* (overcoming the odds).
  Driven by meaningful obstacles and skill growth. Maps to Challenge/Strategy.
- **Easy Fun** — curiosity, wonder, exploration, fooling around without pressure.
  Driven by novelty, atmosphere, and toys to poke at. Maps to Discovery/Fantasy.
- **Serious Fun** (altered-state / people-with-self) — playing to *change how you
  feel or think*: relaxation, excitement, a sense of purpose, getting better at
  something real. Driven by rhythm, repetition, collection, real-world value.
- **People Fun** — amusement from others: cooperation, competition,
  *schadenfreude*, gifting, sharing. Maps to Community/Competition.

**Checklist (prototyping/playtest):** (1) Which of the four keys does a session
actually produce? (2) Which is weakest or absent — and is that deliberate for
the audience? (3) Can a missing key be added cheaply (a toy for Easy Fun, a
shared moment for People Fun) without diluting the primary? (4) Does the *primary*
key match the audience's primary Quantic Foundry motivation?

## LeBlanc's Pleasure Taxonomy (enrichment checklist)

Marc LeBlanc's eight game pleasures (the MDA "aesthetics" — see the MDA framework
rule for the full vocabulary) name *kinds of pleasure* a design can deliver.
Schell pairs them with the **Lens of Pleasure**: which pleasures does the game
give, and which is it missing that it could add?

- **Sensation** — pleasure of the senses; delivered through aesthetics and tactility
  (good components, juice). Can't save a bad game; makes a good one better.
- **Fantasy** — being someone/somewhere else (= QF Fantasy).
- **Narrative** — dramatic unfolding of events, not a fixed linear plot (= QF Story).
- **Challenge** — the core gameplay pleasure: a problem worth solving (= QF Challenge).
- **Fellowship** — friendship, cooperation, community (= QF Community).
- **Discovery** — finding the new: world, secret, or strategy (= QF Discovery).
- **Expression** — self-expression and creation (= QF Design).
- **Submission** — the pleasure of *joining the magic circle*, leaving reality for
  the game's rules and meaning (immersion/buy-in).

**Beyond the eight** (Schell's extended list — hidden pleasures lists routinely
miss; treat as a living prompt, not a closed set): **anticipation, completion,
schadenfreude, gift-giving, humor, possibility (having options), pride in
accomplishment (naches), surprise, thrill (fear minus death), triumph over
adversity (fiero), wonder.** Two cautions Schell stresses: a flat taxonomy *hides*
pleasures it has no box for (e.g. *nurturing* and *destruction* surfaced only via
the gender discussion), and **context decides** — the same act is pleasurable in
one setting (dancing at a party) and excruciating in another (dancing at a job
interview).

**Checklist (spec/review):** (1) Which pleasures does each core system deliver?
(2) Which are absent — deliberately, or by oversight? (3) Is there an
under-served pleasure that could make the game *distinctive* rather than just
complete? Overlaps with Quantic Foundry (most pleasures map 1:1) and MDA
aesthetics are expected — use LeBlanc to catch the ones QF's spectra don't name
(Sensation, Submission, and the extended list).

## Demographic & Psychographic Audience Signals

Schell treats age and gender as **audience-definition signals — tendencies, never
deterministic essences.** They inform *routing* (who is this for, how do they
play), but the spec is still written in motivations. Generalizations are a tool
for designing at scale; they must not be read as truths about any individual.

- **Age brackets shift play behavior** (Schell's nine standard industry groups,
  abbreviated): toddlers want *direct* interfaces (touch) not abstract ones
  (gamepad); 7–9 turn critical and capable; ~10–13 is the "age of obsession";
  teens see male/female interests diverge sharply; young adults (18–24) have time
  and money — prime buyers; 25–50 skew casual, time-poor, often family/co-play
  and the *purchase decider* for kids' games; 50+ ("empty nesters") return to
  games, favoring strong-social ones. Younger brackets split by developmental
  stage, older brackets by family status. This aligns with Quantic Foundry's
  finding that appetite for Competition/Excitement declines with age — "core
  gamer" silently encodes an age bracket.
- **Gender play-style tendencies** (Schell, framed as broad tendencies for
  broad-audience design — *not* a checklist to apply to a person): male-skewing
  inclinations — mastery for its own sake, head-to-head competition, destruction,
  spatial puzzles, learn-by-trial-and-error; female-skewing inclinations —
  emotion and human relationships, real-world grounding, nurturing/caretaking,
  verbal puzzles and dialogue, learn-by-example with clear guidance, and comfort
  with parallel multitasking. The deeper claim (per Koster): the *abstract
  formal-system core* of games tends to appeal more to male players, but that core
  can carry many other experiences (creativity, learning, socializing) that
  broaden the audience — "the fruit is still tasty if you don't eat the core."
- **Use the signals as hypotheses, validate by observation.** Schell's *Pirates of
  the Caribbean* / DisneyQuest case: the same game was tuned for four sub-audiences
  by *watching how each actually played* (boys aggressive-offensive, girls
  defensive + treasure-seeking + chatty, etc.), then rebalancing — design from
  observed behavior, not from the stereotype.
- **Psychographics beat demographics.** Demographics (age, gender, income) are
  outer proxies for an inner question: *what pleasure does this group seek?* When
  possible, segment by the pleasure/motivation sought, not by how the player looks
  on a form. A target audience written as "18–35, mobile" is a demographic
  placeholder, not a design target.

## The Player's Mind — Four Abilities Behind the Experience

Schell's reminder: **the experience exists only in the player's mind**, built from
simplified mental models, not delivered whole by the game. Four mental abilities
let players construct (and the designer engineer) that experience — directly
relevant to engagement and immersion.

- **Modeling** — the brain runs on simplified models, never raw reality. Games are
  pre-simplified "cleaned-up" models (like a cartoon already drawn in outlines),
  so they are *restful* — easier to grasp and master than messy reality. Design
  implication: clear, legible rule-models let players relax into mastery; ambiguity
  forces costly real-world-style modeling. Surprise/delight comes from gently
  *breaking* an expected model (the magician's gasp).
- **Focus** — selective attention; sustained focus is the gateway to **Flow**
  (clear goals, no distractions, direct feedback, steady-but-solvable challenge —
  the flow channel between boredom and frustration). See the Flow material in the
  frameworks rule; here it anchors *engagement* as an attention-capture problem.
- **Empathy** — players don't just feel a character's emotions, they project their
  whole *decision-making process* into it, "becoming" someone else. The lever for
  emotional investment and for why an avatar's readable expression (Schell's dog
  example) earns care. Drives Fantasy/Story payoff and immersion.
- **Imagination** — everyday gap-filling: tell a fragment ("the mailman stole my
  car") and the player auto-completes a vivid scene. Design implication: you need
  not render every detail — decide *what to show and what to leave to imagination*.
  Imagination serves both communication (story) and problem-solving (the player
  simulates options before acting).

**Checklist (engagement/immersion):** (1) Is the rule-model legible enough to
*relax into*, or does it tax the player like reality? (2) Does the loop hold focus
(clear goal, instant feedback, tuned challenge)? (3) Is there a character/situation
worth projecting into? (4) Am I over-specifying detail the player would gladly
imagine?

## Emotion-Trigger Lookup Workflow

When you need a *what-to-evoke* menu for a target audience — the recurring desires
a design can reach to pull a given audience in — open
`.unikit/memory/gamedesign/core/references/player-motivation-emotion-triggers.md`.
It carries Sylvester's full audience-facing trigger inventory (learning, challenge,
character evolution, social, acquisition, spectacle, beauty, music, environment,
threat/sexual signals) with the QF/LeBlanc overlap and cost/caution per trigger,
plus the design reads (match the trigger to the audience, stack don't fight,
amplifiers-not-engines, mechanics-only vs story-added). Reach for it when targeting
emotion for a specific audience; the *who* models above stay here. The value-shift
mechanism behind these triggers is framework-level theory — see the frameworks rule.

## Fulfillment vs Compulsion (Sylvester)

Sylvester's Ch 8 ("Motivation and Fulfillment") draws the sharpest line in this
file: **motivation and satisfaction are different systems, and a game can
maximize one while starving the other.** This is his distinctive contribution —
the others here say what players *want*; he warns that *making them want* is not
the same as *fulfilling* them, and stakes out an ethical position on the gap.

- **Dopamine = "wanting," not "liking."** The reward-centre dopamine system marks
  *motivation*, and it *precedes* the reward; it is **not** the marker of
  pleasure. The two can fully decouple — addicts *want* the drug more while
  *liking* it less; players "can't stop" a game that long ago stopped being fun.
  So a design can drive intense wanting (high motivation, high retention) that is
  hollow of any actual satisfaction. (This is a sharper, mechanism-level statement
  than the SDT/want-vs-must notes above — keep both.)
- **Reinforcement schedules are the motivation tool.** Skinner's schedules
  (fixed-ratio, **variable-ratio** = the strongest simple one and the engine of
  gambling/loot, fixed/variable-interval) drive *motivation* independent of
  satisfaction. **Compound schedules** ("just one more turn" in Civ, grind-RPG
  "always one trophy away") keep at least one schedule at peak so the player never
  hits the "shelf moment" — the gap where they'd put the game down. Emergent
  schedules arise unplanned from low-level mechanics (chess captures, deathmatch
  kill counts) and motivate exactly the same way.
- **Genuine fulfillment is the design *target*; motivation is only the engine that
  carries the player to it.** Every game needs some dopamine motivation (without
  it players quit at the first failure), but motivation with **no core of feeling**
  is "the shell of action without the kernel of emotion." Sylvester's worked
  cautionary case: Bogost's *Cow Clicker* parody — a bare fixed-interval schedule
  with no experience at all — still compelled thousands to keep clicking even
  after the cows were removed. Compulsion is real; satisfaction is the thing worth
  building.
- **Reward adjustment (alignment) is the way out of the trap.** Extrinsic rewards
  distort, displace, and can destroy the intrinsic experience — but you still need
  motivation. The resolution: **only reward what the player already wants to do**,
  so the reward structure tracks the player's intrinsic desires instead of
  bending behavior away from them. Tightly aligned (racing → reward fastest time;
  *Skate*'s richly weighted trick-scoring) the two motivations fuse. Poorly
  aligned (score only jumps through floating rings) the reward fights the creative
  play and leaves an elegant system lifeless. For purely creative/exploratory/
  social systems where the game *can't detect* goal-completion (SimCity's
  hometown, befriending in a co-op game, a Dwarf Fortress contraption), the right
  move is to add **no** extrinsic reward at all — any such system destroys
  motivation rather than creating it.
- **The ethical spectrum.** Sylvester is explicit that this is a design-ethics
  issue, not just craft: at one end, a well-aligned reward structure tied to a
  meaningful core experience — "just good game design"; in the middle, games that
  alternate compulsion and fulfillment (grind then a thrilling boss) — usually a
  *craft failure* better rewards would fix; at the far end, designs that optimize
  every decision for motivation regardless of the core experience — "not
  experience engines, just annoying machines" that leave the player with **player
  regret** (time/money spent, nothing felt). His stance: a designer mastering the
  craft wants more than a Skinner box, and even naive players eventually learn to
  avoid regret and return to wanting what they always wanted from games — new
  ideas, new friends, new experiences.

**Fulfillment vs compulsion — contrast.** A practical screen for any reward or
loop:

| | Compulsion (motivation only) | Fulfillment (motivation + satisfaction) |
|---|---|---|
| Drives | dopamine "wanting" / reinforcement schedule | a real human-value shift the player *enjoys* |
| Reward alignment | rewards behavior the player wouldn't otherwise choose | rewards what the player already wants to do |
| Player after a session | "can't stop," then **player regret** | spent time well, would do it again |
| Schedule role | the *point* of the design | a carrier *to* the core experience |
| Telltale | "one more turn" with no felt payoff; bored but still clicking | the loop is fun even with the score hidden (*Skate* test) |
| Verdict | red flag — Skinner box / "fun pain" | the design target |

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
- Reading age/gender tendencies as deterministic facts about an individual
  player instead of broad audience signals to validate by observation.
- Reading a Big Five trait as a fixed fact about an individual player instead of
  a weak, audience-level correlation with motivations.
- A loop that has silently drifted from want (pleasure-seeking) to must
  (pain-avoidance) — engaging but no longer enjoyable.
- Bolting on points/achievements to an already intrinsically fun activity and
  expecting more engagement (overjustification risk).
- Mistaking high engagement/retention for satisfaction — optimizing a loop for
  dopamine "wanting" while the core experience stays hollow (Sylvester: motivation
  without the kernel of feeling; ships player regret).
- A reward structure that rewards behavior the player wouldn't otherwise want,
  bending creative/exploratory play toward whatever the score can detect
  (reward-misalignment; the "jump through floating rings" trap).
- Leading a design with cheap amplifier triggers (spectacle, gore, sexual signals)
  that decay with overuse, instead of with engine triggers (learning, challenge,
  character, social).

## Source Map

| Source | Used for |
|--------|----------|
| Quantic Foundry Gamer Motivation Profile (Yee et al., factor-analytic survey model) | The Quantic Foundry Model section — 12 motivations / 6 pairs / 3 clusters, 9 gamer types, continuity and age findings |
| Robert Zubek, *Elements of Game Design* (MIT Press, 2020; Russian translation), Ch 2 | Personality & Motivation — the Big Five Link — the Yee × Big Five (OCEAN) correlation table; extraversion explaining the Competition+Community pairing; "games express identity, not escapism"; the empirical-models-derive-categories vs imposed-taxonomies (Myers-Briggs/Bartle) epistemic note |
| Richard Bartle, *Hearts, Clubs, Diamonds, Spades: Players Who Suit MUDs* / *Designing Virtual Worlds* | Bartle section — four types, two-axis plot, historical-context caveat |
| Nicole Lazzaro, *Why We Play Games: 4 Keys to More Emotion Without Story* | Lazzaro's 4 Keys to Fun section — hard/easy/serious/people fun coverage checklist |
| Jesse Schell, *The Art of Game Design: A Book of Lenses* (Russian translation), Ch 9–11 | Needs (Maslow/SDT, intrinsic vs extrinsic, want vs must); Bartle framing & vs-QF guidance; LeBlanc's 8 pleasures + extended list and the Lens of Pleasure; demographic/psychographic audience signals (age brackets, gender tendencies, DisneyQuest case); the four mental abilities (modeling, focus, empathy, imagination) |
| Tynan Sylvester, *Designing Games* (O'Reilly, 2013; Russian translation), Ch 1, 8 | What Triggers Player Emotion (audience-facing trigger inventory: learning, challenge, character evolution, social, acquisition, spectacle, beauty, music, environment, threat/sexual signals; trigger-stacking and amplifier-vs-engine reads; mechanics-only vs story-added range); Fulfillment vs Compulsion (dopamine = wanting ≠ liking; reinforcement/compound schedules; fulfillment as the design target; reward adjustment/alignment; the ethical spectrum and player regret; contrast table); related anti-patterns |
