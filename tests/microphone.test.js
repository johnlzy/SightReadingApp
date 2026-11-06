import test from 'node:test';
import assert from 'node:assert/strict';
import { startMicrophone, stopMicrophone, isMicrophoneActive } from '../js/microphone.js';

function withContextAndMedia(getUserMedia) {
    const created = [];
    class FakeAudioContext {
        constructor() {
            this.state = 'suspended';
            created.push(this);
        }
        close() { this.state = 'closed'; return Promise.resolve(); }
    }
    globalThis.window = { AudioContext: FakeAudioContext };
    Object.defineProperty(globalThis, 'navigator', {
        configurable: true, value: { mediaDevices: { getUserMedia } }
    });
    return created;
}

test('mic permission denial closes the audio context and leaves no active stream', async () => {
    const created = withContextAndMedia(async () => {
        throw Object.assign(new Error('Permission denied'), { name: 'NotAllowedError' });
    });
    await assert.rejects(startMicrophone(), /Permission denied/);
    assert.equal(created.length, 1);
    assert.equal(created[0].state, 'closed');
    assert.equal(isMicrophoneActive(), false);
});

test('cancelled permission prompts cannot re-open an abandoned microphone', async () => {
    let resolvePermission;
    const created = withContextAndMedia(() => new Promise(resolve => { resolvePermission = resolve; }));
    const opening = startMicrophone();
    const track = { stopped: false, onended: null, stop() { this.stopped = true; } };
    stopMicrophone();
    resolvePermission({ getTracks: () => [track] });
    assert.equal(await opening, false);
    assert.equal(track.stopped, true);
    assert.equal(created[0].state, 'closed');
    assert.equal(isMicrophoneActive(), false);
});
