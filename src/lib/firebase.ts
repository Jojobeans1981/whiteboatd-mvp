// src/lib/firebase.ts

import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// INSTRUCTIONS: Replace with your Firebase config from Firebase Console
// Go to: Firebase Console > Project Settings > Your apps > Config
const firebaseConfig = {
  apiKey: "AIzaSyCNlIrQ06m6F83iu-2oc8G2qPRNI7JnXs0",
  authDomain: "whitboard-mvp-jlp.firebaseapp.com",
  projectId: "whitboard-mvp-jlp",
  storageBucket: "whitboard-mvp-jlp.firebasestorage.app",
  messagingSenderId: "214882383646",
  appId: "1:214882383646:web:d77b570f673a776acdfb0f"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

export default app;
