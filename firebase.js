const admin = require("firebase-admin");

const firebaseProjectId = process.env.FIREBASE_PROJECT_ID || "";
const firebaseClientEmail = process.env.FIREBASE_CLIENT_EMAIL || "";
function normalizePrivateKey(raw) {
  let key = String(raw || "").trim();
  if (!key) return "";

  // Render/env UIs often wrap multiline keys in JSON-like quotes.
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1);
  }
  key = key.replace(/\\n/g, "\n");

  // Support base64-encoded PEM values as fallback.
  if (!key.includes("BEGIN PRIVATE KEY")) {
    try {
      const decoded = Buffer.from(key, "base64").toString("utf8");
      if (decoded.includes("BEGIN PRIVATE KEY")) key = decoded;
    } catch {
      // keep original
    }
  }
  return key;
}

const firebasePrivateKey = normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY || "");

const hasFirebaseConfig = !!(firebaseProjectId && firebaseClientEmail && firebasePrivateKey);

if (!admin.apps.length) {
  if (hasFirebaseConfig) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: firebaseProjectId,
          clientEmail: firebaseClientEmail,
          privateKey: firebasePrivateKey
        })
      });
    } catch (err) {
      // Keep process alive so logs surface root cause while allowing fallback flows.
      console.error("[Firebase] Admin init with cert failed:", err?.message || err);
      admin.initializeApp();
    }
  } else {
    admin.initializeApp();
  }
}

const db = admin.firestore();

module.exports = {
  admin,
  db,
  hasFirebaseConfig,
  firebaseProjectId
};
