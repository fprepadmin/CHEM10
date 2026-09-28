import React, { useState, useRef } from 'react';
import { 
  FileText, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  Edit3, 
  X, 
  Save, 
  Clock, 
  HelpCircle, 
  Download, 
  Sparkles, 
  Check, 
  Layers, 
  ShieldCheck,
  BookOpen,
  Image as ImageIcon,
  Loader2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { questionSetService } from '../services/dbService';
import { parseDocxFile, stripCognitiveLevelMarkers } from '../services/wordParserService';
import { downloadSampleWordTemplate } from '../services/sampleWordService';
import { uploadImageToCloudinary } from '../services/cloudinaryService';
import { CHEMISTRY_10_CURRICULUM, CANONICAL_CHAPTER_NAMES } from '../data/curriculum';
import { Question, ParsedWordQuestion, CognitiveLevel, QuestionType, QuestionOption } from '../types';

interface WordExamUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newSetId: string, title: string) => void;
  preselectedChapterId?: string;
}

export const WordExamUploadModal: React.FC<WordExamUploadModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  preselectedChapterId
}) => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Upload & File state
  const [fileName, setFileName] = useState<string>('');
  const [fileSize, setFileSize] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processProgress, setProcessProgress] = useState<string>('');

  // Image Uploading State for Question Editor
  const [isUploadingImage, setIsUploadingImage] = useState<boolean>(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);

  // Exam Configuration State
  const [examTitle, setExamTitle] = useState<string>('');
  const [examDescription, setExamDescription] = useState<string>('');
  const [examChapterId, setExamChapterId] = useState<string>(preselectedChapterId || CHEMISTRY_10_CURRICULUM[0].id);
  const [durationMinutes, setDurationMinutes] = useState<number>(15);
  const [allowReviewAnswers, setAllowReviewAnswers] = useState<boolean>(true);

  // Parsed Questions
  const [parsedQuestions, setParsedQuestions] = useState<ParsedWordQuestion[]>([]);
  const [editingQuestion, setEditingQuestion] = useState<ParsedWordQuestion | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  if (!isOpen) return null;

  // Handle file selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processSelectedFile(file);
  };

  const processSelectedFile = async (file: File) => {
    if (!file.name.match(/\.(docx)$/i)) {
      alert('Vui lòng chọn file Word định dạng .docx');
      return;
    }

    setFileName(file.name);
    setFileSize(file.size);
    setIsProcessing(true);
    setProcessProgress('Đang đọc cấu trúc file Word và trích xuất dữ liệu...');

    // Auto set Title from filename
    const cleanTitle = file.name.replace(/\.docx$/i, '').replace(/[_-]/g, ' ').trim();
    if (!examTitle) {
      setExamTitle(cleanTitle || 'Đề thi trắc nghiệm Hóa học 10');
    }

    try {
      const result = await parseDocxFile(
        file,
        [],
        user?.uid || '',
        user?.email || '',
        examChapterId
      );
      setParsedQuestions(result.questions);
      setProcessProgress('');
      if (result.questions.length === 0) {
        alert('Không tìm thấy câu hỏi nào trong file Word. Vui lòng kiểm tra định dạng hoặc tải file mẫu.');
      }
    } catch (err: any) {
      console.error('Error parsing docx file:', err);
      alert('Có lỗi khi đọc file Word: ' + (err.message || 'Vui lòng thử lại.'));
    } finally {
      setIsProcessing(false);
    }
  };

  // Remove question from list
  const handleDeleteQuestion = (tempId: string) => {
    setParsedQuestions(prev => prev.filter(q => q.tempId !== tempId));
  };

  // Upload image to Cloudinary for current editing question
  const handleImageUploadForQuestion = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingQuestion) return;

    setIsUploadingImage(true);
    setImageUploadError(null);

    try {
      const res = await uploadImageToCloudinary(file);
      const newImgUrl = res.secureUrl || res.url;
      setEditingQuestion({
        ...editingQuestion,
        imageUrl: newImgUrl
      });
    } catch (err: any) {
      console.error('Image upload failed:', err);
      setImageUploadError(err.message || 'Không thể tải ảnh lên.');
    } finally {
      setIsUploadingImage(false);
      if (imageInputRef.current) {
        imageInputRef.current.value = '';
      }
    }
  };

  // Save edit for single question
  const handleSaveQuestionEdit = (updatedQ: ParsedWordQuestion) => {
    setParsedQuestions(prev => prev.map(q => q.tempId === updatedQ.tempId ? updatedQ : q));
    setEditingQuestion(null);
  };

  // Save and Publish Exam
  const handleSaveExam = async () => {
    if (!examTitle.trim()) {
      alert('Vui lòng nhập tên Đề thi!');
      return;
    }

    if (parsedQuestions.length === 0) {
      alert('Chưa có câu hỏi nào trong đề thi! Vui lòng tải lên file Word hợp lệ.');
      return;
    }

    setIsSaving(true);
    try {
      const timestamp = Date.now();
      const cleanQuestions: Question[] = parsedQuestions.map((q, idx) => {
        const item: Question = {
          id: `w_exam_q_${timestamp}_${idx + 1}`,
          grade: 10,
          chapterId: examChapterId,
          chapterTitle: CANONICAL_CHAPTER_NAMES[examChapterId] || q.chapterTitle || 'Chương học Hóa 10',
          chapterName: CANONICAL_CHAPTER_NAMES[examChapterId] || q.chapterName || q.chapterTitle || 'Chương học Hóa 10',
          lessonId: q.lessonId,
          lessonTitle: q.lessonTitle,
          lessonName: q.lessonName || q.lessonTitle,
          topic: q.topic,
          type: q.type,
          level: q.level,
          content: stripCognitiveLevelMarkers(q.content),
          correctAnswer: q.correctAnswer,
          explanation: q.explanation || '',
          keywords: q.keywords || [CANONICAL_CHAPTER_NAMES[examChapterId] || 'Hóa 10'],
          createdBy: user?.displayName || user?.email || 'Giáo viên',
          creatorEmail: user?.email || '',
          createdAt: new Date().toISOString(),
          status: 'APPROVED',
          source: 'WORD_IMPORT',
          sourceFileName: fileName || 'De_Thi_Word.docx'
        };

        if (q.imageUrl && typeof q.imageUrl === 'string' && q.imageUrl.trim().length > 0) {
          item.imageUrl = q.imageUrl.trim();
        }

        if (q.options && Array.isArray(q.options) && q.options.length > 0) {
          item.options = q.options;
        }

        return item;
      });

      const chTitle = CANONICAL_CHAPTER_NAMES[examChapterId] || 'Hóa học 10';
      const newSetId = await questionSetService.createSet({
        title: examTitle.trim(),
        description: examDescription.trim() || `Đề thi trắc nghiệm độc lập từ file Word (${cleanQuestions.length} câu hỏi) - ${chTitle}.`,
        chapterId: examChapterId,
        durationMinutes: durationMinutes || 15,
        questionIds: [], // Empty array: Standalone Word Exam does NOT depend on or write to Question Bank
        questions: cleanQuestions, // Embedded standalone questions
        type: 'STANDALONE_WORD',
        totalScore: 10,
        allowReviewAnswers,
        createdBy: user?.uid || 'system',
        creatorEmail: user?.email || '',
        createdAt: new Date().toISOString(),
        isPublic: true,
        sourceFileName: fileName || 'De_Thi_Word.docx'
      });

      onSuccess(newSetId, examTitle.trim());
      onClose();
    } catch (e: any) {
      console.error('Error creating standalone word exam:', e);
      alert('Có lỗi khi lưu đề thi: ' + (e.message || 'Vui lòng thử lại.'));
    } finally {
      setIsSaving(false);
    }
  };

  const getCognitiveLevelBadge = (level: CognitiveLevel) => {
    switch (level) {
      case 'nhan_biet':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">Nhận biết</span>;
      case 'thong_hieu':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">Thông hiểu</span>;
      case 'van_dung':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">Vận dụng</span>;
      case 'van_dung_cao':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">Vận dụng cao</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">Mức độ khác</span>;
    }
  };

  const getQuestionTypeBadge = (type: QuestionType) => {
    switch (type) {
      case 'multiple_choice':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-100 text-cyan-800">1 đáp án (A,B,C,D)</span>;
      case 'true_false':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800">Đúng / Sai 4 ý</span>;
      case 'short_answer':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-800">Trả lời ngắn</span>;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] font-sans my-auto">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-xs flex items-center justify-center text-white border border-white/20 shadow-xs">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight">Tải lên Đề thi từ File Word (.docx)</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-400/20 text-emerald-100 border border-emerald-400/30 uppercase">
                  Độc lập
                </span>
              </div>
              <p className="text-xs text-emerald-100 mt-0.5">
                Tạo Đề thi trực tiếp từ Word, không lưu vào ngân hàng câu hỏi dùng chung
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-emerald-100 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notice Banner */}
        <div className="px-6 py-2.5 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-emerald-800">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              <strong>Chế độ Đề thi độc lập:</strong> Câu hỏi trong đề thi này được nhúng trực tiếp vào Đề thi, <strong>KHÔNG</strong> lưu vào Ngân hàng câu hỏi và <strong>KHÔNG</strong> làm xáo trộn kho ngân hàng.
            </span>
          </div>

          <button
            onClick={downloadSampleWordTemplate}
            className="hidden sm:flex items-center gap-1.5 text-xs text-emerald-700 hover:text-emerald-900 font-bold shrink-0 hover:underline"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Tải file Word mẫu</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50">
          {/* Step 1: File Upload Box */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600" />
                <span>1. Chọn file đề thi Word (.docx)</span>
              </h3>

              {fileName && (
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  <span>{fileName} ({(fileSize / 1024).toFixed(1)} KB)</span>
                </span>
              )}
            </div>

            <input
              type="file"
              ref={fileInputRef}
              accept=".docx"
              onChange={handleFileChange}
              className="hidden"
            />

            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const f = e.dataTransfer.files?.[0];
                if (f) processSelectedFile(f);
              }}
              className={`p-6 border-2 border-dashed rounded-2xl text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2.5 ${
                fileName
                  ? 'border-emerald-300 bg-emerald-50/40 hover:bg-emerald-50/70'
                  : 'border-slate-300 bg-slate-50/50 hover:bg-slate-100 hover:border-slate-400'
              }`}
            >
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-xs">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">
                  {fileName ? 'Bấm để đổi file Word khác' : 'Nhấp vào đây hoặc kéo thả file Word (.docx) vào đây'}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Hệ thống tự động nhận diện câu hỏi trắc nghiệm, đúng/sai, trả lời ngắn và đáp án gạch chân.
                </p>
              </div>
            </div>

            {isProcessing && (
              <div className="p-3 bg-cyan-50 border border-cyan-200 rounded-xl flex items-center gap-3 text-cyan-800 text-xs font-semibold">
                <div className="w-4 h-4 border-2 border-cyan-600 border-t-transparent rounded-full animate-spin shrink-0" />
                <span>{processProgress}</span>
              </div>
            )}
          </div>

          {/* Step 2: Exam Settings */}
          {parsedQuestions.length > 0 && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-600" />
                <span>2. Thiết lập thông tin Đề thi</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tên Đề thi *</label>
                  <input
                    type="text"
                    required
                    value={examTitle}
                    onChange={(e) => setExamTitle(e.target.value)}
                    placeholder="Ví dụ: Đề kiểm tra giữa kỳ 1 Hóa 10 - Năm học 2024-2025"
                    className="w-full p-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 font-semibold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Chương học chính / Phân loại</label>
                  <select
                    value={examChapterId}
                    onChange={(e) => setExamChapterId(e.target.value)}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                  >
                    {CHEMISTRY_10_CURRICULUM.map((c, idx) => (
                      <option key={c.id} value={c.id}>CHƯƠNG {idx + 1}. {c.title.replace(/^Chương\s*\d+[:.]?\s*/i, '')}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Thời gian làm bài</label>
                  <select
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                  >
                    <option value={15}>15 phút (Kiểm tra 15p)</option>
                    <option value={30}>30 phút</option>
                    <option value={45}>45 phút (Kiểm tra 1 tiết)</option>
                    <option value={60}>60 phút</option>
                    <option value={90}>90 phút (Thi học kỳ)</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Ghi chú / Hướng dẫn làm bài</label>
                  <input
                    type="text"
                    value={examDescription}
                    onChange={(e) => setExamDescription(e.target.value)}
                    placeholder="Ví dụ: Đề thi gồm trắc nghiệm và trả lời ngắn. Học sinh không sử dụng bảng tuần hoàn."
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Question Preview List */}
          {parsedQuestions.length > 0 && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                <div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>3. Danh sách câu hỏi đã trích xuất ({parsedQuestions.length} câu)</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Các câu hỏi này sẽ nằm riêng trong Đề thi, không đưa vào ngân hàng.
                  </p>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-50 text-blue-800 border border-blue-200">
                    NB: {parsedQuestions.filter(q => q.level === 'nhan_biet').length}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    TH: {parsedQuestions.filter(q => q.level === 'thong_hieu').length}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-50 text-amber-800 border border-amber-200">
                    VD: {parsedQuestions.filter(q => q.level === 'van_dung').length}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-purple-50 text-purple-800 border border-purple-200">
                    VDC: {parsedQuestions.filter(q => q.level === 'van_dung_cao').length}
                  </span>
                </div>
              </div>

              <div className="space-y-3.5 max-h-[380px] overflow-y-auto pr-1">
                {parsedQuestions.map((q, idx) => (
                  <div 
                    key={q.tempId || idx}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        {getCognitiveLevelBadge(q.level)}
                        {getQuestionTypeBadge(q.type)}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => setEditingQuestion(q)}
                          className="p-1 text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 rounded-md transition-colors"
                          title="Sửa câu hỏi"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteQuestion(q.tempId)}
                          className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          title="Xóa khỏi đề thi"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div 
                      className="text-xs font-semibold text-slate-900 line-clamp-3"
                      dangerouslySetInnerHTML={{ __html: q.content }}
                    />

                    {q.imageUrl && (
                      <div className="my-1.5">
                        <img src={q.imageUrl} alt="Hình ảnh câu hỏi" className="max-h-28 rounded-lg border border-slate-200" />
                      </div>
                    )}

                    {/* Options list for multiple choice */}
                    {q.options && q.options.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                        {q.options.map(opt => {
                          const isCorrect = opt.isCorrect || q.correctAnswer === opt.id;
                          return (
                            <div 
                              key={opt.id}
                              className={`px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-2 border ${
                                isCorrect 
                                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold' 
                                  : 'bg-white border-slate-200 text-slate-700'
                              }`}
                            >
                              <span className={`w-4 h-4 rounded text-[10px] font-bold flex items-center justify-center shrink-0 ${
                                isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                              }`}>
                                {opt.id}
                              </span>
                              <span className="truncate flex-1" dangerouslySetInnerHTML={{ __html: opt.text }} />
                              {isCorrect && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* True/False answers */}
                    {q.type === 'true_false' && Array.isArray(q.correctAnswer) && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1">
                        {['a', 'b', 'c', 'd'].map((label, itemIdx) => {
                          const val = q.correctAnswer[itemIdx];
                          return (
                            <div key={label} className="px-2.5 py-1 rounded bg-white border border-slate-200 text-[11px] flex items-center justify-between">
                              <span className="font-bold text-slate-700">Ý {label})</span>
                              <span className={`font-black text-[10px] px-1.5 py-0.5 rounded ${val ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                                {val ? 'ĐÚNG' : 'SAI'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Short answer */}
                    {q.type === 'short_answer' && (
                      <div className="pt-1 text-xs">
                        <span className="text-slate-500 font-medium">Đáp án: </span>
                        <span className="font-bold text-emerald-700">{String(q.correctAnswer || 'Chưa đặt')}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500">
            {parsedQuestions.length > 0 ? (
              <span>Sẵn sàng lưu đề: <strong>{parsedQuestions.length} câu hỏi</strong></span>
            ) : (
              <span>Chưa có file nào được tải lên</span>
            )}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold rounded-full text-xs transition-colors cursor-pointer"
            >
              Hủy bỏ
            </button>

            <button
              onClick={handleSaveExam}
              disabled={isSaving || parsedQuestions.length === 0 || !examTitle.trim()}
              className="flex-1 sm:flex-none px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-full text-xs shadow-md shadow-emerald-600/20 uppercase tracking-wide transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Đang lưu đề thi...' : 'Lưu & Xuất bản Đề thi'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Single Question Edit Modal */}
      {editingQuestion && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg rounded-2xl p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="text-sm font-bold text-slate-900">Chỉnh sửa câu hỏi</h4>
              <button onClick={() => setEditingQuestion(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Nội dung câu hỏi</label>
              <textarea
                value={editingQuestion.content}
                onChange={(e) => setEditingQuestion({ ...editingQuestion, content: e.target.value })}
                rows={3}
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
              />
            </div>

            {/* Cloudinary Image Upload Section */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Hình ảnh đính kèm (Cloudinary)</span>
                </label>
                {editingQuestion.imageUrl && (
                  <button
                    type="button"
                    onClick={() => setEditingQuestion({ ...editingQuestion, imageUrl: undefined })}
                    className="text-[11px] text-red-600 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <X className="w-3 h-3" />
                    <span>Xóa ảnh</span>
                  </button>
                )}
              </div>

              {editingQuestion.imageUrl ? (
                <div className="space-y-2">
                  <div className="relative inline-block border border-slate-200 rounded-lg overflow-hidden bg-white max-h-36">
                    <img
                      src={editingQuestion.imageUrl}
                      alt="Ảnh câu hỏi"
                      className="max-h-36 object-contain rounded"
                    />
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono break-all bg-white p-1.5 rounded border border-slate-200">
                    <span className="font-bold text-emerald-600 shrink-0">URL:</span>
                    <span className="truncate">{editingQuestion.imageUrl}</span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <input
                    type="file"
                    ref={imageInputRef}
                    accept="image/*"
                    onChange={handleImageUploadForQuestion}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    disabled={isUploadingImage}
                    className="w-full sm:w-auto px-3.5 py-2 bg-white border border-slate-300 hover:border-emerald-500 text-slate-700 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                  >
                    {isUploadingImage ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                        <span>Đang tải ảnh lên Cloudinary...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Tải ảnh từ máy tính</span>
                      </>
                    )}
                  </button>
                  <span className="text-[11px] text-slate-400">hoặc</span>
                  <input
                    type="text"
                    placeholder="Dán link ảnh (URL)..."
                    value={editingQuestion.imageUrl || ''}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, imageUrl: e.target.value.trim() || undefined })}
                    className="flex-1 p-2 bg-white border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              )}

              {imageUploadError && (
                <p className="text-[11px] text-red-600 font-semibold">{imageUploadError}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Mức độ nhận thức</label>
                <select
                  value={editingQuestion.level}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, level: e.target.value as CognitiveLevel })}
                  className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value="nhan_biet">Nhận biết</option>
                  <option value="thong_hieu">Thông hiểu</option>
                  <option value="van_dung">Vận dụng</option>
                  <option value="van_dung_cao">Vận dụng cao</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Loại câu hỏi</label>
                <select
                  value={editingQuestion.type}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, type: e.target.value as QuestionType })}
                  className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value="multiple_choice">1 đáp án (A,B,C,D)</option>
                  <option value="true_false">Đúng / Sai 4 ý</option>
                  <option value="short_answer">Trả lời ngắn</option>
                </select>
              </div>
            </div>

            {editingQuestion.type === 'multiple_choice' && editingQuestion.options && (
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">Các phương án & Đáp án đúng</label>
                {editingQuestion.options.map((opt, idx) => (
                  <div key={opt.id} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingQuestion({ ...editingQuestion, correctAnswer: opt.id })}
                      className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 ${
                        editingQuestion.correctAnswer === opt.id ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {opt.id}
                    </button>
                    <input
                      type="text"
                      value={opt.text}
                      onChange={(e) => {
                        const newOpts = [...(editingQuestion.options || [])];
                        newOpts[idx] = { ...opt, text: e.target.value };
                        setEditingQuestion({ ...editingQuestion, options: newOpts });
                      }}
                      className="flex-1 p-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                    />
                  </div>
                ))}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Lời giải chi tiết</label>
              <textarea
                value={editingQuestion.explanation || ''}
                onChange={(e) => setEditingQuestion({ ...editingQuestion, explanation: e.target.value })}
                rows={2}
                placeholder="Giải thích vì sao chọn đáp án..."
                className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setEditingQuestion(null)}
                className="px-3.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Hủy
              </button>
              <button
                onClick={() => handleSaveQuestionEdit(editingQuestion)}
                className="px-4 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
              >
                Lưu câu hỏi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};