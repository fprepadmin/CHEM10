import React, { useEffect, useState } from 'react';
import { 
  BarChart3, 
  Users, 
  HelpCircle, 
  CheckCircle2, 
  BookOpen, 
  FileText, 
  TrendingUp, 
  AlertTriangle,
  ArrowRight,
  Plus
} from 'lucide-react';
import { questionService, questionSetService, assignmentService, submissionService, classService } from '../services/dbService';
import { Question, QuestionSet, Assignment, Submission, ClassRoom } from '../types';

interface DashboardViewProps {
  onNavigate: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [sets, setSets] = useState<QuestionSet[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [qList, sList, aList, subList, cList] = await Promise.all([
          questionService.getQuestions(),
          questionSetService.getSets(),
          assignmentService.getAssignments(),
          submissionService.getAllSubmissions(),
          classService.getClasses()
        ]);
        setQuestions(qList);
        setSets(sList);
        setAssignments(aList);
        setSubmissions(subList);
        setClasses(cList);
      } catch (err) {
        console.error("Error loading dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();

    // Live submissions synchronization for teacher dashboard stats
    const unsubscribe = submissionService.subscribeToAllSubmissions((liveSubs) => {
      setSubmissions(liveSubs);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const totalStudents = classes.reduce((sum, c) => sum + (c.studentCount || c.studentEmails?.length || 0), 0);
  const totalSubmissions = submissions.length;
  const avgScore = submissions.length > 0
    ? (submissions.reduce((acc, cur) => acc + (cur.score || 0), 0) / submissions.length).toFixed(1)
    : '0.0';
  const completionRate = totalStudents > 0 ? `${Math.min(100, Math.round((totalSubmissions / totalStudents) * 100))}%` : '0%';

  // Calculate dynamic question level distribution
  const totalQ = questions.length || 1;
  const nbCount = questions.filter(q => q.level === 'nhan_biet' || (q.level as any) === 'NHAN_BIET' || (q.level as any) === 'EASY' || (q.level as any) === '1').length;
  const thCount = questions.filter(q => q.level === 'thong_hieu' || (q.level as any) === 'THONG_HIEU' || (q.level as any) === 'MEDIUM' || (q.level as any) === '2').length;
  const vdCount = questions.filter(q => q.level === 'van_dung' || (q.level as any) === 'VAN_DUNG' || (q.level as any) === 'HARD' || (q.level as any) === '3').length;
  const vdcCount = questions.filter(q => q.level === 'van_dung_cao' || (q.level as any) === 'VAN_DUNG_CAO' || (q.level as any) === 'EXPERT' || (q.level as any) === '4').length;
  const nbPct = questions.length > 0 ? Math.round((nbCount / totalQ) * 100) : 0;
  const thPct = questions.length > 0 ? Math.round((thCount / totalQ) * 100) : 0;
  const vdPct = questions.length > 0 ? Math.round((vdCount / totalQ) * 100) : 0;
  const vdcPct = questions.length > 0 ? Math.round((vdcCount / totalQ) * 100) : 0;

  // Weak topics analytics from real submissions data
  const wrongQuestionsMap = new Map<string, { count: number; questionId: string }>();
  submissions.forEach(sub => {
    if (sub.details && Array.isArray(sub.details)) {
      sub.details.forEach(d => {
        if (!d.isCorrect && d.questionId) {
          const current = wrongQuestionsMap.get(d.questionId) || { count: 0, questionId: d.questionId };
          current.count++;
          wrongQuestionsMap.set(d.questionId, current);
        }
      });
    }
  });

  const weakTopics = Array.from(wrongQuestionsMap.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 3)
    .map(([qId, info]) => {
      const q = questions.find(item => item.id === qId);
      const failRate = totalSubmissions > 0 ? `${Math.round((info.count / totalSubmissions) * 100)}%` : '0%';
      return {
        topic: q?.content ? q.content.slice(0, 75) + '...' : `Câu hỏi mã #${qId.slice(0, 6)}`,
        chapter: q?.chapterId ? `Chương ${q.chapterId.replace(/\D/g, '') || q.chapterId}` : 'Chưa phân chương',
        failRate,
        suggestion: q?.explanation || 'Học sinh cần ôn lại lý thuyết trọng tâm của câu hỏi này.'
      };
    });

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      {/* Sleek Gradient Hero Banner */}
      <div className="bg-gradient-to-r from-cyan-600 via-sky-600 to-indigo-700 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-xl shadow-cyan-600/15 card-shine">
        <div className="absolute -right-12 -bottom-12 w-72 h-72 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white/15 backdrop-blur-md border border-white/20 rounded-full text-cyan-100 text-[11px] font-bold mb-3 uppercase tracking-wider">
            <BookOpen className="w-3.5 h-3.5 text-amber-300" />
            Hệ thống Ngân hàng Đề & Ôn tập Hóa học 10 GDPT 2018
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-tight">
            Bảng điều khiển Giảng dạy & Đánh giá năng lực
          </h1>
          <p className="text-cyan-50 text-xs sm:text-sm mt-2.5 leading-relaxed font-medium max-w-2xl">
            Theo dõi dữ liệu học tập thực tế của học sinh, quản lý 7 chương chương trình chuẩn và tạo bộ đề ôn tập trực tiếp từ ngân hàng câu hỏi.
          </p>

          <div className="flex flex-wrap items-center gap-2.5 mt-6">
            <button
              onClick={() => onNavigate('add_question')}
              className="px-4 py-2.5 bg-white text-slate-900 hover:bg-slate-50 rounded-full text-xs font-black flex items-center gap-2 shadow-lg shadow-slate-900/10 uppercase tracking-wide transition-all cursor-pointer hover:scale-[1.02]"
            >
              <Plus className="w-3.5 h-3.5 text-cyan-600" />
              <span>Thêm câu hỏi</span>
            </button>
            <button
              onClick={() => onNavigate('create_set')}
              className="px-4 py-2.5 bg-slate-900/80 hover:bg-slate-900 text-cyan-300 border border-cyan-400/30 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-sm uppercase tracking-wide transition-all cursor-pointer hover:scale-[1.02]"
            >
              <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
              <span>Tạo bộ đề ôn</span>
            </button>
            <button
              onClick={() => onNavigate('word_import')}
              className="px-4 py-2.5 bg-white/15 hover:bg-white/25 text-white border border-white/30 backdrop-blur-sm rounded-full text-xs font-bold flex items-center gap-1.5 transition-all uppercase tracking-wide shadow-sm cursor-pointer hover:scale-[1.02]"
            >
              <FileText className="w-3.5 h-3.5 text-cyan-200" />
              <span>Nhập Word (.docx)</span>
            </button>
            <button
              onClick={() => onNavigate('assignments_manager')}
              className="px-4 py-2.5 bg-black/15 hover:bg-black/25 text-white/90 border border-white/20 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all uppercase tracking-wide cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Quản lý giao bài</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sleek KPI Metrics Matrix */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="bg-white/95 backdrop-blur-md p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between overflow-hidden relative group hover:border-cyan-300 hover:shadow-md transition-all">
          <div className="absolute top-0 right-0 p-4 opacity-5 font-bold text-5xl text-cyan-600 select-none group-hover:scale-110 transition-transform">
            Q
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Ngân hàng câu hỏi</span>
              <span className="text-[10px] bg-cyan-50 text-cyan-700 border border-cyan-200/80 px-2 py-0.5 rounded-full font-bold uppercase">
                GDPT 2018
              </span>
            </div>
            <div className="text-3xl font-black text-slate-900 mt-1">{questions.length}</div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-emerald-600 font-bold">{questions.filter(q => q.status === 'APPROVED').length} Đã duyệt</span>
            <span className="text-slate-400 text-[11px] font-medium">Bản nháp: {questions.filter(q => q.status === 'DRAFT').length}</span>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-white/95 backdrop-blur-md p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between overflow-hidden relative group hover:border-blue-300 hover:shadow-md transition-all">
          <div className="absolute top-0 right-0 p-4 opacity-5 font-bold text-5xl text-blue-600 select-none group-hover:scale-110 transition-transform">
            S
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Bài ôn tập & Đề</span>
              <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200/80 px-2 py-0.5 rounded-full font-bold uppercase">
                Hoạt động
              </span>
            </div>
            <div className="text-3xl font-black text-slate-900 mt-1">{sets.length}</div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-blue-600 font-bold">{assignments.length} bài giao</span>
            <span className="text-slate-400 text-[11px] font-medium">Đang mở làm</span>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-white/95 backdrop-blur-md p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between overflow-hidden relative group hover:border-emerald-300 hover:shadow-md transition-all">
          <div className="absolute top-0 right-0 p-4 opacity-5 font-bold text-5xl text-emerald-600 select-none group-hover:scale-110 transition-transform">
            U
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Học sinh & Lớp</span>
              <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200/80 px-2 py-0.5 rounded-full font-bold uppercase">
                Lớp học
              </span>
            </div>
            <div className="text-3xl font-black text-slate-900 mt-1">{totalStudents}</div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-emerald-600 font-bold">{classes.length} Lớp học</span>
            <span className="text-slate-400 text-[11px] font-medium">{totalSubmissions} Lượt nộp</span>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between overflow-hidden relative group hover:border-slate-300 transition-all">
          <div className="absolute top-0 right-0 p-4 opacity-10 font-bold text-4xl text-amber-600 select-none group-hover:scale-110 transition-transform">
            %
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Điểm trung bình</span>
              <span className="text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-bold uppercase">
                Toàn khối
              </span>
            </div>
            <div className="text-3xl font-extrabold text-slate-900 mt-1">
              {avgScore} <span className="text-sm font-normal text-slate-400">/ 10</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-emerald-600 font-semibold">Tỷ lệ nộp {completionRate}</span>
            <span className="text-slate-400 text-[11px]">Đạt chuẩn</span>
          </div>
        </div>
      </div>

      {/* Special Pedagogical Feature: Knowledge to Reinforce (KIẾN THỨC CẦN CỦNG CỐ) */}
      <div className="bg-white border border-amber-200/80 rounded-2xl p-6 shadow-xs relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500 text-white rounded-xl shadow-xs">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                Chẩn đoán học tập: Kiến thức học sinh thường nhầm lẫn
              </h2>
              <p className="text-xs text-slate-500">Phân tích từ dữ liệu làm bài thi của học sinh các lớp 10</p>
            </div>
          </div>
          <span className="self-start sm:self-auto px-3 py-1 bg-amber-50 text-amber-800 text-[10px] font-bold rounded-full uppercase tracking-wider border border-amber-200">
            Tự động cập nhật
          </span>
        </div>

        {weakTopics.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400 bg-slate-50/70 rounded-xl border border-dashed border-slate-200">
            Chưa có đủ dữ liệu bài thi của học sinh để chẩn đoán kiến thức nhầm lẫn. Khi học sinh nộp bài thi, hệ thống sẽ tự động phân tích các câu có tỷ lệ làm sai cao nhất tại đây.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {weakTopics.map((item, idx) => (
              <div key={idx} className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 flex flex-col justify-between hover:bg-slate-50 transition-colors">
                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-bold text-amber-800 text-[11px] uppercase tracking-wider">{item.chapter}</span>
                    <span className="px-2 py-0.5 bg-red-100 text-red-700 font-bold rounded-full text-[10px]">Tỷ lệ sai: {item.failRate}</span>
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 mb-1.5">{item.topic}</h4>
                  <p className="text-xs text-slate-600 leading-relaxed italic bg-white p-2.5 rounded-lg border border-slate-200/70">
                    "{item.suggestion}"
                  </p>
                </div>
                <button
                  onClick={() => onNavigate('question_bank')}
                  className="mt-3 pt-2.5 border-t border-slate-200/60 text-xs font-bold text-cyan-600 hover:text-cyan-700 flex items-center justify-between"
                >
                  <span>Xem câu hỏi củng cố</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Grid: Active Assignments & Question Bank Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Assignments List */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wide flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-cyan-600" />
              Bài ôn tập đang giao cho các lớp
            </h3>
            <button
              onClick={() => onNavigate('assignments_manager')}
              className="text-xs font-bold text-cyan-600 hover:text-cyan-700 uppercase tracking-wide"
            >
              Xem tất cả →
            </button>
          </div>

          <div className="space-y-3">
            {assignments.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                Chưa có bài ôn tập nào được giao. Hãy vào mục "Quản lý giao bài" để tạo bài kiểm tra cho lớp.
              </div>
            ) : (
              assignments.slice(0, 3).map((a) => (
                <div key={a.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 flex items-center justify-between gap-4 transition-colors">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-cyan-50 text-cyan-700 border border-cyan-200">
                        {a.className}
                      </span>
                      <span className="text-[11px] text-slate-500 font-medium">Thời gian: {a.durationMinutes} phút</span>
                    </div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">{a.title}</h4>
                    <p className="text-[11px] text-slate-500 mt-1">Hạn nộp: {a.deadline} • Phụ trách: {a.teacherName}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => onNavigate('assignments_manager')}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-full shadow-xs uppercase tracking-wide transition-all"
                    >
                      Chi tiết bài giao
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Cognitive Levels Matrix Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wide flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-cyan-600" />
                Cơ cấu mức độ câu hỏi
              </h3>
              <span className="text-[10px] text-slate-400 font-bold uppercase">Ma trận đề</span>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                  <span>1. Nhận biết</span>
                  <span className="font-bold text-emerald-600">{nbPct}% ({nbCount})</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${nbPct}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                  <span>2. Thông hiểu</span>
                  <span className="font-bold text-cyan-600">{thPct}% ({thCount})</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-cyan-500 h-full rounded-full" style={{ width: `${thPct}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                  <span>3. Vận dụng</span>
                  <span className="font-bold text-amber-600">{vdPct}% ({vdCount})</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-amber-500 h-full rounded-full" style={{ width: `${vdPct}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                  <span>4. Vận dụng cao</span>
                  <span className="font-bold text-purple-600">{vdcPct}% ({vdcCount})</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-purple-500 h-full rounded-full" style={{ width: `${vdcPct}%` }}></div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100">
            <button
              onClick={() => onNavigate('question_bank')}
              className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 transition-colors uppercase tracking-wide text-center"
            >
              Mở toàn bộ Ngân hàng câu hỏi →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
