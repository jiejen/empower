import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';

import { getFirestore } from "firebase/firestore";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD6gQFv9fh5aNfQqn-tl7k2MZZwzMw4DzM",
  authDomain: "cs-4347.firebaseapp.com",
  projectId: "cs-4347",
  storageBucket: "cs-4347.firebasestorage.app",
  messagingSenderId: "858199745674",
  appId: "1:858199745674:web:5fd977ffc2cafe12797973",
  measurementId: "G-D89NRXFC1Z"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Set persistence to LOCAL so user stays logged in after page refresh
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error("Error setting persistence:", error);
});

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

export default app;