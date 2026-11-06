# SightReadingApp v4 — Execution Backlog, Contracts and Release Gates
Status: **Documentation-only execution plan** accompanying [the master spec](./v4-master-redesign.md).
Reference branch: main v3.2.0. This file does not authorize gameplay changes or alter production. See the detailed [Parent Playtime Controls](./v4-parent-playtime-controls.md) for the Music Pass contract.

## A. Contribution workstreams

| Workstream | Code responsibility | Artifact to own | Cross-team interface |
|---|---|---|---|
| Learning | Curriculum, tasks, skills, teaching feedback | pure js/curriculum/ modules | ExerciseSpec + SkillUpdate |
| Game engine | Session orchestration, timing, evaluation | js/session/ and retained js/game.js adapters | SessionEvent, NoteAttempt, SessionOutcome |
| Creative / UI | Mascot, maps, store, audio/visual feedback | assets/ + js/ui/ + design tokens | UI consumes read-only PlayerViewModel |
| Economy | Sparks and cosmetics inventory | js/economy/ + catalog | RewardGrant/PurchaseReceipt; never writes mastery |
| Profiles / Parent | Local migration, playtime policies, parent overrides, learning summaries | js/storage.js and js/profiles/ | PlayBudgetController, persisted schema v4, opt-in data |
| QA / Research | Automated tests, instrument lab, pilot protocols | tests/, e2e/, docs/research/ | release gates and score interpretation |

No domain module should directly query DOM nodes, create audio contexts, or call localStorage except through adapters. Keep current vanilla-JS implementation; a framework rewrite is explicitly out of scope unless demonstrated necessary.

## B. Prioritized dependency graph

**P0 — must ship before persistent economy/world changes**
- V4-01 Design tokens and accessible layout → V4-02 Home & results redesign → **V4-15 Music Pass parental time budgets** → V4-03 Guided session state machine.
- V4-04 Unified, idempotent domain events → V4-05 Migration + economy ledger.
- V4-06 First-try + source-confidence audit → V4-07 Curriculum/transfer check prototype.

**P1 — memorable release**
- V4-08 Companion art and reactions depends on V4-02/V4-04.
- V4-09 Quest system depends on V4-03/V4-04/V4-07.
- V4-10 Studio + cosmetic store depends on V4-05/V4-08.
- V4-11 Learning dashboard and parent view depends on V4-07.

**P2 — deeper world and validation**
- V4-12 World map / zones depends on V4-09/V4-11.
- V4-13 Song performances / stars depends on V4-12/V4-07.
- V4-14 Pilot / accessibility / low-end performance depends on working vertical slice.

## C. Implementable tickets

| Ticket | Deliverable | Test / completion criterion |
|---|---|---|
| V4-01 | CSS variables, typography, screen/layout rules, focus states and reusable buttons | 360×640, 390×844, 844×390, 768×1024; staff readable; no overlapping score controls |
| V4-02 | Home, result and onboarding refresh | child sees one primary CTA; results show first-try/pitch/rhythm without misleading mic certainty |
| V4-03 | Pausable 3/5/8 minute guided journey built from warmup/focus/phrase/reflection | lesson respects Music Pass budget; can pause/quit/restart without double rewards or stale microphone |
| V4-04 | Versioned SessionEvent and RewardGrant, unique IDs and reducer/persistence layer | replaying completion event grants Sparks exactly once |
| V4-05 | v3.2 → v4 idempotent migration: tCoins+bCoins→Sparks; preserve owned instruments, songs, scores and learning | run migration twice; no duplicate conversion; rollback snapshot and corrupt-storage fallback |
| V4-06 | Separate visual note-reading vs labelled piano tasks, low-confidence mic classification | test hides key labels on independent reading checks; unscorable audio not a failure |
| V4-07 | Prerequisite graph, structured phrase templates, spaced review schedule and blind checks | sequence stays playable/music-valid, check does not learn from its own results |
| V4-08 | Pip: SVG character/4 expressions/low-motion mode and companion room state | no audio in mic listening mode; animation not score-dependent punishment |
| V4-09 | One daily recommended quest + two optional alternatives | only valid music/learning events complete a quest; never forced to return tomorrow |
| V4-10 | Workshop preview/equip/purchase; 12–18 catalog cosmetics, no loot boxes | purchase transaction safe, correct balance/ownership, visible purchased asset |
| V4-11 | Child mastery map and parent-readable progress | display by clef and difficulty; parent report never calls local check a clinical-grade measure |
| V4-12 | Four-zone starter map with unlock gates and teachable objectives | milestones from verified skills, not grinding/time/currency |
| V4-13 | Familiar rehearsal vs unseen performance, stars and stage themes | existing 15 songs play; valid difficulty / unlock migration; no paywall |
| V4-14 | Research pilot, WCAG audit, asset licensing, QA on real pianos | pre/post unseen phrase result, delayed retention, parental stop UX and safety metrics documented |
| **V4-15 (P0)** | **Parent Music Pass controller:** daily 5-minute units, settings/override UI, active-time accounting across all child modes, parent gate, pause/lock/grace | 15-minute suggested default editable; all modes count; background/parent/calibration excluded; stop at phrase or ≤45s; unfinished check unscored; refresh/midnight/overrides idempotent |

## D. Key event contracts and reducer plan

A versioned event stream is preferred to scattering coin changes across DOM handlers.

~~~ts
type SessionEvent =
 | { version: 1; id: string; type: "exercise_started"; sessionId: string; exerciseId: string }
 | { version: 1; id: string; type: "note_attempted"; sessionId: string; noteIndex: number; source: "touch"|"microphone"; confidence: number|null }
 | { version: 1; id: string; type: "exercise_completed"; sessionId: string; summary: SessionOutcome }
 | { version: 1; id: string; type: "quest_completed"; playerId: string; questId: string; sessionId: string }
 | { version: 1; id: string; type: "reward_granted"; playerId: string; grantId: string; amount: number; reason: string }
 | { version: 1; id: string; type: "cosmetic_purchased"; playerId: string; receiptId: string; itemId: string; price: number }
 | { version: 1; id: string; type: "play_budget_adjusted"; playerId: string; grantId: string; additionalSeconds: number; authorizedByParent: true };

interface PlayerV4 {
  schemaVersion: 4;
  profileId: string;
  avatar: string;
  currentClef: "treble" | "bass";
  learning: object;             // preserve v3.2 schema in an adapter
  sparks: number;
  playBudget: { version: 1; dailySeconds: number | null; localDayKey: string; consumedSeconds: number; bonusSecondsToday: number };
  cosmetics: { owned: string[]; equipped: Record<string,string> };
  completedGrantIds: string[];
  storeReceiptIds: string[];
  quests: { completed: string[] };
  // existing score/song/instrument data remains available for migration
}
~~~

**Single source of truth:** the domain reducer validates IDs and events, updates state exactly once and persists an atomic snapshot. The UI only renders derived views. IndexedDB may be introduced later if localStorage snapshots become unwieldy; migration needs automated rollback tests either way.

## E. Data migration contract (mandatory)

Run at login or initial load **before** showing the store, and never mutate saved production data in-place without a backup.

1. Read and validate the v3.2 player record; preserve missing/default fields and gracefully handle malformed JSON.
2. Compute one-time converted Sparks = nonnegative treble balance + nonnegative bass balance.
3. Store conversion id and backup balances in a versioned migration section.
4. Map owned instruments to legacy cosmetics/audio choices; keep their operation intact.
5. Preserve song unlock index, high scores, difficulty and learning notes/checks.
6. Create default Pip and starter room items *without* taking away prior purchases.
7. Save new schema; reloading and rerunning conversion must not grant Sparks again.
8. Implement a local backup/export path for affected users before launch.
9. Migrate old eight-credit round tickets to an explicitly parent-reviewed **Music Pass time policy** (suggested 15 minutes/day, parent-editable, optional Unlimited). Do not convert eight old tickets into forty minutes. Track usage across every child mode, without mixing Sparks and playtime.

Do not use old per-round credits as a payment mechanism. **Music Passes are a parent-configured time permission**, not a reward or currency; the policy intentionally gates all child play modes, including formerly free Practice and Skill Check. Do not reward or sell additional minutes to children. Parent may set Unlimited or explicitly grant extra minutes.

## F. Content authoring workflow

Use validated content files with stable IDs:
- skill catalog: prerequisites, teaching prompt, example mistake and successful evidence;
- exercise templates: note/time signature/rhythm pattern/clef/range/metre and scoring policy;
- world catalog: zone, skillIds, show-condition, unlock-condition and optional song content;
- store catalog: type, itemId, previewAsset, equippedSlot, price and original-art license record;
- dialogue catalog: supportive language variants with age-appropriate length.

Reject invalid templates at build/test time. In particular, verify:
- pitches are within the selected virtual keyboard or physical piano assignment;
- note value and meter sum accurately, with rests and correct accidentals;
- source songs have correct notation and documented licensing;
- assessment tasks have no accidental clues from labels/hints;
- art assets include alternate text and reduced-motion fallback.

## G. Research and learning validation

**Baseline:** independently sample v3.2 first-try accuracy and response latency on **unseen** items. Compare to v4 on matched levels, with careful balance for age, prior piano experience and device.

**Primary outcome:** transfer to unseen, musically coherent phrases at comparable difficulty. Secondary: delayed retention, phrase fluency, parent comprehension and child enjoyment.

**Avoid false positives:** practice-score increases alone do not establish sight-reading improvement. Familiar songs are useful for motivation, but should not count as first-sight transfer tests. Phone touch accuracy and acoustic mic reliability are not necessarily directly comparable.

**Manual research tasks:**
- Observe 5–10 pilot users completing Home→Lesson→Results→Store; log confusion, frustration, delight.
- Observe a beginner teacher supervising a Skill Check and interpreting its score.
- Verify actual iPhone Safari and Android Chrome real-piano notes at C3, C4, E5, same-key reattacks and low-volume dynamics.
- Follow a small consenting pilot cohort across multiple sessions; collect feedback from child and caregiver without undue incentives or pressure.
- Review accessibility and privacy before considering any remote accounts or telemetry.

Sample decision thresholds (not claims): ≥80% of pilot children independently start a recommended practice; no loss in unseen-note accuracy; no increase in blocked or false-failed mic trials; parents can explain next recommended skill after viewing the summary. Calibrate thresholds with a trained teacher before treating them as release gates.

## H. PR execution order and merge gates

1. **PR A — v4.0 UI foundation:** tokens + home/result + accessibility snapshots; no profile schema changes.
2. **PR B — Music Pass parent limits (P0):** versioned daily time policy, per-player controller, parent UI, in-progress phrase grace and mode-wide E2E enforcement.
3. **PR C — guided session engine:** pure session state machine + presenter; integrated with ParentBudget time events.
4. **PR D — learning validity:** scaffold policy, skill registry, phrase templates and unbiased transfer checks.
5. **PR E — Pip artwork:** one polished character, four expressions, reduced-motion mode, no gameplay-state mutation.
6. **PR F — store + migration:** cosmetic Sparks, idempotent grants, owned/equipped catalog and previews, independent of Music Passes.
7. **PR G — missions + garden:** recommended quest, world milestone reducer, companion reactions.
8. **PR H — child/parent learning journey:** mastery pathways, readable progress summaries and adult limit history.
9. **PR I — song staging + validation:** performance polish, accessibility/device QA and educational pilot readout.

**Merge discipline:** each PR uses a dedicated branch, passing node unit tests, mobile/tablet Chromium tests and any new design-system screenshot assertions. Music Pass integration tests must cover every child mode, resets, pause/background, parent override and interrupted Skill Checks. Keep production app usable after *every* merge. Use feature flags for partial v4 flows. Do not delete legacy game/learning fields before migrations and exports are verified.

## I. Explicit exclusions for first v4 release

- MIDI; multiplayer/chat/public leaderboards; monetization/real-money payments; rewards that buy skill advantages; randomized loot boxes; cloud voice recordings; AI voice conversations with children.
- An untested full framework rewrite, 3D character pipeline, or large procedurally generated narrative.
- Diagnostic/educational efficacy claims based only on in-app training accuracy.
- Chord detection or fully polyphonic scoring before acoustic microphone accuracy is independently established.

## J. Definition of ready for implementation

The design/spec review approves:
- initial child age range and selected name/companion direction,
- one default guided session, including pause/finish,
- a capped starter cosmetic catalog and starting price/reward curve,
- exact accessible art tokens and primary navigation labels,
- first benchmark phrase-bank coverage and mic uncertainty policy,
- migration mapping and data ownership,
- caregiver allowance presets, suggested 15-minute default, option for Unlimited, and the proposed 45-second phrase grace.

Only then should implementation PR A start. Design reviews should test a **single vertical slice** rather than committing immediately to every content world and store asset.
