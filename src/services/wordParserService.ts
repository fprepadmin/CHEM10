import mammoth from 'mammoth';
import JSZip from 'jszip';
import { Question, QuestionType, CognitiveLevel, ParsedWordQuestion, QuestionOption } from '../types';
import { CHEMISTRY_10_CURRICULUM } from '../data/curriculum';

interface ParseDocxResult {
  fileName: string;
  totalParsed: number;
  validCount: number;
  needsReviewCount: number;
  duplicateCount: number;
  questions: ParsedWordQuestion[];
  rawText: string;
  htmlContent: string;
}

/**
 * Normalizes chemical formulas and text to retain sub/superscript notations and clean formatting,
 * including left-hand isotope / atomic notation (A_Z X such as ¹⁵₇N, ¹⁴₆C, ²³₁₁Na, ²⁴₁₂Mg, ³⁵₁₇Cl, ⁵⁶₂₆Fe, ²³⁸₉₂U)
 */
export function normalizeChemistryHtml(html: string): string {
  const subMap: Record<string, string> = { '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉' };
  const supMap: Record<string, string> = {
    '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
    '+': '⁺', '-': '⁻'
  };

  const toSup = (str: string) => str.split('').map((c: string) => supMap[c] || c).join('');
  const toSub = (str: string) => str.split('').map((c: string) => subMap[c] || c).join('');

  // 1. Nhận diện cấu trúc đồng vị / ký hiệu nguyên tử A_Z X (Isotope notation)
  // Dạng 1: Superscript A (số khối) trước, Subscript Z (số hiệu nguyên tử) sau, theo sau là ký hiệu nguyên tố X
  // Hỗ trợ thẻ lồng (u, strong, em, span), khoảng trắng, &nbsp; và bảo toàn gạch chân (u)
  let cleaned = html.replace(
    /(<u>)?<sup\b[^>]*>([\s\S]*?)<\/sup>((?:<\/(?:u|strong|em|b|i|span)>|<(?:u|strong|em|b|i|span)\b[^>]*>|\s|&nbsp;)*)<sub\b[^>]*>([\s\S]*?)<\/sub>((?:<\/(?:u|strong|em|b|i|span)>|<(?:u|strong|em|b|i|span)\b[^>]*>|\s|&nbsp;)*)(?:<([a-z]+)[^>]*>)?([A-Z][a-z]?)\b(?:<\/\6>)?(<\/u>)?/gi,
    (match, preU, supContent, midTags1, subContent, midTags2, elemTag, elem, postU) => {
      const cleanSup = supContent.replace(/<[^>]+>/g, '').trim();
      const cleanSub = subContent.replace(/<[^>]+>/g, '').trim();
      if (/^\d{1,4}$/.test(cleanSup) && /^\d{1,4}$/.test(cleanSub)) {
        const isUnderlined = Boolean(preU || postU || match.includes('<u') || elemTag === 'u');
        const iso = toSup(cleanSup) + toSub(cleanSub) + elem;
        return isUnderlined ? `<u>${iso}</u>` : iso;
      }
      return match;
    }
  );

  // Dạng 2: Subscript Z trước, Superscript A sau, theo sau là ký hiệu nguyên tố X
  // Đảm bảo số khối A luôn ở trên (superscript) và số hiệu Z luôn ở dưới (subscript) bên trái X: ¹⁵₇N
  cleaned = cleaned.replace(
    /(<u>)?<sub\b[^>]*>([\s\S]*?)<\/sub>((?:<\/(?:u|strong|em|b|i|span)>|<(?:u|strong|em|b|i|span)\b[^>]*>|\s|&nbsp;)*)<sup\b[^>]*>([\s\S]*?)<\/sup>((?:<\/(?:u|strong|em|b|i|span)>|<(?:u|strong|em|b|i|span)\b[^>]*>|\s|&nbsp;)*)(?:<([a-z]+)[^>]*>)?([A-Z][a-z]?)\b(?:<\/\6>)?(<\/u>)?/gi,
    (match, preU, subContent, midTags1, supContent, midTags2, elemTag, elem, postU) => {
      const cleanSub = subContent.replace(/<[^>]+>/g, '').trim();
      const cleanSup = supContent.replace(/<[^>]+>/g, '').trim();
      if (/^\d{1,4}$/.test(cleanSup) && /^\d{1,4}$/.test(cleanSub)) {
        const isUnderlined = Boolean(preU || postU || match.includes('<u') || elemTag === 'u');
        const iso = toSup(cleanSup) + toSub(cleanSub) + elem;
        return isUnderlined ? `<u>${iso}</u>` : iso;
      }
      return match;
    }
  );

  // 2. Chuẩn hóa các chỉ số dưới thông thường (H2O, CO2, SO4, Al2O3,...)
  // Hỗ trợ cả trường hợp thẻ <u> nằm lồng bên trong <sub>
  cleaned = cleaned.replace(/<sub\b[^>]*>([\s\S]*?)<\/sub>/gi, (match, inner) => {
    const isU = match.includes('<u');
    const clean = inner.replace(/<[^>]+>/g, '').trim();
    if (/^\d+$/.test(clean)) {
      const subbed = toSub(clean);
      return isU ? `<u>${subbed}</u>` : subbed;
    }
    return match;
  });

  // 3. Chuẩn hóa các chỉ số trên thông thường (Ca2+, Al3+, SO4 2-, 1s2,...)
  // Hỗ trợ cả trường hợp thẻ <u> nằm lồng bên trong <sup>
  cleaned = cleaned.replace(/<sup\b[^>]*>([\s\S]*?)<\/sup>/gi, (match, inner) => {
    const isU = match.includes('<u');
    const clean = inner.replace(/<[^>]+>/g, '').trim();
    if (/^(\d+|\+|\-|[0-9\+\-]+)$/.test(clean)) {
      const suped = toSup(clean);
      return isU ? `<u>${suped}</u>` : suped;
    }
    return match;
  });

  // 4. Chuẩn hóa ký hiệu đồng vị dạng Unicode nếu có khoảng trắng thừa hoặc bị đảo thứ tự
  // Ví dụ: ¹⁵ ₇ N -> ¹⁵₇N, ₇¹⁵N -> ¹⁵₇N
  cleaned = cleaned.replace(/([⁰¹²³⁴⁵⁶⁷⁸⁹]{1,4})\s*([₀₁₂₃₄₅₆₇₈₉]{1,4})\s*([A-Z][a-z]?)/g, '$1$2$3');
  cleaned = cleaned.replace(/([₀₁₂₃₄₅₆₇₈₉]{1,4})\s*([⁰¹²³⁴⁵⁶⁷⁸⁹]{1,4})\s*([A-Z][a-z]?)/g, '$2$1$3');

  return cleaned;
}

/**
 * Helper to detect the most accurate lesson within a specific chapter
 */
export function detectLessonWithinChapter(
  lowerText: string,
  chapter: (typeof CHEMISTRY_10_CURRICULUM)[0]
): (typeof CHEMISTRY_10_CURRICULUM)[0]['lessons'][0] {
  if (!chapter.lessons || chapter.lessons.length === 0) {
    return {
      id: chapter.id,
      name: chapter.name || chapter.title,
      title: chapter.title,
      topics: [chapter.title]
    };
  }

  // Exact matching against lesson name or title
  for (const lesson of chapter.lessons) {
    const lName = lesson.name.toLowerCase();
    const lTitle = lesson.title.toLowerCase();
    if (lowerText.includes(lName) || lowerText.includes(lTitle)) {
      return lesson;
    }
  }

  // Chapter 1: Cấu tạo nguyên tử
  if (chapter.id === 'chuong-1') {
    if (
      lowerText.includes('cấu hình electron') ||
      lowerText.includes('orbital') ||
      lowerText.includes('lớp electron') ||
      lowerText.includes('phân lớp') ||
      lowerText.includes('vỏ electron') ||
      lowerText.includes('ao') ||
      lowerText.includes('1s²') ||
      lowerText.includes('2s²') ||
      lowerText.includes('2p⁶') ||
      lowerText.includes('3s²') ||
      lowerText.includes('3p⁶') ||
      lowerText.includes('4s¹') ||
      lowerText.includes('1s2') ||
      lowerText.includes('2s2') ||
      lowerText.includes('2p6') ||
      lowerText.includes('3s2') ||
      lowerText.includes('3p6') ||
      lowerText.includes('3d') ||
      lowerText.includes('s, p, d, f') ||
      lowerText.includes('electron hóa trị') ||
      lowerText.includes('electron lớp ngoài cùng')
    ) {
      return chapter.lessons.find(l => l.id === 'chuong-1-cau-truc-lop-vo-electron') || chapter.lessons[2] || chapter.lessons[0];
    }
    if (
      lowerText.includes('đồng vị') ||
      lowerText.includes('số hiệu nguyên tử') ||
      lowerText.includes('số khối') ||
      lowerText.includes('nguyên tử khối') ||
      lowerText.includes('nguyên tố hóa học') ||
      lowerText.includes('kí hiệu hóa học') ||
      lowerText.includes('kí hiệu nguyên tử') ||
      lowerText.includes('z =') ||
      lowerText.includes('z=') ||
      lowerText.includes('nguyên tử khối trung bình') ||
      lowerText.includes('số proton trong hạt nhân')
    ) {
      return chapter.lessons.find(l => l.id === 'chuong-1-nguyen-to-hoa-hoc') || chapter.lessons[1] || chapter.lessons[0];
    }
    if (
      lowerText.includes('thành phần của nguyên tử') ||
      lowerText.includes('thành phần nguyên tử') ||
      lowerText.includes('rutherford') ||
      lowerText.includes('bohr') ||
      lowerText.includes('thomson') ||
      lowerText.includes('proton') ||
      lowerText.includes('neutron') ||
      lowerText.includes('electron') ||
      lowerText.includes('hạt cơ bản') ||
      lowerText.includes('hạt nhân nguyên tử') ||
      lowerText.includes('hạt mang điện') ||
      lowerText.includes('hạt không mang điện') ||
      lowerText.includes('kích thước nguyên tử') ||
      lowerText.includes('khối lượng nguyên tử')
    ) {
      return chapter.lessons.find(l => l.id === 'chuong-1-thanh-phan-nguyen-tu') || chapter.lessons[0];
    }
  }

  // Chapter 2: Bảng tuần hoàn các nguyên tố hóa học và định luật tuần hoàn
  if (chapter.id === 'chuong-2') {
    if (
      lowerText.includes('định luật tuần hoàn') ||
      lowerText.includes('ý nghĩa của bảng tuần hoàn') ||
      lowerText.includes('ý nghĩa bảng tuần hoàn') ||
      lowerText.includes('quan hệ giữa cấu hình và tính chất') ||
      lowerText.includes('dự đoán tính chất')
    ) {
      return chapter.lessons.find(l => l.id === 'chuong-2-dinh-luat-tuan-hoan-va-y-nghia') || chapter.lessons[2] || chapter.lessons[0];
    }
    if (
      lowerText.includes('xu hướng biến đổi') ||
      lowerText.includes('bán kính nguyên tử') ||
      lowerText.includes('bán kính') ||
      lowerText.includes('độ âm điện') ||
      lowerText.includes('tính kim loại') ||
      lowerText.includes('tính phi kim') ||
      lowerText.includes('tính acid') ||
      lowerText.includes('tính base') ||
      lowerText.includes('tính bazơ') ||
      lowerText.includes('tính bazo') ||
      lowerText.includes('oxide') ||
      lowerText.includes('hydroxide') ||
      lowerText.includes('biến đổi tính chất') ||
      lowerText.includes('năng lượng ion hóa')
    ) {
      return chapter.lessons.find(l => l.id === 'chuong-2-xu-huong-bien-doi-tinh-chat') || chapter.lessons[1] || chapter.lessons[0];
    }
    if (
      lowerText.includes('cấu tạo bảng tuần hoàn') ||
      lowerText.includes('ô nguyên tố') ||
      lowerText.includes('chu kì') ||
      lowerText.includes('nhóm a') ||
      lowerText.includes('nhóm b') ||
      lowerText.includes('nhóm ia') ||
      lowerText.includes('nhóm iia') ||
      lowerText.includes('nhóm viia') ||
      lowerText.includes('nguyên tắc sắp xếp') ||
      lowerText.includes('bảng tuần hoàn')
    ) {
      return chapter.lessons.find(l => l.id === 'chuong-2-cau-tao-bang-tuan-hoan') || chapter.lessons[0];
    }
  }

  // Chapter 3: Liên kết hóa học
  if (chapter.id === 'chuong-3') {
    if (
      lowerText.includes('van der waals') ||
      lowerText.includes('lực khuếch tán') ||
      lowerText.includes('lưỡng cực cảm ứng') ||
      lowerText.includes('lưỡng cực tạm thời') ||
      lowerText.includes('khí hiếm')
    ) {
      return chapter.lessons.find(l => l.id === 'chuong-3-tuong-tac-van-der-waals') || chapter.lessons[4] || chapter.lessons[0];
    }
    if (
      lowerText.includes('hydrogen') &&
      (lowerText.includes('liên kết') || lowerText.includes('nước') || lowerText.includes('nhiệt độ sôi') || lowerText.includes('h₂o'))
    ) {
      return chapter.lessons.find(l => l.id === 'chuong-3-lien-ket-hydrogen') || chapter.lessons[3] || chapter.lessons[0];
    }
    if (
      lowerText.includes('octet') ||
      lowerText.includes('bát tử') ||
      lowerText.includes('8 electron') ||
      lowerText.includes('quy tắc bát tử')
    ) {
      return chapter.lessons.find(l => l.id === 'chuong-3-quy-tac-octet') || chapter.lessons[0];
    }
    if (
      lowerText.includes('liên kết ion') ||
      lowerText.includes('tinh thể ion') ||
      lowerText.includes('tĩnh điện') ||
      lowerText.includes('nacl') ||
      lowerText.includes('cation') ||
      lowerText.includes('anion')
    ) {
      return chapter.lessons.find(l => l.id === 'chuong-3-lien-ket-ion') || chapter.lessons[1] || chapter.lessons[0];
    }
    if (
      lowerText.includes('cộng hóa trị') ||
      lowerText.includes('cặp electron chung') ||
      lowerText.includes('lewis') ||
      lowerText.includes('công thức cấu tạo') ||
      lowerText.includes('sigma') ||
      lowerText.includes('pi') ||
      lowerText.includes('phân cực') ||
      lowerText.includes('không phân cực')
    ) {
      return chapter.lessons.find(l => l.id === 'chuong-3-lien-ket-cong-hoa-tri') || chapter.lessons[2] || chapter.lessons[0];
    }
  }

  // Chapter 4: Phản ứng oxi hóa – khử
  if (chapter.id === 'chuong-4') {
    if (
      lowerText.includes('phương pháp cân bằng') ||
      lowerText.includes('thăng bằng electron') ||
      lowerText.includes('cân bằng phản ứng') ||
      lowerText.includes('cân bằng pthh') ||
      lowerText.includes('tổng hệ số') ||
      lowerText.includes('hệ số tối giản') ||
      lowerText.includes('hệ số của')
    ) {
      return chapter.lessons.find(l => l.id === 'chuong-4-phuong-phap-can-bang') || chapter.lessons[2] || chapter.lessons[0];
    }
    if (
      lowerText.includes('số oxi hóa') ||
      lowerText.includes('xác định số oxi hóa') ||
      lowerText.includes('quy tắc xác định số') ||
      lowerText.includes('số oxi hóa của')
    ) {
      return chapter.lessons.find(l => l.id === 'chuong-4-so-oxi-hoa') || chapter.lessons[1] || chapter.lessons[0];
    }
    if (
      lowerText.includes('khái niệm') ||
      lowerText.includes('chất khử') ||
      lowerText.includes('chất oxi hóa') ||
      lowerText.includes('quá trình khử') ||
      lowerText.includes('quá trình oxi hóa') ||
      lowerText.includes('chất bị khử') ||
      lowerText.includes('chất bị oxi hóa') ||
      lowerText.includes('sự khử') ||
      lowerText.includes('sự oxi hóa') ||
      lowerText.includes('chuyển dịch electron')
    ) {
      return chapter.lessons.find(l => l.id === 'chuong-4-khai-niem-phan-ung-oxi-hoa-khu') || chapter.lessons[0];
    }
  }

  // Chapter 5: Năng lượng hóa học
  if (chapter.id === 'chuong-5') {
    if (
      lowerText.includes('tính biến thiên') ||
      lowerText.includes('biến thiên enthalpy') ||
      lowerText.includes('nhiệt tạo thành') ||
      lowerText.includes('δfh') ||
      lowerText.includes('năng lượng liên kết') ||
      lowerText.includes('eb') ||
      lowerText.includes('nhiệt phản ứng') ||
      lowerText.includes('enthalpy chuẩn') ||
      lowerText.includes('δrh°₂₉₈') ||
      lowerText.includes('kj/mol') ||
      lowerText.includes('kj')
    ) {
      return chapter.lessons.find(l => l.id === 'chuong-5-bien-thien-enthalpy-chuan') || chapter.lessons[2] || chapter.lessons[0];
    }
    if (
      lowerText.includes('thu nhiệt') ||
      lowerText.includes('hấp thu nhiệt') ||
      lowerText.includes('nhiệt phân') ||
      lowerText.includes('nung vôi') ||
      lowerText.includes('δrh > 0')
    ) {
      return chapter.lessons.find(l => l.id === 'chuong-5-phan-ung-thu-nhiet') || chapter.lessons[1] || chapter.lessons[0];
    }
    if (
      lowerText.includes('tỏa nhiệt') ||
      lowerText.includes('hiện tượng tỏa nhiệt') ||
      lowerText.includes('giải phóng nhiệt') ||
      lowerText.includes('đốt cháy') ||
      lowerText.includes('phát nhiệt') ||
      lowerText.includes('δrh < 0')
    ) {
      return chapter.lessons.find(l => l.id === 'chuong-5-phan-ung-toa-nhiet') || chapter.lessons[0];
    }
  }

  // Chapter 6: Tốc độ phản ứng hóa học
  if (chapter.id === 'chuong-6') {
    if (
      lowerText.includes('phương trình tốc độ') ||
      lowerText.includes('định luật tác dụng khối lượng') ||
      lowerText.includes('hằng số tốc độ') ||
      lowerText.includes('hằng số k') ||
      lowerText.includes('bậc phản ứng') ||
      lowerText.includes('v = k')
    ) {
      return chapter.lessons.find(l => l.id === 'chuong-6-phuong-trinh-toc-do-phan-ung') || chapter.lessons[2] || chapter.lessons[0];
    }
    if (
      lowerText.includes('yếu tố ảnh hưởng') ||
      lowerText.includes('các yếu tố ảnh hưởng') ||
      lowerText.includes('ảnh hưởng của nồng độ') ||
      lowerText.includes('ảnh hưởng của nhiệt độ') ||
      lowerText.includes('chất xúc tác') ||
      lowerText.includes('diện tích tiếp xúc') ||
      lowerText.includes('áp suất') ||
      lowerText.includes('van\'t hoff') ||
      lowerText.includes('hệ số van\'t hoff')
    ) {
      return chapter.lessons.find(l => l.id === 'chuong-6-cac-yeu-to-anh-huong-toc-do') || chapter.lessons[1] || chapter.lessons[0];
    }
    if (
      lowerText.includes('khái niệm tốc độ') ||
      lowerText.includes('tốc độ phản ứng là') ||
      lowerText.includes('tốc độ trung bình') ||
      lowerText.includes('tốc độ tức thời') ||
      lowerText.includes('ý nghĩa của tốc độ') ||
      lowerText.includes('tốc độ phản ứng')
    ) {
      return chapter.lessons.find(l => l.id === 'chuong-6-khai-niem-toc-do-phan-ung') || chapter.lessons[0];
    }
  }

  // Chapter 7: Nguyên tố nhóm VIIA – Halogen
  if (chapter.id === 'chuong-7') {
    if (
      lowerText.includes('hydrogen halide') ||
      lowerText.includes('hydrohalic') ||
      lowerText.includes('hf') ||
      lowerText.includes('hcl') ||
      lowerText.includes('hbr') ||
      lowerText.includes('hi') ||
      lowerText.includes('agcl') ||
      lowerText.includes('agbr') ||
      lowerText.includes('agi') ||
      lowerText.includes('ion halide')
    ) {
      return chapter.lessons.find(l => l.id === 'chuong-7-hydrogen-halide-va-hydrohalic-acid') || chapter.lessons[2] || chapter.lessons[0];
    }
    if (
      lowerText.includes('vật lý') ||
      lowerText.includes('trạng thái tập hợp') ||
      lowerText.includes('màu sắc') ||
      lowerText.includes('nhiệt độ nóng chảy') ||
      lowerText.includes('nhiệt độ sôi')
    ) {
      return chapter.lessons.find(l => l.id === 'chuong-7-tinh-chat-vat-ly-halogen') || chapter.lessons[0];
    }
    if (
      lowerText.includes('hóa học') ||
      lowerText.includes('tính chất hóa học') ||
      lowerText.includes('tính oxi hóa mạnh') ||
      lowerText.includes('tác dụng với kim loại') ||
      lowerText.includes('tác dụng với hydrogen') ||
      lowerText.includes('tác dụng với nước') ||
      lowerText.includes('tác dụng với kiềm') ||
      lowerText.includes('phản ứng thế')
    ) {
      return chapter.lessons.find(l => l.id === 'chuong-7-tinh-chat-hoa-hoc-halogen') || chapter.lessons[1] || chapter.lessons[0];
    }
  }

  return chapter.lessons[0];
}

/**
 * Automatic chapter and lesson detection based on chemistry keywords in GDPT 2018
 * Supporting context chapter & lesson pre-selection
 */
export function detectChapterAndTopic(
  text: string,
  contextChapterId?: string,
  contextLessonId?: string
): {
  chapterId: string;
  chapterTitle: string;
  chapterName: string;
  lessonId: string;
  lessonTitle: string;
  lessonName: string;
  topic: string;
} {
  const lower = text.toLowerCase();

  // 1. If explicit contextChapterId is provided (from teacher UI or document header)
  if (contextChapterId) {
    const matchedChap = CHEMISTRY_10_CURRICULUM.find(c => c.id === contextChapterId);
    if (matchedChap) {
      if (contextLessonId) {
        const matchedLesson = matchedChap.lessons.find(l => l.id === contextLessonId);
        if (matchedLesson) {
          return {
            chapterId: matchedChap.id,
            chapterTitle: matchedChap.title,
            chapterName: matchedChap.name || matchedChap.title,
            lessonId: matchedLesson.id,
            lessonTitle: matchedLesson.title,
            lessonName: matchedLesson.name || matchedLesson.title,
            topic: matchedLesson.title
          };
        }
      }

      const detectedLesson = detectLessonWithinChapter(lower, matchedChap);
      return {
        chapterId: matchedChap.id,
        chapterTitle: matchedChap.title,
        chapterName: matchedChap.name || matchedChap.title,
        lessonId: detectedLesson.id,
        lessonTitle: detectedLesson.title,
        lessonName: detectedLesson.name || detectedLesson.title,
        topic: detectedLesson.title
      };
    }
  }

  // 2. Check for explicit text tags: [Chương X - Bài Y], "Chương 1: Bài 2", "Bài 2: Nguyên tố hóa học"
  const tagMatch = text.match(/(?:Chương|CHƯƠNG)\s*(\d+)[\s:\-\—]+(?:Bài|BÀI)?\s*(\d+)?/i);
  if (tagMatch) {
    const chapNum = parseInt(tagMatch[1], 10);
    const chapId = `chuong-${chapNum}`;
    const matchedChap = CHEMISTRY_10_CURRICULUM.find(c => c.id === chapId);
    if (matchedChap) {
      if (tagMatch[2]) {
        const lessonNum = parseInt(tagMatch[2], 10);
        if (lessonNum >= 1 && lessonNum <= matchedChap.lessons.length) {
          const lesson = matchedChap.lessons[lessonNum - 1];
          return {
            chapterId: matchedChap.id,
            chapterTitle: matchedChap.title,
            chapterName: matchedChap.name || matchedChap.title,
            lessonId: lesson.id,
            lessonTitle: lesson.title,
            lessonName: lesson.name || lesson.title,
            topic: lesson.title
          };
        }
      }
      const detectedLesson = detectLessonWithinChapter(lower, matchedChap);
      return {
        chapterId: matchedChap.id,
        chapterTitle: matchedChap.title,
        chapterName: matchedChap.name || matchedChap.title,
        lessonId: detectedLesson.id,
        lessonTitle: detectedLesson.title,
        lessonName: detectedLesson.name || detectedLesson.title,
        topic: detectedLesson.title
      };
    }
  }

  // 3. Global Rule-based detection covering all 23 lessons (TC-01 to TC-19)

  // Chapter 6: Tốc độ phản ứng hóa học (TC-16, TC-17)
  if (
    lower.includes('tốc độ phản ứng') ||
    lower.includes('hằng số tốc độ') ||
    lower.includes('chất xúc tác') ||
    lower.includes('diện tích tiếp xúc') ||
    lower.includes('diện tích bề mặt') ||
    lower.includes('định luật tác dụng khối lượng') ||
    lower.includes('van\'t hoff') ||
    lower.includes('tốc độ tức thời') ||
    lower.includes('tốc độ trung bình')
  ) {
    const chap6 = CHEMISTRY_10_CURRICULUM.find(c => c.id === 'chuong-6')!;
    const lesson = detectLessonWithinChapter(lower, chap6);
    return {
      chapterId: 'chuong-6',
      chapterTitle: chap6.title,
      chapterName: chap6.name || chap6.title,
      lessonId: lesson.id,
      lessonTitle: lesson.title,
      lessonName: lesson.name || lesson.title,
      topic: lesson.title
    };
  }

  // Chapter 5: Năng lượng hóa học (TC-14, TC-15)
  if (
    lower.includes('enthalpy') ||
    lower.includes('nhiệt tạo thành') ||
    lower.includes('tỏa nhiệt') ||
    lower.includes('thu nhiệt') ||
    lower.includes('δrh') ||
    lower.includes('δfh') ||
    lower.includes('delta_r_h') ||
    lower.includes('năng lượng liên kết') ||
    lower.includes('nhiệt phản ứng') ||
    lower.includes('kj/mol') ||
    lower.includes('hiện tượng tỏa nhiệt') ||
    lower.includes('hiện tượng thu nhiệt')
  ) {
    const chap5 = CHEMISTRY_10_CURRICULUM.find(c => c.id === 'chuong-5')!;
    const lesson = detectLessonWithinChapter(lower, chap5);
    return {
      chapterId: 'chuong-5',
      chapterTitle: chap5.title,
      chapterName: chap5.name || chap5.title,
      lessonId: lesson.id,
      lessonTitle: lesson.title,
      lessonName: lesson.name || lesson.title,
      topic: lesson.title
    };
  }

  // Chapter 4: Phản ứng oxi hóa – khử (TC-11, TC-12, TC-13)
  if (
    lower.includes('oxi hóa - khử') ||
    lower.includes('oxi hóa – khử') ||
    lower.includes('số oxi hóa') ||
    lower.includes('chất khử') ||
    lower.includes('chất oxi hóa') ||
    lower.includes('quá trình khử') ||
    lower.includes('quá trình oxi hóa') ||
    lower.includes('thăng bằng electron') ||
    lower.includes('sự khử') ||
    lower.includes('sự oxi hóa')
  ) {
    const chap4 = CHEMISTRY_10_CURRICULUM.find(c => c.id === 'chuong-4')!;
    const lesson = detectLessonWithinChapter(lower, chap4);
    return {
      chapterId: 'chuong-4',
      chapterTitle: chap4.title,
      chapterName: chap4.name || chap4.title,
      lessonId: lesson.id,
      lessonTitle: lesson.title,
      lessonName: lesson.name || lesson.title,
      topic: lesson.title
    };
  }

  // Chapter 3: Liên kết hóa học (TC-07, TC-08, TC-09, TC-10)
  if (
    lower.includes('octet') ||
    lower.includes('bát tử') ||
    lower.includes('cộng hóa trị') ||
    lower.includes('liên kết ion') ||
    lower.includes('van der waals') ||
    lower.includes('liên kết hydrogen') ||
    lower.includes('cặp electron dùng chung') ||
    lower.includes('cặp electron chung') ||
    lower.includes('liên kết cho nhận') ||
    lower.includes('công thức lewis') ||
    lower.includes('tinh thể nacl') ||
    lower.includes('tinh thể ion') ||
    (lower.includes('liên kết') && (lower.includes('phân tử') || lower.includes('nguyên tử') || lower.includes('ion')))
  ) {
    const chap3 = CHEMISTRY_10_CURRICULUM.find(c => c.id === 'chuong-3')!;
    const lesson = detectLessonWithinChapter(lower, chap3);
    return {
      chapterId: 'chuong-3',
      chapterTitle: chap3.title,
      chapterName: chap3.name || chap3.title,
      lessonId: lesson.id,
      lessonTitle: lesson.title,
      lessonName: lesson.name || lesson.title,
      topic: lesson.title
    };
  }

  // Chapter 2: Bảng tuần hoàn các nguyên tố hóa học và định luật tuần hoàn (TC-04, TC-05, TC-06)
  if (
    lower.includes('định luật tuần hoàn') ||
    lower.includes('bảng tuần hoàn') ||
    lower.includes('chu kì') ||
    lower.includes('nhóm a') ||
    lower.includes('nhóm b') ||
    lower.includes('độ âm điện') ||
    lower.includes('bán kính nguyên tử') ||
    lower.includes('tính kim loại') ||
    lower.includes('tính phi kim') ||
    lower.includes('ô nguyên tố') ||
    lower.includes('xu hướng biến đổi')
  ) {
    const chap2 = CHEMISTRY_10_CURRICULUM.find(c => c.id === 'chuong-2')!;
    const lesson = detectLessonWithinChapter(lower, chap2);
    return {
      chapterId: 'chuong-2',
      chapterTitle: chap2.title,
      chapterName: chap2.name || chap2.title,
      lessonId: lesson.id,
      lessonTitle: lesson.title,
      lessonName: lesson.name || lesson.title,
      topic: lesson.title
    };
  }

  // Chapter 7: Nguyên tố nhóm VIIA – Halogen (TC-18, TC-19)
  if (
    !lower.includes('đồng vị') &&
    !lower.includes('nguyên tử khối trung bình') &&
    !lower.includes('cấu hình electron') &&
    (
      lower.includes('halogen') ||
      lower.includes('hydrohalic') ||
      lower.includes('hydrogen halide') ||
      lower.includes('ion halide') ||
      lower.includes('viia') ||
      lower.includes('đơn chất nhóm halogen') ||
      lower.includes('đơn chất halogen') ||
      lower.includes('f2') ||
      lower.includes('cl2') ||
      lower.includes('br2') ||
      lower.includes('i2') ||
      lower.includes('chlorine') ||
      lower.includes('bromine') ||
      lower.includes('iodine') ||
      lower.includes('fluorine')
    )
  ) {
    const chap7 = CHEMISTRY_10_CURRICULUM.find(c => c.id === 'chuong-7')!;
    const lesson = detectLessonWithinChapter(lower, chap7);
    return {
      chapterId: 'chuong-7',
      chapterTitle: chap7.title,
      chapterName: chap7.name || chap7.title,
      lessonId: lesson.id,
      lessonTitle: lesson.title,
      lessonName: lesson.name || lesson.title,
      topic: lesson.title
    };
  }

  // Chapter 1: Cấu tạo nguyên tử (TC-01, TC-02, TC-03)
  const chap1 = CHEMISTRY_10_CURRICULUM.find(c => c.id === 'chuong-1')!;
  const lesson1 = detectLessonWithinChapter(lower, chap1);
  return {
    chapterId: 'chuong-1',
    chapterTitle: chap1.title,
    chapterName: chap1.name || chap1.title,
    lessonId: lesson1.id,
    lessonTitle: lesson1.title,
    lessonName: lesson1.name || lesson1.title,
    topic: lesson1.title
  };
}

/**
 * Strips cognitive level markers (NB, TH, VD, VDC, Mức 1-4, Nhận biết, Thông hiểu, Vận dụng, Vận dụng cao)
 * from question text WITHOUT touching valid chemical formulas, elements (e.g. Nb, Th), or normal words.
 */
export function stripCognitiveLevelMarkers(text: string): string {
  if (!text) return '';
  let cleaned = text;

  // 1. Remove bracketed / enclosed level tags anywhere in the string
  // Examples: [NB], (NB), _NB_, _NB, [TH], (TH), _TH_, _TH, [VD], (VD), _VD_, _VD, [VDC], (VDC), _VDC_, _VDC
  // [Nhận biết], (Thông hiểu), [Vận dụng], [Vận dụng cao], [Mức 1], [Mức độ 2], etc.
  cleaned = cleaned.replace(/(?:\[|\(|\_|⟨|<|\{)\s*(?:VDC|vận\s*dụng\s*cao|mức\s*độ\s*4|mức\s*4)\s*(?:\]|\)|\_|⟩|>|\})/gi, ' ');
  cleaned = cleaned.replace(/(?:\[|\(|\_|⟨|<|\{)\s*(?:VD|vận\s*dụng|mức\s*độ\s*3|mức\s*3)\s*(?:\]|\)|\_|⟩|>|\})/gi, ' ');
  cleaned = cleaned.replace(/(?:\[|\(|\_|⟨|<|\{)\s*(?:TH|thông\s*hiểu|hiểu|mức\s*độ\s*2|mức\s*2)\s*(?:\]|\)|\_|⟩|>|\})/gi, ' ');
  cleaned = cleaned.replace(/(?:\[|\(|\_|⟨|<|\{)\s*(?:NB|nhận\s*biết|biết|mức\s*độ\s*1|mức\s*1)\s*(?:\]|\)|\_|⟩|>|\})/gi, ' ');

  // 2. Remove standalone underscore-wrapped markers: _NB_, _NB, _TH_, _TH, _VD_, _VD, _VDC_, _VDC
  cleaned = cleaned.replace(/(?:^|\s+)_(?:VDC|VD|TH|NB)_?(?=\s+|$|[.,;:?!])/gi, ' ');

  // 3. Remove leading level markers at the start of the string (after question number removal)
  // Examples: "NB_ ", "NB: ", "NB - ", "NB – ", "NB. ", "NHẬN BIẾT: ", "TH_ ", "VD_ ", "VDC_ "
  cleaned = cleaned.replace(/^\s*(?:VDC|vận\s*dụng\s*cao|mức\s*độ\s*4|mức\s*4)\s*[_:\-\.\—\)]\s*/i, '');
  cleaned = cleaned.replace(/^\s*(?:VD|vận\s*dụng|mức\s*độ\s*3|mức\s*3)\s*[_:\-\.\—\)]\s*/i, '');
  cleaned = cleaned.replace(/^\s*(?:TH|thông\s*hiểu|mức\s*độ\s*2|mức\s*2)\s*[_:\-\.\—\)]\s*/i, '');
  cleaned = cleaned.replace(/^\s*(?:NB|nhận\s*biết|mức\s*độ\s*1|mức\s*1)\s*[_:\-\.\—\)]\s*/i, '');

  // Handle leading marker with underscore directly attached e.g. "NB_Nguyên tố..."
  cleaned = cleaned.replace(/^\s*(?:VDC|VD|TH|NB)_(?=[^\s_])/i, '');

  // 4. Remove trailing level markers at the very end of the string
  // Examples: "... _NB_", "... _NB", "... [NB]", "... (NB)", "... NB_", "... - NB"
  cleaned = cleaned.replace(/\s*(?:[_:\-\.\—]\s*)?(?:VDC|VD|TH|NB|vận\s*dụng\s*cao|vận\s*dụng|thông\s*hiểu|nhận\s*biết|mức\s*độ\s*[1-4]|mức\s*[1-4])\s*(?:[_:\-\.\—])?$/i, '');

  // 5. Clean up redundant spaces
  cleaned = cleaned.replace(/[ \t]{2,}/g, ' ').trim();

  return cleaned;
}

/**
 * Automatically classifies cognitive level (Biết, Hiểu, Vận dụng, Vận dụng cao)
 * for Grade 10 Chemistry questions strictly conforming to CTGDPT 2018 pedagogy guidelines
 * (Mục IV Yêu cầu cần đạt về năng lực hóa học & Mục V Nội dung Hóa học 10 - TT 32/2018/TT-BGDĐT).
 * 
 * Decision Framework (Hierarchy of Cognitive Tasks):
 * 1. Explicit document markers (e.g., [VDC], [VD], [TH], [NB], NB_, TH_, VD_, VDC_, (Mức 1/2/3/4), (Biết), (Hiểu)...)
 * 2. Vận dụng cao (van_dung_cao)
 * 3. Vận dụng (van_dung)
 * 4. Thông hiểu (thong_hieu)
 * 5. Nhận biết (nhan_biet)
 */
export function detectCognitiveLevel(
  text: string,
  options?: { text: string }[],
  explanation?: string
): CognitiveLevel {
  const fullText = (text + ' ' + (options?.map(o => o.text).join(' ') || '') + ' ' + (explanation || '')).toLowerCase();
  const rawLower = text.toLowerCase().trim();

  // -------------------------------------------------------------
  // LAYER 1: EXPLICIT METADATA / DOCUMENT TAGS (VDC > VD > TH > NB)
  // -------------------------------------------------------------
  // VDC patterns
  if (
    /(?:\[|\(|\_|⟨|<|\{)\s*(?:vdc|vận\s*dụng\s*cao|mức\s*4|mức\s*độ\s*4)\s*(?:\]|\)|\_|⟩|>|\})/i.test(text) ||
    /^(?:vdc|vận\s*dụng\s*cao|mức\s*4|mức\s*độ\s*4)[_:\-\.\—]/i.test(rawLower) ||
    /(?:^|[\s\n\r])(?:vdc[_:\-\.\—]+)\s*/i.test(text) ||
    /(?:_vdc_|_vdc|\bvdc_)\b/i.test(text) ||
    /\b(?:vdc|vận\s*dụng\s*cao)\s*[_:\-\.\—]/i.test(text) ||
    /(?:mức\s*độ\s*4|mức\s*4|mức\s*độ\s*:\s*vận\s*dụng\s*cao)/i.test(text)
  ) {
    return 'van_dung_cao';
  }

  // VD patterns (must not match VDC)
  if (
    /(?:\[|\(|\_|⟨|<|\{)\s*(?:vd|vận\s*dụng|mức\s*3|mức\s*độ\s*3)\s*(?:\]|\)|\_|⟩|>|\})/i.test(text) ||
    /^(?:vd|vận\s*dụng|mức\s*3|mức\s*độ\s*3)[_:\-\.\—]/i.test(rawLower) ||
    /(?:^|[\s\n\r])(?:vd[_:\-\.\—]+)\s*/i.test(text) ||
    /(?:_vd_|_vd|\bvd_)\b/i.test(text) ||
    /\b(?:vd|vận\s*dụng)\s*[_:\-\.\—]/i.test(text) ||
    /(?:mức\s*độ\s*3|mức\s*3|mức\s*độ\s*:\s*vận\s*dụng)/i.test(text)
  ) {
    return 'van_dung';
  }

  // TH patterns
  if (
    /(?:\[|\(|\_|⟨|<|\{)\s*(?:th|thông\s*hiểu|hiểu|mức\s*2|mức\s*độ\s*2)\s*(?:\]|\)|\_|⟩|>|\})/i.test(text) ||
    /^(?:th|thông\s*hiểu|hiểu|mức\s*2|mức\s*độ\s*2)[_:\-\.\—]/i.test(rawLower) ||
    /(?:^|[\s\n\r])(?:th[_:\-\.\—]+)\s*/i.test(text) ||
    /(?:_th_|_th|\bth_)\b/i.test(text) ||
    /\b(?:th|thông\s*hiểu)\s*[_:\-\.\—]/i.test(text) ||
    /(?:mức\s*độ\s*2|mức\s*2|mức\s*độ\s*:\s*thông\s*hiểu|mức\s*độ\s*:\s*hiểu)/i.test(text)
  ) {
    return 'thong_hieu';
  }

  // NB patterns
  if (
    /(?:\[|\(|\_|⟨|<|\{)\s*(?:nb|nhận\s*biết|biết|mức\s*1|mức\s*độ\s*1)\s*(?:\]|\)|\_|⟩|>|\})/i.test(text) ||
    /^(?:nb|nhận\s*biết|biết|mức\s*1|mức\s*độ\s*1)[_:\-\.\—]/i.test(rawLower) ||
    /(?:^|[\s\n\r])(?:nb[_:\-\.\—]+)\s*/i.test(text) ||
    /(?:_nb_|_nb|\bnb_)\b/i.test(text) ||
    /\b(?:nb|nhận\s*biết)\s*[_:\-\.\—]/i.test(text) ||
    /(?:mức\s*độ\s*1|mức\s*1|mức\s*độ\s*:\s*nhận\s*biết|mức\s*độ\s*:\s*biết)/i.test(text)
  ) {
    return 'nhan_biet';
  }

  // -------------------------------------------------------------
  // LAYER 2: VẬN DỤNG CAO (MỨC 4) - Evaluation, Design, Non-routine multi-step deduction
  // -------------------------------------------------------------
  const isVDC =
    // Real-world complex problem-solving / Design / Evaluation
    fullText.includes('đề xuất giải pháp') ||
    fullText.includes('đề xuất biện pháp') ||
    fullText.includes('thiết kế phương án') ||
    fullText.includes('thiết kế thí nghiệm') ||
    fullText.includes('đánh giá các phương án') ||
    fullText.includes('phương án tối ưu') ||
    fullText.includes('lựa chọn mô hình phù hợp') ||
    (fullText.includes('cháy nổ') && (fullText.includes('đề xuất') || fullText.includes('xử lý tình huống') || fullText.includes('biện pháp hạn chế nguy cơ'))) ||
    // Non-routine multi-step deduction / Case elimination
    fullText.includes('biện luận') ||
    // Multi-step complex particle systems in molecules/compounds (M2X3, MX2, ion...)
    (fullText.includes('tổng số hạt') && (fullText.includes('hợp chất') || fullText.includes('phân tử') || fullText.includes('ion') || fullText.includes('m2') || fullText.includes('x2') || fullText.includes('x3')) && (fullText.includes('xác định công thức') || fullText.includes('tìm công thức') || fullText.includes('nhiều hơn số hạt không mang điện'))) ||
    // Multi-mixture & complex sequential reactions with mass/volume calculation
    ((fullText.includes('hỗn hợp') || fullText.includes('hoà tan hoàn toàn') || fullText.includes('hòa tan hoàn toàn')) &&
      (fullText.includes('thu được dung dịch') || fullText.includes('kết tủa') || fullText.includes('khí thoát ra') || fullText.includes('dung dịch y')) &&
      (fullText.includes('tính %') || fullText.includes('phần trăm khối lượng') || fullText.includes('tính khối lượng') || fullText.includes('tính giá trị của m') || fullText.includes('tính m'))) ||
    // Advanced graphical kinetics / multi-stage equilibrium
    (fullText.includes('đồ thị') && (fullText.includes('nồng độ') || fullText.includes('thời gian') || fullText.includes('tốc độ')) && (fullText.includes('xác định') || fullText.includes('phân tích') || fullText.includes('bậc của phản ứng'))) ||
    (fullText.includes('bảng số liệu thực nghiệm chưa quen thuộc') || (fullText.includes('số liệu thực nghiệm') && fullText.includes('phân tích xu hướng') && fullText.includes('mô hình')));

  if (isVDC) {
    return 'van_dung_cao';
  }

  // -------------------------------------------------------------
  // LAYER 3: VẬN DỤNG (MỨC 3) - Quantitative calculation & standard routine problem-solving
  // -------------------------------------------------------------
  const isVD =
    // Balancing redox using electron-transfer method
    fullText.includes('bằng phương pháp electron') ||
    fullText.includes('phương pháp thăng bằng electron') ||
    fullText.includes('cân bằng phương trình phản ứng oxi hóa') ||
    fullText.includes('tổng hệ số cân bằng') ||
    fullText.includes('hệ số cân bằng tối giản') ||
    fullText.includes('hệ số của chất oxi hóa') ||
    fullText.includes('hệ số của chất khử') ||
    // Atomic particle calculations for single element/atom
    (fullText.includes('tổng số hạt') && (fullText.includes('nguyên tử') || fullText.includes('số hạt mang điện') || fullText.includes('proton') || fullText.includes('electron') || fullText.includes('neutron'))) ||
    // Periodic trends standard deduction (consecutive periods, atomic numbers relation)
    ((fullText.includes('hai nguyên tố') || fullText.includes('hai chu kì') || fullText.includes('hai nhóm')) && (fullText.includes('tổng số') || fullText.includes('liên tiếp') || fullText.includes('proton'))) ||
    // Explicit standard chemistry calculations
    fullText.includes('tính số mol') ||
    fullText.includes('tính nồng độ') ||
    fullText.includes('tính khối lượng') ||
    fullText.includes('tính thể tích') ||
    fullText.includes('tính giá trị của') ||
    fullText.includes('tính biến thiên enthalpy') ||
    fullText.includes('tính nhiệt phản ứng') ||
    fullText.includes('tính δrh') ||
    fullText.includes('tính tốc độ trung bình') ||
    fullText.includes('tính tốc độ phản ứng') ||
    fullText.includes('tính hằng số tốc độ') ||
    fullText.includes('tính hằng số k') ||
    fullText.includes('tính %') ||
    fullText.includes('phần trăm khối lượng của') ||
    fullText.includes('tính nhiệt tỏa ra') ||
    fullText.includes('tính nhiệt thu vào') ||
    // Quantitative word problems with explicit numbers/measurements (mol, gam, lít, kJ...)
    (/\b\d+(?:[\.,]\d+)?\s*(?:gam|g|mol|lít|lit|ml|m|kj|j|kj\/mol|kcal)\b/i.test(fullText) && (fullText.includes('tính') || fullText.includes('thu được') || fullText.includes('cần dùng') || fullText.includes('giá trị của') || fullText.includes('xác định kim loại') || fullText.includes('xác định nguyên tố'))) ||
    (fullText.includes('tác dụng vừa đủ') && (fullText.includes('thu được') || fullText.includes('tính'))) ||
    (fullText.includes('cho') && fullText.includes('phản ứng với') && (fullText.includes('tính') || fullText.includes('giá trị')));

  if (isVD) {
    return 'van_dung';
  }

  // -------------------------------------------------------------
  // LAYER 4: THÔNG HIỂU (MỨC 2) - Qualitative explanation / comparison / relation
  // -------------------------------------------------------------
  const isTH =
    fullText.includes('vì sao') ||
    fullText.includes('tại sao') ||
    fullText.includes('giải thích') ||
    fullText.includes('nguyên nhân') ||
    fullText.includes('bản chất của') ||
    fullText.includes('hiện tượng nào sau đây') ||
    fullText.includes('hiện tượng xảy ra khi') ||
    fullText.includes('so sánh') ||
    fullText.includes('sắp xếp theo') ||
    fullText.includes('dãy nào sau đây được sắp xếp') ||
    fullText.includes('thứ tự tăng dần') ||
    fullText.includes('thứ tự giảm dần') ||
    fullText.includes('phát biểu nào sau đây đúng') ||
    fullText.includes('phát biểu nào sau đây không đúng') ||
    fullText.includes('phát biểu nào sau đây sai') ||
    fullText.includes('nhận định nào sau đây là đúng') ||
    fullText.includes('nhận định nào sau đây không đúng') ||
    fullText.includes('nhận xét nào sau đây đúng') ||
    fullText.includes('kết luận nào sau đây đúng') ||
    fullText.includes('mệnh đề nào sau đây đúng') ||
    fullText.includes('số phát biểu đúng là') ||
    fullText.includes('số nhận định đúng là') ||
    fullText.includes('vừa có tính oxi hóa vừa có tính khử') ||
    fullText.includes('chất đóng vai trò là chất oxi hóa') ||
    fullText.includes('chất đóng vai trò là chất khử') ||
    fullText.includes('quá trình oxi hóa là') ||
    fullText.includes('quá trình khử là') ||
    fullText.includes('sự oxi hóa là') ||
    fullText.includes('sự khử là') ||
    fullText.includes('yếu tố nào sau đây không làm thay đổi') ||
    fullText.includes('ảnh hưởng của nhiệt độ') ||
    fullText.includes('ảnh hưởng của nồng độ') ||
    fullText.includes('ảnh hưởng của áp suất') ||
    fullText.includes('ảnh hưởng của diện tích tiếp xúc') ||
    fullText.includes('ảnh hưởng của chất xúc tác') ||
    fullText.includes('xu hướng biến đổi') ||
    fullText.includes('độ phân cực của liên kết') ||
    fullText.includes('số liên kết sigma') ||
    fullText.includes('số liên kết pi') ||
    fullText.includes('liên kết hydrogen') ||
    fullText.includes('tương tác van der waals') ||
    fullText.includes('phản ứng tỏa nhiệt do') ||
    fullText.includes('phản ứng thu nhiệt do');

  if (isTH) {
    return 'thong_hieu';
  }

  // -------------------------------------------------------------
  // LAYER 5: NHẬN BIẾT (MỨC 1 - BIẾT) - Direct recall / recognition
  // -------------------------------------------------------------
  return 'nhan_biet';
}

/**
 * Helper to strip HTML tags while keeping raw text
 */
function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
}

/**
 * Parse end-of-file answer key tables (if any)
 */
export function extractEndDocumentAnswerKeys(text: string): Map<number, string | boolean[]> {
  const answerMap = new Map<number, string | boolean[]>();
  
  const keyHeaderRegex = /(?:ĐÁP\s*ÁN|BẢNG\s*ĐÁP\s*ÁN|HƯỚNG\s*DẪN\s*CHẤM|KEY\s*ANSWER|ĐÁP\s*ÁN\s*CHI\s*TIẾT)/i;
  const match = text.search(keyHeaderRegex);
  if (match === -1) return answerMap;

  const answerSection = text.slice(match);

  // Pattern 1: Multiple choice standard: "1. A" or "1-A" or "1: A" or "1.A" or "Câu 1: A"
  const mcqRegex = /(?:Câu\s*)?(\d+)[\.\s:\-\)]+([A-D])(?![a-zA-Z0-9])/gi;
  let mcqMatch: RegExpExecArray | null;
  while ((mcqMatch = mcqRegex.exec(answerSection)) !== null) {
    const qNum = parseInt(mcqMatch[1], 10);
    const ans = mcqMatch[2].toUpperCase();
    if (!isNaN(qNum) && !answerMap.has(qNum)) {
      answerMap.set(qNum, ans);
    }
  }

  // Pattern 2: True/False sub-items: "1. a-Đ, b-S, c-Đ, d-S"
  const tfRegex = /(?:Câu\s*)?(\d+)[\.\s:\-]+(?:a[\.\s:\-]*([ĐđSs]|Đúng|Sai|True|False)[\s,;/]+b[\.\s:\-]*([ĐđSs]|Đúng|Sai|True|False)[\s,;/]+c[\.\s:\-]*([ĐđSs]|Đúng|Sai|True|False)[\s,;/]+d[\.\s:\-]*([ĐđSs]|Đúng|Sai|True|False))/gi;
  let tfMatch: RegExpExecArray | null;
  while ((tfMatch = tfRegex.exec(answerSection)) !== null) {
    const qNum = parseInt(tfMatch[1], 10);
    const parseBool = (str: string) => {
      const s = str.trim().toLowerCase();
      return s.startsWith('đ') || s.startsWith('t') || s === 'đúng' || s === 'd';
    };
    const ansArray = [
      parseBool(tfMatch[2]),
      parseBool(tfMatch[3]),
      parseBool(tfMatch[4]),
      parseBool(tfMatch[5]),
    ];
    answerMap.set(qNum, ansArray);
  }

  return answerMap;
}

/**
 * Main DOCX Parser with Underline Detection, Chapter/Lesson Detection, and Strict Non-Guessing Policy
 */
export async function parseDocxFile(
  file: File,
  existingQuestions: Question[] = [],
  currentUserId: string = '',
  currentUserEmail: string = '',
  targetChapterId?: string,
  targetLessonId?: string
): Promise<ParseDocxResult> {
  const arrayBuffer = await file.arrayBuffer();
  let processedBuffer: ArrayBuffer = arrayBuffer;

  // Pre-process Word equation formats (m:sPre for left-sub-superscripts like isotope notation)
  try {
    const zip = await JSZip.loadAsync(arrayBuffer);
    const docXmlFile = zip.file('word/document.xml');
    if (docXmlFile) {
      let xml = await docXmlFile.async('string');
      if (xml.includes('m:sPre')) {
        xml = xml.replace(/<m:sPre>([\s\S]*?)<\/m:sPre>/g, (_, inner) => {
          const subMatch = inner.match(/<m:sub>[\s\S]*?<m:t>([^<]+)<\/m:t>[\s\S]*?<\/m:sub>/);
          const supMatch = inner.match(/<m:sup>[\s\S]*?<m:t>([^<]+)<\/m:t>[\s\S]*?<\/m:sup>/);
          const elemMatch = inner.match(/<\/m:sup>\s*<m:e>[\s\S]*?<m:t>([^<]+)<\/m:t>[\s\S]*?<\/m:e>/) ||
                           inner.match(/<m:e>[\s\S]*?<m:t>([^<]+)<\/m:t>[\s\S]*?<\/m:e>/);
          const sub = subMatch ? subMatch[1].trim() : '';
          const sup = supMatch ? supMatch[1].trim() : '';
          const elem = elemMatch ? elemMatch[1].trim() : '';
          return `</m:oMath><w:r><w:rPr><w:vertAlign w:val="superscript"/></w:rPr><w:t>${sup}</w:t></w:r><w:r><w:rPr><w:vertAlign w:val="subscript"/></w:rPr><w:t>${sub}</w:t></w:r><w:r><w:t>${elem}</w:t></w:r><m:oMath>`;
        });
        xml = xml.replace(/<m:oMath>\s*<\/m:oMath>/g, '');
        zip.file('word/document.xml', xml);
        processedBuffer = await zip.generateAsync({ type: 'arraybuffer' });
      }
    }
  } catch {
    // If not a valid zip archive or error occurs, fall back safely to original arrayBuffer
    processedBuffer = arrayBuffer;
  }

  let rawHtmlContent = '';
  let rawText = '';

  try {
    // Convert to HTML with explicit styleMap preserving <u> tags for underlines
    const mammothInput: { arrayBuffer: ArrayBuffer; buffer?: Buffer } = { arrayBuffer: processedBuffer };
    if (typeof Buffer !== 'undefined') {
      mammothInput.buffer = Buffer.from(processedBuffer);
    }

    const htmlResult = await mammoth.convertToHtml(
      mammothInput as any,
      {
        styleMap: [
          "u => u",
          "strike => s",
          "b => strong",
          "i => em"
        ],
        convertImage: mammoth.images.imgElement((image) => {
          return image.read("base64").then((imageBuffer) => {
            return {
              src: `data:${image.contentType};base64,${imageBuffer}`,
            };
          });
        }),
      }
    );

    // Extract raw text
    const rawTextResult = await mammoth.extractRawText(mammothInput as any);
    rawText = rawTextResult.value;
    rawHtmlContent = htmlResult.value;
  } catch (mammothErr) {
    // Graceful fallback for test suites or direct HTML text files
    const uint8 = new Uint8Array(arrayBuffer);
    const isZip = uint8[0] === 0x50 && uint8[1] === 0x4B; // PK magic bytes
    if (!isZip) {
      const textDecoder = new TextDecoder('utf-8');
      const textContent = textDecoder.decode(arrayBuffer);
      if (textContent.includes('<p>') || textContent.includes('<div>') || textContent.includes('Câu')) {
        rawHtmlContent = textContent;
        rawText = stripHtml(textContent);
      } else {
        throw mammothErr;
      }
    } else {
      throw mammothErr;
    }
  }

  const rawHtml = normalizeChemistryHtml(rawHtmlContent);

  // Split HTML into paragraph chunks
  const paragraphs: string[] = [];
  const pRegex = /<(p|li|h[1-6]|tr)[^>]*>([\s\S]*?)<\/\1>/gi;
  let pMatch: RegExpExecArray | null;
  while ((pMatch = pRegex.exec(rawHtml)) !== null) {
    paragraphs.push(pMatch[2].trim());
  }

  if (paragraphs.length === 0) {
    rawHtml.split(/<\/p>|<\/div>|<br\s*\/?>/i).forEach(chunk => {
      const trimmed = chunk.trim();
      if (trimmed) paragraphs.push(trimmed);
    });
  }

  const endAnswers = extractEndDocumentAnswerKeys(rawText);

  // Split into Question Blocks based on "Câu 1.", "Câu 1:", "Bài 1:"
  const questionHeaderRegex = /^(?:<[^>]+>)*(?:Câu|Bài|CÂU|BÀI)\s*(\d+)[\.\s:\-\)]|^(?:<[^>]+>)*(?:\(?\b(\d+)\)[\.\s:]+)(?=[A-ZÀ-Ỹ])/i;
  
  interface HtmlBlock {
    number: number;
    paragraphs: string[];
    imageUrls: string[];
    docChapterId?: string;
    docLessonId?: string;
  }

  const rawBlocks: HtmlBlock[] = [];
  let currentBlock: HtmlBlock | null = null;
  let questionCounter = 1;
  let currentDocChapterId: string | undefined = undefined;
  let currentDocLessonId: string | undefined = undefined;

  for (let i = 0; i < paragraphs.length; i++) {
    const p = paragraphs[i];
    const plainText = stripHtml(p);

    if (!plainText && !p.includes('<img')) continue;

    // Check if we hit the answer key section at the bottom of the document
    if (/(?:BẢNG\s*ĐÁP\s*ÁN|HƯỚNG\s*DẪN\s*CHẤM|KEY\s*ANSWER)/i.test(plainText) && !plainText.startsWith('Câu') && !plainText.startsWith('Bài')) {
      if (currentBlock) {
        rawBlocks.push(currentBlock);
        currentBlock = null;
      }
      break;
    }

    // Check for Document Chapter / Lesson Section Headings
    const chapHeadingMatch = plainText.match(/^(?:CHƯƠNG|Chương|CHAPTER)\s*(\d+)[\.\s:\-\—]*(.*)/i);
    if (chapHeadingMatch && !plainText.match(questionHeaderRegex)) {
      const cNum = parseInt(chapHeadingMatch[1], 10);
      currentDocChapterId = `chuong-${cNum}`;
      currentDocLessonId = undefined;
    }

    const lessonHeadingMatch = plainText.match(/^(?:BÀI|Bài|LESSON)\s*(\d+)[\.\s:\-\—]*(.*)/i) ||
                               plainText.match(/^(?:Đơn\s*vị\s*bài\s*học|Bài\s*học)[\.\s:\-\—]+(.*)/i);
    if (lessonHeadingMatch && !plainText.match(questionHeaderRegex)) {
      const rawMatchText = plainText.toLowerCase();
      if (currentDocChapterId) {
        const chap = CHEMISTRY_10_CURRICULUM.find(c => c.id === currentDocChapterId);
        if (chap) {
          const lNum = parseInt(lessonHeadingMatch[1], 10);
          if (!isNaN(lNum) && lNum >= 1 && lNum <= chap.lessons.length) {
            currentDocLessonId = chap.lessons[lNum - 1].id;
          } else {
            const l = detectLessonWithinChapter(rawMatchText, chap);
            currentDocLessonId = l.id;
          }
        }
      }
    }

    const match = plainText.match(questionHeaderRegex);
    if (match) {
      if (currentBlock) {
        rawBlocks.push(currentBlock);
      }
      const num = parseInt(match[1] || match[2] || String(questionCounter), 10);
      currentBlock = {
        number: isNaN(num) ? questionCounter : num,
        paragraphs: [p],
        imageUrls: [],
        docChapterId: currentDocChapterId,
        docLessonId: currentDocLessonId
      };
      questionCounter++;
    } else {
      if (currentBlock) {
        currentBlock.paragraphs.push(p);
      } else if (plainText.length > 5 && !plainText.startsWith('HƯỚNG DẪN') && !plainText.startsWith('BỘ ĐỀ') && !plainText.startsWith('FILE MẪU')) {
        currentBlock = {
          number: questionCounter,
          paragraphs: [p],
          imageUrls: [],
          docChapterId: currentDocChapterId,
          docLessonId: currentDocLessonId
        };
        questionCounter++;
      }
    }

    // Capture images in paragraph
    const imgMatches = [...p.matchAll(/<img[^>]+src="([^">]+)"/gi)];
    imgMatches.forEach(img => {
      if (currentBlock) {
        currentBlock.imageUrls.push(img[1]);
      }
    });
  }

  if (currentBlock) {
    rawBlocks.push(currentBlock);
  }

  // Parse each question block into ParsedWordQuestion
  const parsedQuestions: ParsedWordQuestion[] = [];

  for (let bIdx = 0; bIdx < rawBlocks.length; bIdx++) {
    const block = rawBlocks[bIdx];
    const combinedPlain = block.paragraphs.map(p => stripHtml(p)).join('\n');

    let contentPlain = combinedPlain;
    let explanation = '';
    let correctAnswer: string | boolean[] | string[] = '';
    let questionType: QuestionType = 'multiple_choice';
    let answerSource: 'UNDERLINE' | 'INLINE_TEXT' | 'END_TABLE' | 'MANUAL_EDIT' | 'UNSPECIFIED' = 'UNSPECIFIED';
    const options: QuestionOption[] = [];
    const underlinedOptions: string[] = [];

    // 1. Separate Explanation / Solution (Lời giải, Hướng dẫn giải, HDG, Giải)
    const explanationRegex = /(?:^|\n)\s*(?:Lời\s*giải(?:\s*chi\s*tiết)?|Hướng\s*dẫn\s*giải|HDG|Giải\s*thích|Giải)[\s:\-]+([\s\S]*)$/i;
    const explMatch = contentPlain.match(explanationRegex);
    if (explMatch) {
      explanation = explMatch[1].trim();
      contentPlain = contentPlain.replace(explanationRegex, '').trim();
    }

    // =========================================================================
    // HỆ THỐNG NHẬN DIỆN CHÍNH XÁC 3 DẠNG CÂU HỎI (CHEM10 AI PARSER)
    // TUYỆT ĐỐI KHÔNG DÙNG LOGIC "4 Ý = TRUE/FALSE"
    // BƯỚC 1: Tìm cấu trúc A/B/C/D (chữ hoa) -> multiple_choice
    // BƯỚC 2: Tìm cấu trúc a/b/c/d (chữ thường) -> true_false
    // BƯỚC 3: Tìm cấu trúc "Đáp án:" -> short_answer
    // BƯỚC 4: Không xác định được -> unknown (NEEDS_REVIEW)
    // =========================================================================

    // BƯỚC 1: Tìm cấu trúc A/B/C/D (Multiple Choice)
    // Chuẩn hóa regex cho A-D: ^\s*[A-D]\s*[.)]\s* hoặc sau \n, nhiều khoảng trắng, tab
    // Lưu ý: Tuyệt đối KHÔNG dùng cờ 'i' để tránh match nhầm a/b/c/d
    const mcqOptionPattern = /(?:^|\n|\s{2,}|\t)\s*([A-D])\s*[.)\-:]\s*([\s\S]*?)(?=(?:^|\n|\s{2,}|\t)\s*[A-D]\s*[.)\-:]|$)/g;
    const mcqMatches = [...contentPlain.matchAll(mcqOptionPattern)];
    const mcqLabels = mcqMatches.map(m => m[1]);

    // Điều kiện MCQ: tìm thấy ít nhất các label A, B (và thường là C, D) theo đúng thứ tự
    const hasMcqStructure = mcqMatches.length >= 2 &&
                            mcqLabels[0] === 'A' &&
                            mcqLabels[1] === 'B' &&
                            (mcqMatches.length >= 3 ? mcqLabels[2] === 'C' : true);

    // BƯỚC 2: Tìm cấu trúc a/b/c/d (True / False)
    // Chỉ nhận diện khi các ý được đánh dấu chữ thường a, b, c, d
    // Lưu ý: Tuyệt đối KHÔNG dùng cờ 'i'
    const tfSubItemRegex = /(?:^|\n|\s{2,}|\t)\s*([a-d])\s*[.)\-:]\s*([\s\S]*?)(?=(?:^|\n|\s{2,}|\t)\s*[a-d]\s*[.)\-:]|$)/g;
    const tfMatches = [...contentPlain.matchAll(tfSubItemRegex)];
    const tfLabels = tfMatches.map(m => m[1]);

    const hasTfStructure = !hasMcqStructure &&
                           tfMatches.length >= 2 &&
                           tfLabels[0] === 'a' &&
                           tfLabels[1] === 'b' &&
                           (tfMatches.length >= 3 ? tfLabels[2] === 'c' : true);

    // BƯỚC 3: Kiểm tra mẫu Trả lời ngắn với "Đáp án:" / "ĐÁP ÁN:" / "Answer:"
    const shortAnswerRegex = /(?:^|\n)\s*(?:Đáp\s*án|ĐÁP\s*ÁN|Answer|ANSWER|Kết\s*quả|KẾT\s*QUẢ)\s*[:\-]\s*(.*)$/im;
    const shortAnsMatch = contentPlain.match(shortAnswerRegex);

    if (hasMcqStructure) {
      // -----------------------------------------------------------------------
      // DẠNG 1: MULTIPLE CHOICE (TRẮC NGHIỆM A/B/C/D)
      // -----------------------------------------------------------------------
      questionType = 'multiple_choice';

      // Nội dung câu hỏi nằm trước phương án A đầu tiên
      const firstOptIdx = contentPlain.search(/(?:^|\n|\s{2,}|\t)\s*A\s*[.)\-:]/);
      if (firstOptIdx > 0) {
        contentPlain = contentPlain.slice(0, firstOptIdx).trim();
      }

      mcqMatches.forEach((m) => {
        const optLetter = m[1].toUpperCase();
        let optText = m[2].trim();

        // Xóa ghi chú phụ như "(← Phương án đúng được gạch chân)"
        optText = optText.replace(/\(←[^)]+\)/gi, '').trim();

        // Xóa dòng "Đáp án: [A-D]" nếu dính ở cuối phương án cuối
        optText = optText.replace(/(?:^|\n)\s*(?:Đáp\s*án|ĐÁP\s*ÁN|Answer|ANSWER)\s*[:\-]\s*[A-D]\s*$/i, '').trim();

        // Tìm đoạn HTML tương ứng trong file Word để nhận diện GẠCH CHÂN (<u>...</u>)
        const optRegex = new RegExp(`(?:^|\\s{2,}|\\n|\\t)\\s*${optLetter}\\s*[.)\\-:]`);
        const matchingHtmlP = block.paragraphs.find(p => {
          const stripped = stripHtml(p);
          return optRegex.test(stripped);
        }) || '';

        // Kiểm tra gạch chân
        let isUnderlined = false;
        if (matchingHtmlP.includes('<u>') && matchingHtmlP.includes('</u>')) {
          const uMatches = [...matchingHtmlP.matchAll(/<u[^>]*>([\s\S]*?)<\/u>/gi)];
          if (uMatches.length > 0) {
            // Đếm số phương án trong paragraph này
            const allOptLettersInP = ['A', 'B', 'C', 'D'].filter(l => 
              new RegExp(`(?:^|\\s{2,}|\\n|\\t)\\s*${l}\\s*[.)\\-:]`).test(stripHtml(matchingHtmlP))
            );
            if (allOptLettersInP.length <= 1) {
              isUnderlined = true;
            } else {
              isUnderlined = uMatches.some(um => {
                const uText = stripHtml(um[1]).trim();
                return new RegExp(`(?:^|\\b)${optLetter}\\s*[.)\\-:]`).test(uText) ||
                       (optText.length > 3 && uText.includes(optText.slice(0, 10)));
              });
            }
          }
        }

        if (optText.startsWith('*') && optText.endsWith('*')) {
          optText = optText.replace(/\*/g, '').trim();
          isUnderlined = true;
        }

        if (isUnderlined && !underlinedOptions.includes(optLetter)) {
          underlinedOptions.push(optLetter);
        }

        options.push({
          id: optLetter,
          label: optLetter,
          text: optText
        });
      });

      // Xác định đáp án đúng của Multiple Choice:
      if (underlinedOptions.length === 1) {
        correctAnswer = underlinedOptions[0];
        answerSource = 'UNDERLINE';
      } else if (underlinedOptions.length > 1) {
        correctAnswer = underlinedOptions[0];
        answerSource = 'UNDERLINE';
      } else {
        // Kiểm tra dòng "Đáp án: A" nếu có trong văn bản
        const inlineAnsMatch = combinedPlain.match(/(?:^|\n|\s)(?:Đáp\s*án|ĐÁP\s*ÁN|Answer|ANSWER)\s*[:\-]\s*([A-D])(?![a-zA-Z0-9])/i);
        if (inlineAnsMatch) {
          correctAnswer = inlineAnsMatch[1].toUpperCase();
          answerSource = 'INLINE_TEXT';
        } else if (endAnswers.has(block.number) && typeof endAnswers.get(block.number) === 'string') {
          correctAnswer = endAnswers.get(block.number) as string;
          answerSource = 'END_TABLE';
        } else {
          correctAnswer = '';
          answerSource = 'UNSPECIFIED';
        }
      }

    } else if (hasTfStructure) {
      // -----------------------------------------------------------------------
      // DẠNG 2: TRUE / FALSE (ĐÚNG / SAI 4 Ý a, b, c, d)
      // -----------------------------------------------------------------------
      questionType = 'true_false';

      // Tách phần dẫn câu hỏi trước mệnh đề a
      const firstTfIdx = contentPlain.search(/(?:^|\n|\s{2,}|\t)\s*a\s*[.)\-:]/);
      if (firstTfIdx > 0) {
        contentPlain = contentPlain.slice(0, firstTfIdx).trim();
      }

      const tfCorrectList: boolean[] = [];

      tfMatches.forEach((m) => {
        const optKey = m[1].toLowerCase();
        let itemText = m[2].trim();

        // Tìm đoạn HTML tương ứng trong file Word
        const subPattern = new RegExp(`(?:^|\\s{2,}|\\n|\\t)\\s*${optKey}\\s*[.)\\-:]`);
        const matchingHtmlP = block.paragraphs.find(p => {
          const stripped = stripHtml(p);
          return subPattern.test(stripped);
        }) || '';

        // Đánh giá Đúng / Sai theo gạch chân hoặc nhãn Đúng/Sai
        let isCorrect = false;
        if (matchingHtmlP.includes('<u>') && matchingHtmlP.includes('</u>')) {
          if (/<u>[^<]*(?:Sai|S|False)[^<]*<\/u>/i.test(matchingHtmlP)) {
            isCorrect = false;
          } else {
            isCorrect = true;
          }
          answerSource = 'UNDERLINE';
        } else if (/\((?:Đúng|Đ|True)\)|\[(?:Đúng|Đ|True)\]|\bĐúng\b/i.test(itemText) && !/\bSai\b/i.test(itemText)) {
          isCorrect = true;
          if (answerSource === 'UNSPECIFIED') answerSource = 'INLINE_TEXT';
        } else {
          // Kiểm tra trong lời giải nếu có chú thích mệnh đề
          const explMatchForOpt = explanation.match(new RegExp(`(?:^|\\n|\\s)${optKey}[\\)\\.\\:\\-]\\s*(Đúng|Sai|True|False)`, 'i'));
          if (explMatchForOpt) {
            isCorrect = /Đúng|True/i.test(explMatchForOpt[1]);
            if (answerSource === 'UNSPECIFIED') answerSource = 'INLINE_TEXT';
          } else {
            isCorrect = false;
          }
        }

        // Làm sạch đuôi ghi chú như "(← Gạch chân = ĐÚNG)", "Đúng / Sai", v.v.
        itemText = itemText
          .replace(/\(←[^)]+\)/gi, '')
          .replace(/\((?:Đúng|Đ|True)\)|\[(?:Đúng|Đ|True)\]/gi, '')
          .replace(/\((?:Sai|S|False)\)|\[(?:Sai|S|False)\]/gi, '')
          .replace(/[\/\s]*(?:Đúng|Sai)[\/\s]*/gi, '')
          .trim();

        options.push({
          id: optKey,
          label: optKey,
          text: itemText,
          isCorrect
        });
        tfCorrectList.push(isCorrect);
      });

      correctAnswer = tfCorrectList;

    } else if (shortAnsMatch) {
      // -----------------------------------------------------------------------
      // DẠNG 3: SHORT ANSWER (TRẢ LỜI NGẮN CÓ DÒNG "ĐÁP ÁN:")
      // -----------------------------------------------------------------------
      questionType = 'short_answer';

      const extractedAnswer = stripHtml(shortAnsMatch[1]).trim();
      correctAnswer = extractedAnswer;
      answerSource = 'INLINE_TEXT';

      // Xóa dòng "Đáp án: ..." khỏi nội dung câu hỏi
      contentPlain = contentPlain.replace(shortAnswerRegex, '').trim();

    } else {
      // -----------------------------------------------------------------------
      // BƯỚC 4: UNKNOWN (KHÔNG THUỘC 3 DẠNG TRÊN - KHÔNG TỰ ĐOÁN)
      // -----------------------------------------------------------------------
      questionType = 'unknown';
      correctAnswer = '';
      answerSource = 'UNSPECIFIED';
    }

    // Clean question header prefix ("Câu 1.", "Câu 1:", "Bài 1.", "(1).", "1.")
    let cleanContent = contentPlain
      .replace(/^(?:<[^>]+>)*(?:Câu|Bài|CÂU|BÀI)\s*\d+[\.\s:\-\)]\s*/i, '')
      .replace(/^(?:<[^>]+>)*(?:\(?\b\d+\)[\.\s:\-]+)\s*/i, '')
      .trim();

    // 1. Detect Cognitive Level BEFORE stripping marker from cleanContent
    const level = detectCognitiveLevel(cleanContent, options, explanation);

    // 2. Strip cognitive level markers completely from question content
    cleanContent = stripCognitiveLevelMarkers(cleanContent);

    // 3. Curriculum & Topic matching on the clean content
    const effectiveChapterId = targetChapterId || block.docChapterId;
    const effectiveLessonId = targetLessonId || block.docLessonId;

    const curriculumMatch = detectChapterAndTopic(
      cleanContent + ' ' + explanation,
      effectiveChapterId,
      effectiveLessonId
    );

    let finalChapterId = curriculumMatch.chapterId;
    let finalChapterTitle = curriculumMatch.chapterTitle;
    let finalChapterName = curriculumMatch.chapterName;
    let finalLessonId = curriculumMatch.lessonId;
    let finalLessonTitle = curriculumMatch.lessonTitle;
    let finalLessonName = curriculumMatch.lessonName;
    let finalTopic = curriculumMatch.topic;

    // Duplicate detection against existing questions in DB (normalized without markers)
    const normalizedContent = stripCognitiveLevelMarkers(cleanContent).toLowerCase().replace(/[^a-z0-9à-ỹ]/gi, '');
    let duplicateWithId: string | undefined = undefined;
    let duplicateContent: string | undefined = undefined;

    const safeExistingQuestions: Question[] = Array.isArray(existingQuestions) ? existingQuestions : [];
    const matchedDuplicate = safeExistingQuestions.find(q => {
      const qNorm = stripCognitiveLevelMarkers(q.content || '').toLowerCase().replace(/[^a-z0-9à-ỹ]/gi, '');
      return qNorm.length > 20 && (qNorm === normalizedContent || qNorm.includes(normalizedContent) || normalizedContent.includes(qNorm));
    });

    if (matchedDuplicate) {
      duplicateWithId = matchedDuplicate.id;
      duplicateContent = matchedDuplicate.content;
    }

    // Validation Status Rules
    let validationStatus: 'VALID' | 'NEEDS_REVIEW' | 'DUPLICATE' = 'VALID';
    let warningMessage = '';

    if (duplicateWithId) {
      validationStatus = 'DUPLICATE';
      warningMessage = ' Câu hỏi này có khả năng đã tồn tại trong Ngân hàng câu hỏi.';
    } else if (questionType === 'multiple_choice') {
      if (underlinedOptions.length > 1) {
        validationStatus = 'NEEDS_REVIEW';
        warningMessage = ' Có nhiều phương án được gạch chân. Vui lòng kiểm tra lại file Word.';
      } else if (!correctAnswer) {
        validationStatus = 'NEEDS_REVIEW';
        warningMessage = ' Chưa xác định được đáp án vì không có phương án được gạch chân.';
      } else if (options.length < 2) {
        validationStatus = 'NEEDS_REVIEW';
        warningMessage = ' Câu trắc nghiệm chưa tách đủ các phương án A, B, C, D.';
      }
    } else if (questionType === 'true_false') {
      if (options.length < 2) {
        validationStatus = 'NEEDS_REVIEW';
        warningMessage = ' Chưa nhận diện đủ các mệnh đề a, b, c, d của câu Đúng/Sai.';
      }
    } else if (questionType === 'short_answer') {
      if (!correctAnswer) {
        validationStatus = 'NEEDS_REVIEW';
        warningMessage = ' Không thể xác định đáp án tự động cho câu trả lời ngắn. Vui lòng kiểm tra lại file Word.';
      }
    } else {
      // Dạng unknown
      validationStatus = 'NEEDS_REVIEW';
      warningMessage = ' Chưa xác định được dạng câu hỏi (không có A/B/C/D, a/b/c/d hoặc dòng Đáp án). Vui lòng kiểm tra lại cấu trúc file Word.';
    }

    parsedQuestions.push({
      tempId: `word-temp-${Date.now()}-${bIdx + 1}`,
      sourceNumber: block.number,
      grade: 10,
      chapterId: finalChapterId,
      chapterTitle: finalChapterTitle,
      chapterName: finalChapterName,
      lessonId: finalLessonId,
      lessonTitle: finalLessonTitle,
      lessonName: finalLessonName,
      topic: finalTopic,
      type: questionType,
      level: level,
      content: cleanContent || combinedPlain,
      imageUrl: block.imageUrls[0] || undefined,
      options: options.length > 0 ? options : undefined,
      correctAnswer: correctAnswer,
      explanation: explanation,
      keywords: [finalTopic, finalChapterTitle],
      createdBy: currentUserId || 'Teacher',
      creatorEmail: currentUserEmail || '',
      createdAt: new Date().toISOString(),
      status: 'APPROVED',
      source: 'WORD_IMPORT',
      sourceFileName: file.name,
      importedBy: currentUserId,
      importedAt: new Date().toISOString(),
      validationStatus,
      warningMessage: warningMessage || undefined,
      duplicateWithId,
      duplicateContent,
      answerSource,
      underlinedOptions: underlinedOptions.length > 0 ? underlinedOptions : undefined,
      selectedForImport: validationStatus !== 'DUPLICATE'
    });
  }

  const validCount = parsedQuestions.filter(q => q.validationStatus === 'VALID').length;
  const needsReviewCount = parsedQuestions.filter(q => q.validationStatus === 'NEEDS_REVIEW').length;
  const duplicateCount = parsedQuestions.filter(q => q.validationStatus === 'DUPLICATE').length;

  return {
    fileName: file.name,
    totalParsed: parsedQuestions.length,
    validCount,
    needsReviewCount,
    duplicateCount,
    questions: parsedQuestions,
    rawText,
    htmlContent: rawHtml
  };
}
