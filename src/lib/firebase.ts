import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import staticConfig from '../../firebase-applet-config.json';

// Support overriding via VITE_ env variables for custom self-hosted setups (like Cloudflare Workers, Vercel, Netlify)
const metaEnv = (import.meta as any).env || {};

const firebaseConfig = {
  apiKey: metaEnv.VITE_FIREBASE_API_KEY || staticConfig.apiKey,
  authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN || staticConfig.authDomain,
  projectId: metaEnv.VITE_FIREBASE_PROJECT_ID || staticConfig.projectId,
  storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET || staticConfig.storageBucket,
  messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || staticConfig.messagingSenderId,
  appId: metaEnv.VITE_FIREBASE_APP_ID || staticConfig.appId,
  measurementId: metaEnv.VITE_FIREBASE_MEASUREMENT_ID || staticConfig.measurementId || "",
};

const app = initializeApp(firebaseConfig);
const databaseId = metaEnv.VITE_FIREBASE_FIRESTORE_DB_ID || staticConfig.firestoreDatabaseId;

export const db = getFirestore(app, databaseId);
export const auth = getAuth(app);
