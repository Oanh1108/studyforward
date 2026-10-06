const fs = require("fs");
const parser = require("@babel/parser");

const code = fs.readFileSync("components/learning/my-vocabulary/StudySessionView.tsx", "utf8");

try {
  parser.parse(code, {
    sourceType: "module",
    plugins: ["jsx", "typescript"]
  });
  console.log("Parsed successfully!");
} catch (e) {
  console.log("Error at line", e.loc.line, "column", e.loc.column);
  console.log(e.message);
}

