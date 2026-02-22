import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyBYHbfPJdQP3x4MBG8X7T755cQDoqhLdC0",
  authDomain: "pathsynch1.firebaseapp.com",
  projectId: "pathsynch1",
  storageBucket: "pathsynch1.firebasestorage.app",
  messagingSenderId: "1037752698806",
  appId: "1:1037752698806:web:7f4e8eb4b5e2f4a5"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export default app;
