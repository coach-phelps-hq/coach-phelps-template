#!/usr/bin/env node
/**
 * build-data.mjs — Pre-build script that merges data/ files into client/src/data/
 * for Vite to bundle.
 *
 * Reads:
 *   data/history/*.json    → client/src/data/activities.json (sorted newest-first)
 *   data/challenge_v2.json   → client/src/data/challenge_v2.json (copy)
 *   data/templates/*.json  → client/src/data/workouts.json  (templates + sessions merged)
 *   data/sessions/*.json   → merged into workouts.json (session overrides template for same date+id)
 *
 * Run before `vite build` or `vite dev`.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../..");
const OUT_DIR = path.join(REPO_ROOT, "ui", "client", "src", "data");

// Ensure output dir exists
fs.mkdirSync(OUT_DIR, { recursive: true });

// 1. Merge history/*.json → activities.json
const historyDir = path.join(REPO_ROOT, "training", "history");
const outPath = path.join(OUT_DIR, "activities.json");
if (fs.existsSync(historyDir)) {
  const files = fs.readdirSync(historyDir).filter((f) => f.endsWith(".json"));

  if (files.length === 0) {
    // history/ exists but has no JSON files (e.g. Netlify build — only .gitkeep present).
    // Keep the committed activities.json rather than overwriting with an empty array.
    console.log(`✓ activities.json — no local history files, keeping committed version`);
  } else {
    const activities = [];
    for (const file of files) {
      try {
        const raw = fs.readFileSync(path.join(historyDir, file), "utf-8");
        const data = JSON.parse(raw);
        activities.push(data);
      } catch (e) {
        console.warn(`⚠ Skipping ${file}: ${e.message}`);
      }
    }
    activities.sort(
      (a, b) =>
        new Date(b.start_date_local).getTime() -
        new Date(a.start_date_local).getTime()
    );
    fs.writeFileSync(outPath, JSON.stringify(activities, null, 0));
    console.log(`✓ activities.json — ${activities.length} activities`);
  }
} else {
  console.warn("⚠ No data/history/ directory found");
}

// 2. Copy challenge_v2.json
const challengeSrc = path.join(REPO_ROOT, "training", "challenge_v2.json");
if (fs.existsSync(challengeSrc)) {
  fs.copyFileSync(challengeSrc, path.join(OUT_DIR, "challenge_v2.json"));
  console.log("✓ challenge_v2.json copied");
} else {
  console.warn("⚠ No data/challenge_v2.json found");
}

// 3. Bundle workout templates and sessions → workouts.json
const templatesDir = path.join(REPO_ROOT, "templates");
const sessionsDir = path.join(REPO_ROOT, "sessions");

const workouts = { templates: [], sessions: [] };

if (fs.existsSync(templatesDir)) {
  const files = fs.readdirSync(templatesDir).filter((f) => f.endsWith(".json"));
  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(templatesDir, file), "utf-8");
      workouts.templates.push(JSON.parse(raw));
    } catch (e) {
      console.warn(`⚠ Skipping template ${file}: ${e.message}`);
    }
  }
  console.log(`✓ ${workouts.templates.length} workout templates loaded`);
} else {
  console.warn("⚠ No data/templates/ directory found");
}

if (fs.existsSync(sessionsDir)) {
  const files = fs.readdirSync(sessionsDir).filter((f) => f.endsWith(".json"));
  // Only bundle sessions from the last 7 days to keep the client bundle small
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 7);
  const cutoff = cutoffDate.toISOString().slice(0, 10);
  let skippedOld = 0;

  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(sessionsDir, file), "utf-8");
      const session = JSON.parse(raw);
      if (session.session_date && session.session_date < cutoff) {
        skippedOld++;
        continue;
      }
      workouts.sessions.push(session);
    } catch (e) {
      console.warn(`⚠ Skipping session ${file}: ${e.message}`);
    }
  }
  // Sort sessions newest first by session_date
  workouts.sessions.sort((a, b) => (b.session_date ?? "").localeCompare(a.session_date ?? ""));
  console.log(`✓ ${workouts.sessions.length} workout sessions loaded (${skippedOld} older than 7d pruned)`);
} else {
  console.warn("⚠ No data/sessions/ directory found");
}

const workoutsPath = path.join(OUT_DIR, "workouts.json");
fs.writeFileSync(workoutsPath, JSON.stringify(workouts, null, 2));
console.log("✓ workouts.json written");

// 4. Copy sync_status.json (if exists)
const syncStatusSrc = path.join(REPO_ROOT, "training", "sync_status.json");
if (fs.existsSync(syncStatusSrc)) {
  fs.copyFileSync(syncStatusSrc, path.join(OUT_DIR, "sync_status.json"));
  console.log("✓ sync_status.json copied");
} else {
  // Write a default so the import doesn't fail
  fs.writeFileSync(
    path.join(OUT_DIR, "sync_status.json"),
    JSON.stringify({ status: "none", timestamp: null, activities_synced: 0, activities_renamed: 0, descriptions_parsed: 0, warnings: [] }) + "\n"
  );
  console.log("✓ sync_status.json — no data, wrote default");
}

console.log("✓ Data build complete");
