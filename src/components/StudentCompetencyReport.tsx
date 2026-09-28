import React, { useState } from 'react';
import { 
  Award, 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  BookOpen, 
  Target, 
  CheckCircle, 
  HelpCircle, 
  BarChart3, 
  Compass, 
  Layers, 
  ArrowRight,
  Sparkles,
  GraduationCap,
  Calendar,
  FileText,
  Bot,
  Copy,
  Check,
  RefreshCw,
  Zap,
  MessageSquareQuote,
  Users
} from 'lucide-react';
import { CompetencyAnalysisResult } from '../utils/competencyAnalyzer';
import { generateStudentPersonalizedAssessment, AIStudentAssessment, AI_ASSESSMENT_MODEL } from '../services/aiStudentAssessmentService';
import { Submission, StudentInClass } from '../types';

interface StudentCompetencyReportProps {
  analysis: CompetencyAnalysisResult;
  studentName?: string;
  studentEmail?: string;
  student?: StudentInClass;
  submissions?: Submission[];
  onNavigateToPractice?: (chapterId?: string) => void;
}

export const StudentCompetencyReport: React.FC<StudentCompetencyReportProps> = ({
  analysis,
  studentName,
  studentEmail,
  student,
  submissions = [],
  onNavigateToPractice
}) => {
  const [aiAssessment, setAiAssessment] = useState<AIStudentAssessment | null>(null);
  const [loadingAi, setLoadingAi] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleGenerateAiAssessment = async () => {
    setLoadingAi(true);
    setAiError(null);
    try {
      const mockStudent: StudentInClass = student || {
        displayName: studentName || 'Học sinh',
        email: studentEmail || 'student@school.edu.vn',
        status: 'ACTIVE',
        submissionsCount: submissions.length,
        avgScore: analysis.averageScore,
        completedCount: submissions.length,
        pendingCount: 0,
        joinedAt: new Date().toISOString()
      };
      const result = await generateStudentPersonalizedAssessment(mockStudent, analysis, submissions);
      setAiAssessment(result);
    } catch (err: any) {
      console.error('Error generating AI Assessment:', err);
      setAiError(err.message || 'Không thể tạo đánh giá AI lúc này. Vui lòng thử lại.');
    } finally {
      setLoadingAi(false);
    }
  };

  const handleCopyText = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2500);
  };
  if (!analysis.hasData) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-cyan-50 border border-cyan-100 flex items-center justify-center mx-auto text-cyan-600">
          <GraduationCap className="w-6 h-6" />
        </div>
        <div className="max-w-md mx-auto">
          <h3 className="text-base font-bold text-slate-900">Chưa có dữ liệu bài thi để phân tích năng lực</h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Học sinh cần hoàn thành ít nhất 1 bài kiểm tra hoặc bài tự luyện theo chương để hệ thống tự động lập hồ sơ chẩn đoán năng lực Hóa học 10.
          </p>
        </div>
        {onNavigateToPractice && (
          <button
            onClick={() => onNavigateToPractice()}
            className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-full text-xs font-bold shadow-md shadow-cyan-600/20 uppercase tracking-wide transition-all"
          >
            Bắt đầu luyện tập ngay →
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in text-slate-900">
      {/* Top Banner with Student Info & Overall Pedagogical Evaluation */}
      <div className="bg-gradient-to-br from-cyan-600 via-blue-600 to-slate-900 rounded-2xl p-6 sm:p-7 text-white relative overflow-hidden shadow-lg shadow-cyan-600/10">
        <div className="relative z-10 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-xs border border-white/20 rounded-full text-cyan-200 text-[11px] font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
              Báo cáo chẩn đoán năng lực Hóa học 10 GDPT 2018
            </div>
            {studentName && (
              <span className="text-xs text-cyan-100 font-medium">
                Học sinh: <strong className="text-white font-bold">{studentName}</strong> {studentEmail ? `(${studentEmail})` : ''}
              </span>
            )}
          </div>

          <h2 className="text-lg sm:text-xl font-black tracking-tight">
            Nhận định tổng quan từ Hệ thống Sư phạm
          </h2>
          <p className="text-xs sm:text-sm text-slate-100 leading-relaxed bg-black/20 p-3.5 rounded-xl border border-white/10">
            {analysis.overallEvaluation}
          </p>
        </div>
      </div>

      {/* 4 Metric Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              <span>Tổng bài đã nộp</span>
              <BookOpen className="w-3.5 h-3.5 text-cyan-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
              {analysis.totalSubmissions} <span className="text-xs font-normal text-slate-400">bài</span>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-cyan-700 font-semibold">{analysis.assignmentSubmissionsCount} Bài được giao</span>
            <span className="text-slate-500">{analysis.selfPracticeSubmissionsCount} Tự luyện</span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              <span>Điểm trung bình</span>
              <Award className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-1 flex items-baseline gap-1">
              <span className={analysis.averageScore >= 8.0 ? 'text-emerald-600' : analysis.averageScore >= 5.0 ? 'text-cyan-600' : 'text-amber-600'}>
                {analysis.averageScore}
              </span>
              <span className="text-xs font-normal text-slate-400">/ 10</span>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-emerald-600 font-semibold">Cao nhất: {analysis.highestScore}</span>
            <span className="text-slate-400">Gần nhất: {analysis.latestScore}</span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              <span>Độ chính xác câu hỏi</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
              {analysis.overallAccuracy}%
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-emerald-700 font-semibold">{analysis.totalQuestionsCorrect} đúng</span>
            <span className="text-slate-500">/ {analysis.totalQuestionsAnswered} câu đã làm</span>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              <span>Xu hướng tiến bộ</span>
              {analysis.scoreTrend === 'IMPROVING' ? (
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              ) : analysis.scoreTrend === 'DECLINING' ? (
                <TrendingDown className="w-4 h-4 text-red-500" />
              ) : (
                <Minus className="w-4 h-4 text-cyan-600" />
              )}
            </div>
            <div className="text-sm font-bold text-slate-900 mt-1">
              {analysis.scoreTrend === 'IMPROVING' ? (
                <span className="text-emerald-600 font-black">Đang tăng tiến</span>
              ) : analysis.scoreTrend === 'DECLINING' ? (
                <span className="text-red-500 font-black">Cần bứt phá</span>
              ) : analysis.scoreTrend === 'STABLE' ? (
                <span className="text-cyan-700 font-black">Phong độ ổn định</span>
              ) : (
                <span className="text-slate-500 font-bold">Chưa đủ dữ liệu</span>
              )}
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 text-[11px] text-slate-500 line-clamp-1">
            {analysis.scoreTrendText}
          </div>
        </div>
      </div>

      {/* AI Assessment & Pedagogical Feedback Card (OpenAI GPT-OSS-120B) */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-5 sm:p-6 text-white border border-indigo-500/30 shadow-xl relative overflow-hidden">
        {/* Glow decoration */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-5">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-indigo-800/40 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-black tracking-tight text-white">
                    Trợ lý Sư phạm AI — Đánh giá Năng lực Cá nhân hóa
                  </h3>
                  <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                    <Zap className="w-2.5 h-2.5" />
                    {AI_ASSESSMENT_MODEL}
                  </span>
                </div>
                <p className="text-xs text-indigo-200/80">
                  Tự động chẩn đoán điểm mạnh, lỗ hổng tư duy và soạn thảo nhận xét học bạ / sổ liên lạc
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleGenerateAiAssessment}
                disabled={loadingAi}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-md shadow-cyan-500/25 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {loadingAi ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>AI đang phân tích...</span>
                  </>
                ) : aiAssessment ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Phân tích lại</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>✨ Phân tích AI chuyên sâu</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Error notice */}
          {aiError && (
            <div className="p-3.5 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-200 text-xs flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{aiError}</span>
            </div>
          )}

          {/* Loading State */}
          {loadingAi && (
            <div className="py-10 text-center space-y-3">
              <div className="w-12 h-12 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin mx-auto" />
              <p className="text-sm font-semibold text-cyan-200">
                Mô hình {AI_ASSESSMENT_MODEL} đang phân tích toàn bộ dữ liệu bài làm...
              </p>
              <p className="text-xs text-indigo-300/70 max-w-md mx-auto">
                Đang tổng hợp điểm số, mức độ nhận thức (NB-TH-VD-VDC) và ma trận 7 chương Hóa 10
              </p>
            </div>
          )}

          {/* Initial State Prompt */}
          {!aiAssessment && !loadingAi && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-center space-y-3">
              <Sparkles className="w-8 h-8 text-cyan-400 mx-auto opacity-80" />
              <div className="max-w-md mx-auto">
                <p className="text-sm font-bold text-white">Chưa kích hoạt đánh giá AI cho học sinh này</p>
                <p className="text-xs text-indigo-200/70 mt-1">
                  Nhấn nút bên trên để AI dựa trên dữ liệu thật của học sinh ({analysis.totalQuestionsAnswered} câu đã làm, độ chính xác {analysis.overallAccuracy}%) tạo nhận xét sư phạm chi tiết và lộ trình học tập.
                </p>
              </div>
            </div>
          )}

          {/* Assessment Result Content */}
          {aiAssessment && !loadingAi && (
            <div className="space-y-5 animate-fade-in text-slate-100">
              {/* Level & Focus Highlight */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white/5 rounded-xl border border-white/10">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs text-indigo-200 font-medium">Xếp loại năng lực AI:</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                    aiAssessment.academicLevel === 'XUẤT SẮC' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                    aiAssessment.academicLevel === 'GIỎI' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' :
                    aiAssessment.academicLevel === 'KHÁ' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                    aiAssessment.academicLevel === 'TRUNG BÌNH' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                    'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  }`}>
                    {aiAssessment.academicLevel}
                  </span>
                </div>

                {aiAssessment.recommendedFocus && (
                  <div className="text-xs bg-indigo-500/20 border border-indigo-400/30 px-3 py-1 rounded-lg text-indigo-200 flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Trọng tâm: <strong className="text-white">{aiAssessment.recommendedFocus}</strong></span>
                  </div>
                )}
              </div>

              {/* Overall Summary */}
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                  <Bot className="w-3.5 h-3.5" />
                  Nhận định tổng quan chuyên môn
                </h4>
                <div className="p-4 bg-black/30 rounded-xl border border-white/10 text-xs sm:text-sm leading-relaxed text-slate-200">
                  {aiAssessment.overallSummary}
                </div>
              </div>

              {/* 2-Column: Strengths & Weaknesses */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Strengths */}
                <div className="p-4 bg-emerald-950/30 rounded-xl border border-emerald-500/20 space-y-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-wide text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Điểm mạnh nổi bật
                  </h4>
                  <ul className="space-y-1.5 text-xs text-emerald-100">
                    {aiAssessment.strengths?.map((str, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                        <span>{str}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Weaknesses */}
                <div className="p-4 bg-rose-950/30 rounded-xl border border-rose-500/20 space-y-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-wide text-rose-400 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                    Lỗ hổng cần khắc phục
                  </h4>
                  <ul className="space-y-1.5 text-xs text-rose-100">
                    {aiAssessment.weaknesses?.map((wk, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0" />
                        <span>{wk}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Study Roadmap */}
              {aiAssessment.studyRoadmap && aiAssessment.studyRoadmap.length > 0 && (
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5" />
                    Lộ trình rèn luyện cá nhân hóa (4 Giai đoạn)
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {aiAssessment.studyRoadmap.map((item, idx) => (
                      <div key={idx} className="p-3.5 bg-white/5 rounded-xl border border-white/10 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-cyan-400">{item.step}</span>
                          <span className="px-1.5 py-0.5 rounded bg-white/10 text-[9px] text-slate-300 font-semibold">{item.chapter}</span>
                        </div>
                        <p className="text-xs text-slate-300 leading-snug">
                          {item.action}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sổ liên lạc & Nhận xét Giáo viên with 1-click Copy */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {/* Teacher Report Card Feedback */}
                <div className="p-4 bg-white/5 rounded-xl border border-white/10 space-y-2 relative group">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold text-indigo-200 uppercase tracking-wide flex items-center gap-1.5">
                      <MessageSquareQuote className="w-3.5 h-3.5 text-cyan-400" />
                      Nhận xét Học bạ / Sổ điểm
                    </h5>
                    <button
                      onClick={() => handleCopyText(aiAssessment.teacherFeedback, 'teacherFeedback')}
                      className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                      title="Sao chép lời nhận xét"
                    >
                      {copiedField === 'teacherFeedback' ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-300">Đã chép</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Sao chép</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-slate-200 italic leading-relaxed bg-black/20 p-3 rounded-lg border border-white/5">
                    "{aiAssessment.teacherFeedback}"
                  </p>
                </div>

                {/* Parent Note */}
                <div className="p-4 bg-white/5 rounded-xl border border-white/10 space-y-2 relative group">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold text-indigo-200 uppercase tracking-wide flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-cyan-400" />
                      Gợi ý gửi Phụ huynh học sinh
                    </h5>
                    <button
                      onClick={() => handleCopyText(aiAssessment.parentNote, 'parentNote')}
                      className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                      title="Sao chép tin nhắn gửi phụ huynh"
                    >
                      {copiedField === 'parentNote' ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-300">Đã chép</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Sao chép</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-slate-200 italic leading-relaxed bg-black/20 p-3 rounded-lg border border-white/5">
                    "{aiAssessment.parentNote}"
                  </p>
                </div>
              </div>

              {/* Footer info */}
              <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-white/10">
                <span>Khởi tạo lúc: {aiAssessment.generatedAt}</span>
                <span>Mô hình: {AI_ASSESSMENT_MODEL} (Groq API 3-key failover)</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Grid: 4 Cognitive Levels & Strengths/Weaknesses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 4 Cognitive Levels Breakdown */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wide text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-cyan-600" />
                <span>Năng lực theo 4 mức độ nhận thức</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Khung đánh giá chuẩn GDPT 2018</p>
            </div>
            <span className="px-2.5 py-0.5 bg-cyan-50 text-cyan-800 text-[10px] font-bold rounded-full uppercase border border-cyan-200">
              Chi tiết
            </span>
          </div>

          <div className="space-y-4">
            {/* Nhận biết */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-900">{analysis.cognitiveLevels.nhan_biet.label}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  analysis.cognitiveLevels.nhan_biet.rating === 'XUẤT SẮC' ? 'bg-emerald-100 text-emerald-800' :
                  analysis.cognitiveLevels.nhan_biet.rating === 'KHÁ' ? 'bg-cyan-100 text-cyan-800' :
                  analysis.cognitiveLevels.nhan_biet.rating === 'TRUNG BÌNH' ? 'bg-amber-100 text-amber-800' :
                  'bg-slate-200 text-slate-700'
                }`}>
                  {analysis.cognitiveLevels.nhan_biet.rating} ({analysis.cognitiveLevels.nhan_biet.percentage}%)
                </span>
              </div>
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full transition-all" style={{ width: `${analysis.cognitiveLevels.nhan_biet.percentage}%` }} />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>Đúng {analysis.cognitiveLevels.nhan_biet.correctCount}/{analysis.cognitiveLevels.nhan_biet.totalAnswered} câu</span>
                <span className="italic">{analysis.cognitiveLevels.nhan_biet.pedagogicalComment}</span>
              </div>
            </div>

            {/* Thông hiểu */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-900">{analysis.cognitiveLevels.thong_hieu.label}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  analysis.cognitiveLevels.thong_hieu.rating === 'XUẤT SẮC' ? 'bg-emerald-100 text-emerald-800' :
                  analysis.cognitiveLevels.thong_hieu.rating === 'KHÁ' ? 'bg-cyan-100 text-cyan-800' :
                  analysis.cognitiveLevels.thong_hieu.rating === 'TRUNG BÌNH' ? 'bg-amber-100 text-amber-800' :
                  'bg-slate-200 text-slate-700'
                }`}>
                  {analysis.cognitiveLevels.thong_hieu.rating} ({analysis.cognitiveLevels.thong_hieu.percentage}%)
                </span>
              </div>
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div className="bg-cyan-500 h-full rounded-full transition-all" style={{ width: `${analysis.cognitiveLevels.thong_hieu.percentage}%` }} />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>Đúng {analysis.cognitiveLevels.thong_hieu.correctCount}/{analysis.cognitiveLevels.thong_hieu.totalAnswered} câu</span>
                <span className="italic">{analysis.cognitiveLevels.thong_hieu.pedagogicalComment}</span>
              </div>
            </div>

            {/* Vận dụng */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-900">{analysis.cognitiveLevels.van_dung.label}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  analysis.cognitiveLevels.van_dung.rating === 'XUẤT SẮC' ? 'bg-emerald-100 text-emerald-800' :
                  analysis.cognitiveLevels.van_dung.rating === 'KHÁ' ? 'bg-cyan-100 text-cyan-800' :
                  analysis.cognitiveLevels.van_dung.rating === 'TRUNG BÌNH' ? 'bg-amber-100 text-amber-800' :
                  'bg-slate-200 text-slate-700'
                }`}>
                  {analysis.cognitiveLevels.van_dung.rating} ({analysis.cognitiveLevels.van_dung.percentage}%)
                </span>
              </div>
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div className="bg-amber-500 h-full rounded-full transition-all" style={{ width: `${analysis.cognitiveLevels.van_dung.percentage}%` }} />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>Đúng {analysis.cognitiveLevels.van_dung.correctCount}/{analysis.cognitiveLevels.van_dung.totalAnswered} câu</span>
                <span className="italic">{analysis.cognitiveLevels.van_dung.pedagogicalComment}</span>
              </div>
            </div>

            {/* Vận dụng cao */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-900">{analysis.cognitiveLevels.van_dung_cao.label}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  analysis.cognitiveLevels.van_dung_cao.rating === 'XUẤT SẮC' ? 'bg-emerald-100 text-emerald-800' :
                  analysis.cognitiveLevels.van_dung_cao.rating === 'KHÁ' ? 'bg-cyan-100 text-cyan-800' :
                  analysis.cognitiveLevels.van_dung_cao.rating === 'TRUNG BÌNH' ? 'bg-amber-100 text-amber-800' :
                  'bg-slate-200 text-slate-700'
                }`}>
                  {analysis.cognitiveLevels.van_dung_cao.rating} ({analysis.cognitiveLevels.van_dung_cao.percentage}%)
                </span>
              </div>
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div className="bg-purple-500 h-full rounded-full transition-all" style={{ width: `${analysis.cognitiveLevels.van_dung_cao.percentage}%` }} />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>Đúng {analysis.cognitiveLevels.van_dung_cao.correctCount}/{analysis.cognitiveLevels.van_dung_cao.totalAnswered} câu</span>
                <span className="italic">{analysis.cognitiveLevels.van_dung_cao.pedagogicalComment}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Pedagogical Insights: Strengths, Weaknesses, Action Plan */}
        <div className="space-y-4 flex flex-col justify-between">
          {/* Strengths */}
          <div className="bg-white p-5 rounded-2xl border border-emerald-200 shadow-xs space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Điểm mạnh nổi trội</span>
            </h4>
            <ul className="space-y-2 text-xs text-slate-700">
              {analysis.strengths.map((str, idx) => (
                <li key={idx} className="flex items-start gap-2 bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-100">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                  <span>{str}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Weaknesses */}
          <div className="bg-white p-5 rounded-2xl border border-amber-200 shadow-xs space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Lỗ hổng kiến thức cần bù đắp</span>
            </h4>
            <ul className="space-y-2 text-xs text-slate-700">
              {analysis.weaknesses.map((w, idx) => (
                <li key={idx} className="flex items-start gap-2 bg-amber-50/60 p-2.5 rounded-xl border border-amber-100">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                  <span>{w}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Action Plan */}
          <div className="bg-white p-5 rounded-2xl border border-cyan-200 shadow-xs space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-800 flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-cyan-600" />
              <span>Lộ trình rèn luyện cá nhân hóa đề xuất</span>
            </h4>
            <div className="space-y-2 text-xs text-slate-700">
              {analysis.actionPlan.map((act, idx) => (
                <div key={idx} className="bg-cyan-50/50 p-2.5 rounded-xl border border-cyan-100 flex items-start gap-2">
                  <span className="font-bold text-cyan-700 shrink-0">#{idx + 1}</span>
                  <span>{act}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 7 Chapters Mastery Matrix */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-600" />
              <span>Bản đồ thành thạo 7 chương Hóa học 10</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Mức độ hoàn thiện chuẩn đầu ra từng chuyên đề</p>
          </div>
          <span className="text-[11px] text-slate-400">
            Tổng cộng: <strong>7 chương trọng tâm</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {analysis.chaptersMastery.map(ch => (
            <div key={ch.chapterId} className="p-4 rounded-xl border border-slate-100 bg-slate-50/70 space-y-2.5 flex flex-col justify-between hover:bg-slate-50 transition-colors">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-slate-900 line-clamp-1">{ch.chapterTitle}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ml-2 ${
                    ch.rating === 'THÀNH THẠO' ? 'bg-emerald-100 text-emerald-800' :
                    ch.rating === 'KHÁ TỐT' ? 'bg-cyan-100 text-cyan-800' :
                    ch.rating === 'TRUNG BÌNH' ? 'bg-amber-100 text-amber-800' :
                    ch.rating === 'CẦN ÔN LUYỆN' ? 'bg-red-100 text-red-800' :
                    'bg-slate-200 text-slate-600'
                  }`}>
                    {ch.rating}
                  </span>
                </div>

                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mb-2">
                  <div 
                    className={`h-full rounded-full transition-all ${
                      ch.percentage >= 80 ? 'bg-emerald-500' :
                      ch.percentage >= 60 ? 'bg-cyan-500' :
                      ch.percentage >= 40 ? 'bg-amber-500' : 'bg-red-400'
                    }`} 
                    style={{ width: `${ch.percentage}%` }} 
                  />
                </div>

                <p className="text-xs text-slate-600 leading-relaxed italic bg-white p-2.5 rounded-lg border border-slate-100">
                  "{ch.recommendation}"
                </p>
              </div>

              <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
                <span className="text-slate-500 text-[11px]">
                  Đã làm: <strong>{ch.totalAnswered} câu</strong> (Đúng {ch.correctCount})
                </span>
                {onNavigateToPractice && (
                  <button
                    onClick={() => onNavigateToPractice(ch.chapterId)}
                    className="text-cyan-600 hover:text-cyan-700 font-bold text-xs flex items-center gap-1"
                  >
                    <span>Luyện chương này</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
