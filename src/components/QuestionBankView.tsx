import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Plus, 
  Sparkles, 
  Trash2, 
  Edit3, 
  Copy, 
  CheckCircle, 
  AlertCircle,
  AlertTriangle,
  Layers,
  FileSpreadsheet,
  FileText,
  Check,
  ChevronDown,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Clock,
  User,
  Bot,
  FileCode,
  Tag,
  Eye,
  X,
  RefreshCw,
  FolderOpen,
  ArrowRight,
  SlidersHorizontal,
  HelpCircle,
  CornerDownRight,
  Share2
} from 'lucide-react';
import { questionService } from '../services/dbService';
import { 
  CHEMISTRY_10_CURRICULUM, 
  CANONICAL_CHAPTER_NAMES, 
  UNCLASSIFIED_CHAPTER_ID, 
  normalizeChapterId, 
  normalizeLessonId,
  getQuestionCanonicalLessonId,
  getLessonTitle,
  getLessonName,
  getChapterTitle, 
  getChapterNumber 
} from '../data/curriculum';
import { Question, QuestionType, CognitiveLevel, ChapterBankStats } from '../types';
import { MathRenderer } from './MathRenderer';

interface QuestionBankViewProps {
  onNavigate: (tab: string, param?: any) => void;
  initialChapterId?: string;
}

export const QuestionBankView: React.FC<QuestionBankViewProps> = ({ onNavigate, initialChapterId }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Active view: null means overview dashboard (7 chapters + unclassified), or 'chuong-1'..'chuong-7', or 'unclassified'
  const [activeChapterId, setActiveChapterId] = useState<string | null>(
    initialChapterId ? normalizeChapterId(initialChapterId) : null
  );

  // Filter states inside a chapter
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [selectedLevel, setSelectedLevel] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedSource, setSelectedSource] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Multi-selection for batch operations
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  
  // Modals
  const [detailModalQuestion, setDetailModalQuestion] = useState<Question | null>(null);
  const [batchChapterModalOpen, setBatchChapterModalOpen] = useState(false);
  const [targetBatchChapter, setTargetBatchChapter] = useState<string>('chuong-1');
  const [targetBatchLesson, setTargetBatchLesson] = useState<string>('chuong-1-thanh-phan-nguyen-tu');
  const [batchActionLoading, setBatchActionLoading] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Delete confirmation in-app modal state (100% iframe-safe, bypasses sandbox window.confirm restrictions)
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    isOpen: boolean;
    ids: string[];
    isBatch: boolean;
    loading: boolean;
    error: string | null;
  }>({
    isOpen: false,
    ids: [],
    isBatch: false,
    loading: false,
    error: null
  });

  const loadQuestions = async () => {
    try {
      const data = await questionService.getQuestions();
      setQuestions(data);
    } catch (e) {
      console.error("Error loading questions:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadQuestions();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadQuestions();
  };

  const showNotification = (msg: string) => {
    setActionSuccessMsg(msg);
    setTimeout(() => setActionSuccessMsg(null), 3000);
  };

  // Group and compute statistics for all 7 chapters + unclassified
  const { chapterStatsList, unclassifiedStats, overallStats } = useMemo(() => {
    const canonicalOrder = [
      'chuong-1',
      'chuong-2',
      'chuong-3',
      'chuong-4',
      'chuong-5',
      'chuong-6',
      'chuong-7',
    ];

    const statsMap: Record<string, ChapterBankStats> = {};

    canonicalOrder.forEach((chId, idx) => {
      const curChapter = CHEMISTRY_10_CURRICULUM.find(c => c.id === chId);
      statsMap[chId] = {
        chapterId: chId,
        chapterTitle: CANONICAL_CHAPTER_NAMES[chId] || curChapter?.title || `Chương ${idx + 1}`,
        chapterNumber: idx + 1,
        description: curChapter?.description || '',
        totalQuestions: 0,
        approvedCount: 0,
        draftCount: 0,
        rejectedCount: 0,
        levelCounts: {
          nhan_biet: 0,
          thong_hieu: 0,
          van_dung: 0,
          van_dung_cao: 0,
        },
        typeCounts: {},
      };
    });

    const unclassified: ChapterBankStats = {
      chapterId: UNCLASSIFIED_CHAPTER_ID,
      chapterTitle: 'Chưa phân loại',
      chapterNumber: null,
      description: 'Các câu hỏi chưa được gán vào 1 trong 7 chương chuẩn GDPT 2018',
      totalQuestions: 0,
      approvedCount: 0,
      draftCount: 0,
      rejectedCount: 0,
      levelCounts: {
        nhan_biet: 0,
        thong_hieu: 0,
        van_dung: 0,
        van_dung_cao: 0,
      },
      typeCounts: {},
    };

    let totalApproved = 0;
    let totalDraft = 0;
    let totalAi = 0;
    let totalTeacher = 0;

    questions.forEach(q => {
      const normId = normalizeChapterId(q.chapterId || q.chapterTitle);
      const targetStats = statsMap[normId] || unclassified;

      targetStats.totalQuestions++;

      // Status
      const statusUpper = (q.status || 'DRAFT').toUpperCase();
      if (statusUpper === 'APPROVED' || statusUpper === 'DEMO') {
        targetStats.approvedCount++;
        totalApproved++;
      } else if (statusUpper === 'REJECTED') {
        targetStats.rejectedCount++;
      } else {
        targetStats.draftCount++;
        totalDraft++;
      }

      // Source
      const srcUpper = (q.source || '').toUpperCase();
      if (q.aiGenerated || srcUpper === 'AI_GENERATED' || srcUpper === 'AI') {
        totalAi++;
      } else {
        totalTeacher++;
      }

      // Level
      const lvl = q.level as CognitiveLevel;
      if (targetStats.levelCounts[lvl] !== undefined) {
        targetStats.levelCounts[lvl]++;
      } else {
        targetStats.levelCounts.nhan_biet++;
      }

      // Type
      const t = q.type || 'multiple_choice';
      targetStats.typeCounts[t] = (targetStats.typeCounts[t] || 0) + 1;
    });

    return {
      chapterStatsList: canonicalOrder.map(id => statsMap[id]),
      unclassifiedStats: unclassified,
      overallStats: {
        total: questions.length,
        approved: totalApproved,
        draft: totalDraft,
        ai: totalAi,
        teacher: totalTeacher,
      }
    };
  }, [questions]);

  const handleSelectChapter = (chId: string | null, lessonId?: string) => {
    setActiveChapterId(chId ? normalizeChapterId(chId) : null);
    setSelectedTopic(lessonId || '');
    setSelectedLevel('');
    setSelectedType('');
    setSelectedStatus('');
    setSelectedSource('');
    setSearchTerm('');
    setSelectedQuestionIds([]);
  };

  // Active chapter details
  const activeChapterInfo = useMemo(() => {
    if (!activeChapterId) return null;
    if (activeChapterId === UNCLASSIFIED_CHAPTER_ID) {
      return {
        id: UNCLASSIFIED_CHAPTER_ID,
        title: 'Chưa phân loại',
        chapterNumber: null,
        description: 'Các câu hỏi chưa được gán vào 1 trong 7 chương chuẩn GDPT 2018',
        lessons: [],
        topics: []
      };
    }
    const cur = CHEMISTRY_10_CURRICULUM.find(c => c.id === activeChapterId);
    const topics: string[] = [];
    cur?.lessons.forEach(l => {
      l.topics.forEach(t => {
        if (!topics.includes(t)) topics.push(t);
      });
    });
    return {
      id: activeChapterId,
      title: CANONICAL_CHAPTER_NAMES[activeChapterId] || cur?.title || 'Chương học',
      chapterNumber: getChapterNumber(activeChapterId),
      description: cur?.description || '',
      lessons: cur?.lessons || [],
      topics
    };
  }, [activeChapterId]);

  // Selected lesson object within current active chapter
  const selectedLessonObj = useMemo(() => {
    if (!selectedTopic || !activeChapterInfo) return null;
    return activeChapterInfo.lessons.find(
      l => l.id === selectedTopic || l.name.toLowerCase() === selectedTopic.toLowerCase() || l.title.toLowerCase() === selectedTopic.toLowerCase()
    ) || null;
  }, [selectedTopic, activeChapterInfo]);

  // Filtered questions when inside a chapter view
  const currentChapterQuestions = useMemo(() => {
    if (!activeChapterId) return [];

    return questions.filter(q => {
      const qNormChapter = normalizeChapterId(q.chapterId || q.chapterTitle);
      if (qNormChapter !== activeChapterId) return false;

      // Topic & Lesson filter
      if (selectedTopic) {
        const curChapObj = CHEMISTRY_10_CURRICULUM.find(c => c.id === activeChapterId);
        const matchedLesson = curChapObj?.lessons.find(
          l => l.id === selectedTopic || l.name.toLowerCase() === selectedTopic.toLowerCase() || l.title.toLowerCase() === selectedTopic.toLowerCase()
        );

        if (matchedLesson) {
          const qLessonId = getQuestionCanonicalLessonId(q, activeChapterId);
          if (qLessonId !== matchedLesson.id) {
            return false;
          }
        } else {
          // Sub-topic filter string
          const sLower = selectedTopic.toLowerCase();
          const matchTopic = (q.topic || '').toLowerCase().includes(sLower);
          const matchTitle = (q.lessonTitle || '').toLowerCase().includes(sLower) || (q.lessonName || '').toLowerCase().includes(sLower);
          const matchId = (q.lessonId || '').toLowerCase() === sLower;
          if (!matchTopic && !matchTitle && !matchId) {
            return false;
          }
        }
      }

      // Level filter
      if (selectedLevel && q.level !== selectedLevel) {
        return false;
      }

      // Type filter
      if (selectedType && q.type !== selectedType) {
        return false;
      }

      // Status filter
      if (selectedStatus) {
        const s = (q.status || 'DRAFT').toUpperCase();
        if (selectedStatus === 'APPROVED' && s !== 'APPROVED' && s !== 'DEMO') return false;
        if (selectedStatus === 'DRAFT' && s !== 'DRAFT' && s !== 'PENDING') return false;
        if (selectedStatus === 'REJECTED' && s !== 'REJECTED') return false;
      }

      // Source filter
      if (selectedSource) {
        const src = (q.source || '').toUpperCase();
        if (selectedSource === 'AI' && !q.aiGenerated && src !== 'AI_GENERATED' && src !== 'AI') return false;
        if (selectedSource === 'TEACHER' && (q.aiGenerated || src === 'AI_GENERATED' || src === 'AI' || src === 'EXCEL_IMPORT' || src === 'WORD_IMPORT')) return false;
        if (selectedSource === 'EXCEL' && src !== 'EXCEL_IMPORT') return false;
        if (selectedSource === 'WORD' && src !== 'WORD_IMPORT') return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const inContent = q.content.toLowerCase().includes(term);
        const inTopic = (q.topic || '').toLowerCase().includes(term);
        const inExpl = (q.explanation || '').toLowerCase().includes(term);
        const inKeywords = q.keywords?.some(k => k.toLowerCase().includes(term));
        const inOptions = q.options?.some(opt => opt.text.toLowerCase().includes(term));
        if (!inContent && !inTopic && !inExpl && !inKeywords && !inOptions) return false;
      }

      return true;
    });
  }, [questions, activeChapterId, selectedTopic, selectedLevel, selectedType, selectedStatus, selectedSource, searchTerm]);

  // Delete Handlers & In-App Confirmation Modal Logic
  const requestDeleteQuestion = (id: string) => {
    setDeleteConfirmModal({
      isOpen: true,
      ids: [id],
      isBatch: false,
      loading: false,
      error: null
    });
  };

  const handleDeleteQuestion = (id: string) => {
    requestDeleteQuestion(id);
  };

  const requestBatchDelete = () => {
    if (selectedQuestionIds.length === 0) return;
    setDeleteConfirmModal({
      isOpen: true,
      ids: [...selectedQuestionIds],
      isBatch: true,
      loading: false,
      error: null
    });
  };

  const closeDeleteModal = () => {
    if (deleteConfirmModal.loading) return;
    setDeleteConfirmModal({
      isOpen: false,
      ids: [],
      isBatch: false,
      loading: false,
      error: null
    });
  };

  const executeDelete = async () => {
    const idsToDelete = deleteConfirmModal.ids;
    if (idsToDelete.length === 0) return;

    setDeleteConfirmModal(prev => ({ ...prev, loading: true, error: null }));
    setBatchActionLoading(true);

    try {
      const deletedCount = await questionService.bulkDeleteQuestions(idsToDelete);
      
      // Update local state immediately for instant UI feedback
      setQuestions(prev => prev.filter(q => !idsToDelete.includes(q.id)));
      setSelectedQuestionIds(prev => prev.filter(id => !idsToDelete.includes(id)));

      // Close modal
      setDeleteConfirmModal({
        isOpen: false,
        ids: [],
        isBatch: false,
        loading: false,
        error: null
      });

      showNotification(`Đã xóa ${deletedCount} câu hỏi khỏi Firestore thành công.`);
      
      // Re-fetch from Firestore to verify exact data state
      await loadQuestions();
    } catch (err: any) {
      console.error("Delete execution error:", err);
      setDeleteConfirmModal(prev => ({
        ...prev,
        loading: false,
        error: err?.message || 'Có lỗi xảy ra khi xóa dữ liệu trên Firestore. Vui lòng thử lại.'
      }));
    } finally {
      setBatchActionLoading(false);
    }
  };

  const handleBatchDelete = () => {
    requestBatchDelete();
  };

  const handleToggleApprove = async (q: Question) => {
    const isApproved = q.status === 'APPROVED' || q.status === 'DEMO';
    const newStatus = isApproved ? 'DRAFT' : 'APPROVED';
    try {
      await questionService.updateQuestion(q.id, { status: newStatus });
      setQuestions(prev => prev.map(item => item.id === q.id ? { ...item, status: newStatus } : item));
      showNotification(newStatus === 'APPROVED' ? 'Đã duyệt câu hỏi!' : 'Đã chuyển về trạng thái Chờ duyệt!');
    } catch (err) {
      console.error(err);
      alert('Lỗi khi cập nhật trạng thái duyệt');
    }
  };

  const handleCopyContent = (q: Question) => {
    let text = `[${getTypeLabel(q.type)} - ${getLevelLabel(q.level)}]\n${q.content}\n`;
    if (q.options && q.options.length > 0) {
      q.options.forEach(opt => {
        text += `${opt.id}. ${opt.text}\n`;
      });
    }
    text += `\nĐáp án: ${JSON.stringify(q.correctAnswer)}`;
    if (q.explanation) {
      text += `\nLời giải: ${q.explanation}`;
    }
    navigator.clipboard.writeText(text);
    setCopiedId(q.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleSelect = (id: string) => {
    if (selectedQuestionIds.includes(id)) {
      setSelectedQuestionIds(selectedQuestionIds.filter(i => i !== id));
    } else {
      setSelectedQuestionIds([...selectedQuestionIds, id]);
    }
  };

  const selectAllCurrent = () => {
    const currentIds = currentChapterQuestions.map(q => q.id);
    const allSelected = currentIds.every(id => selectedQuestionIds.includes(id));
    if (allSelected) {
      setSelectedQuestionIds(prev => prev.filter(id => !currentIds.includes(id)));
    } else {
      setSelectedQuestionIds(prev => Array.from(new Set([...prev, ...currentIds])));
    }
  };

  const handleBatchApprove = async () => {
    if (selectedQuestionIds.length === 0) return;
    setBatchActionLoading(true);
    try {
      await questionService.bulkUpdateQuestions(selectedQuestionIds, { status: 'APPROVED' });
      setQuestions(prev => prev.map(q => selectedQuestionIds.includes(q.id) ? { ...q, status: 'APPROVED' } : q));
      showNotification(`Đã duyệt ${selectedQuestionIds.length} câu hỏi thành công!`);
      setSelectedQuestionIds([]);
    } catch (e) {
      console.error(e);
      alert('Lỗi khi duyệt hàng loạt');
    } finally {
      setBatchActionLoading(false);
    }
  };

  const handleBatchSetDraft = async () => {
    if (selectedQuestionIds.length === 0) return;
    setBatchActionLoading(true);
    try {
      await questionService.bulkUpdateQuestions(selectedQuestionIds, { status: 'DRAFT' });
      setQuestions(prev => prev.map(q => selectedQuestionIds.includes(q.id) ? { ...q, status: 'DRAFT' } : q));
      showNotification(`Đã chuyển ${selectedQuestionIds.length} câu hỏi sang Chờ duyệt!`);
      setSelectedQuestionIds([]);
    } catch (e) {
      console.error(e);
      alert('Lỗi khi chuyển trạng thái hàng loạt');
    } finally {
      setBatchActionLoading(false);
    }
  };

  const handleBatchChangeChapter = async () => {
    if (selectedQuestionIds.length === 0) return;
    setBatchActionLoading(true);
    const chTitle = CANONICAL_CHAPTER_NAMES[targetBatchChapter] || 'Chương học';
    const curChapter = CHEMISTRY_10_CURRICULUM.find(c => c.id === targetBatchChapter);
    const chName = curChapter?.name || curChapter?.title.replace(/^Chương\s*\d+[:.]?\s*/i, '') || 'Hóa học 10';
    const selectedLessonObj = curChapter?.lessons.find(l => l.id === targetBatchLesson) || curChapter?.lessons[0];
    const lId = selectedLessonObj?.id || 'chuong-1-thanh-phan-nguyen-tu';
    const lTitle = selectedLessonObj?.title || 'Kiến thức trọng tâm';
    const lName = selectedLessonObj?.name || selectedLessonObj?.title || 'Kiến thức trọng tâm';

    try {
      await questionService.bulkUpdateQuestions(selectedQuestionIds, {
        chapterId: targetBatchChapter,
        chapterTitle: chTitle,
        chapterName: chName,
        lessonId: lId,
        lessonTitle: lTitle,
        lessonName: lName,
        topic: lName
      });
      setQuestions(prev => prev.map(q => {
        if (selectedQuestionIds.includes(q.id)) {
          return {
            ...q,
            chapterId: targetBatchChapter,
            chapterTitle: chTitle,
            chapterName: chName,
            lessonId: lId,
            lessonTitle: lTitle,
            lessonName: lName,
            topic: lName
          };
        }
        return q;
      }));
      setBatchChapterModalOpen(false);
      showNotification(`Đã chuyển ${selectedQuestionIds.length} câu hỏi sang ${chTitle}!`);
      setSelectedQuestionIds([]);
    } catch (e) {
      console.error(e);
      alert('Lỗi khi chuyển chương hàng loạt');
    } finally {
      setBatchActionLoading(false);
    }
  };



  // Helper Labels & Badges
  const getLevelBadge = (level: CognitiveLevel) => {
    switch (level) {
      case 'nhan_biet':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">1. Nhận biết</span>;
      case 'thong_hieu':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-cyan-50 text-cyan-700 border border-cyan-200">2. Thông hiểu</span>;
      case 'van_dung':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-50 text-amber-700 border border-amber-200">3. Vận dụng</span>;
      case 'van_dung_cao':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-purple-50 text-purple-700 border border-purple-200">4. Vận dụng cao</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-600">Nhận biết</span>;
    }
  };

  const getLevelLabel = (level: CognitiveLevel) => {
    switch (level) {
      case 'nhan_biet': return 'Nhận biết';
      case 'thong_hieu': return 'Thông hiểu';
      case 'van_dung': return 'Vận dụng';
      case 'van_dung_cao': return 'Vận dụng cao';
      default: return 'Nhận thức';
    }
  };

  const getTypeLabel = (type: QuestionType) => {
    switch (type) {
      case 'multiple_choice': return 'Trắc nghiệm 4 lựa chọn';
      case 'true_false': return 'Đúng / Sai 4 ý';
      case 'short_answer': return 'Trả lời ngắn';
      case 'essay': return 'Tự luận';
      case 'calculation': return 'Bài toán tính toán';
      case 'equation_balance': return 'Cân bằng PTHH';
      case 'identification': return 'Nhận biết chất';
      case 'experiment': return 'Thí nghiệm & Hiện tượng';
      case 'unknown': return 'Chưa xác định';
      default: return 'Câu hỏi Hóa học';
    }
  };

  const getSourceBadge = (q: Question) => {
    const src = (q.source || '').toUpperCase();
    if (q.aiGenerated || src === 'AI_GENERATED' || src === 'AI') {
      return (
        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full text-[10px] font-semibold flex items-center gap-1">
          <Bot className="w-3 h-3 text-indigo-500" />
          <span>AI tạo</span>
        </span>
      );
    }
    if (src === 'EXCEL_IMPORT') {
      return (
        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-semibold flex items-center gap-1">
          <FileSpreadsheet className="w-3 h-3 text-emerald-600" />
          <span>Import Excel</span>
        </span>
      );
    }
    if (src === 'WORD_IMPORT') {
      return (
        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-[10px] font-semibold flex items-center gap-1">
          <FileText className="w-3 h-3 text-blue-600" />
          <span>Import Word</span>
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-full text-[10px] font-semibold flex items-center gap-1">
        <User className="w-3 h-3 text-slate-500" />
        <span>Giáo viên nhập</span>
      </span>
    );
  };

  const getStatusBadge = (status?: string) => {
    const s = (status || 'DRAFT').toUpperCase();
    if (s === 'APPROVED' || s === 'DEMO') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" />
          <span>Đã duyệt</span>
        </span>
      );
    }
    if (s === 'REJECTED') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1">
          <X className="w-3 h-3" />
          <span>Từ chối</span>
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
        <Clock className="w-3 h-3" />
        <span>Chờ duyệt</span>
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12" id="question-bank-container">
      {/* Action Success Toast */}
      {actionSuccessMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl border border-slate-700 flex items-center gap-3 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs sm:text-sm font-semibold">{actionSuccessMsg}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TOP HEADER BAR */}
      {/* ========================================================================= */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-cyan-600" />
              <span>Ngân hàng câu hỏi Hóa học 10</span>
            </h1>
            <span className="px-3 py-1 bg-cyan-50 text-cyan-700 text-xs font-bold rounded-full border border-cyan-200">
              {overallStats.total} câu hỏi
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
            Hệ thống ngân hàng chuẩn 7 chương GDPT 2018 với 4 mức độ nhận thức và phân loại dạng câu hỏi chuyên sâu.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            id="btn-add-question"
            onClick={() => onNavigate('add_question', { preselectedChapterId: activeChapterId || 'chuong-1' })}
            className="px-3.5 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-full text-xs font-bold flex items-center gap-1.5 shadow-md shadow-cyan-600/20 uppercase tracking-wide transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm câu hỏi</span>
          </button>

          <button
            id="btn-word-import"
            onClick={() => onNavigate('word_import', { preselectedChapterId: activeChapterId || '' })}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-full text-xs font-bold flex items-center gap-1.5 shadow-xs uppercase tracking-wide transition-all"
          >
            <FileText className="w-3.5 h-3.5 text-cyan-300" />
            <span>Nhập Word</span>
          </button>

          <button
            id="btn-json-import"
            onClick={() => onNavigate('json_import', { mode: 'bank', initialChapterId: activeChapterId || 'chuong-1' })}
            className="px-3.5 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-full text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/20 uppercase tracking-wide transition-all"
          >
            <FileCode className="w-3.5 h-3.5 text-cyan-200" />
            <span>Nhập JSON</span>
          </button>

          <button
            id="btn-ai-generator"
            onClick={() => onNavigate('ai_generator', { preselectedChapterId: activeChapterId || 'chuong-1' })}
            className="px-3.5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-full text-xs font-bold flex items-center gap-1.5 shadow-md shadow-purple-600/20 uppercase tracking-wide transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>AI Tạo câu hỏi</span>
          </button>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full text-xs transition-colors"
            title="Làm mới dữ liệu"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW 1: OVERVIEW DASHBOARD (WHEN activeChapterId IS NULL) */}
      {/* ========================================================================= */}
      {!activeChapterId && (
        <div className="space-y-6">
          {/* Dashboard Stats Panel */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-cyan-950 p-6 rounded-2xl text-white shadow-md border border-slate-700">
            <div className="flex items-center justify-between mb-4 border-b border-slate-700/60 pb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-cyan-300">Tổng quan ngân hàng</h2>
              </div>
              <span className="text-[11px] text-slate-300">7 Chương chuẩn GDPT 2018</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 text-center">
              <div className="p-3.5 bg-white/5 rounded-xl border border-white/10 backdrop-blur-xs">
                <div className="text-2xl sm:text-3xl font-black text-white">{overallStats.total}</div>
                <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mt-1">Tổng số câu</div>
              </div>

              <div className="p-3.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                <div className="text-2xl sm:text-3xl font-black text-emerald-400">{overallStats.approved}</div>
                <div className="text-[11px] font-bold text-emerald-200 uppercase tracking-wider mt-1">Đã duyệt</div>
              </div>

              <div className="p-3.5 bg-amber-500/10 rounded-xl border border-amber-500/20">
                <div className="text-2xl sm:text-3xl font-black text-amber-400">{overallStats.draft}</div>
                <div className="text-[11px] font-bold text-amber-200 uppercase tracking-wider mt-1">Chờ duyệt</div>
              </div>

              <div className="p-3.5 bg-purple-500/10 rounded-xl border border-purple-500/20">
                <div className="text-2xl sm:text-3xl font-black text-purple-300">{overallStats.ai}</div>
                <div className="text-[11px] font-bold text-purple-200 uppercase tracking-wider mt-1">AI tạo</div>
              </div>

              <div className="p-3.5 bg-cyan-500/10 rounded-xl border border-cyan-500/20 col-span-2 sm:col-span-1">
                <div className="text-2xl sm:text-3xl font-black text-cyan-300">{overallStats.teacher}</div>
                <div className="text-[11px] font-bold text-cyan-200 uppercase tracking-wider mt-1">Giáo viên / Nhập</div>
              </div>
            </div>
          </div>

          {/* 7 CHAPTER CARDS GRID (FIXED ORDER: CHƯƠNG 1 -> CHƯƠNG 7) */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span>Cấu trúc 7 Chương Hóa học 10</span>
                <span className="text-xs font-semibold text-slate-500">(Bấm vào từng chương để xem chi tiết & quản lý)</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {chapterStatsList.map((chStats) => {
                const total = chStats.totalQuestions;
                const nbPercent = total > 0 ? Math.round((chStats.levelCounts.nhan_biet / total) * 100) : 0;
                const thPercent = total > 0 ? Math.round((chStats.levelCounts.thong_hieu / total) * 100) : 0;
                const vdPercent = total > 0 ? Math.round((chStats.levelCounts.van_dung / total) * 100) : 0;
                const vdcPercent = total > 0 ? Math.round((chStats.levelCounts.van_dung_cao / total) * 100) : 0;

                return (
                  <div
                    key={chStats.chapterId}
                    id={`chapter-card-${chStats.chapterNumber}`}
                    className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md hover:border-cyan-400 transition-all flex flex-col justify-between group"
                  >
                    <div>
                      {/* Chapter Badge and Count */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <span className="px-3 py-1 bg-cyan-100 text-cyan-900 rounded-full text-xs font-black uppercase tracking-wide border border-cyan-200">
                          CHƯƠNG {chStats.chapterNumber}
                        </span>
                        <div className="text-right">
                          <span className="text-lg font-black text-slate-900">{total}</span>
                          <span className="text-xs text-slate-500 font-semibold ml-1">câu</span>
                        </div>
                      </div>

                      {/* Chapter Title & Description */}
                      <h3 className="text-base font-black text-slate-900 leading-snug group-hover:text-cyan-700 transition-colors">
                        {chStats.chapterTitle.replace(/^Chương\s*\d+[:.]?\s*/i, '')}
                      </h3>
                      {chStats.description && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                          {chStats.description}
                        </p>
                      )}

                      {/* Status Breakdown Pills */}
                      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100 text-xs">
                        <div className="flex items-center gap-1.5 text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Đã duyệt: <strong>{chStats.approvedCount}</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5 text-amber-700 font-semibold bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-100">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          <span>Chờ duyệt: <strong>{chStats.draftCount}</strong></span>
                        </div>
                      </div>

                      {/* 23 Lessons List for each chapter */}
                      {(() => {
                        const curChap = CHEMISTRY_10_CURRICULUM.find(c => c.id === chStats.chapterId);
                        const chapLessons = curChap?.lessons || [];
                        const chapterQuestions = questions.filter(q => normalizeChapterId(q.chapterId || q.chapterTitle) === chStats.chapterId);

                        return (
                          <div className="mt-3.5 pt-3 border-t border-slate-100">
                            <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 mb-2">
                              <span className="flex items-center gap-1.5 text-cyan-800">
                                <BookOpen className="w-3.5 h-3.5 text-cyan-600" />
                                <span>Đơn vị bài học ({chapLessons.length} bài):</span>
                              </span>
                            </div>
                            <div className="space-y-1.5">
                              {chapLessons.map((lesson, lIdx) => {
                                const lQCount = chapterQuestions.filter(q => {
                                  return getQuestionCanonicalLessonId(q, chStats.chapterId) === lesson.id;
                                }).length;

                                return (
                                  <button
                                    key={lesson.id}
                                    onClick={() => {
                                      handleSelectChapter(chStats.chapterId, lesson.id);
                                    }}
                                    className="w-full text-left p-2 rounded-xl bg-slate-50 hover:bg-cyan-50/80 hover:text-cyan-900 border border-slate-100 hover:border-cyan-200 transition-all flex items-center justify-between text-xs group/item cursor-pointer"
                                    title={`Xem câu hỏi bài: ${lesson.name || lesson.title}`}
                                  >
                                    <span className="font-medium text-slate-700 group-hover/item:text-cyan-900 leading-snug flex items-center gap-1.5">
                                      <span className="w-4 h-4 rounded-full bg-slate-200 group-hover/item:bg-cyan-200 text-slate-600 group-hover/item:text-cyan-800 text-[10px] font-bold flex items-center justify-center shrink-0">
                                        {lIdx + 1}
                                      </span>
                                      <span>{lesson.name || lesson.title}</span>
                                    </span>
                                    <span className="text-[10px] font-bold text-slate-400 group-hover/item:text-cyan-700 bg-white px-2 py-0.5 rounded-md border border-slate-100 shrink-0">
                                      {lQCount} câu
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Cognitive Level Breakdown */}
                      <div className="mt-4 space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Phân bố mức độ nhận thức:
                        </div>
                        <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px]">
                          <div className="flex items-center justify-between text-slate-700">
                            <span className="flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-emerald-500" />
                              Nhận biết:
                            </span>
                            <strong>{chStats.levelCounts.nhan_biet} ({nbPercent}%)</strong>
                          </div>
                          <div className="flex items-center justify-between text-slate-700">
                            <span className="flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-cyan-500" />
                              Thông hiểu:
                            </span>
                            <strong>{chStats.levelCounts.thong_hieu} ({thPercent}%)</strong>
                          </div>
                          <div className="flex items-center justify-between text-slate-700">
                            <span className="flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-amber-500" />
                              Vận dụng:
                            </span>
                            <strong>{chStats.levelCounts.van_dung} ({vdPercent}%)</strong>
                          </div>
                          <div className="flex items-center justify-between text-slate-700">
                            <span className="flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-purple-500" />
                              Vận dụng cao:
                            </span>
                            <strong>{chStats.levelCounts.van_dung_cao} ({vdcPercent}%)</strong>
                          </div>
                        </div>

                        {/* Visual distribution stacked bar */}
                        {total > 0 && (
                          <div className="h-1.5 w-full bg-slate-200 rounded-full flex overflow-hidden mt-1">
                            <div style={{ width: `${nbPercent}%` }} className="bg-emerald-500" title="Nhận biết" />
                            <div style={{ width: `${thPercent}%` }} className="bg-cyan-500" title="Thông hiểu" />
                            <div style={{ width: `${vdPercent}%` }} className="bg-amber-500" title="Vận dụng" />
                            <div style={{ width: `${vdcPercent}%` }} className="bg-purple-500" title="Vận dụng cao" />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Footer Actions */}
                    <div className="flex items-center gap-2 mt-5 pt-3 border-t border-slate-100">
                      <button
                        onClick={() => handleSelectChapter(chStats.chapterId)}
                        className="flex-1 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 uppercase tracking-wide transition-all shadow-xs"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>XEM NGÂN HÀNG</span>
                      </button>

                      <button
                        onClick={() => onNavigate('add_question', { preselectedChapterId: chStats.chapterId })}
                        className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                        title="Thêm câu hỏi vào chương này"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* UNCLASSIFIED SECTION (IF ANY QUESTIONS EXIST WITHOUT A STANDARD CHAPTER) */}
          {unclassifiedStats.totalQuestions > 0 && (
            <div className="bg-amber-50/80 border-2 border-amber-300 rounded-2xl p-6 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-amber-500 text-white rounded-xl shadow-xs">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-black text-amber-900">CHƯA PHÂN LOẠI</h3>
                      <span className="px-2.5 py-0.5 bg-amber-200 text-amber-900 text-xs font-bold rounded-full">
                        {unclassifiedStats.totalQuestions} câu hỏi
                      </span>
                    </div>
                    <p className="text-xs text-amber-800 mt-1">
                      Các câu hỏi cũ hoặc import chưa được gán vào 1 trong 7 chương chuẩn. Bạn có thể mở ra để xem và phân loại vào chương phù hợp.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleSelectChapter(UNCLASSIFIED_CHAPTER_ID)}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs uppercase tracking-wide transition-all"
                  >
                    <span>Mở & Phân loại ({unclassifiedStats.totalQuestions} câu) →</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: CHAPTER DETAIL VIEW (WHEN activeChapterId IS SELECTED) */}
      {/* ========================================================================= */}
      {activeChapterId && activeChapterInfo && (
        <div className="space-y-6 animate-fade-in">
          {/* Breadcrumb & Chapter Title Header */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              {/* Breadcrumb with multi-level hierarchy */}
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 flex-wrap">
                <button
                  onClick={() => handleSelectChapter(null)}
                  className="hover:text-cyan-600 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5 text-cyan-600" />
                  <span>Ngân hàng câu hỏi</span>
                </button>
                <span>&gt;</span>
                {selectedLessonObj ? (
                  <>
                    <button
                      onClick={() => setSelectedTopic('')}
                      className="hover:text-cyan-600 font-bold transition-colors cursor-pointer text-slate-700"
                    >
                      {activeChapterInfo.chapterNumber ? `Chương ${activeChapterInfo.chapterNumber}: ${activeChapterInfo.title.replace(/^Chương\s*\d+[:.]?\s*/i, '')}` : 'Chưa phân loại'}
                    </button>
                    <span>&gt;</span>
                    <span className="text-cyan-900 font-black bg-cyan-50 px-2.5 py-0.5 rounded-lg border border-cyan-200 shadow-2xs flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-600" />
                      <span>{selectedLessonObj.name || selectedLessonObj.title}</span>
                    </span>
                  </>
                ) : selectedTopic ? (
                  <>
                    <button
                      onClick={() => setSelectedTopic('')}
                      className="hover:text-cyan-600 font-bold transition-colors cursor-pointer text-slate-700"
                    >
                      {activeChapterInfo.chapterNumber ? `Chương ${activeChapterInfo.chapterNumber}: ${activeChapterInfo.title.replace(/^Chương\s*\d+[:.]?\s*/i, '')}` : 'Chưa phân loại'}
                    </button>
                    <span>&gt;</span>
                    <span className="text-cyan-900 font-black bg-cyan-50 px-2.5 py-0.5 rounded-lg border border-cyan-200 shadow-2xs flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-600" />
                      <span>{selectedTopic}</span>
                    </span>
                  </>
                ) : (
                  <span className="text-slate-900 font-bold">
                    {activeChapterInfo.chapterNumber ? `Chương ${activeChapterInfo.chapterNumber}: ${activeChapterInfo.title.replace(/^Chương\s*\d+[:.]?\s*/i, '')}` : 'Chưa phân loại'}
                  </span>
                )}
              </div>

              {/* Contextual Back Button */}
              {selectedTopic ? (
                <button
                  onClick={() => setSelectedTopic('')}
                  className="px-3.5 py-1.5 bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border border-cyan-200 rounded-full text-xs font-bold flex items-center gap-1.5 transition-colors self-start cursor-pointer shadow-xs"
                  title={`Quay lại toàn bộ câu hỏi của ${activeChapterInfo.title}`}
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-cyan-600" />
                  <span>← {activeChapterInfo.chapterNumber ? `Chương ${activeChapterInfo.chapterNumber}: ${activeChapterInfo.title.replace(/^Chương\s*\d+[:.]?\s*/i, '')}` : activeChapterInfo.title}</span>
                </button>
              ) : (
                <button
                  onClick={() => handleSelectChapter(null)}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full text-xs font-bold flex items-center gap-1.5 transition-colors self-start cursor-pointer"
                  title="Quay lại danh sách 7 chương"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>← Quay lại 7 Chương</span>
                </button>
              )}
            </div>

            {/* Chapter Header Overview */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5">
                  {activeChapterInfo.chapterNumber && (
                    <span className="px-3 py-1 bg-cyan-100 text-cyan-900 rounded-full text-xs font-black uppercase tracking-wide border border-cyan-200">
                      CHƯƠNG {activeChapterInfo.chapterNumber}
                    </span>
                  )}
                  <h2 className="text-lg sm:text-xl font-black text-slate-900">
                    {activeChapterInfo.title}
                  </h2>
                </div>
                {activeChapterInfo.description && (
                  <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-3xl">
                    {activeChapterInfo.description}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => onNavigate('add_question', { preselectedChapterId: activeChapterId })}
                  className="px-3.5 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-full text-xs font-bold flex items-center gap-1.5 shadow-xs uppercase tracking-wide transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Thêm câu vào chương này</span>
                </button>
                <button
                  onClick={() => onNavigate('ai_generator', { preselectedChapterId: activeChapterId })}
                  className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-full text-xs font-bold flex items-center gap-1.5 shadow-xs uppercase tracking-wide transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>AI Tạo câu cho chương này</span>
                </button>
              </div>
            </div>
          </div>

          {/* FILTER MATRIX FOR ACTIVE CHAPTER */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            {/* Search input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm kiếm câu hỏi trong chương này theo từ khóa, nội dung, công thức (ví dụ: Na, H2SO4, orbital, Z=11, Enthalpy)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:bg-white transition-all"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* VISIBLE LESSON FILTER TABS (CÁC ĐƠN VỊ BÀI HỌC CỦA CHƯƠNG) */}
            {activeChapterInfo.lessons && activeChapterInfo.lessons.length > 0 && (
              <div className="pt-2 border-t border-slate-100">
                <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-cyan-600" />
                    <span>Chọn nhanh Đơn vị bài học ({activeChapterInfo.lessons.length} bài):</span>
                  </span>
                  {selectedTopic && (
                    <button
                      onClick={() => setSelectedTopic('')}
                      className="text-[11px] font-bold text-cyan-700 hover:text-cyan-900 underline cursor-pointer"
                    >
                      Bỏ chọn lọc bài (xem tất cả)
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setSelectedTopic('')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      !selectedTopic
                        ? 'bg-cyan-600 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    <span>Tất cả bài học</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${!selectedTopic ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'}`}>
                      {questions.filter(q => normalizeChapterId(q.chapterId || q.chapterTitle) === activeChapterId).length}
                    </span>
                  </button>

                  {activeChapterInfo.lessons.map((lesson, lIdx) => {
                    const isLessonSelected = selectedTopic === lesson.id || (selectedLessonObj && selectedLessonObj.id === lesson.id);
                    const lessonQuestionsCount = questions.filter(q => {
                      if (normalizeChapterId(q.chapterId || q.chapterTitle) !== activeChapterId) return false;
                      return getQuestionCanonicalLessonId(q, activeChapterId) === lesson.id;
                    }).length;

                    return (
                      <button
                        key={lesson.id}
                        onClick={() => setSelectedTopic(lesson.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                          isLessonSelected
                            ? 'bg-cyan-700 text-white shadow-xs ring-2 ring-cyan-400 font-bold'
                            : 'bg-slate-50 hover:bg-cyan-50/80 hover:text-cyan-900 text-slate-700 border border-slate-200 font-medium'
                        }`}
                      >
                        <span className={`w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center ${
                          isLessonSelected ? 'bg-white/30 text-white' : 'bg-slate-200 text-slate-700'
                        }`}>
                          {lIdx + 1}
                        </span>
                        <span>{lesson.name || lesson.title}</span>
                        {isLessonSelected && (
                          <span className="px-1.5 py-0.2 rounded-md text-[9px] font-black uppercase tracking-wider bg-white/20 text-white">
                            ĐANG CHỌN
                          </span>
                        )}
                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                          isLessonSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                        }`}>
                          {lessonQuestionsCount}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Dropdown Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
              {/* Topic Filter */}
              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Chủ đề / Bài học</label>
                <select
                  value={selectedTopic}
                  onChange={(e) => setSelectedTopic(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-medium"
                >
                  <option value="">Tất cả chủ đề</option>
                  {activeChapterInfo.lessons.map(l => (
                    <optgroup key={l.id} label={l.title}>
                      <option value={l.id}>Toàn bài: {l.title}</option>
                      {l.topics.map(t => (
                        <option key={t} value={t}>— {t}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              {/* Level Filter */}
              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Mức độ nhận thức</label>
                <select
                  value={selectedLevel}
                  onChange={(e) => setSelectedLevel(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-medium"
                >
                  <option value="">Tất cả mức độ</option>
                  <option value="nhan_biet">1. Nhận biết</option>
                  <option value="thong_hieu">2. Thông hiểu</option>
                  <option value="van_dung">3. Vận dụng</option>
                  <option value="van_dung_cao">4. Vận dụng cao</option>
                </select>
              </div>

              {/* Question Type Filter */}
              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Dạng câu hỏi</label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-medium"
                >
                  <option value="">Tất cả dạng câu</option>
                  <option value="multiple_choice">Trắc nghiệm 4 lựa chọn</option>
                  <option value="true_false">Đúng / Sai 4 ý</option>
                  <option value="short_answer">Trả lời ngắn</option>
                  <option value="essay">Tự luận</option>
                  <option value="calculation">Bài toán tính toán</option>
                  <option value="equation_balance">Cân bằng PTHH</option>
                  <option value="identification">Nhận biết chất</option>
                  <option value="experiment">Thí nghiệm & Hiện tượng</option>
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Trạng thái duyệt</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-medium"
                >
                  <option value="">Tất cả trạng thái</option>
                  <option value="APPROVED">Đã duyệt</option>
                  <option value="DRAFT">Chờ duyệt</option>
                  <option value="REJECTED">Từ chối</option>
                </select>
              </div>

              {/* Source Filter */}
              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Nguồn câu hỏi</label>
                <select
                  value={selectedSource}
                  onChange={(e) => setSelectedSource(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-medium"
                >
                  <option value="">Tất cả nguồn</option>
                  <option value="TEACHER">Giáo viên nhập</option>
                  <option value="AI">AI tạo</option>
                  <option value="EXCEL">Import Excel</option>
                  <option value="WORD">Import Word</option>
                </select>
              </div>
            </div>

            {/* Active Filters Summary & Reset */}
            {(selectedTopic || selectedLevel || selectedType || selectedStatus || selectedSource || searchTerm) && (
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                <span className="text-slate-500 font-medium">
                  Hiển thị <strong className="text-slate-900">{currentChapterQuestions.length}</strong> kết quả phù hợp
                </span>
                <button
                  onClick={() => {
                    setSelectedTopic('');
                    setSelectedLevel('');
                    setSelectedType('');
                    setSelectedStatus('');
                    setSelectedSource('');
                    setSearchTerm('');
                  }}
                  className="text-cyan-600 hover:text-cyan-700 font-bold flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Xóa tất cả bộ lọc</span>
                </button>
              </div>
            )}

            {/* BATCH ACTION BAR (WHEN QUESTIONS ARE SELECTED) */}
            {selectedQuestionIds.length > 0 && (
              <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-cyan-50/90 border border-cyan-200 p-4 rounded-xl">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-cyan-950">
                    Đã chọn <strong className="text-cyan-700 text-sm font-black">{selectedQuestionIds.length}</strong> câu hỏi
                  </span>
                  <button
                    onClick={selectAllCurrent}
                    className="text-[11px] text-cyan-700 hover:underline font-bold"
                  >
                    {currentChapterQuestions.every(q => selectedQuestionIds.includes(q.id)) ? 'Bỏ chọn trang này' : 'Chọn tất cả trong chương này'}
                  </button>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={handleBatchApprove}
                    disabled={batchActionLoading}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs transition-all disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Duyệt đã chọn</span>
                  </button>

                  <button
                    onClick={handleBatchSetDraft}
                    disabled={batchActionLoading}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs transition-all disabled:opacity-50"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Chờ duyệt</span>
                  </button>

                  <button
                    onClick={() => setBatchChapterModalOpen(true)}
                    disabled={batchActionLoading}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs transition-all disabled:opacity-50"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span>Đổi chương</span>
                  </button>

                  <button
                    onClick={() => onNavigate('create_set', { preselectedIds: selectedQuestionIds })}
                    className="px-3 py-1.5 bg-cyan-700 hover:bg-cyan-800 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs transition-all"
                  >
                    <span>Tạo đề ôn tập →</span>
                  </button>

                  <button
                    id="btn-bulk-delete-questions"
                    onClick={requestBatchDelete}
                    disabled={batchActionLoading}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all disabled:opacity-50"
                    title="Xóa các câu đã chọn khỏi ngân hàng"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{batchActionLoading ? 'Đang xóa...' : `Xóa hàng loạt (${selectedQuestionIds.length})`}</span>
                  </button>

                  <button
                    onClick={() => setSelectedQuestionIds([])}
                    className="px-2.5 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors"
                  >
                    Bỏ chọn
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* QUESTIONS LIST */}
          {loading ? (
            <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-cyan-600" />
              <span>Đang tải danh sách câu hỏi...</span>
            </div>
          ) : currentChapterQuestions.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
              <AlertCircle className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">Không có câu hỏi nào phù hợp với bộ lọc</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Chương này hiện chưa có câu hỏi hoặc các câu hỏi không thỏa mãn điều kiện tìm kiếm. Hãy thử thêm câu hỏi mới hoặc tạo bằng AI.
              </p>
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  onClick={() => onNavigate('add_question', { preselectedChapterId: activeChapterId })}
                  className="px-4 py-2 bg-cyan-600 text-white text-xs font-bold rounded-xl hover:bg-cyan-700"
                >
                  + Thêm câu hỏi
                </button>
                <button
                  onClick={() => onNavigate('ai_generator', { preselectedChapterId: activeChapterId })}
                  className="px-4 py-2 bg-purple-600 text-white text-xs font-bold rounded-xl hover:bg-purple-700"
                >
                   AI Tạo câu hỏi
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* MASTER SELECT ALL HEADER BAR */}
              <div className="bg-white px-5 py-3 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="select-all-current-questions-checkbox"
                    checked={currentChapterQuestions.length > 0 && currentChapterQuestions.every(q => selectedQuestionIds.includes(q.id))}
                    ref={el => {
                      if (el) {
                        const someSelected = currentChapterQuestions.some(q => selectedQuestionIds.includes(q.id));
                        const allSelected = currentChapterQuestions.length > 0 && currentChapterQuestions.every(q => selectedQuestionIds.includes(q.id));
                        el.indeterminate = someSelected && !allSelected;
                      }
                    }}
                    onChange={selectAllCurrent}
                    className="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                  />
                  <label htmlFor="select-all-current-questions-checkbox" className="font-bold text-slate-800 cursor-pointer select-none">
                    Chọn tất cả ({currentChapterQuestions.length} câu hỏi hiển thị)
                  </label>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-slate-500">
                    {selectedQuestionIds.length > 0 ? (
                      <span className="text-cyan-700 font-bold">Đã chọn {selectedQuestionIds.length} câu</span>
                    ) : (
                      <span>Chưa chọn câu nào</span>
                    )}
                  </span>
                  {selectedQuestionIds.length > 0 && (
                    <button
                      onClick={() => setSelectedQuestionIds([])}
                      className="text-slate-400 hover:text-slate-600 font-medium underline text-[11px]"
                    >
                      Bỏ chọn tất cả
                    </button>
                  )}
                </div>
              </div>

              {currentChapterQuestions.map((q, idx) => {
                const isSelected = selectedQuestionIds.includes(q.id);

                return (
                  <div
                    key={q.id}
                    id={`question-card-${q.id}`}
                    className={`bg-white rounded-2xl border transition-all p-5 shadow-xs hover:border-slate-300 ${
                      isSelected ? 'border-cyan-500 ring-1 ring-cyan-500 bg-cyan-50/20' : 'border-slate-200'
                    }`}
                  >
                    {/* Top Row: Checkbox + Number + Badges + Topic */}
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-3 border-b border-slate-100 text-xs">
                      <div className="flex items-center gap-2 flex-wrap">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(q.id)}
                          className="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                        />
                        <span className="font-bold text-slate-800">Câu #{idx + 1}</span>
                        {getLevelBadge(q.level)}
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                          {getTypeLabel(q.type)}
                        </span>
                        {getStatusBadge(q.status)}
                        {getSourceBadge(q)}
                      </div>

                      <div className="flex items-center gap-2 text-[11px] font-medium flex-wrap">
                        <span className="px-2.5 py-0.5 rounded-full bg-cyan-50 text-cyan-800 border border-cyan-200 font-bold flex items-center gap-1">
                          <BookOpen className="w-3 h-3 text-cyan-600" />
                          <span>{q.lessonName || getLessonName(q.chapterId, q.lessonId) || q.lessonTitle || 'Bài học'}</span>
                        </span>
                        {q.topic && q.topic !== (q.lessonName || q.lessonTitle) && (
                          <span className="text-slate-500 flex items-center gap-1">
                            <Tag className="w-3 h-3 text-slate-400" />
                            <span>{q.topic}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Question Content */}
                    <div className="text-slate-900 text-sm sm:text-base font-medium leading-relaxed mb-4 whitespace-pre-line">
                      <MathRenderer content={q.content} />
                    </div>

                    {/* Question Image if present */}
                    {q.imageUrl && (
                      <div className="mb-4">
                        <img 
                          src={q.imageUrl} 
                          alt="Hình ảnh minh họa câu hỏi" 
                          className="max-h-60 rounded-xl border border-slate-200 object-contain bg-white p-1 shadow-xs"
                        />
                      </div>
                    )}

                    {/* Data Given if present */}
                    {q.dataGiven && (
                      <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-900 mb-4 font-mono">
                        <strong>Dữ kiện:</strong> <MathRenderer content={q.dataGiven} />
                      </div>
                    )}

                    {/* Options rendering for Multiple Choice & True/False */}
                    {q.options && q.options.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                        {q.options.map((opt) => {
                          const isMultipleChoiceCorrect = q.type === 'multiple_choice' && q.correctAnswer === opt.id;
                          
                          // For true_false
                          let isTfCorrect = false;
                          if (q.type === 'true_false' && Array.isArray(q.correctAnswer)) {
                            const optIndex = ['a', 'b', 'c', 'd', 'A', 'B', 'C', 'D'].indexOf(opt.id);
                            if (optIndex >= 0 && q.correctAnswer[optIndex % 4] !== undefined) {
                              isTfCorrect = Boolean(q.correctAnswer[optIndex % 4]);
                            }
                          }

                          return (
                            <div
                              key={opt.id}
                              className={`p-2.5 rounded-xl border text-xs sm:text-sm flex items-start gap-2 ${
                                isMultipleChoiceCorrect
                                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold'
                                  : 'bg-slate-50/70 border-slate-200 text-slate-700'
                              }`}
                            >
                              <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                                isMultipleChoiceCorrect
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-slate-200 text-slate-600'
                              }`}>
                                {opt.id}
                              </span>
                              <div className="leading-snug flex-1">
                                <MathRenderer content={opt.text} />
                              </div>
                              {q.type === 'true_false' && (
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 ${
                                  isTfCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                }`}>
                                  {isTfCorrect ? 'ĐÚNG' : 'SAI'}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Correct Answer Display for Short Answer / Calculation */}
                    {(q.type === 'short_answer' || q.type === 'calculation' || q.type === 'equation_balance' || q.type === 'identification' || q.type === 'essay') && (
                      <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl text-xs text-emerald-900 mb-4 font-mono">
                        <strong>Đáp án chuẩn:</strong> {Array.isArray(q.correctAnswer) ? q.correctAnswer.join(', ') : String(q.correctAnswer)}
                      </div>
                    )}

                    {/* Explanation */}
                    {q.explanation && (
                      <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 mb-4 leading-relaxed">
                        <div className="font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Lời giải chi tiết:</span>
                        </div>
                        <div className="whitespace-pre-line">
                          <MathRenderer content={q.explanation} />
                        </div>
                      </div>
                    )}

                    {/* Keywords Tagging */}
                    {q.keywords && q.keywords.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap mb-3 text-[11px]">
                        <span className="text-slate-400 font-semibold">Từ khóa:</span>
                        {q.keywords.map(k => (
                          <span key={k} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md">
                            #{k}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Card Actions Bottom Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
                      <div className="text-slate-400 text-[11px]">
                        Tạo bởi: <strong className="text-slate-600">{q.creatorEmail || q.createdBy || 'Hệ thống'}</strong>
                        {q.createdAt && <span> • {new Date(q.createdAt).toLocaleDateString('vi-VN')}</span>}
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Quick View Button */}
                        <button
                          onClick={() => setDetailModalQuestion(q)}
                          className="px-2.5 py-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg font-semibold flex items-center gap-1 transition-colors"
                          title="Xem chi tiết câu hỏi"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Xem</span>
                        </button>

                        {/* Quick Copy Button */}
                        <button
                          onClick={() => handleCopyContent(q)}
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Sao chép nội dung"
                        >
                          {copiedId === q.id ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                        </button>

                        {/* Quick Toggle Approve Button */}
                        <button
                          onClick={() => handleToggleApprove(q)}
                          className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition-colors text-xs ${
                            q.status === 'APPROVED' || q.status === 'DEMO'
                              ? 'text-amber-700 hover:bg-amber-50 border border-amber-200'
                              : 'text-emerald-700 hover:bg-emerald-50 border border-emerald-200 bg-emerald-50/50'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{q.status === 'APPROVED' || q.status === 'DEMO' ? 'Bỏ duyệt' : 'Duyệt câu'}</span>
                        </button>

                        {/* Edit Button */}
                        <button
                          onClick={() => onNavigate('add_question', { editQuestion: q })}
                          className="px-2.5 py-1 text-cyan-700 hover:bg-cyan-50 rounded-lg font-bold flex items-center gap-1 transition-colors border border-cyan-200"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Sửa</span>
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={() => requestDeleteQuestion(q.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Xóa câu hỏi"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: SINGLE QUESTION DETAIL PREVIEW */}
      {/* ========================================================================= */}
      {detailModalQuestion && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 space-y-4 animate-scale-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900">Chi tiết câu hỏi</span>
                {getLevelBadge(detailModalQuestion.level)}
                {getStatusBadge(detailModalQuestion.status)}
              </div>
              <button
                onClick={() => setDetailModalQuestion(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs sm:text-sm">
              <div className="text-slate-500 font-semibold flex items-center gap-2">
                <span>Chương: <strong>{getChapterTitle(detailModalQuestion.chapterId)}</strong></span>
                {detailModalQuestion.topic && <span>• Chủ đề: <strong>{detailModalQuestion.topic}</strong></span>}
              </div>

              <div className="p-4 bg-slate-50 rounded-xl text-slate-900 font-medium leading-relaxed whitespace-pre-line border border-slate-200">
                {detailModalQuestion.content}
              </div>

              {detailModalQuestion.options && (
                <div className="space-y-2">
                  <div className="font-bold text-slate-700 text-xs uppercase tracking-wider">Các phương án lựa chọn:</div>
                  {detailModalQuestion.options.map(opt => (
                    <div
                      key={opt.id}
                      className={`p-2.5 rounded-xl border flex items-start gap-2 ${
                        detailModalQuestion.correctAnswer === opt.id
                          ? 'bg-emerald-50 border-emerald-300 font-bold text-emerald-900'
                          : 'bg-white border-slate-200 text-slate-700'
                      }`}
                    >
                      <span className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center font-bold text-xs shrink-0">
                        {opt.id}
                      </span>
                      <span>{opt.text}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900">
                <strong>Đáp án đúng:</strong> {Array.isArray(detailModalQuestion.correctAnswer) ? detailModalQuestion.correctAnswer.join(', ') : String(detailModalQuestion.correctAnswer)}
              </div>

              {detailModalQuestion.explanation && (
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 leading-relaxed">
                  <strong className="block text-slate-900 mb-1">Lời giải chi tiết:</strong>
                  {detailModalQuestion.explanation}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => {
                  const q = detailModalQuestion;
                  setDetailModalQuestion(null);
                  onNavigate('add_question', { editQuestion: q });
                }}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Chỉnh sửa câu hỏi này</span>
              </button>
              <button
                onClick={() => setDetailModalQuestion(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: BATCH CHANGE CHAPTER */}
      {/* ========================================================================= */}
      {batchChapterModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm sm:text-base font-black text-slate-900">
                Chuyển {selectedQuestionIds.length} câu hỏi sang Chương khác
              </h3>
              <button
                onClick={() => setBatchChapterModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-600">
                Chọn chương đích bạn muốn gán cho <strong>{selectedQuestionIds.length}</strong> câu hỏi đã chọn:
              </p>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Chương đích *</label>
                <select
                  value={targetBatchChapter}
                  onChange={(e) => {
                    const newCh = e.target.value;
                    setTargetBatchChapter(newCh);
                    const curCh = CHEMISTRY_10_CURRICULUM.find(c => c.id === newCh);
                    if (curCh && curCh.lessons.length > 0) {
                      setTargetBatchLesson(curCh.lessons[0].id);
                    }
                  }}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold focus:ring-2 focus:ring-cyan-500"
                >
                  {CHEMISTRY_10_CURRICULUM.map((c, idx) => (
                    <option key={c.id} value={c.id}>
                      CHƯƠNG {idx + 1}. {c.title.replace(/^Chương\s*\d+[:.]?\s*/i, '')}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Đơn vị bài học đích</label>
                <select
                  value={targetBatchLesson}
                  onChange={(e) => setTargetBatchLesson(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:ring-2 focus:ring-cyan-500"
                >
                  {(CHEMISTRY_10_CURRICULUM.find(c => c.id === targetBatchChapter)?.lessons || []).map((l, idx) => (
                    <option key={l.id} value={l.id}>
                      {idx + 1}. {l.name || l.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setBatchChapterModalOpen(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200"
              >
                Hủy
              </button>
              <button
                onClick={handleBatchChangeChapter}
                disabled={batchActionLoading}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs disabled:opacity-50"
              >
                <span>Xác nhận chuyển</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DELETE CONFIRMATION (100% Iframe-safe, does not rely on window.confirm) */}
      {deleteConfirmModal.isOpen && (
        <div 
          id="modal-confirm-delete"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
        >
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-scale-in">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 border border-red-200 flex items-center justify-center text-red-600 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-slate-900">
                  {deleteConfirmModal.isBatch 
                    ? `Xác nhận xóa ${deleteConfirmModal.ids.length} câu hỏi` 
                    : 'Xác nhận xóa câu hỏi'}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Thao tác này sẽ xóa vĩnh viễn dữ liệu câu hỏi và đáp án liên kết trên Firestore. Không thể hoàn tác.
                </p>
              </div>
            </div>

            {deleteConfirmModal.error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                <span className="flex-1">{deleteConfirmModal.error}</span>
              </div>
            )}

            <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-3 text-xs text-slate-600 space-y-1">
              <div className="font-semibold text-slate-800">Thông tin xóa:</div>
              {deleteConfirmModal.isBatch ? (
                <>
                  <div>Số lượng câu hỏi: <strong className="text-red-600 font-bold">{deleteConfirmModal.ids.length}</strong></div>
                  <div className="text-[11px] text-slate-400 truncate">
                    Mã câu hỏi: {deleteConfirmModal.ids.slice(0, 4).join(', ')}{deleteConfirmModal.ids.length > 4 ? ` (+${deleteConfirmModal.ids.length - 4} câu khác)` : ''}
                  </div>
                </>
              ) : (
                <div>
                  Mã câu hỏi: <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono text-[11px] text-slate-800">{deleteConfirmModal.ids[0]}</code>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                id="btn-cancel-delete-modal"
                type="button"
                disabled={deleteConfirmModal.loading}
                onClick={closeDeleteModal}
                className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
              >
                Hủy bỏ
              </button>
              <button
                id="btn-confirm-delete-modal"
                type="button"
                disabled={deleteConfirmModal.loading}
                onClick={executeDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                {deleteConfirmModal.loading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang xóa khỏi Firestore...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xác nhận xóa</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
