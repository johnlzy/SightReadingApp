# v4 Multi-Child Profiles and Grade-Appropriate Sight-Reading Tracks

Status: **Product specification / review**, not yet implemented. Grounded in the two primary household use cases: **a seven-year-old playing ABRSM Grade 1 piano** and **a ten-year-old playing ABRSM Grade 5 piano**. This does not imply that either child's actual sight-reading proficiency has been measured.

Read alongside [master redesign](./v4-master-redesign.md), [execution backlog](./v4-execution-backlog.md), and [Parent Playtime Controls](./v4-parent-playtime-controls.md).

## 1. Current implementation audit (v3.2)

**Already present on a shared browser:**
- A "Who is playing?" profile selector in index.html; each profile has name/avatar/difficulty.
- js/storage.js persists a player list under localStorage key fsr_users_v2 and chooses profiles via loginUser(index).
- Separate per-profile treble/bass coins, song unlocks, inventory, credits, scores, and v3.2 adaptive-learning histories.
- Login migrates missing learning fields via ensureLearning(user).
- A Parent Zone gate for creating/deleting profiles and granting credits.

**Gaps to fix:**
- No actual password, email-based account, or cross-device synchronization. The child can select a local profile; do not call it a secure authentication system.
- Profiles are identified by **array index**, which changes when another profile is deleted. Introduce an immutable profileId; make migration lossless and idempotent.
- Global in-memory preferences (state.currentClef, state.currentInstKey, state.inputMode, mic timing compensation) are not per-child user preferences. Switching profiles can carry settings from one child into another; decide which settings are profile-specific vs device-specific.
- Profile creation offers easy/medium/hard/pro, not an educational grade pathway; current "pro" is mainly a different timing exercise, **not ABRSM Grade 5 proficiency**.
- v3.2 learning generator largely presents a one-note-at-a-time keyboard. It cannot adequately assess Grade 5 two-staff reading, rhythm plus phrasing, or independent multi-voice fluency.
- Acoustic microphone detector is **monophonic**; it cannot reliably evaluate simultaneous notes/hands. Do not claim full Grade 5 sight-reading scoring by acoustic audio until polyphonic recognition is researched, implemented and validated.
- Parent PIN stored in the browser is a local convenience gate, not tamper-proof access control.
- The current v3.2 daily credit/ticket settings are not consistent playtime limits; the proposed Music Passes must be bound to the profileId.

## 2. Required multi-child flow

**Welcome:** "Who is playing today?" with large distinct visual cards, for example **Player A (Grade 1)** and **Player B (Grade 5)**. Cards show their own companion customization, most recent world, and one next learning recommendation. Do not display score comparisons between siblings by default.

**Select profile:** resume only that player's personalized Home, clef, preferred input, level band, checkpoint and rewards. Switching away must finalize/pause a current session, stop audio capture, save the child's practice ledger and time budget, and clear transient in-memory exercise state.

**Create/edit profile (Parent Zone):** parent gate permits nickname, avatar/Pip customization, age band (optional; collect no exact birthdate), current piano-study grade (Initial–8 or "Not sure"), starting sight-reading track, optional target practice skill, time allowance and accessibility needs. The child can choose their cosmetics without gaining access to another child's progress or adult-only settings.

**Parent overview:** separate cards for each child; allow direct per-child allowance updates, view independent Skill Checks/weekly improvement/retention, and optionally a *family-wide device cap* later. No cross-sibling ranking.

**Persistence & limits:** stable profileId in each user record; all learning, coins/Sparks, inventory, quests, exams and per-child Music Pass accounting keyed to profileId. Keep microphone *device calibration* scoped per device, but personal preferences (mic vs touch, treble/bass) stored/restored by profile. Protect against old profile index reuse after deletion.

## 3. Two initial development tracks — dramatically different needs

| Dimension | Grade 1 child (age 7) | Grade 5 child (age 10) |
|---|---|---|
| Design voice | Warm, visual, short prompts, frequent success | Respectful, self-directed, musician-first, less juvenile |
| First diagnostic | Staff notes, treble/bass basics, familiar note ranges, short first-sight lines | Fresh short excerpts, multiple keys, phrase-level fluency, rhythmic complexity, both staves |
| Core practice | Staff-to-key fluency, steps/skips, simple pulse and short melodies | Patterns, intervals/leaps, key signature recall, look-ahead, phrasing, rhythmic flow |
| Scaffolding | Hints initially enabled, optional key labels, paced repetitions | Guided preparation only as needed; assessment hides labels and hints |
| Game pacing | ~3–5 min guided adventures; a few successful notes per task | ~5–8 min challenges; fewer interruptions, longer real musical phrases |
| Assessment | Untimed note checks followed by short fresh phrases | Unseen graded phrases, score context, musical continuity, tempo and pattern strategy |
| World aesthetic | Pip in Note Nest / Melody Meadow | Same brand, but more advanced Starry Stage / challenge studio, more choice |
| Parent view | First-try notes, note/key mapping and reading confidence | Phrase-level transfer, rhythm flow, musical context and readiness to sight-read independently |

**Critical:** piano grade is **not** equivalent to sight-reading level. The adult chooses the initial *content ceiling*, while a baseline reading check determines the starting skill tier within or below that ceiling. The Grade 5 child must be able to return to foundations without the app presenting this as regression or using infantile visual language.

Build exact ABRSM-style ranges, meter/key complexity and assessment protocols by reviewing current **official ABRSM syllabuses** and teacher input; use original generated exercises, not copied proprietary exam material. Do not assert examination equivalence or readiness without validation.

ABRSM official context: https://www.abrsm.org/en-ai/piano and https://www.abrsm.org/en-gb/about-practical-grades — practical sight-reading involves playing a short unfamiliar musical piece. The published 2027/2028 repertoire changes leave supporting sight-reading tests unchanged.

## 4. Curriculum model and evaluation

**Independent profile fields:**
~~~ts
interface ChildLearningProfileV4 {
  profileId: string;           // immutable UUID/local ID, not array index
  displayName: string;         // nickname; avoid collecting birthdates
  avatarId: string;
  studyGrade: "initial" | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | "unsure";
  sightReadingLevel: string;   // independently assessed, not copied from studyGrade
  pathwayId: string;           // initial progression track
  preferredClef: "treble" | "bass";
  preferredInput: "touch" | "microphone";
  accessibility: { showKeyboardLabelsInPractice: boolean; reduceMotion: boolean };
  musicPassBudget: PlayBudgetV1;
  learning: object;            // independently versioned progress
  cosmeticInventory: object;   // per child
}
~~~

**Shared engine, two curriculum policies:** avoid hardcoding ages or grade rules into the UI and game. CurriculumSelector accepts profile studyGrade, diagnostic observations, target skill IDs, and teacher/parent settings; it returns an ExerciseSpec (notation, range, rhythm, clef(s), input and support policy). A **rendering capability** matrix must reject exercises the currently selected input/evaluator cannot score.

- Grade 1: one melodic line at a time is a valid starter. Short phrase reading must still be introduced, not endless isolated-note taps.
- Grade 5: provide authentic **two-staff phrase-reading** practice even before automated two-hand pitch grading is reliable. Separate *learning mode* (preview, hand-separate exercises or guided pattern spotting) from *assessment mode* (manual/teacher-supported feedback until polyphonic audio is validated). Never display a fabricated percentage for unscorable chords.
- **Microphone capability flag**: monophonic recognition supports one voice at a time; label tasks with simultaneous notes "manual/teacher check" or limited-preview-only, or fall back to separate-hands practice. No MIDI.
- Child-specific, held-out phrase banks: avoid sharing actual assessment sequence histories across siblings if they can observe each other's attempts; version reference difficulty and random seed by stable profileId and check index.

## 5. Separate child profiles and parent playtime controls

Both children can be signed into the same local device at different times and **each gets their own daily allowance and usage ledger**. Suggested 15-minute default remains adjustable, with examples:
- Grade 1 child: parent chooses 10–15 min/day.
- Grade 5 child: parent chooses 15–20 min/day, or an unlimited plan if desired.

These are **illustrative parent choices**, not age-based prescriptions or automatic limits inferred from grade.

If one child is interrupted mid-phrase to switch profiles, save their partial exercise as **incomplete**, stop the microphone and write their elapsed time. The other child's timer and state are unaffected. If desired, a later family-wide time cap may combine both profiles' time; make this an explicit separate setting, not an implicit shared quota.

Caregiver actions (create/delete/edit profile, changing grade track, adjusting Music Pass policy, deleting/exporting progress) require the Parent Zone gate. Existing optional "quick switch" is safe only for changing to a child's existing local profile; it should not confer adult permissions.

## 6. Priority release tickets

Add these as **P0/early v4** work:
- **V4-16 (P0): Stable multi-child profiles.** Migrate array indexes to immutable profileId; ensure score/ownership/learning retention and no cross-profile leak; safe switch/logout resets in-flight microphone/session and restores per-child preferences.
- **V4-17 (P0): Grade-aware onboarding and diagnostic.** Parent sets ABRSM study grade, child takes a short *separate sight-reading baseline*, curriculum starts at an appropriate measured tier; do not overclaim Grade 5 equivalence.
- **V4-18 (P1): Two pilot curriculum pathways.** Grade 1 one-staff note/phrase training; Grade 5 phrase/rhythm/key-pattern and guided two-staff content, with honest "limited automated scoring" until polyphonic evaluator exists.
- **V4-19 (P1): Household progress dashboard.** Separate child cards, next skill recommendations, independent checks, per-child Music Pass controls and no leaderboard comparing siblings.

**Release gates**:
1. Create both child profiles, practice independently, switch/reload, and confirm no transfer of mastery, rewards, settings or Music Pass usage.
2. Delete/reorder legacy indexed users; no progress reassignment. Migration can be rerun safely.
3. Grade 1 tasks and Grade 5 tasks produce meaningfully different validated exercises and UI scaffolds, rather than just varying BPM or note pool.
4. With microphone mode active, multi-note/chord assessment is clearly disabled or labelled incomplete/manual; no false "100%".
5. In each child's account, test touch fallback, mic cleanup and game interruption, including limit expiration.
6. Compare each child's held-out phrase results **to their own prior baseline**, not to each other or to study-grade label.

## 7. Suggested product design for initial household pilot

- Set up **two distinct named accounts with personal avatars** rather than two shared difficulty buttons.
- Parent chooses ABRSM Grade 1 and 5 as **study context**, not as a scoring claim.
- Take **one initial 3–5-minute diagnostic per child**, with questions appropriate to the starting range. Allow a parent to downgrade/upgrade the initial path.
- Build a **shared world with optional age-aware presentation**, preserving one coherent visual brand and different missions per profile.
- Start with one Grade 1 and one Grade 5 exercise bank, one learning dashboard per child, and individualized playtime allowances. Gather actual usability and reading data before expanding content.
