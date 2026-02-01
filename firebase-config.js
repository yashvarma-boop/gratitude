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

const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
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
