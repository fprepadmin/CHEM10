import { CompetencyAnalysisResult } from '../utils/competencyAnalyzer';
import { Submission, StudentInClass, ClassRoom, Assignment } from '../types';

// Groq API Keys — loaded from environment variable, NEVER hardcoded.
// Set GROQ_API_KEYS as a comma-separated list in your .env.local file.
// Example: GROQ_API_KEYS=gsk_key1,gsk_key2,gsk_key3
export const GROQ_API_KEYS: string[] = (import.meta.env.VITE_GROQ_API_KEYS || '')
  .split(',')
  .map((k: string) => k.trim())
  .filter(Boolean);

export const AI_ASSESSMENT_MODEL = 'openai/gpt-oss-120b';

let currentKeyIndex = 0;

export function getNextApiKey(): string {
  const key = GROQ_API_KEYS[currentKeyIndex % GROQ_API_KEYS.length];
  currentKeyIndex++;
  return key;
}

/**
 * Robust Groq API Caller with 3-Key Automatic Rotation & Failover
 */
export async function callGroqAI(
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
  temperature = 0.3,
  max_tokens = 3000
): Promise<string> {
  let lastError: any = null;

  for (let attempt = 0; attempt < GROQ_API_KEYS.length; attempt++) {
    const key = GROQ_API_KEYS[(currentKeyIndex + attempt) % GROQ_API_KEYS.length];
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify({
          model: AI_ASSESSMENT_MODEL,
          messages,
          temperature,
          max_tokens,
          response_format: { type: 'json_object' }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`Groq API key attempt ${attempt + 1} returned status ${response.status}:`, errorText);
        lastError = new Error(`Groq HTTP ${response.status}: ${errorText}`);
        continue; // Try next key in rotation
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (content) {
        return content;
      }
    } catch (err: any) {
      console.warn(`Groq API key attempt ${attempt + 1} network error:`, err);
      lastError = err;
    }
  }

  throw lastError || new Error('Không thể kết nối đến hệ thống AI sau khi thử cả 3 API keys.');
}

export interface AIStudentAssessment {
  overallSummary: string;
  academicLevel: 'XUẤT SẮC' | 'GIỎI' | 'KHÁ' | 'TRUNG BÌNH' | 'CẦN CỐ GẮNG';
  academicLevelBadgeColor: string;
  strengths: string[];
  weaknesses: string[];
  studyRoadmap: { step: string; chapter: string; action: string }[];
  teacherFeedback: string;
  parentNote: string;
  recommendedFocus: string;
  generatedAt: string;
}

/**
 * Generates an individualized pedagogical assessment for a single student
 */
export async function generateStudentPersonalizedAssessment(
  student: StudentInClass,
  analysis: CompetencyAnalysisResult,
  submissions: Submission[]
): Promise<AIStudentAssessment> {
  const systemInstruction = `Bạn là Trợ lý Sư phạm AI Chuyên sâu môn Hóa học THPT (Chương trình GDPT 2018), phụ trách phân tích hồ sơ học tập và lập báo cáo đánh giá năng lực học sinh cho Giáo viên Nguyễn Tuyền Muội.
Nhiệm vụ của bạn: Dựa trên dữ liệu điểm số, số bài thi, mức độ nhận thức (Nhận biết, Thông hiểu, Vận dụng, Vận dụng cao) và kết quả 7 chương Hóa học 10, hãy đưa ra nhận xét, đánh giá chuyên sâu, tận tâm, mang tính khích lệ và lộ trình rèn luyện cụ thể.
Phản hồi BẮT BUỘC trả về định dạng JSON thuần túy (JSON object) với các trường:
{
  "overallSummary": "Đoạn văn 3-4 câu nhận định tổng quan về thái độ, năng lực và kết quả học tập môn Hóa 10 của học sinh...",
  "academicLevel": "XUẤT SẮC | GIỎI | KHÁ | TRUNG BÌNH | CẦN CỐ GẮNG",
  "academicLevelBadgeColor": "emerald | cyan | blue | amber | rose",
  "strengths": [
    "Điểm mạnh 1 (Ví dụ: Nắm rất chắc lý thuyết cấu tạo nguyên tử và bảng tuần hoàn)",
    "Điểm mạnh 2..."
  ],
  "weaknesses": [
    "Lỗ hổng kiến thức 1 (Ví dụ: Hay nhầm lẫn trong bài toán tính biến thiên Enthalpy hoặc cân bằng oxi hóa khử phức tạp)",
    "Lỗ hổng kiến thức 2..."
  ],
  "studyRoadmap": [
    { "step": "Giai đoạn 1", "chapter": "Chương cần ưu tiên", "action": "Hành động cụ thể..." },
    { "step": "Giai đoạn 2", "chapter": "Chương tiếp theo", "action": "Hành động cụ thể..." }
  ],
  "teacherFeedback": "Đoạn văn nhận xét học bạ / sổ liên lạc ngắn gọn, trang trọng, chính xác từ giáo viên bộ môn...",
  "parentNote": "Đoạn văn gửi phụ huynh học sinh để phối hợp đôn đốc việc tự học ở nhà...",
  "recommendedFocus": "Tên chủ đề hoặc dạng bài tập học sinh cần tập trung luyện thêm nhiều nhất ngay lúc này"
}`;

  const studentContext = {
    studentName: student.displayName,
    studentEmail: student.email,
    classId: (student as any).classId || 'Hóa 10',
    totalSubmissions: analysis.totalSubmissions,
    averageScore: analysis.averageScore,
    highestScore: analysis.highestScore,
    lowestScore: analysis.lowestScore,
    scoreTrend: analysis.scoreTrendText,
    overallAccuracy: `${analysis.overallAccuracy}%`,
    cognitiveLevels: {
      nhan_biet: `${analysis.cognitiveLevels.nhan_biet.percentage}% (${analysis.cognitiveLevels.nhan_biet.rating})`,
      thong_hieu: `${analysis.cognitiveLevels.thong_hieu.percentage}% (${analysis.cognitiveLevels.thong_hieu.rating})`,
      van_dung: `${analysis.cognitiveLevels.van_dung.percentage}% (${analysis.cognitiveLevels.van_dung.rating})`,
      van_dung_cao: `${analysis.cognitiveLevels.van_dung_cao.percentage}% (${analysis.cognitiveLevels.van_dung_cao.rating})`,
    },
    chaptersMastery: analysis.chaptersMastery.map(c => ({
      chapter: c.chapterTitle,
      accuracy: `${c.percentage}%`,
      rating: c.rating
    })),
    recentSubmissions: submissions.slice(0, 5).map(s => ({
      title: s.questionSetTitle,
      score: s.score,
      total: s.totalQuestions,
      correct: s.correctCount,
      date: s.submittedAt ? s.submittedAt.split('T')[0] : 'Gần đây'
    }))
  };

  const userPrompt = `Hãy lập báo cáo đánh giá năng lực toàn diện cho học sinh sau:\n${JSON.stringify(studentContext, null, 2)}`;

  const rawJson = await callGroqAI([
    { role: 'system', content: systemInstruction },
    { role: 'user', content: userPrompt }
  ], 0.3);

  try {
    const parsed = JSON.parse(rawJson);
    return {
      ...parsed,
      generatedAt: new Date().toLocaleString('vi-VN')
    };
  } catch (err) {
    console.error('Failed to parse AI Student Assessment JSON:', err, rawJson);
    throw new Error('Dữ liệu phản hồi từ AI không đúng định dạng JSON.');
  }
}

export interface AIClassReport {
  executiveSummary: string;
  classHealthRating: 'XUẤT SẮC' | 'TỐT' | 'TRUNG BÌNH' | 'CẦN CẢI THIỆN';
  scoreDistributionAssessment: string;
  topWeakChapters: { chapterTitle: string; reason: string; fixStrategy: string }[];
  keyStrengths: string[];
  studentsNeedingSupport: { name: string; email: string; reason: string; action: string }[];
  topPerformers: { name: string; email: string; commendation: string }[];
  teachingActionPlan: string[];
  generatedAt: string;
}

/**
 * Generates a comprehensive class-wide performance report
 */
export async function generateClassComprehensiveReport(
  classRoom: ClassRoom,
  students: StudentInClass[],
  assignments: Assignment[],
  submissions: Submission[]
): Promise<AIClassReport> {
  const systemInstruction = `Bạn là Chuyên gia Tư vấn Quản lý Giáo dục và Phương pháp Dạy học Hóa học THPT (GDPT 2018), đồng hành cùng Cô Nguyễn Tuyền Muội.
Nhiệm vụ: Phân tích toàn bộ dữ liệu kiểm tra, mức độ chuyên cần, phổ điểm và lỗi sai phổ biến của tập thể lớp để xuất Báo cáo chất lượng giáo dục tổng thể.
Phản hồi BẮT BUỘC trả về JSON object thuần túy theo cấu trúc:
{
  "executiveSummary": "Đoạn văn 3-4 câu đánh giá tổng quát về phong độ học tập, tỷ lệ nộp bài và năng lực của lớp...",
  "classHealthRating": "XUẤT SẮC | TỐT | TRUNG BÌNH | CẦN CẢI THIỆN",
  "scoreDistributionAssessment": "Nhận xét chi tiết về sự phân hóa điểm số giữa các nhóm học sinh trong lớp...",
  "topWeakChapters": [
    {
      "chapterTitle": "Tên chương lớp làm sai nhiều nhất",
      "reason": "Nguyên nhân cốt lõi khiến học sinh hay nhầm...",
      "fixStrategy": "Chiến lược ôn tập / phương pháp giảng dạy gợi ý cho giáo viên..."
    }
  ],
  "keyStrengths": [
    "Điểm mạnh chung của tập thể lớp 1...",
    "Điểm mạnh 2..."
  ],
  "studentsNeedingSupport": [
    {
      "name": "Họ và tên học sinh",
      "email": "Email",
      "reason": "Lý do cần hỗ trợ (điểm thấp, chưa nộp bài, hổng kiến thức chương nào)",
      "action": "Biện pháp kèm cặp đề xuất..."
    }
  ],
  "topPerformers": [
    {
      "name": "Họ và tên",
      "email": "Email",
      "commendation": "Lời khen ngợi và hướng bồi dưỡng học sinh giỏi..."
    }
  ],
  "teachingActionPlan": [
    "Kế hoạch hành động 1 trong 2 tuần tới...",
    "Kế hoạch hành động 2...",
    "Kế hoạch hành động 3..."
  ]
}`;

  const totalStudents = students.length;
  const activeStudents = students.filter(s => (s.submissionsCount || 0) > 0).length;
  const classAvg = totalStudents > 0 
    ? (students.reduce((acc, s) => acc + (s.avgScore || 0), 0) / (activeStudents || 1)).toFixed(1)
    : '0.0';

  const classDataPayload = {
    className: classRoom.name,
    grade: classRoom.grade || 10,
    academicYear: classRoom.academicYear || '2026-2027',
    totalStudents,
    activeStudents,
    classAverageScore: classAvg,
    totalAssignmentsGiven: assignments.length,
    totalSubmissionsReceived: submissions.length,
    studentsSummary: students.map(s => ({
      name: s.displayName,
      email: s.email,
      avgScore: s.avgScore || 0,
      submissions: s.submissionsCount || 0
    })),
    assignmentsSummary: assignments.map(a => ({
      title: a.title,
      duration: a.durationMinutes,
      deadline: a.deadline
    }))
  };

  const userPrompt = `Phân tích chất lượng lớp học môn Hóa học 10 sau:\n${JSON.stringify(classDataPayload, null, 2)}`;

  const rawJson = await callGroqAI([
    { role: 'system', content: systemInstruction },
    { role: 'user', content: userPrompt }
  ], 0.3);

  try {
    const parsed = JSON.parse(rawJson);
    return {
      ...parsed,
      generatedAt: new Date().toLocaleString('vi-VN')
    };
  } catch (err) {
    console.error('Failed to parse Class Report JSON:', err, rawJson);
    throw new Error('Dữ liệu báo cáo lớp từ AI không đúng định dạng JSON.');
  }
}

/**
 * Generates quick personalized report card comments for multiple students
 */
export async function generateBatchReportCardComments(
  students: { id: string; name: string; email: string; avgScore: number; submissionsCount: number }[]
): Promise<Record<string, string>> {
  const systemInstruction = `Bạn là Trợ lý Giáo viên Hóa học 10. Hãy viết lời nhận xét học bạ / sổ theo dõi cho danh sách học sinh sau.
Mỗi lời nhận xét dài 1-2 câu, trang nhã, chính xác, nêu rõ ưu điểm và hướng phấn đấu.
Trả về JSON object dạng: { [studentEmailOrId]: "Lời nhận xét..." }`;

  const rawJson = await callGroqAI([
    { role: 'system', content: systemInstruction },
    { role: 'user', content: JSON.stringify(students) }
  ], 0.4);

  try {
    return JSON.parse(rawJson);
  } catch (err) {
    console.error('Failed to parse batch comments JSON:', err);
    return {};
  }
}
