export type UserRole = 'admin' | 'teacher' | 'student';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  photoURL?: string;
  createdAt: any;
  school?: string;
  classId?: string;
}

export type CognitiveLevel = 'nhan_biet' | 'thong_hieu' | 'van_dung' | 'van_dung_cao';

export type QuestionType = 
  | 'multiple_choice' // Dạng 1 – Trắc nghiệm 4 lựa chọn (1 đúng)
  | 'true_false'       // Dạng 2 – Đúng / Sai 4 ý a, b, c, d
  | 'short_answer'    // Dạng 3 – Trả lời ngắn (số, công thức, từ khóa)
  | 'essay'           // Dạng 4 – Tự luận
  | 'calculation'     // Dạng 5 – Bài toán tính toán
  | 'equation_balance'// Dạng 6 – Cân bằng phương trình
  | 'identification'  // Dạng 7 – Nhận biết chất
  | 'experiment';     // Dạng 8 – Thí nghiệm / hiện tượng

export interface QuestionOption {
  id: string; // 'A', 'B', 'C', 'D' or 'a', 'b', 'c', 'd'
  text: string;
  isCorrect?: boolean; // For true_false: true/false for each sub-item
}

export interface AnswerKey {
  id?: string;
  questionId: string;
  correctAnswer: string | boolean[] | string[];
  explanation: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface Question {
  id: string;
  grade: number; // 10
  chapterId: string;
  chapterTitle: string;
  lessonId: string;
  lessonTitle: string;
  topic: string;
  type: QuestionType;
  level: CognitiveLevel;
  content: string;
  imageUrl?: string;
  dataGiven?: string; // Dữ kiện nếu có
  options?: QuestionOption[]; // For multiple_choice & true_false
  correctAnswer?: string | boolean[] | string[]; // Stored in answerKeys collection; optional on sanitized student questions
  explanation?: string; // Stored in answerKeys collection; optional on sanitized student questions
  keywords: string[];
  createdBy: string;
  creatorEmail: string;
  createdAt: any;
  updatedAt?: any;
  status: 'DRAFT' | 'APPROVED' | 'REJECTED' | 'DEMO' | string;
  aiGenerated?: boolean;
  source?: 'MANUAL' | 'EXCEL_IMPORT' | 'WORD_IMPORT' | 'AI_GENERATED' | 'teacher' | 'ai' | string;
  sourceFileName?: string;
  importedBy?: string;
  importedAt?: any;
  needsReview?: boolean;
  reviewNotes?: string;
}

export interface ChapterBankStats {
  chapterId: string;
  chapterTitle: string;
  chapterNumber: number | null; // 1 to 7, or null for unclassified
  description?: string;
  totalQuestions: number;
  approvedCount: number;
  draftCount: number;
  rejectedCount: number;
  levelCounts: {
    nhan_biet: number;
    thong_hieu: number;
    van_dung: number;
    van_dung_cao: number;
  };
  typeCounts: Record<string, number>;
}

export interface ParsedWordQuestion extends Omit<Question, 'id'> {
  tempId: string;
  sourceNumber?: number | string;
  validationStatus: 'VALID' | 'NEEDS_REVIEW' | 'DUPLICATE';
  warningMessage?: string;
  duplicateWithId?: string;
  duplicateContent?: string;
  selectedForImport: boolean;
  answerSource?: 'UNDERLINE' | 'INLINE_TEXT' | 'END_TABLE' | 'MANUAL_EDIT' | 'UNSPECIFIED';
  underlinedOptions?: string[];
}

export interface WordImportHistoryRecord {
  id: string;
  fileName: string;
  fileSize: number;
  importedBy: string;
  importedByName: string;
  importedAt: string;
  totalDetected: number;
  addedCount: number;
  needsReviewCount: number;
  duplicateCount: number;
}

export interface QuestionSet {
  id: string;
  title: string;
  description: string;
  chapterId?: string;
  lessonId?: string;
  durationMinutes: number;
  questionIds: string[];
  totalScore: number;
  allowReviewAnswers: boolean;
  createdBy: string;
  creatorEmail: string;
  createdAt: any;
  isPublic: boolean;
}

export interface ClassRoom {
  id: string;
  name: string;
  grade: number;
  subject?: string;
  academicYear?: string;
  teacherEmail: string;
  teacherName: string;
  teacherId?: string;
  studentEmails: string[];
  studentCount: number;
  description?: string;
  status?: 'ACTIVE' | 'ARCHIVED';
  createdAt: any;
  updatedAt?: any;
}

export interface StudentInClass {
  uid?: string;
  email: string;
  displayName: string;
  status: 'ACTIVE' | 'PENDING' | 'NO_ACCOUNT';
  joinedAt?: string;
  submissionsCount: number;
  avgScore: number;
  completedCount: number;
  pendingCount: number;
  latestScore?: number;
  lastActiveAt?: string;
}

export interface BulkStudentParsedItem {
  id: string;
  rawInput: string;
  email: string;
  displayName: string;
  status: 'VALID' | 'ALREADY_IN_CLASS' | 'INVALID_EMAIL' | 'EXISTING_USER_NEW_TO_CLASS' | 'NEW_ACCOUNT_NEEDED';
  statusMessage: string;
  userExistsInSystem?: boolean;
  selected: boolean;
}

export interface BulkImportReport {
  total: number;
  validCount: number;
  alreadyInClassCount: number;
  invalidEmailCount: number;
  newAccountCount: number;
  items: BulkStudentParsedItem[];
}

export interface ClassOperationLog {
  id?: string;
  action: 'BULK_ADD_STUDENTS' | 'ADD_STUDENT' | 'REMOVE_STUDENT' | 'TRANSFER_STUDENT' | 'UPDATE_CLASS' | 'ARCHIVE_CLASS';
  performedBy: string;
  performedByEmail: string;
  classId: string;
  className: string;
  total?: number;
  success?: number;
  duplicate?: number;
  invalid?: number;
  failed?: number;
  details?: any;
  createdAt: any;
}

export type AssignmentStatus = 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'ENDED' | 'CLOSED' | 'CANCELLED' | 'active' | 'closed' | 'upcoming';

export interface Assignment {
  id: string;
  title: string;
  questionSetId: string;
  teacherId?: string;
  teacherEmail: string;
  teacherName: string;
  targetType?: 'CLASS' | 'STUDENTS';
  classIds?: string[];
  classId?: string;
  className?: string;
  studentIds?: string[];
  targetStudentEmails?: string[];
  excludedStudentEmails?: string[];
  startAt?: string;
  openTime?: string;
  endAt?: string;
  deadline?: string;
  durationMinutes: number; // 0 = unlimited, 15, 30, 45, 60, custom
  maxAttempts: number; // 1, 2, 3, 999
  gradingMode?: 'highest' | 'latest'; // Cách tính điểm khi làm nhiều lần
  shuffleQuestions?: boolean; // Trộn thứ tự câu hỏi
  shuffleOptions?: boolean; // Trộn thứ tự phương án A, B, C, D
  allowBackNavigation?: boolean; // Cho phép quay lại câu trước (default true)
  showAnswers?: 'none' | 'after_submit' | 'after_end' | 'with_solution';
  showSolutions?: boolean;
  showScore?: 'immediate' | 'manual_publish'; // Xem ngay sau khi nộp hoặc công bố sau
  isScorePublished?: boolean;
  allowReviewAnswers?: boolean;
  instructions?: string; // Hướng dẫn/lưu ý cho học sinh
  status: AssignmentStatus;
  createdAt: any;
  updatedAt?: any;
}

export interface StudentAnswer {
  questionId: string;
  answer: string | boolean[] | string[];
  isCorrect?: boolean;
  scoreEarned?: number;
  maxScore?: number;
  teacherFeedback?: string;
}

export interface Submission {
  id: string;
  assignmentId?: string; // empty if self-practice
  questionSetId: string;
  questionSetTitle: string;
  studentId: string;
  studentEmail: string;
  studentName: string;
  studentClass?: string;
  attemptNumber?: number;
  startedAt: any;
  submittedAt: any;
  durationSeconds: number;
  answers: Record<string, any>; // questionId -> answer
  score: number; // e.g. 8.5 / 10
  totalQuestions: number;
  correctCount: number;
  incorrectCount: number;
  wrongCount?: number;
  blankCount?: number;
  details: {
    questionId: string;
    isCorrect: boolean;
    studentAnswer: any;
    correctAnswer: any;
    score: number;
  }[];
  status: 'in_progress' | 'submitted' | 'graded';
}

export interface Chapter {
  id: string;
  title: string;
  description: string;
  lessons: {
    id: string;
    title: string;
    topics: string[];
  }[];
}
