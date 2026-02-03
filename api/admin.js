// Serverless function for admin operations using Firebase Admin SDK
// Handles: password reset, user deletion, user suspension

const admin = require('firebase-admin');

// Initialize Firebase Admin (only once)
if (!admin.apps.length) {
    // For Vercel: set FIREBASE_SERVICE_ACCOUNT_KEY as a JSON string in env vars
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
        ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
        : null;

    if (serviceAccount) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    } else {
        // Fallback for local development or if using default credentials
        admin.initializeApp();
    }
}

const db = admin.firestore();
const auth = admin.auth();

// Helper to verify the requesting user is an admin
async function verifyAdmin(idToken) {
    try {
        const decodedToken = await auth.verifyIdToken(idToken);
        const userId = decodedToken.uid;

        // Check user's role in Firestore
        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) return { isAdmin: false };

        const userData = userDoc.data();
        const role = userData.role;

        return {
            isAdmin: role === 'admin' || role === 'superadmin',
            isSuperAdmin: role === 'superadmin',
            userId,
            email: decodedToken.email
        };
    } catch (error) {
        console.error('Token verification error:', error);
        return { isAdmin: false };
    }
}

// Log admin action to audit trail
async function logAdminAction(adminUserId, adminEmail, action, targetUserId, details = {}) {
    try {
        await db.collection('audit_logs').add({
            userId: adminUserId,
            userEmail: adminEmail,
            action: `admin_${action}`,
            targetUserId,
            details,
            timestamp: Date.now(),
            isAdminAction: true
        });
    } catch (err) {
        console.error('Failed to log admin action:', err);
    }
}

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Get authorization token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized - No token provided' });
    }

    const idToken = authHeader.split('Bearer ')[1];
    const adminCheck = await verifyAdmin(idToken);

    if (!adminCheck.isAdmin) {
        return res.status(403).json({ error: 'Forbidden - Admin access required' });
    }

    const { action, targetUserId, data } = req.body;

    if (!action) {
        return res.status(400).json({ error: 'Action is required' });
    }

    try {
        switch (action) {
            case 'resetPassword': {
                if (!targetUserId) {
                    return res.status(400).json({ error: 'Target user ID is required' });
                }

                // Get user's email
                const targetUser = await auth.getUser(targetUserId);
                if (!targetUser.email) {
                    return res.status(400).json({ error: 'User has no email address' });
                }

                // Generate password reset link
                const resetLink = await auth.generatePasswordResetLink(targetUser.email);

                await logAdminAction(adminCheck.userId, adminCheck.email, 'password_reset', targetUserId, {
                    targetEmail: targetUser.email
                });

                return res.status(200).json({
                    success: true,
                    resetLink,
                    message: `Password reset link generated for ${targetUser.email}`
                });
            }

            case 'suspendUser': {
                if (!targetUserId) {
                    return res.status(400).json({ error: 'Target user ID is required' });
                }

                // Prevent self-suspension
                if (targetUserId === adminCheck.userId) {
                    return res.status(400).json({ error: 'Cannot suspend yourself' });
                }

                // Check if target is superadmin (only superadmin can suspend superadmin)
                const targetDoc = await db.collection('users').doc(targetUserId).get();
                if (targetDoc.exists && targetDoc.data().role === 'superadmin' && !adminCheck.isSuperAdmin) {
                    return res.status(403).json({ error: 'Only superadmin can suspend another superadmin' });
                }

                const suspend = data?.suspend !== false; // Default to true

                // Update user's suspended status in Firestore
                await db.collection('users').doc(targetUserId).set({
                    suspended: suspend,
                    suspendedAt: suspend ? Date.now() : null,
                    suspendedBy: suspend ? adminCheck.userId : null,
                    updatedAt: Date.now()
                }, { merge: true });

                // Also disable/enable the Firebase Auth account
                await auth.updateUser(targetUserId, { disabled: suspend });

                await logAdminAction(adminCheck.userId, adminCheck.email, suspend ? 'suspend_user' : 'unsuspend_user', targetUserId, {});

                return res.status(200).json({
                    success: true,
                    message: suspend ? 'User suspended successfully' : 'User unsuspended successfully'
                });
            }

            case 'deleteUser': {
                if (!targetUserId) {
                    return res.status(400).json({ error: 'Target user ID is required' });
                }

                // Only superadmin can delete users
                if (!adminCheck.isSuperAdmin) {
                    return res.status(403).json({ error: 'Only superadmin can delete users' });
                }

                // Prevent self-deletion
                if (targetUserId === adminCheck.userId) {
                    return res.status(400).json({ error: 'Cannot delete yourself' });
                }

                // Get user info before deletion for logging
                let targetEmail = 'unknown';
                try {
                    const targetUser = await auth.getUser(targetUserId);
                    targetEmail = targetUser.email || 'unknown';
                } catch (e) {
                    // User might not exist in Auth
                }

                // Delete user's Firestore data (subcollections)
                const userRef = db.collection('users').doc(targetUserId);

                // Delete sessions and their subcollections
                const sessions = await userRef.collection('sessions').get();
                for (const session of sessions.docs) {
                    const items = await session.ref.collection('items').get();
                    for (const item of items.docs) {
                        const media = await item.ref.collection('media').get();
                        for (const m of media.docs) {
                            await m.ref.delete();
                        }
                        await item.ref.delete();
                    }
                    await session.ref.delete();
                }

                // Delete contacts
                const contacts = await userRef.collection('contacts').get();
                for (const contact of contacts.docs) {
                    await contact.ref.delete();
                }

                // Delete user profile document
                await userRef.delete();

                // Delete from Firebase Auth
                try {
                    await auth.deleteUser(targetUserId);
                } catch (e) {
                    console.error('Error deleting from Auth (user may not exist):', e);
                }

                await logAdminAction(adminCheck.userId, adminCheck.email, 'delete_user', targetUserId, {
                    targetEmail
                });

                return res.status(200).json({
                    success: true,
                    message: 'User and all their data deleted successfully'
                });
            }

            case 'setRole': {
                if (!targetUserId || !data?.role) {
                    return res.status(400).json({ error: 'Target user ID and role are required' });
                }

                const validRoles = ['user', 'admin', 'superadmin'];
                if (!validRoles.includes(data.role)) {
                    return res.status(400).json({ error: 'Invalid role' });
                }

                // Only superadmin can set roles
                if (!adminCheck.isSuperAdmin) {
                    return res.status(403).json({ error: 'Only superadmin can change user roles' });
                }

                // Prevent changing own role
                if (targetUserId === adminCheck.userId) {
                    return res.status(400).json({ error: 'Cannot change your own role' });
                }

                await db.collection('users').doc(targetUserId).set({
                    role: data.role,
                    updatedAt: Date.now()
                }, { merge: true });

                await logAdminAction(adminCheck.userId, adminCheck.email, 'set_role', targetUserId, {
                    newRole: data.role
                });

                return res.status(200).json({
                    success: true,
                    message: `User role updated to ${data.role}`
                });
            }

            case 'getUsers': {
                // Get all users from Firestore
                const usersSnapshot = await db.collection('users').get();
                const users = [];

                for (const doc of usersSnapshot.docs) {
                    const userData = doc.data();

                    // Get session count
                    const sessionsSnapshot = await db.collection('users').doc(doc.id)
                        .collection('sessions').get();

                    // Get contact count
                    const contactsSnapshot = await db.collection('users').doc(doc.id)
                        .collection('contacts').get();

                    users.push({
                        id: doc.id,
                        email: userData.email || '',
                        displayName: userData.displayName || '',
                        role: userData.role || 'user',
                        suspended: userData.suspended || false,
                        lastLogin: userData.lastLogin || null,
                        createdAt: userData.createdAt || null,
                        sessionCount: sessionsSnapshot.size,
                        contactCount: contactsSnapshot.size
                    });
                }

                // Sort by email
                users.sort((a, b) => (a.email || '').localeCompare(b.email || ''));

                return res.status(200).json({ success: true, users });
            }

            case 'getAuditLogs': {
                const limit = data?.limit || 100;
                const filterUserId = data?.userId || null;

                let query = db.collection('audit_logs');
                if (filterUserId) {
                    query = query.where('userId', '==', filterUserId);
                }

                const snapshot = await query.get();
                const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                // Sort by timestamp descending
                logs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

                return res.status(200).json({
                    success: true,
                    logs: logs.slice(0, limit)
                });
            }

            default:
                return res.status(400).json({ error: 'Unknown action' });
        }
    } catch (error) {
        console.error('Admin API error:', error);
        return res.status(500).json({
            error: 'Internal server error',
            details: error.message
        });
    }
};
