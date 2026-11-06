# Melody Garden — V4.1 Companion & Workshop

> **Planning for v4:** The proposed product overhaul is documented in
> [v4 master redesign specification](docs/product/v4-master-redesign.md) and
> [v4 implementation backlog](docs/product/v4-execution-backlog.md), and
> [caregiver Music Pass playtime controls](docs/product/v4-parent-playtime-controls.md),
> [Reading Independence Ladder](docs/product/v4-reading-independence-ladder.md),
> and [Opening Audition](docs/product/v4-opening-audition.md).
> These are design proposals only; they do **not** change the released v3.2 game.

A browser-based sight-reading game for children. Practice on the on-screen piano, or
use the device microphone to play notes on a **real acoustic piano**.

## What's new in V4.1

**Pip now has a real customizable home and Workshop.** The companion is drawn
locally using CSS with four gentle expressions (welcome, curious, focused,
celebrating). Hats, accessories, gardens, stage themes, and note trails
visibly change Pip and are persisted independently for every player.

**Sparks are purely cosmetic.** The first v4.1 login migrates each player's
historic treble + bass coin balances to Sparks exactly once, while retaining
the original balances as a migration snapshot. Already owned instrument
sounds remain usable and can be equipped in the Workshop. Cosmetic purchases
never unlock lessons, change learning grades, or increase Music Pass time.

The Workshop shows an immediate preview, a clear price, owned/equipped
states, and a deliberate Buy/Equip action. There are 18 base cosmetic items
plus legacy-compatible instrument sounds. Nothing is randomized or
purchased with real money.

**Today's Music Quest** gently encourages first-try sight-reading. Eight
first-try notes during completed practice, Coin Run or song rounds award a
one-time 15-Spark daily bonus. Skill Checks and auditions do not contribute
and are not changed by the quest. Completed practice earns 12 Sparks, a Skill
Check earns 8 Sparks for participation, and existing score modes retain
their scoring rules while receiving bounded Sparks.

All Workshop and Garden interactions remain within the caregiver's active
Music Pass time allowance. The current local PIN cannot protect against
deliberate browser-storage tampering, so operating-system parental controls
remain recommended for stricter enforcement.

## What's new in the V4.0 foundation

- **Separate local learners:** each child has a stable player ID and their own preferences, music progress and daily time allowance. This is not a cloud login; progress remains in the browser.
- **Parent Music Passes:** one pass represents five minutes of actual foreground child activity. The suggested allowance is 15 minutes/day, editable in Parent Zone to 0, 5, 10, 15, 20, 30, 60 or Unlimited, with +5/+10 minute overrides. A grace period lets the child finish a short phrase; interrupted assessments are not recorded as failures. The local PIN is only a convenience gate and cannot replace operating-system parental controls.
- **Pip's First Concert:** an ability-based opening audition on newly generated stationary monophonic phrases. Placement is provisional; experienced learners can immediately try harder music, without grinding through beginner notes. Musical grade is not used as a level label.
- **Independent Reading:** a fixed, non-scrolling single-staff music view with no note-name hints or moving target indicators. Readable grand-staff/polyphonic score engraving and two-hand evaluation remain future milestones.
- **Garden visual foundation:** welcome scene, companion styling and mobile layout improvements. The mature adventure map, cosmetic workshop and complete curriculum redesign are separate V4 milestones.

The existing v3.2 modes, songs, adaptive practice, and microphone input are preserved. The v4.1 modules include `js/economy.js`, `js/quests.js`, `js/companion.js`, and `js/workshop-ui.js`.

New v4.0 module entry points: `js/profiles.js`, `js/play-budget.js`, `js/app-budget.js`, `js/score.js`, `js/audition.js`, and `js/audition-ui.js`.

## Adaptive learning (v3.2)

Choose **Adaptive Practice** for a free practice session. The game learns
which staff notes were answered correctly on the **first attempt**, tracked
separately for treble and bass clefs, and repeats documented weak notes more
often. Pro learners also revisit note durations with weak onset accuracy.
Regular songs and Coin Run feed this learning model, too. No learning data is
uploaded; existing users are migrated automatically without losing scores.

**Skill Check** is a free, untimed assessment consisting of a fresh, balanced
note sequence drawn without looking at the child's learned mastery. It measures
first-try accuracy and response time and never updates the mastery model.
The note vocabulary is shared with practice, but **the sequences are new**.
This is a within-app progress benchmark, not a standardized or clinically
validated educational assessment.

The **My Learning Journey** panel shows practiced notes, strong notes, focus
notes, and recent Skill Check scores. Improvements should be judged by
Skill Checks, not only by rising scores on repeatedly practiced patterns.
Adaptive Practice and Skill Check do not spend daily credits.

## Using a real piano

1. Open the app using **HTTPS** or **localhost**, on a phone, tablet or laptop.
2. Sign in to a player profile and choose **🎤 Real Piano**.
3. Allow the microphone and play a single note to calibrate the signal.
4. Once the note is recognized, choose **Use Real Piano**.
5. Start Coin Run or Song Mode and play the notes shown on the staff.
6. To return to the digital keyboard, choose **Use touch keys**.

In v3.1, microphone setup includes a small per-device **timing compensation**\nslider. Adjust it only if correct notes are consistently reported Late\nor Early. The starting value is 0 ms.\n\nThe game now scores pitch recognition separately from rhythm accuracy in\ntimed modes and provides Perfect, Good, Early and Late feedback. Correct\npitches played at the wrong time are no longer treated as misidentified notes.\nSongs require 90% pitch and 80% rhythmic accuracy to unlock.\n\nThe app never records or uploads microphone audio. Analysis happens entirely in
the browser, and microphone tracks are stopped when you leave calibration or
a game, switch to touch input, or put the browser tab in the background.

**Microphone mode is monophonic:** it detects one note at a time. Repeated notes
are recognized best when there is a distinct new attack or a brief release.
Chord detection, sustained-note length grading, and noisy-room accuracy are
not provided in this initial release. Low piano notes need a longer analysis
window, which may add perceptible latency. Volume and microphone placement
affect reliability. If detection is unstable, move the device closer to the
piano, reduce background noise, or use the on-screen keyboard.

Audio permission is never requested automatically. If permission is denied,
the digital piano remains available.

## Development

```bash
npm install
npm run check
npm test
npx playwright install chromium
npm run test:e2e
```

The browser suite runs against a local HTTP server started by Playwright,
using Chromium viewport profiles for phones and tablets. The microphone tests
generate synthetic tones in Web Audio and feed those into a virtual media stream.
They verify the capture/scoring integration but **do not** establish real acoustic
piano accuracy on iOS, Android, or any specific physical piano. Manual tests are
required before wider release.

## Modules

- `js/pitch.js`: pure YIN-style monophonic pitch detection and event gating.
- `js/microphone.js`: private microphone capture and cleanup.
- `js/mic-ui.js`: user-initiated calibration, setup, and touch fallback.
- `js/game.js`: shared scoring for touch and microphone notes.
- `tests/pitch.test.js`: synthetic piano signal and gate regression tests.
- `e2e/microphone.spec.js`: end-to-end browser microphone regression tests.

Future releases will focus on timing improvements, repeated-note/onset handling,
adaptive note practice, and optional chord recognition. No MIDI hardware
support is planned.
