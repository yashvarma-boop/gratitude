// =============================================
// FIREBASE CONFIGURATION
// =============================================
// To set up Firebase for Flourishly:
// 1. Go to https://console.firebase.google.com/
// 2. Create a new project (e.g., "flourishly")
// 3. In Project Settings, add a Web App
// 4. Copy your config values below
// 5. Enable Authentication: Email/Password + Google sign-in
// 6. Enable Cloud Firestore (start in test mode, then add rules)
// =============================================

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries



// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDumWfmbSqwGbAmzCpUjTLVU6qic8Hpu1Q",
  authDomain: "flourishly-67bd1.firebaseapp.com",
  projectId: "flourishly-67bd1",
  storageBucket: "flourishly-67bd1.firebasestorage.app",
  messagingSenderId: "861477808589",
  appId: "1:861477808589:web:adf3a1abdd5896e6b47c84",
  measurementId: "G-179V9WEP3P"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize services
const auth = firebase.auth();
const firestore = firebase.firestore();

// Enable offline persistence for Firestore
firestore.enablePersistence({ synchronizeTabs: true })
    .catch((err) => {
        if (err.code === 'failed-precondition') {
            console.warn('Firestore persistence failed: multiple tabs open');
        } else if (err.code === 'unimplemented') {
            console.warn('Firestore persistence not supported in this browser');
        }
    });

// Google Auth Provider
const googleProvider = new firebase.auth.GoogleAuthProvider();
