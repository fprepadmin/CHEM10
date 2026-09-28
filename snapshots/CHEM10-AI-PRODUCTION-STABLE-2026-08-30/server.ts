import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { initializeApp } from "firebase/app";
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

// Initialize server-side Firebase instance
const serverApp = initializeApp(firebaseConfig, "server-side-grading-app");
const serverDb = getFirestore(serverApp, firebaseConfig.firestoreDatabaseId || undefined);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
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
      questionIds
    } = req.body;

    if (!questionIds || !Array.isArray(questionIds) || questionIds.length === 0) {
      return res.status(400).json({ error: "Missing or invalid questionIds" });
    }

    if (!studentId || !studentEmail) {
      return res.status(400).json({ error: "Missing student identification" });
    }

    const studentAnswers = answers || {};
    let correctCount = 0;
    const details = [];

    // Fetch answer keys from Firestore answerKeys collection securely on the server
    for (const qId of questionIds) {
      let correctAnswer: any = null;
      let explanation = "";
      let qType = "multiple_choice";

      // Check Firestore answerKeys collection
      try {
        const keyDoc = await getDoc(doc(serverDb, "answerKeys", qId));
        if (keyDoc.exists()) {
          const data = keyDoc.data();
          correctAnswer = data.correctAnswer;
          explanation = data.explanation || "";
        }
      } catch (err) {
        console.warn(`[Server Grading] Firestore answerKey fetch error for ${qId}:`, err);
      }

      // If not in answerKeys, check legacy questions doc
      if (correctAnswer === null) {
        try {
          const qDoc = await getDoc(doc(serverDb, "questions", qId));
          if (qDoc.exists()) {
            const data = qDoc.data();
            qType = data.type || "multiple_choice";
            if (data.correctAnswer !== undefined) {
              correctAnswer = data.correctAnswer;
              explanation = data.explanation || "";
            }
          }
        } catch (err) {
          console.warn(`[Server Grading] Legacy question fetch error for ${qId}:`, err);
        }
      }

      // Fallback for demo questions
      if (correctAnswer === null) {
        if (qId === "demo-q1" || qId === "q-c1-1") {
          correctAnswer = "B";
          explanation = "Nguyên tử cấu tạo gồm hạt nhân (proton, neutron) mang điện tích dương và vỏ electron mang điện tích âm.";
        } else if (qId === "demo-q2" || qId === "q-c1-2") {
          correctAnswer = "B";
          explanation = "Nguyên tử Sodium (Na) có Z = 11. Cấu hình electron là 1s² 2s² 2p⁶ 3s¹.";
        } else if (qId === "demo-q3" || qId === "q-c1-3") {
          correctAnswer = "C";
          explanation = "Đồng vị là những nguyên tử có cùng số proton (cùng Z) nhưng khác số neutron (khác số khối A).";
        } else if (qId === "demo-q4" || qId === "q-c1-4") {
          correctAnswer = "D";
          explanation = "Vỏ electron của nguyên tử gồm các lớp electron, đánh số từ 1 đến 7 tương ứng với K, L, M, N, O, P, Q.";
        } else if (qId === "demo-q5" || qId === "q-c1-5") {
          correctAnswer = "B";
          explanation = "Số electron tối đa trong phân lớp s là 2, phân lớp p là 6, phân lớp d là 10, phân lớp f là 14.";
        } else {
          correctAnswer = "A";
        }
      }

      const stuAns = studentAnswers[qId];
      let isCorrect = false;

      if (Array.isArray(correctAnswer)) {
        // True/False or multiple answers
        const stuArr = Array.isArray(stuAns) ? stuAns : [];
        isCorrect = correctAnswer.every((val, i) => val === stuArr[i]);
      } else if (typeof correctAnswer === "string") {
        const cleanStu = String(stuAns || "").trim().toLowerCase().replace(/\s+/g, "");
        const cleanAns = String(correctAnswer || "").trim().toLowerCase().replace(/\s+/g, "");
        isCorrect = cleanStu === cleanAns;
      } else {
        isCorrect = stuAns === correctAnswer;
      }

      if (isCorrect) correctCount++;

      details.push({
        questionId: qId,
        isCorrect,
        studentAnswer: stuAns !== undefined ? stuAns : null,
        correctAnswer: correctAnswer,
        explanation: explanation,
        score: isCorrect ? Number((10 / questionIds.length).toFixed(2)) : 0
      });
    }

    const finalScore = Number(((correctCount / (questionIds.length || 1)) * 10).toFixed(1));
    const now = new Date().toISOString();

    return res.json({
      success: true,
      score: finalScore,
      totalQuestions: questionIds.length,
      correctCount,
      wrongCount: questionIds.length - correctCount,
      details,
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

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
