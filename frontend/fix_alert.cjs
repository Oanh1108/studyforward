const fs = require("fs");
let code = fs.readFileSync("c:/studyforward/frontend/components/learning/my-vocabulary/StudySessionView.tsx", "utf8");

code = code.replace(
  /alert\("L\?i luu ti\?n d\?. Vui l.*?ng th\? l\?i!"\);/g,
  "alert(\"L?i luu ti?n d?. Vui lòng th? l?i!\");"
);

code = code.replace(
  /<div className="text-2xl">\?\?<\/div>/g,
  "<div className=\"text-2xl\">??</div>"
);

code = code.replace(
  /T\?m d\?ng bu\?i h\?c\?/g,
  "T?m d?ng bu?i h?c?"
);

code = code.replace(
  /Ti\?n d\? c.u \{currentIndex \+ 1\}\/\{deck.length\} dang du\?c luu. B\?n c. th\? quay l\?i ti\?p t\?c b\?t c\? l.*?c n.*?o t\? trang ch\? ho\?c thu m\?c./g,
  "Ti?n d? câu {currentIndex + 1}/{deck.length} dang du?c luu. B?n có th? quay l?i ti?p t?c b?t c? lúc nào t? trang ch? ho?c thu m?c."
);

code = code.replace(
  /H\?c ti\?p/g,
  "H?c ti?p"
);

fs.writeFileSync("c:/studyforward/frontend/components/learning/my-vocabulary/StudySessionView.tsx", code, "utf8");
console.log("Alert and strings fixed");

