import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyBXNuzf6Pxz9JmUVZKNS9mGO1O-GNlr-hs",
  authDomain: "whispr-86139.firebaseapp.com",
  projectId: "whispr-86139",
  storageBucket: "whispr-86139.firebasestorage.app",
  messagingSenderId: "103507389557",
  appId: "1:103507389557:web:0747c5e78d04e76e021c3c",
  measurementId: "G-VS34R3ZZVR"
};
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const provider = new GoogleAuthProvider();