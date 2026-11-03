import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chooseMicrophoneId, type InputDevice } from './microphone.ts';

// The exact list Chrome reported on the machine where the default input returned pure silence.
const asusPc: InputDevice[] = [
  { deviceId: 'virtual-line', label: 'System Virtual Line (ASUS Utility)' },
  { deviceId: 'ai-nc', label: 'AI Noise-cancelling Input (ASUS Utility)' },
  { deviceId: 'cmedia-direct', label: 'Microphone (C-Media(R) Audio) (0b05:6203)' },
  { deviceId: 'default', label: 'Default - Microphone (C-Media(R) Audio) (0b05:6203)' },
  { deviceId: 'communications', label: 'Communications - Microphone (C-Media(R) Audio) (0b05:6203)' },
];

test('skips virtual and noise-cancelling pseudo devices and prefers the system default real microphone', () => {
  assert.equal(chooseMicrophoneId(asusPc), 'default');
});

test('falls back to the first real microphone when there is no "default" entry', () => {
  assert.equal(chooseMicrophoneId(asusPc.filter((d) => d.deviceId !== 'default')), 'cmedia-direct');
});

test('returns undefined when every device is virtual, so the browser default is used', () => {
  assert.equal(chooseMicrophoneId(asusPc.slice(0, 2)), undefined);
});

test('returns undefined when the device list is empty or unlabelled (permission not granted yet)', () => {
  assert.equal(chooseMicrophoneId([]), undefined);
  assert.equal(chooseMicrophoneId([{ deviceId: 'abc', label: '' }]), undefined);
});

test('does not treat a plain headset microphone as virtual', () => {
  const devices: InputDevice[] = [
    { deviceId: 'default', label: 'Default - Headset Microphone (Logitech H390)' },
    { deviceId: 'hs', label: 'Headset Microphone (Logitech H390)' },
  ];
  assert.equal(chooseMicrophoneId(devices), 'default');
});
