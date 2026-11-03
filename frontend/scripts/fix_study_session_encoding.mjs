import fs from 'fs';
import path from 'path';

const filePath = path.resolve('frontend/components/learning/my-vocabulary/StudySessionView.tsx');
let lines = fs.readFileSync(filePath, 'utf8').split('\n');

const replacements = {
  162: '      alert("Lỗi lưu tiến độ. Vui lòng thử lại!");',
  1882: '                              : `Nhập từ ${langInfo.name} đúng chính tả...`',
  1929: '                              placeholder="Nhập đồng nghĩa rồi nhấn Enter... (Ctrl+Enter để nộp bài)"',
  1967: '                                <span className="text-[var(--text-muted)]">Cách đọc: </span>',
  1977: '                                  Đồng nghĩa: <span className={isSynonymCorrect ? "text-emerald-600" : "text-rose-600"}>{isSynonymCorrect ? "✓ Đạt" : "✗ Chưa đạt"}</span>',
  1992: '                                    <span className="text-[var(--text-muted)]">Tất cả đáp án: </span>',
  2004: '                            Câu tiếp theo → [Enter]',
  2021: '                  Tuyệt vời, bạn đã hoàn thành!',
  2024: '                  Kết quả: <span className="font-bold text-indigo-600 dark:text-indigo-400">{studyHistory.filter(h => h.isCorrect).length}</span> / {deck.length} câu đúng.',
  2041: '                    Về thư mục / Đóng',
  2052: '            <h4 className="text-base font-bold text-[var(--text-primary)]">Tạm dừng buổi học?</h4>',
  2054: '              Tiến độ câu {currentIndex + 1}/{deck.length} đang được lưu. Bạn có thể quay lại tiếp tục bất cứ lúc nào từ trang chủ hoặc thư mục.',
  2070: '                {isSavingExit ? "Đang lưu..." : "Lưu và thoát"}',
};

for (const [lineNumStr, newLine] of Object.entries(replacements)) {
  const index = parseInt(lineNumStr, 10) - 1;
  console.log(`Replacing line ${lineNumStr}:`);
  console.log('OLD:', lines[index]);
  console.log('NEW:', newLine);
  lines[index] = newLine;
}

fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
console.log('StudySessionView.tsx completely cleaned!');
