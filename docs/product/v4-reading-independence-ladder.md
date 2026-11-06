# Reading Independence Ladder

Status: v4 product proposal, not implemented. Levels describe sight-reading abilities, not ABRSM exam grades.

The ultimate experience is independently reading a stationary, fully engraved piano score. The child plays without moving targets, automatic scrolling, note-name labels, or prompts directing the next note. Existing scrolling-note play remains an optional beginner activity. Advanced players may enter stationary score mode immediately after a short audition.

## Two independent axes

Track **musical complexity** (staves, clefs, intervals, rhythms, key signatures, harmony, texture) separately from **reading independence** (hints versus unassisted fixed-score reading). A third dimension tracks reliability and delayed retention. Exam grades can be optional context but must not determine placement.

## Ten illustrative in-app milestones

| Level | Name | Musical task | Presentation |
|---|---|---|---|
| 1 | Note Detective | Five notes, staff-to-key mapping | Single highlighted note, optional labelled keys |
| 2 | Staff Explorer | Basic octave and step/skip patterns | Short grouped notes, hints fade |
| 3 | Melody Maker | One- to two-bar melodies | Entire phrase visible |
| 4 | Page Reader | Two- to four-bar unfamiliar melodies | **Fixed single-staff score**, no note chasing |
| 5 | Rhythm Navigator | Dotted notes, rests, ties, pulse | Stationary four- to eight-bar phrase |
| 6 | Two-Staff Explorer | Grand staff and hand changes | Stationary **treble+bass staves** |
| 7 | Fluent Musician | Keys, leaps, phrases, two-hand coordination | Fixed grand staff, multiple measures |
| 8 | Phrase Performer | Articulations, dynamics, chords, varied metre | Static multi-system page; manual turns |
| 9 | Independent Pianist | Polyphonic notation and musical continuity | Conventional piano score, no highlighting |
| 10 | Concert Reader | Advanced unseen musical textures | Independent, multi-page fixed scores |

These milestones are not a formal ABRSM Grade 1-to-8 mapping. The content engine can eventually support upper-grade complexity, including material approaching Grade 8. Exact skill difficulty must be reviewed with teachers and evaluated empirically. A more experienced learner may start at Level 6 or higher; nobody has to grind through hundreds of simple tap exercises.

## Three presentation modes

**Guided Note:** optional key-name labels, moving note pointer, feedback after a tap; suitable for early staff-to-key fluency.

**Phrase Reader:** a complete short phrase stays still from the outset; child prepares then presses Play When Ready; optional help is available only in practice, not independent checks.

**Independent Score:** a complete, professionally engraved score stays **stationary throughout the attempt**. Hide note names, colored target notes, metronome cursor and game effects while reading. Manual page turning and zoom are allowed; automatic scrolling and automatic page turns are not. Provide Study and Play Independently as distinct actions, then feedback and companion celebrations afterward. On small phone screens use shorter legible excerpts; do not shrink a whole advanced page into unreadable text.

## Required musical notation engine

The current hand-drawn SVG note stream is insufficient for conventional grand-staff piano notation. Introduce a pure ScoreDocument with notes, spelling, time/key signatures, hands/voices, simultaneous chords, barlines, beams, dots, ties, slurs, rests, articulations, tempo and dynamics. A separate renderer handles static measure/system layout and manual pagination. Internal beat timing never animates the score.

Evaluate maintained notation solutions such as VexFlow or OpenSheetMusicDisplay after a small licensing and feasibility spike. Include staff alignment, polyphonic beaming, accidentals, tuplets, responsive layout, legibility and mobile performance. Support original musically coherent short excerpts, not random isolated pitches presented as songs.

## Honest assessment of advanced piano performance

The browser microphone currently detects one dominant note at a time. It cannot truthfully assess a simultaneous two-hand texture, however advanced the score renderer becomes.

- Monophonic exercises can receive automated grading where audio confidence supports it.
- More complex material may use separate-hand training or an optional parent/teacher rubric.
- Student reflection can capture reading ahead, flow, recovery and phrasing without falsely claiming precise pitch scores.
- Low-confidence or unscorable microphone input must not become a wrong-note count.
- MIDI is explicitly outside the roadmap.

## Placement, mastery and access

The opening **audition** chooses a provisional starting point based on unseen musical evidence, not the student's exam grade. All pathways support rapid promotions, choosing a harder challenge and returning to foundations without penalty. Track mastery by specific skill and retain comparison data from independent unseen phrases. Do not restrict independent score reading by cosmetic currency or a prolonged beginner grind.

## Engineering and acceptance

- V4-20: score/document model and stationary-engraving renderer feasibility.
- V4-21: presentation policy for Guided, Phrase and Independent modes.
- V4-22: curriculum prerequisites and ten illustrative milestones.
- V4-23: honest hand-separate and human-assisted advanced evaluation.
- V4-24: original advanced repertoire/phrase templates with notation validators.
- Tests assert that the musical score does not move during independent playback, page turns are explicit, hints/key names are absent, and more advanced players can enter at an appropriate level.

See the [opening audition](./v4-opening-audition.md) and [multi-child profile design](./v4-multi-child-grade-pathways.md).
