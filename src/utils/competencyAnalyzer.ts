import { Submission, Question, CognitiveLevel } from '../types';
import { CHEMISTRY_10_CURRICULUM, normalizeChapterId, getChapterTitle } from '../data/curriculum';

export interface LevelMastery {
  level: CognitiveLevel;
  label: string;
  totalAnswered: number;
  correctCount: number;
  percentage: number; // 0 - 100
  rating: 'XUẤT SẮC' | 'KHÁ' | 'TRUNG BÌNH' | 'CẦN CỦNG CỐ' | 'CHƯA ĐỦ DỮ LIỆU';
  pedagogicalComment: string;
}

export interface ChapterMastery {
  chapterId: string;
  chapterNumber: number;
  chapterTitle: string;
  totalAnswered: number;
  correctCount: number;
  percentage: number;
  rating: 'THÀNH THẠO' | 'KHÁ TỐT' | 'TRUNG BÌNH' | 'CẦN ÔN LUYỆN' | 'CHƯA LUYỆN TẬP';
  recommendation: string;
}

export interface CompetencyAnalysisResult {
  hasData: boolean;
  totalSubmissions: number;
  assignmentSubmissionsCount: number;
  selfPracticeSubmissionsCount: number;
  totalQuestionsAnswered: number;
  totalQuestionsCorrect: number;
  overallAccuracy: number; // %
  averageScore: number; // / 10
  highestScore: number;
  lowestScore: number;
  latestScore: number;
  scoreTrend: 'IMPROVING' | 'STABLE' | 'DECLINING' | 'INSUFFICIENT_DATA';
  scoreTrendText: string;
  
  // 4 Cognitive Levels Breakdown
  cognitiveLevels: {
    nhan_biet: LevelMastery;
    thong_hieu: LevelMastery;
    van_dung: LevelMastery;
    van_dung_cao: LevelMastery;
  };
  
  // 7 Chapters Breakdown
  chaptersMastery: ChapterMastery[];
  
  // System Pedagogical Insights
  strengths: string[];
  weaknesses: string[];
  actionPlan: string[];
  overallEvaluation: string;
}

/**
 * Analyzes student submissions against real question data to produce
 * a deterministic, highly accurate pedagogical competency report.
 */
export function analyzeStudentCompetency(
  submissions: Submission[],
  allQuestions: Question[] = []
): CompetencyAnalysisResult {
  if (!submissions || submissions.length === 0) {
    return createEmptyAnalysisResult();
  }

  // Build question lookup map
  const questionMap = new Map<string, Question>();
  allQuestions.forEach(q => {
    if (q && q.id) questionMap.set(q.id, q);
  });

  const totalSubmissions = submissions.length;
  
  // Classify submissions into Teacher Assignments vs Self-Practice
  let assignmentSubmissionsCount = 0;
  let selfPracticeSubmissionsCount = 0;
  
  submissions.forEach(sub => {
    if (sub.assignmentId && sub.assignmentId.trim() !== '') {
      assignmentSubmissionsCount++;
    } else {
      selfPracticeSubmissionsCount++;
    }
  });

  // Calculate scores & trends
  const validScores = submissions.map(s => Number(s.score) || 0);
  const totalScoreSum = validScores.reduce((a, b) => a + b, 0);
  const averageScore = Number((totalScoreSum / totalSubmissions).toFixed(1));
  const highestScore = Math.max(...validScores);
  const lowestScore = Math.min(...validScores);
  const latestScore = Number(submissions[0]?.score) || 0; // Most recent if sorted or first

  // Trend analysis (compare older vs newer half)
  let scoreTrend: 'IMPROVING' | 'STABLE' | 'DECLINING' | 'INSUFFICIENT_DATA' = 'INSUFFICIENT_DATA';
  let scoreTrendText = 'Cần làm thêm bài thi để xác định xu hướng học tập.';

  if (submissions.length >= 3) {
    // Sort submissions by submittedAt ascending
    const chronological = [...submissions].sort((a, b) => {
      const tA = new Date(a.submittedAt || 0).getTime();
      const tB = new Date(b.submittedAt || 0).getTime();
      return tA - tB;
    });

    const mid = Math.floor(chronological.length / 2);
    const firstHalf = chronological.slice(0, mid);
    const secondHalf = chronological.slice(mid);

    const avg1 = firstHalf.reduce((a, b) => a + (b.score || 0), 0) / firstHalf.length;
    const avg2 = secondHalf.reduce((a, b) => a + (b.score || 0), 0) / secondHalf.length;
    const diff = avg2 - avg1;

    if (diff >= 0.75) {
      scoreTrend = 'IMPROVING';
      scoreTrendText = `Đang có tiến bộ rõ rệt (Điểm trung bình tăng +${diff.toFixed(1)} điểm so với giai đoạn đầu).`;
    } else if (diff <= -0.75) {
      scoreTrend = 'DECLINING';
      scoreTrendText = `Điểm số có dấu hiệu chững lại (-${Math.abs(diff).toFixed(1)} điểm). Cần tập trung củng cố lại các chuyên đề khó.`;
    } else {
      scoreTrend = 'STABLE';
      scoreTrendText = 'Phong độ làm bài ổn định, giữ vững mức điểm qua các đợt kiểm tra.';
    }
  }

  // Deep answer-level analysis for Cognitive Levels and Chapters
  const levelCounts: Record<CognitiveLevel, { total: number; correct: number }> = {
    nhan_biet: { total: 0, correct: 0 },
    thong_hieu: { total: 0, correct: 0 },
    van_dung: { total: 0, correct: 0 },
    van_dung_cao: { total: 0, correct: 0 }
  };

  // 7 Chapters stats: chapter 1 to 7
  const chapterCounts: Record<string, { total: number; correct: number }> = {
    'chuong-1': { total: 0, correct: 0 },
    'chuong-2': { total: 0, correct: 0 },
    'chuong-3': { total: 0, correct: 0 },
    'chuong-4': { total: 0, correct: 0 },
    'chuong-5': { total: 0, correct: 0 },
    'chuong-6': { total: 0, correct: 0 },
    'chuong-7': { total: 0, correct: 0 }
  };

  let totalQuestionsAnswered = 0;
  let totalQuestionsCorrect = 0;

  submissions.forEach(sub => {
    if (sub.details && Array.isArray(sub.details)) {
      sub.details.forEach(det => {
        totalQuestionsAnswered++;
        const isCorrect = !!det.isCorrect;
        if (isCorrect) totalQuestionsCorrect++;

        const q = questionMap.get(det.questionId);
        
        // Determine cognitive level
        let level: CognitiveLevel = 'nhan_biet';
        if (q?.level) {
          const l = String(q.level).toLowerCase();
          if (l.includes('van_dung_cao') || l.includes('expert') || l === '4') level = 'van_dung_cao';
          else if (l.includes('van_dung') || l.includes('hard') || l === '3') level = 'van_dung';
          else if (l.includes('thong_hieu') || l.includes('medium') || l === '2') level = 'thong_hieu';
          else level = 'nhan_biet';
        }

        levelCounts[level].total++;
        if (isCorrect) levelCounts[level].correct++;

        // Determine chapter
        let chapterId = normalizeChapterId(q?.chapterId);
        if (chapterId === 'unclassified' && sub.questionSetTitle) {
          chapterId = normalizeChapterId(sub.questionSetTitle);
        }

        if (chapterCounts[chapterId]) {
          chapterCounts[chapterId].total++;
          if (isCorrect) chapterCounts[chapterId].correct++;
        }
      });
    } else {
      // Fallback if details not recorded (use summary counts)
      totalQuestionsAnswered += (sub.totalQuestions || 0);
      totalQuestionsCorrect += (sub.correctCount || 0);
    }
  });

  const overallAccuracy = totalQuestionsAnswered > 0
    ? Math.round((totalQuestionsCorrect / totalQuestionsAnswered) * 100)
    : 0;

  // Build Cognitive Levels Breakdown
  const cognitiveLevels = {
    nhan_biet: buildLevelMastery('nhan_biet', '1. Nhận biết (Ghi nhớ kiến thức cơ bản)', levelCounts.nhan_biet),
    thong_hieu: buildLevelMastery('thong_hieu', '2. Thông hiểu (Giải thích quy luật hóa học)', levelCounts.thong_hieu),
    van_dung: buildLevelMastery('van_dung', '3. Vận dụng (Tính toán & Giải quyết bài toán)', levelCounts.van_dung),
    van_dung_cao: buildLevelMastery('van_dung_cao', '4. Vận dụng cao (Tư duy tổng hợp & Thực tiễn)', levelCounts.van_dung_cao)
  };

  // Build 7 Chapters Mastery
  const chaptersMastery: ChapterMastery[] = CHEMISTRY_10_CURRICULUM.map((ch, idx) => {
    const stats = chapterCounts[ch.id] || { total: 0, correct: 0 };
    const pct = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
    
    let rating: ChapterMastery['rating'] = 'CHƯA LUYỆN TẬP';
    let recommendation = `Học sinh chưa làm nhiều câu hỏi thuộc ${ch.name}. Hãy luyện tập để củng cố kiến thức.`;

    if (stats.total > 0) {
      if (pct >= 85) {
        rating = 'THÀNH THẠO';
        recommendation = `Nắm rất vững các chuyên đề của ${ch.name}. Duy trì phong độ với các bài toán vận dụng cao.`;
      } else if (pct >= 70) {
        rating = 'KHÁ TỐT';
        recommendation = `Hiểu rõ lý thuyết cốt lõi của ${ch.name}, cần rèn luyện thêm kỹ năng tính toán nhanh.`;
      } else if (pct >= 50) {
        rating = 'TRUNG BÌNH';
        recommendation = `Còn nhầm lẫn ở một số dạng bài trong ${ch.name}. Cần đọc lại lý thuyết và làm lại câu sai.`;
      } else {
        rating = 'CẦN ÔN LUYỆN';
        recommendation = `Chưa đạt chuẩn đầu ra chương ${ch.name} (đúng ${pct}%). Cần được giáo viên hướng dẫn lại lý thuyết trọng tâm.`;
      }
    }

    return {
      chapterId: ch.id,
      chapterNumber: idx + 1,
      chapterTitle: getChapterTitle(ch.id),
      totalAnswered: stats.total,
      correctCount: stats.correct,
      percentage: pct,
      rating,
      recommendation
    };
  });

  // Generate Deterministic Pedagogical Insights
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const actionPlan: string[] = [];

  // Cognitive strength / weakness
  if (cognitiveLevels.nhan_biet.percentage >= 80 && cognitiveLevels.nhan_biet.totalAnswered >= 5) {
    strengths.push('Nền tảng lý thuyết và ghi nhớ khái niệm Hóa học 10 rất chắc chắn (Mức độ Nhận biết đạt ' + cognitiveLevels.nhan_biet.percentage + '%).');
  }
  if (cognitiveLevels.van_dung.percentage >= 75 && cognitiveLevels.van_dung.totalAnswered >= 4) {
    strengths.push('Khả năng tư duy logic và áp dụng công thức vào bài toán định lượng tốt (Mức độ Vận dụng đạt ' + cognitiveLevels.van_dung.percentage + '%).');
  }
  if (cognitiveLevels.thong_hieu.percentage < 65 && cognitiveLevels.thong_hieu.totalAnswered >= 4) {
    weaknesses.push('Mức độ Thông hiểu còn hạn chế (' + cognitiveLevels.thong_hieu.percentage + '%): Hay bị nhầm lẫn khi giải thích bản chất hiện tượng hóa học hoặc xu hướng biến đổi.');
  }
  if (cognitiveLevels.van_dung_cao.percentage < 50 && cognitiveLevels.van_dung_cao.totalAnswered >= 3) {
    weaknesses.push('Khả năng giải quyết bài toán Vận dụng cao còn yếu (' + cognitiveLevels.van_dung_cao.percentage + '%): Cần rèn luyện phương pháp thăng bằng electron nâng cao và bài toán enthalpy thực tế.');
  }

  // Chapter strengths / weaknesses
  const practicedChapters = chaptersMastery.filter(c => c.totalAnswered >= 3);
  const bestChapter = [...practicedChapters].sort((a, b) => b.percentage - a.percentage)[0];
  const worstChapter = [...practicedChapters].sort((a, b) => a.percentage - b.percentage)[0];

  if (bestChapter && bestChapter.percentage >= 75) {
    strengths.push(`Nắm vững kiến thức trọng tâm của ${bestChapter.chapterTitle} (Độ chính xác: ${bestChapter.percentage}%).`);
  }
  if (worstChapter && worstChapter.percentage < 65) {
    weaknesses.push(`Lỗ hổng kiến thức lớn nhất tập trung ở ${worstChapter.chapterTitle} (Tỷ lệ đúng chỉ đạt ${worstChapter.percentage}% sau ${worstChapter.totalAnswered} câu).`);
  }

  // Fallbacks if no specific strengths / weaknesses found yet
  if (strengths.length === 0) {
    if (averageScore >= 8.0) {
      strengths.push('Điểm số bài thi trung bình xuất sắc (' + averageScore + '/10), thái độ học tập và ôn luyện tích cực.');
    } else {
      strengths.push('Đã tích cực tham gia ' + totalSubmissions + ' lượt làm bài kiểm tra và tự luyện trên hệ thống.');
    }
  }

  if (weaknesses.length === 0) {
    if (averageScore < 7.0) {
      weaknesses.push('Tốc độ làm bài và độ chuẩn xác ở các câu hỏi trắc nghiệm cần được cải thiện thêm.');
    } else {
      weaknesses.push('Cần tiếp tục duy trì luyện tập đều đặn để không quên các dạng phản ứng oxi hóa - khử phức tạp.');
    }
  }

  // Action plan generation
  actionPlan.push(`1. Ôn tập lại toàn bộ câu hỏi làm sai trong các bài kiểm tra đã nộp.`);
  if (worstChapter && worstChapter.percentage < 70) {
    actionPlan.push(`2. Dành thêm 20 phút làm bài tự luyện chuyên đề: ${worstChapter.chapterTitle}.`);
  } else {
    actionPlan.push(`2. Thử sức với bộ đề luyện tập tổng hợp mức độ Vận dụng và Vận dụng cao.`);
  }
  actionPlan.push(`3. Tăng cường tốc độ phản xạ làm bài trắc nghiệm đúng 50s/câu để tối ưu thời gian khi làm bài kiểm tra chính thức.`);

  // Overall Pedagogical Summary
  let overallEvaluation = '';
  if (averageScore >= 8.5) {
    overallEvaluation = `Học sinh có năng lực Hóa học 10 xuất sắc (ĐTB: ${averageScore}/10). Nắm vững cả lý thuyết và kỹ năng giải toán. Đủ năng lực tham gia các kỳ thi học sinh giỏi hoặc đạt điểm 9-10 trong các kỳ thi định kỳ.`;
  } else if (averageScore >= 7.0) {
    overallEvaluation = `Học sinh có học lực Khá (ĐTB: ${averageScore}/10). Nắm được hầu hết kiến thức chuẩn GDPT 2018. Cần chú ý cẩn thận ở các câu hỏi bẫy lý thuyết và rèn luyện thêm bài toán vận dụng để bứt phá lên mức Xuất sắc.`;
  } else if (averageScore >= 5.0) {
    overallEvaluation = `Học sinh đạt mức độ Trung bình (ĐTB: ${averageScore}/10). Đã nắm được các khái niệm cơ bản nhưng còn lúng túng khi gặp bài tập biến thiên enthalpy, cân bằng phản ứng oxi hóa - khử hoặc quy luật bảng tuần hoàn. Cần bám sát hướng dẫn của giáo viên để bù đắp lỗ hổng.`;
  } else {
    overallEvaluation = `Học sinh đang gặp khó khăn trong môn Hóa 10 (ĐTB: ${averageScore}/10). Cần rà soát lại kiến thức từ Chương 1 (Cấu tạo nguyên tử) và làm lại các bài tập nhận biết cơ bản để lấy lại nền tảng vững chắc.`;
  }

  return {
    hasData: true,
    totalSubmissions,
    assignmentSubmissionsCount,
    selfPracticeSubmissionsCount,
    totalQuestionsAnswered,
    totalQuestionsCorrect,
    overallAccuracy,
    averageScore,
    highestScore,
    lowestScore,
    latestScore,
    scoreTrend,
    scoreTrendText,
    cognitiveLevels,
    chaptersMastery,
    strengths,
    weaknesses,
    actionPlan,
    overallEvaluation
  };
}

function buildLevelMastery(
  level: CognitiveLevel,
  label: string,
  stats: { total: number; correct: number }
): LevelMastery {
  const percentage = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
  let rating: LevelMastery['rating'] = 'CHƯA ĐỦ DỮ LIỆU';
  let pedagogicalComment = 'Chưa có đủ số lượng câu hỏi đã làm ở mức độ này.';

  if (stats.total > 0) {
    if (percentage >= 85) {
      rating = 'XUẤT SẮC';
      pedagogicalComment = 'Nắm rất vững và phản xạ cực kỳ chính xác ở mức độ này.';
    } else if (percentage >= 70) {
      rating = 'KHÁ';
      pedagogicalComment = 'Hiểu và làm tốt đa số câu hỏi, cần cẩn thận tránh các lỗi sai do bất cẩn.';
    } else if (percentage >= 50) {
      rating = 'TRUNG BÌNH';
      pedagogicalComment = 'Còn lúng túng, tỷ lệ sai còn đáng kể. Cần xem lại phương pháp giải.';
    } else {
      rating = 'CẦN CỦNG CỐ';
      pedagogicalComment = 'Chưa đạt yêu cầu chuẩn kiến thức kỹ năng. Cần dành thời gian ôn lại kỹ càng.';
    }
  }

  return {
    level,
    label,
    totalAnswered: stats.total,
    correctCount: stats.correct,
    percentage,
    rating,
    pedagogicalComment
  };
}

function createEmptyAnalysisResult(): CompetencyAnalysisResult {
  return {
    hasData: false,
    totalSubmissions: 0,
    assignmentSubmissionsCount: 0,
    selfPracticeSubmissionsCount: 0,
    totalQuestionsAnswered: 0,
    totalQuestionsCorrect: 0,
    overallAccuracy: 0,
    averageScore: 0,
    highestScore: 0,
    lowestScore: 0,
    latestScore: 0,
    scoreTrend: 'INSUFFICIENT_DATA',
    scoreTrendText: 'Chưa có dữ liệu làm bài thi.',
    cognitiveLevels: {
      nhan_biet: { level: 'nhan_biet', label: '1. Nhận biết', totalAnswered: 0, correctCount: 0, percentage: 0, rating: 'CHƯA ĐỦ DỮ LIỆU', pedagogicalComment: 'Chưa có dữ liệu.' },
      thong_hieu: { level: 'thong_hieu', label: '2. Thông hiểu', totalAnswered: 0, correctCount: 0, percentage: 0, rating: 'CHƯA ĐỦ DỮ LIỆU', pedagogicalComment: 'Chưa có dữ liệu.' },
      van_dung: { level: 'van_dung', label: '3. Vận dụng', totalAnswered: 0, correctCount: 0, percentage: 0, rating: 'CHƯA ĐỦ DỮ LIỆU', pedagogicalComment: 'Chưa có dữ liệu.' },
      van_dung_cao: { level: 'van_dung_cao', label: '4. Vận dụng cao', totalAnswered: 0, correctCount: 0, percentage: 0, rating: 'CHƯA ĐỦ DỮ LIỆU', pedagogicalComment: 'Chưa có dữ liệu.' }
    },
    chaptersMastery: CHEMISTRY_10_CURRICULUM.map((c, i) => ({
      chapterId: c.id,
      chapterNumber: i + 1,
      chapterTitle: getChapterTitle(c.id),
      totalAnswered: 0,
      correctCount: 0,
      percentage: 0,
      rating: 'CHƯA LUYỆN TẬP',
      recommendation: 'Chưa có dữ liệu luyện tập chương này.'
    })),
    strengths: ['Chưa có dữ liệu làm bài để phân tích điểm mạnh.'],
    weaknesses: ['Chưa có dữ liệu làm bài để phân tích lỗ hổng kiến thức.'],
    actionPlan: ['Hãy bắt đầu làm bài kiểm tra hoặc luyện tập theo chương để nhận báo cáo phân tích năng lực chi tiết.'],
    overallEvaluation: 'Học sinh chưa hoàn thành bài thi nào trên hệ thống.'
  };
}
