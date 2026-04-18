import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.5.2/firebase-auth.js";

document.addEventListener("DOMContentLoaded", function() {
    const form = document.getElementById("loginForm");

    form.addEventListener("submit", function(e) {
        e.preventDefault();

        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;
        const message = document.getElementById("message");

        const auth = getAuth();

        signInWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                // Login successful
                message.style.color = "green";
                message.textContent = "Login successful!";
                setTimeout(() => {
                    window.location.href = "index.html"; // or index.html
                }, 1000);
            })
            .catch((error) => {
                // Error during login
                message.style.color = "red";
                message.textContent = "Invalid email or password!";
                console.error("Login error:", error);
            });
    });
});