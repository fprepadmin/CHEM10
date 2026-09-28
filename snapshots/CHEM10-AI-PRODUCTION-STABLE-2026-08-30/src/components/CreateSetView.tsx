import React, { useState, useEffect, useMemo } from 'react';
import { BookOpen, Sparkles, CheckCircle2, ArrowLeft, Save, Plus, Trash2, Filter, Search, Check } from 'lucide-react';
import { CHEMISTRY_10_CURRICULUM, CANONICAL_CHAPTER_NAMES, normalizeChapterId, getChapterTitle } from '../data/curriculum';
import { questionService, questionSetService } from '../services/dbService';
import { useAuth } from '../context/AuthContext';
import { Question, CognitiveLevel, QuestionType } from '../types';

interface CreateSetViewProps {
  onNavigate: (tab: string, param?: any) => void;
  preselectedIds?: string[];
}

export const CreateSetView: React.FC<CreateSetViewProps> = ({ onNavigate, preselectedIds = [] }) => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [chapterId, setChapterId] = useState(CHEMISTRY_10_CURRICULUM[0].id);
  const [durationMinutes, setDurationMinutes] = useState(15);
  const [allowReviewAnswers, setAllowReviewAnswers] = useState(true);

  // Question pool & filtering
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [filterChapter, setFilterChapter] = useState<string>('ALL');
  const [filterLevel, setFilterLevel] = useState<string>('ALL');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const [selectedIds, setSelectedIds] = useState<string[]>(preselectedIds);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    questionService.getQuestions().then(res => {
      // Filter only approved questions for creating test sets
      const approved = res.filter(q => {
        const s = (q.status || 'DRAFT').toUpperCase();
        return s === 'APPROVED' || s === 'DEMO';
      });
      setAllQuestions(approved.length > 0 ? approved : res);
      if (preselectedIds.length > 0) {
        setSelectedIds(preselectedIds);
      }
      setLoading(false);
    });
  }, []);

  const filteredQuestions = useMemo(() => {
    return allQuestions.filter(q => {
      if (filterChapter !== 'ALL') {
        const norm = normalizeChapterId(q.chapterId || q.chapterTitle);
        if (norm !== filterChapter) return false;
      }
      if (filterLevel !== 'ALL' && q.level !== filterLevel) return false;
      if (filterType !== 'ALL' && q.type !== filterType) return false;
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        if (!q.content.toLowerCase().includes(term) && !q.topic?.toLowerCase().includes(term)) {
          return false;
        }
      }
      return true;
    });
  }, [allQuestions, filterChapter, filterLevel, filterType, searchTerm]);

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleSaveSet = async () => {
    if (!title.trim()) {
      alert("Vui lòng nhập tên bài ôn tập!");
      return;
    }
    if (selectedIds.length === 0) {
      alert("Vui lòng chọn ít nhất 1 câu hỏi cho bộ đề!");
      return;
    }

    setSaving(true);
    try {
      const chTitle = CANONICAL_CHAPTER_NAMES[chapterId] || 'Chương học Hóa 10';
      await questionSetService.createSet({
        title,
        description: description || `Bộ đề ôn tập kiến thức ${chTitle} môn Hóa học 10.`,
        chapterId,
        durationMinutes,
        questionIds: selectedIds,
        totalScore: 10,
        allowReviewAnswers,
        createdBy: user?.uid || 'system',
        creatorEmail: user?.email || '',
        createdAt: new Date().toISOString(),
        isPublic: true
      });

      alert("Tạo bài ôn tập thành công!");
      onNavigate('assignments_manager');
    } catch (e) {
      console.error(e);
      alert("Có lỗi khi tạo bài ôn tập");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-12" id="create-set-container">
      <div className="flex items-center justify-between bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('question_bank')}
            className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Tạo bài ôn tập mới</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Lựa chọn từ các câu hỏi đã duyệt trong 7 Chương Ngân hàng câu hỏi Hóa học 10
            </p>
          </div>
        </div>

        <button
          onClick={handleSaveSet}
          disabled={saving || selectedIds.length === 0}
          className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-full text-xs font-bold shadow-md shadow-cyan-600/20 transition-all flex items-center gap-1.5 disabled:opacity-50 uppercase tracking-wide"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Đang lưu...' : 'Xuất bản bài ôn tập'}</span>
        </button>
      </div>

      {/* Set Configuration */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1">Tên bài ôn tập / Đề thi *</label>
            <input
              type="text"
              required
              placeholder="Ví dụ: Ôn tập Chương 1: Cấu tạo nguyên tử (15 phút)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500 font-semibold text-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Chương kiến thức chính *</label>
            <select
              value={chapterId}
              onChange={(e) => setChapterId(e.target.value)}
              className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
            >
              {CHEMISTRY_10_CURRICULUM.map((c, idx) => (
                <option key={c.id} value={c.id}>CHƯƠNG {idx + 1}. {c.title.replace(/^Chương\s*\d+[:.]?\s*/i, '')}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Thời gian làm bài (phút)</label>
            <select
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
              className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
            >
              <option value={10}>10 phút</option>
              <option value={15}>15 phút</option>
              <option value={20}>20 phút</option>
              <option value={30}>30 phút</option>
              <option value={45}>45 phút (1 tiết)</option>
              <option value={90}>90 phút (Thi học kỳ)</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1">Mô tả / Ghi chú</label>
            <textarea
              rows={2}
              placeholder="Đánh giá kiến thức hạt nhân, cấu hình electron và đồng vị..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>

          <div className="sm:col-span-2 flex items-center gap-2">
            <input
              type="checkbox"
              id="allowReview"
              checked={allowReviewAnswers}
              onChange={(e) => setAllowReviewAnswers(e.target.checked)}
              className="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500 cursor-pointer"
            />
            <label htmlFor="allowReview" className="text-xs text-slate-700 font-medium cursor-pointer">
              Cho phép học sinh xem đáp án và lời giải chi tiết sau khi nộp bài
            </label>
          </div>
        </div>
      </div>

      {/* Question Selection Grid with Filters */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Chọn câu hỏi đưa vào bài (<strong className="text-cyan-600">{selectedIds.length}</strong> câu đã chọn)
            </h3>
            <p className="text-xs text-slate-500">Tích chọn các câu hỏi phù hợp từ ngân hàng đã duyệt</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const currentFilteredIds = filteredQuestions.map(q => q.id);
                const allIn = currentFilteredIds.every(id => selectedIds.includes(id));
                if (allIn) {
                  setSelectedIds(prev => prev.filter(id => !currentFilteredIds.includes(id)));
                } else {
                  setSelectedIds(prev => Array.from(new Set([...prev, ...currentFilteredIds])));
                }
              }}
              className="text-xs text-cyan-600 font-bold hover:underline"
            >
              Chọn tất cả trong danh sách lọc ({filteredQuestions.length} câu)
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
          <input
            type="text"
            placeholder="Tìm kiếm nội dung..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
          />

          <select
            value={filterChapter}
            onChange={(e) => setFilterChapter(e.target.value)}
            className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
          >
            <option value="ALL">Tất cả 7 chương</option>
            {CHEMISTRY_10_CURRICULUM.map((c, idx) => (
              <option key={c.id} value={c.id}>Chương {idx + 1}. {c.title.replace(/^Chương\s*\d+[:.]?\s*/i, '')}</option>
            ))}
          </select>

          <select
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value)}
            className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
          >
            <option value="ALL">Tất cả mức độ</option>
            <option value="nhan_biet">1. Nhận biết</option>
            <option value="thong_hieu">2. Thông hiểu</option>
            <option value="van_dung">3. Vận dụng</option>
            <option value="van_dung_cao">4. Vận dụng cao</option>
          </select>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
          >
            <option value="ALL">Tất cả dạng câu</option>
            <option value="multiple_choice">Trắc nghiệm 4 lựa chọn</option>
            <option value="true_false">Đúng / Sai 4 ý</option>
            <option value="short_answer">Trả lời ngắn</option>
            <option value="calculation">Tính toán</option>
          </select>
        </div>

        {/* Questions list */}
        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
          {filteredQuestions.map((q, idx) => {
            const isSelected = selectedIds.includes(q.id);
            return (
              <div
                key={q.id}
                onClick={() => toggleSelect(q.id)}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                  isSelected ? 'bg-cyan-50/70 border-cyan-400' : 'bg-slate-50/50 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => {}}
                  className="mt-1 w-4 h-4 rounded text-cyan-600 cursor-pointer"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 text-xs flex-wrap">
                    <span className="font-bold text-slate-800">#{idx + 1}</span>
                    <span className="px-2 py-0.5 bg-white border border-slate-200 text-slate-700 rounded text-[10px] font-semibold">
                      {getChapterTitle(q.chapterId)}
                    </span>
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px]">
                      {q.type}
                    </span>
                    <span className="px-2 py-0.5 bg-cyan-100 text-cyan-800 rounded text-[10px] font-bold uppercase">
                      {q.level}
                    </span>
                  </div>
                  <p className="text-xs text-slate-800 line-clamp-2 leading-relaxed">{q.content}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
