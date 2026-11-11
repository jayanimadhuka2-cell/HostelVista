const API_URL = "http://127.0.0.1:5000/api";
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
        <button class="card blue" onclick="showPage('allocation')">
          <span>🔑</span><h3>Room Allocation</h3>
          <p>Allocate rooms to students</p>
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

     <div class="panel">
    <h2>Recent Bookings</h2>
    <div id="recentBookings">
        Loading recent bookings...
    </div>
   </div>
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

allocation: `
  <div class="panel">
    <h2>🔑 Room Allocation</h2>

    <p class="note">
      Allocate an available hostel room to a registered student.
    </p>

    <form onsubmit="allocateRoom(event)">

      <label>Select Student
        <select name="student_email" id="allocationStudent" required>
          <option value="">Select Student</option>
        </select>
      </label>

      <label>Select Room
        <select name="room_number" id="allocationRoom" required>
          <option value="">Select Room</option>
        </select>
      </label>

      <label>Bed Number
        <input
          name="bed_number"
          type="text"
          placeholder="e.g. Bed 1"
          required
        >
      </label>

      <button class="action" type="submit">
        Allocate Room
      </button>

    </form>

    <p id="allocationMessage" class="note"></p>
  </div>
`,

  bookings: `
  <div class="panel">
    <h2>📋 Booking Requests</h2>

    <p class="note">
      Review and manage student hostel booking requests.
    </p>

    <div id="bookingMessage">
      Loading booking requests...
    </div>

    <div id="bookingList"></div>

    <button class="action" onclick="loadAdminBookings()">
      Refresh Booking Requests
    </button>
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

        <p class="note">
            View and manage student complaints.
        </p>

        <div id="complaintMessage">
            Loading complaints...
        </div>

        <div id="complaintList"></div>

        <button class="action" onclick="loadAdminComplaints()">
            Refresh Complaints
        </button>
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
       if (page === "complaints") {
       loadAdminComplaints();
}
      if (page === "allocation") {
      loadAllocationOptions();
}
      if (page === "bookings") {
      loadAdminBookings();
}
      if (page === "dashboard") {
      loadRecentBookings();
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

// --------------------------------------------------
// ADMIN - LOAD STUDENT COMPLAINTS
// --------------------------------------------------

async function loadAdminComplaints() {

    const message = document.getElementById("complaintMessage");
    const container = document.getElementById("complaintList");

    if (!message || !container) return;

    message.textContent = "Loading complaints...";
    container.innerHTML = "";

    try {
        const response = await fetch(
            `${API_URL}/admin/complaints`,
            {
                method: "GET",
                credentials: "include"
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Could not load complaints.");
        }

        if (!data.complaints || data.complaints.length === 0) {
            message.textContent = "No student complaints found.";
            return;
        }

        message.textContent =
            `Total Complaints: ${data.complaints.length}`;

        container.innerHTML = data.complaints.map(item => {

            const id = escapeHTML(item.complaint_id);

            return `
                <div class="panel">

                    <h3>${escapeHTML(item.category)}</h3>

                    <p>
                        <strong>Student:</strong>
                        ${escapeHTML(item.student_name)}
                    </p>

                    <p>
                        <strong>Student ID:</strong>
                        ${escapeHTML(item.student_id)}
                    </p>

                    <p>
                        <strong>Email:</strong>
                        ${escapeHTML(item.student_email)}
                    </p>

                    <p>
                        <strong>Description:</strong>
                        ${escapeHTML(item.description)}
                    </p>

                    <p>
                        <strong>Date:</strong>
                        ${escapeHTML(item.created_at)}
                    </p>

                    <label>Status</label>

                    <select id="complaint-status-${id}">
                        <option value="pending"
                            ${item.status === "pending" ? "selected" : ""}>
                            Pending
                        </option>

                        <option value="in_progress"
                            ${item.status === "in_progress" ? "selected" : ""}>
                            In Progress
                        </option>

                        <option value="resolved"
                            ${item.status === "resolved" ? "selected" : ""}>
                            Resolved
                        </option>
                    </select>

                    <br><br>

                    <label>Admin Response</label>

                    <textarea
                        id="complaint-response-${id}"
                        rows="3"
                        maxlength="2000"
                    >${escapeHTML(item.admin_response || "")}</textarea>

                    <br><br>

                    <button class="action"
                        onclick="updateAdminComplaint('${id}')">
                        Save Changes
                    </button>

                </div>
            `;
        }).join("");

    } catch (error) {
        message.textContent = error.message;
        console.error("Admin complaints error:", error);
    }
}


// --------------------------------------------------
// ADMIN - UPDATE COMPLAINT
// --------------------------------------------------

async function updateAdminComplaint(complaintId) {

    const status = document.getElementById(
        `complaint-status-${complaintId}`
    ).value;

    const adminResponse = document.getElementById(
        `complaint-response-${complaintId}`
    ).value.trim();

    try {
        const response = await fetch(
            `${API_URL}/admin/complaints/${encodeURIComponent(complaintId)}`,
            {
                method: "PUT",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    status: status,
                    admin_response: adminResponse
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Update failed.");
        }

        alert("Complaint updated successfully!");

        await loadAdminComplaints();

    } catch (error) {
        alert(error.message);
        console.error("Complaint update error:", error);
    }
}


// Make functions accessible to HTML buttons
window.loadAdminComplaints = loadAdminComplaints;
window.updateAdminComplaint = updateAdminComplaint;


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

// --------------------------------------------------
// ADMIN - LOAD STUDENTS AND ROOMS FOR ALLOCATION
// --------------------------------------------------

async function loadAllocationOptions() {

    const studentSelect = document.getElementById("allocationStudent");
    const roomSelect = document.getElementById("allocationRoom");
    const message = document.getElementById("allocationMessage");

    if (!studentSelect || !roomSelect || !message) return;

    message.textContent = "Loading students and rooms...";

    try {

// Load approved booking students
const studentResponse = await fetch(
    `${API_URL}/admin/bookings`,
    {
        method: "GET",
        credentials: "include"
    }
);

const studentData = await studentResponse.json();

if (!studentResponse.ok || !studentData.success) {
    throw new Error(
        studentData.message || "Could not load approved students."
    );
}

const students = (studentData.bookings || []).filter(
    booking => booking.status === "approved"
);

        studentSelect.innerHTML =
         '<option value="">Select Approved Student</option>' +
          students.map(student => `
         <option value="${escapeHTML(student.student_email)}">
            ${escapeHTML(student.student_name)}
            (${escapeHTML(student.student_id || "")})
        </option>
       `).join("");


        // Load hostel rooms
        const roomResponse = await fetch(
            `${API_URL}/admin/rooms`,
            {
                method: "GET",
                credentials: "include"
            }
        );

        const roomData = await roomResponse.json();

        if (!roomResponse.ok) {
            throw new Error(roomData.message || "Could not load rooms.");
        }

        const rooms = roomData.rooms || [];

        const availableRooms = rooms.filter(
            room => room.status === "Available"
        );

        roomSelect.innerHTML =
            '<option value="">Select Room</option>' +
            availableRooms.map(room => `
                <option value="${escapeHTML(room.room_number)}">
                    ${escapeHTML(room.room_number)} - ${escapeHTML(room.location)}
                </option>
            `).join("");

        message.textContent =
        `Loaded ${students.length} approved students and ${availableRooms.length} available rooms.`;

    } catch (error) {

        message.textContent = error.message;

        console.error("Allocation options error:", error);
    }
}


// Make function accessible
window.loadAllocationOptions = loadAllocationOptions;


async function allocateRoom(event) {

    event.preventDefault();

    const form = event.target;
    const formData = new FormData(form);

    const allocation = {
        student_email: formData.get("student_email"),
        room_number: formData.get("room_number"),
        bed_number: formData.get("bed_number").trim()
    };

    const message = document.getElementById("allocationMessage");

    message.textContent = "Allocating room...";

    try {

        const response = await fetch(
            `${API_URL}/admin/allocations`,
            {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(allocation)
            }
        );

        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.message || "Room allocation failed."
            );
        }

        message.textContent = result.message;
        message.style.color = "green";

        form.reset();

        await loadAllocationOptions();

    } catch (error) {

        message.textContent = error.message;
        message.style.color = "red";

        console.error("Room allocation error:", error);
    }
}

window.allocateRoom = allocateRoom;
async function loadAdminBookings() {
    const message = document.getElementById("bookingMessage");
    const list = document.getElementById("bookingList");

    if (!message || !list) return;

    message.textContent = "Loading booking requests...";
    list.innerHTML = "";

    try {
        const response = await fetch(`${API_URL}/admin/bookings`, {
            credentials: "include"
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || "Failed to load bookings.");
        }

        if (!data.bookings.length) {
            message.textContent = "No booking requests found.";
            return;
        }

        message.textContent = "";

      list.innerHTML = data.bookings.map(booking => `
    <div class="panel">
        <h3>${escapeHTML(booking.student_name)}</h3>

        <p>Student ID: ${escapeHTML(booking.student_id)}</p>
        <p>Email: ${escapeHTML(booking.student_email)}</p>
        <p>Preferred Block: ${escapeHTML(booking.preferred_block)}</p>
        <p>Room Type: ${escapeHTML(booking.room_type)}</p>
        <p>Reason: ${escapeHTML(booking.reason)}</p>

        <p>Status: <strong>${escapeHTML(booking.status)}</strong></p>

        <p>Admin Response:
            ${escapeHTML(booking.admin_response || "No response")}
        </p>

        ${booking.status === "pending" ? `
            <textarea
                id="response-${escapeHTML(booking.booking_id)}"
                placeholder="Enter admin response..."
            ></textarea>

            <button class="action"
                onclick="updateBookingStatus('${escapeHTML(booking.booking_id)}', 'approved')">
                Approve
            </button>

            <button class="action"
                onclick="updateBookingStatus('${escapeHTML(booking.booking_id)}', 'rejected')">
                Reject
            </button>
        ` : ""}
    </div>
`).join("");  

    } catch (error) {
        message.textContent = error.message;
    }
}

window.loadAdminBookings = loadAdminBookings;
async function updateBookingStatus(bookingId, status) {
    const responseBox = document.getElementById(`response-${bookingId}`);

    const adminResponse = responseBox
        ? responseBox.value.trim()
        : "";

    try {
        const response = await fetch(
            `${API_URL}/admin/bookings/${encodeURIComponent(bookingId)}`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: "include",
                body: JSON.stringify({
                    status: status,
                    admin_response: adminResponse
                })
            }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || "Booking update failed.");
        }

        alert(data.message);

        loadAdminBookings();

    } catch (error) {
        alert(error.message);
    }
}

window.updateBookingStatus = updateBookingStatus;

async function loadRecentBookings() {
    const container = document.getElementById("recentBookings");

    if (!container) return;

    container.innerHTML = '<p class="note">Loading recent bookings...</p>';

    try {
       const response = await fetch(`${API_URL}/admin/bookings`, {
    method: "GET",
    credentials: "include"
});

const data = await response.json();

if (!response.ok) {
    throw new Error(data.message || "Failed to load bookings");
}

const bookings = data.bookings || [];

        if (bookings.length === 0) {
            container.innerHTML = '<p class="note">No booking requests yet.</p>';
            return;
        }

        const recentBookings = bookings.slice(0, 5);

        container.innerHTML = `
            <div class="table-responsive">
                <table>
                    <thead>
                        <tr>
                            <th>Student</th>
                            <th>Student ID</th>
                            <th>Preferred Block</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${recentBookings.map(booking => `
                            <tr>
                                <td>${escapeHTML(booking.student_name || "N/A")}</td>
                                <td>${escapeHTML(booking.student_id || "N/A")}</td>
                                <td>${escapeHTML(booking.preferred_block || "N/A")}</td>
                                <td>${escapeHTML(booking.status || "Pending")}</td>
                            </tr>
                        `).join("")}
                    </tbody>
                </table>
            </div>
        `;

    } catch (error) {
        console.error("Recent bookings error:", error);
        container.innerHTML = '<p class="note">Unable to load recent bookings.</p>';
    }
}