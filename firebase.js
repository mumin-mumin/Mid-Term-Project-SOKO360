// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.5.2/firebase-app.js";
import { 
    getAuth, 
    setPersistence,
    browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/10.5.2/firebase-auth.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.5.2/firebase-analytics.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAVFvHIEz7Wi5j1KsFpMoNPhCOrxLBU6CE",
    authDomain: "event-finder-7d442.firebaseapp.com",
    projectId: "event-finder-7d442",
    storageBucket: "event-finder-7d442.firebasestorage.app",
    messagingSenderId: "941295581641",
    appId: "1:941295581641:web:7cb3d57115ac3cc3771018",
    measurementId: "G-6YY4Q8VLED"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Set authentication persistence for better security
setPersistence(auth, browserLocalPersistence).catch((error) => {
    console.error('Error setting auth persistence:', error);
});

// Initialize Analytics only in production for security
let analytics = null;
if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    try {
        analytics = getAnalytics(app);
    } catch (error) {
        console.warn('Analytics initialization failed:', error);
    }
}

// Export auth for use in other files
export { auth, analytics };
