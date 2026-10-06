export function parsePastedText(text: string): string[][] {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  const result: string[][] = [];

  for (let line of lines) {
    // Skip markdown table separators like |---|---|
    if (/^[\s|:-]+$/.test(line)) continue;

    // Decode HTML entities roughly
    line = line.replace(/&#x20;/g, ' ').replace(/&nbsp;/g, ' ');

    // 1. Markdown table row
    if (line.includes('|')) {
      const cells = line.split('|').map(c => c.trim());
      // Remove empty first and last if they are table borders
      if (cells.length > 0 && cells[0] === '') cells.shift();
      if (cells.length > 0 && cells[cells.length - 1] === '') cells.pop();
      if (cells.length > 0) {
        result.push(cells);
        continue;
      }
    }

    // 2. Tab separated
    if (line.includes('\t')) {
      result.push(line.split('\t').map(c => c.trim()));
      continue;
    }

    // 3. Heuristic split: Word = Synonym (pos) Meaning or Word (pos) Meaning
    // e.g. "ladder = stepladder (n) thang xếp" -> word: "ladder", syn: "stepladder", pos: "n", meaning: "thang xếp"
    const regexPos = /^(.+?)\s+(\([nva-z]+\)|\[[nva-z]+\])\s+(.+)$/i;
    const matchPos = line.match(regexPos);
    if (matchPos) {
      let wordPart = matchPos[1].trim();
      let pos = matchPos[2].replace(/[()[\]]/g, '').trim();
      let meaning = matchPos[3].trim();
      let syn = '';

      if (wordPart.includes('=')) {
        const parts = wordPart.split('=');
        wordPart = parts[0].trim();
        syn = parts.slice(1).join('=').trim();
      }

      result.push([wordPart, meaning, pos, syn]);
      continue;
    }

    // Fallback split by '-' or '=' if there's no POS, but '=' could mean synonym, so use '-' or ':'
    const splitRegex = /[-:]/;
    if (splitRegex.test(line)) {
       const parts = line.split(splitRegex);
       if (parts.length >= 2) {
          const w = parts[0].trim();
          const m = parts.slice(1).join('-').trim(); // join back the rest
          result.push([w, m, '', '']);
          continue;
       }
    }

    // Single column fallback
    result.push([line, '', '', '']);
  }
  return result;
}
