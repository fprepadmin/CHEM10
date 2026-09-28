import { Question, QuestionSet, QuestionType, CognitiveLevel, QuestionOption } from '../types';
import { normalizeChapterId, UNCLASSIFIED_CHAPTER_ID } from '../data/curriculum';

export interface ParsedJsonQuestionItem {
  id?: string;
  tempId: string;
  content: string;
  imageUrl?: string;
  type: QuestionType;
  level: CognitiveLevel;
  chapterId?: string;
  lessonId?: string;
  options: { id: string; text?: string; statement?: string; isCorrect?: boolean; imageUrl?: string }[];
  correctAnswer: any;
  explanation?: string;
  explanationImageUrl?: string;
  grade?: number;
  tags?: string[];
  isValid: boolean;
  validationErrors: string[];
}

export interface ParsedJsonExamResult {
  title: string;
  description?: string;
  durationMinutes: number;
  chapterId?: string;
  grade?: number;
  instructions?: string;
  passPercentage?: number;
  questions: ParsedJsonQuestionItem[];
  validationErrors: string[];
}

export interface ParsedJsonBankResult {
  chapterId?: string;
  lessonId?: string;
  title?: string;
  questions: ParsedJsonQuestionItem[];
  validationErrors: string[];
}

/**
 * Normalizes question cognitive level
 */
export function normalizeCognitiveLevel(levelStr?: any): CognitiveLevel {
  if (!levelStr) return 'nhan_biet';
  const str = String(levelStr).toLowerCase().trim().replace(/[\s_-]+/g, '');
  if (str.includes('nhanbiet') || str === 'nb' || str === 'easy' || str === '1') return 'nhan_biet';
  if (str.includes('thonghieu') || str === 'th' || str === 'medium' || str === '2') return 'thong_hieu';
  if (str.includes('vandungcao') || str === 'vdc' || str === 'expert' || str === '4') return 'van_dung_cao';
  if (str.includes('vandung') || str === 'vd' || str === 'hard' || str === '3') return 'van_dung';
  return 'nhan_biet';
}

/**
 * Normalizes question type
 */
export function normalizeQuestionType(typeStr?: any): QuestionType {
  if (!typeStr) return 'multiple_choice';
  const str = String(typeStr).toLowerCase().trim().replace(/[\s_-]+/g, '');
  if (str.includes('truefalse') || str.includes('dung_sai') || str.includes('dungsai') || str === 'tf') return 'true_false';
  if (str.includes('short') || str.includes('ngan') || str.includes('dien') || str.includes('tuluan')) return 'short_answer';
  if (str.includes('essay') || str.includes('tu_luan')) return 'essay';
  if (str.includes('calc') || str.includes('tinh')) return 'calculation';
  return 'multiple_choice';
}

/**
 * Validates and normalizes single question item
 */
function normalizeQuestionItem(
  raw: any,
  index: number,
  fallbackChapterId?: string,
  fallbackLessonId?: string
): ParsedJsonQuestionItem {
  const errors: string[] = [];
  const tempId = `json-q-${Date.now()}-${index + 1}-${Math.random().toString(36).substring(2, 7)}`;

  const content = String(raw.content || raw.question || raw.cau_hoi || raw.text || '').trim();
  if (!content) {
    errors.push('Nội dung câu hỏi không được để trống.');
  }

  const type = normalizeQuestionType(raw.type || raw.loai_cau_hoi || raw.questionType);
  const level = normalizeCognitiveLevel(raw.level || raw.muc_do || raw.difficulty);
  const chapterId = raw.chapterId ? normalizeChapterId(raw.chapterId) : (fallbackChapterId ? normalizeChapterId(fallbackChapterId) : undefined);
  const lessonId = raw.lessonId || raw.bai_hoc || fallbackLessonId || undefined;
  const imageUrl = raw.imageUrl || raw.image || raw.hinh_anh || '';
  const explanation = String(raw.explanation || raw.loi_giai || raw.giai_thich || raw.huong_dan || '').trim();
  const explanationImageUrl = raw.explanationImageUrl || raw.hinh_anh_giai_thich || '';

  let options: { id: string; text?: string; statement?: string; isCorrect?: boolean; imageUrl?: string }[] = [];
  let correctAnswer: any = raw.correctAnswer ?? raw.dap_an_dung ?? raw.dap_an ?? raw.answer;

  if (type === 'multiple_choice') {
    const rawOptions = raw.options || raw.lua_chon || raw.choices || raw.answers || [];
    if (Array.isArray(rawOptions)) {
      options = rawOptions.map((opt: any, optIdx: number) => {
        const id = String(opt.id || String.fromCharCode(65 + optIdx)).toUpperCase().trim();
        const text = String(opt.text || opt.content || opt.noi_dung || (typeof opt === 'string' ? opt : '')).trim();
        const isCorrect = Boolean(opt.isCorrect || opt.correct);
        const optImageUrl = opt.imageUrl || opt.image || '';
        return { id, text, isCorrect, imageUrl: optImageUrl };
      });
    } else if (typeof rawOptions === 'object' && rawOptions !== null) {
      options = Object.entries(rawOptions).map(([key, val]) => ({
        id: key.toUpperCase().trim(),
        text: String(typeof val === 'object' && val !== null ? (val as any).text || (val as any).content || '' : val).trim(),
        imageUrl: typeof val === 'object' && val !== null ? (val as any).imageUrl || '' : ''
      }));
    }

    if (options.length < 2) {
      errors.push('Câu hỏi trắc nghiệm cần tối thiểu 2 phương án (A, B, C, D).');
    }

    let finalAns = '';
    if (typeof correctAnswer === 'string') {
      finalAns = correctAnswer.toUpperCase().trim();
    } else if (Array.isArray(correctAnswer) && correctAnswer.length > 0) {
      finalAns = String(correctAnswer[0]).toUpperCase().trim();
    } else {
      const correctOpt = options.find(o => o.isCorrect);
      if (correctOpt) finalAns = correctOpt.id;
    }
    correctAnswer = finalAns;
    if (!correctAnswer) {
      errors.push('Chưa xác định đáp án đúng cho câu hỏi trắc nghiệm.');
    }
  } else if (type === 'true_false') {
    const rawOptions = raw.options || raw.statements || raw.phat_bieu || [];
    if (Array.isArray(rawOptions)) {
      options = rawOptions.map((opt: any, optIdx: number) => {
        const id = String(opt.id || String.fromCharCode(97 + optIdx)).toLowerCase().trim(); // a, b, c, d
        const statement = String(opt.statement || opt.text || opt.noi_dung || (typeof opt === 'string' ? opt : '')).trim();
        const isCorrect = Boolean(opt.isCorrect ?? opt.correct ?? opt.dap_an);
        return { id, statement, isCorrect };
      });
    }

    if (options.length < 2) {
      errors.push('Câu đúng/sai cần có ít nhất 2 mệnh đề phát biểu.');
    }

    let tfAnswerMap: Record<string, boolean> = {};
    if (typeof correctAnswer === 'object' && correctAnswer !== null && !Array.isArray(correctAnswer)) {
      Object.entries(correctAnswer).forEach(([k, v]) => {
        tfAnswerMap[k.toLowerCase()] = Boolean(v);
      });
    } else {
      options.forEach(o => {
        tfAnswerMap[o.id] = Boolean(o.isCorrect);
      });
    }
    correctAnswer = tfAnswerMap;
  } else if (type === 'short_answer') {
    const ansStr = String(correctAnswer ?? raw.answer ?? '').trim();
    correctAnswer = ansStr;
    if (!ansStr) {
      errors.push('Chưa cung cấp đáp án mẫu / giá trị cho câu hỏi trả lời ngắn.');
    }
  }

  return {
    id: raw.id || undefined,
    tempId,
    content,
    imageUrl,
    type,
    level,
    chapterId,
    lessonId,
    options,
    correctAnswer,
    explanation,
    explanationImageUrl,
    grade: Number(raw.grade) || 10,
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    isValid: errors.length === 0,
    validationErrors: errors
  };
}

/**
 * Cleans up common copy-paste artifacts from AI (e.g. ```json blocks, trailing commas)
 */
export function cleanJsonString(raw: string): string {
  if (!raw) return '';
  let cleaned = raw.trim();

  // Strip ```json ... ``` or ``` ... ```
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  }

  // Strip trailing commas before closing braces/brackets: , } -> } and , ] -> ]
  cleaned = cleaned.replace(/,\s*([\}\]])/g, '$1');

  return cleaned;
}

/**
 * Smart detection of JSON structure (Bank vs Exam)
 */
export function detectJsonImportType(jsonString: string): 'bank' | 'exam' {
  const cleaned = cleanJsonString(jsonString);
  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) return 'bank';
    if (typeof parsed === 'object' && parsed !== null) {
      if (parsed.durationMinutes !== undefined || parsed.thoi_gian !== undefined || (parsed.title && !parsed.chapterId && parsed.questions)) {
        return 'exam';
      }
    }
  } catch {}
  return 'bank';
}

/**
 * Parses and validates JSON for Question Bank import
 */
export function validateAndNormalizeQuestionBankJson(
  jsonString: string,
  defaultChapterId?: string,
  defaultLessonId?: string
): ParsedJsonBankResult {
  const validationErrors: string[] = [];
  const cleaned = cleanJsonString(jsonString);
  let parsedObj: any;

  try {
    parsedObj = JSON.parse(cleaned);
  } catch (err: any) {
    return {
      questions: [],
      validationErrors: [`Định dạng file JSON không hợp lệ: ${err.message || 'Cú pháp JSON lỗi'}`]
    };
  }

  let rawList: any[] = [];
  let rootChapterId = defaultChapterId;
  let rootLessonId = defaultLessonId;
  let title = '';

  if (Array.isArray(parsedObj)) {
    rawList = parsedObj;
  } else if (typeof parsedObj === 'object' && parsedObj !== null) {
    rootChapterId = parsedObj.chapterId || parsedObj.chuong || defaultChapterId;
    rootLessonId = parsedObj.lessonId || parsedObj.bai || defaultLessonId;
    title = parsedObj.title || parsedObj.tieu_de || '';
    if (Array.isArray(parsedObj.questions || parsedObj.danh_sach_cau_hoi || parsedObj.items)) {
      rawList = parsedObj.questions || parsedObj.danh_sach_cau_hoi || parsedObj.items;
    } else {
      validationErrors.push('Không tìm thấy mảng danh sách câu hỏi ("questions" hoặc array []).');
    }
  } else {
    validationErrors.push('Dữ liệu JSON không đúng cấu trúc đối tượng hoặc mảng.');
  }

  if (rawList.length === 0 && validationErrors.length === 0) {
    validationErrors.push('Danh sách câu hỏi trong file JSON đang trống.');
  }

  const questions: ParsedJsonQuestionItem[] = rawList.map((item, idx) =>
    normalizeQuestionItem(item, idx, rootChapterId, rootLessonId)
  );

  return {
    chapterId: rootChapterId,
    lessonId: rootLessonId,
    title,
    questions,
    validationErrors
  };
}

/**
 * Parses and validates JSON for Exam Set / Test import
 */
export function validateAndNormalizeExamJson(
  jsonString: string,
  defaultChapterId?: string
): ParsedJsonExamResult {
  const validationErrors: string[] = [];
  const cleaned = cleanJsonString(jsonString);
  let parsedObj: any;

  try {
    parsedObj = JSON.parse(cleaned);
  } catch (err: any) {
    return {
      title: 'Đề thi nhập từ JSON',
      durationMinutes: 45,
      questions: [],
      validationErrors: [`Định dạng file JSON không hợp lệ: ${err.message || 'Cú pháp JSON lỗi'}`]
    };
  }

  if (typeof parsedObj !== 'object' || parsedObj === null || Array.isArray(parsedObj)) {
    return {
      title: 'Đề thi nhập từ JSON',
      durationMinutes: 45,
      questions: [],
      validationErrors: ['Đề thi JSON phải là một đối tượng chứa { "title", "durationMinutes", "questions": [...] }.']
    };
  }

  const title = String(parsedObj.title || parsedObj.tieu_de || parsedObj.name || 'Đề kiểm tra Hóa học 10').trim();
  const description = String(parsedObj.description || parsedObj.mo_ta || '').trim();
  const durationMinutes = Number(parsedObj.durationMinutes || parsedObj.thoi_gian || parsedObj.duration || 45);
  const chapterId = parsedObj.chapterId 
    ? normalizeChapterId(parsedObj.chapterId) 
    : (defaultChapterId ? normalizeChapterId(defaultChapterId) : undefined);
  const grade = Number(parsedObj.grade || 10);
  const instructions = String(parsedObj.instructions || parsedObj.huong_dan || parsedObj.dan_do || '').trim();
  const passPercentage = Number(parsedObj.passPercentage || 50);

  const rawQuestions = parsedObj.questions || parsedObj.danh_sach_cau_hoi || [];
  if (!Array.isArray(rawQuestions) || rawQuestions.length === 0) {
    validationErrors.push('Đề thi cần có ít nhất 1 câu hỏi trong mảng "questions".');
  }

  const questions: ParsedJsonQuestionItem[] = Array.isArray(rawQuestions)
    ? rawQuestions.map((item, idx) => normalizeQuestionItem(item, idx, chapterId))
    : [];

  return {
    title,
    description,
    durationMinutes: isNaN(durationMinutes) || durationMinutes < 0 ? 45 : durationMinutes,
    chapterId,
    grade,
    instructions,
    passPercentage,
    questions,
    validationErrors
  };
}

/**
 * Returns Detailed AI Master Prompt for PDF/Word to Question Bank JSON
 */
export function getAiPromptForQuestionBankJson(): string {
  return `Bạn là một chuyên gia khảo thí và xử lý dữ liệu Hóa học 10 THPT (Chương trình GDPT 2018).
Nhiệm vụ của bạn là đọc nội dung tài liệu Hóa học 10 (từ PDF, Word, hoặc ảnh chụp văn bản) và chuyển đổi thành định dạng JSON chuẩn xác 100% để nạp vào Ngân hàng câu hỏi của hệ thống CHEM10 AI.

### CẤU TRÚC JSON ĐẦU RA YÊU CẦU:
\`\`\`json
{
  "chapterId": "chuong-1",
  "lessonId": "bai-1",
  "questions": [
    {
      "content": "Nội dung câu hỏi (sử dụng LaTeX $...$ cho công thức Hóa/Toán học)",
      "imageUrl": "https://res.cloudinary.com/... (để trống nếu không có ảnh)",
      "type": "single_choice",
      "level": "nhan_biet",
      "chapterId": "chuong-1",
      "lessonId": "bai-1",
      "options": [
        { "id": "A", "text": "Phương án A (hỗ trợ LaTeX $...$)" },
        { "id": "B", "text": "Phương án B (hỗ trợ LaTeX $...$)" },
        { "id": "C", "text": "Phương án C (hỗ trợ LaTeX $...$)" },
        { "id": "D", "text": "Phương án D (hỗ trợ LaTeX $...$)" }
      ],
      "correctAnswer": "A",
      "explanation": "Lời giải chi tiết và hướng dẫn giải (hỗ trợ LaTeX $...$)",
      "explanationImageUrl": ""
    }
  ]
}
\`\`\`

### CÁC QUY TẮC BẮT BUỘC:
1. **Mã Chương (chapterId)**: Thuộc một trong 7 chương chuẩn GDPT 2018:
   - "chuong-1" (Cấu tạo nguyên tử)
   - "chuong-2" (Bảng tuần hoàn các nguyên tố hóa học)
   - "chuong-3" (Liên kết hóa học)
   - "chuong-4" (Phản ứng oxi hóa - khử)
   - "chuong-5" (Năng lượng hóa học)
   - "chuong-6" (Tốc độ phản ứng hóa học)
   - "chuong-7" (Nguyên tố nhóm Halogen)
2. **Mức độ nhận thức (level)**:
   - "nhan_biet" (Nhận biết - Câu hỏi nhớ định nghĩa, ký hiệu)
   - "thong_hieu" (Thông hiểu - Câu hỏi phân biệt, giải thích)
   - "van_dung" (Vận dụng - Tính toán đơn giản, suy luận)
   - "van_dung_cao" (Vận dụng cao - Bài toán tổng hợp, thực tiễn)
3. **Loại câu hỏi (type)**:
   - "single_choice" (Trắc nghiệm 1 đáp án đúng - correctAnswer: "A" / "B" / "C" / "D")
   - "multiple_choice" (Trắc nghiệm nhiều đáp án - correctAnswer: ["A", "C"])
   - "true_false" (Đúng/Sai - options gồm 4 ý a,b,c,d; correctAnswer: {"a": true, "b": false, "c": true, "d": true})
   - "short_answer" (Điền khuyết / Trả lời ngắn - correctAnswer: "giá trị số hoặc chuỗi")
4. **Công thức Hóa học & Toán học (LaTeX/KaTeX)**:
   - Tất cả ký hiệu hóa học, số mũ, chỉ số dưới, phương trình phản ứng ĐỀU ĐƯỢC BỌC TRONG CẶP DẤU $.
   - Ví dụ: "$H_2SO_4$", "$Fe + 2HCl \\rightarrow FeCl_2 + H_2 \\uparrow$", "$\\Delta_r H^0_{298} = -890.3 \\text{ kJ}$", "$1s^2 2s^2 2p^6$".
5. **Đầu ra**: Trả về duy nhất khối mã JSON hợp lệ, không bọc thêm lời dẫn chào hỏi.`;
}

/**
 * Returns Detailed AI Master Prompt for PDF/Word to Full Exam Test JSON
 */
export function getAiPromptForExamJson(): string {
  return `Bạn là một chuyên gia khảo thí Hóa học 10 THPT (Chương trình GDPT 2018).
Nhiệm vụ của bạn là chuyển đổi trọn vẹn một Đề kiểm tra / Đề thi Hóa học 10 (từ PDF, Word, hoặc ảnh) thành một file JSON Đề thi hoàn chỉnh để nạp trực tiếp vào Kho Đề thi & Khảo thí của hệ thống CHEM10 AI.

### CẤU TRÚC JSON ĐẦU RA YÊU CẦU:
\`\`\`json
{
  "title": "Đề kiểm tra Giữa học kì 1 Hóa học 10 - Năm học 2026-2027",
  "description": "Đề khảo thí 45 phút chuẩn ma trận đề GDPT 2018",
  "durationMinutes": 45,
  "chapterId": "chuong-1",
  "grade": 10,
  "instructions": "Học sinh làm bài độc lập. Không được sử dụng Bảng tuần hoàn.",
  "passPercentage": 50,
  "questions": [
    {
      "content": "Nguyên tử nguyên tố X có cấu hình electron $1s^2 2s^2 2p^6 3s^1$. Vị trí của X trong bảng tuần hoàn là:",
      "imageUrl": "",
      "type": "single_choice",
      "level": "nhan_biet",
      "options": [
        { "id": "A", "text": "Ô số 11, chu kì 3, nhóm IA" },
        { "id": "B", "text": "Ô số 11, chu kì 3, nhóm IB" },
        { "id": "C", "text": "Ô số 11, chu kì 1, nhóm IIIA" },
        { "id": "D", "text": "Ô số 12, chu kì 3, nhóm IIA" }
      ],
      "correctAnswer": "A",
      "explanation": "X có $Z = 11$, 3 lớp electron (chu kì 3), 1 electron lớp ngoài cùng phân lớp s (nhóm IA)."
    },
    {
      "content": "Cho các phát biểu sau về liên kết cộng hóa trị. Hãy cho biết mỗi phát biểu sau là Đúng hay Sai:",
      "type": "true_false",
      "level": "thong_hieu",
      "options": [
        { "id": "a", "statement": "Liên kết cộng hóa trị được hình thành do các cặp electron dùng chung.", "isCorrect": true },
        { "id": "b", "statement": "Liên kết đơn luôn là liên kết $\\sigma$.", "isCorrect": true },
        { "id": "c", "statement": "Liên kết đôi gồm 2 liên kết $\\pi$.", "isCorrect": false },
        { "id": "d", "statement": "Hiệu độ âm điện $\\ge 1.7$ luôn tạo thành liên kết cộng hóa trị không cực.", "isCorrect": false }
      ],
      "correctAnswer": { "a": true, "b": true, "c": false, "d": false },
      "explanation": "Ý c sai vì liên kết đôi gồm $1\\sigma + 1\\pi$. Ý d sai vì $\\Delta \\chi \\ge 1.7$ là liên kết ion."
    },
    {
      "content": "Khối lượng mol nguyên tử của nguyên tố Kali (K) là bao nhiêu g/mol?",
      "type": "short_answer",
      "level": "nhan_biet",
      "correctAnswer": "39",
      "explanation": "$M_K = 39 \\text{ g/mol}$."
    }
  ]
}
\`\`\`

### CÁC QUY TẮC BẮT BUỘC:
1. Đọc đầy đủ tất cả các câu hỏi trong đề, trích xuất chính xác phương án và đáp án đúng.
2. Công thức hóa học phải viết bằng LaTeX bọc trong $...$, ví dụ: "$H_2O$", "$CO_2$", "$2Al + 6HCl \\rightarrow 2AlCl_3 + 3H_2 \\uparrow$".
3. Cung cấp lời giải chi tiết (explanation) để học sinh đối chiếu sau khi thi.
4. Trả về định dạng JSON thuần túy để nạp trực tiếp vào hệ thống.`;
}

/**
 * Returns Sample Question Bank JSON String
 */
export function getSampleQuestionBankJson(): string {
  return JSON.stringify(
    {
      chapterId: "chuong-1",
      lessonId: "bai-1",
      title: "Bộ câu hỏi ôn tập Chương 1: Cấu tạo nguyên tử",
      questions: [
        {
          content: "Hạt mang điện tích âm trong nguyên tử là:",
          type: "single_choice",
          level: "nhan_biet",
          chapterId: "chuong-1",
          options: [
            { "id": "A", "text": "Proton" },
            { "id": "B", "text": "Electron" },
            { "id": "C", "text": "Neutron" },
            { "id": "D", "text": "Hạt nhân" }
          ],
          correctAnswer: "B",
          explanation: "Electron mang điện tích âm ($-1.602 \\times 10^{-19} \\text{ C}$). Proton mang điện tích dương và neutron không mang điện."
        },
        {
          content: "Một nguyên tử có $Z = 17$ (Clo). Cấu hình electron của nguyên tử này là:",
          type: "single_choice",
          level: "thong_hieu",
          chapterId: "chuong-1",
          options: [
            { "id": "A", "text": "$1s^2 2s^2 2p^6 3s^2 3p^5$" },
            { "id": "B", "text": "$1s^2 2s^2 2p^6 3s^2 3p^6$" },
            { "id": "C", "text": "$1s^2 2s^2 2p^6 3s^1 3p^6$" },
            { "id": "D", "text": "$1s^2 2s^2 2p^5 3s^2 3p^6$" }
          ],
          correctAnswer: "A",
          explanation: "Với $Z = 17$, electron điền theo thứ tự mức năng lượng: $1s^2 2s^2 2p^6 3s^2 3p^5$."
        },
        {
          content: "Cho các phát biểu sau về thành phần nguyên tử. Phát biểu nào Đúng, phát biểu nào Sai?",
          type: "true_false",
          level: "thong_hieu",
          chapterId: "chuong-1",
          options: [
            { "id": "a", "statement": "Hầu hết khối lượng nguyên tử tập trung ở hạt nhân.", "isCorrect": true },
            { "id": "b", "statement": "Số khối $A = Z + N$.", "isCorrect": true },
            { "id": "c", "statement": "Nguyên tử luôn mang điện tích dương do có proton.", "isCorrect": false },
            { "id": "d", "statement": "Đồng vị là các nguyên tử có cùng số proton nhưng khác số neutron.", "isCorrect": true }
          ],
          correctAnswer: { "a": true, "b": true, "c": false, "d": true },
          explanation: "Phát biểu c sai vì nguyên tử trung hòa về điện ($số p = số e$)."
        }
      ]
    },
    null,
    2
  );
}

/**
 * Returns Sample Exam Test JSON String
 */
export function getSampleExamJson(): string {
  return JSON.stringify(
    {
      title: "Đề kiểm tra 15 phút Hóa học 10 - Chương 1",
      description: "Đề kiểm tra nhanh kiến thức Cấu tạo nguyên tử",
      durationMinutes: 15,
      chapterId: "chuong-1",
      grade: 10,
      instructions: "Học sinh chọn 1 đáp án đúng nhất cho mỗi câu hỏi.",
      passPercentage: 50,
      questions: [
        {
          content: "Nguyên tử nguyên tố $X$ có điện tích hạt nhân là $+13$. Số electron ở lớp ngoài cùng của $X$ là:",
          type: "single_choice",
          level: "nhan_biet",
          options: [
            { "id": "A", "text": "1" },
            { "id": "B", "text": "2" },
            { "id": "C", "text": "3" },
            { "id": "D", "text": "4" }
          ],
          correctAnswer: "C",
          explanation: "$Z = 13$ (Nhôm): Cấu hình electron là $1s^2 2s^2 2p^6 3s^2 3p^1$, có $2 + 1 = 3$ electron ở lớp ngoài cùng."
        },
        {
          content: "Tổng số hạt proton, neutron, electron trong nguyên tử nguyên tố $Y$ là 40, trong đó số hạt mang điện nhiều hơn số hạt không mang điện là 12. Số hiệu nguyên tử của $Y$ là:",
          type: "single_choice",
          level: "van_dung",
          options: [
            { "id": "A", "text": "13" },
            { "id": "B", "text": "14" },
            { "id": "C", "text": "12" },
            { "id": "D", "text": "11" }
          ],
          correctAnswer: "A",
          explanation: "Hệ phương trình: $2Z + N = 40$ và $2Z - N = 12 \\Rightarrow 4Z = 52 \\Rightarrow Z = 13, N = 14$."
        },
        {
          content: "Số proton trong hạt nhân nguyên tử Cacbon ($^{12}_6C$) là:",
          type: "short_answer",
          level: "nhan_biet",
          correctAnswer: "6",
          explanation: "Số proton bằng số hiệu nguyên tử $Z = 6$."
        }
      ]
    },
    null,
    2
  );
}
