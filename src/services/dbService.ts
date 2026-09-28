import { 
  db, 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  getDocs, 
  query, 
  where, 
  documentId,
  addDoc, 
  updateDoc, 
  deleteDoc, 
  writeBatch,
  serverTimestamp,
  sanitizeFirestoreData,
  onSnapshot
} from '../lib/firebase';
import { 
  normalizeChapterId, 
  DEFAULT_CHEMISTRY_QUESTIONS, 
  getDefaultQuestionsForChapter, 
  getChapterTitle, 
  CHEMISTRY_10_CURRICULUM 
} from '../data/curriculum';
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
  UserProfile,
  BulkImportAuditResult,
  BulkImportAuditError,
  ChapterPracticeConfig
} from '../types';

const DELETED_QUESTION_IDS_KEY = 'chem10_deleted_question_ids';
const CUSTOM_QUESTIONS_STORAGE_KEY = 'chem10_custom_questions_store';
const CUSTOM_SETS_STORAGE_KEY = 'chem10_custom_sets_store';

export function getDeletedQuestionIds(): Set<string> {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(DELETED_QUESTION_IDS_KEY) : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return new Set(parsed);
      }
    }
  } catch (e) {
    console.warn("Could not read deleted question ids from storage:", e);
  }
  return new Set();
}

export function addDeletedQuestionIds(ids: string[]): void {
  try {
    if (typeof window === 'undefined' || !ids || ids.length === 0) return;
    const current = getDeletedQuestionIds();
    ids.forEach(id => {
      if (id && typeof id === 'string' && id.trim()) {
        current.add(id.trim());
      }
    });
    localStorage.setItem(DELETED_QUESTION_IDS_KEY, JSON.stringify(Array.from(current)));
  } catch (e) {
    console.warn("Could not persist deleted question ids:", e);
  }
}

export function getLocalCustomQuestions(): Question[] {
  try {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem(CUSTOM_QUESTIONS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn("Could not read local custom questions:", e);
  }
  return [];
}

export function saveLocalCustomQuestions(questions: Question[]): void {
  try {
    if (typeof window === 'undefined' || !questions || questions.length === 0) return;
    const current = getLocalCustomQuestions();
    const map = new Map<string, Question>();
    current.forEach(q => map.set(q.id, q));
    questions.forEach(q => map.set(q.id, q));
    localStorage.setItem(CUSTOM_QUESTIONS_STORAGE_KEY, JSON.stringify(Array.from(map.values())));
  } catch (e) {
    console.warn("Could not persist local custom questions:", e);
  }
}

export function removeLocalCustomQuestion(id: string): void {
  try {
    if (typeof window === 'undefined' || !id) return;
    const current = getLocalCustomQuestions().filter(q => q.id !== id);
    localStorage.setItem(CUSTOM_QUESTIONS_STORAGE_KEY, JSON.stringify(current));
  } catch (e) {
    console.warn("Could not remove local custom question:", e);
  }
}

export function getLocalCustomQuestionSets(): QuestionSet[] {
  try {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem(CUSTOM_SETS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn("Could not read local custom question sets:", e);
  }
  return [];
}

export function saveLocalCustomQuestionSet(set: QuestionSet): void {
  try {
    if (typeof window === 'undefined' || !set || !set.id) return;
    const current = getLocalCustomQuestionSets();
    const map = new Map<string, QuestionSet>();
    current.forEach(s => map.set(s.id, s));
    map.set(set.id, set);
    localStorage.setItem(CUSTOM_SETS_STORAGE_KEY, JSON.stringify(Array.from(map.values())));
  } catch (e) {
    console.warn("Could not persist local custom question set:", e);
  }
}

export function removeLocalCustomQuestionSet(id: string): void {
  try {
    if (typeof window === 'undefined' || !id) return;
    const current = getLocalCustomQuestionSets().filter(s => s.id !== id);
    localStorage.setItem(CUSTOM_SETS_STORAGE_KEY, JSON.stringify(current));
  } catch (e) {
    console.warn("Could not remove local custom question set:", e);
  }
}

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

      // Merge with locally persisted custom questions
      const localCustom = getLocalCustomQuestions();
      const questionMap = new Map<string, Question>();
      localCustom.forEach(q => questionMap.set(q.id, q));
      list.forEach(q => questionMap.set(q.id, q));
      list = Array.from(questionMap.values());

      const deletedIds = getDeletedQuestionIds();
      list = list.filter(q => !deletedIds.has(q.id));

      // Apply client-side filters for maximum flexibility
      if (filter) {
        if (filter.chapterId) {
          const targetChap = normalizeChapterId(filter.chapterId);
          list = list.filter(q => normalizeChapterId(q.chapterId) === targetChap);
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

      if (list.length === 0) {
        let fallbackList = filter?.chapterId 
          ? getDefaultQuestionsForChapter(filter.chapterId) 
          : DEFAULT_CHEMISTRY_QUESTIONS;
        const deletedIds = getDeletedQuestionIds();
        fallbackList = fallbackList.filter(q => !deletedIds.has(q.id));
        if (filter?.type) fallbackList = fallbackList.filter(q => q.type === filter.type);
        if (filter?.level) fallbackList = fallbackList.filter(q => q.level === filter.level);
        return fallbackList;
      }

      return list;
    } catch (err) {
      console.warn("Error fetching questions from firestore, using default curriculum questions:", err);
      let fallbackList = filter?.chapterId 
        ? getDefaultQuestionsForChapter(filter.chapterId) 
        : DEFAULT_CHEMISTRY_QUESTIONS;
      const deletedIds = getDeletedQuestionIds();
      return fallbackList.filter(q => !deletedIds.has(q.id));
    }
  },

  async getQuestionById(id: string): Promise<Question | null> {
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

  // Student-Safe Fetch: Returns questions strictly WITHOUT correctAnswer and explanation (High Speed Batching)
  async getQuestionsByIds(ids: string[]): Promise<Question[]> {
    if (!ids || ids.length === 0) return [];
    try {
      const validIds = ids.filter(Boolean);
      const chunks: string[][] = [];
      for (let i = 0; i < validIds.length; i += 30) {
        chunks.push(validIds.slice(i, i + 30));
      }

      const chunkPromises = chunks.map(async (chunk) => {
        try {
          const q = query(collection(db, 'questions'), where(documentId(), 'in', chunk));
          const snap = await getDocs(q);
          return snap.docs.map(d => {
            const data = d.data();
            const { correctAnswer: _ca, explanation: _ex, ...sanitized } = data;
            return { id: d.id, ...sanitized } as Question;
          });
        } catch (e) {
          // Fallback to parallel individual getDoc if where in fails
          const individualPromises = chunk.map(async (id) => {
            try {
              const d = await getDoc(doc(db, 'questions', id));
              if (d.exists()) {
                const { correctAnswer: _ca, explanation: _ex, ...sanitized } = d.data();
                return { id: d.id, ...sanitized } as Question;
              }
            } catch (err) {}
            return null;
          });
          const indRes = await Promise.all(individualPromises);
          return indRes.filter((q): q is Question => q !== null);
        }
      });

      const chunkResults = await Promise.all(chunkPromises);
      const questionMap = new Map<string, Question>();
      chunkResults.flat().forEach(q => questionMap.set(q.id, q));

      // Return ordered by original requested ids
      return validIds.map(id => questionMap.get(id)).filter((q): q is Question => q !== undefined);
    } catch (err) {
      console.error("Error fetching questions by ids:", err);
      return [];
    }
  },

  async createQuestion(questionData: Omit<Question, 'id'>, batchId?: string): Promise<string> {
    const { correctAnswer, explanation, ...rawQuestion } = questionData as any;
    
    // Explicitly handle imageUrl: ONLY include if non-empty string, NEVER undefined/null/empty
    const baseData: Record<string, any> = {
      ...rawQuestion,
      ...(batchId ? { importBatchId: batchId } : (rawQuestion.importBatchId ? { importBatchId: rawQuestion.importBatchId } : {})),
      createdAt: rawQuestion.createdAt || new Date().toISOString()
    };

    if (baseData.imageUrl && typeof baseData.imageUrl === 'string' && baseData.imageUrl.trim().length > 0) {
      baseData.imageUrl = baseData.imageUrl.trim();
    } else {
      delete baseData.imageUrl;
    }

    // Sanitize completely to remove any undefined fields
    const cleanData = sanitizeFirestoreData(baseData);
    
    // 1. Write question content to questions collection (Zero Answer-Key Exposure)
    let refId = '';
    try {
      const ref = await addDoc(collection(db, 'questions'), cleanData);
      refId = ref.id;

      // 2. Write answerKey to isolated answerKeys collection
      if (correctAnswer !== undefined) {
        const akData = sanitizeFirestoreData({
          questionId: ref.id,
          correctAnswer: correctAnswer,
          explanation: explanation || '',
          ...(batchId ? { importBatchId: batchId } : (rawQuestion.importBatchId ? { importBatchId: rawQuestion.importBatchId } : {})),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        await setDoc(doc(db, 'answerKeys', ref.id), akData);
      }
    } catch (err) {
      console.warn("Firestore write failed, falling back to local storage:", err);
      refId = `q-local-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    }

    // Always persist to local custom store
    saveLocalCustomQuestions([{
      id: refId,
      ...baseData,
      correctAnswer,
      explanation
    } as Question]);

    return refId;
  },

  async updateQuestion(id: string, updates: Partial<Question>): Promise<void> {
    const { correctAnswer, explanation, ...rawUpdates } = updates as any;
    
    const baseUpdates: Record<string, any> = {
      ...rawUpdates,
      updatedAt: new Date().toISOString()
    };

    if (baseUpdates.imageUrl && typeof baseUpdates.imageUrl === 'string' && baseUpdates.imageUrl.trim().length > 0) {
      baseUpdates.imageUrl = baseUpdates.imageUrl.trim();
    } else if (baseUpdates.imageUrl !== undefined) {
      // If explicitly set to empty/null, remove or avoid undefined
      delete baseUpdates.imageUrl;
    }

    const cleanUpdates = sanitizeFirestoreData(baseUpdates);

    // Update in local custom store
    const localQ = getLocalCustomQuestions();
    const existing = localQ.find(q => q.id === id);
    if (existing) {
      saveLocalCustomQuestions([{
        ...existing,
        ...cleanUpdates,
        ...(correctAnswer !== undefined ? { correctAnswer } : {}),
        ...(explanation !== undefined ? { explanation } : {})
      }]);
    }

    // Update in Firestore
    try {
      const ref = doc(db, 'questions', id);
      await updateDoc(ref, cleanUpdates);

      if (correctAnswer !== undefined || explanation !== undefined) {
        try {
          const keyRef = doc(db, 'answerKeys', id);
          const keyDoc = await getDoc(keyRef);
          if (keyDoc.exists()) {
            await updateDoc(keyRef, sanitizeFirestoreData({
              ...(correctAnswer !== undefined ? { correctAnswer } : {}),
              ...(explanation !== undefined ? { explanation } : {}),
              updatedAt: new Date().toISOString()
            }));
          } else {
            await setDoc(keyRef, sanitizeFirestoreData({
              questionId: id,
              correctAnswer: correctAnswer !== undefined ? correctAnswer : '',
              explanation: explanation || '',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }));
          }
        } catch (e) {
          console.error("Failed to update answerKeys:", e);
        }
      }
    } catch (firestoreErr) {
      console.warn("Firestore updateDoc notice:", firestoreErr);
    }
  },

  async deleteQuestion(id: string): Promise<void> {
    if (!id || typeof id !== 'string' || !id.trim()) return;
    const cleanId = id.trim();
    
    removeLocalCustomQuestion(cleanId);
    addDeletedQuestionIds([cleanId]);

    try {
      // 1. Delete main question document from Firestore
      await deleteDoc(doc(db, 'questions', cleanId));
      
      // 2. Delete matching answerKey document from Firestore
      try {
        await deleteDoc(doc(db, 'answerKeys', cleanId));
      } catch (akErr) {
        console.warn(`[QuestionService] answerKey delete notice for ${cleanId}:`, akErr);
      }
    } catch (err: any) {
      console.warn(`Error deleting question ${cleanId} from Firestore:`, err);
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
    if (!ids || ids.length === 0) return 0;

    // Filter and deduplicate
    const uniqueIds = Array.from(new Set(ids.filter(id => Boolean(id && typeof id === 'string' && id.trim())))).map(id => id.trim());
    if (uniqueIds.length === 0) return 0;

    uniqueIds.forEach(id => removeLocalCustomQuestion(id));
    addDeletedQuestionIds(uniqueIds);

    console.info(`[QuestionService] Starting bulk delete for ${uniqueIds.length} questions.`);

    const successfullyDeletedIds: string[] = [];
    const errors: string[] = [];

    // Firestore batch limit is 500 ops. Safe chunk size = 200 items (max 400 operations per batch).
    const CHUNK_SIZE = 200;
    for (let i = 0; i < uniqueIds.length; i += CHUNK_SIZE) {
      const chunk = uniqueIds.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      for (const id of chunk) {
        batch.delete(doc(db, 'questions', id));
        batch.delete(doc(db, 'answerKeys', id));
      }

      try {
        await batch.commit();
        successfullyDeletedIds.push(...chunk);
      } catch (batchErr: any) {
        console.warn(`Firestore writeBatch failed for chunk [${i}..${i + chunk.length}], attempting resilient direct deleteDoc fallback:`, batchErr);
        
        // Resilient fallback: delete individual documents directly
        for (const id of chunk) {
          try {
            await deleteDoc(doc(db, 'questions', id));
            try {
              await deleteDoc(doc(db, 'answerKeys', id));
            } catch (akErr) {
              // Answer key might not exist or had rules restriction, but question is deleted
            }
            successfullyDeletedIds.push(id);
          } catch (singleErr: any) {
            console.error(`Failed to delete question ${id} individually:`, singleErr);
            errors.push(`Câu hỏi ${id}: ${singleErr?.message || 'Lỗi quyền hoặc mạng'}`);
          }
        }
      }
    }

    if (successfullyDeletedIds.length > 0) {
      addDeletedQuestionIds(successfullyDeletedIds);
    }

    console.info(`[QuestionService] Bulk delete completed: ${successfullyDeletedIds.length}/${uniqueIds.length} deleted.`);

    if (successfullyDeletedIds.length === 0 && errors.length > 0) {
      throw new Error(`Xóa thất bại: ${errors[0]}`);
    }

    return successfullyDeletedIds.length;
  },

  async bulkCreateQuestions(
    questions: Omit<Question, 'id'>[], 
    batchIdParam?: string,
    userRoleInfo?: { uid?: string; email?: string; role?: string; displayName?: string }
  ): Promise<BulkImportAuditResult> {
    const nowStr = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
    const randSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const batchId = batchIdParam || `IMPORT-${nowStr}-${randSuffix}`;

    const total = questions.length;
    let added = 0;
    const createdQuestionIds: string[] = [];
    const errors: BulkImportAuditError[] = [];

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      try {
        const qId = await this.createQuestion(q, batchId);
        createdQuestionIds.push(qId);
        added++;
      } catch (err: any) {
        console.error(`Error creating question #${i + 1}:`, err);
        let errorMsg = err.message || 'Lỗi không xác định khi ghi câu hỏi';
        let errCode = err.code || 'UNKNOWN_ERROR';

        if (err.code === 'permission-denied' || (err.message && err.message.includes('permission-denied'))) {
          errCode = 'PERMISSION_DENIED';
          errorMsg = `Firestore từ chối ghi dữ liệu (PERMISSION_DENIED). Tài khoản (${userRoleInfo?.email || 'chưa xác thực'}, Role: ${userRoleInfo?.role || 'chưa xác định'}) cần có quyền 'teacher' hoặc 'admin' trong hệ thống.`;
        } else if (err.code === 'invalid-argument' || (err.message && err.message.includes('invalid-argument')) || (err.message && err.message.includes('undefined'))) {
          errCode = 'INVALID_ARGUMENT';
          errorMsg = `Firestore không chấp nhận dữ liệu (INVALID_ARGUMENT): ${err.message}`;
        }

        errors.push({
          index: i + 1,
          contentSnippet: q.content ? q.content.slice(0, 70) + '...' : undefined,
          message: errorMsg,
          code: errCode
        });
      }
    }

    // Post-import Verification on Firestore
    let verifiedQuestionsCount = 0;
    let verifiedAnswerKeysCount = 0;

    if (createdQuestionIds.length > 0) {
      try {
        const verifyQPromises = createdQuestionIds.map(id => getDoc(doc(db, 'questions', id)));
        const qSnaps = await Promise.all(verifyQPromises);
        verifiedQuestionsCount = qSnaps.filter(s => s.exists()).length;

        const verifyKeyPromises = createdQuestionIds.map(id => getDoc(doc(db, 'answerKeys', id)));
        const keySnaps = await Promise.all(verifyKeyPromises);
        verifiedAnswerKeysCount = keySnaps.filter(s => s.exists()).length;
      } catch (verifyErr) {
        console.warn('Post-import verification check notice:', verifyErr);
        verifiedQuestionsCount = added;
        verifiedAnswerKeysCount = added;
      }
    }

    const auditResult: BulkImportAuditResult = {
      total,
      attempted: total,
      added,
      failed: errors.length,
      batchId,
      createdQuestionIds,
      errors,
      verifiedQuestionsCount,
      verifiedAnswerKeysCount
    };

    // Forensic console audit output
    console.log(
      `\n===== CHEM10 AI IMPORT AUDIT =====\n` +
      `Batch ID:               ${batchId}\n` +
      `Total Input:            ${total}\n` +
      `Attempted:              ${total}\n` +
      `Questions created:      ${added}\n` +
      `AnswerKeys created:     ${verifiedAnswerKeysCount}\n` +
      `Verified in Firestore:  ${verifiedQuestionsCount}/${total}\n` +
      `Failed:                 ${errors.length}\n` +
      `RESULT:                 ${added === total && errors.length === 0 ? 'SUCCESS' : added > 0 ? 'PARTIAL' : 'FAILED'}\n` +
      (errors.length > 0 ? `Errors:\n${errors.map(e => `  - [Câu #${e.index}] (${e.code}): ${e.message}`).join('\n')}\n` : '') +
      `==================================\n`
    );

    return auditResult;
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
    const setMap = new Map<string, QuestionSet>();

    // 1. Load from local store
    const localSets = getLocalCustomQuestionSets();
    localSets.forEach(s => setMap.set(s.id, s));

    // 2. Load from Firestore
    try {
      const snap = await getDocs(collection(db, 'questionSets'));
      snap.forEach(d => {
        setMap.set(d.id, { id: d.id, ...d.data() } as QuestionSet);
      });
    } catch (e) {
      console.error("getSets error:", e);
    }

    const sets = Array.from(setMap.values());
    return sets.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  },

  async createSet(setData: Omit<QuestionSet, 'id'>): Promise<string> {
    const cleanData = sanitizeFirestoreData({
      ...setData,
      createdAt: new Date().toISOString()
    });

    let newId = '';
    try {
      const ref = await addDoc(collection(db, 'questionSets'), cleanData);
      newId = ref.id;
    } catch (err) {
      console.warn("Firestore createSet failed, falling back to local storage:", err);
      newId = `set-local-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    }

    // Always persist to local store
    saveLocalCustomQuestionSet({
      id: newId,
      ...setData,
      createdAt: new Date().toISOString()
    } as QuestionSet);

    return newId;
  },

  async getSetById(id: string): Promise<QuestionSet | null> {
    try {
      const snap = await getDoc(doc(db, 'questionSets', id));
      if (snap.exists()) {
        return { id: snap.id, ...snap.data() } as QuestionSet;
      }
    } catch (e) {
      console.error("getSetById error:", e);
    }

    // Check local store
    const localSets = getLocalCustomQuestionSets();
    const localFound = localSets.find(s => s.id === id);
    if (localFound) return localFound;

    // Dynamic synthesis for standard curriculum chapter sets
    const cleanId = id.toLowerCase().trim();
    const effectiveChap = cleanId.startsWith('chapter-practice:')
      ? normalizeChapterId(cleanId.replace('chapter-practice:', ''))
      : (cleanId.startsWith('set-chuong')
          ? normalizeChapterId(cleanId.replace('set-', '').replace('-basic', ''))
          : (cleanId.startsWith('chuong-') ? normalizeChapterId(cleanId) : null));

    if (effectiveChap && effectiveChap !== 'unclassified') {
      const chapTitle = getChapterTitle(effectiveChap);
      const defQ = getDefaultQuestionsForChapter(effectiveChap);
      return {
        id,
        title: `Đề ôn tập ${chapTitle}`,
        description: `Bộ đề ôn tập trắc nghiệm và câu hỏi kiến thức ${chapTitle}`,
        chapterId: effectiveChap,
        durationMinutes: 15,
        questionIds: defQ.map(q => q.id),
        questions: defQ,
        type: 'STANDALONE_WORD',
        totalScore: 10,
        allowReviewAnswers: true,
        createdBy: 'system',
        creatorEmail: 'muoint@fpt.edu.vn',
        createdAt: '2026-01-01T00:00:00.000Z',
        isPublic: true
      };
    }

    return null;
  },

  async deleteSet(id: string): Promise<boolean> {
    removeLocalCustomQuestionSet(id);
    try {
      await deleteDoc(doc(db, 'questionSets', id));
      return true;
    } catch (e) {
      console.error("deleteSet error:", e);
      return true;
    }
  },

  async updateSet(id: string, data: Partial<QuestionSet>): Promise<boolean> {
    const localSets = getLocalCustomQuestionSets();
    const localExisting = localSets.find(s => s.id === id);
    if (localExisting) {
      saveLocalCustomQuestionSet({
        ...localExisting,
        ...data,
        updatedAt: new Date().toISOString()
      });
    }

    try {
      await updateDoc(doc(db, 'questionSets', id), sanitizeFirestoreData({
        ...data,
        updatedAt: new Date().toISOString()
      }));
      return true;
    } catch (e) {
      console.error("updateSet error:", e);
      return true;
    }
  },

  async duplicateSet(id: string, author?: { uid?: string; email?: string }): Promise<string> {
    try {
      const original = await this.getSetById(id);
      if (!original) throw new Error("Không tìm thấy bộ đề để nhân bản");
      const newSet: Omit<QuestionSet, 'id'> = {
        title: `${original.title} (Bản sao)`,
        description: original.description || '',
        chapterId: original.chapterId,
        lessonId: original.lessonId,
        durationMinutes: original.durationMinutes || 15,
        questionIds: [...(original.questionIds || [])],
        questions: original.questions ? [...original.questions] : undefined,
        type: original.type,
        sourceFileName: original.sourceFileName,
        totalScore: original.totalScore || 10,
        allowReviewAnswers: original.allowReviewAnswers ?? true,
        createdBy: author?.uid || original.createdBy || 'system',
        creatorEmail: author?.email || original.creatorEmail || '',
        createdAt: new Date().toISOString(),
        isPublic: original.isPublic ?? true
      };
      return await this.createSet(newSet);
    } catch (e) {
      console.error("duplicateSet error:", e);
      throw e;
    }
  }
};

// Track locally deleted assignment IDs and updated overrides to guarantee instant sync
const deletedAssignmentIds = new Set<string>();
const updatedAssignmentOverrides: Record<string, Partial<Assignment>> = {};

export const assignmentService = {
  async getAssignments(filter?: { teacherEmail?: string; status?: string }): Promise<Assignment[]> {
    try {
      const snap = await getDocs(collection(db, 'assignments'));
      const list: Assignment[] = [];
      snap.forEach(d => {
        if (!deletedAssignmentIds.has(d.id)) {
          const raw = { id: d.id, ...d.data() } as Assignment;
          const override = updatedAssignmentOverrides[d.id] || {};
          list.push({ ...raw, ...override });
        }
      });
      
      let result = list;

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
    if (deletedAssignmentIds.has(id)) return null;
    try {
      const snap = await getDoc(doc(db, 'assignments', id));
      if (snap.exists()) {
        const raw = { id: snap.id, ...snap.data() } as Assignment;
        return { ...raw, ...(updatedAssignmentOverrides[id] || {}) };
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
    updatedAssignmentOverrides[id] = {
      ...(updatedAssignmentOverrides[id] || {}),
      ...updates,
      updatedAt: new Date().toISOString()
    };
    try {
      const ref = doc(db, 'assignments', id);
      await setDoc(ref, {
        ...updates,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (e) {
      console.error("updateAssignment firestore error:", e);
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
      status: 'CLOSED',
      closedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } as any);
  },

  async deleteAssignment(id: string): Promise<void> {
    deletedAssignmentIds.add(id);
    delete updatedAssignmentOverrides[id];
    try {
      await deleteDoc(doc(db, 'assignments', id));
    } catch (e) {
      console.error("deleteAssignment firestore error:", e);
    }
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
        if (a.className && a.className.toLowerCase() === studentClassId.toLowerCase()) return true;
      }

      return false;
    });
  },

  async getAssignmentsForClass(classId: string): Promise<Assignment[]> {
    const all = await this.getAssignments();
    return all.filter(a => {
      if (a.status === 'DRAFT' || a.status === 'CANCELLED') return false;
      if (a.classId === classId) return true;
      if (a.classIds && a.classIds.includes(classId)) return true;
      return false;
    });
  }
};

// Helper functions for universal grading
function normalizeGradeText(val: any): string {
  if (val === null || val === undefined) return '';
  return String(val)
    .trim()
    .toLowerCase()
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ');
}

function toGradeBoolean(val: any): boolean {
  if (typeof val === 'boolean') return val;
  const s = String(val).trim().toLowerCase();
  return s === 'true' || s === 'đúng' || s === 'dung' || s === 'd' || s === 't' || s === '1';
}

function isGradeNumericClose(stu: string, ans: string): boolean {
  const cleanStu = stu.replace(/,/g, '.').replace(/\s/g, '');
  const cleanAns = ans.replace(/,/g, '.').replace(/\s/g, '');
  const numStu = parseFloat(cleanStu);
  const numAns = parseFloat(cleanAns);
  if (isNaN(numStu) || isNaN(numAns)) return false;
  const isPureStu = /^[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?$/.test(cleanStu);
  const isPureAns = /^[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?$/.test(cleanAns);
  if (isPureStu && isPureAns) {
    return Math.abs(numStu - numAns) < 0.0001;
  }
  return false;
}

function normalizeGradeEquation(val: string): string {
  return val
    .replace(/→|=>|-->|⇌|⇄/g, '->')
    .replace(/\s+/g, '')
    .toLowerCase();
}

export const submissionService = {
  // Reliable Online & Local Grading Engine for GDPT 2018
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
    cachedQuestions?: Question[];
    questionSet?: QuestionSet | null;
  }): Promise<{
    submissionId: string;
    score: number;
    correctCount: number;
    wrongCount: number;
    totalQuestions: number;
    details: any[];
  }> {
    const questionIds = payload.questionIds || [];
    const studentAnswers = payload.answers || {};
    const maxPointsPerQuestion = Number((10 / (questionIds.length || 1)).toFixed(3));

    // Fast in-memory map of questions and answer keys
    const embeddedQuestionsMap = new Map<string, Question>();

    // 1. Load from passed cachedQuestions
    if (payload.cachedQuestions && Array.isArray(payload.cachedQuestions)) {
      payload.cachedQuestions.forEach(q => {
        if (q && q.id) embeddedQuestionsMap.set(q.id, q);
      });
    }

    // 2. Load from passed questionSet embedded questions
    if (payload.questionSet?.questions && Array.isArray(payload.questionSet.questions)) {
      payload.questionSet.questions.forEach(q => {
        if (q && q.id) embeddedQuestionsMap.set(q.id, q);
      });
    }

    // 3. For any question IDs missing answer keys, fetch missing keys in fast parallel batch
    const missingKeyIds = questionIds.filter(qId => {
      const q = embeddedQuestionsMap.get(qId);
      if (!q) return true;
      const rawKey = q.correctAnswer !== undefined ? q.correctAnswer : ((q as any).answer !== undefined ? (q as any).answer : ((q as any).key !== undefined ? (q as any).key : (q as any).shortAnswer));
      return rawKey === undefined || rawKey === null;
    });

    if (missingKeyIds.length > 0) {
      try {
        const chunks: string[][] = [];
        for (let i = 0; i < missingKeyIds.length; i += 30) {
          chunks.push(missingKeyIds.slice(i, i + 30));
        }
        await Promise.all(chunks.map(async (chunk) => {
          try {
            const akSnap = await getDocs(query(collection(db, 'answerKeys'), where(documentId(), 'in', chunk)));
            akSnap.forEach(d => {
              const prev = embeddedQuestionsMap.get(d.id) || ({ id: d.id } as Question);
              embeddedQuestionsMap.set(d.id, { ...prev, ...d.data() });
            });
          } catch (e) {
            // Fallback parallel getDoc
            await Promise.all(chunk.map(async (id) => {
              try {
                const akDoc = await getDoc(doc(db, 'answerKeys', id));
                if (akDoc.exists()) {
                  const prev = embeddedQuestionsMap.get(id) || ({ id } as Question);
                  embeddedQuestionsMap.set(id, { ...prev, ...akDoc.data() });
                }
              } catch (err) {}
            }));
          }
        }));
      } catch (keyFetchErr) {
        console.warn("[Instant Grading] Missing key fetch notice:", keyFetchErr);
      }
    }

    // Instant Synchronous Evaluation Engine (0.001s execution)
    let totalEarnedScore = 0;
    let fullyCorrectCount = 0;
    const details: any[] = [];

    for (const qId of questionIds) {
      const eq = embeddedQuestionsMap.get(qId);
      let correctAnswer: any = null;
      let explanation = '';
      let qType = eq?.type || 'multiple_choice';
      const optionsList = eq?.options || [];

      if (eq) {
        const rawKey = eq.correctAnswer !== undefined ? eq.correctAnswer : ((eq as any).answer !== undefined ? (eq as any).answer : ((eq as any).key !== undefined ? (eq as any).key : (eq as any).shortAnswer));
        if (rawKey !== undefined && rawKey !== null) {
          correctAnswer = rawKey;
          explanation = eq.explanation || '';
        }
        if (correctAnswer === null && Array.isArray(eq.options)) {
          const corrOpt = eq.options.find((o: any) => o.isCorrect);
          if (corrOpt && corrOpt.id) {
            correctAnswer = corrOpt.id;
          }
        }
      }

      const stuAns = studentAnswers[qId];
      let isCorrect = false;
      let scoreRatio = 0;
      let subDetails: any[] | null = null;

      const isChoiceAnswer = typeof correctAnswer === 'string' && ['A', 'B', 'C', 'D'].includes(correctAnswer.trim().toUpperCase());

      // Evaluation by Question Type
      if (qType === 'true_false' || (Array.isArray(correctAnswer) && typeof correctAnswer[0] === 'boolean')) {
        // Dạng 2: Đúng / Sai 4 ý (a, b, c, d)
        const stuArr = Array.isArray(stuAns) ? stuAns : [];
        let corrArr: boolean[] = [];
        
        if (Array.isArray(correctAnswer)) {
          corrArr = correctAnswer.map(s => toGradeBoolean(s));
        } else if (typeof correctAnswer === 'string' && correctAnswer.trim().length > 0) {
          corrArr = correctAnswer.split(/[,;|]/).map(s => toGradeBoolean(s.trim()));
        } else if (optionsList.length > 0) {
          corrArr = optionsList.map(o => Boolean(o.isCorrect));
        } else {
          corrArr = [false, false, false, false];
        }

        const evaluatedSubs = corrArr.map((corrItem, idx) => {
          const corrBool = toGradeBoolean(corrItem);
          const stuVal = stuArr[idx];
          const stuBool = stuVal !== undefined ? toGradeBoolean(stuVal) : null;
          const isMatch = stuBool !== null && stuBool === corrBool;
          return {
            index: idx,
            label: ['a', 'b', 'c', 'd'][idx] || `${idx + 1}`,
            studentVal: stuBool,
            correctVal: corrBool,
            isMatch
          };
        });

        subDetails = evaluatedSubs;
        const matchCount = evaluatedSubs.filter(s => s.isMatch).length;
        const totalItems = corrArr.length || 4;

        if (totalItems === 4) {
          if (matchCount === 1) scoreRatio = 0.1;
          else if (matchCount === 2) scoreRatio = 0.25;
          else if (matchCount === 3) scoreRatio = 0.5;
          else if (matchCount === 4) scoreRatio = 1.0;
          else scoreRatio = 0;
        } else {
          scoreRatio = matchCount / totalItems;
        }
        isCorrect = matchCount === totalItems;
        correctAnswer = corrArr;
      } else if (qType === 'multiple_choice' || isChoiceAnswer || optionsList.length > 0) {
        // Dạng 1: Trắc nghiệm 1 đáp án (A, B, C, D)
        const cleanStu = String(stuAns || '').trim().toUpperCase();
        const cleanAns = String(correctAnswer || '').trim().toUpperCase();

        const matchStu = cleanStu.match(/^[A-D]/)?.[0] || cleanStu;
        const matchAns = cleanAns.match(/^[A-D]/)?.[0] || cleanAns;

        if (matchStu !== '' && (matchStu === matchAns || cleanStu === cleanAns)) {
          isCorrect = true;
        } else if (optionsList.length > 0) {
          const selectedOpt = optionsList.find(o => String(o.id || o.label).trim().toUpperCase() === matchStu);
          const correctOpt = optionsList.find(o => o.isCorrect || String(o.id || o.label).trim().toUpperCase() === matchAns || o.text.trim().toLowerCase() === String(correctAnswer).trim().toLowerCase());
          if (selectedOpt && (selectedOpt.isCorrect || (correctOpt && selectedOpt.id === correctOpt.id))) {
            isCorrect = true;
          }
          if (correctOpt && (!correctAnswer || correctAnswer === '')) {
            correctAnswer = correctOpt.id || correctOpt.label || 'A';
          }
        }
        scoreRatio = isCorrect ? 1.0 : 0;
      } else {
        // Dạng 3: Trả lời ngắn / Tính toán / PTHH
        const rawStu = normalizeGradeText(stuAns);
        const acceptableAnswers: string[] = Array.isArray(correctAnswer)
          ? correctAnswer.map(normalizeGradeText)
          : String(correctAnswer || '')
              .split(/[;|]/)
              .map(normalizeGradeText)
              .filter(Boolean);

        if (acceptableAnswers.length === 0 && correctAnswer !== null && correctAnswer !== undefined && correctAnswer !== '') {
          acceptableAnswers.push(normalizeGradeText(correctAnswer));
        }

        for (const ansItem of acceptableAnswers) {
          if (rawStu.replace(/\s+/g, '') === ansItem.replace(/\s+/g, '')) {
            isCorrect = true;
            break;
          }
          if (isGradeNumericClose(rawStu, ansItem)) {
            isCorrect = true;
            break;
          }
          if (normalizeGradeEquation(rawStu) === normalizeGradeEquation(ansItem)) {
            isCorrect = true;
            break;
          }
          const stuNumMatch = rawStu.match(/^([-+]?\d*[.,]?\d+)/);
          const ansNumMatch = ansItem.match(/^([-+]?\d*[.,]?\d+)/);
          if (stuNumMatch && ansNumMatch && isGradeNumericClose(stuNumMatch[1], ansNumMatch[1])) {
            isCorrect = true;
            break;
          }
        }
        scoreRatio = isCorrect ? 1.0 : 0;
      }

      const earnedItemScore = Number((maxPointsPerQuestion * scoreRatio).toFixed(2));
      if (isCorrect) fullyCorrectCount++;
      totalEarnedScore += earnedItemScore;

      details.push({
        questionId: qId,
        isCorrect,
        scoreRatio,
        score: earnedItemScore,
        studentAnswer: stuAns !== undefined ? stuAns : null,
        correctAnswer: correctAnswer !== undefined ? correctAnswer : null,
        explanation: explanation || '',
        subDetails: subDetails || null
      });
    }

    const finalScore = Number(Math.min(10, Math.max(0, totalEarnedScore)).toFixed(1));
    const now = new Date().toISOString();
    const generatedSubId = 'sub-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);

    const submissionRecord: Omit<Submission, 'id'> = {
      assignmentId: payload.assignmentId || '',
      questionSetId: payload.questionSetId || '',
      questionSetTitle: payload.questionSetTitle || 'Bài ôn tập Hóa 10',
      studentId: payload.studentId || 'student',
      studentEmail: payload.studentEmail || '',
      studentName: payload.studentName || payload.studentEmail?.split('@')[0] || 'Học sinh',
      studentClass: payload.studentClass || '10A1',
      attemptNumber: payload.attemptNumber || 1,
      startedAt: new Date(Date.now() - (payload.durationSeconds || 0) * 1000).toISOString(),
      submittedAt: now,
      durationSeconds: payload.durationSeconds || 0,
      answers: studentAnswers,
      score: finalScore,
      totalQuestions: questionIds.length,
      correctCount: fullyCorrectCount,
      incorrectCount: questionIds.length - fullyCorrectCount,
      wrongCount: questionIds.length - fullyCorrectCount,
      details,
      status: 'submitted'
    };

    // Save to Firestore in background without blocking UI rendering
    this.saveSubmission(submissionRecord).catch(err => {
      console.error("[Instant Grading] Background submission save notice:", err);
    });

    return {
      submissionId: generatedSubId,
      score: finalScore,
      correctCount: fullyCorrectCount,
      wrongCount: questionIds.length - fullyCorrectCount,
      totalQuestions: questionIds.length,
      details
    };
  },

  async saveSubmission(sub: Omit<Submission, 'id'>): Promise<string> {
    try {
      const attemptNumber = sub.attemptNumber !== undefined 
        ? sub.attemptNumber 
        : (sub.assignmentId ? (await this.getStudentAssignmentSubmissions(sub.studentEmail, sub.assignmentId)).length + 1 : 1);

      const rawPayload = {
        ...sub,
        assignmentId: sub.assignmentId || '',
        attemptNumber,
        submittedAt: sub.submittedAt || new Date().toISOString()
      };

      const cleanPayload = sanitizeFirestoreData(rawPayload);
      const ref = await addDoc(collection(db, 'submissions'), cleanPayload);
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
  },

  /**
   * Realtime subscription to all submissions (used by Teacher AssignmentsManager, Dashboard, ClassesManager)
   * Automatically synchronizes UI when students submit without requiring manual page reload (F5).
   */
  subscribeToAllSubmissions(
    callback: (submissions: Submission[]) => void,
    onError?: (error: any) => void
  ): () => void {
    try {
      const q = collection(db, 'submissions');
      const unsubscribe = onSnapshot(
        q,
        (snap) => {
          const list: Submission[] = [];
          snap.forEach(d => {
            list.push({ id: d.id, ...d.data() } as Submission);
          });
          list.sort((a, b) => new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime());
          callback(list);
        },
        (error) => {
          console.warn("[submissionService] onSnapshot error on submissions collection:", error);
          onError?.(error);
        }
      );
      return unsubscribe;
    } catch (e) {
      console.error("[submissionService] subscribeToAllSubmissions setup failed:", e);
      onError?.(e);
      return () => {};
    }
  },

  /**
   * Realtime subscription to submissions of a specific assignment
   */
  subscribeToSubmissionsByAssignment(
    assignmentId: string,
    callback: (submissions: Submission[]) => void,
    onError?: (error: any) => void
  ): () => void {
    try {
      const q = query(collection(db, 'submissions'), where('assignmentId', '==', assignmentId));
      const unsubscribe = onSnapshot(
        q,
        (snap) => {
          const list: Submission[] = [];
          snap.forEach(d => {
            list.push({ id: d.id, ...d.data() } as Submission);
          });
          list.sort((a, b) => new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime());
          callback(list);
        },
        (error) => {
          console.warn(`[submissionService] onSnapshot error on assignment ${assignmentId}:`, error);
          onError?.(error);
        }
      );
      return unsubscribe;
    } catch (e) {
      console.error(`[submissionService] subscribeToSubmissionsByAssignment setup failed for ${assignmentId}:`, e);
      onError?.(e);
      return () => {};
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

  async findClassForStudentEmail(email?: string | null): Promise<string> {
    try {
      if (!email) return '';
      const cleanEmail = email.toLowerCase().trim();
      const classes = await this.getClasses();
      for (const cls of classes) {
        if (cls.studentEmails && Array.isArray(cls.studentEmails)) {
          const matched = cls.studentEmails.some(e => e.toLowerCase().trim() === cleanEmail);
          if (matched) {
            return cls.name || cls.id || '';
          }
        }
      }
      return '';
    } catch (e) {
      console.warn("findClassForStudentEmail error:", e);
      return '';
    }
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

  // Helper to parse emails, MSHS & names from multiple formats (plain emails, MSHS | Name | Email, Name | Email, tab/comma separated)
  async parseAndAnalyzeStudentBatch(
    classId: string,
    rawText: string
  ): Promise<BulkImportReport> {
    const cls = await this.getClassById(classId);
    const existingClassEmails = new Set((cls?.studentEmails || []).map(e => e.toLowerCase().trim()));

    // Fetch all existing users from users collection to check account existence & grab displayName and mshs
    let systemUsers: UserProfile[] = [];
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      usersSnap.forEach(d => systemUsers.push({ uid: d.id, ...d.data() } as UserProfile));
    } catch (err) {
      console.warn("Could not fetch users for lookup:", err);
    }

    const systemUserMap = new Map<string, UserProfile>();
    systemUsers.forEach(u => {
      if (u.email) {
        systemUserMap.set(u.email.toLowerCase().trim(), u);
      }
    });

    // Split input by newlines first
    const rawLines = rawText
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(Boolean);

    let lines: string[] = [];
    rawLines.forEach(line => {
      const lower = line.toLowerCase();
      if (
        lower === 'email' || 
        lower === 'stt' || 
        lower.startsWith('họ và tên') || 
        lower.startsWith('họ tên') ||
        lower.startsWith('mshs') ||
        lower.startsWith('stt\t')
      ) {
        return;
      }

      if (line.includes('\t')) {
        lines.push(line);
      } else if ((line.includes(',') || line.includes(';')) && !line.includes('@') && !line.includes('|')) {
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
      let extractedMshs = '';

      // Pattern 1: Tab separated (Excel copy) e.g. "1 \t HS1001 \t Nguyễn Văn A \t nguyenvana@fpt.edu.vn"
      if (line.includes('\t')) {
        const parts = line.split('\t').map(p => p.trim()).filter(Boolean);
        const nonEmailParts: string[] = [];
        for (const p of parts) {
          if (emailRegex.test(p)) {
            extractedEmail = p;
          } else if (p.length > 0) {
            nonEmailParts.push(p);
          }
        }
        // Classify non-email parts (STT, MSHS, Name)
        const candidates = nonEmailParts.filter(p => isNaN(Number(p)) || p.length > 3);
        if (candidates.length >= 2) {
          // If first looks like MSHS (e.g. HS1001, 10A1_01)
          if (/^[a-zA-Z0-9_-]{2,15}$/.test(candidates[0]) && !candidates[0].includes(' ')) {
            extractedMshs = candidates[0];
            extractedName = candidates.slice(1).join(' ');
          } else {
            extractedName = candidates[0];
            extractedMshs = candidates[1];
          }
        } else if (candidates.length === 1) {
          extractedName = candidates[0];
        }
      } 
      // Pattern 2: Pipe separated e.g. "HS1001 | Nguyễn Văn A | nguyenvana@fpt.edu.vn" or "Nguyễn Văn A | nguyenvana@fpt.edu.vn"
      else if (line.includes('|')) {
        const parts = line.split('|').map(p => p.trim()).filter(Boolean);
        const emailIdx = parts.findIndex(p => emailRegex.test(p));
        if (emailIdx !== -1) {
          extractedEmail = parts[emailIdx];
          const otherParts = parts.filter((_, i) => i !== emailIdx);
          if (otherParts.length >= 2) {
            if (/^[a-zA-Z0-9_-]{2,15}$/.test(otherParts[0]) && !otherParts[0].includes(' ')) {
              extractedMshs = otherParts[0];
              extractedName = otherParts[1];
            } else {
              extractedName = otherParts[0];
              extractedMshs = otherParts[1];
            }
          } else if (otherParts.length === 1) {
            extractedName = otherParts[0];
          }
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
      // Pattern 4: Comma or Semicolon separated
      else if ((line.includes(',') || line.includes(';')) && line.includes('@')) {
        const parts = line.split(/[,;]/).map(p => p.trim()).filter(Boolean);
        for (const p of parts) {
          if (emailRegex.test(p)) {
            extractedEmail = p;
          } else if (isNaN(Number(p)) && p.length > 1) {
            if (!extractedName) extractedName = p;
            else if (!extractedMshs) extractedMshs = p;
          }
        }
      }
      // Pattern 5: Plain string
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

      const id = `parsed-item-${index + 1}-${Date.now()}`;
      const isFormatValid = emailRegex.test(extractedEmail);

      if (!isFormatValid) {
        items.push({
          id,
          rawInput: line,
          mshs: extractedMshs,
          email: extractedEmail,
          displayName: extractedName || 'Chưa xác định',
          status: 'INVALID_EMAIL',
          statusMessage: 'Email không đúng định dạng chuẩn (RFC-5322)',
          userExistsInSystem: false,
          selected: false
        });
        return;
      }

      if (seenEmailsInCurrentBatch.has(extractedEmail)) {
        items.push({
          id,
          rawInput: line,
          mshs: extractedMshs,
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

      if (existingClassEmails.has(extractedEmail)) {
        items.push({
          id,
          rawInput: line,
          mshs: extractedMshs || systemUserMap.get(extractedEmail)?.mshs,
          email: extractedEmail,
          displayName: extractedName || systemUserMap.get(extractedEmail)?.displayName || 'Học sinh trong lớp',
          status: 'ALREADY_IN_CLASS',
          statusMessage: `Học sinh đã có trong lớp ${cls?.name || classId}`,
          userExistsInSystem: true,
          selected: false
        });
        return;
      }

      const existingUser = systemUserMap.get(extractedEmail);
      if (existingUser) {
        items.push({
          id,
          rawInput: line,
          mshs: extractedMshs || existingUser.mshs,
          email: extractedEmail,
          displayName: existingUser.displayName || extractedName || extractedEmail.split('@')[0],
          status: 'EXISTING_USER_NEW_TO_CLASS',
          statusMessage: 'Tài khoản đã tồn tại trong hệ thống (Sẵn sàng thêm vào lớp)',
          userExistsInSystem: true,
          selected: true
        });
        return;
      }

      const autoGenName = extractedName || (
        extractedEmail.split('@')[0]
          .split(/[._-]/)
          .map(part => part.charAt(0).toUpperCase() + part.slice(1))
          .join(' ')
      );

      items.push({
        id,
        rawInput: line,
        mshs: extractedMshs,
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
    studentsToAdd: { email: string; displayName?: string; mshs?: string }[],
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
        // Ensure student profile exists in 'users' collection
        const userDocRef = doc(db, 'users', `student_${email.replace(/[@.]/g, '_')}`);
        const userSnap = await getDoc(userDocRef);

        const autoName = student.displayName || (
          email.split('@')[0]
            .split(/[._-]/)
            .map(p => p.charAt(0).toUpperCase() + p.slice(1))
            .join(' ')
        );

        if (!userSnap.exists()) {
          await setDoc(userDocRef, {
            email,
            displayName: autoName,
            role: 'student',
            classId,
            school: 'THPT FPT',
            mshs: student.mshs || '',
            hasLoggedIn: false,
            createdAt: new Date().toISOString()
          }, { merge: true });
        } else {
          // Update classId and mshs for existing student user
          await updateDoc(userDocRef, {
            classId,
            ...(student.mshs ? { mshs: student.mshs } : {}),
            ...(student.displayName ? { displayName: student.displayName } : {}),
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

      // Check if student has actually logged in with Google/Email
      const hasRealAccount = Boolean(
        user?.hasLoggedIn || 
        user?.lastLoginAt || 
        user?.photoURL ||
        (user?.uid && !user.uid.startsWith('student_')) ||
        studentSubs.length > 0
      );

      return {
        uid: user?.uid,
        mshs: user?.mshs || '',
        email: normEmail,
        displayName: name,
        status: hasRealAccount ? 'ACTIVE' : 'PENDING',
        hasLoggedIn: hasRealAccount,
        joinedAt: user?.createdAt || cls.createdAt,
        submissionsCount: subCount,
        avgScore,
        completedCount,
        pendingCount,
        latestScore: latestSub?.score,
        lastActiveAt: latestSub?.submittedAt || user?.lastLoginAt
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

const CHAPTER_CONFIGS_LOCAL_KEY = 'chem10_chapter_practice_configs';

export const chapterConfigService = {
  // Default values for 7 chapters (default 20 questions: 12 TN, 4 Đ/S, 4 TLN)
  getDefaultConfigs(): Record<string, ChapterPracticeConfig> {
    const defaults: Record<string, ChapterPracticeConfig> = {};
    CHEMISTRY_10_CURRICULUM.forEach(c => {
      defaults[c.id] = {
        chapterId: c.id,
        questionCount: 20,
        durationMinutes: 30,
        mode: 'MANUAL_FORMAT',
        types: {
          multiple_choice: 12, // Dạng 1: Trắc nghiệm 4 lựa chọn
          true_false: 4,      // Dạng 2: Đúng / Sai 4 ý
          short_answer: 4     // Dạng 3: Trả lời ngắn
        },
        levelRatio: {
          nhan_biet: 40,
          thong_hieu: 30,
          van_dung: 20,
          van_dung_cao: 10
        }
      };
    });
    return defaults;
  },

  async getConfigByChapter(chapterId: string): Promise<ChapterPracticeConfig> {
    const norm = normalizeChapterId(chapterId);
    const all = await this.getConfigs();
    return all[norm] || all[chapterId] || this.getDefaultConfigs()[norm] || {
      chapterId: norm,
      questionCount: 20,
      durationMinutes: 30,
      types: { multiple_choice: 12, true_false: 4, short_answer: 4 }
    };
  },

  async getConfigs(): Promise<Record<string, ChapterPracticeConfig>> {
    const map = this.getDefaultConfigs();
    
    // 1. Read local storage
    try {
      const local = localStorage.getItem(CHAPTER_CONFIGS_LOCAL_KEY);
      if (local) {
        const parsed = JSON.parse(local);
        if (typeof parsed === 'object' && parsed !== null) {
          Object.assign(map, parsed);
        }
      }
    } catch (e) {}

    // 2. Read from Firestore collection 'chapterConfigs'
    try {
      const snap = await getDocs(collection(db, 'chapterConfigs'));
      snap.forEach(d => {
        const data = d.data() as ChapterPracticeConfig;
        if (data && data.chapterId) {
          map[data.chapterId] = {
            ...map[data.chapterId],
            ...data
          };
        }
      });
    } catch (err) {
      console.warn("Firestore chapterConfigs read notice:", err);
    }

    return map;
  },

  async saveConfig(config: ChapterPracticeConfig, teacherEmail?: string): Promise<void> {
    const cleanConfig: ChapterPracticeConfig = {
      ...config,
      updatedAt: new Date().toISOString(),
      updatedBy: teacherEmail || 'teacher'
    };

    // 1. Save locally
    try {
      const all = await this.getConfigs();
      all[config.chapterId] = cleanConfig;
      localStorage.setItem(CHAPTER_CONFIGS_LOCAL_KEY, JSON.stringify(all));
    } catch (e) {}

    // 2. Save in Firestore
    try {
      const ref = doc(db, 'chapterConfigs', config.chapterId);
      await setDoc(ref, sanitizeFirestoreData(cleanConfig));
    } catch (err) {
      console.warn("Firestore save chapterConfig notice:", err);
    }
  },

  async saveAllConfigs(configs: Record<string, Partial<ChapterPracticeConfig>>, teacherEmail?: string): Promise<void> {
    const current = await this.getConfigs();
    for (const [chId, conf] of Object.entries(configs)) {
      const merged: ChapterPracticeConfig = {
        ...(current[chId] || { chapterId: chId, questionCount: 20 }),
        ...conf,
        chapterId: chId,
        updatedAt: new Date().toISOString(),
        updatedBy: teacherEmail || 'teacher'
      };
      await this.saveConfig(merged, teacherEmail);
    }
  }
};

