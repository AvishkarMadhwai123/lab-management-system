const functions = require("firebase-functions");
const admin = require("firebase-admin");

// Initialize the Firebase Admin SDK.
// It will automatically use the project's service account credentials.
admin.initializeApp();

/**
 * This Cloud Function triggers when a document in the 'users' collection is deleted from Firestore.
 * It then securely deletes the corresponding user from Firebase Authentication using the Admin SDK.
 * This is the recommended and secure way to handle user deletion.
 *
 * @param {Object} snap - The snapshot of the deleted document.
 * @param {Object} context - The event context, containing route parameters.
 * @returns {Promise<void>} A promise that resolves when the user is deleted.
 */
exports.deleteAuthUser = functions.firestore
    .document("users/{userId}")
    .onDelete(async (snap, context) => {
        const userId = context.params.userId;
        functions.logger.log(`Triggered to delete Auth user for Firestore user ID: ${userId}`);

        try {
            // Use the Firebase Admin SDK to delete the user from Authentication.
            await admin.auth().deleteUser(userId);
            functions.logger.log(`Successfully deleted Auth user: ${userId}`);
        } catch (error) {
            // Log any errors to the Firebase console for debugging.
            functions.logger.error(`Error deleting Auth user ${userId}:`, error);
        }
    });
