const fs = require("fs");
const code = fs.readFileSync("components/learning/my-vocabulary/StudySessionView.tsx", "utf8");

function countTags(tagName) {
  let count = 0;
  const openRegex = new RegExp("<" + tagName + "\\b", "g");
  const closeRegex = new RegExp("</" + tagName + ">", "g");
  
  const opens = code.match(openRegex) || [];
  const closes = code.match(closeRegex) || [];
  
  console.log(tagName, "opens:", opens.length, "closes:", closes.length);
}

countTags("form");
countTags("span");
countTags("button");
countTags("h4");
countTags("p");

