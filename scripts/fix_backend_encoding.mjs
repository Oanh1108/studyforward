import fs from 'fs';
import path from 'path';

// 1. vocabulary.service.ts
const vFile = path.resolve('backend/src/vocabulary/vocabulary.service.ts');
let vLines = fs.readFileSync(vFile, 'utf8').split('\n');
vLines = vLines.map(line => {
  if (line.includes('NotFoundException') && (line.includes('\uFFFD') || line.includes('Kh') || line.includes('v?ng'))) {
    return '      throw new NotFoundException("Không tìm thấy từ vựng");';
  }
  return line;
});
fs.writeFileSync(vFile, vLines.join('\n'), 'utf8');

// 2. word-parser.ts
const wFile = path.resolve('backend/src/vocabulary/word-parser.ts');
let wContent = fs.readFileSync(wFile, 'utf8');
wContent = wContent.replace(/t[\uFFFD\S]+ nh[\uFFFD\S]+ cao t[\uFFFD\S]+/g, 'tòa nhà cao tầng');
wContent = wContent.replace(
  /danh t\?\|d\?ng t\?\|t[\uFFFD\S]+nh t\?\|tr\?ng t\?\|gi\?i t\?\|d\?i t\?\|li[\uFFFD\S]+n t\?\|th[\uFFFD\S]+n t\?/,
  'danh từ|động từ|tính từ|trạng từ|giới từ|đại từ|liên từ|thán từ'
);
fs.writeFileSync(wFile, wContent, 'utf8');

console.log('Fixed backend files successfully!');
