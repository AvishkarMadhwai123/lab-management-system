// login.js
// Import Firebase services from our centralized config file
import { app } from './firebase-config.js';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Import our shared utility function
import { showMessage } from './utils.js';

// Initialize Firebase services
const auth = getAuth(app);
const db = getFirestore(app);

// Get DOM elements for forms and messages
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const toggleToRegisterBtn = document.getElementById('toggleToRegisterBtn');
const toggleToLoginBtn = document.getElementById('toggleToLoginBtn');
const messageContainerId = 'message-container';

/**
 * Toggles between the login and register forms.
 * @param {string} formName - The name of the form to show ('login' or 'register').
 */
function toggleForms(formName) {
    const loginFormContainer = document.getElementById('loginFormContainer');
    const registerFormContainer = document.getElementById('registerFormContainer');
    
    if (formName === 'login') {
        loginFormContainer.classList.remove('hidden');
        registerFormContainer.classList.add('hidden');
    } else {
        loginFormContainer.classList.add('hidden');
        registerFormContainer.classList.remove('hidden');
    }
}

// Event listener for login form submission
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Fetch user role from Firestore
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        
        if (userDoc.exists()) {
            const userData = userDoc.data();
            
            // Redirect based on user role
            switch (userData.role) {
                case 'student':
                    window.location.href = 'student_dashboard.html';
                    break;
                case 'assistant':
                    window.location.href = 'assistant_dashboard.html';
                    break;
                case 'incharge': // New redirection for incharge
                    window.location.href = 'incharge_dashboard.html';
                    break;
                case 'master':
                    if (userData.approved === true) {
                        window.location.href = 'master_dashboard.html';
                    } else {
                        showMessage('Your master admin account is pending approval.', 'error', messageContainerId);
                        await signOut(auth);
                    }
                    break;
                default:
                    showMessage('Unknown user role. Please contact support.', 'error', messageContainerId);
                    await signOut(auth);
            }
        } else {
            showMessage('User data not found. Please contact support.', 'error', messageContainerId);
            await signOut(auth);
        }
    } catch (error) {
        console.error("Login error:", error);
        showMessage(`Login failed: ${error.code}`, 'error', messageContainerId);
    }
});

// Event listener for register form submission
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const role = document.getElementById('registerRole').value;

    if (password !== confirmPassword) {
        showMessage('Passwords do not match.', 'error', messageContainerId);
        return;
    }
    
    if (!name) {
        showMessage('Please enter your full name.', 'error', messageContainerId);
        return;
    }

    try {
        // Create user in Firebase Authentication
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Create the user document in Firestore with the new name field
        await setDoc(doc(db, 'users', user.uid), {
            name: name,
            email: email,
            role: role,
            approved: true, // All public registrations are auto-approved
            createdAt: serverTimestamp(), // Use server timestamp for consistency
        });
        
        showMessage('Registration successful! You can now log in.', 'success', messageContainerId);
        registerForm.reset();
        toggleForms('login');
        
    } catch (error) {
        console.error("Registration error:", error);
        showMessage(`Registration failed: ${error.code}`, 'error', messageContainerId);
    }
});

// Event listeners for toggling forms
toggleToRegisterBtn.addEventListener('click', (e) => {
    e.preventDefault();
    toggleForms('register');
});

toggleToLoginBtn.addEventListener('click', (e) => {
    e.preventDefault();
    toggleForms('login');
});
