import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseScript, buildItems } from './script.ts';

const SAMPLE = `
# TOEIC 2026 Test 7 (comments and blank lines are ignored)

## PART 1
1 | M-Au | She's holding a water bottle. | She's looking at a newspaper. | She's reaching for a book. | She's standing next to a copier.

## PART 2
7 | M-Au/W-Am | Where do I sign this contract? | A large account. | Here at the bottom. | Hang it on the wall.

## PART 3
32-34 | M-Cn/W-Am | M: Carmen, do you realize it? Your chair squeaks. || W: Oh! I had my headset on. I'll swap it. || M: Thanks. Do you want anything?

## PART 4
71-73 | W-Am | Good morning, everyone. Thank you for coming early. I'd like to show you how it works.
`;

test('parseScript reads every part with its question numbers and accents', () => {
  const entries = parseScript(SAMPLE);
  assert.deepEqual(entries.map((e) => [e.part, e.from, e.to]), [[1, 1, 1], [2, 7, 7], [3, 32, 34], [4, 71, 73]]);
  assert.deepEqual(entries[1].accents, ['M-Au', 'W-Am']);
  assert.deepEqual(entries[0].accents, ['M-Au']);
});

test('parseScript reads conversation turns with their speaker', () => {
  const turns = parseScript(SAMPLE)[2].turns!;
  assert.equal(turns.length, 3);
  assert.deepEqual(turns[0], { speaker: 'M', text: 'Carmen, do you realize it? Your chair squeaks.' });
  assert.equal(turns[1].speaker, 'W');
});

test('parseScript supports three-person conversations (M1, M2, W)', () => {
  const [entry] = parseScript('## PART 3\n50-52 | M-Cn/M-Au/W-Br | M1: Hello there. || M2: Hi. || W: Good morning.');
  assert.deepEqual(entry.turns!.map((t) => t.speaker), ['M1', 'M2', 'W']);
});

test('parseScript rejects malformed lines with a helpful message', () => {
  assert.throws(() => parseScript('## PART 1\n1 | M-Au | only one statement'), /Part 1.*4 statements/i);
  assert.throws(() => parseScript('## PART 2\n7 | M-Au/W-Am | question | A | B'), /Part 2.*4/i);
  assert.throws(() => parseScript('## PART 3\n32-34 | M-Cn/W-Am | no speakers here'), /speaker/i);
  assert.throws(() => parseScript('1 | M-Au | outside any part | a | b | c'), /part/i);
});

test('buildItems makes one practice item per question or group, labelled for learners', () => {
  const items = buildItems(parseScript(SAMPLE));
  assert.deepEqual(items.map((i) => i.label), ['Câu 1', 'Câu 7', 'Câu 32–34', 'Câu 71–73']);
  assert.deepEqual(items.map((i) => i.part), [1, 2, 3, 4]);
  assert.deepEqual(items.map((i) => i.id), ['p1-q1', 'p2-q7', 'p3-q32', 'p4-q71']);
});

test('buildItems tags Part 1 statements A-D and Part 2 as the question followed by A-C', () => {
  const [p1, p2] = buildItems(parseScript(SAMPLE));
  assert.deepEqual(p1.segments.map((s) => s.tag), ['A', 'B', 'C', 'D']);
  assert.deepEqual(p2.segments.map((s) => s.tag), ['Q', 'A', 'B', 'C']);
  assert.equal(p2.segments[0].text, 'Where do I sign this contract?');
});

test('buildItems cuts conversations into sentences and keeps who is speaking', () => {
  const p3 = buildItems(parseScript(SAMPLE))[2];
  assert.deepEqual(
    p3.segments.map((s) => [s.speaker, s.text]),
    [
      ['M', 'Carmen, do you realize it?'],
      ['M', 'Your chair squeaks.'],
      ['W', 'Oh! I had my headset on.'],
      ['W', "I'll swap it."],
      ['M', 'Thanks. Do you want anything?'],
    ],
  );
});

test('buildItems gives every segment a unique, stable id in script order', () => {
  const items = buildItems(parseScript(SAMPLE));
  const ids = items.flatMap((i) => i.segments.map((s) => s.id));
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(ids[0], 'p1-q1-a');
  assert.deepEqual(buildItems(parseScript(SAMPLE)).flatMap((i) => i.segments.map((s) => s.id)), ids);
});

test('buildItems turns a talk into sentences with the speaker accent', () => {
  const p4 = buildItems(parseScript(SAMPLE))[3];
  assert.deepEqual(p4.segments.map((s) => s.text), [
    'Good morning, everyone.',
    'Thank you for coming early.',
    "I'd like to show you how it works.",
  ]);
});
