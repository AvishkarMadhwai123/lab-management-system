const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Initialize Firebase Admin SDK
const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

/**
 * API Routes
 */

// Delete Auth User (replaces Firebase Function)
app.delete('/api/users/:userId', async (req, res) => {
  const userId = req.params.userId;
  console.log(`Request to delete Auth user: ${userId}`);

  try {
    await admin.auth().deleteUser(userId);
    console.log(`Successfully deleted Auth user: ${userId}`);
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error(`Error deleting Auth user ${userId}:`, error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      message: 'Failed to delete user'
    });
  }
});

// Get user info (additional utility)
app.get('/api/users/:userId', async (req, res) => {
  const userId = req.params.userId;
  
  try {
    const userRecord = await admin.auth().getUser(userId);
    res.json({ 
      success: true, 
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        emailVerified: userRecord.emailVerified,
        displayName: userRecord.displayName,
        disabled: userRecord.disabled
      }
    });
  } catch (error) {
    console.error(`Error getting user ${userId}:`, error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Serve frontend for all other routes (SPA support)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
});

module.exports = app;
