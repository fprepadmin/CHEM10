import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Users, 
  Plus, 
  Send, 
  Clock, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  Filter, 
  ChevronRight, 
  ChevronLeft, 
  Copy, 
  Lock, 
  Unlock, 
  RotateCcw, 
  Trash2, 
  Bell, 
  Eye, 
  Shuffle, 
  BarChart2, 
  TrendingUp, 
  Award, 
  UserCheck, 
  UserX, 
  HelpCircle, 
  FileText, 
  Layers, 
  X, 
  AlertTriangle,
  ArrowRight,
  Settings,
  Sparkles,
  Share2,
  CheckCircle,
  XCircle,
  Hourglass
} from 'lucide-react';
import { questionSetService, assignmentService, classService, submissionService, questionService } from '../services/dbService';
import { useAuth } from '../context/AuthContext';
import { QuestionSet, Assignment, ClassRoom, Submission, Question, AssignmentStatus } from '../types';
import { formatStudentAnswer, formatCorrectAnswer, isAnswerFilled } from '../utils/answerFormatting';
import { SubmissionDetailReview } from './SubmissionDetailReview';

interface AssignmentsManagerProps {
  onNavigate: (tab: string, param?: any) => void;
  initialClassId?: string;
  openSetId?: string;
}

export const AssignmentsManager: React.FC<AssignmentsManagerProps> = ({ onNavigate, initialClassId, openSetId }) => {
  const { user, isAdmin, isTeacher } = useAuth();
  
  // Data lists
  const [sets, setSets] = useState<QuestionSet[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  // Active view tab: 'active' | 'scheduled' | 'ended' | 'draft' | 'all' | 'create'
  const [activeTab, setActiveTab] = useState<'active' | 'scheduled' | 'ended' | 'draft' | 'all' | 'create'>('active');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState('ALL');

  // Creation Wizard state (5 Steps)
  const [wizardStep, setWizardStep] = useState<number>(1);
  const [wizardData, setWizardData] = useState<{
    title: string;
    questionSetId: string;
    targetType: 'CLASS' | 'STUDENTS';
    classIds: string[];
    targetStudentEmails: string[];
    excludedStudentEmails: string[];
    startAt: string;
    endAt: string;
    durationMinutes: number;
    maxAttempts: number;
    gradingMode: 'highest' | 'latest';
    shuffleQuestions: boolean;
    shuffleOptions: boolean;
    allowBackNavigation: boolean;
    showAnswers: 'none' | 'after_submit' | 'after_end' | 'with_solution';
    showSolutions: boolean;
    showScore: 'immediate' | 'manual_publish';
    instructions: string;
  }>({
    title: '',
    questionSetId: '',
    targetType: 'CLASS',
    classIds: [],
    targetStudentEmails: [],
    excludedStudentEmails: [],
    startAt: new Date().toISOString().slice(0, 16),
    endAt: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16),
    durationMinutes: 15,
    maxAttempts: 1,
    gradingMode: 'highest',
    shuffleQuestions: true,
    shuffleOptions: true,
    allowBackNavigation: true,
    showAnswers: 'after_submit',
    showSolutions: true,
    showScore: 'immediate',
    instructions: 'Đọc kỹ câu hỏi và làm bài nghiêm túc. Chúc các em đạt kết quả cao!'
  });

  // Modal states
  const [detailAssignment, setDetailAssignment] = useState<Assignment | null>(null);
  const [detailSubmissions, setDetailSubmissions] = useState<Submission[]>([]);
  const [selectedSubmissionView, setSelectedSubmissionView] = useState<Submission | null>(null);
  const [detailActiveTab, setDetailActiveTab] = useState<'students' | 'questions' | 'topics'>('students');
  const [isExtendModalOpen, setIsExtendModalOpen] = useState(false);
  const [extendDate, setExtendDate] = useState('');
  const [extendTargetAssignment, setExtendTargetAssignment] = useState<Assignment | null>(null);
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [reminderToast, setReminderToast] = useState<string | null>(null);

  // In-app Confirmation Modal State for reliable action execution without browser popup blocking
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    type: 'close' | 'delete';
    assignment: Assignment | null;
    title: string;
    message: string;
    isProcessing: boolean;
  }>({
    isOpen: false,
    type: 'close',
    assignment: null,
    title: '',
    message: '',
    isProcessing: false
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [s, a, c, sub, q] = await Promise.all([
        questionSetService.getSets(),
        assignmentService.getAssignments(),
        classService.getClasses(),
        submissionService.getAllSubmissions(),
        questionService.getQuestions()
      ]);
      setSets(s);
      setAssignments(a);
      setClasses(c);
      setSubmissions(sub);
      setAllQuestions(q);

      // Handle openSetId prop to instantly jump into wizard step 2 with selected exam set
      if (openSetId) {
        const targetSet = s.find(item => item.id === openSetId);
        if (targetSet) {
          setActiveTab('create');
          setWizardStep(2); // Jump to choosing class
          setWizardData(prev => ({
            ...prev,
            questionSetId: targetSet.id,
            title: `Kiểm tra - ${targetSet.title}`,
            durationMinutes: targetSet.durationMinutes || 15,
            classIds: initialClassId ? [initialClassId] : (c.length > 0 ? [c[0].id] : [])
          }));
        }
      } else if (s.length > 0 && !wizardData.questionSetId) {
        setWizardData(prev => ({
          ...prev,
          questionSetId: s[0].id,
          title: `Kiểm tra - ${s[0].title}`,
          classIds: initialClassId ? [initialClassId] : (c.length > 0 ? [c[0].id] : [])
        }));
      }

      if (initialClassId && !openSetId) {
        setActiveTab('create');
        setWizardStep(1);
        setWizardData(prev => ({
          ...prev,
          classIds: [initialClassId],
          targetType: 'CLASS'
        }));
      }
    } catch (e) {
      console.error("Error loading assignments data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Realtime synchronization: Listen to Firestore submissions so teacher receives new submissions and scores immediately without F5
    const unsubscribe = submissionService.subscribeToAllSubmissions(
      (liveSubmissions) => {
        setSubmissions(liveSubmissions);
      },
      (err) => {
        console.warn("[AssignmentsManager] Submissions realtime listener warning:", err);
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  // Update selected assignment details when changed
  useEffect(() => {
    if (detailAssignment) {
      const subs = submissions.filter(s => s.assignmentId === detailAssignment.id);
      setDetailSubmissions(subs);
    }
  }, [detailAssignment, submissions]);

  // Keep selectedSubmissionView in sync if open
  useEffect(() => {
    if (selectedSubmissionView) {
      const updated = submissions.find(s => s.id === selectedSubmissionView.id);
      if (updated && updated !== selectedSubmissionView) {
        setSelectedSubmissionView(updated);
      }
    }
  }, [submissions, selectedSubmissionView]);

  // Quick Action Handlers
  const handleOpenDetails = (assignment: Assignment) => {
    setDetailAssignment(assignment);
    const subs = submissions.filter(s => s.assignmentId === assignment.id);
    setDetailSubmissions(subs);
    setDetailActiveTab('students');
  };

  const canManageAssignment = (assignment: Assignment) => {
    if (!user) return false;
    if (isAdmin || user.role === 'admin') return true;
    if (isTeacher || user.role === 'teacher') {
      if (!assignment.teacherId && !assignment.teacherEmail) return true;
      return assignment.teacherId === user.uid || assignment.teacherEmail === user.email;
    }
    return false;
  };

  const handleDuplicate = async (assignment: Assignment) => {
    try {
      await assignmentService.duplicateAssignment(
        assignment.id,
        user?.uid,
        user?.email || '',
        user?.displayName || 'Giáo viên'
      );
      setReminderToast(`Đã nhân bản bài "${assignment.title}" thành công!`);
      loadData();
    } catch (e) {
      console.error(e);
      alert("Lỗi khi nhân bản bài giao");
    }
  };

  const handleOpenCloseConfirm = (assignment: Assignment, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!canManageAssignment(assignment)) {
      alert("Bạn không có quyền đóng bài giao này.");
      return;
    }
    setConfirmDialog({
      isOpen: true,
      type: 'close',
      assignment,
      title: 'Xác nhận Đóng bài kiểm tra',
      message: 'Bạn có chắc chắn muốn đóng bài giao này không? Học sinh sẽ không thể tiếp tục làm hoặc nộp bài cho Assignment này.',
      isProcessing: false
    });
  };

  const handleOpenDeleteConfirm = (assignment: Assignment, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!canManageAssignment(assignment)) {
      alert("Bạn không có quyền xóa bài giao này.");
      return;
    }
    setConfirmDialog({
      isOpen: true,
      type: 'delete',
      assignment,
      title: 'Xác nhận Xóa bài giao',
      message: 'Xóa bài giao này? Assignment sẽ được loại khỏi danh sách giao bài. Question Set, câu hỏi và dữ liệu bài làm của học sinh sẽ được bảo toàn.',
      isProcessing: false
    });
  };

  const handleExecuteConfirmAction = async () => {
    const { type, assignment } = confirmDialog;
    if (!assignment) {
      setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      return;
    }

    setConfirmDialog(prev => ({ ...prev, isProcessing: true }));

    if (type === 'close') {
      // 1. Optimistic UI update
      setAssignments(prev => prev.map(item => item.id === assignment.id ? { ...item, status: 'CLOSED' as const } : item));
      if (detailAssignment?.id === assignment.id) {
        setDetailAssignment(prev => prev ? { ...prev, status: 'CLOSED' as const } : null);
      }

      try {
        await assignmentService.closeAssignment(assignment.id);
        setReminderToast("Đã đóng bài giao thành công! Học sinh không thể tiếp tục nộp bài.");
        await loadData();
      } catch (err) {
        console.error("Lỗi khi đóng bài:", err);
        setReminderToast("Có lỗi xảy ra khi đóng bài giao.");
      } finally {
        setConfirmDialog({ isOpen: false, type: 'close', assignment: null, title: '', message: '', isProcessing: false });
      }
    } else if (type === 'delete') {
      // 1. Optimistic UI removal
      setAssignments(prev => prev.filter(item => item.id !== assignment.id));
      if (detailAssignment?.id === assignment.id) {
        setDetailAssignment(null);
      }

      try {
        await assignmentService.deleteAssignment(assignment.id);
        setReminderToast("Đã xóa bài giao thành công! Ngân hàng câu hỏi và bài nộp được bảo toàn.");
        await loadData();
      } catch (err) {
        console.error("Lỗi khi xóa bài:", err);
        setReminderToast("Có lỗi xảy ra khi xóa bài giao.");
      } finally {
        setConfirmDialog({ isOpen: false, type: 'delete', assignment: null, title: '', message: '', isProcessing: false });
      }
    }
  };

  const handleOpenExtend = (assignment: Assignment) => {
    setExtendTargetAssignment(assignment);
    const defaultNewEnd = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 16);
    setExtendDate(defaultNewEnd);
    setIsExtendModalOpen(true);
  };

  const handleConfirmExtend = async () => {
    if (!extendTargetAssignment || !extendDate) return;
    await assignmentService.extendAssignment(extendTargetAssignment.id, extendDate);
    setIsExtendModalOpen(false);
    setReminderToast(`Đã gia hạn bài kiểm tra đến: ${extendDate.replace('T', ' ')}`);
    loadData();
    if (detailAssignment?.id === extendTargetAssignment.id) {
      setDetailAssignment(prev => prev ? { ...prev, endAt: extendDate, status: 'ACTIVE' } : null);
    }
  };

  const handleTogglePublishScore = async (assignment: Assignment) => {
    const newState = !assignment.isScorePublished;
    await assignmentService.publishScores(assignment.id, newState);
    setReminderToast(newState ? "Đã công bố điểm cho toàn bộ học sinh!" : "Đã thu hồi quyền xem điểm.");
    loadData();
    if (detailAssignment?.id === assignment.id) {
      setDetailAssignment(prev => prev ? { ...prev, isScorePublished: newState } : null);
    }
  };

  // Wizard Handlers
  const handleSelectQuestionSet = (setId: string) => {
    const selected = sets.find(s => s.id === setId);
    setWizardData(prev => ({
      ...prev,
      questionSetId: setId,
      title: prev.title || `Kiểm tra - ${selected?.title || ''}`,
      durationMinutes: selected?.durationMinutes || 15
    }));
  };

  const handleToggleClass = (classId: string) => {
    setWizardData(prev => {
      const exists = prev.classIds.includes(classId);
      const newClassIds = exists ? prev.classIds.filter(id => id !== classId) : [...prev.classIds, classId];
      return { ...prev, classIds: newClassIds };
    });
  };

  const handleToggleExcludeStudent = (email: string) => {
    setWizardData(prev => {
      const exists = prev.excludedStudentEmails.includes(email);
      const newExcluded = exists 
        ? prev.excludedStudentEmails.filter(e => e !== email) 
        : [...prev.excludedStudentEmails, email];
      return { ...prev, excludedStudentEmails: newExcluded };
    });
  };

  const handleCreateAssignmentSubmit = async (isDraft = false) => {
    if (!wizardData.title.trim()) {
      alert("Vui lòng nhập tên bài giao!");
      return;
    }
    if (!wizardData.questionSetId) {
      alert("Vui lòng chọn bộ đề kiểm tra!");
      return;
    }
    if (wizardData.targetType === 'CLASS' && wizardData.classIds.length === 0) {
      alert("Vui lòng chọn ít nhất một lớp học!");
      return;
    }
    if (new Date(wizardData.endAt).getTime() <= new Date(wizardData.startAt).getTime()) {
      alert("Thời gian kết thúc phải lớn hơn thời gian bắt đầu!");
      return;
    }

    const selectedClasses = classes.filter(c => wizardData.classIds.includes(c.id));
    const classNameCombined = selectedClasses.map(c => c.name).join(', ') || 'Lớp học';
    
    // Collect target student emails
    let targetEmails: string[] = [];
    selectedClasses.forEach(c => {
      if (c.studentEmails) targetEmails.push(...c.studentEmails);
    });

    const startTs = new Date(wizardData.startAt).getTime();
    const nowTs = Date.now();
    let initialStatus: AssignmentStatus = isDraft ? 'DRAFT' : (startTs > nowTs ? 'SCHEDULED' : 'ACTIVE');

    try {
      await assignmentService.createAssignment({
        title: wizardData.title,
        questionSetId: wizardData.questionSetId,
        teacherId: user?.uid,
        teacherEmail: user?.email || 'muoint@fpt.edu.vn',
        teacherName: user?.displayName || 'Nguyễn Tuyền Muội',
        targetType: wizardData.targetType,
        classIds: wizardData.classIds,
        classId: wizardData.classIds[0] || '',
        className: classNameCombined,
        targetStudentEmails: targetEmails,
        excludedStudentEmails: wizardData.excludedStudentEmails,
        startAt: wizardData.startAt,
        openTime: wizardData.startAt.split('T')[0],
        endAt: wizardData.endAt,
        deadline: wizardData.endAt.split('T')[0],
        durationMinutes: wizardData.durationMinutes,
        maxAttempts: wizardData.maxAttempts,
        gradingMode: wizardData.gradingMode,
        shuffleQuestions: wizardData.shuffleQuestions,
        shuffleOptions: wizardData.shuffleOptions,
        allowBackNavigation: wizardData.allowBackNavigation,
        showAnswers: wizardData.showAnswers,
        showSolutions: wizardData.showSolutions,
        showScore: wizardData.showScore,
        isScorePublished: wizardData.showScore === 'immediate',
        allowReviewAnswers: wizardData.showAnswers !== 'none',
        instructions: wizardData.instructions,
        status: initialStatus,
        createdAt: new Date().toISOString()
      });

      setReminderToast(isDraft ? "Đã lưu bản nháp bài giao!" : "Giao bài thành công cho học sinh!");
      setActiveTab(isDraft ? 'draft' : 'active');
      setWizardStep(1);
      loadData();
    } catch (e) {
      console.error(e);
      alert("Lỗi khi tạo bài giao");
    }
  };

  // Filtered assignments list
  const filteredAssignments = assignments.filter(a => {
    // Status Filter
    const st = (a.status || 'ACTIVE').toUpperCase();
    if (activeTab === 'active' && st !== 'ACTIVE') return false;
    if (activeTab === 'scheduled' && st !== 'SCHEDULED') return false;
    if (activeTab === 'ended' && st !== 'ENDED' && st !== 'CLOSED') return false;
    if (activeTab === 'draft' && st !== 'DRAFT') return false;

    // Search filter
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      const matchTitle = a.title.toLowerCase().includes(s);
      const matchClass = a.className?.toLowerCase().includes(s);
      const matchTeacher = a.teacherName?.toLowerCase().includes(s);
      if (!matchTitle && !matchClass && !matchTeacher) return false;
    }

    // Class Filter
    if (selectedClassFilter !== 'ALL') {
      if (a.classId !== selectedClassFilter && (!a.classIds || !a.classIds.includes(selectedClassFilter))) {
        return false;
      }
    }

    return true;
  });

  // Calculate high-level stats
  const activeCount = assignments.filter(a => (a.status || 'ACTIVE').toUpperCase() === 'ACTIVE').length;
  const scheduledCount = assignments.filter(a => (a.status || '').toUpperCase() === 'SCHEDULED').length;
  const endedCount = assignments.filter(a => {
    const s = (a.status || '').toUpperCase();
    return s === 'ENDED' || s === 'CLOSED';
  }).length;
  const draftCount = assignments.filter(a => (a.status || '').toUpperCase() === 'DRAFT').length;

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-12">
      {/* Toast Notification */}
      {reminderToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-slate-700 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-cyan-400" />
          <span className="text-xs font-semibold">{reminderToast}</span>
          <button onClick={() => setReminderToast(null)} className="ml-2 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Banner & Stats */}
      <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-cyan-50 text-cyan-800 border border-cyan-200 mb-2">
            <Layers className="w-3.5 h-3.5" />
            <span>Phân hệ Quản lý Giao bài & Đánh giá CHEM10</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Quản lý Giao bài & Giám sát Kiểm tra
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Giao bài 15 phút, 45 phút, ôn tập chương. Tự động xáo trộn đề, phân quyền nộp bài, phân tích kiến thức và tỷ lệ đúng từng câu hỏi.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => {
              setActiveTab('create');
              setWizardStep(1);
            }}
            className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-full text-xs shadow-md shadow-cyan-600/20 uppercase tracking-wide transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo giao bài mới</span>
          </button>
          <button
            onClick={() => onNavigate('create_set')}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-full text-xs uppercase tracking-wide transition-all flex items-center gap-1.5"
          >
            <BookOpen className="w-4 h-4 text-slate-500" />
            <span>Tạo bộ đề</span>
          </button>
        </div>
      </div>

      {/* High-level KPI Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div 
          onClick={() => setActiveTab('active')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'active' ? 'bg-cyan-50/80 border-cyan-400 ring-2 ring-cyan-400/20' : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span className="font-bold uppercase text-[10px] tracking-wider">Đang mở (Active)</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div className="text-2xl font-black text-slate-900">{activeCount}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Bài đang làm bài</div>
        </div>

        <div 
          onClick={() => setActiveTab('scheduled')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'scheduled' ? 'bg-cyan-50/80 border-cyan-400 ring-2 ring-cyan-400/20' : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span className="font-bold uppercase text-[10px] tracking-wider">Sắp diễn ra</span>
            <Clock className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">{scheduledCount}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Đã lên lịch mở</div>
        </div>

        <div 
          onClick={() => setActiveTab('ended')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'ended' ? 'bg-cyan-50/80 border-cyan-400 ring-2 ring-cyan-400/20' : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span className="font-bold uppercase text-[10px] tracking-wider">Đã kết thúc / Đóng</span>
            <Lock className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900">{endedCount}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Đã chốt kết quả</div>
        </div>

        <div 
          onClick={() => setActiveTab('all')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'all' ? 'bg-cyan-50/80 border-cyan-400 ring-2 ring-cyan-400/20' : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span className="font-bold uppercase text-[10px] tracking-wider">Tổng lượt nộp</span>
            <BarChart2 className="w-3.5 h-3.5 text-cyan-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{submissions.length}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Bài thi học sinh</div>
        </div>
      </div>

      {/* Main Tabs Navigation & Search Filters */}
      {activeTab !== 'create' && (
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Tab Pills */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 lg:pb-0">
              <button
                onClick={() => setActiveTab('active')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1.5 uppercase tracking-wide ${
                  activeTab === 'active' ? 'bg-cyan-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>Đang mở</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">{activeCount}</span>
              </button>

              <button
                onClick={() => setActiveTab('scheduled')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1.5 uppercase tracking-wide ${
                  activeTab === 'scheduled' ? 'bg-cyan-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>Sắp tới</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">{scheduledCount}</span>
              </button>

              <button
                onClick={() => setActiveTab('ended')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1.5 uppercase tracking-wide ${
                  activeTab === 'ended' ? 'bg-cyan-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>Đã kết thúc</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">{endedCount}</span>
              </button>

              <button
                onClick={() => setActiveTab('draft')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1.5 uppercase tracking-wide ${
                  activeTab === 'draft' ? 'bg-cyan-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>Bản nháp</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">{draftCount}</span>
              </button>

              <button
                onClick={() => setActiveTab('all')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1.5 uppercase tracking-wide ${
                  activeTab === 'all' ? 'bg-cyan-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>Tất cả ({assignments.length})</span>
              </button>
            </div>

            {/* Search & Filter Controls */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Tìm theo tên bài, lớp..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-full focus:bg-white focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <select
                value={selectedClassFilter}
                onChange={(e) => setSelectedClassFilter(e.target.value)}
                className="py-1.5 px-3 text-xs bg-slate-50 border border-slate-200 rounded-full focus:ring-2 focus:ring-cyan-500 text-slate-700 font-medium"
              >
                <option value="ALL">Tất cả lớp</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Assignments Grid List */}
          {filteredAssignments.length === 0 ? (
            <div className="p-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-3">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto text-slate-400 shadow-xs">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-700">Chưa có bài giao nào trong danh mục này</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Bấm vào nút "Tạo giao bài mới" bên trên để giao bài kiểm tra cho học sinh.
              </p>
              <button
                onClick={() => {
                  setActiveTab('create');
                  setWizardStep(1);
                }}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-full text-xs font-bold shadow-xs uppercase tracking-wide"
              >
                + Bắt đầu tạo bài giao
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {filteredAssignments.map(a => {
                const subs = submissions.filter(s => s.assignmentId === a.id);
                const isEnded = a.status === 'ENDED' || a.status === 'CLOSED';
                const isScheduled = a.status === 'SCHEDULED';
                const isDraft = a.status === 'DRAFT';

                return (
                  <div
                    key={a.id}
                    className="p-5 bg-white border border-slate-200 rounded-2xl hover:border-slate-300 hover:shadow-xs transition-all flex flex-col justify-between space-y-4"
                  >
                    <div>
                      {/* Status Badges & Class */}
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-800 border border-slate-200">
                            {a.className || 'Khối 10'}
                          </span>
                          {isScheduled && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-50 text-amber-800 border border-amber-200">
                              Sắp mở
                            </span>
                          )}
                          {isEnded && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-600 border border-slate-200">
                              {a.status === 'CLOSED' ? 'Đã đóng' : 'Đã hết hạn'}
                            </span>
                          )}
                          {!isScheduled && !isEnded && !isDraft && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                              Đang mở
                            </span>
                          )}
                          {isDraft && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-purple-50 text-purple-800 border border-purple-200">
                              Bản nháp
                            </span>
                          )}
                        </div>

                        <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {a.durationMinutes === 0 ? 'Tự do' : `${a.durationMinutes} phút`}
                        </span>
                      </div>

                      {/* Title */}
                      <h3 className="text-sm font-bold text-slate-900 leading-snug mb-1">
                        {a.title}
                      </h3>

                      {/* Timing details */}
                      <div className="text-xs text-slate-500 space-y-1 mb-3">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>Hạn nộp: <strong className="text-slate-800">{a.endAt ? a.endAt.replace('T', ' ') : a.deadline}</strong></span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-slate-400">
                          <span>Số lần làm: {a.maxAttempts > 10 ? 'Không giới hạn' : `${a.maxAttempts} lần`}</span>
                          <span>•</span>
                          <span>Trộn câu hỏi: {a.shuffleQuestions ? 'Có' : 'Không'}</span>
                        </div>
                      </div>

                      {/* Submissions Mini Bar */}
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                        <span className="text-slate-600 font-medium">Học sinh đã nộp:</span>
                        <span className="font-bold text-slate-900">
                          {subs.length} lượt nộp
                        </span>
                      </div>
                    </div>

                    {/* Bottom Action Row */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenDetails(a)}
                          className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-full text-xs font-bold flex items-center gap-1.5 uppercase tracking-wide transition-all shadow-xs"
                        >
                          <BarChart2 className="w-3.5 h-3.5" />
                          <span>Giám sát & Chấm điểm</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Action: Đóng bài (Cho ACTIVE và SCHEDULED) */}
                        {(a.status === 'ACTIVE' || isScheduled) && canManageAssignment(a) && (
                          <button
                            onClick={(e) => handleOpenCloseConfirm(a, e)}
                            title="Đóng bài đã giao (Học sinh không thể làm tiếp)"
                            className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-full text-xs font-bold flex items-center gap-1 transition-colors shadow-2xs cursor-pointer"
                          >
                            <Lock className="w-3.5 h-3.5 text-amber-700" />
                            <span>Đóng bài</span>
                          </button>
                        )}

                        {/* Action: Xóa bài giao (Cho mọi trạng thái) */}
                        {canManageAssignment(a) && (
                          <button
                            onClick={(e) => handleOpenDeleteConfirm(a, e)}
                            title="Xóa bài giao (Bảo toàn dữ liệu học sinh và đề thi)"
                            className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-full text-xs font-bold flex items-center gap-1 transition-colors shadow-2xs cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                            <span>Xóa</span>
                          </button>
                        )}

                        {/* Action: Gia hạn thời gian */}
                        <button
                          onClick={() => handleOpenExtend(a)}
                          title="Gia hạn thời gian nộp bài"
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <Hourglass className="w-4 h-4" />
                        </button>

                        {/* Action: Sao chép bài giao */}
                        <button
                          onClick={() => handleDuplicate(a)}
                          title="Sao chép bài giao"
                          className="p-1.5 text-slate-500 hover:text-cyan-600 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <Copy className="w-4 h-4" />
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
      {/* 5-STEP ASSIGNMENT CREATION WIZARD (TẠO GIAO BÀI MỚI) */}
      {/* ========================================================================= */}
      {activeTab === 'create' && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs space-y-6 animate-fade-in">
          {/* Top Wizard Navigation */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
                Tạo giao bài kiểm tra / Ôn tập mới
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Thiết lập cấu hình giao bài cho học sinh qua 5 bước tiêu chuẩn
              </p>
            </div>

            <button
              onClick={() => setActiveTab('active')}
              className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full text-xs font-bold uppercase tracking-wide"
            >
              Hủy bỏ
            </button>
          </div>

          {/* Stepper Progress Bar */}
          <div className="grid grid-cols-5 gap-2 text-center text-xs">
            {[
              { num: 1, label: '1. Chọn bộ đề' },
              { num: 2, label: '2. Đối tượng' },
              { num: 3, label: '3. Thời gian' },
              { num: 4, label: '4. Cài đặt đề' },
              { num: 5, label: '5. Xác nhận' }
            ].map(step => (
              <div
                key={step.num}
                onClick={() => setWizardStep(step.num)}
                className={`py-2.5 px-2 rounded-xl cursor-pointer font-bold transition-all ${
                  wizardStep === step.num
                    ? 'bg-cyan-600 text-white shadow-xs'
                    : wizardStep > step.num
                    ? 'bg-cyan-50 text-cyan-800 border border-cyan-200'
                    : 'bg-slate-50 text-slate-400'
                }`}
              >
                <span className="truncate block">{step.label}</span>
              </div>
            ))}
          </div>

          {/* Step 1: Chọn bộ đề */}
          {wizardStep === 1 && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide mb-1">
                  Tên bài giao cho học sinh *
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Kiểm tra 15 phút - Cấu tạo nguyên tử & Bảng tuần hoàn"
                  value={wizardData.title}
                  onChange={(e) => setWizardData({ ...wizardData, title: e.target.value })}
                  className="w-full p-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-cyan-500 font-semibold"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Chọn bộ đề từ Ngân hàng đề *
                  </label>
                  <button
                    onClick={() => onNavigate('create_set')}
                    className="text-xs text-cyan-600 font-bold hover:underline"
                  >
                    + Soạn bộ đề mới
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
                  {sets.map(s => {
                    const isSelected = wizardData.questionSetId === s.id;
                    return (
                      <div
                        key={s.id}
                        onClick={() => handleSelectQuestionSet(s.id)}
                        className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'bg-cyan-50/80 border-cyan-500 ring-2 ring-cyan-500/20'
                            : 'bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-white'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between text-xs mb-1.5">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white text-cyan-800 border border-cyan-200">
                              {s.questionIds?.length || 5} câu hỏi
                            </span>
                            <span className="text-slate-500">{s.durationMinutes} phút</span>
                          </div>
                          <h4 className="text-sm font-bold text-slate-900">{s.title}</h4>
                          <p className="text-xs text-slate-500 line-clamp-2 mt-1">{s.description}</p>
                        </div>
                        {isSelected && (
                          <div className="mt-3 text-xs text-cyan-700 font-bold flex items-center gap-1">
                            <CheckCircle className="w-4 h-4" />
                            <span>Đang chọn bộ đề này</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Đối tượng giao bài */}
          {wizardStep === 2 && (
            <div className="space-y-5 animate-fade-in">
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide mb-2">
                  Hình thức giao bài
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setWizardData({ ...wizardData, targetType: 'CLASS' })}
                    className={`p-4 rounded-xl border text-left font-bold text-xs transition-all ${
                      wizardData.targetType === 'CLASS'
                        ? 'bg-cyan-50 border-cyan-500 text-cyan-900 ring-2 ring-cyan-500/20'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-white'
                    }`}
                  >
                    <Users className="w-5 h-5 mb-1.5 text-cyan-600" />
                    <div>Giao theo Lớp học</div>
                    <p className="text-[11px] text-slate-500 font-normal mt-0.5">Áp dụng cho toàn bộ học sinh của lớp được chọn</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setWizardData({ ...wizardData, targetType: 'STUDENTS' })}
                    className={`p-4 rounded-xl border text-left font-bold text-xs transition-all ${
                      wizardData.targetType === 'STUDENTS'
                        ? 'bg-cyan-50 border-cyan-500 text-cyan-900 ring-2 ring-cyan-500/20'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-white'
                    }`}
                  >
                    <UserCheck className="w-5 h-5 mb-1.5 text-cyan-600" />
                    <div>Chỉ định Học sinh cụ thể</div>
                    <p className="text-[11px] text-slate-500 font-normal mt-0.5">Dành cho nhóm ôn thi học sinh giỏi hoặc thi bù</p>
                  </button>
                </div>
              </div>

              {/* Class Selection with Checkboxes */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide mb-2">
                  Chọn danh sách lớp học ({wizardData.classIds.length} lớp đã chọn) *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {classes.map(c => {
                    const isChecked = wizardData.classIds.includes(c.id);
                    return (
                      <div
                        key={c.id}
                        onClick={() => handleToggleClass(c.id)}
                        className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                          isChecked
                            ? 'bg-cyan-50 border-cyan-500 font-bold text-cyan-950'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="w-4 h-4 rounded text-cyan-600 pointer-events-none"
                          />
                          <div>
                            <div className="text-xs font-bold">{c.name}</div>
                            <div className="text-[10px] text-slate-500">{c.studentCount} học sinh • GV: {c.teacherName}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Student Exclusions */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800 uppercase tracking-wide">
                    Học sinh được miễn / Không cần làm ({wizardData.excludedStudentEmails.length})
                  </span>
                  <span className="text-slate-400 text-[11px]">Tùy chọn</span>
                </div>
                <p className="text-xs text-slate-500">
                  Nhập email hoặc tick chọn các học sinh nghỉ phép/đã thi trước để không tính điểm:
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {classes
                    .filter(c => wizardData.classIds.includes(c.id))
                    .flatMap(c => c.studentEmails || [])
                    .slice(0, 15)
                    .map(em => (
                      <button
                        key={em}
                        type="button"
                        onClick={() => handleToggleExcludeStudent(em)}
                        className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                          wizardData.excludedStudentEmails.includes(em)
                            ? 'bg-red-100 text-red-800 border border-red-300'
                            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {wizardData.excludedStudentEmails.includes(em) ? '- ' : '+ '} {em}
                      </button>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Thời gian & Giới hạn */}
          {wizardStep === 3 && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide mb-1">
                    Thời gian mở đề (Bắt đầu) *
                  </label>
                  <input
                    type="datetime-local"
                    value={wizardData.startAt}
                    onChange={(e) => setWizardData({ ...wizardData, startAt: e.target.value })}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide mb-1">
                    Hạn chót nộp bài (Kết thúc) *
                  </label>
                  <input
                    type="datetime-local"
                    value={wizardData.endAt}
                    onChange={(e) => setWizardData({ ...wizardData, endAt: e.target.value })}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide mb-1">
                    Thời gian làm bài (Phút)
                  </label>
                  <select
                    value={wizardData.durationMinutes}
                    onChange={(e) => setWizardData({ ...wizardData, durationMinutes: Number(e.target.value) })}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white font-semibold"
                  >
                    <option value={0}>Không giới hạn thời gian (Tự do ôn tập)</option>
                    <option value={15}>15 phút (Kiểm tra 15p)</option>
                    <option value={30}>30 phút</option>
                    <option value={45}>45 phút (Kiểm tra 1 tiết)</option>
                    <option value={60}>60 phút</option>
                    <option value={90}>90 phút (Thi học kỳ)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide mb-1">
                    Số lần làm bài tối đa
                  </label>
                  <select
                    value={wizardData.maxAttempts}
                    onChange={(e) => setWizardData({ ...wizardData, maxAttempts: Number(e.target.value) })}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white font-semibold"
                  >
                    <option value={1}>1 lần duy nhất (Nghiêm túc)</option>
                    <option value={2}>2 lần</option>
                    <option value={3}>3 lần</option>
                    <option value={999}>Không giới hạn (Luyện tập thoải mái)</option>
                  </select>
                </div>
              </div>

              {wizardData.maxAttempts > 1 && (
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700">Cách tính điểm khi làm nhiều lần:</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setWizardData({ ...wizardData, gradingMode: 'highest' })}
                      className={`px-3 py-1 rounded-full text-xs font-bold uppercase transition-all ${
                        wizardData.gradingMode === 'highest' ? 'bg-cyan-600 text-white' : 'bg-white border border-slate-200 text-slate-600'
                      }`}
                    >
                      Lấy điểm cao nhất
                    </button>
                    <button
                      type="button"
                      onClick={() => setWizardData({ ...wizardData, gradingMode: 'latest' })}
                      className={`px-3 py-1 rounded-full text-xs font-bold uppercase transition-all ${
                        wizardData.gradingMode === 'latest' ? 'bg-cyan-600 text-white' : 'bg-white border border-slate-200 text-slate-600'
                      }`}
                    >
                      Lấy lần làm cuối cùng
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Cài đặt hiển thị & Đề thi */}
          {wizardStep === 4 && (
            <div className="space-y-4 animate-fade-in">
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Tùy chọn xáo trộn & Chống gian lận
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div
                    onClick={() => setWizardData({ ...wizardData, shuffleQuestions: !wizardData.shuffleQuestions })}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${
                      wizardData.shuffleQuestions ? 'bg-cyan-50 border-cyan-400 font-bold text-cyan-950' : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    <Shuffle className="w-4 h-4 text-cyan-600" />
                    <span className="text-xs">Trộn thứ tự câu hỏi</span>
                  </div>

                  <div
                    onClick={() => setWizardData({ ...wizardData, shuffleOptions: !wizardData.shuffleOptions })}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${
                      wizardData.shuffleOptions ? 'bg-cyan-50 border-cyan-400 font-bold text-cyan-950' : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    <Shuffle className="w-4 h-4 text-cyan-600" />
                    <span className="text-xs">Trộn phương án A, B, C, D</span>
                  </div>

                  <div
                    onClick={() => setWizardData({ ...wizardData, allowBackNavigation: !wizardData.allowBackNavigation })}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${
                      wizardData.allowBackNavigation ? 'bg-cyan-50 border-cyan-400 font-bold text-cyan-950' : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    <RotateCcw className="w-4 h-4 text-cyan-600" />
                    <span className="text-xs">Cho phép quay lại câu trước</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide mb-1">
                    Thời điểm xem đáp án & Lời giải
                  </label>
                  <select
                    value={wizardData.showAnswers}
                    onChange={(e: any) => setWizardData({ ...wizardData, showAnswers: e.target.value })}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white font-medium"
                  >
                    <option value="after_submit">Xem ngay sau khi nộp bài</option>
                    <option value="after_end">Chỉ xem sau khi hết hạn giao bài</option>
                    <option value="none">Không cho xem đáp án</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide mb-1">
                    Công bố điểm số
                  </label>
                  <select
                    value={wizardData.showScore}
                    onChange={(e: any) => setWizardData({ ...wizardData, showScore: e.target.value })}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white font-medium"
                  >
                    <option value="immediate">Học sinh biết điểm ngay sau khi nộp</option>
                    <option value="manual_publish">Giáo viên công bố sau khi cả lớp hoàn thành</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide mb-1">
                  Lời dặn dò / Hướng dẫn của giáo viên
                </label>
                <textarea
                  rows={2}
                  value={wizardData.instructions}
                  onChange={(e) => setWizardData({ ...wizardData, instructions: e.target.value })}
                  placeholder="Ghi chú thêm cho học sinh khi vào phòng thi..."
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
                />
              </div>
            </div>
          )}

          {/* Step 5: Xem lại & Xác nhận */}
          {wizardStep === 5 && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide pb-2 border-b border-slate-200">
                  Tóm tắt cấu hình bài giao
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Tên bài:</span>
                    <strong className="text-slate-900">{wizardData.title}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Lớp được giao:</span>
                    <strong className="text-slate-900">{wizardData.classIds.join(', ')}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Thời gian mở - đóng:</span>
                    <span className="text-slate-700">{wizardData.startAt.replace('T', ' ')} → {wizardData.endAt.replace('T', ' ')}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Thời lượng & Lần làm:</span>
                    <span className="text-slate-700">{wizardData.durationMinutes} phút • Tối đa {wizardData.maxAttempts} lần</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Chế độ xáo trộn:</span>
                    <span className="text-slate-700">Trộn câu: {wizardData.shuffleQuestions ? 'Bật' : 'Tắt'} • Trộn đáp án: {wizardData.shuffleOptions ? 'Bật' : 'Tắt'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Xem đáp án & Điểm:</span>
                    <span className="text-slate-700">{wizardData.showAnswers} • {wizardData.showScore}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Wizard Footer Controls */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              type="button"
              disabled={wizardStep === 1}
              onClick={() => setWizardStep(prev => Math.max(1, prev - 1))}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 font-bold rounded-full text-xs flex items-center gap-1 uppercase tracking-wide"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Quay lại</span>
            </button>

            <div className="flex items-center gap-2">
              {wizardStep === 5 && (
                <button
                  type="button"
                  onClick={() => handleCreateAssignmentSubmit(true)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-full text-xs uppercase tracking-wide"
                >
                  Lưu bản nháp
                </button>
              )}

              {wizardStep < 5 ? (
                <button
                  type="button"
                  onClick={() => setWizardStep(prev => Math.min(5, prev + 1))}
                  className="px-5 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-full text-xs flex items-center gap-1 shadow-md shadow-cyan-600/20 uppercase tracking-wide"
                >
                  <span>Tiếp tục</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleCreateAssignmentSubmit(false)}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-full text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 uppercase tracking-wide"
                >
                  <Send className="w-4 h-4" />
                  <span>Xác nhận giao bài ngay</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DETAILED MONITORING & GRADING MODAL (CHI TIẾT GIÁM SÁT & CHẤM BÀI) */}
      {/* ========================================================================= */}
      {detailAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6 my-8 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-cyan-50 text-cyan-800 border border-cyan-200">
                    {detailAssignment.className}
                  </span>
                  <span className="text-xs text-slate-500">
                    Hạn nộp: {detailAssignment.endAt ? detailAssignment.endAt.replace('T', ' ') : detailAssignment.deadline}
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                  {detailAssignment.title}
                </h2>
              </div>

              <button
                onClick={() => setDetailAssignment(null)}
                className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Live Progress Stats Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Đã nộp bài</span>
                <div className="text-2xl font-black text-slate-900 mt-0.5">{detailSubmissions.length}</div>
              </div>
              <div className="p-3.5 bg-emerald-50/50 rounded-2xl border border-emerald-200">
                <span className="text-[10px] text-emerald-700 uppercase font-bold tracking-wider">Điểm trung bình</span>
                <div className="text-2xl font-black text-emerald-700 mt-0.5">
                  {detailSubmissions.length > 0 
                    ? (detailSubmissions.reduce((a, b) => a + (b.score || 0), 0) / detailSubmissions.length).toFixed(1)
                    : '--'}
                </div>
              </div>
              <div className="p-3.5 bg-purple-50/50 rounded-2xl border border-purple-200">
                <span className="text-[10px] text-purple-700 uppercase font-bold tracking-wider">Tỷ lệ Đạt (&ge;5.0)</span>
                <div className="text-2xl font-black text-purple-700 mt-0.5">
                  {detailSubmissions.length > 0 
                    ? `${Math.round((detailSubmissions.filter(s => s.score >= 5).length / detailSubmissions.length) * 100)}%`
                    : '--'}
                </div>
              </div>
              <div className="p-3.5 bg-cyan-50/50 rounded-2xl border border-cyan-200">
                <span className="text-[10px] text-cyan-800 uppercase font-bold tracking-wider">Trạng thái điểm</span>
                <div className="text-xs font-bold text-cyan-900 mt-1">
                  {detailAssignment.isScorePublished ? ' Đã công bố' : 'Chưa công bố'}
                </div>
              </div>
            </div>

            {/* Details Tabs */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setDetailActiveTab('students')}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide transition-all ${
                    detailActiveTab === 'students' ? 'bg-cyan-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Danh sách học sinh ({detailSubmissions.length})
                </button>
                <button
                  onClick={() => setDetailActiveTab('questions')}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide transition-all ${
                    detailActiveTab === 'questions' ? 'bg-cyan-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Phân tích câu hỏi
                </button>
                <button
                  onClick={() => setDetailActiveTab('topics')}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide transition-all ${
                    detailActiveTab === 'topics' ? 'bg-cyan-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Chủ đề cần củng cố
                </button>
              </div>

              {/* Action Toolbar */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Close Assignment Button in Modal */}
                {(detailAssignment.status === 'ACTIVE' || detailAssignment.status === 'SCHEDULED') && canManageAssignment(detailAssignment) && (
                  <button
                    onClick={(e) => handleOpenCloseConfirm(detailAssignment, e)}
                    className="px-3 py-1 bg-amber-50 text-amber-800 border border-amber-300 rounded-full text-xs font-bold flex items-center gap-1 uppercase tracking-wide hover:bg-amber-100 cursor-pointer shadow-2xs"
                  >
                    <Lock className="w-3.5 h-3.5 text-amber-700" />
                    <span>Đóng bài</span>
                  </button>
                )}

                {/* Delete Assignment Button in Modal */}
                {canManageAssignment(detailAssignment) && (
                  <button
                    onClick={(e) => handleOpenDeleteConfirm(detailAssignment, e)}
                    className="px-3 py-1 bg-red-50 text-red-700 border border-red-200 rounded-full text-xs font-bold flex items-center gap-1 uppercase tracking-wide hover:bg-red-100 cursor-pointer shadow-2xs"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-600" />
                    <span>Xóa bài</span>
                  </button>
                )}

                <button
                  onClick={() => setIsReminderModalOpen(true)}
                  className="px-3 py-1 bg-amber-50 text-amber-800 border border-amber-300 rounded-full text-xs font-bold flex items-center gap-1 uppercase tracking-wide hover:bg-amber-100"
                >
                  <Bell className="w-3.5 h-3.5" />
                  <span>Nhắc học sinh</span>
                </button>

                <button
                  onClick={() => handleTogglePublishScore(detailAssignment)}
                  className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide transition-all ${
                    detailAssignment.isScorePublished
                      ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      : 'bg-cyan-600 text-white shadow-xs hover:bg-cyan-700'
                  }`}
                >
                  {detailAssignment.isScorePublished ? 'Thu hồi điểm' : 'Công bố điểm ngay'}
                </button>
              </div>
            </div>

            {/* TAB 1: Danh sách học sinh */}
            {detailActiveTab === 'students' && (
              <div className="space-y-3">
                {detailSubmissions.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-2xl">
                    Chưa có học sinh nào nộp bài kiểm tra này.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                    {detailSubmissions.map((sub, idx) => (
                      <div key={sub.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 text-[10px]">
                            {idx + 1}
                          </span>
                          <div>
                            <strong className="text-slate-900 block">{sub.studentName}</strong>
                            <span className="text-slate-400 text-[11px]">{sub.studentEmail}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 block font-semibold">
                              Làm trong {Math.floor(sub.durationSeconds / 60)}p {sub.durationSeconds % 60}s
                              {sub.submittedAt && (
                                <span className="text-slate-500 font-medium"> • {new Date(sub.submittedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                              )}
                            </span>
                            <span className="text-[10px] text-emerald-600 font-bold">
                              Đúng {sub.correctCount} / {sub.totalQuestions} câu
                            </span>
                          </div>

                          <div className="text-right">
                            <div className="text-base font-black text-cyan-600">
                              {sub.score} <span className="text-[10px] font-normal text-slate-400">/ 10</span>
                            </div>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">
                              {sub.status === 'submitted' ? 'Đã nộp' : (sub.status || 'Đã nộp')}
                            </span>
                          </div>

                          <button
                            onClick={() => setSelectedSubmissionView(sub)}
                            className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full font-bold uppercase text-[10px]"
                          >
                            Xem bài
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: Phân tích câu hỏi */}
            {detailActiveTab === 'questions' && (
              <div className="space-y-3 max-h-72 overflow-y-auto">
                <p className="text-xs text-slate-500">
                  Thống kê tỷ lệ trả lời đúng theo từng câu dựa trên {detailSubmissions.length} lượt nộp bài thực tế:
                </p>
                {allQuestions.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    Chưa có danh sách câu hỏi.
                  </div>
                ) : (
                  allQuestions.map((q, idx) => {
                    const totalSubs = detailSubmissions.length;
                    const correctCount = detailSubmissions.filter(s => s.details?.some(d => d.questionId === q.id && d.isCorrect)).length;
                    const percent = totalSubs > 0 ? Math.round((correctCount / totalSubs) * 100) : 0;
                    const isLow = percent < 60;
                    return (
                      <div key={q.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-800">Câu #{idx + 1}: {q.topic || 'Kiến thức chung'}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            totalSubs === 0 ? 'bg-slate-100 text-slate-500' : isLow ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {totalSubs === 0 ? 'Chưa có lượt nộp' : `${percent}% học sinh đúng (${correctCount}/${totalSubs})`}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 line-clamp-1">{q.content}</p>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* TAB 3: Chủ đề cần củng cố */}
            {detailActiveTab === 'topics' && (
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Phân tích chẩn đoán kiến thức từ kết quả bài nộp
                </h4>
                {detailSubmissions.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
                    Chưa có bài nộp nào để thống kê chủ đề cần củng cố.
                  </div>
                ) : (
                  <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
                    <div className="p-3 bg-cyan-50/60 border border-cyan-200 rounded-xl">
                      <strong className="text-cyan-900 block mb-1">Tổng quan kết quả lớp:</strong>
                      Điểm trung bình hiện tại của lớp: <strong>{(detailSubmissions.reduce((a, b) => a + (b.score || 0), 0) / detailSubmissions.length).toFixed(1)}/10</strong> qua {detailSubmissions.length} lượt nộp.
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Extend Deadline Modal */}
      {isExtendModalOpen && extendTargetAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              Gia hạn bài kiểm tra
            </h3>
            <p className="text-xs text-slate-500">
              Chọn thời điểm kết thúc mới cho bài <strong>{extendTargetAssignment.title}</strong>:
            </p>
            <input
              type="datetime-local"
              value={extendDate}
              onChange={(e) => setExtendDate(e.target.value)}
              className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsExtendModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full text-xs font-bold uppercase"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmExtend}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-full text-xs font-bold shadow-xs uppercase"
              >
                Lưu gia hạn
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reminder Popup Modal */}
      {isReminderModalOpen && detailAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-500" />
              Nhắc nhở học sinh chưa hoàn thành
            </h3>
            <p className="text-xs text-slate-500">
              Gửi thông báo nhắc nhở làm bài đến tất cả học sinh chưa nộp bài trong lớp {detailAssignment.className}:
            </p>
            <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-700">
              Hệ thống sẽ gửi thông báo đến tất cả học sinh trong danh sách lớp <strong>{detailAssignment.className}</strong> chưa hoàn thành bài thi.
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsReminderModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full text-xs font-bold uppercase"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsReminderModalOpen(false);
                  setReminderToast("Đã gửi thông báo nhắc nhở đến các học sinh chưa làm bài!");
                }}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-full text-xs font-bold shadow-xs uppercase"
              >
                Gửi nhắc nhở ngay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Student Submission Single View Modal */}
      {selectedSubmissionView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Chi tiết bài làm: {selectedSubmissionView.studentName}
                </h3>
                <span className="text-xs text-slate-400">{selectedSubmissionView.studentEmail}</span>
              </div>
              <button
                onClick={() => setSelectedSubmissionView(null)}
                className="p-1 text-slate-400 hover:text-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs p-3 bg-slate-50 rounded-xl">
              <div>
                <span className="text-slate-400 block text-[10px] font-bold">Điểm</span>
                <strong className="text-base text-cyan-600">{selectedSubmissionView.score}/10</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] font-bold">Thời gian</span>
                <strong>{Math.floor(selectedSubmissionView.durationSeconds / 60)}p {selectedSubmissionView.durationSeconds % 60}s</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] font-bold">Số câu đúng</span>
                <strong className="text-emerald-600">{selectedSubmissionView.correctCount}/{selectedSubmissionView.totalQuestions}</strong>
              </div>
            </div>

            <div className="pt-2">
              <SubmissionDetailReview
                submission={selectedSubmissionView}
                isAnswerReviewAllowed={true}
                isSolutionVisible={true}
              />
            </div>
          </div>
        </div>
      )}

      {/* In-App Confirmation Modal for Close & Delete Actions */}
      {confirmDialog.isOpen && confirmDialog.assignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${confirmDialog.type === 'close' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
                {confirmDialog.type === 'close' ? <Lock className="w-5 h-5" /> : <Trash2 className="w-5 h-5" />}
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-slate-900 truncate">
                  {confirmDialog.title}
                </h3>
                <p className="text-xs text-slate-500 truncate">{confirmDialog.assignment.title}</p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-700 leading-relaxed">
              {confirmDialog.message}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={confirmDialog.isProcessing}
                onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full text-xs font-bold uppercase transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={confirmDialog.isProcessing}
                onClick={handleExecuteConfirmAction}
                className={`px-4 py-2 text-white rounded-full text-xs font-bold shadow-xs uppercase flex items-center gap-1.5 transition-colors cursor-pointer ${
                  confirmDialog.type === 'close' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {confirmDialog.isProcessing ? (
                  <span>Đang xử lý...</span>
                ) : (
                  <>
                    {confirmDialog.type === 'close' ? <Lock className="w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5" />}
                    <span>{confirmDialog.type === 'close' ? 'Xác nhận Đóng bài' : 'Xác nhận Xóa bài'}</span>
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
