import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json' with { type: 'json' };
import sanitizedQuestions from '../snapshots/CHEM10-AI-PRODUCTION-STABLE-2026-08-30/data_seeds/demo_questions_sanitized.json' with { type: 'json' };
import demoAnswerKeys from '../snapshots/CHEM10-AI-PRODUCTION-STABLE-2026-08-30/data_seeds/demo_answer_keys.json' with { type: 'json' };

const app = initializeApp(firebaseConfig, 'seed-demo-runner');
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || undefined);

export async function seedDemoData() {
  console.log('--- START SEEDING 12 DEMO QUESTIONS & ANSWER KEYS ---');
  let questionsSuccess = 0;
  let answerKeysSuccess = 0;

  for (const q of sanitizedQuestions) {
    try {
      const qRef = doc(db, 'questions', q.id);
      await setDoc(qRef, q);
      questionsSuccess++;
      console.log(`[Questions] Successfully seeded ${q.id} (type: ${q.type})`);
    } catch (err: any) {
      console.error(`[Questions] Error seeding ${q.id}:`, err.message);
    }
  }

  for (const ak of demoAnswerKeys) {
    try {
      const akRef = doc(db, 'answerKeys', ak.questionId);
      await setDoc(akRef, ak);
      answerKeysSuccess++;
      console.log(`[AnswerKeys] Successfully seeded ${ak.questionId} (answer: ${JSON.stringify(ak.correctAnswer)})`);
    } catch (err: any) {
      console.error(`[AnswerKeys] Error seeding ${ak.questionId}:`, err.message);
    }
  }

  console.log(`--- SEED COMPLETE: ${questionsSuccess}/12 questions, ${answerKeysSuccess}/12 answerKeys ---`);
  
  // Verify that all 12 questions and answer keys can be read back
  console.log('--- VERIFYING FIRESTORE DATA ---');
  let verifiedCount = 0;
  for (const q of sanitizedQuestions) {
    const qDoc = await getDoc(doc(db, 'questions', q.id));
    const akDoc = await getDoc(doc(db, 'answerKeys', q.id));
    if (qDoc.exists() && akDoc.exists()) {
      verifiedCount++;
      console.log(`Verified ${q.id}: Type=${qDoc.data().type}, CorrectAnswer=${JSON.stringify(akDoc.data().correctAnswer)}`);
    } else {
      console.error(`FAILED verification for ${q.id}: qExists=${qDoc.exists()}, akExists=${akDoc.exists()}`);
    }
  }

  console.log(`--- VERIFICATION FINISHED: ${verifiedCount}/12 verified successfully ---`);
}

seedDemoData()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seed fatal error:', err);
    process.exit(1);
  });
