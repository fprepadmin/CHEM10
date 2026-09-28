/**
 * Utility for formatting student and correct answers in Review and Grading interfaces.
 * Prevents literal 'undefined' rendering and formats arrays (True/False, short answers) clearly.
 */

export function isAnswerFilled(val: any): boolean {
  if (val === null || val === undefined) return false;
  if (typeof val === 'string' && (val.trim() === '' || val.trim().toLowerCase() === 'undefined')) return false;
  if (Array.isArray(val)) {
    return val.some(item => item !== null && item !== undefined && item !== '' && item !== 'undefined');
  }
  return true;
}

export function formatStudentAnswer(val: any, subDetails?: { label?: string; studentVal?: any }[]): string {
  if (!isAnswerFilled(val)) {
    return 'Chưa trả lời';
  }

  // Handle True / False array of booleans
  if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'boolean') {
    const labels = ['a', 'b', 'c', 'd'];
    return val
      .map((b, i) => `${labels[i] || i + 1}: ${b === true ? 'Đúng' : b === false ? 'Sai' : 'Chưa chọn'}`)
      .join(' | ');
  }

  // Handle subDetails if present
  if (subDetails && subDetails.length > 0) {
    return subDetails
      .map(s => `${s.label || ''}: ${s.studentVal === true ? 'Đúng' : s.studentVal === false ? 'Sai' : 'Chưa chọn'}`)
      .join(' | ');
  }

  // Handle array of strings or numbers
  if (Array.isArray(val)) {
    return val.filter(isAnswerFilled).join(' / ');
  }

  return String(val);
}

export function formatCorrectAnswer(val: any, fallback?: any): string {
  const target = isAnswerFilled(val) ? val : fallback;

  if (!isAnswerFilled(target)) {
    return 'Đang cập nhật đáp án';
  }

  // Handle True / False array of booleans
  if (Array.isArray(target) && target.length > 0 && typeof target[0] === 'boolean') {
    const labels = ['a', 'b', 'c', 'd'];
    return target
      .map((b, i) => `${labels[i] || i + 1}: ${b === true ? 'Đúng' : 'Sai'}`)
      .join(' | ');
  }

  // Handle array of accepted answers for short answer
  if (Array.isArray(target)) {
    return target.filter(isAnswerFilled).join(' / ');
  }

  return String(target);
}
