import React, { useState } from 'react';
import { Save, Sparkles, ArrowLeft, Plus, Trash2, CheckCircle2, AlertCircle, HelpCircle } from 'lucide-react';
import { CHEMISTRY_10_CURRICULUM, CANONICAL_CHAPTER_NAMES, normalizeChapterId } from '../data/curriculum';
import { questionService } from '../services/dbService';
import { useAuth } from '../context/AuthContext';
import { Question, QuestionType, CognitiveLevel } from '../types';

interface AddQuestionViewProps {
  onNavigate: (tab: string, param?: any) => void;
  editQuestion?: Question | null;
  preselectedChapterId?: string;
}

export const AddQuestionView: React.FC<AddQuestionViewProps> = ({ 
  onNavigate, 
  editQuestion,
  preselectedChapterId 
}) => {
  const { user } = useAuth();
  
  const initialChId = editQuestion?.chapterId 
    ? normalizeChapterId(editQuestion.chapterId) 
    : (preselectedChapterId ? normalizeChapterId(preselectedChapterId) : 'chuong-1');

  const [chapterId, setChapterId] = useState(
    CHEMISTRY_10_CURRICULUM.some(c => c.id === initialChId) ? initialChId : 'chuong-1'
  );
  const selectedChapter = CHEMISTRY_10_CURRICULUM.find(c => c.id === chapterId) || CHEMISTRY_10_CURRICULUM[0];
  
  const [lessonId, setLessonId] = useState(editQuestion?.lessonId || selectedChapter.lessons[0]?.id || '');
  const [topic, setTopic] = useState(editQuestion?.topic || selectedChapter.lessons[0]?.topics[0] || '');
  const [type, setType] = useState<QuestionType>(editQuestion?.type || 'multiple_choice');
  const [level, setLevel] = useState<CognitiveLevel>(editQuestion?.level || 'nhan_biet');
  const [status, setStatus] = useState<'APPROVED' | 'DRAFT'>(
    (editQuestion?.status === 'DRAFT' || editQuestion?.status === 'PENDING') ? 'DRAFT' : 'APPROVED'
  );
  
  const [content, setContent] = useState(editQuestion?.content || '');
  const [dataGiven, setDataGiven] = useState(editQuestion?.dataGiven || '');
  
  // Options for multiple_choice & true_false
  const [optA, setOptA] = useState(editQuestion?.options?.find(o => o.id === 'A' || o.id === 'a')?.text || '');
  const [optB, setOptB] = useState(editQuestion?.options?.find(o => o.id === 'B' || o.id === 'b')?.text || '');
  const [optC, setOptC] = useState(editQuestion?.options?.find(o => o.id === 'C' || o.id === 'c')?.text || '');
  const [optD, setOptD] = useState(editQuestion?.options?.find(o => o.id === 'D' || o.id === 'd')?.text || '');
  
  // Correct answers
  const [correctMultiple, setCorrectMultiple] = useState<string>(
    typeof editQuestion?.correctAnswer === 'string' ? editQuestion.correctAnswer : 'A'
  );
  
  const [tfA, setTfA] = useState<boolean>(
    Array.isArray(editQuestion?.correctAnswer) ? Boolean(editQuestion.correctAnswer[0]) : true
  );
  const [tfB, setTfB] = useState<boolean>(
    Array.isArray(editQuestion?.correctAnswer) ? Boolean(editQuestion.correctAnswer[1]) : false
  );
  const [tfC, setTfC] = useState<boolean>(
    Array.isArray(editQuestion?.correctAnswer) ? Boolean(editQuestion.correctAnswer[2]) : true
  );
  const [tfD, setTfD] = useState<boolean>(
    Array.isArray(editQuestion?.correctAnswer) ? Boolean(editQuestion.correctAnswer[3]) : false
  );

  const [shortAnswerValue, setShortAnswerValue] = useState(
    typeof editQuestion?.correctAnswer === 'string' ? editQuestion.correctAnswer : ''
  );

  const [explanation, setExplanation] = useState(editQuestion?.explanation || '');
  const [keywordsText, setKeywordsText] = useState(editQuestion?.keywords?.join(', ') || '');
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleChapterChange = (newChId: string) => {
    setChapterId(newChId);
    const ch = CHEMISTRY_10_CURRICULUM.find(c => c.id === newChId);
    if (ch && ch.lessons.length > 0) {
      setLessonId(ch.lessons[0].id);
      setTopic(ch.lessons[0].topics[0] || '');
    }
  };

  const handleSave = async (saveAndNext = false) => {
    if (!content.trim()) {
      alert('Vui lòng nhập nội dung câu hỏi!');
      return;
    }

    setSaving(true);
    setSuccessMessage(null);

    const selectedLesson = selectedChapter.lessons.find(l => l.id === lessonId);
    const keywords = keywordsText.split(',').map(k => k.trim()).filter(Boolean);

    let options = undefined;
    let correctAnswer: any = correctMultiple;

    if (type === 'multiple_choice') {
      options = [
        { id: 'A', text: optA || 'Phương án A' },
        { id: 'B', text: optB || 'Phương án B' },
        { id: 'C', text: optC || 'Phương án C' },
        { id: 'D', text: optD || 'Phương án D' },
      ];
      correctAnswer = correctMultiple;
    } else if (type === 'true_false') {
      options = [
        { id: 'a', text: optA || 'Phát biểu a' },
        { id: 'b', text: optB || 'Phát biểu b' },
        { id: 'c', text: optC || 'Phát biểu c' },
        { id: 'd', text: optD || 'Phát biểu d' },
      ];
      correctAnswer = [tfA, tfB, tfC, tfD];
    } else {
      correctAnswer = shortAnswerValue;
    }

    const questionPayload: Omit<Question, 'id'> = {
      grade: 10,
      chapterId,
      chapterTitle: CANONICAL_CHAPTER_NAMES[chapterId] || selectedChapter.title,
      lessonId,
      lessonTitle: selectedLesson ? selectedLesson.title : 'Tổng hợp',
      topic: topic || 'Kiến thức trọng tâm',
      type,
      level,
      content,
      dataGiven: dataGiven || undefined,
      options,
      correctAnswer,
      explanation,
      keywords,
      createdBy: user?.uid || 'system',
      creatorEmail: user?.email || '',
      createdAt: editQuestion?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: status,
      source: editQuestion?.source || 'MANUAL',
      aiGenerated: editQuestion?.aiGenerated || false,
    };

    try {
      if (editQuestion?.id) {
        await questionService.updateQuestion(editQuestion.id, questionPayload);
        setSuccessMessage('Đã cập nhật câu hỏi thành công!');
      } else {
        await questionService.createQuestion(questionPayload);
        setSuccessMessage('Đã lưu câu hỏi mới vào ngân hàng thành công!');
      }

      if (saveAndNext) {
        setContent('');
        setOptA('');
        setOptB('');
        setOptC('');
        setOptD('');
        setShortAnswerValue('');
        setExplanation('');
        setKeywordsText('');
      } else {
        setTimeout(() => {
          onNavigate('question_bank', { initialChapterId: chapterId });
        }, 1000);
      }
    } catch (e) {
      console.error(e);
      alert('Có lỗi xảy ra khi lưu câu hỏi');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-12" id="add-question-container">
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
            <h1 className="text-xl font-bold text-slate-900">
              {editQuestion ? 'Chỉnh sửa câu hỏi' : 'Thêm câu hỏi mới vào Ngân hàng'}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Tổ chức chính xác theo 7 chương chuẩn chương trình Giáo dục phổ thông 2018
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleSave(false)}
            disabled={saving}
            className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-full text-xs font-bold flex items-center gap-2 shadow-md shadow-cyan-600/20 disabled:opacity-50 transition-all uppercase tracking-wide"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Đang lưu...' : 'Lưu vào Ngân hàng'}</span>
          </button>
        </div>
      </div>

      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800 text-sm font-semibold animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Form Content */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs space-y-6">
        {/* Step 1: Chapter & Topic Selection */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
            <span>1. Định vị kiến thức (7 Chương Hóa 10)</span>
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Chapter Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Chương học <span className="text-red-500">*</span>
              </label>
              <select
                value={chapterId}
                onChange={(e) => handleChapterChange(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                {CHEMISTRY_10_CURRICULUM.map((ch, idx) => (
                  <option key={ch.id} value={ch.id}>
                    CHƯƠNG {idx + 1}. {ch.title.replace(/^Chương\s*\d+[:.]?\s*/i, '')}
                  </option>
                ))}
              </select>
            </div>

            {/* Lesson Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Bài học
              </label>
              <select
                value={lessonId}
                onChange={(e) => {
                  setLessonId(e.target.value);
                  const l = selectedChapter.lessons.find(item => item.id === e.target.value);
                  if (l && l.topics.length > 0) setTopic(l.topics[0]);
                }}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                {selectedChapter.lessons.map(l => (
                  <option key={l.id} value={l.id}>{l.title}</option>
                ))}
              </select>
            </div>

            {/* Topic Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Chủ đề / Đơn vị kiến thức
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="VD: Cấu hình electron nguyên tử, Bán kính nguyên tử..."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            {/* Status Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Trạng thái duyệt
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStatus('APPROVED')}
                  className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                    status === 'APPROVED'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Đã duyệt (Sẵn sàng tạo đề)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStatus('DRAFT')}
                  className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                    status === 'DRAFT'
                      ? 'bg-amber-50 text-amber-800 border-amber-300 shadow-xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}
                >
                  <span>Chờ duyệt / Nháp</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Step 2: Question Type & Level */}
        <div className="pt-4 border-t border-slate-100">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
            2. Phân loại & Mức độ nhận thức
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Cognitive Level */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Mức độ nhận thức (4 cấp độ GDPT 2018)
              </label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value as CognitiveLevel)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="nhan_biet">1. Nhận biết (Biết các khái niệm cơ bản)</option>
                <option value="thong_hieu">2. Thông hiểu (Hiểu bản chất và giải thích)</option>
                <option value="van_dung">3. Vận dụng (Tính toán & áp dụng tình huống quen)</option>
                <option value="van_dung_cao">4. Vận dụng cao (Tích hợp thực tiễn, phân hóa)</option>
              </select>
            </div>

            {/* Question Type */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Dạng câu hỏi
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as QuestionType)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="multiple_choice">Trắc nghiệm 4 lựa chọn (Chọn 1 đúng)</option>
                <option value="true_false">Đúng / Sai 4 ý (Định dạng đề mới Bộ GD&ĐT)</option>
                <option value="short_answer">Trả lời ngắn (Điền số / công thức)</option>
                <option value="calculation">Bài toán tính toán Hóa học</option>
                <option value="equation_balance">Cân bằng phương trình Hóa học</option>
                <option value="identification">Nhận biết chất & Thuốc thử</option>
                <option value="experiment">Thí nghiệm & Hiện tượng thực tế</option>
                <option value="essay">Tự luận giải thích</option>
              </select>
            </div>
          </div>
        </div>

        {/* Step 3: Question Content & Data Given */}
        <div className="pt-4 border-t border-slate-100 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
            3. Nội dung câu hỏi & Dữ kiện
          </h2>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Nội dung câu hỏi <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Nhập nội dung đề bài (Hỗ trợ công thức hóa học: H2SO4, Fe2+, ΔrH°298, etc.)..."
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-medium leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Dữ kiện cho trước (Tùy chọn)
            </label>
            <input
              type="text"
              value={dataGiven}
              onChange={(e) => setDataGiven(e.target.value)}
              placeholder="VD: Cho nguyên tử khối: H=1, O=16, S=32, Fe=56... hoặc điều kiện chuẩn 25°C, 1 bar"
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
        </div>

        {/* Step 4: Options & Correct Answer depending on type */}
        <div className="pt-4 border-t border-slate-100">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
            4. Phương án lựa chọn & Đáp án đúng
          </h2>

          {type === 'multiple_choice' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500 mb-2">
                Nhập 4 phương án và tích chọn phương án đúng:
              </p>

              <div className="space-y-2.5">
                {[
                  { key: 'A', val: optA, set: setOptA },
                  { key: 'B', val: optB, set: setOptB },
                  { key: 'C', val: optC, set: setOptC },
                  { key: 'D', val: optD, set: setOptD },
                ].map(({ key, val, set }) => (
                  <div key={key} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCorrectMultiple(key)}
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 transition-all ${
                        correctMultiple === key
                          ? 'bg-emerald-600 text-white ring-2 ring-emerald-600 ring-offset-2'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                      title={correctMultiple === key ? 'Đáp án đúng' : 'Bấm để chọn làm đáp án đúng'}
                    >
                      {key}
                    </button>
                    <input
                      type="text"
                      value={val}
                      onChange={(e) => set(e.target.value)}
                      placeholder={`Nội dung phương án ${key}...`}
                      className={`flex-1 p-2.5 bg-slate-50 border rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 ${
                        correctMultiple === key ? 'border-emerald-400 bg-emerald-50/20' : 'border-slate-200'
                      }`}
                    />
                    {correctMultiple === key && (
                      <span className="text-[11px] font-bold text-emerald-700 px-2 py-1 bg-emerald-50 rounded-lg shrink-0">
                        ĐÁP ÁN ĐÚNG
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {type === 'true_false' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500 mb-2">
                Nhập 4 phát biểu (a, b, c, d) và chọn tính Đúng/Sai cho từng ý:
              </p>

              <div className="space-y-2.5">
                {[
                  { key: 'a', val: optA, set: setOptA, tf: tfA, setTf: setTfA },
                  { key: 'b', val: optB, set: setOptB, tf: tfB, setTf: setTfB },
                  { key: 'c', val: optC, set: setOptC, tf: tfC, setTf: setTfC },
                  { key: 'd', val: optD, set: setOptD, tf: tfD, setTf: setTfD },
                ].map(({ key, val, set, tf, setTf }) => (
                  <div key={key} className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-700 shrink-0 uppercase">
                      {key}
                    </span>
                    <input
                      type="text"
                      value={val}
                      onChange={(e) => set(e.target.value)}
                      placeholder={`Nội dung phát biểu ${key}...`}
                      className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setTf(true)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          tf
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        ĐÚNG
                      </button>
                      <button
                        type="button"
                        onClick={() => setTf(false)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          !tf
                            ? 'bg-rose-600 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        SAI
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(type === 'short_answer' || type === 'calculation' || type === 'equation_balance' || type === 'identification' || type === 'essay') && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Đáp án chuẩn <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={shortAnswerValue}
                onChange={(e) => setShortAnswerValue(e.target.value)}
                placeholder="VD: 1.25 hoặc AgNO3 hoặc Fe + 4HNO3 -> Fe(NO3)3 + NO + 2H2O"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono"
              />
            </div>
          )}
        </div>

        {/* Step 5: Explanation & Keywords */}
        <div className="pt-4 border-t border-slate-100 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
            5. Lời giải chi tiết & Từ khóa tìm kiếm
          </h2>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Lời giải chi tiết (Hướng dẫn giải thích cho học sinh)
            </label>
            <textarea
              rows={4}
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="Giải thích từng bước, quá trình oxi hóa khử, công thức tính toán..."
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-medium leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Từ khóa tìm kiếm (Ngăn cách bởi dấu phẩy)
            </label>
            <input
              type="text"
              value={keywordsText}
              onChange={(e) => setKeywordsText(e.target.value)}
              placeholder="VD: halogen, clo, phản ứng tỏa nhiệt, số oxi hóa..."
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => onNavigate('question_bank', { initialChapterId: chapterId })}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full text-xs font-bold transition-colors"
          >
            ← Quay lại Ngân hàng câu hỏi
          </button>

          <div className="flex items-center gap-2">
            {!editQuestion && (
              <button
                type="button"
                onClick={() => handleSave(true)}
                disabled={saving}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-full text-xs font-bold transition-colors disabled:opacity-50"
              >
                Lưu & Tiếp tục thêm câu khác
              </button>
            )}

            <button
              type="button"
              onClick={() => handleSave(false)}
              disabled={saving}
              className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-full text-xs font-bold flex items-center gap-2 shadow-md shadow-cyan-600/20 disabled:opacity-50 uppercase tracking-wide"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Đang lưu...' : 'Lưu và Đóng'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
