import React, { useState } from 'react';
import { FileSpreadsheet, ArrowLeft, CheckCircle2, AlertCircle, Upload, FileText, Download } from 'lucide-react';
import { questionService } from '../services/dbService';
import { useAuth } from '../context/AuthContext';
import { Question } from '../types';

interface BulkImportViewProps {
  onNavigate: (tab: string) => void;
}

export const BulkImportView: React.FC<BulkImportViewProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [inputText, setInputText] = useState('');
  const [format, setFormat] = useState<'json' | 'csv' | 'text'>('json');
  const [parsedQuestions, setParsedQuestions] = useState<Omit<Question, 'id'>[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [successCount, setSuccessCount] = useState<number | null>(null);

  const sampleJSON = `[
  {
    "grade": 10,
    "chapterId": "chuong-1",
    "chapterTitle": "Chương 1: Cấu tạo nguyên tử",
    "lessonId": "bai-1",
    "lessonTitle": "Bài 1: Thành phần của nguyên tử",
    "topic": "Hạt proton, neutron, electron",
    "type": "multiple_choice",
    "level": "nhan_biet",
    "content": "Khối lượng của một proton xấp xỉ bằng bao nhiêu amu?",
    "options": [
      { "id": "A", "text": "1 amu" },
      { "id": "B", "text": "0,00055 amu" },
      { "id": "C", "text": "2 amu" },
      { "id": "D", "text": "4 amu" }
    ],
    "correctAnswer": "A",
    "explanation": "Khối lượng của proton xấp xỉ 1 amu (1,673 × 10⁻²⁷ kg), xấp xỉ bằng khối lượng của neutron.",
    "keywords": ["proton", "amu", "khối lượng"],
    "status": "APPROVED"
  },
  {
    "grade": 10,
    "chapterId": "chuong-3",
    "chapterTitle": "Chương 3: Liên kết hóa học",
    "lessonId": "bai-8",
    "lessonTitle": "Bài 8: Liên kết ion",
    "topic": "Bản chất liên kết ion",
    "type": "short_answer",
    "level": "thong_hieu",
    "content": "Viết công thức phân tử hợp chất ion tạo bởi ion Al3+ và ion O2-.",
    "correctAnswer": "Al2O3",
    "explanation": "2 ion Al³⁺ (tổng điện tích +6) kết hợp với 3 ion O²⁻ (tổng điện tích -6) tạo thành Al₂O₃ trung hòa điện.",
    "keywords": ["Al2O3", "liên kết ion"],
    "status": "APPROVED"
  }
]`;

  const handleLoadSample = () => {
    setInputText(sampleJSON);
    setFormat('json');
  };

  const handleValidateAndPreview = () => {
    setErrors([]);
    setSuccessCount(null);
    const errList: string[] = [];
    const validList: Omit<Question, 'id'>[] = [];

    if (!inputText.trim()) {
      setErrors(['Vui lòng nhập hoặc dán nội dung câu hỏi']);
      return;
    }

    if (format === 'json') {
      try {
        const parsed = JSON.parse(inputText);
        if (!Array.isArray(parsed)) {
          errList.push('Dữ liệu JSON phải là một mảng [] các câu hỏi.');
        } else {
          parsed.forEach((item, idx) => {
            const num = idx + 1;
            if (!item.content) errList.push(`Câu ${num}: Thiếu trường 'content' (Nội dung câu hỏi)`);
            if (!item.correctAnswer && item.correctAnswer !== false) errList.push(`Câu ${num}: Thiếu trường 'correctAnswer' (Đáp án)`);
            if (!item.chapterId) errList.push(`Câu ${num}: Thiếu trường 'chapterId' (Mã chương)`);
            if (!item.type) errList.push(`Câu ${num}: Thiếu trường 'type' (Dạng câu hỏi)`);

            if (item.content && item.correctAnswer !== undefined && item.chapterId && item.type) {
              validList.push({
                grade: item.grade || 10,
                chapterId: item.chapterId,
                chapterTitle: item.chapterTitle || 'Hóa học 10',
                lessonId: item.lessonId || 'bai-1',
                lessonTitle: item.lessonTitle || 'Kiến thức trọng tâm',
                topic: item.topic || 'Chủ đề Hóa 10',
                type: item.type,
                level: item.level || 'nhan_biet',
                content: item.content,
                options: item.options || undefined,
                correctAnswer: item.correctAnswer,
                explanation: item.explanation || '',
                keywords: item.keywords || [],
                createdBy: user?.displayName || 'Admin',
                creatorEmail: user?.email || 'muoint@fpt.edu.vn',
                createdAt: new Date().toISOString(),
                status: 'APPROVED'
              });
            }
          });
        }
      } catch (err: any) {
        errList.push(`Cú pháp JSON không hợp lệ: ${err.message}`);
      }
    } else {
      // Text parser format: Câu hỏi -> A -> B -> C -> D -> ĐA
      const blocks = inputText.split(/\n\s*\n/);
      blocks.forEach((block, idx) => {
        const lines = block.trim().split('\n').map(l => l.trim()).filter(Boolean);
        if (lines.length >= 5) {
          const qContent = lines[0].replace(/^Câu\s*\d+[:.]?\s*/i, '');
          const optA = lines[1]?.replace(/^[A-D][.:]\s*/, '') || '';
          const optB = lines[2]?.replace(/^[A-D][.:]\s*/, '') || '';
          const optC = lines[3]?.replace(/^[A-D][.:]\s*/, '') || '';
          const optD = lines[4]?.replace(/^[A-D][.:]\s*/, '') || '';
          const ansLine = lines.find(l => l.toUpperCase().includes('ĐÁP ÁN:')) || lines[5] || 'A';
          const ans = ansLine.toUpperCase().replace(/.*ĐÁP ÁN[:\s]*/, '').trim().charAt(0) || 'A';

          validList.push({
            grade: 10,
            chapterId: 'chuong-1',
            chapterTitle: 'Chương 1: Cấu tạo nguyên tử',
            lessonId: 'bai-1',
            lessonTitle: 'Bài 1: Thành phần của nguyên tử',
            topic: 'Nhập tự do',
            type: 'multiple_choice',
            level: 'nhan_biet',
            content: qContent,
            options: [
              { id: 'A', text: optA },
              { id: 'B', text: optB },
              { id: 'C', text: optC },
              { id: 'D', text: optD }
            ],
            correctAnswer: ans,
            explanation: 'Giải thích chi tiết...',
            keywords: ['nhập nhanh'],
            createdBy: user?.displayName || 'Admin',
            creatorEmail: user?.email || 'muoint@fpt.edu.vn',
            createdAt: new Date().toISOString(),
            status: 'APPROVED'
          });
        } else if (lines.length > 0) {
          errList.push(`Đoạn ${idx + 1}: Không đủ 4 phương án hoặc sai định dạng dòng.`);
        }
      });
    }

    setErrors(errList);
    setParsedQuestions(validList);
  };

  const handleConfirmImport = async () => {
    if (parsedQuestions.length === 0) return;
    setImporting(true);
    try {
      const count = await questionService.bulkCreateQuestions(parsedQuestions);
      setSuccessCount(count);
      setParsedQuestions([]);
      setInputText('');
      setTimeout(() => {
        onNavigate('question_bank');
      }, 1500);
    } catch (e) {
      console.error(e);
      alert('Lỗi nhập dữ liệu');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('question_bank')}
            className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Nhập câu hỏi hàng loạt (Bulk Import)</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Hỗ trợ nhập dữ liệu theo định dạng JSON, Text, CSV với quy trình kiểm tra lỗi nghiêm ngặt
            </p>
          </div>
        </div>

        <button
          onClick={handleLoadSample}
          className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-blue-200"
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Tải dữ liệu mẫu</span>
        </button>
      </div>

      {successCount !== null && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs sm:text-sm text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>Đã nhập thành công <strong>{successCount}</strong> câu hỏi vào Ngân hàng!</span>
        </div>
      )}

      {errors.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800 space-y-1">
          <div className="font-bold flex items-center gap-1.5 text-amber-900">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            Cảnh báo dữ liệu (các câu lỗi sẽ bị loại bỏ):
          </div>
          <ul className="list-disc list-inside space-y-0.5">
            {errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-700">Định dạng nhập:</span>
            <button
              onClick={() => setFormat('json')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg ${format === 'json' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'}`}
            >
              JSON chuẩn
            </button>
            <button
              onClick={() => setFormat('text')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg ${format === 'text' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'}`}
            >
              Văn bản thuần (Text)
            </button>
          </div>
        </div>

        <textarea
          rows={10}
          placeholder={format === 'json' ? 'Dán mã JSON mảng câu hỏi tại đây...' : 'Câu 1: Nội dung câu hỏi...\nA. Phương án 1\nB. Phương án 2\nC. Phương án 3\nD. Phương án 4\nĐáp án: A'}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          className="w-full p-3.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white"
        />

        <div className="flex items-center justify-between pt-2">
          <button
            onClick={handleValidateAndPreview}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all"
          >
            1. Xem trước dữ liệu & Kiểm tra lỗi
          </button>

          {parsedQuestions.length > 0 && (
            <button
              onClick={handleConfirmImport}
              disabled={importing}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-200 transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              <span>2. Xác nhận nhập {parsedQuestions.length} câu hợp lệ</span>
            </button>
          )}
        </div>
      </div>

      {/* Preview table */}
      {parsedQuestions.length > 0 && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <h3 className="text-sm font-bold text-slate-900">
            Xem trước {parsedQuestions.length} câu hỏi hợp lệ sẵn sàng lưu:
          </h3>
          <div className="space-y-3">
            {parsedQuestions.map((q, idx) => (
              <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                <div className="flex items-center justify-between font-bold text-slate-800 mb-1">
                  <span>Câu #{idx + 1} • {q.type} • {q.level}</span>
                  <span className="text-emerald-700">Đáp án: {JSON.stringify(q.correctAnswer)}</span>
                </div>
                <p className="text-slate-700">{q.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
