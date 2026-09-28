import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  ShieldCheck, 
  AlertCircle, 
  Check, 
  X, 
  XCircle,
  Maximize2,
  Minimize2,
  Eye,
  EyeOff,
  LayoutGrid,
  Flag,
  FlagOff,
  Zap,
  ShieldAlert,
  Keyboard,
  Info
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { questionService, questionSetService, assignmentService, submissionService, chapterConfigService } from '../services/dbService';
import { useAuth } from '../context/AuthContext';
import { Question, QuestionSet, Assignment, Submission } from '../types';
import { getLessonName, normalizeChapterId, getChapterTitle, UNCLASSIFIED_CHAPTER_ID, getDefaultQuestionsForChapter } from '../data/curriculum';
import { buildChapterPracticeQuestions, buildMatrixQuestions, MatrixDistributionSummary } from '../utils/chapterPracticeMatrix';
import { formatCorrectAnswer, formatStudentAnswer, isAnswerFilled } from '../utils/answerFormatting';
import { SubmissionDetailReview } from './SubmissionDetailReview';
import { MathRenderer } from './MathRenderer';

const isMultipleChoice = (q: Question) => {
  return q.type === 'multiple_choice' || (q.type !== 'true_false' && !!q.options && q.options.length > 0);
};

interface PracticeViewProps {
  setId: string;
  assignmentId?: string;
  chapterId?: string;
  onFinish: (submissionId: string) => void;
  onExit: () => void;
}

export const PracticeView: React.FC<PracticeViewProps> = ({ setId, assignmentId, chapterId, onFinish, onExit }) => {
  const { user } = useAuth();
  const [questionSet, setQuestionSet] = useState<QuestionSet | null>(null);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Student answers state: questionId -> answer
  const [studentAnswers, setStudentAnswers] = useState<Record<string, any>>({});
  // Bookmarked / Flagged questions for review
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);
  
  // Countdown Timer & Zen Mode
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number>(15 * 60);
  const [isTimerHidden, setIsTimerHidden] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showMatrixDrawer, setShowMatrixDrawer] = useState<boolean>(false);
  const [matrixFilter, setMatrixFilter] = useState<'all' | 'unanswered' | 'bookmarked'>('all');
  
  // Anti-distraction tab-switching monitor
  const [tabSwitchCount, setTabSwitchCount] = useState<number>(0);
  const [showTabWarning, setShowTabWarning] = useState<boolean>(false);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showExitConfirmModal, setShowExitConfirmModal] = useState(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [attemptLimitReached, setAttemptLimitReached] = useState(false);
  const [isAssignmentClosed, setIsAssignmentClosed] = useState(false);
  const [closedReason, setClosedReason] = useState<string>('');
  const [pastAttemptsCount, setPastAttemptsCount] = useState(0);

  // Result state
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<Submission | null>(null);
  const [matrixSummary, setMatrixSummary] = useState<MatrixDistributionSummary | null>(null);

  // Cache key for auto-saving student answers
  const cacheKey = `chem10_answers_${setId}_${assignmentId || 'free'}_${user?.email || 'anon'}`;

  // Normalized Target Chapter ID (if applicable)
  const targetChapterId = chapterId
    ? normalizeChapterId(chapterId)
    : (setId.startsWith('chapter-practice:')
        ? normalizeChapterId(setId.replace('chapter-practice:', ''))
        : (setId.startsWith('chuong-') ? normalizeChapterId(setId) : (questionSet?.chapterId ? normalizeChapterId(questionSet.chapterId) : null)));

  // 1. Initial Load Test
  useEffect(() => {
    const loadTest = async () => {
      setLoading(true);
      try {
        // Parallel fetch assignment and questionSet
        const [assignData, loadedSet] = await Promise.all([
          assignmentId ? assignmentService.getAssignmentById(assignmentId) : Promise.resolve(null),
          setId ? questionSetService.getSetById(setId).catch(() => null) : Promise.resolve(null)
        ]);

        if (assignmentId) {
          if (!assignData) {
            setIsAssignmentClosed(true);
            setClosedReason("Bài giao này không tồn tại hoặc đã bị xóa khỏi hệ thống.");
            setLoading(false);
            return;
          }

          setAssignment(assignData);

          const now = Date.now();
          const startTs = assignData.startAt ? new Date(assignData.startAt).getTime() : 0;
          const endTs = assignData.endAt ? new Date(assignData.endAt).getTime() : (assignData.deadline ? new Date(assignData.deadline + 'T23:59:59').getTime() : Infinity);

          if (assignData.status === 'CLOSED' || assignData.status === 'CANCELLED' || assignData.status === 'ENDED' || now > endTs) {
            setIsAssignmentClosed(true);
            setClosedReason("Bài giao này đã đóng hoặc đã hết thời gian nộp bài.");
            setLoading(false);
            return;
          }

          if (startTs > 0 && now < startTs) {
            setIsAssignmentClosed(true);
            setClosedReason(`Bài giao chưa mở. Thời gian bắt đầu: ${new Date(assignData.startAt!).toLocaleString('vi-VN')}`);
            setLoading(false);
            return;
          }

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

        let s: QuestionSet | null = loadedSet;
        if (!s && assignData && assignData.questionSetId) {
          s = await questionSetService.getSetById(assignData.questionSetId).catch(() => null);
        }

        let matched: Question[] = [];

        if (s) {
          setQuestionSet(s);
          const durationMin = assignData ? assignData.durationMinutes : (s?.durationMinutes || 15);
          setTimeLeftSeconds(durationMin === 0 ? 999999 : durationMin * 60);

          // 1. Dynamic Matrix Exam: Auto-sample & shuffle questions per student according to chapter count, format & level rules
          if (s.matrixConfig && (s.type === 'MATRIX_DYNAMIC' || s.matrixConfig.isDynamicPerStudent || (!s.questions?.length && !s.questionIds?.length))) {
            const allBankQ = await questionService.getQuestions();
            const { questions: matrixQuestions, summary } = buildMatrixQuestions(allBankQ, s.matrixConfig);
            if (matrixQuestions.length > 0) {
              matched = matrixQuestions;
              if (summary) setMatrixSummary(summary);
            }
          }

          if (matched.length === 0) {
            if (s.questions && Array.isArray(s.questions) && s.questions.length > 0) {
              // Standalone exam with embedded questions (from JSON / Word)
              matched = s.questions.map(q => {
                const { correctAnswer: _ca, explanation: _ex, ...sanitized } = q;
                return sanitized as Question;
              });
            } else if (s.questionIds && Array.isArray(s.questionIds) && s.questionIds.length > 0) {
              matched = await questionService.getQuestionsByIds(s.questionIds);
            }
          }
        }

        // 2. Chapter-specific practice fallback if matched is empty
        let customPracticeCount = 30;
        let cleanChapterKey = setId;
        if (setId.startsWith('chapter-practice:')) {
          const parts = setId.split(':');
          cleanChapterKey = parts[1] || 'chuong-1';
          if (parts[2]) {
            const parsedCount = parseInt(parts[2], 10);
            if (!isNaN(parsedCount) && parsedCount > 0) {
              customPracticeCount = parsedCount;
            }
          }
        }

        const effectiveChapter = chapterId
          ? normalizeChapterId(chapterId)
          : normalizeChapterId(cleanChapterKey || (s?.chapterId ? s.chapterId : 'chuong-1'));

        if (matched.length === 0) {
          const chapTitle = getChapterTitle(effectiveChapter);
          const autoDuration = Math.max(10, Math.round(customPracticeCount * 1.5));
          if (!s) {
            s = {
              id: `chapter-practice:${effectiveChapter}:${customPracticeCount}`,
              title: `Luyện đề (${customPracticeCount} câu) – ${chapTitle}`,
              description: `Đề ôn tập trắc nghiệm và câu hỏi củng cố ${chapTitle}`,
              chapterId: effectiveChapter,
              durationMinutes: autoDuration,
              questionIds: [],
              totalScore: 10,
              allowReviewAnswers: true,
              createdBy: 'system',
              creatorEmail: '',
              createdAt: new Date().toISOString(),
              isPublic: true
            };
            setQuestionSet(s);
          }

          const durationMin = assignData ? assignData.durationMinutes : (s?.durationMinutes || autoDuration);
          setTimeLeftSeconds(durationMin === 0 ? 999999 : durationMin * 60);

          const allChapterQ = await questionService.getQuestions({ chapterId: effectiveChapter });
          if (allChapterQ.length > 0) {
            const chConfig = await chapterConfigService.getConfigByChapter(effectiveChapter).catch(() => undefined);
            const { questions: matrixQ, summary } = buildChapterPracticeQuestions(allChapterQ, effectiveChapter, customPracticeCount, chConfig);
            matched = matrixQ.length > 0 ? matrixQ : allChapterQ;
            if (summary) setMatrixSummary(summary);
          } else {
            const defQ = getDefaultQuestionsForChapter(effectiveChapter);
            matched = defQ.map(q => {
              const { correctAnswer: _ca, explanation: _ex, ...sanitized } = q;
              return sanitized as Question;
            });
          }
        }

        // Apply Shuffling if assignment has shuffleQuestions enabled
        if (assignData?.shuffleQuestions) {
          matched = [...matched].sort(() => Math.random() - 0.5);
        }

        // Apply Option Shuffling if assignment has shuffleOptions enabled
        if (assignData?.shuffleOptions) {
          matched = matched.map(q => {
            if (isMultipleChoice(q) && q.options && q.options.length > 0) {
              return {
                ...q,
                options: [...q.options].sort(() => Math.random() - 0.5)
              };
            }
            return q;
          });
        }

        setQuestions(matched);
        setCurrentIndex(0);

        // Try restoring cached answers if any
        try {
          const cached = localStorage.getItem(cacheKey);
          if (cached) {
            setStudentAnswers(JSON.parse(cached));
          }
        } catch (e) {}

      } catch (err) {
        console.error("Error loading test:", err);
      } finally {
        setLoading(false);
      }
    };
    loadTest();
  }, [setId, assignmentId, chapterId, user?.email]);

  // 2. Timer Tick
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

  // 3. Anti-distraction Tab Switching Listener
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && !isSubmitted && !loading) {
        setTabSwitchCount(prev => {
          const next = prev + 1;
          setShowTabWarning(true);
          return next;
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isSubmitted, loading]);

  // 4. Fullscreen State Sync
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Real-time answer caching to localStorage
  const updateAnswers = (newAnswers: Record<string, any>) => {
    setStudentAnswers(newAnswers);
    try {
      localStorage.setItem(cacheKey, JSON.stringify(newAnswers));
    } catch (e) {}
  };

  // Automatically scroll smoothly to top when switching questions
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentIndex]);

  const currentQ = questions[currentIndex];

  const handleSelectMultipleChoice = (qId: string, optId: string) => {
    updateAnswers({
      ...studentAnswers,
      [qId]: optId
    });
  };

  const handleSelectTrueFalse = (qId: string, subIdx: number, val: boolean) => {
    const prevArr: (boolean | undefined)[] = Array.isArray(studentAnswers[qId]) 
      ? [...studentAnswers[qId]] 
      : [undefined, undefined, undefined, undefined];
    prevArr[subIdx] = val;
    updateAnswers({
      ...studentAnswers,
      [qId]: prevArr
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

  // 5. Keyboard Navigation Shortcuts (ArrowLeft, ArrowRight, A, B, C, D, 1, 2, 3, 4, F)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input or textarea
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.key === 'ArrowRight' || e.key === 'k') {
        if (currentIndex < questions.length - 1) {
          setCurrentIndex(prev => prev + 1);
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'j') {
        if (currentIndex > 0 && (assignment ? assignment.allowBackNavigation !== false : true)) {
          setCurrentIndex(prev => prev - 1);
        }
      } else if (e.key.toLowerCase() === 'f' || e.key.toLowerCase() === 'b') {
        if (currentQ) {
          toggleBookmark(currentQ.id);
        }
      } else if (currentQ && isMultipleChoice(currentQ) && currentQ.options) {
        const key = e.key.toUpperCase();
        let targetOptId: string | null = null;
        if (['A', 'B', 'C', 'D'].includes(key)) {
          targetOptId = key;
        } else if (['1', '2', '3', '4'].includes(key)) {
          const idx = parseInt(key) - 1;
          if (currentQ.options[idx]) {
            targetOptId = currentQ.options[idx].id;
          }
        }
        if (targetOptId) {
          const matchedOpt = currentQ.options.find(o => String(o.id || o.label).toUpperCase() === targetOptId);
          if (matchedOpt) {
            handleSelectMultipleChoice(currentQ.id, matchedOpt.id);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, questions.length, currentQ, studentAnswers, bookmarkedIds]);

  // 6. Secure Instant Test Submission & Grading (0s)
  const handleSubmitTest = async () => {
    setShowConfirmModal(false);
    setSubmitting(true);

    const totalDuration = assignment ? (assignment.durationMinutes * 60) : (questionSet?.durationMinutes ? questionSet.durationMinutes * 60 : 900);
    const timeSpent = timeLeftSeconds > 900000 ? 300 : Math.max(1, totalDuration - timeLeftSeconds);
    const validQIds = questions.map(q => q.id).filter(Boolean);

    try {
      const result = await submissionService.submitAndGradeOnline({
        assignmentId: assignmentId || '',
        questionSetId: setId || 'practice-set',
        questionSetTitle: assignment?.title || questionSet?.title || 'Bài ôn tập Hóa 10',
        studentId: user?.uid || 'guest-student',
        studentEmail: user?.email || '',
        studentName: user?.displayName || user?.email?.split('@')[0] || 'Học sinh',
        studentClass: user?.classId || '10A1',
        attemptNumber: pastAttemptsCount + 1,
        durationSeconds: timeSpent,
        answers: studentAnswers,
        questionIds: validQIds,
        cachedQuestions: (questionSet?.questions && questionSet.questions.length > 0) ? questionSet.questions : questions,
        questionSet: questionSet
      });

      const submissionData: Submission = {
        id: result.submissionId || 'sub-' + Date.now(),
        assignmentId: assignmentId || '',
        questionSetId: setId || 'practice-set',
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
        totalQuestions: result.totalQuestions || validQIds.length,
        correctCount: result.correctCount,
        incorrectCount: result.wrongCount,
        wrongCount: result.wrongCount,
        details: result.details || [],
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
          particleCount: 100,
          spread: 80,
          origin: { y: 0.6 }
        });
      }
    } catch (e: any) {
      console.error("[PracticeView] Submit error:", e);
      // Resilient fallback
      const fallbackSub: Submission = {
        id: 'sub-' + Date.now(),
        assignmentId: assignmentId || '',
        questionSetId: setId || 'practice-set',
        questionSetTitle: assignment?.title || questionSet?.title || 'Bài ôn tập Hóa 10',
        studentId: user?.uid || 'guest-student',
        studentEmail: user?.email || '',
        studentName: user?.displayName || 'Học sinh',
        studentClass: user?.classId || '10A1',
        attemptNumber: pastAttemptsCount + 1,
        startedAt: new Date().toISOString(),
        submittedAt: new Date().toISOString(),
        durationSeconds: timeSpent,
        answers: studentAnswers,
        score: 0,
        totalQuestions: validQIds.length,
        correctCount: 0,
        incorrectCount: validQIds.length,
        wrongCount: validQIds.length,
        details: [],
        status: 'submitted'
      };
      setSubmissionResult(fallbackSub);
      setIsSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (secs: number) => {
    if (secs > 900000) return 'Tự do';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Completion calculation
  const answeredCount = questions.filter(q => isAnswerFilled(studentAnswers[q.id])).length;
  const totalQCount = questions.length || 1;
  const progressPercent = Math.round((answeredCount / totalQCount) * 100);

  // Filtered matrix questions
  const filteredMatrixQuestions = questions.map((q, idx) => ({ q, idx })).filter(({ q }) => {
    if (matrixFilter === 'unanswered') return !isAnswerFilled(studentAnswers[q.id]);
    if (matrixFilter === 'bookmarked') return bookmarkedIds.includes(q.id);
    return true;
  });

  if (loading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-900 text-white font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-cyan-500/20 border border-cyan-400/40 rounded-2xl flex items-center justify-center text-cyan-400 shadow-xl shadow-cyan-500/20">
            <Sparkles className="w-8 h-8 animate-spin text-cyan-400" style={{ animationDuration: '3s' }} />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-bold tracking-wide text-white">Đang tải đề thi...</h3>
            <p className="text-xs text-slate-400 mt-1">Đang thiết lập phòng thi chống phân tâm</p>
          </div>
        </div>
      </div>
    );
  }

  // ASSIGNMENT CLOSED VIEW
  if (isAssignmentClosed) {
    return (
      <div className="min-h-full flex items-center justify-center p-6 bg-slate-50 text-slate-900">
        <div className="max-w-md w-full p-8 bg-white border border-slate-200 rounded-3xl text-center space-y-5 shadow-xl animate-fade-in">
          <div className="w-16 h-16 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-center mx-auto text-rose-500">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Bài kiểm tra không khả dụng</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            {closedReason || "Bài kiểm tra đã đóng hoặc đã hết thời gian nộp bài."}
          </p>
          <button
            onClick={onExit}
            className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-md shadow-cyan-600/20"
          >
            Quay về trang ôn tập
          </button>
        </div>
      </div>
    );
  }

  // ATTEMPT LIMIT REACHED VIEW
  if (attemptLimitReached) {
    return (
      <div className="min-h-full flex items-center justify-center p-6 bg-slate-50 text-slate-900">
        <div className="max-w-md w-full p-8 bg-white border border-slate-200 rounded-3xl text-center space-y-5 shadow-xl animate-fade-in">
          <div className="w-16 h-16 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-center mx-auto text-amber-500">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Đã hết số lượt làm bài quy định</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Bài kiểm tra <strong>{assignment?.title}</strong> giới hạn tối đa <strong>{assignment?.maxAttempts} lần</strong>. Bạn đã hoàn thành đủ số lượt.
          </p>
          <button
            onClick={onExit}
            className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-md shadow-cyan-600/20"
          >
            Quay về trang ôn tập
          </button>
        </div>
      </div>
    );
  }

  // RESULT VIEW AFTER SUBMISSION
  if (isSubmitted && submissionResult) {
    const isScoreVisible = !assignment || assignment.showScore === 'immediate' || assignment.isScorePublished;
    const isAnswerReviewAllowed = !assignment || assignment.showAnswers === 'after_submit' || assignment.allowReviewAnswers;
    const isSolutionVisible = !assignment || (assignment.showSolutions !== false && (assignment as any).showSolutions !== 'none');

    return (
      <div className="min-h-full bg-slate-50 text-slate-900 p-4 sm:p-8 flex flex-col justify-start items-center">
        <div className="max-w-4xl w-full space-y-6 animate-fade-in pb-16">
          {/* Score Card */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-md text-center">
            <div className="inline-flex p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-2xl mb-4 shadow-sm">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Hoàn thành bài kiểm tra!</h1>
            <p className="text-xs text-slate-500 mt-1">{submissionResult.questionSetTitle}</p>

            {isScoreVisible ? (
              <div className="my-6 py-6 border-y border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Điểm số</div>
                  <div className="text-3xl sm:text-4xl font-black text-cyan-600 mt-1">
                    {submissionResult.score} <span className="text-xs font-normal text-slate-400">/ 10</span>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Số câu đúng</div>
                  <div className="text-3xl sm:text-4xl font-black text-emerald-600 mt-1">
                    {submissionResult.correctCount} <span className="text-xs font-normal text-slate-400">/{submissionResult.totalQuestions}</span>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Tỷ lệ chính xác</div>
                  <div className="text-3xl sm:text-4xl font-black text-purple-600 mt-1">
                    {Math.round((submissionResult.correctCount / submissionResult.totalQuestions) * 100)}%
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Thời gian làm</div>
                  <div className="text-2xl sm:text-3xl font-black text-slate-800 mt-1">
                    {Math.floor(submissionResult.durationSeconds / 60)}p {submissionResult.durationSeconds % 60}s
                  </div>
                </div>
              </div>
            ) : (
              <div className="my-6 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center space-y-1">
                <span className="text-sm font-bold text-slate-800">Bài thi đã được ghi nhận và lưu trữ an toàn</span>
                <p className="text-xs text-slate-500">
                  Giáo viên cài đặt công bố điểm sau. Bạn có thể xem lại kết quả khi giáo viên mở điểm.
                </p>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={onExit}
                className="px-7 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-full text-xs shadow-md shadow-cyan-600/20 uppercase tracking-wider transition-all cursor-pointer"
              >
                Quay lại trang chủ ôn tập
              </button>
            </div>
          </div>

          {/* Detailed Solutions Review */}
          <div className="bg-white text-slate-900 p-6 rounded-3xl border border-slate-200 shadow-md">
            <SubmissionDetailReview
              submission={submissionResult}
              questions={questions}
              isAnswerReviewAllowed={isAnswerReviewAllowed}
              isSolutionVisible={isSolutionVisible}
            />
          </div>
        </div>
      </div>
    );
  }

  // Allow back navigation flag
  const canGoBack = assignment ? (assignment.allowBackNavigation !== false) : true;

  // ACTIVE DISTRACTION-FREE EXAM ROOM INTERFACE (LIGHT THEME)
  return (
    <div className="min-h-screen w-full bg-[#F8FAFC] text-slate-900 flex flex-col font-sans selection:bg-cyan-100 selection:text-cyan-900 pb-28">
      {/* 1. TOP FOCUS EXAM BAR */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 py-3 flex items-center justify-between gap-3 shadow-xs">
        {/* Left: Exit & Title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => setShowExitConfirmModal(true)}
            title="Thoát phòng thi"
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 rounded-xl transition-all cursor-pointer shrink-0 border border-slate-200"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 bg-cyan-50 text-cyan-700 border border-cyan-200 rounded-full text-[10px] font-extrabold uppercase tracking-wider">
                Phòng thi tập trung
              </span>
              {user?.displayName && (
                <span className="text-[11px] text-slate-500 font-medium truncate hidden sm:inline">
                  {user.displayName} {user.classId ? `(${user.classId})` : ''}
                </span>
              )}
            </div>
            <h1 className="text-xs sm:text-sm font-bold text-slate-900 truncate max-w-[200px] sm:max-w-md md:max-w-xl">
              {assignment?.title || (
                targetChapterId && targetChapterId !== UNCLASSIFIED_CHAPTER_ID
                  ? `Luyện đề – ${getChapterTitle(targetChapterId)}`
                  : (questionSet?.title || 'Bài ôn tập Hóa học 10')
              )}
            </h1>
          </div>
        </div>

        {/* Center/Right: Timer, Fullscreen, Matrix Drawer & Submit */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Smart Countdown Timer */}
          <div className="flex items-center gap-1.5 bg-slate-100/90 border border-slate-200 rounded-full px-3 py-1.5 shadow-xs">
            <Clock className={`w-4 h-4 ${
              timeLeftSeconds <= 60 
                ? 'text-rose-500 animate-bounce' 
                : (timeLeftSeconds <= 300 ? 'text-amber-500 animate-pulse' : 'text-cyan-600')
            }`} />
            
            {!isTimerHidden ? (
              <span className={`font-mono text-xs sm:text-sm font-black tracking-wider ${
                timeLeftSeconds <= 60 
                  ? 'text-rose-600' 
                  : (timeLeftSeconds <= 300 ? 'text-amber-600' : 'text-cyan-700')
              }`}>
                {formatTime(timeLeftSeconds)}
              </span>
            ) : (
              <span className="text-xs font-bold text-slate-400 tracking-wider">••••</span>
            )}

            <button
              onClick={() => setIsTimerHidden(!isTimerHidden)}
              title={isTimerHidden ? "Hiện đồng hồ" : "Ẩn đồng hồ (Zen mode)"}
              className="p-1 hover:bg-slate-200 rounded-full text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            >
              {isTimerHidden ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            </button>
          </div>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? "Thu nhỏ màn hình" : "Toàn màn hình (F11)"}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 rounded-xl transition-colors cursor-pointer hidden md:flex border border-slate-200"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Question Matrix Drawer Toggle (Mobile / Tablet) */}
          <button
            onClick={() => setShowMatrixDrawer(!showMatrixDrawer)}
            title="Danh sách câu hỏi"
            className={`p-2 rounded-xl transition-all flex items-center gap-1.5 text-xs font-bold cursor-pointer lg:hidden border border-slate-200 ${
              showMatrixDrawer 
                ? 'bg-cyan-600 text-white shadow-xs' 
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span className="hidden sm:inline">{answeredCount}/{questions.length}</span>
          </button>

          {/* Primary Submit Button */}
          <button
            onClick={() => setShowConfirmModal(true)}
            className="px-4 sm:px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-full text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Nộp bài</span>
          </button>
        </div>
      </header>

      {/* 2. PROGRESS STRIP */}
      <div className="w-full bg-white border-b border-slate-200 px-4 sm:px-8 py-2 flex items-center justify-between text-xs">
        <div className="flex items-center gap-3 text-slate-500">
          <span className="font-bold text-slate-900">Câu {currentIndex + 1} / {questions.length}</span>
          <span className="hidden sm:inline">•</span>
          <span className="hidden sm:inline text-slate-600">Đã làm: <strong className="text-emerald-600">{answeredCount}</strong>/{questions.length} ({progressPercent}%)</span>
          {bookmarkedIds.length > 0 && (
            <>
              <span className="hidden sm:inline">•</span>
              <span className="text-amber-600 font-semibold flex items-center gap-1">
                <Flag className="w-3 h-3 fill-amber-500 text-amber-500" /> {bookmarkedIds.length} xem lại
              </span>
            </>
          )}
        </div>

        {/* Shortcuts / Anti-distraction badge */}
        <div className="flex items-center gap-3">
          {tabSwitchCount > 0 && (
            <span className="px-2.5 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-full text-[10px] font-bold flex items-center gap-1">
              <ShieldAlert className="w-3 h-3 text-rose-500" />
              <span>Rời tab: {tabSwitchCount}</span>
            </span>
          )}
          <button
            onClick={() => setShowShortcutsHelp(true)}
            className="text-[11px] text-slate-500 hover:text-cyan-700 flex items-center gap-1 cursor-pointer transition-colors"
          >
            <Keyboard className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Phím tắt</span>
          </button>
        </div>
      </div>

      {/* Thin Progress Bar Line */}
      <div className="w-full h-1 bg-slate-100">
        <div
          className="h-full bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 transition-all duration-300 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* 3. MAIN WORKSPACE CANVAS */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-4 gap-6 items-start pb-12">
        {/* Left 3 Columns: Focus Question Box */}
        <div className="lg:col-span-3 space-y-6">
          {currentQ && (
            <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6 transition-all">
              {/* Question Header & Action Row */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 flex-wrap gap-2">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="px-3 py-1 bg-cyan-50 text-cyan-700 border border-cyan-200 font-black uppercase rounded-xl text-xs tracking-wider">
                    Câu {currentIndex + 1}
                  </span>
                  <span className="px-2.5 py-1 bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold">
                    {currentQ.type === 'true_false' 
                      ? 'Đúng / Sai 4 ý' 
                      : (currentQ.type === 'multiple_choice' ? 'Trắc nghiệm 4 lựa chọn' : 'Trả lời ngắn')}
                  </span>
                  {currentQ.lessonTitle && (
                    <span className="text-xs text-slate-500 hidden sm:inline truncate max-w-xs">
                      • {currentQ.lessonName || currentQ.lessonTitle}
                    </span>
                  )}
                </div>

                {/* Bookmark / Flag Button */}
                <button
                  type="button"
                  onClick={() => toggleBookmark(currentQ.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all uppercase tracking-wide cursor-pointer border ${
                    bookmarkedIds.includes(currentQ.id)
                      ? 'bg-amber-50 text-amber-800 border-amber-300 shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
                  }`}
                >
                  <Flag className={`w-3.5 h-3.5 ${bookmarkedIds.includes(currentQ.id) ? 'fill-amber-500 text-amber-500' : ''}`} />
                  <span>{bookmarkedIds.includes(currentQ.id) ? 'Đã đánh dấu (F)' : 'Đánh dấu xem lại (F)'}</span>
                </button>
              </div>

              {/* Question Content Typography */}
              <div className="text-base sm:text-lg font-medium text-slate-900 leading-relaxed whitespace-pre-line tracking-normal">
                <MathRenderer content={currentQ.content} />
              </div>

              {/* Question Image if present */}
              {currentQ.imageUrl && (
                <div className="my-4 p-2 bg-slate-50 rounded-2xl border border-slate-200 inline-block max-w-full">
                  <img
                    src={currentQ.imageUrl}
                    alt="Hình ảnh câu hỏi"
                    className="max-h-72 rounded-xl object-contain bg-white p-2"
                  />
                </div>
              )}

              {/* Interactive Answers Section */}
              <div className="pt-2">
                {/* Dạng 1: Trắc nghiệm A, B, C, D */}
                {isMultipleChoice(currentQ) && currentQ.options && (
                  <div className="grid grid-cols-1 gap-3">
                    {currentQ.options.map((opt, optIdx) => {
                      const isSelected = studentAnswers[currentQ.id] === opt.id;
                      const displayLabel = opt.label || ['A', 'B', 'C', 'D'][optIdx] || opt.id;

                      return (
                        <div
                          key={opt.id}
                          onClick={() => handleSelectMultipleChoice(currentQ.id, opt.id)}
                          className={`p-4 sm:p-4.5 rounded-2xl border cursor-pointer transition-all duration-150 flex items-center gap-4 ${
                            isSelected
                              ? 'bg-cyan-50/90 border-2 border-cyan-500 ring-2 ring-cyan-100 text-cyan-950 font-bold shadow-xs'
                              : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100 hover:border-slate-300 text-slate-800'
                          }`}
                        >
                          <span className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm shrink-0 transition-all ${
                            isSelected 
                              ? 'bg-cyan-600 text-white shadow-xs scale-105' 
                              : 'bg-white border border-slate-200 text-slate-700'
                          }`}>
                            {displayLabel}
                          </span>
                          <div className="text-sm sm:text-base leading-relaxed flex-1">
                            <MathRenderer content={opt.text} />
                          </div>
                          {isSelected && (
                            <CheckCircle2 className="w-5 h-5 text-cyan-600 shrink-0" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Dạng 2: Đúng / Sai 4 ý */}
                {currentQ.type === 'true_false' && currentQ.options && (
                  <div className="space-y-3.5">
                    <div className="text-xs text-slate-500 font-semibold mb-1 flex items-center justify-between">
                      <span>Chọn <strong className="text-emerald-700">ĐÚNG</strong> hoặc <strong className="text-rose-700">SAI</strong> cho mỗi mệnh đề sau:</span>
                      <span className="text-[11px] text-slate-400 font-mono">4 ý a, b, c, d</span>
                    </div>
                    {currentQ.options.map((opt, sIdx) => {
                      const currArr: (boolean | undefined)[] = Array.isArray(studentAnswers[currentQ.id])
                        ? studentAnswers[currentQ.id]
                        : [undefined, undefined, undefined, undefined];
                      const chosen = currArr[sIdx];
                      const displayLabel = opt.id || ['a', 'b', 'c', 'd'][sIdx] || String(sIdx + 1);

                      return (
                        <div 
                          key={opt.id || sIdx} 
                          className={`p-4 sm:p-4.5 rounded-2xl border transition-all duration-150 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 ${
                            chosen === true
                              ? 'bg-emerald-50/40 border-emerald-300 ring-1 ring-emerald-200'
                              : chosen === false
                              ? 'bg-rose-50/40 border-rose-300 ring-1 ring-rose-200'
                              : 'bg-white border-slate-200/90 hover:border-slate-300 hover:bg-slate-50/50 shadow-2xs'
                          }`}
                        >
                          <div className="flex items-start gap-3.5 text-sm sm:text-base text-slate-800 leading-relaxed flex-1">
                            <span className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs shrink-0 mt-0.5 transition-colors ${
                              chosen === true
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : chosen === false
                                ? 'bg-rose-600 text-white shadow-xs'
                                : 'bg-cyan-50 border border-cyan-200 text-cyan-800 font-bold'
                            }`}>
                              {displayLabel}
                            </span>
                            <div className="flex-1 min-w-0">
                              <MathRenderer content={opt.text || (opt as any).content || ''} />
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-center shrink-0 touch-manipulation">
                            <button
                              type="button"
                              onClick={() => handleSelectTrueFalse(currentQ.id, sIdx, true)}
                              className={`px-4 py-2 text-xs font-black rounded-xl transition-all uppercase tracking-wider cursor-pointer border flex items-center gap-1.5 ${
                                chosen === true 
                                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/25 scale-102' 
                                  : 'bg-white border-slate-200 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300'
                              }`}
                            >
                              {chosen === true && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                              <span>ĐÚNG</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSelectTrueFalse(currentQ.id, sIdx, false)}
                              className={`px-4 py-2 text-xs font-black rounded-xl transition-all uppercase tracking-wider cursor-pointer border flex items-center gap-1.5 ${
                                chosen === false 
                                  ? 'bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-600/25 scale-102' 
                                  : 'bg-white border-slate-200 text-slate-600 hover:text-rose-700 hover:bg-rose-50 hover:border-rose-300'
                              }`}
                            >
                              {chosen === false && <X className="w-3.5 h-3.5 stroke-[3]" />}
                              <span>SAI</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Dạng 3: Trả lời ngắn / Tính toán */}
                {!isMultipleChoice(currentQ) && currentQ.type !== 'true_false' && (
                  <div className="space-y-2.5">
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                      Nhập câu trả lời của bạn:
                    </label>
                    <input
                      type="text"
                      autoFocus
                      placeholder="Nhập số thập phân (VD: 0,5 hoặc 0.5) hoặc công thức hóa học..."
                      value={studentAnswers[currentQ.id] || ''}
                      onChange={(e) => handleShortAnswerChange(currentQ.id, e.target.value)}
                      className="w-full p-4 text-base sm:text-lg bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 focus:bg-white text-slate-900 font-mono placeholder:text-slate-400 transition-all outline-hidden"
                    />
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                      <Info className="w-3.5 h-3.5" />
                      <span>Hệ thống tự động hỗ trợ cả dấu phẩy (0,5) và dấu chấm (0.5).</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Nav Action Bar */}
              <div className="flex items-center justify-between pt-6 border-t border-slate-100 gap-3">
                {canGoBack ? (
                  <button
                    type="button"
                    disabled={currentIndex === 0}
                    onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 uppercase tracking-wider transition-all cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Câu trước</span>
                  </button>
                ) : (
                  <div className="text-[11px] text-slate-500 italic">
                    (Không được quay lại câu trước)
                  </div>
                )}

                <div className="text-[11px] text-slate-500 hidden sm:block">
                  Phím tắt: <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-700 font-mono text-[10px]">←</kbd> <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-700 font-mono text-[10px]">→</kbd> để chuyển câu
                </div>

                {currentIndex < questions.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => setCurrentIndex(prev => Math.min(questions.length - 1, prev + 1))}
                    className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-cyan-600/20 uppercase tracking-wider transition-all cursor-pointer"
                  >
                    <span>Câu tiếp</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowConfirmModal(true)}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 uppercase tracking-wider transition-all cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>Rà soát & Nộp bài</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right 1 Column: Question Matrix Navigation Palette */}
        <aside className={`lg:block ${showMatrixDrawer ? 'fixed inset-0 z-50 p-4 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center' : 'hidden'} lg:sticky lg:top-24 lg:self-start`}>
          <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-sm space-y-4 max-w-sm w-full lg:max-w-none">
            {/* Matrix Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Bảng câu hỏi
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Đã làm: <strong className="text-emerald-600">{answeredCount}</strong> / {questions.length} câu
                </p>
              </div>

              {/* Close button on mobile modal */}
              {showMatrixDrawer && (
                <button
                  onClick={() => setShowMatrixDrawer(false)}
                  className="p-1 text-slate-400 hover:text-slate-700 lg:hidden cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-[11px]">
              <button
                type="button"
                onClick={() => setMatrixFilter('all')}
                className={`flex-1 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                  matrixFilter === 'all' ? 'bg-white text-cyan-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tất cả ({questions.length})
              </button>
              <button
                type="button"
                onClick={() => setMatrixFilter('unanswered')}
                className={`flex-1 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                  matrixFilter === 'unanswered' ? 'bg-white text-cyan-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Chưa làm ({questions.length - answeredCount})
              </button>
              <button
                type="button"
                onClick={() => setMatrixFilter('bookmarked')}
                className={`flex-1 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                  matrixFilter === 'bookmarked' ? 'bg-white text-cyan-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Đánh dấu ({bookmarkedIds.length})
              </button>
            </div>

            {/* Grid of 30 questions */}
            <div className="grid grid-cols-5 gap-2 max-h-[380px] overflow-y-auto pr-1">
              {filteredMatrixQuestions.map(({ q, idx }) => {
                const isAnswered = isAnswerFilled(studentAnswers[q.id]);
                const isCurrent = idx === currentIndex;
                const isBookmarked = bookmarkedIds.includes(q.id);

                return (
                  <button
                    key={q.id}
                    disabled={!canGoBack && idx < currentIndex}
                    onClick={() => {
                      if (canGoBack || idx >= currentIndex) {
                        setCurrentIndex(idx);
                        setShowMatrixDrawer(false);
                      }
                    }}
                    className={`h-10 rounded-xl font-bold text-xs flex items-center justify-center transition-all relative cursor-pointer border ${
                      isCurrent
                        ? 'bg-cyan-600 text-white font-black ring-2 ring-cyan-200 shadow-xs scale-105 z-10 border-cyan-600'
                        : isAnswered
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'
                    }`}
                  >
                    {idx + 1}
                    {isBookmarked && (
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 border border-white absolute -top-1 -right-1" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-[10px] text-slate-500">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-md bg-cyan-600" />
                <span>Đang làm</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-md bg-emerald-100 border border-emerald-300" />
                <span>Đã trả lời</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-md bg-slate-100 border border-slate-200" />
                <span>Chưa làm</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span>Đánh dấu</span>
              </div>
            </div>
          </div>
        </aside>
      </main>

      {/* 4. MODALS */}
      {/* Submit Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 text-center space-y-5">
            <div className="inline-flex p-4 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-2xl shadow-sm">
              <Send className="w-8 h-8" />
            </div>
            
            <div>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-wide">Xác nhận nộp bài thi?</h3>
              <p className="text-xs text-slate-500 mt-1">Hệ thống sẽ chấm điểm tức thì ngay sau khi bạn xác nhận.</p>
            </div>

            {/* Summary Box */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Số câu đã trả lời:</span>
                <strong className="text-emerald-600 font-bold">{answeredCount} / {questions.length} câu</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Số câu chưa làm:</span>
                <strong className={questions.length - answeredCount > 0 ? 'text-amber-600 font-bold' : 'text-slate-600 font-bold'}>
                  {questions.length - answeredCount} câu
                </strong>
              </div>
              {bookmarkedIds.length > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Số câu đánh dấu xem lại:</span>
                  <strong className="text-amber-600 font-bold">{bookmarkedIds.length} câu</strong>
                </div>
              )}
            </div>

            {questions.length - answeredCount > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2 text-left">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Bạn còn <strong>{questions.length - answeredCount} câu</strong> chưa điền đáp án. Bạn vẫn có thể nộp hoặc quay lại hoàn thành tiếp.</span>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-bold rounded-full text-xs uppercase tracking-wider transition-all cursor-pointer"
              >
                Làm tiếp
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleSubmitTest}
                className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-full text-xs uppercase tracking-wider shadow-md shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'Đang chấm...' : 'Nộp bài ngay'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exit Exam Confirmation Modal */}
      {showExitConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center space-y-4">
            <div className="inline-flex p-3.5 bg-rose-50 border border-rose-200 text-rose-500 rounded-2xl">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-900 uppercase tracking-wide">Rời khỏi bài làm?</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Bạn có chắc chắn muốn thoát khỏi phòng thi? Bài làm hiện tại chưa được nộp để tính điểm.
            </p>
            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowExitConfirmModal(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-full text-xs font-bold uppercase tracking-wide cursor-pointer"
              >
                Ở lại làm bài
              </button>
              <button
                type="button"
                onClick={onExit}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-full text-xs font-bold uppercase tracking-wide cursor-pointer shadow-md shadow-rose-600/20"
              >
                Thoát phòng thi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shortcuts Modal */}
      {showShortcutsHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Keyboard className="w-5 h-5 text-cyan-600" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Phím tắt thao tác nhanh</h3>
              </div>
              <button onClick={() => setShowShortcutsHelp(false)} className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-slate-700">
              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <span>Chọn đáp án A, B, C, D:</span>
                <span className="font-mono text-cyan-700 font-bold">Phím A, B, C, D hoặc 1, 2, 3, 4</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <span>Chuyển câu kế tiếp:</span>
                <span className="font-mono text-cyan-700 font-bold">Mũi tên phải (→) hoặc K</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <span>Quay lại câu trước:</span>
                <span className="font-mono text-cyan-700 font-bold">Mũi tên trái (←) hoặc J</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <span>Đánh dấu xem lại:</span>
                <span className="font-mono text-cyan-700 font-bold">Phím F hoặc B</span>
              </div>
            </div>

            <button
              onClick={() => setShowShortcutsHelp(false)}
              className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-full text-xs font-bold uppercase tracking-wide cursor-pointer shadow-xs"
            >
              Đã hiểu
            </button>
          </div>
        </div>
      )}

      {/* Tab switch anti-distraction alert */}
      {showTabWarning && (
        <div className="fixed bottom-4 right-4 z-50 bg-rose-50 border border-rose-300 text-slate-900 px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 animate-fade-in max-w-sm">
          <ShieldAlert className="w-5 h-5 text-rose-500 shrink-0" />
          <div className="text-xs">
            <strong className="block text-rose-700 font-bold">Nhắc nhở tập trung:</strong>
            Bạn vừa chuyển tab {tabSwitchCount} lần. Hãy tập trung làm bài để đạt kết quả tốt nhất!
          </div>
          <button onClick={() => setShowTabWarning(false)} className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

