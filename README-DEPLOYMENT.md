# ECE Lab Management System - Render Deployment Guide

This guide will help you deploy the ECE Lab Management System on Render.com.

## 🚀 Quick Deployment Steps

### 1. Prepare Your Firebase Service Account

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `ece-lab-managment`
3. Go to Project Settings → Service Accounts
4. Click "Generate new private key"
5. Save the JSON file securely

### 2. Set Up Render Environment Variables

For the **Backend Service** (`lab-management-backend`):

```
FIREBASE_PROJECT_ID=ece-lab-managment
FIREBASE_CLIENT_EMAIL=your-service-account-email@ece-lab-managment.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
NODE_ENV=production
PORT=3001
```

**Note**: Copy the values from your Firebase service account JSON file.

### 3. Deploy to Render

1. Push your code to a GitHub repository
2. Go to [Render Dashboard](https://dashboard.render.com/)
3. Click "New +" → "Web Service"
4. Connect your GitHub repository
5. Select the `backend` folder for the backend service
6. Configure environment variables (step 2)
7. Deploy the backend

For the frontend:
1. Create another "Web Service"
2. Select the `frontend` folder
3. Set runtime to "Static"
4. Deploy the frontend

### 4. Update Frontend Configuration

After deployment, update the API URL in `frontend/api-config.js`:

```javascript
// Change this line to your actual backend URL
return 'https://your-actual-backend-name.onrender.com';
```

## 📁 Project Structure

```
lan-management-system/
├── backend/                 # Node.js API server
│   ├── server.js           # Express server with Firebase Admin
│   ├── package.json        # Backend dependencies
│   └── .env.example        # Environment variables template
├── frontend/               # Static website
│   ├── index.html          # Login page
│   ├── firebase-config.js  # Firebase client configuration
│   ├── api-config.js       # API endpoint configuration
│   ├── utils.js            # Shared utilities
│   ├── login.js            # Login functionality
│   └── [other HTML/JS files]
├── render.yaml             # Render deployment configuration
└── README-DEPLOYMENT.md    # This file
```

## 🔧 Key Changes Made

### Backend Changes
- **Replaced Firebase Functions** with Express.js server
- **Added CORS support** for cross-origin requests
- **Implemented health check** endpoint
- **Added proper error handling** and logging
- **Environment-based configuration** for security

### Frontend Changes
- **API client abstraction** for backend communication
- **Environment-aware URL configuration** 
- **Improved error handling** and user feedback
- **Session management** for user state

### Security Improvements
- **Environment variables** for sensitive Firebase credentials
- **Server-side Firebase Admin SDK** for secure operations
- **CORS configuration** for API access
- **Input validation** and sanitization

## 🌐 Accessing Your Application

After deployment:
- **Frontend**: `https://lab-management-frontend.onrender.com`
- **Backend API**: `https://lab-management-backend.onrender.com`
- **Health Check**: `https://lab-management-backend.onrender.com/api/health`

## 🛠️ Local Development

### Backend
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your Firebase credentials
npm start
```

### Frontend
```bash
cd frontend
# Use any static file server
npx serve .
# Or use Python
python -m http.server 8000
```

## 🔍 Testing the Deployment

1. **Backend Health Check**: Visit `/api/health` endpoint
2. **Frontend Loading**: Access the main URL
3. **Login Functionality**: Test with existing user credentials
4. **API Integration**: Verify backend calls work correctly

## 🚨 Troubleshooting

### Common Issues

**Backend fails to start:**
- Check environment variables in Render dashboard
- Verify Firebase service account credentials
- Check Render logs for error messages

**Frontend can't reach backend:**
- Verify backend URL in `api-config.js`
- Check CORS configuration
- Ensure backend is deployed and running

**Firebase Authentication issues:**
- Verify Firebase project configuration
- Check allowed domains in Firebase Auth settings
- Ensure API key is correct in `firebase-config.js`

### Getting Help

1. Check Render service logs
2. Verify Firebase console settings
3. Test API endpoints directly
4. Check browser console for JavaScript errors

## 📝 Maintenance

- **Monitor**: Check Render service health regularly
- **Updates**: Update dependencies in `package.json`
- **Security**: Rotate Firebase service account keys periodically
- **Backups**: Regularly backup Firestore database

## 🔄 Continuous Deployment

The `render.yaml` file enables automatic deployments when you push to GitHub. Ensure:
- Your repository is connected to Render
- Auto-deploy is enabled for both services
- Environment variables are properly configured
