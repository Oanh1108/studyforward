const fs = require("fs");
const parser = require("@babel/parser");

const code = fs.readFileSync("components/learning/my-vocabulary/StudySessionView.tsx", "utf8");

try {
  const ast = parser.parse(code, {
    sourceType: "module",
    plugins: ["jsx", "typescript"]
  });
} catch (e) {
  console.log("Error at line", e.loc.line, "column", e.loc.column);
  
  // print 5 lines before and after the error
  const lines = code.split("\n");
  for (let i = Math.max(0, e.loc.line - 5); i < Math.min(lines.length, e.loc.line + 5); i++) {
    console.log(i + 1, ":", lines[i]);
  }
}

