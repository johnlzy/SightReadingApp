# Fun Sight Reading — v3.0

A browser-based sight-reading game for children. Practice on the on-screen piano, or
use the device microphone to play notes on a **real acoustic piano**.

## Using a real piano

1. Open the app using **HTTPS** or **localhost**, on a phone, tablet or laptop.
2. Sign in to a player profile and choose **🎤 Real Piano**.
3. Allow the microphone and play a single note to calibrate the signal.
4. Once the note is recognized, choose **Use Real Piano**.
5. Start Coin Run or Song Mode and play the notes shown on the staff.
6. To return to the digital keyboard, choose **Use touch keys**.

The app never records or uploads microphone audio. Analysis happens entirely in
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
