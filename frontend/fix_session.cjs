const fs = require("fs");
let lines = fs.readFileSync("components/learning/my-vocabulary/StudySessionView.tsx", "utf8").split("\n");

// 1. Fix "T?t c? dáp án"
for (let i = 1950; i < 1965; i++) {
  if (lines[i] && lines[i].includes("dp n:")) {
    lines[i] = `                                   <span className="text-[var(--text-muted)]">T?t c? dáp án: </span>`;
  }
}

// 2. Fix "Câu ti?p theo"
for (let i = 1965; i < 1975; i++) {
  if (lines[i] && lines[i].includes("Cu ti")) {
    lines[i] = `                            Câu ti?p theo ? [Enter]`;
  }
}

// 3. Fix summary block
for (let i = 1980; i < 2012; i++) {
  if (lines[i] && lines[i].includes("div className=\"text-4xl")) {
    lines[i] = `                <div className="text-4xl mb-4">??</div>`;
  }
  if (lines[i] && lines[i].includes("Tuy")) {
    lines[i] = `                  Tuy?t v?i, b?n dã hoàn thành!`;
  }
  if (lines[i] && lines[i].includes("K?t qu?:")) {
    lines[i] = lines[i].replace(/K\?t qu\?:/, "K?t qu?:").replace(/c.u d.ng\./, "câu dúng.");
  }
  if (lines[i] && lines[i].includes("H?c ti?p bu?i m?i")) {
    lines[i] = `                    ?? H?c ti?p bu?i m?i`;
  }
  if (lines[i] && lines[i].includes("V? thu m?c")) {
    lines[i] = `                    V? thu m?c / Ðóng`;
  }
}

// 4. Fix modal block
for (let i = 2013; i < 2045; i++) {
  if (lines[i] && lines[i].includes("div className=\"text-2xl")) {
    lines[i] = `            <div className="text-2xl">??</div>`;
  }
  if (lines[i] && lines[i].includes("T?m d?ng bu?i h?c?")) {
    lines[i] = `            <h4 className="text-base font-bold text-[var(--text-primary)]">T?m d?ng bu?i h?c?</h4>`;
  }
  if (lines[i] && lines[i].includes("Ti?n d? c")) {
    lines[i] = lines[i]
      .replace(/Ti.n d. c.u/, "Ti?n d? câu")
      .replace(/d. du.c luu an to.n/, "dang du?c luu")
      .replace(/B.n c. th. quay l.i ti.p t.c b.t c. l.c n.o t. trang ch. ho.c thu m.c/, "B?n có th? quay l?i ti?p t?c b?t c? lúc nào t? trang ch? ho?c thu m?c");
  }
  if (lines[i] && lines[i].includes("H?c ti?p")) {
    lines[i] = `                H?c ti?p`;
  }
  if (lines[i] && lines[i].includes("Luu & Tho")) {
    lines[i] = `                Luu và thoát`;
  }
}

fs.writeFileSync("components/learning/my-vocabulary/StudySessionView.tsx", lines.join("\n"), "utf8");
console.log("Replaced!");

