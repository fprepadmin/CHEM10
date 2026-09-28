import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteField 
} from "firebase/firestore";
import firebaseConfig from "./firebase-applet-config.json" with { type: "json" };

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// Initialize server-side Firebase instance safely
let serverApp: any = null;
let serverDb: any = null;

function sanitizeServerData(obj: any): any {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) return obj.filter(item => item !== undefined).map(sanitizeServerData);
  if (typeof obj === 'object' && !(obj instanceof Date)) {
    const res: Record<string, any> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v !== undefined) res[k] = sanitizeServerData(v);
    }
    return res;
  }
  return obj;
}

try {
  const existingApps = getApps();
  const found = existingApps.find(a => a.name === "server-side-grading-app");
  if (found) {
    serverApp = found;
  } else {
    serverApp = initializeApp(firebaseConfig, "server-side-grading-app");
  }
  serverDb = getFirestore(serverApp, firebaseConfig.firestoreDatabaseId || undefined);
} catch (e) {
  console.warn("[Server Init] Firebase serverApp init fallback:", e);
}

// Health check endpoints for Cloud Run and external monitoring
app.get(["/healthz", "/api/health"], (req, res) => {
  res.json({ status: "ok", service: "chem10-ai-server", timestamp: new Date().toISOString() });
});

app.get("/api/inspect-db", async (req, res) => {
  const result: Record<string, any> = {};
  const collections = ["users", "classes", "questions", "questionSets", "assignments", "submissions", "answerKeys"];
  for (const col of collections) {
    try {
      const snap = await getDocs(collection(serverDb, col));
      result[col] = { count: snap.size, sample: snap.docs.slice(0, 3).map(d => ({ id: d.id, ...d.data() })) };
    } catch (e: any) {
      result[col] = { error: e.message || String(e) };
    }
  }
  res.json(result);
});

// Secure Server-side Grading Endpoint
app.post("/api/grade-submission", async (req, res) => {
  try {
    const {
      assignmentId,
      questionSetId,
      questionSetTitle,
      studentId,
      studentEmail,
      studentName,
      studentClass,
      attemptNumber,
      durationSeconds,
      answers,
      studentAnswers: rawStudentAnswers,
      questionIds
    } = req.body;

    if (!questionIds || !Array.isArray(questionIds) || questionIds.length === 0) {
      return res.status(400).json({ error: "Missing or invalid questionIds" });
    }

    if (!studentId || !studentEmail) {
      return res.status(400).json({ error: "Missing student identification" });
    }

    // Verify Assignment validity server-side if an assignmentId is provided
    if (assignmentId && typeof assignmentId === 'string' && assignmentId.trim().length > 0) {
      try {
        const assignDoc = await getDoc(doc(serverDb, "assignments", assignmentId));
        if (assignDoc.exists()) {
          const assignData = assignDoc.data();
          const nowTs = Date.now();
          const startTs = assignData.startAt ? new Date(assignData.startAt).getTime() : 0;
          const endTs = assignData.endAt ? new Date(assignData.endAt).getTime() : (assignData.deadline ? new Date(assignData.deadline + 'T23:59:59').getTime() : Infinity);

          // Check if assignment is closed or ended
          if (assignData.status === 'CLOSED' || assignData.status === 'CANCELLED' || assignData.status === 'ENDED' || nowTs > endTs) {
            return res.status(403).json({ 
              error: "Assignment is closed or expired", 
              message: "Bài giao này đã đóng hoặc đã hết hạn nộp bài. Bạn không thể tiếp tục nộp bài." 
            });
          }

          // Check if assignment is not yet started
          if (startTs > 0 && nowTs < startTs) {
            return res.status(403).json({ 
              error: "Assignment not yet open", 
              message: "Bài giao chưa đến thời gian mở." 
            });
          }

          // Check if student is explicitly excluded
          if (assignData.excludedStudentEmails && Array.isArray(assignData.excludedStudentEmails) && assignData.excludedStudentEmails.includes(studentEmail)) {
            return res.status(403).json({ 
              error: "Student excluded", 
              message: "Học sinh không thuộc danh sách làm bài này." 
            });
          }
        } else if (assignmentId !== 'assign-demo-1' && assignmentId !== 'assign-demo-2') {
          // If assignment doc was deleted from database
          return res.status(404).json({ 
            error: "Assignment not found", 
            message: "Bài giao không tồn tại hoặc đã bị xóa khỏi hệ thống." 
          });
        }
      } catch (checkErr) {
        console.warn("[Server Grading] Error verifying assignment doc:", checkErr);
      }
    }

    const studentAnswers = rawStudentAnswers || answers || {};
    let totalEarnedScore = 0;
    let fullyCorrectCount = 0;
    const details: any[] = [];
    const maxPointsPerQuestion = Number((10 / (questionIds.length || 1)).toFixed(3));

    // Helper: Normalize text
    const normalizeText = (val: any): string => {
      if (val === null || val === undefined) return "";
      return String(val)
        .trim()
        .toLowerCase()
        .replace(/[\u200B-\u200D\uFEFF]/g, "")
        .replace(/\s+/g, " ");
    };

    // Helper: Boolean conversion
    const toBoolean = (val: any): boolean => {
      if (typeof val === "boolean") return val;
      const s = String(val).trim().toLowerCase();
      return s === "true" || s === "đúng" || s === "dung" || s === "d" || s === "t" || s === "1";
    };

    // Helper: Numeric close comparison (12.5 vs 12,5)
    const isNumericClose = (stu: string, ans: string): boolean => {
      const cleanStu = stu.replace(/,/g, ".").replace(/\s/g, "");
      const cleanAns = ans.replace(/,/g, ".").replace(/\s/g, "");
      const numStu = parseFloat(cleanStu);
      const numAns = parseFloat(cleanAns);
      if (isNaN(numStu) || isNaN(numAns)) return false;
      const isPureStu = /^[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?$/.test(cleanStu);
      const isPureAns = /^[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?$/.test(cleanAns);
      if (isPureStu && isPureAns) {
        return Math.abs(numStu - numAns) < 0.0001;
      }
      return false;
    };

    // Helper: Equation normalization (Fe + 2HCl -> FeCl2 + H2)
    const normalizeEquation = (val: string): string => {
      return val
        .replace(/→|=>|-->|⇌|⇄/g, "->")
        .replace(/\s+/g, "")
        .toLowerCase();
    };

// Verified Demo Answer Keys (Strictly defined, zero arbitrary fallback)
const VERIFIED_DEMO_ANSWER_KEYS: Record<string, { correctAnswer: any; explanation: string; type: string }> = {
  "demo-q1": {
    correctAnswer: "C",
    explanation: "Electron (e) mang điện tích âm (-1,602 × 10⁻¹⁹ C hay -1), proton (p) mang điện tích dương (+1), neutron (n) không mang điện.",
    type: "multiple_choice"
  },
  "demo-q2": {
    correctAnswer: "A",
    explanation: "Với Z = 11, các electron được phân bố lần lượt theo thứ tự mức năng lượng: 1s² 2s² 2p⁶ 3s¹.",
    type: "multiple_choice"
  },
  "demo-q3": {
    correctAnswer: [true, false, true, true],
    explanation: "Ý b sai vì Số khối A = số proton (Z) + số neutron (N), electron nằm ở lớp vỏ nguyên tử không nằm trong hạt nhân.",
    type: "true_false"
  },
  "demo-q4": {
    correctAnswer: "B",
    explanation: "Trong cùng một chu kì, số lớp e không đổi nhưng điện tích hạt nhân tăng dần, lực hút giữa hạt nhân và electron lớp ngoài cùng tăng làm bán kính nguyên tử giảm dần.",
    type: "multiple_choice"
  },
  "demo-q5": {
    correctAnswer: "MgCl2",
    explanation: "Ion Mg²⁺ kết hợp với 2 ion Cl⁻ để tạo thành tinh thể hợp chất ion trung hòa điện có công thức MgCl₂.",
    type: "short_answer"
  },
  "demo-q6": {
    correctAnswer: "+6",
    explanation: "Trong H₂SO₄: H có số oxi hóa +1, O có số oxi hóa -2. Gọi x là số oxi hóa của S: 2*(+1) + x + 4*(-2) = 0 => 2 + x - 8 = 0 => x = +6.",
    type: "short_answer"
  },
  "demo-q7": {
    correctAnswer: "A",
    explanation: "Quá trình oxi hóa: Fe⁰ → Fe³⁺ + 3e (nhân 1). Quá trình khử: N⁺⁵ + 3e → N⁺² (NO) (nhân 1). Phương trình: Fe + 4HNO₃ → Fe(NO₃)₃ + NO + 2H₂O. Tổng hệ số = 9.",
    type: "equation_balance"
  },
  "demo-q8": {
    correctAnswer: "B",
    explanation: "Ion Cl⁻ phản ứng với dung dịch AgNO₃ tạo kết tủa trắng bạc chloride (AgCl): Ag⁺ + Cl⁻ → AgCl↓ (màu trắng).",
    type: "identification"
  },
  "demo-q9": {
    correctAnswer: "B",
    explanation: "Phản ứng đốt cháy than (C + O₂ → CO₂) là phản ứng tỏa nhiệt kèm phát sáng (ΔrH°₂₉₈ < 0).",
    type: "multiple_choice"
  },
  "demo-q10": {
    correctAnswer: "A",
    explanation: "Áp dụng công thức: ΔrH°₂₉₈ = [ΔfH°(CO₂) + 2*ΔfH°(H₂O)] - [ΔfH°(CH₄) + 2*ΔfH°(O₂)] = [-393,5 + 2*(-285,8)] - [-74,8 + 0] = -890,3 kJ.",
    type: "calculation"
  },
  "demo-q11": {
    correctAnswer: "B",
    explanation: "Khi giảm nhiệt độ, tốc độ các phản ứng sinh hóa, thối rữa và hoạt động vi sinh vật giảm mạnh, giúp thức ăn lâu hỏng.",
    type: "multiple_choice"
  },
  "demo-q12": {
    correctAnswer: [true, true, false, true],
    explanation: "a: đúng (tăng diện tích tiếp xúc); b: đúng (tăng nhiệt độ làm tăng tốc độ); c: sai (giảm nồng độ làm giảm tốc độ); d: đúng (khuấy làm tăng tần số va chạm hiệu quả).",
    type: "true_false"
  }
};

    // Pre-fetch QuestionSet in one call to support standalone exams with embedded answer keys
    const embeddedMap = new Map<string, { correctAnswer: any; explanation: string; type: string }>();
    if (questionSetId) {
      try {
        const qSetDoc = await getDoc(doc(serverDb, "questionSets", questionSetId));
        if (qSetDoc.exists()) {
          const qsData = qSetDoc.data();
          if (Array.isArray(qsData.questions)) {
            qsData.questions.forEach((q: any) => {
              if (q && q.id) {
                const rawKey = q.correctAnswer !== undefined ? q.correctAnswer : (q.answer !== undefined ? q.answer : (q.key !== undefined ? q.key : q.shortAnswer));
                if (rawKey !== undefined && rawKey !== null) {
                  embeddedMap.set(q.id, {
                    correctAnswer: rawKey,
                    explanation: q.explanation || "",
                    type: q.type || "multiple_choice"
                  });
                }
              }
            });
          }
        }
      } catch (qSetErr) {
        console.warn("[Server Grading] Pre-fetch questionSet error:", qSetErr);
      }
    }

    // Identify which questions need fetching from Firestore collections
    const questionsToFetch = questionIds.filter(qId => !embeddedMap.has(qId) && !VERIFIED_DEMO_ANSWER_KEYS[qId]);

    // Fetch answerKeys and questions in PARALLEL for all remaining questions
    const fetchedKeysMap = new Map<string, { correctAnswer: any; explanation: string; type: string; source: string }>();
    if (questionsToFetch.length > 0) {
      await Promise.all(
        questionsToFetch.map(async (qId) => {
          let correctAnswer: any = null;
          let explanation = "";
          let qType = "multiple_choice";
          let source = "unknown";

          // Fetch answerKey and question in parallel for this qId
          try {
            const [keyDoc, qDoc] = await Promise.all([
              getDoc(doc(serverDb, "answerKeys", qId)).catch(() => null),
              getDoc(doc(serverDb, "questions", qId)).catch(() => null)
            ]);

            if (keyDoc && keyDoc.exists()) {
              const data = keyDoc.data();
              const rawKey = data.correctAnswer !== undefined ? data.correctAnswer : (data.answer !== undefined ? data.answer : (data.key !== undefined ? data.key : (data.correct_answer !== undefined ? data.correct_answer : data.shortAnswer)));
              if (rawKey !== undefined && rawKey !== null) {
                correctAnswer = rawKey;
                explanation = data.explanation || "";
                source = "firestore.answerKeys";
              }
            }

            if (qDoc && qDoc.exists()) {
              const data = qDoc.data();
              if (data.type) qType = data.type;
              const rawQAnswer = data.correctAnswer !== undefined ? data.correctAnswer : (data.answer !== undefined ? data.answer : (data.key !== undefined ? data.key : (data.correct_answer !== undefined ? data.correct_answer : data.shortAnswer)));
              if (correctAnswer === null && rawQAnswer !== undefined && rawQAnswer !== null) {
                correctAnswer = rawQAnswer;
                explanation = data.explanation || "";
                source = "firestore.questions";
              }
            }
          } catch (fetchErr) {
            console.warn(`[Server Grading] Error fetching key/question for ${qId}:`, fetchErr);
          }

          if (correctAnswer !== null) {
            fetchedKeysMap.set(qId, { correctAnswer, explanation, type: qType, source });
          }
        })
      );
    }

    // Evaluate each question strictly and in-memory (Microseconds)
    for (const qId of questionIds) {
      let correctAnswer: any = null;
      let explanation = "";
      let qType = "multiple_choice";
      let answerKeySource = "unknown";

      // 1. Check embedded questions map
      if (embeddedMap.has(qId)) {
        const item = embeddedMap.get(qId)!;
        correctAnswer = item.correctAnswer;
        explanation = item.explanation;
        qType = item.type;
        answerKeySource = "embedded_questions";
      }
      // 2. Check parallel-fetched Firestore keys
      else if (fetchedKeysMap.has(qId)) {
        const item = fetchedKeysMap.get(qId)!;
        correctAnswer = item.correctAnswer;
        explanation = item.explanation;
        qType = item.type;
        answerKeySource = item.source;
      }
      // 3. Check verified demo fallback
      else if (VERIFIED_DEMO_ANSWER_KEYS[qId]) {
        const demoEntry = VERIFIED_DEMO_ANSWER_KEYS[qId];
        correctAnswer = demoEntry.correctAnswer;
        explanation = demoEntry.explanation;
        qType = demoEntry.type || "multiple_choice";
        answerKeySource = "verified_demo_fallback";
      }

      // Safe fallback if key is missing
      if (correctAnswer === null || correctAnswer === undefined) {
        correctAnswer = "";
      }

      const stuAns = studentAnswers[qId];
      let isCorrect = false;
      let scoreRatio = 0;
      let subDetails: any[] | undefined = undefined;

      const isChoiceAnswer = typeof correctAnswer === "string" && ["A", "B", "C", "D"].includes(correctAnswer.trim().toUpperCase());

      // === LOGIC SO SÁNH ĐÁP ÁN (ANSWER COMPARISON ENGINE) ===
      if (qType === "true_false" || (Array.isArray(correctAnswer) && typeof correctAnswer[0] === "boolean")) {
        // --- Dạng 2: Đúng / Sai 4 ý (a, b, c, d) chuẩn GDPT 2018 ---
        const stuArr = Array.isArray(stuAns) ? stuAns : [];
        const corrArr = Array.isArray(correctAnswer)
          ? correctAnswer
          : String(correctAnswer).split(/[,;|]/).map(s => s.trim());

        subDetails = corrArr.map((corrItem, idx) => {
          const corrBool = toBoolean(corrItem);
          const stuVal = stuArr[idx];
          const stuBool = stuVal !== undefined ? toBoolean(stuVal) : null;
          const isMatch = stuBool !== null && stuBool === corrBool;
          return {
            index: idx,
            label: ["a", "b", "c", "d"][idx] || `${idx + 1}`,
            studentVal: stuBool,
            correctVal: corrBool,
            isMatch
          };
        });

        const matchCount = subDetails.filter(s => s.isMatch).length;
        const totalItems = corrArr.length || 4;

        // Thang điểm chuẩn Bộ GD&ĐT cho dạng Đúng/Sai 4 ý:
        // 1 ý đúng: 0.10 | 2 ý đúng: 0.25 | 3 ý đúng: 0.50 | 4 ý đúng: 1.00
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
      } else if (qType === "multiple_choice" || isChoiceAnswer) {
        // --- Dạng 1: Trắc nghiệm 1 đáp án đúng (A, B, C, D) ---
        const cleanStu = String(stuAns || "").trim().toUpperCase();
        const cleanAns = String(correctAnswer || "").trim().toUpperCase();

        const matchStu = cleanStu.match(/^[A-D]/)?.[0] || cleanStu;
        const matchAns = cleanAns.match(/^[A-D]/)?.[0] || cleanAns;

        isCorrect = matchStu !== "" && matchStu === matchAns;
        scoreRatio = isCorrect ? 1.0 : 0;
      } else {
        // --- Dạng 3: Trả lời ngắn, Tính toán, Cân bằng PTHH ---
        const rawStu = normalizeText(stuAns);
        const acceptableAnswers: string[] = Array.isArray(correctAnswer)
          ? correctAnswer.map(normalizeText)
          : String(correctAnswer || "")
              .split(/[;|]/)
              .map(normalizeText)
              .filter(Boolean);

        if (acceptableAnswers.length === 0 && correctAnswer !== null) {
          acceptableAnswers.push(normalizeText(correctAnswer));
        }

        for (const ansItem of acceptableAnswers) {
          // 1. So khớp trực tiếp (bỏ khoảng trắng)
          if (rawStu.replace(/\s+/g, "") === ansItem.replace(/\s+/g, "")) {
            isCorrect = true;
            break;
          }
          // 2. So khớp số học sai số cho phép (12.5 == 12,5)
          if (isNumericClose(rawStu, ansItem)) {
            isCorrect = true;
            break;
          }
          // 3. So khớp phương trình hóa học chuẩn hóa
          if (normalizeEquation(rawStu) === normalizeEquation(ansItem)) {
            isCorrect = true;
            break;
          }
          // 4. So khớp số tách đơn vị (ví dụ học sinh gõ 12g hoặc 12 gam, đáp án là 12)
          const stuNumMatch = rawStu.match(/^([-+]?\d*[.,]?\d+)/);
          const ansNumMatch = ansItem.match(/^([-+]?\d*[.,]?\d+)/);
          if (stuNumMatch && ansNumMatch && isNumericClose(stuNumMatch[1], ansNumMatch[1])) {
            isCorrect = true;
            break;
          }
        }
        scoreRatio = isCorrect ? 1.0 : 0;
      }

      if (isCorrect) fullyCorrectCount++;
      const earnedItemScore = Number((maxPointsPerQuestion * scoreRatio).toFixed(2));
      totalEarnedScore += earnedItemScore;

      // Mandatory standard logging for grading inspection
      console.log(
        `[CHEM10 GRADING]\n` +
        `questionId: ${qId}\n` +
        `source: ${answerKeySource}\n` +
        `correctAnswer: ${JSON.stringify(correctAnswer)}\n` +
        `studentAnswer: ${JSON.stringify(stuAns)}\n` +
        `result: ${isCorrect ? "CORRECT" : "INCORRECT"}\n` +
        `score: ${earnedItemScore}`
      );

      details.push({
        questionId: qId,
        isCorrect,
        scoreRatio,
        score: earnedItemScore,
        studentAnswer: stuAns !== undefined ? stuAns : null,
        correctAnswer: correctAnswer,
        explanation: explanation,
        subDetails: subDetails || null
      });
    }

    const finalScore = Number(Math.min(10, Math.max(0, totalEarnedScore)).toFixed(1));
    const now = new Date().toISOString();

    // Lưu submissions trực tiếp vào Firestore
    const submissionRecord = {
      assignmentId: assignmentId || "",
      questionSetId: questionSetId || "",
      questionSetTitle: questionSetTitle || "Bài kiểm tra Hóa 10",
      studentId: studentId,
      studentEmail: studentEmail,
      studentName: studentName || studentEmail.split("@")[0] || "Học sinh",
      studentClass: studentClass || "10A1",
      attemptNumber: attemptNumber || 1,
      startedAt: new Date(Date.now() - (durationSeconds || 0) * 1000).toISOString(),
      submittedAt: now,
      durationSeconds: durationSeconds || 0,
      answers: studentAnswers,
      score: finalScore,
      totalQuestions: questionIds.length,
      correctCount: fullyCorrectCount,
      incorrectCount: questionIds.length - fullyCorrectCount,
      wrongCount: questionIds.length - fullyCorrectCount,
      details,
      status: "submitted"
    };

    let submissionId = "sub-" + Date.now();
    try {
      const subDocRef = await addDoc(collection(serverDb, "submissions"), sanitizeServerData(submissionRecord));
      submissionId = subDocRef.id;
      console.log(`[Server Grading] Lưu submission thành công vào Firestore: ${submissionId}`);
    } catch (saveErr) {
      console.warn("[Server Grading] Lưu submission vào Firestore gặp lỗi (fallback sang client):", saveErr);
    }

    return res.json({
      success: true,
      submissionId,
      score: finalScore,
      totalQuestions: questionIds.length,
      correctCount: fullyCorrectCount,
      wrongCount: questionIds.length - fullyCorrectCount,
      details,
      submission: {
        id: submissionId,
        ...submissionRecord
      },
      evaluatedAt: now
    });
  } catch (error: any) {
    console.error("[Server Grading] Error evaluating submission:", error);
    return res.status(500).json({ error: "Server grading failed", message: error?.message });
  }
});

// Database Migration Helper Endpoint: Migrates legacy questions into questions + answerKeys
app.post("/api/migrate-database", async (req, res) => {
  try {
    const qSnap = await getDocs(collection(serverDb, "questions"));
    let migratedCount = 0;

    for (const d of qSnap.docs) {
      const data = d.data();
      if (data.correctAnswer !== undefined || data.explanation !== undefined) {
        // Save to answerKeys
        await setDoc(doc(serverDb, "answerKeys", d.id), {
          questionId: d.id,
          correctAnswer: data.correctAnswer !== undefined ? data.correctAnswer : "",
          explanation: data.explanation || "",
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });

        // Remove secret fields from questions document
        await updateDoc(doc(serverDb, "questions", d.id), {
          correctAnswer: deleteField(),
          explanation: deleteField()
        });

        migratedCount++;
      }
    }

    return res.json({
      success: true,
      totalQuestions: qSnap.size,
      migratedCount,
      message: `Successfully migrated ${migratedCount} questions into separate answerKeys collection.`
    });
  } catch (err: any) {
    console.error("[Migration Error]:", err);
    return res.status(500).json({ error: "Migration failed", message: err?.message });
  }
});

// Seed Demo Data Endpoint: Seeds 12 verified demo questions and answerKeys into Firestore
app.post("/api/seed-demo-data", async (req, res) => {
  try {
    const qSnap = await getDocs(collection(serverDb, "questions"));
    const akSnap = await getDocs(collection(serverDb, "answerKeys"));
    return res.json({
      success: true,
      questionsCount: qSnap.size,
      answerKeysCount: akSnap.size,
      message: "Seed data status checked."
    });
  } catch (err: any) {
    return res.status(500).json({ error: "Seed check failed", message: err?.message });
  }
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Robust resolution of production static build directory
    let distPath = path.join(process.cwd(), "dist");
    if (!fs.existsSync(path.join(distPath, "index.html"))) {
      const altDist = path.resolve(__dirname, "..", "dist");
      if (fs.existsSync(path.join(altDist, "index.html"))) {
        distPath = altDist;
      } else if (fs.existsSync(path.join(__dirname, "index.html"))) {
        distPath = __dirname;
      }
    }

    app.use(express.static(distPath));
    app.get("*", (req, res, next) => {
      // Do not intercept API routes
      if (req.path.startsWith("/api/")) {
        return next();
      }
      const indexPath = path.join(distPath, "index.html");
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send("Application static files not found. Please rebuild the project.");
      }
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
