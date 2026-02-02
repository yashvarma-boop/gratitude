// Global State
let currentScreen = 'entry';
let currentFilter = 'all';
let currentSessionId = null;
let currentMediaGallery = [];
let currentMediaIndex = 0;
let isEditMode = false;
let editingSessionId = null;
let currentMode = 'grateful'; // 'grateful' or 'better'
let currentView = 'month';
let calendarDate = new Date();
let weekDate = new Date();
let yearDate = new Date();
let selectedCalendarDate = null; // Tracks which date is selected in the calendar detail pane
let selectedCalendarBirthdays = []; // Birthdays for the selected date
let cameraStream = null;
let mediaRecorder = null;
let recordedChunks = [];
let currentCameraItemId = null;
let selectedChannel = 'sms'; // 'sms' or 'whatsapp'
let itemMediaData = {
    1: [],
    2: [],
    3: []
};

// Gratitude Suggestions - 50 prompts
const gratitudeSuggestions = [
    "A person who made you smile today",
    "Your favorite comfort food",
    "A beautiful sunset or sunrise",
    "A warm bed to sleep in",
    "Access to clean water",
    "Your favorite song or music",
    "A good book you've read",
    "Technology that connects you with loved ones",
    "A kind gesture from a stranger",
    "Your ability to learn new things",
    "The sound of rain or nature",
    "A memorable vacation or trip",
    "Your favorite season of the year",
    "A pet or animal that brings you joy",
    "Your health and physical abilities",
    "A skill or talent you've developed",
    "The opportunity to pursue your dreams",
    "A mentor or teacher who inspired you",
    "Fresh air and the ability to breathe freely",
    "Your favorite hobby or pastime",
    "A moment of laughter today",
    "The roof over your head",
    "Access to education",
    "Your favorite place to relax",
    "A childhood memory that makes you smile",
    "Modern medicine and healthcare",
    "The ability to see, hear, taste, touch, or smell",
    "A friend who always supports you",
    "Your morning coffee or tea ritual",
    "The freedom to make your own choices",
    "A challenge that helped you grow",
    "Your favorite movie or TV show",
    "The changing seasons",
    "A peaceful moment in your day",
    "Your favorite piece of clothing",
    "The ability to express yourself creatively",
    "A favorite childhood toy or game",
    "Access to transportation",
    "Your favorite scent or smell",
    "A kind word someone shared with you",
    "The beauty of flowers or plants",
    "Your imagination and ability to dream",
    "A hot shower or relaxing bath",
    "The gift of time with family",
    "Your favorite form of exercise or movement",
    "A safe place to call home",
    "The ability to forgive and move forward",
    "Your favorite memory from this year",
    "The kindness of others",
    "Simply being alive today"
];

// 1% Better Suggestions - 50 improvement prompts
const betterSuggestions = [
    "A habit you want to build or strengthen",
    "A conversation you've been putting off",
    "One minute more of focus than yesterday",
    "A skill you can practice today",
    "Something you can organize or simplify",
    "A healthier food choice you can make",
    "A relationship you can invest more in",
    "A fear you can take one small step toward facing",
    "A book or article you can spend 10 minutes reading",
    "A way to be more patient today",
    "An extra glass of water you can drink",
    "A negative thought pattern you can catch earlier",
    "A task you can finish instead of leaving halfway",
    "A way to listen more carefully in conversations",
    "Something you can delegate or ask for help with",
    "A few minutes of stretching or movement",
    "A boundary you can set or reinforce",
    "A piece of feedback you can act on",
    "A morning routine step you can add",
    "A distraction you can remove for an hour",
    "A kind word you can say to yourself",
    "A way to show up more prepared today",
    "Something you've been procrastinating on",
    "A way to save a little money today",
    "A new perspective you can try on a problem",
    "A time you can go to bed slightly earlier",
    "A commitment you can follow through on",
    "Something you can learn from a mistake",
    "A way to reduce your screen time today",
    "A small act of discipline you can practice",
    "An email or message you can respond to promptly",
    "A way to be more present in the moment",
    "Something in your environment you can clean up",
    "A deep breath you can take before reacting",
    "A way to encourage someone else today",
    "An assumption you can question",
    "A creative solution you can try",
    "Something you can practice saying no to",
    "A healthier evening routine you can try",
    "A way to be more consistent this week",
    "A small promise to yourself you can keep",
    "A way to express yourself more clearly",
    "Something you can do with more intention",
    "A way to show more gratitude to others",
    "A physical challenge slightly beyond your comfort zone",
    "A way to manage your energy better today",
    "A question you can ask instead of assuming",
    "A way to recover faster from a setback",
    "Something you can do to invest in your future self",
    "A tiny improvement to how you start your day"
];

let currentSuggestions = {
    1: null,
    2: null,
    3: null
};

// Current date being viewed/edited
let currentEntryDate = new Date();

// Apply saved color scheme immediately (before DOMContentLoaded)
const savedColorScheme = localStorage.getItem('colorScheme');
if (savedColorScheme && savedColorScheme !== 'warm-peach') {
    document.documentElement.classList.add(`theme-${savedColorScheme}`);
}

// App initialization is now handled by auth.js -> initializeApp()
// after successful authentication. No DOMContentLoaded init needed here.

// ========== BIRTHDAY REMINDERS ==========

async function checkUpcomingBirthdays() {
    try {
        const upcomingBirthdays = await db.getUpcomingBirthdays(14); // Check next 14 days

        const reminderElement = document.getElementById('birthdayReminder');
        const listElement = document.getElementById('birthdayList');

        if (upcomingBirthdays.length === 0) {
            reminderElement.style.display = 'none';
            return;
        }

        // Build birthday list HTML
        listElement.innerHTML = '';

        upcomingBirthdays.forEach(birthday => {
            const item = document.createElement('div');
            item.className = 'birthday-item';

            let dateText;
            if (birthday.daysUntil === 0) {
                dateText = '<span class="birthday-today">Today!</span>';
            } else if (birthday.daysUntil === 1) {
                dateText = 'Tomorrow';
            } else {
                const options = { weekday: 'short', month: 'short', day: 'numeric' };
                dateText = birthday.birthdayDate.toLocaleDateString('en-AU', options);
            }

            // Always show send message button
            const sendBtn = `<button class="send-birthday-btn-small" onclick="event.stopPropagation(); sendBirthdayMessage('${escapeHtml(birthday.name)}', '${escapeHtml(birthday.phoneNumber)}')" title="Send birthday message">💬</button>`;

            item.innerHTML = `
                <span class="birthday-name">${escapeHtml(birthday.name)}</span>
                <span class="birthday-date-wrapper">
                    ${dateText}
                    ${sendBtn}
                </span>
            `;

            listElement.appendChild(item);
        });

        reminderElement.style.display = 'flex';
    } catch (error) {
        console.error('Error checking birthdays:', error);
    }
}

// Send birthday message - pre-fills the gratitude message screen
function sendBirthdayMessage(name, phoneNumber) {
    // Navigate to send gratitude screen
    showScreen('sendGratitude');
    loadRecipientsList();

    // Pre-fill the phone number
    document.getElementById('recipientPhone').value = phoneNumber;
    document.getElementById('recipientPhone').disabled = true;

    // Try to select from dropdown if exists
    const select = document.getElementById('recipientSelect');
    for (let option of select.options) {
        if (option.value === phoneNumber) {
            select.value = phoneNumber;
            break;
        }
    }

    // Pre-fill birthday message
    const message = `Happy Birthday, ${name}! 🎂🎉 Wishing you all the best on your special day. Hope it's filled with joy, love, and wonderful memories!`;
    document.getElementById('gratitudeMessage').value = message;

    // Update character count
    const charCount = document.getElementById('messageCharCount');
    if (charCount) {
        charCount.textContent = message.length;
    }

    showToast(`Sending birthday wishes to ${name}!`);
}

// Check for monthly birthdays
async function checkMonthlyBirthdays() {
    try {
        const currentMonth = new Date().getMonth() + 1; // 1-12
        const monthlyBirthdays = await db.getBirthdaysForMonth(currentMonth);

        const reminderElement = document.getElementById('monthlyBirthdaysReminder');
        const listElement = document.getElementById('monthlyBirthdaysList');
        const titleElement = document.getElementById('monthlyBirthdaysTitle');

        if (monthlyBirthdays.length === 0) {
            reminderElement.style.display = 'none';
            return;
        }

        // Get month name
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];
        titleElement.textContent = `Birthdays in ${monthNames[currentMonth - 1]}`;

        // Build birthday list HTML
        listElement.innerHTML = '';

        monthlyBirthdays.forEach(contact => {
            const item = document.createElement('div');
            item.className = 'birthday-item';

            const [month, day] = contact.birthday.split('-');
            const dayNum = parseInt(day);
            const suffix = getDaySuffix(dayNum);

            item.innerHTML = `
                <span class="birthday-name">${escapeHtml(contact.name)}</span>
                <span class="birthday-date">${dayNum}${suffix}</span>
            `;

            listElement.appendChild(item);
        });

        reminderElement.style.display = 'flex';
    } catch (error) {
        console.error('Error checking monthly birthdays:', error);
    }
}

function getDaySuffix(day) {
    if (day >= 11 && day <= 13) return 'th';
    switch (day % 10) {
        case 1: return 'st';
        case 2: return 'nd';
        case 3: return 'rd';
        default: return 'th';
    }
}

// ========== GRATITUDE SUGGESTIONS ==========

// Get a random suggestion that hasn't been used for this item
function getRandomSuggestion(itemId, usedSuggestions = []) {
    const pool = currentMode === 'better' ? betterSuggestions : gratitudeSuggestions;
    const available = pool.filter(s => !usedSuggestions.includes(s));
    if (available.length === 0) return pool[Math.floor(Math.random() * pool.length)];
    return available[Math.floor(Math.random() * available.length)];
}

// Initialize suggestions for all items
function initializeSuggestions() {
    const usedSuggestions = [];
    for (let i = 1; i <= 3; i++) {
        const suggestion = getRandomSuggestion(i, usedSuggestions);
        currentSuggestions[i] = suggestion;
        usedSuggestions.push(suggestion);
        document.getElementById(`suggestion-text-${i}`).textContent = suggestion;
    }
}

// Refresh suggestion for a specific item
function refreshSuggestion(itemId) {
    const otherSuggestions = Object.entries(currentSuggestions)
        .filter(([id]) => parseInt(id) !== itemId)
        .map(([, suggestion]) => suggestion);

    const newSuggestion = getRandomSuggestion(itemId, otherSuggestions);
    currentSuggestions[itemId] = newSuggestion;
    document.getElementById(`suggestion-text-${itemId}`).textContent = newSuggestion;
}

// Use suggestion - copy it to the textarea
function useSuggestion(itemId) {
    const textarea = document.querySelector(`textarea[data-item-id="${itemId}"]`);
    const suggestion = currentSuggestions[itemId];

    if (textarea && suggestion) {
        textarea.value = suggestion;
        textarea.focus();
        showToast('Suggestion added! Feel free to customize it.');
    }
}

// ========== HOME BUTTON & WELCOME SCREEN ==========

function goHome() {
    isEditMode = false;
    editingSessionId = null;
    currentEntryDate = new Date(); // Reset to today
    clearForm();
    updateWelcomeGreeting();
    updateStreakDisplay(); // Update streak when going home
    checkUpcomingBirthdays(); // Check for upcoming birthdays
    showScreen('history');
    switchToCalendarView();
}

function startJournaling() {
    updateEntryFormForMode();
    loadEntryForDate(currentEntryDate);
    showScreen('entry');
}

// ========== MODE SWITCHING ==========

function switchMode(mode) {
    currentMode = mode;
    localStorage.setItem('currentMode', mode);

    // Update mode toggle buttons
    document.querySelectorAll('.mode-toggle-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    const activeBtn = document.querySelector(`.mode-toggle-btn[data-mode="${mode}"]`);
    if (activeBtn) activeBtn.classList.add('active');

    // Apply mode class to app container
    const app = document.getElementById('app');
    app.classList.remove('mode-grateful', 'mode-better');
    app.classList.add(`mode-${mode}`);

    // Update logo text
    const logoText = document.querySelector('.logo-text');
    if (logoText) {
        logoText.textContent = 'Flourishly';
    }

    // Update page title
    document.title = mode === 'better'
        ? 'Flourishly - 1% Better'
        : 'Flourishly - Grateful';

    // Update welcome prompt
    const welcomePrompt = document.querySelector('.welcome-prompt');
    if (welcomePrompt) {
        welcomePrompt.textContent = mode === 'better'
            ? 'What will you improve today?'
            : "What's on your heart in this moment?";
    }

    // Update streak display for this mode
    updateStreakDisplay();

    // Reset edit state when switching modes to prevent cross-mode overwrites
    isEditMode = false;
    editingSessionId = null;

    // Re-render current view if on history screen
    if (currentScreen === 'history') {
        if (currentView === 'week') {
            renderWeekView();
        } else if (currentView === 'year') {
            renderYearView();
        } else {
            // Re-render the calendar grid only (skip auto-select, we handle detail pane below)
            renderCalendar(true);

            // Directly refresh the detail pane for the new mode's data
            // This avoids async race conditions from renderCalendar's auto-select
            const dateToShow = selectedCalendarDate || formatDate(new Date());
            openCalendarDate(dateToShow, selectedCalendarBirthdays || []);
        }
    }

    // If on entry screen, clear form, update mode labels, and reload entry for current date in new mode
    if (currentScreen === 'entry') {
        clearForm();
        updateEntryFormForMode();
        updateDateDisplay();
        loadEntryForDate(currentEntryDate);
    }

    // If on detail screen, go back to history since the detail may be for the other mode
    if (currentScreen === 'detail') {
        showScreen('history');
    }

    // If on welcome screen, update greeting for the mode
    if (currentScreen === 'welcome') {
        updateWelcomeGreeting();
    }
}

// Update the entry form labels/placeholders for the current mode
function updateEntryFormForMode() {
    const placeholders = currentMode === 'better'
        ? ['What will you improve by 1% today?', 'Another area to grow in?', 'One more small improvement...']
        : ['What are you grateful for today?', 'What else brought you joy?', 'One more thing to appreciate...'];

    for (let i = 1; i <= 3; i++) {
        const textarea = document.querySelector(`textarea[data-item-id="${i}"]`);
        if (textarea) textarea.placeholder = placeholders[i - 1];
    }

    // Re-initialize suggestions for the new mode
    initializeSuggestions();
}

// ========== USER SETTINGS ==========

function loadUserSettings() {
    const userName = localStorage.getItem('userName') || '';
    const greetingStyle = localStorage.getItem('greetingStyle') || 'auto';
    const colorScheme = localStorage.getItem('colorScheme') || 'warm-peach';

    if (document.getElementById('userNameInput')) {
        document.getElementById('userNameInput').value = userName;
    }
    if (document.getElementById('greetingStyle')) {
        document.getElementById('greetingStyle').value = greetingStyle;
    }
    if (document.getElementById('colorScheme')) {
        document.getElementById('colorScheme').value = colorScheme;
    }

    // Apply saved color scheme
    applyColorScheme(colorScheme);
}

function saveSettings() {
    const userName = document.getElementById('userNameInput').value.trim();
    const greetingStyle = document.getElementById('greetingStyle').value;
    const colorScheme = document.getElementById('colorScheme').value;

    localStorage.setItem('userName', userName);
    localStorage.setItem('greetingStyle', greetingStyle);
    localStorage.setItem('colorScheme', colorScheme);

    updateWelcomeGreeting();
    showToast('Settings saved!');
    goHome();
}

function applyColorScheme(scheme) {
    const root = document.documentElement;

    // Remove all theme classes
    root.classList.remove('theme-lavender-dream', 'theme-mint-fresh', 'theme-sunset-glow', 'theme-ocean-breeze', 'theme-rose-garden');

    // Apply new theme class (except for default warm-peach)
    if (scheme !== 'warm-peach') {
        root.classList.add(`theme-${scheme}`);
    }

    localStorage.setItem('colorScheme', scheme);
}

// ========== STREAK TRACKING ==========

async function calculateStreak() {
    const sessions = await db.getAllSessions(currentMode);

    if (sessions.length === 0) {
        return 0;
    }

    // Sort sessions by date descending
    sessions.sort((a, b) => new Date(b.date) - new Date(a.date));

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const mostRecentSession = new Date(sessions[0].date);
    mostRecentSession.setHours(0, 0, 0, 0);

    // Check if most recent entry is today or yesterday
    const daysDiff = Math.floor((today - mostRecentSession) / (1000 * 60 * 60 * 24));

    if (daysDiff > 1) {
        // Streak broken
        return 0;
    }

    // Calculate consecutive days
    let streak = 1;
    let currentDate = new Date(sessions[0].date);
    currentDate.setHours(0, 0, 0, 0);

    for (let i = 1; i < sessions.length; i++) {
        const sessionDate = new Date(sessions[i].date);
        sessionDate.setHours(0, 0, 0, 0);

        const diff = Math.floor((currentDate - sessionDate) / (1000 * 60 * 60 * 24));

        if (diff === 1) {
            streak++;
            currentDate = sessionDate;
        } else if (diff > 1) {
            break;
        }
    }

    return streak;
}

function getStreakEncouragement(streak) {
    if (streak === 0) {
        return "Start your journey!";
    } else if (streak === 1) {
        return "Great start! Keep going! 🌟";
    } else if (streak === 2) {
        return "Two days strong! 💪";
    } else if (streak === 3) {
        return "Three in a row! You're building a habit! ✨";
    } else if (streak < 7) {
        return "Amazing progress! Keep it up! 🎯";
    } else if (streak === 7) {
        return "One week milestone! Incredible! 🎉";
    } else if (streak < 14) {
        return "You're on fire! Don't stop now! 🔥";
    } else if (streak === 14) {
        return "Two weeks! You're unstoppable! 🚀";
    } else if (streak < 30) {
        return "This is becoming second nature! 🌈";
    } else if (streak === 30) {
        return "30 days! You're a gratitude champion! 👑";
    } else if (streak < 100) {
        return "Legendary dedication! Keep shining! ⭐";
    } else {
        return "You're an inspiration to us all! 💎";
    }
}

async function updateStreakDisplay() {
    const streak = await calculateStreak();
    const streakNumber = document.getElementById('streakNumber');
    const streakLabel = document.getElementById('streakLabel');
    const streakEncouragement = document.getElementById('streakEncouragement');

    if (streakNumber) {
        streakNumber.textContent = streak + '🔥';
    }
    if (streakLabel) {
        streakLabel.textContent = streak === 1 ? 'day streak 🔥' : 'day streak 🔥';
    }
    if (streakEncouragement) {
        streakEncouragement.textContent = getStreakEncouragement(streak);
    }
}

function showSettings() {
    loadUserSettings();
    showScreen('settings');
}

function updateWelcomeGreeting() {
    const userName = localStorage.getItem('userName') || 'Sarah';
    const greetingStyle = localStorage.getItem('greetingStyle') || 'auto';
    const hour = new Date().getHours();

    let timeGreeting = 'Good evening';
    if (greetingStyle === 'auto') {
        if (hour < 12) timeGreeting = 'Good morning';
        else if (hour < 18) timeGreeting = 'Good afternoon';
        else timeGreeting = 'Good evening';
    } else if (greetingStyle === 'morning') {
        timeGreeting = 'Good morning';
    } else if (greetingStyle === 'afternoon') {
        timeGreeting = 'Good afternoon';
    } else if (greetingStyle === 'evening') {
        timeGreeting = 'Good evening';
    } else if (greetingStyle === 'simple') {
        timeGreeting = 'Hello';
    }

    document.getElementById('welcomeGreeting').textContent = `${timeGreeting}, ${userName}.`;
}

// ========== DATE NAVIGATION ==========

// Update date display
function updateDateDisplay() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('todayDate').textContent = currentEntryDate.toLocaleDateString('en-US', options);
}

// Navigate to previous day
function previousDay() {
    currentEntryDate.setDate(currentEntryDate.getDate() - 1);
    clearForm();
    updateDateDisplay();
    loadEntryForDate(currentEntryDate);
    initializeSuggestions();
}

// Navigate to next day
function nextDay() {
    currentEntryDate.setDate(currentEntryDate.getDate() + 1);
    clearForm();
    updateDateDisplay();
    loadEntryForDate(currentEntryDate);
    initializeSuggestions();
}

// Navigate to specific date with offset (for history navigation)
function navigateToDate(date, offset) {
    currentEntryDate = new Date(date);
    currentEntryDate.setDate(currentEntryDate.getDate() + offset);
    showScreen('entry');
    clearForm();
    updateDateDisplay();
    loadEntryForDate(currentEntryDate);
    initializeSuggestions();
}

// Load entry for a specific date (or show blank form)
async function loadEntryForDate(date) {
    const dateStr = formatDate(date);
    const existingSession = await db.getSessionByDate(dateStr, currentMode);

    if (existingSession) {
        // Load existing entry for this date
        const sessionDetails = await db.getSessionWithDetails(existingSession.id);
        loadExistingEntry(sessionDetails);

        // Set edit mode for this session
        isEditMode = true;
        editingSessionId = existingSession.id;
    } else {
        // No entry for this date, show blank form
        isEditMode = false;
        editingSessionId = null;
    }
}

// Load existing entry into form
function loadExistingEntry(sessionDetails) {
    sessionDetails.items.forEach(item => {
        const textarea = document.querySelector(`textarea[data-item-id="${item.itemOrder}"]`);
        if (textarea) {
            textarea.value = item.textContent || '';
        }

        // Load media
        if (item.media && item.media.length > 0) {
            itemMediaData[item.itemOrder] = item.media.map(m => ({
                type: m.mediaType,
                dataUrl: m.dataUrl,
                fileName: m.fileName,
                fileSize: m.fileSize,
                mimeType: m.mimeType
            }));
            renderMediaPreview(item.itemOrder);
        }
    });

    showToast('Entry loaded');
}

// Screen Management
function showScreen(screenName) {
    // Hide all screens
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });

    // Update header
    const archiveBtn = document.getElementById('archiveBtn');
    const homeBtn = document.getElementById('homeBtn');
    const settingsBtn = document.getElementById('settingsBtn');
    const shareBtn = document.getElementById('shareBtn');
    const sendGratitudeBtn = document.getElementById('sendGratitudeBtn');
    const addressBookBtn = document.getElementById('addressBookBtn');

    // Show/hide header elements based on screen
    switch (screenName) {
        case 'welcome':
            document.getElementById('welcomeScreen').classList.add('active');
            archiveBtn.style.display = 'flex';
            homeBtn.style.display = 'none';
            settingsBtn.style.display = 'flex';
            shareBtn.style.display = 'none';
            sendGratitudeBtn.style.display = 'flex';
            addressBookBtn.style.display = 'flex';
            break;
        case 'entry':
            document.getElementById('entryScreen').classList.add('active');
            archiveBtn.style.display = 'none';
            homeBtn.style.display = 'flex';
            settingsBtn.style.display = 'flex';
            shareBtn.style.display = 'none';
            sendGratitudeBtn.style.display = 'flex';
            addressBookBtn.style.display = 'flex';
            break;
        case 'history':
            document.getElementById('historyScreen').classList.add('active');
            archiveBtn.style.display = 'none';
            homeBtn.style.display = 'flex';
            settingsBtn.style.display = 'flex';
            shareBtn.style.display = 'none';
            sendGratitudeBtn.style.display = 'flex';
            addressBookBtn.style.display = 'flex';
            // Render the currently active view
            if (currentView === 'week') renderWeekView();
            else if (currentView === 'year') renderYearView();
            else renderCalendar();
            break;
        case 'settings':
            document.getElementById('settingsScreen').classList.add('active');
            archiveBtn.style.display = 'none';
            homeBtn.style.display = 'flex';
            settingsBtn.style.display = 'flex';
            shareBtn.style.display = 'none';
            sendGratitudeBtn.style.display = 'none';
            addressBookBtn.style.display = 'none';
            break;
        case 'detail':
            document.getElementById('detailScreen').classList.add('active');
            archiveBtn.style.display = 'none';
            homeBtn.style.display = 'flex';
            settingsBtn.style.display = 'flex';
            shareBtn.style.display = 'flex';
            shareBtn.onclick = shareCurrentEntry;
            sendGratitudeBtn.style.display = 'flex';
            addressBookBtn.style.display = 'flex';
            break;
        case 'addressBook':
            document.getElementById('addressBookScreen').classList.add('active');
            archiveBtn.style.display = 'none';
            homeBtn.style.display = 'flex';
            settingsBtn.style.display = 'flex';
            shareBtn.style.display = 'none';
            sendGratitudeBtn.style.display = 'flex';
            addressBookBtn.style.display = 'none';
            break;
        case 'sendGratitude':
            document.getElementById('sendGratitudeScreen').classList.add('active');
            archiveBtn.style.display = 'none';
            homeBtn.style.display = 'flex';
            settingsBtn.style.display = 'flex';
            shareBtn.style.display = 'none';
            sendGratitudeBtn.style.display = 'none';
            addressBookBtn.style.display = 'flex';
            break;
    }

    currentScreen = screenName;
}

// Media Selection
function selectMedia(itemId, mediaType) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = mediaType === 'image' ? 'image/*' : 'video/*';
    input.multiple = true;

    input.onchange = async (e) => {
        const files = Array.from(e.target.files);

        for (const file of files) {
            // Validate file size
            const maxSize = mediaType === 'image' ? 10 * 1024 * 1024 : 50 * 1024 * 1024;
            if (file.size > maxSize) {
                showToast(`File too large. Max size: ${mediaType === 'image' ? '10MB' : '50MB'}`);
                continue;
            }

            // Check if already have 5 media items
            if (itemMediaData[itemId].length >= 5) {
                showToast('Maximum 5 media items per gratitude entry');
                break;
            }

            // Read file as data URL
            const dataUrl = await readFileAsDataURL(file);

            itemMediaData[itemId].push({
                type: mediaType,
                dataUrl,
                fileName: file.name,
                fileSize: file.size,
                mimeType: file.type
            });
        }

        renderMediaPreview(itemId);
    };

    input.click();
}

// Read file as Data URL
function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Render media preview
function renderMediaPreview(itemId) {
    const preview = document.getElementById(`preview-${itemId}`);
    preview.innerHTML = '';

    itemMediaData[itemId].forEach((media, index) => {
        const thumbnail = document.createElement('div');
        thumbnail.className = 'media-thumbnail';

        if (media.type === 'image') {
            const img = document.createElement('img');
            img.src = media.dataUrl;
            thumbnail.appendChild(img);
        } else {
            const video = document.createElement('video');
            video.src = media.dataUrl;
            thumbnail.appendChild(video);

            const playIcon = document.createElement('div');
            playIcon.className = 'video-indicator';
            playIcon.textContent = '▶️';
            thumbnail.appendChild(playIcon);
        }

        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-media';
        removeBtn.textContent = '×';
        removeBtn.onclick = (e) => {
            e.stopPropagation();
            removeMedia(itemId, index);
        };
        thumbnail.appendChild(removeBtn);

        thumbnail.onclick = () => {
            openMediaViewer(itemMediaData[itemId], index);
        };

        preview.appendChild(thumbnail);
    });
}

// Remove media
function removeMedia(itemId, index) {
    itemMediaData[itemId].splice(index, 1);
    renderMediaPreview(itemId);
}

// Save Entry
async function saveEntry() {
    const items = [];
    let hasAnyContent = false;

    // Validate and collect data
    for (let i = 1; i <= 3; i++) {
        const textarea = document.querySelector(`textarea[data-item-id="${i}"]`);
        const text = textarea.value.trim();
        const media = itemMediaData[i] || [];

        // Track if there's any content at all
        if (text || media.length > 0) {
            hasAnyContent = true;
        }

        // Always push the item (even if empty)
        items.push({
            text,
            media
        });
    }

    // At least one item must have content
    if (!hasAnyContent) {
        showToast(currentMode === 'better' ? 'Please add at least one improvement item' : 'Please add at least one gratitude item');
        return;
    }

    try {
        if (isEditMode && editingSessionId) {
            // Update existing session
            const sessionId = editingSessionId;
            await db.updateSession(sessionId, items);
            showToast('✨ Entry updated successfully!');

            // Exit edit mode
            isEditMode = false;
            editingSessionId = null;

            // Return to the previous calendar view
            setTimeout(() => {
                clearForm();
                showScreen('history');
            }, 1000);
        } else {
            const entryDate = formatDate(currentEntryDate);

            // Check if session already exists for this date and mode
            const existing = await db.getSessionByDate(entryDate, currentMode);
            if (existing) {
                // Delete existing session
                await db.deleteSession(existing.id);
            }

            // Create new session for the selected date with current mode type
            await db.createSession(entryDate, items, currentMode);

            showToast('✨ Entry saved successfully!');

            // Update streak display
            updateStreakDisplay();

            // Clear form and return to the previous calendar view
            setTimeout(() => {
                clearForm();
                isEditMode = false;
                editingSessionId = null;
                showScreen('history');
            }, 1000);
        }
    } catch (error) {
        console.error('Save error:', error);
        showToast('Save failed: ' + (error.message || error.code || 'Unknown error'));
    }
}

// Clear form
function clearForm() {
    document.querySelectorAll('.item-input').forEach(input => {
        input.value = '';
    });

    itemMediaData = { 1: [], 2: [], 3: [] };
    [1, 2, 3].forEach(id => renderMediaPreview(id));
}

// Show History
function showHistory() {
    showScreen('history');
}

// Load History
async function loadHistory() {
    const sessions = await db.getAllSessions(currentMode);
    const filtered = db.filterSessionsByDateRange(sessions, currentFilter);

    const entriesList = document.getElementById('entriesList');
    entriesList.innerHTML = '';

    if (filtered.length === 0) {
        entriesList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📝</div>
                <h3>No entries yet</h3>
                <p>Start your gratitude journey today!</p>
            </div>
        `;
        return;
    }

    // Group sessions by date
    const groupedByDate = {};
    for (const session of filtered) {
        const sessionDetails = await db.getSessionWithDetails(session.id);
        const date = new Date(session.sessionDate);
        const dateKey = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

        if (!groupedByDate[dateKey]) {
            groupedByDate[dateKey] = {
                date: date,
                sessions: []
            };
        }
        groupedByDate[dateKey].sessions.push(sessionDetails);
    }

    // Render grouped entries
    Object.values(groupedByDate).forEach(group => {
        const dateGroup = document.createElement('div');
        dateGroup.className = 'history-date-group';

        const dateHeader = document.createElement('div');
        dateHeader.className = 'history-date-header';

        const dateTitle = document.createElement('div');
        dateTitle.className = 'history-date-title';
        const dateOptions = { weekday: 'long', month: 'long', day: 'numeric' };
        dateTitle.textContent = group.date.toLocaleDateString('en-US', dateOptions);
        dateHeader.appendChild(dateTitle);

        const dateSubtitle = document.createElement('div');
        dateSubtitle.className = 'history-date-subtitle';
        const year = group.date.getFullYear();
        dateSubtitle.textContent = year;
        dateHeader.appendChild(dateSubtitle);

        dateGroup.appendChild(dateHeader);

        group.sessions.forEach(session => {
            const card = createHistoryItemCard(session);
            dateGroup.appendChild(card);
        });

        entriesList.appendChild(dateGroup);
    });
}

// Create history item card (for list view)
function createHistoryItemCard(session) {
    const card = document.createElement('div');
    card.className = 'history-item';

    const date = new Date(session.sessionDate);
    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateString = date.toLocaleDateString('en-US', dateOptions);

    // Create header with date and navigation
    const headerDiv = document.createElement('div');
    headerDiv.className = 'history-item-header';
    headerDiv.innerHTML = `
        <button class="history-nav-btn" onclick="navigateToDate(new Date('${session.sessionDate}'), -1); event.stopPropagation();">◀</button>
        <div class="history-item-date">${dateString}</div>
        <button class="history-nav-btn" onclick="navigateToDate(new Date('${session.sessionDate}'), 1); event.stopPropagation();">▶</button>
    `;
    card.appendChild(headerDiv);

    let totalMediaCount = 0;

    // Create preview of first 3 items
    const previewText = session.items.map((item, index) => {
        if (item.media) {
            totalMediaCount += item.media.length;
        }
        const text = item.textContent || '';
        return text;
    }).filter(t => t).slice(0, 1).join(' • ');

    const preview = previewText.length > 120 ? previewText.substring(0, 120) + '...' : previewText;

    const previewDiv = document.createElement('div');
    previewDiv.className = 'history-item-preview';
    previewDiv.textContent = preview || '(Entry with media)';
    card.appendChild(previewDiv);

    if (totalMediaCount > 0) {
        const mediaCount = document.createElement('div');
        mediaCount.className = 'history-item-media-count';
        mediaCount.textContent = `${totalMediaCount} attachment${totalMediaCount > 1 ? 's' : ''}`;
        card.appendChild(mediaCount);
    }

    card.onclick = () => showDetail(session.id);

    return card;
}

// Show detail
async function showDetail(sessionId) {
    currentSessionId = sessionId;
    const session = await db.getSessionWithDetails(sessionId);

    // Switch to detail screen
    showScreen('detail');

    const detailContent = document.getElementById('detailContent');
    detailContent.innerHTML = '';

    // Check for birthdays on this date
    const date = new Date(session.sessionDate + 'T00:00:00');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const birthdayKey = `${month}-${day}`;

    // Get contacts with birthdays on this date
    const allContacts = await db.getAllContacts();
    const birthdaysOnThisDay = allContacts.filter(c => c.birthday === birthdayKey);

    // Show birthday banner if any
    if (birthdaysOnThisDay.length > 0) {
        const birthdayBanner = document.createElement('div');
        birthdayBanner.className = 'detail-birthday-banner';
        birthdayBanner.innerHTML = `
            <div class="birthday-icon">🎂</div>
            <div class="birthday-content">
                <div class="birthday-title">Birthday${birthdaysOnThisDay.length > 1 ? 's' : ''} on this day!</div>
                ${birthdaysOnThisDay.map(c => `
                    <div class="birthday-person">
                        <span>${escapeHtml(c.name)}</span>
                        <button class="send-birthday-btn" onclick="sendBirthdayMessage('${escapeHtml(c.name)}', '${escapeHtml(c.phoneNumber)}')">
                            Send Message 💬
                        </button>
                    </div>
                `).join('')}
            </div>
        `;
        detailContent.appendChild(birthdayBanner);
    }

    // Day navigation arrows
    const navRow = document.createElement('div');
    navRow.className = 'detail-day-nav';

    const prevBtn = document.createElement('button');
    prevBtn.className = 'detail-nav-btn';
    prevBtn.innerHTML = '&#9664;';
    prevBtn.title = 'Previous day';
    prevBtn.onclick = () => navigateDetailDay(session.sessionDate, -1);

    const nextBtn = document.createElement('button');
    nextBtn.className = 'detail-nav-btn';
    nextBtn.innerHTML = '&#9654;';
    nextBtn.title = 'Next day';
    nextBtn.onclick = () => navigateDetailDay(session.sessionDate, 1);

    // Create header with date
    const headerDiv = document.createElement('div');
    headerDiv.className = 'detail-header';

    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateString = date.toLocaleDateString('en-US', dateOptions);

    const dateHeader = document.createElement('div');
    dateHeader.className = 'detail-date';
    dateHeader.textContent = dateString;

    navRow.appendChild(prevBtn);
    navRow.appendChild(dateHeader);
    navRow.appendChild(nextBtn);

    headerDiv.appendChild(navRow);

    const subtitle = document.createElement('div');
    subtitle.className = 'detail-subtitle';
    subtitle.textContent = session.type === 'better' ? 'Your 1% improvements' : 'Your grateful moments';
    headerDiv.appendChild(subtitle);

    detailContent.appendChild(headerDiv);

    // Create items container
    const itemsContainer = document.createElement('div');
    itemsContainer.className = 'detail-items';

    session.items.forEach((item, index) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'detail-item';

        // Item header with number and label
        const itemHeader = document.createElement('div');
        itemHeader.className = 'detail-item-header';

        const itemNumber = document.createElement('div');
        itemNumber.className = 'detail-item-number';
        itemNumber.textContent = index + 1;
        itemHeader.appendChild(itemNumber);

        const itemLabel = document.createElement('div');
        itemLabel.className = 'detail-item-label';
        itemLabel.textContent = session.type === 'better' ? 'Improving' : 'Grateful for';
        itemHeader.appendChild(itemLabel);

        itemDiv.appendChild(itemHeader);

        // Item text
        if (item.textContent) {
            const text = document.createElement('div');
            text.className = 'detail-item-text';
            text.textContent = item.textContent;
            itemDiv.appendChild(text);
        }

        // Item media
        if (item.media && item.media.length > 0) {
            const mediaGrid = document.createElement('div');
            mediaGrid.className = 'detail-media';

            item.media.forEach((media, mediaIndex) => {
                const mediaItem = document.createElement('div');
                mediaItem.className = 'detail-media-item';

                if (media.mediaType === 'image') {
                    const img = document.createElement('img');
                    img.src = media.dataUrl;
                    mediaItem.appendChild(img);
                } else {
                    const video = document.createElement('video');
                    video.src = media.dataUrl;
                    mediaItem.appendChild(video);
                }

                mediaItem.onclick = () => {
                    const allMedia = session.items.flatMap(i => i.media || []);
                    const globalIndex = session.items.slice(0, index).reduce((acc, i) => acc + (i.media?.length || 0), 0) + mediaIndex;
                    openMediaViewer(allMedia, globalIndex);
                };

                mediaGrid.appendChild(mediaItem);
            });

            itemDiv.appendChild(mediaGrid);
        }

        itemsContainer.appendChild(itemDiv);
    });

    detailContent.appendChild(itemsContainer);
    showScreen('detail');
}

// Edit entry
async function editEntry() {
    if (!currentSessionId) return;

    try {
        // Load the session data
        const session = await db.getSessionWithDetails(currentSessionId);

        // Switch to the session's mode FIRST (this resets edit state)
        if (session.type && session.type !== currentMode) {
            switchMode(session.type);
        }

        // Set edit mode AFTER switchMode (which resets these)
        isEditMode = true;
        editingSessionId = currentSessionId;

        // Set currentEntryDate so save targets the correct date
        currentEntryDate = new Date(session.sessionDate + 'T00:00:00');

        // Clear current form and update placeholders for mode
        clearForm();
        updateEntryFormForMode();

        // Load session data into form
        session.items.forEach(item => {
            const textarea = document.querySelector(`textarea[data-item-id="${item.itemOrder}"]`);
            if (textarea) {
                textarea.value = item.textContent || '';
            }

            // Load media
            if (item.media && item.media.length > 0) {
                itemMediaData[item.itemOrder] = item.media.map(m => ({
                    type: m.mediaType,
                    dataUrl: m.dataUrl,
                    fileName: m.fileName,
                    fileSize: m.fileSize,
                    mimeType: m.mimeType
                }));
                renderMediaPreview(item.itemOrder);
            }
        });

        // Update date display with the entry's date
        const date = new Date(session.sessionDate);
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        document.getElementById('todayDate').textContent = date.toLocaleDateString('en-US', options);

        // Show entry screen
        showScreen('entry');
        showToast('Edit mode - Update your entry');
    } catch (error) {
        console.error('Edit error:', error);
        showToast('Failed to load entry for editing');
    }
}

// Cancel edit
function cancelEdit() {
    if (confirm('Discard changes?')) {
        isEditMode = false;
        const sessionId = editingSessionId;
        editingSessionId = null;
        clearForm();
        updateTodayDate();
        showDetail(sessionId);
    }
}

// Delete entry
async function deleteEntry() {
    if (!currentSessionId) return;

    if (confirm('Are you sure you want to delete this entry?')) {
        try {
            await db.deleteSession(currentSessionId);
            showToast('Entry deleted');
            showScreen('history');
        } catch (error) {
            console.error('Delete error:', error);
            showToast('Failed to delete entry');
        }
    }
}

// Switch between week, month, year view modes
function switchViewMode(mode) {
    currentView = mode;

    // Update active button
    document.querySelectorAll('.view-switch-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    if (event && event.target) {
        event.target.classList.add('active');
    } else {
        document.querySelectorAll('.view-switch-btn').forEach(btn => {
            if (btn.textContent.trim().toLowerCase() === mode) btn.classList.add('active');
        });
    }

    // Hide all views
    document.querySelectorAll('.history-view').forEach(v => v.classList.remove('active'));

    // Show selected view
    if (mode === 'week') {
        document.getElementById('weekView').classList.add('active');
        renderWeekView();
    } else if (mode === 'month') {
        document.getElementById('calendarView').classList.add('active');
        renderCalendar();
    } else if (mode === 'year') {
        document.getElementById('yearView').classList.add('active');
        renderYearView();
    }
}

// Programmatic switch (no event)
function switchToViewMode(mode) {
    currentView = mode;
    document.querySelectorAll('.view-switch-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent.trim().toLowerCase() === mode) btn.classList.add('active');
    });
    document.querySelectorAll('.history-view').forEach(v => v.classList.remove('active'));
    if (mode === 'week') {
        document.getElementById('weekView').classList.add('active');
        renderWeekView();
    } else if (mode === 'month') {
        document.getElementById('calendarView').classList.add('active');
        renderCalendar();
    } else if (mode === 'year') {
        document.getElementById('yearView').classList.add('active');
        renderYearView();
    }
}

// Media Viewer
function openMediaViewer(mediaArray, startIndex) {
    currentMediaGallery = mediaArray;
    currentMediaIndex = startIndex;

    const modal = document.getElementById('mediaModal');
    modal.classList.add('active');

    displayCurrentMedia();
}

function displayCurrentMedia() {
    const viewer = document.getElementById('mediaViewer');
    const counter = document.getElementById('mediaCounter');

    const media = currentMediaGallery[currentMediaIndex];

    viewer.innerHTML = '';

    if (media.mediaType === 'image') {
        const img = document.createElement('img');
        img.src = media.dataUrl;
        viewer.appendChild(img);
    } else {
        const video = document.createElement('video');
        video.src = media.dataUrl;
        video.controls = true;
        video.autoplay = true;
        viewer.appendChild(video);
    }

    counter.textContent = `${currentMediaIndex + 1}/${currentMediaGallery.length}`;
}

function prevMedia() {
    if (currentMediaIndex > 0) {
        currentMediaIndex--;
        displayCurrentMedia();
    }
}

function nextMedia() {
    if (currentMediaIndex < currentMediaGallery.length - 1) {
        currentMediaIndex++;
        displayCurrentMedia();
    }
}

function closeMediaModal() {
    const modal = document.getElementById('mediaModal');
    modal.classList.remove('active');

    // Stop any playing videos
    const video = document.querySelector('#mediaViewer video');
    if (video) {
        video.pause();
    }
}

// Share current entry
async function shareCurrentEntry() {
    if (!currentSessionId) return;

    const session = await db.getSessionWithDetails(currentSessionId);

    const date = new Date(session.sessionDate);
    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateString = date.toLocaleDateString('en-US', dateOptions);

    let text = `${dateString}\n\nToday I'm grateful for:\n\n`;

    session.items.forEach((item, index) => {
        const itemText = item.textContent || '(media)';
        text += `${index + 1}. ${itemText}\n`;
    });

    text += `\n✨ Created with Gratitude Journal`;

    // Try Web Share API if available
    if (navigator.share) {
        try {
            await navigator.share({
                title: 'My Gratitude Entry',
                text: text
            });
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Share error:', error);
                fallbackShare(text);
            }
        }
    } else {
        fallbackShare(text);
    }
}

// Fallback share (copy to clipboard)
function fallbackShare(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('📋 Entry copied to clipboard!');
    }).catch(() => {
        // Show text in modal
        alert(text);
    });
}

// Utility Functions
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// ========== CALENDAR VIEW ==========

// Legacy alias for goHome
function switchToCalendarView() {
    switchToViewMode('month');
}

// ========== WEEK VIEW ==========

function getWeekStart(date) {
    const d = new Date(date);
    d.setDate(d.getDate() - d.getDay());
    d.setHours(0, 0, 0, 0);
    return d;
}

async function renderWeekView() {
    const weekStart = getWeekStart(weekDate);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    // Update title
    const startStr = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endStr = weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    document.getElementById('weekTitle').textContent = `${startStr} - ${endStr}`;

    // Get all sessions
    const allSessions = await db.getAllSessions(currentMode);
    const sessionMap = {};
    for (const session of allSessions) {
        sessionMap[session.sessionDate] = session;
    }

    // Get birthdays
    const allContacts = await db.getAllContacts();
    const birthdayMap = {};
    allContacts.forEach(contact => {
        if (contact.birthday) {
            if (!birthdayMap[contact.birthday]) birthdayMap[contact.birthday] = [];
            birthdayMap[contact.birthday].push(contact);
        }
    });

    const grid = document.getElementById('weekGrid');
    grid.innerHTML = '';

    const today = new Date();
    const todayStr = formatDate(today);

    for (let i = 0; i < 7; i++) {
        const day = new Date(weekStart);
        day.setDate(day.getDate() + i);
        const dateStr = formatDate(day);
        const isToday = dateStr === todayStr;

        const session = sessionMap[dateStr];
        const dayCard = document.createElement('div');
        dayCard.className = 'week-day-card' + (isToday ? ' today' : '') + (session ? ' has-entry' : '');

        // Day header
        const dayHeader = document.createElement('div');
        dayHeader.className = 'week-day-header';
        const dayName = day.toLocaleDateString('en-US', { weekday: 'short' });
        const dayNum = day.getDate();
        const monthName = day.toLocaleDateString('en-US', { month: 'short' });
        dayHeader.innerHTML = `<span class="week-day-name">${dayName}</span><span class="week-day-num">${monthName} ${dayNum}</span>`;
        dayCard.appendChild(dayHeader);

        // Birthday check
        const mm = String(day.getMonth() + 1).padStart(2, '0');
        const dd = String(day.getDate()).padStart(2, '0');
        const bKey = `${mm}-${dd}`;
        if (birthdayMap[bKey]) {
            const bDiv = document.createElement('div');
            bDiv.className = 'week-birthday';
            bDiv.textContent = '🎂 ' + birthdayMap[bKey].map(c => c.name).join(', ');
            dayCard.appendChild(bDiv);
        }

        // Entry content
        if (session) {
            const details = await db.getSessionWithDetails(session.id);
            const entryDiv = document.createElement('div');
            entryDiv.className = 'week-entry-content';

            details.items.forEach((item, idx) => {
                if (item.textContent) {
                    const itemDiv = document.createElement('div');
                    itemDiv.className = 'week-entry-item';
                    itemDiv.innerHTML = `<span class="week-item-num">${idx + 1}</span> ${escapeHtml(item.textContent)}`;
                    entryDiv.appendChild(itemDiv);
                }
            });

            dayCard.appendChild(entryDiv);

            // Click to view detail
            dayCard.style.cursor = 'pointer';
            dayCard.onclick = () => showDetail(session.id);
        } else {
            const emptyDiv = document.createElement('div');
            emptyDiv.className = 'week-empty';
            emptyDiv.textContent = 'No entry';
            dayCard.appendChild(emptyDiv);

            // Click to add entry
            const addBtn = document.createElement('button');
            addBtn.className = 'week-add-btn';
            addBtn.textContent = '+ Add';
            addBtn.onclick = (e) => { e.stopPropagation(); openEntryForDate(dateStr); };
            dayCard.appendChild(addBtn);
        }

        grid.appendChild(dayCard);
    }
}

function previousWeek() {
    weekDate.setDate(weekDate.getDate() - 7);
    renderWeekView();
}

function nextWeek() {
    weekDate.setDate(weekDate.getDate() + 7);
    renderWeekView();
}

// ========== YEAR VIEW ==========

async function renderYearView() {
    const year = yearDate.getFullYear();
    document.getElementById('yearTitle').textContent = year;

    // Get all sessions for this year
    const allSessions = await db.getAllSessions(currentMode);
    const sessionDates = new Set(allSessions.map(s => s.sessionDate));

    const grid = document.getElementById('yearGrid');
    grid.innerHTML = '';

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const today = new Date();
    const todayStr = formatDate(today);

    for (let month = 0; month < 12; month++) {
        const monthCard = document.createElement('div');
        monthCard.className = 'year-month-card';

        // Month title - clickable to go to month view
        const monthTitle = document.createElement('div');
        monthTitle.className = 'year-month-title';
        monthTitle.textContent = monthNames[month];
        monthTitle.style.cursor = 'pointer';
        monthTitle.onclick = () => {
            calendarDate = new Date(year, month, 1);
            switchToViewMode('month');
        };
        monthCard.appendChild(monthTitle);

        // Mini day headers
        const dayHeaders = document.createElement('div');
        dayHeaders.className = 'year-mini-grid';
        ['S', 'M', 'T', 'W', 'T', 'F', 'S'].forEach(d => {
            const h = document.createElement('div');
            h.className = 'year-mini-header';
            h.textContent = d;
            dayHeaders.appendChild(h);
        });
        monthCard.appendChild(dayHeaders);

        // Mini calendar grid
        const miniGrid = document.createElement('div');
        miniGrid.className = 'year-mini-grid';

        const firstDay = new Date(year, month, 1);
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const startDay = firstDay.getDay();

        // Empty cells before first day
        for (let e = 0; e < startDay; e++) {
            const empty = document.createElement('div');
            empty.className = 'year-mini-day empty';
            miniGrid.appendChild(empty);
        }

        // Day cells
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = formatDate(new Date(year, month, day));
            const hasEntry = sessionDates.has(dateStr);
            const isToday = dateStr === todayStr;

            const dayEl = document.createElement('div');
            dayEl.className = 'year-mini-day' +
                (hasEntry ? ' has-entry' : '') +
                (isToday ? ' today' : '');
            dayEl.textContent = day;
            dayEl.title = dateStr;
            dayEl.onclick = () => {
                calendarDate = new Date(year, month, 1);
                switchToViewMode('month');
                // Small delay to let calendar render, then open the date
                setTimeout(() => openCalendarDate(dateStr, []), 100);
            };
            miniGrid.appendChild(dayEl);
        }

        monthCard.appendChild(miniGrid);

        // Entry count for month
        let monthEntryCount = 0;
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = formatDate(new Date(year, month, day));
            if (sessionDates.has(dateStr)) monthEntryCount++;
        }
        const countDiv = document.createElement('div');
        countDiv.className = 'year-month-count';
        countDiv.textContent = monthEntryCount > 0 ? `${monthEntryCount} entr${monthEntryCount === 1 ? 'y' : 'ies'}` : 'No entries';
        monthCard.appendChild(countDiv);

        grid.appendChild(monthCard);
    }
}

function previousYear() {
    yearDate.setFullYear(yearDate.getFullYear() - 1);
    renderYearView();
}

function nextYear() {
    yearDate.setFullYear(yearDate.getFullYear() + 1);
    renderYearView();
}

// Render calendar for current month
// skipAutoSelect: if true, don't auto-select today (caller will handle detail pane separately)
async function renderCalendar(skipAutoSelect = false) {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();

    // Update header
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    document.getElementById('calendarMonthYear').textContent = `${monthNames[month]} ${year}`;

    // Get all sessions
    const allSessions = await db.getAllSessions(currentMode);
    const sessionDates = new Set(allSessions.map(s => s.sessionDate));

    // Get all contacts with birthdays for this month
    const allContacts = await db.getAllContacts();
    const birthdayMap = {}; // Map of "MM-DD" to array of contact names
    allContacts.forEach(contact => {
        if (contact.birthday) {
            const [bMonth, bDay] = contact.birthday.split('-');
            if (parseInt(bMonth) === month + 1) {
                const key = `${bMonth}-${bDay}`;
                if (!birthdayMap[key]) {
                    birthdayMap[key] = [];
                }
                birthdayMap[key].push(contact);
            }
        }
    });

    // Calculate calendar grid
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startingDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    // Get previous month's last days
    const prevMonthLastDay = new Date(year, month, 0).getDate();

    const grid = document.getElementById('calendarGrid');
    grid.innerHTML = '';

    // Day headers
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dayNames.forEach(day => {
        const header = document.createElement('div');
        header.className = 'calendar-day-header';
        header.textContent = day;
        grid.appendChild(header);
    });

    // Previous month days
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
        const day = prevMonthLastDay - i;
        const dayCell = createCalendarDay(day, true, null, false, false, []);
        grid.appendChild(dayCell);
    }

    // Current month days
    const today = new Date();
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = formatDate(new Date(year, month, day));
        const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
        const hasEntry = sessionDates.has(dateStr);

        // Check for birthdays on this day
        const monthStr = String(month + 1).padStart(2, '0');
        const dayStr = String(day).padStart(2, '0');
        const birthdayKey = `${monthStr}-${dayStr}`;
        const birthdaysOnDay = birthdayMap[birthdayKey] || [];

        const dayCell = createCalendarDay(day, false, dateStr, isToday, hasEntry, birthdaysOnDay);
        grid.appendChild(dayCell);
    }

    // Next month days to fill grid
    const totalCells = grid.children.length - 7; // Subtract headers
    const remainingCells = 42 - totalCells - 7; // 6 weeks * 7 days
    for (let day = 1; day <= remainingCells; day++) {
        const dayCell = createCalendarDay(day, true, null, false, false, []);
        grid.appendChild(dayCell);
    }

    // Render upcoming birthdays panel below calendar
    renderCalendarBirthdays();

    // Auto-select today's date in the detail pane if viewing the current month
    if (!skipAutoSelect) {
        if (today.getMonth() === month && today.getFullYear() === year) {
            const todayStr = formatDate(today);
            const todayBirthdayKey = `${String(month + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
            const todayBirthdays = birthdayMap[todayBirthdayKey] || [];
            openCalendarDate(todayStr, todayBirthdays);
        } else {
            // Clear detail pane if not viewing current month
            const detailPane = document.getElementById('calendarDetailPane');
            if (detailPane) {
                detailPane.innerHTML = '<div class="calendar-detail-placeholder"><p>Select a day to view details</p></div>';
            }
        }
    }
}

// Render upcoming birthdays panel on the calendar view
async function renderCalendarBirthdays() {
    const panel = document.getElementById('calendarBirthdayPanel');
    const list = document.getElementById('calendarBirthdayList');
    if (!panel || !list) return;

    // Get birthdays within the next 30 days (plus 3 days past for grey-out)
    const contacts = await db.getAllContacts();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const birthdays = [];

    contacts.forEach(contact => {
        if (!contact.birthday) return;
        const [month, day] = contact.birthday.split('-').map(Number);

        const birthdayThisYear = new Date(today.getFullYear(), month - 1, day);
        birthdayThisYear.setHours(0, 0, 0, 0);

        // Check if birthday already passed this year
        const timeDiff = birthdayThisYear.getTime() - today.getTime();
        const daysUntil = Math.round(timeDiff / (1000 * 60 * 60 * 24));

        // Show birthdays from 3 days ago (greyed out) to 30 days ahead
        if (daysUntil >= -3 && daysUntil <= 30) {
            birthdays.push({
                ...contact,
                daysUntil,
                birthdayDate: birthdayThisYear
            });
        } else {
            // Also check next year for dates near year boundary
            const birthdayNextYear = new Date(today.getFullYear() + 1, month - 1, day);
            birthdayNextYear.setHours(0, 0, 0, 0);
            const nextDiff = birthdayNextYear.getTime() - today.getTime();
            const nextDaysUntil = Math.round(nextDiff / (1000 * 60 * 60 * 24));
            if (nextDaysUntil >= -3 && nextDaysUntil <= 30) {
                birthdays.push({
                    ...contact,
                    daysUntil: nextDaysUntil,
                    birthdayDate: birthdayNextYear
                });
            }
        }
    });

    // Sort: today first, then upcoming, then recently passed at the bottom
    birthdays.sort((a, b) => {
        // Recently passed (negative) go to bottom
        if (a.daysUntil < 0 && b.daysUntil >= 0) return 1;
        if (a.daysUntil >= 0 && b.daysUntil < 0) return -1;
        return a.daysUntil - b.daysUntil;
    });

    if (birthdays.length === 0) {
        panel.style.display = 'none';
        return;
    }

    list.innerHTML = '';

    birthdays.forEach(birthday => {
        const item = document.createElement('div');
        item.className = 'calendar-birthday-item';

        const isPassed = birthday.daysUntil < 0;
        const isToday = birthday.daysUntil === 0;

        if (isPassed) {
            item.classList.add('birthday-passed');
        }
        if (isToday) {
            item.classList.add('birthday-is-today');
        }

        let dateLabel;
        if (isToday) {
            dateLabel = 'Today!';
        } else if (birthday.daysUntil === 1) {
            dateLabel = 'Tomorrow';
        } else if (isPassed) {
            dateLabel = `${Math.abs(birthday.daysUntil)} day${Math.abs(birthday.daysUntil) > 1 ? 's' : ''} ago`;
        } else {
            const options = { weekday: 'short', month: 'short', day: 'numeric' };
            dateLabel = birthday.birthdayDate.toLocaleDateString('en-US', options);
        }

        const sendBtn = isPassed ? '' :
            `<div class="calendar-birthday-send" onclick="event.stopPropagation(); sendBirthdayMessage('${escapeHtml(birthday.name)}', '${escapeHtml(birthday.phoneNumber)}')" title="Send birthday message">💬</div>`;

        item.innerHTML = `
            <div class="calendar-birthday-info">
                <span class="calendar-birthday-name">${escapeHtml(birthday.name)}</span>
                <span class="calendar-birthday-date">${dateLabel}</span>
            </div>
            ${sendBtn}
        `;

        list.appendChild(item);
    });

    panel.style.display = 'block';
}

// Create calendar day cell
function createCalendarDay(day, isOtherMonth, dateStr, isToday = false, hasEntry = false, birthdays = []) {
    const dayCell = document.createElement('div');
    dayCell.className = 'calendar-day';

    if (isOtherMonth) {
        dayCell.classList.add('other-month');
    }
    if (isToday) {
        dayCell.classList.add('today');
    }
    if (hasEntry) {
        dayCell.classList.add('has-entry');
    }
    if (birthdays.length > 0) {
        dayCell.classList.add('has-birthday');
    }

    const dayNumber = document.createElement('div');
    dayNumber.className = 'calendar-day-number';
    dayNumber.textContent = day;
    dayCell.appendChild(dayNumber);

    // Show birthday indicator
    if (birthdays.length > 0) {
        const birthdayIndicator = document.createElement('div');
        birthdayIndicator.className = 'calendar-birthday-indicator';
        birthdayIndicator.textContent = '🎂';
        birthdayIndicator.title = birthdays.map(c => c.name).join(', ');
        dayCell.appendChild(birthdayIndicator);
    }

    if (hasEntry) {
        const indicator = document.createElement('div');
        indicator.className = 'calendar-day-indicator';
        dayCell.appendChild(indicator);
    }

    if (!isOtherMonth && dateStr) {
        dayCell.onclick = () => openCalendarDate(dateStr, birthdays);
    }

    return dayCell;
}

// Open entry for selected calendar date
async function openCalendarDate(dateStr, birthdays = []) {
    // Track the selected date so we can refresh the detail pane on mode switch
    selectedCalendarDate = dateStr;
    selectedCalendarBirthdays = birthdays;

    const session = await db.getSessionByDate(dateStr, currentMode);
    const detailPane = document.getElementById('calendarDetailPane');

    if (session) {
        // Show entry details in side pane
        const sessionDetails = await db.getSessionWithDetails(session.id);
        renderCalendarDetailPane(sessionDetails, birthdays);
    } else {
        // Show empty state with birthdays if any
        let birthdayHTML = '';
        if (birthdays.length > 0) {
            birthdayHTML = `
                <div class="calendar-birthday-banner">
                    <div class="birthday-icon">🎂</div>
                    <div class="birthday-content">
                        <div class="birthday-title">Birthday${birthdays.length > 1 ? 's' : ''} on this day!</div>
                        ${birthdays.map(c => `
                            <div class="birthday-person">
                                <span>${escapeHtml(c.name)}</span>
                                <button class="send-birthday-btn" onclick="sendBirthdayMessage('${escapeHtml(c.name)}', '${escapeHtml(c.phoneNumber)}')">
                                    Send Message 💬
                                </button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        detailPane.innerHTML = `
            ${birthdayHTML}
            <div class="calendar-detail-placeholder">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                <p>No entry for this date</p>
                <button class="primary-btn" onclick="openEntryForDate('${dateStr}')">Add Entry +</button>
            </div>
        `;
    }
}

// Render calendar detail pane
function renderCalendarDetailPane(session, birthdays = []) {
    const detailPane = document.getElementById('calendarDetailPane');
    detailPane.innerHTML = '';

    const detailContent = document.createElement('div');
    detailContent.className = 'calendar-detail-content';

    // Show birthday banner if there are birthdays
    if (birthdays.length > 0) {
        const birthdayBanner = document.createElement('div');
        birthdayBanner.className = 'calendar-birthday-banner';
        birthdayBanner.innerHTML = `
            <div class="birthday-icon">🎂</div>
            <div class="birthday-content">
                <div class="birthday-title">Birthday${birthdays.length > 1 ? 's' : ''} on this day!</div>
                ${birthdays.map(c => `
                    <div class="birthday-person">
                        <span>${escapeHtml(c.name)}</span>
                        <button class="send-birthday-btn" onclick="sendBirthdayMessage('${escapeHtml(c.name)}', '${escapeHtml(c.phoneNumber)}')">
                            Send Message 💬
                        </button>
                    </div>
                `).join('')}
            </div>
        `;
        detailContent.appendChild(birthdayBanner);
    }

    // Date header
    const date = new Date(session.sessionDate + 'T00:00:00');
    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateString = date.toLocaleDateString('en-US', dateOptions);

    const headerDiv = document.createElement('div');
    headerDiv.className = 'detail-header';

    const dateHeader = document.createElement('div');
    dateHeader.className = 'detail-date';
    dateHeader.style.fontSize = '1.125rem';
    dateHeader.textContent = dateString;
    headerDiv.appendChild(dateHeader);

    detailContent.appendChild(headerDiv);

    // Items
    const itemsContainer = document.createElement('div');
    itemsContainer.className = 'detail-items';

    session.items.forEach((item, index) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'detail-item';
        itemDiv.style.padding = 'var(--spacing-md)';

        const itemHeader = document.createElement('div');
        itemHeader.className = 'detail-item-header';

        const itemNumber = document.createElement('div');
        itemNumber.className = 'detail-item-number';
        itemNumber.style.width = '28px';
        itemNumber.style.height = '28px';
        itemNumber.style.fontSize = '0.875rem';
        itemNumber.textContent = index + 1;
        itemHeader.appendChild(itemNumber);

        itemDiv.appendChild(itemHeader);

        if (item.textContent) {
            const text = document.createElement('div');
            text.className = 'detail-item-text';
            text.style.paddingLeft = 'calc(28px + var(--spacing-sm))';
            text.style.fontSize = '0.9375rem';
            text.textContent = item.textContent;
            itemDiv.appendChild(text);
        }

        if (item.media && item.media.length > 0) {
            const mediaGrid = document.createElement('div');
            mediaGrid.className = 'detail-media';
            mediaGrid.style.paddingLeft = 'calc(28px + var(--spacing-sm))';

            item.media.forEach((media) => {
                const mediaItem = document.createElement('div');
                mediaItem.className = 'detail-media-item';
                mediaItem.style.width = '64px';
                mediaItem.style.height = '64px';

                if (media.mediaType === 'image') {
                    const img = document.createElement('img');
                    img.src = media.dataUrl;
                    mediaItem.appendChild(img);
                } else {
                    const video = document.createElement('video');
                    video.src = media.dataUrl;
                    mediaItem.appendChild(video);
                }

                mediaItem.onclick = () => showDetail(session.id);

                mediaGrid.appendChild(mediaItem);
            });

            itemDiv.appendChild(mediaGrid);
        }

        itemsContainer.appendChild(itemDiv);
    });

    detailContent.appendChild(itemsContainer);

    // Action buttons row
    const actionRow = document.createElement('div');
    actionRow.className = 'calendar-detail-actions';

    const viewFullBtn = document.createElement('button');
    viewFullBtn.className = 'primary-btn';
    viewFullBtn.textContent = 'View Full Entry';
    viewFullBtn.onclick = () => showDetail(session.id);
    actionRow.appendChild(viewFullBtn);

    const editBtn = document.createElement('button');
    editBtn.className = 'secondary-btn';
    editBtn.textContent = 'Edit Entry';
    editBtn.onclick = () => openEntryForDate(session.sessionDate);
    actionRow.appendChild(editBtn);

    detailContent.appendChild(actionRow);

    detailPane.appendChild(detailContent);
}

// Open entry form for a specific date (from calendar view)
function openEntryForDate(dateStr) {
    currentEntryDate = new Date(dateStr + 'T00:00:00');
    isEditMode = false;
    editingSessionId = null;
    clearForm();
    updateDateDisplay();
    loadEntryForDate(currentEntryDate);
    initializeSuggestions();
    showScreen('entry');
}

// Navigate to adjacent day from detail view
async function navigateDetailDay(currentDateStr, offset) {
    const date = new Date(currentDateStr + 'T00:00:00');
    date.setDate(date.getDate() + offset);
    const targetDateStr = formatDate(date);
    const session = await db.getSessionByDate(targetDateStr, currentMode);

    if (session) {
        showDetail(session.id);
    } else {
        // No entry for that day — open the entry form so user can create one
        openEntryForDate(targetDateStr);
    }
}

// Navigate to previous month
function previousMonth() {
    calendarDate.setMonth(calendarDate.getMonth() - 1);
    renderCalendar();
}

// Navigate to next month
function nextMonth() {
    calendarDate.setMonth(calendarDate.getMonth() + 1);
    renderCalendar();
}

// ========== CAMERA CAPTURE ==========

// Open camera modal
async function openCamera(itemId) {
    currentCameraItemId = itemId;
    const modal = document.getElementById('cameraModal');
    const video = document.getElementById('cameraPreview');

    try {
        // Request camera access
        cameraStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user' },
            audio: true
        });

        video.srcObject = cameraStream;
        modal.classList.add('active');
        showToast('Camera ready!');
    } catch (error) {
        console.error('Camera error:', error);
        showToast('Unable to access camera. Please check permissions.');
    }
}

// Close camera modal
function closeCameraModal() {
    const modal = document.getElementById('cameraModal');
    modal.classList.remove('active');

    // Stop camera stream
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }

    // Reset recording state
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
    }
    mediaRecorder = null;
    recordedChunks = [];

    // Reset buttons
    document.getElementById('startRecordBtn').style.display = 'block';
    document.getElementById('stopRecordBtn').style.display = 'none';
    document.getElementById('capturePhotoBtn').disabled = false;
}

// Capture photo from camera
function capturePhoto() {
    const video = document.getElementById('cameraPreview');
    const canvas = document.getElementById('cameraCanvas');

    // Set canvas size to video size
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);

    // Convert to data URL
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);

    // Add to media
    if (itemMediaData[currentCameraItemId].length >= 5) {
        showToast('Maximum 5 media items per entry');
        return;
    }

    itemMediaData[currentCameraItemId].push({
        type: 'image',
        dataUrl: dataUrl,
        fileName: `photo_${Date.now()}.jpg`,
        fileSize: dataUrl.length,
        mimeType: 'image/jpeg'
    });

    renderMediaPreview(currentCameraItemId);
    closeCameraModal();
    showToast('Photo captured!');
}

// Start video recording
function startRecording() {
    if (!cameraStream) return;

    recordedChunks = [];

    try {
        mediaRecorder = new MediaRecorder(cameraStream, {
            mimeType: 'video/webm'
        });

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                recordedChunks.push(event.data);
            }
        };

        mediaRecorder.onstop = () => {
            const blob = new Blob(recordedChunks, { type: 'video/webm' });

            // Check file size (50MB limit)
            if (blob.size > 50 * 1024 * 1024) {
                showToast('Video too large. Maximum 50MB');
                return;
            }

            // Convert to data URL
            const reader = new FileReader();
            reader.onload = () => {
                if (itemMediaData[currentCameraItemId].length >= 5) {
                    showToast('Maximum 5 media items per entry');
                    return;
                }

                itemMediaData[currentCameraItemId].push({
                    type: 'video',
                    dataUrl: reader.result,
                    fileName: `video_${Date.now()}.webm`,
                    fileSize: blob.size,
                    mimeType: 'video/webm'
                });

                renderMediaPreview(currentCameraItemId);
                closeCameraModal();
                showToast('Video recorded!');
            };
            reader.readAsDataURL(blob);
        };

        mediaRecorder.start();

        // Update UI
        document.getElementById('startRecordBtn').style.display = 'none';
        document.getElementById('stopRecordBtn').style.display = 'block';
        document.getElementById('capturePhotoBtn').disabled = true;

        showToast('Recording started...');
    } catch (error) {
        console.error('Recording error:', error);
        showToast('Unable to record video');
    }
}

// Stop video recording
function stopRecording() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();

        // Reset buttons
        document.getElementById('startRecordBtn').style.display = 'block';
        document.getElementById('stopRecordBtn').style.display = 'none';
        document.getElementById('capturePhotoBtn').disabled = false;
    }
}

// Address Book Functions
let currentContactPhoto = null;

async function showAddressBook() {
    showScreen('addressBook');
    cancelEditContact(); // Reset form state
    await loadContacts();
}

async function loadContacts() {
    let contacts = [];
    try {
        contacts = await db.getAllContacts();
    } catch (err) {
        console.error('loadContacts failed:', err);
        showToast('Error loading contacts: ' + (err.message || 'Unknown error'));
    }
    const contactsList = document.getElementById('contactsList');
    const countElement = document.getElementById('contactsCount');

    // Update contact count
    if (countElement) {
        countElement.textContent = `${contacts.length} contact${contacts.length !== 1 ? 's' : ''}`;
    }

    if (contacts.length === 0) {
        contactsList.innerHTML = '<p class="empty-state-text">No contacts yet. Add your first contact!</p>';
        return;
    }

    // Check for today's birthdays
    const today = new Date();
    const todayKey = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    contactsList.innerHTML = '';
    contacts.forEach(contact => {
        try {
            // Guard against contacts with missing data
            const name = contact.name || 'Unknown';
            const phone = contact.phoneNumber || '';
            const contactId = contact.id || '';

            if (!contactId) return; // Skip contacts without an ID

            const contactCard = document.createElement('div');
            contactCard.className = 'contact-card';
            contactCard.dataset.name = name;
            contactCard.dataset.phone = phone;

            // Check if it's their birthday today
            const isBirthdayToday = contact.birthday === todayKey;
            if (isBirthdayToday) {
                contactCard.classList.add('birthday-today');
            }

            // Format birthday for display
            let birthdayDisplay = '';
            if (contact.birthday) {
                const [month, day] = contact.birthday.split('-');
                const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                birthdayDisplay = `${monthNames[parseInt(month) - 1]} ${parseInt(day)}`;
            }

            // Contact photo or placeholder
            const initial = name.charAt(0).toUpperCase();
            const photoHTML = contact.photo
                ? `<img src="${contact.photo}" class="contact-card-photo" alt="${escapeHtml(name)}">`
                : `<div class="contact-card-photo-placeholder">${initial}</div>`;

            contactCard.innerHTML = `
                <div class="contact-card-header">
                    ${photoHTML}
                    ${isBirthdayToday ? '<span class="birthday-badge">🎂 Today!</span>' : ''}
                </div>
                <div class="contact-card-body">
                    <div class="contact-card-name">${escapeHtml(name)}</div>
                    <div class="contact-card-phone">${escapeHtml(phone)}</div>
                    ${birthdayDisplay ? `<div class="contact-card-birthday">🎂 ${birthdayDisplay}</div>` : ''}
                </div>
                <div class="contact-card-actions">
                    ${isBirthdayToday ? `<button class="send-birthday-btn-card" onclick="event.stopPropagation(); sendBirthdayMessage('${escapeHtml(name)}', '${escapeHtml(phone)}')" title="Send birthday message">💬 Send</button>` : ''}
                    <button class="contact-action-btn edit" onclick="event.stopPropagation(); editContact('${contactId}')" title="Edit">✏️</button>
                    <button class="contact-action-btn delete" onclick="event.stopPropagation(); deleteContactConfirm('${contactId}')" title="Delete">🗑️</button>
                </div>
            `;
            contactsList.appendChild(contactCard);
        } catch (err) {
            console.error('Error rendering contact:', contact, err);
        }
    });
}

// Contact photo functions
function selectContactPhoto() {
    document.getElementById('contactPhotoInput').click();
}

function handleContactPhotoSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
        showToast('Photo too large. Maximum 2MB');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        currentContactPhoto = e.target.result;
        updateContactPhotoPreview(currentContactPhoto);
    };
    reader.readAsDataURL(file);
}

function updateContactPhotoPreview(photoUrl) {
    const preview = document.getElementById('contactPhotoPreview');
    const clearBtn = document.getElementById('clearPhotoBtn');

    if (photoUrl) {
        preview.innerHTML = `<img src="${photoUrl}" alt="Contact photo">`;
        clearBtn.style.display = 'inline-block';
    } else {
        preview.innerHTML = '<span class="photo-placeholder">📷</span>';
        clearBtn.style.display = 'none';
    }
}

function clearContactPhoto() {
    currentContactPhoto = null;
    document.getElementById('contactPhotoInput').value = '';
    updateContactPhotoPreview(null);
}

// Edit contact
async function editContact(contactId) {
    try {
        const contact = await db.getContact(contactId);
        if (!contact) {
            showToast('Contact not found');
            return;
        }

        // Populate form with null guards
        document.getElementById('editingContactId').value = String(contactId);
        document.getElementById('contactName').value = contact.name || '';
        document.getElementById('contactPhone').value = contact.phoneNumber || '';

        // Set birthday if exists (need to convert MM-DD to date input format)
        if (contact.birthday) {
            const [month, day] = contact.birthday.split('-');
            // Use current year for date input
            const year = new Date().getFullYear();
            document.getElementById('contactBirthday').value = `${year}-${month}-${day}`;
        } else {
            document.getElementById('contactBirthday').value = '';
        }

        // Set photo
        currentContactPhoto = contact.photo || null;
        updateContactPhotoPreview(currentContactPhoto);

        // Update form UI for edit mode
        document.getElementById('contactFormTitle').textContent = 'Edit Contact';
        document.getElementById('saveContactBtn').textContent = 'Update Contact';
        document.getElementById('cancelEditBtn').style.display = 'inline-block';

        // Scroll to form
        const formPanel = document.querySelector('.address-book-form-panel');
        if (formPanel) formPanel.scrollIntoView({ behavior: 'smooth' });

    } catch (error) {
        console.error('Error loading contact for edit:', error);
        showToast('Error loading contact: ' + (error.message || 'Unknown error'));
    }
}

function cancelEditContact() {
    // Reset form
    document.getElementById('editingContactId').value = '';
    document.getElementById('contactName').value = '';
    document.getElementById('contactPhone').value = '';
    document.getElementById('contactBirthday').value = '';
    currentContactPhoto = null;
    updateContactPhotoPreview(null);
    document.getElementById('contactPhotoInput').value = '';

    // Reset UI
    document.getElementById('contactFormTitle').textContent = 'Add New Contact';
    document.getElementById('saveContactBtn').textContent = 'Add Contact';
    document.getElementById('cancelEditBtn').style.display = 'none';
}

async function saveContact() {
    const editingId = document.getElementById('editingContactId').value;
    const name = document.getElementById('contactName').value.trim();
    const phone = document.getElementById('contactPhone').value.trim();
    const birthdayInput = document.getElementById('contactBirthday').value;

    if (!name || !phone) {
        showToast('Please enter both name and phone number');
        return;
    }

    // Convert birthday to MM-DD format for easier comparison (ignore year)
    let birthday = null;
    if (birthdayInput) {
        const date = new Date(birthdayInput);
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        birthday = `${month}-${day}`;
    }

    try {
        if (editingId) {
            // Update existing contact
            await db.updateContact(editingId, name, phone, birthday, currentContactPhoto);
            showToast('Contact updated!');
        } else {
            // Add new contact
            await db.addContact(name, phone, birthday, currentContactPhoto);
            showToast('Contact added!');
        }

        cancelEditContact(); // Reset form
        await loadContacts();
    } catch (error) {
        console.error('Error saving contact:', error);
        showToast('Error saving contact: ' + (error.message || 'Unknown error'));
    }
}

async function deleteContactConfirm(contactId) {
    if (confirm('Are you sure you want to delete this contact?')) {
        try {
            await db.deleteContact(contactId);
            showToast('Contact deleted');
            await loadContacts();
        } catch (error) {
            console.error('Error deleting contact:', error);
            showToast('Error deleting contact: ' + (error.message || 'Unknown error'));
        }
    }
}

// ========== CSV IMPORT/EXPORT ==========

function importContactsCSV() {
    document.getElementById('csvFileInput').click();
}

async function handleCSVImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
        const text = await file.text();
        const contacts = parseCSV(text);

        if (contacts.length === 0) {
            showToast('No valid contacts found in CSV');
            return;
        }

        let imported = 0;
        let skipped = 0;

        for (const contact of contacts) {
            if (contact.name && contact.phone) {
                try {
                    await db.addContact(contact.name, contact.phone, contact.birthday, null);
                    imported++;
                } catch (e) {
                    skipped++;
                }
            } else {
                skipped++;
            }
        }

        showToast(`Imported ${imported} contacts${skipped > 0 ? `, ${skipped} skipped` : ''}`);
        await loadContacts();

        // Reset file input
        event.target.value = '';

    } catch (error) {
        console.error('Error importing CSV:', error);
        showToast('Error importing CSV file');
    }
}

function parseCSV(csvText) {
    const lines = csvText.split(/\r?\n/).filter(line => line.trim());
    if (lines.length < 2) return [];

    // Parse header row
    const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());

    // Find column indices (support Google and Microsoft formats)
    const nameIndex = headers.findIndex(h =>
        h === 'name' || h === 'first name' || h === 'given name' || h === 'full name'
    );
    const lastNameIndex = headers.findIndex(h =>
        h === 'last name' || h === 'family name' || h === 'surname'
    );
    // Phone column: prioritise 'value' columns over 'type' columns (Google format: "Phone 1 - Value")
    let phoneIndex = headers.findIndex(h =>
        h.includes('phone') && h.includes('value')
    );
    // Fallback to mobile/telephone columns or any phone column that's not a type column
    if (phoneIndex === -1) {
        phoneIndex = headers.findIndex(h =>
            (h.includes('mobile') || h.includes('telephone') || h.includes('phone')) &&
            !h.includes('type')
        );
    }
    const birthdayIndex = headers.findIndex(h =>
        h === 'birthday' || h === 'birth date' || h === 'date of birth' || h === 'dob'
    );

    if (nameIndex === -1 || phoneIndex === -1) {
        showToast('CSV must have Name and Phone columns');
        return [];
    }

    const contacts = [];

    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        if (values.length === 0) continue;

        let name = values[nameIndex] || '';
        // Combine first and last name if separate columns
        if (lastNameIndex !== -1 && values[lastNameIndex]) {
            name = `${name} ${values[lastNameIndex]}`.trim();
        }

        const phone = values[phoneIndex] || '';
        let birthday = null;

        if (birthdayIndex !== -1 && values[birthdayIndex]) {
            birthday = parseBirthdayFromCSV(values[birthdayIndex]);
        }

        if (name && phone) {
            contacts.push({ name, phone, birthday });
        }
    }

    return contacts;
}

function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());

    return result;
}

function parseBirthdayFromCSV(dateStr) {
    if (!dateStr) return null;

    // Clean the string
    dateStr = dateStr.trim();

    // Try various date formats
    const formats = [
        { regex: /^(\d{4})-(\d{1,2})-(\d{1,2})$/, type: 'YYYY-MM-DD' },  // YYYY-MM-DD (Google format)
        { regex: /^(\d{2})\/(\d{2})\/(\d{4})$/, type: 'MM/DD/YYYY' },  // MM/DD/YYYY
        { regex: /^(\d{2})-(\d{2})-(\d{4})$/, type: 'MM-DD-YYYY' },  // MM-DD-YYYY
        { regex: /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, type: 'M/D/YYYY' },  // M/D/YYYY
        { regex: /^(\d{1,2})-(\d{1,2})$/, type: 'MM-DD' },  // MM-DD (already in our format)
    ];

    for (const format of formats) {
        const match = dateStr.match(format.regex);
        if (match) {
            let month, day;

            if (format.type === 'YYYY-MM-DD') {
                // YYYY-MM-DD format (Google Contacts export)
                month = String(match[2]).padStart(2, '0');
                day = String(match[3]).padStart(2, '0');
            } else if (format.type === 'MM-DD') {
                // Already in MM-DD format
                month = String(match[1]).padStart(2, '0');
                day = String(match[2]).padStart(2, '0');
            } else {
                // Assume MM/DD/YYYY format (US style)
                month = String(match[1]).padStart(2, '0');
                day = String(match[2]).padStart(2, '0');
            }

            // Validate
            const m = parseInt(month);
            const d = parseInt(day);
            if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
                return `${month}-${day}`;
            }
        }
    }

    return null;
}

async function exportContactsCSV() {
    try {
        const contacts = await db.getAllContacts();

        if (contacts.length === 0) {
            showToast('No contacts to export');
            return;
        }

        // Create CSV content (Google Contacts compatible format)
        const headers = ['Name', 'Phone 1 - Value', 'Birthday'];
        const rows = [headers.join(',')];

        contacts.forEach(contact => {
            const birthdayFormatted = contact.birthday
                ? `${new Date().getFullYear()}-${contact.birthday}`  // Convert MM-DD to YYYY-MM-DD
                : '';

            const row = [
                `"${(contact.name || '').replace(/"/g, '""')}"`,
                `"${(contact.phoneNumber || '').replace(/"/g, '""')}"`,
                birthdayFormatted
            ];
            rows.push(row.join(','));
        });

        const csvContent = rows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        // Download file
        const link = document.createElement('a');
        link.href = url;
        link.download = `grateful_contacts_${formatDate(new Date())}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        showToast(`Exported ${contacts.length} contacts`);

    } catch (error) {
        console.error('Error exporting contacts:', error);
        showToast('Error exporting contacts');
    }
}

// Send Gratitude Functions
function selectChannel(channel) {
    selectedChannel = channel;
    const smsBtn = document.getElementById('channelSms');
    const whatsappBtn = document.getElementById('channelWhatsapp');
    const whatsappNote = document.getElementById('whatsappNote');
    const sendBtn = document.getElementById('sendMessageBtn');

    if (!smsBtn || !whatsappBtn) {
        console.error('Channel toggle buttons not found!');
        return;
    }

    if (channel === 'whatsapp') {
        smsBtn.style.cssText = 'display:flex !important;visibility:visible !important;flex:1;align-items:center;justify-content:center;background:#f0f0f0;color:#5A5A5A;font-size:1rem;font-weight:700;cursor:pointer;user-select:none;';
        whatsappBtn.style.cssText = 'display:flex !important;visibility:visible !important;flex:1;align-items:center;justify-content:center;background:#9BAF95;color:#ffffff;font-size:1rem;font-weight:700;cursor:pointer;user-select:none;';
        if (whatsappNote) whatsappNote.style.display = 'block';
        if (sendBtn) sendBtn.textContent = 'Send WhatsApp 💌';
    } else {
        smsBtn.style.cssText = 'display:flex !important;visibility:visible !important;flex:1;align-items:center;justify-content:center;background:#9BAF95;color:#ffffff;font-size:1rem;font-weight:700;cursor:pointer;user-select:none;';
        whatsappBtn.style.cssText = 'display:flex !important;visibility:visible !important;flex:1;align-items:center;justify-content:center;background:#f0f0f0;color:#5A5A5A;font-size:1rem;font-weight:700;cursor:pointer;user-select:none;';
        if (whatsappNote) whatsappNote.style.display = 'none';
        if (sendBtn) sendBtn.textContent = 'Send SMS 💌';
    }
}

async function showSendGratitude() {
    showScreen('sendGratitude');
    // Reset channel to SMS by default
    selectChannel('sms');
    await loadRecipientsList();
}

async function loadRecipientsList() {
    const contacts = await db.getAllContacts();
    const select = document.getElementById('recipientSelect');

    // Clear existing options except the first one
    select.innerHTML = '<option value="">Choose from address book...</option>';

    contacts.forEach(contact => {
        const option = document.createElement('option');
        option.value = contact.phoneNumber;
        option.textContent = `${contact.name} (${contact.phoneNumber})`;
        select.appendChild(option);
    });
}

function handleRecipientChange() {
    const select = document.getElementById('recipientSelect');
    const phoneInput = document.getElementById('recipientPhone');

    if (select.value) {
        phoneInput.value = select.value;
        phoneInput.disabled = true;
    } else {
        phoneInput.disabled = false;
    }
}

// Update character count for message
document.addEventListener('DOMContentLoaded', function() {
    const messageTextarea = document.getElementById('gratitudeMessage');
    if (messageTextarea) {
        messageTextarea.addEventListener('input', function() {
            const charCount = document.getElementById('messageCharCount');
            if (charCount) {
                charCount.textContent = this.value.length;
            }
        });
    }
});

async function sendGratitudeMessage() {
    const recipientPhone = document.getElementById('recipientPhone').value.trim();
    const message = document.getElementById('gratitudeMessage').value.trim();

    if (!recipientPhone) {
        showToast('Please select a contact or enter a phone number');
        return;
    }

    if (!message) {
        showToast('Please write a message');
        return;
    }

    // Strip non-numeric characters for the phone number (keep leading +)
    const cleanPhone = recipientPhone.replace(/[^\d+]/g, '');

    if (selectedChannel === 'whatsapp') {
        // Remove leading + for wa.me format
        const waPhone = cleanPhone.replace(/^\+/, '');
        const waUrl = `https://wa.me/${waPhone}?text=${encodeURIComponent(message)}`;
        window.open(waUrl, '_blank');
        showToast('Opening WhatsApp...');
    } else {
        // Use sms: URI scheme
        const smsUrl = `sms:${cleanPhone}?body=${encodeURIComponent(message)}`;
        window.location.href = smsUrl;
        showToast('Opening SMS...');
    }

    // Clear the form
    document.getElementById('recipientSelect').value = '';
    document.getElementById('recipientPhone').value = '';
    document.getElementById('recipientPhone').disabled = false;
    document.getElementById('gratitudeMessage').value = '';
    document.getElementById('messageCharCount').textContent = '0';

    // Return to home after 2 seconds
    setTimeout(() => {
        goHome();
    }, 2000);
}

// Helper function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Filter contacts by search term
function filterContacts() {
    const searchTerm = document.getElementById('contactSearchInput').value.toLowerCase().trim();
    const contactItems = document.querySelectorAll('.contact-card');
    let visibleCount = 0;

    contactItems.forEach(item => {
        const name = item.dataset.name?.toLowerCase() || '';
        const phone = item.dataset.phone?.toLowerCase() || '';
        const matches = name.includes(searchTerm) || phone.includes(searchTerm);

        item.style.display = matches ? 'flex' : 'none';
        if (matches) visibleCount++;
    });

    // Update visible count
    const countElement = document.getElementById('contactsCount');
    if (countElement) {
        countElement.textContent = `${visibleCount} contact${visibleCount !== 1 ? 's' : ''} found`;
    }
}
