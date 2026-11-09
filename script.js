
const API_URL = "http://127.0.0.1:5000/api";

let selectedRole = "student";

// --------------------------------------------------
// 1. ROLE SELECTOR
// --------------------------------------------------

const roleButtons = document.querySelectorAll(".role-btn");

roleButtons.forEach((button) => {
    button.addEventListener("click", () => {

        roleButtons.forEach((btn) => {
            btn.classList.remove("active");
            btn.setAttribute("aria-pressed", "false");
        });

        button.classList.add("active");
        button.setAttribute("aria-pressed", "true");

        selectedRole = button.dataset.role.toLowerCase();
    });
});

// --------------------------------------------------
// 2. PASSWORD SHOW / HIDE
// --------------------------------------------------

const passwordInput = document.querySelector("#password");
const passwordToggle = document.querySelector(".password-toggle");

if (passwordInput && passwordToggle) {

    passwordToggle.addEventListener("click", () => {

        const show = passwordInput.type === "password";

        passwordInput.type = show ? "text" : "password";

        passwordToggle.textContent = show ? "Hide" : "Show";

        passwordToggle.setAttribute(
            "aria-pressed",
            String(show)
        );
    });
}

// --------------------------------------------------
// 3. LOGIN FORM
// --------------------------------------------------

const loginForm = document.querySelector("#loginForm");
const message = document.querySelector(".message");

if (loginForm && message && passwordInput) {

    loginForm.addEventListener("submit", async (event) => {

        event.preventDefault();

        const emailInput =
            loginForm.querySelector('input[type="email"]');

        if (!emailInput) {
            message.textContent = "Email input not found.";
            return;
        }

        const email = emailInput.value.trim().toLowerCase();
        const password = passwordInput.value;

        if (!email || !password) {
            message.textContent =
                "Please enter your email and password.";
            return;
        }

        message.textContent = "Signing in...";

        const submitButton =
            loginForm.querySelector('button[type="submit"]');

        if (submitButton) {
            submitButton.disabled = true;
        }

        try {

            // Send login request to Flask
            const response = await fetch(`${API_URL}/login`, {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                // IMPORTANT: Receive Flask session cookie
                credentials: "include",

                body: JSON.stringify({
                    email: email,
                    password: password,
                    role: selectedRole
                })
            });

            const data = await response.json();

            if (!response.ok) {

                message.textContent =
                    data.message || "Login failed.";

                return;
            }

            if (!data.success) {

                message.textContent =
                    data.message || "Login failed.";

                return;
            }

            // Save basic user information
            sessionStorage.setItem(
                "hostelvistaRole",
                data.role
            );

            sessionStorage.setItem(
                "hostelvistaUser",
                JSON.stringify({
                    name: data.name,
                    email: data.email || email,
                    role: data.role
                })
            );

            message.textContent = "Login successful!";

            console.log("Login successful:", data);

            // Navigate according to authenticated role
            if (data.role === "admin") {

                window.location.href = "admin-dashboard.html";

            } else if (data.role === "student") {

                window.location.href = "student-dashboard.html";

            } else {

                message.textContent = "Invalid user role.";
            }

        } catch (error) {

            console.error("Login error:", error);

            message.textContent =
                "Cannot connect to the server. Check that Flask is running.";

        } finally {

            if (submitButton) {
                submitButton.disabled = false;
            }
        }
    });
}
