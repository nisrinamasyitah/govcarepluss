import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBKXnHNnrw3ZCYes-vWDUv2qzEb8ITDbrk",
  authDomain: "govcarepluss.firebaseapp.com",
  projectId: "govcarepluss",
  storageBucket: "govcarepluss.firebasestorage.app",
  messagingSenderId: "803966400307",
  appId: "1:803966400307:web:e5f65ea05b976ce107f046",
  measurementId: "G-6CCR710Q96"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth           = getAuth(app);
export const db             = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
