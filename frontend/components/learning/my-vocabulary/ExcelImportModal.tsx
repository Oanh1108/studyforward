"use client";

import React, { useState, useRef, useMemo, useEffect } from 'react';
import { VocabularyFolder, myVocabApi } from '@/lib/myVocabApi';
import { useAuth } from '@/lib/authContext';
import {
  SupportedLanguage,
  SUPPORTED_LANGUAGES,
  LANGUAGE_LIST,
  getLanguageInfo,
  getPrimaryReading,
} from '@/lib/languages';
import {
  readExcelFile,
  autoDetectColumns,
  parseRowsWithMapping,
  downloadSampleExcelTemplate,
  ColumnMapping,
  ParsedExcelRow,
} from '@/lib/excelHelper';
import { ModalDialog } from '@/components/ui/ModalDialog';
import { Select } from '@/components/ui/Select';

interface ExcelImportModalProps {
  isOpen: boolean;
  mode?: 'excel' | 'paste';
  onClose: () => void;
  folders: VocabularyFolder[];
  activeFolderId?: number | null;
  onSuccess: (result: { folderId: number | null; count: number }) => void;
}

export function ExcelImportModal({
  isOpen,
  mode = 'excel',
  onClose,
  folders,
  activeFolderId,
  onSuccess,
}: ExcelImportModalProps) {
  const { currentLanguage } = useAuth();

  // Selected language for import
  const [importLanguage, setImportLanguage] = useState<SupportedLanguage>(() => {
    const activeFolder = folders.find((f) => f.id === activeFolderId);
    return (activeFolder?.language as SupportedLanguage) || currentLanguage || 'en';
  });

  // Step: 'upload' -> 'configure' -> 'preview' -> 'done'
  const [step, setStep] = useState<'upload' | 'configure' | 'preview' | 'done'>('upload');

  // File & Sheets
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState<string>('');
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [activeSheet, setActiveSheet] = useState<string>('');
  const [rawSheetRows, setRawSheetRows] = useState<string[][]>([]);

  // Filter folders matching import language
  const compatibleFolders = useMemo(() => {
    return folders.filter((f) => !f.language || f.language === importLanguage);
  }, [folders, importLanguage]);

  // Folder selection
  const [targetType, setTargetType] = useState<'existing' | 'new'>('existing');
  const [targetFolderId, setTargetFolderId] = useState<number | null>(() => {
    if (activeFolderId) {
      const f = folders.find((item) => item.id === activeFolderId);
      if (f && (!f.language || f.language === importLanguage)) return activeFolderId;
    }
    return compatibleFolders[0]?.id ?? null;
  });
  const [newFolderName, setNewFolderName] = useState('');

  // Column mapping
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({
    word: 0,
    meaning: 1,
    partOfSpeech: -1,
    reading: -1,
    ipa: -1,
    pinyin: -1,
    kana: -1,
    romaji: -1,
    romaja: -1,
    thaiReading: -1,
    example: -1,
    exampleTranslation: -1,
    synonyms: -1,
    antonyms: -1,
    folder: -1,
    notes: -1,
  });

  // Parsed rows
  const [parsedRows, setParsedRows] = useState<ParsedExcelRow[]>([]);
  const [duplicateStrategy, setDuplicateStrategy] = useState<'skip' | 'update' | 'keep_both'>('skip');

  const handleUpdateRow = (idx: number, field: keyof ParsedExcelRow, value: any) => {
    setParsedRows((prev) => {
      const next = [...prev];
      if (next[idx]) {
        next[idx] = { ...next[idx], [field]: value };
        if (field === 'word') {
          const valid = Boolean(value && String(value).trim());
          next[idx].isValid = valid;
          next[idx].validationError = valid ? undefined : 'Thiếu từ / cụm từ (bắt buộc)';
        }
      }
      return next;
    });
  };


  // AI Options
  const [autoEnrich, setAutoEnrich] = useState(true);
  const [aiSuggestMeaning, setAiSuggestMeaning] = useState(true);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [aiProgress, setAiProgress] = useState<{ current: number; total: number } | null>(null);

  // Import Execution
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    added: number;
    updated: number;
    skipped: number;
    errors: Array<{ row: number; word: string; error: string }>;
  } | null>(null);

  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const activeFolder = useMemo(() => {
    return folders.find((f) => f.id === activeFolderId) || null;
  }, [folders, activeFolderId]);

  useEffect(() => {
    if (isOpen) {
      const folder = folders.find((f) => f.id === activeFolderId);
      const chosenLang = (folder?.language as SupportedLanguage) || currentLanguage || 'en';
      setImportLanguage(chosenLang);
      if (activeFolderId && folder) {
        setTargetType('existing');
        setTargetFolderId(activeFolderId);
      } else {
        const comp = folders.filter((f) => !f.language || f.language === chosenLang);
        setTargetFolderId(comp[0]?.id ?? null);
      }
      setStep('upload');
      setSelectedFile(null);
      setError(null);
      setImportResult(null);
    }
  }, [isOpen, activeFolderId, folders, currentLanguage]);

  const langInfo = getLanguageInfo(importLanguage);

  // 1. Handle File Upload
  const handleFileChange = async (file: File) => {
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      setError('Vui lòng chọn file Excel có định dạng .xlsx hoặc .xls');
      return;
    }

    setError(null);
    setSelectedFile(file);

    try {
      const data = await readExcelFile(file);
      if (!data.sheetNames || data.sheetNames.length === 0) {
        setError('File Excel không có sheet dữ liệu nào.');
        return;
      }

      setSheetNames(data.sheetNames);
      const firstSheet = data.sheetNames[0];
      setActiveSheet(firstSheet);
      processSheetData(data.sheets[firstSheet]);
      setStep('configure');
    } catch (err: any) {
      setError(err.message || 'Lỗi khi đọc file Excel');
    }
  };

  const handlePasteProcess = async () => {
    if (!pastedText.trim()) {
      setError('Vui lòng nhập hoặc dán văn bản.');
      return;
    }
    setError(null);
    try {
      const { parsePastedText } = await import('@/lib/textParser');
      const rows = parsePastedText(pastedText);
      if (rows.length === 0) {
        setError('Không tìm thấy từ vựng nào trong văn bản.');
        return;
      }
      setSheetNames(['Văn bản dán']);
      setActiveSheet('Văn bản dán');
      processSheetData(rows);
      setStep('configure');
    } catch (err: any) {
      setError(err.message || 'Lỗi khi xử lý văn bản dán.');
    }
  };

  const processSheetData = (rows: string[][]) => {
    setRawSheetRows(rows);
    if (!rows || rows.length === 0) {
      setHeaders([]);
      setParsedRows([]);
      return;
    }

    if (mode === 'paste') {
      // In paste mode, we assume no header by default unless it's a markdown table
      // Let's generate generic headers
      const maxCols = Math.max(...rows.map(r => r.length));
      const pasteHeaders = Array.from({ length: maxCols }, (_, i) => {
        if (i === 0) return 'Từ vựng (Word)';
        if (i === 1) return 'Nghĩa (Meaning)';
        if (i === 2) return 'Từ loại (POS)';
        if (i === 3) return 'Đồng nghĩa (Synonyms)';
        return `Cột ${i + 1}`;
      });
      setHeaders(pasteHeaders);
      
      const defaultMapping: ColumnMapping = {
        word: 0,
        meaning: maxCols > 1 ? 1 : -1,
        partOfSpeech: maxCols > 2 ? 2 : -1,
        reading: -1,
        ipa: -1,
        pinyin: -1,
        kana: -1,
        romaji: -1,
        romaja: -1,
        thaiReading: -1,
        example: -1,
        exampleTranslation: -1,
        synonyms: maxCols > 3 ? 3 : -1,
        antonyms: -1,
        folder: -1,
        notes: -1,
      };
      setMapping(defaultMapping);
      const parsed = parseRowsWithMapping(rows, defaultMapping, false); // false = no header in rows
      setParsedRows(parsed);
      return;
    }

    const firstRowHeaders = rows[0] || [];
    setHeaders(firstRowHeaders);

    // Auto-detect columns for Excel
    const detected = autoDetectColumns(firstRowHeaders);
    setMapping(detected);

    // Generate initial parsed rows (true = has header)
    const parsed = parseRowsWithMapping(rows, detected, true);
    setParsedRows(parsed);
  };

  const handleSheetSwitch = (sheetName: string) => {
    if (!selectedFile) return;
    setActiveSheet(sheetName);
    readExcelFile(selectedFile).then((data) => {
      processSheetData(data.sheets[sheetName]);
    });
  };

  const handleMappingChange = (field: keyof ColumnMapping, columnIndex: number) => {
    const updated = { ...mapping, [field]: columnIndex };
    setMapping(updated);
    const parsed = parseRowsWithMapping(rawSheetRows, updated, true);
    setParsedRows(parsed);
  };

  // 2. AI Enrichment & Meaning Suggestions
  const runAiEnrichmentAndSuggestions = async () => {
    setIsAiProcessing(true);
    setError(null);

    const rowsCopy = [...parsedRows];
    const total = rowsCopy.length;
    setAiProgress({ current: 0, total });

    // Process in batches of 20 for responsive progress
    const batchSize = 20;
    for (let i = 0; i < rowsCopy.length; i += batchSize) {
      const slice = rowsCopy.slice(i, i + batchSize);
      const itemsToEnrich = slice.map((r) => ({
        word: r.word,
        meaning: r.meaning,
        example: r.example,
      }));

      try {
        const enriched = await myVocabApi.enrichBatch(itemsToEnrich, importLanguage);
        enriched.forEach((res) => {
          const rowIdx = i + res.index;
          if (rowsCopy[rowIdx]) {
            const current = rowsCopy[rowIdx];
            // Enrich POS if missing
            if (autoEnrich && (!current.partOfSpeech || current.partOfSpeech === 'khác') && res.partOfSpeech) {
              current.partOfSpeech = res.partOfSpeech;
              current.isPosEnriched = true;
            }
            // Enrich Synonyms if missing
            if (autoEnrich && current.synonyms.length === 0 && res.synonyms && res.synonyms.length > 0) {
              current.synonyms = res.synonyms;
              current.isSynonymsEnriched = true;
            }
            // Enrich Antonyms if missing
            if (autoEnrich && current.antonyms.length === 0 && res.antonyms && res.antonyms.length > 0) {
              current.antonyms = res.antonyms;
              current.isAntonymsEnriched = true;
            }
            // Enrich Language-specific reading
            if (autoEnrich) {
              if (res.ipa && !current.ipa) current.ipa = res.ipa;
              if (res.pinyin && !current.pinyin) current.pinyin = res.pinyin;
              if (res.kana && !current.kana) current.kana = res.kana;
              if (res.romaji && !current.romaji) current.romaji = res.romaji;
              if (res.romaja && !current.romaja) current.romaja = res.romaja;
              if (res.thaiReading && !current.thaiReading) current.thaiReading = res.thaiReading;
              if (res.reading && !current.reading) current.reading = res.reading;
              current.isReadingEnriched = true;
            }
            // AI Suggest Meaning if missing and enabled
            if (aiSuggestMeaning && !current.meaning && res.meaning) {
              current.meaning = res.meaning;
              current.isMeaningEnriched = true;
              current.isValid = true;
              current.validationError = undefined;
            }
            // Example and example translation if missing
            if (autoEnrich) {
              if (!current.example && res.example) {
                current.example = res.example;
                current.isExampleEnriched = true;
              }
              if (!current.exampleTranslation && res.exampleTranslation) {
                current.exampleTranslation = res.exampleTranslation;
              }
            }
          }
        });
      } catch (e) {
        // Continue even if one batch fails
      }

      setAiProgress({ current: Math.min(i + batchSize, total), total });
    }

    setParsedRows(rowsCopy);
    setIsAiProcessing(false);
    setAiProgress(null);
  };

  // 3. Confirm and Execute Import
  const handleConfirmImport = async () => {
    const validRows = parsedRows.filter((r) => r.isValid && r.word.trim());
    if (validRows.length === 0) {
      setError('Không có dòng từ vựng hợp lệ nào để nhập.');
      return;
    }

    if (targetType === 'new' && !newFolderName.trim()) {
      setError('Vui lòng nhập tên cho thư mục mới.');
      return;
    }

    setIsImporting(true);
    setError(null);

    try {
      const payload = {
        folderId: targetType === 'existing' ? targetFolderId : null,
        newFolderName: targetType === 'new' ? newFolderName.trim() : undefined,
        language: importLanguage,
        duplicateStrategy,
        items: validRows.map((r) => ({
          word: r.word,
          meaning: r.meaning,
          partOfSpeech: r.partOfSpeech,
          reading: r.reading,
          ipa: r.ipa,
          pinyin: r.pinyin,
          kana: r.kana,
          romaji: r.romaji,
          romaja: r.romaja,
          thaiReading: r.thaiReading,
          synonyms: r.synonyms,
          antonyms: r.antonyms,
          example: r.example,
          exampleTranslation: r.exampleTranslation,
          notes: r.notes,
          folderName: r.folderName || (targetType === 'new' ? newFolderName.trim() : undefined),
        })),

      };

      const result = await myVocabApi.bulkImport(payload);
      setImportResult(result);
      setStep('done');
      onSuccess({
        folderId: result.folderId ?? null,
        count: result.added + result.updated,
      });
    } catch (err: any) {
      setError(err.message || 'Lỗi khi nhập dữ liệu vào database.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <ModalDialog isOpen={isOpen} onClose={onClose} maxWidth="max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-5 border-b border-[var(--border)] shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">{mode === 'excel' ? '📊' : '📋'}</span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base md:text-lg font-bold text-[var(--text-primary)]">
                  {mode === 'excel' ? 'Nhập từ vựng từ Excel' : 'Dán danh sách từ vựng'}
                </h2>
                <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">
                  {langInfo.flag} {langInfo.name}
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)]">
                {mode === 'excel'
                  ? `Hỗ trợ file .xlsx, .xls • Tự động nhận diện cột và bổ sung bằng AI cho ${langInfo.name}`
                  : `Hỗ trợ dán văn bản nhiều dòng hoặc bảng Markdown • Tự động bổ sung bằng AI cho ${langInfo.name}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => downloadSampleExcelTemplate(importLanguage)}
              className="px-2.5 py-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--bg-subtle)] text-xs font-semibold text-[var(--text-secondary)] flex items-center gap-1.5 transition-all"
              title={`Tải file mẫu ${langInfo.name} chuẩn`}
            >
              <span>📥</span>
              <span className="hidden sm:inline">File mẫu {langInfo.name}</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Modal Content depending on Step */}
        <div className="p-4 md:p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="text-xs p-3 rounded-xl bg-rose-500/10 text-rose-600 border border-rose-500/20 font-medium">
              {error}
            </div>
          )}

          {/* STEP 1: Upload File & Language Selector */}
          {step === 'upload' && (
            <div className="space-y-4 py-2">
              {/* Active Folder Direct Import Banner */}
              {activeFolder && (
                <div className="p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/40 text-indigo-700 dark:text-indigo-300 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">📂</span>
                    <div>
                      <span className="font-bold text-sm block text-[var(--text-primary)]">
                        Nhập trực tiếp vào thư mục: {activeFolder.name}
                      </span>
                      <span className="text-[11px] text-[var(--text-muted)]">
                        Ngôn ngữ: {langInfo.name} ({langInfo.flag}) • Hiện có {activeFolder.wordCount} từ
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">
                    Đang mở
                  </span>
                </div>
              )}

              {/* Language Selector in Upload step */}
              {!activeFolder && (
                <div className="p-3.5 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border)] space-y-2">
                  <label className="block text-xs font-bold text-[var(--text-primary)]">
                    1. Chọn ngôn ngữ học của dữ liệu này:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {LANGUAGE_LIST.map((l) => (
                      <button
                        key={l.code}
                        type="button"
                        onClick={() => {
                          setImportLanguage(l.code);
                          // Reset target folder to a compatible one
                          const comp = folders.filter((f) => !f.language || f.language === l.code);
                          setTargetFolderId(comp[0]?.id ?? null);
                        }}
                        className={`px-2.5 py-2 rounded-xl text-xs font-semibold border flex items-center gap-2 transition-all cursor-pointer ${
                          importLanguage === l.code
                            ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold shadow-2xs'
                            : 'border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        <span className="text-base leading-none">{l.flag}</span>
                        <span className="truncate">{l.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Upload Box or Paste Box */}
              {mode === 'excel' ? (
                <>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-[var(--border)] hover:border-indigo-500 rounded-2xl p-8 md:p-12 cursor-pointer transition-all hover:bg-indigo-500/5 group flex flex-col items-center justify-center space-y-3"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
                      📗
                    </div>
                    <div className="space-y-1 text-center">
                      <p className="text-sm md:text-base font-bold text-[var(--text-primary)]">
                        Kéo thả file Excel vào đây hoặc click để chọn file
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">
                        Nhập từ vựng cho <strong className="text-indigo-600 dark:text-indigo-400 font-bold">{langInfo.name}</strong> • Hỗ trợ .xlsx hoặc .xls
                      </p>
                    </div>
                    <button
                      type="button"
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 cursor-pointer"
                    >
                      Chọn file từ máy
                    </button>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx, .xls"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileChange(file);
                    }}
                  />

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3 text-xs text-[var(--text-muted)]">
                    <span>Chưa có file mẫu cho {langInfo.name}?</span>
                    <button
                      onClick={() => downloadSampleExcelTemplate(importLanguage)}
                      className="text-indigo-600 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <span>⬇️</span>
                      <span>Tải file Excel mẫu {langInfo.name} (.xlsx)</span>
                    </button>
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="border border-[var(--border)] rounded-2xl bg-[var(--bg-card)] overflow-hidden focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
                    <textarea
                      autoFocus
                      value={pastedText}
                      onChange={(e) => setPastedText(e.target.value)}
                      placeholder={`Dán danh sách từ vựng vào đây...

Ví dụ 1 (Từng dòng):
ladder = stepladder (n) thang xếp
climbing (v) đang leo

Ví dụ 2 (Bảng Markdown):
| Từ vựng | Phân loại | Nghĩa |
| ladder | n | thang xếp |
| climbing | v | đang leo |`}
                      className="w-full h-64 p-4 text-sm bg-transparent outline-none resize-none font-mono"
                      spellCheck="false"
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={handlePasteProcess}
                      disabled={!pastedText.trim()}
                      className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer ${
                        pastedText.trim()
                          ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20 active:scale-95'
                          : 'bg-[var(--bg-subtle)] text-[var(--text-muted)]'
                      }`}
                    >
                      <span>Phân tích</span>
                      <span>➡️</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Configure & Mapping */}
          {step === 'configure' && (
            <div className="space-y-5">
              {/* Sheet & Target Folder bar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)]">
                {/* Sheet Selector */}
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                    Chọn trang tính (Sheet)
                  </label>
                  <Select
                    value={activeSheet}
                    onChange={(val) => handleSheetSwitch(val)}
                    options={sheetNames.map((name) => ({
                      value: name,
                      label: `📄 ${name}`
                    }))}
                    className="w-full text-xs md:text-sm font-medium"
                  />
                </div>

                {/* Target Folder */}
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                    Lưu vào thư mục nào? ({langInfo.name})
                  </label>
                  <div className="flex items-center gap-2 mb-2">
                    <button
                      type="button"
                      onClick={() => setTargetType('existing')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        targetType === 'existing'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--border)]'
                      }`}
                    >
                      Thư mục hiện có
                    </button>
                    <button
                      type="button"
                      onClick={() => setTargetType('new')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        targetType === 'new'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--border)]'
                      }`}
                    >
                      + Tạo thư mục mới
                    </button>
                  </div>

                  {targetType === 'existing' ? (
                    <Select
                      value={targetFolderId ?? ''}
                      onChange={(val) => setTargetFolderId(val ? Number(val) : null)}
                      options={[
                        { value: '', label: '📁 Danh sách chung (Chưa phân loại)' },
                        ...compatibleFolders.map((f) => ({
                          value: f.id,
                          label: `📁 ${f.name} (${f.wordCount} từ)`
                        }))
                      ]}
                      className="w-full text-xs md:text-sm font-medium"
                    />
                  ) : (
                    <input
                      type="text"
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      placeholder={`Nhập tên thư mục mới (ví dụ: Từ mới ${langInfo.name})...`}
                      className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-primary)] text-xs md:text-sm font-medium focus:ring-2 focus:ring-indigo-500/30"
                    />
                  )}
                </div>
              </div>

              {/* Column Mapping Selectors */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
                    Ánh xạ cột dữ liệu ({langInfo.name})
                  </h3>
                  <span className="text-[11px] text-[var(--text-muted)]">
                    Khớp {parsedRows.length} dòng
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                  {/* Word Mapping */}
                  <div className="p-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] space-y-1">
                    <span className="font-bold text-[var(--text-primary)] text-[11px]">
                      {langInfo.wordLabel} <span className="text-rose-500">*</span>
                    </span>
                    <Select
                      value={mapping.word}
                      onChange={(val) => handleMappingChange('word', Number(val))}
                      options={[
                        { value: -1, label: '-- Bỏ qua --' },
                        ...headers.map((h, i) => ({
                          value: i,
                          label: `Cột ${i + 1}: ${h || `Cột ${i + 1}`}`
                        }))
                      ]}
                      className="w-full text-xs"
                    />
                  </div>

                  {/* Meaning Mapping */}
                  <div className="p-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] space-y-1">
                    <span className="font-bold text-[var(--text-primary)] text-[11px]">
                      Nghĩa tiếng Việt
                    </span>
                    <Select
                      value={mapping.meaning}
                      onChange={(val) => handleMappingChange('meaning', Number(val))}
                      options={[
                        { value: -1, label: '-- Bỏ qua --' },
                        ...headers.map((h, i) => ({
                          value: i,
                          label: `Cột ${i + 1}: ${h || `Cột ${i + 1}`}`
                        }))
                      ]}
                      className="w-full text-xs"
                    />
                  </div>

                  {/* Language-Specific Reading Columns */}
                  {importLanguage === 'zh' && (
                    <div className="p-2.5 rounded-xl border border-indigo-200 dark:border-indigo-800/40 bg-indigo-50/50 dark:bg-indigo-950/20 space-y-1">
                      <span className="font-bold text-indigo-700 dark:text-indigo-300 text-[11px]">
                        Phiên âm Pinyin
                      </span>
                      <Select
                      value={mapping.pinyin}
                      onChange={(val) => handleMappingChange('pinyin', Number(val))}
                      options={[
                        { value: -1, label: '-- Bỏ qua --' },
                        ...headers.map((h, i) => ({
                          value: i,
                          label: `Cột ${i + 1}: ${h || `Cột ${i + 1}`}`
                        }))
                      ]}
                      className="w-full text-xs"
                    />
                    </div>
                  )}

                  {importLanguage === 'ja' && (
                    <>
                      <div className="p-2.5 rounded-xl border border-indigo-200 dark:border-indigo-800/40 bg-indigo-50/50 dark:bg-indigo-950/20 space-y-1">
                        <span className="font-bold text-indigo-700 dark:text-indigo-300 text-[11px]">
                          Cách đọc Kana
                        </span>
                        <Select
                      value={mapping.kana}
                      onChange={(val) => handleMappingChange('kana', Number(val))}
                      options={[
                        { value: -1, label: '-- Bỏ qua --' },
                        ...headers.map((h, i) => ({
                          value: i,
                          label: `Cột ${i + 1}: ${h || `Cột ${i + 1}`}`
                        }))
                      ]}
                      className="w-full text-xs"
                    />
                      </div>
                      <div className="p-2.5 rounded-xl border border-indigo-200 dark:border-indigo-800/40 bg-indigo-50/50 dark:bg-indigo-950/20 space-y-1">
                        <span className="font-bold text-indigo-700 dark:text-indigo-300 text-[11px]">
                          Phiên âm Romaji
                        </span>
                        <Select
                      value={mapping.romaji}
                      onChange={(val) => handleMappingChange('romaji', Number(val))}
                      options={[
                        { value: -1, label: '-- Bỏ qua --' },
                        ...headers.map((h, i) => ({
                          value: i,
                          label: `Cột ${i + 1}: ${h || `Cột ${i + 1}`}`
                        }))
                      ]}
                      className="w-full text-xs"
                    />
                      </div>
                    </>
                  )}

                  {importLanguage === 'ko' && (
                    <div className="p-2.5 rounded-xl border border-indigo-200 dark:border-indigo-800/40 bg-indigo-50/50 dark:bg-indigo-950/20 space-y-1">
                      <span className="font-bold text-indigo-700 dark:text-indigo-300 text-[11px]">
                        Phiên âm Romaja
                      </span>
                      <Select
                      value={mapping.romaja}
                      onChange={(val) => handleMappingChange('romaja', Number(val))}
                      options={[
                        { value: -1, label: '-- Bỏ qua --' },
                        ...headers.map((h, i) => ({
                          value: i,
                          label: `Cột ${i + 1}: ${h || `Cột ${i + 1}`}`
                        }))
                      ]}
                      className="w-full text-xs"
                    />
                    </div>
                  )}

                  {importLanguage === 'th' && (
                    <div className="p-2.5 rounded-xl border border-indigo-200 dark:border-indigo-800/40 bg-indigo-50/50 dark:bg-indigo-950/20 space-y-1">
                      <span className="font-bold text-indigo-700 dark:text-indigo-300 text-[11px]">
                        Cách đọc tiếng Thái
                      </span>
                      <Select
                      value={mapping.thaiReading}
                      onChange={(val) => handleMappingChange('thaiReading', Number(val))}
                      options={[
                        { value: -1, label: '-- Bỏ qua --' },
                        ...headers.map((h, i) => ({
                          value: i,
                          label: `Cột ${i + 1}: ${h || `Cột ${i + 1}`}`
                        }))
                      ]}
                      className="w-full text-xs"
                    />
                    </div>
                  )}

                  {importLanguage === 'en' && (
                    <div className="p-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] space-y-1">
                      <span className="font-bold text-[var(--text-primary)] text-[11px]">
                        Phiên âm IPA
                      </span>
                      <Select
                      value={mapping.ipa}
                      onChange={(val) => handleMappingChange('ipa', Number(val))}
                      options={[
                        { value: -1, label: '-- Bỏ qua --' },
                        ...headers.map((h, i) => ({
                          value: i,
                          label: `Cột ${i + 1}: ${h || `Cột ${i + 1}`}`
                        }))
                      ]}
                      className="w-full text-xs"
                    />
                    </div>
                  )}

                  {/* General Reading */}
                  <div className="p-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] space-y-1">
                    <span className="font-bold text-[var(--text-primary)] text-[11px]">
                      Cách đọc chung (Reading)
                    </span>
                    <Select
                      value={mapping.reading}
                      onChange={(val) => handleMappingChange('reading', Number(val))}
                      options={[
                        { value: -1, label: '-- Bỏ qua --' },
                        ...headers.map((h, i) => ({
                          value: i,
                          label: `Cột ${i + 1}: ${h || `Cột ${i + 1}`}`
                        }))
                      ]}
                      className="w-full text-xs"
                    />
                  </div>

                  {/* POS Mapping */}
                  <div className="p-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] space-y-1">
                    <span className="font-bold text-[var(--text-primary)] text-[11px]">
                      Từ loại (POS)
                    </span>
                    <Select
                      value={mapping.partOfSpeech}
                      onChange={(val) => handleMappingChange('partOfSpeech', Number(val))}
                      options={[
                        { value: -1, label: '-- Bỏ qua --' },
                        ...headers.map((h, i) => ({
                          value: i,
                          label: `Cột ${i + 1}: ${h || `Cột ${i + 1}`}`
                        }))
                      ]}
                      className="w-full text-xs"
                    />
                  </div>

                  {/* Example */}
                  <div className="p-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] space-y-1">
                    <span className="font-bold text-[var(--text-primary)] text-[11px]">
                      Câu ví dụ
                    </span>
                    <Select
                      value={mapping.example}
                      onChange={(val) => handleMappingChange('example', Number(val))}
                      options={[
                        { value: -1, label: '-- Bỏ qua --' },
                        ...headers.map((h, i) => ({
                          value: i,
                          label: `Cột ${i + 1}: ${h || `Cột ${i + 1}`}`
                        }))
                      ]}
                      className="w-full text-xs"
                    />
                  </div>

                  {/* Example Translation */}
                  <div className="p-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] space-y-1">
                    <span className="font-bold text-[var(--text-primary)] text-[11px]">
                      Bản dịch ví dụ
                    </span>
                    <Select
                      value={mapping.exampleTranslation}
                      onChange={(val) => handleMappingChange('exampleTranslation', Number(val))}
                      options={[
                        { value: -1, label: '-- Bỏ qua --' },
                        ...headers.map((h, i) => ({
                          value: i,
                          label: `Cột ${i + 1}: ${h || `Cột ${i + 1}`}`
                        }))
                      ]}
                      className="w-full text-xs"
                    />
                  </div>

                  {/* Synonyms */}
                  <div className="p-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] space-y-1">
                    <span className="font-bold text-[var(--text-primary)] text-[11px]">
                      Đồng nghĩa
                    </span>
                    <Select
                      value={mapping.synonyms}
                      onChange={(val) => handleMappingChange('synonyms', Number(val))}
                      options={[
                        { value: -1, label: '-- Bỏ qua --' },
                        ...headers.map((h, i) => ({
                          value: i,
                          label: `Cột ${i + 1}: ${h || `Cột ${i + 1}`}`
                        }))
                      ]}
                      className="w-full text-xs"
                    />
                  </div>

                  {/* Antonyms */}
                  <div className="p-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] space-y-1">
                    <span className="font-bold text-[var(--text-primary)] text-[11px]">
                      Trái nghĩa
                    </span>
                    <Select
                      value={mapping.antonyms}
                      onChange={(val) => handleMappingChange('antonyms', Number(val))}
                      options={[
                        { value: -1, label: '-- Bỏ qua --' },
                        ...headers.map((h, i) => ({
                          value: i,
                          label: `Cột ${i + 1}: ${h || `Cột ${i + 1}`}`
                        }))
                      ]}
                      className="w-full text-xs"
                    />
                  </div>

                  {/* Notes */}
                  <div className="p-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] space-y-1">
                    <span className="font-bold text-[var(--text-primary)] text-[11px]">
                      Ghi chú
                    </span>
                    <Select
                      value={mapping.notes}
                      onChange={(val) => handleMappingChange('notes', Number(val))}
                      options={[
                        { value: -1, label: '-- Bỏ qua --' },
                        ...headers.map((h, i) => ({
                          value: i,
                          label: `Cột ${i + 1}: ${h || `Cột ${i + 1}`}`
                        }))
                      ]}
                      className="w-full text-xs"
                    />
                  </div>

                  {/* Folder */}
                  <div className="p-2.5 rounded-xl border border-indigo-200 dark:border-indigo-800/40 bg-indigo-50/50 dark:bg-indigo-950/20 space-y-1">
                    <span className="font-bold text-indigo-700 dark:text-indigo-300 text-[11px]">
                      📁 Cột Thư mục (nếu có)
                    </span>
                    <Select
                      value={mapping.folder}
                      onChange={(val) => handleMappingChange('folder', Number(val))}
                      options={[
                        { value: -1, label: '-- Dùng thư mục chọn ở trên --' },
                        ...headers.map((h, i) => ({
                          value: i,
                          label: `Cột ${i + 1}: ${h || `Cột ${i + 1}`}`
                        }))
                      ]}
                      className="w-full text-xs"
                    />
                  </div>
                </div>
              </div>


              {/* Advanced AI & Duplicate Strategy Options */}
              <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] space-y-3">
                <h4 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
                  Tùy chọn xử lý & Bổ sung thông minh
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* AI Auto-enrich toggle */}
                  <label className="flex items-start gap-2.5 p-2.5 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border)] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoEnrich}
                      onChange={(e) => setAutoEnrich(e.target.checked)}
                      className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <div className="text-xs space-y-0.5">
                      <span className="font-bold text-[var(--text-primary)] flex items-center gap-1">
                        <span>✨</span>
                        <span>Tự bổ sung từ loại, đồng nghĩa, trái nghĩa còn thiếu</span>
                      </span>
                      <p className="text-[11px] text-[var(--text-muted)]">
                        Sử dụng từ điển AI backend, không ghi đè dữ liệu có sẵn trong Excel.
                      </p>
                    </div>
                  </label>

                  {/* AI Suggest Meaning toggle */}
                  <label className="flex items-start gap-2.5 p-2.5 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border)] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={aiSuggestMeaning}
                      onChange={(e) => setAiSuggestMeaning(e.target.checked)}
                      className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <div className="text-xs space-y-0.5">
                      <span className="font-bold text-[var(--text-primary)] flex items-center gap-1">
                        <span>🤖</span>
                        <span>AI gợi ý nghĩa tiếng Việt cho các hàng thiếu nghĩa</span>
                      </span>
                      <p className="text-[11px] text-[var(--text-muted)]">
                        Tự động tra cứu và điền nghĩa tiếng Việt nếu ô trong file Excel bị để trống.
                      </p>
                    </div>
                  </label>
                </div>

                {/* Duplicate Word Handling Strategy */}
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                    Xử lý khi từ đã tồn tại trong thư mục:
                  </label>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {[
                      { id: 'skip', label: 'Bỏ qua từ trùng (Giữ nguyên từ cũ)' },
                      { id: 'update', label: 'Cập nhật nội dung mới từ Excel' },
                      { id: 'keep_both', label: 'Giữ cả hai (Lưu thêm bản ghi mới)' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setDuplicateStrategy(opt.id as any)}
                        className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                          duplicateStrategy === opt.id
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] border border-[var(--border)]'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Progress bar during AI processing */}
              {isAiProcessing && aiProgress && (
                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-600 space-y-1.5">
                  <div className="flex items-center justify-between font-bold">
                    <span>⚡ AI đang tra cứu và bổ sung dữ liệu...</span>
                    <span>
                      {aiProgress.current} / {aiProgress.total} từ
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-blue-200 dark:bg-blue-900 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full transition-all duration-300"
                      style={{ width: `${(aiProgress.current / aiProgress.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep('upload')}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
                >
                  ← Chọn file khác
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (autoEnrich || aiSuggestMeaning) {
                      await runAiEnrichmentAndSuggestions();
                    }
                    setStep('preview');
                  }}
                  disabled={isAiProcessing}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 transition-all flex items-center gap-2"
                >
                  {isAiProcessing ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Đang xử lý AI...</span>
                    </>
                  ) : (
                    <span>Xem trước bảng dữ liệu →</span>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Live Preview Table */}
          {step === 'preview' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h3 className="font-bold text-sm text-[var(--text-primary)]">
                    Bảng xem trước dữ liệu ({parsedRows.length} từ)
                  </h3>
                  <p className="text-xs text-[var(--text-muted)]">
                    Kiểm tra và xác nhận trước khi lưu vào cơ sở dữ liệu.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-semibold border border-emerald-500/20">
                    Hợp lệ: {parsedRows.filter((r) => r.isValid).length}
                  </span>
                  {parsedRows.some((r) => !r.isValid) && (
                    <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-600 font-semibold border border-rose-500/20">
                      Lỗi: {parsedRows.filter((r) => !r.isValid).length}
                    </span>
                  )}
                </div>
              </div>

              {/* Table Container */}
              <div className="border border-[var(--border)] rounded-xl overflow-x-auto max-h-80">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[var(--bg-subtle)] text-[var(--text-secondary)] font-bold sticky top-0 z-10 border-b border-[var(--border)]">
                    <tr>
                      <th className="p-2.5 w-10 text-center">#</th>
                      <th className="p-2.5 min-w-[140px]">Từ / cụm từ ({langInfo.name})</th>
                      <th className="p-2.5 min-w-[100px]">Từ loại</th>
                      <th className="p-2.5 min-w-[150px]">Nghĩa tiếng Việt</th>
                      <th className="p-2.5 min-w-[120px]">Đồng nghĩa</th>
                      <th className="p-2.5 min-w-[120px]">Trái nghĩa</th>
                      <th className="p-2.5 min-w-[140px]">Thư mục</th>
                      <th className="p-2.5 min-w-[110px]">{langInfo.readingLabel}</th>
                      <th className="p-2.5 min-w-[180px]">Ví dụ & Dịch</th>
                      <th className="p-2.5 min-w-[90px] text-center">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {parsedRows.map((row, idx) => {
                      const readingVal = getPrimaryReading(row);
                      return (
                        <tr
                          key={idx}
                          className={`hover:bg-[var(--bg-subtle)] transition-colors ${
                            !row.isValid ? 'bg-rose-500/5' : ''
                          }`}
                        >
                          <td className="p-2 text-center text-[var(--text-muted)] font-mono text-[11px]">
                            {row.rowNumber}
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={row.word}
                              onChange={(e) => handleUpdateRow(idx, 'word', e.target.value)}
                              placeholder="Nhập từ..."
                              className="w-full px-2 py-1 rounded-md border border-[var(--border)] bg-[var(--bg-card)] font-bold text-[var(--text-primary)] text-xs focus:ring-1 focus:ring-indigo-500"
                            />
                            <div className="flex items-center gap-1 mt-1 flex-wrap">
                              {row.isSeparatedFromCell && (
                                <span
                                  className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20"
                                  title={`Tách từ: "${row.rawWordOriginal}"`}
                                >
                                  ✨ Tách từ ô
                                </span>
                              )}
                              {row.needsReview && (
                                <span
                                  className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-500/10 text-rose-600 border border-rose-500/20"
                                  title={row.reviewReason}
                                >
                                  ⚠️ Cần kiểm tra
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-2">
                            <select
                              value={row.partOfSpeech || 'khác'}
                              onChange={(e) => handleUpdateRow(idx, 'partOfSpeech', e.target.value)}
                              className="w-full px-2 py-1 rounded-md border border-[var(--border)] bg-[var(--bg-card)] text-xs text-[var(--text-primary)]"
                            >
                              <option value="noun">noun (danh từ)</option>
                              <option value="verb">verb (động từ)</option>
                              <option value="adjective">adjective (tính từ)</option>
                              <option value="adverb">adverb (trạng từ)</option>
                              <option value="preposition">preposition (giới từ)</option>
                              <option value="pronoun">pronoun (đại từ)</option>
                              <option value="conjunction">conjunction (liên từ)</option>
                              <option value="interjection">interjection (thán từ)</option>
                              <option value="phrase">phrase (cụm từ)</option>
                              <option value="khác">khác</option>
                            </select>
                            {row.isPosEnriched && (
                              <span className="text-[9px] text-indigo-500 font-bold block mt-0.5">⚡ AI</span>
                            )}
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={row.meaning}
                              onChange={(e) => handleUpdateRow(idx, 'meaning', e.target.value)}
                              placeholder="Nghĩa tiếng Việt..."
                              className="w-full px-2 py-1 rounded-md border border-[var(--border)] bg-[var(--bg-card)] text-xs text-[var(--text-secondary)] focus:ring-1 focus:ring-indigo-500"
                            />
                            {row.isMeaningEnriched && (
                              <span className="text-[9px] text-indigo-500 font-bold block mt-0.5">⚡ AI</span>
                            )}
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={row.synonyms.join(', ')}
                              onChange={(e) =>
                                handleUpdateRow(
                                  idx,
                                  'synonyms',
                                  e.target.value
                                    .split(/[,;\n\r，、]+/)
                                    .map((s) => s.trim())
                                    .filter(Boolean),
                                )
                              }
                              placeholder="Đồng nghĩa..."
                              className="w-full px-2 py-1 rounded-md border border-[var(--border)] bg-[var(--bg-card)] text-xs text-[var(--text-muted)]"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={row.antonyms.join(', ')}
                              onChange={(e) =>
                                handleUpdateRow(
                                  idx,
                                  'antonyms',
                                  e.target.value
                                    .split(/[,;\n\r，、]+/)
                                    .map((s) => s.trim())
                                    .filter(Boolean),
                                )
                              }
                              placeholder="Trái nghĩa..."
                              className="w-full px-2 py-1 rounded-md border border-[var(--border)] bg-[var(--bg-card)] text-xs text-[var(--text-muted)]"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={row.folderName || ''}
                              onChange={(e) => handleUpdateRow(idx, 'folderName', e.target.value)}
                              placeholder={
                                targetType === 'existing'
                                  ? (compatibleFolders.find((f) => f.id === targetFolderId)?.name || 'Chưa phân loại')
                                  : (newFolderName || 'Chưa phân loại')
                              }
                              className="w-full px-2 py-1 rounded-md border border-[var(--border)] bg-[var(--bg-card)] text-xs text-indigo-600 dark:text-indigo-400 font-medium"
                              title="Tên thư mục liên kết (giữ nguyên kể cả có dấu phẩy)"
                            />
                          </td>
                          <td className="p-2 font-mono text-[var(--text-muted)] text-[11px]">
                            {readingVal || '—'}
                            {row.isReadingEnriched && <span className="text-indigo-500 ml-1">⚡</span>}
                          </td>
                          <td className="p-2 text-[var(--text-secondary)]">
                            {row.example ? (
                              <div className="space-y-0.5">
                                <p className="italic font-sans text-[11px]">"{row.example}"</p>
                                {row.exampleTranslation && (
                                  <p className="text-[10px] text-[var(--text-muted)]">↳ {row.exampleTranslation}</p>
                                )}
                              </div>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="p-2 text-center">
                            {row.isValid ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                                Sẵn sàng
                              </span>
                            ) : (
                              <span
                                className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 border border-rose-500/20"
                                title={row.validationError}
                              >
                                Lỗi dữ liệu
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>


              {/* Bottom bar */}
              <div className="flex items-center justify-between pt-3 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setStep('configure')}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
                >
                  ← Điều chỉnh lại cột
                </button>
                <button
                  type="button"
                  onClick={handleConfirmImport}
                  disabled={isImporting}
                  className="px-6 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 transition-all flex items-center gap-2"
                >
                  {isImporting ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Đang lưu vào database...</span>
                    </>
                  ) : (
                    <span>Xác nhận & Nhập ngay ({parsedRows.filter((r) => r.isValid).length} từ)</span>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Done / Summary */}
          {step === 'done' && importResult && (
            <div className="space-y-6 py-6 text-center animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center text-3xl mx-auto ring-8 ring-emerald-500/5">
                🎉
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-[var(--text-primary)]">
                  Nhập từ vựng thành công!
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  Dữ liệu đã được lưu an toàn vào tài khoản của bạn.
                </p>
              </div>

              {/* Summary Stats Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-lg mx-auto">
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <div className="text-[11px] font-bold text-emerald-600 uppercase">Đã thêm mới</div>
                  <div className="text-2xl font-black text-emerald-600 mt-0.5">{importResult.added}</div>
                </div>
                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                  <div className="text-[11px] font-bold text-blue-600 uppercase">Đã cập nhật</div>
                  <div className="text-2xl font-black text-blue-600 mt-0.5">{importResult.updated}</div>
                </div>
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <div className="text-[11px] font-bold text-amber-600 uppercase">Đã bỏ qua</div>
                  <div className="text-2xl font-black text-amber-600 mt-0.5">{importResult.skipped}</div>
                </div>
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
                  <div className="text-[11px] font-bold text-rose-600 uppercase">Hàng lỗi</div>
                  <div className="text-2xl font-black text-rose-600 mt-0.5">{importResult.errors.length}</div>
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 transition-all"
                >
                  Hoàn tất & Xem danh sách từ
                </button>
              </div>
            </div>
          )}
        </div>
    </ModalDialog>
  );
}
