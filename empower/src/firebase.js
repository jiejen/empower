import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

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
export default app;