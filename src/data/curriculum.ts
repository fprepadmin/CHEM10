import { Chapter, Lesson, Question } from '../types';

export const ADMIN_EMAILS = [
  'thongtnmfct31178@gmail.com', 
  'muoint@fpt.edu.vn',
  'phuonglv9@fpt.edu.vn'
];
export const ADMIN_EMAIL = 'thongtnmfct31178@gmail.com';

export const CHEMISTRY_10_CURRICULUM: Chapter[] = [
  {
    id: 'chuong-1',
    name: 'Cấu tạo nguyên tử',
    title: 'Chương 1: Cấu tạo nguyên tử',
    description: 'Thành phần nguyên tử, hạt nhân, vỏ electron, đồng vị, cấu hình electron',
    lessons: [
      {
        id: 'chuong-1-thanh-phan-nguyen-tu',
        name: 'Thành phần của nguyên tử',
        title: 'Thành phần của nguyên tử',
        topics: ['Thành phần nguyên tử', 'Hạt proton, neutron, electron', 'Kích thước và khối lượng nguyên tử', 'Hạt nhân nguyên tử']
      },
      {
        id: 'chuong-1-nguyen-to-hoa-hoc',
        name: 'Nguyên tố hóa học',
        title: 'Nguyên tố hóa học',
        topics: ['Số hiệu nguyên tử (Z)', 'Số khối (A)', 'Đồng vị và nguyên tử khối trung bình', 'Kí hiệu hóa học']
      },
      {
        id: 'chuong-1-cau-truc-lop-vo-electron',
        name: 'Cấu trúc lớp vỏ electron nguyên tử',
        title: 'Cấu trúc lớp vỏ electron nguyên tử',
        topics: ['Lớp và phân lớp electron', 'Orbital nguyên tử (AO)', 'Cấu hình electron nguyên tử']
      }
    ]
  },
  {
    id: 'chuong-2',
    name: 'Bảng tuần hoàn các nguyên tố hóa học và định luật tuần hoàn',
    title: 'Chương 2: Bảng tuần hoàn các nguyên tố hóa học và định luật tuần hoàn',
    description: 'Nguyên tắc sắp xếp, cấu tạo bảng tuần hoàn, quy luật biến đổi tuần hoàn và định luật tuần hoàn',
    lessons: [
      {
        id: 'chuong-2-cau-tao-bang-tuan-hoan',
        name: 'Cấu tạo bảng tuần hoàn',
        title: 'Cấu tạo bảng tuần hoàn',
        topics: ['Ô nguyên tố, Chu kì, Nhóm A/B', 'Nguyên tố s, p, d, f', 'Nguyên tắc sắp xếp']
      },
      {
        id: 'chuong-2-xu-huong-bien-doi-tinh-chat',
        name: 'Xu hướng biến đổi tính chất của nguyên tố và hợp chất',
        title: 'Xu hướng biến đổi tính chất của nguyên tố và hợp chất',
        topics: ['Bán kính nguyên tử', 'Độ âm điện', 'Tính kim loại, tính phi kim', 'Tính acid - base của oxide/hydroxide']
      },
      {
        id: 'chuong-2-dinh-luat-tuan-hoan-va-y-nghia',
        name: 'Định luật tuần hoàn và ý nghĩa',
        title: 'Định luật tuần hoàn và ý nghĩa',
        topics: ['Định luật tuần hoàn', 'Mối liên hệ giữa cấu hình e và vị trí, tính chất', 'Ý nghĩa bảng tuần hoàn']
      }
    ]
  },
  {
    id: 'chuong-3',
    name: 'Liên kết hóa học',
    title: 'Chương 3: Liên kết hóa học',
    description: 'Quy tắc octet, liên kết ion, liên kết cộng hóa trị, liên kết hydrogen và tương tác van der Waals',
    lessons: [
      {
        id: 'chuong-3-quy-tac-octet',
        name: 'Quy tắc octet',
        title: 'Quy tắc octet',
        topics: ['Quy tắc bát tử', 'Sự tạo thành ion để đạt cấu hình bền vững']
      },
      {
        id: 'chuong-3-lien-ket-ion',
        name: 'Liên kết ion',
        title: 'Liên kết ion',
        topics: ['Bản chất liên kết ion', 'Lực hút tĩnh điện', 'Tinh thể ion và tính chất']
      },
      {
        id: 'chuong-3-lien-ket-cong-hoa-tri',
        name: 'Liên kết cộng hóa trị',
        title: 'Liên kết cộng hóa trị',
        topics: ['Cặp electron chung', 'Công thức Lewis, electron, cấu tạo', 'Liên kết đơn, đôi, ba', 'Độ phân cực liên kết và phân tử']
      },
      {
        id: 'chuong-3-lien-ket-hydrogen',
        name: 'Liên kết hydrogen',
        title: 'Liên kết hydrogen',
        topics: ['Bản chất liên kết hydrogen', 'Liên kết hydrogen liên phân tử', 'Ảnh hưởng đến nhiệt độ sôi/nóng chảy']
      },
      {
        id: 'chuong-3-tuong-tac-van-der-waals',
        name: 'Tương tác van der Waals',
        title: 'Tương tác van der Waals',
        topics: ['Bản chất tương tác van der Waals', 'Lực khuếch tán', 'Ảnh hưởng đến tính chất vật lý của các chất']
      }
    ]
  },
  {
    id: 'chuong-4',
    name: 'Phản ứng oxi hóa – khử',
    title: 'Chương 4: Phản ứng oxi hóa – khử',
    description: 'Số oxi hóa, quá trình oxi hóa khử, cân bằng phản ứng oxi hóa khử',
    lessons: [
      {
        id: 'chuong-4-khai-niem-phan-ung-oxi-hoa-khu',
        name: 'Khái niệm phản ứng oxi hóa – khử',
        title: 'Khái niệm phản ứng oxi hóa – khử',
        topics: ['Chất khử, chất oxi hóa', 'Quá trình khử, quá trình oxi hóa', 'Bản chất sự chuyển dịch electron']
      },
      {
        id: 'chuong-4-so-oxi-hoa',
        name: 'Số oxi hóa',
        title: 'Số oxi hóa',
        topics: ['Khái niệm và quy tắc xác định số oxi hóa', 'Xác định số oxi hóa của các nguyên tố trong đơn chất và hợp chất']
      },
      {
        id: 'chuong-4-phuong-phap-can-bang',
        name: 'Phương pháp cân bằng phản ứng oxi hóa – khử',
        title: 'Phương pháp cân bằng phản ứng oxi hóa – khử',
        topics: ['Phương pháp thăng bằng electron', 'Cân bằng các dạng phản ứng oxi hóa - khử tự oxi hóa khử, nội phân tử, môi trường']
      }
    ]
  },
  {
    id: 'chuong-5',
    name: 'Năng lượng hóa học',
    title: 'Chương 5: Năng lượng hóa học',
    description: 'Phản ứng tỏa nhiệt, thu nhiệt, enthalpy tạo thành chuẩn, biến thiên enthalpy',
    lessons: [
      {
        id: 'chuong-5-phan-ung-toa-nhiet',
        name: 'Phản ứng tỏa nhiệt',
        title: 'Phản ứng tỏa nhiệt',
        topics: ['Khái niệm phản ứng tỏa nhiệt (ΔrH°₂₉₈ < 0)', 'Hiện tượng tỏa nhiệt', 'Ứng dụng thực tiễn của phản ứng tỏa nhiệt']
      },
      {
        id: 'chuong-5-phan-ung-thu-nhiet',
        name: 'Phản ứng thu nhiệt',
        title: 'Phản ứng thu nhiệt',
        topics: ['Khái niệm phản ứng thu nhiệt (ΔrH°₂₉₈ > 0)', 'Hiện tượng thu nhiệt', 'Ứng dụng thực tiễn phản ứng thu nhiệt']
      },
      {
        id: 'chuong-5-bien-thien-enthalpy-chuan',
        name: 'Biến thiên enthalpy chuẩn của phản ứng hóa học',
        title: 'Biến thiên enthalpy chuẩn của phản ứng hóa học',
        topics: ['Nhiệt tạo thành chuẩn (ΔfH°₂₉₈)', 'Năng lượng liên kết (Eb)', 'Tính toán biến thiên enthalpy chuẩn theo ΔfH° và Eb']
      }
    ]
  },
  {
    id: 'chuong-6',
    name: 'Tốc độ phản ứng hóa học',
    title: 'Chương 6: Tốc độ phản ứng hóa học',
    description: 'Khái niệm tốc độ phản ứng, phương trình tốc độ, các yếu tố ảnh hưởng đến tốc độ phản ứng',
    lessons: [
      {
        id: 'chuong-6-khai-niem-toc-do-phan-ung',
        name: 'Khái niệm tốc độ phản ứng',
        title: 'Khái niệm tốc độ phản ứng',
        topics: ['Khái niệm tốc độ phản ứng', 'Tốc độ trung bình', 'Tốc độ tức thời', 'Ý nghĩa thực tế']
      },
      {
        id: 'chuong-6-phuong-trinh-toc-do-phan-ung',
        name: 'Phương trình tốc độ phản ứng',
        title: 'Phương trình tốc độ phản ứng',
        topics: ['Phương trình tốc độ phản ứng', 'Định luật tác dụng khối lượng', 'Hằng số tốc độ k', 'Bậc phản ứng']
      },
      {
        id: 'chuong-6-cac-yeu-to-anh-huong-toc-do',
        name: 'Các yếu tố ảnh hưởng đến tốc độ phản ứng',
        title: 'Các yếu tố ảnh hưởng đến tốc độ phản ứng',
        topics: ['Ảnh hưởng của nồng độ, nhiệt độ, áp suất', 'Diện tích tiếp xúc và chất xúc tác', 'Hệ số nhiệt độ Van\'t Hoff']
      }
    ]
  },
  {
    id: 'chuong-7',
    name: 'Nguyên tố nhóm VIIA – Halogen',
    title: 'Chương 7: Nguyên tố nhóm VIIA – Halogen',
    description: 'Tính chất vật lý, hóa học của đơn chất Halogen, hydrogen halide và hydrohalic acid',
    lessons: [
      {
        id: 'chuong-7-tinh-chat-vat-ly-halogen',
        name: 'Tính chất vật lý của đơn chất halogen',
        title: 'Tính chất vật lý của đơn chất halogen',
        topics: ['Trạng thái tập hợp, màu sắc', 'Nhiệt độ nóng chảy, nhiệt độ sôi của F₂, Cl₂, Br₂, I₂', 'Quy luật biến đổi tính chất vật lý']
      },
      {
        id: 'chuong-7-tinh-chat-hoa-hoc-halogen',
        name: 'Tính chất hóa học của đơn chất halogen',
        title: 'Tính chất hóa học của đơn chất halogen',
        topics: ['Tính oxi hóa mạnh của halogen', 'Tác dụng với kim loại, hydrogen, nước, kiềm', 'Phản ứng thế giữa các halogen']
      },
      {
        id: 'chuong-7-hydrogen-halide-va-hydrohalic-acid',
        name: 'Hydrogen halide và hydrohalic acid',
        title: 'Hydrogen halide và hydrohalic acid',
        topics: ['Hydrogen halide (HF, HCl, HBr, HI)', 'Tính acid và tính khử của hydrohalic acid', 'Nhận biết ion halide bằng dung dịch AgNO₃']
      }
    ]
  }
];
export const DEMO_QUESTIONS: Question[] = [];

// Canonical Chapter definitions & normalization helper
export const CANONICAL_CHAPTER_NAMES: Record<string, string> = {
  'chuong-1': 'Chương 1: Cấu tạo nguyên tử',
  'chuong-2': 'Chương 2: Bảng tuần hoàn các nguyên tố hóa học và định luật tuần hoàn',
  'chuong-3': 'Chương 3: Liên kết hóa học',
  'chuong-4': 'Chương 4: Phản ứng oxi hóa – khử',
  'chuong-5': 'Chương 5: Năng lượng hóa học',
  'chuong-6': 'Chương 6: Tốc độ phản ứng hóa học',
  'chuong-7': 'Chương 7: Nguyên tố nhóm VIIA – Halogen',
};

export const UNCLASSIFIED_CHAPTER_ID = 'unclassified';

/**
 * Normalizes any variation of chapter identifier to standard 'chuong-1'..'chuong-7'
 * Returns 'unclassified' if not recognized.
 */
export function normalizeChapterId(raw?: string | null): string {
  if (!raw) return UNCLASSIFIED_CHAPTER_ID;
  const s = String(raw).trim().toLowerCase();
  
  if (s === '1' || s === 'chuong-1' || s === 'chuong_1' || s === 'chapter_1' || s === 'chapter-1' || s.includes('nguyên tử') || s.includes('chương 1') || s.includes('chuong 1')) {
    return 'chuong-1';
  }
  if (s === '2' || s === 'chuong-2' || s === 'chuong_2' || s === 'chapter_2' || s === 'chapter-2' || s.includes('tuần hoàn') || s.includes('bth') || s.includes('chương 2') || s.includes('chuong 2')) {
    return 'chuong-2';
  }
  if (s === '3' || s === 'chuong-3' || s === 'chuong_3' || s === 'chapter_3' || s === 'chapter-3' || s.includes('liên kết') || s.includes('chương 3') || s.includes('chuong 3')) {
    return 'chuong-3';
  }
  if (s === '4' || s === 'chuong-4' || s === 'chuong_4' || s === 'chapter_4' || s === 'chapter-4' || s.includes('oxi hóa') || s.includes('oxh') || s.includes('chương 4') || s.includes('chuong 4')) {
    return 'chuong-4';
  }
  if (s === '5' || s === 'chuong-5' || s === 'chuong_5' || s === 'chapter_5' || s === 'chapter-5' || s.includes('năng lượng') || s.includes('enthalpy') || s.includes('nhiệt') || s.includes('chương 5') || s.includes('chuong 5')) {
    return 'chuong-5';
  }
  if (s === '6' || s === 'chuong-6' || s === 'chuong_6' || s === 'chapter_6' || s === 'chapter-6' || s.includes('tốc độ') || s.includes('chương 6') || s.includes('chuong 6')) {
    return 'chuong-6';
  }
  if (s === '7' || s === 'chuong-7' || s === 'chuong_7' || s === 'chapter_7' || s === 'chapter-7' || s.includes('halogen') || s.includes('viia') || s.includes('chương 7') || s.includes('chuong 7')) {
    return 'chuong-7';
  }

  // Check against full list
  const found = CHEMISTRY_10_CURRICULUM.find(c => c.id === s || c.title.toLowerCase() === s || (c.name && c.name.toLowerCase() === s));
  if (found) return found.id;

  return UNCLASSIFIED_CHAPTER_ID;
}

export function getChapterNumber(chapterId?: string): number | null {
  const norm = normalizeChapterId(chapterId);
  const match = norm.match(/chuong-(\d)/);
  return match ? parseInt(match[1], 10) : null;
}

export function getChapterTitle(chapterId?: string): string {
  const norm = normalizeChapterId(chapterId);
  if (norm === UNCLASSIFIED_CHAPTER_ID) return 'Chưa phân loại';
  return CANONICAL_CHAPTER_NAMES[norm] || 'Chương học Hóa 10';
}

export function getChapterName(chapterId?: string): string {
  const norm = normalizeChapterId(chapterId);
  const found = CHEMISTRY_10_CURRICULUM.find(c => c.id === norm);
  return found ? (found.name || found.title.replace(/^Chương\s*\d+[:.]?\s*/i, '')) : 'Chưa phân loại';
}

/**
 * Resolves the canonical lesson ID for a question within a chapter context.
 * Returns null if no match is found or if chapter is unclassified.
 */
export function getQuestionCanonicalLessonId(
  q: {
    chapterId?: string | null;
    chapterTitle?: string | null;
    lessonId?: string | null;
    lessonName?: string | null;
    lessonTitle?: string | null;
    topic?: string | null;
  },
  contextChapterId?: string | null
): string | null {
  const normChapter = contextChapterId 
    ? normalizeChapterId(contextChapterId) 
    : normalizeChapterId(q.chapterId || q.chapterTitle);

  if (!normChapter || normChapter === UNCLASSIFIED_CHAPTER_ID) return null;

  const ch = CHEMISTRY_10_CURRICULUM.find(c => c.id === normChapter);
  if (!ch || !ch.lessons.length) return null;

  const rawLessonId = String(q.lessonId || '').trim().toLowerCase();
  const lessonName = String(q.lessonName || '').trim().toLowerCase();
  const lessonTitle = String(q.lessonTitle || '').trim().toLowerCase();
  const topic = String(q.topic || '').trim().toLowerCase();

  // 1. Direct canonical match by lesson.id (e.g. 'chuong-1-thanh-phan-nguyen-tu')
  if (rawLessonId) {
    const exactLesson = ch.lessons.find(l => l.id.toLowerCase() === rawLessonId);
    if (exactLesson) return exactLesson.id;
  }

  // 2. Relative index / chapter lesson number (e.g. 'bai-1', 'bai 1', 'bài 1', '1', 'lesson-1', 'lesson 1')
  if (rawLessonId) {
    const numMatch = rawLessonId.match(/^(?:bai[-_\s]*|bài[-_\s]*|lesson[-_\s]*)?(\d+)$/i);
    if (numMatch) {
      const idx = parseInt(numMatch[1], 10) - 1;
      if (idx >= 0 && idx < ch.lessons.length) {
        return ch.lessons[idx].id;
      }
    }
  }

  // 3. Global legacy map across all 7 chapters (e.g. 'bai-4' -> chuong-2-cau-tao-bang-tuan-hoan)
  const globalLegacyMap: Record<string, string> = {
    'bai-1': 'chuong-1-thanh-phan-nguyen-tu',
    'bai-2': 'chuong-1-nguyen-to-hoa-hoc',
    'bai-3': 'chuong-1-cau-truc-lop-vo-electron',
    'bai-4': 'chuong-2-cau-tao-bang-tuan-hoan',
    'bai-5': 'chuong-2-xu-huong-bien-doi-tinh-chat',
    'bai-6': 'chuong-2-dinh-luat-tuan-hoan-va-y-nghia',
    'bai-7': 'chuong-3-quy-tac-octet',
    'bai-8': 'chuong-3-lien-ket-ion',
    'bai-9': 'chuong-3-lien-ket-cong-hoa-tri',
    'bai-10': 'chuong-3-lien-ket-hydrogen',
    'bai-11': 'chuong-4-so-oxi-hoa',
    'bai-12': 'chuong-4-phuong-phap-can-bang',
    'bai-13': 'chuong-5-phan-ung-toa-nhiet',
    'bai-14': 'chuong-5-bien-thien-enthalpy-chuan',
    'bai-15': 'chuong-6-khai-niem-toc-do-phan-ung',
    'bai-16': 'chuong-6-cac-yeu-to-anh-huong-toc-do',
    'bai-17': 'chuong-7-tinh-chat-hoa-hoc-halogen',
    'bai-18': 'chuong-7-hydrogen-halide-va-hydrohalic-acid',
  };
  if (rawLessonId && globalLegacyMap[rawLessonId]) {
    const target = globalLegacyMap[rawLessonId];
    if (ch.lessons.some(l => l.id === target)) {
      return target;
    }
  }

  // 4. Exact/Substring match on lessonName or lessonTitle or rawLessonId
  for (const l of ch.lessons) {
    const lName = l.name.toLowerCase();
    const lTitle = l.title.toLowerCase();

    if (rawLessonId && rawLessonId.length >= 3 && (rawLessonId.includes(lName) || rawLessonId.includes(lTitle) || lName.includes(rawLessonId) || lTitle.includes(rawLessonId))) {
      return l.id;
    }
    if (lessonName && lessonName.length >= 3 && (lessonName.includes(lName) || lName.includes(lessonName) || lessonName === lTitle)) {
      return l.id;
    }
    if (lessonTitle && lessonTitle.length >= 3 && (lessonTitle.includes(lName) || lTitle.includes(lessonTitle) || lessonTitle === lName)) {
      return l.id;
    }
  }

  // 5. Match by topic
  if (topic && topic.length >= 3) {
    for (const l of ch.lessons) {
      if (l.topics.some(t => t.toLowerCase() === topic || topic.includes(t.toLowerCase()) || t.toLowerCase().includes(topic))) {
        return l.id;
      }
      if (topic.includes(l.name.toLowerCase()) || l.name.toLowerCase().includes(topic)) {
        return l.id;
      }
    }
  }

  // 6. Match by content / keywords if available
  const content = String((q as any).content || '').trim().toLowerCase();
  const keywords = Array.isArray((q as any).keywords) ? (q as any).keywords.join(' ').toLowerCase() : '';
  const searchCorpus = `${content} ${keywords}`;
  if (searchCorpus.trim().length > 5) {
    for (const l of ch.lessons) {
      if (searchCorpus.includes(l.name.toLowerCase()) || searchCorpus.includes(l.title.toLowerCase())) {
        return l.id;
      }
      for (const t of l.topics) {
        if (t.length >= 4 && searchCorpus.includes(t.toLowerCase())) {
          return l.id;
        }
      }
    }
  }

  return null;
}

/**
 * Normalizes legacy lesson IDs (bai-1 .. bai-18) or text to canonical lesson IDs
 */
export function normalizeLessonId(chapterId?: string, rawLessonId?: string | null, fallbackText?: string): string {
  const normChapter = normalizeChapterId(chapterId);
  const ch = CHEMISTRY_10_CURRICULUM.find(c => c.id === normChapter);
  if (!ch || !ch.lessons.length) return rawLessonId || '';

  const res = getQuestionCanonicalLessonId({
    chapterId: normChapter,
    lessonId: rawLessonId,
    lessonName: fallbackText,
    lessonTitle: fallbackText,
    topic: fallbackText
  }, normChapter);

  return res || (ch.lessons[0]?.id || '');
}

export function getLessonTitle(chapterId?: string, lessonId?: string): string {
  const normChapter = normalizeChapterId(chapterId);
  const ch = CHEMISTRY_10_CURRICULUM.find(c => c.id === normChapter);
  if (!ch) return 'Tổng hợp';
  const normLesson = normalizeLessonId(normChapter, lessonId);
  const found = ch.lessons.find(l => l.id === normLesson);
  return found ? found.title : (ch.lessons[0]?.title || 'Tổng hợp');
}

export function getLessonName(chapterId?: string, lessonId?: string): string {
  const normChapter = normalizeChapterId(chapterId);
  const ch = CHEMISTRY_10_CURRICULUM.find(c => c.id === normChapter);
  if (!ch) return 'Tổng hợp';
  const normLesson = normalizeLessonId(normChapter, lessonId);
  const found = ch.lessons.find(l => l.id === normLesson);
  return found ? (found.name || found.title) : (ch.lessons[0]?.name || ch.lessons[0]?.title || 'Tổng hợp');
}

export function getLessonsByChapter(chapterId?: string): Lesson[] {
  const normChapter = normalizeChapterId(chapterId);
  const ch = CHEMISTRY_10_CURRICULUM.find(c => c.id === normChapter);
  return ch ? ch.lessons : [];
}

export const DEFAULT_CHEMISTRY_QUESTIONS: Question[] = [
  // ==========================================
  // CHƯƠNG 1: CẤU TẠO NGUYÊN TỬ
  // ==========================================
  {
    id: 'c1-q1',
    content: 'Hạt nào sau đây mang điện tích âm trong nguyên tử?',
    chapterId: 'chuong-1',
    chapterTitle: 'Chương 1: Cấu tạo nguyên tử',
    lessonId: 'chuong-1-thanh-phan-nguyen-tu',
    lessonTitle: 'Thành phần của nguyên tử',
    topic: 'Thành phần nguyên tử',
    level: 'nhan_biet',
    type: 'multiple_choice',
    options: [
      { id: 'A', text: 'Proton', isCorrect: false },
      { id: 'B', text: 'Neutron', isCorrect: false },
      { id: 'C', text: 'Electron', isCorrect: true },
      { id: 'D', text: 'Hạt nhân', isCorrect: false }
    ],
    correctAnswer: 'C',
    explanation: 'Electron (e) mang điện tích âm (-1), proton (p) mang điện tích dương (+1), neutron (n) không mang điện.',
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'c1-q2',
    content: 'Nguyên tử của nguyên tố Na có Z = 11. Cấu hình electron của nguyên tử sodium (Na) ở trạng thái cơ bản là:',
    chapterId: 'chuong-1',
    chapterTitle: 'Chương 1: Cấu tạo nguyên tử',
    lessonId: 'chuong-1-cau-truc-lop-vo-electron',
    lessonTitle: 'Cấu trúc lớp vỏ electron nguyên tử',
    topic: 'Cấu hình electron nguyên tử',
    level: 'nhan_biet',
    type: 'multiple_choice',
    options: [
      { id: 'A', text: '1s² 2s² 2p⁶ 3s¹', isCorrect: true },
      { id: 'B', text: '1s² 2s² 2p⁶ 3s²', isCorrect: false },
      { id: 'C', text: '1s² 2s² 2p⁵ 3s²', isCorrect: false },
      { id: 'D', text: '1s² 2s² 2p⁶', isCorrect: false }
    ],
    correctAnswer: 'A',
    explanation: 'Với Z = 11, các electron được phân bố: 1s² 2s² 2p⁶ 3s¹.',
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'c1-q3',
    content: 'Số orbital nguyên tử (AO) trong phân lớp p là:',
    chapterId: 'chuong-1',
    chapterTitle: 'Chương 1: Cấu tạo nguyên tử',
    lessonId: 'chuong-1-cau-truc-lop-vo-electron',
    lessonTitle: 'Cấu trúc lớp vỏ electron nguyên tử',
    topic: 'Orbital nguyên tử (AO)',
    level: 'nhan_biet',
    type: 'multiple_choice',
    options: [
      { id: 'A', text: '1', isCorrect: false },
      { id: 'B', text: '3', isCorrect: true },
      { id: 'C', text: '5', isCorrect: false },
      { id: 'D', text: '7', isCorrect: false }
    ],
    correctAnswer: 'B',
    explanation: 'Phân lớp s có 1 AO, phân lớp p có 3 AO (px, py, pz), phân lớp d có 5 AO, phân lớp f có 7 AO.',
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'c1-q4',
    content: 'Cho các phát biểu sau về cấu tạo nguyên tử:\n' +
      'a) Hạt nhân nguyên tử gồm các hạt proton và neutron.\n' +
      'b) Số khối A bằng tổng số hạt proton, neutron và electron.\n' +
      'c) Trong nguyên tử trung hòa về điện, số proton luôn bằng số electron.\n' +
      'd) Khối lượng nguyên tử tập trung chủ yếu ở hạt nhân.',
    chapterId: 'chuong-1',
    chapterTitle: 'Chương 1: Cấu tạo nguyên tử',
    lessonId: 'chuong-1-thanh-phan-nguyen-tu',
    lessonTitle: 'Thành phần của nguyên tử',
    topic: 'Hạt nhân và khối lượng nguyên tử',
    level: 'thong_hieu',
    type: 'true_false',
    correctAnswer: [true, false, true, true],
    explanation: 'Ý b sai vì Số khối A = số proton (Z) + số neutron (N), electron có khối lượng rất nhỏ không tính vào số khối.',
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'c1-q5',
    content: 'Tổng số hạt proton, neutron và electron trong một nguyên tử X là 40, trong đó số hạt mang điện nhiều hơn số hạt không mang điện là 12. Xác định số hiệu nguyên tử (Z) của nguyên tố X.',
    chapterId: 'chuong-1',
    chapterTitle: 'Chương 1: Cấu tạo nguyên tử',
    lessonId: 'chuong-1-nguyen-to-hoa-hoc',
    lessonTitle: 'Nguyên tố hóa học',
    topic: 'Số hiệu nguyên tử (Z)',
    level: 'van_dung',
    type: 'short_answer',
    correctAnswer: '13',
    explanation: 'Hệ phương trình: 2Z + N = 40 và 2Z - N = 12 => 4Z = 52 => Z = 13 (Al).',
    createdAt: '2026-01-01T00:00:00.000Z'
  },

  // ==========================================
  // CHƯƠNG 2: BẢNG TUẦN HOÀN
  // ==========================================
  {
    id: 'c2-q1',
    content: 'Các nguyên tố trong cùng một chu kì của bảng tuần hoàn có cùng đặc điểm nào sau đây?',
    chapterId: 'chuong-2',
    chapterTitle: 'Chương 2: Bảng tuần hoàn các nguyên tố hóa học và định luật tuần hoàn',
    lessonId: 'chuong-2-cau-tao-bang-tuan-hoan',
    lessonTitle: 'Cấu tạo bảng tuần hoàn',
    topic: 'Cấu tạo bảng tuần hoàn',
    level: 'nhan_biet',
    type: 'multiple_choice',
    options: [
      { id: 'A', text: 'Số electron hóa trị', isCorrect: false },
      { id: 'B', text: 'Số lớp electron trong nguyên tử', isCorrect: true },
      { id: 'C', text: 'Số electron lớp ngoài cùng', isCorrect: false },
      { id: 'D', text: 'Số neutron trong hạt nhân', isCorrect: false }
    ],
    correctAnswer: 'B',
    explanation: 'Chu kì là dãy các nguyên tố mà nguyên tử của chúng có cùng số lớp electron.',
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'c2-q2',
    content: 'Trong một nhóm A, theo chiều tăng của điện tích hạt nhân (từ trên xuống dưới), bán kính nguyên tử biến đổi như thế nào?',
    chapterId: 'chuong-2',
    chapterTitle: 'Chương 2: Bảng tuần hoàn các nguyên tố hóa học và định luật tuần hoàn',
    lessonId: 'chuong-2-xu-huong-bien-doi-tinh-chat',
    lessonTitle: 'Xu hướng biến đổi tính chất của nguyên tố và hợp chất',
    topic: 'Bán kính nguyên tử',
    level: 'nhan_biet',
    type: 'multiple_choice',
    options: [
      { id: 'A', text: 'Tăng dần', isCorrect: true },
      { id: 'B', text: 'Giảm dần', isCorrect: false },
      { id: 'C', text: 'Không đổi', isCorrect: false },
      { id: 'D', text: 'Biến đổi không có quy luật', isCorrect: false }
    ],
    correctAnswer: 'A',
    explanation: 'Đi từ trên xuống dưới trong nhóm A, số lớp electron tăng dần nên bán kính nguyên tử tăng dần.',
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'c2-q3',
    content: 'Cho các phát biểu sau về quy luật biến đổi trong bảng tuần hoàn:\n' +
      'a) Đi từ trái sang phải trong một chu kì, tính kim loại giảm dần, tính phi kim tăng dần.\n' +
      'b) Trong một chu kì, độ âm điện nói chung tăng dần theo chiều tăng của điện tích hạt nhân.\n' +
      'c) Oxide cao nhất của nguyên tố nhóm VIIA có công thức chung là R2O7.\n' +
      'd) Tính acid của các hydroxide trong cùng chu kì giảm dần từ trái sang phải.',
    chapterId: 'chuong-2',
    chapterTitle: 'Chương 2: Bảng tuần hoàn các nguyên tố hóa học và định luật tuần hoàn',
    lessonId: 'chuong-2-xu-huong-bien-doi-tinh-chat',
    lessonTitle: 'Xu hướng biến đổi tính chất của nguyên tố và hợp chất',
    topic: 'Định luật tuần hoàn',
    level: 'thong_hieu',
    type: 'true_false',
    correctAnswer: [true, true, true, false],
    explanation: 'Ý d sai vì trong cùng một chu kì từ trái sang phải, tính base giảm dần và tính acid của hydroxide tăng dần.',
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'c2-q4',
    content: 'Nguyên tố X thuộc chu kì 3, nhóm VIA của bảng tuần hoàn. Công thức oxide cao nhất của X là gì?',
    chapterId: 'chuong-2',
    chapterTitle: 'Chương 2: Bảng tuần hoàn các nguyên tố hóa học và định luật tuần hoàn',
    lessonId: 'chuong-2-dinh-luat-tuan-hoan-va-y-nghia',
    lessonTitle: 'Định luật tuần hoàn và ý nghĩa',
    topic: 'Công thức oxide cao nhất',
    level: 'van_dung',
    type: 'short_answer',
    correctAnswer: 'SO3',
    explanation: 'Nguyên tố chu kì 3, nhóm VIA là Sulfur (S). Hóa trị cao nhất trong oxide là VI => Công thức oxide cao nhất là SO₃.',
    createdAt: '2026-01-01T00:00:00.000Z'
  },

  // ==========================================
  // CHƯƠNG 3: LIÊN KẾT HÓA HỌC
  // ==========================================
  {
    id: 'c3-q1',
    content: 'Liên kết ion được hình thành bởi lực hút nào sau đây?',
    chapterId: 'chuong-3',
    chapterTitle: 'Chương 3: Liên kết hóa học',
    lessonId: 'chuong-3-lien-ket-ion',
    lessonTitle: 'Liên kết ion',
    topic: 'Liên kết ion',
    level: 'nhan_biet',
    type: 'multiple_choice',
    options: [
      { id: 'A', text: 'Lực hút tĩnh điện giữa các ion mang điện tích trái dấu', isCorrect: true },
      { id: 'B', text: 'Lực tương tác giữa các electron tự do và ion kim loại', isCorrect: false },
      { id: 'C', text: 'Lực chia sẻ đôi electron chung giữa hai nguyên tử', isCorrect: false },
      { id: 'D', text: 'Lực van der Waals giữa các phân tử', isCorrect: false }
    ],
    correctAnswer: 'A',
    explanation: 'Liên kết ion là liên kết được hình thành bởi lực hút tĩnh điện giữa các ion mang điện tích trái dấu.',
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'c3-q2',
    content: 'Liên kết trong phân tử N2 là:',
    chapterId: 'chuong-3',
    chapterTitle: 'Chương 3: Liên kết hóa học',
    lessonId: 'chuong-3-lien-ket-cong-hoa-tri',
    lessonTitle: 'Liên kết cộng hóa trị',
    topic: 'Liên kết ba',
    level: 'nhan_biet',
    type: 'multiple_choice',
    options: [
      { id: 'A', text: 'Liên kết đơn', isCorrect: false },
      { id: 'B', text: 'Liên kết đôi', isCorrect: false },
      { id: 'C', text: 'Liên kết ba', isCorrect: true },
      { id: 'D', text: 'Liên kết ion', isCorrect: false }
    ],
    correctAnswer: 'C',
    explanation: 'Hai nguyên tử N liên kết với nhau bằng 3 cặp electron dùng chung (liên kết ba N≡N).',
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'c3-q3',
    content: 'Cho các phát biểu sau về liên kết hóa học:\n' +
      'a) Quy tắc octet là xu hướng các nguyên tử đạt cấu hình bền vững với 8 electron ở lớp ngoài cùng.\n' +
      'b) Hợp chất ion thường có nhiệt độ nóng chảy và nhiệt độ sôi cao.\n' +
      'c) Liên kết hydrogen yếu hơn liên kết cộng hóa trị.\n' +
      'd) Phân tử H2O có liên kết cộng hóa trị không phân cực.',
    chapterId: 'chuong-3',
    chapterTitle: 'Chương 3: Liên kết hóa học',
    lessonId: 'chuong-3-quy-tac-octet',
    lessonTitle: 'Quy tắc octet',
    topic: 'Quy tắc bát tử',
    level: 'thong_hieu',
    type: 'true_false',
    correctAnswer: [true, true, true, false],
    explanation: 'Ý d sai vì hiệu độ âm điện giữa O và H lớn (3.44 - 2.20 = 1.24) nên liên kết O-H là liên kết cộng hóa trị phân cực.',
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'c3-q4',
    content: 'Viết công thức hợp chất ion tạo bởi cation Mg²⁺ và anion Cl⁻.',
    chapterId: 'chuong-3',
    chapterTitle: 'Chương 3: Liên kết hóa học',
    lessonId: 'chuong-3-lien-ket-ion',
    lessonTitle: 'Liên kết ion',
    topic: 'Công thức hợp chất ion',
    level: 'van_dung',
    type: 'short_answer',
    correctAnswer: 'MgCl2',
    explanation: 'Cation Mg²⁺ kết hợp với 2 anion Cl⁻ tạo thành tinh thể trung hòa điện có công thức MgCl₂.',
    createdAt: '2026-01-01T00:00:00.000Z'
  },

  // ==========================================
  // CHƯƠNG 4: PHẢN ỨNG OXI HÓA - KHỬ
  // ==========================================
  {
    id: 'c4-q1',
    content: 'Chất khử là chất:',
    chapterId: 'chuong-4',
    chapterTitle: 'Chương 4: Phản ứng oxi hóa - khử',
    lessonId: 'chuong-4-phan-ung-oxi-hoa-khu',
    lessonTitle: 'Phản ứng oxi hóa - khử',
    topic: 'Chất khử và chất oxi hóa',
    level: 'nhan_biet',
    type: 'multiple_choice',
    options: [
      { id: 'A', text: 'Nhường electron (số oxi hóa tăng sau phản ứng)', isCorrect: true },
      { id: 'B', text: 'Nhận electron (số oxi hóa giảm sau phản ứng)', isCorrect: false },
      { id: 'C', text: 'Chỉ nhận proton H⁺', isCorrect: false },
      { id: 'D', text: 'Không làm thay đổi số oxi hóa', isCorrect: false }
    ],
    correctAnswer: 'A',
    explanation: 'Chất khử nhường electron, có số oxi hóa tăng sau phản ứng ("Khử cho O nhận").',
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'c4-q2',
    content: 'Số oxi hóa của nguyên tố Nitrogen trong phân tử HNO3 là:',
    chapterId: 'chuong-4',
    chapterTitle: 'Chương 4: Phản ứng oxi hóa - khử',
    lessonId: 'chuong-4-so-oxi-hoa',
    lessonTitle: 'Số oxi hóa',
    topic: 'Xác định số oxi hóa',
    level: 'nhan_biet',
    type: 'multiple_choice',
    options: [
      { id: 'A', text: '+3', isCorrect: false },
      { id: 'B', text: '+5', isCorrect: true },
      { id: 'C', text: '-3', isCorrect: false },
      { id: 'D', text: '+4', isCorrect: false }
    ],
    correctAnswer: 'B',
    explanation: 'Trong HNO3: H(+1), O(-2) => (+1) + x + 3*(-2) = 0 => x = +5.',
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'c4-q3',
    content: 'Cho phương trình phản ứng: Fe + 4HNO3 -> Fe(NO3)3 + NO + 2H2O. Tổng hệ số nguyên tối giản của các chất tham gia phản ứng (vế trái) là bao nhiêu?',
    chapterId: 'chuong-4',
    chapterTitle: 'Chương 4: Phản ứng oxi hóa - khử',
    lessonId: 'chuong-4-can-bang-phan-ung-oxi-hoa-khu',
    lessonTitle: 'Cân bằng phản ứng oxi hóa - khử',
    topic: 'Cân bằng phương trình',
    level: 'van_dung',
    type: 'short_answer',
    correctAnswer: '5',
    explanation: 'Các chất tham gia gồm 1 Fe và 4 HNO3 => Tổng hệ số vế trái = 1 + 4 = 5.',
    createdAt: '2026-01-01T00:00:00.000Z'
  },

  // ==========================================
  // CHƯƠNG 5: NĂNG LƯỢNG HÓA HỌC
  // ==========================================
  {
    id: 'c5-q1',
    content: 'Phản ứng tỏa nhiệt là phản ứng có biến thiên enthalpy chuẩn:',
    chapterId: 'chuong-5',
    chapterTitle: 'Chương 5: Năng lượng hóa học',
    lessonId: 'chuong-5-phan-ung-toa-nhiet-thu-nhiet',
    lessonTitle: 'Phản ứng tỏa nhiệt và thu nhiệt',
    topic: 'Biến thiên enthalpy',
    level: 'nhan_biet',
    type: 'multiple_choice',
    options: [
      { id: 'A', text: 'ΔrHo298 < 0', isCorrect: true },
      { id: 'B', text: 'ΔrHo298 > 0', isCorrect: false },
      { id: 'C', text: 'ΔrHo298 = 0', isCorrect: false },
      { id: 'D', text: 'ΔrHo298 ≥ 0', isCorrect: false }
    ],
    correctAnswer: 'A',
    explanation: 'Phản ứng tỏa nhiệt giải phóng năng lượng ra môi trường nên ΔrHo298 < 0.',
    createdAt: '2026-01-01T00:00:00.000Z'
  },

  // ==========================================
  // CHƯƠNG 6: TỐC ĐỘ PHẢN ỨNG
  // ==========================================
  {
    id: 'c6-q1',
    content: 'Yếu tố nào sau đây KHÔNG làm tăng tốc độ phản ứng giữa chất rắn và chất lỏng?',
    chapterId: 'chuong-6',
    chapterTitle: 'Chương 6: Tốc độ phản ứng hóa học',
    lessonId: 'chuong-6-cac-yeu-to-anh-huong',
    lessonTitle: 'Các yếu tố ảnh hưởng đến tốc độ phản ứng',
    topic: 'Yếu tố ảnh hưởng tốc độ phản ứng',
    level: 'nhan_biet',
    type: 'multiple_choice',
    options: [
      { id: 'A', text: 'Tăng nhiệt độ', isCorrect: false },
      { id: 'B', text: 'Nghiền nhỏ chất rắn làm tăng diện tích bề mặt tiếp xúc', isCorrect: false },
      { id: 'C', text: 'Dùng chất xúc tác thích hợp', isCorrect: false },
      { id: 'D', text: 'Tăng thể tích bình chứa không đổi áp suất', isCorrect: true }
    ],
    correctAnswer: 'D',
    explanation: 'Tăng nhiệt độ, nồng độ, diện tích tiếp xúc, chất xúc tác đều làm tăng tốc độ phản ứng. Tăng thể tích bình không làm tăng tốc độ phản ứng.',
    createdAt: '2026-01-01T00:00:00.000Z'
  },

  // ==========================================
  // CHƯƠNG 7: NHÓM HALOGEN
  // ==========================================
  {
    id: 'c7-q1',
    content: 'Đơn chất halogen nào sau đây ở trạng thái lỏng ở điều kiện thường?',
    chapterId: 'chuong-7',
    chapterTitle: 'Chương 7: Nguyên tố nhóm Halogen',
    lessonId: 'chuong-7-don-chat-halogen',
    lessonTitle: 'Đơn chất halogen',
    topic: 'Tính chất vật lý của Halogen',
    level: 'nhan_biet',
    type: 'multiple_choice',
    options: [
      { id: 'A', text: 'Fluorine (F2)', isCorrect: false },
      { id: 'B', text: 'Chlorine (Cl2)', isCorrect: false },
      { id: 'C', text: 'Bromine (Br2)', isCorrect: true },
      { id: 'D', text: 'Iodine (I2)', isCorrect: false }
    ],
    correctAnswer: 'C',
    explanation: 'Ở điều kiện thường, F2 và Cl2 là chất khí, Br2 là chất lỏng màu nâu đỏ, I2 là chất rắn màu tím đen.',
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'c7-q2',
    content: 'Thuốc thử dùng để nhận biết dung dịch chứa ion chloride (Cl⁻) là:',
    chapterId: 'chuong-7',
    chapterTitle: 'Chương 7: Nguyên tố nhóm Halogen',
    lessonId: 'chuong-7-hydrogen-halide-va-muoi-halide',
    lessonTitle: 'Hydrogen halide và muối halide',
    topic: 'Nhận biết ion halide',
    level: 'nhan_biet',
    type: 'multiple_choice',
    options: [
      { id: 'A', text: 'Dung dịch AgNO3 (tạo kết tủa trắng AgCl)', isCorrect: true },
      { id: 'B', text: 'Dung dịch BaCl2', isCorrect: false },
      { id: 'C', text: 'Quỳ tím', isCorrect: false },
      { id: 'D', text: 'Dung dịch NaOH', isCorrect: false }
    ],
    correctAnswer: 'A',
    explanation: 'AgNO3 tác dụng với ion Cl⁻ tạo kết tủa trắng AgCl không tan trong acid.',
    createdAt: '2026-01-01T00:00:00.000Z'
  }
];

export function getDefaultQuestionsForChapter(chapterId?: string): Question[] {
  if (!chapterId) return DEFAULT_CHEMISTRY_QUESTIONS;
  const norm = normalizeChapterId(chapterId);
  const matched = DEFAULT_CHEMISTRY_QUESTIONS.filter(q => normalizeChapterId(q.chapterId) === norm);
  return matched.length > 0 ? matched : DEFAULT_CHEMISTRY_QUESTIONS;
}
