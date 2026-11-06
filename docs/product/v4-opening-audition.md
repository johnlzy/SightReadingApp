# v4 Opening Audition — Friendly, Adaptive Placement

Status: **Proposed product design; not implemented.** This is a placement experience for the [Reading Independence Ladder](./v4-reading-independence-ladder.md), not an ABRSM exam, IQ test, or permanent level assignment.

## 1. Purpose and experience

**The child-facing invitation:** "Welcome to your first concert with Pip! Show us what music you can already read. We'll find the best adventures for you. Ready for a challenge?" Avoid "exam", "pass/fail" or a scary countdown.

A well-placed learner should feel **competent but challenged**, not forced to slog through easy note drills. The audition must help both a beginning seven-year-old and a more experienced ten-year-old find suitable content **without pegging a level to age or an examination grade**.

Offer a 3–7-minute placement, with a shorter 2–3-minute version if attention or available Music Passes are limited. The child can pause, stop, ask for help, or skip the audition. Results are **provisional** and easy to correct later. No pressure to obtain an elite rank.

## 2. Audition flow

| Stage | Child experience | Learning evidence |
|---|---|---|
| Welcome | Pip invites a "first concert" and explains that showing abilities unlocks a suitable adventure | voluntary participation, input choice |
| Instrument setup | Choose touch piano or real piano; check microphone signal; if mic is weak, use touch or skip automated scoring | input confidence, not reading score |
| Musical warm-up | One or two easy staff/phrase demonstrations, familiar format; no rank impact | task comprehension |
| Adaptive first sight | A few **unseen** note, rhythm or phrase items, chosen based on recent evidence; increase challenge when successful | pitch fluency, rhythm, reading-ahead, independence |
| Stretch opportunity | "Want to show me an even trickier piece?" with **optional** harder phrase, regardless of previous results | high-end ability, avoids ceiling/sandbagging |
| Confirmation | One alternate item at the inferred tier; use a new excerpt rather than repeating the same notes | repeatability and confidence |
| Reveal | "Your adventure starts here!" Show which skills look strong and one next practice mission | provisional skill profile, not fixed talent label |

Use approximately 4–8 short playable segments, not dozens of isolated note taps. Prefer **whole fixed phrases** whenever the child can manage them. If uncertainty remains high, shorten the audition and offer another check on a later day.

## 3. Motivating the child to genuinely try

**Motivation without punishment or psychological pressure:**
- Explain that playing their *best* helps Pip find **more interesting and appropriate music sooner**. Avoid suggesting easier levels are bad or embarrassing.
- Make every placement tier visually appealing; harder placement earns **appropriate content**, not extra Sparks, prestige or sibling superiority.
- Give *effort/participation* celebration independent of skill, and reward verified musical learning separately. Do not offer a farmable prize for an artificially low placement.
- Offer an **Explore a harder challenge** button at any point, including after a modest result. The student can demonstrate higher ability immediately instead of being stuck.
- Allow "I play piano already" as an optional parent/student hint to begin near phrase-reading tasks, then verify with music. Hints are not scores.
- Reveal "skills you're ready for" rather than "you scored Level 2" as the dominant child-facing message. Keep internal tier/uncertainty visible in the parent dashboard.
- Do not compare siblings, display leaderboards, take away rewards for low performance or make Pip sad.
- Avoid time-pressure scoring in first placement; a hesitant but correct unfamiliar phrase may indicate a skill to develop rather than a lack of musical understanding.

**Sandbagging is not reliably inferable from wrong notes.** Do not build a "lie detector" or penalize a child for apparent underperformance. Reduce the incentive instead: placement provides better content, has no scarce currency payoff, and can be challenged/revised freely.

## 4. Adaptive selection and fair inference

Maintain a per-domain placement estimate with **confidence**, not one universal raw accuracy percentage:

- Note/staff decoding: single-line pitch recognition, key mapping, ledger lines, accidentals.
- Rhythmic reading: note values, pulse, simple subdivisions; onset confidence separated from microphone latency.
- Phrase fluency: first-sight continuity, contour, steps/skips, reading ahead.
- Grand-staff readiness: treble and bass, separate-hands coordination and multiple voices.
- Independence: labelled guided note → short fixed phrase → static conventional score without hints.

Start with a broad anchor item informed by a voluntary experience hint, then use **bounded staircase selection**:
1. Two credible successful first-try observations at one capability → offer harder evidence.
2. Two credible difficulty signals → offer a supported easier/parallel task.
3. If evidence is mixed, choose a second new excerpt at similar complexity and report uncertainty.
4. Stop when evidence is sufficient or a short session time budget is reached; **never loop indefinitely until the child fails**.
5. Ask for a fresh challenge on a later day to confirm advancement.

Use grade-independent **capability bands** from the Reading Independence Ladder and per-skill evidence. Do not automatically assign the more experienced child to a high level solely because of their piano examination history. The reverse is equally important: let a child demonstrate advanced skill without first passing early levels.

**No answer leakage:** assessment notation cannot display key names, glowing next notes, score-following targets or corrective prompts during an independent first-try attempt. If a learner requests a hint, keep the attempt as instructional and mark it **not valid for unassisted placement**, without shame.

## 5. Static score and microphone boundaries

Early audition tasks may be automatically evaluated with touch or **confident monophonic** acoustic note detection. When a candidate is ready for two-staff, two-hand static reading, allow:
- A beautifully engraved stationary score, **no auto-scroll**.
- Student "I finished" and quick self-reflection.
- Optional parent/teacher observation rubric for pulse, independence, reading continuity and sight-reading fluency.
- Hand-separate automatic exercises for specific readable evidence.

The browser microphone currently detects a dominant single pitch and **cannot reliably grade simultaneous two-hand textures**. Do not produce fabricated "100% Grade 8" scores. Where automated evaluation is unavailable, call the result **observed or self-reported**, not automatically verified.

If microphone input confidence is poor, distinguish "not scorable" from "wrong note". Switch to touch or human review, or leave that domain **unknown**, rather than placing a child low because the device could not hear them.

## 6. Placement state and revisiting

~~~ts
interface PlacementProfile {
  version: 1;
  source: "audition" | "manual-parent" | "later-evidence";
  startedAt: string;
  updatedAt: string;
  tierBySkill: Record<string, number | null>;
  confidenceBySkill: Record<string, "low" | "medium" | "high">;
  recommendedIndependenceMode: "guided" | "phrase" | "independent";
  evidence: Array<{
    itemId: string;
    domain: string;
    firstSight: boolean;
    assisted: boolean;
    scorable: boolean;
    method: "touch" | "microphone" | "adult-observed" | "self-reported";
    outcome: string;
  }>;
  incomplete: boolean;
}
~~~

**Profile isolation:** one audition per child profile, immutable profile IDs, separate results and time policies. A sibling's session must not influence another child. Do not make exam grade a required input.

**Revisions:** Skill checks and new work may immediately promote individual skills. Parent/teacher can adjust a starting tier, with a visible "manually selected" marker distinct from observed evidence. Retake or reassess after further practice with **new unseen excerpts**. A weak day never permanently sets a low tier.

**Data ethics:** no microphone recording/upload or child ranking; retain compact assessment summaries, not raw identifiable audio. Parents may review or delete placement evidence.

## 7. Music Pass integration

Audition consumes the same parent-controlled **foreground active time** as other child activities. Before starting, show the approximate time needed and remaining budget. If insufficient, offer "Short audition" or parent-approved extra time, not a hidden free-play bypass.

If the budget expires mid-audition, finish the current small phrase within the defined grace period, mark placement **incomplete**, save valid observed items, and continue another time. Do not convert an interrupted audition into a low score or silently reset elapsed time.

## 8. Success measures and implementation gates

**Goal:** children who can already read music reach suitably demanding excerpts quickly and voluntarily, while beginners aren't made anxious.

- Placement uses **novel**, musically valid items and separate skill-domain confidence.
- Tests: high-performing simulated learner quickly reaches static phrase/grand-staff option; new learner receives an accessible warm-up; inconsistent performance triggers confirmation instead of one-item demotion.
- Tests: a child deliberately choosing only easy items can still request and pass a harder challenge **without grinding**; low placement never yields higher cosmetic rewards.
- Tests: hints remove an item from unassisted evidence; mic uncertainty produces unknown, not failure.
- Tests: profile switching, save/reload, short audition, playtime expiration and retake are idempotent and privacy safe.
- Pilot usability with real children: explain what they think the audition measures and whether they want to try challenging music; check for pressure, anxiety and inappropriate comparison.
- Measure downstream placement validity through performance on **new static excerpts** at a few increasing difficulty tiers, not only accuracy on audition items.

Proposed ticket **V4-25 (P0/P1)**: build an audition engine using independent unseen phrase banks and confidence-sensitive placement, with a friendly front end, Music Pass awareness and parent transparency. No MIDI.
