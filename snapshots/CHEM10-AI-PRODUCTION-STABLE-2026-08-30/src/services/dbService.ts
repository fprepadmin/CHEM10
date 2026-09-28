import { 
  db, 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  getDocs, 
  query, 
  where, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp 
} from '../lib/firebase';
import { DEMO_QUESTIONS } from '../data/curriculum';
import { 
  Question, 
  AnswerKey,
  QuestionSet, 
  Assignment, 
  ClassRoom, 
  Submission, 
  StudentInClass, 
  BulkStudentParsedItem, 
  BulkImportReport, 
  ClassOperationLog,
  UserProfile
} from '../types';

export const questionService = {
  // Get questions with optional filters (Joins answerKeys for Teachers/Admins)
  async getQuestions(filter?: {
    chapterId?: string;
    lessonId?: string;
    level?: string;
    type?: string;
    status?: string;
    searchTerm?: string;
  }): Promise<Question[]> {
    try {
      const qColl = collection(db, 'questions');
      const snap = await getDocs(qColl);
      
      let list: Question[] = [];
      snap.forEach(d => {
        list.push({ id: d.id, ...d.data() } as Question);
      });

      // Attempt to load answerKeys (Allowed for Teachers & Admins)
      try {
        const akColl = collection(db, 'answerKeys');
        const akSnap = await getDocs(akColl);
        const keysMap = new Map<string, AnswerKey>();
        akSnap.forEach(d => {
          keysMap.set(d.id, { id: d.id, ...d.data() } as AnswerKey);
        });

        // Merge answer keys onto questions
        list = list.map(q => {
          const k = keysMap.get(q.id);
          if (k) {
            return {
              ...q,
              correctAnswer: k.correctAnswer,
              explanation: k.explanation
            };
          }
          return q;
        });
      } catch (err) {
        // If not authorized to read answerKeys (e.g. Student role), list remains sanitized
        console.debug("Note: answerKeys collection read restricted by Security Rules.");
      }

      // If db is empty or minimal, include DEMO questions seamlessly so users have immediate rich content
      if (list.length === 0) {
        list = [...DEMO_QUESTIONS];
      } else {
        // Merge demo questions if not already present
        const ids = new Set(list.map(q => q.id));
        DEMO_QUESTIONS.forEach(demo => {
          if (!ids.has(demo.id)) {
            list.push(demo);
          }
        });
      }

      // Apply client-side filters for maximum flexibility
      if (filter) {
        if (filter.chapterId) {
          list = list.filter(q => q.chapterId === filter.chapterId);
        }
        if (filter.lessonId) {
          list = list.filter(q => q.lessonId === filter.lessonId);
        }
        if (filter.level) {
          list = list.filter(q => q.level === filter.level);
        }
        if (filter.type) {
          list = list.filter(q => q.type === filter.type);
        }
        if (filter.status) {
          list = list.filter(q => q.status === filter.status);
        }
        if (filter.searchTerm) {
          const term = filter.searchTerm.toLowerCase();
          list = list.filter(q => 
            q.content.toLowerCase().includes(term) ||
            q.topic?.toLowerCase().includes(term) ||
            q.chapterTitle?.toLowerCase().includes(term) ||
            q.keywords?.some(k => k.toLowerCase().includes(term))
          );
        }
      }

      return list;
    } catch (err) {
      console.warn("Error fetching questions from firestore, fallback to DEMO:", err);
      return DEMO_QUESTIONS;
    }
  },

  async getQuestionById(id: string): Promise<Question | null> {
    const demo = DEMO_QUESTIONS.find(q => q.id === id);
    if (demo) return demo;
    try {
      const d = await getDoc(doc(db, 'questions', id));
      if (d.exists()) {
        const qData = { id: d.id, ...d.data() } as Question;
        try {
          const ak = await getDoc(doc(db, 'answerKeys', id));
          if (ak.exists()) {
            qData.correctAnswer = ak.data().correctAnswer;
            qData.explanation = ak.data().explanation;
          }
        } catch (e) {}
        return qData;
      }
    } catch (e) {
      console.error(e);
    }
    return null;
  },

  // Student-Safe Fetch: Returns questions strictly WITHOUT correctAnswer and explanation
  async getQuestionsByIds(ids: string[]): Promise<Question[]> {
    if (!ids || ids.length === 0) return [];
    try {
      const fetchPromises = ids.map(async (id) => {
        const demo = DEMO_QUESTIONS.find(q => q.id === id);
        if (demo) {
          // Return sanitized copy for student (strip correctAnswer and explanation)
          const { correctAnswer: _ca, explanation: _ex, ...sanitizedDemo } = demo;
          return sanitizedDemo as Question;
        }
        try {
          const d = await getDoc(doc(db, 'questions', id));
          if (d.exists()) {
            const data = d.data();
            // Sanitize in memory just in case of any legacy fields
            const { correctAnswer: _ca, explanation: _ex, ...sanitized } = data;
            return { id: d.id, ...sanitized } as Question;
          }
        } catch (e) {
          console.warn(`Could not fetch question ${id}:`, e);
        }
        return null;
      });

      const fetched = await Promise.all(fetchPromises);
      return fetched.filter((q): q is Question => q !== null);
    } catch (err) {
      console.error("Error fetching questions by ids:", err);
      return [];
    }
  },

  async createQuestion(questionData: Omit<Question, 'id'>): Promise<string> {
    const { correctAnswer, explanation, ...sanitizedQuestion } = questionData as any;
    const cleanData = {
      ...sanitizedQuestion,
      createdAt: new Date().toISOString()
    };
    
    // 1. Write question content to questions collection
    const ref = await addDoc(collection(db, 'questions'), cleanData);

    // 2. Write answerKey to isolated answerKeys collection
    if (correctAnswer !== undefined) {
      try {
        await setDoc(doc(db, 'answerKeys', ref.id), {
          questionId: ref.id,
          correctAnswer: correctAnswer,
          explanation: explanation || '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      } catch (e) {
        console.error("Failed to write to answerKeys collection:", e);
      }
    }

    return ref.id;
  },

  async updateQuestion(id: string, updates: Partial<Question>): Promise<void> {
    const { correctAnswer, explanation, ...sanitizedUpdates } = updates as any;
    
    // 1. Update question content in questions collection
    try {
      const ref = doc(db, 'questions', id);
      await updateDoc(ref, {
        ...sanitizedUpdates,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      const demo = DEMO_QUESTIONS.find(q => q.id === id);
      if (demo) {
        const { correctAnswer: _ca, explanation: _ex, ...demoClean } = demo;
        await setDoc(doc(db, 'questions', id), {
          ...demoClean,
          ...sanitizedUpdates,
          createdAt: demo.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      } else {
        throw err;
      }
    }

    // 2. Update answerKey in answerKeys collection if provided
    if (correctAnswer !== undefined || explanation !== undefined) {
      try {
        const keyRef = doc(db, 'answerKeys', id);
        const keyDoc = await getDoc(keyRef);
        if (keyDoc.exists()) {
          await updateDoc(keyRef, {
            ...(correctAnswer !== undefined ? { correctAnswer } : {}),
            ...(explanation !== undefined ? { explanation } : {}),
            updatedAt: new Date().toISOString()
          });
        } else {
          await setDoc(keyRef, {
            questionId: id,
            correctAnswer: correctAnswer !== undefined ? correctAnswer : '',
            explanation: explanation || '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        }
      } catch (e) {
        console.error("Failed to update answerKeys:", e);
      }
    }
  },

  async deleteQuestion(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'questions', id));
      try {
        await deleteDoc(doc(db, 'answerKeys', id));
      } catch (e) {}
    } catch (err) {
      console.warn("Delete firestore question notice:", err);
    }
  },

  async bulkUpdateQuestions(ids: string[], updates: Partial<Question>): Promise<number> {
    let count = 0;
    for (const id of ids) {
      try {
        await this.updateQuestion(id, updates);
        count++;
      } catch (e) {
        console.error("Bulk update single error:", id, e);
      }
    }
    return count;
  },

  async bulkDeleteQuestions(ids: string[]): Promise<number> {
    let count = 0;
    for (const id of ids) {
      try {
        await this.deleteQuestion(id);
        count++;
      } catch (e) {
        console.error("Bulk delete single error:", id, e);
      }
    }
    return count;
  },

  async bulkCreateQuestions(questions: Omit<Question, 'id'>[]): Promise<number> {
    let successCount = 0;
    for (const q of questions) {
      try {
        await this.createQuestion(q);
        successCount++;
      } catch (err) {
        console.error("Bulk add error:", err);
      }
    }
    return successCount;
  },

  // Migration Routine: Separates legacy questions into questions + answerKeys collections
  async migrateExistingQuestions(): Promise<{ total: number; migrated: number }> {
    try {
      const response = await fetch('/api/migrate-database', { method: 'POST' });
      if (response.ok) {
        const result = await response.json();
        return { total: result.totalQuestions || 0, migrated: result.migratedCount || 0 };
      }
    } catch (e) {
      console.warn("Server migration endpoint not available, proceeding with client-side admin migration:", e);
    }

    try {
      const snap = await getDocs(collection(db, 'questions'));
      let migrated = 0;
      for (const d of snap.docs) {
        const data = d.data();
        if (data.correctAnswer !== undefined || data.explanation !== undefined) {
          await setDoc(doc(db, 'answerKeys', d.id), {
            questionId: d.id,
            correctAnswer: data.correctAnswer !== undefined ? data.correctAnswer : '',
            explanation: data.explanation || '',
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
          migrated++;
        }
      }
      return { total: snap.size, migrated };
    } catch (e) {
      console.error("Migration error:", e);
      return { total: 0, migrated: 0 };
    }
  }
};

export const questionSetService = {
  async getSets(): Promise<QuestionSet[]> {
    try {
      const snap = await getDocs(collection(db, 'questionSets'));
      const sets: QuestionSet[] = [];
      snap.forEach(d => {
        sets.push({ id: d.id, ...d.data() } as QuestionSet);
      });

      if (sets.length === 0) {
        // Return default practice sets
        return [
          {
            id: 'set-chuong1-basic',
            title: 'Ôn tập Chương 1: Cấu tạo nguyên tử (Cơ bản)',
            description: 'Đánh giá kiến thức hạt nhân, cấu hình e, đồng vị',
            chapterId: 'chuong-1',
            durationMinutes: 15,
            questionIds: ['demo-q1', 'demo-q2', 'demo-q3'],
            totalScore: 10,
            allowReviewAnswers: true,
            createdBy: 'admin',
            creatorEmail: 'muoint@fpt.edu.vn',
            createdAt: new Date().toISOString(),
            isPublic: true
          },
          {
            id: 'set-tonghop-hocky1',
            title: 'Đề tổng hợp Ôn tập Học kỳ 1 - Hóa học 10',
            description: 'Tổng hợp từ Chương 1 đến Chương 4 (8 câu chọn lọc)',
            durationMinutes: 30,
            questionIds: ['demo-q1', 'demo-q2', 'demo-q3', 'demo-q4', 'demo-q5', 'demo-q6', 'demo-q7', 'demo-q8'],
            totalScore: 10,
            allowReviewAnswers: true,
            createdBy: 'admin',
            creatorEmail: 'muoint@fpt.edu.vn',
            createdAt: new Date().toISOString(),
            isPublic: true
          }
        ];
      }
      return sets;
    } catch (e) {
      console.error(e);
      return [];
    }
  },

  async createSet(setData: Omit<QuestionSet, 'id'>): Promise<string> {
    const ref = await addDoc(collection(db, 'questionSets'), {
      ...setData,
      createdAt: new Date().toISOString()
    });
    return ref.id;
  },

  async getSetById(id: string): Promise<QuestionSet | null> {
    if (id === 'set-chuong1-basic') {
      return {
        id: 'set-chuong1-basic',
        title: 'Ôn tập Chương 1: Cấu tạo nguyên tử (Cơ bản)',
        description: 'Đánh giá kiến thức hạt nhân, cấu hình e, đồng vị',
        chapterId: 'chuong-1',
        durationMinutes: 15,
        questionIds: ['demo-q1', 'demo-q2', 'demo-q3'],
        totalScore: 10,
        allowReviewAnswers: true,
        createdBy: 'admin',
        creatorEmail: 'muoint@fpt.edu.vn',
        createdAt: new Date().toISOString(),
        isPublic: true
      };
    }
    if (id === 'set-tonghop-hocky1') {
      return {
        id: 'set-tonghop-hocky1',
        title: 'Đề tổng hợp Ôn tập Học kỳ 1 - Hóa học 10',
        description: 'Tổng hợp từ Chương 1 đến Chương 4 (8 câu chọn lọc)',
        durationMinutes: 30,
        questionIds: ['demo-q1', 'demo-q2', 'demo-q3', 'demo-q4', 'demo-q5', 'demo-q6', 'demo-q7', 'demo-q8'],
        totalScore: 10,
        allowReviewAnswers: true,
        createdBy: 'admin',
        creatorEmail: 'muoint@fpt.edu.vn',
        createdAt: new Date().toISOString(),
        isPublic: true
      };
    }
    try {
      const snap = await getDoc(doc(db, 'questionSets', id));
      if (snap.exists()) {
        return { id: snap.id, ...snap.data() } as QuestionSet;
      }
    } catch (e) {
      console.error(e);
    }
    return null;
  }
};

export const assignmentService = {
  async getAssignments(filter?: { teacherEmail?: string; status?: string }): Promise<Assignment[]> {
    try {
      const snap = await getDocs(collection(db, 'assignments'));
      const list: Assignment[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as Assignment));
      
      let result = list;
      if (result.length === 0) {
        const now = new Date();
        const past = new Date(now.getTime() - 86400000 * 2).toISOString();
        const future = new Date(now.getTime() + 86400000 * 5).toISOString();
        const upcomingFuture = new Date(now.getTime() + 86400000 * 10).toISOString();

        result = [
          {
            id: 'assign-demo-1',
            title: 'Kiểm tra 15 phút - Ôn tập Chương 1: Cấu tạo nguyên tử',
            questionSetId: 'set-chuong1-basic',
            teacherId: 'teacher-1',
            teacherEmail: 'muoint@fpt.edu.vn',
            teacherName: 'Thầy Mười NT',
            targetType: 'CLASS',
            classIds: ['10A1'],
            classId: '10A1',
            className: '10A1 - Hóa học Chuyên & KHTN',
            targetStudentEmails: ['hocsinh1@fpt.edu.vn', 'hocsinh2@fpt.edu.vn', 'hocsinh3@fpt.edu.vn'],
            excludedStudentEmails: [],
            startAt: past,
            openTime: past.split('T')[0],
            endAt: future,
            deadline: future.split('T')[0],
            durationMinutes: 15,
            maxAttempts: 2,
            gradingMode: 'highest',
            shuffleQuestions: true,
            shuffleOptions: true,
            allowBackNavigation: true,
            showAnswers: 'after_submit',
            showSolutions: true,
            showScore: 'immediate',
            isScorePublished: true,
            allowReviewAnswers: true,
            instructions: 'Các em đọc kỹ câu hỏi trước khi chọn đáp án. Bài gồm 3 câu hỏi trắc nghiệm và đúng/sai.',
            status: 'ACTIVE',
            createdAt: past
          },
          {
            id: 'assign-demo-2',
            title: 'Đề tổng hợp Ôn tập Học kỳ 1 - Hóa học 10 (8 câu)',
            questionSetId: 'set-tonghop-hocky1',
            teacherId: 'teacher-1',
            teacherEmail: 'muoint@fpt.edu.vn',
            teacherName: 'Thầy Mười NT',
            targetType: 'CLASS',
            classIds: ['10A1', '10A2'],
            classId: '10A1',
            className: '10A1 & 10A2',
            targetStudentEmails: ['hocsinh1@fpt.edu.vn', 'hocsinh2@fpt.edu.vn', 'hocsinh3@fpt.edu.vn', 'hocsinh4@fpt.edu.vn'],
            excludedStudentEmails: [],
            startAt: future,
            openTime: future.split('T')[0],
            endAt: upcomingFuture,
            deadline: upcomingFuture.split('T')[0],
            durationMinutes: 30,
            maxAttempts: 1,
            gradingMode: 'highest',
            shuffleQuestions: true,
            shuffleOptions: true,
            allowBackNavigation: true,
            showAnswers: 'after_end',
            showSolutions: true,
            showScore: 'manual_publish',
            isScorePublished: false,
            allowReviewAnswers: false,
            instructions: 'Đề thi chuẩn bị cho kỳ thi kết thúc học kỳ 1. Thời gian 30 phút.',
            status: 'SCHEDULED',
            createdAt: now.toISOString()
          }
        ];
      }

      // Compute dynamic status if needed based on GMT+7 local time
      const nowTs = new Date().getTime();
      result = result.map(a => {
        const startTs = a.startAt ? new Date(a.startAt).getTime() : (a.openTime ? new Date(a.openTime).getTime() : 0);
        const endTs = a.endAt ? new Date(a.endAt).getTime() : (a.deadline ? new Date(a.deadline + 'T23:59:59').getTime() : Infinity);
        
        let normalizedStatus = (a.status || 'ACTIVE').toUpperCase() as import('../types').AssignmentStatus;
        if (normalizedStatus === 'ACTIVE' || (a.status as any) === 'active') {
          if (nowTs < startTs) {
            normalizedStatus = 'SCHEDULED';
          } else if (nowTs > endTs) {
            normalizedStatus = 'ENDED';
          } else {
            normalizedStatus = 'ACTIVE';
          }
        }
        return {
          ...a,
          status: (a.status === 'CLOSED' || a.status === 'CANCELLED' || a.status === 'DRAFT') ? a.status : normalizedStatus
        };
      });

      if (filter) {
        if (filter.teacherEmail) {
          result = result.filter(a => a.teacherEmail === filter.teacherEmail);
        }
        if (filter.status) {
          result = result.filter(a => a.status.toUpperCase() === filter.status?.toUpperCase());
        }
      }

      return result.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    } catch (err) {
      console.error("getAssignments error:", err);
      return [];
    }
  },

  async getAssignmentById(id: string): Promise<Assignment | null> {
    try {
      const snap = await getDoc(doc(db, 'assignments', id));
      if (snap.exists()) {
        return { id: snap.id, ...snap.data() } as Assignment;
      }
    } catch (e) {
      console.error(e);
    }
    const all = await this.getAssignments();
    return all.find(a => a.id === id) || null;
  },

  async createAssignment(assignment: Omit<Assignment, 'id'>): Promise<string> {
    const cleanData = {
      ...assignment,
      status: assignment.status || 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const ref = await addDoc(collection(db, 'assignments'), cleanData);
    return ref.id;
  },

  async updateAssignment(id: string, updates: Partial<Assignment>): Promise<void> {
    try {
      const ref = doc(db, 'assignments', id);
      await updateDoc(ref, {
        ...updates,
        updatedAt: new Date().toISOString()
      });
    } catch (e) {
      console.error("updateAssignment error:", e);
    }
  },

  async extendAssignment(id: string, newEndAt: string): Promise<void> {
    await this.updateAssignment(id, {
      endAt: newEndAt,
      deadline: newEndAt.split('T')[0],
      status: 'ACTIVE'
    });
  },

  async closeAssignment(id: string): Promise<void> {
    await this.updateAssignment(id, {
      status: 'CLOSED'
    });
  },

  async cancelAssignment(id: string): Promise<void> {
    await this.updateAssignment(id, {
      status: 'CANCELLED'
    });
  },

  async publishScores(id: string, isScorePublished: boolean): Promise<void> {
    await this.updateAssignment(id, {
      isScorePublished
    });
  },

  async duplicateAssignment(id: string, teacherId?: string, teacherEmail?: string, teacherName?: string): Promise<string> {
    const orig = await this.getAssignmentById(id);
    if (!orig) throw new Error("Assignment not found");

    const now = new Date();
    const future = new Date(now.getTime() + 7 * 86400000).toISOString();

    const { id: _, ...rest } = orig;
    const newAssignment: Omit<Assignment, 'id'> = {
      ...rest,
      title: `${orig.title} (Bản sao)`,
      teacherId: teacherId || orig.teacherId,
      teacherEmail: teacherEmail || orig.teacherEmail,
      teacherName: teacherName || orig.teacherName,
      startAt: now.toISOString(),
      openTime: now.toISOString().split('T')[0],
      endAt: future,
      deadline: future.split('T')[0],
      status: 'ACTIVE',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };

    return await this.createAssignment(newAssignment);
  },

  async getAssignmentsForStudent(studentEmail: string, studentClassId?: string): Promise<Assignment[]> {
    const all = await this.getAssignments();
    return all.filter(a => {
      // Don't show DRAFT or CANCELLED to students
      if (a.status === 'DRAFT') return false;

      // Excluded student check
      if (a.excludedStudentEmails && a.excludedStudentEmails.includes(studentEmail)) {
        return false;
      }

      // Check if targeted specifically to this student
      if (a.targetStudentEmails && a.targetStudentEmails.includes(studentEmail)) {
        return true;
      }

      // Check if targeted to student's class
      if (studentClassId) {
        if (a.classIds && a.classIds.includes(studentClassId)) return true;
        if (a.classId === studentClassId) return true;
      }

      // Fallback for demo classes
      if (a.classId === '10A1' || (a.classIds && a.classIds.includes('10A1'))) {
        return true;
      }

      return false;
    });
  }
};

export const submissionService = {
  // Server-side Grading: Grades submission without exposing answer keys to client
  async submitAndGradeOnline(payload: {
    assignmentId?: string;
    questionSetId?: string;
    questionSetTitle?: string;
    studentId: string;
    studentEmail: string;
    studentName: string;
    studentClass: string;
    attemptNumber: number;
    durationSeconds: number;
    answers: Record<string, any>;
    questionIds: string[];
  }): Promise<{
    submissionId: string;
    score: number;
    correctCount: number;
    wrongCount: number;
    totalQuestions: number;
    details: any[];
  }> {
    try {
      const response = await fetch('/api/grade-submission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const result = await response.json();
        const pastAttempts = payload.assignmentId ? await this.getStudentAssignmentSubmissions(payload.studentEmail, payload.assignmentId) : [];
        const attemptNum = payload.attemptNumber || (pastAttempts.length + 1);

        const submissionData: Omit<Submission, 'id'> = {
          assignmentId: payload.assignmentId || '',
          questionSetId: payload.questionSetId,
          questionSetTitle: payload.questionSetTitle || 'Bài kiểm tra Hóa 10',
          studentId: payload.studentId,
          studentEmail: payload.studentEmail,
          studentName: payload.studentName,
          studentClass: payload.studentClass,
          attemptNumber: attemptNum,
          startedAt: new Date().toISOString(),
          submittedAt: new Date().toISOString(),
          durationSeconds: payload.durationSeconds,
          answers: payload.answers,
          score: result.score,
          totalQuestions: result.totalQuestions,
          correctCount: result.correctCount,
          incorrectCount: result.wrongCount,
          wrongCount: result.wrongCount,
          details: result.details,
          status: 'submitted'
        };

        const subId = await this.saveSubmission(submissionData);
        return {
          submissionId: subId,
          score: result.score,
          correctCount: result.correctCount,
          wrongCount: result.wrongCount,
          totalQuestions: result.totalQuestions,
          details: result.details
        };
      } else {
        throw new Error(`Server grading status: ${response.status}`);
      }
    } catch (err) {
      console.warn("Server grading unavailable, falling back to local handler:", err);
      // Client-side fallback for offline demo questions
      const pastAttempts = payload.assignmentId ? await this.getStudentAssignmentSubmissions(payload.studentEmail, payload.assignmentId) : [];
      const attemptNum = payload.attemptNumber || (pastAttempts.length + 1);

      let correctCount = 0;
      const details = payload.questionIds.map(qId => {
        const stuAns = payload.answers[qId];
        const demo = DEMO_QUESTIONS.find(d => d.id === qId);
        const ca = demo?.correctAnswer || 'A';
        const isCorrect = String(stuAns).trim().toUpperCase() === String(ca).trim().toUpperCase();
        if (isCorrect) correctCount++;
        return {
          questionId: qId,
          isCorrect,
          studentAnswer: stuAns || null,
          correctAnswer: ca,
          explanation: demo?.explanation || '',
          score: isCorrect ? (10 / payload.questionIds.length) : 0
        };
      });

      const finalScore = Number(((correctCount / (payload.questionIds.length || 1)) * 10).toFixed(1));
      const submissionData: Omit<Submission, 'id'> = {
        assignmentId: payload.assignmentId || '',
        questionSetId: payload.questionSetId,
        questionSetTitle: payload.questionSetTitle || 'Bài kiểm tra Hóa 10',
        studentId: payload.studentId,
        studentEmail: payload.studentEmail,
        studentName: payload.studentName,
        studentClass: payload.studentClass,
        attemptNumber: attemptNum,
        startedAt: new Date().toISOString(),
        submittedAt: new Date().toISOString(),
        durationSeconds: payload.durationSeconds,
        answers: payload.answers,
        score: finalScore,
        totalQuestions: payload.questionIds.length,
        correctCount,
        incorrectCount: payload.questionIds.length - correctCount,
        wrongCount: payload.questionIds.length - correctCount,
        details,
        status: 'submitted'
      };

      const subId = await this.saveSubmission(submissionData);
      return {
        submissionId: subId,
        score: finalScore,
        correctCount,
        wrongCount: payload.questionIds.length - correctCount,
        totalQuestions: payload.questionIds.length,
        details
      };
    }
  },

  async saveSubmission(sub: Omit<Submission, 'id'>): Promise<string> {
    try {
      const pastAttempts = sub.assignmentId ? await this.getStudentAssignmentSubmissions(sub.studentEmail, sub.assignmentId) : [];
      const attemptNumber = (sub.attemptNumber || pastAttempts.length + 1);

      const payload = {
        ...sub,
        attemptNumber,
        submittedAt: new Date().toISOString()
      };

      const ref = await addDoc(collection(db, 'submissions'), payload);
      return ref.id;
    } catch (e) {
      console.error("Save submission error:", e);
      return 'sub-' + Date.now();
    }
  },

  async getSubmissionsByStudent(studentEmail: string): Promise<Submission[]> {
    try {
      const q = query(collection(db, 'submissions'), where('studentEmail', '==', studentEmail));
      const snap = await getDocs(q);
      const list: Submission[] = [];
      snap.forEach(d => {
        list.push({ id: d.id, ...d.data() } as Submission);
      });
      return list.sort((a, b) => new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime());
    } catch (e) {
      console.warn("Direct query error, attempting fallback:", e);
      try {
        const snap = await getDocs(collection(db, 'submissions'));
        const list: Submission[] = [];
        snap.forEach(d => {
          const item = { id: d.id, ...d.data() } as Submission;
          if (item.studentEmail === studentEmail) {
            list.push(item);
          }
        });
        return list.sort((a, b) => new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime());
      } catch (err) {
        console.error(err);
        return [];
      }
    }
  },

  async getSubmissionsByAssignment(assignmentId: string): Promise<Submission[]> {
    try {
      const q = query(collection(db, 'submissions'), where('assignmentId', '==', assignmentId));
      const snap = await getDocs(q);
      const list: Submission[] = [];
      snap.forEach(d => {
        list.push({ id: d.id, ...d.data() } as Submission);
      });
      return list.sort((a, b) => new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime());
    } catch (e) {
      console.warn("Assignment query error, attempting fallback:", e);
      try {
        const snap = await getDocs(collection(db, 'submissions'));
        const list: Submission[] = [];
        snap.forEach(d => {
          const item = { id: d.id, ...d.data() } as Submission;
          if (item.assignmentId === assignmentId) {
            list.push(item);
          }
        });
        return list.sort((a, b) => new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime());
      } catch (err) {
        console.error(err);
        return [];
      }
    }
  },

  async getStudentAssignmentSubmissions(studentEmail: string, assignmentId: string): Promise<Submission[]> {
    try {
      const q = query(
        collection(db, 'submissions'), 
        where('studentEmail', '==', studentEmail),
        where('assignmentId', '==', assignmentId)
      );
      const snap = await getDocs(q);
      const list: Submission[] = [];
      snap.forEach(d => {
        list.push({ id: d.id, ...d.data() } as Submission);
      });
      return list.sort((a, b) => new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime());
    } catch (e) {
      const list = await this.getSubmissionsByStudent(studentEmail);
      return list.filter(s => s.assignmentId === assignmentId);
    }
  },

  async getAllSubmissions(): Promise<Submission[]> {
    try {
      const snap = await getDocs(collection(db, 'submissions'));
      const list: Submission[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as Submission));
      return list.sort((a, b) => new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime());
    } catch (e) {
      console.error(e);
      return [];
    }
  }
};

export const classService = {
  async getClasses(filter?: { teacherEmail?: string; status?: string }): Promise<ClassRoom[]> {
    try {
      const snap = await getDocs(collection(db, 'classes'));
      const list: ClassRoom[] = [];
      snap.forEach(d => {
        const item = { id: d.id, ...d.data() } as ClassRoom;
        list.push(item);
      });

      if (list.length === 0) {
        // Seed initial default classes so teacher and students have realistic rich data
        const default10A1: ClassRoom = {
          id: '10A1',
          name: '10A1 - Hóa học Chuyên & KHTN',
          grade: 10,
          subject: 'Hóa học',
          academicYear: '2026 - 2027',
          teacherEmail: 'muoint@fpt.edu.vn',
          teacherName: 'Thầy Mười NT',
          studentEmails: [
            'student.hoa10@fpt.edu.vn',
            'hocsinh1@fpt.edu.vn',
            'hocsinh2@fpt.edu.vn',
            'hocsinh3@fpt.edu.vn',
            'nguyenvana@fpt.edu.vn',
            'tranthib@fpt.edu.vn',
            'levanc@fpt.edu.vn',
            'phamthid@fpt.edu.vn',
            'hoanganh@fpt.edu.vn'
          ],
          studentCount: 35,
          status: 'ACTIVE',
          description: 'Lớp chuyên ban Khoa học Tự nhiên & Hóa học ứng dụng',
          createdAt: new Date().toISOString()
        };

        const default10A2: ClassRoom = {
          id: '10A2',
          name: '10A2 - Hóa học Cơ bản',
          grade: 10,
          subject: 'Hóa học',
          academicYear: '2026 - 2027',
          teacherEmail: 'muoint@fpt.edu.vn',
          teacherName: 'Thầy Mười NT',
          studentEmails: [
            'hocsinh4@fpt.edu.vn',
            'hocsinh5@fpt.edu.vn',
            'dangthie@fpt.edu.vn',
            'vovanf@fpt.edu.vn'
          ],
          studentCount: 38,
          status: 'ACTIVE',
          description: 'Lớp Hóa học đại trà THPT FPT',
          createdAt: new Date().toISOString()
        };

        // Try writing seed to firestore
        try {
          await setDoc(doc(db, 'classes', '10A1'), default10A1);
          await setDoc(doc(db, 'classes', '10A2'), default10A2);
        } catch (e) {
          console.warn("Could not seed default classes to firestore:", e);
        }

        return [default10A1, default10A2];
      }

      let result = list;
      if (filter) {
        if (filter.teacherEmail) {
          result = result.filter(c => c.teacherEmail === filter.teacherEmail);
        }
        if (filter.status) {
          result = result.filter(c => (c.status || 'ACTIVE') === filter.status);
        }
      }

      return result.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } catch (e) {
      console.error("getClasses error:", e);
      return [];
    }
  },

  async getClassById(id: string): Promise<ClassRoom | null> {
    try {
      const snap = await getDoc(doc(db, 'classes', id));
      if (snap.exists()) {
        return { id: snap.id, ...snap.data() } as ClassRoom;
      }
    } catch (e) {
      console.error("getClassById error:", e);
    }
    const all = await this.getClasses();
    return all.find(c => c.id === id) || null;
  },

  async createClass(cls: Omit<ClassRoom, 'id'>): Promise<string> {
    // Check duplicate class name in same academic year & subject
    const existing = await this.getClasses();
    const normalizedName = cls.name.trim().toLowerCase();
    const normalizedYear = (cls.academicYear || '2026 - 2027').trim().toLowerCase();
    const isDuplicate = existing.some(
      c => c.name.trim().toLowerCase() === normalizedName &&
           (c.academicYear || '2026 - 2027').trim().toLowerCase() === normalizedYear &&
           (c.status || 'ACTIVE') !== 'ARCHIVED'
    );

    if (isDuplicate) {
      throw new Error(`Lớp "${cls.name}" đã tồn tại trong năm học ${cls.academicYear || '2026 - 2027'}. Vui lòng kiểm tra lại!`);
    }

    const cleanData: Omit<ClassRoom, 'id'> = {
      ...cls,
      grade: Number(cls.grade) || 10,
      subject: cls.subject || 'Hóa học',
      academicYear: cls.academicYear || '2026 - 2027',
      studentEmails: cls.studentEmails || [],
      studentCount: cls.studentEmails ? cls.studentEmails.length : (cls.studentCount || 0),
      status: cls.status || 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const ref = await addDoc(collection(db, 'classes'), cleanData);
    return ref.id;
  },

  async updateClass(id: string, updates: Partial<ClassRoom>): Promise<void> {
    try {
      const ref = doc(db, 'classes', id);
      await updateDoc(ref, {
        ...updates,
        updatedAt: new Date().toISOString()
      });
    } catch (e) {
      console.error("updateClass error:", e);
      throw e;
    }
  },

  async archiveClass(id: string, performedBy?: { uid: string; email: string }): Promise<void> {
    await this.updateClass(id, { status: 'ARCHIVED' });
    if (performedBy) {
      await this.logClassOperation({
        action: 'ARCHIVE_CLASS',
        performedBy: performedBy.uid,
        performedByEmail: performedBy.email,
        classId: id,
        className: id,
        createdAt: new Date().toISOString()
      });
    }
  },

  async restoreClass(id: string): Promise<void> {
    await this.updateClass(id, { status: 'ACTIVE' });
  },

  // Helper to parse emails & names from multiple formats (plain emails, Name | email, Name <email>, comma/semicolon/newline, copied Excel column)
  async parseAndAnalyzeStudentBatch(
    classId: string,
    rawText: string
  ): Promise<BulkImportReport> {
    const cls = await this.getClassById(classId);
    const existingClassEmails = new Set((cls?.studentEmails || []).map(e => e.toLowerCase().trim()));

    // Fetch all existing users from users collection to check account existence & grab displayName
    let systemUsers: UserProfile[] = [];
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      usersSnap.forEach(d => systemUsers.push({ uid: d.id, ...d.data() } as UserProfile));
    } catch (err) {
      console.warn("Could not fetch users for lookup, fallback to demo mapping:", err);
    }

    const systemUserMap = new Map<string, UserProfile>();
    systemUsers.forEach(u => {
      if (u.email) {
        systemUserMap.set(u.email.toLowerCase().trim(), u);
      }
    });

    // Also include demo users mapping
    if (!systemUserMap.has('student.hoa10@fpt.edu.vn')) {
      systemUserMap.set('student.hoa10@fpt.edu.vn', {
        uid: 'demo_student_1',
        email: 'student.hoa10@fpt.edu.vn',
        displayName: 'Nguyễn Văn An (Học sinh mẫu)',
        role: 'student',
        createdAt: new Date().toISOString()
      });
    }

    // Split input by newlines first
    const rawLines = rawText
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(Boolean);

    // If only one line but contains multiple commas or semicolons, split by delimiter
    let lines: string[] = [];
    rawLines.forEach(line => {
      // Ignore header lines like "STT", "Họ và tên", "Email", "Họ tên | Email"
      const lower = line.toLowerCase();
      if (
        lower === 'email' || 
        lower === 'stt' || 
        lower.startsWith('họ và tên') || 
        lower.startsWith('họ tên') ||
        lower.startsWith('stt\t')
      ) {
        return;
      }

      if (line.includes('\t')) {
        // Tab-separated from Excel (e.g. "1 \t Nguyễn Văn A \t nguyenvana@fpt.edu.vn")
        lines.push(line);
      } else if ((line.includes(',') || line.includes(';')) && !line.includes('@') && !line.includes('|')) {
        // Delimited list
        const parts = line.split(/[,;]/).map(p => p.trim()).filter(Boolean);
        lines.push(...parts);
      } else {
        lines.push(line);
      }
    });

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const items: BulkStudentParsedItem[] = [];
    const seenEmailsInCurrentBatch = new Set<string>();

    lines.forEach((line, index) => {
      let extractedEmail = '';
      let extractedName = '';

      // Pattern 1: Tab separated (Excel copy) e.g. "Nguyễn Văn A \t nguyenvana@fpt.edu.vn" or "1 \t Nguyễn Văn A \t email"
      if (line.includes('\t')) {
        const parts = line.split('\t').map(p => p.trim()).filter(Boolean);
        for (const p of parts) {
          if (emailRegex.test(p)) {
            extractedEmail = p;
          } else if (isNaN(Number(p)) && p.length > 1) {
            extractedName = p;
          }
        }
      } 
      // Pattern 2: Pipe separated e.g. "Nguyễn Văn A | nguyenvana@fpt.edu.vn" or "nguyenvana@fpt.edu.vn | Nguyễn Văn A"
      else if (line.includes('|')) {
        const parts = line.split('|').map(p => p.trim()).filter(Boolean);
        if (emailRegex.test(parts[0])) {
          extractedEmail = parts[0];
          extractedName = parts[1] || '';
        } else if (emailRegex.test(parts[1])) {
          extractedEmail = parts[1];
          extractedName = parts[0] || '';
        } else {
          extractedEmail = parts[0];
          extractedName = parts[1] || '';
        }
      }
      // Pattern 3: Name <email@domain.com>
      else if (line.includes('<') && line.includes('>')) {
        const match = line.match(/(.*?)\s*<([^>]+)>/);
        if (match) {
          extractedName = match[1].trim();
          extractedEmail = match[2].trim();
        }
      }
      // Pattern 4: Comma or Semicolon separated name and email (e.g. "Nguyễn Văn A, nguyenvana@fpt.edu.vn")
      else if ((line.includes(',') || line.includes(';')) && line.includes('@')) {
        const parts = line.split(/[,;]/).map(p => p.trim()).filter(Boolean);
        for (const p of parts) {
          if (emailRegex.test(p)) {
            extractedEmail = p;
          } else if (isNaN(Number(p)) && p.length > 1) {
            extractedName = p;
          }
        }
      }
      // Pattern 5: Plain string (single email or name + email space separated)
      else {
        const parts = line.split(/\s+/).map(p => p.trim()).filter(Boolean);
        const emailPart = parts.find(p => emailRegex.test(p) || p.includes('@'));
        if (emailPart) {
          extractedEmail = emailPart;
          const nameParts = parts.filter(p => p !== emailPart && isNaN(Number(p)));
          if (nameParts.length > 0) {
            extractedName = nameParts.join(' ');
          }
        } else {
          extractedEmail = line;
        }
      }

      // Clean & normalize email
      extractedEmail = extractedEmail.replace(/["'<>]/g, '').trim().toLowerCase();

      // Check validation
      const id = `parsed-item-${index + 1}-${Date.now()}`;
      const isFormatValid = emailRegex.test(extractedEmail);

      if (!isFormatValid) {
        items.push({
          id,
          rawInput: line,
          email: extractedEmail,
          displayName: extractedName || 'Chưa xác định',
          status: 'INVALID_EMAIL',
          statusMessage: 'Email không đúng định dạng chuẩn (RFC-5322)',
          userExistsInSystem: false,
          selected: false
        });
        return;
      }

      // Check if duplicate within this paste batch
      if (seenEmailsInCurrentBatch.has(extractedEmail)) {
        items.push({
          id,
          rawInput: line,
          email: extractedEmail,
          displayName: extractedName || 'Trùng lặp trong danh sách',
          status: 'ALREADY_IN_CLASS',
          statusMessage: 'Email bị trùng lặp trong nội dung vừa dán',
          userExistsInSystem: false,
          selected: false
        });
        return;
      }
      seenEmailsInCurrentBatch.add(extractedEmail);

      // Check if already in class
      if (existingClassEmails.has(extractedEmail)) {
        items.push({
          id,
          rawInput: line,
          email: extractedEmail,
          displayName: extractedName || systemUserMap.get(extractedEmail)?.displayName || 'Học sinh trong lớp',
          status: 'ALREADY_IN_CLASS',
          statusMessage: `Học sinh đã có trong lớp ${cls?.name || classId}`,
          userExistsInSystem: true,
          selected: false
        });
        return;
      }

      // Check if user exists in system but not in this class
      const existingUser = systemUserMap.get(extractedEmail);
      if (existingUser) {
        items.push({
          id,
          rawInput: line,
          email: extractedEmail,
          displayName: existingUser.displayName || extractedName || extractedEmail.split('@')[0],
          status: 'EXISTING_USER_NEW_TO_CLASS',
          statusMessage: 'Tài khoản đã tồn tại trong hệ thống (Sẵn sàng thêm vào lớp)',
          userExistsInSystem: true,
          selected: true
        });
        return;
      }

      // New account needed
      const autoGenName = extractedName || (
        extractedEmail.split('@')[0]
          .split(/[._-]/)
          .map(part => part.charAt(0).toUpperCase() + part.slice(1))
          .join(' ')
      );

      items.push({
        id,
        rawInput: line,
        email: extractedEmail,
        displayName: autoGenName,
        status: 'NEW_ACCOUNT_NEEDED',
        statusMessage: 'Email hợp lệ - Sẽ tạo hồ sơ học sinh liên kết lớp',
        userExistsInSystem: false,
        selected: true
      });
    });

    const validCount = items.filter(i => i.status === 'VALID' || i.status === 'EXISTING_USER_NEW_TO_CLASS' || i.status === 'NEW_ACCOUNT_NEEDED').length;
    const alreadyInClassCount = items.filter(i => i.status === 'ALREADY_IN_CLASS').length;
    const invalidEmailCount = items.filter(i => i.status === 'INVALID_EMAIL').length;
    const newAccountCount = items.filter(i => i.status === 'NEW_ACCOUNT_NEEDED').length;

    return {
      total: items.length,
      validCount,
      alreadyInClassCount,
      invalidEmailCount,
      newAccountCount,
      items
    };
  },

  // Bulk add students to class with safe database batching and audit logging
  async bulkAddStudentsToClass(
    classId: string,
    studentsToAdd: { email: string; displayName?: string }[],
    performedBy: { uid: string; email: string }
  ): Promise<{
    success: number;
    duplicate: number;
    invalid: number;
    failed: number;
    newTotal: number;
  }> {
    const cls = await this.getClassById(classId);
    if (!cls) throw new Error("Không tìm thấy lớp học!");

    const currentEmails = new Set((cls.studentEmails || []).map(e => e.toLowerCase().trim()));
    const validEmailsToAdd: string[] = [];
    let successCount = 0;
    let duplicateCount = 0;
    let failedCount = 0;

    for (const student of studentsToAdd) {
      const email = (student.email || '').toLowerCase().trim();
      if (!email || !email.includes('@')) {
        continue;
      }

      if (currentEmails.has(email)) {
        duplicateCount++;
        continue;
      }

      try {
        // Ensure student profile exists in 'users' collection without plain password
        const userDocRef = doc(db, 'users', `student_${email.replace(/[@.]/g, '_')}`);
        const userSnap = await getDoc(userDocRef);

        if (!userSnap.exists()) {
          const autoName = student.displayName || (
            email.split('@')[0]
              .split(/[._-]/)
              .map(p => p.charAt(0).toUpperCase() + p.slice(1))
              .join(' ')
          );

          await setDoc(userDocRef, {
            email,
            displayName: autoName,
            role: 'student',
            classId,
            school: 'THPT FPT',
            createdAt: new Date().toISOString()
          }, { merge: true });
        } else {
          // Update classId for existing student user
          await updateDoc(userDocRef, {
            classId,
            updatedAt: new Date().toISOString()
          });
        }

        validEmailsToAdd.push(email);
        currentEmails.add(email);
        successCount++;
      } catch (err) {
        console.error("Error creating student record for:", email, err);
        failedCount++;
      }
    }

    const updatedStudentEmails = Array.from(currentEmails);
    const updatedCount = updatedStudentEmails.length;

    // Update class doc
    await this.updateClass(classId, {
      studentEmails: updatedStudentEmails,
      studentCount: updatedCount
    });

    // Write audit log
    await this.logClassOperation({
      action: 'BULK_ADD_STUDENTS',
      performedBy: performedBy.uid,
      performedByEmail: performedBy.email,
      classId,
      className: cls.name,
      total: studentsToAdd.length,
      success: successCount,
      duplicate: duplicateCount,
      invalid: 0,
      failed: failedCount,
      details: { addedCount: validEmailsToAdd.length },
      createdAt: new Date().toISOString()
    });

    return {
      success: successCount,
      duplicate: duplicateCount,
      invalid: 0,
      failed: failedCount,
      newTotal: updatedCount
    };
  },

  // Remove student from class without deleting Firebase Auth account or submissions
  async removeStudentFromClass(
    classId: string,
    studentEmail: string,
    performedBy: { uid: string; email: string }
  ): Promise<void> {
    const cls = await this.getClassById(classId);
    if (!cls) throw new Error("Không tìm thấy lớp học!");

    const normalizedEmail = studentEmail.toLowerCase().trim();
    const updatedEmails = (cls.studentEmails || []).filter(e => e.toLowerCase().trim() !== normalizedEmail);

    await this.updateClass(classId, {
      studentEmails: updatedEmails,
      studentCount: updatedEmails.length
    });

    await this.logClassOperation({
      action: 'REMOVE_STUDENT',
      performedBy: performedBy.uid,
      performedByEmail: performedBy.email,
      classId,
      className: cls.name,
      details: { removedStudentEmail: studentEmail },
      createdAt: new Date().toISOString()
    });
  },

  // Transfer student between classes, preserving all history and submissions
  async transferStudent(
    fromClassId: string,
    toClassId: string,
    studentEmail: string,
    performedBy: { uid: string; email: string }
  ): Promise<void> {
    const fromClass = await this.getClassById(fromClassId);
    const toClass = await this.getClassById(toClassId);
    if (!fromClass || !toClass) throw new Error("Không tìm thấy lớp học nguồn hoặc lớp học đích!");

    const normalizedEmail = studentEmail.toLowerCase().trim();

    // 1. Remove from source class
    const newFromEmails = (fromClass.studentEmails || []).filter(e => e.toLowerCase().trim() !== normalizedEmail);
    await this.updateClass(fromClassId, {
      studentEmails: newFromEmails,
      studentCount: newFromEmails.length
    });

    // 2. Add to destination class
    const targetSet = new Set((toClass.studentEmails || []).map(e => e.toLowerCase().trim()));
    targetSet.add(normalizedEmail);
    const newToEmails = Array.from(targetSet);
    await this.updateClass(toClassId, {
      studentEmails: newToEmails,
      studentCount: newToEmails.length
    });

    // 3. Update student user record
    try {
      const userDocRef = doc(db, 'users', `student_${normalizedEmail.replace(/[@.]/g, '_')}`);
      await setDoc(userDocRef, {
        classId: toClassId,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (e) {
      console.warn("Could not update student user classId:", e);
    }

    // 4. Log transfer
    await this.logClassOperation({
      action: 'TRANSFER_STUDENT',
      performedBy: performedBy.uid,
      performedByEmail: performedBy.email,
      classId: toClassId,
      className: `${fromClass.name} → ${toClass.name}`,
      details: {
        studentEmail,
        fromClassId,
        toClassId,
        fromClassName: fromClass.name,
        toClassName: toClass.name
      },
      createdAt: new Date().toISOString()
    });
  },

  // Get full enriched students list with statistics for a class
  async getStudentsWithStatsForClass(classId: string): Promise<StudentInClass[]> {
    const cls = await this.getClassById(classId);
    if (!cls) return [];

    const studentEmails = cls.studentEmails || [];
    
    // Fetch users for displayName and profile
    let systemUsers: UserProfile[] = [];
    try {
      const snap = await getDocs(collection(db, 'users'));
      snap.forEach(d => systemUsers.push({ uid: d.id, ...d.data() } as UserProfile));
    } catch (err) {
      console.warn("Error fetching users for student list:", err);
    }

    const userMap = new Map<string, UserProfile>();
    systemUsers.forEach(u => {
      if (u.email) userMap.set(u.email.toLowerCase().trim(), u);
    });

    // Fetch submissions
    const allSubs = await submissionService.getAllSubmissions();
    const classAssignments = await assignmentService.getAssignments();
    const totalClassAssignmentsCount = classAssignments.filter(a => 
      a.classId === classId || (a.classIds && a.classIds.includes(classId))
    ).length;

    const result: StudentInClass[] = studentEmails.map(email => {
      const normEmail = email.toLowerCase().trim();
      const user = userMap.get(normEmail);
      
      const studentSubs = allSubs.filter(s => s.studentEmail.toLowerCase().trim() === normEmail);
      const subCount = studentSubs.length;
      const avgScore = subCount > 0
        ? Number((studentSubs.reduce((acc, curr) => acc + (curr.score || 0), 0) / subCount).toFixed(1))
        : 0;

      const completedCount = new Set(studentSubs.map(s => s.assignmentId || s.questionSetId)).size;
      const pendingCount = Math.max(0, totalClassAssignmentsCount - completedCount);
      const latestSub = studentSubs[0];

      const name = user?.displayName || (
        normEmail.split('@')[0]
          .split(/[._-]/)
          .map(p => p.charAt(0).toUpperCase() + p.slice(1))
          .join(' ')
      );

      return {
        uid: user?.uid,
        email: normEmail,
        displayName: name,
        status: user ? 'ACTIVE' : 'PENDING',
        joinedAt: user?.createdAt || cls.createdAt,
        submissionsCount: subCount,
        avgScore,
        completedCount,
        pendingCount,
        latestScore: latestSub?.score,
        lastActiveAt: latestSub?.submittedAt
      };
    });

    return result;
  },

  // Save audit log to classLogs collection
  async logClassOperation(log: ClassOperationLog): Promise<string> {
    try {
      const ref = await addDoc(collection(db, 'classLogs'), {
        ...log,
        createdAt: new Date().toISOString()
      });
      return ref.id;
    } catch (e) {
      console.warn("Could not log class operation to firestore, save to local cache:", e);
      const cached = JSON.parse(localStorage.getItem('chem10_class_logs') || '[]');
      const newEntry = { id: 'log-' + Date.now(), ...log, createdAt: new Date().toISOString() };
      localStorage.setItem('chem10_class_logs', JSON.stringify([newEntry, ...cached]));
      return newEntry.id;
    }
  },

  // Get class audit logs
  async getClassLogs(classId: string): Promise<ClassOperationLog[]> {
    try {
      const snap = await getDocs(collection(db, 'classLogs'));
      const list: ClassOperationLog[] = [];
      snap.forEach(d => {
        const item = { id: d.id, ...d.data() } as ClassOperationLog;
        if (item.classId === classId || item.classId === 'ALL') {
          list.push(item);
        }
      });
      if (list.length > 0) {
        return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
    } catch (e) {
      console.warn("getClassLogs firestore error fallback:", e);
    }
    const cached = JSON.parse(localStorage.getItem('chem10_class_logs') || '[]');
    return cached.filter((l: any) => l.classId === classId || l.classId === 'ALL');
  }
};

export const wordImportService = {
  async saveHistory(record: Omit<import('../types').WordImportHistoryRecord, 'id'>): Promise<string> {
    try {
      const ref = await addDoc(collection(db, 'wordImportHistory'), {
        ...record,
        importedAt: new Date().toISOString()
      });
      return ref.id;
    } catch (e) {
      console.warn("Save history fallback to localStorage:", e);
      const local = JSON.parse(localStorage.getItem('chem10_word_import_history') || '[]');
      const newRec = { id: 'hist-' + Date.now(), ...record, importedAt: new Date().toISOString() };
      localStorage.setItem('chem10_word_import_history', JSON.stringify([newRec, ...local]));
      return newRec.id;
    }
  },

  async getHistory(): Promise<import('../types').WordImportHistoryRecord[]> {
    try {
      const snap = await getDocs(collection(db, 'wordImportHistory'));
      const list: import('../types').WordImportHistoryRecord[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as import('../types').WordImportHistoryRecord));
      if (list.length > 0) {
        return list.sort((a, b) => new Date(b.importedAt).getTime() - new Date(a.importedAt).getTime());
      }
    } catch (e) {
      console.warn("Get history from firestore fallback:", e);
    }
    const local = JSON.parse(localStorage.getItem('chem10_word_import_history') || '[]');
    return local;
  }
};

