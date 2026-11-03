# Adding a TOEIC test to the dictation page

The page plays the real recording sentence by sentence. For that each sentence needs a start and end time in its
part's recording. These scripts find them automatically; the transcript itself still has to be written once.

1. **Recordings** – copy the four parts to `public/audio/toeic/<year>/test-<nn>/part-1.mp3 … part-4.mp3`.
2. **Transcript** – write `data/toeic/<year>/test-<nn>.script.txt` (format in `lib/dictation/toeic/script.ts`;
   `data/toeic/2026/test-07.script.txt` is a full example). One line per question or group of questions.
3. **Recognise the recordings** (a few minutes, runs locally):
   `node scripts/toeic/transcribe-audio.mjs --audio-dir <folder with the mp3 files> --prefix Test_<nn> --out tmp/asr-<year>-<nn>`
4. **Build the data**:
   `node scripts/toeic/build-test.ts --year <year> --test <n> --script data/toeic/<year>/test-<nn>.script.txt --asr tmp/asr-<year>-<nn>`
   It writes `lib/dictation/toeic/<year>-test-<nn>.ts` and lists the few sentences worth checking by ear.
5. **Register it** in `lib/dictation/toeic/index.ts`, then run `npm test` (it checks the recordings exist, every sentence
   has a clip, clips are in order, and so on).

## Tests with one recording for the whole listening section and a scanned transcript (the 2023 tests, Parts 1 and 2 only)

1. **Recognise** the first 26 minutes: `node scripts/toeic/transcribe-full.mjs --audio "<Test 01.mp3>" --out tmp/asr-2023-01/asr-full.json --max-minutes 26`
2. **Cut** it into parts and re-time the recognition output per part:
   `node scripts/toeic/split-full-audio.mjs --audio "<Test 01.mp3>" --asr tmp/asr-2023-01/asr-full.json --out-dir public/audio/toeic/2023/test-01 --asr-out-dir tmp/asr-2023-01`
3. **Draft the transcript** from the recognised words, cross-checked against the OCR text of the PDF pages (optional `--ocr`):
   `node scripts/toeic/script-from-asr.mjs --asr-dir tmp/asr-2023-01 --year 2023 --test 1 --out data/toeic/2023/test-01.script.txt --ocr tmp/ocr-2023-01.txt`
   Read the list it prints of sentences that differ from the PDF, and fix what Whisper heard wrong (names, numbers, repeated lines).
4. **Build** with `--parts 1,2`: `node scripts/toeic/build-test.ts --year 2023 --test 1 --script data/toeic/2023/test-01.script.txt --asr tmp/asr-2023-01 --parts 1,2`, then register the test in `lib/dictation/toeic/index.ts`.
