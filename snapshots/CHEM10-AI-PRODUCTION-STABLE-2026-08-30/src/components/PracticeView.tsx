import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  Bookmark, 
  Send, 
  ChevronLeft, 
  ChevronRight, 
  AlertTriangle, 
  CheckCircle2, 
  HelpCircle,
  ArrowLeft,
  Lock,
  RotateCcw,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { questionService, questionSetService, assignmentService, submissionService } from '../services/dbService';
import { useAuth } from '../context/AuthContext';
import { Question, QuestionSet, Assignment, Submission } from '../types';

interface PracticeViewProps {
  setId: string;
  assignmentId?: string;
  onFinish: (submissionId: string) => void;
  onExit: () => void;
}

export const PracticeView: React.FC<PracticeViewProps> = ({ setId, assignmentId, onFinish, onExit }) => {
  const { user } = useAuth();
  const [questionSet, setQuestionSet] = useState<QuestionSet | null>(null);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Student answers state: questionId -> answer
  const [studentAnswers, setStudentAnswers] = useState<Record<string, any>>({});
  // Bookmarked questions for review
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);
  
  // Countdown Timer
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number>(15 * 60);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [attemptLimitReached, setAttemptLimitReached] = useState(false);
  const [pastAttemptsCount, setPastAttemptsCount] = useState(0);

  // Result state
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<Submission | null>(null);

  // Cache key for auto-saving student answers
  const cacheKey = `chem10_answers_${setId}_${assignmentId || 'free'}_${user?.email || 'anon'}`;

  useEffect(() => {
    const loadTest = async () => {
      setLoading(true);
      try {
        let assignData: Assignment | null = null;
        if (assignmentId) {
          assignData = await assignmentService.getAssignmentById(assignmentId);
          setAssignment(assignData);

          // Check past attempts
          if (user?.email) {
            const pastSubs = await submissionService.getStudentAssignmentSubmissions(user.email, assignmentId);
            setPastAttemptsCount(pastSubs.length);
            if (assignData && assignData.maxAttempts && pastSubs.length >= assignData.maxAttempts) {
              setAttemptLimitReached(true);
              setLoading(false);
              return;
            }
          }
        }

        const s = await questionSetService.getSetById(setId);
        setQuestionSet(s);

        // Set duration: assignment duration takes precedence
        const durationMin = assignData ? assignData.durationMinutes : (s?.durationMinutes || 15);
        if (durationMin === 0) {
          setTimeLeftSeconds(999999); // Unlimited time
        } else {
          setTimeLeftSeconds(durationMin * 60);
        }

        let matched: Question[] = [];
        if (s && s.questionIds && s.questionIds.length > 0) {
          matched = await questionService.getQuestionsByIds(s.questionIds);
        } else {
          // If no specific IDs in set, fallback to empty or demo
          const fallbackIds = ['q-c1-1', 'q-c1-2', 'q-c1-3', 'q-c1-4', 'q-c1-5'];
          matched = await questionService.getQuestionsByIds(fallbackIds);
        }

        // Apply Shuffling if assignment has shuffleQuestions enabled
        if (assignData?.shuffleQuestions) {
          matched = [...matched].sort(() => Math.random() - 0.5);
        }

        // Apply Option Shuffling if assignment has shuffleOptions enabled
        if (assignData?.shuffleOptions) {
          matched = matched.map(q => {
            if (q.type === 'multiple_choice' && q.options && q.options.length > 0) {
              const originalOpts = [...q.options];
              // Get original correct option text
              const correctOpt = originalOpts.find(o => o.id === q.correctAnswer);
              const shuffledOpts = [...originalOpts].sort(() => Math.random() - 0.5);
              
              // Re-assign IDs 'A', 'B', 'C', 'D'
              const letters = ['A', 'B', 'C', 'D'];
              const remappedOpts = shuffledOpts.map((opt, i) => ({
                ...opt,
                id: letters[i] || opt.id
              }));

              // Find new letter for the correct text
              const newCorrectOpt = remappedOpts.find(o => o.text === correctOpt?.text);
              return {
                ...q,
                options: remappedOpts,
                correctAnswer: newCorrectOpt ? newCorrectOpt.id : q.correctAnswer
              };
            }
            return q;
          });
        }

        setQuestions(matched);

        // Try restoring cached answers if any
        try {
          const cached = localStorage.getItem(cacheKey);
          if (cached) {
            setStudentAnswers(JSON.parse(cached));
          }
        } catch (e) {
          // ignore cache error
        }

      } catch (err) {
        console.error("Error loading test:", err);
      } finally {
        setLoading(false);
      }
    };
    loadTest();
  }, [setId, assignmentId, user?.email]);

  // Timer Tick
  useEffect(() => {
    if (isSubmitted || timeLeftSeconds <= 0 || timeLeftSeconds > 900000) return;
    const interval = setInterval(() => {
      setTimeLeftSeconds(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          handleSubmitTest(); // Auto submit on timeout
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isSubmitted, timeLeftSeconds]);

  // Real-time answer caching to localStorage
  const updateAnswers = (newAnswers: Record<string, any>) => {
    setStudentAnswers(newAnswers);
    try {
      localStorage.setItem(cacheKey, JSON.stringify(newAnswers));
    } catch (e) {
      // ignore
    }
  };

  const currentQ = questions[currentIndex];

  const handleSelectMultipleChoice = (qId: string, optId: string) => {
    updateAnswers({
      ...studentAnswers,
      [qId]: optId
    });
  };

  const handleSelectTrueFalse = (qId: string, subIdx: number, val: boolean) => {
    const prevArr: boolean[] = studentAnswers[qId] || [false, false, false, false];
    const newArr = [...prevArr];
    newArr[subIdx] = val;
    updateAnswers({
      ...studentAnswers,
      [qId]: newArr
    });
  };

  const handleShortAnswerChange = (qId: string, val: string) => {
    updateAnswers({
      ...studentAnswers,
      [qId]: val
    });
  };

  const toggleBookmark = (qId: string) => {
    if (bookmarkedIds.includes(qId)) {
      setBookmarkedIds(bookmarkedIds.filter(id => id !== qId));
    } else {
      setBookmarkedIds([...bookmarkedIds, qId]);
    }
  };

  // Secure Server-side Test Submission & Grading
  const handleSubmitTest = async () => {
    setShowConfirmModal(false);
    setSubmitting(true);

    const totalDuration = assignment ? (assignment.durationMinutes * 60) : (questionSet?.durationMinutes ? questionSet.durationMinutes * 60 : 900);
    const timeSpent = timeLeftSeconds > 900000 ? 300 : Math.max(1, totalDuration - timeLeftSeconds);

    try {
      const result = await submissionService.submitAndGradeOnline({
        assignmentId: assignmentId || '',
        questionSetId: setId,
        questionSetTitle: assignment?.title || questionSet?.title || 'Bài ôn tập Hóa 10',
        studentId: user?.uid || 'guest-student',
        studentEmail: user?.email || '',
        studentName: user?.displayName || user?.email?.split('@')[0] || 'Học sinh',
        studentClass: user?.classId || '10A1',
        attemptNumber: pastAttemptsCount + 1,
        durationSeconds: timeSpent,
        answers: studentAnswers,
        questionIds: questions.map(q => q.id)
      });

      const submissionData: Submission = {
        id: result.submissionId,
        assignmentId: assignmentId || '',
        questionSetId: setId,
        questionSetTitle: assignment?.title || questionSet?.title || 'Bài ôn tập Hóa 10',
        studentId: user?.uid || 'guest-student',
        studentEmail: user?.email || '',
        studentName: user?.displayName || user?.email?.split('@')[0] || 'Học sinh',
        studentClass: user?.classId || '10A1',
        attemptNumber: pastAttemptsCount + 1,
        startedAt: new Date().toISOString(),
        submittedAt: new Date().toISOString(),
        durationSeconds: timeSpent,
        answers: studentAnswers,
        score: result.score,
        totalQuestions: result.totalQuestions,
        correctCount: result.correctCount,
        incorrectCount: result.wrongCount,
        wrongCount: result.wrongCount,
        details: result.details,
        status: 'submitted'
      };

      setSubmissionResult(submissionData);
      setIsSubmitted(true);

      // Clear local storage cache on successful submission
      try {
        localStorage.removeItem(cacheKey);
      } catch (e) {}

      // Trigger celebrate confetti on good score
      if (result.score >= 8.0) {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      }
    } catch (e) {
      console.error(e);
      alert("Lỗi khi nộp bài");
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (secs: number) => {
    if (secs > 900000) return '∞ Tự do';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
        Đang chuẩn bị đề thi...
      </div>
    );
  }

  // ATTEMPT LIMIT REACHED VIEW
  if (attemptLimitReached) {
    return (
      <div className="max-w-md mx-auto p-8 bg-white rounded-3xl border border-slate-200 text-center space-y-4 shadow-sm animate-fade-in">
        <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto text-amber-600">
          <Lock className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Đã hết số lần làm bài quy định</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          Bài kiểm tra <strong>{assignment?.title}</strong> chỉ cho phép làm tối đa <strong>{assignment?.maxAttempts} lần</strong>. Bạn đã hoàn thành đủ số lượt.
        </p>
        <div className="pt-2">
          <button
            onClick={onExit}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-full text-xs font-bold uppercase tracking-wide transition-all"
          >
            Quay về trang ôn tập
          </button>
        </div>
      </div>
    );
  }

  // RESULT VIEW AFTER SUBMISSION (KẾT QUẢ SAU KHI LÀM BÀI)
  if (isSubmitted && submissionResult) {
    // Check if score is visible
    const isScoreVisible = !assignment || assignment.showScore === 'immediate' || assignment.isScorePublished;
    // Check if answers review is permitted
    const isAnswerReviewAllowed = !assignment || assignment.showAnswers === 'after_submit' || assignment.allowReviewAnswers;

    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
        {/* Score Card */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs text-center">
          <div className="inline-flex p-3 bg-emerald-50 text-emerald-600 rounded-2xl mb-3 shadow-xs">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Hoàn thành bài kiểm tra!</h1>
          <p className="text-xs text-slate-500 mt-1">{submissionResult.questionSetTitle}</p>

          {isScoreVisible ? (
            <div className="my-6 py-5 border-y border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Điểm số</div>
                <div className="text-3xl sm:text-4xl font-black text-cyan-600 mt-0.5">
                  {submissionResult.score} <span className="text-xs font-normal text-slate-400">/ 10</span>
                </div>
              </div>

              <div>
                <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Số câu đúng</div>
                <div className="text-3xl sm:text-4xl font-black text-emerald-600 mt-0.5">
                  {submissionResult.correctCount} <span className="text-xs font-normal text-slate-400">/{submissionResult.totalQuestions}</span>
                </div>
              </div>

              <div>
                <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Tỷ lệ chính xác</div>
                <div className="text-3xl sm:text-4xl font-black text-purple-600 mt-0.5">
                  {Math.round((submissionResult.correctCount / submissionResult.totalQuestions) * 100)}%
                </div>
              </div>

              <div>
                <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Thời gian làm</div>
                <div className="text-2xl sm:text-3xl font-black text-slate-800 mt-0.5">
                  {Math.floor(submissionResult.durationSeconds / 60)}p {submissionResult.durationSeconds % 60}s
                </div>
              </div>
            </div>
          ) : (
            <div className="my-6 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center space-y-1">
              <span className="text-xs font-bold text-slate-800">Bài thi đã được ghi nhận và lưu trữ an toàn</span>
              <p className="text-xs text-slate-500">
                Giáo viên đã cài đặt chế độ công bố điểm sau. Kết quả sẽ hiển thị trong mục "Lịch sử & Tiến bộ" khi giáo viên mở điểm.
              </p>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={onExit}
              className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-full text-xs shadow-xs uppercase tracking-wide transition-all"
            >
              Quay lại trang chủ ôn tập
            </button>
          </div>
        </div>

        {/* Detailed Solutions Review (XEM LỜI GIẢI VÀ ĐÁP ÁN) */}
        {isAnswerReviewAllowed && (
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-cyan-600" />
              Chi tiết lời giải & Hướng dẫn sửa bài
            </h2>

            {questions.map((q, idx) => {
              const detail = submissionResult.details.find(d => d.questionId === q.id);
              const isCorrect = detail?.isCorrect;

              return (
                <div
                  key={q.id}
                  className={`bg-white rounded-2xl border p-5 shadow-xs ${
                    isCorrect ? 'border-emerald-200 bg-emerald-50/20' : 'border-red-200 bg-red-50/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2 text-xs">
                    <span className="font-bold text-slate-800">Câu #{idx + 1}</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {isCorrect ? '✓ Trả lời đúng' : '✗ Trả lời chưa chính xác'}
                    </span>
                  </div>

                  <p className="text-sm font-medium text-slate-900 mb-3 whitespace-pre-line leading-relaxed">
                    {q.content}
                  </p>

                  {/* Options with correct/wrong marks */}
                  {q.options && q.options.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                      {q.options.map(opt => {
                        const isStudentChoice = detail?.studentAnswer === opt.id;
                        const isRealCorrect = q.correctAnswer === opt.id;

                        return (
                          <div
                            key={opt.id}
                            className={`p-2.5 rounded-xl border text-xs flex items-center gap-2 ${
                              isRealCorrect
                                ? 'bg-emerald-50 border-emerald-300 font-bold text-emerald-900'
                                : isStudentChoice && !isRealCorrect
                                ? 'bg-red-50 border-red-300 text-red-900 line-through'
                                : 'bg-white border-slate-200 text-slate-600'
                            }`}
                          >
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                              isRealCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                            }`}>
                              {opt.id}
                            </span>
                            <span>{opt.text}</span>
                            {isRealCorrect && <span className="ml-auto text-emerald-700 font-bold">✓ Đúng</span>}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Short answer review */}
                  {q.type === 'short_answer' && (
                    <div className="text-xs space-y-1 mb-3">
                      <div className="text-slate-600">Câu trả lời của bạn: <strong className="text-slate-900">{String(detail?.studentAnswer || 'Chưa trả lời')}</strong></div>
                      <div className="text-emerald-700">Đáp án chuẩn: <strong>{String(q.correctAnswer)}</strong></div>
                    </div>
                  )}

                  {/* Explanation */}
                  {q.explanation && (
                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 leading-relaxed">
                      <strong className="text-slate-900 block mb-1 font-bold">Lời giải chi tiết:</strong>
                      {q.explanation}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Allow back navigation flag
  const canGoBack = assignment ? (assignment.allowBackNavigation !== false) : true;

  // ACTIVE TEST TAKING INTERFACE (GIAO DIỆN LÀM BÀI)
  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Top Test Header */}
      <div className="sticky top-20 z-30 bg-white/95 backdrop-blur-xs border border-slate-200 p-4 rounded-2xl shadow-xs flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (window.confirm('Bạn có muốn thoát khỏi bài làm? Tiến trình hiện tại sẽ không được lưu.')) {
                onExit();
              }
            }}
            className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xs sm:text-sm font-bold text-slate-900 truncate max-w-[200px] sm:max-w-md">
              {assignment?.title || questionSet?.title || 'Bài ôn tập Hóa học 10'}
            </h1>
            <div className="flex items-center gap-2 text-[11px] text-slate-400 font-bold uppercase tracking-wider">
              <span>Tiến độ: Câu {currentIndex + 1} / {questions.length}</span>
              {assignment && (
                <span className="hidden sm:inline text-cyan-600 font-normal">
                  (Lần làm: {pastAttemptsCount + 1}/{assignment.maxAttempts > 10 ? '∞' : assignment.maxAttempts})
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Timer & Submit Button */}
        <div className="flex items-center gap-3">
          <div className={`px-3 py-1 rounded-full border flex items-center gap-2 text-xs font-mono font-bold tracking-wider ${
            timeLeftSeconds < 180 ? 'bg-red-50 text-red-600 border-red-200 animate-pulse' : 'bg-cyan-50 text-cyan-700 border-cyan-200'
          }`}>
            <Clock className="w-3.5 h-3.5" />
            <span>{formatTime(timeLeftSeconds)}</span>
          </div>

          <button
            onClick={() => setShowConfirmModal(true)}
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full text-xs font-bold shadow-xs uppercase tracking-wide transition-all flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Nộp bài</span>
          </button>
        </div>
      </div>

      {/* Instructions Banner if provided */}
      {assignment?.instructions && (
        <div className="p-3 bg-cyan-50/60 border border-cyan-200 rounded-2xl text-xs text-cyan-900 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-cyan-600 shrink-0" />
          <span><strong>Lưu ý từ Giáo viên:</strong> {assignment.instructions}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Question Panel */}
        <div className="lg:col-span-3 bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          {currentQ && (
            <>
              {/* Question Header & Bookmark */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2.5 py-0.5 bg-cyan-50 text-cyan-700 font-bold uppercase rounded-full border border-cyan-200 text-[10px]">
                    Câu {currentIndex + 1}
                  </span>
                  <span className="text-slate-500 font-medium text-xs">{currentQ.chapterTitle}</span>
                </div>

                <button
                  type="button"
                  onClick={() => toggleBookmark(currentQ.id)}
                  className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all uppercase tracking-wide ${
                    bookmarkedIds.includes(currentQ.id)
                      ? 'bg-amber-50 text-amber-800 border border-amber-300'
                      : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  <Bookmark className="w-3.5 h-3.5" />
                  <span>{bookmarkedIds.includes(currentQ.id) ? 'Đã đánh dấu' : 'Đánh dấu'}</span>
                </button>
              </div>

              {/* Question Content */}
              <div className="text-sm sm:text-base font-medium text-slate-900 leading-relaxed whitespace-pre-line">
                {currentQ.content}
              </div>

              {/* Interactive Answer Input based on Type */}
              {currentQ.type === 'multiple_choice' && currentQ.options && (
                <div className="space-y-2.5">
                  {currentQ.options.map(opt => {
                    const isSelected = studentAnswers[currentQ.id] === opt.id;
                    return (
                      <div
                        key={opt.id}
                        onClick={() => handleSelectMultipleChoice(currentQ.id, opt.id)}
                        className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${
                          isSelected
                            ? 'bg-cyan-50/80 border-cyan-500 shadow-xs ring-1 ring-cyan-500 font-bold text-cyan-950'
                            : 'bg-slate-50/60 border-slate-200 hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                          isSelected ? 'bg-cyan-600 text-white' : 'bg-slate-200 text-slate-700'
                        }`}>
                          {opt.id}
                        </span>
                        <span className="text-xs sm:text-sm leading-snug">{opt.text}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {currentQ.type === 'true_false' && currentQ.options && (
                <div className="space-y-2.5">
                  {currentQ.options.map((opt, sIdx) => {
                    const currArr: boolean[] = studentAnswers[currentQ.id] || [false, false, false, false];
                    const chosen = currArr[sIdx];

                    return (
                      <div key={opt.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-4">
                        <div className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-800">
                          <span className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                            {opt.id}
                          </span>
                          <span>{opt.text}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleSelectTrueFalse(currentQ.id, sIdx, true)}
                            className={`px-3 py-1 text-xs font-bold rounded-full transition-all uppercase tracking-wide ${
                              chosen === true ? 'bg-emerald-600 text-white shadow-xs' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            ĐÚNG
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSelectTrueFalse(currentQ.id, sIdx, false)}
                            className={`px-3 py-1 text-xs font-bold rounded-full transition-all uppercase tracking-wide ${
                              chosen === false ? 'bg-red-600 text-white shadow-xs' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            SAI
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {currentQ.type !== 'multiple_choice' && currentQ.type !== 'true_false' && (
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Nhập câu trả lời của bạn (số hoặc công thức hóa học):
                  </label>
                  <input
                    type="text"
                    placeholder="Ví dụ: +6, Al2O3, 2.5..."
                    value={studentAnswers[currentQ.id] || ''}
                    onChange={(e) => handleShortAnswerChange(currentQ.id, e.target.value)}
                    className="w-full p-3 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:bg-white font-mono"
                  />
                </div>
              )}

              {/* Prev / Next Nav */}
              <div className="flex items-center justify-between pt-6 border-t border-slate-100">
                {canGoBack ? (
                  <button
                    type="button"
                    disabled={currentIndex === 0}
                    onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 font-bold rounded-full text-xs flex items-center gap-1 uppercase tracking-wide transition-all"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Câu trước</span>
                  </button>
                ) : (
                  <div className="text-[11px] text-slate-400 italic">
                    (Không cho phép quay lại câu trước)
                  </div>
                )}

                {currentIndex < questions.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => setCurrentIndex(prev => Math.min(questions.length - 1, prev + 1))}
                    className="px-5 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-full text-xs flex items-center gap-1 shadow-md shadow-cyan-600/20 uppercase tracking-wide transition-all"
                  >
                    <span>Câu tiếp theo</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowConfirmModal(true)}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-full text-xs flex items-center gap-1 shadow-xs uppercase tracking-wide transition-all"
                  >
                    <Send className="w-4 h-4" />
                    <span>Nộp bài thi</span>
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {/* Sidebar Question Palette Grid */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4 h-fit">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Bảng điều hướng câu hỏi
          </h3>

          <div className="grid grid-cols-5 gap-2">
            {questions.map((q, idx) => {
              const isAnswered = studentAnswers[q.id] !== undefined && studentAnswers[q.id] !== '';
              const isCurrent = idx === currentIndex;
              const isBookmarked = bookmarkedIds.includes(q.id);

              return (
                <button
                  key={q.id}
                  disabled={!canGoBack && idx < currentIndex}
                  onClick={() => {
                    if (canGoBack || idx >= currentIndex) {
                      setCurrentIndex(idx);
                    }
                  }}
                  className={`h-8 rounded-xl font-bold text-xs flex items-center justify-center transition-all relative ${
                    isCurrent
                      ? 'bg-cyan-600 text-white shadow-xs'
                      : isAnswered
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed'
                  }`}
                >
                  {idx + 1}
                  {isBookmarked && (
                    <span className="w-2 h-2 rounded-full bg-amber-500 absolute -top-0.5 -right-0.5" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="pt-3 border-t border-slate-100 space-y-1.5 text-[10px] text-slate-500">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-cyan-600" />
              <span>Đang chọn</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-100 border border-emerald-300" />
              <span>Đã trả lời</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-slate-200" />
              <span>Chưa làm</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>Đánh dấu xem lại</span>
            </div>
          </div>
        </div>
      </div>

      {/* Submit Confirmation Dialog */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 text-center space-y-4">
            <div className="inline-flex p-3 bg-amber-50 text-amber-600 rounded-2xl">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 uppercase tracking-wide">Xác nhận nộp bài?</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Bạn đã hoàn thành{' '}
              <strong className="text-slate-900">
                {Object.keys(studentAnswers).filter(k => studentAnswers[k] !== '').length} / {questions.length}
              </strong>{' '}
              câu hỏi. Bạn có chắc chắn muốn nộp bài để chấm điểm ngay không?
            </p>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full text-xs font-bold uppercase tracking-wide"
              >
                Làm tiếp
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleSubmitTest}
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full text-xs font-bold shadow-xs uppercase tracking-wide disabled:opacity-50"
              >
                {submitting ? 'Đang chấm...' : 'Nộp bài'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
