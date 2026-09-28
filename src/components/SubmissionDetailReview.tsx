import React, { useState, useEffect } from 'react';
import { Check, X, AlertCircle, CheckCircle2, XCircle, HelpCircle, Lock } from 'lucide-react';
import { Question, Submission } from '../types';
import { questionService } from '../services/dbService';
import { formatStudentAnswer, formatCorrectAnswer, isAnswerFilled } from '../utils/answerFormatting';
import { MathRenderer } from './MathRenderer';

interface SubmissionDetailReviewProps {
  submission: Submission;
  questions?: Question[];
  isAnswerReviewAllowed?: boolean;
  isSolutionVisible?: boolean;
}

export const SubmissionDetailReview: React.FC<SubmissionDetailReviewProps> = ({
  submission,
  questions: initialQuestions,
  isAnswerReviewAllowed = true,
  isSolutionVisible = true,
}) => {
  const [resolvedQuestions, setResolvedQuestions] = useState<Question[]>(initialQuestions || []);
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  // If questions were not provided in props, fetch them directly by questionId from database
  useEffect(() => {
    if (initialQuestions && initialQuestions.length > 0) {
      setResolvedQuestions(initialQuestions);
      return;
    }

    const questionIds = submission.details?.map(d => d.questionId).filter(Boolean) || [];
    if (questionIds.length === 0) return;

    let isMounted = true;
    const loadMissingQuestions = async () => {
      setLoadingQuestions(true);
      try {
        const fromDb = await questionService.getQuestionsByIds(questionIds);
        if (isMounted) {
          const map = new Map<string, Question>();
          fromDb.forEach(q => map.set(q.id, q));
          const ordered = questionIds.map(id => map.get(id)).filter(Boolean) as Question[];
          setResolvedQuestions(ordered);
        }
      } catch (err) {
        console.warn("Could not load missing questions for review:", err);
      } finally {
        if (isMounted) setLoadingQuestions(false);
      }
    };

    loadMissingQuestions();
    return () => { isMounted = false; };
  }, [submission, initialQuestions]);

  if (!isAnswerReviewAllowed) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3 shadow-xs">
        <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto">
          <Lock className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900">Đáp án và lời giải chi tiết chưa được mở</h3>
        <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
          Giáo viên đã cài đặt chế độ không công bố đáp án ngay sau khi nộp bài. Bạn có thể xem lại kết quả chi tiết trong mục "Lịch sử & Tiến bộ" khi giáo viên công bố.
        </p>
      </div>
    );
  }

  const details = submission.details || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-bold text-slate-800 pb-2 border-b border-slate-200">
        <HelpCircle className="w-4 h-4 text-cyan-600" />
        <span>Chi tiết lời giải & Hướng dẫn sửa bài</span>
        {loadingQuestions && <span className="text-xs text-slate-400 font-normal ml-auto">(Đang tải câu hỏi...)</span>}
      </div>

      {details.map((detail, idx) => {
        const q = resolvedQuestions.find(rq => rq.id === detail.questionId);
        const isCorrect = detail.isCorrect ?? false;

        // Determine question type accurately
        const isMultipleChoice =
          q?.type === 'multiple_choice' ||
          (q?.type !== 'true_false' && !!q?.options && q.options.length > 0) ||
          (detail.subDetails == null &&
            typeof detail.correctAnswer === 'string' &&
            ['A', 'B', 'C', 'D'].includes(detail.correctAnswer.trim().toUpperCase()));

        const isTrueFalse =
          q?.type === 'true_false' ||
          detail.subDetails != null ||
          (Array.isArray(detail.correctAnswer) && typeof detail.correctAnswer[0] === 'boolean');

        const questionContent = q?.content || `Câu hỏi #${idx + 1} (${detail.questionId})`;

        return (
          <div
            key={detail.questionId || idx}
            className={`bg-white rounded-2xl border p-5 shadow-xs transition-all ${
              isCorrect ? 'border-emerald-200 bg-emerald-50/15' : 'border-red-200 bg-red-50/15'
            }`}
          >
            {/* Question Header */}
            <div className="flex items-center justify-between mb-2 text-xs">
              <span className="font-bold text-slate-800">
                Câu #{idx + 1}
                {q?.lessonName && <span className="text-slate-400 font-normal ml-2">• {q.lessonName}</span>}
              </span>
              <div className="flex items-center gap-2">
                {detail.score !== undefined && (
                  <span className="text-[11px] font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                    +{detail.score} đ
                  </span>
                )}
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase flex items-center gap-1 ${
                    isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                  }`}
                >
                  {isCorrect ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                  {isCorrect ? 'Trả lời đúng' : 'Trả lời chưa chính xác'}
                </span>
              </div>
            </div>

            {/* Question Content */}
            <div className="text-sm font-medium text-slate-900 mb-3 whitespace-pre-line leading-relaxed">
              <MathRenderer content={questionContent} />
            </div>

            {/* Question Image if any */}
            {q?.imageUrl && (
              <div className="mb-3">
                <img
                  src={q.imageUrl}
                  alt="Dữ liệu câu hỏi"
                  referrerPolicy="no-referrer"
                  className="max-h-56 rounded-xl border border-slate-200 object-contain"
                />
              </div>
            )}

            {/* --- CASE 1: MULTIPLE CHOICE (A, B, C, D) --- */}
            {isMultipleChoice && (() => {
              const studentChoice = String(detail.studentAnswer ?? '').trim().toUpperCase();
              const correctChoice = String(detail.correctAnswer ?? q?.correctAnswer ?? '').trim().toUpperCase();
              const hasStudentAnswer = studentChoice !== '' && studentChoice !== 'UNDEFINED' && studentChoice !== 'NULL';

              // If options are present on question object
              if (q?.options && q.options.length > 0) {
                return (
                  <div className="space-y-2 mb-3">
                    {!hasStudentAnswer && (
                      <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-1.5 font-medium flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                        Học sinh chưa trả lời câu này
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {q.options.map((opt, optIdx) => {
                        const optId = String(opt.id).trim().toUpperCase();
                        const isStudentChoice = hasStudentAnswer && studentChoice === optId;
                        const isRealCorrect = correctChoice !== '' && correctChoice === optId;
                        const displayLabel = opt.label || ['A', 'B', 'C', 'D'][optIdx] || opt.id;

                        let optionClass = 'bg-white border-slate-200 text-slate-700';
                        let badgeClass = 'bg-slate-100 text-slate-600';

                        if (isRealCorrect) {
                          optionClass = 'bg-emerald-50 border-emerald-300 text-emerald-950 font-medium shadow-2xs ring-1 ring-emerald-400/40';
                          badgeClass = 'bg-emerald-600 text-white font-bold';
                        } else if (isStudentChoice && !isRealCorrect) {
                          optionClass = 'bg-rose-50 border-rose-300 text-rose-950';
                          badgeClass = 'bg-rose-600 text-white font-bold';
                        }

                        return (
                          <div
                            key={opt.id}
                            className={`p-3 rounded-xl border text-xs flex items-center gap-2.5 transition-colors ${optionClass}`}
                          >
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0 ${badgeClass}`}>
                              {displayLabel}
                            </span>
                            <div className="leading-snug flex-1">
                              <MathRenderer content={opt.text} />
                            </div>

                            {isRealCorrect && isStudentChoice && (
                              <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100/90 px-2 py-0.5 rounded-md shrink-0">
                                <Check className="w-3.5 h-3.5" /> Bạn chọn đúng
                              </span>
                            )}
                            {isRealCorrect && !isStudentChoice && (
                              <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100/90 px-2 py-0.5 rounded-md shrink-0">
                                <Check className="w-3.5 h-3.5" /> Đáp án đúng
                              </span>
                            )}
                            {!isRealCorrect && isStudentChoice && (
                              <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-100/90 px-2 py-0.5 rounded-md shrink-0">
                                <X className="w-3.5 h-3.5" /> Bạn chọn
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              }

              // Fallback if options are not loaded
              return (
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2 mb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-slate-600 font-medium">Phương án đã chọn:</span>
                    <strong
                      className={`font-mono px-2.5 py-1 rounded text-xs border ${
                        hasStudentAnswer
                          ? isCorrect
                            ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                            : 'bg-rose-50 text-rose-900 border-rose-200'
                          : 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}
                    >
                      {hasStudentAnswer ? studentChoice : 'Chưa trả lời'}
                    </strong>
                    {hasStudentAnswer && (
                      isCorrect ? (
                        <span className="inline-flex items-center gap-1 font-bold text-emerald-700 text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Chính xác
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-bold text-rose-700 text-[11px]">
                          <XCircle className="w-3.5 h-3.5" /> Chưa chính xác
                        </span>
                      )
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-slate-600 font-medium">Đáp án chuẩn:</span>
                    <strong className="font-mono bg-emerald-100 text-emerald-900 px-2.5 py-1 rounded text-xs border border-emerald-300">
                      {correctChoice || 'Đang cập nhật'}
                    </strong>
                  </div>
                </div>
              );
            })()}

            {/* --- CASE 2: TRUE / FALSE (ĐÚNG / SAI 4 Ý a, b, c, d) --- */}
            {isTrueFalse && (() => {
              const subItems = [0, 1, 2, 3].map(sIdx => {
                const sub = detail.subDetails?.[sIdx];
                const opt = q?.options?.[sIdx];
                const label = sub?.label || opt?.id || ['a', 'b', 'c', 'd'][sIdx];
                const text = opt?.text || `Ý ${label}`;

                const stuBool =
                  sub?.studentVal !== undefined
                    ? sub.studentVal
                    : Array.isArray(detail.studentAnswer)
                    ? detail.studentAnswer[sIdx]
                    : null;

                const corrBool =
                  sub?.correctVal !== undefined
                    ? sub.correctVal
                    : Array.isArray(detail.correctAnswer)
                    ? detail.correctAnswer[sIdx]
                    : Array.isArray(q?.correctAnswer)
                    ? q?.correctAnswer[sIdx]
                    : null;

                const isAnswered = stuBool === true || stuBool === false;
                const isSubMatch =
                  sub?.isMatch !== undefined
                    ? sub.isMatch
                    : isAnswered && corrBool !== null && stuBool === corrBool;

                return { label, text, stuBool, corrBool, isAnswered, isSubMatch };
              });

              return (
                <div className="space-y-2 mb-3">
                  {subItems.map((item, sIdx) => {
                    return (
                      <div
                        key={sIdx}
                        className={`p-3 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                          !item.isAnswered
                            ? 'bg-slate-50/80 border-slate-200 text-slate-700'
                            : item.isSubMatch
                            ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                            : 'bg-rose-50/60 border-rose-200 text-rose-950'
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <span
                            className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5 ${
                              !item.isAnswered
                                ? 'bg-slate-200 text-slate-700'
                                : item.isSubMatch
                                ? 'bg-emerald-600 text-white'
                                : 'bg-rose-600 text-white'
                            }`}
                          >
                            {item.label}
                          </span>
                          <div className="font-medium text-slate-800 leading-relaxed flex-1">
                            <MathRenderer content={item.text} />
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-[11px] shrink-0 self-end sm:self-auto">
                          <span className="text-slate-500 font-medium">Bạn chọn:</span>
                          <span
                            className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                              item.stuBool === true
                                ? 'bg-blue-100 text-blue-800'
                                : item.stuBool === false
                                ? 'bg-slate-200 text-slate-800'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {item.stuBool === true ? 'ĐÚNG' : item.stuBool === false ? 'SAI' : 'Chưa chọn'}
                          </span>

                          <span className="text-slate-300">|</span>

                          <span className="text-slate-500 font-medium">Đáp án:</span>
                          <span
                            className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                              item.corrBool === true
                                ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                : item.corrBool === false
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {item.corrBool === true ? 'ĐÚNG' : item.corrBool === false ? 'SAI' : 'N/A'}
                          </span>

                          {item.isAnswered && (
                            <span
                              className={`inline-flex items-center gap-0.5 font-bold px-1.5 py-0.5 rounded text-[10px] ${
                                item.isSubMatch ? 'text-emerald-700 bg-emerald-100' : 'text-rose-700 bg-rose-100'
                              }`}
                            >
                              {item.isSubMatch ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                              {item.isSubMatch ? 'Đúng' : 'Sai'}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {/* --- CASE 3: SHORT ANSWER / CALCULATION / EQUATION --- */}
            {!isMultipleChoice && !isTrueFalse && (
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2 mb-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-slate-600 font-medium">Câu trả lời của bạn:</span>
                  <strong
                    className={`font-mono px-2.5 py-1 rounded text-xs border ${
                      isAnswerFilled(detail.studentAnswer)
                        ? isCorrect
                          ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                          : 'bg-rose-50 text-rose-900 border-rose-200'
                        : 'bg-slate-100 text-slate-500 border-slate-200'
                    }`}
                  >
                    {formatStudentAnswer(detail.studentAnswer)}
                  </strong>
                  {isAnswerFilled(detail.studentAnswer) && (
                    isCorrect ? (
                      <span className="inline-flex items-center gap-1 font-bold text-emerald-700 text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Chính xác
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-bold text-rose-700 text-[11px]">
                        <XCircle className="w-3.5 h-3.5" /> Chưa chính xác
                      </span>
                    )
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-slate-600 font-medium">Đáp án chuẩn:</span>
                  <strong className="font-mono bg-emerald-100 text-emerald-900 px-2.5 py-1 rounded text-xs border border-emerald-300">
                    {formatCorrectAnswer(detail.correctAnswer, q?.correctAnswer)}
                  </strong>
                </div>
              </div>
            )}

            {/* Detailed Explanation */}
            {isSolutionVisible && (detail.explanation || q?.explanation) && (
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 leading-relaxed">
                <strong className="text-slate-900 block mb-1 font-bold">Lời giải chi tiết:</strong>
                <MathRenderer content={detail.explanation || q?.explanation || ''} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
