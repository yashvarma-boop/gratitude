// IndexedDB Database Service
class GratitudeDB {
    constructor() {
        this.dbName = 'GratitudeDB';
        this.version = 4;
        this.db = null;
    }

    // Initialize database
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                const transaction = event.target.transaction;

                // Create sessions store
                if (!db.objectStoreNames.contains('sessions')) {
                    const sessionStore = db.createObjectStore('sessions', { keyPath: 'id', autoIncrement: true });
                    sessionStore.createIndex('sessionDate', 'sessionDate', { unique: false });
                    sessionStore.createIndex('createdAt', 'createdAt', { unique: false });
                    sessionStore.createIndex('type', 'type', { unique: false });
                    sessionStore.createIndex('typeDate', ['type', 'sessionDate'], { unique: true });
                }

                // Create items store
                if (!db.objectStoreNames.contains('items')) {
                    const itemStore = db.createObjectStore('items', { keyPath: 'id', autoIncrement: true });
                    itemStore.createIndex('sessionId', 'sessionId', { unique: false });
                    itemStore.createIndex('itemOrder', 'itemOrder', { unique: false });
                }

                // Create media store
                if (!db.objectStoreNames.contains('media')) {
                    const mediaStore = db.createObjectStore('media', { keyPath: 'id', autoIncrement: true });
                    mediaStore.createIndex('itemId', 'itemId', { unique: false });
                }

                // Create contacts store
                if (!db.objectStoreNames.contains('contacts')) {
                    const contactStore = db.createObjectStore('contacts', { keyPath: 'id', autoIncrement: true });
                    contactStore.createIndex('name', 'name', { unique: false });
                    contactStore.createIndex('phoneNumber', 'phoneNumber', { unique: false });
                    contactStore.createIndex('birthday', 'birthday', { unique: false });
                }

                // Add birthday index to existing contacts store (for upgrade from v2 to v3)
                if (event.oldVersion < 3 && db.objectStoreNames.contains('contacts')) {
                    const contactStore = transaction.objectStore('contacts');
                    if (!contactStore.indexNames.contains('birthday')) {
                        contactStore.createIndex('birthday', 'birthday', { unique: false });
                    }
                }

                // Upgrade from v3 to v4: add type field and indexes to sessions
                if (event.oldVersion >= 1 && event.oldVersion < 4 && db.objectStoreNames.contains('sessions')) {
                    const sessionStore = transaction.objectStore('sessions');

                    // Add type and typeDate indexes
                    if (!sessionStore.indexNames.contains('type')) {
                        sessionStore.createIndex('type', 'type', { unique: false });
                    }
                    if (!sessionStore.indexNames.contains('typeDate')) {
                        sessionStore.createIndex('typeDate', ['type', 'sessionDate'], { unique: true });
                    }

                    // Drop the old unique sessionDate index and recreate as non-unique
                    if (sessionStore.indexNames.contains('sessionDate')) {
                        sessionStore.deleteIndex('sessionDate');
                        sessionStore.createIndex('sessionDate', 'sessionDate', { unique: false });
                    }

                    // Migrate existing sessions: add type='grateful' to all
                    const cursorRequest = sessionStore.openCursor();
                    cursorRequest.onsuccess = (e) => {
                        const cursor = e.target.result;
                        if (cursor) {
                            const session = cursor.value;
                            if (!session.type) {
                                session.type = 'grateful';
                                cursor.update(session);
                            }
                            cursor.continue();
                        }
                    };
                }
            };
        });
    }

    // Create a new session (grateful or better)
    async createSession(sessionDate, items, type = 'grateful') {
        const transaction = this.db.transaction(['sessions', 'items', 'media'], 'readwrite');
        const sessionStore = transaction.objectStore('sessions');
        const itemStore = transaction.objectStore('items');
        const mediaStore = transaction.objectStore('media');

        // Create session
        const session = {
            sessionDate,
            type,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        const sessionRequest = sessionStore.add(session);

        return new Promise((resolve, reject) => {
            sessionRequest.onsuccess = async () => {
                const sessionId = sessionRequest.result;

                // Create items
                for (let i = 0; i < items.length; i++) {
                    const itemData = {
                        sessionId,
                        itemOrder: i + 1,
                        textContent: items[i].text,
                        createdAt: Date.now(),
                        updatedAt: Date.now()
                    };

                    const itemRequest = itemStore.add(itemData);

                    await new Promise((resolveItem) => {
                        itemRequest.onsuccess = async () => {
                            const itemId = itemRequest.result;

                            // Create media attachments
                            if (items[i].media && items[i].media.length > 0) {
                                for (const mediaItem of items[i].media) {
                                    const mediaData = {
                                        itemId,
                                        mediaType: mediaItem.type,
                                        dataUrl: mediaItem.dataUrl,
                                        fileName: mediaItem.fileName,
                                        fileSize: mediaItem.fileSize,
                                        mimeType: mediaItem.mimeType,
                                        createdAt: Date.now()
                                    };
                                    await new Promise(resolveMedia => {
                                        const mediaRequest = mediaStore.add(mediaData);
                                        mediaRequest.onsuccess = () => resolveMedia();
                                    });
                                }
                            }
                            resolveItem();
                        };
                    });
                }

                resolve(sessionId);
            };

            transaction.onerror = () => reject(transaction.error);
        });
    }

    // Get all sessions, optionally filtered by type
    async getAllSessions(type = null) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['sessions'], 'readonly');
            const store = transaction.objectStore('sessions');
            const index = store.index('createdAt');
            const request = index.openCursor(null, 'prev'); // Newest first

            const sessions = [];
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    const session = cursor.value;
                    // Filter by type if specified; treat sessions without type as 'grateful'
                    if (type === null || (session.type || 'grateful') === type) {
                        sessions.push(session);
                    }
                    cursor.continue();
                } else {
                    resolve(sessions);
                }
            };

            request.onerror = () => reject(request.error);
        });
    }

    // Get session by date and type
    async getSessionByDate(sessionDate, type = 'grateful') {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['sessions'], 'readonly');
            const store = transaction.objectStore('sessions');
            const index = store.index('typeDate');
            const request = index.get([type, sessionDate]);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Get session with items and media
    async getSessionWithDetails(sessionId) {
        const session = await new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['sessions'], 'readonly');
            const store = transaction.objectStore('sessions');
            const request = store.get(sessionId);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });

        if (!session) return null;

        // Get items
        const items = await new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['items'], 'readonly');
            const store = transaction.objectStore('items');
            const index = store.index('sessionId');
            const request = index.getAll(sessionId);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });

        // Get media for each item
        for (let item of items) {
            item.media = await new Promise((resolve, reject) => {
                const transaction = this.db.transaction(['media'], 'readonly');
                const store = transaction.objectStore('media');
                const index = store.index('itemId');
                const request = index.getAll(item.id);

                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        }

        // Sort items by order
        items.sort((a, b) => a.itemOrder - b.itemOrder);

        return { ...session, items };
    }

    // Delete session
    async deleteSession(sessionId) {
        // First get all items to delete their media
        const items = await new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['items'], 'readonly');
            const store = transaction.objectStore('items');
            const index = store.index('sessionId');
            const request = index.getAll(sessionId);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });

        // Delete media for each item
        for (const item of items) {
            await new Promise((resolve, reject) => {
                const transaction = this.db.transaction(['media'], 'readwrite');
                const store = transaction.objectStore('media');
                const index = store.index('itemId');
                const request = index.openCursor(IDBKeyRange.only(item.id));

                request.onsuccess = (event) => {
                    const cursor = event.target.result;
                    if (cursor) {
                        cursor.delete();
                        cursor.continue();
                    } else {
                        resolve();
                    }
                };

                request.onerror = () => reject(request.error);
            });
        }

        // Delete items
        await new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['items'], 'readwrite');
            const store = transaction.objectStore('items');
            const index = store.index('sessionId');
            const request = index.openCursor(IDBKeyRange.only(sessionId));

            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    cursor.delete();
                    cursor.continue();
                } else {
                    resolve();
                }
            };

            request.onerror = () => reject(request.error);
        });

        // Delete session
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['sessions'], 'readwrite');
            const store = transaction.objectStore('sessions');
            const request = store.delete(sessionId);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // Update existing session
    async updateSession(sessionId, items) {
        // Delete existing items and media
        const existingItems = await new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['items'], 'readonly');
            const store = transaction.objectStore('items');
            const index = store.index('sessionId');
            const request = index.getAll(sessionId);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });

        // Delete media for each item
        for (const item of existingItems) {
            await new Promise((resolve, reject) => {
                const transaction = this.db.transaction(['media'], 'readwrite');
                const store = transaction.objectStore('media');
                const index = store.index('itemId');
                const request = index.openCursor(IDBKeyRange.only(item.id));

                request.onsuccess = (event) => {
                    const cursor = event.target.result;
                    if (cursor) {
                        cursor.delete();
                        cursor.continue();
                    } else {
                        resolve();
                    }
                };

                request.onerror = () => reject(request.error);
            });
        }

        // Delete items
        await new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['items'], 'readwrite');
            const store = transaction.objectStore('items');
            const index = store.index('sessionId');
            const request = index.openCursor(IDBKeyRange.only(sessionId));

            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    cursor.delete();
                    cursor.continue();
                } else {
                    resolve();
                }
            };

            request.onerror = () => reject(request.error);
        });

        // Update session timestamp
        await new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['sessions'], 'readwrite');
            const store = transaction.objectStore('sessions');
            const getRequest = store.get(sessionId);

            getRequest.onsuccess = () => {
                const session = getRequest.result;
                session.updatedAt = Date.now();
                const updateRequest = store.put(session);
                updateRequest.onsuccess = () => resolve();
                updateRequest.onerror = () => reject(updateRequest.error);
            };

            getRequest.onerror = () => reject(getRequest.error);
        });

        // Create new items and media
        const transaction = this.db.transaction(['items', 'media'], 'readwrite');
        const itemStore = transaction.objectStore('items');
        const mediaStore = transaction.objectStore('media');

        for (let i = 0; i < items.length; i++) {
            const itemData = {
                sessionId,
                itemOrder: i + 1,
                textContent: items[i].text,
                createdAt: Date.now(),
                updatedAt: Date.now()
            };

            const itemRequest = itemStore.add(itemData);

            await new Promise((resolveItem) => {
                itemRequest.onsuccess = async () => {
                    const itemId = itemRequest.result;

                    // Create media attachments
                    if (items[i].media && items[i].media.length > 0) {
                        for (const mediaItem of items[i].media) {
                            const mediaData = {
                                itemId,
                                mediaType: mediaItem.type,
                                dataUrl: mediaItem.dataUrl,
                                fileName: mediaItem.fileName,
                                fileSize: mediaItem.fileSize,
                                mimeType: mediaItem.mimeType,
                                createdAt: Date.now()
                            };
                            await new Promise(resolveMedia => {
                                const mediaRequest = mediaStore.add(mediaData);
                                mediaRequest.onsuccess = () => resolveMedia();
                            });
                        }
                    }
                    resolveItem();
                };
            });
        }

        return sessionId;
    }

    // Filter sessions by date range
    filterSessionsByDateRange(sessions, rangeType) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        return sessions.filter(session => {
            const sessionDate = new Date(session.sessionDate);

            switch (rangeType) {
                case 'week': {
                    const weekStart = new Date(today);
                    weekStart.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
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
        const transaction = this.db.transaction(['contacts'], 'readwrite');
        const contactStore = transaction.objectStore('contacts');

        const contact = {
            name,
            phoneNumber,
            birthday,
            photo,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        return new Promise((resolve, reject) => {
            const request = contactStore.add(contact);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Get all contacts
    async getAllContacts() {
        const transaction = this.db.transaction(['contacts'], 'readonly');
        const contactStore = transaction.objectStore('contacts');

        return new Promise((resolve, reject) => {
            const request = contactStore.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Get contact by ID
    async getContact(contactId) {
        const transaction = this.db.transaction(['contacts'], 'readonly');
        const contactStore = transaction.objectStore('contacts');

        return new Promise((resolve, reject) => {
            const request = contactStore.get(contactId);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Update contact
    async updateContact(contactId, name, phoneNumber, birthday = null, photo = null) {
        const transaction = this.db.transaction(['contacts'], 'readwrite');
        const contactStore = transaction.objectStore('contacts');

        return new Promise((resolve, reject) => {
            const getRequest = contactStore.get(contactId);
            getRequest.onsuccess = () => {
                const contact = getRequest.result;
                if (contact) {
                    contact.name = name;
                    contact.phoneNumber = phoneNumber;
                    contact.birthday = birthday;
                    contact.photo = photo;
                    contact.updatedAt = Date.now();

                    const updateRequest = contactStore.put(contact);
                    updateRequest.onsuccess = () => resolve(updateRequest.result);
                    updateRequest.onerror = () => reject(updateRequest.error);
                } else {
                    reject(new Error('Contact not found'));
                }
            };
            getRequest.onerror = () => reject(getRequest.error);
        });
    }

    // Get upcoming birthdays (within next X days)
    async getUpcomingBirthdays(daysAhead = 7) {
        const contacts = await this.getAllContacts();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const upcomingBirthdays = [];

        contacts.forEach(contact => {
            if (!contact.birthday) return;

            // Parse birthday (stored as MM-DD format)
            const [month, day] = contact.birthday.split('-').map(Number);

            // Create this year's birthday date
            const birthdayThisYear = new Date(today.getFullYear(), month - 1, day);
            birthdayThisYear.setHours(0, 0, 0, 0);

            // If birthday has passed this year, check next year
            if (birthdayThisYear < today) {
                birthdayThisYear.setFullYear(today.getFullYear() + 1);
            }

            // Calculate days until birthday
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

        // Sort by days until birthday
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

        // Sort by day of month
        birthdaysThisMonth.sort((a, b) => {
            const dayA = parseInt(a.birthday.split('-')[1]);
            const dayB = parseInt(b.birthday.split('-')[1]);
            return dayA - dayB;
        });

        return birthdaysThisMonth;
    }

    // Delete contact
    async deleteContact(contactId) {
        const transaction = this.db.transaction(['contacts'], 'readwrite');
        const contactStore = transaction.objectStore('contacts');

        return new Promise((resolve, reject) => {
            const request = contactStore.delete(contactId);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
}

// Initialize database
const db = new GratitudeDB();
