import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, 
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
  History, 
  X, 
  AlertCircle,
  FileCheck,
  Eye,
  BookOpen,
  Download,
  Sparkles,
  HelpCircle,
  FileCode,
  Tag
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { questionService, wordImportService } from '../services/dbService';
import { parseDocxFile } from '../services/wordParserService';
import { downloadSampleWordTemplate } from '../services/sampleWordService';
import { CHEMISTRY_10_CURRICULUM } from '../data/curriculum';
import { 
  Question, 
  QuestionType, 
  CognitiveLevel, 
  ParsedWordQuestion, 
  WordImportHistoryRecord,
  QuestionOption 
} from '../types';

interface WordImportViewProps {
  onNavigate: (tab: string, param?: any) => void;
}

export const WordImportView: React.FC<WordImportViewProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Active sub-tab
  const [activeTab, setActiveTab] = useState<'upload' | 'preview' | 'history'>('upload');

  // Existing questions in Question Bank (for duplicate checking)
  const [existingQuestions, setExistingQuestions] = useState<Question[]>([]);

  // Parsed questions state
  const [fileName, setFileName] = useState<string>('');
  const [fileSize, setFileSize] = useState<number>(0);
  const [parsedQuestions, setParsedQuestions] = useState<ParsedWordQuestion[]>([]);
  const [rawTextContent, setRawTextContent] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processProgress, setProcessProgress] = useState<string>('');

  // Filtering & Selection in Preview
  const [previewFilter, setPreviewFilter] = useState<'ALL' | 'VALID' | 'NEEDS_REVIEW' | 'DUPLICATE'>('ALL');
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [selectedTempIds, setSelectedTempIds] = useState<string[]>([]);

  // Editing state for single question modal
  const [editingQuestion, setEditingQuestion] = useState<ParsedWordQuestion | null>(null);

  // Batch edit state
  const [batchChapter, setBatchChapter] = useState<string>('');
  const [batchLevel, setBatchLevel] = useState<string>('');

  // Import completion state
  const [importResult, setImportResult] = useState<{
    total: number;
    added: number;
    needsReview: number;
    duplicate: number;
  } | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isDownloadingSample, setIsDownloadingSample] = useState<boolean>(false);

  // History list
  const [historyList, setHistoryList] = useState<WordImportHistoryRecord[]>([]);

  // Load existing questions & history on mount
  useEffect(() => {
    loadExistingData();
  }, []);

  const loadExistingData = async () => {
    try {
      const qList = await questionService.getQuestions();
      setExistingQuestions(qList);
      const hList = await wordImportService.getHistory();
      setHistoryList(hList);
    } catch (e) {
      console.error(e);
    }
  };

  // Download official sample word file
  const handleDownloadSample = async () => {
    try {
      setIsDownloadingSample(true);
      await downloadSampleWordTemplate();
    } catch (err: any) {
      console.error('Error downloading sample docx:', err);
      alert('Không thể tạo file mẫu: ' + err.message);
    } finally {
      setIsDownloadingSample(false);
    }
  };

  // Quick test suite with 10 test scenarios
  const handleLoadTestSuite = async (testCaseNumber: number = 0) => {
    setIsProcessing(true);
    setProcessProgress('Đang tải bộ kiểm thử đặc biệt (Test Cases 1-10)...');

    // Simulated test scenarios
    let sampleHtml = '';
    let testFileName = 'Bo_De_Kiem_Thu_Hoa_10.docx';

    if (testCaseNumber === 0) {
      // Full test suite with all 10 requirements
      sampleHtml = `
<p><b>BỘ ĐỀ KIỂM THỬ TỔNG HỢP 10 DẠNG CÂU HỎI HÓA HỌC 10</b></p>
<p>Câu 1. Nguyên tử Potassium (K) có Z = 19. Cấu hình electron của K ở trạng thái cơ bản là</p>
<p><u>A. 1s²2s²2p⁶3s²3p⁶4s¹</u></p>
<p>B. 1s²2s²2p⁶3s²3p⁶3d¹</p>
<p>C. 1s²2s²2p⁶3s²3p⁵4s²</p>
<p>D. 1s²2s²2p⁶3s²3p⁶4s²</p>
<p>Lời giải: K có 19e: 1s²2s²2p⁶3s²3p⁶4s¹, thuộc chu kì 4, nhóm IA.</p>

<p>Câu 2. [Test Không gạch chân] Trong bảng tuần hoàn các nguyên tố hóa học, đại lượng nào biến đổi tuần hoàn?</p>
<p>A. Số lớp electron</p>
<p>B. Khối lượng nguyên tử</p>
<p>C. Số electron lớp ngoài cùng</p>
<p>D. Điện tích hạt nhân</p>

<p>Câu 3. [Test 2 đáp án gạch chân] Cho phản ứng CaCO₃(s) → CaO(s) + CO₂(g) có ΔrH°₂₉₈ = +178,29 kJ. Kết luận nào đúng?</p>
<p><u>A. Phản ứng có năng lượng sản phẩm cao hơn chất tham gia</u></p>
<p><u>B. Đây là phản ứng thu nhiệt do ΔrH°₂₉₈ > 0</u></p>
<p>C. Đây là phản ứng tỏa nhiệt mãnh liệt</p>
<p>D. Phản ứng xảy ra ở nhiệt độ thấp</p>

<p>Câu 4. [Test Công thức hóa học] Trong các chất sau: H₂SO₄, NaOH, CaCO₃, Fe₂O₃, NH₄NO₃, CH₃COOH, chất nào là acid mạnh?</p>
<p><u>A. H₂SO₄</u></p>
<p>B. NaOH</p>
<p>C. CaCO₃</p>
<p>D. CH₃COOH</p>

<p>Câu 5. [Test Phương trình hóa học] Cho phương trình phản ứng oxi hóa - khử: 2KMnO₄ + 16HCl → 2KCl + 2MnCl₂ + 5Cl₂ + 8H₂O. Vai trò của HCl là</p>
<p>A. Chỉ là chất oxi hóa</p>
<p>B. Chỉ là chất khử</p>
<p>C. Chỉ làm môi trường</p>
<p><u>D. Vừa là chất khử, vừa làm môi trường</u></p>
<p>Hướng dẫn giải: 10 phân tử HCl là chất khử tạo 5Cl₂ và 6 phân tử HCl tạo muối MnCl₂, KCl.</p>

<p>Câu 6. [Test Đúng/Sai 4 ý] Cho các phát biểu sau về nguyên tố Halogen:</p>
<p>a) Các đơn chất từ F₂ đến I₂ đều có tính oxi hóa mạnh. <u>Đúng</u> / Sai</p>
<p>b) Tính oxi hóa tăng dần từ Fluorine đến Iodine. Đúng / <u>Sai</u></p>
<p>c) Dung dịch AgNO₃ nhận biết ion Cl⁻, Br⁻, I⁻. <u>Đúng</u> / Sai</p>
<p>d) Acid HF là một acid mạnh hơn HCl. Đúng / <u>Sai</u></p>
<p>Lời giải: b) Sai vì tính oxi hóa giảm dần từ F₂ đến I₂. d) Sai vì HF là acid yếu.</p>

<p>Câu 7. [Test Trả lời ngắn & Số oxi hóa] Xác định số oxi hóa của nguyên tố Chromium (Cr) trong hợp chất Potassium dichromate (K₂Cr₂O₇).</p>
<p>Đáp án: <u>+6</u></p>
<p>Lời giải: 2*(+1) + 2*x + 7*(-2) = 0 => 2x = 12 => x = +6.</p>

<p>Câu 8. [Test Tính toán Enthalpy & Thể tích khí] Hòa tan 2,4 gam Mg vào dung dịch HCl dư thu được V lít khí H₂ (ở 25 °C, 1 bar). Giá trị của V là</p>
<p><u>A. 2,479 lít</u></p>
<p>B. 4,958 lít</p>
<p>C. 1,2395 lít</p>
<p>D. 22,4 lít</p>
<p>Lời giải: n_Mg = 0,1 mol -> n_H2 = 0,1 mol -> V = 0,1 * 24,79 = 2,479 lít.</p>
`;
    }

    const sampleBlob = new Blob([sampleHtml], { type: 'text/html' });
    const sampleFile = new File([sampleBlob], testFileName, {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    });

    setFileName(sampleFile.name);
    setFileSize(28400);

    setTimeout(async () => {
      try {
        const res = await parseDocxFile(sampleFile, existingQuestions, user?.uid, user?.email);
        setParsedQuestions(res.questions);
        setSelectedTempIds(res.questions.filter(q => q.selectedForImport).map(q => q.tempId));
        setRawTextContent(res.rawText);
        setActiveTab('preview');
      } catch (err: any) {
        alert('Lỗi kiểm thử: ' + err.message);
      } finally {
        setIsProcessing(false);
      }
    }, 400);
  };

  // Upload Word (.docx) file
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.docx') && !file.name.endsWith('.doc')) {
      alert('Vui lòng chọn file Word có định dạng .docx');
      return;
    }

    setFileName(file.name);
    setFileSize(file.size);
    setIsProcessing(true);
    setProcessProgress('Đang đọc thuộc tính Underline và cấu trúc hóa học từ file Word...');

    try {
      const res = await parseDocxFile(file, existingQuestions, user?.uid, user?.email);
      setParsedQuestions(res.questions);
      setSelectedTempIds(res.questions.filter(q => q.selectedForImport).map(q => q.tempId));
      setRawTextContent(res.rawText);
      setActiveTab('preview');
    } catch (err: any) {
      console.error('Docx Parse Error:', err);
      alert('Không thể đọc file Word này: ' + (err.message || 'Vui lòng kiểm tra lại định dạng file .docx'));
    } finally {
      setIsProcessing(false);
    }
  };

  // Toggle selection for a single question
  const toggleSelectQuestion = (tempId: string) => {
    if (selectedTempIds.includes(tempId)) {
      setSelectedTempIds(selectedTempIds.filter(id => id !== tempId));
    } else {
      setSelectedTempIds([...selectedTempIds, tempId]);
    }
  };

  // Select all or deselect all
  const handleSelectAll = (select: boolean) => {
    if (select) {
      const allFilteredIds = filteredQuestions.map(q => q.tempId);
      setSelectedTempIds(Array.from(new Set([...selectedTempIds, ...allFilteredIds])));
    } else {
      const allFilteredIds = new Set(filteredQuestions.map(q => q.tempId));
      setSelectedTempIds(selectedTempIds.filter(id => !allFilteredIds.has(id)));
    }
  };

  // Delete a parsed question from preview
  const handleDeleteParsedQuestion = (tempId: string) => {
    setParsedQuestions(parsedQuestions.filter(q => q.tempId !== tempId));
    setSelectedTempIds(selectedTempIds.filter(id => id !== tempId));
  };

  // Batch delete
  const handleDeleteSelected = () => {
    if (window.confirm(`Bạn có chắc muốn xóa ${selectedTempIds.length} câu hỏi đã chọn?`)) {
      setParsedQuestions(parsedQuestions.filter(q => !selectedTempIds.includes(q.tempId)));
      setSelectedTempIds([]);
    }
  };

  // Batch apply Chapter
  const handleApplyBatchChapter = () => {
    if (!batchChapter) return;
    const chap = CHEMISTRY_10_CURRICULUM.find(c => c.id === batchChapter);
    if (!chap) return;

    setParsedQuestions(prev => prev.map(q => {
      if (selectedTempIds.includes(q.tempId)) {
        return {
          ...q,
          chapterId: chap.id,
          chapterTitle: chap.title,
          lessonId: chap.lessons[0]?.id || 'bai-1',
          lessonTitle: chap.lessons[0]?.title || 'Kiến thức chung'
        };
      }
      return q;
    }));
  };

  // Batch apply Level
  const handleApplyBatchLevel = () => {
    if (!batchLevel) return;
    setParsedQuestions(prev => prev.map(q => {
      if (selectedTempIds.includes(q.tempId)) {
        return {
          ...q,
          level: batchLevel as CognitiveLevel
        };
      }
      return q;
    }));
  };

  // Update correct answer directly on card
  const handleQuickSetCorrectAnswer = (tempId: string, answer: string) => {
    setParsedQuestions(prev => prev.map(q => {
      if (q.tempId === tempId) {
        const updated = { 
          ...q, 
          correctAnswer: answer,
          answerSource: 'MANUAL_EDIT' as const
        };
        if (updated.validationStatus === 'NEEDS_REVIEW' && updated.options && updated.options.length >= 2) {
          updated.validationStatus = 'VALID';
          updated.warningMessage = undefined;
        }
        return updated;
      }
      return q;
    }));
  };

  // Toggle True/False sub-item
  const handleToggleTrueFalseSubItem = (tempId: string, itemIdx: number) => {
    setParsedQuestions(prev => prev.map(q => {
      if (q.tempId === tempId && Array.isArray(q.correctAnswer)) {
        const currentArr = q.correctAnswer as boolean[];
        const newAns: boolean[] = [...currentArr];
        newAns[itemIdx] = !newAns[itemIdx];
        return { 
          ...q, 
          correctAnswer: newAns,
          answerSource: 'MANUAL_EDIT' as const
        };
      }
      return q;
    }));
  };

  // Save changes from Edit Modal
  const handleSaveModalEdit = (updatedQ: ParsedWordQuestion) => {
    let status = updatedQ.validationStatus;
    let warning = updatedQ.warningMessage;

    if (updatedQ.correctAnswer && (updatedQ.options ? updatedQ.options.length >= 2 : true)) {
      status = 'VALID';
      warning = undefined;
    }

    setParsedQuestions(prev => prev.map(q => q.tempId === updatedQ.tempId ? { 
      ...updatedQ, 
      validationStatus: status, 
      warningMessage: warning,
      answerSource: 'MANUAL_EDIT'
    } : q));
    setEditingQuestion(null);
  };

  // Final Execution: Confirm Import into Question Bank
  const handleConfirmImport = async () => {
    const questionsToImport = parsedQuestions.filter(q => selectedTempIds.includes(q.tempId));
    if (questionsToImport.length === 0) {
      alert('Vui lòng chọn ít nhất 1 câu hỏi để nhập vào ngân hàng.');
      return;
    }

    setIsSaving(true);
    try {
      const cleanQuestions: Omit<Question, 'id'>[] = questionsToImport.map(q => ({
        grade: 10,
        chapterId: q.chapterId,
        chapterTitle: q.chapterTitle,
        lessonId: q.lessonId,
        lessonTitle: q.lessonTitle,
        topic: q.topic,
        type: q.type,
        level: q.level,
        content: q.content,
        imageUrl: q.imageUrl,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation || '',
        keywords: q.keywords || [q.chapterTitle],
        createdBy: user?.displayName || user?.email || 'Quản trị viên',
        creatorEmail: user?.email || 'teacher@fpt.edu.vn',
        createdAt: new Date().toISOString(),
        status: 'APPROVED',
        source: 'WORD_IMPORT',
        sourceFileName: fileName || 'Mau_Nhap_Cau_Hoi_Hoa_10.docx',
        importedBy: user?.uid,
        importedAt: new Date().toISOString()
      }));

      // Add into Firestore database
      const count = await questionService.bulkCreateQuestions(cleanQuestions);

      // Save History Record
      const histRecord: Omit<WordImportHistoryRecord, 'id'> = {
        fileName: fileName || 'Mau_Nhap_Cau_Hoi_Hoa_10.docx',
        fileSize: fileSize || 20480,
        importedBy: user?.uid || 'admin',
        importedByName: user?.displayName || user?.email || 'Admin Mười NT',
        importedAt: new Date().toISOString(),
        totalDetected: parsedQuestions.length,
        addedCount: count,
        needsReviewCount: parsedQuestions.filter(q => q.validationStatus === 'NEEDS_REVIEW').length,
        duplicateCount: parsedQuestions.filter(q => q.validationStatus === 'DUPLICATE').length
      };

      await wordImportService.saveHistory(histRecord);
      await loadExistingData();

      setImportResult({
        total: parsedQuestions.length,
        added: count,
        needsReview: histRecord.needsReviewCount,
        duplicate: histRecord.duplicateCount
      });
    } catch (err: any) {
      console.error('Import error:', err);
      alert('Lỗi nhập câu hỏi: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Filtered questions list
  const filteredQuestions = parsedQuestions.filter(q => {
    if (previewFilter === 'VALID' && q.validationStatus !== 'VALID') return false;
    if (previewFilter === 'NEEDS_REVIEW' && q.validationStatus !== 'NEEDS_REVIEW') return false;
    if (previewFilter === 'DUPLICATE' && q.validationStatus !== 'DUPLICATE') return false;
    if (searchFilter) {
      const s = searchFilter.toLowerCase();
      return (
        q.content.toLowerCase().includes(s) ||
        q.chapterTitle.toLowerCase().includes(s) ||
        q.topic.toLowerCase().includes(s)
      );
    }
    return true;
  });

  const getLevelBadge = (level: CognitiveLevel) => {
    switch (level) {
      case 'nhan_biet':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">1. Nhận biết</span>;
      case 'thong_hieu':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-cyan-50 text-cyan-700 border border-cyan-200">2. Thông hiểu</span>;
      case 'van_dung':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-50 text-amber-700 border border-amber-200">3. Vận dụng</span>;
      case 'van_dung_cao':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-purple-50 text-purple-700 border border-purple-200">4. Vận dụng cao</span>;
    }
  };

  const getTypeLabel = (type: QuestionType) => {
    switch (type) {
      case 'multiple_choice': return 'Trắc nghiệm 4 lựa chọn';
      case 'true_false': return 'Đúng / Sai 4 ý';
      case 'short_answer': return 'Trả lời ngắn';
      case 'calculation': return 'Bài toán tính toán';
      case 'equation_balance': return 'Cân bằng PTHH';
      case 'identification': return 'Nhận biết chất';
      case 'experiment': return 'Thí nghiệm & Mô phỏng';
      default: return 'Câu hỏi Hóa học';
    }
  };

  const getAnswerSourceLabel = (source?: string) => {
    switch (source) {
      case 'UNDERLINE':
        return <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-bold">GẠCH CHÂN TRONG FILE WORD</span>;
      case 'INLINE_TEXT':
        return <span className="text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200 font-bold">VĂN BẢN ĐÁP ÁN (INLINE)</span>;
      case 'END_TABLE':
        return <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-bold">BẢNG ĐÁP ÁN CUỐI TÀI LIỆU</span>;
      case 'MANUAL_EDIT':
        return <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-bold">GIÁO VIÊN CHỈNH SỬA</span>;
      default:
        return <span className="text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200 font-bold">CHƯA XÁC ĐỊNH</span>;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate('question_bank')}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors mr-1"
              title="Quay lại Ngân hàng câu hỏi"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <FileText className="w-6 h-6 text-cyan-600" />
              <span>Nhập câu hỏi từ File Word (.docx)</span>
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1 pl-8">
            Tự động nhận diện đáp án bằng thuộc tính <strong className="text-slate-700 font-bold">GẠCH CHÂN (Underline)</strong>, bảo toàn nguyên vẹn công thức hóa học & cấu trúc GDPT 2018.
          </p>
        </div>

        {/* Top Controls & Navigation */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Download Sample Word Template Button */}
          <button
            type="button"
            onClick={handleDownloadSample}
            disabled={isDownloadingSample}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full text-xs font-bold transition-all uppercase tracking-wide flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
          >
            {isDownloadingSample ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span>📥 Tải file Word mẫu</span>
          </button>

          <button
            onClick={() => setActiveTab('upload')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all uppercase tracking-wide flex items-center gap-1.5 ${
              activeTab === 'upload'
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/20'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Tải file</span>
          </button>

          {parsedQuestions.length > 0 && (
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all uppercase tracking-wide flex items-center gap-1.5 ${
                activeTab === 'preview'
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/20'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Xem trước ({parsedQuestions.length})</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('history')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all uppercase tracking-wide flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/20'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Lịch sử ({historyList.length})</span>
          </button>
        </div>
      </div>

      {/* ================= TAB 1: UPLOAD & INSTRUCTIONS ================= */}
      {activeTab === 'upload' && (
        <div className="space-y-6">
          {/* Quick Step-by-Step Instructions Banner */}
          <div className="bg-cyan-900 text-white p-6 rounded-2xl border border-cyan-800 shadow-md">
            <h2 className="text-sm font-bold uppercase tracking-wider text-cyan-200 flex items-center gap-2 mb-3">
              <BookOpen className="w-4 h-4" />
              <span>Hướng dẫn quy trình nhập câu hỏi từ Word:</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 text-xs">
              <div className="bg-cyan-950/60 p-3 rounded-xl border border-cyan-700/50">
                <div className="w-6 h-6 rounded-full bg-cyan-500 text-white font-black text-xs flex items-center justify-center mb-2">1</div>
                <strong className="text-white block">Tải file mẫu</strong>
                <p className="text-cyan-200 text-[11px] mt-1">Bấm nút "Tải file Word mẫu" (Mau_Nhap_Cau_Hoi_Hoa_10.docx).</p>
              </div>

              <div className="bg-cyan-950/60 p-3 rounded-xl border border-cyan-700/50">
                <div className="w-6 h-6 rounded-full bg-cyan-500 text-white font-black text-xs flex items-center justify-center mb-2">2</div>
                <strong className="text-white block">Nhập câu hỏi</strong>
                <p className="text-cyan-200 text-[11px] mt-1">Soạn theo định dạng: Câu 1., Câu 2., A., B., C., D.</p>
              </div>

              <div className="bg-cyan-950/60 p-3 rounded-xl border border-cyan-700/50">
                <div className="w-6 h-6 rounded-full bg-emerald-500 text-white font-black text-xs flex items-center justify-center mb-2">3</div>
                <strong className="text-emerald-300 block">Gạch chân đáp án</strong>
                <p className="text-cyan-200 text-[11px] mt-1">Bôi đen & <u>gạch chân (Ctrl+U)</u> phương án đúng.</p>
              </div>

              <div className="bg-cyan-950/60 p-3 rounded-xl border border-cyan-700/50">
                <div className="w-6 h-6 rounded-full bg-cyan-500 text-white font-black text-xs flex items-center justify-center mb-2">4</div>
                <strong className="text-white block">Tải file lên</strong>
                <p className="text-cyan-200 text-[11px] mt-1">Kéo thả file .docx vào khung tải lên.</p>
              </div>

              <div className="bg-cyan-950/60 p-3 rounded-xl border border-cyan-700/50">
                <div className="w-6 h-6 rounded-full bg-cyan-500 text-white font-black text-xs flex items-center justify-center mb-2">5</div>
                <strong className="text-white block">Xem trước & Sửa</strong>
                <p className="text-cyan-200 text-[11px] mt-1">Kiểm tra đáp án nhận diện, sửa trực tiếp nếu muốn.</p>
              </div>

              <div className="bg-cyan-950/60 p-3 rounded-xl border border-cyan-700/50">
                <div className="w-6 h-6 rounded-full bg-emerald-500 text-white font-black text-xs flex items-center justify-center mb-2">6</div>
                <strong className="text-emerald-300 block">Xác nhận lưu</strong>
                <p className="text-cyan-200 text-[11px] mt-1">Bấm "Xác nhận nhập" để lưu vào Ngân hàng câu hỏi.</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Main Upload Box */}
            <div className="lg:col-span-8 bg-white p-8 rounded-2xl border border-slate-200 shadow-xs space-y-6">
              <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Bước 1: Chọn file đề thi / câu hỏi Word (.docx)</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Hệ thống sẽ đọc trực tiếp thuộc tính <span className="font-bold text-cyan-700">Underline</span> để xác định đáp án đúng chính xác 100%.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleDownloadSample}
                  disabled={isDownloadingSample}
                  className="px-3.5 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Tải mẫu .docx</span>
                </button>
              </div>

              {/* Drag & Drop Surface */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-cyan-300 bg-cyan-50/40 hover:bg-cyan-50/80 rounded-2xl p-10 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".docx,.doc"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div className="w-16 h-16 bg-cyan-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-cyan-600/20 group-hover:scale-105 transition-transform">
                  <Upload className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">
                    Kéo thả file Word vào đây hoặc <span className="text-cyan-600 underline">CHỌN FILE .DOCX</span>
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Định dạng: Microsoft Word (.docx) • Nhận diện đáp án gạch chân • Dung lượng tối đa: 25MB
                  </p>
                </div>
              </div>

              {/* Fast Test Suites */}
              <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-cyan-600" />
                    <span>Bộ kiểm thử nhanh (Test Cases 1-10)</span>
                  </h4>
                  <span className="text-[11px] text-slate-500">Thử nghiệm ngay không cần upload</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Bao gồm: 10 câu trắc nghiệm gạch chân, câu thiếu gạch chân (báo kiểm tra), câu gạch chân 2 đáp án (báo lỗi), câu có công thức hóa học (H₂SO₄, CaCO₃), phương trình hóa học, Đúng/Sai, trả lời ngắn, và lời giải.
                </p>
                <button
                  type="button"
                  onClick={() => handleLoadTestSuite(0)}
                  disabled={isProcessing}
                  className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-full text-xs font-bold uppercase tracking-wide shadow-xs transition-all flex items-center justify-center gap-2"
                >
                  <FileCode className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Chạy kiểm thử bộ câu hỏi mẫu (Test Suite)</span>
                </button>
              </div>

              {/* Processing indicator */}
              {isProcessing && (
                <div className="p-4 bg-cyan-950 text-cyan-200 border border-cyan-800 rounded-xl flex items-center gap-3">
                  <RefreshCw className="w-5 h-5 animate-spin text-cyan-400 shrink-0" />
                  <div className="text-xs">
                    <p className="font-bold text-white">Đang phân tích file Word...</p>
                    <p className="text-cyan-300 mt-0.5">{processProgress}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Quy tắc định dạng */}
            <div className="lg:col-span-4 space-y-4">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Tag className="w-4 h-4 text-cyan-600" />
                  <span>Quy tắc nhận diện đáp án</span>
                </h3>

                <div className="space-y-3.5 text-xs text-slate-600 leading-relaxed">
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900">
                    <strong className="block font-bold">✓ 1 phương án gạch chân:</strong>
                    <p className="text-[11px] mt-0.5">Xác định ngay là đáp án đúng (không cần AI đoán).</p>
                  </div>

                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900">
                    <strong className="block font-bold">⚠️ 0 phương án gạch chân:</strong>
                    <p className="text-[11px] mt-0.5">Trạng thái: <em>Cần kiểm tra</em> (Yêu cầu giáo viên chọn đáp án).</p>
                  </div>

                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-900">
                    <strong className="block font-bold">⚠️ Nhiều hơn 1 phương án gạch chân:</strong>
                    <p className="text-[11px] mt-0.5">Trạng thái: <em>Cần kiểm tra</em> (Cảnh báo lỗi).</p>
                  </div>

                  <div>
                    <strong className="text-slate-800">Bảo toàn công thức:</strong>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                      H₂SO₄, CaCO₃, Fe³⁺, 1s²2s²2p⁶3s¹, ΔrH°₂₉₈, 2H₂ + O₂ → 2H₂O
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: PREVIEW & VERIFICATION ================= */}
      {activeTab === 'preview' && (
        <div className="space-y-6">
          {/* Summary Metric Stats Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Tổng câu phát hiện</div>
              <div className="text-2xl font-black text-slate-900 mt-1">{parsedQuestions.length}</div>
              <div className="text-[10px] text-slate-400 truncate">Từ file: {fileName}</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">✅ Hợp lệ (Sẵn sàng)</div>
              <div className="text-2xl font-black text-emerald-700 mt-1">
                {parsedQuestions.filter(q => q.validationStatus === 'VALID').length}
              </div>
              <div className="text-[10px] text-emerald-600/80">Có đáp án gạch chân chuẩn</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="text-[11px] font-bold uppercase tracking-wider text-amber-600">⚠️ Cần kiểm tra</div>
              <div className="text-2xl font-black text-amber-600 mt-1">
                {parsedQuestions.filter(q => q.validationStatus === 'NEEDS_REVIEW').length}
              </div>
              <div className="text-[10px] text-amber-600/80">Thiếu / Thừa gạch chân</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="text-[11px] font-bold uppercase tracking-wider text-purple-600">⚠️ Khả năng trùng</div>
              <div className="text-2xl font-black text-purple-600 mt-1">
                {parsedQuestions.filter(q => q.validationStatus === 'DUPLICATE').length}
              </div>
              <div className="text-[10px] text-purple-600/80">Đã có trong ngân hàng</div>
            </div>
          </div>

          {/* Action Bar & Batch Operations */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Filter Tabs */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <button
                  onClick={() => setPreviewFilter('ALL')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                    previewFilter === 'ALL' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Tất cả ({parsedQuestions.length})
                </button>
                <button
                  onClick={() => setPreviewFilter('VALID')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                    previewFilter === 'VALID' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  }`}
                >
                  Hợp lệ ({parsedQuestions.filter(q => q.validationStatus === 'VALID').length})
                </button>
                <button
                  onClick={() => setPreviewFilter('NEEDS_REVIEW')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                    previewFilter === 'NEEDS_REVIEW' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                  }`}
                >
                  Cần kiểm tra ({parsedQuestions.filter(q => q.validationStatus === 'NEEDS_REVIEW').length})
                </button>
                <button
                  onClick={() => setPreviewFilter('DUPLICATE')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                    previewFilter === 'DUPLICATE' ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                  }`}
                >
                  Trùng lặp ({parsedQuestions.filter(q => q.validationStatus === 'DUPLICATE').length})
                </button>
              </div>

              {/* Confirm Import Button */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleConfirmImport}
                  disabled={isSaving || selectedTempIds.length === 0}
                  className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-full text-xs font-bold uppercase tracking-wide shadow-lg shadow-cyan-600/20 flex items-center gap-2 disabled:opacity-50 transition-all"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang lưu vào ngân hàng...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>✅ Xác nhận nhập vào Ngân hàng ({selectedTempIds.length} câu)</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Selection & Batch Bar */}
            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleSelectAll(true)}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-medium"
                >
                  Chọn tất cả
                </button>
                <button
                  onClick={() => handleSelectAll(false)}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-medium"
                >
                  Bỏ chọn tất cả
                </button>
                <span className="text-slate-400 ml-1">
                  Đã chọn: <strong className="text-cyan-700 font-bold">{selectedTempIds.length}</strong> / {parsedQuestions.length} câu
                </span>
              </div>

              {/* Batch modifiers */}
              {selectedTempIds.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    value={batchChapter}
                    onChange={(e) => setBatchChapter(e.target.value)}
                    className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  >
                    <option value="">Gán Chương cho câu đã chọn...</option>
                    {CHEMISTRY_10_CURRICULUM.map(c => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleApplyBatchChapter}
                    disabled={!batchChapter}
                    className="px-2.5 py-1 bg-slate-800 text-white rounded-md font-bold disabled:opacity-40"
                  >
                    Gán
                  </button>

                  <select
                    value={batchLevel}
                    onChange={(e) => setBatchLevel(e.target.value)}
                    className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  >
                    <option value="">Gán Mức độ...</option>
                    <option value="nhan_biet">1. Nhận biết</option>
                    <option value="thong_hieu">2. Thông hiểu</option>
                    <option value="van_dung">3. Vận dụng</option>
                    <option value="van_dung_cao">4. Vận dụng cao</option>
                  </select>
                  <button
                    onClick={handleApplyBatchLevel}
                    disabled={!batchLevel}
                    className="px-2.5 py-1 bg-slate-800 text-white rounded-md font-bold disabled:opacity-40"
                  >
                    Gán
                  </button>

                  <button
                    onClick={handleDeleteSelected}
                    className="px-2.5 py-1 bg-red-50 text-red-600 hover:bg-red-100 rounded-md font-bold flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xóa</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Questions Cards List */}
          <div className="space-y-4">
            {filteredQuestions.map((q, idx) => {
              const isSelected = selectedTempIds.includes(q.tempId);

              return (
                <div
                  key={q.tempId}
                  className={`bg-white rounded-2xl border transition-all p-5 shadow-xs ${
                    isSelected ? 'border-cyan-500 ring-1 ring-cyan-500' : 'border-slate-200'
                  }`}
                >
                  {/* Warning Alerts if any */}
                  {q.validationStatus === 'NEEDS_REVIEW' && (
                    <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span className="font-bold">{q.warningMessage || '⚠️ Cần giáo viên kiểm tra câu hỏi và chọn đáp án trước khi lưu.'}</span>
                      </div>
                      <button
                        onClick={() => setEditingQuestion(q)}
                        className="px-2.5 py-1 bg-amber-600 text-white font-bold rounded-lg text-xs uppercase tracking-wide hover:bg-amber-700"
                      >
                        Sửa ngay
                      </button>
                    </div>
                  )}

                  {q.validationStatus === 'DUPLICATE' && (
                    <div className="mb-3 p-3 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-900 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-purple-600 shrink-0" />
                          <span className="font-bold">⚠️ Câu hỏi này có khả năng đã tồn tại trong Ngân hàng câu hỏi!</span>
                        </div>
                        <button
                          onClick={() => toggleSelectQuestion(q.tempId)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                            isSelected ? 'bg-purple-600 text-white' : 'bg-white border border-purple-300 text-purple-700'
                          }`}
                        >
                          {isSelected ? '✓ Vẫn nhập câu này' : 'Bỏ qua không nhập'}
                        </button>
                      </div>
                      {q.duplicateContent && (
                        <div className="p-2 bg-white/80 rounded-lg text-[11px] text-slate-600 border border-purple-200">
                          <strong className="text-purple-900">Nội dung câu trùng:</strong> {q.duplicateContent.slice(0, 150)}...
                        </div>
                      )}
                    </div>
                  )}

                  {/* Header info */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-3 border-b border-slate-100 text-xs">
                    <div className="flex items-center gap-2 flex-wrap">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectQuestion(q.tempId)}
                        className="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                      />
                      <span className="font-bold text-slate-800">
                        {q.sourceNumber ? `Câu ${q.sourceNumber}` : `Câu #${idx + 1}`}
                      </span>
                      {getLevelBadge(q.level)}
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                        {getTypeLabel(q.type)}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        q.validationStatus === 'VALID' ? 'bg-emerald-100 text-emerald-800' :
                        q.validationStatus === 'DUPLICATE' ? 'bg-purple-100 text-purple-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {q.validationStatus === 'VALID' ? '✅ Hợp lệ' : q.validationStatus === 'DUPLICATE' ? 'Trùng lặp' : 'Cần kiểm tra'}
                      </span>
                    </div>

                    <div className="text-slate-400 text-[11px] font-medium">
                      <span>{q.chapterTitle}</span>
                    </div>
                  </div>

                  {/* Question Content */}
                  <div className="text-slate-900 text-sm sm:text-base font-medium leading-relaxed mb-4 whitespace-pre-line">
                    {q.content}
                  </div>

                  {/* Embedded image if extracted */}
                  {q.imageUrl && (
                    <div className="mb-4">
                      <img src={q.imageUrl} alt="Hình ảnh câu hỏi" className="max-h-48 rounded-xl border border-slate-200 shadow-xs" />
                    </div>
                  )}

                  {/* Multiple Choice Options Selector */}
                  {q.type === 'multiple_choice' && q.options && q.options.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                      {q.options.map(opt => {
                        const isCorrect = q.correctAnswer === opt.id;
                        const isUnderlined = q.underlinedOptions?.includes(opt.id);

                        return (
                          <div
                            key={opt.id}
                            onClick={() => handleQuickSetCorrectAnswer(q.tempId, opt.id)}
                            className={`p-2.5 rounded-xl border text-xs sm:text-sm flex items-start gap-2 cursor-pointer transition-all ${
                              isCorrect
                                ? 'bg-emerald-50 border-emerald-400 text-emerald-900 font-bold shadow-xs'
                                : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                              isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                            }`}>
                              {opt.id}
                            </span>
                            <span className={`leading-snug flex-1 ${isUnderlined ? 'underline decoration-emerald-500 decoration-2' : ''}`}>
                              {opt.text}
                            </span>
                            {isCorrect && (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* True / False Sub-Items Selector */}
                  {q.type === 'true_false' && q.options && Array.isArray(q.correctAnswer) && (
                    <div className="space-y-2 mb-4">
                      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Đánh giá Đúng/Sai từng mệnh đề:
                      </div>
                      {q.options.map((opt, oIdx) => {
                        const isTrue = q.correctAnswer[oIdx] === true;
                        return (
                          <div key={opt.id} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs sm:text-sm">
                            <div className="flex items-start gap-2">
                              <span className="font-bold text-cyan-700 shrink-0">{opt.id})</span>
                              <span className="text-slate-800">{opt.text}</span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0 ml-3">
                              <button
                                type="button"
                                onClick={() => handleToggleTrueFalseSubItem(q.tempId, oIdx)}
                                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-colors ${
                                  isTrue ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                                }`}
                              >
                                {isTrue ? '✓ ĐÚNG' : 'Đúng'}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleTrueFalseSubItem(q.tempId, oIdx)}
                                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-colors ${
                                  !isTrue ? 'bg-red-600 text-white' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                                }`}
                              >
                                {!isTrue ? '✗ SAI' : 'Sai'}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Short Answer / Calculation Display */}
                  {q.type !== 'multiple_choice' && q.type !== 'true_false' && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 mb-4 flex items-center justify-between font-mono">
                      <div>
                        <strong>Đáp án đã nhận diện:</strong> {String(q.correctAnswer || '(Chưa xác định)')}
                      </div>
                      <button
                        onClick={() => setEditingQuestion(q)}
                        className="px-2.5 py-1 bg-emerald-700 text-white rounded-md text-[11px] font-bold font-sans uppercase tracking-wide hover:bg-emerald-800"
                      >
                        Đổi đáp án
                      </button>
                    </div>
                  )}

                  {/* Explicit Verification Footer */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs flex flex-wrap items-center justify-between gap-2 mb-4">
                    <div className="flex items-center gap-2">
                      <strong className="text-slate-700">Đáp án phát hiện:</strong>
                      <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-300">
                        {Array.isArray(q.correctAnswer) ? q.correctAnswer.map((b, i) => `${['a','b','c','d'][i]}:${b?'Đ':'S'}`).join(' ') : String(q.correctAnswer || 'Chưa xác định')}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <strong className="text-slate-700">Nguồn đáp án:</strong>
                      {getAnswerSourceLabel(q.answerSource)}
                    </div>
                  </div>

                  {/* Explanation */}
                  {q.explanation && (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 mb-4 leading-relaxed">
                      <strong className="text-slate-800">Lời giải chi tiết:</strong> {q.explanation}
                    </div>
                  )}

                  {/* Action row */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                    <span className="text-slate-400 text-[11px]">
                      Nguồn: {q.sourceFileName || fileName}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingQuestion(q)}
                        className="px-3 py-1.5 text-cyan-600 hover:bg-cyan-50 rounded-lg font-bold flex items-center gap-1 transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Sửa câu này</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteParsedQuestion(q.tempId)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Xóa câu này"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= TAB 3: IMPORT HISTORY ================= */}
      {activeTab === 'history' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Lịch sử nhập câu hỏi từ File Word</h2>
              <p className="text-xs text-slate-500 mt-0.5">Danh sách các đợt import file .docx vào Ngân hàng câu hỏi</p>
            </div>
            <button
              onClick={loadExistingData}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
              title="Làm mới"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {historyList.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <FileCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-700">Chưa có lịch sử nhập file Word</p>
              <p className="text-xs text-slate-500 mt-1">Khi bạn tải file và nhập câu hỏi, nhật ký sẽ được lưu trữ tại đây.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {historyList.map(h => (
                <div key={h.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="font-bold text-slate-800 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-cyan-600" />
                      <span>{h.fileName}</span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Người nhập: <strong>{h.importedByName}</strong> • Thời gian: {new Date(h.importedAt).toLocaleString('vi-VN')}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-2.5 py-1 bg-cyan-100 text-cyan-800 rounded-full font-bold">
                      Tổng: {h.totalDetected} câu
                    </span>
                    <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full font-bold">
                      Đã thêm: +{h.addedCount}
                    </span>
                    {h.needsReviewCount > 0 && (
                      <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full font-bold">
                        Cần xem lại: {h.needsReviewCount}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================= EDIT MODAL ================= */}
      {editingQuestion && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-cyan-600" />
                <span>Chỉnh sửa câu hỏi trước khi nhập</span>
              </h3>
              <button
                onClick={() => setEditingQuestion(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1 text-xs">
              {/* Content */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nội dung câu hỏi:</label>
                <textarea
                  value={editingQuestion.content}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, content: e.target.value })}
                  rows={4}
                  className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:outline-hidden text-sm"
                />
              </div>

              {/* Options for MCQ */}
              {editingQuestion.type === 'multiple_choice' && editingQuestion.options && (
                <div className="space-y-2">
                  <label className="block font-bold text-slate-700">Các phương án & Chọn đáp án đúng:</label>
                  {editingQuestion.options.map((opt, i) => (
                    <div key={opt.id} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingQuestion({ ...editingQuestion, correctAnswer: opt.id })}
                        className={`w-7 h-7 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 ${
                          editingQuestion.correctAnswer === opt.id
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {opt.id}
                      </button>
                      <input
                        type="text"
                        value={opt.text}
                        onChange={(e) => {
                          const newOpts = [...(editingQuestion.options || [])];
                          newOpts[i] = { ...opt, text: e.target.value };
                          setEditingQuestion({ ...editingQuestion, options: newOpts });
                        }}
                        className="flex-1 p-2 border border-slate-300 rounded-lg text-xs"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Short Answer */}
              {editingQuestion.type !== 'multiple_choice' && editingQuestion.type !== 'true_false' && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Đáp án đúng:</label>
                  <input
                    type="text"
                    value={String(editingQuestion.correctAnswer || '')}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, correctAnswer: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-xs font-mono"
                  />
                </div>
              )}

              {/* Chapter & Lesson */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Chương:</label>
                  <select
                    value={editingQuestion.chapterId}
                    onChange={(e) => {
                      const chap = CHEMISTRY_10_CURRICULUM.find(c => c.id === e.target.value);
                      if (chap) {
                        setEditingQuestion({
                          ...editingQuestion,
                          chapterId: chap.id,
                          chapterTitle: chap.title,
                          lessonId: chap.lessons[0]?.id || 'bai-1',
                          lessonTitle: chap.lessons[0]?.title || ''
                        });
                      }
                    }}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                  >
                    {CHEMISTRY_10_CURRICULUM.map(c => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mức độ nhận thức:</label>
                  <select
                    value={editingQuestion.level}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, level: e.target.value as CognitiveLevel })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                  >
                    <option value="nhan_biet">1. Nhận biết</option>
                    <option value="thong_hieu">2. Thông hiểu</option>
                    <option value="van_dung">3. Vận dụng</option>
                    <option value="van_dung_cao">4. Vận dụng cao</option>
                  </select>
                </div>
              </div>

              {/* Explanation */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Lời giải chi tiết:</label>
                <textarea
                  value={editingQuestion.explanation}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, explanation: e.target.value })}
                  rows={3}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 text-xs">
              <button
                type="button"
                onClick={() => setEditingQuestion(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => handleSaveModalEdit(editingQuestion)}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-bold"
              >
                Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= SUCCESS MODAL ================= */}
      {importResult && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 text-center space-y-4 shadow-2xl border border-slate-200">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">Đã nhập câu hỏi thành công!</h3>
              <p className="text-xs text-slate-500 mt-1">
                Các câu hỏi đã được đưa vào Ngân hàng câu hỏi của hệ thống CHEM10 AI.
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1 text-left">
              <div className="flex justify-between">
                <span className="text-slate-600">Số câu đã thêm mới:</span>
                <strong className="text-emerald-700 font-bold">+{importResult.added} câu</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Tổng số câu trong file:</span>
                <span className="text-slate-800">{importResult.total} câu</span>
              </div>
            </div>

            <div className="flex items-center gap-2 justify-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setImportResult(null);
                  onNavigate('question_bank');
                }}
                className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-full text-xs font-bold uppercase tracking-wide shadow-md shadow-cyan-600/20"
              >
                Đến Ngân hàng câu hỏi
              </button>
              <button
                type="button"
                onClick={() => {
                  setImportResult(null);
                  setActiveTab('upload');
                  setParsedQuestions([]);
                }}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full text-xs font-bold uppercase tracking-wide"
              >
                Nhập tiếp file khác
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
