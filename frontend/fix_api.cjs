const fs = require("fs");
let code = fs.readFileSync("c:/studyforward/frontend/lib/myVocabApi.ts", "utf8");

const getIncompleteSessions = `
  async getIncompleteStudySessions(language?: string): Promise<any[]> {
    const q = language ? \`?language=\${encodeURIComponent(language)}\` : '';
    return requestApi<any[]>(\`/api/vocabulary/study/incomplete-sessions\${q}\`);
  },`;

code = code.replace(
  "async getRecentStudySession(): Promise<any> {",
  getIncompleteSessions + "\n\n  async getRecentStudySession(): Promise<any> {"
);

fs.writeFileSync("c:/studyforward/frontend/lib/myVocabApi.ts", code.replace(/''/g, "'"), "utf8");
console.log("Frontend API added!");

