// =============================================
// FIREBASE CONFIGURATION (compat SDK)
// =============================================
// IMPORTANT: We use the Firebase compat SDK loaded via <script> tags
// in index.html. Do NOT use import statements here.
// =============================================

var auth = null;
var firestore = null;
var googleProvider = null;

try {
    if (typeof firebase === 'undefined') {
        throw new Error('Firebase SDK not loaded. Check your internet connection or make sure you are not opening this as a file:// URL.');
    }

    const firebaseConfig = {
        apiKey: "AIzaSyDumWfmbSqwGbAmzCpUjTLVU6qic8Hpu1Q",
        authDomain: "flourishly-67bd1.firebaseapp.com",
        projectId: "flourishly-67bd1",
        storageBucket: "flourishly-67bd1.firebasestorage.app",
        messagingSenderId: "861477808589",
        appId: "1:861477808589:web:adf3a1abdd5896e6b47c84",
        measurementId: "G-179V9WEP3P"
    };

    firebase.initializeApp(firebaseConfig);

    auth = firebase.auth();
    firestore = firebase.firestore();
    googleProvider = new firebase.auth.GoogleAuthProvider();

    // Enable offline persistence
    firestore.enablePersistence({ synchronizeTabs: true })
        .catch(function(err) {
            if (err.code === 'failed-precondition') {
                console.warn('Firestore persistence failed: multiple tabs open');
            } else if (err.code === 'unimplemented') {
                console.warn('Firestore persistence not supported in this browser');
            }
        });

    console.log('Firebase initialized successfully');

} catch (e) {
    console.error('Firebase init error:', e);
    document.addEventListener('DOMContentLoaded', function() {
        var errDiv = document.getElementById('authError');
        if (errDiv) {
            errDiv.textContent = 'Firebase error: ' + e.message;
            errDiv.style.display = 'block';
        }
    });
}
