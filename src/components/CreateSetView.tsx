import React, { useState, useEffect, useMemo } from 'react';
import { 
  BookOpen, 
  Sparkles, 
  CheckCircle2, 
  ArrowLeft, 
  Save, 
  Plus, 
  Trash2, 
  Filter, 
  Search, 
  Check, 
  FileText, 
  Upload, 
  Database,
  Sliders,
  Layers,
  Shuffle,
  Eye,
  AlertCircle,
  HelpCircle,
  BarChart3,
  X
} from 'lucide-react';
import { CHEMISTRY_10_CURRICULUM, CANONICAL_CHAPTER_NAMES, normalizeChapterId, normalizeLessonId, getChapterTitle, getLessonName } from '../data/curriculum';
import { questionService, questionSetService } from '../services/dbService';
import { useAuth } from '../context/AuthContext';
import { Question, CognitiveLevel, QuestionType, ExamMatrixConfig, ChapterMatrixRule } from '../types';
import { buildMatrixQuestions, MatrixDistributionSummary } from '../utils/chapterPracticeMatrix';
import { WordExamUploadModal } from './WordExamUploadModal';

interface CreateSetViewProps {
  onNavigate: (tab: string, param?: any) => void;
  preselectedIds?: string[];
}

export const CreateSetView: React.FC<CreateSetViewProps> = ({ onNavigate, preselectedIds = [] }) => {
  const { user } = useAuth();
  const [creationMode, setCreationMode] = useState<'MATRIX' | 'BANK' | 'WORD'>('MATRIX');
  const [isWordUploadModalOpen, setIsWordUploadModalOpen] = useState<boolean>(false);
  
  // Basic info
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [chapterId, setChapterId] = useState(CHEMISTRY_10_CURRICULUM[0].id);
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [allowReviewAnswers, setAllowReviewAnswers] = useState(true);

  // Question pool & bank state
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Mode: Manual Bank selection states
  const [filterChapter, setFilterChapter] = useState<string>('ALL');
  const [filterLesson, setFilterLesson] = useState<string>('ALL');
  const [filterLevel, setFilterLevel] = useState<string>('ALL');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<string[]>(preselectedIds);

  // Mode: Matrix Generation states
  const [chapterCounts, setChapterCounts] = useState<Record<string, number>>({
    'chuong-1': 4,
    'chuong-2': 4,
    'chuong-3': 4,
    'chuong-4': 4,
    'chuong-5': 4,
    'chuong-6': 4,
    'chuong-7': 4
  });

  const [levelRatio, setLevelRatio] = useState<{
    nhan_biet: number;
    thong_hieu: number;
    van_dung: number;
    van_dung_cao: number;
  }>({
    nhan_biet: 40,
    thong_hieu: 30,
    van_dung: 20,
    van_dung_cao: 10
  });

  const [typeRatio, setTypeRatio] = useState<{
    multiple_choice: number;
    true_false: number;
    short_answer: number;
  }>({
    multiple_choice: 60,
    true_false: 20,
    short_answer: 20
  });

  const [isDynamicPerStudent, setIsDynamicPerStudent] = useState(true);
  
  // Preview Matrix state
  const [previewQuestions, setPreviewQuestions] = useState<Question[]>([]);
  const [previewSummary, setPreviewSummary] = useState<MatrixDistributionSummary | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  useEffect(() => {
    questionService.getQuestions().then(res => {
      // Filter approved questions for creating test sets
      const approved = res.filter(q => {
        const s = (q.status || 'DRAFT').toUpperCase();
        return s === 'APPROVED' || s === 'DEMO';
      });
      const validPool = approved.length > 0 ? approved : res;
      setAllQuestions(validPool);
      if (preselectedIds.length > 0) {
        setSelectedIds(preselectedIds);
        setCreationMode('BANK');
      }
      setLoading(false);
    });
  }, []);

  // Bank counts by chapter
  const bankCountsByChapter = useMemo(() => {
    const counts: Record<string, number> = {};
    CHEMISTRY_10_CURRICULUM.forEach(c => {
      counts[c.id] = 0;
    });
    allQuestions.forEach(q => {
      const norm = normalizeChapterId(q.chapterId);
      if (norm && counts[norm] !== undefined) {
        counts[norm]++;
      }
    });
    return counts;
  }, [allQuestions]);

  // Total questions in Matrix configuration
  const totalMatrixQuestions = useMemo(() => {
    return Object.values(chapterCounts).reduce((a, b) => a + (Number(b) || 0), 0);
  }, [chapterCounts]);

  // Filtered questions for manual selection mode
  const filteredQuestions = useMemo(() => {
    return allQuestions.filter(q => {
      if (filterChapter !== 'ALL') {
        const norm = normalizeChapterId(q.chapterId || q.chapterTitle);
        if (norm !== filterChapter) return false;
      }
      if (filterLesson !== 'ALL') {
        const normL = normalizeLessonId(q.chapterId, q.lessonId);
        const matchLesson = normL === filterLesson || q.lessonId === filterLesson;
        const matchTopic = (q.topic || '').toLowerCase().includes(filterLesson.toLowerCase());
        const matchTitle = (q.lessonTitle || '').toLowerCase().includes(filterLesson.toLowerCase()) || (q.lessonName || '').toLowerCase().includes(filterLesson.toLowerCase());
        if (!matchLesson && !matchTopic && !matchTitle) return false;
      }
      if (filterLevel !== 'ALL' && q.level !== filterLevel) return false;
      if (filterType !== 'ALL' && q.type !== filterType) return false;
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        if (!q.content.toLowerCase().includes(term) && !q.topic?.toLowerCase().includes(term)) {
          return false;
        }
      }
      return true;
    });
  }, [allQuestions, filterChapter, filterLesson, filterLevel, filterType, searchTerm]);

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleSetChapterCount = (chId: string, val: number) => {
    setChapterCounts(prev => ({
      ...prev,
      [chId]: Math.max(0, Math.min(100, isNaN(val) ? 0 : val))
    }));
  };

  // Matrix Presets
  const applyPreset = (type: '10_Q' | '20_Q' | '28_Q' | '40_Q' | 'RESET') => {
    if (type === '10_Q') {
      setTitle('Đề ôn tập nhanh 15 phút (10 câu)');
      setDurationMinutes(15);
      setChapterCounts({
        'chuong-1': 10,
        'chuong-2': 0,
        'chuong-3': 0,
        'chuong-4': 0,
        'chuong-5': 0,
        'chuong-6': 0,
        'chuong-7': 0
      });
    } else if (type === '20_Q') {
      setTitle('Đề ôn tập 30 phút (Chương 1, 2, 3)');
      setDurationMinutes(30);
      setChapterCounts({
        'chuong-1': 7,
        'chuong-2': 7,
        'chuong-3': 6,
        'chuong-4': 0,
        'chuong-5': 0,
        'chuong-6': 0,
        'chuong-7': 0
      });
    } else if (type === '28_Q') {
      setTitle('Đề kiểm tra 45 phút chuẩn GDPT 2018 (28 câu)');
      setDurationMinutes(45);
      setChapterCounts({
        'chuong-1': 4,
        'chuong-2': 4,
        'chuong-3': 4,
        'chuong-4': 4,
        'chuong-5': 4,
        'chuong-6': 4,
        'chuong-7': 4
      });
    } else if (type === '40_Q') {
      setTitle('Đề thi khảo thí Học kỳ Hóa học 10 (40 câu)');
      setDurationMinutes(60);
      setChapterCounts({
        'chuong-1': 6,
        'chuong-2': 6,
        'chuong-3': 6,
        'chuong-4': 6,
        'chuong-5': 6,
        'chuong-6': 5,
        'chuong-7': 5
      });
    } else if (type === 'RESET') {
      setChapterCounts({
        'chuong-1': 0,
        'chuong-2': 0,
        'chuong-3': 0,
        'chuong-4': 0,
        'chuong-5': 0,
        'chuong-6': 0,
        'chuong-7': 0
      });
    }
  };

  const getMatrixConfigObject = (): ExamMatrixConfig => {
    const chaptersList: ChapterMatrixRule[] = CHEMISTRY_10_CURRICULUM
      .map(c => ({
        chapterId: c.id,
        count: chapterCounts[c.id] || 0
      }))
      .filter(r => r.count > 0);

    return {
      totalQuestions: totalMatrixQuestions,
      chapters: chaptersList,
      levelRatio,
      typeRatio,
      isDynamicPerStudent
    };
  };

  // Preview generated matrix exam
  const handlePreviewMatrix = () => {
    if (totalMatrixQuestions === 0) {
      alert("Vui lòng nhập số lượng câu hỏi cho ít nhất 1 chương!");
      return;
    }
    const matrixConfig = getMatrixConfigObject();
    const { questions: sampledQ, summary } = buildMatrixQuestions(allQuestions, matrixConfig);
    setPreviewQuestions(sampledQ);
    setPreviewSummary(summary);
    setIsPreviewModalOpen(true);
  };

  // Save Set
  const handleSaveSet = async () => {
    const finalTitle = title.trim() || (creationMode === 'MATRIX' ? `Đề kiểm tra Ma trận Hóa 10 (${totalMatrixQuestions} câu)` : 'Đề kiểm tra Hóa học 10');

    if (creationMode === 'MATRIX') {
      if (totalMatrixQuestions === 0) {
        alert("Vui lòng nhập số lượng câu hỏi cho ít nhất 1 chương!");
        return;
      }

      setSaving(true);
      try {
        const matrixConfig = getMatrixConfigObject();
        
        // If not dynamic per student, pre-generate fixed questions
        let fixedQuestions: Question[] | undefined = undefined;
        let fixedQuestionIds: string[] = [];
        
        if (!isDynamicPerStudent) {
          const { questions: sampled } = buildMatrixQuestions(allQuestions, matrixConfig);
          fixedQuestions = sampled;
          fixedQuestionIds = sampled.map(q => q.id);
        }

        const newId = await questionSetService.createSet({
          title: finalTitle,
          description: description || `Đề thi ma trận phân bổ ${totalMatrixQuestions} câu qua các chương Hóa học 10 GDPT 2018.`,
          chapterId: 'ALL',
          durationMinutes,
          questionIds: fixedQuestionIds,
          questions: fixedQuestions,
          type: isDynamicPerStudent ? 'MATRIX_DYNAMIC' : 'BANK_COMPILED',
          matrixConfig,
          totalScore: 10,
          allowReviewAnswers,
          createdBy: user?.uid || 'system',
          creatorEmail: user?.email || '',
          createdAt: new Date().toISOString(),
          isPublic: true
        });

        alert(`Tạo đề thi "${finalTitle}" thành công!`);
        onNavigate('exam_manager');
      } catch (e) {
        console.error(e);
        alert("Có lỗi khi tạo đề thi ma trận!");
      } finally {
        setSaving(false);
      }
      return;
    }

    // Manual Bank mode
    if (selectedIds.length === 0) {
      alert("Vui lòng chọn ít nhất 1 câu hỏi cho bộ đề!");
      return;
    }

    setSaving(true);
    try {
      const chTitle = CANONICAL_CHAPTER_NAMES[chapterId] || 'Chương học Hóa 10';
      await questionSetService.createSet({
        title: finalTitle,
        description: description || `Bộ đề ôn tập kiến thức ${chTitle} môn Hóa học 10.`,
        chapterId,
        durationMinutes,
        questionIds: selectedIds,
        type: 'BANK_COMPILED',
        totalScore: 10,
        allowReviewAnswers,
        createdBy: user?.uid || 'system',
        creatorEmail: user?.email || '',
        createdAt: new Date().toISOString(),
        isPublic: true
      });

      alert(`Tạo đề thi "${finalTitle}" thành công!`);
      onNavigate('exam_manager');
    } catch (e) {
      console.error(e);
      alert("Có lỗi khi tạo bài ôn tập");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-16" id="create-set-container">
      {/* Top Header & Save Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('exam_manager')}
            className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 transition-colors cursor-pointer"
            title="Quay lại Kho Đề thi"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <span>Soạn & Tạo Đề thi mới</span>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full font-black uppercase bg-cyan-100 text-cyan-800 border border-cyan-200">
                GDPT 2018
              </span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Hỗ trợ 3 phương thức: Tạo đề theo Ma trận tự động trộn, Tải từ Word (.docx), hoặc Chọn thủ công
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {creationMode === 'MATRIX' && (
            <button
              onClick={handlePreviewMatrix}
              disabled={totalMatrixQuestions === 0}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50 uppercase tracking-wide cursor-pointer"
            >
              <Eye className="w-4 h-4 text-slate-600" />
              <span>Xem trước đề</span>
            </button>
          )}

          <button
            onClick={handleSaveSet}
            disabled={saving || (creationMode === 'MATRIX' ? totalMatrixQuestions === 0 : selectedIds.length === 0)}
            className="px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white rounded-full text-xs font-bold shadow-md shadow-cyan-600/20 transition-all flex items-center gap-1.5 disabled:opacity-50 uppercase tracking-wide cursor-pointer hover:scale-[1.01]"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Đang lưu...' : 'Xuất bản Đề thi'}</span>
          </button>
        </div>
      </div>

      {/* Mode Switcher (3 Tabs) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Mode 1: Matrix */}
        <div
          onClick={() => setCreationMode('MATRIX')}
          className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between shadow-xs ${
            creationMode === 'MATRIX'
              ? 'border-cyan-500 bg-cyan-50/50 ring-2 ring-cyan-400/20'
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-600 text-white flex items-center justify-center shadow-md shadow-cyan-600/20 shrink-0">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-xs font-black text-slate-900">1. Theo Ma trận Số lượng</h3>
                <span className="text-[8px] px-1.5 py-0.2 rounded font-bold bg-amber-100 text-amber-900 uppercase">
                  Đề xuất
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                Cấu hình số câu mỗi chương, dạng thức & năng lực. Tự động trộn đề ngẫu nhiên cho học sinh.
              </p>
            </div>
          </div>
        </div>

        {/* Mode 2: Word Upload */}
        <div
          onClick={() => setIsWordUploadModalOpen(true)}
          className="p-4 rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50/40 hover:bg-emerald-50 hover:border-emerald-500 transition-all cursor-pointer flex flex-col justify-between group shadow-xs"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20 group-hover:scale-105 transition-transform shrink-0">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-xs font-black text-slate-900 group-hover:text-emerald-800 transition-colors">
                  2. Tải từ File Word
                </h3>
                <span className="text-[8px] px-1.5 py-0.2 rounded font-bold bg-emerald-200 text-emerald-900 uppercase">
                  Độc lập
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                Nhập đề thi Word có sẵn đáp án gạch chân, đóng gói ngay thành đề thi độc lập.
              </p>
            </div>
          </div>
        </div>

        {/* Mode 3: Manual Bank selection */}
        <div
          onClick={() => setCreationMode('BANK')}
          className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between shadow-xs ${
            creationMode === 'BANK'
              ? 'border-cyan-500 bg-cyan-50/50 ring-2 ring-cyan-400/20'
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20 shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-xs font-black text-slate-900">3. Chọn từ Ngân hàng</h3>
                <span className="text-[8px] px-1.5 py-0.2 rounded font-bold bg-indigo-100 text-indigo-800 uppercase">
                  {allQuestions.length} câu
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                Lựa chọn thủ công từng câu hỏi cụ thể theo bài học và mức độ nhận thức.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Basic Settings Box */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wide border-b border-slate-100 pb-2 flex items-center gap-2">
          <FileText className="w-4 h-4 text-cyan-600" />
          <span>Thông tin chung của Đề thi</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1">Tên bài ôn tập / Đề thi *</label>
            <input
              type="text"
              required
              placeholder={creationMode === 'MATRIX' ? `Ví dụ: Đề kiểm tra Ma trận 45 phút (${totalMatrixQuestions} câu)` : 'Ví dụ: Ôn tập Chương 1: Cấu tạo nguyên tử'}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500 font-semibold text-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Thời gian làm bài</label>
            <select
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
              className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
            >
              <option value={10}>10 phút</option>
              <option value={15}>15 phút</option>
              <option value={20}>20 phút</option>
              <option value={30}>30 phút</option>
              <option value={45}>45 phút (1 tiết)</option>
              <option value={60}>60 phút</option>
              <option value={90}>90 phút (Thi học kỳ)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Chương trọng tâm / Phạm vi</label>
            <select
              value={chapterId}
              onChange={(e) => setChapterId(e.target.value)}
              className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
            >
              <option value="ALL">Toàn bộ 7 Chương GDPT 2018</option>
              {CHEMISTRY_10_CURRICULUM.map((c, idx) => (
                <option key={c.id} value={c.id}>Chương {idx + 1}. {c.title.replace(/^Chương\s*\d+[:.]?\s*/i, '')}</option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1">Mô tả / Ghi chú</label>
            <textarea
              rows={2}
              placeholder="Đề kiểm tra đánh giá năng lực hóa học định kỳ..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>

          <div className="sm:col-span-2 flex items-center gap-2">
            <input
              type="checkbox"
              id="allowReview"
              checked={allowReviewAnswers}
              onChange={(e) => setAllowReviewAnswers(e.target.checked)}
              className="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500 cursor-pointer"
            />
            <label htmlFor="allowReview" className="text-xs text-slate-700 font-medium cursor-pointer">
              Cho phép học sinh xem đáp án và lời giải chi tiết sau khi nộp bài
            </label>
          </div>
        </div>
      </div>

      {/* MODE 1: MATRIX GENERATOR CONFIGURATION */}
      {creationMode === 'MATRIX' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-600" />
                <span>1. Số lượng câu hỏi cho mỗi Chương</span>
                <span className="px-2 py-0.5 bg-cyan-100 text-cyan-800 rounded-full text-xs font-extrabold">
                  Tổng: {totalMatrixQuestions} câu
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Nhập số lượng câu cần lấy từ mỗi chương. Hệ thống sẽ tự động bốc và trộn câu hỏi cho học sinh.
              </p>
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Mẫu nhanh:</span>
              <button
                type="button"
                onClick={() => applyPreset('10_Q')}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold cursor-pointer transition-colors"
              >
                10 câu (15p)
              </button>
              <button
                type="button"
                onClick={() => applyPreset('28_Q')}
                className="px-2.5 py-1 bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border border-cyan-200 rounded-lg text-[10px] font-bold cursor-pointer transition-colors"
              >
                28 câu (45p)
              </button>
              <button
                type="button"
                onClick={() => applyPreset('40_Q')}
                className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-lg text-[10px] font-bold cursor-pointer transition-colors"
              >
                40 câu (Học kỳ)
              </button>
              <button
                type="button"
                onClick={() => applyPreset('RESET')}
                className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-[10px] font-semibold cursor-pointer transition-colors"
              >
                Xóa hết
              </button>
            </div>
          </div>

          {/* Chapters Table Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {CHEMISTRY_10_CURRICULUM.map((chap, idx) => {
              const currentCount = chapterCounts[chap.id] || 0;
              const inBank = bankCountsByChapter[chap.id] || 0;
              const isExceeded = currentCount > inBank && inBank > 0;

              return (
                <div
                  key={chap.id}
                  className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                    currentCount > 0 ? 'bg-cyan-50/40 border-cyan-300' : 'bg-slate-50/50 border-slate-200'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white text-slate-700 border border-slate-200 shrink-0">
                        Chương {idx + 1}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        (Ngân hàng: <strong className={inBank > 0 ? 'text-slate-700' : 'text-rose-500'}>{inBank} câu</strong>)
                      </span>
                    </div>
                    <div className="text-xs font-bold text-slate-800 truncate">
                      {chap.title.split(': ')[1] || chap.title}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleSetChapterCount(chap.id, currentCount - 1)}
                      className="w-7 h-7 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs cursor-pointer"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={currentCount}
                      onChange={(e) => handleSetChapterCount(chap.id, parseInt(e.target.value) || 0)}
                      className="w-12 p-1.5 text-center text-xs font-bold bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 text-slate-900"
                    />
                    <button
                      type="button"
                      onClick={() => handleSetChapterCount(chap.id, currentCount + 1)}
                      className="w-7 h-7 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Section 2: Cognitive Levels (Năng lực / Mức độ nhận thức) */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                  <BarChart3 className="w-4 h-4 text-indigo-600" />
                  <span>2. Phân bổ Năng lực / Mức độ nhận thức (Tỉ lệ chuẩn 4 : 3 : 2 : 1)</span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  Tự động điều tiết số câu theo các mức độ nhận thức của đề thi
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl">
                <div className="text-[10px] font-bold text-emerald-800 uppercase">1. Nhận biết</div>
                <div className="text-base font-black text-emerald-900 mt-1">
                  {Math.round((levelRatio.nhan_biet / (levelRatio.nhan_biet + levelRatio.thong_hieu + levelRatio.van_dung + levelRatio.van_dung_cao)) * totalMatrixQuestions)} câu
                </div>
                <div className="text-[10px] text-emerald-700 mt-0.5 font-semibold">Tỉ lệ: 40%</div>
              </div>

              <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl">
                <div className="text-[10px] font-bold text-blue-800 uppercase">2. Thông hiểu</div>
                <div className="text-base font-black text-blue-900 mt-1">
                  {Math.round((levelRatio.thong_hieu / (levelRatio.nhan_biet + levelRatio.thong_hieu + levelRatio.van_dung + levelRatio.van_dung_cao)) * totalMatrixQuestions)} câu
                </div>
                <div className="text-[10px] text-blue-700 mt-0.5 font-semibold">Tỉ lệ: 30%</div>
              </div>

              <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl">
                <div className="text-[10px] font-bold text-amber-800 uppercase">3. Vận dụng</div>
                <div className="text-base font-black text-amber-900 mt-1">
                  {Math.round((levelRatio.van_dung / (levelRatio.nhan_biet + levelRatio.thong_hieu + levelRatio.van_dung + levelRatio.van_dung_cao)) * totalMatrixQuestions)} câu
                </div>
                <div className="text-[10px] text-amber-700 mt-0.5 font-semibold">Tỉ lệ: 20%</div>
              </div>

              <div className="p-3 bg-rose-50/60 border border-rose-200 rounded-xl">
                <div className="text-[10px] font-bold text-rose-800 uppercase">4. Vận dụng cao</div>
                <div className="text-base font-black text-rose-900 mt-1">
                  {Math.max(0, totalMatrixQuestions - Math.round((levelRatio.nhan_biet / 100) * totalMatrixQuestions) - Math.round((levelRatio.thong_hieu / 100) * totalMatrixQuestions) - Math.round((levelRatio.van_dung / 100) * totalMatrixQuestions))} câu
                </div>
                <div className="text-[10px] text-rose-700 mt-0.5 font-semibold">Tỉ lệ: 10%</div>
              </div>
            </div>
          </div>

          {/* Section 3: Question Formats (Dạng thức câu hỏi) */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-cyan-600" />
              <span>3. Phân bổ Dạng thức câu hỏi GDPT 2018</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="text-[10px] font-bold text-slate-700 uppercase">Dạng 1: Trắc nghiệm 4 lựa chọn</div>
                <div className="text-sm font-black text-slate-900 mt-1">
                  ~ {Math.round(totalMatrixQuestions * 0.6)} câu (60%)
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="text-[10px] font-bold text-slate-700 uppercase">Dạng 2: Đúng / Sai 4 ý a,b,c,d</div>
                <div className="text-sm font-black text-slate-900 mt-1">
                  ~ {Math.round(totalMatrixQuestions * 0.2)} câu (20%)
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="text-[10px] font-bold text-slate-700 uppercase">Dạng 3: Trả lời ngắn / Tính toán</div>
                <div className="text-sm font-black text-slate-900 mt-1">
                  ~ {Math.round(totalMatrixQuestions * 0.2)} câu (20%)
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Dynamic Shuffling Toggle */}
          <div className="p-4 bg-cyan-50/70 border border-cyan-200 rounded-2xl flex items-start gap-3">
            <input
              type="checkbox"
              id="isDynamic"
              checked={isDynamicPerStudent}
              onChange={(e) => setIsDynamicPerStudent(e.target.checked)}
              className="mt-1 w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500 cursor-pointer"
            />
            <div>
              <label htmlFor="isDynamic" className="text-xs font-black text-cyan-950 cursor-pointer flex items-center gap-1.5">
                <Shuffle className="w-3.5 h-3.5 text-cyan-700" />
                <span>Tự động trộn đề ngẫu nhiên theo ma trận cho mỗi học sinh khi làm bài (Đề xuất)</span>
              </label>
              <p className="text-[11px] text-cyan-800 mt-0.5 leading-relaxed font-medium">
                Mỗi học sinh khi vào phòng thi sẽ nhận một đề thi ngẫu nhiên khác nhau nhưng bảo đảm 100% đúng số lượng câu của từng chương, mức độ nhận thức và dạng thức được cấu hình ở trên.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* MODE 3: MANUAL BANK SELECTION */}
      {creationMode === 'BANK' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Chọn câu hỏi đưa vào bài (<strong className="text-cyan-600">{selectedIds.length}</strong> câu đã chọn)
              </h3>
              <p className="text-xs text-slate-500">Tích chọn các câu hỏi phù hợp từ ngân hàng đã duyệt</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const currentFilteredIds = filteredQuestions.map(q => q.id);
                  const allIn = currentFilteredIds.every(id => selectedIds.includes(id));
                  if (allIn) {
                    setSelectedIds(prev => prev.filter(id => !currentFilteredIds.includes(id)));
                  } else {
                    setSelectedIds(prev => Array.from(new Set([...prev, ...currentFilteredIds])));
                  }
                }}
                className="text-xs text-cyan-600 font-bold hover:underline cursor-pointer"
              >
                Chọn tất cả trong danh sách lọc ({filteredQuestions.length} câu)
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-xs">
            <input
              type="text"
              placeholder="Tìm kiếm nội dung..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
            />

            <select
              value={filterChapter}
              onChange={(e) => {
                setFilterChapter(e.target.value);
                setFilterLesson('ALL');
              }}
              className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
            >
              <option value="ALL">Tất cả 7 chương</option>
              {CHEMISTRY_10_CURRICULUM.map((c, idx) => (
                <option key={c.id} value={c.id}>Chương {idx + 1}. {c.title.replace(/^Chương\s*\d+[:.]?\s*/i, '')}</option>
              ))}
            </select>

            <select
              value={filterLesson}
              onChange={(e) => setFilterLesson(e.target.value)}
              className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
            >
              <option value="ALL">Tất cả bài học</option>
              {filterChapter !== 'ALL' ? (
                (CHEMISTRY_10_CURRICULUM.find(c => c.id === filterChapter)?.lessons || []).map((l, idx) => (
                  <option key={l.id} value={l.id}>
                    {idx + 1}. {l.name || l.title}
                  </option>
                ))
              ) : (
                CHEMISTRY_10_CURRICULUM.flatMap(c => c.lessons).map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name || l.title}
                  </option>
                ))
              )}
            </select>

            <select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
              className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
            >
              <option value="ALL">Tất cả mức độ</option>
              <option value="nhan_biet">1. Nhận biết</option>
              <option value="thong_hieu">2. Thông hiểu</option>
              <option value="van_dung">3. Vận dụng</option>
              <option value="van_dung_cao">4. Vận dụng cao</option>
            </select>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
            >
              <option value="ALL">Tất cả dạng câu</option>
              <option value="multiple_choice">Trắc nghiệm 4 lựa chọn</option>
              <option value="true_false">Đúng / Sai 4 ý</option>
              <option value="short_answer">Trả lời ngắn</option>
              <option value="calculation">Tính toán</option>
            </select>
          </div>

          {/* Questions list */}
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
            {filteredQuestions.map((q, idx) => {
              const isSelected = selectedIds.includes(q.id);
              return (
                <div
                  key={q.id}
                  onClick={() => toggleSelect(q.id)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                    isSelected ? 'bg-cyan-50/70 border-cyan-400' : 'bg-slate-50/50 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}}
                    className="mt-1 w-4 h-4 rounded text-cyan-600 cursor-pointer"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 text-xs flex-wrap">
                      <span className="font-bold text-slate-800">#{idx + 1}</span>
                      <span className="px-2 py-0.5 bg-white border border-slate-200 text-slate-700 rounded text-[10px] font-semibold">
                        {getChapterTitle(q.chapterId)}
                      </span>
                      <span className="px-2 py-0.5 bg-cyan-50 border border-cyan-200 text-cyan-800 rounded text-[10px] font-bold">
                        {q.lessonName || getLessonName(q.chapterId, q.lessonId) || q.lessonTitle || 'Bài học'}
                      </span>
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px]">
                        {q.type}
                      </span>
                      <span className="px-2 py-0.5 bg-cyan-100 text-cyan-800 rounded text-[10px] font-bold uppercase">
                        {q.level}
                      </span>
                    </div>
                    <p className="text-xs text-slate-800 line-clamp-2 leading-relaxed">{q.content}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Standalone Word Exam Upload Modal */}
      <WordExamUploadModal
        isOpen={isWordUploadModalOpen}
        onClose={() => setIsWordUploadModalOpen(false)}
        onSuccess={(newSetId, title) => {
          alert(`Tạo đề thi "${title}" độc lập từ Word thành công!`);
          onNavigate('exam_manager');
        }}
      />

      {/* Preview Matrix Generated Questions Modal */}
      {isPreviewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Eye className="w-5 h-5 text-cyan-600" />
                  <span>Xem trước Đề thi theo Ma trận ({previewQuestions.length} câu)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Mẫu đề thi được bốc ngẫu nhiên từ ngân hàng theo cấu hình ma trận
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPreviewModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Summary badges */}
            {previewSummary && (
              <div className="p-4 bg-slate-50 border-b border-slate-100 flex flex-wrap items-center gap-2 text-xs">
                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg font-bold">
                  Nhận biết: {previewSummary.byLevel.nhan_biet}
                </span>
                <span className="px-2.5 py-1 bg-blue-100 text-blue-800 rounded-lg font-bold">
                  Thông hiểu: {previewSummary.byLevel.thong_hieu}
                </span>
                <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-lg font-bold">
                  Vận dụng: {previewSummary.byLevel.van_dung}
                </span>
                <span className="px-2.5 py-1 bg-rose-100 text-rose-800 rounded-lg font-bold">
                  Vận dụng cao: {previewSummary.byLevel.van_dung_cao}
                </span>
                <span className="px-2.5 py-1 bg-indigo-100 text-indigo-800 rounded-lg font-bold">
                  Trắc nghiệm: {previewSummary.byType.multiple_choice}
                </span>
                <span className="px-2.5 py-1 bg-cyan-100 text-cyan-800 rounded-lg font-bold">
                  Đúng/Sai: {previewSummary.byType.true_false}
                </span>
                <span className="px-2.5 py-1 bg-purple-100 text-purple-800 rounded-lg font-bold">
                  Trả lời ngắn: {previewSummary.byType.short_answer}
                </span>
              </div>
            )}

            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {previewQuestions.map((q, idx) => (
                <div key={q.id || idx} className="p-4 rounded-xl border border-slate-200 bg-white">
                  <div className="flex items-center gap-2 text-xs mb-2 flex-wrap">
                    <span className="font-extrabold text-cyan-700">Câu {idx + 1}</span>
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-semibold">
                      {getChapterTitle(q.chapterId)}
                    </span>
                    <span className="px-2 py-0.5 bg-cyan-50 text-cyan-800 rounded text-[10px] font-bold uppercase">
                      {q.level}
                    </span>
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px]">
                      {q.type}
                    </span>
                  </div>
                  <p className="text-xs text-slate-800 font-medium leading-relaxed">{q.content}</p>

                  {q.type === 'multiple_choice' && q.options && q.options.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2.5 text-xs">
                      {q.options.map((opt, oIdx) => (
                        <div key={opt.id || oIdx} className="p-2 bg-slate-50 rounded-lg border border-slate-100 text-slate-700">
                          <strong className="text-cyan-700 mr-1.5">{opt.label || opt.id}.</strong>
                          <span>{opt.text}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {q.type === 'true_false' && q.options && q.options.length > 0 && (
                    <div className="space-y-1.5 mt-2.5 text-xs">
                      {q.options.map((opt, oIdx) => (
                        <div key={opt.id || oIdx} className="p-2 bg-slate-50 rounded-lg border border-slate-100 text-slate-700 flex items-center justify-between">
                          <div>
                            <strong className="text-cyan-700 mr-1.5">{opt.label || String.fromCharCode(97 + oIdx)})</strong>
                            <span>{opt.text}</span>
                          </div>
                          <span className="text-[10px] font-bold text-slate-400">Đúng / Sai</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50">
              <button
                type="button"
                onClick={() => setIsPreviewModalOpen(false)}
                className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-full text-xs font-bold uppercase tracking-wide cursor-pointer"
              >
                Đóng xem trước
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

