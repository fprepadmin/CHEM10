import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  GraduationCap, 
  BookOpen, 
  Clock, 
  Award, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  Play, 
  RotateCcw, 
  ArrowRight, 
  Mail, 
  UserCheck, 
  User as UserIcon,
  ShieldCheck,
  Search,
  Filter,
  Flame,
  Sparkles,
  HelpCircle,
  FileText
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { classService, assignmentService, submissionService } from '../services/dbService';
import { ClassRoom, Assignment, Submission, StudentInClass } from '../types';

interface StudentClassViewProps {
  onStartPractice: (setId: string, assignmentId?: string, chapterId?: string) => void;
  onNavigate: (tab: string) => void;
}

export const StudentClassView: React.FC<StudentClassViewProps> = ({ onStartPractice, onNavigate }) => {
  const { user } = useAuth();
  
  const [currentClass, setCurrentClass] = useState<ClassRoom | null>(null);
  const [classmates, setClassmates] = useState<StudentInClass[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Filter & Search state
  const [assignmentFilter, setAssignmentFilter] = useState<'ALL' | 'PENDING' | 'SUBMITTED' | 'ENDED'>('ALL');
  const [assignmentSearch, setAssignmentSearch] = useState<string>('');
  const [showClassmatesModal, setShowClassmatesModal] = useState<boolean>(false);
  const [selectedPreflightAssignment, setSelectedPreflightAssignment] = useState<Assignment | null>(null);

  useEffect(() => {
    const fetchClassData = async () => {
      setLoading(true);
      try {
        const studentEmail = (user?.email || '').toLowerCase().trim();
        const allClasses = await classService.getClasses();

        // Match student class
        let matched: ClassRoom | null = null;
        if (user?.classId) {
          matched = allClasses.find(c => c.name === user.classId || c.id === user.classId) || null;
        }
        if (!matched && studentEmail) {
          matched = allClasses.find(c => 
            c.studentEmails && c.studentEmails.some(e => e.toLowerCase().trim() === studentEmail)
          ) || null;
        }

        if (matched) {
          setCurrentClass(matched);
          const studentEmail = (user?.email || '').toLowerCase().trim();
          
          // Fast classmates derivation (instant 0ms)
          const fastClassmates: StudentInClass[] = (matched.studentEmails || []).map(email => {
            const norm = email.toLowerCase().trim();
            const displayName = norm.split('@')[0]
              .split(/[._-]/)
              .map(p => p.charAt(0).toUpperCase() + p.slice(1))
              .join(' ');
            return {
              email: norm,
              displayName: norm === studentEmail ? (user?.displayName || displayName) : displayName,
              status: 'ACTIVE',
              hasLoggedIn: true,
              submissionsCount: 0,
              avgScore: 0,
              completedCount: 0,
              pendingCount: 0
            };
          });
          setClassmates(fastClassmates);

          const [assignList, studentSubs] = await Promise.all([
            assignmentService.getAssignmentsForClass(matched.id),
            studentEmail ? submissionService.getSubmissionsByStudent(studentEmail) : Promise.resolve([])
          ]);
          setAssignments(assignList);
          setSubmissions(studentSubs);
        } else {
          // If no class found yet, try fetching all assignments for this student
          const [allAssigns, studentSubs] = await Promise.all([
            studentEmail ? assignmentService.getAssignmentsForStudent(studentEmail, user?.classId || '') : Promise.resolve([]),
            studentEmail ? submissionService.getSubmissionsByStudent(studentEmail) : Promise.resolve([])
          ]);
          setAssignments(allAssigns);
          setSubmissions(studentSubs);
        }
      } catch (err) {
        console.error("Error loading student class data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchClassData();
  }, [user]);

  // Filtered assignments
  const filteredAssignments = useMemo(() => {
    return assignments.filter(a => {
      const studentSubs = submissions.filter(s => s.assignmentId === a.id);
      const isSubmitted = studentSubs.length > 0;
      const isEnded = (a.status || '').toUpperCase() === 'ENDED' || (a.status || '').toUpperCase() === 'CLOSED';

      if (assignmentFilter === 'PENDING' && (isSubmitted || isEnded)) return false;
      if (assignmentFilter === 'SUBMITTED' && !isSubmitted) return false;
      if (assignmentFilter === 'ENDED' && !isEnded) return false;

      if (assignmentSearch.trim()) {
        const term = assignmentSearch.toLowerCase();
        return (
          a.title.toLowerCase().includes(term) ||
          (a.teacherName && a.teacherName.toLowerCase().includes(term))
        );
      }

      return true;
    });
  }, [assignments, submissions, assignmentFilter, assignmentSearch]);

  const handleOpenPreflight = (assign: Assignment) => {
    setSelectedPreflightAssignment(assign);
  };

  const handleConfirmStart = () => {
    if (!selectedPreflightAssignment) return;
    const a = selectedPreflightAssignment;
    setSelectedPreflightAssignment(null);
    onStartPractice(a.questionSetId, a.id);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-500">
        <div className="w-10 h-10 border-4 border-cyan-200 border-t-cyan-600 rounded-full animate-spin mb-3" />
        <p className="text-xs font-semibold">Đang tải thông tin lớp học...</p>
      </div>
    );
  }

  const defaultCoverUrl = 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=1200&q=80';

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      {/* CLASS HEADER OVERVIEW BANNER WITH COVER IMAGE */}
      <div className="relative rounded-3xl overflow-hidden shadow-xl border border-slate-800 bg-slate-950">
        {/* Cover image background */}
        <div className="absolute inset-0 z-0">
          <img 
            src={currentClass?.coverImageUrl || defaultCoverUrl} 
            alt={currentClass?.name || 'Lớp học'} 
            className="w-full h-full object-cover object-center filter brightness-50"
            onError={(e) => {
              (e.target as HTMLImageElement).src = defaultCoverUrl;
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-900/85 to-cyan-950/75" />
          <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        </div>

        <div className="relative z-10 p-6 sm:p-8 text-white flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 bg-cyan-500/20 border border-cyan-400/30 rounded-full text-xs font-black uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-cyan-400" />
                <span>Khối 10 • Hóa học THPT</span>
              </span>
              <span className="px-3 py-1 bg-emerald-500/20 border border-emerald-400/30 rounded-full text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Đã đăng nhập</span>
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              <span>{currentClass ? `Lớp học: ${currentClass.name}` : `Lớp: ${user?.classId || 'Chưa phân lớp'}`}</span>
            </h1>

            <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
              Theo dõi và hoàn thành toàn bộ bài tập, đề kiểm tra định kỳ được giáo viên giao cho lớp.
            </p>

            {/* Student & Teacher Info Pills */}
            <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-slate-300">
              <div className="flex items-center gap-2 bg-white/10 px-3.5 py-2 rounded-2xl backdrop-blur-xs border border-white/10">
                <div className="w-6 h-6 rounded-full bg-cyan-500 flex items-center justify-center font-bold text-white text-[10px]">
                  GV
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block font-bold uppercase">Giáo viên phụ trách</span>
                  <strong className="text-white font-semibold">
                    {currentClass?.teacherName || 'Nguyễn Tuyền Muội'}
                  </strong>
                  <span className="text-cyan-300 text-[11px] block font-mono">
                    {currentClass?.teacherEmail || 'muoint@fpt.edu.vn'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-white/10 px-3.5 py-2 rounded-2xl backdrop-blur-xs border border-white/10">
                <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center font-bold text-white text-[10px]">
                  HS
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block font-bold uppercase">Học sinh ({user?.displayName || 'Bạn'})</span>
                  <div className="flex items-center gap-2">
                    <strong className="text-white font-semibold">{user?.displayName || user?.email}</strong>
                    {user?.mshs && (
                      <span className="px-2 py-0.5 bg-cyan-400/30 text-cyan-200 rounded font-mono text-[10px] font-bold">
                        MSHS: {user.mshs}
                      </span>
                    )}
                  </div>
                  <span className="text-slate-300 text-[11px] block font-mono">{user?.email}</span>
                </div>
              </div>

              {currentClass && (
                <button
                  onClick={() => setShowClassmatesModal(true)}
                  className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-3.5 py-2 rounded-2xl backdrop-blur-xs border border-white/10 text-white font-bold transition-all cursor-pointer"
                >
                  <Users className="w-4 h-4 text-cyan-400" />
                  <span>Sĩ số: <strong>{classmates.length || currentClass.studentCount || currentClass.studentEmails?.length || 0}</strong> bạn</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ASSIGNMENTS SECTION */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-cyan-600" />
              <span>Danh sách Đề thi & Bài tập được giao ({assignments.length})</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Hãy hoàn thành đúng hạn các bài kiểm tra để tích lũy điểm số và đánh giá mức độ hiểu bài.
            </p>
          </div>

          {/* Filter tabs */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200 text-xs">
            <button
              onClick={() => setAssignmentFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                assignmentFilter === 'ALL'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Tất cả ({assignments.length})
            </button>
            <button
              onClick={() => setAssignmentFilter('PENDING')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                assignmentFilter === 'PENDING'
                  ? 'bg-white text-amber-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Chưa làm
            </button>
            <button
              onClick={() => setAssignmentFilter('SUBMITTED')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                assignmentFilter === 'SUBMITTED'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Đã nộp
            </button>
            <button
              onClick={() => setAssignmentFilter('ENDED')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                assignmentFilter === 'ENDED'
                  ? 'bg-white text-slate-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Đã đóng
            </button>
          </div>
        </div>

        {/* Search bar */}
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm kiếm theo tên bài kiểm tra..."
            value={assignmentSearch}
            onChange={(e) => setAssignmentSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Assignment Cards List */}
        {filteredAssignments.length === 0 ? (
          <div className="p-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
            <FileText className="w-10 h-10 text-slate-300 mx-auto" />
            <h4 className="text-sm font-bold text-slate-700">Chưa có bài kiểm tra nào phù hợp</h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Khi giáo viên giao bài tập hoặc đề thi mới cho lớp, danh sách sẽ tự động hiển thị tại đây.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredAssignments.map(a => {
              const studentSubs = submissions.filter(s => s.assignmentId === a.id);
              const attemptsCount = studentSubs.length;
              const hasSubmitted = attemptsCount > 0;
              const isEnded = (a.status || '').toUpperCase() === 'ENDED' || (a.status || '').toUpperCase() === 'CLOSED';
              const maxAttempts = a.maxAttempts || 1;
              const canAttemptMore = attemptsCount < maxAttempts;
              const bestScore = hasSubmitted ? Math.max(...studentSubs.map(s => s.score)) : null;

              return (
                <div
                  key={a.id}
                  className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs hover:shadow-md hover:border-cyan-200 transition-all flex flex-col justify-between group"
                >
                  <div className="space-y-3">
                    {/* Status & Deadline Header */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        {hasSubmitted ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Đã nộp ({attemptsCount}/{maxAttempts > 10 ? '∞' : maxAttempts} lần)</span>
                          </span>
                        ) : isEnded ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                            Đã kết thúc
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span>Chưa làm</span>
                          </span>
                        )}

                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
                          {a.className || currentClass?.name || 'Toàn lớp'}
                        </span>
                      </div>

                      <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>Hạn: {a.endAt ? a.endAt.split('T')[0] : a.deadline || 'Không giới hạn'}</span>
                      </span>
                    </div>

                    {/* Title & Metadata */}
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 group-hover:text-cyan-700 transition-colors">
                        {a.title}
                      </h3>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        <span>Thời lượng: <strong>{a.durationMinutes === 0 ? 'Tự do' : `${a.durationMinutes} phút`}</strong></span>
                        <span>•</span>
                        <span>Giáo viên: <strong>{a.teacherName}</strong></span>
                      </div>
                      {a.instructions && (
                        <p className="mt-2 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 italic">
                          "{a.instructions}"
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions & Score Footer */}
                  <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                    <div>
                      {hasSubmitted && bestScore !== null && (
                        <div className="text-xs">
                          <span className="text-slate-400 text-[10px] block font-bold uppercase">Điểm cao nhất</span>
                          <span className="font-black text-emerald-600 text-base">{bestScore} <span className="text-xs font-normal text-slate-400">/ 10</span></span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {hasSubmitted && (
                        <button
                          onClick={() => onNavigate('student_history')}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-full transition-colors cursor-pointer"
                        >
                          Xem bài làm
                        </button>
                      )}

                      {!isEnded && (canAttemptMore || !hasSubmitted) ? (
                        <button
                          onClick={() => handleOpenPreflight(a)}
                          className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold rounded-full shadow-md shadow-cyan-600/20 flex items-center gap-1.5 uppercase tracking-wide transition-all cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>{hasSubmitted ? 'Làm lại bài' : 'Bắt đầu làm bài'}</span>
                        </button>
                      ) : (
                        <span className="text-xs font-semibold text-slate-400 italic">
                          {isEnded ? 'Bài đã đóng' : 'Đã hết lượt làm'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* PRE-FLIGHT CONFIRMATION MODAL */}
      {selectedPreflightAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-cyan-50 border border-cyan-200 flex items-center justify-center text-cyan-600 shrink-0">
                <Play className="w-5 h-5 fill-current" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Bắt đầu làm bài thi</h3>
                <p className="text-xs text-slate-500">Xác nhận thông tin bài thi trước khi tính giờ</p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] font-bold uppercase">Tên bài kiểm tra</span>
                <strong className="text-slate-900 text-sm">{selectedPreflightAssignment.title}</strong>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 text-slate-600">
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Thời gian</span>
                  <strong>{selectedPreflightAssignment.durationMinutes > 0 ? `${selectedPreflightAssignment.durationMinutes} phút` : 'Tự do'}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Giáo viên</span>
                  <strong>{selectedPreflightAssignment.teacherName}</strong>
                </div>
              </div>
            </div>

            <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 text-[11px] flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                Thời gian làm bài sẽ được tính ngay khi bạn bấm nút <strong>"Vào làm bài ngay"</strong>. Hãy đảm bảo kết nối mạng ổn định!
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedPreflightAssignment(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-full transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleConfirmStart}
                className="px-5 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold rounded-full shadow-md shadow-cyan-600/20 uppercase tracking-wide transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>Vào làm bài ngay</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CLASSMATES LIST MODAL */}
      {showClassmatesModal && currentClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-cyan-600" />
                <h3 className="text-base font-black text-slate-900">
                  Danh sách thành viên lớp {currentClass.name}
                </h3>
              </div>
              <button
                onClick={() => setShowClassmatesModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                    <th className="py-2.5 px-3 w-10 text-center">STT</th>
                    <th className="py-2.5 px-3">MSHS</th>
                    <th className="py-2.5 px-3">Họ và tên</th>
                    <th className="py-2.5 px-3">Email</th>
                    <th className="py-2.5 px-3 text-center">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {classmates.map((c, i) => (
                    <tr key={c.email || i} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-3 text-center text-slate-400 font-semibold text-[11px]">{i + 1}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-cyan-700 text-[11px]">{c.mshs || '—'}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">{c.displayName}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-500 text-[11px]">{c.email}</td>
                      <td className="py-2.5 px-3 text-center">
                        {c.status === 'ACTIVE' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            Đã đăng nhập
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                            Chưa đăng nhập
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowClassmatesModal(false)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-full text-xs font-bold uppercase tracking-wide cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
