---
version: 1.0.0
---

# Accessibility

> **Scope**: Game accessibility method — the standards (Game Accessibility Guidelines, Xbox Accessibility Guidelines, AbleGamers APX, CVAA), impairment categories and their design responses, the GAG basic/intermediate/advanced commitment tiers, the player-experience-first stance, the legal floor, and high-impact features.
> **Load when**: designing or reviewing for accessibility; setting accessibility requirements; committing to a guideline tier; planning input remapping, subtitles, colorblind support, or difficulty options; checking legal obligations.

---

## The Standards

Four references, each with a different job:

| Standard | What it is | Use for |
|---|---|---|
| **GAG** (gameaccessibilityguidelines.com) | community guidelines, tiered basic/intermediate/advanced | the working checklist; commit a tier |
| **XAG** (Xbox Accessibility Guidelines) | platform guidelines + test cases | concrete, testable acceptance criteria |
| **APX** (AbleGamers Accessible Player Experiences) | design-thinking framework | designing *for* players, not to a checklist |
| **CVAA** (US, via IGDA GA-SIG) | law: in-game communication accessibility | the legal floor for multiplayer comms |

Accessibility is **design, not a late audit** — retrofitting is far costlier and
worse than designing accessibly from the pillars.

## Impairment Categories & Responses

Design responses cluster by the barrier they remove:

| Category | Barriers | Common responses |
|---|---|---|
| Motor | precise/rapid/sustained input | remappable controls, hold→toggle, reduce QTE/timing demands, adjustable speed |
| Vision | low vision, blindness, colorblindness | scalable text/UI, high-contrast, colorblind-safe + redundant coding, screen-reader menus, audio cues |
| Hearing | deaf, hard of hearing | subtitles + captions, visual indicators for audio cues, no audio-only critical info |
| Cognitive | memory, attention, processing | clear language, adjustable difficulty/pace, reminders, skippable content, consistent UI |
| Speech | voice-input/comms reliance | text alternatives to voice chat |

Principle: **never convey critical information through a single channel.** Color,
sound, or timing alone each excludes a population — add a redundant channel.

## GAG Commitment Tiers

GAG sorts features into **Basic / Intermediate / Advanced** by impact-vs-effort:

- **Basic = the floor** — high impact, low effort (subtitles, remappable inputs,
  no flashing-without-warning). Treat Basic as **mandatory**.
- **Intermediate = should** — commit per the audience and pillars.
- **Advanced = stretch** — deeper support (full screen-reader play, extensive
  difficulty granularity); a deliberate, scoped bet.
- **Commit a target tier per scope** and hold it; "we'll add
  accessibility later" is the anti-pattern this rule exists to prevent.

## APX — Player Experience, Not a Checkbox

AbleGamers' Accessible Player Experiences reframes from "tick the box" to
"design the experience for real players":

- Think in **player profiles** (a one-handed player, a player with low vision)
  and trace whether they can complete the core loop — same method as the
  motivation-coverage check, applied to ability.
- A feature can pass a checklist and still fail the experience (remappable
  controls that can't map the one button the game requires). Test the *journey*.

## The Legal Floor (CVAA)

- **CVAA** (US) requires that **in-game communication features** (text/voice
  chat, lobbies) be accessible — captions for voice, text alternatives. It is
  **law**, not best practice, for games with comms in scope.
- Regional obligations vary (EU EAA and others expanding); when comms or a target
  market triggers a legal requirement, it must be met, not treated as a
  suggestion. Surface the obligation; the user decides scope.

## High-Impact Features

The reliably high-return set (commit these first):

- **Fully remappable controls** + alternatives to held/rapid input.
- **Subtitles on by default**, resizable, with speaker labels and background.
- **Colorblind-safe palettes** with **redundant coding** (shape/icon/label, not
  color alone).
- **Scalable difficulty / assist options** decoupled from "easy mode" stigma.
- **No unwarned flashing** (photosensitivity — a safety, not a preference, issue).
- **Audio cues mirrored visually** and vice versa.

## Anti-patterns

- Treating accessibility as a post-launch audit instead of designing it in.
- Critical information by color, sound, or timing alone — single-channel
  exclusion.
- Committing to no GAG tier ("we'll see") — the missing-floor anti-pattern.
- Remappable controls that still can't remap the one input the game demands.
- An "easy mode" presented as the only accessibility provision.
- Unwarned flashing — a photosensitivity safety failure, not a style choice.
- Ignoring a CVAA/legal comms obligation as if it were optional polish.
