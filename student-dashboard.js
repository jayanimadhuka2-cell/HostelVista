
const API_URL = "http://127.0.0.1:5000/api";

const content = document.getElementById("content");
const today = document.getElementById("today");
const greeting = document.getElementById("greeting");

// --------------------------------------------------
// 1. COMMON FUNCTIONS
// --------------------------------------------------

today.textContent = new Date().toLocaleDateString();

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[char]);
}

async function apiRequest(endpoint, options = {}) {
    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        credentials: "include"
    });

    const data = await response.json();

    if (response.status === 401) {
        alert("Your login session has expired. Please login again.");
        window.location.href = "index.html";
        throw new Error("Login session missing.");
    }

    if (!response.ok) {
        throw new Error(data.message || "Request failed.");
    }

    return data;
}

// --------------------------------------------------
// 2. LOAD STUDENT PROFILE
// --------------------------------------------------

async function loadStudentProfile() {
    try {
        const data = await apiRequest("/student/profile");

        if (greeting) {
            greeting.textContent =
                `Welcome, ${data.student.name || "Student"}!`;
        }

    } catch (error) {
        console.error("Profile error:", error);
    }
}

// --------------------------------------------------
// 3. NAVIGATION
// --------------------------------------------------

function showPage(page) {

    document.querySelectorAll("nav button").forEach(button => {
        button.classList.toggle(
            "active",
            button.getAttribute("onclick") === `showPage('${page}')`
        );
    });

    const pages = {

        dashboard: `
            <div class="cards">

                <button class="card purple" onclick="showPage('booking')">
                   <span>📋</span>
                   <h3>Hostel Booking</h3>
                   <p>Request a hostel room</p>
                </button>

                <button class="card blue" onclick="showPage('allocation')">
                    <span>🛏️</span>
                    <h3>Check Hostel Allocation</h3>
                    <p>View your room details</p>
                </button>

                <button class="card green" onclick="showPage('payments')">
                    <span>💳</span>
                    <h3>Submit Payment Receipts</h3>
                    <p>Upload payment proof</p>
                </button>

                <button class="card orange" onclick="showPage('complaints')">
                    <span>⚠️</span>
                    <h3>Inform Complaints</h3>
                    <p>Water, electricity and Wi-Fi</p>
                </button>

                <button class="card purple" onclick="showPage('attendance')">
                    <span>🕒</span>
                    <h3>Record In / Out Time</h3>
                    <p>Record departure and return</p>
                </button>

            </div>

            <div class="grid">
                <div class="panel">
                    <h2>Your Hostel Allocation</h2>
                    <div id="dashboardAllocation">Loading...</div>
                </div>

                <div class="panel">
                    <h2>Quick Actions</h2>
                    <p>Use the cards above to manage your hostel activities.</p>
                </div>
            </div>

            <div id="dashboardPayments"></div>
        `,

        booking: `
    <div class="panel">
        <h2>📋 Hostel Booking Request</h2>

        <p class="note">
            Submit a request to get hostel accommodation.
        </p>

        <form onsubmit="submitBooking(event)">

            <label>Preferred Block
                <select name="preferred_block" required>
                    <option value="">Select Block</option>
                    <option value="Block A">Block A</option>
                    <option value="Block B">Block B</option>
                    <option value="Block C">Block C</option>
                    <option value="Block D">Block D</option>
                </select>
            </label>

            <label>Room Type
                <select name="room_type" required>
                    <option value="">Select Room Type</option>
                    <option value="Single">Single</option>
                    <option value="Shared">Shared</option>
                </select>
            </label>

            <label>Reason for Request
                <textarea
                    name="reason"
                    rows="4"
                    maxlength="1000"
                    placeholder="Enter your reason..."
                    required
                ></textarea>
            </label>

            <button class="action" type="submit">
                Submit Booking Request
            </button>

        </form>

        <p id="bookingMessage" class="note"></p>

        <div id="bookingHistory"></div>
    </div>
`,

        allocation: `
            <div class="panel">
                <h2>My Hostel Allocation</h2>
                <div id="allocationDetails">Loading room details...</div>
            </div>
        `,

        payments: `
            <div class="panel">
                <h2>Submit Payment Receipt</h2>

                <form id="paymentForm" onsubmit="submitPayment(event)">

                    <label>Payment type
                        <select name="type" required>
                            <option value="">Select payment</option>
                            <option value="Hostel Fee">Hostel Fee</option>
                            <option value="Electricity">Electricity</option>
                            <option value="Water Bill">Water Bill</option>
                            <option value="Other">Other</option>
                        </select>
                    </label>

                    <label>Amount (Rs.)
                        <input name="amount" type="number"
                            min="1" step="0.01" required>
                    </label>

                    <label>Payment Date
                        <input name="payment_date" type="date" required>
                    </label>

                    <label>Receipt
                        <input name="receipt" type="file"
                            accept="image/png,image/jpeg,application/pdf" required>
                    </label>

                    <button class="action" type="submit">
                        Submit Receipt
                    </button>

                </form>

                <p id="paymentMessage" class="note"></p>
            </div>

            <div id="paymentHistory"></div>
        `,

        complaints: `
    <div class="panel">
        <h2>Submit Complaint</h2>

        <form id="complaintForm" onsubmit="submitComplaint(event)">

            <label>Issue type
                <select name="category" required>
                    <option value="">Select issue</option>
                    <option value="Electricity">Electricity</option>
                    <option value="Water">Water</option>
                    <option value="Wi-Fi / Connection">Wi-Fi / Connection</option>
                    <option value="Room Maintenance">Room Maintenance</option>
                    <option value="Other">Other</option>
                </select>
            </label>

            <label>Description
                <textarea name="description"
                    required rows="4" maxlength="2000"></textarea>
            </label>

            <button class="action" type="submit">
                Submit Complaint
            </button>

        </form>

        <p id="complaintMessage" class="note"></p>
        <div id="complaintList"></div>
    </div>
`,

        attendance: `
            <div class="panel">
                <h2>Student In / Out Time</h2>

                <div id="currentAttendance" class="note">
                    Loading attendance status...
                </div>

                <div class="grid">
                    <button class="action" onclick="recordTime('check_out')">
                        Check Out
                    </button>

                    <button class="action" onclick="recordTime('check_in')">
                        Check In
                    </button>
                </div>

                <p id="timeResult" class="note"></p>

                <div id="attendanceList"></div>
            </div>
        `
    };

    content.innerHTML = pages[page] || pages.dashboard;

    // Load data according to selected page
    if (page === "dashboard") {
        loadDashboard();
    }

    if (page === "booking") {
        loadBookingHistory();
    }

    if (page === "allocation") {
        loadAllocation();
    }

    if (page === "payments") {
        loadPayments();
    }

    if (page === "complaints") {
        loadComplaints();
    }

    if (page === "attendance") {
        loadAttendance();
    }
}

// --------------------------------------------------
// 4. ROOM ALLOCATION
// --------------------------------------------------

async function loadAllocation() {

    const container = document.getElementById("allocationDetails");

    try {
        const data = await apiRequest("/student/allocation");

        const room = data.allocation;

        if (!room) {
            container.innerHTML =
                "<p class='note'>No room has been allocated yet.</p>";
            return;
        }

        container.innerHTML = `
            <p><strong>Room Number:</strong>
                ${escapeHTML(room.room_number)}</p>

            <p><strong>Bed Number:</strong>
                ${escapeHTML(room.bed_number)}</p>

            <p><strong>Block:</strong>
                ${escapeHTML(room.block)}</p>

            <p><strong>Hostel:</strong>
                ${escapeHTML(room.hostel || "Not specified")}</p>

            <p><strong>Status:</strong>
                ${escapeHTML(room.status)}</p>
        `;

    } catch (error) {
        container.textContent = error.message;
        console.error("Allocation error:", error);
    }
}

// --------------------------------------------------
// 5. PAYMENT HISTORY
// --------------------------------------------------

async function loadPayments() {

    const container = document.getElementById("paymentHistory");

    try {
        const data = await apiRequest("/student/payments");

        if (!data.payments.length) {
            container.innerHTML = `
                <div class="panel">
                    <h2>Recent Payments</h2>
                    <p class="note">No payments submitted yet.</p>
                </div>`;
            return;
        }

        container.innerHTML = `
            <div class="panel">
                <h2>Recent Payments</h2>

                <table>
                    <thead>
                        <tr>
                            <th>Amount</th>
                            <th>Date</th>
                            <th>Status</th>
                        </tr>
                    </thead>

                    <tbody>
                        ${data.payments.map(payment => `
                            <tr>
                                <td>Rs. ${escapeHTML(payment.amount)}</td>
                                <td>${escapeHTML(payment.payment_date)}</td>
                                <td>${escapeHTML(payment.status)}</td>
                            </tr>
                        `).join("")}
                    </tbody>
                </table>
            </div>
        `;

    } catch (error) {
        container.textContent = error.message;
        console.error("Payment history error:", error);
    }
}

// --------------------------------------------------
// 6. SUBMIT PAYMENT RECEIPT
// --------------------------------------------------

async function submitPayment(event) {

    event.preventDefault();

    const form = event.target;
    const message = document.getElementById("paymentMessage");

    const formData = new FormData(form);

    const file = formData.get("receipt");

    if (!file || file.size === 0) {
        message.textContent = "Please select a receipt file.";
        return;
    }

    if (file.size > 5 * 1024 * 1024) {
        message.textContent = "Receipt must be smaller than 5 MB.";
        return;
    }

    try {
        const button = form.querySelector("button[type='submit']");
        button.disabled = true;
        message.textContent = "Uploading receipt...";

        const result = await apiRequest("/student/payments", {
            method: "POST",
            body: formData
        });

        message.textContent = result.message;

        form.reset();

        await loadPayments();

    } catch (error) {
        message.textContent = error.message;
        console.error("Payment submission error:", error);

    } finally {
        const button = form.querySelector("button[type='submit']");
        if (button) button.disabled = false;
    }
}

// --------------------------------------------------
// 7. LOAD COMPLAINTS
// --------------------------------------------------

async function loadComplaints() {

    const container = document.getElementById("complaintList");

    try {
        const data = await apiRequest("/student/complaints");

        if (!data.complaints.length) {
            container.innerHTML =
                "<p class='note'>No complaints submitted yet.</p>";
            return;
        }

        container.innerHTML = `
            <h3>My Complaints</h3>

            ${data.complaints.map(item => `
                <div class="panel">
                    <h3>${escapeHTML(item.category)}</h3>

                    <p>${escapeHTML(item.description)}</p>

                    <p><strong>Status:</strong>
                        ${escapeHTML(item.status)}</p>

                    <p><strong>Admin Response:</strong>
                        ${escapeHTML(item.admin_response || "No response yet")}</p>
                </div>
            `).join("")}
        `;

    } catch (error) {
        container.textContent = error.message;
        console.error("Complaint loading error:", error);
    }
}

// --------------------------------------------------
// 8. SUBMIT COMPLAINT
// --------------------------------------------------

async function submitComplaint(event) {

    event.preventDefault();

    const form = event.target;
    const message = document.getElementById("complaintMessage");

    const formData = new FormData(form);

    const complaint = {
        category: formData.get("category"),
        description: formData.get("description")
    };

    try {
        const button = form.querySelector("button");
        button.disabled = true;

        const result = await apiRequest("/student/complaints", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(complaint)
        });

        message.textContent = result.message;

        form.reset();

        await loadComplaints();

    } catch (error) {
        message.textContent = error.message;
        console.error("Complaint submission error:", error);

    } finally {
        const button = form.querySelector("button");
        if (button) button.disabled = false;
    }
}

// Convert UTC time to Sri Lanka local time
function formatSriLankaTime(dateValue) {

    return new Date(dateValue).toLocaleString("en-GB", {
        timeZone: "Asia/Colombo",
        weekday: "short",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true
    });
}
// --------------------------------------------------
// 9. LOAD ATTENDANCE RECORDS
// --------------------------------------------------

async function loadAttendance() {

    const statusContainer =
        document.getElementById("currentAttendance");

    const listContainer =
        document.getElementById("attendanceList");

    try {
        const data = await apiRequest("/student/attendance");

        statusContainer.textContent =
            `Current Status: ${data.current_status.toUpperCase()}`;

        if (!data.records.length) {
            listContainer.innerHTML =
                "<p class='note'>No attendance records yet.</p>";
            return;
        }

        listContainer.innerHTML = `
            <h3>Attendance History</h3>

            <table>
                <thead>
                    <tr>
                        <th>Movement</th>
                        <th>Date & Time</th>
                    </tr>
                </thead>

                <tbody>
                    ${data.records.map(record => `
                        <tr>
                            <td>${escapeHTML(record.action)}</td>

                            <td>${escapeHTML(
                                formatSriLankaTime(record.created_at)
                            )}</td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        `;

    } catch (error) {
        statusContainer.textContent = error.message;
        console.error("Attendance error:", error);
    }
}


// --------------------------------------------------
// 10. RECORD CHECK IN / CHECK OUT
// --------------------------------------------------

function isLateAttendanceTime() {

    const now = new Date();

    // Get current Sri Lankan time
    const time = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Colombo",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23"
    }).format(now);

    const [hours, minutes] = time.split(":").map(Number);

    const currentMinutes = hours * 60 + minutes;

    // Late period: 8:30 PM to 5:00 AM
    const lateStart = (20 * 60) + 30;
    const lateEnd = 5 * 60;

    return (
        currentMinutes >= lateStart ||
        currentMinutes < lateEnd
    );
}


async function recordTime(action) {

    const resultContainer =
        document.getElementById("timeResult");

    // Check Sri Lankan time
    const isLate = isLateAttendanceTime();

    // Normal attendance before 8:30 PM
    // and from 5:00 AM onwards
    if (!isLate) {

        await sendAttendance(action, "", "");

        return;
    }

    // Show Late Reason Form
    resultContainer.innerHTML = `
        <div class="panel">

            <h3>Late Attendance Reason</h3>

            <p>
                You are performing a late
                ${action.replace("_", " ")}.
                Please provide a reason.
            </p>

            <label>Reason Category</label>

            <select id="lateReason" required>
                <option value="">Select reason</option>
                <option value="Medical Reason">Medical Reason</option>
                <option value="Transport Delay">Transport Delay</option>
                <option value="University Work">University Work</option>
                <option value="Personal Emergency">Personal Emergency</option>
                <option value="Other">Other</option>
            </select>

            <br><br>

            <label>Additional Details</label>

            <textarea
                id="lateDescription"
                placeholder="Explain why you are late..."
                rows="4"
                required
            ></textarea>

            <br><br>

            <button
                class="action"
                onclick="submitLateAttendance('${action}')"
            >
                Submit Late Attendance
            </button>

            <p id="lateMessage" class="note"></p>

        </div>
    `;
}


// --------------------------------------------------
// 11. SUBMIT LATE ATTENDANCE WITH REASON
// --------------------------------------------------

async function submitLateAttendance(action) {

    const reason =
        document.getElementById("lateReason").value;

    const description =
        document.getElementById("lateDescription").value.trim();

    const message =
        document.getElementById("lateMessage");

    if (!reason) {
        message.textContent = "Please select a reason.";
        return;
    }

    if (!description) {
        message.textContent = "Please enter additional details.";
        return;
    }

    await sendAttendance(action, reason, description);
}


// --------------------------------------------------
// 12. SEND ATTENDANCE DATA TO FLASK
// --------------------------------------------------

async function sendAttendance(action, reason, description) {

    const resultContainer =
        document.getElementById("timeResult");

    try {

        resultContainer.textContent =
            "Submitting attendance...";

        const result = await apiRequest(
            "/student/attendance",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    action: action,
                    late_reason: reason,
                    late_description: description
                })
            }
        );

        resultContainer.textContent = result.message;

        await loadAttendance();

    } catch (error) {

        resultContainer.textContent = error.message;

        console.error(
            "Attendance recording error:",
            error
        );
    }
}


// --------------------------------------------------
// 11. DASHBOARD OVERVIEW
// --------------------------------------------------

async function loadDashboard() {

    const allocationContainer =
        document.getElementById("dashboardAllocation");

    const paymentContainer =
        document.getElementById("dashboardPayments");

    try {
        const data = await apiRequest("/student/allocation");

        const room = data.allocation;

        if (!room) {
            allocationContainer.innerHTML =
                "<p class='note'>No room allocated yet.</p>";
        } else {
            allocationContainer.innerHTML = `
                <p>Room: ${escapeHTML(room.room_number)}</p>
                <p>Bed: ${escapeHTML(room.bed_number)}</p>
                <p>Block: ${escapeHTML(room.block)}</p>
            `;
        }

    } catch (error) {
        allocationContainer.textContent = error.message;
    }

    try {
        const data = await apiRequest("/student/payments");

        paymentContainer.innerHTML = `
            <div class="panel">
                <h2>Recent Payments</h2>

                <table>
                    <thead>
                        <tr>
                            <th>Amount</th>
                            <th>Date</th>
                            <th>Status</th>
                        </tr>
                    </thead>

                    <tbody>
                        ${data.payments.slice(0, 5).map(payment => `
                            <tr>
                                <td>Rs. ${escapeHTML(payment.amount)}</td>
                                <td>${escapeHTML(payment.payment_date)}</td>
                                <td>${escapeHTML(payment.status)}</td>
                            </tr>
                        `).join("") || `
                            <tr>
                                <td colspan="3">No payments submitted yet.</td>
                            </tr>
                        `}
                    </tbody>
                </table>
            </div>
        `;

    } catch (error) {
        paymentContainer.textContent = error.message;
    }
}

// --------------------------------------------------
// 12. LOGOUT
// --------------------------------------------------

async function logout() {

    try {
        await apiRequest("/logout", {
            method: "POST"
        });

    } catch (error) {
        console.error("Logout error:", error);

    } finally {
        sessionStorage.clear();
        window.location.href = "index.html";
    }
}

// --------------------------------------------------
// 13. START DASHBOARD
// --------------------------------------------------

showPage("dashboard");
loadStudentProfile();
// Make functions accessible to HTML buttons
window.recordTime = recordTime;
window.submitLateAttendance = submitLateAttendance;

async function loadBookingHistory() {
    const history = document.getElementById("bookingHistory");

    if (!history) return;

    history.innerHTML = '<p class="note">Loading booking history...</p>';

    try {
        const data = await apiRequest("/student/bookings");

        const bookings = data.bookings || [];

        if (bookings.length === 0) {
            history.innerHTML = `
                <p class="note">You have not submitted any booking requests yet.</p>
            `;
            return;
        }

        history.innerHTML = `
            <h3>My Booking Requests</h3>

            ${bookings.map(booking => `
                <div class="panel">
                    <p><strong>Preferred Block:</strong>
                        ${escapeHTML(booking.preferred_block)}
                    </p>

                    <p><strong>Room Type:</strong>
                        ${escapeHTML(booking.room_type)}
                    </p>

                    <p><strong>Reason:</strong>
                        ${escapeHTML(booking.reason)}
                    </p>

                    <p><strong>Status:</strong>
                        ${escapeHTML(booking.status)}
                    </p>

                    <p><strong>Admin Response:</strong>
                        ${escapeHTML(booking.admin_response || "No response yet")}
                    </p>
                </div>
            `).join("")}
        `;

    } catch (error) {
        history.innerHTML = `
            <p class="note">Could not load booking history.</p>
        `;
        console.error("Booking history error:", error);
    }
}

window.loadBookingHistory = loadBookingHistory;

async function submitBooking(event) {
    event.preventDefault();

    const form = event.target;
    const formData = new FormData(form);
    const message = document.getElementById("bookingMessage");

    const bookingData = {
        preferred_block: formData.get("preferred_block"),
        room_type: formData.get("room_type"),
        reason: formData.get("reason").trim()
    };

    message.textContent = "Submitting booking request...";

    try {
        const result = await apiRequest("/student/bookings", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(bookingData)
        });

        message.textContent = result.message;
        message.style.color = "green";

        form.reset();

        await loadBookingHistory();

    } catch (error) {
        message.textContent = error.message;
        message.style.color = "red";

        console.error("Booking submission error:", error);
    }
}

window.submitBooking = submitBooking;