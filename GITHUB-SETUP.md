# GitHub Setup for Git Operations

## Issue: Password Authentication No Longer Supported

GitHub has deprecated password authentication for Git operations. You need to use a Personal Access Token (PAT) instead.

## Solution: Create and Use a Personal Access Token

### Step 1: Create Personal Access Token

1. Go to GitHub Settings: https://github.com/settings/tokens
2. Click "Generate new token" → "Generate new token (classic)"
3. Give it a descriptive name (e.g., "Lab Management System")
4. Set expiration (recommend 90 days or no expiration for development)
5. Select scopes:
   - ✅ `repo` (Full control of private repositories)
   - ✅ `workflow` (Update GitHub Actions)
6. Click "Generate token"
7. **Important**: Copy the token immediately (you won't see it again!)

### Step 2: Use the Token for Git Operations

Option A: Use token as password
```bash
git push -u origin main
# When prompted for password, use your PAT instead of your GitHub password
```

Option B: Update remote URL with token
```bash
git remote set-url origin https://AvishkarMadhwai123:YOUR_PAT_HERE@github.com/AvishkarMadhwai123/lab-management-system.git
git push -u origin main
```

Option C: Use Git Credential Manager (Recommended)
```bash
# Configure credential helper
git config --global credential.helper manager-core

# Then push normally - it will prompt for username and token
git push -u origin main
```

### Step 3: Alternative - Use SSH (More Secure)

1. Generate SSH key:
```bash
ssh-keygen -t ed25519 -C "avishkarmadhwai123@gmail.com"
```

2. Add SSH key to GitHub:
   - Copy public key: `cat ~/.ssh/id_ed25519.pub`
   - Go to: https://github.com/settings/keys
   - Click "New SSH key"
   - Paste the public key

3. Update remote to use SSH:
```bash
git remote set-url origin git@github.com:AvishkarMadhwai123/lab-management-system.git
git push -u origin main
```

## Current Status

Your code is committed locally and ready to push. The repository contains:
- ✅ Backend server configuration
- ✅ Frontend deployment setup
- ✅ Render deployment configuration
- ✅ Complete deployment documentation

Once you set up authentication, the push will complete successfully.

## Next Steps After Push

1. Verify files are on GitHub
2. Set up Render deployment
3. Configure environment variables
4. Deploy the application
