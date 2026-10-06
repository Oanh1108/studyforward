const fs = require("fs");
let code = fs.readFileSync("c:/studyforward/backend/src/vocabulary/vocabulary.service.ts", "utf8");

const replacement = `    // Optional SRS update
    if (data.recordSrs !== false) {
      const quality = overallCorrect ? 4 : 1;
      await this.recordCustomWordStudy(userId, data.wordId, quality);
    }`;

code = code.replace(
  /\/\/ Optional SRS update\s*if \(data\.recordSrs !== false\) \{\s*const quality = overallCorrect \? 4 : 1;\s*const srsRes = calculateNextReview\(word, quality\);\s*word\.srsLevel = srsRes\.srsLevel;\s*word\.easeFactor = srsRes\.easeFactor;\s*word\.interval = srsRes\.interval;\s*word\.nextReview = srsRes\.nextReview;\s*await this\.customVocabRepo\.save\(word\);\s*\}/,
  replacement
);

fs.writeFileSync("c:/studyforward/backend/src/vocabulary/vocabulary.service.ts", code, "utf8");
console.log("Replaced evaluateDictation");

