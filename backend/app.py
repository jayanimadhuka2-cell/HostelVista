
import os
import uuid
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
from functools import wraps

from flask import (
    Flask, request, jsonify, Response, session,
    send_from_directory
)
from flask_cors import CORS
from pymongo import MongoClient
from dotenv import load_dotenv
from werkzeug.security import check_password_hash, generate_password_hash
from werkzeug.utils import secure_filename
from bson import ObjectId

# --------------------------------------------------
# 1. ENVIRONMENT CONFIGURATION
# --------------------------------------------------

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))

app = Flask(__name__)

app.secret_key = os.getenv(
    "SECRET_KEY",
    "hostelvista-local-dev-key"
)


app.config.update(
    SESSION_COOKIE_NAME="hostelvista_session",
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
    SESSION_COOKIE_SECURE=False,
    MAX_CONTENT_LENGTH=5 * 1024 * 1024
)

CORS(
    app,
    resources={
        r"/api/*": {
            "origins": [
                "http://127.0.0.1:5500",
                "http://localhost:5500"
            ],
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type"],
            "supports_credentials": True
        }
    },
    supports_credentials=True
)

# --------------------------------------------------
# 2. MONGODB CONNECTION
# --------------------------------------------------

MONGO_URI = os.getenv(
    "MONGO_URI",
    "mongodb://localhost:27017/"
)

DB_NAME = os.getenv("DB_NAME", "hostelvista")

client = MongoClient(
    MONGO_URI,
    serverSelectionTimeoutMS=5000
)

db = client[DB_NAME]

users = db["users"]
allocations = db["allocations"]
payments = db["payments"]
complaints = db["complaints"]
attendance = db["attendance"]
notifications = db["notifications"]

# --------------------------------------------------
# 3. RECEIPT UPLOAD CONFIGURATION
# --------------------------------------------------

UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "pdf"}

app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER


def allowed_file(filename):
    return (
        "." in filename
        and filename.rsplit(".", 1)[1].lower()
        in ALLOWED_EXTENSIONS
    )


def current_time():
    return datetime.now(timezone.utc)


# --------------------------------------------------
# 4. STUDENT LOGIN CHECK
# --------------------------------------------------

def student_required(function):

    @wraps(function)
    def wrapper(*args, **kwargs):

        if session.get("user_role") != "student":
            return jsonify({
                "success": False,
                "message": "Student login required."
            }), 401

        return function(*args, **kwargs)

    return wrapper

# --------------------------------------------------
# ADMIN LOGIN CHECK
# --------------------------------------------------

def admin_required(function):

    @wraps(function)
    def wrapper(*args, **kwargs):

        if session.get("user_role") != "admin":
            return jsonify({
                "success": False,
                "message": "Admin login required."
            }), 401

        return function(*args, **kwargs)

    return wrapper

# --------------------------------------------------
# 5. HOME AND HEALTH
# --------------------------------------------------

@app.get("/")
def home():
    return jsonify({
        "status": "success",
        "message": "HostelVista backend is running!"
    }), 200


@app.get("/favicon.ico")
def favicon():
    return Response(status=204)


@app.get("/api/health")
def health():

    try:
        client.admin.command("ping")

        return jsonify({
            "status": "success",
            "message": "HostelVista backend and MongoDB connected!"
        }), 200

    except Exception:
        app.logger.exception("MongoDB connection failed")

        return jsonify({
            "status": "error",
            "message": "Could not connect to MongoDB."
        }), 503


# --------------------------------------------------
# 6. LOGIN
# --------------------------------------------------

@app.post("/api/login")
def login():

    data = request.get_json(silent=True) or {}

    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    role = data.get("role", "").strip().lower()

    if not email or not password or role not in ("admin", "student"):
        return jsonify({
            "success": False,
            "message": "Please provide valid login details."
        }), 400

    try:
        user = users.find_one({
            "email": email,
            "role": role
        })

        if not user or not check_password_hash(
            user.get("password_hash", ""),
            password
        ):
            return jsonify({
                "success": False,
                "message": "Invalid login details."
            }), 401

        session.clear()
        session["user_email"] = user["email"]
        session["user_role"] = user["role"]

        return jsonify({
            "success": True,
            "message": "Login successful.",
            "role": user["role"],
            "name": user.get("name", ""),
            "email": user.get("email", "")
        }), 200

    except Exception:
        app.logger.exception("Login failed")

        return jsonify({
            "success": False,
            "message": "A server error occurred."
        }), 500

# --------------------------------------------------
# ADMIN - ADD NEW STUDENT
# --------------------------------------------------

@app.post("/api/admin/students")
@admin_required
def add_student():

    data = request.get_json(silent=True) or {}

    name = str(data.get("name", "")).strip()
    email = str(data.get("email", "")).strip().lower()
    student_id = str(data.get("studentId", "")).strip()
    password = data.get("password", "")

    if not name or not email or not student_id or not password:
        return jsonify({
            "success": False,
            "message": "All fields are required."
        }), 400

    if len(password) < 8:
        return jsonify({
            "success": False,
            "message": "Password must contain at least 8 characters."
        }), 400

    try:
        existing_email = users.find_one({
            "email": email
        })

        if existing_email:
            return jsonify({
                "success": False,
                "message": "This email is already registered."
            }), 409

        existing_id = users.find_one({
            "student_id": student_id
        })

        if existing_id:
            return jsonify({
                "success": False,
                "message": "This Student ID is already registered."
            }), 409

        student = {
            "name": name,
            "email": email,
            "student_id": student_id,
            "password_hash": generate_password_hash(password),
            "role": "student",
            "created_at": current_time()
        }

        users.insert_one(student)

        return jsonify({
            "success": True,
            "message": "Student account created successfully."
        }), 201

    except Exception:
        app.logger.exception("Student creation error")

        return jsonify({
            "success": False,
            "message": "Could not create student account."
        }), 500
        
# --------------------------------------------------
# 7. STUDENT PROFILE
# --------------------------------------------------

@app.get("/api/student/profile")
@student_required
def student_profile():

    try:
        student = users.find_one(
            {
                "email": session["user_email"],
                "role": "student"
            },
            {
                "_id": 0,
                "password_hash": 0
            }
        )

        if not student:
            return jsonify({
                "success": False,
                "message": "Student not found."
            }), 404

        return jsonify({
            "success": True,
            "student": student
        }), 200

    except Exception:
        app.logger.exception("Student profile error")

        return jsonify({
            "success": False,
            "message": "Could not load student profile."
        }), 500


# --------------------------------------------------
# 8. ROOM ALLOCATION
# --------------------------------------------------

@app.get("/api/student/allocation")
@student_required
def get_allocation():

    try:
         # Temporary debugging lines
        print("SESSION EMAIL:", repr(session.get("user_email")))
        print("DATABASE NAME:", db.name)
        print("ALLOCATION COUNT:", allocations.count_documents({}))
        
        allocation = allocations.find_one(
            {
                "student_email": session["user_email"],
                "status": "active"
            },
            {"_id": 0},
            sort=[("created_at", -1)]
        )

        return jsonify({
            "success": True,
            "allocation": allocation
        }), 200

    except Exception:
        app.logger.exception("Allocation error")

        return jsonify({
            "success": False,
            "message": "Could not load room allocation."
        }), 500


# --------------------------------------------------
# GET STUDENT PAYMENT HISTORY
# --------------------------------------------------

@app.get("/api/student/payments")
@student_required
def get_payments():

    try:
        records = list(
            payments.find(
                {"student_email": session["user_email"]},
                {"_id": 0}
            ).sort("created_at", -1)
        )

        # Convert MongoDB values into JSON-safe values
        for payment in records:
            if "created_at" in payment:
                payment["created_at"] = payment["created_at"].isoformat()

        return jsonify({
            "success": True,
            "payments": records
        }), 200

    except Exception:
        app.logger.exception("Payment history loading error")

        return jsonify({
            "success": False,
            "message": "Could not load payment history."
        }), 500

# --------------------------------------------------
# 9. PAYMENTS AND RECEIPT UPLOAD
# --------------------------------------------------


@app.post("/api/student/payments")
@student_required
def submit_payment():

    try:
        payment_type = request.form.get("type", "").strip()
        amount = request.form.get("amount", "").strip()
        payment_date = request.form.get("payment_date", "").strip()
        receipt = request.files.get("receipt")

        if payment_type not in [
            "Hostel Fee", "Electricity", "Water Bill", "Other"
        ]:
            return jsonify({
                "success": False,
                "message": "Please select a valid payment type."
            }), 400

        try:
            amount = float(amount)
            if amount <= 0:
                raise ValueError()
        except (ValueError, TypeError):
            return jsonify({
                "success": False,
                "message": "Enter a valid payment amount."
            }), 400

        if not payment_date:
            return jsonify({
                "success": False,
                "message": "Payment date is required."
            }), 400

        if not receipt or receipt.filename == "":
            return jsonify({
                "success": False,
                "message": "Please upload your payment receipt."
            }), 400

        if not allowed_file(receipt.filename):
            return jsonify({
                "success": False,
                "message": "Only PNG, JPG, JPEG and PDF files are allowed."
            }), 400

        original_name = secure_filename(receipt.filename)
        extension = original_name.rsplit(".", 1)[1].lower()
        saved_name = f"{uuid.uuid4().hex}.{extension}"

        receipt.save(
            os.path.join(UPLOAD_FOLDER, saved_name)
        )

        payment = {
            "payment_id": uuid.uuid4().hex,
            "student_email": session["user_email"],
            "type": payment_type,
            "amount": amount,
            "payment_date": payment_date,
            "receipt_file": saved_name,
            "status": "pending",
            "created_at": current_time()
        }

        payments.insert_one(payment)

        return jsonify({
            "success": True,
            "message": "Payment receipt submitted successfully.",
            "payment_id": payment["payment_id"],
            "status": "pending"
        }), 201

    except Exception:
        app.logger.exception("Payment submission error")

        return jsonify({
            "success": False,
            "message": "Could not submit payment."
        }), 500



# --------------------------------------------------
# 10. COMPLAINTS
# --------------------------------------------------

@app.get("/api/student/complaints")
@student_required
def get_complaints():

    try:
        records = list(
            complaints.find(
                {"student_email": session["user_email"]},
                {"_id": 0}
            ).sort("created_at", -1)
        )

        return jsonify({
            "success": True,
            "complaints": records
        }), 200

    except Exception:
        app.logger.exception("Complaint loading error")

        return jsonify({
            "success": False,
            "message": "Could not load complaints."
        }), 500


@app.post("/api/student/complaints")
@student_required
def submit_complaint():

    data = request.get_json(silent=True) or {}

    category = data.get("category", "").strip()
    description = data.get("description", "").strip()

    if not category or not description:
        return jsonify({
            "success": False,
            "message": "Category and description are required."
        }), 400

    if len(description) > 2000:
        return jsonify({
            "success": False,
            "message": "Description is too long."
        }), 400

    try:
        complaint = {
            "complaint_id": uuid.uuid4().hex,
            "student_email": session["user_email"],
            "category": category,
            "description": description,
            "status": "pending",
            "admin_response": "",
            "created_at": current_time()
        }

        complaints.insert_one(complaint)

        return jsonify({
            "success": True,
            "message": "Complaint submitted successfully.",
            "complaint_id": complaint["complaint_id"]
        }), 201

    except Exception:
        app.logger.exception("Complaint submission error")

        return jsonify({
            "success": False,
            "message": "Could not submit complaint."
        }), 500


# --------------------------------------------------
# 11. IN / OUT RECORDS
# --------------------------------------------------

@app.get("/api/student/attendance")
@student_required
def get_attendance():

    try:
        records = list(
            attendance.find(
                {"student_email": session["user_email"]},
                {"_id": 0}
            ).sort("created_at", -1)
        )

        latest = records[0] if records else None

        current_status = (
            "inside"
            if latest and latest["action"] == "check_in"
            else "outside"
        )

        return jsonify({
            "success": True,
            "current_status": current_status,
            "records": records
        }), 200

    except Exception:
        app.logger.exception("Attendance loading error")

        return jsonify({
            "success": False,
            "message": "Could not load attendance records."
        }), 500



@app.post("/api/student/attendance")
@student_required
def record_attendance():

    data = request.get_json(silent=True) or {}

    action = data.get("action", "").strip().lower()
    late_reason = data.get("late_reason", "").strip()
    late_description = data.get("late_description", "").strip()

    if action not in ("check_in", "check_out"):
        return jsonify({
            "success": False,
            "message": "Invalid attendance action."
        }), 400

    try:
        # Get Sri Lankan local time from server
        now_local = datetime.now(ZoneInfo("Asia/Colombo"))

        # Late period: 8:30 PM to 5:00 AM
        current_minutes = now_local.hour * 60 + now_local.minute
      

        late_start = (20 * 60) + 30
        late_end = 5 * 60

        is_late = (
           current_minutes >= late_start
           or current_minutes < late_end
)

        # Late reason validation
        allowed_reasons = [
            "Medical Reason",
            "Transport Delay",
            "University Work",
            "Personal Emergency",
            "Other"
        ]

        if is_late:
            if late_reason not in allowed_reasons:
                return jsonify({
                    "success": False,
                    "message": "Please select a valid late reason."
                }), 400

            if not late_description:
                return jsonify({
                    "success": False,
                    "message": "Please explain your late reason."
                }), 400

            if len(late_description) > 1000:
                return jsonify({
                    "success": False,
                    "message": "Late description is too long."
                }), 400

        # Check current attendance status
        latest = attendance.find_one(
            {"student_email": session["user_email"]},
            sort=[("created_at", -1)]
        )

        current_status = (
            "inside"
            if latest and latest["action"] == "check_in"
            else "outside"
        )

        if action == "check_in" and current_status == "inside":
            return jsonify({
                "success": False,
                "message": "You are already checked in."
            }), 409

        if action == "check_out" and current_status == "outside":
            return jsonify({
                "success": False,
                "message": "You are already checked out."
            }), 409

        # Create attendance record
        record = {
            "record_id": uuid.uuid4().hex,
            "student_email": session["user_email"],
            "action": action,
            "is_late": is_late,
            "late_reason": late_reason if is_late else "",
            "late_description": late_description if is_late else "",
            "created_at": current_time()
        }

        attendance.insert_one(record)

        # Create Admin notification for late activity
        if is_late:

            notification = {
                "notification_id": uuid.uuid4().hex,
                "student_email": session["user_email"],
                "title": "Late Attendance Alert",
                "message": (
                    f"Student {session['user_email']} "
                    f"performed {action.replace('_', ' ')} after 8:30 PM."
                ),
                "action": action,
                "late_reason": late_reason,
                "late_description": late_description,
                "activity_time": now_local.isoformat(),
                "status": "unread",
                "created_at": current_time()
            }

            notifications.insert_one(notification)

        return jsonify({
            "success": True,
            "message": (
                "Late attendance submitted successfully. "
                "Admin has been notified."
                if is_late
                else "Attendance recorded successfully."
            ),
            "action": action,
            "late_activity": is_late,
            "created_at": record["created_at"].isoformat()
        }), 201

    except Exception:
        app.logger.exception("Attendance recording error")

        return jsonify({
            "success": False,
            "message": "Could not record attendance."
        }), 500
        
# --------------------------------------------------
# ADMIN - LATE ATTENDANCE NOTIFICATIONS
# --------------------------------------------------

@app.get("/api/admin/notifications")
@admin_required
def get_admin_notifications():

    try:
        records = list(
            notifications.find(
                {},
                {"_id": 0}
            ).sort("created_at", -1)
        )

        for record in records:
            if record.get("created_at"):
                record["created_at"] = (
                    record["created_at"].isoformat()
                )

        unread_count = notifications.count_documents({
            "status": "unread"
        })

        return jsonify({
            "success": True,
            "notifications": records,
            "unread_count": unread_count
        }), 200

    except Exception:
        app.logger.exception("Notification loading error")

        return jsonify({
            "success": False,
            "message": "Could not load notifications."
        }), 500


# --------------------------------------------------
# ADMIN - MARK NOTIFICATION AS READ
# --------------------------------------------------

@app.post("/api/admin/notifications/<notification_id>/read")
@admin_required
def mark_notification_as_read(notification_id):

    try:
        result = notifications.update_one(
            {
                "notification_id": notification_id
            },
            {
                "$set": {
                    "status": "read"
                }
            }
        )

        if result.matched_count == 0:
            return jsonify({
                "success": False,
                "message": "Notification not found."
            }), 404

        return jsonify({
            "success": True,
            "message": "Notification marked as read."
        }), 200

    except Exception:
        app.logger.exception("Mark notification error")

        return jsonify({
            "success": False,
            "message": "Could not update notification."
        }), 500


# --------------------------------------------------
# 12. LOGOUT
# --------------------------------------------------

@app.post("/api/logout")
def logout():

    session.clear()

    return jsonify({
        "success": True,
        "message": "Logged out successfully."
    }), 200


# --------------------------------------------------
# 13. ERROR HANDLERS
# --------------------------------------------------

@app.errorhandler(413)
def file_too_large(error):
    return jsonify({
        "success": False,
        "message": "File is too large. Maximum size is 5 MB."
    }), 413


# --------------------------------------------------
# 14. RUN SERVER
# --------------------------------------------------

if __name__ == "__main__":
    try:
        client.admin.command("ping")
        print("MongoDB Connected Successfully!")
    except Exception:
        print("WARNING: MongoDB connection failed!")

    app.run(
        host="127.0.0.1",
        port=int(os.getenv("PORT", "5000")),
        debug=False
    )
