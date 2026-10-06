const fs = require("fs");
let code = fs.readFileSync("c:/studyforward/frontend/components/ui/Select.tsx", "utf8");
code = code.replace(/value: string;/g, "value: string | number;");
code = code.replace(/value\?: string;/g, "value?: string | number;");
fs.writeFileSync("c:/studyforward/frontend/components/ui/Select.tsx", code, "utf8");
console.log("Select fixed properly");

