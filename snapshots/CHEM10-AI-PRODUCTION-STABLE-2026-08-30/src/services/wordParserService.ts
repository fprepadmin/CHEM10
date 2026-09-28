import mammoth from 'mammoth';
import { Question, QuestionType, CognitiveLevel, ParsedWordQuestion, QuestionOption } from '../types';

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
 * Normalizes chemical formulas and text to retain sub/superscript notations and clean formatting
 */
export function normalizeChemistryHtml(html: string): string {
  const subMap: Record<string, string> = { '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉' };
  const supMap: Record<string, string> = {
    '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
    '+': '⁺', '-': '⁻'
  };

  let cleaned = html
    .replace(/<sub>(\d+)<\/sub>/gi, (_, num) => {
      return num.split('').map((c: string) => subMap[c] || c).join('');
    })
    .replace(/<sup>(\d+|\+|\-|[0-9\+\-]+)<\/sup>/gi, (_, sup) => {
      return sup.split('').map((c: string) => supMap[c] || c).join('');
    });

  return cleaned;
}

/**
 * Automatic chapter detection based on chemistry keywords in GDPT 2018
 */
export function detectChapterAndTopic(text: string): {
  chapterId: string;
  chapterTitle: string;
  lessonId: string;
  lessonTitle: string;
  topic: string;
} {
  const lower = text.toLowerCase();

  if (lower.includes('halogen') || lower.includes('chlorine') || lower.includes('cl2') || lower.includes('bromine') || lower.includes('iodine') || lower.includes('fluorine') || lower.includes('hcl') || lower.includes('halide')) {
    return {
      chapterId: 'chuong-7',
      chapterTitle: 'Chương 7: Nguyên tố nhóm VIIA (Halogen)',
      lessonId: 'bai-15',
      lessonTitle: 'Nguyên tố nhóm VIIA (Nhóm halogen)',
      topic: 'Tính chất hóa học & Ứng dụng Halogen'
    };
  }

  if (lower.includes('tốc độ') || lower.includes('hằng số tốc độ') || lower.includes('chất xúc tác') || (lower.includes('nhiệt độ') && lower.includes('phản ứng')) || lower.includes('diện tích tiếp xúc') || lower.includes('định luật tác dụng khối lượng')) {
    return {
      chapterId: 'chuong-6',
      chapterTitle: 'Chương 6: Tốc độ phản ứng hóa học',
      lessonId: 'bai-14',
      lessonTitle: 'Tốc độ phản ứng hóa học & Các yếu tố ảnh hưởng',
      topic: 'Tốc độ phản ứng & Yếu tố ảnh hưởng'
    };
  }

  if (lower.includes('enthalpy') || lower.includes('nhiệt tạo thành') || lower.includes('tỏa nhiệt') || lower.includes('thu nhiệt') || lower.includes('δrh') || lower.includes('δfh') || lower.includes('năng lượng liên kết') || lower.includes('nhiệt phản ứng')) {
    return {
      chapterId: 'chuong-5',
      chapterTitle: 'Chương 5: Năng lượng hóa học (Enthalpy)',
      lessonId: 'bai-13',
      lessonTitle: 'Biến thiên Enthalpy trong các phản ứng hóa học',
      topic: 'Biến thiên Enthalpy & Tính toán nhiệt phản ứng'
    };
  }

  if (lower.includes('oxi hóa') || lower.includes('số oxi hóa') || lower.includes('chất khử') || lower.includes('chất oxi hóa') || lower.includes('quá trình khử') || lower.includes('quá trình oxi hóa') || lower.includes('thăng bằng electron')) {
    return {
      chapterId: 'chuong-4',
      chapterTitle: 'Chương 4: Phản ứng oxi hóa - khử',
      lessonId: 'bai-12',
      lessonTitle: 'Phản ứng oxi hóa - khử & Cân bằng thăng bằng electron',
      topic: 'Xác định số oxi hóa & Cân bằng PTHH Oxi hóa khử'
    };
  }

  if (lower.includes('liên kết') || lower.includes('cộng hóa trị') || lower.includes('liên kết ion') || lower.includes('hydrogen') || lower.includes('van der waals') || lower.includes('octet') || lower.includes('sigma') || lower.includes('pi')) {
    return {
      chapterId: 'chuong-3',
      chapterTitle: 'Chương 3: Liên kết hóa học',
      lessonId: 'bai-9',
      lessonTitle: 'Quy tắc Octet & Liên kết ion, Liên kết cộng hóa trị',
      topic: 'Bản chất liên kết hóa học & Tương tác liên phân tử'
    };
  }

  if (lower.includes('bảng tuần hoàn') || lower.includes('chu kì') || lower.includes('nhóm a') || lower.includes('nhóm b') || lower.includes('độ âm điện') || lower.includes('bán kính nguyên tử') || lower.includes('tính kim loại') || lower.includes('quy luật biến đổi')) {
    return {
      chapterId: 'chuong-2',
      chapterTitle: 'Chương 2: Bảng tuần hoàn các nguyên tố hóa học',
      lessonId: 'bai-5',
      lessonTitle: 'Cấu tạo Bảng tuần hoàn & Định luật tuần hoàn',
      topic: 'Xu hướng biến đổi tuần hoàn tính chất các nguyên tố'
    };
  }

  // Default to Chapter 1
  return {
    chapterId: 'chuong-1',
    chapterTitle: 'Chương 1: Cấu tạo nguyên tử',
    lessonId: 'bai-1',
    lessonTitle: 'Thành phần nguyên tử & Cấu hình electron',
    topic: 'Hạt nhân, Orbital nguyên tử & Cấu hình e'
  };
}

/**
 * Detects cognitive level
 */
export function detectCognitiveLevel(text: string): CognitiveLevel {
  const lower = text.toLowerCase();
  if (lower.includes('[vdc]') || lower.includes('(vdc)') || lower.includes('vận dụng cao') || (lower.includes('hỗn hợp') && lower.includes('tính m'))) {
    return 'van_dung_cao';
  }
  if (lower.includes('[vd]') || lower.includes('(vd)') || lower.includes('vận dụng') || lower.includes('tính ') || lower.includes('khối lượng') || lower.includes('biến thiên')) {
    return 'van_dung';
  }
  if (lower.includes('[th]') || lower.includes('(th)') || lower.includes('thông hiểu') || lower.includes('giải thích') || lower.includes('so sánh') || lower.includes('sắp xếp theo')) {
    return 'thong_hieu';
  }
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
 * Main DOCX Parser with Underline Detection and Strict Non-Guessing Policy
 */
export async function parseDocxFile(
  file: File,
  existingQuestions: Question[] = [],
  currentUserId: string = '',
  currentUserEmail: string = ''
): Promise<ParseDocxResult> {
  const arrayBuffer = await file.arrayBuffer();

  // Convert to HTML with explicit styleMap preserving <u> tags for underlines
  const htmlResult = await mammoth.convertToHtml(
    { arrayBuffer },
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
  const rawTextResult = await mammoth.extractRawText({ arrayBuffer });
  const rawText = rawTextResult.value;
  const rawHtml = normalizeChemistryHtml(htmlResult.value);

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
  }

  const rawBlocks: HtmlBlock[] = [];
  let currentBlock: HtmlBlock | null = null;
  let questionCounter = 1;

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

    const match = plainText.match(questionHeaderRegex);
    if (match) {
      if (currentBlock) {
        rawBlocks.push(currentBlock);
      }
      const num = parseInt(match[1] || match[2] || String(questionCounter), 10);
      currentBlock = {
        number: isNaN(num) ? questionCounter : num,
        paragraphs: [p],
        imageUrls: []
      };
      questionCounter++;
    } else {
      if (currentBlock) {
        currentBlock.paragraphs.push(p);
      } else if (plainText.length > 5 && !plainText.startsWith('HƯỚNG DẪN') && !plainText.startsWith('BỘ ĐỀ') && !plainText.startsWith('FILE MẪU')) {
        currentBlock = {
          number: questionCounter,
          paragraphs: [p],
          imageUrls: []
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

    // 2. Check for True/False question (a, b, c, d)
    const isTrueFalse = /(?:^|\n)\s*[aA][\)\.\:\-]\s+/m.test(contentPlain) &&
                        /(?:^|\n)\s*[bB][\)\.\:\-]\s+/m.test(contentPlain);

    // 3. Check for Short Answer pattern with "Đáp án:" / "ĐÁP ÁN:" / "Đáp án :"
    const shortAnswerRegex = /(?:^|\n)\s*(?:Đáp\s*án|ĐÁP\s*ÁN|Kết\s*quả)[\s:\-]+([^\n\r]+)/i;
    const shortAnsMatch = contentPlain.match(shortAnswerRegex);

    if (isTrueFalse) {
      questionType = 'true_false';

      // Split main prompt and sub-items
      const tfSubItemRegex = /(?:^|\n)\s*([a-d])[\)\.\:\-]\s*([\s\S]*?)(?=(?:^|\n)\s*[a-d][\)\.\:\-]|$)/gi;
      const parts = contentPlain.split(/(?:^|\n)\s*[a-d][\)\.\:\-]/i);
      const mainPrompt = parts[0].trim();
      contentPlain = mainPrompt;

      const tfCorrectList: boolean[] = [];
      const subMatches: { id: string; rawText: string; isCorrect: boolean }[] = [];

      let tfMatchItem: RegExpExecArray | null;
      while ((tfMatchItem = tfSubItemRegex.exec(combinedPlain)) !== null) {
        const optKey = tfMatchItem[1].toLowerCase();
        let itemText = tfMatchItem[2].trim();

        // Check if there is underline inside this item's HTML
        const matchingHtmlP = block.paragraphs.find(p => {
          const s = stripHtml(p).toLowerCase();
          return s.startsWith(`${optKey})`) || s.startsWith(`${optKey}.`) || s.startsWith(`${optKey}:`) || s.includes(`\n${optKey})`);
        }) || '';

        // ABSOLUTE RULE FOR TRUE/FALSE:
        // GẠCH CHÂN = ĐÚNG (true)
        // KHÔNG GẠCH CHÂN = SAI (false)
        let isCorrect = false;

        if (matchingHtmlP.includes('<u>') && matchingHtmlP.includes('</u>')) {
          // Has underline tag
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
          isCorrect = false;
          if (answerSource === 'UNSPECIFIED') answerSource = 'UNDERLINE';
        }

        // Clean trailing note "(← Gạch chân = ĐÚNG)" etc.
        itemText = itemText
          .replace(/\(←[^)]+\)/gi, '')
          .replace(/\((?:Đúng|Đ|True)\)|\[(?:Đúng|Đ|True)\]/gi, '')
          .replace(/\((?:Sai|S|False)\)|\[(?:Sai|S|False)\]/gi, '')
          .replace(/[\/\s]*(?:Đúng|Sai)[\/\s]*/gi, '')
          .trim();

        subMatches.push({ id: optKey, rawText: itemText, isCorrect });
        options.push({
          id: optKey,
          text: itemText,
          isCorrect
        });
        tfCorrectList.push(isCorrect);
      }

      correctAnswer = tfCorrectList;

    } else if (shortAnsMatch && !contentPlain.includes('A.') && !contentPlain.includes('A)')) {
      // DẠNG 3: TRẢ LỜI NGẮN (SHORT ANSWER)
      questionType = 'short_answer';

      // Keep exact raw answer text after "Đáp án:" without alteration
      const extractedAnswer = shortAnsMatch[1].trim();
      correctAnswer = extractedAnswer;
      answerSource = 'INLINE_TEXT';

      // Remove "Đáp án: ..." line from question content text
      contentPlain = contentPlain.replace(shortAnswerRegex, '').trim();

    } else {
      // DẠNG 1: TRẮC NGHIỆM 4 PHƯƠNG ÁN (MCQ)
      const optionPattern = /(?:^|\s{2,}|\n)\s*([A-D])[\.\)\:\-]\s*([\s\S]*?)(?=(?:^|\s{2,}|\n)\s*[A-D][\.\)\:\-]|$)/g;
      const optMatches = [...contentPlain.matchAll(optionPattern)];

      if (optMatches.length >= 2) {
        questionType = 'multiple_choice';

        // Main question text is before the first option
        const firstOptIdx = contentPlain.search(/(?:^|\s{2,}|\n)\s*[A-D][\.\)\:\-]/);
        if (firstOptIdx > 0) {
          contentPlain = contentPlain.slice(0, firstOptIdx).trim();
        }

        optMatches.forEach((m) => {
          const optLetter = m[1].toUpperCase();
          let optText = m[2].trim();

          // Clean trailing notes like "(← Phương án đúng được gạch chân)"
          optText = optText.replace(/\(←[^)]+\)/gi, '').trim();

          // Find corresponding HTML for this option to check for UNDERLINE
          const matchingHtmlP = block.paragraphs.find(p => {
            const stripped = stripHtml(p);
            return stripped.startsWith(`${optLetter}.`) || 
                   stripped.startsWith(`${optLetter})`) || 
                   stripped.startsWith(`${optLetter}:`) ||
                   stripped.includes(` ${optLetter}. `) ||
                   stripped.includes(` ${optLetter}) `);
          }) || '';

          // Mammoth maps Word underline to <u>...</u>
          const hasUnderlineInOption = matchingHtmlP.includes('<u>') && matchingHtmlP.includes('</u>');
          
          if (hasUnderlineInOption) {
            underlinedOptions.push(optLetter);
          }

          if (optText.startsWith('*') && optText.endsWith('*')) {
            optText = optText.replace(/\*/g, '').trim();
            if (!underlinedOptions.includes(optLetter)) {
              underlinedOptions.push(optLetter);
            }
          }

          options.push({
            id: optLetter,
            text: optText
          });
        });

        // Strict Non-Guessing Policy for MCQ:
        if (underlinedOptions.length === 1) {
          // Exactly 1 option underlined -> 100% Reliable Underline Answer!
          correctAnswer = underlinedOptions[0];
          answerSource = 'UNDERLINE';
        } else if (underlinedOptions.length > 1) {
          // Multiple options underlined -> mark needs review
          correctAnswer = underlinedOptions[0];
          answerSource = 'UNDERLINE';
        } else {
          // 0 options underlined -> Check fallback inline "Đáp án: A" if explicitly present
          const inlineAnsMatch = combinedPlain.match(/(?:Đáp\s*án|ĐÁP\s*ÁN)[\s:\-]+([A-D])(?![a-zA-Z0-9])/i);
          if (inlineAnsMatch) {
            correctAnswer = inlineAnsMatch[1].toUpperCase();
            answerSource = 'INLINE_TEXT';
          } else if (endAnswers.has(block.number) && typeof endAnswers.get(block.number) === 'string') {
            correctAnswer = endAnswers.get(block.number) as string;
            answerSource = 'END_TABLE';
          } else {
            // NO ANSWER FOUND -> DO NOT GUESS!
            correctAnswer = '';
            answerSource = 'UNSPECIFIED';
          }
        }

      } else {
        // Other non-MCQ fallback
        if (shortAnsMatch) {
          questionType = 'short_answer';
          correctAnswer = shortAnsMatch[1].trim();
          answerSource = 'INLINE_TEXT';
          contentPlain = contentPlain.replace(shortAnswerRegex, '').trim();
        } else {
          questionType = 'short_answer';
          correctAnswer = '';
          answerSource = 'UNSPECIFIED';
        }
      }
    }

    // Clean question header prefix ("Câu 1.", "Câu 1:", "Bài 1.")
    let cleanContent = contentPlain.replace(/^(?:<[^>]+>)*(?:Câu|Bài|CÂU|BÀI)\s*\d+[\.\s:\-\)]\s*/i, '').trim();

    // Curriculum & Cognitive Level matching
    const curriculumMatch = detectChapterAndTopic(cleanContent + ' ' + explanation);
    const level = detectCognitiveLevel(cleanContent);

    // Duplicate detection against existing questions in DB
    const normalizedContent = cleanContent.toLowerCase().replace(/[^a-z0-9à-ỹ]/gi, '');
    let duplicateWithId: string | undefined = undefined;
    let duplicateContent: string | undefined = undefined;

    const matchedDuplicate = existingQuestions.find(q => {
      const qNorm = q.content.toLowerCase().replace(/[^a-z0-9à-ỹ]/gi, '');
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
      warningMessage = '⚠️ Câu hỏi này có khả năng đã tồn tại trong Ngân hàng câu hỏi.';
    } else if (questionType === 'multiple_choice') {
      if (underlinedOptions.length > 1) {
        validationStatus = 'NEEDS_REVIEW';
        warningMessage = '⚠️ Có nhiều phương án được gạch chân. Vui lòng kiểm tra lại file Word.';
      } else if (!correctAnswer) {
        validationStatus = 'NEEDS_REVIEW';
        warningMessage = '⚠️ Chưa xác định được đáp án vì không có phương án được gạch chân.';
      } else if (options.length < 2) {
        validationStatus = 'NEEDS_REVIEW';
        warningMessage = '⚠️ Câu trắc nghiệm chưa tách đủ các phương án A, B, C, D.';
      }
    } else if (questionType === 'true_false') {
      if (options.length < 2) {
        validationStatus = 'NEEDS_REVIEW';
        warningMessage = '⚠️ Chưa nhận diện đủ các mệnh đề a, b, c, d của câu Đúng/Sai.';
      }
    } else {
      // Short answer
      if (!correctAnswer) {
        validationStatus = 'NEEDS_REVIEW';
        warningMessage = '⚠️ Không thể xác định đáp án tự động. Vui lòng kiểm tra câu hỏi.';
      }
    }

    parsedQuestions.push({
      tempId: `word-temp-${Date.now()}-${bIdx + 1}`,
      sourceNumber: block.number,
      grade: 10,
      chapterId: curriculumMatch.chapterId,
      chapterTitle: curriculumMatch.chapterTitle,
      lessonId: curriculumMatch.lessonId,
      lessonTitle: curriculumMatch.lessonTitle,
      topic: curriculumMatch.topic,
      type: questionType,
      level: level,
      content: cleanContent || combinedPlain,
      imageUrl: block.imageUrls[0] || undefined,
      options: options.length > 0 ? options : undefined,
      correctAnswer: correctAnswer,
      explanation: explanation,
      keywords: [curriculumMatch.topic, curriculumMatch.chapterTitle],
      createdBy: currentUserId || 'Teacher',
      creatorEmail: currentUserEmail || 'teacher@fpt.edu.vn',
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
      selectedForImport: validationStatus === 'VALID'
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
