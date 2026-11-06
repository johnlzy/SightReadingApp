# SightReadingApp v4 — Master Product Redesign Specification
Status: **Proposal for review**, not an implemented feature set
Baseline: **v3.2.0 on main** (6 screens, 15 songs, 11 instrument listings, touch and acoustic-piano microphone input, adaptive note practice and separate Skill Checks)
Target audience (design assumption to validate): **children approximately 6–10**, with adaptations for emerging readers and parent-supported younger learners. Secondary audience: parents and piano teachers.
Product name (working): **Melody Garden — a Sight Reading Adventure**. Keep "SightReadingApp" as the repository/project identity pending brand review.

## 1. Product vision and non-negotiables

**Promise to the child:** "Every note you learn brings your musical world to life."

**Promise to the adult:** "Short, enjoyable piano practice with visible, trustworthy evidence of progress on new music and caregiver-controlled playtime."

**North star (to validate):** More children voluntarily complete an age-appropriate practice session and improve first-try performance on unseen, musically valid sight-reading phrases after a week of spaced practice.

Principles:
1. Music comes first; rewards celebrate progress rather than buy it.
2. Prefer competence, autonomy, creativity and emotional safety over compulsion.
3. Make the *next useful action* more prominent than a menu of modes.
4. Distinguish guided practice, transfer assessment and pure entertainment.
5. Respect realistic ages and touch targets; keep staff notation legible.
6. Keep microphone input optional, private, and honestly uncertain when sound detection is unreliable.
7. Never punish children for missing a day; no timers to claim expiring gifts, paid loot boxes, pay-to-practice, or shame-based streaks.
8. Allow teachers/parents to choose structure without turning the experience into homework.

## 2. Verified current-state audit

Source inspection of main, not a child usability study:
- index.html has **6** screen sections: register, landing, store, songs, game, result. There is no separate world map, companion room or parent learning dashboard.
- js/config.js has **15** song entries and **11** instrument entries; current store is a clef-filtered grid using separate **treble** and **bass** coin balances.
- js/storage.js gives **8 daily credits** (replenished at login); paid-in-credits game rounds are blocked when credits run out. v3.2 Practice and Skill Check are already free.
- js/learning.js tracks per-clef individual pitches and duration buckets, generates adaptive drills and mastery-blind Skill Checks, and stores short histories locally. It does not yet model interval reading, phrase structure or long-term memory retention.
- js/game.js conflates rendering, animation, pitch/rhythm assessment, rewards and persistence. A clean exercise/session API is a major engineering priority before significantly expanding gameplay.
- The on-screen piano shows pitch names. Helpful in early instruction, but should be optionally hidden during independent staff-reading tests.
- v3 microphone is monophonic, with uncertain performance under sustain/noise. A failed or low-confidence detection must not silently count as a child's music error.

Consequence: v4 needs a coherent **educational core + play shell**, not simply an illustrated reskin.

## 3. Three nested loops

### Loop A: 5-minute guided session (default, pausable)

1. **Welcome (10–15 sec):** Companion greets without guilt; goal card suggests one concrete skill (e.g. "Read F and A without hints").
2. **Warm-up (35–50 sec):** 4–6 accessible notes, high success probability, hints permitted.
3. **Focus mission (75–120 sec):** 8–12 tailored notes/short patterns addressing one weakness, with spaced interleaving.
4. **Musical application (60–100 sec):** A novel 2–4 bar phrase or a short familiar song section, scaled to the child's level.
5. **Celebrate + reflect (20–35 sec):** Show what improved, one next action, and cosmetic Sparks earned. Offer "Done for today".
6. **Optional encore:** Song, store, free play or Skill Check; never force another session.

A guided session should be usable in one sitting with **Pause, Restart and Leave** always accessible. Make duration configurable by parent/teacher (3 / 5 / 8 minutes), not a strict deadline for a child.

### Loop B: weekly learning journey

- Revisit low-confidence skills over spaced intervals.
- Suggest independent Skill Checks after approximately 3–5 guided sessions (tunable, never spammed).
- Celebrate *new reliable competence* (e.g. 3 days showing stable F4 recognition), not a single fast run.
- Surface short personalized recommendations rather than generic "Try harder".
- Review retention at later checkpoints (e.g. roughly 1, 3 and 7 days, adaptable to attendance).

### Loop C: world / collection journey

- Skill discoveries restore elements of a small musical world (new plants, bridges, lights or stage props).
- Each world contains a visible learn-and-apply arc; song performances are meaningful milestones.
- Coins/Sparks buy appearance and personalization only. **No paid or shop-based learning advantage**.
- Once a world is complete, unlock expressive extras while expanding genuine skill demands.

## 4. World, characters and visual identity

**Recommended identity:** Melody Garden; an expressive, original companion called **Pip** (a round firefly with a softly glowing music-note motif). Names and artwork are provisional; commission original assets and check brand/IP conflicts.

Character rules:
- One hero companion in v4.0/v4.1, not a dozen low-quality characters.
- Emotional states: welcoming, curious, focused, delighted, gently encouraging.
- Animations: tiny idle loop, celebratory bounce, listening posture, gentle retry nod. No tantrums, guilt or "sad because you missed".
- Optionally silent/subtle; respect reduced motion and mute settings.
- Companions **never mark correctness**; the music evaluator owns truth. Companion dialogue translates truthful data into supportive language.

Four initial themed zones (world map can be staged):
1. **Note Nest:** locate notes on five-line staff, C–G pitch vocabulary, simple line/space tasks.
2. **Melody Meadow:** extend the octave and recognize ascending/descending contours, steps, skips and short phrases.
3. **Rhythm River:** quarter/half/eighth notes, steady pulse and repeated-note rhythm.
4. **Starry Stage:** apply skills to unfamiliar 2–4 bar phrases; songs become full performances.

Future zones: Bass Bay, Accidentals Arcade, and phrase/ledger-line challenges; unlock in response to documented ability, not grind alone.

**Art direction:** soft, high-quality vector/paper-cut illustrations, rounded geometry, readable music staff, warm cream base with mint/coral/lavender/gold accents. Use a coherent reusable icon and color system; favor 2D animation and crisp SVG over expensive 3D. Original assets, no appropriated game-character likenesses.

### Sound and interaction

- Warm short feedback motifs and haptics where available, with **no forced loud audio**.
- When microphone is active, avoid sending feedback instrument notes into the room/mic; prefer silent visual confirmation or controlled playback between listening windows.
- Pair color with shape, label and motion so correctness never relies on red/green alone.
- Aim for large hit areas (44×44 CSS px where possible; WCAG 2.2 minimum rules still apply), clear focus indicators, adjustable animation and volume, and readable landscape layouts.

## 5. Screen-by-screen redesign

| Screen | New core experience | Important behaviors |
|---|---|---|
| **Welcome / Profile** | Friendly profile cards + companion preview + continue | Preserve saved avatars, profiles and instrument ownership. Parent creates account locally; no child email required. |
| **Home / Today** | Big **Continue Adventure** action, companion scene, current short goal, earned Sparks and streak-free progress | One primary CTA; modes beneath, not six equal cards. Show “Done for today” after guided practice. |
| **Adventure Map** | Simple 4-zone path, skill badges, song stages, visible next unlock | Use a limited side-scroll map or compact cards for tiny screens; no hidden maze. |
| **Game / Practice** | Staff as the hero; clear current note/beat, optional on-screen piano or real-piano mic, calm feedback and pause | Standard/scaffold/assessment viewing modes; optional key labels and hints only where pedagogically appropriate. |
| **Result / Celebration** | Pip's reaction + earned Sparks + *Pitch*, *Rhythm* and *First-try* metrics plus one grounded suggestion | Show what improved; explain uncertainty if mic quality was poor; never claim mastery from one round. |
| **Songbook / Stage** | Themed performances, preview/listen, difficulty and skill readiness, up to 3 collectible stars for observable criteria | Differentiate familiar rehearsal vs first-sight performance; no unfair mandatory lock due to cosmetics. |
| **Store / Workshop** | Character items, scene decor, instrument skins, stage effects, try-on preview and equipped state | Visible before/after, clear pricing, kid-safe confirmation, no random rewards. |
| **Companion Room** | Personalize Pip and studio; show earned decorations and trophies | Rewards visibly persist across screens, not just owned in an array. |
| **My Learning** | Child-friendly skill garden / mastery map and Skill Check trend | Clearly distinguish practicing from checking; show “Learning”, “Growing”, “Strong”, “Review”. |
| **Parent / Teacher** | Read-only progress summary, skill strands, elapsed practice, Music Pass daily limits and +5/+10 minute caregiver overrides, confidence explanations | Parent gate and separate adult wording; no rankings of children; export locally only if later supported and reviewed. |

### Home content hierarchy (mobile)

1. Friendly avatar / greeting (not a large pay-or-streak banner)
2. Scene with Pip + specific goal (“Find the F notes”)
3. Dominant **Continue Adventure** (3–8-minute session)
4. Progress toward a meaningful skill/world unlock
5. Secondary shortcuts: Songs, Free Practice, Skill Check, My Studio
6. Tiny parent/settings entry

### Results content hierarchy

1. **What happened:** "You read 10 of 12 notes on your first try".
2. **Learning signal:** note, rhythm or phrase improvement versus comparable baseline.
3. **Positive consequence:** a plant blossoms / decoration unlocked / Pip celebrates.
4. **Choice:** "Practice another minute", "Try a song", or **Finish**.
5. Clear distinction between score and reward; no confetti for incorrect outcomes.

## 6. Curriculum redesign: teach sight-reading, not just note naming

Define **skill strands**, not one global score:

| Strand | Skills to model | Example activity |
|---|---|---|
| Staff-to-pitch | treble/bass note ID, ledger lines, accidentals | "Find the glowing note" |
| Pitch-to-key | mapping staff location to keyboard, hand region and register | "Play the note on your real piano" |
| Visual pattern reading | repeated notes, ascending/descending steps, skips, intervals and contour | "Echo the little hill" |
| Rhythm reading | pulse, duration identity, eighth/quarter/half/dotted patterns, rests | "Tap/play the two-beat pattern" |
| Fluency | first-try accuracy, response latency, consecutive reading, reduced hint reliance | short timed fluency bursts at safe pace |
| Musical transfer | fresh phrases, full short melodies, clef/tempo/instrument changes | unseen two-bar melody |
| Retention | recall after elapsed time and changes of context | spaced review of previously strong notes |

**Critical gap to avoid:** a text-labelled touchscreen key can become an answer shortcut. Use a **scaffold ladder**: show labels in Learn → partially fade labels in Practice → hide labels in independent sight-reading Skill Checks, with an accessible override if required.

**Task selection rule (proposed starting heuristic, not a proven optimum):**
- 50% weak/expiring skills supported by evidence
- 25% interleaved established skills
- 15% recently introduced material
- 10% musically meaningful novel application

Do not hard-code this allocation permanently; validate with children and compare held-out scores. Avoid generating unmusical streams of random notes when a coherent phrase is available.

**Mastery model proposal:** per-clef skill identity, attempts, first-try successes, hint use, response latency, recent trend, time since last successful attempt, device/input confidence and current complexity. Track confidence and avoid premature mastery. Distinguish inability to read from microphone uncertainty. Start with clear rule-based mastery and instrument it; do not introduce opaque RL or prediction models in v4 simply because they are available.

**Prerequisite graph:** introduce a skill when prerequisites are stable, offer a short demonstration if a child repeatedly misses, and revisit at spaced intervals. Example: read a few C–G notes → recognize ascending steps → read three-note contours → apply to a short new phrase.

**Independent assessment:** preserve v3.2's mastery-blind note checks, then add *phrase-level* transfer checks with separately generated, musically valid sequences and reference difficulty sets. Keep results distinct by clef, skill tier, touch vs mic and familiar vs unseen material. Do not require a perfect game to pass; thresholds are pilot parameters.

**Microphone caveat:** single-note estimates, repeated attacks and audio latencies are imperfect; persist low-confidence/unscorable events separately and permit correction/retry or touch input. Do not infer “bad rhythm” solely from weak or unstable mic signal.

## 7. Companion progression and child motivation

**Pip's development** follows visible activity milestones, never hunger or threatened loss:
- First practice: learns a musical gesture
- First verified note family: grows a small glow trail
- First completed song: hosts a tiny recital
- Stable return to a previously weak skill: upgrades the garden
- Skill Check improvement: receives a celebratory moment, not exclusive academic access

**Quest architecture**
- **Learning quest:** a clear teachable behavior (“Play 6 F notes on the first try”).
- **Application quest:** use that behavior in a phrase (“Read a 3-note hill”).
- **Creative choice:** decorate Pip's room or choose a song; child agency matters.
- Provide at most **one recommended daily quest and two optional choices** initially.
- No loss of streaks or rewards for missed days; use a gentle mosaic of practice days instead.
- Never tie caregiver approval or the companion’s mood to the child’s score.

Motivation should be primarily competence (“I can do it”), autonomy (“I chose the song”) and attachment (“This is my garden”). The store supports that emotional loop; it should not dictate practice length.

## 8. Store and economy redesign

### One clear, child-friendly currency

**Sparks** are earned through meaningful play and spent only on cosmetics. Proposed migration:
- Preserve every owned instrument.
- Convert existing treble coins and bass coins **1:1 into Sparks**, using a one-time versioned migration so the total is not double-counted.
- Keep old balances in a backup field or reversible migration snapshot until verified.
- Replace per-round credit charges with **caregiver-configured Music Pass limits**, covering every child-facing mode. Offer Unlimited as a caregiver choice. Preserve old credits in a versioned migration backup instead of silently converting them into time or Sparks.

### Starter catalog (illustrative, not final balance)

| Category | Example | Spark cost | Visible payoff |
|---|---|---:|---|
| Pip accessories | cloud hat, tiny bow, music scarf | 25–55 | persistent companion look |
| Garden decor | lantern, bench, flower patch | 40–85 | room/garden changes |
| Instrument cosmetics | pink piano, starry keys | 80–145 | visual style only |
| Performance effects | confetti theme, soft light particles | 90–160 | short celebration, can disable |
| Stage scenes | underwater recital, starlight concert | 180–280 | song-stage personalization |
| Earned trophies | note-family achievement badge | **not purchasable** | proves a real learning milestone |

Suggested economy pilot: ~20–40 Sparks per completed guided session, ~10–20 for a song, and small rewards for optional quests; cap *bonus payout*, not practice eligibility. Ensure an early desirable item is obtainable after roughly **1–2 short sessions**, then space bigger goals across weeks. Test actual price/earn curves before launch.

**Store interaction:** preview → try-on / place decor → clear price and balance → purchase confirmation → joyful reveal → equip/place immediately → see it on Home or Song Stage. Show owned/equipped states, sortable categories, accessible text labels, a “save for later” goal. Avoid mystery boxes, real-money purchases, leaderboard advantage and pay-to-unlock education.

### 8A. Parent-controlled playtime: Music Passes

The current v3 tickets do **not** limit total playtime consistently: Coin Run and Song Mode use credits, while Adaptive Practice and Skill Checks bypass them. v4 introduces a separate caregiver control that covers **all child-facing play**.

- **One Music Pass = five minutes of active foreground play**, metered by the second rather than charged at the start of an exercise. It matches the five-minute adventure without penalizing children who exit early.
- **Suggested daily allowance: 3 passes / 15 minutes**, editable by parents. Include 0 (Pause), 5, 10, 15, 20, 30 minutes, customizable increments, and Unlimited; allow parent-authorized +5/+10-minute overrides.
- Count child-facing Home, Adventure, Practice, Songs, Skill Checks, Store, and companion activities. Exclude browser background, explicit Pause, microphone calibration and adult settings. **No mode may bypass the limit.**
- Give gentle warnings, then finish the current small phrase (maximum **45-second grace**). Save partial work and stop the microphone; an interrupted Skill Check is **incomplete, not failed**.
- Keep **Music Passes separate from Sparks**: store spending or learning achievements cannot buy extra time.
- Replace legacy eight-credit tickets via a parent-reviewed, versioned migration. The existing local PIN is a convenience gate and **not tamper-proof**.

See the [Parent Playtime Controls Specification](./v4-parent-playtime-controls.md) for timing, persistence, UI states and acceptance tests.

## 9. Parent/teacher trust and responsible design

Provide an adult-facing summary of:
- reading level and skills practiced, by clef
- first-try scores on unseen material, contrasted with training
- typical practice duration (local estimate), number of sessions, and return to weak skills
- rhythm vs pitch issues; confidence when microphone detection may be unreliable
- what is *ready to introduce next* and why
- optional practice goals and session length (not parental pressure alerts)
- local privacy and ability to delete progress

Default local-only profiles and analytics. No ads, social sharing, chat, public leaderboards, child-account email, cloud recording or automatic uploads. If a future service stores names/voice/audio or persistent identifiers, perform a separate child-privacy legal review before collecting anything.

Guardrails: gentle/non-punitive language, reasonable pauses, turn off motion/audio, no earned-but-expiring gifts, and optional use without a real piano.

## 10. Architecture and implementation boundaries

Do not rewrite the app wholesale or couple cartoon animation directly into the scoring engine. Extend the current modular JavaScript with a small typed data contract (TS definitions or JSDoc), pure engine functions and screen components.

Proposed responsibilities:
- **Content**: Skill catalog, note/phrase templates, stage/world content, store catalog, dialogue strings.
- **Curriculum**: Skill prerequisites, task selector, spaced scheduler, adaptive weighting, check generator.
- **Evaluation**: Pitch/onset scoring, mic confidence and unscorable classification, lesson outcome events.
- **Session**: Guided multi-step lesson state machine, pause/resume, completion and reward calculation.
- **Progression**: World milestones, cosmetic currency, inventory and companion state.
- **UI**: Home, game, results, map, workshop, parent view, responsive design tokens.
- **Persistence**: Versioned, idempotent migration from v3.2; per-player local record with bounded history.

Proposed interfaces (schematic, not committed code):
~~~ts
type InputSource = "touch" | "microphone";
type ActivityKind = "warmup" | "focus" | "phrase" | "song" | "skill-check";

interface SkillId {
  clef: "treble" | "bass";
  concept: string;             // e.g. "note:F4", "interval:step"
}

interface ExerciseSpec {
  id: string;
  activity: ActivityKind;
  skillIds: string[];
  notes: { pitch: string; beat: number; duration: number }[];
  bpm: number | null;
  hintsAllowed: boolean;
  assessmentSeed?: string;
}

interface NoteAttempt {
  exerciseId: string;
  noteIndex: number;
  inputSource: InputSource;
  presentedAtMs: number;
  playedAtMs: number | null;
  correctPitch: boolean | null; // null = unscorable/unknown
  onsetErrorMs: number | null;
  hintsUsed: string[];
  inputConfidence: number | null;
}

interface SessionOutcome {
  sessionId: string;
  activity: ActivityKind;
  attempts: NoteAttempt[];
  firstTryRate: number | null;
  skillUpdates: string[];       // empty for Skill Check
  sparksAwarded: number;
}
~~~

Required architectural invariants:
1. **Evaluation cannot see store/cosmetics.**
2. **Skill Checks cannot mutate mastery used by adaptive practice.**
3. **Mission rewards come from completed, validated activity events** (idempotent).
4. **UI can safely replay events/refresh without double-granting Sparks.**
5. **Microphone stream ends on exit, tab background, input switch or component destruction.**
6. Existing v3.2 profiles migrate without losing coins, songs, instruments, scores or learning history.
7. All modes remain playable with touch input; microphone is optional.

## 11. Release roadmap and scope gates

### v4.0 — Delight, Clarity & Parent Playtime (foundation)
Deliver: design tokens, iconography, home hierarchy, contextual recommendation, better results, lighter consistent animations, responsive staff/game view, improved learning copy, key-label scaffold modes, and **Music Pass limits enforced across all child-facing modes**. **No new cosmetic currencies yet.**
Exit gate: 360–390px phone, phone landscape and tablet layouts tested; no regression in skill checks or mic lifecycle; Music Pass timers, daily resets, parent overrides, background pause and graceful end-of-phrase stops pass tests; usability sessions demonstrate children can start and stop practice.

### v4.1 — Pip & Personalization
Deliver: Pip companion (original artwork, 4 emotional states), v4 session journey, deterministic micro-quests, cosmetic Sparks ledger, upgraded store with ~12–18 high-quality items, preview/equip/place, versioned migration.
Exit gate: all rewards idempotent; purchase changes are visible; no learning privileges bought; child can voluntarily stop after one session.

### v4.2 — Better Learning Journey
Deliver: skill prerequisite graph, scaffold/hint policy, multi-note phrase tasks, spaced recall schedule, per-skill progress explanations, expanded parent/teacher view, independent phrase checks.
Exit gate: curriculum produces valid playable phrases; blinded/independent phrase checks distinguish learning from familiarity; low-confidence mic data never falsely penalizes mastery.

### v4.3 — Adventure & Performances
Deliver: 4 starter zones and 2–3 short themed stage experiences, earned skill-world milestones, song preview and readiness, star ratings, subtle narrative.
Exit gate: world completion requires verifiable skill/application, not merely play time or currency; no content dead ends; existing 15 songs remain accessible via fair migrations.

### v4.4 — Evidence & Polish
Deliver: educational validation pilot, accessibility audit, performance optimization, animation/asset polish, device microphone QA, balance tuning.
Exit gate: pre-registered learning and usability criteria met; ship only changes with positive learning/wellbeing outcomes.

## 12. Experiments, metrics and criteria

Establish baseline before measuring uplift. Suggested goals are **hypotheses/decision thresholds**, not observed results.

**Learning (primary)**
- Change in first-try accuracy and median response latency on unseen notes/phrases, adjusted for difficulty and clef.
- Retention of previously practiced pitches at a later interval.
- Transfer from isolated note recognition to short phrase reading.
- Separately track mic confidence and unscorable rate.

**Experience (co-primary)**
- Can a child find the recommended next task without adult help?
- Child-reported enjoyment and perceived competence after a short session.
- Completion of a voluntary 3–8-minute guided session; proportion opting to stop happily vs frustrated.
- Parent/teacher trust and interpretability of progress.

**Safety and guardrails**
- No increase in forced practice, anxiety, guilt or reward farming.
- No loss of progress on migration, including the transition from round tickets to parental time budgets.
- No increased microphone permission failures or false correctness penalties.
- Avoid optimizing solely for time spent in-app; children should be able to finish.

**Pilot**: test with caregivers/teachers and appropriately consented children across levels; counterbalance activity order, use a pre/post unseen phrase bank, include delayed retention check, and compare to current v3.2 experience. Gather qualitative notes about game appeal and skill readability.

## 13. Acceptance tests and definition of done

Every phase needs:
- Pure engine tests for note/phrase validity, prerequisites, scheduling, currency accounting and migration.
- Browser E2E tests for profile → guided session → results → home → store, plus touch and mic fallback.
- Screen checks at at least 360×640, 390×844, 844×390 and 768×1024; portrait and landscape readability.
- Accessibility: keyboard navigation, readable contrasts, focus, no color-only feedback, reduced-motion, meaningful screen-reader labels, touch size.
- Regression checks preserving the full 15-song database, clef behavior, pitch/rhythm scoring and independent v3.2 Skill Checks.
- Explicit assets/license review, budget/performance checks on low-end devices, and Playwright green CI before merge.
- Parent usability and child observation; automated checks alone are **not** sufficient to claim educational effectiveness.

## 14. Immediate decisions and first build slice

**Decisions proposed for sign-off:** Melody Garden/Pip as the working creative direction; ages 6–10 first; no real-money purchases; Sparks purely cosmetic; local-first privacy; guided session 5 minutes default; **Music Pass parental control (5-minute units, suggested 15-minute allowance, parent-selectable Unlimited, graceful stop)**; one featured mission at a time; no punitive streaks; no MIDI.

**First build slice, recommended:** a vertical prototype covering Home → 5-minute guided lesson → Result → Studio Store with **one** polished Pip character and **one** theme. Use existing v3.2 adaptive curriculum for the first prototype, and instrument comparison against unbiased checks before deepening adaptivity. This yields a coherent end-to-end experience without overbuilding the world map.

## References and limitations

- SightReadingApp v3.2 source in this repository, inspected 2026-11-06.
- Educational rationale (retrieval/spacing): Carpenter, Pan and Butler, *Nature Reviews Psychology* (2022), https://www.nature.com/articles/s44159-022-00089-1
- Sight-reading intervention findings: Mishra, *Psychology of Music* (2016), https://journals.sagepub.com/doi/10.1177/0305735615610925
- Child wellbeing-by-design: UNICEF RITEC toolbox, https://www.unicef.org/childrightsandbusiness/workstreams/responsible-technology/online-gaming/ritec-design-toolbox
- Accessibility: W3C WCAG 2.2, https://www.w3.org/TR/WCAG22/
- Privacy framework reference, if applicable by market: FTC COPPA FAQ, https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions

This spec is a design proposal grounded in repository inspection and broader learning/game-design evidence. **It is not a validated claim that these features will improve retention or piano sight-reading outcomes.** Those claims need real child playtests and comparative learning assessments.
