# UX & Onboarding — Channels & Modes of Information

Detailed interface information-architecture material extracted from
`ux-onboarding.md` (load on demand when mapping information to display channels or
designing/auditing interface modes). The main rule keeps the conceptual hook; this
file holds the full channel-assignment process, the worked information→channel→
presentation mapping table, and the mode-error discipline with both checklists.
Source: Jesse Schell, *The Art of Game Design: A Book of Lenses*, Ch 15–16
(Lens of Channel and Dimension, Lens of Modes).

## Channels & Modes of Information

Schell's **Lens of Channel and Dimension** gives a concrete process for deciding
*what* the player needs to know and *how* it reaches them — a complement to the
Hodent load budgets (load asks "how much"; this asks "through which path"):

1. **List every piece of information** the game must convey, then **rank by need**
   — *always visible* / *needed during play* / *needed only sometimes*. Salience
   follows rank: the most-needed information gets the most legible placement
   (Schell's *Zelda* HUD gives health nearly a third of the bar).
2. **List available channels** — a channel is any path that carries a data
   stream: HUD regions (top-center, a corner), the player's character, sound
   effects, music, the screen edge, an approaching enemy's body, a speech bubble.
   Many channels are world- or character-borne, not HUD chrome.
3. **Assign each piece of information to a channel** — iterate with rough
   sketches; group like data (all two-digit resource counts in one place).
4. **Choose the presentation (dimension)** of each channel — one channel can
   encode several facts at once via color / size / font (a damage number's
   *color* = friend vs foe, its *size* = how close to death). Powerful and
   elegant, but each extra dimension is something the player must learn, so spend
   them sparingly.

Example mapping (information → channel → presentation):

| Information | Need | Channel | Presentation |
|-------------|------|---------|--------------|
| Current surroundings | Always | Main play area | The world itself |
| Health | During play | HUD top bar | Largest slot; flash/sound at critical |
| Resource counts | During play | HUD top bar (grouped) | Uniform two-digit numerals |
| Equipped tool | During play | HUD top bar | Boxed, with button-icon reminder |
| Full inventory | Sometimes | Secondary screen (mode) | Opened on demand |
| Damage dealt | On event | Number above the enemy | Color = ally/foe, size = severity |

Schell's rule of thumb: don't overload a single channel, and **if it looks
different, it must behave different** (and vice-versa) — color variants players
read as functional variants; one icon meaning two things ("X" = close *and*
delete) breeds confusion.

## Modes & Mode Errors

A **mode** is a change in one of the interface mappings — the same input now does
something else (a stick that steers while driving but aims while throwing).
Schell's **Lens of Modes** keeps modes from confusing the player:

- **Use as few modes as possible** — each is a new thing to teach.
- **Avoid overlapping modes on one input channel.** If two modes both claim the
  analog stick, a mode error is inevitable; move one to a different channel (the
  second stick), or keep overlapping modes in *different dimensions* (stick =
  walk/fly, button = lightning/fireball — these compose safely).
- **Make modes visibly distinct.** The classic mode-error failure is `vi`, whose
  command and insert modes looked identical with no feedback. Signal a mode
  change with something large and unmissable: change the character's actions,
  swap on-screen information (an RPG combat screen), or shift the camera. A
  player who doesn't know which mode they're in is a player out of control.

> **Mode checklist** (Schell)
> - Can any mode be removed or merged?
> - Do two modes share one input channel? If so, can they use different ones?
> - When a mode changes, how does the player *know* — through how many cues?
