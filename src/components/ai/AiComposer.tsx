import { forwardRef, useImperativeHandle, useState, useRef, useEffect } from 'react';
import { Send, Square, Paperclip, X, FileText, ChevronDown, Image as ImageIcon, AlertCircle, Archive, FileSpreadsheet, Folder, FolderUp } from 'lucide-react';
import type { DispatchDocument } from '../../types/dispatch';
import type { AiAttachment } from '../../types/ai';
import { convertFilesToAiAttachments, formatFileSize } from '../../lib/ai/fileToAttachment';
import { ATTACHMENT_INTENTS, intentsFor, type AttachmentIntentId } from '../../lib/ai/attachmentIntents';
import { checkFormTotal, formPairingProblem, isFormAttachment } from '../../lib/ai/formFiles';
import { fileToSpreadsheetAttachment, isSpreadsheetFile } from '../../lib/ai/spreadsheetText';
import { fileToWordAttachment, isDocxFile, isLegacyDocFile, legacyDocMessage } from '../../lib/ai/wordText';
import { fileToPlainTextAttachment, isPlainTextFile } from '../../lib/ai/plainText';
import { planFolderBundle, readableFiles, splitDroppedItems, type DroppedFolder } from '../../lib/officialDoc/folderBundle';
import { itemsFromFileList, type UploadItem } from '../../lib/uploadItems';

const FOLDER_INPUT_ATTRS = { webkitdirectory: '', directory: '' } as Record<string, string>;

interface AiComposerProps {
  /**
   * `intent` có khi người dùng chọn một việc với tệp (tóm tắt, đọc, thêm văn bản mới) thay vì tự gõ câu hỏi.
   * `formFiles` là bộ biểu mẫu (Word, Excel, ZIP...) đi kèm văn bản, chỉ dùng với việc thêm văn bản mới.
   * `appendices` là phụ lục (PDF, ảnh) của thư mục văn thư đã thả vào; AI chỉ đọc tệp chính, phụ lục chỉ được lưu.
   */
  onSend: (message: string, attachments?: AiAttachment[], intent?: AttachmentIntentId, formFiles?: File[], appendices?: File[]) => void;
  /** Hiện lựa chọn "Thêm văn bản mới" (tài khoản được thêm văn bản vào Văn thư). */
  canRecord?: boolean;
  onStop: () => void;
  isStreaming: boolean;
  attachedDoc: DispatchDocument | null;
  onRemoveAttachedDoc: () => void;
  availableDispatches?: DispatchDocument[];
  onSelectDispatch?: (doc: DispatchDocument) => void;
  placeholder?: string;
}

export interface AiComposerHandle {
  /** Thêm tệp (kéo thả từ ngoài vào) vào danh sách đính kèm; không gửi, chờ người dùng Enter. */
  addFiles: (files: File[]) => void;
  /** Tệp kèm đường dẫn (thả cả thư mục). Một thư mục là một văn bản: một tệp chính cùng các phụ lục. */
  addItems: (items: UploadItem[] | Promise<UploadItem[]>) => void;
}

export const AiComposer = forwardRef<AiComposerHandle, AiComposerProps>(function AiComposer({
  onSend,
  canRecord = false,
  onStop,
  isStreaming,
  attachedDoc,
  onRemoveAttachedDoc,
  availableDispatches = [],
  onSelectDispatch,
  placeholder = 'Nhập câu hỏi hoặc kéo thả tệp vào đây...',
}, ref) {
  const [text, setText] = useState('');
  const [showDocPicker, setShowDocPicker] = useState(false);
  const [attachments, setAttachments] = useState<AiAttachment[]>([]);
  const [forms, setForms] = useState<File[]>([]);
  // Bảng tính (Excel, CSV): AI đọc thành chữ để phân tích báo cáo tài chính; khi thêm văn bản mới thì thành biểu mẫu
  const [sheets, setSheets] = useState<File[]>([]);
  // Tệp Word (.docx) và tệp chữ thuần (XML, TXT, JSON...): AI đọc thành chữ như văn bản; khi thêm văn bản mới thì đi kèm làm biểu mẫu
  const [words, setWords] = useState<File[]>([]);
  // Thư mục văn thư đang đính kèm: tệp chính nằm ở `attachments` cho AI đọc, phần còn lại của PDF/ảnh là phụ lục chỉ để lưu
  const [folder, setFolder] = useState<{ name: string; readable: File[]; main: File } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isReadingFiles, setIsReadingFiles] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  // Tự động chỉnh độ cao textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [text]);

  /** Bảng tính và tệp Word đang đính kèm thành tệp chữ cho AI. Lỗi đọc được báo và dừng gửi, không lẳng lặng bỏ tệp. */
  const readTexts = async (which: { sheets: boolean; words: boolean }): Promise<AiAttachment[] | null> => {
    try {
      const reads = [...(which.sheets ? sheets.map((f) => fileToSpreadsheetAttachment(f)) : []), ...(which.words ? words.map((f) => (isDocxFile(f) ? fileToWordAttachment(f) : fileToPlainTextAttachment(f))) : [])];
      return await Promise.all(reads);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Không đọc được tệp đính kèm.');
      return null;
    }
  };

  const handleSend = async () => {
    const hasText = Boolean(text.trim());
    // Có tệp mà chưa gõ gì: phải chọn một việc ở dải lựa chọn, không tự gửi câu hỏi mặc định
    if (!hasText || isStreaming) return;
    // Biểu mẫu chỉ dùng được khi thêm văn bản mới; không lẳng lặng bỏ chúng khỏi câu hỏi
    if (forms.length > 0) {
      setUploadError('Biểu mẫu chỉ dùng với "Thêm văn bản mới". Gỡ biểu mẫu nếu muốn gửi câu hỏi.');
      return;
    }

    setIsReadingFiles(true);
    const sheetAtts = sheets.length + words.length > 0 ? await readTexts({ sheets: true, words: true }) : [];
    setIsReadingFiles(false);
    if (!sheetAtts) return;

    const msg = text;
    const all = [...attachments, ...sheetAtts];
    const atts = all.length > 0 ? all : undefined;
    setText('');
    setAttachments([]);
    setFolder(null);
    setSheets([]);
    setWords([]);
    setUploadError(null);
    if (atts) {
      onSend(msg, atts);
    } else {
      onSend(msg);
    }

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const processFileList = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    setIsReadingFiles(true);
    setUploadError(null);
    try {
      const sheetFiles = files.filter(isSpreadsheetFile);
      const wordFiles = files.filter((f) => isDocxFile(f) || isPlainTextFile(f));
      const legacyFiles = files.filter(isLegacyDocFile);
      const others = files.filter((f) => !sheetFiles.includes(f) && !wordFiles.includes(f) && !legacyFiles.includes(f));
      // Tệp AI không đọc được (ZIP...) chỉ thành biểu mẫu khi đang có văn bản PDF/ảnh để đi cùng; đứng một mình thì báo định dạng không hỗ trợ
      const hasDocument = attachments.length > 0 || others.some((f) => !isFormAttachment(f));
      const formFiles = canRecord && hasDocument ? others.filter(isFormAttachment) : [];
      const documentFiles = others.filter((f) => !formFiles.includes(f));
      const problems: string[] = legacyFiles.map((f) => legacyDocMessage(f.name));

      const sizeProblem = formFiles.length > 0 ? checkFormTotal([...forms, ...formFiles]) : null;
      const acceptedForms = sizeProblem ? [] : formFiles;
      if (sizeProblem) problems.push(sizeProblem);
      // Đọc xong tệp văn bản rồi mới cập nhật cùng lúc với biểu mẫu, để không nháy cảnh báo "thiếu văn bản"
      if (documentFiles.length > 0) {
        const { attachments: newAtts, errors } = await convertFilesToAiAttachments(documentFiles);
        if (newAtts.length > 0) {
          setAttachments((prev) => [...prev, ...newAtts]);
        }
        problems.push(...errors);
      }
      if (acceptedForms.length > 0) setForms((prev) => [...prev, ...acceptedForms]);
      if (sheetFiles.length > 0) setSheets((prev) => [...prev, ...sheetFiles]);
      if (wordFiles.length > 0) setWords((prev) => [...prev, ...wordFiles]);
      if (problems.length > 0) {
        setUploadError(problems.join('. '));
      }
    } catch (err: any) {
      setUploadError(err.message || 'Không thể đọc tệp tin.');
    } finally {
      setIsReadingFiles(false);
    }
  };

  const addFolder = async (dropped: DroppedFolder) => {
    const plan = planFolderBundle(dropped.name, dropped.files);
    if (!plan) {
      setUploadError(`Thư mục "${dropped.name}" không có PDF hoặc ảnh để làm văn bản chính.`);
      return;
    }
    if (folder || attachments.length > 0) {
      setUploadError('Gỡ văn bản đang đính kèm trước khi thêm thư mục.');
      return;
    }
    const sizeProblem = checkFormTotal([...forms, ...plan.appendices, ...plan.others]);
    if (sizeProblem) {
      setUploadError(sizeProblem);
      return;
    }
    setIsReadingFiles(true);
    setUploadError(null);
    try {
      const { attachments: read, errors } = await convertFilesToAiAttachments([plan.main]);
      if (read.length === 0) {
        setUploadError(errors.join('. '));
        return;
      }
      setAttachments(read);
      setFolder({ name: plan.name, readable: readableFiles(dropped.files), main: plan.main });
      if (plan.others.length > 0) await processFileList(plan.others);
    } finally {
      setIsReadingFiles(false);
    }
  };

  const processItems = async (source: UploadItem[] | Promise<UploadItem[]>) => {
    try {
      const items = await source;
      if (items.length === 0) return;
      const { folders, loose } = splitDroppedItems(items);
      // Chỉ tài khoản được thêm văn bản mới có khái niệm thư mục văn thư; các tài khoản khác nhận từng tệp như trước
      if (!canRecord || folders.length === 0) {
        await processFileList(items.map((i) => i.file));
        return;
      }
      if (folders.length > 1) {
        setUploadError('Mỗi lần chỉ thêm một thư mục văn thư. Thả từng thư mục một.');
        return;
      }
      await addFolder(folders[0]);
      if (loose.length > 0) await processFileList(loose);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Không đọc được thư mục.');
    }
  };

  const changeMain = async (index: number) => {
    const next = folder?.readable[index];
    if (!folder || !next || next === folder.main) return;
    setIsReadingFiles(true);
    try {
      const { attachments: read, errors } = await convertFilesToAiAttachments([next]);
      if (read.length === 0) {
        setUploadError(errors.join('. '));
        return;
      }
      setAttachments(read);
      setFolder({ ...folder, main: next });
      setUploadError(null);
    } finally {
      setIsReadingFiles(false);
    }
  };

  const removeFolder = () => {
    setFolder(null);
    setAttachments([]);
  };

  useImperativeHandle(ref, () => ({ addFiles: (files) => void processFileList(files), addItems: (items) => void processItems(items) }));

  const handleFolderInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) void processItems(itemsFromFileList(e.target.files));
    e.target.value = '';
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      void processFileList(e.target.files);
    }
    // Reset input để có thể chọn lại cùng 1 file nếu muốn
    e.target.value = '';
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData.items;
    const pastedFiles: File[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) pastedFiles.push(file);
      }
    }

    if (pastedFiles.length > 0) {
      e.preventDefault();
      void processFileList(pastedFiles);
    }
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
    // Bỏ tệp chính thì thư mục không còn ý nghĩa
    setFolder(null);
  };

  const canSend = Boolean(text.trim()) && !isStreaming && !isReadingFiles;
  // Phụ lục theo thứ tự tự nhiên của tên tệp
  const appendices = folder ? (planFolderBundle(folder.name, folder.readable, folder.main)?.appendices ?? []) : [];
  const pairingProblem = formPairingProblem(forms.length, attachments.length);

  const sendWithIntent = async (id: AttachmentIntentId) => {
    if (isStreaming || isReadingFiles || (attachments.length === 0 && sheets.length === 0 && words.length === 0) || pairingProblem) return;
    const prompt = ATTACHMENT_INTENTS.find((i) => i.id === id)?.prompt ?? '';
    const atts = [...attachments];
    // Thêm văn bản mới: bảng tính và Word là biểu mẫu của văn bản. Nhập hồ sơ tín dụng: chỉ Word là hồ sơ để đọc.
    // Các việc còn lại: bảng tính và Word là nội dung cho AI đọc
    const formFiles = id === 'record' ? [...forms, ...sheets, ...words] : [...forms];
    const readSheetsToo = id !== 'record' && id !== 'credit';
    const readWordsToo = id !== 'record';
    let sheetAtts: AiAttachment[] = [];
    if ((readSheetsToo && sheets.length > 0) || (readWordsToo && words.length > 0)) {
      setIsReadingFiles(true);
      const read = await readTexts({ sheets: readSheetsToo, words: readWordsToo });
      setIsReadingFiles(false);
      if (!read) return;
      sheetAtts = read;
    }
    setText('');
    setAttachments([]);
    setFolder(null);
    setForms([]);
    setSheets([]);
    setWords([]);
    setUploadError(null);
    onSend(prompt, [...atts, ...sheetAtts], id, formFiles, id === 'record' ? appendices : undefined);
  };

  // Có biểu mẫu thì chỉ còn việc thêm văn bản mới: tóm tắt hay đọc không dùng tới biểu mẫu
  const intents = intentsFor(canRecord, Boolean(text.trim() || forms.length > 0), { documents: attachments.length, words: words.length, sheets: sheets.length, forms: forms.length, appendices: appendices.length });

  return (
    <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
      {/* Thông báo lỗi khi upload */}
      {uploadError && (
        <div role="alert" className="mb-2 max-w-3xl mx-auto flex items-center justify-between p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{uploadError}</span>
          </div>
          <button
            type="button"
            onClick={() => setUploadError(null)}
            className="p-1 hover:text-rose-900 dark:hover:text-rose-100 cursor-pointer"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {pairingProblem && (
        <div role="alert" className="mb-2 max-w-3xl mx-auto flex items-center gap-1.5 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-300">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{pairingProblem}</span>
        </div>
      )}

      {/* Dải hiển thị tệp / hình ảnh đang đính kèm */}
      {(attachments.length > 0 || forms.length > 0 || sheets.length > 0 || words.length > 0) && (
        <div className="mb-2 max-w-3xl mx-auto flex flex-wrap gap-2">
          {folder && (
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs text-xs text-slate-800 dark:text-slate-200 max-w-md">
              <Folder className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium text-[11px]" title={folder.name}>{folder.name}</div>
                <div className="text-[10px] text-slate-400">{appendices.length} phụ lục</div>
              </div>
              {folder.readable.length > 1 && (
                <select
                  aria-label="Tệp văn bản chính"
                  value={folder.readable.indexOf(folder.main)}
                  onChange={(e) => void changeMain(Number(e.target.value))}
                  disabled={isReadingFiles}
                  className="max-w-44 text-[11px] rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-1 py-0.5"
                >
                  {folder.readable.map((f, i) => (
                    <option key={`${f.name}_${i}`} value={i}>{f.name}</option>
                  ))}
                </select>
              )}
              <button
                type="button"
                onClick={removeFolder}
                className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-md transition-colors cursor-pointer shrink-0"
                title="Gỡ thư mục"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
          {forms.map((form, i) => (
            <div
              key={`form_${form.name}_${i}`}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs text-xs text-slate-800 dark:text-slate-200 max-w-xs"
            >
              <Archive className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium text-[11px]" title={form.name}>{form.name}</div>
                <div className="text-[10px] text-slate-400 font-mono">{formatFileSize(form.size)}</div>
              </div>
              <button
                type="button"
                onClick={() => setForms((prev) => prev.filter((_, idx) => idx !== i))}
                className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-md transition-colors cursor-pointer shrink-0"
                title="Gỡ biểu mẫu"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          {words.map((word, i) => (
            <div
              key={`word_${word.name}_${i}`}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs text-xs text-slate-800 dark:text-slate-200 max-w-xs"
            >
              <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium text-[11px]" title={word.name}>{word.name}</div>
                <div className="text-[10px] text-slate-400 font-mono">{formatFileSize(word.size)}</div>
              </div>
              <button
                type="button"
                onClick={() => setWords((prev) => prev.filter((_, idx) => idx !== i))}
                className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-md transition-colors cursor-pointer shrink-0"
                title="Gỡ tệp Word"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          {sheets.map((sheet, i) => (
            <div
              key={`sheet_${sheet.name}_${i}`}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs text-xs text-slate-800 dark:text-slate-200 max-w-xs"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium text-[11px]" title={sheet.name}>{sheet.name}</div>
                <div className="text-[10px] text-slate-400 font-mono">{formatFileSize(sheet.size)}</div>
              </div>
              <button
                type="button"
                onClick={() => setSheets((prev) => prev.filter((_, idx) => idx !== i))}
                className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-md transition-colors cursor-pointer shrink-0"
                title="Gỡ bảng tính"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          {attachments.map((att) => (
            <div
              key={att.id}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs text-xs text-slate-800 dark:text-slate-200 max-w-xs group"
            >
              {att.mimeType.startsWith('image/') ? (
                att.previewUrl ? (
                  <img
                    src={att.previewUrl}
                    alt={att.name}
                    className="w-6 h-6 object-cover rounded-md border border-slate-200 dark:border-slate-700 shrink-0"
                  />
                ) : (
                  <ImageIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                )
              ) : (
                <FileText className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              )}

              <div className="min-w-0 flex-1">
                <div className="truncate font-medium text-[11px]" title={att.name}>
                  {att.name}
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  {formatFileSize(att.size)}
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleRemoveAttachment(att.id)}
                className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-md transition-colors cursor-pointer shrink-0"
                title="Gỡ tệp"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Chọn việc cần làm với tệp vừa đính kèm */}
      {(attachments.length > 0 || sheets.length > 0 || words.length > 0) && !pairingProblem && intents.length > 0 && (
        <div role="group" aria-label="Chọn việc cần làm với tệp" className="mb-2 max-w-3xl mx-auto flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-500 dark:text-slate-400">Bạn muốn làm gì với tệp này?</span>
          {intents.map((i) => (
            <button
              key={i.id}
              type="button"
              disabled={isStreaming || isReadingFiles}
              onClick={() => void sendWithIntent(i.id)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-medium hover:border-teal-600 hover:text-teal-800 dark:hover:text-teal-300 disabled:opacity-50 cursor-pointer"
            >
              {i.label}
            </button>
          ))}
        </div>
      )}

      {/* Khối hiển thị văn bản đang đính kèm từ kho */}
      {attachedDoc && (
        <div className="mb-2 max-w-3xl mx-auto flex items-center justify-between px-3 py-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/60 text-xs text-teal-800 dark:text-teal-300">
          <div className="flex items-center gap-2 truncate">
            <FileText className="w-3.5 h-3.5 shrink-0 text-teal-600 dark:text-teal-400" />
            <span className="font-semibold shrink-0">Hồ sơ kho:</span>
            <span className="truncate">{attachedDoc.title}</span>
            {attachedDoc.documentNumber && (
              <span className="px-1.5 py-0.2 rounded bg-teal-100 dark:bg-teal-900 text-[10px] font-mono text-teal-700 dark:text-teal-300 shrink-0">
                {attachedDoc.documentNumber}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onRemoveAttachedDoc}
            className="p-1 text-teal-600 hover:text-rose-600 rounded-md transition-colors cursor-pointer"
            title="Gỡ văn bản đính kèm"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Khung soạn thảo */}
      <div className="max-w-3xl mx-auto flex items-end gap-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-300 dark:border-slate-700 p-2 shadow-2xs focus-within:border-teal-600 dark:focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-500/20 relative">
        {/* Input file ẩn */}
        <input
          ref={fileInputRef}
          type="file"
          accept={canRecord ? undefined : 'image/*,application/pdf,.docx,.xlsx,.xls,.xlsm,.csv'}
          multiple
          className="hidden"
          onChange={handleFileInputChange}
          aria-label="Tải văn bản, ảnh hoặc biểu mẫu lên"
        />

        {/* Nút đính kèm hình ảnh / PDF từ máy tính */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isReadingFiles}
          className="p-2 text-slate-500 hover:text-teal-700 dark:hover:text-teal-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-50"
          title="Đính kèm hình ảnh hoặc file PDF để AI đọc và phân tích"
        >
          <Paperclip className="w-4 h-4" />
        </button>

        {canRecord && (
          <>
            <input
              ref={folderInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFolderInputChange}
              aria-label="Chọn thư mục văn thư để thêm"
              {...FOLDER_INPUT_ATTRS}
            />
            <button
              type="button"
              onClick={() => folderInputRef.current?.click()}
              disabled={isReadingFiles}
              className="p-2 text-slate-500 hover:text-teal-700 dark:hover:text-teal-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-50"
              title="Đính kèm cả thư mục văn thư: một tệp chính cùng các phụ lục"
            >
              <FolderUp className="w-4 h-4" />
            </button>
          </>
        )}

        {/* Nút đính kèm văn thư từ kho */}
        {availableDispatches.length > 0 && onSelectDispatch && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowDocPicker(!showDocPicker)}
              className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
              title="Đính kèm văn bản từ sổ văn thư"
            >
              <FileText className="w-4 h-4" />
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {/* Menu chọn văn bản */}
            {showDocPicker && (
              <div className="absolute bottom-full left-0 mb-2 w-80 max-h-60 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl z-50 p-1.5 text-xs">
                <div className="px-2 py-1 font-semibold text-slate-500 text-[11px] border-b border-slate-100 dark:border-slate-700 mb-1">
                  Chọn văn bản đính kèm:
                </div>
                {availableDispatches.map((doc) => (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => {
                      onSelectDispatch(doc);
                      setShowDocPicker(false);
                    }}
                    className="w-full text-left p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors flex items-start gap-2 cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 mt-0.5 text-slate-400 shrink-0" />
                    <div className="truncate">
                      <div className="font-medium text-slate-800 dark:text-slate-200 truncate">{doc.title}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">
                        {doc.documentNumber || 'Không có số'} • {doc.documentDate || 'N/A'}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <textarea
          ref={textareaRef}
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={placeholder}
          className="flex-1 max-h-32 min-h-[38px] bg-transparent border-none text-xs focus:outline-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400 px-2 py-2 resize-none leading-relaxed"
        />

        {isStreaming ? (
          <button
            type="button"
            onClick={onStop}
            className="p-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition-colors flex items-center justify-center shrink-0 cursor-pointer"
            title="Dừng phản hồi"
          >
            <Square className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={!canSend}
            className="p-2 bg-teal-700 hover:bg-teal-600 disabled:opacity-40 text-white rounded-lg transition-colors flex items-center justify-center shrink-0 cursor-pointer"
            title="Gửi tin nhắn"
          >
            <Send className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
});
