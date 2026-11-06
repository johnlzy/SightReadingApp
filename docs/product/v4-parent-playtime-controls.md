# v4 Parent Playtime Controls — Music Pass Budget Specification

Status: **Proposed for review; not implemented.** Companion to [the master redesign](./v4-master-redesign.md) and [the execution backlog](./v4-execution-backlog.md).

## 1. Goal and core model

Allow caregivers to set a daily limit on **all child-facing play**, without interrupting a musical phrase abruptly or incentivizing rushed practice.

**Music Pass = 5 minutes of foreground active child-facing app time.** This reuses the familiarity of tickets but meters actual seconds rather than charging one ticket each time a child starts a game. Short exercises can be combined within one pass; exiting early does not forfeit a pass.

Music Passes represent permission to play, not money or reward. **Sparks are cosmetics only** and cannot purchase more playtime. Learning results never grant additional time.

## 2. Parent Zone settings

| Setting | Proposed behavior |
|---|---|
| Default allowance | **15 minutes per day / 3 Music Passes**, a configurable product default, not medical guidance |
| Quick choices | Paused (0), 5, 10, 15, 20, 30 minutes, Unlimited |
| Custom allowance | 5-minute increments up to 60 minutes |
| Extra time | Caregiver may grant +5 or +10 minutes today, behind the existing Parent Zone gate |
| Reset | At the next local calendar day; leftover minutes do not accumulate |
| Scope | Per-child local profile; optional shared-device/family cap in a later iteration |
| Child messaging | "Music time is nearly over", "Finish your phrase", "That's a great place to stop" |
| Companion behavior | Encouraging, never sad/guilty over limits, errors or missed days |

Caregivers must see exactly what counts, how much time remains and when it resets. Provide a first-use review during the v4 profile migration. Current 8 daily credits must not be silently converted to 8 passes (40 minutes).

The existing PIN is **client-side only**, not secure parental authentication against a determined child who can modify browser data or device clocks. When strict cross-app enforcement matters, caregivers must also use device-level parental controls.

## 3. What counts

**Counts while the app is visible and an active child session is running:** Home/Today, World Map, Companion Room, Store/Workshop, Songbook, guided journeys, Coin Run, songs, Adaptive Practice, Skill Checks, free play, results and cosmetics. **All modes are governed consistently**: a child cannot bypass the limit by switching to the currently free Adaptive Practice or Skill Check.

**Does not count:** hidden/background tabs, closed app, explicit Pause, microphone permission and setup/calibration prompts, caregiver-only Parent Zone, and a locked time-up screen. In non-playing UI, pause after around 120 seconds of inactivity and require a tap to resume. During an active musical exercise, count time even if no keys are pressed or microphone notes are detected.

The child may freely view a brief read-only progress recap when time is up. Prevent starting new songs, training, shopping interactions or bonus activities until the next allowance or parent override.

## 4. Humane end-of-time behavior

- At about 2 minutes left: optional unobtrusive notice. Near 45 seconds left: suggest a short stopping point, rather than encouraging a race to finish.
- At zero: block new activities; when a phrase is already playing, finish the **current short phrase**, with a maximum **45-second grace period**, not the whole song.
- If no phrase boundary occurs before grace expires: gently pause, save progress, stop microphone capture, and offer "Music time is done" and "Ask a parent for more time".
- Incomplete Skill Checks must be **unscored** and excluded from progress charts, not reported as failure. Partial practice should be saved without incorrect-note penalties.
- Results and earned items already completed remain visible read-only. The child can leave happily; no red alarm or loss of earned rewards.

Natural boundaries are preferred; grace duration must be tuned with real children and slow-tempo music.

## 5. Data and API contract

Versioned per-profile example (schematic):

~~~ts
interface PlayBudgetV1 {
  version: 1;
  policy: { dailySeconds: number | null }; // null means unlimited; 0 means paused
  localDayKey: string;                     // local YYYY-MM-DD
  consumedSeconds: number;
  bonusSecondsToday: number;              // parent-approved only
  lastSavedAtMs: number;
  locked: boolean;
}
~~~

The single PlayBudgetController should own: canEnterChildActivity, beginForegroundActivity, pauseForBackgroundOrParent, resume, heartbeat, timeRemaining, grantExtraTime, and endAtCheckpoint. Exercise modes, UI, companion and store **must not implement separate independent timers**.

Use a monotonic performance clock during a foreground session and checkpoint the accumulated balance about every five seconds and on visibilitychange/pagehide. Reset on a local-day transition without losing the caregiver's policy. No clock-time is charged while the tab is hidden, during explicit pause or while a parent is configuring the app. A cooperative single-tab lease should prevent two tabs from using an inconsistent balance. Parent overrides require unique grant IDs and idempotent application.

A fully local app cannot provide unforgeable enforcement when a user deliberately changes local storage or clock values. Avoid claiming otherwise.

## 6. Migration and consistency

- Preserve historical credits, songs, scores, instruments, profiles and v3.2 learning as a backup snapshot.
- On first v4 use, explain the new Music Pass model and ask a parent to confirm/change the suggested 15-minute allowance.
- Do **not** directly exchange old tickets for new five-minute passes; the semantics are incompatible.
- Persist a schema-versioned, idempotent policy record so refreshing or re-running migration cannot reset usage.
- Spark migration is separate from play limits; cosmetics cannot bypass limits.
- Ensure changing clef, mode, retry, profile, and refresh does not create a new allowance for the same player.

## 7. Parent and child UI

**Parent Zone:** "11 of 15 minutes used today"; preset selector and custom allowance; optional quick grant +5/+10 minutes; local reset date and plain explanation of counted activities. Require parent gate for any changes.

**Child UI:** Small non-alarming Music Pass indicator e.g. "2 of 3 left"; shows rounded remaining time when near zero. Friendly scene at time-up: Pip encourages stopping, with an adult-accessible extra-time option. No rewards for using all the budget, no guilt for unused time.

## 8. Verification matrix

| Case | Expected result |
|---|---|
| Two 2.5-minute sessions | Consume about one Music Pass, not two |
| Practice/check/store/song modes | All consume the same active-time budget |
| Child reloads mid-session | Used time persists; no reset or duplicate charging |
| Tab hidden, Parent Zone, pause, mic setup | No time charged |
| Active microphone game with no taps | Time still counts, mic stream ends at lock |
| Time expires during a phrase | Stop at next checkpoint, or within 45s; no fabricated mistake |
| Skill Check interrupted by cap | Mark incomplete, no assessment score added |
| Parent authorizes +5 minutes | Reopens exactly once without altering rewards/mastery |
| Midnight rollover | Reset daily usage once; parent policy persists |
| Two profiles or tabs | No cross-profile leakage or doubled timer/grant |
| Corrupt storage, changed clock | Recover safely; communicate local-only security limits |

**v4.0 release gate:** Unit tests with fake monotonic time and storage, mobile Playwright flows across game/store/practice/mic/pause, parent review of understandable controls, and child usability observations of stopping without distress.

## 9. Decisions for user testing

- Is 15 minutes/day a good default? Caregiver can change it at setup, including Unlimited.
- Should a family-wide device cap complement per-child limits? Defer until shared-device research.
- Should earned decorations remain read-only after the cap? Recommended yes, but avoid an endless activity loop.
- Is 45-second grace appropriate at very slow tempos? A defined phrase checkpoint is preferable; measure real phrase lengths.
- If caregiver needs strong enforcement across all apps/devices, recommend OS-level Screen Time / Family Link or equivalent rather than promising local PIN security.

**This is a design specification, not a change to the current v3.2 ticket behavior.**
