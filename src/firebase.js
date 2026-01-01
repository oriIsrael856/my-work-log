 
  
  

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// --- כאן תדביק את הנתונים שהעתקת מ-Firebase ---
const firebaseConfig = {
  apiKey: "AIzaSyDTHXQ0JGmBJpLkZYLHXmi4_IUcKvfWEEA",
  authDomain: "work-log-app-a0c13.firebaseapp.com",
  projectId: "work-log-app-a0c13",
  storageBucket: "work-log-app-a0c13.firebasestorage.app",
  messagingSenderId: "291243663982",
  appId: "1:291243663982:web:8786a756c943b1a8f53c7f",
  measurementId: "G-TEBRN2S1K4"
};
// ------------------------------------------------

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);