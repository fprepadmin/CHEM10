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
  RotateCcw
} from 'lucide-react';
import { CHEMISTRY_10_CURRICULUM } from '../data/curriculum';
import { questionSetService, assignmentService, submissionService } from '../services/dbService';
import { useAuth } from '../context/AuthContext';
import { QuestionSet, Assignment, Submission } from '../types';

interface StudentHomeViewProps {
  onStartPractice: (setId: string, assignmentId?: string) => void;
  onNavigate: (tab: string) => void;
}

export const StudentHomeView: React.FC<StudentHomeViewProps> = ({ onStartPractice, onNavigate }) => {
  const { user } = useAuth();
  const [sets, setSets] = useState<QuestionSet[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  // Pre-flight confirmation modal before starting an assignment
  const [selectedPreflightAssignment, setSelectedPreflightAssignment] = useState<Assignment | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const studentEmail = user?.email || 'student.hoa10@fpt.edu.vn';
        const [s, a, sub] = await Promise.all([
          questionSetService.getSets(),
          assignmentService.getAssignmentsForStudent(studentEmail, user?.classId || '10A1'),
          submissionService.getSubmissionsByStudent(studentEmail)
        ]);
        setSets(s);
        setAssignments(a);
        setSubmissions(sub);
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
    : '8.5';

  const handleOpenPreflight = (assign: Assignment) => {
    setSelectedPreflightAssignment(assign);
  };

  const handleConfirmStart = () => {
    if (!selectedPreflightAssignment) return;
    const a = selectedPreflightAssignment;
    setSelectedPreflightAssignment(null);
    onStartPractice(a.questionSetId, a.id);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      {/* Student Welcome Banner */}
      <div className="bg-gradient-to-br from-cyan-600 via-blue-600 to-slate-900 rounded-2xl p-6 sm:p-8 text-white relative overflow-hidden shadow-lg shadow-cyan-600/15">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-cyan-400/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 backdrop-blur-xs border border-white/20 rounded-full text-[10px] font-bold uppercase tracking-wider text-cyan-200 mb-3">
            <Flame className="w-3.5 h-3.5 text-cyan-300" />
            <span>Học Hóa thông minh – Luyện tập chủ động – Tiến bộ mỗi ngày</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Xin chào, {user?.displayName || 'Học sinh Hóa 10'}! 👋
          </h1>
          <p className="text-slate-200 text-xs sm:text-sm mt-2 leading-relaxed">
            Hôm nay bạn muốn củng cố kiến thức Chương nào? Hãy bắt đầu làm bài luyện tập hoặc hoàn thành bài kiểm tra do thầy cô giao nhé!
          </p>

          <div className="flex flex-wrap items-center gap-3 mt-5">
            <button
              onClick={() => {
                if (assignments.length > 0) {
                  handleOpenPreflight(assignments[0]);
                } else if (sets.length > 0) {
                  onStartPractice(sets[0].id);
                }
              }}
              className="px-4 py-2.5 bg-white text-slate-900 hover:bg-slate-100 font-bold rounded-full text-xs flex items-center gap-1.5 shadow-md uppercase tracking-wide transition-all"
            >
              <Play className="w-3.5 h-3.5 fill-cyan-600 text-cyan-600" />
              <span>Bắt đầu bài kiểm tra mới nhất</span>
            </button>
            <button
              onClick={() => onNavigate('student_history')}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full text-xs font-bold border border-white/20 uppercase tracking-wide transition-all"
            >
              Xem lịch sử điểm số →
            </button>
          </div>
        </div>
      </div>

      {/* Progress Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10 font-bold text-4xl text-cyan-600 select-none">
            T
          </div>
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 bg-cyan-50 text-cyan-600 rounded-xl">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Số bài đã làm</div>
              <div className="text-2xl font-black text-slate-900 mt-0.5">{completedCount} bài</div>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10 font-bold text-4xl text-emerald-600 select-none">
            A
          </div>
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Điểm trung bình</div>
              <div className="text-2xl font-black text-slate-900 mt-0.5">{avgScore} <span className="text-xs font-normal text-slate-400">/ 10</span></div>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10 font-bold text-4xl text-purple-600 select-none">
            S
          </div>
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Chủ đề thế mạnh</div>
              <div className="text-xs sm:text-sm font-bold text-slate-900 truncate max-w-[150px] mt-0.5">Cấu tạo nguyên tử</div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 1: Assigned Tests (BÀI ÔN TẬP ĐƯỢC GIAO) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-red-50 text-red-600 rounded-xl">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Bài ôn tập & Kiểm tra được giao</h2>
              <p className="text-xs text-slate-500">Các bài kiểm tra từ giáo viên phụ trách lớp</p>
            </div>
          </div>
        </div>

        {assignments.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-xs text-slate-400">
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
                  className="p-5 bg-slate-50/60 border border-slate-200 rounded-2xl flex flex-col justify-between hover:border-slate-300 hover:bg-slate-50 transition-all shadow-xs group"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-cyan-50 text-cyan-800 border border-cyan-200">
                          {a.className}
                        </span>
                        {hasSubmitted && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
                            ✓ Đã làm {attemptsCount} lần (Điểm: {bestScore}/10)
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

                      <span className="text-xs font-semibold text-red-600 flex items-center gap-1">
                        Hạn: {a.endAt ? a.endAt.split('T')[0] : a.deadline}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 mb-1 group-hover:text-cyan-700 transition-colors">
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
                        className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-2 uppercase tracking-wide"
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
                        className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-full text-xs font-bold shadow-md shadow-cyan-600/20 transition-all flex items-center justify-center gap-2 uppercase tracking-wide"
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

      {/* Section 2: Practice by Chapter (📚 ÔN TẬP THEO CHƯƠNG) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-cyan-50 text-cyan-600 rounded-xl">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Tự ôn tập theo 7 Chương GDPT 2018</h2>
              <p className="text-xs text-slate-500">Luyện tập trắc nghiệm và câu hỏi theo từng bài học</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {CHEMISTRY_10_CURRICULUM.map((chapter, idx) => (
            <div
              key={chapter.id}
              className="p-5 rounded-2xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-slate-300 hover:shadow-xs transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-bold text-cyan-700 uppercase tracking-wider text-[11px]">CHƯƠNG {idx + 1}</span>
                  <span className="text-[10px] text-slate-400 font-medium">{chapter.lessons.length} bài học</span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 mb-2 leading-snug">
                  {chapter.title.split(': ')[1] || chapter.title}
                </h3>
                <p className="text-xs text-slate-500 line-clamp-2 mb-4">
                  {chapter.description}
                </p>
              </div>

              <div className="space-y-1.5 pt-3 border-t border-slate-100">
                <button
                  onClick={() => {
                    const matchSet = sets.find(s => s.chapterId === chapter.id) || sets[0];
                    if (matchSet) onStartPractice(matchSet.id);
                  }}
                  className="w-full py-2 bg-white hover:bg-slate-50 text-cyan-700 border border-slate-200 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-1 uppercase tracking-wide"
                >
                  <span>Luyện đề chương này</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
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
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full text-xs font-bold uppercase tracking-wide"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmStart}
                className="flex-1 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-full text-xs font-bold shadow-md shadow-cyan-600/20 uppercase tracking-wide flex items-center justify-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Bắt đầu làm bài</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
