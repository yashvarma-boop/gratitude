// =============================================
// FIREBASE CONFIGURATION
// =============================================

var auth = null;
var firestore = null;
var googleProvider = null;

try {
    if (typeof firebase === 'undefined') {
        throw new Error('Firebase SDK not loaded. Are you opening this file directly? Use a web server instead.');
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

    // Enable offline persistence
    firestore.enablePersistence({ synchronizeTabs: true })
        .catch((err) => {
            if (err.code === 'failed-precondition') {
                console.warn('Firestore persistence failed: multiple tabs open');
            } else if (err.code === 'unimplemented') {
                console.warn('Firestore persistence not supported in this browser');
            }
        });

    googleProvider = new firebase.auth.GoogleAuthProvider();
    console.log('Firebase initialized successfully');

} catch (e) {
    console.error('Firebase init error:', e);
    document.addEventListener('DOMContentLoaded', () => {
        document.body.innerHTML = '<div style="padding:40px;text-align:center;font-family:sans-serif;">' +
            '<h2 style="color:#333;">Flourishly - Setup Error</h2>' +
            '<p style="color:#666;margin:16px 0;">' + e.message + '</p>' +
            '<p style="color:#999;font-size:14px;">Make sure you are serving this via a web server (not file://)<br>' +
            'Try: <code>python3 -m http.server 8080</code> then open <code>http://localhost:8080</code></p></div>';
    });
}
