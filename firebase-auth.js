// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCmNtIlstA1Nrewm4mu1XZALfBopNpKETg",
    authDomain: "prime-picks-87914.firebaseapp.com",
    projectId: "prime-picks-87914",
    storageBucket: "prime-picks-87914.appspot.com",
    messagingSenderId: "781853259122",
    appId: "1:781853259122:web:6d958c3fe27f91b90999eb",
    measurementId: "G-S6S33N41F1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Sign Up
const signupForm = document.querySelector('#signup-form');
if (signupForm) {
    signupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = signupForm.email.value;
        const password = signupForm.password.value;

        createUserWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                // Signed in 
                const user = userCredential.user;
                console.log('User created:', user);
                alert('Account created successfully!');
                window.location.href = 'signin.html';
            })
            .catch((error) => {
                const errorCode = error.code;
                const errorMessage = error.message;
                console.error('Sign up error:', errorMessage);
                alert(`Error: ${errorMessage}`);
            });
    });
}

// Sign In
const signinForm = document.querySelector('#signin-form');
if (signinForm) {
    signinForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = signinForm.email.value;
        const password = signinForm.password.value;

        signInWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                // Signed in 
                const user = userCredential.user;
                console.log('User signed in:', user);
                alert('Signed in successfully!');
                window.location.href = 'shop.html';
            })
            .catch((error) => {
                const errorCode = error.code;
                const errorMessage = error.message;
                console.error('Sign in error:', errorMessage);
                alert(`Error: ${errorMessage}`);
            });
    });
}