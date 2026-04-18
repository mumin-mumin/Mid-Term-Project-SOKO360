// signup.js
import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.5.2/firebase-auth.js";

const auth = getAuth();

document.getElementById("signupForm").addEventListener("submit", function(e) {
    e.preventDefault();

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const messageEl = document.getElementById("message");

    createUserWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            messageEl.style.color = "green";
            messageEl.textContent = "Account created successfully!";
            setTimeout(() => {
                window.location.href = "login.html";
            }, 1000);
        })
        .catch((error) => {
            messageEl.textContent = error.message;
        });
});