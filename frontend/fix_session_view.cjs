const fs = require("fs");
let code = fs.readFileSync("c:/studyforward/frontend/components/learning/my-vocabulary/StudySessionView.tsx", "utf8");

code = code.replace(
  "export function StudySessionView({\n  initialFolderId,\n  onResumeRequested = false,\n  onClose,\n}: StudySessionViewProps) {",
  "export function StudySessionView({\n  initialFolderId,\n  onResumeRequested = false,\n  initialSessionId,\n  onClose,\n}: StudySessionViewProps) {"
);

// We need to inject fetching logic in the useEffect
const fetchLogic = `
  useEffect(() => {
    if (initialSessionId) {
      myVocabApi.getStudySession(initialSessionId)
        .then(session => {
          if (session && session.deck && session.deck.length > 0) {
            setSavedSessionToResume(session);
            resumeSavedSession(session);
          }
        })
        .catch(console.error);
      return;
    }
`;

code = code.replace(
  "useEffect(() => {\n    if (typeof window !== 'undefined') {",
  fetchLogic.replace(/''/g, "'") + "    if (typeof window !== 'undefined') {"
);

fs.writeFileSync("c:/studyforward/frontend/components/learning/my-vocabulary/StudySessionView.tsx", code.replace(/''/g, "'"), "utf8");
console.log("StudySessionView fixed!");

