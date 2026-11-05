export interface TranscriptSegment {
  id: string;
  startTime: number; // in seconds
  endTime: number;
  text: string;
}

  export interface VideoLessonData {
    id?: number;
    youtubeVideoId: string;
    title: string;
    transcriptData: string;
    scoreCorrect?: number;
    scoreTotal?: number;
  }

export function extractYouTubeId(url: string) {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

/** "0:05", "00:05", "1:02:03" or "00:05.120", optionally in [brackets], followed by optional text on the same line. */
const TIMESTAMP = /^\[?(?:(\d+):)?(\d{1,2}):(\d{2})(?:[.,](\d+))?\]?\s*(.*)$/;

/**
 * Turns pasted subtitles into timed segments. Understands:
 *   [00:05] Hello world            (timestamp and text on one line)
 *   0:05                           (what YouTube's "Show transcript" copies: a timestamp line,
 *   Hello world                     then the text on the next line)
 * Lines without any timestamp get a placeholder time, 5 seconds apart.
 */
export function parseTranscript(raw: string): TranscriptSegment[] {
  const lines = raw.split('\n');
  const segments: TranscriptSegment[] = [];
  let pendingStart: number | null = null;

  const push = (i: number, startTime: number, text: string) =>
    segments.push({ id: `seg-${i}`, startTime, endTime: startTime + 5, text: text.trim() });

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const match = line.match(TIMESTAMP);
    if (match) {
      const hours = match[1] ? parseInt(match[1], 10) : 0;
      const startTime = hours * 3600 + parseInt(match[2], 10) * 60 + parseInt(match[3], 10) + (match[4] ? parseInt(match[4], 10) / 1000 : 0);
      if (match[5].trim()) {
        push(i, startTime, match[5]);
        pendingStart = null;
      } else {
        pendingStart = startTime; // the text follows on the next line
      }
    } else if (pendingStart !== null) {
      push(i, pendingStart, line);
      pendingStart = null;
    } else {
      push(i, i * 5, line);
      segments[segments.length - 1].endTime = (i + 1) * 5;
    }
  }

  // Refine endTimes based on next startTime
  for (let i = 0; i < segments.length - 1; i++) {
    if (segments[i + 1].startTime > segments[i].startTime) segments[i].endTime = segments[i + 1].startTime;
  }
  return segments;
}
