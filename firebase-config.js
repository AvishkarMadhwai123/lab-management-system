// firebase-config.js
// This file centralizes the Firebase project configuration.
// All other scripts will import the initialized 'app' instance from here.

// Import the initializeApp function from the Firebase SDK.
// We are using version 11.6.1 for consistency across the project.
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";

// Your web app's Firebase configuration object.
// This is sensitive information and is now in one place.
const firebaseConfig = {
    apiKey: "AIzaSyCBkJntTLry-6OghT0wCu7Gk2exl4XgymI",
    authDomain: "ece-lab-managment.firebaseapp.com",
    projectId: "ece-lab-managment",
    storageBucket: "ece-lab-managment.appspot.com",
    messagingSenderId: "1051589054565",
    appId: "1:1051589054565:web:67a224a78dbfe4789d768c"
};

// Initialize Firebase with the configuration object.
const app = initializeApp(firebaseConfig);

// Export the initialized app instance so it can be used in other modules.
// This ensures we only initialize Firebase once in the entire application.
export { app };
