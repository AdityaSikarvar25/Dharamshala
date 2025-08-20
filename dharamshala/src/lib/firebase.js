// Firebase initialization kept in a single place for reuse across the app
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// You can move these to environment variables if you prefer (Vite prefix: VITE_*)
const firebaseConfig = {
  apiKey: "AIzaSyDhzHQXw-XxxpKrBGr_RuG8FyJaAkOGKg8",
  authDomain: "dharamshala-6a25e.firebaseapp.com",
  projectId: "dharamshala-6a25e",
  storageBucket: "dharamshala-6a25e.appspot.com",
  messagingSenderId: "596835846095",
  appId: "1:596835846095:web:61961941b000c00ef6f4ba",
  measurementId: "G-M6E1X808LP",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);


