const fs = require("fs");
const code = fs.readFileSync("components/learning/my-vocabulary/StudySessionView.tsx", "utf8");

const opens = [...code.matchAll(/<span\b/g)];
const closes = [...code.matchAll(/<\/span>/g)];

console.log("Opens:", opens.length);
console.log("Closes:", closes.length);

// Print the surrounding text of all opens
// to see which ones don"t have closes

