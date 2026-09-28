import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Clock, 
  Award, 
  CheckCircle, 
  TrendingUp, 
  Sparkles, 
  ArrowRight,
  Flame,
  Target,
  Play,
  Lock,
  Calendar,
  AlertCircle,
  HelpCircle,
  X,
  ShieldAlert,
  RotateCcw,
  FileText,
  Settings,
  Sliders,
  Save,
  Check
} from 'lucide-react';
import { CHEMISTRY_10_CURRICULUM, normalizeChapterId, getChapterTitle } from '../data/curriculum';
import { questionSetService, assignmentService, submissionService, chapterConfigService, questionService } from '../services/dbService';
import { useAuth } from '../context/AuthContext';
import { QuestionSet, Assignment, Submission, ChapterPracticeConfig } from '../types';

interface StudentHomeViewProps {
  onStartPractice: (setId: string, assignmentId?: string, chapterId?: string) => void;
  onNavigate: (tab: string) => void;
}

interface ChapterBankSummary {
  total: number;
  multiple_choice: number;
  true_false: number;
  short_answer: number;
}

interface ChapterEditFormState {
  multiple_choice: number;
  true_false: number;
  short_answer: number;
  durationMinutes: number;
}

export const StudentHomeView: React.FC<StudentHomeViewProps> = ({ onStartPractice, onNavigate }) => {
  const { user, isTeacher, isAdmin } = useAuth();
  const [sets, setSets] = useState<QuestionSet[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [chapterConfigs, setChapterConfigs] = useState<Record<string, ChapterPracticeConfig>>({});
  const [bankStatsByChapter, setBankStatsByChapter] = useState<Record<string, ChapterBankSummary>>({});
  const [loading, setLoading] = useState(true);

  // Pre-flight confirmation modal before starting an assignment
  const [selectedPreflightAssignment, setSelectedPreflightAssignment] = useState<Assignment | null>(null);

  // Teacher-Only Chapter Practice Config Modal (Manual Format Classification)
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);
  const [teacherEditingConfigs, setTeacherEditingConfigs] = useState<Record<string, ChapterEditFormState>>({});
  const [isSavingConfigs, setIsSavingConfigs] = useState(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const studentEmail = user?.email || '';
        const [s, a, sub, configs, allQ] = await Promise.all([
          questionSetService.getSets(),
          studentEmail ? assignmentService.getAssignmentsForStudent(studentEmail, user?.classId || '') : Promise.resolve([]),
          studentEmail ? submissionService.getSubmissionsByStudent(studentEmail) : Promise.resolve([]),
          chapterConfigService.getConfigs(),
          questionService.getQuestions()
        ]);
        setSets(s);
        setAssignments(a);
        setSubmissions(sub);
        setChapterConfigs(configs);

        // Calculate detailed bank counts per chapter & per question format (Dạng thức)
        const bStats: Record<string, ChapterBankSummary> = {};
        CHEMISTRY_10_CURRICULUM.forEach(c => {
          bStats[c.id] = { total: 0, multiple_choice: 0, true_false: 0, short_answer: 0 };
        });
        allQ.forEach(q => {
          const norm = normalizeChapterId(q.chapterId);
          if (norm && bStats[norm]) {
            bStats[norm].total++;
            if (q.type === 'multiple_choice') bStats[norm].multiple_choice++;
            else if (q.type === 'true_false') bStats[norm].true_false++;
            else if (q.type === 'short_answer' || q.type === 'calculation') bStats[norm].short_answer++;
          }
        });
        setBankStatsByChapter(bStats);

        // Pre-fill teacher editing format state
        const initialForm: Record<string, ChapterEditFormState> = {};
        CHEMISTRY_10_CURRICULUM.forEach(c => {
          const cfg = configs[c.id] || {
            questionCount: 20,
            durationMinutes: 30,
            types: { multiple_choice: 12, true_false: 4, short_answer: 4 }
          };
          const mc = cfg.types?.multiple_choice ?? 12;
          const tf = cfg.types?.true_false ?? 4;
          const sa = cfg.types?.short_answer ?? 4;
          const totalQ = mc + tf + sa;
          initialForm[c.id] = {
            multiple_choice: mc,
            true_false: tf,
            short_answer: sa,
            durationMinutes: cfg.durationMinutes || Math.max(10, Math.round(totalQ * 1.5))
          };
        });
        setTeacherEditingConfigs(initialForm);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  const completedCount = submissions.length;
  const avgScore = submissions.length > 0
    ? (submissions.reduce((a, b) => a + (b.score || 0), 0) / submissions.length).toFixed(1)
    : '0.0';

  // Calculate student strength topic
  const bestSubmission = submissions.length > 0
    ? [...submissions].sort((a, b) => (b.score || 0) - (a.score || 0))[0]
    : null;
  const strengthTopic = bestSubmission?.questionSetTitle || (submissions.length > 0 ? 'Đang cập nhật' : 'Chưa có dữ liệu');

  const handleOpenPreflight = (assign: Assignment) => {
    setSelectedPreflightAssignment(assign);
  };

  const handleConfirmStart = () => {
    if (!selectedPreflightAssignment) return;
    const a = selectedPreflightAssignment;
    setSelectedPreflightAssignment(null);
    onStartPractice(a.questionSetId, a.id);
  };

  // Sync state when opening modal
  const openTeacherModal = () => {
    const initialForm: Record<string, ChapterEditFormState> = {};
    CHEMISTRY_10_CURRICULUM.forEach(c => {
      const cfg = chapterConfigs[c.id] || {
        questionCount: 20,
        durationMinutes: 30,
        types: { multiple_choice: 12, true_false: 4, short_answer: 4 }
      };
      const mc = cfg.types?.multiple_choice ?? 12;
      const tf = cfg.types?.true_false ?? 4;
      const sa = cfg.types?.short_answer ?? 4;
      const totalQ = mc + tf + sa;
      initialForm[c.id] = {
        multiple_choice: mc,
        true_false: tf,
        short_answer: sa,
        durationMinutes: cfg.durationMinutes || Math.max(10, Math.round(totalQ * 1.5))
      };
    });
    setTeacherEditingConfigs(initialForm);
    setIsTeacherModalOpen(true);
  };

  const handleSaveTeacherConfigs = async () => {
    setIsSavingConfigs(true);
    try {
      const updates: Record<string, Partial<ChapterPracticeConfig>> = {};
      CHEMISTRY_10_CURRICULUM.forEach(c => {
        const edit = teacherEditingConfigs[c.id] || { multiple_choice: 12, true_false: 4, short_answer: 4, durationMinutes: 30 };
        const totalQ = edit.multiple_choice + edit.true_false + edit.short_answer;
        updates[c.id] = {
          chapterId: c.id,
          questionCount: totalQ,
          durationMinutes: edit.durationMinutes || Math.max(10, Math.round(totalQ * 1.5)),
          mode: 'MANUAL_FORMAT',
          types: {
            multiple_choice: edit.multiple_choice,
            true_false: edit.true_false,
            short_answer: edit.short_answer
          }
        };
      });
      await chapterConfigService.saveAllConfigs(updates, user?.email || 'teacher');
      const refreshed = await chapterConfigService.getConfigs();
      setChapterConfigs(refreshed);
      setSaveToast("Đã lưu cấu hình phân loại dạng thức cho 7 Chương thành công!");
      setIsTeacherModalOpen(false);
      setTimeout(() => setSaveToast(null), 4000);
    } catch (e) {
      console.error("Error saving chapter configs:", e);
      alert("Có lỗi khi lưu cài đặt dạng thức câu hỏi!");
    } finally {
      setIsSavingConfigs(false);
    }
  };

  const applyTeacherPresetAll = (preset: { mc: number; tf: number; sa: number; time?: number }) => {
    const total = preset.mc + preset.tf + preset.sa;
    const dur = preset.time || Math.max(10, Math.round(total * 1.5));
    const updated: Record<string, ChapterEditFormState> = {};
    CHEMISTRY_10_CURRICULUM.forEach(c => {
      updated[c.id] = {
        multiple_choice: preset.mc,
        true_false: preset.tf,
        short_answer: preset.sa,
        durationMinutes: dur
      };
    });
    setTeacherEditingConfigs(updated);
  };

  const updateSingleChapterFormat = (
    chapterId: string,
    field: 'multiple_choice' | 'true_false' | 'short_answer',
    delta: number
  ) => {
    setTeacherEditingConfigs(prev => {
      const curr = prev[chapterId] || { multiple_choice: 12, true_false: 4, short_answer: 4, durationMinutes: 30 };
      const nextVal = Math.max(0, Math.min(100, curr[field] + delta));
      const updated = { ...curr, [field]: nextVal };
      const newTotal = updated.multiple_choice + updated.true_false + updated.short_answer;
      updated.durationMinutes = Math.max(10, Math.round(newTotal * 1.5));
      return {
        ...prev,
        [chapterId]: updated
      };
    });
  };

  const setSingleChapterFormatValue = (
    chapterId: string,
    field: 'multiple_choice' | 'true_false' | 'short_answer',
    val: number
  ) => {
    const cleanVal = Math.max(0, Math.min(100, val));
    setTeacherEditingConfigs(prev => {
      const curr = prev[chapterId] || { multiple_choice: 12, true_false: 4, short_answer: 4, durationMinutes: 30 };
      const updated = { ...curr, [field]: cleanVal };
      const newTotal = updated.multiple_choice + updated.true_false + updated.short_answer;
      updated.durationMinutes = Math.max(10, Math.round(newTotal * 1.5));
      return {
        ...prev,
        [chapterId]: updated
      };
    });
  };

  // Color styles per chapter index for modern distinct visual identity
  const chapterAccents = [
    { badge: 'bg-cyan-100 text-cyan-800 border-cyan-200', btn: 'bg-cyan-600 hover:bg-cyan-700 text-white', iconBg: 'bg-cyan-50 text-cyan-600', ring: 'group-hover:border-cyan-400' },
    { badge: 'bg-blue-100 text-blue-800 border-blue-200', btn: 'bg-blue-600 hover:bg-blue-700 text-white', iconBg: 'bg-blue-50 text-blue-600', ring: 'group-hover:border-blue-400' },
    { badge: 'bg-indigo-100 text-indigo-800 border-indigo-200', btn: 'bg-indigo-600 hover:bg-indigo-700 text-white', iconBg: 'bg-indigo-50 text-indigo-600', ring: 'group-hover:border-indigo-400' },
    { badge: 'bg-amber-100 text-amber-800 border-amber-200', btn: 'bg-amber-600 hover:bg-amber-700 text-white', iconBg: 'bg-amber-50 text-amber-600', ring: 'group-hover:border-amber-400' },
    { badge: 'bg-emerald-100 text-emerald-800 border-emerald-200', btn: 'bg-emerald-600 hover:bg-emerald-700 text-white', iconBg: 'bg-emerald-50 text-emerald-600', ring: 'group-hover:border-emerald-400' },
    { badge: 'bg-rose-100 text-rose-800 border-rose-200', btn: 'bg-rose-600 hover:bg-rose-700 text-white', iconBg: 'bg-rose-50 text-rose-600', ring: 'group-hover:border-rose-400' },
    { badge: 'bg-sky-100 text-sky-800 border-sky-200', btn: 'bg-sky-600 hover:bg-sky-700 text-white', iconBg: 'bg-sky-50 text-sky-600', ring: 'group-hover:border-sky-400' },
  ];

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      {/* Student Welcome Banner */}
      <div className="bg-gradient-to-r from-cyan-600 via-sky-600 to-indigo-700 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-xl shadow-cyan-600/15 card-shine">
        <div className="absolute -right-12 -bottom-12 w-72 h-72 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-1/3 -top-12 w-48 h-48 bg-cyan-300/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="relative z-10 max-w-3xl">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/15 backdrop-blur-md border border-white/20 rounded-full text-[10px] font-bold uppercase tracking-wider text-cyan-100">
              <Flame className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
              <span>Hóa học 10 GDPT 2018</span>
            </div>
            {user?.classId && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 backdrop-blur-md border border-white/30 rounded-full text-[10px] font-bold uppercase tracking-wider text-white">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Lớp: {user.classId}</span>
              </div>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-tight">
            Xin chào, {user?.displayName || 'Học sinh Hóa 10'}! 👋
          </h1>
          <p className="text-cyan-50 text-xs sm:text-sm mt-2.5 leading-relaxed max-w-2xl font-medium">
            Hôm nay bạn muốn củng cố kiến thức Chương nào? Hãy bắt đầu làm bài luyện tập hoặc hoàn thành bài kiểm tra do thầy cô giao cho lớp nhé!
          </p>

          <div className="flex flex-wrap items-center gap-3 mt-6">
            <button
              onClick={() => {
                if (assignments.length > 0) {
                  handleOpenPreflight(assignments[0]);
                } else if (sets.length > 0) {
                  onStartPractice(sets[0].id);
                }
              }}
              className="px-5 py-2.5 bg-white text-slate-900 hover:bg-slate-50 font-black rounded-full text-xs flex items-center gap-2 shadow-lg shadow-slate-900/10 uppercase tracking-wide transition-all cursor-pointer hover:scale-[1.03] active:scale-[0.98]"
            >
              <Play className="w-3.5 h-3.5 fill-cyan-600 text-cyan-600" />
              <span>Bắt đầu bài kiểm tra mới nhất</span>
            </button>
            <button
              onClick={() => onNavigate('student_history')}
              className="px-4 py-2.5 bg-white/15 hover:bg-white/25 text-white rounded-full text-xs font-bold border border-white/30 backdrop-blur-sm uppercase tracking-wide transition-all flex items-center gap-1.5 cursor-pointer hover:scale-[1.02]"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Báo cáo năng lực</span>
            </button>
            <button
              onClick={() => onNavigate('student_history')}
              className="px-4 py-2.5 bg-black/15 hover:bg-black/25 text-white/90 rounded-full text-xs font-semibold border border-white/15 uppercase tracking-wide transition-all flex items-center gap-1 cursor-pointer"
            >
              <span>Xem lịch sử điểm số</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Progress Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white/90 backdrop-blur-md p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex items-center justify-between relative overflow-hidden group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-cyan-50 ring-4 ring-cyan-50/50 text-cyan-600 rounded-2xl flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
              <Target className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Số bài đã làm</div>
              <div className="text-2xl font-black text-slate-900 mt-0.5">{completedCount} <span className="text-xs font-semibold text-slate-400">bài</span></div>
            </div>
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-md p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex items-center justify-between relative overflow-hidden group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-50 ring-4 ring-emerald-50/50 text-emerald-600 rounded-2xl flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Điểm trung bình</div>
              <div className="text-2xl font-black text-slate-900 mt-0.5">{avgScore} <span className="text-xs font-semibold text-slate-400">/ 10</span></div>
            </div>
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-md p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex items-center justify-between relative overflow-hidden group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-50 ring-4 ring-indigo-50/50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Chủ đề thế mạnh</div>
              <div className="text-xs sm:text-sm font-bold text-slate-900 truncate max-w-[160px] mt-0.5">{strengthTopic}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 1: Assigned Tests (BÀI ÔN TẬP ĐƯỢC GIAO) */}
      <div className="bg-white/95 backdrop-blur-md p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-50 text-rose-600 rounded-2xl ring-4 ring-rose-50/50">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Bài ôn tập & Kiểm tra được giao</h2>
              <p className="text-xs text-slate-500 font-medium">Các bài kiểm tra từ giáo viên phụ trách lớp</p>
            </div>
          </div>
        </div>

        {assignments.length === 0 ? (
          <div className="p-8 text-center bg-slate-50/70 rounded-2xl border border-dashed border-slate-200 text-xs text-slate-400 font-medium">
            Hiện tại bạn không có bài kiểm tra nào cần hoàn thành. Bạn có thể tự luyện theo 7 Chương bên dưới.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {assignments.map(a => {
              const studentSubs = submissions.filter(s => s.assignmentId === a.id);
              const attemptsCount = studentSubs.length;
              const hasSubmitted = attemptsCount > 0;
              const isEnded = (a.status || '').toUpperCase() === 'ENDED' || (a.status || '').toUpperCase() === 'CLOSED';
              const isMaxAttemptReached = a.maxAttempts && attemptsCount >= a.maxAttempts;
              const bestScore = studentSubs.length > 0 ? Math.max(...studentSubs.map(s => s.score)) : null;

              return (
                <div
                  key={a.id}
                  className="p-5 bg-white border border-slate-200/80 rounded-2xl flex flex-col justify-between hover:border-cyan-300 hover:shadow-md transition-all shadow-xs group"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-cyan-50 text-cyan-800 border border-cyan-200">
                          {a.className}
                        </span>
                        {hasSubmitted && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
                             Đã làm {attemptsCount} lần ({bestScore}/10)
                          </span>
                        )}
                        {!hasSubmitted && !isEnded && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-50 text-amber-800 border border-amber-200">
                            Chưa làm
                          </span>
                        )}
                        {isEnded && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-600 border border-slate-200">
                            Đã hết hạn
                          </span>
                        )}
                      </div>

                      <span className="text-xs font-semibold text-rose-600 flex items-center gap-1">
                        Hạn: {a.endAt ? a.endAt.split('T')[0] : a.deadline}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 mb-1 group-hover:text-cyan-600 transition-colors">
                      {a.title}
                    </h3>
                    <p className="text-xs text-slate-500 mb-4">
                      Thời gian: {a.durationMinutes === 0 ? 'Tự do' : `${a.durationMinutes} phút`} • Giáo viên: {a.teacherName} • Số lần: {a.maxAttempts > 10 ? 'Không giới hạn' : `${a.maxAttempts} lần`}
                    </p>
                  </div>

                  <div>
                    {isMaxAttemptReached ? (
                      <button
                        onClick={() => onNavigate('student_history')}
                        className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-2 uppercase tracking-wide cursor-pointer"
                      >
                        <Award className="w-3.5 h-3.5" />
                        <span>Xem lại kết quả ({bestScore}/10)</span>
                      </button>
                    ) : isEnded ? (
                      <button
                        disabled
                        className="w-full py-2.5 bg-slate-200 text-slate-400 rounded-full text-xs font-bold flex items-center justify-center gap-2 uppercase tracking-wide cursor-not-allowed"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>Đã hết thời gian nộp bài</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleOpenPreflight(a)}
                        className="w-full py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white rounded-full text-xs font-bold shadow-md shadow-cyan-600/20 transition-all flex items-center justify-center gap-2 uppercase tracking-wide cursor-pointer hover:scale-[1.01]"
                      >
                        <Play className="w-3.5 h-3.5 fill-white" />
                        <span>{hasSubmitted ? 'LÀM LẠI BÀI THI' : 'VÀO LÀM BÀI NGAY'}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Section 2: Practice by Chapter (ÔN TẬP THEO 7 CHƯƠNG) */}
      <div className="bg-white/95 backdrop-blur-md p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-slate-100 gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-cyan-50 text-cyan-600 rounded-2xl ring-4 ring-cyan-50/50">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Tự ôn tập theo 7 Chương GDPT 2018</h2>
                {(isTeacher || isAdmin) && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-50 text-amber-800 border border-amber-200">
                    Quyền Giáo viên
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-medium">Luyện tập theo 3 dạng thức trắc nghiệm GDPT 2018 (Theo cấu hình của Giáo viên)</p>
            </div>
          </div>

          {/* Teacher-only Config Action */}
          {(isTeacher || isAdmin) && (
            <button
              onClick={openTeacherModal}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-full text-xs font-bold transition-all flex items-center justify-center gap-1.5 uppercase tracking-wide cursor-pointer shadow-sm hover:shadow-md hover:scale-[1.02]"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Phân loại Dạng thức 7 Chương (Giáo viên)</span>
            </button>
          )}
        </div>

        {saveToast && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-bold text-emerald-800 flex items-center gap-2 animate-fade-in">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{saveToast}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {CHEMISTRY_10_CURRICULUM.map((chapter, idx) => {
            const accent = chapterAccents[idx % chapterAccents.length];
            const normId = normalizeChapterId(chapter.id);
            const cfg = chapterConfigs[chapter.id] || chapterConfigs[normId] || {
              chapterId: chapter.id,
              questionCount: 20,
              durationMinutes: 30,
              types: { multiple_choice: 12, true_false: 4, short_answer: 4 }
            };
            const mcCount = cfg.types?.multiple_choice ?? 12;
            const tfCount = cfg.types?.true_false ?? 4;
            const saCount = cfg.types?.short_answer ?? 4;
            const questionCount = cfg.questionCount || (mcCount + tfCount + saCount);
            const durationMin = cfg.durationMinutes || Math.max(10, Math.round(questionCount * 1.5));
            const bankStats = bankStatsByChapter[normId] || { total: 0, multiple_choice: 0, true_false: 0, short_answer: 0 };

            return (
              <div
                key={chapter.id}
                className="p-5 rounded-2xl border border-slate-200/80 bg-white hover:border-cyan-300 hover:shadow-lg transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between text-xs mb-2.5">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${accent.badge}`}>
                      CHƯƠNG {idx + 1}
                    </span>
                    <span className="text-[11px] text-slate-400 font-semibold">{chapter.lessons.length} bài học</span>
                  </div>
                  <h3 className="text-sm font-black text-slate-900 mb-2 leading-snug group-hover:text-cyan-600 transition-colors">
                    {chapter.title.split(': ')[1] || chapter.title}
                  </h3>
                  <p className="text-xs text-slate-500 line-clamp-2 mb-3.5 leading-relaxed font-normal">
                    {chapter.description}
                  </p>

                  {/* Format breakdown badge */}
                  <div className="mb-3.5 grid grid-cols-3 gap-1.5 text-center">
                    <div className="p-1.5 rounded-xl bg-blue-50/80 border border-blue-100">
                      <div className="text-[9px] font-bold uppercase text-blue-700">Dạng 1 (TN)</div>
                      <div className="text-xs font-black text-blue-900">{mcCount} câu</div>
                    </div>
                    <div className="p-1.5 rounded-xl bg-emerald-50/80 border border-emerald-100">
                      <div className="text-[9px] font-bold uppercase text-emerald-700">Dạng 2 (Đ/S)</div>
                      <div className="text-xs font-black text-emerald-900">{tfCount} câu</div>
                    </div>
                    <div className="p-1.5 rounded-xl bg-purple-50/80 border border-purple-100">
                      <div className="text-[9px] font-bold uppercase text-purple-700">Dạng 3 (TLN)</div>
                      <div className="text-xs font-black text-purple-900">{saCount} câu</div>
                    </div>
                  </div>

                  {/* Lesson List with clean pills */}
                  <div className="space-y-1.5 mb-4 bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Nội dung bài học:</div>
                    {chapter.lessons.slice(0, 3).map((lesson, lIdx) => (
                      <div key={lesson.id} className="text-xs text-slate-700 flex items-center gap-2 py-0.5">
                        <span className="w-4 h-4 rounded-full bg-white shadow-xs text-cyan-700 text-[10px] font-bold flex items-center justify-center shrink-0 border border-slate-200">
                          {lIdx + 1}
                        </span>
                        <span className="font-medium truncate text-[11px]">{lesson.name || lesson.title}</span>
                      </div>
                    ))}
                    {chapter.lessons.length > 3 && (
                      <div className="text-[10px] text-slate-400 font-semibold pt-1 italic">
                        + {chapter.lessons.length - 3} bài học bổ sung
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2 space-y-2.5">
                  {/* Teacher-fixed practice configuration banner */}
                  <div className="p-2.5 rounded-xl bg-cyan-50/60 border border-cyan-100 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-cyan-600" />
                      <span className="font-semibold text-slate-700">Quy định GV:</span>
                    </div>
                    <div className="font-bold text-cyan-900">
                      <span className="text-cyan-700">{questionCount} câu</span> • <span>{durationMin} phút</span>
                    </div>
                  </div>

                  {/* Student Single-Click Start Button */}
                  <button
                    onClick={() => {
                      onStartPractice(`chapter-practice:${normId}:${questionCount}`, undefined, normId);
                    }}
                    className={`w-full py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white rounded-full text-xs font-bold transition-all flex items-center justify-center gap-1.5 uppercase tracking-wide cursor-pointer shadow-xs hover:shadow-md hover:scale-[1.01]`}
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>Bắt đầu Luyện tập ({questionCount} câu)</span>
                  </button>

                  {(isTeacher || isAdmin) && (
                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5 px-1">
                      <span>Ngân hàng: {bankStats.total} câu</span>
                      <button
                        type="button"
                        onClick={openTeacherModal}
                        className="text-amber-600 hover:text-amber-700 font-semibold cursor-pointer underline"
                      >
                        Đổi dạng thức
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 3: Online Exam Sets (KHO ĐỀ THI & KHẢO THÍ TRỰC TUYẾN) */}
      <div className="bg-white/95 backdrop-blur-md p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-5">
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl ring-4 ring-indigo-50/50">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Kho Đề Thi & Khảo Thí Trực Tuyến</h2>
              <p className="text-xs text-slate-500 font-medium">Bộ đề thi trọn vẹn, đề kiểm tra định kỳ từ thầy cô và hệ thống</p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('exam_manager')}
            className="text-xs font-bold text-cyan-600 hover:text-cyan-700 flex items-center gap-1 cursor-pointer"
          >
            <span>Xem tất cả ({sets.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {sets.length === 0 ? (
          <div className="p-8 text-center bg-slate-50/70 rounded-2xl border border-dashed border-slate-200 text-xs text-slate-400 font-medium">
            Chưa có đề thi nào trong kho đề. Hãy quay lại sau nhé!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sets.slice(0, 6).map(s => {
              const isMatrix = s.type === 'MATRIX_DYNAMIC' || Boolean(s.matrixConfig);
              const qCount = s.matrixConfig?.totalQuestions || ((s.questions && s.questions.length > 0) ? s.questions.length : (s.questionIds?.length || 0));
              const isStandalone = s.type === 'STANDALONE_WORD' || Boolean(s.questions && s.questions.length > 0);
              return (
                <div
                  key={s.id}
                  className="p-5 rounded-2xl border border-slate-200/80 bg-white hover:border-cyan-300 hover:shadow-lg transition-all flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs mb-2.5">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                        isMatrix 
                          ? 'bg-purple-50 text-purple-800 border-purple-200' 
                          : isStandalone 
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                            : 'bg-cyan-50 text-cyan-800 border-cyan-200'
                      }`}>
                        {isMatrix ? 'Đề Ma trận Tự động' : isStandalone ? 'Đề thi chuẩn' : 'Bộ đề trắc nghiệm'}
                      </span>
                      <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{s.durationMinutes || 45} phút</span>
                      </span>
                    </div>

                    <h3 className="text-sm font-black text-slate-900 mb-1.5 leading-snug group-hover:text-cyan-600 transition-colors line-clamp-2">
                      {s.title}
                    </h3>

                    <p className="text-xs text-slate-500 line-clamp-2 mb-3 leading-relaxed font-normal">
                      {s.description || 'Đề kiểm tra Hóa học 10 GDPT 2018 với đáp án và lời giải chi tiết.'}
                    </p>

                    <div className="flex items-center justify-between text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 mb-4 font-semibold">
                      <span>Số lượng: <strong className="text-cyan-700">{qCount} câu hỏi</strong></span>
                      <span>Thang điểm: <strong>10đ</strong></span>
                    </div>
                  </div>

                  <div>
                    <button
                      onClick={() => onStartPractice(s.id, undefined, s.chapterId)}
                      className="w-full py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white rounded-full text-xs font-bold transition-all flex items-center justify-center gap-1.5 uppercase tracking-wide cursor-pointer shadow-xs hover:shadow-md hover:scale-[1.01]"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>Vào làm đề thi này</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pre-flight Confirmation Modal */}
      {selectedPreflightAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-cyan-50 text-cyan-800 border border-cyan-200">
                  {selectedPreflightAssignment.className}
                </span>
                <h3 className="text-base font-black text-slate-900 mt-1">
                  {selectedPreflightAssignment.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedPreflightAssignment(null)}
                className="p-1 text-slate-400 hover:text-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Thời gian làm bài:</span>
                <strong className="text-slate-900">
                  {selectedPreflightAssignment.durationMinutes === 0 ? 'Không giới hạn' : `${selectedPreflightAssignment.durationMinutes} phút`}
                </strong>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500">Số lần được làm:</span>
                <strong className="text-slate-900">
                  {selectedPreflightAssignment.maxAttempts > 10 ? 'Không giới hạn' : `${selectedPreflightAssignment.maxAttempts} lần`}
                </strong>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500">Giáo viên phụ trách:</span>
                <strong className="text-slate-900">{selectedPreflightAssignment.teacherName}</strong>
              </div>

              {selectedPreflightAssignment.instructions && (
                <div className="pt-2 border-t border-slate-200 text-slate-600">
                  <strong className="text-slate-900 block mb-0.5">Dặn dò:</strong>
                  {selectedPreflightAssignment.instructions}
                </div>
              )}
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-2.5 text-xs text-amber-900">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                Sau khi bấm <strong>"Bắt đầu làm bài"</strong>, đồng hồ đếm ngược sẽ chạy. Hãy đảm bảo bạn có đường truyền mạng ổn định.
              </span>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedPreflightAssignment(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full text-xs font-bold uppercase tracking-wide cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmStart}
                className="flex-1 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-full text-xs font-bold shadow-md shadow-cyan-600/20 uppercase tracking-wide flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Bắt đầu làm bài</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Teacher-Only Chapter Practice Configuration Modal (Manual Format Customization) */}
      {isTeacherModalOpen && (isTeacher || isAdmin) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col p-5 sm:p-6 shadow-2xl border border-slate-200 animate-scale-in">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-50 text-amber-600 rounded-2xl ring-4 ring-amber-50/50">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-slate-900">
                      Tùy chỉnh Phân loại Dạng thức 7 Chương GDPT 2018
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-800">
                      Thủ công (K tự động)
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Thầy/Cô chủ động cài đặt số lượng câu hỏi cho từng <strong>Dạng thức</strong> (Dạng 1: TN, Dạng 2: Đúng/Sai, Dạng 3: Trả lời ngắn).
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsTeacherModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
              {/* Quick Preset Buttons */}
              <div className="p-4 bg-gradient-to-r from-amber-50/90 via-orange-50/70 to-amber-50/90 border border-amber-200/80 rounded-2xl space-y-2.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-amber-900 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>Mẫu cấu hình nhanh cho cả 7 Chương:</span>
                  </span>
                  <span className="text-[10px] text-amber-700 font-normal">Bấm mẫu để áp dụng đồng loạt</span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => applyTeacherPresetAll({ mc: 16, tf: 3, sa: 3, time: 35 })}
                    className="p-2.5 rounded-xl bg-white hover:bg-amber-600 hover:text-white text-slate-700 text-left border-2 border-amber-300 shadow-xs transition-all cursor-pointer group"
                  >
                    <div className="text-xs font-black group-hover:text-white text-amber-950 flex items-center justify-between">
                      <span>⭐ Mẫu 22 câu (16 TN - 3 Đ/S - 3 TLN)</span>
                    </div>
                    <div className="text-[10px] text-slate-500 group-hover:text-amber-100 mt-0.5">
                      16 TN • 3 Đ/S • 3 TLN = <strong>22 câu (35p)</strong>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => applyTeacherPresetAll({ mc: 18, tf: 4, sa: 6, time: 50 })}
                    className="p-2.5 rounded-xl bg-white hover:bg-amber-600 hover:text-white text-slate-700 text-left border border-amber-200 shadow-xs transition-all cursor-pointer group"
                  >
                    <div className="text-xs font-bold group-hover:text-white text-amber-950">🏆 Chuẩn TN THPT 2025</div>
                    <div className="text-[10px] text-slate-500 group-hover:text-amber-100 mt-0.5">
                      18 TN • 4 Đ/S • 6 TLN = <strong>28 câu (50p)</strong>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => applyTeacherPresetAll({ mc: 12, tf: 4, sa: 4, time: 30 })}
                    className="p-2.5 rounded-xl bg-white hover:bg-amber-600 hover:text-white text-slate-700 text-left border border-amber-200 shadow-xs transition-all cursor-pointer group"
                  >
                    <div className="text-xs font-bold group-hover:text-white text-amber-950">⚡ Luyện tập 20 câu</div>
                    <div className="text-[10px] text-slate-500 group-hover:text-amber-100 mt-0.5">
                      12 TN • 4 Đ/S • 4 TLN = <strong>20 câu (30p)</strong>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => applyTeacherPresetAll({ mc: 9, tf: 3, sa: 3, time: 22 })}
                    className="p-2.5 rounded-xl bg-white hover:bg-amber-600 hover:text-white text-slate-700 text-left border border-amber-200 shadow-xs transition-all cursor-pointer group"
                  >
                    <div className="text-xs font-bold group-hover:text-white text-amber-950">🎯 Luyện tập 15 câu</div>
                    <div className="text-[10px] text-slate-500 group-hover:text-amber-100 mt-0.5">
                      9 TN • 3 Đ/S • 3 TLN = <strong>15 câu (22p)</strong>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => applyTeacherPresetAll({ mc: 6, tf: 2, sa: 2, time: 15 })}
                    className="p-2.5 rounded-xl bg-white hover:bg-amber-600 hover:text-white text-slate-700 text-left border border-amber-200 shadow-xs transition-all cursor-pointer group"
                  >
                    <div className="text-xs font-bold group-hover:text-white text-amber-950">🚀 Luyện nhanh 10 câu</div>
                    <div className="text-[10px] text-slate-500 group-hover:text-amber-100 mt-0.5">
                      6 TN • 2 Đ/S • 2 TLN = <strong>10 câu (15p)</strong>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => applyTeacherPresetAll({ mc: 20, tf: 0, sa: 0, time: 25 })}
                    className="p-2.5 rounded-xl bg-white hover:bg-amber-600 hover:text-white text-slate-700 text-left border border-amber-200 shadow-xs transition-all cursor-pointer group"
                  >
                    <div className="text-xs font-bold group-hover:text-white text-amber-950">📝 100% Trắc nghiệm 4 lựa chọn</div>
                    <div className="text-[10px] text-slate-500 group-hover:text-amber-100 mt-0.5">
                      20 TN • 0 Đ/S • 0 TLN = <strong>20 câu (25p)</strong>
                    </div>
                  </button>
                </div>
              </div>

              {/* 7 Chapter Manual Format Cards */}
              <div className="space-y-3">
                {CHEMISTRY_10_CURRICULUM.map((ch, idx) => {
                  const normId = normalizeChapterId(ch.id);
                  const edit = teacherEditingConfigs[ch.id] || { multiple_choice: 12, true_false: 4, short_answer: 4, durationMinutes: 30 };
                  const bStat = bankStatsByChapter[normId] || { total: 0, multiple_choice: 0, true_false: 0, short_answer: 0 };
                  const totalQ = edit.multiple_choice + edit.true_false + edit.short_answer;
                  const durMin = edit.durationMinutes || Math.max(10, Math.round(totalQ * 1.5));

                  const isMcExceed = edit.multiple_choice > bStat.multiple_choice;
                  const isTfExceed = edit.true_false > bStat.true_false;
                  const isSaExceed = edit.short_answer > bStat.short_answer;

                  return (
                    <div
                      key={ch.id}
                      className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-cyan-300 transition-all space-y-3"
                    >
                      {/* Card Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200/70">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase bg-cyan-100 text-cyan-800">
                            Chương {idx + 1}
                          </span>
                          <h4 className="text-xs font-bold text-slate-900">
                            {ch.title.split(': ')[1] || ch.title}
                          </h4>
                        </div>

                        <div className="flex items-center gap-2 text-xs">
                          <span className="px-2.5 py-0.5 rounded-full bg-cyan-600 text-white font-black text-[11px]">
                            Tổng: {totalQ} câu
                          </span>
                          <div className="flex items-center gap-1 bg-white px-2 py-0.5 rounded-lg border border-slate-200">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <input
                              type="number"
                              min={5}
                              max={180}
                              value={durMin}
                              onChange={e => {
                                const val = Math.max(5, parseInt(e.target.value) || 10);
                                setTeacherEditingConfigs(prev => ({
                                  ...prev,
                                  [ch.id]: { ...(prev[ch.id] || edit), durationMinutes: val }
                                }));
                              }}
                              className="w-8 text-center font-bold text-xs text-slate-800 focus:outline-none"
                            />
                            <span className="text-[10px] text-slate-500">phút</span>
                          </div>
                        </div>
                      </div>

                      {/* 3 Format Input Columns */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {/* Dạng 1: Trắc nghiệm 4 lựa chọn */}
                        <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-blue-900 flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                              <span>Dạng 1: Trắc nghiệm</span>
                            </span>
                            <span className={`text-[10px] font-semibold ${isMcExceed ? 'text-amber-600 font-bold' : 'text-slate-400'}`}>
                              Kho: {bStat.multiple_choice}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-1">
                            <button
                              type="button"
                              onClick={() => updateSingleChapterFormat(ch.id, 'multiple_choice', -1)}
                              className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center cursor-pointer"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={edit.multiple_choice}
                              onChange={e => setSingleChapterFormatValue(ch.id, 'multiple_choice', parseInt(e.target.value) || 0)}
                              className="w-12 text-center font-black text-xs text-blue-950 focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => updateSingleChapterFormat(ch.id, 'multiple_choice', 1)}
                              className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* Dạng 2: Đúng / Sai 4 ý */}
                        <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-emerald-900 flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                              <span>Dạng 2: Đúng / Sai</span>
                            </span>
                            <span className={`text-[10px] font-semibold ${isTfExceed ? 'text-amber-600 font-bold' : 'text-slate-400'}`}>
                              Kho: {bStat.true_false}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-1">
                            <button
                              type="button"
                              onClick={() => updateSingleChapterFormat(ch.id, 'true_false', -1)}
                              className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center cursor-pointer"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={edit.true_false}
                              onChange={e => setSingleChapterFormatValue(ch.id, 'true_false', parseInt(e.target.value) || 0)}
                              className="w-12 text-center font-black text-xs text-emerald-950 focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => updateSingleChapterFormat(ch.id, 'true_false', 1)}
                              className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* Dạng 3: Trả lời ngắn */}
                        <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-purple-900 flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-purple-500 inline-block" />
                              <span>Dạng 3: Trả lời ngắn</span>
                            </span>
                            <span className={`text-[10px] font-semibold ${isSaExceed ? 'text-amber-600 font-bold' : 'text-slate-400'}`}>
                              Kho: {bStat.short_answer}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-1">
                            <button
                              type="button"
                              onClick={() => updateSingleChapterFormat(ch.id, 'short_answer', -1)}
                              className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center cursor-pointer"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={edit.short_answer}
                              onChange={e => setSingleChapterFormatValue(ch.id, 'short_answer', parseInt(e.target.value) || 0)}
                              className="w-12 text-center font-black text-xs text-purple-950 focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => updateSingleChapterFormat(ch.id, 'short_answer', 1)}
                              className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>

                      {(isMcExceed || isTfExceed || isSaExceed) && (
                        <div className="text-[10px] text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200 flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>Lưu ý: Số câu cài đặt một số dạng vượt quá số câu có sẵn trong ngân hàng hiện tại của chương này.</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-4 border-t border-slate-100 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsTeacherModalOpen(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full text-xs font-bold uppercase tracking-wide cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={isSavingConfigs}
                onClick={handleSaveTeacherConfigs}
                className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-full text-xs font-bold shadow-md shadow-amber-500/20 uppercase tracking-wide flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSavingConfigs ? 'Đang lưu...' : 'Lưu Cấu Hình Dạng Thức Cho Học Sinh'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
