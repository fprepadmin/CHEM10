import React, { useState, useEffect } from 'react';
import { Award, Clock, Calendar, CheckCircle2, ChevronRight, BookOpen, AlertCircle, Eye, X, HelpCircle } from 'lucide-react';
import { submissionService } from '../services/dbService';
import { useAuth } from '../context/AuthContext';
import { Submission } from '../types';

interface StudentHistoryViewProps {
  onNavigate: (tab: string) => void;
}

export const StudentHistoryView: React.FC<StudentHistoryViewProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);

  useEffect(() => {
    submissionService.getSubmissionsByStudent(user?.email || 'student.hoa10@fpt.edu.vn').then(res => {
      setSubmissions(res);
      setLoading(false);
    });
  }, [user]);

  const avg = submissions.length > 0
    ? (submissions.reduce((a, b) => a + (b.score || 0), 0) / submissions.length).toFixed(1)
    : '0';

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-12">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Lịch sử làm bài & Báo cáo tiến bộ</h1>
          <p className="text-xs text-slate-500 mt-1">
            Theo dõi quá trình học tập và mức độ cải thiện điểm số môn Hóa học 10
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-3 bg-cyan-50 border border-cyan-200 rounded-xl text-center">
            <div className="text-[10px] text-cyan-800 font-bold uppercase tracking-wider">Tổng bài đã nộp</div>
            <div className="text-xl font-black text-slate-900">{submissions.length}</div>
          </div>
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
            <div className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider">Điểm trung bình</div>
            <div className="text-xl font-black text-slate-900">{avg} / 10</div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
          Đang tải lịch sử...
        </div>
      ) : submissions.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Chưa có bài thi nào được hoàn thành</h3>
          <p className="text-xs text-slate-500 mt-1 mb-4">Hãy bắt đầu ôn tập bài đầu tiên để ghi nhận điểm số nhé!</p>
          <button
            onClick={() => onNavigate('student_home')}
            className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-full text-xs font-bold shadow-md shadow-cyan-600/20 uppercase tracking-wide transition-all"
          >
            Đến Góc học sinh làm bài →
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs divide-y divide-slate-100 overflow-hidden">
          {submissions.map((sub, idx) => (
            <div key={sub.id || idx} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors">
              <div>
                <div className="flex items-center gap-2 text-xs mb-1">
                  <span className="font-bold text-slate-900">{sub.questionSetTitle}</span>
                  {sub.attemptNumber && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-50 text-cyan-800 border border-cyan-200">
                      Lần {sub.attemptNumber}
                    </span>
                  )}
                  <span className="text-slate-400 text-[11px]">• {new Date(sub.submittedAt).toLocaleDateString('vi-VN')}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span>Số câu đúng: <strong className="text-slate-800">{sub.correctCount} / {sub.totalQuestions}</strong></span>
                  <span>Thời gian: <strong className="text-slate-800">{Math.floor(sub.durationSeconds / 60)}p {sub.durationSeconds % 60}s</strong></span>
                </div>
              </div>

              <div className="flex items-center gap-4 shrink-0">
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Điểm số</span>
                  <div className={`text-2xl font-black ${
                    sub.score >= 8.0 ? 'text-emerald-600' : sub.score >= 5.0 ? 'text-cyan-600' : 'text-amber-600'
                  }`}>
                    {sub.score}
                  </div>
                </div>

                <button
                  onClick={() => setSelectedSubmission(sub)}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full text-xs font-bold flex items-center gap-1 uppercase tracking-wide transition-all"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Xem lại</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Review Submission Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  {selectedSubmission.questionSetTitle}
                </h3>
                <span className="text-xs text-slate-400">
                  Nộp lúc: {new Date(selectedSubmission.submittedAt).toLocaleString('vi-VN')}
                </span>
              </div>
              <button
                onClick={() => setSelectedSubmission(null)}
                className="p-1 text-slate-400 hover:text-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs p-3 bg-slate-50 rounded-2xl">
              <div>
                <span className="text-slate-400 block text-[10px] font-bold uppercase">Điểm số</span>
                <strong className="text-lg text-cyan-600 font-black">{selectedSubmission.score}/10</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] font-bold uppercase">Thời gian làm</span>
                <strong className="text-slate-800 font-bold">{Math.floor(selectedSubmission.durationSeconds / 60)}p {selectedSubmission.durationSeconds % 60}s</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] font-bold uppercase">Số câu đúng</span>
                <strong className="text-emerald-600 font-bold">{selectedSubmission.correctCount}/{selectedSubmission.totalQuestions}</strong>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Chi tiết từng câu hỏi
              </h4>
              {selectedSubmission.details?.map((d, i) => (
                <div key={d.questionId || i} className="p-3.5 rounded-2xl border border-slate-200 text-xs space-y-1 bg-slate-50/50">
                  <div className="flex items-center justify-between font-bold">
                    <span>Câu #{i + 1}</span>
                    <span className={d.isCorrect ? 'text-emerald-600' : 'text-red-600'}>
                      {d.isCorrect ? '✓ Đúng' : '✗ Chưa đúng'}
                    </span>
                  </div>
                  <div>Phương án đã chọn: <strong className="text-slate-900">{String(d.studentAnswer || 'Chưa trả lời')}</strong></div>
                  <div className="text-slate-500">Đáp án chuẩn: <strong className="text-slate-800">{String(d.correctAnswer)}</strong></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
