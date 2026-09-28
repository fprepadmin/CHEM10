import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileText, 
  Plus, 
  Search, 
  Filter, 
  Clock, 
  BookOpen, 
  Play, 
  Trash2, 
  Copy, 
  Edit3, 
  Eye, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  FolderPlus, 
  Sparkles, 
  Layers, 
  ChevronRight, 
  Award,
  RefreshCw,
  X,
  Check,
  Download,
  Upload,
  FileCode,
  Shuffle
} from 'lucide-react';
import { questionSetService, questionService, assignmentService } from '../services/dbService';
import { useAuth } from '../context/AuthContext';
import { QuestionSet, Question, CognitiveLevel, QuestionType } from '../types';
import { CHEMISTRY_10_CURRICULUM, getChapterTitle, normalizeChapterId } from '../data/curriculum';
import { buildMatrixQuestions, computeLevelTargets } from '../utils/chapterPracticeMatrix';
import { WordExamUploadModal } from './WordExamUploadModal';

interface ExamManagerViewProps {
  onNavigate: (tab: string, param?: any) => void;
  onStartPractice?: (setId: string, assignmentId?: string, chapterId?: string) => void;
}

export const ExamManagerView: React.FC<ExamManagerViewProps> = ({ onNavigate, onStartPractice }) => {
  const { user, isTeacher, isAdmin } = useAuth();

  const [sets, setSets] = useState<QuestionSet[]>([]);
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterChapter, setFilterChapter] = useState<string>('ALL');

  // Standalone Word Exam Upload Modal State
  const [isWordUploadModalOpen, setIsWordUploadModalOpen] = useState<boolean>(false);

  // Preview Exam Modal State
  const [previewSet, setPreviewSet] = useState<QuestionSet | null>(null);
  const [previewQuestions, setPreviewQuestions] = useState<Question[]>([]);

  // Edit Set Modal State
  const [editingSet, setEditingSet] = useState<QuestionSet | null>(null);
  const [editTitle, setEditTitle] = useState<string>('');
  const [editDesc, setEditDesc] = useState<string>('');
  const [editDuration, setEditDuration] = useState<number>(15);
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);

  // Delete Confirm Dialog
  const [deletingSet, setDeletingSet] = useState<QuestionSet | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Notification Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sList, qList] = await Promise.all([
        questionSetService.getSets(),
        questionService.getQuestions()
      ]);
      setSets(sList);
      setAllQuestions(qList);
    } catch (e) {
      console.error("Error loading exams / sets:", e);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Filtered sets list
  const filteredSets = useMemo(() => {
    return sets.filter(s => {
      if (filterChapter !== 'ALL') {
        const norm = normalizeChapterId(s.chapterId);
        if (norm !== filterChapter) return false;
      }
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchTitle = (s.title || '').toLowerCase().includes(term);
        const matchDesc = (s.description || '').toLowerCase().includes(term);
        if (!matchTitle && !matchDesc) return false;
      }
      return true;
    });
  }, [sets, filterChapter, searchTerm]);

  // Handle open Preview Exam Modal
  const handleOpenPreview = (set: QuestionSet) => {
    setPreviewSet(set);
    if (set.questions && set.questions.length > 0) {
      setPreviewQuestions(set.questions);
    } else if (set.matrixConfig && (set.type === 'MATRIX_DYNAMIC' || !set.questionIds?.length)) {
      const { questions: sampled } = buildMatrixQuestions(allQuestions, set.matrixConfig);
      setPreviewQuestions(sampled);
    } else {
      const matched = (set.questionIds || [])
        .map(id => allQuestions.find(q => q.id === id))
        .filter((q): q is Question => Boolean(q));
      setPreviewQuestions(matched);
    }
  };

  // Handle open Edit Modal
  const handleOpenEdit = (set: QuestionSet) => {
    setEditingSet(set);
    setEditTitle(set.title);
    setEditDesc(set.description || '');
    setEditDuration(set.durationMinutes || 15);
  };

  // Handle Save Edit
  const handleSaveEditSubmit = async () => {
    if (!editingSet || !editTitle.trim()) return;
    setIsSavingEdit(true);
    try {
      await questionSetService.updateSet(editingSet.id, {
        title: editTitle.trim(),
        description: editDesc.trim(),
        durationMinutes: editDuration
      });
      showToast("Đã cập nhật thông tin đề thi thành công!");
      setEditingSet(null);
      loadData();
    } catch (e: any) {
      alert("Lỗi khi cập nhật đề thi: " + e.message);
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Handle Duplicate Set
  const handleDuplicate = async (set: QuestionSet) => {
    try {
      await questionSetService.duplicateSet(set.id, {
        uid: user?.uid,
        email: user?.email
      });
      showToast(`Đã nhân bản đề thi "${set.title}" thành công!`);
      loadData();
    } catch (e: any) {
      alert("Lỗi khi nhân bản đề thi: " + e.message);
    }
  };

  // Handle Delete Set
  const handleConfirmDelete = async () => {
    if (!deletingSet) return;
    setIsDeleting(true);
    try {
      await questionSetService.deleteSet(deletingSet.id);
      showToast(`Đã xóa đề thi "${deletingSet.title}" khỏi hệ thống!`);
      setDeletingSet(null);
      loadData();
    } catch (e: any) {
      alert("Lỗi khi xóa đề thi: " + e.message);
    } finally {
      setIsDeleting(false);
    }
  };

  // Start taking exam directly
  const handleStartExam = (set: QuestionSet) => {
    if (onStartPractice) {
      onStartPractice(set.id, undefined, set.chapterId);
    } else {
      onNavigate('practice_view', { setId: set.id, chapterId: set.chapterId });
    }
  };

  // Jump to Assign Wizard for this exam
  const handleAssignToClass = (set: QuestionSet) => {
    onNavigate('assignments_manager', { openSetId: set.id });
  };

  // Compute cognitive level stats for an exam set
  const getLevelBreakdown = (set: QuestionSet) => {
    if (set.matrixConfig && set.matrixConfig.totalQuestions > 0) {
      const targets = computeLevelTargets(set.matrixConfig.totalQuestions, set.matrixConfig.levelRatio);
      return {
        nhan_biet: targets.nhan_biet,
        thong_hieu: targets.thong_hieu,
        van_dung: targets.van_dung,
        van_dung_cao: targets.van_dung_cao,
        total: set.matrixConfig.totalQuestions
      };
    }

    let list: Question[] = [];
    if (set.questions && set.questions.length > 0) {
      list = set.questions;
    } else {
      list = (set.questionIds || []).map(id => allQuestions.find(q => q.id === id)).filter(Boolean) as Question[];
    }
    const counts = {
      nhan_biet: list.filter(q => q.level === 'nhan_biet').length,
      thong_hieu: list.filter(q => q.level === 'thong_hieu').length,
      van_dung: list.filter(q => q.level === 'van_dung').length,
      van_dung_cao: list.filter(q => q.level === 'van_dung_cao').length,
      total: list.length
    };
    return counts;
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-12 font-sans">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-slate-700 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span className="text-xs font-semibold">{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-cyan-50 text-cyan-800 border border-cyan-200 mb-2">
            <Layers className="w-3.5 h-3.5" />
            <span>Phân hệ Đề thi & Khảo thí LMS Chuẩn GDPT 2018</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>Kho Đề thi & Quản lý Bộ đề</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Tải lên file Word (.docx), tạo đề thi trắc nghiệm theo 4 mức độ nhận thức, giao bài thi cho lớp hoặc trực tiếp làm bài thi thử trực tuyến.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {isTeacher && (
            <>
              <button
                onClick={() => onNavigate('json_import', { mode: 'exam' })}
                className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold rounded-full text-xs shadow-md shadow-indigo-600/20 uppercase tracking-wide transition-all flex items-center gap-1.5 cursor-pointer hover:scale-[1.02]"
              >
                <FileCode className="w-4 h-4 text-cyan-200" />
                <span>Nạp Đề từ JSON</span>
              </button>

              <button
                onClick={() => setIsWordUploadModalOpen(true)}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-full text-xs shadow-md shadow-emerald-600/20 uppercase tracking-wide transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>Tải lên Đề từ Word (.docx)</span>
              </button>

              <button
                onClick={() => onNavigate('create_set')}
                className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-full text-xs shadow-md shadow-cyan-600/20 uppercase tracking-wide transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Soạn đề từ Ngân hàng</span>
              </button>
            </>
          )}

          <button
            onClick={loadData}
            className="p-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-full border border-slate-200 transition-colors cursor-pointer"
            title="Làm mới dữ liệu"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tổng số Đề thi</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{sets.length} đề</div>
          <div className="text-[10px] text-cyan-700 font-medium mt-0.5">Sẵn sàng khảo thí</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Ngân hàng câu hỏi</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{allQuestions.length} câu</div>
          <div className="text-[10px] text-emerald-700 font-medium mt-0.5">GDPT 2018 Hóa 10</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Đề 15 - 45 phút</div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {sets.filter(s => (s.durationMinutes || 15) <= 45).length} đề
          </div>
          <div className="text-[10px] text-purple-700 font-medium mt-0.5">Kiểm tra định kỳ / Thường xuyên</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Đề học kỳ & Tổng hợp</div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {sets.filter(s => (s.durationMinutes || 15) > 45).length} đề
          </div>
          <div className="text-[10px] text-amber-700 font-medium mt-0.5">Kiểm tra cuối kỳ / Giữa kỳ</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Tìm kiếm đề thi theo tên, nội dung mô tả..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-full focus:bg-white focus:ring-2 focus:ring-cyan-500 font-medium"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={filterChapter}
            onChange={(e) => setFilterChapter(e.target.value)}
            className="py-2 px-3 text-xs bg-slate-50 border border-slate-200 rounded-full focus:ring-2 focus:ring-cyan-500 text-slate-700 font-bold"
          >
            <option value="ALL">Tất cả Chương học</option>
            {CHEMISTRY_10_CURRICULUM.map((c, i) => (
              <option key={c.id} value={c.id}>Chương {i + 1}: {c.title.split(': ')[1] || c.title}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Sets List Grid */}
      {loading ? (
        <div className="p-16 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
          <RefreshCw className="w-8 h-8 text-cyan-600 animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-semibold">Đang tải danh sách đề thi...</p>
        </div>
      ) : filteredSets.length === 0 ? (
        <div className="p-16 text-center bg-white rounded-2xl border border-dashed border-slate-200 space-y-4">
          <div className="w-14 h-14 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
            <FileText className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-800">Chưa tìm thấy đề thi nào phù hợp</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Bạn có thể tải lên file Word (.docx) chứa câu hỏi và đáp án gạch chân để hệ thống tự động tạo Đề thi ngay lập tức.
          </p>
          {isTeacher && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setIsWordUploadModalOpen(true)}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full text-xs font-bold uppercase tracking-wide shadow-md shadow-emerald-600/20 flex items-center gap-2 cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>Tải lên Đề thi từ Word (.docx)</span>
              </button>
              <button
                onClick={() => onNavigate('create_set')}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full text-xs font-bold uppercase tracking-wide cursor-pointer"
              >
                + Soạn đề từ Ngân hàng
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSets.map(set => {
            const isWordExam = set.type === 'STANDALONE_WORD' || Boolean(set.questions && set.questions.length > 0);
            const isMatrixExam = set.type === 'MATRIX_DYNAMIC' || Boolean(set.matrixConfig);
            const qCount = set.matrixConfig?.totalQuestions || ((set.questions && set.questions.length > 0) ? set.questions.length : (set.questionIds?.length || 0));
            const stats = getLevelBreakdown(set);
            const chapterName = getChapterTitle(set.chapterId);

            return (
              <div
                key={set.id}
                className="bg-white rounded-2xl border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all p-5 flex flex-col justify-between space-y-4 group relative"
              >
                <div>
                  {/* Top tags */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-1.5 overflow-hidden">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-cyan-50 text-cyan-800 border border-cyan-200 truncate max-w-[150px]">
                        {chapterName}
                      </span>
                      {isMatrixExam ? (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-purple-50 text-purple-700 border border-purple-200 shrink-0 flex items-center gap-1">
                          <Shuffle className="w-2.5 h-2.5 text-purple-600" />
                          <span>Ma trận Động</span>
                        </span>
                      ) : isWordExam ? (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                          Word độc lập
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-cyan-50 text-cyan-700 border border-cyan-200 shrink-0">
                          Từ Ngân hàng
                        </span>
                      )}
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-700 flex items-center gap-1 shrink-0">
                      <Clock className="w-3 h-3 text-slate-500" />
                      <span>{set.durationMinutes || 15} phút</span>
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-cyan-700 transition-colors line-clamp-2">
                    {set.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                    {set.description || 'Bộ đề ôn tập kiến thức môn Hóa học 10.'}
                  </p>

                  {/* Question breakdown metrics */}
                  <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2 text-xs">
                    <div className="flex items-center justify-between font-bold text-slate-800">
                      <span>Quy mô đề:</span>
                      <span className="text-cyan-700">{qCount} câu hỏi</span>
                    </div>

                    <div className="grid grid-cols-4 gap-1 text-[10px] text-center font-bold">
                      <div className="bg-emerald-50 text-emerald-800 p-1 rounded border border-emerald-200" title="Nhận biết">
                        <div>Biết</div>
                        <div>{stats.nhan_biet}</div>
                      </div>
                      <div className="bg-cyan-50 text-cyan-800 p-1 rounded border border-cyan-200" title="Thông hiểu">
                        <div>Hiểu</div>
                        <div>{stats.thong_hieu}</div>
                      </div>
                      <div className="bg-amber-50 text-amber-800 p-1 rounded border border-amber-200" title="Vận dụng">
                        <div>V.Dụng</div>
                        <div>{stats.van_dung}</div>
                      </div>
                      <div className="bg-purple-50 text-purple-800 p-1 rounded border border-purple-200" title="Vận dụng cao">
                        <div>VDC</div>
                        <div>{stats.van_dung_cao}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="space-y-2 pt-3 border-t border-slate-100">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleStartExam(set)}
                      className="w-full py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs uppercase tracking-wide cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>{isTeacher ? 'Thi thử đề' : 'Vào làm bài'}</span>
                    </button>

                    <button
                      onClick={() => handleOpenPreview(set)}
                      className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 uppercase tracking-wide cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-500" />
                      <span>Xem chi tiết</span>
                    </button>
                  </div>

                  {isTeacher && (
                    <div className="flex items-center justify-between pt-1">
                      <button
                        onClick={() => handleAssignToClass(set)}
                        className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 hover:underline cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Giao bài cho lớp</span>
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDuplicate(set)}
                          title="Nhân bản đề thi"
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleOpenEdit(set)}
                          title="Chỉnh sửa thông tin đề"
                          className="p-1.5 text-slate-400 hover:text-cyan-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => setDeletingSet(set)}
                          title="Xóa đề thi"
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ================= PREVIEW EXAM MODAL ================= */}
      {previewSet && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 my-8">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-start justify-between gap-4">
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-cyan-50 text-cyan-800 border border-cyan-200">
                  {getChapterTitle(previewSet.chapterId)}
                </span>
                <h2 className="text-lg font-black text-slate-900 mt-1">{previewSet.title}</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Thời lượng: {previewSet.durationMinutes} phút • Quy mô: {previewQuestions.length} câu hỏi
                </p>
              </div>

              <button
                onClick={() => setPreviewSet(null)}
                className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Questions List Inside Modal */}
            <div className="flex-1 p-6 overflow-y-auto space-y-4">
              {previewQuestions.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  Không tìm thấy chi tiết các câu hỏi trong đề thi này hoặc các câu hỏi đã bị gỡ khỏi ngân hàng.
                </div>
              ) : (
                previewQuestions.map((q, idx) => (
                  <div key={q.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-2.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-cyan-800 uppercase">Câu {idx + 1}:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-full font-bold bg-white text-slate-600 border border-slate-200">
                          {q.type === 'multiple_choice' ? 'Trắc nghiệm 1 đúng' : q.type === 'true_false' ? 'Đúng / Sai 4 ý' : 'Trả lời ngắn'}
                        </span>
                        <span className="px-2 py-0.5 rounded-full font-bold bg-cyan-100 text-cyan-800">
                          {q.level === 'nhan_biet' ? 'Nhận biết' : q.level === 'thong_hieu' ? 'Thông hiểu' : q.level === 'van_dung' ? 'Vận dụng' : 'Vận dụng cao'}
                        </span>
                      </div>
                    </div>

                    <div className="font-medium text-slate-900 leading-relaxed text-sm">
                      {q.content}
                    </div>

                    {/* Options if multiple choice */}
                    {q.options && q.options.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {q.options.map((opt, optIdx) => (
                          <div 
                            key={optIdx}
                            className={`p-2.5 rounded-xl border text-xs font-medium ${
                              isTeacher && q.correctAnswer === opt.id
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                                : 'bg-white border-slate-200 text-slate-700'
                            }`}
                          >
                            <span className="font-bold mr-1.5">{opt.id}.</span>
                            <span>{opt.text}</span>
                            {isTeacher && q.correctAnswer === opt.id && (
                              <span className="ml-2 text-[10px] text-emerald-700 font-bold">(Đáp án đúng)</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Teacher-only explanation */}
                    {isTeacher && q.explanation && (
                      <div className="p-3 bg-cyan-50/60 border border-cyan-200 rounded-xl text-xs text-cyan-950 mt-2">
                        <strong>Lời giải:</strong> {q.explanation}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50 rounded-b-3xl">
              <span className="text-xs text-slate-500 font-medium">
                CHEM10 PRO LMS • Bản quyền đề thi Hóa học 10
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const set = previewSet;
                    setPreviewSet(null);
                    handleStartExam(set);
                  }}
                  className="px-5 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-full text-xs font-bold uppercase tracking-wide shadow-md shadow-cyan-600/20 flex items-center gap-1.5 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>{isTeacher ? 'Làm thử đề thi này' : 'Bắt đầu làm bài'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= EDIT EXAM MODAL ================= */}
      {editingSet && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900">Chỉnh sửa thông tin Đề thi</h3>
              <button onClick={() => setEditingSet(null)} className="p-1 text-slate-400 hover:text-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Tên Đề thi *</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl font-semibold text-slate-900 focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Thời gian làm bài (Phút) *</label>
                <input
                  type="number"
                  min={5}
                  max={180}
                  value={editDuration}
                  onChange={(e) => setEditDuration(Number(e.target.value))}
                  className="w-full p-2.5 border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Mô tả / Hướng dẫn làm bài</label>
                <textarea
                  rows={3}
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-800 focus:ring-2 focus:ring-cyan-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 text-xs">
              <button
                type="button"
                onClick={() => setEditingSet(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full font-bold cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleSaveEditSubmit}
                disabled={isSavingEdit || !editTitle.trim()}
                className="px-5 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-full font-bold uppercase tracking-wide shadow-md shadow-cyan-600/20 disabled:opacity-50 cursor-pointer"
              >
                {isSavingEdit ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= DELETE CONFIRM MODAL ================= */}
      {deletingSet && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 text-center space-y-4">
            <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <Trash2 className="w-7 h-7" />
            </div>

            <h3 className="text-base font-black text-slate-900">Xác nhận xóa Đề thi?</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Bạn có chắc chắn muốn xóa bộ đề <strong className="text-slate-800">"{deletingSet.title}"</strong> không? 
              (Các câu hỏi trong Ngân hàng câu hỏi vẫn được bảo toàn nguyên vẹn).
            </p>

            <div className="flex items-center justify-center gap-2 pt-2 text-xs">
              <button
                type="button"
                onClick={() => setDeletingSet(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full font-bold cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-full font-bold uppercase tracking-wide shadow-md shadow-rose-600/20 disabled:opacity-50 cursor-pointer"
              >
                {isDeleting ? 'Đang xóa...' : 'Xác nhận xóa đề'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Standalone Word Exam Upload Modal */}
      <WordExamUploadModal
        isOpen={isWordUploadModalOpen}
        onClose={() => setIsWordUploadModalOpen(false)}
        onSuccess={(newSetId, title) => {
          showToast(`Đã tạo đề thi "${title}" độc lập từ Word thành công!`);
          loadData();
        }}
      />
    </div>
  );
};
