// Firestore Database Service for Flourishly
// Drop-in replacement for the old IndexedDB GratitudeDB class
// All data is scoped under /users/{uid}/ in Firestore

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
        return firestore.collection('users').doc(this.uid).collection(name);
    }

    // Create a new session (grateful or better)
    async createSession(sessionDate, items, type = 'grateful') {
        const sessionRef = this._col('sessions').doc();
        const sessionData = {
            sessionDate,
            type,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        const batch = firestore.batch();
        batch.set(sessionRef, sessionData);

        // Create items as subcollection
        for (let i = 0; i < items.length; i++) {
            const itemRef = sessionRef.collection('items').doc();
            const itemData = {
                itemOrder: i + 1,
                textContent: items[i].text,
                createdAt: Date.now(),
                updatedAt: Date.now()
            };
            batch.set(itemRef, itemData);

            // Create media as subcollection of items
            if (items[i].media && items[i].media.length > 0) {
                for (const mediaItem of items[i].media) {
                    const mediaRef = itemRef.collection('media').doc();
                    batch.set(mediaRef, {
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

        await batch.commit();
        return sessionRef.id;
    }

    // Get all sessions, optionally filtered by type
    async getAllSessions(type = null) {
        let query = this._col('sessions');
        if (type) {
            query = query.where('type', '==', type);
        }
        query = query.orderBy('createdAt', 'desc');
        const snapshot = await query.get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    // Get session by date and type
    async getSessionByDate(sessionDate, type = 'grateful') {
        const snapshot = await this._col('sessions')
            .where('sessionDate', '==', sessionDate)
            .where('type', '==', type)
            .limit(1)
            .get();

        if (snapshot.empty) return null;
        const doc = snapshot.docs[0];
        return { id: doc.id, ...doc.data() };
    }

    // Get session with items and media
    async getSessionWithDetails(sessionId) {
        const sessionDoc = await this._col('sessions').doc(sessionId).get();
        if (!sessionDoc.exists) return null;

        const session = { id: sessionDoc.id, ...sessionDoc.data() };

        // Get items
        const itemsSnapshot = await this._col('sessions').doc(sessionId)
            .collection('items')
            .orderBy('itemOrder')
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

        items.sort((a, b) => a.itemOrder - b.itemOrder);
        return { ...session, items };
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

        // Create new items and media
        const createBatch = firestore.batch();
        for (let i = 0; i < items.length; i++) {
            const itemRef = sessionRef.collection('items').doc();
            createBatch.set(itemRef, {
                itemOrder: i + 1,
                textContent: items[i].text,
                createdAt: Date.now(),
                updatedAt: Date.now()
            });

            if (items[i].media && items[i].media.length > 0) {
                for (const mediaItem of items[i].media) {
                    const mediaRef = itemRef.collection('media').doc();
                    createBatch.set(mediaRef, {
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
        await createBatch.commit();
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
    async addContact(name, phoneNumber, birthday = null, photo = null) {
        const docRef = await this._col('contacts').add({
            name,
            phoneNumber,
            birthday,
            photo,
            createdAt: Date.now(),
            updatedAt: Date.now()
        });
        return docRef.id;
    }

    // Get all contacts
    async getAllContacts() {
        const snapshot = await this._col('contacts').orderBy('name').get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    // Get contact by ID
    async getContact(contactId) {
        const doc = await this._col('contacts').doc(contactId).get();
        if (!doc.exists) return null;
        return { id: doc.id, ...doc.data() };
    }

    // Update contact
    async updateContact(contactId, name, phoneNumber, birthday = null, photo = null) {
        await this._col('contacts').doc(contactId).update({
            name,
            phoneNumber,
            birthday,
            photo,
            updatedAt: Date.now()
        });
        return contactId;
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
        await this._col('contacts').doc(contactId).delete();
    }
}

// Initialize database (will be fully initialized after auth)
const db = new GratitudeDB();
