// =============================================
// FLOURISHLY - AUTHENTICATION MODULE
// =============================================

let currentUser = null;

// DOM References
function getAuthElements() {
    return {
        authScreen: document.getElementById('authScreen'),
        appContainer: document.getElementById('app'),
        loginForm: document.getElementById('loginForm'),
        registerForm: document.getElementById('registerForm'),
        resetForm: document.getElementById('resetForm'),
        authError: document.getElementById('authError'),
        authTabs: document.querySelectorAll('.auth-tab'),
        userMenuBtn: document.getElementById('userMenuBtn'),
        userMenuDropdown: document.getElementById('userMenuDropdown'),
        userDisplayName: document.getElementById('userDisplayName'),
        userDisplayEmail: document.getElementById('userDisplayEmail')
    };
}

// Show/hide auth screen vs app
function showAuthScreen() {
    document.getElementById('authScreen').style.display = 'flex';
    document.getElementById('app').style.display = 'none';
}

function showApp() {
    document.getElementById('authScreen').style.display = 'none';
    document.getElementById('app').style.display = 'flex';
}

// Switch between login/register/reset tabs
function switchAuthTab(tab) {
    // Update tab buttons
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    const activeTab = document.querySelector(`.auth-tab[data-tab="${tab}"]`);
    if (activeTab) activeTab.classList.add('active');

    // Show/hide forms
    document.getElementById('loginForm').style.display = tab === 'login' ? 'block' : 'none';
    document.getElementById('registerForm').style.display = tab === 'register' ? 'block' : 'none';
    document.getElementById('resetForm').style.display = tab === 'reset' ? 'block' : 'none';

    // Clear errors
    clearAuthError();
}

function showAuthError(message) {
    const el = document.getElementById('authError');
    el.textContent = message;
    el.style.display = 'block';
}

function clearAuthError() {
    const el = document.getElementById('authError');
    el.textContent = '';
    el.style.display = 'none';
}

function setAuthLoading(button, loading) {
    if (loading) {
        button.dataset.originalText = button.textContent;
        button.textContent = 'Please wait...';
        button.disabled = true;
    } else {
        button.textContent = button.dataset.originalText || button.textContent;
        button.disabled = false;
    }
}

// ========== FIREBASE CHECK ==========
function checkFirebase() {
    if (!auth) {
        showAuthError('Firebase Authentication is not available. Please enable it in your Firebase Console under Authentication > Sign-in method.');
        return false;
    }
    return true;
}

// ========== EMAIL/PASSWORD LOGIN ==========
async function loginWithEmail() {
    if (!checkFirebase()) return;

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const btn = document.querySelector('#loginForm .auth-submit-btn');

    if (!email || !password) {
        showAuthError('Please enter your email and password.');
        return;
    }

    clearAuthError();
    setAuthLoading(btn, true);

    try {
        await auth.signInWithEmailAndPassword(email, password);
        // Auth state observer will handle the rest
    } catch (error) {
        handleAuthError(error);
    } finally {
        setAuthLoading(btn, false);
    }
}

// ========== EMAIL/PASSWORD REGISTER ==========
async function registerWithEmail() {
    if (!checkFirebase()) return;

    const name = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirmPassword').value;
    const btn = document.querySelector('#registerForm .auth-submit-btn');

    if (!name || !email || !password) {
        showAuthError('Please fill in all fields.');
        return;
    }

    if (password.length < 6) {
        showAuthError('Password must be at least 6 characters.');
        return;
    }

    if (password !== confirmPassword) {
        showAuthError('Passwords do not match.');
        return;
    }

    clearAuthError();
    setAuthLoading(btn, true);

    try {
        const credential = await auth.createUserWithEmailAndPassword(email, password);
        // Update display name
        await credential.user.updateProfile({ displayName: name });

        // Store name in Firestore user profile too
        await firestore.collection('users').doc(credential.user.uid).set({
            displayName: name,
            email: email,
            createdAt: Date.now()
        }, { merge: true });

    } catch (error) {
        handleAuthError(error);
    } finally {
        setAuthLoading(btn, false);
    }
}

// ========== GOOGLE SIGN-IN ==========
async function loginWithGoogle() {
    if (!checkFirebase()) return;

    clearAuthError();
    try {
        await auth.signInWithPopup(googleProvider);
    } catch (error) {
        if (error.code !== 'auth/popup-closed-by-user') {
            handleAuthError(error);
        }
    }
}

// ========== PASSWORD RESET ==========
async function resetPassword() {
    const email = document.getElementById('resetEmail').value.trim();
    const btn = document.querySelector('#resetForm .auth-submit-btn');

    if (!email) {
        showAuthError('Please enter your email address.');
        return;
    }

    clearAuthError();
    setAuthLoading(btn, true);

    try {
        await auth.sendPasswordResetEmail(email);
        showAuthError(''); // clear
        const msg = document.getElementById('authError');
        msg.textContent = 'Password reset email sent! Check your inbox.';
        msg.style.display = 'block';
        msg.style.color = '#4CAF50';
        msg.style.background = 'rgba(76, 175, 80, 0.1)';
        msg.style.borderColor = '#4CAF50';
    } catch (error) {
        handleAuthError(error);
    } finally {
        setAuthLoading(btn, false);
    }
}

// ========== SIGN OUT ==========
async function signOut() {
    try {
        await db.logAudit('logout', {});
        await auth.signOut();
        closeUserMenu();
    } catch (error) {
        console.error('Sign out error:', error);
    }
}

// ========== USER AVATAR ==========
function updateUserAvatar(user) {
    const avatarEl = document.getElementById('userAvatar');
    if (!avatarEl) return;

    if (user.photoURL) {
        // User has a profile photo (e.g. from Google sign-in)
        avatarEl.innerHTML = `<img src="${user.photoURL}" alt="Profile" referrerpolicy="no-referrer">`;
    } else if (user.displayName) {
        // Show initial
        const initial = user.displayName.charAt(0).toUpperCase();
        avatarEl.innerHTML = `<div class="user-avatar-initial">${initial}</div>`;
    }
    // Otherwise keep the default SVG icon
}

// ========== USER MENU ==========
function toggleUserMenu() {
    const dropdown = document.getElementById('userMenuDropdown');
    dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
}

function closeUserMenu() {
    const dropdown = document.getElementById('userMenuDropdown');
    if (dropdown) dropdown.style.display = 'none';
}

// Close menu when clicking outside
document.addEventListener('click', (e) => {
    const menu = document.getElementById('userMenuBtn');
    const dropdown = document.getElementById('userMenuDropdown');
    if (menu && dropdown && !menu.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.style.display = 'none';
    }
});

// ========== ERROR HANDLING ==========
function handleAuthError(error) {
    const messages = {
        'auth/user-not-found': 'No account found with this email.',
        'auth/wrong-password': 'Incorrect password.',
        'auth/email-already-in-use': 'An account with this email already exists.',
        'auth/weak-password': 'Password should be at least 6 characters.',
        'auth/invalid-email': 'Please enter a valid email address.',
        'auth/too-many-requests': 'Too many attempts. Please try again later.',
        'auth/network-request-failed': 'Network error. Check your connection.',
        'auth/popup-blocked': 'Popup blocked. Please allow popups for this site.',
        'auth/invalid-credential': 'Invalid email or password.'
    };

    const msg = messages[error.code] || error.message || 'An error occurred. Please try again.';
    showAuthError(msg);
}

// ========== AUTH STATE OBSERVER ==========
// This is the core listener — it fires on page load and on every auth state change
if (auth) {
    auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user;
        // Initialize database with user ID
        await db.init(user.uid);

        // Check if user is suspended
        const profile = await db.getUserProfile();
        if (profile && profile.suspended) {
            showAuthError('Your account has been suspended. Please contact support.');
            await auth.signOut();
            return;
        }

        // Ensure user profile exists with basic info (created on every login to keep data fresh)
        const profileUpdate = {
            email: user.email || '',
            displayName: user.displayName || ''
        };

        // Set up superadmin for yash@yashvarma.com (first time only)
        if (user.email === 'yash@yashvarma.com' && (!profile || profile.role !== 'superadmin')) {
            profileUpdate.role = 'superadmin';
            console.log('Setting superadmin role for:', user.email);
        }

        // Set createdAt for new users
        if (!profile) {
            profileUpdate.createdAt = Date.now();
        }

        await db.updateUserProfile(profileUpdate);

        // Record login activity
        await db.recordLogin();

        // Update user menu
        const nameEl = document.getElementById('userDisplayName');
        const emailEl = document.getElementById('userDisplayEmail');
        if (nameEl) nameEl.textContent = user.displayName || 'User';
        if (emailEl) emailEl.textContent = user.email || '';

        // Update user avatar in header
        updateUserAvatar(user);

        // Also save user name to localStorage for the greeting
        if (user.displayName) {
            localStorage.setItem('userName', user.displayName);
        }

        // Show main app
        showApp();

        // Initialize the app (same logic as the old DOMContentLoaded)
        await initializeApp();

        // Check and show admin dashboard button if user is admin
        console.log('Checking admin status...');
        await checkAndShowAdminButton();
    } else {
        currentUser = null;
        showAuthScreen();
    }
    });
} else {
    // Firebase failed to load — show auth screen with error
    console.error('Firebase auth not available');
    document.addEventListener('DOMContentLoaded', () => {
        showAuthScreen();
    });
}

// ========== APP INITIALIZATION (called after auth) ==========
async function initializeApp() {
    currentEntryDate = new Date();
    loadUserSettings();
    updateWelcomeGreeting();
    checkUpcomingBirthdays();

    // Set mode without triggering view renders yet (no screen is active)
    const savedMode = localStorage.getItem('currentMode') || 'grateful';
    currentMode = savedMode;
    localStorage.setItem('currentMode', savedMode);

    // Update mode toggle buttons
    document.querySelectorAll('.mode-toggle-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    const activeBtn = document.querySelector(`.mode-toggle-btn[data-mode="${savedMode}"]`);
    if (activeBtn) activeBtn.classList.add('active');

    // Apply mode class
    const app = document.getElementById('app');
    app.classList.remove('mode-grateful', 'mode-better');
    app.classList.add(`mode-${savedMode}`);

    document.title = savedMode === 'better'
        ? 'Flourishly - 1% Better'
        : 'Flourishly - Grateful';

    updateStreakDisplay();

    // Always start on history screen with month view and today's date selected
    localStorage.setItem('hasVisitedBefore', 'true');
    currentView = 'month';
    showScreen('history');

    updateDateDisplay();
    initializeSuggestions();
}

// Allow Enter key to submit forms
document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const resetForm = document.getElementById('resetForm');

    if (loginForm && loginForm.style.display !== 'none' && loginForm.contains(e.target)) {
        e.preventDefault();
        loginWithEmail();
    } else if (registerForm && registerForm.style.display !== 'none' && registerForm.contains(e.target)) {
        e.preventDefault();
        registerWithEmail();
    } else if (resetForm && resetForm.style.display !== 'none' && resetForm.contains(e.target)) {
        e.preventDefault();
        resetPassword();
    }
});
