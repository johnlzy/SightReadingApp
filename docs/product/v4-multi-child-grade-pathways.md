# v4 Multi-Child Profiles and Independent Sight-Reading Progression

Status: **Product specification for review, not implemented**. Current household pilot has two children, ages 7 and 10, with different piano-study experience. Their existing ABRSM Grade 1 and Grade 5 study is optional context, **not** a progression track, starting rank, or cap. The game should eventually support advanced musical complexity comparable to upper levels of piano study, potentially Grade 8, without claiming examination-grade certification.

See the [Reading Independence Ladder](./v4-reading-independence-ladder.md), [Opening Audition](./v4-opening-audition.md), [Parent Playtime Controls](./v4-parent-playtime-controls.md), and [Master Redesign](./v4-master-redesign.md).

## 1. Verified current code capabilities and gaps

**Already in v3.2:**
- Local profile selection ("Who is playing?"), with separate name/avatar/difficulty.
- Browser localStorage player list, per-player coin balances, instruments, songs, high scores, learning history and adaptive practice.
- Parent Zone PIN gate for creating/deleting profiles and adjusting legacy credits.
- Touch keyboard and optional monophonic acoustic microphone.
- Learning histories per clef and separate learning checks.

**Needs correction:**
- Player identity is currently an **array index**; deletion/reordering can change indices. v4 should add immutable IDs and idempotent migration.
- Current clef, instrument and input preferences can remain in global session state across profile switches. Restore appropriate settings for each player; treat mic timing calibration as device-related and per-child controls separately.
- Easy/Medium/Hard/Pro are note pools and rhythm rules, **not proper progression tiers** or a Grade 5 sight-reading curriculum.
- Current SVG note game does not engrave a true stationary two-staff piano score. See ladder specification.
- Browser mic is single dominant-pitch detection. Do not claim automated two-hand accuracy or Grade 8 recognition.
- No cross-device login/account sync; **local profile selection is not password authentication**. The client-side Parent Zone PIN is not tamper-proof.

## 2. The two-player household experience

**Profile selector:** show a distinct personalized card per child, with nickname, avatar, chosen companion look, last place in the adventure, next recommendation and separate Music Pass balance. A player does not see their sibling's mastery or coins.

**Parent setup:** parent may enter piano study experience, interests and optional reference grade, but **study grade must not decide the app's learning level**. Offer an optional self-described starting preference ("new to reading", "know some notes", "play from sheet music", "comfortable with two staves"). This is a *hint*, not an assessment.

**First-time audition:** invite each learner to a friendly 3–7-minute first concert (shorter when useful). Start at a reasonable challenge, offer harder unseen phrases when successful, allow an optional stretch attempt, then set a **provisional** level with confidence. No pressure, rank or sibling comparison. See [Opening Audition](./v4-opening-audition.md).

**Return:** the app resumes the right sibling's learning journey, last world/score mode, independent challenges, inventory and timer. Switching profiles safely stops the microphone, saves the current session and clears transient note state.

**Parents:** a single household view shows each child's *own* skill trajectory and time allowance. No cross-sibling leaderboards, and an advanced student's foundation drills should be presented respectfully.

## 3. Same ten-level ladder, different starting points

The app should have a **continuous level system** independent of piano grades:

- Levels 1–3: beginner note mapping and short melodic phrases, mostly guided at first.
- Levels 4–5: **stationary single-staff** sight-reading, rhythm, preparation and reading ahead.
- Levels 6–7: **stationary grand staff**, hand independence and common patterns.
- Levels 8–10: complex full-score reading and expressive musical continuity, **no auto-scroll**, hints or targets during independent performance.

The age-7 child may start at an early level if the audition supports that result; the age-10 child could enter at Level 4–8 or elsewhere depending on actual first-sight evidence. Neither starting point is fixed by the child's stated study grade.

### Musical task policies

| Property | Learner needing foundations | Learner ready for advanced score reading |
|---|---|---|
| Evidence | single-line first-try notes, rhythm/pulse | unseen phrases, both staves, harmony/contour and continuity |
| Guidance | note highlights and optional key labels during *practice* | none during independent performance; study mode separately |
| Reading view | guided notes, then short stationary phrase | full stationary grand staff with explicit manual page turns |
| Task length | 2–4-note groups evolving to phrases | multi-bar, coherent original musical passages |
| Feedback | immediate during instruction, celebratory after | after phrase/piece; avoid overlays obstructing notation |
| Mic scoring | one note at a time when confident | automatic separate-hand tasks; manual/teacher assessment for simultaneous chords |

## 4. Profile and curriculum contracts

Proposed (not shipped) local data:

~~~ts
interface ChildProfileV4 {
  profileId: string;          // immutable ID, never a mutable array index
  nickname: string;
  avatarId: string;
  studyContext?: string;      // optional piano grade or experience, NOT a level
  learningPath: {
    levelBySkill: Record<string, number>;
    confidenceBySkill: Record<string, "low"|"medium"|"high">;
    independenceMode: "guided"|"phrase"|"independent";
    auditionStatus: "not-started"|"incomplete"|"provisional"|"reviewed";
  };
  currentClef: "treble"|"bass";
  preferredInput: "touch"|"microphone";
  playBudget: PlayBudgetV1;   // child-specific Music Pass allowance/usage
  progress: object;
  cosmetics: object;
}
~~~

Placement can recommend a starting tier, **not** unlock permanent exclusive ability or prevent a student choosing the Independent Score view. Every child can request "Try a harder piece" at any point. Extra practice and later checks revise the skill profile promptly. Do not offer higher shop payouts for a lower placement.

**Student-level skill prerequisites** are separate from the display mode. A child may need rhythm work while being very fluent in pitch decoding. Let them temporarily study a weak strand without forcing all music into a baby-level interface.

**Assessment independence:** held-out first-sight phrase sequences remain separate from adaptive training. An incomplete or uncertain audition should not write a false failure. Parent or teacher review may be used for simultaneous-note content that the microphone cannot measure.

## 5. Individual caregiver controls

Both profiles receive **separate daily Music Pass allowances** (5-minute units). Parent can choose different amounts, including Unlimited, without assumptions based on age or level. Time spent on Store, Practice, Skill Checks and independent scores must all count while foregrounded. When switching players, checkpoint the outgoing child's allowance and immediately load the incoming child's; do not share timer state or infer a fresh budget from resetting session state.

Caregiver grant and policy changes require the Parent Zone gate. The app's local PIN should not be portrayed as secure OS-wide protection.

## 6. Tests and tickets

- **V4-16 (P0):** stable multi-child profile migration, selection, restoration of preferences, mic lifecycle and separate budgets.
- **V4-17 (P0):** optional study context plus **independent audition placement**; do not automatically assign level based on grade.
- **V4-18 (P1):** coherent beginner phrases and advanced, stationary two-staff content from one ladder; support teacher/manual evaluation without invented microphone percentages.
- **V4-19 (P1):** one adult dashboard with per-child learning evidence, recommendations and budget controls.
- **V4-25 (P0/P1):** audition adaptive item selection, optional stretch challenge and confirmation, confidence and safe incomplete/resume behavior.

Release test matrix:
1. Create two children, give different Music Pass policies and independently placed levels; save and reload.
2. Change clef, mic/touch and last activity for one; switch to other; no setting or progress leak.
3. Delete or reorder a legacy indexed profile; preserve the remaining child's stable progress.
4. Higher-level child can open a stationary grand-staff score without advancing through every earlier guided note.
5. Advanced simultaneous-note performance never receives unsupported automated microphone scoring.
6. Low/uncertain audition result stays provisional and offers a new advanced challenge without penalty.
7. Parent can view each child's performance **relative to their own past checks**, not sibling ranking.

This is a planning document only. Existing profiles and the v3.2 game remain unchanged.
