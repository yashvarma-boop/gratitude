// Firestore Database Service for Flourishly
// Drop-in replacement for the old IndexedDB GratitudeDB class
// All data is scoped under /users/{uid}/ in Firestore
// NOTE: All sorting is done client-side to avoid needing Firestore composite indexes

class GratitudeDB {
    constructor() {
        this.uid = null;
    }

    // Initialize with user ID (called after auth)
    async init(uid) {
        if (!uid) throw new Error('User ID required for database init');
        this.uid = uid;
    }

    // Helper: get user-scoped collection reference
    _col(name) {
        if (!this.uid) throw new Error('Database not initialized - no user ID');
        if (!firestore) throw new Error('Firestore not available');
        return firestore.collection('users').doc(this.uid).collection(name);
    }

    // Create a new session (grateful or better)
    async createSession(sessionDate, items, type = 'grateful') {
        try {
            // Write session document first
            const sessionRef = this._col('sessions').doc();
            await sessionRef.set({
                sessionDate,
                type,
                createdAt: Date.now(),
                updatedAt: Date.now()
            });

            // Write items sequentially to avoid batch/subcollection issues
            for (let i = 0; i < items.length; i++) {
                const itemRef = sessionRef.collection('items').doc();
                await itemRef.set({
                    itemOrder: i + 1,
                    textContent: items[i].text || '',
                    taggedContacts: items[i].taggedContacts || [],
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                });

                // Create media
                if (items[i].media && items[i].media.length > 0) {
                    for (const mediaItem of items[i].media) {
                        const mediaRef = itemRef.collection('media').doc();
                        await mediaRef.set({
                            mediaType: mediaItem.type,
                            dataUrl: mediaItem.dataUrl,
                            fileName: mediaItem.fileName || '',
                            fileSize: mediaItem.fileSize || 0,
                            mimeType: mediaItem.mimeType || '',
                            createdAt: Date.now()
                        });
                    }
                }
            }

            return sessionRef.id;
        } catch (err) {
            console.error('createSession error:', err);
            throw err;
        }
    }

    // Get all sessions, optionally filtered by type
    // Sorting done client-side to avoid composite index requirement
    async getAllSessions(type = null) {
        try {
            let snapshot;
            if (type) {
                snapshot = await this._col('sessions').where('type', '==', type).get();
            } else {
                snapshot = await this._col('sessions').get();
            }
            const sessions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // Sort by createdAt descending (newest first)
            sessions.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
            return sessions;
        } catch (err) {
            console.error('getAllSessions error:', err);
            return [];
        }
    }

    // Get session by date and type
    async getSessionByDate(sessionDate, type = 'grateful') {
        try {
            // Use single where clause and filter client-side to avoid compound query issues
            const snapshot = await this._col('sessions')
                .where('sessionDate', '==', sessionDate)
                .get();

            if (snapshot.empty) return null;
            // Filter by type client-side
            const match = snapshot.docs.find(doc => {
                const data = doc.data();
                return (data.type || 'grateful') === type;
            });
            if (!match) return null;
            return { id: match.id, ...match.data() };
        } catch (err) {
            console.error('getSessionByDate error:', err);
            return null;
        }
    }

    // Get session with items and media
    async getSessionWithDetails(sessionId) {
        try {
            const sessionDoc = await this._col('sessions').doc(sessionId).get();
            if (!sessionDoc.exists) return null;

            const session = { id: sessionDoc.id, ...sessionDoc.data() };

            // Get items (no orderBy to avoid index requirement, sort client-side)
            const itemsSnapshot = await this._col('sessions').doc(sessionId)
                .collection('items')
                .get();

            const items = [];
            for (const itemDoc of itemsSnapshot.docs) {
                const item = { id: itemDoc.id, ...itemDoc.data() };

                // Get media for this item
                const mediaSnapshot = await this._col('sessions').doc(sessionId)
                    .collection('items').doc(itemDoc.id)
                    .collection('media')
                    .get();

                item.media = mediaSnapshot.docs.map(m => ({ id: m.id, ...m.data() }));
                items.push(item);
            }

            // Sort items by order client-side
            items.sort((a, b) => (a.itemOrder || 0) - (b.itemOrder || 0));
            return { ...session, items };
        } catch (err) {
            console.error('getSessionWithDetails error:', err);
            return null;
        }
    }

    // Delete session and all subcollections
    async deleteSession(sessionId) {
        const sessionRef = this._col('sessions').doc(sessionId);

        // Get all items
        const itemsSnapshot = await sessionRef.collection('items').get();

        const batch = firestore.batch();

        for (const itemDoc of itemsSnapshot.docs) {
            // Delete media subcollection
            const mediaSnapshot = await itemDoc.ref.collection('media').get();
            mediaSnapshot.docs.forEach(mediaDoc => batch.delete(mediaDoc.ref));
            // Delete item
            batch.delete(itemDoc.ref);
        }

        // Delete session
        batch.delete(sessionRef);
        await batch.commit();
    }

    // Update existing session
    async updateSession(sessionId, items) {
        const sessionRef = this._col('sessions').doc(sessionId);

        // Delete existing items and media
        const existingItems = await sessionRef.collection('items').get();
        const deleteBatch = firestore.batch();

        for (const itemDoc of existingItems.docs) {
            const mediaSnapshot = await itemDoc.ref.collection('media').get();
            mediaSnapshot.docs.forEach(mediaDoc => deleteBatch.delete(mediaDoc.ref));
            deleteBatch.delete(itemDoc.ref);
        }
        await deleteBatch.commit();

        // Update session timestamp
        await sessionRef.update({ updatedAt: Date.now() });

        // Create new items and media sequentially
        for (let i = 0; i < items.length; i++) {
            const itemRef = sessionRef.collection('items').doc();
            await itemRef.set({
                itemOrder: i + 1,
                textContent: items[i].text || '',
                taggedContacts: items[i].taggedContacts || [],
                createdAt: Date.now(),
                updatedAt: Date.now()
            });

            if (items[i].media && items[i].media.length > 0) {
                for (const mediaItem of items[i].media) {
                    const mediaRef = itemRef.collection('media').doc();
                    await mediaRef.set({
                        mediaType: mediaItem.type,
                        dataUrl: mediaItem.dataUrl,
                        fileName: mediaItem.fileName || '',
                        fileSize: mediaItem.fileSize || 0,
                        mimeType: mediaItem.mimeType || '',
                        createdAt: Date.now()
                    });
                }
            }
        }
        return sessionId;
    }

    // Filter sessions by date range (client-side helper)
    filterSessionsByDateRange(sessions, rangeType) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        return sessions.filter(session => {
            const sessionDate = new Date(session.sessionDate);

            switch (rangeType) {
                case 'week': {
                    const weekStart = new Date(today);
                    weekStart.setDate(today.getDate() - today.getDay());
                    return sessionDate >= weekStart;
                }
                case 'month': {
                    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
                    return sessionDate >= monthStart;
                }
                case 'year': {
                    const yearStart = new Date(today.getFullYear(), 0, 1);
                    return sessionDate >= yearStart;
                }
                default:
                    return true;
            }
        });
    }

    // Add a new contact
    async addContact(name, phoneNumber, email = null, birthday = null, photo = null) {
        const docRef = await this._col('contacts').add({
            name,
            phoneNumber,
            email,
            birthday,
            photo,
            createdAt: Date.now(),
            updatedAt: Date.now()
        });
        return docRef.id;
    }

    // Get all contacts (sorted client-side to avoid index requirement)
    async getAllContacts() {
        try {
            const snapshot = await this._col('contacts').get();
            const contacts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            contacts.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
            return contacts;
        } catch (err) {
            console.error('getAllContacts error:', err);
            return [];
        }
    }

    // Get contact by ID
    async getContact(contactId) {
        try {
            const doc = await this._col('contacts').doc(String(contactId)).get();
            if (!doc.exists) return null;
            return { id: doc.id, ...doc.data() };
        } catch (err) {
            console.error('getContact error:', err);
            return null;
        }
    }

    // Update contact
    async updateContact(contactId, name, phoneNumber, email = null, birthday = null, photo = null) {
        const id = String(contactId);
        // Use set with merge instead of update — update throws if doc doesn't exist
        await this._col('contacts').doc(id).set({
            name,
            phoneNumber,
            email,
            birthday,
            photo,
            updatedAt: Date.now()
        }, { merge: true });
        return id;
    }

    // Get upcoming birthdays (within next X days)
    async getUpcomingBirthdays(daysAhead = 7) {
        const contacts = await this.getAllContacts();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const upcomingBirthdays = [];

        contacts.forEach(contact => {
            if (!contact.birthday) return;

            const [month, day] = contact.birthday.split('-').map(Number);
            const birthdayThisYear = new Date(today.getFullYear(), month - 1, day);
            birthdayThisYear.setHours(0, 0, 0, 0);

            if (birthdayThisYear < today) {
                birthdayThisYear.setFullYear(today.getFullYear() + 1);
            }

            const timeDiff = birthdayThisYear.getTime() - today.getTime();
            const daysUntil = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

            if (daysUntil <= daysAhead) {
                upcomingBirthdays.push({
                    ...contact,
                    daysUntil,
                    birthdayDate: birthdayThisYear
                });
            }
        });

        upcomingBirthdays.sort((a, b) => a.daysUntil - b.daysUntil);
        return upcomingBirthdays;
    }

    // Get birthdays for a specific month
    async getBirthdaysForMonth(month) {
        const contacts = await this.getAllContacts();
        const monthStr = String(month).padStart(2, '0');

        const birthdaysThisMonth = contacts.filter(contact => {
            if (!contact.birthday) return false;
            const [bMonth] = contact.birthday.split('-');
            return bMonth === monthStr;
        });

        birthdaysThisMonth.sort((a, b) => {
            const dayA = parseInt(a.birthday.split('-')[1]);
            const dayB = parseInt(b.birthday.split('-')[1]);
            return dayA - dayB;
        });

        return birthdaysThisMonth;
    }

    // Delete contact
    async deleteContact(contactId) {
        await this._col('contacts').doc(String(contactId)).delete();
    }

    // Get all entries where a contact is tagged
    async getEntriesForContact(contactId) {
        try {
            const sessions = await this.getAllSessions();
            const matchingEntries = [];

            for (const session of sessions) {
                const sessionWithDetails = await this.getSessionWithDetails(session.id);
                if (!sessionWithDetails || !sessionWithDetails.items) continue;

                for (const item of sessionWithDetails.items) {
                    if (item.taggedContacts && item.taggedContacts.some(tc => tc.id === contactId)) {
                        matchingEntries.push({
                            sessionId: session.id,
                            sessionDate: session.sessionDate,
                            type: session.type || 'grateful',
                            textContent: item.textContent,
                            itemOrder: item.itemOrder
                        });
                    }
                }
            }

            // Sort by date descending
            matchingEntries.sort((a, b) => b.sessionDate.localeCompare(a.sessionDate));
            return matchingEntries;
        } catch (err) {
            console.error('getEntriesForContact error:', err);
            return [];
        }
    }

    // Get gratitude counts for all contacts (returns map of contactId -> count)
    async getGratitudeCountsForContacts() {
        try {
            const sessions = await this.getAllSessions();
            const counts = {};

            for (const session of sessions) {
                const sessionWithDetails = await this.getSessionWithDetails(session.id);
                if (!sessionWithDetails || !sessionWithDetails.items) continue;

                for (const item of sessionWithDetails.items) {
                    if (item.taggedContacts) {
                        for (const tc of item.taggedContacts) {
                            if (tc.id) {
                                counts[tc.id] = (counts[tc.id] || 0) + 1;
                            }
                        }
                    }
                }
            }

            return counts;
        } catch (err) {
            console.error('getGratitudeCountsForContacts error:', err);
            return {};
        }
    }

    // Record a sent message to a contact
    async recordSentMessage(contactId, message, channel = 'sms') {
        try {
            await this._col('contacts').doc(String(contactId))
                .collection('sentMessages').add({
                    message,
                    channel,
                    sentAt: Date.now()
                });
        } catch (err) {
            console.error('recordSentMessage error:', err);
        }
    }

    // Get sent messages for a contact
    async getSentMessagesForContact(contactId) {
        try {
            const snapshot = await this._col('contacts').doc(String(contactId))
                .collection('sentMessages').get();
            const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            messages.sort((a, b) => (b.sentAt || 0) - (a.sentAt || 0));
            return messages;
        } catch (err) {
            console.error('getSentMessagesForContact error:', err);
            return [];
        }
    }

    // ========== AUDIT LOGGING ==========

    // Log an action to the audit trail
    async logAudit(action, details = {}) {
        if (!this.uid) return; // Skip if not logged in
        try {
            await firestore.collection('audit_logs').add({
                userId: this.uid,
                userEmail: auth.currentUser?.email || 'unknown',
                action,
                details,
                timestamp: Date.now(),
                userAgent: navigator.userAgent || ''
            });
        } catch (err) {
            console.error('logAudit error:', err);
        }
    }

    // ========== USER PROFILE ==========

    // Get or create user profile document
    async getUserProfile() {
        if (!this.uid) return null;
        try {
            const doc = await firestore.collection('users').doc(this.uid).get();
            if (doc.exists) {
                return { id: doc.id, ...doc.data() };
            }
            return null;
        } catch (err) {
            console.error('getUserProfile error:', err);
            return null;
        }
    }

    // Update user profile
    async updateUserProfile(data) {
        if (!this.uid) return;
        try {
            await firestore.collection('users').doc(this.uid).set({
                ...data,
                updatedAt: Date.now()
            }, { merge: true });
        } catch (err) {
            console.error('updateUserProfile error:', err);
        }
    }

    // Record login activity
    async recordLogin() {
        if (!this.uid) return;
        try {
            // Update user profile with last login
            await firestore.collection('users').doc(this.uid).set({
                lastLogin: Date.now(),
                email: auth.currentUser?.email || '',
                displayName: auth.currentUser?.displayName || ''
            }, { merge: true });

            // Log the login event
            await this.logAudit('login', {});
        } catch (err) {
            console.error('recordLogin error:', err);
        }
    }

    // ========== ADMIN FUNCTIONS ==========

    // Check if current user is admin or superadmin
    async isAdmin() {
        const profile = await this.getUserProfile();
        console.log('isAdmin check - profile:', profile);
        console.log('isAdmin check - role:', profile?.role);
        return profile && (profile.role === 'admin' || profile.role === 'superadmin');
    }

    // Check if current user is superadmin
    async isSuperAdmin() {
        const profile = await this.getUserProfile();
        return profile && profile.role === 'superadmin';
    }

    // Get all users (admin only)
    async getAllUsers() {
        try {
            const snapshot = await firestore.collection('users').get();
            const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            users.sort((a, b) => (a.email || '').localeCompare(b.email || ''));
            return users;
        } catch (err) {
            console.error('getAllUsers error:', err);
            return [];
        }
    }

    // Get user by ID (admin only)
    async getUserById(userId) {
        try {
            const doc = await firestore.collection('users').doc(userId).get();
            if (!doc.exists) return null;
            return { id: doc.id, ...doc.data() };
        } catch (err) {
            console.error('getUserById error:', err);
            return null;
        }
    }

    // Update another user's data (admin only)
    async adminUpdateUser(userId, data) {
        try {
            await firestore.collection('users').doc(userId).set({
                ...data,
                updatedAt: Date.now()
            }, { merge: true });
            return true;
        } catch (err) {
            console.error('adminUpdateUser error:', err);
            return false;
        }
    }

    // Get audit logs (admin only)
    async getAuditLogs(limit = 100, userId = null) {
        try {
            let query = firestore.collection('audit_logs');
            if (userId) {
                query = query.where('userId', '==', userId);
            }
            const snapshot = await query.get();
            const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // Sort by timestamp descending
            logs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
            return logs.slice(0, limit);
        } catch (err) {
            console.error('getAuditLogs error:', err);
            return [];
        }
    }

    // Get user statistics (admin only)
    async getUserStats(userId) {
        try {
            // Count sessions
            const sessionsSnapshot = await firestore
                .collection('users').doc(userId)
                .collection('sessions').get();
            const sessionCount = sessionsSnapshot.size;

            // Count contacts
            const contactsSnapshot = await firestore
                .collection('users').doc(userId)
                .collection('contacts').get();
            const contactCount = contactsSnapshot.size;

            return { sessionCount, contactCount };
        } catch (err) {
            console.error('getUserStats error:', err);
            return { sessionCount: 0, contactCount: 0 };
        }
    }
}

// Initialize database (will be fully initialized after auth)
const db = new GratitudeDB();
