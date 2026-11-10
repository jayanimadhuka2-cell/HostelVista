
const content = document.getElementById("content");

document.getElementById("today").textContent =
  new Date().toLocaleDateString();

function showPage(page) {
  document.querySelectorAll("nav button").forEach((button) => {
    button.classList.toggle(
      "active",
      button.getAttribute("onclick") === `showPage('${page}')`
    );
  });

  const pages = {
    dashboard: `
      <div class="cards">
        <button class="card blue" onclick="showPage('students')">
          <span>👥</span><h3>Total Students</h3>
          <p>Manage registered hostel students</p>
        </button>
        <button class="card green" onclick="showPage('rooms')">
          <span>🛏️</span><h3>Room Management</h3>
          <p>View rooms and availability</p>
        </button>
        <button class="card orange" onclick="showPage('bookings')">
          <span>📋</span><h3>Booking Requests</h3>
          <p>Review student applications</p>
        </button>
        <button class="card purple" onclick="showPage('payments')">
          <span>💳</span><h3>Payments</h3>
          <p>Review submitted payment details</p>
        </button>
        <button class="card purple"
          onclick="showPage('notifications')">
        <span>🔔</span>
        <h3>Late Notifications</h3>
        <p>View late student attendance alerts</p>
        <p>Unread: <span id="unreadNotificationCount">0</span></p>
</button>
      </div>

      <div class="grid">
        <div class="panel">
          <h2>Hostel Overview</h2>
          <p>Total Students: 120</p>
          <p>Total Rooms: 40</p>
          <p>Pending Bookings: 8</p>
          <p>Open Complaints: 5</p>
          <p class="note">Sample data — connect to Flask and MongoDB.</p>
        </div>

        <div class="panel">
          <h2>Quick Actions</h2>
          <button class="action" onclick="showPage('students')">
            Manage Students
          </button>
          <br><br>
          <button class="action" onclick="showPage('rooms')">
            Manage Rooms
          </button>
          <br><br>
          <button class="action" onclick="showPage('complaints')">
            View Complaints
          </button>
        </div>
      </div>

      ${tablePanel("Recent Bookings", [
        ["STU001", "Room B-203", "Pending"],
        ["STU002", "Room A-104", "Approved"],
        ["STU003", "Room C-101", "Pending"]
      ])}
    `,
   notifications: `
  <div class="panel">
    <h2>🔔 Late Attendance Notifications</h2>
    <p class="note">
      Students who checked in or out during the late period.
    </p>

    <div class="panel">
    <h3>Unread Notifications: <span id="unreadCount">0</span></h3>
</div>

<div id="notificationMessage">Loading notifications...</div>
<div id="notificationList"></div>

    <button class="action"
            onclick="loadNotifications()">
      Refresh Notifications
    </button>
  </div>
`, 

  students: `
  <div class="panel">
    <h2>Student Management</h2>

    <form onsubmit="addStudent(event)">

      <label>Student Name
        <input name="name" type="text" required>
      </label>

      <label>Student Email
        <input name="email" type="email" required>
      </label>

      <label>Student ID
        <input name="studentId" type="text" required>
      </label>

      <label>Password
        <input name="password" type="password"
               minlength="8" required>
      </label>

      <button class="action" type="submit">
        Add Student
      </button>

    </form>

    <div id="studentMessage"></div>
    <div id="studentList"></div>
  </div>
`,

    
rooms: `
  <div class="panel">
    <h2>Room Management</h2>

    <form onsubmit="addRoom(event)">

      <label>Room number
        <input name="room"
               placeholder="e.g. C-218"
               required>
      </label>

      <label>Room capacity
        <input name="capacity"
               type="number"
               min="1"
               required>
      </label>

      <label>Room location
        <input name="location"
               type="text"
               placeholder="e.g. Block C - Floor 2"
               required>
      </label>

      <label>Room status
        <select name="status">
          <option>Available</option>
          <option>Occupied</option>
          <option>Maintenance</option>
        </select>
      </label>

      <button class="action" type="submit">
        Add Room
      </button>

    </form>

    <p id="roomMessage" class="note"></p>

    <div id="roomList"></div>
  </div>
`,


    bookings: `
      <div class="panel">
        <h2>Booking Requests</h2>
        ${tableHTML([
          ["STU001", "Room B-203", "Pending"],
          ["STU002", "Room A-104", "Approved"],
          ["STU003", "Room C-101", "Pending"]
        ])}
        <p class="note">Sample requests only.</p>
      </div>
    `,

  
payments: `
  <div class="panel">
    <h2>💳 Payment Management</h2>

    <p class="note">
      View student payments, check receipts and review payment status.
    </p>

    <div id="paymentMessage">
      Loading payment records...
    </div>

    <div id="paymentList"></div>

    <button class="action"
      onclick="loadAdminPayments()">
      Refresh Payments
    </button>
  </div>
`,


    complaints: `
      <div class="panel">
        <h2>Student Complaints</h2>
        ${tableHTML([
          ["Room B-203", "Water issue", "Open"],
          ["Room A-104", "Wi-Fi issue", "In progress"],
          ["Room C-101", "Light repair", "Resolved"]
        ])}
        <p class="note">Sample complaints only.</p>
      </div>
    `,

    feedback: `
      <div class="panel">
        <h2>Student Feedback</h2>
        ${tableHTML([
          ["STU001", "Room cleanliness", "5/5"],
          ["STU002", "Wi-Fi connection", "3/5"],
          ["STU003", "Hostel facilities", "4/5"]
        ])}
        <p class="note">Sample feedback only.</p>
      </div>
    `,

    reports: `
      <div class="panel">
        <h2>Hostel Reports</h2>
        <p>Student registrations: 120</p>
        <p>Room capacity: 160 beds</p>
        <p>Pending bookings: 8</p>
        <p>Open complaints: 5</p>
        <p class="note">Report figures are examples, not live database data.</p>
        <button class="action" onclick="window.print()">Print Report</button>
      </div>
    `
  };

    content.innerHTML = pages[page] || pages.dashboard;

       if (page === "notifications") {
       loadNotifications();
}

       if (page === "payments") {
       loadAdminPayments();
}
       if (page === "rooms") {
       loadAdminRooms();
}

}

function tableHTML(rows) {
  return `<div style="overflow-x:auto"><table>
    <thead><tr><th>REFERENCE</th><th>DETAILS</th><th>STATUS</th></tr></thead>
    <tbody>${rows.map(row => `
      <tr>
        <td>${escapeHTML(row[0])}</td>
        <td>${escapeHTML(row[1])}</td>
        <td>${escapeHTML(row[2])}</td>
      </tr>`).join("")}
    </tbody>
  </table></div>`;
}

function tablePanel(title, rows) {
  return `<div class="panel"><h2>${title}</h2>${tableHTML(rows)}</div>`;
}

// Prevent user-entered text from being interpreted as HTML.
function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}



// --------------------------------------------------
// ADD STUDENT - CONNECT TO FLASK API
// --------------------------------------------------

async function addStudent(event) {

    event.preventDefault();

    const form = event.target;
    const formData = new FormData(form);

    const student = {
        name: formData.get("name").trim(),
        email: formData.get("email").trim(),
        studentId: formData.get("studentId").trim(),
        password: formData.get("password")
    };

    const message = document.getElementById("studentMessage");

    message.textContent = "Creating student account...";

    try {

        const response = await fetch(
            "http://127.0.0.1:5000/api/admin/students",
            {
                method: "POST",

                credentials: "include",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify(student)
            }
        );

        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.message || "Student creation failed."
            );
        }

        message.textContent =
            "Success! " + result.message;

        message.style.color = "green";

        form.reset();

    } catch (error) {

        message.textContent = error.message;
        message.style.color = "red";

        console.error("Add student error:", error);
    }
}

async function addRoom(event) {
  event.preventDefault();

  const form = event.target;
  const data = new FormData(form);

  const room = {
    room: String(data.get("room") || "").trim(),
    capacity: Number(data.get("capacity")),
    status: data.get("status"),
    location: String(data.get("location") || "").trim()
  };

  const message = document.getElementById("roomMessage");
  message.textContent = "Adding room...";

  try {
    const response = await fetch(
      "http://127.0.0.1:5000/api/admin/rooms",
      {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(room)
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Could not add room.");
    }

    message.textContent = result.message;
    message.style.color = "green";

    form.reset();

  } catch (error) {
    message.textContent = error.message;
    message.style.color = "red";

    console.error("Add room error:", error);
  }
}

function logout() {
  sessionStorage.removeItem("hostelvistaRole");
  sessionStorage.removeItem("hostelvistaUser");
  window.location.href = "index.html";
}
// --------------------------------------------------
// LOAD ADMIN LATE ATTENDANCE NOTIFICATIONS
// --------------------------------------------------

async function loadNotifications() {

    const message = document.getElementById("notificationMessage");
    const list = document.getElementById("notificationList");

    if (!message || !list) return;

    message.textContent = "Loading notifications...";
    list.innerHTML = "";

    try {

        const response = await fetch(
            "http://127.0.0.1:5000/api/admin/notifications",
            {
                method: "GET",
                credentials: "include"
            }
        );

        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.message || "Could not load notifications."
            );
        }

        // Update unread count
        const unreadCount = result.unread_count || 0;

        const countElement =
            document.getElementById("unreadCount");

        if (countElement) {
            countElement.textContent = unreadCount;
        }

        const dashboardCount =
            document.getElementById("unreadNotificationCount");

        if (dashboardCount) {
            dashboardCount.textContent = unreadCount;
        }

        const records = (result.notifications || []).filter(
            item => item.title === "Late Attendance Alert"
        );

        if (records.length === 0) {
            message.textContent =
                "No late attendance notifications yet.";
            return;
        }

        message.textContent =
            `${records.length} late attendance notification(s) found.`;

        list.innerHTML = records.map(record => {

            const date = record.activity_time
                ? new Date(record.activity_time)
                : new Date(record.created_at);

            const formattedDate = date.toLocaleString("en-GB", {
                timeZone: "Asia/Colombo",
                dateStyle: "medium",
                timeStyle: "short"
            });

            const isRead = record.status === "read";

            return `
                <div class="panel" style="margin-top:15px;">

                    <h3>🔔 ${escapeHTML(record.title)}</h3>

                    <p>
                        <strong>Student:</strong>
                        ${escapeHTML(record.student_email)}
                    </p>

                    <p>
                        <strong>Action:</strong>
                        ${escapeHTML(
                            (record.action || "")
                                .replace("_", " ")
                                .toUpperCase()
                        )}
                    </p>

                    <p>
                        <strong>Date & Time:</strong>
                        ${escapeHTML(formattedDate)}
                    </p>

                    <p>
                        <strong>Late Reason:</strong>
                        ${escapeHTML(record.late_reason || "Not provided")}
                    </p>

                    <p>
                        <strong>Additional Details:</strong>
                        ${escapeHTML(
                            record.late_description || "No additional details"
                        )}
                    </p>

                    <p>
                        <strong>Status:</strong>
                        ${isRead ? "READ" : "UNREAD"}
                    </p>

                    ${
                        isRead
                        ? `<span class="note">✓ Already read</span>`
                        : `
                            <button class="action"
                                onclick="markNotificationAsRead('${escapeHTML(record.notification_id)}')">
                                Mark as Read
                            </button>
                        `
                    }

                </div>
            `;

        }).join("");

    } catch (error) {

        message.textContent = error.message;
        console.error("Notification loading error:", error);

    }
}


// --------------------------------------------------
// MARK NOTIFICATION AS READ
// --------------------------------------------------

async function markNotificationAsRead(notificationId) {

    try {

        const response = await fetch(
            `http://127.0.0.1:5000/api/admin/notifications/${encodeURIComponent(notificationId)}/read`,
            {
                method: "POST",
                credentials: "include"
            }
        );

        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.message || "Could not mark notification as read."
            );
        }

        alert("Notification marked as read!");

        // Reload notifications and unread count
        await loadNotifications();

    } catch (error) {

        alert(error.message);
        console.error("Mark as read error:", error);

    }
}


// --------------------------------------------------
// ADMIN - LOAD ALL PAYMENT RECORDS
// --------------------------------------------------

async function loadAdminPayments() {

    const message = document.getElementById("paymentMessage");
    const list = document.getElementById("paymentList");

    if (!message || !list) return;

    message.textContent = "Loading payment records...";
    list.innerHTML = "";

    try {

        const response = await fetch(
            "http://127.0.0.1:5000/api/admin/payments",
            {
                method: "GET",
                credentials: "include"
            }
        );

        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.message || "Could not load payments."
            );
        }

        const records = result.payments || [];

        if (records.length === 0) {
            message.textContent = "No payment records found.";
            return;
        }

        message.textContent =
            `Total Payment Records: ${records.length}`;

        list.innerHTML = `
            <div style="overflow-x:auto; margin-top:15px;">
                <table>
                    <thead>
                        <tr>
                            <th>STUDENT</th>
                            <th>STUDENT ID</th>
                            <th>PAYMENT TYPE</th>
                            <th>AMOUNT</th>
                            <th>PAYMENT DATE</th>
                            <th>STATUS</th>
                            <th>RECEIPT</th>
                            <th>ACTION</th>
                        </tr>
                    </thead>

                    <tbody>
                        ${records.map(payment => {

                            const status =
                                (payment.status || "pending").toLowerCase();

                            const amount = Number(payment.amount || 0)
                                .toLocaleString("en-US", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2
                                });

                            return `
                                <tr>
                                    <td>
                                        ${escapeHTML(payment.student_name)}
                                        <br>
                                        <small>
                                            ${escapeHTML(payment.student_email)}
                                        </small>
                                    </td>

                                    <td>
                                        ${escapeHTML(payment.student_id)}
                                    </td>

                                    <td>
                                        ${escapeHTML(payment.type)}
                                    </td>

                                    <td>Rs. ${amount}</td>

                                    <td>
                                        ${escapeHTML(payment.payment_date)}
                                    </td>

                                    <td>
                                        <strong>${escapeHTML(status.toUpperCase())}</strong>
                                    </td>

                                    <td>
                                        <button class="action"
                                            onclick="viewPaymentReceipt('${encodeURIComponent(payment.payment_id)}')">
                                            View Receipt
                                        </button>
                                    </td>

                                    <td>
                                        ${
                                            status === "pending"
                                            ? `
                                                <button class="action"
                                                    onclick="reviewPayment('${encodeURIComponent(payment.payment_id)}', 'verified')">
                                                    Verify
                                                </button>

                                                <button class="action"
                                                    onclick="reviewPayment('${encodeURIComponent(payment.payment_id)}', 'rejected')">
                                                    Reject
                                                </button>
                                            `
                                            : `<span class="note">Reviewed</span>`
                                        }
                                    </td>
                                </tr>
                            `;

                        }).join("")}
                    </tbody>
                </table>
            </div>
        `;

    } catch (error) {

        message.textContent = error.message;

        console.error(
            "Admin payment loading error:",
            error
        );
    }
}


// --------------------------------------------------
// ADMIN - VIEW PAYMENT RECEIPT
// --------------------------------------------------

function viewPaymentReceipt(paymentId) {

    const url =
        `http://127.0.0.1:5000/api/admin/payments/${paymentId}/receipt`;

    window.open(url, "_blank");
}


// --------------------------------------------------
// ADMIN - VERIFY OR REJECT PAYMENT
// --------------------------------------------------

async function reviewPayment(paymentId, decision) {

    const action = decision === "verified"
        ? "verify"
        : "reject";

    const confirmed = confirm(
        `Are you sure you want to ${action} this payment?`
    );

    if (!confirmed) return;

    try {

        const response = await fetch(
            `http://127.0.0.1:5000/api/admin/payments/${paymentId}/decision`,
            {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    decision: decision
                })
            }
        );

        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.message || "Could not update payment."
            );
        }

        alert(result.message);

        // Reload updated payment records
        await loadAdminPayments();

    } catch (error) {

        alert(error.message);

        console.error(
            "Payment review error:",
            error
        );
    }
}


// Make functions available to HTML buttons
window.loadAdminPayments = loadAdminPayments;
window.viewPaymentReceipt = viewPaymentReceipt;
window.reviewPayment = reviewPayment;


window.loadNotifications = loadNotifications;
window.markNotificationAsRead = markNotificationAsRead;

showPage("dashboard");

window.addStudent = addStudent;
window.loadNotifications = loadNotifications;

window.addRoom = addRoom;
window.loadAdminRooms = loadAdminRooms;
