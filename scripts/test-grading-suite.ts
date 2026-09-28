import { describe, it } from 'node:test';
import assert from 'node:assert';

const BASE_URL = 'http://localhost:3000';

async function gradeSubmission(payload: any) {
  const res = await fetch(`${BASE_URL}/api/grade-submission`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  return { status: res.status, data };
}

async function runTestSuite() {
  console.log('========================================================');
  console.log('         CHEM10 AI - BỘ TEST CHẤM BÀI 10 KỊCH BẢN        ');
  console.log('========================================================\n');

  let passedTests = 0;
  let failedTests = 0;

  // TEST 1: Trắc nghiệm 1 đáp án đúng (ĐÚNG)
  try {
    console.log('--- TEST 1: Trắc nghiệm 1 đáp án đúng (ĐÚNG) ---');
    console.log('Câu hỏi: demo-q1 | Chọn: C | Expected: CORRECT, score = 10');
    const res = await gradeSubmission({
      questionIds: ['demo-q1'],
      answers: { 'demo-q1': 'C' },
      studentId: 'test-student',
      studentEmail: 'student.test@fpt.edu.vn',
      questionSetId: 'qs-demo'
    });
    assert.strictEqual(res.status, 200, `Expected status 200, got ${res.status}`);
    const detail = res.data.details[0];
    assert.strictEqual(detail.isCorrect, true, `Expected isCorrect = true`);
    assert.strictEqual(detail.correctAnswer, 'C', `Expected correctAnswer = C`);
    assert.strictEqual(res.data.score, 10, `Expected score = 10, got ${res.data.score}`);
    console.log('=> TEST 1 PASSED! (Score: 10/10, result: CORRECT)\n');
    passedTests++;
  } catch (err: any) {
    console.error('=> TEST 1 FAILED:', err.message, '\n');
    failedTests++;
  }

  // TEST 2: Trắc nghiệm 1 đáp án đúng (SAI)
  try {
    console.log('--- TEST 2: Trắc nghiệm 1 đáp án đúng (SAI) ---');
    console.log('Câu hỏi: demo-q1 | Chọn: A | Expected: INCORRECT, score = 0');
    const res = await gradeSubmission({
      questionIds: ['demo-q1'],
      answers: { 'demo-q1': 'A' },
      studentId: 'test-student',
      studentEmail: 'student.test@fpt.edu.vn',
      questionSetId: 'qs-demo'
    });
    assert.strictEqual(res.status, 200, `Expected status 200, got ${res.status}`);
    const detail = res.data.details[0];
    assert.strictEqual(detail.isCorrect, false, `Expected isCorrect = false`);
    assert.strictEqual(res.data.score, 0, `Expected score = 0, got ${res.data.score}`);
    console.log('=> TEST 2 PASSED! (Score: 0/10, result: INCORRECT)\n');
    passedTests++;
  } catch (err: any) {
    console.error('=> TEST 2 FAILED:', err.message, '\n');
    failedTests++;
  }

  // TEST 3: Đúng / Sai 4 ý (ĐÚNG HẾT)
  try {
    console.log('--- TEST 3: Đúng / Sai 4 ý (ĐÚNG HẾT) ---');
    console.log('Câu hỏi: demo-q3 | Chọn: [true, false, true, true] | Expected: CORRECT, score = 10');
    const res = await gradeSubmission({
      questionIds: ['demo-q3'],
      answers: { 'demo-q3': [true, false, true, true] },
      studentId: 'test-student',
      studentEmail: 'student.test@fpt.edu.vn',
      questionSetId: 'qs-demo'
    });
    assert.strictEqual(res.status, 200, `Expected status 200, got ${res.status}`);
    const detail = res.data.details[0];
    assert.strictEqual(detail.isCorrect, true, `Expected isCorrect = true`);
    assert.strictEqual(detail.scoreRatio, 1.0, `Expected scoreRatio = 1.0`);
    assert.strictEqual(res.data.score, 10, `Expected score = 10, got ${res.data.score}`);
    console.log('=> TEST 3 PASSED! (Score: 10/10, result: CORRECT, ratio: 1.0)\n');
    passedTests++;
  } catch (err: any) {
    console.error('=> TEST 3 FAILED:', err.message, '\n');
    failedTests++;
  }

  // TEST 4: Đúng / Sai 4 ý (ĐÚNG 3 Ý)
  try {
    console.log('--- TEST 4: Đúng / Sai 4 ý (ĐÚNG 3 Ý) ---');
    console.log('Câu hỏi: demo-q3 | Chọn: [true, true, true, true] | Expected: scoreRatio = 0.5 (Bộ GD&ĐT), score = 5.0');
    const res = await gradeSubmission({
      questionIds: ['demo-q3'],
      answers: { 'demo-q3': [true, true, true, true] }, // 2nd item is true instead of false (3 matches)
      studentId: 'test-student',
      studentEmail: 'student.test@fpt.edu.vn',
      questionSetId: 'qs-demo'
    });
    assert.strictEqual(res.status, 200, `Expected status 200, got ${res.status}`);
    const detail = res.data.details[0];
    assert.strictEqual(detail.isCorrect, false, `Expected isCorrect = false for partial`);
    assert.strictEqual(detail.scoreRatio, 0.5, `Expected scoreRatio = 0.5 for 3/4 matches`);
    assert.strictEqual(res.data.score, 5.0, `Expected score = 5.0, got ${res.data.score}`);
    console.log('=> TEST 4 PASSED! (Score: 5.0/10, ratio: 0.5 for 3/4 matching items)\n');
    passedTests++;
  } catch (err: any) {
    console.error('=> TEST 4 FAILED:', err.message, '\n');
    failedTests++;
  }

  // TEST 5: Trả lời ngắn (ĐÚNG)
  try {
    console.log('--- TEST 5: Trả lời ngắn (ĐÚNG) ---');
    console.log('Câu hỏi: demo-q5 | Nhập: "MgCl2" | Expected: CORRECT, score = 10');
    const res = await gradeSubmission({
      questionIds: ['demo-q5'],
      answers: { 'demo-q5': 'MgCl2' },
      studentId: 'test-student',
      studentEmail: 'student.test@fpt.edu.vn',
      questionSetId: 'qs-demo'
    });
    assert.strictEqual(res.status, 200, `Expected status 200, got ${res.status}`);
    const detail = res.data.details[0];
    assert.strictEqual(detail.isCorrect, true, `Expected isCorrect = true`);
    assert.strictEqual(res.data.score, 10, `Expected score = 10, got ${res.data.score}`);
    console.log('=> TEST 5 PASSED! (Score: 10/10, result: CORRECT)\n');
    passedTests++;
  } catch (err: any) {
    console.error('=> TEST 5 FAILED:', err.message, '\n');
    failedTests++;
  }

  // TEST 6: Trả lời ngắn (SAI)
  try {
    console.log('--- TEST 6: Trả lời ngắn (SAI) ---');
    console.log('Câu hỏi: demo-q5 | Nhập: "NaCl" | Expected: INCORRECT, score = 0');
    const res = await gradeSubmission({
      questionIds: ['demo-q5'],
      answers: { 'demo-q5': 'NaCl' },
      studentId: 'test-student',
      studentEmail: 'student.test@fpt.edu.vn',
      questionSetId: 'qs-demo'
    });
    assert.strictEqual(res.status, 200, `Expected status 200, got ${res.status}`);
    const detail = res.data.details[0];
    assert.strictEqual(detail.isCorrect, false, `Expected isCorrect = false`);
    assert.strictEqual(res.data.score, 0, `Expected score = 0, got ${res.data.score}`);
    console.log('=> TEST 6 PASSED! (Score: 0/10, result: INCORRECT)\n');
    passedTests++;
  } catch (err: any) {
    console.error('=> TEST 6 FAILED:', err.message, '\n');
    failedTests++;
  }

  // TEST 7: Số oxi hóa (ĐÚNG với "+6" và "6")
  try {
    console.log('--- TEST 7: Số oxi hóa (ĐÚNG với "+6" và "6") ---');
    console.log('Câu hỏi: demo-q6 | Nhập: "+6" | Expected: CORRECT, score = 10');
    const res1 = await gradeSubmission({
      questionIds: ['demo-q6'],
      answers: { 'demo-q6': '+6' },
      studentId: 'test-student',
      studentEmail: 'student.test@fpt.edu.vn',
      questionSetId: 'qs-demo'
    });
    assert.strictEqual(res1.status, 200, `Expected status 200, got ${res1.status}`);
    assert.strictEqual(res1.data.details[0].isCorrect, true, `Expected "+6" to be correct`);

    const res2 = await gradeSubmission({
      questionIds: ['demo-q6'],
      answers: { 'demo-q6': '6' },
      studentId: 'test-student',
      studentEmail: 'student.test@fpt.edu.vn',
      questionSetId: 'qs-demo'
    });
    assert.strictEqual(res2.status, 200, `Expected status 200, got ${res2.status}`);
    assert.strictEqual(res2.data.details[0].isCorrect, true, `Expected "6" to be correct`);
    console.log('=> TEST 7 PASSED! (Both "+6" and "6" evaluate to CORRECT)\n');
    passedTests++;
  } catch (err: any) {
    console.error('=> TEST 7 FAILED:', err.message, '\n');
    failedTests++;
  }

  // TEST 8: Đảo phương án (Shuffle Options)
  try {
    console.log('--- TEST 8: Đảo phương án (Shuffle Options) ---');
    console.log('Kiểm tra: Client gửi Option ID gốc (B cho demo-q4), server chấm đúng theo ID gốc');
    // demo-q4 correct answer is "B"
    const res = await gradeSubmission({
      questionIds: ['demo-q4'],
      answers: { 'demo-q4': 'B' },
      studentId: 'test-student',
      studentEmail: 'student.test@fpt.edu.vn',
      questionSetId: 'qs-demo'
    });
    assert.strictEqual(res.status, 200, `Expected status 200, got ${res.status}`);
    const detail = res.data.details[0];
    assert.strictEqual(detail.isCorrect, true, `Expected isCorrect = true for Option ID "B"`);
    assert.strictEqual(detail.correctAnswer, 'B', `Expected correctAnswer = B`);
    console.log('=> TEST 8 PASSED! (Option ID "B" correctly graded independently of display position)\n');
    passedTests++;
  } catch (err: any) {
    console.error('=> TEST 8 FAILED:', err.message, '\n');
    failedTests++;
  }

  // TEST 9: Bài thi thực tế (Mixed: 6 Đúng, 6 Sai)
  try {
    console.log('--- TEST 9: Bài thi thực tế (Mixed: 6 Đúng, 6 Sai trên 12 câu demo) ---');
    // 12 questions:
    // demo-q1 (C): pick C (Đúng)
    // demo-q2 (A): pick B (Sai)
    // demo-q3 ([true,false,true,true]): pick [true,false,true,true] (Đúng)
    // demo-q4 (B): pick A (Sai)
    // demo-q5 (MgCl2): pick "MgCl2" (Đúng)
    // demo-q6 (+6): pick "-2" (Sai)
    // demo-q7 (A): pick "A" (Đúng)
    // demo-q8 (B): pick "C" (Sai)
    // demo-q9 (B): pick "B" (Đúng)
    // demo-q10 (A): pick "D" (Sai)
    // demo-q11 (B): pick "B" (Đúng)
    // demo-q12 ([true,true,false,true]): pick [false,false,false,false] (Sai)
    const questionIds = [
      'demo-q1', 'demo-q2', 'demo-q3', 'demo-q4',
      'demo-q5', 'demo-q6', 'demo-q7', 'demo-q8',
      'demo-q9', 'demo-q10', 'demo-q11', 'demo-q12'
    ];
    const answers = {
      'demo-q1': 'C',                       // Đúng
      'demo-q2': 'B',                       // Sai (Đ/A là A)
      'demo-q3': [true, false, true, true],  // Đúng
      'demo-q4': 'A',                       // Sai (Đ/A là B)
      'demo-q5': 'MgCl2',                   // Đúng
      'demo-q6': '-2',                      // Sai (Đ/A là +6)
      'demo-q7': 'A',                       // Đúng
      'demo-q8': 'C',                       // Sai (Đ/A là B)
      'demo-q9': 'B',                       // Đúng
      'demo-q10': 'D',                      // Sai (Đ/A là A)
      'demo-q11': 'B',                      // Đúng
      'demo-q12': [false, true, true, false] // Sai (1/4 matches => 0.1 ratio)
    };

    const res = await gradeSubmission({
      questionIds,
      answers,
      studentId: 'student-real-test',
      studentEmail: 'student.real@fpt.edu.vn',
      questionSetId: 'qs-chem10-demo-12'
    });

    assert.strictEqual(res.status, 200, `Expected status 200, got ${res.status}`);
    assert.strictEqual(res.data.correctCount, 6, `Expected exactly 6 fully correct questions, got ${res.data.correctCount}`);
    assert.strictEqual(res.data.totalQuestions, 12, `Expected 12 total questions`);
    // Score should be approximately 5.1 (6 * 0.83 + 0.1 * 0.83 = 4.98 + 0.08 = 5.06 ≈ 5.1)
    console.log(`Earned Score: ${res.data.score} / 10 | Correct Count: ${res.data.correctCount} / 12`);
    assert.ok(res.data.score >= 5.0 && res.data.score <= 5.2, `Score must be around 5.0-5.1, got ${res.data.score}`);
    console.log('=> TEST 9 PASSED! (6 Đúng, 6 Sai được tính toán chính xác, KHÔNG CÓ HIỆN TƯỢNG TẤT CẢ ĐỀU SAI)\n');
    passedTests++;
  } catch (err: any) {
    console.error('=> TEST 9 FAILED:', err.message, '\n');
    failedTests++;
  }

  // TEST 10: Missing AnswerKey (Fail Fast)
  try {
    console.log('--- TEST 10: Missing AnswerKey (Fail Fast) ---');
    console.log('Câu hỏi: non-existent-question-999 | Expected: Status 400 with "GRADING ERROR: Missing answer key"');
    const res = await gradeSubmission({
      questionIds: ['non-existent-question-999'],
      answers: { 'non-existent-question-999': 'A' },
      studentId: 'test-student',
      studentEmail: 'student.test@fpt.edu.vn',
      questionSetId: 'qs-broken'
    });
    assert.strictEqual(res.status, 400, `Expected status 400, got ${res.status}`);
    assert.ok(
      res.data.error?.includes('Missing answer key for questionId: non-existent-question-999') ||
      res.data.message?.includes('Missing answer key for questionId: non-existent-question-999'),
      `Expected error message containing "Missing answer key", got: ${JSON.stringify(res.data)}`
    );
    console.log('=> TEST 10 PASSED! (Server failed fast and returned explicit error instead of grading as A)\n');
    passedTests++;
  } catch (err: any) {
    console.error('=> TEST 10 FAILED:', err.message, '\n');
    failedTests++;
  }

  console.log('========================================================');
  console.log(`KẾT QUẢ TEST SUITE: ${passedTests}/10 PASSED | ${failedTests}/10 FAILED`);
  console.log('========================================================');

  if (failedTests > 0) {
    process.exit(1);
  }
}

// Allow server to be ready before running
setTimeout(() => {
  runTestSuite().catch((err) => {
    console.error('Fatal test suite error:', err);
    process.exit(1);
  });
}, 1000);
