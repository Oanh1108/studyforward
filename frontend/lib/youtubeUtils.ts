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

export function parseTranscript(raw: string): TranscriptSegment[] {
  // Format: [00:05] Hello world or 00:05.120 Hello world
  const lines = raw.split('\n');
  const segments: TranscriptSegment[] = [];
  const timeRegex = /\[?(\d{2}):(\d{2})(?:\.(\d+))?\]?\s+(.*)/;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const match = line.match(timeRegex);
    if (match) {
      const min = parseInt(match[1], 10);
      const sec = parseInt(match[2], 10);
      const ms = match[3] ? parseInt(match[3], 10) / 1000 : 0;
      const startTime = min * 60 + sec + ms;
      segments.push({
        id: `seg-${i}`,
        startTime,
        endTime: startTime + 5, // Default to +5s, will refine below
        text: match[4].trim(),
      });
    } else {
      segments.push({
        id: `seg-${i}`,
        startTime: i * 5,
        endTime: (i + 1) * 5,
        text: line,
      });
    }
  }

  // Refine endTimes based on next startTime
  for (let i = 0; i < segments.length - 1; i++) {
    segments[i].endTime = segments[i + 1].startTime;
  }
  return segments;
}
