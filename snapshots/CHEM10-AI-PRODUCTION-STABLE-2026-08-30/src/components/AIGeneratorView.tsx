import React, { useState } from 'react';
import { Sparkles, Check, X, CheckCircle2, AlertCircle, ArrowLeft, RefreshCw, Layers, Clock } from 'lucide-react';
import { CHEMISTRY_10_CURRICULUM, CANONICAL_CHAPTER_NAMES, normalizeChapterId } from '../data/curriculum';
import { generateQuestionsWithAI } from '../services/aiService';
import { questionService, questionSetService } from '../services/dbService';
import { useAuth } from '../context/AuthContext';
import { Question, QuestionType, CognitiveLevel } from '../types';

interface AIGeneratorViewProps {
  onNavigate: (tab: string, param?: any) => void;
  preselectedChapterId?: string;
}

export const AIGeneratorView: React.FC<AIGeneratorViewProps> = ({ onNavigate, preselectedChapterId }) => {
  const { user } = useAuth();

  const initialChId = preselectedChapterId ? normalizeChapterId(preselectedChapterId) : 'chuong-1';
  const [chapterId, setChapterId] = useState(
    CHEMISTRY_10_CURRICULUM.some(c => c.id === initialChId) ? initialChId : 'chuong-1'
  );
  const selectedChapter = CHEMISTRY_10_CURRICULUM.find(c => c.id === chapterId) || CHEMISTRY_10_CURRICULUM[0];
  const [lessonId, setLessonId] = useState(selectedChapter.lessons[0]?.id || '');
  const [topic, setTopic] = useState(selectedChapter.lessons[0]?.topics[0] || '');

  const [questionCount, setQuestionCount] = useState(5);
  const [selectedTypes, setSelectedTypes] = useState<QuestionType[]>(['multiple_choice', 'true_false', 'short_answer']);
  const [selectedLevels, setSelectedLevels] = useState<CognitiveLevel[]>(['nhan_biet', 'thong_hieu', 'van_dung']);
  const [naturalPrompt, setNaturalPrompt] = useState('');

  const [generating, setGenerating] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<Omit<Question, 'id'>[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  const toggleType = (t: QuestionType) => {
    if (selectedTypes.includes(t)) {
      if (selectedTypes.length > 1) setSelectedTypes(selectedTypes.filter(i => i !== t));
    } else {
      setSelectedTypes([...selectedTypes, t]);
    }
  };

  const toggleLevel = (l: CognitiveLevel) => {
    if (selectedLevels.includes(l)) {
      if (selectedLevels.length > 1) setSelectedLevels(selectedLevels.filter(i => i !== l));
    } else {
      setSelectedLevels([...selectedLevels, l]);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setSaveSuccessMsg(null);
    try {
      const selectedLesson = selectedChapter.lessons.find(l => l.id === lessonId);
      const results = await generateQuestionsWithAI(
        {
          chapterId,
          chapterTitle: CANONICAL_CHAPTER_NAMES[chapterId] || selectedChapter.title,
          lessonId,
          lessonTitle: selectedLesson?.title,
          topic,
          questionCount,
          types: selectedTypes,
          levels: selectedLevels,
          customPrompt: naturalPrompt
        },
        user?.email || 'muoint@fpt.edu.vn'
      );
      
      // Ensure all results have proper status=DRAFT, source=AI_GENERATED
      const normalizedResults = results.map(r => ({
        ...r,
        grade: 10,
        chapterId,
        chapterTitle: CANONICAL_CHAPTER_NAMES[chapterId] || selectedChapter.title,
        status: 'DRAFT' as const,
        aiGenerated: true,
        source: 'AI_GENERATED' as const
      }));

      setGeneratedQuestions(normalizedResults);
      // Pre-select all for teacher review
      setSelectedIndices(normalizedResults.map((_, i) => i));
    } catch (e) {
      console.error("AI Generation Error:", e);
      alert("Có lỗi khi tạo câu hỏi với AI. Vui lòng kiểm tra lại kết nối mạng hoặc thử lại.");
    } finally {
      setGenerating(false);
    }
  };

  const toggleSelectIndex = (index: number) => {
    if (selectedIndices.includes(index)) {
      setSelectedIndices(selectedIndices.filter(i => i !== index));
    } else {
      setSelectedIndices([...selectedIndices, index]);
    }
  };

  const handleSaveQuestions = async (targetStatus: 'DRAFT' | 'APPROVED') => {
    if (selectedIndices.length === 0) {
      alert("Vui lòng chọn ít nhất một câu hỏi để lưu vào Ngân hàng");
      return;
    }

    setSaving(true);
    const toSave = generatedQuestions
      .filter((_, idx) => selectedIndices.includes(idx))
      .map(q => ({
        ...q,
        status: targetStatus,
        aiGenerated: true,
        source: 'AI_GENERATED' as const,
        createdBy: user?.uid || 'system',
        creatorEmail: user?.email || '',
        createdAt: new Date().toISOString()
      }));

    try {
      await questionService.bulkCreateQuestions(toSave);
      setSaveSuccessMsg(
        targetStatus === 'APPROVED' 
          ? `Đã duyệt và lưu ${toSave.length} câu hỏi vào Ngân hàng!` 
          : `Đã lưu ${toSave.length} câu hỏi ở trạng thái Chờ duyệt!`
      );

      setTimeout(() => {
        onNavigate('question_bank', { initialChapterId: chapterId });
      }, 1200);
    } catch (e) {
      console.error(e);
      alert("Lỗi khi lưu câu hỏi vào hệ thống");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-12" id="ai-generator-container">
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('question_bank', { initialChapterId: chapterId })}
            className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">AI Trợ lý Tạo câu hỏi Hóa 10</h1>
              <span className="px-2.5 py-0.5 bg-purple-100 text-purple-800 text-[10px] font-black uppercase rounded-full border border-purple-200">
                Gemini 2.5 Flash
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Sinh câu hỏi chuẩn theo 7 chương GDPT 2018, đa dạng 4 mức độ nhận thức và các dạng bài thi mới
            </p>
          </div>
        </div>
      </div>

      {saveSuccessMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800 text-sm font-semibold animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Configuration Form */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs space-y-6">
        {/* Step 1: Curriculum Target */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
            <span>1. Chọn Chương & Chủ đề Hóa 10</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Chương học *</label>
              <select
                value={chapterId}
                onChange={(e) => {
                  setChapterId(e.target.value);
                  const ch = CHEMISTRY_10_CURRICULUM.find(c => c.id === e.target.value);
                  if (ch && ch.lessons.length > 0) {
                    setLessonId(ch.lessons[0].id);
                    setTopic(ch.lessons[0].topics[0] || '');
                  }
                }}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-800 focus:ring-2 focus:ring-purple-500"
              >
                {CHEMISTRY_10_CURRICULUM.map((ch, idx) => (
                  <option key={ch.id} value={ch.id}>
                    CHƯƠNG {idx + 1}. {ch.title.replace(/^Chương\s*\d+[:.]?\s*/i, '')}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Bài học</label>
              <select
                value={lessonId}
                onChange={(e) => {
                  setLessonId(e.target.value);
                  const l = selectedChapter.lessons.find(item => item.id === e.target.value);
                  if (l && l.topics.length > 0) setTopic(l.topics[0]);
                }}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:ring-2 focus:ring-purple-500"
              >
                {selectedChapter.lessons.map(l => (
                  <option key={l.id} value={l.id}>{l.title}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Chủ đề kiến thức</label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="VD: Cấu hình electron, Nhiệt phản ứng..."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
        </div>

        {/* Step 2: Levels & Types */}
        <div className="pt-4 border-t border-slate-100 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            2. Cấu hình mức độ & Dạng câu hỏi
          </h2>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              Mức độ nhận thức cần sinh (Chọn 1 hoặc nhiều):
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'nhan_biet', label: '1. Nhận biết' },
                { id: 'thong_hieu', label: '2. Thông hiểu' },
                { id: 'van_dung', label: '3. Vận dụng' },
                { id: 'van_dung_cao', label: '4. Vận dụng cao' },
              ].map(l => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => toggleLevel(l.id as CognitiveLevel)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                    selectedLevels.includes(l.id as CognitiveLevel)
                      ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              Dạng câu hỏi cần sinh (Chọn 1 hoặc nhiều):
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'multiple_choice', label: 'Trắc nghiệm 4 lựa chọn' },
                { id: 'true_false', label: 'Đúng / Sai 4 ý' },
                { id: 'short_answer', label: 'Trả lời ngắn' },
                { id: 'calculation', label: 'Bài toán tính toán' },
                { id: 'equation_balance', label: 'Cân bằng PTHH' },
                { id: 'identification', label: 'Nhận biết chất' },
              ].map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => toggleType(t.id as QuestionType)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                    selectedTypes.includes(t.id as QuestionType)
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Số lượng câu cần tạo</label>
              <select
                value={questionCount}
                onChange={(e) => setQuestionCount(Number(e.target.value))}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-800 focus:ring-2 focus:ring-purple-500"
              >
                <option value={3}>3 câu hỏi nhanh</option>
                <option value={5}>5 câu hỏi tiêu chuẩn</option>
                <option value={10}>10 câu hỏi tổng hợp</option>
                <option value={15}>15 câu hỏi trọn vẹn</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Yêu cầu bổ sung cho AI (Tùy chọn)</label>
              <input
                type="text"
                value={naturalPrompt}
                onChange={(e) => setNaturalPrompt(e.target.value)}
                placeholder="VD: Tập trung vào phản ứng oxi hóa khử có môi trường axit..."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
        </div>

        {/* Generate Button */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            * Câu hỏi AI sinh ra sẽ được giáo viên duyệt trước khi đưa vào ngân hàng chính thức
          </span>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-full text-xs sm:text-sm font-bold flex items-center gap-2 shadow-lg shadow-purple-600/25 disabled:opacity-50 transition-all uppercase tracking-wide"
          >
            {generating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>AI đang phân tích & sinh câu hỏi...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Bắt đầu Sinh {questionCount} câu hỏi AI</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Generated Questions Review Section */}
      {generatedQuestions.length > 0 && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs space-y-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900">
                  Kết quả AI: {generatedQuestions.length} câu hỏi đã tạo
                </h3>
                <span className="px-2.5 py-0.5 bg-purple-100 text-purple-800 text-xs font-bold rounded-full">
                  Đã chọn {selectedIndices.length}/{generatedQuestions.length}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Kiểm tra nội dung câu hỏi, phương án và lời giải chi tiết trước khi lưu vào ngân hàng
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (selectedIndices.length === generatedQuestions.length) {
                    setSelectedIndices([]);
                  } else {
                    setSelectedIndices(generatedQuestions.map((_, i) => i));
                  }
                }}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors"
              >
                {selectedIndices.length === generatedQuestions.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
              </button>
            </div>
          </div>

          {/* List of generated questions */}
          <div className="space-y-4">
            {generatedQuestions.map((q, idx) => {
              const isSelected = selectedIndices.includes(idx);

              return (
                <div
                  key={idx}
                  className={`p-5 rounded-2xl border transition-all ${
                    isSelected ? 'border-purple-300 bg-purple-50/20 shadow-xs' : 'border-slate-200 bg-slate-50/50 opacity-70'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-100 text-xs">
                    <div className="flex items-center gap-2 flex-wrap">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectIndex(idx)}
                        className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                      />
                      <span className="font-bold text-slate-900">Câu #{idx + 1}</span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-purple-100 text-purple-800">
                        {q.level}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                        {q.type}
                      </span>
                    </div>

                    <span className="text-[11px] text-slate-400 font-medium">{q.topic}</span>
                  </div>

                  <div className="text-slate-900 text-sm font-medium leading-relaxed mb-3 whitespace-pre-line">
                    {q.content}
                  </div>

                  {q.dataGiven && (
                    <div className="p-2.5 bg-amber-50 rounded-lg text-xs text-amber-800 font-mono mb-3">
                      <strong>Dữ kiện:</strong> {q.dataGiven}
                    </div>
                  )}

                  {q.options && q.options.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                      {q.options.map((opt) => (
                        <div
                          key={opt.id}
                          className={`p-2 rounded-xl border text-xs flex items-start gap-2 ${
                            q.correctAnswer === opt.id
                              ? 'bg-emerald-50 border-emerald-300 font-bold text-emerald-900'
                              : 'bg-white border-slate-200 text-slate-700'
                          }`}
                        >
                          <span className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center font-bold text-xs shrink-0">
                            {opt.id}
                          </span>
                          <span>{opt.text}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="p-2.5 bg-emerald-50 rounded-xl text-xs text-emerald-900 mb-2">
                    <strong>Đáp án đúng:</strong> {Array.isArray(q.correctAnswer) ? q.correctAnswer.join(', ') : String(q.correctAnswer)}
                  </div>

                  {q.explanation && (
                    <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-600 leading-relaxed border border-slate-200">
                      <strong className="block text-slate-800 mb-0.5">Lời giải:</strong>
                      {q.explanation}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Action Bar for saving generated questions */}
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-xs text-slate-500">
              Đã chọn <strong className="text-slate-900">{selectedIndices.length}</strong> câu hỏi để đưa vào Ngân hàng
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleSaveQuestions('DRAFT')}
                disabled={saving || selectedIndices.length === 0}
                className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-full text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all disabled:opacity-50"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Lưu Chờ duyệt ({selectedIndices.length} câu)</span>
              </button>

              <button
                type="button"
                onClick={() => handleSaveQuestions('APPROVED')}
                disabled={saving || selectedIndices.length === 0}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50 uppercase tracking-wide"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Duyệt ngay vào Ngân hàng ({selectedIndices.length} câu)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
