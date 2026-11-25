# 🏨 HostelVista – Hostel Management System

A web-based Hostel Management System designed to simplify and digitalize hostel operations. HostelVista provides separate functionalities for administrators and students to manage hostel-related activities efficiently.

## 📌 Project Overview

HostelVista is developed to reduce manual hostel management tasks by providing a centralized platform for managing students, rooms, allocations, payments, complaints, and attendance records.

The system provides two main user roles:

- **Admin** – Manages hostel operations and monitors student activities.
- **Student** – Accesses personal hostel information and uses hostel services.

## ✨ Key Features

### 👨‍💼 Admin Features
- Admin Login and Logout
- Student Management
- Room Management
- Room Allocation Management
- Payment Management
- Complaint Management
- Student Attendance Monitoring
- Late Attendance Notifications
- Dashboard and Reports

### 🎓 Student Features
- Student Login and Logout
- Student Dashboard
- View Room and Bed Allocation
- View Payment Details
- Submit Payment Details with Receipt Upload
- Submit and Track Complaints
- Check-in and Check-out Attendance
- Submit Late Attendance Reasons
- View Notifications

## 🛠️ Technologies Used

| Component | Technology |
|---|---|
| Frontend | HTML, CSS, JavaScript |
| Backend | Python (Flask) |
| Database | MongoDB |
| Database Management | MongoDB Compass |
| Development Tool | Visual Studio Code |
| Version Control | Git and GitHub |

## ⚙️ System Requirements

- Python 3
- MongoDB Community Server
- MongoDB Compass (optional)
- Visual Studio Code
- Git
- Web Browser

## 🚀 Installation and Setup

### 1. Clone the Repository

```bash
git clone https://github.com/jayanimadhuka2-cell/HostelVista.git
```

### 2. Open the Project

```bash
cd HostelVista
```

Open the project folder using Visual Studio Code.

### 3. Set Up the Backend

Navigate to the backend folder:

```bash
cd backend
```

Create a virtual environment:

```bash
python -m venv .venv
```

Activate the virtual environment on Windows:

```bash
.venv\Scripts\activate
```

Install the project dependencies (if `requirements.txt` is included):

```bash
pip install -r requirements.txt
```

### 4. Configure Environment Variables

Create a `.env` file inside the backend folder:

```env
MONGO_URI=mongodb://localhost:27017/
DB_NAME=hostelvista
PORT=5000
```

Make sure MongoDB is running before starting the application.

### 5. Run the Backend Server

```bash
python app.py
```

The Flask backend runs at:

```text
http://127.0.0.1:5000
```

Check the backend health endpoint:

```text
http://127.0.0.1:5000/api/health
```

### 6. Run the Frontend

Open the frontend project using Visual Studio Code.

Use the **Live Server** extension to launch the frontend in your browser.

## 🗄️ Database

HostelVista uses MongoDB as its database.

Main collections include:

- `users`
- `allocations`
- `payments`
- `complaints`
- `attendance`
- `notifications`

Database name: `hostelvista`

## 🔐 User Roles

**Admin Account**

Administrators can manage hostel information, students, rooms, payments, complaints, and attendance.

**Student Account**

Students can access their personal hostel information, submit payments and complaints, and record their check-in/check-out activities.

## 📸 Screenshots

Screenshots of the application can be added here to demonstrate the Login Page, Admin Dashboard, Student Dashboard, and other main functions.

## 👩‍💻 Developer

**R.W.M.J Madhuka Rathnayaka**

University of Moratuwa

## 🔗 GitHub Repository

[HostelVista – GitHub Repository](https://github.com/jayanimadhuka2-cell/HostelVista)

---

*HostelVista – Making Hostel Management Smarter and Simpler.*
