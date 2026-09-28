import fs from "fs";
import path from "path";
import { CHEMISTRY_10_CURRICULUM, DEMO_QUESTIONS, CANONICAL_CHAPTER_NAMES } from "../src/data/curriculum.ts";
import firebaseConfig from "../firebase-applet-config.json" with { type: "json" };

const snapshotDir = path.join(process.cwd(), "snapshots", "CHEM10-AI-PRODUCTION-STABLE-2026-08-30", "data_seeds");
fs.mkdirSync(snapshotDir, { recursive: true });

// Export separated questions (sanitized) and answerKeys (secrets)
const sanitizedQuestions = DEMO_QUESTIONS.map(q => {
  const { correctAnswer, explanation, ...sanitized } = q;
  return sanitized;
});

const answerKeys = DEMO_QUESTIONS.map(q => ({
  questionId: q.id,
  correctAnswer: q.correctAnswer,
  explanation: q.explanation || "",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
}));

fs.writeFileSync(path.join(snapshotDir, "curriculum_chapters_1_to_7.json"), JSON.stringify(CHEMISTRY_10_CURRICULUM, null, 2));
fs.writeFileSync(path.join(snapshotDir, "demo_questions_sanitized.json"), JSON.stringify(sanitizedQuestions, null, 2));
fs.writeFileSync(path.join(snapshotDir, "demo_answer_keys.json"), JSON.stringify(answerKeys, null, 2));
fs.writeFileSync(path.join(snapshotDir, "canonical_chapters.json"), JSON.stringify(CANONICAL_CHAPTER_NAMES, null, 2));

console.log(`Successfully exported ${sanitizedQuestions.length} sanitized questions and ${answerKeys.length} answer keys!`);
