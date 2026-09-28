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
  mshs?: string;
  hasLoggedIn?: boolean;
  lastLoginAt?: any;
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
  | 'experiment'      // Dạng 8 – Thí nghiệm / hiện tượng
  | 'unknown';        // Dạng chưa xác định

export interface QuestionOption {
  id: string; // 'A', 'B', 'C', 'D' or 'a', 'b', 'c', 'd'
  label?: string; // Optional display label ('A', 'B', 'C', 'D' or 'a', 'b', 'c', 'd')
  text: string;
  isCorrect?: boolean; // For true_false: true/false for each sub-item
}

export interface AnswerKey {
  id?: string;
  questionId: string;
  correctAnswer: string | boolean[] | string[];
  explanation: string;
  importBatchId?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface Question {
  id: string;
  grade?: number; // 10
  chapterId: string;
  chapterTitle: string;
  chapterName?: string;
  lessonId: string;
  lessonTitle: string;
  lessonName?: string;
  topic: string;
  type: QuestionType;
  level: CognitiveLevel;
  content: string;
  imageUrl?: string;
  dataGiven?: string; // Dữ kiện nếu có
  options?: QuestionOption[]; // For multiple_choice & true_false
  correctAnswer?: string | boolean[] | string[]; // Stored in answerKeys collection; optional on sanitized student questions
  explanation?: string; // Stored in answerKeys collection; optional on sanitized student questions
  keywords?: string[];
  createdBy?: string;
  creatorEmail?: string;
  createdAt: any;
  updatedAt?: any;
  status?: 'DRAFT' | 'APPROVED' | 'REJECTED' | 'DEMO' | string;
  aiGenerated?: boolean;
  source?: 'MANUAL' | 'EXCEL_IMPORT' | 'WORD_IMPORT' | 'AI_GENERATED' | 'teacher' | 'ai' | string;
  sourceFileName?: string;
  importedBy?: string;
  importedAt?: any;
  importBatchId?: string;
  needsReview?: boolean;
  reviewNotes?: string;
}

export interface BulkImportAuditError {
  index: number;
  questionId?: string;
  contentSnippet?: string;
  message: string;
  code?: string;
}

export interface BulkImportAuditResult {
  total: number;
  attempted: number;
  added: number;
  failed: number;
  batchId: string;
  createdQuestionIds: string[];
  errors: BulkImportAuditError[];
  verifiedQuestionsCount: number;
  verifiedAnswerKeysCount: number;
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

export interface ChapterPracticeConfig {
  chapterId: string;
  questionCount: number;
  durationMinutes?: number;
  types?: {
    multiple_choice: number; // Dạng 1: Trắc nghiệm 4 lựa chọn
    true_false: number;      // Dạng 2: Trắc nghiệm Đúng / Sai 4 ý
    short_answer: number;    // Dạng 3: Trắc nghiệm Trả lời ngắn
    calculation?: number;
    other?: number;
  };
  levels?: {
    nhan_biet?: number;
    thong_hieu?: number;
    van_dung?: number;
    van_dung_cao?: number;
  };
  levelRatio?: {
    nhan_biet: number;
    thong_hieu: number;
    van_dung: number;
    van_dung_cao: number;
  };
  mode?: 'MANUAL_FORMAT' | 'AUTO_BALANCED';
  updatedAt?: string;
  updatedBy?: string;
}

export interface ChapterMatrixRule {
  chapterId: string;
  count: number;
  levels?: {
    nhan_biet?: number;
    thong_hieu?: number;
    van_dung?: number;
    van_dung_cao?: number;
  };
  types?: {
    multiple_choice?: number;
    true_false?: number;
    short_answer?: number;
    calculation?: number;
    other?: number;
  };
}

export interface ExamMatrixConfig {
  totalQuestions: number;
  chapters: ChapterMatrixRule[];
  levelRatio?: {
    nhan_biet: number;
    thong_hieu: number;
    van_dung: number;
    van_dung_cao: number;
  };
  typeRatio?: {
    multiple_choice: number;
    true_false: number;
    short_answer: number;
    calculation?: number;
  };
  isDynamicPerStudent?: boolean; // Tự động trộn cho mỗi học sinh theo ma trận
}

export interface QuestionSet {
  id: string;
  title: string;
  description: string;
  chapterId?: string;
  lessonId?: string;
  durationMinutes: number;
  questionIds: string[];
  questions?: Question[]; // Embedded standalone questions for exams imported directly from Word
  type?: 'STANDALONE_WORD' | 'BANK_COMPILED' | 'CHAPTER_PRACTICE' | 'MATRIX_DYNAMIC';
  matrixConfig?: ExamMatrixConfig;
  totalScore: number;
  allowReviewAnswers: boolean;
  createdBy: string;
  creatorEmail: string;
  createdAt: any;
  updatedAt?: any;
  isPublic: boolean;
  sourceFileName?: string;
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
  coverImageUrl?: string;
  studentEmails: string[];
  studentCount: number;
  description?: string;
  status?: 'ACTIVE' | 'ARCHIVED';
  createdAt: any;
  updatedAt?: any;
}

export interface StudentInClass {
  uid?: string;
  mshs?: string;
  email: string;
  displayName: string;
  status: 'ACTIVE' | 'PENDING' | 'NO_ACCOUNT';
  hasLoggedIn?: boolean;
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
  mshs?: string;
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
    scoreRatio?: number;
    explanation?: string;
    subDetails?: {
      index: number;
      label: string;
      studentVal: boolean | string | null;
      correctVal: boolean | string | null;
      isMatch: boolean;
    }[];
  }[];
  status: 'in_progress' | 'submitted' | 'graded';
}

export interface Lesson {
  id: string;
  title: string;
  name?: string;
  topics?: string[];
}

export interface Chapter {
  id: string;
  title: string;
  name?: string;
  description: string;
  lessons: Lesson[];
}
