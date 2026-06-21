---
version: 1.0.0
---

# Live Operations

> **Scope**: Live-service design method — the live-service premise, the LiveOps mechanic palette (events, special offers, tournaments, content updates), battle-pass anatomy and parameters, content calendars and cadence with marketing-calendar alignment, platform in-app events (App Store / Google Play event cards), content-injection budgets vs team capacity, player segmentation and personalization, A/B testing and experimentation, re-engagement and messaging channels, the engagement-vs-exploitation line, and the per-event post-mortem loop.
> **Load when**: designing a battle pass, season, live event, special offer, or other limited-time mechanic; planning a content calendar or aligning it with a marketing calendar; budgeting content injection; setting event cadence; publishing platform in-app events (App Store / Google Play event cards); segmenting players or personalizing offers; A/B testing a live-ops change; designing re-engagement or messaging; running a live-ops retrospective.

---

## The Live-Service Premise

A live game is an **evolving service**, not a finished product. The **content
calendar is a first-class design artifact** with the same rigor as a system GDD —
it commits the team to a cadence the economy and the audience are tuned around.

- Design the **operating loop**, not just launch content: what recurs, on what
  rhythm, fed by what budget.
- Live-ops compounds every other rule: it runs on the economy (faucet/sink under
  constant new faucets), rides the core loop's appointment mechanics, and is the
  highest-risk surface for monetization ethics.

## LiveOps Mechanic Palette

A live game runs a **portfolio of recurring mechanics**, not just a battle pass.
Choose the mechanic by the job it does; each carries a distinct engagement driver
and a distinct ethics risk.

| Mechanic | What it is | Primary job | Watch for |
|---|---|---|---|
| Limited-time event (LTE) | Themed, time-boxed mode or content (seasonal, holiday, collab) | Appointment value, novelty, re-entry | FOMO as the *only* driver |
| Special offer | Time-boxed price cut, added value, bundle, or exclusive content | Conversion, monetization | Fake discounts / anchoring — see monetization-ethics |
| Tournament / competition | Ranked or scored event over a window | Competitive re-entry, status | Pay-to-win laddering |
| Content update | New levels, characters, or balance passes shipped via remote config | Treadmill relief, retention floor | Disguising reused content as new |
| Battle pass / season | Tiered free+premium progression track | Engagement+monetization spine | Uncompletable pass, premium-gated value |

- Battle pass is the dominant *structure* (detailed below), but a healthy calendar
  layers several of these so a lapse in one doesn't flatline engagement.
- **Remote configuration** is the enabling capability: ship and tune mechanics
  without a client update so the calendar can react week-to-week. Treat it as a
  design dependency, not just an engineering detail.

## Battle-Pass Anatomy

The dominant engagement+monetization structure (Deconstructor of Fun, Battle
Passes). Parameters to specify:

| Parameter | Decision |
|---|---|
| Tracks | free + premium (and the value split between them) |
| Tier count & XP curve | how many tiers, the XP-per-tier curve, time-to-complete |
| Duration | season length; must be **completable by the target player** within it |
| Pricing & value | premium price vs perceived reward value; the "buy" calculus |
| FOMO line | what is lost by not completing — see the engagement/exploitation line |

- **Completability**: the pass XP curve must let a realistically-engaged player
  finish without grind that crosses into compulsion or pay-to-skip pressure. An
  uncompletable pass that nudges paid tier-skips is a monetization-ethics finding.
- The free track must deliver **real value** — a pass that gates all reward behind
  premium is a goodwill cost.

## Content Calendar & Cadence

- Establish a **predictable rhythm** (weekly beats, monthly events, seasonal
  arcs) — appointment value depends on players knowing *when* (the honest side of
  the core-loops appointment line).
- Layer cadences: short loops (dailies/weeklies) inside seasons inside a yearly
  arc. Each layer answers a "why log in" at its timescale.
- Cadence is a **promise**: missing a committed beat erodes trust faster than
  shipping smaller. Set a rhythm the team can sustain, not a heroic one.
- **Anchor beats to the real world and the marketing calendar.** Tie events to
  holidays and cultural moments, and align them with UA and promo so live-ops,
  marketing, and the economy pull together instead of colliding. A scan of
  competitors' calendars reveals genre norms and the open windows worth owning.
- **Cap concurrency.** Too many overlapping events compete for the same attention
  and dilute each other (and platforms hard-limit simultaneous in-app events — see
  below). Fewer, legible beats beat a crowded calendar.

## Platform In-App Events

App Store Event Cards (iOS 15+) and Google Play in-app events expose live events as
a **discovery and re-engagement surface outside the game** — searchable, shareable,
and shown to lapsed players who haven't opened the app. Design events to fit the
platform envelope:

| Constraint (platform-set — verify against current platform docs) | App Store | Google Play |
|---|---|---|
| Max event duration | ~30 days | ~28 days |
| Simultaneous slots | up to ~10 approved / ~5 published | per-listing limits |

- Treat the event card as a **funnel top**: an outsider sees it, taps through, and
  lands in the event — so the card's promise and the in-game payoff must match. A
  mismatch tanks conversion and trust.
- Localize event metadata and give each event a **direct deep link** to its
  in-game destination.
- These caps reinforce cadence discipline: a ~30-day ceiling forces seasons into
  legible chunks, and the slot limit forces you to choose which beats are worth a
  platform-level push.

## Content-Injection Budgets

- Every calendar slot has a **content cost** (new vs reused vs remixed). The
  central live-ops tension: appetite for fresh content outruns production
  capacity — the **content treadmill**.
- Budget realistically: define cost per slot type, the reuse strategy (rotations,
  remixes, modifiers extend content honestly), and the **sustainable injection
  rate** vs team size. A calendar that assumes infinite new content is a burnout
  and quality-collapse plan.
- Reuse is legitimate; disguising the same content as new and FOMO-gating it is
  not.

## Segmentation & Personalization

One offer for everyone leaves value on the table and annoys the wrong cohort.
Segment, then tailor the **offer, price, reward, and message** per cohort — within
the ethics line below.

| Segment axis | Signal | Tailoring lever |
|---|---|---|
| Spend | spender vs free-to-play | offer type, premium-currency bundles |
| Tenure / loyalty | veteran vs newcomer | veterans tolerate richer, pricier, identity offers; newcomers need value + onboarding |
| Engagement | session frequency, recency | cadence of prompts; win-back vs deepen |
| Progression | early / mid / elder-game | reward relevance to current goals |

- Personalization should **increase relevance, not manufacture pressure.** A
  veteran-only collector offer is fair; segmenting to find and squeeze the most
  vulnerable spender is the whale-targeting dark pattern owned by
  `monetization-ethics`.
- Segment the **messaging** too: the reason a lapsed long-time spender returns is
  not the reason a day-2 newcomer does.

## A/B Testing & Experimentation

Live-ops is the one design surface where you can **measure instead of argue.** Make
experimentation the optimization engine that feeds the retro loop.

- Test **one lever at a time**: offer price, reward amount/mix, UI/creative, offer
  type, event timing. Even small changes (a single price point, a reward count, a
  button) can move metrics meaningfully — which is exactly why they are worth
  testing rather than guessing.
- Hold a **control**, and judge on the segment and the full KPI set (below), not a
  single up-and-to-the-right number. A variant that lifts revenue but craters
  sentiment or D30 retention is a loss.
- Roll the winner into the next calendar slot; an experiment with no decision
  attached is wasted spend.
- **Ethics guard**: never A/B test *toward* the most extractive variant on a
  vulnerable segment. Experimentation optimizes *fit*, not exploitation.

## Re-engagement & Messaging

Events only work if players know they're happening, and lapsed players are a large
reactivation pool.

- Match **channel to lapse depth**: in-app messages for live players, push
  notifications for the recently lapsed, email for deeper or high-value lapse.
- Messaging is a **promise + appointment**: announce *what* and *when*, then
  deliver. Honest re-engagement reminds; manipulative re-engagement nags, fakes
  urgency, or punishes absence.
- Respect opt-outs and frequency caps — over-messaging is the fastest uninstall
  driver. The honest/manipulative split here is the same core-loops appointment
  line.

## Engagement vs Exploitation

- The honest/manipulative split is the **core-loops appointment line**: reward
  presence (show-up bonuses, catch-up, earned-things-persist) vs punish absence
  (streak loss, decay, FOMO as the primary driver).
- The **dark-pattern catalog and legal landscape** are owned by the
  monetization-ethics rule — live-ops *applies* it. Any live-ops mechanic
  load-bearing on manufactured anxiety crosses into that rule's territory.
- Segmentation, personalization, and re-engagement all **sharpen this line**: the
  same targeting that *serves* a cohort can *prey* on it. If a mechanic's value to
  the player depends on manufactured anxiety or on the player not noticing, it is
  monetization-ethics territory.
- Design test: **does the calendar respect a player who skips a season?** Earned
  progress and identity should survive a break.

## Post-mortem / Retro Loop

Live-ops is a feedback system — each event teaches the next. Capture per-event
metrics in three layers, never revenue alone:

- **Reach / conversion funnel** (especially for offers and platform event cards):
  viewers → converters → conversion rate. A high-view / low-convert card is a
  promise-or-fit problem, not a traffic problem.
- **Engagement**: participation, completion, retention lift, and the live-service
  KPIs **DAU / MAU** (and DAU/MAU stickiness).
- **Monetization**: revenue and **ARPU** — broken out per segment, since a blended
  number hides which cohort actually moved.
- **Sentiment** — not revenue alone; a profitable event that burns goodwill is a
  net loss.

Then:

- The retro decides **keep / cut / retune** for the next calendar; a recurring
  event with no retro is flying blind.
- Persist retros as artifacts (the design-side analog of code patches) so lessons
  outlive the team's memory of a season.

## Anti-patterns

- Treating the content calendar as a marketing schedule instead of a designed
  artifact.
- A battle pass uncompletable by the target player, nudging paid tier-skips.
- A free track with no real value — premium-gated goodwill debt.
- Committing to a cadence the team can't sustain (the treadmill → burnout).
- Retention built on decay, streak-loss, and FOMO as primary drivers.
- A calendar that punishes a player for skipping a season.
- Running too many overlapping events at once — they compete for attention, dilute
  each other, and breach platform slot caps.
- Shipping static, never-A/B-tested offers and creatives — leaving conversion and
  fit untuned.
- One-size-fits-all offers that ignore cohort diversity (newcomer vs veteran,
  spender vs F2P).
- Using segmentation or personalization to find and squeeze vulnerable spenders —
  whale-targeting (see monetization-ethics).
- Over-messaging or fake-urgency push spam — the fastest uninstall driver.
- Launching an event card whose promise doesn't match the in-game payoff.
- Running events with no post-mortem — repeating mistakes every season.
- Measuring events by revenue alone, ignoring sentiment, the funnel, and per-segment ARPU.

## Source Map

| Source | Used for |
|--------|----------|
| Apptica — *LiveOps Best Practices: Mechanics* (medium.com/@Apptica/liveops-best-practices-mechanics-f31615dcda85) | LiveOps mechanic palette; platform in-app events (App Store / Google Play) and their constraints; segmentation & personalization; A/B testing & experimentation; re-engagement & messaging channels; marketing-calendar alignment; event conversion funnel and DAU/MAU/ARPU metrics |
| Deconstructor of Fun — Battle Passes | Battle-pass anatomy and the parameter table |
