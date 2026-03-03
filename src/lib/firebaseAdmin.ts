import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";

/**
 * Server-side Firebase Admin SDK initialization.
 * Uses the GOOGLE_APPLICATION_CREDENTIALS env var for service account auth,
 * or falls back to projectId-only init (for environments where the service
 * account is provided implicitly, e.g. Cloud Run, Vercel with env vars).
 */
let adminApp: App;

if (!getApps().length) {
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (serviceAccountKey) {
    // Parse the JSON service account key from env var
    const serviceAccount = JSON.parse(serviceAccountKey);
    adminApp = initializeApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.project_id,
    });
  } else {
    // Fallback: initialize with just projectId (for local dev with ADC or
    // environments where credentials are provided implicitly)
    adminApp = initializeApp({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });
  }
} else {
  adminApp = getApps()[0];
}

export const adminDb: Firestore = getFirestore(adminApp);
export { adminApp };
