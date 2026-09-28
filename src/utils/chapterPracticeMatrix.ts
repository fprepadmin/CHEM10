import { Question, CognitiveLevel, QuestionType, ExamMatrixConfig, ChapterMatrixRule, ChapterPracticeConfig } from '../types';
import { normalizeChapterId, UNCLASSIFIED_CHAPTER_ID, getChapterTitle } from '../data/curriculum';

export interface MatrixDistributionSummary {
  total: number;
  targetTotal?: number;
  byChapter: Record<string, number>;
  byLevel: {
    nhan_biet: number;
    thong_hieu: number;
    van_dung: number;
    van_dung_cao: number;
  };
  byType: {
    multiple_choice: number;
    true_false: number;
    short_answer: number;
    calculation: number;
    other: number;
  };
  isFullTarget: boolean;
  usedFallbackMatrix: boolean;
}

/**
 * Standard Fisher-Yates shuffle helper
 */
export function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Sanitize client questions by stripping answer keys and normalizing options
 */
export function sanitizeQuestionForClient(q: Question): Question {
  const { correctAnswer: _ca, explanation: _ex, ...sanitized } = q;
  let cleanOptions = sanitized.options;
  if (sanitized.type === 'multiple_choice' && Array.isArray(cleanOptions) && cleanOptions.length > 0) {
    cleanOptions = cleanOptions.map(opt => ({
      id: opt.id,
      text: opt.text,
      label: opt.label
    }));
  }
  return {
    ...sanitized,
    options: cleanOptions
  } as Question;
}

/**
 * Computes cognitive level targets from a total count using a given ratio (default 4:3:2:1)
 */
export function computeLevelTargets(
  totalCount: number,
  ratio: { nhan_biet: number; thong_hieu: number; van_dung: number; van_dung_cao: number } = { nhan_biet: 4, thong_hieu: 3, van_dung: 2, van_dung_cao: 1 }
): Record<CognitiveLevel, number> {
  const sumRatio = (ratio.nhan_biet + ratio.thong_hieu + ratio.van_dung + ratio.van_dung_cao) || 10;
  
  let nb = Math.round((ratio.nhan_biet / sumRatio) * totalCount);
  let th = Math.round((ratio.thong_hieu / sumRatio) * totalCount);
  let vd = Math.round((ratio.van_dung / sumRatio) * totalCount);
  let vdc = totalCount - nb - th - vd;

  // Handle rounding edge-cases
  if (vdc < 0) {
    if (nb > 0) nb += vdc;
    else if (th > 0) th += vdc;
    vdc = 0;
  }

  return {
    nhan_biet: Math.max(0, nb),
    thong_hieu: Math.max(0, th),
    van_dung: Math.max(0, vd),
    van_dung_cao: Math.max(0, vdc)
  };
}

/**
 * Samples questions from a specific pool according to level and format constraints
 */
function sampleChapterPool(
  pool: Question[],
  targetCount: number,
  levelTargets?: Partial<Record<CognitiveLevel, number>>,
  typeTargets?: Partial<Record<QuestionType, number>>
): { picked: Question[]; usedFallback: boolean } {
  if (pool.length <= targetCount) {
    return { picked: shuffleArray(pool), usedFallback: false };
  }

  let usedFallback = false;
  const buckets: Record<CognitiveLevel, Question[]> = {
    nhan_biet: [],
    thong_hieu: [],
    van_dung: [],
    van_dung_cao: []
  };

  for (const q of pool) {
    const lvl: CognitiveLevel = (q.level && buckets[q.level]) ? q.level : 'nhan_biet';
    buckets[lvl].push(q);
  }

  const effectiveLevelTargets = {
    ...computeLevelTargets(targetCount),
    ...(levelTargets || {})
  };

  // If VDC is requested but empty in pool, redistribute VDC quota to VD/TH
  if (effectiveLevelTargets.van_dung_cao > 0 && buckets.van_dung_cao.length === 0) {
    const shift = effectiveLevelTargets.van_dung_cao;
    effectiveLevelTargets.van_dung_cao = 0;
    effectiveLevelTargets.van_dung += Math.ceil(shift / 2);
    effectiveLevelTargets.thong_hieu += Math.floor(shift / 2);
    usedFallback = true;
  }

  const selectedSet = new Set<string>();
  const pickedQuestions: Question[] = [];

  const pickFromLevel = (lvl: CognitiveLevel, count: number): Question[] => {
    const available = shuffleArray(buckets[lvl].filter(q => !selectedSet.has(q.id)));
    if (available.length <= count) {
      return available;
    }

    // Separate pool by type
    const mc = available.filter(q => q.type === 'multiple_choice');
    const tf = available.filter(q => q.type === 'true_false');
    const sa = available.filter(q => q.type === 'short_answer');

    const picked: Question[] = [];
    
    // Proportional type picks unless overridden
    const targetTF = typeTargets?.true_false !== undefined 
      ? Math.min(tf.length, typeTargets.true_false) 
      : Math.min(tf.length, Math.max(tf.length > 0 && count >= 4 ? 1 : 0, Math.round(count * 0.2)));
      
    const targetSA = typeTargets?.short_answer !== undefined 
      ? Math.min(sa.length, typeTargets.short_answer) 
      : Math.min(sa.length, Math.max(sa.length > 0 && count >= 4 ? 1 : 0, Math.round(count * 0.2)));

    const targetMC = Math.min(mc.length, count - targetTF - targetSA);

    picked.push(...tf.slice(0, targetTF));
    picked.push(...sa.slice(0, targetSA));
    picked.push(...mc.slice(0, targetMC));

    // Fill remaining if needed
    if (picked.length < count) {
      const pickedIds = new Set(picked.map(p => p.id));
      const remaining = available.filter(q => !pickedIds.has(q.id));
      picked.push(...remaining.slice(0, count - picked.length));
    }

    return picked.slice(0, count);
  };

  const levelOrder: CognitiveLevel[] = ['van_dung_cao', 'van_dung', 'thong_hieu', 'nhan_biet'];
  for (const lvl of levelOrder) {
    const needed = effectiveLevelTargets[lvl] || 0;
    if (needed > 0) {
      const picked = pickFromLevel(lvl, needed);
      picked.forEach(q => {
        selectedSet.add(q.id);
        pickedQuestions.push(q);
      });
    }
  }

  // Backfill if still under targetCount due to bucket shortages
  if (pickedQuestions.length < targetCount) {
    usedFallback = true;
    for (const lvl of levelOrder) {
      if (pickedQuestions.length >= targetCount) break;
      const remaining = shuffleArray(buckets[lvl].filter(q => !selectedSet.has(q.id)));
      const takeCount = Math.min(targetCount - pickedQuestions.length, remaining.length);
      const extra = remaining.slice(0, takeCount);
      extra.forEach(q => {
        selectedSet.add(q.id);
        pickedQuestions.push(q);
      });
    }
  }

  return { picked: pickedQuestions.slice(0, targetCount), usedFallback };
}

/**
 * Samples a specific type bucket (e.g. only multiple_choice, only true_false, only short_answer)
 * balancing cognitive levels within that format.
 */
function sampleFormatBucket(
  pool: Question[],
  targetCount: number,
  ratio?: { nhan_biet: number; thong_hieu: number; van_dung: number; van_dung_cao: number }
): { picked: Question[]; usedFallback: boolean } {
  if (targetCount <= 0 || pool.length === 0) {
    return { picked: [], usedFallback: false };
  }
  if (pool.length <= targetCount) {
    return { picked: shuffleArray(pool), usedFallback: false };
  }

  const levelTargets = computeLevelTargets(targetCount, ratio);
  const buckets: Record<CognitiveLevel, Question[]> = {
    nhan_biet: [],
    thong_hieu: [],
    van_dung: [],
    van_dung_cao: []
  };

  for (const q of pool) {
    const lvl: CognitiveLevel = (q.level && buckets[q.level]) ? q.level : 'nhan_biet';
    buckets[lvl].push(q);
  }

  const selectedSet = new Set<string>();
  const picked: Question[] = [];

  const levelOrder: CognitiveLevel[] = ['nhan_biet', 'thong_hieu', 'van_dung', 'van_dung_cao'];
  for (const lvl of levelOrder) {
    const needed = levelTargets[lvl] || 0;
    const available = shuffleArray(buckets[lvl]);
    const take = available.slice(0, needed);
    take.forEach(q => {
      selectedSet.add(q.id);
      picked.push(q);
    });
  }

  // Backfill if shortage in some level
  let usedFallback = false;
  if (picked.length < targetCount) {
    usedFallback = true;
    const remaining = shuffleArray(pool.filter(q => !selectedSet.has(q.id)));
    const neededMore = targetCount - picked.length;
    picked.push(...remaining.slice(0, neededMore));
  }

  return { picked: picked.slice(0, targetCount), usedFallback };
}

/**
 * Builds a balanced practice set for a specific chapter with custom question count
 * and optional manual question format classification (Dạng thức: TN, Đúng/Sai, Trả lời ngắn).
 */
export function buildChapterPracticeQuestions(
  allQuestions: Question[],
  chapterId: string,
  targetCount: number = 30,
  config?: ChapterPracticeConfig
): { questions: Question[]; summary: MatrixDistributionSummary } {
  const normTargetChapter = normalizeChapterId(chapterId);

  const summary: MatrixDistributionSummary = {
    total: 0,
    targetTotal: targetCount,
    byChapter: {},
    byLevel: { nhan_biet: 0, thong_hieu: 0, van_dung: 0, van_dung_cao: 0 },
    byType: { multiple_choice: 0, true_false: 0, short_answer: 0, calculation: 0, other: 0 },
    isFullTarget: false,
    usedFallbackMatrix: false
  };

  if (!normTargetChapter || normTargetChapter === UNCLASSIFIED_CHAPTER_ID) {
    return { questions: [], summary };
  }

  // Filter strictly by chapterId
  const seenIds = new Set<string>();
  const chapterPool: Question[] = [];

  for (const q of allQuestions) {
    if (!q || !q.id || seenIds.has(q.id)) continue;
    if (normalizeChapterId(q.chapterId) === normTargetChapter) {
      seenIds.add(q.id);
      chapterPool.push(q);
    }
  }

  if (chapterPool.length === 0) {
    return { questions: [], summary };
  }

  let finalPicked: Question[] = [];

  // MANUAL QUESTION FORMAT CLASSIFICATION (TUỲ CHỈNH THEO DẠNG THỨC)
  if (config && config.types && (config.types.multiple_choice > 0 || config.types.true_false > 0 || config.types.short_answer > 0)) {
    const mcPool = chapterPool.filter(q => q.type === 'multiple_choice');
    const tfPool = chapterPool.filter(q => q.type === 'true_false');
    const saPool = chapterPool.filter(q => q.type === 'short_answer' || q.type === 'calculation');

    const mcTarget = config.types.multiple_choice || 0;
    const tfTarget = config.types.true_false || 0;
    const saTarget = config.types.short_answer || 0;

    const mcResult = sampleFormatBucket(mcPool, mcTarget, config.levelRatio);
    const tfResult = sampleFormatBucket(tfPool, tfTarget, config.levelRatio);
    const saResult = sampleFormatBucket(saPool, saTarget, config.levelRatio);

    if (mcResult.usedFallback || tfResult.usedFallback || saResult.usedFallback) {
      summary.usedFallbackMatrix = true;
    }

    // Keep GDPT 2018 format structure: Phần 1 (TN) -> Phần 2 (Đ/S) -> Phần 3 (TLN)
    finalPicked = [
      ...shuffleArray(mcResult.picked),
      ...shuffleArray(tfResult.picked),
      ...shuffleArray(saResult.picked)
    ];

    // If total picked is still less than targetCount (e.g. pool shortage in a type), backfill with other available
    if (finalPicked.length < targetCount) {
      const pickedIds = new Set(finalPicked.map(p => p.id));
      const remainingPool = shuffleArray(chapterPool.filter(q => !pickedIds.has(q.id)));
      const needed = targetCount - finalPicked.length;
      finalPicked.push(...remainingPool.slice(0, needed));
      summary.usedFallbackMatrix = true;
    }
  } else {
    // AUTOMATIC BALANCED SAMPLING
    const { picked, usedFallback } = sampleChapterPool(chapterPool, targetCount);
    summary.usedFallbackMatrix = usedFallback;
    finalPicked = shuffleArray(picked);
  }

  const sanitizedList = finalPicked.map(sanitizeQuestionForClient);

  summary.total = sanitizedList.length;
  summary.isFullTarget = sanitizedList.length >= targetCount;
  summary.byChapter[normTargetChapter] = sanitizedList.length;

  for (const q of sanitizedList) {
    if (q.level === 'nhan_biet') summary.byLevel.nhan_biet++;
    else if (q.level === 'thong_hieu') summary.byLevel.thong_hieu++;
    else if (q.level === 'van_dung') summary.byLevel.van_dung++;
    else if (q.level === 'van_dung_cao') summary.byLevel.van_dung_cao++;

    if (q.type === 'multiple_choice') summary.byType.multiple_choice++;
    else if (q.type === 'true_false') summary.byType.true_false++;
    else if (q.type === 'short_answer') summary.byType.short_answer++;
    else if (q.type === 'calculation') summary.byType.calculation++;
    else summary.byType.other++;
  }

  return { questions: sanitizedList, summary };
}

/**
 * Builds a multi-chapter exam set according to a custom Matrix specification
 * (Chapters count, Cognitive Levels, and Question Types)
 */
export function buildMatrixQuestions(
  allQuestions: Question[],
  matrixConfig: ExamMatrixConfig
): { questions: Question[]; summary: MatrixDistributionSummary } {
  const summary: MatrixDistributionSummary = {
    total: 0,
    targetTotal: matrixConfig.totalQuestions || 0,
    byChapter: {},
    byLevel: { nhan_biet: 0, thong_hieu: 0, van_dung: 0, van_dung_cao: 0 },
    byType: { multiple_choice: 0, true_false: 0, short_answer: 0, calculation: 0, other: 0 },
    isFullTarget: false,
    usedFallbackMatrix: false
  };

  if (!matrixConfig || !Array.isArray(matrixConfig.chapters) || matrixConfig.chapters.length === 0) {
    return { questions: [], summary };
  }

  const allPicked: Question[] = [];
  const globalSeenIds = new Set<string>();

  for (const rule of matrixConfig.chapters) {
    if (!rule || rule.count <= 0) continue;

    const normChap = normalizeChapterId(rule.chapterId);
    summary.byChapter[normChap] = 0;

    // Filter questions for this chapter
    const chapterPool = allQuestions.filter(q => {
      if (!q || !q.id || globalSeenIds.has(q.id)) return false;
      return normalizeChapterId(q.chapterId) === normChap;
    });

    if (chapterPool.length === 0) {
      continue;
    }

    const { picked, usedFallback } = sampleChapterPool(
      chapterPool,
      rule.count,
      rule.levels || (matrixConfig.levelRatio ? computeLevelTargets(rule.count, matrixConfig.levelRatio) : undefined),
      rule.types || matrixConfig.typeRatio
    );

    if (usedFallback) {
      summary.usedFallbackMatrix = true;
    }

    picked.forEach(q => {
      if (!globalSeenIds.has(q.id)) {
        globalSeenIds.add(q.id);
        allPicked.push(q);
        summary.byChapter[normChap] = (summary.byChapter[normChap] || 0) + 1;
      }
    });
  }

  // Shuffle all questions randomly
  const randomized = shuffleArray(allPicked);
  const sanitizedList = randomized.map(sanitizeQuestionForClient);

  summary.total = sanitizedList.length;
  summary.isFullTarget = sanitizedList.length >= (matrixConfig.totalQuestions || 0);

  for (const q of sanitizedList) {
    if (q.level === 'nhan_biet') summary.byLevel.nhan_biet++;
    else if (q.level === 'thong_hieu') summary.byLevel.thong_hieu++;
    else if (q.level === 'van_dung') summary.byLevel.van_dung++;
    else if (q.level === 'van_dung_cao') summary.byLevel.van_dung_cao++;

    if (q.type === 'multiple_choice') summary.byType.multiple_choice++;
    else if (q.type === 'true_false') summary.byType.true_false++;
    else if (q.type === 'short_answer') summary.byType.short_answer++;
    else if (q.type === 'calculation') summary.byType.calculation++;
    else summary.byType.other++;
  }

  return { questions: sanitizedList, summary };
}

