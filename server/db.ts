import * as admin from 'firebase-admin';
import dotenv from 'dotenv';
dotenv.config();

let db: admin.firestore.Firestore;

try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('Firebase Admin initialized successfully.');
  } else {
    console.warn('⚠️ FIREBASE_SERVICE_ACCOUNT is not set. Please add your service account JSON to the environment variables.');
    // Initialize without credentials for build purposes (will fail on actual read/write)
    admin.initializeApp({ projectId: 'demo-project' });
  }
  db = admin.firestore();
} catch (error) {
  console.error('Error initializing Firebase Admin:', error);
  db = admin.firestore();
}

export { db };

// Helper functions to replace SQLite queries with Firestore operations
export async function getUser(userId: number) {
  const doc = await db.collection('users').doc(userId.toString()).get();
  return doc.exists ? doc.data() : null;
}

export async function updateUser(userId: number, data: any) {
  await db.collection('users').doc(userId.toString()).set(data, { merge: true });
}

export async function createApplication(data: any) {
  const docRef = await db.collection('applications').add({
    ...data,
    created_at: admin.firestore.FieldValue.serverTimestamp(),
    status: 'pending'
  });
  return docRef.id;
}

export async function getApplications(): Promise<any[]> {
  const snapshot = await db.collection('applications').orderBy('created_at', 'desc').get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function updateApplicationStatus(appId: string, status: string) {
  await db.collection('applications').doc(appId).update({ status });
}

export async function getStats() {
  const usersSnapshot = await db.collection('users').count().get();
  const appsSnapshot = await db.collection('applications').count().get();
  
  const pendingSnapshot = await db.collection('applications').where('status', '==', 'pending').count().get();
  const approvedSnapshot = await db.collection('applications').where('status', '==', 'approved').count().get();
  const rejectedSnapshot = await db.collection('applications').where('status', '==', 'rejected').count().get();
  
  // For today's apps, we need a date range query
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const todayAppsSnapshot = await db.collection('applications')
    .where('created_at', '>=', admin.firestore.Timestamp.fromDate(startOfDay))
    .count().get();

  // For funnel, we need to aggregate by step
  const users = await db.collection('users').get();
  const stepCounts: Record<number, number> = {};
  users.forEach(doc => {
    const step = doc.data().step || 0;
    stepCounts[step] = (stepCounts[step] || 0) + 1;
  });
  const funnel = Object.entries(stepCounts).map(([step, count]) => ({ step: Number(step), count })).sort((a, b) => a.step - b.step);

  return {
    totalUsers: usersSnapshot.data().count,
    totalApps: appsSnapshot.data().count,
    todayApps: todayAppsSnapshot.data().count,
    pendingApps: pendingSnapshot.data().count,
    approvedApps: approvedSnapshot.data().count,
    rejectedApps: rejectedSnapshot.data().count,
    funnel
  };
}

export async function clearData() {
  const users = await db.collection('users').get();
  const apps = await db.collection('applications').get();
  
  const batch = db.batch();
  users.docs.forEach(doc => batch.delete(doc.ref));
  apps.docs.forEach(doc => batch.delete(doc.ref));
  
  await batch.commit();
}

export async function getBotTexts() {
  const doc = await db.collection('settings').doc('bot_texts').get();
  if (doc.exists) {
    return doc.data();
  }
  return null;
}

export async function updateBotTexts(texts: any) {
  await db.collection('settings').doc('bot_texts').set(texts, { merge: true });
}

export function initDb() {
  // No-op for Firestore
}
