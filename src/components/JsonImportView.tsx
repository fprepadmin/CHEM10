import React, { useState, useRef, useEffect } from 'react';
import { 
  FileCode, 
  Upload, 
  CheckCircle2, 
  AlertTriangle, 
  Trash2, 
  Edit3, 
  ArrowLeft, 
  Check, 
  RefreshCw, 
  Save, 
  Search, 
  X, 
  AlertCircle,
  Eye, 
  BookOpen, 
  Download, 
  Sparkles, 
  Copy, 
  Layers, 
  FileText, 
  Plus, 
  Image as ImageIcon, 
  Loader2, 
  ExternalLink,
  ChevronRight,
  Code2,
  ListOrdered,
  HelpCircle,
  Clipboard,
  Zap,
  CheckSquare,
  Sliders
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { questionService, questionSetService } from '../services/dbService';
import { uploadImageToCloudinary } from '../services/cloudinaryService';
import { CHEMISTRY_10_CURRICULUM, normalizeChapterId, getChapterTitle, getLessonTitle } from '../data/curriculum';
import { MathRenderer } from './MathRenderer';
import { 
  validateAndNormalizeQuestionBankJson, 
  validateAndNormalizeExamJson, 
  getAiPromptForQuestionBankJson, 
  getAiPromptForExamJson, 
  getSampleQuestionBankJson, 
  getSampleExamJson,
  detectJsonImportType,
  cleanJsonString,
  ParsedJsonQuestionItem,
  ParsedJsonBankResult,
  ParsedJsonExamResult
} from '../services/jsonImportService';
import { Question, QuestionType, CognitiveLevel } from '../types';

interface JsonImportViewProps {
  onNavigate: (tab: string, param?: any) => void;
  initialMode?: 'bank' | 'exam';
  initialChapterId?: string;
}

export const JsonImportView: React.FC<JsonImportViewProps> = ({ 
  onNavigate, 
  initialMode = 'bank',
  initialChapterId 
}) => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Main Mode: 'bank' (Ngân hàng câu hỏi) vs 'exam' (Đề thi / Khảo thí)
  const [importMode, setImportMode] = useState<'bank' | 'exam'>(initialMode);

  // Sub-step: 'input' vs 'preview' vs 'audit'
  const [step, setStep] = useState<'input' | 'preview' | 'audit'>('input');

  // Input method: 'paste' | 'file'
  const [inputMethod, setInputMethod] = useState<'paste' | 'file'>('paste');

  // JSON Text state
  const [jsonText, setJsonText] = useState<string>('');
  const [selectedFileName, setSelectedFileName] = useState<string>('');
  const [selectedFileSize, setSelectedFileSize] = useState<number>(0);
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);

  // Target Chapter for Bank import
  const [targetChapterId, setTargetChapterId] = useState<string>(initialChapterId || 'chuong-1');
  const [targetLessonId, setTargetLessonId] = useState<string>('');

  // Parsed Results
  const [parsedBankResult, setParsedBankResult] = useState<ParsedJsonBankResult | null>(null);
  const [parsedExamResult, setParsedExamResult] = useState<ParsedJsonExamResult | null>(null);
  const [rawQuestions, setRawQuestions] = useState<ParsedJsonQuestionItem[]>([]);

  // Exam Meta
  const [examTitle, setExamTitle] = useState<string>('');
  const [examDescription, setExamDescription] = useState<string>('');
  const [examDuration, setExamDuration] = useState<number>(45);
  const [examInstructions, setExamInstructions] = useState<string>('');

  // Selection & Filtering in Preview
  const [selectedTempIds, setSelectedTempIds] = useState<string[]>([]);
  const [previewFilter, setPreviewFilter] = useState<'ALL' | 'VALID' | 'INVALID'>('ALL');
  const [searchFilter, setSearchFilter] = useState<string>('');

  // Editing Question on the fly
  const [editingQuestion, setEditingQuestion] = useState<ParsedJsonQuestionItem | null>(null);
  const [uploadingImageFor, setUploadingImageFor] = useState<{ tempId: string; type: 'question' | 'explanation' | 'option'; optIdx?: number } | null>(null);

  // Modals & Prompts
  const [showAiPromptModal, setShowAiPromptModal] = useState<boolean>(false);
  const [copyFeedback, setCopyFeedback] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Audit Report
  const [auditReport, setAuditReport] = useState<{
    successCount: number;
    failedCount: number;
    createdSetId?: string;
    createdSetTitle?: string;
  } | null>(null);

  // Sync sample JSON on initial mode
  useEffect(() => {
    if (!jsonText) {
      setJsonText(importMode === 'bank' ? getSampleQuestionBankJson() : getSampleExamJson());
    }
  }, [importMode]);

  // Handle Mode Switch
  const handleSwitchMode = (mode: 'bank' | 'exam') => {
    setImportMode(mode);
    setStep('input');
    setJsonText(mode === 'bank' ? getSampleQuestionBankJson() : getSampleExamJson());
    setSelectedFileName('');
    setEditingQuestion(null);
  };

  // Common Parse & Set Questions function
  const parseAndSetQuestions = (text: string, mode: 'bank' | 'exam' = importMode) => {
    const cleaned = cleanJsonString(text);
    if (!cleaned) {
      alert('Nội dung JSON đang trống.');
      return;
    }

    if (mode === 'bank') {
      const result = validateAndNormalizeQuestionBankJson(cleaned, targetChapterId, targetLessonId);
      setParsedBankResult(result);
      setRawQuestions(result.questions);
      setSelectedTempIds(result.questions.map(q => q.tempId));
      if (result.chapterId) setTargetChapterId(result.chapterId);
      if (result.lessonId) setTargetLessonId(result.lessonId);
    } else {
      const result = validateAndNormalizeExamJson(cleaned, targetChapterId);
      setParsedExamResult(result);
      setRawQuestions(result.questions);
      setExamTitle(result.title);
      setExamDescription(result.description || '');
      setExamDuration(result.durationMinutes || 45);
      setExamInstructions(result.instructions || '');
      setSelectedTempIds(result.questions.map(q => q.tempId));
      if (result.chapterId) setTargetChapterId(result.chapterId);
    }

    setStep('preview');
  };

  // 1-Click: Paste from Clipboard & Preview immediately
  const handleQuickPasteAndPreview = async () => {
    try {
      const clipText = await navigator.clipboard.readText();
      if (!clipText || !clipText.trim()) {
        alert('Bộ nhớ tạm đang trống. Hãy sao chép mã JSON từ ChatGPT / Claude trước!');
        return;
      }
      const detected = detectJsonImportType(clipText);
      setImportMode(detected);
      setJsonText(clipText);
      parseAndSetQuestions(clipText, detected);
    } catch {
      alert('Trình duyệt chưa cấp quyền đọc bộ nhớ tạm. Bạn có thể nhấn Ctrl+V trực tiếp vào ô soạn thảo bên dưới.');
    }
  };

  // 1-Click: Load Sample & Preview immediately
  const handleQuickLoadSample = (modeToLoad: 'bank' | 'exam' = importMode) => {
    const sample = modeToLoad === 'bank' ? getSampleQuestionBankJson() : getSampleExamJson();
    setImportMode(modeToLoad);
    setJsonText(sample);
    parseAndSetQuestions(sample, modeToLoad);
  };

  // 1-Click: Fast Copy AI Prompt
  const handleQuickCopyPrompt = () => {
    const promptText = importMode === 'bank' ? getAiPromptForQuestionBankJson() : getAiPromptForExamJson();
    navigator.clipboard.writeText(promptText);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2500);
  };

  // Handle File Select
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFileName(file.name);
    setSelectedFileSize(file.size);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setJsonText(text);
        const detected = detectJsonImportType(text);
        if (detected !== importMode) setImportMode(detected);
        parseAndSetQuestions(text, detected);
      }
    };
    reader.readAsText(file, 'utf-8');
  };

  // Handle Drag and Drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.name.endsWith('.json') || file.type.includes('json'))) {
      setSelectedFileName(file.name);
      setSelectedFileSize(file.size);
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (text) {
          setJsonText(text);
          const detected = detectJsonImportType(text);
          if (detected !== importMode) setImportMode(detected);
          parseAndSetQuestions(text, detected);
        }
      };
      reader.readAsText(file, 'utf-8');
    }
  };

  // Trigger Validation & Go to Preview
  const handleParseAndPreview = () => {
    parseAndSetQuestions(jsonText, importMode);
  };

  // Filter questions in Preview
  const filteredQuestions = rawQuestions.filter(q => {
    if (previewFilter === 'VALID' && !q.isValid) return false;
    if (previewFilter === 'INVALID' && q.isValid) return false;
    if (searchFilter.trim()) {
      const term = searchFilter.toLowerCase();
      const matchContent = q.content.toLowerCase().includes(term);
      const matchExpl = (q.explanation || '').toLowerCase().includes(term);
      return matchContent || matchExpl;
    }
    return true;
  });

  // Toggle selection
  const handleToggleSelect = (tempId: string) => {
    setSelectedTempIds(prev => 
      prev.includes(tempId) ? prev.filter(id => id !== tempId) : [...prev, tempId]
    );
  };

  const handleSelectAll = () => {
    if (selectedTempIds.length === filteredQuestions.length) {
      setSelectedTempIds([]);
    } else {
      setSelectedTempIds(filteredQuestions.map(q => q.tempId));
    }
  };

  const handleSelectOnlyValid = () => {
    const validIds = rawQuestions.filter(q => q.isValid).map(q => q.tempId);
    setSelectedTempIds(validIds);
  };

  // Bulk update chapter for selected questions
  const handleBulkChangeChapter = (newChapterId: string) => {
    if (!newChapterId) return;
    setRawQuestions(prev => prev.map(q => {
      if (selectedTempIds.includes(q.tempId)) {
        return { ...q, chapterId: newChapterId };
      }
      return q;
    }));
  };

  // 1-Click apply chapter to ALL questions in the current import
  const handleApplyChapterToAll = (newChapterId: string) => {
    if (!newChapterId) return;
    setTargetChapterId(newChapterId);
    setRawQuestions(prev => prev.map(q => ({
      ...q,
      chapterId: newChapterId
    })));
  };

  // Change chapter for a single question
  const handleSingleQuestionChapterChange = (tempId: string, newChapterId: string) => {
    setRawQuestions(prev => prev.map(q => {
      if (q.tempId === tempId) {
        return { ...q, chapterId: newChapterId };
      }
      return q;
    }));
  };

  // Bulk update level for selected questions
  const handleBulkChangeLevel = (newLevel: CognitiveLevel) => {
    if (!newLevel) return;
    setRawQuestions(prev => prev.map(q => {
      if (selectedTempIds.includes(q.tempId)) {
        return { ...q, level: newLevel };
      }
      return q;
    }));
  };

  // Change level for a single question
  const handleSingleQuestionLevelChange = (tempId: string, newLevel: CognitiveLevel) => {
    setRawQuestions(prev => prev.map(q => {
      if (q.tempId === tempId) {
        return { ...q, level: newLevel };
      }
      return q;
    }));
  };

  // Image Upload Handler
  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>, tempId: string, targetType: 'question' | 'explanation' | 'option', optIdx?: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImageFor({ tempId, type: targetType, optIdx });
    try {
      const uploaded = await uploadImageToCloudinary(file);
      const imgUrl = uploaded.secureUrl || uploaded.url;

      setRawQuestions(prev => prev.map(q => {
        if (q.tempId !== tempId) return q;
        const updated = { ...q };
        if (targetType === 'question') {
          updated.imageUrl = imgUrl;
        } else if (targetType === 'explanation') {
          updated.explanationImageUrl = imgUrl;
        } else if (targetType === 'option' && optIdx !== undefined && updated.options[optIdx]) {
          updated.options[optIdx].imageUrl = imgUrl;
        }
        return updated;
      }));

      if (editingQuestion && editingQuestion.tempId === tempId) {
        setEditingQuestion(prev => {
          if (!prev) return null;
          const updated = { ...prev };
          if (targetType === 'question') updated.imageUrl = imgUrl;
          else if (targetType === 'explanation') updated.explanationImageUrl = imgUrl;
          else if (targetType === 'option' && optIdx !== undefined && updated.options[optIdx]) {
            updated.options[optIdx].imageUrl = imgUrl;
          }
          return updated;
        });
      }
    } catch (err: any) {
      alert(`Tải ảnh thất bại: ${err.message || 'Lỗi không xác định'}`);
    } finally {
      setUploadingImageFor(null);
    }
  };

  // Remove image
  const handleRemoveImage = (tempId: string, targetType: 'question' | 'explanation' | 'option', optIdx?: number) => {
    setRawQuestions(prev => prev.map(q => {
      if (q.tempId !== tempId) return q;
      const updated = { ...q };
      if (targetType === 'question') updated.imageUrl = '';
      else if (targetType === 'explanation') updated.explanationImageUrl = '';
      else if (targetType === 'option' && optIdx !== undefined && updated.options[optIdx]) {
        updated.options[optIdx].imageUrl = '';
      }
      return updated;
    }));
  };

  // Save changes from editing question
  const handleSaveEditedQuestion = (updated: ParsedJsonQuestionItem) => {
    setRawQuestions(prev => prev.map(q => q.tempId === updated.tempId ? updated : q));
    setEditingQuestion(null);
  };

  // Copy AI Prompt
  const handleCopyPrompt = () => {
    const promptText = importMode === 'bank' ? getAiPromptForQuestionBankJson() : getAiPromptForExamJson();
    navigator.clipboard.writeText(promptText);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2500);
  };

  // Download Sample JSON
  const handleDownloadSample = () => {
    const sampleData = importMode === 'bank' ? getSampleQuestionBankJson() : getSampleExamJson();
    const fileName = importMode === 'bank' ? 'sample_ngan_hang_cau_hoi.json' : 'sample_de_thi_khao_thi.json';
    const blob = new Blob([sampleData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  // SUBMIT IMPORT TO DATABASE
  const handleConfirmImport = async () => {
    const selectedQuestions = rawQuestions.filter(q => selectedTempIds.includes(q.tempId));
    if (selectedQuestions.length === 0) {
      alert('Vui lòng chọn ít nhất 1 câu hỏi để nạp.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (importMode === 'bank') {
        // Prepare questions for Question Bank
        const dbQuestions: Omit<Question, 'id'>[] = selectedQuestions.map(q => {
          const chapId = q.chapterId || targetChapterId;
          const lesId = q.lessonId || targetLessonId || 'bai-1';
          return {
            chapterId: chapId,
            chapterTitle: getChapterTitle(chapId),
            lessonId: lesId,
            lessonTitle: getLessonTitle(chapId, lesId) || 'Bài học',
            topic: getLessonTitle(chapId, lesId) || 'Chủ đề',
            content: q.content,
            imageUrl: q.imageUrl || undefined,
            type: q.type,
            level: q.level,
            options: q.options.map(o => ({
              id: o.id,
              text: o.text || o.statement || '',
              isCorrect: o.isCorrect,
              imageUrl: o.imageUrl || undefined
            })),
            correctAnswer: q.correctAnswer,
            explanation: q.explanation || undefined,
            grade: q.grade || 10,
            status: 'APPROVED' as const,
            createdBy: user?.displayName || user?.email || 'Teacher',
            creatorEmail: user?.email || '',
            createdAt: new Date().toISOString()
          };
        });

        const result = await questionService.bulkCreateQuestions(dbQuestions, undefined, {
          uid: user?.uid,
          email: user?.email,
          role: user?.role,
          displayName: user?.displayName
        });

        setAuditReport({
          successCount: result.added,
          failedCount: result.failed
        });
        setStep('audit');
      } else {
        const examChapter = targetChapterId || parsedExamResult?.chapterId || 'tong-hop';
        const dbQuestions: Question[] = selectedQuestions.map(q => {
          const chapId = q.chapterId || examChapter;
          const lesId = q.lessonId || 'bai-1';
          return {
            id: q.id || `q-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            chapterId: chapId,
            chapterTitle: getChapterTitle(chapId),
            lessonId: lesId,
            lessonTitle: getLessonTitle(chapId, lesId) || 'Bài học',
            topic: getLessonTitle(chapId, lesId) || 'Chủ đề',
            content: q.content,
            imageUrl: q.imageUrl || undefined,
            type: q.type,
            level: q.level,
            options: q.options.map(o => ({
              id: o.id,
              text: o.text || o.statement || '',
              isCorrect: o.isCorrect,
              imageUrl: o.imageUrl || undefined
            })),
            correctAnswer: q.correctAnswer,
            explanation: q.explanation || undefined,
            grade: q.grade || 10,
            status: 'APPROVED' as const,
            createdAt: new Date().toISOString()
          };
        });

        const createdSetId = await questionSetService.createSet({
          title: examTitle || 'Đề thi nhập từ JSON',
          description: examDescription || 'Đề kiểm tra Hóa học 10 nạp qua JSON',
          durationMinutes: examDuration || 45,
          chapterId: examChapter,
          questionIds: dbQuestions.map(q => q.id),
          questions: dbQuestions,
          totalScore: 10,
          allowReviewAnswers: true,
          isPublic: true,
          type: 'STANDALONE_WORD',
          createdBy: user?.displayName || user?.email || 'Teacher',
          creatorEmail: user?.email || '',
          createdAt: new Date().toISOString()
        });

        setAuditReport({
          successCount: dbQuestions.length,
          failedCount: 0,
          createdSetId: createdSetId,
          createdSetTitle: examTitle || 'Đề thi nhập từ JSON'
        });
        setStep('audit');
      }
    } catch (err: any) {
      alert(`Lỗi khi lưu dữ liệu: ${err.message || 'Lỗi hệ thống'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-24">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/95 backdrop-blur-md p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-600 via-sky-600 to-blue-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20 shrink-0">
            <FileCode className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Nạp Dữ Liệu Qua File JSON
              </h1>
              <span className="px-2 py-0.5 bg-cyan-50 text-cyan-800 border border-cyan-200 text-[10px] font-extrabold rounded-md uppercase">
                KaTeX / LaTeX
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Nhập nhanh câu hỏi vào Ngân hàng hoặc tạo Đề thi trọn vẹn với công thức Hóa học & hình ảnh
            </p>
          </div>
        </div>

        {/* Mode Selector Pill */}
        <div className="flex items-center gap-1.5 p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200 shrink-0">
          <button
            onClick={() => handleSwitchMode('bank')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              importMode === 'bank'
                ? 'bg-white text-cyan-800 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-cyan-600" />
            <span>Vào Ngân Hàng Câu Hỏi</span>
          </button>
          <button
            onClick={() => handleSwitchMode('exam')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              importMode === 'exam'
                ? 'bg-white text-blue-800 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-blue-600" />
            <span>Nạp Đề Thi / Khảo Thí</span>
          </button>
        </div>
      </div>

      {/* STEP 1: INPUT JSON & SETTINGS */}
      {step === 'input' && (
        <div className="space-y-6 animate-fade-in">
          {/* Quick Helper Banner */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-8 bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-600 rounded-3xl p-6 text-white shadow-md shadow-cyan-600/10 flex flex-col justify-between">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/15 backdrop-blur-md rounded-full text-[11px] font-bold uppercase tracking-wider mb-2.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Chuyển đổi tự động từ PDF / Word bằng AI</span>
                </div>
                <h2 className="text-lg sm:text-xl font-extrabold tracking-tight">
                  {importMode === 'bank' 
                    ? 'Bạn có tài liệu câu hỏi dạng PDF hoặc Word cần nạp vào Ngân hàng?'
                    : 'Bạn có file Đề thi / Đề kiểm tra PDF cần chuyển thành Đề thi trực tuyến?'
                  }
                </h2>
                <p className="text-xs text-cyan-50 mt-1.5 leading-relaxed font-normal max-w-2xl">
                  Sử dụng Prompt chuẩn của CHEM10 AI để chuyển đổi bất kì tài liệu PDF/ảnh nào thành định dạng JSON với đầy đủ KaTeX và hình ảnh.
                </p>
              </div>

              {/* 1-Click Action Bar */}
              <div className="flex flex-wrap items-center gap-2.5 mt-5">
                <button
                  onClick={handleQuickPasteAndPreview}
                  className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-full text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20 uppercase tracking-wide transition-all cursor-pointer hover:scale-[1.02]"
                  title="Tự động đọc mã JSON trong Clipboard và mở bản xem trước ngay"
                >
                  <Zap className="w-4 h-4 fill-slate-950" />
                  <span>1-Click: Dán & Xem trước ngay</span>
                </button>

                <button
                  onClick={() => setShowAiPromptModal(true)}
                  className="px-4 py-2.5 bg-white text-slate-900 hover:bg-slate-50 font-black rounded-full text-xs flex items-center gap-1.5 shadow-md uppercase tracking-wide transition-all cursor-pointer hover:scale-[1.02]"
                >
                  <Sparkles className="w-3.5 h-3.5 text-cyan-600" />
                  <span>Xem Prompt AI PDF $\rightarrow$ JSON</span>
                </button>

                <button
                  onClick={handleQuickCopyPrompt}
                  className="px-4 py-2.5 bg-white/20 hover:bg-white/30 text-white font-bold rounded-full text-xs flex items-center gap-1.5 border border-white/30 uppercase tracking-wide transition-all cursor-pointer"
                >
                  {copyFeedback ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-300" />
                      <span>Đã chép Prompt!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Sao chép Prompt AI</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => handleQuickLoadSample(importMode)}
                  className="px-4 py-2.5 bg-white/20 hover:bg-white/30 text-white font-bold rounded-full text-xs flex items-center gap-1.5 border border-white/30 uppercase tracking-wide transition-all cursor-pointer"
                  title="Tải dữ liệu mẫu vào xem trước ngay để thử nghiệm"
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>Thử dữ liệu mẫu</span>
                </button>

                <button
                  onClick={handleDownloadSample}
                  className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-full text-xs flex items-center gap-1.5 border border-white/20 transition-all cursor-pointer"
                  title="Tải file .json mẫu về máy tính"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Tải file .json</span>
                </button>
              </div>
            </div>

            <div className="md:col-span-4 bg-white/95 backdrop-blur-md p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  <HelpCircle className="w-4 h-4 text-cyan-600" />
                  <span>Chuẩn Hóa KaTeX / LaTeX</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  Hệ thống tự động biên dịch công thức hóa học và toán học khi bọc trong cặp dấu <code className="px-1.5 py-0.5 bg-slate-100 rounded text-cyan-700 font-bold">$...$</code>.
                </p>
                <div className="mt-3 p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs space-y-1 font-mono">
                  <div className="text-slate-500 text-[11px]">{"$H_2SO_4 + 2NaOH$"}</div>
                  <div className="text-slate-500 text-[11px]">{"$\\Delta_r H^0_{298} = -890.3 \\text{ kJ}$"}</div>
                  <div className="text-slate-500 text-[11px]">{"$Fe^{3+} + 3e \\rightarrow Fe$"}</div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {importMode === 'bank' ? 'Chương áp dụng mặc định:' : 'Chương học / Phân loại đề thi:'}
                </label>
                <select
                  value={targetChapterId}
                  onChange={(e) => {
                    const newChap = e.target.value;
                    setTargetChapterId(newChap);
                    if (rawQuestions.length > 0) {
                      setRawQuestions(prev => prev.map(q => ({ ...q, chapterId: q.chapterId || newChap })));
                    }
                  }}
                  className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-cyan-500 outline-none cursor-pointer"
                >
                  {CHEMISTRY_10_CURRICULUM.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                  <option value="tong-hop">Đề thi Tổng hợp / Khảo thí toàn diện</option>
                </select>
              </div>
            </div>
          </div>

          {/* JSON Input Container with Drag & Drop */}
          <div 
            onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true); }}
            onDragLeave={() => setIsDraggingOver(false)}
            onDrop={handleDrop}
            className={`bg-white/95 backdrop-blur-md p-6 rounded-3xl border transition-all space-y-4 ${
              isDraggingOver ? 'border-cyan-500 ring-4 ring-cyan-100 bg-cyan-50/30' : 'border-slate-200/80 shadow-sm'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setInputMethod('paste')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    inputMethod === 'paste'
                      ? 'bg-cyan-50 text-cyan-800 border border-cyan-200'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Dán mã JSON trực tiếp
                </button>
                <button
                  onClick={() => setInputMethod('file')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    inputMethod === 'file'
                      ? 'bg-cyan-50 text-cyan-800 border border-cyan-200'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Tải file .json từ máy
                </button>
                <button
                  onClick={handleQuickPasteAndPreview}
                  className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Zap className="w-3.5 h-3.5 fill-amber-600 text-amber-600" />
                  <span>Dán từ Clipboard</span>
                </button>
              </div>

              <div className="text-xs text-slate-400 font-semibold flex items-center gap-2">
                <span>Kéo thả file .json vào đây</span>
                <span>•</span>
                <span>{importMode === 'bank' ? 'Chế độ: Ngân hàng' : 'Chế độ: Đề thi'}</span>
              </div>
            </div>

            {inputMethod === 'file' ? (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-cyan-500 hover:bg-cyan-50/20 rounded-3xl p-8 text-center transition-all cursor-pointer space-y-3"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".json,application/json"
                  className="hidden"
                />
                <div className="w-12 h-12 bg-cyan-50 text-cyan-600 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    {selectedFileName ? `Đã chọn: ${selectedFileName}` : 'Nhấn hoặc Kéo thả file JSON (.json) vào đây'}
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {selectedFileSize ? `${(selectedFileSize / 1024).toFixed(1)} KB` : 'Hệ thống tự động phân tích cấu trúc câu hỏi'}
                  </p>
                </div>
              </div>
            ) : null}

            <div>
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1.5">
                <div className="flex items-center gap-2">
                  <span>Nội dung JSON ({importMode === 'bank' ? 'Question Bank' : 'Exam Set'}):</span>
                  <span className="text-[11px] text-slate-400 font-normal">
                    (Nhấn <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded text-[10px] font-mono text-slate-700">Ctrl + Enter</kbd> để kiểm tra nhanh)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleQuickLoadSample(importMode)}
                    className="text-cyan-600 hover:text-cyan-800 text-[11px] font-bold cursor-pointer"
                  >
                    Dán dữ liệu mẫu
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    onClick={() => setJsonText('')}
                    className="text-slate-400 hover:text-red-500 text-[11px] font-semibold cursor-pointer"
                  >
                    Xóa trắng
                  </button>
                </div>
              </div>
              <textarea
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                    e.preventDefault();
                    handleParseAndPreview();
                  }
                }}
                placeholder="Dán nội dung JSON vào đây hoặc kéo thả file .json..."
                rows={13}
                className="w-full p-4 bg-slate-900 text-cyan-300 font-mono text-xs rounded-2xl border border-slate-800 focus:border-cyan-400 outline-none leading-relaxed selection:bg-cyan-600"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="text-xs text-slate-500 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-600" />
                <span>Tự động làm sạch các thẻ AI markdown ````json ... ````</span>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  onClick={handleQuickPasteAndPreview}
                  className="px-5 py-3 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-full text-xs font-black shadow-md shadow-amber-400/20 uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer hover:scale-[1.02]"
                >
                  <Zap className="w-4 h-4 fill-slate-950" />
                  <span>Dán & Xem trước</span>
                </button>

                <button
                  onClick={handleParseAndPreview}
                  className="px-7 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white rounded-full text-xs font-bold shadow-md shadow-cyan-600/20 uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer hover:scale-[1.02]"
                >
                  <span>Kiểm Tra & Xem Trước (Preview)</span>
                  <ArrowLeft className="w-4 h-4 rotate-180" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: PREVIEW & INTERACTIVE EDITING */}
      {step === 'preview' && (
        <div className="space-y-6 animate-fade-in">
          {/* Top Control Bar */}
          <div className="bg-white/95 backdrop-blur-md p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setStep('input')}
                className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Chỉnh sửa JSON</span>
              </button>

              <div>
                <h3 className="text-base font-black text-slate-900">
                  {importMode === 'bank' ? 'Kiểm tra câu hỏi Ngân hàng' : `Đề thi: ${examTitle || 'Chưa đặt tên'}`}
                </h3>
                <p className="text-xs text-slate-500">
                  Phát hiện: <strong>{rawQuestions.length} câu hỏi</strong> • Đã chọn: <strong className="text-cyan-700">{selectedTempIds.length} câu</strong>
                </p>
              </div>
            </div>

            {/* Filter & Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              {importMode === 'bank' && (
                <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
                  <span className="font-bold text-slate-700 text-[11px] shrink-0">Áp vào chương:</span>
                  <select
                    value={targetChapterId}
                    onChange={(e) => handleApplyChapterToAll(e.target.value)}
                    className="bg-white px-2.5 py-1 rounded-lg border border-slate-300 text-xs font-bold text-cyan-800 outline-none cursor-pointer hover:border-cyan-500"
                  >
                    {CHEMISTRY_10_CURRICULUM.map(c => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                    <option value="tong-hop">Đề thi Tổng hợp / Toàn diện</option>
                  </select>
                </div>
              )}

              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
                <button
                  onClick={() => setPreviewFilter('ALL')}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    previewFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Tất cả ({rawQuestions.length})
                </button>
                <button
                  onClick={() => setPreviewFilter('VALID')}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    previewFilter === 'VALID' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Hợp lệ ({rawQuestions.filter(q => q.isValid).length})
                </button>
                <button
                  onClick={() => setPreviewFilter('INVALID')}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    previewFilter === 'INVALID' ? 'bg-white text-rose-700 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Lỗi ({rawQuestions.filter(q => !q.isValid).length})
                </button>
              </div>

              <button
                onClick={handleSelectOnlyValid}
                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200 transition-colors cursor-pointer"
                title="Chỉ chọn những câu đạt chuẩn"
              >
                Chỉ chọn câu hợp lệ
              </button>

              <button
                onClick={handleSelectAll}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                {selectedTempIds.length === filteredQuestions.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
              </button>

              <button
                onClick={handleConfirmImport}
                disabled={isSubmitting || selectedTempIds.length === 0}
                className="px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white text-xs font-bold rounded-full shadow-md shadow-cyan-600/20 uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 hover:scale-[1.02]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang lưu...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>{importMode === 'bank' ? `Lưu ${selectedTempIds.length} Câu Vào Ngân Hàng` : `Lưu & Tạo Đề Thi`}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Bulk Operations Toolbar */}
          {selectedTempIds.length > 0 && (
            <div className="bg-cyan-50/80 backdrop-blur-md p-4 rounded-3xl border border-cyan-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-cyan-900 font-bold">
                <Sliders className="w-4 h-4 text-cyan-600" />
                <span>Thao tác nhanh cho {selectedTempIds.length} câu đang chọn:</span>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Bulk Chapter */}
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-600 font-semibold text-[11px]">Gán Chương:</span>
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        handleBulkChangeChapter(e.target.value);
                        e.target.value = '';
                      }
                    }}
                    defaultValue=""
                    className="px-2.5 py-1.5 bg-white border border-cyan-300 rounded-xl text-xs font-semibold text-slate-800 outline-none cursor-pointer"
                  >
                    <option value="" disabled>-- Chọn chương áp dụng --</option>
                    {CHEMISTRY_10_CURRICULUM.map(c => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                  </select>
                </div>

                {/* Bulk Level */}
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-600 font-semibold text-[11px]">Gán Mức độ:</span>
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        handleBulkChangeLevel(e.target.value as CognitiveLevel);
                        e.target.value = '';
                      }
                    }}
                    defaultValue=""
                    className="px-2.5 py-1.5 bg-white border border-cyan-300 rounded-xl text-xs font-semibold text-slate-800 outline-none cursor-pointer"
                  >
                    <option value="" disabled>-- Chọn mức độ áp dụng --</option>
                    <option value="nhan_biet">Nhận biết</option>
                    <option value="thong_hieu">Thông hiểu</option>
                    <option value="van_dung">Vận dụng</option>
                    <option value="van_dung_cao">Vận dụng cao</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Exam Meta Editor if in Exam mode */}
          {importMode === 'exam' && (
            <div className="bg-white/95 backdrop-blur-md p-6 rounded-3xl border border-slate-200/80 shadow-xs grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Tên Đề thi / Khảo thí:</label>
                <input
                  type="text"
                  value={examTitle}
                  onChange={(e) => setExamTitle(e.target.value)}
                  placeholder="Nhập tên đề thi..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:border-cyan-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Chương học / Phân loại đề:</label>
                <select
                  value={targetChapterId}
                  onChange={(e) => {
                    const newChap = e.target.value;
                    setTargetChapterId(newChap);
                    setRawQuestions(prev => prev.map(q => ({ ...q, chapterId: newChap })));
                  }}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:border-cyan-500 outline-none cursor-pointer"
                >
                  {CHEMISTRY_10_CURRICULUM.map(c => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                  <option value="tong-hop">Đề thi Tổng hợp / Khảo thí toàn diện</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Thời gian làm bài (Phút):</label>
                <input
                  type="number"
                  value={examDuration}
                  onChange={(e) => setExamDuration(Number(e.target.value) || 15)}
                  min={0}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:border-cyan-500 outline-none"
                />
              </div>
            </div>
          )}

          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Tìm kiếm nội dung câu hỏi trong danh sách..."
              className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200/80 rounded-2xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:border-cyan-500 outline-none shadow-xs"
            />
          </div>

          {/* Question Cards Grid */}
          <div className="space-y-4">
            {filteredQuestions.map((q, idx) => {
              const isSelected = selectedTempIds.includes(q.tempId);
              const isUploadingThisQ = uploadingImageFor?.tempId === q.tempId;

              return (
                <div
                  key={q.tempId}
                  className={`p-6 rounded-3xl border transition-all ${
                    !q.isValid
                      ? 'bg-rose-50/40 border-rose-200'
                      : isSelected
                      ? 'bg-white border-cyan-300 shadow-md ring-1 ring-cyan-200'
                      : 'bg-white border-slate-200/80 shadow-xs'
                  }`}
                >
                  {/* Card Top Row */}
                  <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 flex-wrap">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(q.tempId)}
                        className="w-4 h-4 text-cyan-600 rounded cursor-pointer"
                      />
                      <span className="font-extrabold text-sm text-slate-900">
                        Câu {idx + 1}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                        {q.type === 'multiple_choice' ? 'Trắc nghiệm' : q.type === 'true_false' ? 'Đúng / Sai' : q.type === 'short_answer' ? 'Trả lời ngắn' : 'Tự luận'}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-cyan-50 text-cyan-700 border border-cyan-200">
                        {q.level === 'nhan_biet' ? 'Nhận biết' : q.level === 'thong_hieu' ? 'Thông hiểu' : q.level === 'van_dung' ? 'Vận dụng' : 'Vận dụng cao'}
                      </span>
                      
                      {/* Interactive Chapter Selector on Card */}
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-slate-400 font-semibold hidden sm:inline">Chương:</span>
                        <select
                          value={q.chapterId || targetChapterId}
                          onChange={(e) => handleSingleQuestionChapterChange(q.tempId, e.target.value)}
                          className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-50 hover:bg-white text-slate-700 border border-slate-200 hover:border-cyan-400 outline-none cursor-pointer"
                        >
                          {CHEMISTRY_10_CURRICULUM.map(c => (
                            <option key={c.id} value={c.id}>
                              {c.title}
                            </option>
                          ))}
                          <option value="tong-hop">Đề thi Tổng hợp</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setEditingQuestion(q)}
                        className="p-1.5 text-slate-400 hover:text-cyan-700 hover:bg-cyan-50 rounded-lg transition-colors cursor-pointer"
                        title="Chỉnh sửa câu hỏi"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Validation errors if any */}
                  {!q.isValid && q.validationErrors.length > 0 && (
                    <div className="mt-3 p-3 bg-rose-100/70 border border-rose-300 rounded-2xl text-xs text-rose-800 space-y-1">
                      {q.validationErrors.map((err, eIdx) => (
                        <div key={eIdx} className="flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                          <span>{err}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Question Content Rendered with KaTeX */}
                  <div className="mt-4 space-y-3">
                    <div className="text-sm font-semibold text-slate-900 leading-relaxed">
                      <MathRenderer content={q.content} />
                    </div>

                    {/* Question Image if uploaded */}
                    {q.imageUrl && (
                      <div className="relative inline-block border border-slate-200 rounded-2xl overflow-hidden shadow-xs bg-slate-50">
                        <img src={q.imageUrl} alt="Hình câu hỏi" className="max-h-48 object-contain rounded-xl" />
                        <button
                          onClick={() => handleRemoveImage(q.tempId, 'question')}
                          className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-full hover:bg-red-600 transition-colors"
                          title="Xóa ảnh"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    {/* Image Upload Trigger */}
                    {!q.imageUrl && (
                      <div>
                        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer transition-colors">
                          <ImageIcon className="w-3.5 h-3.5 text-cyan-600" />
                          <span>{isUploadingThisQ && uploadingImageFor?.type === 'question' ? 'Đang tải ảnh...' : 'Thêm ảnh minh họa cho câu hỏi'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleUploadImage(e, q.tempId, 'question')}
                          />
                        </label>
                      </div>
                    )}

                    {/* Options Rendered */}
                    {q.type === 'multiple_choice' ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                        {q.options.map((opt, oIdx) => {
                          const isCorrect = typeof q.correctAnswer === 'string'
                            ? q.correctAnswer === opt.id 
                            : Array.isArray(q.correctAnswer) && q.correctAnswer.includes(opt.id);

                          return (
                            <div
                              key={opt.id || oIdx}
                              className={`p-3 rounded-2xl border flex items-start gap-2.5 transition-all ${
                                isCorrect
                                  ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950 font-bold'
                                  : 'bg-slate-50/80 border-slate-200 text-slate-800'
                              }`}
                            >
                              <span className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 ${
                                isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                              }`}>
                                {opt.id}
                              </span>
                              <div className="flex-1 text-xs font-medium pt-0.5">
                                <MathRenderer content={opt.text || ''} />
                                {opt.imageUrl && (
                                  <img src={opt.imageUrl} alt="Option img" className="mt-1 max-h-24 rounded" />
                                )}
                              </div>
                              {isCorrect && <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />}
                            </div>
                          );
                        })}
                      </div>
                    ) : q.type === 'true_false' ? (
                      <div className="space-y-2 pt-2">
                        {q.options.map((opt, oIdx) => {
                          const ansVal = typeof q.correctAnswer === 'object' && q.correctAnswer !== null 
                            ? q.correctAnswer[opt.id] 
                            : opt.isCorrect;

                          return (
                            <div key={opt.id || oIdx} className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between text-xs">
                              <div className="flex items-start gap-2 font-medium">
                                <span className="font-bold text-slate-700 uppercase">({opt.id})</span>
                                <MathRenderer content={opt.statement || opt.text || ''} />
                              </div>
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                ansVal ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                              }`}>
                                {ansVal ? 'ĐÚNG' : 'SAI'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold">
                        <span className="text-slate-500">Đáp án chuẩn: </span>
                        <span className="text-emerald-700 font-bold">{String(q.correctAnswer)}</span>
                      </div>
                    )}

                    {/* Explanation */}
                    {q.explanation && (
                      <div className="mt-3 p-3.5 bg-cyan-50/60 border border-cyan-200/80 rounded-2xl text-xs text-slate-800 space-y-1">
                        <div className="font-bold text-cyan-800 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-cyan-600" />
                          <span>Hướng dẫn giải:</span>
                        </div>
                        <div className="text-slate-700 font-normal">
                          <MathRenderer content={q.explanation} />
                        </div>
                        {q.explanationImageUrl && (
                          <img src={q.explanationImageUrl} alt="Giải thích" className="mt-2 max-h-36 rounded-xl border border-cyan-200" />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sticky Floating Action Bar at Bottom */}
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/90 text-white backdrop-blur-md px-6 py-3.5 rounded-full shadow-2xl border border-slate-700/80 flex items-center gap-4 animate-slide-up max-w-[95vw]">
            <div className="flex items-center gap-2 text-xs">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-semibold text-slate-300 hidden sm:inline">Đã chọn:</span>
              <span className="font-black text-cyan-300">{selectedTempIds.length} / {rawQuestions.length} câu</span>
            </div>

            <div className="h-4 w-px bg-slate-700 hidden sm:block" />

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-full text-xs font-semibold transition-colors cursor-pointer hidden md:inline"
              >
                Lên đầu trang ↑
              </button>

              <button
                onClick={handleConfirmImport}
                disabled={isSubmitting || selectedTempIds.length === 0}
                className="px-5 py-2 bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-black rounded-full shadow-lg shadow-cyan-500/25 uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 hover:scale-[1.03]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang lưu...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    <span>{importMode === 'bank' ? `Lưu ${selectedTempIds.length} Câu Vào Ngân Hàng` : `Lưu & Tạo Đề Thi`}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: AUDIT SUCCESS REPORT */}
      {step === 'audit' && auditReport && (
        <div className="bg-white/95 backdrop-blur-md p-8 sm:p-10 rounded-3xl border border-slate-200/80 shadow-2xl max-w-2xl mx-auto text-center space-y-6 animate-fade-in">
          <div className="w-16 h-16 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-center mx-auto text-emerald-600 shadow-sm">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              {importMode === 'bank' ? 'Nạp Câu Hỏi Thành Công!' : 'Tạo Đề Thi Hoàn Tất!'}
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Đã xử lý và lưu trữ an toàn vào hệ thống CHEM10 AI
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 text-left">
            <div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Số câu đã lưu</div>
              <div className="text-2xl font-black text-emerald-600 mt-0.5">{auditReport.successCount} câu</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Đích đến</div>
              <div className="text-xs font-bold text-slate-800 mt-1 truncate">
                {importMode === 'bank' ? 'Ngân hàng câu hỏi' : (auditReport.createdSetTitle || 'Kho Đề thi')}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={() => {
                setStep('input');
                setAuditReport(null);
              }}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
            >
              Nạp thêm file khác
            </button>
            <button
              onClick={() => onNavigate(importMode === 'bank' ? 'question_bank' : 'exam_manager')}
              className="px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white rounded-full text-xs font-bold shadow-md shadow-cyan-600/20 uppercase tracking-wider transition-all cursor-pointer hover:scale-[1.02]"
            >
              {importMode === 'bank' ? 'Xem Ngân Hàng Câu Hỏi' : 'Xem Kho Đề Thi & Khảo Thí'}
            </button>
          </div>
        </div>
      )}

      {/* MODAL: AI PROMPT SYSTEM GUIDE */}
      {showAiPromptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-cyan-50 text-cyan-600 rounded-xl">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    System Prompt Chuyển Đổi PDF $\rightarrow$ JSON
                  </h3>
                  <p className="text-xs text-slate-500">
                    Dành cho {importMode === 'bank' ? 'Ngân hàng câu hỏi' : 'Đề thi / Khảo thí'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAiPromptModal(false)}
                className="p-1 text-slate-400 hover:text-slate-800 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1">
              <div className="p-4 bg-slate-900 text-cyan-300 font-mono text-xs rounded-2xl border border-slate-800 leading-relaxed whitespace-pre-wrap selection:bg-cyan-600">
                {importMode === 'bank' ? getAiPromptForQuestionBankJson() : getAiPromptForExamJson()}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100">
              <p className="text-[11px] text-slate-500">
                💡 Dán prompt này vào ChatGPT / Gemini kèm theo file PDF hoặc ảnh chụp đề thi.
              </p>
              <button
                onClick={handleCopyPrompt}
                className="px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white rounded-full text-xs font-bold shadow-md shadow-cyan-600/20 uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
              >
                {copyFeedback ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Đã sao chép!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Sao chép Prompt</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDIT QUESTION ON THE FLY */}
      {editingQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900">
                Chỉnh Sửa Câu Hỏi
              </h3>
              <button
                onClick={() => setEditingQuestion(null)}
                className="p-1 text-slate-400 hover:text-slate-800 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Chương học áp dụng:</label>
                  <select
                    value={editingQuestion.chapterId || targetChapterId}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, chapterId: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-cyan-500 outline-none text-xs font-semibold"
                  >
                    {CHEMISTRY_10_CURRICULUM.map(c => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                    <option value="tong-hop">Đề thi Tổng hợp</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mức độ nhận thức:</label>
                  <select
                    value={editingQuestion.level}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, level: e.target.value as CognitiveLevel })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-cyan-500 outline-none text-xs font-semibold"
                  >
                    <option value="nhan_biet">Nhận biết</option>
                    <option value="thong_hieu">Thông hiểu</option>
                    <option value="van_dung">Vận dụng</option>
                    <option value="van_dung_cao">Vận dụng cao</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Dạng câu hỏi:</label>
                  <select
                    value={editingQuestion.type}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, type: e.target.value as QuestionType })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-cyan-500 outline-none text-xs font-semibold"
                  >
                    <option value="multiple_choice">Trắc nghiệm 4 lựa chọn</option>
                    <option value="true_false">Đúng / Sai 4 ý</option>
                    <option value="short_answer">Điền khuyết / Trả lời ngắn</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nội dung câu hỏi (hỗ trợ $...$ LaTeX):</label>
                <textarea
                  value={editingQuestion.content}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, content: e.target.value })}
                  rows={4}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-cyan-500 outline-none text-xs font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Ảnh minh họa câu hỏi (URL hoặc Tải lên):</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editingQuestion.imageUrl || ''}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, imageUrl: e.target.value })}
                    placeholder="https://res.cloudinary.com/..."
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                  <label className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer shrink-0">
                    <Upload className="w-3.5 h-3.5 inline mr-1" />
                    <span>Tải ảnh</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleUploadImage(e, editingQuestion.tempId, 'question')}
                    />
                  </label>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Lời giải / Hướng dẫn giải (hỗ trợ $...$ LaTeX):</label>
                <textarea
                  value={editingQuestion.explanation || ''}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, explanation: e.target.value })}
                  rows={3}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-cyan-500 outline-none text-xs font-medium"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingQuestion(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-full text-xs font-bold"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => handleSaveEditedQuestion(editingQuestion)}
                className="px-5 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-full text-xs font-bold shadow-md shadow-cyan-600/20 uppercase"
              >
                Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
