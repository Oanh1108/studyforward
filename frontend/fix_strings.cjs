const fs = require("fs");
let code = fs.readFileSync("components/learning/my-vocabulary/StudySessionView.tsx", "utf8");

// We need to replace all broken strings that we saw in the grep output.
const replacements = [
  { from: "Cch d?c:", to: "Cách d?c:" },
  { from: "?ng nghia:", to: "Ð?ng nghia:" },
  { from: "Thi?u:", to: "Thi?u:" },
  { from: "T?t c? dp n:", to: "T?t c? dáp án:" },
  { from: "Cu ti?p theo ?", to: "Câu ti?p theo ?" },
  { from: "? ?t", to: "? Ð?t" },
  { from: "? Chua d?t", to: "? Chua d?t" },
  { from: "Tuy?t v?i, b?n d hon thnh!", to: "Tuy?t v?i, b?n dã hoàn thành!" },
  { from: "K?t qu?:", to: "K?t qu?:" },
  { from: "cu dng", to: "câu dúng" },
  { from: "?? H?c ti?p bu?i m?i", to: "?? H?c ti?p bu?i m?i" },
  { from: "V? thu m?c / ng", to: "V? thu m?c / Ðóng" },
  { from: ">??</div>", to: ">??</div>" },
  { from: "T?m d?ng bu?i h?c?", to: "T?m d?ng bu?i h?c?" },
  { from: "Ti?n d? cu", to: "Ti?n d? câu" },
  { from: "d du?c luu an ton", to: "dã du?c luu an toàn" },
  { from: "B?n c th? quay l?i ti?p t?c b?t c? lc no t? trang ch? ho?c thu m?c.", to: "B?n có th? quay l?i ti?p t?c b?t c? lúc nào t? trang ch? ho?c thu m?c." },
  { from: ">H?c ti?p</button>", to: ">H?c ti?p</button>" },
  { from: "Luu & Thot ra", to: "Luu và thoát" }
];

for (const rep of replacements) {
  code = code.split(rep.from).join(rep.to);
}

fs.writeFileSync("components/learning/my-vocabulary/StudySessionView.tsx", code, "utf8");
console.log("Fixed strings!");

