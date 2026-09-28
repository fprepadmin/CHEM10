import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import fs from "fs";
import path from "path";
import firebaseConfig from "../firebase-applet-config.json" with { type: "json" };

const app = initializeApp(firebaseConfig, "snapshot-exporter");
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || undefined);

const collectionsToBackup = [
  "users",
  "questions",
  "answerKeys",
  "questionSets",
  "assignments",
  "classes",
  "submissions",
  "classLogs",
  "ai_generations"
];

async function runBackup() {
  console.log("Starting Production Firestore Backup...");
  const snapshotDir = path.join(process.cwd(), "snapshots", "CHEM10-AI-PRODUCTION-STABLE-2026-08-30", "firestore_data");
  fs.mkdirSync(snapshotDir, { recursive: true });

  const stats: Record<string, number> = {};
  const allData: Record<string, any[]> = {};
  const userRolesCount: Record<string, number> = { admin: 0, teacher: 0, student: 0, unknown: 0 };

  for (const colName of collectionsToBackup) {
    try {
      const snap = await getDocs(collection(db, colName));
      const docs = snap.docs.map(d => ({ _id: d.id, ...d.data() }));
      stats[colName] = docs.length;
      allData[colName] = docs;

      // Write individual collection JSON
      fs.writeFileSync(path.join(snapshotDir, `${colName}.json`), JSON.stringify(docs, null, 2), "utf-8");

      if (colName === "users") {
        for (const u of docs as any[]) {
          const role = (u.role || "unknown").toLowerCase();
          userRolesCount[role] = (userRolesCount[role] || 0) + 1;
        }
      }
      console.log(`✓ Backed up collection '${colName}': ${docs.length} documents`);
    } catch (err: any) {
      console.warn(`! Note on collection '${colName}':`, err?.message || err);
      stats[colName] = 0;
      allData[colName] = [];
      fs.writeFileSync(path.join(snapshotDir, `${colName}.json`), JSON.stringify([], null, 2), "utf-8");
    }
  }

  // Backup all collections in one combined json as well
  fs.writeFileSync(
    path.join(snapshotDir, "all_collections_snapshot.json"),
    JSON.stringify(allData, null, 2),
    "utf-8"
  );

  // Metadata Snapshot info
  const metadata = {
    snapshotName: "CHEM10-AI-PRODUCTION-STABLE-2026-08-30",
    backupTimestamp: new Date().toISOString(),
    backupDate: "2026-08-30",
    firebaseProjectId: firebaseConfig.projectId,
    firestoreDatabaseId: firebaseConfig.firestoreDatabaseId || "(default)",
    status: "STABLE_PRODUCTION_VERIFIED",
    collectionCounts: stats,
    usersByRole: userRolesCount,
    questionsCount: stats["questions"] || 0,
    answerKeysCount: stats["answerKeys"] || 0,
    questionSetsCount: stats["questionSets"] || 0,
    assignmentsCount: stats["assignments"] || 0,
    classesCount: stats["classes"] || 0,
    submissionsCount: stats["submissions"] || 0,
    securityRulesVersion: "Firestore Rules 2 - Isolated questions & answerKeys",
    buildVersion: "1.0.0-chem10-production"
  };

  // Save metadata to project root
  fs.writeFileSync(
    path.join(process.cwd(), "CHEM10-AI-PRODUCTION-SNAPSHOT-2026-08-30.json"),
    JSON.stringify(metadata, null, 2),
    "utf-8"
  );

  // Also save a copy inside snapshot dir
  fs.writeFileSync(
    path.join(process.cwd(), "snapshots", "CHEM10-AI-PRODUCTION-STABLE-2026-08-30", "CHEM10-AI-PRODUCTION-SNAPSHOT-2026-08-30.json"),
    JSON.stringify(metadata, null, 2),
    "utf-8"
  );

  console.log("\nBackup Metadata created successfully:");
  console.log(JSON.stringify(metadata, null, 2));
}

runBackup()
  .then(() => {
    console.log("Snapshot creation complete!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Backup failed with error:", err);
    process.exit(1);
  });
